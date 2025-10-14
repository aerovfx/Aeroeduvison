# 🍎 ML TRAINING - macOS Apple Silicon Fix

**Lỗi:** `Abort trap: 6` khi import TensorFlow trên macOS (M1/M2/M3)

---

## 🔍 **VẤN ĐỀ**

### **Lỗi:**
```bash
python3 -c "import tensorflow"
# Abort trap: 6
# libc++abi: terminating due to uncaught exception of type std::__1::system_error: mutex lock failed
```

### **Nguyên nhân:**
- TensorFlow không tương thích tốt với Apple Silicon
- Xung đột với protobuf version
- Cần cài đặt TensorFlow-macOS hoặc TensorFlow-Metal

---

## ✅ **GIẢI PHÁP**

### **Option 1: Sử dụng TensorFlow-macOS (Recommended)**

```bash
# Uninstall standard TensorFlow
pip3 uninstall tensorflow -y

# Install TensorFlow for macOS
pip3 install tensorflow-macos tensorflow-metal

# Test
python3 -c "import tensorflow as tf; print(f'TensorFlow {tf.__version__}')"
```

**Lưu ý:** TensorFlow-macOS tối ưu cho Apple Silicon, sử dụng GPU/Neural Engine

---

### **Option 2: Tắt ML Training (Quickest)**

Nếu không cần ML Training ngay, tắm thời tắt feature:

**File:** `python-simulations/ocr-simulation/main.py`

```python
# Include ML Training routes
ML_TRAINING_ENABLED = False  # Set to False to disable

if ML_TRAINING_ENABLED:
    try:
        from ml_training.api_routes import router as ml_router
        app.include_router(ml_router)
        print("✅ ML Training API routes loaded")
    except ImportError as e:
        print(f"⚠️  ML Training routes not available: {e}")
else:
    print("⚠️  ML Training disabled (set ML_TRAINING_ENABLED=True to enable)")
```

---

### **Option 3: Sử dụng Docker**

Chạy backend trong Docker container (tránh compatibility issues):

**Dockerfile:**
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "main.py"]
```

**Run:**
```bash
docker build -t ml-backend .
docker run -p 8000:8000 ml-backend
```

---

### **Option 4: Sử dụng Conda Environment**

```bash
# Create conda env
conda create -n ml-training python=3.10
conda activate ml-training

# Install TensorFlow via conda
conda install tensorflow

# Test
python -c "import tensorflow as tf; print(tf.__version__)"
```

---

## 🚀 **RECOMMENDED: Option 1**

```bash
# Step-by-step fix for macOS

# 1. Backup current environment
pip3 freeze > requirements_backup.txt

# 2. Uninstall TensorFlow
pip3 uninstall tensorflow tensorflow-estimator tensorboard -y

# 3. Install macOS-specific version
pip3 install tensorflow-macos==2.13.0
pip3 install tensorflow-metal==1.0.0

# 4. Verify
python3 << EOF
import tensorflow as tf
print(f"✅ TensorFlow {tf.__version__}")
print(f"✅ GPU Available: {tf.config.list_physical_devices('GPU')}")
EOF

# 5. Restart backend
cd /Users/vietchung/lmsmath
./start_ml_backend.sh
```

---

## 🔧 **QUICK FIX (Tạm thời)**

Nếu cần backend chạy ngay mà không cần ML Training:

```bash
# Edit main.py to disable ML training
cd /Users/vietchung/lmsmath/python-simulations/ocr-simulation

# Comment out ML training import
sed -i.bak '52,57s/^/# /' main.py

# Start backend (OCR only)
python3 main.py
```

Backend sẽ chạy với OCR features, bỏ qua ML Training:
```
🔧 Using Tesseract OCR
⚠️  ML Training disabled
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 📊 **COMPARISON**

| Solution | Time | Pros | Cons |
|----------|------|------|------|
| TensorFlow-macOS | ~10 min | ✅ Native Apple Silicon<br>✅ GPU acceleration | Requires reinstall |
| Disable ML | ~1 min | ✅ Quickest<br>✅ No dependencies | ❌ No ML training |
| Docker | ~20 min | ✅ Isolated<br>✅ Consistent | Requires Docker |
| Conda | ~15 min | ✅ Clean env<br>✅ Easy management | Requires Conda |

---

## 🎯 **RECOMMENDED WORKFLOW**

### **For Development (now):**
```bash
# Quick fix: Disable ML Training
# Backend will run with OCR only
# Can still use all other features
```

### **For Production (later):**
```bash
# Install TensorFlow-macOS properly
# Full ML Training support
# GPU acceleration
```

---

## 💡 **ALTERNATIVE: Use Cloud**

Nếu macOS compatibility phức tạp, có thể:

1. **Google Colab** (Free GPU)
   - Train models in Colab
   - Download trained model
   - Use in app

2. **Cloud VM** (AWS/GCP)
   - Run backend on Linux VM
   - Frontend connect to cloud backend
   - No compatibility issues

3. **Kaggle Notebooks** (Free)
   - Similar to Colab
   - Free GPU/TPU
   - Export models

---

## 🔍 **VERIFY FIX**

### **Test 1: Import TensorFlow**
```bash
python3 -c "import tensorflow as tf; print(f'✅ {tf.__version__}')"
# Should NOT crash with "Abort trap: 6"
```

### **Test 2: Start Backend**
```bash
cd /Users/vietchung/lmsmath
./start_ml_backend.sh
# Should show: ✅ Backend Started Successfully!
```

### **Test 3: Test API**
```bash
curl http://localhost:8000/api/ml/datasets
# Should return JSON with dataset list
```

### **Test 4: Frontend**
```
Open: http://localhost:3000/dashboard/labtwin/ml-training
Click "Start Training"
Should see: Training started with ID: abc-123-def-456
```

---

## 📝 **UPDATED start_ml_backend.sh**

Sửa script để handle Apple Silicon:

```bash
# Check TensorFlow (with better error handling)
echo "2️⃣  Checking dependencies..."
python3 << EOF 2>&1 | grep -q "✅" && {
    echo "   ✅ TensorFlow installed"
} || {
    echo "   ⚠️  TensorFlow issue detected"
    echo "   💡 Run: pip3 install tensorflow-macos tensorflow-metal"
    exit 1
}
import tensorflow as tf
print(f"✅ TensorFlow {tf.__version__}")
EOF
```

---

## 🎉 **SUMMARY**

```
┌──────────────────────────────────────────┐
│  🍎 macOS Apple Silicon Issue            │
├──────────────────────────────────────────┤
│  Problem: TensorFlow Abort trap: 6       │
│                                          │
│  Quick Fix (5 min):                      │
│  → Disable ML Training in main.py       │
│  → Backend runs with OCR only           │
│                                          │
│  Proper Fix (10 min):                    │
│  → pip3 uninstall tensorflow            │
│  → pip3 install tensorflow-macos        │
│  → Full ML Training support             │
│                                          │
│  Alternative:                            │
│  → Use Google Colab for training        │
│  → Download models and use in app       │
└──────────────────────────────────────────┘
```

---

**Recommended Next Steps:**

1. **Ngay bây giờ:** Comment out ML training import → Backend chạy với OCR
2. **Sau đó:** Cài `tensorflow-macos` → Full ML support
3. **Hoặc:** Sử dụng Colab để train models offline

**Status:** ✅ Có nhiều giải pháp  
**Quickest:** 1 phút (disable ML)  
**Best:** 10 phút (tensorflow-macos)


