#!/bin/bash
set -euo pipefail

# ================================================================
# AeroEduVision — Deploy to Cloud Run via gcloud (NO local Docker)
# ================================================================
# Uses `gcloud run deploy --source .` which:
#   1) Uploads source tarball to a Cloud Storage staging bucket
#   2) Builds the container REMOTELY on Cloud Build (uses ./Dockerfile)
#   3) Pushes the image to Artifact Registry
#   4) Deploys the new revision to Cloud Run
#
# Pre-reqs (one-time):
#   - gcloud CLI installed + authenticated  (`gcloud auth login`)
#   - You have roles: roles/run.admin, roles/cloudbuild.builds.editor,
#     roles/artifactregistry.writer, roles/iam.serviceAccountUser
#
# Run: bash deploy-cloudbuild.sh
# ================================================================

PROJECT_ID="${PROJECT_ID:-extreme-lattice-491123-p2}"
REGION="${REGION:-asia-southeast1}"
SERVICE_NAME="${SERVICE_NAME:-pixiai}"
REPO_NAME="${REPO_NAME:-aeroedu}"
TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"

# Cloud Build resource sizing — bigger = faster build but slightly more $
BUILD_MACHINE_TYPE="${BUILD_MACHINE_TYPE:-E2_HIGHCPU_8}"
BUILD_TIMEOUT="${BUILD_TIMEOUT:-1800s}"   # 30 min ceiling

echo "============================================================"
echo "  AeroEduVision — Cloud Run Deploy (no local Docker)"
echo "  Project : ${PROJECT_ID}"
echo "  Region  : ${REGION}"
echo "  Service : ${SERVICE_NAME}"
echo "  Image   : ${IMAGE_NAME}:${TAG}"
echo "  Builder : Cloud Build (${BUILD_MACHINE_TYPE})"
echo "============================================================"

# ── Step 0: Sanity checks ───────────────────────────────────────
echo ""
echo "Step 0: Verifying environment..."
if ! command -v gcloud >/dev/null 2>&1; then
  echo "❌ gcloud CLI not installed. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi
if [ ! -f "Dockerfile" ]; then
  echo "❌ Dockerfile not found in current directory ($(pwd))."
  echo "   Run this script from the project root."
  exit 1
fi
if [ ! -f ".gcloudignore" ]; then
  echo "⚠️  .gcloudignore missing — Cloud Build will upload your entire repo (slow)."
  echo "    You already have one in this repo, so just rerun from the right folder."
fi
echo "✅ gcloud + Dockerfile present"

# ── Step 1: Authenticate ────────────────────────────────────────
echo ""
echo "Step 1: Authenticating with gcloud..."
gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login
gcloud config set project "${PROJECT_ID}" --quiet
ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "unknown")
echo "✅ Logged in as: ${ACTIVE_ACCOUNT}  (project: ${PROJECT_ID})"

# ── Step 2: Enable APIs ─────────────────────────────────────────
echo ""
echo "Step 2: Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  texttospeech.googleapis.com \
  --quiet 2>/dev/null || true
echo "✅ APIs enabled (gồm Cloud Text-to-Speech cho giọng mascot Aero)"

# ── Step 3: Ensure Artifact Registry repo exists ────────────────
echo ""
echo "Step 3: Verifying Artifact Registry repo (${REPO_NAME})..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" \
      --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="AeroEduVision Docker images" \
    --project="${PROJECT_ID}" --quiet
  echo "  ✅ Created repo"
else
  echo "  ✅ Repo exists"
fi

# ── Step 4: Bootstrap secrets ───────────────────────────────────
echo ""
echo "Step 4: Bootstrapping secrets..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Auto-create JWT secret if missing
if ! gcloud secrets describe "pixiai-jwt-secret" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  JWT_VALUE=$(openssl rand -hex 32)
  echo "${JWT_VALUE}" | gcloud secrets create "pixiai-jwt-secret" \
    --data-file=- --replication-policy=automatic \
    --project="${PROJECT_ID}" --quiet
  echo "  ✅ Created: pixiai-jwt-secret"
else
  echo "  ✅ Exists:  pixiai-jwt-secret"
fi

