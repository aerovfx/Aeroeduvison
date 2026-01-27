#!/bin/bash

# Deploy to Google Cloud Run
# Default Project: inphysic
# Usage: ./deploy-cloudrun.sh [PROJECT_ID] [SERVICE_NAME] [REGION]
# Example: ./deploy-cloudrun.sh inphysic lmsmath-app asia-east1
# Region default: asia-southeast1 (Singapore - Châu Á)
# CPU: 1

set -e

echo "🚀 Starting deployment to Cloud Run..."

# Configuration (overridable via args or environment)
PROJECT_ID="${1:-inphysic}"
SERVICE_NAME="${2:-lmsmath-app}"
REGION="${3:-asia-southeast1}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Set project
echo "📦 Setting GCP project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Build and push Docker image
echo "🔨 Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --port 8080 \
  --set-env-vars "NODE_ENV=production"

echo "✅ Deployment completed!"
echo ""
echo "🌐 Service URL:"
gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)'
