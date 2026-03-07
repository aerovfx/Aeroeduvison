#!/usr/bin/env python3
print("Testing different PaddleOCR languages...\n")

from paddleocr import PaddleOCR
import cv2
import numpy as np

# Test different languages
languages = ['en', 'ch', 'chinese_cht', 'japan', 'korean', 'fr', 'german']

for lang in languages:
    try:
        print(f"Trying lang='{lang}'...", end=" ")
        ocr = PaddleOCR(use_angle_cls=True, lang=lang)
        
        # Create test image
        img = np.ones((150, 700, 3), dtype=np.uint8) * 255
        cv2.putText(img, 'Test 1945 Vietnam', (30, 80), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
        cv2.imwrite('t.jpg', img)
        
        # OCR
        result = ocr.ocr('t.jpg', cls=True)
        
        if result and result[0]:
            text = ' '.join([line[1][0] for line in result[0] if line and len(line) > 1])
            print(f"✅ OK! Result: '{text}'")
        else:
            print("✅ OK (no text)")
            
    except Exception as e:
        print(f"❌ Error: {str(e)[:50]}")

import os
try:
    os.remove('t.jpg')
except:
    pass
    
print("\n💡 Recommended: Use 'en' for English/Vietnamese")
