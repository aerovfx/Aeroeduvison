# LaTeX Compile Service (Rust)

Dịch vụ biên dịch LaTeX → PDF kiểu Overleaf: queue Redis, worker pool, **không Docker** — primary xelatex trên host (firejail trên Linux), fallback tectonic, cache nội dung.

## Kiến trúc

```
Editor (Next.js) → POST /compile hoặc /compile/sync
                        ↓
                   Redis Queue
                        ↓
    Rust Workers (N = num_cpus) → xelatex (± firejail) / tectonic fallback
                        ↓
                   Cache (SHA256) + Job result
                        ↓
                   PDF (base64 trong Redis hoặc MinIO)
```

## Yêu cầu

- **Rust** 1.70+
- **Redis** (queue + cache + job result)
- **TeX Live** (xelatex) trên host, hoặc **Tectonic** (`cargo install tectonic`) làm fallback. **Firejail** (Linux, tùy chọn) để sandbox. Không cần Docker.

## Biến môi trường

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis cho queue, cache, job result |
| `BIND_HOST` | `0.0.0.0` | Host bind HTTP |
| `BIND_PORT` | `8080` | Port HTTP |
| `RUST_LOG` | `latex_compiler=info,warn` | Log level |

## Chạy

```bash
# Redis phải chạy sẵn
cargo run
# Hoặc release
cargo build --release && ./target/release/latex-compiler
```

## API

### POST /compile (async)

- Body: `{ "content": "<latex string>" }`
- Trả về: `{ "job_id": "uuid" }`
- Client gọi **GET /job/:job_id** để lấy kết quả: `pending` | `compiling` | `done` (có `pdf_base64`) | `failed` (có `log`).

### POST /compile/sync (đồng bộ, drop-in thay Node)

- Body: `{ "content": "<latex string>" }`
- Trả về: **200** + body là PDF binary (`Content-Type: application/pdf`).
- Dùng khi Next.js gọi một lần và cần PDF ngay (giống `lib/latex-compile.ts` hiện tại).

### GET /job/:job_id

- Trả về JSON: `{ "status": "done", "pdf_base64": "..." }` hoặc `{ "status": "failed", "log": "..." }` hoặc `pending` / `compiling`.

### GET /health

- Trả về `ok`.

## Sandbox (không Docker)

- **Primary:** xelatex chạy trực tiếp trên host. Trên **Linux** nếu có **firejail** thì chạy `firejail --private={work} --net=none --rlimit-cpu=90 -- xelatex ...`.
- **Fallback:** nếu xelatex thất bại hoặc không có PDF → chạy **tectonic** `main.tex`.
- **xelatex** luôn dùng `-no-shell-escape` để chống exploit (`\write18{...}`, `\input{/etc/passwd}`).

## Cache

- Key: `latex:pdf:{sha256(content)}`, value: PDF binary, TTL 1h.
- Worker và sync endpoint đều kiểm tra cache trước khi compile → giảm tải đáng kể khi nội dung trùng.

## Pipeline compile

- 2 pass **xelatex** (đủ cho TOC/cross-ref cơ bản; có thể mở rộng thêm bibtex nếu cần).

## Tối ưu sau (gợi ý)

1. **Persistent tex tree / precompiled format**: `xelatex -ini` → `latex.fmt`, sau đó `xelatex -fmt=latex.fmt` để load package một lần.
2. **RAM disk**: compile trong `/dev/shm` (Linux) để IO nhanh.
3. **MinIO**: upload PDF lên object storage, trả URL thay vì base64 trong Redis (giảm dung lượng Redis).

## Tích hợp Next.js

Để dùng service Rust thay cho `lib/latex-compile.ts`:

1. Chạy Redis + `latex-compiler`. Trên host cần xelatex (TeX Live) hoặc tectonic; không cần Docker.
2. Trong `app/api/latex-projects/compile/route.ts`: thay gọi `compileLatexToPdf(content)` bằng HTTP tới `POST http://localhost:8080/compile/sync` với body `{ "content": content }`, đọc response body là PDF.
3. (Tùy chọn) Chuyển sang luồng async: gọi `POST /compile` → nhận `job_id` → poll `GET /job/:job_id` đến khi `done`/`failed` → decode base64 và trả PDF hoặc lỗi cho client.
