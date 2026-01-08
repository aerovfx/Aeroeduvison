# Question Bank Setup Guide

## Tổng Quan

Đã tạo Question model trong Prisma schema và cập nhật API routes để hỗ trợ Question Bank Management System.

## Bước 1: Tạo Question Model trong Database

Chạy các lệnh sau để sync schema với database:

```bash
# Generate Prisma client với model mới
npx prisma generate

# Push schema vào database (tạo bảng Question)
npx prisma db push
```

Hoặc sử dụng migration (khuyến nghị cho production):

```bash
npx prisma migrate dev --name add_question_model
```

## Bước 2: Kiểm Tra

Sau khi chạy migration, kiểm tra:

1. **Prisma Client đã được generate:**
   ```bash
   # Kiểm tra xem prisma.question có tồn tại không
   node -e "const { db } = require('./lib/db.ts'); console.log(db.question ? 'OK' : 'MISSING')"
   ```

2. **Database đã có bảng Question:**
   - Kết nối database và kiểm tra bảng `Question` đã được tạo

3. **API hoạt động:**
   - Vào `/teacher/question-bank`
   - Thử tạo câu hỏi mới
   - Thử tìm kiếm và filter

## Cấu Trúc Question Model

### Fields Chính

- **Basic Info**: `topic`, `subject`, `grade`, `questionType`, `difficulty`, `content`
- **Answers**: `options` (array), `correctAnswer`, `explanation`
- **Metadata**: `learningObjectives`, `keywords`, `tags`
- **Quality**: `qualityScore`, `discriminationIndex`
- **Usage**: `usageCount`, `averageScore`, `averageTimeSeconds`
- **Status**: `status` ("Nháp", "Chờ duyệt", "Đã duyệt", "Từ chối")
- **AI**: `aiGenerated`, `aiModel`, `humanReviewed`, `reviewedBy`

### Indexes

- Full-text search trên `content` và `explanation`
- Indexes trên: `subject`, `grade`, `questionType`, `difficulty`, `status`, `createdBy`, `qualityScore`, `usageCount`

## API Endpoints

### GET /api/question-bank
- List questions với filters
- Query params: `status`, `type`, `search`, `subject`, `grade`, `difficulty`, `limit`, `offset`

### POST /api/question-bank
- Tạo câu hỏi mới
- Body: `content`, `type`, `subject`, `grade`, `difficulty`, `options`, `correctAnswer`, `explanation`, etc.

### GET /api/question-bank/[id]
- Lấy chi tiết một câu hỏi

### DELETE /api/question-bank/[id]
- Xóa câu hỏi (chỉ creator hoặc admin/teacher)

## Lưu Ý

1. **Redis**: QuestionBankManager sử dụng Redis cho caching, nhưng API routes có fallback về Prisma trực tiếp nếu Redis không available.

2. **Status Mapping**:
   - UI: "Tất cả", "Đã duyệt", "Chờ duyệt", "Nháp"
   - Database: "Nháp", "Chờ duyệt", "Đã duyệt", "Từ chối"

3. **Type Mapping**:
   - UI: "TNKQ - Nhiều lựa chọn", "TNKQ - Đúng/Sai", "TNKQ - Trả lời ngắn", "Tự luận"
   - Database: "MCQ", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"

4. **Difficulty Mapping**:
   - UI: "Dễ", "Trung bình", "Khó"
   - Database: "EASY", "MEDIUM", "HARD"

## Troubleshooting

### Lỗi: "Cannot read properties of undefined (reading 'findMany')"
- **Nguyên nhân**: Prisma client chưa được generate
- **Giải pháp**: Chạy `npx prisma generate`

### Lỗi: "Table 'Question' does not exist"
- **Nguyên nhân**: Schema chưa được push vào database
- **Giải pháp**: Chạy `npx prisma db push` hoặc `npx prisma migrate dev`

### Lỗi: "Redis connection failed"
- **Nguyên nhân**: Redis không available
- **Giải pháp**: API routes có fallback về Prisma trực tiếp, không cần Redis để hoạt động cơ bản

## Next Steps

Sau khi setup xong:
1. Tạo câu hỏi thủ công qua UI
2. Import câu hỏi từ AI-generated quizzes
3. Sử dụng Question Bank trong Exam Matrix và Exam creation
