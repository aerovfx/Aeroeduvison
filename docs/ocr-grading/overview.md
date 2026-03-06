# OCR & Auto-Grading System

AeroEduVison features an advanced OCR (Optical Character Recognition) system that automatically grades handwritten student submissions using machine learning.

## 🎯 Overview

Our OCR system combines multiple technologies:
- **PaddleOCR** - Advanced text detection and recognition
- **Machine Learning** - Custom-trained models for handwriting
- **AI Grading** - Intelligent feedback generation
- **Multi-language** - Support for English and Vietnamese

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          Student Submission                 │
│  (Handwritten homework image/PDF)           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│         OCR Processing Pipeline             │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  1. Image Preprocessing             │   │
│  │     - Noise reduction               │   │
│  │     - Contrast enhancement          │   │
│  │     - Deskewing                     │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│  ┌──────────────┴──────────────────────┐   │
│  │  2. Text Detection (EAST/PaddleOCR) │   │
│  │     - Bounding box detection        │   │
│  │     - Text region segmentation      │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│  ┌──────────────┴──────────────────────┐   │
│  │  3. Text Recognition                │   │
│  │     - Character recognition         │   │
│  │     - Confidence scoring            │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│  ┌──────────────┴──────────────────────┐   │
│  │  4. Post-Processing                 │   │
│  │     - Spelling correction           │   │
│  │     - Format normalization          │   │
│  └──────────────┬──────────────────────┘   │
└─────────────────┼───────────────────────────┘
                  │
┌─────────────────┼───────────────────────────┐
│                 │                           │
│  ┌──────────────┴──────────────────────┐   │
│  │  5. AI Grading (Gemini/Ollama)      │   │
│  │     - Answer comparison             │   │
│  │     - Scoring                       │   │
│  │     - Feedback generation           │   │
│  └──────────────┬──────────────────────┘   │
│                 │                           │
│           AI Grading Engine                 │
└─────────────────┼───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│     Graded Results + Feedback               │
│  - Score                                    │
│  - Detailed feedback                        │
│  - Corrected answers                        │
└─────────────────────────────────────────────┘
```

---

##✨ Features

### Advanced Text Detection
- **EAST Text Detector** - Fast and accurate
- **PaddleOCR** - Multi-language support
- **Custom Models** - Trained on educational content
- **Handwriting Recognition** - Both printed and cursive

### Intelligent Grading
- **AI-Powered** - Uses Google Gemini and Ollama
- **Context-Aware** - Understands subject matter
- **Partial Credit** - Scores partial correctness
- **Detailed Feedback** - Explains mistakes

### Multi-Language Support
- **English** - Full support
- **Vietnamese** - Native support
- **Extensible** - Easy to add more languages

### Quality Metrics
- **Confidence Scores** - For each detected word
- **Quality Assessment** - Image quality checks
- **Error Detection** - Identifies OCR errors

---

## 🚀 Quick Start

### 1. Start OCR Server

```bash
cd python-ocr
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start server
python ocr_server.py
```

### 2. Upload Image for Grading

```typescript
// Frontend code
const response = await fetch('/api/ocr-grading', {
  method: 'POST',
  body: formData
})

const result = await response.json()
// { score, feedback, extracted_text, confidence }
```

### 3. View Results

Navigate to:
```
http://localhost:3000/dashboard/labtwin/labs/ocr-grading
```

---

## 📝 OCR Pipeline Stages

### Stage 1: Image Preprocessing
```python
def preprocess_image(image):
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Noise reduction
    denoised = cv2.fastNlMeansDenoising(gray)
    
    # Contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0)
    enhanced = clahe.apply(denoised)
    
    # Binarization
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary
```

### Stage 2: Text Detection
```python
from paddleocr import PaddleOCR

ocr = PaddleOCR(lang='en')
result = ocr.ocr(image_path)

# Extract bounding boxes and text
for line in result:
    box = line[0]  # Coordinates
    text = line[1][0]  # Recognized text
    confidence = line[1][1]  # Confidence score
```

### Stage 3: AI Grading
```python
from google.generativeai import GenerativeModel

model = GenerativeModel('gemini-pro')

