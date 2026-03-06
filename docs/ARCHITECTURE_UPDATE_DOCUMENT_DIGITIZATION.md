# Cập Nhật Kiến Trúc - Document Digitization Module

## 📋 Tổng Quan

File kiến trúc `Aeroreator_architecture_FINAL_NHE.md` đã được cập nhật để bao gồm **Document Digitization Module** như một phần của Core Service.

---

## ✅ Các Cập Nhật Đã Thực Hiện

### **1. Core Service Modules (Dòng 234-282)**

**Đã thêm:**
```typescript
├── Document Digitization Module
│   ├── Document Upload & Management
│   ├── OCR Processing (Gemini Vision)
│   ├── AI Content Analysis
│   ├── Text Restructuring
│   ├── Result File Generation
│   └── Integration with Teaching Materials
```

**Location:** Sau Enrollment Module, trước Calendar Module

---

### **2. API Endpoints (Dòng 284-333)**

**Đã thêm:**
```typescript
# Document Digitization
POST   /api/documents/upload
GET    /api/documents
GET    /api/documents/:id
POST   /api/documents/:id/process
POST   /api/documents/:id/save-result
GET    /api/documents/file/[...path]
POST   /api/documents/fix-status
POST   /api/ai/analyze-document
```

---

### **3. Database Schema (Dòng 1332-1410)**

**Đã thêm:**
- `document_folders` table - Hierarchical folder organization
- `documents` table - Document records với OCR và AI analysis
- `document_processing_logs` table - Processing logs

**Schema Details:**
```sql
-- Document Folders
CREATE TABLE document_folders (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    parent_id UUID,
    user_id UUID,
    path VARCHAR(500),
    ...
)

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    display_name VARCHAR(255),
    type VARCHAR(50),
    ocr_text TEXT,
    digitized_url TEXT,
    status VARCHAR(50),
    metadata JSONB, -- AI analysis, OCR results, etc.
    ...
)

-- Processing Logs
CREATE TABLE document_processing_logs (
    id UUID PRIMARY KEY,
    document_id UUID,
    stage VARCHAR(50),
    message TEXT,
    metadata JSONB,
    ...
)
```

---

### **4. External Services (Dòng 176-190)**

**Đã cập nhật:**
- Thêm **Gemini Vision API** cho OCR
- Thêm **Gemini AI API** cho document analysis
- Tách riêng Document Digitization section

---

### **5. Document Digitization Module Description (Dòng 610-695)**

**Đã thêm section mới:**
```typescript
### 3.4 Document Digitization Module (Core Service)

Architecture: Service Layer with Queue Integration

Components:
  ├── Upload Service
  ├── OCR Service
  ├── AI Analysis Service
  ├── Result Management Service
  └── Queue Worker

Workflow:
  1. Upload Document
  2. OCR Extraction (Gemini Vision)
  3. AI Analysis (Gemini AI)
  4. Save Result File
  5. Update Database

Features:
  - Retry mechanism
  - Redis caching
  - BullMQ queue
  - Structured logging
  - Error recovery
```

---

### **6. Redis Cache Schema (Dòng 2238-2304)**

**Đã thêm cache keys:**
```redis
# Document Digitization Caching
document:result:{documentId} -> JSON (TTL: 1 hour)
document:metadata:{documentId} -> JSON (TTL: 30 minutes)
document:list:{userId}:{status} -> JSON (TTL: 5 minutes)
document:analysis:{documentId} -> JSON (TTL: 24 hours)

# Document Processing Queue
bull:document-processing:{jobId} -> HASH

# API Caching
api:documents:{userId}:{status} -> JSON (TTL: 5 minutes)
api:document:{documentId} -> JSON (TTL: 10 minutes)
```

---

### **7. Cache Invalidation (Dòng 2310-2316)**

**Đã thêm:**
```redis
SUBSCRIBE cache:invalidate:document:{documentId}
```

---

### **8. AI Usage Logs (Dòng 2123)**

**Đã cập nhật operations:**
```javascript
operation: String // generate_content, grade_essay, generate_quiz, 
                  // analyze_document, ocr_extraction
```

---

### **9. Product Roadmap (Dòng 15058-15102)**

**Đã thêm Phase 2.5:**
```markdown
### Phase 2.5: Document Digitization (COMPLETED) ✅

Features Implemented:
- [x] Document upload and management
- [x] OCR processing with Gemini Vision API
- [x] AI content analysis and restructuring
- [x] Result file generation with metadata
- [x] Queue system for background processing
- [x] Redis caching for performance
- [x] Error handling and retry mechanism
- [x] Integration with Teacher Service
```

**Đã cập nhật Phase 2:**
- Thêm Document Digitization vào goals
- Mark as completed

---

### **10. External Services List (Dòng 14977-14982)**

**Đã cập nhật:**
```markdown
### External Services
- OpenAI GPT-4 (AI grading)
- Google AI Gemini (content generation, document analysis)
- Google Gemini Vision API (OCR, image text extraction)
- Stripe (payments)
- SendGrid (email)
```

---

## 📊 Tổng Kết Các Thay Đổi

### **Sections Đã Cập Nhật:**

1. ✅ **Core Service Modules** - Thêm Document Digitization Module
2. ✅ **API Endpoints** - Thêm 8 endpoints cho document digitization
3. ✅ **Database Schema** - Thêm 3 tables (folders, documents, logs)
4. ✅ **External Services** - Thêm Gemini Vision API
5. ✅ **Module Description** - Thêm section 3.4 chi tiết
6. ✅ **Redis Cache Schema** - Thêm 6 cache key patterns
7. ✅ **Cache Invalidation** - Thêm document cache invalidation
8. ✅ **AI Usage Logs** - Thêm operations mới
9. ✅ **Product Roadmap** - Thêm Phase 2.5 completed
10. ✅ **External Services Summary** - Cập nhật danh sách

---

## 🔗 Liên Kết Với Tài Liệu Khác

Các tài liệu liên quan:
- [Document Digitization Architecture](./DOCUMENT_DIGITIZATION_ARCHITECTURE.md)
- [Document Digitization Workflow](./DIGITIZATION_WORKFLOW.md)
- [Document Digitization Architecture Compliance](./DOCUMENT_DIGITIZATION_ARCHITECTURE_COMPLIANCE.md)
- [Teacher Service Integration](./DOCUMENT_DIGITIZATION_TEACHER_SERVICE_INTEGRATION.md)
- [AI Analysis Purpose](./AI_ANALYSIS_PURPOSE.md)

---

## ✅ Compliance

Module Document Digitization đã được tích hợp đầy đủ vào kiến trúc:
- ✅ Core Service (Modular Monolith)
- ✅ Database Schema
- ✅ API Endpoints
- ✅ Caching Strategy
- ✅ Queue System
- ✅ External Services
- ✅ Roadmap

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** ✅ Architecture Updated
