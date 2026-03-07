# 🧪 Test Login Flow - Final Instructions

## ✅ Status

**Issue:** 401 CredentialsSignin - authorize function not being called or returning null

**Possible Causes:**
1. User doesn't exist in database with the email being tested
2. Password hash doesn't match
3. Authorization function not triggering
4. Database connection issue

## 🔧 Action Required

### Step 1: Create Test User

**You need to create a user account first:**

1. **Visit signup page:**
   https://inphysic.com/auth/signup

2. **Create account:**
   - Email: `teacher@example.com`
   - Password: `teacher123`  
   - Name: `Test Teacher`
   - Role: `TEACHER` (if option available)

### Step 2: Test Login

**After creating account:**

1. **Visit login page:**
   https://inphysic.com/auth/login

2. **Login with:**
   - Email: `teacher@example.com`
   - Password: `teacher123`

3. **Watch for:**
   - Network tab for POST `/api/auth/callback/credentials`
   - Console for any errors
   - DevTools → Application → Cookies for `next-auth.session-token`

### Step 3: Check Server Logs

**After attempting login, check logs:**

```bash
gcloud run services logs read lmsmath-app --region asia-east1 --limit 100 | grep -E "AUTHORIZE|error|CredentialsSignin|401"
```

**Look for:**
- `[AUTHORIZE] Called with: { email: ... }`
- `[AUTHORIZE] Looking up user: ...`
- `[AUTHORIZE] User found: true/false`
- Any error messages

## 📋 Debug Checklist

### ✅ What We Know:
- NextAuth is configured correctly
- Cookie domain set to `.inphysic.com`
- NEXTAUTH_URL = `https://inphysic.com`
- Database connected (50 users exist)
- Redirect callback implemented
- Debug logging enabled

### ⚠️ What We Don't Know:
- Does the test user exist?
- Is password hashed correctly?
- Is authorize function being called?
- What's the actual error in authorize?

## 🎯 Expected Log Output

**If authorize is called, you should see:**

```
[AUTHORIZE] Called with: { email: 'teacher@example.com' }
[AUTHORIZE] Looking up user: teacher@example.com
[AUTHORIZE] User found: true
```

**If password doesn't match:**
- User found but bcrypt.compare returns false

**If user doesn't exist:**
- `[AUTHORIZE] User found: false`

## 🚀 Quick Test Commands

**Test with curl:**

```bash
# 1. Get CSRF token
curl -s "https://inphysic.com/api/auth/csrf" | jq '.csrfToken'

# 2. Test login (replace CSRF_TOKEN and check response)
curl -i -X POST "https://inphysic.com/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=CSRF_TOKEN&email=teacher@example.com&password=teacher123&callbackUrl=/dashboard"
```

**Watch real-time logs:**

```bash
gcloud run services logs tail lmsmath-app --region asia-east1
```

## 📝 Next Steps

1. **Create test user account** via signup page
2. **Attempt login** via login page
3. **Check server logs** for authorize calls
4. **Report back** with:
   - Did authorize function get called?
   - What does the log show?
   - Any errors?

## 🔍 Alternative: Test with Existing User

**If you have existing users in DB:**

1. Get a user email:
   ```bash
   curl -s "https://inphysic.com/api/test-db" | jq '.sampleUsers[0].email'
   ```

2. Create account with that email or check if it has password set

3. Try to login with that email

4. Check logs for that specific login attempt

---

**Current Status:** Waiting for you to create test user and attempt login  
**Next:** Analyze logs after login attempt


