#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${AEROEDU_ENV_FILE:-$ROOT/.env.onprem}"
: "${AEROEDU_IMAGE:?Set AEROEDU_IMAGE to registry/image@sha256:digest}"
: "${COSIGN_PUBLIC_KEY:?Set COSIGN_PUBLIC_KEY path}"
: "${EXPECTED_SOURCE_REPOSITORY:?Set EXPECTED_SOURCE_REPOSITORY (owner/repository)}"
: "${EXPECTED_SOURCE_SHA:?Set EXPECTED_SOURCE_SHA to the approved 40-character release commit}"
: "${COSIGN_PUBLIC_KEY_SHA256:?Set approved Cosign public-key SHA-256 fingerprint}"
: "${GOVERNANCE_PUBLIC_KEY:?Set governance public-key path}"
: "${GOVERNANCE_PUBLIC_KEY_SHA256:?Set governance public-key fingerprint}"
: "${DR_APPROVAL_FILE:?Set signed DR approval JSON path}"
: "${DR_APPROVAL_BUNDLE:?Set signed DR approval bundle path}"
: "${APPROVED_RELEASE_POLICY_SHA256:?Set site-approved release policy SHA-256}"
command -v jq >/dev/null || { echo 'jq is required for attestation policy checks' >&2; exit 2; }
case "$AEROEDU_IMAGE" in *@sha256:*) ;; *) echo 'AEROEDU_IMAGE must be digest-pinned' >&2; exit 2;; esac
approved_key_hash="${COSIGN_PUBLIC_KEY_SHA256#sha256:}"
actual_key_hash="$(openssl dgst -sha256 "$COSIGN_PUBLIC_KEY" | awk '{print $NF}')"
[ "$actual_key_hash" = "$approved_key_hash" ] || { echo 'Cosign public-key fingerprint mismatch' >&2; exit 2; }
governance_key_hash="$(openssl dgst -sha256 "$GOVERNANCE_PUBLIC_KEY" | awk '{print $NF}')"
[ "sha256:$governance_key_hash" = "$GOVERNANCE_PUBLIC_KEY_SHA256" ] || { echo 'Governance public-key fingerprint mismatch' >&2; exit 2; }
cosign verify-blob --key "$GOVERNANCE_PUBLIC_KEY" --bundle "$DR_APPROVAL_BUNDLE" "$DR_APPROVAL_FILE" >/dev/null

