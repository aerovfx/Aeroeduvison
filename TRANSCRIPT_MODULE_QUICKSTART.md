# Transcript & Subtitle Module - Quick Start

## ✅ Đã hoàn thành

### Tính năng chính:
- ✅ **Ghi âm trực tiếp** từ micro
- ✅ **Transcribe real-time** với Soniox API
- ✅ **Dịch tự động** sang tiếng Việt
- ✅ **Xuất file** TXT, SRT
- ✅ **Speaker diarization** (nhận diện người nói)

## 🚀 Quick Start

### 1. Cài đặt API Key
```
1. Vào /teacher/transcript
2. Click "Cài đặt"
3. Nhập Soniox API Key từ https://soniox.com
4. Chọn ngôn ngữ nguồn (ví dụ: English)
5. Chọn ngôn ngữ đích (ví dụ: Tiếng Việt)
6. Click "Lưu cài đặt"
```

### 2. Bắt đầu ghi âm
```
1. Click "Record"
2. Grant microphone permission
3. Nói vào micro
4. Transcript hiện ra real-time
5. Click "Stop" khi xong
```

### 3. Export
```
1. Click "TXT" hoặc "SRT"
2. File được tải về
3. Mở với text editor hoặc video player
```

## 📁 Files Created

### Core Components:
```
lib/transcript/
└── soniox-client.ts          # Soniox WebSocket client

components/transcript/
└── audio-recorder.tsx        # Recording UI component

app/(dashboard)/(routes)/teacher/transcript/
└── page.tsx                  # Main transcript page
```

### Reference Project:
```
transcript-video/             # Original project (tham khảo)
├── src/js/soniox.js          # Original Soniox client
├── src/js/audio-player.js
└── src/js/ui.js
```

## 🔧 Công nghệ

### Backend:
- **Soniox API** - Cloud STT (Speech-to-Text)
  - Real-time transcription
  - 70+ languages
  - Speaker diarization
  - ~$0.12/giờ

### Frontend:
- **Web Audio API** - Audio capture & processing
- **MediaRecorder API** - Record microphone
- **WebSocket** - Real-time communication
- **React** - UI components

## 💡 Use Cases

### Giáo viên:
- 📝 Transcribe bài giảng
- 📝 Tạo phụ đề cho video
- 📝 Export transcript cho học sinh
- 📝 Dịch tài liệu nước ngoài

### Học sinh:
- 📝 Ghi chú từ bài giảng
- 📝 Transcribe study materials
- 📝 Accessibility support

## 🎯 API Configuration

### Soniox API:
```typescript
{
  api_key: "your-api-key",
  model: "stt-rt-v4",
  audio_format: "pcm_s16le",
  sample_rate: 16000,
  enable_speaker_diarization: true,
  translation: {
    type: "one_way",
    target_language: "vi"
  }
}
```

### Audio Settings:
```typescript
{
  sampleRate: 16000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true
}
```

## 📊 Export Formats

### TXT Format:
```
[10:23:45] Speaker 1: Hello, welcome to today's lesson
→ Xin chào, chào mừng đến với bài học hôm nay

[10:23:50] Speaker 2: Thank you for having me
→ Cảm ơn bạn đã mời tôi
```

### SRT Format:
```
1
00:00:00,000 --> 00:00:05,000
Hello, welcome to today's lesson

2
00:00:05,000 --> 00:00:10,000
Xin chào, chào mừng đến với bài học hôm nay
```

## 🔌 Permissions

### Microphone Access:
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true
  }
})
```

### Browser Support:
- ✅ Chrome/Edge (tốt nhất)
- ✅ Firefox
- ✅ Safari
- ⚠️ Cần HTTPS hoặc localhost

## 🎨 UI Features

### Audio Level Meter:
- 🟢 Green: Normal level
- 🟡 Yellow: Medium level
- 🔴 Red: Too loud

### Status Badges:
- 🔴 Recording
- 🟡 Connecting
- ⚪ Disconnected
- ❌ Error

### Real-time Display:
- Original text (English)
- Translated text (Vietnamese)
- Speaker labels
- Timestamps

## 🐛 Troubleshooting

### "API key is required":
```
→ Vào Settings, nhập API key từ soniox.com
```

### "Failed to access microphone":
```
→ Grant microphone permission
→ Check browser settings
→ Use HTTPS or localhost
```

### "Connection error":
```
→ Check internet connection
→ Verify API key is valid
→ Check Soniox service status
```

## 📈 Next Steps

### Phase 2 (Sắp tới):
- [ ] Upload file audio/video
- [ ] Subtitle editor với timing
- [ ] Batch processing
- [ ] YouTube integration
- [ ] Cloud storage

### Phase 3:
- [ ] Local Whisper mode (offline)
- [ ] TTS narration
- [ ] Advanced editing
- [ ] Collaboration features

## 🔗 Resources

### Documentation:
- Soniox Docs: https://docs.soniox.com
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MediaRecorder API: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

### Get API Keys:
- Soniox: https://soniox.com
- ElevenLabs (TTS): https://elevenlabs.io

## 💰 Pricing

### Soniox Cloud:
- ~$0.12/giờ audio
- ~$10/tháng cho 100 giờ
- Free tier available

### Local (Whisper):
- Free
- Requires Apple Silicon (M1/M2)
- Offline processing

## 🎯 Test Flow

```
1. http://localhost:3000/teacher/transcript
2. Click "Cài đặt"
3. Nhập API key
4. Chọn English → Vietnamese
5. Click "Record"
6. Speak: "Hello, this is a test"
7. See: "Hello, this is a test"
   → "Xin chào, đây là một bài kiểm tra"
8. Click "Stop"
9. Click "SRT"
10. Open file với VLC
```
