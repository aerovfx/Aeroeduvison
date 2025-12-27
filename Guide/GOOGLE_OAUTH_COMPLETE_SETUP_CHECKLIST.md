# ✅ Google OAuth Complete Setup Checklist

**Ngày**: 19/10/2025  
**Status**: Đang fix errors

---

## 🎯 Tóm Tắt Tình Trạng Hiện Tại

### ✅ Đã Hoàn Thành
- [x] Google OAuth credentials đã tạo
- [x] `.env.local` đã cấu hình với Client ID & Secret
- [x] NEXTAUTH_SECRET đã tạo
- [x] Code đã được fix (hydration, setState errors)
- [x] Documentation đầy đủ

### ⏳ Đang Gặp Issues
- [ ] **redirect_uri_mismatch** → Cần config redirect URI trong Google Console
- [ ] **AccessDenied** → Cần publish app hoặc add test user

---

## 🚀 Bước Hoàn Thiện (10 phút)

### BƯỚC 1: Fix Redirect URI (3 phút)

**Action**: Thêm authorized URIs vào Google Console

1. Vào: https://console.cloud.google.com/apis/credentials
2. Click vào OAuth 2.0 Client ID: `442514522574-m19vtt3lptt2m00mk86u3a9lcos95989`
3. Thêm **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   ```
4. Thêm **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Click **SAVE**

⚠️ **Chú ý**:
- Không có dấu `/` ở cuối
- Đúng port `:3000`
- Đúng path `/api/auth/callback/google`

---

### BƯỚC 2: Fix Access Denied (2 phút)

**Action**: Publish app hoặc add test user

#### Option A: Publish App (Recommended) ⭐

1. Vào: https://console.cloud.google.com/apis/credentials/consent
2. Xem **Publishing status**: đang là "Testing"
3. Click nút **"PUBLISH APP"**
4. Confirm **"Push to production"**
5. Done! Bất kỳ Google account nào cũng login được

**Pros**:
- ✅ Không cần add từng email vào test users
- ✅ Bất kỳ ai cũng có thể test
- ✅ Không cần Google verification (cho basic scopes)

**Cons**:
- ⚠️ App sẽ hiển thị warning "unverified" khi login (OK cho development)

#### Option B: Add Test User (Nếu muốn giữ Testing mode)

1. Vào: https://console.cloud.google.com/apis/credentials/consent
2. Scroll xuống **"Test users"**
3. Click **"+ ADD USERS"**
4. Nhập email: `thegioithu2@gmail.com`
5. Click **"SAVE"**

**Pros**:
- ✅ App không public
- ✅ Chỉ test users mới login được

**Cons**:
- ⚠️ Phải add từng email test user
- ⚠️ Giới hạn 100 test users

---

### BƯỚC 3: Test Đăng Nhập (5 phút)

1. **Clear Browser Cache**
   ```
   Cmd+Shift+R (Mac)
   Ctrl+Shift+R (Windows)
   ```
   Hoặc dùng **Incognito/Private window**

2. **Restart Next.js Server**
   ```bash
   # Dừng server (Ctrl+C)
   npm run dev
   ```

3. **Test Login**
   - Vào: http://localhost:3000/auth/login
   - Click "Tiếp tục với Google"
   - Chọn Google account
   - **Click "Allow"** (QUAN TRỌNG!)
   - Kiểm tra redirect về `/dashboard`

4. **Verify User trong Database**
   ```bash
   npx prisma studio
   ```
   - Mở table `User`
   - Tìm user với email `thegioithu2@gmail.com`
   - Kiểm tra: `email`, `name`, `image`, `role=STUDENT`, `emailVerified`

---

## ✅ Success Checklist

### Test 1: First Time Login
- [ ] Click "Tiếp tục với Google"
- [ ] Google OAuth screen xuất hiện
- [ ] Chọn account
- [ ] Click "Allow"
- [ ] Redirect về `/dashboard`
- [ ] Thấy tên và avatar từ Google
- [ ] User mới được tạo trong database với role=STUDENT

### Test 2: Subsequent Login
- [ ] Logout (hoặc clear session)
- [ ] Login lại bằng Google
- [ ] Redirect về `/dashboard`
- [ ] Không tạo user mới (chỉ update info)
- [ ] Session hoạt động bình thường

### Test 3: Error Handling
- [ ] Không có lỗi trong browser console
- [ ] Không có lỗi trong server logs
- [ ] Toast notifications hoạt động
- [ ] Error pages hiển thị đúng (nếu có lỗi)

### Test 4: Session Management
- [ ] Refresh page → vẫn đăng nhập
- [ ] Session tồn tại sau khi close/reopen browser
- [ ] Logout hoạt động
- [ ] Protected routes yêu cầu login

---

## 🐛 Common Issues & Solutions

### Issue 1: redirect_uri_mismatch
**Error**: `Error 400: redirect_uri_mismatch`

**Solution**:
- Thêm `http://localhost:3000/api/auth/callback/google` vào Authorized redirect URIs
- Đảm bảo không có trailing slash
- Save và đợi 1-2 phút

