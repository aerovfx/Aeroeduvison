#!/bin/bash

# GCS CORS Setup Script for Math LMS
echo "🚀 Setting up CORS for GCS bucket: mathvideostore"

# Create CORS configuration
cat > cors.json << 'EOF'
[
  {
    "origin": ["http://localhost:3000", "https://your-domain.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Range", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF

echo "✅ CORS configuration file created"

# Apply CORS to bucket
echo "📡 Applying CORS policy to bucket..."
gsutil cors set cors.json gs://mathvideostore

if [ $? -eq 0 ]; then
    echo "✅ CORS policy applied successfully"
else
    echo "❌ Failed to apply CORS policy"
    exit 1
fi

# Make bucket publicly readable for demo
echo "🌐 Making bucket publicly readable for demo..."
gsutil iam ch allUsers:objectViewer gs://mathvideostore

if [ $? -eq 0 ]; then
    echo "✅ Bucket is now publicly readable"
else
    echo "⚠️  Failed to make bucket public (might already be public)"
fi

# Clean up
rm -f cors.json

echo ""
echo "🎉 GCS CORS Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "  1. Make sure your .env.local file has the correct GCS configuration"
echo "  2. Start your development server: npm run dev"
echo "  3. Test upload at: http://localhost:3000/test-gcs-video"
echo ""
echo "🔧 Configuration needed in .env.local:"
echo "  GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0712182643"
echo "  GOOGLE_CLOUD_KEY_FILE=./gen-lang-client-0712182643-47b71bba4d28.json"
echo "  GCS_BUCKET_NAME=mathvideostore"
echo "  NEXT_PUBLIC_GCS_BUCKET_NAME=mathvideostore"
