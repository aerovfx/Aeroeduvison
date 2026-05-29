/**
 * EnglishLesson — trình chơi bài học kiểu Duolingo.
 * Route: /student/english/:lessonId
 *
 * Sinh chuỗi exercise từ từ vựng → trả lời từng câu → mất tim khi sai →
 * màn kết quả (XP, sao, streak). Ghi SRS để lên lịch ôn lại từ.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Heart, X, Volume2, Turtle, Check, ArrowRight, Star, Flame, Trophy, RotateCcw, Mic,
} from 'lucide-react'
import { getLesson, allWords } from '@/lib/english/curriculum'
import { useEnglishContent } from '@/lib/english/contentApi'
import { generateExercises, type Exercise } from '@/lib/english/exercises'
import { speak, speakSlow, recognizeOnce, speechRecognitionSupported } from '@/lib/english/speech'
import {
  getHearts, loseHeart, refillHearts, completeLesson, minutesToNextHeart, MAX_HEARTS,
} from '@/lib/english/progress'
import { recordReview } from '@/lib/srs'
import { ENG } from '@/lib/english/theme'

// Âm phản hồi nhẹ (không phụ thuộc lib ngoài)
let _ac: AudioContext | null = null
function beep(ok: boolean) {
  try {
    _ac = _ac || new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = _ac.createOscillator(), g = _ac.createGain()
    o.connect(g); g.connect(_ac.destination)
    o.type = 'sine'
    o.frequency.value = ok ? 880 : 200
    g.gain.setValueAtTime(0.0001, _ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.18, _ac.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, _ac.currentTime + 0.22)
    o.start(); o.stop(_ac.currentTime + 0.24)
  } catch { /* ignore */ }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ')

