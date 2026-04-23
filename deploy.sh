#!/bin/bash
# ============================================================
# AeroEduVision — Unified Deploy Script
# Deploys : pixiai-auth (Rust, optional) + pixiai (Vite frontend)
# Target  : Google Cloud Run (asia-southeast1)
# Usage   : bash deploy.sh                 # deploys both services
#           bash deploy.sh --frontend-only # skip Rust auth-service
#           bash deploy.sh --skip-auth     # alias of --frontend-only
#
# OAuth notes
# -----------
# Vite bakes VITE_* vars into the JS bundle at BUILD time. This script
# reads `pixiai-google-client-id` from Secret Manager and passes it to
# `docker buildx build` as --build-arg VITE_GOOGLE_CLIENT_ID=... so the
# Google Sign-In button can render on the deployed site.
# ============================================================
set -euo pipefail

# ── Configuration ────────────────────────────────────────────
PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
REPO_NAME="aeroedu"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
SERVICE_NAME="pixiai"
AUTH_SERVICE_NAME="pixiai-auth"
TAG="$(date +%Y%m%d-%H%M%S)"

# Parse flags
DEPLOY_AUTH=1
for arg in "$@"; do
  case "${arg}" in
    --frontend-only|--skip-auth) DEPLOY_AUTH=0 ;;
    -h|--help)
      echo "Usage: bash deploy.sh [--frontend-only]"
      exit 0
      ;;
  esac
done

# ── Colors / loggers ─────────────────────────────────────────
BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BLUE='\033[0;34m'; DIM='\033[2m'; NC='\033[0m'
log()  { echo -e "\n${BOLD}${BLUE}▶ $*${NC}"; }
ok()   { echo -e "  ${GREEN}✅ $*${NC}"; }
warn() { echo -e "  ${YELLOW}⚠️  $*${NC}"; }
die()  { echo -e "\n${RED}❌ $*${NC}"; exit 1; }

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║   AeroEduVision — Cloud Run Deploy   ║"
echo "  ║   Service: ${SERVICE_NAME}                  ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── 0. Preflight ─────────────────────────────────────────────
log "Preflight checks"
docker info >/dev/null 2>&1 || die "Docker is not running — start Docker Desktop first."
ok "Docker running"

command -v gcloud >/dev/null 2>&1 || die "gcloud CLI not found."
gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project "${PROJECT_ID}" --quiet
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
ok "gcloud authenticated (project: ${PROJECT_ID})"

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com \
  --quiet 2>/dev/null || true
ok "GCP APIs enabled"

gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker --location="${REGION}" \
    --description="AeroEduVision Docker images" --quiet
ok "Artifact Registry ready"

# ── 1. Ensure secrets ────────────────────────────────────────
log "Ensuring secrets in Secret Manager"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

ensure_secret() {
  # ensure_secret <name> [<default_value>] [--auto-hex]
  local name="$1" value="${2:-}" auto_hex="${3:-}"
  if ! gcloud secrets describe "${name}" --project="${PROJECT_ID}" &>/dev/null; then
    if [ -z "${value}" ] && [ "${auto_hex}" = "--auto-hex" ]; then
      value=$(openssl rand -hex 32)
    fi
    if [ -z "${value}" ]; then
      die "Secret ${name} không tồn tại. Chạy setup-cloudrun-secrets.sh trước."
    fi
    printf '%s' "${value}" | gcloud secrets create "${name}" \
      --data-file=- --replication-policy=automatic --project="${PROJECT_ID}" --quiet
    echo -e "  ${GREEN}✅ Created:${NC} ${name}"
  else
    echo -e "  ${DIM}↑ Exists  :${NC} ${name}"
  fi
  gcloud secrets add-iam-policy-binding "${name}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
}

# JWT secret can be auto-generated if missing
ensure_secret "pixiai-jwt-secret" "" --auto-hex
# Database + Google OAuth — must exist (created by setup-cloudrun-secrets.sh)
ensure_secret "pixiai-database-url"
ensure_secret "pixiai-google-client-id"
# Google client secret — used by server-side OAuth exchange if/when enabled
gcloud secrets describe "pixiai-google-client-secret" --project="${PROJECT_ID}" &>/dev/null \
  && ensure_secret "pixiai-google-client-secret" \
  || warn "pixiai-google-client-secret not found (OK if only using GSI id_token flow)"

