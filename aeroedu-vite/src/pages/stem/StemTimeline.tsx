import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit, AlertCircle, CheckCircle2, Clock, Users, Settings, Zap,
  Plus, FileText, Camera, AlertTriangle, BookOpen, TrendingUp,
} from 'lucide-react'
import { loadProjects, saveProjects, type STEMProject, type ProgressLog } from './stemStore'

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

  // Progress log form state
  const [newLog, setNewLog] = useState({ content: '', hours: 0, photoUrl: '' })

  useEffect(() => {
    const projects = loadProjects()
    const found = projects.find((p) => p.id === id)
    setProject(found || null)
    setLoading(false)
  }, [id])

  const addProgressLog = () => {
    if (!project || !newLog.content.trim()) return
    const log: ProgressLog = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString(),
      author: project.teamMembers[0]?.name || 'Tôi',
      content: newLog.content.trim(),
      hours: Number(newLog.hours) || undefined,
      photoUrl: newLog.photoUrl.trim() || undefined,
    }
    const logs = [...(project.progressLogs || []), log]
    const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0)
    const updated = {
      ...project,
      progressLogs: logs,
      totalHoursSpent: totalHours,
      lastWorkedAt: log.date,
      updatedAt: new Date().toISOString(),
    }
    setProject(updated)
    // persist
    const all = loadProjects()
    const idx = all.findIndex(p => p.id === id)
    if (idx >= 0) {
      all[idx] = updated
      saveProjects(all)
    }
    setNewLog({ content: '', hours: 0, photoUrl: '' })
  }

  const removeLog = (logId: string) => {
    if (!project) return
    if (!confirm('Xoá log này?')) return
    const logs = (project.progressLogs || []).filter(l => l.id !== logId)
    const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0)
    const updated = { ...project, progressLogs: logs, totalHoursSpent: totalHours }
    setProject(updated)
    const all = loadProjects()
    const idx = all.findIndex(p => p.id === id)
    if (idx >= 0) {
      all[idx] = updated
      saveProjects(all)
    }
  }

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
            {/* Quick stats từ progressLogs */}
            {(project.progressLogs || []).length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/[0.06]">
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-400">{(project.progressLogs || []).length}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Lần cập nhật</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{project.totalHoursSpent || 0}h</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Đã làm</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-400">
                    {project.lastWorkedAt
                      ? new Date(project.lastWorkedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                      : '—'}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Lần cuối</div>
                </div>
              </div>
            )}
          </div>

          {/* ───────── Nhật ký tiến độ (NEW) ───────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold">Nhật ký cập nhật</h3>
              <span className="text-xs text-white/40 ml-auto">
                {(project.progressLogs || []).length} log
              </span>
            </div>

            {/* Quick add form */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4 space-y-3">
              <textarea
                value={newLog.content}
                onChange={e => setNewLog({ ...newLog, content: e.target.value })}
                rows={2}
                placeholder="Hôm nay đã làm gì? (vd: Lắp xong mạch trung gian, test cảm biến OK, gặp lỗi noise khi đo...)"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/85 text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
              />
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <label className="text-[10px] text-white/40 block mb-1">Số giờ làm</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={newLog.hours || ''}
                    onChange={e => setNewLog({ ...newLog, hours: Number(e.target.value) || 0 })}
                    placeholder="0.5"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/85 text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="col-span-7">
                  <label className="text-[10px] text-white/40 block mb-1">URL ảnh tiến độ (optional)</label>
                  <input
                    type="url"
                    value={newLog.photoUrl}
                    onChange={e => setNewLog({ ...newLog, photoUrl: e.target.value })}
                    placeholder="https://i.imgur.com/..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/85 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="col-span-2 flex items-end">
                  <button
                    onClick={addProgressLog}
                    disabled={!newLog.content.trim()}
                    className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-sm font-semibold text-white"
                  >
                    <Plus className="w-3.5 h-3.5 inline" />Log
                  </button>
                </div>
              </div>
            </div>

            {/* Logs list — newest first */}
            {(project.progressLogs || []).length === 0 ? (
              <p className="text-center text-white/40 text-sm py-4">
                Chưa có log nào. Cập nhật ngay sau mỗi lần làm việc để theo dõi tiến độ chi tiết.
              </p>
            ) : (
              <div className="space-y-3">
                {[...(project.progressLogs || [])].reverse().map(log => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                    <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-white/85">{log.author}</span>
                          <span className="text-white/40">•</span>
                          <span className="text-white/50">
                            {new Date(log.date).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                          </span>
                          {log.hours && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] font-semibold">
                              {log.hours}h
                            </span>
                          )}
                        </div>
                        <button onClick={() => removeLog(log.id)} className="text-white/30 hover:text-red-400 text-sm">×</button>
                      </div>
                      <p className="text-sm text-white/80 whitespace-pre-wrap">{log.content}</p>
                      {log.photoUrl && (
                        <a href={log.photoUrl} target="_blank" rel="noreferrer" className="block mt-2">
                          <img
                            src={log.photoUrl}
                            alt="Tiến độ"
                            className="max-h-40 rounded-lg border border-white/10"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              {project.subject && (
                <div>
                  <p className="text-white/50 mb-1">Môn học</p>
                  <p className="text-white/85">{project.subject}</p>
                </div>
              )}
              {project.objective && (
                <div>
                  <p className="text-white/50 mb-1">Mục tiêu</p>
                  <p className="text-white/85 text-xs leading-relaxed line-clamp-3">{project.objective}</p>
                </div>
              )}
            </div>
          </div>

          {/* Issues card (NEW) */}
          {(project.issues || []).length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold">Vấn đề ({(project.issues || []).length})</h3>
              </div>
              <div className="space-y-2">
                {(project.issues || []).slice(0, 5).map(iss => (
                  <div
                    key={iss.id}
                    className={`p-2.5 rounded-lg border text-xs ${iss.status === 'resolved'
                      ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                      : 'bg-yellow-500/5 border-yellow-500/20'}`}
                  >
                    <div className={`font-semibold ${iss.status === 'resolved' ? 'text-white/60 line-through' : 'text-white/85'}`}>
                      {iss.title}
                    </div>
                    {iss.status === 'resolved' && iss.resolution && (
                      <div className="text-emerald-400 text-[10px] mt-1">✓ {iss.resolution}</div>
                    )}
                  </div>
                ))}
              </div>
              <Link
                to={`/dashboard/stem/${id}/edit`}
                className="block text-center text-xs text-yellow-400 hover:text-yellow-300 mt-3"
              >
                Quản lý tất cả vấn đề →
              </Link>
            </div>
          )}

          {/* Resources card (NEW) */}
          {(project.resources || []).length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold">Tài nguyên</h3>
              </div>
              <div className="space-y-1.5">
                {(project.resources || []).map(r => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] text-xs"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[9px] font-semibold uppercase">
                      {r.type}
                    </span>
                    <span className="text-white/80 truncate">{r.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* BOM summary card (NEW) */}
          {(project.bom || []).length > 0 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">BOM & Ngân sách</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Số linh kiện</span>
                  <span className="text-white/85 font-semibold">{(project.bom || []).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Đã về</span>
                  <span className="text-emerald-300 font-semibold">
                    {(project.bom || []).filter(b => b.status === 'received' || b.status === 'used').length}
                    /{(project.bom || []).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-white/[0.06]">
                  <span className="text-white/50">Tổng tiền</span>
                  <span className="text-blue-300 font-bold">
                    {(project.bom || []).reduce((s, b) => s + b.qty * b.unitPrice, 0).toLocaleString('vi-VN')}đ
                  </span>
                </div>
                {project.budgetTotal != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Ngân sách</span>
                    <span className="text-white/85">{project.budgetTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
