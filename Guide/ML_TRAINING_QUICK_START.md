# 🚀 ML TRAINING - QUICK START GUIDE

**5 phút để bắt đầu train model ML!**

---

## ✅ **1. CÀI ĐẶT**

```bash
# Cài đặt dependencies cho ML Training
cd python-simulations/ocr-simulation
pip install tensorflow keras datasets numpy matplotlib tensorboard tf2onnx
```

---

## 🚀 **2. KHỞI ĐỘNG**

### **Terminal 1: Backend**
```bash
cd python-simulations/ocr-simulation
python main.py
```

**Expected output:**
```
✅ ML Training API routes loaded
🔧 Using Tesseract OCR
INFO:     Uvicorn running on http://localhost:8000
```

### **Terminal 2: Frontend**
```bash
cd /Users/vietchung/lmsmath
npm run dev
```

**Expected output:**
```
✓ Ready in 2.3s
○ Local:        http://localhost:3000
```

---

## 🎓 **3. TRAIN MODEL**

### **Cách 1: Qua UI (Dễ nhất)**

1. Mở trình duyệt: `http://localhost:3000/dashboard/ml-training`

2. Tab "Training":
   - Chọn dataset: **MNIST Digits**
   - Model: **CNN (Fast)**
   - Click **"Start Training"**

3. Tab "Progress":
   - Xem real-time progress
   - Loss/Accuracy charts

4. Tab "Models":
   - Download model sau khi xong

### **Cách 2: Qua API**

```bash
# Start training
curl -X POST http://localhost:8000/api/ml/train/start \
  -H "Content-Type: application/json" \
  -d '{"config_preset": "mnist"}'

# Response: {"training_id": "abc123", "status": "pending"}

# Check status
curl http://localhost:8000/api/ml/train/status/abc123
```

### **Cách 3: Python Script**

```python
from ml_training.config import MNIST_CONFIG
from ml_training.data_loader import DataLoader
from ml_training.model_builder import ModelBuilder
from ml_training.trainer import Trainer

# 1. Load data
loader = DataLoader(MNIST_CONFIG)
X_train, y_train, X_test, y_test = loader.load_data()

# 2. Build model
builder = ModelBuilder(MNIST_CONFIG)
model = builder.build_cnn()

# 3. Train
trainer = Trainer(model, MNIST_CONFIG)
result = trainer.train(X_train, y_train)

print(f"✅ Model saved: {result['model_path']}")
```

---

## 📥 **4. SỬ DỤNG MODEL**

### **Download từ UI:**

1. Vào tab "Models"
2. Click **"Download H5"** hoặc **"Download TFLite"**

### **Download từ API:**

```bash
# H5 format
curl http://localhost:8000/api/ml/models/{model_id}/download?format=h5 -O

# TFLite format
curl http://localhost:8000/api/ml/models/{model_id}/download?format=tflite -O
```

### **Sử dụng trong code:**

```python
from tensorflow import keras
import numpy as np

# Load model
model = keras.models.load_model("model.h5")

# Predict
img = np.random.rand(1, 28, 28, 1)
prediction = model.predict(img)
predicted_class = np.argmax(prediction)

print(f"Predicted: {predicted_class}")
```

---

## 🎯 **DATASETS**

| Dataset | Classes | Images | Use Case |
|---------|---------|--------|----------|
| MNIST | 10 (0-9) | 70,000 | Handwritten digits |
| EMNIST | 26 (A-Z) | 169,000 | Handwritten letters |
| Custom | 62 (0-9, A-Z, a-z) | Local data | Custom handwriting |

---

## 🏗️ **MODELS**

| Model | Speed | Accuracy | Params | Use Case |
|-------|-------|----------|--------|----------|
| CNN | ⚡⚡⚡ Fast | 98% | 1.5M | Quick prototyping |
| ResNet | ⚡⚡ Medium | 99% | 11M | Better accuracy |
| EfficientNet | ⚡ Slow | 99.5% | 5M | Production use |

---

## 📊 **TRAINING TIME**

| Dataset | Model | Epochs | Time (CPU) | Time (GPU) |
|---------|-------|--------|------------|------------|
| MNIST | CNN | 10 | ~5 min | ~1 min |
| MNIST | ResNet | 10 | ~15 min | ~2 min |
| EMNIST | CNN | 15 | ~10 min | ~2 min |

---

## 🔧 **TROUBLESHOOTING**

### **Problem: Module not found**
```bash
pip install tensorflow keras datasets
```

### **Problem: CUDA not available (GPU)**
```bash
# Install TensorFlow with GPU support
pip install tensorflow[and-cuda]
```

### **Problem: WebSocket not connecting**
- Check backend is running on port 8000
- Check frontend is running on port 3000
- Check CORS settings in main.py

### **Problem: Training stuck at "loading_data"**
- First run downloads data from Hugging Face (slow)
- Subsequent runs use cached data (fast)
- Or use synthetic data for testing

---

## 📚 **NEXT STEPS**

1. ✅ Train your first MNIST model
2. ✅ Download and test the model
3. ✅ Try EMNIST dataset
4. ✅ Export to TFLite for mobile
5. ✅ Customize configuration
6. ✅ Use in your own project

---

## 🆘 **HELP**

- **Documentation:** `ML_TRAINING_COMPLETE.md`
- **API Docs:** `http://localhost:8000/docs`
- **Code Examples:** `ml_training/trainer.py`

---

**Ready to train? 🚀**  
👉 `http://localhost:3000/dashboard/ml-training`

