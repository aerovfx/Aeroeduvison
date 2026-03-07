# 🔬 Phòng thí nghiệm Quang học ảo

Mô phỏng các hiện tượng quang học: **Khúc xạ**, **Phản xạ**, **Tán sắc ánh sáng**, và **Thấu kính** với Canvas 2D và FastAPI backend.

## ✨ Tính năng

### 1. 📐 Khúc xạ ánh sáng (Refraction)
- Định luật Snell: n₁sin(θ₁) = n₂sin(θ₂)
- Tính góc khúc xạ tự động
- Phát hiện phản xạ toàn phần
- Tính góc tới hạn
- Hỗ trợ nhiều môi trường (không khí, nước, thủy tinh, kim cương...)
- Tán sắc theo bước sóng

### 2. 🪞 Phản xạ ánh sáng (Reflection)
- Phản xạ gương (góc phản xạ = góc tới)
- Phản xạ khuếch tán (nhiều tia phản xạ)
- Trực quan hóa tia tới và tia phản xạ

### 3. 🌈 Tán sắc qua lăng kính (Prism Dispersion)
- Phân tách ánh sáng trắng thành phổ màu
- Lăng kính đều, lăng kính vuông
- Tính góc lệch cho từng màu
- 6 màu cơ bản: đỏ, cam, vàng, xanh lá, xanh dương, tím
- Mô phỏng tán sắc phụ thuộc bước sóng

### 4. 🔍 Thấu kính (Lens)
- Thấu kính hội tụ (convex)
- Thấu kính phân kỳ (concave)
- Công thức thấu kính: 1/f = 1/d + 1/d'
- Tính vị trí ảnh, độ phóng đại
- Phân biệt ảnh thật/ảnh ảo
- Vẽ 3 tia sáng đặc trưng

## 🚀 Quick Start

### Cài đặt

```bash
cd python-simulations/optics-lab
pip3 install -r requirements.txt
```

### Build dữ liệu

```bash
python3 build.py
```

Output:
```
✅ Build completed!
📊 Statistics:
   - Refraction scenarios: 10
   - Reflection scenarios: 8
   - Prism scenarios: 4
   - Lens scenarios: 9
   - Total scenarios: 31
```

### Chạy tests

```bash
python3 test_simulation.py
```

Output: `🎉 All 7 tests passed!`

### Khởi động API server

```bash
bash start_api.sh
```

API sẽ chạy tại: **http://localhost:8002**

## 📡 API Endpoints

### 1. Khúc xạ
```bash
POST /api/refraction
```

Request:
```json
{
  "n1": 1.0,
  "n2": 1.33,
  "angle_deg": 45,
  "wavelength": 580
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "type": "refraction",
    "n1": 1.0,
    "n2": 1.33,
    "angle_in_deg": 45.0,
    "angle_out_deg": 32.12,
    "is_total_reflection": false,
    "critical_angle_deg": 48.75,
    "rays": [...]
  }
}
```

### 2. Phản xạ
```bash
POST /api/reflection
```

Request:
```json
{
  "angle_deg": 30,
  "is_diffuse": false
}
```

### 3. Lăng kính
```bash
POST /api/prism
```

Request:
```json
{
  "apex_angle_deg": 60,
  "n_prism": 1.5,
  "incident_angle_deg": 50
}
```

### 4. Thấu kính
```bash
POST /api/lens
```

Request:
```json
{
  "focal_length": 100,
  "object_distance": 150,
  "lens_type": "convex"
}
```

### 5. Danh sách môi trường
```bash
GET /api/materials
```

Response: Danh sách 8 môi trường với chiết suất

### 6. Phổ bước sóng
```bash
GET /api/spectrum
```

Response: 41 điểm phổ từ 380nm đến 780nm

## 🎯 Sử dụng trong Python

```python
from main import RefractionSimulation, PrismSimulation, LensSimulation

# 1. Khúc xạ
refraction = RefractionSimulation(n1=1.0, n2=1.33, angle_deg=45)
result = refraction.to_dict()
print(f"Góc khúc xạ: {result['angle_out_deg']}°")

# 2. Lăng kính
prism = PrismSimulation(apex_angle_deg=60, n_prism=1.5)
result = prism.to_dict()
print(f"Số màu: {len(result['spectrum_colors'])}")

# 3. Thấu kính
lens = LensSimulation(focal_length=100, object_distance=150, lens_type="convex")
result = lens.to_dict()
print(f"Khoảng cách ảnh: {result['image_info']['image_distance']} cm")
```

## 📊 Dữ liệu có sẵn

File `output/data.json` chứa:
- **31 scenarios** đã tính toán sẵn
- **10 scenarios** khúc xạ (air→water, water→air, ...)
- **8 scenarios** phản xạ (gương, khuếch tán)
- **4 scenarios** lăng kính (đều, vuông, ...)
- **9 scenarios** thấu kính (hội tụ, phân kỳ, ...)
- **8 môi trường** với chiết suất
- **41 điểm** phổ bước sóng

## 🎨 Vẽ với Canvas 2D

Mỗi tia sáng được biểu diễn bởi:

```typescript
interface Ray {
  start: { x: number, y: number }
  end: { x: number, y: number }
  color: string        // Mã màu hex
  intensity: number    // 0.0 - 1.0
  wavelength: number   // nm
}
```

Ví dụ vẽ tia sáng:

