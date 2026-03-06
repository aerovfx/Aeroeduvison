# ✅ Custom Parameters Input - Complete!

## 🎉 Đã hoàn thành!

Thêm **chế độ tùy chỉnh tham số** vào Harmonic Motion simulation!

## ✨ Tính năng mới

### 🎛️ Hai chế độ:

#### 1. **Chế độ Preset** (mặc định)
- Chọn từ scenarios có sẵn
- Chọn từ presets (Con lắc, Lò xo, Sóng, Bộ dao động)
- Slider để thay đổi variations

#### 2. **Chế độ Tùy chỉnh** ⭐ MỚI
- Nhập các tham số thủ công:
  - **A** - Biên độ (cm)
  - **f** - Tần số (Hz)
  - **ω** - Tần số góc (rad/s)
  - **φ** - Pha ban đầu (rad)
- Tính toán real-time
- Vẽ đồ thị ngay lập tức

## 🎯 Cách sử dụng

### Bước 1: Mở Harmonic Motion
```
http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
```

### Bước 2: Chuyển sang chế độ Tùy chỉnh
- Click nút **"Tùy chỉnh"** trong card "Điều khiển"
- Sẽ hiện form nhập liệu màu cam

### Bước 3: Nhập tham số
```
Biên độ A: 5.0 (cm)
Tần số f: 2.0 (Hz)
Tần số góc ω: 12.566 (rad/s) - auto calculate từ f
Pha ban đầu φ: 1.571 (rad) - tức π/2
```

### Bước 4: Tính toán
- Click button **"Tính toán & Vẽ đồ thị"**
- ✅ Đồ thị tự động vẽ với tham số mới
- ✅ Badge "Tùy chỉnh" hiện ở góc phải card "Thông số dao động"

### Bước 5: Xem kết quả
- Xem 3 đồ thị: x(t), v(t), E(t)
- Chạy animation
- Quan sát thông số

## 🔧 Tính năng đặc biệt

### 1. Auto-sync f ↔ ω
```
Nhập f = 2 Hz → ω tự động = 12.566 rad/s
Nhập ω = 10 → f tự động = 1.592 Hz
```

### 2. Gợi ý giá trị
```
💡 φ = π/2 ≈ 1.571
💡 φ = π ≈ 3.142
📐 Quan hệ: ω = 2πf
```

### 3. Validation
- Giá trị mặc định nếu để trống
- Step 0.1 cho độ chính xác cao
- Placeholder hints

### 4. Visual Feedback
- Badge "Tùy chỉnh" khi dùng custom mode
- Button highlight khi ở mode đang dùng
- Orange theme cho custom inputs

## 📐 Công thức tính toán

```javascript
// Từ tham số input
const A = parseFloat(customA) || 2.0;
const f = parseFloat(customF) || 1.0;
const omega = customOmega ? parseFloat(customOmega) : 2 * Math.PI * f;
const phi = parseFloat(customPhi) || 0;

// Tính các đại lượng
const T = 1 / f;                          // Chu kỳ
const v_max = A * omega;                  // Vận tốc max
const a_max = A * omega * omega;          // Gia tốc max
const E_total = 0.5 * omega * omega * A * A;  // Cơ năng

// Tính trajectory
for (let i = 0; i < num_points; i++) {
  const t = (i / (num_points - 1)) * t_max;
  const x = A * Math.cos(omega * t + phi);
  const v = -A * omega * Math.sin(omega * t + phi);
  const a = -A * omega * omega * Math.cos(omega * t + phi);
  const Ek = 0.5 * v * v;
  const Ep = 0.5 * omega * omega * x * x;
  // ...
}
```

## 🎨 UI Components

### Mode Toggle Buttons:
```tsx
<Button variant={!useCustom ? "default" : "outline"}>
  Chế độ Preset
</Button>
<Button variant={useCustom ? "default" : "outline"}>
  <Calculator /> Tùy chỉnh
</Button>
```

### Custom Input Form:
```tsx
<div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
  <Input
    label="Biên độ A (cm)"
    type="number"
    value={customA}
    onChange={setCustomA}
    step="0.1"
  />
  {/* ... more inputs */}
  
  <Button onClick={calculateCustomTrajectory}>
    Tính toán & Vẽ đồ thị
  </Button>
</div>
```

## 📊 Examples

### Ví dụ 1: Con lắc nhanh
```
A = 3 cm
f = 5 Hz
φ = 0 rad
```
→ Chu kỳ T = 0.2s, dao động nhanh

### Ví dụ 2: Dao động pha π/2
```
A = 5 cm
f = 1 Hz
φ = 1.571 rad (π/2)
```
→ Đồ thị dịch pha, bắt đầu từ x = 0

### Ví dụ 3: Biên độ lớn, tần số thấp
```
A = 10 cm
f = 0.5 Hz
φ = 0
```
→ Dao động chậm, biên độ rộng

