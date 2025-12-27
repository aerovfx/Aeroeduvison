# 🚀 Deploy /api/check-env Endpoint lên Production

## ❌ Vấn đề

Endpoint `/api/check-env` trả về **404** trên production (`https://inphysic.com/api/check-env`)

**Nguyên nhân:** File `app/api/check-env/route.ts` được tạo **SAU** các lần deploy trước đó, nên chưa có trong production build.

## ✅ Giải pháp: Deploy lại

### Bước 1: Verify file tồn tại

```bash
# Check file có tồn tại
ls -la app/api/check-env/route.ts

# Check nội dung
cat app/api/check-env/route.ts
```

### Bước 2: Deploy lại lên Cloud Run

```bash
# Chạy deploy script
./deploy-local-amd64.sh
```

**Hoặc nếu muốn deploy nhanh hơn (skip build nếu không có thay đổi):**

```bash
# Chỉ build lại nếu có thay đổi
./deploy-local-amd64.sh
```

### Bước 3: Verify sau khi deploy

```bash
# Wait vài giây cho service start
sleep 10

# Test endpoint
curl https://inphysic.com/api/check-env

# Hoặc dùng script
./check-production-env.sh
```

## 📋 Expected Response sau khi deploy

```json
{
  "NEXTAUTH_URL": "https://inphysic.com",
  "NODE_ENV": "production",
  "K_SERVICE": "lmsmath-app",
  "VERCEL_URL": null,
  "detectedBaseUrl": "https://inphysic.com",
  "host": "0.0.0.0",
  "port": "3000",
  "timestamp": "2025-11-25T09:14:15.123Z"
}
```

## 🔍 Debug nếu vẫn 404

### 1. Check file có trong Docker build không

```bash
# Check .dockerignore có exclude app/api/check-env không
grep -r "check-env" .dockerignore || echo "✅ Not in .dockerignore"

# Check file có trong repo
git ls-files app/api/check-env/route.ts
```

### 2. Check Cloud Run logs

```bash
# Xem logs gần nhất
gcloud run logs read lmsmath-app \
  --region asia-east1 \
  --limit 50 \
  --filter "check-env OR 404"
```

### 3. Verify routing trong Next.js

Endpoint phải nằm tại: `app/api/check-env/route.ts`

Structure:
```
app/
  api/
    check-env/
      route.ts  ← Phải có file này
```

## ⚡ Quick Deploy Command

```bash
# Full deploy (recommended)
./deploy-local-amd64.sh

# Sau khi deploy xong, test ngay:
curl -s https://inphysic.com/api/check-env | jq '.'
```

## 📝 Notes

- ⏱️ Deploy time: ~5-10 phút
- 🔄 Service sẽ restart sau khi deploy
- ✅ Health check sẽ auto-pass nếu deploy thành công
- 📊 Check logs nếu có vấn đề

