import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Tag, Calendar, Users } from 'lucide-react'
import {
  loadProjects,
  saveProjects,
  type STEMProject,
  type TeamMember,
  type Milestone,
} from './stemStore'

export default function StemCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isSaving, setIsSaving] = useState(false)

  const [project, setProject] = useState({
    title: '',
    description: '',
    category: 'Science' as STEMProject['category'],
    status: 'draft' as STEMProject['status'],
    difficulty: 'beginner' as STEMProject['difficulty'],
    dueDate: '',
    instructorName: '',
    tags: [] as string[],
    milestones: [] as Milestone[],
    teamMembers: [] as TeamMember[],
    isPublic: false,
  })

  const [newTag, setNewTag] = useState('')
  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: '' })
  const [newMember, setNewMember] = useState({ name: '', role: '' })

  // Load template on mount
  useEffect(() => {
    const template = searchParams.get('template')
    if (template) {
      try {
        const parsed = JSON.parse(decodeURIComponent(template))
        setProject((prev) => ({
          ...prev,
          title: parsed.title || '',
          description: parsed.description || '',
          category: parsed.category || 'Science',
          difficulty: parsed.difficulty || 'beginner',
          tags: parsed.tags || [],
        }))
      } catch {}
    }
  }, [searchParams])

  const handleSave = async () => {
    if (!project.title.trim()) {
      alert('Vui lòng nhập tên dự án')
      return
    }

    setIsSaving(true)
    try {
      const projects = loadProjects()
      const newProject: STEMProject = {
        id: `project_${Date.now()}`,
        title: project.title,
        description: project.description,
        category: project.category,
        status: project.status,
        difficulty: project.difficulty,
        dueDate: project.dueDate || undefined,
        tags: project.tags,
        teamMembers: project.teamMembers,
        instructor: {
          id: `instr_${Date.now()}`,
          name: project.instructorName,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: 0,
        milestones: project.milestones,
        feedback: [],
        isPublic: project.isPublic,
      }

      projects.push(newProject)
      saveProjects(projects)
      navigate('/dashboard/stem')
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !project.tags.includes(newTag)) {
      setProject((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setProject((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
  }

  const addMilestone = () => {
    if (newMilestone.title.trim() && newMilestone.dueDate) {
      setProject((prev) => ({
        ...prev,
        milestones: [
          ...prev.milestones,
          {
            id: `mile_${Date.now()}`,
            title: newMilestone.title,
            status: 'pending',
            dueDate: newMilestone.dueDate,
          },
        ],
      }))
      setNewMilestone({ title: '', dueDate: '' })
    }
  }

  const removeMilestone = (id: string) => {
    setProject((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }))
  }

  const addMember = () => {
    if (newMember.name.trim() && newMember.role.trim()) {
      setProject((prev) => ({
        ...prev,
        teamMembers: [
          ...prev.teamMembers,
          {
            id: `member_${Date.now()}`,
            name: newMember.name,
            role: newMember.role,
          },
        ],
      }))
      setNewMember({ name: '', role: '' })
    }
  }

  const removeMember = (id: string) => {
    setProject((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
    }))
  }

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white/85">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard/stem"
              className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Tạo dự án STEM mới</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-colors"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu dự án'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Thông tin cơ bản */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Thông tin cơ bản</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-2">
              Tên dự án *
            </label>
            <input
              type="text"
              value={project.title}
              onChange={(e) => setProject({ ...project, title: e.target.value })}
              placeholder="Nhập tên dự án..."
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-2">
              Mô tả dự án
            </label>
            <textarea
              value={project.description}
              onChange={(e) => setProject({ ...project, description: e.target.value })}
              placeholder="Mô tả chi tiết dự án..."
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
                  setProject({
                    ...project,
                    category: e.target.value as STEMProject['category'],
                  })
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
                  setProject({
                    ...project,
                    status: e.target.value as STEMProject['status'],
                  })
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
                  setProject({
                    ...project,
                    difficulty: e.target.value as STEMProject['difficulty'],
                  })
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
              value={project.dueDate}
              onChange={(e) => setProject({ ...project, dueDate: e.target.value })}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-2">
              Giảng viên hướng dẫn
            </label>
            <input
              type="text"
              value={project.instructorName}
              onChange={(e) => setProject({ ...project, instructorName: e.target.value })}
              placeholder="Tên giảng viên..."
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white/80 w-full text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={project.isPublic}
              onChange={(e) => setProject({ ...project, isPublic: e.target.checked })}
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
                  className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5"
                >
                  <div className="text-sm text-white/80">
                    <div className="font-medium">{milestone.title}</div>
                    <div className="text-xs text-white/40">
                      Hạn: {new Date(milestone.dueDate).toLocaleDateString('vi-VN')}
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
      </div>
    </div>
  )
}
