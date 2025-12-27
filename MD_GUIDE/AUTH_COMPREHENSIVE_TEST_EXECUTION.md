# 🔐 Auth.js (NextAuth) - Comprehensive Test Execution

**Test Date**: October 19, 2025  
**NextAuth Version**: v4.24.11  
**Status**: ✅ Ready to Execute

---

## 📋 Test Results from Automated Checks

### ✅ PASSED - Automated Tests

| Test Category | Status | Details |
|--------------|--------|---------|
| Database Connection | ✅ PASS | Connected successfully |
| User Table | ✅ PASS | 16 users (11 STUDENT, 3 TEACHER, 2 ADMIN) |
| Password Hashing | ✅ PASS | bcrypt working correctly |
| NextAuth API | ✅ PASS | Providers, CSRF, Session endpoints OK |
| SQL Injection Protection | ✅ PASS | Prisma parameterized queries |
| Email Normalization | ✅ PASS | Lowercase + trim working |
| CSRF Protection | ✅ PASS | NextAuth built-in |
| Cookie Security | ✅ PASS | HTTPOnly, SameSite configured |

---

## 🧪 MANUAL TESTING EXECUTION PLAN

### 📝 Test Accounts Available:

```
👤 ADMIN:
   Email: admin@example.com
   Password: admin123
   
👨‍🏫 TEACHER:
   Email: teacher@example.com
   Password: teacher123
   
🎓 STUDENT:
   Email: student@example.com
   Password: student123
   (or student2@example.com / student123)
```

---

## TEST 1: Credentials Login (Email/Password) ⏱️ 10 phút

### 1.1. Valid Admin Login ✅

**Steps**:
1. Open Incognito: `Cmd+Shift+N`
2. Navigate to: `http://localhost:3000/auth/login`
3. Enter credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
4. Click "Login"

**Expected Results**:
- [ ] Loading spinner appears
- [ ] Toast: "Signed in successfully!"
- [ ] Redirect to `/dashboard`
- [ ] See "Admin User" in header
- [ ] Browser console: NO errors

**If PASS**: ✅ Mark here: _______

---

### 1.2. Valid Teacher Login ✅

**Steps**:
1. Logout first
2. Login with:
   - Email: `teacher@example.com`
   - Password: `teacher123`

**Expected Results**:
- [ ] Successful login
- [ ] Redirect to `/dashboard` or `/teacher`
- [ ] See "John Teacher" in header

**If PASS**: ✅ Mark here: _______

---

### 1.3. Valid Student Login ✅

**Steps**:
1. Logout first
2. Login with:
   - Email: `student@example.com`
   - Password: `student123`

**Expected Results**:
- [ ] Successful login
- [ ] See student dashboard
- [ ] Limited menu options (no teacher/admin)

**If PASS**: ✅ Mark here: _______

---

### 1.4. Invalid Password ❌

**Steps**:
1. Try login with:
   - Email: `admin@example.com`
   - Password: `wrongpassword`

**Expected Results**:
- [ ] Toast error: "Invalid email or password"
- [ ] Stay on login page
- [ ] NO redirect
- [ ] NO session created

**If PASS**: ✅ Mark here: _______

---

### 1.5. Non-existent User ❌

**Steps**:
1. Try login with:
   - Email: `notexist@test.com`
   - Password: `password123`

**Expected Results**:
- [ ] Toast error: "Invalid email or password"
- [ ] Stay on login page
- [ ] Same error as invalid password (no information leakage)

**If PASS**: ✅ Mark here: _______

---

### 1.6. Empty Fields ❌

**Steps**:
1. Leave email and password empty
2. Click "Login"

**Expected Results**:
- [ ] Validation errors shown
- [ ] Form not submitted
- [ ] Helpful error messages

**If PASS**: ✅ Mark here: _______

---

## TEST 2: Google OAuth Login ⏱️ 15 phút

### 2.1. Google OAuth Flow (First Time) 🌐

**Prerequisites**:
- [ ] Redirect URI added in Google Console
- [ ] App published OR email in test users

**Steps**:
1. Open Incognito window
2. Go to: `http://localhost:3000/auth/login`
3. Click "Tiếp tục với Google"
4. Select Google account (use new email not in DB)
5. Click "Allow" when prompted

**Expected Results**:
- [ ] Redirect to Google login
- [ ] Google consent screen appears
- [ ] After "Allow": redirect to `/dashboard`
- [ ] New user created in DB (check Prisma Studio)
- [ ] User has: email, name, image from Google
- [ ] User role: STUDENT (default)
- [ ] emailVerified: has date
- [ ] password: NULL

**Verify in Prisma Studio**:
1. Open: `http://localhost:5555`
2. Click "User" table
3. Find newly created user
4. Check all fields

