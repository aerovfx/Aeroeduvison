# ============================================================================
# Multi-stage Dockerfile for Next.js App
# Optimized for Cloud Run deployment
# ============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
    FROM node:18-alpine AS deps

    WORKDIR /app
    
    # Install dependencies based on the preferred package manager
    COPY package*.json ./
    COPY prisma ./prisma/
    
    RUN npm ci --only=production && \
        npm cache clean --force
    
    # -----------------------------------------------------------------------------
    # Stage 2: Builder
    # -----------------------------------------------------------------------------
    FROM node:18-alpine AS builder
    
    WORKDIR /app
    
    # Copy dependencies from deps stage
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    # Build arguments
    ARG BUILDTIME
    ARG COMMIT_SHA
    ENV NEXT_TELEMETRY_DISABLED 1
    ENV NODE_ENV production
    
    # Generate Prisma Client
    RUN npx prisma generate --no-engine
    
    # Build Next.js app
    RUN npm run build
    
    # -----------------------------------------------------------------------------
    # Stage 3: Runner
    # -----------------------------------------------------------------------------
    FROM node:18-alpine AS runner
    
    WORKDIR /app
    
    # Security: Don't run as root
    RUN addgroup --system --gid 1001 nodejs && \
        adduser --system --uid 1001 nextjs
    
    # Set environment
    ENV NODE_ENV production
    ENV NEXT_TELEMETRY_DISABLED 1
    ENV PORT 3000
    ENV HOSTNAME "0.0.0.0"
    
    # Copy necessary files from builder
    COPY --from=builder --chown=nextjs:nodejs /app/public ./public
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
    
    USER nextjs
    
    EXPOSE 3000
    
    # Health check
    HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
      CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
    
    CMD ["node", "server.js"]