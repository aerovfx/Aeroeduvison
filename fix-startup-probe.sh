#!/bin/bash
# ================================================================
# FIX STARTUP PROBE - AeroEdu Cloud Run Service (v2 - corrected)
# ================================================================
set -euo pipefail

PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="edu"
SERVICE_URL="https://edu-667564078289.asia-southeast1.run.app"
IMAGE="asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aeroedu/edu@sha256:b39c3429604b60d65727446ec2dbb17b93748ff4906eb135aea2377885059c61"

echo ""
echo "================================================================"
echo " FIX STARTUP PROBE: ${SERVICE_NAME}"
echo " Root cause: Node.js takes >1s to start → probe at t=0 fails"
echo "             → SIGTERM → SIGKILL at t≈7s"
echo " Fix: initial_delay=30s + timeout=10s + 3 retries"
echo "================================================================"
echo ""

# ------------------------------------------------------------------
# APPROACH 1: Use --startup-probe with KEY=VALUE format
# gcloud expects: KEY=VALUE[,KEY=VALUE...] where KEY is one of:
#   initialDelaySeconds, timeoutSeconds, periodSeconds, failureThreshold
#   tcpSocket.port, httpGet.path, httpGet.port
# ------------------------------------------------------------------
echo "▶ Deploying with corrected startup probe..."

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
  --update-env-vars="NODE_OPTIONS=--max-old-space-size=2048" \
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

DEPLOY_EXIT=$?

# ------------------------------------------------------------------
# If Approach 1 failed, use YAML describe/replace (most reliable)
# ------------------------------------------------------------------
if [ $DEPLOY_EXIT -ne 0 ]; then
  echo ""
  echo "⚠️  --startup-probe format still wrong. Trying YAML approach..."
  _yaml_fix
fi

_check_health() {
  echo ""
  echo "⏳ Đợi 70 giây (30s initial_delay + 40s buffer)..."
  sleep 70

  echo ""
  echo "▶ Kiểm tra trạng thái..."
  gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --format='table(status.conditions[0].type, status.conditions[0].status)' 2>/dev/null || true

  echo ""
  echo "▶ Kiểm tra HTTP..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 60 \
    -H "User-Agent: AeroEdu-HealthCheck/1.0" \
    "${SERVICE_URL}/" 2>/dev/null || echo "000")

  echo "   HTTP ${HTTP_CODE} ← ${SERVICE_URL}/"
  echo ""

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "307" ]; then
    echo "🎉 SERVICE ĐANG CHẠY BÌNH THƯỜNG!"
    echo "   URL: ${SERVICE_URL}"
  elif [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️  Vẫn chưa fix. Startup probe không phải nguyên nhân duy nhất."
    echo "   → Chạy: bash rebuild-and-deploy.sh  (fix code + rebuild)"
    echo "   → Log: gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --limit=50"
  else
    echo "   HTTP ${HTTP_CODE} — kiểm tra log để biết thêm."
  fi
}

_yaml_fix() {
  echo ""
  echo "▶ Export service YAML..."
  gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --format=export > /tmp/edu-service.yaml

  echo "▶ Cập nhật startupProbe trong YAML..."
  python3 << 'PYEOF'
import re, sys

with open('/tmp/edu-service.yaml') as f:
    content = f.read()

# Remove existing startupProbe block
content = re.sub(r'\s+startupProbe:.*?(?=\n\s{8}\w|\Z)', '', content, flags=re.DOTALL)

# Inject new startupProbe after first "image:" or "name:" in containers
probe_yaml = """
        startupProbe:
          tcpSocket:
            port: 3000
          initialDelaySeconds: 30
          timeoutSeconds: 10
          periodSeconds: 10
          failureThreshold: 3"""

# Insert after containers block starts (after 'image: ...' line)
content = re.sub(r'(        image: [^\n]+)', r'\1' + probe_yaml, content, count=1)

with open('/tmp/edu-service-fixed.yaml', 'w') as f:
    f.write(content)

print("✅ YAML updated")
PYEOF

  echo "▶ Replace service..."
  gcloud run services replace /tmp/edu-service-fixed.yaml \
    --region="${REGION}" \
    --project="${PROJECT_ID}"
}

_check_health
