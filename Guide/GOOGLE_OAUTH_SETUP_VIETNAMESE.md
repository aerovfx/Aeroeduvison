# Hướng Dẫn Cấu Hình Google OAuth (Xác Thực Gmail)

## Bước 1: Tạo Google OAuth Credentials

### 1.1. Truy cập Google Cloud Console
1. Vào https://console.cloud.google.com
2. Đăng nhập bằng tài khoản Google của bạn

### 1.2. Tạo hoặc chọn Project
1. Ở góc trên bên trái, click vào dropdown project
2. Click "NEW PROJECT" hoặc chọn project có sẵn
3. Đặt tên project (ví dụ: "lmsmath-oauth")
4. Click "CREATE"

### 1.3. Bật Google+ API (nếu chưa bật)
1. Vào menu bên trái → "APIs & Services" → "Library"
2. Tìm "Google+ API" hoặc "Google Identity"
3. Click và chọn "ENABLE"

### 1.4. Tạo OAuth 2.0 Credentials
1. Vào menu bên trái → "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "OAuth client ID"

### 1.5. Cấu hình OAuth Consent Screen (nếu chưa có)
Nếu chưa cấu hình OAuth consent screen, bạn sẽ được yêu cầu cấu hình:

1. Chọn "External" (cho phép bất kỳ ai có Google account đăng nhập)
2. Click "CREATE"
3. Điền thông tin:
   - **App name**: LMSMath (hoặc tên bạn muốn)
   - **User support email**: email của bạn
   - **Developer contact email**: email của bạn
4. Click "SAVE AND CONTINUE"
5. Skip phần "Scopes" (click "SAVE AND CONTINUE")
6. Skip phần "Test users" (click "SAVE AND CONTINUE")
7. Click "BACK TO DASHBOARD"

### 1.6. Tạo OAuth Client ID
1. Quay lại "Credentials" → Click "CREATE CREDENTIALS" → "OAuth client ID"
2. Chọn Application type: **Web application**
3. Đặt tên: "LMSMath Web Client"
4. Thêm **Authorized JavaScript origins**:
   - http://localhost:3000 (cho development)
   - https://inphysic.com (cho production - thay bằng domain của bạn)
5. Thêm **Authorized redirect URIs**:
   - http://localhost:3000/api/auth/callback/google (cho development)
   - https://inphysic.com/api/auth/callback/google (cho production)
6. Click "CREATE"

### 1.7. Lấy Client ID và Client Secret
Sau khi tạo xong, bạn sẽ thấy popup hiển thị:
- **Client ID**: copy và lưu lại
- **Client Secret**: copy và lưu lại

**LƯU Ý**: Giữ bí mật Client Secret, không chia sẻ với ai!

---

## Bước 2: Cấu Hình Environment Variables

### 2.1. Tạo file .env (nếu chưa có)
Tại thư mục gốc của project `/Users/vietchung/lmsmath/`, tạo file `.env`

### 2.2. Thêm các biến môi trường

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lmsmath"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth - THAY ĐỔI CÁC GIÁ TRỊ NÀY
GOOGLE_CLIENT_ID="your-google-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"

# Các biến khác (giữ nguyên từ env.example)
```

### 2.3. Tạo NEXTAUTH_SECRET
Để tạo một secret key an toàn, chạy lệnh sau trong terminal:

```bash
openssl rand -base64 32
```

Hoặc:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy kết quả và paste vào `NEXTAUTH_SECRET`

---

## Bước 3: Kiểm Tra Cấu Hình

### 3.1. Khởi động lại server
```bash
npm run dev
```

### 3.2. Test đăng nhập
1. Mở trình duyệt và vào http://localhost:3000/auth/login
2. Click nút "Continue with Google" (biểu tượng Google)
3. Chọn tài khoản Google để đăng nhập
4. Cho phép ứng dụng truy cập thông tin
5. Bạn sẽ được redirect về dashboard

---

## Bước 4: Troubleshooting (Xử Lý Lỗi)

### Lỗi "redirect_uri_mismatch"
**Nguyên nhân**: URL callback không khớp với cấu hình trong Google Console

**Giải pháp**:
1. Vào Google Cloud Console → Credentials
2. Click vào OAuth Client ID bạn đã tạo
3. Thêm chính xác URL: `http://localhost:3000/api/auth/callback/google`
4. Save và thử lại

