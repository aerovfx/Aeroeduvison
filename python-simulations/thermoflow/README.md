# ThermoFlow - Heat Transfer Simulation 🔥

Mô phỏng truyền nhiệt và phân bố nhiệt độ sử dụng phương trình nhiệt (Heat Equation).

## Tính năng

- ✅ **Heat Equation Solver**: Giải PDE bằng finite difference
- ✅ **2D Temperature Field**: Mô phỏng phân bố nhiệt trên mặt phẳng
- ✅ **Heat Sources & Sinks**: Nguồn nhiệt và vùng làm mát
- ✅ **Thermal Obstacles**: Vật liệu có độ dẫn nhiệt khác nhau
- ✅ **Dynamic Heatmap**: Visualization màu sắc (xanh → vàng → đỏ)
- ✅ **AI Hot Zone Prediction**: Tự động phát hiện vùng nhiệt cao
- ✅ **Real-time Statistics**: Min, max, mean, std temperature

## Phương trình

### Heat Equation (PDE)
```
∂T/∂t = α∇²T
```

Trong đó:
- `T`: Nhiệt độ (temperature)
- `t`: Thời gian (time)
- `α`: Độ khuếch tán nhiệt (thermal diffusivity)
- `∇²T`: Laplacian của T

### Finite Difference Approximation
```
T(t+Δt) = T(t) + α·Δt·(T_left + T_right + T_up + T_down - 4T)
```

## Cài đặt

```bash
pip install -r requirements.txt
python build.py
python api.py
```

## API Endpoints

### POST /simulate
```json
{
  "width": 100,
  "height": 100,
  "thermal_diffusivity": 0.1,
  "steps": 100,
  "initial_temperature": 20,
  "heat_sources": [
    {"x": 50, "y": 50, "temperature": 100, "radius": 10}
  ],
  "heat_sinks": [],
  "obstacles": []
}
```

### GET /presets
5 kịch bản có sẵn:
1. 🔥 Single Heat Source
2. 🔥🔥 Two Heat Sources
3. ❄️ Cooling System
4. 🧱 Thermal Insulation
5. 🌡️ Heat Flow Pattern

## Presets

### 1. Single Heat Source
Một nguồn nhiệt ở giữa, quan sát sự lan truyền đồng tâm.

### 2. Two Heat Sources
Hai nguồn nhiệt tương tác, tạo vùng giao thoa nhiệt độ.

### 3. Cooling System
Nguồn nhiệt trung tâm với 4 heat sinks ở góc (mô phỏng tản nhiệt).

### 4. Thermal Insulation
Nguồn nhiệt với vật cản cách nhiệt, quan sát hiệu ứng chắn nhiệt.

### 5. Heat Flow Pattern
Dòng nhiệt phức tạp với nhiều nguồn và sink.

## AI Prediction

### Hot Zone Detection
```python
threshold = mean(T) + 1.5 × std(T)
hot_zones = {points where T > threshold}
```

Tự động:
1. Tính threshold từ phân bố nhiệt độ
2. Tìm tất cả vùng T > threshold
3. Cluster thành zones
4. Hiển thị với vòng tròn cyan

## Visualization

### Heatmap Colors
- 🔵 **Blue**: Lạnh (< mean)
- 🟡 **Yellow**: Ấm (≈ mean)
- 🔴 **Red**: Nóng (> mean)
- ⚫ **Gray**: Vật cản (obstacles)

### Statistics Display
- 🔥 **Max Temp**: Nhiệt độ cao nhất
- ❄️ **Min Temp**: Nhiệt độ thấp nhất
- 📊 **Mean**: Nhiệt độ trung bình
- 📈 **Std**: Độ lệch chuẩn

## Ứng dụng

1. **🏠 Xây dựng**: Phân tích cách nhiệt nhà
2. **💻 Electronics**: Tản nhiệt chip, CPU
3. **🍳 Nấu ăn**: Phân bố nhiệt trên chảo
4. **🌡️ HVAC**: Hệ thống điều hòa không khí
5. **🔥 An toàn**: Dự đoán lan rộng nhiệt

## Ví dụ

### Python
```python
from main import simulate_heat_transfer

config = {
    'width': 100,
    'height': 100,
    'thermal_diffusivity': 0.1,
    'steps': 100,
    'initial_temperature': 20,
    'heat_sources': [
        {'x': 50, 'y': 50, 'temperature': 100, 'radius': 10}
    ]
}

result = simulate_heat_transfer(config)
print(f"Final mean temp: {result['final_statistics']['mean']:.1f}°C")
```

### API
```bash
curl -X POST http://localhost:8010/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "width": 100,
    "height": 100,
    "thermal_diffusivity": 0.15,
    "steps": 100,
    "initial_temperature": 20,
    "heat_sources": [
      {"x": 50, "y": 50, "temperature": 100, "radius": 10}
    ]
  }'
```

## Performance

- Grid: 100×100 → ~0.5s (100 steps)
- Grid: 200×200 → ~2s (100 steps)
- Grid: 500×500 → ~15s (100 steps)

## License

MIT

---

**Port**: 8010  
**Category**: Nhiệt học  
**Level**: Lớp 10-11  
**XP**: 120 XP  
**Status**: ✅ Complete
