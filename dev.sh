#!/bin/bash
# dev.sh — Khởi động toàn bộ AeroEduVision local dev (Rust + Vite)
# Usage: ./dev.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 AeroEduVision Dev Stack"
echo "========================================"
echo "  auth-service   → :8092"
echo "  media-service  → :8098  (upload, Q&A)"
echo "  aero-backend   → :8090  (API gateway)"
echo "  vite frontend  → :5173"
echo "========================================"

# Kill existing processes on these ports if any
for port in 8090 8092 8098 5173; do
  pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "⚠️  Killing existing process on :$port (PID $pid)"
    kill -9 $pid 2>/dev/null || true
  fi
done

# Cleanup on Ctrl+C
trap 'echo ""; echo "🛑 Stopping all services..."; kill 0; exit 0' SIGINT SIGTERM

echo ""
echo "▶ Starting auth-service..."
cd "$ROOT/rust-services/auth-service"
cargo run 2>&1 | sed 's/^/[auth]   /' &

echo "▶ Starting media-service..."
cd "$ROOT/rust-services/media-service"
cargo run 2>&1 | sed 's/^/[media]  /' &

echo "▶ Starting aero-backend..."
cd "$ROOT/rust-services/aero-backend"
cargo run 2>&1 | sed 's/^/[api]    /' &

echo "▶ Starting Vite..."
cd "$ROOT/aeroedu-vite"
npm run dev 2>&1 | sed 's/^/[vite]   /' &

echo ""
echo "✅ All services starting. Vite will be ready at http://localhost:5173"
echo "   Press Ctrl+C to stop all."
echo ""

# Wait for all background jobs
wait
