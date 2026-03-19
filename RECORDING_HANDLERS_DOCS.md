# Ghi Âm & Transcribe Trực Tiếp - Event Handlers Documentation

## 📋 Tổng Quan

Hệ thống ghi âm và transcribe trực tiếp với khả năng:
- ✅ Ghi âm từ **microphone**
- ✅ Ghi âm từ **hệ thống** (screen audio)
- ✅ Ghi âm **cả hai cùng lúc** (dual mode)
- ✅ **Dịch thuật trực tiếp** (live transcription)
- ✅ **Hỗ trợ Soniox** (cloud) & **Local MLX** (offline)

## 🎯 Project Structure

```
lib/transcript/
├── recording-handlers.ts      ← Event handlers (Core logic)
├── soniox-client.ts          ← Cloud transcription
└── mlx-client.ts             ← Local transcription

app/(dashboard)/(routes)/teacher/transcript/
└── recording/
    └── page.tsx              ← Recording page component

components/ui/
└── segmented-control.tsx     ← UI component
```

## 🔧 RecordingHandlers Class

Main event handler class that manages all recording operations.

### Khởi tạo

```typescript
import { recordingHandlers } from '@/lib/transcript/recording-handlers'

// Setup callbacks
recordingHandlers.onSegment = (segment) => {
  console.log('New segment:', segment)
}

recordingHandlers.onProvisional = (text) => {
  console.log('Provisional:', text)
}

recordingHandlers.onError = (error) => {
  console.error('Error:', error)
}

recordingHandlers.onAudioLevel = (level) => {
  console.log('Audio level:', level)
}

// Initialize
const success = await recordingHandlers.init({
  apiKey: 'sk-...',
  sourceLanguage: 'auto',
  targetLanguage: 'vi',
  audioSource: 'microphone', // 'microphone' | 'system' | 'both'
  translationMode: 'soniox',  // 'soniox' | 'local'
  mlxEnabled: false,
})
```

## 📡 Recording Modes

### 1. Chỉ Microphone

```typescript
const success = await recordingHandlers.startMicrophoneRecording()

if (success) {
  recordingHandlers.startRecording()
}
```

**Khi nào dùng:**
- Ghi âm từ mic/headset
- Meeting, presentation
- Voice recording

**Cấu hình:**
```typescript
{
  audio: {
    sampleRate: 16000,        // Soniox yêu cầu 16kHz
    channelCount: 1,          // Mono
    echoCancellation: true,   // Loại echo
    noiseSuppression: true,   // Loại nhiễu
    autoGainControl: true,    // Điều chỉnh level
  }
}
```

### 2. Chỉ System Audio

```typescript
const success = await recordingHandlers.startSystemAudioRecording()

if (success) {
  recordingHandlers.startRecording()
}
```

**Khi nào dùng:**
- Ghi âm video
- Ghi âm speakers
- Desktop audio

**Ghi chú:**
- Hiện tại yêu cầu browser support (Chrome, Edge)
- Không khả dụng trên Firefox

### 3. Dual Mode (Microphone + System)

```typescript
const success = await recordingHandlers.startDualRecording()

if (success) {
  recordingHandlers.startRecording()
}
```

**Khi nào dùng:**
- Ghi âm video với voice-over
- Meeting recording
- Podcast with guest

**Cách hoạt động:**
- Microphone ghi vào left channel
- System audio ghi vào right channel
- Có thể mix hoặc phân tách sau

## 🎮 Recording Control Methods

### Start Recording

```typescript
const success = recordingHandlers.startRecording()

if (success) {
  // Recording started
  setIsRecording(true)
}
```

### Pause Recording

```typescript
const success = recordingHandlers.pauseRecording()

if (success) {
  // Recording paused
  setIsPaused(true)
}
```

### Resume Recording

```typescript
const success = recordingHandlers.resumeRecording()

if (success) {
  // Recording resumed
  setIsPaused(false)
}
```

