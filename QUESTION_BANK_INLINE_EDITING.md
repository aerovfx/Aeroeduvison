# Question Bank - Inline Editing

## ✅ Redesigned: Hiển thị nội dung và đáp án với Inline Editing

### 🎯 Tính năng chính:

#### 1. **Hiển thị đầy đủ nội dung**
- ✅ Nội dung câu hỏi hiển thị ngay trong card
- ✅ 4 phương án A/B/C/D với màu sắc
- ✅ Đáp án đúng highlight màu xanh lá
- ✅ Giải thích (nếu có)

#### 2. **Sửa nhanh (Quick Edit)**
- ✅ Click "Sửa nhanh" → Mở rộng card
- ✅ Edit trực tiếp nội dung
- ✅ Edit từng phương án A/B/C/D
- ✅ Click vào circle để chọn đáp án đúng
- ✅ Thêm/sửa giải thích
- ✅ Click "Lưu thay đổi" → Cập nhật ngay

#### 3. **Expand/Collapse**
- ✅ Click ▼ để xem chi tiết
- ✅ Click ▲ để thu gọn
- ✅ "Mở tất cả" / "Thu gọn tất cả"

## 🎨 UI Layout

### Collapsed Card (Mặc định):
```
┌─────────────────────────────────────────────────────────┐
│ ▼  [Câu 1] [Vật lý] [Khối 10] [Nhiều lựa chọn] [Dễ]   │
│                                                         │
│  "Đơn vị của vận tốc là gì?"                           │
│                                                         │
│  [A. m/s    ✓]  [B. m/s²   ]                           │
│  [C. m       ]  [D. s       ]                           │
│                                                         │
│  [✏️ Sửa nhanh]  [🗑️ Xóa]                              │
└─────────────────────────────────────────────────────────┘
```

### Expanded Card (Edit Mode):
```
┌─────────────────────────────────────────────────────────┐
│ ▲  [Câu 1] [Vật lý] [Khối 10] [Nhiều lựa chọn] [Dễ]   │
├─────────────────────────────────────────────────────────┤
│ Nội dung câu hỏi:                                       │
│ [Đơn vị của vận tốc là gì?                ]             │
│                                                         │
│ Phương án trả lời:                                      │
│ [A] [m/s     ] ✓  [B] [m/s²    ]                        │
│ [C] [m       ]    [D] [s       ]                        │
│                                                         │
│ Giải thích:                                             │
│ [Vận tốc là quãng đường đi được...      ]               │
│                                                         │
│                [Hủy]  [✓ Lưu thay đổi]                  │
└─────────────────────────────────────────────────────────┘
```

## 💡 Cách sử dụng

### Xem nhanh:
```
1. Vào /teacher/question-bank
2. Chọn môn học (ví dụ: "Vật lý")
3. Click ▼ để mở rộng câu hỏi
4. Xem nội dung, phương án, đáp án
5. Click ▲ để thu gọn
```

### Sửa nhanh:
```
1. Click "Sửa nhanh"
2. Card mở rộng với form edit
3. Sửa:
   - Nội dung câu hỏi
   - Từng phương án A/B/C/D
   - Click ✓ để chọn đáp án đúng
   - Thêm giải thích
4. Click "Lưu thay đổi"
5. ✓ Cập nhật thành công!
```

### Xóa câu hỏi:
```
1. Click "Xóa"
2. Xác nhận
3. ✓ Xóa thành công
```

## 🎨 Visual Features

### Đáp án đúng:
- **Background**: Green-50
- **Border**: Green-200
- **Text**: Green-700 font-semibold
- **Checkmark**: ✓ icon

### Phương án sai:
- **Background**: Gray-50
- **Border**: Gray-200
- **Text**: Gray-700

### Card states:
- **Collapsed**: White background, gray border
- **Expanded**: Purple-50 background, purple border
- **Editing**: Form visible with inputs

## 🔧 Components

### QuestionCard:
```typescript
interface Props {
  question: Question;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (updates: Partial<Question>) => void;
  onDelete: () => void;
}
```

### State:
```typescript
const [isEditing, setIsEditing] = useState(false)
const [editedContent, setEditedContent] = useState(question.content)
const [editedOptions, setEditedOptions] = useState(question.options)
const [editedCorrectAnswer, setEditedCorrectAnswer] = useState(question.correctAnswer)
const [editedExplanation, setEditedExplanation] = useState(question.explanation)
```

## 📊 Data Flow

### Load:
```
/api/questions?subject=Vật lý&limit=100
  → GET questions
  → Display cards
```

### Edit & Save:
```
User edits content/options/answer
  → Click "Lưu thay đổi"
  → PUT /api/questions/[id]
  → { content, options, correctAnswer, explanation }
  → Success toast
  → Reload questions
```

### Delete:
```
User clicks "Xóa"
  → Confirm dialog
  → DELETE /api/questions/[id]
  → Success toast
  → Reload questions
```

## 🎯 Benefits

### Trước đây:
```
❌ Phải click "Edit" → Chuyển trang
❌ Chỉ thấy tiêu đề
❌ Không thấy đáp án
❌ Phải vào form mới sửa được
```

### Bây giờ:
```
✅ Thấy ngay nội dung đầy đủ
✅ Thấy 4 phương án A/B/C/D
✅ Đáp án đúng highlight xanh
✅ Sửa nhanh tại chỗ
✅ 1 click là edit được
```

## 📱 Responsive

### Desktop:
- 4 phương án: 2 columns
- Full form với tất cả inputs

### Tablet:
- 4 phương án: 2 columns
- Form vẫn đầy đủ

### Mobile:
- 4 phương án: 1 column
- Form stacked vertically

## 🔍 Search & Filter

### Search:
- Tìm theo nội dung câu hỏi
- Tìm theo môn học
- Real-time filtering

### Filter by Subject:
- Click môn học card
- Only show questions of that subject
- "Xem tất cả" to clear filter

## 📁 Files Modified

```
app/(dashboard)/(routes)/teacher/question-bank/
├── page.tsx          # New version with inline edit
└── page-old.tsx      # Old version (backup)
```

## 🚀 Features Checklist

- [x] Display question content
- [x] Display options A/B/C/D
- [x] Highlight correct answer
- [x] Show explanation
- [x] Quick edit button
- [x] Inline editing form
- [x] Save changes
- [x] Delete question
- [x] Expand/collapse
- [x] Open/close all
- [x] Search filter
- [x] Subject filter
- [x] Loading states
- [x] Toast notifications

## 💡 Tips

1. **Xem nhanh**: Click ▼ để xem nội dung và đáp án
2. **Sửa nhanh**: Click "Sửa nhanh" → Edit → Lưu
3. **Chọn đáp án**: Click vào circle button cạnh phương án
4. **Mở tất cả**: Click "Mở tất cả" để xem tất cả câu hỏi
5. **Thu gọn**: Click "Thu gọn tất cả" khi xong

## 🎯 Test Flow

```
http://localhost:3000/teacher/question-bank
→ Select "Vật lý"
→ See Physics questions
→ Click ▼ on a question
→ See full content and options
→ Click "Sửa nhanh"
→ Edit content or options
→ Click ✓ to change correct answer
→ Click "Lưu thay đổi"
→ ✓ Success!
```
