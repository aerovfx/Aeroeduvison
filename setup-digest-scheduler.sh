#!/bin/bash
# ============================================================
# RS-Phase 8: Setup Cloud Scheduler job cho daily digest
# ============================================================
# One-time setup — chạy SAU KHI Cloud Run service đã deploy lần đầu.
# Idempotent: nếu job đã tồn tại sẽ update; không sẽ create mới.
#
# Job sẽ trigger POST https://inphysic.com/api/reco/digest/run-all
# vào 7h sáng giờ Việt Nam (UTC+7) mỗi ngày, gửi tóm tắt 3 mục cá nhân
# hoá cho mọi user active trong 7 ngày qua qua channels họ opt-in
# (in-app bell / email / telegram).
#
# Pre-reqs:
#   - gcloud CLI đã auth
#   - Cloud Scheduler API enabled
#   - Service pixiai đã deploy ít nhất 1 lần
#   - Env RS_DIGEST_ADMIN_TOKEN đã set trên Cloud Run service
# ============================================================
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-extreme-lattice-491123-p2}"
REGION="${REGION:-asia-southeast1}"
SERVICE_URL="${SERVICE_URL:-https://inphysic.com}"
JOB_NAME="${JOB_NAME:-rs-daily-digest}"
SCHEDULE="${SCHEDULE:-0 0 * * *}"  # 0h UTC = 7h sáng VN (UTC+7)
TIME_ZONE="${TIME_ZONE:-Asia/Ho_Chi_Minh}"
ADMIN_TOKEN="${RS_DIGEST_ADMIN_TOKEN:-}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ RS_DIGEST_ADMIN_TOKEN env var chưa set. Export trước khi chạy script:"
  echo "   export RS_DIGEST_ADMIN_TOKEN='<token-same-as-cloud-run-env>'"
  exit 1
fi

echo "============================================================"
echo "  RS-Phase 8 — Setup daily digest scheduler"
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Job     : ${JOB_NAME}"
echo "  Schedule: ${SCHEDULE} (${TIME_ZONE} = 7h sáng VN)"
echo "  Target  : POST ${SERVICE_URL}/api/reco/digest/run-all"
echo "============================================================"

# Check if Cloud Scheduler API enabled
echo ""
echo "Step 1: Enable Cloud Scheduler API (idempotent)..."
gcloud services enable cloudscheduler.googleapis.com --project="${PROJECT_ID}" || true
echo "✅ Cloud Scheduler API enabled"

# Check if job exists
echo ""
echo "Step 2: Check existing job..."
if gcloud scheduler jobs describe "${JOB_NAME}" \
    --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "✏️  Job exists — updating schedule + headers"
  gcloud scheduler jobs update http "${JOB_NAME}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${SCHEDULE}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${SERVICE_URL}/api/reco/digest/run-all" \
    --http-method=POST \
    --headers="x-admin-token=${ADMIN_TOKEN},Content-Type=application/json" \
    --message-body='{}' \
    --attempt-deadline=600s
else
  echo "🆕 Job not found — creating new"
  gcloud scheduler jobs create http "${JOB_NAME}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --schedule="${SCHEDULE}" \
    --time-zone="${TIME_ZONE}" \
    --uri="${SERVICE_URL}/api/reco/digest/run-all" \
    --http-method=POST \
    --headers="x-admin-token=${ADMIN_TOKEN},Content-Type=application/json" \
    --message-body='{}' \
    --attempt-deadline=600s
fi

echo ""
echo "✅ Done! Job '${JOB_NAME}' sẽ chạy mỗi ngày 7h sáng VN."
echo ""
echo "Verify:"
echo "  gcloud scheduler jobs describe ${JOB_NAME} --location=${REGION}"
echo ""
echo "Trigger ngay (test):"
echo "  gcloud scheduler jobs run ${JOB_NAME} --location=${REGION}"
echo ""
echo "Xem logs gần nhất:"
echo "  gcloud logging read 'resource.type=cloud_scheduler_job AND resource.labels.job_id=${JOB_NAME}' --limit=5"
