import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, FileCode2, Play, Download,
  Printer, History, Share2, Trash2, Sparkles, BookOpen, Zap, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { LatexEditor, insertAtMonacoCursor } from '@/components/latex-editor'
import { AiExamDialog } from '@/components/latex-editor/AiExamDialog'
import { AiSectionWizardDialog } from '@/components/latex-editor/AiSectionWizardDialog'
import LatexSnippetsPanel from '@/components/latex-editor/LatexSnippetsPanel'
import { LATEX_TEMPLATES, getTemplateById } from '@/lib/latex-templates'
import type { GenerateResult, ExamConfig } from '@/services/latex-ai.service'
import { lessonPlanService } from '@/services/lessonPlan.service'

/* ── Dark palette ── */
const D = {
  bg: '#0d0e17',
  card: '#10111e',
  card2: '#161728',
  border: '#1e2033',
  border2: '#2a2b3d',
  text: '#f1f5f9',
  muted: '#94a3b8',
  purple: '#7c3aed',
} as const

const AUTO_SAVE_MS = 2500

/* ── Types ── */
interface Version {
  id: string
  titleSnapshot: string | null
  trigger: string
  createdAt: string
}
interface Collaborator {
  userId: string
  email: string | null
  name: string | null
  role: string
}

/* ── Small helpers ── */

/**
 * Auto-detect đáp án từ LaTeX source qua pattern \underline{}.
 *
 * PHẦN I (MCQ ABCD): scan từng câu, tìm \underline{\textbf{X.}} → X là đáp án đúng.
 *   Cấu trúc: `\item ... \textbf{\underline{B.}}~Đáp án`
 *
 * PHẦN II (Đúng/Sai 4 ý a/b/c/d): scan từng "Câu N." block, mỗi ý a-d
 *   được wrap \underline{...} là ĐÚNG (T), không wrap là SAI (F).
 *
 * Trả về { phanI: ['B','D','A',...], phanII: ['TFTT', 'FTFT',...] }
 */
function autoDetectAnswersFromLatex(latex: string): { phanI: string[]; phanII: string[] } {
  const phanI: string[] = []
  const phanII: string[] = []
  if (!latex) return { phanI, phanII }

  // ── PHẦN I: split by \item rồi tìm \underline{...} đầu tiên ──
  // Pattern: \textbf{\underline{X.}} hoặc \underline{\textbf{X.}}
  // Limit scope đến PHẦN II hoặc PHẦN III để tránh nhầm
  const phanIIndex = latex.search(/Phần\s*II[.\s]/i)
  const phanISource = phanIIndex > 0 ? latex.slice(0, phanIIndex) : latex
  const items = phanISource.split(/\\item\b/)
  // items[0] là phần trước \item đầu tiên (preamble), bỏ qua
  for (let i = 1; i < items.length; i++) {
    const block = items[i]
    // Tìm pattern \underline{...X.} hoặc \textbf{\underline{X.}}
    const m = block.match(/\\underline\{\s*\\textbf\{\s*([A-D])\.\s*\}\s*\}|\\textbf\{\s*\\underline\{\s*([A-D])\.\s*\}\s*\}/)
    if (m) {
      phanI.push((m[1] || m[2]).toUpperCase())
    } else {
      // Có \item nhưng chưa có đáp án đúng → empty
      phanI.push('')
    }
  }
  // Trim trailing empty
  while (phanI.length > 0 && phanI[phanI.length - 1] === '') phanI.pop()

  // ── PHẦN II: split by "Câu N." trong scope PHẦN II → PHẦN III ──
  const phan3Index = latex.search(/Phần\s*III[.\s]/i)
  if (phanIIndex > 0) {
    const phanIIEnd = phan3Index > phanIIndex ? phan3Index : latex.length
    const phanIISource = latex.slice(phanIIndex, phanIIEnd)
    // Split by `\textbf{Câu \d+.}` markers
    const cauBlocks = phanIISource.split(/\\textbf\{\s*C[âa]u\s+\d+\.\s*\}/i)
    for (let i = 1; i < cauBlocks.length; i++) {  // skip [0] = header
      const block = cauBlocks[i]
      // Tìm 4 dòng a/b/c/d và check có \underline{...} không
      const lines = block.split(/\\\\/)  // split by \\
      const tfArray = ['-', '-', '-', '-']  // a,b,c,d
      let idx = 0
      for (const line of lines) {
        const matchLetter = line.match(/^[\s\\textbf{}]*([a-d])\)/i)
        if (matchLetter) {
          const letter = matchLetter[1].toLowerCase()
          const letterIdx = letter.charCodeAt(0) - 'a'.charCodeAt(0)
          if (letterIdx >= 0 && letterIdx < 4) {
            // Check xem dòng có \underline{ không (= ĐÚNG)
            tfArray[letterIdx] = /\\underline\s*\{/.test(line) ? 'T' : 'F'
            idx = letterIdx + 1
          }
        }
        if (idx >= 4) break
      }
      // Chỉ thêm nếu có ít nhất 1 T hoặc F
      if (tfArray.some(x => x !== '-')) {
        phanII.push(tfArray.join(''))
      }
    }
  }

  return { phanI, phanII }
}

function IconBtn({
  onClick, disabled, title, children, danger, active,
}: {
  onClick?: () => void; disabled?: boolean; title?: string
  children: React.ReactNode; danger?: boolean; active?: boolean
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        background: danger ? 'rgba(239,68,68,0.12)' : active ? D.purple : D.card2,
        border: danger ? '1px solid rgba(239,68,68,0.3)' : `1px solid ${D.border2}`,
        borderRadius: 8,
        color: danger ? '#f87171' : active ? '#fff' : D.text,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        padding: '6px 10px', lineHeight: 1,
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600,
      }}
    >{children}</button>
  )
}

