#!/usr/bin/env python3
from paddleocr import PaddleOCR
import cv2
import numpy as np

print("🧪 Final PaddleOCR Test\n")

# Initialize (no use_angle_cls due to deprecation)
print("🚀 Initializing...")
ocr = PaddleOCR(lang='en')  # 'en' works for Vietnamese too
print("✅ Ready!\n")

# Create test image
img = np.ones((200, 900, 3), dtype=np.uint8) * 255
cv2.putText(img, 'Cach mang thang Tam 1945', (30, 100), 
            cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 0, 0), 3)
cv2.imwrite('test.jpg', img)
print("📝 Test image: 'Cach mang thang Tam 1945'\n")

# OCR (no cls parameter)
print("🔍 Running OCR...")
result = ocr.ocr('test.jpg')  # Changed: no cls=True

if result and result[0]:
    print(f"✅ Detected {len(result[0])} line(s)\n")
    print("=" * 70)
    
    for idx, line in enumerate(result[0], 1):
        if line and len(line) > 1:
            text = line[1][0]
            conf = line[1][1]
            print(f"Line {idx}: {text}")
            print(f"         Confidence: {conf:.1%}\n")
    
    full = ' '.join([line[1][0] for line in result[0] if line and len(line) > 1])
    print("=" * 70)
    print(f"📊 Full OCR: {full}")
    print("=" * 70)
else:
    print("❌ No text")

import os
os.remove('test.jpg')
print("\n🎉 Success!")
