import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Calendar,
  MoreHorizontal,
  Share2,
  Download,
  Trash2,
  AlertCircle,
  Users,
  UserCheck,
  Settings,
  MessageSquare,
  Target,
  X,
  Check,
  Clock,
  FlaskConical,
  Cpu,
  Wrench,
  Calculator,
  Zap,
  TrendingUp,
  Plus,
} from 'lucide-react'
import {
  loadProjects,
  saveProjects,
  type STEMProject,
  type Milestone,
} from './stemStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryIcon(category: string) {
  const cls = 'w-5 h-5'
  switch (category) {
    case 'Science':     return <FlaskConical className={`${cls} text-blue-400`} />
    case 'Technology':  return <Cpu className={`${cls} text-emerald-400`} />
    case 'Engineering': return <Wrench className={`${cls} text-orange-400`} />
    case 'Math':        return <Calculator className={`${cls} text-purple-400`} />
    default:            return <Zap className={`${cls} text-white/40`} />
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'Science':     return 'bg-blue-500/20 text-blue-200'
    case 'Technology':  return 'bg-emerald-500/20 text-emerald-200'
    case 'Engineering': return 'bg-orange-500/20 text-orange-200'
    case 'Math':        return 'bg-purple-500/20 text-purple-200'
    default:            return 'bg-white/[0.06] text-white/50'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft':       return 'bg-gray-500'
    case 'in-progress': return 'bg-blue-500'
    case 'review':      return 'bg-yellow-500'
    case 'completed':   return 'bg-emerald-500'
    case 'published':   return 'bg-purple-500'
    default:            return 'bg-white/[0.06]'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'draft':       return 'Nháp'
    case 'in-progress': return 'Đang làm'
    case 'review':      return 'Chờ duyệt'
    case 'completed':   return 'Hoàn thành'
    case 'published':   return 'Công bố'
    default:            return status
  }
}

function getDifficultyText(difficulty: string) {
  switch (difficulty) {
    case 'beginner':     return 'Cơ bản'
    case 'intermediate': return 'Trung bình'
    case 'advanced':     return 'Nâng cao'
    default:             return difficulty
  }
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'beginner':     return 'bg-emerald-500/20 text-emerald-200'
    case 'intermediate': return 'bg-yellow-500/20 text-yellow-200'
    case 'advanced':     return 'bg-red-500/20 text-red-200'
    default:             return 'bg-white/[0.06] text-white/50'
  }
}

function getMilestoneStatusColor(status: string) {
  switch (status) {
    case 'completed':   return 'bg-emerald-500'
    case 'in-progress': return 'bg-blue-500'
    default:            return 'bg-white/[0.08]'
  }
}

function getMilestoneStatusText(status: string) {
  switch (status) {
    case 'completed':   return 'Hoàn thành'
    case 'in-progress': return 'Đang làm'
    default:            return 'Chờ làm'
  }
}

