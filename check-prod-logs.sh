#!/bin/bash
PROJECT_ID="gen-lang-client-0712182643"
SERVICE_NAME="lmsmath-app"
REGION="asia-southeast1"

echo "📋 Fetching logs for $SERVICE_NAME..."
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME" \
  --project=$PROJECT_ID \
  --limit=50 \
  --format="table(timestamp, textPayload)" \
  --freshness=30m