# Warn (don't auto-create) about secrets that need real values
for s in "pixiai-database-url" "pixiai-google-client-id"; do
  if gcloud secrets describe "${s}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "  ✅ Exists:  ${s}"
  else
    echo "  ⚠️  Missing: ${s}  → run setup-cloudrun-secrets.sh first"
  fi
done

# Grant runtime SA access (idempotent, silent)
for s in "pixiai-jwt-secret" "pixiai-database-url" "pixiai-google-client-id"; do
  gcloud secrets add-iam-policy-binding "${s}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
done

# Cho runtime SA dùng các API đã bật (Cloud Text-to-Speech cho giọng mascot Aero)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/serviceusage.serviceUsageConsumer" \
  --condition=None --quiet >/dev/null 2>&1 || true

# Cho runtime SA tạo secret + thêm version → dashboard admin "Tích hợp API" đẩy
# key lên Google Secret Manager (đồng bộ cloud). secretmanager.admin để tạo
# secret mới; nếu muốn siết quyền có thể đổi sang secretVersionAdder sau khi
# secret đã tồn tại.
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.admin" \
  --condition=None --quiet >/dev/null 2>&1 || true

# Grant Cloud Build SA permission to push to Artifact Registry + act on Cloud Run
for ROLE in "roles/artifactregistry.writer" "roles/run.admin" "roles/iam.serviceAccountUser"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CLOUDBUILD_SA}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet >/dev/null 2>&1 || true
done
echo "✅ IAM bindings ready (Compute SA + Cloud Build SA)"

