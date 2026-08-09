#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/build/onprem/server.bundle.cjs}"
mkdir -p "$(dirname "$OUT")"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/server.cjs" \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=cjs \
  --packages=external \
  --minify \
  --legal-comments=none \
  --outfile="$OUT"
node --check "$OUT"
echo "Protected server bundle: $OUT"
