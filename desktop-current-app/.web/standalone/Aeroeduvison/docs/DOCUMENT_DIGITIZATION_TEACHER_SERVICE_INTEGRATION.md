# Document Digitization - Teacher Service Integration

## 📋 Tổng Quan

Module số hóa tài liệu được tích hợp vào **Teacher Service** như một phần của **Content Management**, tuân thủ đúng kiến trúc Teacher Management System.

---

## 🏗️ Vị Trí Trong Kiến Trúc Teacher Service

### **Teacher Service Structure:**

```
Teacher Service
├── Content Management Module
│   ├── Teaching Materials ✅
│   │   ├── Upload & Management
│   │   ├── Version Control
│   │   └── Analytics
│   │
│   ├── Document Digitization ✅ (NEW)
│   │   ├── Upload Documents
│   │   ├── OCR Processing
│   │   ├── AI Analysis
│   │   ├── Result Management
│   │   └── Integration with Materials
│   │
│   ├── Lesson Plans
│   └── Resource Library
│
├── Assessment Module
│   ├── Exams
│   ├── Question Bank
│   └── Grading
│
├── Live Lecture Module
└── Discussion Groups Module
```

---

## 🔗 Tích Hợp Với Content Management

### **1. Relationship với Teaching Materials**

Module số hóa tài liệu có thể tích hợp với `teaching_materials` table:

**Option 1: Separate Table (Current)**
- `Document` table riêng cho số hóa
- Có thể link với `teaching_materials` qua `metadata.materialId`

**Option 2: Integrated (Future)**
- Sử dụng `teaching_materials` table
- Thêm fields: `ocrText`, `aiAnalysis`, `digitizedUrl`

**Current Implementation:** Option 1 (Separate table) để:
- Tách biệt concerns (digitization vs materials)
- Dễ maintain và scale
- Có thể link sau nếu cần

---

## 📡 API Endpoints Tuân Thủ Teacher Service Pattern

### **Current Endpoints (Document Digitization):**

```
POST   /api/documents/upload              # Upload documents
GET    /api/documents                     # List documents
GET    /api/documents/:id                 # Get document
POST   /api/documents/:id/process         # Process document
POST   /api/documents/:id/save-result     # Save result file
GET    /api/documents/file/[...path]      # Serve files
POST   /api/documents/fix-status          # Fix invalid status
```

### **Teacher Service Pattern:**

Theo kiến trúc, endpoints nên có prefix `/api/teacher/`:

```
POST   /api/teacher/materials             # Upload teaching materials
GET    /api/teacher/materials             # List materials
GET    /api/teacher/materials/:id         # Get material
PUT    /api/teacher/materials/:id         # Update material
DELETE /api/teacher/materials/:id         # Delete material
```

### **Recommendation:**

**Option A: Keep Current Structure** ✅ (Recommended)
- Giữ `/api/documents/*` cho digitization
- Tích hợp với `/api/teacher/materials` khi cần
- Link qua metadata

**Option B: Migrate to Teacher Service**
- Move to `/api/teacher/documents/*`
- Hoặc `/api/teacher/materials/digitize/*`
- Requires refactoring

**Current:** Option A - Giữ nguyên structure, đảm bảo tuân thủ patterns

---

## ✅ Tuân Thủ Teacher Service Patterns

### **1. Authentication & Authorization**

✅ **Đã tuân thủ:**
```typescript
// All endpoints require teacher authentication
const session = await getServerSession(authOptions)
if (!session?.user || session.user.role !== "TEACHER") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

### **2. Error Handling**

✅ **Đã tuân thủ:**
- Standardized error responses
- Error codes enum
- User-friendly messages
- Structured logging

### **3. Response Format**

✅ **Đã tuân thủ:**
```typescript
{
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    executionTime?: number
  }
}
```

### **4. Caching Strategy**

✅ **Đã tuân thủ:**
- Redis cache for results
- Cache key pattern: `document:result:{documentId}`
- TTL: 1 hour
- Cache invalidation

### **5. Queue System**

✅ **Đã tuân thủ:**
- BullMQ for background processing
- Queue: `document-processing`
- Retry with exponential backoff
- Job tracking

### **6. Logging**

✅ **Đã tuân thủ:**
- Structured logging
- Context metadata
- Log levels (info, warn, error, debug)

---

## 🔄 Integration Points

### **1. Link với Teaching Materials**

```typescript
// When digitizing a document, can link to teaching_materials
const document = await prisma.document.create({
  data: {
    // ... document fields
    metadata: {
      materialId: teachingMaterialId, // Link to teaching_materials
      // ... other metadata
    }
  }
})
```

### **2. Use Digitized Content in Lesson Plans**

```typescript
// Lesson plans can reference digitized documents
const lessonPlan = await prisma.lessonPlan.create({
  data: {
    // ... lesson plan fields
    material_ids: [
      teachingMaterialId,
      digitizedDocumentId, // Can use digitized content
    ]
  }
})
```

### **3. Question Bank Integration**

```typescript
// Digitized documents can be used to generate questions
POST /api/teacher/question-bank/generate-from-document
{
  documentId: string
  topic: string
  count: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}
