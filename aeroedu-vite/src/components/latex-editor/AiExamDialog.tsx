/**
 * AiExamDialog — Modal sinh đề LaTeX bằng AI
 *
 * Dùng cho 2 chỗ:
 *   1. Trang danh sách /teacher/latex-documents → tạo project mới, nạp LaTeX AI
 *   2. Trong editor → chèn / thay thế nội dung `main.tex`
 *
 * Giao diện form: chọn môn, khối, chủ đề, định dạng đề, phân bổ độ khó,
 * thời gian, có kèm đáp án hay không.
 * Khi submit → gọi `latexAiService.generateExam(config)` → callback onGenerated.
 */
import { useMemo, useState } from 'react'
import { Loader2, Sparkles, X, Wand2, BookOpen, Clock, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  latexAiService,
  type ExamConfig,
  type ExamSubject,
  type ExamFormat,
  type DifficultyBreakdown,
  type GenerateResult,
} from '@/services/latex-ai.service'

const SUBJECTS: ExamSubject[] = [
  'Toán', 'Vật lý', 'Hoá học', 'Sinh học',
  'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học',
]

const FORMATS: Array<{ value: ExamFormat; label: string; desc: string; badge?: string }> = [
  {
    value: 'bgd-2025',
    label: 'Chuẩn Bộ GD&ĐT 2025',
    desc: '4 phần · 10 điểm: TN 4 lựa chọn (4đ) · Đ/S (2đ) · Trả lời ngắn (2đ) · Tự luận (2đ). Có header 2 cột, mã đề, đánh số trang — giống đề minh họa chính thức.',
    badge: 'Khuyên dùng',
  },
  { value: 'mcq-only', label: 'TN 4 lựa chọn', desc: 'Toàn bộ là câu hỏi trắc nghiệm 4 lựa chọn A, B, C, D.' },
  { value: 'mcq-tf-essay', label: 'TN · Đ/S · Tự luận', desc: 'Phần I trắc nghiệm · Phần II đúng/sai · Phần III tự luận (bố cục rút gọn).' },
  { value: 'tn-tl', label: 'TN + Tự luận', desc: 'Phần đầu trắc nghiệm, phần sau tự luận.' },
  { value: 'full-essay', label: 'Toàn Tự luận', desc: 'Toàn bộ đề là câu hỏi tự luận trình bày.' },
]

const GRADES = Array.from({ length: 7 }, (_, i) => i + 6) // Khối 6..12

/* ── Dark palette giống LaTeX editor ── */
const D = {
  overlay: 'rgba(0,0,0,0.72)',
  bg: '#10111e',
  bg2: '#161728',
  border: '#1e2033',
  border2: '#2a2b3d',
  text: '#f1f5f9',
  muted: '#94a3b8',
  purple: '#7c3aed',
  purpleL: '#a78bfa',
  green: '#16a34a',
  greenL: '#4ade80',
} as const

interface AiExamDialogProps {
  open: boolean
  onClose: () => void
  /** Callback khi sinh thành công — nhận LaTeX + meta */
  onGenerated: (result: GenerateResult, config: ExamConfig) => void
  /** Giá trị khởi tạo (tuỳ chọn) */
  defaults?: Partial<ExamConfig>
  /** Nhãn nút xác nhận, ví dụ "Tạo tài liệu" hay "Chèn vào editor" */
  submitLabel?: string
}

