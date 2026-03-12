# Phase 4: 100% Backend Rust Migration - Complete Strangler Plan

**Status**: 📋 Planning
**Date**: March 8, 2026
**Target Completion**: Q2 2026 (8-12 weeks)
**Owner**: Backend Team

---

## 🎯 Objective

Migrate **100% of backend APIs** (172 routes) from Node.js/Next.js to Rust, completing the Strangler Fig pattern migration and achieving:

- **Zero Node.js backend logic** - All business logic in Rust
- **Next.js as thin frontend** - Only routing, SSR, static assets
- **Production-ready Rust services** - All APIs with health monitoring, canary rollout
- **Performance gains** - 10-100x latency improvement on critical paths
- **Type safety end-to-end** - Rust backend + TypeScript frontend with shared types

---

## 📊 Current Status (Baseline)

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **APIs migrated** | 7/172 (4.1%) | 172/172 (100%) | 165 APIs |
| **Rust services** | 2 | 8-10 | 6-8 new services |
| **Lines of Rust** | ~1,200 | ~15,000 | +13,800 lines |
| **Node.js routes** | 172 | 0 (proxy only) | -172 routes |

### ✅ Already Migrated (Batch 1-4)
```
✅ /api/vector-similarity (POST, DELETE)
✅ /api/ocr-grading (POST, GET)
✅ /api/ocr-process (POST)
✅ /api/ocr/auto-grade (POST)
✅ /api/ocr/upload (POST)
✅ /api/llm-grading (POST)
✅ /api/assignments/grade-ocr (POST)
```

---

## 🏗️ Target Architecture

### **Before (Current State)**
```
┌─────────────────────────────────────────────────┐
│              Next.js App (Node.js)              │
│  ┌─────────────────────────────────────────┐    │
│  │  165 API Routes (Node.js/TypeScript)    │    │
│  │  - Auth, Courses, Admin, AI, STEM, etc. │    │
│  └─────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │  7 API Routes → Rust Proxy              │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────────┐
│  PostgreSQL     │  │  Rust Services      │
│  (Prisma ORM)   │  │  - aero-backend     │
│                 │  │  - vector-sim       │
└─────────────────┘  └─────────────────────┘
```

### **After (Target State)**
```
┌─────────────────────────────────────────────────┐
│         Next.js Frontend (Thin Layer)           │
│  - SSR Pages                                    │
│  - Static Assets                                │
│  - API Proxy (all routes → Rust)                │
└─────────────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Rust Core API  │  │  Rust Auth      │  │  Rust Courses   │
│  (port 8090)    │  │  (port 8091)    │  │  (port 8092)    │
│  - OCR          │  │  - Vector sim   │  │  - Auth / JWT   │
│  - Grading      │  │  (or in Core)   │  │  - Session      │
│  - Vector       │  │                 │  │  - OAuth        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              ▼
                     ┌─────────────────┐
                     │   PostgreSQL    │
                     │   (sqlx/r2d2)   │
                     └─────────────────┘
```

---

## 📦 Migration Batches (5-12)

### **Batch 5: Authentication & Security** 🔴 CRITICAL
**Priority**: P0 | **Timeline**: Week 1-2 | **APIs**: 10

| Route | Method | Complexity | Notes |
|-------|--------|------------|-------|
| `/api/auth/login` | POST | High | NextAuth migration |
| `/api/auth/register` | POST | High | Password hashing |
| `/api/auth/[...nextauth]` | ALL | Critical | Core auth handler |
| `/api/auth/2fa/setup` | POST | Medium | TOTP implementation |
| `/api/auth/2fa/verify` | POST | Medium | TOTP verification |
| `/api/auth/2fa/disable` | POST | Low | 2FA management |
| `/api/auth/forgot-password` | POST | Medium | Email flow |
| `/api/auth/reset-password` | POST | Medium | Token validation |
| `/api/auth/change-password` | POST | Medium | Password update |
| `/api/auth/verify` | GET | Low | Email verification |

**Rust Dependencies**:
- `argon2` - Password hashing
- `totp-rs` - 2FA TOTP
- `jsonwebtoken` - JWT tokens
- `lettre` - Email sending
- `sqlx` - Database queries

