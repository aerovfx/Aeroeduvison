#!/bin/sh
# ============================================================
# AeroEduVision — Container startup script
# 1. Start Rust auth-service on localhost:8092 (if binary exists)
# 2. Start Express frontend server on $PORT (foreground)
#
# If Rust binary is missing (build failed or separate deployment),
# AUTH_SERVICE_URL is unset so server.cjs falls back to Node.js auth.
# ============================================================

echo "[start] Express server: 0.0.0.0:${PORT:-8080}"

if [ -f /usr/local/bin/auth-service ]; then
  echo "[start] Starting Rust auth-service on localhost:8092..."
  # AUTH_SERVICE_URL is already set to http://localhost:8092 via Dockerfile ENV
  AUTH_SERVICE_ADDR=127.0.0.1:8092 /usr/local/bin/auth-service &
  AUTH_PID=$!
  echo "[start] Rust auth-service PID=${AUTH_PID}"
  # Give Rust service a moment to bind before Express starts
  sleep 1
else
  echo "[start] ⚠️  Rust auth binary not found — activating Node.js auth fallback"
  # Unset so server.cjs USE_NODEJS_AUTH = true (Node.js handles /api/auth/*)
  unset AUTH_SERVICE_URL
fi

# Start Express server in foreground (Cloud Run waits for PORT to be bound)
exec node /app/server.cjs
