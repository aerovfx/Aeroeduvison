# 🖐️⚛️ Hướng Dẫn Điều Khiển Newton Physics bằng Cử Chỉ Tay

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Quy Tắc Cử Chỉ Tay](#quy-tắc-cử-chỉ-tay)
3. [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
4. [Ví Dụ Combos](#ví-dụ-combos)
5. [Tính Toán Vật Lý](#tính-toán-vật-lý)
6. [Tips & Tricks](#tips--tricks)

---

## 🎯 Tổng Quan

Hệ thống **Gesture-Based Newton Physics Control** cho phép bạn điều khiển vật thể 3D bằng cử chỉ tay tự nhiên, không cần chạm màn hình!

### ✨ Tính Năng Chính:

- ✅ **12 cử chỉ** nhận diện chính xác
- ✅ **2 tay độc lập** - Trái (m, F), Phải (direction)
- ✅ **F = ma simulation** realtime
- ✅ **Visual feedback** đầy đủ (arrows, emojis, stats)
- ✅ **Không cần chạm** - 100% gesture control
- ✅ **AR effects** tích hợp
- ✅ **Intuitive rules** - Dễ học, dễ nhớ
- ✅ **Physics accurate** - Gravity, friction, bounce

---

## 🖐️ Quy Tắc Cử Chỉ Tay

### 🖐️ **TAY TRÁI** - Điều Chỉnh Thông Số Vật Lý

Tay trái điều khiển **khối lượng (m)** và **lực (F)** của vật thể.

| Cử Chỉ | Emoji | Hiệu Ứng | Mô Tả |
|--------|-------|-----------|-------|
| **Nắm đấm** | ✊ | `m × 0.5` | Khối lượng **NHỎ** - Vật nhẹ, dễ di chuyển |
| **2 ngón (Peace)** | ✌️ | `m × 1.0` | Khối lượng **TRUNG BÌNH** - Khối lượng gốc |
| **3 ngón** | 🖖 | `m × 2.0` | Khối lượng **LỚN** - Vật nặng, khó di chuyển |
| **Mở tay** | 🖐️ | `m × 3.0` | Khối lượng **RẤT LỚN** - Vật cực nặng |
| **Ngón cái lên** | 👍 | `F × 2.0` | **LỰC MẠNH** - Tăng lực tác dụng |
| **Nhéo (Pinch)** | 🤏 | `F × 0.5` | **LỰC YẾU** - Giảm lực tác dụng |

#### 📝 **Ví Dụ:**

```
Base mass = 2.0 kg

✊ Nắm đấm → m = 2.0 × 0.5 = 1.0 kg (nhẹ)
✌️ 2 ngón → m = 2.0 × 1.0 = 2.0 kg (bình thường)
🖖 3 ngón → m = 2.0 × 2.0 = 4.0 kg (nặng)
🖐️ Mở tay → m = 2.0 × 3.0 = 6.0 kg (rất nặng)
```

---

### ☝️ **TAY PHẢI** - Điều Khiển Hướng và Tạo Lực

Tay phải điều khiển **hướng lực** và **áp dụng lực** lên vật thể.

| Cử Chỉ | Emoji | Hướng Lực | Magnitude | Mô Tả |
|--------|-------|-----------|-----------|-------|
| **Chỉ trỏ** | ☝️ | Theo ngón trỏ | `1.0×` | Lực theo hướng ngón trỏ |
| **2 ngón (Peace)** | ✌️ | Lệch 45° phải | `1.0×` | Lực lệch 45° từ hướng ngón |
| **Nắm đấm** | ✊ | Xuống (↓) | `2.0×` | Lực mạnh xuống dưới |
| **Mở tay** | 🖐️ | Lên (↑) | `2.0×` | Lực mạnh lên trên |
| **Ngón cái lên** | 👍 | Sang phải (→) | `1.5×` | Lực sang phải |
| **Nhéo (Pinch)** | 🤏 | DỪNG | `0×` | Dừng vật thể (v = 0) |

#### 📝 **Ví Dụ:**

```
☝️ Chỉ trỏ về phải:
→ Lực = 30 N × 1.0 = 30 N (sang phải)

✊ Nắm đấm:
→ Lực = 30 N × 2.0 = 60 N (xuống)

🤏 Nhéo:
→ Lực = 0 N, v = 0 (dừng ngay)
```

---

## 🚀 Hướng Dẫn Sử Dụng

### **Quick Start:**

1. **▶️ Bắt đầu**
   - Nhấn nút "Bắt đầu" để khởi động camera
   - Cho phép quyền truy cập camera khi được hỏi

2. **🖐️ Giơ tay trái**
   - Thử các cử chỉ: ✊, ✌️, 🖖, 🖐️, 👍, 🤏
   - Quan sát **khối lượng (m)** thay đổi trên panel
   - Xem emoji và mô tả hiển thị trên canvas

3. **☝️ Giơ tay phải**
   - Thử các cử chỉ: ☝️, ✌️, ✊, 🖐️, 👍, 🤏
   - Quan sát **hướng lực** (mũi tên vàng)
   - Xem vật thể di chuyển theo hướng lực

4. **📊 Xem stats realtime**
   - **💪 Force (F)**: Lực hiện tại
   - **⚖️ Mass (m)**: Khối lượng (thay đổi theo tay trái)
   - **🚀 Acceleration (a)**: Gia tốc (a = F/m)
   - **⚡ Velocity (v)**: Vận tốc

---

## 🎯 Ví Dụ Combos

### 🚀 **Combo 1: Ném Xa**

```
🖐️ Trái: ✊ Nắm đấm (m × 0.5)
☝️ Phải: ☝️ Chỉ về phía xa
```

**Kết quả:**
- Vật nhẹ (m = 1.0 kg)
- Lực mạnh (F = 30 N)
- Gia tốc lớn (a = 30 m/s²)
- **→ Vật bay xa, nhanh!**

---

### 🎯 **Combo 2: Precision Control**

```
🖐️ Trái: 🤏 Nhéo (F × 0.5)
☝️ Phải: ☝️ Chỉ hướng cụ thể
```

**Kết quả:**
- Lực yếu (F = 15 N)
- Di chuyển chậm, chính xác
- **→ Dễ điều khiển, không bị vượt quá**

---

### ⚡ **Combo 3: Speed Boost**

```
🖐️ Trái: 👍 Ngón cái (F × 2.0)
☝️ Phải: ✊ Nắm đấm (Xuống 2×)
```

**Kết quả:**
- Lực cực mạnh (F = 30 × 2.0 × 2.0 = 120 N)
- Gia tốc cực lớn
- **→ Vật rơi xuống cực nhanh!**

---

### 🛑 **Combo 4: Emergency Stop**

```
☝️ Phải: 🤏 Nhéo
```

**Kết quả:**
- Lực = 0 N
- Vận tốc = 0 m/s
- **→ Vật dừng ngay lập tức!**

---

### 🎪 **Combo 5: Hover Effect**

```
🖐️ Trái: ✊ Nắm đấm (m × 0.5 - nhẹ)
☝️ Phải: 🖐️ Mở tay (Lên 2×)
```

**Kết quả:**
- Vật nhẹ (m = 1.0 kg)
- Lực lên mạnh (F = 60 N)
- Gia tốc lên lớn (a = 60 m/s²)
- **→ Vật bay lên cao!**

---

## 🔬 Tính Toán Vật Lý

### **Công Thức:**

```typescript
// 1. Left hand controls
m_effective = base_mass × m_multiplier
F_base = F_base × F_multiplier

// 2. Right hand controls
F_direction = { x, y } from gesture
F_magnitude = magnitude from gesture

// 3. Total force
F_total = F_base × F_multiplier × F_magnitude × direction

// 4. Newton's 2nd Law
a = F_total / m_effective

// 5. Update physics
v = v + a × dt
p = p + v × dt

// 6. Apply friction
v = v × friction_coefficient (0.95)

// 7. Boundary collision
if (p hits boundary) {
  v = v × -restitution (0.7)
}
```

### **Ví Dụ Tính Toán:**

#### **Setup:**
```
base_mass = 2.0 kg
F_base = 30 N
friction = 0.95
```

#### **Scenario: Ném Xa**
```
🖐️ Trái: ✊ Nắm đấm (m × 0.5)
☝️ Phải: ☝️ Chỉ phải (direction = {1, 0}, magnitude = 1.0)

Tính toán:
1. m_effective = 2.0 × 0.5 = 1.0 kg
2. F_multiplier = 1.0 (không có từ tay trái)
3. F_total = 30 × 1.0 × 1.0 × {1, 0} = {30, 0} N
4. a = {30, 0} / 1.0 = {30, 0} m/s²
5. v = v + {30, 0} × 0.016 = v + {0.48, 0} m/s
6. p = p + v × 0.016

Kết quả:
→ Vật nhẹ (1.0 kg), gia tốc lớn (30 m/s²)
→ Di chuyển nhanh sang phải!
```

#### **Scenario: Speed Boost**
```
🖐️ Trái: 👍 Ngón cái (F × 2.0)
☝️ Phải: ✊ Nắm đấm (Xuống 2×)

Tính toán:
1. m_effective = 2.0 × 1.0 = 2.0 kg (không đổi)
2. F_multiplier = 2.0 (từ tay trái)
3. F_total = 30 × 2.0 × 2.0 × {0, 1} = {0, 120} N
4. a = {0, 120} / 2.0 = {0, 60} m/s²
5. v = v + {0, 60} × 0.016 = v + {0, 0.96} m/s

Kết quả:
→ Lực cực mạnh (120 N xuống)
→ Gia tốc lớn (60 m/s²)
→ Vật rơi xuống cực nhanh!
```

---

## 💡 Tips & Tricks

### **🎓 Học Từng Bước:**

1. **Level 1: Basics**
   - Làm quen với tay trái (điều chỉnh m)
   - Làm quen với tay phải (điều chỉnh direction)
   - Thử từng cử chỉ một
   - Quan sát stats thay đổi

2. **Level 2: Combinations**
   - Kết hợp 2 tay cùng lúc
   - Thử các combos khác nhau
   - Quan sát `a = F/m` trong thực tế
   - Hiểu mối quan hệ F, m, a

3. **Level 3: Advanced**
   - Precision control (🤏 + ☝️)
   - Emergency stop (🤏 tay phải)
   - Complex trajectories
   - Master tất cả 12 cử chỉ

### **🎯 Best Practices:**

1. **Giữ tay ổn định**
   - Tránh run tay
   - Giữ khoảng cách phù hợp với camera
   - Đảm bảo đủ ánh sáng

2. **Quan sát visual feedback**
   - Xem emoji trên canvas
   - Theo dõi mũi tên lực (vàng)
   - Kiểm tra stats panel

3. **Thử nghiệm**
   - Thử các combos khác nhau
   - Quan sát vật thể phản ứng
   - Hiểu physics relationships

### **⚠️ Common Mistakes:**

1. **Tay quá gần camera**
   - → Không nhận diện được cử chỉ
   - **Fix**: Giữ khoảng cách 30-50cm

2. **Cử chỉ không rõ ràng**
   - → Nhận diện sai
   - **Fix**: Làm cử chỉ rõ ràng, chậm rãi

3. **Quên quan sát stats**
   - → Không hiểu physics
   - **Fix**: Luôn xem stats panel

---

## 🎨 Visual Features

### **On Canvas:**

- 🟢 **Green skeleton**: Tay trái (điều chỉnh m, F)
- 🔵 **Blue skeleton**: Tay phải (điều khiển lực)
- 🟡 **Yellow arrow**: Hướng lực (từ tay phải)
- 🟢 **Green arrow**: Velocity vector (hướng di chuyển)
- 🟣 **Purple sphere**: Physics object
- 📍 **Emoji indicators**: Cử chỉ hiện tại

### **On Panel:**

- 📊 **Stats realtime**:
  - 💪 **Force (F)**: Lực hiện tại (N)
  - ⚖️ **Mass (m)**: Khối lượng (kg) - thay đổi theo tay trái
  - 🚀 **Acceleration (a)**: Gia tốc (m/s²)
  - ⚡ **Velocity (v)**: Vận tốc (m/s)

- 🎴 **Gesture cards**:
  - **Left hand**: Current gesture & effect
  - **Right hand**: Current gesture & direction

---

## 🎓 Use Cases

### **🎓 Giáo Dục:**

- Dạy **Newton's 2nd Law** trực quan
- Interactive physics demo
- Gesture-based learning
- F, m, a relationships

### **🎮 Gaming:**

- Natural hand controls
- No touch required
- Immersive physics
- AR integration

### **🔬 Research:**

- Gesture recognition study
- Physics simulation
- Human-computer interaction
- Educational ML

---

## 📚 Tài Liệu Tham Khảo

### **Physics:**

- **Newton's 2nd Law**: `F = ma`
- **Force**: `F = m × a`
- **Acceleration**: `a = F/m`
- **Velocity**: `v = v₀ + a × t`
- **Position**: `p = p₀ + v × t`

### **Gestures:**

- **MediaPipe Hand Landmarks**: 21 points per hand
- **Gesture Recognition**: Based on finger extension
- **Confidence**: 0-1 scale

---

## 🐛 Troubleshooting

### **Vấn Đề: Camera không hoạt động**

**Nguyên nhân:**
- Chưa cho phép quyền camera
- Camera đang được sử dụng bởi app khác

**Giải pháp:**
1. Kiểm tra quyền camera trong browser settings
2. Đóng các app khác đang dùng camera
3. Refresh trang và thử lại

### **Vấn Đề: Không nhận diện được cử chỉ**

**Nguyên nhân:**
- Tay quá gần/xa camera
- Ánh sáng không đủ
- Cử chỉ không rõ ràng

**Giải pháp:**
1. Giữ khoảng cách 30-50cm với camera
2. Đảm bảo đủ ánh sáng
3. Làm cử chỉ rõ ràng, chậm rãi

### **Vấn Đề: Vật thể không di chuyển**

**Nguyên nhân:**
- Tay phải đang dùng cử chỉ 🤏 (DỪNG)
- Lực quá yếu
- Khối lượng quá lớn

**Giải pháp:**
1. Kiểm tra cử chỉ tay phải (không dùng 🤏)
2. Tăng lực bằng 👍 (tay trái)
3. Giảm khối lượng bằng ✊ (tay trái)

---

## 🎉 Kết Luận

Hệ thống **Gesture-Based Newton Physics Control** cung cấp một cách trực quan và thú vị để học và thực hành vật lý!

### **Highlights:**

✅ **12 gestures** nhận diện chính xác  
✅ **2 tay độc lập** - Trái (m, F), Phải (direction)  
✅ **F = ma simulation** realtime  
✅ **Visual feedback** đầy đủ  
✅ **Không cần chạm** - 100% gesture control  
✅ **AR effects** tích hợp  
✅ **Intuitive rules** - Dễ học, dễ nhớ  
✅ **Physics accurate** - Gravity, friction, bounce  

**Chúc bạn học tập vui vẻ! 🎓⚛️🖐️**

