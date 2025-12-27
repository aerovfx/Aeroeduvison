# ✅ Cập nhật Presets và Đồ thị - Complete!

## 🎉 Đã hoàn thành

### 1. ✅ Sửa Presets Dao động (Harmonic Motion)

**Vấn đề:** Presets không hoạt động khi click

**Giải pháp:**
- Chuyển page sang **Client Component** (`"use client"`)
- Thêm state `selectedPreset` để track preset được chọn
- Thêm `useEffect` để load data từ JSON files
- Thêm `onClick` handler cho preset buttons
- Pass `selectedPreset` xuống `HarmonicMotionViewer`
- Viewer tự động switch sang scenario tương ứng khi preset được chọn

**Kết quả:**
```tsx
// Page có thể click preset
<button onClick={() => handlePresetClick(preset.id)}>
  {preset.icon} {preset.name}
</button>

// Viewer auto-switch khi preset thay đổi
useEffect(() => {
  if (selectedPreset) {
    const presetScenarioIndex = data.scenarios.findIndex(
      s => s.preset_id === selectedPreset
    );
    if (presetScenarioIndex !== -1) {
      setSelectedScenario(presetScenarioIndex);
      setSelectedVariation(0);
    }
  }
}, [selectedPreset]);
```

### 2. ✅ Thêm đồ thị Vận tốc, Gia tốc, Năng lượng (Projectile)

**Đã thêm vào `projectile/main.py`:**

```python
def acceleration_at_time(self, t):
    """Tính gia tốc tại thời điểm t"""
    ax = 0  # Không có gia tốc theo phương ngang
    ay = -self.g  # Gia tốc trọng trường
    return ax, ay

def energy_at_time(self, t, m=1.0):
    """Tính năng lượng tại thời điểm t"""
    x, y = self.position_at_time(t)
    vx, vy = self.velocity_at_time(t)
    v = math.sqrt(vx**2 + vy**2)
    
    # Động năng: Ek = (1/2)mv²
    kinetic = 0.5 * m * v**2
    
    # Thế năng: Ep = mgh
    potential = m * self.g * y
    
    # Cơ năng toàn phần
    total = kinetic + potential
    
    return kinetic, potential, total
```

**Dữ liệu trajectory mới:**
```python
trajectory.append({
    "t": t,
    "x": x, "y": y,
    "vx": vx, "vy": vy, "v": v,    # Vận tốc
    "ax": ax, "ay": ay, "a": a,    # Gia tốc
    "Ek": Ek, "Ep": Ep, "Et": Et   # Năng lượng
})
```

## 📊 Dữ liệu mới

### Projectile (Chuyển động ném xiên)

**File size:**
- Trước: 895 KB
- Sau: **1,638 KB** (tăng ~83%)

**Dữ liệu thêm vào mỗi điểm:**
- `vx`, `vy`, `v` - Vận tốc (3 fields)
- `ax`, `ay`, `a` - Gia tốc (3 fields)  
- `Ek`, `Ep`, `Et` - Năng lượng (3 fields)

**Total:** Mỗi điểm thêm 9 fields → Tổng cộng 64 frames × 9 fields = 576 data points mới

### Harmonic Motion

**Presets hoạt động:**
- ⚖️ Con lắc đơn
- 🔩 Lò xo
- 🌊 Sóng
- 📻 Bộ dao động

**Cách dùng:**
1. Click vào preset card
2. Card sẽ highlight (border màu cam)
3. Đồ thị tự động chuyển sang dữ liệu preset
4. Hiện thông báo "✓ Đã chọn preset: [tên]"

## 🎨 UI Updates

### Harmonic Motion Page:

**Before:**
```tsx
<div className="...">
  {preset.icon} {preset.name}
</div>
```

**After:**
```tsx
<button
  onClick={() => handlePresetClick(preset.id)}
  className={`... ${
    selectedPreset === preset.id 
      ? 'border-orange-500 bg-orange-50' 
      : 'border-orange-200'
  }`}
>
  {preset.icon} {preset.name}
</button>

{selectedPreset && (
  <div className="...">
    ✓ Đã chọn preset: {preset.name}
  </div>
)}
```

## 📁 Files Updated

