# 📦 Pretrained Models Directory

**Lưu trữ các pretrained models cho OCR**

---

## 📁 Cấu trúc thư mục

```
pretrained_models/
├── crnn/
│   ├── crnn_english.pth          # CRNN pretrained English
│   ├── crnn_vietnamese.pth       # CRNN pretrained Vietnamese
│   ├── crnn_english.onnx         # ONNX format (faster inference)
│   └── crnn_vietnamese.onnx
│
├── transformer/
│   ├── transformer_english.pth
│   ├── transformer_vietnamese.pth
│   └── trocr_base/               # Microsoft TrOCR pretrained
│
└── README.md (this file)
```

---

## 🎯 Đặt file crnn.onnx ở đâu?

### Cách 1: Để trong thư mục này
```bash
# Download và đặt tại:
python-simulations/ocr-grading/pretrained_models/crnn/crnn.onnx

# Hoặc nếu là Vietnamese model:
python-simulations/ocr-grading/pretrained_models/crnn/crnn_vietnamese.onnx
```

### Cách 2: Sử dụng script download tự động
```bash
# Chạy script download (sẽ tạo bên dưới)
python download_models.py --model crnn --format onnx
```

---

## 📥 Download Pretrained Models

### CRNN Models

**Sources**:
1. **GitHub Releases**
   - https://github.com/clovaai/deep-text-recognition-benchmark
   - https://github.com/meijieru/crnn.pytorch

2. **Hugging Face**
   - https://huggingface.co/models?other=ocr

3. **Google Drive / OneDrive**
   - Many researchers share pretrained weights

### Transformer Models

**TrOCR (Microsoft)**:
```bash
# Will auto-download from Hugging Face
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')
# Saved to: ~/.cache/huggingface/
```

---

## 🔧 Sử dụng Pretrained Models

### Load ONNX Model

```python
import onnxruntime as ort

# Load ONNX model
session = ort.InferenceSession('pretrained_models/crnn/crnn.onnx')

# Get input/output info
input_name = session.get_inputs()[0].name
output_name = session.get_outputs()[0].name

# Run inference
outputs = session.run([output_name], {input_name: image_tensor})
```

### Load PyTorch Model

```python
from models.crnn_architecture import CRNN

# Create model
model = CRNN(img_height=32, num_channels=1, num_classes=200)

# Load pretrained weights
checkpoint = torch.load('pretrained_models/crnn/crnn_english.pth')
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

# Use for inference
output = model(image_tensor)
```

### Fine-tune Pretrained Model

```python
# Load pretrained
model = load_pretrained_model('pretrained_models/crnn/crnn_english.pth')

# Freeze encoder (only train decoder)
for param in model.cnn.parameters():
    param.requires_grad = False

# Train on your Vietnamese dataset
train_model(model, your_dataset, epochs=30)
```

---

## 🎯 Recommended Models

### For Vietnamese Handwriting

**Option 1: Train from scratch**
```bash
# Best accuracy for your specific use case
python train_crnn.py --dataset your_vietnamese_dataset/
```

**Option 2: Fine-tune pretrained English**
```bash
# Faster convergence
python fine_tune.py \
  --pretrained pretrained_models/crnn/crnn_english.pth \
  --dataset your_vietnamese_dataset/
```

### For Quick Testing

**Use Demo Model**:
```bash
# Generate synthetic training data
python generate_demo_model.py

# Creates basic model for testing
# Saved to: pretrained_models/demo/crnn_demo.pth
```

---

## 📊 Model Formats

### PyTorch (.pth, .pt)
```
Pros:
- Easy to fine-tune
- Full model architecture
- Training-ready

Cons:
- Larger file size
- Slower inference than ONNX
```

### ONNX (.onnx)
```
Pros:
- Faster inference
- Cross-platform
- Optimized

Cons:
- Cannot fine-tune directly
- Need to export from PyTorch
```

### TorchScript (.pt, .ts)
```
Pros:
- Faster than regular PyTorch
- Can be used in C++
- Optimized for production

Cons:
- Export can be tricky
- Limited to PyTorch ecosystem
```

---

## 🔄 Convert Between Formats

### PyTorch → ONNX
```python
import torch

# Load PyTorch model
model = load_model('model.pth')
model.eval()

# Export to ONNX
dummy_input = torch.randn(1, 1, 32, 128)
torch.onnx.export(
    model,
    dummy_input,
    'model.onnx',
    input_names=['image'],
    output_names=['output'],
    dynamic_axes={'image': {0: 'batch_size'}}
)
```

### PyTorch → TorchScript
```python
model = load_model('model.pth')
model.eval()

# Trace
example = torch.randn(1, 1, 32, 128)
traced = torch.jit.trace(model, example)
traced.save('model_traced.pt')
```

---

## 💡 Best Practices

### Model Organization
```
pretrained_models/
├── crnn/
│   ├── v1.0_english.pth           # Version & language
│   ├── v1.1_vietnamese.pth        # Clear naming
│   └── v2.0_vietnamese_finetuned.onnx
├── transformer/
│   └── trocr_vietnamese_custom.pth
└── metadata.json                   # Model info
```

### Metadata File
```json
{
  "models": {
    "crnn_vietnamese_v1.0": {
      "path": "crnn/v1.0_vietnamese.pth",
      "type": "crnn",
      "alphabet_size": 200,
      "accuracy": 82.5,
      "trained_on": "1000 student samples",
      "date": "2025-10-14"
    }
  }
}
```

---

## 🎉 Tóm tắt

### Đặt crnn.onnx ở đâu?
```bash
# Recommended location:
/Users/vietchung/lmsmath/python-simulations/ocr-grading/pretrained_models/crnn/

# Full path:
/Users/vietchung/lmsmath/python-simulations/ocr-grading/pretrained_models/crnn/crnn.onnx
```

### Sử dụng trong code:
```python
# Load ONNX model
model_path = 'pretrained_models/crnn/crnn.onnx'

import onnxruntime as ort
session = ort.InferenceSession(model_path)

# Run inference
outputs = session.run(None, {'image': image_tensor})
```

### Fine-tune for your data:
```bash
# Start from pretrained, train on your data
python train_crnn.py \
  --pretrained pretrained_models/crnn/crnn.onnx \
  --dataset your_dataset/ \
  --epochs 30
```

---

**📍 Location**: `pretrained_models/crnn/crnn.onnx`  
**Usage**: Transfer learning base  
**Goal**: Fine-tune trên dataset của bạn → 85-92% accuracy!


