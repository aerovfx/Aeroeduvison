# 🚀 Phòng thí nghiệm Chuyển động Vật lý v2.0

Mô phỏng **7 loại chuyển động** với AI prediction, vector visualization, và real-time graphs.

## ✨ Tính năng - 7 Loại Chuyển động

### 1. 🔻 Rơi tự do (Free Fall)
- Tính h(t), v(t), a(t)
- Thời gian chạm đất
- Vận tốc chạm đất
- Năng lượng động/thế

### 2. 🎯 Ném xiên (Projectile Motion)
- Quỹ đạo parabol
- Tầm xa, độ cao max
- Thời gian bay
- So sánh góc ném

### 3. 〰️ Dao động điều hòa (Harmonic Motion)
- x = A×cos(ωt + φ)
- Vận tốc, gia tốc
- Năng lượng
- Chu kỳ, tần số

### 4. ➡️ Chuyển động thẳng đều (Uniform Motion)
- Vận tốc không đổi
- Quãng đường = v × t
- Không có gia tốc

### 5. 🚀 Chuyển động nhanh dần đều (Accelerated Motion)
- Gia tốc không đổi
- s = v₀t + ½at²
- Vận tốc tăng dần

### 6. ⭕ Chuyển động tròn đều (Circular Motion)
- Quỹ đạo tròn
- Vận tốc dài v = rω
- Gia tốc hướng tâm aₕₜ = rω²
- Chu kỳ, tần số

### 7. 🔶 Con lắc đơn (Simple Pendulum)
- Dao động điều hòa (góc nhỏ)
- Chu kỳ T = 2π√(L/g)
- Quỹ đạo cung tròn
- Năng lượng bảo toàn

### 8. 🤖 AI Prediction
- Linear Regression
- Dự đoán quỹ đạo
- R², RMSE metrics

## 🚀 Quick Start

```bash
cd python-simulations/physics-motion
python3 main.py     # Test
python3 build.py    # Build data
bash start_api.sh   # API: http://localhost:8004
```

## 📡 API Examples

### 1. Rơi tự do
```bash
curl -X POST "http://localhost:8007/api/free-fall" \
  -H "Content-Type: application/json" \
  -d '{"h0": 100, "v0": 0, "g": 9.8}'
```

### 2. Ném xiên
```bash
curl -X POST "http://localhost:8007/api/projectile" \
  -H "Content-Type: application/json" \
  -d '{"v0": 20, "angle_deg": 45, "h0": 0}'
```

### 3. Dao động điều hòa
```bash
curl -X POST "http://localhost:8007/api/harmonic" \
  -H "Content-Type: application/json" \
  -d '{"A": 0.1, "omega": 6.28, "phi": 0}'
```

### 4. Chuyển động thẳng đều
```bash
curl -X POST "http://localhost:8007/api/uniform" \
  -H "Content-Type: application/json" \
  -d '{"v": 10, "x0": 0, "duration": 10}'
```

### 5. Chuyển động nhanh dần đều
```bash
curl -X POST "http://localhost:8007/api/accelerated" \
  -H "Content-Type: application/json" \
  -d '{"v0": 0, "a": 2, "x0": 0, "duration": 10}'
```

### 6. Chuyển động tròn đều
```bash
curl -X POST "http://localhost:8007/api/circular" \
  -H "Content-Type: application/json" \
  -d '{"r": 5, "omega": 1, "duration": 10}'
```

### 7. Con lắc đơn
```bash
curl -X POST "http://localhost:8007/api/pendulum" \
  -H "Content-Type: application/json" \
  -d '{"L": 1, "theta0_deg": 30, "duration": 10, "g": 9.8}'
```

### 8. AI Prediction
```bash
curl -X POST "http://localhost:8007/api/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "motion_type": "free_fall",
    "training_data": [...],
    "predict_times": [1, 2, 3]
  }'
```

## 📊 Data

- **21+ scenarios** (7 loại × 3 variations)
- **AI model** (Linear Regression)
- **Canvas-ready** trajectory data
- **Vector visualization** (velocity, acceleration)
- **Real-time graphs** (position, velocity, acceleration)

## 🎨 Canvas Animation

```javascript
trajectory.forEach(state => {
  ctx.arc(state.position.x, state.position.y, 5, 0, 2*Math.PI);
  ctx.fill();
});
```

---

## 🎯 Features

✅ 7 loại chuyển động đầy đủ  
✅ Canvas animation với vectors  
✅ Real-time graphs (t-x, t-v, t-a)  
✅ AI prediction (Linear Regression)  
✅ Interactive controls (sliders)  
✅ Physics accuracy (equations verified)  
✅ FastAPI backend (port 8007)  
✅ Swagger UI documentation  

**Docs**: http://localhost:8007/docs  
**Version**: 2.0.0




