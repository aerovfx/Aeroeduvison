# 🚀 Quick Start - Phòng thí nghiệm Quang học ảo

## 3 bước để bắt đầu

### 1️⃣ Test simulation (30 giây)

```bash
cd python-simulations/optics-lab
python3 test_simulation.py
```

Kết quả mong đợi:
```
🔬 PHÒNG THÍ NGHIỆM QUANG HỌC ẢO - TEST SUITE
✅ All 7 tests passed!
```

### 2️⃣ Khởi động API (1 phút)

```bash
bash start_api.sh
```

API chạy tại: **http://localhost:8002**

### 3️⃣ Test API (30 giây)

**Khúc xạ**:
```bash
curl -X POST "http://localhost:8002/api/refraction" \
  -H "Content-Type: application/json" \
  -d '{"n1": 1.0, "n2": 1.33, "angle_deg": 45}'
```

**Tán sắc**:
```bash
curl -X POST "http://localhost:8002/api/prism" \
  -H "Content-Type: application/json" \
  -d '{"apex_angle_deg": 60, "n_prism": 1.5, "incident_angle_deg": 50}'
```

**Thấu kính**:
```bash
curl -X POST "http://localhost:8002/api/lens" \
  -H "Content-Type: application/json" \
  -d '{"focal_length": 100, "object_distance": 150, "lens_type": "convex"}'
```

## 📚 API Documentation

**Swagger UI**: http://localhost:8002/docs  
**ReDoc**: http://localhost:8002/redoc

## 🎨 Sử dụng trong Next.js

```tsx
'use client';
import { useState, useEffect } from 'react';

export default function OpticsDemo() {
  const [rays, setRays] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:8002/api/refraction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        n1: 1.0,
        n2: 1.33,
        angle_deg: 45
      })
    })
    .then(res => res.json())
    .then(data => setRays(data.data.rays));
  }, []);
  
  return (
    <div>
      <h1>Khúc xạ ánh sáng</h1>
      <canvas id="canvas" width="600" height="600" />
      {/* Vẽ rays trên canvas */}
    </div>
  );
}
```

## 📊 Data có sẵn

File `output/data.json` chứa **31 scenarios** đã tính sẵn:
- 10 scenarios khúc xạ
- 8 scenarios phản xạ
- 4 scenarios lăng kính
- 9 scenarios thấu kính

## 🎯 Features

✅ **Khúc xạ** - Định luật Snell, phản xạ toàn phần  
✅ **Phản xạ** - Gương & khuếch tán  
✅ **Tán sắc** - Lăng kính, 6 màu  
✅ **Thấu kính** - Hội tụ & phân kỳ  
✅ **API** - FastAPI với Swagger docs  
✅ **Canvas** - Data ready cho Canvas 2D  

## 📖 Full Documentation

Xem `README.md` để biết thêm chi tiết.

---

**Ready to explore optics!** 🌈✨


