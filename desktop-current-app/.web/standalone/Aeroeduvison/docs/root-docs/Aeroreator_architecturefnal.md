# KIẾN TRÚC HỆ THỐNG TỐI ƯU - AEROEDU
## AI-Powered Educational Platform - Optimized Architecture with Exam Orchestration Integration

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mô tả
AeroEdu là nền tảng giáo dục thông minh tích hợp AI, cung cấp trải nghiệm học tập cá nhân hóa, phòng thí nghiệm ảo, hệ thống chấm bài tự động và công cụ quản lý toàn diện. Phiên bản cập nhật này tích hợp **Exam Orchestration System v4** để nâng cao khả năng tạo và quản lý đề thi, bao gồm multi-version exams, progress tracking, và AI-generated questions/answers.

### 1.2 Mục tiêu kinh doanh
- Cung cấp trải nghiệm học tập cá nhân hóa với AI
- Tự động hóa quy trình đánh giá và chấm điểm, bao gồm orchestration cho exam generation
- Phát triển kỹ năng STEM thông qua phòng thí nghiệm ảo
- Quản lý toàn diện hệ thống giáo dục số
- Tối ưu chi phí vận hành và scale hiệu quả

### 1.3 Nguyên tắc thiết kế
- **Simplicity First**: Đơn giản hóa architecture, tránh over-engineering
- **Performance**: Sub-second response time cho 95% requests
- **Cost-Effective**: Tối ưu chi phí cloud với auto-scaling thông minh
- **Resilient**: High availability với graceful degradation
- **Observable**: Full visibility với distributed tracing
- **Modular Integration**: Tích hợp Exam Orchestration như một subsystem trong Assessment và AI services

---

## 2. KIẾN TRÚC TỔNG THỂ - OPTIMIZED

