/**
 * KeoCoLive — public page /kl/:token
 *
 * Synchronous 2-player live match. Both players scan QR; first to scan
 * waits in lobby until the second joins. Then both answer the same questions
 * in parallel; the polling backend advances when both have answered (or the
 * timer expires). Player UI always shows opponent's progress and live score.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Trophy, Clock, CheckCircle2, XCircle, Users } from 'lucide-react'
import keocoService, {
  KcLivePublicLobby, KcLivePlayerState, KcLiveAnswerResult,
} from '@/services/keoco.service'

type Phase =
  | 'loading'
  | 'error'
  | 'name'
  | 'waiting'
  | 'playing'
  | 'finished'

export default function KeoCoLive() {
  const { token } = useParams<{ token: string }>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [errMsg, setErrMsg] = useState('')
  const [lobby, setLobby] = useState<KcLivePublicLobby | null>(null)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [playerToken, setPlayerToken] = useState<string | null>(null)
  const [state, setState] = useState<KcLivePlayerState | null>(null)
  const [lastResult, setLastResult] = useState<KcLiveAnswerResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const startedAtRef = useRef<number>(Date.now())
  const lastQuestionIdxRef = useRef<number>(-1)
  const pollRef = useRef<number | null>(null)

  // Initial lobby fetch
  useEffect(() => {
    if (!token) return
    keocoService.publicGetLive(token)
      .then((l) => {
        setLobby(l)
        if (l.status === 'finished') {
          setErrMsg('Trận đấu này đã kết thúc.')
          setPhase('error')
        } else if (l.full && !playerToken) {
          setErrMsg('Trận đấu đã đủ 2 người chơi. Vui lòng tham gia trận khác.')
          setPhase('error')
        } else {
          setPhase('name')
        }
      })
      .catch((e: unknown) => {
        const er = e as { response?: { status?: number }; message?: string }
        if (er?.response?.status === 404) setErrMsg('Không tìm thấy trận đấu này.')
        else setErrMsg(er?.message || 'Lỗi tải')
        setPhase('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Poll player state once joined
  useEffect(() => {
    if (!token || !playerToken) return
    let stop = false
    async function tick() {
      try {
        const s = await keocoService.publicLiveState(token!, playerToken!)
        if (stop) return
        setState(s)
        if (s.session.status === 'running' && phase !== 'playing') {
          // Match started, switch to playing UI
          startedAtRef.current = Date.now()
          lastQuestionIdxRef.current = s.session.currentIndex
          setLastResult(null)
          setPhase('playing')
        } else if (s.session.status === 'finished') {
          setPhase('finished')
        } else if (s.session.status === 'waiting') {
          setPhase('waiting')
        } else if (s.session.status === 'running') {
          // Question changed → reset timer & cleared answer indicator
          if (s.session.currentIndex !== lastQuestionIdxRef.current) {
            lastQuestionIdxRef.current = s.session.currentIndex
            startedAtRef.current = Date.now()
            setLastResult(null)
          }
        }
      } catch (e) {
        console.error('poll state', e)
      }
    }
    tick()
    pollRef.current = window.setInterval(tick, 1200)
    return () => {
      stop = true
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, playerToken])

  async function join() {
    if (!token) return
    if (!name.trim()) { alert('Vui lòng nhập tên'); return }
    setJoining(true)
    try {
      const r = await keocoService.publicJoinLive(token, { name: name.trim() })
      setPlayerToken(r.playerToken)
      setPhase(r.waiting ? 'waiting' : 'playing')
    } catch (e: unknown) {
      const er = e as { message?: string }
      alert(er?.message || 'Không thể tham gia. Có thể trận đấu đã đủ người.')
    } finally {
      setJoining(false)
    }
  }

  async function pick(answer: string) {
    if (!token || !playerToken || !state || !state.currentQuestion) return
    if (state.alreadyAnswered || submitting) return
    setSubmitting(true)
    try {
      const timeMs = Date.now() - startedAtRef.current
      const r = await keocoService.publicLiveAnswer(token, {
        playerToken,
        questionIdx: state.currentQuestion.index,
        answer,
        timeMs,
      })
      setLastResult(r)
    } catch (e: unknown) {
      const er = e as { message?: string }
      console.error('answer', er?.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────

  if (phase === 'loading') {
    return (
      <FullScreen>
        <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
        <p className="text-slate-400 mt-3 text-sm">Đang tải trận đấu...</p>
      </FullScreen>
    )
  }

  if (phase === 'error') {
    return (
      <FullScreen>
        <div className="bg-rose-500/10 border border-rose-400/30 rounded-2xl p-8 max-w-md text-center">
          <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Có lỗi</h2>
          <p className="text-rose-300 text-sm">{errMsg}</p>
        </div>
      </FullScreen>
    )
  }

  if (phase === 'name') {
    return (
      <FullScreen>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md w-full">
          <div className="text-center mb-5">
            <span className="text-5xl">⚡</span>
            <h2 className="text-2xl font-bold mt-2">{lobby?.title || 'Đấu Live'}</h2>
            <p className="text-sm text-slate-400 mt-1">
              {lobby?.subject} · {lobby?.grade} · {lobby?.questionCount} câu · {lobby?.timePerQuestion}s/câu
            </p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-400/20 rounded-lg p-3 mb-4 text-sm text-cyan-200 text-center flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span>{lobby?.playerCount || 0}/2 người chơi đã tham gia</span>
          </div>
          <label className="block mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">Tên của bạn</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vd: Minh Anh"
              maxLength={40}
              autoFocus
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-3 text-base focus:outline-none focus:border-cyan-400/50"
              onKeyDown={(e) => { if (e.key === 'Enter') join() }}
            />
          </label>
          <button
            onClick={join}
            disabled={joining || !name.trim()}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold rounded-lg py-3 text-base disabled:opacity-50"
          >
            {joining ? 'Đang tham gia...' : 'Tham gia trận đấu'}
          </button>
        </div>
      </FullScreen>
    )
  }

  if (phase === 'waiting') {
    return (
      <FullScreen>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md text-center">
          <div className="relative inline-block mb-4">
            <Loader2 className="w-16 h-16 animate-spin text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Đang chờ đối thủ...</h2>
          <p className="text-sm text-slate-400 mb-4">
            Bạn đã sẵn sàng. Trận đấu sẽ tự động bắt đầu khi đủ 2 người.
          </p>
          {state?.me && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              state.me.slot === 'red'
                ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40'
                : 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
            }`}>
              ✓ Bạn là {state.me.name} (Đội {state.me.slot === 'red' ? 'ĐỎ' : 'XANH'})
            </div>
          )}
          <div className="text-xs text-slate-500 mt-4">
            {state?.session.playerCount || 1}/2 người
          </div>
        </div>
      </FullScreen>
    )
  }

  if (phase === 'playing' && state) {
    const q = state.currentQuestion
    const me = state.me
    const opp = state.opponent
    const myColor = me?.slot === 'red' ? 'rose' : 'cyan'
    const oppColor = opp?.slot === 'red' ? 'rose' : 'cyan'
    const elapsed = state.session.currentStartedAt
      ? (Date.now() - new Date(state.session.currentStartedAt).getTime()) / 1000
      : 0
    const timeLeft = Math.max(0, Math.round(state.session.timePerQuestion - elapsed))
    const isMyTurnDone = state.alreadyAnswered

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* ── Live header / scoreboard mini ── */}
        <div className="sticky top-0 bg-black/60 backdrop-blur border-b border-white/10 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              {/* Me */}
              <div className={`text-left ${myColor === 'rose' ? 'text-rose-300' : 'text-cyan-300'}`}>
                <div className="text-[10px] uppercase tracking-wider opacity-70">{me?.slot === 'red' ? 'ĐỎ' : 'XANH'} (Bạn)</div>
                <div className="font-bold text-sm truncate">{me?.name}</div>
                <div className="text-2xl font-black font-mono">{me?.score ?? 0}</div>
              </div>
              {/* Center: progress + timer */}
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Câu</div>
                <div className="text-2xl font-bold font-mono">
                  {Math.min(state.session.currentIndex + 1, state.session.questionCount)}
                  <span className="text-slate-500 text-base"> / {state.session.questionCount}</span>
                </div>
                <div className="text-xs text-amber-300 font-mono mt-0.5 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeLeft}s
                </div>
              </div>
              {/* Opponent */}
              <div className={`text-right ${oppColor === 'rose' ? 'text-rose-300' : 'text-cyan-300'}`}>
                <div className="text-[10px] uppercase tracking-wider opacity-70">{opp?.slot === 'red' ? 'ĐỎ' : 'XANH'}</div>
                <div className="font-bold text-sm truncate">{opp?.name || '...'}</div>
                <div className="text-2xl font-black font-mono">{opp?.score ?? 0}</div>
              </div>
            </div>
            {/* status row */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className={`text-xs px-2 py-1 rounded font-medium ${
                isMyTurnDone ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'
              }`}>
                {isMyTurnDone ? '✓ Bạn đã trả lời' : '⏳ Đang chờ trả lời...'}
              </div>
              <div className={`text-xs px-2 py-1 rounded font-medium text-right ${
                opp?.hasAnswered ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-400'
              }`}>
                {opp?.hasAnswered ? '✓ Đối thủ đã trả lời' : '⏳ Đối thủ đang nghĩ...'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Question ── */}
        <main className="max-w-3xl mx-auto px-4 py-6">
          {q ? (
            <>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                <div className="text-xs text-cyan-300 uppercase tracking-wide mb-2">
                  Câu hỏi {q.index + 1}
                </div>
                <div className="text-base sm:text-lg leading-relaxed">{q.content}</div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(q.options as Array<unknown>).map((opt, i) => {
                  const text = typeof opt === 'string' ? opt
                    : (opt as { text?: string; label?: string })?.text
                      || (opt as { label?: string })?.label
                      || JSON.stringify(opt)
                  const letter = String.fromCharCode(65 + i)
                  const isCorrectAnswer = lastResult && lastResult.correctAnswer != null
                    && (text === lastResult.correctAnswer || letter === lastResult.correctAnswer)
                  return (
                    <button
                      key={i}
                      onClick={() => pick(text)}
                      disabled={isMyTurnDone || submitting}
                      className={`text-left bg-white/5 border-2 rounded-xl px-4 py-4 transition disabled:cursor-not-allowed ${
                        isMyTurnDone && isCorrectAnswer
                          ? 'border-emerald-400/60 bg-emerald-500/10'
                          : isMyTurnDone
                            ? 'border-white/10 opacity-60'
                            : 'border-white/10 hover:border-cyan-400/50 hover:bg-white/10 active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 w-8 h-8 rounded-lg inline-flex items-center justify-center font-bold ${
                          isMyTurnDone && isCorrectAnswer
                            ? 'bg-emerald-500/30 text-emerald-200'
                            : 'bg-cyan-500/20 text-cyan-200'
                        }`}>{letter}</span>
                        <span className="text-sm sm:text-base mt-1">{text}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {lastResult && (
                <div className={`mt-4 rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${
                  lastResult.correct
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-400/30'
                }`}>
                  {lastResult.correct
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <XCircle className="w-4 h-4" />}
                  <span>
                    {lastResult.correct
                      ? `Chính xác! +${lastResult.pointsEarned} điểm`
                      : `Sai rồi. Đáp án: ${lastResult.correctAnswer || '—'}`}
                  </span>
                  {!lastResult.opponentAnswered && (
                    <span className="ml-auto text-xs opacity-70">Đang chờ đối thủ...</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-slate-500 mt-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p className="mt-2 text-sm">Đang tải câu hỏi tiếp theo...</p>
            </div>
          )}
        </main>
      </div>
    )
  }

  if (phase === 'finished' && state) {
    const me = state.me
    const opp = state.opponent
    const winner = state.session.winner
    const meWon = me && winner === me.slot
    const tied = winner === 'tie'
    return (
      <FullScreen>
        <div className={`rounded-2xl p-8 max-w-md w-full text-center border-2 ${
          tied ? 'bg-slate-500/10 border-slate-400/40'
          : meWon ? 'bg-emerald-500/10 border-emerald-400/40'
          : 'bg-rose-500/10 border-rose-400/40'
        }`}>
          <Trophy className={`w-16 h-16 mx-auto mb-3 ${
            tied ? 'text-slate-300' : meWon ? 'text-emerald-300' : 'text-rose-300'
          }`} />
          <div className="text-3xl font-bold mb-2">
            {tied ? 'Hòa!' : meWon ? '🎉 Bạn thắng!' : 'Bạn thua...'}
          </div>
          <div className="text-sm text-slate-400 mb-5">
            {tied ? 'Hai bên cùng số điểm' : meWon ? 'Chúc mừng chiến thắng' : 'Chúc may mắn lần sau!'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-lg p-3 ${
              me?.slot === 'red' ? 'bg-rose-500/15' : 'bg-cyan-500/15'
            }`}>
              <div className="text-xs text-slate-400 uppercase">Bạn</div>
              <div className="font-bold truncate">{me?.name}</div>
              <div className="text-2xl font-black font-mono mt-1">{me?.score ?? 0}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                ✓{me?.correct ?? 0} ✗{me?.wrong ?? 0}
              </div>
            </div>
            <div className={`rounded-lg p-3 ${
              opp?.slot === 'red' ? 'bg-rose-500/15' : 'bg-cyan-500/15'
            }`}>
              <div className="text-xs text-slate-400 uppercase">Đối thủ</div>
              <div className="font-bold truncate">{opp?.name || '—'}</div>
              <div className="text-2xl font-black font-mono mt-1">{opp?.score ?? 0}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                ✓{opp?.correct ?? 0} ✗{opp?.wrong ?? 0}
              </div>
            </div>
          </div>
        </div>
      </FullScreen>
    )
  }

  return null
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="flex flex-col items-center w-full">{children}</div>
    </div>
  )
}