function formatDate(dateString: string) {
  try { return new Date(dateString).toLocaleDateString('vi-VN') }
  catch { return dateString }
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

// Avatar color per initials
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]
function avatarColor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<STEMProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'feedback'>('overview')

  useEffect(() => {
    const projects = loadProjects()
    setProject(projects.find((p) => p.id === id) ?? null)
    setLoading(false)
  }, [id])

  const handleDelete = () => {
    if (!project) return
    if (!confirm('Xóa dự án này?')) return
    const projects = loadProjects().filter((p) => p.id !== id)
    saveProjects(projects)
    navigate('/dashboard/stem')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(260,30%,8%)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/[0.2] border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[hsl(260,30%,8%)] flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white/85 mb-2">Không tìm thấy dự án</h1>
          <p className="text-white/50 mb-2">
            Dự án với ID <code className="bg-white/[0.06] px-2 py-0.5 rounded text-sm">{id}</code> không tồn tại.
          </p>
          <div className="flex flex-col gap-3 mt-6">
            <Link
              to="/dashboard/stem"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
            </Link>
            <Link
              to="/dashboard/stem/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition"
            >
              <Plus className="w-4 h-4" /> Tạo dự án mới
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const completedCount   = project.milestones.filter((m) => m.status === 'completed').length
  const inProgressCount  = project.milestones.filter((m) => m.status === 'in-progress').length
  const pendingCount     = project.milestones.filter((m) => m.status === 'pending').length

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85">

      {/* ── Top header bar ── */}
      <div className="border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[hsl(260,30%,8%)] z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/stem"
              className="p-2 hover:bg-white/[0.06] rounded-lg transition"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white/90 leading-tight">{project.title}</h1>
              <p className="text-xs text-white/40 mt-0.5">
                Chi tiết dự án STEM • {project.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/dashboard/stem/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition text-sm"
            >
              <Edit className="w-4 h-4" /> Chỉnh sửa
            </Link>
            <Link
              to={`/dashboard/stem/${id}/timeline`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition text-sm"
            >
              <Calendar className="w-4 h-4" /> Timeline
            </Link>

            {/* More dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-2 hover:bg-white/[0.06] rounded-lg transition"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-[hsl(260,30%,13%)] border border-white/[0.08] rounded-xl shadow-2xl z-50 py-1">
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-white/[0.06] flex items-center gap-2 transition">
                      <Share2 className="w-4 h-4" /> Chia sẻ
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-white/[0.06] flex items-center gap-2 transition">
                      <Download className="w-4 h-4" /> Xuất PDF
                    </button>
                    <div className="my-1 border-t border-white/[0.06]" />
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 flex items-center gap-2 text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" /> Xóa dự án
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="border-b border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(project.status)}`} />
            <div>
              <p className="text-xs text-white/40">Trạng thái</p>
              <p className="text-sm font-semibold text-white/85">{getStatusText(project.status)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-xs text-white/40">Tiến độ</p>
              <p className="text-sm font-semibold text-white/85">{project.progress}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-xs text-white/40">Thành viên</p>
              <p className="text-sm font-semibold text-white/85">{project.teamMembers.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-orange-400" />
            <div>
              <p className="text-xs text-white/40">Hạn nộp</p>
              <p className="text-sm font-semibold text-white/85">
                {project.dueDate ? formatDate(project.dueDate) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 flex gap-1">
          {(['overview', 'milestones', 'feedback'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-300'
                  : 'border-transparent text-white/50 hover:text-white/70'
              }`}
            >
              {tab === 'overview' ? 'Tổng quan' : tab === 'milestones' ? `Giai đoạn (${project.milestones.length})` : `Phản hồi (${project.feedback.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left / main column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <>
              {/* Project overview card */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  {getCategoryIcon(project.category)}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(project.category)}`}>
                    {project.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(project.difficulty)}`}>
                    {getDifficultyText(project.difficulty)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white/90 mb-3">{project.title}</h2>
                <p className="text-white/55 leading-relaxed mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] text-xs text-white/40">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress card */}
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold">Tiến độ dự án</h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/50">Tổng tiến độ</span>
                    <span className="text-sm font-bold text-white/90">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
                    <div className="text-xs text-white/50 mt-1">Hoàn thành</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="text-2xl font-bold text-blue-400">{inProgressCount}</div>
                    <div className="text-xs text-white/50 mt-1">Đang làm</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="text-2xl font-bold text-white/40">{pendingCount}</div>
                    <div className="text-xs text-white/50 mt-1">Chờ làm</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tab: Milestones */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              {project.milestones.length === 0 && (
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-12 text-center">
                  <Calendar className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Chưa có giai đoạn nào</p>
                </div>
              )}
              {project.milestones.map((milestone, idx) => (
                <div key={milestone.id} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${getMilestoneStatusColor(milestone.status)}`}>
                      {milestone.status === 'completed' ? <Check className="w-5 h-5" /> : idx + 1}
                    </div>
                    {idx < project.milestones.length - 1 && (
                      <div className="w-0.5 flex-1 bg-white/[0.06] mt-2 mb-2 min-h-[2rem]" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <button
                      onClick={() => setSelectedMilestone(milestone)}
                      className="w-full text-left p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white/85">{milestone.title}</h4>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          milestone.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : milestone.status === 'in-progress'
                              ? 'bg-blue-500/20 text-blue-200'
                              : 'bg-white/[0.06] text-white/50'
                        }`}>
                          {getMilestoneStatusText(milestone.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(milestone.dueDate)}</span>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Feedback */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {project.feedback.length === 0 && (
                <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-12 text-center">
                  <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Chưa có phản hồi nào</p>
                </div>
              )}
              {project.feedback.map((fb) => (
                <div key={fb.id} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {fb.type === 'approval' && <Check className="w-4 h-4 text-emerald-400" />}
                      {fb.type === 'suggestion' && <AlertCircle className="w-4 h-4 text-yellow-400" />}
                      {fb.type === 'revision' && <Clock className="w-4 h-4 text-blue-400" />}
                      <span className="text-sm font-semibold text-white/70">
                        {fb.type === 'approval' ? 'Phê duyệt' : fb.type === 'suggestion' ? 'Gợi ý' : 'Chỉnh sửa'}
                      </span>
                    </div>
                    <span className="text-xs text-white/35">{formatDate(fb.date)}</span>
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed mb-3">{fb.content}</p>
                  <p className="text-xs text-white/35">— {fb.author}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {/* Team card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-bold text-white/70 uppercase tracking-wide">Nhóm dự án</h3>
            </div>
            <div className="space-y-3">
              {project.teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${avatarColor(member.id)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/85 truncate">{member.name}</p>
                    <p className="text-xs text-white/40 truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructor card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white/70 uppercase tracking-wide">Giáo viên</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {getInitials(project.instructor.name)}
              </div>
              <p className="text-sm font-semibold text-white/85">{project.instructor.name}</p>
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-bold text-white/70 uppercase tracking-wide">Thông tin</h3>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-white/40">Tạo lúc</dt>
                <dd className="text-white/75 font-medium">{formatDate(project.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-white/40">Cập nhật</dt>
                <dd className="text-white/75 font-medium">{formatDate(project.updatedAt)}</dd>
              </div>
              {project.dueDate && (
                <div className="flex items-center justify-between">
                  <dt className="text-white/40">Hạn nộp</dt>
                  <dd className="text-white/75 font-medium">{formatDate(project.dueDate)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-white/40">Công khai</dt>
                <dd>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${project.isPublic ? 'bg-green-500/20 text-green-200' : 'bg-white/[0.06] text-white/40'}`}>
                    {project.isPublic ? 'Có' : 'Không'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-2">
            <Link
              to={`/dashboard/stem/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 transition text-white text-sm font-semibold justify-center"
            >
              <Edit className="w-4 h-4" /> Chỉnh sửa dự án
            </Link>
            <Link
              to={`/dashboard/stem/${id}/timeline`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.06] transition text-white/70 text-sm font-medium justify-center"
            >
              <Calendar className="w-4 h-4" /> Xem timeline
            </Link>
          </div>
        </div>
      </div>

      {/* ── Milestone modal ── */}
      {selectedMilestone && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMilestone(null)}
        >
          <div
            className="bg-[hsl(260,30%,13%)] border border-white/[0.08] rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-xl font-bold text-white/90 pr-4">{selectedMilestone.title}</h3>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="p-1 hover:bg-white/[0.06] rounded-lg transition flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">Trạng thái</p>
                <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-semibold ${
                  selectedMilestone.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : selectedMilestone.status === 'in-progress'
                      ? 'bg-blue-500/20 text-blue-200'
                      : 'bg-white/[0.06] text-white/50'
                }`}>
                  {getMilestoneStatusText(selectedMilestone.status)}
                </span>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">Hạn chót</p>
                <div className="flex items-center gap-2 text-white/85">
                  <Clock className="w-4 h-4 text-white/40" />
                  <span>{formatDate(selectedMilestone.dueDate)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedMilestone(null)}
              className="mt-6 w-full px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition text-white/85 text-sm font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
