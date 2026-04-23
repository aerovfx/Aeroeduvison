#!/bin/bash
# ============================================================
# setup-cloudrun-secrets.sh
# Tạo Secret Manager secrets + cấu hình Variables cho Cloud Run
# Service: pixiai | Region: asia-southeast1
# Usage: bash setup-cloudrun-secrets.sh
# ============================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="pixiai"

# ── Màu terminal ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}  Cloud Run — Variables & Secrets Setup${NC}"
echo -e "${BLUE}  Project : ${PROJECT_ID}${NC}"
echo -e "${BLUE}  Service : ${SERVICE_NAME} (${REGION})${NC}"
echo -e "${BLUE}============================================================${NC}"

# ── Kiểm tra gcloud ──────────────────────────────────────────
if ! command -v gcloud &>/dev/null; then
  echo -e "${RED}❌ gcloud CLI chưa được cài. Xem: https://cloud.google.com/sdk/install${NC}"
  exit 1
fi

gcloud config set project ${PROJECT_ID}

# ── Enable APIs ───────────────────────────────────────────────
echo -e "\n${YELLOW}[1/4] Enabling required APIs...${NC}"
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  --project=${PROJECT_ID} --quiet
echo -e "${GREEN}✅ APIs enabled${NC}"

# Chờ Secret Manager API propagate (lần đầu enable cần 30-60s)
echo -e "${YELLOW}⏳ Chờ Secret Manager API khởi động (30s)...${NC}"
sleep 30
echo -e "${GREEN}✅ Sẵn sàng${NC}"

# ── Hàm tạo / cập nhật secret ────────────────────────────────
create_or_update_secret() {
  local SECRET_NAME="$1"
  local SECRET_VALUE="$2"

  if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    # Secret đã tồn tại → thêm version mới
    echo "${SECRET_VALUE}" | gcloud secrets versions add "${SECRET_NAME}" \
      --data-file=- --project="${PROJECT_ID}" --quiet
    echo -e "  ${GREEN}↑ Updated:${NC} ${SECRET_NAME}"
  else
    # Tạo mới
    echo "${SECRET_VALUE}" | gcloud secrets create "${SECRET_NAME}" \
      --data-file=- --replication-policy=automatic \
      --project="${PROJECT_ID}" --quiet
    echo -e "  ${GREEN}✅ Created:${NC} ${SECRET_NAME}"
  fi
}

# ============================================================
# [2/4] TẠO SECRETS TRONG SECRET MANAGER
# ============================================================
echo -e "\n${YELLOW}[2/4] Creating secrets in Secret Manager...${NC}"
echo -e "${BLUE}(Sửa các giá trị YOUR_* trước khi chạy script này)${NC}\n"

# ─── Database ────────────────────────────────────────────────
# ⚠️ Direct Neon PostgreSQL URL (KHÔNG dùng Prisma Accelerate proxy).
# server.cjs dùng `pg` thuần → chỉ parse được scheme postgresql://
# Nếu cần URL qua Accelerate cho Prisma Client, lưu vào secret riêng
# (ví dụ `pixiai-prisma-accelerate-url`).
create_or_update_secret "pixiai-database-url" \
  "postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-young-hat-a15kp33z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# ─── NextAuth ────────────────────────────────────────────────
create_or_update_secret "pixiai-nextauth-secret" \
  "8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"

# ─── Google OAuth ─────────────────────────────────────────────
create_or_update_secret "pixiai-google-client-id" \
  "667564078289-7lv5ipchhsgahfu44vqhtj68tkuovcrc.apps.googleusercontent.com"

create_or_update_secret "pixiai-google-client-secret" \
  "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"

# ─── AI / LLM ─────────────────────────────────────────────────
create_or_update_secret "pixiai-openrouter-api-key" \
  "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"

create_or_update_secret "pixiai-anthropic-api-key" \
  "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"

echo -e "\n${GREEN}✅ Secrets created in Secret Manager${NC}"

# ── Grant Cloud Run SA access to secrets ─────────────────────
echo -e "\n${YELLOW}[3/4] Granting Cloud Run SA access to secrets...${NC}"
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

SECRETS=(
  "pixiai-database-url"
  "pixiai-nextauth-secret"
  "pixiai-google-client-id"
  "pixiai-google-client-secret"
  "pixiai-openrouter-api-key"
  "pixiai-anthropic-api-key"
)

for SECRET in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
  echo -e "  ${GREEN}✅${NC} ${SA_EMAIL} → ${SECRET}"
done
echo -e "${GREEN}✅ IAM permissions set${NC}"

# ============================================================
# [4/4] UPDATE CLOUD RUN SERVICE
# ============================================================
echo -e "\n${YELLOW}[4/4] Updating Cloud Run service with Variables & Secrets...${NC}"

gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  \
  --set-env-vars="\
NODE_ENV=production,\
HOSTNAME=0.0.0.0,\
NEXT_TELEMETRY_DISABLED=1,\
NEXTAUTH_URL=https://inphysic.com,\
GOOGLE_CLOUD_PROJECT=${PROJECT_ID},\
NEXT_PUBLIC_TRACKING_SERVER_URL=wss://vision-tracking-server-1069154179448.us-central1.run.app/ws/tracking,\
OPENAI_BASE_URL=https://openrouter.ai/api/v1,\
OPENAI_DEFAULT_MODEL=anthropic/claude-3.5-sonnet,\
AI_PROVIDER=openrouter,\
OPENFANG_MOCK_MODE=false,\
RUST_BACKEND_URL=http://127.0.0.1:8090,\
RUST_AUTH_URL=http://127.0.0.1:8092,\
RUST_COURSE_URL=http://127.0.0.1:8093,\
RUST_ADMIN_URL=http://127.0.0.1:8094,\
RUST_AI_URL=http://127.0.0.1:8095,\
RUST_STUDENT_URL=http://127.0.0.1:8096,\
RUST_STEM_URL=http://127.0.0.1:8097,\
RUST_MEDIA_URL=http://127.0.0.1:8098,\
RUST_CAMERA_URL=http://127.0.0.1:8099,\
RUST_GRADING_URL=http://127.0.0.1:8100,\
RUST_CHAT_URL=http://127.0.0.1:8101,\
RUST_ASSIGNMENTS_URL=http://127.0.0.1:8102,\
RUST_ACHIEVEMENTS_URL=http://127.0.0.1:8103,\
RUST_ANALYTICS_URL=http://127.0.0.1:8104,\
RUST_EMOTION_URL=http://127.0.0.1:8105,\
DIRECT_RUST_AUTH_PROXY=false,\
DIRECT_RUST_VECTOR_PROXY=false,\
DIRECT_RUST_OCR_GRADING_PROXY=false,\
DIRECT_RUST_OCR_PROCESS_PROXY=false,\
DIRECT_RUST_LLM_GRADING_PROXY=false,\
DIRECT_RUST_ADMIN_PROXY=false,\
DIRECT_RUST_COURSE_PROXY=false,\
DIRECT_RUST_AI_PROXY=false,\
DIRECT_RUST_STUDENT_PROXY=false,\
DIRECT_RUST_STEM_PROXY=false,\
DIRECT_RUST_MEDIA_PROXY=false,\
DIRECT_RUST_CAMERA_PROXY=false,\
DIRECT_RUST_GRADING_PROXY=false,\
DIRECT_RUST_CHAT_PROXY=false,\
DIRECT_RUST_ASSIGNMENTS_PROXY=false,\
DIRECT_RUST_ACHIEVEMENTS_PROXY=false,\
DIRECT_RUST_ANALYTICS_PROXY=false,\
DIRECT_RUST_EMOTION_PROXY=false,\
ENABLE_RUST_CANARY_PROXY=false,\
ENABLE_RUST_CANARY_AUTO_ROLLOUT=false,\
RUST_DISABLE_ON_UNHEALTHY=true" \
  \
  --update-secrets="\
DATABASE_URL=pixiai-database-url:latest,\
NEXTAUTH_SECRET=pixiai-nextauth-secret:latest,\
GOOGLE_CLIENT_ID=pixiai-google-client-id:latest,\
GOOGLE_CLIENT_SECRET=pixiai-google-client-secret:latest,\
OPENROUTER_API_KEY=pixiai-openrouter-api-key:latest,\
OPENAI_API_KEY=pixiai-openrouter-api-key:latest,\
ANTHROPIC_API_KEY=pixiai-anthropic-api-key:latest" \
  --quiet

echo -e "\n${GREEN}============================================================${NC}"
echo -e "${GREEN}  ✅ Cloud Run Variables & Secrets cấu hình xong!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo -e "  Service URL : https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/revisions?project=${PROJECT_ID}"
echo ""
echo -e "${YELLOW}📋 Lưu ý quan trọng:${NC}"
echo -e "  1. DIRECT_RUST_*_PROXY=false → dùng NextAuth Credentials thuần (auth hoạt động)"
echo -e "  2. Khi các Rust services được deploy lên Cloud Run riêng:"
echo -e "     → Cập nhật RUST_AUTH_URL, RUST_COURSE_URL, ... với URL thật"
echo -e "     → Set lại DIRECT_RUST_AUTH_PROXY=true"
echo -e "  3. Kiểm tra Google OAuth redirect URIs:"
echo -e "     → https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
echo -e "     → Thêm: https://inphysic.com/api/auth/callback/google"
echo -e ""
echo -e "${YELLOW}🔍 Xem logs:${NC}"
echo -e "  gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}' \\"
echo -e "    --project=${PROJECT_ID} --limit=30 --format='table(timestamp,textPayload)'"
