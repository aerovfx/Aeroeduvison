# 🚀 Rebuild & Deploy - Final Solution

**Issue:** Code built with old env vars (localhost)  
**Solution:** Rebuild Docker image → Deploy with correct env vars  
**Time:** 15-20 minutes

---

## 🎯 **Root Cause:**

```
Current deployment = Built with NEXTAUTH_URL=http://localhost:3000
Code compiled = Has localhost hardcoded from build time
Env vars on Cloud Run = Set to https://inphysic.com

BUT: Running code still uses localhost from build!

Solution: REBUILD with correct env vars
```

---

## ✅ **COMPLETE FIX (Choose 1 method):**

---

### **🔥 METHOD 1: Full Deploy Script (RECOMMENDED)**

**One command does everything:**

```bash
cd /Users/vietchung/lmsmath
./FINAL_DEPLOY_NOW.sh
```

**What it does:**
```
1. Clear .next cache
2. Build NEW Docker image (fresh, no old env vars)
3. Push to Google Container Registry
4. Clear old env vars on Cloud Run
5. Deploy with CORRECT env vars:
   ✅ NEXTAUTH_URL=https://inphysic.com
   ✅ All other vars
6. Verify deployment
```

**Timeline:** ~15 minutes

---

### **METHOD 2: Main Deploy Script**

```bash
cd /Users/vietchung/lmsmath
./deploy.sh
```

**Same result, alternative script**

---

## 🧪 **After Deployment:**

### **Step 1: Fix Browser (Do These 2 Things)**

#### **A. Disable DevTools Blocking:**
```
F12 → Network tab → Find 🚫 icon → Uncheck "Enable request blocking"
```

#### **B. Clear Cookies:**
```
Go to: https://inphysic.com/clear-cookies.html
→ Auto-clears
→ Auto-redirects to login
```

### **Step 2: Hard Refresh**
```
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)
```

### **Step 3: Test Login**
```
1. Go to: https://inphysic.com/auth/login
2. Login: student@example.com / student123
3. Open Console (F12)
```

**Expected Console Output:**
```javascript
🌐 [AUTH] NextAuth Base URL: https://inphysic.com  ✅
✅ [LOGIN] Login successful!
🔄 [LOGIN] Redirecting to: https://inphysic.com/dashboard  ✅

Login result: {
  error: null,
  status: 200,
  ok: true,
  url: "https://inphysic.com/dashboard"  ✅ CORRECT!
}
```

**Expected Browser:**
```
✅ Redirects to https://inphysic.com/dashboard
✅ Dashboard loads (200 OK)
✅ No 307 redirects
✅ Session persists
✅ No localhost anywhere
```

---

## 📊 **Why Rebuild is Necessary:**

### **Next.js Build Process:**

```
Build Time (npm run build):
→ Reads process.env.NEXTAUTH_URL
→ If set: Uses that value
→ If not set: Uses default (localhost)
→ Value gets "baked" into compiled code

Runtime:
→ Code tries to read process.env.NEXTAUTH_URL again
→ But some parts already compiled with build-time value
→ Mixed results → localhost appears

Solution:
→ Build with NEXTAUTH_URL=https://inphysic.com
→ Everything compiled with correct value
→ Runtime also has correct value
→ Consistent! ✅
```

---

## 🔍 **What Deploy Script Does:**

```bash
# 1. Clean build
rm -rf .next

# 2. Docker build with current env
docker build --no-cache ...

# 3. In Dockerfile, Next.js build reads:
ENV NODE_ENV=production
# And will read NEXTAUTH_URL from runtime injection

# 4. Deploy to Cloud Run with env vars
gcloud run deploy \
  --set-env-vars "NEXTAUTH_URL=https://inphysic.com,..."

# 5. Cloud Run injects env vars at container startup
# 6. Code reads process.env.NEXTAUTH_URL ✅
# 7. Returns: https://inphysic.com ✅
```

---

## 📋 **Complete Deployment Checklist:**

### **Pre-Deploy:**
- [x] ✅ All code fixes committed
- [x] ✅ next.config.js has runtime config
- [x] ✅ lib/auth.ts has getBaseUrl()
- [x] ✅ Deploy scripts ready
- [ ] gcloud authenticated
- [ ] Correct project selected

### **Deploy:**
```bash
cd /Users/vietchung/lmsmath
./FINAL_DEPLOY_NOW.sh
```

- [ ] Wait for build (~5 min)
- [ ] Wait for push to GCR (~3 min)
- [ ] Wait for Cloud Run deploy (~5 min)
- [ ] See "✅ DEPLOYMENT COMPLETE!"
- [ ] Verify logs show https://inphysic.com

### **Post-Deploy:**
- [ ] Disable DevTools request blocking
- [ ] Clear cookies (utility page)
- [ ] Hard refresh
- [ ] Test login
- [ ] Verify console shows https://inphysic.com
- [ ] Verify redirect works
- [ ] Test all features

---

## 🎯 **Expected Deployment Logs:**

**During startup, Cloud Run logs will show:**

```
🌐 [AUTH] NextAuth Base URL: https://inphysic.com  ✅
🔐 NODE_ENV: production
☁️  K_SERVICE: lmsmath-app
```

**If shows:**
```
🌐 [AUTH] NextAuth Base URL: http://localhost:3000  ❌
```

→ Env vars not injected properly → Redeploy needed

---

## ⏱️ **Timeline:**

```
00:00 - Start: ./FINAL_DEPLOY_NOW.sh
01:00 - Clear cache
02:00 - Docker build starting
07:00 - Docker build complete
08:00 - Push to GCR
11:00 - Push complete
12:00 - Deploy to Cloud Run
15:00 - Deployment complete ✅

Then:
15:30 - Disable DevTools blocking (30 sec)
16:00 - Clear cookies (30 sec)
16:30 - Test login (1 min)
18:00 - ✅ SUCCESS!
```

**Total:** ~18 minutes

---

## 💡 **Why This Will Work:**

**Current state:**
- ✅ Code has all fixes
- ✅ Env vars set on Cloud Run
- ❌ But OLD deployment (built with localhost)

**After rebuild:**
- ✅ NEW Docker image
- ✅ Built with access to env vars
- ✅ Deployed with NEXTAUTH_URL=https://inphysic.com
- ✅ Code reads correct value at runtime
- ✅ Returns https://inphysic.com ✅

---

## 🚀 **EXECUTE NOW:**

```bash
cd /Users/vietchung/lmsmath
./FINAL_DEPLOY_NOW.sh
```

**Then after deployment:**
1. Disable DevTools blocking: F12 → Network → 🚫
2. Clear cookies: https://inphysic.com/clear-cookies.html
3. Test login
4. Success! ✅

---

## 📖 **Documentation:**

- `REBUILD_AND_DEPLOY.md` - This file
- `FINAL_DEPLOY_NOW.sh` - Deploy script
- `EXECUTE_THIS_NOW.md` - Quick guide

---

**🎊 This is THE final solution! Run the script!** 🚀

