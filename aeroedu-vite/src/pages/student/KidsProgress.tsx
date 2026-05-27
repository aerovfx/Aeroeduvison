/**
 * KidsProgress — Theo dõi tiến bộ kiểu Duolingo cho HS cấp Tiểu học + THCS
 *
 * Route: /student/kids-progress
 *
 * User: ảnh Duolingo learning path
 *   - Left nav (HỌC / BẢNG XẾP HẠNG / NHIỆM VỤ / CỬA HÀNG / HỒ SƠ)
 *   - Center: banner "PHẦN 1, CỬA 1" + zigzag path with circular nodes
 *   - Right: streak + gems + hearts + daily quest + create profile
 */
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Home, BookOpen, Trophy, Target, ShoppingBag, User, MoreHorizontal,
  Flame, Heart, Star, Lock, ChevronRight, ChevronUp, Crown,
} from 'lucide-react'

interface PathNode {
  id: string
  type: 'lesson' | 'chest' | 'boss' | 'star'
  state: 'completed' | 'current' | 'locked'
  label?: string
}

// Mock learning path — 6 nodes per section
const PATH_NODES: PathNode[] = [
  { id: '1', type: 'lesson', state: 'current', label: 'BẮT ĐẦU' },
  { id: '2', type: 'lesson', state: 'locked' },
  { id: '3', type: 'chest',  state: 'locked' },
  { id: '4', type: 'lesson', state: 'locked' },
  { id: '5', type: 'boss',   state: 'locked' },
]

const NAV_ITEMS = [
  { id: 'learn',       icon: Home,         label: 'HỌC',        href: '/student/kids-progress', color: 'sky' },
  { id: 'alphabet',    icon: BookOpen,     label: 'CHỮ CÁI',    href: '/student/self-study',    color: 'orange' },
  { id: 'leaderboard', icon: Trophy,       label: 'BẢNG XẾP HẠNG', href: '/student/exams', color: 'yellow' },
  { id: 'quests',      icon: Target,       label: 'NHIỆM VỤ',   href: '/student/daily',         color: 'rose' },
  { id: 'shop',        icon: ShoppingBag,  label: 'CỬA HÀNG',   href: '#',                      color: 'red' },
  { id: 'profile',     icon: User,         label: 'HỒ SƠ',      href: '/profile/basic-info',    color: 'fuchsia' },
  { id: 'more',        icon: MoreHorizontal, label: 'XEM THÊM', href: '/dashboard',             color: 'purple' },
]

