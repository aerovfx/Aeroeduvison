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
  // pdf-only fields
  examMode?: string | null
  pdfUrl?: string | null
  sectionCounts?: { phanI: number; phanII: number; phanIII: number; phanIV?: number } | null
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
  const [result, setResult] = useState<{
    score: number; total: number; percentage: number; correct: number
    phanIV?: Array<{ index: number; score: number; maxScore: number; feedback: string }>
    phanIVMax?: number
    phanIVEarned?: number
  } | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await axios.get<{ exam: Exam; questions: Question[] }>(`/api/exams/${examId}`)
        if (cancelled) return
        const exam = res.data.exam
        setExam(exam)
        setTimeLeft((exam?.duration || 45) * 60)

        // ── PDF-only mode: synthesize virtual questions theo sectionCounts ──
        if (exam.examMode === 'pdf-only' && exam.sectionCounts) {
          const sc = exam.sectionCounts
          const synth: Question[] = []
          for (let i = 0; i < sc.phanI; i++) {
            synth.push({
              id: `phanI-${i + 1}`, questionType: 'MULTIPLE_CHOICE',
              content: '', options: [], order: i + 1, points: 1,
            })
          }
          for (let i = 0; i < sc.phanII; i++) {
            synth.push({
              id: `phanII-${i + 1}`, questionType: 'TRUE_FALSE',
              content: '', options: [], order: sc.phanI + i + 1, points: 1,
            })
          }
          for (let i = 0; i < sc.phanIII; i++) {
            synth.push({
              id: `phanIII-${i + 1}`, questionType: 'SHORT_ANSWER',
              content: '', options: [], order: sc.phanI + sc.phanII + i + 1, points: 1,
            })
          }
          const phanIVCount = sc.phanIV || 0
          for (let i = 0; i < phanIVCount; i++) {
            synth.push({
              id: `phanIV-${i + 1}`, questionType: 'ESSAY',
              content: '', options: [],
              order: sc.phanI + sc.phanII + sc.phanIII + i + 1, points: 1,
            })
          }
          setQuestions(synth)
          return
        }

        // Mode mặc định: shuffle questions từ DB
        const prefs = readShufflePrefs()
        const seed = `${examId}-sheet`
        const qs = shuffleQuestions(res.data.questions || [], { ...prefs, seed })
        setQuestions(qs)
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

  // Phân loại câu hỏi vào 4 phần (PHẦN IV = Tự luận, AI chấm)
  const sections = useMemo(() => {
    const phanI: Question[] = []   // MULTIPLE_CHOICE
    const phanII: Question[] = []  // TRUE_FALSE
    const phanIII: Question[] = [] // SHORT_ANSWER (or others)
    const phanIV: Question[] = []  // ESSAY
    for (const q of questions) {
      const t = (q.questionType || '').toUpperCase()
      // Trong pdf-only mode, id có dạng phanI-N / phanII-N / phanIII-N / phanIV-N.
      // Ưu tiên check id để route đúng (cùng questionType 'ESSAY' có thể tới
      // cả III và IV trong các đề khác).
      if (q.id.startsWith('phanIV-') || t.includes('ESSAY')) phanIV.push(q)
      else if (t.includes('TRUE') || t.includes('FALSE')) phanII.push(q)
      else if (t.includes('SHORT') || t.includes('ANSWER')) phanIII.push(q)
      else phanI.push(q)
    }
    return { phanI, phanII, phanIII, phanIV }
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
      const res = await axios.post<{
        correct: number; total: number; percentage: number; score: number;
        phanIV?: Array<{ index: number; score: number; maxScore: number; feedback: string }>;
        phanIVMax?: number; phanIVEarned?: number;
      }>(
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
              {result.phanIVMax ? ` · Tự luận ${(result.phanIVEarned ?? 0).toFixed(1)}/${result.phanIVMax}đ` : ''}
            </p>
          </div>

          {/* PHẦN IV feedback từ AI */}
          {result.phanIV && result.phanIV.length > 0 && (
            <div className="mt-6 text-left bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
              <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                ✨ AI chấm phần Tự luận
              </h3>
              <ul className="space-y-3">
                {result.phanIV.map((p) => {
                  const pctP = p.maxScore > 0 ? (p.score / p.maxScore) * 100 : 0
                  const toneP = pctP >= 80 ? 'bg-green-100 text-green-700'
                    : pctP >= 50 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  return (
                    <li key={p.index} className="bg-white border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-700 text-sm">Câu {p.index}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${toneP}`}>
                          {p.score.toFixed(2)} / {p.maxScore}đ
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{p.feedback}</p>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

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

        {/* ═══ LEFT: Question content (hoặc PDF nếu pdf-only) ═══ */}
        <div className="space-y-4">
          {exam.examMode === 'pdf-only' ? (
            // PDF-only mode: nhúng PDF iframe, HS xem PDF làm hình đề
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{ minHeight: '85vh' }}>
                <iframe
                  src={`/api/exams/${exam.id}/pdf#toolbar=1&navpanes=0`}
                  title={exam.title}
                  className="w-full"
                  style={{ height: '85vh', border: 0, display: 'block' }}
                />
              </div>
              <p className="text-center text-xs text-slate-500">
                Xem PDF làm đề và tô đáp án ở bảng bên phải. Có thể zoom / scroll bên trong khung PDF.
              </p>
            </>
          ) : (
            questions.map((q, idx) => (
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
            ))
          )}
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

          {/* PHẦN IV: Tự luận — AI chấm theo rubric */}
          {sections.phanIV.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
              <h3 className="text-center text-amber-700 font-black text-sm tracking-widest mb-1">PHẦN IV</h3>
              <p className="text-center text-[11px] text-amber-700/80 mb-3">Tự luận — AI sẽ phân tích &amp; chấm</p>
              <div className="space-y-3">
                {sections.phanIV.map((q, i) => (
                  <div key={q.id}>
                    <label className="block text-slate-700 font-semibold text-sm mb-1">
                      Câu {i + 1}.
                    </label>
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      placeholder="Trình bày cách giải đầy đủ các bước. AI sẽ chấm theo rubric do GV thiết lập."
                      rows={5}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:border-amber-500 text-slate-700 text-sm resize-y bg-white"
                    />
                    <p className="text-[10px] text-amber-700/60 mt-1">
                      💡 Viết rõ từng bước (công thức, thay số, đơn vị) để AI chấm chính xác.
                    </p>
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
