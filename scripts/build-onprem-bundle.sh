#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-}"
: "${LICENSE_PUBLIC_KEY_B64:?Export LICENSE_PUBLIC_KEY_B64 before building}"
: "${NODE_IMAGE:?Export digest-pinned NODE_IMAGE before building}"
: "${POSTGRES_IMAGE:?Export digest-pinned POSTGRES_IMAGE before building}"
if [[ ! "$VERSION" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo "Usage: $0 VERSION (ví dụ: 1.0.0)" >&2
  exit 2
fi

OUT="$ROOT/release/onprem-$VERSION"
IMAGE="aeroedu/onprem:$VERSION"
mkdir -p "$OUT"

docker build --pull --build-arg "NODE_IMAGE=$NODE_IMAGE" --build-arg "LICENSE_PUBLIC_KEY_B64=$LICENSE_PUBLIC_KEY_B64" -f "$ROOT/Dockerfile.onprem" -t "$IMAGE" "$ROOT"
docker pull "$POSTGRES_IMAGE"
docker image inspect "$IMAGE" --format '{{.Id}}' > "$OUT/image-id.txt"
docker save "$IMAGE" "$POSTGRES_IMAGE" | gzip -9 > "$OUT/aeroedu-onprem-$VERSION.tar.gz"
cp "$ROOT/docker-compose.onprem.yml" "$OUT/"
cp "$ROOT/.env.onprem.example" "$OUT/"
cp "$ROOT/onprem.sh" "$OUT/"
cp "$ROOT/ON_PREMISE_RUNBOOK.md" "$OUT/"

(
  cd "$OUT"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum ./* > SHA256SUMS
  else
    shasum -a 256 ./* > SHA256SUMS
  fi
)

echo "Bundle ready: $OUT"
