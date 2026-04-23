#!/bin/bash
# ================================================================
# Khôi phục env vars cho service edu trên Cloud Run
# ================================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="edu"
SERVICE_URL="https://edu-667564078289.asia-southeast1.run.app"

echo ""
echo "▶ Đang khôi phục env vars cho service '${SERVICE_NAME}'..."

gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --update-env-vars="\
DATABASE_URL=postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-young-hat-a15kp33z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15,\
DIRECT_DATABASE_URL=postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-young-hat-a15kp33z.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15,\
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa,\
NEXTAUTH_URL=${SERVICE_URL},\
GOOGLE_CLIENT_ID=667564078289-7lv5ipchhsgahfu44vqhtj68tkuovcrc.apps.googleusercontent.com,\
GOOGLE_CLIENT_SECRET=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,\
OPENROUTER_API_KEY=ysk-or-v1-88c6bef9f94c1d45a92719015429df94dcffcf5b897fac4ce9fb85d16de0ae94,\
ANTHROPIC_API_KEY=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,\
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
