/**
 * Achievements — clone chính xác từ
 * app/(dashboard)/(routes)/dashboard/achievements/page.tsx
 */
import { useState } from 'react'
import { Trophy, Star, Target, Zap, Brain, Crown } from 'lucide-react'

const categories = [
  { id: 'all',      name: 'Tất cả',    icon: Trophy },
  { id: 'learning', name: 'Học tập',   icon: Star },
  { id: 'streak',   name: 'Chuỗi',     icon: Zap },
  { id: 'skill',    name: 'Kỹ năng',   icon: Target },
  { id: 'social',   name: 'Xã hội',    icon: Crown },
  { id: 'special',  name: 'Đặc biệt',  icon: Brain },
]

const achievements = [
  { id: 1,  title: 'First Steps',        description: 'Hoàn thành bài học đầu tiên',                       icon: '👶', category: 'learning', earned: true,  earnedDate: '2025-01-10', xp: 50,   rarity: 'common',    progress: undefined },
  { id: 2,  title: 'Math Master',        description: 'Hoàn thành 50 bài học Toán',                        icon: '🧮', category: 'learning', earned: true,  earnedDate: '2025-01-15', xp: 200,  rarity: 'rare',      progress: undefined },
  { id: 3,  title: 'Physics Explorer',   description: 'Hoàn thành 25 bài học Vật lý',                      icon: '⚛️', category: 'learning', earned: true,  earnedDate: '2025-01-12', xp: 150,  rarity: 'uncommon',  progress: undefined },
  { id: 4,  title: 'Chemistry Wizard',   description: 'Hoàn thành 100 bài học Hóa học',                    icon: '🧪', category: 'learning', earned: false, earnedDate: undefined,    xp: 500,  rarity: 'epic',      progress: 75 },
  { id: 5,  title: 'Week Warrior',       description: 'Học liên tục 7 ngày',                               icon: '🔥', category: 'streak',   earned: true,  earnedDate: '2025-01-16', xp: 100,  rarity: 'uncommon',  progress: undefined },
  { id: 6,  title: 'Month Master',       description: 'Học liên tục 30 ngày',                              icon: '📅', category: 'streak',   earned: false, earnedDate: undefined,    xp: 1000, rarity: 'legendary', progress: 23 },
  { id: 7,  title: 'Speed Demon',        description: 'Hoàn thành 10 bài học trong 1 ngày',                icon: '⚡', category: 'skill',    earned: true,  earnedDate: '2025-01-14', xp: 300,  rarity: 'rare',      progress: undefined },
  { id: 8,  title: 'Perfectionist',      description: 'Đạt 100% accuracy cho 5 bài học liên tiếp',        icon: '🎯', category: 'skill',    earned: false, earnedDate: undefined,    xp: 400,  rarity: 'epic',      progress: 3 },
  { id: 9,  title: 'AI Explorer',        description: 'Hoàn thành bài học AI/ML đầu tiên',                 icon: '🤖', category: 'skill',    earned: true,  earnedDate: '2025-01-11', xp: 100,  rarity: 'uncommon',  progress: undefined },
  { id: 10, title: 'Helper',             description: 'Giúp đỡ 5 bạn học khác',                           icon: '🤝', category: 'social',   earned: false, earnedDate: undefined,    xp: 250,  rarity: 'rare',      progress: 2 },
  { id: 11, title: 'Mentor',             description: 'Hướng dẫn 10 bạn học mới',                         icon: '👨‍🏫', category: 'social',   earned: false, earnedDate: undefined,    xp: 500,  rarity: 'epic',      progress: 0 },
  { id: 12, title: 'Night Owl',          description: 'Học sau 10 giờ tối',                                icon: '🦉', category: 'special',  earned: true,  earnedDate: '2025-01-13', xp: 75,   rarity: 'uncommon',  progress: undefined },
  { id: 13, title: 'Early Bird',         description: 'Học trước 6 giờ sáng',                              icon: '🐦', category: 'special',  earned: false, earnedDate: undefined,    xp: 100,  rarity: 'rare',      progress: 0 },
  { id: 14, title: 'Century Club',       description: 'Đạt 1000 XP trong 1 ngày',                          icon: '💯', category: 'special',  earned: false, earnedDate: undefined,    xp: 1000, rarity: 'legendary', progress: 0 },
]

function getRarityStyle(rarity: string) {
  switch (rarity) {
    case 'common':    return { border: 'border-white/[0.08]',                  glow: '' }
    case 'uncommon':  return { border: 'border-[hsl(175,80%,50%)]/20',         glow: 'shadow-[0_0_12px_rgba(0,210,180,0.06)]' }
    case 'rare':      return { border: 'border-[hsl(210,90%,60%)]/20',         glow: 'shadow-[0_0_12px_rgba(60,130,255,0.06)]' }
    case 'epic':      return { border: 'border-[hsl(280,75%,60%)]/20',         glow: 'shadow-[0_0_12px_rgba(160,80,255,0.06)]' }
    case 'legendary': return { border: 'border-[hsl(35,90%,55%)]/25',          glow: 'shadow-[0_0_16px_rgba(230,160,50,0.08)]' }
    default:          return { border: 'border-white/[0.08]',                  glow: '' }
  }
}

