#!/bin/bash
set -euo pipefail

# ================================================================
# AeroEduVision — DEMO Deploy to Cloud Run
# ================================================================
# Service:   demo
# Project:   extreme-lattice-491123-p2
# Region:    asia-southeast1
# Container: Demo (CPU throttled, 2Gi RAM, max 2 instances)
# ================================================================
# Usage:
#   bash deploy-demo.sh                  # Build + Deploy (dùng Dockerfile.demo)
#   bash deploy-demo.sh --skip-build     # Deploy only (reuse latest image)
#   bash deploy-demo.sh --production     # Use Dockerfile.production (Alpine)
#   bash deploy-demo.sh --standard       # Use Dockerfile (Debian slim)
# ================================================================

# ---- Configuration ----
PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="demo"
REPO_NAME="aeroedu"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"

# ---- Parse args ----
SKIP_BUILD=false
DOCKERFILE="Dockerfile.demo"
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --production) DOCKERFILE="Dockerfile.production" ;;
    --standard)   DOCKERFILE="Dockerfile" ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   AeroEduVision — DEMO Cloud Run Deploy      ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Service:    ${SERVICE_NAME}                          ║"
echo "║  Project:    ${PROJECT_ID}   ║"
echo "║  Region:     ${REGION}               ║"
echo "║  Dockerfile: ${DOCKERFILE}                     ║"
echo "║  Image:      .../${SERVICE_NAME}:${TAG}        ║"
echo "║  Resources:  CPU-throttled / 2Gi / max 2    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ================================================================
# Step 0: Check Docker Desktop
# ================================================================
echo "▶ Step 0: Checking Docker Desktop..."
if ! docker info >/dev/null 2>&1; then
  echo "  ❌ Docker is not running!"
  echo "  → Start Docker Desktop first."
  echo "  → Settings → General → ✅ Rosetta for x86_64/amd64"
  echo "  → Settings → Resources → Memory: 12-16GB, Swap: 4GB"
  exit 1
fi
echo "  ✅ Docker is running"

# ================================================================
# Step 1: Authenticate with gcloud
# ================================================================
echo ""
echo "▶ Step 1: Authenticating with gcloud..."
gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project ${PROJECT_ID} --quiet
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo "  ✅ Authenticated → Project: ${PROJECT_ID}"

# ================================================================
# Step 2: Enable required GCP APIs
# ================================================================
echo ""
echo "▶ Step 2: Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  --project=${PROJECT_ID} \
  --quiet 2>/dev/null || true
echo "  ✅ APIs enabled"

# ================================================================
# Step 3: Create/verify Artifact Registry
# ================================================================
echo ""
echo "▶ Step 3: Verifying Artifact Registry repo '${REPO_NAME}'..."
if gcloud artifacts repositories describe ${REPO_NAME} \
  --location=${REGION} \
  --project=${PROJECT_ID} >/dev/null 2>&1; then
  echo "  ✅ Repo '${REPO_NAME}' already exists"
else
  echo "  → Creating repo '${REPO_NAME}'..."
  gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --project=${PROJECT_ID} \
    --description="AeroEduVision Docker images" 2>&1 || {
    # If create fails because repo already exists (race condition), that's OK
    if gcloud artifacts repositories describe ${REPO_NAME} \
      --location=${REGION} \
      --project=${PROJECT_ID} >/dev/null 2>&1; then
      echo "  ✅ Repo '${REPO_NAME}' already exists (confirmed)"
    else
      echo "  ❌ Failed to create repo. Check billing & permissions."
      echo "  → https://console.cloud.google.com/billing/enable?project=${PROJECT_ID}"
      exit 1
    fi
  }
  echo "  ✅ Repo ready"
fi

# ================================================================
# Step 4: Build Docker image locally
# ================================================================
if [ "$SKIP_BUILD" = true ]; then
  echo ""
  echo "▶ Step 4: SKIPPED (--skip-build flag)"
  echo "  → Using existing image: ${IMAGE_NAME}:latest"
  TAG="latest"
