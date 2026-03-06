# 🔥 HƯỚNG DẪN TRIỆT ĐỂ LOẠI BỎ LOCALHOST

## ❌ VẤN ĐỀ HIỆN TẠI:

Console vẫn hiển thị:
```
Login result: {url: 'http://localhost:3000/dashboard'}  ❌
```

**Nguyên nhân:** Docker image hiện tại trên Cloud Run vẫn chứa bundle cũ có localhost được bake vào.

---

## ✅ ĐÃ FIX 4 FILE QUAN TRỌNG:

### 1. **next.config.js** ✅
```javascript
// ❌ REMOVED: Don't bake NEXTAUTH_URL
env: {
  // Leave empty - client auto-detects
}
```

### 2. **Dockerfile.production** ✅
```dockerfile
# ✅ Only set NEXTAUTH_URL for server
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
# ❌ REMOVED: NEXT_PUBLIC_NEXTAUTH_URL
```

### 3. **components/providers/session-provider.tsx** ✅
```typescript
// ✅ FIX: Removed NEXT_PUBLIC_NEXTAUTH_URL
const baseUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.NEXTAUTH_URL || 'https://inphysic.com');
```

### 4. **deploy-local-amd64.sh** ✅
```bash
# ✅ Only pass NEXTAUTH_URL (server-side)
--build-arg NEXTAUTH_URL=https://inphysic.com
# ❌ NOT passing NEXT_PUBLIC_NEXTAUTH_URL
```

---

## 🚀 DEPLOY NGAY ĐỂ FIX TRIỆT ĐỂ:

### **Option 1: Script tự động với verification (RECOMMENDED)** ⭐

```bash
cd /Users/vietchung/lmsmath
./DEPLOY_FIX_LOCALHOST_FINAL.sh
```

**Script này sẽ:**
1. ✅ Verify tất cả fixes đã đúng
2. ✅ Deep clean tất cả cache
3. ✅ Build image SẠCH (không có localhost)
4. ✅ Clear old Cloud Run config
5. ✅ Deploy image mới
6. ✅ Health check
7. ✅ Hướng dẫn test

### **Option 2: Script gốc**

```bash
cd /Users/vietchung/lmsmath
./deploy-local-amd64.sh
```

---

## ⚠️ SAU KHI DEPLOY XONG (QUAN TRỌNG!):

### **Bước 1: Clear browser cache HOÀN TOÀN** 🔴

**Lý do:** Browser đang cache file `page-551c3dc5942991e3.js` cũ có localhost!

**Cách làm:**

#### Chrome:
```
1. Cmd+Shift+Delete
2. Chọn "All time"
3. Check "Cached images and files"
4. Click "Clear data"
```

#### Safari:
```
1. Develop → Empty Caches
2. Hoặc: Preferences → Privacy → Manage Website Data → Remove All
```

#### Hoặc dùng Incognito:
```
Cmd+Shift+N (Chrome)
Cmd+Shift+P (Safari)
```

### **Bước 2: Hard refresh** 🔄

```
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

### **Bước 3: Test login** 🧪

1. Truy cập: https://inphysic.com/auth/login
2. Mở DevTools Console (F12)
3. Login với: admin@inphysic.com / Admin@123
4. Kiểm tra console log

---

## ✨ KẾT QUẢ MONG ĐỢI:

### ❌ Trước (localhost vẫn còn):
```
Login result: {url: 'http://localhost:3000/dashboard'}
Redirecting to: /dashboard
page-551c3dc5942991e3.js:1
```

### ✅ Sau (localhost đã biến mất):
```
Login result: {url: 'https://inphysic.com/dashboard'}
Redirecting to: /dashboard
page-[hash].js:1  ← New bundle file (no localhost)
```

---

## 🔍 CÁCH VERIFY THÀNH CÔNG:

### 1. **Check console log:**
```javascript
// ✅ Không có localhost nào
// ✅ Tất cả URLs là https://inphysic.com
// ✅ Redirect thành công
```

### 2. **Check network tab:**
```
- Tìm file page-*.js mới (hash khác)
- Download và search "localhost" → Không tìm thấy ✅
```

### 3. **Check cookies:**
```
- next-auth.callback-url: /dashboard hoặc https://inphysic.com/dashboard ✅
- KHÔNG có http://localhost ✅
```

---

## 🧠 TẠI SAO PHẢI DEPLOY LẠI?

### **Next.js Static Bundle:**

```
npm run build
  ↓
