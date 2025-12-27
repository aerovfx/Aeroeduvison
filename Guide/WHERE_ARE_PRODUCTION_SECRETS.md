# 🔐 Where Are Production Secrets/Env Vars?

**Platform:** Google Cloud Run  
**Service:** lmsmath-app  
**Region:** asia-east1

---

## 📍 **Secrets & Environment Variables Location:**

### **KHÔNG phải file .env!**

❌ Production **KHÔNG sử dụng** `.env` hoặc `.env.local`  
❌ Các file `.env*` chỉ dùng cho **local development**  
✅ Production dùng **Google Cloud Run Environment Variables & Secrets**

---

## 🎯 **Nơi Lưu Trữ:**

### **1. Environment Variables (Public - không nhạy cảm):**

**Lưu ở:** Google Cloud Run Service Configuration

**Xem qua:**
- **Console UI:** https://console.cloud.google.com/run
- **Or CLI:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**Chứa:**
- ✅ NEXTAUTH_URL=https://inphysic.com
- ✅ NODE_ENV=production
- ✅ HOSTNAME=0.0.0.0
- ✅ NEXT_TELEMETRY_DISABLED=1
- ✅ GOOGLE_CLIENT_ID=442514522574-...

---

### **2. Secrets (Private - nhạy cảm):**

**Lưu ở:** Google Cloud Secret Manager

**Xem qua:**
- **Console UI:** https://console.cloud.google.com/security/secret-manager
- **Or CLI:**
```bash
gcloud secrets list --project=lmsmath
```

**Chứa:**
- ✅ NEXTAUTH_SECRET
- ✅ GOOGLE_CLIENT_SECRET
- ✅ DATABASE_URL (if used)

**Mount vào Cloud Run:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

---

## 🔍 **Chi Tiết Từng Loại:**

### **📁 Local Development (.env.local):**

**File:** `/Users/vietchung/lmsmath/.env.local`

**Nội dung:**
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"
GOOGLE_CLIENT_ID="442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
DATABASE_URL="postgresql://..."
NODE_ENV=development
```

**Dùng khi:** `npm run dev`

**Vị trí:** Local machine của bạn

**Git:** Ignored (không commit)

---

### **☁️ Production (Cloud Run):**

**KHÔNG CÓ FILE!** Thay vào đó:

#### **A. Environment Variables (Cloud Run Service Config):**

**Xem trên Console:**
```
1. https://console.cloud.google.com/run
2. Select service: lmsmath-app
3. Tab: "Variables & Secrets"
4. Section: "Environment variables"
```

**Xem qua CLI:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format=yaml | grep -A 20 "env:"
```

**Set qua CLI:**
```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-env-vars \
NEXTAUTH_URL=https://inphysic.com,\
NODE_ENV=production,\
GOOGLE_CLIENT_ID=442514522574-...
```

**Set qua Deploy Script:**
```bash
# deploy.sh or quick-deploy.sh
--set-env-vars "NEXTAUTH_URL=https://inphysic.com,NODE_ENV=production,..."
```

#### **B. Secrets (Google Cloud Secret Manager):**

**Xem trên Console:**
```
1. https://console.cloud.google.com/security/secret-manager
2. Project: lmsmath
3. List of secrets:
   - nextauth-secret
   - google-client-secret
   - database-url (if created)
```

**Xem qua CLI:**
```bash
# List all secrets
gcloud secrets list --project=lmsmath

# View secret details (not value!)
gcloud secrets describe nextauth-secret --project=lmsmath

# Access secret value (if you have permission)
gcloud secrets versions access latest --secret=nextauth-secret --project=lmsmath
```

**Create Secret:**
```bash
echo -n "your-secret-value" | \
  gcloud secrets create secret-name \
    --project=lmsmath \
    --data-file=-
```

**Mount to Cloud Run:**
```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-secrets \
NEXTAUTH_SECRET=nextauth-secret:latest,\
GOOGLE_CLIENT_SECRET=google-client-secret:latest
```

---

## 🗺️ **Complete Architecture:**

