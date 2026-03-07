#!/usr/bin/env python3
"""
Test script to verify EAST model loading
"""

import cv2
import os
import sys

def test_east_model():
    """Test EAST model loading"""
    
    print("=" * 60)
    print("🧪 EAST Model Loading Test")
    print("=" * 60)
    print()
    
    # Model path
    model_path = os.path.join(
        os.path.dirname(__file__), 
        "models", 
        "frozen_east_text_detection.pb"
    )
    
    print(f"📂 Model path: {model_path}")
    
    # Check if model exists
    if not os.path.exists(model_path):
        print(f"❌ FAIL: Model not found at {model_path}")
        return False
    
    print(f"✅ Model file exists")
    
    # Get model size
    size_mb = os.path.getsize(model_path) / (1024 * 1024)
    print(f"📊 Model size: {size_mb:.2f} MB")
    
    # Try to load model
    try:
        print()
        print("🔄 Loading model with cv2.dnn.readNet()...")
        model = cv2.dnn.readNet(model_path)
        print("✅ Model loaded successfully!")
        
        # Get layer names
        layer_names = model.getLayerNames()
        print(f"📊 Total layers: {len(layer_names)}")
        
        # Get output layer names
        output_layers = []
        output_layers.append("feature_fusion/Conv_7/Sigmoid")
        output_layers.append("feature_fusion/concat_3")
        
        print(f"🎯 Output layers configured:")
        for i, layer in enumerate(output_layers, 1):
            print(f"   {i}. {layer}")
        
        print()
        print("=" * 60)
        print("✅ TEST PASSED: EAST model is ready to use!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Error loading model")
        print(f"   Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_east_model()
    sys.exit(0 if success else 1)