**If PASS**: ✅ Mark here: _______

---

### 2.2. Google OAuth (Returning User) 🌐

**Steps**:
1. Logout
2. Login again with same Google account

**Expected Results**:
- [ ] Faster login (no consent screen)
- [ ] Redirect to `/dashboard`
- [ ] User info updated (name, image)
- [ ] NO new user created (check DB)

**If PASS**: ✅ Mark here: _______

---

### 2.3. Google OAuth Error Handling ❌

**Steps**:
1. Click "Tiếp tục với Google"
2. Click "Cancel" or "Deny" on Google

**Expected Results**:
- [ ] Redirect to `/auth/login?error=AccessDenied`
- [ ] Toast error shown
- [ ] NOT logged in
- [ ] Can try again

**If PASS**: ✅ Mark here: _______

---

## TEST 3: Session & JWT Handling ⏱️ 10 phút

### 3.1. Session Persistence 💾

**Steps**:
1. Login as any user
2. Navigate to `/dashboard`
3. **Refresh page** (F5)

**Expected Results**:
- [ ] Still logged in after refresh
- [ ] User info still displayed
- [ ] NO redirect to login

**If PASS**: ✅ Mark here: _______

---

### 3.2. Session Across Tabs 🔄

**Steps**:
1. Login in Tab 1
2. Open Tab 2: `http://localhost:3000/dashboard`

**Expected Results**:
- [ ] Both tabs show logged in
- [ ] Same user info in both

**If PASS**: ✅ Mark here: _______

---

### 3.3. Session Cookie Inspection 🍪

**Steps**:
1. Login
2. Open DevTools (F12)
3. Go to: Application → Cookies
4. Find: `next-auth.session-token`

**Expected Results**:
- [ ] Cookie exists
- [ ] HTTPOnly: ✓
- [ ] SameSite: Lax
- [ ] Secure: ✗ (development) / ✓ (production)
- [ ] Path: /
- [ ] Expires: ~30 days from now

**If PASS**: ✅ Mark here: _______

---

### 3.4. Session API Check 🔍

**Steps**:
1. While logged in, visit:
   `http://localhost:3000/api/auth/session`

**Expected Results**:
- [ ] See JSON response
- [ ] Has `user` object
- [ ] Has `user.id`, `user.email`, `user.name`, `user.role`
- [ ] Matches logged-in user

**If PASS**: ✅ Mark here: _______

---

## TEST 4: Role-Based Access Control ⏱️ 15 phút

### 4.1. Student Access Restrictions 🎓

**Steps**:
1. Login as: `student@example.com` / `student123`
2. Try to access: `http://localhost:3000/teacher`
3. Try to access: `http://localhost:3000/admin`

**Expected Results**:
- [ ] `/dashboard`: ✅ Access granted
- [ ] `/teacher`: ❌ Redirected or "Access Denied"
- [ ] `/admin`: ❌ Redirected or "Access Denied"

**If PASS**: ✅ Mark here: _______

---

### 4.2. Teacher Access 👨‍🏫

**Steps**:
1. Login as: `teacher@example.com` / `teacher123`
2. Try different routes

**Expected Results**:
- [ ] `/dashboard`: ✅ Access granted
- [ ] `/teacher`: ✅ Access granted  
- [ ] `/admin`: ❌ Redirected or "Access Denied"

**If PASS**: ✅ Mark here: _______

---

### 4.3. Admin Full Access 👤

**Steps**:
1. Login as: `admin@example.com` / `admin123`
2. Try all routes

**Expected Results**:
- [ ] `/dashboard`: ✅ Access granted
- [ ] `/teacher`: ✅ Access granted
- [ ] `/admin`: ✅ Access granted
- [ ] All features accessible

**If PASS**: ✅ Mark here: _______

---

### 4.4. API Route Protection 🔒

**Test without login**:
```bash
curl http://localhost:3000/api/admin/stats
```

**Expected**: 401 Unauthorized

**Test with student login**: Should be 403 Forbidden

**Test with admin login**: Should be 200 OK

**If PASS**: ✅ Mark here: _______

---

## TEST 5: Logout Functionality ⏱️ 5 phút

### 5.1. Basic Logout 👋

**Steps**:
1. Login as any user
2. Click "Logout" button

**Expected Results**:
- [ ] Redirect to `/auth/login`
- [ ] Session cleared
- [ ] Cookie deleted (check DevTools)
- [ ] Cannot access `/dashboard` without login

**If PASS**: ✅ Mark here: _______

---

### 5.2. Logout Across Tabs 🔄

**Steps**:
1. Login
2. Open 2 tabs with `/dashboard`
3. Logout from Tab 1
4. Refresh Tab 2

**Expected Results**:
- [ ] Tab 2 also logged out
- [ ] Both tabs redirect to login