**Deliverables**:
- [ ] `rust-services/auth-service/` - New Rust service (port 8091)
- [ ] JWT session management
- [ ] NextAuth adapter for Rust backend
- [ ] 2FA TOTP implementation
- [ ] Password reset flow
- [ ] Migration guide from NextAuth

---

### **Batch 6: Courses & Curriculum** 🟡 HIGH
**Priority**: P0 | **Timeline**: Week 3-4 | **APIs**: 12

| Route | Method | Complexity | Notes |
|-------|--------|------------|-------|
| `/api/courses` | GET, POST | Medium | CRUD operations |
| `/api/courses/[courseId]` | GET, PUT, DELETE | Medium | Single course |
| `/api/courses/[courseId]/chapters` | GET, POST | Medium | Chapter management |
| `/api/courses/[courseId]/chapters/[chapterId]` | GET, PUT, DELETE | Low | Single chapter |
| `/api/courses/[courseId]/chapters/reorder` | POST | Medium | Reordering |
| `/api/courses/[courseId]/chapters/[chapterId]/publish` | POST | Low | Publish |
| `/api/courses/[courseId]/chapters/[chapterId]/unpublish` | POST | Low | Unpublish |
| `/api/courses/[courseId]/chapters/[chapterId]/progress` | GET, POST | Medium | User progress |
| `/api/courses/[courseId]/checkout` | POST | High | Payment integration |
| `/api/courses/[courseId]/publish` | POST | Low | Course publish |
| `/api/courses/[courseId]/unpublish` | POST | Low | Course unpublish |
| `/api/courses/[courseId]/attachments` | GET, POST | Medium | File attachments |

**Rust Dependencies**:
- `sqlx` - Database with transactions
- `serde_json` - JSON handling
- `uuid` - ID generation
- `aws-sdk-s3` or `gcp-storage` - File storage

**Deliverables**:
- [ ] `rust-services/course-service/` - New Rust service (port 8092)
- [ ] Course CRUD operations
- [ ] Chapter management with ordering
- [ ] Progress tracking
- [ ] Attachment handling (GCS/S3)
- [ ] Checkout/payment integration

---

### **Batch 7: Admin & Analytics** 🟡 HIGH
**Priority**: P1 | **Timeline**: Week 5 | **APIs**: 10

| Route | Method | Complexity | Notes |
|-------|--------|------------|-------|
| `/api/admin/overview` | GET | Medium | Dashboard data |
| `/api/admin/stats` | GET | Medium | Platform statistics |
| `/api/admin/users` | GET, POST | Medium | User management |
| `/api/admin/users/[id]` | GET, PUT, DELETE | Medium | Single user |
| `/api/admin/students` | GET, POST | Medium | Student management |
| `/api/admin/students/[studentId]` | GET, PUT, DELETE | Low | Single student |
| `/api/admin/stem` | GET | Low | STEM data |
| `/api/admin/stem/sync` | POST | Medium | STEM sync |
| `/api/admin/alerts` | GET, POST | Low | System alerts |
| `/api/admin/auth-logs` | GET | Low | Auth audit logs |

**Deliverables**:
- [ ] `rust-services/admin-service/` - New Rust service (port 8093)
- [ ] Admin dashboard APIs
- [ ] User/student CRUD
- [ ] Analytics aggregation
- [ ] Audit logging

---

### **Batch 8: AI & Tutor Services** 🟡 HIGH
**Priority**: P1 | **Timeline**: Week 6-7 | **APIs**: 12

| Route | Method | Complexity | Notes |
|-------|--------|------------|-------|
| `/api/ai-chat` | POST | High | Chat with AI |
| `/api/ai-tutor-chat` | POST | High | Tutor-specific chat |
| `/api/ai-content/generate` | POST | High | Content generation |
| `/api/ai-content/generate-stream` | POST | High | Streaming response |
| `/api/ai-content/save` | POST | Medium | Save generated content |
| `/api/ai-content/[id]` | GET, DELETE | Low | Content management |
| `/api/ai-generate-lesson` | POST | High | Lesson generation |
| `/api/ai-grade-lesson` | POST | Medium | AI grading |
| `/api/ai-intelligent/generate` | POST | High | Adaptive content |
| `/api/ai/analyze-document` | POST | Medium | Document analysis |
| `/api/ai-analytics/dashboard` | GET | Medium | AI analytics |
| `/api/generate-daily-plan` | POST | Medium | Plan generation |

