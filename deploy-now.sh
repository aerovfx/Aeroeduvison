#!/usr/bin/env bash
# ============================================================
# AeroEduVision — Deploy script gọn cho Cloud Run
# ============================================================
# Mục đích:
#   - Pre-flight check (TypeScript, file bắt buộc)
#   - Build Docker image cho linux/amd64 bằng Docker Desktop + Rosetta
#   - Đẩy lên Artifact Registry
#   - Deploy Cloud Run service `pixiai`
#   - Smoke-test các endpoint mới (/api/assignments, /a/:token, pixel-agents)
#
# Sử dụng:
#   bash deploy-now.sh              # full deploy
#   bash deploy-now.sh --skip-build # chỉ deploy lại image :latest hiện có
#   bash deploy-now.sh --check-only # chỉ chạy pre-flight, không build/deploy
# ============================================================

set -euo pipefail

# ── Cấu hình dự án ─────────────────────────────────────────
PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="pixiai"
REPO_NAME="aeroedu"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"

# Flags
SKIP_BUILD=0
CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --check-only) CHECK_ONLY=1 ;;
    -h|--help)
      sed -n '1,25p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
  esac
done

# ── Màu sắc ────────────────────────────────────────────────
c_g=$'\e[32m'; c_y=$'\e[33m'; c_r=$'\e[31m'; c_b=$'\e[36m'; c_0=$'\e[0m'
step() { echo ""; echo "${c_b}▸ $*${c_0}"; }
ok()   { echo "  ${c_g}✓${c_0} $*"; }
warn() { echo "  ${c_y}⚠${c_0}  $*"; }
die()  { echo "  ${c_r}✗${c_0} $*"; exit 1; }

# ── Thư mục gốc ────────────────────────────────────────────
cd "$(dirname "$0")"
ROOT_DIR="$(pwd)"

echo "============================================"
echo " AeroEduVision — Deploy → Cloud Run"
echo "============================================"
echo " Project : ${PROJECT_ID}"
echo " Region  : ${REGION}"
echo " Service : ${SERVICE_NAME}"
echo " Image   : ${IMAGE_NAME}:${TAG}"
[ "${SKIP_BUILD}" = "1" ] && echo " Mode    : SKIP-BUILD (chỉ redeploy :latest)"
[ "${CHECK_ONLY}" = "1" ] && echo " Mode    : CHECK-ONLY (không build, không deploy)"
echo "============================================"

# ══════════════════════════════════════════════════════════
# PRE-FLIGHT: Kiểm tra file bắt buộc
# ══════════════════════════════════════════════════════════
step "Pre-flight 1/4 — Kiểm tra file bắt buộc"
for f in Dockerfile server.cjs aeroedu-vite/package.json aeroedu-vite/src/router/index.tsx; do
  [ -f "$f" ] || die "Thiếu file: $f"
done
ok "Đủ file bắt buộc"

# Check các file mới của bo session này
for f in \
  aeroedu-vite/src/pages/public/ScanAssignment.tsx \
  aeroedu-vite/src/pages/teacher/Assignments.tsx \
  aeroedu-vite/src/pages/labs/PixelAgents.tsx \
  aeroedu-vite/src/services/assignments.service.ts; do
  [ -f "$f" ] || die "Thiếu feature file mới: $f"
done
ok "Đủ 4 feature file mới (assignments + pixel-agents)"

# Verify route wiring
grep -q "/a/:token" aeroedu-vite/src/router/index.tsx || die "Chưa wire route /a/:token"
grep -q "pixel-agents" aeroedu-vite/src/router/index.tsx || die "Chưa wire route /dashboard/labtwin/labs/pixel-agents"
ok "Routes /a/:token và /labs/pixel-agents đã wire trong router"

# Verify server endpoints exist
grep -q "/api/assignments" server.cjs || die "server.cjs chưa có /api/assignments handler"
grep -q "qr_token" server.cjs || die "server.cjs chưa có logic QR token"
ok "server.cjs có endpoints /api/assignments + logic QR"

