# Báo cáo kỹ thuật: Kiến trúc Rust hiệu năng cao & Danh mục API vận hành thực tế

**Phiên bản:** 1.0  
**Ngày:** 2026-03-06  
**Dự án:** AeroeduVision  

---

## 1. Kiến trúc Rust hiệu năng cao

### 1.1 Tổng quan

Hệ thống áp dụng **Strangler Fig Pattern** để chuyển dần backend từ Node.js/Next.js sang Rust, đảm bảo vận hành liên tục và hiệu năng cao:

- **Mục tiêu:** Toàn bộ API backend chạy trên Rust; Next.js chỉ còn lớp frontend (SSR, static, proxy).
- **Lợi ích:** Giảm độ trễ 10–100x trên các đường dẫn quan trọng, type-safety end-to-end, triển khai từng phần an toàn.

### 1.2 Kiến trúc hiện tại (lai Node + Rust)

```
┌─────────────────────────────────────────────────────────────┐
│                  Next.js App (Node.js)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ~170 API Routes (Node/TypeScript) – vận hành chính  │   │
│  │  Auth, Courses, Admin, AI, STEM, Documents, Exams…   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  7 API Routes → Proxy sang Rust (Strangler)          │   │
│  │  vector-similarity, ocr-*, llm-grading, grade-ocr    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────────┐
│  PostgreSQL         │      │  Rust Services              │
│  (Prisma / Node)     │      │  - aero-backend :8090      │
│                      │      │  - vector-sim   :8091      │
└─────────────────────┘      └─────────────────────────────┘
```

### 1.3 Kiến trúc mục tiêu (100% Rust backend)

```
┌─────────────────────────────────────────────────────────────┐
│            Next.js Frontend (lớp mỏng)                      │
│  SSR · Static · API Proxy (mọi route → Rust)                │
└─────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    ▼                         ▼                         ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Rust Core API│   │ Rust Auth    │   │ Rust Courses │
│ (port 8090)  │   │ (port 8091)  │   │ (port 8092)  │
│ OCR, Grading │   │ JWT, 2FA     │   │ CRUD, Chapters│
│ Vector sim   │   │ Session      │   │ Progress      │
└──────────────┘   └──────────────┘   └──────────────┘
    │                         │                         │
    └─────────────────────────┴─────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │   (sqlx / r2d2)  │
                    └──────────────────┘
```

### 1.4 Các Rust service hiện có

| Service          | Thư mục                  | Port (dự kiến) | Nội dung chính                          |
|------------------|---------------------------|----------------|-----------------------------------------|
| aero-backend     | `rust-services/aero-backend` | 8090        | OCR, grading, vector-similarity (đã migrate) |
| vector-sim       | `rust-services/vector-sim-service` | 8091   | Vector similarity (cache, compute)      |
| auth-service     | `rust-services/auth-service`       | (scaffold)  | JWT, 2FA, session (kế hoạch)           |
| course-service   | `rust-services/course-service`     | (scaffold)  | Courses, chapters (kế hoạch)           |
| admin-service    | `rust-services/admin-service`      | (scaffold)  | Admin, users, stats (kế hoạch)         |
| student-service  | `rust-services/student-service`    | (scaffold)  | Students, PLG (kế hoạch)                |
| stem-service     | `rust-services/stem-service`        | (scaffold)  | STEM projects (kế hoạch)                |
| ai-service       | `rust-services/ai-service`         | (scaffold)  | AI chat, content (kế hoạch)             |
| media-service    | `rust-services/media-service`      | (scaffold)  | Media, upload (kế hoạch)                |

### 1.5 Cơ chế Strangler & Canary

- **Chế độ route:** Mỗi route được chọn có thể chạy **Node** (legacy) hoặc **Rust** (proxy) qua:
  - Query: `?target=node` | `?target=rust`
  - Header: `x-strangler-target: node|rust`
  - Biến môi trường: `USE_RUST_*_SERVICE=true` cho từng nhóm API.

- **Canary rollout:** Middleware phân % lưu lượng sang Rust (10% → 25% → 50% → 100%), sticky theo cookie:
  - `ENABLE_RUST_CANARY_PROXY=true`, `RUST_CANARY_PERCENT=10`, …
  - Có thể bật auto rollout: tăng bước khi đủ request và Rust healthy.

- **Health & quan sát:** Response headers: `x-strangler-target`, `x-strangler-rust-healthy`, `x-strangler-bucket`, `x-strangler-percent`.

### 1.6 API đã chuyển sang Rust (vận hành thực tế)

