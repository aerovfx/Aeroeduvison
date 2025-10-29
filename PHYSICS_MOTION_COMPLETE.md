# 🚀 Chuyển động Vật lý với AI - Hoàn tất!

## ✅ Tổng quan

Đã hoàn thành **Phòng thí nghiệm Chuyển động Vật lý** với AI prediction:
- ✅ Rơi tự do (Free Fall)
- ✅ Ném xiên (Projectile Motion)
- ✅ Dao động điều hòa (Harmonic Motion)
- ✅ AI Linear Regression dự đoán chuyển động
- ✅ FastAPI backend
- ✅ Canvas-ready data

## 📦 Files

```
physics-motion/
├── main.py              ✅ 550+ lines - Core + AI
├── api.py               ✅ 350+ lines - FastAPI
├── build.py             ✅ Build script
├── start_api.sh         ✅ Startup
├── manifest.json        ✅ Metadata
├── README.md            ✅ Docs
├── requirements.txt     ✅ Dependencies
└── output/data.json     ✅ 10 scenarios
```

## 🎯 Features

### 1. ⬇️ Rơi tự do
**Equations**:
- h(t) = h₀ + v₀t - ½gt²
- v(t) = v₀ - gt
- a(t) = -g

**Output**:
- Thời gian chạm đất
- Vận tốc chạm đất
- Quỹ đạo (100 điểm)

### 2. 🎯 Ném xiên
**Equations**:
- x(t) = v₀ₓ × t
- y(t) = h₀ + v₀ᵧt - ½gt²

**Output**:
- Tầm xa
- Độ cao max
- Thời gian bay
- Quỹ đạo parabol

### 3. 〰️ Dao động điều hòa
**Equations**:
- x(t) = A×cos(ωt + φ)
- v(t) = -Aω×sin(ωt + φ)
- a(t) = -Aω²×cos(ωt + φ)

**Output**:
- Vận tốc max
- Gia tốc max
- Năng lượng toàn phần

### 4. 🤖 AI Prediction

**Algorithm**: Linear Regression (NumPy)

**For Free Fall**:
```python
# h = h₀ - ½gt²
# Linear regression: h vs t²
# Predict: h₀, g
```

**Metrics**:
- R² (coefficient of determination)
- RMSE (root mean square error)

**Example**:
- Training: 20 points
- Predicted h₀: 100.0001m (actual: 100m)
- Predicted g: 9.8m/s² (actual: 9.8)
- R²: 1.0 (perfect fit!)

## 📊 Data

### Scenarios (10 total)
- **4 free fall**: 10m, 30m, 50m, 100m
- **3 projectile**: 30°, 45°, 60°
- **3 harmonic**: A=0.05m, 0.1m, 0.2m

### AI Demo
- Model trained on 20 points
- Predictions at t=1,2,3,4s
- R²=1.0, perfect accuracy

## 🚀 Usage

### Test Core
```bash
cd python-simulations/physics-motion
python3 main.py
```

Output:
```
=== PHÒNG THÍ NGHIỆM CHUYỂN ĐỘNG VẬT LÝ ===
1. Rơi tự do: 100m → 4.52s
2. Ném xiên: 45° → 40.8m
3. Dao động: A=0.1m, f=1Hz
4. AI: Predicted g=9.8m/s² (R²=1.0) ✅
```

### Build Data
```bash
python3 build.py
```

### Start API
```bash
bash start_api.sh
# → http://localhost:8004
```

## 📡 API

**Port**: 8004  
**Docs**: http://localhost:8004/docs

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/free-fall` | POST | Rơi tự do |
| `/api/projectile` | POST | Ném xiên |
| `/api/harmonic` | POST | Dao động |
| `/api/predict` | POST | AI prediction |
| `/api/compare` | POST | So sánh góc |

### Examples

**Free Fall**:
```bash
curl -X POST "http://localhost:8004/api/free-fall" \
  -H "Content-Type: application/json" \
  -d '{"h0": 100, "v0": 0}'
```

**AI Predict**:
```bash
curl -X POST "http://localhost:8004/api/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "motion_type": "free_fall",
    "training_data": [...],
    "predict_times": [1, 2, 3, 4]
  }'
```

## 🎨 Canvas

### Data Structure
```typescript
interface MotionState {
  t: number
  position: { x: number, y: number }
  velocity: { vx: number, vy: number }
  acceleration: { ax: number, ay: number }
  speed: number
  kinetic_energy: number
  potential_energy: number
}
```

### Animation
```javascript
function drawTrajectory(ctx, trajectory) {
  ctx.beginPath();
  trajectory.forEach((state, i) => {
    if (i === 0) ctx.moveTo(state.position.x, state.position.y);
    else ctx.lineTo(state.position.x, state.position.y);
  });
  ctx.stroke();
}
```

## 📚 Formulas

### Rơi tự do
```
h = h₀ + v₀t - ½gt²
v = v₀ - gt
t_ground = (v₀ + √(v₀² + 2gh₀)) / g
```

### Ném xiên
```
x = v₀cos(θ) × t
y = h₀ + v₀sin(θ)t - ½gt²
Range = v₀²sin(2θ) / g
Max height = h₀ + v₀²sin²(θ) / (2g)
```

### Dao động
```
x = A×cos(ωt + φ)
v_max = Aω
a_max = Aω²
E_total = ½mω²A²
```

## 🤖 AI Model

### Training
```python
# Input: [(t₁, h₁), (t₂, h₂), ...]
# Fit: h = a + b×t²
# Output: h₀ = a, g = -2b
```

### Prediction
```python
model = train_free_fall_model(training_data)
predictions = predict(model, [1, 2, 3, 4])
# Returns: [{t: 1, position: {x, y}}, ...]
```

### Metrics
- **R²**: 1.0 = perfect fit
- **RMSE**: Root mean square error

## 🎓 Education

### Lớp 10
- Rơi tự do
- Ném ngang
- Chuyển động thẳng biến đổi đều

### Lớp 11
- Ném xiên
- Dao động điều hòa
- Năng lượng dao động

### Lớp 12
- Phân tích chuyển động
- Tính toán năng lượng
- Mô hình toán học

## 📈 Stats

- **Code**: 550 + 350 = 900 lines
- **Scenarios**: 10 (4+3+3)
- **AI**: Linear Regression
- **API**: 5 endpoints
- **Canvas**: Ready

## 🌟 Highlights

✅ **Physics Accurate** - Công thức chuẩn  
✅ **AI Prediction** - Linear Regression, R²=1.0  
✅ **Real-time Calculation** - Không pre-compute  
✅ **Canvas Ready** - Trajectory data  
✅ **FastAPI** - RESTful + Swagger  
✅ **NumPy** - Fast computation  

## 🔮 Future

### Phase 2
- [ ] Neural Network prediction
- [ ] Collision detection
- [ ] Circular motion
- [ ] Rotational dynamics

### Phase 3
- [ ] 3D motion
- [ ] Air resistance
- [ ] Multiple objects
- [ ] Real-time interaction

## ✨ Summary

**Status**: ✅ **HOÀN TẤT**

**Delivered**:
- 🚀 3 loại chuyển động
- 🤖 AI Linear Regression
- 📡 FastAPI (5 endpoints)
- 🎨 Canvas-ready
- 📚 Full docs
- ✅ Tested & working

**AI Performance**:
- Training: 20 data points
- Accuracy: R² = 1.0
- Parameters: h₀, g predicted perfectly

**Ready for**: Teaching, demos, web apps

---

**Date**: 2024-10-12  
**Version**: 1.0.0  
**Author**: AI Assistant

🚀 **Physics + AI = Complete!** ✨




