# 🔐 Auth.js (Next-Auth) Testing Guide

Hướng dẫn toàn diện để test hệ thống Authentication và Authorization của LMS Math.

## 📋 Tổng Quan

Bộ test này kiểm tra:

### 1. **Providers (Nhà cung cấp xác thực)**
- ✅ Credentials Provider (Email/Password)
- ✅ Google OAuth Provider
- ✅ Provider configuration và availability

### 2. **Authentication Flow (Luồng xác thực)**
- ✅ Login với credentials hợp lệ
- ✅ Login với credentials không hợp lệ
- ✅ Logout và session cleanup
- ✅ CSRF token validation
- ✅ OAuth user creation và update

### 3. **Session & JWT Management**
- ✅ JWT token creation và validation
- ✅ Session storage và retrieval
- ✅ Token expiration handling
- ✅ Session max age configuration
- ✅ Role information trong JWT

### 4. **Role-Based Access Control (RBAC)**
- ✅ STUDENT role permissions
- ✅ TEACHER role permissions
- ✅ ADMIN role permissions
- ✅ Role hierarchy validation
- ✅ Permission system checks

### 5. **Middleware & Route Protection**
- ✅ Public routes accessibility
- ✅ Protected routes redirection
- ✅ Role-based route access
- ✅ Middleware token validation

### 6. **Security & Edge Cases**
- ✅ Invalid credentials rejection
- ✅ Empty credentials validation
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ Role tampering prevention
- ✅ Session fixation protection
- ✅ OAuth-only user handling

---

## 🚀 Chuẩn Bị

### 1. Environment Variables

Đảm bảo file `.env` có các biến sau:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-min-32-characters"

# Google OAuth (optional, for OAuth tests)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server phải đang chạy tại `http://localhost:3000` để test API endpoints.

---

## 🧪 Các Loại Test

### Test Suite 1: Comprehensive Test (Database + Auth Logic)

**File:** `scripts/test-auth-comprehensive.ts`

Test toàn diện về logic authentication, database, và permissions.

```bash
# Run với ts-node
npx ts-node scripts/test-auth-comprehensive.ts

# Hoặc compile và run
npx tsc scripts/test-auth-comprehensive.ts
node scripts/test-auth-comprehensive.js
```

**Nội dung test:**
- ✅ Setup test users (STUDENT, TEACHER, ADMIN)
- ✅ Credentials login/logout flow
- ✅ JWT token creation, validation, expiration
- ✅ Role-based permissions
- ✅ Google OAuth simulation
- ✅ Edge cases (SQL injection, XSS, role tampering)
- ✅ Permission system validation
- ✅ Cleanup test data

**Output:** Colored terminal output với pass/fail status cho từng test.

---

### Test Suite 2: API Endpoints Test

**File:** `scripts/test-auth-api.ts`

Test các API routes của NextAuth và middleware protection.

```bash
# Đảm bảo dev server đang chạy!
npm run dev

# Trong terminal khác:
npx ts-node scripts/test-auth-api.ts
```

**Nội dung test:**
- ✅ NextAuth core routes (`/api/auth/*`)
- ✅ Authentication flow (login → session → logout)
- ✅ Invalid credentials handling
- ✅ Protected routes middleware
- ✅ Role-based access control
- ✅ CSRF protection

**Yêu cầu:**
- Development server phải đang chạy
- Test users phải tồn tại trong database

---

### Test Suite 3: Browser Interactive Test

**File:** `test-auth-browser.html`

Interactive UI để test authentication trong browser thực tế.

```bash
# 1. Start dev server
npm run dev

# 2. Open trong browser
open http://localhost:3000/test-auth-browser.html
```

**Features:**
- 🔍 Real-time session status
- 🔑 Login form với test users
- 🚪 Logout functionality
- 👥 Role-based access testing
- 🔌 API endpoints testing
- 🧪 Comprehensive test runner

