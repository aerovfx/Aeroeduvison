# ============================================================
# AeroEduVision — Cloud Run container (pixiai)
#
# Architecture:
#   Stage 1: Build Vite React SPA
#   Stage 2: Runtime — Express proxy server
#              /api/auth/* → AUTH_SERVICE_URL (Rust auth-service OR built-in Node.js)
#              /api/*      → BACKEND_URL (Rust aero-backend gateway)
#              /*          → Vite dist/ (static SPA)
#
# Auth strategy:
#   - If AUTH_SERVICE_URL is set in Cloud Run env vars → proxy to Rust auth-service
#   - If AUTH_SERVICE_URL is NOT set → built-in Node.js auth (pg + bcryptjs + jsonwebtoken)
#   The built-in auth reads DATABASE_URL + JWT_SECRET from Cloud Run secrets.
# ============================================================

# ── Stage 1: Build Vite SPA ─────────────────────────────────
FROM node:20-slim AS vite-builder
WORKDIR /app

# Build-time arguments (required for OAuth — Vite bakes VITE_* vars into the bundle)
# Passed from deploy.sh via `docker buildx build --build-arg`.
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_API_URL=""
ARG VITE_WS_URL=""
ARG VITE_APP_URL=""

COPY aeroedu-vite/package.json aeroedu-vite/package-lock.json* ./
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci --legacy-peer-deps

COPY aeroedu-vite/ .
ENV NODE_ENV=production
ENV VITE_APP_VERSION=cloud-run
# Promote build args to ENV so Vite picks them up during `npm run build`
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_APP_URL=${VITE_APP_URL}
# Hard validation — reject build if VITE_GOOGLE_CLIENT_ID is polluted.
# Context: 2026-04-21 incident — deploy-cloudbuild.sh used `echo` to stdout inside
# $(load_env_var …), which contaminated the build-arg with a debug prefix like
# "  VITE_GOOGLE_CLIENT_ID: loaded from aeroedu-vite/.env.production\n<real-id>".
# Vite happily baked that polluted string into the bundle → Google OAuth returned
# invalid_client. This block fails the Docker build early if garbage leaks through.
RUN set -eu; \
    echo "▶ VITE_GOOGLE_CLIENT_ID length=${#VITE_GOOGLE_CLIENT_ID} (must be >0 for Google OAuth)"; \
    if [ -n "${VITE_GOOGLE_CLIENT_ID}" ]; then \
      case "${VITE_GOOGLE_CLIENT_ID}" in \
        *[[:space:]]*) \
          echo "❌ VITE_GOOGLE_CLIENT_ID contains whitespace/newline — refusing to build." >&2; \
          printf '%s' "${VITE_GOOGLE_CLIENT_ID}" | od -c | head -20 >&2; \
          exit 1 ;; \
      esac; \
      if ! printf '%s' "${VITE_GOOGLE_CLIENT_ID}" \
           | grep -qE '^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$'; then \
        echo "❌ VITE_GOOGLE_CLIENT_ID format invalid — refusing to build." >&2; \
        echo "   Got: ${VITE_GOOGLE_CLIENT_ID}" >&2; \
        exit 1; \
      fi; \
      echo "  ✓ VITE_GOOGLE_CLIENT_ID format valid"; \
    else \
      echo "  ⚠ VITE_GOOGLE_CLIENT_ID empty — Google sign-in will fall back to runtime override only"; \
    fi; \
    npm run build

# ── Stage 2: Runtime ────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Copy Express server + lib modules (auth, payment, telegram, fal.ai, email)
# Built-in Node.js handlers cần các module này — không có sẽ crash startup.
COPY server.cjs ./
COPY lib ./lib
RUN npm config set fetch-timeout 600000 && \
    npm init -y && \
    npm install --omit=dev \
      express@4 \
      http-proxy-middleware@3 \
      serve-static \
      pg \
      bcryptjs \
      jsonwebtoken \
      hash-wasm \
      pdf-parse \
      nodemailer

# Copy Vite build output
COPY --from=vite-builder /app/dist ./dist

# Non-root user
RUN groupadd --system --gid 1001 appuser && \
    useradd --system --uid 1001 --gid appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

# AUTH_SERVICE_URL intentionally NOT set here — server.cjs falls back to
# built-in Node.js auth when this is absent. Set it in Cloud Run env vars
# if/when a dedicated Rust auth-service is deployed.

CMD ["node", "server.cjs"]
