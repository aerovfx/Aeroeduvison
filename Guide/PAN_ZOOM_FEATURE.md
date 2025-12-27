# 🔍 Pan & Zoom Feature - Tính năng Quan sát Chi tiết

## ✨ Tổng quan

Hệ thống giờ có **Image Viewer** với đầy đủ controls để quan sát chi tiết ảnh bài thi!

---

## 🎯 Tính năng

### 1. **Zoom (Phóng to/thu nhỏ)**

**Cách 1: Buttons**
```
[➖ Zoom Out] [100%] [➕ Zoom In] [🔲 Reset]
```

**Cách 2: Mouse Wheel**
- Scroll lên → Zoom in
- Scroll xuống → Zoom out

**Range:** 50% - 300%

### 2. **Pan (Kéo ảnh)**

**Khi đã zoom:**
- Click & drag để di chuyển ảnh
- Cursor: grab ✋ → grabbing ✊
- Smooth panning

### 3. **Reset**

Click nút **Reset** (🔲) để về trạng thái ban đầu:
- Zoom: 100%
- Pan: (0, 0)

---

## 🎨 UI Design

### Control Bar

```
┌─────────────────────────────────────────────────────┐
│ ↔️ Kéo để di chuyển | Scroll để zoom                │
│                             [➖] [100%] [➕] [🔲]    │
└─────────────────────────────────────────────────────┘
```

### Image Viewer (h-96 = 384px)

```
┌─────────────────────────────────────────┐
│ 📄 student_exam.jpg        [Top Right]  │
│                                         │
│                                         │
│         [ẢNH BÀI THI]                   │
│      (có thể zoom & pan)                │
│                                         │
│                                         │
│ 🔍 150%                   ↔️ Kéo di     │
│ [Bottom Left]             chuyển       │
└─────────────────────────────────────────┘
```

### OCR Textarea (10 rows, 240px min-height)

```
┌─────────────────────────────────────────┐
│ Bài làm của học sinh (Text OCR)         │
│ ┌───────────────────────────────────┐   │
│ │                                   │   │
│ │ Cách mạng tháng Tám năm 1945     │   │
│ │ thắng lợi vì có sự lãnh đạo      │   │
│ │ sáng suốt của Đảng Cộng sản      │   │
│ │ Việt Nam, nhân dân cả nước       │   │
│ │ đoàn kết một lòng, tinh thần     │   │
│ │ yêu nước cao...                   │   │
│ │                                   │   │
│ │ [10 ROWS - Rộng hơn!]            │   │
│ │                                   │   │
│ └───────────────────────────────────┘   │
│ ℹ️ Có thể chỉnh sửa    │ 156 ký tự, 24 từ │
└─────────────────────────────────────────┘
```

### Comparison View (h-48 = 192px)

```
┌────────────────────┬────────────────────┐
│ Bài làm học sinh   │ Đáp án mẫu         │
│ 156 ký tự          │ 98 ký tự           │
├────────────────────┼────────────────────┤
│                    │                    │
│ Cách mạng thắng    │ Do có sự lãnh đạo  │
│ lợi vì...          │ của Đảng...        │
│                    │                    │
│ [Cao hơn: 192px]   │ [Cao hơn: 192px]   │
│                    │                    │
│ (Blue background)  │ (Green background) │
└────────────────────┴────────────────────┘
```

---

## 🔧 Technical Implementation

### Zoom State

```typescript
const [imageZoom, setImageZoom] = useState(1); // 100%
const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.5));
```

### Pan State

```typescript
const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
const [isDragging, setIsDragging] = useState(false);

const handleMouseDown = (e) => {
  setIsDragging(true);
  setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
};

const handleMouseMove = (e) => {
  if (!isDragging) return;
  setImagePan({
    x: e.clientX - dragStart.x,
    y: e.clientY - dragStart.y
  });
};
```

### Transform

