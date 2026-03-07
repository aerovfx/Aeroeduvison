#!/usr/bin/env python3
"""
Quick test of the updated OCR service
"""
from paddleocr_service import process_image_for_ocr
import cv2
import numpy as np

print("🧪 Testing updated OCR service\n")

# Create test image
img = np.ones((200, 900, 3), dtype=np.uint8) * 255
cv2.putText(img, 'Cach mang thang Tam 1945', (30, 100), 
            cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 0, 0), 3)

# Encode to bytes
_, buffer = cv2.imencode('.jpg', img)
image_bytes = buffer.tobytes()

# Process
print("🔍 Processing image...")
result = process_image_for_ocr(image_bytes)

print("\n✅ Result:")
print(f"   Text: {result['text']}")
print(f"   Confidence: {result['confidence']:.1%}")
print(f"   Boxes: {len(result['boxes'])} text region(s)")

for idx, box in enumerate(result['boxes'], 1):
    print(f"\n   Box {idx}:")
    print(f"     Text: {box['text']}")
    print(f"     Confidence: {box['confidence']:.1%}")

print("\n🎉 Test complete!")
