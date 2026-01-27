#!/bin/bash

# Script to view Cloud Run logs for aeroeduvision service

PROJECT_ID="gen-lang-client-0712182643"
REGION="asia-southeast1"
SERVICE_NAME="aeroeduvision"

echo "📋 Fetching recent logs from Cloud Run service: $SERVICE_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get logs from Cloud Logging
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --project=$PROJECT_ID \
  --limit=50 \
  --format="table(timestamp, severity, textPayload)" \
  --freshness=10m

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Tip: Look for lines with 'SIGNIN', 'JWT', 'SESSION', 'ERROR', or 'OAuthCallback'"
