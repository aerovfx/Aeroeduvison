#!/usr/bin/env python3
"""
Test PaddleOCR Integration
"""

import cv2
import numpy as np
from ocr_pipeline_paddleocr import PaddleOCRPipeline, OCRConfig
import json

def create_test_image():
    """Create a simple test image with text"""
    # Create white background
    img = np.ones((600, 800, 3), dtype=np.uint8) * 255
    
    # Add header
    cv2.rectangle(img, (0, 0), (800, 100), (200, 220, 255), -1)
    cv2.putText(img, "HANOI UNIVERSITY", (180, 60), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (20, 20, 80), 3)
    
    # Add content
    y_offset = 150
    texts = [
        "Student ID: 20210001",
        "Name: Nguyen Van A",
        "Class: CS-K66",
        "Email: nguyenvana@example.com",
        "Phone: 0123456789"
    ]
    
    for text in texts:
        cv2.putText(img, text, (50, y_offset), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
        y_offset += 60
    
    return img

def main():
    print("=" * 70)
    print("🧪 TESTING PADDLEOCR INTEGRATION")
    print("=" * 70)
    print()
    
    # Create test image
    print("📸 Creating test image...")
    test_image = create_test_image()
    
    # Save test image
    test_image_path = "test_student_card.png"
    cv2.imwrite(test_image_path, test_image)
    print(f"✅ Test image saved: {test_image_path}")
    print()
    
    # Convert to bytes
    _, encoded_image = cv2.imencode('.png', test_image)
    image_bytes = encoded_image.tobytes()
    
    # Test PaddleOCR Pipeline
    print("🚀 Testing PaddleOCR Pipeline...")
    print("-" * 70)
    
    config = OCRConfig(
        min_text_confidence=0.6,
        enable_preprocessing=True,
        use_gpu=False
    )
    
    pipeline = PaddleOCRPipeline(config)
    
    # Run pipeline
    try:
        result = pipeline.run_pipeline(image_bytes, "test_student_card.png")
        
        print("\n" + "=" * 70)
        print("✅ PADDLEOCR TEST SUCCESSFUL!")
        print("=" * 70)
        print()
        
        # Print summary
        print("📊 RESULTS SUMMARY:")
        print("-" * 70)
        print(f"Total text regions detected: {result['detection_results']['total_regions']}")
        print(f"Average confidence: {result['detection_results']['average_confidence']:.2%}")
        print(f"Document type: {result['extracted_data']['document_type']}")
        print(f"Extracted fields: {result['extracted_data']['total_fields']}")
        print()
        
        # Print extracted text
        print("📝 EXTRACTED TEXT:")
        print("-" * 70)
        for region in result['detection_results']['text_regions']:
            print(f"  [{region['confidence']:.3f}] {region['text']}")
        print()
        
        # Print extracted fields
        if result['extracted_data']['fields']:
            print("📋 EXTRACTED FIELDS:")
            print("-" * 70)
            for field_name, field_data in result['extracted_data']['fields'].items():
                print(f"  {field_name}: {field_data['value']} ({field_data['confidence']:.2%})")
            print()
        
        # Save full result
        output_path = "test_paddleocr_result.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Full results saved to: {output_path}")
        print()
        
        print("=" * 70)
        print("🎉 PADDLEOCR INTEGRATION TEST PASSED!")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

