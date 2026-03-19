# Import Câu Hỏi Từ File JSON

## ✅ Đã thêm hỗ trợ JSON

### Định dạng file hỗ trợ:
- ✅ **Excel** (.xlsx, .xls)
- ✅ **CSV** (.csv)
- ✅ **JSON** (.json) ← MỚI!
- ✅ **Word** (.docx, .doc)

## 📄 Cấu trúc file JSON

### Format 1: Array of Questions (Đơn giản)
```json
[
  {
    "content": "Nội dung câu hỏi 1?",
    "options": ["A. Phương án A", "B. Phương án B", "C. Phương án C", "D. Phương án D"],
    "correctAnswer": "A",
    "explanation": "Giải thích chi tiết",
    "subject": "Vật lý",
    "grade": "Khối 10",
    "topic": "Động học",
    "difficulty": "Dễ"
  },
  {
    "content": "Nội dung câu hỏi 2?",
    "options": ["A. Phương án A", "B. Phương án B", "C. Phương án C", "D. Phương án D"],
    "correctAnswer": "B",
    "subject": "Toán học",
    "grade": "Khối 11",
    "topic": "Đại số",
    "difficulty": "Trung bình"
  }
]
```

### Format 2: Object with Questions Array (Khuyến nghị)
```json
{
  "questions": [
    {
      "content": "Nội dung câu hỏi 1?",
      "options": ["A. Phương án A", "B. Phương án B", "C. Phương án C", "D. Phương án D"],
      "correctAnswer": "A",
      "explanation": "Giải thích chi tiết",
      "subject": "Vật lý",
      "grade": "Khối 10",
      "topic": "Động học",
      "difficulty": "Dễ"
    }
  ],
  "metadata": {
    "subject": "Vật lý",
    "grade": "Khối 10",
    "semester": "Học kì 1"
  }
}
```

### Format 3: Object with Data Array
```json
{
  "data": [
    {
      "content": "Nội dung câu hỏi?",
      "options": ["A. Phương án A", "B. Phương án B", "C. Phương án C", "D. Phương án D"],
      "correctAnswer": "A",
      "explanation": "Giải thích",
      "subject": "Vật lý",
      "grade": "Khối 10"
    }
  ]
}
```

## 📋 Các trường dữ liệu

### Bắt buộc (Required):
- ✅ `content` - Nội dung câu hỏi
- ✅ `correctAnswer` - Đáp án đúng (A/B/C/D)

### Tùy chọn (Optional):
- ⭕ `options` - Phương án trả lời (array)
- ⭕ `explanation` - Giải thích chi tiết
- ⭕ `subject` - Môn học
- ⭕ `grade` - Khối lớp
- ⭕ `topic` - Chủ đề
- ⭕ `difficulty` - Độ khó
- ⭕ `questionType` - Loại câu hỏi

## 🎯 Mapping Fields

### Trường JSON → Hệ thống:

```typescript
{
  "content"           → content (nội dung)
  "question"          → content (alias)
  "nội_dung"          → content (alias)
  "câu_hỏi"           → content (alias)
  
  "options"           → options (phương án)
  "phương_án"         → options (alias)
  "A", "B", "C", "D"  → options (tách riêng)
  
  "correctAnswer"     → correctAnswer (đáp án)
  "đáp_án"            → correctAnswer (alias)
  "answer"            → correctAnswer (alias)
  
  "explanation"       → explanation (giải thích)
  "giải_thích"        → explanation (alias)
  
  "subject"           → subject (môn học)
  "môn"               → subject (alias)
  
  "grade"             → grade (khối lớp)
  "khối"              → grade (alias)
  
  "topic"             → topic (chủ đề)
  "chủ_đề"            → topic (alias)
  
  "difficulty"        → difficulty (độ khó)
  "độ_khó"            → difficulty (alias)
}
```

## 📝 Ví dụ chi tiết

