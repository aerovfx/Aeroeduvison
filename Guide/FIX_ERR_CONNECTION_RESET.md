# 🚨 Fix ERR_CONNECTION_RESET - Cloud Run Crash

**Error:** `net::ERR_CONNECTION_RESET`, `net::ERR_TIMED_OUT`  
**Cause:** Cloud Run service crashing on startup  
**Status:** ⚠️ **Diagnosis needed**

---

## 🔍 **Problem:**

```
GET https://inphysic.com/api/auth/session
→ net::ERR_CONNECTION_RESET
→ [next-auth][error][CLIENT_FETCH_ERROR] Failed to fetch
```

**This means:**
- Service is **crashing** immediately after startup
- Request reaches Cloud Run but **container dies**
- NextAuth cannot fetch session

---

## 🔍 **Check Service Status:**

### **Run diagnostic script:**

```bash
./check-cloud-run-status.sh
```

**Look for in logs:**
- ❌ "Database connection failed"
- ❌ "Prisma" errors
- ❌ "Out of memory"
- ❌ "Missing environment variable"
- ❌ Stack traces

---

## ✅ **Most Likely Cause: DATABASE_URL Missing**

Your app uses Prisma with database, but `DATABASE_URL` is not set in Cloud Run!

### **Check if DATABASE_URL is set:**

```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" \
  | grep DATABASE_URL
```

**If empty** → This is the problem!

---

## ✅ **Solution 1: Add DATABASE_URL (If you have DB)**

### **Update deploy script:**

**File:** `deploy-local-amd64.sh`

**Find line ~116 and add `DATABASE_URL`:**

```bash
--set-env-vars "\
NEXTAUTH_URL=https://inphysic.com,\
NODE_ENV=production,\
...existing vars...,\
DATABASE_URL=postgresql://user:pass@host:5432/dbname" \
```

**Or use Secret Manager (better for security):**

```bash
# Store DATABASE_URL as secret
echo -n "postgresql://user:pass@host:5432/dbname" | \
  gcloud secrets create database-url --data-file=-

# Grant access
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy lmsmath-app \
  --update-secrets="DATABASE_URL=database-url:latest"
```

---

## ✅ **Solution 2: Use Simple Auth (No Database)**

If you don't need database for auth, switch to simple auth:

### **File:** `app/api/auth/[...nextauth]/route.ts`

**Change:**

```typescript
// Before:
import { authOptions } from "@/lib/auth"  // ❌ Uses Prisma

// After:
import { authOptionsSimple } from "@/lib/auth-simple"  // ✅ No DB

const handler = NextAuth(authOptionsSimple)  // Use simple
```

**File:** `lib/auth-simple.ts` already exists and has hardcoded users:
- `teacher@example.com` / `teacher123`
- `student@example.com` / `student123`

---

## ✅ **Solution 3: Disable Prisma Adapter**

### **File:** `lib/auth.ts`

**Change:**

```typescript
export const authOptions: NextAuthOptions = {
  // Before:
  adapter: PrismaAdapter(db),  // ❌ Requires DATABASE_URL
  
  // After:
  // adapter: PrismaAdapter(db),  // ❌ Disabled
  
  session: {
    strategy: "jwt"  // ✅ Use JWT instead of database sessions
  },
  
  // ... rest of config
}
```

**This makes auth work without database!**

---

## 🔧 **Quick Fix (Recommended):**

### **Switch to Simple Auth (No Database):**

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { authOptionsSimple } from "@/lib/auth-simple"  // ✅ Change this

const handler = NextAuth(authOptionsSimple)  // ✅ Use simple

