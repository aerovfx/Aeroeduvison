# 🔐 NextAuth Authentication Testing Guide

## ✅ Authentication System Overview

### **Session & JWT Configuration**
- **Session Duration**: 30 days
- **Session Update**: Every 24 hours
- **JWT Max Age**: 30 days
- **Strategy**: JWT (JSON Web Token)
- **Cookie**: HttpOnly, SameSite=lax

---

## 🧪 Test Cases

### **1. Marketing Pages Access Control**

#### Test 1.1: Unauthenticated User Access
- **Route**: `/`, `/pricing`, `/contact-sales`
- **Expected**: ✅ Access granted
- **Steps**:
  1. Open browser in incognito mode
  2. Navigate to `http://localhost:3000/`
  3. Verify page loads successfully
  4. Navigate to `http://localhost:3000/pricing`
  5. Verify page loads successfully
  6. Navigate to `http://localhost:3000/contact-sales`
  7. Verify page loads successfully

#### Test 1.2: Authenticated User Redirect from Marketing
- **Route**: `/`, `/pricing`, `/contact-sales`
- **Expected**: 🔄 Redirect to dashboard based on role
- **Steps**:
  1. Login as a user
  2. Try to access `http://localhost:3000/`
  3. **Expected**: Auto-redirect to `/dashboard` (STUDENT), `/teacher/courses` (TEACHER), or `/admin/dashboard` (ADMIN)
  4. Check browser console: Should see `🔒 [MIDDLEWARE] Authenticated user trying to access /, redirecting to dashboard`

---

### **2. Authentication Routes**

#### Test 2.1: Login Page Access (Unauthenticated)
- **Route**: `/auth/login`
- **Expected**: ✅ Page loads
- **Steps**:
  1. Logout if logged in
  2. Navigate to `http://localhost:3000/auth/login`
  3. Verify login form displays

#### Test 2.2: Login Page Access (Authenticated)
- **Route**: `/auth/login`
- **Expected**: 🔄 Redirect to dashboard
- **Steps**:
  1. Login as any user
  2. Try to access `http://localhost:3000/auth/login`
  3. **Expected**: Auto-redirect to appropriate dashboard

#### Test 2.3: Valid Credentials Login
- **Test Account**: `student@example.com` / `password123`
- **Expected**: ✅ Login successful, redirect to `/dashboard`
- **Steps**:
  1. Go to `/auth/login`
  2. Enter valid credentials
  3. Click "Đăng nhập"
  4. **Expected**: Redirect to `/dashboard`
  5. Verify session in browser DevTools > Application > Cookies

#### Test 2.4: Invalid Credentials
- **Expected**: ❌ Login failed, error message displayed
- **Steps**:
  1. Go to `/auth/login`
  2. Enter invalid email or password
  3. Click "Đăng nhập"
  4. **Expected**: Error message "Email hoặc mật khẩu không đúng"

#### Test 2.5: Google OAuth Login
- **Expected**: ✅ Login successful, auto-create user if new
- **Steps**:
  1. Go to `/auth/login`
  2. Click "Đăng nhập với Google"
  3. Authorize with Google account
  4. **Expected**: 
     - New user: Created with role STUDENT, redirect to `/dashboard`
     - Existing user: Login and redirect to dashboard

---

### **3. Protected Routes - Dashboard**

#### Test 3.1: Dashboard Access (Authenticated)
- **Route**: `/dashboard`
- **Expected**: ✅ Access granted for STUDENT
- **Steps**:
  1. Login as `student@example.com`
  2. Navigate to `/dashboard`
  3. Verify dashboard loads

#### Test 3.2: Dashboard Access (Unauthenticated)
- **Route**: `/dashboard`
- **Expected**: 🔄 Redirect to `/auth/login?callbackUrl=/dashboard`
- **Steps**:
  1. Logout
  2. Try to access `/dashboard` directly
  3. **Expected**: Redirect to login with callback URL
  4. After login, should redirect back to `/dashboard`