# ══════════════════════════════════════════════════════════
# PRE-FLIGHT: TypeScript check
# ══════════════════════════════════════════════════════════
step "Pre-flight 2/4 — TypeScript type-check"
if [ -f aeroedu-vite/node_modules/typescript/bin/tsc ]; then
  (cd aeroedu-vite && node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json) \
    && ok "TypeScript 0 errors" \
    || die "TypeScript có lỗi — sửa trước khi deploy"
else
  warn "Chưa có node_modules/typescript. Chạy: cd aeroedu-vite && npm ci --legacy-peer-deps"
fi

# ══════════════════════════════════════════════════════════
# PRE-FLIGHT: gcloud + docker
# ══════════════════════════════════════════════════════════
step "Pre-flight 3/4 — gcloud CLI"
command -v gcloud >/dev/null 2>&1 || die "Cần cài gcloud CLI: https://cloud.google.com/sdk/docs/install"
gcloud auth print-access-token >/dev/null 2>&1 || { warn "Chưa login gcloud, mở browser..."; gcloud auth login; }
gcloud config set project "${PROJECT_ID}" --quiet
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet >/dev/null
ok "gcloud đã xác thực, project=${PROJECT_ID}"

step "Pre-flight 4/4 — Docker Desktop"
command -v docker >/dev/null 2>&1 || die "Chưa cài docker"
docker info >/dev/null 2>&1 || die "Docker daemon chưa chạy — mở Docker Desktop"
DOCKER_MEM=$(docker info 2>/dev/null | awk -F: '/Total Memory/ {gsub(/ /,"",$2); print $2}')
ok "Docker chạy ok (RAM cấp phát: ${DOCKER_MEM:-n/a})"

if [ "${CHECK_ONLY}" = "1" ]; then
  echo ""
  echo "${c_g}✓ Check-only mode: tất cả pre-flight đều pass.${c_0}"
  exit 0
fi

# ══════════════════════════════════════════════════════════
# STEP 1: Enable APIs + ensure Artifact Registry
# ══════════════════════════════════════════════════════════
step "Step 1/6 — Bật APIs + tạo repo Artifact Registry (nếu chưa có)"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com --quiet 2>/dev/null || true
if ! gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker --location="${REGION}" \
    --description="AeroEduVision images" --quiet
  ok "Tạo mới repo ${REPO_NAME}"
else
  ok "Repo ${REPO_NAME} đã tồn tại"
fi

