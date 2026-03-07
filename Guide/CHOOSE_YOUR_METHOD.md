# 🎯 Choose Your Method - 2 Options

---

## 🔥 **OPTION A: Console UI (5 minutes - Easier)**

**Best for:** Visual learners, first-time setup

### **Steps:**

```
1. Go to: https://console.cloud.google.com/run

2. Click: lmsmath-app

3. Click: "EDIT & DEPLOY NEW REVISION"

4. Tab: "Variables & Secrets"

5. Add these 7 variables:
   
   Variable 1:
   Name:  NEXTAUTH_URL
   Value: https://inphysic.com
   
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
   Name:  HOSTNAME
   Value: 0.0.0.0
   
   Variable 7:
   Name:  NEXT_TELEMETRY_DISABLED
   Value: 1

6. Click "DEPLOY" at bottom

7. Wait 2-3 minutes

8. ✅ Done!
```

**Then test:** https://inphysic.com/clear-cookies.html → Login

---

## 🛠️ **OPTION B: CLI Script (15 minutes - Automated)**

**Best for:** Developers, repeatable deployments

### **Command:**

```bash
cd /Users/vietchung/lmsmath
./FINAL_DEPLOY_NOW.sh
```

### **What it does:**

```
1. Clear cache
2. Build fresh Docker image (all fixes)
3. Push to GCR
4. Clear old config
5. Deploy with correct env vars
6. Verify deployment
```

**Timeline:** ~15 minutes (includes Docker build)

**Then test:** https://inphysic.com/clear-cookies.html → Login

---

## 📊 **Comparison:**

| Aspect | Console UI | CLI Script |
|--------|-----------|------------|
| **Time** | 5 min | 15 min |
| **Difficulty** | Easy (visual) | Medium (command line) |
| **Code deploy** | Uses existing image | Builds new image |
| **Repeatable** | Manual steps | One command |
| **Best for** | Quick env var changes | Full deployment with code |

---

## 🎯 **Which to Choose:**

### **Use Console UI if:**
- ✅ You just need to change env vars
- ✅ Code already deployed
- ✅ Want quick update
- ✅ Prefer visual interface

### **Use CLI Script if:**
- ✅ Want to deploy code changes too
- ✅ Want automated process
- ✅ Have 15 minutes
- ✅ Want fresh build

---

## 🚀 **RECOMMENDED: Try Console UI First**

**Why:**
- ✅ Faster (5 min vs 15 min)
- ✅ Easier (visual vs command line)
- ✅ No build time
- ✅ Can see exactly what you're setting

**Steps:**
```
1. https://console.cloud.google.com/run
2. lmsmath-app → Edit & Deploy
3. Variables & Secrets → Add 7 variables
4. Deploy
5. Done! ✅
```

---

## 🧪 **After Either Method:**

### **Clear Cookies:**
```
https://inphysic.com/clear-cookies.html
```

### **Test Login:**
```
https://inphysic.com/auth/login
→ Login
→ Should redirect to https://inphysic.com/dashboard ✅
```

### **Verify Console:**
```javascript
Login result: {
  url: "https://inphysic.com/dashboard"  ✅ CORRECT!
}

NOT:
url: "http://localhost:3000/dashboard"  ❌
```

---

## 📋 **Complete Checklist:**

### **Before:**
- [ ] Choose method (Console UI or CLI)
- [ ] Have all env var values ready
- [ ] Know your Cloud Run service name

### **During (Console UI):**
- [ ] Go to Cloud Run console
- [ ] Edit & Deploy New Revision
- [ ] Add all 7 variables
- [ ] Click Deploy
- [ ] Wait for completion

### **During (CLI):**
- [ ] Run: ./FINAL_DEPLOY_NOW.sh
- [ ] Wait ~15 minutes
- [ ] Check for success message

### **After:**
- [ ] Clear cookies (utility page)
- [ ] Disable DevTools blocking
- [ ] Hard refresh
- [ ] Test login
- [ ] Verify redirect to https://inphysic.com

---

## 🔐 **Google OAuth Setup (Do After Env Vars):**

```
1. https://console.cloud.google.com/apis/credentials

2. OAuth Client: 442514522574-95bi4m5do7h479aol12boottsua0bj5g

3. Edit → Add Redirect URIs:
   ✅ https://inphysic.com/api/auth/callback/google
   ✅ http://localhost:3000/api/auth/callback/google

4. Add Origins:
   ✅ https://inphysic.com
   ✅ http://localhost:3000

5. Save
```

---

## 🎯 **Quick Reference:**

### **7 Environment Variables to Set:**

```bash
NEXTAUTH_URL=https://inphysic.com
NODE_ENV=production
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa
GOOGLE_CLIENT_ID=442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
HOSTNAME=0.0.0.0
NEXT_TELEMETRY_DISABLED=1
```

**Copy-paste ready!** ✅

---

## 📖 **Documentation:**

- `CHOOSE_YOUR_METHOD.md` - This file
- `SET_ENV_VIA_CONSOLE.md` - Console UI detailed guide
- `FINAL_DEPLOY_NOW.sh` - CLI script
- `EXECUTE_THIS_NOW.md` - CLI guide

---

## 🎊 **Pick Your Method:**

### **Console UI (Recommended for you):**
```
https://console.cloud.google.com/run → lmsmath-app → Edit & Deploy
```

### **CLI Script:**
```bash
./FINAL_DEPLOY_NOW.sh
```

---

**🎯 Choose one and execute!** 🚀

**Expected result:** Login redirects to https://inphysic.com/dashboard ✅

