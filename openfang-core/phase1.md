
# Giai Đoạn 1: Setup & Kết Nối Open Fang

**Thời gian ước lượng:** 2-3 tuần (14 ngày)

**Mục tiêu:** Open Fang daemon chạy ổn định + Next.js gọi được API

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

```bash
- OS: Linux (Ubuntu 22.04+) hoặc Windows Server
- RAM: Tối thiểu 4GB (8GB recommended)
- CPU: 2 cores+
- Disk: 10GB+ free space
- Network: Internet access cho LLM API calls
```

### Software cần cài trước:

```bash
# 1. Rust (bắt buộc)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version  # Kiểm tra: >= 1.70.0

# 2. Node.js (cho Next.js)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Kiểm tra: >= 18.0.0

# 3. PostgreSQL (nếu dùng PostgreSQL)
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 4. Git
sudo apt install -y git
```

---

## 2. TASK 1.1: CÀI ĐẶT OPEN FANG DAEMON

### Bước 1.1.1: Clone repository

```bash
# Tạo thư mục cài đặt
sudo mkdir -p /opt/openfang
sudo chown $USER:$USER /opt/openfang
cd /opt/openfang

# Clone repository
git clone https://github.com/openfang/openfang.git .
```

### Bước 1.1.2: Build Open Fang

```bash
# Build release mode
cargo build --release

# Verify build thành công
ls -la target/release/openfang
./target/release/openfang --version
```

### Bước 1.1.3: Tạo systemd service (Linux)

```bash
sudo nano /etc/systemd/system/openfang.service
```

**Nội dung file:**

```ini
[Unit]
Description=Open Fang Agent Daemon
After=network.target postgresql.service

[Service]
Type=simple
User=openfang
Group=openfang
WorkingDirectory=/opt/openfang
ExecStart=/opt/openfang/target/release/openfang daemon run
Restart=on-failure
RestartSec=10
Environment="RUST_LOG=info"
Environment="OPENFANG_CONFIG=/opt/openfang/config.toml"

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=openfang

# Security
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/openfang/data /var/log/openfang

[Install]
WantedBy=multi-user.target
```

### Bước 1.1.4: Tạo user và phân quyền

```bash
# Tạo user riêng cho openfang
sudo useradd --system --no-create-home --shell /bin/false openfang

# Tạo thư mục data và log
sudo mkdir -p /opt/openfang/data
sudo mkdir -p /var/log/openfang
sudo chown -R openfang:openfang /opt/openfang/data
sudo chown -R openfang:openfang /var/log/openfang

# Phân quyền
sudo chmod 750 /opt/openfang/data
sudo chmod 750 /var/log/openfang
```

### Bước 1.1.5: Start và enable service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable openfang

# Start service
sudo systemctl start openfang

# Kiểm tra status
sudo systemctl status openfang

# Xem log
sudo journalctl -u openfang -f
```

### Bước 1.1.6: Verify daemon chạy

```bash
# Test command
./target/release/openfang status

# Hoặc gọi API trực tiếp
curl http://localhost:8080/health
```

### ⚠️ Troubleshooting Task 1.1:

| Lỗi | Command kiểm tra | Giải pháp |
|-----|------------------|-----------|
| `cargo: command not found` | `which cargo` | `source $HOME/.cargo/env` |
| `port 8080 already in use` | `sudo lsof -i :8080` | Đổi port trong config |
| `permission denied` | `ls -la target/release/` | `chmod +x target/release/openfang` |
| `service failed to start` | `journalctl -u openfang -n 50` | Xem log chi tiết, sửa config |

---

## 3. TASK 1.2: CẤU HÌNH LLM PROVIDERS

### Bước 1.2.1: Tạo file config

```bash
cd /opt/openfang
nano config.toml
```

### Bước 1.2.2: Nội dung config.toml chi tiết

```toml
# ===========================================
# OPEN FANG CONFIGURATION
# ===========================================

[server]
host = "0.0.0.0"
port = 8080
workers = 4
timeout_seconds = 300

[logging]
level = "info"
file = "/var/log/openfang/openfang.log"
max_size_mb = 100
retention_days = 30
format = "json"

