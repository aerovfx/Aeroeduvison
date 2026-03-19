# Question Bank List - Redesigned với Inline Editing

## ✅ Thiết kế mới: Chỉnh sửa trực tiếp trong danh sách

### Tính năng chính:

#### 1. **Expand/Collapse Rows** (Thu gọn/Mở rộng)
- Click nút **▼** để mở rộng xem chi tiết
- Click nút **▲** để thu gọn
- Nút **"Mở tất cả"** - Mở tất cả câu hỏi
- Nút **"Thu gọn tất cả"** - Thu gọn tất cả

#### 2. **Inline Editing** (Chỉnh sửa tại chỗ)
Khi mở rộng một câu hỏi, bạn có thể:
- ✅ **Sửa nội dung**: Textarea cho nội dung câu hỏi
- ✅ **Sửa phương án**: Input cho từng phương án A/B/C/D
- ✅ **Chọn đáp án**: Click vào nút tròn để chọn đáp án đúng
- ✅ **Thêm giải thích**: Textarea cho giải thích
- ✅ **Lưu ngay**: Click "Lưu thay đổi" để cập nhật
- ✅ **Hủy**: Click "Hủy" để đóng không lưu

#### 3. **Visual Feedback**
- **Đang mở**: Background màu tím nhạt
- **Đáp án đúng**: Highlight màu xanh lá
- **Đang lưu**: Loading spinner
- **Thành công**: Toast notification

## 🎯 Luồng sử dụng

### Cách 1: Quick Edit (Nhanh)
```
1. Vào /teacher/question-bank/list
2. Tìm câu hỏi cần sửa
3. Click nút "Sửa" (hoặc ▼)
4. Row mở rộng ra với form edit
5. Sửa nội dung/phương án/đáp án
6. Click "Lưu thay đổi"
7. ✓ Cập nhật thành công!
8. Row tự động thu gọn
```

### Cách 2: Expand để xem (Read-only)
```
1. Click ▼ để mở rộng
2. Xem nội dung đầy đủ
3. Xem phương án và đáp án
4. Click ▲ để thu gọn
```

### Cách 3: Bulk Actions
```
1. Mở nhiều câu hỏi cùng lúc
2. Counter hiển thị: "X câu đang mở"
3. Click "Mở tất cả" / "Thu gọn tất cả"
```

## 🎨 UI Layout

