# 🚀 Update Production Environment - Execute Now

**Target:** https://inphysic.com  
**Action:** Update environment variables + secrets  
**Time:** ~5 minutes

---

## ⚡ **CHẠY NGAY LỆNH NÀY:**

```bash
cd /Users/vietchung/lmsmath
./scripts/update-production-env.sh
```

---

## 📊 **Script Sẽ Làm Gì:**

### **1. Update Environment Variables (Public):**
```bash
✅ NEXTAUTH_URL=https://inphysic.com
✅ NODE_ENV=production
✅ HOSTNAME=0.0.0.0
✅ NEXT_TELEMETRY_DISABLED=1
✅ GOOGLE_CLIENT_ID=442514522574-95bi4m5do7h479aol12boottsua0bj5g...
```

### **2. Create/Update Secrets (Private):**
```bash
✅ NEXTAUTH_SECRET (8761740715842a2b...)
✅ GOOGLE_CLIENT_SECRET (GOCSPX-HtqnieQ3s...)
```

### **3. Grant Permissions:**
```bash
✅ Service account access to secrets
✅ Mount secrets to Cloud Run
```

### **4. Verify:**
```bash
✅ Check all configs applied
✅ Service ready to use
```

---

## 🎯 **Expected Output:**

```
🔧 Updating Production Environment Variables
Service: lmsmath-app
Region: asia-east1

1️⃣ Updating environment variables...
   ✅ Environment variables updated

2️⃣ Setting up secrets...
   Checking existing secrets...
   ✅ nextauth-secret exists (or created)
   ✅ google-client-secret exists (or created)

3️⃣ Granting secret access...
   Service account: XXXXX-compute@developer.gserviceaccount.com
   ✅ Granted access to: nextauth-secret
   ✅ Granted access to: google-client-secret

4️⃣ Updating service to use secrets...
   ✅ Secrets mounted

5️⃣ Verifying configuration...
   ✅ Configured

✅ Production Environment Updated!

📊 Configuration:
   Service: lmsmath-app
   Region: asia-east1
   Domain: https://inphysic.com

🔐 Environment Variables Set:
   ✅ NEXTAUTH_URL=https://inphysic.com
   ✅ NODE_ENV=production
   ✅ HOSTNAME=0.0.0.0
   ✅ NEXT_TELEMETRY_DISABLED=1
   ✅ GOOGLE_CLIENT_ID=442514522574-...

🔒 Secrets Configured:
   ✅ NEXTAUTH_SECRET (from Secret Manager)
   ✅ GOOGLE_CLIENT_SECRET (from Secret Manager)

🎉 Environment variables updated successfully!

Next step: Test login at https://inphysic.com/auth/login
```

---

## 🧪 **After Script Completes - Test:**

### **Step 1: Clear Browser (1 min)**
```
1. Open DevTools (F12)
2. Application tab → Storage → Clear site data
3. Network tab → Disable "Request blocking"
4. Close DevTools
5. Hard refresh: Cmd+Shift+R
```

### **Step 2: Test Credentials Login (1 min)**
```
1. Go to: https://inphysic.com/auth/login
2. Email: student@example.com
3. Password: student123
4. Click "Login"
5. Open Console (F12)
```

**Expected Console:**
```javascript
🌐 [AUTH] NextAuth Base URL: https://inphysic.com  ✅
✅ [LOGIN] Login successful!
🔄 [LOGIN] Redirecting to: /dashboard
Login result: {
  error: null,
  status: 200,
  ok: true,
  url: "https://inphysic.com/dashboard"  ✅ CORRECT!
}
```

**Expected Behavior:**
```
✅ Redirect to https://inphysic.com/dashboard
✅ Dashboard loads (200 OK)
✅ Session persists
✅ No localhost URLs
```

### **Step 3: Test Google OAuth Login (2 min)**

**Prerequisites:**
```
⚠️ MUST have setup redirect URIs in Google Console:
   - https://inphysic.com/api/auth/callback/google

If not done yet:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Client: 442514522574-95bi4m5do7h479aol12boottsua0bj5g
3. Add redirect URI: https://inphysic.com/api/auth/callback/google
4. Add origin: https://inphysic.com
5. Save
```

