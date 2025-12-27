#!/bin/bash

# Deploy LMS Math to Google Cloud Run
# Target: https://lmsmath-442514522574.asia-southeast1.run.app

set -e  # Exit on error

echo "🚀 Deploying LMS Math to Google Cloud Run..."
echo ""

# Configuration
PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-southeast1"
SERVICE_NAME="lmsmath"
SERVICE_URL="https://lmsmath-442514522574.asia-southeast1.run.app"

echo "📋 Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo "  URL: $SERVICE_URL"
echo ""

# Step 1: Update DATABASE_URL secret
echo "Step 1: Updating DATABASE_URL secret..."
echo "postgres://52f7a77efc0e442de6cbe8cfd9e2f0e12c74123e84c968f1ea8613822002ff37:sk_i547PiMN1m5xsBcFdDjR8@db.prisma.io:5432/postgres?sslmode=require" | \
  gcloud secrets versions add DATABASE_URL --data-file=- --project=$PROJECT_ID
echo "✅ DATABASE_URL updated"
echo ""

# Step 2: Verify secrets exist
echo "Step 2: Verifying required secrets..."
REQUIRED_SECRETS=("DATABASE_URL" "NEXTAUTH_SECRET")

for secret in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe $secret --project=$PROJECT_ID &>/dev/null; then
    echo "  ✅ $secret exists"
  else
    echo "  ❌ $secret missing!"
    exit 1
  fi
done
echo ""

# Step 3: Build and deploy using Cloud Build
echo "Step 3: Triggering Cloud Build..."
echo "  This will build the Docker image and deploy to Cloud Run"
echo "  Expected time: 5-10 minutes"
echo ""

gcloud builds submit \
  --config cloudbuild.yaml \
  --project=$PROJECT_ID \
  --region=$REGION

echo ""
echo "✅ Deployment triggered successfully!"
echo ""

# Step 4: Wait for deployment
echo "Step 4: Waiting for deployment to complete..."
sleep 10

# Step 5: Get service status
echo "Step 5: Checking service status..."
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format="value(status.url)"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📊 Service URL: $SERVICE_URL"
echo ""
echo "🧪 Post-deployment checklist:"
echo "  1. Test homepage: curl -I $SERVICE_URL"
echo "  2. Test sign-in: $SERVICE_URL/sign-in"
echo "  3. Test API: $SERVICE_URL/api/auth/session"
echo "  4. Check logs: gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo ""
echo "✨ Ready to test!"