### Lỗi "invalid_client"
**Nguyên nhân**: Client ID hoặc Client Secret sai

**Giải pháp**:
1. Kiểm tra lại file `.env`
2. Đảm bảo không có khoảng trắng thừa
3. Copy lại Client ID và Secret từ Google Console

### Lỗi "Access blocked: This app's request is invalid"
**Nguyên nhân**: OAuth consent screen chưa được cấu hình đầy đủ

**Giải pháp**:
1. Vào Google Cloud Console → OAuth consent screen
2. Hoàn tất tất cả các bước cấu hình
3. Đảm bảo app ở trạng thái "Testing" hoặc "Published"

### Không thấy nút Google
**Nguyên nhân**: Biến môi trường chưa được load

**Giải pháp**:
1. Khởi động lại server: `Ctrl + C` → `npm run dev`
2. Clear cache trình duyệt
3. Thử lại

---

## Bước 5: Deploy to Production

Khi deploy lên production (ví dụ: inphysic.com):

1. **Cập nhật Google OAuth Credentials**:
   - Thêm production domain vào "Authorized JavaScript origins"
   - Thêm `https://inphysic.com/api/auth/callback/google` vào "Authorized redirect URIs"

2. **Cập nhật biến môi trường**:
   ```bash
   NEXTAUTH_URL="https://inphysic.com"
   NEXTAUTH_SECRET="your-production-secret"
   GOOGLE_CLIENT_ID="same-as-development-or-create-new"
   GOOGLE_CLIENT_SECRET="same-as-development-or-create-new"
   ```

3. **Publish OAuth App** (tùy chọn):
   - Vào Google Cloud Console → OAuth consent screen
   - Click "PUBLISH APP" để cho phép tất cả người dùng đăng nhập
   - Hoặc giữ ở chế độ "Testing" và thêm test users

---

## Các Tính Năng Đã Tích Hợp

✅ **Đăng nhập bằng Google** - Người dùng có thể đăng nhập bằng tài khoản Google
✅ **Tự động tạo tài khoản** - Tự động tạo user mới khi đăng nhập lần đầu
✅ **Role mặc định** - User mới được gán role "STUDENT"
✅ **Cập nhật thông tin** - Tự động cập nhật name, image từ Google
✅ **Email verification** - Đánh dấu email đã verified khi đăng nhập qua Google
✅ **Session management** - Quản lý session an toàn với JWT
✅ **Database sync** - Đồng bộ thông tin user với database

---

## Thông Tin Bổ Sung

### Luồng Xác Thực
1. User click "Sign in with Google"
2. Redirect đến Google OAuth consent screen
3. User cho phép truy cập
4. Google redirect về `/api/auth/callback/google` với authorization code
5. Server exchange code lấy user info
6. Check user trong database:
   - Nếu chưa có → tạo user mới với role STUDENT
   - Nếu đã có → cập nhật thông tin
7. Tạo session và redirect về dashboard

### Security Features
- ✅ CSRF protection
- ✅ Secure cookies (production)
- ✅ HTTPOnly cookies
- ✅ Session token encryption
- ✅ Email normalization (lowercase, trim)

---

## Hỗ Trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Server logs: Terminal đang chạy `npm run dev`
2. Browser console: F12 → Console tab
3. Network tab: F12 → Network tab
4. Database: Kiểm tra user có được tạo không

Chúc bạn cấu hình thành công! 🚀

