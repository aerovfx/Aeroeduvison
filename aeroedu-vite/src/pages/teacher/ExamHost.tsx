/**
 * ExamHost — Trang giáo viên host phòng thi LIVE (Wayground/Quizizz style)
 *
 * Flow:
 *   1. Teacher click "Mở phòng thi" trong ExamDetail → POST /api/quiz-rooms
 *      → trả về roomId + 6-digit code → navigate /teacher/exams/:id/play
 *   2. Trang này hiển thị: QR + code khổng lồ + danh sách HS đã join
 *      (poll mỗi 2s)
 *   3. Bấm "BẮT ĐẦU" → POST /:code/start → Polling vẫn chạy nhưng giờ
 *      hiển thị leaderboard + nút "Câu kế tiếp"
 *   4. Hết câu → "Kết thúc" → bảng điểm cuối cùng
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Copy, QrCode, Play, SkipForward, X, Trophy, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

interface Participant {
  id: string
  name: string
  avatar: string | null
  score: number
  correctCount: number
  joinedAt: string
}
interface RoomState {
  room: {
    id: string
    code: string
    examId: string
    examTitle: string
    totalQuestions: number
    status: 'waiting' | 'playing' | 'ended'
    currentQuestion: number
  }
  participants: Participant[]
  currentQuestion: { id: string; index: number; content: string; options: string[] } | null
}

const QR_API = (text: string, size = 360) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(text)}`

// Component chính: màn hình host phòng thi live (QR/code, poll, bắt đầu, leaderboard)
export default function ExamHostPage() {
  const { id: examId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const initialCode = (location.state as { code?: string })?.code

  const [code, setCode] = useState<string | null>(initialCode || null)
  const [creating, setCreating] = useState(false)
  const [state, setState] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tạo room nếu chưa có (lần đầu vào page)
  useEffect(() => {
    if (code || !examId) return
    let cancelled = false
    ;(async () => {
      setCreating(true)
      try {
        const res = await api.post<{ code: string; roomId: string }>('/quiz-rooms', { examId })
        if (cancelled) return
        setCode(res.data.code)
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } }
        toast.error(e.response?.data?.error || 'Không tạo được phòng thi')
        navigate(-1)
      } finally {
        if (!cancelled) setCreating(false)
      }
    })()
    return () => { cancelled = true }
  }, [code, examId, navigate])

  // Poll state mỗi 2s
  useEffect(() => {
    if (!code) return
    const fetchState = async () => {
      try {
        const r = await api.get<RoomState>(`/quiz-rooms/${code}`)
        setState(r.data)
      } catch {
        // Bỏ qua lỗi tạm thời
      }
    }
    fetchState()
    pollRef.current = setInterval(fetchState, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [code])

  const joinUrl = useMemo(() => {
    if (!code) return ''
    return `${window.location.origin}/play/${code}`
  }, [code])

  const copyCode = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    toast.success('Đã copy mã')
  }
  const copyUrl = () => {
    navigator.clipboard.writeText(joinUrl)
    toast.success('Đã copy link join')
  }

  const startGame = async () => {
    if (!code || busy) return
    setBusy(true)
    try {
      await api.post(`/quiz-rooms/${code}/start`)
      toast.success('Đã bắt đầu!')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không khởi động được')
    } finally { setBusy(false) }
  }
  const nextQuestion = async () => {
    if (!code || busy) return
    setBusy(true)
    try {
      const r = await api.post<{ ended?: boolean }>(`/quiz-rooms/${code}/next`)
      if (r.data?.ended) toast.success('Đã hoàn thành tất cả câu hỏi!')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lỗi')
    } finally { setBusy(false) }
  }
  const endGame = async () => {
    if (!code || !confirm('Kết thúc phòng thi?')) return
    setBusy(true)
    try {
      await api.post(`/quiz-rooms/${code}/end`)
      toast.success('Đã kết thúc')
    } catch { toast.error('Lỗi') } finally { setBusy(false) }
  }

  if (creating || !code) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0b2e] text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Đang tạo phòng thi…</p>
        </div>
      </div>
    )
  }

  const status = state?.room.status || 'waiting'
  const participants = state?.participants ?? []

  // ─── WAITING ROOM ───────────────────────────────────────
  if (status === 'waiting') {
    return (
      <div className="min-h-screen relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-white/90 font-semibold text-lg">📚 {state?.room.examTitle || 'Phòng thi LIVE'}</div>
          <button onClick={endGame}
            className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm">
            Kết thúc
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Code display */}
          <div className="md:col-span-2 bg-black/40 backdrop-blur rounded-3xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">1</div>
              <div>
                <p className="text-white/60 text-sm">Học sinh truy cập</p>
                <p className="text-white text-2xl md:text-3xl font-bold">inphysic.com/play</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">2</div>
              <div className="flex-1">
                <p className="text-white/60 text-sm">Nhập mã phòng</p>
                <div className="flex items-center gap-3">
                  <p className="text-white text-6xl md:text-8xl font-black tracking-widest">
                    {code.slice(0,3)} {code.slice(3)}
                  </p>
                  <button onClick={copyCode} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR */}
          <div className="bg-black/40 backdrop-blur rounded-3xl p-6 text-center">
            <p className="text-white/70 text-sm mb-3 flex items-center justify-center gap-1">
              <QrCode className="w-4 h-4" /> Quét QR mở nhanh
            </p>
            <div className="bg-white p-3 rounded-2xl inline-block">
              <img src={QR_API(joinUrl)} alt="QR" className="w-44 h-44 md:w-48 md:h-48 cursor-pointer"
                onClick={copyUrl} />
            </div>
            <p className="text-white/40 text-xs mt-2 break-all">{joinUrl}</p>
          </div>
        </div>

        {/* Start button */}
        <div className="flex items-center justify-center gap-4 mt-8 px-6">
          <button onClick={startGame} disabled={busy || participants.length === 0}
            className="px-12 py-5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700
              text-white font-black text-2xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
            <Play className="w-7 h-7" /> BẮT ĐẦU
          </button>
          <div className="px-6 py-4 rounded-2xl bg-black/40 text-white font-bold text-xl flex items-center gap-2">
            <Users className="w-6 h-6" /> {participants.length}
          </div>
        </div>

        {/* Participants list */}
        {participants.length > 0 && (
          <div className="max-w-5xl mx-auto px-6 mt-10">
            <p className="text-white/70 text-sm mb-3">Học sinh đã vào phòng:</p>
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <div key={p.id} className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur text-white text-sm flex items-center gap-2 animate-in">
                  <span className="text-xl">{p.avatar || '🐸'}</span>
                  <span className="font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── PLAYING / ENDED ────────────────────────────────────
  const isEnded = status === 'ended'
  const sortedParts = [...participants].sort((a,b) => b.score - a.score)
  return (
    <div className="min-h-screen px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/60 text-sm">Mã phòng</p>
            <p className="text-white text-3xl font-black tracking-widest">{code}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isEnded && state?.room && state.room.currentQuestion < state.room.totalQuestions - 1 && (
              <button onClick={nextQuestion} disabled={busy}
                className="px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold flex items-center gap-2 disabled:opacity-50">
                <SkipForward className="w-5 h-5" /> Câu kế tiếp
              </button>
            )}
            <button onClick={endGame} disabled={busy}
              className="px-5 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold flex items-center gap-2 disabled:opacity-50">
              <X className="w-5 h-5" /> {isEnded ? 'Đóng' : 'Kết thúc'}
            </button>
          </div>
        </div>

        {/* Current question (hide answers, just for context) */}
        {state?.currentQuestion && !isEnded && (
          <div className="bg-black/40 backdrop-blur rounded-3xl p-6 mb-6">
            <p className="text-white/60 text-sm mb-2">
              Câu {state.currentQuestion.index + 1} / {state.room.totalQuestions}
            </p>
            <p className="text-white text-xl md:text-2xl font-medium whitespace-pre-wrap">
              {state.currentQuestion.content}
            </p>
            {state.currentQuestion.options?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {state.currentQuestion.options.map((opt, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 text-white/80 text-base">{opt}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-black/40 backdrop-blur rounded-3xl p-6">
          <h3 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            {isEnded ? 'Kết quả cuối cùng' : 'Bảng xếp hạng'}
          </h3>
          {sortedParts.length === 0 ? (
            <p className="text-white/40 text-center py-8">Chưa có học sinh tham gia</p>
          ) : (
            <div className="space-y-2">
              {sortedParts.map((p, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx+1}.`
                return (
                  <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl ${idx<3 ? 'bg-white/15' : 'bg-white/5'}`}>
                    <div className="text-2xl w-10 text-center">{medal}</div>
                    <div className="text-3xl">{p.avatar || '🐸'}</div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-lg">{p.name}</p>
                      <p className="text-white/50 text-xs">{p.correctCount} câu đúng</p>
                    </div>
                    <div className="text-yellow-400 font-black text-2xl">{p.score}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
