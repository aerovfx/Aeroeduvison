# AeroEdu Embedding Service

FastAPI + sentence-transformers + FAISS service cho recommendation pipeline
(Phase 2 của reco system — xem `docs/architecture/recommendation.md`).

Cung cấp embedding similarity search cho đề thi, bài viết, khoá học —
plug vào `lib/reco/stages/sources.ts` thành `EmbeddingSource`.

## Endpoints

| Method | Path | Mô tả |
|---|---|---|
| GET  | `/health`         | Trạng thái service + dim + index size |
| POST | `/embed`          | Encode `texts[]` → embeddings (no indexing) |
| POST | `/index/upsert`   | Thêm items vào FAISS index (id + text + metadata) |
| POST | `/similar`        | Tìm top-K items tương tự `query` |

## Local dev

```bash
cd embedding-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

Test:
```bash
# Embed 2 đề thi
curl -X POST localhost:8080/index/upsert -H "Content-Type: application/json" -d '{
  "items": [
    {"id": "e1", "text": "Hàm số bậc 2 lớp 10", "metadata": {"subject": "Toán", "grade": "10"}},
    {"id": "e2", "text": "Phương trình bậc 3 lớp 11", "metadata": {"subject": "Toán", "grade": "11"}}
  ]
}'

# Tìm tương tự
curl -X POST localhost:8080/similar -H "Content-Type: application/json" -d '{
  "query": "đa thức bậc 2 lớp 10",
  "k": 5
}'
```

## Deploy lên Cloud Run

```bash
# 1. Build & push image
gcloud builds submit --tag \
  asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aero/embed:latest

# 2. Deploy service (min-instances=1 để tránh cold-start ~5s)
gcloud run deploy aero-embed \
  --image asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aero/embed:latest \
  --region asia-southeast1 \
  --memory 4Gi --cpu 2 \
  --min-instances 1 --max-instances 3 \
  --port 8080 \
  --no-allow-unauthenticated

# 3. Cấp quyền cho main service (pixiai) gọi aero-embed
gcloud run services add-iam-policy-binding aero-embed \
  --member="serviceAccount:pixiai-runtime@..." \
  --role="roles/run.invoker" --region asia-southeast1
```

Sau đó set env `EMBED_URL=https://aero-embed-...run.app` vào pixiai
Cloud Run, gọi từ server.cjs khi cần `EmbeddingSource`.

## Cron batch embedding

```bash
# Tạo Cloud Run Job để embed mọi đề mới hằng đêm
gcloud run jobs create aero-embed-batch \
  --image asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aero/embed:latest \
  --command python --args batch_embed.py \
  --set-env-vars "DATABASE_URL=$DATABASE_URL,EMBED_URL=https://aero-embed-...run.app" \
  --region asia-southeast1

# Schedule chạy 2am mỗi đêm
gcloud scheduler jobs create http aero-embed-nightly \
  --schedule "0 2 * * *" \
  --uri "https://...googleapis.com/.../jobs/aero-embed-batch:run" \
  --http-method POST --oauth-service-account-email ...
```

## Model lựa chọn

| Model | Dim | RAM | Lang | Note |
|---|---|---|---|---|
| `keepitreal/vietnamese-sbert` (default) | 768 | ~400MB | VN | Best for VN content |
| `paraphrase-multilingual-MiniLM-L12-v2` | 384 | ~200MB | 50+ | Faster, nhỏ hơn |
| `BAAI/bge-m3` | 1024 | ~2GB | 100+ | Top quality, chậm hơn |

Override qua env `MODEL_NAME` khi build/deploy.

## Phase 3 — Storage

Hiện tại index lưu local file. Cho production multi-instance:
- Mount Cloud Storage volume (FUSE)
- Hoặc migrate sang **Vertex AI Matching Engine** (managed FAISS, scale tới billion vectors)
- Hoặc **pgvector** trong PostgreSQL (cùng DB với app, giảm hop)

## Wire vào aeroedu (frontend)

Trong `aeroedu-vite/src/lib/reco/stages/sources.ts`:

```typescript
export function makeEmbeddingSource(query: string, k = 20): Source<TeacherExam> {
  return {
    name: 'embedding',
    fetch: async () => {
      const res = await fetch('/api/reco/similar-exams', {
        method: 'POST',
        body: JSON.stringify({ query, k }),
      })
      return (await res.json()).results
    },
  }
}
```

Backend `/api/reco/similar-exams` trong `server.cjs` proxy tới embedding
service. Cache 1 phút trong Redis nếu cần.