/* ════════════════════════════════ Main ════════════════════════════════ */
export default function LaTeXEditorDocument() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(true)
  // Share modal sau khi tạo đề thi từ LaTeX
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareExamUrl, setShareExamUrl] = useState('')
  const [shareExamId, setShareExamId] = useState('')
  const [shareExamTitle, setShareExamTitle] = useState('')
  const [shareExamTotalQ, setShareExamTotalQ] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)

  // PDF-only exam modal — GV nhập đáp án trực tiếp, không AI extract.
  // State giờ là array để dùng visual bubble UI (click thay vì gõ chữ).
  const [pdfExamModalOpen, setPdfExamModalOpen] = useState(false)
  // Mỗi phần tử: '' | 'A' | 'B' | 'C' | 'D' (1 câu)
  const [pdfExamPhanI, setPdfExamPhanI] = useState<string[]>(() => Array(40).fill(''))
  // Mỗi phần tử: 4 ký tự T/F/- cho 4 mệnh đề a/b/c/d
  const [pdfExamPhanII, setPdfExamPhanII] = useState<string[]>(() => Array(4).fill('----'))
  // Mỗi phần tử: chuỗi text đáp số (vd "0.4")
  const [pdfExamPhanIII, setPdfExamPhanIII] = useState<string[]>(() => Array(6).fill(''))
  // PHẦN IV — Tự luận: mỗi câu { rubric, maxScore }. AI sẽ chấm bài làm HS
  // theo rubric (tiêu chí chấm) GV nhập.
  const [pdfExamPhanIV, setPdfExamPhanIV] = useState<{ rubric: string; maxScore: number }[]>(() => [])
  const [pdfExamSubmitting, setPdfExamSubmitting] = useState(false)

  const [versions, setVersions] = useState<Version[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const [shareOpen, setShareOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [addingCollab, setAddingCollab] = useState(false)

  const [templateSel, setTemplateSel] = useState('')
  const [savingLessonPlan, setSavingLessonPlan] = useState(false)
  const [savedAsLessonPlan, setSavedAsLessonPlan] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  // ── Realtime preview + Snippets panel ──
  // autoCompile=true → auto biên dịch sau 2.5s im lặng (giúp GV thấy ngay
  // PDF mỗi lần gõ, không cần bấm "Biên dịch")
  const [autoCompile, setAutoCompile] = useState(() => {
    try { return localStorage.getItem('latex-auto-compile') !== 'false' } catch { return true }
  })
  const [snippetsOpen, setSnippetsOpen] = useState(false)
  // Monaco editor instance — dùng để insert snippet tại cursor
  const monacoRef = useRef<any>(null)
  const handleEditorMount = useCallback((editor: any) => {
    monacoRef.current = editor
  }, [])
  const handleSnippetInsert = useCallback((code: string) => {
    insertAtMonacoCursor(monacoRef.current, code)
    toast.success('Đã chèn mẫu vào editor', { duration: 1500 })
  }, [])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Debounce riêng cho auto-compile (longer than auto-save, tránh spam compile)
  const compileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPdfRef = useRef<string | null>(null)
  const compileInflight = useRef(false)

  /* Cleanup blob URL */
  useEffect(() => () => { if (prevPdfRef.current) URL.revokeObjectURL(prevPdfRef.current) }, [])

  /* ── Save ── */
  const saveContent = useCallback(async (c: string, t?: string) => {
    if (!id) return
    setSaving(true)
    try {
      await api.put(`/latex-projects/${id}`, { mainContent: c, ...(t !== undefined && { title: t }) })
      toast.success('Đã lưu')
    } catch {
      toast.error('Không thể lưu')
    } finally {
      setSaving(false)
    }
  }, [id])

  /* ── Load document ── */
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    api.get(`/latex-projects/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        // API returns { success, data: { id, title, content, userId, createdAt, updatedAt } }
        const proj = data.data ?? data
        setTitle(proj.title ?? '')
        setContent(proj.content ?? proj.mainContent ?? '')
        setIsOwner(proj.isOwner !== false)
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 404) setNotFound(true)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  /* ── Auto-save debounce ── */
  useEffect(() => {
    if (!id || loading) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { debounceRef.current = null; saveContent(content) }, AUTO_SAVE_MS)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [content, id, loading, saveContent])

  /* ── Auto-compile realtime (debounce 3s) ──
   * GV gõ → 3s im lặng → tự gọi /latex-projects/compile → PDF cập nhật
   * trong iframe bên phải mà không cần bấm nút.
   * Persist preference vào localStorage.
   */
  useEffect(() => {
    if (!id || loading || !autoCompile || !content || compileInflight.current) return
    if (compileDebounceRef.current) clearTimeout(compileDebounceRef.current)
    compileDebounceRef.current = setTimeout(() => {
      compileDebounceRef.current = null
      // Reuse handleCompile (declared below) — must be ref-stable
      handleCompileRef.current?.()
    }, 3000)
    return () => { if (compileDebounceRef.current) clearTimeout(compileDebounceRef.current) }
  }, [content, id, loading, autoCompile])

  // Persist autoCompile to localStorage
  useEffect(() => {
    try { localStorage.setItem('latex-auto-compile', autoCompile ? 'true' : 'false') } catch {}
  }, [autoCompile])

  // Stable ref to handleCompile for use in auto-compile effect
  const handleCompileRef = useRef<(() => Promise<void>) | null>(null)

  /* ── Load versions ── */
  const fetchVersions = useCallback(() => {
    if (!id) return
    api.get(`/latex-projects/${id}/versions`)
      .then(({ data }) => {
        // API returns { success, data: [...] }
        const arr = data?.data ?? data?.versions
        if (arr) setVersions(arr)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => { if (id && !loading) fetchVersions() }, [id, loading, fetchVersions])

  /* ── Load collaborators ── */
  const fetchCollaborators = useCallback(() => {
    if (!id) return
    api.get(`/latex-projects/${id}/collaborators`)
      .then(({ data }) => {
        // API returns { success, data: [...] }
        const arr = data?.data ?? data?.collaborators
        if (arr) setCollaborators(arr)
      })
      .catch(() => {})
  }, [id])
  useEffect(() => { if (shareOpen && id) fetchCollaborators() }, [shareOpen, id, fetchCollaborators])

  /* ── Handlers ── */
  const handleSaveClick = () => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    saveContent(content)
  }

  const handleTemplateChange = (templateId: string) => {
    if (!templateId) return
    const t = getTemplateById(templateId)
    if (t) { setContent(t.body); toast.success(`Đã áp dụng mẫu: ${t.name}`) }
    setTemplateSel('')
  }

  /** Lưu LaTeX project hiện tại thành 1 mục giáo án.
   * Server tạo LessonPlan với format='latex', latexProjectId=this.id
   * → xuất hiện ở /teacher/lesson-plans tab "Giáo án đã soạn".
   * Idempotent: nếu đã có LessonPlan ref tới project này, sẽ UPDATE
   * thay vì tạo mới (refresh content + title từ latex source).
   */
  const handleSaveAsLessonPlan = async () => {
    if (!id || savingLessonPlan) return
    setSavingLessonPlan(true)
    try {
      // Save LaTeX trước để latexProject.mainContent là phiên bản mới nhất
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
      saveContent(content)
      // Sau đó cross-link tới lesson plan
      const r = await lessonPlanService.saveFromLatex(id, { title: title.trim() || undefined })
      setSavedAsLessonPlan(true)
      toast.success(
        r.action === 'created'
          ? `Đã lưu vào danh mục giáo án (mới)`
          : `Đã cập nhật giáo án trong danh mục`,
        { duration: 3500 }
      )
      // Reset visual feedback sau 3s
      setTimeout(() => setSavedAsLessonPlan(false), 3000)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi lưu vào danh mục giáo án')
    } finally { setSavingLessonPlan(false) }
  }

  /* ── AI exam generator — nhận LaTeX và thay thế nội dung editor ── */
  const handleAiGenerated = (result: GenerateResult, config: ExamConfig) => {
    setContent(result.latex)
    // Nếu tài liệu chưa có tiêu đề, tự đặt theo cấu hình để dễ quản lí
    if (!title.trim()) {
      const auto = config.title ?? `Đề ${config.subject} — Khối ${config.grade}`
      setTitle(auto)
      saveContent(result.latex, auto)
    } else {
      saveContent(result.latex)
    }
    setAiDialogOpen(false)
  }

  /* ── AI Section Wizard — sinh đề LaTeX 4 phần theo nội dung GV nhập riêng ── */
  const handleWizardGenerated = (latex: string, meta: { sections: number; totalQuestions: number; provider: string }) => {
    setContent(latex)
    if (!title.trim()) {
      setTitle('Đề kiểm tra (AI sinh)')
      saveContent(latex, 'Đề kiểm tra (AI sinh)')
    } else {
      saveContent(latex)
    }
    setWizardOpen(false)
    toast.success(`✓ AI đã sinh ${meta.totalQuestions} câu hỏi qua ${meta.sections} phần. Chỉnh sửa và biên dịch để xem PDF.`)
  }

  const handleCompile = useCallback(async () => {
    if (!id || compileInflight.current) return
    compileInflight.current = true
    setCompiling(true)
    setCompileError(null)
    try {
      const res = await api.post(
        '/latex-projects/compile',
        { projectId: id, content },
        { responseType: 'blob' },
      )
      if (prevPdfRef.current) URL.revokeObjectURL(prevPdfRef.current)
      const url = URL.createObjectURL(res.data)
      prevPdfRef.current = url
      setPdfBlobUrl(url)
      toast.success('Đã biên dịch. Xem PDF bên phải.')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: Blob } }
      if (axiosErr?.response?.data instanceof Blob) {
        try {
          const text = await axiosErr.response.data.text()
          const parsed = JSON.parse(text)
          const msg = parsed.error ?? 'Biên dịch thất bại'
          setCompileError(parsed.log ?? msg)
          if (axiosErr.response.status === 503) {
            toast.error('Dịch vụ biên dịch chưa sẵn sàng. Cấu hình Docker TeX Live hoặc thử lại sau.')
          } else {
            toast.error(msg)
          }
        } catch {
          toast.error('Biên dịch thất bại')
        }
      } else {
        toast.error('Lỗi khi gọi dịch vụ biên dịch')
      }
    } finally {
      setCompiling(false)
      compileInflight.current = false
    }
  }, [id, content])

  // Sync ref để auto-compile useEffect gọi được
  useEffect(() => { handleCompileRef.current = handleCompile }, [handleCompile])

  /** Tên file PDF tải xuống: <tiêu-đề> - dd-mm-yyyy.pdf (bỏ ký tự không hợp lệ) */
  const buildPdfFilename = useCallback(() => {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const rawTitle = (title || 'de-thi').trim()
    const safe = rawTitle
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 80) || 'de-thi'
    return `${safe}-${dd}${mm}${yyyy}.pdf`
  }, [title])

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) { toast.error('Hãy bấm "Biên dịch" trước để tạo PDF.'); return }
    const a = document.createElement('a')
    a.href = pdfBlobUrl
    a.download = buildPdfFilename()
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('Đã tải PDF — kiểm tra thư mục Downloads.')
  }

  const handlePrintPdf = () => {
    if (!pdfBlobUrl) { toast.error('Hãy bấm "Biên dịch" trước để in.'); return }
    const w = window.open(pdfBlobUrl, '_blank')
    if (w) w.onload = () => { w.print(); w.close() }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!id) return
    setRestoringId(versionId)
    try {
      const { data } = await api.post(`/latex-projects/${id}/versions/restore`, { versionId })
      setContent(data.mainContent ?? '')
      setTitle(data.title ?? '')
      toast.success('Đã khôi phục phiên bản')
      setHistoryOpen(false)
      fetchVersions()
    } catch {
      toast.error('Không thể khôi phục')
    } finally {
      setRestoringId(null)
    }
  }

  const handleAddCollaborator = async () => {
    if (!id || !shareEmail.trim()) return
    setAddingCollab(true)
    try {
      await api.post(`/latex-projects/${id}/collaborators`, { email: shareEmail.trim(), role: shareRole })
      setShareEmail('')
      fetchCollaborators()
      toast.success('Đã thêm cộng tác viên')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Không thể thêm')
    } finally {
      setAddingCollab(false)
    }
  }

  const handleRemoveCollaborator = async (userId: string) => {
    if (!id) return
    try {
      await api.delete(`/latex-projects/${id}/collaborators/${userId}`)
      fetchCollaborators()
      toast.success('Đã xóa cộng tác viên')
    } catch {
      toast.error('Không thể xóa')
    }
  }

  /* ── Guards ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: D.bg }}>
      <Loader2 size={36} style={{ color: D.muted, animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (!id || notFound) return (
    <div style={{ background: D.bg, minHeight: '100vh', padding: 40 }}>
      <p style={{ color: D.muted, marginBottom: 16 }}>Tài liệu không tồn tại.</p>
      <button
        onClick={() => navigate('/teacher/latex-documents')}
        style={{
          background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
          color: D.text, cursor: 'pointer', padding: '8px 18px', fontSize: 14,
        }}
      >Quay lại danh sách</button>
    </div>
  )

  /* ── Input / select helper styles ── */
  const inputStyle: React.CSSProperties = {
    background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
    color: D.text, fontSize: 13, padding: '6px 10px', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: D.bg, overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
        background: D.card, borderBottom: `1px solid ${D.border}`, flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Back */}
        <IconBtn onClick={() => navigate('/teacher/latex-documents')}>
          <ArrowLeft size={14} /> Danh sách
        </IconBtn>

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title.trim() && saveContent(content, title.trim())}
          placeholder="Tên tài liệu"
          style={{ ...inputStyle, flex: 1, minWidth: 160, fontSize: 15, fontWeight: 600 }}
        />

        {/* Template picker */}
        <select
          value={templateSel}
          onChange={e => handleTemplateChange(e.target.value)}
          style={{ ...inputStyle, minWidth: 200, cursor: 'pointer' }}
        >
          <option value="">Chọn mẫu...</option>
          {LATEX_TEMPLATES.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {/* AI exam generator (single-pass với topic chung) */}
        <button
          type="button"
          onClick={() => setAiDialogOpen(true)}
          title="Sinh đề trắc nghiệm / tự luận bằng AI (cấu hình tổng)"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #22d3ee)',
            border: 'none', borderRadius: 8, color: '#fff',
            cursor: 'pointer', padding: '6px 14px', fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 0 14px rgba(124,58,237,0.35)',
          }}
        >
          <Sparkles size={14} />
          Tạo đề bằng AI
        </button>

        {/* AI Section Wizard — sinh theo từng phần riêng */}
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          title="AI ra đề theo phần — bạn khai báo nội dung từng phần (MCQ / Đ-S / Trả lời ngắn / Tự luận)"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
            border: 'none', borderRadius: 8, color: '#fff',
            cursor: 'pointer', padding: '6px 14px', fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 0 14px rgba(236,72,153,0.35)',
          }}
        >
          <Zap size={14} />
          AI theo phần
        </button>

        {/* Save */}
        <IconBtn onClick={handleSaveClick} disabled={saving}>
          {saving
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <Save size={14} />
          }
          Lưu
        </IconBtn>

        {/* Lưu vào Giáo án — cross-link to /teacher/lesson-plans */}
        <button
          onClick={handleSaveAsLessonPlan}
          disabled={savingLessonPlan}
          title="Lưu LaTeX này vào danh mục giáo án — sẽ xuất hiện ở /teacher/lesson-plans"
          style={{
            background: savedAsLessonPlan ? '#16a34a' : 'rgba(124,58,237,0.18)',
            border: `1px solid ${savedAsLessonPlan ? '#22c55e' : 'rgba(124,58,237,0.5)'}`,
            borderRadius: 8,
            color: savedAsLessonPlan ? '#fff' : '#a78bfa',
            cursor: savingLessonPlan ? 'not-allowed' : 'pointer',
            opacity: savingLessonPlan ? 0.6 : 1,
            padding: '6px 12px', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
        >
          {savingLessonPlan
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <FileText size={14} />
          }
          {savedAsLessonPlan ? '✓ Đã lưu giáo án' : 'Lưu Giáo án'}
        </button>

        {/* Compile */}
        <button
          onClick={handleCompile}
          disabled={compiling}
          title="Biên dịch LaTeX sang PDF (cần Docker TeX Live)"
          style={{
            background: compiling ? '#15803d' : '#16a34a',
            border: 'none', borderRadius: 8, color: '#fff',
            cursor: compiling ? 'not-allowed' : 'pointer',
            opacity: compiling ? 0.75 : 1,
            padding: '6px 14px', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          {compiling
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <Play size={14} />
          }
          Biên dịch
        </button>

        {/* Convert to Exam — chuẩn Bộ GD&ĐT */}
        <button
          onClick={async () => {
            if (!id || !confirm('Tạo đề thi từ tài liệu này? AI sẽ trích xuất câu hỏi và công khai cho học sinh.')) return
            const t = toast.loading('Đang trích xuất câu hỏi…')
            try {
              const res = await api.post<{
                examId: string; totalQuestions: number; isPublic: boolean; examTitle: string
              }>(
                `/latex-projects/${id}/to-exam`,
                { subject: 'Vật lí', grade: '11', public: true }
              )
              const examUrl = `${window.location.origin}/exam-sheet/${res.data.examId}`
              toast.success(`✅ Đã tạo đề ${res.data.totalQuestions} câu — học sinh có thể làm ngay`, {
                id: t, duration: 4000,
              })
              setShareExamUrl(examUrl)
              setShareExamId(res.data.examId)
              setShareExamTitle(res.data.examTitle)
              setShareExamTotalQ(res.data.totalQuestions)
              setShareModalOpen(true)
            } catch (err: unknown) {
              const e = err as { response?: { data?: { error?: string } } }
              toast.error(e.response?.data?.error || 'Không tạo được đề thi', { id: t })
            }
          }}
          disabled={!id || compiling}
          title="Trích xuất câu hỏi từ tài liệu LaTeX → tạo đề thi chuẩn Bộ GD&ĐT + công khai cho học sinh"
          style={{
            background: 'linear-gradient(90deg, #ec4899, #a855f7)',
            border: 'none', borderRadius: 8, color: '#fff',
            cursor: 'pointer',
            padding: '6px 14px', fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
          }}
        >
          📋 Tạo đề thi
        </button>

        {/* PDF-only exam — không AI extract, GV nhập đáp án thủ công */}
        <button
          onClick={() => {
            // V2 (2026-05-22): TỰ ĐỘNG PARSE đáp án \underline{} từ LaTeX source
            // → pre-fill PHẦN I + II trước khi mở modal. GV chỉ cần check + submit.
            try {
              const detected = autoDetectAnswersFromLatex(content)
              if (detected.phanI.length > 0) {
                const next = Array(40).fill('')
                detected.phanI.forEach((ans, i) => { if (i < 40) next[i] = ans })
                setPdfExamPhanI(next)
              }
              if (detected.phanII.length > 0) {
                const next = Array(detected.phanII.length).fill('----')
                detected.phanII.forEach((ans, i) => { next[i] = ans })
                setPdfExamPhanII(next)
              }
              const totalAuto = detected.phanI.length + detected.phanII.length
              if (totalAuto > 0) {
                toast.success(`✨ Auto-detect: ${detected.phanI.length} câu PHẦN I + ${detected.phanII.length} câu PHẦN II`)
              }
            } catch { /* ignore — fallback empty */ }
            setPdfExamModalOpen(true)
          }}
          disabled={!id || compiling}
          title="Mở phiếu đáp án — tự động detect đáp án từ \\underline{} trong LaTeX"
          style={{
            background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
            border: 'none', borderRadius: 8, color: '#fff',
            cursor: 'pointer',
            padding: '6px 14px', fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
          }}
        >
          📄 Tạo đề PDF
        </button>

        {/* History button */}
        <div style={{ position: 'relative' }}>
          <IconBtn onClick={() => setHistoryOpen(!historyOpen)} active={historyOpen} title="Lịch sử phiên bản">
            <History size={14} />
          </IconBtn>
          {historyOpen && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 50,
              background: D.card, border: `1px solid ${D.border2}`, borderRadius: 12,
              minWidth: 260, maxHeight: 300, overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${D.border}`, color: D.text, fontWeight: 700, fontSize: 13 }}>
                Lịch sử phiên bản
              </div>
              {versions.length === 0 ? (
                <div style={{ padding: '12px 14px', color: D.muted, fontSize: 13 }}>Chưa có phiên bản</div>
              ) : (
                versions.map(v => (
                  <button
                    key={v.id}
                    onClick={() => handleRestoreVersion(v.id)}
                    disabled={restoringId === v.id}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      background: 'none', border: 'none', padding: '10px 14px',
                      color: D.text, cursor: restoringId === v.id ? 'not-allowed' : 'pointer',
                      fontSize: 13, borderBottom: `1px solid ${D.border}`,
                      opacity: restoringId === v.id ? 0.5 : 1,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {new Date(v.createdAt).toLocaleString('vi-VN')}{' '}
                    <span style={{ color: D.muted }}>({v.trigger === 'compile' ? 'Sau biên dịch' : 'Lưu'})</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Share (owner only) */}
        {isOwner && (
          <IconBtn onClick={() => setShareOpen(true)} title="Chia sẻ">
            <Share2 size={14} /> Chia sẻ
          </IconBtn>
        )}
      </header>

      {/* ── Editor + Preview ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* Left: Monaco editor */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${D.border}` }}>
          <div style={{
            padding: '8px 14px', background: D.card2, borderBottom: `1px solid ${D.border}`,
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <FileCode2 size={14} style={{ color: D.muted }} />
            <span style={{ color: D.muted, fontSize: 13, fontWeight: 600 }}>main.tex</span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setSnippetsOpen(true)}
              title="Mở bảng gợi ý LaTeX — click 1 mẫu để chèn ngay vào editor"
              style={{
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)',
                borderRadius: 7, color: '#a78bfa', cursor: 'pointer',
                padding: '5px 12px', fontSize: 12, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >
              <BookOpen size={12} /> Mẫu nhanh
            </button>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              padding: '5px 10px', borderRadius: 7,
              background: autoCompile ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${autoCompile ? 'rgba(34,197,94,0.4)' : D.border2}`,
              color: autoCompile ? '#4ade80' : D.muted, fontSize: 12, fontWeight: 700,
            }}
              title={autoCompile
                ? 'Realtime: tự biên dịch sau 3 giây mỗi lần gõ — TẮT để tiết kiệm tài nguyên'
                : 'TẮT realtime — phải bấm "Biên dịch" thủ công'}
            >
              <input type="checkbox" checked={autoCompile}
                onChange={e => setAutoCompile(e.target.checked)}
                style={{ accentColor: '#22c55e', cursor: 'pointer' }} />
              <Zap size={11} /> Realtime
            </label>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <LatexEditor value={content} onChange={setContent} height="100%" onMount={handleEditorMount} />
          </div>
        </div>

        {/* Right: PDF preview */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '8px 14px', background: D.card2, borderBottom: `1px solid ${D.border}`,
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: D.muted, fontSize: 13, fontWeight: 600 }}>
              Xem PDF {pdfBlobUrl && <span style={{ color: '#4ade80', marginLeft: 6 }}>· sẵn sàng tải xuống</span>}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {pdfBlobUrl ? (
                <>
                  <button
                    onClick={handleDownloadPdf}
                    title="Tải xuống PDF để lưu / gửi học sinh"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #3b82f6)', border: 'none', borderRadius: 7,
                      color: '#fff', cursor: 'pointer', padding: '6px 14px', fontSize: 12, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 0 12px rgba(59,130,246,0.35)',
                    }}
                  >
                    <Download size={13} />
                    Tải PDF
                  </button>
                  <button
                    onClick={handlePrintPdf}
                    title="Mở PDF để in ấn"
                    style={{
                      background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 7,
                      color: D.text, cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 700,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Printer size={13} />
                    In
                  </button>
                </>
              ) : (
                <>
                  <IconBtn onClick={handleDownloadPdf} disabled title="Bấm Biên dịch trước để tạo PDF">
                    <Download size={13} />
                  </IconBtn>
                  <IconBtn onClick={handlePrintPdf} disabled title="Bấm Biên dịch trước để in">
                    <Printer size={13} />
                  </IconBtn>
                </>
              )}
              <button
                onClick={handleCompile}
                disabled={compiling}
                style={{
                  background: '#16a34a', border: 'none', borderRadius: 7,
                  color: '#fff', cursor: compiling ? 'not-allowed' : 'pointer',
                  opacity: compiling ? 0.7 : 1,
                  padding: '5px 12px', fontSize: 12, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                {compiling ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} />}
                {pdfBlobUrl ? 'Biên dịch lại' : 'Biên dịch'}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#1a1a2e' }}>
            {compileError ? (
              <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, padding: 16, marginBottom: 16,
                }}>
                  <p style={{ color: '#f87171', fontWeight: 700, margin: '0 0 6px' }}>Biên dịch thất bại (422)</p>
                  <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>
                    Đây là lỗi nội dung LaTeX hoặc package/font, không phải lỗi đăng nhập.
                  </p>
                </div>
                <pre style={{
                  background: D.card, border: `1px solid ${D.border}`,
                  borderRadius: 10, padding: 16, color: D.text, fontSize: 12,
                  whiteSpace: 'pre-wrap', margin: 0,
                }}>{compileError}</pre>
              </div>
            ) : pdfBlobUrl ? (
              <iframe src={pdfBlobUrl} title="PDF preview" style={{ width: '100%', height: '100%', border: 'none' }} />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', textAlign: 'center', padding: 32, color: D.muted,
              }}>
                <FileCode2 size={48} style={{ opacity: 0.4, marginBottom: 16 }} />
                <p style={{ fontWeight: 600, color: D.text, margin: '0 0 8px' }}>Chưa có bản PDF</p>
                <p style={{ fontSize: 13, margin: '0 0 20px', maxWidth: 320, lineHeight: 1.5 }}>
                  Bấm <strong style={{ color: '#4ade80' }}>Biên dịch</strong> để chuyển LaTeX ra PDF.<br />
                  PDF sẽ hiện tại đây kèm nút <strong style={{ color: '#60a5fa' }}>Tải xuống</strong> &amp; <strong>In</strong> để in ấn cho học sinh.
                </p>
                <p style={{ fontSize: 12, margin: '0 0 20px', color: 'rgba(148,163,184,0.65)', maxWidth: 340 }}>
                  Chưa có tài liệu? Bấm <strong style={{ color: '#a78bfa' }}>✨ Tạo đề bằng AI</strong> trên thanh công cụ để sinh đề nhanh theo môn, khối, chủ đề.
                </p>
                <button
                  onClick={handleCompile}
                  disabled={compiling}
                  style={{
                    background: '#16a34a', border: 'none', borderRadius: 9,
                    color: '#fff', cursor: compiling ? 'not-allowed' : 'pointer',
                    padding: '10px 20px', fontSize: 14, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {compiling ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
                  Biên dịch
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Share modal ── */}
      {shareOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShareOpen(false) }}
        >
          <div style={{
            background: D.card, border: `1px solid ${D.border2}`, borderRadius: 16,
            padding: 28, width: '90%', maxWidth: 480,
          }}>
            <h2 style={{ color: D.text, fontWeight: 700, fontSize: 18, margin: '0 0 20px' }}>Chia sẻ dự án</h2>

            {/* Add collaborator row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                placeholder="Email người dùng"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCollaborator()}
                style={{
                  flex: 1, background: D.card2, border: `1px solid ${D.border2}`,
                  borderRadius: 8, color: D.text, fontSize: 13, padding: '8px 12px', outline: 'none',
                }}
              />
              <select
                value={shareRole}
                onChange={e => setShareRole(e.target.value as 'VIEW' | 'EDIT')}
                style={{
                  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                  color: D.text, fontSize: 13, padding: '8px 10px', cursor: 'pointer',
                }}
              >
                <option value="VIEW">Xem</option>
                <option value="EDIT">Chỉnh sửa</option>
              </select>
              <button
                onClick={handleAddCollaborator}
                disabled={addingCollab || !shareEmail.trim()}
                style={{
                  background: D.purple, border: 'none', borderRadius: 8,
                  color: '#fff', cursor: addingCollab || !shareEmail.trim() ? 'not-allowed' : 'pointer',
                  opacity: addingCollab || !shareEmail.trim() ? 0.6 : 1,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                }}
              >
                {addingCollab ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Thêm'}
              </button>
            </div>

            {/* Collaborators list */}
            <p style={{ color: D.muted, fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>Cộng tác viên</p>
            {collaborators.length === 0 ? (
              <p style={{ color: D.muted, fontSize: 13 }}>Chưa có ai được chia sẻ</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {collaborators.map(c => (
                  <li key={c.userId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, padding: '8px 12px',
                  }}>
                    <span style={{ color: D.text, fontSize: 13 }}>{c.email || c.name || c.userId}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: D.muted, fontSize: 12 }}>({c.role})</span>
                      <button
                        onClick={() => handleRemoveCollaborator(c.userId)}
                        style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 6, color: '#f87171', cursor: 'pointer', padding: '3px 6px', lineHeight: 1,
                        }}
                      ><Trash2 size={13} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setShareOpen(false)}
                style={{
                  background: D.card2, border: `1px solid ${D.border2}`, borderRadius: 8,
                  color: D.muted, cursor: 'pointer', padding: '8px 20px', fontSize: 14,
                }}
              >Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Click-outside to close history dropdown */}
      {historyOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {/* ── Snippets panel (mẫu LaTeX nhanh cho GV ko quen code) ── */}
      <LatexSnippetsPanel
        open={snippetsOpen}
        onClose={() => setSnippetsOpen(false)}
        onInsert={handleSnippetInsert}
      />

      {/* ── AI Section Wizard — sinh đề theo từng phần riêng (mới) ── */}
      <AiSectionWizardDialog
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerated={handleWizardGenerated}
      />

      {/* ── AI exam generator modal (tổng quát) ── */}
      <AiExamDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        onGenerated={handleAiGenerated}
        submitLabel="Sinh đề & chèn vào editor"
        defaults={{
          subject: 'Vật lý',
          grade: 11,
          topics: ['Dòng điện trong vật dẫn'],
          duration: 45,
          format: 'bgd-2025',
          difficulty: { easy: 6, medium: 6, hard: 3, veryHard: 1 },
          includeAnswerKey: true,
          schoolName: 'TRƯỜNG THPT PHƯỚC BỬU',
          departmentName: 'SỞ GD ĐT TP. HỒ CHÍ MINH',
          examLabel: 'ĐỀ THI MINH HOẠ',
          examSession: 'KIỂM TRA CUỐI HỌC KỲ II',
          schoolYear: '2025 – 2026',
        }}
      />

      {/* ═══ SHARE MODAL — sau khi tạo đề từ LaTeX ═══════════ */}
      {shareModalOpen && (
        <div
          onClick={() => setShareModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              background: '#1a0b2e', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: 24, maxWidth: 480, width: '100%',
              color: '#fff', textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px', fontSize: 28,
            }}>✓</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
              Đã tạo đề thi!
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '0 0 18px' }}>
              {shareExamTitle} · {shareExamTotalQ} câu · Chuẩn Bộ GD&amp;ĐT
            </p>

            {/* QR */}
            <div style={{ background: '#fff', padding: 12, borderRadius: 16, display: 'inline-block', marginBottom: 14 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(shareExamUrl)}`}
                alt="QR đề thi" width={180} height={180} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>
              Học sinh quét QR hoặc mở link để làm bài
            </p>

            {/* URL */}
            <div style={{
              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '8px 12px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <code style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {shareExamUrl}
              </code>
              <button onClick={() => {
                navigator.clipboard.writeText(shareExamUrl)
                setShareCopied(true); setTimeout(() => setShareCopied(false), 2000)
                toast.success('Đã copy link')
              }} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: shareCopied ? '#22c55e' : '#a855f7', color: '#fff',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>
                {shareCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShareModalOpen(false)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                Đóng
              </button>
              <button onClick={() => window.open(shareExamUrl, '_blank')}
                style={{
                  flex: 1.2, padding: '10px 16px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(90deg, #ec4899, #a855f7)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}>
                Mở xem trước →
              </button>
              <button onClick={() => navigate(`/teacher/exams/${shareExamId}/edit`)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF-only exam modal — Phiếu trả lời trực quan ── */}
      {pdfExamModalOpen && (
        <div
          onClick={() => !pdfExamSubmitting && setPdfExamModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw', width: '100%', maxHeight: '95vh',
              background: '#fdf2f8', border: `2px solid #f9a8d4`, borderRadius: 16,
              padding: 0, color: '#1f2937', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #fbcfe8' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, textAlign: 'center', color: '#0f172a', textTransform: 'uppercase' }}>
                Phiếu trả lời trắc nghiệm
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', margin: '3px 0 0' }}>
                {pdfBlobUrl
                  ? '📄 Đề PDF bên trái · ✏ Click ô đáp án bên phải để tô — đối chiếu trực tiếp'
                  : '⚠ Bấm "Biên dịch" trước để có đề PDF đối chiếu khi nhập đáp án'}
              </p>
            </div>

            {/* Split layout: PDF left + answer sheet right */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 1, background: '#f9a8d4' }}>
              {/* ─── LEFT: PDF preview để đối chiếu ─── */}
              <div style={{
                flex: '0 0 50%', minWidth: 0, background: '#1a1a2e',
                display: 'flex', flexDirection: 'column',
              }}>
                {pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl}
                    title="Đề PDF — đối chiếu khi nhập đáp án"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <div style={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12,
                    color: '#94a3b8', padding: 24, textAlign: 'center',
                  }}>
                    <FileCode2 size={48} style={{ opacity: 0.4 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fbcfe8' }}>
                      Chưa có PDF để đối chiếu
                    </div>
                    <div style={{ fontSize: 11.5, maxWidth: 260, lineHeight: 1.5 }}>
                      Đóng modal này, bấm <strong style={{ color: '#4ade80' }}>Biên dịch</strong> để
                      tạo PDF trước → quay lại để xem song song với phiếu đáp án bên phải.
                    </div>
                    <button
                      onClick={() => setPdfExamModalOpen(false)}
                      style={{
                        marginTop: 6, padding: '8px 16px', borderRadius: 8,
                        background: '#16a34a', border: 'none', color: '#fff',
                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Đóng để biên dịch
                    </button>
                  </div>
                )}
              </div>

              {/* ─── RIGHT: Answer sheet ─── */}
              <div style={{
                flex: '1 1 50%', minWidth: 0, background: '#fdf2f8',
                overflowY: 'auto', padding: 16,
              }}>
                {/* ── PHẦN I — Trắc nghiệm A/B/C/D ── */}
                <PhanISheet
                  answers={pdfExamPhanI}
                  onChange={setPdfExamPhanI}
                />

                {/* ── PHẦN II — Đúng/Sai 4 mệnh đề ── */}
                <PhanIISheet
                  answers={pdfExamPhanII}
                  onChange={setPdfExamPhanII}
                />

                {/* ── PHẦN III — Trả lời ngắn ── */}
                <PhanIIISheet
                  answers={pdfExamPhanIII}
                  onChange={setPdfExamPhanIII}
                />

                {/* ── PHẦN IV — Tự luận (AI chấm) ── */}
                <PhanIVSheet
                  questions={pdfExamPhanIV}
                  onChange={setPdfExamPhanIV}
                />
              </div>
            </div>

            {/* Submit — sticky footer outside split body */}
            <div style={{
              display: 'flex', gap: 10, padding: '12px 20px', flexShrink: 0,
              borderTop: '1px solid #fbcfe8', background: '#fdf2f8',
            }}>
              <button
                onClick={() => !pdfExamSubmitting && setPdfExamModalOpen(false)}
                style={{
                  flex: 1, padding: '12px 18px', borderRadius: 10,
                  background: 'white', border: '1px solid #cbd5e1',
                  color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Huỷ
              </button>
              <button
                disabled={pdfExamSubmitting}
                onClick={async () => {
                  if (!id) return
                  const phanIStr = pdfExamPhanI.map(x => x || '-').join('').replace(/-+$/, '')
                  // Trim trailing letters chỉ giữ phần đầu liên tiếp
                  const phanIClean = phanIStr.replace(/-/g, '')
                  // Đếm câu PHẦN II có ít nhất 1 đáp án (T or F)
                  const phanII = pdfExamPhanII.filter(x => /[TF]/.test(x))
                  const phanIII = pdfExamPhanIII.filter(x => x.trim().length > 0)
                  // PHẦN IV: chỉ giữ câu có rubric không rỗng
                  const phanIV = pdfExamPhanIV.filter(q => q.rubric.trim().length > 0)
                  const total = phanIClean.length + phanII.length + phanIII.length + phanIV.length
                  if (total === 0) {
                    toast.error('Hãy tô ít nhất 1 đáp án trước khi tạo đề')
                    return
                  }
                  setPdfExamSubmitting(true)
                  const t = toast.loading('Đang tạo đề PDF…')
                  try {
                    const res = await api.post<{
                      examId: string; examTitle: string; totalQuestions: number;
                      sectionCounts: { phanI: number; phanII: number; phanIII: number; phanIV: number }
                    }>(
                      `/latex-projects/${id}/to-pdf-exam`,
                      {
                        phanIAnswers: phanIClean,
                        phanIIAnswers: phanII,
                        phanIIIAnswers: phanIII,
                        phanIVQuestions: phanIV,
                        public: true,
                      }
                    )
                    toast.success(`✅ Đề ${res.data.totalQuestions} câu (I=${res.data.sectionCounts.phanI}, II=${res.data.sectionCounts.phanII}, III=${res.data.sectionCounts.phanIII}, IV=${res.data.sectionCounts.phanIV})`, { id: t, duration: 4000 })
                    setPdfExamModalOpen(false)
                    setShareExamUrl(`${window.location.origin}/exam-sheet/${res.data.examId}`)
                    setShareExamId(res.data.examId)
                    setShareExamTitle(res.data.examTitle)
                    setShareExamTotalQ(res.data.totalQuestions)
                    setShareModalOpen(true)
                  } catch (err: unknown) {
                    const e = err as { response?: { data?: { error?: string } } }
                    toast.error(e.response?.data?.error || 'Không tạo được đề', { id: t })
                  } finally {
                    setPdfExamSubmitting(false)
                  }
                }}
                style={{
                  flex: 2, padding: '12px 18px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  opacity: pdfExamSubmitting ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                }}
              >
                {pdfExamSubmitting ? 'Đang tạo…' : '📄 Tạo đề PDF ngay →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Phiếu trả lời trực quan — GV click bubble thay vì gõ chữ
   Style match với ảnh mẫu Phiếu Trả Lời Trắc Nghiệm Bộ-GD&ĐT 2026
   ────────────────────────────────────────────────────────────── */

const LETTERS_PI = ['A', 'B', 'C', 'D']

function PhanISheet({
  answers, onChange,
}: { answers: string[]; onChange: (next: string[]) => void }) {
  // Group 40 questions vào 4 cột × 10 dòng giống mẫu phiếu
  const COLS = 4, ROWS = 10
  const total = answers.length
  return (
    <div style={{
      background: '#fce7f3', border: '2px solid #ec4899', borderRadius: 14,
      padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#831843', letterSpacing: '0.05em' }}>
          PHẦN I — Trắc nghiệm A/B/C/D
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#831843' }}>Số câu:</span>
          <button
            onClick={() => total > 1 && onChange(answers.slice(0, total - 1))}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #f9a8d4', color: '#be185d', fontWeight: 700, cursor: 'pointer' }}
          >−</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#831843', minWidth: 26, textAlign: 'center' }}>{total}</span>
          <button
            onClick={() => total < 60 && onChange([...answers, ''])}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #f9a8d4', color: '#be185d', fontWeight: 700, cursor: 'pointer' }}
          >+</button>
          <button
            onClick={() => onChange(Array(total).fill(''))}
            style={{ marginLeft: 6, padding: '3px 10px', borderRadius: 6, background: 'white', border: '1px solid #f9a8d4', color: '#be185d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >Xoá hết</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 14 }}>
        {Array.from({ length: COLS }).map((_, colIdx) => (
          <div key={colIdx} style={{ background: 'white', borderRadius: 8, padding: '10px 8px' }}>
            {/* Header row A B C D */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr', marginBottom: 6, fontSize: 12, fontWeight: 800, color: '#dc2626' }}>
              <span></span>
              {LETTERS_PI.map(L => <span key={L} style={{ textAlign: 'center' }}>{L}</span>)}
            </div>
            {Array.from({ length: ROWS }).map((_, r) => {
              const qIdx = colIdx * ROWS + r
              if (qIdx >= total) return null
              const selected = answers[qIdx]
              return (
                <div key={r} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr', alignItems: 'center', padding: '2px 0' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{qIdx + 1}</span>
                  {LETTERS_PI.map(L => (
                    <button
                      key={L}
                      onClick={() => {
                        const next = [...answers]
                        next[qIdx] = next[qIdx] === L ? '' : L
                        onChange(next)
                      }}
                      style={{
                        margin: '0 auto', width: 18, height: 18, borderRadius: '50%',
                        background: selected === L ? '#0f172a' : 'white',
                        border: `1.5px solid ${selected === L ? '#0f172a' : '#fbbf24'}`,
                        cursor: 'pointer', padding: 0,
                      }}
                      aria-label={`Câu ${qIdx + 1} đáp án ${L}`}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function PhanIISheet({
  answers, onChange,
}: { answers: string[]; onChange: (next: string[]) => void }) {
  const SUBS = ['a', 'b', 'c', 'd']
  const total = answers.length
  const setSub = (qi: number, sj: number, val: 'T' | 'F') => {
    const next = [...answers]
    const cur = (next[qi] || '----').padEnd(4, '-').slice(0, 4).split('')
    cur[sj] = cur[sj] === val ? '-' : val
    next[qi] = cur.join('')
    onChange(next)
  }
  return (
    <div style={{
      background: '#fce7f3', border: '2px solid #ec4899', borderRadius: 14,
      padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#831843', letterSpacing: '0.05em' }}>
          PHẦN II — Đúng/Sai (4 mệnh đề a/b/c/d mỗi câu)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#831843' }}>Số câu:</span>
          <button
            onClick={() => total > 1 && onChange(answers.slice(0, total - 1))}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #f9a8d4', color: '#be185d', fontWeight: 700, cursor: 'pointer' }}
          >−</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#831843', minWidth: 26, textAlign: 'center' }}>{total}</span>
          <button
            onClick={() => total < 12 && onChange([...answers, '----'])}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #f9a8d4', color: '#be185d', fontWeight: 700, cursor: 'pointer' }}
          >+</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        {answers.map((val, qi) => {
          const cur = (val || '----').padEnd(4, '-').slice(0, 4)
          return (
            <div key={qi} style={{ background: 'white', borderRadius: 8, padding: '8px 10px' }}>
              <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#0f172a', margin: '0 0 6px' }}>Câu {qi + 1}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr', gap: 4, marginBottom: 4, fontSize: 10, fontWeight: 800, color: '#dc2626', textAlign: 'center' }}>
                <span></span><span>Đúng</span><span>Sai</span>
              </div>
              {SUBS.map((s, si) => (
                <div key={s} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 1fr', gap: 4, alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#475569' }}>{s})</span>
                  <button
                    onClick={() => setSub(qi, si, 'T')}
                    style={{
                      margin: '0 auto', width: 16, height: 16, borderRadius: '50%',
                      background: cur[si] === 'T' ? '#0f172a' : 'white',
                      border: `1.5px solid ${cur[si] === 'T' ? '#0f172a' : '#fca5a5'}`,
                      cursor: 'pointer', padding: 0,
                    }}
                    aria-label={`Câu ${qi + 1} ${s} đúng`}
                  />
                  <button
                    onClick={() => setSub(qi, si, 'F')}
                    style={{
                      margin: '0 auto', width: 16, height: 16, borderRadius: '50%',
                      background: cur[si] === 'F' ? '#0f172a' : 'white',
                      border: `1.5px solid ${cur[si] === 'F' ? '#0f172a' : '#fca5a5'}`,
                      cursor: 'pointer', padding: 0,
                    }}
                    aria-label={`Câu ${qi + 1} ${s} sai`}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PhanIVSheet({
  questions, onChange,
}: {
  questions: { rubric: string; maxScore: number }[]
  onChange: (next: { rubric: string; maxScore: number }[]) => void
}) {
  const total = questions.length
  return (
    <div style={{
      background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 14,
      padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#78350f', letterSpacing: '0.05em' }}>
          PHẦN IV — Tự luận (AI chấm theo rubric)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#78350f' }}>Số câu:</span>
          <button
            onClick={() => total > 0 && onChange(questions.slice(0, total - 1))}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #fbbf24', color: '#b45309', fontWeight: 700, cursor: 'pointer' }}
          >−</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#78350f', minWidth: 26, textAlign: 'center' }}>{total}</span>
          <button
            onClick={() => total < 8 && onChange([...questions, { rubric: '', maxScore: 1 }])}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #fbbf24', color: '#b45309', fontWeight: 700, cursor: 'pointer' }}
          >+</button>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 10px' }}>
        Nhập tiêu chí chấm cho từng câu tự luận. AI sẽ đối chiếu bài làm của học sinh với rubric để chấm điểm tự động.
      </p>
      {total === 0 ? (
        <p style={{ fontSize: 13, color: '#92400e', textAlign: 'center', padding: '10px 0', margin: 0 }}>
          Bấm <strong>+</strong> để thêm câu tự luận nếu đề PDF có
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map((q, qi) => (
            <div key={qi} style={{ background: 'white', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a' }}>Câu {qi + 1}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#64748b' }}>Điểm tối đa:</label>
                  <input
                    type="number"
                    step="0.25"
                    min={0.25}
                    max={10}
                    value={q.maxScore}
                    onChange={e => {
                      const v = Math.max(0.25, Math.min(10, parseFloat(e.target.value) || 1))
                      const next = [...questions]
                      next[qi] = { ...next[qi], maxScore: v }
                      onChange(next)
                    }}
                    style={{
                      width: 70, padding: '4px 8px',
                      border: '1px solid #cbd5e1', borderRadius: 6,
                      fontSize: 13, fontWeight: 700, textAlign: 'right',
                      background: '#ffffff', color: '#0f172a',
                    }}
                  />
                </div>
              </div>
              <textarea
                value={q.rubric}
                onChange={e => {
                  const next = [...questions]
                  next[qi] = { ...next[qi], rubric: e.target.value }
                  onChange(next)
                }}
                placeholder={
                  'Vd:\n' +
                  '- Bước 1: Viết phương trình bảo toàn năng lượng (0.5đ)\n' +
                  '- Bước 2: Tính v khi qua VTCB = √(2gh) (0.5đ)\n' +
                  '- Bước 3: Kết quả số v ≈ 3.13 m/s (0.5đ)\n' +
                  '- Đơn vị + làm tròn đúng (0.5đ)'
                }
                rows={5}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 10px',
                  border: '1px solid #fbbf24', borderRadius: 6,
                  fontSize: 13, fontFamily: 'inherit',
                  background: '#ffffff', color: '#0f172a', resize: 'vertical',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PhanIIISheet({
  answers, onChange,
}: { answers: string[]; onChange: (next: string[]) => void }) {
  const total = answers.length
  return (
    <div style={{
      background: '#fce7f3', border: '2px solid #ec4899', borderRadius: 14,
      padding: 14, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#831843', letterSpacing: '0.05em' }}>
          PHẦN III — Trả lời ngắn (số / biểu thức)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#831843' }}>Số câu:</span>
          <button
            onClick={() => total > 1 && onChange(answers.slice(0, total - 1))}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #f9a8d4', color: '#be185d', fontWeight: 700, cursor: 'pointer' }}
          >−</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#831843', minWidth: 26, textAlign: 'center' }}>{total}</span>
          <button
            onClick={() => total < 12 && onChange([...answers, ''])}
            style={{ width: 26, height: 26, borderRadius: 6, background: 'white', border: '1px solid #f9a8d4', color: '#be185d', fontWeight: 700, cursor: 'pointer' }}
          >+</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {answers.map((val, qi) => (
          <div key={qi} style={{ background: 'white', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#0f172a', margin: '0 0 6px' }}>Câu {qi + 1}</p>
            <input
              type="text"
              value={val}
              onChange={e => {
                const next = [...answers]
                next[qi] = e.target.value
                onChange(next)
              }}
              placeholder="0.4"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 10px',
                border: '1.5px solid #fca5a5', borderRadius: 6,
                fontSize: 14, fontFamily: 'ui-monospace, monospace',
                textAlign: 'center', fontWeight: 700,
                // Fix contrast: ép bg trắng + chữ đen, tránh dark mode browser default
                // làm input bg dark mà text vẫn dark → invisible (theo phản hồi user)
                background: '#ffffff', color: '#0f172a',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
