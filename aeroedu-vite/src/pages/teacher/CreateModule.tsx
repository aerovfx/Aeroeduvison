/**
 * /teacher/create-module — GV tạo module (giáo án mini) share cho HS hoặc GV khác.
 *
 * Features:
 *  - Form: title, description, subject, grade, duration, audience, visibility
 *  - Chapters editor: add/edit/delete/reorder
 *  - Visibility: 🌍 Công khai (mọi người xem) vs 🔒 Bí mật (chỉ tôi)
 *  - Audience: 👨‍🎓 Học sinh | 👩‍🏫 GV khác | 🌐 Cả hai
 *  - Preview mode (toggle)
 *  - Save handler → POST /api/teacher/modules (real backend)
 *  - Edit mode qua ?id=<moduleId> → load + update
 *  - Library section ở cuối: module công khai từ GV khác để clone
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpen, Save, X, ArrowUp, ArrowDown, Eye, Lock, Globe2, Plus,
  Loader2, Trash2, Users, GraduationCap, FileText, Library, Copy,
  CheckCircle2, AlertCircle, Tag, Clock,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  teacherModuleService,
  type ModuleChapter, type ModuleAudience, type ModuleVisibility, type TeacherModule,
} from '@/services/teacherModule.service'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error'

const AUDIENCE_OPTIONS: Array<{ value: ModuleAudience; label: string; icon: any; color: string }> = [
  { value: 'students', label: 'Học sinh',   icon: GraduationCap, color: '#22d3ee' },
  { value: 'teachers', label: 'GV khác',    icon: Users,         color: '#a78bfa' },
  { value: 'both',     label: 'Cả hai',     icon: FileText,      color: '#10b981' },
]

const VISIBILITY_OPTIONS: Array<{ value: ModuleVisibility; label: string; icon: any; color: string; description: string }> = [
  { value: 'public',  label: 'Công khai', icon: Globe2, color: '#10b981', description: 'Mọi GV và HS đều thấy trong thư viện chung' },
  { value: 'private', label: 'Bí mật',    icon: Lock,   color: '#f59e0b', description: 'Chỉ bạn thấy. Có thể share qua link trực tiếp sau.' },
]

// Component chính: form tạo/sửa module + trình biên tập chương + lưu lên server
export default function CreateModule() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const moduleId = searchParams.get('id')
  const isEditMode = !!moduleId

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [duration, setDuration] = useState('1')
  const [audience, setAudience] = useState<ModuleAudience>('students')
  const [visibility, setVisibility] = useState<ModuleVisibility>('private')
  const [chapters, setChapters] = useState<ModuleChapter[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [allowFreePreview, setAllowFreePreview] = useState(true)
  const [isPublished, setIsPublished] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState('')

  // UI state
  const [loading, setLoading] = useState(isEditMode)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [previewMode, setPreviewMode] = useState(false)
  const [editingChapter, setEditingChapter] = useState<number | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)

  // ── Load edit mode ──
  useEffect(() => {
    if (!isEditMode || !moduleId) return
    setLoading(true)
    teacherModuleService.get(moduleId).then(r => {
      const m = r.module
      if (!r.canEdit) {
        toast.error('Bạn không có quyền sửa module này — sẽ chuyển sang chế độ xem')
      }
      setTitle(m.title)
      setDescription(m.description)
      setSubject(m.subject)
      setGrade(m.grade)
      setDuration(String(m.duration))
      setAudience(m.audience)
      setVisibility(m.visibility)
      setChapters(m.chapters || [])
      setTags(m.tags || [])
      setAllowFreePreview(m.allowFreePreview)
      setIsPublished(m.isPublished)
      setThumbnailUrl(m.thumbnailUrl || '')
      setSaveStatus('saved')
    }).catch(err => {
      toast.error(err?.response?.data?.error || 'Không tải được module')
      navigate('/teacher/create-module')
    }).finally(() => setLoading(false))
  }, [isEditMode, moduleId, navigate])

  // Mark unsaved on any form change
  const markDirty = useCallback(() => {
    if (saveStatus !== 'saving') setSaveStatus('unsaved')
  }, [saveStatus])

  // ── Chapter handlers ──
  const addChapter = () => {
    const nextId = chapters.length > 0 ? Math.max(...chapters.map(c => c.id)) + 1 : 1
    const newCh: ModuleChapter = {
      id: nextId,
      title: `Chương ${nextId}: Tiêu đề mới`,
      content: '',
      videoUrl: '',
    }
    setChapters([...chapters, newCh])
    setEditingChapter(nextId)
    markDirty()
  }

  const updateChapter = (id: number, patch: Partial<ModuleChapter>) => {
    setChapters(chapters.map(c => c.id === id ? { ...c, ...patch } : c))
    markDirty()
  }

  const deleteChapter = (id: number) => {
    if (!confirm('Xoá chương này?')) return
    setChapters(chapters.filter(c => c.id !== id))
    if (editingChapter === id) setEditingChapter(null)
    markDirty()
  }

  const moveChapter = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === chapters.length - 1)) return
    const next = [...chapters]
    const swap = direction === 'up' ? index - 1 : index + 1
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setChapters(next)
    markDirty()
  }

  // ── Tag handlers ──
  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    if (tags.length >= 10) { toast.error('Tối đa 10 tag'); return }
    if (tags.includes(t)) { setTagInput(''); return }
    setTags([...tags, t])
    setTagInput('')
    markDirty()
  }

  const removeTag = (t: string) => {
    setTags(tags.filter(x => x !== t))
    markDirty()
  }

  // ── Save handler ──
  const handleSave = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      toast.error('Cần nhập tên module trước khi lưu')
      return
    }
    setSaveStatus('saving')
    const payload = {
      title: trimmed,
      description: description.trim(),
      subject: subject.trim(),
      grade: grade.trim(),
      duration: Number(duration) || 0,
      audience, visibility,
      chapters,
      tags,
      thumbnailUrl: thumbnailUrl.trim(),
      allowFreePreview,
      isPublished,
    }
    try {
      if (isEditMode && moduleId) {
        await teacherModuleService.update(moduleId, payload)
        toast.success('Đã cập nhật module')
      } else {
        const r = await teacherModuleService.create(payload)
        toast.success(`Đã tạo module mới ${visibility === 'public' ? '(công khai)' : '(bí mật)'}`)
        // Redirect to edit mode để user có thể tiếp tục chỉnh sửa
        navigate(`/teacher/create-module?id=${r.id}`, { replace: true })
      }
      setSaveStatus('saved')
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Lỗi khi lưu'
      toast.error(msg)
      setSaveStatus('error')
    }
  }

  // ── Delete handler (only edit mode) ──
  const handleDelete = async () => {
    if (!moduleId) return
    if (!confirm('Xoá vĩnh viễn module này? Không thể khôi phục.')) return
    try {
      await teacherModuleService.remove(moduleId)
      toast.success('Đã xoá')
      navigate('/teacher/my-courses')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không xoá được')
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {isEditMode ? 'Chỉnh sửa Module' : 'Tạo Module mới'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tạo module giảng dạy chia sẻ cho học sinh hoặc giáo viên khác
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveStatusPill status={saveStatus} />
          <button
            onClick={() => setShowLibrary(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-1.5"
          >
            <Library className="w-3.5 h-3.5" /> Thư viện công khai
          </button>
        </div>
      </div>

      {previewMode ? (
        <PreviewPanel
          title={title} description={description} chapters={chapters}
          audience={audience} visibility={visibility} duration={duration}
          tags={tags} isPublished={isPublished}
          onExit={() => setPreviewMode(false)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form left col */}
          <div className="lg:col-span-2 space-y-6">

            {/* Module info */}
            <Card title="Thông tin Module">
              <div className="space-y-4">
                <Field label="Tên Module *">
                  <input
                    type="text" value={title}
                    onChange={e => { setTitle(e.target.value); markDirty() }}
                    placeholder="VD: Toán 10 - Hàm số bậc nhất"
                    maxLength={200}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none text-sm"
                  />
                </Field>

                <Field label="Mô tả">
                  <textarea
                    value={description}
                    onChange={e => { setDescription(e.target.value); markDirty() }}
                    placeholder="Mô tả ngắn về nội dung module — sẽ hiển thị trong thư viện"
                    rows={3} maxLength={3000}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary outline-none text-sm resize-y"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Môn">
                    <input
                      type="text" value={subject}
                      onChange={e => { setSubject(e.target.value); markDirty() }}
                      placeholder="VD: Vật lý, Toán..."
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </Field>
                  <Field label="Lớp">
                    <input
                      type="text" value={grade}
                      onChange={e => { setGrade(e.target.value); markDirty() }}
                      placeholder="VD: 10, 11, 12"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </Field>
                </div>

                <Field label="Tags (Enter để thêm)">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        <Tag className="w-3 h-3" />{t}
                        <button onClick={() => removeTag(t)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    placeholder="Bấm Enter để thêm tag..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </Field>
              </div>
            </Card>

            {/* Chapters */}
            <Card title={`Chương học (${chapters.length})`}>
              {chapters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có chương nào</p>
                  <p className="text-xs">Bấm "+ Thêm chương" bên dưới để bắt đầu</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((ch, idx) => (
                    <ChapterRow
                      key={ch.id}
                      chapter={ch}
                      index={idx}
                      total={chapters.length}
                      isEditing={editingChapter === ch.id}
                      onEdit={() => setEditingChapter(editingChapter === ch.id ? null : ch.id)}
                      onUpdate={patch => updateChapter(ch.id, patch)}
                      onDelete={() => deleteChapter(ch.id)}
                      onMove={dir => moveChapter(idx, dir)}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={addChapter}
                className="w-full mt-4 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:bg-background hover:border-primary/40 font-medium text-sm flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Thêm chương
              </button>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">

            {/* Audience selector */}
            <Card title="Đối tượng">
              <div className="space-y-2">
                {AUDIENCE_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const active = audience === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setAudience(opt.value); markDirty() }}
                      className={cn(
                        'w-full p-3 rounded-lg border-2 transition text-left flex items-center gap-3',
                        active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                      )}
                    >
                      <Icon className="w-5 h-5" style={{ color: opt.color }} />
                      <div className="flex-1">
                        <div className="text-sm font-bold">{opt.label}</div>
                      </div>
                      {active && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Visibility — NEW: công khai vs bí mật */}
            <Card title="Mức độ chia sẻ">
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const active = visibility === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setVisibility(opt.value); markDirty() }}
                      className={cn(
                        'w-full p-3 rounded-lg border-2 transition text-left',
                        active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" style={{ color: opt.color }} />
                        <span className="text-sm font-bold">{opt.label}</span>
                        {active && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{opt.description}</p>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Settings */}
            <Card title="Cài đặt">
              <div className="space-y-3">
                <Field label="Thời lượng (giờ)">
                  <input
                    type="number" min={0} max={999} step="0.5"
                    value={duration}
                    onChange={e => { setDuration(e.target.value); markDirty() }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </Field>

                <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-border">
                  <input
                    type="checkbox" checked={allowFreePreview}
                    onChange={e => { setAllowFreePreview(e.target.checked); markDirty() }}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div>
                    <div className="text-sm font-medium">Cho phép xem trước</div>
                    <div className="text-[10px] text-muted-foreground">Chương đầu hiện free để HS quyết định</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox" checked={isPublished}
                    onChange={e => { setIsPublished(e.target.checked); markDirty() }}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div>
                    <div className="text-sm font-medium">Xuất bản ngay</div>
                    <div className="text-[10px] text-muted-foreground">
                      {visibility === 'public'
                        ? 'Mọi GV/HS thấy trong thư viện'
                        : 'Chỉ bạn thấy. Tắt = nháp.'}
                    </div>
                  </div>
                </label>
              </div>
            </Card>

            {/* Action buttons */}
            <div className="space-y-2 sticky top-6">
              <button
                onClick={() => setPreviewMode(true)}
                disabled={!title.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 disabled:opacity-50 font-medium text-sm"
              >
                <Eye className="w-4 h-4" /> Xem trước
              </button>

              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !title.trim()}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white',
                  saveStatus === 'unsaved' ? 'bg-orange-600 hover:bg-orange-700' :
                  saveStatus === 'error' ? 'bg-rose-600 hover:bg-rose-700' :
                  'bg-primary hover:bg-primary/90',
                  'disabled:opacity-50'
                )}
              >
                {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saveStatus === 'saving' ? 'Đang lưu...' : isEditMode ? 'Cập nhật Module' : 'Tạo Module'}
              </button>

              {isEditMode && (
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 border border-destructive/30 text-destructive rounded-xl hover:bg-destructive/10 font-medium text-sm flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Xoá Module
                </button>
              )}

              <button
                onClick={() => navigate(-1)}
                className="w-full px-4 py-2 border border-border rounded-xl hover:bg-background font-medium text-sm"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library modal */}
      {showLibrary && (
        <LibraryModal
          onClose={() => setShowLibrary(false)}
          onCloned={(newId) => {
            setShowLibrary(false)
            navigate(`/teacher/create-module?id=${newId}`)
          }}
        />
      )}
    </div>
  )
}

