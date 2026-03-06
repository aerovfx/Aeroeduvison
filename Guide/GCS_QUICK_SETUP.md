# GCS Quick Setup Guide

## Bước 1: Tạo Service Account

1. **Vào Google Cloud Console**:
   - Truy cập: https://console.cloud.google.com/
   - Chọn project của bạn

2. **Tạo Service Account**:
   - Vào "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - **Name**: `math-lms-gcs-service`
   - **Description**: `Service account for Math LMS GCS operations`
   - Click "Create and Continue"

3. **Cấp quyền**:
   - **Role**: Chọn "Storage Admin" (để có full quyền GCS)
   - Click "Continue" → "Done"

4. **Tạo Key**:
   - Click vào service account vừa tạo
   - Vào tab "Keys"
   - Click "Add Key" → "Create new key"
   - Chọn "JSON" format
   - Download file JSON và lưu an toàn

## Bước 2: Tạo GCS Bucket

1. **Vào Cloud Storage**:
   - Vào "Cloud Storage" → "Buckets"
   - Click "Create bucket"

2. **Cấu hình Bucket**:
   - **Name**: `math-lms-videos-[your-name]` (phải unique globally)
   - **Location type**: "Region"
   - **Region**: Chọn gần nhất (ví dụ: asia-southeast1)
   - **Storage class**: Standard
   - **Access control**: Uniform
   - Click "Create"

## Bước 3: Cấu hình CORS (Quan trọng!)

1. **Tạo file CORS**:
   ```bash
   # Tạo file cors.json
   cat > cors.json << 'EOF'
   [
     {
       "origin": ["http://localhost:3000", "https://your-domain.com"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "responseHeader": ["Content-Type", "Range", "Content-Length"],
       "maxAgeSeconds": 3600
     }
   ]
   EOF
   ```

2. **Apply CORS**:
   ```bash
   # Cài đặt gcloud CLI nếu chưa có
   # https://cloud.google.com/sdk/docs/install
   
   # Apply CORS
   gsutil cors set cors.json gs://mathvideostore
   ```

## Bước 4: Cấu hình Environment Variables

1. **Tạo file .env.local**:
   ```env
   # Google Cloud Configuration
   GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   GOOGLE_CLOUD_KEY_FILE="./service-account-key.json"
   GCS_BUCKET_NAME="your-bucket-name"
   NEXT_PUBLIC_GCS_BUCKET_NAME="your-bucket-name"
   ```

2. **Hoặc sử dụng JSON credentials trực tiếp**:
   ```env
   GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'
   GCS_BUCKET_NAME="your-bucket-name"
   NEXT_PUBLIC_GCS_BUCKET_NAME="your-bucket-name"
   ```

## Bước 5: Test Setup

1. **Start server**:
   ```bash
   npm run dev
   ```

2. **Test upload**:
   - Truy cập: http://localhost:3000/test-gcs-video
   - Upload một file video nhỏ để test

## Troubleshooting

### Lỗi Authentication:
- Kiểm tra service account có quyền Storage Admin
- Kiểm tra file JSON key có đúng format
- Kiểm tra PROJECT_ID có đúng

### Lỗi CORS:
- Đảm bảo đã apply CORS policy
- Kiểm tra origin trong CORS có match với domain

### Lỗi Bucket:
- Kiểm tra bucket name có unique
- Kiểm tra bucket có tồn tại
- Kiểm tra region có đúng

## Commands hữu ích:

```bash
# Kiểm tra bucket
gsutil ls gs://your-bucket-name

# Kiểm tra CORS
gsutil cors get gs://your-bucket-name

# Test upload
gsutil cp test-file.txt gs://your-bucket-name/

# Make bucket public (cho demo)
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```