export default function EnglishLesson() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const v = useEnglishContent() // đảm bảo có bản admin khi deep-link thẳng vào bài
  const found = useMemo(() => getLesson(lessonId), [lessonId, v])
  const exercises = useMemo(
    () => (found ? generateExercises(found.lesson.words, allWords()) : []),
    [found],
  )

  const [idx, setIdx] = useState(0)
  const [hearts, setHearts] = useState(() => getHearts())
  const [phase, setPhase] = useState<'answering' | 'feedback' | 'done'>('answering')
  const [lastCorrect, setLastCorrect] = useState(false)
  const correctFirstTry = useRef(0)
  const gradedTotal = useRef(0)
  const answeredIds = useRef<Set<string>>(new Set())
  const [result, setResult] = useState<ReturnType<typeof completeLesson> | null>(null)

  const total = exercises.length
  const ex = exercises[idx]

  // Tự phát âm khi vào câu nghe / từ mới
  useEffect(() => {
    if (!ex) return
    if (ex.kind === 'listen') speak(ex.word.en)
    if (ex.kind === 'repeat') speak(ex.word.en)
  }, [idx, ex])

  if (!found) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6"
        style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <p className="text-lg font-semibold">Không tìm thấy bài học</p>
        <button onClick={() => navigate('/student/english')}
          className="px-5 py-2.5 rounded-xl font-bold text-white" style={{ background: ENG.primary }}>
          ← Về lộ trình
        </button>
      </div>
    )
  }

  // Hết tim
  if (hearts <= 0 && phase !== 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 text-center px-6"
        style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <Heart className="w-16 h-16" style={{ color: '#ff4b4b' }} />
        <h2 className="text-2xl font-extrabold">Hết tim rồi!</h2>
        <p className="opacity-70 max-w-sm">
          Tim sẽ tự hồi sau <b>{minutesToNextHeart()} phút</b>, hoặc nạp đầy để học tiếp ngay.
        </p>
        <div className="flex gap-3">
          <button onClick={() => { refillHearts(); setHearts(MAX_HEARTS) }}
            className="px-5 py-3 rounded-xl font-bold text-white" style={{ background: ENG.cyan }}>
            ❤️ Nạp đầy tim (miễn phí)
          </button>
          <button onClick={() => navigate('/student/english')}
            className="px-5 py-3 rounded-xl font-bold border" style={{ borderColor: 'var(--ai-card-border)' }}>
            Để sau
          </button>
        </div>
      </div>
    )
  }

  // ── Màn kết quả ──────────────────────────────────────────────
  if (phase === 'done' && result) {
    const stars = result.stars
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6"
        style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <Trophy className="w-20 h-20" style={{ color: '#ffc800' }} />
        <h2 className="text-3xl font-extrabold">Hoàn thành bài học! 🎉</h2>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <Star key={s} className="w-10 h-10"
              fill={s <= stars ? '#ffc800' : 'transparent'}
              style={{ color: s <= stars ? '#ffc800' : 'hsl(var(--foreground)/0.3)' }} />
          ))}
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-4 rounded-2xl" style={{ background: 'rgba(255,200,0,0.12)', border: '1px solid rgba(255,200,0,0.3)' }}>
            <div className="text-2xl font-extrabold" style={{ color: '#ffc800' }}>+{result.xpGained}</div>
            <div className="text-xs opacity-70 mt-1">XP</div>
          </div>
          <div className="px-6 py-4 rounded-2xl" style={{ background: 'rgba(255,150,0,0.12)', border: '1px solid rgba(255,150,0,0.3)' }}>
            <div className="text-2xl font-extrabold flex items-center gap-1" style={{ color: '#ff9600' }}>
              <Flame className="w-5 h-5" /> {result.streakDays}
            </div>
            <div className="text-xs opacity-70 mt-1">ngày streak</div>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate('/student/english')}
            className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: ENG.primaryGrad }}>
            Tiếp tục lộ trình
          </button>
          <button onClick={() => window.location.reload()}
            className="px-5 py-3 rounded-xl font-bold border inline-flex items-center gap-2"
            style={{ borderColor: 'var(--ai-card-border)' }}>
            <RotateCcw className="w-4 h-4" /> Học lại
          </button>
        </div>
      </div>
    )
  }

  // ── Xử lý chấm 1 câu ─────────────────────────────────────────
  // countable=false cho bài "repeat" (luyện phát âm) — không tính điểm/tim.
  function grade(ok: boolean, wordId?: string, countable = true) {
    beep(ok)
    setLastCorrect(ok)
    setPhase('feedback')
    if (wordId && !answeredIds.current.has(wordId)) {
      answeredIds.current.add(wordId)
      // SRS: đúng → rating 4, sai → rating 1
      recordReview(wordId, ok ? 4 : 1, { subject: 'English', topic: found!.destination.id })
    }
    if (countable) {
      gradedTotal.current += 1
      if (ok) correctFirstTry.current += 1
      else { const h = loseHeart(); setHearts(h) }
    }
  }

  function next() {
    if (idx + 1 >= total) {
      const denom = gradedTotal.current || 1
      const pct = Math.round((correctFirstTry.current / denom) * 100)
      const r = completeLesson(found!.lesson.id, pct)
      setResult(r)
      setPhase('done')
    } else {
      setIdx(i => i + 1)
      setPhase('answering')
    }
  }

  const progressPct = Math.round((idx / total) * 100)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      {/* Header: thoát + progress + tim */}
      <div className="flex items-center gap-4 px-4 sm:px-8 pt-5 pb-2 max-w-2xl mx-auto w-full">
        <button onClick={() => navigate('/student/english')} aria-label="Thoát" className="opacity-60 hover:opacity-100">
          <X className="w-6 h-6" />
        </button>
        <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--foreground)/0.1)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: ENG.primaryGrad }} />
        </div>
        <div className="flex items-center gap-1 font-bold" style={{ color: '#ff4b4b' }}>
          <Heart className="w-5 h-5" fill="#ff4b4b" /> {hearts}
        </div>
      </div>

      {/* Thân câu hỏi — KHÔNG flex-1: dồn lên cao, nút "Tiếp tục" sát đáp án dễ bấm */}
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 py-6">
        {ex && <ExerciseView ex={ex} phase={phase} onGrade={grade} />}
      </div>

      {/* Thanh feedback + nút tiếp */}
      <FeedbackBar phase={phase} correct={lastCorrect} ex={ex} onNext={next} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Render 1 exercise theo kind
