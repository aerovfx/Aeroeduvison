# 🍪 CLEAR COOKIES NOW - Then Test

---

## 🔍 **Vấn đề tìm thấy:**

```
__Secure-next-auth.callback-url: http%3A%2F%2Flocalhost%3A3000%2Fdashboard
Decoded: http://localhost:3000/dashboard  ❌ VẪN CÒN LOCALHOST!
```

**Cookie cũ vẫn còn!** Phải xóa trước khi test.

---

## ⚡ **GIẢI PHÁP (Chọn 1):**

### **Cách 1: Utility Page (Fastest - 30 giây)**

```
1. Mở browser
2. Go to: https://inphysic.com/clear-cookies.html
3. Đợi auto-clear và redirect
4. Test login ✅
```

---

### **Cách 2: DevTools Manual (1 phút)**

```
1. DevTools (F12)
2. Tab "Application"
3. Left sidebar → "Cookies" → "https://inphysic.com"
4. Find: __Secure-next-auth.callback-url
5. Right-click → Delete
6. Close DevTools
7. Hard refresh: Cmd+Shift+R
8. Test login ✅
```

---

### **Cách 3: Clear All Site Data (Safest - 1 phút)**

```
1. DevTools (F12)
2. Tab "Application"
3. Left sidebar → "Storage"
4. Click "Clear site data" button
5. Confirm
6. Close DevTools
7. Hard refresh: Cmd+Shift+R
8. Test login ✅
```

---

## 🧪 **After Clearing - Test:**

```
1. Mở: https://inphysic.com/auth/login

2. Open Console (F12 → Console)

3. Login: student@example.com / student123

4. Watch console logs
```

### **Expected Console:**

```javascript
⚠️ Clearing bad callback URL cookie containing localhost  ✅
✅ [LOGIN] Login successful!
🔄 [LOGIN] Redirecting to: https://inphysic.com/dashboard  ✅

Login result: {
  error: null,
  status: 200,
  ok: true,
  url: "https://inphysic.com/dashboard"  ✅ CORRECT!
}
```

### **Expected Behavior:**

```
✅ Page redirects to: https://inphysic.com/dashboard
✅ Dashboard loads (200 OK, not 307)
✅ Session persists
✅ No localhost URLs
```

---

## 📊 **Verify Cookies After Login:**

```javascript
// Paste in console after login
document.cookie.split(';').forEach(c => {
  const decoded = decodeURIComponent(c);
  if (decoded.includes('callback-url')) {
    console.log('Callback URL cookie:', decoded);
  }
});

// Should show:
✅ callback-url=/dashboard
// OR
✅ callback-url=https://inphysic.com/dashboard

// NOT:
❌ callback-url=http://localhost:3000/dashboard
```

---

## 🎯 **Quick Actions:**

```
FASTEST:
→ https://inphysic.com/clear-cookies.html

MANUAL:
→ DevTools → Application → Cookies → Delete callback-url

SAFEST:
→ DevTools → Application → Clear site data
```

---

## ✅ **After Clearing:**

**Code fixes sẽ:**
- ✅ Auto-clear bad cookies on next visit
- ✅ Strip localhost from URLs
- ✅ Force correct production URL
- ✅ Prevent localhost cookies in future

---

## 🚀 **DO THIS NOW:**

### **Option A: Fastest (30 sec)**
```
open https://inphysic.com/clear-cookies.html
```

### **Option B: Manual (1 min)**
```
DevTools → Application → Cookies → Delete: __Secure-next-auth.callback-url
Refresh → Test login
```

---

**🎉 Clear cookies và test ngay!** 🚀

**Expected:** Login redirect đúng về https://inphysic.com/dashboard ✅

