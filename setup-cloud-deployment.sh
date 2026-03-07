#!/bin/bash
set -eo pipefail

###############################################################################
# setup-cloud-deployment.sh
# Purpose: Setup Google Cloud Project for AeroeduVision deployment
# Usage: ./setup-cloud-deployment.sh
# Project: gen-lang-client-0712182643
###############################################################################

PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-southeast1"
ARTIFACT_REPO="lmsmath"

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 Setting up Google Cloud for AeroeduVision"
echo "═══════════════════════════════════════════════════════════════"
echo "📍 Project ID: $PROJECT_ID"
echo "📍 Region: $REGION"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install Google Cloud SDK.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ gcloud CLI found${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found. Some features may not work.${NC}"
fi

# Set project
echo ""
echo "🌍 Setting GCP project..."
gcloud config set project $PROJECT_ID
echo -e "${GREEN}✅ Project set to $PROJECT_ID${NC}"

# Authenticate
echo ""
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo "📍 Authenticate with: gcloud auth login"
    gcloud auth login
fi
echo -e "${GREEN}✅ Authenticated${NC}"

# Enable required APIs
echo ""
echo "🚀 Enabling required APIs..."
APIs=(
    "run.googleapis.com"
    "containerregistry.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "compute.googleapis.com"
    "servicenetworking.googleapis.com"
)

for api in "${APIs[@]}"; do
    echo "  ⏳ Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID || true
done
echo -e "${GREEN}✅ APIs enabled${NC}"

# Create Artifact Registry repository if it doesn't exist
echo ""
echo "📦 Checking Artifact Registry..."
if ! gcloud artifacts repositories describe $ARTIFACT_REPO \
    --location=$REGION \
    --project=$PROJECT_ID &> /dev/null; then
    echo "  Creating repository: $ARTIFACT_REPO..."
    gcloud artifacts repositories create $ARTIFACT_REPO \
        --repository-format=docker \
        --location=$REGION \
        --project=$PROJECT_ID \
        --description="AeroeduVision Docker images"
    echo -e "${GREEN}✅ Repository created${NC}"
else
    echo -e "${GREEN}✅ Repository already exists${NC}"
fi

# Configure Docker authentication
echo ""
echo "🐳 Configuring Docker authentication..."
gcloud auth configure-docker $REGION-docker.pkg.dev
echo -e "${GREEN}✅ Docker configured${NC}"

# Grant Cloud Run admin role
echo ""
echo "👤 Configuring IAM roles..."
CURRENT_PROJECT=$(gcloud config get-value project)
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format='value(account)')

if [ -z "$ACCOUNT" ]; then
    echo -e "${RED}❌ No active account found. Please authenticate with gcloud auth login${NC}"
    exit 1
fi

# Get service account if using service account key
if [ -f "gen-lang-client-0712182643-47b71bba4d28.json" ]; then
    echo "  📝 Found service account key, extracting service account..."
    ACCOUNT=$(grep -o '"client_email":"[^"]*' gen-lang-client-0712182643-47b71bba4d28.json | cut -d'"' -f4)
    echo "  Using service account: $ACCOUNT"
fi

echo "  Account: $ACCOUNT"

# Grant necessary roles
ROLES=(
    "roles/run.admin"
    "roles/artifactregistry.writer"
    "roles/storage.admin"
    "roles/iam.serviceAccountUser"
)

for role in "${ROLES[@]}"; do
    echo "  ⏳ Granting $role..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member=serviceAccount:$ACCOUNT \
        --role=$role \
        --quiet 2>/dev/null || true
done
echo -e "${GREEN}✅ IAM roles configured${NC}"

# Create docker buildx builder (if docker available)
if command -v docker &> /dev/null; then
    echo ""
    echo "🔨 Setting up Docker buildx..."
    if ! docker buildx ls | grep -q multiplatform; then
        echo "  Creating multiplatform builder..."
        docker buildx create --name multiplatform --use
    else
        echo "  Using existing multiplatform builder..."
        docker buildx use multiplatform
    fi
    echo -e "${GREEN}✅ Docker buildx configured${NC}"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 Next steps:"
echo "   1. Configure environment variables:"
echo "      cp env.example .env"
echo "      nano .env"
echo ""
echo "   2. Deploy:"
echo "      ./deploy-local-amd64.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