### 2.1 Simplified Architecture Diagram (With Exam Orchestration Integration)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Mobile App  │  │ Teacher PWA  │          │
│  │  (Next.js)   │  │(React Native)│  │  (Next.js)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│           │                 │                 │                  │
│           └─────────────────┼─────────────────┘                  │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                              │ HTTPS/WSS (with CloudFlare)
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│                    API GATEWAY + CDN LAYER                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              CloudFlare (Global CDN + WAF)                 │  │
│  │  - DDoS Protection  - Bot Management  - Smart Routing      │  │
│  │  - Static Caching   - SSL/TLS         - Geo Blocking       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         API Gateway (Next.js API Routes + Middleware)      │  │
│  │  - Auth (NextAuth.js)     - Rate Limiting (Redis)          │  │
│  │  - Request Validation     - Circuit Breaker                │  │
│  │  - Response Caching       - Request Deduplication          │  │
│  │  - Distributed Tracing    - API Versioning (v1, v2)        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Core Service │    │  AI Service   │    │ Real-time     │
│  (Monolith)   │    │  (Python)     │    │ Service       │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────────┐
│              CONSOLIDATED BUSINESS LOGIC LAYER                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                   CORE SERVICE (Monolith)                     │ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┕               │ │
│  │  │   Auth &   │ │   Course   │ │ Assessment │               │ │
│  │  │   User     │ │  Management│ │  & Grading │               │ │
│  │  │  Module    │ │   Module   │ │   Module   │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┕ ┌────────────┕               │ │
│  │  │ Analytics  │ │  Calendar  │ │ Enrollment │               │ │
│  │  │   Module   │ │   Module   │ │   Module   │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    AI SERVICE (Separate)                      │ │
│  │                                                                │ │
│  │  ┌────────────┕ ┌────────────┕ ┌────────────┕               │ │
│  │  │  Content   │ │   Smart    │ │  Learning  │               │ │
│  │  │ Generation │ │  Grading   │ │    Path    │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  │  ┌────────────┕ ┌────────────┕                               │ │
│  │  │  Question  │ │  Response  │                               │ │
│  │  │ Generator  │ │   Cache    │                               │ │
│  │  └────────────┘ └────────────┘                               │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────────────┕ │ │
│  │  │                 Exam Orchestration System v4 (Integrated)  │ │
│  │  │  - Exam Orchestrator (FSM Pipeline)                        │ │
│  │  │  - Multi-Version Engine (Variant Generation)               │ │
│  │  │  - Answer & Explanation Engine                             │ │
│  │  │  - Progress & Locking System                               │ │
│  │  │  - Question Type Runtime Engine                            │ │
│  │  └────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                REAL-TIME SERVICE (Separate)                   │ │
│  │                                                                │ │
│  │  ┌────────────┕ ┌────────────┕ ┌────────────┕               │ │
│  │  │    Chat    │ │Notification│ │  WebSocket │               │ │
│  │  │   Engine   │ │  Manager   │ │   Manager  │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              LABTWIN SERVICE (Physics Engine)                 │ │
│  │                                                                │ │
│  │  ┌────────────┕ ┌────────────┕ ┌────────────┕               │ │
│  │  │  Physics   │ │ Chemistry  │ │  Biology   │               │ │
│  │  │   Engine   │ │  Engine    │ │  Engine    │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                    DATA ACCESS LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │         Repository Pattern with Prisma ORM + Query Cache       ││
│  │  - Connection Pooling (PgBouncer)                              ││
│  │  - Query Optimization                                           ││
│  │  - Batch Operations                                             ││
│  │  - Transaction Management                                       ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │     Redis     │    │   MongoDB     │
│  (Primary +   │    │   (L2 Cache   │    │  (Analytics   │
│   Replicas)   │    │   + Session)  │    │   + Logs)     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ├─────────────────────┼─────────────────────┤
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│  TimescaleDB  │                          │  ClickHouse   │
│  (Time-series │                          │  (Analytics   │
│   Analytics)  │                          │    OLAP)      │
└───────────────┘                          └───────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AI & ML:                         Storage & CDN:                    │
│  ┌──────────┐ ┌──────────┐      ┌──────────┐ ┌──────────┐         │
│  │Google AI │ │  OpenAI  │      │  Google  │ │CloudFlare│         │
│  │(Gemini)  │ │ (GPT-4)  │      │  Cloud   │ │   CDN    │         │
│  └──────────┘ └──────────┘      │ Storage  │ └──────────┘         │
│                                  └──────────┘                       │
│  Processing:                      Communications:                   │
│  ┌──────────┐ ┌──────────┐      ┌──────────┐ ┌──────────┐         │
│  │  Vision  │ │   OCR    │      │  Email   │ │   SMS    │         │
│  │   API    │ │  (Google │      │(SendGrid)│ │(Twilio)  │         │
│  │(MediaPipe│ │Document  │      └──────────┘ └──────────┘         │
│  │   )      │ │   AI)    │                                         │
│  └──────────┘ └──────────┘      Payment:                           │
│                                  ┌──────────┐                       │
│  Queue & Jobs:                   │  Stripe  │                       │
│  ┌──────────┐                    │   API    │                       │
│  │  BullMQ  │                    └──────────┘                       │
│  │ (Redis)  │                                                       │
│  └──────────┘                                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                 OBSERVABILITY & INFRASTRUCTURE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Distributed Tracing:             Monitoring:                       │
│  ┌──────────────────┐            ┌──────────────────┐              │
│  │  OpenTelemetry   │            │   Prometheus     │              │
│  │    + Jaeger      │            │   + Grafana      │              │
│  └──────────────────┘            └──────────────────┘              │
│                                                                      │
│  Logging:                         Alerting:                         │
│  ┌──────────────────┐            ┌──────────────────┐              │
│  │  Loki + Grafana  │            │  AlertManager    │              │
│  │  (Structured     │            │  + PagerDuty     │              │
│  │   Logging)       │            └──────────────────┘              │
│  └──────────────────┘                                               │
│                                                                      │
│  APM:                             Error Tracking:                   │
│  ┌──────────────────┐            ┌──────────────────┐              │
│  │  New Relic /     │            │     Sentry       │              │
│  │  DataDog         │            └──────────────────┘              │
│  └──────────────────┘                                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Tích hợp Exam Orchestration:**
- Exam Orchestration được tích hợp vào AI Service như một subsystem chính, hỗ trợ tạo đề thi đa phiên bản, progress tracking, và locking để tránh lỗi khi tạo đề. 
- Kết nối với Assessment Module trong Core Service qua API nội bộ.
- Sử dụng Redis cho progress và locks, PostgreSQL cho storage exam versions/answers.

---

## 3. KIẾN TRÚC SERVICES - SIMPLIFIED & OPTIMIZED

### 3.1 Core Service (Consolidated Monolith)

**Lý do gộp:** Giảm network overhead, dễ deploy, debug và maintain. Tích hợp Exam Orchestration qua API nội bộ đến AI Service.

