#!/usr/bin/env bash
set -euo pipefail
: "${IMAGE:?IMAGE required}" "${DIGEST:?DIGEST required}" "${VERSION:?VERSION required}" "${POSTGRES_IMAGE:?POSTGRES_IMAGE required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY required}" "${GITHUB_SHA:?GITHUB_SHA required}"
ARCH="${ARCH:-amd64}"
case "$ARCH" in amd64|arm64) ;; *) echo 'ARCH must be amd64 or arm64' >&2; exit 2;; esac
PLATFORM="linux/$ARCH"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$ROOT/release"
command -v jq >/dev/null || { echo 'jq is required' >&2; exit 2; }
jq -e '.bomFormat == "CycloneDX" and (.components | type == "array")' "$ROOT/release-metadata/sbom.cdx.json" >/dev/null
jq -e --arg uri "git+https://github.com/$GITHUB_REPOSITORY.git" --arg sha "$GITHUB_SHA" --arg ref "refs/tags/$VERSION" \
  '.invocation.configSource.uri == $uri and .invocation.configSource.digest.sha1 == $sha and .invocation.parameters.ref == $ref' "$ROOT/release-metadata/provenance.json" >/dev/null
approval_hash="$(sha256sum "$ROOT/release-metadata/approved-dr/dr-approval.json" | awk '{print $1}')"
jq -e --arg version "$VERSION" --arg repository "$GITHUB_REPOSITORY" --arg sha "$GITHUB_SHA" --arg image "$IMAGE" --arg digest "$DIGEST" --arg approval "$approval_hash" \
  '.schema == 1 and .version == $version and .source.repository == $repository and .source.commit == $sha and .image.repository == $image and .image.digest == $digest and .disasterRecovery.approvalSha256 == $approval' "$ROOT/release-metadata/release-manifest.json" >/dev/null

docker pull --platform "$PLATFORM" "$IMAGE@$DIGEST"
docker pull --platform "$PLATFORM" "$POSTGRES_IMAGE"
docker tag "$IMAGE@$DIGEST" "aeroedu/onprem:$VERSION"
docker image inspect --format '{{.Id}}' "aeroedu/onprem:$VERSION" > "$STAGE/image-id.txt"
docker image inspect --format '{{.Id}}' "$POSTGRES_IMAGE" > "$STAGE/postgres-image-id.txt"
postgres_local="aeroedu/postgres:16-$VERSION"
docker tag "$POSTGRES_IMAGE" "$postgres_local"
docker save "aeroedu/onprem:$VERSION" "$postgres_local" | gzip -9 > "$STAGE/images.tar.gz"

cp "$ROOT/docker-compose.onprem.yml" "$STAGE/"
cp "$ROOT/.env.onprem.example" "$STAGE/"
cp "$ROOT/onprem.sh" "$STAGE/"
cp "$ROOT/ON_PREMISE_RUNBOOK.md" "$STAGE/"
cp "$ROOT/scripts/install-airgap.sh" "$STAGE/"
mkdir -p "$STAGE/scripts" "$STAGE/lib" "$STAGE/ops"
cp "$ROOT/scripts/deploy-verified.sh" "$STAGE/scripts/"
cp "$ROOT/scripts/license-cli.cjs" "$STAGE/scripts/"
cp "$ROOT/scripts/ops-event.cjs" "$STAGE/scripts/"
cp "$ROOT/scripts/scheduled-backup.sh" "$STAGE/scripts/"
cp "$ROOT/scripts/dr-drill.sh" "$STAGE/scripts/"
cp "$ROOT/scripts/verify-offline-governance.cjs" "$STAGE/scripts/"
cp "$ROOT/ops/aeroedu-backup.service" "$ROOT/ops/aeroedu-backup.timer" "$STAGE/ops/"
cp "$ROOT/lib/license.cjs" "$STAGE/lib/"
cp "$ROOT/release-metadata/sbom.cdx.json" "$STAGE/"
cp "$ROOT/release-metadata/provenance.json" "$STAGE/"
cp "$ROOT/release-metadata/release-manifest.json" "$ROOT/release-metadata/migration-manifest.json" "$STAGE/"
cp "$ROOT/release-metadata/approved-dr/dr-approval.json" "$ROOT/release-metadata/approved-dr/dr-approval.bundle" "$STAGE/"
cp "$ROOT/release-metadata/governance/release-policy.json" "$STAGE/"
printf '%s\n' "$IMAGE@$DIGEST" > "$STAGE/image-digest.txt"
printf '%s\n' "$postgres_local" > "$STAGE/postgres-image.txt"
printf '%s\n' "$VERSION" > "$STAGE/version.txt"
printf '%s\n' "$ARCH" > "$STAGE/architecture.txt"
jq -n --arg version "$VERSION" --arg arch "$ARCH" --arg image "$IMAGE@$DIGEST" --arg appId "$(cat "$STAGE/image-id.txt")" --arg postgres "$POSTGRES_IMAGE" --arg postgresId "$(cat "$STAGE/postgres-image-id.txt")" \
  '{schema:1,version:$version,architecture:$arch,application:{image:$image,id:$appId},postgresql:{image:$postgres,id:$postgresId}}' > "$STAGE/bundle-manifest.json"
(
  cd "$STAGE"
  sha256sum images.tar.gz docker-compose.onprem.yml .env.onprem.example onprem.sh ON_PREMISE_RUNBOOK.md install-airgap.sh scripts/deploy-verified.sh scripts/license-cli.cjs scripts/ops-event.cjs scripts/scheduled-backup.sh scripts/dr-drill.sh scripts/verify-offline-governance.cjs ops/aeroedu-backup.service ops/aeroedu-backup.timer lib/license.cjs image-digest.txt image-id.txt postgres-image.txt postgres-image-id.txt version.txt architecture.txt bundle-manifest.json sbom.cdx.json provenance.json release-manifest.json migration-manifest.json release-policy.json dr-approval.json dr-approval.bundle > SHA256SUMS
)
tar czf "$ROOT/release/aeroedu-onprem-$VERSION-$ARCH.tar.gz" -C "$STAGE" .
