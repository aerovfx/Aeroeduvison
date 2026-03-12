#!/usr/bin/env bash
# ===========================================
# Deploy All Rust Services to Cloud Run
# 100% Backend Migration
# ===========================================
# Usage: ./deploy-rust-100.sh
# 
# Prerequisites:
# - gcloud CLI installed and authenticated
# - Docker installed
# - GCP project with Cloud Run API enabled
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-aeroeduvison}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_ACCOUNT="${GCP_SERVICE_ACCOUNT:-aeroeduvison-deployer@${PROJECT_ID}.iam.gserviceaccount.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=============================================="
echo "  Deploying Rust Services to Cloud Run"
echo "=============================================="
echo -e "${NC}"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Account: $SERVICE_ACCOUNT"
echo ""

# Check prerequisites
check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"
  
  if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
  fi
  
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker Desktop.${NC}"
    exit 1
  fi
  
  # Check gcloud authentication
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with gcloud. Run: gcloud auth login${NC}"
    exit 1
  fi
  
  # Check project
  CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
  if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Setting project to $PROJECT_ID...${NC}"
    gcloud config set project "$PROJECT_ID"
  fi
  
  echo -e "${GREEN}✅ Prerequisites check passed${NC}"
  echo ""
}

# Build and deploy a single service
deploy_service() {
  local SERVICE_NAME=$1
  local PORT=$2
  local MEMORY=${3:-512Mi}
  local CPU=${4:-1}
  local CONCURRENCY=${5:-80}
  local MIN_INSTANCES=${6:-1}
  local MAX_INSTANCES=${7:-10}
  
  echo -e "${BLUE}🚀 Deploying $SERVICE_NAME (port $PORT)...${NC}"
  
  SERVICE_DIR="rust-services/$SERVICE_NAME"
  
  if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${RED}❌ Service directory not found: $SERVICE_DIR${NC}"
    return 1
  fi
  
  cd "$SERVICE_DIR"
  
  # Build Docker image
  IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"
  IMAGE_TAG="$IMAGE_NAME:latest"
  
  echo -e "${YELLOW}Building Docker image...${NC}"
  docker build -t "$IMAGE_TAG" . || {
    echo -e "${RED}❌ Docker build failed for $SERVICE_NAME${NC}"
    cd ../..
    return 1
  }
  
  echo -e "${YELLOW}Pushing image to GCR...${NC}"
  docker push "$IMAGE_TAG" || {
    echo -e "${RED}❌ Docker push failed for $SERVICE_NAME${NC}"
    cd ../..
    return 1
  }
  
  echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
  gcloud run deploy "$SERVICE_NAME" \
    --image "$IMAGE_TAG" \
    --platform managed \
    --region "$REGION" \
    --port "$PORT" \
    --allow-unauthenticated \
    --memory "$MEMORY" \
    --cpu "$CPU" \
    --concurrency "$CONCURRENCY" \
    --timeout 300 \
    --min-instances "$MIN_INSTANCES" \
    --max-instances "$MAX_INSTANCES" \
    --set-env-vars "PORT=$PORT" \
    --service-account "$SERVICE_ACCOUNT" || {
    echo -e "${RED}❌ Cloud Run deployment failed for $SERVICE_NAME${NC}"
    cd ../..
    return 1
  }
  
  # Get service URL
  SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --platform managed \
    --region "$REGION" \
    --format 'value(status.url)')
  
  echo -e "${GREEN}✅ Deployed: $SERVICE_URL${NC}"
  cd ../..
  
  # Return service URL for environment file
  echo "$SERVICE_NAME:$SERVICE_URL"
}

# Main deployment
main() {
  check_prerequisites
  
  # Array of services to deploy
  # Format: "service_name:port:memory:cpu:concurrency:min_instances:max_instances"
  declare -a SERVICES=(
    "aero-backend:8090:512Mi:1:80:1:10"
    "vector-sim-service:8091:512Mi:1:80:1:10"
    "auth-service:8092:512Mi:1:80:2:20"
    "course-service:8093:512Mi:1:80:1:10"
    "admin-service:8094:512Mi:1:80:1:10"
    "ai-service:8095:1Gi:2:80:2:20"
    "student-service:8096:512Mi:1:80:1:10"
    "stem-service:8097:512Mi:1:80:1:10"
    "media-service:8098:512Mi:1:80:1:10"
  )
  
  declare -a DEPLOYED_URLS=()
  
  echo -e "${BLUE}=============================================="
  echo "  Starting Deployment"
  echo "=============================================="
  echo -e "${NC}"
  
  for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r SERVICE_NAME PORT MEMORY CPU CONCURRENCY MIN_INST MAX_INST <<< "$service_info"
    
    RESULT=$(deploy_service "$SERVICE_NAME" "$PORT" "$MEMORY" "$CPU" "$CONCURRENCY" "$MIN_INST" "$MAX_INST")
    if [ $? -eq 0 ]; then
      # Extract URL from result (last line)
      SERVICE_URL=$(echo "$RESULT" | tail -1)
      DEPLOYED_URLS+=("$SERVICE_NAME=$SERVICE_URL")
    else
      echo -e "${RED}❌ Failed to deploy $SERVICE_NAME${NC}"
      echo -e "${YELLOW}Continuing with next service...${NC}"
    fi
    
    echo ""
  done
  
  # Print summary
  echo -e "${BLUE}=============================================="
  echo "  Deployment Complete!"
  echo "=============================================="
  echo -e "${NC}"
  
  echo -e "${GREEN}Deployed Services:${NC}"
  for url_info in "${DEPLOYED_URLS[@]}"; do
    echo "  - $url_info"
  done
  
  echo ""
  echo -e "${YELLOW}=============================================="
  echo "  Next Steps"
  echo "=============================================="
  echo -e "${NC}"
  echo "1. Update .env.production with Cloud Run URLs:"
  echo ""
  echo "   # Copy these to .env.production"
  for url_info in "${DEPLOYED_URLS[@]}"; do
    SERVICE_NAME=$(echo "$url_info" | cut -d'=' -f1)
    SERVICE_URL=$(echo "$url_info" | cut -d'=' -f2)
    VAR_NAME="RUST_${SERVICE_NAME^^}_URL"
    echo "   $VAR_NAME=$SERVICE_URL"
  done
  
  echo ""
  echo "2. Test health endpoints:"
  for url_info in "${DEPLOYED_URLS[@]}"; do
    SERVICE_URL=$(echo "$url_info" | cut -d'=' -f2)
    echo "   curl $SERVICE_URL/health"
  done
  
  echo ""
  echo "3. Update canary configuration in .env.production:"
  echo "   ENABLE_RUST_CANARY_PROXY=true"
  echo "   RUST_CANARY_PERCENT=10  # Start with 10%"
  echo ""
  echo "4. Monitor and gradually increase canary percentage:"
  echo "   10% → 25% → 50% → 100%"
  echo ""
  echo "5. Once confident, set RUST_CANARY_PERCENT=100 for full migration"
  echo ""
}

# Run main function
main "$@"
