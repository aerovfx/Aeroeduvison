# Aerodynamics Simulation 🌬️

Mô phỏng động lực học không khí 2D sử dụng giải thuật Navier-Stokes đơn giản hóa.

## Tính năng

- ✅ **Navier-Stokes Solver**: Giải phương trình động lực học chất lỏng
- ✅ **Nhiều hình dạng vật cản**: Hình trụ, hình vuông, cánh máy bay (NACA airfoil)
- ✅ **Tính toán lực**: Drag (lực cản) và Lift (lực nâng)
- ✅ **Tối ưu hóa AI**: Tìm hình dạng tối ưu dựa trên mục tiêu
- ✅ **Trực quan hóa**: Streamlines, velocity field, density field
- ✅ **WebGL Rendering**: Render luồng khí màu sắc real-time

## Cài đặt

```bash
# Install dependencies
pip install -r requirements.txt

# Build static data
python build.py

# Start API server
./start_api.sh
# hoặc
python api.py
```

## API Endpoints

### POST /simulate
Chạy simulation với cấu hình tùy chỉnh:

```json
{
  "width": 200,
  "height": 100,
  "viscosity": 0.0001,
  "inletVelocity": 5.0,
  "steps": 100,
  "obstacles": [
    {
      "shape": "airfoil",
      "params": {
        "x": 100,
        "y": 50,
        "chord": 40,
        "thickness": 0.12
      }
    }
  ]
}
```

### POST /optimize
Tối ưu hóa hình dạng:

```json
{
  "target": "low_drag"  // hoặc "high_lift"
}
```

### GET /presets
Lấy danh sách presets có sẵn

## Lý thuyết

### Navier-Stokes Equations

Phương trình cơ bản mô tả chuyển động của chất lỏng:

```
∂u/∂t + (u·∇)u = -∇p + ν∇²u + f
∇·u = 0  (incompressibility)
```

Trong đó:
- `u`: velocity field (vận tốc)
- `p`: pressure field (áp suất)
- `ν`: kinematic viscosity (độ nhớt động học)
- `f`: external forces (lực ngoài)

### Phương pháp giải

1. **Diffusion**: Khuếch tán vận tốc do độ nhớt
2. **Advection**: Vận chuyển vận tốc theo dòng chảy
3. **Projection**: Đảm bảo tính không nén được (incompressibility)

### Tính toán lực

- **Drag Force**: Lực cản theo phương dòng chảy
- **Lift Force**: Lực nâng vuông góc với dòng chảy
- **Coefficients**: Cd = Drag / (0.5 × ρ × v² × A)

## Ví dụ sử dụng

### Test trong Python

```python
from main import simulate_flow

config = {
    'width': 200,
    'height': 100,
    'viscosity': 0.0001,
    'inletVelocity': 5.0,
    'steps': 100,
    'obstacles': [
        {
            'shape': 'circle',
            'params': {'x': 100, 'y': 50, 'radius': 15}
        }
    ]
}

result = simulate_flow(config)
print(f"Drag coefficient: {result['finalForces']['drag_coefficient']}")
```

### Test API

```bash
curl -X POST http://localhost:8007/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "width": 200,
    "height": 100,
    "viscosity": 0.0001,
    "inletVelocity": 5.0,
    "steps": 50,
    "obstacles": [
      {
        "shape": "airfoil",
        "params": {"x": 100, "y": 50, "chord": 40, "thickness": 0.12}
      }
    ]
  }'
```

## Presets

1. **Cylinder**: Dòng khí quanh hình trụ (von Kármán vortex street)
2. **Airfoil**: Cánh máy bay NACA profile
3. **Square**: Vật cản hình vuông
4. **Multi-Cylinder**: Nhiều vật cản

## Tối ưu hóa AI

Hệ thống AI tự động test nhiều hình dạng và tìm ra cấu hình tối ưu:

- **Low Drag**: Giảm lực cản (tối ưu cho tốc độ)
- **High Lift**: Tăng lực nâng (tối ưu cho cánh máy bay)

## Performance

- Grid size: 200×100 (có thể tùy chỉnh)
- Steps: 50-200 (nhiều hơn = chính xác hơn nhưng chậm hơn)
- Sample rate: 5 (giảm để tăng độ phân giải)

## Tài liệu tham khảo

- [Navier-Stokes Equations](https://en.wikipedia.org/wiki/Navier%E2%80%93Stokes_equations)
- [Computational Fluid Dynamics](https://en.wikipedia.org/wiki/Computational_fluid_dynamics)
- [NACA Airfoil](https://en.wikipedia.org/wiki/NACA_airfoil)

## License

MIT

