# Trạng Thái Số Hóa Ma Trận - Matrix Digitization Status

## 📋 Tổng Quan

Tài liệu này mô tả tình trạng hiện tại của chức năng **Số hóa ma trận** (Matrix Digitization) trong hệ thống AeroEdu.

---

## ✅ Đã Hoàn Thành

### 1. Frontend Components

#### Exam Matrix Page (`/teacher/exam-matrix`)
- ✅ **Location**: `app/(dashboard)/(routes)/teacher/exam-matrix/page.tsx`
- ✅ **Features**:
  - Danh sách ma trận với tabs trạng thái (Tất cả, Hàng đợi, Đang xử lý, Hoàn tất, Lỗi)
  - Search và filter theo loại đề
  - Nút "Số hoá ma trận" để mở modal
  - Nút "Tạo ma trận" để tạo thủ công
  - Hiển thị status với icons và badges
  - Actions: Xem, Sửa, Xóa

#### Digitize Matrix Modal
- ✅ **Location**: `components/exam-matrix/digitize-modal.tsx`
- ✅ **Features**:
  - Drag & drop file upload
  - File validation (PDF, JPG, PNG, JFIF, max 50MB)
  - File preview cho images
  - Upload progress indicator
  - User-friendly error messages

### 2. API Endpoint

#### POST `/api/exam-matrices/digitize`
- ✅ **Location**: `app/api/exam-matrices/digitize/route.ts`
- ✅ **Features**:
  - Authentication check
  - File validation (type, size)
  - File upload to `uploads/matrices/{userId}/`
  - Create ExamMatrix record với:
    - `type: "Số hoá"`
    - `status: "Hàng đợi"`
    - `originalFileUrl`: URL của file đã upload
  - Return success response

### 3. Database Schema

#### ExamMatrix Model
- ✅ **Location**: `prisma/schema.prisma`
- ✅ **Fields**:
  ```prisma
  model ExamMatrix {
    id              String   @id @default(cuid())
    name            String
    grade           String
    examType        String
    duration        Int?
    totalScore      Float?
    type            String   // "Số hoá" hoặc "Thủ công"
    status          String   // "Hàng đợi", "Đang xử lý", "Hoàn tất", "Lỗi"
    originalFileUrl String?
    userId          String
    // ... other fields
  }
  ```

---

## ⚠️ Chưa Hoàn Thành / Cần Cải Thiện

### 1. OCR Processing

**Vấn đề**: 
- File được upload và lưu vào database
- Nhưng **chưa có xử lý OCR** để trích xuất text từ file
- Status vẫn là "Hàng đợi" và không tự động chuyển sang "Đang xử lý"

**Code hiện tại**:
```typescript
// app/api/exam-matrices/digitize/route.ts
// TODO: Queue OCR/parsing job
// await queueMatrixProcessing(matrix.id)
```

**Cần làm**:
- [ ] Tích hợp OCR processing (Gemini Vision API hoặc PaddleOCR)
- [ ] Trích xuất text từ file ma trận
- [ ] Lưu extracted text vào database

---

### 2. AI Analysis & Parsing

**Vấn đề**:
- Chưa có AI analysis để phân tích cấu trúc ma trận
- Chưa parse text thành các topics, question types, cognitive levels
- Chưa tự động điền vào bảng ma trận

**Cần làm**:
- [ ] Tạo AI prompt để phân tích ma trận:
  - Topics (Chủ đề)
  - Question types (TNKQ: Nhiều lựa chọn, Đúng/Sai, Trả lời ngắn; Tự luận)
  - Cognitive levels (Biết, Hiểu, Vận dụng)
  - Question counts cho mỗi cell
  - Percentage scores
- [ ] Parse kết quả AI thành cấu trúc ma trận
- [ ] Lưu vào `MatrixRow` records

---

### 3. Queue System

