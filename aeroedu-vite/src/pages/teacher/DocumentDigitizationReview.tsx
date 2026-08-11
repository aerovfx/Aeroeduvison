/**
 * DocumentDigitizationReview — Màn hình duyệt kết quả số hoá tài liệu.
 * Xem văn bản trích xuất + bản gốc file, tải tài liệu, chép văn bản,
 * xử lý lại (reprocess qua AI) và sửa trạng thái lỗi khi cần.
 */

import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  X, Download, CheckCircle2, Loader2, FileText,
  Copy, RefreshCw, Brain, Eye, XCircle, type LucideIcon,
} from "lucide-react"
import toast from "react-hot-toast"

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
  green: '#22c55e',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#eab308',
} as const

/* ── Types ── */
interface ProcessingLog {
  stage: string
  message: string
  createdAt: string
}

interface AiAnalysis {
  type?: string
  keyTopics?: string[]
  summary?: string
  restructuredText?: string
  layoutAnalysis?: {
    regions?: Array<{ type: string; position?: string; content?: string }>
  }
  structure?: {
    sections?: Array<{ title: string; content?: string }>
    layout?: {
      hasHeader?: boolean; hasFooter?: boolean; hasImages?: boolean
      hasTables?: boolean; columns?: number
    }
  }
  metadata?: { wordCount?: number; characterCount?: number; estimatedPages?: number }
  ocrResult?: { confidence?: number; totalLines?: number }
}

interface DocMetadata {
  pages?: number
  ocrResult?: { confidence?: number; totalLines?: number }
  aiAnalysis?: AiAnalysis
  resultFile?: { url?: string; fileName?: string }
}

interface Document {
  id: string
  name: string
  displayName: string
  originalUrl: string
  digitizedUrl?: string
  status: string
  ocrText?: string
  createdAt: string
  processedAt?: string
  mimeType?: string
  metadata?: DocMetadata
  processingLogs?: ProcessingLog[]
  processingError?: string
}

type TabId = 'comparison' | 'text' | 'restructured' | 'analysis' | 'logs'

/* ── Status badge ── */
const STATUS_C: Record<string, { bg: string; color: string; border: string }> = {
  'Hoàn tất':    { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  'Đang xử lý':  { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  'Lỗi':         { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  'Hàng đợi':    { bg: 'rgba(148,163,184,0.12)',color: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
}
// Hiển thị badge trạng thái xử lý của tài liệu
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_C[status] ?? STATUS_C['Hàng đợi']
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600,
    }}>{status}</span>
  )
}

/* ── Btn helpers ── */
function Btn({
  onClick, disabled, children, variant = 'secondary', title,
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  title?: string
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: D.purple, color: '#fff', border: 'none' },
    secondary: { background: D.card2, color: D.text, border: `1px solid ${D.border2}` },
    danger:    { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    ghost:     { background: 'transparent', color: D.muted, border: 'none' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...styles[variant],
        borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        padding: '7px 14px', fontSize: 13, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'opacity 0.15s',
      }}
    >{children}</button>
  )
}

