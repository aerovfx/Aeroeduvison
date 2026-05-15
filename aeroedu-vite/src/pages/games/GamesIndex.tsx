/**
 * Games Hub — /dashboard/games
 *
 * Trang tổng hợp các trò chơi học tập của AeroEduVision (gộp từ labtwin
 * để dễ quản lí — game ≠ lab thí nghiệm). Mỗi game là 1 card với cover,
 * mô tả ngắn, thẻ thể loại, route đầy đủ.
 *
 * Trò chơi hiện có:
 *   🌟 Pixel Odyssey   — RPG pixel adventure dài hơi, 4 chương cốt truyện
 *   🤖 Pixel Agents    — RPG học qua game đa môn, NPC AI dialogue
 *   🦬 Buffalo Runner  — endless runner thư giãn (component có sẵn)
 *   🪢 Kéo Co (KeoCo)  — quiz đối kháng 2 đội
 *   🎯 Wayground       — game custom GV tự tạo
 *
 * Route mới /dashboard/games/* — KHÔNG nằm trong /dashboard/labtwin/* nữa.
 */
import { Link } from 'react-router-dom'
import {
  Gamepad2, Sparkles, ChevronRight, Trophy, Clock, Users,
  Cpu, Sword, Target,
} from 'lucide-react'

interface GameEntry {
  key: string
  name: string
  emoji: string
  cover: string         // gradient class string
  path: string
  desc: string
  tags: string[]        // thể loại
  difficulty: 'easy' | 'medium' | 'hard'
  duration: string      // ước tính thời gian chơi
  players: 'single' | 'multi' | 'class'
  status: 'live' | 'beta' | 'preview'
  highlight?: boolean
}

const GAMES: GameEntry[] = [
  {
    key: 'pixel-odyssey',
    name: 'Pixel Odyssey',
    emoji: '🌟',
    cover: 'from-purple-600 via-pink-600 to-rose-600',
    path: '/dashboard/games/pixel-odyssey',
    desc: 'RPG pixel adventure 4 chương — Kai tìm Mira sau khi thiên thạch rơi, thu thập Star Core, chiến đấu shadow creatures qua Aetheria.',
    tags: ['RPG', 'Cốt truyện', 'Pixel Art', 'Save/Load'],
    difficulty: 'medium',
    duration: '30–60 phút/chương',
    players: 'single',
    status: 'live',
    highlight: true,
  },
  {
    key: 'pixel-agents',
    name: 'Pixel Agents',
    emoji: '🤖',
    cover: 'from-cyan-600 via-blue-600 to-indigo-600',
    path: '/dashboard/games/pixel-agents',
    desc: 'RPG học qua game — campus 7 toà nhà bộ môn (Toán, Lý, Hoá, Sinh...), mỗi NPC có personality AI riêng, trả lời câu hỏi để lên level.',
    tags: ['RPG', 'AI Dialogue', 'Đa môn', 'Multiplayer'],
    difficulty: 'easy',
    duration: '15–30 phút',
    players: 'single',
    status: 'live',
  },
  {
    key: 'keo-co',
    name: 'Kéo Co Kiến Thức',
    emoji: '🪢',
    cover: 'from-rose-600 via-orange-600 to-amber-600',
    path: '/dashboard/games/keo-co',
    desc: 'Quiz đối kháng 2 đội — kéo dây bằng kiến thức. Hỗ trợ Classroom (QR scan), Live 2 người, Thách đấu 1v1 link share.',
    tags: ['Quiz', 'Đối kháng', 'Classroom', 'Leaderboard'],
    difficulty: 'medium',
    duration: '10–20 phút',
    players: 'class',
    status: 'live',
  },
  {
    key: 'wayground',
    name: 'Wayground',
    emoji: '🎯',
    cover: 'from-emerald-600 via-teal-600 to-cyan-600',
    path: '/dashboard/games/wayground',
    desc: 'Sân chơi tự do GV custom — tạo game theo template (chạy mê cung, đố vui pixel, snake quiz...). Học sinh join qua mã 4 chữ số.',
    tags: ['Custom', 'Template', 'GV tạo'],
    difficulty: 'easy',
    duration: '5–15 phút',
    players: 'multi',
    status: 'beta',
  },
  {
    key: 'buffalo-runner',
    name: 'Buffalo Runner',
    emoji: '🦬',
    cover: 'from-yellow-600 via-orange-600 to-red-600',
    path: '/dashboard/games/buffalo-runner',
    desc: 'Endless runner pixel với chủ đề trâu Việt — nhảy né chướng ngại, ăn lúa, ghi điểm. Thư giãn giữa giờ học.',
    tags: ['Arcade', 'Casual', 'Pixel'],
    difficulty: 'easy',
    duration: '2–5 phút',
    players: 'single',
    status: 'preview',
  },
]

const PLAYER_LABEL: Record<GameEntry['players'], { label: string; icon: any; color: string }> = {
  single: { label: '1 người chơi',  icon: Target,  color: 'text-cyan-300' },
  multi:  { label: '2+ người',      icon: Users,   color: 'text-emerald-300' },
  class:  { label: 'Cả lớp',        icon: Users,   color: 'text-amber-300' },
}

