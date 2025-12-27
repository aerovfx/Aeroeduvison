# 🔧 Google OAuth Fix Scripts

## 📋 Các script có sẵn

### 1. `check-oauth-config.sh` - Kiểm tra cấu hình hiện tại
Kiểm tra và hiển thị trạng thái cấu hình OAuth hiện tại.

```bash
./check-oauth-config.sh
```

**Output sẽ hiển thị:**
- Service URL
- NEXTAUTH_URL
- Trạng thái Google OAuth secrets
- Các redirect URI cần cấu hình

### 2. `fix-google-oauth.sh` - Tự động sửa cấu hình
Tự động cập nhật các cấu hình cần thiết cho OAuth.

```bash
./fix-google-oauth.sh
```

**Script sẽ:**
1. ✅ Cập nhật NEXTAUTH_URL trong Cloud Run
2. ✅ Kiểm tra Google OAuth secrets
3. ✅ Đảm bảo secrets được attach vào Cloud Run service
4. ✅ Hiển thị hướng dẫn cấu hình redirect URI

## 🚀 Cách sử dụng

### Bước 1: Kiểm tra cấu hình hiện tại
```bash
./check-oauth-config.sh
```

### Bước 2: Chạy script tự động sửa
```bash
./fix-google-oauth.sh
```

### Bước 3: Cấu hình redirect URI trong Google Cloud Console

Script sẽ hiển thị thông tin cần cấu hình. Bạn cần:

1. **Mở Google Cloud Console:**
   ```
   https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0712182643
   ```

2. **Tìm OAuth 2.0 Client ID:**
   - Client ID sẽ được hiển thị trong output của script

3. **Thêm Authorized redirect URIs:**
   ```
   https://your-service-url/api/auth/callback/google
   ```

4. **Thêm Authorized JavaScript origins:**
   ```
   https://your-service-url
   ```

5. **Click SAVE**

### Bước 4: Test OAuth
```bash
# Sau khi cấu hình xong, đợi 1-2 phút rồi test:
curl -I https://your-service-url/api/auth/signin/google
```

Hoặc truy cập trực tiếp: `https://your-service-url/auth/login`

## ⚙️ Cấu hình

Nếu cần thay đổi project ID, service name hoặc region:

```bash
export PROJECT_ID="your-project-id"
export SERVICE_NAME="your-service-name"
export REGION="your-region"

./fix-google-oauth.sh
```

Hoặc chỉnh sửa trực tiếp trong script:
```bash
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
SERVICE_NAME="your-service-name"
REGION="your-region"
```

## 🔍 Troubleshooting

### Lỗi: "Secret does not exist"
```bash
# Tạo secret mới:
echo "your-client-id" | gcloud secrets create google-client-id --data-file=-
echo "your-client-secret" | gcloud secrets create google-client-secret --data-file=-
```

### Lỗi: "Service not found"
```bash
# Kiểm tra service:
gcloud run services list --region=asia-east1
```

### Vẫn lỗi "invalid_client" sau khi cấu hình
1. Đảm bảo redirect URI **chính xác 100%** (không có trailing slash)
2. Đảm bảo JavaScript origin đúng
3. Đợi 2-3 phút để thay đổi propagate
4. Clear browser cache và thử lại

## 📝 Notes

- Script sử dụng Google Cloud SDK (gcloud CLI)
- Yêu cầu đã authenticate: `gcloud auth login`
- Cần có quyền để update Cloud Run service và secrets
- Redirect URI phải match chính xác với callback URL trong NextAuth

