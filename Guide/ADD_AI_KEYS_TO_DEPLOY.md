# 🔑 Add AI API Keys to Cloud Run Deployment

---

## 🎯 **TRẢ LỜI NHANH:**

### **KHÔNG thêm vào file .env!**

❌ `.env.local` - Bị gitignore, không push lên server  
❌ `env.example` - Chỉ là template  
✅ **Thêm vào deploy script hoặc Cloud Run Console**

---

## ✅ **2 CÁCH THÊM AI KEYS:**

---

### **🔥 CÁCH 1: Update Deploy Script (Automated)**

**File:** `FINAL_DEPLOY_NOW.sh` (dòng ~99-106)

**Tìm phần --set-env-vars và thêm AI keys:**

```bash
# Current:
--set-env-vars "\
NEXTAUTH_URL=https://inphysic.com,\
NODE_ENV=production,\
HOSTNAME=0.0.0.0,\
NEXT_TELEMETRY_DISABLED=1,\
GOOGLE_CLIENT_ID=442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com,\
GOOGLE_CLIENT_SECRET=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,\
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa" \
```

**Update thành (thêm 3 dòng AI):**

```bash
--set-env-vars "\
NEXTAUTH_URL=https://inphysic.com,\
NODE_ENV=production,\
HOSTNAME=0.0.0.0,\
NEXT_TELEMETRY_DISABLED=1,\
GOOGLE_CLIENT_ID=442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com,\
GOOGLE_CLIENT_SECRET=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,\
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa,\
AI_PROVIDER=openrouter,\
OPENROUTER_API_KEY=sk-or-v1-YOUR-OPENROUTER-KEY-HERE,\
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet" \
```

**⚠️ Thay `YOUR-OPENROUTER-KEY-HERE` bằng API key thật!**

**Sau đó deploy:**
```bash
./FINAL_DEPLOY_NOW.sh
```

---

### **🌐 CÁCH 2: Cloud Run Console (Manual)**

**Best cho:** Không muốn edit script, prefer UI

```
1. https://console.cloud.google.com/run

2. Click: lmsmath-app

3. Click: "EDIT & DEPLOY NEW REVISION"

4. Tab: "Variables & Secrets"

5. Click: "+ ADD VARIABLE" 3 lần và thêm:

   Variable 1:
   Name:  AI_PROVIDER
   Value: openrouter

   Variable 2:
   Name:  OPENROUTER_API_KEY
   Value: sk-or-v1-your-actual-key

   Variable 3:
   Name:  OPENROUTER_MODEL
   Value: anthropic/claude-3.5-sonnet

6. Click: "DEPLOY"
```

---

## 📊 **So Sánh 2 Cách:**

| Aspect | Deploy Script | Cloud Run Console |
|--------|---------------|-------------------|
| **Cách thực hiện** | Edit `FINAL_DEPLOY_NOW.sh` | UI Console |
| **Lưu keys** | Trong script file | Chỉ trên Cloud Run |
| **Security** | ⚠️ Keys trong file local | ✅ Keys chỉ trên cloud |
| **Automation** | ✅ Deploy tự động | ❌ Manual mỗi lần |
| **Best for** | Repeated deploys | One-time setup |

---

## 🔒 **BEST PRACTICE - Use Secret Manager:**

### **Most Secure Method:**

**Step 1: Create secret:**

```bash
# Create secret for OpenRouter key
echo -n "sk-or-v1-your-actual-key" | \
  gcloud secrets create openrouter-api-key \
    --data-file=- \
    --replication-policy="automatic"
```

**Step 2: Update deploy script to use secrets:**

```bash
# In FINAL_DEPLOY_NOW.sh, replace --set-env-vars with:

--set-env-vars "\
NEXTAUTH_URL=https://inphysic.com,\
NODE_ENV=production,\
AI_PROVIDER=openrouter,\
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet" \
--update-secrets "\
NEXTAUTH_SECRET=nextauth-secret:latest,\
GOOGLE_CLIENT_SECRET=google-client-secret:latest,\
OPENROUTER_API_KEY=openrouter-api-key:latest"
```

