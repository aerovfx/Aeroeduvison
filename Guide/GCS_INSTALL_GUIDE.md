# Google Cloud SDK Installation Guide

## Cài đặt Google Cloud SDK

### 1. Tải Google Cloud SDK

**Cho macOS:**
```bash
# Tải và cài đặt
curl https://sdk.cloud.google.com | bash

# Restart terminal hoặc chạy:
source ~/.bashrc
# hoặc
source ~/.zshrc
```

**Hoặc tải trực tiếp:**
1. Truy cập: https://cloud.google.com/sdk/docs/install
2. Tải file phù hợp với hệ điều hành
3. Chạy installer

### 2. Khởi tạo và xác thực

```bash
# Khởi tạo
gcloud init

# Đăng nhập
gcloud auth login

# Chọn project
gcloud config set project gen-lang-client-0712182643

# Xác thực service account
gcloud auth activate-service-account --key-file=./gen-lang-client-0712182643-47b71bba4d28.json
```

### 3. Cấu hình CORS cho bucket

Sau khi cài đặt xong, chạy:

```bash
cd /Users/vietchung/lmsmath
./scripts/setup-gcs-cors.sh
```

### 4. Test cấu hình

```bash
# Kiểm tra bucket
gsutil ls gs://mathvideostore

# Kiểm tra CORS
gsutil cors get gs://mathvideostore
```

## Alternative: Sử dụng Google Cloud Console

Nếu không muốn cài đặt SDK, bạn có thể:

1. **Vào Google Cloud Console**: https://console.cloud.google.com/
2. **Cloud Storage** → **Buckets** → **mathvideostore**
3. **Permissions** tab → **CORS**
4. **Add CORS configuration**:
   ```json
   [
     {
       "origin": ["http://localhost:3000"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "responseHeader": ["Content-Type", "Range", "Content-Length"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

5. **Make bucket public** (cho demo):
   - **Permissions** tab → **Add principal**
   - **New principal**: `allUsers`
   - **Role**: `Storage Object Viewer`

## Test Upload

Sau khi cấu hình xong:

1. Tạo file `.env.local` với nội dung:
   ```env
   GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"
   GOOGLE_CLOUD_KEY_FILE="./gen-lang-client-0712182643-47b71bba4d28.json"
   GCS_BUCKET_NAME="mathvideostore"
   NEXT_PUBLIC_GCS_BUCKET_NAME="mathvideostore"
   ```

2. Start server: `npm run dev`
3. Test upload: http://localhost:3000/test-gcs-video
