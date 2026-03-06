# Tạo Đề Thi Từ Ma Trận - Matrix to Exam Generation

## 📋 Tổng Quan

Tài liệu này mô tả chức năng **Tạo đề thi từ ma trận**, tham khảo từ exam.vuonminh.org. Hệ thống sẽ tự động chọn câu hỏi từ ngân hàng câu hỏi theo yêu cầu của ma trận để tạo đề thi.

---

## 🎯 Mục Tiêu

Từ một ma trận đề thi đã hoàn thành, hệ thống sẽ:
1. Phân tích yêu cầu của ma trận (topics, question types, cognitive levels)
2. Tìm câu hỏi phù hợp từ ngân hàng câu hỏi
3. Tạo đề thi với các câu hỏi đã chọn
4. Hiển thị preview và thống kê trước khi tạo

---

## 🏗️ Kiến Trúc

### 1. Service Layer

#### `MatrixExamGenerator` (`lib/exam-matrix/exam-generator.ts`)

**Methods**:

```typescript
// Generate exam from matrix
static async generateExamFromMatrix(
  matrixId: string,
  userId: string,
  options?: {
    title?: string
    description?: string
    allowDuplicates?: boolean
    useAIForMissing?: boolean
  }
): Promise<{
  success: boolean
  examData: ExamData
  selectedQuestions: Question[]
  missingRequirements: Requirement[]
  stats: {
    totalRequired: number
    totalSelected: number
    missing: number
    coverage: number
  }
}>

// Preview exam generation (không tạo exam)
static async previewExamFromMatrix(
  matrixId: string,
  userId: string
): Promise<PreviewData>
```

**Logic**:
1. Fetch matrix với topics và distributions
2. Collect requirements từ matrix
3. Find matching questions từ question bank
4. Calculate statistics và coverage
5. Return exam data và selected questions

---

### 2. API Endpoints

#### POST `/api/exams/generate-from-matrix`

**Request**:
```json
{
  "matrixId": "string",
  "title": "string (optional)",
  "description": "string (optional)",
  "allowDuplicates": "boolean (optional)",
  "useAIForMissing": "boolean (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "examData": {
      "title": "string",
      "description": "string",
      "examType": "string",
      "duration": 45,
      "totalScore": 10,
      "totalQuestions": 20,
      "status": "Nháp",
      "matrixId": "string"
    },
    "selectedQuestions": [...],
    "missingRequirements": [...],
    "stats": {
      "totalRequired": 20,
      "totalSelected": 18,
      "missing": 2,
      "coverage": 0.9
    },
    "message": "string",
    "requiresManualCreation": true
  }
}
```

#### GET `/api/exams/generate-from-matrix?matrixId=xxx`

**Response**: Preview data với requirements status

---

### 3. UI Components

#### `GenerateExamModal` (`components/exam-matrix/generate-exam-modal.tsx`)

**Features**:
- Preview requirements và availability
- Show coverage statistics
- Display requirement status (sufficient/insufficient/missing)
- Input exam title và description
- Generate exam button

**Usage**:
```tsx
<GenerateExamModal
  isOpen={isOpen}
  onClose={onClose}
  matrixId={matrixId}
  matrixName={matrixName}
/>
```

---

## 🔄 Workflow

### Step 1: User Clicks "Tạo đề thi từ ma trận"

1. User ở trang `/teacher/exam-matrix`
2. Click button "Tạo đề thi" (icon FileText) trên ma trận đã hoàn thành
3. Modal `GenerateExamModal` mở ra

### Step 2: Preview Requirements

1. Modal tự động load preview bằng `GET /api/exams/generate-from-matrix?matrixId=xxx`
2. Hiển thị:
   - Summary: Total required, available, coverage
   - Requirements list với status
   - Warning nếu không đủ câu hỏi

### Step 3: User Configures Exam

1. User nhập tên đề thi
2. User nhập mô tả (optional)
3. Review requirements và statistics

### Step 4: Generate Exam

1. User click "Tạo đề thi"
2. Call `POST /api/exams/generate-from-matrix`
3. System:
   - Finds matching questions từ question bank
   - Returns exam data và selected questions
   - Stores in sessionStorage
4. Navigate to exam creation page với selected questions

---

## 🔍 Question Matching Logic

### Mapping Rules

**Question Type Mapping**:
```typescript
"TNKQ_Nhiều_lựa_chọn" → "MCQ"
"TNKQ_Đúng_Sai" → "TRUE_FALSE"
"TNKQ_Trả_lời_ngắn" → "SHORT_ANSWER"
"Tự_luận" → "ESSAY"
```

**Cognitive Level to Difficulty Mapping**:
```typescript
"Biết" → "EASY"
"Hiểu" → "MEDIUM"
"Vận dụng" → "HARD"
```

### Search Criteria

For each requirement:
```typescript
{
  status: "Đã duyệt", // Only approved questions
  questionType: "MCQ", // Mapped from matrix
  difficulty: "EASY", // Mapped from cognitive level
  grade: "Khối 9", // From matrix
  topic: { contains: "NĂNG LƯỢNG HOÁ HỌC" }, // From matrix topic
  // OR
  keywords: { hasSome: ["NĂNG LƯỢNG", "HOÁ HỌC"] },
  // OR
  content: { contains: "NĂNG LƯỢNG HOÁ HỌC" }
}
```

### Selection Priority

1. **Quality Score** (desc) - Ưu tiên câu hỏi chất lượng cao
2. **Usage Count** (asc) - Ưu tiên câu hỏi ít dùng
3. **Random** - Random trong các câu hỏi phù hợp

---

## 📊 Preview Data Structure

```typescript
interface PreviewData {
  matrix: {
    id: string
    name: string
    grade: string
    examType: string
    totalQuestions: number
    totalScore: number
  }
  requirements: Array<{
    topic: string
    questionType: string
    cognitiveLevel: string
    required: number
    available: number
    status: "sufficient" | "insufficient" | "missing"
  }>
  summary: {
    totalRequired: number
    totalAvailable: number
    coverage: number // 0-1
    canGenerate: boolean // coverage >= 0.8
  }
}
```

---

## ⚠️ Edge Cases

### 1. Không đủ câu hỏi

**Scenario**: Requirement cần 5 câu nhưng chỉ có 3 câu phù hợp

**Handling**:
- Status: "insufficient"
- Select tất cả 3 câu có sẵn
- Add to `missingRequirements`
- Show warning trong UI

### 2. Không có câu hỏi nào

**Scenario**: Requirement không có câu hỏi phù hợp

**Handling**:
- Status: "missing"
- Add to `missingRequirements`
- Show error trong UI
- Option: Use AI to generate (if `useAIForMissing: true`)

### 3. Coverage < 80%

**Scenario**: Tổng coverage < 80%

**Handling**:
- `canGenerate: false`
- Show warning
- User vẫn có thể tạo nhưng sẽ thiếu câu hỏi

---

## 🚀 Future Enhancements

### 1. AI Question Generation

Nếu thiếu câu hỏi, tự động generate bằng AI:
```typescript
if (useAIForMissing && missingRequirements.length > 0) {
  // Call AI service to generate questions
  const aiQuestions = await generateQuestionsWithAI(missingRequirements)
  selectedQuestions.push(...aiQuestions)
}
```

### 2. Smart Question Selection

- Avoid duplicate questions trong cùng exam
- Balance difficulty distribution
- Ensure topic coverage

### 3. Question Replacement

- Allow user to replace selected questions
- Show alternatives
- Manual override

### 4. Exam Templates

- Save exam generation settings
- Reuse for similar matrices
- Batch generation

---

## 📝 Usage Example

### From Matrix Page

```tsx
// User clicks "Tạo đề thi" button
<Button
  onClick={() => {
    setSelectedMatrixForExam({ id: matrix.id, name: matrix.name })
    setIsGenerateExamModalOpen(true)
  }}
>
  <FileText /> Tạo đề thi
</Button>

// Modal opens and shows preview
<GenerateExamModal
  isOpen={isGenerateExamModalOpen}
  onClose={() => setIsGenerateExamModalOpen(false)}
  matrixId={selectedMatrixForExam.id}
  matrixName={selectedMatrixForExam.name}
/>
```

### API Call

```typescript
// Preview
const preview = await fetch(
  `/api/exams/generate-from-matrix?matrixId=${matrixId}`
)

// Generate
const result = await fetch("/api/exams/generate-from-matrix", {
  method: "POST",
  body: JSON.stringify({
    matrixId,
    title: "Đề thi Toán 9 - Kiểm tra 1 tiết",
    description: "Tạo từ ma trận",
  }),
})
```

---

## ✅ Checklist

### Completed
- [x] MatrixExamGenerator service
- [x] Preview API endpoint
- [x] Generate API endpoint
- [x] GenerateExamModal component
- [x] Integration với matrix page
- [x] Question matching logic
- [x] Status indicators

### Pending
- [ ] Exam model creation (if Exam model exists)
- [ ] AI question generation for missing
- [ ] Question replacement UI
- [ ] Exam creation page integration
- [ ] Duplicate detection
- [ ] Batch generation

---

## 🔗 Related Files

- `lib/exam-matrix/exam-generator.ts` - Service
- `app/api/exams/generate-from-matrix/route.ts` - API
- `components/exam-matrix/generate-exam-modal.tsx` - UI
- `app/(dashboard)/(routes)/teacher/exam-matrix/page.tsx` - Integration

---

**Last Updated**: January 2025  
**Status**: ✅ Core Implementation Complete  
**Reference**: exam.vuonminh.org/matrix?importId=132
