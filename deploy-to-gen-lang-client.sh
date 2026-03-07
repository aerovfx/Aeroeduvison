#!/bin/bash
set -eo pipefail

###############################################################################
# deploy-to-gen-lang-client.sh
# Purpose: Deploy AeroeduVision to gen-lang-client-0712182643 on Cloud Run
# Usage: ./deploy-to-gen-lang-client.sh [REGION] [IMAGE_TAG]
# Examples:
#   ./deploy-to-gen-lang-client.sh
#   ./deploy-to-gen-lang-client.sh asia-southeast1 v1.0.0
###############################################################################

# Configuration
PROJECT_ID="gen-lang-client-0712182643"
SERVICE_NAME="lmsmath-app"
REGION="${1:-asia-southeast1}"
IMAGE_TAG="${2:-latest}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function
function print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
}

function print_step() {
    echo -e "${YELLOW}⏳ $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Main deployment
print_section "🚀 Deploying AeroeduVision to $PROJECT_ID"

echo ""
echo "📋 Configuration:"
echo "   Project ID: $PROJECT_ID"
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"
echo "   Image: $IMAGE_NAME:$IMAGE_TAG"
echo ""

# Check prerequisites
print_step "Verifying prerequisites..."
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    print_error "Docker not found"
    exit 1
fi

print_success "All prerequisites met"

# Set GCP project
print_step "Setting GCP project..."
gcloud config set project $PROJECT_ID
print_success "Project set"

# Check .env file
print_step "Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_error ".env file not found"
    echo "   Create it with: cp env.example .env"
    exit 1
fi
print_success "Environment file found"

# Build Docker image
print_section "🐳 Building Docker Image"
print_step "Building for amd64..."
docker build --platform linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} .
print_success "Docker image built"

# Push to Container Registry
print_section "📤 Pushing to Container Registry"
print_step "Pushing ${IMAGE_NAME}:${IMAGE_TAG}..."
docker push ${IMAGE_NAME}:${IMAGE_TAG}
print_success "Image pushed to Container Registry"

# Deploy to Cloud Run
print_section "☁️  Deploying to Cloud Run"
print_step "Deploying service..."

# Check if we have .env.production or .env
ENV_FILE=".env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Build env vars string for deployment
ENV_VARS="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,HOSTNAME=0.0.0.0"

# Add GOOGLE_CLOUD_PROJECT_ID if it exists
if [ -n "$GOOGLE_CLOUD_PROJECT_ID" ]; then
    ENV_VARS="${ENV_VARS},GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}"
fi

# Add Auth variables
ENV_VARS="${ENV_VARS},AUTH_TRUST_HOST=true"

if [ -n "$NEXTAUTH_URL" ]; then
    ENV_VARS="${ENV_VARS},NEXTAUTH_URL=${NEXTAUTH_URL}"
fi

if [ -n "$NEXTAUTH_SECRET" ]; then
    ENV_VARS="${ENV_VARS},NEXTAUTH_SECRET=${NEXTAUTH_SECRET}"
fi

if [ -n "$GOOGLE_CLIENT_ID" ]; then
    ENV_VARS="${ENV_VARS},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"
fi


if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    ENV_VARS="${ENV_VARS},GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}"
fi

if [ -n "$DATABASE_URL" ]; then
    ENV_VARS="${ENV_VARS},DATABASE_URL=${DATABASE_URL}"
fi


# Deploy
# Deploy
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:${IMAGE_TAG} \
    --platform managed \
    --region ${REGION} \
    --cpu 1 \
    --memory 512Mi \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --port 3000 \
    --allow-unauthenticated \
    --service-account "cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --set-env-vars ${ENV_VARS} \
    --project ${PROJECT_ID} \
    --quiet

print_success "Service deployed"

# Get service URL
print_section "📍 Service Information"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --region ${REGION} \
    --format 'value(status.url)' \
    --project ${PROJECT_ID})

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📋 Quick Commands:"
echo "   View logs:"
echo "      gcloud run services logs read ${SERVICE_NAME} --region ${REGION} --limit=50"
echo ""
echo "   Update environment:"
echo "      gcloud run services update ${SERVICE_NAME} --region ${REGION} --set-env-vars KEY=VALUE"
echo ""
echo "   View service:"
echo "      gcloud run services describe ${SERVICE_NAME} --region ${REGION}"
echo ""
echo "🧪 Test the deployment:"
echo "   curl ${SERVICE_URL}/health"
echo ""
echo "═══════════════════════════════════════════════════════════════"