```tsx
<img 
  style={{
    transform: `translate(calc(-50% + ${imagePan.x}px), calc(-50% + ${imagePan.y}px)) scale(${imageZoom})`,
    cursor: isDragging ? 'grabbing' : 'grab'
  }}
/>
```

---

## 🎮 User Controls

### Mouse Actions:

| Action | Result |
|--------|--------|
| **Scroll up** | Zoom in (+10%) |
| **Scroll down** | Zoom out (-10%) |
| **Click + Drag** | Pan image |
| **Click Reset** | Back to 100%, center |

### Button Actions:

| Button | Icon | Result |
|--------|------|--------|
| **Zoom Out** | ➖ | -25% zoom |
| **Zoom In** | ➕ | +25% zoom |
| **Reset** | 🔲 | 100%, center |

---

## 📏 Size Improvements

### Before:

```
Image viewer: h-64 (256px) - quá nhỏ!
OCR textarea: rows={8} (192px)
Comparison: h-32 (128px) - khó đọc!
```

### After:

```
Image viewer: h-96 (384px) - +50% bigger!
OCR textarea: rows={10}, min-h-240px - +25% bigger!
Comparison: h-48 (192px) - +50% bigger!
```

**Result:** Tất cả đều RÕ RÀNG và DỄ ĐỌC hơn! ✅

---

## 💡 Use Cases

### Case 1: Xem chữ viết nhỏ

```
1. Upload ảnh bài thi chữ viết nhỏ
2. Scroll mouse wheel (hoặc click [➕])
3. Zoom đến 200-300%
4. Kéo chuột để xem từng phần
5. Đọc rõ từng chữ!
```

### Case 2: Xem toàn cảnh

```
1. Ảnh bị zoom in quá
2. Click [🔲 Reset]
3. Về 100%, centered
4. Xem toàn bộ bài làm
```

### Case 3: Focus vào câu trả lời cụ thể

```
1. Zoom to 150%
2. Kéo đến vùng câu trả lời cần xem
3. Đọc chi tiết
4. So sánh với text OCR bên dưới
```

---

## 🎨 Visual Feedback

### Indicators:

**Top Left (Zoom Level):**
```
🔍 150%
```

**Top Right (File Name):**
```
📄 student_exam.jpg
```

**Bottom Right (Pan Hint - khi zoom > 100%):**
```
↔️ Kéo để di chuyển
```

### Cursor Changes:

```
Normal:    cursor-move (crosshair)
Grab:      cursor-grab (open hand)
Grabbing:  cursor-grabbing (closed hand)
```

---

## 📊 Comparison: Before vs After

### Image Viewer:

| Aspect | Before | After |
|--------|--------|-------|
| **Height** | 256px | 384px (+50%) |
| **Zoom** | No | 50%-300% ✅ |
| **Pan** | No | Yes ✅ |
| **Controls** | No | 4 buttons ✅ |
| **Wheel** | No | Zoom with wheel ✅ |
| **Indicators** | No | 3 overlays ✅ |

### OCR Textarea:

| Aspect | Before | After |
|--------|--------|-------|
| **Rows** | 6 | 10 (+67%) |
| **Min Height** | Auto | 240px ✅ |
| **Font Size** | text-sm | text-base ✅ |
| **Stats** | No | Chars + words ✅ |
| **Border** | border | border-2 ✅ |

### Comparison Boxes:

| Aspect | Before | After |
|--------|--------|-------|
| **Height** | 128px | 192px (+50%) |
| **Font Size** | text-xs | text-sm ✅ |
| **Stats** | No | Char count ✅ |
| **Border** | border | border-2 ✅ |

---

## 🚀 How to Use

### Step-by-step:

**1. Upload ảnh bài thi**
```
Tab "Upload & Cấu hình" → Upload file
```

**2. Xử lý bài thi**
```
Click "Xử lý bài thi đầu tiên"
```

**3. Xem ảnh trong Tab "Chấm điểm"**
```
- Ảnh hiển thị ở khung 384px (rộng!)
- Có controls: [➖] [100%] [➕] [🔲]
```

