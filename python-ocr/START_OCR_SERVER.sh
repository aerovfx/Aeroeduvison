#!/bin/bash
echo "🚀 Starting PaddleOCR Server..."
echo ""

cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run: ./setup.sh first"
    exit 1
fi

# Activate venv
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check dependencies
python -c "from paddleocr import PaddleOCR" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ PaddleOCR not installed!"
    echo "Run: pip install paddleocr paddlepaddle fastapi uvicorn python-multipart"
    exit 1
fi

echo "✅ Environment ready"
echo ""
echo "🔍 Starting PaddleOCR Server on port 8001..."
echo "📖 API docs: http://localhost:8001/docs"
echo "🔗 Test: http://localhost:8001/"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start server
python ocr_server.py

