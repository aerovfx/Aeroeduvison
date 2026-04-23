#!/usr/bin/env bash
# ============================================================
# Deploy latex-service to Google Cloud Run
#
# Usage:
#   cd rust-services/latex-service
#   ./deploy.sh
#
# Prerequisites (1 lần):
#   1. gcloud auth login + gcloud config set project <project>
#   2. Artifact Registry "aeroedu" đã được tạo
#   3. Các secret sau đã tồn tại trên Secret Manager (dùng chung với pixiai):
#        - pixiai-database-url   (Neon Postgres URL)
#        - pixiai-jwt-secret     (NEXTAUTH_SECRET — cùng secret với Next.js/Vite)
#        - anthropic-api-key     (sk-ant-api03-...) — cho AI generator
# ============================================================
set -euo pipefail

SERVICE_NAME="pixiai-latex"
REGION="${REGION:-asia-southeast1}"
REPO_NAME="${REPO_NAME:-aeroedu}"
PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"

if [[ -z "$PROJECT_ID" ]]; then
  echo "❌ Chưa set gcloud project. Chạy: gcloud config set project <id>"
  exit 1
fi

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

# Default Cloud Run runtime service account (project number dựa theo projects describe)
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null)"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "▶ Project:     $PROJECT_ID (#$PROJECT_NUMBER)"
echo "▶ Region:      $REGION"
echo "▶ Image:       $IMAGE"
echo "▶ Runtime SA:  $RUNTIME_SA"
echo ""

# ── Cấp quyền đọc secret cho runtime SA (idempotent — chạy nhiều lần an toàn) ──
echo "▶ Ensuring runtime SA can read required secrets..."
for SECRET in pixiai-database-url pixiai-jwt-secret anthropic-api-key; do
  if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets add-iam-policy-binding "$SECRET" \
      --member="serviceAccount:$RUNTIME_SA" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT_ID" \
      --quiet >/dev/null
    echo "  ✓ $SECRET"
  else
    echo "  ⚠  $SECRET không tồn tại — hãy tạo trước: gcloud secrets create $SECRET --data-file=-"
  fi
done
echo ""

# ── Build & push bằng Cloud Build (không cần Docker local) ──
echo "▶ Building image via Cloud Build..."
gcloud builds submit --tag "$IMAGE" --region="$REGION" --timeout=20m .

# ── Deploy lên Cloud Run ─────────────────────────────────────
echo ""
echo "▶ Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=5 \
  --timeout=120 \
  --set-secrets=DATABASE_URL=pixiai-database-url:latest,NEXTAUTH_SECRET=pixiai-jwt-secret:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --set-env-vars=ANTHROPIC_MODEL=claude-sonnet-4-6,RUST_LOG=latex_service=info

# ── Lấy URL vừa deploy để cập nhật lại vào pixiai ──────────
LATEX_URL="$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)')"

echo ""
echo "✅ latex-service đã deploy: $LATEX_URL"
echo ""
echo "▶ Bước tiếp theo — update env LATEX_SERVICE_URL cho pixiai:"
echo ""
echo "    gcloud run services update pixiai \\"
echo "      --region=$REGION \\"
echo "      --update-env-vars=LATEX_SERVICE_URL=$LATEX_URL"
echo ""
echo "Test sau khi update:"
echo "    curl -X POST https://inphysic.com/api/latex-projects \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -H 'Cookie: next-auth.session-token=<token>' \\"
echo "      -d '{\"title\":\"Test\"}'"