# ── Step 5: Detect downstream microservice URLs ────────────────
echo ""
echo "Step 5: Detecting microservice URLs..."
AUTH_SERVICE_URL=""
MEDIA_SERVICE_URL=""
LATEX_SERVICE_URL=""
if gcloud run services describe "pixiai-auth" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  AUTH_SERVICE_URL=$(gcloud run services describe "pixiai-auth" \
    --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
  echo "  ✅ Auth  : ${AUTH_SERVICE_URL}"
else
  echo "  ⚠️  pixiai-auth not deployed (Node.js fallback will be used)"
fi
if gcloud run services describe "pixiai-media" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  MEDIA_SERVICE_URL=$(gcloud run services describe "pixiai-media" \
    --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
  echo "  ✅ Media : ${MEDIA_SERVICE_URL}"
else
  echo "  ⚠️  pixiai-media not deployed (skipping)"
fi
if gcloud run services describe "pixiai-latex" --region="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  LATEX_SERVICE_URL=$(gcloud run services describe "pixiai-latex" \
    --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
  echo "  ✅ Latex : ${LATEX_SERVICE_URL}"
else
  echo "  ⚠️  pixiai-latex not deployed (LaTeX features will return 503)"
fi

# Build env-vars string. Dùng --update-env-vars (merge) ở step deploy nên
# các env không liệt kê ở đây vẫn được giữ nguyên ở revision cũ.
# AUTH_SERVICE_URL + LATEX_SERVICE_URL: DEPRECATED — built-in handlers thay thế.
ENV_VARS="NODE_ENV=production"
[ -n "${MEDIA_SERVICE_URL}" ] && ENV_VARS="${ENV_VARS},MEDIA_SERVICE_URL=${MEDIA_SERVICE_URL}"
# Pin các env quan trọng cho payment/ai mặc dù --update-env-vars merge,
# để revision MỚI deploy lần đầu có sẵn (vd Cloud Build rebuild image).
ENV_VARS="${ENV_VARS},AI_PREFERRED_PROVIDER=fal,TELEGRAM_USE_WEBHOOK=true"
# Apple IAP (StoreKit): bundle + môi trường. KEY_ID/ISSUER_ID/PRIVATE_KEY qua Secret Manager.
# Khi lên production App Store công khai → đổi APPLE_IAP_ENV=production.
ENV_VARS="${ENV_VARS},APPLE_IAP_BUNDLE_ID=com.aeroedu.inphysic,APPLE_IAP_ENV=sandbox"

# ── Step 5.5: Load VITE_* build-time env vars ──────────────────
# Vite bakes `import.meta.env.VITE_*` into the bundle at BUILD time, not
# runtime. Cloud Run env vars are too late — they affect server.cjs only.
# We must pass these as --build-arg to Cloud Build, which forwards them to
# the Dockerfile's ARG directives.
#
# Precedence: .env.production → .env → hardcoded fallback in
# src/lib/googleClientId.ts (which guarantees the Google OAuth button renders
# even if every env file is empty — the Client ID is PUBLIC, safe to ship).
echo ""
echo "Step 5.5: Loading VITE_* build-time env vars..."
load_env_var() {
  # Usage: load_env_var <VAR_NAME>
  #
  # CRITICAL: All progress/log output MUST go to stderr (>&2). Caller uses
  # `FOO="$(load_env_var FOO)"` which captures stdout — if debug messages
  # leak to stdout they get concatenated into FOO's value.
  #
  # Historical bug (fixed 2026-04-21): the "loaded from" echo below was on
  # stdout, causing VITE_GOOGLE_CLIENT_ID to be built as
  #   "  VITE_GOOGLE_CLIENT_ID: loaded from aeroedu-vite/.env.production\n<actual id>"
  # which Google rejected with invalid_client / "OAuth client was not found".
  local key="$1"
  local val=""
  for ENV_FILE in aeroedu-vite/.env.production .env.production aeroedu-vite/.env .env; do
    if [ -f "${ENV_FILE}" ]; then
      val="$(grep -E "^${key}=" "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '\r\n"')"
      if [ -n "${val}" ]; then
        echo "  ${key}: loaded from ${ENV_FILE}" >&2
        printf '%s' "${val}"
        return 0
      fi
    fi
  done
  echo "  ${key}: (empty — not found in any .env file)" >&2
  printf ''
}

VITE_GOOGLE_CLIENT_ID="$(load_env_var VITE_GOOGLE_CLIENT_ID)"
VITE_API_URL="$(load_env_var VITE_API_URL)"
VITE_WS_URL="$(load_env_var VITE_WS_URL)"
VITE_APP_URL="$(load_env_var VITE_APP_URL)"

if [ -z "${VITE_GOOGLE_CLIENT_ID}" ]; then
  echo "  ⚠️  VITE_GOOGLE_CLIENT_ID empty — build will use hardcoded fallback"
  echo "     in aeroedu-vite/src/lib/googleClientId.ts (still works)."
fi

# ── Hard validation (belt-and-suspenders) ────────────────────
# If any shell plumbing bug leaks garbage into VITE_GOOGLE_CLIENT_ID,
# FAIL LOUDLY here instead of shipping a polluted bundle that shows up as
# Google "invalid_client" later.  Spec:
#   - No newlines, carriage returns, or any whitespace inside the value
#   - If non-empty, must full-match the OAuth Client ID regex
if [ -n "${VITE_GOOGLE_CLIENT_ID}" ]; then
  if printf '%s' "${VITE_GOOGLE_CLIENT_ID}" | LC_ALL=C grep -q '[[:space:]]'; then
    echo "❌ VITE_GOOGLE_CLIENT_ID contains whitespace/newline — refusing to deploy." >&2
    echo "   Value (hex-dump first 200 bytes):" >&2
    printf '%s' "${VITE_GOOGLE_CLIENT_ID}" | head -c 200 | od -c | head -20 >&2
    exit 1
  fi
  if ! printf '%s' "${VITE_GOOGLE_CLIENT_ID}" | LC_ALL=C grep -qE '^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$'; then
    echo "❌ VITE_GOOGLE_CLIENT_ID format invalid — refusing to deploy." >&2
    echo "   Got: ${VITE_GOOGLE_CLIENT_ID}" >&2
    echo "   Expected: <digits>-<alnum>.apps.googleusercontent.com" >&2
    exit 1
  fi
  echo "  ✓ VITE_GOOGLE_CLIENT_ID format valid (${#VITE_GOOGLE_CLIENT_ID} chars)"
fi

# ── Step 6: Build via Cloud Build (explicit build-args) ────────
# `gcloud run deploy --source=.` does NOT support --build-arg, so we use
# `gcloud builds submit --config=cloudbuild.yaml` for full control.
echo ""
echo "Step 6: Submitting Cloud Build (with --build-arg for VITE_*)..."
echo "        Tail progress: gcloud builds list --ongoing --project=${PROJECT_ID}"
echo ""

gcloud builds submit \
  --config=cloudbuild.yaml \
  --project="${PROJECT_ID}" \
  --substitutions="\
_REGION=${REGION},\
_REPO_NAME=${REPO_NAME},\
_SERVICE_NAME=${SERVICE_NAME},\
_TAG=${TAG},\
_VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID},\
_VITE_API_URL=${VITE_API_URL},\
_VITE_WS_URL=${VITE_WS_URL},\
_VITE_APP_URL=${VITE_APP_URL}" \
  --quiet \
  .

echo "✅ Image built & pushed: ${IMAGE_NAME}:${TAG}"

# ── Build chuỗi --update-secrets (gồm secret cố định + secret tích hợp do
#    admin đẩy lên Secret Manager qua dashboard, nếu đã tồn tại) ────────────
SECRETS="DATABASE_URL=pixiai-database-url:latest,JWT_SECRET=pixiai-jwt-secret:latest,GOOGLE_CLIENT_ID=pixiai-google-client-id:latest,TELEGRAM_BOT_TOKEN=telegram-bot-token:latest,FAL_API_KEY=fal-api-key:latest,SMTP_PASS=smtp-pass:latest,APPLE_IAP_PRIVATE_KEY=apple-iap-private-key:latest,APPLE_IAP_KEY_ID=apple-iap-key-id:latest,APPLE_IAP_ISSUER_ID=apple-iap-issuer-id:latest"
for pair in \
  "ANTHROPIC_API_KEY=pixiai-anthropic-api-key" \
  "DEEPSEEK_API_KEY=pixiai-deepseek-api-key" \
  "OPENAI_API_KEY=pixiai-openai-api-key" \
  "GOOGLE_TTS_API_KEY=pixiai-google-tts-api-key"; do
  envname="${pair%%=*}"; secname="${pair##*=}"
  if gcloud secrets describe "${secname}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud secrets add-iam-policy-binding "${secname}" --project="${PROJECT_ID}" \
      --member="serviceAccount:${COMPUTE_SA}" --role="roles/secretmanager.secretAccessor" \
      --quiet >/dev/null 2>&1 || true
    SECRETS="${SECRETS},${envname}=${secname}:latest"
    echo "  🔗 Map secret: ${envname} ← ${secname}"
  fi
done

# ── Step 6.5: Deploy to Cloud Run using the image we just built ────
echo ""
echo "Step 6.5: Deploying ${SERVICE_NAME} to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_NAME}:${TAG}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=1Gi \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=600 \
  --cpu-boost \
  --execution-environment=gen2 \
  --update-env-vars="${ENV_VARS}" \
  --update-secrets="${SECRETS}" \
  --tag="t${TAG}" \
  --quiet

echo "✅ Cloud Run revision deployed"

# ── Step 7: (legacy mirror step — not needed anymore) ──────────
# Image is already built directly into ${IMAGE_NAME}:${TAG} by cloudbuild.yaml,
# so no mirroring needed. Keeping a noop for script compatibility.
echo ""
echo "Step 7: (skipped — image already tagged ${IMAGE_NAME}:${TAG} by cloudbuild.yaml)"

# ── Step 8: Output URL + checklist ─────────────────────────────
echo ""
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo "============================================================"
echo "  ✅ Deploy complete!"
echo "============================================================"
echo "  Service URL : ${SERVICE_URL}"
echo "  Tag         : t${TAG}"
echo ""
echo "  📋 Next steps:"
echo "  • Tail logs:"
echo "      gcloud logging read 'resource.type=cloud_run_revision' \\"
echo "        --project=${PROJECT_ID} --limit=30 --format='table(timestamp,textPayload)'"
echo ""
echo "  • Cloud Build history:"
echo "      https://console.cloud.google.com/cloud-build/builds?project=${PROJECT_ID}"
echo ""
echo "  • Cloud Run console:"
echo "      https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/logs?project=${PROJECT_ID}"
echo ""
echo "  • Roll back to a previous revision:"
echo "      gcloud run services update-traffic ${SERVICE_NAME} --region=${REGION} \\"
echo "        --to-revisions=<PREVIOUS_REVISION>=100"
echo "============================================================"
