# 🚀 Nemotron-Orchestrator Local AI Integration Guide

## Overview

Your Aeroeduvision AI Agent system is already configured to use **Nemotron-Orchestrator** - a powerful local LLM running via Ollama. This gives you:

- ✅ **FREE** - No API costs ($0.00 per request)
- ✅ **Privacy** - All data stays on your local machine
- ✅ **Speed** - No network latency for API calls
- ✅ **Offline** - Works without internet connection
- ✅ **Vietnamese Support** - Excellent multilingual capabilities

---

## 🎯 Quick Setup (5 minutes)

### Step 1: Install Ollama

```bash
# macOS
brew install ollama

# Or download from: https://ollama.ai/
```

### Step 2: Start Ollama Server

```bash
ollama serve
```

Keep this terminal running. Open a new terminal for the next steps.

### Step 3: Pull Nemotron Model

```bash
ollama pull nemotron-orchestrator
```

This downloads the model (~4GB). Takes 5-10 minutes depending on your internet speed.

### Step 4: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Copy the example
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=nemotron-orchestrator
AI_PREFERRED_PROVIDER=ollama
```

### Step 5: Test the Integration

```bash
npm run test:nemotron
```

You should see:
- ✅ Model selection tests passing
- ✅ AI completions working
- ✅ Cost showing $0.00
- ✅ Provider showing "ollama"

---

## 📊 How It Works

### 1. **Automatic Model Selection**

The AI system automatically selects Nemotron for tasks it excels at:

```typescript
// When you make an AI request, the system checks:
Priority 1: Ollama (Nemotron) - FREE, local, privacy
Priority 2: OpenAI - If Ollama is offline
Priority 3: Gemini - Final fallback
```

### 2. **Task Strengths**

Nemotron-Orchestrator is configured to handle:
- 💬 Chat Support
- 📝 Content Generation
- 💡 Explanations
- 📚 Lesson Planning
- 💻 Code Teaching

### 3. **Usage Examples**

#### Example 1: Content Generation

```typescript
import { getAIService } from './lib/ai';

const aiService = getAIService({
  preferredProvider: 'ollama', // Force local model
  fallbackEnabled: true,
});

const response = await aiService.complete({
  messages: [
    {
      role: 'system',
      content: 'Bạn là trợ lý giáo dục AI chuyên về toán học.',
    },
    {
      role: 'user',
      content: 'Tạo bài học về phân số cho học sinh lớp 6.',
    },
  ],
  options: {
    model: 'nemotron-orchestrator',
    temperature: 0.7,
    maxTokens: 2000,
  },
});

console.log(response.content); // Lesson content
console.log(response.cost); // $0.00
console.log(response.provider); // "Ollama"
```

#### Example 2: Smart Model Selection

```typescript
import { modelSelector, TaskType, Priority } from './lib/ai/model-selector';

// System automatically chooses best model
const result = await modelSelector.selectModel({
  taskType: TaskType.LESSON_PLANNING,
  priority: [Priority.COST, Priority.PRIVACY],
  inputLength: 500,
  expectedOutputLength: 2000,
  requiresVietnamese: true,
  privacyRequired: true,
  studentAgeGroup: 'secondary',
  subject: 'Mathematics',
});

console.log(result.selectedModel); // "nemotron-orchestrator"
console.log(result.estimatedCost); // 0
console.log(result.reasoning); // Why this model was chosen
```

#### Example 3: Auto-Selection with Fallback

```typescript
const aiService = getAIService({
  preferredProvider: 'auto', // Automatically choose best available
  fallbackEnabled: true,      // Fall back to cloud if local fails
});

const response = await aiService.complete({
  messages: [{ role: 'user', content: 'Explain quantum physics' }],
});

// If Ollama is running: provider = "ollama", cost = $0
// If Ollama is down: provider = "openai", cost = calculated
```

---

## 🔧 Integration Points

### 1. **Model Selector** ([lib/ai/model-selector.ts](lib/ai/model-selector.ts))

Already configured with Nemotron capabilities:

```typescript
{
  name: 'nemotron-orchestrator',
  provider: 'OpenAI', // OpenAI-compatible API
  costPer1kTokens: 0.0,
  qualityScore: 8.5,
  contextWindow: 32768,
  privacyLevel: 5, // Highest - local execution
  strengths: [
    TaskType.CHAT_SUPPORT,
    TaskType.CONTENT_GENERATION,
    TaskType.EXPLANATION,
    TaskType.LESSON_PLANNING,
    TaskType.CODE_TEACHING,
  ],
}
```

### 2. **Ollama Provider** ([lib/ai/providers/ollama-provider.ts](lib/ai/providers/ollama-provider.ts))

Handles communication with local Ollama server:

- ✅ OpenAI-compatible API
- ✅ Automatic model detection
- ✅ Token usage estimation
- ✅ Health checking
- ✅ Model listing

### 3. **AI Service Orchestrator** ([lib/ai/ai-service-orchestrator.ts](lib/ai/ai-service-orchestrator.ts))

Coordinates providers with automatic fallback:

- ✅ Cache support
- ✅ Rate limiting
- ✅ Cost tracking ($0 for local)
- ✅ Automatic provider selection
- ✅ Graceful fallback

---

## 📈 Cost Savings

### Before (Cloud Only):
```
Lesson Generation: 2000 tokens × $0.01/1k = $0.02
Quiz Generation: 1500 tokens × $0.01/1k = $0.015
Chat Support: 500 tokens × $0.01/1k = $0.005