# ── 2. Fetch Google Client ID for BUILD-TIME injection ───────
log "Fetching VITE_GOOGLE_CLIENT_ID from Secret Manager"
# Vite bakes VITE_* into the JS bundle at build time — cannot be set at runtime.
VITE_GOOGLE_CLIENT_ID=$(gcloud secrets versions access latest \
  --secret="pixiai-google-client-id" --project="${PROJECT_ID}" 2>/dev/null || echo "")
if [ -z "${VITE_GOOGLE_CLIENT_ID}" ]; then
  die "Không đọc được pixiai-google-client-id. Chạy setup-cloudrun-secrets.sh trước."
fi
if ! echo "${VITE_GOOGLE_CLIENT_ID}" | grep -q "\.apps\.googleusercontent\.com$"; then
  warn "VITE_GOOGLE_CLIENT_ID format khác thường (không kết thúc .apps.googleusercontent.com)"
fi
ok "Google Client ID loaded (${#VITE_GOOGLE_CLIENT_ID} chars)"

# ── 3. Build & deploy Rust auth-service (optional) ───────────
AUTH_SERVICE_URL=""
if [ "${DEPLOY_AUTH}" = "1" ] && [ -f "rust-services/auth-service/Dockerfile" ]; then
  log "Building Rust auth-service (${AUTH_SERVICE_NAME})"
  echo -e "  ${DIM}First build ~10-15 min (Rust compile). Subsequent builds ~3 min (cached).${NC}"

  AUTH_IMAGE="${REGISTRY}/pixiai-auth"
  docker buildx build \
    --platform linux/amd64 \
    --load \
    -t "${AUTH_IMAGE}:${TAG}" \
    -t "${AUTH_IMAGE}:latest" \
    -f rust-services/auth-service/Dockerfile \
    rust-services/auth-service \
    || die "Rust auth-service build failed."
  ok "Auth image built"

  docker push "${AUTH_IMAGE}:${TAG}"
  docker push "${AUTH_IMAGE}:latest"
  ok "Auth image pushed"

  log "Deploying ${AUTH_SERVICE_NAME} to Cloud Run"
  gcloud run deploy "${AUTH_SERVICE_NAME}" \
    --image="${AUTH_IMAGE}:${TAG}" \
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

  AUTH_SERVICE_URL=$(gcloud run services describe "${AUTH_SERVICE_NAME}" \
    --region="${REGION}" --project="${PROJECT_ID}" \
    --format='value(status.url)')
  ok "${AUTH_SERVICE_NAME} deployed: ${AUTH_SERVICE_URL}"
else
  warn "Skipping Rust auth-service — frontend will use built-in Node.js auth (server.cjs)"
fi

# ── 4. Build Vite frontend (with OAuth baked in) ─────────────
log "Building Vite frontend (${SERVICE_NAME})"
FRONTEND_IMAGE="${REGISTRY}/${SERVICE_NAME}"

echo -e "  ${DIM}Pre-pulling node:20-slim...${NC}"
for i in 1 2 3; do
  docker pull --platform linux/amd64 node:20-slim && break
  [ "${i}" = "3" ] && die "Could not pull node:20-slim after 3 attempts."
  sleep 10
done

# NOTE: VITE_GOOGLE_CLIENT_ID must be injected HERE so Google Sign-In button renders.
docker buildx build \
  --platform linux/amd64 \
  --pull=false \
  --load \
  --build-arg "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" \
  --build-arg "VITE_API_URL=" \
  --build-arg "VITE_WS_URL=" \
  --build-arg "VITE_APP_URL=" \
  -t "${FRONTEND_IMAGE}:${TAG}" \
  -t "${FRONTEND_IMAGE}:latest" \
  -f Dockerfile \
  . \
  || die "Frontend build failed."
ok "Frontend image built"

