# 🚀 Nemotron Quick Reference

## One-Line Setup

```bash
brew install ollama && ollama serve & ollama pull nemotron-orchestrator && cp .env.local.example .env.local && npm run test:nemotron
```

---

## Essential Commands

```bash
# Start Ollama server
ollama serve

# Pull model
ollama pull nemotron-orchestrator

# Check setup
npm run check:ollama

# Run tests
npm run test:nemotron

# List models
ollama list
```

---

## Environment (.env.local)

```env
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=nemotron-orchestrator
AI_PREFERRED_PROVIDER=ollama
```

---

## Basic Usage

```typescript
import { getAIService } from '@/lib/ai';

const ai = getAIService();
const response = await ai.complete({
  messages: [
    { role: 'user', content: 'Your prompt here' }
  ],
});

console.log(response.content);  // AI response
console.log(response.cost);     // $0.00
```

---

## Smart Selection

```typescript
import { modelSelector, TaskType, Priority } from '@/lib/ai/model-selector';

const result = await modelSelector.selectModel({
  taskType: TaskType.LESSON_PLANNING,
  priority: [Priority.COST, Priority.PRIVACY],
  inputLength: 500,
  expectedOutputLength: 2000,
  requiresVietnamese: true,
  privacyRequired: true,
  studentAgeGroup: 'secondary',
});
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No models available" | Set `.env.local` variables |
| "Connection refused" | Run `ollama serve` |
| "Model not found" | Run `ollama pull nemotron-orchestrator` |
| Slow responses | Check system resources, try smaller model |

---

## File Locations

- **Test**: [test-nemotron-agent.ts](test-nemotron-agent.ts)
- **Guide**: [NEMOTRON_SETUP_GUIDE.md](NEMOTRON_SETUP_GUIDE.md)
- **Summary**: [NEMOTRON_INTEGRATION_SUMMARY.md](NEMOTRON_INTEGRATION_SUMMARY.md)
- **Model Config**: [lib/ai/model-selector.ts:98-119](lib/ai/model-selector.ts#L98-L119)
- **Provider**: [lib/ai/providers/ollama-provider.ts](lib/ai/providers/ollama-provider.ts)
- **Orchestrator**: [lib/ai/ai-service-orchestrator.ts](lib/ai/ai-service-orchestrator.ts)

---

## Quick Test

```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nemotron-orchestrator",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

## Alternative Models

```bash
ollama pull llama3.2           # Small, fast
ollama pull deepseek-coder     # Code-focused
ollama pull qwen2.5-math       # Math-focused
ollama pull llama3.3:70b       # Large, high-quality
```

Then update `.env.local`:
```env
OPENAI_MODEL=llama3.2  # or other model name
```

---

## Cost Savings

| Usage | Cloud Cost | Local Cost | Savings |
|-------|-----------|-----------|---------|
| 100 requests | $3.50 | **$0.00** | $3.50 |
| 1,000 requests | $35.00 | **$0.00** | $35.00 |
| 10,000 requests | $350.00 | **$0.00** | $350.00 |
| **Monthly** | **$350** | **$0** | **$350** |

---

## Support Links

- **Ollama**: https://ollama.ai/
- **Nemotron**: https://ollama.ai/library/nemotron-orchestrator
- **Docs**: https://ollama.ai/docs

---

**Ready to use!** 🎉