### Table Structure:
```
┌────┬──────────────┬──────┬──────┬──────┬────────┬──────────┬──────────┐
│ ▼  │ Nội dung     │ Môn  │ Khối │ Dạng │ Độ khó │ Trạng thái│ Thao tác │
├────┼──────────────┼──────┼──────┼──────┼────────┼──────────┼──────────┤
│ ▲  │ "2+2=?"      │ Toán │ 10   │ MCQ  │ Dễ     │ Đã duyệt │ Sửa 🗑️   │
├────┴──────────────┴──────┴──────┴──────┴────────┴──────────┴──────────┤
│ [Expanded Content - Edit Form]                                        │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Nội dung: [2 + 2 = ?                              ]             │   │
│ │                                                                 │   │
│ │ Phương án:                                                      │   │
│ │ [A] 3  [✓]  [B] 4  [✓]  [C] 5  [✓]  [D] 6  [✓]                │   │
│ │                                                                 │   │
│ │ Giải thích: [2 cộng 2 bằng 4                      ]             │   │
│ │                                                                 │   │
│ │ [Hủy]                          [✓ Lưu thay đổi]                 │   │
│ └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

### Row States:

#### Collapsed (Thu gọn):
```
┌────┬───────────────────┬──────┬──────┬──────┬────────┬──────────┬──────────┐
│ ▼  │ "Đơn vị vận tốc.."│ Vật lý│ 10  │ MCQ  │ Dễ     │ Đã duyệt │ Sửa 🗑️   │
└────┴───────────────────┴──────┴──────┴──────┴────────┴──────────┴──────────┘
```

#### Expanded (Mở rộng - View Mode):
```
┌────┬───────────────────────────────────────────────────────────────────┐
│ ▲  │ "Đơn vị vận tốc là gì?"                                           │
│    │ A. m/s    B. m/s²    C. m    D. s                                 │
│    │ Đáp án: A ✓                                                        │
│    │ Giải thích: Vận tốc là quãng đường...                              │
└────┴───────────────────────────────────────────────────────────────────┘
```

#### Expanded (Edit Mode):
```
┌────┬───────────────────────────────────────────────────────────────────┐
│    │ Nội dung: [Đơn vị của vận tốc là gì?                ]             │
│    │                                                                   │
│    │ Phương án:                                                        │
│    │ [A] [m/s     ] ✓  [B] [m/s²    ]    [C] [m       ]    [D] [s     ] │
│    │                                                                   │
│    │ Giải thích: [Vận tốc là quãng đường đi được...]   ]               │
│    │                                                                   │
│    │ [Hủy]                              [✓ Lưu thay đổi]               │
└────┴───────────────────────────────────────────────────────────────────┘
```

## 🔧 Components

### QuestionEditRow Component:
```typescript
interface Props {
  question: Question;
  isExpanded: boolean;
  onToggle: () => void;
  onSave: (updates: Partial<Question>) => void;
  onCancel: () => void;
}
```

### State Management:
```typescript
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
const [editedContent, setEditedContent] = useState(question.content)
const [editedOptions, setEditedOptions] = useState(question.options)
const [editedCorrectAnswer, setEditedCorrectAnswer] = useState(question.correctAnswer)
const [editedExplanation, setEditedExplanation] = useState(question.explanation)
```

### Handlers:
- `toggleRow(id)` - Toggle single row
- `expandAll()` - Expand all rows
- `collapseAll()` - Collapse all rows
- `handleSaveEdit(id, updates)` - Save changes to API
- `handleOptionChange(index, value)` - Update option text
- `setEditedCorrectAnswer(letter)` - Set correct answer

## 📊 Features Comparison

### Trước đây:
```
❌ Click "Edit" → Chuyển trang
❌ Phải load lại trang
❌ Chỉ edit được 1 câu
❌ Không xem trước nội dung
❌ Phải vào dialog để xem
```

### Bây giờ:
```
✅ Click "Sửa" → Mở rộng inline
✅ Không cần reload
✅ Edit nhiều câu cùng lúc
✅ Xem nội dung đầy đủ khi mở rộng
✅ Edit trực tiếp trong row
```

## 💡 Use Cases

### 1. Quick Fix (Sửa nhanh):
```
- Tìm câu hỏi sai chính tả
- Click "Sửa"
- Sửa 1-2 từ
- Click "Lưu"
- ✓ Xong trong 5 giây!
```

### 2. Batch Review (Xem nhiều câu):
```
- Click "Mở tất cả"
- Scroll xem tất cả câu hỏi
- Click "Thu gọn tất cả" khi xong
```

### 3. Update Answers (Cập nhật đáp án):
```
- Mở câu hỏi
- Click vào phương án đúng (highlight xanh)
- Click "Lưu"
```

### 4. Add Explanations (Thêm giải thích):
```
- Mở câu hỏi
- Nhập giải thích vào textarea
- Click "Lưu"
```

## 🎯 Keyboard Shortcuts (Future)

- `Ctrl + E`: Edit first visible question
- `Ctrl + S`: Save current edit
- `Esc`: Cancel edit / Collapse row
- `Ctrl + A`: Expand all
- `Ctrl + Z`: Collapse all

## 📱 Responsive Design

### Desktop:
- Full table with all columns
- Inline edit form đầy đủ

### Tablet:
- Scroll ngang cho table
- Form edit vẫn đầy đủ

### Mobile (Future):
- Card layout thay vì table
- Accordion cho expand/collapse

## 🔍 Search & Filter

### Filters:
- **Search**: Tìm theo nội dung, chủ đề
- **Môn học**: Dropdown (Toán, Lý, Hóa...)
- **Khối lớp**: Dropdown (Khối 6-12)
- **Dạng**: Dropdown (MCQ, True/False...)

### Counter:
- Hiển thị: "X câu đang mở"
- Update realtime khi expand/collapse

## 🎨 Visual Design

### Colors:
- **Expanded row**: `bg-purple-50`
- **Correct answer**: `bg-green-500`, `text-white`
- **Selected option**: `border-green-300`, `bg-green-50`
- **Save button**: `bg-green-600`, `hover:bg-green-700`

### Icons:
- **Expand**: `ChevronDown`
- **Collapse**: `ChevronUp`
- **Edit**: `Edit`
- **Save**: `Save`
- **Cancel**: `X`
- **Correct**: `CheckCircle`
- **Delete**: `Trash2`

### Animations:
- Smooth expand/collapse transition
- Loading spinner khi save
- Toast notification

## 📁 Files

```
app/(dashboard)/(routes)/teacher/question-bank/list/
├── page.tsx              # Redesigned page (inline edit)
└── page-backup.tsx       # Old version (backup)

components/
└── (none - all in page)
```

## 🚀 Performance

### Optimizations:
- Only render expanded row content
- Debounced save (future)
- Lazy load options
- Minimal re-renders

### State:
- `expandedRows`: Set<string> (efficient lookup)
- Local state per row (isolated updates)

## 🐛 Known Issues (Fixed)

- ✅ Row không thu gọn sau khi save → Fixed: Auto-collapse
- ✅ Mất changes khi click outside → Fixed: Confirm dialog
- ✅ Không thấy loading → Fixed: Spinner + disabled button

## 🔮 Future Enhancements

- [ ] Keyboard shortcuts
- [ ] Drag & drop reorder
- [ ] Bulk edit (select multiple → edit together)
- [ ] Preview mode (before save)
- [ ] Undo/Redo
- [ ] Version history
- [ ] Compare changes
- [ ] Comment/notes
- [ ] Export selected
- [ ] Print view

## 📝 Tips

1. **Mở 1 câu để edit**: Click "Sửa" hoặc ▼
2. **Mở nhiều câu để xem**: Click "Mở tất cả"
3. **Sửa nhanh**: Sửa → Lưu (không cần mở dialog)
4. **Chọn đáp án**: Click vào circle button cạnh phương án
5. **Hủy edit**: Click "Hủy" hoặc ▲
6. **Xem counter**: "X câu đang mở" ở góc

## 🎯 Test Checklist

- [x] Expand/collapse single row
- [x] Expand/collapse all rows
- [x] Edit content
- [x] Edit options
- [x] Change correct answer
- [x] Add explanation
- [x] Save changes
- [x] Cancel edit
- [x] Delete question
- [x] Search & filter
- [x] Loading states
- [x] Toast notifications
- [x] Responsive layout
