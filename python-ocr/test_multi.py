#!/usr/bin/env python3
from paddleocr import PaddleOCR
import cv2
import numpy as np

print("🧪 Testing PaddleOCR with lang='multi'\n")

# Initialize
print("🚀 Initializing PaddleOCR...")
ocr = PaddleOCR(use_angle_cls=True, lang='multi')
print("✅ PaddleOCR ready!\n")

# Create test image with Vietnamese text
img = np.ones((200, 900, 3), dtype=np.uint8) * 255
cv2.putText(img, 'Cach mang thang Tam nam 1945', (30, 100), 
            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3)
cv2.imwrite('test.jpg', img)
print("📝 Test image created with: 'Cach mang thang Tam nam 1945'\n")

# OCR
print("🔍 Running OCR...")
result = ocr.ocr('test.jpg', cls=True)

if result and result[0]:
    print(f"✅ Detected {len(result[0])} line(s)\n")
    print("=" * 70)
    
    full_text = []
    for idx, line in enumerate(result[0], 1):
        if line and len(line) > 1:
            text = line[1][0]
            conf = line[1][1]
            full_text.append(text)
            print(f"Line {idx}: '{text}'")
            print(f"         Confidence: {conf:.1%}")
            print()
    
    final = ' '.join(full_text)
    print("=" * 70)
    print(f"📊 Full OCR: {final}")
    print(f"🎯 Expected: Cach mang thang Tam nam 1945")
    print("=" * 70)
else:
    print("❌ No text detected")

import os
os.remove('test.jpg')
print("\n🎉 Test complete!")
