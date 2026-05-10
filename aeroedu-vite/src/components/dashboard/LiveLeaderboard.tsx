/**
 * LiveLeaderboard — Bảng xếp hạng real-time với chỉ số cảm xúc + tương tác
 *
 * Dùng chung cho Teacher + Student Dashboard. Auto-refresh mỗi 15s
 * (đủ "real-time" cho dashboard, không spam network).
 */
import { useEffect, useState } from 'react'
import { Trophy, Activity, RefreshCw, Sparkles } from 'lucide-react'
import { api } from '@/services/api'

interface Leader {
  rank: number
  userId: string
  name: string
  avatar: string | null
  totalAttempts: number
  totalScore: number
  avgPercentage: number
  lastAttemptAt: string | null
  emotion: { emoji: string; label: string; tone: 'positive' | 'neutral' | 'negative' }
  engagement: { level: string; score: number; tone: 'high' | 'mid' | 'low'; actions7d: number }
}

const TONE_COLORS = {
  emotion: {
    positive: 'text-green-400 bg-green-500/10 border-green-500/30',
    neutral: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
    negative: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  },
  engagement: {
    high: 'text-emerald-400 bg-emerald-500/10',
    mid: 'text-yellow-300 bg-yellow-500/10',
    low: 'text-slate-400 bg-slate-500/10',
  },
}

export function LiveLeaderboard({
  highlightUserId,
  compact = false,
}: {
  /** Tô vàng row của user này (dùng cho student dashboard) */
  highlightUserId?: string
  /** Compact mode: chỉ hiện top 5, ẩn chỉ số phụ */
  compact?: boolean
}) {
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    setRefreshing(true)
    try {
      const r = await api.get<{ leaders: Leader[]; updatedAt: string }>('/leaderboard/realtime')
      setLeaders(r.data?.leaders || [])
      setUpdatedAt(r.data?.updatedAt || null)
    } catch {
      // Bỏ qua lỗi tạm thời, giữ data cũ
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 15000)
    return () => clearInterval(t)
  }, [])

  const visible = compact ? leaders.slice(0, 5) : leaders.slice(0, 10)

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white/90 font-bold text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Bảng xếp hạng dẫn đầu
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </h3>
          {updatedAt && (
            <p className="text-[11px] text-white/40 mt-0.5">
              Cập nhật {new Date(updatedAt).toLocaleTimeString('vi-VN')}
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white/90 transition-all disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && leaders.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-white/40 text-xs">Đang tải bảng xếp hạng…</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-8 text-center">
          <Sparkles className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Chưa có học sinh trên bảng</p>
          <p className="text-white/25 text-xs mt-0.5">Hãy là người đầu tiên ghi danh!</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((l) => {
            const isMe = highlightUserId && l.userId === highlightUserId
            const medal = l.rank === 1 ? '🥇' : l.rank === 2 ? '🥈' : l.rank === 3 ? '🥉' : `#${l.rank}`
            return (
              <div
                key={l.userId}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isMe
                    ? 'bg-yellow-500/10 border border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
                    : l.rank <= 3
                      ? 'bg-white/[0.04] border border-white/[0.08]'
                      : 'bg-white/[0.02]'
                }`}
              >
                <div className={`w-10 text-center text-lg font-bold ${l.rank <= 3 ? 'text-yellow-300' : 'text-white/40'}`}>
                  {medal}
                </div>
                {l.avatar ? (
                  <img src={l.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    {l.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 font-semibold text-sm truncate">{l.name}{isMe && ' (Bạn)'}</p>
                  <p className="text-white/40 text-[11px]">{l.totalAttempts} bài · TB {l.avgPercentage}%</p>
                </div>
                {!compact && (
                  <>
                    <div
                      className={`px-2 py-1 rounded-md border text-[11px] font-medium ${TONE_COLORS.emotion[l.emotion.tone]}`}
                      title={`Cảm xúc: ${l.emotion.label}`}
                    >
                      {l.emotion.emoji} {l.emotion.label}
                    </div>
                    <div
                      className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 ${TONE_COLORS.engagement[l.engagement.tone]}`}
                      title={`Tương tác: ${l.engagement.actions7d} hoạt động/7 ngày`}
                    >
                      <Activity className="w-3 h-3" />
                      {l.engagement.level}
                    </div>
                  </>
                )}
                <div className="text-yellow-300 font-black text-base min-w-[48px] text-right">
                  {l.totalScore}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default LiveLeaderboard
