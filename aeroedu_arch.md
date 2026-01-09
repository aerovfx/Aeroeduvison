# KIẾN TRÚC HỆ THỐNG TỐI ƯU - AEROEDU
## AI-Powered Educational Platform - Optimized Architecture

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mô tả
AeroEdu là nền tảng giáo dục thông minh tích hợp AI, cung cấp trải nghiệm học tập cá nhân hóa, phòng thí nghiệm ảo, hệ thống chấm bài tự động và công cụ quản lý toàn diện.

### 1.2 Mục tiêu kinh doanh
- Cung cấp trải nghiệm học tập cá nhân hóa với AI
- Tự động hóa quy trình đánh giá và chấm điểm
- Phát triển kỹ năng STEM thông qua phòng thí nghiệm ảo
- Quản lý toàn diện hệ thống giáo dục số
- Tối ưu chi phí vận hành và scale hiệu quả

### 1.3 Nguyên tắc thiết kế
- **Simplicity First**: Đơn giản hóa architecture, tránh over-engineering
- **Performance**: Sub-second response time cho 95% requests
- **Cost-Effective**: Tối ưu chi phí cloud với auto-scaling thông minh
- **Resilient**: High availability với graceful degradation
- **Observable**: Full visibility với distributed tracing

---

## 2. KIẾN TRÚC TỔNG THỂ - OPTIMIZED

### 2.1 Simplified Architecture Diagram

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
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐               │ │
│  │  │   Auth &   │ │   Course   │ │ Assessment │               │ │
│  │  │   User     │ │  Management│ │  & Grading │               │ │
│  │  │  Module    │ │   Module   │ │   Module   │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐               │ │
│  │  │ Analytics  │ │  Calendar  │ │ Enrollment │               │ │
│  │  │   Module   │ │   Module   │ │   Module   │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    AI SERVICE (Separate)                      │ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐               │ │
│  │  │  Content   │ │   Smart    │ │  Learning  │               │ │
│  │  │ Generation │ │  Grading   │ │    Path    │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┐                               │ │
│  │  │  Question  │ │  Response  │                               │ │
│  │  │ Generator  │ │   Cache    │                               │ │
│  │  └────────────┘ └────────────┘                               │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                REAL-TIME SERVICE (Separate)                   │ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐               │ │
│  │  │    Chat    │ │Notification│ │  WebSocket │               │ │
│  │  │   Engine   │ │  Manager   │ │   Manager  │               │ │
│  │  └────────────┘ └────────────┘ └────────────┘               │ │
│  │                                                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              LABTWIN SERVICE (Physics Engine)                 │ │
│  │                                                                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐               │ │
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

---

## 3. KIẾN TRÚC SERVICES - SIMPLIFIED & OPTIMIZED

### 3.1 Core Service (Consolidated Monolith)

**Lý do gộp:** Giảm network overhead, dễ deploy, debug và maintain

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
  │   ├── Exam Management
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

Key API Endpoints:

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

# Assessments
GET    /api/v1/assessments
POST   /api/v1/assessments
GET    /api/v1/assessments/:id
POST   /api/v1/assessments/:id/submit
GET    /api/v1/assessments/:id/results

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

**Lý do tách riêng:** AI workload khác biệt, cần Python ecosystem, scaling riêng

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

API Endpoints:

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

AI Service Optimizations:

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

**Lý do tách riêng:** Real-time workload cần WebSocket server riêng, scaling khác

```typescript
Service: Real-time Service
Port: 3002 (WebSocket) + 3003 (HTTP API)
Technology: Node.js, Socket.io, Redis
Deployment: Cloud Run with WebSocket support

Architecture: Pub/Sub with Redis

Components:
  ├── WebSocket Manager
  │   ├── Connection Management
  │   ├── Room Management
  │   ├── Authentication
  │   └── Heartbeat Monitoring
  │
  ├── Chat Engine
  │   ├── Direct Messaging
  │   ├── Group Chat
  │   ├── Study Rooms
  │   ├── File Sharing
  │   └── Message History
  │
  ├── Notification Manager
  │   ├── In-app Notifications
  │   ├── Push Notifications (FCM)
  │   ├── Email Notifications (async)
  │   ├── SMS Notifications (async)
  │   └── Notification Preferences
  │
  └── Presence System
      ├── Online/Offline Status
      ├── Typing Indicators
      ├── Read Receipts
      └── Activity Tracking

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

WebSocket Optimizations:

1. Connection Management:
   - Max connections per user: 3 (web, mobile, tablet)
   - Max total connections: 10,000 per instance
   - Heartbeat interval: 30s
   - Auto-reconnect with exponential backoff
   - Connection timeout: 60s

2. Message Batching:
   - Batch size: 10 messages
   - Flush interval: 100ms
   - Priority queue for important messages
   - Deduplication based on message ID

3. Compression:
   - Enable compression for messages > 1KB
   - Use MessagePack for binary serialization
   - Gzip compression for text messages

4. Room Optimization:
   - Max participants per room: 50
   - Automatic room sharding for large classes
   - Selective broadcasting based on permissions
   - Message queue size: 1000 per room

5. Redis Pub/Sub:
   - Channel per room for scalability
   - Sticky sessions for load balancing
   - Message persistence for offline users
   - TTL for old messages: 7 days

6. Performance Targets:
   - Message delivery latency: < 100ms (p95)
   - Connection establishment: < 500ms
   - Reconnection time: < 1s
   - Concurrent users per instance: 10,000+

HTTP API Endpoints:

# Chat
POST   /api/v1/chat/rooms
GET    /api/v1/chat/rooms/:id
POST   /api/v1/chat/rooms/:id/messages
GET    /api/v1/chat/rooms/:id/messages
DELETE /api/v1/chat/messages/:id

# Notifications
GET    /api/v1/notifications
POST   /api/v1/notifications/send
PUT    /api/v1/notifications/:id/read
DELETE /api/v1/notifications/:id
POST   /api/v1/notifications/preferences

# Presence
GET    /api/v1/presence/online
GET    /api/v1/presence/:userId
```

### 3.4 LabTwin Service (Physics Engine)

**Lý do tách riêng:** Cần Python scientific computing stack, GPU acceleration

```typescript
Service: LabTwin Service
Port: 8001
Technology: Python 3.11+, NumPy, SciPy, Matplotlib
Deployment: Cloud Run with GPU (for complex simulations)

Architecture: Stateless Simulation Engine

Components:
  ├── Physics Engine
  │   ├── Kinematics Simulator
  │   ├── Dynamics Simulator
  │   ├── Optics Simulator
  │   ├── Electricity & Magnetism
  │   └── Thermodynamics
  │
  ├── Chemistry Engine
  │   ├── Reaction Simulator
  │   ├── Titration Simulator
  │   ├── Stoichiometry Calculator
  │   └── Molecular Visualization
  │
  ├── Biology Engine
  │   ├── Cell Biology Simulations
  │   ├── Genetics Simulator
  │   ├── Ecosystem Models
  │   └── Anatomy Visualization
  │
  ├── 3D Visualization
  │   ├── Three.js Integration
  │   ├── Real-time Rendering
  │   ├── Interactive Controls
  │   └── Data Export
  │
  └── Data Collection
      ├── Experiment Data Logging
      ├── Result Analysis
      ├── Graph Generation
      └── Report Creation

API Endpoints:

# Lab Simulations
POST   /api/v1/labs/physics/simulate
POST   /api/v1/labs/chemistry/simulate
POST   /api/v1/labs/biology/simulate
GET    /api/v1/labs/experiments/:id

# Results
POST   /api/v1/labs/results/save
GET    /api/v1/labs/results/:experimentId
GET    /api/v1/labs/history/:userId
POST   /api/v1/labs/results/analyze

# Visualization
POST   /api/v1/labs/visualize/3d
POST   /api/v1/labs/graphs/generate
GET    /api/v1/labs/export/:experimentId

Available Simulations:

Physics:
  - Projectile Motion
  - Pendulum Oscillation
  - Light Refraction
  - Electric Circuits
  - Magnetic Fields
  - Free Fall
  - Collision Physics
  - Wave Interference

Chemistry:
  - Acid-Base Titration
  - Chemical Equilibrium
  - Redox Reactions
  - Gas Laws (PV=nRT)
  - Molecular Bonding
  - pH Calculations

Biology:
  - Cell Division
  - DNA Replication
  - Enzyme Kinetics
  - Population Dynamics
  - Photosynthesis
  - Respiration

Optimizations:

1. Computation:
   - Use NumPy vectorized operations
   - GPU acceleration for complex simulations
   - Pre-computed lookup tables
   - Caching common calculations

2. Performance:
   - Simulation time: < 5s for simple, < 30s for complex
   - Real-time rendering: 60 FPS
   - Data export: < 2s

3. Scalability:
   - Stateless design for horizontal scaling
   - Auto-scaling based on queue depth
   - Background processing for long simulations
```

---

## 4. DATABASE SCHEMA - OPTIMIZED

### 4.1 PostgreSQL Schema (Enhanced & Partitioned)

```sql
-- ============================================================================
-- CORE TABLES WITH OPTIMIZATIONS
-- ============================================================================

-- Users Table (Optimized with Partitioning Ready)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN')),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    
    -- Gamification
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_activity_date DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Optimized indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_active ON users(role, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_login ON users(last_login DESC);

-- User Profiles (Extended Info)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    phone VARCHAR(20),
    
    -- JSONB for flexible data
    address JSONB,
    emergency_contact JSONB,
    learning_preferences JSONB,
    accessibility_settings JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GIN index for JSONB queries
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN (learning_preferences);

-- ============================================================================
-- ACADEMIC STRUCTURE
-- ============================================================================

-- Academic Programs
CREATE TABLE academic_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    degree VARCHAR(50), -- BACHELOR, MASTER, PHD
    duration_semesters INTEGER,
    total_credits INTEGER,
    department VARCHAR(100),
    curriculum JSONB,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_programs_status ON academic_programs(status);
CREATE INDEX idx_programs_department ON academic_programs(department);

-- Courses (Core Education Entity)
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    level VARCHAR(20), -- BEGINNER, INTERMEDIATE, ADVANCED
    department VARCHAR(100),
    program_id UUID REFERENCES academic_programs(id),
    
    -- Course Structure
    prerequisites TEXT[], -- Array of course codes
    learning_objectives TEXT[],
    syllabus JSONB,
    
    -- Metadata
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_program ON courses(program_id);
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_courses_level ON courses(level);

-- GIN index for array searches
CREATE INDEX idx_courses_prerequisites ON courses USING GIN (prerequisites);

-- Course Offerings (Specific Class Instances)
CREATE TABLE course_offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    semester VARCHAR(20) NOT NULL, -- FALL2024, SPRING2025
    academic_year VARCHAR(20) NOT NULL,
    
    -- Instructor & Capacity
    instructor_id UUID REFERENCES users(id),
    capacity INTEGER NOT NULL,
    enrolled INTEGER DEFAULT 0,
    waitlist INTEGER DEFAULT 0,
    
    -- Schedule & Location
    schedule JSONB, -- {days: ['MON','WED'], time: '09:00-10:30', room: 'A101'}
    location VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'PLANNED', -- PLANNED, OPEN, FULL, IN_PROGRESS, COMPLETED
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_enrollment CHECK (enrolled <= capacity)
);

CREATE INDEX idx_offerings_semester ON course_offerings(semester, academic_year);
CREATE INDEX idx_offerings_course ON course_offerings(course_id);
CREATE INDEX idx_offerings_instructor ON course_offerings(instructor_id);
CREATE INDEX idx_offerings_status ON course_offerings(status);

-- Composite index for common queries
CREATE INDEX idx_offerings_course_semester ON course_offerings(course_id, semester, academic_year);

-- ============================================================================
-- ENROLLMENT & REGISTRATION
-- ============================================================================

-- Class Registrations (PARTITIONED BY ACADEMIC YEAR)
CREATE TABLE class_registrations (
    id UUID DEFAULT gen_random_uuid(),
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Registration Process
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, DROPPED, COMPLETED
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    dropped_at TIMESTAMP,
    
    -- Academic tracking
    academic_year VARCHAR(20) NOT NULL,
    final_grade VARCHAR(5),
    grade_points DECIMAL(3,2),
    
    notes TEXT,
    
    PRIMARY KEY (id, academic_year),
    UNIQUE(offering_id, student_id, academic_year)
) PARTITION BY LIST (academic_year);

-- Create partitions for each academic year
CREATE TABLE class_registrations_2024 PARTITION OF class_registrations
    FOR VALUES IN ('2024');
    
CREATE TABLE class_registrations_2025 PARTITION OF class_registrations
    FOR VALUES IN ('2025');

CREATE TABLE class_registrations_2026 PARTITION OF class_registrations
    FOR VALUES IN ('2026');

-- Indexes on partitioned table
CREATE INDEX idx_registrations_student ON class_registrations(student_id, academic_year);
CREATE INDEX idx_registrations_offering ON class_registrations(offering_id);
CREATE INDEX idx_registrations_status ON class_registrations(status);

-- ============================================================================
-- ASSESSMENTS & GRADING
-- ============================================================================

-- Assessments (PARTITIONED BY CREATED YEAR)
CREATE TABLE assessments (
    id UUID DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- QUIZ, ASSIGNMENT, PROJECT, MIDTERM, FINAL
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    -- Assessment Content
    questions JSONB,
    instructions TEXT,
    rubric JSONB,
    attachments TEXT[],
    
    -- Settings
    settings JSONB, -- {timeLimit: 60, attempts: 2, shuffleQuestions: true}
    max_score DECIMAL(5,2) DEFAULT 100.00,
    weight DECIMAL(5,2) DEFAULT 1.00, -- Weight in final grade calculation
    
    -- Scheduling
    available_from TIMESTAMP,
    due_date TIMESTAMP,
    late_submission_allowed BOOLEAN DEFAULT FALSE,
    late_penalty DECIMAL(5,2), -- Percentage penalty per day
    
    -- Status
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    
    -- Metadata
    created_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_year)
) PARTITION BY RANGE (created_year);

-- Create partitions
CREATE TABLE assessments_2024 PARTITION OF assessments
    FOR VALUES FROM (2024) TO (2025);
    
CREATE TABLE assessments_2025 PARTITION OF assessments
    FOR VALUES FROM (2025) TO (2026);

CREATE TABLE assessments_2026 PARTITION OF assessments
    FOR VALUES FROM (2026) TO (2027);

-- Indexes
CREATE INDEX idx_assessments_course ON assessments(course_id, created_year);
CREATE INDEX idx_assessments_offering ON assessments(offering_id);
CREATE INDEX idx_assessments_type ON assessments(type);
CREATE INDEX idx_assessments_due ON assessments(due_date);
CREATE INDEX idx_assessments_published ON assessments(is_published);

-- GIN index for questions JSONB
CREATE INDEX idx_assessments_questions ON assessments USING GIN (questions);

-- Assessment Submissions (PARTITIONED BY SUBMITTED YEAR)
CREATE TABLE assessment_submissions (
    id UUID DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Submission Content
    answers JSONB,
    attachments TEXT[],
    
    -- Timing
    started_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent INTEGER, -- seconds
    
    -- Grading
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    feedback TEXT,
    ai_feedback JSONB,
    
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, SUBMITTED, GRADED, LATE
    attempt_number INTEGER DEFAULT 1,
    is_late BOOLEAN DEFAULT FALSE,
    
    -- Metadata for partitioning
    submitted_year INTEGER NOT NULL,
    
    PRIMARY KEY (id, submitted_year),
    UNIQUE(assessment_id, student_id, attempt_number, submitted_year)
) PARTITION BY RANGE (submitted_year);

-- Create partitions
CREATE TABLE assessment_submissions_2024 PARTITION OF assessment_submissions
    FOR VALUES FROM (2024) TO (2025);
    
CREATE TABLE assessment_submissions_2025 PARTITION OF assessment_submissions
    FOR VALUES FROM (2025) TO (2026);

CREATE TABLE assessment_submissions_2026 PARTITION OF assessment_submissions
    FOR VALUES FROM (2026) TO (2027);

-- Indexes
CREATE INDEX idx_submissions_assessment ON assessment_submissions(assessment_id, submitted_year);
CREATE INDEX idx_submissions_student ON assessment_submissions(student_id, submitted_year);
CREATE INDEX idx_submissions_status ON assessment_submissions(status);
CREATE INDEX idx_submissions_graded ON assessment_submissions(graded_at);

-- GIN indexes
CREATE INDEX idx_submissions_answers ON assessment_submissions USING GIN (answers);
CREATE INDEX idx_submissions_ai_feedback ON assessment_submissions USING GIN (ai_feedback);

-- Grade Entries (Individual Grade Records)
CREATE TABLE grade_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    submission_id UUID,
    
    -- Grade Details
    grade_type VARCHAR(50), -- QUIZ, ASSIGNMENT, MIDTERM, FINAL, PARTICIPATION
    score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN max_score > 0 THEN (score / max_score * 100) ELSE 0 END
    ) STORED,
    weight DECIMAL(5,2) DEFAULT 1.00,
    
    -- Grading Info
    letter_grade VARCHAR(5),
    comments TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Flags
    is_final BOOLEAN DEFAULT FALSE,
    is_dropped BOOLEAN DEFAULT FALSE, -- For "drop lowest quiz" policies
    is_extra_credit BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grade_entries_student ON grade_entries(student_id);
CREATE INDEX idx_grade_entries_course ON grade_entries(course_id);
CREATE INDEX idx_grade_entries_offering ON grade_entries(offering_id);
CREATE INDEX idx_grade_entries_assessment ON grade_entries(assessment_id);
CREATE INDEX idx_grade_entries_type ON grade_entries(grade_type);

-- Composite index for grade calculations
CREATE INDEX idx_grade_entries_calc ON grade_entries(student_id, offering_id, is_dropped);

-- Grade Summaries (Final Course Grades)
CREATE TABLE grade_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Academic Period
    semester VARCHAR(20) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    
    -- Component Scores
    quiz_avg DECIMAL(5,2),
    assignment_avg DECIMAL(5,2),
    project_avg DECIMAL(5,2),
    midterm_score DECIMAL(5,2),
    final_score DECIMAL(5,2),
    participation_score DECIMAL(5,2),
    
    -- Final Grade
    overall_score DECIMAL(5,2) NOT NULL,
    letter_grade VARCHAR(5) NOT NULL,
    grade_points DECIMAL(3,2), -- For GPA calculation (4.0 scale)
    
    -- Status
    status VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, PASS, FAIL, INCOMPLETE, WITHDRAWN
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    UNIQUE(student_id, offering_id)
);

CREATE INDEX idx_grade_summaries_student ON grade_summaries(student_id);
CREATE INDEX idx_grade_summaries_offering ON grade_summaries(offering_id);
CREATE INDEX idx_grade_summaries_semester ON grade_summaries(semester, academic_year);
CREATE INDEX idx_grade_summaries_status ON grade_summaries(status);

-- ============================================================================
-- GAMIFICATION & ENGAGEMENT
-- ============================================================================

-- Lab Completions
CREATE TABLE lab_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    lab_id VARCHAR(100) NOT NULL, -- refraction, projectile, etc.
    lab_name VARCHAR(255) NOT NULL,
    lab_type VARCHAR(50), -- PHYSICS, CHEMISTRY, BIOLOGY
    
    -- Experiment Details
    parameters JSONB, -- Input parameters used
    results JSONB, -- Experiment results
    
    -- Performance
    score DECIMAL(5,2),
    accuracy DECIMAL(5,2), -- Percentage
    time_spent INTEGER, -- seconds
    attempts INTEGER DEFAULT 1,
    
    -- Rewards
    xp_earned INTEGER DEFAULT 0,
    
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, lab_id, course_id)
);

CREATE INDEX idx_lab_completions_user ON lab_completions(user_id);
CREATE INDEX idx_lab_completions_course ON lab_completions(course_id);
CREATE INDEX idx_lab_completions_type ON lab_completions(lab_type);
CREATE INDEX idx_lab_completions_date ON lab_completions(completed_at DESC);

-- Achievements
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    
    -- Classification
    category VARCHAR(50), -- LEARNING, STREAK, SOCIAL, MILESTONE, SPECIAL
    rarity VARCHAR(20) DEFAULT 'COMMON', -- COMMON, RARE, EPIC, LEGENDARY
    
    -- Requirements
    requirements JSONB, -- {type: 'complete_labs', count: 10}
    xp_reward INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_active ON achievements(is_active);

-- User Achievements (Bridge Table)
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    
    progress INTEGER DEFAULT 100, -- Percentage for progress-based achievements
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(unlocked_at DESC);

-- ============================================================================
-- COMMUNICATION
-- ============================================================================

-- Chat Rooms
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'GROUP', -- DIRECT, GROUP, STUDY_GROUP, COURSE
    description TEXT,
    
    -- Associated Entity
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    offering_id UUID REFERENCES course_offerings(id) ON DELETE CASCADE,
    
    -- Settings
    max_participants INTEGER DEFAULT 50,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Ownership
    created_by UUID REFERENCES users(id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_rooms_course ON chat_rooms(course_id);
CREATE INDEX idx_chat_rooms_active ON chat_rooms(is_active);

-- Chat Participants
CREATE TABLE chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'MEMBER', -- OWNER, MODERATOR, MEMBER
    
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP,
    last_read_message_id UUID,
    
    is_muted BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(room_id, user_id)
);

CREATE INDEX idx_chat_participants_room ON chat_participants(room_id);
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_active ON chat_participants(is_active);

-- Chat Messages (PARTITIONED BY MONTH for scalability)
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'TEXT', -- TEXT, FILE, IMAGE, SYSTEM, CODE
    
    -- Threading
    reply_to_id UUID,
    
    -- Metadata
    metadata JSONB, -- file info, reactions, etc.
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Partitioning key
    created_month DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_month)
) PARTITION BY RANGE (created_month);

-- Create partitions (3 months at a time)
CREATE TABLE chat_messages_2024_q4 PARTITION OF chat_messages
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
    
CREATE TABLE chat_messages_2025_q1 PARTITION OF chat_messages
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE chat_messages_2025_q2 PARTITION OF chat_messages
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Indexes
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_month);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_reply ON chat_messages(reply_to_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- Notifications (PARTITIONED BY MONTH)
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) NOT NULL, -- GRADE, ASSIGNMENT, ANNOUNCEMENT, SYSTEM, CHAT
    
    -- Associated Entity
    entity_type VARCHAR(50), -- course, assessment, chat, etc.
    entity_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Data
    data JSONB, -- Additional context
    
    -- Priority & Delivery
    priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    channels TEXT[], -- ['in_app', 'email', 'push', 'sms']
    delivered_at TIMESTAMP,
    
    -- Expiration
    expires_at TIMESTAMP,
    
    -- Partitioning
    created_month DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_month)
) PARTITION BY RANGE (created_month);

-- Create partitions
CREATE TABLE notifications_2024_q4 PARTITION OF notifications
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
    
CREATE TABLE notifications_2025_q1 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE notifications_2025_q2 PARTITION OF notifications
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_month);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);

-- ============================================================================
-- CONTENT MANAGEMENT
-- ============================================================================

-- News & Announcements
CREATE TABLE news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    
    -- Author & Category
    author_id UUID REFERENCES users(id),
    category VARCHAR(50), -- ANNOUNCEMENT, NEWS, EVENT, ACADEMIC
    tags TEXT[],
    
    -- Media
    featured_image TEXT,
    attachments TEXT[],
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    
    -- Engagement
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    
    -- SEO
    meta_description TEXT,
    meta_keywords TEXT[],
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_slug ON news_articles(slug);
CREATE INDEX idx_news_published ON news_articles(is_published, published_at DESC);
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_author ON news_articles(author_id);
CREATE INDEX idx_news_tags ON news_articles USING GIN (tags);

-- ============================================================================
-- LEARNING PATHS
-- ============================================================================

-- Learning Paths (AI-Generated Personalized Paths)
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configuration
    subject VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'INTERMEDIATE', -- BEGINNER, INTERMEDIATE, ADVANCED
    pace VARCHAR(20) DEFAULT 'NORMAL', -- SLOW, NORMAL, FAST
    
    -- Goals
    goals JSONB, -- {target: 'master_calculus', deadline: '2025-06-01'}
    
    -- Schedule
    schedule JSONB, -- Generated study schedule
    modules JSONB, -- Learning modules with order
    
    -- Progress
    current_module VARCHAR(100),
    completed_modules TEXT[],
    progress_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- AI Context
    ai_model_version VARCHAR(50),
    last_adapted_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_paths_student ON learning_paths(student_id);
CREATE INDEX idx_learning_paths_subject ON learning_paths(subject);
CREATE INDEX idx_learning_paths_active ON learning_paths(is_active);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

-- Audit Logs (For compliance and security)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    -- Action Details
    action VARCHAR(100) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add to other tables as needed...

-- Calculate letter grade from percentage
CREATE OR REPLACE FUNCTION calculate_letter_grade(percentage DECIMAL)
RETURNS VARCHAR(5) AS $$
BEGIN
    CASE
        WHEN percentage >= 90 THEN RETURN 'A';
        WHEN percentage >= 85 THEN RETURN 'B+';
        WHEN percentage >= 80 THEN RETURN 'B';
        WHEN percentage >= 75 THEN RETURN 'C+';
        WHEN percentage >= 70 THEN RETURN 'C';
        WHEN percentage >= 65 THEN RETURN 'D+';
        WHEN percentage >= 60 THEN RETURN 'D';
        ELSE RETURN 'F';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate GPA from letter grade
CREATE OR REPLACE FUNCTION calculate_gpa(letter_grade VARCHAR)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    CASE letter_grade
        WHEN 'A' THEN RETURN 4.00;
        WHEN 'B+' THEN RETURN 3.50;
        WHEN 'B' THEN RETURN 3.00;
        WHEN 'C+' THEN RETURN 2.50;
        WHEN 'C' THEN RETURN 2.00;
        WHEN 'D+' THEN RETURN 1.50;
        WHEN 'D' THEN RETURN 1.00;
        ELSE RETURN 0.00;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 4.2 MongoDB Collections (Analytics & Logs)

```javascript
// ============================================================================
// ANALYTICS COLLECTIONS
// ============================================================================

// Learning Activity Logs (Time-series data)
db.createCollection("learning_activities", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "minutes"
  }
});

