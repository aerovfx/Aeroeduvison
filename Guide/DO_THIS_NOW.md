# 🚨 DO THIS NOW - Critical Fix

**Status:** Login works BUT shows localhost URL on production!

---

## 🎯 **The Problem:**

```javascript
// On https://inphysic.com after login:
url: "http://localhost:3000/dashboard"  ❌ WRONG!

// Should be:
url: "https://inphysic.com/dashboard"   ✅ CORRECT
```

**Why:** `NEXTAUTH_URL` on Cloud Run is still `localhost`

---

## ✅ **SOLUTION (Choose 1):**

### **Option A: Quick Fix (2-3 minutes) - RECOMMENDED**

**If service is already deployed:**

```bash
# Fix NEXTAUTH_URL without rebuilding
./scripts/fix-nextauth-url-production.sh
```

**Timeline:** ~2-3 minutes  
**Rebuilds:** No (just updates env var)

---

### **Option B: Full Deploy (10-15 minutes)**

**If you have other code changes:**

```bash
# Full deploy (includes NEXTAUTH_URL fix)
./scripts/quick-deploy.sh
```

**Timeline:** ~10-15 minutes  
**Rebuilds:** Yes (full Docker build + deploy)

---

## 🧪 **After Fix, Test:**

```bash
# 1. Clear cookies
DevTools → Application → Cookies → Clear All

# 2. Hard refresh
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

# 3. Login
https://inphysic.com/auth/login
Email: student@example.com
Password: student123

# 4. Check console (F12)
Login result: {
  url: "https://inphysic.com/dashboard"  ✅ CORRECT!
}

# 5. Should redirect to dashboard ✅
```

---

## 📋 **Quick Checklist:**

```
[ ] Run fix script: ./scripts/fix-nextauth-url-production.sh
[ ] Wait 2-3 minutes for deployment
[ ] Clear browser cookies
[ ] Hard refresh (Cmd+Shift+R)
[ ] Test login
[ ] Verify url shows https://inphysic.com
[ ] Confirm redirect works
```

---

## 🎯 **Expected Result:**

**Before:**
```
✅ Login: Success
❌ URL: localhost (wrong)
❌ Redirect: Might fail
```

**After:**
```
✅ Login: Success
✅ URL: https://inphysic.com (correct)
✅ Redirect: Works perfectly
```

---

## ⚡ **DO THIS NOW:**

```bash
cd /Users/vietchung/lmsmath
./scripts/fix-nextauth-url-production.sh
```

**Wait 2-3 minutes, then test!**

---

**🎉 This is the LAST fix! After this, everything works!** 🚀

