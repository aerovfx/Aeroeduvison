#!/bin/bash

# Start FastAPI with Tesseract OCR mode
export OCR_MODE="tesseract"

echo "🚀 Starting FastAPI with REAL Tesseract OCR..."
echo "📍 Mode: $OCR_MODE"
echo "🔧 Tesseract path: /opt/homebrew/bin/tesseract"
echo ""

cd "$(dirname "$0")"
python3 main.py

