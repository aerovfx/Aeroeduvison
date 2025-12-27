# 🔧 Environment Configuration Guide

## ⚠️ **QUAN TRỌNG: Fix Cookie Domain Issue**

### **Vấn đề:**
- Cookie được set cho domain `inphysic.com` (production)
- App đang chạy trên `localhost:3000` (development)
- NextAuth không đọc được cookie → Session fail → Redirect fail

### **Giải pháp:**

---

## 📝 **Bước 1: Tạo file `.env.local` (Development)**

Tạo file `.env.local` tại root project với nội dung:

```bash
# ========================================
# NextAuth Configuration (DEVELOPMENT)
# ========================================

# CRITICAL: Phải là localhost khi dev
NEXTAUTH_URL=http://localhost:3000

# Secret key (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-development-secret-key-minimum-32-characters

# ========================================
# Database
# ========================================
DATABASE_URL=postgresql://user:password@localhost:5432/lmsmath

# ========================================
# Optional Services
# ========================================
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Environment
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

---

## 📝 **Bước 2: Tạo file `.env` (Production - cho deploy)**

Tạo file `.env` tại root project với nội dung:

```bash
# ========================================
# NextAuth Configuration (PRODUCTION)
# ========================================

# CRITICAL: Phải match với production domain
NEXTAUTH_URL=https://inphysic.com

# Secret key (PHẢI KHÁC với development)
NEXTAUTH_SECRET=your-production-secret-key-different-from-dev

# ========================================
# Database (Production)
# ========================================
DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/lmsmath_prod

# Environment
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

---

## 🔧 **Bước 3: Verify Cookie Config (Đã OK)**

File `lib/auth.ts` đã có config đúng:

```typescript
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      // ✅ Không set domain - Tự động dùng current domain
    },
  },
  // ... other cookies
}
```

**✅ Config này đã đúng!** Không cần sửa gì.

---

## 🧹 **Bước 4: Clear Old Cookies**

### **Option A: Qua Browser**

1. Mở Chrome DevTools (F12)
2. Application → Cookies → `http://localhost:3000`
3. Xóa tất cả cookies có `next-auth` hoặc `inphysic.com`

### **Option B: Qua Console**

Paste vào Console:

```javascript
// Clear all NextAuth cookies
document.cookie.split(";").forEach(c => {
  const cookieName = c.split("=")[0].trim();
  if (cookieName.includes('next-auth') || cookieName.includes('__Host-') || cookieName.includes('__Secure-')) {
    // Clear with different domain/path combinations
    ['/', ''].forEach(path => {
      ['', 'localhost', 'inphysic.com', '.inphysic.com'].forEach(domain => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; ${domain ? 'domain=' + domain : ''}`;
      });
    });
  }
});

console.log('✅ Cookies cleared! Please reload page.');
location.reload();
```

### **Option C: Dùng trang Clear Session**

Mở: http://localhost:3000/clear-session

---

## 🔄 **Bước 5: Restart Development Server**

```bash
# Stop server (Ctrl+C)

# Clear cache
rm -rf .next

# Restart
npm run dev
```

---

## ✅ **Bước 6: Test Login Flow**

1. Mở http://localhost:3000/auth/login
2. Login với credentials
3. Check Console logs:

```
🔐 [AUTHORIZE] called with: {email: "user@example.com"}
✅ [JWT] Token created: {email: "user@example.com", role: "STUDENT", id: "..."}
✅ [SESSION] Session created: {id: "...", email: "...", role: "..."}
🔀 [REDIRECT] Redirect callback: {url: "/dashboard", baseUrl: "http://localhost:3000"}
```

4. Check Cookies (Application tab):

Phải thấy:
- ✅ `next-auth.session-token` (NO domain attribute)
- ✅ `next-auth.csrf-token` (NO domain attribute)
- ✅ Domain: `localhost` hoặc empty

**KHÔNG thấy:**
- ❌ `__Host-next-auth...` với domain `inphysic.com`

---

## 🚀 **Bước 7: Deploy to Production**

Sau khi test local OK, deploy lên production:

```bash
cd /Users/vietchung/lmsmath

# Build and deploy
./deploy.sh
```

**Lưu ý:** Production sẽ tự động dùng:
- NEXTAUTH_URL=https://inphysic.com (từ deploy.sh)
- Cookies với `__Secure-` và `__Host-` prefix
- Domain tự động = inphysic.com

---

## 🔍 **Troubleshooting**

### ❌ Vẫn thấy cookie domain `inphysic.com` trên localhost

**Fix:**
1. Clear tất cả cookies (Option B ở trên)
2. Close ALL browser tabs
3. Restart browser
4. Restart dev server
5. Test lại

### ❌ Session vẫn null sau login

**Check:**

```javascript
// Paste vào Console
fetch('/api/auth/session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Session:', data))

// Nếu trả về {}  → Cookie không được gửi
// Nếu trả về {user: {...}} → Cookie OK
```

### ❌ CSRF token error

**Fix:**

```bash
# Clear cookies và restart
rm -rf .next
npm run dev
```

---

## 📋 **Checklist**

- [ ] Tạo `.env.local` với `NEXTAUTH_URL=http://localhost:3000`
- [ ] Tạo `.env` với `NEXTAUTH_URL=https://inphysic.com`
- [ ] Clear old cookies (domain inphysic.com)
- [ ] Restart dev server (`rm -rf .next && npm run dev`)
- [ ] Test login → Check Console logs
- [ ] Verify cookies trong Application tab (NO domain attribute)
- [ ] Test redirect to /dashboard works
- [ ] Deploy to production (`./deploy.sh`)

---

## 🎯 **Expected Cookies:**

### **Development (localhost:3000):**
```
next-auth.session-token
  Value: eyJ... (JWT token)
  Domain: localhost
  Path: /
  HttpOnly: ✓
  Secure: ✗ (HTTP)
  SameSite: Lax
```

### **Production (inphysic.com):**
```
__Secure-next-auth.session-token
  Value: eyJ... (JWT token)
  Domain: inphysic.com
  Path: /
  HttpOnly: ✓
  Secure: ✓ (HTTPS)
  SameSite: Lax
```

---

## 🆘 **Nếu vẫn lỗi:**

Share với tôi:
1. Console logs khi login
2. Screenshot cookies trong Application tab
3. File `.env.local` content (mask sensitive values)

**🎉 Good luck!**