prompt = f"""
Grade this student answer:
Question: {question}
Student Answer: {extracted_text}
Correct Answer: {correct_answer}

Provide:
1. Score (0-100)
2. Detailed feedback
3. Corrections
"""

response = model.generate_content(prompt)
```

---

## 🛠️ Configuration

### Environment Variables

```env
# OCR Service
OCR_SERVER_URL=http://localhost:5000
PADDLE_OCR_LANG=en,vi
OCR_CONFIDENCE_THRESHOLD=0.8

# AI Grading
GEMINI_API_KEY=your-api-key
OLLAMA_URL=http://localhost:11434
GRADING_MODEL=gemini-pro

# Performance
OCR_MAX_IMAGE_SIZE=4096
OCR_BATCH_SIZE=10
```

### Supported Image Formats
- JPEG/JPG
- PNG
- PDF (converted to images)
- HEIC/HEIF

---

## 📊 Performance Metrics

### Accuracy
- **English Text**: 95%+
- **Vietnamese Text**: 92%+
- **Handwriting**: 85%+
- **Mathematical Notation**: 80%+

### Speed
- **Processing Time**: 2-5 seconds per image
- **Grading Time**: 3-8 seconds (with AI)
- **Throughput**: 20+ images/minute

### Quality Thresholds
- **Minimum Confidence**: 0.75
- **Image Resolution**: 300+ DPI recommended
- **File Size**: <10MB per image

---

## 🎓 Usage Examples

### Example 1: Simple Text Recognition

```typescript
import { ocrClient } from '@/lib/ocr-client'

const result = await ocrClient.extractText(imageFile)
console.log(result.text)
// "The answer is 42"
```

### Example 2: Auto-Grading

```typescript
const gradingResult = await ocrClient.gradeSubmission({
  imageFile,
  questionId: "Q1",
  correctAnswer: "42"
})

console.log(gradingResult)
// {
//   score: 100,
//   feedback: "Correct! Well done.",
//   extractedText: "The answer is 42",
//   confidence: 0.95
// }
```

### Example 3: Batch Processing

```typescript
const results = await ocrClient.batchGrade(imageFiles, questions)
```

---

## 🧪 Advanced Features

### Custom Model Training

Train models on your own dataset:

```bash
cd python-ocr
python ml_training/train.py \
  --dataset ./data/custom \
  --epochs 100 \
  --model-output ./models/custom_model.h5
```

### Multi-Language Detection

```python
ocr = PaddleOCR(lang='en,vi')  # English + Vietnamese
result = ocr.ocr(image, det=True, rec=True, cls=True)
```

### Handwriting Recognition

```python
# Use specialized handwriting model
ocr = PaddleOCR(
    lang='en',
    rec_model_dir='./models/handwriting'
)
```

---

## 🐛 Troubleshooting

### Low Accuracy

1. **Improve Image Quality**
   - Use higher resolution (300+ DPI)
   - Ensure good lighting
   - Avoid blur and distortion

2. **Adjust Preprocessing**
   ```python
   # Increase contrast
   clahe = cv2.createCLAHE(clipLimit=3.0)
   
   # More aggressive denoising
   denoised = cv2.fastNlMeansDenoising(gray, h=10)
   ```

3. **Retrain Models**
   - Add more training data
   - Fine-tune on your specific use case

### Slow Processing

```bash
# Use GPU acceleration
export CUDA_VISIBLE_DEVICES=0

# Reduce image size
export OCR_MAX_IMAGE_SIZE=2048

# Use lightweight model
ocr = PaddleOCR(use_angle_cls=False)
```

---

## 📚 Related Resources

- [Advanced Pipeline Guide](./advanced-pipeline.md)
- [ML Training Guide](./ml-training.md)
- [PaddleOCR Integration](./paddleocr.md)
- [Auto Grading System](./auto-grading.md)

---

## 🔗 External Documentation

- [PaddleOCR Docs](https://github.com/PaddlePaddle/PaddleOCR)
- [Tesseract OCR](https://tesseract-ocr.github.io/)
- [OpenCV Tutorials](https://docs.opencv.org/)

---

**Next:** [Advanced OCR Pipeline](./advanced-pipeline.md)
