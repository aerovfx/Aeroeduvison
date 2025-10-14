#!/bin/bash

# Deploy to Google Cloud Run Script
# Chạy: bash scripts/deploy-gcp.sh

set -e

echo "🚀 Deploying to Google Cloud Run..."
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud SDK is not installed!"
    print_status "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 &> /dev/null; then
    print_error "Not authenticated with Google Cloud!"
    print_status "Login with: gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    print_error "No project set in gcloud!"
    print_status "Set project with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_status "Current project: $PROJECT_ID"
print_status "Current user: $(gcloud config get-value account)"

# Build for production first
print_status "Building for production..."
npm run build
print_success "Build completed"

# Build and push Docker image
print_status "Building Docker image..."
gcloud builds submit --config cloudbuild.yaml --project=$PROJECT_ID

print_success "=========================================="
print_success "🎉 Deployment to Google Cloud Run completed!"
print_success "=========================================="

echo ""
print_status "📋 Your app should be available at:"
echo "   https://lmsmath-[hash]-uc.a.run.app"
echo "   or your custom domain if configured"
echo ""
print_status "📚 To check deployment status:"
echo "   gcloud run services list --platform managed"
echo ""
print_status "📚 To view logs:"
echo "   gcloud run services logs tail lmsmath --platform managed"
echo ""
print_status "📚 To update environment variables:"
echo "   gcloud run services update lmsmath --platform managed --set-env-vars KEY=VALUE"




