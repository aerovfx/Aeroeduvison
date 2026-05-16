/**
 * SrsReviewPanel — UI hiển thị số câu cần ôn + nút "Bắt đầu ôn".
 *
 * Dùng trong AI Tutor sidebar. Stats đọc từ localStorage (SM-2 store) mỗi
 * 30s. Khi user click "Ôn ngay" → callback onStartReview với danh sách
 * card due (sort by dueAt ASC).
 */
import { useEffect, useState } from 'react'
import { Brain, Clock, TrendingUp } from 'lucide-react'
import { getStats, getDueCards, type ReviewRecord } from '@/lib/srs'

export interface SrsReviewPanelProps {
  subject?: string
  /** Limit số card mỗi session ôn (default 20) */
  sessionLimit?: number
  /** Callback khi user bấm ôn — nhận danh sách card */
  onStartReview?: (cards: ReviewRecord[]) => void
  className?: string
}

export function SrsReviewPanel({
  subject, sessionLimit = 20, onStartReview, className = '',
}: SrsReviewPanelProps) {
  const [stats, setStats] = useState(() => getStats())
  const [dueCount, setDueCount] = useState(
    () => getDueCards(Date.now(), { subject }).length,
  )

  useEffect(() => {
    const tick = () => {
      setStats(getStats())
      setDueCount(getDueCards(Date.now(), { subject }).length)
    }
    tick()
    const i = setInterval(tick, 30_000)
    return () => clearInterval(i)
  }, [subject])

  const handleStart = () => {
    const cards = getDueCards(Date.now(), { subject, limit: sessionLimit })
    onStartReview?.(cards)
  }

  if (stats.total === 0) {
    return (
      <div className={`rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 ${className}`}>
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-purple-300" />
          <span className="text-xs font-medium text-white/70">Ôn tập thông minh</span>
        </div>
        <p className="text-[11px] text-white/40">
          Làm bài tập đầu tiên để bắt đầu nhớ kiến thức lâu dài.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl bg-gradient-to-br from-purple-500/8 to-indigo-500/8 border border-purple-500/20 p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-300" />
          <span className="text-xs font-medium text-white/80">Ôn tập thông minh</span>
        </div>
        {dueCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
            {dueCount}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 mb-3">
        <Stat icon={Clock} label="Cần ôn" value={dueCount} color="rose" />
        <Stat icon={Brain} label="Đang học" value={stats.learning} color="amber" />
        <Stat icon={TrendingUp} label="Thuộc lâu" value={stats.mature} color="emerald" />
      </div>

      <button
        onClick={handleStart}
        disabled={dueCount === 0}
        className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
          dueCount > 0
            ? 'bg-purple-500/25 text-purple-100 border border-purple-500/40 hover:bg-purple-500/35'
            : 'bg-white/[0.03] text-white/30 border border-white/[0.06] cursor-not-allowed'
        }`}
      >
        {dueCount > 0 ? `▶ Ôn ${Math.min(dueCount, sessionLimit)} câu` : '✓ Đã ôn hết hôm nay'}
      </button>

      <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
        Thuật toán SM-2 (Anki) — câu càng khó càng ôn dày hơn, câu thuộc tự giãn cách.
      </p>
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: {
  icon: typeof Brain; label: string; value: number
  color: 'rose' | 'amber' | 'emerald'
}) {
  const colorClass = {
    rose:    'text-rose-300',
    amber:   'text-amber-300',
    emerald: 'text-emerald-300',
  }[color]
  return (
    <div className="rounded-md bg-black/30 p-1.5 text-center">
      <Icon className={`w-3 h-3 mx-auto ${colorClass}`} />
      <div className={`text-sm font-bold ${colorClass} mt-0.5`}>{value}</div>
      <div className="text-[9px] text-white/45">{label}</div>
    </div>
  )
}
