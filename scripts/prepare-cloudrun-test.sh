#!/usr/bin/env bash
#
# Chuẩn bị deploy Aeroedu Vision lên Cloud Run (test)
# Hai cách: Docker (build local) hoặc Google CLI (Cloud Build trên GCP)
# Project: empyrean-harbor-489423-v6
#
# Chuẩn bị only:     bash scripts/prepare-cloudrun-test.sh
# Deploy qua Docker:  bash scripts/prepare-cloudrun-test.sh --deploy
# Deploy qua gcloud:  bash scripts/prepare-cloudrun-test.sh --deploy-gcloud
#

set -e

PROJECT_ID="${GCP_PROJECT_ID:-empyrean-harbor-489423-v6}"
REGION="${CLOUD_RUN_REGION:-asia-east2}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-lmsmath-app}"
IMAGE_TAG="${IMAGE_TAG:-test}"
DO_DEPLOY=false
DEPLOY_MODE=""
[ "${1:-}" = "--deploy" ]      && { DO_DEPLOY=true; DEPLOY_MODE=docker; }
[ "${1:-}" = "--deploy-gcloud" ] && { DO_DEPLOY=true; DEPLOY_MODE=gcloud; }

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "=============================================="
echo "  Deploy Aeroedu Vision → Cloud Run (test)"
echo "  Docker hoặc gcloud (Cloud Build)"
echo "  Project: $PROJECT_ID | Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo "=============================================="
echo ""

# --- 1. Kiểm tra công cụ ---
info "Kiểm tra gcloud..."
if ! command -v gcloud &>/dev/null; then
  err "Chưa cài gcloud. Cài: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
ok "gcloud có sẵn"

# Docker chỉ bắt buộc khi deploy bằng --deploy (docker)
if [ "$DO_DEPLOY" = true ] && [ "$DEPLOY_MODE" = "docker" ]; then
  info "Kiểm tra Docker..."
  if ! command -v docker &>/dev/null; then
    err "Deploy qua Docker cần Docker. Cài: https://docs.docker.com/get-docker/ hoặc dùng: bash $0 --deploy-gcloud"
    exit 1
  fi
  if ! docker info &>/dev/null; then
    err "Docker daemon chưa chạy. Khởi động Docker hoặc dùng: bash $0 --deploy-gcloud"
    exit 1
  fi
  ok "Docker có sẵn và đang chạy"
else
  if command -v docker &>/dev/null && docker info &>/dev/null; then
    ok "Docker có sẵn (tùy chọn cho --deploy)"
  else
    warn "Docker chưa có — dùng --deploy-gcloud để deploy qua Cloud Build"
  fi
fi

# --- 2. Đăng nhập & project ---
info "Đặt project GCP: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" --quiet
ok "Project đã đặt: $(gcloud config get-value project 2>/dev/null)"

info "Kiểm tra đăng nhập..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1 | grep -q .; then
  warn "Có thể chưa đăng nhập. Chạy: gcloud auth login"
  gcloud auth login --no-launch-browser 2>/dev/null || true
fi
ok "Đã đăng nhập GCP"

# --- 3. Bật APIs ---
info "Bật các API cần thiết..."
for api in \
  run.googleapis.com \
  containerregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com; do
  if gcloud services list --enabled --filter="name:$api" --format="value(name)" 2>/dev/null | grep -q "^$api$"; then
    ok "  $api (đã bật)"
  else
    info "  Bật $api..."
    gcloud services enable "$api" --project="$PROJECT_ID" --quiet
    ok "  $api đã bật"
  fi
done

# --- 4. Cấu hình Docker cho GCR (khi có Docker) ---
if command -v docker &>/dev/null; then
  info "Cấu hình Docker cho gcr.io..."
  gcloud auth configure-docker gcr.io --quiet 2>/dev/null || true
  ok "Docker đã cấu hình cho GCR"
fi

# --- 4b. Quyền Cloud Build (khi dùng --deploy-gcloud) ---
if [ "$DEPLOY_MODE" = "gcloud" ] || [ "$DO_DEPLOY" = false ]; then
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null || true)
  if [ -n "$PROJECT_NUMBER" ]; then
    SA="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    for role in roles/run.admin roles/secretmanager.secretAccessor roles/storage.admin; do
      gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="$SA" --role="$role" --quiet 2>/dev/null || true
    done
  fi
fi