**4. Zoom để xem chi tiết**
```
Cách 1: Click [➕] nhiều lần → 125%, 150%, 175%, 200%...
Cách 2: Scroll chuột lên → Zoom in mượt mà
```

**5. Pan để xem các vùng khác**
```
- Click & giữ chuột
- Kéo theo hướng muốn xem
- Thả chuột
```

**6. Reset khi cần**
```
Click [🔲] → Về 100%, centered
```

**7. Xem text OCR**
```
- Textarea 10 rows (240px)
- Font size lớn (text-base)
- Dễ đọc, có thể edit
- Hiển thị stats: "156 ký tự, 24 từ"
```

**8. So sánh 2 cột**
```
- Bài HS (blue) vs Đáp án (green)
- Chiều cao 192px (đủ rộng!)
- Font text-sm (vừa phải)
- Có char count
```

---

## 🎯 Benefits

### ✅ Quan sát chi tiết:
- Zoom đến 300% để xem chữ viết nhỏ
- Pan đến mọi vị trí trên ảnh
- Smooth mouse wheel zoom

### ✅ Dễ sử dụng:
- 4 buttons rõ ràng
- Mouse gestures tự nhiên
- Visual feedback (indicators)
- One-click reset

### ✅ Hiệu quả:
- Không cần mở ảnh ra app khác
- Xem và chấm cùng lúc
- So sánh với text OCR ngay bên dưới

---

## 🧪 Test Scenarios

### Test 1: Chữ viết nhỏ ✅
```
Input: Ảnh bài thi chữ viết nhỏ
Action: 
  1. Zoom to 250%
  2. Pan to text area
  3. Read clearly
Result: ✅ Can read small handwriting!
```

### Test 2: Bài làm dài ✅
```
Input: Ảnh A4 đầy chữ
Action:
  1. Start at 100%
  2. Zoom to 150%
  3. Pan từ trên xuống dưới
  4. Read all content
Result: ✅ Can navigate full page!
```

### Test 3: Quick navigation ✅
```
Action:
  1. Zoom in too much (300%)
  2. Lost position
  3. Click Reset
  4. Back to 100%, centered
Result: ✅ Easy reset!
```

---

## 📐 Specifications

### Image Viewer:

```typescript
Container:
  - Width: 100% (responsive)
  - Height: 384px (h-96)
  - Background: gray-900
  - Border: 2px gray-300
  - Rounded: xl

Image:
  - Position: absolute center
  - Transform origin: center
  - Max-width: none (can exceed container)
  - User-select: none (no text selection)
  - Draggable: false (custom drag)

Zoom:
  - Min: 0.5 (50%)
  - Max: 3.0 (300%)
  - Step (buttons): 0.25 (25%)
  - Step (wheel): 0.1 (10%)

Pan:
  - X: unlimited
  - Y: unlimited
  - Constraint: none (can pan anywhere)
```

### Controls:

```typescript
Zoom Out button:
  - Icon: ZoomOut (➖)
  - Action: zoom -= 25%
  - Disabled: when zoom <= 50%

Zoom In button:
  - Icon: ZoomIn (➕)
  - Action: zoom += 25%
  - Disabled: when zoom >= 300%

Reset button:
  - Icon: Maximize2 (🔲)
  - Action: zoom = 100%, pan = (0,0)
  - Color: indigo-600 (highlighted)
```

---

## 🎨 Visual Indicators

### 1. Zoom Level (Bottom Left)
```tsx
<div className="absolute bottom-3 left-3 bg-black/70 text-white">
  🔍 {(imageZoom * 100).toFixed(0)}%
</div>
```

### 2. File Name (Top Right)
```tsx
<div className="absolute top-3 right-3 bg-black/70 text-white">
  📄 {fileName}
</div>
```

### 3. Pan Hint (Bottom Right, when zoomed)
```tsx
{imageZoom > 1 && (
  <div className="absolute bottom-3 right-3">
    ↔️ Kéo để di chuyển
  </div>
)}
```

