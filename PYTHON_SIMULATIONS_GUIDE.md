# 🧪 Python Simulations for LabTwin - Complete Guide

## 🎯 Tổng quan

Hệ thống mô phỏng vật lý bằng **Python** được tích hợp trực tiếp vào **LabTwin** (Next.js). Bạn viết code Python để tạo mô phỏng, build ra dữ liệu JSON, và hệ thống tự động hiển thị trong giao diện web như "phòng thí nghiệm ảo" tương tác.

## ✨ Đặc điểm nổi bật

- 🐍 **Python Backend**: Viết logic mô phỏng bằng Python thuần
- ⚡ **Auto Build**: Script tự động build và copy data sang Next.js
- 🎨 **Canvas Animation**: Hiển thị animation mượt mà với HTML Canvas
- 📊 **Real-time Data**: Dữ liệu được tính toán chính xác từ Python
- 🔥 **Hot Reload**: Rebuild và xem kết quả ngay lập tức
- 📦 **Easy Deploy**: Đơn giản như chạy một lệnh

## 📁 Cấu trúc thư mục

```
/Users/vietchung/lmsmath/
│
├── python-simulations/          # 🐍 Python simulations
│   ├── build-all.py            # Master build script
│   ├── README.md               # Hướng dẫn chi tiết
│   ├── requirements.txt        # Python dependencies
│   │
│   ├── refraction/             # Mô phỏng khúc xạ ánh sáng
│   │   ├── main.py             # Logic simulation
│   │   ├── build.py            # Build script
│   │   ├── manifest.json       # Metadata
│   │   └── output/
│   │       └── data.json       # Output được tạo
│   │
│   └── projectile/             # Mô phỏng ném xiên
│       ├── main.py
│       ├── build.py
│       ├── manifest.json
│       └── output/
│           └── data.json
│
├── public/labs/                 # ⚡ Data sau khi build
│   ├── index.json              # Danh sách tất cả simulations
│   ├── refraction/
│   │   ├── data.json
│   │   └── manifest.json
│   └── projectile/
│       ├── data.json
│       └── manifest.json
│
├── app/(dashboard)/(routes)/dashboard/labtwin/
│   └── labs/                    # 🎨 Next.js pages
│       ├── page.tsx            # Index page
│       ├── refraction/
│       │   └── page.tsx        # Refraction simulation page
│       └── projectile/
│           └── page.tsx        # Projectile simulation page
│
└── components/simulations/      # 🧩 React components
    ├── refraction-viewer.tsx
    └── projectile-viewer.tsx
```

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
cd python-simulations
pip install -r requirements.txt
```

### 2. Build tất cả simulations

```bash
# Cách 1: Dùng npm script
npm run simulations:build

# Cách 2: Chạy trực tiếp
cd python-simulations
python3 build-all.py
```

### 3. Xem kết quả

```bash
# Start Next.js dev server
npm run dev

# Truy cập:
# http://localhost:3000/dashboard/labtwin/labs
```

## 📝 Build từng simulation riêng lẻ

```bash
# Build chỉ refraction
npm run simulations:refraction

# Build chỉ projectile
npm run simulations:projectile

# Hoặc
cd python-simulations/refraction
python3 build.py
```

## 🔧 Tạo Simulation Mới

### Bước 1: Tạo thư mục

```bash
mkdir -p python-simulations/my-simulation/output
```

### Bước 2: Tạo `manifest.json`

```json
{
  "id": "my-simulation",
  "name": "Tên Simulation",
  "description": "Mô tả chi tiết về simulation này",
  "category": "Cơ học",
  "level": "Lớp 10",
  "duration": "30 phút",
  "xp": 50,
  "version": "1.0.0",
  "author": "Your Name",
  "tags": ["tag1", "tag2"],
  "features": [
    "Feature 1",
    "Feature 2",
    "Feature 3"
  ],
  "learning_objectives": [
    "Mục tiêu 1",
    "Mục tiêu 2"
  ],
  "difficulty": "Trung bình",
  "icon": "Zap",
  "color": "#3B82F6"
}
```

### Bước 3: Viết `main.py`

```python
"""
Mô phỏng [Tên simulation]
"""

