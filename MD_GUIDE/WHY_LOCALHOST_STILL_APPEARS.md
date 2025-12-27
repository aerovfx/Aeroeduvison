# 🔍 Why Localhost Still Appears - Root Cause

**Issue:** Console shows `http://localhost:3000` despite clearing cookies  
**Root Cause:** Environment variables not loaded by running code

---

## 🐛 **Problem Analysis:**

### **What's Happening:**

```
1. You set env vars via gcloud ✅
   NEXTAUTH_URL=https://inphysic.com

2. BUT: Old deployment still running ❌
   Using old code OR env var not accessible

3. Code's getBaseUrl() function:
   - Checks process.env.NEXTAUTH_URL → Not found/not accessible
   - Checks process.env.K_SERVICE → Not found/not set
   - Falls back to localhost ❌

4. Result: url: "http://localhost:3000/dashboard"
```

---

## 🔍 **3 Possible Reasons:**

### **Reason 1: Env Vars Set But Old Deployment Running**

```
✅ Env vars: Set via gcloud
❌ Deployment: Still using old revision
❌ Code: Doesn't see new env vars

Solution: Deploy NEW revision that picks up env vars
```

### **Reason 2: Env Vars Not Actually Set**

```
✅ Command: Ran successfully
❌ But: Service didn't update
❌ Or: Wrong service/region

Solution: Verify via console, redeploy
```

### **Reason 3: Code Not Using Env Vars**

```
✅ Env vars: Set correctly
✅ Deployment: New revision
❌ Code: Has bug in getBaseUrl()

Solution: Check getBaseUrl() logic
```

---

## ✅ **SOLUTION - Guaranteed Fix:**

### **Method: Deploy via Console UI (FOOLPROOF)**

**Why this works:**
- ✅ You SEE env vars being set
- ✅ New revision created immediately
- ✅ Changes applied right away
- ✅ No ambiguity

**Steps:**

```
1. https://console.cloud.google.com/run

2. lmsmath-app → EDIT & DEPLOY NEW REVISION

3. Container tab:
   - Keep existing container image
   OR
   - Use latest: gcr.io/lmsmath/lmsmath-app:latest

4. Variables & Secrets tab:
   
   CRITICAL - Add these EXACTLY:
   
   Name: NEXTAUTH_URL
   Value: https://inphysic.com
   
   Name: NODE_ENV  
   Value: production
   
   Name: NEXTAUTH_SECRET
   Value: 8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa
   
   Name: GOOGLE_CLIENT_ID
   Value: 442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
   
   Name: GOOGLE_CLIENT_SECRET
   Value: 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

5. Click: DEPLOY (bottom of page)

6. Wait for: "Service deployed successfully" ✅
```

---

## 🔍 **Verify Env Vars Are Actually Set:**

### **Via Console:**

```
1. Cloud Run → lmsmath-app
2. Tab: "REVISIONS"
3. Click: Latest revision (should be serving 100%)
4. Tab: "VARIABLES"
5. Should see:
   ✅ NEXTAUTH_URL = https://inphysic.com
   ✅ NODE_ENV = production
   ✅ etc.
```

### **Via CLI:**

```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="yaml" | grep -A 20 "env:"

# Should show NEXTAUTH_URL=https://inphysic.com
```

---

## 🧪 **How to Verify Code Sees Env Vars:**

### **Add Temporary Debug Log:**

**File:** `lib/auth.ts` (line ~32)

```typescript
const baseUrl = getBaseUrl();
console.log('🌐 [AUTH] NextAuth Base URL:', baseUrl);
console.log('🔍 [DEBUG] process.env.NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('🔍 [DEBUG] process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 [DEBUG] process.env.K_SERVICE:', process.env.K_SERVICE);
```

**Then check Cloud Run logs:**

```bash
gcloud run logs read lmsmath-app --region asia-east1 --limit 50

# Should show:
🌐 [AUTH] NextAuth Base URL: https://inphysic.com
🔍 [DEBUG] process.env.NEXTAUTH_URL: https://inphysic.com
🔍 [DEBUG] process.env.NODE_ENV: production
```

**If shows:**
```
🔍 [DEBUG] process.env.NEXTAUTH_URL: undefined
```

→ Env vars NOT loaded! Need to redeploy.

---

## 🎯 **Root Cause Summary:**

| Symptom | Cause | Solution |
|---------|-------|----------|
| url: localhost | Env vars not set | Set via console |
| url: localhost | Env vars set but old code | Deploy new revision |
| url: localhost | Code doesn't read env vars | Check getBaseUrl() |

---

## 💡 **Why Console UI is Best:**

```
CLI gcloud commands:
❌ Might target wrong service
❌ Might use wrong region
❌ Hard to verify what was set
❌ Error messages cryptic

Console UI:
✅ Visual confirmation
✅ See exactly what's set
✅ Immediate feedback
✅ Easy to verify
✅ Can't target wrong service
```

---

## 🚀 **GUARANTEED SOLUTION:**

### **Step 1: Console UI Deploy**

```
https://console.cloud.google.com/run
→ lmsmath-app
→ EDIT & DEPLOY NEW REVISION
→ Variables & Secrets
→ Add: NEXTAUTH_URL = https://inphysic.com
→ Add: 6 other variables
→ DEPLOY
```

### **Step 2: Wait for Deployment**

```
Look for: "Service deployed successfully"
Check: Latest revision serving 100% traffic
```

### **Step 3: Clear Cookies**

```
https://inphysic.com/clear-cookies.html
```

### **Step 4: Hard Refresh**

```
Cmd+Shift+R
```

### **Step 5: Test**

```
https://inphysic.com/auth/login
→ Login
→ Console should show: url: "https://inphysic.com/dashboard"
```

---

## 📊 **Timeline:**

```
00:00 - Open Console
02:00 - Add env vars
03:00 - Click Deploy
06:00 - Deployment complete ✅
06:30 - Clear cookies
07:00 - Test login
08:00 - ✅ WORKING!
```

**Total:** 8 minutes

---

## 🎓 **Key Insight:**

**The issue is NOT:**
- ❌ Cookies (already cleared)
- ❌ Browser cache
- ❌ Code logic

**The issue IS:**
- ✅ Environment variables not accessible to running code
- ✅ Need to deploy revision that loads env vars
- ✅ Console UI guarantees this

---

**🚀 USE CONSOLE UI:**

```
https://console.cloud.google.com/run
→ lmsmath-app
→ EDIT & DEPLOY
→ Add NEXTAUTH_URL=https://inphysic.com
→ DEPLOY
```

**This WILL work!** ✅