### Vật lý 10 - Động học:
```json
{
  "questions": [
    {
      "content": "Đơn vị của vận tốc là gì?",
      "options": ["m/s", "m/s²", "m", "s"],
      "correctAnswer": "A",
      "explanation": "Vận tốc là quãng đường đi được trong một đơn vị thời gian, đơn vị là m/s",
      "subject": "Vật lý",
      "grade": "Khối 10",
      "topic": "Động học",
      "difficulty": "Dễ",
      "questionType": "MCQ"
    },
    {
      "content": "Gia tốc là đại lượng:",
      "options": ["Vô hướng", "Vectơ", "Cả hai", "Không có"],
      "correctAnswer": "B",
      "explanation": "Gia tốc có hướng và độ lớn nên là đại lượng vectơ",
      "subject": "Vật lý",
      "grade": "Khối 10",
      "topic": "Động học",
      "difficulty": "Trung bình",
      "questionType": "MCQ"
    },
    {
      "content": "Công thức tính vận tốc:",
      "options": ["v = s/t", "v = t/s", "v = s.t", "v = s+t"],
      "correctAnswer": "A",
      "explanation": "Vận tốc bằng quãng đường chia thời gian: v = s/t",
      "subject": "Vật lý",
      "grade": "Khối 10",
      "topic": "Động học",
      "difficulty": "Dễ",
      "questionType": "MCQ"
    }
  ]
}
```

### Toán 10 - Đại số:
```json
{
  "questions": [
    {
      "content": "Tập nghiệm của phương trình x² - 4 = 0 là:",
      "options": ["{-2, 2}", {-2}, {2}, "∅"],
      "correctAnswer": "A",
      "explanation": "x² - 4 = 0 ⇔ x² = 4 ⇔ x = ±2",
      "subject": "Toán học",
      "grade": "Khối 10",
      "topic": "Phương trình",
      "difficulty": "Trung bình",
      "questionType": "MCQ"
    },
    {
      "content": "Hàm số nào đồng biến trên R?",
      "options": ["y = x²", "y = -x²", "y = x³", "y = -x³"],
      "correctAnswer": "C",
      "explanation": "Hàm số y = x³ có đạo hàm y' = 3x² > 0 ∀x ≠ 0 nên đồng biến trên R",
      "subject": "Toán học",
      "grade": "Khối 10",
      "topic": "Hàm số",
      "difficulty": "Khó",
      "questionType": "MCQ"
    }
  ]
}
```

### Hóa học 10:
```json
{
  "questions": [
    {
      "content": "Nguyên tử khối của Oxy là:",
      "options": ["16", "17", "18", "15"],
      "correctAnswer": "A",
      "explanation": "Oxy có nguyên tử khối là 16 (8 proton + 8 neutron)",
      "subject": "Hóa học",
      "grade": "Khối 10",
      "topic": "Nguyên tử",
      "difficulty": "Dễ",
      "questionType": "MCQ"
    },
    {
      "content": "Nước có công thức hóa học là:",
      "options": ["H2O", "CO2", "O2", "H2"],
      "correctAnswer": "A",
      "explanation": "Nước có công thức hóa học là H2O (2 nguyên tử Hydro và 1 nguyên tử Oxy)",
      "subject": "Hóa học",
      "grade": "Khối 10",
      "topic": "Hóa vô cơ",
      "difficulty": "Dễ",
      "questionType": "MCQ"
    }
  ]
}
```

## 🔧 Cách sử dụng

### Bước 1: Chuẩn bị file JSON
1. Tạo file JSON với cấu trúc như trên
2. Điền nội dung câu hỏi
3. Lưu file với encoding UTF-8

### Bước 2: Import vào hệ thống
```
1. Vào /teacher/question-bank
2. Click "Import từ file"
3. Chọn file JSON
4. Click "Tiếp tục"
5. Review & Edit (nếu cần)
6. Click "Import X câu hỏi"
7. ✓ Hoàn tất!
```

## 💡 Tips

### Tạo file JSON nhanh:
1. **Dùng template**: Tải `question-import-sample.json` từ `/templates/`
2. **Copy-paste**: Copy cấu trúc và điền nội dung
3. **Validate JSON**: Dùng https://jsonlint.com/ để kiểm tra
4. **UTF-8 encoding**: Đảm bảo lưu file với encoding UTF-8 để không lỗi font tiếng Việt

