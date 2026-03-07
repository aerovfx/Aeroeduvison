# 🚀 New Labs Quick Reference Card

## 📍 URLs

### Thí nghiệm mới (2 labs)

```bash
# Lab 1: Sự truyền thẳng của ánh sáng
http://localhost:3000/dashboard/labtwin/labs/light-propagation

# Lab 2: Bóng tối và bóng nửa tối
http://localhost:3000/dashboard/labtwin/labs/light-shadows
```

### Thí nghiệm gốc (đã cải thiện)

```bash
# Lab chuẩn (improved UX/UI)
http://localhost:3000/dashboard/labtwin/labs/refraction
```

---

## 📁 File Locations

```
app/(dashboard)/(routes)/dashboard/labtwin/labs/
├── light-propagation/
│   └── page.tsx          ← Lab 1: Light Propagation
│
├── light-shadows/
│   └── page.tsx          ← Lab 2: Shadows (Umbra/Penumbra)
│
└── refraction/
    └── page.tsx          ← Reference Implementation
```

---

## 🎨 Color Themes

| Lab | Primary | Secondary | Canvas BG |
|-----|---------|-----------|-----------|
| **Refraction** | Purple-Blue | Indigo-Purple | White |
| **Light Propagation** | Yellow-Amber | Orange | Dark Gray |
| **Light Shadows** | Gray-Slate | Amber | Very Dark |

---

## 🎯 Key Features Comparison

| Feature | Refraction | Propagation | Shadows |
|---------|------------|-------------|---------|
| **Enhanced Sliders** | ✅ Angle | ✅ Angle + Size | ✅ Size |
| **Data Table** | ✅ i→r | ❌ | ✅ Light count |
| **Canvas Effects** | Glow + Arcs | Glow + Rays | Glow + Shadows |
| **Multiple Objects** | ❌ | ✅ Holes | ✅ Obstacles |
| **Material Select** | ✅ 2 materials | ❌ | ❌ |
| **Light Sources** | 1 | 1 | 1 or 2 |

---

## 🔬 Physics Concepts

### Lab 1: Light Propagation (Truyền thẳng)
- ✅ Đường truyền thẳng của ánh sáng
- ✅ Tia sáng bị chặn vs đi qua
- ✅ Điểm sáng trên màn

### Lab 2: Shadows (Bóng tối)
- ✅ Bóng tối (Umbra) - tối hoàn toàn
- ✅ Bóng nửa tối (Penumbra) - tối một phần
- ✅ Ảnh hưởng của số nguồn sáng

### Lab Reference: Refraction (Khúc xạ)
- ✅ Định luật Snell
- ✅ Phản xạ toàn phần
- ✅ Chiết suất vật liệu

---

## 🎮 Controls Summary

### Light Propagation
```
Góc nghiêng:  -30° to 30°     (Yellow-Amber slider)
Kích thước:   5px to 30px     (Orange-Amber slider)
Số lỗ:        1 to 4          (Select)
```

### Light Shadows
```
Loại nguồn:   1 or 2 sources  (Select)
Kích thước:   20px to 80px    (Gray-Slate slider)
Số vật cản:   1 to 2          (Select)
```

### Refraction (Reference)
```
Góc tới:      0° to 80°       (Purple-Blue slider)
Môi trường 1: air/water/etc   (Select)
Môi trường 2: air/water/etc   (Select)
```

---

## 📊 XP & Difficulty

| Lab | Level | Duration | XP | Difficulty |
|-----|-------|----------|----|-----------:|
| Light Propagation | Lớp 7 | 30 phút | +60 | ⭐⭐ Easy |
| Light Shadows | Lớp 7 | 35 phút | +70 | ⭐⭐⭐ Medium |
| Refraction | Lớp 11 | 45 phút | +80 | ⭐⭐⭐⭐ Hard |

---

## 🎨 Canvas Elements

### Propagation Canvas
- Light source (bulb with glow)
- 15 rays (bright yellow / dim red)
- Barrier with holes
- Screen with light spots
- Labels

### Shadows Canvas
- 1-2 light sources (bulbs with glows)
- Light rays (faint yellow lines)
- Obstacles (dark gray)
- Screen (white)
- Umbra regions (very dark)
- Penumbra regions (medium gray)
- Multiple labels

