#!/bin/bash
set -euo pipefail

# ================================================================
# AeroEduVision — GCS Bucket Setup (Single Bucket)
# ================================================================
# Tạo 1 GCS Bucket duy nhất để lưu toàn bộ media khoá học:
#   videos/      ← video bài giảng
#   images/      ← hình ảnh, thumbnail khoá học
#   documents/   ← tài liệu PDF, worksheet
#   uploads/     ← bài nộp học sinh, file tạm
#
# Usage:
#   bash infra/setup-gcs-buckets.sh
#   bash infra/setup-gcs-buckets.sh --project MY_PROJECT --region asia-east2
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project YOUR_PROJECT_ID
# ================================================================

# ── Configuration ─────────────────────────────────────────────────
PROJECT_ID="${GCLOUD_PROJECT:-extreme-lattice-491123-p2}"
REGION="${GCLOUD_REGION:-asia-east2}"
SA_NAME="aeroedu-media-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Parse args
for arg in "$@"; do
  case "$arg" in
    --project=*) PROJECT_ID="${arg#*=}" ;;
    --region=*)  REGION="${arg#*=}" ;;
    --project)   shift; PROJECT_ID="$1" ;;
    --region)    shift; REGION="$1" ;;
  esac
done

# Single bucket for all media (folders differentiate content types)
BUCKET_MEDIA="aeroedu-media-${PROJECT_ID}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORS_JSON="${SCRIPT_DIR}/gcs-cors.json"

# ── Colors ────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   AeroEduVision — GCS Single Bucket Setup            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Bucket  : ${BUCKET_MEDIA}"
echo ""

# ── Ensure gcloud is configured ───────────────────────────────────
gcloud config set project "${PROJECT_ID}" --quiet

# ── [1/5] Enable APIs ─────────────────────────────────────────────
echo -e "${CYAN}[1/5] Enabling Cloud Storage & IAM APIs...${NC}"
gcloud services enable storage.googleapis.com --project="${PROJECT_ID}" --quiet
gcloud services enable iam.googleapis.com --project="${PROJECT_ID}" --quiet
echo -e "${GREEN}  ✓ APIs enabled${NC}"

# ── [2/5] Create Bucket ───────────────────────────────────────────
echo ""
echo -e "${CYAN}[2/5] Creating storage bucket...${NC}"

if gsutil ls -b "gs://${BUCKET_MEDIA}" &>/dev/null 2>&1; then
  echo -e "${YELLOW}  ↷ Bucket gs://${BUCKET_MEDIA} already exists — skipping${NC}"
else
  echo "  → Creating gs://${BUCKET_MEDIA} (STANDARD, ${REGION})"
  gsutil mb \
    -p "${PROJECT_ID}" \
    -c "STANDARD" \
    -l "${REGION}" \
    "gs://${BUCKET_MEDIA}"

  # Uniform bucket-level access (no legacy per-object ACLs)
  gsutil ubla set on "gs://${BUCKET_MEDIA}"
  echo -e "${GREEN}  ✓ Bucket created${NC}"
fi

# ── [3/5] Lifecycle Rules ─────────────────────────────────────────
echo ""
echo -e "${CYAN}[3/5] Applying lifecycle rules...${NC}"

# Delete aborted resumable uploads after 2 days (cleanup incomplete video uploads)
# Move videos/ to Nearline after 90 days (cost saving)
gsutil lifecycle set /dev/stdin "gs://${BUCKET_MEDIA}" <<'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "AbortIncompleteMultipartUpload" },
        "condition": { "age": 2 }
      },
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 7,
          "matchesPrefix": ["uploads/temp/"]
        }
      }
    ]
  }
}
EOF
echo -e "${GREEN}  ✓ Lifecycle rules applied${NC}"

# ── [4/5] CORS Configuration ──────────────────────────────────────
echo ""
echo -e "${CYAN}[4/5] Applying CORS configuration...${NC}"

if [[ ! -f "${CORS_JSON}" ]]; then
  echo -e "${YELLOW}  ! gcs-cors.json not found — creating default${NC}"
  cat > "${CORS_JSON}" <<'EOF'
[
  {
    "origin": [
      "https://aeroedu-demo.run.app",
      "https://demo-*.run.app",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type", "Authorization", "Content-Length",
      "Content-Range", "User-Agent",
      "x-goog-resumable", "x-goog-hash", "x-goog-meta-*", "ETag"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF
fi

gsutil cors set "${CORS_JSON}" "gs://${BUCKET_MEDIA}"
echo -e "${GREEN}  ✓ CORS applied to gs://${BUCKET_MEDIA}${NC}"

# ── [5/5] Service Account + Key ───────────────────────────────────
echo ""
echo -e "${CYAN}[5/5] Setting up service account...${NC}"

if gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null 2>&1; then
  echo -e "${YELLOW}  ↷ Service account ${SA_EMAIL} already exists${NC}"
else
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="AeroEduVision Media Storage" \
    --project="${PROJECT_ID}"
  echo -e "${GREEN}  ✓ Service account created: ${SA_EMAIL}${NC}"
fi

# Grant Storage Object Admin on the media bucket
gsutil iam ch "serviceAccount:${SA_EMAIL}:roles/storage.objectAdmin" "gs://${BUCKET_MEDIA}"
echo -e "${GREEN}  ✓ objectAdmin granted on gs://${BUCKET_MEDIA}${NC}"

# Generate key file
KEY_FILE="${SCRIPT_DIR}/gcs-sa-key.json"
if [[ -f "${KEY_FILE}" ]]; then
  echo -e "${YELLOW}  ↷ Key file already exists at ${KEY_FILE}${NC}"
else
  gcloud iam service-accounts keys create "${KEY_FILE}" \
    --iam-account="${SA_EMAIL}" \
    --project="${PROJECT_ID}"
  echo -e "${GREEN}  ✓ Key saved to: ${KEY_FILE}${NC}"
fi

# Encode key as base64 for use as env var
KEY_B64="$(base64 -w0 "${KEY_FILE}" 2>/dev/null || base64 "${KEY_FILE}")"

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  ✅  Setup Complete!                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Bucket: gs://${BUCKET_MEDIA}"
echo "    videos/    ← video bài giảng (upload trực tiếp từ browser)"
echo "    images/    ← hình ảnh, thumbnail khoá học"
echo "    documents/ ← tài liệu PDF, worksheet"
echo "    uploads/   ← bài nộp học sinh"
echo ""
echo "  Service account: ${SA_EMAIL}"
echo "  Key file: ${KEY_FILE}"
echo ""
echo -e "${CYAN}  ── Environment variables for media-service ──${NC}"
echo ""
echo "  Add to Cloud Run service (or .env.local):"
echo ""
echo "  GCS_SA_KEY=${KEY_B64}"
echo "  GCS_BUCKET_MEDIA=${BUCKET_MEDIA}"
echo ""
echo -e "${YELLOW}  ⚠  Keep gcs-sa-key.json secret — do NOT commit to git!${NC}"
echo "     It is already in .gitignore: infra/gcs-sa-key.json"
echo ""
echo "  Deploy to Cloud Run:"
echo "  gcloud run services update media-service \\"
echo "    --region=${REGION} \\"
echo "    --set-env-vars GCS_SA_KEY=\${KEY_B64},GCS_BUCKET_MEDIA=${BUCKET_MEDIA}"
echo ""
