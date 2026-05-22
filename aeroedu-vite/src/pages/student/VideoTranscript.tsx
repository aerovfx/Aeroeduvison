import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, FileText, Clock, Sparkles, Loader2, Trash2, Download, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { tokenStore } from '@/services/api'

// Theme-aware palette via CSS vars (auto light/dark switching)
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  purple:      'var(--td-purple)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  blue:        'var(--td-blue)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
} as const

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function SoundWave({ active }: { active: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 28 }}>
      {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: D.purple,
            height: active ? undefined : 6,
            animation: active ? `wave${i} ${0.6 + i * 0.1}s ease-in-out infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes wave0{from{height:6px}to{height:22px}}
        @keyframes wave1{from{height:10px}to{height:26px}}
        @keyframes wave2{from{height:6px}to{height:18px}}
        @keyframes wave3{from{height:14px}to{height:28px}}
        @keyframes wave4{from{height:8px}to{height:20px}}
        @keyframes wave5{from{height:12px}to{height:26px}}
        @keyframes wave6{from{height:6px}to{height:16px}}
      `}</style>
    </div>
  )
}

export default function VideoTranscript() {
  const navigate = useNavigate()
  
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [summarizing, setSummarizing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('transcript')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recognitionRef = useRef<any>(null)

  // Web Speech API setup
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Trình duyệt không hỗ trợ nhận dạng giọng nói. Vui lòng dùng Chrome.')
      return false
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t + ' '
        else interim += t
      }
      setTranscript(prev => prev + final)
    }
    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error)
      }
    }
    recognitionRef.current = recognition
    recognition.start()
    return true
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorder.start(1000)

      if (!startSpeechRecognition()) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      setRecordingState('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
      toast.success('Bắt đầu ghi âm!')
    } catch {
      toast.error('Không thể truy cập microphone. Kiểm tra quyền truy cập.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      recognitionRef.current?.stop()
    }
    clearInterval(timerRef.current!)
    setRecordingState('paused')
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      startSpeechRecognition()
    }
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000)
    setRecordingState('recording')
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop())
    recognitionRef.current?.stop()
    clearInterval(timerRef.current!)
    setRecordingState('stopped')
    toast.success('Đã dừng ghi âm!')
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current!)
      recognitionRef.current?.stop()
    }
  }, [])

  const generateSummary = async () => {
    if (!transcript) { toast.error('Chưa có nội dung để tóm tắt'); return }
    setSummarizing(true)
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json', ...(tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}) }
      const res = await fetch('/api/transcript/summarize', {
        method: 'POST', headers,
        body: JSON.stringify({ transcript }),
      })
      const data = await res.json()
      setSummary(data.summary || data.content || 'Không thể tóm tắt.')
      setActiveTab('summary')
    } catch {
      // Fallback: simple summary
      const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20)
      setSummary(sentences.slice(0, 5).join('. ') + '...')
      setActiveTab('summary')
    } finally {
      setSummarizing(false)
    }
  }

  const saveTranscript = async () => {
    if (!transcript) { toast.error('Chưa có nội dung để lưu'); return }
    setSaving(true)
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json', ...(tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}) }
      const res = await fetch('/api/transcript/save', {
        method: 'POST', headers,
        body: JSON.stringify({
          transcript, summary,
          type: 'lecture',
          title: `Bài giảng ${new Date().toLocaleDateString('vi-VN')}`,
          duration: elapsed,
        }),
      })
      const data = await res.json()
      if (data.success || res.ok) {
        toast.success('Đã lưu vào lịch sử!')
        setTranscript('')
        setSummary('')
        setElapsed(0)
        setRecordingState('idle')
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Không thể lưu. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const downloadTranscript = () => {
    const content = `BÀI GIẢNG - ${new Date().toLocaleDateString('vi-VN')}\n\n--- TRANSCRIPT ---\n${transcript}${summary ? `\n\n--- TÓM TẮT ---\n${summary}` : ''}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    if (!transcript) return
    if (confirm('Xóa toàn bộ nội dung?')) {
      setTranscript('')
      setSummary('')
      setRecordingState('idle')
      setElapsed(0)
    }
  }

  return (
    <div style={{ minHeight: '100%', background: D.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Top bar */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(124,58,237,0.3)' }}>
              <Mic style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: D.text }}>Ghi Âm Bài Giảng</h1>
              <p style={{ margin: 0, fontSize: 12, color: D.muted }}>Ghi lại và tóm tắt lời giảng với AI</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/student/video-transcript/history')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: D.card2, border: `1px solid ${D.border}`, color: D.muted, fontSize: 13, cursor: 'pointer' }}
          >
            <History style={{ width: 14, height: 14 }} /> Lịch sử
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left: Recorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Record control */}
          <div style={{ background: D.card, border: `1px solid ${recordingState === 'recording' ? 'rgba(239,68,68,0.3)' : D.border}`, borderRadius: 20, padding: 32, textAlign: 'center', boxShadow: recordingState === 'recording' ? '0 0 20px rgba(239,68,68,0.06)' : 'none' }}>
            {/* Timer */}
            <div style={{ fontSize: 40, fontWeight: 800, color: recordingState === 'recording' ? '#ef4444' : D.muted, fontFamily: 'monospace', marginBottom: 16, letterSpacing: 4 }}>
              {formatTime(elapsed)}
            </div>

            {/* Sound wave */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, height: 32, alignItems: 'center' }}>
              {recordingState === 'recording' ? (
                <SoundWave active={true} />
              ) : recordingState === 'paused' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#f59e0b' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                  Đã tạm dừng
                </div>
              ) : (
                <SoundWave active={false} />
              )}
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {recordingState === 'idle' && (
                <button
                  onClick={startRecording}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(239,68,68,0.35)', transition: 'all 0.2s' }}
                >
                  <Mic style={{ width: 30, height: 30, color: '#fff' }} />
                </button>
              )}
              {recordingState === 'recording' && (
                <>
                  <button
                    onClick={pauseRecording}
                    style={{ width: 52, height: 52, borderRadius: '50%', background: '#f59e0b', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}
                  >
                    ⏸
                  </button>
                  <button
                    onClick={stopRecording}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}
                  >
                    <MicOff style={{ width: 28, height: 28, color: '#fff' }} />
                  </button>
                </>
              )}
              {recordingState === 'paused' && (
                <>
                  <button
                    onClick={resumeRecording}
                    style={{ width: 52, height: 52, borderRadius: '50%', background: '#10b981', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}
                  >
                    ▶
                  </button>
                  <button
                    onClick={stopRecording}
                    style={{ width: 52, height: 52, borderRadius: '50%', background: D.card2, border: `1px solid ${D.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}
                  >
                    ⏹
                  </button>
                </>
              )}
              {recordingState === 'stopped' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 14, color: '#10b981', fontWeight: 600 }}>✅ Đã dừng — {formatTime(elapsed)}</div>
                  <button
                    onClick={() => { setRecordingState('idle'); setElapsed(0); setTranscript(''); setSummary('') }}
                    style={{ padding: '8px 16px', borderRadius: 10, background: D.card2, border: `1px solid ${D.border}`, color: D.muted, fontSize: 13, cursor: 'pointer' }}
                  >
                    Ghi âm mới
                  </button>
                </div>
              )}
            </div>

            {recordingState === 'idle' && (
              <p style={{ margin: '16px 0 0', fontSize: 12, color: D.muted }}>Nhấn để bắt đầu ghi âm bài giảng</p>
            )}
          </div>

          {/* Actions */}
          {transcript && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={generateSummary}
                disabled={summarizing}
                style={{ flex: 1, padding: '11px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#9333ea)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: summarizing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: summarizing ? 0.7 : 1 }}
              >
                {summarizing ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 15, height: 15 }} />}
                {summarizing ? 'Đang tóm tắt...' : 'Tóm tắt AI'}
              </button>
              <button
                onClick={saveTranscript}
                disabled={saving}
                style={{ flex: 1, padding: '11px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {saving ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : '💾'}
                {saving ? 'Đang lưu...' : 'Lưu lịch sử'}
              </button>
              <button
                onClick={downloadTranscript}
                style={{ padding: '11px 14px', borderRadius: 12, background: D.card2, border: `1px solid ${D.border}`, color: D.muted, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Download style={{ width: 15, height: 15 }} />
              </button>
              <button
                onClick={clearAll}
                style={{ padding: '11px 14px', borderRadius: 12, background: D.card2, border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Trash2 style={{ width: 15, height: 15 }} />
              </button>
            </div>
          )}

          {/* Tips */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: D.text }}>💡 Mẹo sử dụng</h3>
            {[
              'Đặt mic gần nguồn âm thanh để nhận dạng tốt hơn',
              'Dùng Chrome để có trải nghiệm tốt nhất',
              'AI sẽ tự động nhận diện tiếng Việt',
              'Có thể tạm dừng và tiếp tục ghi âm bất kỳ lúc nào',
            ].map(tip => (
              <div key={tip} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: D.purple, marginTop: 8, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: D.muted }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Transcript + Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: D.card, border: `1px solid ${D.border}`, borderRadius: 20, overflow: 'hidden' }}>
          {/* Tab header */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${D.border}`, padding: '0 4px' }}>
            {([
              { id: 'transcript' as const, label: 'Transcript', icon: <FileText style={{ width: 14, height: 14 }} /> },
              { id: 'summary' as const, label: 'Tóm tắt AI', icon: <Sparkles style={{ width: 14, height: 14 }} /> },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: '14px 16px', border: 'none', background: 'none',
                  color: activeTab === tab.id ? D.text : D.muted,
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  borderBottom: activeTab === tab.id ? `2px solid ${D.purple}` : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, padding: 20, overflowY: 'auto', minHeight: 400, maxHeight: 520 }}>
            {activeTab === 'transcript' ? (
              transcript ? (
                <div style={{ fontSize: 14, color: D.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{transcript}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: D.muted }}>
                  <Mic style={{ width: 48, height: 48, color: 'rgba(148,163,184,0.2)' }} />
                  <div style={{ fontSize: 14 }}>Bắt đầu ghi âm để thấy transcript ở đây</div>
                  <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)' }}>Văn bản sẽ xuất hiện theo thời gian thực</div>
                </div>
              )
            ) : (
              summary ? (
                <div style={{ fontSize: 14, color: D.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{summary}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: D.muted }}>
                  <Sparkles style={{ width: 48, height: 48, color: 'rgba(148,163,184,0.2)' }} />
                  <div style={{ fontSize: 14 }}>Nhấn "Tóm tắt AI" để tạo tóm tắt</div>
                  <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)' }}>AI sẽ rút gọn nội dung chính của bài giảng</div>
                </div>
              )
            )}
          </div>

          {/* Word count */}
          {transcript && (
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${D.border}`, fontSize: 11, color: D.muted }}>
              {transcript.split(/\s+/).filter(Boolean).length} từ · {transcript.length} ký tự
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