echo -e "  ${DIM}Running smoke test...${NC}"
CID=$(docker run -d --rm -p 18080:8080 -e PORT=8080 "${FRONTEND_IMAGE}:${TAG}")
sleep 4
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18080/ || echo "000")
docker stop "${CID}" >/dev/null 2>&1 || true
[ "${STATUS}" = "000" ] && die "Container smoke test failed (no response)."
ok "Smoke test passed (HTTP ${STATUS})"

docker push "${FRONTEND_IMAGE}:${TAG}"
docker push "${FRONTEND_IMAGE}:latest"
ok "Frontend image pushed"

# ── 5. Deploy Vite frontend ──────────────────────────────────
log "Deploying ${SERVICE_NAME} (frontend) to Cloud Run"

# Pick up optional media service URL if deployed
MEDIA_SERVICE_URL=""
if gcloud run services describe "pixiai-media" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  MEDIA_SERVICE_URL=$(gcloud run services describe "pixiai-media" \
    --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
  ok "pixiai-media found: ${MEDIA_SERVICE_URL}"
else
  warn "pixiai-media not deployed — media routes will fallback to aero-backend"
fi

# Runtime env vars. AUTH_SERVICE_URL only included when Rust service is deployed;
# otherwise server.cjs activates its built-in Node.js auth (Google tokeninfo flow).
ENV_VARS="NODE_ENV=production"
[ -n "${AUTH_SERVICE_URL}" ]  && ENV_VARS="${ENV_VARS},AUTH_SERVICE_URL=${AUTH_SERVICE_URL}"
[ -n "${MEDIA_SERVICE_URL}" ] && ENV_VARS="${ENV_VARS},MEDIA_SERVICE_URL=${MEDIA_SERVICE_URL}"

gcloud run deploy "${SERVICE_NAME}" \
  --image="${FRONTEND_IMAGE}:${TAG}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
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
NEXTAUTH_SECRET=pixiai-jwt-secret:latest,\
GOOGLE_CLIENT_ID=pixiai-google-client-id:latest" \
  --quiet

FRONTEND_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format='value(status.url)')
ok "${SERVICE_NAME} deployed: ${FRONTEND_URL}"

# ── 6. OAuth post-deploy reminder ────────────────────────────
log "OAuth — post-deploy configuration"
echo -e "  ${BOLD}Mở Google Cloud Console → APIs & Services → Credentials${NC}"
echo -e "  ${DIM}https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}${NC}"
echo ""
echo -e "  Chỉnh OAuth 2.0 Client tương ứng với client-id đã dùng và thêm:"
echo ""
echo -e "  ${BOLD}Authorized JavaScript origins${NC} (cần cho Google Identity Services / GSI):"
echo -e "    • ${FRONTEND_URL}"
echo ""
echo -e "  ${BOLD}Authorized redirect URIs${NC} (nếu dùng OAuth code flow, không bắt buộc cho id_token flow):"
echo -e "    • ${FRONTEND_URL}/api/auth/callback/google"
echo ""
echo -e "  ${DIM}Lưu ý: GSI id_token flow (đang dùng) chỉ cần origin — không cần redirect URI.${NC}"

# ── Done ─────────────────────────────────────────────────────
echo -e "\n${BOLD}${GREEN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║        ✅  Deploy complete!          ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${BOLD}Frontend :${NC} ${FRONTEND_URL}"
[ -n "${AUTH_SERVICE_URL}" ] && echo -e "  ${BOLD}Auth API :${NC} ${AUTH_SERVICE_URL}"
echo -e "  ${BOLD}Tag      :${NC} ${TAG}"
echo ""
echo -e "  ${DIM}Kiểm tra health:${NC}"
echo -e "  ${DIM}  curl ${FRONTEND_URL}/${NC}"
[ -n "${AUTH_SERVICE_URL}" ] && echo -e "  ${DIM}  curl ${AUTH_SERVICE_URL}/health${NC}"
echo ""
echo -e "  ${DIM}Xem logs:${NC}"
echo -e "  ${DIM}  gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=\"${SERVICE_NAME}\"' \\${NC}"
echo -e "  ${DIM}    --project=${PROJECT_ID} --limit=30 --format='table(timestamp,textPayload)'${NC}"
echo ""
