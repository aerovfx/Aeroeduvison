/**
 * Student Progress — Dashboard Học Tập v3 (2026-05-16)
 *
 * Đã rewrite hoàn toàn:
 *   - Drop Math.random mock data + relative fetch() URLs
 *   - Dùng @/services/api qua studentProgressService
 *   - Honest empty states ("Chưa có dữ liệu") thay vì fake values
 *   - Tích hợp localStorage stats cho features client-side:
 *     · Scrumboard tasks done
 *     · Pixel Odyssey save (chapter, star cores, level)
 *     · Digital Logic Lab last circuit
 *   - Backend /api/student/progress-overview cho exam/streak/weekly/KG/KeoCo
 *   - 4 sections: Overview · Activities · Games & Labs · Recommendations
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Target, TrendingUp, Clock, Trophy,
  Brain, Flame, BarChart3, Calendar, Star,
  GraduationCap, Cpu, Sparkles, RefreshCw,
  Layers, Activity, ArrowRight, AlertCircle, Award,
  Gamepad2, Network, Zap, MessageSquare, CheckCircle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  studentProgressService as svc,
  type ProgressOverview,
} from '@/services/student-progress.service'

// ─── Utils ─────────────────────────────────────────────────────────
function fmtNumber(n: number): string {
  return n.toLocaleString('vi-VN')
}

function fmtScore(s: number): string {
  if (s === 0) return '—'
  return s.toFixed(1)
}

// ─── Small reusable components ─────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color = '#22d3ee', trend,
}: {
  icon: any; label: string; value: string | number; sub?: string
  color?: string; trend?: 'up' | 'down' | null
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <TrendingUp className={`h-3.5 w-3.5 ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400 rotate-180'}`} />
        )}
      </div>
      <div className="text-2xl font-bold text-white/90 mb-0.5">{value}</div>
      <div className="text-[10px] uppercase text-white/40 font-bold tracking-wider">{label}</div>
      {sub && <div className="text-[11px] text-white/50 mt-1">{sub}</div>}
    </div>
  )
}

function Section({ title, icon: Icon, children, action }: {
  title: string; icon: any; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </section>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] p-4 text-center text-xs text-white/40">
      {children}
    </div>
  )
}

// ─── Weekly heatmap ───────────────────────────────────────────────
function WeeklyHeatmap({ data }: { data: ProgressOverview['weekly'] }) {
  if (!data || data.length === 0) return null
  const max = Math.max(1, ...data.map(d => d.xp))
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-emerald-400" /> Hoạt động 7 ngày qua
        </h3>
        <span className="text-[10px] text-white/40">XP earned từ exam attempts</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {data.map(d => {
          const intensity = d.xp / max
          const isToday = d.date === new Date().toISOString().slice(0, 10)
          return (
            <div key={d.date} className="text-center">
              <div className="text-[10px] text-white/40 mb-1.5">{d.label}</div>
              <div
                className={`aspect-square rounded-lg border ${isToday ? 'border-cyan-400/60' : 'border-white/[0.06]'} flex flex-col items-center justify-center gap-0.5 transition-all`}
                style={{
                  background: d.xp > 0
                    ? `rgba(34,211,238,${0.15 + intensity * 0.55})`
                    : 'rgba(255,255,255,0.02)',
                }}
                title={`${d.date}: ${d.xp} XP · ${d.activities} hoạt động`}
              >
                <div className={`text-xs font-bold ${d.xp > 0 ? 'text-cyan-200' : 'text-white/20'}`}>
                  {d.xp}
                </div>
                {d.activities > 0 && (
                  <div className="text-[9px] text-white/50">{d.activities}h</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-white/40">
        <span>Tổng tuần: <strong className="text-white/70">{data.reduce((s, d) => s + d.xp, 0)} XP</strong></span>
        <span>Hôm nay: <strong className="text-cyan-300">{data[data.length - 1]?.xp || 0} XP</strong></span>
      </div>
    </div>
  )
}

// ─── Streak card ──────────────────────────────────────────────────
function StreakCard({ streak }: { streak: ProgressOverview['streak'] | null }) {
  const cur = streak?.current || 0
  const longest = streak?.longest || 0
  return (
    <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-rose-500/5 p-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Flame className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-3xl font-bold text-orange-300 leading-none mb-1">
            {cur} <span className="text-base text-orange-200/70 font-medium">ngày</span>
          </div>
          <div className="text-xs text-white/60">
            {cur === 0 ? 'Hãy bắt đầu chuỗi học hôm nay!' : 'Streak hiện tại'}
          </div>
          <div className="text-[10px] text-white/40 mt-1">
            Kỷ lục: <strong className="text-orange-200/80">{longest} ngày</strong>
            {streak?.lastActive && ` · Lần gần nhất: ${new Date(streak.lastActive).toLocaleDateString('vi-VN')}`}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Exam stats card ──────────────────────────────────────────────
function ExamStatsCard({ stats }: { stats: ProgressOverview['examStats'] | null }) {
  if (!stats || stats.count === 0) {
    return (
      <EmptyHint>
        🎯 Chưa làm đề thi nào. <Link to="/student/exam-modes" className="text-cyan-300 hover:underline">Thử ngay 5 chế độ thi</Link>
      </EmptyHint>
    )
  }
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-3xl font-bold text-cyan-300">{stats.count}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Bài đã làm</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-yellow-300">{fmtScore(stats.avgScore)}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Điểm trung bình</div>
        </div>
      </div>
      {stats.recent.length > 0 && (
        <div className="border-t border-white/[0.06] pt-3">
          <div className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-2">5 lần gần nhất</div>
          <div className="space-y-1.5">
            {stats.recent.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="text-white/80 truncate flex-1">{r.title || 'Đề thi'}</span>
                <span className={`font-mono font-bold ${r.score >= 8 ? 'text-emerald-300' : r.score >= 5 ? 'text-yellow-300' : 'text-rose-300'}`}>
                  {fmtScore(r.score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Game stats card ─────────────────────────────────────────────
function GamesCard({ keoco, odyssey }: {
  keoco: ProgressOverview['keocoStats'] | null
  odyssey: ReturnType<typeof svc.readPixelOdysseyStats>
}) {
  const winRate = keoco && keoco.totalPlayed > 0
    ? Math.round((keoco.wins / keoco.totalPlayed) * 100)
    : 0
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Pixel Odyssey */}
      <Link to="/dashboard/games/pixel-odyssey"
        className="block rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 to-pink-600/5 p-4 hover:border-purple-400/40 transition-colors group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🌟</span>
          <div className="flex-1">
            <div className="text-xs font-bold text-purple-200">Pixel Odyssey</div>
            <div className="text-[10px] text-white/40">RPG · Hành Trình Ánh Sao</div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-purple-300" />
        </div>
        {odyssey.hasSave ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-purple-200">Ch.{odyssey.chapter}</div>
              <div className="text-[9px] text-white/40 uppercase">Chương</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-200">⭐{odyssey.starCores}</div>
              <div className="text-[9px] text-white/40 uppercase">Star Core</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cyan-200">Lv.{odyssey.level}</div>
              <div className="text-[9px] text-white/40 uppercase">{odyssey.mapName}</div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-white/40 italic">Chưa bắt đầu — bấm để vào game</div>
        )}
      </Link>

      {/* KeoCo */}
      <Link to="/dashboard/games/keo-co"
        className="block rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-600/10 to-amber-600/5 p-4 hover:border-rose-400/40 transition-colors group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🪢</span>
          <div className="flex-1">
            <div className="text-xs font-bold text-rose-200">Kéo Co Kiến Thức</div>
            <div className="text-[10px] text-white/40">Quiz đối kháng</div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-rose-300" />
        </div>
        {keoco && keoco.totalPlayed > 0 ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-rose-200">🏆{keoco.wins}</div>
              <div className="text-[9px] text-white/40 uppercase">Thắng</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-200">{keoco.totalPlayed}</div>
              <div className="text-[9px] text-white/40 uppercase">Tổng trận</div>
            </div>
            <div>
              <div className="text-lg font-bold text-cyan-200">{winRate}%</div>
              <div className="text-[9px] text-white/40 uppercase">Win rate</div>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-white/40 italic">Chưa chơi trận nào — bấm để join</div>
        )}
      </Link>
    </div>
  )
}