export default function KidsProgress() {
  const navigate = useNavigate()
  // Local progress tracking
  const [stats, setStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kids:stats') || 'null') || {
        streak: 0, gems: 500, hearts: 5, xp: 0, dailyQuestXp: 0,
      }
    } catch { return { streak: 0, gems: 500, hearts: 5, xp: 0, dailyQuestXp: 0 } }
  })

  useEffect(() => { localStorage.setItem('kids:stats', JSON.stringify(stats)) }, [stats])

  const handleNodeClick = (node: PathNode) => {
    if (node.state === 'locked') return
    if (node.type === 'lesson' || node.type === 'boss') {
      navigate('/student/self-study')  // launch quiz
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex">
      {/* ── Left nav rail ──────────────────────────────────────── */}
      <nav className="hidden md:flex w-56 lg:w-64 shrink-0 border-r-2 border-slate-200 dark:border-slate-800 flex-col py-4 px-2 sticky top-0 h-screen">
        <div className="px-4 py-3 mb-2">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400" style={{ letterSpacing: '-0.04em' }}>
              aeroedu
            </span>
          </Link>
        </div>
        {NAV_ITEMS.map(item => {
          const active = item.id === 'learn'
          return (
            <Link key={item.id} to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition mb-1 font-black text-sm tracking-wider ${
                active
                  ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/40 text-sky-500 dark:text-sky-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}>
              <item.icon className="w-7 h-7" strokeWidth={2.5} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Center: path ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-4 md:px-8 py-4 min-w-0">
        {/* Banner */}
        <div className="w-full max-w-2xl rounded-2xl mb-8 px-5 md:px-7 py-4 md:py-5 flex items-center gap-3 shadow-lg"
          style={{
            background: 'linear-gradient(180deg, #58cc02, #46a302)',
            boxShadow: '0 4px 0 rgb(60, 137, 0)',
          }}>
          <button onClick={() => navigate('/dashboard')}
            className="text-white/90 hover:text-white p-1">
            <ChevronUp className="w-4 h-4 -rotate-90" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-black text-white/80">
              Phần 1, Cửa 1
            </div>
            <h1 className="text-lg md:text-2xl font-black text-white truncate">
              Mời khách xơi nước
            </h1>
          </div>
          <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
            📝 <span className="hidden sm:inline">Hướng dẫn</span>
          </button>
        </div>

        {/* Path */}
        <div className="w-full max-w-md flex flex-col items-center py-4">
          {PATH_NODES.map((node, i) => {
            const offset = i % 4 === 0 ? 0 : i % 4 === 1 ? -60 : i % 4 === 2 ? 0 : 60
            return (
              <div key={node.id}
                className="relative my-3 md:my-4"
                style={{ transform: `translateX(${offset}px)` }}>
                {node.state === 'current' && node.label && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-white border-2 border-slate-300 dark:bg-slate-900 dark:border-slate-700 shadow-lg whitespace-nowrap"
                    style={{ boxShadow: '0 3px 0 rgb(203 213 225)' }}>
                    <div className="text-xs font-black text-emerald-500 uppercase tracking-wider">{node.label}</div>
                    {/* Tail */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-slate-900 rotate-45 border-r-2 border-b-2 border-slate-300 dark:border-slate-700" />
                  </div>
                )}
                <button
                  onClick={() => handleNodeClick(node)}
                  disabled={node.state === 'locked'}
                  className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-transform active:translate-y-1 ${
                    node.state === 'locked' ? 'cursor-not-allowed' : 'hover:scale-110'
                  }`}
                  style={{
                    background:
                      node.state === 'current'
                        ? 'radial-gradient(circle at 30% 30%, #7ed320, #58cc02 60%, #46a302)'
                        : node.state === 'completed'
                        ? 'radial-gradient(circle at 30% 30%, #ffd700, #f59e0b 60%, #c2691b)'
                        : 'radial-gradient(circle at 30% 30%, #d4d4d8, #a1a1aa 60%, #71717a)',
                    boxShadow: node.state === 'current'
                      ? '0 6px 0 rgb(60, 137, 0), 0 0 0 4px rgba(88, 204, 2, 0.2)'
                      : node.state === 'completed'
                      ? '0 6px 0 rgb(180, 100, 25)'
                      : '0 4px 0 rgb(82, 82, 91)',
                  }}>
                  {node.type === 'lesson' && (
                    node.state === 'locked'
                      ? <Lock className="w-8 h-8 md:w-10 md:h-10 text-white/70" strokeWidth={3} />
                      : <Star className="w-9 h-9 md:w-12 md:h-12 text-white fill-white" strokeWidth={2} />
                  )}
                  {node.type === 'chest' && (
                    <span className="text-4xl md:text-5xl">{node.state === 'locked' ? '🔒' : '🎁'}</span>
                  )}
                  {node.type === 'boss' && (
                    node.state === 'locked'
                      ? <Trophy className="w-9 h-9 md:w-12 md:h-12 text-white/70" strokeWidth={2.5} />
                      : <Trophy className="w-10 h-10 md:w-14 md:h-14 text-white" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            )
          })}

          {/* Duo mascot */}
          <div className="relative -mt-6 ml-32 md:ml-40 text-7xl md:text-8xl pointer-events-none select-none animate-bounce" style={{ animationDuration: '3s' }}>
            🦉
          </div>
        </div>
      </main>

      {/* ── Right rail ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-80 shrink-0 border-l-2 border-slate-200 dark:border-slate-800 flex-col py-4 px-4 sticky top-0 h-screen overflow-y-auto gap-3">
        {/* Stats bar */}
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <div className="flex items-center gap-1 text-base font-black">
            <span className="text-2xl">🇻🇳</span>
          </div>
          <div className="flex items-center gap-1 text-base font-black text-orange-500">
            <Flame className="w-5 h-5 fill-orange-400" />
            <span>{stats.streak}</span>
          </div>
          <div className="flex items-center gap-1 text-base font-black text-sky-500">
            <div className="w-5 h-5 rounded bg-sky-500" style={{ clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }} />
            <span>{stats.gems}</span>
          </div>
          <div className="flex items-center gap-1 text-base font-black text-rose-500">
            <Heart className="w-5 h-5 fill-rose-500" />
            <span>{stats.hearts}</span>
          </div>
        </div>

        {/* Mở khóa Bảng xếp hạng */}
        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white mb-2">Mở khóa Bảng xếp hạng!</h3>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Hoàn thành thêm 5 bài học để bắt đầu thi đua
            </p>
          </div>
        </div>

        {/* Nhiệm vụ hằng ngày */}
        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-base text-slate-900 dark:text-white">Nhiệm vụ hằng ngày</h3>
            <Link to="/student/daily" className="text-xs font-black uppercase tracking-wider text-sky-500 hover:text-sky-600">
              Xem tất cả
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center text-3xl">⚡</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Kiếm 10 KN</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-300 to-orange-400 transition-all"
                    style={{ width: `${Math.min(100, (stats.dailyQuestXp / 10) * 100)}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">{stats.dailyQuestXp} / 10</span>
              </div>
            </div>
            <span className="text-2xl">🎁</span>
          </div>
        </div>

        {/* Create profile CTA */}
        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-4">
          <h3 className="font-black text-base text-slate-900 dark:text-white mb-3 text-center">
            Tạo hồ sơ để lưu tiến trình của bạn!
          </h3>
          <button
            onClick={() => navigate('/auth/register')}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-wider text-sm transition active:translate-y-0.5"
            style={{ boxShadow: '0 4px 0 rgb(22 163 74)' }}>
            Tạo hồ sơ
          </button>
          <button
            onClick={() => navigate('/auth/login')}
            className="w-full py-3 mt-2 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-black uppercase tracking-wider text-sm transition active:translate-y-0.5"
            style={{ boxShadow: '0 4px 0 rgb(2 132 199)' }}>
            Đăng nhập
          </button>
        </div>

        {/* Footer links */}
        <div className="mt-auto pt-4 text-[10px] text-slate-400 dark:text-slate-600 text-center flex items-center justify-center gap-3 flex-wrap">
          <Link to="#" className="hover:text-slate-600">GIỚI THIỆU</Link>
          <Link to="#" className="hover:text-slate-600">CỬA HÀNG</Link>
          <Link to="#" className="hover:text-slate-600">HIỆU QUẢ</Link>
          <Link to="#" className="hover:text-slate-600">CÔNG VIỆC</Link>
        </div>
      </aside>
    </div>
  )
}
