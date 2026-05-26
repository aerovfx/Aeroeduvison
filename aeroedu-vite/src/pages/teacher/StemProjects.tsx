/**
 * /teacher/stem-projects — GV tạo dự án STEM + mời HS qua QR/link
 *
 * Workflow:
 *   1. GV tạo dự án (title, description, category, subject, grade)
 *   2. Mỗi dự án có nút "Mời HS" → modal hiện QR + invite link
 *   3. HS quét QR / mở link → /stem/join/:token → bấm tham gia
 *   4. GV thấy HS trong member list của dự án
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  Zap, Plus, Users, Share2, Trash2, ExternalLink, X, QrCode, Copy,
  Loader2, Calendar, BookOpen, Tag, AlertCircle, CheckCircle2,
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

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
                STEM Projects
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                  Giáo viên
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Tạo dự án STEM, mời HS qua QR / link, theo dõi tiến độ nhóm
              </p>
            </div>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" /> Tạo dự án mới
          </button>
        </div>

        {/* Projects grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 py-16 text-center">
            <Zap className="w-12 h-12 mx-auto text-amber-400 mb-3" />
            <h3 className="text-lg font-bold mb-2">Chưa có dự án STEM nào</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Tạo dự án đầu tiên — HS sẽ join qua QR/link bạn chia sẻ. Theo dõi tiến độ, milestones, ngân sách BOM.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold"
            >
              <Plus className="w-4 h-4" /> Tạo dự án đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div
                key={p.id}
                className="rounded-2xl bg-card border border-border hover:border-amber-500/40 transition-all hover:shadow-lg hover:shadow-amber-500/10 p-5 group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-foreground line-clamp-1">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {p.description || 'Không có mô tả'}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                    {p.status}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3 flex-wrap">
                  {p.category && (
                    <span className="px-1.5 py-0.5 rounded bg-muted/40 font-mono">{p.category}</span>
                  )}
                  {p.subject && <span>📚 {p.subject}</span>}
                  {p.grade && <span>· Lớp {p.grade}</span>}
                </div>

                {/* Member count + invite count */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-center">
                    <p className="text-lg font-black text-emerald-300">{p.member_count ?? 0}</p>
                    <p className="text-[10px] text-emerald-200/70 font-bold uppercase">HS đã join</p>
                  </div>
                  <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-2 text-center">
                    <p className="text-lg font-black text-cyan-300">{p.invite_count ?? 0}</p>
                    <p className="text-[10px] text-cyan-200/70 font-bold uppercase">Link active</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => setShareProject(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold hover:opacity-90 transition-opacity"
                    title="Mời HS qua QR / link"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Mời HS
                  </button>
                  <Link
                    to={`/teacher/stem-projects/${p.id}`}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-foreground text-xs font-bold"
                    title="Chi tiết + members"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-rose-500/20 text-muted-foreground hover:text-rose-300 text-xs"
                    title="Xoá"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