import numpy as np
import math

class MySimulation:
    def __init__(self, param1, param2):
        """Khởi tạo simulation"""
        self.param1 = param1
        self.param2 = param2
        
    def calculate(self):
        """Tính toán logic chính"""
        # Viết logic của bạn ở đây
        result = self.param1 * self.param2
        return result
    
    def to_dict(self):
        """Chuyển đổi kết quả thành dictionary"""
        return {
            "param1": self.param1,
            "param2": self.param2,
            "result": self.calculate()
        }

def generate_animation_frames(num_frames=50):
    """Tạo các frame cho animation"""
    frames = []
    
    for i in range(num_frames):
        sim = MySimulation(param1=i, param2=100)
        frame_data = sim.to_dict()
        frames.append(frame_data)
    
    return frames

if __name__ == "__main__":
    # Test simulation
    sim = MySimulation(param1=10, param2=20)
    result = sim.to_dict()
    print("Test:", result)
```

### Bước 4: Viết `build.py`

```python
"""
Build script cho simulation
"""

import json
import os
from main import generate_animation_frames, MySimulation

def build():
    """Tạo file output/data.json"""
    print("🔨 Building my simulation...")
    
    # Tạo dữ liệu
    simulation_data = {
        "title": "My Simulation",
        "description": "Mô tả simulation",
        "type": "my-simulation",
        "version": "1.0.0",
        "frames": generate_animation_frames(num_frames=50)
    }
    
    # Tạo thư mục output
    os.makedirs("output", exist_ok=True)
    
    # Lưu file JSON
    output_path = os.path.join("output", "data.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Build completed! Output: {output_path}")

if __name__ == "__main__":
    build()
```

### Bước 5: Build và test

```bash
cd python-simulations
python3 build-all.py
```

### Bước 6: Tạo Next.js page

```tsx
// app/(dashboard)/(routes)/dashboard/labtwin/labs/my-simulation/page.tsx

import { MySimulationViewer } from "@/components/simulations/my-simulation-viewer";

async function getSimulationData() {
  const response = await fetch('/labs/my-simulation/data.json', {
    cache: 'no-store'
  });
  return response.json();
}

export default async function MySimulationPage() {
  const data = await getSimulationData();
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">My Simulation</h1>
      <MySimulationViewer data={data} />
    </div>
  );
}
```

### Bước 7: Tạo React viewer component

```tsx
// components/simulations/my-simulation-viewer.tsx

"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MySimulationViewer({ data }: { data: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  
  const currentFrame = data.frames[frameIndex];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Vẽ trên canvas dựa vào currentFrame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ... logic vẽ của bạn
  }, [currentFrame]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <canvas ref={canvasRef} width={600} height={400} />
        {/* Controls */}
      </CardContent>
    </Card>
  );
}
```

## 🎨 Canvas Drawing Tips

### Vẽ các hình cơ bản

```javascript
// Clear canvas
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Vẽ background
ctx.fillStyle = '#F0F9FF';
ctx.fillRect(0, 0, width, height);

// Vẽ đường thẳng
ctx.strokeStyle = '#3B82F6';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();

// Vẽ hình tròn
ctx.fillStyle = '#EF4444';
ctx.beginPath();
ctx.arc(x, y, radius, 0, 2 * Math.PI);
ctx.fill();

// Vẽ text
ctx.fillStyle = '#1F2937';
ctx.font = '16px Arial';
ctx.fillText('Hello', x, y);