// Schema
{
  _id: ObjectId,
  timestamp: ISODate,
  
  // Metadata for time-series
  metadata: {
    userId: UUID,
    courseId: UUID,
    offeringId: UUID,
    sessionId: UUID
  },
  
  // Activity Details
  activityType: String, // VIEW_CONTENT, TAKE_QUIZ, SUBMIT_ASSIGNMENT, COMPLETE_LAB
  contentId: UUID,
  contentType: String, // video, pdf, quiz, lab
  
  // Duration & Engagement
  duration: Number, // seconds
  engagementScore: Number, // 0-100 from attention tracking
  
  // Interactions
  interactions: {
    clicks: Number,
    scrolls: Number,
    pauses: Number,
    replays: Number
  },
  
  // Performance
  score: Number,
  accuracy: Number,
  completed: Boolean,
  
  // Context
  deviceType: String, // web, mobile
  browser: String,
  location: {
    country: String,
    city: String
  }
}

// Indexes
db.learning_activities.createIndex({ "metadata.userId": 1, "timestamp": -1 });
db.learning_activities.createIndex({ "metadata.courseId": 1, "timestamp": -1 });
db.learning_activities.createIndex({ "activityType": 1, "timestamp": -1 });

// ============================================================================

// Assessment Performance Analytics
db.createCollection("assessment_analytics");

{
  _id: ObjectId,
  assessmentId: UUID,
  studentId: UUID,
  offeringId: UUID,
  
  // Submission Info
  submittedAt: ISODate,
  attemptNumber: Number,
  
  // Question-level Analytics
  questions: [{
    questionId: UUID,
    questionType: String, // MCQ, SHORT_ANSWER, ESSAY, CODE
    topic: String,
    difficulty: Number, // 1-5
    
    // Performance
    timeSpent: Number, // seconds
    attempts: Number,
    hintsUsed: Number,
    correct: Boolean,
    score: Number,
    maxScore: Number,
    
    // Analysis
    commonMistakes: [String],
    conceptsStruggled: [String]
  }],
  
  // Overall Performance
  totalScore: Number,
  maxScore: Number,
  percentage: Number,
  completionTime: Number, // seconds
  
  // Behavioral Analytics
  behavior: {
    tabSwitches: Number,
    copyPasteAttempts: Number,
    unusualTiming: Boolean,
    suspiciousPatterns: [String]
  },
  
  // AI Insights
  aiInsights: {
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    predictedGrade: String
  }
}

// Indexes
db.assessment_analytics.createIndex({ studentId: 1, submittedAt: -1 });
db.assessment_analytics.createIndex({ assessmentId: 1 });
db.assessment_analytics.createIndex({ offeringId: 1 });

// ============================================================================

// Lab Experiment Data (Detailed Science Logs)
db.createCollection("lab_experiments");

{
  _id: ObjectId,
  experimentId: UUID,
  userId: UUID,
  courseId: UUID,
  
  // Experiment Details
  labType: String, // PHYSICS, CHEMISTRY, BIOLOGY
  labId: String, // refraction, projectile, etc.
  experimentName: String,
  
  // Configuration
  parameters: {
    // Physics example
    angle: Number,
    velocity: Number,
    mass: Number,
    // Chemistry example
    concentration: Number,
    volume: Number,
    temperature: Number,
    // etc.
  },
  
  // Time-series Data Points
  dataPoints: [{
    timestamp: Number, // ms from start
    measurements: {
      // Dynamic based on experiment type
      position: { x: Number, y: Number, z: Number },
      velocity: Number,
      acceleration: Number,
      // etc.
    }
  }],
  
  // Results
  results: {
    finalValue: Number,
    theoreticalValue: Number,
    percentError: Number,
    conclusion: String
  },
  
  // Performance
  accuracy: Number, // percentage
  score: Number,
  timeSpent: Number, // seconds
  attempts: Number,
  hintsUsed: Number,
  
  // Student Analysis
  studentAnalysis: String,
  graphs: [String], // URLs to generated graphs
  
  // Status
  completed: Boolean,
  completedAt: ISODate,
  
  // Metadata
  createdAt: ISODate
}

// Indexes
db.lab_experiments.createIndex({ userId: 1, completedAt: -1 });
db.lab_experiments.createIndex({ courseId: 1, labId: 1 });
db.lab_experiments.createIndex({ labType: 1 });

// ============================================================================

// Aggregated Course Analytics
db.createCollection("course_analytics");

{
  _id: ObjectId,
  courseId: UUID,
  offeringId: UUID,
  
  // Time Period
  period: String, // daily, weekly, monthly
  startDate: ISODate,
  endDate: ISODate,
  
  // Enrollment Metrics
  enrollment: {
    total: Number,
    active: Number,
    inactive: Number,
    dropRate: Number
  },
  
  // Engagement Metrics
  engagement: {
    averageSessionDuration: Number, // minutes
    contentCompletionRate: Number, // percentage
    forumPostsCount: Number,
    questionsAsked: Number,
    attendanceRate: Number // for live sessions
  },
  
  // Performance Metrics
  performance: {
    averageGrade: Number,
    gradeDistribution: {
      A: Number,
      B: Number,
      C: Number,
      D: Number,
      F: Number
    },
    passRate: Number,
    averageAssessmentScore: Number,
    labCompletionRate: Number
  },
  
  // Content Analytics
  content: {
    mostViewedTopics: [{
      topicId: String,
      viewCount: Number
    }],
    leastEngagingContent: [{
      contentId: UUID,
      avgEngagement: Number
    }],
    difficultTopics: [{
      topicId: String,
      avgScore: Number,
      studentCount: Number
    }]
  },
  
  // AI-Generated Insights
  insights: {
    trends: [String],
    alerts: [String],
    recommendations: [String],
    predictedOutcomes: {
      passRate: Number,
      avgFinalGrade: Number
    }
  },
  
  generatedAt: ISODate
}

// Indexes
db.course_analytics.createIndex({ courseId: 1, startDate: -1 });
db.course_analytics.createIndex({ offeringId: 1, period: 1 });

// ============================================================================

// Student Progress Tracking
db.createCollection("student_progress");

{
  _id: ObjectId,
  studentId: UUID,
  courseId: UUID,
  offeringId: UUID,
  
  // Progress Metrics
  progress: {
    overallPercentage: Number,
    chaptersCompleted: Number,
    totalChapters: Number,
    videosWatched: Number,
    totalVideos: Number,
    assignmentsSubmitted: Number,
    totalAssignments: Number,
    labsCompleted: Number,
    totalLabs: Number
  },
  
  // Time Tracking
  timeSpent: {
    total: Number, // minutes
    byWeek: [{
      weekNumber: Number,
      minutes: Number
    }],
    byActivity: {
      videos: Number,
      reading: Number,
      quizzes: Number,
      labs: Number
    }
  },
  
  // Performance Trends
  performanceTrend: [{
    week: Number,
    averageScore: Number,
    engagementScore: Number
  }],
  
  // Predictions
  predictions: {
    expectedFinalGrade: String,
    confidence: Number, // 0-100
    riskLevel: String, // LOW, MEDIUM, HIGH
    recommendations: [String]
  },
  
  // Milestones
  milestones: [{
    name: String,
    achievedAt: ISODate,
    xpEarned: Number
  }],
  
  lastUpdated: ISODate
}

// Indexes
db.student_progress.createIndex({ studentId: 1, courseId: 1 });
db.student_progress.createIndex({ offeringId: 1 });

// ============================================================================

// System Performance Logs
db.createCollection("system_logs", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  },
  expireAfterSeconds: 2592000 // 30 days TTL
});

{
  _id: ObjectId,
  timestamp: ISODate,
  
  metadata: {
    service: String, // core, ai, realtime, labtwin
    instance: String,
    environment: String // dev, staging, prod
  },
  
  // Log Details
  level: String, // DEBUG, INFO, WARN, ERROR, FATAL
  message: String,
  
  // Context
  context: {
    userId: UUID,
    requestId: String,
    endpoint: String,
    method: String,
    statusCode: Number,
    duration: Number, // ms
    
    // Error details if applicable
    error: {
      type: String,
      message: String,
      stack: String
    }
  },
  
  // Performance Metrics
  metrics: {
    cpuUsage: Number,
    memoryUsage: Number,
    responseTime: Number,
    queueDepth: Number
  }
}

// Indexes
db.system_logs.createIndex({ "metadata.service": 1, "timestamp": -1 });
db.system_logs.createIndex({ "level": 1, "timestamp": -1 });
db.system_logs.createIndex({ "context.requestId": 1 });

// ============================================================================

// AI Service Usage Tracking (Cost Management)
db.createCollection("ai_usage_logs");

{
  _id: ObjectId,
  
  // Request Info
  requestId: String,
  userId: UUID,
  service: String, // openai, google_ai, anthropic
  model: String, // gpt-4, gemini-pro, etc.
  
  // Operation
  operation: String, // generate_content, grade_essay, generate_quiz
  
  // Tokens & Cost
  tokensUsed: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  cost: Number, // USD
  
  // Performance
  latency: Number, // ms
  cached: Boolean,
  cacheHit: Boolean,
  
  // Response Quality (if available)
  quality: {
    rating: Number, // 1-5
    feedback: String
  },
  
  timestamp: ISODate
}

// Indexes
db.ai_usage_logs.createIndex({ userId: 1, timestamp: -1 });
db.ai_usage_logs.createIndex({ service: 1, model: 1, timestamp: -1 });
db.ai_usage_logs.createIndex({ operation: 1 });

// Create daily cost aggregation view
db.createView("daily_ai_costs", "ai_usage_logs", [
  {
    $group: {
      _id: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        service: "$service"
      },
      totalCost: { $sum: "$cost" },
      totalTokens: { $sum: "$tokensUsed.total" },
      requestCount: { $sum: 1 }
    }
  },
  { $sort: { "_id.date": -1 } }
]);
```

### 4.3 Redis Cache Schema

```redis
# ============================================================================
# CACHE KEY PATTERNS & STRATEGIES
# ============================================================================

# Session Management
session:{sessionId} -> JSON
  TTL: 1 day
  Data: { userId, role, permissions, lastActivity }

# User Data Caching
user:profile:{userId} -> JSON
  TTL: 30 minutes
  Data: Full user profile with preferences

user:courses:{userId} -> JSON
  TTL: 15 minutes
  Data: List of enrolled courses

user:achievements:{userId} -> JSON
  TTL: 1 hour
  Data: Unlocked achievements

# Course Content Caching
course:details:{courseId} -> JSON
  TTL: 1 hour
  Data: Full course information

course:content:{courseId}:{chapterId} -> JSON
  TTL: 2 hours
  Data: Chapter content (videos, reading materials)

course:syllabus:{courseId} -> JSON
  TTL: 6 hours
  Data: Complete course syllabus

# Assessment Caching
assessment:questions:{assessmentId} -> JSON
  TTL: 2 hours
  Data: All questions for an assessment

assessment:settings:{assessmentId} -> JSON
  TTL: 1 hour
  Data: Time limits, attempts, etc.

assessment:results:{submissionId} -> JSON
  TTL: 15 minutes
  Data: Graded results with feedback

# Grade Caching
grades:summary:{studentId}:{courseId} -> JSON
  TTL: 15 minutes
  Data: Aggregated grade summary

grades:transcript:{studentId} -> JSON
  TTL: 30 minutes
  Data: Full transcript

# Analytics Caching
analytics:dashboard:{userId} -> JSON
  TTL: 10 minutes
  Data: Dashboard statistics

analytics:course:{courseId}:{period} -> JSON
  TTL: 1 hour
  Data: Course-wide analytics

# Lab Results Caching
lab:results:{userId}:{labId} -> JSON
  TTL: 1 hour
  Data: Lab experiment results

# Leaderboard Caching (Sorted Sets)
leaderboard:course:{courseId} -> ZSET
  TTL: 5 minutes
  Data: {studentId: score}

leaderboard:global:xp -> ZSET
  TTL: 10 minutes
  Data: {userId: totalXP}

# Search Results Caching
search:courses:{query_hash} -> JSON
  TTL: 20 minutes
  Data: Search results

# Rate Limiting (Token Bucket)
ratelimit:api:{userId} -> STRING
  TTL: 1 minute
  Data: Request count

ratelimit:ai:{userId} -> STRING
  TTL: 1 hour
  Data: AI API usage count

# Real-time Communication
chat:messages:{roomId} -> LIST
  TTL: 1 hour
  Data: Recent 100 messages (FIFO)

chat:online:{roomId} -> SET
  TTL: 5 minutes
  Data: Set of online user IDs

presence:user:{userId} -> STRING
  TTL: 5 minutes
  Data: Online status

# Notifications
notifications:unread:{userId} -> LIST
  TTL: 1 hour
  Data: Unread notification IDs

# Job Queue (BullMQ)
bull:{queueName}:{jobId} -> HASH
  Data: Job details and status

# Distributed Locks
lock:assessment:{assessmentId} -> STRING
  TTL: 10 seconds
  Data: Lock owner (prevents concurrent edits)

lock:grading:{submissionId} -> STRING
  TTL: 30 seconds
  Data: Lock owner

# Cache Warming Queue
cache:warm:queue -> LIST
  Data: List of cache keys to warm

# API Response Caching
api:response:{endpoint_hash}:{params_hash} -> JSON
  TTL: Varies by endpoint (5-30 minutes)
  Data: Cached API response

# ============================================================================
# CACHE INVALIDATION PATTERNS (Pub/Sub)
# ============================================================================

# Channels for cache invalidation
SUBSCRIBE cache:invalidate:user:{userId}
SUBSCRIBE cache:invalidate:course:{courseId}
SUBSCRIBE cache:invalidate:assessment:{assessmentId}

# Published messages trigger cache clearing across all instances
PUBLISH cache:invalidate:user:123 '{"keys": ["user:profile:123", "user:courses:123"]}'

# ============================================================================
# REDIS CLUSTER CONFIGURATION (for scale)
# ============================================================================

# Cluster Setup
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-replica-validity-factor 10

# Memory Management
maxmemory 4gb
maxmemory-policy allkeys-lru  # Evict least recently used keys

# Persistence
appendonly yes
appendfsync everysec  # Balance between performance and durability

# ============================================================================
# CACHE WARMING STRATEGY
# ============================================================================

# On-demand warming (triggered by predictable access patterns)
# Example: Warm course content when student logs in

# Scheduled warming (cron jobs)
# Example: Warm popular courses every hour

# Predictive warming (ML-based)
# Example: Pre-fetch content based on student behavior patterns
```

### 4.4 TimescaleDB / ClickHouse (Advanced Analytics - Optional)

```sql
-- For very large scale analytics (100k+ students)
-- Use TimescaleDB (PostgreSQL extension) or ClickHouse

-- ============================================================================
-- TIMESCALEDB SCHEMA (Time-series optimized)
-- ============================================================================

-- Learning Activity Metrics (High-frequency inserts)
CREATE TABLE learning_activity_metrics (
    time TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL,
    course_id UUID,
    activity_type VARCHAR(50),
    duration INTEGER, -- seconds
    engagement_score INTEGER, -- 0-100
    content_id UUID,
    device_type VARCHAR(20),
    metadata JSONB
);

-- Convert to hypertable (time-series optimization)
SELECT create_hypertable('learning_activity_metrics', 'time');

-- Create indexes
CREATE INDEX idx_activity_user_time ON learning_activity_metrics(user_id, time DESC);
CREATE INDEX idx_activity_course_time ON learning_activity_metrics(course_id, time DESC);

-- Compression policy (compress data older than 7 days)
ALTER TABLE learning_activity_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'user_id, course_id'
);

SELECT add_compression_policy('learning_activity_metrics', INTERVAL '7 days');

-- Retention policy (drop data older than 2 years)
SELECT add_retention_policy('learning_activity_metrics', INTERVAL '2 years');

-- ============================================================================
-- CONTINUOUS AGGREGATES (Materialized Views that auto-update)
-- ============================================================================

-- Daily user activity summary
CREATE MATERIALIZED VIEW daily_user_activity
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS day,
    user_id,
    course_id,
    COUNT(*) AS activity_count,
    SUM(duration) AS total_time,
    AVG(engagement_score) AS avg_engagement
FROM learning_activity_metrics
GROUP BY day, user_id, course_id;

-- Refresh policy (update every hour)
SELECT add_continuous_aggregate_policy('daily_user_activity',
    start_offset => INTERVAL '1 month',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- ============================================================================
-- CLICKHOUSE SCHEMA (OLAP for complex analytics)
-- ============================================================================

-- Use ClickHouse for very complex analytical queries
-- Supports 1B+ rows with sub-second query times

CREATE TABLE learning_activities (
    timestamp DateTime,
    user_id UUID,
    course_id UUID,
    activity_type LowCardinality(String),
    duration UInt32,
    engagement_score UInt8,
    content_id UUID,
    device_type LowCardinality(String),
    metadata String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (user_id, timestamp);

-- Aggregating data for fast queries
SELECT
    toStartOfDay(timestamp) AS day,
    user_id,
    course_id,
    count() AS activities,
    sum(duration) AS total_duration,
    avg(engagement_score) AS avg_engagement
FROM learning_activities
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY day, user_id, course_id
ORDER BY day DESC;
```

---

## 5. CACHING ARCHITECTURE - MULTI-LEVEL OPTIMIZED

### 5.1 Comprehensive Caching Strategy

```yaml
Multi-Level Caching Architecture:

L1 - Application Memory Cache (In-Process):
  Technology: Node.js Map with LRU eviction
  Scope: Single service instance
  Size Limit: 100MB per service
  
  Use Cases:
    - Configuration data (1 hour TTL)
    - Frequently accessed lookups (user roles, permissions)
    - Computed values (grade calculations)
    - Hot data (currently active sessions)
  
  Implementation:
    ```typescript
    import { LRUCache } from 'lru-cache';
    
    const appCache = new LRUCache({
      max: 1000, // max items
      maxSize: 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => JSON.stringify(value).length,
      ttl: 1000 * 60 * 15, // 15 minutes default
    });
    
    // Usage
    const getCachedUser = async (userId) => {
      const cacheKey = `user:${userId}`;
      let user = appCache.get(cacheKey);
      
      if (!user) {
        user = await fetchUserFromL2OrDB(userId);
        appCache.set(cacheKey, user);
      }
      
      return user;
    };
    ```

L2 - Redis Cache (Distributed):
  Technology: Redis Cluster with persistence
  Architecture: Master-Slave with Sentinel for HA
  
  Configuration:
    - Memory: 4GB per node
    - Nodes: 3 master + 3 replica
    - Eviction: allkeys-lru
    - Persistence: AOF + RDB snapshots
  
  TTL Strategy by Data Type:
    User Data:
      - User profiles: 30 minutes
      - User sessions: 1 day
      - User preferences: 1 hour
      - User achievements: 1 hour
    
    Course Data:
      - Course details: 1 hour
      - Course content: 2 hours
      - Syllabus: 6 hours
      - Course listings: 15 minutes
    
    Assessment Data:
      - Assessment questions: 2 hours
      - Assessment settings: 1 hour
      - Student submissions: 30 minutes
      - Graded results: 15 minutes
    
    Analytics Data:
      - Dashboard stats: 10 minutes
      - Course analytics: 1 hour
      - Trend data: 2 hours
      - Leaderboards: 5 minutes
    
    Real-time Data:
      - Chat messages: 1 hour (recent 100)
      - Online presence: 5 minutes
      - Typing indicators: 30 seconds
      - Notifications: 1 hour
  
  Implementation:
    ```typescript
    import { createClient } from 'redis';
    
    const redis = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: 6379,
      },
      password: process.env.REDIS_PASSWORD,
    });
    
    // Cache-aside pattern
    async function getCourseWithCache(courseId: string) {
      const cacheKey = `course:details:${courseId}`;
      
      // Try L1 cache first
      let course = appCache.get(cacheKey);
      if (course) return course;
      
      // Try L2 (Redis) cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        course = JSON.parse(cached);
        appCache.set(cacheKey, course); // Populate L1
        return course;
      }
      
      // Fetch from database
      course = await db.course.findUnique({ where: { id: courseId } });
      
      // Populate both cache levels
      await redis.setEx(cacheKey, 3600, JSON.stringify(course)); // 1 hour
      appCache.set(cacheKey, course);
      
      return course;
    }
    ```

L3 - CDN Cache (Global Edge):
  Technology: CloudFlare + Google Cloud CDN
  Coverage: Global edge locations
  
  Content Types & TTL:
    Static Assets:
      - JS/CSS bundles: 1 year (with versioning)
      - Images: 30 days
      - Fonts: 1 year
      - Favicon: 1 week
    
    Dynamic Content:
      - Course materials (PDFs): 12 hours
      - Videos: 7 days
      - User avatars: 6 hours
      - Generated images: 1 day
    
    API Responses (for cacheable endpoints):
      - Public course listings: 5 minutes
      - News articles: 10 minutes
      - Static content: 1 hour
  
  Cache Control Headers:
    ```typescript
    // Next.js API route example
    export async function GET(request: Request) {
      const courses = await getPublicCourses();
      
      return new Response(JSON.stringify(courses), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'CDN-Cache-Control': 'public, max-age=300',
          'Vercel-CDN-Cache-Control': 'public, max-age=300',
        },
      });
    }
    ```
  
  Cache Tag-Based Invalidation:
    ```typescript
    // Purge CDN cache when course updated
    async function updateCourse(courseId: string, data: any) {
      await db.course.update({ where: { id: courseId }, data });
      
      // Invalidate CDN cache
      await fetch('https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: [`course:${courseId}`, 'courses:list'],
        }),
      });
      
      // Invalidate Redis cache
      await redis.del(`course:details:${courseId}`);
      
      // Invalidate L1 cache
      appCache.delete(`course:details:${courseId}`);
    }
    ```

L4 - Database Query Result Cache:
  Technology: PostgreSQL query cache + Redis
  Scope: Complex, expensive queries
  
  Use Cases:
    - Aggregated analytics (course-wide statistics)
    - Complex joins (student progress with all related data)
    - Report generation queries
    - Dashboard data compilation
  
  TTL: 1 hour with manual invalidation on data changes
  
  Implementation:
    ```typescript
    async function getCourseAnalytics(courseId: string, period: string) {
      const cacheKey = `analytics:course:${courseId}:${period}`;
      
      // Check cache
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      
      // Complex query
      const analytics = await db.$queryRaw`
        SELECT 
          c.id,
          COUNT(DISTINCT r.student_id) as total_students,
          AVG(gs.overall_score) as avg_score,
          COUNT(DISTINCT a.id) as total_assessments,
          AVG(sub.score / sub.max_score * 100) as avg_assessment_score
        FROM courses c
        LEFT JOIN course_offerings co ON c.id = co.course_id
        LEFT JOIN class_registrations r ON co.id = r.offering_id
        LEFT JOIN grade_summaries gs ON r.student_id = gs.student_id AND r.offering_id = gs.offering_id
        LEFT JOIN assessments a ON co.id = a.offering_id
        LEFT JOIN assessment_submissions sub ON a.id = sub.assessment_id
        WHERE c.id = ${courseId}
        GROUP BY c.id
      `;
      
      // Cache for 1 hour
      await redis.setEx(cacheKey, 3600, JSON.stringify(analytics));
      
      return analytics;
    }
    ```

Cache Key Naming Convention:
  Pattern: {namespace}:{resource}:{id}:{variant}
  
  Examples:
    - user:profile:123:full
    - user:courses:123:active
    - course:content:456:chapter:789
    - assessment:questions:101:v2
    - analytics:dashboard:student:123:today
    - chat:messages:room:987:recent
    - leaderboard:course:456:weekly

Cache Invalidation Strategies:

1. Write-Through Pattern:
   - Update cache immediately on data modification
   - Ensures cache-data consistency
   - Used for: User profiles, course metadata
   
   ```typescript
   async function updateUserProfile(userId: string, data: any) {
     // Update database
     const user = await db.user.update({
       where: { id: userId },
       data,
     });
     
     // Update cache immediately
     const cacheKey = `user:profile:${userId}`;
     await redis.setEx(cacheKey, 1800, JSON.stringify(user));
     appCache.set(cacheKey, user);
     
     return user;
   }
   ```

2. Write-Behind Pattern:
   - Async cache update via message queue
   - Better performance for write-heavy operations
   - Used for: Analytics data, log aggregations
   
   ```typescript
   async function logUserActivity(activity: Activity) {
     // Write to database
     await db.activity.create({ data: activity });
     
     // Queue cache update (non-blocking)
     await queue.add('update-analytics-cache', {
       userId: activity.userId,
       type: 'activity',
     });
   }
   ```

3. Cache-Aside Pattern (Lazy Loading):
   - Load data on cache miss
   - Most common pattern
   - Used for: Most read operations
   
   ```typescript
   async function getAssessment(id: string) {
     const cacheKey = `assessment:${id}`;
     
     // Try cache
     let assessment = await redis.get(cacheKey);
     if (assessment) return JSON.parse(assessment);
     
     // Cache miss - load from DB
     assessment = await db.assessment.findUnique({ where: { id } });
     
     // Populate cache
     await redis.setEx(cacheKey, 7200, JSON.stringify(assessment));
     
     return assessment;
   }
   ```

4. Pub/Sub Cache Invalidation:
   - Real-time cache invalidation across cluster
   - Used for: Multi-instance deployments
   
   ```typescript
   // Publisher (on data update)
   async function updateCourse(courseId: string, data: any) {
     await db.course.update({ where: { id: courseId }, data });
     
     // Broadcast invalidation to all instances
     await redis.publish('cache:invalidate', JSON.stringify({
       keys: [
         `course:details:${courseId}`,
         `course:content:${courseId}:*`,
       ],
     }));
   }
   
   // Subscriber (all instances)
   redis.subscribe('cache:invalidate', (message) => {
     const { keys } = JSON.parse(message);
     keys.forEach(pattern => {
       if (pattern.includes('*')) {
         // Pattern matching for wildcard keys
         appCache.forEach((value, key) => {
           if (key.match(pattern.replace('*', '.*'))) {
             appCache.delete(key);
           }
         });
       } else {
         appCache.delete(pattern);
       }
     });
   });
   ```

Cache Warming Strategies:

1. On-Demand Warming:
   - Triggered by predictable access patterns
   - Example: Warm course content when student enrolls
   
   ```typescript
   async function enrollStudent(studentId: string, courseId: string) {
     // Enroll student
     await db.registration.create({ data: { studentId, courseId } });
     
     // Warm frequently accessed data
     await Promise.all([
       warmCourseContent(courseId),
       warmAssessments(courseId),
       warmAnalytics(studentId, courseId),
     ]);
   }
   ```

2. Scheduled Warming:
   - Cron jobs to warm popular content
   - Example: Warm trending courses every hour
   
   ```typescript
   // Cron job (runs hourly)
   cron.schedule('0 * * * *', async () => {
     const popularCourses = await getPopularCourses(10);
     
     for (const course of popularCourses) {
       await warmCourseData(
        course.id);
     }
   });
   ```

3. Predictive Warming:
   - ML-based prediction of next access
   - Example: Pre-fetch next lesson based on student behavior
   
   ```typescript
   async function predictAndWarmContent(studentId: string) {
     // Get AI prediction of next content
     const prediction = await aiService.predictNextContent(studentId);
     
     // Pre-fetch predicted content
     for (const contentId of prediction.contentIds) {
       await warmContent(contentId);
     }
   }
   ```

Cache Monitoring & Analytics:

Metrics to Track:
  - Hit rate (target: >90%)
  - Miss rate
  - Eviction rate
  - Memory usage
  - Cache stampede occurrences
  - Invalidation frequency
  - Average response time (with vs without cache)

Monitoring Setup:
  ```typescript
  // Redis monitoring
  setInterval(async () => {
    const info = await redis.info('stats');
    
    const metrics = {
      keyspace_hits: extractMetric(info, 'keyspace_hits'),
      keyspace_misses: extractMetric(info, 'keyspace_misses'),
      evicted_keys: extractMetric(info, 'evicted_keys'),
      used_memory: extractMetric(info, 'used_memory'),
    };
    
    const hitRate = metrics.keyspace_hits / 
                    (metrics.keyspace_hits + metrics.keyspace_misses) * 100;
    
    // Send to monitoring system
    await sendMetric('cache.hit_rate', hitRate);
    await sendMetric('cache.evictions', metrics.evicted_keys);
  }, 60000); // Every minute
  ```

Cache Stampede Prevention:

Problem: When cache expires, many requests simultaneously query DB

Solution 1 - Mutex Lock:
  ```typescript
  import { createClient } from 'redis';
  
  async function getCourseWithMutex(courseId: string) {
    const cacheKey = `course:${courseId}`;
    const lockKey = `lock:course:${courseId}`;
    
    // Try cache
    let course = await redis.get(cacheKey);
    if (course) return JSON.parse(course);
    
    // Try to acquire lock
    const lockAcquired = await redis.set(lockKey, '1', {
      NX: true, // Only set if not exists
      EX: 10,   // 10 second timeout
    });
    
    if (lockAcquired) {
      // This request loads the data
      course = await db.course.findUnique({ where: { id: courseId } });
      await redis.setEx(cacheKey, 3600, JSON.stringify(course));
      await redis.del(lockKey);
      return course;
    } else {
      // Wait a bit and retry cache
      await new Promise(resolve => setTimeout(resolve, 100));
      return getCourseWithMutex(courseId); // Retry
    }
  }
  ```

Solution 2 - Probabilistic Early Expiration:
  ```typescript
  async function getCourseWithProbabilisticRefresh(courseId: string) {
    const cacheKey = `course:${courseId}`;
    const ttl = 3600; // 1 hour
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      // Check remaining TTL
      const remainingTTL = await redis.ttl(cacheKey);
      
      // Probabilistic early refresh
      // Refresh if: random() < (delta / ttl)
      // Where delta = current_ttl - new_ttl
      const delta = ttl * 0.1; // 10% of TTL
      const refreshProbability = delta / remainingTTL;
      
      if (Math.random() < refreshProbability) {
        // Async refresh in background
        refreshCacheInBackground(courseId);
      }
      
      return JSON.parse(cached);
    }
    
    // Cache miss - normal flow
    const course = await db.course.findUnique({ where: { id: courseId } });
    await redis.setEx(cacheKey, ttl, JSON.stringify(course));
    return course;
  }
  ```

Fallback Mechanisms:

1. Graceful Degradation:
   ```typescript
   async function getCourseResilient(courseId: string) {
     try {
       // Try L1 cache
       let course = appCache.get(`course:${courseId}`);
       if (course) return course;
       
       // Try L2 cache (Redis)
       const cached = await redis.get(`course:${courseId}`);
       if (cached) return JSON.parse(cached);
     } catch (error) {
       console.error('Cache error:', error);
       // Continue to database
     }
     
     // Fallback to database
     return await db.course.findUnique({ where: { id: courseId } });
   }
   ```

2. Circuit Breaker for Cache:
   ```typescript
   import CircuitBreaker from 'opossum';
   
   const redisCacheGet = new CircuitBreaker(async (key: string) => {
     return await redis.get(key);
   }, {
     timeout: 1000, // 1 second
     errorThresholdPercentage: 50,
     resetTimeout: 30000, // 30 seconds
   });
   
   redisCacheGet.fallback(() => null); // Return null on circuit open
   
   async function getCourseWithCircuitBreaker(courseId: string) {
     const cacheKey = `course:${courseId}`;
     
     try {
       const cached = await redisCacheGet.fire(cacheKey);
       if (cached) return JSON.parse(cached);
     } catch (error) {
       console.warn('Redis circuit breaker open, using database');
     }
     
     return await db.course.findUnique({ where: { id: courseId } });
   }
   ```

Cost-Benefit Analysis:

Cache Efficiency Metrics:
  - Cost per cache hit: ~$0.0001
  - Cost per database query: ~$0.001
  - Savings per hit: ~$0.0009
  
  With 90% hit rate:
    - 1M requests/day
    - 900K cache hits = $90 cost
    - 100K DB queries = $100 cost
    - Without cache: 1M DB queries = $1000 cost
    - Total savings: $810/day = $24,300/month
  
Cache ROI:
  - Redis infrastructure: ~$200/month
  - Development & maintenance: ~$500/month
  - Total cost: $700/month
  - Savings: $24,300/month
  - ROI: 3371%
```

---

## 6. PERFORMANCE OPTIMIZATION - COMPREHENSIVE

### 6.1 Database Query Optimization

```typescript
// ============================================================================
// QUERY OPTIMIZATION TECHNIQUES
// ============================================================================

// 1. SELECT ONLY NEEDED COLUMNS (Avoid SELECT *)
// ❌ Bad
const user = await prisma.user.findUnique({
  where: { id: userId },
});

// ✅ Good
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    email: true,
    full_name: true,
    avatar_url: true,
    role: true,
  },
});

