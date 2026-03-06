# 🧪 Sign-Up Testing Guide

## ✅ Setup Complete - Ready to Test!

All fixes have been applied. Follow this guide to test the sign-up flow.

---

## 🚀 Quick Test (3 Steps)

### Step 1: Ensure Server is Running

```bash
npm run dev
```

Wait for:
```
✓ Ready in Xms
○ Local: http://localhost:3000
```

---

### Step 2: Clear Previous Test User (if needed)

If you get "User already exists" error:

```bash
npm run clear:user huongsiri@gmail.com
```

Output:
```
✅ Deleted user: huongsiri@gmail.com
✅ You can now sign up with this email again!
```

---

### Step 3: Test Sign-Up

1. **Go to:**
   ```
   http://localhost:3000/sign-up
   ```

2. **Fill the form:**
   - Name: `Huong Siri`
   - Email: `huongsiri@gmail.com`
   - Password: `Test123!`
   - Role: `Student`

3. **Click "Sign Up"**

4. **Expected Result:**
   ```
   ✅ "User created successfully"
   ✅ Auto-login (session created)
   ✅ Redirect to /dashboard
   ✅ Dashboard loads
   ✅ User info shows in UI
   ```

---

## 🔍 What Happens Behind The Scenes

### Step-by-Step Flow:

```
1. User clicks "Sign Up"
   ↓
2. POST /api/auth/register
   - Email normalized: huongsiri@gmail.com → huongsiri@gmail.com
   - Password hashed with bcrypt
   - User created in database
   ↓
3. Auto-login triggered
   - signIn("credentials", {...})
   - Session created
   - JWT token issued
   ↓
4. Wait 500ms (for session to propagate)
   ↓
5. Redirect to /dashboard
   - router.push("/dashboard")
   - router.refresh() to load session
   ↓
6. Dashboard loads
   - XPProvider initialized
   - STEMProvider initialized
   - User sees dashboard
```

---

## ✅ Expected Console Logs

### Server Console:
```
Registration attempt: { 
  name: 'Huong Siri', 
  email: 'huongsiri@gmail.com', 
  role: 'STUDENT' 
}
Email normalized: huongsiri@gmail.com → huongsiri@gmail.com
Hashing password...
Password hashed successfully
Creating user...
User created: cmgh7djmc0001prr9qdhhsjub
```

### Browser Console (sign-in page):
```
Session after login: {
  user: {
    id: "cmgh7djmc0001prr9qdhhsjub",
    email: "huongsiri@gmail.com",
    name: "Huong Siri",
    role: "STUDENT"
  }
}
```

---

## ⚠️ Common Issues & Solutions

### Issue #1: 400 Bad Request - "User already exists"

**Cause:** Email already in database

**Solution:**
```bash
npm run clear:user huongsiri@gmail.com
```

Then try sign-up again.

---

### Issue #2: Session is null after auto-login

**Cause:** Session not created yet

**Fix Applied:**
- Added 500ms delay
- Added router.refresh()

**Verify Fix:**
Check browser console for "Session after login:" - should NOT be null

---

### Issue #3: Dashboard shows error

**Cause:** XPProvider or STEMProvider error

**Fix Applied:**
- Error Boundary wraps dashboard
- Suspense for loading states

**Result:**
If error occurs, shows friendly message instead of crashing

---

## 🧪 Advanced Testing

### Test Case 1: Email Case Insensitivity

```bash
# Sign up
Email: HUONGSIRI@GMAIL.COM (uppercase)

# Login
Email: huongsiri@gmail.com (lowercase)

Expected: ✅ Works (both normalized to lowercase)
```

---

### Test Case 2: Whitespace Handling

```bash
Email: "  huongsiri@gmail.com  " (with spaces)

Expected: ✅ Trimmed to "huongsiri@gmail.com"
```

---

### Test Case 3: Duplicate Prevention

```bash
# First sign-up
Email: huongsiri@gmail.com
Result: ✅ Success

# Second sign-up (different case)
Email: HUONGSIRI@GMAIL.COM
Result: ❌ "Email này đã được đăng ký"
```

---

### Test Case 4: Auto-Login and Dashboard

```bash
# After successful sign-up
1. Check browser console
   Expected: Session object (not null)

2. Check URL
   Expected: http://localhost:3000/dashboard

3. Check UI
   Expected: Dashboard loaded, user info visible
```

---

## 📋 Testing Checklist

**Pre-Test:**
- [ ] Server running on port 3000
- [ ] Database accessible
- [ ] .env.local correct (DATABASE_URL="file:./dev.db")