---

### **4. Protected Routes - Teacher**

#### Test 4.1: Teacher Route Access (Teacher Role)
- **Route**: `/teacher/courses`
- **Expected**: ✅ Access granted
- **Steps**:
  1. Login as teacher account
  2. Navigate to `/teacher/courses`
  3. Verify page loads

#### Test 4.2: Teacher Route Access (Student Role)
- **Route**: `/teacher/courses`
- **Expected**: 🔄 Redirect to `/dashboard`
- **Steps**:
  1. Login as `student@example.com`
  2. Try to access `/teacher/courses`
  3. **Expected**: Redirect to `/dashboard`
  4. Console log: `🚫 [MIDDLEWARE] Non-teacher user trying to access /teacher/courses, forbidden`

#### Test 4.3: Teacher Route Access (Unauthenticated)
- **Route**: `/teacher/courses`
- **Expected**: 🔄 Redirect to login
- **Steps**:
  1. Logout
  2. Try to access `/teacher/courses`
  3. **Expected**: Redirect to `/auth/login?callbackUrl=/teacher/courses`

---

### **5. Protected Routes - Admin**

#### Test 5.1: Admin Route Access (Admin Role)
- **Route**: `/admin/dashboard`
- **Expected**: ✅ Access granted
- **Steps**:
  1. Login as admin account
  2. Navigate to `/admin/dashboard`
  3. Verify page loads

#### Test 5.2: Admin Route Access (Non-Admin)
- **Route**: `/admin/dashboard`
- **Expected**: 🔄 Redirect to `/dashboard`
- **Steps**:
  1. Login as `student@example.com`
  2. Try to access `/admin/dashboard`
  3. **Expected**: Redirect to `/dashboard`
  4. Console log: `🚫 [MIDDLEWARE] Non-admin user trying to access /admin/dashboard, forbidden`

---

### **6. Session Management**

#### Test 6.1: Session Persistence
- **Expected**: Session persists for 30 days
- **Steps**:
  1. Login as any user
  2. Close browser
  3. Reopen browser and navigate to `/dashboard`
  4. **Expected**: Still logged in (within 30 days)

#### Test 6.2: Session Refresh
- **Expected**: Session data refreshes from DB every 24 hours
- **Steps**:
  1. Login as a user
  2. Wait 24 hours (or modify `lastUpdated` in JWT)
  3. Make a request
  4. **Expected**: Token refreshed with latest DB data

#### Test 6.3: Expired Session
- **Expected**: Redirect to login
- **Steps**:
  1. Login
  2. Delete session cookie manually
  3. Try to access protected route
  4. **Expected**: Redirect to login

---

### **7. JWT Token Validation**

#### Test 7.1: Invalid JWT Token
- **Expected**: Redirect to login
- **Steps**:
  1. Login
  2. Manually modify JWT token in DevTools
  3. Refresh page
  4. **Expected**: Redirect to login

#### Test 7.2: Deleted User Session
- **Expected**: Session invalidated
- **Steps**:
  1. Login as a user
  2. Delete user from database
  3. Try to access any protected route
  4. **Expected**: Session validation fails, redirect to login

---

### **8. Role-Based Access**

#### Test 8.1: Role-Based Dashboard Redirect
- **Expected**: Auto-redirect based on role
- **Steps**:
  1. Login as STUDENT → Should go to `/dashboard`
  2. Login as TEACHER → Should go to `/teacher/courses`
  3. Login as ADMIN → Should go to `/admin/dashboard`

#### Test 8.2: Role Change Effect
- **Expected**: Role changes reflect immediately
- **Steps**:
  1. Login as STUDENT
  2. Change role to TEACHER in database
  3. Wait for next session refresh (or force refresh)
  4. **Expected**: Access changes to teacher routes

---

### **9. Logout**

