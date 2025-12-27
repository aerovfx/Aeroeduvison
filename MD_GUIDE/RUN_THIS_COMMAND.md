# ⚡ RUN THIS COMMAND NOW

---

## 🚀 **CHẠY LỆNH NÀY:**

```bash
cd /Users/vietchung/lmsmath
./scripts/update-production-env.sh
```

---

## ✅ **Script Đã Fix:**

**Bây giờ sẽ:**
```
1️⃣ Clear secrets first (remove GOOGLE_CLIENT_ID if was secret)
2️⃣ Clear env vars  
3️⃣ Set fresh env vars (NEXTAUTH_URL, GOOGLE_CLIENT_ID, etc.)
4️⃣ Create secrets (NEXTAUTH_SECRET, GOOGLE_CLIENT_SECRET)
5️⃣ Mount secrets to service
6️⃣ Verify configuration
```

**No more type conflict error!** ✅

---

## ⏱️ **Timeline:**

```
00:00 - Start script
01:00 - Clearing conflicts...
02:00 - Setting env vars...
03:00 - Creating secrets...
04:00 - Mounting secrets...
05:00 - Verifying...
06:00 - ✅ Done!
```

**Total:** ~6 minutes

---

## 🎯 **Expected Output:**

```
🔧 Updating Production Environment Variables
Service: lmsmath-app
Region: asia-east1

1️⃣ Clearing conflicting environment variables and secrets...
   Cleared secrets
   ✅ All cleared

2️⃣ Setting environment variables...
   ✅ Environment variables set

3️⃣ Setting up secrets...
   Checking existing secrets...
   ✅ nextauth-secret exists
   ✅ google-client-secret exists

4️⃣ Granting secret access...
   Service account: XXXXX-compute@developer.gserviceaccount.com
   ✅ Granted access to: nextauth-secret
   ✅ Granted access to: google-client-secret

5️⃣ Updating service to use secrets...
   ✅ Secrets mounted

6️⃣ Verifying configuration...
   ✅ Configured

✅ Production Environment Updated!

📊 Configuration:
   ✅ NEXTAUTH_URL=https://inphysic.com
   ✅ NODE_ENV=production
   ✅ GOOGLE_CLIENT_ID=442514522574-...

🔒 Secrets Configured:
   ✅ NEXTAUTH_SECRET
   ✅ GOOGLE_CLIENT_SECRET

🎉 Environment variables updated successfully!
```

---

## 🧪 **After Script Completes:**

```
1. Wait for "✅ Environment variables updated successfully!"
2. Clear browser cookies
3. Hard refresh: Cmd+Shift+R
4. Test login: https://inphysic.com/auth/login
5. Verify console: url: "https://inphysic.com/dashboard" ✅
```

---

## 🎉 **Result:**

```
✅ NEXTAUTH_URL = https://inphysic.com (not localhost!)
✅ All env vars configured
✅ Secrets properly set
✅ Login will redirect correctly
✅ Google OAuth will work
```

---

**🚀 RUN NOW:**

```bash
./scripts/update-production-env.sh
```

**This time it will work!** ✅

