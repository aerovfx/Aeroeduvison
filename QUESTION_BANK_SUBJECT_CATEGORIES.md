# Question Bank - Subject Categories

## ✅ Redesigned: Ngân hàng câu hỏi theo môn học

### 🎯 Tính năng mới: Chọn môn học

Trang chủ Question Bank bây giờ hiển thị **10 danh mục môn học** để người dùng dễ dàng chọn lọc và quản lý câu hỏi.

## 📋 10 Môn học

### 1. **Toán học** 🔵
- **Icon**: Calculator
- **Color**: Blue
- **Description**: Đại số, Hình học, Giải tích
- **ID**: `toan`

### 2. **Vật lý** 🟣
- **Icon**: Atom
- **Color**: Purple
- **Description**: Cơ học, Điện học, Quang học
- **ID**: `vat-ly`

### 3. **Hóa học** 🟢
- **Icon**: TestTube
- **Color**: Green
- **Description**: Hóa vô cơ, Hóa hữu cơ
- **ID**: `hoa-hoc`

### 4. **Sinh học** 🟢
- **Icon**: Users
- **Color**: Emerald
- **Description**: Tế bào, Di truyền, Sinh thái
- **ID**: `sinh-hoc`

### 5. **Ngữ văn** 🔴
- **Icon**: PenTool
- **Color**: Red
- **Description**: Văn học, Tiếng Việt
- **ID**: `ngu-van`

### 6. **Tiếng Anh** 🟣
- **Icon**: Globe
- **Color**: Indigo
- **Description**: Grammar, Vocabulary, Reading
- **ID**: `tieng-anh`

### 7. **Lịch sử** 🟠
- **Icon**: Landmark
- **Color**: Amber
- **Description**: Sử Việt Nam, Sử Thế giới
- **ID**: `lich-su`

### 8. **Địa lý** 🔵
- **Icon**: Globe
- **Color**: Cyan
- **Description**: Địa lý tự nhiên, Kinh tế
- **ID**: `dia-ly`

### 9. **GDCD** 🟠
- **Icon**: Users
- **Color**: Orange
- **Description**: Giáo dục công dân
- **ID**: `gdcd`

### 10. **Tin học** ⚫
- **Icon**: Cpu
- **Color**: Slate
- **Description**: Lập trình, Ứng dụng
- **ID**: `tin-hoc`

## 🎨 UI Layout

### Grid Layout:
```
┌─────────────────────────────────────────────────────────┐
│ [📊] Ngân Hàng Câu Hỏi            [Import] [Sinh AI]   │
├─────────────────────────────────────────────────────────┤
│ Chọn môn học                                            │
│ ┌──────┬──────┬──────┬──────┬──────┐                   │
│ │🧮 Toán│⚛️ Lý │🧪 Hóa│👥 Sinh│📝 Văn│                   │
│ │Đại số│Cơ học│Vô cơ│Tế bào│Văn học│                   │
│ ├──────┼──────┼──────┼──────┼──────┤                   │
│ │🌐 Anh│🏛️ Sử │🌍 Địa│👥 GDCD│💻 Tin│                   │
│ │Grammar│Sử VN│Tự nhiên│Công dân│Lập trình│           │
│ └──────┴──────┴──────┴──────┴──────┘                   │
├─────────────────────────────────────────────────────────┤
│ [Search box - Tìm kiếm trong Toán học...]              │
├─────────────────────────────────────────────────────────┤
│ Câu hỏi | Môn | Loại | Độ khó | Trạng thái | Hành động │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Cách sử dụng

### 1. **Chọn môn học**
```
1. Vào /teacher/question-bank
2. Click vào card môn học (ví dụ: "Toán học")
3. Card được highlight với ring tím
4. Bảng câu hỏi hiển thị chỉ câu của môn đó
```

### 2. **Xem tất cả**
```
1. Đang chọn môn (ví dụ: "Toán học")
2. Click "Xem tất cả" ở góc phải
3. Bỏ chọn môn
4. Hiển thị tất cả câu hỏi của tất cả môn
```

### 3. **Tìm kiếm trong môn**
```
1. Chọn môn (ví dụ: "Vật lý")
2. Search box hiện ra với placeholder:
   "Tìm kiếm trong Vật lý..."
3. Gõ từ khóa
4. Filter kết quả trong môn đó
```

## 💡 Features

### Visual Feedback:
- **Hover**: Card nổi lên, shadow đậm hơn
- **Selected**: Ring tím, border tím đậm
- **Icon**: Màu đặc trưng cho mỗi môn
- **Background**: Màu nhạt theo môn

### Responsive Grid:
- **Mobile**: 2 columns
- **Tablet**: 3 columns
- **Desktop**: 5 columns

### Smart Filtering:
- Click môn → Filter theo subject
- Search → Filter trong môn đã chọn
- "Xem tất cả" → Clear filter

## 🔧 Technical Details

### Subject Category Interface:
```typescript
interface SubjectCategory {
  id: string
  name: string
  icon: LucideIcon
  color: string
  bgColor: string
  count: number
  description: string
}
```

### State Management:
```typescript
const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
```

### Filter Logic:
```typescript
useEffect(() => {
  loadQuestions()
}, [selectedSubject])