### Ví dụ 4: Dùng ω trực tiếp
```
A = 2 cm
ω = 20 rad/s
φ = 3.142 rad (π)
```
→ f auto = 3.183 Hz

## 🔍 Technical Details

### State Management:
```tsx
const [customA, setCustomA] = useState("2.0");
const [customF, setCustomF] = useState("1.0");
const [customOmega, setCustomOmega] = useState("");
const [customPhi, setCustomPhi] = useState("0");
const [useCustom, setUseCustom] = useState(false);
const [customData, setCustomData] = useState(null);
```

### Conditional Rendering:
```tsx
const currentData = useCustom && customData 
  ? customData 
  : scenario.scenarios[selectedVariation].data;
```

### Auto-sync f ↔ ω:
```tsx
// When f changes
onChange={(e) => {
  setCustomF(e.target.value);
  const omega = 2 * Math.PI * parseFloat(e.target.value);
  setCustomOmega(omega.toFixed(3));
}}

// When ω changes
onChange={(e) => {
  setCustomOmega(e.target.value);
  const f = parseFloat(e.target.value) / (2 * Math.PI);
  setCustomF(f.toFixed(3));
}}
```

## ✅ Files Updated

```
✅ components/simulations/harmonic-motion-viewer.tsx
   - Added custom parameters state
   - Added calculateCustomTrajectory()
   - Added mode toggle buttons
   - Added custom input form
   - Added auto-sync f ↔ ω
   - Added validation
   - Added visual feedback
```

## 🎯 Use Cases

### 1. Giảng dạy:
- Teacher nhập các tham số đặc biệt
- Demo các trường hợp đặc biệt
- So sánh các giá trị khác nhau

### 2. Học sinh thử nghiệm:
- Tự do thay đổi tham số
- Quan sát ảnh hưởng
- Học qua thực hành

### 3. Bài tập:
- Cho bài toán với A, f, φ cụ thể
- Học sinh nhập và vẽ
- Kiểm tra kết quả

## 📈 Workflow

```
1. Click "Tùy chỉnh"
   ↓
2. Nhập A, f (hoặc ω), φ
   ↓
3. Click "Tính toán & Vẽ đồ thị"
   ↓
4. Xem đồ thị mới
   ↓
5. Chạy animation
   ↓
6. Thay đổi tham số khác → Lặp lại
```

## 🎨 Design Features

### Input Form:
- Orange theme (bg-orange-50, border-orange-200)
- Grid layout 2 columns
- Labels with units
- Placeholder hints
- Step 0.1 for precision

### Mode Buttons:
- Toggle between Preset/Custom
- Highlight active mode
- Smooth transitions

### Visual Indicators:
- "Tùy chỉnh" badge when in custom mode
- Orange accents
- Clear labels

## ⚠️ Important Notes

### Restart Server:
Để fix lỗi "params", cần restart dev server:
```bash
# Stop server
Ctrl+C

# Clear cache
rm -rf .next

# Restart
npm run dev
```

### Hard Refresh:
```
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

## ✅ Testing

### Test Custom Input:
1. Navigate to harmonic-motion page
2. Click "Tùy chỉnh" button
3. Input form should appear
4. Enter values:
   - A = 3
   - f = 2
   - φ = 1.571
5. Click "Tính toán & Vẽ đồ thị"
6. ✅ Graph updates
7. ✅ Badge "Tùy chỉnh" appears
8. ✅ Animation works

### Test Auto-sync:
1. Enter f = 2
2. ✅ ω should auto-update to 12.566
3. Change ω to 10
4. ✅ f should auto-update to 1.592

### Test Mode Switch:
1. In Custom mode with custom data
2. Click "Chế độ Preset"
3. ✅ Should switch back to preset scenarios
4. Click "Tùy chỉnh" again
5. ✅ Previous custom values preserved

## 📚 Similar Feature for Other Simulations

Có thể áp dụng pattern tương tự cho:

### Projectile:
```
Inputs:
- v0 (Vận tốc ban đầu)
- angle (Góc ném)
- g (Gia tốc trọng trường)
```

### Refraction:
```
Inputs:
- n1 (Chiết suất môi trường 1)
- n2 (Chiết suất môi trường 2)
- angle_in (Góc tới)
```

### Motion Tracking:
```
Inputs:
- focal_length (Tiêu cự)
- real_width (Chiều rộng thực)
- fps (Frames per second)
```

## 🎯 Summary

**Custom parameters feature complete!**

✅ **Mode Toggle**: Preset ↔ Custom  
✅ **4 Input Fields**: A, f, ω, φ  
✅ **Auto-sync**: f ↔ ω  
✅ **Real-time Calc**: Instant graph update  
✅ **Visual Feedback**: Badge & highlights  
✅ **Validation**: Default values  
✅ **User-friendly**: Hints & tooltips  

---

**Restart server và test ngay! 🚀**

```bash
npm run dev
# Then: http://localhost:3000/dashboard/labtwin/labs/harmonic-motion
```


