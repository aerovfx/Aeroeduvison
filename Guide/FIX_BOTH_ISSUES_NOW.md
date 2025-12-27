# 🔧 Fix Both Issues - Complete Guide

**Issues:**
1. ❌ DevTools blocking requests
2. ❌ Callback URL cookie = localhost

**Status:** ✅ **Solutions Ready**

---

## ⚡ **QUICK FIX (2 minutes):**

### **Step 1: Disable DevTools Blocking (30 sec)**

```
1. Open DevTools (F12)
2. Click "Network" tab
3. Find icon 🚫 "Request blocking" (top toolbar)
4. Click it
5. UNCHECK "Enable request blocking"
6. Close panel
```

### **Step 2: Clear Cookies (30 sec)**

**Option A: Use utility page**
```
Go to: https://inphysic.com/clear-cookies.html
→ Auto-clears and redirects ✅
```

**Option B: Manual DevTools**
```
DevTools → Application → Cookies → https://inphysic.com
→ Right-click → Clear all
```

### **Step 3: Hard Refresh (5 sec)**

```
Mac: Cmd+Shift+R
Windows: Ctrl+Shift+R
```

### **Step 4: Test Login (1 min)**

```
1. Go to: https://inphysic.com/auth/login
2. Login: student@example.com / student123
3. Should redirect to dashboard ✅
```

---

## 🎯 **OR Use Incognito Mode (Fastest!):**

```
1. Cmd+Shift+N (Mac) / Ctrl+Shift+N (Win)
2. Go to: https://inphysic.com/auth/login
3. Login
4. Should work immediately! ✅
```

**If works in Incognito:**
- Issue = Extensions or DevTools settings
- Solution = Disable extensions or use steps above

---

## 📋 **Complete Checklist:**

```
DevTools Issues:
[ ] F12 → Network → Disable "Request blocking" 🚫
[ ] F12 → Settings ⚙️ → Network → Uncheck "Enable request blocking"
[ ] Close DevTools → Reopen fresh

Cookies:
[ ] Go to: https://inphysic.com/clear-cookies.html
[ ] OR DevTools → Application → Clear site data
[ ] Verify no localhost in cookies

Browser:
[ ] Hard refresh (Cmd+Shift+R)
[ ] Disable extensions (chrome://extensions)
[ ] Test in Incognito mode

Final Test:
[ ] Login at https://inphysic.com/auth/login
[ ] Verify redirect to https://inphysic.com/dashboard
[ ] Check console: url should be "https://inphysic.com/dashboard"
[ ] Session should persist
```

---

## 🧪 **Verification:**

### **Console Test:**

```javascript
// Paste in console (F12)

// Test 1: Check cookies
document.cookie.split(';').forEach(c => {
  if (c.includes('callback-url')) {
    console.log('Callback:', decodeURIComponent(c));
  }
});
// Should NOT contain localhost

// Test 2: Test fetch
fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log('✅ Session:', data))
  .catch(e => console.log('❌ Blocked:', e));
// Should return session data, not error

// Test 3: Check base URL
fetch('/api/auth/providers')
  .then(r => r.json())
  .then(data => console.log('✅ Providers:', data))
  .catch(e => console.log('❌ Blocked:', e));
// Should return providers list
```

---

## 📊 **Expected Results:**

### **Before Fix:**
```
❌ Requests blocked by DevTools
❌ Callback URL = http://localhost:3000/dashboard
❌ Login doesn't redirect
❌ Stuck on login page
```

### **After Fix:**
```
✅ Requests working (200 OK)
✅ Callback URL = /dashboard (or https://inphysic.com/dashboard)
✅ Login redirects successfully
✅ Dashboard loads
```

---

## 🎯 **Timeline:**

```
00:00 - Disable DevTools blocking
00:30 - Clear cookies (utility page or DevTools)
01:00 - Hard refresh
01:30 - Test login
02:00 - ✅ SUCCESS!
```

**Total:** 2 minutes

---

## 💡 **Pro Tips:**

### **1. Always Test in Incognito First:**
```
Incognito = Clean slate
→ No extensions
→ No cache
→ No old cookies
→ Pure test environment
```

### **2. Keep DevTools Closed Unless Debugging:**
```
DevTools open = Possible interference
DevTools closed = Normal user experience
```

### **3. Use Utility Page for Quick Resets:**
```
https://inphysic.com/clear-cookies.html
→ Bookmark this!
→ Use when things feel broken
→ Quick reset
```

---

## 🚨 **If Still Not Working:**

### **Try All These:**

```bash
# 1. Different Browser
open -a Safari https://inphysic.com/auth/login
# Works? → Chrome issue

# 2. Different Network
# Try on phone or different WiFi
# Works? → Network/firewall issue

# 3. Check Server
curl -I https://inphysic.com/api/auth/session
# 200 OK? → Server fine, browser issue
```

---

## 📖 **Documentation:**

- `FIX_BOTH_ISSUES_NOW.md` - This file
- `FIX_DEVTOOLS_BLOCKING_NOW.md` - DevTools details
- `CLEAR_COOKIES_NOW.md` - Cookie clearing
- `DISABLE_REQUEST_BLOCKING.txt` - Visual guide

---

## 🎊 **RECOMMENDED ACTION:**

### **Fastest Solution (30 sec):**

```
1. Open Incognito: Cmd+Shift+N
2. Go to: https://inphysic.com/auth/login
3. Login
4. Check if works ✅

If works:
→ Regular browser has DevTools/extension issues
→ Fix DevTools blocking + clear cookies in regular browser

If doesn't work:
→ Server/code issue
→ Check server logs
```

---

**🚀 Try Incognito mode first, then report results!** ✨

