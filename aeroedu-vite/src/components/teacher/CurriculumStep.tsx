/**
 * CurriculumStep — Mục lục khoá học (Section → Lecture builder, Udemy-style)
 *
 * Step 3/5 trong wizard CourseEditor. Cho phép teacher xây cấu trúc khoá học
 * (chương → bài học) với UX kiểu Udemy: section card có quick-add chip toolbar
 * ở dưới (📹 Bài giảng / 📝 Bài đọc / ❓ Quiz / ✏️ Bài tập / 📐 Đề luyện / 🧪 Lab).
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ⬇ ① Chương 1: Giới thiệu                          3 bài · 24p   │
 *   │ ┌────────────────────────────────────────────────────────────┐  │
 *   │ │ ✓ Bài 1.1 — Tổng quan          📹 Video · 12p   [Asset 3] │  │
 *   │ │ ○ Bài 1.2 — Phương pháp học     📝 Bài đọc · 8p          │  │
 *   │ └────────────────────────────────────────────────────────────┘  │
 *   │ ➕ Thêm:                                                          │
 *   │ [📹 Bài giảng] [❓ Quiz] [✏️ Bài tập] [📐 Đề luyện] [🧪 Lab]    │
 *   └──────────────────────────────────────────────────────────────────┘
 *   [          + Thêm chương mới          ]   ← ghim đáy
 *
 * KHÁC bản cũ: chip toolbar thay form "Thêm bài học" cồng kềnh; chương mới ghim
 * đáy thay vì trên (giống Udemy → kéo xuống = mở rộng). Backend KHÔNG đổi.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderPlus, BookOpen, Plus, Edit3, Trash2,
  ChevronDown, ArrowUp, ArrowDown,
  Clock, Video, FileText, HelpCircle, ClipboardList,
  ChevronLeft, ChevronRight, Check, X, GripVertical,
  Settings, FlaskConical, ScrollText, Sparkles,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  instructorService,
  type CurriculumChapter,
  type CurriculumLesson,
  type LessonType,
} from '@/services/instructor.service'
import { cn } from '@/lib/utils'
import LessonAssetEditor from './LessonAssetEditor'

/* ─── Helpers ────────────────────────────────────────────── */

// Quick-add chips: thứ tự ưu tiên Bài giảng → Quiz → Bài tập → Đề luyện → Lab → Bài đọc.
// `accent` dùng cho hover ring + icon color; `kind` = LessonType + alias đặc biệt.
type ChipKind = LessonType | 'practice-exam' | 'lab'
const QUICK_ADD: { kind: ChipKind; label: string; icon: any; accent: string; tone: string }[] = [
  { kind: 'video',         label: 'Bài giảng',  icon: Video,         accent: '#a855f7', tone: 'purple' },
  { kind: 'quiz',          label: 'Quiz',       icon: HelpCircle,    accent: '#f59e0b', tone: 'amber' },
  { kind: 'assignment',    label: 'Bài tập',    icon: ClipboardList, accent: '#10b981', tone: 'emerald' },
  { kind: 'practice-exam', label: 'Đề luyện',   icon: ScrollText,    accent: '#0ea5e9', tone: 'sky' },
  { kind: 'lab',           label: 'Phòng Lab',  icon: FlaskConical,  accent: '#06b6d4', tone: 'cyan' },
  { kind: 'reading',       label: 'Bài đọc',    icon: FileText,      accent: '#60a5fa', tone: 'blue' },
]

