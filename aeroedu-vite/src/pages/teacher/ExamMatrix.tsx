/**
 * ExamMatrix — Quản lý ma trận đề thi (kẻ bảng phân bố câu hỏi theo chủ đề & mức độ).
 * Xem/nhập ma trận (upload ảnh số hoá), tạo đề AI từ ma trận, nhân bản, sửa, xoá,
 * xuất LaTeX. Dữ liệu từ /api/exam-matrixes với các modal hỗ trợ từng thao tác.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import {
  Upload, Plus, Search, FileText, Grid3x3, Eye, Edit, Trash2,
  Copy, Loader2, CheckCircle2, XCircle, AlertCircle,
  BarChart3, X, FileCode2, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Dark palette ───────────────────────────────────────────────────────────────────────────────
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


// ─── Types ─────────────────────────────────────────────────────────────────────────────────
type MatrixStatus = 'Tất cả' | 'Hàng đợi' | 'Đang xử lý' | 'Hoàn tất' | 'Lỗi'

interface ExamMatrix {
  id: string
  name: string
  grade: string
  examType: string
  type: string
  status: string
  totalQuestions: number
  createdAt: string
}

// ─── Sample matrices (Bộ GD&ĐT chuẩn) — hiển thị khi danh sách rỗng ─────────────────
const SAMPLE_MATRICES: ExamMatrix[] = [
  {
    id: 'sample-vatli-10-hk2',
    name: 'Ma trận đề kiểm tra cuối học kỳ II — Vật lí 10',
    grade: 'Khối 10',
    examType: 'Học kỳ',
    type: 'Vật lí',
    status: 'Mẫu',
    totalQuestions: 28,
    createdAt: '2025-04-15T08:00:00.000Z',
  },
  {
    id: 'sample-toan-11-hk1',
    name: 'Ma trận đề kiểm tra cuối học kỳ I — Toán 11',
    grade: 'Khối 11',
    examType: 'Học kỳ',
    type: 'Toán',
    status: 'Mẫu',
    totalQuestions: 30,
    createdAt: '2025-04-10T08:00:00.000Z',
  },
]

<<<<<<< HEAD
// ─── Status badge ──────────────────────────────────────────────────────────────────────────────
=======
// ─── Status badge ─────────────────────────────────────────────────────────────
// StatusBadge — trạng thái ma trận (khi nhập/xử lý/sẵn sàng trước khi tạo đề)
>>>>>>> b9c75d3e (clean code)
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    'Hoàn tất':    { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    'Đang xử lý':  { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
    'Hàng đợi':    { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
    'Lỗi':         { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
    'Mẫu':         { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  }
  const c = cfg[status] || cfg['Hàng đợi']
  return (
    <span
      className="px-2 py-1 rounded-md text-xs font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      {status}
    </span>
  )
}

// ─── Digitize Modal ──────────────────────────────────────────────────────────────────────────
interface DigitizeModalProps {
  onClose: () => void
  onSuccess: () => void
}

// DigitizeModal — upload ảnh ma trận để số hoá tự động thành dữ liệu
function DigitizeModal({ onClose, onSuccess }: DigitizeModalProps) {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  const VALID_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/jfif']
  const MAX_SIZE = 50 * 1024 * 1024

  const handleFile = (f: File) => {
    if (!VALID_TYPES.includes(f.type)) { toast.error('Chỉ hỗ trợ PDF hoặc ảnh'); return }
    if (f.size > MAX_SIZE) { toast.error('Kích thước tối đa: 50MB'); return }
    setFile(f)
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const handleRemove = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null); setPreview(null)
  }

  const handleUpload = async () => {
    if (!file) { toast.error('Vui lòng chọn file'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/exam-matrices/digitize', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const data = res.data
      toast.success('Đã tải lên. Hệ thống đang trích xuất nội dung...')
      handleRemove()
      onSuccess()
      onClose()
      if (data.matrix?.id) navigate(`/teacher/exam-matrix/${data.matrix.id}/review`)
    } catch (e: any) {
      toast.error(e.message || 'Không thể tải lên file')
    } finally {
      setUploading(false)
    }
  }

  const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" style={{ background: D.card, border: `1px solid ${D.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: D.text }}>Số hoá ma trận</h3>
            <p className="text-sm" style={{ color: D.muted }}>Tải lên file ma trận để số hoá tự động</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: D.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragActive(true) }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('dm-file-input')?.click()}
            className="rounded-xl p-12 text-center cursor-pointer transition-colors"
            style={{
              border: `2px dashed ${isDragActive ? D.purple : D.border2}`,
              background: isDragActive ? 'rgba(147,51,234,0.05)' : D.card2,
            }}
          >
            <input id="dm-file-input" type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.jfif"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: D.muted }} />
            <p className="text-sm mb-3" style={{ color: D.muted }}>Kéo thả file vào đây</p>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ border: `1px solid ${D.border2}`, color: D.text, background: 'transparent' }}
            >
              Chọn file từ máy tính
            </button>
            <p className="text-xs mt-4" style={{ color: D.muted2 }}>Chỉ hỗ trợ PDF hoặc ảnh • Tối đa 50MB • 1 file mỗi lần</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: D.card2, border: `1px solid ${D.border}` }}>
              {file.type === 'application/pdf'
                ? <FileText className="w-5 h-5 flex-shrink-0" style={{ color: '#f87171' }} />
                : <FileText className="w-5 h-5 flex-shrink-0" style={{ color: D.purple }} />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: D.text }}>{file.name}</p>
                <p className="text-xs" style={{ color: D.muted }}>{fmt(file.size)}</p>
              </div>
              <button onClick={handleRemove} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: D.muted }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#60a5fa' }} />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#93c5fd' }}>Lưu ý</p>
                  <p className="text-sm" style={{ color: '#93c5fd', opacity: 0.8 }}>
                    Sau khi tải lên, hệ thống sẽ tự động phân tích và số hoá ma trận.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              style={{ background: D.purple, color: '#fff', opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</> : <><Upload className="w-4 h-4" />Số hoá ma trận</>}
            </button>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ border: `1px solid ${D.border2}`, color: D.muted }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Generate Exam Modal ──────────────────────────────────────────────────────────────────────────
interface GenerateExamModalProps {
  matrixId: string
  matrixName: string
  onClose: () => void
}

interface RequirementStatus {
  topic: string
  questionType: string
  cognitiveLevel: string
  required: number
  available: number
  status: 'sufficient' | 'insufficient' | 'missing'
}

interface PreviewData {
  matrix: { id: string; name: string; grade: string; examType: string; totalQuestions: number; totalScore: number }
  requirements: RequirementStatus[]
  summary: { totalRequired: number; totalAvailable: number; coverage: number; canGenerate: boolean }
}

// GenerateExamModal — chạy AI sinh đề thi từ ma trận (tùy chọn số mã đề)
function GenerateExamModal({ matrixId, matrixName, onClose }: GenerateExamModalProps) {
  const navigate = useNavigate()
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [title, setTitle] = useState(`${matrixName} - Đề thi`)
  const [description, setDescription] = useState(`Đề thi được tạo từ ma trận: ${matrixName}`)
  const [generating, setGenerating] = useState(false)
  const [exportingLatex, setExportingLatex] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setPreviewLoading(true)
        const res = await api.get(`/exams/generate-from-matrix?matrixId=${matrixId}`)
        if (res.data?.success) setPreviewData(res.data.data)
      } catch { toast.error('Không thể tải preview') }
      finally { setPreviewLoading(false) }
    }
    load()
  }, [matrixId])

  const handleGenerate = async () => {
    if (!title.trim()) { toast.error('Vui lòng nhập tên đề thi'); return }
    setGenerating(true)
    try {
      const res = await api.post('/exams/generate-from-matrix', { matrixId, title, description, useAIForMissing: false })
      const data = res.data
      if (data.success && data.data) {
        toast.success('Đã tạo đề thi từ ma trận!')
        onClose()
        if (data.data.examId && window.confirm('Bạn có muốn mở Soạn LaTeX với đề vừa tạo không?')) {
          try {
            const r = await api.post('/latex-projects/export-from-exam', { examId: data.data.examId })
            if (r.data?.id) { navigate(`/teacher/latex-documents/${r.data.id}`); return }
          } catch {}
        }
        navigate('/teacher/exams')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e?.response?.data?.error || e.message || 'Không thể tạo đề thi')
    } finally { setGenerating(false) }
  }

  const handleExportLatex = async () => {
    setExportingLatex(true)
    try {
      const res = await api.post('/latex-projects/export-from-matrix', { matrixId })
      const data = res.data
      toast.success('Đã tạo tài liệu LaTeX')
      onClose()
      navigate(`/teacher/latex-documents/${data.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Không thể xuất sang LaTeX')
    } finally { setExportingLatex(false) }
  }

  const statusIcon = (s: string) => ({
    sufficient:   <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#34d399' }} />,
    insufficient: <AlertCircle  className="w-4 h-4 flex-shrink-0" style={{ color: '#fbbf24' }} />,
    missing:      <XCircle      className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />,
  }[s] || null)

  const statusColor = (s: string) => ({
    sufficient:   { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
    insufficient: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    missing:      { bg: 'rgba(239,68,68,0.15)',  color: '#f87171' },
  }[s] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl w-full max-w-3xl mx-4 shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: D.card, border: `1px solid ${D.border}` }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: D.border }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: D.purple }} />
            <div>
              <h3 className="text-lg font-bold" style={{ color: D.text }}>Tạo đề thi từ ma trận</h3>
              <p className="text-sm" style={{ color: D.muted }}>Hệ thống tự động chọn câu hỏi theo yêu cầu ma trận</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: D.muted }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {previewLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: D.purple }} />
            </div>
          ) : previewData ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: D.text }}>Tên đề thi *</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập tên đề thi"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.text }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: D.text }}>Mô tả</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả đề thi (tùy chọn)"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.text }}
                  />
                </div>
              </div>

              <div className="rounded-xl p-4 grid grid-cols-4 gap-4"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                {[
                  { label: 'Câu hỏi cần', value: previewData.summary.totalRequired },
                  { label: 'Có sẵn', value: previewData.summary.totalAvailable },
                  { label: 'Độ phủ', value: `${Math.round(previewData.summary.coverage * 100)}%` },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-xs mb-1" style={{ color: '#60a5fa' }}>{item.label}</div>
                    <div className="text-2xl font-bold" style={{ color: '#93c5fd' }}>{item.value}</div>
                  </div>
                ))}
                <div>
                  <div className="text-xs mb-1" style={{ color: '#60a5fa' }}>Trạng thái</div>
                  <div className="mt-1">
                    {previewData.summary.canGenerate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                        <CheckCircle2 className="w-3 h-3" />Có thể tạo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                        style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                        <AlertCircle className="w-3 h-3" />Thiếu câu hỏi
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: D.text }}>Chi tiết yêu cầu</h4>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {previewData.requirements.map((req, i) => {
                    const sc = statusColor(req.status)
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: D.card2, border: `1px solid ${D.border}` }}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {statusIcon(req.status)}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: D.text }}>{req.topic}</div>
                            <div className="text-xs" style={{ color: D.muted }}>{req.questionType} • {req.cognitiveLevel}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-3">
                          <div className="text-right">
                            <div className="text-sm font-medium" style={{ color: D.text }}>{req.available} / {req.required}</div>
                            <div className="text-xs" style={{ color: D.muted }}>câu hỏi</div>
                          </div>
                          <span className="px-2 py-1 rounded-md text-xs font-medium"
                            style={{ background: sc.bg, color: sc.color }}>
                            {req.status === 'sufficient' ? 'Đủ' : req.status === 'insufficient' ? 'Thiếu' : 'Không có'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {!previewData.summary.canGenerate && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#fbbf24' }} />
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: '#fde68a' }}>Cảnh báo: Không đủ câu hỏi</p>
                      <p className="text-sm" style={{ color: '#fde68a', opacity: 0.8 }}>
                        Một số yêu cầu không có đủ câu hỏi trong ngân hàng. Bạn có thể tạo đề với số câu có sẵn hoặc thêm câu hỏi trước.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: D.muted }} />
              <p style={{ color: D.muted }}>Không thể tải preview. Vui lòng thử lại.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-6 border-t" style={{ borderColor: D.border }}>
          <button
            onClick={handleExportLatex}
            disabled={exportingLatex}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: D.muted }}
          >
            {exportingLatex ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
            Xuất ma trận sang LaTeX
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ border: `1px solid ${D.border2}`, color: D.muted }}
            >
              Hủy
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: D.purple, color: '#fff', opacity: (generating || !title.trim()) ? 0.7 : 1 }}
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo...</> : <><FileText className="w-4 h-4" />Tạo đề thi</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

<<<<<<< HEAD
// ─── Main Page ────────────────────────────────────────────────────────────────────────────────────
=======
// ─── Main Page ────────────────────────────────────────────────────────────────
// Component chính: danh sách ma trận + thao tác tạo/nhập/sửa/xoá/nhân bản
>>>>>>> b9c75d3e (clean code)
export default function ExamMatrixPage() {
  const navigate = useNavigate()
  const [matrices, setMatrices] = useState<ExamMatrix[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<MatrixStatus>('Tất cả')
  const [searchQuery, setSearchQuery] = useState('')
  const [examTypeFilter, setExamTypeFilter] = useState('Tất cả loại đề')
  const [digitizeOpen, setDigitizeOpen] = useState(false)
  const [generateTarget, setGenerateTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchMatrices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== 'Tất cả') params.append('status', selectedStatus)
      if (examTypeFilter !== 'Tất cả loại đề') params.append('examType', examTypeFilter)
      const res = await api.get(`/exam-matrices?${params}`)
      const apiMatrices: ExamMatrix[] = res.data?.matrices || []
      const isDefault = selectedStatus === 'Tất cả' && examTypeFilter === 'Tất cả loại đề'
      setMatrices(apiMatrices.length === 0 && isDefault ? SAMPLE_MATRICES : apiMatrices)
    } catch (e: any) {
      console.warn('[exam-matrix] API lỗi, fallback sang mẫu:', e?.message)
      setMatrices(SAMPLE_MATRICES)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMatrices() }, [selectedStatus, examTypeFilter])

  const handleDelete = async () => {
    if (!deleteDialog) return
    if (deleteDialog.startsWith('sample-')) {
      toast.error('Không thể xoá ma trận mẫu — chỉ để tham khảo')
      setDeleteDialog(null)
      return
    }
    setDeleting(true)
    try {
      await api.delete(`/exam-matrices/${deleteDialog}`)
      toast.success('Đã xóa ma trận')
      if (selectedId === deleteDialog) setSelectedId(null)
      setDeleteDialog(null)
      fetchMatrices()
    } catch {
      toast.error('Không thể xóa ma trận')
    } finally {
      setDeleting(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    if (id.startsWith('sample-')) {
      const sample = SAMPLE_MATRICES.find(s => s.id === id)
      if (sample) {
        navigate(`/teacher/exam-matrix/create?from=sample&name=${encodeURIComponent(sample.name)}&grade=${encodeURIComponent(sample.grade)}&subject=${encodeURIComponent(sample.type)}`)
      }
      return
    }
    try {
      await api.post(`/exam-matrices/${id}/duplicate`)
      toast.success('Đã nhân bản ma trận')
      fetchMatrices()
    } catch {
      toast.error('Không thể nhân bản ma trận')
    }
  }

  const filtered = matrices.filter((m) =>
    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.grade?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedMatrix = matrices.find((m) => m.id === selectedId)

  const inputStyle = {
    background: D.card2,
    border: `1px solid ${D.border2}`,
    color: D.text,
    outline: 'none',
  } as React.CSSProperties

  // 4 nút thao tác dùng chung cho bảng (desktop) và thẻ (mobile)
  const matrixActions = (m: ExamMatrix) => (
    <>
      <button onClick={() => navigate(`/teacher/exam-matrix/${m.id}`)}
        className="p-2 rounded-lg transition-colors hover:bg-white/10" title="Xem" style={{ color: D.muted }}>
        <Eye className="w-4 h-4" />
      </button>
      <button onClick={() => setGenerateTarget({ id: m.id, name: m.name })}
        className="p-2 rounded-lg transition-colors hover:bg-white/10" title="Sinh đề" style={{ color: D.muted }}>
        <Plus className="w-4 h-4" />
      </button>
      <button onClick={() => handleDuplicate(m.id)}
        className="p-2 rounded-lg transition-colors hover:bg-white/10" title="Nhân bản" style={{ color: D.muted }}>
        <Copy className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteDialog(m.id)}
        className="p-2 rounded-lg transition-colors hover:bg-red-500/10" title="Xóa" style={{ color: '#f87171' }}>
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  )

  return (
    <div className="min-h-screen" style={{ background: D.bg }}>

      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b" style={{ background: D.card, borderColor: D.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}>
                <Grid3x3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: D.text }}>Ma Trận Đề Thi</h1>
                <p className="text-sm" style={{ color: D.muted }}>Quản lý và số hóa ma trận đề thi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDigitizeOpen(true)}
                className="px-3 sm:px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors hover:bg-white/10 whitespace-nowrap"
                style={{ color: D.text }}
              >
                <Upload className="w-4 h-4 flex-shrink-0" />Số hóa
              </button>
              <button
                onClick={() => navigate('/teacher/exam-matrix/create')}
                className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
                style={{ background: D.purple, color: '#fff' }}
              >
                <Plus className="w-4 h-4 flex-shrink-0" />Tạo mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* ── Left Column: List (8 cols) ────────────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-6">

            {/* Filter Bar */}
            <div className="rounded-xl p-4" style={{ background: D.card, border: `1px solid ${D.border}` }}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: D.muted }} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm ma trận..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as MatrixStatus)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                >
                  <option value="Tất cả">Tất cả trạng thái</option>
                  <option value="Hàng đợi">Hàng đợi</option>
                  <option value="Đang xử lý">Đang xử lý</option>
                  <option value="Hoàn tất">Hoàn tất</option>
                  <option value="Lỗi">Lỗi</option>
                </select>
                <select
                  value={examTypeFilter}
                  onChange={(e) => setExamTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={inputStyle}
                >
                  <option value="Tất cả loại đề">Tất cả loại</option>
                  <option value="Kiểm tra 1 tiết">1 tiết</option>
                  <option value="Kiểm tra giữa kỳ">Giữa kỳ</option>
                  <option value="Kiểm tra cuối kỳ">Cuối kỳ</option>
                  <option value="Thi học kỳ">Học kỳ</option>
                </select>
              </div>
            </div>

            {/* Matrix Table — desktop (md+) */}
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ background: D.card, border: `1px solid ${D.border}` }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${D.border}`, background: D.card2 }}>
                      {['Tên ma trận', 'Loại', 'Loại đề', 'Ngày tạo', 'Trạng thái', ''].map((h) => (
                        <th key={h} className={`p-4 text-xs font-medium uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}
                          style={{ color: D.muted }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: D.purple }} />
                            <span style={{ color: D.muted }}>Đang tải...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center">
                          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: D.muted2 }} />
                          <p className="font-medium" style={{ color: D.muted }}>Chưa có ma trận nào</p>
                          <p className="text-sm mt-1" style={{ color: D.muted2 }}>Tạo ma trận đầu tiên để bắt đầu</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                          className="cursor-pointer transition-colors"
                          style={{
                            borderBottom: `1px solid ${D.border}`,
                            background: selectedId === m.id ? 'rgba(147,51,234,0.08)' : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedId !== m.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                          }}
                          onMouseLeave={(e) => {
                            if (selectedId !== m.id) (e.currentTarget as HTMLElement).style.background = 'transparent'
                          }}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(147,51,234,0.15)' }}>
                                <FileText className="w-5 h-5" style={{ color: D.purple }} />
                              </div>
                              <div>
                                <div className="font-medium text-sm" style={{ color: D.text }}>{m.name}</div>
                                <div className="text-xs" style={{ color: D.muted }}>{m.grade}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm" style={{ color: D.muted }}>{m.type}</td>
                          <td className="p-4 text-sm" style={{ color: D.muted }}>{m.examType || '—'}</td>
                          <td className="p-4 text-sm" style={{ color: D.muted }}>
                            {new Date(m.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-4"><StatusBadge status={m.status} /></td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {matrixActions(m)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matrix Cards — mobile (< md) */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="rounded-xl p-10 flex items-center justify-center gap-3"
                  style={{ background: D.card, border: `1px solid ${D.border}` }}>
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: D.purple }} />
                  <span style={{ color: D.muted }}>Đang tải...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl p-10 text-center"
                  style={{ background: D.card, border: `1px solid ${D.border}` }}>
                  <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: D.muted2 }} />
                  <p className="font-medium" style={{ color: D.muted }}>Chưa có ma trận nào</p>
                  <p className="text-sm mt-1" style={{ color: D.muted2 }}>Tạo ma trận đầu tiên để bắt đầu</p>
                </div>
              ) : (
                filtered.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                    className="rounded-xl p-4 cursor-pointer transition-colors"
                    style={{
                      background: D.card,
                      border: `1px solid ${selectedId === m.id ? D.purple : D.border}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(147,51,234,0.15)' }}>
                        <FileText className="w-5 h-5" style={{ color: D.purple }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm break-words" style={{ color: D.text }}>{m.name}</div>
                        <div className="text-xs mt-0.5" style={{ color: D.muted }}>{m.grade}</div>
                      </div>
                      <div className="flex-shrink-0"><StatusBadge status={m.status} /></div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-xs" style={{ color: D.muted }}>
                      <span>{m.type}</span>
                      <span style={{ color: D.muted2 }}>•</span>
                      <span>{m.examType || '—'}</span>
                      <span style={{ color: D.muted2 }}>•</span>
                      <span>{new Date(m.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>

                    <div className="flex justify-end gap-1 mt-3 pt-3"
                      style={{ borderTop: `1px solid ${D.border}` }}
                      onClick={(e) => e.stopPropagation()}>
                      {matrixActions(m)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Right Column: Side panels (4 cols) ───────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">

            {/* Quick Stats */}
            <div className="rounded-xl p-6" style={{ background: D.card, border: `1px solid ${D.border}` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(147,51,234,0.15)' }}>
                  <BarChart3 className="w-5 h-5" style={{ color: D.purple }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: D.text }}>Thống kê</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Tổng số ma trận', value: matrices.length, bg: D.card2 },
                  { label: 'Hoàn tất', value: matrices.filter(m => m.status === 'Hoàn tất').length,
                    bg: 'rgba(16,185,129,0.08)', color: '#34d399' },
                  { label: 'Đang xử lý', value: matrices.filter(m => m.status === 'Đang xử lý').length,
                    bg: 'rgba(59,130,246,0.08)', color: '#60a5fa' },
                  { label: 'Có lỗi', value: matrices.filter(m => m.status === 'Lỗi').length,
                    bg: 'rgba(239,68,68,0.08)', color: '#f87171' },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: bg }}>
                    <span className="text-sm" style={{ color: D.muted }}>{label}</span>
                    <span className="text-lg font-bold" style={{ color: color || D.text }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Matrix Details */}
            {selectedMatrix ? (
              <div className="rounded-xl p-6" style={{ background: D.card, border: `1px solid ${D.border}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(147,51,234,0.15)' }}>
                    <FileText className="w-5 h-5" style={{ color: D.purple }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold" style={{ color: D.text }}>Chi tiết</h3>
                    <p className="text-xs truncate" style={{ color: D.muted }}>{selectedMatrix.name}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Loại', value: selectedMatrix.type },
                    { label: 'Loại đề', value: selectedMatrix.examType || '—' },
                    { label: 'Ngày tạo', value: new Date(selectedMatrix.createdAt).toLocaleDateString('vi-VN') },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: D.card2 }}>
                      <span className="text-sm" style={{ color: D.muted }}>{label}</span>
                      <span className="text-sm font-medium" style={{ color: D.text }}>{value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: D.card2 }}>
                    <span className="text-sm" style={{ color: D.muted }}>Trạng thái</span>
                    <StatusBadge status={selectedMatrix.status} />
                  </div>
                </div>
                <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: `1px solid ${D.border}` }}>
                  <button
                    onClick={() => navigate(`/teacher/exam-matrix/${selectedMatrix.id}`)}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    style={{ background: D.purple, color: '#fff' }}
                  >
                    <Eye className="w-4 h-4" />Xem chi tiết
                  </button>
                  <button
                    onClick={() => setGenerateTarget({ id: selectedMatrix.id, name: selectedMatrix.name })}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    style={{ border: `1px solid ${D.border2}`, color: D.text }}
                  >
                    <Plus className="w-4 h-4" />Sinh đề
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-6 text-center" style={{ background: D.card, border: `1px solid ${D.border}` }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: D.card2 }}>
                  <Grid3x3 className="w-8 h-8" style={{ color: D.muted2 }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: D.text }}>Chọn ma trận để xem chi tiết</h3>
                <p className="text-sm" style={{ color: D.muted }}>Click vào một ma trận trong danh sách để xem thông tin chi tiết</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-xl p-6" style={{ background: D.card, border: `1px solid ${D.border}` }}>
              <h3 className="text-base font-bold mb-4" style={{ color: D.text }}>Thao tác nhanh</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setDigitizeOpen(true)}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors hover:bg-white/5"
                  style={{ border: `1px solid ${D.border2}`, color: D.text, textAlign: 'left' }}
                >
                  <Upload className="w-5 h-5 flex-shrink-0" style={{ color: D.muted }} />
                  <div>
                    <div className="font-medium">Số hóa ma trận</div>
                    <div className="text-xs" style={{ color: D.muted }}>Upload file để trích xuất</div>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/teacher/exam-matrix/create')}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors"
                  style={{ background: D.purple, color: '#fff', textAlign: 'left' }}
                >
                  <Plus className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Tạo ma trận mới</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Tạo thủ công từ đầu</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {digitizeOpen && (
        <DigitizeModal
          onClose={() => setDigitizeOpen(false)}
          onSuccess={fetchMatrices}
        />
      )}

      {generateTarget && (
        <GenerateExamModal
          matrixId={generateTarget.id}
          matrixName={generateTarget.name}
          onClose={() => setGenerateTarget(null)}
        />
      )}

      {/* Delete Confirm */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: D.text }}>Xóa ma trận?</h3>
            <p className="text-sm mb-5" style={{ color: D.muted }}>Hành động này không thể hoàn tác.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteDialog(null)}
                className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
                style={{ border: `1px solid ${D.border2}`, color: D.muted }}
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                style={{ background: '#dc2626', color: '#fff', opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
