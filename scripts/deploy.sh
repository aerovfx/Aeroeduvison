#!/bin/bash

# Deploy LMS Math Application to Google Cloud Run
# Make sure you have run setup-gcp-secrets.sh first

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    print_error "No GCP project is set. Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Configuration
SERVICE_NAME="lmsmath"
REGION="asia-southeast1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

print_header "Deploying $SERVICE_NAME to Google Cloud Run"
print_status "Project: $PROJECT_ID"
print_status "Region: $REGION"
print_status "Service: $SERVICE_NAME"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Build and push using Cloud Build
print_status "Building and pushing container image..."
gcloud builds submit --tag "$IMAGE_NAME:latest" .

# Deploy to Cloud Run
print_status "Deploying to Cloud Run..."

# Get the latest image digest
IMAGE_DIGEST=$(gcloud container images list-tags "$IMAGE_NAME" --limit=1 --format="get(digest)")
FULL_IMAGE="$IMAGE_NAME@$IMAGE_DIGEST"

print_status "Deploying image: $FULL_IMAGE"

gcloud run deploy "$SERVICE_NAME" \
    --image "$FULL_IMAGE" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 10 \
    --concurrency 100 \
    --timeout 300 \
    --set-env-vars "NODE_ENV=production,PORT=3000,GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest" \
    --set-secrets "MUX_TOKEN_ID=MUX_TOKEN_ID:latest,MUX_TOKEN_SECRET=MUX_TOKEN_SECRET:latest" \
    --set-secrets "UPLOADTHING_SECRET=UPLOADTHING_SECRET:latest,UPLOADTHING_APP_ID=UPLOADTHING_APP_ID:latest" \
    --set-secrets "STRIPE_API_KEY=STRIPE_API_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest" \
    --set-secrets "GCS_BUCKET_NAME=GCS_BUCKET_NAME:latest" \
    --quiet

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="get(status.url)")

print_status "Deployment completed successfully!"
print_header "Service Information:"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"
echo "URL: $SERVICE_URL"

print_warning "Post-deployment steps:"
echo "1. Run database migrations if needed:"
echo "   gcloud run jobs execute migrate-db --region=$REGION"
echo ""
echo "2. Set up custom domain (optional):"
echo "   gcloud run domain-mappings create --service=$SERVICE_NAME --domain=yourdomain.com --region=$REGION"
echo ""
echo "3. Configure environment-specific settings in the Cloud Console"
echo ""
echo "4. Set up monitoring and alerting"

print_status "Your application is now live at: $SERVICE_URL"








