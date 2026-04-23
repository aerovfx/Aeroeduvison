/**
 * KeoCoJoin — public mobile page /k/:token
 *   1) Show lobby info
 *   2) Student types name → joins (auto-balanced to RED/BLUE)
 *   3) Wait for teacher to start
 *   4) Live question loop with rope animation
 *
 * No auth. Polls /state every 1.5s.
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Trophy, Zap, Users } from 'lucide-react'
import keocoService, {
  KcPublicLobby, KcPlayerState, KcPlayer, KcAnswerResult,
} from '@/services/keoco.service'

const STORAGE_KEY = (token: string) => `kc_player_${token}`

export default function KeoCoJoin() {
  const { token } = useParams<{ token: string }>()
  const [phase, setPhase] = useState<'loading' | 'join' | 'play' | 'finished' | 'error'>('loading')
  const [lobby, setLobby] = useState<KcPublicLobby | null>(null)
  const [errMsg, setErrMsg] = useState('')

  const [name, setName] = useState('')
  const [team, setTeam] = useState<'auto' | 'red' | 'blue'>('auto')
  const [joining, setJoining] = useState(false)

  const [player, setPlayer] = useState<KcPlayer | null>(null)
  const playerTokenRef = useRef<string | null>(null)
  const [state, setState] = useState<KcPlayerState | null>(null)
  const pollRef = useRef<number | null>(null)

  // Restore prior session from sessionStorage
  useEffect(() => {
    if (!token) return
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY(token))
      if (raw) {
        const saved = JSON.parse(raw) as { playerToken: string; player: KcPlayer }
        playerTokenRef.current = saved.playerToken
        setPlayer(saved.player)
        setPhase('play')
      }
    } catch { /* ignore */ }

    // Always fetch lobby for header info
    keocoService.publicGetLobby(token)
      .then((l) => {
        setLobby(l)
        if (!playerTokenRef.current) setPhase('join')
      })
      .catch((e: unknown) => {
        const er = e as { response?: { status?: number }; message?: string }
        if (er?.response?.status === 404) {
          setErrMsg('Không tìm thấy cuộc thi này. Kiểm tra lại QR hoặc mã.')
        } else {
          setErrMsg(er?.message || 'Lỗi kết nối')
        }
        setPhase('error')
      })
  }, [token])

  // Poll loop while playing
  useEffect(() => {
    if (phase !== 'play' || !token || !playerTokenRef.current) return
    let stopped = false
    async function tick() {
      if (stopped || !playerTokenRef.current || !token) return
      try {
        const s = await keocoService.publicState(token, playerTokenRef.current)
        setState(s)
        if (s.player) setPlayer(s.player)
        if (s.session.status === 'finished') {
          setPhase('finished')
        }
      } catch { /* ignore transient */ }
    }
    tick()
    pollRef.current = window.setInterval(tick, 1500)
    return () => {
      stopped = true
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [phase, token])

  async function join() {
    if (!token) return
    if (!name.trim()) { alert('Vui lòng nhập tên'); return }
    setJoining(true)
    try {
      const r = await keocoService.publicJoin(token, { name: name.trim(), team })
      playerTokenRef.current = r.playerToken
      setPlayer(r.player)
      sessionStorage.setItem(STORAGE_KEY(token), JSON.stringify({ playerToken: r.playerToken, player: r.player }))
      setPhase('play')
    } catch (e: unknown) {
      const er = e as { message?: string }
      alert(er?.message || 'Không thể tham gia')
    } finally {
      setJoining(false)
    }
  }

  /* ───────────── Renders ───────────── */

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

  if (phase === 'join') {
    return (
      <Shell title={lobby?.title || 'Kéo Co Kiến Thức'} subject={lobby?.subject}>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">🪢</div>
            <p className="text-slate-300 text-sm">
              {lobby?.playerCount || 0} người chơi · {lobby?.questionCount} câu · {lobby?.timePerQuestion}s/câu
            </p>
          </div>

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

          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">
              Đội
            </label>
            <div className="grid grid-cols-3 gap-2">
              <TeamPick selected={team === 'auto'} onClick={() => setTeam('auto')} color="amber" emoji="🤖">
                Tự động
              </TeamPick>
              <TeamPick selected={team === 'red'} onClick={() => setTeam('red')} color="rose" emoji="🚩">
                ĐỎ ({lobby?.teamCounts?.red || 0})
              </TeamPick>
              <TeamPick selected={team === 'blue'} onClick={() => setTeam('blue')} color="blue" emoji="🚩">
                XANH ({lobby?.teamCounts?.blue || 0})
              </TeamPick>
            </div>
          </div>

          <button
            onClick={join}
            disabled={joining || !name.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl py-4 text-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Zap className="w-5 h-5" /> Tham gia</>)}
          </button>
        </div>
      </Shell>
    )
  }

  // play / finished
  return (
    <Shell title={lobby?.title || 'Kéo Co'} subject={lobby?.subject}>
      <PlayScreen
        token={token!}
        state={state}
        player={player}
        playerToken={playerTokenRef.current!}
        finished={phase === 'finished'}
      />
    </Shell>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function PlayScreen({
  token, state, player, playerToken, finished,
}: {
  token: string
  state: KcPlayerState | null
  player: KcPlayer | null
  playerToken: string
  finished: boolean
}) {
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<KcAnswerResult | null>(null)
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(Date.now())
  const lastIdxRef = useRef<number>(-2)

  // Track when the question changes to reset timer & feedback
  useEffect(() => {
    const idx = state?.session.currentIndex ?? -1
    if (idx !== lastIdxRef.current) {
      lastIdxRef.current = idx
      setFeedback(null)
      setQuestionStartedAt(Date.now())
    }
  }, [state?.session.currentIndex])

  if (!state) return <div className="text-center py-10 text-slate-400 text-sm">Đang đồng bộ...</div>

  // Lobby (waiting)
  if (state.session.status === 'lobby') {
    return (
      <div className="space-y-4">
        <PlayerHeader player={player} state={state} />
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">⏳</div>
          <h2 className="text-lg font-bold mb-1">Đang chờ giáo viên bắt đầu...</h2>
          <p className="text-sm text-slate-400">
            <Users className="w-4 h-4 inline mr-1" />
            {(state.teamCounts.red || 0) + (state.teamCounts.blue || 0)} người đã sẵn sàng
          </p>
        </div>
      </div>
    )
  }

  // Finished
  if (finished || state.session.status === 'finished') {
    const myWin = (state.session.winner === player?.team)
    return (
      <div className="space-y-4">
        <PlayerHeader player={player} state={state} />
        <div className={`rounded-2xl p-8 text-center border ${
          myWin ? 'bg-amber-500/15 border-amber-400/40' : 'bg-slate-500/10 border-slate-400/30'
        }`}>
          <Trophy className={`w-16 h-16 mx-auto mb-3 ${myWin ? 'text-amber-400' : 'text-slate-400'}`} />
          <h2 className="text-2xl font-bold mb-1">
            {state.session.winner === 'tie' ? 'Hòa!' :
             myWin ? '🎉 Đội bạn thắng!' : 'Đội bạn thua...'}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Vị trí dây cuối: {state.session.ropePosition} / ±{state.session.ropeMax}
          </p>
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto text-center">
            <Stat label="Điểm" value={String(player?.score || 0)} />
            <Stat label="Đúng" value={String(player?.correct || 0)} accent="emerald" />
            <Stat label="Sai" value={String(player?.wrong || 0)} accent="rose" />
          </div>
        </div>
      </div>
    )
  }

  // Running — show rope + question
  const q = state.currentQuestion
  const pct = Math.max(-1, Math.min(1, state.session.ropePosition / state.session.ropeMax))
  const myAnswered = state.alreadyAnswered

  async function answer(ans: string) {
    if (!q || submitting || feedback) return
    setSubmitting(true)
    try {
      const r = await keocoService.publicAnswer(token, {
        playerToken,
        questionIdx: q.index,
        answer: ans,
        timeMs: Date.now() - questionStartedAt,
      })
      setFeedback(r)
    } catch (e: unknown) {
      const er = e as { message?: string }
      alert(er?.message || 'Không gửi được')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <PlayerHeader player={player} state={state} />

      {/* Live rope */}
      <div className="bg-slate-950 border border-white/10 rounded-xl p-3">
        <div className="flex justify-between text-[11px] mb-1.5 font-medium uppercase tracking-wide">
          <span className="text-rose-300">ĐỎ {state.teamScores.red || 0}</span>
          <span className="text-amber-300">{state.session.ropePosition}</span>
          <span className="text-blue-300">{state.teamScores.blue || 0} XANH</span>
        </div>
        <div className="relative h-10 bg-black rounded-md overflow-hidden">
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-400/60" />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-rose-500 via-amber-300 to-blue-500 transition-all duration-500"
            style={{
              left: `${Math.min(50, 50 + pct * 35) - 1}%`,
              width: `${Math.abs(pct) * 35 + 2}%`,
            }}
          />
          <div
            className="absolute top-0 bottom-0 w-1 bg-yellow-300 shadow-yellow-300/70 transition-all duration-500"
            style={{ left: `calc(${50 + pct * 35}% - 2px)` }}
          />
        </div>
      </div>

      {/* Question */}
      {q ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-amber-300 mb-2 flex justify-between">
            <span>Câu {q.index + 1} / {state.session.questionCount}</span>
            <CountdownTimer start={questionStartedAt} duration={state.session.timePerQuestion} />
          </div>
          <div className="font-medium text-base leading-relaxed mb-4">{q.content}</div>

          <div className="space-y-2">
            {(q.options as Array<unknown>).map((opt, i) => {
              const text = typeof opt === 'string' ? opt : (opt as { text?: string; label?: string })?.text || (opt as { label?: string })?.label || JSON.stringify(opt)
              const letter = String.fromCharCode(65 + i)
              const ansVal = letter
              const isPicked = feedback != null
              const isCorrectChoice = feedback?.correctAnswer && feedback.correctAnswer.toLowerCase() === ansVal.toLowerCase()
              return (
                <button
                  key={i}
                  onClick={() => answer(ansVal)}
                  disabled={submitting || !!feedback || myAnswered}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition text-sm font-medium ${
                    isPicked && isCorrectChoice
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : isPicked
                      ? 'bg-white/5 border-white/10 text-slate-400'
                      : 'bg-white/5 border-white/10 hover:border-amber-400 hover:bg-amber-500/5 active:scale-95'
                  } disabled:cursor-not-allowed`}
                >
                  <span className="font-bold text-amber-300 mr-2">{letter}.</span>{text}
                </button>
              )
            })}
          </div>

          {feedback && (
            <div className={`mt-4 rounded-lg p-3 text-sm ${
              feedback.correct
                ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-200'
                : 'bg-rose-500/15 border border-rose-400/30 text-rose-200'
            }`}>
              {feedback.correct ? '✅ Đúng!' : '❌ Sai!'}
              <span className="ml-2 text-amber-300">+{feedback.scoreAdd > 0 ? feedback.scoreAdd : '0'} điểm</span>
              <span className="ml-2 opacity-75">(kéo dây {feedback.delta > 0 ? '+' : ''}{feedback.delta})</span>
            </div>
          )}

          {myAnswered && !feedback && (
            <div className="mt-4 text-center text-sm text-slate-400">
              ✓ Đã trả lời. Đang chờ câu tiếp theo...
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Đang chờ câu hỏi...
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */

function PlayerHeader({ player, state }: { player: KcPlayer | null; state: KcPlayerState }) {
  if (!player) return null
  const isRed = player.team === 'red'
  return (
    <div className={`rounded-xl p-3 border flex items-center justify-between ${
      isRed ? 'bg-rose-500/10 border-rose-400/30' : 'bg-blue-500/10 border-blue-400/30'
    }`}>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">
          Đội {isRed ? 'ĐỎ' : 'XANH'}
        </div>
        <div className="font-bold text-base">{player.name}</div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {player.streak >= 3 && <span className="text-amber-300">🔥{player.streak}</span>}
        <div className="text-right">
          <div className="text-amber-300 font-bold text-xl leading-none">{player.score}</div>
          <div className="text-[10px] text-slate-400 uppercase">điểm</div>
        </div>
      </div>
    </div>
  )
}

function CountdownTimer({ start, duration }: { start: number; duration: number }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const elapsed = (now - start) / 1000
  const left = Math.max(0, duration - elapsed)
  const danger = left < 5
  return (
    <span className={danger ? 'text-rose-400 font-bold' : 'text-slate-400'}>
      ⏱ {Math.ceil(left)}s
    </span>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'rose' }) {
  return (
    <div className="bg-black/30 rounded-lg py-2">
      <div className={`text-xl font-bold ${
        accent === 'emerald' ? 'text-emerald-400' :
        accent === 'rose' ? 'text-rose-400' :
        'text-amber-300'
      }`}>{value}</div>
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
    </div>
  )
}

function TeamPick({
  selected, onClick, color, emoji, children,
}: {
  selected: boolean
  onClick: () => void
  color: 'rose' | 'blue' | 'amber'
  emoji: string
  children: React.ReactNode
}) {
  const colorClasses = selected
    ? (color === 'rose'
        ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
        : color === 'blue'
        ? 'bg-blue-500/20 border-blue-400/50 text-blue-200'
        : 'bg-amber-500/20 border-amber-400/50 text-amber-200')
    : 'bg-white/5 border-white/10 text-slate-400'
  return (
    <button onClick={onClick}
      className={`p-3 rounded-lg border text-xs font-medium text-center transition ${colorClasses}`}>
      <div className="text-xl mb-0.5">{emoji}</div>
      {children}
    </button>
  )
}

function Shell({ title, subject, children }: { title: string; subject?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="px-4 py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪢</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate leading-tight">{title}</div>
              {subject && <div className="text-[11px] text-slate-400">{subject}</div>}
            </div>
          </div>
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
