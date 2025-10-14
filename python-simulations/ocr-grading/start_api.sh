#!/bin/bash

# OCR Auto-Grading API Startup Script

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     🎓 OCR AUTO-GRADING SYSTEM - STARTING UP           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${GREEN}✅ Activating virtual environment...${NC}"
source venv/bin/activate

# Install/upgrade dependencies
echo -e "${GREEN}📥 Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check if Tesseract is installed (optional)
if command -v tesseract &> /dev/null; then
    echo -e "${GREEN}✅ Tesseract OCR detected${NC}"
    tesseract --version | head -1
else
    echo -e "${YELLOW}⚠️  Tesseract not found. Using EasyOCR only.${NC}"
    echo "   To install Tesseract:"
    echo "   - macOS: brew install tesseract"
    echo "   - Ubuntu: sudo apt install tesseract-ocr"
    echo "   - Windows: Download from GitHub"
fi

echo ""
echo -e "${GREEN}🚀 Starting OCR Auto-Grading API Server...${NC}"
echo ""

# Start server
PORT=${PORT:-8014}
python3 api.py

# Deactivate on exit
deactivate

