/**
 * PlayRoom — Học sinh vào phòng /play/:code
 *
 * 4 view states:
 *   1. nameEntry   — nhập tên + chọn avatar
 *   2. waiting     — chờ giáo viên bắt đầu (poll 2s)
 *   3. playing     — hiển thị câu hỏi + đáp án (poll 2s, lock sau khi chọn)
 *   4. ended       — bảng xếp hạng cuối
 *
 * Chữ to, mobile-first. Tap-friendly buttons (min 60px height).
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'
import { MathText } from '@/components/common/MathText'

interface Participant {
  id: string; name: string; avatar: string | null
  score: number; correctCount: number
}
interface RoomState {
  room: {
    id: string; code: string; examTitle: string; totalQuestions: number
    status: 'waiting' | 'playing' | 'ended'; currentQuestion: number
  }
  participants: Participant[]
  currentQuestion: { id: string; index: number; content: string; options: string[] } | null
}

const AVATARS = ['🐸', '🦊', '🐼', '🐯', '🐨', '🐰', '🦄', '🐱', '🐶', '🐻', '🐧', '🐢']
const STORAGE = (code: string) => `play-${code}`

export default function PlayRoom() {
  const { code } = useParams<{ code: string }>()
  const [view, setView] = useState<'nameEntry' | 'waiting' | 'playing' | 'ended'>('nameEntry')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [state, setState] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastQRef = useRef<string | null>(null)  // questionId đã trả lời

  // Restore từ localStorage nếu refresh
  useEffect(() => {
    if (!code) return
    try {
      const raw = localStorage.getItem(STORAGE(code))
      if (!raw) return
      const saved = JSON.parse(raw) as { participantId: string; name: string; avatar: string }
      setParticipantId(saved.participantId)
      setName(saved.name)
      setAvatar(saved.avatar)
      setView('waiting')
    } catch { /* ignore */ }
  }, [code])

  // Poll state
  useEffect(() => {
    if (!code || view === 'nameEntry') return
    const fetchState = async () => {
      try {
        const r = await axios.get<RoomState>(`/api/quiz-rooms/${code}`)
        setState(r.data)
        // Sync view với room status
        if (r.data.room.status === 'playing') {
          setView(v => v === 'waiting' ? 'playing' : v)
          // Reset selected khi sang câu mới
          if (r.data.currentQuestion?.id !== lastQRef.current) {
            setSelected(null)
            setLastResult(null)
          }
        } else if (r.data.room.status === 'ended') {
          setView('ended')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } }
        if (e.response?.status === 404) {
          toast.error('Phòng không tồn tại')
          if (pollRef.current) clearInterval(pollRef.current)
        }
      }
    }
    fetchState()
    pollRef.current = setInterval(fetchState, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [code, view])

  const join = async () => {
    if (!name.trim()) { toast.error('Cần nhập tên'); return }
    if (!code) return
    setBusy(true)
    try {
      const r = await axios.post<{ participantId: string; rejoined: boolean }>(
        `/api/quiz-rooms/${code}/join`,
        { name: name.trim(), avatar }
      )
      const pid = r.data.participantId
      setParticipantId(pid)
      localStorage.setItem(STORAGE(code), JSON.stringify({ participantId: pid, name: name.trim(), avatar }))
      setView('waiting')
      toast.success(r.data.rejoined ? 'Đã vào lại phòng' : 'Đã vào phòng!')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không vào được phòng')
    } finally { setBusy(false) }
  }

  const submitAnswer = async (ans: string) => {
    if (!code || !participantId || !state?.currentQuestion || selected) return
    setSelected(ans)
    lastQRef.current = state.currentQuestion.id
    try {
      const r = await axios.post<{ isCorrect: boolean; points: number }>(
        `/api/quiz-rooms/${code}/answer`,
        { participantId, questionId: state.currentQuestion.id, answer: ans }
      )
      setLastResult({ correct: r.data.isCorrect, points: r.data.points })
    } catch {
      setSelected(null)
      toast.error('Lỗi gửi đáp án')
    }
  }

  const me = useMemo(() => {
    if (!participantId || !state) return null
    return state.participants.find(p => p.id === participantId) || null
  }, [participantId, state])

  // ─── NAME ENTRY ───────────────────────────────────────
  if (view === 'nameEntry') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
        style={{ background: 'radial-gradient(ellipse at top, #4a1366 0%, #1a0b2e 70%)' }}>
        <div className="text-center mb-6">
          <p className="text-white/60 text-sm mb-1">Mã phòng</p>
          <p className="text-white text-3xl font-black tracking-widest">{code}</p>
        </div>

        <div className="w-full max-w-sm space-y-5">
          {/* Avatar grid */}
          <div>
            <label className="text-white/80 text-base font-medium mb-2 block">Chọn nhân vật</label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map(a => (
                <button key={a} type="button" onClick={() => setAvatar(a)}
                  className={`text-3xl py-2 rounded-xl transition-all ${
                    avatar === a ? 'bg-white scale-110 shadow-lg' : 'bg-white/10 hover:bg-white/20'
                  }`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="text-white/80 text-base font-medium mb-2 block">Tên của bạn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              autoFocus
              placeholder="VD: Minh"
              className="w-full text-2xl py-4 px-5 rounded-2xl bg-white text-purple-900
                placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-400 font-medium"
            />
          </div>

          <button onClick={join} disabled={busy || !name.trim()}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600
              hover:from-green-600 hover:to-emerald-700 text-white font-black text-2xl shadow-2xl
              disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? 'Đang vào…' : 'Bắt đầu'}
          </button>
        </div>
      </div>
    )
  }

  // ─── WAITING ROOM ─────────────────────────────────────
  if (view === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
        style={{ background: 'radial-gradient(ellipse at top, #4a1366 0%, #1a0b2e 70%)' }}>
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">{avatar}</div>
          <p className="text-white text-3xl font-bold mb-1">{name}</p>
          <p className="text-white/60 text-base mb-8">Đang ở trong phòng</p>
          <p className="text-white text-xl mb-2">⏳ Chờ giáo viên bắt đầu…</p>
          <p className="text-white/40 text-sm">{state?.participants.length ?? 0} bạn đang chờ</p>
        </div>
      </div>
    )
  }

  // ─── PLAYING — Wayground/Quizizz style fullscreen 2x2 grid ────
  if (view === 'playing') {
    const q = state?.currentQuestion
    if (!q) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white"
          style={{ background: 'radial-gradient(ellipse at top, #4a1366 0%, #1a0b2e 70%)' }}>
          <p className="text-xl">⏳ Chờ câu hỏi…</p>
        </div>
      )
    }

    // Scoring meter — tính từ answersHistory (lưu trong ref, accumulate đáp án)
    const totalQ = state?.room.totalQuestions || 1
    const progress = ((q.index + 1) / totalQ) * 100
    // Số câu đã trả lời + correct count derive từ score (rough): nếu >= 500 mỗi câu correct → streak counter
    const correctCount = me?.correctCount ?? 0
    const answered = q.index + (selected ? 1 : 0)
    const accuracy = answered > 0 ? Math.round((correctCount / answered) * 100) : 0

    // Wayground 4-color palette (olive/purple/orange/teal)
    const optionPalette = [
      { bg: 'linear-gradient(135deg, #b5b400, #8a8a00)', label: 'A', shape: '◆', num: '1' },  // yellow-olive
      { bg: 'linear-gradient(135deg, #b266ff, #8e3eff)', label: 'B', shape: '●', num: '2' },  // purple
      { bg: 'linear-gradient(135deg, #ff9933, #e67700)', label: 'C', shape: '▲', num: '3' },  // orange
      { bg: 'linear-gradient(135deg, #1ec9b1, #11a892)', label: 'D', shape: '■', num: '4' },  // teal
    ]

    return (
      <div className="min-h-screen flex flex-col"
        style={{ background: 'radial-gradient(ellipse at top, #4a1366 0%, #1a0b2e 70%)' }}>

        {/* ════ TOP BAR: logo · score · progress · streak · fullscreen ════ */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div className="px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 font-black text-base md:text-lg">
              {me?.score ?? 0}
            </div>
            {correctCount >= 2 && (
              <div className="px-2 py-1 rounded-lg bg-orange-500/20 border border-orange-400/40 text-orange-300 font-bold text-xs flex items-center gap-1" title="Streak — chuỗi đúng">
                🔥 {correctCount}
              </div>
            )}
          </div>

          {/* Progress badge giữa */}
          <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/[0.08] text-yellow-300 font-bold text-sm md:text-base">
            {q.index + 1} / {totalQ}
          </div>

          <button
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen()
              else document.documentElement.requestFullscreen?.()
            }}
            className="w-9 h-9 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white/80 flex items-center justify-center transition"
            title="Toàn màn hình"
          >
            ⛶
          </button>
        </div>

        {/* ════ Progress bar + accuracy meter ════ */}
        <div className="px-4 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {answered > 0 && (
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {accuracy}% đúng
              </span>
            )}
          </div>
        </div>

        {/* ════ QUESTION — chữ to giữa màn hình ════ */}
        <div className="flex-shrink-0 px-4 md:px-8 mb-4">
          <div className="max-w-5xl mx-auto bg-black/50 backdrop-blur-xl rounded-2xl px-6 py-6 md:py-10">
            <MathText as="div" className="text-white text-xl md:text-3xl lg:text-4xl font-medium leading-snug text-center">
              {q.content}
            </MathText>
          </div>
        </div>

        {/* ════ Result feedback overlay (sau answer) ════ */}
        {lastResult && (
          <div className="px-4 mb-3">
            <div className={`max-w-3xl mx-auto p-4 rounded-2xl text-center text-2xl md:text-3xl font-black animate-in zoom-in-95 ${
              lastResult.correct
                ? 'bg-green-500/30 text-green-200 border-2 border-green-400/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]'
                : 'bg-red-500/30 text-red-200 border-2 border-red-400/50 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
            }`}>
              {lastResult.correct ? `✅ CHÍNH XÁC! +${lastResult.points} điểm` : '❌ CHƯA ĐÚNG'}
            </div>
          </div>
        )}

        {/* ════ OPTIONS — 2x2 grid full screen, 4 màu Wayground, chữ to ════ */}
        <div className="flex-1 px-3 md:px-6 pb-3 md:pb-6">
          {q.options?.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:gap-4 h-full max-w-7xl mx-auto">
              {q.options.map((opt, i) => {
                const isSelected = selected === opt
                const c = optionPalette[i % 4]
                return (
                  <button
                    key={i}
                    onClick={() => submitAnswer(opt)}
                    disabled={!!selected}
                    className={`relative p-6 md:p-8 rounded-2xl text-white text-xl md:text-3xl lg:text-4xl font-bold flex items-center justify-center text-center
                      shadow-2xl transition-all
                      ${isSelected
                        ? 'ring-4 md:ring-8 ring-white scale-95 brightness-110'
                        : selected
                          ? 'opacity-30 scale-95'
                          : 'hover:scale-[1.02] active:scale-95 hover:brightness-110'}
                      disabled:cursor-not-allowed`}
                    style={{ background: c.bg, minHeight: '140px' }}
                  >
                    {/* Number badge top-right */}
                    <span className="absolute top-2 right-3 px-2 py-0.5 rounded bg-black/30 text-white/90 text-xs font-bold">
                      {c.num}
                    </span>
                    {/* Shape badge top-left */}
                    <span className="absolute top-2 left-3 text-2xl text-white/70">{c.shape}</span>
                    <MathText as="span" className="block px-2 leading-tight">
                      {opt}
                    </MathText>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <ShortAnswerInput onSubmit={submitAnswer} disabled={!!selected} />
            </div>
          )}
        </div>

        {/* ════ Bottom: avatar + name (góc trái) ════ */}
        <div className="px-4 py-2 flex items-center justify-between text-white/70 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{avatar}</span>
            <span className="font-medium truncate max-w-[150px]">{name}</span>
          </div>
          <div className="text-white/40 text-xs">
            {state?.participants.length ?? 0} 👥
          </div>
        </div>
      </div>
    )
  }

  // ─── ENDED ────────────────────────────────────────────
  const sortedParts = [...(state?.participants ?? [])].sort((a,b) => b.score - a.score)
  const myRank = sortedParts.findIndex(p => p.id === participantId) + 1
  return (
    <div className="min-h-screen flex flex-col px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at top, #4a1366 0%, #1a0b2e 70%)' }}>
      <div className="max-w-md mx-auto w-full text-center mb-6">
        <div className="text-8xl mb-3">
          {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎉'}
        </div>
        <p className="text-white text-3xl font-black mb-1">
          {myRank === 1 ? 'CHIẾN THẮNG!' : myRank > 0 ? `Hạng ${myRank}` : 'Hoàn thành!'}
        </p>
        <p className="text-yellow-400 text-5xl font-black mt-3">{me?.score ?? 0}</p>
        <p className="text-white/60 text-sm mt-1">{me?.correctCount ?? 0} câu đúng</p>
      </div>

      <div className="max-w-md mx-auto w-full bg-black/40 backdrop-blur rounded-3xl p-5">
        <h3 className="text-white font-bold mb-3 text-lg">Bảng xếp hạng</h3>
        <div className="space-y-2">
          {sortedParts.slice(0, 10).map((p, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}`
            const isMe = p.id === participantId
            return (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-yellow-500/20 border border-yellow-400/40' : 'bg-white/5'}`}>
                <div className="w-8 text-center text-lg">{medal}</div>
                <div className="text-2xl">{p.avatar || '🐸'}</div>
                <div className="flex-1 text-white font-medium truncate">{p.name}</div>
                <div className="text-yellow-300 font-bold">{p.score}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ShortAnswerInput({ onSubmit, disabled }: { onSubmit: (s: string) => void; disabled: boolean }) {
  const [v, setV] = useState('')
  return (
    <div className="space-y-3">
      <input
        type="text"
        autoFocus
        disabled={disabled}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && v.trim() && onSubmit(v.trim())}
        placeholder="Nhập câu trả lời…"
        className="w-full text-2xl py-4 px-5 rounded-2xl bg-white text-purple-900
          placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-400"
      />
      <button onClick={() => v.trim() && onSubmit(v.trim())} disabled={disabled || !v.trim()}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600
          text-white font-black text-xl disabled:opacity-50">
        Gửi
      </button>
    </div>
  )
}
