# Báo cáo kiểm tra migration Node.js → Rust

**Ngày:** 2026-03-08  
**Nguồn:** Kiểm tra theo tiến trình Migrate2Rust.md

---

## 1. Tổng quan

| Hạng mục | Kết quả |
|----------|--------|
| **Tổng API routes** | 177 (inventory) |
| **Đã migrate sang Rust** | 7 routes (batch 1–4) |
| **Tiến độ** | ~4% |
| **Rust services** | 3: aero-backend, vector-sim-service, auth-service |

---

## 2. Build Rust services

| Service | Build | Ghi chú |
|---------|--------|--------|
| `rust-services/vector-sim-service` | ✅ Thành công | Port mặc định 8091 |
| `rust-services/aero-backend` | ✅ Thành công | Port mặc định 8090 |
| `rust-services/auth-service` | ✅ Thành công (có warnings) | Port mặc định **8092** (đã đổi từ 8091 để tránh trùng vector) |

**Lệnh kiểm tra:**
```bash
cargo build --manifest-path rust-services/vector-sim-service/Cargo.toml
cargo build --manifest-path rust-services/aero-backend/Cargo.toml
cargo build --manifest-path rust-services/auth-service/Cargo.toml
```

**Auth-service:** có ~20 warnings (unused imports/structs). Nên chạy `cargo fix` hoặc dọn dẹp sau.

---

## 3. Các route đã migrate (Batch 1–4)

| Route | Service | Proxy / Strangler |
|-------|---------|--------------------|
| `/api/vector-similarity` | vector-sim-service (8091) | Middleware + `DIRECT_RUST_VECTOR_PROXY` |
| `/api/ocr-grading` | aero-backend (8090) | Middleware + `DIRECT_RUST_OCR_GRADING_PROXY` |
| `/api/ocr-process` | aero-backend (8090) | Middleware + `DIRECT_RUST_OCR_PROCESS_PROXY` |
| `/api/ocr/auto-grade` | aero-backend (8090) | (trong inventory, proxy tùy cấu hình) |
| `/api/ocr/upload` | aero-backend (8090) | Middleware + `USE_RUST_OCR_UPLOAD_SERVICE` |
| `/api/llm-grading` | aero-backend (8090) | Middleware + `DIRECT_RUST_LLM_GRADING_PROXY` |
| `/api/assignments/grade-ocr` | aero-backend (8090) | (trong inventory) |

Khớp với `inventory.rs` → `MIGRATED_API_ROUTES` (7 route).

---

## 4. Port và xung đột (đã xử lý)

- **Trước:** `vector-sim-service` và `auth-service` cùng mặc định **8091** → không chạy đồng thời được.
- **Sau:**  
  - **vector-sim-service:** `8091` (giữ nguyên).  
  - **auth-service:** `8092` (đổi mặc định trong code + middleware + docs).

**File đã cập nhật:**
- `rust-services/auth-service/src/main.rs` → `AUTH_SERVICE_ADDR` mặc định 8092
- `middleware.ts` → `RUST_AUTH_URL` mặc định `http://127.0.0.1:8092`
- `Migrate2Rust.md`, `RUST_MIGRATION_PROGRESS.md`, `rust-services/auth-service/README.md` → port 8092 cho auth

**Chạy đồng thời 3 service:**
```bash
bun run rust:all
# vector → 8091, aero-backend → 8090, auth → 8092
```

---

## 5. Middleware (Strangler) và proxy

- **Cấu hình:** `middleware.ts` → `getStranglerRouteConfig()` áp dụng cho:
  - vector-similarity, ocr-grading, ocr-process, llm-grading
  - auth: login, register, 2fa/setup, 2fa/verify, 2fa/disable, forgot-password, reset-password, change-password, verify
- **Canary:** hỗ trợ `ENABLE_RUST_CANARY_PROXY`, `RUST_CANARY_PERCENT`, health check, auto rollout.
- **Direct proxy:** các biến `DIRECT_RUST_*_PROXY=true` chuyển thẳng sang Rust, không canary.

---

## 6. Inventory và script

- **Script:** `bun run rust:migration:inventory` dùng `process.cwd()` làm repo root → chạy từ thư mục gốc repo.
- **Output:** `docs/rust-migration/api-inventory.json`, `migration-matrix.csv`, `migration-matrix.md`, và cập nhật `rust-services/aero-backend/src/inventory.rs`.
- **Số route:** 177 (script quét `app/api/**/route.ts`).

---

## 7. Khuyến nghị tiếp theo

1. **Auth-service:** xử lý warnings (unused imports/structs), có thể dùng `cargo fix` hoặc chỉnh tay.
2. **E2E / tích hợp:** gọi thử từ Next.js với `DIRECT_RUST_*_PROXY=true` hoặc canary và kiểm tra response.
3. **Health check:** sau khi `bun run rust:all`:
   - `curl http://127.0.0.1:8090/health` (aero-backend)
   - `curl http://127.0.0.1:8091/health` (vector-sim)
   - `curl http://127.0.0.1:8092/health` (auth)
4. **Tiếp tục migration:** theo Migrate2Rust.md Batch 5+ (auth đã có service, còn tích hợp đầy đủ với NextAuth/UI).

---

## 8. Tài liệu tham chiếu

- **Kế hoạch:** `Migrate2Rust.md`
- **Tiến độ:** `RUST_MIGRATION_PROGRESS.md`
- **Strangler:** `docs/STRANGLER_PATTERN_RUST.md`
- **Inventory:** `docs/rust-migration/migration-matrix.md`, `api-inventory.json`
