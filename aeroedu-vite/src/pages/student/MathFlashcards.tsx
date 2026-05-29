/**
 * MathFlashcards — ôn tập câu hỏi Toán bằng flashcard + SRS.
 * Route: /student/math/flashcards
 *
 * Ưu tiên câu "đến hạn" theo SRS (lib/srs.ts, subject='Math'); nếu chưa đủ,
 * bù thêm câu ngẫu nhiên. Mặt trước = đề bài (LaTeX/TikZ); lật thẻ xem đáp án
 * đúng + giải thích, rồi tự đánh giá (Lại / Khó / Tốt / Dễ) → feed lại SRS.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, RotateCcw, Lightbulb, CheckCircle2 } from 'lucide-react'
import { MathText } from '@/components/common/MathText'
import TikzFigure from '@/components/common/TikzFigure'
import { allQuestions, questionById, type MathQuestion, type MathStop } from '@/lib/math/curriculum'
import { getDueCards, recordReview } from '@/lib/srs'
import MusicToggle from '@/components/common/MusicToggle'

const GRAD = 'linear-gradient(135deg,#d4a017 0%,#7c5cff 100%)' // cổ đại → hiện đại
const GOLD = '#d4a017'
const DECK_SIZE = 12

type Card = { q: MathQuestion; stop: MathStop }

export default function MathFlashcards() {
  const navigate = useNavigate()

  // Dựng deck: due trước, bù random cho đủ DECK_SIZE
  const deck = useMemo<Card[]>(() => {
    const byId = questionById()
    const due = getDueCards(undefined, { subject: 'Math', limit: DECK_SIZE })
      .map(r => byId[r.qid]).filter(Boolean) as Card[]
    if (due.length >= DECK_SIZE) return due
    const have = new Set(due.map(c => c.q.id))
    const pool = allQuestions().filter(c => !have.has(c.q.id)).sort(() => Math.random() - 0.5)
    return [...due, ...pool].slice(0, DECK_SIZE)
  }, [])

  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)
  const card = deck[idx]

  if (!deck.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <p className="text-lg font-semibold">Chưa có câu để ôn.</p>
        <button onClick={() => navigate('/student/math')}
          className="px-5 py-2.5 rounded-xl font-bold text-white" style={{ background: GRAD }}>← Về hành trình</button>
      </div>
    )
  }

  if (idx >= deck.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-extrabold">Ôn xong {done} câu!</h2>
        <div className="flex gap-3">
          <button onClick={() => navigate('/student/math')}
            className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: GRAD }}>Về hành trình</button>
          <button onClick={() => window.location.reload()}
            className="px-5 py-3 rounded-xl font-bold border inline-flex items-center gap-2"
            style={{ borderColor: 'var(--ai-card-border)' }}>
            <RotateCcw className="w-4 h-4" /> Ôn tiếp
          </button>
        </div>
      </div>
    )
  }

  function rate(rating: 1 | 3 | 4 | 5) {
    recordReview(card.q.id, rating, { subject: 'Math' })
    setDone(d => d + 1)
    setFlipped(false)
    setIdx(i => i + 1)
  }

  const answer = card.q.options[card.q.correctIdx] ?? ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      <MusicToggle top={68} right={14} zIndex={40} />
      {/* Header */}
      <div className="flex items-center gap-4 px-4 sm:px-8 pt-5 pb-2 max-w-xl mx-auto w-full">
        <button onClick={() => navigate('/student/math')} aria-label="Thoát" className="opacity-60 hover:opacity-100">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'hsl(var(--foreground)/0.1)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(idx / deck.length) * 100}%`, background: GRAD }} />
        </div>
        <span className="text-sm font-bold opacity-70">{idx + 1}/{deck.length}</span>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <button onClick={() => setFlipped(true)}
          className="w-full max-w-md min-h-[360px] rounded-3xl p-6 flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--ai-card-bg)', border: '2px solid var(--ai-card-border)' }}>
          <div className="text-[11px] uppercase tracking-wide opacity-50 mb-3">{card.stop.emoji} {card.stop.placeVi} · {card.stop.era}</div>
          {!flipped ? (
            <>
              <MathText as="div" className="text-2xl font-extrabold leading-snug">{card.q.prompt}</MathText>
              {card.q.tikz && <TikzFigure code={card.q.tikz} />}
              <div className="opacity-50 text-sm mt-6">Chạm để xem đáp án</div>
            </>
          ) : (
            <>
              <MathText as="div" className="text-lg font-semibold opacity-80 leading-snug">{card.q.prompt}</MathText>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-xl"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                <CheckCircle2 className="w-5 h-5" /> <MathText as="span">{answer}</MathText>
              </div>
              {card.q.explain && (
                <div className="mt-4 text-sm opacity-85 inline-flex items-start gap-1.5 text-left">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
                  <MathText as="span">{card.q.explain}</MathText>
                </div>
              )}
            </>
          )}
        </button>
      </div>

      {/* Rating buttons (chỉ hiện sau khi lật) */}
      <div className="max-w-md mx-auto w-full px-4 pb-8 pt-2">
        {flipped ? (
          <div className="grid grid-cols-4 gap-2">
            {([['Lại', 1, '#ff4b4b'], ['Khó', 3, '#ff9600'], ['Tốt', 4, '#22d3ee'], ['Dễ', 5, '#7c5cff']] as const).map(
              ([label, r, color]) => (
                <button key={label} onClick={() => rate(r)}
                  className="py-3 rounded-2xl font-bold text-white text-sm" style={{ background: color }}>
                  {label}
                </button>
              ))}
          </div>
        ) : (
          <button onClick={() => setFlipped(true)}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white" style={{ background: GRAD }}>
            Lật thẻ
          </button>
        )}
      </div>
    </div>
  )
}
