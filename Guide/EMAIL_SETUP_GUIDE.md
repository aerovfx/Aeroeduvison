# 📧 Email Configuration Guide

## Vấn đề hiện tại

Từ logs:
- User `vietchungvn@gmail.com` không tồn tại trong database
- SMTP configuration chưa được setup
- Email không được gửi vì thiếu cấu hình

## Bước 1: Kiểm tra user trong database

User có thể chưa được tạo. Kiểm tra bằng cách:
1. Đăng ký tài khoản mới với email `vietchungvn@gmail.com`
2. Hoặc kiểm tra database xem user có tồn tại không

## Bước 2: Cấu hình SMTP Email

Thêm các biến môi trường sau vào `.env.local`:

```bash
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

### Cách lấy App Password cho Gmail:

1. **Bật 2-Step Verification:**
   - Vào Google Account Settings
   - Security → 2-Step Verification
   - Bật nếu chưa có

2. **Tạo App Password:**
   - Vào Security → App passwords
   - Chọn "Mail" và "Other (Custom name)"
   - Nhập tên: "LMS Math"
   - Copy password được tạo (16 ký tự)

3. **Thêm vào .env.local:**
   ```bash
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # App password (không có dấu cách)
   ```

### Hoặc dùng email service khác:

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Resend (Recommended cho Next.js)
```bash
# Cài đặt Resend
npm install resend

# Thêm vào .env.local
RESEND_API_KEY=re_xxx
```

## Bước 3: Test Email

Sau khi cấu hình, test bằng cách:
1. Đảm bảo user tồn tại trong database
2. Gửi forgot password request
3. Kiểm tra email inbox và spam folder

## Development Mode

Nếu không có SMTP config, trong development mode, reset link sẽ được log ra console:

```
📧 [EMAIL] Password reset link for email@example.com: http://localhost:3000/auth/reset-password?token=...
```

## Lưu ý

- ⚠️ **Security:** API luôn trả về success message ngay cả khi user không tồn tại (để tránh email enumeration)
- ✅ **Development:** Reset link được log trong console khi không có SMTP config
- 📧 **Production:** Cần cấu hình SMTP đầy đủ để gửi email thực sự

