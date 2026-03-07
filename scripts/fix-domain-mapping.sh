#!/bin/bash

# Fix Domain Mapping Script
# Chạy: bash scripts/fix-domain-mapping.sh

set -e

echo "🔧 Fixing Domain Mapping..."
echo "============================"

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

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    print_error "No project set in gcloud!"
    exit 1
fi

print_status "Current project: $PROJECT_ID"

# Get the current service URL
CURRENT_SERVICE_URL=$(gcloud run services list --platform managed --filter="metadata.name=lmsmath" --format="value(status.url)")
print_status "Current service URL: $CURRENT_SERVICE_URL"

echo ""
print_status "🔍 Checking domain mappings..."

# Check if domain mapping exists
if gcloud run domain-mappings describe inphysic.com --platform managed --region=asia-southeast1 &>/dev/null; then
    print_status "Found existing domain mapping for inphysic.com"
    
    # Get current mapping
    CURRENT_MAPPING=$(gcloud run domain-mappings describe inphysic.com --platform managed --region=asia-southeast1 --format="value(spec.routeTraffic[0].serviceName)")
    print_status "Current mapping points to: $CURRENT_MAPPING"
    
    # Update the mapping to point to current service
    print_status "Updating domain mapping to point to current service..."
    
    # Delete old mapping
    print_status "Deleting old domain mapping..."
    gcloud run domain-mappings delete inphysic.com --platform managed --region=asia-southeast1 --quiet
    
    # Create new mapping
    print_status "Creating new domain mapping..."
    gcloud run domain-mappings create --service=lmsmath --domain=inphysic.com --platform managed
    
    print_success "✅ Domain mapping updated successfully!"
    
else
    print_warning "No existing domain mapping found for inphysic.com"
    print_status "Creating new domain mapping..."
    
    gcloud run domain-mappings create --service=lmsmath --domain=inphysic.com --platform managed
    
    print_success "✅ New domain mapping created!"
fi

echo ""
print_success "=========================================="
print_success "🎉 Domain mapping fix completed!"
print_success "=========================================="

echo ""
print_status "📋 Next steps:"
echo "1. Wait 5-10 minutes for DNS propagation"
echo "2. Test: https://inphysic.com/sign-in"
echo "3. The old URL will still work but points to new service"
echo ""
print_status "📚 To check mapping status:"
echo "   gcloud run domain-mappings describe inphysic.com --platform managed --region=asia-southeast1"