/* ── Card helper ── */
function Panel({ title, subtitle, children, action }: {
  title?: React.ReactNode; subtitle?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div style={{
      background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%',
    }}>
      {(title || action) && (
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${D.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            {title && <div style={{ color: D.text, fontWeight: 700, fontSize: 15 }}>{title}</div>}
            {subtitle && <div style={{ color: D.muted, fontSize: 13, marginTop: 3 }}>{subtitle}</div>}
          </div>
          {action && <div style={{ display: 'flex', gap: 8 }}>{action}</div>}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

/* ── Empty state ── */
function Empty({ icon: Icon, text, sub, action }: {
  icon: LucideIcon
  text: string; sub?: string; action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: D.muted, padding: 32 }}>
      <Icon size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
      <p style={{ fontWeight: 600, margin: '0 0 6px', color: D.text }}>{text}</p>
      {sub && <p style={{ fontSize: 13, margin: 0 }}>{sub}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

/* ── Utility ── */
function getFileUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('/uploads/')) return `/api/documents/file/${url.replace('/uploads/', '')}`
  if (url.startsWith('/api/') || url.startsWith('http://') || url.startsWith('https://')) return url
  const clean = url.replace(/^\//, '')
  if (clean.startsWith('documents/')) return `/api/documents/file/${clean}`
  return `/api/documents/file/${clean}`
}

/* ════════════════════════════════ Main Page ════════════════════════════════ */
// Component chính: hiển thị chi tiết kết quả số hoá + các hành động tải/chép/xử lý lại
export default function DocumentDigitizationReview() {
  const { id: documentId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('comparison')

  const fetchDocument = useCallback(async () => {
    if (!documentId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/documents/${documentId}`)
      if (!res.ok) throw new Error('Failed to fetch document')
      const data = await res.json()
      setDoc(data.document)
    } catch {
      toast.error('Không thể tải tài liệu')
      navigate('/teacher/document-digitization')
    } finally {
      setLoading(false)
    }
  }, [documentId, navigate])

  useEffect(() => { fetchDocument() }, [fetchDocument])

  /* ── Actions ── */
  const handleDownload = async () => {
    if (!doc) return
    try {
      const resultFile = doc.metadata?.resultFile
      const digitizedUrl = doc.digitizedUrl

      if (resultFile?.url || digitizedUrl) {
        const fileUrl = resultFile?.url || digitizedUrl!
        const fileName = resultFile?.fileName || `${doc.displayName || doc.name}_digitized.txt`
        let downloadUrl = fileUrl.startsWith('/uploads/')
          ? `/api/documents/file/${fileUrl.replace('/uploads/', '')}`
          : fileUrl
        const a = window.document.createElement('a')
        a.href = downloadUrl; a.download = fileName
        window.document.body.appendChild(a); a.click(); window.document.body.removeChild(a)
        toast.success('Đã tải kết quả số hóa')
      } else if (doc.ocrText) {
        toast.loading('Đang tạo file kết quả...', { id: 'save-result' })
        const res = await fetch(`/api/documents/${doc.id}/save-result`, { method: 'POST' })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Không thể tạo file') }
        const data = await res.json()
        const downloadUrl = data.file.url.startsWith('/uploads/')
          ? `/api/documents/file/${data.file.url.replace('/uploads/', '')}`
          : data.file.url
        const a = window.document.createElement('a')
        a.href = downloadUrl; a.download = data.file.fileName
        window.document.body.appendChild(a); a.click(); window.document.body.removeChild(a)
        toast.success('Đã tải kết quả số hóa', { id: 'save-result' })
        fetchDocument()
      } else {
        toast.error('Bản số hoá chưa sẵn sàng')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải file', { id: 'save-result' })
    }
  }

  const handleCopyText = () => {
    if (doc?.ocrText) {
      navigator.clipboard.writeText(doc.ocrText)
      toast.success('Đã copy text vào clipboard')
    }
  }

  // Xử lý lại tài liệu: gọi lại pipeline AI và refresh kết quả
  const handleReprocess = async () => {
    if (!doc) return
    try {
      setProcessing(true)
      toast.loading('Đang số hóa lại tài liệu...', { id: 'reprocess' })
      const res = await fetch(`/api/documents/${doc.id}/process`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json()
        const msg = e.error || e.message || 'Failed to process'
        throw new Error(msg.includes('OCR service') ? `${msg}\n\n💡 Khởi động OCR service tại http://localhost:8001` : msg)
      }
      toast.success('Đã bắt đầu số hóa lại', { id: 'reprocess' })
      setTimeout(fetchDocument, 2000)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể số hóa lại', { id: 'reprocess', duration: 6000 })
    } finally {
      setProcessing(false)
    }
  }

  const handleFixStatus = async () => {
    if (!doc) return
    try {
      setProcessing(true)
      toast.loading('Đang sửa status...', { id: 'fix-status' })
      const res = await fetch('/api/documents/fix-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to fix status') }
      const data = await res.json()
      toast.success(data.message || 'Đã sửa status', { id: 'fix-status' })
      setTimeout(fetchDocument, 1000)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể sửa status', { id: 'fix-status' })
    } finally {
      setProcessing(false)
    }
  }

  /* ── Loading / not found ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: D.bg }}>
      <Loader2 size={40} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite' }} />
    </div>
  )
  if (!doc) return null

  const hasInvalidStatus = doc.status === 'Hoàn tất' && !doc.ocrText

  const TABS: { id: TabId; label: string }[] = [
    { id: 'comparison',   label: 'So sánh' },
    { id: 'text',         label: 'Text đã số hóa' },
    { id: 'restructured', label: 'Văn bản tái cấu trúc' },
    { id: 'analysis',     label: 'Phân tích AI' },
    { id: 'logs',         label: 'Log xử lý' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: D.bg, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        borderBottom: `1px solid ${D.border}`, background: D.card,
        padding: '14px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ color: D.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{doc.displayName}</h1>
          <p style={{ color: D.muted, fontSize: 13, margin: '3px 0 0' }}>
            {new Date(doc.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasInvalidStatus && (
            <Btn onClick={handleFixStatus} disabled={processing} variant="secondary">
              <RefreshCw size={14} style={processing ? { animation: 'spin 1s linear infinite' } : {}} />
              Sửa Status
            </Btn>
          )}
          <StatusBadge status={doc.status} />
          {doc.status === 'Hoàn tất' && doc.ocrText && (
            <Btn onClick={handleDownload} variant="primary">
              <Download size={14} /> Tải kết quả số hóa
            </Btn>
          )}
          <Btn onClick={() => navigate(-1)} variant="ghost" title="Đóng">
            <X size={16} />
          </Btn>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        padding: '12px 24px 0', background: D.card,
        borderBottom: `1px solid ${D.border}`, flexShrink: 0,
        display: 'flex', gap: 4,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === t.id ? `2px solid ${D.purple}` : '2px solid transparent',
              color: activeTab === t.id ? D.purple : D.muted,
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
              padding: '8px 18px 10px',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>

        {/* ── 1. So sánh ── */}
        {activeTab === 'comparison' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
            {/* Original */}
            <Panel title="Bản gốc">
              {doc.originalUrl ? (
                doc.mimeType === 'application/pdf' ? (
                  <iframe
                    src={getFileUrl(doc.originalUrl)}
                    style={{ width: '100%', height: '100%', minHeight: 600, border: `1px solid ${D.border}`, borderRadius: 8 }}
                    title="Original Document"
                  />
                ) : (
                  <img
                    src={getFileUrl(doc.originalUrl)}
                    alt="Original"
                    style={{ width: '100%', height: 'auto', borderRadius: 8 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )
              ) : (
                <Empty icon={FileText} text="Không có bản gốc" />
              )}
            </Panel>

            {/* Digitized */}
            <Panel
              title="Bản số hoá"
              action={
                doc.status !== 'Hoàn tất' && doc.status !== 'Đang xử lý'
                  ? <Btn onClick={handleReprocess} disabled={processing} variant="secondary">
                      <RefreshCw size={13} style={processing ? { animation: 'spin 1s linear infinite' } : {}} />
                      Số hóa lại
                    </Btn>
                  : undefined
              }
            >
              {doc.status === 'Hoàn tất' ? (
                <div>
                  {(() => {
                    const dUrl = doc.digitizedUrl
                    const isResultFile = dUrl?.endsWith('.txt') || dUrl?.endsWith('.md')
                    const isImage = doc.mimeType?.startsWith('image/')
                    const isPdf = doc.mimeType === 'application/pdf'
                    const displayUrl = (dUrl && !isResultFile && (isImage || isPdf)) ? dUrl : doc.originalUrl
                    if (!displayUrl) return null
                    if (doc.mimeType === 'application/pdf') {
                      return <iframe src={getFileUrl(displayUrl)} style={{ width: '100%', height: 600, border: `1px solid ${D.border}`, borderRadius: 8 }} title="Digitized" />
                    } else if (doc.mimeType?.startsWith('image/')) {
                      return <img src={getFileUrl(displayUrl)} alt="Digitized" style={{ width: '100%', height: 'auto', borderRadius: 8 }} />
                    } else {
                      return (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                          <FileText size={48} style={{ color: D.muted, marginBottom: 12 }} />
                          <p style={{ color: D.muted, fontSize: 14, marginBottom: 16 }}>File đã được xử lý. Vui lòng tải xuống để xem.</p>
                          <Btn onClick={handleDownload} variant="secondary"><Download size={13} />Tải kết quả</Btn>
                        </div>
                      )
                    }
                  })()}
                  {doc.ocrText && (
                    <div style={{
                      marginTop: 16, background: 'rgba(59,130,246,0.08)',
                      border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: 13 }}>Text đã trích xuất (OCR)</span>
                        <Btn onClick={handleCopyText} variant="ghost" title="Copy text"><Copy size={13} /></Btn>
                      </div>
                      <pre style={{
                        color: D.text, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'monospace',
                        background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12,
                        maxHeight: 300, overflowY: 'auto', margin: 0,
                      }}>{doc.ocrText}</pre>
                      {doc.metadata?.ocrResult && (
                        <div style={{ color: '#60a5fa', fontSize: 12, marginTop: 8 }}>
                          Độ tin cậy: {((doc.metadata.ocrResult.confidence || 0) * 100).toFixed(1)}% •
                          Số dòng: {doc.metadata.ocrResult.totalLines || 0}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : doc.status === 'Đang xử lý' ? (
                <Empty icon={Loader2} text="Đang xử lý với AI..." sub="Vui lòng đợi trong giây lát" />
              ) : doc.status === 'Lỗi' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 14, padding: 32, textAlign: 'center', maxWidth: 360,
                  }}>
                    <XCircle size={48} style={{ color: '#f87171', marginBottom: 16 }} />
                    <h3 style={{ color: '#f87171', fontWeight: 700, margin: '0 0 10px' }}>Xử lý thất bại</h3>
                    <p style={{ color: D.muted, fontSize: 14, margin: '0 0 16px' }}>
                      {doc.processingError || 'Không thể trích xuất text. OCR service có thể không khả dụng.'}
                    </p>
                    <Btn onClick={handleReprocess} disabled={processing} variant="danger">
                      <RefreshCw size={13} style={processing ? { animation: 'spin 1s linear infinite' } : {}} />
                      {processing ? 'Đang xử lý...' : 'Số hóa lại'}
                    </Btn>
                  </div>
                </div>
              ) : (
                <Empty icon={FileText} text="Bản số hoá chưa sẵn sàng"
                  action={<Btn onClick={handleReprocess} disabled={processing} variant="secondary">
                    <RefreshCw size={13} />Số hóa ngay
                  </Btn>}
                />
              )}
            </Panel>
          </div>
        )}

        {/* ── 2. Text đã số hóa ── */}
        {activeTab === 'text' && (
          <Panel
            title="Text đã số hóa"
            subtitle="Nội dung đã được trích xuất từ tài liệu bằng OCR"
            action={doc.ocrText ? <>
              <Btn onClick={handleCopyText} variant="secondary"><Copy size={13} />Copy</Btn>
              <Btn onClick={handleDownload} variant="secondary" title="Tải kết quả số hóa cuối cùng"><Download size={13} />Tải kết quả</Btn>
            </> : undefined}
          >
            {doc.ocrText ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10, padding: 16,
                }}>
                  <pre style={{ color: D.text, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {doc.ocrText}
                  </pre>
                </div>
                {doc.metadata?.ocrResult && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Độ tin cậy', value: `${((doc.metadata.ocrResult.confidence || 0) * 100).toFixed(1)}%`, color: '#60a5fa' },
                      { label: 'Số dòng',    value: String(doc.metadata.ocrResult.totalLines || 0),                    color: '#4ade80' },
                      { label: 'Số ký tự',   value: doc.ocrText.length.toLocaleString(),                               color: '#a78bfa' },
                    ].map(s => (
                      <div key={s.label} style={{
                        background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10, padding: 16, textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: D.muted, marginTop: 4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Empty icon={FileText} text="Chưa có text đã số hóa"
                action={doc.status !== 'Đang xử lý'
                  ? <Btn onClick={handleReprocess} disabled={processing} variant="secondary">
                      <RefreshCw size={13} />Số hóa ngay
                    </Btn>
                  : undefined
                }
              />
            )}
          </Panel>
        )}

        {/* ── 3. Văn bản tái cấu trúc ── */}
        {activeTab === 'restructured' && (
          <Panel
            title={<><Brain size={16} style={{ display: 'inline', marginRight: 6, color: D.purple }} />Văn bản đã tái cấu trúc</>}
            subtitle="Văn bản đã được AI tổ chức lại với định dạng rõ ràng và cấu trúc tốt hơn"
            action={doc.metadata?.aiAnalysis?.restructuredText ? <>
              <Btn variant="secondary" onClick={() => {
                navigator.clipboard.writeText(doc.metadata!.aiAnalysis!.restructuredText!)
                toast.success('Đã copy văn bản tái cấu trúc')
              }}><Copy size={13} />Copy</Btn>
              <Btn variant="secondary" onClick={() => {
                const blob = new Blob([doc.metadata!.aiAnalysis!.restructuredText!], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = window.document.createElement('a')
                a.href = url; a.download = `${doc.displayName || doc.name}_restructured.txt`
                window.document.body.appendChild(a); a.click(); window.document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast.success('Đã tải văn bản tái cấu trúc')
              }}><Download size={13} />Tải về</Btn>
            </> : undefined}
          >
            {doc.metadata?.aiAnalysis?.restructuredText ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Brain size={16} style={{ color: D.purple }} />
                    <span style={{ color: D.purple, fontWeight: 700, fontSize: 13 }}>Văn bản đã được AI tái cấu trúc</span>
                  </div>
                  <p style={{ color: '#c4b5fd', fontSize: 13, margin: 0 }}>
                    Văn bản đã được tổ chức lại với định dạng rõ ràng, headings, paragraphs và cấu trúc logic.
                  </p>
                </div>

                <div style={{
                  background: D.card2, border: `2px solid rgba(124,58,237,0.3)`,
                  borderRadius: 12, padding: 20,
                }}>
                  <pre style={{ color: D.text, fontSize: 13, fontFamily: 'sans-serif', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>
                    {doc.metadata.aiAnalysis.restructuredText}
                  </pre>
                </div>

                {doc.ocrText && (
                  <div style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 10, padding: 16 }}>
                    <div style={{ color: D.text, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>So sánh với văn bản gốc</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ color: D.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Văn bản gốc (OCR)</div>
                        <div style={{
                          background: D.card, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12,
                          maxHeight: 160, overflowY: 'auto',
                        }}>
                          <pre style={{ color: D.muted, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                            {doc.ocrText.substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Văn bản tái cấu trúc</div>
                        <div style={{
                          background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
                          borderRadius: 8, padding: 12, maxHeight: 160, overflowY: 'auto',
                        }}>
                          <pre style={{ color: '#c4b5fd', fontSize: 12, fontFamily: 'sans-serif', whiteSpace: 'pre-wrap', margin: 0 }}>
                            {doc.metadata.aiAnalysis.restructuredText.substring(0, 500)}...
                          </pre>
                        </div>
                      </div>
                    </div>
                    <div style={{ color: D.muted, fontSize: 12, marginTop: 10 }}>
                      💡 Văn bản tái cấu trúc có định dạng rõ ràng hơn, dễ đọc và tổ chức tốt hơn
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Empty icon={Brain} text="Chưa có văn bản tái cấu trúc"
                sub="Văn bản tái cấu trúc sẽ xuất hiện sau khi phân tích AI hoàn tất"
                action={doc.status === 'Hoàn tất' && !doc.metadata?.aiAnalysis
                  ? <Btn onClick={handleReprocess} disabled={processing} variant="secondary">
                      <RefreshCw size={13} />Số hóa lại để tạo văn bản tái cấu trúc
                    </Btn>
                  : undefined
                }
              />
            )}
          </Panel>
        )}

        {/* ── 4. Phân tích AI ── */}
        {activeTab === 'analysis' && (
          <Panel
            title={<><Brain size={16} style={{ display: 'inline', marginRight: 6, color: D.purple }} />Phân tích AI</>}
            subtitle="Kết quả phân tích nội dung và cấu trúc tài liệu bằng AI"
          >
            {doc.metadata?.aiAnalysis ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Purpose overview */}
                <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Brain size={16} style={{ color: D.purple }} />
                    <span style={{ color: D.purple, fontWeight: 700 }}>Mục đích Phân tích AI</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { emoji: '📋', title: 'Xác định loại tài liệu', sub: 'Đề thi, Sách giáo khoa, Ngân hàng câu hỏi...' },
                      { emoji: '📚', title: 'Phân tích cấu trúc', sub: 'Các phần, chương, bài trong tài liệu' },
                      { emoji: '🏷️', title: 'Trích xuất chủ đề', sub: 'Toán, Văn, Lý, Hóa, Sinh, Sử, Địa...' },
                      { emoji: '📝', title: 'Tóm tắt nội dung', sub: 'Tóm tắt ngắn gọn nội dung chính' },
                      { emoji: '🔄', title: 'Tái cấu trúc văn bản', sub: 'Tổ chức lại với định dạng rõ ràng' },
                      { emoji: '🖼️', title: 'Phân tích layout', sub: 'Bố cục, vị trí các phần trong hình ảnh' },
                    ].map(i => (
                      <div key={i.title} style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{i.emoji}</span>
                        <div>
                          <div style={{ color: D.text, fontSize: 13, fontWeight: 600 }}>{i.title}</div>
                          <div style={{ color: D.muted, fontSize: 12 }}>{i.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Document type */}
                <Section title="Loại tài liệu">
                  <span style={{
                    background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
                    color: '#a78bfa', borderRadius: 8, padding: '6px 14px', fontSize: 15, fontWeight: 700,
                  }}>
                    {doc.metadata.aiAnalysis.type === 'exam' && '📝 Đề thi'}
                    {doc.metadata.aiAnalysis.type === 'textbook' && '📚 Sách giáo khoa'}
                    {doc.metadata.aiAnalysis.type === 'question_bank' && '📚 Ngân hàng câu hỏi'}
                    {doc.metadata.aiAnalysis.type === 'document' && '📄 Tài liệu'}
                    {!doc.metadata.aiAnalysis.type && '—'}
                  </span>
                </Section>

                {/* Key topics */}
                {doc.metadata.aiAnalysis.keyTopics && doc.metadata.aiAnalysis.keyTopics.length > 0 && (
                  <Section title="Chủ đề chính">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {doc.metadata.aiAnalysis.keyTopics.map((t, i) => (
                        <span key={i} style={{
                          background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                          border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20,
                          padding: '3px 12px', fontSize: 13,
                        }}>{t}</span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Summary */}
                {doc.metadata.aiAnalysis.summary && (
                  <Section title="Tóm tắt">
                    <p style={{ color: D.muted, fontSize: 14, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {doc.metadata.aiAnalysis.summary}
                    </p>
                  </Section>
                )}

                {/* Structure */}
                {doc.metadata.aiAnalysis.structure?.sections && doc.metadata.aiAnalysis.structure.sections.length > 0 && (
                  <Section title={`Cấu trúc (${doc.metadata.aiAnalysis.structure.sections.length} phần)`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {doc.metadata.aiAnalysis.structure.sections.map((s, i) => (
                        <div key={i} style={{
                          background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12,
                        }}>
                          <div style={{ color: D.text, fontWeight: 600, fontSize: 13 }}>{s.title}</div>
                          {s.content && (
                            <div style={{ color: D.muted, fontSize: 12, marginTop: 4 }}>
                              {s.content.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Restructured text in analysis tab too */}
                {doc.metadata.aiAnalysis.restructuredText && (
                  <Section title="Văn bản đã tái cấu trúc" action={
                    <>
                      <Btn variant="secondary" onClick={() => {
                        navigator.clipboard.writeText(doc.metadata!.aiAnalysis!.restructuredText!)
                        toast.success('Đã copy')
                      }}><Copy size={13} />Copy</Btn>
                      <Btn variant="secondary" onClick={() => {
                        const blob = new Blob([doc.metadata!.aiAnalysis!.restructuredText!], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = window.document.createElement('a')
                        a.href = url; a.download = `${doc.displayName}_restructured.txt`
                        window.document.body.appendChild(a); a.click(); window.document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}><Download size={13} />Tải về</Btn>
                    </>
                  }>
                    <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: 14 }}>
                      <pre style={{ color: D.text, fontSize: 13, fontFamily: 'sans-serif', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto', margin: 0 }}>
                        {doc.metadata.aiAnalysis.restructuredText}
                      </pre>
                    </div>
                    <div style={{ color: D.muted, fontSize: 12, marginTop: 8 }}>
                      💡 Văn bản đã được AI tái cấu trúc để dễ đọc, giữ nguyên nội dung gốc
                    </div>
                  </Section>
                )}

                {/* Layout analysis */}
                {doc.metadata.aiAnalysis.layoutAnalysis && (
                  <Section title="Phân tích Layout" subtitle="Phân tích bố cục và cấu trúc hình ảnh của tài liệu">
                    {doc.metadata.aiAnalysis.layoutAnalysis.regions && doc.metadata.aiAnalysis.layoutAnalysis.regions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {doc.metadata.aiAnalysis.layoutAnalysis.regions.map((r, i) => (
                          <div key={i} style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: r.content ? 6 : 0 }}>
                              <span style={{
                                background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                                border: '1px solid rgba(124,58,237,0.25)', borderRadius: 6, padding: '2px 10px', fontSize: 12,
                              }}>
                                {r.type === 'text' ? '📝 Text' : r.type === 'image' ? '🖼️ Hình ảnh' : r.type === 'table' ? '📊 Bảng' : r.type === 'formula' ? '🔢 Công thức' : r.type}
                              </span>
                              {r.position && (
                                <span style={{ color: D.muted, fontSize: 12, padding: '2px 8px' }}>{r.position}</span>
                              )}
                            </div>
                            {r.content && <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>{r.content}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: D.muted, fontSize: 14 }}>Không có thông tin layout chi tiết</p>
                    )}
                    {doc.metadata.aiAnalysis.structure?.layout && (
                      <div style={{
                        marginTop: 12, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)',
                        borderRadius: 8, padding: 12,
                      }}>
                        <div style={{ color: D.text, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Thông tin Layout:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                          {[
                            [doc.metadata.aiAnalysis.structure.layout.hasHeader, '✓ Có Header'],
                            [doc.metadata.aiAnalysis.structure.layout.hasFooter, '✓ Có Footer'],
                            [doc.metadata.aiAnalysis.structure.layout.hasImages, '✓ Có Hình ảnh'],
                            [doc.metadata.aiAnalysis.structure.layout.hasTables, '✓ Có Bảng'],
                          ].filter(([v]) => v).map(([, label]) => (
                            <span key={String(label)} style={{ color: '#4ade80', fontSize: 13 }}>{label}</span>
                          ))}
                          {doc.metadata.aiAnalysis.structure.layout.columns && (
                            <span style={{ color: D.muted, fontSize: 13 }}>Số cột: {doc.metadata.aiAnalysis.structure.layout.columns}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </Section>
                )}

                {/* Stats */}
                {doc.metadata.aiAnalysis.metadata && (
                  <Section title="Thống kê">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {[
                        { label: 'Số từ', value: doc.metadata.aiAnalysis.metadata.wordCount?.toLocaleString() || '0' },
                        { label: 'Số ký tự', value: doc.metadata.aiAnalysis.metadata.characterCount?.toLocaleString() || '0' },
                        ...(doc.metadata.aiAnalysis.metadata.estimatedPages
                          ? [{ label: 'Trang ước tính', value: String(doc.metadata.aiAnalysis.metadata.estimatedPages) }]
                          : []),
                      ].map(s => (
                        <div key={s.label} style={{ fontSize: 14 }}>
                          <span style={{ color: D.muted }}>{s.label}: </span>
                          <span style={{ color: D.text, fontWeight: 700 }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            ) : (
              <Empty icon={Brain} text="Chưa có phân tích AI"
                action={
                  <div style={{ textAlign: 'center' }}>
                    {doc.status === 'Hoàn tất' && doc.ocrText ? (
                      <>
                        <p style={{ color: D.muted, fontSize: 14, marginBottom: 12 }}>
                          Tài liệu đã số hóa nhưng chưa có phân tích AI. Phân tích AI sẽ chạy khi bạn số hóa lại.
                        </p>
                        <Btn onClick={handleReprocess} disabled={processing} variant="secondary">
                          <RefreshCw size={13} />Số hóa lại để phân tích AI
                        </Btn>
                      </>
                    ) : doc.status === 'Đang xử lý' ? (
                      <p style={{ color: D.muted, fontSize: 14 }}>Đang xử lý... Phân tích AI sẽ xuất hiện sau khi hoàn tất</p>
                    ) : (
                      <p style={{ color: D.muted, fontSize: 14 }}>Phân tích AI sẽ tự động chạy sau khi số hóa hoàn tất</p>
                    )}
                  </div>
                }
              />
            )}
          </Panel>
        )}

        {/* ── 5. Log xử lý ── */}
        {activeTab === 'logs' && (
          <Panel title="Log xử lý" subtitle="Chi tiết quá trình xử lý tài liệu">
            {doc.processingLogs && doc.processingLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {doc.processingLogs.map((log, i) => {
                  const logColors: Record<string, { bg: string; border: string; iconColor: string }> = {
                    error:      { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   iconColor: '#f87171' },
                    completed:  { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   iconColor: '#4ade80' },
                    ocr:        { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  iconColor: '#60a5fa' },
                    processing: { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.25)',   iconColor: '#fbbf24' },
                  }
                  const c = logColors[log.stage] ?? { bg: D.card2, border: D.border, iconColor: D.muted }
                  const IconMap: Record<string, React.ReactNode> = {
                    error:      <XCircle size={14} style={{ color: c.iconColor }} />,
                    completed:  <CheckCircle2 size={14} style={{ color: c.iconColor }} />,
                    ocr:        <Eye size={14} style={{ color: c.iconColor }} />,
                    processing: <Loader2 size={14} style={{ color: c.iconColor }} />,
                  }
                  return (
                    <div key={i} style={{
                      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {IconMap[log.stage] ?? <CheckCircle2 size={14} style={{ color: D.muted }} />}
                          <span style={{ color: D.text, fontWeight: 600, fontSize: 13 }}>{log.stage}</span>
                        </div>
                        <span style={{ color: D.muted, fontSize: 12 }}>
                          {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                      <p style={{ color: D.muted, fontSize: 13, margin: 0 }}>{log.message}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty icon={FileText} text="Chưa có log xử lý" />
            )}
          </Panel>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: `1px solid ${D.border}`, background: D.card, padding: '12px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: D.muted, fontSize: 13 }}>
          {doc.processedAt
            ? `Hoàn tất: ${new Date(doc.processedAt).toLocaleString('vi-VN')}`
            : `Tải lên: ${new Date(doc.createdAt).toLocaleString('vi-VN')}`}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={() => navigate(-1)} variant="secondary">Đóng</Btn>
          {doc.status === 'Hoàn tất' && (
            <Btn onClick={handleDownload} variant="primary">
              <Download size={14} /> Tải bản số hoá
            </Btn>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Section helper (used inside analysis tab) ── */
function Section({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div style={{ background: '#10111e', border: '1px solid #1e2033', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #1e2033',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{title}</div>
          {subtitle && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action && <div style={{ display: 'flex', gap: 8 }}>{action}</div>}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}
