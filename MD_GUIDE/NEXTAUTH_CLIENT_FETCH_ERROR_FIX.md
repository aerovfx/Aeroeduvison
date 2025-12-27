# 🔧 NextAuth CLIENT_FETCH_ERROR - Complete Fix Guide

## ⚠️ **Lỗi:**

```
[next-auth][error][CLIENT_FETCH_ERROR] 
https://next-auth.js.org/errors#client_fetch_error
"Failed to fetch"
```

**Ý nghĩa:** NextAuth client không thể fetch session/CSRF token từ API endpoint

---

## 🔍 **Nguyên nhân phổ biến:**

1. ❌ Dev server chưa chạy hoặc đang restart
2. ❌ Port 3000 bị conflict
3. ❌ NEXTAUTH_URL không đúng
4. ❌ API route `/api/auth/[...nextauth]` có lỗi
5. ❌ Network/firewall block localhost
6. ❌ Browser cache cookies cũ

---

## ✅ **Fix theo thứ tự (làm từng bước):**

### **Fix 1: Restart Development Server**

**90% trường hợp fix được với cách này!**

```bash
cd /Users/vietchung/lmsmath

# Stop server nếu đang chạy (Ctrl+C)

# Clear cache
rm -rf .next

# Clear node cache
rm -rf node_modules/.cache

# Restart server
npm run dev
```

**Đợi server khởi động xong (thấy "Ready in...") rồi refresh browser**

---

### **Fix 2: Verify NEXTAUTH_URL**

```bash
# Check .env.local
cat .env.local | grep NEXTAUTH_URL

# Should be: NEXTAUTH_URL="http://localhost:3000"
```

**Nếu không có hoặc sai:**

```bash
# Create/update .env.local
cat > .env.local << 'EOF'
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"
NODE_ENV=development
EOF

# Restart server
npm run dev
```

---

### **Fix 3: Clear Browser Cookies**

```javascript
// Paste vào Console (F12 → Console tab):

// Clear all cookies
document.cookie.split(";").forEach(c => {
  const cookieName = c.split("=")[0].trim();
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
});

console.log('✅ Cookies cleared!');
location.reload();
```

**Hoặc:**
- Chrome DevTools → Application → Cookies → localhost:3000 → Clear All
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

---

### **Fix 4: Check Port Availability**

```bash
# Check if port 3000 is available
lsof -i :3000

# If port is used by another process, kill it:
kill -9 $(lsof -t -i :3000)

# Or use different port
PORT=3001 npm run dev
```

---

### **Fix 5: Verify NextAuth API Route Works**

```bash
# Test NextAuth endpoints (when server is running)
curl http://localhost:3000/api/auth/session
# Should return: {} (empty session if not logged in)

curl http://localhost:3000/api/auth/csrf
# Should return: {"csrfToken": "..."}

curl http://localhost:3000/api/auth/providers
# Should return: {"credentials": {...}, "google": {...}}
```

**Nếu trả về HTML/404** → NextAuth route có vấn đề

---

### **Fix 6: Check NextAuth Config**

Verify file exists và đúng:

```bash
ls -la app/api/auth/\[...nextauth\]/route.ts
ls -la lib/auth.ts
```

**Nếu thiếu** → NextAuth chưa được setup đúng

---

### **Fix 7: Disable Strict Mode (temporary)**

Nếu vẫn lỗi, tắt React Strict Mode tạm thời:

**File:** `app/layout.tsx`

```typescript
// ❌ Nếu có StrictMode
<React.StrictMode>
  <body>...</body>
</React.StrictMode>

// ✅ Tắt tạm thời để test
<body>...</body>
```

---

### **Fix 8: Check Network Tab**

1. Mở DevTools → Network tab
2. Refresh page
3. Tìm request tới `/api/auth/session` hoặc `/api/auth/csrf`

**Nếu thấy:**
- Status: `(failed)` → Server không running
- Status: `404` → Route không tồn tại
- Status: `500` → Server error (check terminal logs)
- Status: `200` → OK! Vấn đề ở nơi khác

---

## 🚀 **Quick Fix Script:**

```bash
#!/bin/bash
# Save as: scripts/fix-nextauth-error.sh

echo "🔧 Fixing NextAuth CLIENT_FETCH_ERROR..."
echo ""

# 1. Stop any running servers
echo "1️⃣ Stopping any running servers..."
pkill -f "next dev" || true
sleep 2

# 2. Clear caches
echo "2️⃣ Clearing caches..."
rm -rf .next
rm -rf node_modules/.cache

# 3. Verify .env.local
echo "3️⃣ Checking NEXTAUTH_URL..."
if grep -q 'NEXTAUTH_URL="http://localhost:3000"' .env.local 2>/dev/null; then
    echo "   ✅ NEXTAUTH_URL is correct"
else
    echo "   ⚠️  Setting NEXTAUTH_URL..."
    echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env.local
fi

# 4. Restart server
echo "4️⃣ Restarting server..."
echo ""
echo "   Run: npm run dev"
echo ""
echo "5️⃣ Then:"
echo "   - Wait for 'Ready in...'"
echo "   - Hard refresh browser (Cmd+Shift+R)"
echo "   - Clear cookies if needed"
echo ""
echo "✅ Done! Server should work now."
```

---

## 🎯 **Most Common Solution:**

```bash
# 90% cases fixed with this:
rm -rf .next && npm run dev
```

**Then:**
1. Wait for "✓ Ready in XXXms"
2. Hard refresh browser (Cmd+Shift+R)
3. If still error → Clear cookies

---

## 📋 **Verification Checklist:**

- [ ] Server is running (`npm run dev` active)
- [ ] See "✓ Ready" in terminal
- [ ] `.env.local` has `NEXTAUTH_URL=http://localhost:3000`
- [ ] Port 3000 is not blocked
- [ ] Browser can access http://localhost:3000
- [ ] No cookies from `inphysic.com` in localhost
- [ ] Hard refresh done (Cmd+Shift+R)

---

## 🆘 **Nếu vẫn lỗi sau tất cả:**

### **Last Resort Fix:**

```bash
# Nuclear option - complete clean install
rm -rf node_modules .next
npm install
npm run dev
```

### **Debug logs:**

```bash
# Enable NextAuth debug
# Add to .env.local:
NEXTAUTH_DEBUG=true

# Restart và check terminal logs
```

### **Alternative port:**

```bash
# If port 3000 has issues
PORT=3001 npm run dev

# Update .env.local:
NEXTAUTH_URL="http://localhost:3001"
```

---

## 📊 **Timeline:**

| Step | Time | Action |
|------|------|--------|
| 1 | 10s | Clear cache (`rm -rf .next`) |
| 2 | 30s | Start server (`npm run dev`) |
| 3 | 5s | Hard refresh browser |
| 4 | 5s | Clear cookies (if needed) |
| **TOTAL** | **~1 min** | **Should be fixed!** |

---

## ✅ **Expected Behavior After Fix:**

### **Console (no errors):**
```
✅ Loaded 30 Python simulations
(No CLIENT_FETCH_ERROR)
```

### **Network tab:**
```
/api/auth/session → 200 OK
/api/auth/csrf → 200 OK
```

### **Cookies:**
```
next-auth.session-token (if logged in)
next-auth.csrf-token
```

---

**🎉 Chạy ngay:**
```bash
rm -rf .next && npm run dev
```

**Then hard refresh browser! (Cmd+Shift+R)** 🚀

