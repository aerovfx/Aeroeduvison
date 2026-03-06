# 🚀 Hướng dẫn Deploy lên Production (inphysic.com)

## ✅ **ĐÃ FIX: scripts/deploy.sh**

File `scripts/deploy.sh` đã được cập nhật theo code của `deploy.sh` (root) đang chạy tốt.

**Các thay đổi chính:**
- ✅ Thay `gcloud builds submit` → `docker build` local (tránh lỗi Cloud Build API)
- ✅ Update service name: `lmsmath-app`
- ✅ Update region: `asia-east1`
- ✅ Thêm NEXTAUTH_URL: `https://inphysic.com`
- ✅ Thêm health check sau deploy
- ✅ Thêm local build test trước deploy

---

## 📋 **Bước 1: Prerequisites**

### 1.1. Cài đặt công cụ

```bash
# Check Docker
docker --version
# Nếu chưa có: https://docs.docker.com/get-docker/

# Check gcloud CLI
gcloud --version
# Nếu chưa có: https://cloud.google.com/sdk/docs/install
```

### 1.2. Authenticate GCP

```bash
# Login GCP
gcloud auth login

# Set project (project ID từ deploy.sh)
gcloud config set project gen-lang-client-0712182643

# Verify
gcloud config list
```

---

## 📋 **Bước 2: Deploy Code Mới**

### 2.1. Sử dụng script tốt nhất (deploy.sh ở root)

```bash
cd /Users/vietchung/lmsmath

# Chạy script đang hoạt động tốt
./deploy.sh
```

### 2.2. Hoặc dùng scripts/deploy.sh (đã fix)

```bash
cd /Users/vietchung/lmsmath

# Chạy script đã cải tiến
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## 📋 **Bước 3: Verify Deployment**

### 3.1. Check service đã chạy

```bash
# Get service URL
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(status.url)"
```

### 3.2. Test trang Terms đã cập nhật

```bash
# Kiểm tra thông tin mới đã có chưa
curl https://inphysic.com/terms | grep "thegioithu2@gmail.com"

# Nếu thấy → ✅ Deploy thành công!
# Nếu không thấy → Cần clear cache
```

### 3.3. Clear cache nếu cần

```bash
# Browser: Hard refresh
# Mac: Cmd + Shift + R
# Windows: Ctrl + Shift + R

# Hoặc xóa cache trong DevTools:
# F12 → Application → Clear storage → Clear site data
```

---

## 📋 **Bước 4: Configure Domain (nếu chưa map)**

```bash
# Map domain inphysic.com → Cloud Run service
gcloud run domain-mappings create \
  --service=lmsmath-app \
  --domain=inphysic.com \
  --region=asia-east1

# Sau đó configure DNS records tại domain registrar
```

---

## 🔍 **Troubleshooting**

### ❌ Lỗi: `gcloud builds submit` - NOT_FOUND

**Nguyên nhân:** Cloud Build API chưa enable

**Giải pháp:** Dùng `docker build` local thay vì Cloud Build
```bash
# File deploy.sh (root) đã fix sẵn - dùng file đó
./deploy.sh
```

### ❌ Lỗi: Docker build failed

```bash
# Clear cache và build lại
rm -rf .next node_modules
npm install
npm run build
```

### ❌ Lỗi: Permission denied

```bash
# Re-authenticate
gcloud auth login
gcloud auth configure-docker gcr.io
```

### ⚠️  Thông tin cũ vẫn hiển thị trên web

**Nguyên nhân:** Browser/CDN cache

**Giải pháp:**
1. Hard refresh (Cmd+Shift+R)
2. Incognito mode test
3. Clear browser cache
4. Đợi 5-10 phút để CDN tự clear

---

## 📊 **Timeline Deploy:**

| Bước | Thời gian | Mô tả |
|------|-----------|-------|
| 1. Local build test | 1-2 min | Verify code builds |
| 2. Docker build | 5-10 min | Build production image |
| 3. Push to GCR | 1-2 min | Upload to registry |
| 4. Deploy Cloud Run | 2-3 min | Deploy service |
| 5. Health check | 10 sec | Verify deployment |
| **TOTAL** | **~10-20 min** | **Full deployment** |

---

## 🎯 **Quick Commands**

### Deploy nhanh:
```bash
cd /Users/vietchung/lmsmath && ./deploy.sh
```

### Check logs real-time:
```bash
gcloud run logs tail lmsmath-app --region asia-east1 --follow
```

### Check service status:
```bash
gcloud run services describe lmsmath-app --region asia-east1
```

### Rollback nếu có lỗi:
```bash
# List revisions
gcloud run revisions list --service lmsmath-app --region asia-east1

# Rollback to previous revision
gcloud run services update-traffic lmsmath-app \
  --region asia-east1 \
  --to-revisions REVISION_NAME=100
```

---

## ✨ **Kết quả sau Deploy:**

Trang https://inphysic.com/terms sẽ hiển thị thông tin mới:

**Phần 13. Liên hệ:**
- Email: thegioithu2@gmail.com
- Điện thoại: +84 909 933 936
- Địa chỉ: Ấp 1, Đường 329, Hoà Hội, TP. Hồ Chí Minh

---

## 📞 **Support:**

Nếu gặp vấn đề:
1. Check logs: `gcloud run logs tail lmsmath-app --region asia-east1`
2. Check service health: `curl https://inphysic.com`
3. Verify secrets configured trong GCP Console
4. Check domain mapping: `gcloud run domain-mappings list --region asia-east1`

---

**🎉 Ready to deploy! Chạy `./deploy.sh` để bắt đầu!**
