#!/bin/bash

# Deploy to Google Cloud Run
# Usage: ./deploy.sh [PROJECT_ID]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project ID from argument or environment
PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT}}

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: PROJECT_ID is required${NC}"
    echo "Usage: ./deploy.sh [PROJECT_ID]"
    echo "Or set GOOGLE_CLOUD_PROJECT environment variable"
    exit 1
fi

echo -e "${BLUE}🚀 Starting deployment to Google Cloud Run${NC}"
echo -e "${BLUE}Project ID: ${PROJECT_ID}${NC}"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting project to ${PROJECT_ID}...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Check if secrets exist, if not create them
echo -e "${YELLOW}Checking secrets...${NC}"

# List of required secrets
SECRETS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET" 
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "UPLOADTHING_SECRET"
    "UPLOADTHING_APP_ID"
    "STRIPE_API_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "GCS_BUCKET_NAME"
)

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo "Please create .env.local with your environment variables"
    exit 1
fi

# Function to create secret if it doesn't exist
create_secret_if_not_exists() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe $secret_name --quiet 2>/dev/null; then
        echo -e "${GREEN}✓ Secret $secret_name already exists${NC}"
    else
        echo -e "${YELLOW}Creating secret $secret_name...${NC}"
        echo "$secret_value" | gcloud secrets create $secret_name --data-file=-
        echo -e "${GREEN}✓ Secret $secret_name created${NC}"
    fi
}

# Create secrets from .env.local
echo -e "${YELLOW}Creating/updating secrets from .env.local...${NC}"
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^[[:space:]]*# ]] && continue
    [[ -z $key ]] && continue
    
    # Remove quotes from value
    value=$(echo "$value" | sed 's/^"//;s/"$//')
    
    # Create secret if it's in our required list
    if [[ " ${SECRETS[@]} " =~ " ${key} " ]]; then
        create_secret_if_not_exists "$key" "$value"
    fi
done < .env.local

# Create GCS bucket if it doesn't exist
BUCKET_NAME="${PROJECT_ID}-lmsmath-storage"
echo -e "${YELLOW}Checking GCS bucket...${NC}"
if ! gsutil ls -b gs://$BUCKET_NAME 2>/dev/null; then
    echo -e "${YELLOW}Creating GCS bucket: $BUCKET_NAME...${NC}"
    gsutil mb -p $PROJECT_ID -c STANDARD -l asia-southeast1 gs://$BUCKET_NAME
    echo -e "${GREEN}✓ GCS bucket created${NC}"
else
    echo -e "${GREEN}✓ GCS bucket already exists${NC}"
fi

# Set up Cloud Build trigger (optional)
echo -e "${YELLOW}Setting up Cloud Build...${NC}"

# Submit build
echo -e "${YELLOW}Submitting build to Cloud Build...${NC}"
gcloud builds submit \
    --config cloudbuild.yaml \
    --region=asia-southeast1

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}Your app should be available at:${NC}"
echo -e "${BLUE}https://lmsmath-[hash]-uc.a.run.app${NC}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe lmsmath --region=asia-southeast1 --format='value(status.url)' 2>/dev/null || echo "")
if [ ! -z "$SERVICE_URL" ]; then
    echo -e "${GREEN}🌐 Service URL: $SERVICE_URL${NC}"
fi

echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "${YELLOW}1. Set up your database (PostgreSQL)${NC}"
echo -e "${YELLOW}2. Run database migrations: gcloud run jobs create migrate --image gcr.io/$PROJECT_ID/lmsmath:latest --region asia-southeast1${NC}"
echo -e "${YELLOW}3. Test your deployment${NC}"