```typescript
Service: Core Service
Port: 3000 (API) + 3001 (Internal)
Technology: Next.js 15, Prisma, TypeScript
Deployment: Cloud Run with auto-scaling

Architecture Pattern: Modular Monolith

Modules:
  ├── Auth Module
  │   ├── Authentication (NextAuth.js)
  │   ├── Authorization (RBAC)
  │   ├── Session Management
  │   └── OAuth Integration
  │
  ├── User Management Module
  │   ├── User Profiles
  │   ├── Student Records
  │   ├── Teacher Management
  │   └── Admin Operations
  │
  ├── Course Management Module
  │   ├── Course CRUD
  │   ├── Content Management
  │   ├── Syllabus Management
  │   └── Prerequisites
  │
  ├── Assessment Module
  │   ├── Quiz Management
  │   ├── Assignment Management
  │   ├── Exam Management (Integrated with Exam Orchestrator)
  │   ├── Submission Handling
  │   └── Manual Grading Interface
  │
  ├── Grading Module
  │   ├── Automated Grading (MCQ)
  │   ├── Grade Calculation
  │   ├── Grade Book
  │   └── Transcript Generation
  │
  ├── Analytics Module
  │   ├── Dashboard Data
  │   ├── Progress Tracking
  │   ├── Performance Reports
  │   └── Trend Analysis
  │
  ├── Enrollment Module
  │   ├── Course Registration
  │   ├── Waitlist Management
  │   ├── Class Management
  │   └── Capacity Control
  │
  └── Calendar Module
      ├── Academic Calendar
      ├── Schedule Management
      ├── Event Management
      └── Reminders

Key API Endpoints (Updated with Exam Orchestration):

# Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/session
POST   /api/v1/auth/refresh

# Users
GET    /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
GET    /api/v1/users/:id/profile

# Courses
GET    /api/v1/courses
POST   /api/v1/courses
GET    /api/v1/courses/:id
PUT    /api/v1/courses/:id
DELETE /api/v1/courses/:id
POST   /api/v1/courses/:id/enroll

# Assessments (Integrated Exam Orchestration)
GET    /api/v1/assessments
POST   /api/v1/assessments
GET    /api/v1/assessments/:id
POST   /api/v1/assessments/:id/submit
GET    /api/v1/assessments/:id/results
POST   /api/v1/assessments/:id/orchestrate  // Start Exam Orchestrator pipeline
GET    /api/v1/assessments/:id/progress     // Get progress %
POST   /api/v1/assessments/:id/versions/generate?num_versions=5 // Multi-version generation

# Grades
GET    /api/v1/grades/student/:id
GET    /api/v1/grades/course/:id
POST   /api/v1/grades/calculate
GET    /api/v1/grades/transcript/:studentId

# Analytics
GET    /api/v1/analytics/dashboard
GET    /api/v1/analytics/student/:id
GET    /api/v1/analytics/course/:id
GET    /api/v1/analytics/trends

Performance Optimizations:
  - Connection Pooling: PgBouncer (max 100 connections)
  - Query Caching: Redis with 5-30 min TTL
  - Batch Operations: Prisma batch queries
  - Response Caching: API-level caching for read-heavy endpoints
  - Database Indexes: Optimized for common queries
  - Lazy Loading: For large datasets with pagination
```

### 3.2 AI Service (Specialized)

**Lý do tách riêng:** AI workload khác biệt, cần Python ecosystem, scaling riêng. Tích hợp đầy đủ **Exam Orchestration System v4** như một module mới, làm xương sống cho question generation và exam management.