### Refraction Canvas
- Material gradients (top/bottom)
- Interface line (dashed)
- Normal line (dashed)
- Incident ray (red with glow)
- Refracted ray (blue with glow)
- Reflected ray (green/purple with glow)
- Angle arcs
- Material labels

---

## 💡 Quick Tips

### For Students
1. **Propagation:** Thử thay đổi số lỗ và quan sát pattern
2. **Shadows:** So sánh 1 vs 2 nguồn để hiểu penumbra
3. **Refraction:** Tìm góc tới hạn trong bảng dữ liệu

### For Teachers
1. Demo theo thứ tự: Propagation → Shadows → Refraction
2. Sử dụng data tables để giải thích
3. Point out color coding trong legends

### For Developers
1. Follow `LAB_SIMULATION_DESIGN_GUIDE.md` cho consistency
2. Copy patterns từ 3 labs này
3. Maintain color scheme standards

---

## 🔗 Navigation Path

```
Dashboard → LabTwin → Labs → [Select Lab]
                      ↓
        ┌─────────────┴─────────────┐
        ↓                           ↓
  Light Propagation           Light Shadows
        ↓                           ↓
  [Experiment]                [Experiment]
        ↓                           ↓
   +60 XP                       +70 XP
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile (< 768px) */
- Single column
- Canvas scales down
- Sidebar moves below

/* Tablet (768px - 1024px) */
- 2 columns
- Reduced padding
- Smaller fonts

/* Desktop (> 1024px) */
- 3 columns (2+1 grid)
- Full features
- Optimal experience
```

---

## 🎯 Testing Checklist

### Before Publishing
- [ ] All sliders work smoothly
- [ ] Canvas renders correctly
- [ ] No console errors
- [ ] Data updates in real-time
- [ ] Tables highlight properly
- [ ] Buttons responsive
- [ ] Mobile layout works
- [ ] No linter errors

---

## 📚 Documentation Files

```
LIGHT_EXPERIMENTS_IMPLEMENTATION.md   ← Full documentation (this lab set)
LAB_SIMULATION_DESIGN_GUIDE.md       ← Design patterns & guide
REFRACTION_UX_IMPROVEMENTS.md        ← UX improvements reference
REFRACTION_ISSUES_RESOLVED.md        ← Technical solutions
NEW_LABS_QUICK_REFERENCE.md          ← You are here!
```

---

## 🚀 Commands

### Development
```bash
# Start dev server
npm run dev

# Open labs
open http://localhost:3000/dashboard/labtwin/labs/light-propagation
open http://localhost:3000/dashboard/labtwin/labs/light-shadows
open http://localhost:3000/dashboard/labtwin/labs/refraction
```

### Build & Deploy
```bash
# Build
npm run build

# Start production
npm start
```

---

## 🎨 Gradient Classes (Copy-Paste Ready)

```tsx
// Headers
className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"    // Data
className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"  // Table
className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"    // Material
className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200"        // Theory
className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200"      // Info

// Sliders
className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200"   // Angle
className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200"  // Light angle
className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"  // Size
className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"      // Obstacle

// Buttons
className="bg-gradient-to-r from-purple-600 to-blue-600"   // Primary (Refraction)
className="bg-gradient-to-r from-yellow-600 to-amber-600"  // Primary (Propagation)
className="bg-gradient-to-r from-gray-600 to-slate-600"    // Primary (Shadows)
```

---

## 🎯 Common Issues & Solutions

### Canvas not rendering?
```typescript
// Check:
1. isMounted === true
2. canvasRef.current !== null
3. Dependencies in useEffect correct
4. No hydration errors
```

### Slider not updating?
```typescript
// Ensure:
1. value={[stateVariable]}  // Array!
2. onValueChange receives array
3. State updates properly
```

### Colors not showing?
```typescript
// Verify:
1. Tailwind classes spelled correctly
2. gradien vs gradient
3. Color exists in config
```

---

## 📞 Support

**Issues?** Check documentation files above  
**New features?** Follow `LAB_SIMULATION_DESIGN_GUIDE.md`  
**Questions?** Reference this card first!

---

**Last Updated:** October 22, 2025  
**Version:** 1.0  
**Status:** ✅ Ready to Use

---

# 🎉 Happy Experimenting!

