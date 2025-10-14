# 🎯 Category Filtering Guide

## Categories hiện có

Dựa trên `/public/labs/index.json`, hiện có **6 categories**:

### 1. ⚡ Cơ học (3 labs)
- **Chuyển động ném xiên** (projectile) - 75 XP
- **Dao động điều hòa** (harmonic-motion) - 85 XP
- **Động lực học không khí** (aerodynamics) - 150 XP
- **Tổng XP**: 310 XP

### 2. 💡 Quang học (1 lab)
- **Khúc xạ ánh sáng** (refraction) - 80 XP
- **Tổng XP**: 80 XP

### 3. 👁️ Thị giác máy tính (1 lab)
- **Motion Tracking với Camera** (motion-tracking) - 100 XP
- **Tổng XP**: 100 XP

### 4. 📷 Computer Vision (1 lab)
- **OCR Pipeline - Nhận diện chữ viết** (ocr-simulation) - 150 XP
- **Tổng XP**: 150 XP

### 5. 🎲 Procedural Generation (1 lab)
- **WFC Builder - Procedural 3D** (wfc-builder) - 180 XP
- **Tổng XP**: 180 XP

### 6. 🤖 Machine Learning (1 lab)
- **DataSim.AI - ML Training** (datasim-ai) - 200 XP
- **Tổng XP**: 200 XP

---

## 🔗 Filter URLs

### Cơ học (3 labs)
```
http://localhost:3000/dashboard/labtwin/labs?category=Cơ học
```

### Computer Vision (1 lab - OCR)
```
http://localhost:3000/dashboard/labtwin/labs?category=Computer Vision
```

### Thị giác máy tính (1 lab - Motion Tracking)
```
http://localhost:3000/dashboard/labtwin/labs?category=Thị giác máy tính
```

### Procedural Generation (1 lab - WFC)
```
http://localhost:3000/dashboard/labtwin/labs?category=Procedural Generation
```

### Machine Learning (1 lab - DataSim.AI)
```
http://localhost:3000/dashboard/labtwin/labs?category=Machine Learning
```

### Quang học (1 lab)
```
http://localhost:3000/dashboard/labtwin/labs?category=Quang học
```

---

## 🎨 Category Colors

Mỗi category có gradient riêng:

| Category | Emoji | Gradient | Text Color |
|----------|-------|----------|------------|
| Cơ học | ⚡ | Pink (100→200) | Pink 700 |
| Quang học | 💡 | Yellow (100→200) | Yellow 700 |
| Thị giác máy tính | 👁️ | Teal (100→200) | Teal 700 |
| Computer Vision | 📷 | Emerald (100→200) | Emerald 700 |
| Procedural Generation | 🎲 | Indigo (100→200) | Indigo 700 |
| Machine Learning | 🤖 | Purple (100→200) | Purple 700 |

---

## ✅ Filtering Features

### 1. URL-based filtering
- Nhấn category từ LabTwin page → URL updates
- Share link với filter đã chọn
- Browser back/forward hoạt động đúng

### 2. Filter Bar
Khi **chưa chọn** category:
- Hiện tất cả category buttons
- Click vào category → filter

Khi **đã chọn** category:
- Banner hiện category đang lọc
- Button "Xóa filter" để clear

### 3. Smart Sorting
Trong mỗi category, labs được sắp xếp:
1. **Độ khó**: Dễ → Trung bình → Nâng cao → Khó
2. **XP**: Cao → Thấp (trong cùng độ khó)

### 4. Empty State
- Nếu category không có labs → Hiện message
- Link "Xem tất cả danh mục" để quay lại

---

## 🧪 Test Filtering

### Test tự động:
```
http://localhost:3000/test-category-filter.html
```

### Test manual:
1. Vào: `http://localhost:3000/dashboard/labtwin/labs`
2. Click vào filter button "⚡ Cơ học"
3. URL chuyển thành: `?category=Cơ học`
4. Chỉ hiện 3 labs: projectile, harmonic-motion, aerodynamics
5. Click "Xóa filter" → Quay lại tất cả

---

## 🔧 Code Implementation

### Filter logic:
```tsx
const filteredSimulations = selectedCategory
  ? labsData.simulations.filter((sim: any) => sim.category === selectedCategory)
  : labsData.simulations;
```

### Sorting logic:
```tsx
.sort((a, b) => {
  const difficultyOrder = { 'Dễ': 1, 'Trung bình': 2, 'Nâng cao': 3, 'Khó': 4 };
  const aDiff = difficultyOrder[a.difficulty] || 2;
  const bDiff = difficultyOrder[b.difficulty] || 2;
  
  if (aDiff !== bDiff) return aDiff - bDiff;
  return (b.xp || 0) - (a.xp || 0);
})
```

### URL params:
```tsx
const searchParams = useSearchParams();
const categoryFilter = searchParams.get('category');
```

---

## 📝 Notes

### Merge "Computer Vision" categories?
Hiện có 2 categories gần giống:
- "Thị giác máy tính" (tiếng Việt)
- "Computer Vision" (tiếng Anh)

**Option 1**: Merge thành một (recommended)
**Option 2**: Giữ riêng, nhưng hiển thị rõ distinction

### Thêm categories sau này:
- Điện từ (khi có labs)
- Sóng (khi có labs)
- Nhiệt học (khi có labs)
- Chemistry
- Biology

---

**Status**: ✅ Filtering hoạt động chính xác
**Test**: `http://localhost:3000/test-category-filter.html`
**Updated**: 2025-10-13


