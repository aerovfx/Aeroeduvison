/**
 * Achievements — wire real data từ /api/achievements/me
 * BE compute earned/progress dựa trên Purchase + LessonHistory + PracticeExam
 * + PageView (night/early hours, day streak) + xp_reward sum.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Star, Target, Zap, Brain, Crown } from 'lucide-react'
import { api } from '@/services/api'

const categories = [
  { id: 'all',      name: 'Tất cả',    icon: Trophy },
  { id: 'learning', name: 'Học tập',   icon: Star },
  { id: 'streak',   name: 'Chuỗi',     icon: Zap },
  { id: 'skill',    name: 'Kỹ năng',   icon: Target },
  { id: 'social',   name: 'Xã hội',    icon: Crown },
  { id: 'special',  name: 'Đặc biệt',  icon: Brain },
]

interface Achievement {
  id: number
  title: string
  description: string
  icon: string
  category: string
  earned: boolean
  earnedDate?: string | null
  xp: number
  rarity: string
  progress?: number
}

interface AchievementsResponse {
  achievements: Achievement[]
  total: number
  earnedCount: number
  totalXP: number
  completionRate: number
  signals?: {
    streak?: number
    xpToday?: number
  }
}

// Fallback nếu BE chưa wire (page vẫn render)
const FALLBACK_ACHIEVEMENTS: Achievement[] = [
  { id: 1,  title: 'First Steps',      description: 'Hoàn thành bài học đầu tiên',          icon: '👶',   category: 'learning', earned: false, xp: 50,   rarity: 'common',    progress: 0 },
  { id: 5,  title: 'Week Warrior',     description: 'Học liên tục 7 ngày',                  icon: '🔥',   category: 'streak',   earned: false, xp: 100,  rarity: 'uncommon',  progress: 0 },
  { id: 9,  title: 'AI Explorer',      description: 'Hoàn thành bài luyện đầu tiên',        icon: '🤖',   category: 'skill',    earned: false, xp: 100,  rarity: 'uncommon',  progress: 0 },
]

function getRarityStyle(rarity: string) {
  switch (rarity) {
    case 'common':    return { border: 'border-white/[0.08]',                  glow: '' }
    case 'uncommon':  return { border: 'border-cyan-500/30',         glow: 'shadow-[0_0_12px_rgba(0,210,180,0.06)]' }
    case 'rare':      return { border: 'border-blue-500/30',         glow: 'shadow-[0_0_12px_rgba(60,130,255,0.06)]' }
    case 'epic':      return { border: 'border-purple-500/30',         glow: 'shadow-[0_0_12px_rgba(160,80,255,0.06)]' }
    case 'legendary': return { border: 'border-amber-500/30',          glow: 'shadow-[0_0_16px_rgba(230,160,50,0.08)]' }
    default:          return { border: 'border-white/[0.08]',                  glow: '' }
  }
}

function getRarityBadge(rarity: string) {
  switch (rarity) {
    case 'common':    return 'bg-muted text-muted-foreground'
    case 'uncommon':  return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
    case 'rare':      return 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
    case 'epic':      return 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
    case 'legendary': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    default:          return 'bg-muted text-muted-foreground'
  }
}

function getRarityText(rarity: string) {
  switch (rarity) {
    case 'common':    return 'Common'
    case 'uncommon':  return 'Uncommon'
    case 'rare':      return 'Rare'
    case 'epic':      return 'Epic'
    case 'legendary': return 'Legendary'
    default:          return 'Common'
  }
}

export default function AchievementsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Real data từ BE
  const { data, isLoading } = useQuery<AchievementsResponse>({
    queryKey: ['achievements-me'],
    queryFn: () => api.get<AchievementsResponse>('/achievements/me').then(r => r.data),
    staleTime: 60_000,  // cache 1 phút
    retry: 1,
  })

  const achievements = data?.achievements?.length ? data.achievements : FALLBACK_ACHIEVEMENTS
  const earnedCount = data?.earnedCount ?? achievements.filter(a => a.earned).length
  const totalCount = data?.total ?? achievements.length
  const completionRate = data?.completionRate ?? Math.round((earnedCount / totalCount) * 100)
  const totalXPEarned = data?.totalXP ?? achievements.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
  const currentStreak = data?.signals?.streak ?? 0
  const xpToday = data?.signals?.xpToday ?? 0
  const userLevel = Math.max(1, Math.floor(totalXPEarned / 250))

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory)

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Achievements &amp; Gamification</h1>
              <p className="text-sm text-muted-foreground">Thành tích, huy hiệu và milestone của bạn</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">{earnedCount}/{totalCount}</div>
              <div className="text-xs text-muted-foreground">Achievements</div>
              <div className="text-[0.65rem] text-cyan-600 dark:text-cyan-300">{completionRate}% Complete</div>
            </div>
          </div>
        </div>

        {/* Stats Overview — REAL data */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng XP',          value: totalXPEarned.toLocaleString('vi-VN'),  icon: Zap,    color: 'from-[hsl(280,75%,55%)] to-[hsl(320,70%,55%)]', glow: 'rgba(160,80,255,0.15)' },
            { label: 'Streak hiện tại',  value: `${currentStreak} ngày`,                icon: Target, color: 'from-[hsl(25,85%,50%)] to-[hsl(0,80%,55%)]',   glow: 'rgba(230,120,50,0.15)' },
            { label: 'XP hôm nay',       value: xpToday.toLocaleString('vi-VN'),        icon: Crown,  color: 'from-[hsl(210,90%,55%)] to-[hsl(245,85%,60%)]', glow: 'rgba(60,130,255,0.15)' },
            { label: 'Cấp độ',           value: String(userLevel),                       icon: Star,   color: 'from-[hsl(175,80%,45%)] to-[hsl(160,70%,45%)]', glow: 'rgba(0,210,180,0.15)' },
          ].map(({ label, value, icon: Icon, color, glow }) => (
            <div
              key={label}
              className={`bg-gradient-to-br ${color} rounded-2xl p-5 text-white relative overflow-hidden`}
              style={{ boxShadow: `0 0 20px ${glow}` }}
            >
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs text-white/60">{label}</p>
                  <p className="text-xl font-bold mt-0.5">{value}</p>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="bg-card backdrop-blur-xl rounded-2xl border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            Filter by Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white shadow-[0_0_16px_rgba(120,100,255,0.2)]'
                      : 'bg-muted text-muted-foreground border hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {category.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map((achievement) => {
            const style = getRarityStyle(achievement.rarity)
            return (
              <div
                key={achievement.id}
                /* 2026-05-19: bg-card thay bg-white/[0.02] (vốn → rgba(0,0,0,0.02)
                   trên light = trong suốt). Unearned dùng opacity-90 (light) +
                   dark:opacity-60 — light bg cần dim nhẹ hơn vì text vốn đã faded. */
                className={`bg-card backdrop-blur-xl rounded-2xl p-5 border transition-all hover:-translate-y-0.5 hover:bg-accent/50 ${style.border} ${style.glow} ${!achievement.earned ? 'opacity-90 dark:opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{achievement.icon}</div>
                  <span className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${getRarityBadge(achievement.rarity)}`}>
                    {getRarityText(achievement.rarity)}
                  </span>
                </div>

                <h3 className={`text-sm font-semibold mb-1 ${achievement.earned ? 'text-foreground' : 'text-foreground/75'}`}>
                  {achievement.title}
                </h3>

                <p className={`text-xs mb-3 ${achievement.earned ? 'text-muted-foreground' : 'text-muted-foreground/80'}`}>
                  {achievement.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                    <span className="text-xs font-medium text-muted-foreground">{achievement.xp} XP</span>
                  </div>

                  {achievement.earned ? (
                    <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-300">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-[0.65rem] font-medium">Earned</span>
                    </div>
                  ) : (
                    <span className="text-[0.65rem] text-muted-foreground">
                      {achievement.progress !== undefined ? `${achievement.progress}%` : 'Not started'}
                    </span>
                  )}
                </div>

                {achievement.earned && achievement.earnedDate && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-[0.65rem] text-muted-foreground">
                      Earned on {new Date(achievement.earnedDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}

                {!achievement.earned && achievement.progress !== undefined && achievement.progress > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] h-1.5 rounded-full transition-all"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                    <p className="text-[0.6rem] text-muted-foreground mt-1">Progress: {achievement.progress}%</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI Motivation */}
        <div className="bg-gradient-to-r from-indigo-500/15 to-purple-500/15 backdrop-blur-xl rounded-2xl border border-indigo-500/30 p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(120,100,255,0.25)]">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground mb-2">AI Motivation</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Bạn đang làm rất tốt! Với {earnedCount} achievements đã đạt được, bạn đang trên con đường trở thành một học sinh xuất sắc.
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong className="text-amber-600 dark:text-amber-300">Next Goal:</strong> Hoàn thành &ldquo;Chemistry Wizard&rdquo; (75% done)</p>
                <p><strong className="text-cyan-600 dark:text-cyan-300">Tip:</strong> Học đều đặn mỗi ngày để duy trì streak!</p>
                <p><strong className="text-indigo-600 dark:text-indigo-300">Challenge:</strong> Thử đạt &ldquo;Perfectionist&rdquo; bằng cách làm chính xác 100%</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
