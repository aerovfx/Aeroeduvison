# 🧪 Hướng Dẫn Test Google OAuth

## ✅ Checklist Trước Khi Test

- [x] Google OAuth credentials đã được tạo
- [x] File `.env.local` đã được cấu hình
- [x] Server development đã được khởi động
- [x] Lỗi hydration đã được fix

## 🚀 Bước 1: Khởi Động Server

```bash
cd /Users/vietchung/lmsmath
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000**

## 🧪 Bước 2: Test Đăng Nhập Google

### 2.1. Mở trang đăng nhập
1. Mở trình duyệt
2. Vào: `http://localhost:3000/auth/login`
3. Bạn sẽ thấy form đăng nhập

### 2.2. Click "Tiếp tục với Google"
1. Click vào nút có logo Google
2. Bạn sẽ được chuyển đến trang đăng nhập Google
3. Chọn tài khoản Google để đăng nhập

### 2.3. Cho phép ứng dụng truy cập
1. Google sẽ hỏi: "LMSMath muốn truy cập thông tin của bạn"
2. Click "Cho phép" hoặc "Allow"

### 2.4. Kiểm tra kết quả
✅ **Thành công** nếu:
- Bạn được chuyển về trang Dashboard (`/dashboard`)
- Thấy tên và avatar từ Google account
- Không có lỗi trong console

❌ **Thất bại** nếu:
- Redirect về `/auth/login?error=...`
- Thấy lỗi trong console
- Không tạo được user trong database

## 🔍 Bước 3: Kiểm Tra Database

### 3.1. Mở Prisma Studio
```bash
npm run db:studio
```

### 3.2. Kiểm tra bảng `User`
1. Vào `http://localhost:5555`
2. Click vào table `User`
3. Tìm user vừa tạo với email Google của bạn

**Kiểm tra các field:**
- ✅ `email`: email Google của bạn (lowercase)
- ✅ `name`: tên từ Google
- ✅ `image`: URL avatar từ Google
- ✅ `role`: phải là "STUDENT" (default)
- ✅ `emailVerified`: có giá trị (timestamp)
- ✅ `password`: NULL (vì đăng nhập qua Google)

## 🧪 Bước 4: Test Các Tình Huống

### 4.1. Đăng nhập lần 2
1. Đăng xuất (nếu có)
2. Đăng nhập lại bằng Google với cùng tài khoản
3. Kiểm tra: không tạo user mới, chỉ update thông tin

### 4.2. Đăng nhập với tài khoản Google khác
1. Sử dụng tài khoản Google khác
2. Kiểm tra: tạo user mới trong database

### 4.3. Đăng nhập với email đã tồn tại (credentials)
**Scenario**: User đã đăng ký bằng email/password, giờ dùng Google với cùng email

**Expected**: Hệ thống sẽ merge accounts (update user hiện có)

## 🐛 Troubleshooting

### Lỗi: redirect_uri_mismatch
**Nguyên nhân**: Redirect URI không khớp với Google Console

**Giải pháp**:
1. Vào Google Cloud Console
2. Credentials → OAuth 2.0 Client ID
3. Thêm chính xác: `http://localhost:3000/api/auth/callback/google`
4. Save và thử lại

### Lỗi: invalid_client
**Nguyên nhân**: Client ID hoặc Secret sai

**Giải pháp**:
1. Kiểm tra `.env.local`:
   ```bash
   cat .env.local | grep GOOGLE
   ```
2. So sánh với credentials trong Google Console
3. Đảm bảo không có khoảng trắng thừa
4. Restart server: `npm run dev`

### Lỗi: Access blocked
**Nguyên nhân**: OAuth Consent Screen chưa hoàn tất

**Giải pháp**:
1. Vào Google Cloud Console → OAuth consent screen
2. Hoàn tất tất cả bước cấu hình
3. Nếu app đang "Testing", thêm email test users
4. Hoặc publish app cho "External"

### User không được tạo trong database
**Kiểm tra**:
1. Server logs: xem có lỗi database không
2. DATABASE_URL trong `.env`: đảm bảo connect đúng
3. Prisma schema: có table `User` không
4. Run migration: `npm run db:push`

### Hydration error vẫn xuất hiện
**Giải pháp**:
1. Clear browser cache: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```

## 📊 Expected Behavior

### Luồng đăng nhập thành công:
```
1. User clicks "Tiếp tục với Google"
   → Next.js calls: signIn('google', { callbackUrl: '/dashboard' })

2. Browser redirects to:
   https://accounts.google.com/o/oauth2/v2/auth?...

3. User authenticates with Google

4. Google redirects back to:
   http://localhost:3000/api/auth/callback/google?code=...

5. NextAuth exchanges code for user info

6. Server calls signIn callback (in lib/auth.ts):
   - Check if user exists in DB
   - If not: create new user with role=STUDENT
   - If yes: update name, image, emailVerified

7. Server creates session (JWT)

8. Browser redirects to: /dashboard

9. User sees dashboard with Google name & avatar
```

### Session Cookie:
- Name: `next-auth.session-token` (development)
- HTTPOnly: true
- SameSite: lax
- Secure: false (development) / true (production)
- Max-Age: 30 days

## ✅ Test Checklist

- [ ] Đăng nhập Google lần đầu → tạo user mới
- [ ] User được redirect về /dashboard
- [ ] Thấy tên và avatar từ Google
- [ ] User có trong database với role=STUDENT
- [ ] Đăng nhập lần 2 → không tạo user mới
- [ ] Session tồn tại sau khi refresh page
- [ ] Đăng xuất thành công
- [ ] Đăng nhập với tài khoản Google khác → tạo user mới

## 🎉 Success Criteria

Khi tất cả tests pass, bạn có:
- ✅ Google OAuth hoạt động 100%
- ✅ Users tự động được tạo/update trong DB
- ✅ Session management ổn định
- ✅ UI không có hydration errors
- ✅ Logs không có errors/warnings

## 📞 Next Steps

Sau khi test thành công:
1. Test trên production (nếu có)
2. Thêm Google OAuth vào signup page
3. Cải thiện UX (loading states, error messages)
4. Thêm email verification (optional)
5. Implement Phase 1 của AI Adaptive Learning Roadmap

---

**Lưu ý**: Nếu gặp bất kỳ lỗi nào không có trong hướng dẫn này, hãy:
1. Kiểm tra server logs (`terminal running npm run dev`)
2. Kiểm tra browser console (F12)
3. Kiểm tra Network tab (F12 → Network) để xem requests/responses

Chúc bạn test thành công! 🚀