```javascript
function drawRay(ctx, ray) {
  ctx.beginPath();
  ctx.moveTo(ray.start.x, ray.start.y);
  ctx.lineTo(ray.end.x, ray.end.y);
  ctx.strokeStyle = ray.color;
  ctx.globalAlpha = ray.intensity;
  ctx.lineWidth = 2;
  ctx.stroke();
}
```

## 🧪 Test Cases

| Test | Mô tả | Status |
|------|-------|--------|
| Khúc xạ | Air→Water, phản xạ toàn phần, bước sóng | ✅ |
| Phản xạ | Gương, khuếch tán | ✅ |
| Lăng kính | Tán sắc, 6 màu, góc lệch | ✅ |
| Thấu kính | Hội tụ, phân kỳ, ảnh thật/ảo | ✅ |
| Môi trường | 8 materials | ✅ |
| Phổ | 41 wavelengths | ✅ |
| JSON | Serialization | ✅ |

## 📚 Công thức vật lý

### Định luật Snell (Khúc xạ)
```
n₁ × sin(θ₁) = n₂ × sin(θ₂)
```

### Góc tới hạn (Phản xạ toàn phần)
```
θc = arcsin(n₂/n₁)  (khi n₁ > n₂)
```

### Công thức thấu kính
```
1/f = 1/d + 1/d'
```

### Độ phóng đại
```
k = -d'/d
```

### Công thức Cauchy (Tán sắc)
```
n(λ) = A + B/λ²
```

## 🎓 Mục tiêu học tập

### Lớp 11
- Hiểu định luật Snell
- Quan sát khúc xạ, phản xạ
- Nhận biết phản xạ toàn phần
- Tính góc tới hạn

### Lớp 12
- Tán sắc ánh sáng qua lăng kính
- Thấu kính hội tụ, phân kỳ
- Công thức thấu kính
- Tính toán ảnh thật, ảnh ảo

## 🌐 Frontend Integration

### Next.js Component

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';

export default function OpticsSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rays, setRays] = useState([]);
  
  // Fetch data từ API
  useEffect(() => {
    fetch('http://localhost:8002/api/refraction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        n1: 1.0,
        n2: 1.33,
        angle_deg: 45,
        wavelength: 580
      })
    })
    .then(res => res.json())
    .then(data => setRays(data.data.rays));
  }, []);
  
  // Vẽ trên Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ các tia sáng
    rays.forEach(ray => {
      ctx.beginPath();
      ctx.moveTo(ray.start.x + 300, ray.start.y + 300);
      ctx.lineTo(ray.end.x + 300, ray.end.y + 300);
      ctx.strokeStyle = ray.color;
      ctx.globalAlpha = ray.intensity;
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }, [rays]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={600}
      className="border border-gray-300"
    />
  );
}
```

## 🔧 Configuration

### Chiết suất môi trường

| Môi trường | Chiết suất (n) |
|------------|----------------|
| Chân không | 1.000 |
| Không khí | 1.000293 |
| Nước | 1.333 |
| Thủy tinh | 1.500 |
| Kim cương | 2.420 |
| Dầu | 1.470 |
| Cồn | 1.360 |
| Băng | 1.310 |

### Phổ bước sóng

| Màu | Bước sóng (nm) | Hex Code |
|-----|----------------|----------|
| Tím | 420 | #8B00FF |
| Xanh dương | 470 | #0000FF |
| Xanh lá | 530 | #00FF00 |
| Vàng | 580 | #FFFF00 |
| Cam | 600 | #FFA500 |
| Đỏ | 650 | #FF0000 |

## 📦 File Structure

```
optics-lab/
├── main.py              # Core simulation logic
├── api.py               # FastAPI backend
├── build.py             # Build script
├── test_simulation.py   # Test suite
├── start_api.sh         # API startup script
├── manifest.json        # Metadata
├── README.md            # This file
├── output/
│   └── data.json        # Generated data (31 scenarios)
└── requirements.txt     # Python dependencies
```

## 🛠️ Dependencies

```
fastapi>=0.104.0
uvicorn>=0.24.0
numpy>=1.24.0
pydantic>=2.0.0
```

## 📖 API Documentation

Sau khi khởi động server, truy cập:

- **Swagger UI**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc
- **Health check**: http://localhost:8002/health

## 🎯 Use Cases

### 1. Giáo dục
- Minh họa bài giảng Vật lý lớp 11-12
- Thí nghiệm ảo thay thế thiết bị thật
- Bài tập tương tác

### 2. Nghiên cứu
- Test các thiết kế quang học
- Mô phỏng đường đi của ánh sáng
- Tính toán hệ thống thấu kính

### 3. Demo
- Trực quan hóa các hiện tượng quang học
- Presentation, workshop
- Ứng dụng web tương tác

## 🤝 Contributing

Contributions are welcome! Các tính năng có thể mở rộng:

- [ ] Giao thoa ánh sáng
- [ ] Nhiễu xạ ánh sáng
- [ ] Phân cực ánh sáng
- [ ] Kính hiển vi, kính thiên văn
- [ ] Cáp quang
- [ ] Làm sắc thực (chromatic aberration)
- [ ] Hệ nhiều thấu kính
- [ ] 3D ray tracing

## 📄 License

MIT License - Free to use for education and research

## 👨‍💻 Author

**LabTwin Team**  
Version: 1.0.0  
Date: 2024-10-12

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs trong console
2. Chạy `python3 test_simulation.py`
3. Xem API docs tại `/docs`

---

**Enjoy exploring optics! 🌈✨**