else
  echo ""
  echo "▶ Step 4: Building Docker image locally..."
  echo "  Platform:   linux/amd64"
  echo "  Dockerfile: ${DOCKERFILE}"
  echo "  Builder:    Docker Desktop + Rosetta (BuildKit)"
  echo ""

  BUILD_START=$(date +%s)

  docker buildx build \
    --platform linux/amd64 \
    --load \
    -t ${IMAGE_NAME}:${TAG} \
    -t ${IMAGE_NAME}:latest \
    -f ${DOCKERFILE} \
    .

  BUILD_END=$(date +%s)
  BUILD_TIME=$((BUILD_END - BUILD_START))
  echo ""
  echo "  ✅ Image built in ${BUILD_TIME}s → ${IMAGE_NAME}:${TAG}"
fi

# ================================================================
# Step 5: Push to Artifact Registry
# ================================================================
echo ""
echo "▶ Step 5: Pushing image to Artifact Registry..."
docker push ${IMAGE_NAME}:${TAG}
if [ "$TAG" != "latest" ]; then
  docker push ${IMAGE_NAME}:latest
fi
echo "  ✅ Image pushed"

# ================================================================
# Step 6: Deploy to Cloud Run — DEMO (minimal resources)
# ================================================================
echo ""
echo "▶ Step 6: Deploying '${SERVICE_NAME}' to Cloud Run..."
echo "  ┌──────────────────────────────────────┐"
echo "  │  CPU:           1 (throttled)        │"
echo "  │  Memory:        2Gi                  │"
echo "  │  Min instances: 0 (scale to zero)    │"
echo "  │  Max instances: 2                    │"
echo "  │  Concurrency:   10                   │"
echo "  │  Timeout:       300s                 │"
echo "  │  Gen:           gen2                 │"
echo "  └──────────────────────────────────────┘"

gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME}:${TAG} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --cpu=1 \
  --memory=2Gi \
  --min-instances=0 \
  --max-instances=2 \
  --concurrency=10 \
  --timeout=300 \
  --cpu-throttling \
  --no-cpu-boost \
  --execution-environment=gen2 \
  --set-env-vars="\
NODE_ENV=production,\
NEXT_TELEMETRY_DISABLED=1,\
HOSTNAME=0.0.0.0,\
SKIP_ENV_VALIDATION=1" \
  --quiet

echo "  ✅ Service deployed"

# ================================================================
# Step 7: Get service URL + configure NEXTAUTH_URL
# ================================================================
echo ""
echo "▶ Step 7: Configuring NEXTAUTH_URL..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format='value(status.url)')

gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --update-env-vars="NEXTAUTH_URL=${SERVICE_URL}" \
  --quiet

echo "  ✅ NEXTAUTH_URL = ${SERVICE_URL}"

# ================================================================
# Done!
# ================================================================
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║            ✅ DEMO Deploy Complete!                   ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "  Service:     ${SERVICE_NAME}"
echo "  URL:         ${SERVICE_URL}"
echo "  Image:       ${IMAGE_NAME}:${TAG}"
echo "  Region:      ${REGION}"
echo "  Resources:   1 CPU (throttled) / 2Gi RAM"
echo "  Scaling:     0 → 2 instances"
echo "║                                                      ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  ⚠️  POST-DEPLOY — Set secrets:                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  gcloud run services update ${SERVICE_NAME} \\"
echo "    --region=${REGION} \\"
echo "    --project=${PROJECT_ID} \\"
echo "    --set-env-vars='\\"
echo "      DATABASE_URL=postgresql://...,' \\"
echo "      NEXTAUTH_SECRET=your-secret,\\"
echo "      GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com,\\"
echo "      GOOGLE_CLIENT_SECRET=GOCSPX-xxx,\\"
echo "      OPENAI_API_KEY=sk-xxx,\\"
echo "      OPENAI_BASE_URL=https://api.openai.com/v1,\\"
echo "      OPENAI_DEFAULT_MODEL=gpt-4o-mini'"
echo ""
echo "  📌 OAuth redirect URIs (Google Cloud Console):"
echo "     Origin:   ${SERVICE_URL}"
echo "     Redirect: ${SERVICE_URL}/api/auth/callback/google"
echo ""