**Rust Dependencies**:
- `reqwest` - HTTP client for LLM APIs
- `tokio-stream` - Streaming responses
- `serde_json` - JSON handling
- `async-stream` - Stream builders

**Deliverables**:
- [ ] `rust-services/ai-service/` - New Rust service (port 8094)
- [ ] LLM provider integration (OpenAI, Ollama, Gemini)
- [ ] Streaming response support
- [ ] Content generation pipelines
- [ ] Document analysis
- [ ] Analytics aggregation

---

### **Batch 9: Student & Learning Progress** 🟢 MEDIUM
**Priority**: P1 | **Timeline**: Week 8 | **APIs**: 11

| Route | Method | Complexity | Notes |
|-------|--------|------------|-------|
| `/api/students` | GET, POST | Medium | Student CRUD |
| `/api/classes` | GET, POST | Medium | Class management |
| `/api/classes/[id]` | GET, PUT, DELETE | Low | Single class |
| `/api/classes/[id]/students` | GET, POST | Medium | Class students |
| `/api/classes/[id]/students/[studentId]` | GET, DELETE | Low | Manage student |
| `/api/learning-paths` | GET | Medium | Learning paths |
| `/api/learning-path/create` | POST | High | Path creation |
| `/api/plg/[studentId]` | GET | Medium | PLG data |
| `/api/plg/[studentId]/update-skill` | POST | Medium | Skill update |
| `/api/plg/[studentId]/record-interaction` | POST | Medium | Interaction tracking |
| `/api/plg/[studentId]/recommendations` | GET | High | Recommendation engine |

**Deliverables**:
- [ ] `rust-services/student-service/` - New Rust service (port 8095)
- [ ] Student/class management
- [ ] Learning path engine
- [ ] PLG (Personalized Learning) system
- [ ] Recommendation algorithms

---

### **Batch 10: STEM Simulations & Labs** 🟢 MEDIUM
**Priority**: P2 | **Timeline**: Week 9-10 | **APIs**: 20

| Route Group | APIs | Complexity | Notes |
|-------------|------|------------|-------|
| Physics Sims | 6 | Medium | Motion, projectile, harmonic |
| Chemistry Labs | 4 | High | 3D molecule, balance, enthalpy |
| STEM Projects | 4 | Medium | Project CRUD |
| Lab Tracking | 6 | Low | Lab completion, attention |

**Deliverables**:
- [ ] `rust-services/stem-service/` - New Rust service (port 8096)
- [ ] Physics simulation engines
- [ ] Chemistry lab integrations
- [ ] STEM project management
- [ ] Lab completion tracking

---

### **Batch 11: Documents, Exams & Upload** 🟢 MEDIUM
**Priority**: P2 | **Timeline**: Week 11 | **APIs**: 15

| Route Group | APIs | Complexity | Notes |
|-------------|------|------------|-------|
| Documents | 7 | Medium | CRUD, processing, upload |
| Exams | 6 | Medium | Matrix, generation |
| Upload | 4 | High | Presigned URLs, GCS |

**Deliverables**:
- [ ] `rust-services/media-service/` - New Rust service (port 8097)
- [ ] Document processing pipeline
- [ ] Exam generation from matrices
- [ ] File upload with presigned URLs
- [ ] GCS integration

---

### **Batch 12: Remaining APIs & Cleanup** 🟢 LOW
**Priority**: P3 | **Timeline**: Week 12 | **APIs**: ~85

**Categories**:
- Chat/Messaging (4 APIs)
- Question Bank (3 APIs)
- XP/Rewards (2 APIs)
- Search (1 API)
- Webhooks (1 API)
- Test/Debug (10 APIs) - **Skip/Remove**
- Physics/Chemistry specific (15 APIs)
- Admin STEM (4 APIs)
- Sync/Streaming (4 APIs)
- Other utilities (~41 APIs)

**Strategy**:
1. **Consolidate** similar APIs into existing services
2. **Remove** test/debug endpoints
3. **Deprecate** unused legacy APIs
4. **Migrate** remaining critical APIs

