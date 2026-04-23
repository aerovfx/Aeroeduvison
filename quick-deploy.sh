#!/bin/bash
set -euo pipefail

# ================================================
# AeroEduVision — Quick Deploy to Cloud Run
# Target: https://pixiai-667564078289.asia-southeast1.run.app
# ================================================
# Build locally with Docker Desktop (Rosetta) → push to Artifact Registry → deploy
# Run: bash quick-deploy.sh

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="pixiai"
REPO_NAME="aeroedu"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"

echo "============================================"
echo "  AeroEduVision — Cloud Run Deploy"
echo "  Target: https://pixiai-667564078289.asia-southeast1.run.app"
echo "  Image: ${IMAGE_NAME}:${TAG}"
echo "============================================"

# ── Step 0: Check Docker Desktop ─────────────────
echo ""
echo "Step 0: Checking Docker Desktop..."
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is not running. Start Docker Desktop first."
  exit 1
fi
echo "✅ Docker is running"

# ── Step 1: Authenticate with gcloud ─────────────
echo ""
echo "Step 1: Authenticating with gcloud..."
gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project ${PROJECT_ID}
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo "✅ Authenticated (project: ${PROJECT_ID})"

# ── Step 2: Enable required APIs ─────────────────
echo ""
echo "Step 2: Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  --quiet 2>/dev/null || true
echo "✅ APIs enabled"

# ── Step 2.5: Ensure JWT secret exists ───────────
echo ""
echo "Step 2.5: Ensuring pixiai-jwt-secret exists (needed for Node.js auth fallback)..."
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
if ! gcloud secrets describe "pixiai-jwt-secret" --project="${PROJECT_ID}" &>/dev/null; then
  JWT_SECRET=$(openssl rand -hex 32)
  echo "${JWT_SECRET}" | gcloud secrets create "pixiai-jwt-secret" \
    --data-file=- --replication-policy=automatic --project="${PROJECT_ID}" --quiet
  echo "  ✅ Created: pixiai-jwt-secret"
else
  echo "  ✅ Exists:  pixiai-jwt-secret"
fi
# Grant access to Cloud Run service account
for SECRET in "pixiai-jwt-secret" "pixiai-database-url" "pixiai-google-client-id"; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
done
echo "✅ JWT secret & IAM ready"

# ── Step 3: Create Artifact Registry repo ────────
echo ""
echo "Step 3: Verifying Artifact Registry (${REPO_NAME})..."
gcloud artifacts repositories describe ${REPO_NAME} \
  --location=${REGION} >/dev/null 2>&1 || \
gcloud artifacts repositories create ${REPO_NAME} \
  --repository-format=docker \
  --location=${REGION} \
  --description="AeroEduVision Docker images" \
  --quiet
echo "✅ Artifact Registry ready"

# ── Step 4: Build Docker image locally ───────────
echo ""
echo "Step 4: Building Docker image (5-15 min)..."
echo "   Platform: linux/amd64  |  Builder: Docker Desktop + Rosetta"

# Pre-pull base image with retry (M2/Rosetta cross-platform pulls can timeout)
echo "   Pre-pulling node:20-slim for linux/amd64..."
for attempt in 1 2 3; do
  docker pull --platform linux/amd64 node:20-slim && break
  echo "   ⚠️  Pull attempt ${attempt}/3 failed, retrying in 10s..."
  sleep 10
  if [ "${attempt}" = "3" ]; then
    echo "❌ Could not pull base image after 3 attempts. Check your network."
    exit 1
  fi
done

# Build with retry
for attempt in 1 2 3; do
  docker buildx build \
    --platform linux/amd64 \
    --pull=false \
    --load \
    -t ${IMAGE_NAME}:${TAG} \
    -t ${IMAGE_NAME}:latest \
    -f Dockerfile \
    . && break
  echo "   ⚠️  Build attempt ${attempt}/3 failed, retrying in 10s..."
  sleep 10
  if [ "${attempt}" = "3" ]; then
    echo "❌ Docker build failed after 3 attempts."
    exit 1
  fi