/* ──────────────── Sub-components ──────────────── */

// SaveStatusPill — hiển thị trạng thái lưu (mới/đang lưu/đã lưu/chưa lưu/lỗi)
function SaveStatusPill({ status }: { status: SaveStatus }) {
  if (status === 'saved') return <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu</span>
  if (status === 'saving') return <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</span>
  if (status === 'unsaved') return <span className="text-xs text-rose-600 font-medium flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Chưa lưu</span>
  if (status === 'error') return <span className="text-xs text-rose-600 font-medium">Lỗi lưu</span>
  return null
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ChapterRow({ chapter, index, total, isEditing, onEdit, onUpdate, onDelete, onMove }: {
  chapter: ModuleChapter
  index: number
  total: number
  isEditing: boolean
  onEdit: () => void
  onUpdate: (patch: Partial<ModuleChapter>) => void
  onDelete: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-start gap-3 p-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={chapter.title}
              onChange={e => onUpdate({ title: e.target.value })}
              autoFocus
              className="w-full px-2 py-1 border border-primary rounded text-sm font-medium bg-background outline-none"
              placeholder="Tiêu đề chương"
            />
          ) : (
            <button onClick={onEdit} className="text-left w-full">
              <p className="text-sm font-semibold hover:text-primary">{chapter.title}</p>
              {chapter.content && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{chapter.content}</p>}
              {chapter.videoUrl && (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">🎬 {chapter.videoUrl}</p>
              )}
            </button>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onMove('up')} disabled={index === 0} className="p-1.5 hover:bg-muted rounded disabled:opacity-30">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove('down')} disabled={index === total - 1} className="p-1.5 hover:bg-muted rounded disabled:opacity-30">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit} className={cn('p-1.5 rounded text-xs font-medium', isEditing ? 'bg-primary text-white' : 'hover:bg-muted')}>
            {isEditing ? 'Xong' : 'Sửa'}
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {isEditing && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-3">
          <textarea
            value={chapter.content}
            onChange={e => onUpdate({ content: e.target.value })}
            placeholder="Nội dung chương (tóm tắt bài giảng, dàn ý...)"
            rows={3} maxLength={5000}
            className="w-full px-2 py-1.5 border border-border rounded text-xs bg-background outline-none focus:border-primary resize-y"
          />
          <input
            type="text"
            value={chapter.videoUrl}
            onChange={e => onUpdate({ videoUrl: e.target.value })}
            placeholder="Video URL (YouTube/Vimeo/MP4)..."
            maxLength={500}
            className="w-full px-2 py-1.5 border border-border rounded text-xs bg-background outline-none focus:border-primary"
          />
        </div>
      )}
    </div>
  )
}

