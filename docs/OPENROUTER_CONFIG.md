# 🔑 OpenRouter API Key Configuration

**Date**: March 8, 2026  
**Status**: ✅ **Configured**

---

## 📋 **API KEY DETAILS**

| Property | Value |
|----------|-------|
| **Provider** | OpenRouter |
| **API Key** | `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` |
| **Base URL** | `https://openrouter.ai/api/v1` |
| **Default Model** | `meta-llama/llama-3.2-3b-instruct` |

---

## 🔧 **CONFIGURATION**

### **1. Environment Variables**

Create `.env` in `openfang-core/`:

```bash
# LLM Provider
LLM_PROVIDER=openrouter

# OpenRouter API Key
OPENROUTER_API_KEY=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

# Model Selection
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct

# Agent Settings
AGENT_MAX_TOKENS=4096
AGENT_TEMPERATURE=0.7
AGENT_TIMEOUT_SECONDS=60
```

### **2. Available Models on OpenRouter**

OpenRouter provides access to **100+ models**:

| Provider | Models | Price (per 1M tokens) |
|----------|--------|----------------------|
| **Meta** | Llama 3.2, Llama 3.1 | $0.10 - $0.60 |
| **Google** | Gemini Pro, Flash | $0.075 - $0.50 |
| **Anthropic** | Claude 3.5, 3.0 | $3.00 - $15.00 |
| **Mistral** | Mistral Large, Medium | $0.50 - $2.00 |
| **DeepSeek** | DeepSeek V3, V2.5 | $0.14 - $0.28 |

### **3. Recommended Models for Exam Generation**

| Use Case | Model | Tokens | Price |
|----------|-------|--------|-------|
| **Fast & Cheap** | Llama 3.2 3B | 4K | $0.10/1M |
| **Balanced** | Llama 3.1 8B | 8K | $0.20/1M |
| **High Quality** | Claude 3.5 Sonnet | 128K | $3.00/1M |
| **Best Quality** | GPT-4o | 128K | $5.00/1M |

---

## 🚀 **USAGE**

### **Test OpenRouter Connection**

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer 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"
```

### **Test Chat Completion**

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer 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" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/llama-3.2-3b-instruct",
    "messages": [
      {
        "role": "user",
        "content": "Hello!"
      }
    ]
  }'
```

### **Use in OpenFang Agent**

```rust
// openfang-core/openfang-kernel/src/lib.rs

let agent = OpenFangExamAgentBuilder::new(runtime)
    .llm_provider(LlmProvider::OpenRouter)
    .llm_model("meta-llama/llama-3.2-3b-instruct".to_string())
    .build();
```

---

## 💰 **PRICING & BUDGET**

### **Current Key**
- **Type**: Pre-paid credits
- **Balance**: Check at https://openrouter.ai/activity
- **Expiry**: No expiry

### **Estimated Cost per Exam**

| Exam Type | Questions | Tokens | Cost (Llama 3.2 3B) |
|-----------|-----------|--------|---------------------|
| **Quick Quiz** | 10 MCQ | ~2K | $0.0002 |
| **Midterm** | 30 MCQ | ~6K | $0.0006 |
| **Final Exam** | 50 MCQ + Essay | ~15K | $0.0015 |

### **Monthly Budget Estimate**

| Usage | Exams/Month | Tokens | Cost |
|-------|-------------|--------|------|
| **Light** | 100 | 600K | $0.06 |
| **Medium** | 500 | 3M | $0.30 |
| **Heavy** | 2000 | 12M | $1.20 |

---

## 🔒 **SECURITY**

### **Best Practices**

1. **Never commit API key to git**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use environment variables**
   ```bash
   export OPENROUTER_API_KEY=sk-or-v1-...
   ```

3. **Rotate key if compromised**
   - Go to https://openrouter.ai/keys
   - Revoke old key
   - Generate new key
   - Update .env

4. **Monitor usage**
   - Check https://openrouter.ai/activity
   - Set up alerts for unusual usage

---

## 📊 **OPENROUTER VS OTHER PROVIDERS**

| Feature | OpenRouter | OpenAI Direct | Ollama (Local) |
|---------|------------|---------------|----------------|
| **Models** | 100+ | 10 | Unlimited |
| **Price** | $0.10-15/1M | $0.50-60/1M | Free |
| **Speed** | Fast | Fastest | Depends on hardware |
| **Privacy** | Good | Good | Best |
| **Setup** | Easy | Easy | Medium |
| **Best For** | Production | Enterprise | Development |

---

## 🎯 **RECOMMENDATION**

### **For Aeroeduvison Exam Generation**

**Primary**: OpenRouter with Llama 3.2 3B
- ✅ Cost-effective ($0.10/1M tokens)
- ✅ Fast enough for exam generation
- ✅ Good quality for structured tasks
- ✅ 100+ models available for upgrade

**Backup**: Ollama (local)
- ✅ Free
- ✅ Private
- ✅ No API limits
- ⚠️ Requires good hardware

**Premium Option**: OpenRouter with Claude 3.5 Sonnet
- ✅ Best quality
- ✅ Better reasoning
- ⚠️ 30x more expensive

---

## 📞 **SUPPORT**

**OpenRouter Dashboard**: https://openrouter.ai  
**API Docs**: https://openrouter.ai/docs  
**Usage Stats**: https://openrouter.ai/activity  
**Support**: support@openrouter.ai

---

**Created**: March 8, 2026  
**Status**: ✅ **Configured & Ready**  
**Next**: Test exam generation with OpenRouter
