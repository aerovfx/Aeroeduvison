# Troubleshooting Upload Error

## Lỗi "Upload failed"

Nếu bạn gặp lỗi "Upload failed" khi upload file trong module "Số hoá tài liệu", hãy làm theo các bước sau:

### 1. Kiểm tra Database Migration

Module này cần các models mới trong database. Hãy chạy:

```bash
npx prisma generate
npx prisma db push
```

Hoặc nếu dùng migrations:

```bash
npx prisma migrate dev
```

### 2. Kiểm tra Console Logs

Mở Developer Console (F12) và xem:
- Network tab: Kiểm tra response từ `/api/documents/upload`
- Console tab: Xem error message chi tiết

### 3. Các lỗi thường gặp

#### "Database schema chưa được cập nhật"
**Giải pháp:** Chạy `npx prisma db push`

#### "Unauthorized"
**Giải pháp:** Đảm bảo bạn đã đăng nhập

#### "No files provided"
**Giải pháp:** Chọn ít nhất một file trước khi upload

#### "File không được hỗ trợ"
**Giải pháp:** Chỉ upload PDF, JPG, PNG (max 50MB)

#### "Không thể lưu file"
**Giải pháp:** 
- Kiểm tra quyền ghi trong thư mục `uploads/`
- Đảm bảo có đủ dung lượng disk

### 4. Kiểm tra File Permissions

Đảm bảo thư mục `uploads/` có quyền ghi:

```bash
mkdir -p uploads/documents
chmod -R 755 uploads
```

### 5. Kiểm tra Session

Đảm bảo bạn đã đăng nhập với role TEACHER hoặc có quyền truy cập module.

### 6. Debug Mode

Trong development mode, error messages sẽ hiển thị chi tiết hơn. Kiểm tra:
- Server logs (terminal nơi chạy `npm run dev`)
- Browser console
- Network tab trong DevTools
