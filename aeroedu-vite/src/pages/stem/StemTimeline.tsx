import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, AlertCircle, CheckCircle2, Clock, Users, Settings, Zap } from 'lucide-react'
import { loadProjects, type STEMProject } from './stemStore'

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('vi-VN')
  } catch {
    return dateString
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getMilestoneStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500'
    case 'in-progress':
      return 'bg-blue-500'
    case 'pending':
      return 'bg-white/[0.06]'
    default:
      return 'bg-white/[0.06]'
  }
}

function getMilestoneStatusTextColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-200'
    case 'in-progress':
      return 'text-blue-200'
    case 'pending':
      return 'text-white/50'
    default:
      return 'text-white/50'
  }
}

function getMilestoneStatusBg(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/20'
    case 'in-progress':
      return 'bg-blue-500/20'
    case 'pending':
      return 'bg-white/[0.06]'
    default:
      return 'bg-white/[0.06]'
  }
}

function getMilestoneStatusText(status: string): string {
  switch (status) {
    case 'completed':
      return 'Hoàn thành'
    case 'in-progress':
      return 'Đang làm'
    case 'pending':
      return 'Chờ làm'
    default:
      return status
  }
}

export default function StemTimeline() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<STEMProject | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const projects = loadProjects()
    const found = projects.find((p) => p.id === id)
    setProject(found || null)
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(260,30%,8%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/[0.2] border-t-blue-500 rounded-full animate-spin" />
          <p className="text-white/50">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[hsl(260,30%,8%)] flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white/85 mb-2">Không tìm thấy dự án</h1>
          <p className="text-white/50 mb-6">Dự án bạn tìm kiếm không tồn tại.</p>
          <Link
            to="/dashboard/stem"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại danh sách
          </Link>
        </div>
      </div>
    )
  }

  const completedCount = project.milestones.filter((m) => m.status === 'completed').length
  const inProgressCount = project.milestones.filter((m) => m.status === 'in-progress').length
  const pendingCount = project.milestones.filter((m) => m.status === 'pending').length

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/dashboard/stem/${id}`}
              className="p-2 hover:bg-white/[0.06] rounded-lg transition"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white/85">Timeline: {project.title}</h1>
              <p className="text-sm text-white/50">Tiến trình dự án STEM</p>
            </div>
          </div>

          <Link
            to={`/dashboard/stem/${id}/edit`}
            className="p-2 hover:bg-white/[0.06] rounded-lg transition"
            title="Chỉnh sửa"
          >
            <Edit className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overall progress card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Tiến độ chung</h3>
              <span className="text-2xl font-bold text-blue-400">{project.progress}%</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {/* Milestones timeline */}
          <div className="space-y-4">
            {project.milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex gap-6">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${getMilestoneStatusColor(milestone.status)}`}
                  >
                    {milestone.status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < project.milestones.length - 1 && (
                    <div className="w-1 h-16 bg-white/[0.06] mt-2" />
                  )}
                </div>

                {/* Card content */}
                <div className="flex-1 pt-2 pb-4">
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-bold text-white/85">{milestone.title}</h4>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${getMilestoneStatusBg(milestone.status)} ${getMilestoneStatusTextColor(milestone.status)}`}
                      >
                        {getMilestoneStatusText(milestone.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(milestone.dueDate)}</span>
                      </div>
                      <div className="text-xs text-white/40">Giai đoạn {index + 1}</div>
                    </div>

                    {milestone.status === 'completed' && (
                      <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Hoàn thành
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Summary card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
            <h3 className="text-lg font-bold mb-4">Tóm tắt</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-white/50">Hoàn thành</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-1">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-white/50">Đang làm</span>
                </div>
                <div className="text-2xl font-bold text-blue-400">{inProgressCount}</div>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.06] border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-1">
                  <Clock className="w-5 h-5 text-white/40" />
                  <span className="text-xs text-white/50">Chờ làm</span>
                </div>
                <div className="text-2xl font-bold text-white/40">{pendingCount}</div>
              </div>
            </div>
          </div>

          {/* Team card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-bold">Nhóm dự án</h3>
            </div>
            <div className="space-y-3">
              {project.teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                    {getInitials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/85 truncate">{member.name}</p>
                    <p className="text-xs text-white/50 truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5" />
              <h3 className="text-lg font-bold">Thông tin</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-white/50 mb-1">Tạo lúc</p>
                <p className="text-white/85">{formatDate(project.createdAt)}</p>
              </div>
              <div>
                <p className="text-white/50 mb-1">Cập nhật</p>
                <p className="text-white/85">{formatDate(project.updatedAt)}</p>
              </div>
              {project.dueDate && (
                <div>
                  <p className="text-white/50 mb-1">Hạn nộp</p>
                  <p className="text-white/85">{formatDate(project.dueDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