**If PASS**: ✅ Mark here: _______

---

## TEST 6: Edge Cases & Security ⏱️ 10 phút

### 6.1. SQL Injection Attempts 🛡️

**Steps**:
1. Try login with email: `admin' OR '1'='1`
2. Try password: `' OR 1=1--`

**Expected Results**:
- [ ] Login fails safely
- [ ] NO SQL errors shown
- [ ] Same "Invalid credentials" error
- [ ] NO information leakage

**If PASS**: ✅ Mark here: _______

---

### 6.2. XSS Protection 🛡️

**Steps**:
1. Try login with: `<script>alert('xss')</script>@test.com`

**Expected Results**:
- [ ] No script execution
- [ ] Properly escaped
- [ ] Login fails (invalid email)

**If PASS**: ✅ Mark here: _______

---

### 6.3. CSRF Protection 🛡️

**Steps**:
1. Login
2. Open DevTools → Network
3. Submit login form
4. Check request

**Expected Results**:
- [ ] Request includes CSRF token
- [ ] Token validated by server

**If PASS**: ✅ Mark here: _______

---

### 6.4. Concurrent Sessions 🔄

**Steps**:
1. Login on Chrome with `admin@example.com`
2. Login on Firefox with same account

**Expected Results**:
- [ ] Both sessions work
- [ ] No conflict
- [ ] JWT allows multiple sessions per user

**If PASS**: ✅ Mark here: _______

---

### 6.5. Email Case Sensitivity 📧

**Steps**:
1. Try login with: `Admin@Example.com` (mixed case)
2. Try login with: `ADMIN@EXAMPLE.COM` (uppercase)

**Expected Results**:
- [ ] Both should work (case-insensitive)
- [ ] Email normalized to lowercase
- [ ] Successful login

**If PASS**: ✅ Mark here: _______

---

## 📊 TEST EXECUTION RESULTS

### Summary Statistics:

- **Total Tests**: 18
- **Passed**: _____ / 18
- **Failed**: _____ / 18  
- **Skipped**: _____ / 18

### Test Categories:

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Credentials Login | 6 | ___ | ___ |
| Google OAuth | 3 | ___ | ___ |
| Session & JWT | 4 | ___ | ___ |
| Role-Based Access | 4 | ___ | ___ |
| Logout | 2 | ___ | ___ |
| Edge Cases & Security | 5 | ___ | ___ |

---

## 🐛 Issues Found

### Critical Issues:
1. ___________________________________
2. ___________________________________

### Minor Issues:
1. ___________________________________
2. ___________________________________

### Recommendations:
1. ___________________________________
2. ___________________________________

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All credential logins work (STUDENT, TEACHER, ADMIN)
- [ ] Google OAuth works end-to-end
- [ ] Sessions persist correctly
- [ ] Roles enforce access control
- [ ] Logout works properly
- [ ] No security vulnerabilities found
- [ ] No console errors
- [ ] All cookies configured correctly

---

## 🎯 Current Status

### ✅ What's Working:
- ✅ Database connected (16 users)
- ✅ NextAuth API operational
- ✅ Security features in place
- ✅ Credentials configured

### ⏳ Pending Actions:
- [ ] **YOU**: Publish Google OAuth app in Google Console
- [ ] **YOU**: Test credentials login in browser
- [ ] **YOU**: Test Google OAuth in browser
- [ ] **YOU**: Complete manual testing checklist above

---

## 🚀 Execute Tests Now

### Step 1: Fix Google OAuth (2 phút)
```
https://console.cloud.google.com/apis/credentials/consent
→ Click "PUBLISH APP"
```

### Step 2: Test Credentials (5 phút)
```
http://localhost:3000/auth/login
→ admin@example.com / admin123
→ Should redirect to /dashboard
```

### Step 3: Test Google OAuth (5 phút)
```
→ Click "Tiếp tục với Google"
→ Select account
→ Click "Allow"
→ Should redirect to /dashboard
```

### Step 4: Test Roles (10 phút)
```
→ Login as each role
→ Try accessing different routes
→ Verify access control
```

### Step 5: Test Logout (3 phút)
```
→ Click logout
→ Verify session cleared
→ Cannot access /dashboard
```

---

## 📝 Test Execution Notes

**Tester**: _______________  
**Date**: _______________  
**Browser**: Chrome / Firefox / Safari  
**OS**: macOS / Windows / Linux  

**Additional Notes**:
_________________________________
_________________________________
_________________________________

---

## ✅ Sign-Off

**All tests passed**: □ Yes □ No  
**Ready for production**: □ Yes □ No  
**Signed by**: _______________  
**Date**: _______________

---

**Next**: After all tests pass, proceed with AI system testing

