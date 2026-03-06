# 🔐 Google OAuth Setup Guide

**Date:** 2025-11-01  
**Status:** ✅ **Credentials Ready - Need Console Setup**

---

## ✅ **Current Status:**

### **Credentials (Already Configured):**
```bash
✅ GOOGLE_CLIENT_ID: 442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
✅ GOOGLE_CLIENT_SECRET: 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
✅ No %0A (newline) characters ✅
✅ Properly formatted ✅
```

### **Code (Already Configured):**
```typescript
✅ GoogleProvider in lib/auth.ts
✅ Auto-detect baseUrl
✅ Proper authorization params
✅ Session callbacks configured
```

### **Deploy Scripts (Already Updated):**
```bash
✅ deploy.sh - includes Google OAuth vars
✅ scripts/quick-deploy.sh - includes Google OAuth vars
```

---

## 🎯 **ONLY NEED: Google Console Setup**

---

## 🔧 **Step-by-Step Google Console Setup:**

### **Step 1: Go to Google Cloud Console**

```
https://console.cloud.google.com/apis/credentials
```

### **Step 2: Select Your Project**

Look for project with Client ID: `442514522574`

### **Step 3: Find Your OAuth 2.0 Client**

Click on the OAuth client ID:
```
442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
```

### **Step 4: Add Authorized Redirect URIs**

**Click "Edit" and add these URIs:**

```
✅ Development:
http://localhost:3000/api/auth/callback/google

✅ Production:
https://inphysic.com/api/auth/callback/google
```

**IMPORTANT:** Must be EXACT paths, no trailing slash!

### **Step 5: Add Authorized JavaScript Origins**

**Add these origins:**

```
✅ Development:
http://localhost:3000

✅ Production:
https://inphysic.com
```

### **Step 6: Save Changes**

Click **"Save"** button at bottom

---

## 📋 **Checklist:**

```
Google Cloud Console:
[ ] Logged in to console.cloud.google.com
[ ] Found correct project
[ ] Opened OAuth 2.0 Client ID
[ ] Added redirect URI: http://localhost:3000/api/auth/callback/google
[ ] Added redirect URI: https://inphysic.com/api/auth/callback/google
[ ] Added origin: http://localhost:3000
[ ] Added origin: https://inphysic.com
[ ] Clicked "Save"
[ ] Waited for "Changes saved" confirmation
```

---

## 🧪 **Testing After Setup:**

### **Test Local (Development):**

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:3000/auth/login

# Click "Sign in with Google"
# Expected:
✅ Redirects to Google OAuth consent screen
✅ After consent, redirects to http://localhost:3000/dashboard
✅ Session created
✅ User logged in
```

### **Test Production (After Deploy):**

```bash
# Deploy first
./scripts/quick-deploy.sh

# After deployment complete:
# Open browser
open https://inphysic.com/auth/login

# Click "Sign in with Google"
# Expected:
✅ Redirects to Google OAuth consent screen
✅ After consent, redirects to https://inphysic.com/dashboard
✅ Session created
✅ User logged in
```

---

## 🔍 **Troubleshooting:**

### **Error: redirect_uri_mismatch**

```
Error: redirect_uri_mismatch
The redirect URI in the request: http://localhost:3000/api/auth/callback/google
does not match the ones authorized for the OAuth client.
```

**Fix:**
1. Go to Google Console
2. Check redirect URIs exactly match
3. No typos, no trailing slashes
4. Save and wait 1-2 minutes for propagation

### **Error: invalid_client**

```
Error: invalid_client
```

**Fix:**
1. Check GOOGLE_CLIENT_ID is correct
2. Check GOOGLE_CLIENT_SECRET is correct
3. No extra spaces or newlines
4. Redeploy with correct values

### **Error: access_denied**

```
User denied consent
```

**This is OK** - user chose not to sign in

---

## 📊 **Complete OAuth Flow:**

```
1. User clicks "Sign in with Google"
   ↓
2. Redirect to Google OAuth:
   https://accounts.google.com/o/oauth2/v2/auth?
   client_id=442514522574-...
   redirect_uri=https://inphysic.com/api/auth/callback/google
   ↓
3. User consents (or declines)
   ↓
4. Google redirects back:
   https://inphysic.com/api/auth/callback/google?code=...
   ↓
5. NextAuth exchanges code for tokens
   ↓
6. NextAuth creates session (JWT)
   ↓
7. Redirect to dashboard:
   https://inphysic.com/dashboard
   ↓
8. User logged in! ✅
```

---

## 🎯 **Current Configuration Summary:**

### **Environment Variables (.env.local - Development):**
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"
GOOGLE_CLIENT_ID="442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
```

