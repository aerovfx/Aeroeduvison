#!/bin/bash
echo "📦 Downloading Advanced OCR Models..."
echo ""

cd "$(dirname "$0")"

# Create models directory
mkdir -p models
cd models

# Download EAST text detection model
echo "1️⃣ Downloading EAST model (~90MB)..."
if [ ! -f "frozen_east_text_detection.pb" ]; then
    curl -L "https://github.com/oyyd/frozen_east_text_detection.pb/raw/master/frozen_east_text_detection.pb" \
         -o frozen_east_text_detection.pb
    
    if [ $? -eq 0 ]; then
        echo "   ✅ EAST model downloaded"
    else
        echo "   ❌ Failed to download EAST model"
        echo "   Manual download: https://github.com/oyyd/frozen_east_text_detection.pb"
    fi
else
    echo "   ✅ EAST model already exists"
fi

echo ""

# Download CRNN model (if available - otherwise need training)
echo "2️⃣ CRNN model for Vietnamese handwriting..."
echo "   ⚠️ CRNN model needs to be trained on your data"
echo ""
echo "   Options:"
echo "   A. Train your own (recommended for accuracy)"
echo "      → python train_crnn.py --data <your_data>"
echo ""
echo "   B. Use pretrained English model (less accurate for Vietnamese)"
echo "      → Not recommended for Vietnamese exams"
echo ""
echo "   C. Fine-tune existing model"
echo "      → Start with pretrained, fine-tune on Vietnamese"

echo ""
echo "═══════════════════════════════════════════"
echo "Models downloaded:"
ls -lh *.pb 2>/dev/null || echo "  (none yet)"
echo "═══════════════════════════════════════════"
echo ""
echo "📚 Next steps:"
echo "   1. For EAST only: Ready to use!"
echo "   2. For CRNN: Prepare training data"
echo "   3. See ADVANCED_OCR_GUIDE.md for details"