**Deliverables**:
- [ ] API consolidation report
- [ ] Deprecation notices for legacy endpoints
- [ ] Final migration of critical APIs
- [ ] Complete API documentation

---

## 📅 Timeline Summary

```
Week 1-2:   Batch 5  - Authentication & Security (10 APIs)
Week 3-4:   Batch 6  - Courses & Curriculum (12 APIs)
Week 5:     Batch 7  - Admin & Analytics (10 APIs)
Week 6-7:   Batch 8  - AI & Tutor Services (12 APIs)
Week 8:     Batch 9  - Student & Progress (11 APIs)
Week 9-10:  Batch 10 - STEM Simulations (20 APIs)
Week 11:    Batch 11 - Documents & Exams (15 APIs)
Week 12:    Batch 12 - Remaining & Cleanup (~85 APIs)
```

**Total Duration**: 12 weeks (3 months)
**Total APIs**: 172 (7 already done + 165 remaining)

---

## 🛠️ Infrastructure Requirements

### **New Rust Services to Create**

| Service | Port | Owner | Dependencies |
|---------|------|------|--------------|
| `auth-service` | 8092 | Security Team | argon2, totp-rs, jsonwebtoken |
| `course-service` | 8092 | Curriculum Team | sqlx, aws-sdk-s3 |
| `admin-service` | 8093 | Platform Team | sqlx, chrono |
| `ai-service` | 8094 | AI Team | reqwest, tokio-stream |
| `student-service` | 8095 | Student Team | sqlx, serde_json |
| `stem-service` | 8096 | STEM Team | nalgebra, simba |
| `media-service` | 8097 | Media Team | gcp-storage, multipart |

### **Shared Rust Crates (Workspace)**

```toml
[workspace]
members = [
    "rust-services/aero-backend",      # Existing - Batch 1-4
    "rust-services/vector-sim-service", # Existing - Batch 1
    "rust-services/auth-service",       # New - Batch 5
    "rust-services/course-service",     # New - Batch 6
    "rust-services/admin-service",      # New - Batch 7
    "rust-services/ai-service",         # New - Batch 8
    "rust-services/student-service",    # New - Batch 9
    "rust-services/stem-service",       # New - Batch 10
    "rust-services/media-service",      # New - Batch 11
    "crates/openfang-types",            # Shared types
    "crates/openfang-db",               # Database utilities
    "crates/openfang-auth",             # Auth utilities
]
```

### **Database Migration Strategy**

**Current**: Prisma ORM (Node.js)
**Target**: sqlx + r2d2 (Rust)

**Migration Steps**:
1. Export Prisma schema to SQL
2. Create sqlx query macros for each service
3. Implement connection pooling (r2d2)
4. Add migration scripts (sqlx migrate)
5. Test data integrity

---

## 🔧 Strangler Pattern Evolution

### **Phase 1: Current State (4.1% migrated)**
```
Client → Next.js Middleware → [90% Node, 10% Rust]
```

### **Phase 2: Mid-Migration (50% migrated)**
```
Client → Next.js Middleware → [50% Node, 50% Rust]
         Canary: 25% → 50% → 75%
```

### **Phase 3: Final State (100% migrated)**
```
Client → Next.js Thin Proxy → [100% Rust Services]
         (all routes rewrite to Rust)
```

### **next.config.js Rewrite Rules (Final)**

```javascript
module.exports = {
  async rewrites() {
    return [
      // All API routes → Rust backend
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8090/api/:path*',
      },
      // Auth routes → Rust auth service
      {
        source: '/api/auth/:path*',
        destination: 'http://127.0.0.1:8092/api/auth/:path*',
      },
      // Course routes → Rust course service
      {
        source: '/api/courses/:path*',
        destination: 'http://127.0.0.1:8092/api/courses/:path*',
      },
      // ... additional service rewrites
    ];
  },
};
```

---

## ✅ Success Criteria

### **Technical Metrics**
- [ ] 172/172 APIs migrated to Rust
- [ ] 0 Node.js business logic remaining
- [ ] All services pass health checks (99.9% uptime)
- [ ] P95 latency < 100ms for all APIs
- [ ] P99 latency < 500ms for all APIs
- [ ] Zero data loss during migration
- [ ] Full test coverage (>80%)

