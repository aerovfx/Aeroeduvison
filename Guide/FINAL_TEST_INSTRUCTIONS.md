# 🎯 Final Test Instructions

## ✅ Current Status

**Issue:** Login succeeds (200 OK) but no session-token cookie → authorize returns null

**What We Know:**
- ✅ User exists in database
- ✅ Registration API works
- ✅ Login POST returns 200 OK
- ✅ CSRF and callback-url cookies set
- ❌ **Missing session-token cookie**

**What This Means:**
Authorize function is returning null, so NextAuth doesn't create a session.

## 🧪 Step-by-Step Test Instructions

### Step 1: Get Your User Email

**What email are you using to login?**

From your screenshots, I see:
- `minhdao1965@gmail.com` in signup form
- Please confirm which email you're trying to login with

### Step 2: Test Login Now

**Visit:** https://inphysic.com/auth/login

**Enter:**
- Email: Your actual email (e.g., `minhdao1965@gmail.com`)
- Password: Your actual password

**Click "Sign in"**

### Step 3: While Testing, Watch Logs

**In a terminal, run:**

```bash
gcloud run services logs tail lmsmath-app --region asia-east1 | grep -E "\[AUTHORIZE\]"
```

**Look for:**
```
[AUTHORIZE] called with: { email: 'your-email@...' }
[AUTHORIZE] looking up user: your-email@...
[AUTHORIZE] prisma user: true/false ...
```

### Step 4: Check Cookies After Login

**In browser DevTools:**
1. Open DevTools (F12)
2. Application → Cookies → inphysic.com
3. Look for: `next-auth.session-token`

**Report back:**
- ✅ Found session-token cookie
- ❌ No session-token cookie (only CSRF and callback-url)

## 📊 Expected Log Output

**If login SHOULD succeed but doesn't get session:**

```
[AUTHORIZE] called with: { email: 'user@example.com' }
[AUTHORIZE] looking up user: user@example.com
[AUTHORIZE] prisma user: true <user-id>
[AUTHORIZE] checking password...
[AUTHORIZE] password valid? false  ← THIS IS THE ISSUE
[AUTHORIZE] invalid password
```

**If user doesn't exist:**

```
[AUTHORIZE] called with: { email: 'user@example.com' }
[AUTHORIZE] looking up user: user@example.com
[AUTHORIZE] prisma user: false null
[AUTHORIZE] user not found
```

## 🔧 Troubleshooting

### If password invalid:

1. **Reset password** via:
   - Visit: https://inphysic.com/auth/forgot-password
   - Enter your email
   - Check email for reset link

2. **Or create new account:**
   - Visit: https://inphysic.com/auth/signup
   - Use password that meets requirements (capital letter, number, special char)

### If no [AUTHORIZE] logs appear:

- Build with logging might not have deployed yet
- Try rebuilding and redeploying
- Or check if authorize function is even being called

## 📝 What to Report

**After testing, please provide:**

1. ✅ What email did you use?
2. ✅ What's the result? (success or error)
3. ✅ **Copy paste the [AUTHORIZE] logs** from server
4. ✅ **Screenshot of cookies** (DevTools → Application → Cookies)
5. ✅ Any error messages (browser console or Network tab)

## 🚀 Quick Commands

**Check recent authorize logs:**

```bash
gcloud run services logs read lmsmath-app --region asia-east1 --limit 200 | grep -A 3 -B 3 "AUTHORIZE"
```

**Watch real-time logs:**

```bash
gcloud run services logs tail lmsmath-app --region asia-east1
```

**Or use the watcher script:**

```bash
./WATCH_LOGS.sh
```

---

**Current Status:** Waiting for your test with actual credentials  
**Next:** Report back with authorize logs and cookies screenshot








