# Import Có Biên Tập - Review & Edit Before Import

## ✅ Tính năng mới: Biên tập câu hỏi trước khi duyệt

### Luồng import 2 bước:

```
Bước 1: Upload file
  ↓
Bước 2: Review & Edit (MỚI!)
  - Xem tất cả câu hỏi đã parse
  - Edit từng câu (nội dung, phương án, đáp án)
  - Chọn/bỏ chọn câu hỏi
  - Xóa câu hỏi không cần
  ↓
Bước 3: Import vào ngân hàng
```

## 🎯 Các tính năng trong màn hình Review

### 1. **Chọn tất cả / Bỏ chọn tất cả**
- Checkbox ở đầu danh sách
- Đếm số câu đã chọn: `X/Y câu hỏi`

### 2. **Edit từng câu hỏi**
Click nút ✏️ (Edit icon) để mở chế độ chỉnh sửa:

#### Trường có thể edit:
- ✅ **Nội dung**: Textarea cho nội dung câu hỏi
- ✅ **Phương án**: Input cho từng phương án A, B, C, D
- ✅ **Đáp án đúng**: Dropdown chọn A/B/C/D
- ✅ **Độ khó**: Dropdown (Dễ/Trung bình/Khó)
- ✅ **Giải thích**: Textarea

### 3. **Xóa câu hỏi**
Click nút 🗑️ (Trash icon) để xóa khỏi danh sách import

### 4. **Chọn lọc câu hỏi**
- Checkbox cho mỗi câu
- Chỉ import những câu đã chọn
- Câu không chọn sẽ mờ đi (opacity 60%)

## 🎨 UI/UX Features

### Visual Feedback:
- **Edit mode**: Background tím nhạt, border tím đậm, shadow
- **Selected**: Background trắng, border xám
- **Not selected**: Background xám, mờ

### Badges:
- **Loại câu**: "Nhiều lựa chọn", "Đúng/Sai", "Tự luận"
- **Môn & Khối**: "Vật lý - Khối 10"

### Đáp án highlight:
- **Đúng**: Background xanh lá, border xanh, text xanh đậm
- **Sai**: Background xám, border xám

## 📋 Hướng dẫn sử dụng

### Bước 1: Upload file
```
1. Click "Import từ file"
2. Chọn file Excel/Word/CSV
3. Click "Tiếp tục"
```

### Bước 2: Review & Edit
```
1. Xem danh sách câu hỏi đã parse
2. Click ✏️ để edit câu hỏi
3. Sửa:
   - Nội dung (nếu sai)
   - Phương án (nếu thiếu)
   - Đáp án (nếu sai)
   - Độ khó
   - Giải thích
4. Bỏ chọn câu không muốn import
5. Xóa câu hỏng (click 🗑️)
6. Click "Import X câu hỏi"
```

### Bước 3: Hoàn tất
```
- Hệ thống import các câu đã chọn
- Hiển thị thông báo kết quả
- Tự động refresh danh sách
```

## 💡 Use Cases

### Trường hợp 1: File Excel chuẩn
- Import → Review → Import ngay (không cần edit)

### Trường hợp 2: File cần sửa nhỏ
- Import → Review → Edit vài câu → Import

### Trường hợp 3: File lỗi nhiều
- Import → Review → Edit nhiều câu → Xóa câu hỏng → Import

### Trường hợp 4: Chỉ muốn chọn một số câu
- Import → Review → Bỏ chọn câu không cần → Import

## 🔧 Technical Details

### State Management:
```typescript
interface ParsedQuestion {
  id: string              // temp-id
  content: string
  options: string[]
  correctAnswer: string
  explanation: string
  subject: string
  grade: string
  topic: string
  difficulty: string
  questionType: string
  selected: boolean       // Checkbox state
  editMode: boolean       // Edit mode toggle
}
```

### Handlers:
- `handleToggleSelect(id)` - Toggle checkbox
- `handleToggleEditMode(id)` - Toggle edit mode
- `handleUpdateQuestion(id, updates)` - Update question data
- `handleDeleteQuestion(id)` - Delete from list

### Validation:
- Chỉ import câu đã chọn (`selected: true`)
- Tối thiểu 1 câu được chọn
- Content > 10 ký tự (đã filter từ bước parse)

## 📊 Example Flow

### File Excel gốc:
```
| content | A | B | C | D | correctAnswer |
|---------|---|---|---|---|---------------|
| 2 + 2 = ? | 3 | 4 | 5 | 6 | B |
```

### Sau khi parse:
```json
{
  "id": "temp-0",
  "content": "2 + 2 = ?",
  "options": ["3", "4", "5", "6"],
  "correctAnswer": "B",
  "subject": "Toán học",
  "grade": "Khối 10",
  "difficulty": "MEDIUM",
  "selected": true,
  "editMode": false
}
```

### Edit mode:
- User click ✏️
- `editMode: true`
- Hiển thị form với các inputs
- User sửa: content → "Tính: 2 + 2 = ?", difficulty → "EASY"
- User click ✓ (save)
- `editMode: false`
- Cập nhật UI với dữ liệu mới

### Import:
- Chỉ import câu `selected: true`
- POST đến `/api/questions`
- Kết quả: Thông báo thành công

## 🎯 Benefits

### Trước đây:
- ❌ Import → Lưu ngay (không xem lại)
- ❌ Lỗi chính tả → Phải vào từng câu để sửa
- ❌ Sai đáp án → Phải edit sau khi import
- ❌ Muốn bỏ câu → Không có cách

### Bây giờ:
- ✅ Import → Review → Edit → Lưu
- ✅ Sửa lỗi chính tả trước khi lưu
- ✅ Điều chỉnh đáp án, độ khó
- ✅ Bỏ chọn/xóa câu không cần
- ✅ Kiểm soát 100% dữ liệu import

## 📁 Files Modified

```
components/question-bank/
└── import-modal.tsx    # Added review & edit step
```

### Key Changes:
1. Added `importStep` state: "upload" | "review" | "complete"
2. Added `parsedQuestions` state: `ParsedQuestion[]`
3. Added `convertToParsedQuestions()` function
4. Added edit handlers
5. Added review UI with editable cards
6. Updated `processQuestions()` to use selected questions

## 🚀 Next Steps (Optional)

- [ ] Bulk edit (chọn nhiều câu → edit cùng lúc)
- [ ] Search/filter trong review
- [ ] Reorder (kéo thả sắp xếp)
- [ ] Duplicate detection
- [ ] Preview PDF export
- [ ] Save as draft (chưa duyệt ngay)

## 📝 Tips

1. **Review kỹ trước khi import**: Edit mode cho phép sửa mọi thứ
2. **Sử dụng checkbox**: Chỉ import câu chất lượng
3. **Xóa câu hỏng**: Đừng ngại click 🗑️
4. **Check đáp án**: Đáp án đúng highlight màu xanh
5. **Độ khó**: Điều chỉnh theo đối tượng học sinh
