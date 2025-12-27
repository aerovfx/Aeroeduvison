# 🔧 Set Environment Variables via Cloud Run Console

**Platform:** Google Cloud Run  
**Method:** Console UI (No CLI needed)  
**Time:** 5 minutes

---

## 🎯 **SOLUTION: Set Env Vars via Console Dashboard**

---

## 📍 **Step-by-Step Guide:**

### **Step 1: Go to Cloud Run Console**

```
URL: https://console.cloud.google.com/run
```

**Or direct link:**
```
https://console.cloud.google.com/run?project=lmsmath
```

---

### **Step 2: Select Service**

```
1. Find service: lmsmath-app
2. Click on service name
3. You'll see service details page
```

---

### **Step 3: Edit & Deploy New Revision**

```
1. Click button: "EDIT & DEPLOY NEW REVISION" (top of page)
2. Wait for edit page to load
```

---

### **Step 4: Go to Variables & Secrets Tab**

```
1. Click tab: "Variables & Secrets"
2. You'll see two sections:
   - Environment variables
   - Secrets
```

---

### **Step 5: Clear Old Variables (if any)**

```
If you see existing variables:
1. Click "X" next to each one to remove
2. Especially remove if they have wrong values
```

---

### **Step 6: Add New Environment Variables**

Click "+ ADD VARIABLE" for each of these:

#### **Variable 1: NEXTAUTH_URL**
```
Name:  NEXTAUTH_URL
Value: https://inphysic.com
```
Click "DONE"

#### **Variable 2: NODE_ENV**
```
Name:  NODE_ENV
Value: production
```
Click "DONE"

#### **Variable 3: HOSTNAME**
```
Name:  HOSTNAME
Value: 0.0.0.0
```
Click "DONE"

#### **Variable 4: NEXT_TELEMETRY_DISABLED**
```
Name:  NEXT_TELEMETRY_DISABLED
Value: 1
```
Click "DONE"

#### **Variable 5: GOOGLE_CLIENT_ID**
```
Name:  GOOGLE_CLIENT_ID
Value: 442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
```
Click "DONE"

#### **Variable 6: GOOGLE_CLIENT_SECRET**
```
Name:  GOOGLE_CLIENT_SECRET
Value: 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
```
Click "DONE"

#### **Variable 7: NEXTAUTH_SECRET**
```
Name:  NEXTAUTH_SECRET
Value: 8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa
```
Click "DONE"

---

### **Step 7: Review Configuration**

**Scroll down and verify:**

```
✅ NEXTAUTH_URL = https://inphysic.com (CRITICAL!)
✅ NODE_ENV = production
✅ NEXTAUTH_SECRET = 8761740715...
✅ GOOGLE_CLIENT_ID = 442514522574-...
✅ GOOGLE_CLIENT_SECRET = GOCSPX-...
✅ HOSTNAME = 0.0.0.0
✅ NEXT_TELEMETRY_DISABLED = 1
```

---

### **Step 8: Deploy**

```
1. Scroll to bottom
2. Click "DEPLOY" button (blue button)
3. Wait for deployment (~2-3 minutes)
4. Look for "Service deployed successfully" ✅
```

---

### **Step 9: Verify Deployment**

```
1. After deploy completes
2. Go back to service details page
3. Click "REVISIONS" tab
4. Latest revision should be serving 100% traffic
```

---

## 🧪 **Test After Deployment:**

### **Step 1: Clear Cookies**
```
Go to: https://inphysic.com/clear-cookies.html
→ Auto-clears and redirects to login
```

### **Step 2: Disable DevTools Blocking**
```
F12 → Network → Disable 🚫 "Request blocking"
```

### **Step 3: Hard Refresh**
```
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Win)
```

### **Step 4: Test Login**
```
1. Go to: https://inphysic.com/auth/login
2. Login: student@example.com / student123
3. Open Console (F12)
```

