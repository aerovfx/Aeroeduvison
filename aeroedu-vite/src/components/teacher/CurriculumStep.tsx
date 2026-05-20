/**
 * CurriculumStep — Mục lục khoá học (Chapter → Lesson builder)
 *
 * Step 3/6 trong wizard CourseEditor. Cho phép teacher xây cấu trúc
 * khoá học (chương → bài học) TRƯỚC khi thêm video.
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ 📚 Mục lục khoá học                                 │
 *   │ [+ Thêm chương mới]                                  │
 *   │                                                       │
 *   │ ▼ Chương 1: Giới thiệu                  [edit][del] │
 *   │   ├─ 1.1 Tổng quan                       [edit][del]│
 *   │   ├─ 1.2 Phương pháp học                 [edit][del]│
 *   │   └─ [+ Thêm bài học]                                │
 *   │                                                       │
 *   │ ─── Tổng: 3 chương · 12 bài · ~6h ───                │
 *   └─────────────────────────────────────────────────────┘
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderPlus, BookOpen, Plus, Edit3, Trash2,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Save,
  Clock, Video, FileText, HelpCircle, ClipboardList,
  ChevronLeft, ChevronRight, Check, X, GripVertical,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  instructorService,
  type CurriculumChapter,
  type CurriculumLesson,
  type LessonType,
} from '@/services/instructor.service'
import { cn } from '@/lib/utils'

/* ─── Helpers ────────────────────────────────────────────── */
const LESSON_TYPES: { value: LessonType; label: string; icon: any; color: string }[] = [
  { value: 'video',      label: 'Video',      icon: Video,         color: 'text-purple-400' },
  { value: 'reading',    label: 'Bài đọc',    icon: FileText,      color: 'text-blue-400'   },
  { value: 'quiz',       label: 'Quiz',       icon: HelpCircle,    color: 'text-amber-400'  },
  { value: 'assignment', label: 'Bài tập',    icon: ClipboardList, color: 'text-emerald-400'},
]

function getLessonIcon(type: LessonType) {
  return LESSON_TYPES.find(t => t.value === type) || LESSON_TYPES[0]
}

