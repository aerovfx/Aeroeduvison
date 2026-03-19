#!/bin/bash
# MediaPipe Object Detection Setup Script for AeroEduvison

echo "🚀 Setting up MediaPipe Object Detection..."

# Create directories
echo "📁 Creating directories..."
mkdir -p /Users/pixibox/Aeroeduvison/python-simulations/mediapipe-models
mkdir -p /Users/pixibox/Aeroeduvison/uploads/mediapipe

# Download MediaPipe EfficientDet model
echo "⬇️  Downloading MediaPipe EfficientDet model..."
wget -q -O /Users/pixibox/Aeroeduvison/python-simulations/mediapipe-models/efficientdet_lite0.tflite \
  https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite

if [ $? -eq 0 ]; then
  echo "✅ Model downloaded successfully!"
  ls -lh /Users/pixibox/Aeroeduvison/python-simulations/mediapipe-models/
else
  echo "❌ Failed to download model"
  exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install mediapipe opencv-python numpy

if [ $? -eq 0 ]; then
  echo "✅ Python dependencies installed!"
else
  echo "❌ Failed to install dependencies"
  exit 1
fi

# Test the detector
echo "🧪 Testing object detector..."
python3 /Users/pixibox/Aeroeduvison/python-simulations/mediapipe-object-detector/object_detector.py --help

if [ $? -eq 0 ]; then
  echo "✅ Object detector is ready!"
else
  echo "⚠️  Detector test failed, but setup may still work"
fi

echo ""
echo "======================================"
echo "✅ MediaPipe Object Detection Setup Complete!"
echo "======================================"
echo ""
echo "📍 Model location: /Users/pixibox/Aeroeduvison/python-simulations/mediapipe-models/efficientdet_lite0.tflite"
echo "📍 Upload directory: /Users/pixibox/Aeroeduvison/uploads/mediapipe/"
echo ""
echo "🌐 Access the UI at: http://localhost:3000/teacher/vision/object-detection"
echo ""
echo "📖 Usage:"
echo "   1. Navigate to the page above"
echo "   2. Upload an image or drag & drop"
echo "   3. Adjust confidence threshold if needed"
echo "   4. Click 'Phát hiện vật thể' to detect objects"
echo ""
