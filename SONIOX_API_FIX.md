# 🔧 Soniox API Error - Fix & Alternatives

## ❌ Error Message:
```
Soniox error: Organization balance exhausted. 
Please either add funds manually or enable autopay.
WebSocket connection failed.
```

## ✅ Solutions

### Option 1: Get New Soniox API Key (Recommended)

#### Steps:
1. **Go to Soniox Console**: https://console.soniox.com
2. **Sign up/Login** with your account
3. **Check Balance**: Dashboard → Billing
4. **Add Funds** or **Enable Autopay**
5. **Create New API Key**: API Keys → Create New
6. **Copy the new key**

#### Free Tier:
- **Free Trial**: $5 credit (about 40 hours)
- **Pay-as-you-go**: ~$0.12/hour
- **No credit card required** for trial

### Option 2: Use Alternative Free APIs

#### 1. **Web Speech API** (Free, Browser Built-in)
```javascript
// Browser native speech recognition
const recognition = new webkitSpeechRecognition() || SpeechRecognition()
recognition.lang = 'en-US'
recognition.start()
```
**Pros**: 
- ✅ Completely free
- ✅ No API key needed
- ✅ Works offline (some browsers)

**Cons**:
- ❌ Limited accuracy
- ❌ No translation built-in
- ❌ Browser support varies

#### 2. **Whisper API** (OpenAI, Paid but cheap)
```javascript
// OpenAI Whisper
const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  },
  body: formData
})
```
**Pros**:
- ✅ High accuracy (~95%)
- ✅ Cheap (~$0.006/minute)
- ✅ Supports 60+ languages

**Cons**:
- ❌ Requires OpenAI account
- ❌ Not real-time (batch processing)

#### 3. **Google Cloud Speech-to-Text** (Paid)
```javascript
// Google Cloud STT
const client = new speech.SpeechClient({apiKey: GOOGLE_API_KEY})
```
**Pros**:
- ✅ Excellent accuracy
- ✅ Real-time streaming
- ✅ 60+ languages

**Cons**:
- ❌ Requires credit card
- ❌ $0.006/15 seconds after free tier

#### 4. **Azure Speech Services** (Paid)
**Pros**:
- ✅ High accuracy
- ✅ Real-time
- ✅ Translation included

**Cons**:
- ❌ Requires Azure account
- ❌ $0.001/second after free tier

### Option 3: Local Transcription (Advanced)

#### Whisper.cpp (Free, Offline)
```bash
# Install whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
./models/download-ggml-model.sh base
```

**Pros**:
- ✅ 100% free
- ✅ Works offline
- ✅ No API limits

**Cons**:
- ❌ Requires installation
- ❌ Slower than cloud
- ❌ Needs technical setup

## 🚀 Quick Fix for Aeroeduvison

### Update `.env.local`:
```bash
# Replace exhausted key with new one
NEXT_PUBLIC_SONIOX_API_KEY=new_key_from_soniox_console
```

### Or use multiple keys (rotation):
```typescript
// lib/transcript/soniox-client.ts
const API_KEYS = [
  'key1', // Primary
  'key2', // Backup 1
  'key3', // Backup 2
]

// Rotate on balance exhausted error
const currentKeyIndex = 0
const apiKey = API_KEYS[currentKeyIndex]
```

## 📊 Cost Comparison

| Service | Free Tier | Paid Rate | Quality |
|---------|-----------|-----------|---------|
| **Soniox** | $5 trial | ~$0.12/hr | ⭐⭐⭐⭐⭐ |
| **Whisper API** | None | ~$0.006/min | ⭐⭐⭐⭐⭐ |
| **Google STT** | 60 min/mo | ~$0.006/15s | ⭐⭐⭐⭐⭐ |
| **Azure Speech** | 5 hrs/mo | ~$0.001/s | ⭐⭐⭐⭐⭐ |
| **Web Speech** | Unlimited | Free | ⭐⭐⭐ |
| **Whisper.cpp** | Unlimited | Free | ⭐⭐⭐⭐ |

## 🎯 Recommended Action

### For Testing/Development:
1. ✅ **Use Web Speech API** (free, no setup)
2. ✅ **Get new Soniox trial key** (40 hours free)

### For Production:
1. ✅ **Soniox** (best for real-time)
2. ✅ **Whisper API** (best accuracy/price)
3. ✅ **Google/Azure** (enterprise features)

## 🔧 Code Fix - Add Error Handling

### Update `soniox-client.ts`:
```typescript
private handleApiError(data: any) {
  const code = data.error_code || 0;
  const message = data.error_message || 'Unknown API error';

  // Balance exhausted
  if (code === 402 || message.includes('balance')) {
    this.setStatus('error');
    this.onError?.(
      'API key balance exhausted. Please get a new key from soniox.com'
    );
    return;
  }

  // ... rest of error handling
}
```

### Add UI warning:
```typescript
// In settings panel
{balanceExhausted && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
    <p className="text-red-800 font-medium">API Key Balance Exhausted</p>
    <p className="text-sm text-red-700 mt-1">
      Please get a new API key from{' '}
      <a href="https://console.soniox.com" target="_blank" className="underline">
        soniox.com
      </a>
    </p>
  </div>
)}
```

## 📝 Getting New Soniox Key - Step by Step

### 1. Visit Soniox Console:
```
https://console.soniox.com
```

### 2. Sign Up / Login:
- Use email or Google account
- No credit card required for trial

### 3. Navigate to API Keys:
```
Dashboard → API Keys → Create New Key
```

### 4. Copy New Key:
```
sk_live_xxxxxxxxxxxxxxxxxxxxx
```

### 5. Update in App:
```
1. Open /teacher/transcript
2. Click "Cài đặt"
3. Paste new API key
4. Click "Lưu cài đặt"
5. Test recording
```

## 🎉 Alternative: Use Mock Mode for Testing

### For development without API:
```typescript
// Mock transcription for testing
const mockSegments = [
  {
    original: "This is a test transcription",
    translated: "Đây là bản ghi âm kiểm tra",
    speaker: "Speaker 1",
  }
]
```

## 💡 Best Practice

### Use multiple providers:
```typescript
const TRANSCRIPTION_PROVIDERS = {
  primary: 'soniox',    // Real-time, best quality
  backup: 'whisper',    // Batch, high accuracy
  fallback: 'webspeech' // Free, browser native
}
```

**Get your new Soniox API key now at: https://console.soniox.com** 🎯
