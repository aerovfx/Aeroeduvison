# 🧪 Auth.js (NextAuth) - Manual Test Checklist

**Test Date**: _______________  
**Tester**: _______________  
**Environment**: □ Development □ Staging □ Production

---

## 📋 Pre-Test Setup

### 1. Create Test Users
```bash
# Run this first to create test users
npm run tsx scripts/create-test-users.ts
```

**Test Accounts Created**:
- ✅ `student@test.com` / `password123` (STUDENT)
- ✅ `teacher@test.com` / `password123` (TEACHER)
- ✅ `admin@test.com` / `password123` (ADMIN)

### 2. Start Server
```bash
npm run dev
```

### 3. Open Browser
- Chrome/Firefox in normal mode
- Chrome Incognito for isolated tests

---

## ✅ TEST 1: Credentials Login (Email/Password)

### 1.1. Valid Student Login
- [ ] Go to: http://localhost:3000/auth/login
- [ ] Enter: `student@test.com` / `password123`
- [ ] Click "Login"
- [ ] **Expected**: Redirect to `/dashboard`
- [ ] **Expected**: See student name in header
- [ ] **Expected**: See student-specific dashboard

### 1.2. Valid Teacher Login
- [ ] Logout first
- [ ] Go to: http://localhost:3000/auth/login
- [ ] Enter: `teacher@test.com` / `password123`
- [ ] Click "Login"
- [ ] **Expected**: Redirect to `/dashboard` or `/teacher`
- [ ] **Expected**: See teacher-specific features

### 1.3. Valid Admin Login
- [ ] Logout first
- [ ] Go to: http://localhost:3000/auth/login
- [ ] Enter: `admin@test.com` / `password123`
- [ ] Click "Login"
- [ ] **Expected**: Redirect to admin dashboard
- [ ] **Expected**: See admin-specific features

### 1.4. Invalid Password
- [ ] Go to: http://localhost:3000/auth/login
- [ ] Enter: `student@test.com` / `wrongpassword`
- [ ] Click "Login"
- [ ] **Expected**: Error toast: "Invalid email or password"
- [ ] **Expected**: Stay on login page
- [ ] **Expected**: No redirect

### 1.5. Non-existent User
- [ ] Enter: `nonexistent@test.com` / `password123`
- [ ] Click "Login"
- [ ] **Expected**: Error toast: "Invalid email or password"
- [ ] **Expected**: Stay on login page

### 1.6. Empty Fields
- [ ] Leave email and password empty
- [ ] Click "Login"
- [ ] **Expected**: Validation errors shown
- [ ] **Expected**: Form not submitted

### 1.7. Invalid Email Format
- [ ] Enter: `invalidemail` / `password123`
- [ ] Click "Login"
- [ ] **Expected**: Email validation error
- [ ] **Expected**: Form not submitted

---

## ✅ TEST 2: Google OAuth Login

### 2.1. Google OAuth Flow (First Time)
- [ ] Go to: http://localhost:3000/auth/login
- [ ] Click "Tiếp tục với Google"
- [ ] **Expected**: Redirect to Google login page
- [ ] Select a Google account (not previously used)
- [ ] **Expected**: Google consent screen appears
- [ ] Click "Allow"
- [ ] **Expected**: Redirect back to `/dashboard`
- [ ] **Expected**: User created in database
- [ ] **Expected**: Role = STUDENT (default)

### 2.2. Google OAuth (Returning User)
- [ ] Logout
- [ ] Click "Tiếp tục với Google"
- [ ] Select same Google account
- [ ] **Expected**: Faster login (no consent screen)
- [ ] **Expected**: Redirect to `/dashboard`
- [ ] **Expected**: User info updated (name, image)

### 2.3. Google OAuth (Click Deny)
- [ ] Logout
- [ ] Click "Tiếp tục với Google"
- [ ] Click "Cancel" or "Deny" on Google consent
- [ ] **Expected**: Redirect to `/auth/login?error=AccessDenied`
- [ ] **Expected**: Error toast shown
- [ ] **Expected**: Not logged in

### 2.4. Check Google User in Database
- [ ] Run: `npx prisma studio`
- [ ] Open `User` table
- [ ] Find user with Google email
- [ ] **Expected**: `emailVerified` has date
- [ ] **Expected**: `password` is NULL
- [ ] **Expected**: `image` has Google avatar URL
- [ ] **Expected**: `name` from Google profile

---

## ✅ TEST 3: Session & JWT Management