[database]
type = "postgresql"
host = "localhost"
port = 5432
database = "openfang_memory"
username = "openfang_user"
password = "YOUR_DB_PASSWORD"
max_connections = 10
min_connections = 2

[vector_store]
type = "pgvector"
embedding_model = "text-embedding-3-small"
dimensions = 1536
index_type = "hnsw"
hnsw_m = 16
hnsw_ef_construction = 64

[providers.openai]
enabled = true
api_key = "sk-YOUR_OPENAI_API_KEY"
base_url = "https://api.openai.com/v1"
models = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
default_model = "gpt-4o"
rate_limit_rpm = 60
timeout_seconds = 30
retry_attempts = 3
retry_delay_ms = 1000

[providers.gemini]
enabled = true
api_key = "YOUR_GEMINI_API_KEY"
base_url = "https://generativelanguage.googleapis.com/v1beta"
models = ["gemini-2.0-flash", "gemini-1.5-pro"]
default_model = "gemini-2.0-flash"
rate_limit_rpm = 60
timeout_seconds = 30
retry_attempts = 3
retry_delay_ms = 1000

[providers.default]
provider = "openai"
model = "gpt-4o"
fallback_providers = ["gemini"]

[agents.tutor]
enabled = true
provider = "openai"
model = "gpt-4o"
system_prompt = "/opt/openfang/prompts/tutor.txt"
temperature = 0.7
max_tokens = 2000

[agents.researcher]
enabled = true
provider = "openai"
model = "gpt-4o"
system_prompt = "/opt/openfang/prompts/researcher.txt"
temperature = 0.5
max_tokens = 4000

[agents.analyst]
enabled = true
provider = "openai"
model = "gpt-4o"
system_prompt = "/opt/openfang/prompts/analyst.txt"
temperature = 0.3
max_tokens = 3000

[memory]
enabled = true
max_history_per_session = 50
embedding_batch_size = 10
retention_days = 365
auto_summarize = true
summarize_after_messages = 20

[security]
api_key_required = false
allowed_origins = ["http://localhost:3000", "https://aeroeduvison.com"]
max_request_size_mb = 10
rate_limit_per_ip = 100
enable_input_filtering = true
enable_output_filtering = true
blocked_topics = ["violence", "self-harm", "illegal"]

[monitoring]
enabled = true
metrics_endpoint = "/metrics"
health_endpoint = "/health"
```

### Bước 1.2.3: Tạo file system prompts

```bash
sudo mkdir -p /opt/openfang/prompts
sudo chown openfang:openfang /opt/openfang/prompts

# Tạo prompt cho Tutor agent
nano /opt/openfang/prompts/tutor.txt
```

**Nội dung tutor.txt:**

```
You are an AI Tutor for Aeroeduvison, an educational platform.

YOUR ROLE:
- Guide students using the Socratic method
- NEVER give direct answers immediately
- Ask probing questions to help students discover answers themselves
- Break down complex problems into smaller, manageable steps
- Provide hints and scaffolding, not solutions

TEACHING STYLE:
- Be patient and encouraging
- Adapt explanations to the student's level
- Use analogies and real-world examples
- Check understanding before moving forward

RESPONSE FORMAT:
- Start by understanding what the student knows
- Ask guiding questions
- Provide hints when student is stuck
- Celebrate progress and effort

GUARDRAILS:
- Do not solve homework directly
- Do not provide answers to test/exam questions
- Encourage critical thinking
- If unsure, admit it and suggest resources
```

### Bước 1.2.4: Test LLM connection

```bash
# Test OpenAI connection
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello, test connection"}]
  }'

# Test với tutor agent
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tutor",
    "messages": [{"role": "user", "content": "Giúp tôi hiểu về đạo hàm"}]
  }'
```

### ⚠️ Troubleshooting Task 1.2:

| Lỗi | Kiểm tra | Giải pháp |
|-----|----------|-----------|
| `Invalid API key` | Log file | Kiểm tra API key trong config |
| `Rate limit exceeded` | `curl -i ...` xem headers | Giảm rate_limit_rpm |
| `Model not found` | Provider config | Kiểm tra tên model đúng |
| `Connection timeout` | Network | Kiểm tra firewall, proxy |

---

## 4. TASK 1.3: SETUP DATABASE

### Bước 1.3.1: Cài đặt PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib libpq-dev
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Bước 1.3.2: Tạo database và user

```bash
sudo -u postgres psql
```

**Trong PostgreSQL prompt:**

```sql
-- Tạo database
CREATE DATABASE openfang_memory
    WITH ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Tạo user
