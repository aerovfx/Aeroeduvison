# Multi-stage build for production
# Using Debian-based image for better Prisma compatibility
FROM node:20-slim AS base

# Install OpenSSL and other dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies with better error handling
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Builder stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists
RUN mkdir -p public

# Generate Prisma client for linux/amd64 (matches Cloud Run Gen2 runtime).
# PRISMA_SKIP_VALIDATION=1 → skip DATABASE_URL check (not needed at build time).
# We do NOT use `|| true` here — a silent failure leaves .prisma/client empty,
# which forces Prisma to fall back to the WASM engine at runtime → OOM.
RUN PRISMA_SKIP_VALIDATION=1 npx prisma generate

# Build Next.js application with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1
ENV DISABLE_CONTENTLAYER=1
# === BUILD MEMORY STRATEGY ===
# Problem: Build compiles OK (~3min) but OOM at "Generating static pages (193)"
# Solution: Use generous heap BUT with GC pressure to free memory between pages
# Docker Desktop has 16GB; BuildKit gets ~10-12GB usable
ENV NODE_OPTIONS="--max-old-space-size=7168"

# Build Next.js
RUN npm run build || (echo "Build failed" && exit 1)

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Fix Next.js 15 RSC: standalone omits page_client-reference-manifest.js
# for nested route groups like (dashboard)/(routes)/(root)/page.js
# Copy the FULL .next/server to overwrite standalone's incomplete version
COPY --from=builder --chown=nextjs:nodejs /app/.next/server ./.next/server

# Copy Prisma files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy data directory (quiz JSON files loaded at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Switch to non-root user
USER nextjs

EXPOSE 3000

# NOTE: Do NOT set PORT here — Cloud Run gen2 sets it automatically
# ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# === RUNTIME MEMORY STRATEGY ===
# Cloud Run kills container (SIGKILL/signal 9) when exceeding memory limit.
# Set Node.js heap to ~75% of container memory (4GiB → 3072MB).
# Note: NODE_OPTIONS is also overridden by the Cloud Run env var set in the
# gcloud deploy command, so this Dockerfile value is a safe fallback.
ENV NODE_OPTIONS="--max-old-space-size=3072"

CMD ["node", "server.js"]