**Test Steps:**
```
1. Clear cookies
2. Go to: https://inphysic.com/auth/login
3. Click "Sign in with Google"
4. Select Google account
5. Click "Continue"
```

**Expected Flow:**
```
✅ Redirects to Google consent screen
✅ After consent, redirects to: https://inphysic.com/dashboard
✅ No localhost URLs
✅ Session created
✅ User logged in
```

---

## 🔍 **Verification Commands:**

### **Check Environment Variables:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" | grep -E "NEXTAUTH_URL|GOOGLE_CLIENT_ID"

# Should show:
NEXTAUTH_URL=https://inphysic.com
GOOGLE_CLIENT_ID=442514522574-...
```

### **Check Secrets:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" | grep -i secret

# Should show secret references (not actual values)
```

### **Test API Endpoints:**
```bash
# Session endpoint
curl https://inphysic.com/api/auth/session
# Returns: {} (if not logged in)

# Providers endpoint
curl https://inphysic.com/api/auth/providers
# Returns: {"google":{...},"credentials":{...}}
```

---

## 📋 **Complete Checklist:**

### **Before Running Script:**
- [x] ✅ Code all fixed
- [x] ✅ Scripts ready
- [x] ✅ Credentials verified
- [ ] Authenticated with gcloud
- [ ] Correct project selected

### **Run Script:**
- [ ] Execute: `./scripts/update-production-env.sh`
- [ ] Wait for completion (~3-5 minutes)
- [ ] Verify "✅ Environment variables updated successfully!"

### **After Script:**
- [ ] Clear browser cookies
- [ ] Disable DevTools request blocking
- [ ] Hard refresh browser
- [ ] Test credentials login
- [ ] Test Google OAuth login
- [ ] Verify both work

### **Google Console (If Not Done):**
- [ ] Add redirect URI: https://inphysic.com/api/auth/callback/google
- [ ] Add origin: https://inphysic.com
- [ ] Save changes

---

## 🎯 **Timeline:**

```
00:00 - Run: ./scripts/update-production-env.sh
00:30 - Creating/updating secrets...
02:00 - Mounting secrets to service...
03:00 - Updating environment variables...
04:00 - Verification...
05:00 - ✅ Done!

Then:
05:30 - Clear browser cookies
06:00 - Test credentials login
07:00 - Test Google OAuth login
08:00 - ✅ ALL WORKING!
```

**Total:** ~8 minutes

---

## 💡 **Why Use Secrets:**

### **Benefits:**
1. ✅ **Security:** Secrets encrypted at rest
2. ✅ **Version control:** Secrets not in logs
3. ✅ **Access control:** IAM permissions
4. ✅ **Rotation:** Easy to update secrets
5. ✅ **Best practice:** Industry standard

### **What Goes Where:**

**Environment Variables (Public):**
- ✅ NEXTAUTH_URL (not sensitive)
- ✅ NODE_ENV (not sensitive)
- ✅ GOOGLE_CLIENT_ID (public client ID)

**Secrets (Private):**
- ✅ NEXTAUTH_SECRET (sensitive - signing key)
- ✅ GOOGLE_CLIENT_SECRET (sensitive - OAuth secret)
- ✅ DATABASE_URL (sensitive - connection string)

---

## 🚨 **Important Notes:**

1. **No Redeploy Needed:**
   - Script updates existing service
   - Changes take effect immediately
   - No Docker rebuild required

2. **Users Need to Re-login:**
   - Old sessions may not work
   - Ask users to logout and login again
   - Or clear their cookies

3. **Google Console Required:**
   - Must setup redirect URIs first
   - Otherwise Google OAuth will fail

---

## 🎉 **After Success:**

**You'll have:**
- ✅ Production configured correctly
- ✅ NEXTAUTH_URL = https://inphysic.com
- ✅ Secrets properly managed
- ✅ Both login methods working:
  - Email/password
  - Google OAuth
- ✅ No localhost references
- ✅ Production-ready!

---

## 🚀 **EXECUTE:**

```bash
./scripts/update-production-env.sh
```

**Then test at:** https://inphysic.com/auth/login

---

**🎊 This updates production WITHOUT rebuilding! Fast & safe!** ✨