// 2. USE INDEXES EFFECTIVELY
// Ensure common WHERE clauses have indexes

// ❌ Slow query without index
SELECT * FROM users WHERE email = 'user@example.com';

// ✅ Create index
CREATE INDEX idx_users_email ON users(email);

// 3. BATCH OPERATIONS (N+1 Problem)
// ❌ Bad - N+1 queries
const students = await prisma.user.findMany({
  where: { role: 'STUDENT' },
});

for (const student of students) {
  const grades = await prisma.grade_entries.findMany({
    where: { student_id: student.id },
  });
  // Process grades...
}

// ✅ Good - Single query with include
const studentsWithGrades = await prisma.user.findMany({
  where: { role: 'STUDENT' },
  include: {
    grade_entries: {
      where: {
        is_final: true,
      },
    },
  },
});

// 4. PAGINATION FOR LARGE DATASETS
// ❌ Bad - Load all records
const allCourses = await prisma.course.findMany();

// ✅ Good - Cursor-based pagination
const courses = await prisma.course.findMany({
  take: 20,
  skip: offset,
  orderBy: {
    created_at: 'desc',
  },
});

// Even better - Cursor pagination (for infinite scroll)
const courses = await prisma.course.findMany({
  take: 20,
  cursor: lastCourseId ? { id: lastCourseId } : undefined,
  skip: lastCourseId ? 1 : 0, // Skip the cursor
  orderBy: {
    created_at: 'desc',
  },
});

// 5. AGGREGATE QUERIES (Use database for calculations)
// ❌ Bad - Fetch all and calculate in app
const submissions = await prisma.assessment_submissions.findMany({
  where: { assessment_id: assessmentId },
});
const avgScore = submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length;

// ✅ Good - Let database do the work
const stats = await prisma.assessment_submissions.aggregate({
  where: { assessment_id: assessmentId },
  _avg: {
    score: true,
  },
  _count: true,
  _max: {
    score: true,
  },
  _min: {
    score: true,
  },
});

// 6. RAW QUERIES FOR COMPLEX OPERATIONS
// When Prisma ORM is too slow, use raw SQL
const analytics = await prisma.$queryRaw`
  SELECT 
    c.id,
    c.name,
    COUNT(DISTINCT r.student_id) as student_count,
    AVG(gs.overall_score) as avg_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gs.overall_score) as median_score
  FROM courses c
  LEFT JOIN course_offerings co ON c.id = co.course_id
  LEFT JOIN class_registrations r ON co.id = r.offering_id
  LEFT JOIN grade_summaries gs ON gs.offering_id = co.id
  WHERE c.status = 'ACTIVE'
  GROUP BY c.id, c.name
  HAVING COUNT(DISTINCT r.student_id) > 10
  ORDER BY avg_score DESC
  LIMIT 10
`;

// 7. CONNECTION POOLING
// Configure Prisma connection pool
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_timeout = 20
  pool_size    = 10
}

// Or use PgBouncer for better control
// DATABASE_URL="postgresql://user:pass@pgbouncer:6432/aeroedu?pgbouncer=true"

// 8. QUERY CACHING WITH PRISMA ACCELERATE
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const prisma = new PrismaClient().$extends(withAccelerate());

// Cache query for 1 hour
const courses = await prisma.course.findMany({
  where: { status: 'ACTIVE' },
  cacheStrategy: {
    ttl: 3600,
    swr: 600, // Stale-while-revalidate
  },
});

// 9. PREPARED STATEMENTS (Automatic with Prisma)
// Prisma automatically uses prepared statements
// This prevents SQL injection and improves performance

// 10. ANALYZE QUERY PERFORMANCE
// Use EXPLAIN ANALYZE in PostgreSQL

const result = await prisma.$queryRawUnsafe(`
  EXPLAIN ANALYZE
  SELECT * FROM assessment_submissions
  WHERE student_id = $1 AND submitted_year = 2025
  ORDER BY submitted_at DESC
  LIMIT 20
`, studentId);

console.log(result); // Shows query plan and execution time
```

### 6.2 API Response Optimization

```typescript
// ============================================================================
// API RESPONSE OPTIMIZATION STRATEGIES
// ============================================================================

// 1. COMPRESSION (gzip/brotli)
import { NextResponse } from 'next/server';
import { compress } from 'compression';

export async function GET(request: Request) {
  const data = await getLargeDataset();
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip', // or 'br' for brotli
    },
  });
}

// Next.js automatically compresses responses > 2KB

// 2. FIELD SELECTION (GraphQL-style)
// Allow clients to request only needed fields

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fields = searchParams.get('fields')?.split(',') || [];
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: fields.length > 0 ? 
      fields.reduce((acc, field) => ({ ...acc, [field]: true }), {}) :
      undefined,
  });
  
  return NextResponse.json(user);
}

// Usage: GET /api/users/123?fields=id,email,full_name

// 3. RESPONSE PAGINATION
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

async function getPaginatedCourses(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<Course>> {
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    prisma.course.findMany({
      take: limit,
      skip,
      orderBy: { created_at: 'desc' },
    }),
    prisma.course.count(),
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// 4. STREAMING RESPONSES (for large data)
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const records = await getLargeDataset();
      
      controller.enqueue(encoder.encode('['));
      
      for (let i = 0; i < records.length; i++) {
        const json = JSON.stringify(records[i]);
        controller.enqueue(encoder.encode(json));
        
        if (i < records.length - 1) {
          controller.enqueue(encoder.encode(','));
        }
        
        // Yield control periodically
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      controller.enqueue(encoder.encode(']'));
      controller.close();
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    },
  });
}

// 5. CONDITIONAL REQUESTS (HTTP Caching)
export async function GET(request: Request) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  
  if (!course) {
    return new Response('Not found', { status: 404 });
  }
  
  const etag = `"${course.id}-${course.updated_at.getTime()}"`;
  const ifNoneMatch = request.headers.get('if-none-match');
  
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 }); // Not Modified
  }
  
  return new Response(JSON.stringify(course), {
    headers: {
      'Content-Type': 'application/json',
      'ETag': etag,
      'Cache-Control': 'private, max-age=300', // 5 minutes
    },
  });
}

// 6. REQUEST BATCHING
// Allow multiple operations in single request

interface BatchRequest {
  operations: Array<{
    id: string;
    method: string;
    path: string;
    body?: any;
  }>;
}

export async function POST(request: Request) {
  const { operations }: BatchRequest = await request.json();
  
  const results = await Promise.all(
    operations.map(async (op) => {
      try {
        const result = await executeOperation(op);
        return { id: op.id, status: 200, data: result };
      } catch (error) {
        return { id: op.id, status: 500, error: error.message };
      }
    })
  );
  
  return NextResponse.json({ results });
}

// 7. RESPONSE CACHING AT API LEVEL
import { unstable_cache } from 'next/cache';

const getCachedCourses = unstable_cache(
  async () => {
    return await prisma.course.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        code: true,
        name: true,
        credits: true,
      },
    });
  },
  ['active-courses'],
  {
    revalidate: 300, // 5 minutes
    tags: ['courses'],
  }
);

export async function GET() {
  const courses = await getCachedCourses();
  return NextResponse.json(courses);
}

// Invalidate cache on update
import { revalidateTag } from 'next/cache';

export async function PUT(request: Request) {
  // Update course...
  revalidateTag('courses');
  
  return NextResponse.json({ success: true });
}
```

### 6.3 Frontend Performance Optimization

```typescript
// ============================================================================
// FRONTEND OPTIMIZATION STRATEGIES
// ============================================================================

// 1. CODE SPLITTING & LAZY LOADING
// Next.js app/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const LabSimulator = dynamic(() => import('@/components/LabSimulator'), {
  loading: () => <p>Loading simulator...</p>,
  ssr: false, // Disable server-side rendering for this component
});

const ChartComponent = dynamic(() => import('@/components/Charts'), {
  loading: () => <Skeleton />,
});

export default function LabPage() {
  return (
    <div>
      <h1>Virtual Lab</h1>
      <LabSimulator />
      <ChartComponent />
    </div>
  );
}

// 2. IMAGE OPTIMIZATION
import Image from 'next/image';

// Automatic optimization with Next.js Image
<Image
  src="/course-banner.jpg"
  alt="Course Banner"
  width={1200}
  height={630}
  quality={80}
  priority // Load immediately (for above-the-fold images)
  placeholder="blur" // Show blur placeholder while loading
  blurDataURL="data:image/..." // Low-quality placeholder
/>

// Responsive images
<Image
  src="/banner.jpg"
  alt="Banner"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  style={{ objectFit: 'cover' }}
/>

// 3. VIRTUAL SCROLLING (for long lists)
import { FixedSizeList } from 'react-window';

function StudentList({ students }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {students[index].name}
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={students.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// 4. MEMOIZATION
import { memo, useMemo, useCallback } from 'react';

// Memoize component
const StudentCard = memo(({ student }) => {
  return <div>{student.name}</div>;
});

// Memoize expensive calculations
function AnalyticsDashboard({ data }) {
  const processedData = useMemo(() => {
    // Expensive calculation
    return data.map(item => ({
      ...item,
      average: calculateAverage(item.scores),
      trend: calculateTrend(item.history),
    }));
  }, [data]);
  
  const handleExport = useCallback(() => {
    exportToCSV(processedData);
  }, [processedData]);
  
  return (
    <div>
      {processedData.map(item => (
        <div key={item.id}>{item.average}</div>
      ))}
      <button onClick={handleExport}>Export</button>
    </div>
  );
}

// 5. DEBOUNCING & THROTTLING
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

function SearchCourses() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  // Debounce search - only search after user stops typing
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery) => {
      const response = await fetch(`/api/courses/search?q=${searchQuery}`);
      const data = await response.json();
      setResults(data);
    }, 300), // 300ms delay
    []
  );
  
  useEffect(() => {
    if (query.length > 2) {
      debouncedSearch(query);
    }
  }, [query, debouncedSearch]);
  
  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search courses..."
    />
  );
}

// 6. PREFETCHING & PRELOADING
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function CourseList({ courses }) {
  const router = useRouter();
  
  return (
    <div>
      {courses.map(course => (
        <Link
          key={course.id}
          href={`/courses/${course.id}`}
          // Prefetch on hover
          prefetch={true}
          onMouseEnter={() => {
            // Preload data
            router.prefetch(`/courses/${course.id}`);
          }}
        >
          {course.name}
        </Link>
      ))}
    </div>
  );
}

// 7. SERVICE WORKER CACHING
// public/sw.js
const CACHE_NAME = 'aeroedu-v1';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// 8. BUNDLE OPTIMIZATION
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1];
                return `vendor.${packageName.replace('@', '')}`;
              },
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Compress output
  compress: true,
  
  // Remove console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// 9. FONT OPTIMIZATION
import { Inter, Roboto_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

// 10. CRITICAL CSS
// Inline critical CSS in <head>
// Next.js does this automatically with App Router

// 11. WEB VITALS MONITORING
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify(metric);
  const url = '/api/analytics/web-vitals';
  
  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### 6.4 Network Optimization

```typescript
// ============================================================================
// NETWORK OPTIMIZATION
// ============================================================================

// 1. HTTP/2 SERVER PUSH
// Next.js supports HTTP/2 automatically when deployed

// 2. CONNECTION POOLING FOR EXTERNAL APIS
import { Agent } from 'https';

const agent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

async function callExternalAPI(url: string) {
  return fetch(url, {
    agent, // Reuse connections
  });
}

// 3. REQUEST DEDUPLICATION
const requestCache = new Map<string, Promise<any>>();

async function deduplicatedFetch(url: string) {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }
  
  const promise = fetch(url).then(r => r.json());
  requestCache.set(url, promise);
  
  // Clear after 5 seconds
  setTimeout(() => requestCache.delete(url), 5000);
  
  return promise;
}

// 4. PARALLEL REQUESTS
// ❌ Sequential (slow)
const user = await fetch('/api/user');
const courses = await fetch('/api/courses');
const grades = await fetch('/api/grades');

// ✅ Parallel (fast)
const [user, courses, grades] = await Promise.all([
  fetch('/api/user').then(r => r.json()),
  fetch('/api/courses').then(r => r.json()),
  fetch('/api/grades').then(r => r.json()),
]);

// 5. WEBSOCKET CONNECTION POOLING
class WebSocketPool {
  private connections: Map<string, WebSocket> = new Map();
  private maxConnections = 3;
  
  getConnection(url: string): WebSocket {
    if (this.connections.has(url)) {
      return this.connections.get(url)!;
    }
    
    if (this.connections.size >= this.maxConnections) {
      // Close oldest connection
      const firstKey = this.connections.keys().next().value;
      this.connections.get(firstKey)?.close();
      this.connections.delete(firstKey);
    }
    
    const ws = new WebSocket(url);
    this.connections.set(url, ws);
    
    return ws;
  }
}

const wsPool = new WebSocketPool();

// 6. CDN FOR STATIC ASSETS
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production'
    ? 'https://cdn.aeroedu.vn'
    : '',
};

// 7. PRECONNECT TO EXTERNAL DOMAINS
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://cdn.aeroedu.vn" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 7. OBSERVABILITY - COMPREHENSIVE MONITORING

### 7.1 Distributed Tracing Setup

```typescript
// ============================================================================
// OPENTELEMETRY DISTRIBUTED TRACING
// ============================================================================

// instrumentation.ts (Next.js 13+)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'aeroedu-core',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    environment: process.env.NODE_ENV,
  }),
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-prisma': {
        enabled: true,
      },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

// ============================================================================
// CUSTOM SPANS FOR BUSINESS LOGIC
// ============================================================================

import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('aeroedu-core', '1.0.0');

async function gradeAssessment(submissionId: string) {
  // Create a span
  return tracer.startActiveSpan('grade-assessment', async (span) => {
    try {
      span.setAttribute('submission.id', submissionId);
      
      // Get submission
      const submission = await tracer.startActiveSpan('db.get-submission', async (dbSpan) => {
        const result = await prisma.assessment_submissions.findUnique({
          where: { id: submissionId },
        });
        dbSpan.end();
        return result;
      });
      
      span.setAttribute('assessment.id', submission.assessment_id);
      
      // Call AI service for grading
      const grade = await tracer.startActiveSpan('ai.grade', async (aiSpan) => {
        aiSpan.setAttribute('ai.model', 'gpt-4');
        
        const result = await fetch('http://ai-service:8000/api/v1/ai/grade/essay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'traceparent': `00-${span.spanContext().traceId}-${span.spanContext().spanId}-01`,
          },
          body: JSON.stringify({
            content: submission.answers,
            rubric: submission.rubric,
          }),
        });
        
        aiSpan.setAttribute('ai.tokens.used', result.headers.get('x-tokens-used'));
        aiSpan.end();
        
        return result.json();
      });
      
      // Update submission with grade
      await tracer.startActiveSpan('db.update-submission', async (updateSpan) => {
        await prisma.assessment_submissions.update({
          where: { id: submissionId },
          data: {
            score: grade.score,
            feedback: grade.feedback,
            graded_at: new Date(),
          },
        });
        updateSpan.end();
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('grade.score', grade.score);
      
      return grade;
      
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// ============================================================================
// REQUEST CORRELATION
// ============================================================================

// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || uuidv4();
  
  // Add to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add to response headers
  response.headers.set('x-request-id', requestId);
  
  return response;
}

// Use in API routes
export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id');
  
  // Add to all logs
  console.log({ requestId, message: 'Processing request' });
  
  // Pass to downstream services
  await fetch('http://ai-service:8000/api/grade', {
    headers: {
      'x-request-id': requestId,
    },
  });
}
```

### 7.2 Metrics & Monitoring

```typescript
// ============================================================================
// PROMETHEUS METRICS
// ============================================================================

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// HTTP Request Metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Database Metrics
const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
  registers: [register],
});

const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state'], // active, idle, waiting
  registers: [register],
});

// Cache Metrics
const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'], // redis, memory
  registers: [register],
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register],
});

// AI Service Metrics
const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI service requests',
  labelNames: ['provider', 'model', 'operation'],
  buckets: [1, 3, 5, 10, 20, 30, 60],
  registers: [register],
});

const aiTokensUsed = new Counter({
  name: 'ai_tokens_used_total',
  help: 'Total AI tokens used',
  labelNames: ['provider', 'model', 'token_type'], // prompt, completion
  registers: [register],
});

const aiCostTotal = new Counter({
  name: 'ai_cost_total_usd',
  help: 'Total AI cost in USD',
  labelNames: ['provider', 'model'],
  registers: [register],
});

// Business Metrics
const studentEnrollments = new Counter({
  name: 'student_enrollments_total',
  help: 'Total student course enrollments',
  labelNames: ['course_id'],
  registers: [register],
});

const assessmentSubmissions = new Counter({
  name: 'assessment_submissions_total',
  help: 'Total assessment submissions',
  labelNames: ['assessment_type'], // QUIZ, ASSIGNMENT, EXAM
  registers: [register],
});

const labCompletions = new Counter({
  name: 'lab_completions_total',
  help: 'Total lab experiment completions',
  labelNames: ['lab_type'], // PHYSICS, CHEMISTRY, BIOLOGY
  registers: [register],
});

// System Metrics
const activeUsers = new Gauge({
  name: 'active_users_current',
  help: 'Current number of active users',
  labelNames: ['user_type'], // STUDENT, TEACHER, ADMIN
  registers: [register],
});

const websocketConnections = new Gauge({
  name: 'websocket_connections_current',
  help: 'Current WebSocket connections',
  registers: [register],
});

// ============================================================================
// METRICS MIDDLEWARE
// ============================================================================

export function metricsMiddleware(req: Request, res: Response, next: Function) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();
  });
  
  next();
}

// ============================================================================
// METRICS ENDPOINT
// ============================================================================

// app/api/metrics/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const metrics = await register.metrics();
  
  return new NextResponse(metrics, {
    headers: {
      'Content-Type': register.contentType,
    },
  });
}

// ============================================================================
// DATABASE METRICS COLLECTION
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  const duration = e.duration / 1000; // Convert to seconds
  const operation = e.query.split(' ')[0]; // SELECT, INSERT, UPDATE, DELETE
  const table = extractTableName(e.query);
  
  dbQueryDuration.labels(operation, table).observe(duration);
});

// ============================================================================
// CACHE METRICS TRACKING
// ============================================================================

class MetricsEnabledCache {
  private redis: RedisClient;
  
  async get(key: string) {
    const value = await this.redis.get(key);
    
    if (value) {
      cacheHits.labels('redis').inc();
    } else {
      cacheMisses.labels('redis').inc();
    }
    
    return value;
  }
  
  async set(key: string, value: any, ttl: number) {
    return this.redis.setEx(key, ttl, JSON.stringify(value));
  }
}

// ============================================================================
// AI SERVICE METRICS
// ============================================================================