// ─── Labs card ─────────────────────────────────────────────────────
function LabsCard({ digitalLogic }: {
  digitalLogic: ReturnType<typeof svc.readDigitalLogicStats>
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Digital Logic Lab */}
      <Link to="/dashboard/labtwin/labs/digital-logic-lab"
        className="block rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-600/10 to-blue-600/5 p-4 hover:border-cyan-400/40 transition-colors group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚙️</span>
          <div className="flex-1">
            <div className="text-xs font-bold text-cyan-200">Digital Logic Lab</div>
            <div className="text-[10px] text-white/40">Cổng logic · Bảng chân lý</div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-cyan-300" />
        </div>
        {digitalLogic.hasCircuit && digitalLogic.gateCount > 0 ? (
          <div className="text-xs text-white/70">
            Mạch hiện tại: <strong className="text-cyan-200">"{digitalLogic.name}"</strong>
            <div className="text-[10px] text-white/50 mt-1">
              {digitalLogic.gateCount} cổng · {digitalLogic.wireCount} dây
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-white/40 italic">Chưa có mạch nào — bấm để thiết kế</div>
        )}
      </Link>

      {/* Arduino Emulator */}
      <Link to="/dashboard/iot-lab/emulator"
        className="block rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/10 to-cyan-600/5 p-4 hover:border-emerald-400/40 transition-colors group">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <div className="text-xs font-bold text-emerald-200">Arduino Emulator</div>
            <div className="text-[10px] text-white/40">Viết code C++ chạy realtime</div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-emerald-300" />
        </div>
        <div className="text-[11px] text-white/40 italic">6 sketch mẫu sẵn sàng — bấm thử</div>
      </Link>
    </div>
  )
}

