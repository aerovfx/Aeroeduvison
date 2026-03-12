# Hướng dẫn Sử dụng Ngân hàng Câu hỏi

## 📍 Truy cập
- URL: `http://localhost:3100/teacher/question-bank`

## 🚀 Các chế độ tạo câu hỏi

### 1. Sinh hàng loạt tự động (Bulk Generate)

**Bước 1:** Click nút "Sinh hàng loạt"

**Bước 2:** Điền thông tin:
- **Môn học**: Toán, Ngữ văn, Tiếng Anh, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý
- **Khối lớp**: Khối 6 - Khối 12
- **Chủ đề kiến thức**: Nhập tên các chủ đề (ví dụ: "Phân số", "Số thập phân")
- **Số câu hỏi**: Số lượng câu cho mỗi chủ đề (tối thiểu 5, tối đa 100)

**Bước 3:** Click "Sinh X câu hỏi vào ngân hàng đề"

**Kết quả:**
- Câu hỏi được **tự động lưu vào database**
- Hiển thị số lượng đã sinh
- Thống kê theo dạng câu hỏi và độ khó
- Redirect sang trang danh sách để xem chi tiết

### 2. Thêm thủ công (Manual Entry)

**Bước 1:** Click "Thêm thủ công" hoặc vào `/teacher/question-bank/add`

**Bước 2:** Điền form:
- Chủ đề
- Môn học
- Khối lớp
- Dạng câu hỏi (Nhiều lựa chọn, Đúng-Sai, Trả lời ngắn, Tự luận)
- Độ khó (Dễ, Trung bình, Khó)
- Nội dung câu hỏi
- Phương án (nếu là trắc nghiệm)
- Đáp án đúng
- Giải thích chi tiết

**Bước 3:** Click "Lưu câu hỏi"

## 💾 Lưu trữ Database

Tất cả câu hỏi được lưu vào bảng `Question` với các trường:

```prisma
model Question {
  id                  String   @id @default(cuid())
  topic               String   // Chủ đề
  subject             String   // Môn học
  grade               String   // Khối lớp
  questionType        String   // MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY
  difficulty          String   // EASY, MEDIUM, HARD
  content             String   // Nội dung
  options             String[] // Phương án (MCQ, TRUE_FALSE)
  correctAnswer       String   // Đáp án đúng
  explanation         String   // Giải thích
  status              String   // Nháp, Đã duyệt, Từ chối
  aiGenerated         Boolean  // true nếu do AI sinh
  humanReviewed       Boolean  // true nếu đã duyệt
  createdBy           String   // ID người tạo
  createdAt           DateTime
  updatedAt           DateTime
}
```

## 📊 Tỉ lệ câu hỏi khi sinh tự động

### Dạng câu hỏi:
- **60%** Nhiều lựa chọn (MCQ)
- **20%** Đúng - Sai (TRUE_FALSE)
- **10%** Trả lời ngắn (SHORT_ANSWER)
- **10%** Tự luận (ESSAY)

### Độ khó:
- **40%** Dễ (Biết)
- **30%** Trung bình (Hiểu)
- **30%** Khó (Vận dụng)

## 🔍 Quản lý câu hỏi

### Xem danh sách
- URL: `/teacher/question-bank/list`
- Filter theo: Môn, Khối, Dạng câu, Trạng thái
- Tìm kiếm theo nội dung

### Bulk Actions
- **Duyệt nhiều câu hỏi**: Chọn các câu → Click "Duyệt"
- **Xóa nhiều câu hỏi**: Chọn các câu → Click "Xóa"

### Xem chi tiết
- Click icon 👁 để xem nội dung đầy đủ
- Xem phương án, đáp án, giải thích

### Chỉnh sửa
- Click icon ✏ để sửa câu hỏi
- Cập nhật nội dung, phương án, đáp án

## 🧪 Kiểm tra việc lưu trữ

### Cách 1: Dùng Prisma Studio
```bash
cd /Users/pixibox/Aeroeduvison
npx prisma studio
```
Xem bảng `Question` để kiểm tra câu hỏi đã lưu.

### Cách 2: Chạy test script
```bash
./scripts/test-question-generation.sh
```

### Cách 3: Query trực tiếp
```sql
-- Đếm số câu hỏi theo môn và dạng
SELECT subject, questionType, COUNT(*) as count
FROM "Question"
GROUP BY subject, questionType
ORDER BY subject, questionType;

-- Xem câu hỏi mới sinh
SELECT id, topic, subject, grade, questionType, content, "createdAt"
FROM "Question"
ORDER BY "createdAt" DESC
LIMIT 10;
```

## ✅ Xác nhận thành công

Sau khi sinh câu hỏi, kiểm tra:

1. **Toast notification**: "Đã sinh X câu hỏi vào ngân hàng đề!"
2. **Kết quả hiển thị**: Card màu xanh với số lượng đã sinh
3. **Redirect tự động**: Sang trang `/teacher/question-bank/list`
4. **Danh sách câu hỏi**: Hiển thị các câu mới sinh với badge "AI"

## 🐛 Xử lý sự cố

### Lỗi: "Không thể sinh câu hỏi"
- Kiểm tra kết nối database
- Kiểm tra log server: `docker logs <container_id>`
- Thử lại với số lượng câu hỏi ít hơn

### Lỗi: "Không tìm thấy câu hỏi trong danh sách"
- Reload trang `/teacher/question-bank/list`
- Kiểm tra filter có đang ẩn câu hỏi không
- Kiểm tra database bằng Prisma Studio

### Lỗi: "Duplicate questions"
- Hệ thống tự động skip câu hỏi trùng
- Xóa câu hỏi cũ và sinh lại

## 📝 Best Practices

1. **Sinh số lượng vừa phải**: 20-50 câu mỗi lần để dễ quản lý
2. **Phân loại rõ ràng**: Đặt tên chủ đề cụ thể
3. **Duyệt trước khi dùng**: Review câu hỏi AI trước khi đưa vào đề thi
4. **Backup định kỳ**: Export câu hỏi quan trọng ra file

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
- Server logs
- Browser console
- Database connection
- API response trong Network tab