### 3.1. Session Persistence
- [ ] Login with any account
- [ ] Go to dashboard
- [ ] **Refresh page** (F5)
- [ ] **Expected**: Still logged in
- [ ] **Expected**: User info still shown
- [ ] **Expected**: No redirect to login

### 3.2. Session Across Tabs
- [ ] Login in Tab 1
- [ ] Open Tab 2: http://localhost:3000/dashboard
- [ ] **Expected**: Logged in both tabs
- [ ] **Expected**: Same user info

### 3.3. Session After Browser Close
- [ ] Login
- [ ] Close browser completely
- [ ] Reopen browser
- [ ] Go to: http://localhost:3000/dashboard
- [ ] **Expected**: Still logged in (within 30 days)

### 3.4. Check Session API
- [ ] Login
- [ ] Go to: http://localhost:3000/api/auth/session
- [ ] **Expected**: JSON response with user data
- [ ] **Expected**: `user.email`, `user.name`, `user.role`
- [ ] **Expected**: `user.id`

### 3.5. Session Token Cookie
- [ ] Login
- [ ] Open DevTools → Application → Cookies
- [ ] Find: `next-auth.session-token`
- [ ] **Expected**: Cookie exists
- [ ] **Expected**: HTTPOnly = true
- [ ] **Expected**: SameSite = lax
- [ ] **Expected**: Secure = false (dev) / true (prod)

---

## ✅ TEST 4: Role-Based Access Control

### 4.1. Student Access
- [ ] Login as `student@test.com`
- [ ] Try to access: `/teacher/dashboard`
- [ ] **Expected**: Redirected or "Access Denied"
- [ ] Try to access: `/admin/dashboard`
- [ ] **Expected**: Redirected or "Access Denied"
- [ ] Access: `/dashboard`
- [ ] **Expected**: Access granted

### 4.2. Teacher Access
- [ ] Login as `teacher@test.com`
- [ ] Access: `/teacher/dashboard`
- [ ] **Expected**: Access granted
- [ ] Try to access: `/admin/dashboard`
- [ ] **Expected**: Redirected or "Access Denied"

### 4.3. Admin Access
- [ ] Login as `admin@test.com`
- [ ] Access: `/admin/dashboard`
- [ ] **Expected**: Access granted
- [ ] Access: `/admin/users`
- [ ] **Expected**: Access granted
- [ ] Access: `/admin/stats`
- [ ] **Expected**: Access granted

### 4.4. API Route Protection
- [ ] Logout
- [ ] Try: `GET http://localhost:3000/api/admin/stats`
- [ ] **Expected**: 401 Unauthorized
- [ ] Login as student
- [ ] Try: `GET http://localhost:3000/api/admin/stats`
- [ ] **Expected**: 403 Forbidden
- [ ] Login as admin
- [ ] Try: `GET http://localhost:3000/api/admin/stats`
- [ ] **Expected**: 200 OK with data

---

## ✅ TEST 5: Logout Functionality

### 5.1. Basic Logout
- [ ] Login
- [ ] Click "Logout" button
- [ ] **Expected**: Redirect to `/auth/login`
- [ ] **Expected**: Session cleared
- [ ] **Expected**: Cookie deleted

### 5.2. Verify Logout
- [ ] After logout, try: http://localhost:3000/dashboard
- [ ] **Expected**: Redirect to `/auth/login`
- [ ] Check: http://localhost:3000/api/auth/session
- [ ] **Expected**: Empty response or `{}`

### 5.3. Logout Across Tabs
- [ ] Login
- [ ] Open 2 tabs with dashboard
- [ ] Logout from Tab 1
- [ ] Refresh Tab 2
- [ ] **Expected**: Tab 2 also logged out

---

## ✅ TEST 6: Edge Cases & Security

### 6.1. SQL Injection Attempts
- [ ] Try login with: `admin' OR '1'='1`
- [ ] **Expected**: Login fails
- [ ] **Expected**: No SQL error shown
- [ ] **Expected**: Safe error message

### 6.2. XSS Attempts
- [ ] Try login with email: `<script>alert('xss')</script>@test.com`
- [ ] **Expected**: Properly escaped/sanitized
- [ ] **Expected**: No script execution

### 6.3. CSRF Protection
- [ ] Login
- [ ] Open DevTools → Network
- [ ] Submit login form
- [ ] **Expected**: `csrfToken` in request
- [ ] **Expected**: Request has proper headers