// ─── Knowledge Graph card ─────────────────────────────────────────
function KgCard({ stats }: { stats: ProgressOverview['kgStats'] | null }) {
  return (
    <Link to="/dashboard/knowledge-graph"
      className="block rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-cyan-600/5 p-5 hover:border-violet-400/40 transition-colors group">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
          <Network className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-violet-200">Đồ thị Tri thức</div>
          <div className="text-[11px] text-white/50">Khám phá mạng lưới khái niệm + công thức + nghề nghiệp</div>
        </div>
        <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-violet-300" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-xl font-bold text-violet-200">{stats?.topicsExplored || 0}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Topics</div>
        </div>
        <div>
          <div className="text-xl font-bold text-cyan-200">{stats?.votesGiven || 0}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Bình chọn</div>
        </div>
        <div>
          <div className="text-xl font-bold text-pink-200">{stats?.feedbackPosted || 0}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Góp ý</div>
        </div>
      </div>
    </Link>
  )
}

// ─── Scrumboard card ─────────────────────────────────────────────
function ScrumboardCard({ stats }: { stats: ReturnType<typeof svc.readScrumboardStats> }) {
  return (
    <Link to="/dashboard/scrumboard"
      className="block rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-indigo-600/5 p-4 hover:border-blue-400/40 transition-colors group">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Layers className="h-4 w-4 text-blue-300" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-blue-200">Scrumboard cá nhân</div>
          <div className="text-[10px] text-white/40">Kanban quản lý task học tập</div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-blue-300" />
      </div>
      {stats.total > 0 ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-blue-200">{stats.total}</div>
            <div className="text-[9px] text-white/40 uppercase">Tổng</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-200">{stats.done}</div>
            <div className="text-[9px] text-white/40 uppercase">Xong</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-200">{stats.inProgress}</div>
            <div className="text-[9px] text-white/40 uppercase">Đang làm</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-200">⚡{stats.totalXp}</div>
            <div className="text-[9px] text-white/40 uppercase">XP earned</div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-white/40 italic">Chưa có task nào — bấm để tạo</div>
      )}
    </Link>
  )
}