### Stop Recording

```typescript
const success = recordingHandlers.stopRecording()

if (success) {
  // Recording stopped
  // Audio data is ready for export
  setIsRecording(false)
}
```

## 📊 State & Events

### Callbacks (Event Handlers)

```typescript
// Khi có đoạn dịch hoàn chỉnh
recordingHandlers.onSegment = (segment: TranscriptSegment) => {
  console.log({
    speaker: segment.speaker,           // "Speaker 1" hoặc null
    originalText: segment.originalText, // Văn bản gốc
    translatedText: segment.translatedText, // Văn bản đã dịch
    startTime: segment.startTime,       // Timestamp
    endTime: segment.endTime,
    isFinal: segment.isFinal,
  })
}

// Khi có dịch tạm thời (đang ghi âm)
recordingHandlers.onProvisional = (text: string) => {
  console.log('Provisional text:', text) // Real-time text
}

// Khi mức âm thanh thay đổi
recordingHandlers.onAudioLevel = (level: number) => {
  console.log('Level:', level) // 0-100
}

// Khi có lỗi
recordingHandlers.onError = (error: string) => {
  console.error('Error:', error)
}
```

### State Tracking

```typescript
// Check recording status
if (recordingHandlers.isRecording()) {
  console.log('Currently recording')
}

if (recordingHandlers.isPaused()) {
  console.log('Currently paused')
}

// Get recording time
const seconds = recordingHandlers.getRecordingTime()
const formatted = recordingHandlers.formatTime(seconds)
// Output: "1:23" or "1:23:45"
```

## 💾 Export & Data Management

### Export Audio File

```typescript
recordingHandlers.exportAudio()
// Downloads as: recording-{timestamp}.webm
```

### Get Recorded Blob

```typescript
const blob = recordingHandlers.getRecordedBlob()

if (blob) {
  // Upload to server
  const formData = new FormData()
  formData.append('audio', blob, 'recording.webm')
  await fetch('/api/upload-audio', {
    method: 'POST',
    body: formData,
  })
}
```

## 🔌 Integration with Transcription Services

### Soniox (Cloud)

```typescript
await recordingHandlers.init({
  apiKey: 'sk-xxx', // From console.soniox.com
  sourceLanguage: 'auto',
  targetLanguage: 'vi',
  translationMode: 'soniox',
})
```

**Advantages:**
- Hỗ trợ 70+ ngôn ngữ
- Độ chính xác cao (95%+)
- Dịch thuật tự động
- Real-time transcription

**Disadvantages:**
- Cần API key
- Chi phí: ~$0.12/giờ
- Cần internet

### Local MLX (Offline)

```typescript
await recordingHandlers.init({
  translationMode: 'local',
  mlxEnabled: true, // Phải setup MLX trước
})
```

**Advantages:**
- Hoàn toàn offline
- Miễn phí
- Bảo mật (không gửi lên cloud)
- Nhanh trên Apple Silicon

**Disadvantages:**
- Chỉ cho macOS Apple Silicon
- Setup phức tạp (~10-15 min)
- Độ chính xác ~92%

## 🎧 Audio Level Monitoring

```typescript
// Real-time audio level visualization
recordingHandlers.onAudioLevel = (level) => {
  // level: 0-100
  const visualBar = document.getElementById('audio-bar')
  visualBar.style.width = level + '%'
}
```

**Use Cases:**
- VU meter
- Audio input validation
- Recording level indicator

## ⚠️ Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Failed to access microphone" | Permission denied | Check browser permissions |
| "Screen capture permission denied" | User canceled | Try again, click Allow |
| "API key is required" | Missing Soniox API key | Get from console.soniox.com |
| "API balance exhausted" | Credits used up | Purchase new API credits |
| "Still in CONNECTING state" | WebSocket race condition | Fixed in soniox-client.ts |

