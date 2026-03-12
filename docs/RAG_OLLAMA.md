# RAG với Ollama (PDF, TXT, MD)

Hệ thống **RAG (Retrieval-Augmented Generation)** cho phép model (Qwen, Llama 3, …) chạy qua Ollama truy xuất tri thức từ tài liệu riêng trước khi sinh câu trả lời. **Không cần fine-tune** model.

## Pipeline

```
Documents (PDF / TXT / MD)
        │
        ▼
Text Extraction (lib/rag/document-loaders)
        │
        ▼
Chunking (lib/rag/chunker, 500 chars, overlap 50)
        │
        ▼
Embedding (lib/embeddings)
        │
        ▼
Vector DB (Qdrant, collection rag_documents)
        │
        ▼
User Query → Semantic Search → Context Retrieval
        │
        ▼
LLM (Ollama)
        │
        ▼
Final Answer
```

## Cài đặt

1. **Ollama** chạy local, ví dụ:
   ```bash
   ollama run qwen2.5
   ```

2. **Qdrant** (vector DB): set `QDRANT_URL`, `QDRANT_RAG_COLLECTION=rag_documents` (mặc định). Collection RAG tách với collection chính (`QDRANT_COLLECTION`).

3. **Embedding**: dùng service có sẵn (OpenAI / OpenRouter). Set `EMBEDDING_MODEL` hoặc `OPENAI_API_KEY`.

4. **PDF**: cần cài `pdf-parse`:
   ```bash
   npm install pdf-parse
   ```

5. **Embedding (khi dùng RAG/training không có OpenAI key)**: Ollama cần model embedding. Chạy một lần:
   ```bash
   ollama pull nomic-embed-text
   ```
   Nếu dùng model khác, set `EMBEDDING_MODEL=ollama/<tên-model>` hoặc `EMBEDDING_OLLAMA_MODEL=ollama/<tên-model>`.

## API

### POST /api/rag/ingest

Upload **file** (PDF, TXT, MD) hoặc **URL** (GitHub, Markdown) → chunk → embed → vector DB.

- **Content-Type**: `multipart/form-data` (file hoặc url) hoặc `application/json` (url/urls).
- **Body**:
  - Form: field `file` **hoặc** `url` (một URL) hoặc `urls` (JSON array).
  - JSON: `{ "url": "..." }` hoặc `{ "urls": ["...", "..."] }`.
- **Auth**: session bắt buộc.

**GitHub**: URL dạng `https://github.com/owner/repo/blob/branch/path/file.md` tự động chuyển sang raw (`https://raw.githubusercontent.com/owner/repo/branch/path/file.md`) để tải nội dung.

Ví dụ file:

```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Cookie: ..." \
  -F "file=@data/guide.md"
```

Ví dụ URL (ví dụ tài liệu [Aero-HowtoLLMs Module 07](https://github.com/aerovfx/Aero-HowtoLLMs/blob/main/docs/07_fine_tune_pretrained_models/index.md)):

```bash
curl -X POST http://localhost:3000/api/rag/ingest \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"url": "https://github.com/aerovfx/Aero-HowtoLLMs/blob/main/docs/07_fine_tune_pretrained_models/index.md"}'
```

### POST /api/rag/ask

Hỏi đáp dựa trên tài liệu đã ingest.

- **Body (JSON)**: `query` hoặc `question`, tùy chọn `model`, `k` (số đoạn lấy, mặc định 3)
- **Auth**: session bắt buộc

Ví dụ:

```bash
curl -X POST http://localhost:3000/api/rag/ask \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"query": "Speculative decoding là gì?", "k": 3}'
```

## Tối ưu

- **Chunk size**: 300–800 ký tự (mặc định 500).
- **Top-k**: 3 hoặc 5 đoạn.
- **Reranking** (nâng cao): có thể thêm bước rerank sau retrieval để tăng độ chính xác.

## So sánh Fine-tune vs RAG

| Phương pháp | Ưu điểm | Nhược điểm |
|-------------|--------|------------|
| Fine-tune   | Học kiến thức vào model | Tốn GPU, cập nhật chậm |
| RAG         | Cập nhật tri thức nhanh, không cần train | Phụ thuộc retrieval |

Production thường dùng **RAG + prompt tuning** (ví dụ system prompt + few-shot trên admin/models).

## Kiến trúc nâng cao (tùy chọn)

Có thể mở rộng pipeline:

- Query rewriting (viết lại câu hỏi)
- Retriever → Reranker → Context compression → LLM (Ollama) → Answer

---

## RAG Agent (OpenFang-style)

Pipeline agent tích hợp trong **Admin → Quản lý Model AI** (/admin/models):

```
User Question (+ optional file)
        │
        ▼
Index Tool (nếu có file mới) → Vector DB
        │
        ▼
Planner → Search Tool (Vector DB / Qdrant)
        │
        ▼
Summarize Tool (nếu context dài, Ollama)
        │
        ▼
Answer Agent (Ollama) → Answer
```

### Tools

| Tool | Chức năng |
|------|-----------|
| **Search** | similarity_search trong Qdrant (collection rag_documents), trả về top-k chunks |
| **Index** | Load PDF/TXT/MD → chunk → embed → lưu vector DB |
| **Summarize** | Gọi Ollama tóm tắt đoạn văn dài trước khi đưa vào Answer |

### API

- **POST /api/rag/agent**  
  Body: `{ question }` hoặc formData: `question` + optional `file`.  
  Trả về: `answer`, `steps` (search, summarize?, answer), `contextChunks`, `indexResult` (nếu có file).

### UI

Trên trang **Admin → Quản lý Model AI**, mở khối **"RAG Agent (OpenFang-style)"**: nhập câu hỏi, tùy chọn chọn file để index trước, bấm **Hoi Agent**. Kết quả hiển thị từng bước (search, summarize, answer) và câu trả lời.

### Nâng cấp có thể

- **Folder watcher**: tự quét thư mục, phát hiện file mới → gọi Index Tool (cần service nền hoặc cron).
- **Planner LLM**: dùng Ollama để quyết định cần index / search / summarize thay vì rule cố định.
- **Multi-step reasoning**: Planner gọi nhiều bước (retrieve → evaluate → search again → answer).
