import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Loader2, FileCode2, Play, Download,
  Printer, History, Share2, Trash2, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { LatexEditor } from '@/components/latex-editor'
import { AiExamDialog } from '@/components/latex-editor/AiExamDialog'
import { LATEX_TEMPLATES, getTemplateById } from '@/lib/latex-templates'
import type { GenerateResult, ExamConfig } from '@/services/latex-ai.service'

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

  const [versions, setVersions] = useState<Version[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const [shareOpen, setShareOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [addingCollab, setAddingCollab] = useState(false)

  const [templateSel, setTemplateSel] = useState('')
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const handleCompile = async () => {
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
  }

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

        {/* AI exam generator */}
        <button
          type="button"
          onClick={() => setAiDialogOpen(true)}
          title="Sinh đề trắc nghiệm / tự luận bằng AI"
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

        {/* Save */}
        <IconBtn onClick={handleSaveClick} disabled={saving}>
          {saving
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <Save size={14} />
          }
          Lưu
        </IconBtn>

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
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <LatexEditor value={content} onChange={setContent} height="100%" />
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

      {/* ── AI exam generator modal ── */}
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
    </div>
  )
}
