/**
 * AiGenerateLatexLessonPlanModal
 * ─────────────────────────────────
 * Modal "Tạo giáo án bằng AI" giống Gemini Canvas:
 *   1. Giáo viên chọn template LaTeX (3 mẫu CV2345 builtin / custom paste)
 *   2. Gõ prompt tự nhiên ("tạo giáo án bài Động lượng cho lớp 10")
 *   3. AI điền nội dung vào template (giữ nguyên cấu trúc + định dạng NĐ 30)
 *   4. Backend tạo LatexProject mới → component redirect đến editor
 *
 * Backend endpoint: POST /api/latex-projects/ai-fill-template
 *   body: { prompt: string, template: string }
 *   resp: { latex: string }
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Sparkles, X, Loader2, ChevronRight, FileCode, Wand2, AlertCircle,
} from 'lucide-react'
import { api } from '@/services/api'
import { LATEX_TEMPLATES, type LatexTemplateOption } from '@/lib/latex-templates'

/** Filter ra các template dành riêng cho lesson plan (id bắt đầu bằng "lesson-plan-"). */
const LESSON_PLAN_LATEX_TEMPLATES: LatexTemplateOption[] = LATEX_TEMPLATES.filter(
  t => t.id.startsWith('lesson-plan-'),
)

/** Builtin prompts để giáo viên click nhanh. */
const PROMPT_SUGGESTIONS = [
  'Tạo giáo án bài Động lượng cho lớp 10, 4 tiết, môn Vật Lí, có công thức p=mv',
  'Soạn giáo án bài Tiếng Việt lớp 2 — Bài 25: Ngày hôm qua đâu rồi?, 4 tiết (Đọc 2 tiết, Viết 1 tiết, Nói nghe 1 tiết)',
  'Tạo giáo án bài "Phương trình bậc hai" Toán 9, 2 tiết, có ví dụ minh hoạ và bài tập áp dụng',
  'Soạn giáo án Hoá 11 bài Liên kết Hydrogen, 1 tiết, lồng ghép thí nghiệm minh hoạ',
  'Tạo giáo án bài "Quang hợp ở thực vật" Sinh 11, 2 tiết, có hình minh hoạ và bài tập',
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function AiGenerateLatexLessonPlanModal({ open, onClose }: Props) {
  const navigate = useNavigate()

  // Default chọn template đầu tiên trong list lesson-plan
  const [templateId, setTemplateId] = useState<string>(
    LESSON_PLAN_LATEX_TEMPLATES[0]?.id || 'custom',
  )
  const [customTemplate, setCustomTemplate] = useState('')
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  // Reset khi đóng/mở
  useEffect(() => {
    if (!open) {
      setPrompt('')
      setPreview(null)
      setGenerating(false)
      setCreating(false)
    }
  }, [open])

  const selectedTemplate = useMemo<LatexTemplateOption | null>(() => {
    if (templateId === 'custom') {
      return customTemplate.trim()
        ? { id: 'custom', name: 'Mẫu tự dán', body: customTemplate }
        : null
    }
    return LESSON_PLAN_LATEX_TEMPLATES.find(t => t.id === templateId) || null
  }, [templateId, customTemplate])

  const canGenerate =
    prompt.trim().length >= 5 &&
    !!selectedTemplate &&
    selectedTemplate.body.length >= 50 &&
    !generating &&
    !creating

  const handleGenerate = async () => {
    if (!canGenerate || !selectedTemplate) return
    setGenerating(true)
    setPreview(null)
    try {
      const { data } = await api.post<{ latex: string }>(
        '/latex-projects/ai-fill-template',
        {
          prompt: prompt.trim(),
          template: selectedTemplate.body,
        },
      )
      if (!data?.latex || data.latex.length < 100) {
        throw new Error('AI trả về kết quả không hợp lệ (quá ngắn)')
      }
      setPreview(data.latex)
      toast.success('AI đã sinh giáo án — xem preview rồi tạo dự án')
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error ||
          e?.message ||
          'Lỗi khi gọi AI sinh giáo án',
      )
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateProject = async () => {
    if (!preview) return
    setCreating(true)
    try {
      // Tạo title ngắn từ prompt
      const title =
        prompt.trim().split(/[.!?\n]/)[0].slice(0, 80) || 'Giáo án AI'
      const { data } = await api.post<{ id: string }>('/latex-projects', {
        title,
        mainContent: preview,
      })
      toast.success('Đã tạo dự án — mở editor để chỉnh sửa')
      navigate(`/teacher/latex-documents/${data.id}`)
      onClose()
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error || 'Không tạo được dự án LaTeX',
      )
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <div
      onClick={() => !generating && !creating && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#10111e', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16, width: '100%', maxWidth: 960, maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(124,58,237,0.12), rgba(236,72,153,0.08), transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
              }}
            >
              <Wand2 size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                🪄 Tạo giáo án LaTeX bằng AI
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: '3px 0 0' }}>
                AI sẽ điền nội dung vào template — giữ nguyên cấu trúc, định dạng NĐ 30/2020/NĐ-CP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating || creating}
            style={{
              background: 'transparent', border: 'none',
              cursor: generating || creating ? 'not-allowed' : 'pointer',
              color: '#94a3b8', padding: 6, opacity: generating || creating ? 0.4 : 1,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body — 2 col ── */}
        <div
          style={{
            flex: 1, overflowY: 'auto', padding: 20,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
          }}
        >
          {/* ── LEFT: Inputs ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Template picker */}
            <div>
              <label
                style={{
                  display: 'block', color: '#cbd5e1', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
                }}
              >
                1. Chọn mẫu LaTeX
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {LESSON_PLAN_LATEX_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setTemplateId(tpl.id)}
                    disabled={generating || creating}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '10px 12px',
                      background:
                        templateId === tpl.id ? 'rgba(124,58,237,0.15)' : '#161728',
                      border:
                        templateId === tpl.id
                          ? '1px solid #7c3aed'
                          : '1px solid #2a2b3d',
                      borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      transition: 'all 0.15s',
                    }}
                  >
                    <FileCode
                      size={16}
                      style={{
                        color: templateId === tpl.id ? '#a78bfa' : '#94a3b8',
                        marginTop: 2, flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: '#f1f5f9', fontWeight: 700, fontSize: 13,
                          marginBottom: 2,
                        }}
                      >
                        {tpl.name}
                      </div>
                      <div
                        style={{
                          color: '#94a3b8', fontSize: 11, lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {tpl.description}
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setTemplateId('custom')}
                  disabled={generating || creating}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 12px',
                    background:
                      templateId === 'custom' ? 'rgba(96,165,250,0.15)' : '#161728',
                    border:
                      templateId === 'custom'
                        ? '1px solid #60a5fa'
                        : '1px solid #2a2b3d',
                    borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}
                >
                  <FileCode
                    size={16}
                    style={{
                      color: templateId === 'custom' ? '#60a5fa' : '#94a3b8',
                      marginTop: 2, flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: '#f1f5f9', fontWeight: 700, fontSize: 13,
                        marginBottom: 2,
                      }}
                    >
                      ✍️ Mẫu tự dán (Custom)
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11 }}>
                      Paste template LaTeX của bạn vào đây
                    </div>
                  </div>
                </button>
              </div>
              {templateId === 'custom' && (
                <textarea
                  value={customTemplate}
                  onChange={e => setCustomTemplate(e.target.value)}
                  placeholder={'\\documentclass[12pt,a4paper]{article}\n\\usepackage[utf8]{inputenc}\n...\n\\begin{document}\n...\n\\end{document}'}
                  rows={6}
                  spellCheck={false}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    marginTop: 8, padding: 10,
                    background: '#0a0a14', border: '1px solid #2a2b3d',
                    borderRadius: 8, color: '#e2e8f0',
                    fontSize: 11, fontFamily: 'JetBrains Mono, Menlo, monospace',
                    outline: 'none', resize: 'vertical',
                  }}
                />
              )}
            </div>

            {/* Prompt */}
            <div>
              <label
                style={{
                  display: 'block', color: '#cbd5e1', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
                }}
              >
                2. Mô tả yêu cầu cho AI
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ví dụ: tạo 1 giáo án bài Động lượng cho lớp 10, 4 tiết, có công thức và bài tập áp dụng"
                rows={4}
                disabled={generating || creating}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: 12,
                  background: '#0a0a14', border: '1px solid #2a2b3d',
                  borderRadius: 10, color: '#f1f5f9',
                  fontSize: 13, outline: 'none', resize: 'vertical',
                }}
              />
              {/* Suggestion chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {PROMPT_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(s)}
                    disabled={generating || creating}
                    style={{
                      padding: '4px 9px', fontSize: 11,
                      background: 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      color: '#c4b5fd', borderRadius: 999,
                      cursor: generating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    💡 {s.slice(0, 50)}
                    {s.length > 50 ? '…' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              style={{
                width: '100%', padding: '12px 20px',
                background: canGenerate
                  ? 'linear-gradient(90deg, #7c3aed, #ec4899)'
                  : '#2a2b3d',
                color: canGenerate ? '#fff' : '#64748b',
                border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700,
                cursor: canGenerate ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: canGenerate ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> AI đang sinh giáo án…
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Sinh giáo án bằng AI
                </>
              )}
            </button>
            <p
              style={{
                color: '#64748b', fontSize: 11, margin: 0, lineHeight: 1.5,
              }}
            >
              <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
              AI sẽ giữ nguyên cấu trúc, geometry, package — chỉ điền nội dung vào placeholder.
            </p>
          </div>

          {/* ── RIGHT: Preview ── */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 360 }}>
            <label
              style={{
                display: 'block', color: '#cbd5e1', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8,
              }}
            >
              3. Preview LaTeX (AI output)
            </label>
            <div
              style={{
                flex: 1, border: '1px solid #2a2b3d', borderRadius: 10,
                background: '#0a0a14', padding: 12,
                color: '#cbd5e1', fontSize: 11,
                fontFamily: 'JetBrains Mono, Menlo, monospace',
                lineHeight: 1.55, overflow: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                maxHeight: 460, minHeight: 320,
              }}
            >
              {preview ? (
                preview
              ) : generating ? (
                <div
                  style={{
                    color: '#a78bfa', display: 'flex',
                    alignItems: 'center', gap: 8, padding: 8,
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  AI đang đọc template và sinh giáo án — vui lòng đợi 10–30s…
                </div>
              ) : (
                <div style={{ color: '#475569', fontStyle: 'italic' }}>
                  ⬅ Chọn template + nhập prompt, sau đó bấm "Sinh giáo án bằng AI".
                  Preview LaTeX sẽ xuất hiện tại đây trước khi tạo dự án.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ color: '#64748b', fontSize: 11 }}>
            {preview
              ? `✅ Đã sinh ${preview.length.toLocaleString('vi-VN')} ký tự LaTeX`
              : 'Chưa có output — bấm "Sinh giáo án bằng AI" ở cột trái'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={generating || creating}
              style={{
                padding: '9px 16px',
                background: 'transparent', border: '1px solid #2a2b3d',
                color: '#cbd5e1', borderRadius: 9,
                fontSize: 13, fontWeight: 600,
                cursor: generating || creating ? 'not-allowed' : 'pointer',
                opacity: generating || creating ? 0.4 : 1,
              }}
            >
              Huỷ
            </button>
            <button
              onClick={handleCreateProject}
              disabled={!preview || creating || generating}
              style={{
                padding: '9px 18px',
                background:
                  preview && !creating
                    ? 'linear-gradient(90deg, #10b981, #059669)'
                    : '#2a2b3d',
                color: preview && !creating ? '#fff' : '#64748b',
                border: 'none', borderRadius: 9,
                fontSize: 13, fontWeight: 700,
                cursor: preview && !creating ? 'pointer' : 'not-allowed',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow:
                  preview && !creating ? '0 4px 12px rgba(16,185,129,0.35)' : 'none',
              }}
            >
              {creating ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Đang tạo…
                </>
              ) : (
                <>
                  Tạo dự án & mở editor <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
