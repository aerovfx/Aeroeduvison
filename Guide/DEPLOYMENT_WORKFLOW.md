# 🚀 Deployment Workflow - Quick Guide

## ⚡ **TL;DR - Deploy Ngay:**

```bash
# Từ project root
./deploy.sh
```

**Thời gian:** ~10-20 phút  
**Kết quả:** Code mới lên https://inphysic.com

---

## 📋 **Full Workflow (Chi tiết):**

### **Bước 1: Pre-deploy Check ✅**

```bash
# Kiểm tra sẵn sàng deploy
chmod +x scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

**Sẽ check:**
- ✅ Files cần thiết (package.json, Dockerfile, etc.)
- ✅ Dependencies installed
- ✅ Build thành công
- ✅ Docker và gcloud CLI ready
- ✅ Contact info đồng bộ

---

### **Bước 2: Deploy 🚀**

```bash
# Deploy lên Google Cloud Run
./deploy.sh
```

**Sẽ làm:**
1. Set GCP project
2. Authenticate Docker
3. Build image (linux/amd64)
4. Push to GCR
5. Deploy to Cloud Run
6. Return service URL

**Timeline:**
- Build image: 5-10 phút
- Push & Deploy: 2-3 phút
- **Total: ~10-20 phút**

---

### **Bước 3: Verify Deployment ✅**

```bash
# Check trang Terms đã cập nhật
curl https://inphysic.com/terms | grep "thegioithu2@gmail.com"

# Nếu thấy → ✅ Deploy thành công!
# Nếu không → Clear browser cache (Cmd+Shift+R)
```

---

## 🔧 **Troubleshooting:**

### ❌ **Build failed locally**

```bash
# Clear cache và rebuild
rm -rf .next node_modules
npm install
npm run build
```

### ❌ **Docker build failed**

```bash
# Check Docker daemon
docker info

# Restart Docker Desktop
# Then try again
```

### ❌ **gcloud auth error**

```bash
# Re-authenticate
gcloud auth login
gcloud auth configure-docker gcr.io

# Set project
gcloud config set project gen-lang-client-0712182643
```

### ❌ **Cookie domain issue (localhost)**

```bash
# Run cookie cleaner
chmod +x scripts/clear-cookies.sh
./scripts/clear-cookies.sh

# Then follow instructions to clear in browser
```

---

## 📁 **Files Quan trọng:**

| File | Mục đích |
|------|----------|
| `deploy.sh` | **Main deploy script** (KHUYÊN DÙNG) |
| `scripts/deploy.sh` | Deploy script nâng cao (alternative) |
| `scripts/pre-deploy-check.sh` | Check trước khi deploy |
| `scripts/clear-cookies.sh` | Clear NextAuth cookies |
| `DEPLOY_GUIDE.md` | Hướng dẫn chi tiết deploy |
| `ENV_CONFIGURATION.md` | Hướng dẫn config environment |
| `FIXES_SUMMARY.md` | Tổng hợp tất cả fixes |

---

## 🎯 **Deployment Checklist:**

### **Pre-deployment:**
- [ ] Code đã commit (optional)
- [ ] Build test thành công locally
- [ ] Contact info đã đồng bộ
- [ ] No critical errors

### **Deployment:**
- [ ] GCP authenticated
- [ ] Docker running
- [ ] Run `./deploy.sh`
- [ ] Wait 10-20 minutes

### **Post-deployment:**
- [ ] Verify service URL works
- [ ] Check https://inphysic.com/terms
- [ ] Test login flow
- [ ] Clear browser cache if needed

---

## 🆘 **Nếu Gặp Lỗi:**

1. **Check logs:**
   ```bash
   gcloud run logs tail lmsmath-app --region asia-east1 --follow
   ```

2. **Rollback (nếu cần):**
   ```bash
   gcloud run revisions list --service lmsmath-app --region asia-east1
   gcloud run services update-traffic lmsmath-app \
     --region asia-east1 \
     --to-revisions PREVIOUS_REVISION=100
   ```

3. **Contact support:**
   - Check FIXES_SUMMARY.md
   - Check DEPLOY_GUIDE.md
   - Review build logs

---

## 📊 **What Gets Updated:**

Khi deploy, các trang sau sẽ có thông tin mới:

### **https://inphysic.com/terms**
- Email: thegioithu2@gmail.com
- Phone: +84 909 933 936
- Address: Ấp 1, Đường 329, Hoà Hội

### **https://inphysic.com/privacy**
- Email: thegioithu2@gmail.com
- Phone: +84 909 933 936
- Address: Ấp 1, Đường 329, Hoà Hội

### **https://inphysic.com/cookies**
- Email: thegioithu2@gmail.com
- Phone: +84 909 933 936
- Address: Ấp 1, Đường 329, Hoà Hội

### **https://inphysic.com/contact-sales**
- Email: thegioithu2@gmail.com
- Phone: +84 909 933 936
- Address: Ấp 1, Đường 329, Hoà Hội

---

## ⚡ **Quick Commands Reference:**

```bash
# Pre-check
./scripts/pre-deploy-check.sh

# Deploy
./deploy.sh

# Verify
curl https://inphysic.com/terms | grep "thegioithu2"

# Monitor
gcloud run logs tail lmsmath-app --region asia-east1

# Clear cookies (if needed)
./scripts/clear-cookies.sh
```

---

**🎉 Ready to Deploy! Run `./deploy.sh`** 🚀

