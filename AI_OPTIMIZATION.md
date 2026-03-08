# AI Model Optimization Guide

**Version:** 1.0  
**Date:** 2026-03-07

---

## Overview

This guide covers strategies for optimizing AI/LLM usage in AeroeduVision to balance quality, performance, and cost.

---

## Current AI Models

### Supported Providers

| Provider | Models | Use Case | Cost (per 1K tokens) |
|----------|--------|----------|---------------------|
| OpenAI | GPT-4o, GPT-4o-mini | Content generation, grading | $0.005 - $0.03 |
| Anthropic | Claude Sonnet | Complex reasoning | $0.003 - $0.015 |
| Google | Gemini Pro | Multi-modal analysis | $0.0005 - $0.002 |
| Ollama | Llama 3.2 | Local inference | Free (self-hosted) |

---

## Optimization Strategies

### 1. Model Selection by Task

#### High-Quality Tasks (Use GPT-4o/Claude)
- Complex essay grading
- Advanced content generation
- Sensitive student feedback

#### Standard Tasks (Use GPT-4o-mini/Gemini)
- Multiple choice generation
- Simple Q&A
- Content summarization

#### Low-Quality Tasks (Use Ollama/Local)
- Draft generation
- Internal testing
- Non-critical analysis

### 2. Caching Strategy

```rust
// Cache AI responses by input hash
let cache_key = format!("ai:{}:{}:{}", model, task_type, input_hash);

// Check cache first
if let Some(cached) = redis.get(&cache_key).await? {
    return Ok(cached);
}

// Generate and cache
let response = call_ai_api(model, input).await?;
redis.setex(&cache_key, 3600, response).await?; // 1 hour TTL
```

**Expected Savings:** 40-60% reduction in API calls

### 3. Prompt Optimization

#### Before (Verbose)
```
You are an expert teacher with 20 years of experience. 
Please create a detailed lesson plan about quadratic equations 
for 10th grade students. The lesson should include objectives, 
content, examples, and exercises. Make it engaging and 
appropriate for Vietnamese students...
```
**Tokens:** ~150

#### After (Concise)
```
Lesson: Quadratic Equations
Grade: 10
Format: {objectives, content, examples, exercises}
Language: Vietnamese
```
**Tokens:** ~30

**Expected Savings:** 70-80% token reduction

### 4. Batch Processing

Instead of individual API calls:
```python
# ❌ Expensive: 10 separate calls
for student in students:
    grade = ai_grade(submission)
```

Batch multiple requests:
```python
# ✅ Cheaper: 1 batch call
grades = ai_grade_batch(submissions)
```

**Expected Savings:** 50-70% cost reduction

### 5. Response Streaming

For long responses, stream instead of waiting:
```rust
// Stream response chunks
let mut stream = ai_api.stream_chat(prompt).await?;

while let Some(chunk) = stream.next().await {
    send_to_client(chunk);
}
```

**Benefits:**
- Better UX (faster first token)
- Lower timeout risk
- Reduced memory usage

---

## Cost Analysis

### Current Usage (Example)

| Task | Daily Requests | Avg Tokens | Model | Daily Cost |
|------|---------------|------------|-------|------------|
| Content Generation | 500 | 2,000 | GPT-4o | $30 |
| Grading | 1,000 | 1,000 | GPT-4o-mini | $5 |
| Chat/Tutor | 2,000 | 500 | GPT-4o-mini | $5 |
| **Total** | **3,500** | - | - | **$40/day** |

**Monthly Cost:** ~$1,200

### After Optimization

| Optimization | Savings | New Cost |
|--------------|---------|----------|
| Caching (50%) | -$600 | $600 |
| Prompt Optimization (50%) | -$300 | $300 |
| Model Selection (30%) | -$90 | $210 |
| **Total Savings** | **-$990** | **$210/month** |

**Expected Savings:** 80-85% cost reduction

---

## Implementation Checklist

### Immediate (Week 1)
- [ ] Add response caching layer
- [ ] Implement prompt templates
- [ ] Set up cost monitoring

### Short-term (Week 2-4)
- [ ] A/B test model selection
- [ ] Implement batch processing
- [ ] Add streaming support

### Long-term (Month 2-3)
- [ ] Fine-tune open-source models
- [ ] Build custom grading models
- [ ] Implement multi-model fallback

---

## Monitoring

### Key Metrics

```prometheus
# AI API calls per minute
ai_api_calls_total{model="gpt-4o"}

# Average tokens per request
ai_tokens_per_request{type="generation"}

# Response latency (p95)
ai_response_latency_seconds{quantile="0.95"}

# Cost per day
ai_daily_cost_usd

# Cache hit rate
ai_cache_hit_rate
```

### Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Cost/day | > $50 | Review usage |
| Latency (p95) | > 5s | Check API status |
| Error rate | > 5% | Investigate failures |
| Cache hit rate | < 30% | Improve caching |

---

## Model Comparison

### Content Generation Quality

| Model | Quality | Speed | Cost | Best For |
|-------|---------|-------|------|----------|
| GPT-4o | ⭐⭐⭐⭐⭐ | Medium | High | Premium content |
| GPT-4o-mini | ⭐⭐⭐⭐ | Fast | Low | Standard content |
| Claude Sonnet | ⭐⭐⭐⭐⭐ | Medium | High | Complex reasoning |
| Gemini Pro | ⭐⭐⭐⭐ | Fast | Low | Multi-modal |
| Llama 3.2 | ⭐⭐⭐ | Fast | Free | Draft/Internal |

### Grading Accuracy

| Model | Accuracy | Consistency | Cost |
|-------|----------|-------------|------|
| GPT-4o | 92% | 95% | High |
| GPT-4o-mini | 88% | 92% | Low |
| Claude Sonnet | 91% | 94% | High |
| Human Teacher | 95% | 85% | Very High |

---

## Best Practices

### Do ✅
- Cache all AI responses
- Use cheapest model that meets quality bar
- Implement retry logic with exponential backoff
- Monitor costs daily
- Set up usage quotas per user
- Test prompts before deploying

### Don't ❌
- Use GPT-4o for simple tasks
- Make synchronous API calls in hot paths
- Ignore rate limits
- Deploy without cost monitoring
- Cache without TTL
- Send sensitive data to AI APIs

---

## Environment Variables

```bash
# Model Selection
AI_PROVIDER=auto  # auto, openai, anthropic, google, ollama

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Optimization
AI_CACHE_TTL=3600  # 1 hour
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
AI_BATCH_SIZE=10
```

---

**Document Owner:** AI Team Lead  
**Review Cycle:** Monthly  
**Last Updated:** 2026-03-07