### 6.4. Rate Limiting (if implemented)
- [ ] Try login with wrong password 10 times rapidly
- [ ] **Expected**: Rate limit kicks in after N attempts
- [ ] **Expected**: Error message about too many attempts

### 6.5. Concurrent Sessions
- [ ] Login on Chrome
- [ ] Login with same account on Firefox
- [ ] **Expected**: Both sessions work
- [ ] **Expected**: No session conflict

### 6.6. Password Brute Force Protection
- [ ] Try wrong password multiple times
- [ ] **Expected**: Consistent timing (no timing attacks)
- [ ] **Expected**: Same error message each time
- [ ] **Expected**: No information leakage

---

## ✅ TEST 7: Email Cases

### 7.1. Email Normalization
- [ ] Try login: `Student@Test.com` (mixed case)
- [ ] **Expected**: Login successful (case-insensitive)
- [ ] Try login: `  student@test.com  ` (with spaces)
- [ ] **Expected**: Login successful (trimmed)

### 7.2. Duplicate Email Prevention
- [ ] Try to create user with existing email
- [ ] **Expected**: Error: "Email already exists"

---

## ✅ TEST 8: Password Requirements

### 8.1. Password Strength (Registration)
- [ ] Go to: http://localhost:3000/auth/signup
- [ ] Try password: `123` (too short)
- [ ] **Expected**: Validation error
- [ ] Try password: `password123` (valid)
- [ ] **Expected**: Accepted

### 8.2. Password Visibility Toggle
- [ ] On login page
- [ ] Click "eye" icon next to password
- [ ] **Expected**: Password becomes visible
- [ ] Click again
- [ ] **Expected**: Password hidden again

---

## ✅ TEST 9: Error Handling

### 9.1. Network Error
- [ ] Stop server
- [ ] Try to login
- [ ] **Expected**: Error toast: "Network error"
- [ ] **Expected**: Graceful error handling

### 9.2. Database Error
- [ ] Temporarily disconnect database
- [ ] Try to login
- [ ] **Expected**: Error message (not raw DB error)
- [ ] **Expected**: User-friendly message

### 9.3. OAuth Errors
- [ ] Remove `GOOGLE_CLIENT_ID` from .env
- [ ] Restart server
- [ ] Try Google login
- [ ] **Expected**: Button disabled or error message

---

## ✅ TEST 10: UI/UX

### 10.1. Loading States
- [ ] Click login button
- [ ] **Expected**: Loading spinner shown
- [ ] **Expected**: Button disabled during submission
- [ ] **Expected**: "Signing in..." text

### 10.2. Error Messages
- [ ] Trigger various errors
- [ ] **Expected**: Toast notifications appear
- [ ] **Expected**: Messages are user-friendly
- [ ] **Expected**: No technical jargon

### 10.3. Redirect After Login
- [ ] Try to access: http://localhost:3000/dashboard (while logged out)
- [ ] **Expected**: Redirect to `/auth/login?callbackUrl=/dashboard`
- [ ] Login
- [ ] **Expected**: Redirect back to `/dashboard`

### 10.4. Remember Me (if implemented)
- [ ] Check "Remember me"
- [ ] Login
- [ ] **Expected**: Longer session duration

---

## 📊 Test Results Summary

### Passed Tests: ____ / ____
### Failed Tests: ____ / ____
### Blocked Tests: ____ / ____

### Critical Issues Found:
1. _______________________
2. _______________________
3. _______________________

### Minor Issues Found:
1. _______________________
2. _______________________
3. _______________________

### Notes:
_________________________________
_________________________________
_________________________________

---

## 🔧 Automated Test

Run comprehensive automated tests:

```bash
# Create test users first
npm run tsx scripts/create-test-users.ts

# Run comprehensive auth test
npm run tsx scripts/test-auth-comprehensive-nextauth.ts
```

---

## 📚 Additional Tests

### Performance Testing
- [ ] Login time < 2 seconds
- [ ] Session check < 100ms
- [ ] Logout time < 1 second

### Accessibility Testing
- [ ] Tab navigation works
- [ ] Screen reader friendly
- [ ] Keyboard shortcuts work
- [ ] Focus indicators visible

### Mobile Testing
- [ ] Login works on mobile Safari
- [ ] Login works on mobile Chrome
- [ ] OAuth works on mobile
- [ ] Responsive design

---

## ✅ Sign-off

**Tested by**: _______________  
**Date**: _______________  
**Status**: □ Pass □ Fail □ Needs Review  
**Approved for**: □ Development □ Staging □ Production  

**Notes**: _________________________________

