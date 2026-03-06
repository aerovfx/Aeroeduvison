#!/bin/bash

# =============================================================================
# Cloud Run Deployment Script for lmsmath-app
# Author: Deploy Team
# Date: 2025-11-01
# Version: 2.0
# =============================================================================

set -e  # Exit on error
set -o pipefail  # Catch errors in pipes

# =============================================================================
# Configuration
# =============================================================================

PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-east1"
SERVICE_NAME="lmsmath-app"
REPOSITORY="lmsmath"
REGISTRY_HOST="asia-east1-docker.pkg.dev"

# Production domain
PRODUCTION_URL="https://inphysic.com"

# Resource limits
MEMORY="512Mi"
CPU="1"
MAX_INSTANCES="10"
MIN_INSTANCES="0"
TIMEOUT="300"

# =============================================================================
# Colors
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# Helper Functions
# =============================================================================

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# Pre-flight Checks
# =============================================================================

print_header "Pre-flight Checks"

print_info "Checking required tools..."

if ! command_exists gcloud; then
    print_error "gcloud CLI not found"
    echo "Install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command_exists docker; then
    print_error "Docker not found"
    echo "Install: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists git; then
    print_error "Git not found"
    exit 1
fi

print_success "All required tools found"

# Check if authenticated
print_info "Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

print_success "gcloud authenticated"

# =============================================================================
# Configuration
# =============================================================================

print_header "Configuration"

print_info "Setting project and region..."
gcloud config set project "$PROJECT_ID" --quiet
gcloud config set run/region "$REGION" --quiet

print_success "Project: $PROJECT_ID"
print_success "Region: $REGION"

# =============================================================================
# Docker Authentication
# =============================================================================

print_header "Docker Authentication"

print_info "Configuring Docker for Artifact Registry..."
gcloud auth configure-docker "$REGISTRY_HOST" --quiet
print_success "Docker authenticated"

# =============================================================================
# Image Tagging
# =============================================================================

print_header "Building Image"

# Get git info
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
TAG="$(date +%Y%m%d-%H%M%S)"
BUILDTIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Image names
IMAGE="$REGISTRY_HOST/$PROJECT_ID/$REPOSITORY/$SERVICE_NAME:$TAG"
LATEST_IMAGE="$REGISTRY_HOST/$PROJECT_ID/$REPOSITORY/$SERVICE_NAME:latest"

print_info "Build Information:"
echo "  Branch:      $BRANCH"
echo "  Commit:      $COMMIT_SHA"
echo "  Tag:         $TAG"
echo "  Build Time:  $BUILDTIME"
echo ""
echo "  Images:"
echo "    - $IMAGE"
echo "    - $LATEST_IMAGE"

# Confirm before building
read -p "Continue with build? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Build cancelled"
    exit 0
fi

# =============================================================================
# Docker Build
# =============================================================================

print_info "Building Docker image..."

docker build \
  --tag "$IMAGE" \
  --tag "$LATEST_IMAGE" \
  --build-arg BUILDTIME="$BUILDTIME" \
  --build-arg COMMIT_SHA="$COMMIT_SHA" \
  --platform linux/amd64 \
  .

print_success "Docker image built successfully"

# =============================================================================
# Push Image
# =============================================================================

print_header "Pushing Images"

print_info "Pushing to Artifact Registry..."

docker push "$IMAGE" &
PID1=$!
docker push "$LATEST_IMAGE" &
PID2=$!

wait $PID1
wait $PID2

print_success "Images pushed successfully"

# =============================================================================
# Deploy to Cloud Run
# =============================================================================

print_header "Deploying to Cloud Run"

print_info "Deploying service..."

# Check if secrets exist
print_info "Checking secrets..."
SECRETS_EXIST=true
gcloud secrets describe nextauth-secret --quiet 2>/dev/null || SECRETS_EXIST=false

if [ "$SECRETS_EXIST" = false ]; then
    print_warning "Secrets not found. Run setup-secrets.sh first!"
    read -p "Deploy without secrets? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Deploy command
