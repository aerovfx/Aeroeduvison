# 🔧 Fix: redirect_uri_mismatch Error

## ❌ Lỗi Bạn Gặp Phải

```
Error 400: redirect_uri_mismatch
Access blocked: lànglow's request is invalid
```

## 🔍 Nguyên Nhân

Google OAuth đang mong đợi một redirect URI cụ thể, nhưng URI trong request không khớp với cấu hình trong Google Cloud Console.

---

## ✅ Giải Pháp (5 Phút)

### Bước 1: Vào Google Cloud Console

1. Truy cập: https://console.cloud.google.com
2. Đăng nhập bằng tài khoản đã tạo OAuth credentials
3. Chọn project của bạn (lànglow)

### Bước 2: Vào Credentials

1. Menu bên trái → **APIs & Services**
2. Click → **Credentials**
3. Tìm OAuth 2.0 Client ID của bạn (dạng: `442514522574-...`)
4. Click vào tên Client ID để edit

### Bước 3: Thêm Authorized Redirect URIs

Trong phần **Authorized redirect URIs**, thêm CHÍNH XÁC các URL sau:

#### For Development (localhost):
```
http://localhost:3000/api/auth/callback/google
```

#### For Production (nếu có):
```
https://inphysic.com/api/auth/callback/google
```
*Thay `inphysic.com` bằng domain của bạn*

### ⚠️ LƯU Ý QUAN TRỌNG:

1. **Không có trailing slash** (/) ở cuối URL
   - ✅ Đúng: `http://localhost:3000/api/auth/callback/google`
   - ❌ Sai: `http://localhost:3000/api/auth/callback/google/`

2. **Đúng protocol**:
   - ✅ Development: `http://` (không SSL)
   - ✅ Production: `https://` (có SSL)

3. **Đúng port**:
   - ✅ `localhost:3000` (nếu chạy trên port 3000)
   - ❌ `localhost` (thiếu port)

4. **Đúng path**:
   - ✅ `/api/auth/callback/google`
   - ❌ `/api/auth/callback` (thiếu /google)

### Bước 4: Thêm Authorized JavaScript Origins

Trong phần **Authorized JavaScript origins**, thêm:

#### For Development:
```
http://localhost:3000
```

#### For Production:
```
https://inphysic.com
```

### Bước 5: Save & Wait

1. Click **SAVE** ở cuối trang
2. Đợi 1-2 phút để Google cập nhật
3. Clear browser cache hoặc dùng Incognito mode

---

## 🧪 Test Lại

### 1. Clear Browser Cache
- Chrome: `Cmd+Shift+R` (Mac) hoặc `Ctrl+Shift+R` (Windows)
- Hoặc dùng **Incognito/Private window**

### 2. Restart Next.js Server
```bash
# Dừng server hiện tại (Ctrl+C)
npm run dev
```

### 3. Test Đăng Nhập
1. Mở: http://localhost:3000/auth/login
2. Click "Tiếp tục với Google"
3. Chọn tài khoản Google
4. Cho phép truy cập

✅ **Thành công**: Bạn sẽ được redirect về `/dashboard`

---

## 🔍 Kiểm Tra Cấu Hình Hiện Tại

### Kiểm tra NEXTAUTH_URL trong .env.local:
```bash
cat .env.local | grep NEXTAUTH_URL
```

**Kết quả phải là:**
```
NEXTAUTH_URL="http://localhost:3000"
```

Nếu sai, sửa lại:
```bash
# Development
NEXTAUTH_URL="http://localhost:3000"

# Production
NEXTAUTH_URL="https://inphysic.com"
```

---

## 📸 Screenshot Hướng Dẫn

### 1. Vào Google Cloud Console > Credentials
Bạn sẽ thấy OAuth 2.0 Client IDs như này:
```
Name: Web client 1
Client ID: 442514522574-m19vtt3lptt2m00mk86u3a9lcos95989.apps.googleusercontent.com
```

