# Nút Edit trong Danh Sách Câu Hỏi

## ✅ Nút Edit đã có sẵn!

### Vị trí trong Question Bank List

**URL**: `http://localhost:3000/teacher/question-bank/list`

#### Cột "Thao tác" (bên phải cùng):
```
| Chủ đề & Nội dung | Môn | Khối | Dạng | Độ khó | Trạng thái | Nguồn | Thao tác |
|-------------------|-----|------|------|--------|------------|-------|----------|
| ...               | ... | ...  | ...  | ...    | ...        | ...   | 👁 ✏️ 🗑️ |
```

### 3 Nút hành động:

1. **👁 Xem** (Eye icon)
   - Mở dialog xem chi tiết
   - Xem đầy đủ thông tin
   - Không thể chỉnh sửa

2. **✏️ Edit** (Pencil icon) ← Nút bạn cần!
   - Chuyển đến trang chỉnh sửa
   - URL: `/teacher/question-bank/edit/[id]`
   - Có thể sửa mọi thông tin

3. **🗑️ Xóa** (Trash icon)
   - Xóa câu hỏi
   - Có xác nhận

## 🎯 Cách sử dụng nút Edit

### Cách 1: Từ List
```
1. Vào /teacher/question-bank/list
2. Tìm câu hỏi cần sửa
3. Click nút ✏️ (Edit icon) trong cột Thao tác
4. Chuyển đến trang edit
5. Sửa thông tin
6. Click "Cập nhật câu hỏi"
```

### Cách 2: Từ View Dialog
```
1. Click 👁 Xem để mở dialog
2. Click nút "Chỉnh sửa" trong dialog
3. Chuyển đến trang edit
```

## 📋 Trang Edit có gì?

### URL: `/teacher/question-bank/edit/[id]`

#### Form chỉnh sửa đầy đủ:
- ✅ Nội dung câu hỏi (textarea)
- ✅ Loại câu hỏi (dropdown)
- ✅ Môn học (dropdown)
- ✅ Khối lớp (dropdown)
- ✅ Độ khó (dropdown)
- ✅ Mức độ nhận thức (dropdown)
- ✅ Chủ đề (input)
- ✅ Phương án A/B/C/D (với MCQ)
- ✅ Đáp án đúng (dropdown)
- ✅ Giải thích (textarea)
- ✅ Từ khóa (tag input)
- ✅ Mục tiêu học tập (tag input)

#### Actions:
- **Hủy**: Quay lại list
- **Cập nhật câu hỏi**: Lưu thay đổi

## 🎨 UI Layout

### Table Row Layout:
```
┌──────────────────────────────────────────────────────────────┐
│ [Checkbox] │ Chủ đề & Nội dung │ Môn │ ... │ Thao tác      │
│            │                   │     │     │ [👁] [✏️] [🗑️] │
└──────────────────────────────────────────────────────────────┘
```

### Edit Button Style:
```tsx
<AIButton
  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
  size="icon"
  onClick={() => router.push(`/teacher/question-bank/edit/${question.id}`)}
>
  <Edit className="h-4 w-4" />
</AIButton>
```

## 🔍 Tìm câu hỏi cần edit

### Filters:
- **Search**: Tìm theo nội dung, chủ đề
- **Môn học**: Toán, Lý, Hóa, Văn, Anh...
- **Khối lớp**: Khối 6-12
- **Dạng**: MCQ, True/False, Short Answer, Essay

### Selection:
- Click vào câu hỏi để highlight
- Xem chi tiết ở panel bên phải (ở trang /teacher/question-bank)

## 💡 Tips

1. **Quick Edit**: Click ✏️ → Sửa → Cập nhật (nhanh!)
2. **View trước**: Click 👁 để xem trước khi edit
3. **Bulk edit**: Chọn nhiều câu → "Duyệt tất cả" (change status only)
4. **Search**: Gõ từ khóa để tìm nhanh câu cần sửa
5. **Filters**: Kết hợp filter để thu hẹp danh sách

## 📊 Workflow Example

### Edit một câu hỏi MCQ:
```
1. /teacher/question-bank/list
2. Filter: Môn = "Vật lý", Khối = "10"
3. Search: "vận tốc"
4. Tìm thấy câu hỏi về vận tốc
5. Click ✏️
6. Sửa nội dung: "Đơn vị của vận tốc là gì?"
7. Sửa phương án A: "m/s" → "m/s"
8. Sửa đáp án: "A" → "A"
9. Thêm giải thích: "Vận tốc là quãng đường..."
10. Click "Cập nhật câu hỏi"
11. ✓ Thành công!
```

## 📁 Files

```
app/(dashboard)/(routes)/teacher/question-bank/
├── list/page.tsx           # Danh sách (có nút ✏️)
├── edit/[id]/page.tsx      # Trang edit
└── page.tsx                # Trang chính (cũng có nút ✏️)
```

## 🎯 Quick Access

### Direct Links:
- **List**: http://localhost:3000/teacher/question-bank/list
- **Edit**: http://localhost:3000/teacher/question-bank/edit/[id]

### From Main Page:
```
/teacher/question-bank
  → Click vào câu hỏi trong table
  → Click "Chỉnh sửa" button
  → Edit page
```

## ✅ Confirm: Nút Edit đã hoạt động!

### Check:
- ✅ Nút Edit có trong list page
- ✅ Icon: Edit (pencil)
- ✅ Routing: `/teacher/question-bank/edit/[id]`
- ✅ Edit page tồn tại
- ✅ Form edit đầy đủ
- ✅ API update hoạt động

### Test:
```
1. Mở http://localhost:3000/teacher/question-bank/list
2. Tìm một câu hỏi bất kỳ
3. Nhìn sang cột "Thao tác" bên phải
4. Thấy 3 nút: 👁 ✏️ 🗑️
5. Click ✏️
6. Trang edit hiện ra ✓
```