if [ "$SECRETS_EXIST" = true ]; then
    # Deploy with secrets
    gcloud run deploy "$SERVICE_NAME" \
      --image "$IMAGE" \
      --region "$REGION" \
      --platform managed \
      --allow-unauthenticated \
      --port 3000 \
      --memory "$MEMORY" \
      --cpu "$CPU" \
      --max-instances "$MAX_INSTANCES" \
      --min-instances "$MIN_INSTANCES" \
      --timeout "$TIMEOUT" \
      --set-env-vars "NODE_ENV=production,NEXTAUTH_URL=$PRODUCTION_URL,COMMIT_SHA=$COMMIT_SHA" \
      --set-secrets "NEXTAUTH_SECRET=nextauth-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,DATABASE_URL=database-url:latest" \
      --set-labels "version=$TAG,commit=$COMMIT_SHA" \
      --quiet
else
    # Deploy without secrets
    gcloud run deploy "$SERVICE_NAME" \
      --image "$IMAGE" \
      --region "$REGION" \
      --platform managed \
      --allow-unauthenticated \
      --port 3000 \
      --memory "$MEMORY" \
      --cpu "$CPU" \
      --max-instances "$MAX_INSTANCES" \
      --min-instances "$MIN_INSTANCES" \
      --timeout "$TIMEOUT" \
      --set-env-vars "NODE_ENV=production,NEXTAUTH_URL=$PRODUCTION_URL,COMMIT_SHA=$COMMIT_SHA" \
      --set-labels "version=$TAG,commit=$COMMIT_SHA" \
      --quiet
fi

print_success "Service deployed successfully"

# =============================================================================
# Post-Deployment
# =============================================================================

print_header "Post-Deployment Checks"

print_info "Fetching service information..."

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format 'value(status.url)')

print_success "Service URL: $SERVICE_URL"

# Health check
print_info "Performing health check..."
sleep 5

MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf "${SERVICE_URL}/api/health" > /dev/null 2>&1; then
        print_success "Health check passed!"
        
        # Show health check response
        HEALTH_RESPONSE=$(curl -s "${SERVICE_URL}/api/health")
        echo "Response:"
        echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        print_warning "Health check failed (attempt $RETRY_COUNT/$MAX_RETRIES)"
        
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "Retrying in 5 seconds..."
            sleep 5
        else
            print_error "Health check failed after $MAX_RETRIES attempts"
            echo "Check logs: gcloud run logs read $SERVICE_NAME --region $REGION"
        fi
    fi
done

# =============================================================================
# Summary
# =============================================================================

print_header "Deployment Summary"

echo "  Service:        $SERVICE_NAME"
echo "  Project:        $PROJECT_ID"
echo "  Region:         $REGION"
echo "  Image:          $IMAGE"
echo "  Git Commit:     $COMMIT_SHA"
echo "  Git Branch:     $BRANCH"
echo "  Build Time:     $BUILDTIME"
echo "  Service URL:    $SERVICE_URL"
echo ""
echo "  Resources:"
echo "    Memory:       $MEMORY"
echo "    CPU:          $CPU"
echo "    Min Instance: $MIN_INSTANCES"
echo "    Max Instance: $MAX_INSTANCES"
echo "    Timeout:      ${TIMEOUT}s"

print_header "Useful Commands"

echo "  View logs:"
echo "    gcloud run logs read $SERVICE_NAME --region $REGION --limit 50"
echo ""
echo "  Stream logs:"
echo "    gcloud run logs tail $SERVICE_NAME --region $REGION"
echo ""
echo "  List revisions:"
echo "    gcloud run revisions list --service $SERVICE_NAME --region $REGION"
echo ""
echo "  Rollback:"
echo "    ./rollback.sh"

# Open browser
echo ""
read -p "Open service in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command_exists open; then
        open "$SERVICE_URL"
    elif command_exists xdg-open; then
        xdg-open "$SERVICE_URL"
    else
        print_info "Please open manually: $SERVICE_URL"
    fi
fi

print_success "🎉 Deployment completed successfully!"