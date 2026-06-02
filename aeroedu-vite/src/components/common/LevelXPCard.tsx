/**
 * LevelXPCard — Card hiển thị Level + XP của user kiểu Meteor / gaming dashboard.
 *
 * Lấy XP từ /api/exam-xp/me. Hiển thị:
 *   - Level badge ngôi sao vàng + số cấp
 *   - Player name + role chip (VIP/Free)
 *   - Pink/magenta progress bar gradient
 *   - "Mua coins" CTA → /pricing (gamification: nâng cấp Premium)
 *   - Recent achievements (3 lần làm bài gần nhất)
 *
 * Style: dark navy/purple bg, glow effects, pink accent.
 */
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Star, Coins, Trophy, ChevronRight } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { mascot } from '@/components/mascot/MascotBus'

interface XpMe {
  totalXp: number
  examCount: number
  level: number
  nextLevelXp: number
  xpToNext: number
  history: Array<{
    id: string
    examId: string
    percentage: number
    xpEarned: number
    earnedAt: string
  }>
}

interface LevelXPCardProps {
  /** Hiển thị recent achievements không? (mặc định true) */
  showAchievements?: boolean
  /** Compact mode (chỉ level badge + XP bar) */
  compact?: boolean
}

export function LevelXPCard({ showAchievements = true, compact = false }: LevelXPCardProps) {
  const { user } = useAuth()
  const { data } = useQuery<XpMe>({
    queryKey: ['xp-me'],
    queryFn: () =>
      api.get<XpMe>('/exam-xp/me')
        .then(r => r.data)
        .catch(() => ({
          totalXp: 0, examCount: 0, level: 1,
          nextLevelXp: 100, xpToNext: 100, history: [],
        })),
    staleTime: 30_000,
  })

  const totalXp = data?.totalXp ?? 0
  const level = data?.level ?? 1
  // Mascot Aero ăn mừng khi lên cấp
  const prevLevel = useRef<number | null>(null)
  useEffect(() => {
    if (prevLevel.current != null && level > prevLevel.current) {
      mascot.emit('levelUp', { text: `Lên cấp ${level}! 🚀` })
    }
    prevLevel.current = level
  }, [level])
  const xpInLevel = totalXp % 100
  const progress = (xpInLevel / 100) * 100
  const displayName = user?.name?.split(' ').pop() || 'Bạn'

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] p-4 sm:p-5"
      style={{
        background:
          'linear-gradient(135deg, #1f0d3a 0%, #2d1b4e 50%, #1a0b2e 100%)',
      }}
    >
      {/* Glow orbs */}
      <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />

      <div className="relative">
        {/* Top row — Level badge + Name + Buy coins */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          {/* Level star badge */}
          <div className="relative flex-shrink-0">
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 6px 20px rgba(245,158,11,0.5)',
              }}
            >
              <Star className="absolute w-full h-full opacity-30" fill="white" />
              <span className="relative">{level}</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base sm:text-lg leading-tight truncate">
              {displayName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 uppercase tracking-wider">
                {totalXp >= 500 ? 'Pro' : totalXp >= 100 ? 'Hero' : 'Tân binh'}
              </span>
              <span className="text-xs text-white/55">{data?.examCount || 0} bài</span>
            </div>
          </div>

          {/* Coins CTA */}
          {!compact && (
            <Link
              to="/pricing"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg hover:scale-[1.03] transition-transform"
            >
              <Coins className="w-3.5 h-3.5" /> Nâng gói
            </Link>
          )}
        </div>

        {/* XP Progress bar — Pink Meteor-style */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs sm:text-sm text-white/65 font-semibold tabular-nums">
              {xpInLevel} XP
            </span>
            <span className="text-xs sm:text-sm text-white/55 tabular-nums">
              {data?.nextLevelXp || 100} XP
            </span>
          </div>
          <div className="relative h-3 sm:h-3.5 rounded-full overflow-hidden bg-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.max(4, progress)}%`,
                background: 'linear-gradient(90deg, #ec4899, #f472b6, #f9a8d4)',
                boxShadow: '0 0 12px rgba(236,72,153,0.7)',
              }}
            />
            <div
              className="absolute top-0 h-full w-1 bg-white/80"
              style={{
                left: `${Math.max(4, progress)}%`,
                boxShadow: '0 0 8px rgba(255,255,255,0.9)',
              }}
            />
          </div>
          <p className="text-[11px] text-white/45 mt-1.5">
            Còn <span className="text-fuchsia-300 font-bold">{data?.xpToNext ?? 100} XP</span> để lên cấp {level + 1}
          </p>
        </div>

        {/* Recent achievements */}
        {showAchievements && !compact && (data?.history?.length ?? 0) > 0 && (
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/55 flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-amber-400" /> Thành tích gần đây
              </h4>
              <Link to="/dashboard/achievements" className="text-[11px] text-white/45 hover:text-white/70 flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <ul className="space-y-1.5">
              {data!.history.slice(0, 3).map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${
                    h.percentage >= 90 ? 'bg-amber-500/25 text-amber-300'
                      : h.percentage >= 70 ? 'bg-emerald-500/25 text-emerald-300'
                      : h.percentage >= 50 ? 'bg-cyan-500/25 text-cyan-300'
                      : 'bg-fuchsia-500/25 text-fuchsia-300'
                  }`}>
                    {h.percentage}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/85 font-medium leading-tight truncate">
                      Bài thi {h.examId.slice(0, 8)}…
                    </p>
                    <p className="text-[10px] text-white/45">
                      {new Date(h.earnedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <span className="text-xs font-black tabular-nums text-fuchsia-300 flex-shrink-0">
                    +{h.xpEarned} XP
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default LevelXPCard
