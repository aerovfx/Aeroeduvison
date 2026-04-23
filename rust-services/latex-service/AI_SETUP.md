# AI exam generator — cấu hình Anthropic Claude

Endpoint: `POST /api/latex-projects/ai-generate`
Handler: `src/handlers/ai_generate.rs`

## ⚠️ Bảo mật API key

**KHÔNG BAO GIỜ**:
- Hardcode key trong source code
- Commit key vào git (kể cả .env, dotenv-local, v.v. — chúng đã được .gitignore)
- Dán key vào Slack / Discord / chat support / issue tracker
- Để key lộ trong log / stdout

**NÊN**:
- Lưu key dưới dạng Google Secret Manager (xem phần Cloud Run bên dưới)
- Rotate key 90 ngày/lần tại https://console.anthropic.com/settings/keys
- Theo dõi usage ở https://console.anthropic.com/settings/usage và bật alert khi chạm ngưỡng

Nếu key bị lộ (pasted vào chat, commit nhầm, CI log), **revoke ngay lập tức** và tạo key mới.

## Chạy local

1. Copy `.env.example` → `.env`
2. Điền `ANTHROPIC_API_KEY=sk-ant-api03-...` (key thật)
3. Chọn model ở `ANTHROPIC_MODEL` (mặc định `claude-sonnet-4-6`)
4. `cargo run`
5. Test bằng curl:
   ```bash
   curl -X POST http://localhost:8109/api/latex-projects/ai-generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -d '{
       "subject": "Vật lý",
       "grade": 11,
       "topics": ["Dòng điện trong vật dẫn"],
       "duration": 45,
       "format": "bgd-2025",
       "difficulty": { "easy": 6, "medium": 6, "hard": 3, "veryHard": 1 },
       "schoolName": "TRƯỜNG THPT PHƯỚC BỬU",
       "includeAnswerKey": false
     }'
   ```

## Triển khai Cloud Run (production)

Dùng Google Secret Manager, không set trực tiếp qua `--set-env-vars`:

```bash
# 1. Tạo secret (1 lần)
echo -n "sk-ant-api03-YOUR-REAL-KEY" | \
  gcloud secrets create anthropic-api-key --data-file=-

# 2. Cấp quyền cho service account (Cloud Run mặc định dùng compute SA nếu không tạo SA riêng)
PROJECT_NUM=$(gcloud projects describe "$(gcloud config get-value project)" --format='value(projectNumber)')
SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"
for SECRET in pixiai-database-url pixiai-jwt-secret anthropic-api-key; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor"
done

# 3. Cập nhật service để inject secret
gcloud run services update pixiai-latex \
  --region=asia-southeast1 \
  --set-secrets=ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --set-env-vars=ANTHROPIC_MODEL=claude-sonnet-4-6
```

## Cập nhật / xoay key

```bash
# Tạo version mới của secret
echo -n "sk-ant-api03-NEW-KEY" | \
  gcloud secrets versions add anthropic-api-key --data-file=-

# Service đang chạy sẽ tự pick version ':latest' khi khởi động pod mới.
# Để áp dụng ngay, deploy lại (không downtime):
gcloud run services update pixiai-latex --region=asia-southeast1
```

## Giá tham khảo (tháng 4/2026)

| Model                         | Input   | Output  | Chi phí ước 1 đề |
|-------------------------------|---------|---------|------------------|
| claude-haiku-4-5-20251001     | $1/1M   | $5/1M   | ~$0.01           |
| claude-sonnet-4-6             | $3/1M   | $15/1M  | ~$0.05           |
| claude-opus-4-6               | $15/1M  | $75/1M  | ~$0.25           |

(Một đề chuẩn Bộ GD&ĐT cần ~1500 token input + 3500 token output.)

## Fallback

Nếu `ANTHROPIC_API_KEY` chưa cấu hình → endpoint trả **503 Service Unavailable**.
Frontend tự động fallback sang generator cục bộ (`latex-ai.service.ts → buildExamLatexLocally`)
và toast báo "Backend AI chưa sẵn sàng — đã sinh đề mẫu cục bộ".
