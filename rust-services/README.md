# Rust Backend Services

Tập hợp microservices Rust thay thế dần Next.js API routes (Node.js) theo strangler pattern. Mục tiêu: chuyển 177 Next.js API routes sang Rust để giảm bề mặt tấn công (npm supply chain, Next.js CVEs, NextAuth/session leakage) và có sandbox compute tốt hơn cho LaTeX/OCR/AI.

## Workspace

Tất cả service ở dưới một Cargo workspace duy nhất tại `Aeroeduvison/Cargo.toml` (root). Workspace cũng bao gồm `latex-compiler/`.

```bash
# Build toàn bộ workspace
cargo check --workspace
cargo build --release --workspace

# Build/chạy 1 service
cargo run -p auth-service
cargo run -p latex-compiler

# Test
cargo test --workspace
```

> **Lưu ý**: `ai-service` hiện **bị loại khỏi workspace** (`exclude` trong root `Cargo.toml`) vì có path-dep tới `openfang-core/openfang-*` và `openfang-core/` là nested workspace riêng. Build standalone:
> ```bash
> cd rust-services/ai-service && cargo build
> ```
> Khi consolidate openfang-core vào workspace root, có thể đưa ai-service vào.

## Port Map

| Service | Port | Mô tả |
|---------|------|-------|
| `latex-compiler` | 8080 | LaTeX → PDF (Overleaf-style) |
| `aero-backend` | 8090 | API gateway + OCR/LLM batch-1 |
| `vector-sim-service` | 8091 | Vector similarity (legacy, gộp dần vào aero-backend) |
| `auth-service` | 8092 | login/register/2FA/JWT |
| `course-service` | 8093 | Courses, chapters, progress |
| `admin-service` | 8094 | Dashboard, users, analytics |
| `ai-service` | 8095 | AI content/chat/exam (standalone) |
| `student-service` | 8096 | Students, classes, learning paths |
| `stem-service` | 8097 | Physics sims, chemistry labs |
| `media-service` | 8098 | Documents, exams, uploads |
| `camera-iot-service` | 8099 | RTSP streams, IoT telemetry |
| `grading-service` | 8100 | Essay/AI grading, review |

## Strangler Pattern: Node → Rust

Mỗi Next.js route đã wired up có env flag `USE_RUST_*_SERVICE`. Khi flag bật, route proxy sang Rust service tương ứng.

Đã wired (xem `app/api/*/route.ts`):
- `USE_RUST_VECTOR_SERVICE` → vector-sim-service
- `USE_RUST_OCR_GRADING_SERVICE` → aero-backend
- `USE_RUST_OCR_PROCESS_SERVICE` → aero-backend
- `USE_RUST_OCR_AUTO_GRADE_SERVICE` → aero-backend
- `USE_RUST_OCR_UPLOAD_SERVICE` → aero-backend
- `USE_RUST_LLM_GRADING_SERVICE` → aero-backend
- `USE_RUST_ASSIGNMENTS_GRADE_OCR_SERVICE` → aero-backend
- `LATEX_SERVICE_URL` → latex-compiler

Status & roadmap: `docs/STRANGLER_PATTERN_RUST.md`, `docs/rust-migration/migration-matrix.md`.

## Tiêu chuẩn dependencies (workspace)

Tất cả service phải dùng workspace dependencies cho các crate dưới đây để đảm bảo phiên bản đồng nhất:

```toml
# Trong member Cargo.toml
[dependencies]
tokio = { workspace = true, features = ["..."] }
axum = { workspace = true, features = ["..."] }
serde = { workspace = true }
sqlx = { workspace = true, features = ["..."] }
reqwest = { workspace = true }
# ... etc
```

Crate riêng (không có trong workspace): `argon2`, `bcrypt`, `jsonwebtoken`, `totp-rs`, `dotenvy`, `nalgebra`, `rumqttc`, `lettre`, v.v. — service tự quản phiên bản.

## Build profile

Workspace định nghĩa `[profile.release]` với LTO + strip cho binary nhỏ. Service không cần override.