async function callAIService(provider: string, model: string, operation: string, prompt: string) {
  const start = Date.now();
  
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/ai/${operation}`, {
      method: 'POST',
      body: JSON.stringify({ prompt, model }),
    });
    
    const data = await response.json();
    
    // Record metrics
    const duration = (Date.now() - start) / 1000;
    aiRequestDuration.labels(provider, model, operation).observe(duration);
    
    if (data.usage) {
      aiTokensUsed.labels(provider, model, 'prompt').inc(data.usage.prompt_tokens);
      aiTokensUsed.labels(provider, model, 'completion').inc(data.usage.completion_tokens);
      
      const cost = calculateCost(provider, model, data.usage);
      aiCostTotal.labels(provider, model).inc(cost);
    }
    
    return data;
  } catch (error) {
    // Record error metric
    throw error;
  }
}

// ============================================================================
// BUSINESS METRICS TRACKING
// ============================================================================

async function enrollStudentInCourse(studentId: string, courseId: string) {
  const registration = await prisma.class_registrations.create({
    data: {
      student_id: studentId,
      offering_id: courseId,
      status: 'APPROVED',
    },
  });
  
  // Track metric
  studentEnrollments.labels(courseId).inc();
  
  return registration;
}

async function submitAssessment(submission: AssessmentSubmission) {
  const result = await prisma.assessment_submissions.create({
    data: submission,
  });
  
  // Track metric
  const assessment = await prisma.assessments.findUnique({
    where: { id: submission.assessment_id },
  });
  
  assessmentSubmissions.labels(assessment.type).inc();
  
  return result;
}

// ============================================================================
// ACTIVE USERS TRACKING
// ============================================================================

setInterval(async () => {
  const activeStudents = await getActiveUserCount('STUDENT');
  const activeTeachers = await getActiveUserCount('TEACHER');
  const activeAdmins = await getActiveUserCount('ADMIN');
  
  activeUsers.labels('STUDENT').set(activeStudents);
  activeUsers.labels('TEACHER').set(activeTeachers);
  activeUsers.labels('ADMIN').set(activeAdmins);
}, 60000); // Update every minute
```

### 7.3 Structured Logging

```typescript
// ============================================================================
// WINSTON STRUCTURED LOGGING
// ============================================================================

import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'aeroedu-core',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
  transports: [
    // Console (for development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // File (rotating logs)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10,
    }),
    
    // Elasticsearch (for production)
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD,
        },
      },
      index: 'aeroedu-logs',
    }),
  ],
});

// ============================================================================
// CONTEXT-AWARE LOGGING
// ============================================================================

import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();

export function withContext(context: Record<string, any>, fn: () => Promise<any>) {
  const store = new Map(Object.entries(context));
  return asyncLocalStorage.run(store, fn);
}

export function getContext(key: string) {
  return asyncLocalStorage.getStore()?.get(key);
}

export function log(level: string, message: string, meta?: Record<string, any>) {
  const context = asyncLocalStorage.getStore();
  const contextObj = context ? Object.fromEntries(context) : {};
  
  logger.log(level, message, {
    ...contextObj,
    ...meta,
  });
}

// Usage in API routes
export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id');
  const userId = await getUserId(request);
  
  return withContext({ requestId, userId }, async () => {
    log('info', 'Processing assessment submission', {
      action: 'assessment.submit',
      assessmentId: '123',
    });
    
    try {
      const result = await processSubmission();
      
      log('info', 'Assessment submitted successfully', {
        action: 'assessment.submit.success',
        duration: Date.now() - startTime,
      });
      
      return result;
    } catch (error) {
      log('error', 'Assessment submission failed', {
        action: 'assessment.submit.error',
        error: error.message,
        stack: error.stack,
      });
      
      throw error;
    }
  });
}

// ============================================================================
// LOG LEVELS & CATEGORIES
// ============================================================================

// Security logs
export function logSecurityEvent(event: string, details: Record<string, any>) {
  logger.warn('Security event', {
    category: 'security',
    event,
    ...details,
  });
}

// Usage: logSecurityEvent('failed_login', { email, ipAddress, attempts });

// Business logs
export function logBusinessEvent(event: string, details: Record<string, any>) {
  logger.info('Business event', {
    category: 'business',
    event,
    ...details,
  });
}

// Usage: logBusinessEvent('course_enrollment', { studentId, courseId });

// Performance logs
export function logPerformance(operation: string, duration: number, details?: Record<string, any>) {
  logger.info('Performance metric', {
    category: 'performance',
    operation,
    duration,
    ...details,
  });
}

// Usage: logPerformance('grade_calculation', 250, { studentCount: 100 });

// AI logs
export function logAIUsage(provider: string, model: string, details: Record<string, any>) {
  logger.info('AI usage', {
    category: 'ai',
    provider,
    model,
    ...details,
  });
}

// Usage: logAIUsage('openai', 'gpt-4', { tokens: 1500, cost: 0.045 });

// ============================================================================
// ERROR TRACKING WITH SENTRY
// ============================================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    
    return event;
  },
  
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});

// Usage
try {
  await gradeAssessment(submissionId);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      operation: 'grade_assessment',
    },
    extra: {
      submissionId,
      userId,
    },
  });
  
  throw error;
}
```

### 7.4 Alerting Setup

```typescript
// ============================================================================
// ALERTMANAGER CONFIGURATION
// ============================================================================

// prometheus/alerts.yml
groups:
  - name: aeroedu_alerts
    interval: 30s
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status_code=~"5.."}[5m])
          / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
      
      # Slow Response Time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response times"
          description: "95th percentile response time is {{ $value }}s (threshold: 5s)"
      
      # Database Connection Pool Exhausted
      - alert: DatabasePoolExhausted
        expr: |
          db_connection_pool_size{state="waiting"} > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool exhausted"
          description: "{{ $value }} connections waiting"
      
      # High AI Cost
      - alert: HighAICost
        expr: |
          increase(ai_cost_total_usd[1h]) > 50
        labels:
          severity: warning
        annotations:
          summary: "High AI service cost"
          description: "AI cost in last hour: ${{ $value }}"
      
      # Low Cache Hit Rate
      - alert: LowCacheHitRate
        expr: |
          rate(cache_hits_total[10m])
          / (rate(cache_hits_total[10m]) + rate(cache_misses_total[10m])) < 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }} (threshold: 80%)"
      
      # Service Down
      - alert: ServiceDown
        expr: up{job="aeroedu-core"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
      
      # High Memory Usage
      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"

// ============================================================================
// ALERTMANAGER ROUTING
// ============================================================================

// alertmanager/config.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@aeroedu.vn'
  smtp_auth_username: 'alerts@aeroedu.vn'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    
    - match:
        severity: critical
      receiver: 'slack-critical'
    
    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@aeroedu.vn'
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        description: '{{ .CommonAnnotations.summary }}'
  
  - name: 'slack-critical'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_CRITICAL}'
        channel: '#alerts-critical'
        title: '🚨 CRITICAL: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
  
  - name: 'slack-warnings'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_WARNINGS}'
        channel: '#alerts-warnings'
        title: '⚠️ WARNING: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']

// ============================================================================
// CUSTOM ALERTING LOGIC
// ============================================================================

// lib/alerting.ts
import { sendSlackNotification, sendEmail, sendSMS } from './notifications';

interface Alert {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: Record<string, any>;
}

export async function triggerAlert(alert: Alert) {
  // Log the alert
  logger.error('Alert triggered', alert);
  
  // Send to appropriate channels based on severity
  switch (alert.severity) {
    case 'critical':
      await Promise.all([
        sendSlackNotification('#alerts-critical', `🚨 CRITICAL: ${alert.message}`),
        sendEmail('oncall@aeroedu.vn', `CRITICAL ALERT: ${alert.name}`, alert.message),
        sendSMS('+84123456789', `CRITICAL: ${alert.message}`),
      ]);
      break;
    
    case 'high':
      await Promise.all([
        sendSlackNotification('#alerts-high', `⚠️ HIGH: ${alert.message}`),
        sendEmail('team@aeroedu.vn', `High Priority Alert: ${alert.name}`, alert.message),
      ]);
      break;
    
    case 'medium':
      await sendSlackNotification('#alerts-medium', `⚠️ MEDIUM: ${alert.message}`);
      break;
    
    case 'low':
      await sendSlackNotification('#alerts-low', `ℹ️ INFO: ${alert.message}`);
      break;
  }
  
  // Store in database for audit
  await prisma.system_alerts.create({
    data: {
      name: alert.name,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata,
      triggered_at: new Date(),
    },
  });
}

// Usage
async function monitorAICost() {
  const hourlyCount = await getHourlyAICost();
  
  if (hourlyCost > 100) {
    await triggerAlert({
      name: 'High AI Cost',
      severity: 'critical',
      message: `AI cost in last hour: $${hourlyCost} (threshold: $100)`,
      metadata: { cost: hourlyCost },
    });
  }
}
```
# KIẾN TRÚC HỆ THỐNG TỐI ƯU - AEROEDU (Tiếp theo)

---

## 8. SECURITY ARCHITECTURE - COMPREHENSIVE

### 8.1 Authentication & Authorization

```typescript
// ============================================================================
// NEXTAUTH.JS CONFIGURATION - ENHANCED
// ============================================================================

// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { compare } from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    // Email/Password Authentication
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }
        
        // Rate limiting for login attempts
        const identifier = `login:${credentials.email}`;
        const rateCheck = await rateLimit.check(identifier, 5, 300); // 5 attempts per 5 minutes
        
        if (!rateCheck.success) {
          throw new Error('Too many login attempts. Please try again later.');
        }
        
        // Find user
        const user = await prisma.users.findUnique({
          where: { email: credentials.email },
          include: { user_profiles: true }
        });
        
        if (!user || !user.password_hash) {
          await rateLimit.increment(identifier);
          throw new Error('Invalid credentials');
        }
        
        // Verify password
        const isValid = await compare(credentials.password, user.password_hash);
        
        if (!isValid) {
          await rateLimit.increment(identifier);
          
          // Log failed attempt
          await prisma.audit_logs.create({
            data: {
              user_id: user.id,
              action: 'LOGIN_FAILED',
              entity_type: 'user',
              entity_id: user.id,
              ip_address: credentials.ip,
              metadata: { reason: 'invalid_password' }
            }
          });
          
          throw new Error('Invalid credentials');
        }
        
        // Check if account is active
        if (!user.is_active) {
          throw new Error('Account is disabled');
        }
        
        // Check if email is verified
        if (!user.email_verified) {
          throw new Error('Please verify your email first');
        }
        
        // Update last login
        await prisma.users.update({
          where: { id: user.id },
          data: { last_login: new Date() }
        });
        
        // Log successful login
        await prisma.audit_logs.create({
          data: {
            user_id: user.id,
            action: 'LOGIN_SUCCESS',
            entity_type: 'user',
            entity_id: user.id,
            ip_address: credentials.ip
          }
        });
        
        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          image: user.avatar_url,
        };
      }
    }),
    
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update every 24 hours
  },
  
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow OAuth sign-ins
      if (account?.provider === 'google') {
        // Check if user exists
        const existingUser = await prisma.users.findUnique({
          where: { email: user.email! }
        });
        
        if (!existingUser) {
          // Create new user from Google OAuth
          await prisma.users.create({
            data: {
              email: user.email!,
              full_name: user.name!,
              avatar_url: user.image,
              email_verified: true,
              role: 'STUDENT',
              is_active: true,
            }
          });
        }
      }
      
      return true;
    },
    
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      
      // Add permissions to token
      if (token.id) {
        const userData = await prisma.users.findUnique({
          where: { id: token.id as string },
          select: { role: true, is_active: true }
        });
        
        if (userData) {
          token.role = userData.role;
          token.permissions = getPermissionsForRole(userData.role);
          token.isActive = userData.is_active;
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.user.isActive = token.isActive as boolean;
      }
      
      return session;
    },
  },
  
  events: {
    async signIn({ user, account, isNewUser }) {
      logger.info('User signed in', {
        userId: user.id,
        provider: account?.provider,
        isNewUser,
      });
    },
    
    async signOut({ token }) {
      logger.info('User signed out', {
        userId: token.id,
      });
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

// lib/permissions.ts
export enum Permission {
  // Course permissions
  COURSE_VIEW = 'course.view',
  COURSE_CREATE = 'course.create',
  COURSE_EDIT = 'course.edit',
  COURSE_DELETE = 'course.delete',
  COURSE_PUBLISH = 'course.publish',
  
  // Assessment permissions
  ASSESSMENT_VIEW = 'assessment.view',
  ASSESSMENT_CREATE = 'assessment.create',
  ASSESSMENT_EDIT = 'assessment.edit',
  ASSESSMENT_DELETE = 'assessment.delete',
  ASSESSMENT_GRADE = 'assessment.grade',
  ASSESSMENT_TAKE = 'assessment.take',
  
  // User management
  USER_VIEW = 'user.view',
  USER_CREATE = 'user.create',
  USER_EDIT = 'user.edit',
  USER_DELETE = 'user.delete',
  
  // Grading
  GRADE_VIEW_OWN = 'grade.view.own',
  GRADE_VIEW_ALL = 'grade.view.all',
  GRADE_EDIT = 'grade.edit',
  
  // Analytics
  ANALYTICS_VIEW_OWN = 'analytics.view.own',
  ANALYTICS_VIEW_ALL = 'analytics.view.all',
  
  // System administration
  SYSTEM_CONFIG = 'system.config',
  SYSTEM_AUDIT = 'system.audit',
}

export const RolePermissions: Record<string, Permission[]> = {
  STUDENT: [
    Permission.COURSE_VIEW,
    Permission.ASSESSMENT_VIEW,
    Permission.ASSESSMENT_TAKE,
    Permission.GRADE_VIEW_OWN,
    Permission.ANALYTICS_VIEW_OWN,
  ],
  
  TEACHER: [
    Permission.COURSE_VIEW,
    Permission.COURSE_CREATE,
    Permission.COURSE_EDIT,
    Permission.ASSESSMENT_VIEW,
    Permission.ASSESSMENT_CREATE,
    Permission.ASSESSMENT_EDIT,
    Permission.ASSESSMENT_DELETE,
    Permission.ASSESSMENT_GRADE,
    Permission.GRADE_VIEW_ALL,
    Permission.GRADE_EDIT,
    Permission.ANALYTICS_VIEW_ALL,
    Permission.USER_VIEW,
  ],
  
  ADMIN: Object.values(Permission), // All permissions
};

export function getPermissionsForRole(role: string): Permission[] {
  return RolePermissions[role] || [];
}

export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  return userPermissions.includes(required);
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

// lib/auth/middleware.ts
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../api/auth/[...nextauth]/route';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  
  if (!hasPermission(session.user.permissions, permission)) {
    throw new Error('Forbidden: Insufficient permissions');
  }
  
  return session;
}

export async function requireRole(role: string | string[]) {
  const session = await requireAuth();
  const roles = Array.isArray(role) ? role : [role];
  
  if (!roles.includes(session.user.role)) {
    throw new Error('Forbidden: Insufficient role');
  }
  
  return session;
}

// Usage in API routes
export async function GET(request: Request) {
  // Require authentication
  const session = await requireAuth();
  
  // Or require specific permission
  await requirePermission(Permission.COURSE_VIEW);
  
  // Or require specific role
  await requireRole(['TEACHER', 'ADMIN']);
  
  // Your logic here...
}

// ============================================================================
// PASSWORD SECURITY
// ============================================================================

// lib/password.ts
import { hash, compare } from 'bcrypt';
import { z } from 'zod';

const SALT_ROUNDS = 12;

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export async function hashPassword(password: string): Promise<string> {
  // Validate password strength
  passwordSchema.parse(password);
  
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

// Check if password has been pwned (using Have I Been Pwned API)
export async function checkPasswordPwned(password: string): Promise<boolean> {
  const sha1 = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
  const hashArray = Array.from(new Uint8Array(sha1));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);
  
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();
  
  return text.includes(suffix);
}

// ============================================================================
// TWO-FACTOR AUTHENTICATION (2FA)
// ============================================================================

// lib/2fa.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function generate2FASecret(userEmail: string) {
  const secret = speakeasy.generateSecret({
    name: `AeroEdu (${userEmail})`,
    issuer: 'AeroEdu',
  });
  
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
  
  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  };
}

export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before/after
  });
}

// Enable 2FA for user
export async function enable2FA(userId: string, token: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { two_factor_secret: true }
  });
  
  if (!user?.two_factor_secret) {
    throw new Error('2FA not set up');
  }
  
  const isValid = verify2FAToken(user.two_factor_secret, token);
  
  if (!isValid) {
    throw new Error('Invalid 2FA token');
  }
  
  await prisma.users.update({
    where: { id: userId },
    data: { two_factor_enabled: true }
  });
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

// lib/session.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

interface Session {
  userId: string;
  role: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
}

export async function createSession(session: Session): Promise<string> {
  const sessionId = crypto.randomUUID();
  const key = `session:${sessionId}`;
  
  await redis.setex(
    key,
    7 * 24 * 60 * 60, // 7 days
    JSON.stringify(session)
  );
  
  // Track active sessions per user
  await redis.sadd(`user:sessions:${session.userId}`, sessionId);
  
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

export async function updateSessionActivity(sessionId: string) {
  const session = await getSession(sessionId);
  
  if (session) {
    session.lastActivity = Date.now();
    await redis.setex(
      `session:${sessionId}`,
      7 * 24 * 60 * 60,
      JSON.stringify(session)
    );
  }
}

export async function revokeSession(sessionId: string) {
  const session = await getSession(sessionId);
  
  if (session) {
    await redis.del(`session:${sessionId}`);
    await redis.srem(`user:sessions:${session.userId}`, sessionId);
  }
}

export async function revokeAllUserSessions(userId: string) {
  const sessionIds = await redis.smembers(`user:sessions:${userId}`);
  
  const pipeline = redis.pipeline();
  sessionIds.forEach(id => pipeline.del(`session:${id}`));
  await pipeline.exec();
  
  await redis.del(`user:sessions:${userId}`);
}

export async function getUserActiveSessions(userId: string): Promise<Session[]> {
  const sessionIds = await redis.smembers(`user:sessions:${userId}`);
  const sessions: Session[] = [];
  
  for (const id of sessionIds) {
    const session = await getSession(id);
    if (session) {
      sessions.push(session);
    }
  }
  
  return sessions;
}
```

### 8.2 API Security

```typescript
// ============================================================================
// RATE LIMITING
// ============================================================================

// lib/rate-limit.ts
import { Redis } from 'ioredis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis(process.env.REDIS_URL!);

// Token bucket algorithm
export const rateLimiter = {
  // Student: 100 requests/minute
  student: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'ratelimit:student',
  }),
  
  // Teacher: 500 requests/minute
  teacher: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(500, '1 m'),
    prefix: 'ratelimit:teacher',
  }),
  
  // Admin: 1000 requests/minute
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 m'),
    prefix: 'ratelimit:admin',
  }),
  
  // Auth endpoints: 5 requests/5 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'),
    prefix: 'ratelimit:auth',
  }),
  
  // AI endpoints: 20 requests/hour
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'ratelimit:ai',
  }),
};

// Middleware
export async function rateLimitMiddleware(
  request: Request,
  userRole: string,
  identifier: string
) {
  const limiter = rateLimiter[userRole.toLowerCase()] || rateLimiter.student;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  
  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    });
  }
  
  return null; // Continue
}

// ============================================================================
// INPUT VALIDATION & SANITIZATION
// ============================================================================

// lib/validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Common schemas
export const emailSchema = z.string().email().max(255);
export const uuidSchema = z.string().uuid();
export const nameSchema = z.string().min(1).max(255).trim();

// Course schemas
export const createCourseSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9-]+$/),
  name: nameSchema,
  description: z.string().max(5000).optional(),
  credits: z.number().int().min(1).max(10),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  prerequisites: z.array(z.string()).optional(),
});

// Assessment schemas
export const createAssessmentSchema = z.object({
  title: nameSchema,
  type: z.enum(['QUIZ', 'ASSIGNMENT', 'PROJECT', 'MIDTERM', 'FINAL']),
  course_id: uuidSchema,
  due_date: z.string().datetime(),
  max_score: z.number().min(0).max(1000),
  questions: z.array(z.object({
    type: z.enum(['MCQ', 'SHORT_ANSWER', 'ESSAY', 'CODE']),
    question: z.string().min(1).max(5000),
    points: z.number().min(0),
    options: z.array(z.string()).optional(),
    correct_answer: z.any().optional(),
  })),
});

// Sanitize HTML content
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

// Validation middleware
export async function validateRequest<T>(
  request: Request,
  schema: z.Schema<T>
): Promise<T> {
  const body = await request.json();
  
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(JSON.stringify(error.errors));
    }
    throw error;
  }
}

// ============================================================================
// SQL INJECTION PREVENTION
// ============================================================================

// Prisma automatically prevents SQL injection via parameterized queries
// But for raw queries, always use parameterized statements:

// ❌ NEVER DO THIS
const unsafeQuery = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ ALWAYS DO THIS
const safeQuery = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;

// Or use Prisma's typed query builder
const user = await prisma.users.findUnique({
  where: { email }, // Automatically parameterized
});

// ============================================================================
// XSS PREVENTION
// ============================================================================

// 1. Content Security Policy
export const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  media-src 'self' https:;
  connect-src 'self' https://api.aeroedu.vn wss://api.aeroedu.vn;
  frame-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

// 2. Security headers middleware
export function securityHeaders() {
  return {
    'Content-Security-Policy': cspHeader,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

// 3. Sanitize user input before rendering
import { escape } from 'html-escaper';

function renderUserContent(content: string) {
  return escape(content); // Escapes <, >, &, ", '
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

// lib/csrf.ts
import { createHash, randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  // Double submit cookie pattern
  return token === sessionToken;
}

// Middleware
export async function csrfMiddleware(request: Request) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfToken = request.headers.get('x-csrf-token');
    const sessionToken = request.cookies.get('csrf-token');
    
    if (!csrfToken || !verifyCSRFToken(csrfToken, sessionToken)) {
      return new Response('CSRF token validation failed', { status: 403 });
    }
  }
  
  return null; // Continue
}

// ============================================================================
// FILE UPLOAD SECURITY
// ============================================================================

// lib/upload-security.ts
import { createHash } from 'crypto';
import fileType from 'file-type';
import sharp from 'sharp';

const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  videos: ['video/mp4', 'video/webm'],
};

const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
};

export async function validateFile(
  file: File,
  category: keyof typeof ALLOWED_FILE_TYPES
): Promise<boolean> {
  // Check file size
  const maxSize = MAX_FILE_SIZES[category === 'images' ? 'image' : category === 'videos' ? 'video' : 'document'];
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
  }
  
  // Verify actual file type (not just extension)
  const buffer = await file.arrayBuffer();
  const type = await fileType.fromBuffer(Buffer.from(buffer));
  
  if (!type || !ALLOWED_FILE_TYPES[category].includes(type.mime)) {
    throw new Error(`Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES[category].join(', ')}`);
  }
  
  // Scan for malware (integration with ClamAV or similar)
  const isSafe = await scanForMalware(Buffer.from(buffer));
  if (!isSafe) {
    throw new Error('File contains malicious content');
  }
  
  return true;
}

async function scanForMalware(buffer: Buffer): Promise<boolean> {
  // Integration with ClamAV or cloud antivirus service
  // For now, return true (implement actual scanning)
  return true;
}

// Sanitize image files
export async function sanitizeImage(buffer: Buffer): Promise<Buffer> {
  // Strip EXIF data and re-encode
  return sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

// Generate secure filename
export function generateSecureFilename(originalFilename: string): string {
  const extension = originalFilename.split('.').pop();
  const hash = createHash('sha256')
    .update(originalFilename + Date.now())
    .digest('hex')
    .substring(0, 16);
  
  return `${hash}.${extension}`;
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

// lib/api-keys.ts
export async function generateAPIKey(userId: string, name: string): Promise<string> {
  const key = `ak_${randomBytes(32).toString('hex')}`;
  const hash = createHash('sha256').update(key).digest('hex');
  
  await prisma.api_keys.create({
    data: {
      user_id: userId,
      name,
      key_hash: hash,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  });
  
  return key; // Return only once, never store plaintext
}

export async function validateAPIKey(key: string): Promise<boolean> {
  const hash = createHash('sha256').update(key).digest('hex');
  
  const apiKey = await prisma.api_keys.findUnique({
    where: { key_hash: hash },
  });
  
  if (!apiKey || apiKey.expires_at < new Date() || apiKey.revoked) {
    return false;
  }
  
  // Update last used
  await prisma.api_keys.update({
    where: { key_hash: hash },
    data: { last_used_at: new Date() },
  });
  
  return true;
}

// ============================================================================
// ENCRYPTION
// ============================================================================

// lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Encrypt sensitive fields in database
export async function encryptSensitiveData(data: any) {
  const sensitiveFields = ['ssn', 'tax_id', 'credit_card'];
  
  for (const field of sensitiveFields) {
    if (data[field]) {
      data[field] = encrypt(data[field]);
    }
  }
  
  return data;
}
```

### 8.3 Exam Security & Proctoring

