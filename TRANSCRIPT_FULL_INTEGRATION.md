# Transcript Module - Full Feature Integration

## ✅ Features from transcript-video to integrate

### 1. Core Transcription
- ✅ Real-time speech-to-text (Soniox API)
- ✅ Translation (source → target language)
- ✅ Speaker diarization (Speaker 1, Speaker 2)
- ✅ Provisional text (in-progress recognition)
- ✅ Auto-cleanup of stale segments

### 2. Audio Sources
- ⭕ System Audio Capture (Tauri desktop app - needs backend)
- ✅ Microphone input (web compatible)
- ⭕ Both modes toggle

### 3. TTS (Text-to-Speech)
- ⭕ ElevenLabs TTS (premium quality)
- ⭕ Edge TTS (free, Microsoft)
- ⭕ Web Speech API (free, browser built-in)
- ⭕ TTS toggle button
- ⭕ Voice selection
- ⭕ Speed control

### 4. UI Features
- ✅ Overlay mode (always-on-top)
- ✅ Pin/Unpin window
- ✅ Compact mode (hide controls)
- ✅ Minimize
- ✅ Close with auto-save
- ✅ Opacity control
- ✅ Font size control
- ✅ Max lines control
- ✅ Show/hide original text

### 5. Transcript Management
- ✅ Copy to clipboard
- ⭕ Auto-save to file (markdown format)
- ⭕ Open transcript folder
- ✅ Export formats (TXT, SRT, MD)
- ✅ Segment count
- ✅ Recording duration

### 6. Settings
- ✅ API key management (Soniox)
- ✅ Source language selection
- ✅ Target language selection
- ✅ Translation mode (Soniox vs Local)
- ✅ Custom context (domain + terms)
- ✅ Display settings (opacity, font, max lines)

### 7. Keyboard Shortcuts
- ⭕ Cmd/Ctrl + Enter: Start/Stop
- ⭕ Cmd/Ctrl + ,: Open settings
- ⭕ Escape: Close settings
- ⭕ Cmd/Ctrl + 1: System Audio
- ⭕ Cmd/Ctrl + 2: Microphone
- ⭕ Cmd/Ctrl + T: Toggle TTS
- ⭕ Cmd/Ctrl + M: Minimize
- ⭕ Cmd/Ctrl + P: Toggle Pin
- ⭕ Cmd/Ctrl + D: Toggle Compact

### 8. Advanced Features
- ⭕ Local MLX mode (offline, Apple Silicon)
- ⭕ Model download management
- ⭕ Platform detection (hide Local on non-Apple-Silicon)
- ✅ Auto-reconnect on connection loss
- ✅ Session reset every 3 min (seamless)
- ✅ Context carryover (recent translations)

## 📋 Implementation Plan

### Phase 1: Core Web Features (DONE ✅)
- ✅ Soniox client integration
- ✅ Microphone recording
- ✅ Real-time transcript display
- ✅ Sidebar layout
- ✅ Export (TXT, SRT)
- ✅ Settings management

### Phase 2: Enhanced UI (IN PROGRESS 🚧)
- ⭕ Compact mode toggle
- ⭕ Pin/Unpin (browser limitation)
- ⭕ Opacity slider
- ⭕ Font size controls
- ⭕ Max lines control
- ⭕ Show/hide original text toggle

### Phase 3: TTS Integration (TODO)
- ⭕ Web Speech API (free, easy)
- ⭕ Edge TTS (free, better quality)
- ⭕ ElevenLabs (premium)
- ⭕ TTS settings UI
- ⭕ Voice selection
- ⭕ Speed control

### Phase 4: Advanced Features (TODO)
- ⭕ Auto-save transcript
- ⭕ Markdown export with metadata
- ⭕ Custom context settings
- ⭕ Platform detection
- ⭕ Local Whisper mode (optional)

## 🎯 Feature Parity Checklist

```
Core Transcription:
[✅] Real-time STT
[✅] Translation
[✅] Speaker diarization
[✅] Provisional text
[✅] Auto-cleanup

Audio Sources:
[✅] Microphone
[⭕] System Audio (Tauri only)
[⭕] Both modes

TTS:
[⭕] Web Speech API
[⭕] Edge TTS
[⭕] ElevenLabs
[⭕] Voice selection
[⭕] Speed control

UI Controls:
[✅] Start/Stop
[✅] Source selection
[✅] Settings panel
[⭕] Compact mode
[⭕] Pin window
[⭕] Opacity
[⭕] Font size
[⭕] Max lines

Transcript Management:
[✅] Copy
[✅] Export TXT/SRT
[⭕] Auto-save MD
[⭕] Open folder
[✅] Segment count

Settings:
[✅] API key
[✅] Languages
[✅] Translation mode
[⭕] Custom context
[⭕] Display settings

Keyboard Shortcuts:
[⭕] Cmd+Enter (Start/Stop)
[⭕] Cmd+, (Settings)
[⭕] Escape (Close)
[⭕] Cmd+1/2 (Source)
[⭕] Cmd+T (TTS)
[⭕] Cmd+P (Pin)
[⭕] Cmd+D (Compact)
```

