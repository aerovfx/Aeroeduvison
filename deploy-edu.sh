#!/bin/bash
set -euo pipefail

# ================================================================
# AeroEduVision — EDU Service Deploy to Cloud Run
# ================================================================
# Service:   edu
# Project:   extreme-lattice-491123-p2
# Region:    asia-southeast1
#
# App profile:
#   - Next.js 15 standalone, 193 routes, 3D labs, OCR, RAG, Prisma
#   - Heavy SSR + WebGL + MediaPipe → needs ≥4Gi RAM
#   - 2 CPU (no-throttling) + cpu-boost for fast cold start
#   - min-instances=1 → tránh cold start cho user
#   - concurrency=3 → mỗi instance xử lý tối đa 3 req đồng thời (giảm OOM risk)
#   - max-instances=5 → scale ngang khi load cao
#
# Usage:
#   bash deploy-edu.sh                  # Full build + deploy
#   bash deploy-edu.sh --skip-build     # Deploy only (reuse latest image)
# ================================================================

# ---- Configuration ----
PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="edu"
REPO_NAME="aeroedu"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"
DOCKERFILE="Dockerfile"

# ---- Secrets (export these before running, or source a local .env.production) ----
# Optional: source a local untracked env file (.env.production is in .gitignore)
[ -f .env.production ] && set -a && . ./.env.production && set +a
: "${DATABASE_URL:?Set DATABASE_URL — Neon connection string (pooler)}"
: "${DIRECT_DATABASE_URL:?Set DIRECT_DATABASE_URL — Neon direct connection}"
: "${NEXTAUTH_SECRET:?Set NEXTAUTH_SECRET — openssl rand -hex 32}"
: "${GOOGLE_CLIENT_ID:?Set GOOGLE_CLIENT_ID}"
: "${GOOGLE_CLIENT_SECRET:?Set GOOGLE_CLIENT_SECRET}"
: "${OPENROUTER_API_KEY:?Set OPENROUTER_API_KEY}"
: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY}"

# ---- Parse args ----
SKIP_BUILD=false
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
  esac
done

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       AeroEduVision — EDU Cloud Run Deploy           ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Service:    ${SERVICE_NAME}                                  ║"
echo "║  Project:    ${PROJECT_ID}         ║"
echo "║  Region:     ${REGION}                     ║"
echo "║  Dockerfile: ${DOCKERFILE}                           ║"
printf "║  Image:      .../${SERVICE_NAME}:%-24s ║\n" "${TAG}"
echo "║  Resources:  2 CPU (boost) / 4Gi / gen2             ║"
echo "║  Scaling:    min=1, max=5, concurrency=3              ║"
echo "║  Access:     Public                                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ================================================================
# Step 0: Check Docker Desktop
# ================================================================
echo "▶ Step 0: Checking Docker Desktop..."
if ! docker info >/dev/null 2>&1; then
  echo "  ❌ Docker is not running!"
  echo "  → Start Docker Desktop first."
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
  if gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker \
    --location=${REGION} \
    --project=${PROJECT_ID} \
    --description="AeroEduVision Docker images" 2>&1; then
    echo "  ✅ Repo created"
  else
    if gcloud artifacts repositories describe ${REPO_NAME} \
      --location=${REGION} \
      --project=${PROJECT_ID} >/dev/null 2>&1; then
      echo "  ✅ Repo '${REPO_NAME}' confirmed (already exists)"
    else
      echo "  ❌ Failed to create/access repo."
      echo "  → Check billing: https://console.cloud.google.com/billing/enable?project=${PROJECT_ID}"
      exit 1
    fi
  fi
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
  echo "  Memory:     14g  (Docker Desktop limit)"
  echo "  shm-size:   2g   (prevents OOM during Next.js SSG)"
  echo "  Node heap:  7168MB (set in Dockerfile ENV)"
  echo ""

  BUILD_START=$(date +%s)

  docker buildx build \
    --platform linux/amd64 \
    --load \
    --shm-size=2g \
    --memory=14g \
    --progress=plain \
    -t ${IMAGE_NAME}:${TAG} \
    -t ${IMAGE_NAME}:latest \
    -f ${DOCKERFILE} \
    .

  BUILD_STATUS=$?
  BUILD_END=$(date +%s)
  BUILD_TIME=$((BUILD_END - BUILD_START))

  if [ $BUILD_STATUS -ne 0 ]; then
    echo ""
    echo "  ❌ BUILD FAILED after ${BUILD_TIME}s"
    echo "  → Check Dockerfile and try again"
    exit 1
  fi

  # Show image size
  IMAGE_SIZE=$(docker image inspect ${IMAGE_NAME}:latest --format='{{.Size}}' \
    | awk '{printf "%.0f", $1/1024/1024}')
  echo ""
  echo "  ✅ Image built in ${BUILD_TIME}s → ${IMAGE_NAME}:${TAG}"
  echo "  📦 Image size: ${IMAGE_SIZE}MB"
