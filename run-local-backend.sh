#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Chạy backend AeroEdu (server.cjs) LOCAL với Postgres local — để login/API hoạt
# động trên máy mà KHÔNG cần production.
#
#   1) Đảm bảo Postgres đang chạy:  brew services start postgresql@16
#   2) Chạy:                        ./run-local-backend.sh
#   3) Frontend:                    cd aeroedu-vite && npm run dev
#      (Vite proxy /api → http://localhost:8090 mặc định → backend này)
#
# Backend nghe ở PORT=8090 để khớp target proxy mặc định của Vite.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
cd "$(dirname "${BASH_SOURCE[0]}")"
# Deps của server.cjs (express, pg, bcryptjs, jsonwebtoken, …) đã cài ở
# node_modules gốc repo → Node tự resolve, không cần NODE_PATH.

# DB local (peer/trust auth — không cần mật khẩu). Đổi nếu bạn dùng DB khác.
export DATABASE_URL="${DATABASE_URL:-postgresql://$(whoami)@localhost:5432/aeroedu}"

# JWT secret cho môi trường dev (KHÔNG dùng ngoài local).
export JWT_SECRET="${JWT_SECRET:-aeroedu-local-dev-secret-change-me}"

# Backend nghe cổng 8090 (khớp Vite proxy mặc định).
export PORT="${PORT:-8090}"
export NODE_ENV="${NODE_ENV:-development}"

echo "▶ DATABASE_URL = $DATABASE_URL"
echo "▶ PORT         = $PORT"
echo "▶ Khởi động server.cjs …"
exec node server.cjs
