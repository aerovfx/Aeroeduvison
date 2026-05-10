/**
 * WaygroundCreate — quy trình tạo đề thi 4 bước (Wayground / Quizizz style)
 * Route: /teacher/taodethi  (legacy alias: /teacher/wayground)
 *
 * Steps:
 *   1. Choose mode (Assessment / Presentation / Video / Passage / Flashcards)
 *      — chỉ Assessment hoạt động ở v1, các loại khác hiển thị "Coming soon".
 *   2. Customize: chọn PDF, grade, language, mode (extract / generate)
 *   3. "Understanding Document..." (loading) → backend gọi AI extractor
 *   4. Review & Publish: hiển thị danh sách câu hỏi, cho phép edit nhanh, lưu
 *
 * Backend dùng AI provider trừu tượng (xem lib/ai-services.ts) — KHÔNG expose
 * tên provider/model cho user qua UI.
 *   POST /api/teacher/quiz-extract
 *   POST /api/teacher/quiz-publish
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, FileText, Upload, Search, FileVideo,
  ClipboardList, Layers, MessageSquare, X, Loader2, CheckCircle2,
  ChevronDown, Edit3, RotateCcw, Wand2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import BuffaloRunner from '@/components/games/BuffaloRunner'

// ── Theme tokens ──────────────────────────────────────────────
// Dùng CSS variable từ design system AI Native (xem index.css) để page
// tự đổi theo light/dark mà KHÔNG cần JS theme listener.
//   --ai-page-bg, --ai-card-bg, --ai-card-border, --ai-divider,
//   --ai-muted-text, hsl(var(--foreground))
// Brand accent (pink) + ok (green) giữ nguyên — dùng được cho cả 2 mode.
const D = {
  bg:         'var(--ai-page-bg)',
  card:       'var(--ai-card-bg)',
  border:     'var(--ai-card-border)',
  divider:    'var(--ai-divider)',
  text:       'hsl(var(--foreground))',
  muted:      'var(--ai-muted-text)',
  accent:     '#ec4899',
  accentDark: '#db2777',
  accentSoft: 'rgba(236, 72, 153, 0.10)',
  ok:         '#22c55e',
  okSoft:     'rgba(34, 197, 94, 0.15)',
} as const

// ── Types ─────────────────────────────────────────────────────
type ResourceMode = 'assessment' | 'presentation' | 'video' | 'passage' | 'flashcards'
type ExtractMode = 'extract' | 'generate'
type Step = 'choose' | 'customize' | 'loading' | 'review'

interface ExtractedQuestion {
  index: number
  questionType: string  // MULTIPLE_CHOICE | TRUE_FALSE | SHORT_ANSWER
  content: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

// ── Helpers ───────────────────────────────────────────────────
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  // chunked base64 to avoid stack overflow trên file lớn
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[])
  }
  return btoa(bin)
}

const RESOURCES: Array<{
  key: ResourceMode
  label: string
  desc: string
  color: string
  bg: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  enabled: boolean
}> = [
  { key: 'assessment',  label: 'Assessment',   desc: 'Quick & interactive questions',         color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)',  icon: ClipboardList, enabled: true },
  { key: 'presentation',label: 'Presentation', desc: 'Slides with questions and whiteboard',  color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', icon: MessageSquare, enabled: false },
  { key: 'video',       label: 'Video',        desc: 'Questions at key points in the video',  color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)',  icon: FileVideo,     enabled: false },
  { key: 'passage',     label: 'Passage',      desc: 'Questions based on a passage',          color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: FileText,      enabled: false },
  { key: 'flashcards',  label: 'Flashcards',   desc: 'Questions on front, answers on back',   color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.18)', icon: Layers,        enabled: false },
]

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export default function WaygroundCreatePage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('choose')
  const [resource, setResource] = useState<ResourceMode>('assessment')

  // Step 2 — customize
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [extractMode, setExtractMode] = useState<ExtractMode>('extract')
  const [grade, setGrade] = useState('11')
  const [language, setLanguage] = useState('Vietnamese')
  const [subject, setSubject] = useState('Vật lí')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(45)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Step 3 — loading + result
  const [extracting, setExtracting] = useState(false)
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([])
  const [meta, setMeta] = useState<{ pages?: number; model?: string; tookMs?: number; mode?: string } | null>(null)

  // Step 4 — review
  const [showAnswers, setShowAnswers] = useState(true)
  const [publishing, setPublishing] = useState(false)

  // ── File handlers ──────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); return }
    if (file.size > 25 * 1024 * 1024)   { toast.error('File PDF tối đa 25MB'); return }
    setPdfFile(file)
    if (!title.trim()) {
      // Tự gợi ý title từ tên file
      const stem = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ')
      setTitle(stem.slice(0, 80))
    }
    toast.success(`Đã chọn: ${file.name}`)
  }, [title])

  // ── Step 2 → 3: extract ────────────────────────────────────
  const runExtract = async () => {
    if (!pdfFile) { toast.error('Hãy chọn file PDF trước'); return }
    setExtracting(true)
    setStep('loading')
    try {
      const fileBase64 = await fileToBase64(pdfFile)
      const { data } = await api.post('/teacher/quiz-extract', {
        fileBase64,
        filename: pdfFile.name,
        mode: extractMode,
        subject,
        grade,
        language,
        count: 20,
      }, { timeout: 180_000 })
      if (!data.success) throw new Error(data.error || 'Trích xuất thất bại')
      setQuestions(data.questions || [])
      setMeta(data.meta || null)
      setStep('review')
      toast.success(`Đã trích xuất ${data.questions?.length || 0} câu hỏi`)
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number
          data?: { error?: string; message?: string; requiredFeature?: string; upgradeUrl?: string }
        }
        message?: string
      }
      const status = e?.response?.status
      const data = e?.response?.data
      // Gate response → redirect tới /pricing với message rõ ràng
      if (status === 403 && data?.error === 'PAYMENT_REQUIRED') {
        toast.error(data.message || 'Cần nâng cấp gói để dùng tính năng này')
        navigate(data.upgradeUrl || '/pricing')
        return
      }
      const msg = data?.error || e?.message || 'Lỗi không xác định'
      toast.error(msg)
      setStep('customize')
    } finally {
      setExtracting(false)
    }
  }

  // ── Step 4: publish ────────────────────────────────────────
  const runPublish = async () => {
    if (!title.trim()) { toast.error('Hãy nhập tiêu đề đề thi'); return }
    if (!questions.length) { toast.error('Chưa có câu hỏi'); return }
    setPublishing(true)
    try {
      const { data } = await api.post('/teacher/quiz-publish', {
        title: title.trim(),
        subject,
        grade,
        duration,
        questions,
      })
      if (!data.success) throw new Error(data.error || 'Publish thất bại')
      toast.success('Đã lưu đề thi vào ngân hàng')
      navigate(data.examId ? `/teacher/exams/${data.examId}` : '/teacher/exams')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error
        || (err as { message?: string })?.message
        || 'Lỗi'
      toast.error(msg)
    } finally {
      setPublishing(false)
    }
  }

  // ── Step 4: edit a single question ─────────────────────────
  const updateQuestion = (idx: number, patch: Partial<ExtractedQuestion>) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q))

  const totalPoints = useMemo(() => questions.length, [questions])

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text }}>

      {/* Header */}
      <div style={{
        background: D.card, borderBottom: `1px solid ${D.border}`,
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button onClick={() => step === 'choose' ? navigate('/teacher/exams') : setStep(step === 'review' ? 'customize' : 'choose')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: `1px solid ${D.border}`,
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            color: D.muted, fontSize: 13, fontWeight: 600,
          }}>
          <ArrowLeft size={14} /> Go Back
        </button>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          {step === 'choose' && ''}
          {step === 'customize' && 'Customize your assessment'}
          {step === 'loading' && 'Understanding Document...'}
          {step === 'review' && (title || 'Review extracted questions')}
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/teacher/exams')} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 6, borderRadius: 6, color: D.muted,
          }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* ───── STEP 1: choose resource ───── */}
        {step === 'choose' && (
          <div>
            <p style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>
              Good day, teacher 👋 Let's create something.
            </p>
            <p style={{ textAlign: 'center', color: D.muted, marginBottom: 32, fontSize: 14 }}>
              Choose a type to get started
            </p>

            {/* Top quick actions */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
              maxWidth: 640, margin: '0 auto 36px',
            }}>
              {[
                { icon: Edit3,  label: 'Create',  sub: 'a resource', active: true },
                { icon: Search, label: 'Search',  sub: 'for resources' },
                { icon: Upload, label: 'Upload',  sub: '& enhance your content' },
              ].map((t) => (
                <button key={t.label}
                  onClick={() => { /* all lead into chooser below */ }}
                  style={{
                    background: D.card, border: `2px solid ${t.active ? D.accent : D.border}`,
                    borderRadius: 12, padding: '20px 16px', cursor: 'pointer',
                    textAlign: 'center', transition: 'all .15s',
                  }}>
                  <t.icon size={22} style={{ color: t.active ? D.accent : D.muted, marginBottom: 6 }} />
                  <div style={{ fontWeight: 700, color: t.active ? D.accent : D.text, fontSize: 15 }}>{t.label}</div>
                  <div style={{ color: D.muted, fontSize: 12, marginTop: 2 }}>{t.sub}</div>
                </button>
              ))}
            </div>

            {/* Resource cards */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16, maxWidth: 1000, margin: '0 auto',
            }}>
              {RESOURCES.map(r => (
                <button key={r.key}
                  disabled={!r.enabled}
                  onClick={() => { setResource(r.key); setStep('customize') }}
                  style={{
                    background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
                    padding: 20, cursor: r.enabled ? 'pointer' : 'not-allowed',
                    textAlign: 'left', transition: 'all .15s',
                    opacity: r.enabled ? 1 : 0.55,
                  }}
                  onMouseEnter={e => { if (r.enabled) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 12, background: r.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                  }}>
                    <r.icon size={26} style={{ color: r.color }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    {r.label} {!r.enabled && <span style={{
                      fontSize: 10, marginLeft: 6, color: D.muted,
                      border: `1px solid ${D.border}`, borderRadius: 4, padding: '1px 6px',
                    }}>Coming soon</span>}
                  </div>
                  <div style={{ color: D.muted, fontSize: 12, lineHeight: 1.45 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ───── STEP 2: customize ───── */}
        {step === 'customize' && (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 24 }}>
              Customize your {resource}
            </h2>

            {/* PDF picker */}
            <div style={{
              background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 18,
              display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
            }}>
              <div style={{
                width: 56, height: 64, borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ef4444', fontWeight: 800, fontSize: 11, flexShrink: 0,
              }}>
                PDF
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {pdfFile ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pdfFile.name}
                    </div>
                    <div style={{ color: D.muted, fontSize: 12, marginTop: 2 }}>
                      {(pdfFile.size / 1024).toFixed(0)} KB
                    </div>
                  </>
                ) : (
                  <div style={{ color: D.muted, fontSize: 14 }}>Chưa chọn file</div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <button onClick={() => fileRef.current?.click()} style={{
                background: 'transparent', border: `1px solid ${D.border}`,
                borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: D.text,
              }}>
                {pdfFile ? 'Upload new document' : 'Select pages'}
              </button>
            </div>

            {/* Drop zone if no file */}
            {!pdfFile && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? D.accent : D.border}`,
                  borderRadius: 14, padding: '32px 16px', textAlign: 'center',
                  cursor: 'pointer', marginBottom: 24,
                  background: dragging ? D.accentSoft : 'transparent',
                }}>
                <Upload size={28} style={{ color: D.accent, marginBottom: 8 }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Drag & drop a PDF here</div>
                <div style={{ color: D.muted, fontSize: 13 }}>hoặc click để chọn file (≤ 25MB)</div>
              </div>
            )}

            {/* Mode toggle */}
            <p style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>
              Document <strong>{extractMode === 'extract' ? 'contains questions' : 'is reference material'}</strong>.
              {' '}Would you like to use them or generate new?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
              {[
                { key: 'extract' as const,  label: 'Extract existing questions', icon: '📑', bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
                { key: 'generate' as const, label: 'Generate new questions',     icon: '✨', bg: 'rgba(6, 182, 212, 0.15)',   color: '#06b6d4' },
              ].map(opt => {
                const active = extractMode === opt.key
                return (
                  <button key={opt.key} onClick={() => setExtractMode(opt.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: D.card, border: `2px solid ${active ? D.text : D.border}`,
                    borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'left',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, background: opt.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>{opt.icon}</div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</span>
                    {active && (
                      <CheckCircle2 size={18} style={{
                        position: 'absolute', top: 12, right: 12,
                        color: D.text, fill: '#000', stroke: '#fff',
                      }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Customize form */}
            <p style={{ fontSize: 13, color: D.muted, marginBottom: 8 }}>Customize your assessment</p>
            <div style={{
              background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
              padding: 4, marginBottom: 28,
            }}>
              <Row label="Title">
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Kiểm tra cuối học kỳ II — Vật lí 11"
                  style={inputCss}/>
              </Row>
              <Row label="Subject">
                <NativeSelect value={subject} onChange={setSubject} options={[
                  'Vật lí', 'Toán', 'Hoá học', 'Sinh học',
                  'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lí',
                ]} />
              </Row>
              <Row label="Grade level">
                <NativeSelect value={grade} onChange={setGrade}
                  options={['6','7','8','9','10','11','12']} suffix="th Grade" />
              </Row>
              <Row label="Output language">
                <NativeSelect value={language} onChange={setLanguage}
                  options={['Vietnamese', 'English']} />
              </Row>
              <Row label="Duration (minutes)">
                <NativeSelect value={String(duration)} onChange={v => setDuration(Number(v))}
                  options={['15','30','45','60','90','120']} suffix=" mins" />
              </Row>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={runExtract} disabled={!pdfFile || extracting}
                style={{
                  background: `linear-gradient(90deg, ${D.accent}, ${D.accentDark})`,
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '11px 22px', fontWeight: 700, fontSize: 14,
                  cursor: !pdfFile ? 'not-allowed' : 'pointer',
                  opacity: !pdfFile ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                Create Resource <span style={{ fontSize: 16 }}>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ───── STEP 3: loading ───── */}
        {step === 'loading' && (
          <div style={{
            minHeight: '60vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 18,
          }}>
            <div style={{ position: 'relative' }}>
              <Sparkles size={56} style={{ color: '#06b6d4', filter: 'drop-shadow(0 0 12px rgba(6,182,212,0.5))' }} />
              <Loader2 size={20} className="animate-spin" style={{
                position: 'absolute', top: -4, right: -4, color: D.accent,
              }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Understanding Document...</div>
            <div style={{ color: D.muted, fontSize: 13, textAlign: 'center', maxWidth: 380, lineHeight: 1.55 }}>
              AI đang phân tích PDF, nhận diện câu hỏi & đáp án.<br/>
              Việc này có thể mất 10–60 giây tuỳ độ dài tài liệu.
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16, width: 340,
            }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  height: 8, borderRadius: 4, background: 'rgba(6, 182, 212, 0.18)',
                  animation: `pulse 1.6s ${i*0.2}s ease-in-out infinite`,
                  width: `${100 - i*15}%`,
                }} />
              ))}
            </div>
            <style>{`@keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }`}</style>

            {/* Mini-game giải trí trong lúc chờ AI sinh đề */}
            <div style={{ marginTop: 24, width: '100%', maxWidth: 620 }}>
              <BuffaloRunner autoStart />
            </div>
          </div>
        )}

        {/* ───── STEP 4: review ───── */}
        {step === 'review' && (
          <div>
            {/* Top status */}
            <div style={{
              background: D.card, border: `1px solid ${D.border}`, borderRadius: 14,
              padding: 18, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10, background: D.okSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={26} style={{ color: D.ok }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{title || 'Untitled assessment'}</div>
                <div style={{ color: D.muted, fontSize: 12, marginTop: 3 }}>
                  Assessment · {subject} · Grade {grade} · {questions.length} questions · {totalPoints} Points
                  {meta?.tookMs && <> · {(meta.tookMs/1000).toFixed(1)}s</>}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: D.muted, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={showAnswers}
                  onChange={e => setShowAnswers(e.target.checked)} />
                Show answer options
              </label>
              <button onClick={() => setStep('customize')} style={{
                background: 'transparent', border: `1px solid ${D.border}`, borderRadius: 8,
                padding: '7px 12px', cursor: 'pointer', color: D.muted, fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <RotateCcw size={13} /> Lại từ đầu
              </button>
              <button onClick={runPublish} disabled={publishing} style={{
                background: D.accent, color: '#fff', border: 'none', borderRadius: 10,
                padding: '9px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                opacity: publishing ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {publishing ? 'Đang lưu...' : 'Publish'}
              </button>
            </div>

            {/* Question list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questions.map((q, idx) => (
                <QuestionCard key={idx}
                  q={q} idx={idx} showAnswers={showAnswers}
                  onChange={patch => updateQuestion(idx, patch)} />
              ))}
              {!questions.length && (
                <div style={{ color: D.muted, fontSize: 14, textAlign: 'center', padding: 40 }}>
                  Không có câu hỏi nào được trích xuất. Quay lại và thử lại.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
const inputCss: React.CSSProperties = {
  flex: 1, border: 'none', outline: 'none', background: 'transparent',
  color: D.text, fontSize: 14, padding: '10px 12px',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      borderBottom: `1px solid ${D.border}`, padding: '4px 14px', minHeight: 48,
    }}>
      <span style={{ width: 160, color: D.muted, fontSize: 13 }}>{label}</span>
      {children}
    </div>
  )
}

function NativeSelect({ value, onChange, options, suffix = '' }: {
  value: string; onChange: (v: string) => void; options: string[]; suffix?: string
}) {
  return (
    <div style={{
      marginLeft: 'auto', position: 'relative',
      display: 'flex', alignItems: 'center', gap: 4,
      border: `1px solid ${D.border}`, borderRadius: 8, padding: '4px 10px',
    }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: 13, fontWeight: 600, color: D.text, paddingRight: 16,
          appearance: 'none',
        }}>
        {options.map(o => <option key={o} value={o}>{o}{suffix}</option>)}
      </select>
      <ChevronDown size={14} style={{ color: D.muted, marginLeft: -14, pointerEvents: 'none' }} />
    </div>
  )
}

function QuestionCard({ q, idx, showAnswers, onChange }: {
  q: ExtractedQuestion; idx: number; showAnswers: boolean
  onChange: (patch: Partial<ExtractedQuestion>) => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div style={{
      background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 16,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        color: D.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      }}>
        <span style={{
          background: 'var(--ai-tabs-bg)', color: D.text, padding: '2px 8px',
          borderRadius: 4, fontSize: 11,
        }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
        <span>{q.questionType.replace('_', ' ')}</span>
        <span>· 30 sec · 1 Pt</span>
        <button onClick={() => setEditing(v => !v)} style={{
          marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
          color: D.muted, padding: 4, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Edit3 size={13} /> {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <textarea value={q.content} onChange={e => onChange({ content: e.target.value })}
          rows={2} style={{
            width: '100%', border: `1px solid ${D.border}`, borderRadius: 8,
            padding: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
          }} />
      ) : (
        <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>
          {q.content}
        </div>
      )}

      {showAnswers && q.options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {q.options.map((opt, oi) => {
            const letter = String.fromCharCode(65 + oi)
            const isCorrect = q.correctAnswer.toUpperCase().startsWith(letter)
            return (
              <button key={oi}
                onClick={() => onChange({ correctAnswer: letter })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                  background: isCorrect ? D.okSoft : 'transparent',
                  border: `1px solid ${isCorrect ? D.ok : D.border}`,
                  borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                  fontSize: 13, color: D.text, fontFamily: 'inherit',
                }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9, flexShrink: 0,
                  background: isCorrect ? D.ok : 'transparent',
                  border: `2px solid ${isCorrect ? D.ok : 'hsl(var(--border))'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isCorrect && <div style={{ width: 6, height: 6, borderRadius: 3, background: '#fff' }} />}
                </div>
                <span style={{ flex: 1 }}>{opt}</span>
              </button>
            )
          })}
        </div>
      )}

      {q.questionType === 'SHORT_ANSWER' && showAnswers && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          background: D.okSoft, borderRadius: 8, fontSize: 13,
        }}>
          <Wand2 size={14} style={{ color: D.ok }} />
          <span><strong>Đáp án:</strong> {q.correctAnswer || <em style={{ color: D.muted }}>(trống)</em>}</span>
        </div>
      )}
    </div>
  )
}
