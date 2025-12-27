# Testing Quick Reference Guide

## 🚀 Quick Start

### Run All Tests
```bash
# Auth tests
npm run test:auth

# Prisma database tests
npm run test:prisma

# All auth tests (including HTTP)
npm run test:auth:all
```

---

## 📋 Test Commands

### Authentication Testing
```bash
# Comprehensive auth tests (database-level)
npm run test:auth

# HTTP endpoint tests (requires running server)
npm run test:auth:api

# Run both auth tests
npm run test:auth:all

# Quick verification of auth fixes
npm run test:auth:verify
```

### Database Testing
```bash
# Comprehensive Prisma tests
npm run test:prisma

# Check migration status
npx prisma migrate status

# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate
```

### Utility Commands
```bash
# Clear specific test user
npm run clear:user

# Clear database and restart
npx prisma migrate reset

# Seed database
npx prisma db seed
```

---

## 🧪 What Each Test Covers

### Auth Tests (`npm run test:auth`)
- ✅ User registration with password hashing
- ✅ Login with credentials provider
- ✅ Email normalization (case-insensitive)
- ✅ JWT token creation and validation
- ✅ Session management
- ✅ Role-based access control (STUDENT, TEACHER, ADMIN)
- ✅ Invalid credentials handling
- ✅ Password validation

### Prisma Tests (`npm run test:prisma`)
- ✅ Database connection
- ✅ Migration status
- ✅ User CRUD operations
- ✅ Course CRUD operations
- ✅ Chapter CRUD operations
- ✅ Complex relations (enrollments, progress)
- ✅ Data validation and constraints
- ✅ Unique constraints
- ✅ Foreign key constraints
- ✅ Cascade deletes
- ✅ Transaction atomicity and rollback

---

## 🔍 Test Results Interpretation

### Success Indicators
- ✅ Green checkmarks in terminal
- ✅ "All tests passed" message
- ✅ Exit code 0
- ✅ No error messages

### Common Errors

#### Auth Test Errors
```
❌ User not found
```
**Fix:** User may not exist in database. Run `npm run clear:user` and try again.

```
❌ Password check: false
```
**Fix:** Password hash may be incorrect. Delete user and recreate.

```
❌ Session callback returning null
```
**Fix:** Check database connection and user existence validation.

#### Prisma Test Errors
```
❌ Foreign key constraint failed
```
**Fix:** Ensure related records exist before creating relations.

```
❌ Unique constraint violation
```
**Fix:** Attempting to create duplicate record. Expected in validation tests.

```
❌ Database connection failed
```
**Fix:** Check DATABASE_URL in .env.local file.

---

## 🛠️ Troubleshooting

### Server Not Starting
```bash
# Kill existing Next.js processes
pkill -f "next"

# Clear cache
rm -rf .next

# Restart server
npm run dev
```

### Database Issues
```bash
# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Regenerate Prisma client
npx prisma generate

# Check schema sync
npx prisma db push
```

### Session Issues
```bash
# Clear browser cookies
# In Chrome: DevTools > Application > Cookies > Clear

# Check session in database
npx prisma studio

# Verify NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET
```

---

## 📊 Expected Test Output

### Auth Tests - Success
```
============================================================
  Auth Test Summary
============================================================
Total tests: 12
✅ Passed: 12
❌ Failed: 0
Duration: 0.3s

🎉 All auth tests passed!
```

### Prisma Tests - Success
```
============================================================
  Test Summary
============================================================
Total tests: 7
✅ Passed: 7
❌ Failed: 0
Duration: 0.12s

🎉 All Prisma tests passed!
```

---

## 🔐 Test Users

### Default Test Accounts

**Student Account:**
- Email: `student@example.com`
- Password: `student123`
- Role: STUDENT

**Teacher Account:**
- Email: `teacher@example.com`
- Password: `teacher123`
- Role: TEACHER

**Test Accounts (Created during tests):**
- Email: `test-user-{timestamp}@example.com`
- Password: `TestPassword123!`
- Auto-deleted after tests

---

## 📁 Test File Locations

### Test Scripts
- `scripts/test-auth-comprehensive.ts` - Auth system tests
- `scripts/test-prisma-comprehensive.ts` - Database tests
- `scripts/verify-auth-fixes.ts` - Quick auth checks
- `scripts/clear-test-user.ts` - Cleanup utility

### Test Documentation
- `COMPLETE_SYSTEM_TEST_SUMMARY.md` - Full test results
- `PRISMA_TEST_SUMMARY.md` - Prisma-specific results
- `TESTING_QUICK_REFERENCE.md` - This guide

---

## 🎯 Pre-Production Checklist

Before deploying to production, run:

```bash
# 1. Run all tests
npm run test:auth
npm run test:prisma

# 2. Check migrations
npx prisma migrate status

# 3. Verify environment variables
# Ensure these are set:
# - NEXTAUTH_SECRET (strong random string)
# - NEXTAUTH_URL (production URL)
# - DATABASE_URL (production database)
# - GOOGLE_CLIENT_ID (if using OAuth)
# - GOOGLE_CLIENT_SECRET (if using OAuth)

# 4. Build the application
npm run build

# 5. Check for TypeScript errors
npm run type-check

# 6. Run linter
npm run lint
```

---

## 📞 Getting Help

### Check Logs
```bash
# Server logs
# Look at terminal where `npm run dev` is running

# Database logs
# Check prisma/dev.db

# Browser console
# F12 > Console tab
```

### Debug Mode
```bash
# Enable NextAuth debug
# In lib/auth.ts: debug: true

# Check auth session
curl http://localhost:3000/api/auth/session

# Check auth providers
curl http://localhost:3000/api/auth/providers
```

### Common Test Commands
```bash
# Quick health check
npm run test:auth:verify

# Full system test
npm run test:auth && npm run test:prisma

# Reset everything (CAUTION)
npx prisma migrate reset && npm run dev
```

---

## 🚦 CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npx prisma generate
      - run: npm run test:auth
      - run: npm run test:prisma
```

---

## 📈 Test Coverage Goals

| Component | Current | Target |
|-----------|---------|--------|
| Auth.js | 100% | 100% |
| Prisma | 100% | 100% |
| API Routes | 80% | 95% |
| Components | 60% | 85% |
| Integration | 80% | 95% |

---

**Last Updated:** October 8, 2025  
**Maintained By:** Development Team  
**Review Frequency:** After major updates


