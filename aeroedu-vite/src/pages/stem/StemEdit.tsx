import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Tag, Calendar, Users, Trash2, Eye, AlertCircle,
  Target, Beaker, Package, AlertTriangle, BookOpen, Plus, ExternalLink,
  Wallet,
} from 'lucide-react'
import {
  loadProjects,
  saveProjects,
  type STEMProject,
  type Milestone,
  type Issue,
  type Resource,
  type BOMItem,
} from './stemStore'

const ISSUE_SEVERITY: Record<Issue['severity'], { label: string; cls: string }> = {
  low:    { label: 'Thấp',    cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30'      },
  medium: { label: 'Trung bình', cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  high:   { label: 'Cao',     cls: 'bg-red-500/15 text-red-300 border-red-500/30'        },
}

const BOM_STATUS: Record<BOMItem['status'], { label: string; cls: string }> = {
  planned:  { label: 'Dự kiến',  cls: 'bg-white/[0.06] text-white/60 border-white/[0.1]'    },
  ordered:  { label: 'Đã đặt',   cls: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  received: { label: 'Đã về',    cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30'    },
  used:     { label: 'Đã dùng',  cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
}

function fmtVND(n: number): string {
  if (!n) return '0đ'
  return n.toLocaleString('vi-VN') + 'đ'
}

const CAT_GRADIENT: Record<string, string> = {
  Science: 'from-blue-600 to-cyan-500',
  Technology: 'from-emerald-600 to-teal-500',
  Engineering: 'from-orange-600 to-amber-500',
  Math: 'from-purple-600 to-violet-500',
}

export default function StemEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [project, setProject] = useState<STEMProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [newTag, setNewTag] = useState('')
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' })
  const [newMember, setNewMember] = useState({ name: '', role: '' })
  const [newBom, setNewBom] = useState({ name: '', qty: 1, unitPrice: 0 })
  const [newIssue, setNewIssue] = useState({ title: '', description: '', severity: 'medium' as Issue['severity'] })
  const [newResource, setNewResource] = useState({ type: 'link' as Resource['type'], title: '', url: '' })

  // Load project
  useEffect(() => {
    if (!id) return

    const projects = loadProjects()
    const found = projects.find((p) => p.id === id)

    if (found) {
      setProject(found)
    }
    setLoading(false)
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white/60">Đang tải dự án...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-white/30 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Không tìm thấy dự án</h1>
          <p className="text-white/50">Dự án này có thể đã bị xóa</p>
          <Link
            to="/dashboard/stem"
            className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium text-white transition-colors"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    )
  }

  const gradient = CAT_GRADIENT[project.category] || 'from-purple-600 to-violet-500'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const projects = loadProjects()
      const index = projects.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects[index] = {
          ...project,
          updatedAt: new Date().toISOString(),
        }
        saveProjects(projects)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    const projects = loadProjects()
    const filtered = projects.filter((p) => p.id !== id)
    saveProjects(filtered)
    navigate('/dashboard/stem')
  }

  const addTag = () => {
    if (newTag.trim() && !project.tags.includes(newTag)) {
      const updated = {
        ...project,
        tags: [...project.tags, newTag],
      }
      setProject(updated)
      setNewTag('')
      setHasChanges(true)
    }
  }

  const removeTag = (tag: string) => {
    const updated = {
      ...project,
      tags: project.tags.filter((t) => t !== tag),
    }
    setProject(updated)
    setHasChanges(true)
  }

  const addMilestone = () => {
    if (newMilestone.title.trim() && newMilestone.dueDate) {
      const updated = {
        ...project,
        milestones: [
          ...project.milestones,
          {
            id: `mile_${Date.now()}`,
            title: newMilestone.title,
            status: 'pending' as const,
            dueDate: newMilestone.dueDate,
          },
        ],
      }
      setProject(updated)
      setNewMilestone({ title: '', dueDate: '' })
      setHasChanges(true)
    }
  }

  const removeMilestone = (milestoneId: string) => {
    const updated = {
      ...project,
      milestones: project.milestones.filter((m) => m.id !== milestoneId),
    }
    setProject(updated)
    setHasChanges(true)
  }

  const toggleMilestoneStatus = (milestoneId: string) => {
    const updated = {
      ...project,
      milestones: project.milestones.map((m) => {
        if (m.id !== milestoneId) return m
        const statuses: Array<Milestone['status']> = ['pending', 'in-progress', 'completed']
        const currentIndex = statuses.indexOf(m.status)
        const nextIndex = (currentIndex + 1) % statuses.length
        return { ...m, status: statuses[nextIndex] }
      }),
    }
    setProject(updated)
    setHasChanges(true)
  }

  const addMember = () => {
    if (newMember.name.trim() && newMember.role.trim()) {
      const updated = {
        ...project,
        teamMembers: [
          ...project.teamMembers,
          {
            id: `member_${Date.now()}`,
            name: newMember.name,
            role: newMember.role,
          },
        ],
      }
      setProject(updated)
      setNewMember({ name: '', role: '' })
      setHasChanges(true)
    }
  }

  const removeMember = (memberId: string) => {
    const updated = {
      ...project,
      teamMembers: project.teamMembers.filter((m) => m.id !== memberId),
    }
    setProject(updated)
    setHasChanges(true)
  }

  const updateProjectField = (field: keyof STEMProject, value: any) => {
    setProject({ ...project, [field]: value })
    setHasChanges(true)
  }

  // ── BOM handlers ─────────────────────────────────
  const addBom = () => {
    if (!newBom.name.trim()) return
    const updated = {
      ...project,
      bom: [
        ...(project.bom || []),
        {
          id: `bom_${Date.now()}`,
          name: newBom.name.trim(),
          qty: Math.max(1, Number(newBom.qty) || 1),
          unitPrice: Math.max(0, Number(newBom.unitPrice) || 0),
          status: 'planned' as BOMItem['status'],
        },
      ],
    }
    setProject(updated)
    setNewBom({ name: '', qty: 1, unitPrice: 0 })
    setHasChanges(true)
  }
  const removeBom = (bomId: string) => {
    const updated = { ...project, bom: (project.bom || []).filter(b => b.id !== bomId) }
    setProject(updated)
    setHasChanges(true)
  }
  const cycleBomStatus = (bomId: string) => {
    const order: BOMItem['status'][] = ['planned', 'ordered', 'received', 'used']
    const updated = {
      ...project,
      bom: (project.bom || []).map(b => {
        if (b.id !== bomId) return b
        const next = order[(order.indexOf(b.status) + 1) % order.length]
        return { ...b, status: next }
      }),
    }
    setProject(updated)
    setHasChanges(true)
  }
  const bomTotal = (project.bom || []).reduce((s, b) => s + b.qty * b.unitPrice, 0)

  // ── Issue handlers ───────────────────────────────
  const addIssue = () => {
    if (!newIssue.title.trim()) return
    const updated = {
      ...project,
      issues: [
        ...(project.issues || []),
        {
          id: `iss_${Date.now()}`,
          date: new Date().toISOString(),
          title: newIssue.title.trim(),
          description: newIssue.description.trim(),
          severity: newIssue.severity,
          status: 'open' as Issue['status'],
        },
      ],
    }
    setProject(updated)
    setNewIssue({ title: '', description: '', severity: 'medium' })
    setHasChanges(true)
  }
  const removeIssue = (issueId: string) => {
    const updated = { ...project, issues: (project.issues || []).filter(i => i.id !== issueId) }
    setProject(updated)
    setHasChanges(true)
  }
  const resolveIssue = (issueId: string, resolution: string) => {
    const updated = {
      ...project,
      issues: (project.issues || []).map(i => i.id !== issueId ? i : ({
        ...i, status: 'resolved' as const, resolution, resolvedAt: new Date().toISOString(),
      })),
    }
    setProject(updated)
    setHasChanges(true)
  }

  // ── Resource handlers ───────────────────────────
  const addResource = () => {
    if (!newResource.title.trim() || !newResource.url.trim()) return
    const updated = {
      ...project,
      resources: [
        ...(project.resources || []),
        {
          id: `res_${Date.now()}`,
          type: newResource.type,
          title: newResource.title.trim(),
          url: newResource.url.trim(),
        },
      ],
    }
    setProject(updated)
    setNewResource({ type: 'link', title: '', url: '' })
    setHasChanges(true)
  }
  const removeResource = (resId: string) => {
    const updated = { ...project, resources: (project.resources || []).filter(r => r.id !== resId) }
    setProject(updated)
    setHasChanges(true)
  }

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${gradient} relative overflow-hidden px-6 py-6 border-b border-white/[0.06]`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <Link
                to="/dashboard/stem"
                className="p-2 hover:bg-white/[0.15] rounded-lg transition-colors mt-1 text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{project.title}</h1>
                  <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white">
                    {project.category}
                  </span>
                </div>
                <p className="text-white/60 text-sm">
                  Cập nhật lần cuối: {new Date(project.updatedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <div className="flex items-center gap-2 text-white/60 text-xs animate-pulse">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  Tự động lưu...
                </div>
              )}
              <Link
                to={`/dashboard/stem/${id}`}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium text-white transition-colors"
              >
                <Eye className="w-4 h-4" />
              </Link>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-colors"
              >
                {isSaving ? 'Lưu...' : 'Lưu'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 bg-white/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left content - lg:col-span-2 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin cơ bản */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Thông tin cơ bản</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                Tên dự án
              </label>
              <input
                type="text"
                value={project.title}
                onChange={(e) => updateProjectField('title', e.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                Mô tả dự án
              </label>
              <textarea
                value={project.description}
                onChange={(e) => updateProjectField('description', e.target.value)}
                rows={4}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Danh mục
                </label>
                <select
                  value={project.category}
                  onChange={(e) =>
                    updateProjectField('category', e.target.value as STEMProject['category'])
                  }
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="Science">Khoa học</option>
                  <option value="Technology">Công nghệ</option>
                  <option value="Engineering">Kỹ thuật</option>
                  <option value="Math">Toán học</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Trạng thái
                </label>
                <select
                  value={project.status}
                  onChange={(e) =>
                    updateProjectField('status', e.target.value as STEMProject['status'])
                  }
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="draft">Nháp</option>
                  <option value="in-progress">Đang thực hiện</option>
                  <option value="review">Đang đánh giá</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="published">Công bố</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">
                  Độ khó
                </label>
                <select
                  value={project.difficulty}
                  onChange={(e) =>
                    updateProjectField('difficulty', e.target.value as STEMProject['difficulty'])
                  }
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="beginner">Cơ bản</option>
                  <option value="intermediate">Trung bình</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                Hạn nộp
              </label>
              <input
                type="date"
                value={project.dueDate || ''}
                onChange={(e) => updateProjectField('dueDate', e.target.value || undefined)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                Giảng viên hướng dẫn
              </label>
              <input
                type="text"
                value={project.instructor.name}
                onChange={(e) =>
                  updateProjectField('instructor', {
                    ...project.instructor,
                    name: e.target.value,
                  })
                }
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={project.isPublic}
                onChange={(e) => updateProjectField('isPublic', e.target.checked)}
                className="w-4 h-4 rounded accent-purple-600"
              />
              <label htmlFor="isPublic" className="text-sm text-white/70 cursor-pointer">
                Công khai dự án
              </label>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Tags</h2>
            </div>

            {project.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {project.tags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-500/30 rounded-full px-3 py-1.5"
                  >
                    <span className="text-xs font-medium text-white/80">{tag}</span>
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-white/40 hover:text-white/70 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Thêm tag..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
              />
              <button
                onClick={addTag}
                className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 rounded-xl text-sm font-medium text-white/80 transition-colors"
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Milestones */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Các giai đoạn</h2>
            </div>

            {project.milestones.length > 0 && (
              <div className="space-y-2 pb-2">
                {project.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleMilestoneStatus(milestone.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                            milestone.status === 'completed'
                              ? 'bg-green-600/30 border-green-500/50'
                              : milestone.status === 'in-progress'
                                ? 'bg-yellow-600/30 border-yellow-500/50'
                                : 'bg-white/[0.04] border-white/[0.12]'
                          }`}
                        >
                          {milestone.status === 'completed' && '✓'}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-white/80">{milestone.title}</div>
                          <div className="text-xs text-white/40">
                            Hạn: {new Date(milestone.dueDate).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMilestone(milestone.id)}
                      className="text-white/40 hover:text-white/70 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMilestone.title}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, title: e.target.value })
                  }
                  placeholder="Tiêu đề giai đoạn..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <input
                  type="date"
                  value={newMilestone.dueDate}
                  onChange={(e) =>
                    setNewMilestone({ ...newMilestone, dueDate: e.target.value })
                  }
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <button
                  onClick={addMilestone}
                  className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 rounded-xl text-sm font-medium text-white/80 transition-colors"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Thành viên nhóm</h2>
            </div>

            {project.teamMembers.length > 0 && (
              <div className="space-y-2 pb-2">
                {project.teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5"
                  >
                    <div className="text-sm text-white/80">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-white/40">{member.role}</div>
                    </div>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-white/40 hover:text-white/70 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  placeholder="Tên thành viên..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <input
                  type="text"
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  placeholder="Vị trí..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <button
                  onClick={addMember}
                  className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 rounded-xl text-sm font-medium text-white/80 transition-colors"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>

          {/* ───────── Mục tiêu & Phương pháp khoa học ───────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Mục tiêu & Phương pháp</h2>
              <span className="text-xs text-white/30">(Hồ sơ khoa học)</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                🎯 Mục tiêu cụ thể của dự án
              </label>
              <textarea
                value={project.objective || ''}
                onChange={e => updateProjectField('objective', e.target.value)}
                rows={3}
                placeholder="VD: Thiết kế hệ thống đo nồng độ CO₂ trong lớp học, cảnh báo khi vượt 1000ppm..."
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                <Beaker className="w-3.5 h-3.5 inline mr-1" />Phương pháp tiếp cận
              </label>
              <textarea
                value={project.methodology || ''}
                onChange={e => updateProjectField('methodology', e.target.value)}
                rows={3}
                placeholder="VD: Sử dụng cảm biến MQ-135, đọc giá trị qua ADC, hiệu chuẩn theo công thức Henderson..."
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                ✨ Kết quả mong đợi (sản phẩm / báo cáo / video)
              </label>
              <textarea
                value={project.expectedOutcomes || ''}
                onChange={e => updateProjectField('expectedOutcomes', e.target.value)}
                rows={2}
                placeholder="VD: 1 mạch hoàn chỉnh + báo cáo PDF 10 trang + video demo 3 phút..."
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">📚 Môn học liên kết</label>
                <input
                  type="text"
                  value={project.subject || ''}
                  onChange={e => updateProjectField('subject', e.target.value)}
                  placeholder="Vật lí / Hoá / Sinh / Tin học"
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-2">📅 Năm học</label>
                <input
                  type="text"
                  value={project.schoolYear || ''}
                  onChange={e => updateProjectField('schoolYear', e.target.value)}
                  placeholder="2025-2026"
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ───────── BOM linh kiện ───────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">BOM linh kiện</h2>
              <span className="text-xs text-white/30">(Bill of Materials)</span>
              {bomTotal > 0 && (
                <span className="ml-auto text-sm font-bold text-emerald-300">
                  Tổng: {fmtVND(bomTotal)}
                </span>
              )}
            </div>

            {(project.bom || []).length > 0 && (
              <div className="space-y-2">
                {(project.bom || []).map(b => (
                  <div key={b.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg">
                    <div className="col-span-5 text-sm font-medium text-white/85 truncate">{b.name}</div>
                    <div className="col-span-1 text-xs text-white/50 text-center">×{b.qty}</div>
                    <div className="col-span-2 text-xs text-white/50 text-right font-mono">{fmtVND(b.unitPrice)}</div>
                    <div className="col-span-2 text-xs font-bold text-emerald-300 text-right font-mono">{fmtVND(b.qty * b.unitPrice)}</div>
                    <button
                      onClick={() => cycleBomStatus(b.id)}
                      className={`col-span-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${BOM_STATUS[b.status].cls}`}
                      title="Click để đổi trạng thái"
                    >
                      {BOM_STATUS[b.status].label}
                    </button>
                    <button
                      onClick={() => removeBom(b.id)}
                      className="col-span-1 text-white/30 hover:text-red-400 text-center"
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={newBom.name}
                onChange={e => setNewBom({ ...newBom, name: e.target.value })}
                placeholder="Tên linh kiện (vd Arduino UNO)"
                className="col-span-6 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="number" min={1}
                value={newBom.qty}
                onChange={e => setNewBom({ ...newBom, qty: Number(e.target.value) || 1 })}
                placeholder="SL"
                className="col-span-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm text-center focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="number" min={0}
                value={newBom.unitPrice}
                onChange={e => setNewBom({ ...newBom, unitPrice: Number(e.target.value) || 0 })}
                placeholder="Đơn giá"
                className="col-span-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm font-mono focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={addBom}
                className="col-span-2 px-3 py-2 bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl text-sm font-medium text-white/80"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />Thêm
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-2">
                <Wallet className="w-3.5 h-3.5 inline mr-1" />Ngân sách dự kiến (tham khảo)
              </label>
              <input
                type="number" min={0}
                value={project.budgetTotal || ''}
                onChange={e => updateProjectField('budgetTotal', Number(e.target.value) || undefined)}
                placeholder="VD: 500000"
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-white/80 w-full text-sm font-mono focus:outline-none focus:border-blue-500/50"
              />
              {project.budgetTotal != null && bomTotal > 0 && (
                <p className={`text-xs mt-1 ${bomTotal > project.budgetTotal ? 'text-red-400' : 'text-emerald-400'}`}>
                  {bomTotal > project.budgetTotal
                    ? `⚠️ Vượt ngân sách ${fmtVND(bomTotal - project.budgetTotal)}`
                    : `✓ Còn lại ${fmtVND(project.budgetTotal - bomTotal)}`}
                </p>
              )}
            </div>
          </div>

          {/* ───────── Vấn đề & Giải pháp ───────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">Vấn đề gặp phải</h2>
              {(project.issues || []).filter(i => i.status === 'open').length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 ml-auto">
                  {(project.issues || []).filter(i => i.status === 'open').length} đang mở
                </span>
              )}
            </div>

            {(project.issues || []).length > 0 && (
              <div className="space-y-2">
                {(project.issues || []).map(iss => (
                  <div
                    key={iss.id}
                    className={`p-3 rounded-lg border ${iss.status === 'resolved'
                      ? 'bg-emerald-500/5 border-emerald-500/20 opacity-70'
                      : 'bg-yellow-500/5 border-yellow-500/20'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${ISSUE_SEVERITY[iss.severity].cls}`}>
                          {ISSUE_SEVERITY[iss.severity].label}
                        </span>
                        <span className={`text-sm font-medium ${iss.status === 'resolved' ? 'text-white/60 line-through' : 'text-white/85'}`}>
                          {iss.title}
                        </span>
                      </div>
                      <button onClick={() => removeIssue(iss.id)} className="text-white/30 hover:text-red-400 text-sm">×</button>
                    </div>
                    {iss.description && <p className="text-xs text-white/50 mb-1.5 ml-1">{iss.description}</p>}
                    <div className="flex items-center justify-between text-[10px] text-white/30 ml-1">
                      <span>{new Date(iss.date).toLocaleDateString('vi-VN')}</span>
                      {iss.status === 'open' ? (
                        <button
                          onClick={() => {
                            const r = prompt('Mô tả giải pháp đã áp dụng:')
                            if (r?.trim()) resolveIssue(iss.id, r.trim())
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-semibold"
                        >
                          ✓ Đánh dấu đã giải quyết
                        </button>
                      ) : (
                        <span className="text-emerald-400">✓ Giải quyết: {iss.resolution}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newIssue.title}
                  onChange={e => setNewIssue({ ...newIssue, title: e.target.value })}
                  placeholder="Tiêu đề vấn đề..."
                  className="col-span-7 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-yellow-500/50"
                />
                <select
                  value={newIssue.severity}
                  onChange={e => setNewIssue({ ...newIssue, severity: e.target.value as Issue['severity'] })}
                  className="col-span-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2 py-2 text-white/80 text-sm focus:outline-none focus:border-yellow-500/50"
                >
                  <option value="low">Mức Thấp</option>
                  <option value="medium">Mức TB</option>
                  <option value="high">Mức Cao</option>
                </select>
                <button
                  onClick={addIssue}
                  className="col-span-2 px-3 py-2 bg-yellow-600/30 hover:bg-yellow-600/40 border border-yellow-500/30 rounded-xl text-sm font-medium text-white/80"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />Thêm
                </button>
              </div>
              <textarea
                value={newIssue.description}
                onChange={e => setNewIssue({ ...newIssue, description: e.target.value })}
                rows={2}
                placeholder="Mô tả chi tiết vấn đề (optional)..."
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 w-full text-sm focus:outline-none focus:border-yellow-500/50 resize-none"
              />
            </div>
          </div>

          {/* ───────── Tài nguyên tham khảo ───────── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Tài nguyên tham khảo</h2>
            </div>

            {(project.resources || []).length > 0 && (
              <div className="space-y-1.5">
                {(project.resources || []).map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                      {r.type}
                    </span>
                    <a
                      href={r.url} target="_blank" rel="noreferrer"
                      className="flex-1 text-sm text-white/85 hover:text-cyan-300 truncate flex items-center gap-1.5"
                    >
                      {r.title}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    <button onClick={() => removeResource(r.id)} className="text-white/30 hover:text-red-400">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-12 gap-2">
              <select
                value={newResource.type}
                onChange={e => setNewResource({ ...newResource, type: e.target.value as Resource['type'] })}
                className="col-span-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2 py-2 text-white/80 text-sm focus:outline-none focus:border-cyan-500/50"
              >
                <option value="link">Link</option>
                <option value="video">Video</option>
                <option value="paper">Bài báo</option>
                <option value="datasheet">Datasheet</option>
              </select>
              <input
                type="text"
                value={newResource.title}
                onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                placeholder="Tiêu đề tài liệu"
                className="col-span-4 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-cyan-500/50"
              />
              <input
                type="url"
                value={newResource.url}
                onChange={e => setNewResource({ ...newResource, url: e.target.value })}
                placeholder="https://..."
                className="col-span-4 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white/80 text-sm font-mono focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={addResource}
                className="col-span-2 px-3 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 border border-cyan-500/30 rounded-xl text-sm font-medium text-white/80"
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" />Thêm
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Progress */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Tiến độ</h3>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="100"
                value={project.progress}
                onChange={(e) => updateProjectField('progress', parseInt(e.target.value))}
                className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="text-2xl font-bold text-white text-center">{project.progress}%</div>
            </div>
          </div>

          {/* Quick save */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-colors"
            >
              {isSaving ? 'Đang lưu...' : 'Lưu các thay đổi'}
            </button>
            <Link
              to={`/dashboard/stem/${id}`}
              className="block w-full text-center px-4 py-3 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm font-medium text-white/80 transition-colors"
            >
              Quay lại xem
            </Link>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl bg-red-600/5 border border-red-500/20 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-red-400">Vùng nguy hiểm</h3>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-sm font-medium text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Xóa dự án
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(260,30%,10%)] border border-white/[0.08] rounded-2xl p-6 max-w-sm">
            <h2 className="text-xl font-bold text-white mb-2">Xóa dự án?</h2>
            <p className="text-white/60 text-sm mb-6">
              Hành động này không thể hoàn tác. Dự án "{project.title}" sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm font-medium text-white/80 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium text-white transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