# --- 5. Secret Manager (nhắc tạo secret nếu chưa có) ---
echo ""
info "Kiểm tra Secret Manager (dùng khi deploy Cloud Run)..."
for secret_id in database-url nextauth-secret; do
  if gcloud secrets describe "$secret_id" --project="$PROJECT_ID" &>/dev/null; then
    ok "  Secret '$secret_id' đã tồn tại"
  else
    warn "  Secret '$secret_id' chưa có. Tạo bằng:"
    echo "     echo -n 'YOUR_VALUE' | gcloud secrets create $secret_id --data-file=- --project=$PROJECT_ID"
    echo "     hoặc: gcloud secrets create $secret_id --replication-policy=automatic --project=$PROJECT_ID"
    echo "     rồi thêm version: gcloud secrets versions add $secret_id --data-file=-"
  fi
done

# --- 6. In checklist ---
echo ""
echo "=============================================="
echo "  CHECKLIST TRƯỚC KHI DEPLOY"
echo "=============================================="
echo "  1. [ ] DATABASE_URL đã lưu trong Secret Manager (database-url)"
echo "  2. [ ] NEXTAUTH_SECRET đã lưu trong Secret Manager (nextauth-secret)"
echo "  3. [ ] NEXTAUTH_URL trỏ đúng URL Cloud Run (sau lần deploy đầu)"
echo "  4. [ ] OAuth redirect URI (Google Cloud Console) thêm URL Cloud Run"
echo "=============================================="
echo ""

IMAGE_URI="gcr.io/$PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG"

if [ "$DO_DEPLOY" = true ] && [ "$DEPLOY_MODE" = "docker" ]; then
  # --- Deploy qua Docker: build → push → run deploy ---
  echo "=============================================="
  echo "  DEPLOY QUA DOCKER"
  echo "=============================================="
  info "Build Docker image: $IMAGE_URI"
  docker build -t "$IMAGE_URI" .
  ok "Build xong."
  info "Push lên GCR..."
  docker push "$IMAGE_URI"
  ok "Push xong."
  info "Deploy lên Cloud Run..."
  gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_URI" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --set-secrets DATABASE_URL=database-url:latest,NEXTAUTH_SECRET=nextauth-secret:latest \
    --set-env-vars "NODE_ENV=production,PORT=3000,HOSTNAME=0.0.0.0,NEXT_TELEMETRY_DISABLED=1" \
    --port 3000 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --project "$PROJECT_ID"
  ok "Deploy xong. URL: gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format='value(status.url)'"
  echo ""
  exit 0
fi

if [ "$DO_DEPLOY" = true ] && [ "$DEPLOY_MODE" = "gcloud" ]; then
  # --- Deploy qua Google CLI: Cloud Build (không cần Docker local) ---
  echo "=============================================="
  echo "  DEPLOY QUA GCLOUD (Cloud Build)"
  echo "=============================================="
  if [ ! -f "cloudbuild.yaml" ]; then
    err "Thiếu cloudbuild.yaml trong thư mục hiện tại. Chạy script từ thư mục gốc repo."
    exit 1
  fi
  info "Gửi source lên GCP, Cloud Build sẽ build image và deploy..."
  gcloud builds submit --config=cloudbuild.yaml --project="$PROJECT_ID" .
  ok "Deploy xong. URL: gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format='value(status.url)'"
  echo ""
  exit 0
fi

# --- In hướng dẫn: Docker hoặc gcloud ---
echo "  Cách 1 — DEPLOY QUA DOCKER (build local):"
echo ""
echo "  docker build -t $IMAGE_URI ."
echo "  docker push $IMAGE_URI"
echo "  gcloud run deploy $SERVICE_NAME --image $IMAGE_URI --region $REGION --platform managed --allow-unauthenticated \\"
echo "    --set-secrets DATABASE_URL=database-url:latest,NEXTAUTH_SECRET=nextauth-secret:latest --port 3000 --project $PROJECT_ID"
echo ""
echo "  Hoặc:  bash scripts/prepare-cloudrun-test.sh --deploy"
echo ""
echo "  Cách 2 — DEPLOY QUA GOOGLE CLI (Cloud Build, không cần Docker):"
echo ""
echo "  gcloud builds submit --config=cloudbuild.yaml --project=$PROJECT_ID ."
echo ""
echo "  Hoặc:  bash scripts/prepare-cloudrun-test.sh --deploy-gcloud"
echo ""
ok "Chuẩn bị xong."
echo ""
