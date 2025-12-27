# 🔧 Quick Fix - 401 Unauthorized Error

## 🎯 Vấn đề

Vẫn còn lỗi 401 Unauthorized khi đăng nhập:
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
/api/auth/callback/credentials
```

## ✅ Giải pháp nhanh

### 1. **Restart Server**
```bash
# Stop server hiện tại (Ctrl+C)
# Start lại
npm run dev
```

### 2. **Test với credentials đã tạo**
```
Email: admin@lmsmath.com
Password: admin123
```

### 3. **Nếu vẫn lỗi, thử credentials khác**
```
Email: teacher@lmsmath.com
Password: teacher123

Email: student@lmsmath.com
Password: student123
```

### 4. **Clear Browser Cache**
- Hard refresh: `Ctrl+Shift+R` (Windows) hoặc `Cmd+Shift+R` (Mac)
- Hoặc clear browser cache completely

### 5. **Check Console Logs**
- Mở Developer Tools (F12)
- Xem Console tab
- Tìm NextAuth debug logs

## 🔍 Debug Steps

### **Step 1: Check Environment**
```bash
# Verify .env.local exists
cat .env.local | grep NEXTAUTH_SECRET

# Should show:
# NEXTAUTH_SECRET="your-nextauth-secret-key-here-make-it-long-and-random-32-characters-minimum-123456789"
```

### **Step 2: Check Database Connection**
```bash
# Test database
tsx scripts/test-db-connection.js
```

### **Step 3: Check Test Users**
```bash
# Verify users exist
tsx scripts/create-test-user.ts
```

### **Step 4: Check NextAuth Logs**
- Mở browser console
- Tìm logs bắt đầu với `🔐 [AUTHORIZE]`
- Xem có lỗi gì không

## 🚀 Expected Behavior

### **Successful Login**
```
🔐 [AUTHORIZE] Start { email: "admin@lmsmath.com" }
📧 [AUTHORIZE] Email normalized: admin@lmsmath.com → admin@lmsmath.com
✅ [AUTHORIZE] User found: cmgklslp00000g0v0pz3g9iaz admin@lmsmath.com
✅ [AUTHORIZE] User has password
🔑 [AUTHORIZE] Password check: true
✅ [AUTHORIZE] Success! Returning user: { id: "cmgklslp00000g0v0pz3g9iaz", email: "admin@lmsmath.com", role: "ADMIN" }
```

### **Failed Login**
```
🔐 [AUTHORIZE] Start { email: "wrong@email.com" }
❌ [AUTHORIZE] User not found: wrong@email.com
```

## 🎯 Quick Test

### **Test 1: Homepage**
```
http://localhost:3000
```
- Should show beautiful 2-column layout
- No console errors

### **Test 2: Login Form**
```
Email: admin@lmsmath.com
Password: admin123
```
- Should redirect to dashboard
- No 401 errors

### **Test 3: Different Roles**
```
Teacher: teacher@lmsmath.com / teacher123
Student: student@lmsmath.com / student123
```

## 🐛 Common Issues

### **Issue 1: NEXTAUTH_SECRET not loaded**
```bash
# Fix: Restart server
npm run dev
```

### **Issue 2: Database connection**
```bash
# Fix: Check DATABASE_URL
cat .env.local | grep DATABASE_URL
```

### **Issue 3: User not found**
```bash
# Fix: Recreate test users
tsx scripts/create-test-user.ts
```

### **Issue 4: Password mismatch**
```bash
# Fix: Use exact credentials
admin@lmsmath.com / admin123
```

## 🎊 Success Indicators

- ✅ **No 401 errors** in network tab
- ✅ **NextAuth logs** show successful authorization
- ✅ **Redirect to dashboard** after login
- ✅ **Session created** properly
- ✅ **Role-based access** working

---

**If still having issues, check the server logs for detailed NextAuth debug information!** 🔍