export function AiExamDialog({
  open,
  onClose,
  onGenerated,
  defaults,
  submitLabel = 'Sinh đề bằng AI',
}: AiExamDialogProps) {
  const [subject, setSubject] = useState<ExamSubject>(defaults?.subject ?? 'Vật lý')
  const [grade, setGrade] = useState<number>(defaults?.grade ?? 11)
  const [topicsText, setTopicsText] = useState<string>((defaults?.topics ?? ['Dòng điện trong vật dẫn']).join(', '))
  const [duration, setDuration] = useState<number>(defaults?.duration ?? 45)
  const [format, setFormat] = useState<ExamFormat>(defaults?.format ?? 'bgd-2025')
  const [easy, setEasy] = useState<number>(defaults?.difficulty?.easy ?? 6)
  const [medium, setMedium] = useState<number>(defaults?.difficulty?.medium ?? 6)
  const [hard, setHard] = useState<number>(defaults?.difficulty?.hard ?? 3)
  const [veryHard, setVeryHard] = useState<number>(defaults?.difficulty?.veryHard ?? 1)
  const [includeAnswerKey, setIncludeAnswerKey] = useState<boolean>(defaults?.includeAnswerKey ?? true)
  const [title, setTitle] = useState<string>(defaults?.title ?? '')
  const [schoolName, setSchoolName] = useState<string>(defaults?.schoolName ?? 'TRƯỜNG THPT PHƯỚC BỬU')
  const [departmentName, setDepartmentName] = useState<string>(defaults?.departmentName ?? 'SỞ GD ĐT TP. HỒ CHÍ MINH')
  const [examLabel, setExamLabel] = useState<string>(defaults?.examLabel ?? 'ĐỀ THI MINH HOẠ')
  const [examSession, setExamSession] = useState<string>(defaults?.examSession ?? 'KIỂM TRA CUỐI HỌC KỲ II')
  const [examCode, setExamCode] = useState<string>(defaults?.examCode ?? '')
  const [schoolYear, setSchoolYear] = useState<string>(defaults?.schoolYear ?? '2025 – 2026')
  const [authorName, setAuthorName] = useState<string>(defaults?.authorName ?? '')
  const [notes, setNotes] = useState<string>(defaults?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const isBgd = format === 'bgd-2025'

  const total = useMemo(() => easy + medium + hard + veryHard, [easy, medium, hard, veryHard])

  if (!open) return null

  const handleSubmit = async () => {
    const config: ExamConfig = {
      subject, grade,
      topics: topicsText.split(/[,;]/).map((t) => t.trim()).filter(Boolean),
      duration,
      format,
      difficulty: { easy, medium, hard, veryHard } as DifficultyBreakdown,
      totalPoints: 10,
      title: title || undefined,
      schoolName: schoolName || undefined,
      authorName: authorName || undefined,
      includeAnswerKey,
      notes: notes || undefined,
      // Trường bổ sung cho chuẩn BGD 2025 (dùng khi format === 'bgd-2025')
      departmentName: departmentName || undefined,
      examLabel: examLabel || undefined,
      examSession: examSession || undefined,
      examCode: examCode.trim() || undefined,
      schoolYear: schoolYear || undefined,
    }
    if (total <= 0) {
      toast.error('Cần ít nhất 1 câu hỏi — hãy điền số câu theo độ khó.')
      return
    }
    try {
      setBusy(true)
      const result = await latexAiService.generateExam(config)
      if (result.source === 'local') {
        toast(
          'AI tạm chưa khả dụng — đã dùng generator cục bộ. Bạn vẫn có file LaTeX hoàn chỉnh để chỉnh sửa.',
          { icon: '⚙️', duration: 5200 },
        )
      } else {
        toast.success(`AI đã sinh đề với ${result.totalQuestions} câu hỏi.`)
      }
      onGenerated(result, config)
    } catch {
      toast.error('Không thể sinh đề — hãy thử lại sau.')
    } finally {
      setBusy(false)
    }
  }

  // ── Styles helper ──
  const label: React.CSSProperties = { color: D.muted, fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }
  const input: React.CSSProperties = {
    background: D.bg2, border: `1px solid ${D.border2}`, borderRadius: 8,
    color: D.text, fontSize: 13, padding: '8px 10px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const smallInput: React.CSSProperties = { ...input, padding: '6px 8px', textAlign: 'center' }
  const pillBase: React.CSSProperties = {
    border: `1px solid ${D.border2}`, borderRadius: 10, padding: '10px 12px',
    background: D.bg2, color: D.text, cursor: 'pointer', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: 2,
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: D.overlay, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px', overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div
        style={{
          background: D.bg, border: `1px solid ${D.border2}`, borderRadius: 16,
          width: '100%', maxWidth: 820, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `1px solid ${D.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ color: D.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
                Tạo đề bằng AI — LaTeX sẵn biên dịch
              </h2>
              <p style={{ color: D.muted, fontSize: 12, margin: '2px 0 0' }}>
                Chọn môn, khối, chủ đề, độ khó → hệ thống sinh ra tài liệu LaTeX hoàn chỉnh, chỉ việc Biên dịch ra PDF và in.
              </p>
            </div>
          </div>
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            style={{
              background: D.bg2, border: `1px solid ${D.border2}`, borderRadius: 8,
              color: D.muted, cursor: busy ? 'not-allowed' : 'pointer',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Row 1: Môn · Khối · Thời gian */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr', gap: 12 }}>
            <div>
              <label style={label}><BookOpen size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />Môn học</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value as ExamSubject)} style={input} disabled={busy}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Khối lớp</label>
              <select value={grade} onChange={(e) => setGrade(Number(e.target.value))} style={input} disabled={busy}>
                {GRADES.map((g) => <option key={g} value={g}>Khối {g}</option>)}
              </select>
            </div>
            <div>
              <label style={label}><Clock size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />Thời gian</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  value={duration}
                  min={15}
                  max={180}
                  step={5}
                  onChange={(e) => setDuration(Number(e.target.value) || 45)}
                  style={{ ...input, textAlign: 'center' }}
                  disabled={busy}
                />
                <span style={{ color: D.muted, fontSize: 12 }}>phút</span>
              </div>
            </div>
          </div>

          {/* Topics */}
          <div>
            <label style={label}>Chủ đề / phạm vi kiến thức (phân cách bằng dấu phẩy)</label>
            <input
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              placeholder="VD: Dao động điều hoà, Con lắc lò xo, Sóng cơ"
              style={input}
              disabled={busy}
            />
          </div>

          {/* Format */}
          <div>
            <label style={label}>Định dạng đề</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {FORMATS.map((f) => {
                const active = format === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    style={{
                      ...pillBase,
                      border: active ? `1px solid ${D.purple}` : pillBase.border,
                      background: active ? 'rgba(124,58,237,0.12)' : D.bg2,
                      position: 'relative',
                    }}
                    disabled={busy}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: active ? D.purpleL : D.text }}>
                        {f.label}
                      </span>
                      {f.badge && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          color: '#fff', padding: '2px 7px', borderRadius: 99, textTransform: 'uppercase',
                        }}>{f.badge}</span>
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: D.muted, lineHeight: 1.4 }}>{f.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Difficulty breakdown */}
          <div>
            <label style={label}>
              Phân bổ câu hỏi theo độ khó — <span style={{ color: D.text, fontWeight: 700 }}>tổng: {total} câu</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {([
                { key: 'easy', label: 'Nhận biết (NB)', v: easy, set: setEasy, color: '#22c55e' },
                { key: 'medium', label: 'Thông hiểu (TH)', v: medium, set: setMedium, color: '#f59e0b' },
                { key: 'hard', label: 'Vận dụng (VD)', v: hard, set: setHard, color: '#ef4444' },
                { key: 'veryHard', label: 'Vận dụng cao (VDC)', v: veryHard, set: setVeryHard, color: '#a78bfa' },
              ] as const).map((d) => (
                <div key={d.key} style={{
                  border: `1px solid ${D.border2}`, borderRadius: 10, padding: 10,
                  background: D.bg2, display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{d.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={d.v}
                    onChange={(e) => d.set(Math.max(0, Number(e.target.value) || 0))}
                    style={smallInput}
                    disabled={busy}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>Tiêu đề đề thi (tuỳ chọn)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Đề kiểm tra ${subject} — Khối ${grade}`}
                style={input}
                disabled={busy}
              />
            </div>
            <div>
              <label style={label}>Giáo viên soạn (tuỳ chọn)</label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                style={input}
                disabled={busy}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={label}>{isBgd ? 'Trường (in trong header trái)' : 'Trường / Tổ bộ môn (tuỳ chọn)'}</label>
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="VD: TRƯỜNG THPT ABC"
                style={input}
                disabled={busy}
              />
            </div>
            <div>
              <label style={label}>Ghi chú in ở đầu đề (tuỳ chọn)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='VD: "Học sinh không được sử dụng máy tính."'
                style={input}
                disabled={busy}
              />
            </div>
          </div>

          {/* ── BGD-only: Header 2 cột chuẩn Bộ GD&ĐT 2025 ── */}
          {isBgd && (
            <div
              style={{
                border: `1px dashed ${D.border2}`, borderRadius: 12, padding: 14,
                background: 'rgba(124,58,237,0.06)',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                  background: 'linear-gradient(135deg, #7c3aed, #22d3ee)',
                  color: '#fff', padding: '3px 8px', borderRadius: 99, textTransform: 'uppercase',
                }}>BGD 2025</span>
                <span style={{ color: D.text, fontSize: 13, fontWeight: 700 }}>Header 2 cột · Mã đề · Năm học</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>Sở GD&amp;ĐT</label>
                  <input
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    placeholder="VD: SỞ GD ĐT TP. HỒ CHÍ MINH"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label style={label}>Tên kỳ thi</label>
                  <input
                    value={examSession}
                    onChange={(e) => setExamSession(e.target.value)}
                    placeholder="VD: KIỂM TRA CUỐI HỌC KỲ II"
                    style={input}
                    disabled={busy}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 0.6fr', gap: 12 }}>
                <div>
                  <label style={label}>Loại đề (dòng trong header trái)</label>
                  <input
                    value={examLabel}
                    onChange={(e) => setExamLabel(e.target.value)}
                    placeholder="VD: ĐỀ THI MINH HOẠ SỐ 2"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label style={label}>Năm học</label>
                  <input
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    placeholder="VD: 2025 – 2026"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label style={label}>Mã đề (để trống → random)</label>
                  <input
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="VD: 456"
                    style={{ ...input, textAlign: 'center', fontWeight: 700, letterSpacing: '0.1em' }}
                    disabled={busy}
                  />
                </div>
              </div>

              <p style={{ color: D.muted, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
                Bố cục sẽ giống <strong style={{ color: D.text }}>đề minh hoạ Bộ GD&amp;ĐT 2025</strong>:
                4 phần (TN 4 lựa chọn · Đ/S · Trả lời ngắn · Tự luận), tổng <strong>10 điểm</strong>,
                header 2 cột Sở / Trường bên trái — Kỳ thi / Môn / Thời gian bên phải, khung "Mã đề" ở góc,
                đánh số trang, kết thúc <em>— HẾT —</em>.
              </p>
            </div>
          )}

          {/* Answer key */}
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 12, border: `1px solid ${D.border2}`, borderRadius: 10,
              background: includeAnswerKey ? 'rgba(74,222,128,0.06)' : D.bg2,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={includeAnswerKey}
              onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              disabled={busy}
              style={{ width: 16, height: 16, cursor: busy ? 'not-allowed' : 'pointer' }}
            />
            <CheckCircle2 size={16} color={includeAnswerKey ? D.greenL : D.muted} />
            <div style={{ flex: 1 }}>
              <span style={{ color: D.text, fontWeight: 600, fontSize: 13 }}>Xuất kèm bảng đáp án</span>
              <p style={{ color: D.muted, fontSize: 12, margin: '2px 0 0' }}>
                Nếu bật, phần đáp án tóm tắt sẽ in ở cuối tài liệu để giáo viên chấm nhanh.
              </p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderTop: `1px solid ${D.border}`, background: D.bg2,
          borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
        }}>
          <div style={{ color: D.muted, fontSize: 12 }}>
            <Wand2 size={13} style={{ verticalAlign: '-2px', marginRight: 4, color: D.purpleL }} />
            Kết quả là LaTeX hoàn chỉnh, biên dịch ra PDF bằng nút <strong style={{ color: D.greenL }}>Biên dịch</strong>.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => !busy && onClose()}
              disabled={busy}
              style={{
                background: D.bg2, border: `1px solid ${D.border2}`, borderRadius: 8,
                color: D.muted, cursor: busy ? 'not-allowed' : 'pointer',
                padding: '8px 20px', fontSize: 13, fontWeight: 600,
              }}
            >Huỷ</button>
            <button
              onClick={handleSubmit}
              disabled={busy || total <= 0}
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #22d3ee)', border: 'none', borderRadius: 8,
                color: '#fff', cursor: busy || total <= 0 ? 'not-allowed' : 'pointer',
                opacity: busy || total <= 0 ? 0.7 : 1,
                padding: '10px 22px', fontSize: 14, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {busy
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Sparkles size={14} />
              }
              {busy ? 'Đang sinh đề...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AiExamDialog
