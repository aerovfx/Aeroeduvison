# Python Simulations for LabTwin

Hệ thống mô phỏng vật lý bằng Python tích hợp với Next.js LabTwin.

## 📁 Cấu trúc

```
python-simulations/
│
├── build-all.py          # Master build script
├── README.md             # File này
│
├── refraction/           # Mô phỏng khúc xạ ánh sáng
│   ├── main.py           # Code simulation
│   ├── build.py          # Build script
│   ├── manifest.json     # Metadata
│   └── output/
│       └── data.json     # Output được tạo
│
├── projectile/           # Mô phỏng chuyển động ném xiên
│   ├── main.py
│   ├── build.py
│   ├── manifest.json
│   └── output/
│       └── data.json
│
└── [new-simulation]/     # Thêm simulation mới
    ├── main.py
    ├── build.py
    ├── manifest.json
    └── output/
```

## 🚀 Quick Start

### 1. Build tất cả simulations

```bash
cd python-simulations
python build-all.py
```

Hoặc chỉ build một simulation:

```bash
cd python-simulations/refraction
python build.py
```

### 2. Xem trong Next.js

Sau khi build, dữ liệu sẽ được copy sang:
- `/public/labs/refraction/data.json`
- `/public/labs/projectile/data.json`
- `/public/labs/index.json`

Truy cập: `http://localhost:3000/dashboard/labtwin/labs`

## 📝 Tạo Simulation Mới

### Bước 1: Tạo thư mục

```bash
mkdir -p python-simulations/my-simulation/output
```

### Bước 2: Tạo `manifest.json`

```json
{
  "id": "my-simulation",
  "name": "Tên Simulation",
  "description": "Mô tả chi tiết",
  "category": "Cơ học",
  "level": "Lớp 10",
  "duration": "30 phút",
  "xp": 50,
  "version": "1.0.0",
  "features": ["Feature 1", "Feature 2"],
  "icon": "Zap",
  "color": "#3B82F6"
}
```

### Bước 3: Viết `main.py`

```python
class MySimulation:
    def __init__(self, param1, param2):
        self.param1 = param1
        self.param2 = param2
    
    def calculate(self):
        # Tính toán logic
        pass
    
    def to_dict(self):
        # Trả về dữ liệu dạng dict
        return {
            "param1": self.param1,
            "result": self.calculate()
        }

def generate_animation_frames(num_frames=50):
    frames = []
    for i in range(num_frames):
        sim = MySimulation(param1=i, param2=100)
        frames.append(sim.to_dict())
    return frames
```

### Bước 4: Viết `build.py`

```python
import json
import os
from main import generate_animation_frames

def build():
    print("🔨 Building my simulation...")
    
    # Tạo dữ liệu
    simulation_data = {
        "title": "My Simulation",
        "type": "my-simulation",
        "frames": generate_animation_frames(num_frames=50)
    }
    
    # Lưu file
    os.makedirs("output", exist_ok=True)
    with open("output/data.json", "w", encoding="utf-8") as f:
        json.dump(simulation_data, f, ensure_ascii=False, indent=2)
    
    print("✅ Build completed!")

if __name__ == "__main__":
    build()
```

### Bước 5: Build và test

```bash
cd python-simulations
python build-all.py
```

## 🔧 Build Script Features

### `build-all.py`

Master script tự động:
- ✅ Tìm tất cả simulations
- ✅ Chạy `build.py` trong mỗi thư mục
- ✅ Copy `output/data.json` sang Next.js `public/labs/`
- ✅ Tạo file `index.json` chứa danh sách simulations
- ✅ Hiển thị tiến trình và log đẹp

### Options

```bash
# Build tất cả
python build-all.py

# Build một simulation cụ thể
cd refraction && python build.py

# Test simulation (không copy)
cd projectile
python main.py
```

## 📊 Data Format

### `data.json` structure

```json
{
  "title": "Simulation Title",
  "description": "Description",
  "type": "simulation-type",
  "version": "1.0.0",
  "scenarios": [
    {
      "id": "scenario-1",
      "name": "Scenario Name",
      "frames": [
        {
          "param1": 10,
          "param2": 20,
          "result": 200
        }
      ]
    }
  ]
}
```

## 🎨 Next.js Integration

Sau khi build, tạo page trong Next.js:

```tsx
// app/(dashboard)/(routes)/dashboard/labtwin/labs/[simId]/page.tsx

export default async function SimulationPage({ params }) {
  const { simId } = await params;
  
  // Load data.json
  const data = await fetch(`/labs/${simId}/data.json`);
  const simulation = await data.json();
  
  return <SimulationViewer data={simulation} />;
}
```

## 📦 Dependencies

Python simulations sử dụng:
- `numpy` - Tính toán số học
- `math` - Hàm toán học cơ bản
- `json` - Export dữ liệu

Install:
```bash
pip install numpy
```

## 🧪 Testing

Test từng simulation:

```bash
cd python-simulations/refraction
python main.py
```

## 📚 Examples

### Refraction (Khúc xạ)
- Định luật Snell
- Phản xạ toàn phần
- Nhiều môi trường

### Projectile (Ném xiên)
- Quỹ đạo parabol
- Thay đổi góc ném
- So sánh các hành tinh

## 🛠️ Troubleshooting

**Q: Build failed?**
- Kiểm tra có file `build.py` và `manifest.json`
- Đảm bảo Python >= 3.7
- Check syntax errors trong code

**Q: Data không hiển thị trong Next.js?**
- Kiểm tra file đã được copy vào `/public/labs/`
- Restart Next.js dev server
- Check console logs

**Q: Làm sao thêm animation mượt hơn?**
- Tăng `num_frames` trong `generate_animation_frames()`
- Giảm `dt` (time step) nếu có

## 📖 Resources

- [NumPy Documentation](https://numpy.org/doc/)
- [Physics Formulas](https://en.wikipedia.org/wiki/List_of_physics_formulae)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Contributing

Để thêm simulation mới:
1. Tạo folder mới trong `python-simulations/`
2. Follow structure trên
3. Run `build-all.py` để test
4. Tạo Next.js page để hiển thị

---

Made with ❤️ for LabTwin Physics Education


