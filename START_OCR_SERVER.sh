#!/bin/bash
echo "🚀 Starting Hybrid OCR Server..."
echo ""

cd python-ocr

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run: ./setup.sh first"
    exit 1
fi

# Activate venv
source venv/bin/activate

# Check if dependencies installed
python -c "import paddleocr" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ PaddleOCR not installed!"
    echo "Run: pip install paddleocr paddlepaddle fastapi uvicorn python-multipart pillow"
    exit 1
fi

echo "✅ Environment ready"
echo ""
echo "🔍 Starting Hybrid OCR Server on port 8001..."
echo "📖 API docs: http://localhost:8001/docs"
echo ""

# Start server
python ocr_server_hybrid.py