**Vấn đề**:
- Chưa có queue system cho matrix processing
- Processing phải chạy đồng bộ (blocking)

**Cần làm**:
- [ ] Tích hợp BullMQ cho matrix processing queue
- [ ] Tạo worker để xử lý background jobs
- [ ] Update status: "Hàng đợi" → "Đang xử lý" → "Hoàn tất"/"Lỗi"

---

### 4. Service Layer

**Vấn đề**:
- Logic xử lý ma trận chưa được tách ra service layer
- Không tái sử dụng được `DocumentProcessService`

**Cần làm**:
- [ ] Tạo `MatrixProcessService` tương tự `DocumentProcessService`
- [ ] Hoặc mở rộng `DocumentProcessService` để support matrix
- [ ] Centralize business logic

---

### 5. Error Handling & Logging

**Vấn đề**:
- Chưa có structured logging cho matrix processing
- Chưa có error recovery mechanism
- Chưa có retry logic

**Cần làm**:
- [ ] Thêm processing logs tương tự `DocumentProcessingLog`
- [ ] Implement retry mechanism
- [ ] Better error messages

---

## 🔄 So Sánh với Document Digitization

| Feature | Document Digitization | Matrix Digitization | Status |
|---------|----------------------|---------------------|--------|
| **Upload** | ✅ Complete | ✅ Complete | ✅ |
| **File Storage** | ✅ Complete | ✅ Complete | ✅ |
| **OCR Extraction** | ✅ Gemini Vision | ❌ Missing | ⚠️ |
| **AI Analysis** | ✅ Complete | ❌ Missing | ⚠️ |
| **Queue System** | ✅ BullMQ | ❌ Missing | ⚠️ |
| **Service Layer** | ✅ DocumentProcessService | ❌ Missing | ⚠️ |
| **Caching** | ✅ Redis | ❌ Missing | ⚠️ |
| **Error Handling** | ✅ Complete | ⚠️ Basic | ⚠️ |
| **Logging** | ✅ Complete | ❌ Missing | ⚠️ |
| **Result File** | ✅ Generated | ❌ Missing | ⚠️ |

---

## 🎯 Kế Hoạch Hoàn Thiện

### Phase 1: OCR Integration (Priority: High)

**Mục tiêu**: Trích xuất text từ file ma trận

**Tasks**:
1. Tạo API endpoint `/api/exam-matrices/[id]/process`
2. Tích hợp Gemini Vision API (reuse từ DocumentProcessService)
3. Lưu extracted text vào `ExamMatrix.metadata.extractedText`
4. Update status: "Hàng đợi" → "Đang xử lý" → "Hoàn tất"

**Estimated Time**: 2-3 hours

---

### Phase 2: AI Analysis & Parsing (Priority: High)

**Mục tiêu**: Phân tích và parse ma trận thành cấu trúc

**Tasks**:
1. Tạo AI prompt chuyên biệt cho ma trận:
   ```typescript
   const prompt = `
   Phân tích ma trận đề thi từ text sau và trả về JSON:
   {
     "topics": [
       {
         "name": "NĂNG LƯỢNG HOÁ HỌC",
         "content": "...",
         "tnkq": {
           "multipleChoice": { "know": 1, "understand": 1, "apply": 0 },
           "trueFalse": { "know": 0, "understand": 0, "apply": 0 },
           "shortAnswer": { "know": 0, "understand": 0, "apply": 0 }
         },
         "essay": { "know": 0, "understand": 0, "apply": 0 },
         "percentage": 10
       }
     ],
     "totalQuestions": 20,
     "totalScore": 10
   }
   `
   ```
2. Parse AI response thành `MatrixRow` records
3. Auto-fill matrix table

**Estimated Time**: 4-6 hours

---

### Phase 3: Queue System (Priority: Medium)

**Mục tiêu**: Background processing với queue

