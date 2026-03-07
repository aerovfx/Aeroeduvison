# 🔐 NextAuth Session Testing - Complete Checklist

## Test Session: $(date)

---

## ✅ TEST 1: MARKETING PAGES ACCESS (Unauthenticated)

### 1.1. Homepage Access
- [ ] Navigate to `http://localhost:3000/`
- **Expected**: ✅ Homepage loads with AeroEdu landing page
- **Actual**: _____________

### 1.2. Pricing Page Access
- [ ] Navigate to `http://localhost:3000/pricing`
- **Expected**: ✅ Pricing page loads with 3 tiers
- **Actual**: _____________

### 1.3. Contact Sales Access
- [ ] Navigate to `http://localhost:3000/contact-sales`
- **Expected**: ✅ Contact form loads
- **Actual**: _____________

---

## ✅ TEST 2: AUTH PAGES ACCESS (Unauthenticated)

### 2.1. Login Page Access
- [ ] Navigate to `http://localhost:3000/auth/login`
- **Expected**: ✅ Login form loads
- **Actual**: _____________

### 2.2. Signup Page Access
- [ ] Navigate to `http://localhost:3000/auth/signup`
- **Expected**: ✅ Signup form loads
- **Actual**: _____________

---

## ✅ TEST 3: CREDENTIALS LOGIN

### 3.1. Valid Credentials Login (Student)
```bash
# Test account
Email: student@example.com
Password: password123
```
- [ ] Enter credentials and submit
- **Expected**: 
  - ✅ Login successful
  - 🔄 Redirect to `/dashboard`
  - ✅ Session cookie created
- **Actual**: _____________
- **Cookie Check**: `next-auth.session-token` = _____________

### 3.2. Invalid Email
```bash
Email: invalid@example.com
Password: password123
```
- [ ] Try to login
- **Expected**: ❌ Error message "Email hoặc mật khẩu không đúng"
- **Actual**: _____________

### 3.3. Invalid Password
```bash
Email: student@example.com
Password: wrongpassword
```
- [ ] Try to login
- **Expected**: ❌ Error message "Email hoặc mật khẩu không đúng"
- **Actual**: _____________

### 3.4. Empty Fields
- [ ] Submit empty form
- **Expected**: ❌ Validation errors
- **Actual**: _____________

---

## ✅ TEST 4: AUTHENTICATED USER REDIRECT

### 4.1. Try Access Marketing Pages (Logged In)
**Precondition**: Logged in as student@example.com

- [ ] Navigate to `http://localhost:3000/`
- **Expected**: 🔄 Auto-redirect to `/dashboard`
- **Console Log**: `🔒 [MIDDLEWARE] Authenticated user trying to access /, redirecting to dashboard`
- **Actual**: _____________

- [ ] Navigate to `http://localhost:3000/pricing`
- **Expected**: 🔄 Auto-redirect to `/dashboard`
- **Actual**: _____________

- [ ] Navigate to `http://localhost:3000/auth/login`
- **Expected**: 🔄 Auto-redirect to `/dashboard`
- **Actual**: _____________

---

## ✅ TEST 5: PROTECTED ROUTES ACCESS

### 5.1. Dashboard Access (Authenticated)
**Precondition**: Logged in as student

- [ ] Navigate to `http://localhost:3000/dashboard`
- **Expected**: ✅ Dashboard loads successfully
- **Actual**: _____________

### 5.2. Learning Paths Access
- [ ] Navigate to `http://localhost:3000/learning-paths`
- **Expected**: ✅ Learning paths page loads
- **Actual**: _____________

### 5.3. AI Tutor Access
- [ ] Navigate to `http://localhost:3000/ai-tutor`
- **Expected**: ✅ AI Tutor page loads
- **Actual**: _____________

---

## ✅ TEST 6: PROTECTED ROUTES (Unauthenticated)

### 6.1. Try Access Dashboard (Logged Out)
**Precondition**: Logged out