// ─── Recommendations ─────────────────────────────────────────────
function RecommendationsCard({ overview, odyssey, scrum }: {
  overview: ProgressOverview | null
  odyssey: ReturnType<typeof svc.readPixelOdysseyStats>
  scrum: ReturnType<typeof svc.readScrumboardStats>
}) {
  const recs: Array<{ icon: any; text: string; link: string; color: string }> = []

  if (!overview || overview.examStats.count === 0) {
    recs.push({
      icon: Target, text: 'Bắt đầu với 1 đề thi để track tiến độ',
      link: '/student/exam-modes', color: '#22d3ee'
    })
  } else if (overview.examStats.avgScore < 6) {
    recs.push({
      icon: AlertCircle, text: `Điểm TB ${fmtScore(overview.examStats.avgScore)} — hãy ôn lại các topic yếu`,
      link: '/student/exam-mastery', color: '#f87171'
    })
  }

  if (scrum.total === 0) {
    recs.push({
      icon: Layers, text: 'Tạo Scrumboard để quản lý task học tập',
      link: '/dashboard/scrumboard', color: '#60a5fa'
    })
  }

  if (!odyssey.hasSave) {
    recs.push({
      icon: Sparkles, text: 'Trải nghiệm Pixel Odyssey — RPG có cốt truyện 4 chương',
      link: '/dashboard/games/pixel-odyssey', color: '#a78bfa'
    })
  }

  if (overview && overview.kgStats.topicsExplored === 0) {
    recs.push({
      icon: Network, text: 'Khám phá Đồ thị Tri thức — gõ "động lượng" để bắt đầu',
      link: '/dashboard/knowledge-graph', color: '#22d3ee'
    })
  }

  recs.push({
    icon: Cpu, text: 'Thử Arduino Emulator — viết code C++ chạy realtime',
    link: '/dashboard/iot-lab/emulator', color: '#10b981'
  })

  if (recs.length === 0) return null
  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-yellow-400" />
        <h3 className="text-xs font-bold text-yellow-200 uppercase tracking-wider">Gợi ý cho bạn</h3>
      </div>
      <div className="space-y-2">
        {recs.slice(0, 5).map((r, i) => (
          <Link key={i} to={r.link}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.1] transition-all group">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${r.color}20`, color: r.color }}>
              <r.icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-white/75 flex-1">{r.text}</span>
            <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function StudentProgress() {
  const [overview, setOverview] = useState<ProgressOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Client-side stats (localStorage)
  const [scrum, setScrum] = useState(svc.readScrumboardStats())
  const [odyssey, setOdyssey] = useState(svc.readPixelOdysseyStats())
  const [digital, setDigital] = useState(svc.readDigitalLogicStats())

  const loadAll = async (showToast = false) => {
    if (showToast) setRefreshing(true)
    try {
      const data = await svc.getOverview()
      setOverview(data)
      setScrum(svc.readScrumboardStats())
      setOdyssey(svc.readPixelOdysseyStats())
      setDigital(svc.readDigitalLogicStats())
      if (showToast) toast.success('Đã cập nhật dữ liệu')
    } catch (e: any) {
      console.warn('[progress] load failed', e?.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadAll(false) }, [])

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-screen items-center justify-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
        </div>
        <p className="text-sm text-white/40">Đang tải dữ liệu học tập…</p>
      </div>
    )
  }

  // Compute aggregated XP
  const weeklyXp = overview?.weekly.reduce((s, d) => s + d.xp, 0) || 0
  const totalXp = (overview?.profile.totalXp || 0) + scrum.totalXp + (odyssey.starCores * 50)

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white/95">Dashboard Học Tập</h1>
              <p className="text-xs text-white/40">
                Tổng quan tiến độ · {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {overview?.profile.mbtiType && (
              <div className="hidden md:flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5">
                <Brain className="h-3 w-3 text-violet-400" />
                <span className="text-[11px] text-white/60">MBTI: <strong className="text-violet-300">{overview.profile.mbtiType}</strong></span>
              </div>
            )}
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs text-white/70 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ─── LAYER 1: Headline stats ─── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Trophy}
              label="Tổng XP"
              value={fmtNumber(totalXp)}
              sub={weeklyXp > 0 ? `+${weeklyXp} XP tuần này` : 'Tuần này: 0 XP'}
              color="#fbbf24"
              trend={weeklyXp > 0 ? 'up' : null}
            />
            <StatCard
              icon={Target}
              label="Bài thi đã làm"
              value={overview?.examStats.count || 0}
              sub={overview?.examStats.count ? `TB: ${fmtScore(overview.examStats.avgScore)}/10` : 'Chưa có'}
              color="#22d3ee"
            />
            <StatCard
              icon={Flame}
              label="Chuỗi học"
              value={overview?.streak.current || 0}
              sub={overview?.streak.longest ? `Kỷ lục ${overview.streak.longest} ngày` : 'Bắt đầu hôm nay!'}
              color="#fb923c"
            />
            <StatCard
              icon={Layers}
              label="Task scrumboard"
              value={scrum.done}
              sub={`${scrum.total} tổng · ${scrum.inProgress} đang làm`}
              color="#60a5fa"
            />
          </div>
        </section>

        {/* ─── LAYER 2: Streak + Heatmap ─── */}
        <Section title="Hoạt động gần đây" icon={Activity}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <StreakCard streak={overview?.streak || null} />
            <div className="lg:col-span-2">
              <WeeklyHeatmap data={overview?.weekly || []} />
            </div>
          </div>
        </Section>

        {/* ─── LAYER 3: Exams + KG ─── */}
        <Section title="Học tập" icon={GraduationCap}
          action={
            <Link to="/student/exam-modes" className="text-[11px] text-cyan-300 hover:underline">
              Xem tất cả →
            </Link>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ExamStatsCard stats={overview?.examStats || null} />
            <KgCard stats={overview?.kgStats || null} />
          </div>
        </Section>

        {/* ─── LAYER 4: Games + Labs ─── */}
        <Section title="Trò chơi & Lab" icon={Gamepad2}
          action={
            <Link to="/dashboard/games" className="text-[11px] text-purple-300 hover:underline">
              Game Hub →
            </Link>
          }
        >
          <GamesCard keoco={overview?.keocoStats || null} odyssey={odyssey} />
          <LabsCard digitalLogic={digital} />
        </Section>

        {/* ─── LAYER 5: Productivity ─── */}
        <Section title="Năng suất cá nhân" icon={Zap}>
          <ScrumboardCard stats={scrum} />
        </Section>

        {/* ─── LAYER 6: Recommendations ─── */}
        <Section title="Gợi ý tiếp theo" icon={Sparkles}>
          <RecommendationsCard overview={overview} odyssey={odyssey} scrum={scrum} />
        </Section>

        {/* Footer note */}
        <div className="text-center text-[10px] text-white/30 pt-4 border-t border-white/[0.04]">
          Dữ liệu cập nhật từ DB + localStorage · Backend: {overview ? '✅ live' : '⚠ chưa ready'}
          {overview && ` · Sinh lúc ${new Date(overview.generatedAt).toLocaleTimeString('vi-VN')}`}
        </div>
      </div>
    </div>
  )
}
