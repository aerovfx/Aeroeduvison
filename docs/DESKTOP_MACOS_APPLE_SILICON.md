# AeroEdu Vision Desktop — macOS Apple Silicon

## Cài đặt

Target hiện tại là `aarch64-apple-darwin` (M1/M2/M3/M4). Cài PostgreSQL 16 một
lần trên máy:

```bash
brew install postgresql@16
```

Mở DMG, kéo **AeroEdu Vision** vào Applications rồi mở app. Backend Node đã được
bundle trong app; API chỉ lắng nghe ở `127.0.0.1:43127` và offline mode được bật.

## Dữ liệu bền vững

Database và file ứng dụng không nằm trong `.app`, nên thay app/upgrade không làm
mất dữ liệu:

```text
~/Library/Application Support/com.aeroedu.desktop/postgres
~/Library/Application Support/com.aeroedu.desktop/data
~/Library/Application Support/com.aeroedu.desktop/jwt-secret
```

PostgreSQL được khởi động khi mở app và shutdown nhanh, sạch khi quit app. Không
xóa thư mục Application Support nếu muốn giữ database.

## Upload file (video/ảnh/PDF/truyện thiếu nhi)

Bản desktop không có Application Default Credentials cho GCS nên mọi upload
(video khoá học, tài liệu GV, ảnh/audio truyện thiếu nhi...) tự lưu local dưới
`~/Library/Application Support/com.aeroedu.desktop/data/uploads/media` — nằm
trong cùng thư mục `data` đã liệt kê ở trên nên **được giữ nguyên khi upgrade
app** giống database. Không cần cấu hình gì thêm.

## Trợ lý AI (Ollama local)

Không đóng gói `DEEPSEEK_API_KEY`/`ANTHROPIC_API_KEY` trong app tải về máy vì
không thể giữ bí mật phía client. Trợ lý AeroEdu, Gia Sư AI, sinh đề AI và AI
chuyển LaTeX↔Word chỉ hoạt động khi máy có [Ollama](https://ollama.com) chạy
sẵn ở cổng mặc định `127.0.0.1:11434`:

```bash
brew install ollama
ollama pull llama3.2        # hoặc model khác — đổi qua biến môi trường OLLAMA_MODEL
ollama serve                # hoặc mở app Ollama.app, giữ chạy nền
```

Không cài Ollama thì các tính năng AI trả "Dịch vụ AI hiện chưa sẵn sàng" —
phần còn lại của app (bài học, chấm điểm camera OMR, lớp học...) không bị ảnh
hưởng vì các tính năng đó không phụ thuộc AI cloud.

## Tài khoản ban đầu

Bootstrap là idempotent: tạo tài khoản còn thiếu nhưng không đặt lại mật khẩu của
tài khoản đã tồn tại.

| Vai trò | Email | Mật khẩu ban đầu |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| Teacher | `teacher@example.com` | `teacher123` |
| Teacher 2 | `teacher2@example.com` | `teacher123` |
| Student | `student@example.com` | `student123` |
| Student 2 | `student2@example.com` | `student123` |
| Student 3 | `student3@example.com` | `student123` |
| Student 4 | `student4@example.com` | `student123` |

Đổi các mật khẩu mặc định ngay sau lần đăng nhập đầu.

## Build lại

```bash
cd aeroedu-vite
npm run tauri:build -- --target aarch64-apple-darwin
```

Script `scripts/prepare-tauri-macos.sh` sinh schema PostgreSQL từ Prisma, bundle
backend/bootstrap và đưa Node arm64 vào sidecar trước khi Tauri build.