```typescript
// ============================================================================
// EXAM PROCTORING SYSTEM
// ============================================================================

// lib/proctoring.ts
import { Computer Vision API } from '@azure/cognitiveservices-computervision';

interface ProctoringSession {
  id: string;
  studentId: string;
  assessmentId: string;
  startTime: Date;
  violations: ProctoringViolation[];
  screenshots: string[];
  videoRecording?: string;
}

interface ProctoringViolation {
  type: 'MULTIPLE_FACES' | 'NO_FACE' | 'LOOKING_AWAY' | 'TAB_SWITCH' | 'COPY_PASTE' | 'EXTERNAL_DEVICE';
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  evidence?: string; // Screenshot or data
}

export class ProctoringService {
  private sessions: Map<string, ProctoringSession> = new Map();
  
  async startProctoring(studentId: string, assessmentId: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    
    const session: ProctoringSession = {
      id: sessionId,
      studentId,
      assessmentId,
      startTime: new Date(),
      violations: [],
      screenshots: [],
    };
    
    this.sessions.set(sessionId, session);
    
    // Request permissions
    await this.requestPermissions();
    
    // Start monitoring
    this.startMonitoring(sessionId);
    
    return sessionId;
  }
  
  private async requestPermissions() {
    // Request camera, microphone, screen sharing
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    
    // Request screen recording
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    
    return { stream, screenStream };
  }
  
  private startMonitoring(sessionId: string) {
    // 1. Face detection monitoring
    this.startFaceDetection(sessionId);
    
    // 2. Tab switching monitoring
    this.monitorTabSwitching(sessionId);
    
    // 3. Copy-paste monitoring
    this.monitorCopyPaste(sessionId);
    
    // 4. Browser lockdown
    this.lockdownBrowser(sessionId);
  }
  
  private async startFaceDetection(sessionId: string) {
    const session = this.sessions.get(sessionId)!;
    
    // Capture frame every 10 seconds
    setInterval(async () => {
      const frame = await this.captureFrame();
      const analysis = await this.analyzeFace(frame);
      
      if (analysis.faceCount === 0) {
        this.recordViolation(sessionId, {
          type: 'NO_FACE',
          timestamp: new Date(),
          severity: 'HIGH',
          evidence: frame,
        });
      } else if (analysis.faceCount > 1) {
        this.recordViolation(sessionId, {
          type: 'MULTIPLE_FACES',
          timestamp: new Date(),
          severity: 'HIGH',
          evidence: frame,
        });
      } else if (analysis.lookingAway) {
        this.recordViolation(sessionId, {
          type: 'LOOKING_AWAY',
          timestamp: new Date(),
          severity: 'MEDIUM',
        });
      }
    }, 10000);
  }
  
  private async analyzeFace(frame: string) {
    // Use Computer Vision API or MediaPipe
    // For demo purposes:
    return {
      faceCount: 1,
      lookingAway: false,
      emotion: 'neutral',
    };
  }
  
  private monitorTabSwitching(sessionId: string) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordViolation(sessionId, {
          type: 'TAB_SWITCH',
          timestamp: new Date(),
          severity: 'HIGH',
        });
      }
    });
    
    // Prevent opening new tabs
    window.addEventListener('blur', (e) => {
      this.recordViolation(sessionId, {
        type: 'TAB_SWITCH',
        timestamp: new Date(),
        severity: 'HIGH',
      });
    });
  }
  
  private monitorCopyPaste(sessionId: string) {
    document.addEventListener('copy', (e) => {
      this.recordViolation(sessionId, {
        type: 'COPY_PASTE',
        timestamp: new Date(),
        severity: 'MEDIUM',
      });
    });
    
    document.addEventListener('paste', (e) => {
      this.recordViolation(sessionId, {
        type: 'COPY_PASTE',
        timestamp: new Date(),
        severity: 'HIGH',
      });
      
      // Optionally prevent paste
      e.preventDefault();
    });
  }
  
  private lockdownBrowser(sessionId: string) {
    // Enter fullscreen
    document.documentElement.requestFullscreen();
    
    // Disable right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Disable keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Prevent F12, Ctrl+Shift+I, etc.
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    });
    
    // Detect devtools
    setInterval(() => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        this.recordViolation(sessionId, {
          type: 'EXTERNAL_DEVICE',
          timestamp: new Date(),
          severity: 'HIGH',
        });
      }
    }, 1000);
  }
  
  private recordViolation(sessionId: string, violation: ProctoringViolation) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.violations.push(violation);
      
      // Send to server
      fetch('/api/proctoring/violation', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          violation,
        }),
      });
      
      // Alert student (for low/medium severity)
      if (violation.severity !== 'HIGH') {
        this.showWarning(violation.type);
      }
    }
  }
  
  private showWarning(type: string) {
    // Show warning modal to student
    alert(`Warning: ${type} detected. This has been recorded.`);
  }
  
  async endProctoring(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Generate report
    const report = {
      sessionId,
      studentId: session.studentId,
      assessmentId: session.assessmentId,
      duration: Date.now() - session.startTime.getTime(),
      violationCount: session.violations.length,
      violations: session.violations,
      riskScore: this.calculateRiskScore(session.violations),
    };
    
    // Save to database
    await prisma.proctoring_sessions.create({
      data: report,
    });
    
    this.sessions.delete(sessionId);
    
    return report;
  }
  
  private calculateRiskScore(violations: ProctoringViolation[]): number {
    let score = 0;
    
    violations.forEach(v => {
      switch (v.severity) {
        case 'LOW':
          score += 1;
          break;
        case 'MEDIUM':
          score += 3;
          break;
        case 'HIGH':
          score += 5;
          break;
      }
    });
    
    return Math.min(100, score);
  }
  
  private async captureFrame(): Promise<string> {
    // Capture frame from video stream
    // Return base64 image
    return 'data:image/jpeg;base64,...';
  }
}

// ============================================================================
// PLAGIARISM DETECTION
// ============================================================================

// lib/plagiarism.ts
export class PlagiarismDetector {
  async checkPlagiarism(text: string, assignmentId: string): Promise<PlagiarismReport> {
    // 1. Check against previous submissions
    const similarity = await this.checkAgainstSubmissions(text, assignmentId);
    
    // 2. Check against online sources (using API like Copyleaks or Turnitin)
    const onlineMatches = await this.checkOnlineSources(text);
    
    // 3. Calculate overall plagiarism score
    const score = this.calculatePlagiarismScore(similarity, onlineMatches);
    
    return {
      score,
      matches: [...similarity.matches, ...onlineMatches],
      isSuspicious: score > 30, // > 30% similarity
    };
  }
  
  private async checkAgainstSubmissions(text: string, assignmentId: string) {
    const submissions = await prisma.assessment_submissions.findMany({
      where: {
        assessment_id: assignmentId,
      },
      select: {
        id: true,
        student_id: true,
        answers: true,
      },
    });
    
    const matches: any[] = [];
    
    for (const submission of submissions) {
      const similarity = this.calculateTextSimilarity(text, JSON.stringify(submission.answers));
      
      if (similarity > 0.5) {
        matches.push({
          type: 'STUDENT_SUBMISSION',
          studentId: submission.student_id,
          similarity: similarity * 100,
        });
      }
    }
    
    return { matches };
  }
  
  private async checkOnlineSources(text: string) {
    // Integration with plagiarism detection API
    // For demo purposes:
    return [];
  }
  
  private calculateTextSimilarity(text1: string, text2: string): number {
    // Use algorithm like Jaccard similarity or cosine similarity
    // For demo, simple implementation:
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  private calculatePlagiarismScore(similarity: any, onlineMatches: any[]): number {
    const maxSimilarity = Math.max(
      ...similarity.matches.map((m: any) => m.similarity),
      ...onlineMatches.map((m: any) => m.similarity),
      0
    );
    
    return maxSimilarity;
  }
}

interface PlagiarismReport {
  score: number;
  matches: any[];
  isSuspicious: boolean;
}
```

---

## 9. DISASTER RECOVERY & HIGH AVAILABILITY

### 9.1 Backup Strategy

```typescript
// ============================================================================
// AUTOMATED BACKUP SYSTEM
// ============================================================================

// scripts/backup.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import { Storage } from '@google-cloud/storage';

const execAsync = promisify(exec);
const storage = new Storage();

class BackupService {
  private bucketName = 'aeroedu-backups';
  
  async performFullBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 1. PostgreSQL backup
    await this.backupPostgreSQL(timestamp);
    
    // 2. MongoDB backup
    await this.backupMongoDB(timestamp);
    
    // 3. Redis backup
    await this.backupRedis(timestamp);
    
    // 4. File storage backup
    await this.backupFiles(timestamp);
    
    // 5. Cleanup old backups
    await this.cleanupOldBackups();
    
    logger.info('Full backup completed', { timestamp });
  }
  
  private async backupPostgreSQL(timestamp: string) {
    const filename = `postgresql-${timestamp}.sql.gz`;
    const localPath = `/tmp/${filename}`;
    
    // Create backup
    await execAsync(`
      PGPASSWORD=${process.env.DB_PASSWORD} pg_dump \
        -h ${process.env.DB_HOST} \
        -U ${process.env.DB_USER} \
        -d ${process.env.DB_NAME} \
        -F c \
        -b \
        -v \
        -f ${localPath}
    `);
    
    // Compress
    await execAsync(`gzip ${localPath}`);
    
    // Upload to Cloud Storage
    await this.uploadToCloudStorage(`${localPath}.gz`, `postgresql/${filename}`);
    
    // Cleanup local file
    await execAsync(`rm ${localPath}.gz`);
  }
  
  private async backupMongoDB(timestamp: string) {
    const filename = `mongodb-${timestamp}`;
    const localPath = `/tmp/${filename}`;
    
    // Create backup
    await execAsync(`
      mongodump \
        --uri="${process.env.MONGODB_URI}" \
        --out=${localPath}
    `);
    
    // Compress
    await execAsync(`tar -czf ${localPath}.tar.gz ${localPath}`);
    
    // Upload to Cloud Storage
    await this.uploadToCloudStorage(`${localPath}.tar.gz`, `mongodb/${filename}.tar.gz`);
    
    // Cleanup
    await execAsync(`rm -rf ${localPath} ${localPath}.tar.gz`);
  }
  
  private async backupRedis(timestamp: string) {
    const filename = `redis-${timestamp}.rdb`;
    
    // Trigger Redis BGSAVE
    await redis.bgsave();
    
    // Wait for save to complete
    await this.waitForRedisSave();
    
    // Copy RDB file
    const rdbPath = '/var/lib/redis/dump.rdb';
    await execAsync(`cp ${rdbPath} /tmp/${filename}`);
    
    // Upload to Cloud Storage
    await this.uploadToCloudStorage(`/tmp/${filename}`, `redis/${filename}`);
    
    // Cleanup
    await execAsync(`rm /tmp/${filename}`);
  }
  
  private async waitForRedisSave() {
    let saving = true;
    while (saving) {
      const info = await redis.info('persistence');
      saving = info.includes('rdb_bgsave_in_progress:1');
      if (saving) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  private async backupFiles(timestamp: string) {
    // Backup user uploads and generated content
    const bucket = storage.bucket(process.env.STORAGE_BUCKET!);
    const backupBucket = storage.bucket(this.bucketName);
    
    const [files] = await bucket.getFiles();
    
    for (const file of files) {
      await file.copy(backupBucket.file(`files/${timestamp}/${file.name}`));
    }
  }
  
  private async uploadToCloudStorage(localPath: string, remotePath: string) {
    const bucket = storage.bucket(this.bucketName);
    
    await bucket.upload(localPath, {
      destination: remotePath,
      metadata: {
        contentType: 'application/gzip',
        metadata: {
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
  
  private async cleanupOldBackups() {
    const bucket = storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles();
    
    const retentionDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const createdDate = new Date(metadata.timeCreated);
      
      if (createdDate < cutoffDate) {
        await file.delete();
        logger.info('Deleted old backup', { filename: file.name });
      }
    }
  }
  
  // Point-in-time recovery for PostgreSQL
  async restoreToPointInTime(timestamp: Date) {
    // Stop application
    await this.stopApplication();
    
    // Restore from base backup
    const latestBackup = await this.getLatestBackup('postgresql');
    await this.restorePostgreSQLBackup(latestBackup);
    
    // Apply WAL files up to timestamp
    await this.applyWALFiles(timestamp);
    
    // Start application
    await this.startApplication();
  }
  
  private async restorePostgreSQLBackup(backupFile: string) {
    await execAsync(`
      PGPASSWORD=${process.env.DB_PASSWORD} pg_restore \
        -h ${process.env.DB_HOST} \
        -U ${process.env.DB_USER} \
        -d ${process.env.DB_NAME} \
        -c \
        -v \
        ${backupFile}
    `);
  }
  
  private async applyWALFiles(timestamp: Date) {
    // Download WAL files from Cloud Storage
    // Apply them in order until timestamp
    // Implementation depends on PostgreSQL WAL archiving setup
  }
  
  private async stopApplication() {
    // Implement application shutdown logic
    logger.info('Stopping application for restore');
  }
  
  private async startApplication() {
    // Implement application startup logic
    logger.info('Starting application after restore');
  }
  
  private async getLatestBackup(type: string): Promise<string> {
    const bucket = storage.bucket(this.bucketName);
    const [files] = await bucket.getFiles({ prefix: `${type}/` });
    
    // Sort by creation time descending
    files.sort((a, b) => {
      return new Date(b.metadata.timeCreated).getTime() - 
             new Date(a.metadata.timeCreated).getTime();
    });
    
    if (files.length === 0) {
      throw new Error(`No backups found for ${type}`);
    }
    
    // Download latest backup
    const localPath = `/tmp/restore-${Date.now()}`;
    await files[0].download({ destination: localPath });
    
    return localPath;
  }
}

// Cron job for automated backups
import cron from 'node-cron';

const backupService = new BackupService();

// Full backup daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    await backupService.performFullBackup();
  } catch (error) {
    logger.error('Backup failed', error);
    await triggerAlert({
      name: 'Backup Failed',
      severity: 'critical',
      message: `Daily backup failed: ${error.message}`,
    });
  }
});

// Incremental backup every 6 hours
cron.schedule('0 */6 * * *', async () => {
  try {
    await backupService.performIncrementalBackup();
  } catch (error) {
    logger.error('Incremental backup failed', error);
  }
});
```

### 9.2 High Availability Setup

```yaml
# ============================================================================
# HIGH AVAILABILITY ARCHITECTURE
# ============================================================================

High Availability Configuration:

# Load Balancer (Google Cloud Load Balancing)
Load Balancer:
  Type: HTTP(S) Load Balancer
  Backend Services:
    - Core Service (Cloud Run):
        Min Instances: 3
        Max Instances: 100
        Health Check:
          Path: /api/health
          Interval: 10s
          Timeout: 5s
          Healthy Threshold: 2
          Unhealthy Threshold: 3
    
    - AI Service:
        Min Instances: 2
        Max Instances: 50
        Health Check:
          Path: /health
          Interval: 10s
    
    - Real-time Service:
        Min Instances: 2
        Max Instances: 20
        Health Check:
          Path: /health
          Interval: 10s
  
  Session Affinity: Client IP (for WebSocket)
  
  CDN Integration:
    Enabled: true
    Cache Mode: CACHE_ALL_STATIC
    Negative Caching: true
    
  SSL:
    Certificate: Managed SSL Certificate
    Minimum TLS Version: TLS 1.2
    Cipher Suites: Modern profile

# Database High Availability
PostgreSQL:
  Primary: Cloud SQL PostgreSQL
    High Availability: true
    Instance Type: db-n1-highmem-4
    Storage: 500GB SSD
    Automatic Backups: Enabled
    Backup Time: 02:00 UTC
    Backup Retention: 30 days
    Point-in-time Recovery: Enabled
  
  Read Replicas:
    Count: 2
    Regions: 
      - asia-southeast1 (Singapore)
      - asia-northeast1 (Tokyo)
    Replication Mode: Asynchronous
    
  Failover:
    Automatic: true
    Failover Time: < 60 seconds
    Detection: Health check failure

MongoDB:
  Deployment: Atlas M30 Cluster
  Replica Set:
    Primary: 1
    Secondary: 2
    Arbiter: 0
  
  Regions:
    - asia-southeast1 (Priority 1)
    - asia-northeast1 (Priority 2)
    - us-central1 (Priority 3)
  
  Auto-failover: Enabled
  Oplog Size: 10GB
  
  Backup:
    Continuous: Cloud Backup
    Snapshot Schedule: Every 6 hours
    Retention: 30 days

Redis:
  Deployment: Cloud Memorystore Redis
  Tier: Standard (with HA)
  Version: 7.0
  Memory: 16GB
  
  High Availability:
    Replicas: 1
    Automatic Failover: Enabled
    Failover Time: < 30 seconds
  
  Persistence:
    RDB Snapshots: Every 6 hours
    AOF: Enabled (appendfsync everysec)
  
  Backup:
    Automated: Daily
    Retention: 7 days

# Multi-Region Deployment
Regions:
  Primary: asia-southeast1 (Singapore)
    - Core Service
    - AI Service
    - Real-time Service
    - PostgreSQL Primary
    - MongoDB Primary
    - Redis Primary
  
  Secondary: asia-northeast1 (Tokyo)
    - Core Service (standby)
    - PostgreSQL Read Replica
    - MongoDB Secondary
  
  Disaster Recovery: us-central1 (Iowa)
    - Backup instances (cold standby)
    - Long-term backup storage

# DNS Failover
DNS Configuration:
  Provider: Cloud DNS
  Records:
    api.aeroedu.vn:
      Type: A
      TTL: 60 # Low TTL for quick failover
      Routing Policy: Geo-based with failover
      Primary: asia-southeast1
      Secondary: asia-northeast1
  
  Health Checks:
    Interval: 10s
    Timeout: 5s
    Unhealthy Threshold: 2
    
  Automatic Failover:
    Enabled: true
    Failover Time: ~2 minutes (DNS TTL + health check)

# Disaster Recovery Plan
RTO (Recovery Time Objective): 2 hours
RPO (Recovery Point Objective): 15 minutes

Disaster Scenarios:

1. Single Instance Failure:
   - Auto-scaling replaces failed instance
   - Load balancer routes traffic to healthy instances
   - Recovery Time: < 5 minutes
   - Data Loss: None

2. Database Primary Failure:
   - Automatic promotion of read replica to primary
   - Application reconnects to new primary
   - Recovery Time: < 2 minutes
   - Data Loss: < 1 minute (replication lag)

3. Regional Outage:
   - DNS failover to secondary region
   - Database replica promoted in secondary region
   - Recovery Time: < 10 minutes
   - Data Loss: < 5 minutes (replication lag)

4. Complete Service Failure:
   - Restore from backups in DR region
   - Manual intervention required
   - Recovery Time: < 2 hours
   - Data Loss: < 15 minutes (last backup)

# Monitoring & Alerting
Health Checks:
  Endpoints:
    /api/health: Application health
    /api/health/db: Database connectivity
    /api/health/redis: Redis connectivity
    /api/health/ready: Readiness probe
  
  Frequency: Every 10 seconds
  
  Failure Actions:
    - Remove from load balancer rotation
    - Send alert to on-call team
    - Trigger auto-scaling if needed
    - Log incident for post-mortem

Alerting:
  Critical Alerts (PagerDuty + SMS):
    - Service down
    - Database failover
    - High error rate (>5%)
    - API latency >5s (p95)
  
  High Priority (Slack + Email):
    - Elevated error rate (>2%)
    - Approaching rate limits
    - Disk space >80%
    - Memory usage >85%
  
  Medium Priority (Slack):
    - Performance degradation
    - Elevated response times
    - Cache hit rate <80%
```

### 9.3 Failover Testing

```typescript
// ============================================================================
// CHAOS ENGINEERING & FAILOVER TESTING
// ============================================================================

// scripts/chaos-testing.ts
class ChaosEngineeringService {
  async runChaosExperiment(experiment: ChaosExperiment) {
    logger.info('Starting chaos experiment', { experiment: experiment.name });
    
    // 1. Take snapshot of current state
    const baseline = await this.captureBaseline();
    
    // 2. Introduce failure
    await this.introduceFailure(experiment);
    
    // 3. Monitor system behavior
    const results = await this.monitorSystemBehavior(experiment.duration);
    
    // 4. Restore normal operation
    await this.restoreNormalOperation(experiment);
    
    // 5. Analyze results
    const analysis = await this.analyzeResults(baseline, results);
    
    // 6. Generate report
    await this.generateReport(experiment, analysis);
    
    return analysis;
  }
  
  private async introduceFailure(experiment: ChaosExperiment) {
    switch (experiment.type) {
      case 'KILL_INSTANCE':
        await this.killRandomInstance();
        break;
      
      case 'NETWORK_LATENCY':
        await this.introduceNetworkLatency(experiment.params.latencyMs);
        break;
      
      case 'DATABASE_FAILURE':
        await this.simulateDatabaseFailure();
        break;
      
      case 'HIGH_LOAD':
        await this.generateHighLoad(experiment.params.rps);
        break;
      
      case 'DISK_FULL':
        await this.fillDiskSpace(experiment.params.percentage);
        break;
      
      case 'MEMORY_LEAK':
        await this.simulateMemoryLeak(experiment.params.leakRate);
        break;
    }
  }
  
  private async killRandomInstance() {
    // Get list of running instances
    const instances = await this.getRunningInstances();
    
    // Select random instance
    const target = instances[Math.floor(Math.random() * instances.length)];
    
    logger.info('Killing instance', { instance: target.id });
    
    // Kill instance
    await exec(`gcloud compute instances delete ${target.id} --zone=${target.zone} --quiet`);
  }
  
  private async monitorSystemBehavior(duration: number): Promise<SystemMetrics> {
    const startTime = Date.now();
    const metrics: SystemMetrics = {
      errorRates: [],
      latencies: [],
      throughput: [],
      availability: [],
    };
    
    while (Date.now() - startTime < duration) {
      const snapshot = await this.captureMetrics();
      
      metrics.errorRates.push(snapshot.errorRate);
      metrics.latencies.push(snapshot.p95Latency);
      metrics.throughput.push(snapshot.requestsPerSecond);
      metrics.availability.push(snapshot.healthyInstances / snapshot.totalInstances);
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
    }
    
    return metrics;
  }
  
  private async analyzeResults(baseline: SystemMetrics, results: SystemMetrics): Promise<ChaosAnalysis> {
    return {
      maxErrorRateIncrease: Math.max(...results.errorRates) - Math.max(...baseline.errorRates),
      maxLatencyIncrease: Math.max(...results.latencies) - Math.max(...baseline.latencies),
      minAvailability: Math.min(...results.availability),
      recoveryTime: this.calculateRecoveryTime(results),
      passed: this.evaluateExperiment(results),
    };
  }
  
  private calculateRecoveryTime(results: SystemMetrics): number {
    // Find when system returned to normal
    const normalThreshold = 0.95;
    
    for (let i = results.availability.length - 1; i >= 0; i--) {
      if (results.availability[i] < normalThreshold) {
        return (results.availability.length - i) * 5; // seconds
      }
    }
    
    return 0; // Immediate recovery
  }
  
  private evaluateExperiment(results: SystemMetrics): boolean {
    // Define success criteria
    const criteria = {
      maxErrorRate: 0.05, // 5%
      maxLatency: 5000, // 5 seconds
      minAvailability: 0.95, // 95%
    };
    
    return (
      Math.max(...results.errorRates) <= criteria.maxErrorRate &&
      Math.max(...results.latencies) <= criteria.maxLatency &&
      Math.min(...results.availability) >= criteria.minAvailability
    );
  }
}

// Scheduled chaos experiments (in staging only)
if (process.env.NODE_ENV === 'staging') {
  const chaosService = new ChaosEngineeringService();
  
  // Weekly chaos experiment
  cron.schedule('0 2 * * 1', async () => {
    const experiments: ChaosExperiment[] = [
      {
        name: 'Random Instance Failure',
        type: 'KILL_INSTANCE',
        duration: 300000, // 5 minutes
      },
      {
        name: 'Database Replica Failure',
        type: 'DATABASE_FAILURE',
        duration: 600000, // 10 minutes
      },
      {
        name: 'High Load Test',
        type: 'HIGH_LOAD',
        duration: 180000, // 3 minutes
        params: { rps: 10000 },
      },
    ];
    
    for (const experiment of experiments) {
      await chaosService.runChaosExperiment(experiment);
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 min between experiments
    }
  });
}

interface ChaosExperiment {
  name: string;
  type: string;
  duration: number;
  params?: any;
}

interface SystemMetrics {
  errorRates: number[];
  latencies: number[];
  throughput: number[];
  availability: number[];
}

interface ChaosAnalysis {
  maxErrorRateIncrease: number;
  maxLatencyIncrease: number;
  minAvailability: number;
  recoveryTime: number;
  passed: boolean;
}
```

---

# KIẾN TRÚC HỆ THỐNG TỐI ƯU - AEROEDU (Tiếp theo)

---

## 10. DEPLOYMENT STRATEGY

### 10.1 CI/CD Pipeline - Comprehensive