CREATE USER openfang_user WITH
    PASSWORD 'YourSecurePassword123!'
    CREATEDB
    NOSUPERUSER
    NOCREATEROLE;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE openfang_memory TO openfang_user;

-- Connect to database
\c openfang_memory

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO openfang_user;

-- Tạo extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Exit
\q
```

### Bước 1.3.3: Cấu hình PostgreSQL cho remote access (nếu cần)

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
# listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Thêm dòng:
host    openfang_memory    openfang_user    127.0.0.1/32    scram-sha-256

sudo systemctl restart postgresql
```

### Bước 1.3.4: Chạy database migrations

```bash
cd /opt/openfang
./target/release/openfang migrations run
```

### Bước 1.3.5: Verify database

```bash
sudo -u postgres psql -d openfang_memory
\dt  # List tables
\q
```

### ⚠️ Troubleshooting Task 1.3:

| Lỗi | Kiểm tra | Giải pháp |
|-----|----------|-----------|
| `role does not exist` | `psql -c "\du"` | Tạo lại user |
| `database does not exist` | `psql -c "\l"` | Tạo lại database |
| `extension pgvector not found` | `psql -c "\dx"` | `CREATE EXTENSION vector;` |
| `connection refused` | `sudo systemctl status postgresql` | Start PostgreSQL |

---

## 5. TASK 1.4: SETUP VECTOR STORE

### Option A: pgvector (Recommended)

### Bước 1.4.1: Cài đặt pgvector extension

```bash
sudo apt install -y postgresql-server-dev-all
cd /tmp
git clone --branch v0.6.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Verify
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Bước 1.4.2: Tạo bảng embeddings

```bash
sudo -u postgres psql -d openfang_memory
```

```sql
-- Tạo bảng embeddings
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo index cho fast similarity search
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx 
ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Tạo index cho metadata queries
CREATE INDEX IF NOT EXISTS embeddings_metadata_idx ON embeddings USING GIN (metadata);
CREATE INDEX IF NOT EXISTS embeddings_created_at_idx ON embeddings (created_at);

