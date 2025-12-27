# 🚀 FINAL: Deploy to Cloud Run via Cloud Shell

## ✅ Ready to Deploy!

**Project**: `gen-lang-client-0712182643`  
**Service**: `lmsmath-app`  
**Region**: `asia-east1`  
**Estimated Time**: 15 minutes

---

## 📋 Prerequisites

✅ Code đã được fix:
- `middleware.ts` - Đã comment out redirect từ Cloud Run URL → inphysic.com
- Deployment scripts sẵn sàng
- Patch script sẵn sàng

✅ Cloud Shell sẵn sàng:
- Project: gen-lang-client-0712182643 đã được set
- Authenticated

---

## 🎯 3 Bước Deploy Đơn Giản

### Bước 1: Upload Code lên Cloud Shell

**Option A - Dùng Cloud Shell Editor (Khuyến nghị):**

1. Mở Cloud Shell Editor:
   ```
   https://shell.cloud.google.com/?project=gen-lang-client-0712182643&cloudshell=true
   ```

2. Click **Open Editor** nếu chưa mở

3. Upload project:
   - Click **File** → **Upload Folder**
   - Chọn folder: `/Users/vietchung/lmsmath`
   - Đợi upload hoàn tất (có thể 2-5 phút)

**Option B - Dùng gcloud upload (Nếu folder quá lớn):**

```bash
# Trên máy local, tạo tar archive
cd /Users/vietchung
tar -czf lmsmath-deploy.tar.gz lmsmath \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git'

# Upload qua Cloud Shell
# Trong Cloud Shell:
# Drag & drop file lmsmath-deploy.tar.gz vào Cloud Shell Editor

# Extract
tar -xzf lmsmath-deploy.tar.gz
cd lmsmath
```

---

### Bước 2: Patch Middleware (Nếu chưa làm)

```bash
# Trong Cloud Shell Terminal
cd ~/lmsmath

# Make executable
chmod +x patch-middleware-for-cloudrun.sh

# Run patch
./patch-middleware-for-cloudrun.sh
```

**Kết quả mong đợi:**
```
🔧 Patching middleware.ts for Cloud Shell deployment...
📦 Creating backup...
   ✅ Backup created: middleware.ts.backup
🔧 Applying patch...
   ✅ Patch applied successfully
✅ Patch complete!
```

---

### Bước 3: Deploy to Cloud Run

```bash
# Make executable
chmod +x deploy-cloud-run-with-secrets.sh

# Run deployment
./deploy-cloud-run-with-secrets.sh
```

**Quá trình sẽ diễn ra:**
1. ✅ Set GCP project
2. ✅ Configure Docker for GCR
3. 🔨 Build Docker image (8-12 phút)
4. 📤 Push to Container Registry (1-2 phút)
5. 🚀 Deploy to Cloud Run (1-2 phút)
6. ✅ Hiển thị Service URL

**Tổng thời gian**: ~10-15 phút

---

## 🎉 Sau Khi Deploy Thành Công

Script sẽ hiển thị:

```
✅ Deployment complete!

📊 Service Info:
   Service: lmsmath-app
   URL: https://lmsmath-app-XXXXXXXXXX-de.a.run.app
   Region: asia-east1

🧪 Test Your Application:
   → https://lmsmath-app-XXXXXXXXXX-de.a.run.app
```

---

## 🔧 Bước 4: Configure OAuth

**QUAN TRỌNG**: Thêm redirect URI vào Google OAuth:

1. Truy cập OAuth Credentials:
   ```
   https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0712182643
   ```

2. Click vào **OAuth 2.0 Client ID**: `442514522574-95bi4m5do7h479aol12boottsua0bj5g`

3. Thêm **Authorized redirect URIs**:
   ```
   https://YOUR-SERVICE-URL/api/auth/callback/google
   ```
   
   Ví dụ:
   ```
   https://lmsmath-app-442514522574.asia-east1.run.app/api/auth/callback/google
   ```

4. Click **Save**

---

## ✅ Verification

### Test 1: Homepage
```bash
SERVICE_URL=$(gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --project gen-lang-client-0712182643 \
  --format="value(status.url)")

curl -I $SERVICE_URL
```

**Mong đợi**: HTTP 200 hoặc 302 (NOT 301 redirect tới inphysic.com)

### Test 2: Health Endpoint
```bash
curl $SERVICE_URL/api/health
```

**Mong đợi**: JSON response với status

### Test 3: Browser
```bash
echo "Open in browser: $SERVICE_URL"
```

### Test 4: Logs
```bash
gcloud run services logs read lmsmath-app \
  --region asia-east1 \
  --project gen-lang-client-0712182643 \
  --limit=20
```

---

## 📊 Files Reference

| File | Purpose |
|------|---------|
| `patch-middleware-for-cloudrun.sh` | Patch middleware to allow Cloud Run URL |
| `deploy-cloud-run-with-secrets.sh` | Main deployment script |
| `middleware.ts` | Fixed to not redirect Cloud Run URLs |
| `Dockerfile.production` | Production Dockerfile |
| `.env.production` | Production environment variables |

---

## 🐛 Troubleshooting

### Upload timeout
```bash
# Nếu upload folder quá lớn, dùng tar file thay vì
# Xem Option B ở Bước 1
```

### Patch script failed
```bash
# Manual patch
nano middleware.ts

# Tìm lines 76-82, wrap với /* ... */
```

### Build failed - Out of memory
```bash
# Cloud Shell có giới hạn RAM
# Thử clean up:
docker system prune -f

# Hoặc tăng memory trong Dockerfile nếu cần
```

### Deploy failed - Permission denied
```bash
# Check IAM permissions
gcloud projects get-iam-policy gen-lang-client-0712182643 \
  --flatten="bindings[].members" \
  --filter="bindings.members:thegioithu2@gmail.com"
```

### Service returns 503
```bash
# Check logs for errors
gcloud run services logs read lmsmath-app \
  --region asia-east1 \
  --project gen-lang-client-0712182643 \
  --limit=50
```

---

## 🎯 Success Checklist

- [ ] Code uploaded to Cloud Shell
- [ ] Patch script executed successfully
- [ ] Deployment completed without errors
- [ ] Service URL accessible (HTTP 200/302)
- [ ] `/api/health` endpoint works
- [ ] OAuth redirect URI added
- [ ] Login flow works

---

## 📞 Need Help?

**View Service Details:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --project gen-lang-client-0712182643
```

**Cloud Console:**
- Service: https://console.cloud.google.com/run/detail/asia-east1/lmsmath-app?project=gen-lang-client-0712182643
- Logs: https://console.cloud.google.com/logs?project=gen-lang-client-0712182643

---

## 🎉 You're All Set!

Sau khi hoàn thành các bước trên, ứng dụng của bạn sẽ:
- ✅ Chạy trên Cloud Run
- ✅ Có URL công khai
- ✅ Auto-scale từ 0 → 10 instances
- ✅ Sử dụng Secret Manager cho credentials
- ✅ Sẵn sàng cho production traffic

**Next Steps:**
1. Test toàn bộ tính năng
2. Setup custom domain (nếu cần)
3. Configure monitoring & alerts
4. Setup CI/CD cho auto-deploy
