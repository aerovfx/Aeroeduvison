# 🔍 Cookie và Redirect Debug Guide

## Vấn đề hiện tại

**Symptom:** Login thành công nhưng không redirect tới `/dashboard`  
**URL:** `https://inphysic.com/auth/login?callbackUrl=%2Fdashboard`  
**Root Cause:** NEXTAUTH_URL bị trống → NextAuth không biết domain để set cookie

## ✅ Đã sửa

### 1. NEXTAUTH_URL
- **Trước:** Trống (không có)
- **Sau:** `https://inphysic.com`
- **Status:** ✅ Đã cập nhật

### 2. Cookie Domain
- **Trước:** Không có domain
- **Sau:** `.inphysic.com` (cho production)
- **Status:** ✅ Đã thêm vào `lib/auth.ts`

### 3. Environment Variables
- ✅ `DATABASE_URL` - Prisma Accelerate
- ✅ `NEXTAUTH_URL` - https://inphysic.com  
- ✅ `NEXTAUTH_SECRET` - Generated
- ✅ `NODE_ENV` - production

## 🧪 Test Steps

### Step 1: Clear Browser Data
```bash
# Hoặc dùng Incognito/Private window
# DevTools → Application → Storage → Clear site data
```

### Step 2: Test Login Flow
1. **Visit:** https://inphysic.com/auth/login
2. **Login with:**
   - Email: `teacher@example.com`
   - Password: `teacher123`
3. **Expected:**
   - ✅ Toast: "Signed in successfully!"
   - ✅ Redirect to: `/dashboard`
   - ✅ Cookie: `next-auth.session-token` set

### Step 3: Check DevTools
**Network Tab:**
- POST `/api/auth/callback/credentials` → 200 OK
- Response có `Set-Cookie: next-auth.session-token`

**Application Tab:**
- Cookies → `next-auth.session-token`
- Domain: `.inphysic.com`
- Secure: true

## 🔧 Debug Commands

### Test Database
```bash
curl https://inphysic.com/api/test-db
# Expected: {"success":true,"userCount":50}
```

### Test Session
```bash
curl https://inphysic.com/api/auth/session
# Expected: {} (before login) or {user: {...}} (after login)
```

### Test CSRF
```bash
curl https://inphysic.com/api/auth/csrf
# Expected: {"csrfToken":"..."}
```

### Test Login (Manual)
```bash
CSRF_TOKEN=$(curl -s "https://inphysic.com/api/auth/csrf" | jq '.csrfToken' | tr -d '"')
curl -i -X POST "https://inphysic.com/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN&email=teacher@example.com&password=teacher123&callbackUrl=/dashboard"
```

## 📋 Checklist

### ✅ Fixed Issues:
1. ✅ NEXTAUTH_URL set to https://inphysic.com
2. ✅ Cookie domain set to .inphysic.com
3. ✅ Database connection working
4. ✅ Environment variables configured
5. ✅ Redirect callback implemented

### 🔍 What to Check:
1. **Cookie được set?** (DevTools → Application → Cookies)
2. **Session tồn tại?** (`/api/auth/session` returns user data)
3. **Redirect hoạt động?** (Login → Dashboard)
4. **No redirect loop?** (Không bị stuck ở signin page)

## 🚨 Common Issues

### 1. Cookie Not Set
**Symptom:** Login succeeds but no session cookie
**Check:** DevTools → Application → Cookies
**Fix:** Verify cookie domain and secure flags

### 2. Redirect Loop
**Symptom:** Stuck at `/api/auth/signin?csrf=true`
**Check:** Network tab for 302 redirects
**Fix:** Verify NEXTAUTH_URL and CSRF token

### 3. Session Not Persisting
**Symptom:** Session exists but disappears
**Check:** Cookie expiration and domain
**Fix:** Verify cookie configuration

## 📊 Expected Flow

1. **User submits login form**
2. **Client calls:** `signIn('credentials', { email, password, redirect: false })`
3. **Server validates:** Database lookup + password check
4. **Server creates:** JWT token + session
5. **Server sets:** `next-auth.session-token` cookie
6. **Client redirects:** `router.push('/dashboard')`
7. **Dashboard loads:** With session data

## 🎯 Success Criteria

- ✅ Login form submits successfully
- ✅ No 401 errors in Network tab
- ✅ `Set-Cookie` header present in response
- ✅ `next-auth.session-token` cookie set
- ✅ Automatic redirect to `/dashboard`
- ✅ User data visible on dashboard
- ✅ Session persists across page refreshes

## 📞 Next Steps

1. **Test login flow** with updated configuration
2. **Check DevTools** for cookie and session
3. **Verify redirect** to dashboard
4. **Test session persistence** across refreshes

---

**Status:** Ready for testing with cookie domain fix ✅