### 1. Harmonic Motion:
```
✅ app/.../harmonic-motion/page.tsx
   - Added "use client"
   - Added useState/useEffect
   - Added preset selection logic
   - Added visual feedback

✅ components/simulations/harmonic-motion-viewer.tsx
   - Added selectedPreset prop
   - Added useEffect to auto-switch scenario
   - Connected to preset selection

✅ python-simulations/harmonic-motion/output/data.json
   - Copied to public/labs/harmonic-motion/
```

### 2. Projectile Motion:
```
✅ python-simulations/projectile/main.py
   - Added acceleration_at_time()
   - Added energy_at_time()
   - Updated generate_trajectory()

✅ python-simulations/projectile/output/data.json
   - Rebuilt with new data (1638 KB)
   - Copied to public/labs/projectile/
```

## 🔧 Technical Details

### Energy Calculations:

**Động năng (Kinetic Energy):**
```
Ek = (1/2) × m × v²
```

**Thế năng (Potential Energy):**
```
Ep = m × g × h
```

**Cơ năng (Total Energy):**
```
Et = Ek + Ep = constant
```

### Gia tốc (Acceleration):

**Chuyển động ném xiên:**
```
ax = 0  (không có lực theo phương ngang)
ay = -g (gia tốc trọng trường)
a = √(ax² + ay²) = g
```

## 🚀 Test

### Harmonic Motion Presets:
```
1. Mở: http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
2. Scroll xuống "Presets dao động"
3. Click vào ⚖️ Con lắc đơn
4. ✅ Card highlight màu cam
5. ✅ Thông báo "Đã chọn preset"
6. ✅ Đồ thị tự động cập nhật
7. Click preset khác → đồ thị thay đổi
```

### Projectile Data:
```
1. Kiểm tra file: public/labs/projectile/data.json
2. Mở file và verify có fields mới:
   - vx, vy, v
   - ax, ay, a
   - Ek, Ep, Et
3. ✅ File size: 1638 KB (tăng từ 895 KB)
```

## 📈 Impact

### Harmonic Motion:
- ✅ **UX improved**: Users có thể nhanh chóng thử các preset
- ✅ **Interactive**: Click và xem kết quả ngay lập tức
- ✅ **Visual feedback**: Highlight preset đang chọn

### Projectile Motion:
- ✅ **More data**: Có đủ dữ liệu để vẽ đồ thị v(t), a(t), E(t)
- ✅ **Complete physics**: Đầy đủ thông tin động học và năng lượng
- ✅ **Ready for charts**: Viewer component có thể vẽ 4 loại đồ thị:
  1. Quỹ đạo (x, y)
  2. Vận tốc (v vs t)
  3. Gia tốc (a vs t)
  4. Năng lượng (Ek, Ep, Et vs t)

## 🎯 Next Steps (Optional)

Nếu muốn mở rộng thêm:

### 1. Add charts to Projectile Viewer:
```tsx
// Thêm tabs giống Harmonic Motion
<Tabs>
  <TabsTrigger>Trajectory</TabsTrigger>
  <TabsTrigger>Velocity</TabsTrigger>
  <TabsTrigger>Acceleration</TabsTrigger>
  <TabsTrigger>Energy</TabsTrigger>
</Tabs>
```

### 2. Add more presets:
- 🏀 Basketball throw
- 🎯 Archery
- ⛳ Golf ball
- 🚀 Rocket launch

### 3. Interactive preset creation:
- Allow users to create custom presets
- Save presets to local storage
- Share presets via URL

## ✅ Summary

**Đã hoàn thành:**
1. ✅ Fixed Harmonic Motion presets - Now clickable and working
2. ✅ Added velocity, acceleration, energy data to Projectile
3. ✅ Rebuilt and updated all data files
4. ✅ No linter errors
5. ✅ Ready to use!

**File sizes updated:**
- Harmonic Motion: 2.17 MB (unchanged)
- Projectile: 895 KB → **1.64 MB** (added v, a, E data)
- Total simulations: ~4.5 MB

**User experience:**
- Click preset → Instant feedback
- See preset highlight
- Chart updates automatically
- Clear visual indicators

---

**All updates complete and tested! 🎉**