const DIFF_LABEL: Record<GameEntry['difficulty'], { label: string; color: string }> = {
  easy:   { label: 'Dễ',     color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  medium: { label: 'Vừa',    color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  hard:   { label: 'Khó',    color: 'text-rose-300 bg-rose-500/15 border-rose-500/30' },
}

const STATUS_LABEL: Record<GameEntry['status'], { label: string; color: string }> = {
  live:    { label: '🟢 Live',    color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  beta:    { label: '🟡 Beta',    color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  preview: { label: '⚪ Preview', color: 'text-slate-300 bg-slate-500/15 border-slate-500/30' },
}

export default function GamesIndex() {
  const live = GAMES.filter(g => g.status === 'live')
  const others = GAMES.filter(g => g.status !== 'live')

  return (
    <div className="min-h-screen bg-[#0a0612] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-purple-500/40">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Trò chơi học tập</h1>
              <p className="text-sm text-white/50">
                {GAMES.length} game · {live.length} live · vừa giải trí vừa học hiệu quả
              </p>
            </div>
          </div>
        </div>

        {/* Highlight game (Pixel Odyssey) */}
        {GAMES.filter(g => g.highlight).map(g => {
          const playerInfo = PLAYER_LABEL[g.players]
          const PlayerIcon = playerInfo.icon
          return (
            <Link
              key={g.key}
              to={g.path}
              className="block mb-6 rounded-2xl overflow-hidden border-2 border-purple-500/40 bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-rose-900/20 hover:border-purple-400/60 transition-all hover:scale-[1.005] group"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {/* Cover */}
                <div className={`bg-gradient-to-br ${g.cover} h-48 md:h-auto relative overflow-hidden flex items-center justify-center`}>
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
                  }} />
                  <div className="text-8xl drop-shadow-2xl group-hover:scale-110 transition-transform">{g.emoji}</div>
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur text-white border border-white/20">
                    ⭐ Nổi bật
                  </div>
                </div>
                {/* Detail */}
                <div className="md:col-span-2 p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h2 className="text-2xl font-bold">{g.name}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_LABEL[g.status].color}`}>
                      {STATUS_LABEL[g.status].label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${DIFF_LABEL[g.difficulty].color}`}>
                      {DIFF_LABEL[g.difficulty].label}
                    </span>
                  </div>
                  <p className="text-sm text-white/75 leading-relaxed mb-4">{g.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {g.tags.map(t => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/60 mb-4">
                    <span className={`inline-flex items-center gap-1 ${playerInfo.color}`}>
                      <PlayerIcon className="w-3.5 h-3.5" /> {playerInfo.label}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {g.duration}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 text-purple-300 font-bold text-sm group-hover:gap-3 transition-all">
                    <Sparkles className="w-4 h-4" /> Bắt đầu chơi
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}

        {/* Grid: live games */}
        <h3 className="text-xs uppercase font-bold text-white/40 tracking-wider mb-3 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" /> Đang chơi được
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {live.filter(g => !g.highlight).map(g => (
            <GameCard key={g.key} game={g} />
          ))}
        </div>

        {/* Grid: others */}
        {others.length > 0 && (
          <>
            <h3 className="text-xs uppercase font-bold text-white/40 tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" /> Beta · Sắp có
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {others.map(g => (
                <GameCard key={g.key} game={g} />
              ))}
            </div>
          </>
        )}

        {/* Footer hint */}
        <div className="mt-10 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center text-xs text-white/50">
          💡 Mẹo: Trò chơi đã được tách khỏi Lab thí nghiệm để dễ quản lí.
          Vào <Link to="/dashboard/labtwin" className="text-cyan-300 underline">/dashboard/labtwin</Link> nếu tìm
          các thí nghiệm khoa học (Aerodynamics, Chemistry, Optics...).
        </div>
      </div>
    </div>
  )
}

function GameCard({ game: g }: { game: GameEntry }) {
  const playerInfo = PLAYER_LABEL[g.players]
  const PlayerIcon = playerInfo.icon
  return (
    <Link
      to={g.path}
      className="block rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04] transition-all group"
    >
      <div className={`bg-gradient-to-br ${g.cover} h-32 relative flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)'
        }} />
        <div className="text-5xl drop-shadow-lg group-hover:scale-110 transition-transform">{g.emoji}</div>
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${STATUS_LABEL[g.status].color}`}>
            {STATUS_LABEL[g.status].label}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${DIFF_LABEL[g.difficulty].color}`}>
            {DIFF_LABEL[g.difficulty].label}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">{g.name}</h3>
        <p className="text-[11px] text-white/60 leading-snug line-clamp-2 mb-2">{g.desc}</p>
        <div className="flex items-center justify-between text-[10px] text-white/50">
          <span className={`inline-flex items-center gap-1 ${playerInfo.color}`}>
            <PlayerIcon className="w-3 h-3" /> {playerInfo.label}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> {g.duration}
          </span>
        </div>
      </div>
    </Link>
  )
}
