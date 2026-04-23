#!/bin/bash
# ============================================================
# deploy-media-service.sh
# Build & deploy Rust media-service to Cloud Run (pixiai-media)
# Handles: /api/exam-matrices, /api/media, /api/documents
# Usage: bash deploy-media-service.sh
# ============================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
MEDIA_SERVICE_NAME="pixiai-media"
FRONTEND_SERVICE_NAME="pixiai"
REPO_NAME="aeroedu"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${MEDIA_SERVICE_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"
GCS_BUCKET="aeroedu-media-extreme-lattice-491123-p2"

echo "============================================================"
echo "  Rust media-service → Cloud Run Deploy"
echo "  Service: ${MEDIA_SERVICE_NAME}"
echo "  Image  : ${IMAGE_NAME}:${TAG}"
echo "============================================================"

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker not running. Start Docker Desktop first."
  exit 1
fi

# ── Step 1: Auth ─────────────────────────────────────────────
echo ""
echo "[1/6] Authenticating with gcloud..."
gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project ${PROJECT_ID}
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo "✅ Authenticated"

# ── Step 2: Artifact Registry ────────────────────────────────
echo ""
echo "[2/6] Verifying Artifact Registry (${REPO_NAME})..."
gcloud artifacts repositories describe ${REPO_NAME} \
  --location=${REGION} >/dev/null 2>&1 || \
gcloud artifacts repositories create ${REPO_NAME} \
  --repository-format=docker \
  --location=${REGION} \
  --description="AeroEduVision Docker images" \
  --quiet
echo "✅ Artifact Registry ready"

# ── Step 3: IAM permissions ──────────────────────────────────
echo ""
echo "[3/6] Setting IAM permissions for secrets..."
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for SECRET in "pixiai-database-url" "pixiai-jwt-secret"; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
done
echo "✅ IAM permissions set"

# ── Step 4: Build Docker image ───────────────────────────────
echo ""
echo "[4/6] Building Rust media-service Docker image..."
echo "   (First build ~10-15 min. Subsequent builds use cache.)"

for attempt in 1 2 3; do
  docker buildx build \
    --platform linux/amd64 \
    --load \
    -t ${IMAGE_NAME}:${TAG} \
    -t ${IMAGE_NAME}:latest \
    -f rust-services/media-service/Dockerfile \
    rust-services/media-service && break
  echo "   ⚠️  Build attempt ${attempt}/3 failed, retrying in 15s..."
  sleep 15
  if [ "${attempt}" = "3" ]; then
    echo "❌ Docker build failed after 3 attempts."
    exit 1
  fi
done
echo "✅ Image built: ${IMAGE_NAME}:${TAG}"

# ── Step 5: Push ─────────────────────────────────────────────
echo ""
echo "[5/6] Pushing to Artifact Registry..."
docker push ${IMAGE_NAME}:${TAG}
docker push ${IMAGE_NAME}:latest
echo "✅ Image pushed"

# ── Step 6: Deploy to Cloud Run ──────────────────────────────
echo ""
echo "[6/6] Deploying ${MEDIA_SERVICE_NAME} to Cloud Run..."

gcloud run deploy ${MEDIA_SERVICE_NAME} \
  --image="${IMAGE_NAME}:${TAG}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=5 \
  --concurrency=80 \
  --timeout=60 \
  --cpu-boost \
  --execution-environment=gen2 \
  --set-env-vars="RUST_LOG=media_service=info,tower_http=info,GCS_BUCKET_MEDIA=${GCS_BUCKET}" \
  --update-secrets="\
DATABASE_URL=pixiai-database-url:latest,\
JWT_SECRET=pixiai-jwt-secret:latest" \
  --quiet

# ── Get media service URL ─────────────────────────────────────
MEDIA_SERVICE_URL=$(gcloud run services describe ${MEDIA_SERVICE_NAME} \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo ""
echo "✅ Media service deployed: ${MEDIA_SERVICE_URL}"

# ── Update frontend service with MEDIA_SERVICE_URL ───────────
echo ""
echo "Updating ${FRONTEND_SERVICE_NAME} with MEDIA_SERVICE_URL..."
gcloud run services update ${FRONTEND_SERVICE_NAME} \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-env-vars="MEDIA_SERVICE_URL=${MEDIA_SERVICE_URL}" \
  --quiet

echo ""
echo "============================================================"
echo "  ✅ Media service deploy complete!"
echo "============================================================"
echo "  Media service URL : ${MEDIA_SERVICE_URL}"
echo "  Health check      : ${MEDIA_SERVICE_URL}/health"
echo ""
echo "📋 Bước tiếp theo:"
echo "  1. Test: curl ${MEDIA_SERVICE_URL}/health"
echo "  2. Rebuild frontend: bash quick-deploy.sh"
echo "  3. Test: https://inphysic.com/teacher/exam-matrix"
echo "============================================================"
