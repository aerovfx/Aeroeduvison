# 🚀 Grok API Setup Guide - Complete

**Hướng dẫn đầy đủ để sử dụng Grok API trong AI Content Generator**

---

## ⚠️ STATUS: API Key Valid - Credits Needed

### 📊 Current Situation

✅ **API Key**: Valid (`xai-g3EzXb7yo6bCNa3mYOqhJYSxT1cqNy3UNQ1N73PUqr6tLf6udeh0fSZtcbsF0bb91Payq3SqD1u3fVPY`)

❌ **Credits**: Not available yet

**Error Message:**
```
Your newly created teams doesn't have any credits yet. 
You can purchase credits on https://console.x.ai/team/d77b906f-f987-4491-b5f3-e7bd4c3ce4cf
```

---

## 🎯 Quick Fix: Add Credits

### Option 1: Purchase Credits (Recommended)

1. **Visit Console**:
   ```
   https://console.x.ai/team/d77b906f-f987-4491-b5f3-e7bd4c3ce4cf
   ```

2. **Add Payment Method**:
   - Click "Billing" or "Credits"
   - Add credit card
   - Purchase credits

3. **Recommended Amount**:
   - **$10-20** for testing
   - **$50-100** for production use
   - Credits don't expire

4. **Verify**:
   ```bash
   npm run test:grok
   ```

### Option 2: Free Trial (If Available)

1. Check if X.AI offers free trial
2. Visit: https://x.ai/pricing
3. Apply promo code if available

### Option 3: Use Alternative Providers (Temporary)

While waiting for credits, use these providers:

```bash
# In .env.local
AI_PROVIDER="cursor"  # or "ollama" or "openai"
```

---

## 💰 Pricing Information

### Grok API Costs (Estimated)

| Usage | Credits | Cost |
|-------|---------|------|
| **Testing** (10-20 requests) | ~1,000 tokens | ~$0.10-0.20 |
| **Daily Use** (100 requests) | ~10,000 tokens | ~$1-2 |
| **Monthly** (3,000 requests) | ~300,000 tokens | ~$30-60 |

### Comparison with Other Providers

| Provider | Cost/1M tokens | Quality | Speed |
|----------|----------------|---------|-------|
| **Grok** | ~$10-20 | ⭐⭐⭐⭐ | ⚡⚡⚡ |
| OpenAI GPT-4 | ~$30-60 | ⭐⭐⭐⭐⭐ | ⚡⚡ |
| Cursor | Free-ish | ⭐⭐⭐ | ⚡⚡ |
| Ollama | Free | ⭐⭐ | ⚡ |

**Verdict**: Grok offers best value for money! 💎

---

## 🔧 Complete Setup Steps

### Step 1: Add Credits to X.AI Account

1. Visit console: https://console.x.ai
2. Go to team settings
3. Add payment method
4. Purchase $20 worth of credits (recommended)

### Step 2: Configure Environment

Create or update `.env.local`:

```bash
# Priority: Use Grok
AI_PROVIDER="grok"

# Grok API Key (already have this)
GROK_API_KEY="xai-g3EzXb7yo6bCNa3mYOqhJYSxT1cqNy3UNQ1N73PUqr6tLf6udeh0fSZtcbsF0bb91Payq3SqD1u3fVPY"

# Fallback providers (optional)
CURSOR_API_KEY="your-cursor-key-if-have"
OLLAMA_URL="http://localhost:11434"
OPENAI_API_KEY="sk-proj-xxx-if-have"
```

### Step 3: Verify Setup

```bash
# Test Grok API
npm run test:grok
```

**Expected output after adding credits:**
```
✅ All Grok API tests passed!
   ✓ API connection working
   ✓ Key format valid
   ✓ Educational content generation working
   ✓ Vietnamese language supported
```

### Step 4: Start Development Server

```bash
npm run dev
```

### Step 5: Test in Browser

1. Visit: http://localhost:3000/dashboard/ai-content-generator
2. Fill form:
   - Type: Bài học
   - Subject: Toán học
   - Grade: Lớp 10
   - Topic: Phương trình bậc hai
3. Click "Tạo nội dung"
4. Console should show: `"Using Grok API (X.AI)..."`

---

## 🎓 Using AI Content Generator

### Example 1: Generate Lesson

**Input:**
- Type: Bài học
- Subject: Vật lý
- Grade: Lớp 11
- Topic: Định luật Newton
- Difficulty: Medium

**Output:**
```
Title: Định luật Newton - Cơ sở của Cơ học cổ điển
Content: [Detailed lesson with examples]
Duration: 45 minutes
```

### Example 2: Generate Quiz

**Input:**
- Type: Quiz
- Subject: Hóa học
- Grade: Lớp 12
- Topic: Phản ứng oxi hóa khử

**Output:**
```
10 multiple choice questions with:
- Clear questions
- 4 options each
- Correct answers
- Detailed explanations
```

### Example 3: Generate Slides

**Input:**
- Type: Slides
- Subject: Sinh học
- Grade: Lớp 10
- Topic: Quang hợp

**Output:**
```
15 slides with:
- Title slides
- Content slides
- Visual suggestions
- Summary
```

---

## 🔄 Provider Fallback Strategy

### Auto Mode (Recommended)

```bash
AI_PROVIDER="auto"
```

**Priority order:**
1. Grok (if has credits) ⚡
2. Cursor (if has key) 🖱️
3. Ollama (if running) 🏠
4. OpenAI (if has key) 🤖
5. Demo Mode 🎭

### Force Specific Provider

```bash
# Force Grok only
AI_PROVIDER="grok"

# Force Cursor only
AI_PROVIDER="cursor"

# Force Ollama only
AI_PROVIDER="ollama"

# Force OpenAI only
AI_PROVIDER="openai"

# Force Demo (no AI needed)
AI_PROVIDER="demo"
```

