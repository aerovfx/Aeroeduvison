#!/bin/bash
# Setup script for PaddleOCR service

echo "🚀 Setting up PaddleOCR Service..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate venv
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 To start the OCR server:"
echo "   source venv/bin/activate"
echo "   python ocr_server.py"
echo ""
echo "🔗 Server will run on: http://localhost:8001"
echo "📖 API docs: http://localhost:8001/docs"

