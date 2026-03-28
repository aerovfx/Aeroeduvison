# Ngân hàng Câu hỏi - Import từ Data Directory

## Tổng quan

Hệ thống cho phép import hàng loạt câu hỏi trắc nghiệm từ thư mục `/data` vào ngân hàng đề trong database. Các file JSON trong `/data` được thu thập từ các nguồn như VietJack và được chuyển đổi sang định dạng chuẩn của hệ thống.

## Tính năng

### 1. API Route: `/api/questions/import-from-data`

#### GET - Danh sách file
Lấy danh sách tất cả các file JSON trong thư mục `/data` cùng với thông tin metadata.

**Response:**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "bai-tap-trac-nghiem-dao-dong-dieu-hoa-1.json",
        "subject": "Vật lý",
        "grade": "Khối 12",
        "topic": "Dao Động Điều Hòa 1",
        "questionCount": 15
      }
    ],
    "total": 172,
    "totalQuestions": 2580
  }
}
```

#### POST - Import câu hỏi
Import các file đã chọn vào database.

**Request Body:**
```json
{
  "files": [
    "bai-tap-trac-nghiem-dao-dong-dieu-hoa-1.json",
    "bai-tap-trac-nghiem-song-co-1.json"
  ],
  "batchSize": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "success": 2,
      "failed": 0,
      "skipped": 0,
      "totalQuestions": 30,
      "errors": []
    },
    "message": "Đã import thành công 2 file với 30 câu hỏi"
  }
}
```

### 2. UI Component: `ImportDataModal`

Component React cung cấp giao diện người dùng để chọn và import các file.

**Usage:**
```tsx
import { ImportDataModal } from "@/components/question-bank/import-data-modal"

