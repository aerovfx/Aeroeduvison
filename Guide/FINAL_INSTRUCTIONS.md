# ✅ Ready to Test - Final Instructions

## 🎯 Current Status

- ✅ Enhanced logging added to authorize() function
- ✅ Build completed successfully
- ✅ Deployed to Cloud Run (revision: lmsmath-app-00024-nlm)
- ⚠️ **CSRF token issues with curl** - Need to test via browser

## 🧪 Test Steps (Must Do in Browser)

### Step 1: Create Test User

**Visit:** https://inphysic.com/auth/signup

**Fill in:**
- Email: `teacher@example.com`
- Password: `teacher123`  
- Name: `Test Teacher`
- (Or any other valid values)

**Submit form** to create account

### Step 2: Login

**Visit:** https://inphysic.com/auth/login

**Fill in:**
- Email: `teacher@example.com`
- Password: `teacher123`

**Click "Sign in"**

### Step 3: Watch Logs in Real-Time

**While you're testing, run this in terminal:**

```bash
gcloud run services logs tail lmsmath-app --region asia-east1
```

**Or check recent logs after test:**

```bash
gcloud run services logs read lmsmath-app --region asia-east1 --limit 100 | grep -E "AUTHORIZE|error"
```

## 📋 Expected Behavior

**If user doesn't exist (first time):**

Logs will show:
```
[AUTHORIZE] called with: { email: 'teacher@example.com' }
[AUTHORIZE] looking up user: teacher@example.com
[AUTHORIZE] prisma user: false null
[AUTHORIZE] user not found
```

**Action:** Create account via signup page first

**If user exists and password wrong:**

Logs will show:
```
[AUTHORIZE] called with: { email: 'teacher@example.com' }
[AUTHORIZE] looking up user: teacher@example.com  
[AUTHORIZE] prisma user: true <user-id>
[AUTHORIZE] checking password...
[AUTHORIZE] password valid? false
[AUTHORIZE] invalid password
```

**Action:** Use correct password or reset it

**If everything works:**

Logs will show:
```
[AUTHORIZE] called with: { email: 'teacher@example.com' }
[AUTHORIZE] looking up user: teacher@example.com
[AUTHORIZE] prisma user: true <user-id>
[AUTHORIZE] checking password...
[AUTHORIZE] password valid? true
[AUTHORIZE] login successful for: teacher@example.com
```

**Result:** Cookie set, redirect to /dashboard

## 🎯 What to Report

**After testing, report back:**

1. ✅ Did you signup successfully?
2. ✅ What email did you use?
3. ✅ Did login succeed?
4. ✅ What do the logs show? (Copy paste grep output)
5. ✅ Any errors in console?

## 📝 Checklist

- [ ] Signup page loads correctly
- [ ] Account created successfully
- [ ] Login page loads correctly
- [ ] Login form submits
- [ ] Check Network tab for POST to `/api/auth/callback/credentials`
- [ ] Response status (200 or 401?)
- [ ] Check Application → Cookies for `next-auth.session-token`
- [ ] Copy logs with grep AUTHORIZE

## 🔧 Troubleshooting

**If no logs appear:**
- Authorize function not being called
- Check if signIn() is actually being called on client
- Check browser console for errors

**If logs show user not found:**
- Account not created in database
- Use signup API or seed database

**If logs show password invalid:**
- Password hash doesn't match
- Check how password was hashed when created
- May need to reset password

## 🚀 Quick Test Commands

**After you test, run:**

```bash
# Get recent authorize logs
gcloud run services logs read lmsmath-app --region asia-east1 --limit 200 | grep -A 2 -B 2 "AUTHORIZE"

# Or tail in real-time
gcloud run services logs tail lmsmath-app --region asia-east1
```

---

**Current Status:** ✅ Ready for browser testing  
**Next:** Test in browser and report back with logs