function formatTotalDuration(mins: number): string {
  if (!mins || mins <= 0) return '0 phút'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} phút`
  if (m === 0) return `${h} giờ`
  return `${h}h ${m}m`
}

/* ─── Main component ─────────────────────────────────────── */
interface CurriculumStepProps {
  courseId: string
  onBack: () => void
  onNext: () => void
}

export default function CurriculumStep({ courseId, onBack, onNext }: CurriculumStepProps) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [showChapterForm, setShowChapterForm] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [newChapterDesc, setNewChapterDesc] = useState('')
  // Lesson form state — keyed by chapterId
  const [lessonForms, setLessonForms] = useState<Record<string, {
    title: string; duration: string; type: LessonType; description: string
  }>>({})
  // Inline edit state — keyed by chapter/lesson id
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [editingChapterTitle, setEditingChapterTitle] = useState('')
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [editingLessonTitle, setEditingLessonTitle] = useState('')
  const [editingLessonDuration, setEditingLessonDuration] = useState('')

  /* ── Data ── */
  const { data: chapters = [], isLoading } = useQuery({
    queryKey: ['curriculum', courseId],
    queryFn: () => instructorService.getCurriculum(courseId),
  })

  /* ── Stats ── */
  const totalLessons = chapters.reduce((s, c) => s + (c.lessons?.length || 0), 0)
  const totalDuration = chapters.reduce(
    (s, c) => s + (c.lessons || []).reduce((ss, l) => ss + (l.duration || 0), 0),
    0
  )

  /* ── Mutations ── */
  const createChapterM = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      instructorService.createChapter(courseId, {
        title: data.title.trim(),
        description: data.description.trim() || null,
      }),
    onSuccess: (ch) => {
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      toast.success('Đã thêm chương')
      setShowChapterForm(false)
      setNewChapterTitle('')
      setNewChapterDesc('')
      // Auto-expand the new chapter
      setExpanded(prev => ({ ...prev, [ch.id]: true }))
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi tạo chương'),
  })

  const updateChapterM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; description?: string | null } }) =>
      instructorService.updateChapter(courseId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      setEditingChapter(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi cập nhật'),
  })

  const deleteChapterM = useMutation({
    mutationFn: (id: string) => instructorService.deleteChapter(courseId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      toast.success('Đã xoá chương')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi xoá'),
  })

  const createLessonM = useMutation({
    mutationFn: ({ chapterId, data }: { chapterId: string; data: {
      title: string; duration?: number; type: LessonType; description?: string
    }}) => instructorService.createLesson(courseId, chapterId, data),
    onSuccess: (_l, vars) => {
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      toast.success('Đã thêm bài học')
      // Reset form for this chapter
      setLessonForms(p => ({ ...p, [vars.chapterId]: { title: '', duration: '', type: 'video', description: '' }}))
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi tạo bài học'),
  })

  const updateLessonM = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; duration?: number | null } }) =>
      instructorService.updateLesson(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      setEditingLesson(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi cập nhật'),
  })

  const deleteLessonM = useMutation({
    mutationFn: (id: string) => instructorService.deleteLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum', courseId] })
      toast.success('Đã xoá bài học')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi xoá'),
  })

  const reorderChaptersM = useMutation({
    mutationFn: (chapterIds: string[]) => instructorService.reorderChapters(courseId, chapterIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curriculum', courseId] }),
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi sắp xếp'),
  })

  const reorderLessonsM = useMutation({
    mutationFn: ({ chapterId, lessonIds }: { chapterId: string; lessonIds: string[] }) =>
      instructorService.reorderLessons(courseId, chapterId, lessonIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curriculum', courseId] }),
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Lỗi sắp xếp'),
  })

  /* ── Actions ── */
  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function startEditChapter(ch: CurriculumChapter) {
    setEditingChapter(ch.id)
    setEditingChapterTitle(ch.title)
  }
  function saveEditChapter() {
    if (!editingChapter) return
    const title = editingChapterTitle.trim()
    if (!title) { toast.error('Tiêu đề không được trống'); return }
    updateChapterM.mutate({ id: editingChapter, data: { title } })
  }

  function startEditLesson(l: CurriculumLesson) {
    setEditingLesson(l.id)
    setEditingLessonTitle(l.title)
    setEditingLessonDuration(String(l.duration || ''))
  }
  function saveEditLesson() {
    if (!editingLesson) return
    const title = editingLessonTitle.trim()
    if (!title) { toast.error('Tiêu đề không được trống'); return }
    const duration = editingLessonDuration ? Math.max(0, parseInt(editingLessonDuration, 10) || 0) : null
    updateLessonM.mutate({ id: editingLesson, data: { title, duration } })
  }

  function moveChapter(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= chapters.length) return
    const ids = chapters.map(c => c.id)
    const tmp = ids[idx]
    ids[idx] = ids[newIdx]
    ids[newIdx] = tmp
    reorderChaptersM.mutate(ids)
  }

  function moveLesson(chapter: CurriculumChapter, idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    const lessons = chapter.lessons || []
    if (newIdx < 0 || newIdx >= lessons.length) return
    const ids = lessons.map(l => l.id)
    const tmp = ids[idx]
    ids[idx] = ids[newIdx]
    ids[newIdx] = tmp
    reorderLessonsM.mutate({ chapterId: chapter.id, lessonIds: ids })
  }

  function getLessonForm(chapterId: string) {
    return lessonForms[chapterId] || { title: '', duration: '', type: 'video' as LessonType, description: '' }
  }
  function updateLessonForm(chapterId: string, patch: Partial<typeof lessonForms[string]>) {
    setLessonForms(p => ({
      ...p,
      [chapterId]: { ...getLessonForm(chapterId), ...patch },
    }))
  }
  function submitLessonForm(chapterId: string) {
    const f = getLessonForm(chapterId)
    if (!f.title.trim()) { toast.error('Thiếu tiêu đề bài học'); return }
    createLessonM.mutate({
      chapterId,
      data: {
        title: f.title,
        duration: f.duration ? parseInt(f.duration, 10) : undefined,
        type: f.type,
        description: f.description || undefined,
      },
    })
  }

  /* ── Render ── */
  return (
    <div className="space-y-5">
      {/* Header / intro */}
      <div className="rounded-xl bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border border-purple-500/20 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white mb-1">Mục lục khoá học</h3>
            <p className="text-xs text-gray-300/80 leading-relaxed">
              Thiết kế cấu trúc khoá học trước khi thêm video. Mỗi chương gồm nhiều bài học (video, bài đọc, quiz, bài tập).
              Cấu trúc rõ ràng giúp học viên theo dõi tiến trình tốt hơn.
            </p>
          </div>
        </div>
      </div>

      {/* + Thêm chương button + form */}
      {!showChapterForm ? (
        <button
          type="button"
          onClick={() => setShowChapterForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 text-purple-300 text-sm font-medium transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          Thêm chương mới
        </button>
      ) : (
        <div className="rounded-xl bg-purple-900/20 border border-purple-500/30 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
            <FolderPlus className="w-4 h-4" />
            Thêm chương mới
          </h4>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Tiêu đề chương <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newChapterTitle.trim()) {
                  createChapterM.mutate({ title: newChapterTitle, description: newChapterDesc })
                }
                if (e.key === 'Escape') setShowChapterForm(false)
              }}
              placeholder="VD: Chương 1 — Giới thiệu Vật lý 11"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Mô tả ngắn (tuỳ chọn)
            </label>
            <textarea
              value={newChapterDesc}
              onChange={(e) => setNewChapterDesc(e.target.value)}
              rows={2}
              placeholder="Học viên sẽ học gì trong chương này?"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors resize-y"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowChapterForm(false); setNewChapterTitle(''); setNewChapterDesc('') }}
              className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 text-sm hover:border-white/40 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={!newChapterTitle.trim() || createChapterM.isPending}
              onClick={() => createChapterM.mutate({ title: newChapterTitle, description: newChapterDesc })}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {createChapterM.isPending ? 'Đang tạo...' : 'Tạo chương'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : chapters.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-dashed border-white/10 p-10 flex flex-col items-center gap-3 text-center">
          <BookOpen className="w-10 h-10 text-gray-600" />
          <p className="text-gray-400 text-sm">Chưa có chương nào. Tạo chương đầu tiên để bắt đầu xây dựng mục lục.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, chIdx) => {
            const isOpen = expanded[chapter.id] !== false  // default open
            const lessons = chapter.lessons || []
            const lessonForm = getLessonForm(chapter.id)
            const chapterDuration = lessons.reduce((s, l) => s + (l.duration || 0), 0)
            return (
              <div key={chapter.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden transition-colors hover:border-white/20">
                {/* Chapter header */}
                <div className="flex items-center gap-2 px-3 py-3 bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => toggleExpand(chapter.id)}
                    className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title={isOpen ? 'Thu gọn' : 'Mở rộng'}
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4 rotate-180" />}
                  </button>

                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center">
                    {chIdx + 1}
                  </span>

                  {editingChapter === chapter.id ? (
                    <input
                      autoFocus
                      value={editingChapterTitle}
                      onChange={(e) => setEditingChapterTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditChapter()
                        if (e.key === 'Escape') setEditingChapter(null)
                      }}
                      onBlur={saveEditChapter}
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-white/10 border border-purple-500/50 text-sm text-white outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditChapter(chapter)}
                      className="flex-1 min-w-0 text-left group/title"
                      title="Click để đổi tên chương"
                    >
                      <p className="text-sm font-medium text-white truncate group-hover/title:text-purple-300 transition-colors">
                        {chapter.title}
                      </p>
                      {chapter.description && (
                        <p className="text-xs text-gray-500 truncate">{chapter.description}</p>
                      )}
                    </button>
                  )}

                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                    <span className="hidden sm:inline">{lessons.length} bài</span>
                    {chapterDuration > 0 && (
                      <span className="hidden sm:flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTotalDuration(chapterDuration)}
                      </span>
                    )}
                  </div>

                  {/* Reorder buttons */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveChapter(chIdx, -1)}
                      disabled={chIdx === 0 || reorderChaptersM.isPending}
                      className="w-7 h-7 rounded-lg hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      title="Lên"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveChapter(chIdx, 1)}
                      disabled={chIdx === chapters.length - 1 || reorderChaptersM.isPending}
                      className="w-7 h-7 rounded-lg hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      title="Xuống"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditChapter(chapter)}
                      className="w-7 h-7 rounded-lg hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400 transition-colors"
                      title="Đổi tên"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(
                          `Xoá chương "${chapter.title}"?\n${lessons.length > 0 ? `⚠ Sẽ xoá theo ${lessons.length} bài học bên trong!` : ''}`
                        )) {
                          deleteChapterM.mutate(chapter.id)
                        }
                      }}
                      className="w-7 h-7 rounded-lg hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                      title="Xoá chương"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Lessons + form */}
                {isOpen && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {lessons.map((lesson, lIdx) => {
                      const lt = getLessonIcon(lesson.type)
                      const Icon = lt.icon
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 px-3 py-2 ml-7 rounded-lg bg-black/20 border border-white/[0.06] hover:border-white/15 transition-colors group"
                        >
                          <GripVertical className="w-3 h-3 text-gray-700 flex-shrink-0" />
                          <span className="flex-shrink-0 w-6 text-[10px] text-gray-500 font-mono">
                            {chIdx + 1}.{lIdx + 1}
                          </span>
                          <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', lt.color)} />
                          {editingLesson === lesson.id ? (
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <input
                                autoFocus
                                value={editingLessonTitle}
                                onChange={(e) => setEditingLessonTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditLesson()
                                  if (e.key === 'Escape') setEditingLesson(null)
                                }}
                                className="flex-1 min-w-0 px-2 py-1 rounded bg-white/10 border border-purple-500/50 text-xs text-white outline-none"
                              />
                              <input
                                type="number"
                                min={0}
                                value={editingLessonDuration}
                                onChange={(e) => setEditingLessonDuration(e.target.value)}
                                placeholder="phút"
                                className="w-16 px-2 py-1 rounded bg-white/10 border border-purple-500/50 text-xs text-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={saveEditLesson}
                                className="w-6 h-6 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center justify-center"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLesson(null)}
                                className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-gray-400 flex items-center justify-center"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditLesson(lesson)}
                                className="flex-1 min-w-0 text-left"
                                title="Click để đổi tên"
                              >
                                <span className="text-xs text-white truncate block hover:text-purple-300 transition-colors">
                                  {lesson.title}
                                </span>
                              </button>
                              {lesson.duration ? (
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                                  <Clock className="w-2.5 h-2.5" />
                                  {lesson.duration}p
                                </span>
                              ) : null}
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full hidden sm:block flex-shrink-0', lt.color, 'bg-white/5')}>
                                {lt.label}
                              </span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveLesson(chapter, lIdx, -1)}
                                  disabled={lIdx === 0}
                                  className="w-6 h-6 rounded hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white"
                                  title="Lên"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveLesson(chapter, lIdx, 1)}
                                  disabled={lIdx === lessons.length - 1}
                                  className="w-6 h-6 rounded hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white"
                                  title="Xuống"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEditLesson(lesson)}
                                  className="w-6 h-6 rounded hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400"
                                  title="Sửa"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Xoá bài học "${lesson.title}"?`)) {
                                      deleteLessonM.mutate(lesson.id)
                                    }
                                  }}
                                  className="w-6 h-6 rounded hover:bg-red-500/20 flex items-center justify-center text-red-400"
                                  title="Xoá"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Inline add-lesson form */}
                    <div className="ml-7 rounded-lg bg-purple-500/5 border border-dashed border-purple-500/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                        <span className="text-xs font-medium text-purple-300">Thêm bài học vào chương này</span>
                      </div>
                      <div className="grid sm:grid-cols-12 gap-2">
                        <input
                          value={lessonForm.title}
                          onChange={(e) => updateLessonForm(chapter.id, { title: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && lessonForm.title.trim()) submitLessonForm(chapter.id)
                          }}
                          placeholder="Tiêu đề bài học"
                          className="sm:col-span-6 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                        />
                        <select
                          value={lessonForm.type}
                          onChange={(e) => updateLessonForm(chapter.id, { type: e.target.value as LessonType })}
                          className="sm:col-span-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-xs text-white outline-none transition-colors"
                        >
                          {LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input
                          type="number"
                          min={0}
                          value={lessonForm.duration}
                          onChange={(e) => updateLessonForm(chapter.id, { duration: e.target.value })}
                          placeholder="Thời lượng (phút)"
                          className="sm:col-span-3 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!lessonForm.title.trim() || createLessonM.isPending}
                          onClick={() => submitLessonForm(chapter.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {createLessonM.isPending ? 'Đang thêm...' : 'Thêm bài học'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Stats footer */}
      {chapters.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-white/5 via-purple-500/5 to-white/5 border border-white/10 px-4 py-3 flex items-center justify-center gap-6 text-xs text-gray-300">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span><b className="text-white">{chapters.length}</b> chương</span>
          </div>
          <span className="text-gray-700">·</span>
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span><b className="text-white">{totalLessons}</b> bài học</span>
          </div>
          <span className="text-gray-700">·</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tổng <b className="text-white">{formatTotalDuration(totalDuration)}</b></span>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex justify-between pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="flex gap-2">
          {chapters.length > 0 && (
            <button
              type="button"
              onClick={() => toast.success('Mục lục đã lưu (auto-save khi tạo/sửa)')}
              className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 text-sm transition-colors"
              title="Mục lục đã được auto-save khi bạn tạo/sửa"
            >
              <Save className="w-4 h-4" /> Đã lưu
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="flex items-center gap-2 px-7 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
          >
            Tiếp theo <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
