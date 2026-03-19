# Video Transcript Module - Integration Plan

## 🎯 Overview

Tích hợp tính năng transcript từ project `transcript-video` vào AeroEdu với 2 module:

1. **Student Module** - Ghi lại lời giảng và tóm tắt
2. **Teacher Module** - Ghi chép buổi họp

Tất cả lưu vào sidebar với tên "Video Transcript"

---

## 📁 File Structure

```
app/
├── (dashboard)/(routes)/
│   ├── student/
│   │   └── video-transcript/
│   │       ├── page.tsx          # Student transcript page
│   │       └── history/
│   │           └── page.tsx      # Student transcript history
│   └── teacher/
│       └── meeting-notes/
│           ├── page.tsx          # Teacher meeting notes page
│           └── history/
│               └── page.tsx      # Teacher meeting history
├── api/
│   ├── transcript/
│   │   ├── route.ts              # Main transcript API
│   │   ├── save/
│   │   │   └── route.ts          # Save transcript
│   │   └── summarize/
│   │       └── route.ts          # AI summarize
│   └── sidebar/
│       └── route.ts              # Sidebar items API
components/
├── transcript/
│   ├── TranscriptRecorder.tsx    # Recording component
│   ├── TranscriptViewer.tsx      # View transcript
│   ├── TranscriptSummary.tsx     # AI summary
│   └── TranscriptSidebar.tsx     # Sidebar component
lib/
└── transcript-utils.ts            # Utility functions
```

---

## 🔧 Implementation Steps

### Phase 1: Core API (2 hours)

#### 1.1 Create Transcript API
**File:** `app/api/transcript/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { audioData, language = 'vi' } = await request.json();

  // Call Soniox API or local Whisper
  const transcript = await transcribeAudio(audioData, language);

  return NextResponse.json({
    success: true,
    transcript,
    timestamp: new Date().toISOString(),
  });
}
```

#### 1.2 Create Save API
**File:** `app/api/transcript/save/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { transcript, summary, type, title } = await request.json();

  // Save to database
  const saved = await db.transcript.create({
    data: {
      userId: session.user.id,
      type, // 'lecture' | 'meeting'
      title,
      transcript,
      summary,
      duration: request.duration,
    },
  });

  return NextResponse.json({ success: true, data: saved });
}
```

#### 1.3 Create Summarize API
**File:** `app/api/transcript/summarize/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { transcript } = await request.json();

  // Call LLM to summarize
  const summary = await summarizeWithAI(transcript);

  return NextResponse.json({
    success: true,
    summary,
    keyPoints: extractKeyPoints(summary),
  });
}
```

---

### Phase 2: Student Module (3 hours)

#### 2.1 Student Transcript Page
**File:** `app/(dashboard)/(routes)/student/video-transcript/page.tsx`

```tsx
"use client"

import { useState } from 'react';
import { TranscriptRecorder } from '@/components/transcript/TranscriptRecorder';
import { TranscriptViewer } from '@/components/transcript/TranscriptViewer';
import { TranscriptSummary } from '@/components/transcript/TranscriptSummary';

export default function StudentVideoTranscript() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ghi Âm Bài Giảng</h1>
                <p className="text-sm text-gray-600">Ghi lại và tóm tắt lời giảng</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Recorder */}
          <div className="lg:col-span-1">
            <TranscriptRecorder
              isRecording={isRecording}
              onStart={() => setIsRecording(true)}
              onStop={(transcript) => {
                setTranscript(transcript);
                setIsRecording(false);
              }}
            />
          </div>

          {/* Right: Transcript & Summary */}
          <div className="lg:col-span-2 space-y-6">
            <TranscriptViewer transcript={transcript} />
            <TranscriptSummary 
              transcript={transcript}
              summary={summary}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2.2 Transcript Recorder Component
**File:** `components/transcript/TranscriptRecorder.tsx`

```tsx
"use client"

import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface Props {
  isRecording: boolean;
  onStart: () => void;
  onStop: (transcript: string) => void;
}