**Test users có sẵn:**
- **Student:** `student.test@example.com` / `StudentPass123!`
- **Teacher:** `teacher.test@example.com` / `TeacherPass123!`
- **Admin:** `admin.test@example.com` / `AdminPass123!`

---

## 📊 Chi Tiết Từng Test

### 1. Credentials Provider Tests

#### Test 1.1: Valid Login - Student
```typescript
Input: 
- Email: student.test@example.com
- Password: StudentPass123!

Expected:
✅ Login successful
✅ Session created with STUDENT role
✅ JWT token issued
```

#### Test 1.2: Valid Login - Teacher
```typescript
Input:
- Email: teacher.test@example.com
- Password: TeacherPass123!

Expected:
✅ Login successful
✅ Session created with TEACHER role
✅ JWT token issued
```

#### Test 1.3: Valid Login - Admin
```typescript
Input:
- Email: admin.test@example.com
- Password: AdminPass123!

Expected:
✅ Login successful
✅ Session created with ADMIN role
✅ JWT token issued
```

#### Test 1.4: Invalid Password
```typescript
Input:
- Email: student.test@example.com
- Password: WrongPassword123!

Expected:
❌ Login rejected
❌ No session created
✅ Security: Password mismatch detected
```

#### Test 1.5: Non-existent User
```typescript
Input:
- Email: nonexistent@example.com
- Password: SomePassword123!

Expected:
❌ Login rejected
❌ User not found
✅ No information leakage
```

#### Test 1.6: Empty Credentials
```typescript
Input:
- Email: ""
- Password: ""

Expected:
❌ Login rejected
✅ Validation error
```

---

### 2. JWT & Session Management Tests

#### Test 2.1: JWT Token Structure
```typescript
Token should contain:
- sub (user ID)
- email
- role
- name
- iat (issued at)
- exp (expiration)

Expected:
✅ Token correctly structured
✅ All required fields present
```

#### Test 2.2: JWT Token Expiration
```typescript
Create token with 1ms expiration
Wait 100ms
Try to verify token

Expected:
❌ Token expired
✅ TokenExpiredError thrown
✅ Access denied
```

#### Test 2.3: Invalid JWT Secret
```typescript
Create token with wrong secret
Try to verify with correct secret

Expected:
❌ Verification failed
✅ JsonWebTokenError thrown
✅ Security: Invalid signature detected
```

#### Test 2.4: Malformed JWT
```typescript
Input: "not.a.valid.jwt.token"

Expected:
❌ Verification failed
✅ JsonWebTokenError thrown
```

#### Test 2.5: Session Max Age
```typescript
Configuration check:
- maxAge: 30 days (2592000 seconds)

Expected:
✅ Session expires after 30 days
✅ JWT max age matches session max age
```

---

### 3. Role-Based Access Control Tests

#### Test 3.1: Student Permissions
```typescript
Student role should:
✅ Be recognized as STUDENT
❌ NOT pass isTeacher() check
❌ NOT pass isAdmin() check
❌ NOT be able to manage courses
✅ Be able to view enrolled courses
✅ Be able to take quizzes
```

#### Test 3.2: Teacher Permissions
```typescript
Teacher role should:
✅ Pass isTeacher() check
❌ NOT pass isAdmin() check
✅ Be able to manage courses
✅ Be able to create lessons
✅ Be able to grade assignments
❌ NOT be able to manage users
```

#### Test 3.3: Admin Permissions
```typescript
Admin role should:
✅ Pass isAdmin() check
✅ Pass isTeacher() check (hierarchy)
✅ Be able to manage courses
✅ Be able to manage users
✅ Be able to view all analytics
✅ Have FULL permissions on all modules
```

#### Test 3.4: Role Hierarchy
```typescript
Hierarchy: ADMIN > TEACHER > STUDENT

Expected:
✅ Admin inherits teacher permissions
✅ Teacher does NOT inherit admin permissions
✅ Student has no elevated permissions
```

---

### 4. Google OAuth Tests