-- Tạo function cho similarity search
CREATE OR REPLACE FUNCTION search_embeddings(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 10,
    filter_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.content,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    WHERE filter_metadata IS NULL OR e.metadata @> filter_metadata
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

\q
```

### Option B: Qdrant (Separate vector database)

```bash
# Cài đặt Qdrant với Docker
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# Tạo collection
curl -X PUT http://localhost:6333/collections/aeroeduvison_knowledge \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

### Bước 1.4.3: Test vector search

```bash
# Test insert (pgvector)
sudo -u postgres psql -d openfang_memory -c "
INSERT INTO embeddings (content, embedding, metadata)
VALUES (
    'Test content for vector search',
    (SELECT array_agg(random())::vector FROM generate_series(1, 1536)),
    '{\"source\": \"test\"}'::jsonb
);
"

# Test search
sudo -u postgres psql -d openfang_memory -c "
SELECT * FROM search_embeddings(
    (SELECT array_agg(random())::vector FROM generate_series(1, 1536))::vector(1536),
    5
);
"
```

### ⚠️ Troubleshooting Task 1.4:

| Lỗi | Kiểm tra | Giải pháp |
|-----|----------|-----------|
| `extension vector not found` | `psql -c "\dx"` | Cài đặt pgvector |
| `dimension mismatch` | Embedding config | Kiểm tra dimensions (1536) |
| `index creation failed` | RAM available | Tăng RAM hoặc giảm hnsw_m |
| `Docker not running` | `docker ps` | `docker start qdrant` |

---

## 6. TASK 1.5: TẠO API WRAPPER TRONG NEXT.JS

### Bước 1.5.1: Cài đặt dependencies

```bash
cd /path/to/aeroeduvison
npm install axios zod
```

### Bước 1.5.2: Tạo environment variables

```bash
# Tạo file .env.local
nano .env.local
```

**Nội dung .env.local:**

```bash
OPENFANG_API_URL=http://localhost:8080
OPENFANG_API_KEY=
OPENFANG_TIMEOUT_MS=30000
OPENFANG_MAX_RETRIES=3
```

### Bước 1.5.3: Tạo OpenFang client library

```bash
mkdir -p src/lib
nano src/lib/openfang.ts
```

**Nội dung src/lib/openfang.ts:**

```typescript
// src/lib/openfang.ts

import { z } from 'zod';

export interface OpenFangConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export class OpenFangError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenFangError';
  }
}

export class OpenFangRateLimitError extends OpenFangError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429, 'rate_limit');
    this.name = 'OpenFangRateLimitError';
  }
}

export class OpenFangTimeoutError extends OpenFangError {
  constructor(message: string) {
    super(message, 408, 'timeout');
    this.name = 'OpenFangTimeoutError';
  }
}

export class OpenFangClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: OpenFangConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;

        if (retryCount < this.maxRetries) {
          console.log(`Rate limited, retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
          return this.fetchWithRetry<T>(url, options, retryCount + 1);
        }

        throw new OpenFangRateLimitError('Rate limit exceeded', parseInt(retryAfter || '60'));
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new OpenFangError(
          `HTTP ${response.status}: ${errorBody}`,
          response.status
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenFangTimeoutError('Request timeout');
      }

      if (retryCount < this.maxRetries && error instanceof TypeError) {
        console.log(`Network error, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(Math.pow(2, retryCount) * 1000);
        return this.fetchWithRetry<T>(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  async chat(
    message: string,
    options: {
      agent?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<ChatResponse> {
    const endpoint = `${this.baseUrl}/v1/chat/completions`;

    const request: ChatRequest = {
      model: options.agent || 'tutor',
      messages: [{ role: 'user', content: message }],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: options.stream || false,
    };

    return this.fetchWithRetry<ChatResponse>(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
  }

  async chatWithHistory(
    messages: ChatMessage[],
    options: {
      agent?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ChatResponse> {
    const endpoint = `${this.baseUrl}/v1/chat/completions`;

    const request: ChatRequest = {
      model: options.agent || 'tutor',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    };

    return this.fetchWithRetry<ChatResponse>(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
  }

  async search(
    query: string,
    options: {
      limit?: number;
      filters?: Record<string, any>;
    } = {}
  ): Promise<SearchResponse> {
    const endpoint = `${this.baseUrl}/v1/search`;

    const request: SearchRequest = {
      query,
      limit: options.limit || 10,
      filters: options.filters,
    };

    return this.fetchWithRetry<SearchResponse>(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
  }

  async health(): Promise<{ status: string; uptime: number }> {
    const endpoint = `${this.baseUrl}/health`;
    return this.fetchWithRetry(endpoint, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }
}

export const openFangClient = new OpenFangClient({
  baseUrl: process.env.OPENFANG_API_URL || 'http://localhost:8080',
  apiKey: process.env.OPENFANG_API_KEY,
  timeoutMs: parseInt(process.env.OPENFANG_TIMEOUT_MS || '30000'),
  maxRetries: parseInt(process.env.OPENFANG_MAX_RETRIES || '3'),
});
```

### Bước 1.5.4: Tạo Next.js API Route

```bash
mkdir -p src/app/api/openfang
nano src/app/api/openfang/route.ts
```

**Nội dung src/app/api/openfang/route.ts:**

```typescript
// src/app/api/openfang/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { OpenFangClient, OpenFangError } from '@/lib/openfang';

const client = new OpenFangClient({
  baseUrl: process.env.OPENFANG_API_URL || 'http://localhost:8080',
  apiKey: process.env.OPENFANG_API_KEY,
  timeoutMs: parseInt(process.env.OPENFANG_TIMEOUT_MS || '30000'),
  maxRetries: parseInt(process.env.OPENFANG_MAX_RETRIES || '3'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.message && !body.messages) {
      return NextResponse.json(
        { error: 'Missing message or messages field' },
        { status: 400 }
      );
    }

    let result;

    if (body.messages) {
      result = await client.chatWithHistory(body.messages, {
        agent: body.agent,
        temperature: body.temperature,
        maxTokens: body.max_tokens,
      });
    } else {
      result = await client.chat(body.message, {
        agent: body.agent,
        temperature: body.temperature,
        maxTokens: body.max_tokens,
        stream: body.stream,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('OpenFang API error:', error);

    if (error instanceof OpenFangError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to communicate with OpenFang', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const health = await client.health();
    return NextResponse.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 503 }
    );
  }
}
```

### Bước 1.5.5: Tạo React Hook cho chat (optional)

```bash
nano src/hooks/useOpenFangChat.ts
```

**Nội dung src/hooks/useOpenFangChat.ts:**

```typescript
// src/hooks/useOpenFangChat.ts

import { useState, useCallback } from 'react';
import { ChatMessage, ChatResponse } from '@/lib/openfang';

interface UseOpenFangChatOptions {
  agent?: string;
  initialMessages?: ChatMessage[];
  onError?: (error: Error) => void;
}

export function useOpenFangChat(options: UseOpenFangChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    options.initialMessages || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setError(null);

      const userMessage: ChatMessage = { role: 'user', content };
      setMessages(prev => [...prev, userMessage]);

      try {
        const response = await fetch('/api/openfang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            agent: options.agent,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send message');
        }

        const data: ChatResponse = await response.json();
        const assistantMessage = data.choices[0]?.message;

        if (assistantMessage) {
          setMessages(prev => [...prev, assistantMessage]);
        }

        return assistantMessage;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options.agent, options.onError]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
```

### ⚠️ Troubleshooting Task 1.5:

| Lỗi | Kiểm tra | Giải pháp |
|-----|----------|-----------|
| `Module not found` | Import paths | Kiểm tra đường dẫn |
| `CORS error` | Browser console | Config allowed_origins |
| `404 /api/openfang` | Next.js routing | Kiểm tra App Router |
| `Environment variables not loaded` | `.env.local` | Restart dev server |

---

## 7. TASK 1.6: TEST END-TO-END

### Bước 1.6.1: Tạo test script

```bash
nano /opt/openfang/test-e2e.sh
```

**Nội dung test-e2e.sh:**

```bash
#!/bin/bash

OPENFANG_URL="${OPENFANG_URL:-http://localhost:8080}"
NEXTJS_URL="${NEXTJS_URL:-http://localhost:3000}"

echo "=========================================="
echo "Open Fang E2E Test"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" ${OPENFANG_URL}/health)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)

if [ "$HEALTH_CODE" = "200" ]; then
    echo "✅ Health Check PASSED"
else
    echo "❌ Health Check FAILED (HTTP $HEALTH_CODE)"
    exit 1
fi

# Test 2: Chat Completion
echo "Test 2: Chat Completion..."
CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${OPENFANG_URL}/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"tutor","messages":[{"role":"user","content":"Xin chào"}]}')
CHAT_CODE=$(echo "$CHAT_RESPONSE" | tail -n 1)

if [ "$CHAT_CODE" = "200" ]; then
    echo "✅ Chat Completion PASSED"
else
    echo "❌ Chat Completion FAILED (HTTP $CHAT_CODE)"
    exit 1
fi

# Test 3: Next.js API Route
echo "Test 3: Next.js API Route..."
NEXTJS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${NEXTJS_URL}/api/openfang \
  -H "Content-Type: application/json" \
  -d '{"message":"Test từ Next.js","agent":"tutor"}')
NEXTJS_CODE=$(echo "$NEXTJS_RESPONSE" | tail -n 1)

if [ "$NEXTJS_CODE" = "200" ]; then
    echo "✅ Next.js API Route PASSED"
else
    echo "❌ Next.js API Route FAILED (HTTP $NEXTJS_CODE)"
    exit 1
fi

echo ""
echo "=========================================="
echo "All Tests Completed!"
echo "=========================================="
```

### Bước 1.6.2: Chạy test

```bash
chmod +x /opt/openfang/test-e2e.sh
cd /opt/openfang
./test-e2e.sh
```

### ⚠️ Troubleshooting Task 1.6:

| Lỗi | Kiểm tra | Giải pháp |
|-----|----------|-----------|
| `Connection refused` | `curl http://localhost:8080/health` | Kiểm tra daemon chạy |
| `Timeout` | Network latency | Tăng timeout |
| `404 Not Found` | Endpoint paths | Kiểm tra API routes |

---

## 8. TASK 1.7: ERROR HANDLING & LOGGING

### Bước 1.7.1: Config logging

```bash
nano /opt/openfang/logging.toml
```

**Nội dung logging.toml:**

```toml
[logging]
level = "info"
file = "/var/log/openfang/openfang.log"
max_size_mb = 100
retention_days = 30
format = "json"
include_timestamp = true
include_caller = true

[logging.rotation]
enabled = true
max_files = 10
compress = true
```

### Bước 1.7.2: Tạo log viewer script

```bash
nano /opt/openfang/view-logs.sh
```

**Nội dung view-logs.sh:**

```bash
#!/bin/bash

LOG_FILE="/var/log/openfang/openfang.log"
LINES="${1:-100}"

echo "=========================================="
echo "Open Fang Logs (last $LINES lines)"
echo "=========================================="

if [ -f "$LOG_FILE" ]; then
    tail -n $LINES "$LOG_FILE" | jq '.' 2>/dev/null || tail -n $LINES "$LOG_FILE"
else
    sudo journalctl -u openfang -n $LINES --no-pager
fi
```

### Bước 1.7.3: Setup logrotate

```bash
sudo nano /etc/logrotate.d/openfang
```

**Nội dung:**

```
/var/log/openfang/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 openfang openfang
    postrotate
        systemctl reload openfang 2>/dev/null || true
    endscript
}
```

### ⚠️ Troubleshooting Task 1.7:

| Lỗi | Kiểm tra | Giải pháp |
|-----|----------|-----------|
| `Log file not created` | Permissions | `chown openfang:openfang /var/log/openfang` |
| `Disk full` | `df -h` | Setup log rotation |
| `Logs not rotating` | `logrotate -d` | Debug config |

---

## 9. CHECKLIST HOÀN THÀNH

```
[ ] 1.1 Open Fang daemon cài đặt và chạy
    [ ] Rust installed
    [ ] Build thành công
    [ ] Systemd service running
    [ ] Health check trả về 200

[ ] 1.2 LLM Providers config
    [ ] OpenAI API key valid
    [ ] Gemini API key valid
    [ ] Test chat thành công
    [ ] Rate limiting config đúng

[ ] 1.3 Database setup
    [ ] PostgreSQL running
    [ ] Database created
    [ ] User created với đúng permissions
    [ ] Migrations chạy thành công

[ ] 1.4 Vector store setup
    [ ] pgvector extension installed
    [ ] Embeddings table created
    [ ] Index created
    [ ] Test search thành công

[ ] 1.5 Next.js API wrapper
    [ ] Client library created
    [ ] API route working
    [ ] Error handling implemented
    [ ] Retry logic working

[ ] 1.6 E2E Test
    [ ] Health check passed
    [ ] Chat completion passed
    [ ] Next.js route passed
    [ ] Error handling passed

[ ] 1.7 Logging & Monitoring
    [ ] Log file created
    [ ] Log rotation configured
    [ ] Error alert script ready
    [ ] Documentation written
```

---

## 10. TIMELINE TỔNG KẾT

| Task | Thời gian | Ngày bắt đầu | Ngày kết thúc |
|------|-----------|--------------|---------------|
| 1.1 Daemon setup | 0.5 ngày | Ngày 1 | Ngày 1 |
| 1.2 LLM config | 0.5 ngày | Ngày 1 | Ngày 1 |
| 1.3 Database | 1.5 ngày | Ngày 2 | Ngày 3 |
| 1.4 Vector store | 1.5 ngày | Ngày 4 | Ngày 5 |
| 1.5 Next.js wrapper | 2.5 ngày | Ngày 6 | Ngày 8 |
| 1.6 E2E Test | 1 ngày | Ngày 9 | Ngày 9 |
| 1.7 Logging | 1.5 ngày | Ngày 10 | Ngày 11 |
| **Buffer** | **3 ngày** | Ngày 12 | Ngày 14 |
| **TỔNG** | **14 ngày** | | |

---

**Tài liệu này thuộc dự án Aeroeduvison - Open Fang Integration**

**Người tạo:** Nô tài 🤖

**Ngày tạo:** 2026-03-06