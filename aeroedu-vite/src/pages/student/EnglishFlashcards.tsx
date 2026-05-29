/**
 * EnglishFlashcards — ôn từ vựng bằng flashcard + SRS.
 * Route: /student/english/flashcards
 *
 * Ưu tiên từ "đến hạn" theo SRS (lib/srs.ts, subject='English'); nếu chưa đủ,
 * bù thêm từ ngẫu nhiên. Lật thẻ xem nghĩa + ví dụ, phát âm, rồi tự đánh giá
 * (Lại / Khó / Tốt / Dễ) → feed lại SRS để lên lịch ôn.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Volume2, Turtle, RotateCcw } from 'lucide-react'
import { allWords, wordById, type EnWord } from '@/lib/english/curriculum'
import { useEnglishContent } from '@/lib/english/contentApi'
import { speak, speakSlow } from '@/lib/english/speech'
import { getDueCards, recordReview } from '@/lib/srs'

const DECK_SIZE = 15

export default function EnglishFlashcards() {
  const navigate = useNavigate()
  const v = useEnglishContent()

  // Dựng deck: due trước, bù random cho đủ DECK_SIZE
  const deck = useMemo<EnWord[]>(() => {
    const byId = wordById()
    const due = getDueCards(undefined, { subject: 'English', limit: DECK_SIZE })
      .map(r => byId[r.qid]).filter(Boolean) as EnWord[]
    if (due.length >= DECK_SIZE) return due
    const have = new Set(due.map(w => w.id))
    const pool = allWords().filter(w => !have.has(w.id)).sort(() => Math.random() - 0.5)
    return [...due, ...pool].slice(0, DECK_SIZE)
  }, [v])

  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)
  const word = deck[idx]

  if (!deck.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <p className="text-lg font-semibold">Chưa có từ để ôn.</p>
        <button onClick={() => navigate('/student/english')}
          className="px-5 py-2.5 rounded-xl font-bold text-white" style={{ background: '#58cc02' }}>← Về lộ trình</button>
      </div>
    )
  }

  if (idx >= deck.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-extrabold">Ôn xong {done} từ!</h2>
        <div className="flex gap-3">
          <button onClick={() => navigate('/student/english')}
            className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: '#58cc02' }}>Về lộ trình</button>
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
    recordReview(word.id, rating, { subject: 'English' })
    setDone(d => d + 1)
    setFlipped(false)
    setIdx(i => i + 1)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 sm:px-8 pt-5 pb-2 max-w-xl mx-auto w-full">
        <button onClick={() => navigate('/student/english')} aria-label="Thoát" className="opacity-60 hover:opacity-100">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'hsl(var(--foreground)/0.1)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(idx / deck.length) * 100}%`, background: '#1cb0f6' }} />
        </div>
        <span className="text-sm font-bold opacity-70">{idx + 1}/{deck.length}</span>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <button onClick={() => { if (!flipped) { setFlipped(true); speak(word.en) } }}
          className="w-full max-w-md aspect-[3/4] sm:aspect-[4/3] rounded-3xl p-6 flex flex-col items-center justify-center text-center"
          style={{ background: 'var(--ai-card-bg)', border: '2px solid var(--ai-card-border)' }}>
          {!flipped ? (
            <>
              <div className="text-6xl mb-4">{word.emoji || '📘'}</div>
              <div className="text-4xl font-extrabold">{word.en}</div>
              {word.ipa && <div className="opacity-60 mt-2">{word.ipa}</div>}
              <div className="opacity-50 text-sm mt-6">Chạm để xem nghĩa</div>
            </>
          ) : (
            <>
              <div className="text-3xl font-extrabold mb-1">{word.en}</div>
              <div className="text-xl" style={{ color: '#58cc02' }}>{word.vi}</div>
              {word.example && (
                <div className="mt-5 text-sm opacity-80 italic">
                  "{word.example}"
                  {word.exampleVi && <div className="opacity-60 not-italic mt-1">{word.exampleVi}</div>}
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <span onClick={(e) => { e.stopPropagation(); speak(word.en) }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white cursor-pointer" style={{ background: '#1cb0f6' }}>
                  <Volume2 className="w-6 h-6" />
                </span>
                <span onClick={(e) => { e.stopPropagation(); speakSlow(word.en) }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer"
                  style={{ border: '1px solid var(--ai-card-border)' }}>
                  <Turtle className="w-6 h-6" style={{ color: '#1cb0f6' }} />
                </span>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Rating buttons (chỉ hiện sau khi lật) */}
      <div className="max-w-md mx-auto w-full px-4 pb-8 pt-4">
        {flipped ? (
          <div className="grid grid-cols-4 gap-2">
            {([['Lại', 1, '#ff4b4b'], ['Khó', 3, '#ff9600'], ['Tốt', 4, '#1cb0f6'], ['Dễ', 5, '#58cc02']] as const).map(
              ([label, r, color]) => (
                <button key={label} onClick={() => rate(r)}
                  className="py-3 rounded-2xl font-bold text-white text-sm" style={{ background: color }}>
                  {label}
                </button>
              ))}
          </div>
        ) : (
          <button onClick={() => { setFlipped(true); speak(word.en) }}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white" style={{ background: '#1cb0f6' }}>
            Lật thẻ
          </button>
        )}
      </div>
    </div>
  )
}