// In your component
<ImportDataModal onSuccess={(count) => console.log(`Imported ${count} questions`)} />
```

**Features:**
- ✅ Hiển thị danh sách tất cả file JSON với metadata
- ✅ Chọn/chọn tất cả các file để import
- ✅ Hiển thị số lượng câu hỏi trong mỗi file
- ✅ Progress bar trong quá trình import
- ✅ Xử lý lỗi và báo cáo chi tiết

### 3. Script: `scripts/import-data-questions.ts`

Script dòng lệnh để import toàn bộ thư mục `/data`.

**Usage:**
```bash
bun run scripts/import-data-questions.ts
```

**Lưu ý:** Script hiện tại chỉ chạy ở chế độ demo (không thực sự import). Để enable import, bỏ comment dòng `await importQuestions(convertedQuestions)` trong script.

## Định dạng Dữ liệu

### Input Format (VietJack JSON)
```json
{
  "source": "https://vietjack.com/...",
  "title": "30 bài tập trắc nghiệm Dao động điều hòa",
  "content": {
    "questions": [
      {
        "question_number": "Câu 1:",
        "question_text": "Phương trình dao động...",
        "options": [
          { "option": "A", "text": "Biên độ A = -5 cm" },
          { "option": "B", "text": "Pha ban đầu φ = π/6" },
          { "option": "C", "text": "Chu kì T = 0,2 s" },
          { "option": "D", "text": "Li độ ban đầu x0 = 5 cm" }
        ],
        "answer": "Chọn đáp án C",
        "explanation": null
      }
    ]
  }
}
```

### Output Format (Question Bank Schema)
```json
{
  "topic": "Dao Động Điều Hòa 1",
  "subject": "Vật lý",
  "grade": "Khối 12",
  "questionType": "MCQ",
  "difficulty": "MEDIUM",
  "content": "Phương trình dao động của một vật dao động điều hòa là: x = - 5cos(10πt + π/6) cm. Chọn đáp án đúng:",
  "options": ["Biên độ A = -5 cm", "Pha ban đầu φ = π/6 (rad)", "Chu kì T = 0,2 s", "Li độ ban đầu x0= 5 cm"],
  "correctAnswer": "C",
  "explanation": "Không có giải thích chi tiết.",
  "learningObjectives": ["Dao Động Điều Hòa 1"],
  "keywords": ["Dao Động Điều Hòa 1", "Vật lý", "Khối 12"],
  "status": "Đã duyệt",
  "aiGenerated": false,
  "humanReviewed": true,
  "metadata": {
    "source": "bai-tap-trac-nghiem-dao-dong-dieu-hoa-1.json",
    "importedAt": "2025-03-25T10:30:00.000Z"
  }
}
```

## Auto-detection

Hệ thống tự động phát hiện metadata từ tên file:

### Subject Detection
- `vat-li`, `vatly`, `vl` → "Vật lý"
- `toan`, `toán` → "Toán"
- `ngu-van`, `van` → "Ngữ văn"
- `tieng-anh`, `anh`, `english` → "Tiếng Anh"
- `hoa-hoc`, `hoa` → "Hóa học"
- `sinh-hoc`, `sinh` → "Sinh học"
- `lich-su`, `su` → "Lịch sử"
- `dia-ly`, `dia` → "Địa lý"
- Và các môn học khác...

### Grade Detection
- Chứa `12` → "Khối 12"
- Chứa `11` → "Khối 11"
- Chứa `10` → "Khối 10"
- ... (tương tự cho khối 6-9)

### Topic Extraction
- Loại bỏ các prefix: `bai-tap-trac-nghiem-`, `trac-nghiem-`, `chuong-`, etc.
- Chuyển đổi dashes thành spaces
- Capitalize first letter

## Question Type Detection

Hệ thống tự động phân loại câu hỏi:

- **MCQ**: 4 lựa chọn với đáp án A/B/C/D
- **TRUE_FALSE**: 2 lựa chọn Đúng/Sai
- **SHORT_ANSWER**: Không có lựa chọn, yêu cầu trả lời ngắn

## Validation

Mỗi câu hỏi được validate trước khi import:
- ✅ Content length > 10 ký tự
- ✅ Có đáp án đúng hợp lệ (với MCQ/TRUE_FALSE)
- ✅ Số lượng options phù hợp (2-4 cho MCQ)
- ✅ Subject, grade, topic được điền đầy đủ

## Error Handling

### File-level Errors
- File không tồn tại
- JSON không hợp lệ
- Không tìm thấy câu hỏi

### Question-level Errors
- Content quá ngắn
- Thiếu đáp án
- Options không hợp lệ

Các lỗi được ghi nhận trong `summary.errors` và logged qua `apiLogger`.

## Performance

- **Batch Processing**: Xử lý 5 file cùng lúc để tránh timeout
- **Progress Tracking**: Progress bar real-time
- **Error Recovery**: Tiếp tục xử lý các file còn lại nếu có lỗi

## Security

- ✅ Authentication required (NextAuth session)
- ✅ User ID được gán vào `createdBy` field
- ✅ Logging đầy đủ qua `apiLogger`
- ✅ Rate limiting (thông qua Next.js middleware)

## Integration với Quiz Generation

Sau khi import, các câu hỏi có thể được sử dụng ngay cho:
- Tạo đề kiểm tra tự động
- AI Quiz Generation
- Exam Matrix
- Learning Path

## Future Enhancements

- [ ] Support for PDF/Word import
- [ ] Duplicate detection
- [ ] Question quality scoring
- [ ] Batch edit before import
- [ ] Export to various formats (Word, PDF, QTI)
- [ ] Version control for imported questions

## Troubleshooting

### "Không thể đọc danh sách file"
- Kiểm tra thư mục `/data` có tồn tại
- Đảm bảo file có quyền đọc

### "Import thất bại"
- Kiểm tra database connection
- Xem logs chi tiết trong `apiLogger`
- Đảm bảo schema Prisma đã được migrate

### Questions không hiển thị sau import
- Kiểm tra `status` field (phải là "Đã duyệt")
- Verify user permissions
- Clear cache nếu cần

## Contact

Để được hỗ trợ thêm, liên hệ với đội ngũ phát triển hoặc tạo issue trên GitHub.