### Error Handling Pattern

```typescript
recordingHandlers.onError = (error: string) => {
  if (error.includes('microphone')) {
    showPermissionDialog()
  } else if (error.includes('API key')) {
    promptForApiKey()
  } else if (error.includes('balance')) {
    showPurchaseDialog()
  } else {
    showGenericError(error)
  }
}
```

## 🧹 Cleanup & Destruction

```typescript
// When component unmounts
useEffect(() => {
  return () => {
    recordingHandlers.destroy() // Cleanup streams & timers
  }
}, [])
```

**Cleanup operations:**
- Stops all streams
- Closes AudioContext
- Clears intervals
- Disconnects from Soniox

## 📝 Complete Usage Example

```typescript
import { recordingHandlers } from '@/lib/transcript/recording-handlers'
import { useState, useEffect } from 'react'

export function RecordingComponent() {
  const [isRecording, setIsRecording] = useState(false)
  const [segments, setSegments] = useState([])

  useEffect(() => {
    // Setup handlers
    recordingHandlers.onSegment = (segment) => {
      setSegments(prev => [...prev, segment])
    }

    return () => recordingHandlers.destroy()
  }, [])

  const handleStart = async () => {
    const success = await recordingHandlers.init({
      apiKey: 'sk-xxx',
      sourceLanguage: 'auto',
      targetLanguage: 'vi',
      audioSource: 'microphone',
      translationMode: 'soniox',
    })

    if (success) {
      const recordingStarted = await recordingHandlers.startMicrophoneRecording()
      if (recordingStarted) {
        recordingHandlers.startRecording()
        setIsRecording(true)
      }
    }
  }

  const handleStop = () => {
    recordingHandlers.stopRecording()
    setIsRecording(false)
  }

  return (
    <div>
      {!isRecording ? (
        <button onClick={handleStart}>Start Recording</button>
      ) : (
        <button onClick={handleStop}>Stop Recording</button>
      )}

      <div>
        {segments.map((seg, i) => (
          <p key={i}>{seg.translatedText || seg.originalText}</p>
        ))}
      </div>
    </div>
  )
}
```

## 🚀 Page Routes

- **Recording Page**: `/teacher/transcript/recording`
  - Full UI with all controls
  - Settings panel
  - Real-time transcript display

- **Original Transcript Page**: `/teacher/transcript`
  - Audio upload
  - Library
  - Settings

## 📚 Related Files

- [Recording Page](../app/(dashboard)/(routes)/teacher/transcript/recording/page.tsx)
- [Event Handlers](../lib/transcript/recording-handlers.ts)
- [Soniox Client](../lib/transcript/soniox-client.ts)
- [MLX Client](../lib/transcript/mlx-client.ts)

## 🔗 API Reference

### RecordingHandlers Methods

```typescript
// Initialization
init(config: RecordingConfig): Promise<boolean>

// Recording modes
startMicrophoneRecording(): Promise<boolean>
startSystemAudioRecording(): Promise<boolean>
startDualRecording(): Promise<boolean>

// Recording control
startRecording(): boolean
pauseRecording(): boolean
resumeRecording(): boolean
stopRecording(): boolean

// State checking
isRecording(): boolean
isPaused(): boolean
getRecordingTime(): number
formatTime(seconds: number): string

// Data management
getRecordedBlob(): Blob | null
exportAudio(): void

// Cleanup
destroy(): void
```

## ✅ Checklist for Integration

- [ ] Import RecordingHandlers
- [ ] Setup callbacks (onSegment, onProvisional, onError)
- [ ] Initialize with config
- [ ] Start recording (choose mode)
- [ ] Handle pause/resume/stop
- [ ] Display real-time transcript
- [ ] Handle errors
- [ ] Cleanup on unmount
- [ ] Test with both Soniox and Local MLX

---

**Last Updated:** March 18, 2026
**Status:** ✅ Production Ready