#### Test 9.1: Logout Functionality
- **Expected**: Session cleared, redirect to login
- **Steps**:
  1. Login as any user
  2. Click logout button
  3. **Expected**: 
     - Session cleared
     - Cookie deleted
     - Redirect to `/auth/login`
  4. Try to access `/dashboard`
  5. **Expected**: Redirect to login

---

### **10. Edge Cases**

#### Test 10.1: Case-Insensitive Email
- **Expected**: Login works regardless of email case
- **Steps**:
  1. Try login with `STUDENT@EXAMPLE.COM`
  2. Try login with `Student@Example.com`
  3. **Expected**: Both should work

#### Test 10.2: Concurrent Sessions
- **Expected**: Multiple sessions work independently
- **Steps**:
  1. Login in Chrome
  2. Login in Firefox with different account
  3. **Expected**: Both sessions work independently

#### Test 10.3: Network Failure During Auth
- **Expected**: Proper error handling
- **Steps**:
  1. Disable network
  2. Try to login
  3. **Expected**: Error message displayed

---

## 🎯 Quick Test Script

### Browser Console Test:
```javascript
// Test 1: Check current session
fetch('/api/auth/session').then(r => r.json()).then(console.log)

// Test 2: Try accessing protected route
fetch('/dashboard').then(r => console.log('Dashboard:', r.status, r.redirected, r.url))

// Test 3: Check if logged in
const isLoggedIn = document.cookie.includes('next-auth.session-token')
console.log('Logged in:', isLoggedIn)
```

---

## 📊 Test Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `student@example.com` | `password123` | STUDENT | General student testing |
| `teacher@example.com` | `password123` | TEACHER | Teacher route testing |
| `admin@example.com` | `password123` | ADMIN | Admin route testing |

---

## ✅ Expected Behavior Summary

### **Marketing Pages** (`/`, `/pricing`, `/contact-sales`)
- ❌ Authenticated → Redirect to dashboard
- ✅ Unauthenticated → Show page

### **Auth Pages** (`/auth/login`, `/auth/signup`)
- ❌ Authenticated → Redirect to dashboard
- ✅ Unauthenticated → Show page

### **Dashboard Pages** (`/dashboard`, `/learning-paths`, `/ai-tutor`)
- ✅ Authenticated → Show page
- ❌ Unauthenticated → Redirect to login

### **Teacher Pages** (`/teacher/*`)
- ✅ TEACHER or ADMIN → Show page
- ❌ STUDENT → Redirect to dashboard
- ❌ Unauthenticated → Redirect to login

### **Admin Pages** (`/admin/*`)
- ✅ ADMIN → Show page
- ❌ Other roles → Redirect to dashboard
- ❌ Unauthenticated → Redirect to login

---

## 🔍 Monitoring & Debugging

### Console Logs to Watch:
```
🔒 [MIDDLEWARE] Authenticated user trying to access /, redirecting to dashboard
🚫 [MIDDLEWARE] Unauthenticated access to /dashboard, redirecting to login
🚫 [MIDDLEWARE] Non-admin user trying to access /admin/dashboard, forbidden
```

### Check Session in DevTools:
1. Open DevTools → Application → Cookies
2. Look for `next-auth.session-token`
3. Verify expiration date (30 days from login)

### Check Network Tab:
- `/api/auth/session` should return user data if logged in
- Failed auth attempts should show 401 status

---

## 🚀 Running Tests

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Clear all cookies before testing:**
   - DevTools → Application → Clear site data

3. **Test in incognito mode** to ensure clean state

4. **Check middleware logs** in terminal for detailed info

---

## ✨ Success Criteria

- ✅ All marketing pages accessible to guests only
- ✅ Authenticated users cannot access marketing/auth pages
- ✅ Protected routes require authentication
- ✅ Role-based access works correctly
- ✅ Sessions persist for 30 days
- ✅ Invalid credentials handled properly
- ✅ Expired tokens redirect to login
- ✅ Logout clears session completely