#### Test 4.1: OAuth User Creation
```typescript
New OAuth user login:
- Email: oauth.test@example.com
- Provider: Google

Expected:
✅ User created in database
✅ Default role: STUDENT
✅ emailVerified: set to current date
✅ No password field (OAuth-only)
```

#### Test 4.2: OAuth Existing User Update
```typescript
Existing user login via OAuth:
- Old name: "Old Name"
- New name from Google: "Updated Name"

Expected:
✅ User info updated
✅ emailVerified updated
✅ Role preserved
```

#### Test 4.3: OAuth Account Linking
```typescript
Link Google account to user:

Expected:
✅ Account record created
✅ provider: "google"
✅ userId correctly linked
✅ access_token stored
```

---

### 5. Middleware & Route Protection Tests

#### Test 5.1: Public Routes
```typescript
Routes: /, /sign-in, /sign-up

Expected:
✅ Accessible without authentication
✅ Status: 200 or 304
```

#### Test 5.2: Protected Routes
```typescript
Routes: /dashboard, /teacher/courses, /admin/dashboard

Without auth:
Expected:
❌ Access denied
✅ Redirect to /sign-in (302/307)
```

#### Test 5.3: Role-Based Routes - Student
```typescript
Student tries to access:
- /dashboard → ✅ Allowed
- /teacher/courses → ❌ Denied (redirect to /sign-in)
- /admin/dashboard → ❌ Denied (redirect to /sign-in)
```

#### Test 5.4: Role-Based Routes - Teacher
```typescript
Teacher tries to access:
- /dashboard → ✅ Allowed
- /teacher/courses → ✅ Allowed
- /admin/dashboard → ❌ Denied (redirect to /sign-in)
```

#### Test 5.5: Role-Based Routes - Admin
```typescript
Admin tries to access:
- /dashboard → ✅ Allowed
- /teacher/courses → ✅ Allowed
- /admin/dashboard → ✅ Allowed
```

---

### 6. Security & Edge Cases Tests

#### Test 6.1: OAuth User Without Password
```typescript
User created via Google OAuth:
- Has email, name, role
- NO password field

Try credentials login:
Expected:
❌ Login rejected
✅ Auth flow detects missing password
```

#### Test 6.2: SQL Injection Protection
```typescript
Input: "'; DROP TABLE users; --"

Expected:
✅ Prisma safely handles input
✅ No SQL execution
✅ Returns null (user not found)
```

#### Test 6.3: XSS Protection
```typescript
Input name: "<script>alert('XSS')</script>"

Expected:
✅ Stored as-is in database
✅ React escapes on render
✅ No script execution in UI
```

#### Test 6.4: Email Case Sensitivity
```typescript
Create user: "test@example.com"
Try login: "TEST@EXAMPLE.COM"

Expected:
⚠️ Case-sensitive (consider normalizing)
Recommendation: Normalize emails to lowercase
```

#### Test 6.5: Role Tampering Prevention
```typescript
Student user creates JWT with role: "ADMIN"

Expected:
✅ JWT callback fetches role from database
✅ Tampered role ignored
✅ User remains STUDENT
```

#### Test 6.6: Session Fixation Protection
```typescript
Built-in NextAuth protections:
✅ New session token on login
✅ httpOnly cookies
✅ Session token rotation
✅ Secure cookie flags (production)
```

---

## 🔧 Troubleshooting

### Test users không tồn tại

```bash
# Run script để tạo test users
npx ts-node scripts/test-auth-comprehensive.ts
```

### Server không chạy

```bash
# Check port 3000
lsof -i :3000

# Kill process nếu cần
kill -9 <PID>

# Start lại
npm run dev
```

### Database errors

```bash
# Reset database
rm prisma/dev.db
npx prisma migrate dev
npx prisma db seed
```

### JWT errors

```bash
# Check NEXTAUTH_SECRET
echo $NEXTAUTH_SECRET

# Generate new secret
openssl rand -base64 32
```

---

## 📈 Expected Results

### Successful Test Run

