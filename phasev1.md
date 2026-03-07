Dạ Boss Hương, đây là toàn bộ nội dung Giai đoạn 1 đã được format thành file markdown hoàn chỉnh:

---

```markdown
# Giai Đoạn 1: Setup & Kết Nối Open Fang

**Thời gian ước lượng:** 2-3 tuần (14 ngày)

**Mục tiêu:** Open Fang daemon chạy ổn định + Next.js gọi được API. Thiết lập nền tảng vững chắc cho các tác vụ AI và quản lý bộ nhớ.

---

## 📋 MỤC LỤC

1. [Pre-requisites](#1-pre-requisites)
2. [Task 1.1: Cài đặt Open Fang Daemon](#2-task-11-cài-đặt-open-fang-daemon)
3. [Task 1.2: Cấu hình LLM Providers](#3-task-12-cấu-hình-llm-providers)
4. [Task 1.3: Setup Database](#4-task-13-setup-database)
5. [Task 1.4: Setup Vector Store](#5-task-14-setup-vector-store)
6. [Task 1.5: Tạo API Wrapper trong Next.js](#6-task-15-tạo-api-wrapper-trong-nextjs)
7. [Task 1.6: Test End-to-End](#7-task-16-test-end-to-end)
8. [Task 1.7: Error Handling & Logging](#8-task-17-error-handling--logging)
9. [Checklist Hoàn Thành](#9-checklist-hoàn-thành)
10. [Timeline Tổng Kết](#10-timeline-tổng-kết)

---

## 1. PRE-REQUISITES

### Yêu cầu hệ thống:
- **OS:** Linux (Ubuntu 22.04+) hoặc Windows Server.
- **RAM:** Tối thiểu 4GB (8GB recommended).
- **CPU:** 2 cores+.
- **Disk:** 10GB+ free space.

### Software cần cài trước:
- **Rust:** >= 1.70.0
- **Node.js:** >= 18.0.0 (cho Next.js)
- **PostgreSQL:** Với extension `pgvector`.

---

## 2. TASK 1.1: CÀI ĐẶT OPEN FANG DAEMON

### Bước 1.1.1: Build Open Fang
```bash
# Clone repository và build
git clone https://github.com/openfang/openfang.git
cd openfang
cargo build --release
```

### Bước 1.1.2: Thiết lập Systemd Service (Linux)
Tạo file `/etc/systemd/system/openfang.service` để chạy daemon ngầm.
```ini
[Service]
ExecStart=/opt/openfang/target/release/openfang daemon run
Restart=on-failure
Environment="OPENFANG_CONFIG=/opt/openfang/config.toml"
```

---

## 3. TASK 1.2: CẤU HÌNH LLM PROVIDERS

Tạo file `config.toml` tại thư mục gốc của Open Fang.

```toml
[server]
host = "0.0.0.0"
port = 8080

[providers.openai]
enabled = true
api_key = "sk-..."
models = ["gpt-4o", "gpt-4o-mini"]
default_model = "gpt-4o"

[providers.gemini]
enabled = true
api_key = "..."
models = ["gemini-2.0-flash", "gemini-1.5-pro"]
```

---

## 4. TASK 1.3: SETUP DATABASE

Sử dụng PostgreSQL để lưu giữ session và trí nhớ của Agent.

```sql
CREATE DATABASE openfang_memory;
CREATE USER openfang_user WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE openfang_memory TO openfang_user;
```

---

## 5. TASK 1.4: SETUP VECTOR STORE (PGVECTOR)

Thiết lập tìm kiếm vector để hỗ trợ RAG (Retrieval-Augmented Generation).

### Cài đặt Extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Tạo bảng Embeddings:
```sql
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo Index HNSW cho tìm kiếm nhanh
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
```

---

## 6. TASK 1.5: TẠO API WRAPPER TRONG NEXT.JS

### Bước 1.5.1: Xây dựng OpenFang Client
Tạo file `src/lib/openfang.ts` để quản lý các cuộc gọi API.

```typescript
export class OpenFangClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: { baseUrl: string; apiKey?: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async chat(message: string, agent: string = 'tutor') {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: agent,
        messages: [{ role: 'user', content: message }]
      })
    });
    return response.json();
  }
}
```

### Bước 1.5.2: API Route Proxy
Tạo Route Handler tại `src/app/api/openfang/route.ts` để bảo mật API Key.

---

## 7. TASK 1.6: TEST END-TO-END

Kiểm tra luồng dữ liệu từ giao diện người dùng đến các AI Agent.
1. Gửi tin nhắn từ Dashboard.
2. Kiểm tra log của Open Fang Daemon.
3. Xác nhận phản hồi hiển thị đúng trên UI.

---

## 8. TASK 1.7: ERROR HANDLING & LOGGING

- Triển khai **Retry Logic** cho các cuộc gọi API lỗi mạng.
- Ghi lại log chi tiết các yêu cầu AI vào `/var/log/openfang/openfang.log`.

---

## 9. CHECKLIST HOÀN THÀNH

- [x] Build Open Fang daemon.
- [x] Cấu hình OpenAI & Gemini.
- [x] Thiết lập Database PostgreSQL.
- [x] Cài đặt pgvector và index thành công.
- [x] Hoàn thành Next.js API Wrapper.

---

## 10. TIMELINE TỔNG KẾT

| Task | Thời gian dự kiến |
|------|-------------------|
| Setup Infrastructure | 3 ngày |
| Database & Vector | 4 ngày |
| Next.js Integration | 5 ngày |
| Testing & Bug fix | 2 ngày |

---
**Tài liệu này thuộc dự án Aeroeduvison - Open Fang Integration**
```
