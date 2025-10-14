# Aerodynamics Simulation - Quick Start 🌬️

## Khởi động nhanh trong 3 bước

### Bước 1: Start Python API

```bash
cd python-simulations/aerodynamics
python api.py
```

✅ API chạy tại: `http://localhost:8007`

### Bước 2: Start Next.js Dev Server (nếu chưa chạy)

```bash
npm run dev
```

✅ Web app chạy tại: `http://localhost:3000`

### Bước 3: Truy cập Simulation

```
http://localhost:3000/dashboard/labtwin/labs/aerodynamics
```

## Test nhanh API

### Health Check
```bash
curl http://localhost:8007/health
# Output: {"status":"healthy"}
```

### Get Presets
```bash
curl http://localhost:8007/presets
```

### Run Simulation
```bash
curl -X POST http://localhost:8007/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "width": 200,
    "height": 100,
    "viscosity": 0.0001,
    "inletVelocity": 5.0,
    "steps": 50,
    "obstacles": [{
      "shape": "circle",
      "params": {"x": 100, "y": 50, "radius": 15}
    }]
  }'
```

### Run AI Optimization
```bash
curl -X POST http://localhost:8007/optimize \
  -H "Content-Type: application/json" \
  -d '{"target": "low_drag"}'
```

## Các tính năng chính

### 1. Visualization Modes
- **Velocity**: Hiển thị theo vận tốc (xanh → đỏ)
- **Pressure**: Hiển thị theo áp suất
- **Streamlines**: Đường dòng chảy

### 2. Presets có sẵn
- ⭕ **Cylinder**: Dòng khí quanh hình trụ
- ✈️ **Airfoil**: Cánh máy bay NACA
- ⬜ **Square**: Vật cản vuông
- ⭕⭕ **Multi-Cylinder**: Nhiều vật cản

### 3. AI Optimization
- **Low Drag**: Tìm hình dạng có lực cản thấp
- **High Lift**: Tìm hình dạng có lực nâng cao

## Troubleshooting

### API không start được
```bash
# Cài đặt lại dependencies
pip install -r requirements.txt

# Check port 8007
lsof -i :8007
```

### UI không load được data
1. Đảm bảo API đang chạy: `curl http://localhost:8007/health`
2. Check console logs trong browser
3. Verify files exist:
   - `/public/labs/aerodynamics/data.json`
   - `/public/labs/aerodynamics/manifest.json`

### Rebuild data
```bash
cd python-simulations/aerodynamics
python build.py
cp output/data.json ../../public/labs/aerodynamics/
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| Python API | 8007 | http://localhost:8007 |
| Next.js | 3000 | http://localhost:3000 |
| API Docs | 8007 | http://localhost:8007/docs |

## Hướng dẫn chi tiết

Xem: `AERODYNAMICS_SIMULATION_COMPLETE.md`

## Support

- 📚 Documentation: `python-simulations/aerodynamics/README.md`
- 🔧 API Docs: http://localhost:8007/docs
- 💬 Issues: Báo lỗi trong chat

---

**Status:** ✅ Ready
**Last Updated:** 2025-10-12

