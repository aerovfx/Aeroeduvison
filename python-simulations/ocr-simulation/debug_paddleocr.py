#!/usr/bin/env python3
"""
Debug PaddleOCR 3.x API
"""

from paddleocr import PaddleOCR
import cv2
import json

print("🔍 Debugging PaddleOCR 3.x API...")
print("=" * 70)

# Initialize PaddleOCR
print("Initializing PaddleOCR...")
ocr = PaddleOCR(use_angle_cls=True, lang='ch')
print("✅ PaddleOCR initialized")
print()

# Load image
image_path = "thesinhvien.jpg"
print(f"Loading image: {image_path}")
image = cv2.imread(image_path)
print(f"✅ Image loaded: {image.shape}")
print()

# Run OCR
print("Running OCR...")
try:
    result = ocr.predict(image)
    
    print("✅ OCR completed")
    print()
    
    print("=" * 70)
    print("RESULT TYPE:", type(result))
    print("=" * 70)
    print()
    
    if isinstance(result, dict):
        print("RESULT KEYS:", list(result.keys()))
        print()
        
        for key, value in result.items():
            print(f"Key: {key}")
            print(f"Type: {type(value)}")
            print(f"Value: {value}")
            print("-" * 70)
    else:
        print("RESULT:", result)
    
    print()
    
    # Save to file for inspection
    with open("paddleocr_debug_output.json", "w", encoding="utf-8") as f:
        json.dump(str(result), f, indent=2, ensure_ascii=False)
    
    print("💾 Debug output saved to: paddleocr_debug_output.json")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

