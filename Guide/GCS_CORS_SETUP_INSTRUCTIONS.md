# GCS CORS Setup Instructions

## Bước 1: Cấu hình CORS Policy

Chạy lệnh sau trong terminal của bạn:

```bash
gsutil cors set cors.json gs://mathvideostore
```

## Bước 2: Verify CORS Configuration

```bash
gsutil cors get gs://mathvideostore
```

Bạn sẽ thấy output như này nếu thành công:

```json
[
  {
    "origin": ["http://localhost:3000"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```

## Bước 3: Test Upload từ Frontend

Sau khi set CORS, hãy:

1. Mở http://localhost:3000/test-gcs-simple
2. Upload một file test
3. Kiểm tra console để xem có lỗi CORS không

## Troubleshooting

Nếu vẫn gặp lỗi:

1. **Clear browser cache** (Cmd+Shift+R trên Mac)
2. **Restart development server**: `npm run dev`
3. **Check browser console** để xem error details

## Expected Result

Sau khi set CORS thành công, upload từ frontend sẽ hoạt động mà không có lỗi "Network error during GCS upload. Status: Unknown"
