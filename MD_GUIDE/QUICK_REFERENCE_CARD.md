# 🚀 Quick Reference Card

**Last Updated**: October 19, 2025

---

## ⚡ Quick Commands

```bash
# Start server
npm run dev

# Create test users
npm run test:auth:create-users

# Test auth
npm run test:auth:full

# Open database
npm run db:studio

# Test AI
curl -X POST http://localhost:3000/api/ai-intelligent/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"quiz","subject":"Toán","grade":"12","topic":"Đạo hàm"}'

# View analytics
curl http://localhost:3000/api/ai-analytics/dashboard
```

---

## 🔑 API Keys Location

**File**: `/Users/vietchung/lmsmath/.env.local`

```env
# Google OAuth
GOOGLE_CLIENT_ID="442514522574-m19vtt3lptt2m00mk86u3a9lcos95989..."
GOOGLE_CLIENT_SECRET="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"

# AI Providers
GROK_API_KEY="xai-gJ7tBgyiNcdZK7EUrk05hVr19Err78i7lQxb3nmVwBTPadw4fcmH1..."
OPENROUTER_API_KEY="sk-or-v1-8231d563ea8377ea99adfa417ee708cbe58ac2bbb0f073cfa81..."
OPENAI_API_KEY="sk-proj-RMTbASWalywgXWR7fyj0tAhAwf0sAUMBTgrEtSYSe2Vph5T2..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="CFYVNEF1tkMQkjBTP2KkG9p28VnHWpsVFGSnsj/dIXg="
```

---

## 🎯 Test Accounts

```
Email: student@test.com
Password: password123
Role: STUDENT

Email: teacher@test.com
Password: password123
Role: TEACHER

Email: admin@test.com
Password: password123
Role: ADMIN
```

---

## 📖 Documentation Files

### Authentication
- `GOOGLE_OAUTH_SETUP_VIETNAMESE.md` - Setup từ đầu
- `FIX_REDIRECT_URI_MISMATCH.md` - Fix OAuth error
- `FIX_ACCESS_DENIED_ERROR.md` - Fix access denied
- `AUTH_TESTING_GUIDE_COMPLETE.md` - Complete test guide

### AI System
- `INTELLIGENT_AI_SYSTEM_COMPLETE.md` - ⭐ START HERE
- `OPENROUTER_INTEGRATION_COMPLETE.md` - OpenRouter guide
- `GROK_API_UPDATED.md` - Grok config

### Roadmap
- `AI_ADAPTIVE_LEARNING_ROADMAP.md` - Future features

### Summary
- `SESSION_SUMMARY_OCT_19_2025.md` - Session overview

---

## 🐛 Common Issues

### Google OAuth Error
**Error**: `redirect_uri_mismatch`  
**Fix**: Add `http://localhost:3000/api/auth/callback/google` to Google Console

**Error**: `AccessDenied`  
**Fix**: Publish app or add email to test users

### AI Not Working
**Fix**: Check API keys in `.env.local`, restart server

### Cache Issues
**Fix**: Clear cache with API call or restart

---

## 📊 Key Endpoints

```
# Auth
POST /api/auth/signin/google
POST /api/auth/callback/credentials
GET  /api/auth/session

# AI (Old)
POST /api/ai-content/generate

# AI (New - Intelligent)
POST /api/ai-intelligent/generate
GET  /api/ai-intelligent/generate?action=analytics
GET  /api/ai-intelligent/generate?action=health
GET  /api/ai-intelligent/generate?action=cache-stats

# Analytics
GET  /api/ai-analytics/dashboard
```

---

## 💡 Tips

### For Best AI Quality
```typescript
{
  "priority": ["quality", "reliability"],
  "useHybrid": true
}
```

### For Fastest Response
```typescript
{
  "priority": ["speed", "cost"],
  "requiresRealtime": true,
  "enableCache": true
}
```

### For Lowest Cost
```typescript
{
  "priority": ["cost", "speed"],
  "budgetConstraint": 0.005,
  "enableCache": true
}
```

### For Privacy
```typescript
{
  "priority": ["privacy", "quality"],
  "privacyRequired": true
}
// Will use Ollama (local) if available
```

---

## 🎉 Success Checklist

- [ ] Google OAuth working
- [ ] Auth tests passing
- [ ] AI generation working
- [ ] Cache saving costs
- [ ] Analytics showing data
- [ ] No errors in console/logs

---

## 📞 Quick Links

- Google Console: https://console.cloud.google.com
- OpenRouter Dashboard: https://openrouter.ai/activity
- X.AI Console: https://console.x.ai

---

**Print this card or bookmark for quick access!** 📌

