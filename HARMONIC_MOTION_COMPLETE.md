# ✅ Dao động điều hòa - Simulation Complete!

## 🎉 Hoàn thành!

Đã thêm thành công **Dao động điều hòa** (Harmonic Motion) vào Python Simulations!

## 📊 Thông tin

### Simulation mới:
- **Tên**: Dao động điều hòa
- **ID**: `harmonic-motion`
- **Category**: Cơ học
- **Level**: Lớp 11-12
- **XP**: 85
- **Icon**: 📈 Activity
- **File size**: 2.17 MB
- **Data points**: 10,000

## 🎯 Công thức chính

### Hàm số dao động:
```
x = A × cos(ωt + φ)
```

### Các đại lượng:
- **A**: Biên độ (cm)
- **ω**: Tần số góc (rad/s)
- **φ**: Pha ban đầu (rad)
- **f**: Tần số (Hz)
- **T**: Chu kỳ (s)

### Quan hệ:
```
ω = 2πf
T = 1/f = 2π/ω
v = -Aω×sin(ωt + φ)
a = -Aω²×cos(ωt + φ)
vₘₐₓ = Aω
aₘₐₓ = Aω²
```

## ✨ Tính năng

### 1. Ba loại đồ thị:
- ✅ **x(t)**: Li độ theo thời gian
- ✅ **v(t)**: Vận tốc theo thời gian  
- ✅ **E(t)**: Năng lượng theo thời gian (động, thế, tổng)

### 2. Ba loại thay đổi:
- **Pha ban đầu φ**: 0, π/6, π/4, π/3, π/2, π (6 values)
- **Biên độ A**: 1, 2, 3, 5, 10 cm (5 values)
- **Tần số f**: 0.5, 1, 2, 5, 10 Hz (5 values)

### 3. Bốn presets:
- ⚖️ **Con lắc đơn** (A=5cm, f=0.5Hz)
- 🔩 **Lò xo** (A=10cm, f=2Hz)
- 🌊 **Sóng** (A=3cm, f=5Hz)
- 📻 **Bộ dao động** (A=2cm, f=10Hz)

### 4. Visualization:
- Grid với ô chia đều
- Trục tọa độ có mũi tên
- Đánh dấu biên độ ±A
- Animation với điểm di chuyển
- Đường dọc chỉ thời điểm

## 📁 Files Created

### Python Simulation:
```
python-simulations/harmonic-motion/
├── main.py           # Logic (190 lines)
├── build.py          # Build script (170 lines)
├── manifest.json     # Metadata
└── output/
    └── data.json     # ✅ 2.17 MB, 10,000 points
```

### Next.js Integration:
```
app/(dashboard)/(routes)/dashboard/labtwin/labs/
└── harmonic-motion/
    └── page.tsx      # Lab page

components/simulations/
└── harmonic-motion-viewer.tsx  # Viewer (600+ lines)
```

### Data Generated:
```
public/labs/
├── index.json        # Updated with 4 simulations
└── harmonic-motion/
    ├── data.json     # 2.17 MB
    └── manifest.json
```

## 🎨 UI Components

### Viewer Features:
- ✅ Scenario selection (7 types)
- ✅ Variation slider
- ✅ Animation controls (Play/Pause/Reset)
- ✅ Three tabs (Position, Velocity, Energy)
- ✅ Parameters display
- ✅ Formulas cards
- ✅ Three canvas charts

### Canvas Rendering:

#### 1. Position Chart (x vs t):
- Grid lines
- Center axes
- Amplitude markers (±A)
- Blue curve
- Red animated point
- Vertical time indicator

#### 2. Velocity Chart (v vs t):
- Yellow background
- Green curve
- Axes at center

#### 3. Energy Chart (E vs t):
- Kinetic energy (red)
- Potential energy (blue)
- Total energy (green dashed)
- Legend

## 📐 Mathematics

### Position:
```
x(t) = A × cos(ωt + φ)
```

### Velocity:
```
v(t) = dx/dt = -Aω × sin(ωt + φ)
vₘₐₓ = Aω
```

### Acceleration:
```
a(t) = dv/dt = -Aω² × cos(ωt + φ)
aₘₐₓ = Aω²
```

### Energy:
```
Eₖ = (1/2)mv²
Eₚ = (1/2)kx² = (1/2)mω²x²
E = Eₖ + Eₚ = (1/2)mω²A² = const
```

## 📊 Scenarios Generated

### 7 scenario types:

1. **Phase Variation** (φ): 6 values
   - 0, π/6, π/4, π/3, π/2, π rad

