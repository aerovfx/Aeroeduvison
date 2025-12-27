# 🔧 Fix: Access Denied Error

## ❌ Lỗi Bạn Gặp Phải

```
http://localhost:3000/auth/login?error=AccessDenied
```

**Error message**: "Access blocked: lànglow's request is invalid"

---

## 🔍 Nguyên Nhân Có Thể

### 1. 🚫 User Từ Chối Cho Phép (Phổ biến nhất)
Khi Google hỏi "Allow lànglow to access...", bạn click **"Deny"** hoặc đóng popup

### 2. 🔒 OAuth App Đang Ở Chế Độ "Testing"
Nếu app đang ở chế độ Testing, chỉ các email trong danh sách test users mới đăng nhập được

### 3. 💾 Lỗi Database
Có lỗi khi tạo user trong database (connection, permissions, etc.)

### 4. ⚙️ OAuth Consent Screen Chưa Hoàn Tất
OAuth consent screen chưa được cấu hình đầy đủ

---

## ✅ Giải Pháp

### Giải Pháp 1: Thử Lại Và Click "Allow"

1. **Clear cookies & cache**: `Cmd+Shift+R` (Mac) hoặc `Ctrl+Shift+R` (Windows)
2. **Dùng Incognito mode** để tránh cached decisions
3. Vào: http://localhost:3000/auth/login
4. Click "Tiếp tục với Google"
5. Khi Google hỏi, click **"Allow"** (KHÔNG click Deny)

---

### Giải Pháp 2: Thêm Email Vào Test Users

Nếu OAuth app đang ở chế độ "Testing":

#### Bước 1: Vào Google Cloud Console
https://console.cloud.google.com

#### Bước 2: OAuth Consent Screen
1. Menu bên trái → **APIs & Services** → **OAuth consent screen**
2. Scroll xuống phần **"Test users"**
3. Click **"+ ADD USERS"**
4. Nhập email của bạn: **thegioithu2@gmail.com**
5. Click **"SAVE"**

#### Bước 3: Thử lại
1. Clear browser cache
2. Vào: http://localhost:3000/auth/login
3. Đăng nhập với email vừa thêm vào test users

---

### Giải Pháp 3: Publish OAuth App (Recommended)

Thay vì giữ app ở chế độ "Testing", publish nó cho "External" users:

#### Bước 1: Vào OAuth Consent Screen
https://console.cloud.google.com/apis/credentials/consent

#### Bước 2: Publish App
1. Xem **Publishing status**: đang là "Testing"
2. Click **"PUBLISH APP"**
3. Confirm: "Push to production"

⚠️ **Lưu ý**: 
- App sẽ ở trạng thái "In production" nhưng "Not verified"
- Vẫn hoạt động bình thường cho mục đích development
- Không cần verification từ Google (trừ khi cần sensitive scopes)

#### Bước 3: Test
- Bất kỳ Google account nào cũng có thể đăng nhập
- Không cần thêm vào test users list

---

### Giải Pháp 4: Kiểm Tra Database Connection

Có thể lỗi xảy ra khi tạo user trong database:

#### Kiểm tra DATABASE_URL
```bash
cat .env | grep DATABASE_URL
```

Đảm bảo có giá trị và đúng format.

#### Test Prisma Connection
```bash
npx prisma db push
```

Nếu lỗi → fix database connection trước.

#### Check Server Logs
Khi đăng nhập Google, xem terminal logs:
```bash
npm run dev
```

Tìm các error messages như:
- `Database connection failed`
- `Error creating user`
- `Prisma error`

---

### Giải Pháp 5: Enable Debug Mode

#### Bước 1: Bật Debug trong NextAuth

Edit file `lib/auth.ts`:

```typescript
export const authOptions: NextAuthOptions = {
  debug: true, // Bật debug
  secret: process.env.NEXTAUTH_SECRET,
  // ... rest of config
}
```

#### Bước 2: Restart Server
```bash
npm run dev
```

#### Bước 3: Test & Check Logs
- Thử đăng nhập Google
- Xem detailed logs trong terminal
- Tìm error messages

#### Bước 4: Tắt Debug (Sau khi fix xong)
```typescript
debug: false, // hoặc xóa dòng này
```

---

## 🔍 Troubleshooting Chi Tiết

### Check 1: OAuth Consent Screen Status

Vào: https://console.cloud.google.com/apis/credentials/consent

**Kiểm tra:**
- ✅ Publishing status: "In production" hoặc "Testing" với email trong test users
- ✅ App name: đã điền
- ✅ User support email: đã điền
- ✅ Developer contact email: đã điền

### Check 2: Authorized Domains

Trong OAuth consent screen, phần **"Authorized domains"**:
- Không cần add `localhost` cho development
- Chỉ cần add domain cho production (ví dụ: `inphysic.com`)

### Check 3: Scopes

Trong OAuth consent screen, phần **"Scopes"**:
- Default scopes là đủ (email, profile, openid)
- Không cần thêm sensitive scopes cho basic login

### Check 4: User Table Schema

Kiểm tra Prisma schema có đầy đủ fields:

```bash
npx prisma studio
```

Mở table `User`, kiểm tra có các columns:
- `id`
- `email`
- `name`
- `image`
- `role`
- `emailVerified`
- `password` (nullable)

---

## 🧪 Test Scenarios

### Scenario 1: First Time Login
1. User chưa có trong database
2. Click Allow
3. → User được tạo mới với role=STUDENT
4. → Redirect về /dashboard
5. ✅ Success

### Scenario 2: Returning User
1. User đã có trong database
2. Click Allow
3. → User info được update (name, image, emailVerified)
4. → Redirect về /dashboard
5. ✅ Success

### Scenario 3: User Clicks Deny
1. User click "Deny" hoặc đóng popup
2. → Redirect về `/auth/login?error=AccessDenied`
3. → Hiển thị toast error
4. ⚠️ Expected behavior

---

## 📋 Quick Checklist

- [ ] OAuth app đã publish hoặc email trong test users
- [ ] Click "Allow" (KHÔNG click Deny)
- [ ] Database connection hoạt động
- [ ] Prisma schema đúng
- [ ] Server không có errors trong logs
- [ ] Authorized redirect URIs đã cấu hình:
  - `http://localhost:3000/api/auth/callback/google`
- [ ] NEXTAUTH_URL đúng: `http://localhost:3000`
- [ ] GOOGLE_CLIENT_ID và SECRET đúng

---

## 🎯 Recommended Solution

**Fastest fix** (2 phút):

1. **Vào OAuth Consent Screen**:
   https://console.cloud.google.com/apis/credentials/consent

2. **Option A: Publish App** (Recommended)
   - Click "PUBLISH APP"
   - Confirm
   - Bất kỳ Google account nào cũng login được

   **OR**

   **Option B: Add Test User**
   - Scroll down → "Test users"
   - Click "+ ADD USERS"
   - Thêm: `thegioithu2@gmail.com`
   - Save

3. **Clear Browser Cache**
   - Dùng Incognito mode
   - Hoặc `Cmd+Shift+R`

4. **Test Login**
   - http://localhost:3000/auth/login
   - Click "Tiếp tục với Google"
   - Click "Allow" khi Google hỏi

---

## 🔄 Error Flow Diagram

```
User clicks "Tiếp tục với Google"
    ↓
Redirect to Google OAuth
    ↓
Google shows consent screen:
"Allow lànglow to access your email, name, profile?"
    ↓
┌─────────────┬─────────────┐
│   ALLOW     │    DENY     │
└─────────────┴─────────────┘
      ↓               ↓
   SUCCESS      ACCESS DENIED
      ↓               ↓
Create/Update   Redirect to:
User in DB      /auth/login?
      ↓         error=AccessDenied
Redirect to             ↓
/dashboard        Show error toast
```

---

## 💡 Common Mistakes

### ❌ Mistake 1: Clicking "Deny"
User vô tình click Deny thay vì Allow

**Fix**: Thử lại và click Allow

### ❌ Mistake 2: App Ở Chế Độ Testing, Email Không Trong List
OAuth app đang Testing mode, email không trong test users

**Fix**: Publish app hoặc add email vào test users

### ❌ Mistake 3: Cached Decision
Browser nhớ decision "Deny" trước đó

**Fix**: Clear cache, dùng Incognito

### ❌ Mistake 4: Wrong Project
Đang config sai project trong Google Console

**Fix**: Kiểm tra dropdown project, đảm bảo đúng "lànglow"

---

## 🆘 Still Getting Error?

Nếu vẫn lỗi sau khi làm theo tất cả bước trên:

### 1. Check Server Logs
```bash
npm run dev
```
Xem có error gì trong terminal không

### 2. Enable Debug Mode
Edit `lib/auth.ts`:
```typescript
debug: true,
```

### 3. Check Prisma
```bash
npx prisma studio
```
Verify database structure

### 4. Test Database Connection
```bash
npx prisma db push
```

### 5. Send Debug Info
Nếu vẫn không được, cần:
- Screenshot OAuth consent screen config
- Server logs khi đăng nhập
- Database connection status
- Browser console errors (F12)

---

## ✅ Success Indicators

Bạn biết đã fix thành công khi:
- ✅ Google OAuth screen xuất hiện
- ✅ Click Allow → không quay về error
- ✅ Redirect về /dashboard
- ✅ Thấy tên và avatar từ Google
- ✅ User xuất hiện trong database

---

## 📞 Next Steps After Fix

1. ✅ Verify user trong Prisma Studio
2. ✅ Test logout/login lại
3. ✅ Test với account Google khác
4. ✅ Document OAuth setup cho team
5. ✅ Bắt đầu implement AI features

---

Chúc bạn fix thành công! 🚀

**TL;DR**: Vào Google Console → OAuth Consent Screen → Publish App hoặc Add Test User → Thử lại với Incognito mode

