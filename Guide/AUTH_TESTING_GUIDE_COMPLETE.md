# 🔐 Complete Auth.js (NextAuth) Testing Guide

**Version**: 1.0  
**Last Updated**: October 19, 2025  
**Framework**: NextAuth v4 + Next.js 15

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Categories](#test-categories)
4. [Automated Tests](#automated-tests)
5. [Manual Tests](#manual-tests)
6. [API Testing](#api-testing)
7. [Security Testing](#security-testing)
8. [Performance Testing](#performance-testing)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide covers comprehensive testing for:
- **Login/Logout** with multiple providers (Credentials, Google OAuth)
- **Session Management** and JWT handling
- **Role-Based Access Control** (STUDENT, TEACHER, ADMIN)
- **Edge Cases** (expired tokens, invalid credentials, SQL injection, etc.)
- **Security** (CSRF, XSS, password hashing, etc.)

---

## 🚀 Quick Start

### Prerequisites
```bash
# 1. Ensure server is running
npm run dev

# 2. Database is connected
npx prisma studio  # Should open without errors

# 3. Environment variables configured
cat .env.local | grep -E "NEXTAUTH|GOOGLE"
```

### Run All Tests (3 minutes)
```bash
# Step 1: Create test users
npm run tsx scripts/create-test-users.ts

# Step 2: Run automated tests
npm run tsx scripts/test-auth-comprehensive-nextauth.ts

# Step 3: Manual testing (follow checklist)
# Open: AUTH_MANUAL_TEST_CHECKLIST.md
```

---

## 📊 Test Categories

### 1. Authentication Methods

#### A. Credentials (Email/Password)
- ✅ Valid login
- ✅ Invalid password
- ✅ Non-existent user
- ✅ Empty fields
- ✅ Email validation
- ✅ Password visibility toggle

#### B. Google OAuth
- ✅ First-time login (account creation)
- ✅ Returning user login
- ✅ User clicks "Deny"
- ✅ OAuth configuration
- ✅ Redirect URI setup
- ✅ Consent screen

### 2. Session & JWT

- ✅ Session creation
- ✅ Session persistence
- ✅ Session across tabs/windows
- ✅ Session after browser close
- ✅ JWT token structure
- ✅ Token expiration (30 days)
- ✅ Token refresh (24 hours)
- ✅ Cookie security (HTTPOnly, SameSite)

### 3. Role-Based Access Control

- ✅ STUDENT role permissions
- ✅ TEACHER role permissions
- ✅ ADMIN role permissions
- ✅ Protected routes enforcement
- ✅ API route protection
- ✅ Unauthorized access handling

### 4. Logout

- ✅ Basic logout functionality
- ✅ Session cleanup
- ✅ Cookie deletion
- ✅ Redirect after logout
- ✅ Multi-tab logout sync

### 5. Edge Cases

- ✅ SQL injection attempts
- ✅ XSS attempts
- ✅ CSRF protection
- ✅ Expired tokens
- ✅ Invalid credentials
- ✅ Concurrent sessions
- ✅ Email normalization
- ✅ Password strength

---

## 🤖 Automated Tests

### Test Suite 1: Comprehensive Auth Test

**File**: `scripts/test-auth-comprehensive-nextauth.ts`

**Run**:
```bash
npm run tsx scripts/test-auth-comprehensive-nextauth.ts
```

**Tests**:
1. Credentials login (valid, invalid, empty, SQL injection)
2. Google OAuth setup check
3. Session and JWT configuration
4. Role-based access (STUDENT, TEACHER, ADMIN)
5. Edge cases (expired tokens, malicious inputs)
6. Logout functionality
7. Database integrity

**Expected Output**:
```
██████████████████████████████████████████████████████████████████
  NEXTAUTH (AUTH.JS) COMPREHENSIVE TEST SUITE
██████████████████████████████████████████████████████████████████

══════════════════════════════════════════════════════════════════
  TEST 1: Credentials Login (Email/Password)
══════════════════════════════════════════════════════════════════

1.1. Testing valid credentials...
✅ Valid credentials login successful

1.2. Testing invalid password...
✅ Invalid password correctly rejected

... (more tests)

══════════════════════════════════════════════════════════════════
  TEST SUMMARY & RECOMMENDATIONS
══════════════════════════════════════════════════════════════════

✅ Passed Checks:
   ✅ Google OAuth configured
   ✅ NextAuth secret configured
   ✅ NextAuth URL configured
   ✅ Database connected

██████████████████████████████████████████████████████████████████
  ✅ ALL TESTS COMPLETED
██████████████████████████████████████████████████████████████████
```

---

## 👨‍💻 Manual Tests

### Manual Test Checklist

**File**: `AUTH_MANUAL_TEST_CHECKLIST.md`

**Steps**:
1. Open the checklist file
2. Follow each test step-by-step
3. Check boxes as you complete tests
4. Record any failures or issues

**Key Manual Tests**:
- UI/UX interactions
- Browser-specific behavior
- Mobile responsiveness
- Accessibility features
- Visual feedback (loading states, errors)

---

## 🔌 API Testing

### Test Authentication Endpoints

#### 1. Session Endpoint
```bash
# Without login
curl http://localhost:3000/api/auth/session

# Expected: {}

# With login
curl http://localhost:3000/api/auth/session \
  --cookie "next-auth.session-token=YOUR_TOKEN"

# Expected: { user: { id, email, name, role } }
```

#### 2. Sign In Endpoint
```bash
# Credentials sign in
curl -X POST http://localhost:3000/api/auth/signin/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123",
    "callbackUrl": "/dashboard"
  }'

# Expected: Redirect or session cookie
```

#### 3. Sign Out Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/signout

# Expected: Redirect to login page
```

#### 4. CSRF Token
```bash
curl http://localhost:3000/api/auth/csrf

# Expected: { csrfToken: "..." }
```

#### 5. Providers List
```bash
curl http://localhost:3000/api/auth/providers

# Expected: { 
#   credentials: { ... },
#   google: { ... }
# }
```

---

## 🛡️ Security Testing

### SQL Injection Tests

```bash
# Test 1: Classic SQL injection
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'

# Try malicious inputs:
# - "admin' OR '1'='1"
# - "admin'--"
# - "' OR 1=1--"

# Expected: All should fail safely
```

### XSS Tests

```bash
# Test email field with XSS
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "<script>alert(\"xss\")</script>@test.com",
    "password": "test"
  }'

# Expected: Properly escaped, no script execution
```

### CSRF Protection

```bash
# Test without CSRF token
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@test.com" }'

# Expected: CSRF error or rejection
```

---

## ⚡ Performance Testing

### Load Testing with Autocannon (if available)

```bash
# Install autocannon
npm install -g autocannon

# Test login endpoint
autocannon -c 10 -d 30 http://localhost:3000/api/auth/session

# Test protected route
autocannon -c 10 -d 30 http://localhost:3000/api/admin/stats
```

### Performance Benchmarks

**Expected Response Times**:
- Login (credentials): < 1000ms
- Session check: < 100ms
- Logout: < 500ms
- OAuth redirect: < 200ms

---

## 🧪 Database Testing

### Check User Data Integrity

```bash
# Open Prisma Studio
npx prisma studio

# Check:
# 1. User table structure
# 2. Password hashing (starts with $2a$ or $2b$)
# 3. Unique emails
# 4. Role distribution
# 5. emailVerified for OAuth users
```

### SQL Queries for Testing

```sql
-- Check duplicate emails
SELECT email, COUNT(*) 
FROM User 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Check password hashing
SELECT email, 
       LEFT(password, 4) as hash_prefix,
       LENGTH(password) as hash_length
FROM User 
WHERE password IS NOT NULL;

-- Check role distribution
SELECT role, COUNT(*) as count 
FROM User 
GROUP BY role;

-- Check OAuth users (no password)
SELECT email, name, image, emailVerified 
FROM User 
WHERE password IS NULL;
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Invalid credentials" even with correct password

**Check**:
```bash
# Verify user exists
npx prisma studio
# Check User table for email

# Verify password is hashed
# Should start with $2a$ or $2b$

# Test password verification
node -e "
const bcrypt = require('bcryptjs');
const hash = 'YOUR_HASH_FROM_DB';
const password = 'password123';
console.log(bcrypt.compareSync(password, hash));
"
```

**Fix**: Re-create user with properly hashed password

#### 2. "Access Denied" on Google OAuth

**Check**:
```bash
# Verify Google credentials
cat .env.local | grep GOOGLE

# Check OAuth consent screen
# https://console.cloud.google.com/apis/credentials/consent

# Ensure:
# - App is published OR
# - Email is in test users list
```

**Fix**: Publish app or add test users in Google Console

#### 3. Session not persisting

**Check**:
```bash
# Verify NEXTAUTH_SECRET
cat .env.local | grep NEXTAUTH_SECRET

# Check browser cookies
# DevTools → Application → Cookies
# Look for: next-auth.session-token

# Verify NEXTAUTH_URL
cat .env.local | grep NEXTAUTH_URL
```

**Fix**: Set proper environment variables and restart server

#### 4. Role-based access not working

**Check**:
```typescript
// In your protected route/component
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
console.log('User role:', session?.user?.role);
```

**Fix**: Ensure `role` is in JWT callback and session callback

#### 5. "redirect_uri_mismatch"

**Fix**:
```
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth Client ID
3. Add: http://localhost:3000/api/auth/callback/google
4. Save and wait 1-2 minutes
```

---

## 📚 Test Scripts Reference

### Available Scripts

```bash
# Create test users
npm run tsx scripts/create-test-users.ts

# Run comprehensive auth test
npm run tsx scripts/test-auth-comprehensive-nextauth.ts

# Check database
npx prisma studio

# View logs
npm run dev  # Server logs in terminal

# Clear test users (optional)
npm run tsx scripts/clear-test-users.ts  # If you create this
```

---

## ✅ Test Completion Checklist

### Before Deployment

- [ ] All automated tests pass
- [ ] Manual test checklist completed
- [ ] Security tests pass
- [ ] Performance benchmarks met
- [ ] No console errors
- [ ] No database integrity issues
- [ ] All roles tested
- [ ] OAuth flow working
- [ ] Logout working properly
- [ ] Protected routes enforced

### Production-Specific Tests

- [ ] HTTPS enabled
- [ ] Secure cookies enabled
- [ ] NEXTAUTH_URL points to production
- [ ] Google OAuth redirect URIs updated
- [ ] Rate limiting configured
- [ ] Error logging setup
- [ ] Monitoring in place

---

## 📊 Test Report Template

```markdown
# Auth Testing Report

**Date**: _______________
**Tester**: _______________
**Environment**: Production

## Summary
- Total Tests: ___
- Passed: ___
- Failed: ___
- Blocked: ___

## Test Results

### Automated Tests
- Credentials Login: ✅ Pass
- Google OAuth: ✅ Pass
- Session Management: ✅ Pass
- Role-Based Access: ✅ Pass
- Edge Cases: ✅ Pass

### Manual Tests
- UI/UX: ✅ Pass
- Mobile: ✅ Pass
- Accessibility: ✅ Pass

## Issues Found
1. None

## Recommendations
1. Implement rate limiting
2. Add 2FA for admin accounts
3. Regular security audits

## Sign-off
**Approved by**: _______________
**Status**: Ready for Production
```

---

## 🆘 Support

### If Tests Fail

1. **Check server logs** (terminal running `npm run dev`)
2. **Check browser console** (F12 → Console)
3. **Check network tab** (F12 → Network)
4. **Review documentation**:
   - `GOOGLE_OAUTH_SETUP_VIETNAMESE.md`
   - `FIX_REDIRECT_URI_MISMATCH.md`
   - `FIX_ACCESS_DENIED_ERROR.md`
5. **Enable debug mode** in `lib/auth.ts`:
   ```typescript
   debug: true,
   ```

---

## 🎯 Next Steps

After all tests pass:
1. ✅ Deploy to staging
2. ✅ Run tests on staging
3. ✅ Deploy to production
4. ✅ Monitor authentication metrics
5. ✅ Regular security audits
6. ✅ Implement Phase 1 of AI features

---

**Good luck with testing!** 🚀

For questions or issues, refer to the comprehensive documentation files in the project root.

