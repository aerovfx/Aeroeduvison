#!/bin/bash

# Download EAST Text Detection Model

echo "📥 Downloading EAST Text Detection Model..."
echo ""

# Create models directory
mkdir -p models

# Download from OpenCV repository
EAST_URL="https://github.com/oyyd/frozen_east_text_detection.pb/raw/master/frozen_east_text_detection.pb"

echo "🔗 Downloading from: $EAST_URL"
echo "📁 Saving to: models/frozen_east_text_detection.pb"
echo ""

curl -L -o models/frozen_east_text_detection.pb "$EAST_URL"

if [ -f "models/frozen_east_text_detection.pb" ]; then
    file_size=$(ls -lh models/frozen_east_text_detection.pb | awk '{print $5}')
    echo ""
    echo "✅ Download complete!"
    echo "📦 File size: $file_size"
    echo "📍 Location: $(pwd)/models/frozen_east_text_detection.pb"
else
    echo ""
    echo "❌ Download failed!"
    echo "Please download manually from:"
    echo "https://github.com/oyyd/frozen_east_text_detection.pb"
fi

