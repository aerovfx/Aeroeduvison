#!/bin/bash
# ============================================================
# deploy-rust-services.sh
# Build & deploy Rust microservices to Cloud Run, then update
# the Vite frontend (pixiai) with the correct service URLs.
#
# Services deployed:
#   pixiai-auth    — /api/auth/*
#   pixiai-media   — /api/questions, /api/exams, /api/media, /api/documents, /api/exam-matrices
#   pixiai-teacher — /api/teacher/*
#
# Usage:
#   bash deploy-rust-services.sh             # deploy all 3
#   bash deploy-rust-services.sh auth        # deploy only auth
#   bash deploy-rust-services.sh media       # deploy only media
#   bash deploy-rust-services.sh teacher     # deploy only teacher
# ============================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
REPO_NAME="aeroedu"
FRONTEND_SERVICE="pixiai"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# ── Which services to deploy ──────────────────────────────────
DEPLOY_AUTH=false
DEPLOY_MEDIA=false
DEPLOY_TEACHER=false

if [ $# -eq 0 ]; then
  DEPLOY_AUTH=true; DEPLOY_MEDIA=true; DEPLOY_TEACHER=true
else
  for arg in "$@"; do
    case "$arg" in
      auth)    DEPLOY_AUTH=true ;;
      media)   DEPLOY_MEDIA=true ;;
      teacher) DEPLOY_TEACHER=true ;;
      *) echo -e "${RED}Unknown service: $arg. Use: auth, media, teacher${NC}"; exit 1 ;;
    esac
  done
fi

TAG="$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Rust Services → Cloud Run${NC}"
echo -e "${BLUE}  Auth: ${DEPLOY_AUTH}  |  Media: ${DEPLOY_MEDIA}  |  Teacher: ${DEPLOY_TEACHER}${NC}"
echo -e "${BLUE}============================================================${NC}"

# ── Pre-flight ────────────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker not running. Start Docker Desktop first.${NC}"; exit 1
fi
gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project ${PROJECT_ID} --quiet
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

# Ensure Artifact Registry repo
gcloud artifacts repositories describe ${REPO_NAME} --location=${REGION} >/dev/null 2>&1 || \
  gcloud artifacts repositories create ${REPO_NAME} \
    --repository-format=docker --location=${REGION} --quiet

PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# ── Helper: ensure secret exists and SA has access ───────────
grant_secret() {
  local secret="$1"
  gcloud secrets add-iam-policy-binding "${secret}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
}

# ── Helper: build + push a service ───────────────────────────
build_and_push() {
  local svc_name="$1"        # e.g. pixiai-auth
  local dockerfile_dir="$2"  # e.g. rust-services/auth-service
  local image="${REGISTRY}/${svc_name}:${TAG}"

  echo -e "\n${YELLOW}Building ${svc_name}...${NC}"
  echo -e "  ${BLUE}(rust:1.88-slim — first build ~10 min, cached later)${NC}"

  docker buildx build \
    --no-cache \
    --platform linux/amd64 \
    --load \
    -t "${image}" \
    -t "${REGISTRY}/${svc_name}:latest" \
    -f "${dockerfile_dir}/Dockerfile" \
    "${dockerfile_dir}" || { echo -e "${RED}❌ Build failed for ${svc_name}${NC}"; return 1; }

  docker push "${image}"
  docker push "${REGISTRY}/${svc_name}:latest"
  echo -e "${GREEN}✅ Pushed: ${image}${NC}"
  echo "${image}"
}

# ── Helper: get deployed service URL ─────────────────────────
get_url() {
  local svc="$1"
  gcloud run services describe "${svc}" \
    --region="${REGION}" --project="${PROJECT_ID}" \
    --format='value(status.url)' 2>/dev/null || echo ""
}

# ── Deploy functions ──────────────────────────────────────────
AUTH_URL=""
MEDIA_URL=""
TEACHER_URL=""

deploy_auth() {
  echo -e "\n${CYAN}━━━━━━ AUTH SERVICE ━━━━━━${NC}"

  # Ensure JWT secret
  if ! gcloud secrets describe "pixiai-jwt-secret" --project="${PROJECT_ID}" &>/dev/null; then
    openssl rand -hex 32 | gcloud secrets create "pixiai-jwt-secret" \
      --data-file=- --replication-policy=automatic --project="${PROJECT_ID}" --quiet
    echo -e "  ${GREEN}Created:${NC} pixiai-jwt-secret"
  fi
  grant_secret "pixiai-jwt-secret"
  grant_secret "pixiai-database-url"
  grant_secret "pixiai-google-client-id"

  local image
  image=$(build_and_push "pixiai-auth" "rust-services/auth-service")

  gcloud run deploy pixiai-auth \
    --image="${image}" \
    --region="${REGION}" --project="${PROJECT_ID}" \
    --platform=managed --allow-unauthenticated \
    --port=8080 --cpu=1 --memory=512Mi \
    --min-instances=0 --max-instances=5 \
    --concurrency=80 --timeout=30 --cpu-boost \
    --execution-environment=gen2 \
    --set-env-vars="RUST_LOG=auth_service=info,tower_http=info" \
    --update-secrets="DATABASE_URL=pixiai-database-url:latest,JWT_SECRET=pixiai-jwt-secret:latest,GOOGLE_CLIENT_ID=pixiai-google-client-id:latest" \
    --quiet

  AUTH_URL=$(get_url "pixiai-auth")
  echo -e "${GREEN}✅ Auth service: ${AUTH_URL}${NC}"
}

