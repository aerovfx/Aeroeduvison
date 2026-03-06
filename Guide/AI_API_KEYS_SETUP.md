# 🔑 AI API Keys Setup Guide

**Location:** `.env.local` (local) hoặc Cloud Run Variables (production)

---

## 📍 **Nơi Lưu API Keys:**

### **Development (Local):**

**File:** `/Users/vietchung/lmsmath/.env.local`

**Cách thêm:**
```bash
# Edit file .env.local
nano .env.local

# Hoặc
code .env.local
```

---

### **Production (Cloud Run):**

**Via Console:**
```
https://console.cloud.google.com/run
→ lmsmath-app
→ EDIT & DEPLOY NEW REVISION
→ Variables & Secrets
→ Add variables
```

**Via CLI:**
```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --update-env-vars GROK_API_KEY=xai-...
```

---

## 🤖 **AI Providers & API Keys:**

### **1. Grok API (X.AI) - Recommended ⭐**

**Get API Key:**
```
https://console.x.ai
```

**Add to .env.local:**
```bash
GROK_API_KEY="xai-your-api-key-here"
AI_PROVIDER="grok"
```

**Features:**
- ✅ Fast response
- ✅ Powerful (Grok-2)
- ✅ Affordable pricing
- ✅ Good for content generation

---

### **2. OpenRouter - Best Choice ⭐⭐⭐**

**Get API Key:**
```
https://openrouter.ai
→ Sign up
→ API Keys → Create key
```

**Add to .env.local:**
```bash
OPENROUTER_API_KEY="sk-or-v1-your-api-key-here"
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"
AI_PROVIDER="openrouter"
```

**Models Available:**
```
- anthropic/claude-3.5-sonnet  (⭐ Recommended, best quality)
- openai/gpt-4                 (High quality)
- google/gemini-2.5-pro        (Fast & powerful)
- x-ai/grok-2                  (Grok via OpenRouter)
- openai/gpt-3.5-turbo         (Cheapest)
```

**Benefits:**
- ✅ Access 500+ models
- ✅ One API for all providers
- ✅ Automatic fallback
- ✅ Pay-as-you-go
- ✅ Best for production

---

### **3. OpenAI Direct**

**Get API Key:**
```
https://platform.openai.com/api-keys
→ Create new secret key
```

**Add to .env.local:**
```bash
OPENAI_API_KEY="sk-proj-your-api-key-here"
AI_PROVIDER="openai"
```

**Features:**
- ✅ Direct access to GPT-4
- ✅ Official API
- ✅ Reliable
- ⚠️ More expensive than OpenRouter

---

### **4. Cursor API**

**Get API Key:**
```
From Cursor IDE settings
```

**Add to .env.local:**
```bash
CURSOR_API_KEY="your-cursor-api-key"
AI_PROVIDER="cursor"
```

---

### **5. Ollama (Local - Free) ⭐ FREE**

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model
ollama pull llama3.2

# Start server
ollama serve
```

**Add to .env.local:**
```bash
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:latest"
AI_PROVIDER="ollama"
```

**Benefits:**
- ✅ Completely free
- ✅ Privacy (runs locally)
- ✅ No API limits
- ⚠️ Slower than cloud APIs
- ⚠️ Requires local resources

---

## 📝 **Complete .env.local Template:**

**File:** `/Users/vietchung/lmsmath/.env.local`

```bash
# ========================================
# DATABASE
# ========================================
DATABASE_URL="your-database-url"

# ========================================
# NEXTAUTH
# ========================================
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="8761740715842a2bdf7428e4e35c2564c8aa35c9cd45f14d6138b91d5d0867fa"

# ========================================
# GOOGLE OAUTH
# ========================================
GOOGLE_CLIENT_ID="442514522574-95bi4m5do7h479aol12boottsua0bj5g.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

# ========================================
# AI PROVIDERS (Choose one or multiple)
# ========================================

# AI Provider Selection
# Options: auto, grok, openrouter, openai, cursor, ollama, demo
AI_PROVIDER="openrouter"

# Grok API (X.AI)
GROK_API_KEY="xai-your-api-key-here"

# OpenRouter (RECOMMENDED)
OPENROUTER_API_KEY="sk-or-v1-your-api-key-here"
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"

# OpenAI Direct
OPENAI_API_KEY="sk-proj-your-api-key-here"

# Cursor API
CURSOR_API_KEY="your-cursor-api-key"

# Ollama (Local)
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:latest"

# ========================================
# OPTIONAL SETTINGS
# ========================================
NODE_ENV="development"
NEXT_TELEMETRY_DISABLED=1
```

---

## 🎯 **Recommended Setup for You:**

### **Best AI Provider: OpenRouter**

**Why:**
- ✅ Access to Claude 3.5 Sonnet (best quality)
- ✅ Fallback to other models if needed
- ✅ Reasonable pricing
- ✅ Most reliable

**Setup:**

```bash
# 1. Get API key
open https://openrouter.ai