fi

# ================================================================
# Step 5: Push to Artifact Registry
# ================================================================
echo ""
if [ "$SKIP_BUILD" = true ]; then
  echo "▶ Step 5: SKIPPED (--skip-build flag) — không cần push image"
  echo "  ✅ Sẽ update config trực tiếp trên service đang chạy"
else
  echo "▶ Step 5: Pushing image to Artifact Registry..."
  docker push ${IMAGE_NAME}:${TAG}
  docker push ${IMAGE_NAME}:latest
  echo "  ✅ Image pushed"
fi

# ================================================================
# Step 6: Deploy to Cloud Run
# ================================================================
echo ""
echo "▶ Step 6: Deploying '${SERVICE_NAME}' to Cloud Run..."
echo "  ┌────────────────────────────────────────────────┐"
echo "  │  CPU:           2 (no-throttling + cpu-boost)  │"
echo "  │  Memory:        4Gi                            │"
echo "  │  Min instances: 1 (always warm, no cold start) │"
echo "  │  Max instances: 5                              │"
echo "  │  Concurrency:   3 req/instance                 │"
echo "  │  Timeout:       300s                           │"
echo "  │  Gen:           gen2                           │"
echo "  │  Access:        Public (unauthenticated)       │"
echo "  └────────────────────────────────────────────────┘"

# Khi --skip-build: chỉ update config + env vars, giữ nguyên image đang chạy
if [ "$SKIP_BUILD" = true ]; then
  echo "  → Updating config only (giữ nguyên image hiện tại)..."
  gcloud run services update ${SERVICE_NAME} \
    --region=${REGION} \
    --project=${PROJECT_ID} \
    --cpu=2 \
    --memory=4Gi \
    --min-instances=1 \
    --max-instances=5 \
    --concurrency=3 \
    --timeout=300 \
    --no-cpu-throttling \
    --cpu-boost \
    --execution-environment=gen2 \
    --set-env-vars="\
NODE_ENV=production,\
NEXT_TELEMETRY_DISABLED=1,\
HOSTNAME=0.0.0.0,\
SKIP_ENV_VALIDATION=1,\
NODE_OPTIONS=--max-old-space-size=3072,\
DATABASE_URL=${DATABASE_URL},\
DIRECT_DATABASE_URL=${DIRECT_DATABASE_URL},\
NEXTAUTH_SECRET=${NEXTAUTH_SECRET},\
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},\
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},\
OPENROUTER_API_KEY=${OPENROUTER_API_KEY},\
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY},\
GOOGLE_CLOUD_PROJECT=gen-lang-client-0712182643,\
NEXT_PUBLIC_TRACKING_SERVER_URL=wss://vision-tracking-server-1069154179448.us-central1.run.app/ws/tracking" \
    --quiet
  echo "  ✅ Config updated"
  # Step 7 không cần thiết khi skip-build (NEXTAUTH_URL giữ nguyên)
  echo ""
  SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region=${REGION} --project=${PROJECT_ID} \
    --format='value(status.url)')
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║          ✅  Config Update Complete!                 ║"
  echo "╚══════════════════════════════════════════════════════╝"
  echo ""
  echo "  URL: ${SERVICE_URL}"
  echo ""
  exit 0
