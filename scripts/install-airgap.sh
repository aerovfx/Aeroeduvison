#!/usr/bin/env bash
set -euo pipefail
umask 077

ARCHIVE="${1:-}"
BUNDLE="${2:-}"
PUBLIC_KEY="${3:-}"
TARGET="${4:-/opt/aeroedu}"
[ -f "$ARCHIVE" ] && [ -f "$BUNDLE" ] && [ -f "$PUBLIC_KEY" ] || {
  echo "Usage: $0 archive.tar.gz archive.bundle cosign.pub [/opt/aeroedu]" >&2
  exit 2
}
command -v cosign >/dev/null || { echo 'cosign is required' >&2; exit 2; }
command -v docker >/dev/null || { echo 'docker is required' >&2; exit 2; }
command -v openssl >/dev/null || { echo 'openssl is required' >&2; exit 2; }
command -v node >/dev/null || { echo 'Node.js 22 is required' >&2; exit 2; }
command -v jq >/dev/null || { echo 'jq is required' >&2; exit 2; }
: "${COSIGN_PUBLIC_KEY_SHA256:?Set approved SHA-256 fingerprint for the Cosign public key}"
: "${GOVERNANCE_PUBLIC_KEY_FILE:?Set the out-of-band governance public key path}"
: "${GOVERNANCE_PUBLIC_KEY_SHA256:?Set approved governance public-key SHA-256 fingerprint}"
: "${APPROVED_RELEASE_POLICY_SHA256:?Set out-of-band approved release-policy SHA-256}"
case "$COSIGN_PUBLIC_KEY_SHA256" in sha256:*) approved_key_hash="${COSIGN_PUBLIC_KEY_SHA256#sha256:}";; *) approved_key_hash="$COSIGN_PUBLIC_KEY_SHA256";; esac
actual_key_hash="$(openssl dgst -sha256 "$PUBLIC_KEY" | awk '{print $NF}')"
[ "$actual_key_hash" = "$approved_key_hash" ] || { echo 'Cosign public-key fingerprint mismatch' >&2; exit 2; }
governance_key_hash="$(openssl dgst -sha256 "$GOVERNANCE_PUBLIC_KEY_FILE" | awk '{print $NF}')"
[ "sha256:$governance_key_hash" = "$GOVERNANCE_PUBLIC_KEY_SHA256" ] || { echo 'Governance public-key fingerprint mismatch' >&2; exit 2; }

cosign verify-blob --key "$PUBLIC_KEY" --bundle "$BUNDLE" "$ARCHIVE" >/dev/null
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
members="$(tar tzf "$ARCHIVE")"
printf '%s\n' "$members" | grep -Eq '(^|/)images\.tar\.gz$' || { echo 'Invalid bundle structure' >&2; exit 3; }
if printf '%s\n' "$members" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo 'Unsafe archive path detected' >&2
  exit 3
fi
if tar tvzf "$ARCHIVE" | grep -Eq '^[lhcbp]'; then
  echo 'Unsafe archive link or device entry detected' >&2
  exit 3
fi
tar xzf "$ARCHIVE" -C "$STAGE" --no-same-owner --no-same-permissions
(cd "$STAGE" && sha256sum -c SHA256SUMS)
cosign verify-blob --key "$GOVERNANCE_PUBLIC_KEY_FILE" --bundle "$STAGE/dr-approval.bundle" "$STAGE/dr-approval.json" >/dev/null
node "$STAGE/scripts/verify-offline-governance.cjs" "$STAGE" "$COSIGN_PUBLIC_KEY_SHA256" "$APPROVED_RELEASE_POLICY_SHA256"
bundle_arch="$(cat "$STAGE/architecture.txt")"
jq -e --arg arch "$bundle_arch" --arg image "$(cat "$STAGE/image-digest.txt")" --arg appId "$(cat "$STAGE/image-id.txt")" --arg postgres "$(cat "$STAGE/postgres-image.txt")" --arg postgresId "$(cat "$STAGE/postgres-image-id.txt")" \
  '.schema == 1 and .architecture == $arch and .application.image == $image and .application.id == $appId and .postgresql.image == $postgres and .postgresql.id == $postgresId' "$STAGE/bundle-manifest.json" >/dev/null
host_arch="$(uname -m)"; case "$host_arch" in x86_64) host_arch=amd64;; aarch64|arm64) host_arch=arm64;; esac
[ "$host_arch" = "$bundle_arch" ] || { echo "Bundle architecture $bundle_arch does not match host $host_arch" >&2; exit 4; }
gunzip -c "$STAGE/images.tar.gz" | docker load
expected_image_id="$(cat "$STAGE/image-id.txt")"
actual_image_id="$(docker image inspect --format '{{.Id}}' "aeroedu/onprem:$(cat "$STAGE/version.txt")")"
[ "$actual_image_id" = "$expected_image_id" ] || { echo 'Loaded application image ID does not match signed bundle manifest' >&2; exit 4; }
postgres_image="$(cat "$STAGE/postgres-image.txt")"
expected_postgres_id="$(cat "$STAGE/postgres-image-id.txt")"
actual_postgres_id="$(docker image inspect --format '{{.Id}}' "$postgres_image")"
[ "$actual_postgres_id" = "$expected_postgres_id" ] || { echo 'Loaded PostgreSQL image ID does not match signed bundle manifest' >&2; exit 4; }

