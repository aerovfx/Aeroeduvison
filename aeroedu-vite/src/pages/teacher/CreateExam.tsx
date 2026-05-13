/**
 * CreateExam — Tạo đề thi mới
 * Route: /teacher/exams/create
 *
 * Tab 1 — Tạo thủ công  (form cũ)
 * Tab 2 — Nhập từ PDF   (upload PDF + phiếu trả lời tương tác)
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useDraftPersistence } from '@/hooks/useDraftPersistence'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Clock, BookOpen, AlignLeft,
  ChevronDown, Loader2, CheckCircle2, Info,
  Upload, FileUp, X, Eye, Settings2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

// ── Dark palette ───────────────────────────────────────────────
const D = {
  bg:      '#0d0e17',
  card:    '#10111e',
  card2:   '#161728',
  border:  '#1e2033',
  border2: '#2a2b3d',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  purple:  '#7c3aed',
} as const

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface CreateExamForm {
  title: string
  subject: string
  examType: string
  duration: number
  description: string
  totalQuestions: number
  passingScore: number
  shuffle: boolean
}

// MCQ answer: 'A' | 'B' | 'C' | 'D' | null
type McqAnswer = 'A' | 'B' | 'C' | 'D' | null

// True/False sub-item answer: true = Đúng, false = Sai, null = chưa chọn
type TfAnswer = boolean | null

interface PdfConfig {
  mcqCount: number       // số câu trắc nghiệm (Phần I)
  tfCount: number        // số câu đúng/sai   (Phần II)
  shortCount: number     // số câu trả lời ngắn (Phần III)
}

// ─────────────────────────────────────────────────────────────
// SHARED UI HELPERS
// ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: D.card2, border: `1px solid ${D.border2}`,
  color: D.text, borderRadius: 8, padding: '10px 14px', fontSize: 14, outline: 'none',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" style={{ color: D.text }}>{label}</label>
        {hint && (
          <div className="group relative">
            <Info className="w-3.5 h-3.5 cursor-help" style={{ color: D.muted }} />
            <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-52 text-xs rounded-lg p-2 shadow-xl"
              style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.muted }}>
              {hint}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 36, appearance: 'none' }}>
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4"
        style={{ color: D.muted }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PHẦN I — Phiếu trắc nghiệm tương tác
// ─────────────────────────────────────────────────────────────
function McqGrid({
  count, answers, onChange,
}: {
  count: number
  answers: McqAnswer[]
  onChange: (idx: number, ans: McqAnswer) => void
}) {
  const cols = Math.ceil(count / 10)
  // Build column groups: [[1..10],[11..20],...]
  const groups: number[][] = []
  for (let c = 0; c < cols; c++) {
    const start = c * 10
    const items: number[] = []
    for (let i = start; i < Math.min(start + 10, count); i++) items.push(i)
    groups.push(items)
  }

  return (
    <div style={{
      background: '#fff9f9', border: '2px solid #f4a0a0', borderRadius: 12,
      padding: 20, display: 'inline-block', minWidth: '100%',
    }}>
      <div style={{ color: '#d94f4f', fontWeight: 800, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
        PHẦN I
      </div>
      <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
        {groups.map((group, gi) => {
          const startNum = gi * 10 + 1
          const endNum = startNum + group.length - 1
          return (
            <div key={gi}>
              {/* column header */}
              <div style={{ textAlign: 'center', color: '#d94f4f', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                {startNum}–{endNum}
              </div>
              {/* A B C D header */}
              <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(4, 28px)', gap: 4, marginBottom: 4 }}>
                <div />
                {['A','B','C','D'].map(l => (
                  <div key={l} style={{ textAlign: 'center', color: '#d94f4f', fontWeight: 700, fontSize: 12 }}>{l}</div>
                ))}
              </div>
              {/* rows */}
              {group.map(i => {
                const q = i + 1
                const ans = answers[i]
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '28px repeat(4, 28px)', gap: 4, marginBottom: 3,
                  }}>
                    <div style={{ fontSize: 12, color: '#555', textAlign: 'right', paddingRight: 4, lineHeight: '24px' }}>
                      {q}.
                    </div>
                    {(['A','B','C','D'] as McqAnswer[]).map(letter => (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => onChange(i, ans === letter ? null : letter)}
                        style={{
                          width: 24, height: 24, borderRadius: '50%',
                          border: `2px solid ${ans === letter ? '#d94f4f' : '#e0a0a0'}`,
                          background: ans === letter ? '#d94f4f' : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', padding: 0, transition: 'all 0.15s',
                        }}
                        title={`Câu ${q}: ${letter}`}
                      >
                        {ans === letter && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PHẦN II — Phiếu Đúng/Sai tương tác
// ─────────────────────────────────────────────────────────────
function TfGrid({
  count, answers, onChange,
}: {
  count: number
  answers: TfAnswer[][]           // [questionIdx][subItemIdx a=0 b=1 c=2 d=3]
  onChange: (q: number, sub: number, val: TfAnswer) => void
}) {
  const subs = ['a','b','c','d']
  return (
    <div style={{
      background: '#fff9f9', border: '2px solid #f4a0a0', borderRadius: 12,
      padding: 20, display: 'inline-block', minWidth: '100%',
    }}>
      <div style={{ color: '#d94f4f', fontWeight: 800, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
        PHẦN II
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {Array.from({ length: count }, (_, qi) => (
          <div key={qi} style={{
            border: '1.5px solid #f4a0a0', borderRadius: 10, padding: '12px 16px',
            minWidth: 120, background: '#fff',
          }}>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#222', marginBottom: 8 }}>
              Câu {qi + 1}
            </div>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: '20px 52px 52px', gap: 4, marginBottom: 6 }}>
              <div />
              <div style={{ textAlign: 'center', color: '#d94f4f', fontWeight: 700, fontSize: 12 }}>Đúng</div>
              <div style={{ textAlign: 'center', color: '#d94f4f', fontWeight: 700, fontSize: 12 }}>Sai</div>
            </div>
            {subs.map((sub, si) => {
              const cur = answers[qi]?.[si] ?? null
              return (
                <div key={sub} style={{
                  display: 'grid', gridTemplateColumns: '20px 52px 52px', gap: 4, marginBottom: 4,
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>{sub})</div>
                  {/* Đúng bubble */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button type="button"
                      onClick={() => onChange(qi, si, cur === true ? null : true)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        border: `2px solid ${cur === true ? '#d94f4f' : '#e0a0a0'}`,
                        background: cur === true ? '#d94f4f' : 'transparent',
                        cursor: 'pointer', padding: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                      }}
                    >
                      {cur === true && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />}
                    </button>
                  </div>
                  {/* Sai bubble */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button type="button"
                      onClick={() => onChange(qi, si, cur === false ? null : false)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%',
                        border: `2px solid ${cur === false ? '#d94f4f' : '#e0a0a0'}`,
                        background: cur === false ? '#d94f4f' : 'transparent',
                        cursor: 'pointer', padding: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                      }}
                    >
                      {cur === false && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PHẦN III — Trả lời ngắn
// ─────────────────────────────────────────────────────────────
function ShortGrid({
  count, answers, onChange,
}: {
  count: number
  answers: string[]
  onChange: (idx: number, val: string) => void
}) {
  if (count === 0) return null
  return (
    <div style={{
      background: '#fff9f9', border: '2px solid #f4a0a0', borderRadius: 12,
      padding: 20, display: 'inline-block', minWidth: '100%',
    }}>
      <div style={{ color: '#d94f4f', fontWeight: 800, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
        PHẦN III — Trả lời ngắn
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#555', fontWeight: 600, minWidth: 24 }}>{i + 1}.</span>
            <input
              type="text"
              value={answers[i] || ''}
              onChange={e => onChange(i, e.target.value)}
              placeholder="Đáp án"
              style={{
                flex: 1, border: '1.5px solid #e0a0a0', borderRadius: 6,
                padding: '5px 8px', fontSize: 13, outline: 'none',
                background: '#fff', color: '#111',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PDF IMPORT TAB
// ─────────────────────────────────────────────────────────────
function PdfImportTab({
  baseForm, onSaved,
}: {
  baseForm: CreateExamForm
  onSaved: (examId: string) => void
}) {
  const [step, setStep] = useState<'upload' | 'config' | 'answers'>('upload')

  // PDF file state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl,  setPdfUrl]  = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Structure config
  const [cfg, setCfg] = useState<PdfConfig>({ mcqCount: 40, tfCount: 4, shortCount: 0 })

  // Answers
  const [mcqAnswers,   setMcqAnswers]   = useState<McqAnswer[]>(() => Array(80).fill(null))
  const [tfAnswers,    setTfAnswers]     = useState<TfAnswer[][]>(() =>
    Array(8).fill(null).map(() => Array(4).fill(null)))
  const [shortAnswers, setShortAnswers]  = useState<string[]>(() => Array(20).fill(''))

  const [saving, setSaving] = useState(false)

  // ── Upload handlers ──────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); return }
    if (file.size > 20 * 1024 * 1024)   { toast.error('File PDF tối đa 20MB'); return }
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfFile(file)
    setPdfUrl(URL.createObjectURL(file))
    toast.success(`Đã tải: ${file.name}`)
  }, [pdfUrl])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const removePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfFile(null); setPdfUrl(null)
    setStep('upload')
  }

  // ── Answer mutations ─────────────────────────────────────
  const setMcq = (i: number, ans: McqAnswer) =>
    setMcqAnswers(prev => { const n = [...prev]; n[i] = ans; return n })

  const setTf = (q: number, sub: number, val: TfAnswer) =>
    setTfAnswers(prev => {
      const n = prev.map(r => [...r])
      if (!n[q]) n[q] = Array(4).fill(null)
      n[q][sub] = val
      return n
    })

  const setShort = (i: number, val: string) =>
    setShortAnswers(prev => { const n = [...prev]; n[i] = val; return n })

  // ── Answered count ───────────────────────────────────────
  const mcqFilled   = mcqAnswers.slice(0, cfg.mcqCount).filter(Boolean).length
  const tfFilled    = tfAnswers.slice(0, cfg.tfCount)
    .reduce((s, row) => s + row.slice(0, 4).filter(v => v !== null).length, 0)
  const tfTotal     = cfg.tfCount * 4
  const shortFilled = shortAnswers.slice(0, cfg.shortCount).filter(s => s.trim()).length

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!baseForm.title.trim()) { toast.error('Vui lòng nhập tiêu đề ở tab "Tạo thủ công"'); return }

    setSaving(true)
    try {
      // 1. Create exam shell
      const { data: examData } = await api.post('/teacher/exams', {
        title:          baseForm.title.trim(),
        subject:        baseForm.subject,
        examType:       baseForm.examType,
        duration:       baseForm.duration,
        description:    baseForm.description.trim() || undefined,
        totalQuestions: cfg.mcqCount + cfg.tfCount + cfg.shortCount,
        passingScore:   baseForm.passingScore,
        shuffle:        baseForm.shuffle,
        status:         'Nháp',
        sourceType:     'pdf_import',
      })
      const examId = examData?.id ?? examData?.exam?.id
      if (!examId) throw new Error('Không nhận được ID đề thi')

      // 2. Upload PDF (if supported by backend)
      if (pdfFile) {
        try {
          const fd = new FormData()
          fd.append('file', pdfFile)
          fd.append('examId', examId)
          await api.post('/teacher/exams/upload-pdf', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch {
          // PDF upload optional — not critical
        }
      }

      // 3. Submit answer key
      const mcqQuestions = Array.from({ length: cfg.mcqCount }, (_, i) => ({
        type:          'multiple_choice',
        questionIndex: i + 1,
        section:       'I',
        correctAnswer: mcqAnswers[i] ?? '',
      }))

      const tfQuestions = Array.from({ length: cfg.tfCount }, (_, qi) => ({
        type:          'true_false',
        questionIndex: qi + 1,
        section:       'II',
        subAnswers: ['a','b','c','d'].map((sub, si) => ({
          sub,
          answer: tfAnswers[qi]?.[si] === true ? 'Đúng'
                : tfAnswers[qi]?.[si] === false ? 'Sai'
                : '',
        })),
      }))

      const shortQuestions = Array.from({ length: cfg.shortCount }, (_, i) => ({
        type:          'short_answer',
        questionIndex: i + 1,
        section:       'III',
        correctAnswer: shortAnswers[i]?.trim() ?? '',
      }))

      await api.post(`/teacher/exams/${examId}/answer-key`, {
        questions: [...mcqQuestions, ...tfQuestions, ...shortQuestions],
      })

      toast.success('Đã tạo đề thi và lưu đáp án!')
      onSaved(examId)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error
      toast.error(msg || 'Không thể tạo đề thi')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Progress stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 4 }}>
        {(['upload','config','answers'] as const).map((s, idx) => {
          const labels = ['Tải PDF','Cấu trúc đề','Điền đáp án']
          const active = step === s
          const done   = (['upload','config','answers'] as const).indexOf(step) > idx
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 'auto' : undefined }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: done ? '#22c55e' : active ? D.purple : D.border2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                }}>
                  {done ? '✓' : idx + 1}
                </div>
                <span style={{ fontSize: 11, color: active ? D.text : D.muted, whiteSpace: 'nowrap' }}>
                  {labels[idx]}
                </span>
              </div>
              {idx < 2 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 8px 18px',
                  background: done ? '#22c55e' : D.border2, transition: 'background 0.2s',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Upload ─────────────────────────────────── */}
      {step === 'upload' && (
        <div>
          {!pdfFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? D.purple : D.border2}`,
                borderRadius: 16, padding: '48px 24px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                background: dragging ? 'rgba(124,58,237,0.06)' : D.card2,
              }}
            >
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <FileUp size={28} style={{ color: '#a78bfa' }} />
              </div>
              <h3 style={{ color: D.text, fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>
                Kéo thả hoặc click để tải file PDF
              </h3>
              <p style={{ color: D.muted, fontSize: 14, margin: 0 }}>
                Hỗ trợ đề thi định dạng PDF (tối đa 20MB)
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20,
                background: D.purple, color: '#fff', borderRadius: 10,
                padding: '10px 24px', fontWeight: 600, fontSize: 14,
              }}>
                <Upload size={16} /> Chọn file PDF
              </div>
            </div>
          ) : (
            <div style={{
              border: `1px solid ${D.border}`, borderRadius: 12,
              overflow: 'hidden', background: D.card,
            }}>
              {/* File info bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderBottom: `1px solid ${D.border}`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={20} style={{ color: '#f87171' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: D.text, fontWeight: 600, fontSize: 14,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pdfFile.name}
                  </div>
                  <div style={{ color: D.muted, fontSize: 12, marginTop: 2 }}>
                    {(pdfFile.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <button onClick={removePdf} style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, color: '#f87171', cursor: 'pointer', padding: '6px 10px',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
                }}>
                  <X size={14} /> Xóa
                </button>
              </div>

              {/* PDF preview */}
              <div style={{ position: 'relative', height: 500 }}>
                <iframe
                  src={`${pdfUrl}#toolbar=0`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PDF Preview"
                />
                <div style={{
                  position: 'absolute', bottom: 12, right: 12,
                  background: 'rgba(0,0,0,0.6)', borderRadius: 8,
                  padding: '4px 10px', color: '#fff', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Eye size={12} /> Xem trước
                </div>
              </div>
            </div>
          )}

          {pdfFile && (
            <button
              onClick={() => setStep('config')}
              style={{
                marginTop: 16, width: '100%', background: D.purple, color: '#fff',
                border: 'none', borderRadius: 10, padding: '12px 0',
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Settings2 size={18} /> Tiếp theo: Cấu hình cấu trúc đề
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: Config ─────────────────────────────────── */}
      {step === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Settings2 size={20} style={{ color: '#a78bfa' }} />
              <h3 style={{ color: D.text, fontWeight: 700, fontSize: 15, margin: 0 }}>
                Cấu trúc đề thi
              </h3>
              <span style={{ fontSize: 12, color: D.muted }}>
                (chỉnh theo cấu trúc file PDF của bạn)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {/* MCQ count */}
              <div style={{
                background: 'rgba(217,79,79,0.08)', border: '1px solid rgba(217,79,79,0.25)',
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ color: '#d94f4f', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                  Phần I — Trắc nghiệm
                </div>
                <div style={{ color: D.muted, fontSize: 12, marginBottom: 8 }}>
                  Số câu hỏi (A B C D)
                </div>
                <input
                  type="number" min={0} max={80}
                  value={cfg.mcqCount}
                  onChange={e => setCfg(c => ({ ...c, mcqCount: Math.max(0, Math.min(80, +e.target.value)) }))}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#d94f4f', padding: '8px' }}
                />
                <div style={{ fontSize: 11, color: D.muted, marginTop: 6, textAlign: 'center' }}>
                  câu (tối đa 80)
                </div>
              </div>

              {/* TF count */}
              <div style={{
                background: 'rgba(217,79,79,0.08)', border: '1px solid rgba(217,79,79,0.25)',
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ color: '#d94f4f', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                  Phần II — Đúng/Sai
                </div>
                <div style={{ color: D.muted, fontSize: 12, marginBottom: 8 }}>
                  Số câu hỏi (a b c d ý)
                </div>
                <input
                  type="number" min={0} max={8}
                  value={cfg.tfCount}
                  onChange={e => setCfg(c => ({ ...c, tfCount: Math.max(0, Math.min(8, +e.target.value)) }))}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#d94f4f', padding: '8px' }}
                />
                <div style={{ fontSize: 11, color: D.muted, marginTop: 6, textAlign: 'center' }}>
                  câu (tối đa 8)
                </div>
              </div>

              {/* Short answer count */}
              <div style={{
                background: 'rgba(217,79,79,0.08)', border: '1px solid rgba(217,79,79,0.25)',
                borderRadius: 10, padding: 16,
              }}>
                <div style={{ color: '#d94f4f', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                  Phần III — Trả lời ngắn
                </div>
                <div style={{ color: D.muted, fontSize: 12, marginBottom: 8 }}>
                  Số câu hỏi điền số/chữ
                </div>
                <input
                  type="number" min={0} max={20}
                  value={cfg.shortCount}
                  onChange={e => setCfg(c => ({ ...c, shortCount: Math.max(0, Math.min(20, +e.target.value)) }))}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#d94f4f', padding: '8px' }}
                />
                <div style={{ fontSize: 11, color: D.muted, marginTop: 6, textAlign: 'center' }}>
                  câu (tối đa 20)
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 8,
              background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
              color: D.muted, fontSize: 13,
            }}>
              Tổng: <strong style={{ color: D.text }}>
                {cfg.mcqCount + cfg.tfCount * 4 + cfg.shortCount}
              </strong> câu/ý &nbsp;·&nbsp;
              Phần I: {cfg.mcqCount} câu TN &nbsp;·&nbsp;
              Phần II: {cfg.tfCount} câu × 4 ý Đúng/Sai &nbsp;·&nbsp;
              Phần III: {cfg.shortCount} câu ngắn
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('upload')} style={{
              flex: 1, background: D.card2, border: `1px solid ${D.border2}`,
              color: D.muted, borderRadius: 10, padding: '11px 0',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              ← Quay lại
            </button>
            <button
              onClick={() => setStep('answers')}
              disabled={cfg.mcqCount + cfg.tfCount + cfg.shortCount === 0}
              style={{
                flex: 2, background: D.purple, color: '#fff', border: 'none',
                borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 15,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, opacity: cfg.mcqCount + cfg.tfCount + cfg.shortCount === 0 ? 0.5 : 1,
              }}
            >
              Tiếp theo: Điền đáp án →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Answers ────────────────────────────────── */}
      {step === 'answers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Progress bar */}
          <div style={{
            background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, color: D.muted }}>Đã điền:</span>
            {cfg.mcqCount > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: 20,
                background: mcqFilled === cfg.mcqCount ? 'rgba(34,197,94,0.15)' : 'rgba(217,79,79,0.1)',
                border: `1px solid ${mcqFilled === cfg.mcqCount ? 'rgba(34,197,94,0.4)' : 'rgba(217,79,79,0.3)'}`,
                color: mcqFilled === cfg.mcqCount ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600,
              }}>
                Phần I: {mcqFilled}/{cfg.mcqCount}
              </span>
            )}
            {cfg.tfCount > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: 20,
                background: tfFilled === tfTotal ? 'rgba(34,197,94,0.15)' : 'rgba(217,79,79,0.1)',
                border: `1px solid ${tfFilled === tfTotal ? 'rgba(34,197,94,0.4)' : 'rgba(217,79,79,0.3)'}`,
                color: tfFilled === tfTotal ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600,
              }}>
                Phần II: {tfFilled}/{tfTotal}
              </span>
            )}
            {cfg.shortCount > 0 && (
              <span style={{
                padding: '3px 10px', borderRadius: 20,
                background: shortFilled === cfg.shortCount ? 'rgba(34,197,94,0.15)' : 'rgba(217,79,79,0.1)',
                border: `1px solid ${shortFilled === cfg.shortCount ? 'rgba(34,197,94,0.4)' : 'rgba(217,79,79,0.3)'}`,
                color: shortFilled === cfg.shortCount ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600,
              }}>
                Phần III: {shortFilled}/{cfg.shortCount}
              </span>
            )}
          </div>

          {/* Scrollable answer sheet */}
          <div style={{
            overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {cfg.mcqCount > 0 && (
              <McqGrid count={cfg.mcqCount} answers={mcqAnswers} onChange={setMcq} />
            )}
            {cfg.tfCount > 0 && (
              <TfGrid count={cfg.tfCount} answers={tfAnswers} onChange={setTf} />
            )}
            {cfg.shortCount > 0 && (
              <ShortGrid count={cfg.shortCount} answers={shortAnswers} onChange={setShort} />
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('config')} style={{
              flex: 1, background: D.card2, border: `1px solid ${D.border2}`,
              color: D.muted, borderRadius: 10, padding: '11px 0',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}>
              ← Quay lại
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !baseForm.title.trim()}
              style={{
                flex: 2, background: '#22c55e', color: '#fff', border: 'none',
                borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 15,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: saving || !baseForm.title.trim() ? 0.65 : 1,
              }}
            >
              {saving
                ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</>
                : <><CheckCircle2 size={18} /> Tạo đề thi & lưu đáp án</>
              }
            </button>
          </div>
          {!baseForm.title.trim() && (
            <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center', margin: '-10px 0 0' }}>
              ⚠ Hãy nhập tiêu đề đề thi ở tab "Tạo thủ công" trước khi lưu.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function CreateExamPage() {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'manual' | 'matrix' | 'pdf'>('manual')

  // ── Matrix tab state ──────────────────────────────────
  const [matrices, setMatrices] = useState<Array<{ id: string; name: string; subject?: string; grade?: string; totalQuestions?: number }>>([])
  const [matricesLoading, setMatricesLoading] = useState(false)
  const [selectedMatrixId, setSelectedMatrixId] = useState<string | null>(null)
  const [matrixTitle, setMatrixTitle] = useState('')
  const [useAIForMissing, setUseAIForMissing] = useState(true)
  const [generatingFromMatrix, setGeneratingFromMatrix] = useState(false)

  // ── Draft persistence (cross-tab + cross-refresh) ─────
  // Bundle các field draftable thành 1 object để hook auto-sync localStorage.
  // Loại trừ pdfFile/Blob (không serialize được).
  type DraftBundle = {
    activeTab: 'manual' | 'matrix' | 'pdf'
    selectedMatrixId: string | null
    matrixTitle: string
    useAIForMissing: boolean
  }
  const draftBundle: DraftBundle = {
    activeTab, selectedMatrixId, matrixTitle, useAIForMissing,
  }
  const setDraftBundle = (next: DraftBundle) => {
    setActiveTab(next.activeTab)
    setSelectedMatrixId(next.selectedMatrixId)
    setMatrixTitle(next.matrixTitle)
    setUseAIForMissing(next.useAIForMissing)
  }
  const tabsDraft = useDraftPersistence<DraftBundle>(
    'aero_create_exam_tabs_v1',
    draftBundle,
    setDraftBundle,
  )

  // Load matrices khi switch sang tab matrix
  useEffect(() => {
    if (activeTab !== 'matrix' || matrices.length > 0) return
    setMatricesLoading(true)
    api.get<{ matrices: typeof matrices }>('/exam-matrices')
      .then(r => setMatrices(r.data?.matrices || []))
      .catch(() => toast.error('Không tải được danh sách ma trận'))
      .finally(() => setMatricesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const generateFromMatrix = async () => {
    if (!selectedMatrixId) { toast.error('Chọn 1 ma trận trước'); return }
    setGeneratingFromMatrix(true)
    const t = toast.loading('Đang sinh đề từ ma trận (có thể mất 30-90s)…')
    try {
      const r = await api.post<{ data: { examId: string; totalQuestions: number; aiAdded: number } }>(
        '/exams/generate-from-matrix',
        { matrixId: selectedMatrixId, title: matrixTitle.trim() || undefined, useAIForMissing }
      )
      const d = r.data.data
      toast.success(
        `✅ Đã tạo đề ${d.totalQuestions} câu${d.aiAdded > 0 ? ` (AI bổ sung ${d.aiAdded})` : ''}`,
        { id: t, duration: 4000 }
      )
      // Xoá draft tabs sau khi tạo thành công
      tabsDraft.clear()
      setTimeout(() => navigate(`/teacher/exams/${d.examId}/edit`), 600)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lỗi sinh đề', { id: t })
    } finally { setGeneratingFromMatrix(false) }
  }

  const [form, setForm] = useState<CreateExamForm>({
    title:          '',
    subject:        'Vật lý',
    examType:       'Trắc nghiệm',
    duration:       45,
    description:    '',
    totalQuestions: 40,
    passingScore:   50,
    shuffle:        false,
  })
  const [saving, setSaving] = useState(false)

  // Draft cho manual form (title/subject/examType/...)
  const formDraft = useDraftPersistence<CreateExamForm>(
    'aero_create_exam_manual_v1',
    form,
    setForm,
  )

  const set = <K extends keyof CreateExamForm>(key: K, val: CreateExamForm[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Vui lòng nhập tiêu đề đề thi'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/teacher/exams', {
        title:          form.title.trim(),
        subject:        form.subject,
        examType:       form.examType,
        duration:       form.duration,
        description:    form.description.trim() || undefined,
        totalQuestions: form.totalQuestions,
        passingScore:   form.passingScore,
        shuffle:        form.shuffle,
        status:         'Nháp',
      })
      toast.success('Đã tạo đề thi thành công!')
      // Xoá draft sau khi tạo thành công
      formDraft.clear()
      tabsDraft.clear()
      const examId = data?.id ?? data?.exam?.id
      navigate(examId ? `/teacher/exams/${examId}` : '/teacher/exams')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast.error(msg || 'Không thể tạo đề thi, thử lại sau')
    } finally {
      setSaving(false)
    }
  }

  const examTypeBadgeColor: Record<string, string> = {
    'Trắc nghiệm': '#a78bfa', 'Tự luận': '#60a5fa', 'Kết hợp': '#34d399',
  }

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}` }}
        className="sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-lg transition-colors" style={{ color: D.muted }}
              onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: D.text }}>Tạo đề thi mới</h1>
              <p className="text-sm" style={{ color: D.muted }}>
                {activeTab === 'manual' ? 'Điền thông tin cơ bản để bắt đầu' : 'Nhập từ file PDF + điền đáp án'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Draft indicator — hiện thị khi đã có nháp lưu trữ */}
            {(formDraft.hasDraft || tabsDraft.hasDraft) && (
              <DraftIndicator
                lastSavedAt={Math.max(formDraft.lastSavedAt || 0, tabsDraft.lastSavedAt || 0)}
                onClear={() => {
                  if (!confirm('Xoá toàn bộ nháp đang lưu? Form sẽ về trạng thái mặc định.')) return
                  formDraft.clear()
                  tabsDraft.clear()
                  // Reset state về default
                  setForm({
                    title: '', subject: 'Vật lý', examType: 'Trắc nghiệm', duration: 45,
                    description: '', totalQuestions: 40, passingScore: 50, shuffle: false,
                  })
                  setActiveTab('manual')
                  setSelectedMatrixId(null)
                  setMatrixTitle('')
                  setUseAIForMissing(true)
                }}
              />
            )}
            <button type="button" onClick={() => navigate('/teacher/exams')}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ background: 'transparent', border: `1px solid ${D.border2}`, color: D.muted }}
              onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              Hủy
            </button>
            {activeTab === 'manual' && (
              <button form="create-exam-form" type="submit" disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{ background: D.purple, color: '#fff' }}
                onMouseEnter={e => !saving && (e.currentTarget.style.background = '#6d28d9')}
                onMouseLeave={e => (e.currentTarget.style.background = D.purple)}>
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
                  : <><CheckCircle2 className="w-4 h-4" /> Tạo đề thi</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div style={{
          display: 'inline-flex', gap: 4, background: D.card,
          border: `1px solid ${D.border}`, borderRadius: 12, padding: 4,
        }}>
          {([
            { key: 'manual', label: '✏️  Tạo thủ công' },
            { key: 'matrix', label: '📐  Từ ma trận + ngân hàng' },
            { key: 'pdf',    label: '📄  Nhập từ PDF' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 14, transition: 'all 0.15s',
                background: activeTab === tab.key ? D.purple : 'transparent',
                color: activeTab === tab.key ? '#fff' : D.muted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ═══ TAB 1: Manual ═══════════════════════════════════ */}
        {activeTab === 'manual' && (
          <form id="create-exam-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-12 gap-6">

              {/* Left: form fields */}
              <div className="col-span-12 lg:col-span-8 space-y-5">

                {/* Card 1 — Thông tin cơ bản */}
                <div style={{ background: D.card, border: `1px solid ${D.border}` }}
                  className="rounded-xl p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(124,58,237,0.15)' }}>
                      <FileText className="w-4 h-4" style={{ color: '#a78bfa' }} />
                    </div>
                    <h2 className="text-base font-semibold" style={{ color: D.text }}>Thông tin cơ bản</h2>
                  </div>
                  <Field label="Tiêu đề đề thi *">
                    <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                      placeholder="VD: Kiểm tra 1 tiết Vật lý 11 - Chương Điện trường"
                      style={inputStyle} maxLength={200} required autoFocus />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Môn học">
                      <Select value={form.subject} onChange={v => set('subject', v)}>
                        <option value="Vật lý">Vật lý</option>
                        <option value="Toán học">Toán học</option>
                        <option value="Hóa học">Hóa học</option>
                        <option value="Văn học">Văn học</option>
                        <option value="Tiếng Anh">Tiếng Anh</option>
                        <option value="Sinh học">Sinh học</option>
                        <option value="Lịch sử">Lịch sử</option>
                        <option value="Địa lý">Địa lý</option>
                      </Select>
                    </Field>
                    <Field label="Loại đề thi">
                      <Select value={form.examType} onChange={v => set('examType', v)}>
                        <option value="Trắc nghiệm">Trắc nghiệm</option>
                        <option value="Tự luận">Tự luận</option>
                        <option value="Kết hợp">Kết hợp (TN + TL)</option>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Mô tả" hint="Ghi chú nội dung chương, phạm vi ôn tập...">
                    <textarea value={form.description} onChange={e => set('description', e.target.value)}
                      placeholder="VD: Kiểm tra chương 1 - Điện trường..."
                      rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} maxLength={500} />
                  </Field>
                </div>

                {/* Card 2 — Cấu hình thi */}
                <div style={{ background: D.card, border: `1px solid ${D.border}` }}
                  className="rounded-xl p-6 space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(96,165,250,0.15)' }}>
                      <Clock className="w-4 h-4" style={{ color: '#60a5fa' }} />
                    </div>
                    <h2 className="text-base font-semibold" style={{ color: D.text }}>Cấu hình thi</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Thời gian làm bài (phút)">
                      <Select value={String(form.duration)} onChange={v => set('duration', Number(v))}>
                        {[15,30,45,60,90,120,150,180].map(m => (
                          <option key={m} value={m}>{m} phút</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Số câu hỏi dự kiến" hint="Có thể thay đổi khi thêm câu hỏi từ ngân hàng">
                      <input type="number" min={1} max={200} value={form.totalQuestions}
                        onChange={e => set('totalQuestions', Math.max(1, Math.min(200, Number(e.target.value))))}
                        style={inputStyle} />
                    </Field>
                  </div>
                  <Field label="Điểm đạt (%)" hint="Phần trăm điểm tối thiểu để đạt yêu cầu">
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={100} step={5} value={form.passingScore}
                        onChange={e => set('passingScore', Number(e.target.value))}
                        className="flex-1 accent-purple-500" />
                      <span className="w-14 text-center text-sm font-bold py-1 rounded-lg"
                        style={{ background: D.card2, color: '#a78bfa' }}>{form.passingScore}%</span>
                    </div>
                  </Field>
                  <div className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: D.card2, border: `1px solid ${D.border2}` }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: D.text }}>Xáo trộn câu hỏi</div>
                      <div className="text-xs mt-0.5" style={{ color: D.muted }}>
                        Mỗi học sinh nhận thứ tự câu hỏi khác nhau
                      </div>
                    </div>
                    <button type="button" onClick={() => set('shuffle', !form.shuffle)}
                      className="relative w-11 h-6 rounded-full transition-colors"
                      style={{ background: form.shuffle ? D.purple : D.border2 }}>
                      <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                        style={{ transform: form.shuffle ? 'translateX(20px)' : 'translateX(0)' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: preview */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div style={{ background: D.card, border: `1px solid ${D.border}` }}
                  className="rounded-xl p-5 sticky top-24">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(52,211,153,0.15)' }}>
                      <BookOpen className="w-4 h-4" style={{ color: '#34d399' }} />
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: D.text }}>Xem trước</h3>
                  </div>
                  <div className="rounded-xl p-4 mb-4"
                    style={{ background: D.card2, border: `1px solid ${D.border2}` }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}>
                      <FileText className="w-5 h-5" style={{ color: '#a78bfa' }} />
                    </div>
                    <h4 className="font-semibold text-sm mb-1" style={{ color: D.text }}>
                      {form.title || <span style={{ color: D.muted, fontStyle: 'italic' }}>Tiêu đề đề thi...</span>}
                    </h4>
                    {form.description && (
                      <p className="text-xs mb-3 line-clamp-2" style={{ color: D.muted }}>{form.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        { label: form.subject, c: 'rgba(124,58,237,0.15)', bc: 'rgba(124,58,237,0.3)', tc: '#a78bfa' },
                        { label: form.examType, c: 'rgba(96,165,250,0.1)', bc: 'rgba(96,165,250,0.25)', tc: examTypeBadgeColor[form.examType] ?? D.muted },
                        { label: 'Nháp', c: 'rgba(100,116,139,0.15)', bc: D.border2, tc: D.muted },
                      ].map(b => (
                        <span key={b.label} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: b.c, border: `1px solid ${b.bc}`, color: b.tc }}>
                          {b.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Thời gian', value: `${form.duration} phút` },
                      { label: 'Số câu',    value: `${form.totalQuestions} câu` },
                      { label: 'Điểm đạt',  value: `${form.passingScore}%` },
                      { label: 'Xáo trộn', value: form.shuffle ? 'Có' : 'Không' },
                    ].map(row => (
                      <div key={row.label} className="rounded-lg p-3 text-center"
                        style={{ background: D.card2, border: `1px solid ${D.border2}` }}>
                        <div className="text-lg font-bold" style={{ color: D.text }}>{row.value}</div>
                        <div className="text-xs mt-0.5" style={{ color: D.muted }}>{row.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg p-3"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                    <div className="flex items-start gap-2">
                      <AlignLeft className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#a78bfa' }} />
                      <div>
                        <div className="text-xs font-medium" style={{ color: '#a78bfa' }}>Sau khi tạo</div>
                        <div className="text-xs mt-0.5" style={{ color: D.muted }}>
                          Bạn có thể thêm câu hỏi từ ngân hàng, tùy chỉnh điểm số và xuất LaTeX.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </form>
        )}

        {/* ═══ TAB 2: PDF Import ═══════════════════════════════ */}
        {/* ═══ TAB 2: From Matrix + Bank ═══════════════════════ */}
        {activeTab === 'matrix' && (
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT: Matrix selector */}
            <div className="col-span-12 lg:col-span-8">
              <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: D.text }}>
                  Chọn ma trận đề
                </h3>
                <p style={{ fontSize: 12, color: D.muted, marginBottom: 16 }}>
                  Đề thi sẽ được sinh tự động từ ngân hàng theo cấu trúc topics + difficulty của ma trận.
                  Câu thiếu sẽ được AI bổ sung và lưu vào ngân hàng.
                </p>

                {matricesLoading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: D.muted }}>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Đang tải ma trận…
                  </div>
                ) : matrices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: D.muted, fontSize: 14, marginBottom: 12 }}>
                      Bạn chưa có ma trận đề nào.
                    </p>
                    <button onClick={() => navigate('/teacher/exam-matrix/create')}
                      style={{
                        padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: D.purple, color: '#fff', fontWeight: 600, fontSize: 13,
                      }}>
                      Tạo ma trận đầu tiên →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                    {matrices.map(m => (
                      <button key={m.id} type="button"
                        onClick={() => setSelectedMatrixId(m.id)}
                        style={{
                          textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer',
                          background: selectedMatrixId === m.id ? 'rgba(124,58,237,0.15)' : 'transparent',
                          border: `2px solid ${selectedMatrixId === m.id ? D.purple : D.border}`,
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: D.text, marginBottom: 4 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: D.muted }}>
                          {m.subject || '—'} · {m.grade || '—'} · {m.totalQuestions ?? 0} câu
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Config + generate */}
            <div className="col-span-12 lg:col-span-4">
              <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 20, position: 'sticky', top: 90 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: D.text }}>
                  Tuỳ chọn
                </h3>

                <label style={{ fontSize: 12, color: D.muted, display: 'block', marginBottom: 4 }}>
                  Tiêu đề đề thi (không bắt buộc)
                </label>
                <input type="text" value={matrixTitle}
                  onChange={e => setMatrixTitle(e.target.value)}
                  placeholder="Tự động: {tên ma trận} — Đề thi"
                  style={{
                    width: '100%', padding: 8, fontSize: 13,
                    background: D.bg, border: `1px solid ${D.border}`, borderRadius: 6,
                    color: D.text, marginBottom: 12,
                  }} />

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: D.text, cursor: 'pointer', marginBottom: 16 }}>
                  <input type="checkbox" checked={useAIForMissing}
                    onChange={e => setUseAIForMissing(e.target.checked)} />
                  <span>AI bổ sung câu thiếu trong ngân hàng</span>
                </label>

                <button onClick={generateFromMatrix}
                  disabled={!selectedMatrixId || generatingFromMatrix}
                  style={{
                    width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: !selectedMatrixId ? D.border : 'linear-gradient(90deg, #ec4899, #a855f7)',
                    color: '#fff', fontWeight: 700, fontSize: 14, cursor: !selectedMatrixId ? 'not-allowed' : 'pointer',
                    opacity: generatingFromMatrix ? 0.7 : 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {generatingFromMatrix
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang sinh đề…</>
                    : '✨ Sinh đề từ ma trận'}
                </button>

                <p style={{ fontSize: 11, color: D.muted, marginTop: 12, textAlign: 'center', lineHeight: 1.4 }}>
                  💡 Sau khi tạo, bạn có thể thêm câu thủ công + sửa từng câu trong trang chi tiết đề.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pdf' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8">

              {/* Info banner */}
              {!form.title.trim() && (
                <div style={{
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#fbbf24',
                }}>
                  ⚠ Hãy nhập tiêu đề và chọn môn học ở tab <strong>"Tạo thủ công"</strong> trước.
                </div>
              )}

              <PdfImportTab
                baseForm={form}
                onSaved={examId => navigate(examId ? `/teacher/exams/${examId}` : '/teacher/exams')}
              />
            </div>

            {/* Right: instructions */}
            <div className="col-span-12 lg:col-span-4">
              <div style={{
                background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
                padding: 20, position: 'sticky', top: 90,
              }}>
                <h3 style={{ color: D.text, fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>
                  📋 Hướng dẫn
                </h3>
                {[
                  { n: '1', t: 'Nhập tiêu đề', d: 'Chuyển qua tab "Tạo thủ công", điền tiêu đề + chọn môn học.' },
                  { n: '2', t: 'Tải PDF', d: 'Upload file đề thi PDF. File sẽ được hiển thị để đối chiếu.' },
                  { n: '3', t: 'Cấu hình cấu trúc', d: 'Nhập số câu từng phần (TN / Đúng-Sai / Ngắn) khớp với đề.' },
                  { n: '4', t: 'Điền đáp án', d: 'Click vào vòng tròn để chọn đáp án đúng cho từng câu.' },
                  { n: '5', t: 'Lưu đề thi', d: 'Nhấn "Tạo đề thi & lưu đáp án" — hệ thống tự chấm cho học sinh.' },
                ].map(item => (
                  <div key={item.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: D.purple, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800,
                    }}>{item.n}</div>
                    <div>
                      <div style={{ color: D.text, fontWeight: 600, fontSize: 13 }}>{item.t}</div>
                      <div style={{ color: D.muted, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{item.d}</div>
                    </div>
                  </div>
                ))}

                <div style={{
                  marginTop: 4, padding: '10px 12px', borderRadius: 8,
                  background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
                  fontSize: 12, color: '#6ee7b7',
                }}>
                  ✓ Đề thi sẽ xuất hiện trong bài tập của học sinh ngay sau khi lưu.
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   DraftIndicator — "Đã lưu nháp N giây trước" + "Xoá"
   ───────────────────────────────────────────────────── */
function DraftIndicator({
  lastSavedAt, onClear,
}: { lastSavedAt: number; onClear: () => void }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  const ago = Math.max(0, Math.round((now - lastSavedAt) / 1000))
  const text = ago < 5
    ? 'Vừa lưu'
    : ago < 60
      ? `${ago}s trước`
      : ago < 3600
        ? `${Math.round(ago / 60)} phút trước`
        : `${Math.round(ago / 3600)} giờ trước`
  return (
    <div className="flex items-center gap-2 text-[11px]" style={{ color: D.muted }}>
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md"
        style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', color: '#34d399' }}>
        💾 Đã lưu nháp · {text}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
        style={{ background: 'transparent', border: `1px solid ${D.border2}`, color: D.muted }}
        onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
        onMouseLeave={e => (e.currentTarget.style.color = D.muted)}
        title="Xoá nháp đang lưu"
      >
        Xoá
      </button>
    </div>
  )
}