fi

gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME}:${TAG} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --cpu=2 \
  --memory=4Gi \
  --min-instances=1 \
  --max-instances=5 \
  --concurrency=3 \
  --timeout=300 \
  --no-cpu-throttling \
  --cpu-boost \
  --execution-environment=gen2 \
  --set-env-vars="\
NODE_ENV=production,\
NEXT_TELEMETRY_DISABLED=1,\
HOSTNAME=0.0.0.0,\
SKIP_ENV_VALIDATION=1,\
NODE_OPTIONS=--max-old-space-size=3072,\
DATABASE_URL=${DATABASE_URL},\
DIRECT_DATABASE_URL=${DIRECT_DATABASE_URL},\
NEXTAUTH_SECRET=${NEXTAUTH_SECRET},\
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},\
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},\
OPENROUTER_API_KEY=${OPENROUTER_API_KEY},\
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY},\
GOOGLE_CLOUD_PROJECT=gen-lang-client-0712182643,\
NEXT_PUBLIC_TRACKING_SERVER_URL=wss://vision-tracking-server-1069154179448.us-central1.run.app/ws/tracking" \
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
echo "║            ✅  EDU Deploy Complete!                  ║"
echo "╠══════════════════════════════════════════════════════╣"
echo ""
echo "  Service:     ${SERVICE_NAME}"
echo "  URL:         ${SERVICE_URL}"
echo "  Image:       ${IMAGE_NAME}:${TAG}"
echo "  Region:      ${REGION}"
echo "  Resources:   2 CPU (no-throttling + boost) / 4Gi RAM"
echo "  Scaling:     min=1 → max=5 instances (concurrency=3)"
echo "  Access:      Public"
echo ""
echo "╠══════════════════════════════════════════════════════╣"
echo "║  ⚠️  POST-DEPLOY — Set secrets (chạy lệnh này):     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  gcloud run services update ${SERVICE_NAME} \\"
echo "    --region=${REGION} \\"
echo "    --project=${PROJECT_ID} \\"
echo "    --set-env-vars='\\"
echo "      DATABASE_URL=postgresql://...,\\"
echo "      NEXTAUTH_SECRET=your-secret,\\"
echo "      GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com,\\"
echo "      GOOGLE_CLIENT_SECRET=GOCSPX-xxx,\\"
echo "      OPENROUTER_API_KEY=sk-or-v1-xxx,\\"
echo "      OPENAI_DEFAULT_MODEL=openai/gpt-4o-mini,\\"
echo "      OPENAI_VISION_MODEL=openai/gpt-4o'"
echo ""
echo "  ℹ️  RAG/OCR chạy qua OpenRouter (không cần Qdrant / Ollama / Python OCR):"
echo "     Chat model:   openai/gpt-4o-mini (rẻ, nhanh)"
echo "     Vision/OCR:   openai/gpt-4o      (grading, document scan)"
echo "     Alternative:  anthropic/claude-3-5-haiku (backup khi GPT quota hết)"
echo ""
echo "  📌 OAuth redirect URIs (Google Cloud Console):"
echo "     Origin:   ${SERVICE_URL}"
echo "     Redirect: ${SERVICE_URL}/api/auth/callback/google"
echo ""
echo "  📌 Map custom domain (nếu cần):"
echo "     gcloud beta run domain-mappings create \\"
echo "       --service=${SERVICE_NAME} --domain=inphysic.com \\"
echo "       --region=${REGION} --project=${PROJECT_ID}"
echo ""