```yaml
# ============================================================================
# GITHUB ACTIONS CI/CD WORKFLOW
# ============================================================================

# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, staging]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20.x'
  PYTHON_VERSION: '3.11'
  REGISTRY: gcr.io
  PROJECT_ID: aeroedu-production

jobs:
  # ============================================================================
  # CODE QUALITY & SECURITY CHECKS
  # ============================================================================
  
  code-quality:
    name: Code Quality & Linting
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for better analysis
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
        continue-on-error: false
      
      - name: Run Prettier check
        run: npm run format:check
      
      - name: TypeScript type check
        run: npm run type-check
      
      - name: Check for unused dependencies
        run: npx depcheck
      
      - name: Analyze bundle size
        run: npm run analyze
      
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          args: >
            -Dsonar.projectKey=aeroedu
            -Dsonar.organization=aeroedu
            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
            -Dsonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts
  
  security-scan:
    name: Security Vulnerability Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: test
          args: --severity-threshold=high
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'AeroEdu'
          path: '.'
          format: 'HTML'
      
      - name: Upload OWASP report
        uses: actions/upload-artifact@v3
        with:
          name: owasp-report
          path: reports/
      
      - name: GitLeaks secret scanning
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ============================================================================
  # UNIT & INTEGRATION TESTS
  # ============================================================================
  
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: [code-quality]
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: aeroedu_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npm run db:migrate:test
          npm run db:seed:test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/aeroedu_test
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage --maxWorkers=2
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/aeroedu_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
      
      - name: Generate test report
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Unit Test Results
          path: 'reports/jest-*.xml'
          reporter: jest-junit
  
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: aeroedu_test
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      
      mongodb:
        image: mongo:6
        env:
          MONGO_INITDB_ROOT_USERNAME: test
          MONGO_INITDB_ROOT_PASSWORD: test
        ports:
          - 27017:27017
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/aeroedu_test
          REDIS_URL: redis://localhost:6379
          MONGODB_URI: mongodb://test:test@localhost:27017/aeroedu_test?authSource=admin
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results
          path: reports/integration/

  # ============================================================================
  # E2E TESTS (PLAYWRIGHT)
  # ============================================================================
  
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [integration-tests]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium firefox webkit
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3000
      
      - name: Start application
        run: npm run start &
        env:
          PORT: 3000
      
      - name: Wait for app to be ready
        run: npx wait-on http://localhost:3000 --timeout 60000
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
      
      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
      
      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-screenshots
          path: test-results/

  # ============================================================================
  # BUILD & PUSH DOCKER IMAGES
  # ============================================================================
  
  build-images:
    name: Build & Push Docker Images
    runs-on: ubuntu-latest
    needs: [code-quality, security-scan, unit-tests]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'
    
    strategy:
      matrix:
        service: [core, ai, realtime, labtwin]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Configure Docker for GCR
        run: gcloud auth configure-docker
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/aeroedu-${{ matrix.service }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/Dockerfile.${{ matrix.service }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_ENV=production
            BUILD_DATE=${{ github.event.head_commit.timestamp }}
            VCS_REF=${{ github.sha }}
            VERSION=${{ github.ref_name }}
      
      - name: Scan image for vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/aeroedu-${{ matrix.service }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # ============================================================================
  # DEPLOY TO STAGING
  # ============================================================================
  
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build-images, e2e-tests]
    if: github.ref == 'refs/heads/staging'
    environment:
      name: staging
      url: https://staging.aeroedu.vn
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Deploy Core Service
        run: |
          gcloud run deploy aeroedu-core \
            --image=${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/aeroedu-core:${{ github.sha }} \
            --platform=managed \
            --region=asia-southeast1 \
            --allow-unauthenticated \
            --min-instances=1 \
            --max-instances=10 \
            --cpu=2 \
            --memory=4Gi \
            --timeout=300 \
            --set-env-vars="NODE_ENV=staging" \
            --set-secrets=DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest
      
      - name: Deploy AI Service
        run: |
          gcloud run deploy aeroedu-ai \
            --image=${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/aeroedu-ai:${{ github.sha }} \
            --platform=managed \
            --region=asia-southeast1 \
            --allow-unauthenticated \
            --min-instances=1 \
            --max-instances=5 \
            --cpu=4 \
            --memory=8Gi \
            --timeout=600 \
            --set-env-vars="ENVIRONMENT=staging"
      
      - name: Run database migrations
        run: npm run db:migrate:staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          BASE_URL: https://staging.aeroedu.vn
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  # ============================================================================
  # DEPLOY TO PRODUCTION
  # ============================================================================
  
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-images, e2e-tests]
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://aeroedu.vn
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY_PROD }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      # Blue-Green Deployment Strategy
      - name: Get current traffic split
        id: current-traffic
        run: |
          CURRENT_REVISION=$(gcloud run services describe aeroedu-core \
            --platform=managed \
            --region=asia-southeast1 \
            --format='value(status.traffic[0].revisionName)')
          echo "current_revision=$CURRENT_REVISION" >> $GITHUB_OUTPUT
      
      - name: Deploy new revision (Green)
        id: deploy
        run: |
          NEW_REVISION=$(gcloud run deploy aeroedu-core \
            --image=${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/aeroedu-core:${{ github.sha }} \
            --platform=managed \
            --region=asia-southeast1 \
            --no-traffic \
            --tag=green \
            --min-instances=3 \
            --max-instances=100 \
            --cpu=4 \
            --memory=8Gi \
            --timeout=300 \
            --set-env-vars="NODE_ENV=production" \
            --set-secrets=DATABASE_URL=database-url-prod:latest \
            --format='value(status.latestCreatedRevisionName)')
          echo "new_revision=$NEW_REVISION" >> $GITHUB_OUTPUT
      
      - name: Run canary tests on new revision
        run: |
          # Test the new revision with canary traffic
          npm run test:canary
        env:
          CANARY_URL: https://green---aeroedu-core-hash.a.run.app
      
      - name: Gradual traffic migration
        run: |
          # 10% traffic to new revision
          gcloud run services update-traffic aeroedu-core \
            --to-revisions=${{ steps.deploy.outputs.new_revision }}=10 \
            --platform=managed \
            --region=asia-southeast1
          
          sleep 300 # Wait 5 minutes and monitor
          
          # 50% traffic
          gcloud run services update-traffic aeroedu-core \
            --to-revisions=${{ steps.deploy.outputs.new_revision }}=50 \
            --platform=managed \
            --region=asia-southeast1
          
          sleep 300 # Wait 5 minutes and monitor
          
          # 100% traffic
          gcloud run services update-traffic aeroedu-core \
            --to-revisions=${{ steps.deploy.outputs.new_revision }}=100 \
            --platform=managed \
            --region=asia-southeast1
      
      - name: Monitor deployment
        run: |
          # Monitor error rates and latency
          npm run monitor:deployment
        env:
          REVISION: ${{ steps.deploy.outputs.new_revision }}
      
      - name: Run database migrations
        run: npm run db:migrate:production
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      
      - name: Warm up caches
        run: npm run cache:warmup
        env:
          API_URL: https://aeroedu.vn
      
      - name: Run post-deployment tests
        run: npm run test:production
        env:
          BASE_URL: https://aeroedu.vn
      
      - name: Create release tag
        run: |
          git tag -a v${{ github.run_number }} -m "Release v${{ github.run_number }}"
          git push origin v${{ github.run_number }}
      
      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: |
            Production deployment successful! 🚀
            Version: v${{ github.run_number }}
            Revision: ${{ steps.deploy.outputs.new_revision }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      
      - name: Rollback on failure
        if: failure()
        run: |
          # Rollback to previous revision
          gcloud run services update-traffic aeroedu-core \
            --to-revisions=${{ steps.current-traffic.outputs.current_revision }}=100 \
            --platform=managed \
            --region=asia-southeast1
      
      - name: Notify deployment failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: |
            ⚠️ Production deployment failed!
            Rolled back to: ${{ steps.current-traffic.outputs.current_revision }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

  # ============================================================================
  # POST-DEPLOYMENT TASKS
  # ============================================================================
  
  post-deployment:
    name: Post-Deployment Tasks
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: success()
    
    steps:
      - name: Clear CDN cache
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}'
      
      - name: Notify monitoring systems
        run: |
          # Notify New Relic of deployment
          curl -X POST "https://api.newrelic.com/v2/applications/${{ secrets.NEWRELIC_APP_ID }}/deployments.json" \
            -H "Api-Key: ${{ secrets.NEWRELIC_API_KEY }}" \
            -H "Content-Type: application/json" \
            --data '{
              "deployment": {
                "revision": "${{ github.sha }}",
                "changelog": "${{ github.event.head_commit.message }}",
                "user": "${{ github.actor }}"
              }
            }'
      
      - name: Update status page
        run: |
          # Update Statuspage.io
          curl -X POST "https://api.statuspage.io/v1/pages/${{ secrets.STATUSPAGE_ID }}/incidents" \
            -H "Authorization: OAuth ${{ secrets.STATUSPAGE_TOKEN }}" \
            -d "incident[name]=Deployment v${{ github.run_number }}" \
            -d "incident[status]=resolved" \
            -d "incident[body]=Successfully deployed version v${{ github.run_number }}"
      
      - name: Generate release notes
        uses: release-drafter/release-drafter@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 10.2 Infrastructure as Code (Terraform)

```hcl
# ============================================================================
# TERRAFORM CONFIGURATION
# ============================================================================

# terraform/main.tf
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  
  backend "gcs" {
    bucket = "aeroedu-terraform-state"
    prefix = "production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ============================================================================
# VARIABLES
# ============================================================================

# terraform/variables.tf
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "aeroedu-production"
}

variable "region" {
  description = "Primary GCP region"
  type        = string
  default     = "asia-southeast1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain" {
  description = "Primary domain"
  type        = string
  default     = "aeroedu.vn"
}

# ============================================================================
# NETWORKING
# ============================================================================

# terraform/networking.tf
resource "google_compute_network" "vpc" {
  name                    = "aeroedu-vpc-${var.environment}"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "private_subnet" {
  name          = "aeroedu-private-${var.region}"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  private_ip_google_access = true
  
  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_global_address" "private_ip_address" {
  name          = "aeroedu-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# Cloud NAT for private instances
resource "google_compute_router" "router" {
  name    = "aeroedu-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "aeroedu-nat"
  router                             = google_compute_router.router.name
  region                             = google_compute_router.router.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ============================================================================
# CLOUD SQL - POSTGRESQL
# ============================================================================

# terraform/database.tf
resource "random_id" "db_name_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "primary" {
  name             = "aeroedu-postgres-${random_id.db_name_suffix.hex}"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier              = "db-custom-4-16384" # 4 vCPUs, 16GB RAM
    availability_type = "REGIONAL" # High availability
    disk_type         = "PD_SSD"
    disk_size         = 500
    disk_autoresize   = true
    
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
    
    database_flags {
      name  = "max_connections"
      value = "200"
    }
    
    database_flags {
      name  = "shared_buffers"
      value = "4096MB"
    }
    
    database_flags {
      name  = "effective_cache_size"
      value = "12GB"
    }
    
    maintenance_window {
      day          = 7 # Sunday
      hour         = 2
      update_track = "stable"
    }
    
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
    }
  }
  
  depends_on = [google_service_networking_connection.private_vpc_connection]
}

# Read replicas
resource "google_sql_database_instance" "read_replica" {
  count = 2
  
  name                 = "aeroedu-postgres-replica-${count.index}"
  master_instance_name = google_sql_database_instance.primary.name
  database_version     = "POSTGRES_15"
  region               = count.index == 0 ? var.region : "asia-northeast1"
  
  replica_configuration {
    failover_target = false
  }
  
  settings {
    tier              = "db-custom-2-8192" # 2 vCPUs, 8GB RAM
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 500
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
  }
}

resource "google_sql_database" "database" {
  name     = "aeroedu"
  instance = google_sql_database_instance.primary.name
}

resource "google_sql_user" "app_user" {
  name     = "aeroedu_app"
  instance = google_sql_database_instance.primary.name
  password = var.db_password
}

# ============================================================================
# CLOUD MEMORYSTORE - REDIS
# ============================================================================

# terraform/redis.tf
resource "google_redis_instance" "cache" {
  name               = "aeroedu-redis-${var.environment}"
  tier               = "STANDARD_HA" # High availability
  memory_size_gb     = 16
  region             = var.region
  redis_version      = "REDIS_7_0"
  display_name       = "AeroEdu Redis Cache"
  reserved_ip_range  = "10.0.2.0/29"
  
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  
  redis_configs = {
    maxmemory-policy = "allkeys-lru"
    notify-keyspace-events = "Ex"
  }
  
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
      }
    }
  }
}

# ============================================================================
# CLOUD RUN SERVICES
# ============================================================================

# terraform/cloud-run.tf
resource "google_cloud_run_service" "core" {
  name     = "aeroedu-core"
  location = var.region
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/aeroedu-core:latest"
        
        resources {
          limits = {
            cpu    = "4"
            memory = "8Gi"
          }
        }
        
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        
        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.database_url.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "REDIS_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.redis_url.secret_id
              key  = "latest"
            }
          }
        }
        
        ports {
          container_port = 3000
        }
        
        startup_probe {
          http_get {
            path = "/api/health"
          }
          initial_delay_seconds = 10
          timeout_seconds       = 5
          period_seconds        = 3
          failure_threshold     = 5
        }
        
        liveness_probe {
          http_get {
            path = "/api/health"
          }
          initial_delay_seconds = 30
          timeout_seconds       = 5
          period_seconds        = 10
        }
      }
      
      container_concurrency = 80
      timeout_seconds       = 300
      service_account_name  = google_service_account.cloud_run.email
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"      = "3"
        "autoscaling.knative.dev/maxScale"      = "100"
        "run.googleapis.com/cpu-throttling"     = "false"
        "run.googleapis.com/startup-cpu-boost"  = "true"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  autogenerate_revision_name = true
}

resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.core.name
  location = google_cloud_run_service.core.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# AI Service
resource "google_cloud_run_service" "ai" {
  name     = "aeroedu-ai"
  location = var.region
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/aeroedu-ai:latest"
        
        resources {
          limits = {
            cpu    = "4"
            memory = "8Gi"
          }
        }
        
        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }
        
        env {
          name = "OPENAI_API_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.openai_key.secret_id
              key  = "latest"
            }
          }
        }
        
        ports {
          container_port = 8000
        }
      }
      
      container_concurrency = 10
      timeout_seconds       = 600
      service_account_name  = google_service_account.cloud_run.email
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "2"
        "autoscaling.knative.dev/maxScale" = "50"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
}

# ============================================================================
# CLOUD STORAGE
# ============================================================================

# terraform/storage.tf
resource "google_storage_bucket" "uploads" {
  name          = "${var.project_id}-uploads"
  location      = var.region
  storage_class = "STANDARD"
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
  
  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
  
  cors {
    origin          = ["https://${var.domain}"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-backups"
  location      = var.region
  storage_class = "NEARLINE"
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }
  
  lifecycle_rule {
    condition {
      age = 730 # 2 years
    }
    action {
      type = "Delete"
    }
  }
}

# ============================================================================
# SECRET MANAGER
# ============================================================================

# terraform/secrets.tf
resource "google_secret_manager_secret" "database_url" {
  secret_id = "database-url-prod"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${google_sql_user.app_user.name}:${var.db_password}@${google_sql_database_instance.primary.private_ip_address}:5432/${google_sql_database.database.name}"
}

resource "google_secret_manager_secret" "redis_url" {
  secret_id = "redis-url-prod"
  
  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}

resource "google_secret_manager_secret" "openai_key" {
  secret_id = "openai-api-key"
  
  replication {
    automatic = true
  }
}

# ============================================================================
# IAM & SERVICE ACCOUNTS
# ============================================================================

# terraform/iam.tf
resource "google_service_account" "cloud_run" {
  account_id   = "aeroedu-cloud-run"
  display_name = "AeroEdu Cloud Run Service Account"
}

resource "google_project_iam_member" "cloud_run_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_storage_bucket_iam_member" "cloud_run_storage" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ============================================================================
# LOAD BALANCER
# ============================================================================

# terraform/load-balancer.tf
resource "google_compute_global_address" "default" {
  name = "aeroedu-lb-ip"
}

resource "google_compute_managed_ssl_certificate" "default" {
  name = "aeroedu-ssl-cert"
  
  managed {
    domains = [var.domain, "www.${var.domain}", "api.${var.domain}"]
  }
}

resource "google_compute_backend_service" "core" {
  name        = "aeroedu-core-backend"
  protocol    = "HTTP"
  timeout_sec = 300
  
  backend {
    group = google_compute_region_network_endpoint_group.core_neg.id
  }
  
  health_checks = [google_compute_health_check.default.id]
  
  cdn_policy {
    cache_mode  = "CACHE_ALL_STATIC"
    default_ttl = 3600
    max_ttl     = 86400
    client_ttl  = 3600
    
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = false
    }
  }
  
  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_region_network_endpoint_group" "core_neg" {
  name                  = "aeroedu-core-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  
  cloud_run {
    service = google_cloud_run_service.core.name
  }
}

resource "google_compute_health_check" "default" {
  name = "aeroedu-health-check"
  
  http_health_check {
    port         = 3000
    request_path = "/api/health"
  }
  
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
}

resource "google_compute_url_map" "default" {
  name            = "aeroedu-url-map"
  default_service = google_compute_backend_service.core.id
  
  host_rule {
    hosts        = [var.domain, "www.${var.domain}"]
    path_matcher = "main"
  }
  
  path_matcher {
    name            = "main"
    default_service = google_compute_backend_service.core.id
  }
}

