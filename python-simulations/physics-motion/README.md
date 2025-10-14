# 🚀 Phòng thí nghiệm Chuyển động Vật lý

Mô phỏng chuyển động với **AI prediction**: rơi tự do, ném xiên, dao động điều hòa.

## ✨ Tính năng

### 1. ⬇️ Rơi tự do
- Tính h(t), v(t), a(t)
- Thời gian chạm đất
- Vận tốc chạm đất

### 2. 🎯 Ném xiên
- Quỹ đạo parabol
- Tầm xa, độ cao max
- Thời gian bay
- So sánh góc ném

### 3. 〰️ Dao động điều hòa
- x = A×cos(ωt + φ)
- Vận tốc, gia tốc
- Năng lượng

### 4. 🤖 AI Prediction
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

### Rơi tự do
```bash
curl -X POST "http://localhost:8004/api/free-fall" \
  -H "Content-Type: application/json" \
  -d '{"h0": 100, "v0": 0, "g": 9.8}'
```

### Ném xiên
```bash
curl -X POST "http://localhost:8004/api/projectile" \
  -H "Content-Type: application/json" \
  -d '{"v0": 20, "angle_deg": 45, "h0": 0}'
```

### AI Prediction
```bash
curl -X POST "http://localhost:8004/api/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "motion_type": "free_fall",
    "training_data": [...],
    "predict_times": [1, 2, 3]
  }'
```

## 📊 Data

- **10 scenarios** (4 rơi tự do + 3 ném xiên + 3 dao động)
- **AI model** (Linear Regression)
- **Canvas-ready** trajectory data

## 🎨 Canvas Animation

```javascript
trajectory.forEach(state => {
  ctx.arc(state.position.x, state.position.y, 5, 0, 2*Math.PI);
  ctx.fill();
});
```

---

**Docs**: http://localhost:8004/docs



