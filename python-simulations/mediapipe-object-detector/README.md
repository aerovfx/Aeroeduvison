# MediaPipe Object Detection for AeroEduvison

## 🎯 Overview

This module uses **MediaPipe Tasks Python API** to detect and localize objects in images. It can identify multiple objects within a single image and draw bounding boxes around them.

## 📦 Features

- ✅ **Real-time Object Detection** - Detect multiple objects in images
- ✅ **Pre-trained Models** - Uses EfficientDet Lite0 (fast & accurate)
- ✅ **Adjustable Threshold** - Configure confidence threshold (0.1-0.9)
- ✅ **Visual Results** - Annotated images with bounding boxes
- ✅ **Vietnamese UI** - Fully localized interface
- ✅ **AI Native Design** - Consistent dark theme with glassmorphism

## 🚀 Quick Start

### 1. Run Setup Script

```bash
chmod +x /Users/pixibox/Aeroeduvison/python-simulations/mediapipe-object-detector/setup.sh
bash /Users/pixibox/Aeroeduvison/python-simulations/mediapipe-object-detector/setup.sh
```

This will:
- Download the EfficientDet model (~6MB)
- Install Python dependencies (mediapipe, opencv-python, numpy)
- Create upload directories

### 2. Access the UI

Navigate to: **http://localhost:3000/teacher/vision/object-detection**

### 3. Use the Detector

1. **Upload Image** - Drag & drop or click to select
2. **Adjust Threshold** - Set confidence level (default: 0.5)
3. **Detect Objects** - Click "Phát hiện vật thể"
4. **View Results** - See annotated image and detection list
5. **Download** - Save the annotated image

## 📁 File Structure

```
/Users/pixibox/Aeroeduvison/
├── python-simulations/
│   ├── mediapipe-object-detector/
│   │   ├── object_detector.py      # Main detection service
│   │   ├── setup.sh                # Setup script
│   │   └── README.md               # This file
│   └── mediapipe-models/
│       └── efficientdet_lite0.tflite  # Pre-trained model
├── app/
│   ├── api/
│   │   └── vision/
│   │       └── object-detect/
│   │           ├── route.ts        # API endpoint
│   │           └── file/
│   │               └── [name]/
│   │                   └── route.ts  # File serving
│   └── (dashboard)/(routes)/
│       └── teacher/
│           └── vision/
│               └── object-detection/
│                   └── page.tsx    # UI component
└── uploads/
    └── mediapipe/                  # Uploaded images
```

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Custom model path
MEDIAPIPE_MODEL_PATH=/path/to/model.tflite

# Optional: Custom Python detector path
PYTHON_DETECTOR_PATH=/path/to/object_detector.py
```

### Model Options

The default model is **EfficientDet Lite0** (int8 quantized):
- **Size**: ~6MB
- **Speed**: Fast (real-time on CPU)
- **Accuracy**: Good for general objects

Other models available from [MediaPipe Models](https://developers.google.com/mediapipe/solutions/vision/object_detector#models):
- EfficientDet Lite1 (higher accuracy, slower)
- EfficientDet Lite2 (even higher accuracy)

## 📖 API Reference

### POST /api/vision/object-detect

Detect objects in an uploaded image.

**Request:**
```
Content-Type: multipart/form-data

file: <image file>
threshold: 0.5 (optional)
```

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "category": "dog",
      "score": 0.89,
      "bounding_box": {
        "origin_x": 100,
        "origin_y": 150,
        "width": 200,
        "height": 250
      }
    }
  ],
  "detection_count": 1,
  "annotated_image": "data:image/jpeg;base64,...",
  "image_width": 640,
  "image_height": 480
}
```

## 🧪 Testing

### CLI Testing

```bash
# Test detection
python3 python-simulations/mediapipe-object-detector/object_detector.py \
  --image /path/to/image.jpg \
  --threshold 0.5 \
  --output /path/to/output.jpg \
  --json

# Output:
# Detected 2 objects:
#   - dog: 0.89
#   - cat: 0.92
```

### API Testing

```bash
curl -X POST http://localhost:3000/api/vision/object-detect \
  -F "file=@/path/to/image.jpg" \
  -F "threshold=0.5"
```

## 🎨 Supported Objects

The EfficientDet model is trained on **COCO dataset** (80 classes):

**Common Objects:**
- Person, Bicycle, Car, Motorcycle, Airplane, Bus, Train, Truck, Boat
- Traffic light, Fire hydrant, Stop sign
- Bench, Bird, Cat, Dog, Horse, Sheep, Cow, Elephant, Bear, Zebra, Giraffe
- Backpack, Umbrella, Handbag, Tie, Suitcase
- Frisbee, Skis, Snowboard, Sports ball, Kite, Baseball bat, Baseball glove
- Skateboard, Surfboard, Tennis racket
- Bottle, Wine glass, Cup, Fork, Knife, Spoon, Bowl
- Banana, Apple, Sandwich, Orange, Broccoli, Carrot, Hot dog, Pizza, Donut, Cake
- Chair, Couch, Potted plant, Bed, Dining table, Toilet, TV, Laptop, Mouse, Remote, Keyboard, Cell phone
- Microwave, Oven, Toaster, Sink, Refrigerator, Book, Clock, Vase, Scissors, Teddy bear, Hair drier, Toothbrush

## ⚠️ Limitations

- **Image Size**: Max 4096x4096 pixels
- **File Types**: JPG, PNG only
- **Small Objects**: May not detect very small objects (< 32x32 pixels)
- **Occluded Objects**: Partially hidden objects may not be detected
- **Specialized Objects**: Trained on general objects, not specialized domains (medical, industrial, etc.)

## 🔐 Security

- ✅ Authentication required (NextAuth)
- ✅ File type validation
- ✅ Path traversal protection
- ✅ File size limits (via Next.js config)

## 📊 Performance

**Benchmarks** (M1 Mac):
- **Image 640x480**: ~200ms
- **Image 1280x720**: ~500ms
- **Image 1920x1080**: ~1000ms

## 🛠️ Troubleshooting

### "Model file not found"
```bash
# Re-run setup script
bash python-simulations/mediapipe-object-detector/setup.sh
```

### "Module mediapipe not found"
```bash
# Install dependencies
pip3 install mediapipe opencv-python numpy
```

### "Unauthorized" error
- Make sure you're logged in
- Check NextAuth session

## 📚 References

- [MediaPipe Object Detector](https://developers.google.com/mediapipe/solutions/vision/object_detector)
- [MediaPipe Python API](https://developers.google.com/mediapipe/solutions/vision/object_detector/python)
- [EfficientDet Paper](https://arxiv.org/abs/1911.09070)
- [COCO Dataset](https://cocodataset.org/)

## 🎓 Educational Use Cases

1. **Physics Class**: Analyze objects in motion
2. **Biology**: Identify animals and plants
3. **Computer Science**: Teach AI/ML concepts
4. **Art**: Analyze composition in images
5. **Special Education**: Visual learning aids

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Author**: AeroEduvison Team
