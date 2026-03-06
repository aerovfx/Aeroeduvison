# Production Environment Variables

**For Cloud Run Deployment**

---

## 📋 **Required Environment Variables:**

### **Set in Cloud Run:**

```bash
# NextAuth Configuration
NEXTAUTH_URL=https://inphysic.com
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa

# Node Environment
NODE_ENV=production

# Server Configuration
HOSTNAME=0.0.0.0
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

### **Set in Cloud Run Secrets (Sensitive Data):**

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## 🚀 **How to Set:**

### **Via gcloud CLI:**

```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-env-vars NEXTAUTH_URL=https://inphysic.com,NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1
```

### **Via Cloud Run Console:**

```
1. Go to: https://console.cloud.google.com/run
2. Select service: lmsmath-app
3. Click: "Edit & Deploy New Revision"
4. Tab: "Variables & Secrets"
5. Add/Update variables
6. Click: "Deploy"
```

---

## ✅ **Verification:**

```bash
# Check current env vars
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

---

**🎯 Most Important:** `NEXTAUTH_URL=https://inphysic.com`

