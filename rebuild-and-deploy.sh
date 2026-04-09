#!/bin/bash
# ================================================================
# REBUILD + DEPLOY - AeroEdu Cloud Run Service
# ================================================================
#
# Run this after applying code fixes (lib/auth.ts, db-optimized.ts,
# next.config.js). Builds a fresh Docker image and deploys it.
#
# Prerequisites:
#   - Docker running (docker version)
#   - gcloud auth: gcloud auth configure-docker asia-southeast1-docker.pkg.dev
#   - Logged in: gcloud auth login
#
# Usage: bash rebuild-and-deploy.sh
# ================================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="edu"
SERVICE_URL="https://edu-667564078289.asia-southeast1.run.app"
REGISTRY="asia-southeast1-docker.pkg.dev/${PROJECT_ID}/aeroedu/edu"
TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE="${REGISTRY}:${TAG}"

echo ""
echo "================================================================"
echo " REBUILD + DEPLOY: ${SERVICE_NAME}"
echo " Image tag: ${TAG}"
echo "================================================================"
echo ""
echo " Code fixes applied in this build:"
echo "   1. lib/auth.ts: Removed redundant DB query from session callback"
echo "      → session now reads from JWT token (no DB on every /api/auth/session)"
echo "   2. lib/performance/db-optimized.ts: PrismaClient is now lazy"
echo "      → no DB connections created at module import time"
echo "   3. next.config.js: console.log enabled (removeConsole: false)"
echo "      → crash logs visible in Cloud Run log viewer"
echo "   4. next.config.js: serverExternalPackages for Prisma/bcryptjs/ioredis"
echo "      → prevents these Node.js modules from being bundled into Edge runtime"
echo ""
echo "⏳ Building Docker image (this takes 3-10 minutes)..."
echo ""

# Build the image
docker build \
  --platform linux/amd64 \
  --tag "${IMAGE}" \
  --tag "${REGISTRY}:latest" \
  --progress=plain \
  .

echo ""
echo "✅ Build complete!"
echo ""
echo "⏳ Pushing image to Artifact Registry..."
docker push "${IMAGE}"
docker push "${REGISTRY}:latest"

echo ""
echo "✅ Push complete!"
echo ""
echo "⏳ Deploying to Cloud Run..."
echo ""

gcloud run services update "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --image="${IMAGE}" \
  --cpu=2 \
  --memory=4Gi \
  --min-instances=0 \
  --max-instances=5 \
  --concurrency=10 \
  --timeout=300 \
  --no-cpu-throttling \
  --cpu-boost \
  --execution-environment=gen2 \
  --startup-probe="initialDelaySeconds=30,timeoutSeconds=10,periodSeconds=10,failureThreshold=3,tcpSocket.port=3000" \
  --update-env-vars="NODE_OPTIONS=--max-old-space-size=3072" \
  --update-env-vars="NEXTAUTH_URL=${SERVICE_URL}" \
  --update-env-vars="NODE_ENV=production" \
  --update-env-vars="NEXT_TELEMETRY_DISABLED=1" \
  --update-env-vars="HOSTNAME=0.0.0.0" \
  --update-env-vars="SKIP_ENV_VALIDATION=1" \
  --update-env-vars="DATABASE_URL=postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-young-hat-a15kp33z-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15" \
  --update-env-vars="DIRECT_DATABASE_URL=postgresql://neondb_owner:npg_ADdhqO90fnVb@ep-young-hat-a15kp33z.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15" \
  --update-env-vars="NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa" \
  --update-env-vars="GOOGLE_CLIENT_ID=667564078289-7lv5ipchhsgahfu44vqhtj68tkuovcrc.apps.googleusercontent.com" \
  --update-env-vars="GOOGLE_CLIENT_SECRET=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" \
  --update-env-vars="OPENROUTER_API_KEY=ysk-or-v1-88c6bef9f94c1d45a92719015429df94dcffcf5b897fac4ce9fb85d16de0ae94" \
  --update-env-vars="ANTHROPIC_API_KEY=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" \
  --update-env-vars="GOOGLE_CLOUD_PROJECT=gen-lang-client-0712182643" \
  --update-env-vars="NEXT_PUBLIC_TRACKING_SERVER_URL=wss://vision-tracking-server-1069154179448.us-central1.run.app/ws/tracking" \
  --quiet

echo ""
echo "✅ Deployment complete! Image: ${IMAGE}"
echo ""
echo "⏳ Đợi service khởi động (70 giây: 30s initial_delay + 40s buffer)..."
sleep 70

echo ""
echo "▶ Kiểm tra trạng thái..."
STATUS=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.conditions[0].type)' 2>/dev/null || echo "unknown")
echo "   Service status: ${STATUS}"

echo ""
echo "▶ Kiểm tra HTTP response..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 60 \
  -H "User-Agent: AeroEdu-HealthCheck/1.0" \
  "${SERVICE_URL}/" 2>/dev/null || echo "000")

echo "   HTTP ${HTTP_CODE} ← ${SERVICE_URL}/"
echo ""

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
  echo "🎉 SERVICE ĐANG CHẠY BÌNH THƯỜNG!"
  echo "   URL: ${SERVICE_URL}"
  echo ""
  echo "   Image đã deploy: ${IMAGE}"
  echo "   Cập nhật fix-crash.sh với image mới này."
elif [ "$HTTP_CODE" = "000" ]; then
  echo "⚠️  Timeout. Kiểm tra log để xem lý do:"
  echo "   gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --limit=50"
else
  echo "⚠️  HTTP ${HTTP_CODE}"
  echo "   Kiểm tra log:"
  echo "   gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --limit=50"
fi

echo ""
echo "================================================================"
