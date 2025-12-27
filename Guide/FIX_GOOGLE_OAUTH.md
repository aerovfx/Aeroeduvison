# 🔧 Hướng dẫn sửa lỗi Google OAuth "invalid_client"

## ❌ Lỗi hiện tại
```
Error 401: invalid_client
The OAuth client was not found.
Client ID: 442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
```

## ✅ Giải pháp

### Bước 1: Kiểm tra và cấu hình OAuth trong Google Cloud Console

1. **Truy cập Google Cloud Console:**
   - Vào: https://console.cloud.google.com/
   - Chọn project: `gen-lang-client-0712182643`

2. **Điều hướng đến Credentials:**
   - APIs & Services → Credentials
   - Tìm OAuth 2.0 Client ID: `442514522574-95bi4m5do7h479aol12boottsua0bj5g`

3. **Kiểm tra/Thêm Authorized redirect URIs:**
   
   Cần thêm các redirect URI sau:
   ```
   https://lmsmath-app-442514522574.asia-east1.run.app/api/auth/callback/google
   https://lmsmath-app-ti25xdihba-de.a.run.app/api/auth/callback/google
   ```
   
   **Hoặc nếu bạn có custom domain:**
   ```
   https://your-domain.com/api/auth/callback/google
   ```

4. **Kiểm tra Authorized JavaScript origins:**
   ```
   https://lmsmath-app-442514522574.asia-east1.run.app
   https://lmsmath-app-ti25xdihba-de.a.run.app
   ```

### Bước 2: Nếu OAuth Client không tồn tại - Tạo mới

Nếu client ID không tồn tại trong Google Cloud Console:

1. **Tạo OAuth 2.0 Client ID mới:**
   - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Name: `AeroEdu Cloud Run`
   
2. **Cấu hình Authorized redirect URIs:**
   ```
   https://lmsmath-app-442514522574.asia-east1.run.app/api/auth/callback/google
   ```

3. **Cấu hình Authorized JavaScript origins:**
   ```
   https://lmsmath-app-442514522574.asia-east1.run.app
   ```

4. **Cập nhật secrets trong Google Cloud:**
   ```bash
   # Lấy Client ID và Client Secret mới
   # Cập nhật secrets:
   echo "YOUR_NEW_CLIENT_ID" | gcloud secrets versions add google-client-id --data-file=-
   echo "YOUR_NEW_CLIENT_SECRET" | gcloud secrets versions add google-client-secret --data-file=-
   ```

### Bước 3: Đảm bảo NEXTAUTH_URL đúng

Service URL hiện tại: `https://lmsmath-app-442514522574.asia-east1.run.app`

Đã được cập nhật trong Cloud Run với:
```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-env-vars "NEXTAUTH_URL=https://lmsmath-app-442514522574.asia-east1.run.app"
```

### Bước 4: Kiểm tra lại

1. **Xác nhận secrets:**
   ```bash
   gcloud secrets versions access latest --secret="google-client-id"
   gcloud secrets versions access latest --secret="google-client-secret"
   ```

2. **Test OAuth:**
   - Truy cập: https://lmsmath-app-442514522574.asia-east1.run.app/auth/login
   - Click "Sign in with Google"
   - Nếu vẫn lỗi, kiểm tra lại redirect URI trong Google Cloud Console

## 🔍 Troubleshooting

### Nếu vẫn lỗi "invalid_client":

1. **Kiểm tra OAuth client có tồn tại:**
   ```bash
   # List all OAuth clients
   gcloud auth application-default print-access-token
   ```

2. **Xem logs Cloud Run:**
   ```bash
   gcloud run services logs read lmsmath-app --region asia-east1 --limit 50
   ```

3. **Kiểm tra redirect URI format:**
   - Phải chính xác: `https://your-domain/api/auth/callback/google`
   - Không có trailing slash
   - Phải match với service URL

### Nếu cần tạo OAuth client mới:

**Option 1: Qua Google Cloud Console (Recommended)**
1. APIs & Services → Credentials → Create Credentials
2. Chọn OAuth 2.0 Client ID
3. Cấu hình như hướng dẫn ở trên

**Option 2: Qua gcloud CLI**
```bash
gcloud alpha iap oauth-clients create \
  --display_name="AeroEdu Production" \
  --project=gen-lang-client-0712182643
```

## 📝 Lưu ý

- Redirect URI phải **chính xác 100%** (không có trailing slash, đúng protocol)
- Nếu deploy lên domain mới, cần cập nhật redirect URI trong Google Cloud Console
- OAuth client phải thuộc cùng Google Cloud project với Cloud Run service
- Kiểm tra OAuth consent screen đã được cấu hình (APIs & Services → OAuth consent screen)