// Vẽ mũi tên
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(-10, -5);
ctx.lineTo(-10, 5);
ctx.closePath();
ctx.fillStyle = '#EF4444';
ctx.fill();
ctx.restore();
```

## 📊 Data Format Best Practices

### Structure tốt cho animation

```json
{
  "title": "Simulation Title",
  "type": "simulation-type",
  "version": "1.0.0",
  "scenarios": [
    {
      "id": "scenario-1",
      "name": "Scenario Name",
      "description": "Description",
      "frames": [
        {
          "time": 0.0,
          "param1": 10,
          "param2": 20,
          "result": 200
        }
      ],
      "controls": {
        "param1": {
          "min": 0,
          "max": 100,
          "default": 10,
          "step": 1,
          "unit": "m/s",
          "label": "Tham số 1"
        }
      }
    }
  ]
}
```

## 🔥 Workflow Development

### 1. Develop Python simulation

```bash
cd python-simulations/my-simulation
python3 main.py  # Test logic
```

### 2. Build data

```bash
python3 build.py  # Tạo data.json
```

### 3. Copy to Next.js

```bash
cd ..
python3 build-all.py  # Auto copy
```

### 4. View in browser

```bash
# Mở browser
http://localhost:3000/dashboard/labtwin/labs/my-simulation
```

### 5. Iterate!

- Sửa Python code
- Build lại
- Refresh browser
- Repeat!

## 🎯 Examples

### 1. Refraction (Khúc xạ ánh sáng)

**Tính năng:**
- Định luật Snell
- Nhiều môi trường (không khí, nước, thủy tinh)
- Phản xạ toàn phần
- Thay đổi góc tới

**Files:**
- `python-simulations/refraction/`
- View: `/dashboard/labtwin/labs/refraction`

### 2. Projectile (Chuyển động ném xiên)

**Tính năng:**
- Quỹ đạo parabol
- Thay đổi góc ném
- Thay đổi vận tốc
- So sánh các hành tinh (trọng lực khác nhau)
- Animation theo thời gian thực

**Files:**
- `python-simulations/projectile/`
- View: `/dashboard/labtwin/labs/projectile`

## 🛠️ Troubleshooting

### Q: Build failed?

**A:** Kiểm tra:
- Python >= 3.7 installed?
- `pip install numpy`
- Syntax errors trong code?
- Có file `build.py` và `manifest.json`?

### Q: Data không hiển thị?

**A:**
- Check file đã được copy vào `/public/labs/`?
- Restart Next.js dev server
- Check browser console logs
- Verify JSON format

### Q: Canvas không vẽ?

**A:**
- Check `canvasRef.current` không null?
- Verify `useEffect` dependencies
- Check data structure
- Console.log để debug

### Q: Animation không mượt?

**A:**
- Tăng `num_frames`
- Giảm `dt` (time step)
- Use `requestAnimationFrame`
- Optimize rendering logic

## 📚 Resources

- [NumPy Documentation](https://numpy.org/doc/)
- [Canvas API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Next.js Documentation](https://nextjs.org/docs)
- [Physics Formulas](https://en.wikipedia.org/wiki/List_of_physics_formulae)

## 🎓 Learning Path

1. **Bắt đầu**: Xem code của `refraction` và `projectile`
2. **Thử nghiệm**: Sửa parameters, rebuild, xem kết quả
3. **Tạo mới**: Clone một simulation, modify logic
4. **Nâng cao**: Tạo simulation phức tạp với nhiều scenarios
5. **Master**: Tích hợp với database, user progress tracking

## 🚢 Deployment

### Production build:

```bash
# Build all simulations
npm run simulations:build

# Build Next.js
npm run build

# Deploy
# Data trong /public/labs/ sẽ được deploy cùng
```

### CI/CD Integration:

```yaml
# .github/workflows/build-simulations.yml
name: Build Python Simulations

on:
  push:
    paths:
      - 'python-simulations/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      - run: pip install -r python-simulations/requirements.txt
      - run: npm run simulations:build
      - run: git add public/labs
      - run: git commit -m "Auto-build simulations"
      - run: git push
```

## 🤝 Contributing

Muốn đóng góp simulation mới?

1. Fork repo
2. Tạo branch: `git checkout -b feature/my-simulation`
3. Thêm simulation trong `python-simulations/`
4. Test: `npm run simulations:build`
5. Commit: `git commit -m "Add my-simulation"`
6. Push: `git push origin feature/my-simulation`
7. Tạo Pull Request

## 📞 Support

Cần giúp đỡ?
- Check `python-simulations/README.md` để biết thêm chi tiết
- Xem examples trong `refraction/` và `projectile/`
- Đọc code comments trong các file Python

---

**Made with ❤️ for LabTwin Physics Education**

🧪 Python + ⚡ Next.js = 🚀 Amazing Simulations!


