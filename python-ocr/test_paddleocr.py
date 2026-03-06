#!/usr/bin/env python3
"""
Test PaddleOCR với ảnh mẫu
"""
import sys
import os

print("🧪 Testing PaddleOCR...")
print("")

# Check if PaddleOCR is installed
try:
    from paddleocr import PaddleOCR
    print("✅ PaddleOCR imported successfully")
except ImportError as e:
    print(f"❌ PaddleOCR not installed: {e}")
    print("Run: pip install paddleocr paddlepaddle")
    sys.exit(1)

# Check if OpenCV is installed
try:
    import cv2
    print("✅ OpenCV imported successfully")
except ImportError:
    print("❌ OpenCV not installed")
    print("Run: pip install opencv-python")
    sys.exit(1)

import numpy as np

print("")
print("🚀 Initializing PaddleOCR...")

# Initialize PaddleOCR
try:
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang='latin',
        show_log=False,
        use_gpu=False
    )
    print("✅ PaddleOCR initialized")
except Exception as e:
    print(f"❌ Failed to initialize: {e}")
    sys.exit(1)

# Create a test image with Vietnamese text
print("")
print("📝 Creating test image with Vietnamese text...")

# Create white image
img = np.ones((200, 800, 3), dtype=np.uint8) * 255

# Add Vietnamese text
text = "Cách mạng tháng Tám năm 1945"
font = cv2.FONT_HERSHEY_SIMPLEX
cv2.putText(img, text, (50, 100), font, 1.5, (0, 0, 0), 3)

# Save test image
test_img_path = 'test_image.jpg'
cv2.imwrite(test_img_path, img)
print(f"✅ Test image created: {test_img_path}")

# Perform OCR
print("")
print("🔍 Running OCR...")

try:
    result = ocr.ocr(test_img_path, cls=True)
    
    if result and result[0]:
        print("✅ OCR successful!")
        print("")
        print("📊 Results:")
        print("-" * 60)
        
        for idx, line in enumerate(result[0], 1):
            if line and len(line) > 1:
                text = line[1][0]
                confidence = line[1][1]
                box = line[0]
                
                print(f"Line {idx}:")
                print(f"  Text: {text}")
                print(f"  Confidence: {confidence:.1%}")
                print(f"  BBox: {box[0]} -> {box[2]}")
                print("")
        
        # Extract full text
        full_text = ' '.join([line[1][0] for line in result[0] if line and len(line) > 1])
        print("=" * 60)
        print(f"Full text: {full_text}")
        print("=" * 60)
        
        # Compare with expected
        expected = "Cách mạng tháng Tám năm 1945"
        if expected.lower() in full_text.lower():
            print("✅ OCR matched expected text!")
        else:
            print(f"⚠️ OCR result differs from expected")
            print(f"   Expected: {expected}")
            print(f"   Got: {full_text}")
    else:
        print("❌ No text detected")
        
except Exception as e:
    print(f"❌ OCR failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("")
print("🎉 PaddleOCR test complete!")

# Cleanup
try:
    os.remove(test_img_path)
    print(f"🧹 Cleaned up {test_img_path}")
except:
    pass