---

## 📊 Monitoring Usage

### Check X.AI Console

Visit: https://console.x.ai

**Metrics to monitor:**
- Credits remaining
- Tokens used
- Request count
- Error rate

### Set Up Alerts

1. Low credits warning (< $5)
2. High usage alert (> 100 requests/day)
3. Error rate spike (> 5%)

---

## 🐛 Troubleshooting

### Issue 1: "No credits" error

**Error:**
```
Your newly created teams doesn't have any credits yet
```

**Solution:**
1. Visit: https://console.x.ai/team/[YOUR_TEAM_ID]
2. Add payment method
3. Purchase credits ($10-20 minimum)
4. Wait 1-2 minutes for activation
5. Retry: `npm run test:grok`

### Issue 2: API key not working

**Check key format:**
```bash
echo $GROK_API_KEY
# Should start with: xai-
```

**Regenerate key:**
1. Visit: https://console.x.ai/api-keys
2. Delete old key
3. Create new key
4. Update `.env.local`

### Issue 3: Slow responses

**Possible causes:**
- Network latency
- API load
- Large content generation

**Solutions:**
- Reduce `max_tokens` in request
- Use `temperature: 0` for faster responses
- Check internet connection

### Issue 4: Rate limiting

**Error:**
```
Rate limit exceeded
```

**Solutions:**
- Add delay between requests (1-2 seconds)
- Implement request queue
- Upgrade API plan
- Use fallback provider

---

## 🎯 Best Practices

### 1. Cost Optimization

```javascript
// Reduce tokens for simple tasks
{
  type: 'quiz',
  additionalContext: 'Keep it concise' // Hint to AI
}

// Use appropriate temperature
{
  temperature: 0.3 // Lower = faster & cheaper
}
```

### 2. Quality Optimization

```javascript
// Be specific
{
  topic: 'Phương trình bậc hai - Công thức nghiệm', // Specific
  curriculum: 'Chương trình GDPT 2018', // Context
  additionalContext: 'Tập trung vào ứng dụng thực tế' // Detail
}
```

### 3. Error Handling

```javascript
// Always have fallback
try {
  const content = await generateWithGrok(...);
} catch (error) {
  // Auto fallback to next provider
  console.log('Grok failed, trying Cursor...');
}
```

### 4. Caching

```javascript
// Cache common requests
const cacheKey = `${type}-${subject}-${topic}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

---

## 📈 Scaling Strategies

### For Small Usage (<100 requests/day)

- **Provider**: Auto mode with Grok priority
- **Budget**: $10-20/month
- **Setup**: Simple .env configuration

### For Medium Usage (100-1000 requests/day)

- **Provider**: Grok + Ollama fallback
- **Budget**: $50-100/month
- **Setup**: Request queuing + caching

### For Large Usage (>1000 requests/day)

- **Provider**: Grok + OpenAI + Ollama
- **Budget**: $100-300/month
- **Setup**: Load balancing + advanced caching

---

## 🆘 Support Resources

### X.AI Support

- **Console**: https://console.x.ai
- **Docs**: https://docs.x.ai
- **Support**: support@x.ai
- **Status**: https://status.x.ai

### LMSMath Internal

- **Documentation**: `GROK_API_INTEGRATION_COMPLETE.md`
- **Test Script**: `npm run test:grok`
- **API Route**: `app/api/ai-content/generate/route.ts`

---

## ✅ Checklist

### Before Going Live

- [ ] Credits added to X.AI account ($20+ recommended)
- [ ] API key tested with `npm run test:grok`
- [ ] `.env.local` configured correctly
- [ ] Fallback providers configured
- [ ] Usage monitoring setup
- [ ] Error alerts configured
- [ ] Documentation read

### After Going Live

- [ ] Monitor usage daily
- [ ] Check error logs
- [ ] Optimize prompts
- [ ] Collect user feedback
- [ ] Adjust based on costs

---

## 💡 Quick Tips

### Cost Saving

1. Use demo mode for testing UI
2. Cache common requests
3. Set reasonable `max_tokens` limits
4. Use Ollama for internal testing

### Quality Improvement

1. Be specific in prompts
2. Provide curriculum context
3. Set appropriate difficulty
4. Review and iterate on outputs

### Performance

1. Implement request caching
2. Use streaming for real-time feedback
3. Parallel provider calls with race
4. Optimize prompt length

---

## 🎉 Next Steps

### Immediate (After Adding Credits)

1. Run: `npm run test:grok`
2. Verify: All tests pass ✅
3. Start: `npm run dev`
4. Test: Generate first content! 🎓

### Short Term (This Week)

- Generate 5-10 lessons to test quality
- Monitor usage and costs
- Tune prompts for Vietnamese content
- Collect feedback from teachers

### Long Term (This Month)

- Implement caching layer
- Add usage analytics
- Create content templates
- A/B test with other providers

---

## 📞 Need Help?

### Common Questions

**Q: How much will it cost?**
A: ~$10-20/month for light use, $50-100 for medium use.

**Q: What if Grok is down?**
A: System auto-falls back to Cursor → Ollama → OpenAI → Demo.

**Q: Can I use without credits?**
A: Yes! Set `AI_PROVIDER="ollama"` or `"demo"`.

**Q: Is my data secure?**
A: Yes, X.AI is compliant with data protection standards.

---

**Built with ❤️ - Powerful AI for Vietnamese Education**

🤖 **Grok** + 📚 **Education** + 🇻🇳 **Vietnam** = 🚀 **Success!**

---

Last Updated: October 14, 2025  
Status: Ready - Just add credits!  
Next: Purchase credits and start generating! 💳