### **Business Metrics**
- [ ] Zero downtime during migration
- [ ] No user-facing disruptions
- [ ] Backward-compatible API contracts
- [ ] Rollback plan tested and working

### **Documentation**
- [ ] API documentation updated
- [ ] Deployment runbooks created
- [ ] Monitoring dashboards configured
- [ ] Incident response procedures documented

---

## 🧪 Testing Strategy

### **Per-Service Testing**
```rust
// Unit tests
#[cfg(test)]
mod tests {
    #[test]
    fn test_password_hash() { ... }
    
    #[tokio::test]
    async fn test_auth_flow() { ... }
}

// Integration tests
#[cfg(test)]
mod integration {
    #[tokio::test]
    async fn test_full_login_flow() { ... }
}
```

### **End-to-End Testing**
```bash
# Run E2E tests for each batch
bun run test:e2e:batch-5  # Auth
bun run test:e2e:batch-6  # Courses
# ... etc
```

### **Performance Benchmarking**
```bash
# Compare Node.js vs Rust for each endpoint
bun run bench:compare:auth
bun run bench:compare:courses
# ... etc
```

### **Canary Testing**
```bash
# Gradual rollout per batch
RUST_CANARY_PERCENT=10 bun run dev  # 10% traffic
RUST_CANARY_PERCENT=25 bun run dev  # 25% traffic
RUST_CANARY_PERCENT=50 bun run dev  # 50% traffic
RUST_CANARY_PERCENT=100 bun run dev # 100% traffic
```

---

## 🔄 Rollback Plan

### **Per-Batch Rollback**
If issues detected in a batch:
1. Set `RUST_CANARY_PERCENT=0` for affected routes
2. Traffic automatically routes back to Node.js
3. Fix issues in Rust service
4. Re-enable canary with `RUST_CANARY_PERCENT=10`

### **Full Rollback**
If critical issues:
```bash
# Disable all Rust routing
ENABLE_RUST_CANARY_PROXY=false
DIRECT_RUST_VECTOR_PROXY=false
# Restart Next.js
```

### **Database Rollback**
- Keep Prisma schema until migration complete
- Maintain dual-write during transition
- Database migrations are reversible

---

## 📊 Monitoring & Observability

### **Metrics to Track**
```rust
// Per-service metrics
- requests_total{service, endpoint, status}
- request_duration_seconds{service, endpoint}
- active_connections{service}
- database_query_duration_seconds{service, query}
- cache_hit_ratio{service, cache}
```

### **Logging**
```rust
// Structured logging with tracing
use tracing::{info, error, warn};

info!(endpoint = "/api/auth/login", duration_ms = 45, "Request completed");
error!(endpoint = "/api/auth/login", error = "Invalid credentials", "Authentication failed");
```

### **Alerting**
- Error rate > 1% → Page on-call
- P95 latency > 500ms → Slack alert
- Health check failures > 3 → Page on-call
- Canary auto-pause → Slack alert

---

## 🚀 Deployment Strategy

### **Development**
```bash
# Run all Rust services locally
bun run rust:all

# Run Next.js with Rust proxy
ENABLE_RUST_CANARY_PROXY=true RUST_CANARY_PERCENT=100 bun run dev
```

### **Staging**
1. Deploy Rust services to Cloud Run
2. Update `RUST_*_URL` environment variables
3. Set canary to 100% for staging traffic
4. Run E2E tests

### **Production**
1. Deploy Rust services (blue-green)
2. Health check validation
3. Canary rollout: 10% → 25% → 50% → 100%
4. Monitor metrics for 24 hours
5. Decommission Node.js routes

---

## 📋 Pre-Migration Checklist

### **Per API Route**
- [ ] Document current Node.js behavior
- [ ] Identify database queries
- [ ] Identify external API calls
- [ ] Document authentication requirements
- [ ] Document rate limiting rules
- [ ] Create Rust equivalent implementation
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance benchmark vs Node.js
- [ ] Update API documentation

### **Per Batch**
- [ ] All APIs in batch migrated
- [ ] All tests passing
- [ ] Performance benchmarks meet targets
- [ ] Documentation updated
- [ ] Rollback tested
- [ ] Monitoring configured
- [ ] Team trained on new service

