# 🚨 CRITICAL: NEXTAUTH_URL Still Localhost on Production

**Date:** 2025-11-01  
**Issue:** Login shows `url: "http://localhost:3000/dashboard"` on production  
**Priority:** 🔴 **CRITICAL - Must Fix Before Deploy**  
**Status:** ✅ **Script Ready**

---

## 🐛 **The Problem:**

```javascript
// On https://inphysic.com/auth/login
Login result: {
  error: null,
  status: 200,
  ok: true,
  url: "http://localhost:3000/dashboard"  // ❌ WRONG!
}

// Should be:
url: "https://inphysic.com/dashboard"  // ✅ CORRECT
```

**Impact:**
- ❌ Redirect might fail
- ❌ Cookies might not work
- ❌ CORS issues possible
- ❌ Unprofessional appearance
- ❌ Users might see localhost URLs

---

## 🔍 **Root Cause:**

**NEXTAUTH_URL environment variable on Cloud Run is STILL set to localhost!**

```bash
# What's deployed:
NEXTAUTH_URL=http://localhost:3000  ❌

# What should be:
NEXTAUTH_URL=https://inphysic.com   ✅
```

**Why this happened:**
1. Initial deployment used development `.env.local`
2. Or manual update forgot to change NEXTAUTH_URL
3. Deploy script has it correct, but wasn't applied yet
4. Previous deployment still using old value

---

## ✅ **Quick Fix (5 minutes):**

### **Option 1: Run Fix Script (Recommended)**

```bash
# One command to fix everything
./scripts/fix-nextauth-url-production.sh
```

**What it does:**
1. ✅ Checks current NEXTAUTH_URL
2. ✅ Updates to `https://inphysic.com`
3. ✅ Deploys new revision
4. ✅ Updates traffic to new revision
5. ✅ Verifies the change

**Timeline:** ~2-3 minutes

---

### **Option 2: Manual gcloud Command**

```bash
# Update env var
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-env-vars NEXTAUTH_URL=https://inphysic.com

# Wait for deployment (~1 minute)

# Verify
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" | grep NEXTAUTH
```

---

### **Option 3: Full Redeploy (If other changes too)**

```bash
# Deploy with correct NEXTAUTH_URL
./scripts/quick-deploy.sh

# Or
./deploy.sh
```

**Timeline:** ~10-15 minutes (full rebuild)

---

## 🧪 **Verification:**

### **Before Fix:**

```javascript
// Console log shows:
Login result: {
  url: "http://localhost:3000/dashboard"  ❌
}
```

### **After Fix:**

```javascript
// Console log should show:
Login result: {
  url: "https://inphysic.com/dashboard"  ✅
}
```

---

## 📊 **Testing Steps:**

### **1. Check Current Value:**

```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" | grep NEXTAUTH_URL

# If shows localhost → NEEDS FIX
# If shows inphysic.com → GOOD
```

### **2. After Fix, Test Login:**

```bash
# Clear cookies!
# DevTools → Application → Cookies → Clear All

# Hard refresh
# Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

# Login
1. Go to: https://inphysic.com/auth/login
2. Enter credentials
3. Check console (F12)
4. Look for: Login result: { url: "https://inphysic.com/dashboard" }
5. Should redirect successfully ✅
```

---

## 🔒 **Why This is Critical:**

### **1. Security:**
```
localhost URLs in production = Security red flag
- Could expose internal infrastructure
- Breaks HTTPS
- CORS issues
```

### **2. Functionality:**
```
- Cookies might not be set correctly
- Redirects might fail
- Session management broken
- OAuth callbacks fail
```

### **3. User Experience:**
```
- Users see localhost URLs
- Confusion about where they are
- Looks unprofessional
- Trust issues
```

---

## 📝 **Related Configuration:**

### **All Environment Variables:**

```bash
# Required for production:
NEXTAUTH_URL=https://inphysic.com          # ← CRITICAL!
NEXTAUTH_SECRET=<your-secret-32-chars>     # ✅ Should be set
NODE_ENV=production                         # ✅ Should be set
DATABASE_URL=<your-database-url>           # ✅ Should be set
```

### **Check All Env Vars:**

```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

---

## 🎯 **Prevention:**

### **Update Deploy Scripts:**

**File:** `deploy.sh` (Line 86)
```bash
--set-env-vars "NEXTAUTH_URL=https://inphysic.com,NODE_ENV=production"
```

**File:** `scripts/quick-deploy.sh` (Line 50)
```bash
--set-env-vars "NEXTAUTH_URL=https://inphysic.com,NODE_ENV=production"
```

**Both already have it!** ✅

Just need to run them to apply.

---

## 🚀 **Deployment Checklist:**

### **Pre-Deploy:**
- [ ] Check NEXTAUTH_URL on Cloud Run
- [ ] If localhost → Run fix script
- [ ] Verify env vars correct
- [ ] Test locally works

### **Deploy:**
```bash
./scripts/fix-nextauth-url-production.sh  # If needed
# OR
./scripts/quick-deploy.sh                  # Full deploy
```

### **Post-Deploy:**
- [ ] Clear browser cookies
- [ ] Hard refresh
- [ ] Test login
- [ ] Check console: url should be https://inphysic.com
- [ ] Verify redirect works
- [ ] Test session persistence

---

## 📖 **Documentation:**

### **Related Issues:**

| # | Issue | Fix | Status |
|---|-------|-----|--------|
| 1 | Login redirect not working | Hard redirect | ✅ |
| 2 | Login redirect loop | NextAuth callback | ✅ |
| 3 | Dashboard 307 | Middleware allow | ✅ |
| 4 | Production redirect | callbackUrl httpOnly | ✅ |
| 5 | error=undefined | Filter + clean URL | ✅ |
| 6 | **NEXTAUTH_URL localhost** | **Update env var** | 🔴 **DO THIS NOW** |

---

## 💡 **Quick Reference:**

### **Problem:**
```
url: "http://localhost:3000/dashboard" on production
```

### **Cause:**
```
NEXTAUTH_URL=http://localhost:3000 on Cloud Run
```

### **Fix:**
```bash
./scripts/fix-nextauth-url-production.sh
```

### **Verify:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" | grep NEXTAUTH
```

### **Test:**
```
Login → Check console → url should be https://inphysic.com/dashboard
```

---

## ⚠️ **IMPORTANT:**

**This MUST be fixed before production use!**

```
Current state:
❌ NEXTAUTH_URL = localhost
❌ Login shows localhost URLs
❌ Not production-ready

After fix:
✅ NEXTAUTH_URL = https://inphysic.com
✅ Login shows production URLs
✅ Production-ready
```

---

## 🎉 **After Fix:**

**You'll see:**
```javascript
✅ Login result: { url: "https://inphysic.com/dashboard" }
✅ Clean redirect
✅ No localhost references
✅ Professional appearance
✅ All auth features working
```

---

**🚨 RUN THIS NOW:**

```bash
./scripts/fix-nextauth-url-production.sh
```

**Then test login at:**
```
https://inphysic.com/auth/login
```

**🎯 This is the LAST critical fix before production!** 🚀

