#!/usr/bin/env bash
set -euo pipefail
image="${1:?Usage: verify-protected-image.sh IMAGE}"

docker run --rm --entrypoint sh "$image" -c '
  set -eu
  test -f /app/server.cjs
  test ! -d /app/lib
  test ! -d /app/prisma
  test ! -d /app/.git
  if find /app -path /app/node_modules -prune -o -type f \( -name "*.map" -o -name "*.ts" -o -name "*.tsx" -o -name ".env*" -o -name "*.key" -o -name "*.pem" \) ! -name "license-public.pem" -print | grep -q .; then
    echo "Protected image contains forbidden source/secret artifacts:" >&2
    find /app -path /app/node_modules -prune -o -type f \( -name "*.map" -o -name "*.ts" -o -name "*.tsx" -o -name ".env*" -o -name "*.key" -o -name "*.pem" \) ! -name "license-public.pem" -print >&2
    exit 1
  fi
'
echo "Protected image inspection: OK"
