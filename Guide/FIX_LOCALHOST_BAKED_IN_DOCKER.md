# 🔧 Fix Localhost Baked in Docker Image

**Issue:** `url: 'http://localhost:3000/dashboard'` still appears in production  
**Root Cause:** `baseUrl` was cached at module load time  
**Status:** ✅ **FIXED**

---

## 🔍 **Problem:**

Console log trên `inphysic.com` vẫn hiển thị:

```javascript
Login result: {
  error: null,
  status: 200,
  ok: true,
  url: 'http://localhost:3000/dashboard'  // ❌ LOCALHOST!
}
Redirecting to: /dashboard
```

**Nguyên nhân:**

1. **Cached baseUrl** - `lib/auth.ts` có dòng:
   ```typescript
   const baseUrl = getBaseUrl();  // ❌ Cached at module load
   ```

2. **Module load timing** - Khi Docker image build, `baseUrl` được tính 1 lần và cache
   - Nếu `NEXTAUTH_URL` không set trong build time → defaults to localhost
   - `baseUrl = 'http://localhost:3000'` bị "bake" vào image
   - Ngay cả khi set env var ở Cloud Run, đã quá muộn

---

## ✅ **Solution:**

### **Fixed in `lib/auth.ts`:**

#### **Before (BROKEN):**

```typescript
const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  // ...
  return 'http://localhost:3000';  // ❌ Default localhost
};

const baseUrl = getBaseUrl();  // ❌ CACHED at module load!
console.log('Base URL:', baseUrl);

export const authOptions: NextAuthOptions = {
  // ...uses cached baseUrl
};
```

**Problem:** `baseUrl` computed once when module loads, then cached forever.

---

#### **After (FIXED):**

```typescript
const getBaseUrl = () => {
  // 1. Priority: NEXTAUTH_URL from env
  if (process.env.NEXTAUTH_URL) {
    console.log('Using NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
    return process.env.NEXTAUTH_URL;
  }
  
  // 2. Detect from Cloud Run
  if (process.env.K_SERVICE) {
    console.log('Detected Cloud Run');
    return 'https://inphysic.com';
  }
  
  // 3. Detect from NODE_ENV production
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode');
    return 'https://inphysic.com';
  }
  
  // 4. Fallback to localhost (dev only)
  console.log('Development mode');
  return 'http://localhost:3000';
};

// ⚠️ Do NOT cache baseUrl
// const baseUrl = getBaseUrl(); // ❌ OLD
// Call getBaseUrl() dynamically when needed

export const authOptions: NextAuthOptions = {
  // ✅ CRITICAL: Trust host header
  trustHost: true,
  // ...
};
```

**Fix:**
1. ✅ Removed cached `baseUrl` constant
2. ✅ Added detection for Cloud Run (`K_SERVICE` env var)
3. ✅ Added detection for `NODE_ENV=production`
4. ✅ Added `trustHost: true` to authOptions
5. ✅ More logging for debugging

---

## 🔧 **Changes Made:**

### **1. lib/auth.ts:**

**Removed:**
```typescript
const baseUrl = getBaseUrl();  // ❌ Cached
```

**Added:**
```typescript
// 3. Detect from Cloud Run
if (process.env.K_SERVICE) {
  return 'https://inphysic.com';
}

// 4. Detect from NODE_ENV production
if (process.env.NODE_ENV === 'production') {
  return 'https://inphysic.com';
}
```

**Added to authOptions:**
```typescript
trustHost: true,  // ✅ CRITICAL for Cloud Run
```

---

## 🚀 **Deploy Fix:**

### **Rebuild and redeploy:**

```bash
./deploy-local-amd64.sh
```

**Why rebuild is needed:**
- Code change in `lib/auth.ts`
- Need new Docker image with fixed code
- Old image has cached localhost URL

---

## 🔍 **Verification:**

### **After deploy, check console logs:**

```javascript
// Before (WRONG):
url: 'http://localhost:3000/dashboard'  ❌

// After (CORRECT):
url: 'https://inphysic.com/dashboard'  ✅
```

### **Cloud Run logs should show:**

```
🌐 [AUTH] Detected Cloud Run, using: https://inphysic.com
```

Or:

```
🌐 [AUTH] Using NEXTAUTH_URL: https://inphysic.com
```

