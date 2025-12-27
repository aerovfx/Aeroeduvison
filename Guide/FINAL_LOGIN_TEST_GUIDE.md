# 🔍 Final Login Flow Debug Guide

## 🎯 Current Status

**Problem:** Login POST returns 302 redirect to `/api/auth/signin?csrf=true` instead of `/dashboard`

**Root Cause Analysis:**
1. ✅ NEXTAUTH_URL set correctly: `https://inphysic.com`
2. ✅ Cookie domain configured: `.inphysic.com`
3. ✅ Database connected: 50 users
4. ⚠️ **No test users in database** - seeded data doesn't have `teacher@example.com`
5. ⚠️ **Redirect loop** - CSRF token issue or credentials validation failing

## 🧪 Test Current State

### 1. Create Test User First

**You need to create a user in the database:**

```sql
-- Or via API
POST /api/auth/register
{
  "email": "teacher@example.com",
  "password": "teacher123",
  "name": "Test Teacher",
  "role": "TEACHER"
}
```

### 2. Test Existing Users

**Or use an existing user from database:**

```bash
# Get a real user email
curl https://inphysic.com/api/test-db | jq '.sampleUsers[0].email'

# Try to login with that email
```

### 3. Check Server Logs

**After deploying with debug logging:**

```bash
gcloud run services logs read lmsmath-app --region asia-east1 --limit 50 | grep AUTHORIZE
```

## 🔧 Deploy and Test Steps

### Step 1: Build (Running in background)

```bash
# Build with debug logging
gcloud builds submit --tag gcr.io/gen-lang-client-0712182643/lmsmath-app .
```

### Step 2: Deploy

```bash
gcloud run deploy lmsmath-app \
  --image gcr.io/gen-lang-client-0712182643/lmsmath-app:latest \
  --region asia-east1 \
  --update-env-vars NEXTAUTH_URL="https://inphysic.com"
```

### Step 3: Check Logs

```bash
# Real-time logs
gcloud run services logs tail lmsmath-app --region asia-east1

# Or check recent logs
gcloud run services logs read lmsmath-app --region asia-east1 --limit 100 | grep -i "authorize\|error"
```

## 🎯 Expected Flow (After Fix)

1. **User submits login form**
   - Email: `teacher@example.com`
   - Password: `teacher123`

2. **Client calls:**
   ```typescript
   signIn('credentials', {
     email,
     password,
     redirect: false,
     callbackUrl: '/dashboard'
   })
   ```

3. **Server validates (with logging):**
   ```
   [AUTHORIZE] Called with: { email: teacher@example.com }
   [AUTHORIZE] Looking up user: teacher@example.com
   [AUTHORIZE] User found: true
   ```

4. **Server creates session:**
   - JWT token generated
   - Session cookie set
   - Response: `{ ok: true }`

5. **Client redirects:**
   ```typescript
   if (result?.ok) {
     router.push('/dashboard')
   }
   ```

6. **Dashboard loads:**
   - Session data available
   - User authenticated

## 📋 Debug Checklist

### ✅ Check These First:

1. **Database has test user?**
   ```bash
   curl https://inphysic.com/api/test-db | jq '.sampleUsers[] | select(.email | contains("teacher"))'
   ```

2. **CSRF token valid?**
   ```bash
   curl https://inphysic.com/api/auth/csrf
   ```

3. **Login POST returns 200?**
   ```bash
   # Check response status in DevTools Network tab
   ```

### 🔍 If Still Not Working:

**Check Server Logs:**
```bash
gcloud run services logs read lmsmath-app --region asia-east1 \
  --filter="severity>=ERROR" \
  --limit 50
```

**Check Authorize Logs:**
```bash
gcloud run services logs read lmsmath-app --region asia-east1 \
  --filter="textPayload:AUTHORIZE" \
  --limit 100
```

**Check Network Headers:**
- DevTools → Network → Login POST request
- Check for:
  - Status code (should be 200, not 302)
  - `Set-Cookie` header
  - Response body

## 🚨 Common Issues & Solutions

### Issue 1: No User in Database
**Symptom:** `[AUTHORIZE] User found: false`
**Fix:** Create test user or use existing seeded user

### Issue 2: CSRF Token Invalid
**Symptom:** Constant redirect to `/api/auth/signin?csrf=true`
**Fix:** 
```bash
# Clear cookies and try again
# Or check CSRF cookie is being set
```

### Issue 3: Cookie Not Set
**Symptom:** No `next-auth.session-token` cookie
**Check:** Domain matches, Secure flag set on HTTPS

### Issue 4: Password Hash Mismatch
**Symptom:** Authorize returns null after checking password
**Fix:** Re-seed database with correct password hashes

## 🎯 Next Steps

1. **Wait for build to complete** (running in background)
2. **Deploy** with debug logging
3. **Check logs** for `[AUTHORIZE]` messages
4. **Test login** with existing database user
5. **Verify redirect** works correctly

## 📝 Summary

### ✅ Fixed:
- NEXTAUTH_URL set
- Cookie domain configured  
- Redirect callback implemented
- Debug logging added

### ⚠️ Need to Fix:
- Create test user in database
- Or use existing seeded user
- Check CSRF token handling
- Verify password hashing

### 🎯 Action Items:
1. Create test user (teacher@example.com / teacher123)
2. Deploy with debug logging
3. Test login flow
4. Check server logs
5. Verify cookie and session

---

**Current Status:** Building with debug logging...  
**Next:** Deploy and test with real database user