# 2. Sign up and create API key

# 3. Add to .env.local
echo 'OPENROUTER_API_KEY="sk-or-v1-your-actual-key"' >> .env.local
echo 'AI_PROVIDER="openrouter"' >> .env.local
echo 'OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"' >> .env.local

# 4. Restart server
npm run dev
```

---

## 🔍 **Check Current AI Config:**

```bash
# Check .env.local
cat .env.local | grep -E "AI_PROVIDER|GROK|OPENROUTER|OPENAI"

# Check if keys are set
cat .env.local | grep "API_KEY"
```

---

## 📊 **AI Provider Comparison:**

| Provider | Cost | Speed | Quality | Best For |
|----------|------|-------|---------|----------|
| **OpenRouter** | $$ | Fast | Excellent | ⭐ Production |
| Grok (X.AI) | $$ | Very Fast | Great | Content gen |
| OpenAI Direct | $$$ | Fast | Excellent | Official API |
| Ollama | Free | Slow | Good | Development |
| Cursor | Free | N/A | N/A | IDE only |
| Demo | Free | Instant | Fake | Testing |

---

## 🚀 **For Production Deployment:**

### **Add to Cloud Run:**

```
Console: https://console.cloud.google.com/run
→ lmsmath-app
→ EDIT & DEPLOY NEW REVISION
→ Variables & Secrets
→ Add:
   OPENROUTER_API_KEY = sk-or-v1-...
   AI_PROVIDER = openrouter
   OPENROUTER_MODEL = anthropic/claude-3.5-sonnet
```

**Or via deploy script:**

Update `FINAL_DEPLOY_NOW.sh` line 72:
```bash
--set-env-vars "\
...existing vars...,\
OPENROUTER_API_KEY=sk-or-v1-your-key,\
AI_PROVIDER=openrouter,\
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet"
```

---

## 📖 **Where Keys Are Used:**

### **Files that use AI keys:**

```
lib/ai-services.ts              - AI service selection
lib/ai/model-selector.ts        - Model routing
app/api/ai-content/generate/    - Content generation
app/api/ai-tutor-chat/          - AI tutor chat
app/api/generate-lesson/        - Lesson generation
app/api/llm-grading/            - Auto grading
```

---

## 🔒 **Security Best Practices:**

### **DO:**
- ✅ Store in .env.local (local)
- ✅ Use Cloud Run env vars (production)
- ✅ Add .env.local to .gitignore
- ✅ Never commit API keys
- ✅ Use Secret Manager for sensitive keys

### **DON'T:**
- ❌ Hardcode in code
- ❌ Commit to git
- ❌ Share publicly
- ❌ Put in client-side code
- ❌ Log API keys

---

## 🧪 **Test AI Integration:**

```bash
# Start dev server
npm run dev

# Test AI features
open http://localhost:3000/dashboard/ai-content-generator

# Check console for AI logs
# Should see which provider is being used
```

---

## 📋 **Quick Setup Checklist:**

```
[ ] Choose AI provider (OpenRouter recommended)
[ ] Get API key from provider website
[ ] Add to .env.local:
    [ ] OPENROUTER_API_KEY
    [ ] AI_PROVIDER=openrouter
    [ ] OPENROUTER_MODEL
[ ] Restart dev server: npm run dev
[ ] Test AI features
[ ] Add to production (Cloud Run console)
```

---

## 🎯 **For You Right Now:**

### **Local Development:**

```bash
# Check if .env.local exists
ls -la .env.local

# If not, create from example
cp env.example .env.local

# Edit and add your AI keys
nano .env.local
# OR
code .env.local
```

### **Production:**

**Add when deploying:**
```
Cloud Run Console → Variables & Secrets → Add AI keys
```

---

## 📖 **Related Docs:**

- `env.example` - Template with all keys
- `.env.local` - Your local config (gitignored)
- `AI_PROVIDERS_COMPLETE.md` - AI provider details
- `OPENROUTER_INTEGRATION_COMPLETE.md` - OpenRouter guide

---

## 🎊 **Summary:**

**File location:**
- **Local:** `.env.local` (gitignored)
- **Production:** Cloud Run Variables
- **Template:** `env.example`

**Recommended AI:**
- **Provider:** OpenRouter
- **Model:** Claude 3.5 Sonnet
- **Get key:** https://openrouter.ai

---

**📖 Full Guide:** `AI_API_KEYS_SETUP.md`

**🔑 File:** `.env.local` (local) or Cloud Run Console (production)