```typescript
Service: AI Service
Port: 8000
Technology: Python 3.11+, FastAPI, LangChain
Deployment: Cloud Run with GPU support (optional)

Architecture: Event-Driven with Queue

Components:
  ├── Content Generation Engine
  │   ├── Course Content Generator
  │   ├── Quiz Question Generator
  │   ├── Learning Material Synthesizer
  │   └── Prompt Templates
  │
  ├── Smart Grading Engine
  │   ├── Essay Grading (LLM-based)
  │   ├── Code Grading (AST + Test Cases)
  │   ├── Short Answer Evaluation
  │   ├── Rubric-based Scoring
  │   └── Feedback Generation
  │
  ├── Learning Path Engine
  │   ├── Adaptive Learning Algorithm
  │   ├── Knowledge Graph
  │   ├── Difficulty Estimation
  │   ├── Content Recommendation
  │   └── Progress Prediction
  │
  ├── Question Generator
  │   ├── Multiple Choice Generator
  │   ├── True/False Generator
  │   ├── Short Answer Generator
  │   └── Difficulty Calibration
  │
  └── Response Cache Layer
      ├── Semantic Similarity Search
      ├── Response Deduplication
      ├── Cost Optimization
      └── Fallback Mechanisms
  │
  └── Exam Orchestration System v4 (New Integration)
      ├── Exam Orchestrator (FSM-based Pipeline with Progress Emitter)
      ├── Multi-Version Engine (Variant Generation, Shuffle/Mutator)
      ├── Answer & Explanation Engine (AI Resolver, Editor, Lock-on-Save)
      ├── Progress & Locking System (WebSocket Sync, Audit Log)
      ├── Question Type Runtime Engine (Renderer, Validator, Scoring)

API Endpoints (Updated with Exam Orchestration):

# Content Generation
POST   /api/v1/ai/generate/course-content
POST   /api/v1/ai/generate/quiz
POST   /api/v1/ai/generate/questions
POST   /api/v1/ai/generate/learning-material

# Smart Grading
POST   /api/v1/ai/grade/essay
POST   /api/v1/ai/grade/code
POST   /api/v1/ai/grade/short-answer
POST   /api/v1/ai/grade/batch

# Learning Path
POST   /api/v1/ai/learning-path/generate
GET    /api/v1/ai/learning-path/:id
POST   /api/v1/ai/learning-path/adapt
GET    /api/v1/ai/recommendations/:studentId

# Analytics
POST   /api/v1/ai/analyze/performance
POST   /api/v1/ai/analyze/engagement
GET    /api/v1/ai/insights/:studentId

# Exam Orchestration (New)
POST   /api/v1/ai/exams/orchestrate/{exam_id} // Start pipeline
GET    /api/v1/ai/exams/progress/{exam_id}    // Get % and status
POST   /api/v1/ai/exams/versions/{exam_id}/generate?num_versions=5
GET    /api/v1/ai/exams/versions/{exam_id}/{code}
POST   /api/v1/ai/exams/answers/{version_id}/generate
PUT    /api/v1/ai/exams/answers/{answer_id}/edit
WS     /ws/progress/{exam_id}                 // Real-time updates

AI Service Optimizations (Updated):

1. Response Caching Strategy:
   - Semantic similarity threshold: 0.85
   - Cache TTL: 1 hour for content, 24 hours for static Q&A
   - Cache key: hash(prompt + context + model_version)
   - Cache storage: Redis with vector embeddings

2. Request Batching:
   - Batch size: 5-10 requests
   - Wait time: 500ms
   - Batch similar prompts together
   - Parallel processing with rate limits

3. Cost Optimization:
   - Daily budget: $100
   - Alert threshold: 80% of budget
   - Fallback to cached responses
   - Rate limiting per user/course
   - Token usage tracking

4. Model Selection:
   - Content Generation: GPT-4 (high quality)
   - Grading Essays: GPT-3.5-turbo (cost-effective)
   - MCQ Generation: Gemini Pro (balanced)
   - Quick Q&A: Claude Instant (fast + cheap)

5. Fallback Mechanisms:
   - Cache-first approach
   - Degraded responses if API down
   - Local lightweight models for basic tasks
   - Queue failed requests for retry

6. Performance Targets:
   - Content Generation: < 5s (p95)
   - Essay Grading: < 10s (p95)
   - Question Generation: < 3s (p95)
   - Recommendations: < 2s (p95)
   - Exam Orchestration: < 10s for full pipeline (p95)

External API Integration:
  Primary: Google AI (Gemini Pro)
  Secondary: OpenAI (GPT-4, GPT-3.5-turbo)
  Backup: Claude AI (Anthropic)
  
  Circuit Breaker:
    - Error threshold: 50%
    - Timeout: 30s
    - Reset timeout: 60s
    - Failover to backup provider
```

### 3.3 Real-time Service (WebSocket + Notifications)

**Tích hợp Exam Orchestration:** Sử dụng WebSocket cho progress updates từ Exam Orchestrator.

```typescript
// ... (Giữ nguyên, thêm WS endpoint cho progress)
WebSocket Events:

# Connection
connect
disconnect
authenticate

# Chat
chat:send
chat:receive
chat:typing
chat:read
chat:history

# Notifications
notification:new
notification:read
notification:clear

# Presence
user:online
user:offline
user:typing

# Real-time Updates
grade:updated
assignment:due
course:announcement
exam:progress // New: Real-time exam generation progress

// ... (Optimizations giữ nguyên)
```

### 3.4 LabTwin Service (Physics Engine)

**Tích hợp:** Không thay đổi chính, nhưng có thể mở rộng để hỗ trợ exam simulations nếu cần.

```typescript
// ... (Giữ nguyên)
```

---

## 4. DATABASE SCHEMA - OPTIMIZED

### 4.1 PostgreSQL Schema (Enhanced & Partitioned with Exam Orchestration)

**Tích hợp:** Thêm tables cho exam versions, answers, explanations, orchestration states từ Exam Orchestration System v4.

