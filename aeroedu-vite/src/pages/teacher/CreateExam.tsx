/**
 * CreateExam — Tạo đề thi mới
 * Route: /teacher/exams/create
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Clock, BookOpen, AlignLeft,
  ChevronDown, Loader2, CheckCircle2, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Dark palette (giống Exams.tsx) ────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────
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

// ── Shared input style ────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: D.card2,
  border: `1px solid ${D.border2}`,
  color: D.text,
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
}

// ── Label + Input wrapper ─────────────────────────────────────
function Field({
  label, hint, children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" style={{ color: D.text }}>{label}</label>
        {hint && (
          <div className="group relative">
            <Info className="w-3.5 h-3.5 cursor-help" style={{ color: D.muted }} />
            <div
              className="absolute left-5 top-0 z-10 hidden group-hover:block w-52 text-xs rounded-lg p-2 shadow-xl"
              style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.muted }}
            >
              {hint}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Select with caret ─────────────────────────────────────────
function Select({
  value, onChange, children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, paddingRight: 36, appearance: 'none' }}
      >
        {children}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4"
        style={{ color: D.muted }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function CreateExamPage() {
  const navigate = useNavigate()

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

  const set = <K extends keyof CreateExamForm>(key: K, val: CreateExamForm[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề đề thi')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/teacher/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:          form.title.trim(),
          subject:        form.subject,
          examType:       form.examType,
          duration:       form.duration,
          description:    form.description.trim() || undefined,
          totalQuestions: form.totalQuestions,
          passingScore:   form.passingScore,
          shuffle:        form.shuffle,
          status:         'Nháp',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Lỗi ${res.status}`)
      }
      const data = await res.json()
      toast.success('Đã tạo đề thi thành công!')
      const examId = data?.id ?? data?.exam?.id
      navigate(examId ? `/teacher/exams/${examId}` : '/teacher/exams')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo đề thi, thử lại sau')
    } finally {
      setSaving(false)
    }
  }

  // ── Preview summary ───────────────────────────────────────────
  const examTypeBadgeColor: Record<string, string> = {
    'Trắc nghiệm': '#a78bfa',
    'Tự luận':     '#60a5fa',
    'Kết hợp':     '#34d399',
  }

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        style={{ background: D.card, borderBottom: `1px solid ${D.border}` }}
        className="sticky top-0 z-10"
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: D.muted }}
              onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: D.text }}>Tạo đề thi mới</h1>
              <p className="text-sm" style={{ color: D.muted }}>Điền thông tin cơ bản để bắt đầu</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/teacher/exams')}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ background: 'transparent', border: `1px solid ${D.border2}`, color: D.muted }}
              onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Hủy
            </button>
            <button
              form="create-exam-form"
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: D.purple, color: '#fff' }}
              onMouseEnter={e => !saving && (e.currentTarget.style.background = '#6d28d9')}
              onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
                : <><CheckCircle2 className="w-4 h-4" /> Tạo đề thi</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <form id="create-exam-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-12 gap-6">

            {/* ── Left: form fields ────────────────────────────── */}
            <div className="col-span-12 lg:col-span-8 space-y-5">

              {/* Card 1 — Thông tin cơ bản */}
              <div
                style={{ background: D.card, border: `1px solid ${D.border}` }}
                className="rounded-xl p-6 space-y-5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.15)' }}>
                    <FileText className="w-4 h-4" style={{ color: '#a78bfa' }} />
                  </div>
                  <h2 className="text-base font-semibold" style={{ color: D.text }}>Thông tin cơ bản</h2>
                </div>

                {/* Title */}
                <Field label="Tiêu đề đề thi *">
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="VD: Kiểm tra 1 tiết Vật lý 11 - Chương Điện trường"
                    style={inputStyle}
                    maxLength={200}
                    required
                    autoFocus
                  />
                </Field>

                {/* Subject + Exam type */}
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

                {/* Description */}
                <Field label="Mô tả" hint="Ghi chú nội dung chương, phạm vi ôn tập...">
                  <textarea
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="VD: Kiểm tra chương 1 - Điện trường, gồm lý thuyết và bài tập tính toán..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
                    maxLength={500}
                  />
                </Field>
              </div>

              {/* Card 2 — Cấu hình thi */}
              <div
                style={{ background: D.card, border: `1px solid ${D.border}` }}
                className="rounded-xl p-6 space-y-5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(96,165,250,0.15)' }}>
                    <Clock className="w-4 h-4" style={{ color: '#60a5fa' }} />
                  </div>
                  <h2 className="text-base font-semibold" style={{ color: D.text }}>Cấu hình thi</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Duration */}
                  <Field label="Thời gian làm bài (phút)">
                    <Select value={String(form.duration)} onChange={v => set('duration', Number(v))}>
                      <option value="15">15 phút</option>
                      <option value="30">30 phút</option>
                      <option value="45">45 phút</option>
                      <option value="60">60 phút</option>
                      <option value="90">90 phút</option>
                      <option value="120">120 phút</option>
                      <option value="150">150 phút</option>
                      <option value="180">180 phút</option>
                    </Select>
                  </Field>

                  {/* Total questions */}
                  <Field
                    label="Số câu hỏi dự kiến"
                    hint="Có thể thay đổi khi thêm câu hỏi từ ngân hàng"
                  >
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={form.totalQuestions}
                      onChange={e => set('totalQuestions', Math.max(1, Math.min(200, Number(e.target.value))))}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* Passing score */}
                <Field label="Điểm đạt (%)" hint="Phần trăm điểm tối thiểu để đạt yêu cầu">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={form.passingScore}
                      onChange={e => set('passingScore', Number(e.target.value))}
                      className="flex-1 accent-purple-500"
                    />
                    <span
                      className="w-14 text-center text-sm font-bold py-1 rounded-lg"
                      style={{ background: D.card2, color: '#a78bfa' }}
                    >
                      {form.passingScore}%
                    </span>
                  </div>
                </Field>

                {/* Shuffle toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: D.card2, border: `1px solid ${D.border2}` }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: D.text }}>Xáo trộn câu hỏi</div>
                    <div className="text-xs mt-0.5" style={{ color: D.muted }}>
                      Mỗi học sinh nhận thứ tự câu hỏi khác nhau
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('shuffle', !form.shuffle)}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{
                      background: form.shuffle ? D.purple : D.border2,
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{ transform: form.shuffle ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right: preview card ──────────────────────────── */}
            <div className="col-span-12 lg:col-span-4 space-y-4">

              {/* Preview */}
              <div
                style={{ background: D.card, border: `1px solid ${D.border}` }}
                className="rounded-xl p-5 sticky top-24"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(52,211,153,0.15)' }}>
                    <BookOpen className="w-4 h-4" style={{ color: '#34d399' }} />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: D.text }}>Xem trước</h3>
                </div>

                {/* Exam card preview */}
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: D.card2, border: `1px solid ${D.border2}` }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)' }}
                  >
                    <FileText className="w-5 h-5" style={{ color: '#a78bfa' }} />
                  </div>
                  <h4 className="font-semibold text-sm mb-1" style={{ color: D.text }}>
                    {form.title || <span style={{ color: D.muted, fontStyle: 'italic' }}>Tiêu đề đề thi...</span>}
                  </h4>
                  {form.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: D.muted }}>{form.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(124,58,237,0.15)',
                        border: '1px solid rgba(124,58,237,0.3)',
                        color: '#a78bfa',
                      }}
                    >
                      {form.subject}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(96,165,250,0.1)',
                        border: '1px solid rgba(96,165,250,0.25)',
                        color: examTypeBadgeColor[form.examType] ?? D.muted,
                      }}
                    >
                      {form.examType}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'rgba(100,116,139,0.15)',
                        border: `1px solid ${D.border2}`,
                        color: D.muted,
                      }}
                    >
                      Nháp
                    </span>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Thời gian', value: `${form.duration} phút` },
                    { label: 'Số câu',    value: `${form.totalQuestions} câu` },
                    { label: 'Điểm đạt',  value: `${form.passingScore}%` },
                    { label: 'Xáo trộn', value: form.shuffle ? 'Có' : 'Không' },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="rounded-lg p-3 text-center"
                      style={{ background: D.card2, border: `1px solid ${D.border2}` }}
                    >
                      <div className="text-lg font-bold" style={{ color: D.text }}>{row.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: D.muted }}>{row.label}</div>
                    </div>
                  ))}
                </div>

                {/* Next steps hint */}
                <div
                  className="mt-4 rounded-lg p-3"
                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}
                >
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
      </div>
    </div>
  )
}
