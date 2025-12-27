#!/bin/bash

# Deploy Vision Tracking Server to Cloud Run
# Usage: ./deploy.sh [CAMERA_URL]

set -e

PROJECT_ID=${GCP_PROJECT_ID:-"your-project-id"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="vision-tracking-server"
CAMERA_URL=${1:-"0"}

echo "🚀 Deploying Vision Tracking Server to Cloud Run"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Camera URL: $CAMERA_URL"

# Build and deploy using Cloud Build
gcloud run deploy $SERVICE_NAME \
    --source . \
    --project $PROJECT_ID \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --cpu 8 \
    --memory 16Gi \
    --timeout 3600 \
    --concurrency 80 \
    --max-instances 1 \
    --min-instances 0 \
    --set-env-vars="CAMERA_URL=$CAMERA_URL,TARGET_FPS=15" \
    --port 8080

echo "✅ Deployment complete!"

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --project $PROJECT_ID \
    --region $REGION \
    --format 'value(status.url)')

echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo "🔌 WebSocket: ${SERVICE_URL/https/wss}/ws/tracking"
echo ""
echo "Test with:"
echo "  curl $SERVICE_URL"
echo "  wscat -c ${SERVICE_URL/https/wss}/ws/tracking"
