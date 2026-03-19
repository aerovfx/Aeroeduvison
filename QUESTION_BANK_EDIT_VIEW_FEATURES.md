# Question Bank - Biên tập và Xem câu hỏi

## ✅ Tính năng đã hoàn thành

### Trang danh sách câu hỏi
**URL**: `http://localhost:3000/teacher/question-bank/list`

#### Các nút hành động cho mỗi câu hỏi:

1. **👁 Xem** (Eye icon)
   - Mở dialog hiển thị chi tiết câu hỏi
   - Hiển thị: thông tin cơ bản, nội dung, phương án, đáp án đúng, giải thích
   - Không thể chỉnh sửa từ dialog này

2. **✏️ Biên tập** (Edit icon)
   - Chuyển đến trang chỉnh sửa: `/teacher/question-bank/edit/[id]`
   - Có thể sửa tất cả thông tin:
     - Nội dung câu hỏi
     - Loại câu hỏi (MCQ, True/False, Short Answer, Essay)
     - Môn học, Khối lớp
     - Độ khó, Mức độ nhận thức
     - Phương án trả lời (với MCQ)
     - Đáp án đúng
     - Giải thích chi tiết
     - Từ khóa, Mục tiêu học tập

3. **🗑 Xóa** (Trash icon)
   - Xóa câu hỏi khỏi ngân hàng
   - Có xác nhận trước khi xóa

### Trang chỉnh sửa câu hỏi
**URL**: `/teacher/question-bank/edit/[id]`

#### Các tính năng:

- **Form chỉnh sửa đầy đủ** với tất cả trường thông tin
- **Sinh đáp án bằng AI** (với câu hỏi tự luận/trả lời ngắn)
- **Validation** trước khi lưu
- **Preview** các phương án
- **Quay lại** danh sách không lưu

#### API Endpoints:

```bash
# GET - Lấy thông tin câu hỏi
GET /api/question-bank/[id]
Response: { question: {...} }

# PUT - Cập nhật câu hỏi
PUT /api/question-bank/[id]
Body: {
  content, type, subject, grade, difficulty,
  cognitiveLevel, options, correctAnswer,
  explanation, topic, keywords, learningObjectives
}
Response: { success: true, question: {...} }

# DELETE - Xóa câu hỏi
DELETE /api/question-bank/[id]
Response: { success: true, message: "..." }
```

## 🎨 UI Components

### Glass Card Design
- Phong cách AI Native
- Bo tròn, shadow mềm mại
- Hover effects

### Badges
- **Môn học**: Blue badge
- **Dạng câu hỏi**: Purple/Default badge
- **Độ khó**: Green/Yellow/Red badge
- **Trạng thái**: Green/Default badge
- **Nguồn**: AI badge (purple) / Thủ công (gray)

### Dialog xem chi tiết
- Responsive (max-w-2xl)
- Hiển thị dạng card
- Highlight đáp án đúng (màu xanh)
- Icons và badges rõ ràng

## 📋 Luồng sử dụng

### Xem câu hỏi:
```
1. Vào /teacher/question-bank/list
2. Tìm câu hỏi cần xem
3. Nhấn nút 👁 (Eye icon)
4. Dialog hiện ra với đầy đủ thông tin
5. Nhấn ra ngoài hoặc ESC để đóng
```

### Biên tập câu hỏi:
```
1. Vào /teacher/question-bank/list
2. Tìm câu hỏi cần sửa
3. Nhấn nút ✏️ (Edit icon)
4. Chỉnh sửa thông tin trong form
5. Nhấn "Cập nhật câu hỏi" để lưu
6. Tự động quay lại danh sách
```

### Xóa câu hỏi:
```
1. Vào /teacher/question-bank/list
2. Tìm câu hỏi cần xóa
3. Nhấn nút 🗑 (Trash icon)
4. Xác nhận trong dialog
5. Câu hỏi được xóa
```

## 🔍 Filter & Search

### Bộ lọc:
- **Môn học**: Toán, Văn, Anh, Vật lý, ...
- **Khối lớp**: Khối 6-12
- **Dạng câu hỏi**: MCQ, True/False, Short Answer, Essay

### Tìm kiếm:
- Tìm theo nội dung câu hỏi
- Tìm theo chủ đề
- Case-insensitive

## 📊 Thống kê nhanh

Hiển thị trong header:
- Tổng số câu hỏi
- Số câu Đúng-Sai
- Số câu Nhiều lựa chọn

## 🚀 Bulk Actions

Khi chọn nhiều câu hỏi (checkbox):
- ✅ **Duyệt tất cả**: Chuyển status sang "Đã duyệt"
- 🗑 **Xóa đã chọn**: Xóa hàng loạt
- ❌ **Hủy**: Bỏ chọn tất cả

## 💡 Tips

1. **Sử dụng AI Generate Answer**:
   - Với câu tự luận, nhấn "Gen đáp án" để AI đề xuất
   - Tiết kiệm thời gian soạn đáp án mẫu

2. **Filter hiệu quả**:
   - Kết hợp nhiều filter để tìm nhanh
   - Dùng search để tìm theo từ khóa

3. **Bulk edit**:
   - Chọn nhiều câu để duyệt cùng lúc
   - Hữu ích khi import số lượng lớn

## 📁 Files liên quan

```
app/(dashboard)/(routes)/teacher/question-bank/
├── list/page.tsx              # Danh sách câu hỏi (có nút Xem/Sửa/Xóa)
├── edit/[id]/page.tsx         # Trang chỉnh sửa
├── create/page.tsx            # Tạo câu hỏi mới
└── page.tsx                   # Sinh câu hỏi hàng loạt

app/api/
├── question-bank/
│   ├── [id]/route.ts          # GET, PUT, DELETE câu hỏi
│   ├── generate-answer/route.ts # API sinh đáp án AI
│   └── route.ts               # CRUD operations
└── questions/
    ├── [id]/route.ts          # Alternative API
    └── route.ts               # Bulk operations
```

## 🎯 Next Steps (Gợi ý)

- [ ] Thêm export câu hỏi sang Word/PDF
- [ ] Import từ file (Word, Excel, PDF)
- [ ] Preview câu hỏi trong đề thi mẫu
- [ ] Thống kê chất lượng câu hỏi (độ khó thực tế)
- [ ] Gắn thẻ câu hỏi theo chương trình GDPT 2018
- [ ] Chia sẻ câu hỏi giữa các giáo viên
