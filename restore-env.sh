#!/bin/bash
# ================================================================
# Khôi phục env vars cho service edu trên Cloud Run
# ================================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="edu"
SERVICE_URL="https://edu-667564078289.asia-southeast1.run.app"

# ---- Secrets from env (or source .env.production) ----
[ -f .env.production ] && set -a && . ./.env.production && set +a
: "${DATABASE_URL:?Set DATABASE_URL}"
: "${DIRECT_DATABASE_URL:?Set DIRECT_DATABASE_URL}"
: "${NEXTAUTH_SECRET:?Set NEXTAUTH_SECRET}"
: "${GOOGLE_CLIENT_ID:?Set GOOGLE_CLIENT_ID}"
: "${GOOGLE_CLIENT_SECRET:?Set GOOGLE_CLIENT_SECRET}"
: "${OPENROUTER_API_KEY:?Set OPENROUTER_API_KEY}"
: "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY}"

echo ""
echo "▶ Đang khôi phục env vars cho service '${SERVICE_NAME}'..."

gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --update-env-vars="\
DATABASE_URL=${DATABASE_URL},\
DIRECT_DATABASE_URL=${DIRECT_DATABASE_URL},\
NEXTAUTH_SECRET=${NEXTAUTH_SECRET},\
NEXTAUTH_URL=${SERVICE_URL},\
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},\
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET},\
OPENROUTER_API_KEY=${OPENROUTER_API_KEY},\
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY},\
GOOGLE_CLOUD_PROJECT=gen-lang-client-0712182643,\
NEXT_PUBLIC_TRACKING_SERVER_URL=wss://vision-tracking-server-1069154179448.us-central1.run.app/ws/tracking" \
  --quiet

echo ""
echo "✅ Env vars đã được khôi phục!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "▶ Kiểm tra trạng thái service..."
gcloud run services describe ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format='value(status.conditions[0].type,status.conditions[0].status)'
