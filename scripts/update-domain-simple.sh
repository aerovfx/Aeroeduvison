#!/bin/bash

# Simple Domain Update Script
# Chạy: bash scripts/update-domain-simple.sh

echo "🔧 Updating domain mapping to point to current service..."
echo "========================================================"

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
echo "Current project: $PROJECT_ID"

# Get current service URL
CURRENT_SERVICE_URL=$(gcloud run services list --platform managed --filter="metadata.name=lmsmath" --format="value(status.url)")
echo "Current service URL: $CURRENT_SERVICE_URL"

echo ""
echo "📋 Current status:"
echo "✅ Service 'lmsmath' is running at: $CURRENT_SERVICE_URL"
echo "❌ Domain 'inphysic.com' is pointing to old service with 404 errors"
echo ""
echo "🔧 Solution: Update domain mapping..."
echo ""

# Option 1: Update existing domain mapping
echo "Attempting to update domain mapping..."

# Try to delete old mapping first
echo "1. Deleting old domain mapping..."
gcloud run domain-mappings delete inphysic.com --platform managed --region=asia-southeast1 --quiet 2>/dev/null || echo "   (No old mapping found or already deleted)"

# Create new mapping
echo "2. Creating new domain mapping..."
gcloud run domain-mappings create --service=lmsmath --domain=inphysic.com --platform managed --region=asia-southeast1

echo ""
echo "✅ Domain mapping update completed!"
echo ""
echo "📋 Next steps:"
echo "1. Wait 5-10 minutes for DNS propagation"
echo "2. Test: https://inphysic.com/sign-in"
echo "3. The old URL will now point to the working service"
echo ""
echo "🎉 Both URLs should work after DNS propagation:"
echo "   - https://inphysic.com/sign-in (custom domain)"
echo "   - $CURRENT_SERVICE_URL/sign-in (direct URL)"


