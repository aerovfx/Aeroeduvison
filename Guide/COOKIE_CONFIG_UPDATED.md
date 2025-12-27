# 🎯 Cookie Configuration Updated

## ✅ What Was Updated

**Cookie Configuration:**
- Name: `__Secure-next-auth.session-token`
- Domain: `inphysic.com`
- Secure: `true`
- SameSite: `lax`
- HttpOnly: `true`

**JWT Configuration:**
- Secret: `process.env.NEXTAUTH_SECRET`
- Strategy: `jwt`

## 🧪 Test Now

### Step 1: Create Account
Visit: **https://inphysic.com/auth/signup**

### Step 2: Login
Visit: **https://inphysic.com/auth/login**

### Step 3: Check Cookie
Look for: `__Secure-next-auth.session-token` in DevTools → Application → Cookies

## 📊 Expected Result

After successful login:
- ✅ Cookie: `__Secure-next-auth.session-token` (domain: inphysic.com)
- ✅ Redirect to `/dashboard`
- ✅ Session persists

## 🔍 Debug

**If still no session token:**

1. **Check logs:**
   ```bash
   gcloud run services logs tail lmsmath-app --region asia-east1 | grep AUTHORIZE
   ```

2. **Verify user exists:**
   - Did you create account via signup?
   - What email/password are you using?

3. **Check authorize function:**
   - Should see `[AUTHORIZE] called with: {...}`
   - Should see `[AUTHORIZE] looking up user: ...`
   - Should see `[AUTHORIZE] prisma user: true/false`

---

**Status:** ✅ Cookie config updated, ready for testing  
**Next:** Test login in browser and report results