### **Environment Variables (Cloud Run - Production):**
```bash
# Will be set by deploy script:
NEXTAUTH_URL=https://inphysic.com
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa
GOOGLE_CLIENT_ID=442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
NODE_ENV=production
```

### **Google Console - Required Settings:**

**Authorized redirect URIs:**
```
✅ http://localhost:3000/api/auth/callback/google
✅ https://inphysic.com/api/auth/callback/google
```

**Authorized JavaScript origins:**
```
✅ http://localhost:3000
✅ https://inphysic.com
```

---

## 📝 **Google Console Quick Setup:**

### **Visual Guide:**

```
1. console.cloud.google.com/apis/credentials
   ↓
2. Click OAuth 2.0 Client ID:
   "442514522574-95bi4m5do7h479aol12boottsua0bj5g"
   ↓
3. Click "Edit" (pencil icon)
   ↓
4. Scroll to "Authorized redirect URIs"
   ↓
5. Click "+ ADD URI"
   ↓
6. Add: http://localhost:3000/api/auth/callback/google
   ↓
7. Click "+ ADD URI" again
   ↓
8. Add: https://inphysic.com/api/auth/callback/google
   ↓
9. Scroll to "Authorized JavaScript origins"
   ↓
10. Click "+ ADD URI"
   ↓
11. Add: http://localhost:3000
   ↓
12. Click "+ ADD URI" again
   ↓
13. Add: https://inphysic.com
   ↓
14. Click "SAVE" at bottom
   ↓
15. Wait for "Saved" confirmation ✅
```

---

## 🧪 **Testing Google OAuth:**

### **Test Local First:**

```bash
# 1. Start dev server
npm run dev

# 2. Open browser
open http://localhost:3000/auth/login

# 3. Click "Sign in with Google" button

# 4. Expected flow:
✅ Redirects to Google consent screen
✅ Shows your Google account
✅ Click "Continue" or "Allow"
✅ Redirects back to http://localhost:3000/dashboard
✅ You're logged in!

# 5. Check console:
✅ No errors
✅ Session created
✅ User data available
```

### **Test Production After Deploy:**

```bash
# 1. Deploy first
./scripts/quick-deploy.sh

# 2. Wait for deployment (~15 min)

# 3. Clear cookies
# DevTools → Application → Cookies → Clear

# 4. Open browser
open https://inphysic.com/auth/login

# 5. Click "Sign in with Google"

# 6. Expected flow:
✅ Redirects to Google consent screen
✅ Click "Continue" or "Allow"
✅ Redirects back to https://inphysic.com/dashboard
✅ You're logged in!

# 7. Verify:
✅ URL: https://inphysic.com/dashboard (not localhost)
✅ Session persists
✅ No errors
```

---

## 📖 **Complete Setup Checklist:**

### **Google Cloud Console:**
- [ ] Go to console.cloud.google.com/apis/credentials
- [ ] Find OAuth Client ID: 442514522574-...
- [ ] Click Edit
- [ ] Add redirect URI: http://localhost:3000/api/auth/callback/google
- [ ] Add redirect URI: https://inphysic.com/api/auth/callback/google
- [ ] Add origin: http://localhost:3000
- [ ] Add origin: https://inphysic.com
- [ ] Click Save
- [ ] Wait for confirmation

### **Local Testing:**
- [ ] npm run dev
- [ ] Test Google login works on localhost
- [ ] Verify redirect to /dashboard
- [ ] Check session persists

### **Deployment:**
- [ ] Run: ./scripts/quick-deploy.sh
- [ ] Wait for deployment
- [ ] Clear browser cookies
- [ ] Test Google login on production
- [ ] Verify redirect to https://inphysic.com/dashboard

---

## 🎉 **Summary:**

### **What's Done:**
- ✅ Google OAuth credentials in .env.local
- ✅ GoogleProvider in NextAuth config
- ✅ Auto-detect baseUrl (handles localhost + production)
- ✅ Deploy scripts include Google OAuth vars
- ✅ All code ready

### **What You Need to Do:**
1. ⚠️ **Setup Google Console** (redirect URIs + origins)
2. 🚀 **Deploy:** `./scripts/quick-deploy.sh`
3. 🧪 **Test:** Login with Google

### **Timeline:**
- Google Console setup: ~3 minutes
- Deployment: ~15 minutes
- Testing: ~2 minutes
- **Total: ~20 minutes**

---

**📖 Full Guide:** `GOOGLE_OAUTH_SETUP.md`

**🎯 Action:** Setup Google Console redirect URIs, then deploy!** 🚀
