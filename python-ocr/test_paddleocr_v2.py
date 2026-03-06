#!/usr/bin/env python3
"""
Test PaddleOCR với ảnh mẫu - Version 2
"""
import sys
import os

print("🧪 Testing PaddleOCR v2...")
print("")

# Check dependencies
try:
    from paddleocr import PaddleOCR
    import cv2
    import numpy as np
    print("✅ All dependencies imported")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

print("")
print("🚀 Initializing PaddleOCR...")
print("   Using language: 'en' (works for Vietnamese too)")

# Initialize PaddleOCR with 'en' language
try:
    ocr = PaddleOCR(
        use_angle_cls=True,
        lang='en',  # Changed from 'latin' to 'en'
        show_log=False,
        use_gpu=False,
        det_db_thresh=0.3,
        det_db_box_thresh=0.5
    )
    print("✅ PaddleOCR initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize: {e}")
    print("")
    print("💡 Tip: PaddleOCR will auto-download models on first run")
    print("   This may take a few minutes...")
    sys.exit(1)

# Create test images with different text
test_cases = [
    {
        'name': 'Vietnamese History',
        'text': 'Cach mang thang Tam nam 1945',
        'font_scale': 1.2
    },
    {
        'name': 'Simple Vietnamese',
        'text': 'Dap an mau: Dang lanh dao',
        'font_scale': 1.0
    },
    {
        'name': 'Mixed',
        'text': 'Bai lam hoc sinh: 8.5 diem',
        'font_scale': 1.0
    }
]

print("")
print("=" * 70)

for idx, test_case in enumerate(test_cases, 1):
    print(f"\n📝 Test {idx}/{len(test_cases)}: {test_case['name']}")
    print("-" * 70)
    
    # Create white image
    img = np.ones((150, 700, 3), dtype=np.uint8) * 255
    
    # Add text (without diacritics for ASCII rendering)
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(
        img, 
        test_case['text'], 
        (30, 80), 
        font, 
        test_case['font_scale'], 
        (0, 0, 0), 
        2
    )
    
    # Save test image
    test_img_path = f'test_image_{idx}.jpg'
    cv2.imwrite(test_img_path, img)
    print(f"✅ Created: {test_img_path}")
    
    # Perform OCR
    print("🔍 Running OCR...")
    
    try:
        result = ocr.ocr(test_img_path, cls=True)
        
        if result and result[0]:
            print(f"✅ Detected {len(result[0])} text region(s)")
            
            full_text_parts = []
            for line_idx, line in enumerate(result[0], 1):
                if line and len(line) > 1:
                    text = line[1][0]
                    confidence = line[1][1]
                    full_text_parts.append(text)
                    
                    print(f"   Line {line_idx}: '{text}' (confidence: {confidence:.1%})")
            
            full_text = ' '.join(full_text_parts)
            print(f"\n📊 Full OCR result: '{full_text}'")
            print(f"🎯 Expected text:    '{test_case['text']}'")
            
        else:
            print("❌ No text detected")
            
    except Exception as e:
        print(f"❌ OCR failed: {e}")
    
    # Cleanup
    try:
        os.remove(test_img_path)
    except:
        pass

print("")
print("=" * 70)
print("🎉 PaddleOCR test complete!")
print("")
print("💡 Notes:")
print("   - PaddleOCR works best with clear, high-contrast images")
print("   - Confidence > 80% is generally reliable")
print("   - For Vietnamese with diacritics, use 'ch_sim' or 'en' lang")