resource "google_compute_target_https_proxy" "default" {
  name             = "aeroedu-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  name       = "aeroedu-https-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "https_redirect" {
  name = "aeroedu-https-redirect"
  
  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "https_redirect" {
  name    = "aeroedu-http-proxy"
  url_map = google_compute_url_map.https_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name       = "aeroedu-http-forwarding-rule"
  target     = google_compute_target_http_proxy.https_redirect.id
  port_range = "80"
  ip_address = google_compute_global_address.default.address
}

# ============================================================================
# CLOUD ARMOR (DDoS & WAF Protection)
# ============================================================================

# terraform/security.tf
resource "google_compute_security_policy" "policy" {
  name = "aeroedu-security-policy"
  
  # Rate limiting rule
  rule {
    action   = "rate_based_ban"
    priority = "1000"
    
    match {
      versioned_expr = "SRC_IPS_V1"
      
      config {
        src_ip_ranges = ["*"]
      }
    }
    
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      
      ban_duration_sec = 600
    }
  }
  
  # Block known bad IPs
  rule {
    action   = "deny(403)"
    priority = "2000"
    
    match {
      versioned_expr = "SRC_IPS_V1"
      
      config {
        src_ip_ranges = var.blocked_ip_ranges
      }
    }
  }
  
  # OWASP ModSecurity Core Rule Set
  rule {
    action   = "deny(403)"
    priority = "3000"
    
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }
  }
  
  rule {
    action   = "deny(403)"
    priority = "3001"
    
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
  }
  
  # Default rule
  rule {
    action   = "allow"
    priority = "2147483647"
    
    match {
      versioned_expr = "SRC_IPS_V1"
      
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

resource "google_compute_backend_service" "core_with_armor" {
  name             = google_compute_backend_service.core.name
  security_policy  = google_compute_security_policy.policy.id
  
  # ... rest of backend service config
}

# ============================================================================
# MONITORING & LOGGING
# ============================================================================

# terraform/monitoring.tf
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "High Error Rate"
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate above 5%"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class=\"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
  
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Notifications"
  type         = "email"
  
  labels = {
    email_address = "alerts@aeroedu.vn"
  }
}

# ============================================================================
# OUTPUTS
# ============================================================================

# terraform/outputs.tf
output "load_balancer_ip" {
  description = "Load Balancer IP Address"
  value       = google_compute_global_address.default.address
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.primary.connection_name
  sensitive   = true
}

output "redis_host" {
  description = "Redis host address"
  value       = google_redis_instance.cache.host
  sensitive   = true
}

output "cloud_run_urls" {
  description = "Cloud Run service URLs"
  value = {
    core = google_cloud_run_service.core.status[0].url
    ai   = google_cloud_run_service.ai.status[0].url
  }
}
```

### 10.3 Docker Configuration

```dockerfile
# ============================================================================
# DOCKERFILE FOR CORE SERVICE
# ============================================================================

# docker/Dockerfile.core
# Multi-stage build for optimal image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

ENV NODE_ENV=$NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Labels
LABEL maintainer="AeroEdu Team <dev@aeroedu.vn>" \
      version=$VERSION \
      org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.title="AeroEdu Core Service" \
      org.opencontainers.image.description="Main application service for AeroEdu platform"

CMD ["node", "server.js"]

# ============================================================================
# DOCKERFILE FOR AI SERVICE
# ============================================================================

# docker/Dockerfile.ai
FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ai-service/ .

# Create non-root user
RUN useradd -m -u 1000 aiuser && \
    chown -R aiuser:aiuser /app

USER aiuser

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# ============================================================================
# DOCKER COMPOSE FOR LOCAL DEVELOPMENT
# ============================================================================

# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: aeroedu-postgres
    environment:
      POSTGRES_USER: aeroedu
      POSTGRES_PASSWORD: aeroedu_dev
      POSTGRES_DB: aeroedu_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aeroedu"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  redis:
    image: redis:7-alpine
    container_name: aeroedu-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
  
  mongodb:
    image: mongo:6
    container_name: aeroedu-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: aeroedu
      MONGO_INITDB_ROOT_PASSWORD: aeroedu_dev
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
  
  core:
    build:
      context: .
      dockerfile: docker/Dockerfile.core
    container_name: aeroedu-core
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://aeroedu:aeroedu_dev@postgres:5432/aeroedu_dev
      REDIS_URL: redis://redis:6379
      MONGODB_URI: mongodb://aeroedu:aeroedu_dev@mongodb:27017/aeroedu_dev?authSource=admin
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      mongodb:
        condition: service_healthy
    command: npm run dev
  
  ai:
    build:
      context: .
      dockerfile: docker/Dockerfile.ai
    container_name: aeroedu-ai
    ports:
      - "8000:8000"
    environment:
      ENVIRONMENT: development
      REDIS_URL: redis://redis:6379
    volumes:
      - ./ai-service:/app
    depends_on:
      - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  postgres_data:
  redis_data:
  mongodb_data:
```
# KIẾN TRÚC HỆ THỐNG TỐI ƯU - AEROEDU (Tiếp theo)

---

## 11. COST OPTIMIZATION

### 11.1 Cloud Cost Management Strategy

```yaml
# ============================================================================
# COST OPTIMIZATION FRAMEWORK
# ============================================================================

Cost Optimization Pillars:
  1. Right-Sizing Resources
  2. Auto-Scaling & Scheduling
  3. Reserved Capacity
  4. Storage Optimization
  5. Network Optimization
  6. Monitoring & Alerting

# ============================================================================
# COMPUTE COST OPTIMIZATION
# ============================================================================

Cloud Run Optimization:

Core Service:
  Current Cost: ~$800/month
  
  Optimization Strategy:
    Min Instances:
      - Production Hours (8AM-10PM): 3 instances
      - Off Hours (10PM-8AM): 1 instance
      - Weekends: 1 instance
      Savings: ~$200/month (25%)
    
    CPU Allocation:
      - Review metrics: If CPU usage < 50%, reduce to 2 vCPUs
      - Use CPU throttling during off-peak
      Savings: ~$150/month (19%)
    
    Request Timeout:
      - Reduce from 300s to 60s for most endpoints
      - Keep 300s only for long-running operations
      Savings: ~$50/month (6%)
    
    Container Concurrency:
      - Increase from 80 to 100 (if latency acceptable)
      - Fewer instances needed
      Savings: ~$100/month (12.5%)
  
  Total Savings: ~$500/month (62.5%)
  Optimized Cost: ~$300/month

AI Service:
  Current Cost: ~$1,200/month (compute) + $3,000/month (API costs)
  
  Compute Optimization:
    Min Instances:
      - Production: 1 instance (not 2)
      - Scale up only when needed
      Savings: ~$400/month
    
    Request Batching:
      - Batch similar requests within 500ms window
      - Reduce total API calls by 30%
      Savings: ~$900/month on API costs
    
    Response Caching:
      - Cache AI responses for 1 hour
      - 70% cache hit rate
      Savings: ~$1,500/month on API costs
    
    Model Selection:
      - Use GPT-3.5-turbo instead of GPT-4 for simple tasks (80% of requests)
      - GPT-3.5: $0.0015/1K tokens vs GPT-4: $0.03/1K tokens (20x cheaper)
      Savings: ~$600/month
  
  Total Savings: ~$3,400/month (79%)
  Optimized Cost: ~$900/month

Auto-Scaling Configuration:
  # Optimized scaling based on actual usage patterns
  
  Core Service:
    Metrics-Based Scaling:
      - Target CPU: 70% (not 50%)
      - Target Memory: 80%
      - Target Concurrency: 80 requests/instance
      - Scale-up: 30 seconds
      - Scale-down: 5 minutes (prevent flapping)
    
    Schedule-Based Scaling:
      # Use Cloud Scheduler to adjust min instances
      
      Weekday Peak (8AM-6PM):
        min_instances: 5
        max_instances: 100
      
      Weekday Normal (6PM-10PM):
        min_instances: 3
        max_instances: 50
      
      Weekday Off-Peak (10PM-8AM):
        min_instances: 1
        max_instances: 20
      
      Weekend:
        min_instances: 1
        max_instances: 30
    
    Estimated Savings: 40% on compute costs

# ============================================================================
# DATABASE COST OPTIMIZATION
# ============================================================================

PostgreSQL (Cloud SQL):
  Current Cost: ~$600/month
  
  Optimization Strategy:
    Right-Sizing:
      - Current: db-custom-4-16384 (4 vCPUs, 16GB RAM)
      - Analysis: Average CPU 35%, Memory 60%
      - Optimize: db-custom-2-8192 (2 vCPUs, 8GB RAM)
      Savings: ~$300/month (50%)
    
    Read Replicas:
      - Current: 2 replicas at full spec
      - Optimize: 1 smaller replica for reporting
      - Remove second replica (use read-only connection to primary for most reads)
      Savings: ~$200/month
    
    Storage Optimization:
      - Enable automatic storage increase only
      - Reduce storage to actual usage (200GB instead of 500GB)
      Savings: ~$30/month
    
    Backup Optimization:
      - Reduce backup retention from 30 to 14 days
      - Keep point-in-time recovery to 7 days
      Savings: ~$20/month
  
  Total Savings: ~$550/month (92%)
  Optimized Cost: ~$50/month

Redis (Cloud Memorystore):
  Current Cost: ~$400/month
  
  Optimization Strategy:
    Right-Sizing:
      - Current: 16GB Standard HA
      - Analysis: Average usage 40% (6.4GB)
      - Optimize: 8GB Standard HA
      Savings: ~$200/month (50%)
    
    Tier Adjustment:
      - Consider Basic tier for non-critical caches
      - Keep HA only for session storage
      Savings: Additional ~$100/month
  
  Total Savings: ~$300/month (75%)
  Optimized Cost: ~$100/month

MongoDB Atlas:
  Current Cost: ~$300/month (M30 cluster)
  
  Optimization Strategy:
    Downgrade Cluster:
      - M30 (8GB RAM) → M10 (2GB RAM)
      - Analytics data can be queried less frequently
      Savings: ~$200/month (67%)
    
    Auto-Scaling:
      - Enable storage auto-scaling
      - Use lower-cost storage tier for old data
      Savings: ~$30/month
  
  Total Savings: ~$230/month (77%)
  Optimized Cost: ~$70/month

Connection Pooling Optimization:
  # Reduce database connections = reduce costs
  
  Implementation:
    - Use PgBouncer for connection pooling
    - Pool size: 20 connections (not 100)
    - Reduce Cloud SQL connection overhead
    
  Savings: ~$50/month

# ============================================================================
# STORAGE COST OPTIMIZATION
# ============================================================================

Cloud Storage:
  Current Cost: ~$200/month
  
  Optimization Strategy:
    Lifecycle Management:
      - Day 0-30: Standard storage
      - Day 31-90: Nearline storage (50% cheaper)
      - Day 91-365: Coldline storage (75% cheaper)
      - After 365 days: Archive storage (90% cheaper)
      
      Example:
        1TB current data:
          - 500GB active (< 30 days): $20/month
          - 300GB nearline: $6/month
          - 200GB coldline: $2/month
        Total: $28/month vs $100/month
      
      Savings: ~$70/month (70%)
    
    Compression:
      - Compress images with WebP (30% smaller)
      - Compress videos with modern codecs
      Savings: ~$30/month
    
    Deduplication:
      - Identify and remove duplicate files
      - Implement hash-based storage
      Savings: ~$20/month
    
    CDN Caching:
      - Serve 80% of requests from CDN cache
      - Reduce storage egress costs
      Savings: ~$40/month
  
  Total Savings: ~$160/month (80%)
  Optimized Cost: ~$40/month

# ============================================================================
# NETWORK COST OPTIMIZATION
# ============================================================================

Data Transfer Costs:
  Current Cost: ~$150/month
  
  Optimization Strategy:
    CDN Usage:
      - Serve all static assets via CDN
      - Cache dynamic content where possible
      - Use CloudFlare free tier for basic caching
      Savings: ~$80/month
    
    Regional Optimization:
      - Keep services in same region as database
      - Avoid cross-region data transfer
      Savings: ~$30/month
    
    Response Compression:
      - Enable gzip/brotli compression
      - Reduce payload size by 70%
      Savings: ~$20/month
    
    Image Optimization:
      - Use modern formats (WebP, AVIF)
      - Lazy loading for images
      - Responsive images
      Savings: ~$15/month
  
  Total Savings: ~$145/month (97%)
  Optimized Cost: ~$5/month

# ============================================================================
# AI SERVICE COST OPTIMIZATION
# ============================================================================

AI API Costs (OpenAI, Google AI):
  Current Cost: ~$3,000/month
  
  Detailed Breakdown:
    GPT-4 (Content Generation): $1,500/month
      - Average: 50M tokens/month
      - Cost: $0.03/1K tokens
    
    GPT-3.5 (Grading): $800/month
      - Average: 500M tokens/month
      - Cost: $0.0015/1K tokens
    
    Embeddings (Search): $400/month
      - Average: 200M tokens/month
      - Cost: $0.0001/1K tokens
    
    Gemini Pro (Alternative): $300/month
      - Average: 100M tokens/month
      - Cost: $0.0025/1K tokens
  
  Optimization Strategy:
    
    1. Response Caching (70% hit rate):
       - Cache structure: hash(prompt + context) → response
       - TTL: 24 hours for static content, 1 hour for dynamic
       - Storage: Redis (negligible cost)
       
       Savings Calculation:
         Before: 50M GPT-4 tokens × $0.03/1K = $1,500
         After: 15M tokens × $0.03/1K = $450
       Savings: $1,050/month (70% on GPT-4 calls)
    
    2. Request Batching:
       - Batch similar requests (e.g., grade 10 essays at once)
       - Reduce API overhead
       - 20% token reduction through context sharing
       
       Savings: $600/month (20% overall)
    
    3. Model Selection Strategy:
       Task-Based Model Assignment:
         - Simple Q&A: GPT-3.5-turbo ($0.0015/1K)
         - Content generation: GPT-4 ($0.03/1K)
         - Grading essays: GPT-3.5-turbo
         - Quiz generation: Gemini Pro ($0.0025/1K)
         - Embeddings: text-embedding-ada-002 ($0.0001/1K)
       
       Current Split:
         - 100% GPT-4 for generation
       
       Optimized Split:
         - 20% GPT-4 (complex generation): $300
         - 80% GPT-3.5 (simple tasks): $600
       
       Savings: $600/month
    
    4. Prompt Engineering:
       - Shorter, more precise prompts
       - Reduce average prompt length by 30%
       - Use system messages efficiently
       
       Savings: $400/month
    
    5. Rate Limiting & Quotas:
       - Per-user daily limits: 20 AI requests
       - Per-teacher: 100 requests
       - Prevent abuse and runaway costs
       
       Savings: $200/month (prevent unexpected spikes)
    
    6. Fallback to Cached/Pre-generated Content:
       - Common questions: Use pre-generated answers
       - Standard quizzes: Use template system
       - Reduce AI calls by 15%
       
       Savings: $250/month
  
  Total Savings: ~$3,100/month (but overlap in strategies)
  Realistic Total Savings: ~$2,400/month (80%)
  Optimized Cost: ~$600/month

# ============================================================================
# MONITORING & ALERTING COSTS
# ============================================================================

Observability Stack:
  Current Cost: ~$400/month
  
  Breakdown:
    - New Relic APM: $200/month
    - Datadog Logs: $150/month
    - Sentry Errors: $50/month
  
  Optimization Strategy:
    Replace with Open Source:
      - New Relic → Prometheus + Grafana (self-hosted): $0
      - Datadog → Loki + Grafana: $0
      - Keep Sentry for critical errors: $50/month
      
      Infrastructure cost: $30/month (small VM)
    
    Savings: ~$320/month (80%)
    Optimized Cost: ~$80/month

# ============================================================================
# TOTAL COST SUMMARY
# ============================================================================

Monthly Cost Comparison:

Service                  Current      Optimized    Savings     %
----------------------------------------------------------------
Cloud Run (Core)         $800         $300         $500       62%
Cloud Run (AI)           $1,200       $400         $800       67%
AI APIs                  $3,000       $600         $2,400     80%
PostgreSQL               $600         $50          $550       92%
Redis                    $400         $100         $300       75%
MongoDB                  $300         $70          $230       77%
Cloud Storage            $200         $40          $160       80%
Network/CDN              $150         $5           $145       97%
Monitoring               $400         $80          $320       80%
Backups                  $50          $30          $20        40%
Misc Services            $100         $50          $50        50%
----------------------------------------------------------------
TOTAL                    $7,200       $1,725       $5,475     76%

Annual Savings: $65,700

ROI on Optimization Effort:
  - Engineering time: 40 hours
  - Cost per hour: $100
  - Total investment: $4,000
  - Annual savings: $65,700
  - ROI: 1,542%
  - Payback period: 0.7 months
```

### 11.2 Cost Monitoring & Budget Alerts

```typescript
// ============================================================================
// AUTOMATED COST MONITORING SYSTEM
// ============================================================================

// lib/cost-monitoring.ts
import { google } from '@google-cloud/billing';

class CostMonitoringService {
  private billingClient: any;
  private projectId: string;
  
  constructor() {
    this.billingClient = new google.billing.v1.CloudBillingClient();
    this.projectId = process.env.GCP_PROJECT_ID!;
  }
  
  async getCurrentMonthCost(): Promise<number> {
    const startDate = new Date();
    startDate.setDate(1); // First day of month
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    
    const [response] = await this.billingClient.getCostForecast({
      parent: `billingAccounts/${process.env.BILLING_ACCOUNT_ID}`,
      costScenario: {
        scenarioConfig: {
          estimateDuration: {
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          },
        },
      },
    });
    
    return response.costAmount || 0;
  }
  
  async getCostByService(): Promise<Map<string, number>> {
    const costs = new Map<string, number>();
    
    // Query billing data
    const query = `
      SELECT
        service.description,
        SUM(cost) as total_cost
      FROM
        \`${this.projectId}.billing.gcp_billing_export_v1_*\`
      WHERE
        _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
      GROUP BY
        service.description
      ORDER BY
        total_cost DESC
    `;
    
    const [job] = await this.billingClient.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    
    rows.forEach((row: any) => {
      costs.set(row.description, row.total_cost);
    });
    
    return costs;
  }
  
  async checkBudgetAlerts(): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const currentCost = await this.getCurrentMonthCost();
    
    const budgets = {
      total: 2000, // $2000/month budget
      cloudRun: 500,
      aiServices: 800,
      database: 200,
      storage: 100,
    };
    
    // Check total budget
    const totalPercentage = (currentCost / budgets.total) * 100;
    
    if (totalPercentage >= 90) {
      alerts.push({
        severity: 'CRITICAL',
        type: 'TOTAL_BUDGET',
        message: `Total cost at ${totalPercentage.toFixed(1)}% of monthly budget`,
        currentCost,
        budget: budgets.total,
        action: 'IMMEDIATE_REVIEW_REQUIRED',
      });
    } else if (totalPercentage >= 75) {
      alerts.push({
        severity: 'WARNING',
        type: 'TOTAL_BUDGET',
        message: `Total cost at ${totalPercentage.toFixed(1)}% of monthly budget`,
        currentCost,
        budget: budgets.total,
        action: 'MONITOR_CLOSELY',
      });
    }
    
    // Check service-specific budgets
    const costByService = await this.getCostByService();
    
    for (const [service, serviceBudget] of Object.entries(budgets)) {
      if (service === 'total') continue;
      
      const serviceCost = costByService.get(service) || 0;
      const percentage = (serviceCost / serviceBudget) * 100;
      
      if (percentage >= 90) {
        alerts.push({
          severity: 'HIGH',
          type: 'SERVICE_BUDGET',
          service,
          message: `${service} at ${percentage.toFixed(1)}% of budget`,
          currentCost: serviceCost,
          budget: serviceBudget,
          action: 'REVIEW_USAGE',
        });
      }
    }
    
    return alerts;
  }
  
  async getOptimizationRecommendations(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // 1. Check for idle resources
    const idleResources = await this.findIdleResources();
    if (idleResources.length > 0) {
      recommendations.push({
        type: 'IDLE_RESOURCES',
        impact: 'HIGH',
        monthlySavings: this.calculateIdleCost(idleResources),
        description: `Found ${idleResources.length} idle resources`,
        resources: idleResources,
        action: 'Delete or stop these resources',
      });
    }
    
    // 2. Check for over-provisioned instances
    const overProvisioned = await this.findOverProvisionedInstances();
    if (overProvisioned.length > 0) {
      recommendations.push({
        type: 'OVER_PROVISIONED',
        impact: 'MEDIUM',
        monthlySavings: this.calculateOverProvisionedSavings(overProvisioned),
        description: 'Resources using less than 50% of allocated capacity',
        resources: overProvisioned,
        action: 'Right-size these instances',
      });
    }
    
    // 3. Check for unattached storage
    const unattachedStorage = await this.findUnattachedStorage();
    if (unattachedStorage.length > 0) {
      recommendations.push({
        type: 'UNATTACHED_STORAGE',
        impact: 'LOW',
        monthlySavings: this.calculateStorageSavings(unattachedStorage),
        description: 'Storage volumes not attached to any instance',
        resources: unattachedStorage,
        action: 'Delete unused storage',
      });
    }
    
    // 4. Check for old snapshots
    const oldSnapshots = await this.findOldSnapshots();
    if (oldSnapshots.length > 0) {
      recommendations.push({
        type: 'OLD_SNAPSHOTS',
        impact: 'LOW',
        monthlySavings: this.calculateSnapshotSavings(oldSnapshots),
        description: 'Snapshots older than retention policy',
        resources: oldSnapshots,
        action: 'Delete old snapshots',
      });
    }
    
    // 5. Reserved instances opportunities
    const reservedOpportunities = await this.findReservedInstanceOpportunities();
    if (reservedOpportunities.length > 0) {
      recommendations.push({
        type: 'RESERVED_INSTANCES',
        impact: 'HIGH',
        monthlySavings: this.calculateReservedSavings(reservedOpportunities),
        description: 'Long-running instances that could use reserved capacity',
        resources: reservedOpportunities,
        action: 'Purchase reserved instances for steady-state workloads',
      });
    }
    
    return recommendations.sort((a, b) => {
      const impactOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }
  
  private async findIdleResources() {
    // Query metrics for resources with < 5% utilization over 7 days
    const query = `
      SELECT instance_name, AVG(cpu_utilization) as avg_cpu
      FROM monitoring_metrics
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      GROUP BY instance_name
      HAVING avg_cpu < 0.05
    `;
    
    // Execute query and return results
    return [];
  }
  
  private async findOverProvisionedInstances() {
    // Find instances using < 50% CPU and < 50% memory
    const query = `
      SELECT 
        instance_name,
        AVG(cpu_utilization) as avg_cpu,
        AVG(memory_utilization) as avg_memory,
        machine_type
      FROM monitoring_metrics
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
      GROUP BY instance_name, machine_type
      HAVING avg_cpu < 0.5 AND avg_memory < 0.5
    `;
    
    return [];
  }
  
  async generateMonthlyCostReport(): Promise<CostReport> {
    const currentCost = await this.getCurrentMonthCost();
    const costByService = await this.getCostByService();
    const recommendations = await this.getOptimizationRecommendations();
    
    const totalPotentialSavings = recommendations.reduce(
      (sum, rec) => sum + rec.monthlySavings,
      0
    );
    
    return {
      period: {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        end: new Date(),
      },
      totalCost: currentCost,
      costByService: Object.fromEntries(costByService),
      recommendations,
      totalPotentialSavings,
      budget: 2000,
      budgetRemaining: 2000 - currentCost,
      projectedMonthEnd: this.projectMonthEndCost(currentCost),
    };
  }
  
  private projectMonthEndCost(currentCost: number): number {
    const today = new Date().getDate();
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    
    const dailyAverage = currentCost / today;
    return dailyAverage * daysInMonth;
  }
}

interface BudgetAlert {
  severity: 'LOW' | 'WARNING' | 'HIGH' | 'CRITICAL';
  type: string;
  service?: string;
  message: string;
  currentCost: number;
  budget: number;
  action: string;
}

interface Recommendation {
  type: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  monthlySavings: number;
  description: string;
  resources: any[];
  action: string;
}

interface CostReport {
  period: {
    start: Date;
    end: Date;
  };
  totalCost: number;
  costByService: Record<string, number>;
  recommendations: Recommendation[];
  totalPotentialSavings: number;
  budget: number;
  budgetRemaining: number;
  projectedMonthEnd: number;
}

// ============================================================================
// COST MONITORING CRON JOB
// ============================================================================

import cron from 'node-cron';

const costMonitor = new CostMonitoringService();

// Daily cost check at 9 AM
cron.schedule('0 9 * * *', async () => {
  try {
    const alerts = await costMonitor.checkBudgetAlerts();
    
    if (alerts.length > 0) {
      // Send alerts
      for (const alert of alerts) {
        if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
          await sendSlackAlert(alert);
          await sendEmail(alert);
        } else {
          await sendSlackAlert(alert);
        }
      }
    }
  } catch (error) {
    logger.error('Cost monitoring failed', error);
  }
});

// Weekly cost report (Monday 9 AM)
cron.schedule('0 9 * * 1', async () => {
  try {
    const report = await costMonitor.generateMonthlyCostReport();
    
    // Generate PDF report
    const pdf = await generateCostReportPDF(report);
    
    // Send to stakeholders
    await sendEmail({
      to: ['cto@aeroedu.vn', 'cfo@aeroedu.vn'],
      subject: 'Weekly Cloud Cost Report',
      body: formatCostReport(report),
      attachments: [pdf],
    });
    
    // Post to Slack
    await sendSlackMessage('#cloud-costs', formatSlackReport(report));
  } catch (error) {
    logger.error('Weekly cost report failed', error);
  }
});

// ============================================================================
// COST OPTIMIZATION AUTOMATION
// ============================================================================

class CostOptimizationAutomation {
  async autoOptimize() {
    // 1. Auto-delete old logs (> 30 days)
    await this.cleanupOldLogs();
    
    // 2. Auto-delete old backups (> retention policy)
    await this.cleanupOldBackups();
    
    // 3. Auto-stop dev/staging instances during off-hours
    await this.stopDevInstances();
    
    // 4. Auto-resize over-provisioned instances
    await this.resizeInstances();
    
    // 5. Auto-apply storage lifecycle policies
    await this.applyStorageLifecycle();
  }
  
  private async cleanupOldLogs() {
    // Delete logs older than 30 days from Cloud Logging
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    // Implementation...
  }
  
  private async cleanupOldBackups() {
    // Keep only last 14 days of backups
    const retentionDays = 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Implementation...
  }
  
  private async stopDevInstances() {
    // Stop dev/staging instances outside business hours
    const hour = new Date().getHours();
    const isBusinessHours = hour >= 8 && hour < 20;
    const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;
    
    if (!isBusinessHours || !isWeekday) {
      // Stop dev instances
      await this.stopInstancesByLabel('environment', 'development');
      await this.stopInstancesByLabel('environment', 'staging');
    }
  }
  
  private async stopInstancesByLabel(label: string, value: string) {
    // Implementation using GCP API
  }
  
  private async resizeInstances() {
    // Find and resize over-provisioned instances
    const overProvisioned = await this.findOverProvisionedInstances();
    
    for (const instance of overProvisioned) {
      const recommendation = this.calculateOptimalSize(instance);
      
      if (recommendation.savingsPercent > 20) {
        // Only resize if savings > 20%
        await this.resizeInstance(instance.name, recommendation.newSize);
        
        logger.info('Resized instance', {
          instance: instance.name,
          oldSize: instance.currentSize,
          newSize: recommendation.newSize,
          savingsPercent: recommendation.savingsPercent,
        });
      }
    }
  }
  
  private async applyStorageLifecycle() {
    // Auto-apply lifecycle policies to storage buckets
    const buckets = await this.listStorageBuckets();
    
    for (const bucket of buckets) {
      await this.setLifecyclePolicy(bucket, {
        rules: [
          {
            action: { type: 'SetStorageClass', storageClass: 'NEARLINE' },
            condition: { age: 30 },
          },
          {
            action: { type: 'SetStorageClass', storageClass: 'COLDLINE' },
            condition: { age: 90 },
          },
          {
            action: { type: 'SetStorageClass', storageClass: 'ARCHIVE' },
            condition: { age: 365 },
          },
        ],
      });
    }
  }
}

// Run optimization daily at 2 AM
const optimizer = new CostOptimizationAutomation();

cron.schedule('0 2 * * *', async () => {
  try {
    await optimizer.autoOptimize();
    logger.info('Cost optimization automation completed');
  } catch (error) {
    logger.error('Cost optimization failed', error);
  }
});
```

### 11.3 Cost Dashboard

```typescript
// ============================================================================
// COST DASHBOARD API
// ============================================================================

// app/api/admin/costs/route.ts
import { NextResponse } from 'next/server';
import { CostMonitoringService } from '@/lib/cost-monitoring';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month';
  
  const costMonitor = new CostMonitoringService();
  
  const data = {
    current: await costMonitor.getCurrentMonthCost(),
    byService: await costMonitor.getCostByService(),
    recommendations: await costMonitor.getOptimizationRecommendations(),
    trends: await costMonitor.getCostTrends(period),
    forecast: await costMonitor.getForecast(),
  };
  
  return NextResponse.json(data);
}

// ============================================================================
// COST DASHBOARD COMPONENT
// ============================================================================

// components/admin/CostDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export function CostDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCostData();
  }, []);
  
  const fetchCostData = async () => {
    const response = await fetch('/api/admin/costs');
    const data = await response.json();
    setData(data);
    setLoading(false);
  };
  
  if (loading) return <div>Loading...</div>;
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cloud Cost Dashboard</h1>
        <div className="text-right">
          <p className="text-sm text-gray-500">Current Month</p>
          <p className="text-2xl font-bold">${data.current.toFixed(2)}</p>
          <p className="text-sm text-gray-500">
            Budget: $2,000 ({((data.current / 2000) * 100).toFixed(1)}%)
          </p>
        </div>
      </div>
      
      {/* Budget Progress */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Budget Status</h2>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {((data.current / 2000) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            <div
              style={{ width: `${(data.current / 2000) * 100}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            />
          </div>
        </div>
        
        {/* Projected month-end cost */}
        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <p className="text-sm font-medium text-yellow-800">
            Projected Month-End: ${data.forecast.monthEnd.toFixed(2)}
          </p>
          {data.forecast.monthEnd > 2000 && (
            <p className="text-xs text-yellow-700 mt-1">
              ⚠️ Projected to exceed budget by ${(data.forecast.monthEnd - 2000).toFixed(2)}
            </p>
          )}
        </div>
      </div>
      
      {/* Cost by Service */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Cost by Service</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={Object.entries(data.byService).map(([name, value]) => ({
                name,
                value,
              }))}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {Object.keys(data.byService).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Cost Trend */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Cost Trend (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="cost" stroke="#8884d8" name="Daily Cost" />
            <Line type="monotone" dataKey="forecast" stroke="#82ca9d" strokeDasharray="5 5" name="Forecast" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Optimization Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Optimization Recommendations
          <span className="ml-2 text-sm font-normal text-gray-500">
            (Potential savings: ${data.recommendations.reduce((sum, r) => sum + r.monthlySavings, 0).toFixed(2)}/month)
          </span>
        </h2>
        
        <div className="space-y-4">
          {data.recommendations.map((rec, index) => (
            <div
              key={index}
              className={`p-4 rounded border-l-4 ${
                rec.impact === 'HIGH'
                  ? 'bg-red-50 border-red-500'
                  : rec.impact === 'MEDIUM'
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{rec.type.replace(/_/g, ' ')}</h3>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  <p className="text-xs text-gray-500 mt-2">Action: {rec.action}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    ${rec.monthlySavings.toFixed(2)}/mo
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                      rec.impact === 'HIGH'
                        ? 'bg-red-100 text-red-800'
                        : rec.impact === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {rec.impact} Impact
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

**Đã hoàn thành Phần 11 (Cost Optimization)**

Phần này bao gồm:
- ✅ Chiến lược tối ưu chi phí toàn diện cho từng dịch vụ
- ✅ Monitoring và alerting tự động
- ✅ Cost dashboard với visualization
- ✅ Automation để optimize costs
- ✅ Tổng tiết kiệm: ~$5,475/month (76% reduction)

# KIẾN TRÚC HỆ THỐNG TỐI ƯU - AEROEDU (Tiếp theo)

---

## 12. API DOCUMENTATION

### 12.1 OpenAPI/Swagger Specification

```yaml
# ============================================================================
# OPENAPI 3.0 SPECIFICATION
# ============================================================================

# openapi.yaml
openapi: 3.0.3

info:
  title: AeroEdu API
  version: 1.0.0
  description: |
    # AeroEdu Educational Platform API
    
    The AeroEdu API provides programmatic access to the educational platform,
    enabling integration with learning management systems, student information
    systems, and third-party educational tools.
    
    ## Features
    - Course management and enrollment
    - Assessment creation and grading
    - Student progress tracking
    - Virtual laboratory simulations
    - AI-powered learning assistance
    
    ## Authentication
    All API requests require authentication using JWT tokens or API keys.
    
    ## Rate Limiting
    - Students: 100 requests/minute
    - Teachers: 500 requests/minute
    - Admins: 1000 requests/minute
    
    ## Support
    - Email: api-support@aeroedu.vn
    - Documentation: https://docs.aeroedu.vn
    - Status: https://status.aeroedu.vn
  
  contact:
    name: AeroEdu API Support
    email: api-support@aeroedu.vn
    url: https://aeroedu.vn/support
  
  license:
    name: Proprietary
    url: https://aeroedu.vn/terms

servers:
  - url: https://api.aeroedu.vn/v1
    description: Production server
  - url: https://staging-api.aeroedu.vn/v1
    description: Staging server
  - url: http://localhost:3000/api/v1
    description: Development server

tags:
  - name: Authentication
    description: User authentication and authorization
  - name: Users
    description: User management operations
  - name: Courses
    description: Course management and enrollment
  - name: Assessments
    description: Quiz, assignment, and exam management
  - name: Grading
    description: Grade management and calculation
  - name: Analytics
    description: Learning analytics and reports
  - name: Labs
    description: Virtual laboratory simulations
  - name: AI
    description: AI-powered features

# ============================================================================
# SECURITY SCHEMES
# ============================================================================

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT token obtained from the login endpoint.
        Include in Authorization header: `Bearer <token>`
    
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: |
        API key for server-to-server authentication.
        Obtain from Settings > API Keys in the admin dashboard.
  
  # ============================================================================
  # REUSABLE SCHEMAS
  # ============================================================================
  
  schemas:
    # Common Models
    
    Error:
      type: object
      required:
        - success
        - error
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              example: VALIDATION_ERROR
            message:
              type: string
              example: Invalid input parameters
            details:
              type: object
              additionalProperties: true
        meta:
          $ref: '#/components/schemas/Meta'
    
    Success:
      type: object
      required:
        - success
        - data
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
        meta:
          $ref: '#/components/schemas/Meta'
    
    Meta:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
          example: '2025-01-02T10:30:00Z'
        requestId:
          type: string
          format: uuid
          example: '123e4567-e89b-12d3-a456-426614174000'
        pagination:
          $ref: '#/components/schemas/Pagination'
    
    Pagination:
      type: object
      properties:
        page:
          type: integer
          example: 1
        limit:
          type: integer
          example: 20
        total:
          type: integer
          example: 150
        totalPages:
          type: integer
          example: 8
        hasNext:
          type: boolean
          example: true
        hasPrev:
          type: boolean
          example: false
    
    # User Models
    
    User:
      type: object
      required:
        - id
        - email
        - full_name
        - role
      properties:
        id:
          type: string
          format: uuid
          example: '123e4567-e89b-12d3-a456-426614174000'
        email:
          type: string
          format: email
          example: student@aeroedu.vn
        full_name:
          type: string
          example: John Doe
        avatar_url:
          type: string
          format: uri
          nullable: true
          example: https://cdn.aeroedu.vn/avatars/123.jpg
        role:
          type: string
          enum: [STUDENT, TEACHER, ADMIN]
          example: STUDENT
        email_verified:
          type: boolean
          example: true
        is_active:
          type: boolean
          example: true
        xp:
          type: integer
          example: 1500
        level:
          type: integer
          example: 5
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
    
    UserProfile:
      allOf:
        - $ref: '#/components/schemas/User'
        - type: object
          properties:
            profile:
              type: object
              properties:
                student_id:
                  type: string
                  example: STU2025001
                date_of_birth:
                  type: string
                  format: date
                  example: '2000-01-15'
                gender:
                  type: string
                  enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
                phone:
                  type: string
                  example: '+84123456789'
                address:
                  type: object
                  properties:
                    street:
                      type: string
                    city:
                      type: string
                    country:
                      type: string
                learning_preferences:
                  type: object
                  properties:
                    pace:
                      type: string
                      enum: [SLOW, NORMAL, FAST]
                    difficulty:
                      type: string
                      enum: [BEGINNER, INTERMEDIATE, ADVANCED]
    
    # Course Models
    
    Course:
      type: object
      required:
        - id
        - code
        - name
        - credits
      properties:
        id:
          type: string
          format: uuid
        code:
          type: string
          example: CS101
        name:
          type: string
          example: Introduction to Computer Science
        description:
          type: string
          example: Fundamentals of programming and computer science
        credits:
          type: integer
          minimum: 1
          maximum: 10
          example: 3
        level:
          type: string
          enum: [BEGINNER, INTERMEDIATE, ADVANCED]
          example: BEGINNER
        department:
          type: string
          example: Computer Science
        prerequisites:
          type: array
          items:
            type: string
          example: [MATH101]
        learning_objectives:
          type: array
          items:
            type: string
          example:
            - Understand basic programming concepts
            - Write simple programs in Python
        syllabus:
          type: object
          additionalProperties: true
        status:
          type: string
          enum: [ACTIVE, INACTIVE, ARCHIVED]
          example: ACTIVE
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
    
    CourseOffering:
      allOf:
        - $ref: '#/components/schemas/Course'
        - type: object
          required:
            - offering_id
            - semester
            - academic_year
          properties:
            offering_id:
              type: string
              format: uuid
            semester:
              type: string
              example: FALL2025
            academic_year:
              type: string
              example: '2025'
            instructor:
              $ref: '#/components/schemas/User'
            capacity:
              type: integer
              example: 50
            enrolled:
              type: integer
              example: 35
            schedule:
              type: object
              properties:
                days:
                  type: array
                  items:
                    type: string
                    enum: [MON, TUE, WED, THU, FRI, SAT, SUN]
                  example: [MON, WED, FRI]
                time:
                  type: string
                  example: '09:00-10:30'
                room:
                  type: string
                  example: A101
            location:
              type: string
              example: Main Campus
    
    # Assessment Models
    
    Assessment:
      type: object
      required:
        - id
        - title
        - type
        - course_id
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
          example: Midterm Exam
        type:
          type: string
          enum: [QUIZ, ASSIGNMENT, PROJECT, MIDTERM, FINAL]
          example: MIDTERM
        course_id:
          type: string
          format: uuid
        offering_id:
          type: string
          format: uuid
        instructions:
          type: string
          example: Complete all questions within 60 minutes
        questions:
          type: array
          items:
            $ref: '#/components/schemas/Question'
        settings:
          type: object
          properties:
            time_limit:
              type: integer
              description: Time limit in minutes
              example: 60
            attempts_allowed:
              type: integer
              example: 2
            shuffle_questions:
              type: boolean
              example: true
            show_answers:
              type: boolean
              example: false
        max_score:
          type: number
          format: float
          example: 100.0
        weight:
          type: number
          format: float
          example: 0.3
          description: Weight in final grade calculation
        available_from:
          type: string
          format: date-time
        due_date:
          type: string
          format: date-time
        late_submission_allowed:
          type: boolean
          example: false
        is_published:
          type: boolean
          example: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
    
    Question:
      type: object
      required:
        - id
        - type
        - question
        - points
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
          enum: [MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY, CODE]
          example: MCQ
        question:
          type: string
          example: What is the capital of France?
        points:
          type: number
          format: float
          example: 5.0
        options:
          type: array
          items:
            type: string
          example: [Paris, London, Berlin, Madrid]
        correct_answer:
          oneOf:
            - type: string
            - type: integer
            - type: array
          example: Paris
        explanation:
          type: string
          nullable: true
        difficulty:
          type: integer
          minimum: 1
          maximum: 5
          example: 2
        topic:
          type: string
          example: Geography
    
    AssessmentSubmission:
      type: object
      required:
        - id
        - assessment_id
        - student_id
      properties:
        id:
          type: string
          format: uuid
        assessment_id:
          type: string
          format: uuid
        student_id:
          type: string
          format: uuid
        answers:
          type: object
          additionalProperties: true
        started_at:
          type: string
          format: date-time
        submitted_at:
          type: string
          format: date-time
        time_spent:
          type: integer
          description: Time spent in seconds
          example: 3600
        score:
          type: number
          format: float
          nullable: true
          example: 85.5
        max_score:
          type: number
          format: float
          example: 100.0
        percentage:
          type: number
          format: float
          example: 85.5
        feedback:
          type: string
          nullable: true
        graded_by:
          type: string
          format: uuid
          nullable: true
        graded_at:
          type: string
          format: date-time
          nullable: true
        status:
          type: string
          enum: [IN_PROGRESS, SUBMITTED, GRADED, LATE]
          example: GRADED
        attempt_number:
          type: integer
          example: 1
    
    # Grade Models
    
    GradeSummary:
      type: object
      properties:
        student_id:
          type: string
          format: uuid
        course_id:
          type: string
          format: uuid
        offering_id:
          type: string
          format: uuid
        semester:
          type: string
          example: FALL2025
        academic_year:
          type: string
          example: '2025'
        components:
          type: object
          properties:
            quiz_avg:
              type: number
              format: float
              example: 85.5
            assignment_avg:
              type: number
              format: float
              example: 90.0
            midterm_score:
              type: number
              format: float
              example: 88.0
            final_score:
              type: number
              format: float
              example: 92.0
        overall_score:
          type: number
          format: float
          example: 89.2
        letter_grade:
          type: string
          example: A
        grade_points:
          type: number
          format: float
          example: 4.0
        status:
          type: string
          enum: [IN_PROGRESS, PASS, FAIL, INCOMPLETE, WITHDRAWN]
          example: PASS
        calculated_at:
          type: string
          format: date-time
    
    # Lab Models
    
    LabExperiment:
      type: object
      properties:
        id:
          type: string
          format: uuid
        lab_id:
          type: string
          example: refraction
        lab_name:
          type: string
          example: Light Refraction Experiment
        lab_type:
          type: string
          enum: [PHYSICS, CHEMISTRY, BIOLOGY]
          example: PHYSICS
        parameters:
          type: object
          additionalProperties: true
          example:
            angle: 45
            medium: water
        results:
          type: object
          additionalProperties: true
        score:
          type: number
          format: float
          example: 95.0
        accuracy:
          type: number
          format: float
          example: 98.5
        time_spent:
          type: integer
          example: 1200
        xp_earned:
          type: integer
          example: 50
        completed_at:
          type: string
          format: date-time

# ============================================================================
# API ENDPOINTS
# ============================================================================

paths:
  # ============================================================================
  # AUTHENTICATION ENDPOINTS
  # ============================================================================
  
  /auth/register:
    post:
      tags:
        - Authentication
      summary: Register a new user
      description: Create a new user account
      operationId: registerUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
                - full_name
                - role
              properties:
                email:
                  type: string
                  format: email
                  example: student@aeroedu.vn
                password:
                  type: string
                  format: password
                  minLength: 8
                  example: SecurePass123!
                full_name:
                  type: string
                  example: John Doe
                role:
                  type: string
                  enum: [STUDENT, TEACHER]
                  default: STUDENT
      responses:
        '201':
          description: User registered successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          user:
                            $ref: '#/components/schemas/User'
                          token:
                            type: string
                            example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        '400':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '409':
          description: Email already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /auth/login:
    post:
      tags:
        - Authentication
      summary: Login
      description: Authenticate user and receive JWT token
      operationId: loginUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  example: student@aeroedu.vn
                password:
                  type: string
                  format: password
                  example: SecurePass123!
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          user:
                            $ref: '#/components/schemas/User'
                          token:
                            type: string
                            description: JWT access token
                          refreshToken:
                            type: string
                            description: Refresh token for obtaining new access tokens
                          expiresIn:
                            type: integer
                            description: Token expiry time in seconds
                            example: 3600
        '401':
          description: Invalid credentials
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '429':
          description: Too many login attempts
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /auth/refresh:
    post:
      tags:
        - Authentication
      summary: Refresh access token
      description: Obtain a new access token using refresh token
      operationId: refreshToken
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - refreshToken
              properties:
                refreshToken:
                  type: string
      responses:
        '200':
          description: Token refreshed successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          token:
                            type: string
                          expiresIn:
                            type: integer
        '401':
          description: Invalid refresh token
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  # ============================================================================
  # USER ENDPOINTS
  # ============================================================================
  
  /users/me:
    get:
      tags:
        - Users
      summary: Get current user profile
      description: Retrieve authenticated user's profile information
      operationId: getCurrentUser
      security:
        - BearerAuth: []
      responses:
        '200':
          description: User profile retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/UserProfile'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
    
    put:
      tags:
        - Users
      summary: Update current user profile
      description: Update authenticated user's profile information
      operationId: updateCurrentUser
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                full_name:
                  type: string
                avatar_url:
                  type: string
                  format: uri
                profile:
                  type: object
                  properties:
                    phone:
                      type: string
                    date_of_birth:
                      type: string
                      format: date
                    gender:
                      type: string
                      enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
      responses:
        '200':
          description: Profile updated successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/UserProfile'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
  
  # ============================================================================
  # COURSE ENDPOINTS
  # ============================================================================
  
  /courses:
    get:
      tags:
        - Courses
      summary: List all courses
      description: Retrieve a paginated list of available courses
      operationId: listCourses
      security:
        - BearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
          description: Page number
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
          description: Number of items per page
        - name: search
          in: query
          schema:
            type: string
          description: Search by course name or code
        - name: department
          in: query
          schema:
            type: string
          description: Filter by department
        - name: level
          in: query
          schema:
            type: string
            enum: [BEGINNER, INTERMEDIATE, ADVANCED]
          description: Filter by level
        - name: status
          in: query
          schema:
            type: string
            enum: [ACTIVE, INACTIVE, ARCHIVED]
          description: Filter by status
      responses:
        '200':
          description: Courses retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Course'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
    
    post:
      tags:
        - Courses
      summary: Create a new course
      description: Create a new course (requires TEACHER or ADMIN role)
      operationId: createCourse
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - code
                - name
                - credits
              properties:
                code:
                  type: string
                  pattern: '^[A-Z0-9-]+$'
                  example: CS101
                name:
                  type: string
                  example: Introduction to Computer Science
                description:
                  type: string
                credits:
                  type: integer
                  minimum: 1
                  maximum: 10
                level:
                  type: string
                  enum: [BEGINNER, INTERMEDIATE, ADVANCED]
                department:
                  type: string
                prerequisites:
                  type: array
                  items:
                    type: string
                learning_objectives:
                  type: array
                  items:
                    type: string
      responses:
        '201':
          description: Course created successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Course'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
  
  /courses/{courseId}:
    get:
      tags:
        - Courses
      summary: Get course details
      description: Retrieve detailed information about a specific course
      operationId: getCourse
      security:
        - BearerAuth: []
      parameters:
        - name: courseId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Course details retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Course'
        '404':
          $ref: '#/components/responses/NotFoundError'
    
    put:
      tags:
        - Courses
      summary: Update course
      description: Update course information (requires TEACHER or ADMIN role)
      operationId: updateCourse
      security:
        - BearerAuth: []
      parameters:
        - name: courseId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                description:
                  type: string
                credits:
                  type: integer
                level:
                  type: string
                  enum: [BEGINNER, INTERMEDIATE, ADVANCED]
                status:
                  type: string
                  enum: [ACTIVE, INACTIVE, ARCHIVED]
      responses:
        '200':
          description: Course updated successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Course'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'
    
    delete:
      tags:
        - Courses
      summary: Delete course
      description: Delete a course (requires ADMIN role)
      operationId: deleteCourse
      security:
        - BearerAuth: []
      parameters:
        - name: courseId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: Course deleted successfully
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
        '404':
          $ref: '#/components/responses/NotFoundError'
  
  /courses/{courseId}/enroll:
    post:
      tags:
        - Courses
      summary: Enroll in course
      description: Enroll the authenticated student in a course
      operationId: enrollInCourse
      security:
        - BearerAuth: []
      parameters:
        - name: courseId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '201':
          description: Enrolled successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          enrollment_id:
                            type: string
                            format: uuid
                          status:
                            type: string
                            example: APPROVED
        '400':
          description: Already enrolled or course full
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          $ref: '#/components/responses/NotFoundError'
  
  # ============================================================================
  # ASSESSMENT ENDPOINTS
  # ============================================================================
  
  /assessments:
    get:
      tags:
        - Assessments
      summary: List assessments
      description: Retrieve assessments for enrolled courses
      operationId: listAssessments
      security:
        - BearerAuth: []
      parameters:
        - name: course_id
          in: query
          schema:
            type: string
            format: uuid
          description: Filter by course
        - name: type
          in: query
          schema:
            type: string
            enum: [QUIZ, ASSIGNMENT, PROJECT, MIDTERM, FINAL]
          description: Filter by assessment type
        - name: status
          in: query
          schema:
            type: string
            enum: [UPCOMING, IN_PROGRESS, COMPLETED, OVERDUE]
          description: Filter by status
      responses:
        '200':
          description: Assessments retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/Assessment'
    
    post:
      tags:
        - Assessments
      summary: Create assessment
      description: Create a new assessment (requires TEACHER or ADMIN role)
      operationId: createAssessment
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - title
                - type
                - course_id
                - questions
              properties:
                title:
                  type: string
                type:
                  type: string
                  enum: [QUIZ, ASSIGNMENT, PROJECT, MIDTERM, FINAL]
                course_id:
                  type: string
                  format: uuid
                instructions:
                  type: string
                questions:
                  type: array
                  items:
                    $ref: '#/components/schemas/Question'
                settings:
                  type: object
                  properties:
                    time_limit:
                      type: integer
                    attempts_allowed:
                      type: integer
                    shuffle_questions:
                      type: boolean
                due_date:
                  type: string
                  format: date-time
                max_score:
                  type: number
                weight:
                  type: number
      responses:
        '201':
          description: Assessment created successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/Assessment'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          $ref: '#/components/responses/ForbiddenError'
  
  /assessments/{assessmentId}/submit:
    post:
      tags:
        - Assessments
      summary: Submit assessment
      description: Submit answers for an assessment
      operationId: submitAssessment
      security:
        - BearerAuth: []
      parameters:
        - name: assessmentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - answers
              properties:
                answers:
                  type: object
                  additionalProperties: true
                  description: Question ID to answer mapping
                  example:
                    q1: Paris
                    q2: [option1, option3]
                    q3: The answer is...
      responses:
        '201':
          description: Assessment submitted successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        $ref: '#/components/schemas/AssessmentSubmission'
        '400':
          description: Invalid submission or time limit exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '404':
          $ref: '#/components/responses/NotFoundError'
  
  # ============================================================================
  # GRADING ENDPOINTS
  # ============================================================================
  
  /grades/student/{studentId}:
    get:
      tags:
        - Grading
      summary: Get student grades
      description: Retrieve all grades for a specific student
      operationId: getStudentGrades
      security:
        - BearerAuth: []
      parameters:
        - name: studentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: semester
          in: query
          schema:
            type: string
          description: Filter by semester
        - name: academic_year
          in: query
          schema:
            type: string
          description: Filter by academic year
      responses:
        '200':
          description: Grades retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          $ref: '#/components/schemas/GradeSummary'
        '401':
          $ref: '#/components/responses/UnauthorizedError'
        '403':
          description: Cannot access other student's grades
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /grades/transcript/{studentId}:
    get:
      tags:
        - Grading
      summary: Get student transcript
      description: Generate official transcript for a student
      operationId: getTranscript
      security:
        - BearerAuth: []
      parameters:
        - name: studentId
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: format
          in: query
          schema:
            type: string
            enum: [json, pdf]
            default: json
          description: Response format
      responses:
        '200':
          description: Transcript retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          student:
                            $ref: '#/components/schemas/User'
                          gpa:
                            type: number
                            format: float
                            example: 3.75
                          total_credits:
                            type: integer
                            example: 90
                          courses:
                            type: array
                            items:
                              $ref: '#/components/schemas/GradeSummary'
            application/pdf:
              schema:
                type: string
                format: binary
  
  # ============================================================================
  # ANALYTICS ENDPOINTS
  # ============================================================================
  
  /analytics/dashboard:
    get:
      tags:
        - Analytics
      summary: Get dashboard analytics
      description: Retrieve analytics data for dashboard
      operationId: getDashboardAnalytics
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Analytics retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          enrolled_courses:
                            type: integer
                            example: 5
                          completed_assessments:
                            type: integer
                            example: 12
                          average_grade:
                            type: number
                            format: float
                            example: 85.5
                          total_xp:
                            type: integer
                            example: 1500
                          current_level:
                            type: integer
                            example: 5
                          recent_activities:
                            type: array
                            items:
                              type: object
  
  /analytics/course/{courseId}:
    get:
      tags:
        - Analytics
      summary: Get course analytics
      description: Retrieve analytics for a specific course
      operationId: getCourseAnalytics
      security:
        - BearerAuth: []
      parameters:
        - name: courseId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Course analytics retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          total_students:
                            type: integer
                          average_grade:
                            type: number
                            format: float
                          completion_rate:
                            type: number
                            format: float
                          grade_distribution:
                            type: object
                            properties:
                              A:
                                type: integer
                              B:
                                type: integer
                              C:
                                type: integer
                              D:
                                type: integer
                              F:
                                type: integer
  
  # ============================================================================
  # LAB ENDPOINTS
  # ============================================================================
  
  /labs/experiments:
    get:
      tags:
        - Labs
      summary: List available lab experiments
      description: Retrieve list of available virtual lab experiments
      operationId: listLabExperiments
      security:
        - BearerAuth: []
      parameters:
        - name: lab_type
          in: query
          schema:
            type: string
            enum: [PHYSICS, CHEMISTRY, BIOLOGY]
          description: Filter by lab type
      responses:
        '200':
          description: Lab experiments retrieved successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: array
                        items:
                          type: object
                          properties:
                            lab_id:
                              type: string
                              example: refraction
                            name:
                              type: string
                              example: Light Refraction
                            type:
                              type: string
                              enum: [PHYSICS, CHEMISTRY, BIOLOGY]
                            description:
                              type: string
                            difficulty:
                              type: integer
                            estimated_time:
                              type: integer
                              description: Estimated completion time in minutes
  
  /labs/simulate:
    post:
      tags:
        - Labs
      summary: Run lab simulation
      description: Execute a virtual lab experiment with given parameters
      operationId: runLabSimulation
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - lab_id
                - parameters
              properties:
                lab_id:
                  type: string
                  example: refraction
                parameters:
                  type: object
                  additionalProperties: true
                  example:
                    angle: 45
                    medium: water
      responses:
        '200':
          description: Simulation completed successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          results:
                            type: object
                            additionalProperties: true
                          accuracy:
                            type: number
                            format: float
                          xp_earned:
                            type: integer
        '400':
          description: Invalid parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  # ============================================================================
  # AI ENDPOINTS
  # ============================================================================
  
  /ai/generate/quiz:
    post:
      tags:
        - AI
      summary: Generate quiz using AI
      description: Use AI to generate quiz questions based on topic and difficulty
      operationId: generateQuiz
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - topic
                - question_count
              properties:
                topic:
                  type: string
                  example: Photosynthesis
                question_count:
                  type: integer
                  minimum: 1
                  maximum: 20
                  example: 10
                difficulty:
                  type: string
                  enum: [EASY, MEDIUM, HARD]
                  default: MEDIUM
                question_types:
                  type: array
                  items:
                    type: string
                    enum: [MCQ, TRUE_FALSE, SHORT_ANSWER]
                  example: [MCQ, TRUE_FALSE]
      responses:
        '200':
          description: Quiz generated successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          questions:
                            type: array
                            items:
                              $ref: '#/components/schemas/Question'
                          tokens_used:
                            type: integer
                            example: 1500
        '400':
          $ref: '#/components/responses/ValidationError'
        '429':
          description: AI quota exceeded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /ai/grade/essay:
    post:
      tags:
        - AI
      summary: Grade essay using AI
      description: Use AI to grade an essay submission
      operationId: gradeEssay
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - question
                - answer
                - rubric
              properties:
                question:
                  type: string
                  example: Explain the process of photosynthesis
                answer:
                  type: string
                  example: Photosynthesis is the process by which...
                rubric:
                  type: object
                  properties:
                    max_score:
                      type: number
                      example: 10
                    criteria:
                      type: array
                      items:
                        type: object
                        properties:
                          name:
                            type: string
                          points:
                            type: number
                          description:
                            type: string
      responses:
        '200':
          description: Essay graded successfully
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Success'
                  - type: object
                    properties:
                      data:
                        type: object
                        properties:
                          score:
                            type: number
                            format: float
                            example: 8.5
                          max_score:
                            type: number
                            example: 10
                          feedback:
                            type: string
                            example: Good explanation of the process...
                          breakdown:
                            type: array
                            items:
                              type: object
                              properties:
                                criterion:
                                  type: string
                                score:
                                  type: number
                                comment:
                                  type: string

# ============================================================================
# REUSABLE RESPONSES
# ============================================================================

components:
  responses:
    UnauthorizedError:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            error:
              code: UNAUTHORIZED
              message: Authentication token required
    
    ForbiddenError:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            error:
              code: FORBIDDEN
              message: You don't have permission to perform this action
    
    NotFoundError:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            error:
              code: NOT_FOUND
              message: The requested resource was not found
    
    ValidationError:
      description: Validation error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            success: false
            error:
              code: VALIDATION_ERROR
              message: Invalid input parameters
              details:
                email: Email is required
                password: Password must be at least 8 characters

# Apply security globally
security:
  - BearerAuth: []
```

### 12.2 API Documentation Generation

```typescript
// ============================================================================
// SWAGGER UI SETUP
// ============================================================================

// app/api/docs/route.ts
import { NextResponse } from 'next/server';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // Load OpenAPI spec
  const specPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
  const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
  
  // Return HTML with Swagger UI
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>AeroEdu API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function() {
            SwaggerUIBundle({
              spec: ${JSON.stringify(spec)},
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "BaseLayout"
            });
          };
        </script>
      </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

// ============================================================================
// REDOC DOCUMENTATION
// ============================================================================

// app/api/redoc/route.ts
export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>AeroEdu API Reference</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        <redoc spec-url='/api/openapi.json'></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

// ============================================================================
// API SPEC ENDPOINT
// ============================================================================

// app/api/openapi.json/route.ts
export async function GET() {
  const specPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
  const spec = yaml.load(fs.readFileSync(specPath, 'utf8'));
  
  return NextResponse.json(spec);
}
```

### 12.3 SDK Generation

```bash
# ============================================================================
# GENERATE CLIENT SDKs
# ============================================================================

# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript/JavaScript SDK
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g typescript-fetch \
  -o sdks/typescript \
  --additional-properties=npmName=@aeroedu/sdk,npmVersion=1.0.0

# Generate Python SDK
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g python \
  -o sdks/python \
  --additional-properties=packageName=aeroedu_sdk,packageVersion=1.0.0

# Generate Java SDK
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g java \
  -o sdks/java \
  --additional-properties=artifactId=aeroedu-sdk,artifactVersion=1.0.0

# Generate PHP SDK
openapi-generator-cli generate \
  -i docs/openapi.yaml \
  -g php \
  -o sdks/php \
  --additional-properties=packageName=aeroedu/sdk
```

### 12.4 SDK Usage Examples

```typescript
// ============================================================================
// TYPESCRIPT SDK USAGE
// ============================================================================

// sdks/typescript/example.ts
import { Configuration, AuthApi, CoursesApi, AssessmentsApi } from '@aeroedu/sdk';

// Initialize configuration
const config = new Configuration({
  basePath: 'https://api.aeroedu.vn/v1',
  accessToken: 'your-jwt-token',
});

// Example 1: Authentication
const authApi = new AuthApi(config);

async function login() {
  try {
    const response = await authApi.loginUser({
      email: 'student@aeroedu.vn',
      password: 'SecurePass123!',
    });
    
    console.log('Login successful:', response.data);
    
    // Store token
    const token = response.data.token;
    
    // Update configuration with token
    config.accessToken = token;
  } catch (error) {
    console.error('Login failed:', error);
  }
}

// Example 2: List courses
const coursesApi = new CoursesApi(config);

async function listCourses() {
  try {
    const response = await coursesApi.listCourses({
      page: 1,
      limit: 20,
      level: 'BEGINNER',
    });
    
    console.log('Courses:', response.data);
  } catch (error) {
    console.error('Error fetching courses:', error);
  }
}

// Example 3: Enroll in course
async function enrollInCourse(courseId: string) {
  try {
    const response = await coursesApi.enrollInCourse({
      courseId,
    });
    
    console.log('Enrollment successful:', response.data);
  } catch (error) {
    console.error('Enrollment failed:', error);
  }
}

// Example 4: Submit assessment
const assessmentsApi = new AssessmentsApi(config);

async function submitAssessment(assessmentId: string, answers: Record<string, any>) {
  try {
    const response = await assessmentsApi.submitAssessment({
      assessmentId,
      answers,
    });
    
    console.log('Assessment submitted:', response.data);
    console.log('Score:', response.data.score);
  } catch (error) {
    console.error('Submission failed:', error);
  }
}

// Example 5: Error handling with retries
async function fetchCoursesWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await coursesApi.listCourses({ page: 1, limit: 20 });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

```python
# ============================================================================
# PYTHON SDK USAGE
# ============================================================================

# sdks/python/example.py
from aeroedu_sdk import Configuration, ApiClient, AuthApi, CoursesApi, AssessmentsApi
from aeroedu_sdk.exceptions import ApiException

# Initialize configuration
config = Configuration(
    host="https://api.aeroedu.vn/v1"
)

# Example 1: Authentication
def login(email: str, password: str):
    with ApiClient(config) as api_client:
        auth_api = AuthApi(api_client)
        
        try:
            response = auth_api.login_user({
                "email": email,
                "password": password
            })
            
            print(f"Login successful: {response.data}")
            
            # Store token
            token = response.data['token']
            
            # Update configuration
            config.access_token = token
            
            return token
        except ApiException as e:
            print(f"Login failed: {e}")
            return None

# Example 2: List courses
def list_courses(page=1, limit=20, level=None):
    with ApiClient(config) as api_client:
        courses_api = CoursesApi(api_client)
        
        try:
            response = courses_api.list_courses(
                page=page,
                limit=limit,
                level=level
            )
            
            return response.data
        except ApiException as e:
            print(f"Error fetching courses: {e}")
            return []

# Example 3: Submit assessment
def submit_assessment(assessment_id: str, answers: dict):
    with ApiClient(config) as api_client:
        assessments_api = AssessmentsApi(api_client)
        
        try:
            response = assessments_api.submit_assessment(
                assessment_id=assessment_id,
                answers=answers
            )
            
            print(f"Assessment submitted: {response.data}")
            print(f"Score: {response.data['score']}/{response.data['max_score']}")
            
            return response.data
        except ApiException as e:
            print(f"Submission failed: {e}")
            return None

# Example 4: Context manager for API client
from contextlib import contextmanager

@contextmanager
def aeroedu_client(token=None):
    """Context manager for AeroEdu API client"""
    config = Configuration(
        host="https://api.aeroedu.vn/v1",
        access_token=token
    )
    
    with ApiClient(config) as api_client:
        yield api_client

# Usage
def main():
    # Login
    token = login("student@aeroedu.vn", "SecurePass123!")
    
    if token:
        # Use context manager
        with aeroedu_client(token) as client:
            courses_api = CoursesApi(client)
            courses = courses_api.list_courses(level="BEGINNER")
            
            for course in courses.data:
                print(f"Course: {course['name']} ({course['code']})")

if __name__ == "__main__":
    main()
```

---

**Đã hoàn thành Phần 12 (API Documentation)**

Phần này bao gồm:
- ✅ OpenAPI 3.0 specification đầy đủ
- ✅ Swagger UI và ReDoc setup
- ✅ SDK generation cho multiple languages
- ✅ Usage examples và best practices
- ✅ Authentication và error handling
- ✅ Rate limiting documentation
- ✅ Comprehensive endpoint coverage

Tiếp tục với:
- **13. Testing Strategy**
- **14. Development Guidelines**
- **15. Conclusion & Roadmap**

Bạn muốn tôi tiếp tục không?