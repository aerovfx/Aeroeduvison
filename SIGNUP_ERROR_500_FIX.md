# 🔧 Fix: 500 Error on Sign-Up

## ❌ Error

```
POST http://localhost:3001/api/auth/register 500 (Internal Server Error)

Error details:
Invalid `prisma.user.findUnique()` invocation:
error: Error validating datasource `db`: 
the URL must start with the protocol `file:`.
```

## 🔍 Root Cause

The running server is using an **outdated Prisma Client** that was generated with a different DATABASE_URL or schema.

## ✅ Solution

### Step 1: Stop the Development Server

In the terminal running the server, press:
```
Ctrl + C
```

### Step 2: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 3: Restart the Development Server

```bash
npm run dev
```

### Step 4: Test Sign-Up Again

1. Go to: `http://localhost:3001/sign-up`
2. Fill in the form
3. Click "Sign Up"
4. Should work now! ✅

---

## 🧪 Quick Test (Terminal)

```bash
# Test registration directly
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!","role":"STUDENT"}'

# Expected response:
# {"message":"User created successfully","userId":"..."}
```

---

## 📋 Complete Fix Checklist

- [x] ✅ Email normalization added to `lib/auth.ts`
- [x] ✅ Email normalization added to `app/api/auth/register/route.ts`
- [x] ✅ Prisma client regenerated
- [ ] ⚠️ **Server restart required** ← YOU ARE HERE
- [ ] Test sign-up with browser
- [ ] Test login after sign-up

---

## 🔧 Additional Fixes Applied

### 1. Email Normalization (Already Fixed)

**File:** `app/api/auth/register/route.ts`

```typescript
// Normalize email to lowercase
const normalizedEmail = email.toLowerCase().trim()

// Use normalized email
const user = await db.user.create({
  data: {
    email: normalizedEmail,
    // ...
  }
})
```

### 2. Prisma Client (Regenerated)

```bash
npx prisma generate
```

---

## 🚀 After Restart

Your sign-up should work correctly with:

- ✅ Case-insensitive emails
- ✅ Proper database connection
- ✅ No more 500 errors
- ✅ Login works after sign-up

---

## 🆘 If Still Not Working

### Check 1: Database File Exists

```bash
ls -la prisma/dev.db

# Should show the database file
# If missing, run: npx prisma migrate dev
```

### Check 2: Environment Variable

```bash
grep DATABASE_URL .env

# Should show: DATABASE_URL="file:./dev.db"
```

### Check 3: Server Port

Check which port your server is actually running on:
```bash
lsof -i :3001
lsof -i :3000

# Make sure you're connecting to the right port
```

### Check 4: Clear Next.js Cache

```bash
rm -rf .next
npm run dev
```

---

## 📝 Summary

**Issue:** Outdated Prisma client causing 500 error  
**Fix:** Restart server after `npx prisma generate`  
**Status:** ✅ Ready to test

---

**Created:** October 7, 2025  
**Status:** Fix applied, restart required