---

## 🎯 Post-Migration Tasks

### **Cleanup**
- [ ] Remove Node.js route handlers
- [ ] Remove Prisma dependency
- [ ] Remove NextAuth dependency
- [ ] Clean up `package.json` dependencies
- [ ] Remove unused environment variables
- [ ] Update `.gitignore` for Rust artifacts

### **Optimization**
- [ ] Profile Rust services in production
- [ ] Optimize hot paths
- [ ] Tune connection pools
- [ ] Optimize database queries
- [ ] Implement caching where beneficial

### **Documentation**
- [ ] Update architecture diagrams
- [ ] Write post-mortem for migration
- [ ] Document lessons learned
- [ ] Update onboarding docs for new team members

---

## 📈 Progress Tracking

### **Weekly Milestones**

| Week | Target | APIs Done | Cumulative |
|------|--------|-----------|------------|
| 0 | Baseline | 7 | 4.1% |
| 2 | Batch 5 | 10 | 9.9% |
| 4 | Batch 6 | 12 | 16.9% |
| 5 | Batch 7 | 10 | 22.7% |
| 7 | Batch 8 | 12 | 29.7% |
| 8 | Batch 9 | 11 | 36.0% |
| 10 | Batch 10 | 20 | 47.7% |
| 11 | Batch 11 | 15 | 56.4% |
| 12 | Batch 12 | 85 | 100% |

### **Dashboard Metrics**
```
Migration Progress: XX/172 APIs (XX%)
Current Week: X/12
On Track: Yes/No
Blockers: [list]
Next Milestone: Batch X completion
```

---

## 🔐 Security Considerations

### **Authentication Migration**
- Maintain session compatibility during transition
- JWT token format must remain compatible
- 2FA TOTP secrets must migrate seamlessly
- Password hashes must remain valid (argon2)

### **Authorization**
- Role-based access control (RBAC) must be preserved
- Admin endpoints require additional validation
- Rate limiting must be enforced in Rust

### **Data Protection**
- All sensitive data encrypted at rest
- TLS for all service-to-service communication
- Secrets managed via environment variables or secret manager
- Audit logging for all auth events

---

## 💡 Lessons Learned (from Batch 1-4)

### **What Worked Well**
- ✅ Strangler pattern with canary rollout
- ✅ Health check auto-failover
- ✅ Incremental migration approach
- ✅ Performance gains visible immediately

### **Challenges Encountered**
- ⚠️ Database connection pooling tuning needed
- ⚠️ Error message compatibility with frontend
- ⚠️ CORS configuration for new services
- ⚠️ Logging format standardization

### **Improvements for Future Batches**
- 📋 Standardize error response format across all services
- 📋 Create shared tracing/metrics crate
- 📋 Automate scaffold generation for new services
- 📋 Pre-define database query patterns

---

## 📞 Team & Responsibilities

| Role | Person | Responsibilities |
|------|--------|------------------|
| Tech Lead | TBD | Architecture review, code approval |
| Rust Lead | TBD | Rust code quality, best practices |
| Security Lead | TBD | Auth/security review |
| QA Lead | TBD | Test strategy, E2E validation |
| DevOps Lead | TBD | Deployment, monitoring setup |

---

## 🎉 Completion Celebration

**Upon 100% Migration:**
1. Team demo of full Rust backend
2. Performance comparison report
3. Post-mortem document
4. Celebration dinner 🍕
5. Blog post: "How we migrated 172 APIs to Rust"

---

**Created**: March 8, 2026
**Target Completion**: June 8, 2026
**Status**: 📋 Pending Approval

---

## Troubleshooting / Các lỗi thường gặp

- **`concurrently: command not found`** khi chạy `bun run rust:all`  
  → Cài dependency: `npm install` hoặc `bun install` (đã thêm `concurrently` vào devDependencies).

- **`bun run rust:migration:inventory`** báo lỗi đường dẫn hoặc file not found  
  → Chạy từ **thư mục gốc repo** (nơi có `package.json`). Script dùng `process.cwd()` làm repo root.

- **`bench:compare:auth` / `bench:compare:all`**  
  → Là script stub; chi tiết benchmark theo batch xem trong tài liệu. Chạy `bun run test:auth-service` để test auth service.

