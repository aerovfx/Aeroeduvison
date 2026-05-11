/**
 * ExamFlashcards — Học bằng thẻ lật (flashcard mode)
 *
 * Route: /exam/:examId/flashcards
 *
 * Features:
 *   - Mỗi câu = 1 thẻ
 *   - Mặt trước: câu hỏi + 4 đáp án
 *   - Click "Lật thẻ" → mặt sau hiện đáp án đúng + giải thích
 *   - Nút Easy/Medium/Hard tự đánh giá → spaced repetition cơ bản
 *   - Có thể navigate Next/Prev tự do
 *   - Không tính điểm — chỉ học
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, BookOpen, Shuffle, Sparkles, ThumbsUp, ThumbsDown, Equal } from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { MathText } from '@/components/common/MathText'
import { shuffleQuestions, readShufflePrefs } from '@/lib/shuffleQuestions'

interface Question {
  id: string
  questionType: string
  content: string
  options: string[]
  correctAnswer?: string
  explanation?: string
}

const LETTERS = ['A', 'B', 'C', 'D']

export default function ExamFlashcardsPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [exam, setExam] = useState<{ title: string } | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [marks, setMarks] = useState<Record<number, 'easy' | 'medium' | 'hard'>>({})

  useEffect(() => {
    if (!examId) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await axios.get<{ exam: any; questions: Question[] }>(`/api/exams/${examId}`)
        if (cancelled) return
        setExam({ title: r.data.exam.title })
        // Flashcards mode: chỉ apply shuffle question order (không shuffle options
        // để mặt sau "Đáp án đúng" hiển thị đúng letter trong context bài học).
        const prefs = readShufflePrefs()
        const qs = shuffleQuestions(r.data.questions || [], {
          shuffleOrder: prefs.shuffleOrder,
          shuffleOptions: false,
          seed: `${examId}-flashcards`,
        })
        setQuestions(qs)
      } catch {
        toast.error('Không tải được đề thi')
        navigate(-1)
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [examId, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
        <div className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white"
        style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
        Không có câu hỏi
      </div>
    )
  }

  const q = questions[idx]
  const total = questions.length
  const correctLetter = q.correctAnswer?.match(/^([A-Z])/i)?.[1]?.toUpperCase() || q.correctAnswer || '?'
  const correctOption = q.options.find(opt => opt.match(/^([A-Z])[.)\s]/i)?.[1]?.toUpperCase() === correctLetter) || correctLetter

  const next = () => { setFlipped(false); if (idx + 1 < total) setIdx(idx + 1); else toast.success('Đã hết thẻ — quay lại đầu') }
  const prev = () => { setFlipped(false); setIdx((i) => Math.max(0, i - 1)) }
  const shuffle = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    setQuestions(shuffled); setIdx(0); setFlipped(false); setMarks({})
    toast.success('🎲 Đã xáo thẻ')
  }
  const reset = () => { setIdx(0); setFlipped(false); setMarks({}) }

  const mark = (level: 'easy' | 'medium' | 'hard') => {
    setMarks((m) => ({ ...m, [idx]: level }))
    setTimeout(() => next(), 300)
  }

  const stats = {
    easy: Object.values(marks).filter(m => m === 'easy').length,
    medium: Object.values(marks).filter(m => m === 'medium').length,
    hard: Object.values(marks).filter(m => m === 'hard').length,
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(`/exam/${examId}/modes`)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="flex items-center gap-2 text-white/80 font-bold">
          <BookOpen className="w-4 h-4 text-pink-400" />
          <span>Thẻ {idx + 1} / {total}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={shuffle} className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/80 text-xs font-medium flex items-center gap-1">
            <Shuffle className="w-3.5 h-3.5" /> Xáo
          </button>
          <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/80 text-xs font-medium flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Bắt đầu lại
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 mb-4">
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <button onClick={() => setFlipped(f => !f)}
          className="relative w-full max-w-3xl aspect-[3/2] cursor-pointer group"
          style={{ perspective: '1500px' }}>
          <div className="absolute inset-0 transition-transform duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'none',
            }}>

            {/* FRONT: Question + options */}
            <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col"
              style={{ backfaceVisibility: 'hidden' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider">Câu hỏi</span>
                <span className="text-slate-400 text-xs">Click để lật thẻ</span>
              </div>
              <MathText as="div" className="text-slate-800 text-xl md:text-2xl font-bold leading-snug text-center my-auto">
                {q.content}
              </MathText>
              {q.options?.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {q.options.map((opt, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-sm flex items-start gap-2">
                      <span className="font-bold text-purple-600">{LETTERS[i]}.</span>
                      <MathText as="span">{opt.replace(/^[A-D]\.\s*/, '')}</MathText>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BACK: Answer + explanation */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 border-4 border-green-400 rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-green-600" />
                <span className="px-2 py-1 rounded-md bg-green-200 text-green-800 text-[10px] font-bold uppercase tracking-wider">Đáp án đúng</span>
              </div>
              <div className="my-auto text-center">
                <p className="text-green-700 text-5xl md:text-7xl font-black mb-3">{correctLetter}</p>
                <MathText as="div" className="text-green-800 text-lg md:text-xl font-medium">
                  {String(correctOption).replace(/^[A-D]\.\s*/, '')}
                </MathText>
              </div>
              {q.explanation && (
                <div className="bg-white/60 rounded-xl p-3 mt-3">
                  <p className="text-[10px] uppercase tracking-wider text-green-600 font-bold mb-1">💡 Giải thích</p>
                  <MathText as="div" className="text-green-900 text-sm">{q.explanation}</MathText>
                </div>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Bottom controls */}
      <div className="px-4 pb-4 max-w-3xl mx-auto w-full">
        {/* Self-rating buttons (chỉ hiện khi flip) */}
        {flipped && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button onClick={() => mark('hard')}
              className={`py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-sm flex items-center justify-center gap-2 ${marks[idx] === 'hard' ? 'ring-2 ring-red-400' : ''}`}>
              <ThumbsDown className="w-4 h-4" /> Khó
            </button>
            <button onClick={() => mark('medium')}
              className={`py-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-bold text-sm flex items-center justify-center gap-2 ${marks[idx] === 'medium' ? 'ring-2 ring-yellow-400' : ''}`}>
              <Equal className="w-4 h-4" /> Trung bình
            </button>
            <button onClick={() => mark('easy')}
              className={`py-3 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 font-bold text-sm flex items-center justify-center gap-2 ${marks[idx] === 'easy' ? 'ring-2 ring-green-400' : ''}`}>
              <ThumbsUp className="w-4 h-4" /> Dễ
            </button>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={prev} disabled={idx === 0}
            className="px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1">
            <ChevronLeft className="w-5 h-5" /> Trước
          </button>

          <div className="flex items-center gap-3 text-xs text-white/60">
            <span>👍 {stats.easy}</span>
            <span>= {stats.medium}</span>
            <span>👎 {stats.hard}</span>
          </div>

          <button onClick={next}
            className="px-5 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold flex items-center gap-1">
            Sau <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