2. **Amplitude Variation** (A): 5 values
   - 1, 2, 3, 5, 10 cm

3. **Frequency Variation** (f): 5 values
   - 0.5, 1, 2, 5, 10 Hz

4-7. **Presets**: 4 presets
   - Con lắc, Lò xo, Sóng, Bộ dao động

**Total**: 6+5+5+4 = 20 sub-scenarios
**Data points**: 500 points/scenario × 20 = 10,000 points

## 🚀 URLs

### Labs Index:
```
http://localhost:3000/dashboard/labtwin/labs
```

### Harmonic Motion:
```
http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
```

### Main LabTwin:
```
http://localhost:3000/dashboard/labtwin
```

## 📊 Build Stats

```
🔨 Building harmonic motion simulation...
  📊 Generating phase variations...
  📊 Generating amplitude variations...
  📊 Generating frequency variations...
  📊 Generating preset scenarios...
  📊 Generated 7 scenario types
     Total data points: 10000
✅ Build completed!
   File size: 2171.21 KB
   Scenarios: 7
   Presets: 4
```

## 🎓 Learning Objectives

Students will learn:
1. ✅ Dao động điều hòa definition
2. ✅ Hàm cosin và sin
3. ✅ Ảnh hưởng của biên độ A
4. ✅ Ảnh hưởng của tần số f
5. ✅ Ảnh hưởng của pha ban đầu φ
6. ✅ Chu kỳ và tần số
7. ✅ Năng lượng dao động
8. ✅ Ứng dụng thực tế

## 📚 Tham khảo Code Gốc

Simulation này lấy cảm hứng từ code Gradio:
- ✅ Hàm x = A×cos(ωt + φ)
- ✅ Grid với ô chia đều
- ✅ Trục tọa độ có mũi tên
- ✅ Đánh dấu biên độ ±A
- ✅ Animation GIF/MP4
- ✅ Watermark (không có trong web version)

Nhưng được mở rộng:
- ✅ Thêm đồ thị v(t) và E(t)
- ✅ Multiple scenarios
- ✅ Presets thực tế
- ✅ Interactive controls
- ✅ Real-time rendering

## 🎨 Design Details

### Colors:
- **Orange theme** cho harmonic motion
- Position chart: Blue curve
- Velocity chart: Green curve on yellow bg
- Energy chart: Red (Ek), Blue (Ep), Green (E)

### Chart Style (giống code gốc):
- Grid với major/minor lines
- Trục tọa độ có mũi tên góc phải/trên
- Đơn vị trên trục: t(s), x(cm)
- Font size nhỏ cho trục (6pt, 5pt)
- Biên độ ±A đánh dấu rõ

## 📈 Comparison với Code Gốc

| Feature | Code Gốc (Gradio) | Simulation (Next.js) |
|---------|-------------------|---------------------|
| Hàm số | ✅ x = A×cos(ωt+φ) | ✅ Same |
| Grid | ✅ Major/minor | ✅ Major only |
| Axes | ✅ Arrows | ✅ Arrows |
| Amplitude | ✅ ±A markers | ✅ ±A markers |
| Animation | ✅ GIF/MP4 | ✅ Canvas |
| Velocity | ❌ | ✅ Added |
| Energy | ❌ | ✅ Added |
| Presets | ❌ | ✅ 4 presets |
| Export | ✅ GIF/MP4 | ⚠️ View only |
| Watermark | ✅ AerovFX | ❌ |

## ✅ Status

- [x] Python simulation created
- [x] Build script working  
- [x] Data generated (2.17 MB)
- [x] Next.js page created
- [x] Viewer component created
- [x] Three canvas charts implemented
- [x] Animation working
- [x] Integrated with LabTwin
- [x] Icon mapping updated
- [x] Docs created

## 🎉 Summary

**Dao động điều hòa simulation đã hoàn chỉnh!**

Bạn có thể:
- ✅ Xem đồ thị x(t), v(t), E(t)
- ✅ Thay đổi pha, biên độ, tần số
- ✅ Chọn presets (con lắc, lò xo, sóng, bộ dao động)
- ✅ Xem animation
- ✅ Học các công thức

---

## 🚀 Total Python Simulations: 4

1. ⚗️ **Refraction** - Khúc xạ ánh sáng (108 KB)
2. 🎯 **Projectile** - Chuyển động ném xiên (895 KB)
3. 📷 **Motion Tracking** - Theo dõi chuyển động (724 KB)
4. 📈 **Harmonic Motion** - Dao động điều hòa (2.17 MB)

**Total data**: ~3.9 MB, 13,000+ data points!

🎓 Perfect for physics education! 