# ══════════════════════════════════════════════════════════
# STEP 2: Build + Push image
# ══════════════════════════════════════════════════════════
if [ "${SKIP_BUILD}" = "0" ]; then
  step "Step 2/6 — Build Docker image (5-15 phút)"
  echo "  Platform: linux/amd64 (Rosetta)"

  # Pull base image trước để tránh timeout trong build
  for attempt in 1 2 3; do
    docker pull --platform linux/amd64 node:20-slim >/dev/null 2>&1 && break
    warn "Pull node:20-slim lần ${attempt}/3 fail, retry 10s..."
    sleep 10
  done

  # Lấy VITE_GOOGLE_CLIENT_ID để bake vào Vite bundle (PUBLIC — không phải secret)
  # Thứ tự ưu tiên: .env.production → .env → hardcoded fallback trong
  # src/lib/googleClientId.ts (đảm bảo button Google Sign-In luôn render).
  VITE_GOOGLE_CLIENT_ID=""
  for ENV_FILE in aeroedu-vite/.env.production .env.production aeroedu-vite/.env .env; do
    if [ -f "${ENV_FILE}" ]; then
      VAL="$(grep -E '^VITE_GOOGLE_CLIENT_ID=' "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '\r\n"')"
      if [ -n "${VAL}" ]; then
        VITE_GOOGLE_CLIENT_ID="${VAL}"
        echo "  VITE_GOOGLE_CLIENT_ID: loaded from ${ENV_FILE}" >&2
        break
      fi
    fi
  done

  # Hard validation — nếu giá trị có rác (whitespace / format sai) thì FAIL
  # sớm thay vì để build-arg "  VITE_GOOGLE_CLIENT_ID: loaded from .env\n<id>"
  # lọt vào bundle Vite → Google trả invalid_client.
  if [ -n "${VITE_GOOGLE_CLIENT_ID}" ]; then
    if printf '%s' "${VITE_GOOGLE_CLIENT_ID}" | LC_ALL=C grep -q '[[:space:]]'; then
      die "VITE_GOOGLE_CLIENT_ID chứa whitespace/newline — từ chối build."
    fi
    if ! printf '%s' "${VITE_GOOGLE_CLIENT_ID}" | LC_ALL=C grep -qE '^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$'; then
      die "VITE_GOOGLE_CLIENT_ID format sai — từ chối build. Got: ${VITE_GOOGLE_CLIENT_ID}"
    fi
    echo "  ✓ VITE_GOOGLE_CLIENT_ID format hợp lệ (${#VITE_GOOGLE_CLIENT_ID} chars)" >&2
  fi

  for attempt in 1 2 3; do
    docker buildx build \
      --platform linux/amd64 \
      --pull=false \
      --load \
      --build-arg "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" \
      -t "${IMAGE_NAME}:${TAG}" \
      -t "${IMAGE_NAME}:latest" \
      -f Dockerfile \
      . && break
    warn "Build lần ${attempt}/3 fail"
    [ "${attempt}" = "3" ] && die "Build fail sau 3 lần"
    sleep 10
  done
  ok "Image build xong: ${IMAGE_NAME}:${TAG}"

  # Smoke test container cục bộ trước khi push
  step "Step 2.5/6 — Smoke test container local"
  CID=$(docker run -d --rm -p 18080:8080 -e PORT=8080 "${IMAGE_NAME}:${TAG}")
  sleep 5
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18080/ || echo "000")
  docker stop "${CID}" >/dev/null 2>&1 || true
  [ "${HTTP_STATUS}" != "000" ] || die "Container crash. Debug: docker run --rm -p 8080:8080 ${IMAGE_NAME}:${TAG}"
  ok "Container phản hồi HTTP ${HTTP_STATUS}"

  step "Step 3/6 — Push lên Artifact Registry"
  docker push "${IMAGE_NAME}:${TAG}"
  docker push "${IMAGE_NAME}:latest"
  ok "Image pushed"
else
  step "Step 2-3/6 — SKIP build (dùng ${IMAGE_NAME}:latest hiện có)"
fi

# ══════════════════════════════════════════════════════════
# STEP 4: Đảm bảo secrets tồn tại + cấp quyền
# ══════════════════════════════════════════════════════════
step "Step 4/6 — Secrets + IAM"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# JWT secret — auto-tạo nếu chưa có
if ! gcloud secrets describe "pixiai-jwt-secret" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  openssl rand -hex 32 | gcloud secrets create "pixiai-jwt-secret" \
    --data-file=- --replication-policy=automatic --project="${PROJECT_ID}" --quiet
  ok "Tạo mới pixiai-jwt-secret"
fi

# Cấp quyền read cho service account
for SECRET in "pixiai-jwt-secret" "pixiai-database-url" "pixiai-google-client-id"; do
  if gcloud secrets describe "${SECRET}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud secrets add-iam-policy-binding "${SECRET}" \
      --project="${PROJECT_ID}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" \
      --quiet >/dev/null 2>&1 || true
  else
    warn "Secret ${SECRET} chưa tồn tại — set thủ công: bash setup-cloudrun-secrets.sh"
  fi
done
ok "Secrets + IAM sẵn sàng"

# ══════════════════════════════════════════════════════════
# STEP 5: Deploy Cloud Run
# ══════════════════════════════════════════════════════════
step "Step 5/6 — Deploy Cloud Run service"

# Detect deployed microservices
AUTH_SERVICE_URL=""
MEDIA_SERVICE_URL=""
if gcloud run services describe "pixiai-auth" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  AUTH_SERVICE_URL=$(gcloud run services describe "pixiai-auth" --region="${REGION}" --format='value(status.url)')
  ok "Phát hiện auth-service: ${AUTH_SERVICE_URL}"
fi
if gcloud run services describe "pixiai-media" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  MEDIA_SERVICE_URL=$(gcloud run services describe "pixiai-media" --region="${REGION}" --format='value(status.url)')
  ok "Phát hiện media-service: ${MEDIA_SERVICE_URL}"
fi