export function TranscriptRecorder({ isRecording, onStart, onStop }: Props) {
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioData = await blobToBase64(blob);
        
        // Send to transcript API
        const response = await fetch('/api/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData, language: 'vi' }),
        });
        
        const data = await response.json();
        onStop(data.transcript);
      };

      mediaRecorder.start();
      onStart();
      
      // Update duration
      setInterval(() => setDuration(d => d + 1), 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setDuration(0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {isRecording ? 'Đang ghi âm...' : 'Bắt đầu ghi âm'}
        </h3>
        <div className="text-3xl font-bold text-blue-600">
          {formatDuration(duration)}
        </div>
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
          isRecording
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRecording ? (
          <>
            <Square className="w-5 h-5" />
            Dừng ghi
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            Bắt đầu
          </>
        )}
      </button>
    </div>
  );
}
```

---

### Phase 3: Teacher Module (3 hours)

#### 3.1 Teacher Meeting Notes Page
**File:** `app/(dashboard)/(routes)/teacher/meeting-notes/page.tsx`

```tsx
"use client"

import { useState } from 'react';
import { TranscriptRecorder } from '@/components/transcript/TranscriptRecorder';
import { TranscriptViewer } from '@/components/transcript/TranscriptViewer';
import { TranscriptSummary } from '@/components/transcript/TranscriptSummary';

export default function TeacherMeetingNotes() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ghi Chú Cuộc Họp</h1>
                <p className="text-sm text-gray-600">Ghi lại và tóm tắt nội dung cuộc họp</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Same layout as student module */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Same structure as student page */}
      </div>
    </div>
  );
}
```

---

### Phase 4: Sidebar Integration (2 hours)

#### 4.1 Transcript Sidebar Component
**File:** `components/transcript/TranscriptSidebar.tsx`

```tsx
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, ChevronRight, Mic } from 'lucide-react';

interface TranscriptItem {
  id: string;
  title: string;
  type: 'lecture' | 'meeting';
  createdAt: string;
  duration: number;
}

export function TranscriptSidebar() {
  const router = useRouter();
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    const response = await fetch('/api/sidebar');
    const data = await response.json();
    setTranscripts(data.transcripts);
  };

  return (
    <div className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 ${
      isOpen ? 'w-80' : 'w-0'
    } overflow-hidden z-50`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-gray-900">Video Transcript</h3>
          </div>
          <button onClick={() => setIsOpen(false)}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Transcript List */}
      <div className="p-4 space-y-2 overflow-y-auto h-[calc(100%-60px)]">
        {transcripts.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => router.push(`/transcript/${item.id}`)}
          >
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {item.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.type === 'lecture'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {item.type === 'lecture' ? 'Bài giảng' : 'Cuộc họp'}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(item.duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4.2 Add Sidebar to Layout
**File:** `app/(dashboard)/layout.tsx`

```tsx
import { TranscriptSidebar } from '@/components/transcript/TranscriptSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TranscriptSidebar />
    </>
  );
}
```

---

## 📊 Database Schema

```prisma
model Transcript {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // 'lecture' | 'meeting'
  title     String
  transcript String  @db.Text
  summary   String?  @db.Text
  duration  Int      // seconds
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🎯 Features Checklist

### Student Module
- [ ] Record audio from microphone
- [ ] Real-time transcription
- [ ] AI summarization
- [ ] Save to history
- [ ] View past transcripts
- [ ] Export to PDF/Markdown

### Teacher Module
- [ ] Record meeting audio
- [ ] Multi-speaker detection
- [ ] Meeting notes extraction
- [ ] Action items detection
- [ ] Save to history
- [ ] Share with colleagues

### Sidebar
- [ ] Show recent transcripts
- [ ] Quick access to history
- [ ] Filter by type (lecture/meeting)
- [ ] Search functionality
- [ ] Slide in/out animation

---

## 🚀 Integration with Existing Code

### Use Existing transcript-video Code

1. **Copy audio capture logic** from `transcript-video/src/js/`
2. **Integrate Soniox API** calls from existing code
3. **Reuse UI components** for overlay/recording

### Add to AeroEdu

1. **Install dependencies**:
```bash
npm install @tauri-apps/api
```

2. **Copy utility functions**:
```bash
cp transcript-video/src/js/audio-capture.js lib/audio-capture.ts
cp transcript-video/src/js/soniox-client.js lib/soniox-client.ts
```

3. **Adapt to Next.js** structure

---

## 📝 Next Steps

1. ✅ Create API routes
2. ✅ Build student module page
3. ✅ Build teacher module page
4. ✅ Create sidebar component
5. ✅ Integrate with transcript-video code
6. ✅ Test recording functionality
7. ✅ Deploy and test

---

**Estimated Time:** 8-10 hours  
**Priority:** HIGH  
**Status:** 📝 Ready to implement
