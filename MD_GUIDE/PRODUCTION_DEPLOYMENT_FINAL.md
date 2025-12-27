# 🚀 Production Deployment - Final Guide

**Date:** 2025-11-01  
**Status:** ✅ **Ready to Deploy**

---

## 📊 **Current Situation:**

### **✅ Local Development (.env.local):**
```bash
NEXTAUTH_URL="http://localhost:3000"  # ✅ Correct for localhost
NEXTAUTH_SECRET="8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"
```

### **❓ Production (Cloud Run):**
```bash
NEXTAUTH_URL=???  # Need to verify/update
```

**Evidence of issue:**
```javascript
Login result: { url: "http://localhost:3000/dashboard" }  // ❌ Shows localhost!
```

---

## 🎯 **SOLUTION - 2 Deployment Options:**

---

### **🔥 OPTION 1: Update Env Var Only (5 min) - FASTEST**

**Use when:** Service already deployed, just need to fix NEXTAUTH_URL

```bash
cd /Users/vietchung/lmsmath

# Run fix script
./scripts/fix-nextauth-url-production.sh
```

**What it does:**
```
1. Updates NEXTAUTH_URL to https://inphysic.com
2. Redeploys with new env var
3. Verifies the change
```

**Timeline:** 2-3 minutes

---

### **🛠️ OPTION 2: Full Deployment (15 min) - RECOMMENDED**

**Use when:** Want to deploy all latest code changes

```bash
cd /Users/vietchung/lmsmath

# Method A: Quick deploy script
./scripts/quick-deploy.sh

# OR Method B: Main deploy script  
./deploy.sh
```

**What it does:**
```
1. Clears cache
2. Builds Docker image (includes all fixes)
3. Pushes to Google Container Registry
4. Deploys to Cloud Run with correct env vars:
   - NEXTAUTH_URL=https://inphysic.com
   - NODE_ENV=production
   - All other required vars
```

**Timeline:** 10-15 minutes

**Benefits:**
- ✅ Fresh build with all latest fixes
- ✅ All env vars set correctly
- ✅ Clean deployment
- ✅ Most reliable

---

## 📋 **Complete Deployment Steps:**

### **Pre-Deployment:**

```bash
# 1. Verify you're in correct directory
cd /Users/vietchung/lmsmath
pwd  # Should show: /Users/vietchung/lmsmath

# 2. Check files are saved
git status

# 3. Check gcloud authentication
gcloud auth list

# If not authenticated:
gcloud auth login
gcloud config set project lmsmath
```

---

### **Deploy (Choose Option 1 OR Option 2):**

#### **Option 1: Quick env var update**
```bash
./scripts/fix-nextauth-url-production.sh
```

#### **Option 2: Full deployment (RECOMMENDED)**
```bash
./scripts/quick-deploy.sh

# Or
./deploy.sh
```

---

### **Post-Deployment:**

```bash
# 1. Wait for deployment to complete
# Look for: "✅ Deployment Complete!"

# 2. Verify NEXTAUTH_URL (optional)
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" | grep NEXTAUTH

# Should show:
# NEXTAUTH_URL=https://inphysic.com

# 3. Open browser
open https://inphysic.com
```

---

### **Browser Testing:**

```
1. Fix DevTools (if needed):
   - Open DevTools (F12)
   - Network tab
   - Disable "Request blocking" (icon 🚫)

2. Clear everything:
   - DevTools → Application → Storage → Clear site data
   - Or: Cookies → https://inphysic.com → Clear

3. Hard refresh:
   - Mac: Cmd+Shift+R
   - Windows: Ctrl+Shift+R

4. Test login:
   - Go to: https://inphysic.com/auth/login
   - Email: student@example.com
   - Password: student123
   - Click "Login"

5. Verify in Console (F12):
   ✅ Login result: { url: "https://inphysic.com/dashboard" }
   ✅ Redirects to dashboard
   ✅ No errors

6. Test features:
   - Dashboard: https://inphysic.com/dashboard
   - Emotion: https://inphysic.com/dashboard/emotion
   - LabTwin: https://inphysic.com/dashboard/labtwin
   - AI Tutor (as student): Should show "Teacher-only" page

7. Test as teacher:
   - Logout
   - Login as: teacher@example.com / teacher123
   - AI Tutor: Should work fully
```

---

## 🔍 **Environment Variables Reference:**

### **Development (.env.local) - Current:**
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"
NODE_ENV=development
```

### **Production (Cloud Run) - Target:**
```bash
NEXTAUTH_URL=https://inphysic.com
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa
NODE_ENV=production
DATABASE_URL=<your-production-database>
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

**Both deploy scripts already set these correctly!** ✅

---

## 🎯 **RECOMMENDED ACTION:**

```bash
cd /Users/vietchung/lmsmath

# Full deployment with all fixes
./scripts/quick-deploy.sh

# Timeline: ~10-15 minutes
# Includes: All code fixes + correct NEXTAUTH_URL
```

**Why full deploy:**
- ✅ Includes all 8 code fixes
- ✅ Sets NEXTAUTH_URL correctly
- ✅ Fresh build (most reliable)
- ✅ One command does everything

---

## 📊 **What Will Be Deployed:**

### **Code Changes:**
1. ✅ Emotion heatmap (colors + grid)
2. ✅ Login redirect (hard redirect)
3. ✅ Middleware (allow /dashboard + NextAuth callback)
4. ✅ NextAuth config (trustHost + defensive redirect)
5. ✅ Login form (error=undefined filter)
6. ✅ AI features (teacher-only restriction)
7. ✅ Cookies (callbackUrl httpOnly: false)

### **Environment:**
- ✅ NEXTAUTH_URL=https://inphysic.com
- ✅ NODE_ENV=production
- ✅ All required secrets

---

## ⏱️ **Timeline:**

```
00:00 - Start: ./scripts/quick-deploy.sh
00:30 - Building Docker image...
05:00 - Pushing to GCR...
10:00 - Deploying to Cloud Run...
12:00 - Deployment complete!
12:30 - Clear browser cookies
13:00 - Test login
14:00 - ✅ ALL WORKING!
```

**Total:** ~15 minutes

---

## 🎊 **After Deployment:**

### **You'll have:**
- ✅ Working login/logout flow
- ✅ Proper redirects (https://inphysic.com)
- ✅ Session management
- ✅ Role-based access (Student/Teacher/Admin)
- ✅ 41 LabTwin experiments
- ✅ Emotion heatmap with classroom grid
- ✅ AI features (teacher-only)
- ✅ Professional UI
- ✅ Production-ready platform

---

## 🚀 **EXECUTE NOW:**

```bash
cd /Users/vietchung/lmsmath
./scripts/quick-deploy.sh
```

**Then after deployment:**
```
1. Clear cookies
2. Hard refresh
3. Test login at: https://inphysic.com/auth/login
4. Verify redirect to: https://inphysic.com/dashboard ✅
```

---

**📖 Docs:**
- `ACTION_REQUIRED.md` - Quick reference
- `PRODUCTION_DEPLOYMENT_FINAL.md` - This file
- `READY_TO_DEPLOY.md` - Complete guide

---

**🎉 Chạy `./scripts/quick-deploy.sh` và bạn xong!** 🚀