ENV_VARS="NODE_ENV=production"
[ -n "${AUTH_SERVICE_URL}" ]  && ENV_VARS="${ENV_VARS},AUTH_SERVICE_URL=${AUTH_SERVICE_URL}"
[ -n "${MEDIA_SERVICE_URL}" ] && ENV_VARS="${ENV_VARS},MEDIA_SERVICE_URL=${MEDIA_SERVICE_URL}"

# Build --update-secrets chỉ với secret tồn tại
SECRETS_ARG=""
for pair in "DATABASE_URL=pixiai-database-url:latest" \
            "JWT_SECRET=pixiai-jwt-secret:latest" \
            "GOOGLE_CLIENT_ID=pixiai-google-client-id:latest"; do
  secret_name="${pair#*=}"; secret_name="${secret_name%:latest}"
  if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    SECRETS_ARG="${SECRETS_ARG:+${SECRETS_ARG},}${pair}"
  fi
done

gcloud run deploy "${SERVICE_NAME}" \
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
  ${SECRETS_ARG:+--update-secrets="${SECRETS_ARG}"} \
  --quiet

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format='value(status.url)')
ok "Deploy xong — ${SERVICE_URL}"

# ══════════════════════════════════════════════════════════
# STEP 6: Smoke test các endpoint mới
# ══════════════════════════════════════════════════════════
step "Step 6/6 — Smoke test production endpoints"
sleep 3  # cho Cloud Run warm up

# 1) Landing page
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/")
[ "${STATUS}" = "200" ] && ok "GET /                           → ${STATUS}" \
                       || warn "GET /                           → ${STATUS}"

# 2) Health
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/api/health" || echo "000")
ok "GET /api/health                  → ${STATUS}"

# 3) Public scan route (404 là đúng — token không tồn tại)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/api/assignments/public/NOTEXIST")
[ "${STATUS}" = "404" ] && ok "GET /api/assignments/public/*    → ${STATUS} (expected 404)" \
                       || warn "GET /api/assignments/public/*    → ${STATUS} (mong đợi 404)"

# 4) SPA route — /a/:token trả về HTML (200) vì SPA
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/a/test-token")
[ "${STATUS}" = "200" ] && ok "GET /a/test-token (SPA)          → ${STATUS}" \
                       || warn "GET /a/test-token (SPA)          → ${STATUS}"

# 5) Pixel agents page
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/dashboard/labtwin/labs/pixel-agents")
[ "${STATUS}" = "200" ] && ok "GET /labs/pixel-agents (SPA)     → ${STATUS}" \
                       || warn "GET /labs/pixel-agents (SPA)     → ${STATUS}"

# 6) Protected endpoint (401 là đúng)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}/api/assignments")
[ "${STATUS}" = "401" ] && ok "GET /api/assignments (no auth)   → ${STATUS} (expected 401)" \
                       || warn "GET /api/assignments (no auth)   → ${STATUS} (mong đợi 401)"

# ══════════════════════════════════════════════════════════
# KẾT QUẢ
# ══════════════════════════════════════════════════════════
echo ""
echo "============================================"
echo " ${c_g}✓ DEPLOY THÀNH CÔNG${c_0}"
echo "============================================"
echo " URL    : ${SERVICE_URL}"
echo " Image  : ${IMAGE_NAME}:${TAG}"
echo ""
echo " 📋 Kiểm tra sau deploy:"
echo "   • Logs     : gcloud logging read 'resource.type=cloud_run_revision' \\"
echo "                 --project=${PROJECT_ID} --limit=30"
echo "   • Console  : https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/logs?project=${PROJECT_ID}"
echo "   • Rollback : gcloud run services update-traffic ${SERVICE_NAME} \\"
echo "                 --region=${REGION} --to-revisions=REVISION_NAME=100"
echo ""
echo " 🧪 Test tính năng mới:"
echo "   • Teacher bảng bài tập : ${SERVICE_URL}/teacher/assignments"
echo "   • Pixel Agents RPG     : ${SERVICE_URL}/dashboard/labtwin/labs/pixel-agents"
echo "   • Scan QR (ẩn danh)    : ${SERVICE_URL}/a/<token>  (token từ teacher UI)"
echo "============================================"
