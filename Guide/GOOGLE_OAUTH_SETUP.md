# Hướng dẫn thiết lập Google OAuth

## 🚀 Đã hoàn thành

✅ **Đã thêm Google OAuth vào hệ thống:**
- Cài đặt Google Provider cho NextAuth.js
- Cập nhật cấu hình authentication
- Thêm nút đăng nhập Google vào trang sign-in và sign-up
- Cập nhật trang test-auth để test Google login
- Thêm biến môi trường cho Google OAuth

## 🔧 Thiết lập Google OAuth

### Bước 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project hiện có
3. Bật Google+ API

### Bước 2: Tạo OAuth 2.0 Credentials

1. Vào **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Chọn **Web application**
4. Thêm **Authorized redirect URIs** (có đường dẫn đầy đủ):
   ```
   # Development
   http://localhost:3000/api/auth/callback/google
   http://localhost:3001/api/auth/callback/google
   
   # Production
   https://aerovfx.com/api/auth/callback/google
   
   # Staging (nếu có)
   https://staging.aerovfx.com/api/auth/callback/google
   ```

5. Thêm **Authorized JavaScript origins** (chỉ domain, không có đường dẫn):
   ```
   # Development
   http://localhost:3000
   http://localhost:3001
   
   # Production
   https://aerovfx.com
   
   # Staging (nếu có)
   https://staging.aerovfx.com
   ```

   ⚠️ **Lưu ý quan trọng:**
   - **Redirect URIs**: Phải có đường dẫn đầy đủ `/api/auth/callback/google`
   - **JavaScript origins**: Chỉ có domain, KHÔNG có đường dẫn, KHÔNG có dấu `/` cuối
6. Lưu **Client ID** và **Client Secret**

### Bước 3: Cấu hình Environment Variables

Thêm vào file `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
```

### Bước 4: Khởi động lại server

```bash
npm run dev
```

## 🎯 Cách sử dụng

### Đăng nhập với Google:
1. Truy cập `/sign-in` hoặc `/sign-up`
2. Click nút **"Continue with Google"**
3. Chọn tài khoản Google
4. Hệ thống sẽ tự động tạo tài khoản với role **STUDENT**
5. Chuyển hướng đến `/dashboard`

### Test Google Login:
1. Truy cập `/test-auth`
2. Click **"Sign in with Google"**
3. Kiểm tra thông tin session

## 🔍 Tính năng

- ✅ **Tự động tạo tài khoản**: Người dùng mới sẽ được tạo với role STUDENT
- ✅ **Liên kết tài khoản**: Nếu email đã tồn tại, sẽ liên kết với tài khoản hiện có
- ✅ **Bảo mật**: Sử dụng OAuth 2.0 chuẩn của Google
- ✅ **UI đẹp**: Nút Google với icon và styling đẹp

## 🚨 Lưu ý quan trọng

1. **Chỉ hoạt động với HTTPS trong production**
2. **Cần cấu hình domain thật cho production**
3. **Google có giới hạn số lượng redirect URIs**
4. **Cần verify domain với Google nếu cần**

## 🔄 Cập nhật Redirect URI

### Khi nào cần cập nhật:
- Khi deploy lên production
- Khi thay đổi domain
- Khi thêm staging environment
- Khi thay đổi port development

### Cách cập nhật:
1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Chọn project > **APIs & Services** > **Credentials**
3. Click **Edit** trên OAuth 2.0 Client ID
4. Cập nhật **Authorized redirect URIs** và **Authorized JavaScript origins**
5. Click **Save**

### Template cho các môi trường khác nhau:

#### Development:
```
http://localhost:3000/api/auth/callback/google
http://localhost:3001/api/auth/callback/google
```

#### Production:
```
https://aerovfx.com/api/auth/callback/google
```

#### Staging:
```
https://staging.aerovfx.com/api/auth/callback/google
```

## 🛠️ Troubleshooting

### Lỗi "redirect_uri_mismatch":
- Kiểm tra redirect URI trong Google Console
- Đảm bảo port và domain đúng
- Kiểm tra protocol (http vs https)

### Lỗi "Invalid Origin: URIs must not contain a path or end with '/'":
- **Nguyên nhân**: Bạn đã nhầm lẫn giữa Redirect URIs và JavaScript origins
- **Giải pháp**: 
  - **Redirect URIs**: Phải có đường dẫn đầy đủ (ví dụ: `https://aerovfx.com/api/auth/callback/google`)
  - **JavaScript origins**: Chỉ có domain (ví dụ: `https://aerovfx.com`)
- **Kiểm tra**: Đảm bảo bạn đang nhập đúng vào đúng section

### Lỗi "invalid_client":
- Kiểm tra GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET
- Đảm bảo đã enable Google+ API

### Không tạo được tài khoản:
- Kiểm tra kết nối database
- Xem log console để debug

## 📱 Test URLs

- `/sign-in` - Trang đăng nhập với nút Google
- `/sign-up` - Trang đăng ký với nút Google  
- `/test-auth` - Trang test authentication
- `/api/test-auth` - API test authentication

