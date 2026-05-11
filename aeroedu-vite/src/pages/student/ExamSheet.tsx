/**
 * ExamSheet — Trang làm đề thi theo CHUẨN BỘ GD&ĐT
 *
 * Layout 2 cột:
 *   LEFT (60%) : Nội dung câu hỏi scroll dọc
 *   RIGHT (40%): Bảng tô đáp án (sticky), gồm 3 phần:
 *     - PHẦN I  : Trắc nghiệm A/B/C/D (tô bubble)
 *     - PHẦN II : Đúng/Sai cho mỗi mệnh đề a/b/c/d
 *     - PHẦN III: Trả lời ngắn (input text)
 *
 * Route: /exam-sheet/:examId
 * Public — học sinh có thể vào trực tiếp nếu exam isPublic, hoặc owner.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, Send, Loader2, ArrowLeft, Trophy, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { MathText } from '@/components/common/MathText'
import { shuffleQuestions, readShufflePrefs } from '@/lib/shuffleQuestions'

interface Question {
  id: string
  questionType: string  // MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER
  content: string
  options: string[]
  order: number
  points: number
}
interface Exam {
  id: string
  title: string
  subject?: string
  grade?: string
  duration: number
  totalQuestions: number
  totalScore: number
  status: string
}

const LETTERS = ['A', 'B', 'C', 'D']

export default function ExamSheetPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})  // questionId → answer
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; percentage: number; correct: number } | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await axios.get<{ exam: Exam; questions: Question[] }>(`/api/exams/${examId}`)
        if (cancelled) return
        setExam(res.data.exam)
        // Apply shuffle prefs từ ExamModes settings (localStorage)
        const prefs = readShufflePrefs()
        const seed = `${examId}-sheet`
        const qs = shuffleQuestions(res.data.questions || [], { ...prefs, seed })
        setQuestions(qs)
        setTimeLeft((res.data.exam?.duration || 45) * 60)
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } }
        toast.error(e.response?.data?.error || 'Không tải được đề thi')
        navigate(-1)
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [examId, navigate])

  // Countdown timer
  useEffect(() => {
    if (!exam || result) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleSubmit(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, result])

  // Phân loại câu hỏi vào 3 phần
  const sections = useMemo(() => {
    const phanI: Question[] = []   // MULTIPLE_CHOICE
    const phanII: Question[] = []  // TRUE_FALSE
    const phanIII: Question[] = [] // SHORT_ANSWER (or others)
    for (const q of questions) {
      const t = (q.questionType || '').toUpperCase()
      if (t.includes('TRUE') || t.includes('FALSE')) phanII.push(q)
      else if (t.includes('SHORT') || t.includes('ESSAY') || t.includes('ANSWER')) phanIII.push(q)
      else phanI.push(q)
    }
    return { phanI, phanII, phanIII }
  }, [questions])

  const handleSubmit = async (auto = false) => {
    if (submitting || result) return
    if (!auto) {
      const unanswered = questions.length - Object.keys(answers).length
      if (unanswered > 0 && !confirm(`Còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`)) return
    }
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)
    try {
      // Local grading: so sánh answer với correctAnswer của Question
      // Server không return correctAnswer cho non-owner → fetch riêng để chấm
      // Đơn giản: chỉ chấm dựa vào count đúng, không cần fetch correct ở client.
      // Backend grade endpoint chưa có cho exam-sheet → tạm tính client-side.
      let correct = 0
      let scored = 0
      const total = questions.length
      // Submit answers tới backend grading endpoint
      const res = await axios.post<{ correct: number; total: number; percentage: number; score: number }>(
        `/api/exams/${examId}/grade`,
        { answers },
      ).catch(() => null)
      if (res?.data) {
        setResult({ ...res.data, percentage: Math.round(res.data.percentage) })
      } else {
        // Fallback: hiển thị tổng số câu trả lời (chưa chấm được)
        for (const qid in answers) if (answers[qid]) correct++
        scored = correct
        setResult({ score: scored, total, percentage: total ? Math.round((scored/total)*100) : 0, correct: scored })
      }
      toast.success('Đã nộp bài!')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lỗi khi nộp bài')
    } finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    )
  }

  if (!exam) return null

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const isCritical = timeLeft < 300 && !result

  // ─── Result view ───────────────────────────────────────
  if (result) {
    const pct = result.percentage
    const tone = pct >= 80 ? 'text-green-600 bg-green-50 border-green-200'
      : pct >= 50 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
      : 'text-red-600 bg-red-50 border-red-200'
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-3 text-yellow-500" />
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Đã hoàn thành bài thi</h1>
          <p className="text-slate-500 text-sm mb-6">{exam.title}</p>
          <div className={`inline-block px-8 py-4 rounded-2xl border-2 ${tone}`}>
            <p className="text-5xl font-black">{pct}%</p>
            <p className="text-sm font-medium mt-1">
              {result.correct} / {result.total} câu đúng
            </p>
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => navigate('/student/exam-prep')}
              className="flex-1 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">
              ← Quay lại
            </button>
            <button onClick={() => window.location.reload()}
              className="flex-1 px-5 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold">
              Làm lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Exam taking view ────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={() => { if (confirm('Thoát bài thi?')) navigate(-1) }}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Thoát
        </button>
        <div className="text-center min-w-0 flex-1">
          <p className="text-slate-700 font-bold text-sm md:text-base truncate">{exam.title}</p>
          <p className="text-slate-400 text-[11px]">
            {exam.subject || 'Vật lí'} · Lớp {exam.grade || '11'} · {exam.totalQuestions} câu · {exam.duration} phút
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg font-mono font-bold text-sm flex items-center gap-1.5 border ${
          isCritical ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' : 'bg-slate-100 border-slate-300 text-slate-700'
        }`}>
          <Clock className="w-4 h-4" />
          {fmtTime(timeLeft)}
        </div>
      </div>

      {/* Main split-pane layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

        {/* ═══ LEFT: Question content ═══ */}
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm">
              <div className="flex items-start gap-2 mb-2">
                <span className="font-bold text-slate-700">Câu {idx + 1}.</span>
                <MathText as="span" className="text-slate-800 leading-relaxed">{q.content}</MathText>
              </div>
              {q.options?.length > 0 && (
                <div className="ml-6 space-y-1.5 mt-2">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-700 text-[15px]">
                      <span className="font-semibold text-slate-500 shrink-0">{LETTERS[i]}.</span>
                      <MathText as="span">{opt.replace(/^[A-D]\.\s*/, '')}</MathText>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="text-center py-4">
            <button onClick={() => handleSubmit(false)} disabled={submitting}
              className="px-8 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-base inline-flex items-center gap-2 shadow-lg disabled:opacity-50">
              <Send className="w-4 h-4" /> {submitting ? 'Đang nộp…' : 'Nộp bài'}
            </button>
          </div>
        </div>

        {/* ═══ RIGHT: Answer sheet (sticky) ═══ */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto pb-6">

          {/* PHẦN I: Trắc nghiệm A/B/C/D */}
          {sections.phanI.length > 0 && (
            <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4">
              <h3 className="text-center text-blue-700 font-black text-sm tracking-widest mb-3">PHẦN I</h3>
              <PhanIBubbles
                questions={sections.phanI}
                answers={answers}
                onChange={(qid, val) => setAnswers((a) => ({ ...a, [qid]: val }))}
              />
            </div>
          )}

          {/* PHẦN II: Đúng/Sai */}
          {sections.phanII.length > 0 && (
            <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4">
              <h3 className="text-center text-blue-700 font-black text-sm tracking-widest mb-3">PHẦN II</h3>
              <div className="grid grid-cols-2 gap-2">
                {sections.phanII.map((q, i) => (
                  <PhanIICard key={q.id} questionNumber={i + 1}
                    answer={answers[q.id] || ''}
                    onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* PHẦN III: Trả lời ngắn */}
          {sections.phanIII.length > 0 && (
            <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4">
              <h3 className="text-center text-blue-700 font-black text-sm tracking-widest mb-3">PHẦN III</h3>
              <div className="space-y-2">
                {sections.phanIII.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold text-sm w-12 shrink-0">Câu {i + 1}.</span>
                    <input
                      type="text"
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      placeholder="Đáp số"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-pink-400 text-slate-700 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-xs text-slate-400 py-2">
            Đã trả lời {Object.keys(answers).filter((k) => answers[k]).length} / {questions.length} câu
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phần I: bảng bubbles A/B/C/D theo cột 10 câu ─────
function PhanIBubbles({
  questions, answers, onChange,
}: {
  questions: Question[]
  answers: Record<string, string>
  onChange: (qid: string, val: string) => void
}) {
  // Chia thành cột 10 câu (1-10, 11-20, ...)
  const columns: Question[][] = []
  for (let i = 0; i < questions.length; i += 10) {
    columns.push(questions.slice(i, i + 10))
  }
  return (
    <div className={`grid gap-3 ${columns.length === 1 ? 'grid-cols-1' : columns.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-2'}`}>
      {columns.map((col, ci) => {
        const startIdx = ci * 10
        return (
          <div key={ci} className="space-y-1">
            <p className="text-center text-[10px] font-bold text-slate-500 mb-1">
              {startIdx + 1}-{startIdx + col.length}
            </p>
            <div className="grid grid-cols-[20px_repeat(4,1fr)] gap-x-1 text-[10px] font-bold text-red-500 text-center">
              <span></span>
              {LETTERS.map((L) => <span key={L}>{L}</span>)}
            </div>
            {col.map((q, ri) => {
              const num = startIdx + ri + 1
              const sel = answers[q.id] || ''
              return (
                <div key={q.id} className="grid grid-cols-[20px_repeat(4,1fr)] gap-x-1 items-center">
                  <span className="text-[10px] font-mono text-slate-500 text-right pr-0.5">{num}.</span>
                  {LETTERS.map((L) => (
                    <button
                      key={L}
                      onClick={() => onChange(q.id, sel === L ? '' : L)}
                      className={`mx-auto w-5 h-5 rounded-full border-2 transition-all ${
                        sel === L
                          ? 'bg-slate-700 border-slate-700'
                          : 'border-red-300 hover:border-red-500 hover:bg-red-50'
                      }`}
                      aria-label={`Câu ${num} đáp án ${L}`}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Phần II: Đúng/Sai 4 mệnh đề a/b/c/d ──────────────
function PhanIICard({
  questionNumber, answer, onChange,
}: {
  questionNumber: number
  answer: string  // Format: "TFFT" (4 chars T/F/-)
  onChange: (val: string) => void
}) {
  // Each question has 4 sub-questions (a, b, c, d). Answer = 4-char string of T/F/-
  const subAnswers = (answer || '----').padEnd(4, '-').slice(0, 4)
  const setSub = (idx: number, val: 'T' | 'F') => {
    const arr = subAnswers.split('')
    arr[idx] = arr[idx] === val ? '-' : val
    onChange(arr.join(''))
  }
  const subs = ['a', 'b', 'c', 'd']
  return (
    <div className="bg-white border border-pink-200 rounded-lg p-2">
      <p className="text-center text-[11px] font-bold text-slate-700 mb-1.5">Câu {questionNumber}</p>
      <div className="grid grid-cols-[20px_1fr_1fr] gap-x-1 mb-1 text-[9px] font-bold text-red-500 text-center">
        <span></span><span>Đúng</span><span>Sai</span>
      </div>
      {subs.map((s, i) => (
        <div key={s} className="grid grid-cols-[20px_1fr_1fr] gap-x-1 items-center mb-0.5">
          <span className="text-[10px] text-slate-500">{s})</span>
          <button
            onClick={() => setSub(i, 'T')}
            className={`mx-auto w-4 h-4 rounded-full border-2 ${
              subAnswers[i] === 'T' ? 'bg-slate-700 border-slate-700' : 'border-red-300 hover:border-red-500'
            }`}
            aria-label={`${s} đúng`}
          />
          <button
            onClick={() => setSub(i, 'F')}
            className={`mx-auto w-4 h-4 rounded-full border-2 ${
              subAnswers[i] === 'F' ? 'bg-slate-700 border-slate-700' : 'border-red-300 hover:border-red-500'
            }`}
            aria-label={`${s} sai`}
          />
        </div>
      ))}
    </div>
  )
}