```sql
-- ... (Giữ nguyên schema gốc cho users, courses, assessments, etc.)

-- Exam Orchestration Tables (New Integration)

-- Exam Orchestration States
CREATE TABLE exam_orchestration (
    id SERIAL PRIMARY KEY,
    exam_id UUID REFERENCES assessments(id),
    current_step VARCHAR(50),  -- e.g., 'GENERATING_QUESTIONS'
    progress INTEGER,          -- 0-100
    status ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'),
    created_at TIMESTAMP
);

-- Exam Versions
CREATE TABLE exam_versions (
    id SERIAL PRIMARY KEY,
    exam_id UUID REFERENCES assessments(id),
    version_code VARCHAR(10),  -- e.g., '101'
    questions JSONB[],         -- Array of question objects
    answers JSONB[],           -- Array of answers
    explanations JSONB[],      -- Array of explanations
    frozen BOOLEAN DEFAULT FALSE
);

-- Answers (Integrated with Answer Engine)
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    version_id INTEGER REFERENCES exam_versions(id),
    question_id UUID,
    correct_answer TEXT,
    explanation TEXT,
    source ENUM('BANK', 'AI', 'TEACHER')
);

-- Audit Logs (Extended for Locking)
-- ... (Giữ nguyên, thêm actions cho orchestration)

-- Question Types (From Question Type Runtime Engine)
CREATE TABLE question_types (
    type VARCHAR(20) PRIMARY KEY,  -- e.g., 'MCQ'
    validator_script TEXT          -- Validation logic
);

-- Indexes (New)
CREATE INDEX idx_exam_orchestration_exam ON exam_orchestration(exam_id);
CREATE INDEX idx_exam_versions_exam ON exam_versions(exam_id);
CREATE INDEX idx_answers_version ON answers(version_id);
CREATE INDEX idx_question_types_type ON question_types(type);
```

### 4.2 MongoDB Collections (Analytics & Logs)

**Tích hợp:** Thêm time-series cho exam progress logs.

```javascript
// ... (Giữ nguyên)

db.createCollection("exam_progress_logs", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  }
});

// Schema
{
  _id: ObjectId,
  timestamp: ISODate,
  metadata: {
    examId: UUID,
    userId: UUID
  },
  progress: Number, // 0-100
  step: String
}
```

---

## 5. DATA FLOW - INTEGRATED WITH EXAM ORCHESTRATION

**Vòng đời đề thi (Exam Lifecycle):**
```
[ Tạo blueprint/ma trận ]
      ↓
[ Sinh đề (Orchestrator in AI Service) ]
      ↓
[ Nhiều mã đề (Multi-Version Engine) ]
      ↓
[ Gán đáp án & lời giải (Answer & Explanation Engine) ]
      ↓
[ Lưu & đóng băng (Progress & Locking System) ]
      ↓
[ Thi (Assessment Module in Core Service) ]
      ↓
[ Chấm (Smart Grading Engine) ]
      ↓
[ Phân tích (Analytics Module) ]
```

**Pipeline Steps (From Orchestrator):**
1. Load Blueprint (0-20%).
2. Select from Bank (20-40%).
3. AI Generate Missing (40-60%).
4. Duplicate Check (60-70%).
5. Assign Answers/Explanations (70-90%).
6. Generate Multi-Codes (90-95%).
7. Finalize & Save (95-100%).

---

## 6. SECURITY (Giữ nguyên, thêm locking cho exam edits)

## 7. SCALABILITY (Tích hợp Redis locks cho orchestration)

## 8. MONITORING (Thêm metrics cho orchestration progress)

## 9. DISASTER RECOVERY (Giữ nguyên)

## 10. DEPLOYMENT (Giữ nguyên, thêm CI/CD cho Exam Orchestrator)

## 11. COST OPTIMIZATION (Giữ nguyên)

## 12. API DOCUMENTATION (Thêm OpenAPI cho new endpoints)

## 13. TESTING STRATEGY (Thêm tests cho orchestration pipeline)

## 14. DEVELOPMENT GUIDELINES (Giữ nguyên, thêm conventions cho Python modules in AI Service)

## 15. CONCLUSION & ROADMAP (Cập nhật để bao gồm Exam Orchestration trong Phase 2)

**Roadmap Update (Q2 2025):**
- [x] AI-powered content generation ✅
- [x] Exam Orchestration System v4 integration ✅
- [ ] Intelligent grading system 🚧
- ... (Giữ nguyên)

---

**Document Version:** 3.0 (With Exam Orchestration v4)
**Last Updated:** January 06, 2026
**Authors:** AeroEdu Architecture Team