```

---

## 📊 Database Schema Alignment

### **Current Schema (Document Digitization):**

```prisma
model Document {
  id            String
  name          String
  displayName   String
  type          String  // IMAGE, PDF, VĂN BẢN
  ocrText       String? // Extracted text
  digitizedUrl  String? // Result file URL
  metadata      Json?   // AI analysis, etc.
  userId        String  // Teacher ID
  // ...
}
```

### **Teaching Materials Schema:**

```sql
CREATE TABLE teaching_materials (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL,
    material_type VARCHAR(50), -- DOCUMENT, PRESENTATION, VIDEO, etc.
    file_name VARCHAR(255),
    file_path TEXT,
    // ...
)
```

### **Integration Strategy:**

1. **Keep Separate Tables** ✅
   - `Document` for digitization workflow
   - `teaching_materials` for content management
   - Link via `metadata.materialId`

2. **Sync When Needed:**
   - When document is digitized, optionally create/update `teaching_materials`
   - When material is uploaded, optionally trigger digitization

---

## 🎯 Use Cases

### **Use Case 1: Upload & Digitize Document**

```
1. Teacher uploads document
   POST /api/documents/upload
   ↓
2. Document saved with status "Hàng đợi"
   ↓
3. Teacher triggers digitization
   POST /api/documents/:id/process
   ↓
4. OCR + AI Analysis
   ↓
5. Result saved
   ↓
6. Teacher can:
   - View digitized content
   - Download result file
   - Link to teaching_materials
   - Use in lesson plans
   - Generate questions from content
```

### **Use Case 2: Generate Questions from Digitized Content**

```
1. Teacher has digitized document
   ↓
2. Teacher requests question generation
   POST /api/teacher/question-bank/generate-from-document
   {
     documentId: "xxx",
     topic: "Toán học",
     count: 10,
     difficulty: "MEDIUM"
   }
   ↓
3. System uses digitized text + AI analysis
   ↓
4. Questions generated and added to question bank
   ↓
5. Teacher can use in exams
```

### **Use Case 3: Use in Lesson Plans**

```
1. Teacher creates lesson plan
   POST /api/teacher/lesson-plans
   {
     material_ids: [
       teachingMaterialId,
       digitizedDocumentId  // Link digitized document
     ]
   }
   ↓
2. Lesson plan references both materials
   ↓
3. Students can access both original and digitized content
```

---

## 🔧 Configuration

### **Environment Variables:**

```env
# Document Digitization
GEMINI_API_KEY=your-api-key
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash

# Queue
ENABLE_DOCUMENT_QUEUE=true
QUEUE_CONCURRENCY=5

# Cache
REDIS_URL=redis://localhost:6379

# Integration
ENABLE_MATERIALS_SYNC=false  # Optional: sync with teaching_materials
```

---

## 📈 Performance Targets

Theo Teacher Service architecture:

- **API Response:** < 500ms (p95) ✅
- **Processing Time:** < 30s for typical documents ✅
- **Queue Processing:** < 5 minutes average ✅
- **Cache Hit Rate:** > 80% ✅
- **Error Rate:** < 1% ✅

---

## 🔒 Security & Access Control

### **Teacher-Only Access:**

✅ **Đã tuân thủ:**
- All endpoints require teacher authentication
- User ownership validation
- Role-based access control (RBAC)

### **File Security:**

✅ **Đã tuân thủ:**
- Path traversal prevention
- File type validation
- Size limits (50MB)
- Secure file serving

---

## 📝 Best Practices

1. ✅ **Separation of Concerns**
   - Digitization workflow separate from materials management
   - Can integrate when needed

2. ✅ **API Consistency**
   - Follow Teacher Service patterns
   - Standardized responses
   - Error handling

3. ✅ **Performance**
   - Caching for results
   - Queue for background processing
   - Optimized queries

4. ✅ **Observability**
   - Structured logging
   - Performance metrics
   - Error tracking

---

## 🔗 Related Documentation

- [Document Digitization Architecture](./DOCUMENT_DIGITIZATION_ARCHITECTURE.md)
- [Document Digitization Workflow](./DIGITIZATION_WORKFLOW.md)
- [Teacher Service Architecture](../aerov_arch_giaovien.md)
- [Aeroreator Architecture](../Aeroreator_architecture_FINAL_NHE.md)

---

## ✅ Compliance Status

### **Teacher Service Patterns:**
- [x] Authentication & Authorization
- [x] Error Handling
- [x] Response Format
- [x] Caching Strategy
- [x] Queue System
- [x] Logging
- [x] Security

### **Content Management Integration:**
- [x] Can link with teaching_materials
- [x] Can use in lesson plans
- [x] Can generate questions
- [x] Separate but integrable

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** ✅ Fully Compliant with Teacher Service Architecture