---

## 💻 Code Snippets

### State Management:

```typescript
const [imageZoom, setImageZoom] = useState(1);
const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
const [isDragging, setIsDragging] = useState(false);
const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
const imageContainerRef = useRef<HTMLDivElement>(null);
```

### Event Handlers:

```typescript
// Zoom controls
const handleZoomIn = () => setImageZoom(prev => Math.min(prev + 0.25, 3));
const handleZoomOut = () => setImageZoom(prev => Math.max(prev - 0.25, 0.5));
const handleResetZoom = () => {
  setImageZoom(1);
  setImagePan({ x: 0, y: 0 });
};

// Pan controls
const handleMouseDown = (e) => {
  setIsDragging(true);
  setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
};

const handleMouseMove = (e) => {
  if (!isDragging) return;
  setImagePan({
    x: e.clientX - dragStart.x,
    y: e.clientY - dragStart.y
  });
};

// Wheel zoom
const handleWheel = (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  setImageZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
};
```

---

## 🎯 Keyboard Shortcuts (Future)

Có thể thêm sau:

```
+ / = : Zoom in
- / _ : Zoom out
0     : Reset
Arrow keys: Pan
Spacebar + drag: Pan (like Photoshop)
```

---

## 🌟 Advanced Features (Future)

### Phase 2:
- [ ] Fit to width/height buttons
- [ ] Magnifier lens (small preview)
- [ ] Rotate image (90°, 180°)
- [ ] Brightness/Contrast controls
- [ ] Crop selection
- [ ] Fullscreen mode

### Phase 3:
- [ ] Multi-image viewer (carousel)
- [ ] Annotations (draw on image)
- [ ] OCR bounding boxes overlay
- [ ] Compare images side-by-side
- [ ] Touch gestures (pinch zoom on mobile)

---

## 📊 Size Summary

| Component | Before | After | Change |
|-----------|--------|-------|--------|
| **Image viewer** | 256px | 384px | +50% |
| **OCR textarea** | ~192px | 240px+ | +25% |
| **Comparison boxes** | 128px | 192px | +50% |
| **Font (OCR)** | text-sm | text-base | +14% |
| **Font (compare)** | text-xs | text-sm | +17% |

**Overall:** Tất cả đều LỚNHƠN và RÕ RÀNG hơn! ✅

---

## ✅ Checklist

### Image Viewer:
- [x] Zoom in/out buttons
- [x] Zoom percentage display
- [x] Reset button
- [x] Mouse wheel zoom
- [x] Click & drag pan
- [x] Cursor feedback (grab/grabbing)
- [x] Zoom/pan indicators
- [x] File name overlay
- [x] Smooth transitions
- [x] Size: 384px (h-96)

### OCR Display:
- [x] 10 rows (vs 6)
- [x] Min-height: 240px
- [x] Font-size: text-base (larger)
- [x] Better placeholder
- [x] Char + word count
- [x] Border-2 (thicker)

### Comparison:
- [x] Height: 192px (h-48, vs h-32)
- [x] Font-size: text-sm (larger)
- [x] Char count badges
- [x] Border-2 (thicker)
- [x] Better colors

---

## 🚀 Ready to Use!

**Try it now:**
```
http://localhost:3000/dashboard/labtwin/labs/ocr-grading
```

**Workflow:**
1. Upload ảnh bài thi
2. Tab "Chấm điểm"
3. **Xem ảnh 384px** (lớn hơn 50%!)
4. **Zoom** với buttons hoặc scroll
5. **Pan** bằng cách kéo chuột
6. **Xem text OCR** (10 rows, rõ ràng!)
7. **So sánh** 2 cột (192px, dễ đọc!)

---

**🎉 Quan sát chi tiết bài làm học sinh chưa bao giờ dễ dàng đến thế!** ✨

Made with ❤️ for better UX