// ════════════════════════════════════════════════════════════════
function ExerciseView({ ex, phase, onGrade }: {
  ex: Exercise; phase: string; onGrade: (ok: boolean, wordId?: string, countable?: boolean) => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  // match state
  const [selEn, setSelEn] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [matchMistake, setMatchMistake] = useState(false)
  // speak (mic)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const [micErr, setMicErr] = useState<string | null>(null)
  const matchCols = useMemo(() => {
    if (ex.kind !== 'match') return null
    return { en: ex.pairs, vi: [...ex.pairs].sort(() => Math.random() - 0.5) }
  }, [ex])

  // reset khi đổi câu
  useEffect(() => {
    setPicked(null); setTyped(''); setSelEn(null); setMatched(new Set()); setMatchMistake(false)
    setListening(false); setHeard(null); setMicErr(null)
  }, [ex])

  const disabled = phase !== 'answering'

  // ─ Chọn đáp án (choose-meaning / choose-word / listen) ─
  if (ex.kind === 'choose-meaning' || ex.kind === 'choose-word' || ex.kind === 'listen') {
    const prompt =
      ex.kind === 'choose-meaning' ? 'Chọn nghĩa đúng' :
      ex.kind === 'choose-word' ? 'Chọn từ tiếng Anh' : 'Nghe và chọn từ đã nghe'
    return (
      <div>
        <h2 className="text-xl font-bold mb-6">{prompt}</h2>

        {/* Đề bài */}
        {ex.kind === 'choose-meaning' && (
          <button onClick={() => speak(ex.word.en)}
            className="flex items-center gap-3 mb-8 px-5 py-4 rounded-2xl mx-auto"
            style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)' }}>
            <Volume2 className="w-7 h-7" style={{ color: ENG.cyan }} />
            <div className="text-left">
              <div className="text-2xl font-extrabold">{ex.word.emoji} {ex.word.en}</div>
              {ex.word.ipa && <div className="text-sm opacity-60">{ex.word.ipa}</div>}
            </div>
          </button>
        )}
        {ex.kind === 'choose-word' && (
          <div className="text-center mb-8">
            <div className="text-3xl font-extrabold">{ex.word.emoji} {ex.word.vi}</div>
          </div>
        )}
        {ex.kind === 'listen' && (
          <div className="flex justify-center gap-3 mb-8">
            <button onClick={() => speak(ex.word.en)}
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white"
              style={{ background: ENG.cyan }}>
              <Volume2 className="w-9 h-9" />
            </button>
            <button onClick={() => speakSlow(ex.word.en)}
              className="w-14 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)' }}>
              <Turtle className="w-7 h-7" style={{ color: ENG.cyan }} />
            </button>
          </div>
        )}

        {/* Lựa chọn */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ex.options.map(opt => {
            const isPicked = picked === opt
            const isAnswer = opt === ex.answer
            let bg = 'var(--ai-card-bg)', border = 'var(--ai-card-border)', color = 'hsl(var(--foreground))'
            if (disabled && isAnswer) { bg = 'rgba(88,204,2,0.15)'; border = ENG.correct; color = ENG.correct }
            else if (disabled && isPicked && !isAnswer) { bg = 'rgba(255,75,75,0.12)'; border = '#ff4b4b'; color = '#ff4b4b' }
            else if (isPicked) { border = ENG.cyan }
            return (
              <button key={opt} disabled={disabled}
                onClick={() => { setPicked(opt); onGrade(opt === ex.answer, ex.word.id) }}
                className="px-4 py-4 rounded-2xl font-semibold text-left transition-colors"
                style={{ background: bg, border: `2px solid ${border}`, color }}>
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ─ Gõ lại từ ─
  if (ex.kind === 'type') {
    const ok = norm(typed) === norm(ex.answer)
    return (
      <div>
        <h2 className="text-xl font-bold mb-6">Gõ từ tiếng Anh</h2>
        <button onClick={() => speak(ex.word.en)}
          className="flex items-center gap-3 mb-6 px-5 py-4 rounded-2xl mx-auto"
          style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)' }}>
          <Volume2 className="w-6 h-6" style={{ color: ENG.cyan }} />
          <span className="text-2xl font-extrabold">{ex.word.emoji} {ex.word.vi}</span>
        </button>
        <input
          autoFocus value={typed} disabled={disabled}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && typed.trim() && !disabled) onGrade(ok, ex.word.id) }}
          placeholder="Gõ vào đây…"
          className="w-full px-5 py-4 rounded-2xl text-lg outline-none"
          style={{ background: 'var(--ai-card-bg)', border: '2px solid var(--ai-card-border)', color: 'hsl(var(--foreground))' }}
        />
        {!disabled && (
          <button onClick={() => onGrade(ok, ex.word.id)} disabled={!typed.trim()}
            className="mt-5 w-full py-3.5 rounded-2xl font-extrabold text-white disabled:opacity-40"
            style={{ background: ENG.primaryGrad }}>
            Kiểm tra
          </button>
        )}
      </div>
    )
  }

  // ─ Nghe & nhắc lại (luyện phát âm) ─
  if (ex.kind === 'repeat') {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold mb-6">Nghe và nhắc lại 🔊</h2>
        <div className="text-4xl font-extrabold mb-2">{ex.word.emoji} {ex.word.en}</div>
        {ex.word.ipa && <div className="opacity-60 mb-1">{ex.word.ipa}</div>}
        <div className="opacity-70 mb-8">{ex.word.vi}</div>
        <div className="flex justify-center gap-3 mb-8">
          <button onClick={() => speak(ex.word.en)}
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white" style={{ background: ENG.cyan }}>
            <Volume2 className="w-9 h-9" />
          </button>
          <button onClick={() => speakSlow(ex.word.en)}
            className="w-14 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)' }}>
            <Turtle className="w-7 h-7" style={{ color: ENG.cyan }} />
          </button>
        </div>
        {!disabled && (
          <button onClick={() => onGrade(true, ex.word.id, false)}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white" style={{ background: ENG.primaryGrad }}>
            <Check className="w-5 h-5 inline mr-1" /> Tôi đã nói được
          </button>
        )}
      </div>
    )
  }

  // ─ Nói vào mic (nhận dạng giọng nói) ─
  if (ex.kind === 'speak') {
    const supported = speechRecognitionSupported()
    const startListen = () => {
      setHeard(null); setMicErr(null); setListening(true)
      recognizeOnce({
        lang: 'en',
        onResult: (t) => {
          setHeard(t)
          const ok = norm(t).includes(norm(ex.word.en)) || norm(ex.word.en).includes(norm(t))
          if (ok) onGrade(true, ex.word.id, true)
        },
        onError: (e) => { setMicErr(e); setListening(false) },
        onEnd: () => setListening(false),
      })
    }
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold mb-6">Nói theo 🎤</h2>
        <div className="text-4xl font-extrabold mb-2">{ex.word.emoji} {ex.word.en}</div>
        {ex.word.ipa && <div className="opacity-60 mb-1">{ex.word.ipa}</div>}
        <div className="opacity-70 mb-6">{ex.word.vi}</div>

        <button onClick={() => speak(ex.word.en)}
          className="mb-6 px-4 py-2 rounded-xl inline-flex items-center gap-2 font-semibold"
          style={{ border: '1px solid var(--ai-card-border)', color: ENG.cyan }}>
          <Volume2 className="w-5 h-5" /> Nghe mẫu
        </button>

        {supported ? (
          <div className="flex flex-col items-center gap-3">
            <button disabled={disabled || listening} onClick={startListen}
              className="w-24 h-24 rounded-full flex items-center justify-center text-white disabled:opacity-60"
              style={{ background: listening ? ENG.coral : ENG.primaryGrad, boxShadow: listening ? `0 0 0 8px ${ENG.coral}33` : 'none' }}>
              <Mic className={`w-10 h-10 ${listening ? 'animate-pulse' : ''}`} />
            </button>
            <div className="text-sm font-semibold opacity-80">
              {listening ? 'Đang nghe… hãy nói rõ' : 'Nhấn micro rồi đọc to từ trên'}
            </div>
            {heard && (
              <div className="text-sm">Bạn nói: <b style={{ color: ENG.cyan }}>"{heard}"</b></div>
            )}
            {micErr === 'not-allowed' && (
              <div className="text-sm" style={{ color: ENG.wrong }}>Cần cấp quyền micro cho trình duyệt để luyện nói.</div>
            )}
            {micErr === 'no-speech' && (
              <div className="text-sm opacity-70">Chưa nghe rõ — thử lại nhé.</div>
            )}
            {!disabled && (
              <button onClick={() => onGrade(true, ex.word.id, false)} className="mt-1 text-sm underline opacity-60">
                Bỏ qua
              </button>
            )}
          </div>
        ) : (
          !disabled && (
            <button onClick={() => onGrade(true, ex.word.id, false)}
              className="w-full py-3.5 rounded-2xl font-extrabold text-white" style={{ background: ENG.primaryGrad }}>
              <Check className="w-5 h-5 inline mr-1" /> Tôi đã nói được
            </button>
          )
        )}
      </div>
    )
  }

  // ─ Ghép cặp EN ↔ VI ─
  if (ex.kind === 'match' && matchCols) {
    const allDone = matched.size === ex.pairs.length
    const tapEn = (id: string) => { if (matched.has(id)) return; setSelEn(id) }
    const tapVi = (id: string) => {
      if (matched.has(id) || !selEn) return
      if (selEn === id) {
        const m = new Set(matched); m.add(id); setMatched(m); setSelEn(null)
        const word = ex.pairs.find(p => p.id === id)
        speak(word?.en || '')
        if (m.size === ex.pairs.length) onGrade(!matchMistake) // câu match không gắn 1 wordId
      } else {
        setMatchMistake(true); setSelEn(null); beep(false)
      }
    }
    return (
      <div>
        <h2 className="text-xl font-bold mb-6">Ghép cặp từ ↔ nghĩa</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-3">
            {matchCols.en.map(p => (
              <button key={'en' + p.id} disabled={matched.has(p.id)} onClick={() => { tapEn(p.id); speak(p.en) }}
                className="px-4 py-3.5 rounded-2xl font-semibold transition-colors"
                style={{
                  background: matched.has(p.id) ? 'rgba(88,204,2,0.12)' : selEn === p.id ? 'rgba(28,176,246,0.15)' : 'var(--ai-card-bg)',
                  border: `2px solid ${matched.has(p.id) ? ENG.correct : selEn === p.id ? ENG.cyan : 'var(--ai-card-border)'}`,
                  opacity: matched.has(p.id) ? 0.5 : 1,
                }}>
                {p.en}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {matchCols.vi.map(p => (
              <button key={'vi' + p.id} disabled={matched.has(p.id)} onClick={() => tapVi(p.id)}
                className="px-4 py-3.5 rounded-2xl font-semibold transition-colors"
                style={{
                  background: matched.has(p.id) ? 'rgba(88,204,2,0.12)' : 'var(--ai-card-bg)',
                  border: `2px solid ${matched.has(p.id) ? ENG.correct : 'var(--ai-card-border)'}`,
                  opacity: matched.has(p.id) ? 0.5 : 1,
                }}>
                {p.vi}
              </button>
            ))}
          </div>
        </div>
        {allDone && <p className="mt-4 text-center font-semibold" style={{ color: ENG.correct }}>Tuyệt vời! ✓</p>}
      </div>
    )
  }

  return null
}

// ════════════════════════════════════════════════════════════════
function FeedbackBar({ phase, correct, ex, onNext }: {
  phase: string; correct: boolean; ex?: Exercise; onNext: () => void
}) {
  if (phase !== 'feedback') return <div className="h-4" />
  const word = ex && 'word' in ex ? ex.word : undefined
  return (
    <div className="w-full" style={{
      background: correct ? 'rgba(88,204,2,0.12)' : 'rgba(255,75,75,0.10)',
      borderTop: `2px solid ${correct ? ENG.correct : '#ff4b4b'}`,
    }}>
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 py-5 flex items-center justify-between gap-4">
        <div>
          <div className="font-extrabold flex items-center gap-2" style={{ color: correct ? ENG.correct : '#ff4b4b' }}>
            {correct ? <><Check className="w-5 h-5" /> Chính xác!</> : <><X className="w-5 h-5" /> Chưa đúng</>}
          </div>
          {!correct && word && (
            <div className="text-sm mt-1 opacity-80">Đáp án: <b>{word.en}</b> — {word.vi}</div>
          )}
        </div>
        <button onClick={onNext}
          className="px-7 py-3 rounded-2xl font-extrabold text-white inline-flex items-center gap-2 shrink-0"
          style={{ background: correct ? ENG.correct : '#ff4b4b' }}>
          Tiếp tục <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