### Issue 2: AccessDenied
**Error**: `http://localhost:3000/auth/login?error=AccessDenied`

**Solution**:
- Publish app hoặc add email vào test users
- Clear cache, dùng Incognito
- Click "Allow" KHÔNG phải "Deny"

### Issue 3: Hydration Error
**Error**: `Hydration failed because the server rendered HTML didn't match`

**Solution**: ✅ Đã fix trong `login-form.tsx` và `social-login.tsx`

### Issue 4: setState During Render
**Error**: `Cannot update a component while rendering a different component`

**Solution**: ✅ Đã fix bằng cách chuyển toast vào useEffect

### Issue 5: Database Connection
**Error**: User không được tạo trong database

**Solution**:
- Check `DATABASE_URL` trong `.env`
- Run `npx prisma db push`
- Check server logs

---

## 📁 Files Reference

### Config Files
- `.env.local` - Environment variables
- `lib/auth.ts` - NextAuth configuration
- `prisma/schema.prisma` - Database schema

### Components
- `components/auth/login-form.tsx` - Login form with Google button
- `components/auth/social-login.tsx` - Google OAuth button component
- `components/auth/auth-card.tsx` - Auth card wrapper

### API Routes
- `app/api/auth/[...nextauth]/route.ts` - NextAuth handler
- `app/api/auth/register/route.ts` - User registration

### Documentation
- `GOOGLE_OAUTH_SETUP_VIETNAMESE.md` - Complete setup guide
- `GOOGLE_OAUTH_TEST_GUIDE.md` - Testing guide
- `FIX_REDIRECT_URI_MISMATCH.md` - Fix redirect URI error
- `FIX_ACCESS_DENIED_ERROR.md` - Fix access denied error
- `COPY_TO_GOOGLE_CONSOLE.txt` - URLs to copy/paste

---

## 🎯 Final Verification

Sau khi hoàn thành tất cả bước, verify:

### 1. Google Console Config
- [x] OAuth 2.0 Client ID đã tạo
- [ ] Authorized JavaScript origins: `http://localhost:3000`
- [ ] Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
- [ ] OAuth consent screen hoàn tất
- [ ] App published hoặc test user đã thêm

### 2. Local Config
- [x] `.env.local` có `GOOGLE_CLIENT_ID`
- [x] `.env.local` có `GOOGLE_CLIENT_SECRET`
- [x] `.env.local` có `NEXTAUTH_SECRET`
- [x] `.env.local` có `NEXTAUTH_URL=http://localhost:3000`

### 3. Code
- [x] No hydration errors
- [x] No setState during render errors
- [x] Social login component working
- [x] Error handling in place

### 4. Database
- [ ] User table exists
- [ ] User được tạo sau login
- [ ] User info correct (email, name, image, role)

---

## 🚀 Next Steps After Success

### Immediate
1. ✅ Test với multiple Google accounts
2. ✅ Test logout/login flow
3. ✅ Document cho team members
4. ✅ Setup production config (khi ready)

### Short Term
1. 🎯 Implement AI features theo roadmap
2. 🎯 Add more authentication methods (nếu cần)
3. 🎯 Improve user onboarding flow
4. 🎯 Add email notifications

### Long Term
1. 🚀 Deploy to production
2. 🚀 Get Google verification (nếu cần sensitive scopes)
3. 🚀 Monitor authentication metrics
4. 🚀 Scale system

---

## 📞 Support

### If Still Having Issues

1. **Check Server Logs**:
   ```bash
   npm run dev
   ```
   Xem terminal output khi login

2. **Enable Debug Mode**:
   Edit `lib/auth.ts`:
   ```typescript
   debug: true,
   ```

3. **Check Browser Console**:
   - F12 → Console tab
   - Xem có error messages

4. **Check Network Tab**:
   - F12 → Network tab
   - Filter: XHR/Fetch
   - Xem requests/responses

5. **Review Documentation**:
   - `FIX_REDIRECT_URI_MISMATCH.md`
   - `FIX_ACCESS_DENIED_ERROR.md`
   - `GOOGLE_OAUTH_TEST_GUIDE.md`

---

## ✅ Sign Off

Khi tất cả tests pass:
- ✅ Google OAuth working 100%
- ✅ Users auto-created in database
- ✅ Session management stable
- ✅ No errors in console/logs
- ✅ Documentation complete

**Ready for**: AI features implementation (Phase 1: Personal Learning Graph)

---

## 📊 Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Google OAuth Credentials | ✅ Created | Client ID: 442514522574-... |
| Environment Variables | ✅ Configured | In `.env.local` |
| Code Implementation | ✅ Complete | No errors |
| Redirect URI Config | ⏳ Pending | Need to add in Google Console |
| OAuth Consent Screen | ⏳ Pending | Need to publish or add test user |
| Testing | ⏳ Pending | Waiting for config completion |
| Database Integration | ✅ Ready | User model ready |
| Documentation | ✅ Complete | All guides created |

**Next Action**: Complete BƯỚC 1 & 2 trong Google Console (10 phút)

---

Good luck! 🚀 Bạn sắp xong rồi!