deploy_media() {
  echo -e "\n${CYAN}━━━━━━ MEDIA SERVICE ━━━━━━${NC}"
  grant_secret "pixiai-database-url"

  local image
  image=$(build_and_push "pixiai-media" "rust-services/media-service")

  gcloud run deploy pixiai-media \
    --image="${image}" \
    --region="${REGION}" --project="${PROJECT_ID}" \
    --platform=managed --allow-unauthenticated \
    --port=8080 --cpu=1 --memory=512Mi \
    --min-instances=0 --max-instances=5 \
    --concurrency=80 --timeout=60 --cpu-boost \
    --execution-environment=gen2 \
    --set-env-vars="RUST_LOG=media_service=info,tower_http=info" \
    --update-secrets="DATABASE_URL=pixiai-database-url:latest" \
    --quiet

  MEDIA_URL=$(get_url "pixiai-media")
  echo -e "${GREEN}✅ Media service: ${MEDIA_URL}${NC}"
}

deploy_teacher() {
  echo -e "\n${CYAN}━━━━━━ TEACHER SERVICE ━━━━━━${NC}"
  grant_secret "pixiai-database-url"
  grant_secret "pixiai-jwt-secret"

  local image
  image=$(build_and_push "pixiai-teacher" "rust-services/teacher-service")

  gcloud run deploy pixiai-teacher \
    --image="${image}" \
    --region="${REGION}" --project="${PROJECT_ID}" \
    --platform=managed --allow-unauthenticated \
    --port=8080 --cpu=1 --memory=512Mi \
    --min-instances=0 --max-instances=5 \
    --concurrency=80 --timeout=60 --cpu-boost \
    --execution-environment=gen2 \
    --set-env-vars="RUST_LOG=teacher_service=info,tower_http=info" \
    --update-secrets="DATABASE_URL=pixiai-database-url:latest,JWT_SECRET=pixiai-jwt-secret:latest" \
    --quiet

  TEACHER_URL=$(get_url "pixiai-teacher")
  echo -e "${GREEN}✅ Teacher service: ${TEACHER_URL}${NC}"
}

# ── Run selected deployments ──────────────────────────────────
[ "${DEPLOY_AUTH}" = "true" ]    && deploy_auth
[ "${DEPLOY_MEDIA}" = "true" ]   && deploy_media
[ "${DEPLOY_TEACHER}" = "true" ] && deploy_teacher

# ── Get URLs for services not just deployed ───────────────────
[ -z "${AUTH_URL}" ]    && AUTH_URL=$(get_url "pixiai-auth")
[ -z "${MEDIA_URL}" ]   && MEDIA_URL=$(get_url "pixiai-media")
[ -z "${TEACHER_URL}" ] && TEACHER_URL=$(get_url "pixiai-teacher")

# ── Update frontend (pixiai) with all service URLs ────────────
echo -e "\n${YELLOW}Updating frontend service (${FRONTEND_SERVICE}) env vars...${NC}"

UPDATE_ENV=""
[ -n "${AUTH_URL}" ]    && UPDATE_ENV="${UPDATE_ENV}AUTH_SERVICE_URL=${AUTH_URL},"
[ -n "${MEDIA_URL}" ]   && UPDATE_ENV="${UPDATE_ENV}MEDIA_SERVICE_URL=${MEDIA_URL},"
[ -n "${TEACHER_URL}" ] && UPDATE_ENV="${UPDATE_ENV}TEACHER_SERVICE_URL=${TEACHER_URL},"

# Strip trailing comma
UPDATE_ENV="${UPDATE_ENV%,}"

if [ -n "${UPDATE_ENV}" ]; then
  gcloud run services update "${FRONTEND_SERVICE}" \
    --region="${REGION}" --project="${PROJECT_ID}" \
    --update-env-vars="${UPDATE_ENV}" \
    --quiet
  echo -e "${GREEN}✅ Frontend updated with: ${UPDATE_ENV}${NC}"
fi

# ── Summary ───────────────────────────────────────────────────
echo -e "\n${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✅ Deploy Complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
[ -n "${AUTH_URL}" ]    && echo -e "  Auth    : ${AUTH_URL}/health"
[ -n "${MEDIA_URL}" ]   && echo -e "  Media   : ${MEDIA_URL}/health"
[ -n "${TEACHER_URL}" ] && echo -e "  Teacher : ${TEACHER_URL}/health"
echo -e ""
echo -e "${YELLOW}Bước tiếp theo:${NC}"
echo -e "  Rebuild & redeploy Vite frontend để áp dụng code mới nhất:"
echo -e "  ${CYAN}bash quick-deploy.sh${NC}"
echo -e "${GREEN}============================================================${NC}"