**Expected Console:**
```javascript
🌐 [AUTH] NextAuth Base URL: https://inphysic.com  ✅
✅ [LOGIN] Login successful!
🔄 [LOGIN] Redirecting to: https://inphysic.com/dashboard  ✅

Login result: {
  url: "https://inphysic.com/dashboard"  ✅ CORRECT!
}
```

**Expected Browser:**
```
✅ Redirects to https://inphysic.com/dashboard
✅ Dashboard loads (200 OK)
✅ No localhost URLs
✅ Session persists
```

---

## 📊 **Visual Guide:**

```
Console Home
    ↓
Cloud Run
    ↓
lmsmath-app (click)
    ↓
[EDIT & DEPLOY NEW REVISION] (button)
    ↓
Variables & Secrets (tab)
    ↓
+ ADD VARIABLE (button) ← Click 7 times
    ↓
Add each variable:
  - NEXTAUTH_URL = https://inphysic.com
  - NODE_ENV = production
  - etc...
    ↓
[DEPLOY] (button at bottom)
    ↓
Wait 2-3 minutes
    ↓
✅ Deployed!
```

---

## 🔍 **Verify Environment Variables:**

**After deployment, check:**

```
1. Service details page
2. Tab "REVISIONS"
3. Click latest revision
4. Tab "VARIABLES"
5. Should see all 7 variables with correct values
```

---

## 📋 **Environment Variables Checklist:**

```
[ ] NEXTAUTH_URL = https://inphysic.com (MOST IMPORTANT!)
[ ] NODE_ENV = production
[ ] NEXTAUTH_SECRET = 8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa
[ ] GOOGLE_CLIENT_ID = 442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
[ ] GOOGLE_CLIENT_SECRET = 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
[ ] HOSTNAME = 0.0.0.0
[ ] NEXT_TELEMETRY_DISABLED = 1
```

---

## 🔐 **Google OAuth Redirect URIs:**

**After env vars are set, update Google Console:**

```
1. Go to: https://console.cloud.google.com/apis/credentials

2. Find OAuth Client: 442514522574-95bi4m5do7h479aol12boottsua0bj5g

3. Click "Edit"

4. Add Authorized redirect URIs:
   ✅ http://localhost:3000/api/auth/callback/google
   ✅ https://inphysic.com/api/auth/callback/google

5. Add Authorized JavaScript origins:
   ✅ http://localhost:3000
   ✅ https://inphysic.com

6. Click "SAVE"
```

---

## ⚠️ **Important Notes:**

### **Don't Build-time Hardcode:**

```dockerfile
# ❌ BAD - Don't do this in Dockerfile:
ENV NEXTAUTH_URL=https://inphysic.com

# ✅ GOOD - Inject at runtime via Cloud Run:
Cloud Run Console → Variables → Add at deploy time
```

**Why:**
- ✅ Secrets not in Docker image
- ✅ Can change without rebuild
- ✅ Better security
- ✅ Environment-specific

---

## 🎯 **Summary:**

**Method:** Console UI (easiest)  
**Location:** https://console.cloud.google.com/run  
**Action:** Edit & Deploy → Variables & Secrets → Add 7 variables  
**Time:** 5 minutes  
**Result:** NEXTAUTH_URL=https://inphysic.com ✅

---

## 🚀 **ALTERNATIVE: CLI Deploy (If Console Too Slow)**

```bash
./FINAL_DEPLOY_NOW.sh
```

**Does same thing but via CLI** ✅

---

## 📖 **Choose Your Method:**

**Console UI (Manual):**
- ✅ Visual interface
- ✅ Easy to see what you're setting
- ✅ Good for first time
- Time: 5 minutes

**CLI Script (Automated):**
- ✅ One command
- ✅ All automated
- ✅ Repeatable
- Time: 15 minutes (includes build)

---

**🎯 RECOMMENDED:**

Use Console UI to set env vars (5 min):
```
https://console.cloud.google.com/run → lmsmath-app → Edit & Deploy
```

**Then test!** ✅