**Benefits:**
- ✅ Keys encrypted at rest
- ✅ Not in script files
- ✅ Access control via IAM
- ✅ Can rotate easily
- ✅ Audit logs

---

## 🎯 **RECOMMENDED FOR YOU:**

### **Quick Solution (Works Now):**

**Update `FINAL_DEPLOY_NOW.sh`:**

<search_replace>
File: FINAL_DEPLOY_NOW.sh
Find line ~99-106 and update to:

```bash
--set-env-vars "\
NEXTAUTH_URL=https://inphysic.com,\
NODE_ENV=production,\
HOSTNAME=0.0.0.0,\
NEXT_TELEMETRY_DISABLED=1,\
GOOGLE_CLIENT_ID=442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com,\
GOOGLE_CLIENT_SECRET=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,\
NEXTAUTH_SECRET=8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa,\
AI_PROVIDER=openrouter,\
OPENROUTER_API_KEY=YOUR_KEY_HERE,\
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet" \
```

**Then deploy:**
```bash
./FINAL_DEPLOY_NOW.sh
```

---

## 📋 **Step-by-Step:**

### **1. Get OpenRouter API Key**

```
1. Go to: https://openrouter.ai
2. Sign up / Login
3. Click: API Keys
4. Click: Create Key
5. Copy key (starts with sk-or-v1-...)
```

### **2. Edit Deploy Script**

```bash
# Open file
code FINAL_DEPLOY_NOW.sh

# Find line with --set-env-vars
# Add 3 lines for AI:
AI_PROVIDER=openrouter,\
OPENROUTER_API_KEY=sk-or-v1-paste-your-key,\
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Save file
```

### **3. Deploy**

```bash
./FINAL_DEPLOY_NOW.sh
```

**AI keys will be set on Cloud Run!** ✅

---

## 🔍 **Verify After Deploy:**

```bash
# Check env vars on Cloud Run
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)" | grep AI

# Should show:
AI_PROVIDER=openrouter
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
# (OPENROUTER_API_KEY won't show value for security)
```

---

## 📖 **Files You Edit:**

### **For Deployment:**

| File | Purpose | Edit? |
|------|---------|-------|
| `.env.local` | Local development | ✅ Yes (for local testing) |
| `env.example` | Template | ❌ No (just reference) |
| `FINAL_DEPLOY_NOW.sh` | Deploy script | ✅ Yes (add AI keys here) |
| `deploy.sh` | Alternative deploy | ✅ Yes (add AI keys here too) |

### **DO NOT Edit:**
- ❌ Dockerfile (env vars injected at runtime)
- ❌ Any code files (use process.env)

---

## 🎯 **Summary:**

**To push AI keys to Cloud Run:**

1. **Edit:** `FINAL_DEPLOY_NOW.sh`
2. **Find:** `--set-env-vars` section
3. **Add:** AI_PROVIDER, OPENROUTER_API_KEY, OPENROUTER_MODEL
4. **Run:** `./FINAL_DEPLOY_NOW.sh`
5. **Result:** AI keys available on Cloud Run ✅

---

## 🚀 **QUICK EXAMPLE:**

```bash
# 1. Get your OpenRouter key
open https://openrouter.ai

# 2. Edit deploy script
code FINAL_DEPLOY_NOW.sh

# 3. Add to --set-env-vars:
AI_PROVIDER=openrouter,\
OPENROUTER_API_KEY=sk-or-v1-your-key,\
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# 4. Save and deploy
./FINAL_DEPLOY_NOW.sh
```

---

**📖 Full Guide:** `ADD_AI_KEYS_TO_DEPLOY.md`

**🔑 Edit:** `FINAL_DEPLOY_NOW.sh` (line ~99-106)

**🚀 Then:** `./FINAL_DEPLOY_NOW.sh`
