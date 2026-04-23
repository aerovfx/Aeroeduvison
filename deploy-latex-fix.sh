#!/usr/bin/env bash
# ============================================================
# deploy-latex-fix.sh — Fix 401 + 503 trên /teacher/latex-documents
#
# Không cần Docker local. Mọi thứ build trên Cloud Build.
#
# Bước 1: Deploy pixiai-latex Rust service lên Cloud Run
# Bước 2: Rebuild Vite frontend (code đã sửa auth) + cập nhật
#          LATEX_SERVICE_URL trên service pixiai
#
# Yêu cầu: gcloud CLI đã cài + đã đăng nhập
#   gcloud auth login
#   gcloud config set project extreme-lattice-491123-p2
#
# Chạy từ thư mục gốc của project:
#   bash deploy-latex-fix.sh
# ============================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
REPO_NAME="aeroedu"
FRONTEND_SERVICE="pixiai"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${CYAN}▶ $*${NC}"; }
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
die()  { echo -e "${RED}❌ $*${NC}"; exit 1; }

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  LaTeX Fix — Deploy pixiai-latex + rebuild frontend${NC}"
echo -e "${CYAN}  (Không cần Docker local — dùng Cloud Build)${NC}"
echo -e "${CYAN}============================================================${NC}"

# ── Sanity checks ─────────────────────────────────────────────
command -v gcloud >/dev/null 2>&1 || die "gcloud CLI chưa cài. Xem: https://cloud.google.com/sdk/docs/install"
[ -f "Dockerfile" ]                 || die "Chạy script này từ thư mục gốc project (có Dockerfile)."
[ -d "rust-services/latex-service" ] || die "Không tìm thấy rust-services/latex-service/"

gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project "${PROJECT_ID}" --quiet

ACCOUNT=$(gcloud config get-value account 2>/dev/null)
ok "Logged in as: ${ACCOUNT}  (project: ${PROJECT_ID})"

# ── Enable APIs (idempotent) ──────────────────────────────────
log "Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --quiet 2>/dev/null || true
ok "APIs enabled"

# ── Artifact Registry repo ────────────────────────────────────
log "Verifying Artifact Registry repo (${REPO_NAME})..."
gcloud artifacts repositories describe "${REPO_NAME}" \
  --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1 \
|| gcloud artifacts repositories create "${REPO_NAME}" \
     --repository-format=docker --location="${REGION}" \
     --description="AeroEduVision Docker images" \
     --project="${PROJECT_ID}" --quiet
ok "Artifact Registry ready"

# ── IAM: grant secret access to runtime + build SAs ──────────
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

grant_secret() {
  local secret="$1"
  if gcloud secrets describe "$secret" --project="${PROJECT_ID}" &>/dev/null; then
    for sa in "${COMPUTE_SA}" "${CLOUDBUILD_SA}"; do
      gcloud secrets add-iam-policy-binding "$secret" \
        --member="serviceAccount:${sa}" \
        --role="roles/secretmanager.secretAccessor" \
        --project="${PROJECT_ID}" --quiet >/dev/null 2>&1 || true
    done
    echo "    ✓ ${secret}"
  else
    warn "${secret} chưa tồn tại trong Secret Manager."
    warn "  Tạo: echo 'YOUR_VALUE' | gcloud secrets create ${secret} --data-file=-"
  fi
}

log "Granting secret access..."
grant_secret "pixiai-database-url"
grant_secret "pixiai-jwt-secret"
grant_secret "anthropic-api-key"

# ── IAM: Cloud Build quyền deploy Cloud Run ──────────────────
log "Ensuring Cloud Build has Cloud Run deploy permission..."
for role in "roles/run.admin" "roles/iam.serviceAccountUser" "roles/artifactregistry.writer"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUDBUILD_SA}" \
    --role="${role}" --condition=None --quiet >/dev/null 2>&1 || true
done
ok "IAM ready"

# ════════════════════════════════════════════════════════════
# BƯỚC 1: Build + deploy pixiai-latex (Rust) bằng Cloud Build
# ════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}━━━ Bước 1: Deploy pixiai-latex Rust service ━━━${NC}"

LATEX_TAG="$(date +%Y%m%d-%H%M%S)"
LATEX_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/pixiai-latex:${LATEX_TAG}"

log "Building pixiai-latex via Cloud Build (không cần Docker local)..."
log "Source: rust-services/latex-service/"
gcloud builds submit "rust-services/latex-service/" \
  --tag="${LATEX_IMAGE}" \
  --region="${REGION}" \
  --timeout=20m \
  --machine-type=E2_HIGHCPU_8