export { handler as GET, handler as POST }
```

**Then rebuild and redeploy:**

```bash
./deploy-local-amd64.sh
```

**Test with:**
- Email: `teacher@example.com`
- Password: `teacher123`

---

## 🚀 **Alternative: Comment out Prisma Adapter**

### **File:** `lib/auth.ts`

**Line ~48:**

```typescript
export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(db),  // ❌ Commented out
  
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: process.env.NODE_ENV === "development",
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost: true,
  
  session: {
    strategy: "jwt"  // ✅ Use JWT (no DB needed)
  },
  
  providers: [
    // ... keep existing providers
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email || ''
        token.name = user.name || ''
        token.role = user.role || 'STUDENT'
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.role = token.role as string
      }
      return session
    },
    // ... keep existing redirect callback
  },
  
  // ... rest
}
```

---

## 🆘 **Debug Commands:**

### **Check Cloud Run logs:**

```bash
# View errors
gcloud run services logs read lmsmath-app \
  --region asia-east1 \
  --limit 50 | grep -i "error"

# View all recent logs
gcloud run services logs read lmsmath-app \
  --region asia-east1 \
  --limit 50

# Follow live logs
gcloud run services logs tail lmsmath-app \
  --region asia-east1
```

### **Check service health:**

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(status.url)")

# Test health endpoint
curl -v $SERVICE_URL/api/health

# Test auth endpoint
curl -v $SERVICE_URL/api/auth/session
```

---

## 📋 **Diagnostic Checklist:**

```bash
# 1. Check service is running
gcloud run services list --region asia-east1

# 2. Check environment variables
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"

# 3. Check for DATABASE_URL
# Should show if set, empty if not

# 4. Check logs for crashes
gcloud run services logs read lmsmath-app \
  --region asia-east1 --limit 50

# 5. Look for these errors:
# - "Prisma" 
# - "Database"
# - "Connection"
# - "ECONNREFUSED"
# - "Out of memory"
```

---

## 🎯 **Recommended Fix:**

Based on the error pattern, most likely **Prisma/Database issue**.

### **Option A: Switch to Simple Auth (Quick Fix)**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { authOptionsSimple } from "@/lib/auth-simple"
const handler = NextAuth(authOptionsSimple)
```

**Then:**
```bash
./deploy-local-amd64.sh
```

---

### **Option B: Add DATABASE_URL (If you need DB)**

**Update `deploy-local-amd64.sh` line ~116:**

```bash
--set-env-vars "\
...existing vars...,\
DATABASE_URL=postgresql://user:password@host:5432/database" \
```

**Or use secret:**

```bash
# Create secret
echo -n "postgresql://..." | gcloud secrets create database-url --data-file=-

# Update deploy
gcloud run deploy lmsmath-app \
  --update-secrets="DATABASE_URL=database-url:latest"
```

---

## 🔍 **Check What's in Your .env:**

```bash
# Check if you have DATABASE_URL locally
grep DATABASE_URL .env.local
```

**If you have DATABASE_URL locally** → You need it in Cloud Run too!  
**If you don't have DATABASE_URL** → Use simple auth!

---

## 📊 **Next Steps:**

### **Step 1: Run diagnostic:**

```bash
./check-cloud-run-status.sh
```

### **Step 2: Check logs for specific error**

### **Step 3: Apply appropriate fix:**

- **If "Prisma" or "Database" errors** → Add DATABASE_URL or switch to simple auth
- **If "Out of memory"** → Increase memory in deploy script
- **If other errors** → Share logs for specific fix

---

## 🚀 **Quick Fix Script:**

**File:** `quick-fix-auth-crash.sh`

```bash
#!/bin/bash

echo "🔧 Quick fix - Switch to simple auth (no database)"

# Update NextAuth route
cat > app/api/auth/[...nextauth]/route.ts << 'EOF'
import NextAuth from "next-auth"
import { authOptionsSimple } from "@/lib/auth-simple"

const handler = NextAuth(authOptionsSimple)

export { handler as GET, handler as POST }
EOF

echo "✅ Updated to use simple auth"
echo "📦 Rebuild and deploy:"
echo "   ./deploy-local-amd64.sh"
```

---

**🔍 Run diagnostic first, then choose fix based on logs!**

```bash
./check-cloud-run-status.sh
```