Creates: .next/static/chunks/pages/page-[hash].js
  ↓
Contains: All environment variables with NEXT_PUBLIC_*
  ↓
Docker build copies this to image
  ↓
Pushed to Artifact Registry
  ↓
Deployed to Cloud Run
```

**Nếu build với `NEXT_PUBLIC_NEXTAUTH_URL=http://localhost:3000`:**
- ❌ Giá trị này HARD-CODED vào JavaScript
- ❌ Cannot change at runtime
- ❌ Phải build lại để thay đổi!

**Sau khi fix và build lại:**
- ✅ Client code dùng `window.location.origin`
- ✅ Dynamic detection at runtime
- ✅ Hoạt động trên mọi domain!

---

## 📋 CHECKLIST TRIỆT ĐỂ:

### **Trước deploy:**
- [ ] ✅ next.config.js không có `NEXT_PUBLIC_NEXTAUTH_URL`
- [ ] ✅ Dockerfile.production không set `NEXT_PUBLIC_NEXTAUTH_URL`
- [ ] ✅ session-provider.tsx không đọc `NEXT_PUBLIC_NEXTAUTH_URL`
- [ ] ✅ deploy script chỉ set `NEXTAUTH_URL` (server-only)

### **Trong deploy:**
- [ ] Clean tất cả cache
- [ ] Build image mới
- [ ] Push lên registry
- [ ] Deploy lên Cloud Run
- [ ] Health check pass

### **Sau deploy:**
- [ ] Clear browser cache hoàn toàn
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] Test login
- [ ] Verify console log KHÔNG có localhost
- [ ] Verify network tab có file .js mới

---

## 🎯 THỜI GIAN DỰ KIẾN:

- Deploy: ~5-10 phút
- Wait for deployment: ~2 phút
- Clear cache + test: ~1 phút

**Total: ~10-15 phút để fix triệt để!**

---

## 🆘 NẾU VẪN CÒN LOCALHOST SAU DEPLOY:

### 1. **Verify deployment thành công:**
```bash
gcloud run services describe lmsmath-app --region asia-east1
```

### 2. **Check env vars trên Cloud Run:**
```bash
gcloud run services describe lmsmath-app --region asia-east1 --format="value(spec.template.spec.containers[0].env)"
```

**Phải có:** `NEXTAUTH_URL=https://inphysic.com`  
**KHÔNG được có:** `NEXT_PUBLIC_NEXTAUTH_URL`

### 3. **Force clear cache:**
```
- Dùng Incognito mode 100%
- Hoặc test trên browser khác
- Hoặc test trên điện thoại
```

### 4. **Check Docker image:**
```bash
# Pull image mới
docker pull asia-east1-docker.pkg.dev/gen-lang-client-0712182643/lmsmath/lmsmath-app:latest

# Extract và check bundle
docker run --rm asia-east1-docker.pkg.dev/gen-lang-client-0712182643/lmsmath/lmsmath-app:latest \
  sh -c "grep -r 'localhost:3000' .next/static/ || echo 'No localhost found ✅'"
```

---

## 🎉 SUMMARY:

1. ✅ **Code đã fix đúng** (4 files)
2. ⚠️ **Phải deploy lại** để có bundle mới
3. 🔴 **Phải clear cache** để browser load bundle mới
4. ✅ **Sau đó localhost sẽ biến mất hoàn toàn!**

---

**DEPLOY NGAY:**
```bash
./DEPLOY_FIX_LOCALHOST_FINAL.sh
```

**Perfect! 🚀**

