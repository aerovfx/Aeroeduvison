/**
 * ExamMastery — Mastery Peak mode: leo núi gamified
 *
 * Route: /exam/:examId/mastery
 *
 * Cùng câu hỏi như Solo mode nhưng visual khác:
 *   - Phía trên: ngọn núi với avatar người chơi
 *   - Mỗi câu đúng → avatar di chuyển lên 1 nấc
 *   - Mỗi câu sai → đứng yên (không retreat để giữ động lực)
 *   - Đỉnh núi = câu cuối → cờ chiến thắng
 *   - Bên dưới: 1 câu hỏi với 4 options (giống Solo)
 *
 * Khi đến đỉnh: confetti + "Bạn đã chinh phục đỉnh!"
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Mountain, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { MathText } from '@/components/common/MathText'
import { shuffleQuestions, readShufflePrefs } from '@/lib/shuffleQuestions'

interface Question {
  id: string; questionType: string; content: string
  options: string[]; correctAnswer?: string; explanation?: string
}

const PALETTE = [
  { bg: 'linear-gradient(135deg, #ef4444, #b91c1c)', label: 'A' },
  { bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', label: 'B' },
  { bg: 'linear-gradient(135deg, #f59e0b, #b45309)', label: 'C' },
  { bg: 'linear-gradient(135deg, #10b981, #047857)', label: 'D' },
]

function normalize(s: string): string {
  s = String(s ?? '').trim()
  if (!s) return ''
  if (/^[A-Z]$/i.test(s)) return s.toUpperCase()
  const m = s.match(/^([A-Z])[.)\s]/i)
  if (m) return m[1].toUpperCase()
  return s.toLowerCase()
}

export default function ExamMasteryPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const [exam, setExam] = useState<{ title: string } | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [correctIdx, setCorrectIdx] = useState<number>(0)  // số câu đúng tích luỹ
  const [done, setDone] = useState(false)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    if (!examId) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await axios.get<{ exam: { title: string }; questions: Question[] }>(`/api/exams/${examId}`)
        if (cancelled) return
        setExam({ title: r.data.exam.title })
        const prefs = readShufflePrefs()
        const qs = shuffleQuestions(r.data.questions || [], { ...prefs, seed: `${examId}-mastery` })
        setQuestions(qs)
      } catch {
        toast.error('Không tải được đề thi')
        navigate(-1)
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [examId, navigate])

  const q = questions[idx]
  const total = questions.length
  const climbed = correctIdx
  const percentage = total > 0 ? (climbed / total) * 100 : 0

  const submitAnswer = (ans: string) => {
    if (selected != null || !q) return
    setSelected(ans)
    if (q.correctAnswer) {
      const ansLetter = ans.match(/^([A-Z])[.)\s]/i)?.[1]?.toUpperCase() || ans
      const isCorrect = normalize(ansLetter) === normalize(q.correctAnswer)
      if (isCorrect) setCorrectIdx(c => c + 1)
    }
  }

  const next = () => {
    setSelected(null)
    if (idx + 1 >= total) { setDone(true); return }
    setIdx(idx + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!q && !done) return null

  // Done view
  if (done) {
    const pct = total > 0 ? Math.round((correctIdx / total) * 100) : 0
    const took = Math.floor((Date.now() - startedAt.current) / 1000)
    const allCorrect = correctIdx === total
    return (
      <div className="min-h-screen p-6"
        style={{ background: 'linear-gradient(180deg, #ecfeff 0%, #5eead4 100%)' }}>
        <div className="max-w-md mx-auto text-center pt-12">
          <div className="text-8xl mb-4">{allCorrect ? '🏔️🚩' : '🎯'}</div>
          <h1 className="text-teal-900 text-3xl font-black mb-2">
            {allCorrect ? 'CHINH PHỤC ĐỈNH!' : 'Hoàn thành chuyến leo'}
          </h1>
          <p className="text-teal-700 mb-6">{exam?.title}</p>
          <div className="bg-white rounded-3xl p-8 shadow-xl mb-6">
            <p className="text-teal-600 text-sm mb-1">Điểm chinh phục</p>
            <p className="text-teal-900 text-6xl font-black">{pct}%</p>
            <p className="text-teal-600 mt-2">{correctIdx} / {total} đỉnh nhỏ chinh phục</p>
            <p className="text-teal-500 text-xs mt-1">Thời gian: {Math.floor(took/60)}:{String(took%60).padStart(2,'0')}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(`/exam/${examId}/modes`)}
              className="flex-1 py-3 rounded-xl bg-white text-teal-700 font-medium border border-teal-200">
              Quay lại
            </button>
            <button onClick={() => window.location.reload()}
              className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center gap-1">
              <RotateCcw className="w-4 h-4" /> Leo lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg, #ecfeff 0%, #99f6e4 50%, #14b8a6 100%)' }}>

      {/* Top bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/40 backdrop-blur">
        <button onClick={() => { if (confirm('Thoát chuyến leo?')) navigate(`/exam/${examId}/modes`) }}
          className="flex items-center gap-1 text-teal-900 hover:text-teal-700 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Thoát
        </button>
        <div className="flex items-center gap-2">
          <Mountain className="w-5 h-5 text-teal-900" />
          <span className="text-teal-900 font-bold">Mastery Peak</span>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-teal-900 text-white text-sm font-bold">
          {idx + 1} / {total}
        </div>
      </div>

      {/* Mountain visualization */}
      <div className="relative h-[200px] mx-auto w-full max-w-3xl">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMax meet">
          {/* Mountain shape */}
          <path d="M 0 200 L 100 100 L 140 130 L 200 40 L 260 110 L 320 80 L 400 200 Z"
            fill="rgba(15, 118, 110, 0.8)" />
          {/* Snow cap */}
          <path d="M 190 50 L 200 40 L 210 50 L 200 55 Z" fill="#fff" />
          {/* Flag */}
          <line x1="200" y1="40" x2="200" y2="20" stroke="#ef4444" strokeWidth="2" />
          <path d="M 200 20 L 215 25 L 200 30 Z" fill="#ef4444" />
          {/* Trail dots — show all positions, highlight current */}
          {Array.from({ length: total }).map((_, i) => {
            const progress = i / Math.max(total - 1, 1)
            const x = 50 + progress * 150  // x từ 50 → 200
            const y = 180 - progress * 140 // y từ 180 → 40 (lên dần)
            const isCurrent = i === idx
            const isPast = i < idx
            const isCorrect = isPast && i < climbed  // approximate
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={isCurrent ? 8 : 4}
                  fill={isCorrect ? '#22c55e' : isPast ? '#ef4444' : 'rgba(255,255,255,0.6)'}
                  stroke="rgba(15,118,110,0.5)" strokeWidth="1" />
                {isCurrent && (
                  <circle cx={x} cy={y} r="14" fill="none" stroke="#fff" strokeWidth="2" opacity="0.8">
                    <animate attributeName="r" values="12;20;12" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            )
          })}
          {/* Climber avatar (current position) */}
          {(() => {
            const progress = climbed / Math.max(total, 1)
            const x = 50 + progress * 150
            const y = 180 - progress * 140
            return (
              <g>
                <circle cx={x} cy={y - 10} r="10" fill="#7c3aed" stroke="#fff" strokeWidth="2" />
                <text x={x} y={y - 6} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">🧗</text>
              </g>
            )
          })()}
        </svg>
        {/* Progress label */}
        <div className="absolute top-2 right-4 bg-white/90 px-3 py-1.5 rounded-full shadow font-bold text-teal-900 text-sm">
          {climbed}/{total} đỉnh
        </div>
      </div>

      {/* Progress bar (alt visualization) */}
      <div className="px-4 mt-2 mb-3">
        <div className="max-w-3xl mx-auto h-2 bg-white/60 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${percentage}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 md:px-6 pb-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl p-6 shadow-xl mb-4">
            <p className="text-teal-600 text-xs font-bold uppercase tracking-wider mb-2">CÂU {idx + 1}</p>
            <MathText as="div" className="text-slate-800 text-lg md:text-2xl font-medium leading-snug">
              {q.content}
            </MathText>
          </div>

          {/* Result feedback */}
          {selected && (
            <div className={`mb-4 p-3 rounded-xl text-center text-xl font-black ${
              (() => {
                const ansLetter = selected.match(/^([A-Z])[.)\s]/i)?.[1]?.toUpperCase()
                const ok = q.correctAnswer && normalize(ansLetter || selected) === normalize(q.correctAnswer)
                return ok
                  ? 'bg-green-100 text-green-800 border-2 border-green-400'
                  : 'bg-orange-100 text-orange-800 border-2 border-orange-400'
              })()
            }`}>
              {(() => {
                const ansLetter = selected.match(/^([A-Z])[.)\s]/i)?.[1]?.toUpperCase()
                const ok = q.correctAnswer && normalize(ansLetter || selected) === normalize(q.correctAnswer)
                return ok ? '🎉 +1 nấc! Tiếp tục leo!' : '💪 Chưa đúng — đứng yên thôi, không tụt!'
              })()}
            </div>
          )}

          {/* Options */}
          {q.options?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const isSelected = selected === opt
                const c = PALETTE[i % 4]
                return (
                  <button key={i} onClick={() => submitAnswer(opt)} disabled={selected != null}
                    className={`p-5 rounded-2xl text-white text-base md:text-lg font-bold text-left
                      shadow-xl transition-all relative
                      ${isSelected ? 'ring-4 ring-white scale-95'
                        : selected ? 'opacity-40 scale-95'
                        : 'hover:scale-[1.02] active:scale-95 hover:brightness-110'}
                      disabled:cursor-not-allowed`}
                    style={{ background: c.bg, minHeight: '80px' }}>
                    <span className="absolute top-2 left-3 text-2xl font-black opacity-50">{c.label}</span>
                    <div className="pl-8">
                      <MathText as="span">{opt}</MathText>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Next */}
          {selected && (
            <div className="mt-4 flex justify-center">
              <button onClick={next}
                className="px-8 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base flex items-center gap-2 shadow-lg">
                {idx + 1 >= total ? <><Trophy className="w-5 h-5" /> Xem kết quả</> : '⛰️ Tiếp tục leo →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