cosign verify --key "$COSIGN_PUBLIC_KEY" "$AEROEDU_IMAGE" >/dev/null
sbom_attestation="$(cosign verify-attestation --output json --key "$COSIGN_PUBLIC_KEY" --type cyclonedx "$AEROEDU_IMAGE")"
provenance_attestation="$(cosign verify-attestation --output json --key "$COSIGN_PUBLIC_KEY" --type slsaprovenance "$AEROEDU_IMAGE")"
migration_attestation="$(cosign verify-attestation --output json --key "$COSIGN_PUBLIC_KEY" --type https://aeroedu.vn/attestations/migrations/v1 "$AEROEDU_IMAGE")"
release_attestation="$(cosign verify-attestation --output json --key "$COSIGN_PUBLIC_KEY" --type https://aeroedu.vn/attestations/release/v1 "$AEROEDU_IMAGE")"
printf '%s\n' "$sbom_attestation" | jq -se '.[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson | .predicate | .bomFormat == "CycloneDX" and (.specVersion | type == "string") and (.components | type == "array")' >/dev/null
printf '%s\n' "$provenance_attestation" | jq -se --arg repository "$EXPECTED_SOURCE_REPOSITORY" --arg sha "$EXPECTED_SOURCE_SHA" '
  .[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson |
  .predicate.invocation.configSource.uri == ("git+https://github.com/" + $repository + ".git") and
  .predicate.invocation.configSource.digest.sha1 == $sha and
  (.predicate.invocation.parameters.ref | test("^refs/tags/v[0-9]+\\.[0-9]+\\.[0-9]+([.-][0-9A-Za-z.-]+)?$")) and
  .predicate.buildType == "https://mobyproject.org/buildkit@v1" and
  .predicate.builder.id == "https://github.com/actions/runner"
' >/dev/null
release_ref="$(printf '%s\n' "$provenance_attestation" | jq -sr '.[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson | .predicate.invocation.parameters.ref')"
release_version="${release_ref#refs/tags/}"
approval_hash="$(openssl dgst -sha256 "$DR_APPROVAL_FILE" | awk '{print $NF}')"
canonical_attestation_hashes() {
  jq -sr '.[] | (if type == "array" then .[] else . end) | .payload | @base64d | fromjson | .predicate | tojson' | while IFS= read -r predicate; do
    printf '%s' "$predicate" | jq -cS -j . | openssl dgst -sha256 | awk '{print $NF}'
  done
}
sbom_hashes="$(printf '%s\n' "$sbom_attestation" | canonical_attestation_hashes)"
provenance_hashes="$(printf '%s\n' "$provenance_attestation" | canonical_attestation_hashes)"
migration_hashes="$(printf '%s\n' "$migration_attestation" | canonical_attestation_hashes)"
release_sbom_hash="$(printf '%s\n' "$release_attestation" | jq -sr '.[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson | .predicate.artifacts.sbomSha256')"
release_provenance_hash="$(printf '%s\n' "$release_attestation" | jq -sr '.[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson | .predicate.artifacts.provenanceSha256')"
release_migration_hash="$(printf '%s\n' "$release_attestation" | jq -sr '.[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson | .predicate.artifacts.migrationManifestSha256')"
printf '%s\n' "$sbom_hashes" | grep -Fxq "$release_sbom_hash" || { echo 'SBOM attestation is not bound to the release manifest' >&2; exit 2; }
printf '%s\n' "$provenance_hashes" | grep -Fxq "$release_provenance_hash" || { echo 'Provenance attestation is not bound to the release manifest' >&2; exit 2; }
printf '%s\n' "$migration_hashes" | grep -Fxq "$release_migration_hash" || { echo 'Migration attestation is not bound to the release manifest' >&2; exit 2; }
printf '%s\n' "$release_attestation" | jq -se --arg repository "$EXPECTED_SOURCE_REPOSITORY" --arg sha "$EXPECTED_SOURCE_SHA" --arg image "${AEROEDU_IMAGE%@*}" --arg digest "${AEROEDU_IMAGE##*@}" --arg version "$release_version" --arg keyHash "$approved_key_hash" --arg approval "$approval_hash" --arg policy "${APPROVED_RELEASE_POLICY_SHA256#sha256:}" '
  .[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson | .predicate |
  .schema == 1 and .version == $version and .source.repository == $repository and .source.commit == $sha and
  .image.repository == $image and .image.digest == $digest and .trust.cosignPublicKeySha256 == $keyHash and
  (.architectures | sort) == ["amd64","arm64"] and .disasterRecovery.approvalSha256 == $approval and
  (.disasterRecovery.evidenceSha256 | test("^sha256:[a-f0-9]{64}$")) and
  ((.disasterRecovery.lastDrillAt | fromdateiso8601) >= (now - 7776000)) and
  .artifacts.releasePolicySha256 == $policy and
  ([.artifacts.sbomSha256,.artifacts.provenanceSha256,.artifacts.migrationManifestSha256] | all(test("^[a-f0-9]{64}$"))) and
  (.inputs.nodeImage | test("@sha256:[a-f0-9]{64}$")) and (.inputs.postgresImage | test("@sha256:[a-f0-9]{64}$"))
' >/dev/null
jq -e --arg repository "$EXPECTED_SOURCE_REPOSITORY" --arg evidence "$(printf '%s\n' "$release_attestation" | jq -sr '.[0] | (if type == "array" then .[0] else . end) | .payload | @base64d | fromjson | .predicate.disasterRecovery.evidenceSha256')" '
  .schema == 1 and .repository == $repository and .evidenceSha256 == $evidence and .elapsedSeconds <= 14400 and (.ticketUrl | startswith("https://"))
' "$DR_APPROVAL_FILE" >/dev/null
docker pull "$AEROEDU_IMAGE"
digest="${AEROEDU_IMAGE##*@}"
image_ref="${AEROEDU_IMAGE%@*}@$digest"

node "$ROOT/scripts/license-cli.cjs" verify \
  --license "${LICENSE_FILE_HOST:-$ROOT/license.json}" \
  --public "${LICENSE_PUBLIC_KEY_FILE:?Set LICENSE_PUBLIC_KEY_FILE path}" \
  --installation "${INSTALLATION_ID:?Set INSTALLATION_ID}" \
  --image-digest "$digest" >/dev/null

backup_dir="${AEROEDU_BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$backup_dir"
backup_path="$backup_dir/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
AEROEDU_ENV_FILE="$ENV_FILE" "$ROOT/onprem.sh" backup "$backup_path"

receipt="${AEROEDU_VERIFIED_RECEIPT:-$ROOT/state/verified-release.env}"; mkdir -p "$(dirname "$receipt")"
previous_receipt="$(mktemp)"; receipt_existed=false
if [ -f "$receipt" ]; then cp "$receipt" "$previous_receipt"; receipt_existed=true; fi
receipt_tmp="$(mktemp "$(dirname "$receipt")/.verified-release.XXXXXX")"
printf 'AEROEDU_VERIFIED_IMAGE=%s\nEXPECTED_SOURCE_REPOSITORY=%s\nEXPECTED_SOURCE_SHA=%s\nVERIFIED_AT=%s\n' "$image_ref" "$EXPECTED_SOURCE_REPOSITORY" "$EXPECTED_SOURCE_SHA" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$receipt_tmp"
chmod 600 "$receipt_tmp"; mv "$receipt_tmp" "$receipt"
tmp="$(mktemp)"; previous_env="$(mktemp)"; cp "$ENV_FILE" "$previous_env"; chmod 600 "$previous_env"; trap 'rm -f "$tmp" "$previous_env" "$previous_receipt"' EXIT
awk -v image="$image_ref" -v digest="$digest" -v version="$release_version" '
  BEGIN { seenImage=0; seenDigest=0; seenMode=0; seenVersion=0 }
  /^AEROEDU_VERSION=/ { print "AEROEDU_VERSION=" version; seenVersion=1; next }
  /^AEROEDU_IMAGE=/ { print "AEROEDU_IMAGE=" image; seenImage=1; next }
  /^AEROEDU_IMAGE_DIGEST=/ { print "AEROEDU_IMAGE_DIGEST=" digest; seenDigest=1; next }
  /^AEROEDU_INSTALL_MODE=/ { print "AEROEDU_INSTALL_MODE=registry"; seenMode=1; next }
  { print }
  END { if (!seenVersion) print "AEROEDU_VERSION=" version; if (!seenImage) print "AEROEDU_IMAGE=" image; if (!seenDigest) print "AEROEDU_IMAGE_DIGEST=" digest; if (!seenMode) print "AEROEDU_INSTALL_MODE=registry" }
' "$ENV_FILE" > "$tmp"
chmod 600 "$tmp"; mv "$tmp" "$ENV_FILE"
if ! AEROEDU_ENV_FILE="$ENV_FILE" "$ROOT/onprem.sh" upgrade; then
  cp "$previous_env" "$ENV_FILE"; chmod 600 "$ENV_FILE"
  if [ "$receipt_existed" = true ]; then cp "$previous_receipt" "$receipt"; else rm -f "$receipt"; fi
  if ! AEROEDU_ENV_FILE="$ENV_FILE" "$ROOT/onprem.sh" upgrade; then
    echo 'EMERGENCY: deployment and rollback both failed; operator intervention is required.' >&2
    exit 7
  fi
  rm -f "$previous_env"
  echo 'Deployment failed; previous image configuration restored.' >&2
  exit 5
fi
port="$(sed -n 's/^AEROEDU_PORT=//p' "$ENV_FILE" | tail -1)"; port="${port:-8080}"
ready=false
container_id="$(docker compose --env-file "$ENV_FILE" -f "$ROOT/docker-compose.onprem.yml" ps -q app)"
actual_image_id="$(docker inspect --format '{{.Image}}' "$container_id" 2>/dev/null || true)"
expected_image_id="$(docker image inspect --format '{{.Id}}' "$image_ref" 2>/dev/null || true)"
if [ -z "$container_id" ] || [ "$actual_image_id" != "$expected_image_id" ]; then
  echo 'Running container image ID does not match verified release digest.' >&2
else
for _attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${port}/api/health/ready" >/dev/null; then ready=true; break; fi
  sleep 2
done
fi
if [ "$ready" != true ]; then
  cp "$previous_env" "$ENV_FILE"; chmod 600 "$ENV_FILE"
  if [ "$receipt_existed" = true ]; then cp "$previous_receipt" "$receipt"; else rm -f "$receipt"; fi
  if ! AEROEDU_ENV_FILE="$ENV_FILE" "$ROOT/onprem.sh" upgrade; then
    echo 'EMERGENCY: readiness failed and rollback also failed; operator intervention is required.' >&2
    exit 7
  fi
  rm -f "$previous_env"
  echo 'Readiness failed; rolled back to previous image configuration.' >&2
  exit 6
fi
public_url="$(sed -n 's/^PUBLIC_URL=//p' "$ENV_FILE" | tail -1)"
if ! curl -fsS "${public_url%/}/api/health/ready" >/dev/null; then
  if [ "${REQUIRE_PUBLIC_SMOKE:-true}" = true ]; then
    cp "$previous_env" "$ENV_FILE"; chmod 600 "$ENV_FILE"
    if [ "$receipt_existed" = true ]; then cp "$previous_receipt" "$receipt"; else rm -f "$receipt"; fi
    AEROEDU_ENV_FILE="$ENV_FILE" "$ROOT/onprem.sh" upgrade || { echo 'EMERGENCY: public smoke failed and rollback failed.' >&2; exit 7; }
    echo 'Public smoke test failed; previous release restored.' >&2
    exit 8
  fi
  echo 'Warning: public synthetic probe failed but REQUIRE_PUBLIC_SMOKE=false.' >&2
fi
INSTALLATION_ID="$INSTALLATION_ID" AEROEDU_HOME="$ROOT" AEROEDU_VERSION="$release_version" AEROEDU_IMAGE="$image_ref" AEROEDU_IMAGE_DIGEST="$digest" EXPECTED_SOURCE_SHA="$EXPECTED_SOURCE_SHA" node "$ROOT/scripts/ops-event.cjs" record connected.deploy >/dev/null || echo 'Warning: deploy succeeded but audit event failed.' >&2
rm -f "$previous_env"
echo "Deployment ready: $AEROEDU_IMAGE (pre-deploy backup: $backup_path)"
