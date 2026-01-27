#!/bin/bash
#
# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║                    🚀 AEROEDUVISION - DEPLOYMENT SCRIPT                       ║
# ╠═══════════════════════════════════════════════════════════════════════════════╣
# ║  Script deploy ứng dụng AeroeduVision lên Google Cloud Run                   ║
# ║  - Build Docker image mới (bao gồm các code fix mới nhất)                     ║
# ║  - Tự động cập nhật Secret Manager từ .env.local                              ║
# ║  - Cấu hình Redis, GCS, và Auth                                               ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝
#

set -euo pipefail

# 🎨 COLORS
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# 🔧 CONFIGURATION
PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-southeast1"
SERVICE_NAME="aeroeduvision"
SERVICE_ACCOUNT="ci-deployer@gen-lang-client-0712182643.iam.gserviceaccount.com"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME:latest"

# Load .env.local if exists
if [ -f .env.local ]; then
    echo -e "${BLUE}ℹ️  Loading variables from .env.local${NC}"
    export $(grep -v '^#' .env.local | xargs)
fi

log_step() {
    echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}📋 $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

ensure_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if [[ -z "$secret_value" ]]; then
        echo -e "${YELLOW}⚠️  Warning: $secret_name is empty, skipping...${NC}"
        return
    fi

    if ! gcloud secrets describe "$secret_name" &>/dev/null 2>&1; then
        echo -e "${CYAN}Creating secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=- --quiet
    else
        echo -e "${GREEN}Updating secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --quiet
    fi
    
    gcloud secrets add-iam-policy-binding "$secret_name" \
        --member="serviceAccount:$SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet 2>/dev/null || true
}

echo -e "${BLUE}🚀 Starting AeroeduVision Deployment...${NC}"

# Set project
gcloud config set project "$PROJECT_ID" --quiet

log_step "STEP 1: Building and Pushing Docker Image"
# Build image locally
echo -e "${BLUE}Building Docker image: $IMAGE_NAME${NC}"
docker build --platform linux/amd64 -t "$IMAGE_NAME" .
echo -e "${BLUE}Pushing image to Google Container Registry...${NC}"
docker push "$IMAGE_NAME"

log_step "STEP 2: Syncing Secrets to Google Cloud"
ensure_secret "DATABASE_URL" "${DATABASE_URL:-}"
ensure_secret "NEXTAUTH_SECRET" "${NEXTAUTH_SECRET:-}"
ensure_secret "REDIS_URL" "${REDIS_URL:-}"
ensure_secret "GOOGLE_CLIENT_ID" "${GOOGLE_CLIENT_ID:-}"
ensure_secret "GOOGLE_CLIENT_SECRET" "${GOOGLE_CLIENT_SECRET:-}"
ensure_secret "GEMINI_API_KEY" "${GEMINI_API_KEY:-}"
ensure_secret "OPENAI_API_KEY" "${OPENAI_API_KEY:-}"
ensure_secret "OPENAI_BASE_URL" "${OPENAI_BASE_URL:-}"
ensure_secret "AI_PREFERRED_PROVIDER" "${AI_PREFERRED_PROVIDER:-}"
ensure_secret "NEXT_PUBLIC_TRACKING_SERVER_URL" "${NEXT_PUBLIC_TRACKING_SERVER_URL:-}"

log_step "STEP 3: Deploying to Cloud Run"
EXISTING_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)" 2>/dev/null || echo "")

gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_NAME" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --port 3000 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --concurrency 80 \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "NEXT_TELEMETRY_DISABLED=1" \
    --set-env-vars "NEXTAUTH_URL=${EXISTING_URL}" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
    --set-secrets "NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest" \
    --set-secrets "REDIS_URL=REDIS_URL:latest" \
    --set-secrets "GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest" \
    --set-secrets "GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest" \
    --set-secrets "GEMINI_API_KEY=GEMINI_API_KEY:latest" \
    --set-secrets "OPENAI_API_KEY=OPENAI_API_KEY:latest" \
    --set-secrets "OPENAI_BASE_URL=OPENAI_BASE_URL:latest" \
    --set-secrets "AI_PREFERRED_PROVIDER=AI_PREFERRED_PROVIDER:latest" \
    --set-secrets "NEXT_PUBLIC_TRACKING_SERVER_URL=NEXT_PUBLIC_TRACKING_SERVER_URL:latest" \
    --quiet

FINAL_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)")

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    🎉 DEPLOYMENT SUCCESSFUL!                                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "\n${CYAN}🌐 Service URL: ${BOLD}$FINAL_URL${NC}"
echo ""
