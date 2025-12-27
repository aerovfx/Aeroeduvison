# 🚀 Auth Testing - Quick Reference

## One-Line Commands

```bash
# Test toàn diện (Database + Logic)
npm run test:auth

# Test API endpoints (cần dev server chạy)
npm run test:auth:api

# Test tất cả
npm run test:auth:all

# Start dev server
npm run dev

# Browser test
open http://localhost:3000/test-auth-browser.html
```

---

## Test Users

| Role | Email | Password |
|------|-------|----------|
| 👨‍🎓 Student | `student.test@example.com` | `StudentPass123!` |
| 👨‍🏫 Teacher | `teacher.test@example.com` | `TeacherPass123!` |
| 👑 Admin | `admin.test@example.com` | `AdminPass123!` |

---

## Common Tasks

### Setup Test Environment
```bash
# 1. Install dependencies
npm install

# 2. Setup database
npx prisma migrate dev

# 3. Generate Prisma client
npx prisma generate

# 4. Seed database (optional)
npm run db:seed
```

### Run Tests
```bash
# Comprehensive test
npm run test:auth

# Terminal 1: Start server
npm run dev

# Terminal 2: API test
npm run test:auth:api

# Browser: Navigate to
http://localhost:3000/test-auth-browser.html
```

### Troubleshooting
```bash
# Reset database
npm run db:reset

# Kill port 3000
lsof -i :3000 | grep LISTEN
kill -9 <PID>

# Generate new secret
openssl rand -base64 32

# Check environment
cat .env | grep NEXTAUTH
```

---

## What Each Test Covers

### 🧪 Comprehensive Test (`npm run test:auth`)
- Credentials login/logout
- JWT validation
- Role permissions
- OAuth simulation
- Security edge cases

### 🔌 API Test (`npm run test:auth:api`)
- NextAuth routes
- Authentication flow
- Protected routes
- CSRF protection
- Role-based access

### 🌐 Browser Test (HTML)
- Real-time testing
- Interactive UI
- Session status
- Route access
- Visual feedback

---

## Expected Results

✅ **All Pass:**
```
✅ All tests completed in X seconds
✅ No errors or warnings
```

⚠️ **Some Warnings:**
```
⚠️ Email is case-sensitive (consider normalizing)
⚠️ Could not test route X: Server may not be running
```

❌ **Failures:**
```
❌ Login failed
❌ SECURITY ISSUE detected
❌ Permission check failed
```

---

## Environment Variables

```env
# Required
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="min-32-chars-random-string"
DATABASE_URL="file:./dev.db"

# Optional (for OAuth tests)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

---

## Key Files

| File | Purpose |
|------|---------|
| `scripts/test-auth-comprehensive.ts` | Main test suite |
| `scripts/test-auth-api.ts` | API endpoint tests |
| `test-auth-browser.html` | Browser interactive test |
| `lib/auth.ts` | NextAuth configuration |
| `lib/permissions.ts` | Permission system |
| `middleware.ts` | Route protection |
| `AUTH_TESTING_GUIDE.md` | Full documentation |
| `AUTH_TEST_SUMMARY.md` | Test summary |

---

## Test Coverage

- ✅ Authentication (login/logout/session)
- ✅ Authorization (roles/permissions)
- ✅ JWT (creation/validation/expiration)
- ✅ OAuth (Google)
- ✅ Security (SQL injection, XSS, CSRF)
- ✅ Middleware (route protection)
- ✅ Edge cases (invalid data, tampering)

---

## Quick Checks

### Is Server Running?
```bash
curl http://localhost:3000/api/auth/providers
```

### Is Database Accessible?
```bash
npx prisma studio
```

### Are Test Users Created?
```bash
npm run test:auth
# Check "SETUP: Creating Test Users" section
```

### Can I Login?
```
Open: http://localhost:3000/sign-in
Use test credentials above
```

---

## Pro Tips

💡 **Run tests in order:**
1. Comprehensive test (creates test users)
2. Start dev server
3. API test (needs running server)
4. Browser test (manual verification)

💡 **For CI/CD:**
```bash
npm run test:auth:all
```

💡 **For production testing:**
- Update `NEXTAUTH_URL` to production URL
- Use production database
- Enable HTTPS
- Set secure cookie flags

💡 **Debug mode:**
```typescript
// In lib/auth.ts
debug: true  // Already enabled
```

---

## Help

📖 **Full Guide:** `AUTH_TESTING_GUIDE.md`  
📝 **Summary:** `AUTH_TEST_SUMMARY.md`  
🔗 **Next-Auth Docs:** https://next-auth.js.org/

---

**Last Updated:** October 7, 2025


