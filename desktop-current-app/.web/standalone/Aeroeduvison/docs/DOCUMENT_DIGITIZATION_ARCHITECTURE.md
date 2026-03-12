# Kiến Trúc Module Số Hóa Tài Liệu - Document Digitization Architecture

## 📋 Tổng Quan

Module số hóa tài liệu đã được hoàn thiện theo kiến trúc hệ thống AeroEdu, tuân thủ các patterns và standards đã thiết lập.

---

## 🏗️ Kiến Trúc Module

### **1. Service Layer**

#### `DocumentProcessService` (`lib/document-digitization/process-service.ts`)

Service chính xử lý toàn bộ quy trình số hóa:

**Tính năng:**
- ✅ Retry mechanism với exponential backoff
- ✅ Error handling và recovery
- ✅ Caching với Redis (TTL: 1 hour)
- ✅ Queue integration (BullMQ)
- ✅ Structured logging
- ✅ File path resolution
- ✅ Result file generation

**Methods:**
```typescript
processDocument(options: ProcessDocumentOptions): Promise<ProcessResult>
  - Main entry point
  - Checks cache first
  - Queues or processes immediately
  - Returns standardized result

executeProcessing(options): Promise<ProcessResult>
  - Step 1: OCR extraction
  - Step 2: AI analysis
  - Step 3: Save result file
  - Step 4: Update database

performOCR(document): Promise<{extractedText, metadata}>
  - Uses Gemini Vision API
  - Retry with exponential backoff
  - Error handling

performAIAnalysis(document, text): Promise<any>
  - Calls AI analysis API
  - Handles failures gracefully

saveResultFile(document, text, aiAnalysis): Promise<string | null>
  - Creates formatted result file
  - Includes metadata header
  - Returns file URL
```

---

### **2. Queue System**

#### Background Worker (`lib/document-digitization/worker.ts`)

**Queue Name:** `document-processing`

**Configuration:**
- Max retries: 3
- Backoff: Exponential (2s, 4s, 8s)
- Concurrency: Configurable via `QUEUE_CONCURRENCY`

**Usage:**
```typescript
// Enable queue processing
ENABLE_DOCUMENT_QUEUE=true

// Worker auto-starts on server init
// Processes jobs from queue
```

**Job Data:**
```typescript
{
  documentId: string
  userId: string
}
```

---

### **3. Caching Strategy**

#### Redis Cache

**Cache Keys:**
- `document:result:{documentId}` - Processing result

**TTL:** 3600 seconds (1 hour)

**Benefits:**
- Avoid reprocessing same document
- Faster response for repeated requests
- Reduced API calls to Gemini

---

### **4. Error Handling**

#### Retry Mechanism

**Configuration:**
- Max retries: 3
- Initial delay: 2000ms
- Backoff: Exponential (2x)

**Error Types:**
- Network errors → Retry
- API rate limits → Retry with backoff
- Validation errors → No retry
- Authentication errors → No retry

#### Error Recovery

Uses `ErrorRecovery.withRetry()` from `lib/errors.ts`:
- Automatic retry with exponential backoff
- Context logging
- Final error propagation

---

### **5. Logging**

#### Structured Logging

Uses `apiLogger` from `lib/logging-simple.ts`:

**Log Levels:**
- `info`: Normal operations, processing start/end
- `warn`: Recoverable errors, fallbacks
- `error`: Critical failures, processing errors
- `debug`: Detailed debugging info

**Log Context:**
```typescript
{
  metadata: {
    documentId: string
    userId: string
    executionTime?: number
    error?: string
    // ... additional context
  }
}
```

---

### **6. API Standardization**

#### Response Format

**Success Response:**
```typescript
{
  success: true,
  data: {
    documentId: string
    ocrText?: string
    aiAnalysis?: any
    resultFileUrl?: string
    executionTime: number
  },
  meta: {
    timestamp: string
    requestId?: string
    executionTime?: number
  }
}
```

**Error Response:**
```typescript
{
  success: false,
  error: {
    code: string // ErrorCodes enum
    message: string
    details?: any
  },
  meta: {
    timestamp: string
    requestId?: string
  }
}
```

#### Error Codes