mkdir -p "$TARGET"
for file in docker-compose.onprem.yml .env.onprem.example onprem.sh ON_PREMISE_RUNBOOK.md image-digest.txt image-id.txt postgres-image.txt postgres-image-id.txt version.txt architecture.txt bundle-manifest.json sbom.cdx.json provenance.json release-manifest.json migration-manifest.json release-policy.json dr-approval.json dr-approval.bundle; do
  cp "$STAGE/$file" "$TARGET/$file"
done
cp "$PUBLIC_KEY" "$TARGET/cosign.pub"; chmod 644 "$TARGET/cosign.pub"
mkdir -p "$TARGET/scripts" "$TARGET/lib" "$TARGET/ops"
cp "$STAGE/scripts/deploy-verified.sh" "$TARGET/scripts/"
cp "$STAGE/scripts/license-cli.cjs" "$TARGET/scripts/"
cp "$STAGE/scripts/ops-event.cjs" "$TARGET/scripts/"
cp "$STAGE/scripts/scheduled-backup.sh" "$TARGET/scripts/"
cp "$STAGE/scripts/dr-drill.sh" "$TARGET/scripts/"
cp "$STAGE/scripts/verify-offline-governance.cjs" "$TARGET/scripts/"
cp "$STAGE/ops/aeroedu-backup.service" "$STAGE/ops/aeroedu-backup.timer" "$TARGET/ops/"
cp "$STAGE/lib/license.cjs" "$TARGET/lib/"
chmod 700 "$TARGET/scripts/deploy-verified.sh" "$TARGET/scripts/license-cli.cjs" "$TARGET/scripts/ops-event.cjs" "$TARGET/scripts/scheduled-backup.sh" "$TARGET/scripts/dr-drill.sh" "$TARGET/scripts/verify-offline-governance.cjs"
chmod 700 "$TARGET/onprem.sh"
if [ ! -f "$TARGET/.env.onprem" ]; then
  cp "$TARGET/.env.onprem.example" "$TARGET/.env.onprem"
  chmod 600 "$TARGET/.env.onprem"
fi
version="$(cat "$STAGE/version.txt")"
digest="$(sed 's/.*@//' "$STAGE/image-digest.txt")"
tmp_env="$(mktemp)"
awk -v version="$version" -v image="aeroedu/onprem:$version" -v digest="$digest" -v image_id="$expected_image_id" -v postgres="$postgres_image" '
  BEGIN { seenVersion=0; seenImage=0; seenMode=0; seenDigest=0; seenImageId=0; seenPostgres=0 }
  /^AEROEDU_VERSION=/ { print "AEROEDU_VERSION=" version; seenVersion=1; next }
  /^AEROEDU_IMAGE=/ { print "AEROEDU_IMAGE=" image; seenImage=1; next }
  /^AEROEDU_INSTALL_MODE=/ { print "AEROEDU_INSTALL_MODE=airgap"; seenMode=1; next }
  /^AEROEDU_IMAGE_DIGEST=/ { print "AEROEDU_IMAGE_DIGEST=" digest; seenDigest=1; next }
  /^AEROEDU_IMAGE_ID=/ { print "AEROEDU_IMAGE_ID=" image_id; seenImageId=1; next }
  /^POSTGRES_IMAGE=/ { print "POSTGRES_IMAGE=" postgres; seenPostgres=1; next }
  { print }
  END { if (!seenVersion) print "AEROEDU_VERSION=" version; if (!seenImage) print "AEROEDU_IMAGE=" image; if (!seenMode) print "AEROEDU_INSTALL_MODE=airgap"; if (!seenDigest) print "AEROEDU_IMAGE_DIGEST=" digest; if (!seenImageId) print "AEROEDU_IMAGE_ID=" image_id; if (!seenPostgres) print "POSTGRES_IMAGE=" postgres }
' "$TARGET/.env.onprem" > "$tmp_env"
mv "$tmp_env" "$TARGET/.env.onprem"; chmod 600 "$TARGET/.env.onprem"
INSTALLATION_ID="$(sed -n 's/^INSTALLATION_ID=//p' "$TARGET/.env.onprem" | tail -1)" AEROEDU_HOME="$TARGET" AEROEDU_VERSION="$version" AEROEDU_IMAGE="aeroedu/onprem:$version" AEROEDU_IMAGE_DIGEST="$digest" node "$TARGET/scripts/ops-event.cjs" record airgap.install >/dev/null || echo 'Warning: bundle installed but audit event could not be recorded.' >&2
echo "Verified bundle installed at $TARGET. Add license.json, configure .env.onprem, then run ./onprem.sh install."