ok "Image pushed: ${LATEX_IMAGE}"

log "Deploying pixiai-latex to Cloud Run..."
gcloud run deploy pixiai-latex \
  --image="${LATEX_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=5 \
  --timeout=120 \
  --set-secrets="DATABASE_URL=pixiai-database-url:latest,NEXTAUTH_SECRET=pixiai-jwt-secret:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest" \
  --set-env-vars="ANTHROPIC_MODEL=claude-sonnet-4-6,RUST_LOG=latex_service=info" \
  --quiet

LATEX_URL=$(gcloud run services describe pixiai-latex \
  --region="${REGION}" --format='value(status.url)')
ok "pixiai-latex deployed: ${LATEX_URL}"

# Smoke test
log "Smoke-testing latex service health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${LATEX_URL}/health" || echo "000")
if [ "${HTTP_STATUS}" = "200" ]; then
  ok "Health check passed (HTTP 200)"
else
  warn "Health check returned HTTP ${HTTP_STATUS} — kiểm tra logs:"
  warn "  gcloud logging read 'resource.labels.service_name=pixiai-latex' --project=${PROJECT_ID} --limit=20"
fi

# ════════════════════════════════════════════════════════════
# BƯỚC 2: Rebuild Vite frontend + gắn LATEX_SERVICE_URL
# ════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}━━━ Bước 2: Rebuild Vite frontend (auth fix + LATEX_SERVICE_URL) ━━━${NC}"

FRONTEND_TAG="$(date +%Y%m%d-%H%M%S)"
FRONTEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${FRONTEND_SERVICE}:${FRONTEND_TAG}"

# Detect URLs của các Rust services đã deploy
AUTH_URL=""
MEDIA_URL=""

for svc in pixiai-auth; do
  if gcloud run services describe "${svc}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    AUTH_URL=$(gcloud run services describe "${svc}" --region="${REGION}" --format='value(status.url)')
    ok "Auth service: ${AUTH_URL}"
  else
    warn "pixiai-auth chưa deploy — auth sẽ dùng fallback Node.js"
  fi
done

for svc in pixiai-media; do
  if gcloud run services describe "${svc}" --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    MEDIA_URL=$(gcloud run services describe "${svc}" --region="${REGION}" --format='value(status.url)')
    ok "Media service: ${MEDIA_URL}"
  fi
done

log "Building Vite frontend via Cloud Build..."
gcloud builds submit . \
  --tag="${FRONTEND_IMAGE}" \
  --region="${REGION}" \
  --timeout=30m \
  --machine-type=E2_HIGHCPU_8

ok "Frontend image pushed: ${FRONTEND_IMAGE}"

# Build env-vars string
ENV_VARS="NODE_ENV=production,LATEX_SERVICE_URL=${LATEX_URL}"
[ -n "${AUTH_URL}" ]  && ENV_VARS="${ENV_VARS},AUTH_SERVICE_URL=${AUTH_URL}"
[ -n "${MEDIA_URL}" ] && ENV_VARS="${ENV_VARS},MEDIA_SERVICE_URL=${MEDIA_URL}"

log "Deploying ${FRONTEND_SERVICE} to Cloud Run..."
gcloud run deploy "${FRONTEND_SERVICE}" \
  --image="${FRONTEND_IMAGE}" \
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
  --set-secrets="DATABASE_URL=pixiai-database-url:latest,JWT_SECRET=pixiai-jwt-secret:latest,GOOGLE_CLIENT_ID=pixiai-google-client-id:latest" \
  --quiet

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE}" \
  --region="${REGION}" --format='value(status.url)')
ok "Frontend deployed: ${FRONTEND_URL}"

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✅ Xong! Các lỗi đã được fix:${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "  ${CYAN}401 Unauthorized${NC} → Frontend giờ dùng axios + Bearer token"
echo -e "  ${CYAN}503 Service Unavailable${NC} → pixiai-latex đã deploy:"
echo -e "     ${LATEX_URL}"
echo ""
echo -e "  Kiểm tra:"
echo -e "  ${CYAN}https://inphysic.com/teacher/latex-documents${NC}"
echo ""
echo -e "  Latex service health:"
echo -e "  ${CYAN}curl ${LATEX_URL}/health${NC}"
echo ""
echo -e "  Xem logs nếu vẫn lỗi:"
echo -e "  ${CYAN}gcloud logging read 'resource.labels.service_name=pixiai-latex' \\"
echo -e "    --project=${PROJECT_ID} --limit=30 --format='table(timestamp,textPayload)'${NC}"
echo -e "${GREEN}============================================================${NC}"