// PreviewPanel — bản xem trước module khi bật chế độ Preview
function PreviewPanel({ title, description, chapters, audience, visibility, duration, tags, isPublished, onExit }: {
  title: string
  description: string
  chapters: ModuleChapter[]
  audience: ModuleAudience
  visibility: ModuleVisibility
  duration: string
  tags: string[]
  isPublished: boolean
  onExit: () => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
      <button
        onClick={onExit}
        className="mb-6 px-4 py-2 text-sm font-medium bg-secondary rounded-lg hover:bg-secondary/80"
      >
        ← Quay lại chỉnh sửa
      </button>

      <div className="max-w-2xl">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-700">
            {visibility === 'public' ? '🌍 Công khai' : '🔒 Bí mật'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-700">
            {audience === 'students' ? '👨‍🎓 Học sinh' : audience === 'teachers' ? '👩‍🏫 GV khác' : '🌐 Cả hai'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700">
            {isPublished ? '✅ Đã xuất bản' : '📝 Nháp'}
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-2">{title || '(chưa có tên)'}</h1>
        {description && <p className="text-muted-foreground mb-5 text-base leading-relaxed">{description}</p>}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs">
                <Tag className="w-3 h-3" />{t}
              </span>
            ))}
          </div>
        )}

        <div className="bg-muted/50 rounded-xl p-5 mb-6">
          <p className="text-sm font-bold mb-3">📚 Nội dung khoá học ({chapters.length} chương):</p>
          {chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Chưa có chương nào</p>
          ) : (
            <div className="space-y-2">
              {chapters.map((ch, i) => (
                <div key={ch.id} className="p-3 bg-background rounded-lg">
                  <p className="font-medium text-sm">
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {ch.title}
                  </p>
                  {ch.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ch.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Thời lượng</p>
              <p className="text-base font-bold">{duration} giờ</p>
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Chương</p>
              <p className="text-base font-bold">{chapters.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LibraryModal({ onClose, onCloned }: {
  onClose: () => void
  onCloned: (id: string) => void
}) {
  const [items, setItems] = useState<TeacherModule[]>([])
  const [loading, setLoading] = useState(true)
  const [audience, setAudience] = useState<ModuleAudience | ''>('')
  const [q, setQ] = useState('')
  const [cloning, setCloning] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    teacherModuleService.listPublic({
      audience: audience || undefined,
      q: q.trim() || undefined,
    }).then(r => setItems(r.items)).catch(() => setItems([])).finally(() => setLoading(false))
  }, [audience, q])

  useEffect(() => { reload() }, [reload])

  const handleClone = async (id: string) => {
    setCloning(id)
    try {
      const r = await teacherModuleService.clone(id)
      toast.success('Đã clone — chuyển sang chỉnh sửa bản sao')
      onCloned(r.id)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không clone được')
    } finally {
      setCloning(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Library className="w-5 h-5 text-primary" />
            Thư viện Module công khai
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border space-y-2">
          <input
            type="text" value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Tìm theo tiêu đề/mô tả..."
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <div className="flex gap-1.5">
            {(['', 'students', 'teachers', 'both'] as const).map(a => (
              <button
                key={a || 'all'}
                onClick={() => setAudience(a)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold',
                  audience === a ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'
                )}
              >
                {a === '' ? 'Tất cả' : a === 'students' ? 'Cho HS' : a === 'teachers' ? 'Cho GV' : 'Cả hai'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Library className="w-12 h-12 mx-auto mb-2 opacity-30" />
              Chưa có module công khai nào khớp bộ lọc
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map(m => (
                <div key={m.id} className="rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm line-clamp-1">{m.title}</h3>
                      <p className="text-[11px] text-muted-foreground">{m.teacherName || 'GV ẩn danh'}</p>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700">
                      {m.audience === 'students' ? 'HS' : m.audience === 'teachers' ? 'GV' : 'Cả 2'}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground mb-3">
                    <span>📚 {m.chapterCount} chương</span>
                    <span>👁 {m.viewCount}</span>
                    <span>📋 {m.cloneCount}</span>
                  </div>
                  <button
                    onClick={() => handleClone(m.id)}
                    disabled={cloning === m.id}
                    className="w-full px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {cloning === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    Clone về bộ sưu tập của tôi
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