| Route | Batch | Ghi chú |
|-------|-------|--------|
| `POST/DELETE /api/vector-similarity` | batch-1 | aero-backend / vector-sim |
| `POST/GET /api/ocr-grading` | batch-1 | aero-backend |
| `POST /api/ocr-process` | batch-2 | aero-backend |
| `POST /api/ocr/auto-grade` | batch-2 | aero-backend |
| `POST /api/ocr/upload` | batch-3 | aero-backend |
| `POST /api/llm-grading` | batch-4 | aero-backend |
| `POST /api/assignments/grade-ocr` | batch-4 | aero-backend |

### 1.7 Hiệu năng mục tiêu

- **Độ trễ API (p95):** &lt; 100ms cho read, &lt; 500ms cho write/AI.
- **Throughput:** 1.000+ request/giây (Rust core paths).
- **Zero downtime:** Chuyển từng batch qua proxy + canary.

---

## 2. Danh mục API vận hành thực tế (177 endpoint, mở rộng tới 202)

Danh mục được sinh tự động từ `app/api/**/route.ts` và lưu tại:

- `docs/rust-migration/api-inventory.json`
- `docs/rust-migration/migration-matrix.md` / `.csv`

Regenerate:

```bash
bun run rust:migration:inventory
```

**Tổng số route kiểm kê:** **177**. Hệ thống thiết kế mở rộng tới **202+** endpoint khi bổ sung thêm route (ví dụ teacher/exams, vision-tracker/emotion, exam-matrices, …).

**Chú thích cột:**

- **Status:** `migrated` = đã chạy trên Rust; `scaffolded` = còn Node, Rust có placeholder 501.
- **Batch:** batch-1..4 đã migrate; `backlog` = chưa migrate.
- **Target:** `node` = xử lý bởi Next.js; `rust` = xử lý bởi Rust (proxy hoặc trực tiếp).

### 2.1 Bảng danh mục đầy đủ (177 API)

