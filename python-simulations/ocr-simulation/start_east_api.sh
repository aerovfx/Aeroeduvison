#!/bin/bash

# Start FastAPI with EAST + Tesseract OCR mode (BEST)
export OCR_MODE="east"

echo "🚀 Starting FastAPI with EAST Text Detector + Tesseract OCR..."
echo "📍 Mode: $OCR_MODE (BEST quality)"
echo "🔧 EAST: Deep learning text detection"
echo "🔧 Tesseract: Text recognition"
echo ""

# Check if EAST model exists
if [ ! -f "models/frozen_east_text_detection.pb" ]; then
    echo "⚠️  EAST model not found!"
    echo "📥 Downloading EAST model..."
    echo ""
    ./download_east_model.sh
    echo ""
fi

cd "$(dirname "$0")"
python3 main.py

