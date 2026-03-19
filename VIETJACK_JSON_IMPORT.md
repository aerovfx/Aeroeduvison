# VietJack JSON Import Support

## ✅ Fixed: Import từ file JSON với cấu trúc sections

### 📄 Cấu trúc JSON được hỗ trợ:

#### 1. **Multiple Choice Questions** (Trắc nghiệm nhiều phương án)
```json
{
  "type": "multiple_choice",
  "title": "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn",
  "questions": [
    {
      "id": 1,
      "question": "Chọn phát biểu đúng...",
      "options": {
        "A": "Cùng phương, ngược chiều.",
        "B": "Cùng phương, cùng chiều.",
        "C": "Vuông góc với nhau.",
        "D": "Hợp với nhau một góc."
      },
      "answer": "B",
      "explanation": ""
    }
  ]
}
```

#### 2. **True/False Questions** (Trắc nghiệm đúng sai nhiều ý)
```json
{
  "type": "true_false",
  "title": "PHẦN II. Câu trắc nghiệm đúng sai",
  "statements": [
    {
      "label": "a",
      "statement": "Trong các vụ nổ, hệ vật có thể coi như gần đúng là hệ kín.",
      "answer": "Đ"
    },
    {
      "label": "b",
      "statement": "Định luật bảo toàn động lượng chỉ đúng trong trường hợp hệ cô lập.",
      "answer": "Đ"
    },
    {
      "label": "c",
      "statement": "Hai viên bi chuyển động trên mặt phẳng nghiêng được coi là hệ kín.",
      "answer": "S"
    },
    {
      "label": "d",
      "statement": "Động lượng của vật được bảo toàn trong trường hợp vật đang chuyển động tròn đều.",
      "answer": "S"
    }
  ],
  "explanations": {
    "a": "",
    "b": "",
    "c": "Khi vật chuyển động trên mặt phẳng nghiêng...",
    "d": "Trong chuyển động tròn đều..."
  }
}
```

**Import sẽ chuyển thành:**
- `questionType`: "MULTIPLE_TF"
- `correctAnswer`: "ĐĐSS" hoặc "TFTF"
- 4 phương án a/b/c/d với nội dung từng statement

#### 3. **Short Answer Questions** (Trắc nghiệm trả lời ngắn)
```json
{
  "type": "short_answer",
  "title": "PHẦN III. Câu trắc nghiệm trả lời ngắn",
  "question": "Hai vật 1 và 2 chuyển động thẳng đều...",
  "solution": "$p_1 = m_1 v_1 = ...$",
  "answer": "13 kg·m/s"
}
```

## 🔧 Field Mapping

### Content fields:
```
question       → content
statement      → content (for true/false)
question_text  → content
content        → content
```

### Options fields:
```
options: {           // Object format
  "A": "text A",
  "B": "text B",
  "C": "text C",
  "D": "text D"
}

options: [           // Array format
  "text A",
  "text B",
  "text C",
  "text D"
]

A, B, C, D        → options (separate fields)
```

### Answer fields:
```
answer            → correctAnswer
correct_answer    → correctAnswer
solution          → correctAnswer (for short answer)
answers           → correctAnswer (for multiple T/F: "TFTF")
true_false        → correctAnswer (for multiple T/F: "TFTF")
```

### Explanation fields:
```
explanation       → explanation
solution          → explanation (for short answer)
explanations      → explanation (object for T/F statements)
```

## 📋 Your File Structure

### Input JSON:
```json
{
  "title": "Bài tập ôn tập Vật Lí 10 Chương 5",
  "sections": [
    {
      "type": "multiple_choice",
      "questions": [
        {
          "id": 1,
          "question": "Chọn phát biểu đúng...",
          "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
          "answer": "B"
        }
      ]
    },
    {
      "type": "true_false",
      "statements": [
        { "label": "a", "statement": "...", "answer": "Đ" },
        { "label": "b", "statement": "...", "answer": "Đ" },
        { "label": "c", "statement": "...", "answer": "S" },
        { "label": "d", "statement": "...", "answer": "S" }
      ]
    },
    {
      "type": "short_answer",
      "question": "Tính động lượng...",
      "answer": "13 kg·m/s"
    }
  ]
}
```