- [ ] Navigate to `http://localhost:3000/dashboard`
- **Expected**: 
  - 🔄 Redirect to `/auth/login?callbackUrl=/dashboard`
  - 📝 Console: `🚫 [MIDDLEWARE] Unauthenticated access to /dashboard, redirecting to login`
- **Actual**: _____________

### 6.2. Login and Callback
- [ ] Login from callback URL
- **Expected**: 🔄 After login, redirect back to `/dashboard`
- **Actual**: _____________

---

## ✅ TEST 7: ROLE-BASED ACCESS (STUDENT)

**Precondition**: Logged in as `student@example.com`

### 7.1. Student Access to Dashboard
- [ ] Access `/dashboard`
- **Expected**: ✅ Access granted
- **Actual**: _____________

### 7.2. Student Try Access Teacher Routes
- [ ] Navigate to `http://localhost:3000/teacher/courses`
- **Expected**: 
  - ❌ Access denied
  - 🔄 Redirect to `/dashboard`
  - 📝 Console: `🚫 [MIDDLEWARE] Non-teacher user trying to access /teacher/courses, forbidden`
- **Actual**: _____________

### 7.3. Student Try Access Admin Routes
- [ ] Navigate to `http://localhost:3000/admin/dashboard`
- **Expected**: 
  - ❌ Access denied
  - 🔄 Redirect to `/dashboard`
  - 📝 Console: `🚫 [MIDDLEWARE] Non-admin user trying to access /admin/dashboard, forbidden`
- **Actual**: _____________

---

## ✅ TEST 8: SESSION VALIDATION

### 8.1. Check Session API
```bash
curl http://localhost:3000/api/auth/session
```
**Expected Response** (when logged in):
```json
{
  "user": {
    "id": "...",
    "email": "student@example.com",
    "name": "Student User",
    "role": "STUDENT",
    "image": null
  },
  "expires": "..."
}
```
- **Actual**: _____________

### 8.2. Check Session API (Logged Out)
```bash
curl http://localhost:3000/api/auth/session
```
**Expected Response**:
```json
{}
```
- **Actual**: _____________

---

## ✅ TEST 9: SESSION PERSISTENCE

### 9.1. Close Browser and Reopen
- [ ] Login as student
- [ ] Close browser completely
- [ ] Reopen browser and go to `/dashboard`
- **Expected**: ✅ Still logged in (session persists for 30 days)
- **Actual**: _____________

### 9.2. Check Cookie Expiration
- [ ] Open DevTools → Application → Cookies
- [ ] Find `next-auth.session-token`
- **Expected Expiry**: ~30 days from login
- **Actual Expiry**: _____________

---

## ✅ TEST 10: JWT TOKEN VALIDATION

### 10.1. Manually Corrupt JWT Token
**Steps**:
1. Login as student
2. Open DevTools → Application → Cookies
3. Edit `next-auth.session-token` cookie (change a few characters)
4. Refresh page

- **Expected**: 
  - ❌ Session invalid
  - 🔄 Redirect to login
- **Actual**: _____________

---

## ✅ TEST 11: LOGOUT FUNCTIONALITY

### 11.1. Logout Process
**Precondition**: Logged in

- [ ] Click logout button in dashboard
- **Expected**:
  - ✅ Session cleared
  - ✅ Cookie deleted
  - 🔄 Redirect to `/auth/login`
- **Actual**: _____________

### 11.2. Try Access Protected Route After Logout
- [ ] Navigate to `/dashboard`
- **Expected**: 🔄 Redirect to login
- **Actual**: _____________

---

## ✅ TEST 12: GOOGLE OAUTH (Optional)

### 12.1. Google Login (New User)
- [ ] Click "Đăng nhập với Google"
- [ ] Authorize with Google account
- **Expected**:
  - ✅ New user created with role STUDENT
  - 🔄 Redirect to `/dashboard`
  - ✅ User data saved to database
- **Actual**: _____________

### 12.2. Google Login (Existing User)
- [ ] Login with same Google account
- **Expected**:
  - ✅ Login successful
  - ✅ User data updated (name, image)
  - 🔄 Redirect to `/dashboard`