```
============================================================
  COMPREHENSIVE AUTH.JS (NEXT-AUTH) TEST SUITE
============================================================

============================================================
  SETUP: Creating Test Users
============================================================
✅ Created STUDENT: student.test@example.com
✅ Created TEACHER: teacher.test@example.com
✅ Created ADMIN: admin.test@example.com

============================================================
  TEST 1: Credentials Provider - Login/Logout
============================================================
ℹ️  Test 1.1: Valid student login
✅ Student login successful
ℹ️  Test 1.2: Valid teacher login
✅ Teacher login successful
ℹ️  Test 1.3: Valid admin login
✅ Admin login successful
ℹ️  Test 1.4: Login with invalid password
✅ Invalid password correctly rejected
ℹ️  Test 1.5: Login with non-existent user
✅ Non-existent user correctly rejected
ℹ️  Test 1.6: Login with empty credentials
✅ Empty credentials correctly rejected

============================================================
  TEST 2: JWT & Session Management
============================================================
ℹ️  Test 2.1: JWT token structure validation
✅ JWT token correctly created and decoded
ℹ️  Test 2.2: JWT token expiration handling
✅ Expired token correctly rejected
ℹ️  Test 2.3: JWT with invalid secret
✅ Token with invalid secret correctly rejected
ℹ️  Test 2.4: Malformed JWT token
✅ Malformed token correctly rejected
ℹ️  Test 2.5: Session max age validation
✅ Session max age correctly configured: 2592000 seconds (30 days)

... (more tests)

============================================================
  TEST SUMMARY
============================================================
✅ All tests completed in 5.23 seconds
ℹ️  Review the results above for any failures or warnings
```

---

## 🎯 Best Practices Được Test

### ✅ Authentication
- Password hashing với bcrypt
- CSRF protection
- Secure session management
- JWT với expiration
- OAuth integration

### ✅ Authorization
- Role-based access control (RBAC)
- Permission system
- Middleware protection
- Route guards
- API endpoint protection

### ✅ Security
- SQL injection prevention (Prisma)
- XSS protection (React escaping)
- Session fixation prevention
- Role tampering prevention
- httpOnly cookies
- Secure cookie flags (production)

### ✅ User Experience
- Clear error messages (no information leakage)
- Proper redirects
- Session persistence
- Remember me functionality
- Multi-provider support

---

## 📝 Recommendations for Production

### 1. Environment Variables
```env
# Use strong secrets
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Production URLs
NEXTAUTH_URL="https://yourdomain.com"

# OAuth credentials
GOOGLE_CLIENT_ID="production-client-id"
GOOGLE_CLIENT_SECRET="production-client-secret"
```

### 2. Security Enhancements
- [ ] Enable HTTPS (required for OAuth)
- [ ] Set secure cookie flags
- [ ] Implement rate limiting
- [ ] Add account lockout after failed attempts
- [ ] Enable 2FA for admin accounts
- [ ] Set up security monitoring

### 3. Session Management
- [ ] Configure shorter session duration for sensitive data
- [ ] Implement "Remember Me" functionality
- [ ] Add "Logout from all devices" feature
- [ ] Set up session cleanup job

### 4. OAuth Configuration
- [ ] Verify Google OAuth consent screen
- [ ] Set authorized redirect URIs
- [ ] Test OAuth flow in production
- [ ] Handle OAuth errors gracefully

### 5. Monitoring & Logging
- [ ] Log failed login attempts
- [ ] Monitor for suspicious activity
- [ ] Set up alerts for security events
- [ ] Track session analytics

---

## 🆘 Support

Nếu gặp vấn đề khi chạy tests:

1. **Check logs:** Xem terminal output để biết lỗi cụ thể
2. **Database:** Đảm bảo database đã được setup đúng
3. **Environment:** Verify tất cả environment variables
4. **Server:** Đảm bảo dev server đang chạy cho API tests
5. **Dependencies:** Run `npm install` để cài đặt lại packages

---

## 📚 Related Documentation

- [Next-Auth Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [JWT Documentation](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Created:** October 2025  
**Last Updated:** October 7, 2025  
**Version:** 1.0.0


