/**
 * MathLesson — trình chơi bài Toán (trắc nghiệm + giải thích + bối cảnh).
 * Route: /student/math/:lessonId
 */
import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, X, Check, ArrowRight, Star, Flame, Trophy, RotateCcw, Lightbulb } from 'lucide-react'
import { MathText } from '@/components/common/MathText'
import { getLesson } from '@/lib/math/curriculum'
import { getHearts, loseHeart, refillHearts, completeLesson, minutesToNextHeart, MAX_HEARTS } from '@/lib/math/progress'

const GRAD = 'linear-gradient(135deg,#d4a017 0%,#7c5cff 100%)' // cổ đại → hiện đại
const CORRECT = '#22c55e'
const WRONG = '#ff4b4b'

function beep(ok: boolean) {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination)
    o.type = 'sine'; o.frequency.value = ok ? 880 : 200
    g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.16, ac.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22); o.start(); o.stop(ac.currentTime + 0.24)
  } catch { /* ignore */ }
}

export default function MathLesson() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const found = useMemo(() => getLesson(lessonId), [lessonId])
  const questions = found?.lesson.questions || []

  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [hearts, setHearts] = useState(() => getHearts())
  const [correct, setCorrect] = useState(0)
  const [phase, setPhase] = useState<'play' | 'done'>('play')
  const [result, setResult] = useState<ReturnType<typeof completeLesson> | null>(null)

  if (!found) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <p className="text-lg font-semibold">Không tìm thấy bài học</p>
        <button onClick={() => navigate('/student/math')} className="px-5 py-2.5 rounded-xl font-bold text-white" style={{ background: GRAD }}>← Về hành trình</button>
      </div>
    )
  }

  if (hearts <= 0 && phase !== 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 text-center px-6" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <Heart className="w-16 h-16" style={{ color: WRONG }} />
        <h2 className="text-2xl font-extrabold">Hết tim rồi!</h2>
        <p className="opacity-70 max-w-sm">Tim hồi sau <b>{minutesToNextHeart()} phút</b>, hoặc nạp đầy để học tiếp.</p>
        <div className="flex gap-3">
          <button onClick={() => { refillHearts(); setHearts(MAX_HEARTS) }} className="px-5 py-3 rounded-xl font-bold text-white" style={{ background: GRAD }}>❤️ Nạp đầy tim</button>
          <button onClick={() => navigate('/student/math')} className="px-5 py-3 rounded-xl font-bold border" style={{ borderColor: 'var(--ai-card-border)' }}>Để sau</button>
        </div>
      </div>
    )
  }

  if (phase === 'done' && result) {
    const acc = questions.length ? Math.round((correct / questions.length) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <Trophy className="w-20 h-20" style={{ color: '#ffc800' }} />
        <h2 className="text-3xl font-extrabold">Hoàn thành chặng! 🎉</h2>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => <Star key={s} className="w-10 h-10" fill={s <= result.stars ? '#ffc800' : 'transparent'} style={{ color: s <= result.stars ? '#ffc800' : 'hsl(var(--foreground)/0.3)' }} />)}
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-4 rounded-2xl" style={{ background: 'rgba(255,200,0,0.12)', border: '1px solid rgba(255,200,0,0.3)' }}>
            <div className="text-2xl font-extrabold" style={{ color: '#ffc800' }}>+{result.xpGained}</div><div className="text-xs opacity-70 mt-1">XP</div>
          </div>
          <div className="px-6 py-4 rounded-2xl" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <div className="text-2xl font-extrabold" style={{ color: CORRECT }}>{acc}%</div><div className="text-xs opacity-70 mt-1">đúng</div>
          </div>
          <div className="px-6 py-4 rounded-2xl" style={{ background: 'rgba(255,150,0,0.12)', border: '1px solid rgba(255,150,0,0.3)' }}>
            <div className="text-2xl font-extrabold flex items-center gap-1" style={{ color: '#ff9600' }}><Flame className="w-5 h-5" /> {result.streakDays}</div><div className="text-xs opacity-70 mt-1">streak</div>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button onClick={() => navigate('/student/math')} className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: GRAD }}>Tiếp tục hành trình</button>
          <button onClick={() => window.location.reload()} className="px-5 py-3 rounded-xl font-bold border inline-flex items-center gap-2" style={{ borderColor: 'var(--ai-card-border)' }}><RotateCcw className="w-4 h-4" /> Làm lại</button>
        </div>
      </div>
    )
  }

  const qn = questions[idx]
  const answered = picked !== null
  const isRight = answered && picked === qn.correctIdx
  const progressPct = Math.round((idx / questions.length) * 100)

  function answer(i: number) {
    if (answered) return
    setPicked(i)
    const ok = i === qn.correctIdx
    beep(ok)
    if (ok) setCorrect(c => c + 1)
    else { const h = loseHeart(); setHearts(h) }
  }
  function next() {
    if (idx + 1 >= questions.length || hearts <= 0) {
      const pct = Math.round((correct / questions.length) * 100)
      setResult(completeLesson(found!.lesson.id, pct)); setPhase('done')
    } else { setIdx(i => i + 1); setPicked(null) }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 sm:px-8 pt-5 pb-2 max-w-2xl mx-auto w-full">
        <button onClick={() => navigate('/student/math')} aria-label="Thoát" className="opacity-60 hover:opacity-100"><X className="w-6 h-6" /></button>
        <div className="flex-1 h-3.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--foreground)/0.1)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: GRAD }} />
        </div>
        <div className="flex items-center gap-1 font-bold" style={{ color: WRONG }}><Heart className="w-5 h-5" fill={WRONG} /> {hearts}</div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-8 py-6">
        <div className="text-xs uppercase tracking-wide opacity-50 mb-2">{found.stop.emoji} {found.stop.placeVi} · {found.stop.era}</div>
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)' }}>
          <MathText as="div" className="text-lg font-semibold leading-snug">{qn.prompt}</MathText>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {qn.options.map((opt, i) => {
            const isPick = picked === i, isAns = i === qn.correctIdx
            let bg = 'var(--ai-card-bg)', border = 'var(--ai-card-border)', color = 'hsl(var(--foreground))'
            if (answered && isAns) { bg = 'rgba(34,197,94,0.15)'; border = CORRECT; color = CORRECT }
            else if (isPick && !isAns) { bg = 'rgba(255,75,75,0.12)'; border = WRONG; color = WRONG }
            return (
              <button key={i} disabled={answered} onClick={() => answer(i)}
                className="px-4 py-4 rounded-2xl font-semibold text-left flex items-center gap-3 transition-colors"
                style={{ background: bg, border: `2px solid ${border}`, color }}>
                <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(124,92,255,0.18)', color: '#a78bfa' }}>{String.fromCharCode(65 + i)}</span>
                <MathText as="span">{opt}</MathText>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback */}
      {answered && (
        <div className="w-full" style={{ background: isRight ? 'rgba(34,197,94,0.1)' : 'rgba(255,75,75,0.08)', borderTop: `2px solid ${isRight ? CORRECT : WRONG}` }}>
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-extrabold inline-flex items-center gap-2 mb-1" style={{ color: isRight ? CORRECT : WRONG }}>
                  {isRight ? <><Check className="w-5 h-5" /> Chính xác!</> : <><X className="w-5 h-5" /> Chưa đúng</>}
                </div>
                <div className="text-sm opacity-85 inline-flex items-start gap-1.5"><Lightbulb className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#ffc800' }} /><span>{qn.explain}</span></div>
              </div>
              <button onClick={next} className="px-6 py-3 rounded-2xl font-extrabold text-white inline-flex items-center gap-2 shrink-0" style={{ background: isRight ? GRAD : WRONG }}>
                {idx + 1 >= questions.length || hearts <= 0 ? 'Kết thúc' : 'Tiếp'} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
