#!/bin/bash

# Script to make GCS bucket public for image access
# Run this in Google Cloud Shell

echo "🔧 Making GCS bucket public for image access..."

# Set project ID
PROJECT_ID="gen-lang-client-0712182643"
BUCKET_NAME="mathvideostore"

echo "📋 Project: $PROJECT_ID"
echo "📋 Bucket: $BUCKET_NAME"

# Set project
gcloud config set project $PROJECT_ID

echo "✅ Project set to: $PROJECT_ID"

# Make bucket public for read access
echo "🔓 Making bucket public for read access..."
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

echo "✅ Bucket $BUCKET_NAME is now public for read access"

# Verify bucket permissions
echo "🔍 Verifying bucket permissions..."
gsutil iam get gs://$BUCKET_NAME

echo "🎉 Done! Images should now be accessible publicly."
echo "🧪 Test with: curl -I https://storage.googleapis.com/$BUCKET_NAME/course-images/[filename].png"