**Tasks**:
1. Tạo queue `matrix-processing`
2. Tạo worker `lib/exam-matrix/worker.ts`
3. Queue job sau khi upload
4. Update status trong real-time

**Estimated Time**: 2-3 hours

---

### Phase 4: Service Layer (Priority: Medium)

**Mục tiêu**: Refactor để có service layer

**Tasks**:
1. Tạo `MatrixProcessService` class
2. Move logic từ API route vào service
3. Add caching, retry, error handling
4. Reuse patterns từ `DocumentProcessService`

**Estimated Time**: 3-4 hours

---

## 📝 Implementation Guide

### Step 1: Create Process API

```typescript
// app/api/exam-matrices/[id]/process/route.ts
import { DocumentProcessService } from "@/lib/document-digitization/process-service"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const matrix = await prisma.examMatrix.findUnique({
    where: { id: params.id }
  })

  if (!matrix || matrix.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Use DocumentProcessService for OCR
  const ocrResult = await DocumentProcessService.performOCR({
    filePath: matrix.originalFileUrl,
    mimeType: "image/jpeg" // Detect from file
  })

  // Update matrix with extracted text
  await prisma.examMatrix.update({
    where: { id: params.id },
    data: {
      status: "Đang xử lý",
      metadata: {
        ...(matrix.metadata as any || {}),
        extractedText: ocrResult.extractedText
      }
    }
  })

  // TODO: AI analysis and parsing
  // TODO: Create MatrixRow records

  return NextResponse.json({ success: true })
}
```

### Step 2: Create AI Analysis

```typescript
// lib/exam-matrix/matrix-analyzer.ts
export class MatrixAnalyzer {
  static async analyzeMatrix(text: string) {
    const prompt = `
    Phân tích ma trận đề thi từ text sau...
    `
    
    // Call Gemini AI
    const result = await callGeminiAI(prompt, text)
    
    // Parse JSON response
    return JSON.parse(result)
  }
}
```

### Step 3: Create Matrix Rows

```typescript
// After AI analysis
const analysis = await MatrixAnalyzer.analyzeMatrix(extractedText)

for (const topic of analysis.topics) {
  await prisma.matrixRow.create({
    data: {
      matrixId: matrix.id,
      topic: topic.name,
      content: topic.content,
      // ... map question counts
      percentage: topic.percentage
    }
  })
}
```

---

## 🔗 Related Files

### Current Implementation
- `app/(dashboard)/(routes)/teacher/exam-matrix/page.tsx` - Main page
- `components/exam-matrix/digitize-modal.tsx` - Upload modal
- `app/api/exam-matrices/digitize/route.ts` - Upload API

### Reference Implementation (Document Digitization)
- `lib/document-digitization/process-service.ts` - Service layer
- `lib/document-digitization/worker.ts` - Queue worker
- `app/api/documents/[id]/process/route.ts` - Process API
- `app/api/ai/analyze-document/route.ts` - AI analysis

### Database
- `prisma/schema.prisma` - ExamMatrix model

---

## ✅ Checklist

### Completed
- [x] Frontend UI (page, modal)
- [x] Upload API endpoint
- [x] File storage
- [x] Database schema

### Pending
- [ ] OCR processing integration
- [ ] AI analysis for matrix structure
- [ ] Matrix parsing and row creation
- [ ] Queue system
- [ ] Service layer
- [ ] Error handling & logging
- [ ] Caching
- [ ] Result file generation

---

## 🚀 Quick Start

Để test chức năng hiện tại:

1. **Navigate to**: `/teacher/exam-matrix`
2. **Click**: "Số hoá ma trận"
3. **Upload**: PDF hoặc image file
4. **Result**: File được upload, matrix record created với status "Hàng đợi"

**Note**: Processing chưa tự động, cần implement Phase 1-4.

---

**Last Updated**: January 2025  
**Status**: ⚠️ Partial Implementation (Upload only, no processing)  
**Priority**: High (needs completion for full functionality)