done
echo "✅ Image built: ${IMAGE_NAME}:${TAG}"

# ── Step 4.5: Smoke test locally ─────────────────
echo ""
echo "Step 4.5: Smoke testing container locally (10s)..."
CONTAINER_ID=$(docker run -d --rm -p 18080:8080 -e PORT=8080 "${IMAGE_NAME}:${TAG}")
sleep 4
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18080/ || echo "000")
docker stop "${CONTAINER_ID}" >/dev/null 2>&1 || true
if [ "${HTTP_STATUS}" = "000" ]; then
  echo "❌ Container failed to start or crashed. Check logs above."
  echo "   Debug locally: docker run --rm -p 8080:8080 -e PORT=8080 ${IMAGE_NAME}:${TAG}"
  exit 1
fi
echo "✅ Container smoke test passed (HTTP ${HTTP_STATUS})"

# ── Step 5: Push to Artifact Registry ────────────
echo ""
echo "Step 5: Pushing image to Artifact Registry..."
docker push ${IMAGE_NAME}:${TAG}
docker push ${IMAGE_NAME}:latest
echo "✅ Image pushed"

# ── Step 6: Deploy to Cloud Run ──────────────────
echo ""
echo "Step 6: Deploying to Cloud Run..."

# Auto-detect URLs of deployed Rust microservices
AUTH_SERVICE_URL=""
MEDIA_SERVICE_URL=""
if gcloud run services describe "pixiai-auth" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  AUTH_SERVICE_URL=$(gcloud run services describe "pixiai-auth" \
    --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
  echo "✅ Auth service  : ${AUTH_SERVICE_URL}"
else
  echo "⚠️  pixiai-auth not deployed — run: bash deploy-auth-service.sh"
fi
if gcloud run services describe "pixiai-media" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  MEDIA_SERVICE_URL=$(gcloud run services describe "pixiai-media" \
    --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
  echo "✅ Media service : ${MEDIA_SERVICE_URL}"
else
  echo "⚠️  pixiai-media not deployed — run: bash deploy-media-service.sh"
fi

# Build env-vars string
ENV_VARS="NODE_ENV=production"
[ -n "${AUTH_SERVICE_URL}" ]  && ENV_VARS="${ENV_VARS},AUTH_SERVICE_URL=${AUTH_SERVICE_URL}"
[ -n "${MEDIA_SERVICE_URL}" ] && ENV_VARS="${ENV_VARS},MEDIA_SERVICE_URL=${MEDIA_SERVICE_URL}"

gcloud run deploy ${SERVICE_NAME} \
  --image="${IMAGE_NAME}:${TAG}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=1Gi \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=60 \
  --cpu-boost \
  --execution-environment=gen2 \
  --set-env-vars="${ENV_VARS}" \
  --update-secrets="\
DATABASE_URL=pixiai-database-url:latest,\
JWT_SECRET=pixiai-jwt-secret:latest,\
GOOGLE_CLIENT_ID=pixiai-google-client-id:latest" \
  --quiet

# ── Step 7: Get deployed URL ──────────────────────
echo ""
echo "Step 7: Getting service URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region="${REGION}" \
  --format='value(status.url)')

# ── Done ──────────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅ Deploy Complete!"
echo "============================================"
echo "  Service URL : ${SERVICE_URL}"
echo "  Image       : ${IMAGE_NAME}:${TAG}"
echo ""
echo "  📋 Post-deploy checklist:"
echo "  1. Update BACKEND_URL to point to your deployed Rust aero-backend:"
echo "     gcloud run services update ${SERVICE_NAME} --region=${REGION} \\"
echo "       --update-env-vars='BACKEND_URL=https://your-aero-backend-url'"
echo ""
echo "  2. Check logs:"
echo "     gcloud logging read 'resource.type=cloud_run_revision' \\"
echo "       --project=${PROJECT_ID} --limit=50 --format='table(timestamp,textPayload)'"
echo ""
echo "  3. View service in console:"
echo "     https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/logs?project=${PROJECT_ID}"
echo "============================================"
