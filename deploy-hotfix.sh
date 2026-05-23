#!/usr/bin/env bash
# deploy-hotfix.sh — Hotfix deploy (backend-only, ~1-2 phút thay vì 5-7)
# Skip Vite build bằng cách overlay server.cjs + lib lên image cuối cùng.
#
# Usage:
#   ./deploy-hotfix.sh           # build + push + deploy
#
# Khi nào dùng:
#   ✓ Chỉ thay đổi server.cjs hoặc lib/*.cjs
#   ✗ Thay đổi aeroedu-vite/ → DÙNG deploy-cloudbuild.sh (full build)
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-extreme-lattice-491123-p2}"
REGION="${REGION:-asia-southeast1}"
SERVICE_NAME="${SERVICE_NAME:-pixiai}"
REPO_NAME="${REPO_NAME:-aeroedu}"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
TAG="hotfix-$(date +%Y%m%d-%H%M%S)"
BUILD_MACHINE_TYPE="${BUILD_MACHINE_TYPE:-E2_HIGHCPU_8}"

echo "════════════════════════════════════════════════════════════"
echo "🔥 HOTFIX DEPLOY — Backend only (skip Vite build)"
echo "  Project : ${PROJECT_ID}"
echo "  Service : ${SERVICE_NAME}"
echo "  Image   : ${IMAGE_NAME}:${TAG}"
echo "════════════════════════════════════════════════════════════"

# Step 1: tìm image base — image mới nhất của service
echo "Step 1: Tìm base image (revision live hiện tại)..."
BASE_IMAGE=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format='value(spec.template.spec.containers[0].image)')
if [[ -z "${BASE_IMAGE}" ]]; then
  echo "❌ Không tìm thấy base image — chạy ./deploy-cloudbuild.sh full lần đầu trước"
  exit 1
fi
echo "  ✓ Base: ${BASE_IMAGE}"

# Step 2: build hotfix image qua Cloud Build (chỉ overlay server.cjs + lib)
echo "Step 2: Build hotfix image (Cloud Build ~30-60s)..."
cat > /tmp/cloudbuild-hotfix.yaml <<EOF
steps:
  - name: gcr.io/cloud-builders/docker
    id: build
    args:
      - build
      - --file=Dockerfile.hotfix
      - --build-arg=BASE_IMAGE=${BASE_IMAGE}
      - --tag=${IMAGE_NAME}:${TAG}
      - --tag=${IMAGE_NAME}:hotfix-latest
      - .
images:
  - ${IMAGE_NAME}:${TAG}
  - ${IMAGE_NAME}:hotfix-latest
options:
  machineType: ${BUILD_MACHINE_TYPE}
  logging: CLOUD_LOGGING_ONLY
timeout: 600s
EOF

gcloud builds submit \
  --config=/tmp/cloudbuild-hotfix.yaml \
  --project="${PROJECT_ID}" \
  --quiet \
  .

echo "✅ Hotfix image built: ${IMAGE_NAME}:${TAG}"

# Step 3: Deploy revision mới
echo "Step 3: Deploy revision mới sang Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_NAME}:${TAG}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet \
  --no-traffic \
  --tag="t${TAG//hotfix-/}"

# Step 4: Route 100% traffic sang revision mới
echo "Step 4: Route traffic 100% sang revision mới..."
gcloud run services update-traffic "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --to-latest \
  --quiet

NEW_REV=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format='value(status.latestReadyRevisionName)')

echo "════════════════════════════════════════════════════════════"
echo "🎉 HOTFIX DEPLOYED"
echo "  Revision : ${NEW_REV}"
echo "  Tag      : ${TAG}"
echo "  Time     : ~1-2 phút (skip Vite build)"
echo "════════════════════════════════════════════════════════════"

# Sound notify (macOS only)
[[ -x /usr/bin/afplay ]] && afplay /System/Library/Sounds/Glass.aiff &
exit 0
