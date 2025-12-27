# 🧪 Test Login with Enhanced Logging

## ✅ Status

**Enhanced logging added to authorize() function:**

- `[AUTHORIZE] called with:` - Shows email attempting login
- `[AUTHORIZE] looking up user:` - Shows normalized email
- `[AUTHORIZE] prisma user:` - Shows if user found (true/false and user ID)
- `[AUTHORIZE] checking password...` - When password check starts
- `[AUTHORIZE] password valid?` - Result of password validation (true/false)
- `[AUTHORIZE] login successful for:` - When login succeeds
- `[AUTHORIZE] authorize error:` - Any errors caught

## 🚀 Deploy & Test Steps

### Step 1: Wait for Build (Running in Background)

Build is currently building with enhanced logging...

### Step 2: Deploy

Once build completes:

```bash
gcloud run deploy lmsmath-app \
  --image gcr.io/gen-lang-client-0712182643/lmsmath-app:latest \
  --region asia-east1 \
  --update-env-vars NEXTAUTH_URL="https://inphysic.com"
```

### Step 3: Test Login

**Create user and login:**

1. **Visit:** https://inphysic.com/auth/signup
2. **Create account:**
   - Email: `teacher@example.com`
   - Password: `teacher123`
   - Name: `Test Teacher`
3. **Login:**
   - Visit: https://inphysic.com/auth/login
   - Use same credentials

### Step 4: Check Logs in Real-Time

**Watch logs while testing:**

```bash
gcloud run services logs tail lmsmath-app --region asia-east1
```

**Or filter for authorize logs:**

```bash
gcloud run services logs read lmsmath-app --region asia-east1 --limit 200 | grep -E "AUTHORIZE|error"
```

## 📋 Expected Log Output

**If login succeeds:**

```
[AUTHORIZE] called with: { email: 'teacher@example.com' }
[AUTHORIZE] looking up user: teacher@example.com
[AUTHORIZE] prisma user: true <user-id>
[AUTHORIZE] checking password...
[AUTHORIZE] password valid? true
[AUTHORIZE] login successful for: teacher@example.com
```

**If user doesn't exist:**

```
[AUTHORIZE] called with: { email: 'teacher@example.com' }
[AUTHORIZE] looking up user: teacher@example.com
[AUTHORIZE] prisma user: false null
[AUTHORIZE] user not found
```

**If password wrong:**

```
[AUTHORIZE] called with: { email: 'teacher@example.com' }
[AUTHORIZE] looking up user: teacher@example.com
[AUTHORIZE] prisma user: true <user-id>
[AUTHORIZE] checking password...
[AUTHORIZE] password valid? false
[AUTHORIZE] invalid password
```

**If there's an error:**

```
[AUTHORIZE] authorize error: <error message>
```

## 🎯 What to Report

**After testing, please report:**

1. Did you create a user successfully?
2. What email did you use?
3. What do the logs show?
4. Did login succeed or fail?
5. What was the specific error (if any)?

## 📝 Next Steps After Testing

**Once we see the logs, we can:**

1. **If user not found** → Create user or check database
2. **If password invalid** → Check password hashing
3. **If there's an error** → Fix the specific error
4. **If login succeeds** → Test redirect to dashboard

## 🔧 Alternative: Test with Curl

**If you can't test via UI, test with curl:**

```bash
# Get CSRF token
CSRF_TOKEN=$(curl -s "https://inphysic.com/api/auth/csrf" | jq -r '.csrfToken')
echo "CSRF: $CSRF_TOKEN"

# Test login
curl -i -X POST "https://inphysic.com/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN&email=teacher@example.com&password=teacher123&callbackUrl=/dashboard"

# Check logs
gcloud run services logs read lmsmath-app --region asia-east1 --limit 50 | grep AUTHORIZE
```

---

**Current Status:** Building with enhanced logging...  
**Next:** Deploy and test, then report back with logs


