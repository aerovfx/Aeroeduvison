#!/bin/bash

# Create CORS policy file in Cloud Shell
cat > cors.json << 'EOF'
[
  {
    "origin": ["http://localhost:3000", "https://myapp.vercel.app"],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable", "Authorization", "x-goog-content-length-range", "x-goog-algorithm", "x-goog-credential", "x-goog-date", "x-goog-expires", "x-goog-signedheaders", "x-goog-signature"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS policy
gsutil cors set cors.json gs://mathvideostore

# Verify CORS policy
echo "Current CORS policy:"
gsutil cors get gs://mathvideostore