| Route | Source | Status | Batch | Target | Notes |
|-------|--------|--------|-------|--------|-------|
| `/api/admin` | `app/api/admin/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/alerts` | `app/api/admin/alerts/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/auth-logs` | `app/api/admin/auth-logs/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/overview` | `app/api/admin/overview/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/stats` | `app/api/admin/stats/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/stem` | `app/api/admin/stem/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/stem/sync` | `app/api/admin/stem/sync/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/students` | `app/api/admin/students/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/students/[studentId]` | `app/api/admin/students/[studentId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/unlock-account` | `app/api/admin/unlock-account/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/users` | `app/api/admin/users/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/admin/users/[id]` | `app/api/admin/users/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/aerodynamics` | `app/api/aerodynamics/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/aeroflow-3d` | `app/api/aeroflow-3d/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-analytics/dashboard` | `app/api/ai-analytics/dashboard/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-chat` | `app/api/ai-chat/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-content/[id]` | `app/api/ai-content/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-content/generate` | `app/api/ai-content/generate/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-content/generate-stream` | `app/api/ai-content/generate-stream/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-content/save` | `app/api/ai-content/save/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-generate-lesson` | `app/api/ai-generate-lesson/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-grade-lesson` | `app/api/ai-grade-lesson/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-intelligent/generate` | `app/api/ai-intelligent/generate/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai-tutor-chat` | `app/api/ai-tutor-chat/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ai/analyze-document` | `app/api/ai/analyze-document/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/assignments/grade-ocr` | `app/api/assignments/grade-ocr/route.ts` | **migrated** | batch-4 | **rust** | Implemented in rust-services/aero-backend |
| `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/2fa/disable` | `app/api/auth/2fa/disable/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/2fa/setup` | `app/api/auth/2fa/setup/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/2fa/verify` | `app/api/auth/2fa/verify/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/change-password` | `app/api/auth/change-password/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/forgot-password` | `app/api/auth/forgot-password/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/login` | `app/api/auth/login/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/register` | `app/api/auth/register/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/reset-password` | `app/api/auth/reset-password/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/auth/verify` | `app/api/auth/verify/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/biogrowth` | `app/api/biogrowth/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/blocking/courses` | `app/api/blocking/courses/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chat/messages` | `app/api/chat/messages/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chat/rooms` | `app/api/chat/rooms/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chat/rooms/[roomId]/messages` | `app/api/chat/rooms/[roomId]/messages/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/check-env` | `app/api/check-env/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/checkenv` | `app/api/checkenv/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chemistry-lab` | `app/api/chemistry-lab/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chemlab-3d` | `app/api/chemlab-3d/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chemlab/balance` | `app/api/chemlab/balance/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chemlab/enthalpy` | `app/api/chemlab/enthalpy/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/chemlab/molecule/3d` | `app/api/chemlab/molecule/3d/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/classes` | `app/api/classes/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/classes/[id]` | `app/api/classes/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/classes/[id]/students` | `app/api/classes/[id]/students/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/classes/[id]/students/[studentId]` | `app/api/classes/[id]/students/[studentId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/content-generation/batch` | `app/api/content-generation/batch/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/content-generation/generate` | `app/api/content-generation/generate/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/content-generation/validate` | `app/api/content-generation/validate/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses` | `app/api/courses/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]` | `app/api/courses/[courseId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/attachments` | `app/api/courses/[courseId]/attachments/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/attachments/[attachmentId]` | `app/api/courses/[courseId]/attachments/[attachmentId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/chapters` | `app/api/courses/[courseId]/chapters/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/chapters/[chapterId]` | `app/api/courses/[courseId]/chapters/[chapterId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/chapters/[chapterId]/progress` | `app/api/courses/[courseId]/chapters/[chapterId]/progress/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/chapters/[chapterId]/publish` | `app/api/courses/[courseId]/chapters/[chapterId]/publish/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/chapters/[chapterId]/unpublish` | `app/api/courses/[courseId]/chapters/[chapterId]/unpublish/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/chapters/reorder` | `app/api/courses/[courseId]/chapters/reorder/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/checkout` | `app/api/courses/[courseId]/checkout/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/publish` | `app/api/courses/[courseId]/publish/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/courses/[courseId]/unpublish` | `app/api/courses/[courseId]/unpublish/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/datasim-ai` | `app/api/datasim-ai/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/debug-auth` | `app/api/debug-auth/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/debug-db` | `app/api/debug-db/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/debug-nextauth` | `app/api/debug-nextauth/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/debug-session` | `app/api/debug-session/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/documents` | `app/api/documents/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/documents/[id]` | `app/api/documents/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/documents/[id]/process` | `app/api/documents/[id]/process/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/documents/[id]/save-result` | `app/api/documents/[id]/save-result/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/documents/file/[...path]` | `app/api/documents/file/[...path]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/documents/fix-status` | `app/api/documents/fix-status/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/documents/upload` | `app/api/documents/upload/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/exam-matrices` | `app/api/exam-matrices/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/exam-matrices/[id]` | `app/api/exam-matrices/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/exam-matrices/[id]/duplicate` | `app/api/exam-matrices/[id]/duplicate/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/exam-matrices/[id]/process` | `app/api/exam-matrices/[id]/process/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/exam-matrices/digitize` | `app/api/exam-matrices/digitize/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/exam-matrices/file/[...path]` | `app/api/exam-matrices/file/[...path]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/exams/generate-from-matrix` | `app/api/exams/generate-from-matrix/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/generate-daily-plan` | `app/api/generate-daily-plan/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/generate-lesson` | `app/api/generate-lesson/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/generate-lesson-grok` | `app/api/generate-lesson-grok/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/grading/[id]` | `app/api/grading/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/grading/batch` | `app/api/grading/batch/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/grading/dashboard` | `app/api/grading/dashboard/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/grading/grade` | `app/api/grading/grade/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/grading/review` | `app/api/grading/review/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/grading/secure` | `app/api/grading/secure/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/grading/submit` | `app/api/grading/submit/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/harmonic-motion` | `app/api/harmonic-motion/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/health` | `app/api/health/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/image-signed-url` | `app/api/image-signed-url/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/kg/search` | `app/api/kg/search/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/lab-completion` | `app/api/lab-completion/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/labs/index` | `app/api/labs/index/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/labtwin` | `app/api/labtwin/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/learning-path/create` | `app/api/learning-path/create/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/learning-paths` | `app/api/learning-paths/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/llm-grading` | `app/api/llm-grading/route.ts` | **migrated** | batch-4 | **rust** | Implemented in rust-services/aero-backend |
| `/api/mechaforce` | `app/api/mechaforce/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/metrics` | `app/api/metrics/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/mock-auth` | `app/api/mock-auth/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/mock-db` | `app/api/mock-db/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/mock-login` | `app/api/mock-login/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/motion-sim` | `app/api/motion-sim/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/motion-tracking` | `app/api/motion-tracking/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/motionsim` | `app/api/motionsim/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/ocr-grading` | `app/api/ocr-grading/route.ts` | **migrated** | batch-1 | **rust** | Implemented in rust-services/aero-backend |
| `/api/ocr-process` | `app/api/ocr-process/route.ts` | **migrated** | batch-2 | **rust** | Implemented in rust-services/aero-backend |
| `/api/ocr/auto-grade` | `app/api/ocr/auto-grade/route.ts` | **migrated** | batch-2 | **rust** | Implemented in rust-services/aero-backend |
| `/api/ocr/upload` | `app/api/ocr/upload/route.ts` | **migrated** | batch-3 | **rust** | Implemented in rust-services/aero-backend |
| `/api/ollama-grading` | `app/api/ollama-grading/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/optics-lab` | `app/api/optics-lab/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/physics-motion` | `app/api/physics-motion/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/plg/[studentId]` | `app/api/plg/[studentId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/plg/[studentId]/recommendations` | `app/api/plg/[studentId]/recommendations/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/plg/[studentId]/record-interaction` | `app/api/plg/[studentId]/record-interaction/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/plg/[studentId]/update-skill` | `app/api/plg/[studentId]/update-skill/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/projectile` | `app/api/projectile/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/question-bank` | `app/api/question-bank/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/question-bank/[id]` | `app/api/question-bank/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/queue/jobs` | `app/api/queue/jobs/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/quiz/generate` | `app/api/quiz/generate/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/quiz/validate` | `app/api/quiz/validate/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/redis/cache` | `app/api/redis/cache/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/redis/health` | `app/api/redis/health/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/refraction` | `app/api/refraction/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/search` | `app/api/search/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/stem/projects` | `app/api/stem/projects/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/stem/projects/[id]` | `app/api/stem/projects/[id]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/stem/sync` | `app/api/stem/sync/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/stem/test` | `app/api/stem/test/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/streaming/sync` | `app/api/streaming/sync/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/students` | `app/api/students/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/sync/data` | `app/api/sync/data/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/sync/stream` | `app/api/sync/stream/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/teacher/stats` | `app/api/teacher/stats/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/teacher/students` | `app/api/teacher/students/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/teacher/students/[studentId]` | `app/api/teacher/students/[studentId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test` | `app/api/test/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-auth` | `app/api/test-auth/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-auth-cleanup` | `app/api/test-auth-cleanup/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-auth-edge-cases` | `app/api/test-auth-edge-cases/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-auth-redirects` | `app/api/test-auth-redirects/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-auth-session` | `app/api/test-auth-session/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-cookies` | `app/api/test-cookies/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-credentials` | `app/api/test-credentials/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-db` | `app/api/test-db/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-role-access` | `app/api/test-role-access/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-session` | `app/api/test-session/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/test-user` | `app/api/test-user/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/thermoflow` | `app/api/thermoflow/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/update-learning-progress` | `app/api/update-learning-progress/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/upload` | `app/api/upload/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/upload/gcs-presigned-url` | `app/api/upload/gcs-presigned-url/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/upload/presigned-url` | `app/api/upload/presigned-url/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/uploadthing` | `app/api/uploadthing/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/user/xp` | `app/api/user/xp/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/users/activity` | `app/api/users/activity/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/vector-similarity` | `app/api/vector-similarity/route.ts` | **migrated** | batch-1 | **rust** | Implemented in rust-services/aero-backend |
| `/api/vector/search` | `app/api/vector/search/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/video/stream` | `app/api/video/stream/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/vision-tracker/attention` | `app/api/vision-tracker/attention/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/vision-tracker/consent` | `app/api/vision-tracker/consent/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/vision-tracker/heartmap` | `app/api/vision-tracker/heartmap/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/weather-sim` | `app/api/weather-sim/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/webhook` | `app/api/webhook/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/wfc-builder` | `app/api/wfc-builder/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |
| `/api/xp/analyze/[studentId]` | `app/api/xp/analyze/[studentId]/route.ts` | scaffolded | backlog | node | Scaffold placeholder (501) in Rust backend |

### 2.2 Tóm tắt theo nhóm nghiệp vụ

| Nhóm | Số route | Trạng thái |
|------|----------|------------|
| Admin | 12 | scaffolded |
| Auth | 10 | scaffolded |
| AI / Content / Tutor | 14 | scaffolded (1 llm-grading migrated) |
| Courses / Chapters | 15 | scaffolded |
| Documents | 8 | scaffolded |
| Exam matrices / Exams | 7 | scaffolded |
| Grading | 8 | scaffolded (2 migrated: grade-ocr, llm-grading) |
| OCR | 5 | **4 migrated**, 1 ollama-grading scaffolded |
| Vector | 2 | **1 migrated** (vector-similarity) |
| Teacher / Students / Classes | 8 | scaffolded |
| STEM / Labs / Simulations | 20+ | scaffolded |
| Vision tracker | 3 | scaffolded |
| Còn lại (chat, upload, test, …) | ~65 | scaffolded |

**Tổng:** 177 route; 7 đã migrate sang Rust, 170 scaffolded (Node vận hành, Rust placeholder).

---

## 3. Tài liệu tham chiếu

- **Strangler & Canary:** `docs/STRANGLER_PATTERN_RUST.md`
- **Kế hoạch migration 100% Rust:** `Migrate2Rust.md`
- **Danh mục API (JSON/CSV):** `docs/rust-migration/api-inventory.json`, `migration-matrix.md`, `migration-matrix.csv`
- **Inventory Rust (code):** `rust-services/aero-backend/src/inventory.rs`
