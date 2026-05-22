/**
 * ExamSolo — Làm đề 1 mình, fullscreen 4-color cards (style Wayground)
 *
 * Route: /exam/:examId/solo
 *
 * Khác PlayRoom (LIVE multiplayer):
 *   - Không cần tạo room, không cần tên/avatar
 *   - Chỉ có 1 mình, tự pace tốc độ (Next câu khi sẵn sàng)
 *   - Auto chấm sau mỗi câu, hiện đáp án đúng + giải thích
 *   - Cuối cùng → tổng kết điểm
 *
 * UI: tận dụng style 2x2 grid + 4 màu Wayground giống PlayRoom playing.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Trophy, RotateCcw, Clock, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { MathText } from '@/components/common/MathText'
import { shuffleQuestions, readShufflePrefs } from '@/lib/shuffleQuestions'
import MusicToggle from '@/components/common/MusicToggle'

interface Question {
  id: string
  questionType: string
  content: string
  options: string[]
  correctAnswer?: string
  explanation?: string
  order: number
  points: number
}

const PALETTE = [
  { bg: 'linear-gradient(135deg, #b5b400, #8a8a00)', shape: '◆', num: '1' },
  { bg: 'linear-gradient(135deg, #b266ff, #8e3eff)', shape: '●', num: '2' },
  { bg: 'linear-gradient(135deg, #ff9933, #e67700)', shape: '▲', num: '3' },
  { bg: 'linear-gradient(135deg, #1ec9b1, #11a892)', shape: '■', num: '4' },
]

function normalize(s: string): string {
  s = String(s ?? '').trim()
  if (!s) return ''
  if (/^[A-Z]$/i.test(s)) return s.toUpperCase()
  const m = s.match(/^([A-Z])[.)\s]/i)
  if (m) return m[1].toUpperCase()
  const num = s.replace(/,/g, '.').replace(/\s+/g, '')
  if (num !== '' && !isNaN(Number(num))) return String(Number(num))
  return s.toLowerCase()
}

export default function ExamSoloPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const [exam, setExam] = useState<{ title: string; duration: number } | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState<Record<number, { ans: string; correct: boolean }>>({})
  const [done, setDone] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (!examId) return
    let cancelled = false
    ;(async () => {
      try {
        // Fetch as owner để có correctAnswer (best). Nếu không phải owner,
        // dùng /grade endpoint chấm server-side. Ở đây assume public exam có
        // correctAnswer ẩn → fallback gọi /grade per-question.
        const r = await axios.get<{ exam: any; questions: Question[] }>(`/api/exams/${examId}`)
        if (cancelled) return
        setExam({ title: r.data.exam.title, duration: r.data.exam.duration })
        // Apply shuffle prefs (lưu localStorage từ ExamModes settings)
        const prefs = readShufflePrefs()
        const seed = `${examId}-${r.data.exam.title}`
        const qs = shuffleQuestions(r.data.questions || [], { ...prefs, seed })
        setQuestions(qs)
        setTimeLeft((r.data.exam.duration || 45) * 60)
      } catch (e) {
        toast.error('Không tải được đề thi')
        navigate(-1)
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [examId, navigate])

  // Countdown
  useEffect(() => {
    if (!exam || done) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); finishExam(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, done])

  const q = questions[idx]
  const progress = questions.length ? ((idx + 1) / questions.length) * 100 : 0
  const correctCount = useMemo(
    () => Object.values(answered).filter(a => a.correct).length,
    [answered],
  )
  const accuracy = Object.keys(answered).length > 0
    ? Math.round((correctCount / Object.keys(answered).length) * 100) : 0

  const submitAnswer = (ans: string) => {
    if (selected != null || !q) return
    setSelected(ans)
    // Local check (nếu correctAnswer có sẵn từ owner)
    let correct = false
    if (q.correctAnswer) {
      // Extract letter from option (eg "A. xxx" → "A")
      const ansLetter = ans.match(/^([A-Z])[.)\s]/i)?.[1]?.toUpperCase() || ans
      correct = normalize(ansLetter) === normalize(q.correctAnswer)
    }
    setAnswered(a => ({ ...a, [idx]: { ans, correct } }))
  }

  const next = () => {
    setSelected(null)
    if (idx + 1 >= questions.length) { finishExam(); return }
    setIdx(idx + 1)
  }

  const finishExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    // Server-side grade để chính xác (cho cả MCQ + short answer)
    const userAnswers: Record<string, string> = {}
    for (const qid in questions) {
      const i = Number(qid)
      const a = answered[i]
      if (a && questions[i]) userAnswers[questions[i].id] = a.ans
    }
    try {
      await axios.post(`/api/exams/${examId}/grade`, { answers: userAnswers })
    } catch { /* ignore — show local result */ }
    setDone(true)
  }

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
        <div className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!q && !done) return null

  // ─── DONE ─────────────────────────────────────
  if (done) {
    const total = questions.length
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
    const tone = pct >= 80 ? { bg: 'from-green-500 to-emerald-600', emoji: '🏆' }
      : pct >= 50 ? { bg: 'from-yellow-500 to-orange-500', emoji: '🎉' }
      : { bg: 'from-pink-500 to-red-500', emoji: '💪' }
    const took = Math.floor((Date.now() - startedAt.current) / 1000)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
        <div className="text-center max-w-md w-full">
          <div className="text-8xl mb-4">{tone.emoji}</div>
          <h1 className="text-white text-3xl font-black mb-2">Hoàn thành!</h1>
          <p className="text-white/60 mb-6">{exam?.title}</p>
          <div className={`bg-gradient-to-br ${tone.bg} rounded-3xl p-8 mb-6 shadow-2xl`}>
            <p className="text-white/90 text-sm mb-1">Điểm số</p>
            <p className="text-white text-7xl font-black">{pct}%</p>
            <p className="text-white/80 text-base mt-2">{correctCount} / {total} câu đúng</p>
            <p className="text-white/70 text-xs mt-1">Thời gian: {fmtTime(took)}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/exam/${examId}/modes`)}
              className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium">
              Quay lại
            </button>
            <button onClick={() => window.location.reload()}
              className="flex-1 py-3 rounded-xl bg-white text-purple-700 font-bold flex items-center justify-center gap-1">
              <RotateCcw className="w-4 h-4" /> Làm lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── PLAYING — Wayground style ─────────────
  const result = answered[idx]
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
      <MusicToggle />

      {/* Top bar */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={() => { if (confirm('Thoát bài?')) navigate(`/exam/${examId}/modes`) }}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Thoát
        </button>
        <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/[0.08] text-yellow-300 font-bold text-sm md:text-base">
          {idx + 1} / {questions.length}
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md bg-white/[0.05] text-white/70 text-xs flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" />{fmtTime(timeLeft)}
          </div>
          <button onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen()
            else document.documentElement.requestFullscreen?.()
          }} className="w-8 h-8 rounded-lg bg-white/[0.08] text-white/80">⛶</button>
        </div>
      </div>

      {/* Progress bar + accuracy */}
      <div className="px-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          {Object.keys(answered).length > 0 && (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>{accuracy}% đúng</span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="flex-shrink-0 px-4 md:px-8 mb-4">
        <div className="max-w-5xl mx-auto bg-black/50 backdrop-blur-xl rounded-2xl px-6 py-6 md:py-10">
          <MathText as="div" className="text-white text-xl md:text-3xl lg:text-4xl font-medium leading-snug text-center">
            {q.content}
          </MathText>
        </div>
      </div>

      {/* Result feedback */}
      {result && (
        <div className="px-4 mb-3">
          <div className={`max-w-3xl mx-auto p-3 rounded-2xl text-center text-xl md:text-2xl font-black ${
            result.correct
              ? 'bg-green-500/30 text-green-200 border-2 border-green-400/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
              : 'bg-red-500/30 text-red-200 border-2 border-red-400/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
          }`}>
            {result.correct ? '✅ CHÍNH XÁC!' : '❌ CHƯA ĐÚNG'}
            {q.explanation && (
              <p className="text-sm font-normal mt-2 opacity-90">💡 {q.explanation}</p>
            )}
          </div>
        </div>
      )}

      {/* Options 2x2 */}
      <div className="flex-1 px-3 md:px-6 pb-3 md:pb-6">
        {q.options?.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:gap-4 h-full max-w-7xl mx-auto">
            {q.options.map((opt, i) => {
              const isSelected = selected === opt
              const isCorrectOpt = q.correctAnswer && (
                normalize(opt.match(/^([A-Z])[.)\s]/i)?.[1] || opt) === normalize(q.correctAnswer)
              )
              const c = PALETTE[i % 4]
              const showOutcome = result != null
              return (
                <button key={i} onClick={() => submitAnswer(opt)} disabled={selected != null}
                  className={`relative p-6 md:p-8 rounded-2xl text-white text-xl md:text-3xl lg:text-4xl font-bold flex items-center justify-center text-center
                    shadow-2xl transition-all
                    ${showOutcome
                      ? (isCorrectOpt ? 'ring-4 md:ring-8 ring-green-400 brightness-110'
                          : isSelected ? 'ring-4 md:ring-8 ring-red-400 opacity-60' : 'opacity-30')
                      : isSelected ? 'ring-4 md:ring-8 ring-white scale-95'
                      : selected ? 'opacity-30 scale-95'
                      : 'hover:scale-[1.02] active:scale-95 hover:brightness-110'}
                    disabled:cursor-not-allowed`}
                  style={{ background: c.bg, minHeight: '140px' }}>
                  <span className="absolute top-2 right-3 px-2 py-0.5 rounded bg-black/30 text-white/90 text-xs font-bold">{c.num}</span>
                  <span className="absolute top-2 left-3 text-2xl text-white/70">{c.shape}</span>
                  <MathText as="span" className="block px-2 leading-tight">{opt}</MathText>
                  {showOutcome && isCorrectOpt && (
                    <CheckCircle2 className="absolute bottom-2 right-2 w-7 h-7 text-white" />
                  )}
                  {showOutcome && isSelected && !isCorrectOpt && (
                    <XCircle className="absolute bottom-2 right-2 w-7 h-7 text-white" />
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <ShortAnswerSolo onSubmit={submitAnswer} disabled={selected != null} />
        )}
      </div>

      {/* Next button (chỉ hiện sau khi answer) */}
      {selected != null && (
        <div className="px-4 pb-4 flex justify-center">
          <button onClick={next}
            className="px-8 py-3 rounded-xl bg-white text-purple-700 font-bold text-lg flex items-center gap-2 shadow-lg hover:scale-105 transition">
            {idx + 1 >= questions.length ? <><Trophy className="w-5 h-5" /> Xem kết quả</> : <>Câu kế tiếp <ChevronRight className="w-5 h-5" /></>}
          </button>
        </div>
      )}
    </div>
  )
}

function ShortAnswerSolo({ onSubmit, disabled }: { onSubmit: (s: string) => void; disabled: boolean }) {
  const [v, setV] = useState('')
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      <input type="text" autoFocus disabled={disabled} value={v} onChange={e => setV(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && v.trim() && onSubmit(v.trim())}
        placeholder="Nhập câu trả lời…"
        className="w-full text-2xl py-4 px-5 rounded-2xl bg-white text-purple-900 placeholder-purple-300 focus:outline-none" />
      <button onClick={() => v.trim() && onSubmit(v.trim())} disabled={disabled || !v.trim()}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-xl disabled:opacity-50">
        Gửi
      </button>
    </div>
  )
}
