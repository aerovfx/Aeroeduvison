# 🔧 Sign-Up Debug & Fix - Final Version

## ✅ Improvements Applied

### 1. Enhanced Debug Logging

Added comprehensive console logging to track the entire sign-up flow:

```typescript
🔄 Starting registration...
📬 Registration response: { status, data }
✅ Registration successful, starting auto-login...
🔐 Login result: { ... }
📊 Session after login: { user: {...} }
✅ Session valid, redirecting to dashboard...
```

### 2. Better Error Handling

- ✅ Only auto-login if `response.ok && data.userId`
- ✅ Verify session before redirecting
- ✅ Specific error messages in Vietnamese
- ✅ Fallback redirects if auto-login fails

### 3. Session Validation

- ✅ Wait 1000ms for session to propagate
- ✅ Fetch `/api/auth/session` to verify
- ✅ Check `session?.user` exists
- ✅ Only redirect if session is valid

---

## 🧪 Test Now

### Step 1: Refresh Browser

Hard refresh the sign-up page:
```
Ctrl + Shift + R
```

### Step 2: Open Browser Console

```
F12 → Console tab
```

### Step 3: Fill Form & Submit

```
Name: Huong Siri
Email: huongsiri@gmail.com
Password: Test123!
Role: Student
```

Click "Sign Up"

### Step 4: Watch Console Logs

You should see:
```
🔄 Starting registration... {email: "huongsiri@gmail.com", name: "Huong Siri"}
📬 Registration response: {status: 201, data: {message: "...", userId: "..."}}
✅ Registration successful, starting auto-login...
🔐 Login result: {ok: true, status: 200, url: "..."}
✅ Auto-login successful, checking session...
📊 Session after login: {user: {id: "...", email: "...", role: "STUDENT"}}
✅ Session valid, redirecting to dashboard...
```

### Step 5: Verify Result

- ✅ URL is `/dashboard`
- ✅ Dashboard loads
- ✅ User info shows
- ✅ No errors!

---

## 🔍 Troubleshooting

### If You See: "❌ Registration failed"

**Check console for:**
```
📬 Registration response: {status: 400/500, data: {error: "..."}}
```

**Possible causes:**
1. User already exists → Clear user first: `npm run clear:user <email>`
2. Server error → Check server console
3. Network error → Check server is running

---

### If You See: "❌ Auto-login failed"

**Check console for:**
```
🔐 Login result: {error: "CredentialsSignin"}
```

**Possible causes:**
1. Password mismatch → Check registration saved correct password
2. Email mismatch → Check email normalization
3. Database issue → Verify user exists

**Fix:**
```bash
# Check if user exists
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({where: {email: 'huongsiri@gmail.com'}})
  .then(u => console.log(u ? '✅ User exists' : '❌ User not found'))
  .finally(() => prisma.\$disconnect());
"
```

---

### If You See: "⚠️ Session not created"

**Check console for:**
```
📊 Session after login: {}  // Empty object, no user
```

**Possible causes:**
1. JWT not created → Check NEXTAUTH_SECRET
2. Cookie not set → Check browser allows cookies
3. Session callback error → Check lib/auth.ts callbacks

**Fix:**
```bash
# Verify NEXTAUTH_SECRET exists
grep NEXTAUTH_SECRET .env .env.local

# Should show a secret (32+ characters)
```

---

## 📊 Debug Checklist

After clicking "Sign Up", check:

### Browser Console:
- [ ] "🔄 Starting registration" appears
- [ ] "📬 Registration response" shows status 201
- [ ] "✅ Registration successful" appears
- [ ] "🔐 Login result" shows ok: true
- [ ] "📊 Session after login" shows user object (NOT null)
- [ ] "✅ Session valid" appears
- [ ] No error emojis (❌, ⚠️)

### Server Console:
- [ ] "Registration attempt" log
- [ ] "Email normalized" log
- [ ] "User created" log
- [ ] No error stack traces

### Browser Network Tab:
- [ ] POST /api/auth/register → 201 Created
- [ ] POST /api/auth/callback/credentials → 200 OK (NOT 401)
- [ ] GET /api/auth/session → 200 OK with user data

---

## ✅ Expected Flow

### Success Path:
```
User fills form
  ↓
POST /api/auth/register → 201 ✅
  ↓
User created in database ✅
  ↓
Auto-login triggered (signIn) ✅
  ↓
POST /api/auth/callback/credentials → 200 ✅
  ↓
Wait 1000ms ⏱️
  ↓
GET /api/auth/session → {user: {...}} ✅
  ↓
Redirect to /dashboard ✅
  ↓
Dashboard loads ✅
```

### Failure Path (Graceful):
```
User fills form
  ↓
POST /api/auth/register → 400/500 ❌
  ↓
Show error message ⚠️
  ↓
User sees error, can try again
```

---

## 🛠️ Quick Fixes

### If Registration Fails:
```bash
# Check server is running
curl http://localhost:3000/api/auth/providers

# Check database
npx prisma studio
```

### If Auto-Login Fails:
```bash
# Test login manually
# Go to /sign-in
# Use same credentials
# Should work!
```

### If Session is Null:
```bash
# Check environment
cat .env | grep NEXTAUTH_SECRET

# Restart server
npm run dev
```

---

## 📞 Support Commands

```bash
# Clear user for retry
npm run clear:user huongsiri@gmail.com

# Test auth system
npm run test:auth

# Verify all fixes
npm run test:auth:verify

# Check database
npx prisma studio
```

---

## 🎯 Success Criteria

Sign-up is working when you see ALL of these:

✅ Registration console logs (🔄, 📬, ✅)  
✅ Login console logs (🔐, ✅)  
✅ Session console logs (📊, ✅)  
✅ Redirect to dashboard  
✅ Dashboard loads  
✅ User info visible  
✅ No 401/500 errors  

---

## 🎉 Next Steps After Success

Once sign-up works:

1. **Test Login Separately:**
   - Sign out
   - Sign in with huongsiri@gmail.com
   - Should work ✅

2. **Test Case-Insensitive:**
   - Sign out
   - Sign in with HUONGSIRI@GMAIL.COM
   - Should work ✅

3. **Test Duplicate Prevention:**
   - Try to sign up again with huongsiri@gmail.com
   - Should show "Email đã được đăng ký" ✅

---

**NOW TEST AT:** `http://localhost:3000/sign-up`

**Watch browser console** for detailed debug logs! 🔍

---

**Created:** October 7, 2025  
**Status:** ✅ Enhanced Debug Logging  
**Action:** Test and observe console logs