- **Actual**: _____________

---

## ✅ TEST 13: EDGE CASES

### 13.1. SQL Injection Attempt
```bash
Email: admin' OR '1'='1
Password: password
```
- [ ] Try to login
- **Expected**: ❌ Login fails (not vulnerable)
- **Actual**: _____________

### 13.2. XSS Attempt in Name Field (Signup)
```javascript
Name: <script>alert('xss')</script>
```
- [ ] Try to signup
- **Expected**: ✅ Name saved as plain text (escaped)
- **Actual**: _____________

### 13.3. Case Insensitive Email
- [ ] Login with `STUDENT@EXAMPLE.COM` (uppercase)
- **Expected**: ✅ Login successful (email normalized to lowercase)
- **Actual**: _____________

### 13.4. Concurrent Sessions
- [ ] Login in Chrome as student
- [ ] Login in Firefox as teacher (different account)
- **Expected**: ✅ Both sessions work independently
- **Actual**: _____________

---

## ✅ TEST 14: MIDDLEWARE LOGS

### 14.1. Check Terminal Logs
**Look for these logs in terminal**:

When authenticated user tries marketing page:
```
🔒 [MIDDLEWARE] Authenticated user trying to access /, redirecting to dashboard
```

When unauthenticated tries protected route:
```
🚫 [MIDDLEWARE] Unauthenticated access to /dashboard, redirecting to login
```

When non-admin tries admin route:
```
🚫 [MIDDLEWARE] Non-admin user trying to access /admin/dashboard, forbidden
```

- **Logs Found**: _____________

---

## 📊 TEST SUMMARY

| Test Category | Passed | Failed | Total |
|--------------|--------|--------|-------|
| Marketing Pages | __ / 3 | __ | 3 |
| Auth Pages | __ / 2 | __ | 2 |
| Credentials Login | __ / 4 | __ | 4 |
| Redirects | __ / 3 | __ | 3 |
| Protected Routes | __ / 5 | __ | 5 |
| Role-Based Access | __ / 3 | __ | 3 |
| Session Validation | __ / 2 | __ | 2 |
| Session Persistence | __ / 2 | __ | 2 |
| JWT Validation | __ / 1 | __ | 1 |
| Logout | __ / 2 | __ | 2 |
| Google OAuth | __ / 2 | __ | 2 |
| Edge Cases | __ / 4 | __ | 4 |
| Middleware Logs | __ / 1 | __ | 1 |
| **TOTAL** | **__ / 34** | **__** | **34** |

---

## 🐛 ISSUES FOUND

1. Issue: _____________
   - Severity: Critical / High / Medium / Low
   - Fix: _____________

2. Issue: _____________
   - Severity: Critical / High / Medium / Low
   - Fix: _____________

---

## ✅ VERIFICATION CHECKLIST

- [ ] All marketing pages accessible to guests only
- [ ] Authenticated users cannot access marketing/auth pages
- [ ] Protected routes require authentication
- [ ] Role-based access works correctly (Student/Teacher/Admin)
- [ ] Session persists for 30 days
- [ ] Invalid credentials handled properly
- [ ] JWT tokens validated correctly
- [ ] Logout clears session completely
- [ ] Google OAuth creates/updates users correctly
- [ ] Middleware logs showing correct behavior
- [ ] No security vulnerabilities (SQL injection, XSS)
- [ ] Case-insensitive email login works

---

## 📝 NOTES & OBSERVATIONS

_____________________________________________
_____________________________________________
_____________________________________________

---

## ✅ FINAL VERDICT

- [ ] **PASS** - All tests passed, system ready for production
- [ ] **PASS WITH ISSUES** - Minor issues found, acceptable for release
- [ ] **FAIL** - Critical issues found, requires fixes before release

**Tested by**: _____________
**Date**: $(date)
**Environment**: Development (localhost:3000)
**Next.js Version**: 15.5.4
**NextAuth Version**: Check package.json

---
