# Soniox API Configuration

## ✅ API Key Configured

**API Key**: `f37428a54bce90db638e6c742027e53b43d4bd9bc01145bb3e716d3a3ed7c3e6`

## 🔧 Quick Setup

### Option 1: Environment Variable
Create `.env.local` file:
```bash
NEXT_PUBLIC_SONIOX_API_KEY=f37428a54bce90db638e6c742027e53b43d4bd9bc01145bb3e716d3a3ed7c3e6
```

### Option 2: In-App Settings (Recommended)
1. Go to http://localhost:3000/teacher/transcript
2. Click "Cài đặt" (Settings)
3. Paste API key
4. Select languages (e.g., English → Vietnamese)
5. Click "Lưu cài đặt" (Save)

## 🧪 Test Your API Key

### Test Connection:
```javascript
// Open browser console at /teacher/transcript
const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket');

ws.onopen = () => {
  console.log('✅ Connected to Soniox!');
  ws.send(JSON.stringify({
    api_key: 'f37428a54bce90db638e6c742027e53b43d4bd9bc01145bb3e716d3a3ed7c3e6',
    model: 'stt-rt-v4'
  }));
};

ws.onmessage = (e) => {
  console.log('Response:', JSON.parse(e.data));
};
```

### Expected Response:
```json
{
  "status": "ok",
  "message": "Connected"
}
```

## 📊 API Usage

### Pricing:
- ~$0.12 per hour of audio
- Free tier: Check soniox.com for current limits
- Billing: Monthly based on usage

### Rate Limits:
- Concurrent streams: Check your plan
- Max duration: Typically unlimited for paid plans

## 🎯 Test Flow

### 1. Start Recording:
```
1. Open /teacher/transcript
2. Click "Cài đặt"
3. Paste API key: f37428a54bce90db638e6c742027e53b43d4bd9bc01145bb3e716d3a3ed7c3e6
4. Select: English → Vietnamese
5. Click "Lưu cài đặt"
6. Click "Record"
7. Grant microphone permission
8. Speak: "Hello, this is a test"
```

### 2. Expected Output:
```
[10:23:45] Speaker 1: Hello, this is a test
→ Xin chào, đây là một bài kiểm tra

Status: 🔴 Recording
Time: 00:00:05
Audio Level: ████████░░ 80%
```

### 3. Export:
```
Click "SRT" → Downloads transcript.srt
Click "TXT" → Downloads transcript.txt
```

## 🔍 Troubleshooting

### "Invalid API key" (401):
```
❌ Check if API key is correct
❌ Ensure no extra spaces
❌ Verify key is active at soniox.com
```

### "Rate limit exceeded" (429):
```
⏳ Wait a few minutes
⏳ Check your plan limits
⏳ Reduce concurrent requests
```

### "WebSocket connection failed":
```
🔌 Check internet connection
🔌 Try different network
🔌 Check firewall settings
```

## 📝 API Key Security

### Best Practices:
- ✅ Store in environment variables
- ✅ Don't commit to Git
- ✅ Rotate keys periodically
- ✅ Monitor usage at soniox.com dashboard

### In Production:
```bash
# Server-side only
SONIOX_API_KEY=f37428a54bce90db638e6c742027e53b43d4bd9bc01145bb3e716d3a3ed7c3e6
```

```typescript
// Never expose in client code
const apiKey = process.env.SONIOX_API_KEY // ✅ Good
const apiKey = 'f374...' // ❌ Bad (exposed in bundle)
```

## 🎨 Integration Example

### With Your API Key:
```typescript
import { sonioxClient } from '@/lib/transcript/soniox-client'

sonioxClient.connect({
  apiKey: 'f37428a54bce90db638e6c742027e53b43d4bd9bc01145bb3e716d3a3ed7c3e6',
  sourceLanguage: 'en',
  targetLanguage: 'vi',
})

sonioxClient.onSegment = (segment) => {
  console.log('Transcript:', segment.originalText)
  console.log('Translation:', segment.translatedText)
}
```

## 📈 Monitor Usage

### Dashboard:
1. Login at https://soniox.com/dashboard
2. View usage statistics
3. Check billing
4. Manage API keys

### Alerts:
- Set usage alerts
- Monitor daily/hourly usage
- Track costs

## 🚀 Ready to Use!

Your API key is configured and ready to use!

### Next Steps:
1. ✅ Open http://localhost:3000/teacher/transcript
2. ✅ Configure settings with your API key
3. ✅ Click "Record"
4. ✅ Start speaking!

**Happy Transcribing! 🎉**
