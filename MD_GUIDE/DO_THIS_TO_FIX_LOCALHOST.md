# ✅ Làm Theo Hướng Dẫn Này Để Fix Localhost

---

## 🎯 **TẠI SAO VẪN LÀ LOCALHOST:**

**Dù đã clear cookies, console vẫn show localhost vì:**

```
Code đang chạy trên Cloud Run CHƯA CÓ biến NEXTAUTH_URL
→ getBaseUrl() không tìm thấy NEXTAUTH_URL
→ Fallback về localhost
→ Result: url: "http://localhost:3000/dashboard"
```

**Cookies không phải vấn đề!** Vấn đề là **code không có env var!**

---

## ✅ **GIẢI PHÁP DUY NHẤT:**

**Deploy revision mới với NEXTAUTH_URL**

---

## 📍 **LÀM THEO 10 BƯỚC NÀY:**

### **Bước 1-7: Set Environment Variables**

```
1. Mở browser
2. Go to: https://console.cloud.google.com/run
3. Find và click: lmsmath-app
4. Click button: "EDIT & DEPLOY NEW REVISION" (màu xanh, phía trên)
5. Click tab: "Variables & Secrets" (tab thứ 3)
6. Click button: "+ ADD VARIABLE"
7. Nhập:
   Name:  NEXTAUTH_URL
   Value: https://inphysic.com
   Click: DONE
```

**Lặp lại bước 6-7 cho 6 variables sau:**

```
Variable 2:
Name:  NODE_ENV
Value: production

Variable 3:
Name:  NEXTAUTH_SECRET
Value: 8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa

Variable 4:
Name:  GOOGLE_CLIENT_ID
Value: 442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com

Variable 5:
Name:  GOOGLE_CLIENT_SECRET
Value: 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

Variable 6:
Name: HOSTNAME
Value: 0.0.0.0

Variable 7:
Name: NEXT_TELEMETRY_DISABLED
Value: 1
```

### **Bước 8: Deploy**

```
8. Scroll xuống bottom
9. Click button: "DEPLOY" (màu xanh)
10. Đợi 2-3 phút cho "Service deployed successfully"
```

---

## 🧪 **Sau Deploy - Test:**

### **Bước 1: Clear Cookies**
```
Mở: https://inphysic.com/clear-cookies.html
Đợi auto-redirect về login
```

### **Bước 2: Test Login**
```
Login: student@example.com / student123
Mở Console (F12)
```

### **Bước 3: Verify**

**Console PHẢI show:**
```javascript
🌐 [AUTH] NextAuth Base URL: https://inphysic.com  ✅
Login result: { url: "https://inphysic.com/dashboard" }  ✅
```

**KHÔNG được show:**
```javascript
url: "http://localhost:3000/dashboard"  ❌
```

---

## 📊 **Verification:**

**After deployment, check logs:**

```bash
# Check Cloud Run logs
gcloud run logs read lmsmath-app --region asia-east1 --limit 20

# Look for:
🌐 [AUTH] NextAuth Base URL: https://inphysic.com

# If shows localhost:
→ Env vars not set correctly
→ Redo console UI steps
```

---

## 🎯 **The Key:**

**Problem:**
```
Code running = OLD deployment (no NEXTAUTH_URL)
Env vars = Set via gcloud (but not picked up)

Need: NEW deployment that loads env vars
```

**Solution:**
```
Console UI → Edit & Deploy → Add variables → Deploy
→ Creates NEW revision
→ New revision HAS env vars
→ Code reads NEXTAUTH_URL ✅
→ Returns https://inphysic.com ✅
```

---

## ⏱️ **Timeline:**

```
00:00 - Open console
02:00 - Navigate to service
03:00 - Click Edit & Deploy
04:00 - Add 7 variables
05:00 - Click Deploy
08:00 - Deployment complete ✅
08:30 - Clear cookies
09:00 - Test login
10:00 - ✅ url: "https://inphysic.com/dashboard"
```

**Total:** 10 minutes

---

## 📋 **Checklist:**

```
Console UI:
[ ] Opened https://console.cloud.google.com/run
[ ] Found lmsmath-app service
[ ] Clicked "EDIT & DEPLOY NEW REVISION"
[ ] Added NEXTAUTH_URL=https://inphysic.com
[ ] Added 6 other variables
[ ] Clicked "DEPLOY"
[ ] Waited for "deployed successfully"
[ ] Verified latest revision serving 100%

Testing:
[ ] Cleared cookies (utility page)
[ ] Disabled DevTools blocking
[ ] Hard refreshed
[ ] Tested login
[ ] Console shows https://inphysic.com ✅
```

---

## 💡 **Why This Is The Answer:**

**Clear cookies alone doesn't fix because:**
```
Cookies ≠ Source of localhost URL

Source = Code's getBaseUrl() function
→ Reads from process.env.NEXTAUTH_URL
→ If not found → defaults to localhost
→ That's why you see localhost

Fix = Make sure code CAN READ process.env.NEXTAUTH_URL
→ Set env vars via Console UI
→ Deploy new revision
→ Code now reads https://inphysic.com ✅
```

---

## 🚀 **DO THIS NOW:**

```
https://console.cloud.google.com/run
→ lmsmath-app
→ EDIT & DEPLOY NEW REVISION
→ Variables & Secrets
→ Add: NEXTAUTH_URL = https://inphysic.com
→ Add: 6 other vars
→ DEPLOY
```

**This IS the solution!** ✅

---

**📖 Full Details:** `WHY_LOCALHOST_STILL_APPEARS.md`

**🎯 Action:** Use Console UI to set env vars and deploy!

