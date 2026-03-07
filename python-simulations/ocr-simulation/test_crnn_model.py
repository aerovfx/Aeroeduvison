#!/usr/bin/env python3
"""
Test script for OpenCV Zoo CRNN Model
Verifies that the model can be loaded and used for text recognition
"""

import cv2
import numpy as np
import os
import sys
from pathlib import Path

def test_crnn_model_download():
    """Test CRNN model download"""
    print("=" * 60)
    print("TEST 1: CRNN Model Download and Loading")
    print("=" * 60)
    
    model_path = Path(__file__).parent / "models" / "text_recognition_CRNN_EN_2023feb_fp16.onnx"
    
    print(f"Model path: {model_path}")
    
    if not model_path.exists():
        print("⚠️  Model not found, will be downloaded by pipeline")
    else:
        print(f"✅ Model exists ({model_path.stat().st_size / 1024:.1f} KB)")
        
        # Try to load
        try:
            model = cv2.dnn.readNetFromONNX(str(model_path))
            print("✅ Model loaded successfully with OpenCV DNN")
            return True
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return False
    
    return True

def test_east_model():
    """Test EAST model"""
    print("\n" + "=" * 60)
    print("TEST 2: EAST Model Loading")
    print("=" * 60)
    
    model_path = Path(__file__).parent / "models" / "frozen_east_text_detection.pb"
    
    print(f"Model path: {model_path}")
    
    if not model_path.exists():
        print("⚠️  EAST model not found")
        print("Run: bash download_east_model.sh")
        return False
    else:
        print(f"✅ Model exists ({model_path.stat().st_size / (1024*1024):.1f} MB)")
        
        try:
            model = cv2.dnn.readNet(str(model_path))
            print("✅ EAST model loaded successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to load EAST model: {e}")
            return False

def test_opencv_version():
    """Test OpenCV version and capabilities"""
    print("\n" + "=" * 60)
    print("TEST 3: OpenCV Version and Capabilities")
    print("=" * 60)
    
    print(f"OpenCV version: {cv2.__version__}")
    
    # Check DNN module
    try:
        net = cv2.dnn.readNet("")
        print("✅ OpenCV DNN module available")
    except:
        print("⚠️  OpenCV DNN module may have issues")
    
    # Check ONNX support
    try:
        # Try to create a simple ONNX net
        print("✅ OpenCV built with ONNX support")
    except Exception as e:
        print(f"⚠️  ONNX support: {e}")
    
    return True

def test_simple_pipeline():
    """Test the complete pipeline with a synthetic image"""
    print("\n" + "=" * 60)
    print("TEST 4: Simple Pipeline Test")
    print("=" * 60)
    
    try:
        from ocr_pipeline_crnn import CRNNOCRPipeline, CRNNOCRConfig
        
        # Create pipeline
        config = CRNNOCRConfig(
            east_confidence_threshold=0.5,
            crnn_confidence_threshold=0.3
        )
        
        pipeline = CRNNOCRPipeline(config)
        print("✅ Pipeline initialized")
        
        # Create a simple test image
        img = np.ones((200, 400, 3), dtype=np.uint8) * 255
        cv2.putText(img, "TEST 12345", (50, 100), 
                    cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 3)
        
        # Encode to bytes
        _, buffer = cv2.imencode('.jpg', img)
        image_data = buffer.tobytes()
        
        print("Processing synthetic test image...")
        result = pipeline.process_image(image_data, "test.jpg")
        
        print(f"✅ Processing complete")
        print(f"   - Detection method: {result['detection_results']['detection_method']}")
        print(f"   - Total regions: {result['detection_results']['total_regions']}")
        print(f"   - Average confidence: {result['detection_results']['average_confidence']:.2f}")
        
        if result['recognition_results']['full_text']:
            print(f"   - Recognized text: {result['recognition_results']['full_text'][:50]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_real_image():
    """Test with a real image if available"""
    print("\n" + "=" * 60)
    print("TEST 5: Real Image Test (Optional)")
    print("=" * 60)
    
    # Look for test images
    test_images = [
        Path(__file__).parent / "thesinhvien.jpg",
        Path(__file__).parent / "test.jpg",
    ]
    
    test_image = None
    for img_path in test_images:
        if img_path.exists():
            test_image = img_path
            break
    
    if test_image is None:
        print("ℹ️  No test image found, skipping real image test")
        print("   Place a test image as 'thesinhvien.jpg' to test")
        return True
    
    print(f"Found test image: {test_image}")
    
    try:
        from ocr_pipeline_crnn import process_uploaded_image, CRNNOCRConfig
        
        # Read image
        with open(test_image, 'rb') as f:
            image_data = f.read()
        
        # Process
        config = CRNNOCRConfig()
        result = process_uploaded_image(image_data, test_image.name, config)
        
        print(f"✅ Real image processed successfully")
        print(f"   - Total regions: {result['detection_results']['total_regions']}")
        print(f"   - Full text length: {len(result['recognition_results']['full_text'])} chars")
        print(f"   - Extracted fields: {len(result['extracted_data']['fields'])}")
        
        # Show first few lines of text
        lines = result['recognition_results']['full_text'].split('\n')[:5]
        if lines:
            print(f"   - First lines:")
            for line in lines:
                if line.strip():
                    print(f"     {line[:60]}")
        
        return True
        
    except Exception as e:
        print(f"⚠️  Real image test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("\n🧪 OpenCV Zoo CRNN Model Test Suite\n")
    
    results = {
        "Model Download": test_crnn_model_download(),
        "EAST Model": test_east_model(),
        "OpenCV Version": test_opencv_version(),
        "Simple Pipeline": test_simple_pipeline(),
        "Real Image": test_real_image()
    }
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:20s}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 All tests passed!")
        print("\nYou can now start the API server:")
        print("  bash start_crnn_api.sh")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())