// Icon hiển thị trong lesson row — map ChipKind → icon + màu.
function lessonChipMeta(type: LessonType, isExam?: boolean, isLab?: boolean) {
  if (isExam) return QUICK_ADD.find(q => q.kind === 'practice-exam')!
  if (isLab)  return QUICK_ADD.find(q => q.kind === 'lab')!
  return QUICK_ADD.find(q => q.kind === type) || QUICK_ADD[0]
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
  // Active quick-add chip per chapter: { [chapterId]: ChipKind | null }
  const [activeChip, setActiveChip] = useState<Record<string, ChipKind | null>>({})
  const [lessonForms, setLessonForms] = useState<Record<string, { title: string; duration: string }>>({})
  // Inline edit state
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [editingChapterTitle, setEditingChapterTitle] = useState('')
  const [editingLesson, setEditingLesson] = useState<string | null>(null)
  const [editingLessonTitle, setEditingLessonTitle] = useState('')
  const [editingLessonDuration, setEditingLessonDuration] = useState('')
  // Asset editor modal
  const [assetEditor, setAssetEditor] = useState<{ lessonId: string; lessonTitle: string } | null>(null)

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
      setLessonForms(p => ({ ...p, [vars.chapterId]: { title: '', duration: '' } }))
      setActiveChip(p => ({ ...p, [vars.chapterId]: null }))
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
    const tmp = ids[idx]; ids[idx] = ids[newIdx]; ids[newIdx] = tmp
    reorderChaptersM.mutate(ids)
  }

  function moveLesson(chapter: CurriculumChapter, idx: number, dir: -1 | 1) {
    const newIdx = idx + dir
    const lessons = chapter.lessons || []
    if (newIdx < 0 || newIdx >= lessons.length) return
    const ids = lessons.map(l => l.id)
    const tmp = ids[idx]; ids[idx] = ids[newIdx]; ids[newIdx] = tmp
    reorderLessonsM.mutate({ chapterId: chapter.id, lessonIds: ids })
  }

  function getLessonForm(chapterId: string) {
    return lessonForms[chapterId] || { title: '', duration: '' }
  }
  function updateLessonForm(chapterId: string, patch: Partial<{ title: string; duration: string }>) {
    setLessonForms(p => ({ ...p, [chapterId]: { ...getLessonForm(chapterId), ...patch } }))
  }

  /**
   * Tạo lesson từ chip đang active. Map ChipKind → { LessonType backend, tagged title }:
   *   practice-exam → assignment + title prefix [Đề luyện]
   *   lab           → assignment + title prefix [Lab]
   * Sau khi tạo, click "Asset" để gắn nội dung thật (file đề / link lab).
   */
  function submitLessonForm(chapterId: string) {
    const chip = activeChip[chapterId]
    if (!chip) return
    const f = getLessonForm(chapterId)
    const titleRaw = f.title.trim()
    if (!titleRaw) { toast.error('Thiếu tiêu đề bài học'); return }
    let backendType: LessonType = 'video'
    let title = titleRaw
    if (chip === 'practice-exam') { backendType = 'assignment'; title = titleRaw.startsWith('[Đề luyện]') ? titleRaw : `[Đề luyện] ${titleRaw}` }
    else if (chip === 'lab')      { backendType = 'assignment'; title = titleRaw.startsWith('[Lab]') ? titleRaw : `[Lab] ${titleRaw}` }
    else                          { backendType = chip as LessonType }
    createLessonM.mutate({
      chapterId,
      data: {
        title,
        duration: f.duration ? parseInt(f.duration, 10) : undefined,
        type: backendType,
      },
    })
  }

  function openChip(chapterId: string, chip: ChipKind) {
    setActiveChip(p => ({ ...p, [chapterId]: chip }))
    // Reset form mỗi lần đổi loại
    setLessonForms(p => ({ ...p, [chapterId]: { title: '', duration: '' } }))
    // Tự mở chương nếu đang đóng
    setExpanded(p => ({ ...p, [chapterId]: true }))
  }

  function closeChip(chapterId: string) {
    setActiveChip(p => ({ ...p, [chapterId]: null }))
  }

  /* ── Render ── */
  return (
    <div className="space-y-5">
      {/* Header banner — concise Udemy-style intro */}
      <div className="rounded-xl bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border border-purple-500/20 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white mb-1">Mục lục khoá học</h3>
            <p className="text-xs text-gray-300/80 leading-relaxed">
              Xây dựng cấu trúc khoá học theo chương → bài giảng. Mỗi chương có thanh công cụ nhanh ở dưới —
              chọn loại bài muốn thêm (📹 Bài giảng · ❓ Quiz · ✏️ Bài tập · 📐 Đề luyện · 🧪 Lab · 📝 Bài đọc).
            </p>
          </div>
          {chapters.length > 0 && (
            <div className="hidden md:flex items-center gap-3 text-xs text-gray-300 self-center pr-1">
              <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-purple-300" /><b className="text-white">{chapters.length}</b> chương</span>
              <span className="text-gray-500">·</span>
              <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-blue-300" /><b className="text-white">{totalLessons}</b> bài</span>
              <span className="text-gray-500">·</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-300" /><b className="text-white">{formatTotalDuration(totalDuration)}</b></span>
            </div>
          )}
        </div>
      </div>

      {/* ── Section list ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : chapters.length === 0 && !showChapterForm ? (
        <div className="rounded-2xl bg-white/[0.04] border border-dashed border-white/15 p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-purple-300" />
          </div>
          <div>
            <p className="text-white font-semibold mb-1">Bắt đầu xây mục lục khoá học</p>
            <p className="text-gray-400 text-sm">Tạo chương đầu tiên — sau đó thêm bài giảng, quiz, bài tập, đề luyện hoặc phòng lab.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowChapterForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
          >
            <FolderPlus className="w-4 h-4" /> Tạo chương đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter, chIdx) => {
            const isOpen = expanded[chapter.id] !== false  // default open
            const lessons = chapter.lessons || []
            const lessonForm = getLessonForm(chapter.id)
            const chip = activeChip[chapter.id] || null
            const chipMeta = chip ? QUICK_ADD.find(q => q.kind === chip) : null
            const chapterDuration = lessons.reduce((s, l) => s + (l.duration || 0), 0)
            return (
              <div key={chapter.id} className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden transition-colors hover:border-white/20">
                {/* ── Section header ── */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => toggleExpand(chapter.id)}
                    className="flex-shrink-0 w-7 h-7 rounded-md hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                    title={isOpen ? 'Thu gọn' : 'Mở rộng'}
                  >
                    <ChevronDown className={cn('w-4 h-4 transition-transform', !isOpen && '-rotate-90')} />
                  </button>

                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/25 text-purple-200 text-xs font-bold flex items-center justify-center">
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
                      className="flex-1 min-w-0 px-2 py-1.5 rounded bg-white/10 border border-purple-500/50 text-sm text-white outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditChapter(chapter)}
                      className="flex-1 min-w-0 text-left group/title"
                      title="Click để đổi tên chương"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold hidden sm:inline">Chương {chIdx + 1}:</span>
                        <p className="text-sm font-semibold text-white truncate group-hover/title:text-purple-300 transition-colors">
                          {chapter.title}
                        </p>
                      </div>
                      {chapter.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{chapter.description}</p>
                      )}
                    </button>
                  )}

                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                    <span>{lessons.length} bài</span>
                    {chapterDuration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTotalDuration(chapterDuration)}
                      </span>
                    )}
                  </div>

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

                {/* ── Section body: lessons + quick-add toolbar ── */}
                {isOpen && (
                  <div className="px-4 py-3 space-y-1.5">
                    {lessons.length === 0 && !chip && (
                      <div className="rounded-lg bg-blue-500/[0.06] border border-blue-500/25 px-3 py-2.5 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-300 flex-shrink-0" />
                        <p className="text-xs text-blue-200/90 flex-1">
                          Chương chưa có bài học — chọn loại bên dưới (📹 Bài giảng / ❓ Quiz / ✏️ Bài tập / 📐 Đề luyện / 🧪 Lab) để thêm.
                        </p>
                      </div>
                    )}

                    {lessons.map((lesson, lIdx) => {
                      const isExam = lesson.title.startsWith('[Đề luyện]')
                      const isLab  = lesson.title.startsWith('[Lab]')
                      const meta = lessonChipMeta(lesson.type, isExam, isLab)
                      const Icon = meta.icon
                      const displayTitle = isExam ? lesson.title.replace(/^\[Đề luyện\]\s*/, '')
                                         : isLab  ? lesson.title.replace(/^\[Lab\]\s*/, '')
                                         : lesson.title
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/15 border border-white/[0.06] hover:border-white/15 transition-colors group"
                        >
                          <GripVertical className="w-3 h-3 text-gray-700 flex-shrink-0" />
                          <span className="flex-shrink-0 w-9 text-[10px] text-gray-500 font-mono">
                            {chIdx + 1}.{lIdx + 1}
                          </span>
                          <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${meta.accent}22` }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: meta.accent }} />
                          </span>
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
                                  {displayTitle}
                                </span>
                              </button>
                              {lesson.duration ? (
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                                  <Clock className="w-2.5 h-2.5" />
                                  {lesson.duration}p
                                </span>
                              ) : null}
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full hidden sm:block flex-shrink-0 font-medium"
                                style={{ background: `${meta.accent}1f`, color: meta.accent }}
                              >
                                {meta.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => setAssetEditor({ lessonId: lesson.id, lessonTitle: lesson.title })}
                                className={cn(
                                  'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all flex-shrink-0',
                                  (lesson.blockCount ?? 0) > 0
                                    ? 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/30'
                                    : 'opacity-0 group-hover:opacity-100 bg-white/5 text-gray-400 hover:bg-purple-500/20 hover:text-purple-200'
                                )}
                                title="Quản lý nội dung của bài học (video/PDF/text/quiz...)"
                              >
                                <Settings className="w-3 h-3" />
                                Nội dung
                                {(lesson.blockCount ?? 0) > 0 && (
                                  <span className="ml-0.5 px-1 rounded-full bg-purple-600/40 text-purple-100 font-bold">
                                    {lesson.blockCount}
                                  </span>
                                )}
                              </button>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button type="button" onClick={() => moveLesson(chapter, lIdx, -1)} disabled={lIdx === 0} className="w-6 h-6 rounded hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white" title="Lên"><ArrowUp className="w-3 h-3" /></button>
                                <button type="button" onClick={() => moveLesson(chapter, lIdx, 1)} disabled={lIdx === lessons.length - 1} className="w-6 h-6 rounded hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 hover:text-white" title="Xuống"><ArrowDown className="w-3 h-3" /></button>
                                <button type="button" onClick={() => startEditLesson(lesson)} className="w-6 h-6 rounded hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400" title="Sửa"><Edit3 className="w-3 h-3" /></button>
                                <button type="button" onClick={() => { if (window.confirm(`Xoá bài học "${lesson.title}"?`)) deleteLessonM.mutate(lesson.id) }} className="w-6 h-6 rounded hover:bg-red-500/20 flex items-center justify-center text-red-400" title="Xoá"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* ── Inline form khi 1 chip đang active ── */}
                    {chip && chipMeta && (
                      <div
                        className="rounded-lg border-2 border-dashed p-3 space-y-2 transition-colors"
                        style={{ borderColor: `${chipMeta.accent}66`, background: `${chipMeta.accent}10` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <chipMeta.icon className="w-4 h-4" style={{ color: chipMeta.accent }} />
                            <span className="text-xs font-semibold" style={{ color: chipMeta.accent }}>
                              Thêm {chipMeta.label}
                              {chip === 'practice-exam' && <span className="ml-1 text-[10px] opacity-70">(gắn đề ở bước Nội dung)</span>}
                              {chip === 'lab'           && <span className="ml-1 text-[10px] opacity-70">(gắn link Lab ở bước Nội dung)</span>}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => closeChip(chapter.id)}
                            className="w-6 h-6 rounded hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center"
                            title="Đóng"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-12 gap-2">
                          <input
                            autoFocus
                            value={lessonForm.title}
                            onChange={(e) => updateLessonForm(chapter.id, { title: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && lessonForm.title.trim()) submitLessonForm(chapter.id)
                              if (e.key === 'Escape') closeChip(chapter.id)
                            }}
                            placeholder={`Tiêu đề ${chipMeta.label.toLowerCase()}…`}
                            className="sm:col-span-9 rounded-lg bg-white/5 border border-white/10 focus:border-white/30 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                          />
                          <input
                            type="number"
                            min={0}
                            value={lessonForm.duration}
                            onChange={(e) => updateLessonForm(chapter.id, { duration: e.target.value })}
                            placeholder="Thời lượng (phút)"
                            className="sm:col-span-3 rounded-lg bg-white/5 border border-white/10 focus:border-white/30 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => closeChip(chapter.id)}
                            className="px-3 py-1.5 rounded-lg border border-white/15 text-gray-400 text-xs hover:border-white/30 transition-colors"
                          >
                            Huỷ
                          </button>
                          <button
                            type="button"
                            disabled={!lessonForm.title.trim() || createLessonM.isPending}
                            onClick={() => submitLessonForm(chapter.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ background: chipMeta.accent }}
                          >
                            <Plus className="w-3 h-3" />
                            {createLessonM.isPending ? 'Đang thêm…' : `Thêm ${chipMeta.label}`}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Quick-add chip toolbar (Udemy-style) ── */}
                    <div className="pt-2 mt-1 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-medium text-gray-400 pl-1 pr-1">➕ Thêm:</span>
                      {QUICK_ADD.map(q => {
                        const Icon = q.icon
                        const active = chip === q.kind
                        return (
                          <button
                            key={q.kind}
                            type="button"
                            onClick={() => (active ? closeChip(chapter.id) : openChip(chapter.id, q.kind))}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all',
                              active
                                ? 'text-white shadow-sm'
                                : 'text-gray-300 border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.06]',
                            )}
                            style={active ? { background: q.accent, borderColor: q.accent } : undefined}
                            title={`Thêm ${q.label}`}
                          >
                            <Icon className="w-3.5 h-3.5" style={!active ? { color: q.accent } : undefined} />
                            {q.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* ── + Thêm chương — ghim ĐÁY danh sách (Udemy pattern) ── */}
          {!showChapterForm ? (
            <button
              type="button"
              onClick={() => setShowChapterForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5 text-purple-300 text-sm font-semibold transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Thêm chương mới
            </button>
          ) : (
            <div className="rounded-2xl bg-purple-900/20 border border-purple-500/30 p-4 space-y-3">
              <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                <FolderPlus className="w-4 h-4" /> Thêm chương mới
              </h4>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Tiêu đề chương <span className="text-red-400">*</span></label>
                <input
                  autoFocus
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChapterTitle.trim()) createChapterM.mutate({ title: newChapterTitle, description: newChapterDesc })
                    if (e.key === 'Escape') setShowChapterForm(false)
                  }}
                  placeholder="VD: Chương 1 — Giới thiệu Vật lí 11"
                  className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Mô tả ngắn (tuỳ chọn)</label>
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
        </div>
      )}

      {/* ── Bottom nav ── */}
      <div className="flex justify-between pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-7 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
        >
          Tiếp theo <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Asset editor modal */}
      {assetEditor && (
        <LessonAssetEditor
          open
          courseId={courseId}
          lessonId={assetEditor.lessonId}
          lessonTitle={assetEditor.lessonTitle}
          onClose={() => setAssetEditor(null)}
        />
      )}
    </div>
  )
}
