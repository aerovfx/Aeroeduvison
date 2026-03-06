# DataSim.AI - Machine Learning Training Visualization 🤖

Interactive system để học sinh thấy trực tiếp cách AI học từ dữ liệu!

## Tính năng

- ✅ **6 ML Models thật**: Linear Regression, Logistic Regression, KNN, Decision Tree, SVM, Neural Network (PyTorch)
- ✅ **5 Datasets**: Linear, Polynomial, 2D Classification, Circles, Moons
- ✅ **Decision Boundary**: Visualization cho classification
- ✅ **Loss Curves**: Theo dõi training progress
- ✅ **Metrics**: Accuracy, R², MSE
- ✅ **Interactive UI**: Điều chỉnh parameters real-time
- ✅ **Real Models**: Không fake, dùng scikit-learn & PyTorch thật!

## Cài đặt

```bash
# Install dependencies
pip install -r requirements.txt

# Build sample data
python build.py

# Start API
python api.py
# hoặc
./start_api.sh
```

## API Endpoints

### POST /train
Train một ML model:

```json
{
  "dataset_type": "classification_2d",
  "model_type": "logistic_regression",
  "n_samples": 200,
  "noise": 0.1,
  "n_classes": 2,
  "model_params": {}
}
```

### POST /train-neural-network
Train neural network với PyTorch:

```json
{
  "dataset_type": "moons",
  "n_samples": 200,
  "noise": 0.1,
  "hidden_sizes": [16, 8],
  "learning_rate": 0.01,
  "epochs": 100
}
```

### GET /datasets
Lấy danh sách datasets

### GET /models
Lấy danh sách models

## Models

### 1. Linear Regression
- **Use case**: Regression tasks
- **Equation**: y = mx + b
- **Metric**: R² Score, MSE

### 2. Logistic Regression
- **Use case**: Binary classification
- **Method**: Linear + sigmoid
- **Metric**: Accuracy

### 3. K-Nearest Neighbors (KNN)
- **Use case**: Classification, non-parametric
- **Parameters**: n_neighbors (1-20)
- **Metric**: Accuracy

### 4. Decision Tree
- **Use case**: Classification, interpretable
- **Parameters**: max_depth (1-20)
- **Metric**: Accuracy

### 5. Support Vector Machine (SVM)
- **Use case**: Classification, max margin
- **Parameters**: kernel (rbf, linear, poly), C
- **Metric**: Accuracy

### 6. Neural Network (PyTorch)
- **Use case**: Deep learning
- **Architecture**: Customizable hidden layers
- **Parameters**: learning_rate, epochs, hidden_sizes
- **Metric**: Accuracy, Loss

## Datasets

### 1. Linear
- Simple y = mx + b relationship
- Good for: Linear Regression

### 2. Polynomial
- Non-linear y = x² relationship
- Good for: Polynomial Regression

### 3. 2D Classification
- Two separable clusters
- Good for: All classifiers

### 4. Circles
- Concentric circles (non-linear)
- Good for: KNN, SVM, Neural Networks

### 5. Moons
- Interleaving half-moons
- Good for: SVM, Neural Networks, Decision Trees

## Visualization

### Decision Boundary
- Shows how model divides feature space
- Colors represent different classes
- Helps understand model behavior

### Loss Curve
- Shows training progress over epochs
- Train vs Test loss comparison
- Helps detect overfitting

### Scatter Plot
- Data points colored by class
- ✗ marks for incorrect predictions
- Shows train/test split

## Ví dụ

### Python
```python
from main import train_and_evaluate

config = {
    'dataset_type': 'moons',
    'model_type': 'knn',
    'n_samples': 200,
    'model_params': {'n_neighbors': 5}
}

result = train_and_evaluate(config)
print(f"Test accuracy: {result['test_score']:.3f}")
```

### API
```bash
curl -X POST http://localhost:8009/train \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_type": "circles",
    "model_type": "svm",
    "n_samples": 200,
    "noise": 0.1,
    "model_params": {"kernel": "rbf", "C": 1.0}
  }'
```

## UI Features

- 🎮 **Playground**: Train models interactively
- 📚 **Samples**: Pre-trained examples
- 📖 **Theory**: ML concepts explained
- 📊 **Visualizations**: Decision boundaries, loss curves
- 🎯 **Metrics**: Accuracy, R², MSE
- ⚙️ **Controls**: Adjustable parameters

## Performance

| Model | Training Time | Accuracy |
|-------|--------------|----------|
| Linear Regression | <0.1s | R²: 0.99 |
| Logistic Regression | <0.2s | 99-100% |
| KNN | <0.1s | 95-100% |
| Decision Tree | <0.2s | 90-95% |
| SVM | <0.5s | 95-100% |
| Neural Network | 1-5s | 95-100% |

## Learning Objectives

Học sinh sẽ hiểu:
1. ✅ Cách AI "học" từ dữ liệu
2. ✅ Phân biệt classification vs regression
3. ✅ Đọc decision boundaries
4. ✅ Phân tích loss curves
5. ✅ Overfitting vs underfitting
6. ✅ Train/test split importance
7. ✅ So sánh các algorithms

## Dependencies

```
numpy>=1.24.0
scikit-learn>=1.3.0
torch>=2.0.0
fastapi>=0.104.0
uvicorn>=0.24.0
pydantic>=2.0.0
```

## License

MIT

---

**Port**: 8009  
**Category**: Machine Learning  
**Level**: Intermediate (Lớp 11-12)  
**XP**: 200 XP  
**Status**: ✅ Complete