### Best practices:
- ✅ Dùng field names tiếng Anh (`content`, `options`, `correctAnswer`)
- ✅ Thêm `explanation` để học sinh hiểu khi ôn tập
- ✅ Điền đầy đủ `subject`, `grade`, `topic` để dễ filter
- ✅ Set `difficulty` phù hợp (Dễ/Trung bình/Khó)
- ✅ Dùng `questionType`: "MCQ" cho trắc nghiệm, "TRUE_FALSE" cho đúng/sai

## 🎯 Advantages of JSON

### So với Excel/CSV:
- ✅ **Có cấu trúc rõ ràng**: Dễ đọc, dễ hiểu
- ✅ **Hỗ trợ nested data**: Options là array
- ✅ **Type safety**: String, number, boolean
- ✅ **Comments**: Có thể thêm comments (trong JSON5)
- ✅ **Version control**: Git diff dễ đọc
- ✅ **Programmatic**: Dễ generate bằng code

### Use cases:
- 📝 **Export từ hệ thống khác**
- 📝 **Generate câu hỏi bằng AI**
- 📝 **Backup/Restore ngân hàng câu hỏi**
- 📝 **Chia sẻ giữa các giáo viên**
- 📝 **Import hàng loạt từ data có sẵn**

## 📁 Sample Files

### Download templates:
- **Basic**: `/public/templates/question-import-sample.json`
- **Physics**: Vật lý 10 - Động học
- **Math**: Toán 10 - Đại số
- **Chemistry**: Hóa học 10 - Nguyên tử

## 🔍 Validation

### System tự động:
- ✅ Check valid JSON format
- ✅ Check required fields (`content`, `correctAnswer`)
- ✅ Check `correctAnswer` is A/B/C/D
- ✅ Filter questions with content > 10 chars
- ✅ Auto-detect `questionType` từ số lượng options

### Manual review:
- ✅ Review trước khi import
- ✅ Edit từng câu hỏi
- ✅ Chọn/bỏ chọn câu hỏi
- ✅ Xóa câu hỏi không cần

## 🐛 Troubleshooting

### Lỗi: "File JSON không hợp lệ"
```
❌ Thiếu dấu ngoặc đóng
❌ Thiếu dấu phẩy giữa các object
❌ Dùng single quotes thay vì double quotes

✅ Solution: Validate trên https://jsonlint.com/
```

### Lỗi: "Không thể đọc file"
```
❌ File encoding không phải UTF-8
❌ File bị corrupt

✅ Solution: Lưu lại file với UTF-8 encoding
```

### Lỗi: "Không tìm thấy câu hỏi hợp lệ"
```
❌ Thiếu field `content` hoặc `correctAnswer`
❌ Content quá ngắn (< 10 chars)

✅ Solution: Thêm đầy đủ fields, kiểm tra content
```

## 📊 Example Flow

### Input JSON:
```json
{
  "questions": [
    {
      "content": "2 + 2 = ?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": "B"
    }
  ]
}
```

### After parsing:
```typescript
ParsedQuestion {
  id: "temp-0",
  content: "2 + 2 = ?",
  options: ["3", "4", "5", "6"],
  correctAnswer: "B",
  subject: "Toán học", // default
  grade: "Khối 10",    // default
  topic: "Toán học",
  difficulty: "MEDIUM",
  questionType: "MCQ",
  selected: true,
  editMode: false
}
```

### After review & edit:
```typescript
ParsedQuestion {
  id: "temp-0",
  content: "Tính: 2 + 2 = ?", // edited
  options: ["3", "4", "5", "6"],
  correctAnswer: "B",
  subject: "Toán học",
  grade: "Khối 10",
  topic: "Đại số", // edited
  difficulty: "EASY", // edited
  questionType: "MCQ",
  explanation: "2 cộng 2 bằng 4", // added
  selected: true,
  editMode: false
}
```

### After import:
```
✓ Đã import 1 câu hỏi thành công
→ Redirect to /teacher/question-bank/list
→ Show success toast
```

## 🚀 Next Steps

- [ ] Support JSON5 (comments, trailing commas)
- [ ] Support YAML format
- [ ] Export to JSON
- [ ] Batch export/import
- [ ] Diff view (compare with existing)
- [ ] Merge strategies (skip/update/merge)
