#!/bin/bash

# Start OCR FastAPI Server
# Usage: ./start_api.sh

echo "🚀 Starting OCR API Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if uvicorn is installed
if ! command -v uvicorn &> /dev/null; then
    echo "❌ uvicorn not found. Installing dependencies..."
    pip3 install -r requirements.txt
fi

# Start server
echo "📡 Starting server on http://localhost:8000"
echo "📊 API docs available at http://localhost:8000/docs"
echo "🔧 WebSocket support enabled"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

python3 -m uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info

