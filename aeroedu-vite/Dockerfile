# ============================================================
# Dockerfile — AeroEduVision Vite SPA (multi-stage)
# Stage 1: Build với Node 20 Alpine
# Stage 2: Serve với nginx:alpine (~25MB image)
# ============================================================

# ── Stage 1: Builder ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time env vars (override via --build-arg)
ARG VITE_API_URL=https://api.aeroedu.vn
ARG VITE_WS_URL=wss://ws.aeroedu.vn
ARG NODE_ENV=production

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Install deps (cached layer if package.json unchanged)
COPY package*.json ./
RUN npm ci --prefer-offline --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Nginx runtime (with ngx_brotli module) ─────────
# `fholzer/nginx-brotli` = nginx 1.27 compiled với module brotli (ngx_brotli).
# Cần cho directive `brotli_static on` / `brotli on` trong nginx.conf để
# serve file .br đã được vite-plugin-compression tạo sẵn.
FROM fholzer/nginx-brotli:v1.26.2 AS runner

# Copy built Vite assets (bao gồm cả .gz và .br đã được pre-compress)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (SPA fallback + security headers + brotli_static)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && chown -R appuser:appgroup /var/run/nginx.pid
USER appuser

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
