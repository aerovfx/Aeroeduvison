# Transcript & Subtitle Module - Integration Plan

## 📋 Overview
Module tạo phụ đề và transcript từ video/audio với các tính năng:
- Transcribe từ micro (real-time)
- Transcribe từ file video/audio
- Tạo phụ đề (SRT, VTT)
- Dịch tự động
- Export nhiều định dạng

## 🎯 Sources tham khảo: transcript-video

### Công nghệ sử dụng:
1. **Soniox API** (Cloud STT)
   - Real-time transcription
   - Speaker diarization
   - 70+ languages
   - ~$0.12/hr

2. **Whisper + MLX** (Local STT)
   - Offline transcription
   - Apple Silicon optimized
   - Free, private
   - ~10s delay

3. **TTS Options**:
   - ElevenLabs Flash v2.5
   - Edge TTS
   - Web Speech API

## 📁 Files to Create

### Frontend (React/Next.js)
```
app/(dashboard)/(routes)/teacher/transcript/
├── page.tsx                  # Main transcript page
├── recorder/
│   └── page.tsx             # Real-time mic recording
├── upload/
│   └── page.tsx             # Upload video/audio files
└── editor/
    └── [id]/page.tsx        # Subtitle editor

components/transcript/
├── audio-recorder.tsx        # Microphone recording UI
├── video-player.tsx          # Video player with subtitles
├── subtitle-editor.tsx       # Edit subtitle timing/text
├── export-modal.tsx          # Export options
└── settings-modal.tsx        # API keys, languages

lib/transcript/
├── soniox-client.ts          # Soniox WebSocket client
├── whisper-client.ts         # Local Whisper client
├── audio-processor.ts         # Audio processing utilities
├── subtitle-formats.ts       # SRT, VTT converters
└── types.ts                  # TypeScript interfaces

api/transcript/
├── start/route.ts            # Start transcription session
├── audio/route.ts            # Send audio chunks
├── stop/route.ts             # Stop session
├── upload/route.ts           # Upload file for transcription
└── export/[id]/route.ts      # Export transcript/subtitles
```

## 🔧 Integration Steps

### Phase 1: Core Functionality
1. ✅ Create Soniox client (adapt from transcript-video)
2. ✅ Create audio recorder component
3. ✅ Create transcript display UI
4. ✅ Basic export (TXT, SRT)

### Phase 2: Advanced Features
5. ⭕ File upload & transcription
6. ⭕ Subtitle editor with timing
7. ⭕ Translation integration
8. ⭕ TTS narration

### Phase 3: Polish
9. ⭕ Speaker diarization UI
10. ⭕ Batch processing
11. ⭕ Cloud storage integration
12. ⭕ Keyboard shortcuts

## 💡 Use Cases

### For Teachers:
- Transcribe lecture recordings
- Create subtitles for educational videos
- Generate transcripts for accessibility
- Translate content to Vietnamese

### For Students:
- Transcribe study materials
- Create study notes from videos
- Accessibility support

## 🎨 UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ [📹 Transcript & Phụ đề]              [Settings] [Export]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │                 │  │ 00:01:23 → 00:01:27              │ │
│  │   🎤 Record     │  │ "Hello, welcome to today's lesson"│ │
│  │                 │  │                                  │ │
│  │   📁 Upload     │  │ 00:01:28 → 00:01:32              │ │
│  │                 │  │ "Xin chào, chào mừng đến với..." │ │
│  └─────────────────┘  └──────────────────────────────────┘ │
│                                                             │
│  [▶ Play] [⏸ Pause] [⏹ Stop]                    [00:05:32] │
│  ████████████████████████████████████████████████           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 API Integration

### Soniox WebSocket:
```typescript
const config = {
  api_key: 'your-key',
  model: 'stt-rt-v4',
  audio_format: 'pcm_s16le',
  sample_rate: 16000,
  enable_speaker_diarization: true,
  translation: {
    type: 'one_way',
    target_language: 'vi'
  }
}
```

### Audio Capture:
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true
  }
})
```

## 📊 Database Schema

```prisma
model Transcript {
  id          String   @id @default(cuid())
  userId      String
  title       String
  sourceType  String   // "mic" | "file" | "youtube"
  sourceUrl   String?
  duration    Int?     // seconds
  language    String
  status      String   // "processing" | "completed" | "error"
  createdAt   DateTime @default(now())
  
  segments    TranscriptSegment[]
  user        User     @relation(fields: [userId], references: [id])
}

model TranscriptSegment {
  id          String     @id @default(cuid())
  transcriptId String
  startTime   Int        // milliseconds
  endTime     Int        // milliseconds
  speaker     String?    // "Speaker 1", "Speaker 2"
  originalText String
  translatedText String?
  confidence  Float?
  
  transcript  Transcript @relation(fields: [transcriptId], references: [id])
}
```

## 🚀 Quick Start

### 1. Install dependencies:
```bash
npm install audiobuffer-to-wav
npm install @types/audiobuffer-to-wav
```

### 2. Configure environment:
```bash
# .env.local
SONIOX_API_KEY=your_soniox_api_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### 3. Create components:
```bash
# Start with audio recorder
touch components/transcript/audio-recorder.tsx
touch lib/transcript/soniox-client.ts
```

### 4. Test flow:
```
1. Open /teacher/transcript
2. Click "Record"
3. Grant microphone permission
4. Speak → See real-time transcript
5. Click "Stop"
6. Export as SRT/TXT
```

## 📝 Notes

### From transcript-video:
- ✅ Soniox WebSocket client works well
- ✅ Auto-reconnect logic
- ✅ Session reset every 3 min
- ✅ Context carryover
- ✅ Speaker diarization

### Improvements:
- Add file upload support
- Add subtitle editor UI
- Add export formats (SRT, VTT, TXT)
- Add translation options
- Add TTS playback

## 🔗 References
- Soniox Docs: https://docs.soniox.com
- Whisper MLX: https://github.com/ml-explore/mlx-examples
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