function getRarityBadge(rarity: string) {
  switch (rarity) {
    case 'common':    return 'bg-white/[0.06] text-white/40'
    case 'uncommon':  return 'bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,55%)]'
    case 'rare':      return 'bg-[hsl(210,90%,60%)]/10 text-[hsl(210,90%,65%)]'
    case 'epic':      return 'bg-[hsl(280,75%,60%)]/10 text-[hsl(280,75%,65%)]'
    case 'legendary': return 'bg-[hsl(35,90%,55%)]/10 text-[hsl(35,90%,60%)]'
    default:          return 'bg-white/[0.06] text-white/40'
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

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory)

  const earnedCount = achievements.filter(a => a.earned).length
  const totalCount = achievements.length
  const completionRate = Math.round((earnedCount / totalCount) * 100)

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-gradient-to-r from-[hsl(35,90%,50%)]/15 to-[hsl(25,85%,50%)]/15 backdrop-blur-xl rounded-2xl border border-[hsl(35,90%,55%)]/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white/90 mb-1">Achievements &amp; Gamification</h1>
              <p className="text-sm text-white/40">Thành tích, huy hiệu và milestone của bạn</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[hsl(245,85%,75%)]">{earnedCount}/{totalCount}</div>
              <div className="text-xs text-white/40">Achievements</div>
              <div className="text-[0.65rem] text-[hsl(175,80%,55%)]">{completionRate}% Complete</div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total XP',       value: '2,450',  icon: Zap,    color: 'from-[hsl(280,75%,55%)] to-[hsl(320,70%,55%)]', glow: 'rgba(160,80,255,0.15)' },
            { label: 'Current Streak', value: '7 days', icon: Target, color: 'from-[hsl(25,85%,50%)] to-[hsl(0,80%,55%)]',   glow: 'rgba(230,120,50,0.15)' },
            { label: 'Rank',           value: '#15',    icon: Crown,  color: 'from-[hsl(210,90%,55%)] to-[hsl(245,85%,60%)]', glow: 'rgba(60,130,255,0.15)' },
            { label: 'Level',          value: '12',     icon: Star,   color: 'from-[hsl(175,80%,45%)] to-[hsl(160,70%,45%)]', glow: 'rgba(0,210,180,0.15)' },
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
        <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-[hsl(245,85%,65%)]" />
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
                      : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70'
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
                className={`bg-white/[0.02] backdrop-blur-xl rounded-2xl p-5 border transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] ${style.border} ${style.glow} ${!achievement.earned ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{achievement.icon}</div>
                  <span className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full ${getRarityBadge(achievement.rarity)}`}>
                    {getRarityText(achievement.rarity)}
                  </span>
                </div>

                <h3 className={`text-sm font-semibold mb-1 ${achievement.earned ? 'text-white/90' : 'text-white/50'}`}>
                  {achievement.title}
                </h3>

                <p className={`text-xs mb-3 ${achievement.earned ? 'text-white/50' : 'text-white/30'}`}>
                  {achievement.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-[hsl(35,90%,55%)]" />
                    <span className="text-xs font-medium text-white/50">{achievement.xp} XP</span>
                  </div>

                  {achievement.earned ? (
                    <div className="flex items-center gap-1 text-[hsl(175,80%,55%)]">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="text-[0.65rem] font-medium">Earned</span>
                    </div>
                  ) : (
                    <span className="text-[0.65rem] text-white/30">
                      {achievement.progress !== undefined ? `${achievement.progress}%` : 'Not started'}
                    </span>
                  )}
                </div>

                {achievement.earned && achievement.earnedDate && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-[0.65rem] text-white/30">
                      Earned on {new Date(achievement.earnedDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}

                {!achievement.earned && achievement.progress !== undefined && achievement.progress > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] h-1.5 rounded-full transition-all"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                    <p className="text-[0.6rem] text-white/25 mt-1">Progress: {achievement.progress}%</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI Motivation */}
        <div className="bg-gradient-to-r from-[hsl(245,85%,55%)]/15 to-[hsl(280,75%,55%)]/15 backdrop-blur-xl rounded-2xl border border-[hsl(245,85%,65%)]/20 p-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(120,100,255,0.25)]">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white/90 mb-2">AI Motivation</h3>
              <p className="text-xs text-white/50 mb-3">
                Bạn đang làm rất tốt! Với {earnedCount} achievements đã đạt được, bạn đang trên con đường trở thành một học sinh xuất sắc.
              </p>
              <div className="space-y-1 text-xs text-white/40">
                <p><strong className="text-[hsl(35,90%,55%)]">Next Goal:</strong> Hoàn thành &ldquo;Chemistry Wizard&rdquo; (75% done)</p>
                <p><strong className="text-[hsl(175,80%,55%)]">Tip:</strong> Học đều đặn mỗi ngày để duy trì streak!</p>
                <p><strong className="text-[hsl(245,85%,75%)]">Challenge:</strong> Thử đạt &ldquo;Perfectionist&rdquo; bằng cách làm chính xác 100%</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
