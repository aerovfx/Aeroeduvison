# OpenFang Agent - Development Setup Guide

## 🚀 Quick Start (Recommended for Development)

### Option 1: Mock Mode (Easiest)

Use mock responses without running the OpenFang service:

1. **Add to `.env.local`:**
```bash
OPENFANG_MOCK_MODE=true
```

2. **Restart development server:**
```bash
npm run dev
```

3. **Test the agent chat:**
- Go to `/teacher/agents`
- Select "Tutor" agent
- Send a message
- You'll get a mock response in Vietnamese

✅ **Pros:**
- No additional services to run
- Instant setup
- Good for UI/UX testing
- All agent templates work

❌ **Cons:**
- Responses are predefined (not real AI)
- Not suitable for production testing

---

### Option 2: Real OpenFang Service (Advanced)

Run the actual OpenFang Agent OS for real AI responses:

#### Prerequisites

1. **Rust installed** (version 1.75+):
```bash
rustup update
rustc --version  # Should be 1.75 or higher
```

2. **OpenFang Core repository**:
```bash
# Clone or navigate to openfang-core
cd /path/to/openfang-core
```

3. **LLM Provider configured**:
   - OpenRouter API key, OR
   - Ollama running locally

#### Setup Steps

1. **Build OpenFang:**
```bash
cd openfang-core
cargo build --release
```

2. **Run OpenFang:**
```bash
cargo run --release
```

Expected output:
```
[INFO  openfang] Starting OpenFang Agent OS v0.1.0
[INFO  openfang::server] Listening on http://127.0.0.1:4200
```

3. **Configure Aeroeduvison:**
```bash
# In .env.local
OPENFANG_MOCK_MODE=false
OPENFANG_BASE_URL=http://127.0.0.1:4200
OPENFANG_INTERNAL_TOKEN=changeme-internal-token
```

4. **Restart Aeroeduvison:**
```bash
npm run dev
```

5. **Test the connection:**
```bash
curl http://127.0.0.1:4200/api/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

✅ **Pros:**
- Real AI responses
- Full functionality
- Production-ready testing

❌ **Cons:**
- Requires Rust setup
- Additional service to manage
- Longer startup time

---

## 📋 Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENFANG_MOCK_MODE` | `false` | Enable mock responses (dev only) |
| `OPENFANG_BASE_URL` | `http://127.0.0.1:4200` | OpenFang service URL |
| `OPENFANG_INTERNAL_TOKEN` | *(empty)* | Auth token for internal calls |

### When to Use Each Mode

| Scenario | Recommended Mode |
|----------|------------------|
| UI Development | Mock Mode |
| Frontend Testing | Mock Mode |
| Integration Testing | Real Service |
| Production | Real Service |
| Demo without Rust | Mock Mode |

---

## 🧪 Testing

### Test Mock Mode

1. Ensure `.env.local` has:
```bash
OPENFANG_MOCK_MODE=true
```

2. Open browser console
3. Go to `/teacher/agents`
4. Send message to any agent
5. Check console logs:
```javascript
[OpenFang Client] Mock mode enabled, returning mock response
```

### Test Real Service

1. Ensure OpenFang is running:
```bash
curl http://127.0.0.1:4200/api/health
```

2. Ensure `.env.local` has:
```bash
OPENFANG_MOCK_MODE=false
```

3. Send message in agent chat
4. Check console logs:
```javascript
[OpenFang Client] Triggering agent: tutor-general
[OpenFang Client] Response status: 200
```

---

## 🐛 Troubleshooting

### Mock Mode Not Working

**Problem:** Still getting connection errors

**Solution:**
1. Restart dev server after changing `.env.local`
2. Clear browser cache
3. Check console for "Mock mode enabled" log

### Real Service Connection Fails

**Problem:** `Cannot connect to OpenFang Agent OS`

**Solution:**
1. Check if service is running:
```bash
curl http://127.0.0.1:4200/api/health
```

2. Check port is not in use:
```bash
lsof -i :4200
```

3. Verify Rust version:
```bash
rustc --version  # Must be 1.75+
```

### 400 Bad Request

**Problem:** `Failed to trigger OpenFang agent: 400`

**Solution:**
1. Check agent ID is valid
2. Verify request payload format
3. Check OpenFang service logs
4. Or just use mock mode!

---

## 📚 Available Agents

All agents work in both mock and real modes:

| Agent ID | Name | Purpose |
|----------|------|---------|
| `tutor-general` | Tutor | General teaching assistance |
| `lesson-planner` | Lesson Planner | Design lesson plans |
| `assessment-designer` | Assessment Designer | Create quizzes/exams |
| `feedback-writer` | Feedback Writer | Student feedback |
| `parent-communicator` | Parent Communicator | Parent communication |
| `general-assistant` | General Assistant | Versatile helper |

---

## 🎯 Best Practices

### Development Workflow

1. **Start with Mock Mode**
   - Develop UI components
   - Test user interactions
   - Iterate quickly

2. **Switch to Real Service for Integration**
   - Test actual AI responses
   - Verify end-to-end flow
   - Performance testing

3. **Use Mock Mode for Demos**
   - Reliable (no service crashes)
   - Fast (no LLM latency)
   - Predictable responses

### Environment Management

```bash
# Development (.env.local)
OPENFANG_MOCK_MODE=true

# Staging (.env.staging)
OPENFANG_MOCK_MODE=false
OPENFANG_BASE_URL=https://openfang-staging.example.com

# Production (.env.production)
OPENFANG_MOCK_MODE=false
OPENFANG_BASE_URL=https://openfang.example.com
```

---

## 🔗 Related Documentation

- [Troubleshooting Guide](OPENFANG_TROUBLESHOOTING.md)
- [Quick Start](docs/OPENFANG_QUICKSTART.md)
- [Agent API Docs](docs/OPENFANG_AGENT_API.md)
- [Integration Guide](AGENT_OS_INTEGRATION.md)

---

## 💡 Tips

1. **Quick Toggle**: Create a script to switch modes:
```bash
# toggle-openfang.sh
if grep -q "OPENFANG_MOCK_MODE=true" .env.local; then
  sed -i '' 's/OPENFANG_MOCK_MODE=true/OPENFANG_MOCK_MODE=false/' .env.local
  echo "Switched to REAL service mode"
else
  sed -i '' 's/OPENFANG_MOCK_MODE=false/OPENFANG_MOCK_MODE=true/' .env.local
  echo "Switched to MOCK mode"
fi
```

2. **Check Mode**: Add indicator to UI:
```typescript
const isMockMode = process.env.OPENFANG_MOCK_MODE === 'true';
{isMockMode && <span className="text-xs text-yellow-500">Mock Mode</span>}
```

3. **Hybrid Approach**: Use mock for some agents, real for others:
```typescript
const REAL_AGENTS = ['tutor-general', 'assessment-designer'];
const useMock = !REAL_AGENTS.includes(agentId) || OPENFANG_MOCK_MODE;
```

---

**Last Updated:** 2026-03-16  
**Author:** Development Team