## 📁 Files to Create/Update

### Core (DONE ✅):
```
✅ lib/transcript/soniox-client.ts
✅ components/transcript/audio-recorder.tsx
✅ app/(dashboard)/(routes)/teacher/transcript/page.tsx
```

### Enhanced UI (TODO):
```
⭕ components/transcript/transcript-sidebar.tsx
⭕ components/transcript/settings-panel.tsx
⭕ components/transcript/controls-bar.tsx
⭕ lib/transcript/settings-manager.ts
```

### TTS (TODO):
```
⭕ lib/transcript/tts-manager.ts
⭕ lib/transcript/web-speech-tts.ts
⭕ lib/transcript/edge-tts.ts
⭕ lib/transcript/elevenlabs-tts.ts
```

### Advanced (TODO):
```
⭕ lib/transcript/auto-saver.ts
⭕ lib/transcript/export-manager.ts
⭕ lib/transcript/platform-detector.ts
```

## 🚀 Quick Start - Use Existing Features

### 1. Basic Transcription:
```
1. Open /teacher/transcript
2. Settings → Paste Soniox API key
3. Select languages (EN → VI)
4. Click "Record"
5. Speak into microphone
6. See transcript in sidebar
7. Click "Copy" or "Export"
```

### 2. Settings:
```
- API Key: From soniox.com
- Source Language: What you speak
- Target Language: What you want to read
- Mode: Soniox (cloud) or Local (offline)
```

### 3. Export:
```
- Copy: Clipboard (plain text)
- Export TXT: Timestamped transcript
- Export SRT: Video subtitles
```

## 💡 Browser Limitations

### Cannot do in browser:
- ❌ System audio capture (needs Tauri/Electron)
- ❌ Always-on-top window (needs desktop app)
- ❌ Global keyboard shortcuts (limited to browser)
- ❌ File system access (limited to downloads)

### Can do in browser:
- ✅ Microphone input
- ✅ Real-time transcription
- ✅ Translation
- ✅ Speaker detection
- ✅ Export files
- ✅ LocalStorage settings
- ✅ Web Speech API
- ✅ Web Audio API

## 🎨 UI Mockup - Enhanced

```
┌─────────────────────────────────────────────────────────┐
│ [📖] Transcript & Phụ đề          [🔧] [─] [📌] [✕]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [▶] Record  [⏹] Stop  [🎤] Mic  [🔊] TTS         │ │
│  │ 🔴 Recording  00:05:32                           │ │
│  │ ████████████░░ Audio Level                        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Transcript (15 segments)            [📋] [📥]         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ [10:23:45] SP1                                    │ │
│  │ "Hello, welcome to today's lesson"                │ │
│  │ → "Xin chào, chào mừng đến với bài học hôm nay"   │ │
│  │                                                   │ │
│  │ [10:23:50] SP2                                    │ │
│  │ "Today we will learn about physics"               │ │
│  │ → "Hôm nay chúng ta sẽ học về vật lý"             │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  Settings [⚙️]:                                        │
│  - API Key: ●●●●●●●●                                   │
│  - Source: English → Target: Vietnamese                │
│  - Opacity: ████████░░ 85%                             │
│  - Font: 16px, Max lines: 5                            │
│  - TTS: [🔊] Edge TTS - Voice: HoaiMy (Speed: 1.2x)   │
└─────────────────────────────────────────────────────────┘
```

## 📊 Next Steps

### Immediate (This Session):
1. ✅ Keep current working implementation
2. ⭕ Add compact mode toggle
3. ⭕ Add opacity/font/max-lines controls
4. ⭕ Add show/hide original text
5. ⭕ Add Web Speech TTS (simple)

### Next Session:
6. ⭕ Add Edge TTS (better quality)
7. ⭕ Add auto-save functionality
8. ⭕ Add markdown export
9. ⭕ Add custom context settings
10. ⭕ Add keyboard shortcuts

### Future (Tauri App):
11. ⭕ System audio capture
12. ⭕ Always-on-top window
13. ⭕ Global shortcuts
14. ⭕ Local MLX mode
15. ⭕ File system integration

**Status: Core features working! Enhanced UI in progress.** 🎉
