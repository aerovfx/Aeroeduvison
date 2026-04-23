#!/bin/bash
# ============================================================
# deploy-auth-service.sh
# Build & deploy Rust auth-service to Cloud Run (pixiai-auth)
# Then updates the Vite frontend service (pixiai) with AUTH_SERVICE_URL
# Usage: bash deploy-auth-service.sh
# ============================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
AUTH_SERVICE_NAME="pixiai-auth"
FRONTEND_SERVICE_NAME="pixiai"
REPO_NAME="aeroedu"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${AUTH_SERVICE_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Rust auth-service → Cloud Run Deploy${NC}"
echo -e "${BLUE}  Service: ${AUTH_SERVICE_NAME}${NC}"
echo -e "${BLUE}  Image  : ${IMAGE_NAME}:${TAG}${NC}"
echo -e "${BLUE}============================================================${NC}"

# ── Step 0: Check Docker ─────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker not running. Start Docker Desktop first.${NC}"
  exit 1
fi

# ── Step 1: Auth gcloud ──────────────────────────────────────
echo -e "\n${YELLOW}[1/6] Authenticating with gcloud...${NC}"
gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project ${PROJECT_ID}
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
echo -e "${GREEN}✅ Authenticated${NC}"

# ── Step 2: Ensure Artifact Registry repo exists ─────────────
echo -e "\n${YELLOW}[2/6] Verifying Artifact Registry (${REPO_NAME})...${NC}"
gcloud artifacts repositories describe ${REPO_NAME} \
  --location=${REGION} >/dev/null 2>&1 || \
gcloud artifacts repositories create ${REPO_NAME} \
  --repository-format=docker \
  --location=${REGION} \
  --description="AeroEduVision Docker images" \
  --quiet
echo -e "${GREEN}✅ Artifact Registry ready${NC}"

# ── Step 3: Ensure JWT secret exists ─────────────────────────
echo -e "\n${YELLOW}[3/6] Ensuring JWT secret exists...${NC}"
if ! gcloud secrets describe "pixiai-jwt-secret" --project="${PROJECT_ID}" &>/dev/null; then
  # Generate a new 32-byte hex JWT secret
  JWT_SECRET=$(openssl rand -hex 32)
  echo "${JWT_SECRET}" | gcloud secrets create "pixiai-jwt-secret" \
    --data-file=- \
    --replication-policy=automatic \
    --project="${PROJECT_ID}" --quiet
  echo -e "  ${GREEN}✅ Created:${NC} pixiai-jwt-secret"
else
  echo -e "  ${GREEN}↑ Exists:${NC} pixiai-jwt-secret"
fi

# Grant Cloud Run SA access
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding "pixiai-jwt-secret" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet >/dev/null
echo -e "  ${GREEN}✅ IAM: ${SA_EMAIL} → pixiai-jwt-secret${NC}"

# Also ensure DATABASE_URL secret exists (reuse from setup-cloudrun-secrets.sh)
for SECRET in "pixiai-database-url" "pixiai-google-client-id"; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
done
echo -e "${GREEN}✅ IAM permissions set${NC}"

# ── Step 4: Build Docker image ───────────────────────────────
echo -e "\n${YELLOW}[4/6] Building Rust auth-service Docker image...${NC}"
echo -e "   ${BLUE}(First build: ~8-15 min — Rust compile. Subsequent builds use cache.)${NC}"

# Build from the auth-service directory
for attempt in 1 2 3; do
  docker buildx build \
    --platform linux/amd64 \
    --load \
    -t ${IMAGE_NAME}:${TAG} \
    -t ${IMAGE_NAME}:latest \
    -f rust-services/auth-service/Dockerfile \
    rust-services/auth-service && break
  echo -e "   ⚠️  Build attempt ${attempt}/3 failed, retrying in 15s..."
  sleep 15
  if [ "${attempt}" = "3" ]; then
    echo -e "${RED}❌ Docker build failed after 3 attempts.${NC}"
    exit 1
  fi
done
echo -e "${GREEN}✅ Image built: ${IMAGE_NAME}:${TAG}${NC}"

# ── Step 5: Push image ───────────────────────────────────────
echo -e "\n${YELLOW}[5/6] Pushing to Artifact Registry...${NC}"
docker push ${IMAGE_NAME}:${TAG}
docker push ${IMAGE_NAME}:latest
echo -e "${GREEN}✅ Image pushed${NC}"

# ── Step 6: Deploy auth-service to Cloud Run ─────────────────
echo -e "\n${YELLOW}[6/6] Deploying ${AUTH_SERVICE_NAME} to Cloud Run...${NC}"

gcloud run deploy ${AUTH_SERVICE_NAME} \
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
  --timeout=30 \
  --cpu-boost \
  --execution-environment=gen2 \
  --set-env-vars="RUST_LOG=auth_service=info,tower_http=info" \
  --update-secrets="\
DATABASE_URL=pixiai-database-url:latest,\
JWT_SECRET=pixiai-jwt-secret:latest,\
GOOGLE_CLIENT_ID=pixiai-google-client-id:latest" \
  --quiet

# ── Get auth service URL ──────────────────────────────────────
AUTH_SERVICE_URL=$(gcloud run services describe ${AUTH_SERVICE_NAME} \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo -e "\n${GREEN}✅ Auth service deployed: ${AUTH_SERVICE_URL}${NC}"

# ── Update the frontend service (pixiai) with AUTH_SERVICE_URL ─
echo -e "\n${YELLOW}Updating frontend service (${FRONTEND_SERVICE_NAME}) with AUTH_SERVICE_URL...${NC}"
gcloud run services update ${FRONTEND_SERVICE_NAME} \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-env-vars="AUTH_SERVICE_URL=${AUTH_SERVICE_URL}" \
  --quiet

echo -e "\n${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✅ Auth service deploy complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo -e "  Auth service URL : ${AUTH_SERVICE_URL}"
echo -e "  Health check     : ${AUTH_SERVICE_URL}/health"
echo -e ""
echo -e "${YELLOW}📋 Bước tiếp theo:${NC}"
echo -e "  1. Test auth service trực tiếp:"
echo -e "     curl -X POST ${AUTH_SERVICE_URL}/api/auth/login \\"
echo -e "       -H 'Content-Type: application/json' \\"
echo -e "       -d '{\"email\":\"test@test.com\",\"password\":\"password123\"}'"
echo -e ""
echo -e "  2. Rebuild & deploy Vite frontend với code mới nhất:"
echo -e "     bash quick-deploy.sh"
echo -e ""
echo -e "  3. Test production login tại: https://inphysic.com/auth/login"
echo -e "${GREEN}============================================================${NC}"
