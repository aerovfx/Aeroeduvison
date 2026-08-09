#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

export LOCAL_DATABASE_PATH="${LOCAL_DATABASE_PATH:-$ROOT/data/aeroedu-offline.db}"
export DATABASE_URL="sqlite:$LOCAL_DATABASE_PATH"
export JWT_SECRET="${JWT_SECRET:-aeroedu-local-offline-secret-change-me}"
export PORT="${PORT:-8090}"
export NODE_ENV="development"

node scripts/init-offline-db.cjs

cleanup() { jobs -p | xargs kill 2>/dev/null || true; }
trap cleanup EXIT INT TERM

node server.cjs &
npm run dev --prefix aeroedu-vite &
wait
