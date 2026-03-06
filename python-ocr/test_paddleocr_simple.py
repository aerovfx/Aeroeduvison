#!/usr/bin/env python3
"""
Simple PaddleOCR Test
"""
import sys
from paddleocr import PaddleOCR
import cv2
import numpy as np

print("🧪 Simple PaddleOCR Test\n")

# Initialize with minimal params
print("🚀 Initializing PaddleOCR...")
ocr = PaddleOCR(lang='en', use_gpu=False)
print("✅ PaddleOCR ready\n")

# Create test image
print("📝 Creating test image...")
img = np.ones((150, 700, 3), dtype=np.uint8) * 255
cv2.putText(img, 'Cach mang thang Tam 1945', (30, 80), 
            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
cv2.imwrite('test.jpg', img)
print("✅ Test image: test.jpg\n")

# Run OCR
print("🔍 Running OCR...")
result = ocr.ocr('test.jpg')

if result and result[0]:
    print(f"✅ Success! Detected {len(result[0])} line(s)\n")
    print("=" * 60)
    
    for idx, line in enumerate(result[0], 1):
        if line and len(line) > 1:
            text = line[1][0]
            conf = line[1][1]
            print(f"Line {idx}: {text}")
            print(f"         Confidence: {conf:.1%}\n")
    
    # Full text
    full = ' '.join([line[1][0] for line in result[0] if line and len(line) > 1])
    print("=" * 60)
    print(f"Full text: {full}")
    print("=" * 60)
else:
    print("❌ No text detected")

# Cleanup
import os
try:
    os.remove('test.jpg')
except:
    pass

print("\n🎉 Test complete!")
