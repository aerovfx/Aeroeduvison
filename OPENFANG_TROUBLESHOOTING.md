# OpenFang Agent Troubleshooting Guide

## Error: "Failed to trigger OpenFang agent: 400"

This error occurs when the Aeroeduvison application cannot communicate with the OpenFang Agent OS service.

---

## ⚡ Quick Fix (Development Mode)

**Enable Mock Mode** - No need to run the OpenFang service during development:

1. Add to your `.env.local` file:
```bash
OPENFANG_MOCK_MODE=true
```

2. Restart your development server:
```bash
npm run dev
```

Now the agent chat will work with mock responses for testing! 🎉

**Mock responses include:**
- `tutor-general`: General tutoring assistance
- `lesson-planner`: Lesson planning help
- `assessment-designer`: Assessment creation
- `feedback-writer`: Student feedback generation
- `parent-communicator`: Parent communication drafts
- `general-assistant`: General AI assistant

---

## 🔍 Root Cause (Production Mode)

When `OPENFANG_MOCK_MODE=false` (or not set), the OpenFang Agent OS is expected to be running at `http://127.0.0.1:4200` but is either:
1. **Not running** - The service hasn't been started
2. **Unreachable** - Firewall or network issues
3. **Returning errors** - Service is running but encountering errors

---

## ✅ Solution Steps

### 1. Check if OpenFang Service is Running

Open a terminal and check if the service is listening on port 4200:

```bash
# macOS/Linux
curl http://127.0.0.1:4200/api/health

# Windows PowerShell
Invoke-WebRequest -Uri http://127.0.0.1:4200/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

**If connection fails:**
```
curl: (7) Failed to connect to 127.0.0.1 port 4200: Connection refused
```
→ The service is **not running**. Proceed to step 2.

---

### 2. Start the OpenFang Agent OS

#### Option A: Run from openfang-core repository

```bash
# Navigate to openfang-core directory
cd /path/to/openfang-core

# Build and run in release mode
cargo run --release

# Or run in development mode (with more logging)
cargo run
```

#### Option B: Run the compiled binary

```bash
# If you've already built the project
./target/release/openfang
```

#### Option C: Use Docker (if available)

```bash
docker run -p 4200:4200 openfang-agent:latest
```

---

### 3. Verify Environment Variables

Ensure your `.env.local` file has the correct configuration:

```bash
# .env.local
OPENFANG_BASE_URL=http://127.0.0.1:4200
OPENFANG_INTERNAL_TOKEN=changeme-internal-token
```

**Check if environment variables are loaded:**

```bash
# In Next.js app, check browser console for:
[OpenFang Client] URL: http://127.0.0.1:4200/api/agents/tutor-general/message
```

---

### 4. Check Service Logs

When the OpenFang service is running, watch for incoming requests:

```
[2026-03-16T10:30:00Z INFO  openfang] Starting OpenFang Agent OS v0.1.0
[2026-03-16T10:30:00Z INFO  openfang::server] Listening on http://127.0.0.1:4200
[2026-03-16T10:30:15Z INFO  openfang::handlers] Received message for agent: tutor-general
[2026-03-16T10:30:16Z INFO  openfang::agents::tutor] Processing chat request...
```

**Common log errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Address already in use` | Port 4200 is occupied | Kill the process or use a different port |
| `Permission denied` | Insufficient privileges | Run with sudo or adjust permissions |
| `LLM provider not configured` | Missing API keys | Configure OpenRouter/Ollama |

---

### 5. Test Agent Endpoint Manually

Test the agent endpoint directly:

```bash
curl -X POST http://127.0.0.1:4200/api/agents/tutor-general/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer changeme-internal-token" \
  -d '{
    "message": "chat",
    "payload": { "text": "Hello" }
  }'
```

**Expected Response:**
```json
{
  "reply": "Hello! How can I help you with your teaching today?",
  "session_id": "abc123"
}
```

**400 Bad Request Response:**
```json
{
  "error": "Invalid agent ID",
  "message": "Agent 'tutor-general' not found in registry"
}
```

→ Check that the agent ID matches what's registered in OpenFang.

---

### 6. Check Browser Console Logs

The updated code now logs detailed information to the browser console:

```javascript
[OpenFang Client] Triggering agent: tutor-general
[OpenFang Client] URL: http://127.0.0.1:4200/api/agents/tutor-general/message
[OpenFang Client] Payload: { message: "chat", payload: { text: "Hello" } }
[OpenFang Client] Response status: 200
[OpenFang Client] Response body: {"reply":"Hello!"}
```

Or in case of error:

```javascript
[OpenFang Client] Fetch failed: TypeError: Failed to fetch
[OpenFang Client] Cannot connect to OpenFang Agent OS at http://127.0.0.1:4200
```

---

## 🛠️ Advanced Troubleshooting

### Port Conflicts

Check what's using port 4200:

```bash
# macOS/Linux
lsof -i :4200

# Windows
netstat -ano | findstr :4200
```

Kill the process if needed:

```bash
# macOS/Linux
kill -9 <PID>

# Windows
taskkill /PID <PID> /F
```

### Firewall Issues

If running on a different machine or in Docker:

```bash
# Allow incoming connections on port 4200
sudo ufw allow 4200/tcp  # Ubuntu/Debian
sudo firewall-cmd --add-port=4200/tcp  # RHEL/CentOS
```

### CORS Issues

If you see CORS errors in the browser console, the OpenFang service needs to allow requests from your Next.js app origin. Check the OpenFang configuration for CORS settings.

---

## 📝 Quick Fix Checklist

- [ ] OpenFang service is running (`curl http://127.0.0.1:4200/api/health`)
- [ ] Environment variables are set correctly in `.env.local`
- [ ] No port conflicts (port 4200 is free)
- [ ] Firewall allows connections
- [ ] Agent ID exists in OpenFang registry
- [ ] LLM provider (OpenRouter/Ollama) is configured
- [ ] Browser console shows detailed error messages

---

## 🔗 Related Files

- **Client Library:** `/lib/openfang-client.ts`
- **Agents Page:** `/app/(dashboard)/(routes)/teacher/agents/page.tsx`
- **Environment Config:** `/.env.local`
- **OpenFang Core:** `/openfang-core/`
- **API Docs:** `/docs/OPENFANG_AGENT_API.md`

---

## 💡 Temporary Workaround

If you need to use the agents page without OpenFang running, you can implement a mock handler:

```typescript
// In /app/(dashboard)/(routes)/teacher/agents/page.tsx
const res = await triggerOpenfangAgent(selectedAgent.id, "chat", { text });

// TEMPORARY MOCK (for development only)
// const res = {
//   reply: `[Mock] Tôi là ${selectedAgent.name}. Tôi đang ở chế độ offline. ` +
//          `Vui lòng khởi động OpenFang Agent OS để sử dụng tính năng này.`
// };
```

⚠️ **Warning:** This is only for development testing. Production requires the actual OpenFang service.

---

## 📞 Support

If issues persist:

1. Check the [OpenFang Integration Guide](/docs/OPENFANG_QUICKSTART.md)
2. Review [Agent OS Integration](/AGENT_OS_INTEGRATION.md)
3. Inspect service logs in `/openfang-core/logs/`
4. Verify Rust version: `rustc --version` (requires 1.75+)

---

**Last Updated:** 2026-03-16  
**Author:** Development Team
