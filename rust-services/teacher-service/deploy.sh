#!/usr/bin/env bash
# ============================================================
# Deploy teacher-service to Google Cloud Run
#
# Usage:
#   cd rust-services/teacher-service
#   ./deploy.sh
#
# Prerequisites (1 lần):
#   1. gcloud auth login + gcloud config set project extreme-lattice-491123-p2
#   2. Artifact Registry "aeroedu" đã được tạo (dùng chung với pixiai)
#   3. Các secret sau đã tồn tại trên Secret Manager:
#        - pixiai-database-url   (Neon Postgres URL)
#        - pixiai-jwt-secret     (NEXTAUTH_SECRET — cùng secret với Next.js/Vite)
# ============================================================
set -euo pipefail

SERVICE_NAME="pixiai-teacher"
REGION="${REGION:-asia-southeast1}"
REPO_NAME="${REPO_NAME:-aeroedu}"
PROJECT_ID="${PROJECT_ID:-extreme-lattice-491123-p2}"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null)"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "▶ Project:     $PROJECT_ID (#$PROJECT_NUMBER)"
echo "▶ Region:      $REGION"
echo "▶ Image:       $IMAGE"
echo "▶ Runtime SA:  $RUNTIME_SA"
echo ""

# ── Cấp quyền đọc secret cho runtime SA (idempotent) ──
echo "▶ Ensuring runtime SA can read required secrets..."
for SECRET in pixiai-database-url pixiai-jwt-secret; do
  if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets add-iam-policy-binding "$SECRET" \
      --member="serviceAccount:$RUNTIME_SA" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT_ID" \
      --quiet >/dev/null
    echo "  ✓ $SECRET"
  else
    echo "  ❌ $SECRET không tồn tại — hãy tạo trước"
    echo "     echo 'postgres://...' | gcloud secrets create $SECRET --data-file=- --project=$PROJECT_ID"
    exit 1
  fi
done
echo ""

# ── Build & push bằng Cloud Build (không cần Docker local) ──
echo "▶ Building image via Cloud Build... (8–15 phút lần đầu)"
gcloud builds submit --tag "$IMAGE" --region="$REGION" --timeout=20m \
  --project="$PROJECT_ID" .

# ── Deploy lên Cloud Run ──
echo ""
echo "▶ Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --platform=managed \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=5 \
  --timeout=120 \
  --set-secrets="DATABASE_URL=pixiai-database-url:latest,NEXTAUTH_SECRET=pixiai-jwt-secret:latest" \
  --set-env-vars="RUST_LOG=teacher_service=info"

# ── Lấy URL và hướng dẫn update aero-backend ──
TEACHER_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"

echo ""
echo "✅ teacher-service đã deploy: $TEACHER_URL"
echo ""
echo "▶ Bước tiếp theo — update TEACHER_SERVICE_URL cho aero-backend:"
echo ""

# Tự động tìm tên gateway service
GATEWAY=$(gcloud run services list --region="$REGION" --project="$PROJECT_ID" \
  --format="value(metadata.name)" 2>/dev/null | grep -i "aero-backend\|gateway" | head -1 || echo "pixiai-aero-backend")

echo "    gcloud run services update ${GATEWAY} \\"
echo "      --region=$REGION \\"
echo "      --project=$PROJECT_ID \\"
echo "      --update-env-vars=TEACHER_SERVICE_URL=$TEACHER_URL"
echo ""
echo "Sau đó test:"
echo "    curl -s -o /dev/null -w '%{http_code}' https://inphysic.com/api/teacher/exams"
echo "    # Expect 401 (auth required) = service alive"
