/**
 * KeoCoChallenge — public page /kc/:token
 *
 * Async 1v1 flow:
 *   - If creator hasn't played yet → assume current visitor IS the creator (no name re-prompt
 *     since challenge already has creator_name; but we let them edit if they want).
 *   - If creator already played but opponent hasn't → ask name, play, beat the score.
 *   - If both played → show result page.
 *
 * Plays a self-contained quiz (questions delivered in payload), reports answers in batch.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Trophy, Zap, Crown, Clock, CheckCircle2, XCircle } from 'lucide-react'
import keocoService, {
  KcChallenge, KcChallengeSubmitResult,
} from '@/services/keoco.service'

type Phase =
  | 'loading'
  | 'error'
  | 'name_creator'
  | 'name_opponent'
  | 'play'
  | 'submitting'
  | 'result'

export default function KeoCoChallenge() {
  const { token } = useParams<{ token: string }>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [errMsg, setErrMsg] = useState('')
  const [challenge, setChallenge] = useState<KcChallenge | null>(null)
  const [role, setRole] = useState<'creator' | 'opponent'>('creator')
  const [name, setName] = useState('')

  const [qIdx, setQIdx] = useState(0)
  const [answers, setAnswers] = useState<Array<{ questionId: string; answer: string; timeMs: number }>>([])
  const startedAtRef = useRef<number>(Date.now())

  const [result, setResult] = useState<KcChallengeSubmitResult | null>(null)

  useEffect(() => {
    if (!token) return
    keocoService.publicGetChallenge(token)
      .then((c) => {
        setChallenge(c)
        // Decide role/phase
        if (!c.creatorPlayedAt) {
          setRole('creator')
          setName(c.creatorName || '')
          setPhase('name_creator')
        } else if (!c.opponentPlayedAt) {
          setRole('opponent')
          setPhase('name_opponent')
        } else {
          // both played → show result
          setRole('opponent')
          setResult({
            role: 'opponent',
            score: c.opponentScore || 0,
            correct: c.opponentCorrect || 0,
            totalQuestions: c.questionCount,
            totalTimeMs: c.opponentTimeMs || 0,
            winner: c.winner,
            opponentScore: c.creatorScore,
            results: [],
          })
          setPhase('result')
        }
      })
      .catch((e: unknown) => {
        const er = e as { response?: { status?: number }; message?: string }
        if (er?.response?.status === 404) setErrMsg('Không tìm thấy thách đấu này.')
        else setErrMsg(er?.message || 'Lỗi tải')
        setPhase('error')
      })
  }, [token])

  function startPlay() {
    if (!name.trim()) { alert('Vui lòng nhập tên'); return }
    setQIdx(0)
    setAnswers([])
    startedAtRef.current = Date.now()
    setPhase('play')
  }

  async function handlePick(answer: string) {
    if (!challenge) return
    const q = challenge.questions[qIdx]
    if (!q) return
    const next = [...answers, {
      questionId: q.id,
      answer,
      timeMs: Date.now() - startedAtRef.current,
    }]
    setAnswers(next)
    if (qIdx + 1 < challenge.questions.length) {
      setQIdx(qIdx + 1)
      startedAtRef.current = Date.now()
    } else {
      // submit
      setPhase('submitting')
      try {
        const r = await keocoService.publicSubmitChallenge(token!, {
          role,
          name: name.trim(),
          answers: next,
        })
        setResult(r)
        setPhase('result')
      } catch (e: unknown) {
        const er = e as { message?: string }
        setErrMsg(er?.message || 'Không gửi được')
        setPhase('error')
      }
    }
  }

  /* ───── Renders ───── */

  if (phase === 'loading') {
    return <FullCenter><Loader2 className="w-8 h-8 animate-spin text-amber-300" /></FullCenter>
  }

  if (phase === 'error') {
    return (
      <FullCenter>
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-rose-300 text-sm">{errMsg}</p>
        </div>
      </FullCenter>
    )
  }

  if (!challenge) return null

  if (phase === 'name_creator' || phase === 'name_opponent') {
    return (
      <Shell title={challenge.title}>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">⚔️</div>
            <h2 className="text-lg font-bold mb-1">
              {phase === 'name_creator'
                ? 'Bạn là người tạo cuộc thách đấu'
                : `${challenge.creatorName} đã đặt thách đấu cho bạn!`}
            </h2>
            <p className="text-sm text-slate-400">
              {challenge.questionCount} câu · {challenge.timePerQuestion}s/câu · Môn {challenge.subject}
            </p>
          </div>

          {phase === 'name_opponent' && challenge.creatorScore != null && (
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 text-center">
              <div className="text-xs text-amber-300 uppercase tracking-wide mb-1">Điểm cần vượt qua</div>
              <div className="text-3xl font-bold text-amber-300">
                {challenge.creatorScore}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                ({challenge.creatorCorrect}/{challenge.questionCount} đúng · {Math.round((challenge.creatorTimeMs || 0) / 1000)}s)
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">
              Tên của bạn
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Vd: Nguyễn Minh"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base focus:outline-none focus:border-amber-400/50"
            />
          </div>

          <button
            onClick={startPlay}
            disabled={!name.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl py-4 text-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" /> Bắt đầu
          </button>
        </div>
      </Shell>
    )
  }

  if (phase === 'play') {
    const q = challenge.questions[qIdx]
    return (
      <Shell title={challenge.title}>
        <div className="space-y-4">
          <div className="bg-black/30 rounded-lg p-2 flex justify-between text-xs">
            <span className="text-amber-300 font-bold">Câu {qIdx + 1} / {challenge.questions.length}</span>
            <CountdownTimer key={qIdx} duration={challenge.timePerQuestion}
              onExpire={() => handlePick('')} />
          </div>

          {/* Progress dots */}
          <div className="flex gap-1">
            {challenge.questions.map((_, i) => (
              <div key={i}
                className={`flex-1 h-1 rounded-full ${
                  i < qIdx ? 'bg-amber-400' : i === qIdx ? 'bg-amber-300/60' : 'bg-white/10'
                }`} />
            ))}
          </div>

          {q && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="font-medium text-base leading-relaxed mb-4">{q.content}</div>
              <div className="space-y-2">
                {(q.options as Array<unknown>).map((opt, i) => {
                  const text = typeof opt === 'string' ? opt : (opt as { text?: string; label?: string })?.text || (opt as { label?: string })?.label || JSON.stringify(opt)
                  const letter = String.fromCharCode(65 + i)
                  return (
                    <button
                      key={i}
                      onClick={() => handlePick(letter)}
                      className="w-full text-left px-4 py-3 rounded-lg border-2 bg-white/5 border-white/10 hover:border-amber-400 hover:bg-amber-500/5 active:scale-95 text-sm font-medium"
                    >
                      <span className="font-bold text-amber-300 mr-2">{letter}.</span>{text}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Shell>
    )
  }

  if (phase === 'submitting') {
    return (
      <FullCenter>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-amber-300" />
          <p className="text-sm text-slate-300">Đang tính điểm...</p>
        </div>
      </FullCenter>
    )
  }

  // result
  if (!result) return null
  return (
    <Shell title={challenge.title}>
      <ResultView challenge={challenge} result={result} />
    </Shell>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function ResultView({ challenge, result }: { challenge: KcChallenge; result: KcChallengeSubmitResult }) {
  const wonAsCreator = result.role === 'creator'
  const winner = result.winner
  const challengeUrl = challenge.challengeUrl || `${window.location.origin}/kc/${challenge.token}`

  // Creator just played
  if (wonAsCreator) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-6 text-center">
          <Crown className="w-12 h-12 mx-auto mb-2 text-emerald-300" />
          <h2 className="text-xl font-bold mb-1">Điểm chuẩn đã đặt!</h2>
          <p className="text-sm text-slate-400 mb-4">Gửi link cho bạn bè để họ thách đấu</p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Điểm" value={String(result.score)} />
            <Stat label="Đúng" value={`${result.correct}/${result.totalQuestions}`} accent="emerald" />
            <Stat label="Thời gian" value={`${Math.round(result.totalTimeMs / 1000)}s`} accent="amber" />
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(challengeUrl)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg px-5 py-2.5 text-sm">
            📋 Sao chép link thách đấu
          </button>
        </div>
      </div>
    )
  }

  // Opponent finished — show vs creator
  const isWin = winner === 'opponent'
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-6 text-center border ${
        isWin ? 'bg-amber-500/15 border-amber-400/40' : 'bg-rose-500/10 border-rose-400/30'
      }`}>
        <Trophy className={`w-14 h-14 mx-auto mb-2 ${isWin ? 'text-amber-300' : 'text-rose-300'}`} />
        <h2 className="text-2xl font-bold mb-1">
          {isWin ? '🎉 Bạn thắng!' : '😢 Chưa vượt qua...'}
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          {isWin
            ? `Bạn đã đánh bại ${challenge.creatorName}!`
            : `${challenge.creatorName} vẫn giữ kỷ lục`}
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3 text-center">⚔️ Đối đầu</h3>
        <div className="grid grid-cols-2 gap-3">
          <PlayerColumn
            name={challenge.opponentName || 'Bạn'}
            score={result.score}
            correct={`${result.correct}/${result.totalQuestions}`}
            timeS={Math.round(result.totalTimeMs / 1000)}
            highlight={isWin}
          />
          <PlayerColumn
            name={challenge.creatorName}
            score={challenge.creatorScore || 0}
            correct={`${challenge.creatorCorrect || 0}/${challenge.questionCount}`}
            timeS={Math.round((challenge.creatorTimeMs || 0) / 1000)}
            highlight={!isWin}
          />
        </div>
      </div>

      <a href="/dashboard/labtwin/keo-co-app"
        className="block w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl py-3 text-center text-sm">
        Tạo thách đấu của bạn
      </a>
    </div>
  )
}

function PlayerColumn({
  name, score, correct, timeS, highlight,
}: { name: string; score: number; correct: string; timeS: number; highlight: boolean }) {
  return (
    <div className={`rounded-lg p-3 border text-center ${
      highlight ? 'bg-amber-500/15 border-amber-400/40' : 'bg-black/20 border-white/10'
    }`}>
      <div className={`text-xs uppercase tracking-wide mb-1 ${highlight ? 'text-amber-300' : 'text-slate-400'}`}>
        {name}
      </div>
      <div className="text-3xl font-bold text-amber-300 leading-none">{score}</div>
      <div className="text-[10px] text-slate-500 uppercase mt-1">điểm</div>
      <div className="flex justify-around mt-2 text-xs">
        <span className="text-emerald-400">
          <CheckCircle2 className="w-3 h-3 inline mr-0.5" />{correct}
        </span>
        <span className="text-slate-400">
          <Clock className="w-3 h-3 inline mr-0.5" />{timeS}s
        </span>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function CountdownTimer({ duration, onExpire }: { duration: number; onExpire: () => void }) {
  const [left, setLeft] = useState(duration)
  const fired = useRef(false)
  useEffect(() => {
    setLeft(duration)
    fired.current = false
    const start = Date.now()
    const id = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const remain = Math.max(0, duration - elapsed)
      setLeft(remain)
      if (remain <= 0 && !fired.current) {
        fired.current = true
        onExpire()
        window.clearInterval(id)
      }
    }, 200)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])
  return <span className={left < 5 ? 'text-rose-400 font-bold' : 'text-slate-400'}>⏱ {Math.ceil(left)}s</span>
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'rose' | 'amber' }) {
  return (
    <div className="bg-black/30 rounded-lg py-2 text-center">
      <div className={`text-xl font-bold ${
        accent === 'emerald' ? 'text-emerald-400' :
        accent === 'rose' ? 'text-rose-400' :
        'text-amber-300'
      }`}>{value}</div>
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
    </div>
  )
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="px-4 py-3 max-w-md mx-auto flex items-center gap-2">
          <span className="text-xl">⚔️</span>
          <div className="font-bold text-sm truncate">{title}</div>
        </div>
      </header>
      <main className="max-w-md mx-auto px-3 py-4">{children}</main>
    </div>
  )
}

function FullCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      {children}
    </div>
  )
}