- **`./deploy-all-rust-services.sh`**  
  → Script hiện chỉ in hướng dẫn. Triển khai thật thực hiện theo mục Deployment Strategy và Cloud Run trong tài liệu.

- **Cargo workspace**  
  → Doc mô tả workspace gồm nhiều service (course-service, admin-service, ...); hiện chỉ có `aero-backend`, `vector-sim-service`, `auth-service`. Các service Batch 6+ tạo dần theo lộ trình.

---

## Appendix A: Quick Reference Commands

```bash
# Generate scaffold for new service
cargo generate rust-service-template --name auth-service

# Run all Rust services
bun run rust:all

# Run specific service
bun run rust:auth

# Health check all services
curl http://127.0.0.1:8090/health
curl http://127.0.0.1:8092/health
# ... etc

# Run tests for all services
cargo test --workspace

# Benchmark comparison
bun run bench:compare:all

# Deploy all services to Cloud Run
./deploy-all-rust-services.sh
```

---

## Appendix B: Environment Variables Template

```bash
# Rust Service URLs
RUST_BACKEND_URL=http://127.0.0.1:8090
RUST_AUTH_URL=http://127.0.0.1:8092
RUST_COURSE_URL=http://127.0.0.1:8092
RUST_ADMIN_URL=http://127.0.0.1:8093
RUST_AI_URL=http://127.0.0.1:8094
RUST_STUDENT_URL=http://127.0.0.1:8095
RUST_STEM_URL=http://127.0.0.1:8096
RUST_MEDIA_URL=http://127.0.0.1:8097

# Canary Configuration
ENABLE_RUST_CANARY_PROXY=true
RUST_CANARY_PERCENT=10
RUST_CANARY_STEPS=10,25,50,100
ENABLE_RUST_CANARY_AUTO_ROLLOUT=true
RUST_CANARY_MIN_REQUESTS_PER_STEP=200
RUST_CANARY_MIN_STEP_MINUTES=10
RUST_CANARY_HEALTHCHECK_INTERVAL_MS=5000
RUST_DISABLE_ON_UNHEALTHY=true

# Direct Proxy (for fully migrated routes)
DIRECT_RUST_VECTOR_PROXY=true
DIRECT_RUST_OCR_GRADING_PROXY=true
DIRECT_RUST_LLM_GRADING_PROXY=true
```

---

## Appendix C: Service Communication Protocol

All Rust services communicate via:
- **HTTP/REST** for synchronous requests
- **gRPC** for service-to-service (future optimization)
- **PostgreSQL** for shared database
- **Redis** for caching (optional)

**Request ID Propagation:**
```rust
let request_id = headers.get("x-request-id")
    .unwrap_or_else(|| generate_uuid());
```

**Tracing Context:**
```rust
let traceparent = headers.get("traceparent");
// Propagate to downstream services
```

---

## Appendix D: Execution Notes & Troubleshooting

### Prerequisites
- **concurrently**: Required for `bun run rust:all`. Install with `npm install` (listed in devDependencies).
- **Repo root**: Always run `rust:migration:inventory` and Rust scripts from the repository root.

### Commands That Must Work
| Command | Purpose |
|--------|--------|
| `bun run rust:migration:inventory` | Generate API inventory; uses `process.cwd()` as repo root. Run from repo root. |
| `bun run rust:all` | Start vector, aero-backend, auth-service (requires `concurrently`). |
| `bun run rust:vector` \| `rust:backend` \| `rust:auth` | Start a single Rust service. |
| `bun run bench:compare:auth` \| `bench:compare:courses` \| `bench:compare:all` | Placeholder scripts; see doc for full benchmark strategy. |
| `./deploy-all-rust-services.sh` | Stub script; prints deployment notes and local run instructions. |

### Common Issues
1. **"concurrently: command not found"** → Run `npm install` or `bun install` to install devDependencies.
2. **Inventory script writes to wrong path** → Fixed: script uses `process.cwd()` as repo root. Run from repo root only.
3. **docs/rust-migration missing** → Script now creates `docs/rust-migration` with `mkdir` if needed.
4. **cargo generate rust-service-template** → Template may not exist; create new services by copying an existing `rust-services/*` crate and renaming.