```
┌─────────────────────────────────────────────────┐
│ Local Development                               │
├─────────────────────────────────────────────────┤
│ File: .env.local                                │
│ Location: /Users/vietchung/lmsmath/.env.local   │
│ Content:                                        │
│   NEXTAUTH_URL=http://localhost:3000            │
│   NEXTAUTH_SECRET=8761740715...                 │
│   GOOGLE_CLIENT_ID=442514522574-...             │
│   GOOGLE_CLIENT_SECRET=GOCSPX-...               │
│                                                 │
│ Used by: npm run dev                            │
│ Git: .gitignore (not committed)                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Production (Google Cloud Run)                   │
├─────────────────────────────────────────────────┤
│ A. Environment Variables (Public)               │
│ Location: Cloud Run Service Config              │
│ Access: Console or gcloud CLI                   │
│ Content:                                        │
│   NEXTAUTH_URL=https://inphysic.com             │
│   NODE_ENV=production                           │
│   GOOGLE_CLIENT_ID=442514522574-...             │
│                                                 │
│ B. Secrets (Private)                            │
│ Location: Secret Manager                        │
│ Access: Console or gcloud CLI                   │
│ Content:                                        │
│   nextauth-secret = 8761740715...               │
│   google-client-secret = GOCSPX-...             │
│                                                 │
│ Mounted to: Cloud Run at runtime                │
│ Available as: process.env.NEXTAUTH_SECRET       │
└─────────────────────────────────────────────────┘
```

---

## 🔍 **Cách Truy Cập:**

### **Via Google Cloud Console (UI):**

#### **Environment Variables:**
```
1. https://console.cloud.google.com/run
2. Select: lmsmath-app
3. Click: "Edit & Deploy New Revision"
4. Tab: "Variables & Secrets"
5. See: All environment variables
```

#### **Secrets:**
```
1. https://console.cloud.google.com/security/secret-manager
2. Project: lmsmath
3. See: All secrets
4. Click secret name to view details
5. Click "Versions" to see values (if authorized)
```

---

### **Via gcloud CLI (Terminal):**

#### **List Environment Variables:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

#### **List Secrets:**
```bash
# List all secrets in project
gcloud secrets list --project=lmsmath

# Get secret value (need permission)
gcloud secrets versions access latest \
  --secret=nextauth-secret \
  --project=lmsmath
```

---

## 🛠️ **Cách Update:**

### **Method 1: Update Script (Recommended):**
```bash
./scripts/update-production-env.sh
```

### **Method 2: Manual gcloud:**
```bash
# Update env vars
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-env-vars NEXTAUTH_URL=https://inphysic.com

# Update secrets
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-secrets NEXTAUTH_SECRET=nextauth-secret:latest
```

### **Method 3: Console UI:**
```
1. Cloud Run → lmsmath-app
2. "Edit & Deploy New Revision"
3. "Variables & Secrets" tab
4. Add/Edit variables
5. Click "Deploy"
```

---

## 📊 **Flow Diagram:**

```
Development:
┌──────────────┐
│ .env.local   │ → npm run dev → App reads from file
└──────────────┘

Production:
┌────────────────────┐
│ Cloud Run Env Vars │ → Injected at runtime → process.env.NEXTAUTH_URL
└────────────────────┘

┌────────────────────┐
│ Secret Manager     │ → Mounted at runtime → process.env.NEXTAUTH_SECRET
└────────────────────┘

Docker Container:
- NO .env files included
- NO secrets in image
- All injected at runtime ✅
```

---

## 🔒 **Security:**

### **Why Secrets Separate:**

```
❌ BAD (hardcoded):
ENV NEXTAUTH_SECRET=8761740715842a2b...

✅ GOOD (runtime injection):
process.env.NEXTAUTH_SECRET → from Secret Manager
```

**Benefits:**
- ✅ Secrets not in Docker image
- ✅ Can rotate without rebuild
- ✅ Access control via IAM
- ✅ Audit logs
- ✅ Encrypted at rest

---

## 🎯 **Summary:**

| Item | Local | Production |
|------|-------|------------|
| **Storage** | `.env.local` file | Cloud Run + Secret Manager |
| **Location** | `/Users/vietchung/lmsmath/` | Google Cloud Project |
| **Access** | Direct file read | Runtime injection |
| **Security** | File permissions | IAM + encryption |
| **Update** | Edit file | gcloud CLI or Console |

---

## 📝 **Quick Reference:**

### **Check Production Values:**
```bash
# Environment variables
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format=yaml

# Secrets list
gcloud secrets list --project=lmsmath

# Specific secret value (if authorized)
gcloud secrets versions access latest --secret=nextauth-secret
```

### **Update Production:**
```bash
# Best way: Use our script
./scripts/update-production-env.sh

# Manual way: gcloud commands
gcloud run services update lmsmath-app --update-env-vars KEY=VALUE
```

---

## 🎓 **Key Points:**

1. ✅ **Local:** Uses `.env.local` file
2. ✅ **Production:** Uses Cloud Run env vars + Secret Manager
3. ✅ **No files:** Secrets injected at runtime
4. ✅ **Secure:** Encrypted, access-controlled
5. ✅ **Easy update:** Script or gcloud CLI

---

**🎯 To update production, run:**

```bash
./scripts/update-production-env.sh
```

**This will set all env vars and secrets on Cloud Run!** 🚀