### 2. Click vào Client ID để edit

### 3. Trong form edit, tìm 2 sections:

#### Section A: Authorized JavaScript origins
```
+ http://localhost:3000
```

#### Section B: Authorized redirect URIs
```
+ http://localhost:3000/api/auth/callback/google
```

### 4. Click SAVE

---

## 🎯 Checklist

- [ ] Vào Google Cloud Console
- [ ] Tìm OAuth 2.0 Client ID của mình
- [ ] Thêm `http://localhost:3000` vào **Authorized JavaScript origins**
- [ ] Thêm `http://localhost:3000/api/auth/callback/google` vào **Authorized redirect URIs**
- [ ] Click SAVE
- [ ] Đợi 1-2 phút
- [ ] Clear browser cache hoặc dùng Incognito
- [ ] Restart Next.js server
- [ ] Test lại đăng nhập

---

## 🐛 Nếu Vẫn Lỗi

### Kiểm tra các điểm sau:

#### 1. Port có đúng không?
Server của bạn đang chạy trên port nào?
```bash
# Kiểm tra trong terminal khi chạy npm run dev
# Phải thấy: "Local: http://localhost:3000"
```

Nếu chạy trên port khác (ví dụ 3001), thì phải cấu hình:
```
http://localhost:3001
http://localhost:3001/api/auth/callback/google
```

#### 2. Có dùng proxy/ngrok không?
Nếu dùng ngrok hoặc proxy, phải thêm URL đó:
```
https://abc123.ngrok.io
https://abc123.ngrok.io/api/auth/callback/google
```

#### 3. Có nhiều Client IDs không?
Đảm bảo bạn đang edit đúng Client ID (khớp với GOOGLE_CLIENT_ID trong .env.local)

#### 4. Project có đúng không?
Trong Google Console, kiểm tra dropdown project ở góc trên cùng. Đảm bảo đang ở đúng project "lànglow"

---

## 📋 Template Cấu Hình Hoàn Chỉnh

Copy/paste vào Google Console:

### Authorized JavaScript origins:
```
http://localhost:3000
```

### Authorized redirect URIs:
```
http://localhost:3000/api/auth/callback/google
```

### Nếu có production domain:
```
# JavaScript origins:
http://localhost:3000
https://inphysic.com

# Redirect URIs:
http://localhost:3000/api/auth/callback/google
https://inphysic.com/api/auth/callback/google
```

---

## ✅ Sau Khi Fix Xong

Bạn sẽ thấy:
1. ✅ Google OAuth screen xuất hiện bình thường
2. ✅ Chọn account → cho phép → redirect về dashboard
3. ✅ User được tạo trong database
4. ✅ Session hoạt động bình thường

---

## 💡 Tips

### Test với Incognito Mode
- Luôn test OAuth trong Incognito/Private window
- Tránh cache issues và cookie conflicts

### Check Network Tab
- F12 → Network tab
- Xem request đến `/api/auth/signin/google`
- Xem redirect_uri parameter trong URL

### Enable NextAuth Debug (optional)
Trong `lib/auth.ts`, bật debug:
```typescript
export const authOptions: NextAuthOptions = {
  debug: true, // Bật debug
  // ... rest of config
}
```

Restart server và xem logs trong terminal.

---

## 🆘 Cần Hỗ Trợ Thêm?

Nếu vẫn gặp lỗi sau khi làm theo hướng dẫn:

1. **Copy error message đầy đủ** từ browser
2. **Copy URL** đang được redirect (URL rất dài với redirect_uri=...)
3. **Screenshot** cấu hình trong Google Console
4. Gửi cho team để debug

---

## 🎉 Thành Công!

Sau khi fix, bạn sẽ đăng nhập được bằng Google! 

Next steps:
- Verify user trong database (Prisma Studio)
- Test logout/login lại
- Test với account Google khác
- Deploy to production (nếu cần)

Chúc bạn fix thành công! 🚀