**Sign-Up Test:**
- [ ] Fill form with valid data
- [ ] Submit form
- [ ] Registration successful (no 500 error)
- [ ] Auto-login works (session not null)
- [ ] Dashboard redirects correctly
- [ ] Dashboard loads without error

**Login Test:**
- [ ] Can login with same credentials
- [ ] Case-insensitive email works
- [ ] Whitespace trimmed
- [ ] Redirect based on role works

**Security Test:**
- [ ] Cannot create duplicate email
- [ ] Password hashed in database
- [ ] Session secure (httpOnly cookies)
- [ ] CSRF protection works

---

## 🛠️ Useful Commands

### Clear Specific User
```bash
npm run clear:user <email>

# Example:
npm run clear:user huongsiri@gmail.com
npm run clear:user test@example.com
```

### Check All Users
```bash
npx prisma studio
# Opens GUI to view all users
```

### Test Auth System
```bash
npm run test:auth
# Runs 40 automated tests
```

### View User in Database
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({
  where: { email: 'huongsiri@gmail.com' }
}).then(user => {
  console.log(user);
  prisma.\$disconnect();
});
"
```

---

## 📊 Expected vs Actual

### Before Fixes:
```
Sign-Up → ❌ 500 Error
Login → ❌ 401 Unauthorized  
Dashboard → ❌ Webpack Error
Session → ❌ Null
```

### After Fixes:
```
Sign-Up → ✅ Success + Auto-login
Login → ✅ Works (case-insensitive)
Dashboard → ✅ Loads with error handling
Session → ✅ Valid session object
```

---

## 🎯 Success Criteria

When sign-up works correctly, you should see:

### Browser:
1. ✅ Form submits without error
2. ✅ No 400/500 errors in console
3. ✅ Page redirects to /dashboard
4. ✅ Dashboard shows user info
5. ✅ No webpack/runtime errors

### Server Console:
1. ✅ "Registration attempt" log
2. ✅ "Email normalized" log
3. ✅ "User created" log
4. ✅ No error stack traces

### Database:
1. ✅ User exists with normalized email
2. ✅ Password is hashed
3. ✅ Role is set correctly
4. ✅ emailVerified is null (for credentials)

---

## 🎉 After Successful Test

You should be able to:

1. ✅ Sign up with new email
2. ✅ Auto-login without manual intervention
3. ✅ Access dashboard immediately
4. ✅ See personalized dashboard
5. ✅ Navigate to other pages
6. ✅ Sign out and sign in again
7. ✅ Login with different email case

---

## 📞 If Issues Persist

### 1. Check Server Logs
Look for specific error messages

### 2. Check Browser Console
Look for "Session after login:" - should not be null

### 3. Check Database
```bash
npx prisma studio
```
Verify user was created

### 4. Clear Browser Cache
```
Ctrl + Shift + R (hard refresh)
```

### 5. Restart Server
```bash
# Kill all
pkill -f "next dev"

# Start fresh
npm run dev
```

### 6. Run Tests
```bash
npm run test:auth
# Should show 40/40 passing
```

---

## 💡 Pro Tips

### Tip 1: Use Clear User Script
```bash
# Before each test
npm run clear:user huongsiri@gmail.com

# Then sign up fresh
```

### Tip 2: Test Different Roles
```bash
# Sign up as TEACHER
Role: Teacher

# Sign up as STUDENT  
Role: Student

# Note: ADMIN must be created via database
```

### Tip 3: Check Session in Real-Time
```bash
# In browser console:
fetch('/api/auth/session').then(r => r.json()).then(console.log)

# Should show session object
```

---

## 📚 Related Documentation

- `SIGNUP_DASHBOARD_FIX.md` - Complete fix details
- `AUTH_ALL_FIXES_COMPLETE.md` - All fixes summary
- `README_AUTH_FIXES.md` - Quick overview
- `AUTH_TESTING_GUIDE.md` - Complete testing guide

---

## ✅ Final Checklist

Before considering testing complete:

- [ ] Sign-up works without errors
- [ ] Auto-login creates valid session
- [ ] Dashboard loads successfully
- [ ] Can login again after sign-up
- [ ] Email case-insensitive
- [ ] Duplicate email prevented
- [ ] Error messages clear
- [ ] All 40 tests passing

---

## 🎊 READY TO TEST!

**Commands:**
```bash
# Clear old user (if needed)
npm run clear:user huongsiri@gmail.com

# Ensure server is running
npm run dev

# Test at:
http://localhost:3000/sign-up
```

**Expected Flow:**
```
Sign Up → Auto-Login → Dashboard → Success! ✅
```

---

**Created:** October 7, 2025  
**Status:** ✅ Ready for Testing  
**All Fixes:** Applied ✅


