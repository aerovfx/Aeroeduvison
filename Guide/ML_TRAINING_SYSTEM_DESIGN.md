# 🎓 ML TRAINING SYSTEM - DESIGN & IMPLEMENTATION

**Date:** 2024-10-12  
**Status:** 🚧 In Progress  
**Location:** `/python-simulations/ocr-simulation/ml_training/`

---

## 🎯 **OVERVIEW**

Complete ML training system integrated into OCR simulation:
- **Backend:** FastAPI for training API
- **Frontend:** Next.js for visualization & control
- **Data:** Hugging Face datasets + local data support
- **Models:** Handwriting recognition (MNIST, EMNIST, custom)

---

## 🏗️ **ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  Training     │  │  Progress     │  │  Model        │  │
│  │  Control UI   │  │  Visualization│  │  Management   │  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  │
└──────────┼──────────────────┼──────────────────┼──────────┘
           │                  │                  │
           │  HTTP/WebSocket  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  /train       │  │  /ws/progress │  │  /model/*     │  │
│  │  Start/Stop   │  │  Real-time    │  │  Save/Load    │  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  │
└──────────┼──────────────────┼──────────────────┼──────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRAINING ENGINE                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Data       │  │ Model      │  │ Trainer    │           │
│  │ Loader     │  │ Builder    │  │            │           │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘           │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          ▼                ▼                ▼
    ┌─────────┐      ┌─────────┐     ┌──────────┐
    │ Hugging │      │TensorFlow│     │Checkpoint│
    │  Face   │      │/ PyTorch│     │ Manager  │
    └─────────┘      └─────────┘     └──────────┘
```

---

## 📁 **DIRECTORY STRUCTURE**

```
python-simulations/ocr-simulation/
└── ml_training/
    ├── config.py              ✅ Training configuration
    ├── data_loader.py         ✅ HF + local data loader
    ├── model_builder.py       🚧 CNN/ResNet architectures
    ├── trainer.py             🚧 Training engine
    ├── api_routes.py          🚧 FastAPI endpoints
    ├── websocket_handler.py   🚧 Real-time progress
    ├── model_exporter.py      🚧 Export to TFLite/ONNX
    ├── requirements.txt       🚧 Dependencies
    ├── data/                  📂 Local datasets
    ├── models/                📂 Trained models
    ├── checkpoints/           📂 Training checkpoints
    └── logs/                  📂 TensorBoard logs
```

---

## ⚙️ **COMPONENTS COMPLETED**

### ✅ **1. Configuration (`config.py`)**

**Features:**
- Dataclass-based configuration
- Predefined presets (MNIST, EMNIST, Custom)
- Model, training, and data parameters
- Checkpoint and export settings

**Example Usage:**
```python
from ml_training.config import MNIST_CONFIG, TrainingConfig

# Use preset
config = MNIST_CONFIG

# Or create custom
config = TrainingConfig(
    model_type="cnn",
    num_classes=10,
    epochs=15,
    batch_size=64,
    data_source="huggingface",
    hf_dataset="mnist"
)
```

**Configuration Options:**
```python
@dataclass
class TrainingConfig:
    # Model
    model_type: str = "cnn"              # "cnn", "resnet", "efficientnet"
    num_classes: int = 10
    input_shape: tuple = (28, 28, 1)
    
    # Training
    batch_size: int = 32
    epochs: int = 10
    learning_rate: float = 0.001
    validation_split: float = 0.2
    
    # Data
    data_source: str = "local"           # "local" or "huggingface"
    dataset_name: str = "mnist"
    hf_dataset: Optional[str] = None
    augmentation: bool = True
    
    # Output
    export_format: List[str] = ["h5", "tflite"]
```

---

### ✅ **2. Data Loader (`data_loader.py`)**

**Features:**
- **Hugging Face datasets:** MNIST, EMNIST, etc.
- **Local data:** Load from `.npz` files
- **Synthetic data:** Demo fallback
- **Preprocessing:** Normalization, reshaping
- **Augmentation:** Ready for extension

**Example Usage:**
```python
from ml_training.data_loader import DataLoader
from ml_training.config import MNIST_CONFIG

loader = DataLoader(MNIST_CONFIG)
X_train, y_train, X_test, y_test = loader.load_data()

# Save for future use
loader.save_local_data(X_train, y_train, X_test, y_test)
```

**Data Sources:**

**1. Hugging Face:**
```python
config = TrainingConfig(
    data_source="huggingface",
    hf_dataset="mnist"  # or "emnist"
)
```

**2. Local Files:**
```python
config = TrainingConfig(
    data_source="local",
    dataset_name="custom-handwriting",
    data_dir="ml_training/data"
)
# Expects: custom-handwriting_train.npz, custom-handwriting_test.npz
```

**3. Synthetic (Demo):**
```python
# Automatically generated if no data found
# Creates random images for testing
```

---

## 🚧 **COMPONENTS TO IMPLEMENT**

### **3. Model Builder (`model_builder.py`)**

**Purpose:** Create ML models (CNN, ResNet, EfficientNet)

**Features:**
```python
class ModelBuilder:
    def build_cnn(self, config):
        """Simple CNN for MNIST-like datasets"""
        pass
    
    def build_resnet(self, config):
        """ResNet for more complex data"""
        pass
    
    def build_efficientnet(self, config):
        """EfficientNet for production"""
        pass
```

---

### **4. Trainer (`trainer.py`)**

**Purpose:** Training engine with callbacks

**Features:**
```python
class Trainer:
    def __init__(self, model, config, progress_callback=None):
        self.model = model
        self.config = config
        self.progress_callback = progress_callback
    
    def train(self, X_train, y_train, X_val, y_val):
        """
        Train model with real-time progress updates
        Sends updates via progress_callback:
        - Epoch progress
        - Loss/accuracy
        - ETA
        """
        pass
    
    def evaluate(self, X_test, y_test):
        """Evaluate model on test set"""
        pass
    
    def predict(self, X):
        """Make predictions"""
        pass
```

---

### **5. FastAPI Routes (`api_routes.py`)**

**Endpoints:**

```python
# Training endpoints
POST   /api/ml/train/start         # Start training
POST   /api/ml/train/stop          # Stop training
GET    /api/ml/train/status        # Get training status

# Model endpoints
GET    /api/ml/models               # List trained models
GET    /api/ml/models/{id}         # Get model info
DELETE /api/ml/models/{id}         # Delete model
POST   /api/ml/models/{id}/export  # Export model

# Dataset endpoints
GET    /api/ml/datasets            # List available datasets
POST   /api/ml/datasets/upload     # Upload custom dataset

# Progress WebSocket
WS     /api/ml/ws/training/{id}    # Real-time training progress
```

**Example:**
```python
@app.post("/api/ml/train/start")
async def start_training(
    config: TrainingConfig,
    background_tasks: BackgroundTasks
):
    training_id = str(uuid.uuid4())
    background_tasks.add_task(train_model, training_id, config)
    return {"training_id": training_id, "status": "started"}
```

---

### **6. WebSocket Handler (`websocket_handler.py`)**

**Purpose:** Real-time training progress

**Features:**
```python
@app.websocket("/api/ml/ws/training/{training_id}")
async def training_progress(websocket: WebSocket, training_id: str):
    await websocket.accept()
    
    while training_active(training_id):
        progress = get_training_progress(training_id)
        await websocket.send_json({
            "epoch": progress.epoch,
            "total_epochs": progress.total_epochs,
            "loss": progress.loss,
            "accuracy": progress.accuracy,
            "val_loss": progress.val_loss,
            "val_accuracy": progress.val_accuracy,
            "eta_seconds": progress.eta,
            "status": progress.status
        })
        await asyncio.sleep(1)
```

---

### **7. Model Exporter (`model_exporter.py`)**

**Purpose:** Export trained models to various formats

**Features:**
```python
class ModelExporter:
    def export_h5(self, model, path):
        """Export to Keras H5 format"""
        model.save(path)
    
    def export_tflite(self, model, path):
        """Export to TensorFlow Lite"""
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        tflite_model = converter.convert()
        with open(path, 'wb') as f:
            f.write(tflite_model)
    
    def export_onnx(self, model, path):
        """Export to ONNX format"""
        import tf2onnx
        # Convert to ONNX
        pass
```

---

## 💻 **NEXT.JS FRONTEND**

### **Training Control UI**

**Page:** `/dashboard/ml-training`

**Components:**
```tsx
<MLTrainingPage>
  <ConfigurationPanel>
    - Select dataset (MNIST, EMNIST, Custom)
    - Configure model (CNN, ResNet)
    - Set hyperparameters
    - Start/Stop buttons
  </ConfigurationPanel>
  
  <ProgressVisualization>
    - Real-time loss/accuracy charts
    - Epoch progress bar
    - ETA display
    - Current metrics
  </ProgressVisualization>
  
  <ModelManagement>
    - List trained models
    - Download/Export
    - Delete
    - Test predictions
  </ModelManagement>
</MLTrainingPage>
```

---

## 📊 **TRAINING FLOW**

```
1. User selects configuration in Next.js UI
   ↓
2. Frontend sends POST /api/ml/train/start
   ↓
3. Backend starts training in background
   ↓
4. Frontend connects to WebSocket
   ↓
5. Backend sends real-time updates:
   - Epoch 1/10: loss=0.5, acc=0.85
   - Epoch 2/10: loss=0.3, acc=0.90
   - ...
   ↓
6. Frontend displays live charts
   ↓
7. Training completes
   ↓
8. Model saved to ml_training/models/
   ↓
9. Frontend shows success + download options
```

---

## 🎨 **UI MOCKUP**

```
┌─────────────────────────────────────────────────────────┐
│ 🎓 ML Model Training                         [Stop]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────┐  ┌──────────────────────────────┐ │
│ │ Configuration   │  │ Training Progress            │ │
│ │                 │  │                              │ │
│ │ Dataset: MNIST  │  │ Epoch: 7/10                  │ │
│ │ Model: CNN      │  │ ████████████░░░░ 70%         │ │
│ │ Epochs: 10      │  │                              │ │
│ │ Batch: 32       │  │ Loss: 0.1234 ↓               │ │
│ │                 │  │ Accuracy: 94.5% ↑            │ │
│ │ [Start Training]│  │                              │ │
│ └─────────────────┘  │ ┌─────────────────────────┐  │ │
│                      │ │   Loss Chart           │  │ │
│ ┌─────────────────┐  │ │                         │  │ │
│ │ Trained Models  │  │ │    ╱╲                  │  │ │
│ │                 │  │ │   ╱  ╲╲                │  │ │
│ │ • mnist_v1.h5   │  │ │  ╱    ╲╲___            │  │ │
│ │   94.2% acc     │  │ │ ╱         ╲            │  │ │
│ │   [Download]    │  │ └─────────────────────────┘  │ │
│ │                 │  │                              │ │
│ │ • mnist_v2.h5   │  │ ┌─────────────────────────┐  │ │
│ │   95.8% acc     │  │ │  Accuracy Chart        │  │ │
│ │   [Download]    │  │ │                         │  │ │
│ └─────────────────┘  │ │         ╱──────         │  │ │
│                      │ │        ╱                │  │ │
│                      │ │       ╱                 │  │ │
│                      │ │     _╱                  │  │ │
│                      │ └─────────────────────────┘  │ │
│                      └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 **DEPENDENCIES**

```txt
# ml_training/requirements.txt
tensorflow>=2.13.0
torch>=2.0.0  # Optional, for PyTorch models
datasets>=2.14.0  # Hugging Face datasets
transformers>=4.30.0
numpy>=1.24.0
Pillow>=10.0.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
tensorboard>=2.13.0
tf2onnx>=1.15.0  # For ONNX export
```

---

## 🚀 **NEXT STEPS**

### **Immediate (This Session):**
1. ✅ Create `config.py`
2. ✅ Create `data_loader.py`
3. 🚧 Create `model_builder.py`
4. 🚧 Create `trainer.py`
5. 🚧 Create `api_routes.py`

### **Next Session:**
6. Create `websocket_handler.py`
7. Create `model_exporter.py`
8. Integrate into main FastAPI app
9. Create Next.js training UI
10. Test end-to-end flow

---

## 🎯 **SUMMARY**

```
┌──────────────────────────────────────────┐
│  🎓 ML TRAINING SYSTEM                   │
├──────────────────────────────────────────┤
│  ✅ Configuration system                 │
│  ✅ Data loader (HF + local)            │
│  🚧 Model builder (next)                │
│  🚧 Training engine (next)              │
│  🚧 FastAPI routes (next)               │
│  🚧 WebSocket progress (next)           │
│  🚧 Next.js UI (next)                   │
│                                          │
│  Status: Foundation Complete            │
│  Next: Model architectures              │
└──────────────────────────────────────────┘
```

**Progress:** 2/7 components ✅  
**Status:** 🚧 In Progress  
**Ready:** Foundation laid, continue implementation  

