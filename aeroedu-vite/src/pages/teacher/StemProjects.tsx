/**
 * /teacher/stem-projects — GV tạo dự án STEM + mời HS qua QR/link
 *
 * Workflow:
 *   1. GV tạo dự án (title, description, category, subject, grade)
 *   2. Mỗi dự án có nút "Mời HS" → modal hiện QR + invite link
 *   3. HS quét QR / mở link → /stem/join/:token → bấm tham gia
 *   4. GV thấy HS trong member list của dự án
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  Zap, Plus, Users, Share2, Trash2, ExternalLink, X, QrCode, Copy,
  Loader2, Calendar, BookOpen, Tag, AlertCircle, CheckCircle2,
  TrendingUp, Flame, Lightbulb, Activity, Filter, Eye, EyeOff,
  Sparkles, Star, Award, Radio, Search,
} from 'lucide-react'
import { api } from '@/services/api'

interface StemProject {
  id: string
  teacher_id: string
  title: string
  description: string | null
  category: string
  status: string
  subject: string | null
  grade: string | null
  difficulty: string
  tags: string[] | null
  due_date: string | null
  created_at: string
  updated_at: string
  member_count?: number
  invite_count?: number
}

interface InviteToken {
  token: string
  project_id: string
  label: string | null
  max_uses: number | null
  used_count: number
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

interface Member {
  id: string
  student_id: string
  role: string
  joined_at: string
  name: string | null
  email: string | null
  image: string | null
}

const CATEGORIES = ['Science', 'Technology', 'Engineering', 'Math']
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
  'in-progress': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  published: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
}

// Sci-fi category colors — neon glow planets
const CATEGORY_PALETTE: Record<string, { fill: string; glow: string; ring: string; label: string }> = {
  Science:     { fill: '#22d3ee', glow: '#06b6d4', ring: '#0891b2', label: 'SCI' },
  Technology:  { fill: '#a78bfa', glow: '#8b5cf6', ring: '#7c3aed', label: 'TECH' },
  Engineering: { fill: '#f97316', glow: '#ea580c', ring: '#c2410c', label: 'ENG' },
  Math:        { fill: '#10b981', glow: '#059669', ring: '#047857', label: 'MATH' },
}

export default function StemProjects() {
  const [projects, setProjects] = useState<StemProject[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [shareProject, setShareProject] = useState<StemProject | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ projects: StemProject[] }>('/teacher/stem-projects')
      setProjects(data.projects || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tải được dự án')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Xoá dự án "${title}"? HS đã join sẽ mất quyền truy cập.`)) return
    try {
      await api.delete(`/teacher/stem-projects/${id}`)
      toast.success('Đã xoá dự án')
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không xoá được')
    }
  }

  // Sci-fi UI state
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOrbital, setShowOrbital] = useState(true)
  const [leaderboardTab, setLeaderboardTab] = useState<'trending' | 'teachers' | 'ideas' | 'activity'>('trending')

  const filteredProjects = useMemo(() => {
    let list = projects
    if (filterCategory) list = list.filter((p) => p.category === filterCategory)
    if (filterStatus) list = list.filter((p) => p.status === filterStatus)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.subject || '').toLowerCase().includes(q),
      )
    }
    return list
  }, [projects, filterCategory, filterStatus, searchQuery])

  // Stats summary
  const stats = useMemo(() => {
    const total = projects.length
    const active = projects.filter((p) => p.status === 'in-progress').length
    const completed = projects.filter((p) => p.status === 'completed').length
    const totalMembers = projects.reduce((s, p) => s + (p.member_count ?? 0), 0)
    return { total, active, completed, totalMembers }
  }, [projects])

  return (
    <div className="min-h-screen relative overflow-hidden text-white/90"
      style={{
        background: 'radial-gradient(ellipse at top, #0c1a3a 0%, #050714 60%, #02030a 100%)',
      }}>
      {/* ── Animated star field background ── */}
      <StarField />

      {/* ── Sci-fi grid overlay ── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px),linear-gradient(90deg, rgba(56,189,248,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

      {/* ── Top HUD bar ── */}
      <div className="relative px-5 py-3 border-b border-cyan-500/20 backdrop-blur-md bg-slate-950/60 z-10">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 blur-md opacity-60" />
              <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center border border-cyan-300/40">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent">
                STEM·NEXUS
              </h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300/70 font-mono">
                Dự án STEM · Bản đồ vũ trụ dự án
              </p>
            </div>
          </div>

          {/* Stats HUD */}
          <div className="flex items-center gap-2 flex-wrap">
            <HudStat icon={Sparkles} label="Tổng" value={stats.total} color="cyan" />
            <HudStat icon={Radio} label="Đang chạy" value={stats.active} color="emerald" />
            <HudStat icon={CheckCircle2} label="Hoàn thành" value={stats.completed} color="violet" />
            <HudStat icon={Users} label="HS join" value={stats.totalMembers} color="amber" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowOrbital(!showOrbital)}
              className="px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition">
              {showOrbital ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showOrbital ? 'Ẩn quỹ đạo' : 'Hiện quỹ đạo'}
            </button>
            <button onClick={() => setCreateOpen(true)}
              className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #8b5cf6 100%)' }}>
              <Plus className="w-4 h-4" /> Khởi tạo dự án
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 3-column layout ── */}
      <div className="relative max-w-[1600px] mx-auto px-4 py-4 grid grid-cols-12 gap-3 z-10">
        {/* LEFT: Filter + project list */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          {/* Search */}
          <div className="rounded-xl bg-slate-900/60 backdrop-blur border border-cyan-500/20 p-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300/60" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm dự án..."
              className="w-full bg-transparent pl-8 pr-2 py-1.5 text-sm outline-none text-white placeholder:text-white/30"
            />
          </div>

          {/* Filters */}
          <div className="rounded-xl bg-slate-900/60 backdrop-blur border border-cyan-500/20 p-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/70 mb-2 flex items-center gap-1.5">
              <Filter className="w-3 h-3" /> Bộ lọc
            </h3>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] text-white/45 mb-1">Phân loại STEM</div>
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map((c) => {
                    const meta = CATEGORY_PALETTE[c]
                    const active = filterCategory === c
                    return (
                      <button key={c} onClick={() => setFilterCategory(active ? null : c)}
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase border transition"
                        style={{
                          background: active ? `${meta.fill}25` : 'rgba(255,255,255,0.04)',
                          borderColor: active ? `${meta.fill}80` : 'rgba(255,255,255,0.08)',
                          color: active ? meta.fill : 'rgba(255,255,255,0.5)',
                          textShadow: active ? `0 0 8px ${meta.glow}` : undefined,
                        }}>
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/45 mb-1">Trạng thái</div>
                <div className="flex gap-1 flex-wrap">
                  {['draft', 'in-progress', 'review', 'completed', 'published'].map((s) => {
                    const active = filterStatus === s
                    return (
                      <button key={s} onClick={() => setFilterStatus(active ? null : s)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border transition ${
                          active ? 'bg-violet-500/20 border-violet-500/60 text-violet-200' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]'
                        }`}>
                        {s.replace('in-progress', 'Đang')}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Project list (compact cards) */}
          <div className="rounded-xl bg-slate-900/60 backdrop-blur border border-cyan-500/20 p-2 max-h-[640px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2 px-2 pt-1">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/70">
                Mục lục ({filteredProjects.length})
              </h3>
            </div>
            {loading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/40 italic">
                {projects.length === 0 ? 'Chưa có dự án — khởi tạo cái đầu tiên' : 'Không khớp bộ lọc'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredProjects.map((p) => (
                  <ProjectCard key={p.id} project={p}
                    onShare={() => setShareProject(p)}
                    onDelete={() => handleDelete(p.id, p.title)} />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: Orbital view */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-xl bg-slate-950/40 backdrop-blur border border-cyan-500/20 overflow-hidden relative"
            style={{ minHeight: '720px' }}>
            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded bg-slate-900/80 border border-cyan-500/30">
              <div className="text-[9px] uppercase tracking-[0.25em] text-cyan-300/70">
                Hệ Mặt Trời STEM
              </div>
              <div className="text-sm font-bold text-cyan-100">
                {filteredProjects.length} dự án
              </div>
            </div>
            <div className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded bg-slate-900/80 border border-cyan-500/30 text-[10px] font-mono text-white/55">
              Quỹ đạo · Kích thước = HS · Màu = Phân loại
            </div>
            <OrbitalView projects={filteredProjects} showOrbits={showOrbital}
              onClick={(p) => setShareProject(p)} />
          </div>
        </div>

        {/* RIGHT: Leaderboard */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="rounded-xl bg-slate-900/60 backdrop-blur border border-violet-500/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-violet-500/30 bg-violet-500/[0.06]">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-violet-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Bảng xếp hạng
              </h3>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-violet-500/20">
              {[
                { id: 'trending' as const,  icon: Flame,     label: 'Trend' },
                { id: 'teachers' as const,  icon: Star,      label: 'GV nổi' },
                { id: 'ideas' as const,     icon: Lightbulb, label: 'Ý tưởng' },
                { id: 'activity' as const,  icon: Activity,  label: 'Hoạt động' },
              ].map(({ id, icon: Icon, label }) => {
                const active = leaderboardTab === id
                return (
                  <button key={id} onClick={() => setLeaderboardTab(id)}
                    className={`flex-1 px-2 py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-0.5 transition ${
                      active ? 'bg-violet-500/15 text-violet-100' : 'text-white/45 hover:bg-white/[0.04]'
                    } ${active ? 'border-b-2 border-violet-400' : 'border-b-2 border-transparent'}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>
            <LeaderboardContent tab={leaderboardTab} projects={projects} />
          </div>

          {/* Activity heatmap */}
          <div className="mt-3 rounded-xl bg-slate-900/60 backdrop-blur border border-emerald-500/30 p-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/80 flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3 h-3" /> Tần suất 7 ngày
            </h3>
            <ActivityHeatmap projects={projects} />
          </div>
        </aside>
      </div>

      {/* Create modal */}
      {createOpen && (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); load() }}
        />
      )}

      {/* Share modal */}
      {shareProject && (
        <ShareModal
          project={shareProject}
          onClose={() => setShareProject(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sci-fi sub-components
// ─────────────────────────────────────────────────────────────

function HudStat({ icon: Icon, label, value, color }: {
  icon: typeof Sparkles; label: string; value: number
  color: 'cyan' | 'emerald' | 'violet' | 'amber'
}) {
  const colorMap = {
    cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-200',    glow: 'shadow-[0_0_8px_rgba(34,211,238,0.4)]' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-200', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]' },
    violet:  { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  text: 'text-violet-200',  glow: 'shadow-[0_0_8px_rgba(139,92,246,0.4)]' },
    amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-200',   glow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
  }[color]
  return (
    <div className={`px-3 py-1.5 rounded-lg ${colorMap.bg} border ${colorMap.border} ${colorMap.glow} flex items-center gap-2`}>
      <Icon className={`w-3.5 h-3.5 ${colorMap.text}`} />
      <div>
        <div className="text-[9px] uppercase tracking-wider text-white/45 font-bold">{label}</div>
        <div className={`text-sm font-black font-mono ${colorMap.text}`}>{value}</div>
      </div>
    </div>
  )
}

function StarField() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        {Array.from({ length: 80 }, (_, i) => {
          const x = (i * 137 + 23) % 100
          const y = (i * 79 + 47) % 100
          const r = (i % 3) * 0.4 + 0.5
          const opacity = ((i % 7) / 10) + 0.3
          return <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="#ffffff" opacity={opacity} />
        })}
        {/* Some shooting "fades" */}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={`s${i}`}
            x1={`${(i * 17 + 10) % 100}%`} y1={`${(i * 23) % 50}%`}
            x2={`${(i * 17 + 13) % 100}%`} y2={`${(i * 23 + 3) % 50}%`}
            stroke="#22d3ee" strokeWidth="0.5" opacity="0.5" />
        ))}
      </svg>
    </div>
  )
}

function ProjectCard({ project, onShare, onDelete }: {
  project: StemProject; onShare: () => void; onDelete: () => void
}) {
  const meta = CATEGORY_PALETTE[project.category] || CATEGORY_PALETTE.Science
  return (
    <div className="group rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-cyan-500/30 transition p-2.5"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: meta.fill,
      }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <Link to={`/teacher/stem-projects/${project.id}`}
            className="block text-xs font-bold text-white hover:text-cyan-200 transition truncate">
            {project.title}
          </Link>
          <div className="flex items-center gap-1.5 mt-1 text-[10px]">
            <span className="px-1.5 py-0.5 rounded font-bold uppercase font-mono"
              style={{ color: meta.fill, background: `${meta.fill}15`, border: `1px solid ${meta.fill}40` }}>
              {meta.label}
            </span>
            <span className="text-white/35">·</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
              {project.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/50">
            <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {project.member_count ?? 0}</span>
            {project.subject && <span>· 📚 {project.subject}</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onShare}
            className="p-1 rounded bg-purple-500/20 hover:bg-purple-500/35 text-purple-200" title="Mời HS">
            <QrCode className="w-3 h-3" />
          </button>
          <button onClick={onDelete}
            className="p-1 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300" title="Xoá">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Orbital View — sun + planets canvas ─────────────────────────
function OrbitalView({ projects, showOrbits, onClick }: {
  projects: StemProject[]
  showOrbits: boolean
  onClick: (p: StemProject) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tRef = useRef(0)
  const hoveredRef = useRef<string | null>(null)
  const [, forceRender] = useState(0)

  // Group projects by category — each gets an orbit ring
  const orbitGroups = useMemo(() => {
    const groups: Record<string, StemProject[]> = {}
    for (const p of projects) {
      const cat = p.category || 'Science'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    }
    return groups
  }, [projects])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let lastTime = performance.now()

    function resize() {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
    resize()
    window.addEventListener('resize', resize)

    function loop(now: number) {
      const dt = (now - lastTime) / 1000
      lastTime = now
      tRef.current += dt

      const W = canvas!.width
      const H = canvas!.height
      const CX = W / 2
      const CY = H / 2
      ctx.clearRect(0, 0, W, H)

      // Center sun (glowing)
      const sunR = 36
      const sunGlow = ctx.createRadialGradient(CX, CY, 5, CX, CY, sunR * 3)
      sunGlow.addColorStop(0, 'rgba(251,191,36,1)')
      sunGlow.addColorStop(0.3, 'rgba(245,158,11,0.6)')
      sunGlow.addColorStop(1, 'rgba(245,158,11,0)')
      ctx.fillStyle = sunGlow
      ctx.beginPath()
      ctx.arc(CX, CY, sunR * 3, 0, Math.PI * 2)
      ctx.fill()
      // Sun body
      const sunGrad = ctx.createRadialGradient(CX - 10, CY - 10, 5, CX, CY, sunR)
      sunGrad.addColorStop(0, '#fef3c7')
      sunGrad.addColorStop(0.6, '#f59e0b')
      sunGrad.addColorStop(1, '#b45309')
      ctx.fillStyle = sunGrad
      ctx.beginPath()
      ctx.arc(CX, CY, sunR, 0, Math.PI * 2)
      ctx.fill()
      // Sun label
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('TEACHER', CX, CY + sunR + 18)
      ctx.fillStyle = 'rgba(251,191,36,0.7)'
      ctx.font = '9px monospace'
      ctx.fillText('CORE', CX, CY + sunR + 32)

      // Orbits + planets
      const categories = Object.keys(orbitGroups)
      categories.forEach((cat, idx) => {
        const orbitR = 110 + idx * 75
        if (orbitR > Math.min(W, H) / 2 - 40) return
        const meta = CATEGORY_PALETTE[cat] || CATEGORY_PALETTE.Science

        // Orbit ring
        if (showOrbits) {
          ctx.strokeStyle = `${meta.fill}40`
          ctx.lineWidth = 1
          ctx.setLineDash([3, 5])
          ctx.beginPath()
          ctx.arc(CX, CY, orbitR, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
          // Orbit label
          ctx.fillStyle = `${meta.fill}90`
          ctx.font = 'bold 9px monospace'
          ctx.textAlign = 'right'
          ctx.fillText(meta.label, CX + orbitR - 6, CY - 4)
        }

        // Planets on this orbit
        const planetsInGroup = orbitGroups[cat]
        const orbitSpeed = 0.08 / (idx + 1)
        planetsInGroup.forEach((p, pIdx) => {
          const baseAngle = (pIdx / planetsInGroup.length) * Math.PI * 2
          const angle = baseAngle + tRef.current * orbitSpeed
          const planetX = CX + Math.cos(angle) * orbitR
          const planetY = CY + Math.sin(angle) * orbitR
          // Planet size based on member count (3-14)
          const members = p.member_count ?? 0
          const planetR = Math.min(14, 6 + members * 0.8)
          const isHovered = hoveredRef.current === p.id

          // Glow
          if (isHovered) {
            const glowGrad = ctx.createRadialGradient(planetX, planetY, planetR, planetX, planetY, planetR * 3)
            glowGrad.addColorStop(0, `${meta.fill}80`)
            glowGrad.addColorStop(1, `${meta.fill}00`)
            ctx.fillStyle = glowGrad
            ctx.beginPath()
            ctx.arc(planetX, planetY, planetR * 3, 0, Math.PI * 2)
            ctx.fill()
          }
          // Planet body
          const grad = ctx.createRadialGradient(
            planetX - planetR * 0.3, planetY - planetR * 0.3, 1,
            planetX, planetY, planetR
          )
          grad.addColorStop(0, '#fff')
          grad.addColorStop(0.3, meta.fill)
          grad.addColorStop(1, meta.ring)
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2)
          ctx.fill()
          // Ring
          ctx.strokeStyle = `${meta.fill}60`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(planetX, planetY, planetR + 2, 0, Math.PI * 2)
          ctx.stroke()

          // Label on hover
          if (isHovered) {
            ctx.fillStyle = 'rgba(0,0,0,0.85)'
            ctx.fillRect(planetX + planetR + 6, planetY - 8, p.title.length * 7 + 16, 18)
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 11px sans-serif'
            ctx.textAlign = 'left'
            ctx.fillText(p.title, planetX + planetR + 12, planetY + 4)
          }
        })
      })

      // Some scanline effect (decorative)
      const scanY = (tRef.current * 60) % (H + 100) - 50
      ctx.fillStyle = 'rgba(34,211,238,0.05)'
      ctx.fillRect(0, scanY, W, 2)

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [orbitGroups, showOrbits])

  // Hover detection (recompute hovered project)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const W = canvas.width, H = canvas.height
    const CX = W / 2, CY = H / 2

    let foundId: string | null = null
    const categories = Object.keys(orbitGroups)
    categories.forEach((cat, idx) => {
      const orbitR = 110 + idx * 75
      const orbitSpeed = 0.08 / (idx + 1)
      const list = orbitGroups[cat]
      list.forEach((p, pIdx) => {
        const baseAngle = (pIdx / list.length) * Math.PI * 2
        const angle = baseAngle + tRef.current * orbitSpeed
        const px = CX + Math.cos(angle) * orbitR
        const py = CY + Math.sin(angle) * orbitR
        const members = p.member_count ?? 0
        const planetR = Math.min(14, 6 + members * 0.8)
        if (Math.hypot(mx - px, my - py) < planetR + 6) {
          foundId = p.id
        }
      })
    })
    if (foundId !== hoveredRef.current) {
      hoveredRef.current = foundId
      forceRender((n) => (n + 1) & 0xFFFF)
    }
  }

  const handleClick = () => {
    if (!hoveredRef.current) return
    const p = projects.find((x) => x.id === hoveredRef.current)
    if (p) onClick(p)
  }

  return (
    <canvas ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { hoveredRef.current = null; forceRender((n) => (n + 1) & 0xFFFF) }}
      onClick={handleClick}
      className="absolute inset-0 w-full h-full cursor-pointer" />
  )
}

// ─── Leaderboard tabs ─────────────────────────────────────────
function LeaderboardContent({ tab, projects }: {
  tab: 'trending' | 'teachers' | 'ideas' | 'activity'
  projects: StemProject[]
}) {
  // Derive different ranking from actual data
  const trending = useMemo(() =>
    [...projects].sort((a, b) => {
      // Rank by member count + recency
      const aScore = (a.member_count ?? 0) * 3 + (new Date(a.updated_at).getTime() / 1e10)
      const bScore = (b.member_count ?? 0) * 3 + (new Date(b.updated_at).getTime() / 1e10)
      return bScore - aScore
    }).slice(0, 8), [projects])

  // Mock data for teachers/ideas/activity (real backend integration TODO)
  const popularTeachers = useMemo(() => [
    { name: 'Cô Lê Thị Hương', subject: 'Vật lý', projects: 12, students: 87, badge: '🏆' },
    { name: 'Thầy Nguyễn Văn An', subject: 'Tin học', projects: 9, students: 64, badge: '🥈' },
    { name: 'Cô Trần Thị Mai', subject: 'Hoá học', projects: 7, students: 52, badge: '🥉' },
    { name: 'Thầy Phạm Đức', subject: 'Toán', projects: 6, students: 41, badge: '⭐' },
    { name: 'Cô Hoàng Lan', subject: 'Sinh học', projects: 5, students: 38, badge: '⭐' },
  ], [])

  const boldIdeas = useMemo(() => [
    { student: 'Đậu Lém (Lớp 11A1)', idea: 'Robot cứu hộ tự hành dùng AI nhận diện nạn nhân', tag: 'Robotics+AI', votes: 47 },
    { student: 'Minh Anh (Lớp 10B2)', idea: 'Hệ thống thuỷ canh IoT tưới rau bằng nước mưa', tag: 'IoT+Sinh học', votes: 38 },
    { student: 'Bảo Khang (Lớp 12A3)', idea: 'Đèn LED chuyển động cho người khiếm thính cảm âm', tag: 'Y học+Điện tử', votes: 35 },
    { student: 'Hà Linh (Lớp 11A2)', idea: 'App AR học bảng tuần hoàn 3D', tag: 'AR+Hoá', votes: 29 },
    { student: 'Quang Huy (Lớp 10A1)', idea: 'Máy lọc nước năng lượng mặt trời di động', tag: 'Môi trường', votes: 26 },
  ], [])

  if (tab === 'trending') {
    return (
      <div className="p-2 max-h-[500px] overflow-y-auto">
        {trending.length === 0 ? (
          <p className="text-xs text-white/40 italic text-center py-4">Chưa có dự án</p>
        ) : trending.map((p, i) => {
          const meta = CATEGORY_PALETTE[p.category] || CATEGORY_PALETTE.Science
          return (
            <Link key={p.id} to={`/teacher/stem-projects/${p.id}`}
              className="flex items-center gap-2 p-2 rounded hover:bg-white/[0.04] transition group">
              <span className="font-black text-sm w-5 text-center"
                style={{ color: i < 3 ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}>
                #{i + 1}
              </span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.fill, boxShadow: `0 0 6px ${meta.glow}` }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-cyan-200">{p.title}</div>
                <div className="text-[10px] text-white/45 flex items-center gap-1.5">
                  <Users className="w-2.5 h-2.5" /> {p.member_count ?? 0} HS
                  <span>·</span>
                  <span>{meta.label}</span>
                </div>
              </div>
              {i < 3 && <Flame className="w-3.5 h-3.5 text-orange-400" />}
            </Link>
          )
        })}
      </div>
    )
  }
  if (tab === 'teachers') {
    return (
      <div className="p-2 max-h-[500px] overflow-y-auto">
        {popularTeachers.map((t, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-white/[0.04]">
            <span className="text-base">{t.badge}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{t.name}</div>
              <div className="text-[10px] text-violet-300/80">{t.subject}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-cyan-300">{t.projects}</div>
              <div className="text-[9px] text-white/45">{t.students} HS</div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (tab === 'ideas') {
    return (
      <div className="p-2 max-h-[500px] overflow-y-auto space-y-1.5">
        {boldIdeas.map((idea, i) => (
          <div key={i} className="p-2 rounded bg-amber-500/[0.04] border border-amber-500/15 hover:bg-amber-500/[0.08] transition">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-100 leading-snug">{idea.idea}</p>
                <div className="flex items-center justify-between mt-1.5 text-[10px]">
                  <span className="text-white/55">{idea.student}</span>
                  <span className="text-amber-300 font-bold">↑ {idea.votes}</span>
                </div>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-200">
                  {idea.tag}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  // activity
  return (
    <div className="p-3 max-h-[500px] overflow-y-auto">
      <div className="space-y-2">
        {projects.slice(0, 6).map((p) => {
          const meta = CATEGORY_PALETTE[p.category] || CATEGORY_PALETTE.Science
          const activity = ((p.member_count ?? 0) * 13 + 17) % 100  // pseudo
          return (
            <div key={p.id}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: meta.fill }} />
                <span className="text-[11px] font-bold text-white truncate flex-1">{p.title}</span>
                <span className="text-[10px] font-mono" style={{ color: meta.fill }}>{activity}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${activity}%`, background: `linear-gradient(90deg, ${meta.ring}, ${meta.fill})`, boxShadow: `0 0 4px ${meta.glow}` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Activity heatmap (7-day visualization) ──────────────────────
function ActivityHeatmap({ projects }: { projects: StemProject[] }) {
  // Generate 7-day pseudo activity from project updated_at timestamps
  const days = useMemo(() => {
    const result: Array<{ label: string; value: number }> = []
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400_000)
      const sameDay = projects.filter((p) => {
        const upd = new Date(p.updated_at)
        return upd.toDateString() === d.toDateString()
      }).length
      result.push({ label: dayNames[d.getDay()], value: sameDay })
    }
    return result
  }, [projects])
  const maxV = Math.max(...days.map((d) => d.value), 1)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const intensity = d.value / maxV
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="text-[9px] text-white/45 font-mono">{d.label}</div>
              <div className="w-full rounded"
                style={{
                  height: `${20 + intensity * 50}px`,
                  background: `linear-gradient(180deg, rgba(16,185,129,${0.15 + intensity * 0.55}), rgba(16,185,129,${0.05 + intensity * 0.3}))`,
                  border: `1px solid rgba(16,185,129,${0.3 + intensity * 0.5})`,
                  boxShadow: intensity > 0.5 ? `0 0 6px rgba(16,185,129,${intensity * 0.6})` : undefined,
                }} />
              <div className="text-[9px] font-mono text-emerald-300">{d.value}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CreateProjectModal
// ─────────────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('Engineering')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên dự án')
      return
    }
    setSaving(true)
    try {
      await api.post('/teacher/stem-projects', {
        title: title.trim(),
        description: description.trim() || null,
        category,
        subject: subject.trim() || null,
        grade: grade.trim() || null,
        difficulty,
      })
      toast.success('Đã tạo dự án ✓')
      onCreated()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tạo được dự án')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Tạo dự án STEM mới
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
              Tên dự án *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Hệ thống đèn giao thông thông minh"
              maxLength={200}
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Mục tiêu, phạm vi, kết quả mong đợi..."
              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-amber-500 resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                Nhóm STEM
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                Độ khó
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                Môn học
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Vật lí / Hóa học / ..."
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                Lớp
              </label>
              <input
                type="text"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                placeholder="10 / 11 / 12"
                className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted text-foreground text-sm font-bold"
          >
            Huỷ
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</> : 'Tạo dự án'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ShareModal — QR + link để HS join
// ─────────────────────────────────────────────────────────────
function ShareModal({ project, onClose }: { project: StemProject; onClose: () => void }) {
  const [invites, setInvites] = useState<InviteToken[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [maxUses, setMaxUses] = useState<number | ''>('')
  const [selectedToken, setSelectedToken] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ invites: InviteToken[]; members: Member[] }>(`/teacher/stem-projects/${project.id}`)
      const list = data.invites || []
      setInvites(list)
      setMembers(data.members || [])
      // Auto-select first active invite
      const active = list.find(i => !i.revoked_at)
      if (active && !selectedToken) setSelectedToken(active.token)
    } catch (err: any) {
      toast.error('Không tải được invites')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const { data } = await api.post<{ token: string; url: string }>(
        `/teacher/stem-projects/${project.id}/invites`,
        { expiresInDays, maxUses: typeof maxUses === 'number' ? maxUses : undefined }
      )
      toast.success('Đã tạo invite link ✓')
      setSelectedToken(data.token)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tạo được invite')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (token: string) => {
    if (!confirm('Thu hồi link này? HS chưa join sẽ không vào được nữa.')) return
    try {
      await api.delete(`/teacher/stem-projects/invites/${token}`)
      toast.success('Đã thu hồi')
      if (selectedToken === token) setSelectedToken(null)
      load()
    } catch {
      toast.error('Không thu hồi được')
    }
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Đã copy link')
    } catch {
      toast.error('Không copy được')
    }
  }

  const selected = selectedToken ? invites.find(i => i.token === selectedToken) : null
  const buildUrl = (token: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : 'https://inphysic.com'}/stem/join/${token}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-400" />
              Mời HS vào dự án
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.title}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Create new invite */}
          <div className="rounded-xl bg-purple-500/5 border border-purple-500/30 p-3 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
              Tạo link mời mới
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Hết hạn (ngày)
                </label>
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={e => setExpiresInDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
                  className="w-full px-2 py-1.5 rounded bg-muted/30 border border-border text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground mb-0.5 block">
                  Giới hạn lượt (tuỳ chọn)
                </label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                  placeholder="∞"
                  className="w-full px-2 py-1.5 rounded bg-muted/30 border border-border text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold disabled:opacity-50"
            >
              {creating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
                : <><QrCode className="w-4 h-4" /> Tạo link + QR</>}
            </button>
          </div>

          {/* Existing invites */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 italic">
              Chưa có link nào — tạo link đầu tiên ở trên
            </p>
          ) : (
            <>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Link đã tạo ({invites.length})
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {invites.map(inv => {
                  const isActive = !inv.revoked_at && (!inv.expires_at || new Date(inv.expires_at) > new Date())
                  return (
                    <button
                      key={inv.token}
                      onClick={() => setSelectedToken(inv.token)}
                      className={`w-full text-left p-2 rounded-lg flex items-center gap-2 border ${
                        selectedToken === inv.token
                          ? 'bg-purple-500/15 border-purple-500/40'
                          : 'bg-muted/20 border-border hover:bg-muted/40'
                      } ${!isActive ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-mono truncate">{inv.token.slice(0, 12)}...</div>
                        <div className="text-[10px] text-muted-foreground">
                          {inv.used_count}{inv.max_uses ? `/${inv.max_uses}` : ''} lượt ·
                          {inv.expires_at && ` HH ${new Date(inv.expires_at).toLocaleDateString('vi-VN')}`}
                          {inv.revoked_at && ' · (đã thu hồi)'}
                        </div>
                      </div>
                      {isActive && (
                        <span
                          onClick={e => { e.stopPropagation(); handleRevoke(inv.token) }}
                          className="p-1 rounded text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer"
                          title="Thu hồi"
                        >
                          <Trash2 className="w-3 h-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* QR display */}
          {selected && !selected.revoked_at && (
            <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-purple-400" />
                  QR cho HS quét
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {selected.used_count}{selected.max_uses ? `/${selected.max_uses}` : ''} lượt
                </span>
              </div>
              <div className="flex justify-center bg-white p-4 rounded-lg">
                <QRCodeSVG
                  value={buildUrl(selected.token)}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={buildUrl(selected.token)}
                  readOnly
                  onFocus={e => e.target.select()}
                  className="flex-1 px-2 py-1.5 rounded bg-muted/30 border border-border text-xs font-mono focus:outline-none"
                />
                <button
                  onClick={() => copyUrl(buildUrl(selected.token))}
                  className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                📲 HS quét QR hoặc mở link → đăng nhập → bấm <strong className="text-emerald-300">"Tham gia dự án"</strong>.
                HS đã có account inphysic.com sẽ tự động join vào dự án.
              </p>
            </div>
          )}

          {/* Member list */}
          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              HS đã tham gia ({members.length})
            </p>
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Chưa có HS nào tham gia</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/20">
                    {m.image ? (
                      <img src={m.image} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">
                        {(m.name || m.email || 'H')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{m.name || '(chưa đặt tên)'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(m.joined_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
