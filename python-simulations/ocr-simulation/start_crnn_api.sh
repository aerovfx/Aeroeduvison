#!/bin/bash

# Start OCR API with OpenCV Zoo CRNN Model
# This provides the highest accuracy text recognition

echo "🚀 Starting OCR API with OpenCV CRNN Model..."
echo "📦 Model: text_recognition_CRNN_EN_2023feb_fp16.onnx"
echo "🔗 Source: https://github.com/opencv/opencv_zoo"
echo ""

# Set OCR mode to CRNN
export OCR_MODE=crnn

# Navigate to script directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update requirements
echo "📦 Checking dependencies..."
pip3 install -q -r requirements.txt

# Check if models directory exists
if [ ! -d "models" ]; then
    echo "📁 Creating models directory..."
    mkdir -p models
fi

# Check if EAST model exists
if [ ! -f "models/frozen_east_text_detection.pb" ]; then
    echo "⚠️  EAST model not found. Running download script..."
    bash download_east_model.sh
fi

# CRNN model will be auto-downloaded by the pipeline

echo ""
echo "✅ Starting FastAPI server with CRNN OCR..."
echo "📡 API will be available at: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "🔍 Detection Method: EAST Text Detector"
echo "📝 Recognition Method: OpenCV Zoo CRNN"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the API server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload


