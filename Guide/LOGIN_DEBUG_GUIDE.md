# 🔍 Login Debug Guide - Tại Sao Không Đăng Nhập Được?

**Last Updated**: October 19, 2025

---

## ✅ Từ Diagnostic - Hệ Thống Đang Hoạt Động Tốt!

Diagnostic script cho thấy:
- ✅ Server running on port 3000
- ✅ Database connected
- ✅ 16 users trong database
- ✅ NextAuth API accessible
- ✅ Providers configured: google, credentials
- ✅ CSRF token working
- ✅ Password hashing working

**Vậy tại sao không đăng nhập được?**

---

## 🐛 Các Vấn Đề Thường Gặp

### Issue 1: Google OAuth - redirect_uri_mismatch

**Triệu chứng**:
```
Error 400: redirect_uri_mismatch
Access blocked: lànglow's request is invalid
```

**Nguyên nhân**: Redirect URI chưa được config trong Google Console

**Fix ngay (5 phút)**:
1. Vào: https://console.cloud.google.com/apis/credentials
2. Click OAuth Client ID: `442514522574-m19vtt3lptt2m00mk86u3a9lcos95989`
3. Thêm **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
4. Click **SAVE**
5. Đợi 1-2 phút
6. Clear browser cache hoặc dùng Incognito
7. Thử lại

---

### Issue 2: Google OAuth - AccessDenied

**Triệu chứng**:
```
http://localhost:3000/auth/login?error=AccessDenied
```

**Nguyên nhân**: OAuth app đang "Testing" mode và email không trong test users

**Fix (chọn 1 trong 2)**:

**Option A: Publish App (Recommended)**
1. Vào: https://console.cloud.google.com/apis/credentials/consent
2. Click **"PUBLISH APP"**
3. Confirm
4. Done - bất kỳ Google account nào cũng login được

**Option B: Add Test User**
1. Vào: https://console.cloud.google.com/apis/credentials/consent
2. Scroll xuống "Test users"
3. Click **"+ ADD USERS"**
4. Thêm email: `thegioithu2@gmail.com`
5. Click **"SAVE"**

---

### Issue 3: Credentials Login - Invalid Password

**Triệu chứng**: Toast error "Invalid email or password"

**Check**:
```bash
# 1. Xem users trong database
npm run db:studio

# 2. Tìm user với email bạn đang dùng
# 3. Kiểm tra:
#    - Email có đúng không? (lowercase)
#    - Password field có giá trị không?
#    - Password có hash không? (starts with $2a$)
```

**Fix**: Tạo test users
```bash
npm run test:auth:create-users
```

Sau đó login với:
- Email: `student@test.com`
- Password: `password123`

---

### Issue 4: Server Không Load Environment Variables

**Triệu chứng**: Env vars missing trong diagnostic

**Fix**:
```bash
# Kill tất cả node processes
killall node

# Restart server
npm run dev

# Verify env vars loaded
curl http://localhost:3000/api/auth/providers
```

---

## 🧪 Test Từng Bước

### Step 1: Test Database & Users

```bash
# Open Prisma Studio
npm run db:studio

# Check:
# - Table "User" exists?
# - Users có trong table?
# - Password được hash? (starts with $2a$ or $2b$)
```

**Expected**: Thấy users với password hashed

---

### Step 2: Test Server

```bash
# Check server is running
curl http://localhost:3000/api/auth/providers

# Expected response:
# {
#   "google": { ... },
#   "credentials": { ... }
# }
```

**If fails**: Server không chạy → `npm run dev`

---

### Step 3: Test Credentials Login

```bash
# Create test user first
npm run test:auth:create-users

# Then try login on browser:
# http://localhost:3000/auth/login
# Email: student@test.com
# Password: password123
```

**Expected**: Redirect to /dashboard

**If fails**:
- Check browser console (F12)
- Check server logs (terminal)
- Password có match không?

---

### Step 4: Test Google OAuth

```bash
# 1. Open in Incognito mode (important!)
# 2. Go to: http://localhost:3000/auth/login
# 3. Click "Tiếp tục với Google"
```

**Expected Flow**:
```
Click button
    ↓
Redirect to Google
    ↓
Select account
    ↓
Click "Allow"
    ↓
Redirect to /dashboard
```

**If sees error**:
- `redirect_uri_mismatch` → Fix redirect URI in Google Console
- `AccessDenied` → Publish app or add test user

---

## 🔧 Debug Checklist

### Environment
- [ ] `.env.local` file exists
- [ ] Has NEXTAUTH_URL=http://localhost:3000
- [ ] Has NEXTAUTH_SECRET
- [ ] Has GOOGLE_CLIENT_ID
- [ ] Has GOOGLE_CLIENT_SECRET
- [ ] Has DATABASE_URL

### Server
- [ ] Server running: `npm run dev`
- [ ] No errors in terminal
- [ ] Port 3000 accessible
- [ ] API routes working

### Database
- [ ] Database connected
- [ ] User table exists
- [ ] Users có trong table
- [ ] Passwords hashed correctly

### Google Console
- [ ] OAuth Client ID created
- [ ] Redirect URI added: `http://localhost:3000/api/auth/callback/google`
- [ ] JavaScript origins added: `http://localhost:3000`
- [ ] App published OR email in test users

### Browser
- [ ] Clear cache or use Incognito
- [ ] No browser extensions blocking
- [ ] JavaScript enabled
- [ ] Cookies enabled

---

## 🆘 Still Not Working?

### Enable Debug Mode

Edit `lib/auth.ts`:
```typescript
export const authOptions: NextAuthOptions = {
  debug: true,  // Enable debug
  // ... rest
}
```

Restart server and check terminal logs when logging in.

---

### Test Credentials Login Step-by-Step

```bash
# 1. Create test user
npm run db:studio
# Manually check user exists: admin@example.com

# 2. Open browser console (F12)
# 3. Go to: http://localhost:3000/auth/login
# 4. Enter: admin@example.com / admin123
# 5. Click Login
# 6. Watch:
#    - Browser console for errors
#    - Server terminal for logs
#    - Network tab for requests
```

---

### Test Google OAuth Step-by-Step

```bash
# 1. Incognito window (Cmd+Shift+N)
# 2. http://localhost:3000/auth/login
# 3. Click "Tiếp tục với Google"
# 4. Watch URL changes:
#    - Should redirect to accounts.google.com
#    - If sees error immediately → Check Google Console config
#    - If sees Google login → Select account
#    - If sees "Allow" screen → Click Allow
#    - If redirect to error URL → Check which error
```

---

## 📊 Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `redirect_uri_mismatch` | Redirect URI not in Google Console | Add URI to Google Console |
| `AccessDenied` | App in Testing, email not in test users | Publish app or add email |
| `Invalid credentials` | Wrong email/password | Check user in DB |
| `CredentialsSignin` | NextAuth auth failed | Check user password hash |
| `Network error` | Server not running | Start: `npm run dev` |
| `Database error` | DB connection failed | Check DATABASE_URL |

---

## ✅ Expected Behavior

### Credentials Login (Working):
```
1. Go to /auth/login
2. Enter valid email/password
3. Click Login
4. Loading spinner appears
5. Toast: "Signed in successfully!"
6. Redirect to /dashboard
7. See user name in header
```

### Google OAuth (Working):
```
1. Click "Tiếp tục với Google"
2. Redirect to Google
3. Select account
4. Click "Allow"
5. Redirect to /dashboard
6. User created/updated in DB
7. See Google name & avatar
```

---

## 🎯 Quick Fix Commands

```bash
# Restart everything fresh
killall node
npm run dev

# Create test users
npm run test:auth:create-users

# Open database to verify
npm run db:studio

# Test login with:
# Email: student@test.com
# Password: password123
```

---

## 📞 If All Else Fails

1. **Take screenshots** of:
   - Error message in browser
   - Browser console (F12)
   - Server logs (terminal)
   - Google Console settings

2. **Collect info**:
   - Which login method? (Credentials or Google)
   - Exact error message?
   - Server logs output?

3. **Check files**:
   - `FIX_REDIRECT_URI_MISMATCH.md`
   - `FIX_ACCESS_DENIED_ERROR.md`
   - `AUTH_TESTING_GUIDE_COMPLETE.md`

---

**Most likely issue**: Google OAuth config (redirect URI + app not published)

**Quick fix**: Follow `FIX_REDIRECT_URI_MISMATCH.md` and `FIX_ACCESS_DENIED_ERROR.md`

**Test credentials first**: Use `student@test.com` / `password123` to verify basic login works
