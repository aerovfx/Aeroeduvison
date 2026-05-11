# Rust Backend — Production Deployment Runbook

Tài liệu triển khai 2 compute-heavy services (`latex-compiler`, `aero-backend`) ra production. Đây là kết quả của Step 7 trong roadmap dọn dẹp Rust.

## Tổng quan

| Service | Port | Phụ thuộc runtime |
|---------|------|-------------------|
| `latex-compiler` | 8080 | TeX Live (xelatex) hoặc Tectonic, Redis (cache + queue), firejail (sandbox tuỳ chọn) |
| `aero-backend` | 8090 | Không phụ thuộc bên ngoài (in-memory cache) |

Cả hai đều được build từ Cargo workspace ở repo root.

## Triển khai bằng Docker Compose

### 1. Build & run

```bash
# Từ repo root
docker compose -f docker-compose.rust.yml up -d --build

# Kiểm tra
curl http://localhost:8080/health   # latex-compiler
curl http://localhost:8090/health   # aero-backend
```

Bring up sẽ:
- Khởi Redis 7 (volume persistent)
- Build image `aeroedu/latex-compiler:latest` (~1.5 GB, có TeX Live)
- Build image `aeroedu/aero-backend:latest` (~80 MB)
- Bind cả 2 service vào `127.0.0.1` (không expose ra Internet — đứng sau Next.js reverse proxy)

### 2. Wire vào Next.js

Thêm vào `.env.local` của Next.js:

```bash
# LaTeX
LATEX_SERVICE_URL=http://localhost:8080

# OCR / LLM / Vector (Rust strangler)
RUST_BACKEND_URL=http://localhost:8090
USE_RUST_OCR_GRADING_SERVICE=true
USE_RUST_OCR_PROCESS_SERVICE=true
USE_RUST_OCR_AUTO_GRADE_SERVICE=true
USE_RUST_OCR_UPLOAD_SERVICE=true
USE_RUST_LLM_GRADING_SERVICE=true
USE_RUST_ASSIGNMENTS_GRADE_OCR_SERVICE=true
USE_RUST_VECTOR_SERVICE=true
```

Restart Next.js → tất cả `/api/ocr-*`, `/api/llm-grading`, `/api/vector-similarity`, `/api/latex-projects/compile*` sẽ proxy sang Rust.

### 3. Rollback

Tắt flag tương ứng (set về `false`) hoặc `unset LATEX_SERVICE_URL` → Next.js quay lại tự xử lý (Node.js path).

## Triển khai không Docker (systemd)

Build binary trên host:

```bash
cargo build --release -p latex-compiler -p aero-backend
sudo cp target/release/latex-compiler  /usr/local/bin/
sudo cp target/release/aero-backend   /usr/local/bin/
```

Cài runtime deps:

```bash
# latex-compiler cần
sudo apt install texlive-xetex texlive-latex-extra texlive-fonts-recommended firejail redis-server
# (tuỳ chọn) cargo install tectonic   # fallback engine
```

### Systemd unit — `latex-compiler.service`

```ini
[Unit]
Description=AeroEdu LaTeX compile service
After=network.target redis-server.service

[Service]
Type=simple
User=latex
Group=latex
Environment=BIND_HOST=127.0.0.1
Environment=BIND_PORT=8080
Environment=REDIS_URL=redis://127.0.0.1:6379
Environment=RUST_LOG=latex_compiler=info,warn
ExecStart=/usr/local/bin/latex-compiler
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/tmp

[Install]
WantedBy=multi-user.target
```

### Systemd unit — `aero-backend.service`

```ini
[Unit]
Description=AeroEdu Rust compute backend (OCR/LLM/vector)
After=network.target

[Service]
Type=simple
User=aero
Group=aero
Environment=AERO_BACKEND_ADDR=127.0.0.1:8090
Environment=RUST_LOG=aero_backend=info,warn
ExecStart=/usr/local/bin/aero-backend
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Enable & start:

```bash
sudo useradd --system --shell /usr/sbin/nologin latex
sudo useradd --system --shell /usr/sbin/nologin aero
sudo systemctl daemon-reload
sudo systemctl enable --now latex-compiler.service aero-backend.service
sudo systemctl status latex-compiler aero-backend
```

## Bảo mật

- **Không expose port ra Internet.** Bind `127.0.0.1` và đặt Rust services sau Next.js (Next.js làm reverse proxy via fetch).
- **latex-compiler dùng firejail** trên Linux để sandbox xelatex run, tránh `\write18` và đọc filesystem bên ngoài work-dir. `-no-shell-escape` luôn được pass tới xelatex.
- **HTTPS bên ngoài** (qua Nginx/Caddy trước Next.js) — không cần TLS giữa Next.js ↔ Rust service vì cùng máy.
- **Secrets** (LLM keys, Redis password) qua env vars hoặc Docker secrets; không hard-code vào image.

## Giám sát

- **Health check**: `GET /health` cả 2 service. Compose + systemd đều check sẵn.
- **Logs**: `docker compose logs -f latex-compiler aero-backend` hoặc `journalctl -u latex-compiler -f`.
- **Metrics** (gợi ý cho tương lai): thêm `tower-http::trace` + Prometheus exporter; chưa có trong commit này.

## Capacity planning

- `latex-compiler`: ~30s compile time mỗi job (xelatex 2 pass với gói chuẩn). Redis cache giảm 10x nếu nội dung trùng. Khuyến nghị `num_workers = num_cpus`.
- `aero-backend`: OCR/LLM/vector đều stateless, tỷ lệ scale ngang đơn giản. Stick session không cần.

## Troubleshooting

| Triệu chứng | Xử lý |
|-------------|-------|
| `503 COMPILE_NOT_AVAILABLE` từ Next.js | Kiểm tra `LATEX_SERVICE_URL` reachable: `curl ${URL}/health`. Đảm bảo `latex-compiler` container đang up. |
| Build image fail tại `cargo build` | Đảm bảo `Cargo.lock` được commit. Build context phải là **repo root** (không phải thư mục service). |
| `firejail: not found` trong container | Chỉ ảnh hưởng Linux sandbox. xelatex vẫn chạy bare; xem WARN trong log. Cài lại apt package `firejail`. |
| OCR/LLM trả 502 từ aero-backend | Xem `docker logs aeroedu-aero-backend`. Có thể do downstream service (`OCR_GRADING_BACKEND_URL`) chưa lên. |

## Migration tiếp theo

Sau khi prod ổn định với 2 service compute-heavy, các bước tiếp:

1. **Port handler OCR/LLM** từ aero-backend sang grading-service (`docs/STRANGLER_PATTERN_RUST.md`). Flip `USE_GRADING_SERVICE_FOR_OCR=true`.
2. **auth-service** → bật `USE_RUST_AUTH_*` flags cho `/api/auth/*`.
3. **course-service**, **student-service**, **admin-service** → migrate batch theo `docs/rust-migration/migration-matrix.md`.
4. Khi >50% routes đã sang Rust, đánh giá tắt hoàn toàn `app/api/` (chỉ giữ Next.js cho frontend rendering).
