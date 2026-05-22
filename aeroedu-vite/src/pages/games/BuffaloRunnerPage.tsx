/**
 * BuffaloRunnerPage — thin wrapper cho BuffaloRunner mini-game
 * /dashboard/games/buffalo-runner
 *
 * Component logic + canvas đã có sẵn trong components/games/BuffaloRunner.
 * Trang này chỉ thêm header + back link + leaderboard placeholder.
 */
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Zap } from 'lucide-react'
import BuffaloRunner from '@/components/games/BuffaloRunner'

const HIGH_SCORE_KEY = 'inphysic_buffalo_runner_highscore'

export default function BuffaloRunnerPage() {
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10) || 0 } catch { return 0 }
  })

  const handleScoreUpdate = useCallback((s: number) => {
    setScore(s)
    if (s > highScore) {
      setHighScore(s)
      try { localStorage.setItem(HIGH_SCORE_KEY, String(s)) } catch {/* noop */}
    }
  }, [highScore])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-900/20 via-orange-900/10 to-zinc-950 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/dashboard/games" className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Game Hub
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <span className="text-2xl">🦬</span>
          <h1 className="font-bold">Buffalo Runner</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Endless Runner · Pixel VN
          </span>
          <div className="flex-1" />
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-white/70">Điểm: <strong className="text-amber-300">{score}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300">Kỷ lục: <strong>{highScore}</strong></span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-3 mb-4">
          <BuffaloRunner autoStart={false} onScoreUpdate={handleScoreUpdate} />
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-xs text-white/60 leading-relaxed">
          🎮 <strong className="text-amber-300">Cách chơi:</strong> Bấm <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">Space</kbd> /
          {' '}<kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">↑</kbd> / click màn hình để con trâu nhảy qua bụi tre.
          Tốc độ tăng dần theo điểm. Kỷ lục lưu vào localStorage trình duyệt.
        </div>
      </div>
    </div>
  )
}
