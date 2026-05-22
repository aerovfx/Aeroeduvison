/**
 * AssignmentWorkspace — Không gian làm bài tập cho học sinh
 * Route: /dashboard/assignments/:id
 *
 * 3 tabs:
 *   1. Soạn thảo — Word processor với contentEditable, auto-save localStorage
 *   2. Bản trình chiếu — Slide builder 16:9, màu nền preset, auto-save localStorage
 *   3. Nộp bài — Text submission + file dropzone + POST /api/assignments/:id/submit
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, ChevronLeft, ChevronRight, Plus, Trash2,
  Upload, FileText, CheckCircle2, Loader2, Clock, BookOpen, User,
  Save, AlertCircle,
} from 'lucide-react'
import { assignmentsService } from '@/services/assignments.service'
import type { Assignment } from '@/services/assignments.service'

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'editor' | 'slides' | 'submit'

interface Slide {
  id: string
  title: string
  body: string
  bg: string
}

interface Draft {
  editorHtml: string
  slides: Slide[]
  savedAt: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const SLIDE_COLORS = [
  '#1e1b4b', '#0f172a', '#1e3a5f', '#14532d', '#4a1942',
  '#1c1917', '#431407', '#1a1a1a', '#0c4a6e', '#064e3b',
]

const genId = () => Math.random().toString(36).slice(2, 9)

const defaultSlide = (): Slide => ({
  id: genId(), title: 'Tiêu đề slide', body: 'Nội dung trình bày...', bg: '#1e1b4b',
})

const DEMO_ASSIGNMENT: Assignment = {
  id: 'demo',
  title: 'Soạn bài: Chuyển động thẳng đều',
  subject: 'Vật lý',
  type: 'lesson',
  status: 'in-progress',
  difficulty: 'medium',
  duration: 60,
  xpReward: 150,
  assignedAt: '2026-05-20',
  dueDate: '2026-05-27',
  description: 'Soạn bài và trình bày về chuyển động thẳng đều, các công thức tính toán và ví dụ thực tế.',
  tags: ['vật lý', 'kinematics'],
  progress: 30,
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function ToolBtn({ onClick, title, children }: {
  onClick: () => void; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded text-white/50 hover:text-white/90 hover:bg-white/[0.08] transition-all text-sm font-medium"
    >
      {children}
    </button>
  )
}

// ── Tab 1: Word Editor ────────────────────────────────────────────────────────
function EditorTab({ assignmentId }: { assignmentId: string }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState('14')
  const [saved, setSaved] = useState(true)

  // Load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(`assignment-draft-${assignmentId}`)
    if (raw) {
      try {
        const d: Draft = JSON.parse(raw)
        if (editorRef.current && d.editorHtml) {
          editorRef.current.innerHTML = d.editorHtml
        }
      } catch { /* ignore parse errors */ }
    }
  }, [assignmentId])

  const saveNow = useCallback(() => {
    if (!editorRef.current) return
    const raw = localStorage.getItem(`assignment-draft-${assignmentId}`)
    let draft: Draft = { editorHtml: '', slides: [defaultSlide()], savedAt: new Date().toISOString() }
    if (raw) { try { draft = JSON.parse(raw) } catch { /* ignore */ } }
    draft.editorHtml = editorRef.current.innerHTML
    draft.savedAt = new Date().toISOString()
    localStorage.setItem(`assignment-draft-${assignmentId}`, JSON.stringify(draft))
    setSaved(true)
  }, [assignmentId])

  // Auto-save every 5s
  useEffect(() => {
    const t = setInterval(saveNow, 5000)
    return () => clearInterval(t)
  }, [saveNow])

  const handleInput = () => setSaved(false)

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02] flex-wrap">
        <ToolBtn onClick={() => exec('bold')} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Underline (Ctrl+U)">
          <Underline className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-white/[0.08] mx-1" />
        <ToolBtn onClick={() => exec('formatBlock', 'h1')} title="Heading 1">
          <span className="font-bold text-xs">H1</span>
        </ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'h2')} title="Heading 2">
          <span className="font-bold text-xs">H2</span>
        </ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'p')} title="Đoạn văn">
          <span className="text-xs">P</span>
        </ToolBtn>
        <div className="w-px h-5 bg-white/[0.08] mx-1" />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="Danh sách dấu chấm">
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="Danh sách đánh số">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-white/[0.08] mx-1" />
        <ToolBtn onClick={() => exec('justifyLeft')} title="Căn trái">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="Căn giữa">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec('justifyRight')} title="Căn phải">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-white/[0.08] mx-1" />
        <select
          value={fontSize}
          onChange={(e) => { setFontSize(e.target.value); exec('fontSize', e.target.value) }}
          className="h-7 px-1.5 rounded text-xs bg-white/[0.04] border border-white/[0.08] text-white/60 outline-none"
        >
          {['10','12','14','16','18','20','24','28','32','36','48'].map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
        <div className="flex-1" />
        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-[0.65rem]">
          {saved ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500/70">Đã lưu</span></>
          ) : (
            <><Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" /><span className="text-white/30">Đang lưu...</span></>
          )}
        </div>
        <button
          type="button"
          onClick={saveNow}
          className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition-all"
        >
          <Save className="w-3 h-3" />Lưu
        </button>
      </div>

      {/* Paper area */}
      <div className="flex-1 overflow-y-auto bg-[hsl(220,15%,12%)] py-8 px-4 flex justify-center">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="
            w-full max-w-[210mm] min-h-[297mm]
            bg-white dark:bg-[hsl(0,0%,13%)]
            shadow-[0_4px_32px_rgba(0,0,0,0.4)]
            rounded-sm px-[25mm] py-[20mm]
            text-gray-900 dark:text-white/85
            text-sm leading-7
            outline-none
            focus:ring-2 focus:ring-indigo-500/20
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3
            [&_p]:mb-2
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
          "
          style={{ caretColor: '#818cf8' }}
          data-placeholder="Bắt đầu soạn thảo bài làm của bạn..."
        />
      </div>
    </div>
  )
}

