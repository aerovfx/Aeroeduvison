# 🔧 FIX: Localhost Baked into Client Bundle

## ❌ Vấn đề

Console log vẫn hiển thị localhost URL:
```
Login result: {error: null, status: 200, ok: true, url: 'http://localhost:3000/dashboard'}
```

**Nguyên nhân:** 
1. `next.config.js` có `env.NEXTAUTH_URL = process.env.NEXTAUTH_URL`
2. `Dockerfile.production` set `NEXT_PUBLIC_NEXTAUTH_URL=${NEXTAUTH_URL}`

➡️ **Next.js "bake" giá trị này vào client bundle tại compile time!**

Nếu build trên local hoặc với `NEXTAUTH_URL=http://localhost:3000`, giá trị đó sẽ được hard-code vào JavaScript bundle và ship lên production! 😱

---

## ✅ Giải pháp đã áp dụng

### 1. **Xóa `env.NEXTAUTH_URL` từ next.config.js**

```diff
- env: {
-   NEXTAUTH_URL: process.env.NEXTAUTH_URL,
- },
+ env: {
+   // Leave empty - let client auto-detect from window.location.origin
+ },
```

### 2. **Xóa `NEXT_PUBLIC_NEXTAUTH_URL` từ Dockerfile.production**

```diff
  ARG NEXTAUTH_URL
  ENV NEXTAUTH_URL=${NEXTAUTH_URL}
- ENV NEXT_PUBLIC_NEXTAUTH_URL=${NEXTAUTH_URL}
```

### 3. **Update deploy script**

```diff
- --set-env-vars "NEXTAUTH_URL=${NEXTAUTH_URL},NEXT_PUBLIC_NEXTAUTH_URL=${NEXTAUTH_URL}"
+ --set-env-vars "NEXTAUTH_URL=${NEXTAUTH_URL}"
```

---

## 🎯 Kết quả

### Client-side (Browser):
- ✅ Tự động detect URL từ `window.location.origin`
- ✅ `session-provider.tsx` đã handle đúng
- ✅ `login-form.tsx` dùng `window.location.origin`

### Server-side (Node.js):
- ✅ Đọc từ `process.env.NEXTAUTH_URL` 
- ✅ `lib/auth.ts` có fallback logic đúng
- ✅ Cloud Run env vars được set qua `gcloud run deploy --set-env-vars`

---

## 📋 Deploy lại để fix hoàn toàn

```bash
cd /Users/vietchung/lmsmath

# Option 1: Dùng script (recommended)
./deploy.sh

# Option 2: Chạy từng lệnh
npm run build
docker build --build-arg NEXTAUTH_URL=https://inphysic.com -f Dockerfile.production -t gcr.io/inphysic-442905/inphysic:latest .
docker push gcr.io/inphysic-442905/inphysic:latest
gcloud run deploy inphysic --image gcr.io/inphysic-442905/inphysic:latest --region asia-southeast1 --set-env-vars "NEXTAUTH_URL=https://inphysic.com"
```

---

## ✨ Console log sau deploy mới:

```
🔐 [LOGIN] Attempting login...
📊 [LOGIN] Login result: {error: null, status: 200, ok: true, url: 'https://inphysic.com/dashboard'}  ✅
✅ [LOGIN] Login successful!
🔄 [LOGIN] Redirecting to: https://inphysic.com/dashboard
📍 [LOGIN] Base URL: https://inphysic.com
```

**Perfect! 🚀 No more localhost!**

---

## 🧠 Bài học

### ⚠️ NGUY HIỂM: Biến `NEXT_PUBLIC_*` được bake vào client bundle
- Giá trị tại **compile time** (khi chạy `npm run build`)
- Không thay đổi được tại runtime
- Nếu build với localhost → production cũng có localhost!

### ✅ AN TOÀN: Dùng window.location.origin cho client
- Tự động detect URL từ browser
- Hoạt động đúng trên mọi môi trường
- Không cần hard-code

### 📦 Server-side vẫn cần `process.env.NEXTAUTH_URL`
- Cho NextAuth server callbacks
- Cho API routes
- Set qua Cloud Run env vars

---

## 🔒 Files đã fix

1. ✅ `/Users/vietchung/lmsmath/next.config.js`
2. ✅ `/Users/vietchung/lmsmath/Dockerfile.production`
3. ✅ `/Users/vietchung/lmsmath/deploy.sh`

---

**Ready to deploy! 🚀**