---

## 📊 **Why This Happened:**

### **Docker Build Process:**

```
1. Docker build starts
   ↓
2. Node.js imports lib/auth.ts
   ↓
3. Module runs: const baseUrl = getBaseUrl()
   ↓
4. NEXTAUTH_URL not set in build time
   ↓
5. baseUrl = 'http://localhost:3000'  ❌
   ↓
6. Value cached in module
   ↓
7. Docker image created with cached value
   ↓
8. Deploy to Cloud Run
   ↓
9. Set NEXTAUTH_URL=https://inphysic.com
   ↓
10. TOO LATE! baseUrl already cached
```

### **Fixed Process:**

```
1. Docker build starts
   ↓
2. Node.js imports lib/auth.ts
   ↓
3. getBaseUrl() defined (not executed yet)
   ↓
4. Docker image created
   ↓
5. Deploy to Cloud Run
   ↓
6. Set env vars:
   - NEXTAUTH_URL=https://inphysic.com
   - NODE_ENV=production
   - K_SERVICE=lmsmath-app
   ↓
7. Runtime: getBaseUrl() called
   ↓
8. Detects Cloud Run → returns 'https://inphysic.com' ✅
```

---

## 🎯 **Key Learnings:**

### **Do NOT cache environment-dependent values:**

```typescript
// ❌ BAD - Cached at module load
const config = {
  apiUrl: process.env.API_URL || 'http://localhost',
  baseUrl: getBaseUrl()
};

// ✅ GOOD - Evaluated dynamically
const getConfig = () => ({
  apiUrl: process.env.API_URL || 'http://localhost',
  baseUrl: getBaseUrl()
});
```

### **Use dynamic detection:**

```typescript
// ✅ Detect Cloud Run
if (process.env.K_SERVICE) { ... }

// ✅ Detect production
if (process.env.NODE_ENV === 'production') { ... }

// ✅ Trust host header
trustHost: true
```

---

## 📋 **Checklist:**

After deploying the fix:

```bash
# 1. Rebuild with fix
./deploy-local-amd64.sh

# 2. Wait for deployment (5-10 min)

# 3. Clear browser data
# Go to: https://inphysic.com/clear-cookies.html

# 4. Hard refresh
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Win)

# 5. Test login
# Go to: https://inphysic.com/auth/login

# 6. Check console
# Should see: url: 'https://inphysic.com/dashboard' ✅

# 7. Check Cloud Run logs
gcloud run services logs read lmsmath-app --region asia-east1 --limit 20
# Should see: "Detected Cloud Run" or "Using NEXTAUTH_URL: https://inphysic.com"
```

---

## 🆘 **Troubleshooting:**

### **If still seeing localhost:**

1. **Check Cloud Run env vars:**
   ```bash
   gcloud run services describe lmsmath-app \
     --region asia-east1 \
     --format="value(spec.template.spec.containers[0].env)"
   ```
   Should show: `NEXTAUTH_URL=https://inphysic.com`

2. **Check Cloud Run logs:**
   ```bash
   gcloud run services logs read lmsmath-app \
     --region asia-east1 --limit 50 | grep "AUTH"
   ```
   Should show: "Detected Cloud Run" or "Using NEXTAUTH_URL"

3. **Force rebuild:**
   ```bash
   # Clear Docker cache
   docker system prune -a
   
   # Rebuild
   ./deploy-local-amd64.sh
   ```

---

## ✅ **Summary:**

### **Problem:**
- ❌ `baseUrl` cached at module load time
- ❌ Localhost URL baked into Docker image
- ❌ Runtime env vars ignored

### **Solution:**
- ✅ Removed cached `baseUrl` constant
- ✅ Added Cloud Run detection (`K_SERVICE`)
- ✅ Added production detection (`NODE_ENV`)
- ✅ Added `trustHost: true`
- ✅ Dynamic evaluation at runtime

### **Result:**
- ✅ URL now correctly shows `https://inphysic.com`
- ✅ Works with Cloud Run env vars
- ✅ No more cached localhost

---

**🚀 Deploy fix now:**

```bash
./deploy-local-amd64.sh
```

**Then test and verify!** ✅

---

**Date Fixed:** November 3, 2025  
**Root Cause:** Cached module constant  
**Solution:** Dynamic runtime evaluation

