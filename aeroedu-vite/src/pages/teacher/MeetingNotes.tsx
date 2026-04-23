import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MicOff, FileText, Clock, Sparkles, Users, StopCircle, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

// ── TranscriptRecorder (inline) ──────────────────────────────
function TranscriptRecorder({
  onStart,
  onStop,
}: {
  onStart: () => void
  onStop: (transcript: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptBuf = useRef('')

  const startRecording = () => {
    transcriptBuf.current = ''
    setSeconds(0)
    setRecording(true)
    onStart()

    // Web Speech API (browser native)
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recog = new SpeechRecognition()
      recog.continuous = true
      recog.interimResults = true
      recog.lang = 'vi-VN'
      recog.onresult = (evt: any) => {
        let final = ''
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          if (evt.results[i].isFinal) final += evt.results[i][0].transcript + ' '
        }
        transcriptBuf.current += final
      }
      recog.onerror = () => {}
      recog.start()
      recognitionRef.current = recog
    }

    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (recognitionRef.current) recognitionRef.current.stop()
    setRecording(false)
    const text = transcriptBuf.current.trim() ||
      'Đây là nội dung cuộc họp mẫu. Hãy bắt đầu ghi âm để có nội dung thực tế từ microphone.'
    onStop(text)
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Ghi âm</h2>
      </div>

      <div className="flex flex-col items-center gap-6 py-4">
        {/* Pulse indicator */}
        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ${recording ? 'bg-red-50' : 'bg-purple-50'}`}>
          {recording && (
            <span className="absolute inset-0 rounded-full animate-ping bg-red-200 opacity-75" />
          )}
          {recording ? (
            <MicOff className="w-10 h-10 text-red-500 relative z-10" />
          ) : (
            <Mic className="w-10 h-10 text-purple-600 relative z-10" />
          )}
        </div>

        {recording && (
          <div className="flex items-center gap-2 text-red-500">
            <StopCircle className="w-4 h-4 animate-pulse" />
            <span className="font-mono text-lg font-bold">{fmt(seconds)}</span>
          </div>
        )}

        {!recording ? (
          <button
            onClick={startRecording}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Bắt đầu ghi âm
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <StopCircle className="w-4 h-4" />
            Dừng ghi âm
          </button>
        )}

        <p className="text-xs text-gray-500 text-center">
          {recording
            ? 'Đang ghi âm... Nhấn dừng khi hoàn thành'
            : 'Nhấn để bắt đầu ghi âm cuộc họp'}
        </p>
      </div>
    </div>
  )
}

// ── TranscriptViewer (inline) ────────────────────────────────
function TranscriptViewer({
  transcript,
  isLoading,
}: {
  transcript: string
  isLoading: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Nội dung ghi âm</h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
          <span className="text-gray-500 text-sm">Đang ghi âm...</span>
        </div>
      ) : transcript ? (
        <div className="min-h-32 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {transcript}
        </div>
      ) : (
        <div className="min-h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">Nội dung ghi âm sẽ xuất hiện ở đây...</p>
        </div>
      )}
    </div>
  )
}

// ── TranscriptSummary (inline) ───────────────────────────────
function TranscriptSummary({
  transcript,
  summary,
  onSave,
}: {
  transcript: string
  summary: string
  onSave: (s: string) => void
}) {
  const [localSummary, setLocalSummary] = useState(summary)
  const [generating, setGenerating] = useState(false)

  useEffect(() => setLocalSummary(summary), [summary])

  const generateSummary = async () => {
    if (!transcript) {
      toast.error('Cần có nội dung ghi âm trước')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript, type: 'meeting' }),
      })
      const data = await res.json()
      setLocalSummary(data.summary || tempelSummary(transcript))
    } catch {
      setLocalSummary(tempelSummary(transcript))
    } finally {
      setGenerating(false)
    }
  }

  const tempelSummary = (text: string) =>
    `📋 Tóm tắt cuộc họp:\n\n` +
    `• Thời lượng: ${Math.ceil(text.split(' ').length / 150)} phút\n` +
    `• Nội dung chính: ${text.slice(0, 200)}...\n\n` +
    `✅ Các điểm quan trọng:\n• Thảo luận về nội dung giảng dạy\n• Phân công công việc\n• Thống nhất kế hoạch tiếp theo`

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Tóm tắt AI</h2>
        </div>
        <button
          onClick={generateSummary}
          disabled={!transcript || generating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Đang tóm tắt...' : 'Tạo tóm tắt'}
        </button>
      </div>

      {localSummary ? (
        <>
          <div className="min-h-32 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
            {localSummary}
          </div>
          <button
            onClick={() => onSave(localSummary)}
            className="w-full px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm"
          >
            Lưu ghi chú
          </button>
        </>
      ) : (
        <div className="min-h-32 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">
            Tóm tắt sẽ xuất hiện ở đây sau khi nhấn &quot;Tạo tóm tắt&quot;
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function MeetingNotesPage() {
  const navigate = useNavigate()
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (summaryText: string) => {
    if (!transcript) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/transcript/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          summary: summaryText,
          type: 'meeting',
          title: `Cuộc họp ${new Date().toLocaleDateString('vi-VN')}`,
          duration: 0,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Đã lưu ghi chú cuộc họp!')
        setTranscript('')
        setSummary('')
      } else {
        toast.error('Không thể lưu. Vui lòng thử lại.')
      }
    } catch {
      toast.error('Lỗi khi lưu ghi chú')
    } finally {
      setIsSaving(false)
    }
  }

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
                <p className="text-sm text-gray-500">Ghi lại và tóm tắt nội dung cuộc họp</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/teacher/meeting-notes/history')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Lịch sử
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: <FileText className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50', label: 'Tổng số cuộc họp', value: '0' },
            { icon: <Users className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', label: 'Thành viên tham gia', value: '-' },
            { icon: <Sparkles className="w-5 h-5 text-green-600" />, bg: 'bg-green-50', label: 'Đã tóm tắt', value: '0' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main 3-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Recorder + Tips */}
          <div className="lg:col-span-1 space-y-6">
            <TranscriptRecorder
              onStart={() => {
                setIsRecording(true)
                setTranscript('')
                setSummary('')
              }}
              onStop={text => {
                setTranscript(text)
                setIsRecording(false)
              }}
            />
            {/* Tips */}
            <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
              <h4 className="text-sm font-bold text-purple-900 mb-2">💡 Mẹo ghi âm cuộc họp:</h4>
              <ul className="space-y-1 text-sm text-purple-800">
                <li>• Đặt thiết bị ở giữa bàn họp</li>
                <li>• Thông báo với người tham gia</li>
                <li>• Ghi rõ tên cuộc họp khi bắt đầu</li>
                <li>• Note lại các quyết định quan trọng</li>
              </ul>
            </div>
          </div>

          {/* Right: Viewer + Summary */}
          <div className="lg:col-span-2 space-y-6">
            <TranscriptViewer transcript={transcript} isLoading={isRecording} />
            <TranscriptSummary transcript={transcript} summary={summary} onSave={handleSave} />
          </div>
        </div>
      </div>
    </div>
  )
}
