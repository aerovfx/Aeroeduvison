#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI="$ROOT/aeroedu-vite/src-tauri"
RESOURCES="$TAURI/resources"
TARGET="aarch64-apple-darwin"
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || { echo 'This package target requires Apple Silicon macOS.' >&2; exit 2; }
command -v node >/dev/null || { echo 'Node.js 22 is required to stage the runtime.' >&2; exit 2; }
command -v initdb >/dev/null || { echo 'PostgreSQL 16 is required (brew install postgresql@16).' >&2; exit 2; }
command -v tectonic >/dev/null || { echo 'Tectonic is required (brew install tectonic).' >&2; exit 2; }

mkdir -p "$RESOURCES/backend" "$TAURI/binaries"
"$ROOT/node_modules/.bin/prisma" migrate diff --from-empty --to-schema-datamodel "$ROOT/prisma/schema.prisma" --script --output "$RESOURCES/backend/schema.sql"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/server.cjs" --bundle --platform=node --target=node22 --format=cjs --minify --legal-comments=none --external:better-sqlite3 --outfile="$RESOURCES/backend/server.cjs"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/scripts/desktop-bootstrap.cjs" --bundle --platform=node --target=node22 --format=cjs --minify --legal-comments=none --outfile="$RESOURCES/backend/bootstrap.cjs"
cp "$(command -v node)" "$TAURI/binaries/aeroedu-node-$TARGET"
cp "$(command -v tectonic)" "$TAURI/binaries/tectonic-$TARGET"
chmod 755 "$TAURI/binaries/aeroedu-node-$TARGET"
chmod 755 "$TAURI/binaries/tectonic-$TARGET"
node --check "$RESOURCES/backend/server.cjs"
node --check "$RESOURCES/backend/bootstrap.cjs"
echo "Desktop runtime staged for $TARGET"
