# 📍 Production Environment Variables - Simple Guide

---

## 🎯 **TRẢ LỜI NHANH:**

### **Trên Production (Cloud Run), các biến môi trường KHÔNG nằm trong file!**

Chúng được lưu ở **2 nơi:**

---

## 📍 **Vị Trí 1: Cloud Run Service Configuration**

**Public variables (không nhạy cảm):**

```
Nơi lưu: Google Cloud Run Service Config
Xem tại: https://console.cloud.google.com/run → lmsmath-app → "Variables & Secrets"

Chứa:
✅ NEXTAUTH_URL=https://inphysic.com
✅ NODE_ENV=production
✅ GOOGLE_CLIENT_ID=442514522574-...
✅ HOSTNAME=0.0.0.0
✅ NEXT_TELEMETRY_DISABLED=1
```

---

## 📍 **Vị Trí 2: Secret Manager**

**Private secrets (nhạy cảm):**

```
Nơi lưu: Google Cloud Secret Manager
Xem tại: https://console.cloud.google.com/security/secret-manager

Chứa:
✅ nextauth-secret (NEXTAUTH_SECRET value)
✅ google-client-secret (GOOGLE_CLIENT_SECRET value)
✅ database-url (DATABASE_URL value, if configured)
```

---

## 🔄 **Flow Hoạt Động:**

```
1. Deploy Code lên Cloud Run (Docker image)
   │
   ├─ Image KHÔNG chứa .env files
   ├─ Image KHÔNG chứa secrets
   └─ Image chỉ có code

2. Cloud Run start container
   │
   ├─ Inject Environment Variables
   │  (from Service Config)
   │
   └─ Mount Secrets
      (from Secret Manager)

3. App chạy với process.env.NEXTAUTH_URL
   │
   └─ Đọc từ env vars đã inject ✅
```

---

## 💻 **Trong Code, App Đọc Như Thế Nào:**

### **File: `lib/auth.ts`**

```typescript
// App đọc từ process.env (runtime)
const baseUrl = process.env.NEXTAUTH_URL  // ✅ From Cloud Run env
const secret = process.env.NEXTAUTH_SECRET  // ✅ From Secret Manager
const clientId = process.env.GOOGLE_CLIENT_ID  // ✅ From Cloud Run env
```

**Không cần file `.env`!** Mọi thứ inject tự động khi container start.

---

## 🛠️ **Cách Set/Update:**

### **Option 1: Dùng Script (Recommended):**

```bash
./scripts/update-production-env.sh
```

**Script tự động:**
- ✅ Update env vars trên Cloud Run
- ✅ Create/update secrets trong Secret Manager
- ✅ Mount secrets vào service
- ✅ Verify configuration

---

### **Option 2: Manual qua CLI:**

```bash
# Update environment variables
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-env-vars NEXTAUTH_URL=https://inphysic.com,NODE_ENV=production

# Create secret
echo -n "secret-value" | \
  gcloud secrets create secret-name --data-file=-

# Mount secret to Cloud Run
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-secrets NEXTAUTH_SECRET=nextauth-secret:latest
```

---

### **Option 3: Manual qua Console (UI):**

```
1. https://console.cloud.google.com/run
2. Click: lmsmath-app
3. Click: "Edit & Deploy New Revision"
4. Tab: "Variables & Secrets"
5. Add/Edit variables:
   - Name: NEXTAUTH_URL
   - Value: https://inphysic.com
6. Reference secrets:
   - Name: NEXTAUTH_SECRET
   - Secret: nextauth-secret
   - Version: latest
7. Click: "Deploy"
```

---

## 📊 **So Sánh:**

| Aspect | Local (.env.local) | Production (Cloud Run) |
|--------|-------------------|------------------------|
| **Lưu ở đâu** | File trong project | Cloud Run Config + Secret Manager |
| **Vị trí** | `/Users/vietchung/lmsmath/` | Google Cloud Project |
| **Format** | Text file (KEY=VALUE) | Cloud service configuration |
| **Bảo mật** | File permissions | IAM + Encryption |
| **Git** | Ignored (.gitignore) | N/A (không commit) |
| **Update** | Edit file, restart server | gcloud CLI hoặc Console |
| **Inject** | dotenv library | Cloud Run runtime |

---

## 🎯 **Tóm Lại:**

### **Local Development:**
```
.env.local file
↓
npm run dev
↓
App reads from file
```

### **Production (Cloud Run):**
```
Cloud Run Env Vars + Secret Manager
↓
Container starts
↓
Variables injected automatically
↓
App reads from process.env
```

**KHÔNG CÓ FILE .env trên production!** ✅

---

## 🚀 **What You Need to Do:**

```bash
# Update production env vars + secrets
./scripts/update-production-env.sh
```

**Script sẽ:**
1. ✅ Set env vars trên Cloud Run Service
2. ✅ Create secrets trong Secret Manager
3. ✅ Mount secrets vào service
4. ✅ Tất cả tự động!

**Không cần tạo file .env!** 🎉

---

## 📖 **More Details:**

- `WHERE_ARE_PRODUCTION_SECRETS.md` - Full explanation
- `UPDATE_PRODUCTION_NOW.md` - Update guide
- `START_HERE.md` - Quick start

---

**🎯 Chạy ngay:**

```bash
./scripts/update-production-env.sh
```

**Sau đó test tại:** https://inphysic.com/auth/login

**🎊 Không cần file .env! Cloud Run tự động inject!** ✨