### Output (Parsed Questions):
```typescript
[
  {
    id: "temp-0",
    content: "Chọn phát biểu đúng...",
    options: ["Cùng phương, ngược chiều.", "Cùng phương, cùng chiều.", ...],
    correctAnswer: "B",
    questionType: "MCQ",
    subject: "Vật lý",
    grade: "Khối 10",
    ...
  },
  {
    id: "temp-1",
    content: "PHẦN II. Câu trắc nghiệm đúng sai\n\na. Statement 1\nb. Statement 2\nc. Statement 3\nd. Statement 4",
    options: ["a. Statement 1", "b. Statement 2", "c. Statement 3", "d. Statement 4"],
    correctAnswer: "ĐĐSS",
    questionType: "MULTIPLE_TF",
    explanation: "{\"a\":\"\",\"b\":\"\",\"c\":\"...\",\"d\":\"...\"}",
    ...
  },
  {
    id: "temp-2",
    content: "Hai vật 1 và 2 chuyển động thẳng đều...",
    correctAnswer: "13 kg·m/s",
    questionType: "SHORT_ANSWER",
    explanation: "$p_1 = m_1 v_1 = ...$",
    ...
  }
]
```

## 🎯 Question Types

### MULTIPLE_TF (Đúng/Sai nhiều ý):
- **Format**: 4 statements (a/b/c/d)
- **Answer**: String like "ĐĐSS" or "TFTF"
- **Display**: Each statement is an option
- **Student task**: Mark each statement as True/False

### MCQ (Nhiều lựa chọn):
- **Format**: Question with 4 options (A/B/C/D)
- **Answer**: Single letter (A/B/C/D)
- **Display**: Standard MCQ format

### SHORT_ANSWER (Trả lời ngắn):
- **Format**: Question with numeric/text answer
- **Answer**: The expected answer
- **Display**: Input field for student

## 🧪 Test with Your File

### Steps:
```
1. Go to /teacher/question-bank
2. Click "Import từ file"
3. Select your j.json file
4. Should parse:
   - 15 multiple choice questions
   - 1 multiple true/false question (4 statements)
   - 1 short answer question
   Total: 17 questions
5. Click "Tiếp tục" to review
6. Edit if needed
7. Click "Import 17 câu hỏi"
8. ✓ Success!
```

## 🔍 Debug Info

### If import fails:
1. Check JSON syntax: `cat j.json | jq .`
2. Ensure UTF-8 encoding
3. Check console for error messages
4. Verify sections array exists

### Common issues:
```
❌ "File JSON không hợp lệ"
→ Ensure 'sections' array exists

❌ "Không tìm thấy câu hỏi hợp lệ"
→ Check 'question' or 'statement' fields

❌ Options not showing
→ Check options format (object vs array)
```

## 📝 Notes

### Multiple True/False Format:
- Statements are labeled a/b/c/d
- Answers are "Đ" (Đúng) or "S" (Sai)
- Converted to "ĐĐSS" or "TFTF" format
- Each statement becomes an option

### Short Answer Format:
- Can have `answer` or `solution` field
- Both are accepted
- `solution` used as explanation

### Multiple Choice Format:
- Options can be object `{A: "...", B: "..."}` or array
- Both formats supported
- Answer is single letter (A/B/C/D)

## 🚀 Enhanced Features

### Now supports:
- ✅ Nested sections structure
- ✅ Multiple choice questions
- ✅ True/False with multiple statements
- ✅ Short answer questions
- ✅ Object format options
- ✅ Array format options
- ✅ Vietnamese answers (Đ/S)
- ✅ English answers (T/F)
- ✅ LaTeX math in content
- ✅ Explanations per statement

### Files Modified:
- `components/question-bank/import-modal.tsx`
  - Enhanced JSON parsing for sections
  - Handle object/array options
  - Support multiple T/F format
  - Better field mapping