// ── Tab 2: Slides ─────────────────────────────────────────────────────────────
function SlidesTab({ assignmentId }: { assignmentId: string }) {
  const [slides, setSlides] = useState<Slide[]>([defaultSlide()])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [saved, setSaved] = useState(true)

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(`assignment-draft-${assignmentId}`)
    if (raw) {
      try {
        const d: Draft = JSON.parse(raw)
        if (d.slides && d.slides.length > 0) {
          setSlides(d.slides)
        }
      } catch { /* ignore */ }
    }
  }, [assignmentId])

  const saveSlides = useCallback((updated: Slide[]) => {
    const raw = localStorage.getItem(`assignment-draft-${assignmentId}`)
    let draft: Draft = { editorHtml: '', slides: updated, savedAt: new Date().toISOString() }
    if (raw) { try { draft = JSON.parse(raw) } catch { /* ignore */ } }
    draft.slides = updated
    draft.savedAt = new Date().toISOString()
    localStorage.setItem(`assignment-draft-${assignmentId}`, JSON.stringify(draft))
    setSaved(true)
  }, [assignmentId])

  // Auto-save every 5s
  useEffect(() => {
    const t = setInterval(() => { if (!saved) saveSlides(slides) }, 5000)
    return () => clearInterval(t)
  }, [slides, saved, saveSlides])

  const current = slides[currentIdx] ?? slides[0]

  const updateCurrent = (patch: Partial<Slide>) => {
    const updated = slides.map((s, i) => i === currentIdx ? { ...s, ...patch } : s)
    setSlides(updated)
    setSaved(false)
  }

  const addSlide = () => {
    const newSlide = defaultSlide()
    const updated = [...slides, newSlide]
    setSlides(updated)
    setCurrentIdx(updated.length - 1)
    setSaved(false)
  }

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return
    const updated = slides.filter((_, i) => i !== idx)
    setSlides(updated)
    setCurrentIdx(Math.min(idx, updated.length - 1))
    setSaved(false)
  }

  return (
    <div className="flex h-full">
      {/* Thumbnail sidebar */}
      <div className="w-44 border-r border-white/[0.06] bg-white/[0.01] flex flex-col overflow-y-auto">
        <div className="p-2 flex items-center justify-between border-b border-white/[0.06]">
          <span className="text-[0.65rem] text-white/30 font-medium">Slides ({slides.length})</span>
          <button
            type="button"
            onClick={addSlide}
            className="w-6 h-6 rounded flex items-center justify-center bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentIdx(i)}
            className={`group relative m-2 rounded overflow-hidden border-2 transition-all ${
              i === currentIdx ? 'border-indigo-500/60' : 'border-transparent hover:border-white/10'
            }`}
          >
            <div
              className="w-full aspect-video flex flex-col p-2 text-left"
              style={{ backgroundColor: s.bg }}
            >
              <p className="text-white text-[0.5rem] font-semibold line-clamp-1">{s.title}</p>
              <p className="text-white/60 text-[0.45rem] mt-0.5 line-clamp-2">{s.body}</p>
            </div>
            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/40 flex items-center justify-center">
              <span className="text-white text-[0.45rem] font-bold">{i + 1}</span>
            </div>
            {slides.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteSlide(i) }}
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500/80 text-white hidden group-hover:flex items-center justify-center"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col bg-[hsl(220,15%,10%)]">
        {/* Slide toolbar */}
        <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-3 flex-wrap">
          <span className="text-[0.65rem] text-white/30">Màu nền:</span>
          <div className="flex gap-1.5">
            {SLIDE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateCurrent({ bg: c })}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  current.bg === c ? 'border-white/60 scale-110' : 'border-transparent hover:border-white/30'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-[0.65rem]">
            {saved ? (
              <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500/70">Đã lưu</span></>
            ) : (
              <><Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" /><span className="text-white/30">Đang lưu...</span></>
            )}
          </div>
          <button
            type="button"
            onClick={() => saveSlides(slides)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition-all"
          >
            <Save className="w-3 h-3" />Lưu
          </button>
        </div>

        {/* Slide canvas */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div
            className="w-full max-w-3xl aspect-video rounded-xl shadow-[0_8px_48px_rgba(0,0,0,0.5)] flex flex-col p-10 relative"
            style={{ backgroundColor: current.bg }}
          >
            <input
              type="text"
              value={current.title}
              onChange={(e) => updateCurrent({ title: e.target.value })}
              className="bg-transparent border-0 border-b border-white/20 text-white text-2xl font-bold mb-4 outline-none focus:border-white/50 placeholder:text-white/30 w-full"
              placeholder="Tiêu đề slide"
            />
            <textarea
              value={current.body}
              onChange={(e) => updateCurrent({ body: e.target.value })}
              rows={6}
              className="bg-transparent border-0 border border-white/10 text-white/80 text-base leading-7 outline-none focus:border-white/30 placeholder:text-white/30 resize-none rounded p-2 flex-1"
              placeholder="Nội dung trình bày..."
            />
            <div className="absolute bottom-3 right-4 text-white/20 text-xs">
              {currentIdx + 1} / {slides.length}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="px-4 py-2 border-t border-white/[0.06] flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />Trước
          </button>
          <button
            type="button"
            onClick={() => setCurrentIdx(Math.min(slides.length - 1, currentIdx + 1))}
            disabled={currentIdx === slides.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all disabled:opacity-30"
          >
            Tiếp<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab 3: Submit ─────────────────────────────────────────────────────────────
function SubmitTab({ assignment }: { assignment: Assignment }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(pdf|docx|doc|jpg|jpeg|png|gif|webp)$/i.test(f.name)
    )
    setFiles((prev) => [...prev, ...dropped])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!text.trim() && files.length === 0) {
      setError('Vui lòng nhập nội dung bài làm hoặc đính kèm file trước khi nộp.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('answerText', text)
      files.forEach((f) => formData.append('files', f))
      const res = await fetch(`/api/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSubmitted(true)
    } catch (err) {
      setError('Nộp bài thất bại. Vui lòng kiểm tra kết nối và thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const deadline = assignment.dueDate
    ? new Date(assignment.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <div className="w-24 h-24 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white/90 mb-1">Nộp bài thành công! 🎉</h2>
          <p className="text-sm text-white/40">Bài làm của bạn đã được gửi đến giáo viên.</p>
          {assignment.xpReward > 0 && (
            <p className="text-sm text-amber-400 mt-2">+{assignment.xpReward} XP đã được ghi nhận</p>
          )}
        </div>
        <Link
          to="/dashboard/assignments"
          className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-sm font-medium hover:bg-indigo-500/25 transition-all"
        >
          Quay lại danh sách bài tập
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Assignment info */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Thông tin bài tập
          </h3>
          <div className="grid grid-cols-2 gap-3 text-[0.72rem]">
            <div>
              <p className="text-white/30 mb-0.5">Tiêu đề</p>
              <p className="text-white/70 font-medium">{assignment.title}</p>
            </div>
            <div>
              <p className="text-white/30 mb-0.5">Môn học</p>
              <p className="text-white/70 font-medium">{assignment.subject}</p>
            </div>
            {deadline && (
              <div>
                <p className="text-white/30 mb-0.5">Hạn nộp</p>
                <p className="text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />{deadline}
                </p>
              </div>
            )}
            <div>
              <p className="text-white/30 mb-0.5">Phần thưởng</p>
              <p className="text-amber-400 font-medium">+{assignment.xpReward} XP</p>
            </div>
          </div>
          {assignment.description && (
            <p className="text-[0.72rem] text-white/45 leading-relaxed border-t border-white/[0.06] pt-3">
              {assignment.description}
            </p>
          )}
        </div>

        {/* Text submission */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Nộp bài văn bản</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Nhập nội dung bài làm của bạn tại đây..."
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 p-4 outline-none focus:border-indigo-400/40 focus:bg-white/[0.05] transition-all resize-none leading-relaxed"
          />
        </div>

        {/* File dropzone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Đính kèm file</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-indigo-500/60 bg-indigo-500/[0.06]'
                : 'border-white/[0.10] hover:border-white/[0.18] hover:bg-white/[0.02]'
            }`}
          >
            <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40 font-medium">Kéo thả file vào đây hoặc click để chọn</p>
            <p className="text-[0.65rem] text-white/20 mt-1">PDF, DOCX, JPG, PNG — tối đa 20MB</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 mt-3">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 truncate">{f.name}</p>
                    <p className="text-[0.6rem] text-white/30">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="w-6 h-6 rounded flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[hsl(245,85%,65%)] to-[hsl(262,83%,58%)] text-white font-semibold text-sm shadow-[0_4px_16px_rgba(140,100,240,0.3)] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Đang nộp bài...</>
          ) : (
            <>Nộp bài</>
          )}
        </button>

      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssignmentWorkspacePage() {
  const { id = 'demo' } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('editor')
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    assignmentsService.getById(id)
      .then((a) => setAssignment(a))
      .catch(() => setAssignment(DEMO_ASSIGNMENT))
      .finally(() => setLoading(false))
  }, [id])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'editor', label: 'Soạn thảo' },
    { key: 'slides', label: 'Bản trình chiếu' },
    { key: 'submit', label: 'Nộp bài' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  const a = assignment ?? DEMO_ASSIGNMENT

  const deadline = a.dueDate
    ? new Date(a.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : null

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 56px)' }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.01] flex-wrap">
        <Link
          to="/dashboard/assignments"
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-all text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Bài tập</span>
        </Link>
        <div className="w-px h-5 bg-white/[0.08]" />
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-white/85 truncate">{a.title}</h1>
          <span className="shrink-0 text-[0.6rem] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
            {a.subject}
          </span>
          {deadline && (
            <span className="shrink-0 text-[0.6rem] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />Hạn {deadline}
            </span>
          )}
        </div>
        <div className="flex-1" />
        {/* Tab switcher — desktop in top bar */}
        <div className="hidden sm:flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t.key
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/25'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab switcher — mobile only */}
      <div className="flex sm:hidden border-b border-white/[0.06] bg-white/[0.01]">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-all border-b-2 ${
              tab === t.key
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'editor' && <EditorTab assignmentId={id} />}
        {tab === 'slides' && <SlidesTab assignmentId={id} />}
        {tab === 'submit' && (
          <div className="flex-1 overflow-y-auto">
            <SubmitTab assignment={a} />
          </div>
        )}
      </div>

    </div>
  )
}
