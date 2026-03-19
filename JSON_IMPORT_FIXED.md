# JSON Import Support - Updated

## ✅ Fixed: Support for VietJack and other formats

### Your JSON structure now works:
```json
{
  "quiz_info": {
    "title": "Động lượng - Vật Lí 10",
    "subject": "Vật Lí",
    "grade": 10,
    ...
  },
  "questions": [
    {
      "question_number": 1,
      "question_text": "Phát biểu nào sau đây không đúng về động lượng?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct_answer": "C",
      "explanation": "...",
      "points": 10
    }
  ]
}
```

## 🔧 Field Mapping

### Content fields (auto-detected):
```
question_text → content
questionText → content
content → content
question → content
nội_dung → content
câu_hỏi → content
```

### Options fields:
```
options → options (array)
A, B, C, D → options (separate fields)
```

### Answer fields:
```
correct_answer → correctAnswer
correctAnswer → correctAnswer
answer → correctAnswer
đáp_án → correctAnswer
```

### Explanation fields:
```
explanation → explanation
explanationText → explanation
giải_thích → explanation
```

### Subject/Grade fields:
```
subject → subject (auto-mapped)
grade → grade (auto-mapped)
topic → topic
difficulty → difficulty (auto-mapped)
```

## 📋 Supported JSON Structures

### 1. Direct Array
```json
[
  { "question_text": "...", "options": [...], "correct_answer": "A" },
  { "question_text": "...", "options": [...], "correct_answer": "B" }
]
```

### 2. Object with Questions Array
```json
{
  "questions": [
    { "question_text": "...", "options": [...], "correct_answer": "A" }
  ]
}
```

### 3. Object with Data Array
```json
{
  "data": [
    { "question_text": "...", "options": [...], "correct_answer": "A" }
  ]
}
```

### 4. VietJack Format (quiz_info + questions)
```json
{
  "quiz_info": {
    "title": "...",
    "subject": "..."
  },
  "questions": [
    {
      "question_number": 1,
      "question_text": "...",
      "options": [...],
      "correct_answer": "A",
      "explanation": "..."
    }
  ]
}
```

## 🎯 What gets imported

From your JSON file, the system will extract:

```typescript
ParsedQuestion {
  content: "Phát biểu nào sau đây không đúng về động lượng?",
  options: [
    "A. Động lượng là tích của khối lượng với vận tốc của vật",
    "B. Động lượng là đại lượng véctơ",
    "C. Đơn vị của động lượng là kg.m/s và năng lượng là J",
    "D. Động lượng của vật phụ thuộc vào hệ quy chiếu"
  ],
  correctAnswer: "C",
  explanation: "Đơn vị của động lượng là kg.m/s. Đơn vị của năng lượng là J...",
  subject: "Vật lý", // auto-mapped from quiz_info.subject
  grade: "Khối 10",  // auto-mapped from quiz_info.grade
  topic: "Động lượng", // extracted from quiz_info.title
  difficulty: "MEDIUM", // default
  questionType: "MCQ", // auto-detected
  selected: true,
  editMode: false
}
```

## 🧪 Test with your file

### Steps:
1. Go to `/teacher/question-bank`
2. Click "Import từ file"
3. Select your `j.json` file
4. System will parse and show 10 questions
5. Review & Edit if needed
6. Click "Import 10 câu hỏi"
7. ✓ Success!

### Expected result:
```
✓ Đã đọc 10 câu hỏi từ file JSON
✓ Đã import 10 câu hỏi thành công
```

## 🔍 Debug Info

If it still doesn't work, check:

### 1. JSON Validity:
```bash
# Validate JSON syntax
cat j.json | jq .
```

### 2. File Encoding:
- Must be UTF-8
- No BOM (Byte Order Mark)

### 3. Console Logs:
- Open browser DevTools (F12)
- Check console for error messages
- Look for "Error parsing file" message

### 4. Common Issues:

**Issue: "File JSON không hợp lệ"**
```
❌ No 'questions' or 'data' array
❌ Array is empty
❌ JSON syntax error

✅ Solution: Ensure questions array exists and is not empty
```

**Issue: "Không tìm thấy câu hỏi hợp lệ"**
```
❌ All questions have content < 10 chars
❌ Field names not recognized

✅ Solution: Use supported field names (question_text, content, etc.)
```

## 📝 Updated Field Names Support

### Now supports:
- ✅ `question_text` (VietJack)
- ✅ `questionText` (camelCase)
- ✅ `correct_answer` (snake_case)
- ✅ `correctAnswer` (camelCase)
- ✅ `explanationText` 
- ✅ `difficultyLevel`
- ✅ All Vietnamese field names (nội_dung, câu_hỏi, etc.)

## 🚀 Enhanced Detection

### Smart structure detection:
1. Check if direct array
2. Check `questions` field
3. Check `data` field
4. Check `quiz_info.questions` (VietJack)
5. Find first array in object

### Smart field mapping:
- Multiple field name variants
- Auto-mapping for subject/grade
- Default values for missing fields
- Vietnamese field name support

## 📁 Files Modified

```
components/question-bank/
└── import-modal.tsx
    ├── parseFile() - Enhanced JSON structure detection
    └── convertToParsedQuestions() - Enhanced field mapping
```

## 🎯 Your File Structure

Your `j.json` file will now be parsed correctly because:

1. ✅ Has `questions` array with 10 items
2. ✅ Each question has `question_text` → mapped to `content`
3. ✅ Each question has `options` array → mapped directly
4. ✅ Each question has `correct_answer` → mapped to `correctAnswer`
5. ✅ Each question has `explanation` → mapped directly
6. ✅ Has `quiz_info` with subject/grade info → used for defaults

## 💡 Tips for Your File

### Your file is good because:
- ✅ Clear structure with quiz_info
- ✅ All questions have required fields
- ✅ Options are properly formatted (A., B., C., D.)
- ✅ Explanations are included
- ✅ Valid JSON syntax

### No changes needed! Your file should work as-is.