const loadQuestions = async () => {
  const params = new URLSearchParams()
  if (selectedSubject) params.set('subject', selectedSubject)
  const response = await fetch(`/api/questions?${params.toString()}`)
  // ...
}
```

## 📊 Subject Mapping

### Database Mapping:
```
UI ID        → Database Subject
toan         → "Toán học"
vat-ly       → "Vật lý"
hoa-hoc      → "Hóa học"
sinh-hoc     → "Sinh học"
ngu-van      → "Ngữ văn"
tieng-anh    → "Tiếng Anh"
lich-su      → "Lịch sử"
dia-ly       → "Địa lý"
gdcd         → "GDCD"
tin-hoc      → "Tin học"
```

## 🎨 Color Scheme

### Each Subject has:
- **Primary Color**: Dark shade for icon
- **Background Color**: Light shade for card
- **Ring Color**: Purple when selected

### Example:
```typescript
{
  id: "vat-ly",
  name: "Vật lý",
  color: "text-purple-600",      // Icon color
  bgColor: "bg-purple-50",       // Card background
}
```

## 🚀 Benefits

### Trước đây:
```
❌ Dropdown filter khó tìm
❌ Phải chọn filter mỗi lần
❌ Không thấy tổng quan
❌ Khó chọn môn
```

### Bây giờ:
```
✅ Card trực quan, dễ thấy
✅ 1 click là filter
✅ Thấy tổng quan 10 môn
✅ Icon & color phân biệt
✅ Responsive mobile
```

## 📱 Responsive Design

### Desktop (md+):
```
[Toán][Lý][Hóa][Sinh][Văn]
[Anh][Sử][Địa][GDCD][Tin]
```

### Tablet (sm-md):
```
[Toán][Lý][Hóa]
[Sinh][Văn][Anh]
[Sử][Địa][GDCD]
[Tin]
```

### Mobile (< sm):
```
[Toán][Lý]
[Hóa][Sinh]
[Văn][Anh]
[Sử][Địa]
[GDCD][Tin]
```

## 🔍 Search Integration

### When Subject Selected:
- Search box appears
- Placeholder: "Tìm kiếm trong {Môn}..."
- Search only in selected subject
- Clear subject → Search all

### When No Subject Selected:
- Search all subjects
- No placeholder customization

## 📁 Files Modified

```
app/(dashboard)/(routes)/teacher/question-bank/
└── page.tsx    # Redesigned with subject categories
```

### Key Changes:
1. Added `SUBJECT_CATEGORIES` array (10 subjects)
2. Added subject grid UI
3. Added `selectedSubject` state
4. Integrated with API filter
5. Added search box when subject selected
6. Added "Xem tất cả" button

## 🎯 Use Cases

### Teacher wants to add Physics questions:
```
1. Go to /teacher/question-bank
2. Click "Vật lý" card
3. See only Physics questions
4. Click "Import từ file"
5. Import Physics questions
6. Questions auto-filtered by subject
```

### Teacher wants to see all questions:
```
1. Go to /teacher/question-bank
2. See all subject cards
3. Don't click any card
4. See all questions from all subjects
```

### Teacher wants to search Math questions:
```
1. Go to /teacher/question-bank
2. Click "Toán học" card
3. Search box appears
4. Type "đạo hàm"
5. See only Math questions about derivatives
```

## 🎨 Icons & Colors

### Icon Selection:
- **Calculator** → Math (calculations)
- **Atom** → Physics (atomic physics)
- **TestTube** → Chemistry (lab experiments)
- **Users** → Biology (people), GDCD (citizens)
- **PenTool** → Literature (writing)
- **Globe** → English (global), Geography (world)
- **Landmark** → History (historical buildings)
- **Cpu** → IT (computers)

### Color Psychology:
- **Blue** → Math (logic, precision)
- **Purple** → Physics (mystery, depth)
- **Green** → Chemistry, Biology (life, nature)
- **Red** → Literature (passion, emotion)
- **Indigo** → English (wisdom)
- **Amber** → History (antiquity)
- **Cyan** → Geography (earth, water)
- **Orange** → GDCD (energy, citizenship)
- **Slate** → IT (technology, modern)

## 📊 Future Enhancements

- [ ] Show question count per subject
- [ ] Add subject statistics
- [ ] Quick actions per subject
- [ ] Subject-specific templates
- [ ] Bulk operations by subject
- [ ] Subject progress tracking
- [ ] Recent questions per subject
- [ ] Subject bookmarks/favorites
