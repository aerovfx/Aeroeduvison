/**
 * AiSectionWizardDialog — wizard 4 phần riêng để AI sinh nội dung từng phần
 *
 * User: "thêm 1 form tích hợp AI để Giáo viên lấy mẫu latex và AI sẽ hỏi
 * người dùng muốn ra đề theo nội dung nào của các phần
 *  1: MCQ
 *  2: Trắc nghiệm đúng sai
 *  3: Trả lời ngắn
 *  4: Tự luận"
 *
 * Khác AiExamDialog (chỉ topic chung): wizard này cho GV nhập riêng cho
 * từng phần — vd MCQ về "Dao động điều hoà", Đ/S về "Dòng điện xoay chiều",
 * Trả lời ngắn về "Mạch RLC", Tự luận về "Bài tập tổng hợp".
 *
 * Implementation: gọi /api/ai/generate-questions 4 lần (mỗi section 1 call)
 * — tận dụng quota DeepSeek/Claude đã wire sẵn. Convert JSON → LaTeX
 * client-side với template chuẩn BGD 2025 (4 phần, 10 điểm).
 */
import { useState, useMemo } from 'react'
import {
  X, Sparkles, Loader2, FileText, CheckSquare, Type, PenLine,
  BookOpen, GraduationCap, Wand2, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { LATEX_TEMPLATES } from '@/lib/latex-templates'

type SectionType = 'MCQ' | 'MULTIPLE_TF' | 'SHORT_ANSWER' | 'ESSAY'

interface Section {
  type: SectionType
  enabled: boolean
  label: string
  icon: React.ElementType
  color: string
  topic: string
  count: number
  points: number
  placeholder: string
}

const INITIAL_SECTIONS: Section[] = [
  {
    type: 'MCQ',
    enabled: true,
    label: 'Phần I — Trắc nghiệm 4 lựa chọn (A/B/C/D)',
    icon: CheckSquare,
    color: '#3b82f6',
    topic: '',
    count: 8,
    points: 4,
    placeholder: 'VD: Dao động điều hoà · Phương trình dao động · Năng lượng dao động · Con lắc đơn',
  },
  {
    type: 'MULTIPLE_TF',
    enabled: true,
    label: 'Phần II — Đúng/Sai 4 mệnh đề',
    icon: Type,
    color: '#10b981',
    topic: '',
    count: 2,
    points: 2,
    placeholder: 'VD: Tính chất sóng cơ · Giao thoa sóng — mỗi câu 4 mệnh đề kiểm tra hiểu sâu',
  },
  {
    type: 'SHORT_ANSWER',
    enabled: true,
    label: 'Phần III — Trả lời ngắn (4 ký tự số)',
    icon: PenLine,
    color: '#06b6d4',
    topic: '',
    count: 4,
    points: 2,
    placeholder: 'VD: Bài toán tính chu kỳ · Năng lượng · Vận tốc cực đại — kết quả là số',
  },
  {
    type: 'ESSAY',
    enabled: true,
    label: 'Phần IV — Tự luận trình bày',
    icon: FileText,
    color: '#f59e0b',
    topic: '',
    count: 2,
    points: 2,
    placeholder: 'VD: Giải bài tổng hợp 3 vế · Chứng minh công thức · Phân tích đồ thị',
  },
]

interface Props {
  open: boolean
  onClose: () => void
  /** Callback khi sinh xong — nhận LaTeX hoàn chỉnh để chèn vào editor */
  onGenerated: (latex: string, meta: { sections: number; totalQuestions: number; provider: string }) => void
}

export function AiSectionWizardDialog({ open, onClose, onGenerated }: Props) {
  const [templateId, setTemplateId] = useState<string>('')
  const [subject, setSubject] = useState('Vật lí')
  const [grade, setGrade] = useState('11')
  const [examTitle, setExamTitle] = useState('Đề kiểm tra giữa kỳ')
  const [duration, setDuration] = useState(45)
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ step: number; total: number; label: string } | null>(null)

  const totalQuestions = useMemo(
    () => sections.filter(s => s.enabled).reduce((sum, s) => sum + s.count, 0),
    [sections],
  )
  const totalPoints = useMemo(
    () => sections.filter(s => s.enabled).reduce((sum, s) => sum + s.points, 0),
    [sections],
  )

  if (!open) return null

  const updateSection = (idx: number, patch: Partial<Section>) => {
    setSections(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const handleSubmit = async () => {
    const enabledSections = sections.filter(s => s.enabled)
    if (enabledSections.length === 0) {
      toast.error('Vui lòng bật ít nhất 1 phần')
      return
    }
    // Validate có topic
    const empty = enabledSections.find(s => !s.topic.trim())
    if (empty) {
      toast.error(`Vui lòng nhập nội dung cho "${empty.label}"`)
      return
    }

    setBusy(true)
    setProgress({ step: 0, total: enabledSections.length, label: 'Bắt đầu...' })

    const allQuestions: Array<{ section: Section; raw: any }> = []
    let lastProvider = 'deepseek'

    try {
      for (let i = 0; i < enabledSections.length; i++) {
        const s = enabledSections[i]
        setProgress({ step: i + 1, total: enabledSections.length, label: `Đang sinh ${s.label}...` })

        try {
          const { data } = await api.post<{
            questions: any[]; count: number; provider: string;
          }>('/ai/generate-questions', {
            topic: `${s.topic} (${subject} lớp ${grade})`,
            count: s.count,
            subject, grade,
            difficulty: 'mixed',
            types: [s.type],
          })
          allQuestions.push({ section: s, raw: data.questions || [] })
          lastProvider = data.provider || lastProvider
        } catch (err: any) {
          const status = err?.response?.status
          if (status === 429) {
            toast.error('Đã dùng hết quota AI hôm nay. Đăng ký Pro để dùng không giới hạn.')
            setBusy(false)
            setProgress(null)
            return
          }
          toast.error(`Lỗi sinh ${s.label}: ${err?.response?.data?.message || err?.message}`)
        }
      }

      // Build full LaTeX from collected questions
      setProgress({ step: enabledSections.length, total: enabledSections.length, label: 'Đang tổng hợp LaTeX...' })
      const latex = buildLatex({
        subject, grade, title: examTitle, duration,
        templateId,
        sections: allQuestions,
      })

      const totalGenerated = allQuestions.reduce((sum, x) => sum + x.raw.length, 0)
      toast.success(`AI đã sinh ${totalGenerated} câu hỏi qua ${enabledSections.length} phần (${lastProvider})`)
      onGenerated(latex, { sections: enabledSections.length, totalQuestions: totalGenerated, provider: lastProvider })
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi sinh đề')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 16px', overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full"
        style={{ maxWidth: 860, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}>
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                AI sinh đề LaTeX theo phần
                <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                  style={{
                    background: 'linear-gradient(90deg, rgba(124,58,237,0.25), rgba(6,182,212,0.25))',
                    color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)',
                  }}>
                  Claude · DeepSeek
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Chọn mẫu LaTeX → khai báo nội dung từng phần → AI tự sinh câu hỏi → bạn chỉnh sửa
              </p>
            </div>
          </div>
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Step 1 — Template + Metadata */}
          <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">1</div>
              <h3 className="text-sm font-bold text-foreground">Chọn mẫu LaTeX + thông tin đề</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                  Mẫu LaTeX
                </label>
                <select
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Chuẩn BGD 2025 (mặc định — 4 phần, 10đ, header 2 cột)</option>
                  {LATEX_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                  Tiêu đề đề
                </label>
                <input
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                    Môn
                  </label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                    Lớp
                  </label>
                  <input
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                    Phút
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value) || 45)}
                    className="w-full px-2 py-2 rounded-lg bg-muted/30 border border-border text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 — Sections content */}
          <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">2</div>
              <h3 className="text-sm font-bold text-foreground">Khai báo nội dung từng phần</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              💡 AI sẽ sinh câu hỏi theo đúng chủ đề bạn nhập. Có thể tắt phần không cần.
            </p>

            {sections.map((s, idx) => {
              const Icon = s.icon
              return (
                <div
                  key={s.type}
                  className={`rounded-lg border p-3 transition-all ${
                    s.enabled
                      ? 'bg-card border-border'
                      : 'bg-muted/10 border-muted opacity-60'
                  }`}
                  style={{ borderLeftWidth: 3, borderLeftColor: s.enabled ? s.color : '#64748b' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={e => updateSection(idx, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                    <h4 className="text-sm font-bold flex-1" style={{ color: s.enabled ? s.color : undefined }}>
                      {s.label}
                    </h4>
                    {s.enabled && (
                      <span className="text-[10px] text-muted-foreground">
                        {s.count} câu · {s.points}đ
                      </span>
                    )}
                  </div>

                  {s.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 ml-6">
                      <div className="md:col-span-8">
                        <label className="text-[10px] font-bold text-muted-foreground mb-1 block">
                          Nội dung AI ra đề
                        </label>
                        <textarea
                          value={s.topic}
                          onChange={e => updateSection(idx, { topic: e.target.value })}
                          placeholder={s.placeholder}
                          rows={2}
                          className="w-full px-2 py-1.5 rounded bg-muted/30 border border-border text-xs focus:outline-none focus:border-purple-500 resize-y"
                          disabled={busy}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-muted-foreground mb-1 block">
                          Số câu
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={s.count}
                          onChange={e => updateSection(idx, { count: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                          className="w-full px-2 py-1.5 rounded bg-muted/30 border border-border text-xs focus:outline-none focus:border-purple-500"
                          disabled={busy}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-bold text-muted-foreground mb-1 block">
                          Điểm
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={s.points}
                          onChange={e => updateSection(idx, { points: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full px-2 py-1.5 rounded bg-muted/30 border border-border text-xs focus:outline-none focus:border-purple-500"
                          disabled={busy}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Summary */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/5 border border-purple-500/30">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Tổng: <span className="font-black">{totalQuestions}</span> câu
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-bold text-foreground">{totalPoints}đ</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{duration} phút</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {sections.filter(s => s.enabled).length}/{sections.length} phần
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {progress && (
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm font-bold text-purple-300">{progress.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {progress.step}/{progress.total}
                </span>
              </div>
              <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                  style={{ width: `${(progress.step / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 p-5 border-t border-border">
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-lg bg-muted/30 hover:bg-muted text-foreground text-sm font-bold disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || totalQuestions === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-bold disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{
              background: busy || totalQuestions === 0
                ? '#6b7280'
                : 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              boxShadow: busy ? 'none' : '0 8px 24px rgba(139,92,246,0.35)',
            }}
          >
            {busy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> AI đang sinh đề...</>
              : <><Sparkles className="w-4 h-4" /> Sinh đề & chèn vào editor <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LaTeX builder — combine 4 sections vào tài liệu hoàn chỉnh
// Format: chuẩn BGD 2025 với 4 phần riêng biệt + answer key cuối
// ─────────────────────────────────────────────────────────────
interface BuildArgs {
  subject: string
  grade: string
  title: string
  duration: number
  templateId: string
  sections: Array<{ section: Section; raw: any[] }>
}

function buildLatex(args: BuildArgs): string {
  const { subject, grade, title, duration, sections } = args
  const totalQ = sections.reduce((sum, x) => sum + x.raw.length, 0)
  const totalPts = sections.filter(x => x.section.enabled).reduce((sum, x) => sum + x.section.points, 0)
  const examCode = Math.floor(100 + Math.random() * 900)

  const header = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T5]{fontenc}
\\usepackage{vntex}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{geometry}
\\geometry{margin=2cm}
\\usepackage{enumitem}
\\usepackage{multicol}
\\usepackage{tabularx}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{\\thepage/\\pageref{LastPage}}
\\usepackage{lastpage}

\\begin{document}

% ── HEADER 2 cột chuẩn BGD ──
\\begin{tabularx}{\\textwidth}{Xl}
\\begin{minipage}{0.5\\textwidth}
\\textbf{SỞ GD\\&ĐT TP. HỒ CHÍ MINH}\\\\
\\textbf{TRƯỜNG THPT PHƯỚC BỬU}\\\\[3pt]
${esc(title.toUpperCase())}\\\\
NĂM HỌC 2025--2026
\\end{minipage}
&
\\begin{minipage}{0.5\\textwidth}
\\textbf{KIỂM TRA MÔN: ${esc(subject.toUpperCase())} -- LỚP ${esc(grade)}}\\\\
Thời gian làm bài: ${duration} phút\\\\
Mã đề: \\textbf{${examCode}}\\\\
(Đề có ${totalQ} câu / ${totalPts}đ)
\\end{minipage}
\\end{tabularx}

\\noindent\\rule{\\textwidth}{1pt}

\\vspace{0.5em}
\\textbf{Họ và tên thí sinh:} \\dotfill \\\\
\\textbf{Số báo danh:} \\dotfill \\quad \\textbf{Lớp:} \\dotfill

\\vspace{0.8em}
\\noindent\\rule{\\textwidth}{0.5pt}
`

  const partsLatex: string[] = []
  let romanCounter = 0
  const ROMAN = ['I', 'II', 'III', 'IV', 'V']

  for (const { section, raw } of sections) {
    if (!section.enabled || raw.length === 0) continue
    romanCounter++
    const partLabel = `PHẦN ${ROMAN[romanCounter - 1]}`

    if (section.type === 'MCQ') {
      partsLatex.push(`
\\section*{${partLabel}. TRẮC NGHIỆM 4 LỰA CHỌN (${section.points}đ)}
\\textit{Học sinh tô đáp án đúng (A/B/C/D) vào phiếu trả lời trắc nghiệm.}

\\begin{enumerate}[label=\\textbf{Câu \\arabic*.}, leftmargin=2em]
${raw.map(q => buildMcqLatex(q)).join('\n')}
\\end{enumerate}
`)
    } else if (section.type === 'MULTIPLE_TF') {
      partsLatex.push(`
\\section*{${partLabel}. ĐÚNG/SAI 4 MỆNH ĐỀ (${section.points}đ)}
\\textit{Học sinh chọn Đúng (Đ) hoặc Sai (S) cho mỗi mệnh đề a, b, c, d.}

\\begin{enumerate}[label=\\textbf{Câu \\arabic*.}, leftmargin=2em]
${raw.map(q => buildTfLatex(q)).join('\n')}
\\end{enumerate}
`)
    } else if (section.type === 'SHORT_ANSWER') {
      partsLatex.push(`
\\section*{${partLabel}. TRẢ LỜI NGẮN (${section.points}đ)}
\\textit{Học sinh điền kết quả (4 ký tự số) vào phiếu trả lời.}

\\begin{enumerate}[label=\\textbf{Câu \\arabic*.}, leftmargin=2em]
${raw.map(q => buildShortLatex(q)).join('\n')}
\\end{enumerate}
`)
    } else if (section.type === 'ESSAY') {
      partsLatex.push(`
\\section*{${partLabel}. TỰ LUẬN (${section.points}đ)}
\\textit{Học sinh trình bày bài giải vào tờ giấy thi.}

\\begin{enumerate}[label=\\textbf{Câu \\arabic*.}, leftmargin=2em]
${raw.map(q => buildEssayLatex(q)).join('\n')}
\\end{enumerate}
`)
    }
  }

  // Answer key
  const answerKey = sections
    .filter(x => x.section.enabled && x.raw.length > 0)
    .map(({ section, raw }) => {
      const answers = raw.map((q, i) => `${i + 1}. ${q.correctAnswer || q.answer || '?'}`).join(' \\quad ')
      return `\\textbf{${section.label}:} ${answers}`
    })
    .join('\\\\\n')

  const footer = `
\\newpage
\\section*{ĐÁP ÁN \\& HƯỚNG DẪN CHẤM}
${answerKey}

\\end{document}
`

  return header + '\n' + partsLatex.join('\n') + '\n' + footer
}

function esc(s: string): string {
  return String(s || '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
}

function buildMcqLatex(q: any): string {
  const content = q.content || 'Câu hỏi'
  const options = Array.isArray(q.options) ? q.options : []
  // Don't esc content/options — AI may include $...$ LaTeX inline
  return `\\item ${content}
\\begin{enumerate}[label=\\textbf{\\Alph*.}, leftmargin=1.5em, itemsep=2pt]
${options.slice(0, 4).map((o: string) => `\\item ${o}`).join('\n')}
\\end{enumerate}`
}

function buildTfLatex(q: any): string {
  const content = q.content || ''
  const options = Array.isArray(q.options) ? q.options : []
  return `\\item ${content}
\\begin{enumerate}[label=\\textbf{\\alph*)}, leftmargin=1.5em, itemsep=2pt]
${options.slice(0, 4).map((o: string) => `\\item ${o}`).join('\n')}
\\end{enumerate}`
}

function buildShortLatex(q: any): string {
  const content = q.content || ''
  return `\\item ${content}
\\vspace{0.5em}
Trả lời: \\rule{4cm}{0.4pt}`
}

function buildEssayLatex(q: any): string {
  const content = q.content || ''
  return `\\item ${content}
\\vspace{2.5em}`
}