```typescript
UNAUTHORIZED = "UNAUTHORIZED"
FORBIDDEN = "FORBIDDEN"
NOT_FOUND = "NOT_FOUND"
VALIDATION_ERROR = "VALIDATION_ERROR"
PROCESSING_ERROR = "PROCESSING_ERROR"
RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
INTERNAL_ERROR = "INTERNAL_ERROR"
```

---

### **7. Rate Limiting**

**Implementation:** Via API Gateway / Middleware

**Limits:**
- Teacher: 500 requests/minute
- Student: 100 requests/minute

**Headers:**
- `X-RateLimit-Limit`: Max requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

---

### **8. Validation**

#### Input Validation

**Document ID:**
- Required
- Valid CUID format
- Exists in database

**User Authorization:**
- User owns document
- Valid session

**File Validation:**
- File exists
- Valid file type (IMAGE, PDF)
- Size limits (50MB)

---

## 🔄 Data Flow

```
1. API Request
   ↓
2. Authentication & Authorization
   ↓
3. Validation
   ↓
4. Check Cache
   ├─> Cache Hit: Return cached result
   └─> Cache Miss: Continue
   ↓
5. Queue or Process Immediately
   ├─> Queue: Add to BullMQ queue
   │   └─> Worker processes async
   └─> Immediate: Process synchronously
   ↓
6. OCR Extraction (Gemini Vision)
   ├─> Retry on failure (3 attempts)
   └─> Extract text
   ↓
7. AI Analysis (Gemini AI)
   ├─> Analyze content
   ├─> Restructure text
   └─> Extract metadata
   ↓
8. Save Result File
   ├─> Create formatted file
   └─> Store in uploads/results/
   ↓
9. Update Database
   ├─> Update document status
   ├─> Save OCR text
   ├─> Save AI analysis
   └─> Save result file URL
   ↓
10. Cache Result
   ↓
11. Return Response
```

---

## 📊 Performance Optimization

### **Caching**
- Redis cache for results (1 hour TTL)
- Reduces processing time for repeated requests

### **Queue Processing**
- Background processing for large files
- Non-blocking API responses
- Better user experience

### **Retry Strategy**
- Exponential backoff prevents API overload
- Handles transient failures gracefully

### **Connection Pooling**
- Database connection pooling (Prisma)
- Redis connection reuse

---

## 🔒 Security

### **Authentication**
- NextAuth.js session validation
- JWT token verification

### **Authorization**
- User ownership validation
- Role-based access control

### **File Security**
- Path traversal prevention
- File type validation
- Size limits

### **API Security**
- Rate limiting
- Input sanitization
- Error message sanitization

---

## 📈 Monitoring

### **Metrics**
- Processing time
- Success/failure rates
- Cache hit rates
- Queue depth
- Error rates by type

### **Logging**
- Structured logs with context
- Error tracking
- Performance metrics

### **Alerts**
- High error rates
- Queue backlog
- Processing delays
- API failures

---

## 🚀 Deployment

### **Environment Variables**

```env
# Required
GEMINI_API_KEY=your-api-key
NEXTAUTH_URL=http://localhost:3000

# Optional
ENABLE_DOCUMENT_QUEUE=true
QUEUE_CONCURRENCY=5
REDIS_URL=redis://localhost:6379
GEMINI_VISION_MODEL=gemini-2.5-flash
GEMINI_MODEL=gemini-2.5-flash
```

### **Dependencies**
- `@google/generative-ai`: Gemini API
- `bullmq`: Queue system
- `ioredis`: Redis client
- `prisma`: Database ORM

---

## 📝 Best Practices

1. **Always use service layer** - Don't call APIs directly
2. **Enable queue for production** - Better scalability
3. **Monitor cache hit rates** - Optimize TTL
4. **Log all operations** - For debugging and monitoring
5. **Handle errors gracefully** - User-friendly messages
6. **Validate inputs** - Prevent security issues
7. **Use retry for transient failures** - Improve reliability

---

## 🔗 Related Documentation

- [Document Digitization Workflow](./DIGITIZATION_WORKFLOW.md)
- [AI Analysis Purpose](./AI_ANALYSIS_PURPOSE.md)
- [Gemini Vision Integration](./GEMINI_VISION_DIGITIZATION.md)
- [System Architecture](../AEROEDU_ARCHITECTURE.md)

---

**Last Updated:** January 2025  
**Version:** 2.0