Monthly (10,000 requests): ~$350/month
```

### After (With Nemotron):
```
Lesson Generation: $0.00 (local)
Quiz Generation: $0.00 (local)
Chat Support: $0.00 (local)

Monthly (10,000 requests): $0/month ✅
```

**Savings: $350/month = $4,200/year**

---

## 🎛️ Configuration Options

### Environment Variables

```env
# Ollama Configuration
OPENAI_API_KEY=ollama          # Use "ollama" as the API key
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=nemotron-orchestrator

# Provider Selection
AI_PREFERRED_PROVIDER=auto     # auto | ollama | openai | gemini
AI_FALLBACK_ENABLED=true       # Enable fallback to cloud providers

# Caching (optional)
AI_CACHE_ENABLED=true
AI_CACHE_TTL=604800           # 7 days

# Rate Limiting (optional)
AI_RATE_LIMIT_MINUTE=60
AI_RATE_LIMIT_HOUR=1000
```

### Provider Priority

Edit `lib/ai/ai-service-orchestrator.ts` to change provider order:

```typescript
// Current priority (line 189):
const providerOrder = ['ollama', 'openai', 'gemini'];

// To prioritize cloud over local:
const providerOrder = ['openai', 'ollama', 'gemini'];
```

---

## 🧪 Testing

### Run Full Test Suite

```bash
npm run test:nemotron
```

This tests:
1. ✅ Model selection for different tasks
2. ✅ Ollama provider health check
3. ✅ AI completions in Vietnamese
4. ✅ Auto provider selection
5. ✅ Cost tracking ($0 verification)

### Manual Testing

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Test completion
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nemotron-orchestrator",
    "messages": [
      {"role": "user", "content": "Say hello in Vietnamese"}
    ]
  }'
```

---

## 🐛 Troubleshooting

### Error: "No AI models available"

**Solution**: Set environment variables in `.env.local`:

```bash
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=nemotron-orchestrator
```

### Error: "Ollama API error: 404"

**Solution**: Pull the model:

```bash
ollama pull nemotron-orchestrator
```

### Error: "Connection refused"

**Solution**: Start Ollama server:

```bash
ollama serve
```

### Slow Response Times

**Solutions**:
1. Check system resources (RAM, CPU)
2. Use a smaller model: `ollama pull llama3.2`
3. Adjust `maxTokens` to reduce output length
4. Enable GPU acceleration (if available)

### Model Not Found

**Solution**: List available models and pull if needed:

```bash
ollama list
ollama pull nemotron-orchestrator
```

---

## 🚀 Next Steps

### 1. **Integrate into Your Application**

Update your lesson generation, quiz creation, or chat features to use the AI service:

```typescript
import { getAIService } from '@/lib/ai';

export async function generateLesson(topic: string) {
  const aiService = getAIService();

  const response = await aiService.complete({
    messages: [
      { role: 'system', content: 'You are an educational content creator' },
      { role: 'user', content: `Create a lesson about ${topic}` }
    ],
  });

  return response.content;
}
```

### 2. **Monitor Usage**

Track costs and performance:

```typescript
const stats = await aiService.getStats();
console.log(stats.cache.hitRate); // Cache efficiency
console.log(stats.providers); // Provider availability
```

### 3. **Optimize for Your Use Case**

Adjust model selection weights in `model-selector.ts`:

```typescript
// Prioritize speed over quality
priority: [Priority.SPEED, Priority.COST, Priority.QUALITY]

// Prioritize privacy for sensitive data
priority: [Priority.PRIVACY, Priority.QUALITY]
```

---

## 📚 Additional Models

Try other models for different use cases:

```bash
# Small, fast model
ollama pull llama3.2

# Code-focused model
ollama pull deepseek-coder

# Math-focused model
ollama pull qwen2.5-math

# Large, high-quality model
ollama pull llama3.3:70b
```

Then update `.env.local`:

```env
OPENAI_MODEL=llama3.2  # Change model here
```

---

## 🎉 Success Checklist

- [ ] Ollama installed and running
- [ ] Nemotron model pulled
- [ ] Environment variables configured in `.env.local`
- [ ] Test passing: `npm run test:nemotron`
- [ ] First AI completion successful
- [ ] Cost showing $0.00
- [ ] Provider showing "ollama"

---

## 📞 Support

- **Ollama Docs**: https://ollama.ai/docs
- **Model Library**: https://ollama.ai/library
- **Nemotron Model**: https://ollama.ai/library/nemotron-orchestrator
- **Issue Tracker**: [Your repository issues]

---

**Your local AI Agent is ready! 🎉**

All AI requests will automatically use Nemotron when available, saving costs while maintaining privacy and quality.
