/**
 * AiTemplateGuideModal — Hướng dẫn GV dùng AI (ChatGPT/Gemini/Claude)
 * để tự động sinh văn bản LaTeX dựa trên template.
 *
 * Mỗi template có aiPrompt sẵn — user copy → paste vào AI → nhận LaTeX code
 * hoàn chỉnh → paste lại vào editor → biên dịch ra PDF.
 *
 * Modal có:
 *   - Filter theo category (lesson/exam/admin/research/personal/...)
 *   - Search theo tên + tags
 *   - Hiển thị prompt với nút "Copy" + link mở ChatGPT/Gemini
 *   - "Apply template" để tải template vào editor (cần passed callback)
 */
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Copy, Sparkles, ExternalLink, Search, FileText, Check,
  GraduationCap, BookOpen, Briefcase, FlaskConical, User, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { LATEX_TEMPLATES, type LatexTemplateOption } from '@/lib/latex-templates'

const CATEGORY_META: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  exam:     { label: 'Đề thi',          icon: BookOpen,      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  lesson:   { label: 'Bài giảng',       icon: GraduationCap, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  admin:    { label: 'Hành chính',      icon: Building2,     color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  research: { label: 'Nghiên cứu',      icon: FlaskConical,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  personal: { label: 'Cá nhân / CV',    icon: User,          color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  business: { label: 'Kinh doanh',      icon: Briefcase,     color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  student:  { label: 'Sinh viên',       icon: GraduationCap, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
}

const AI_TOOLS = [
  { name: 'ChatGPT',  url: 'https://chat.openai.com',          color: '#10a37f' },
  { name: 'Claude',   url: 'https://claude.ai',                color: '#cc785c' },
  { name: 'Gemini',   url: 'https://gemini.google.com',        color: '#4285f4' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com',        color: '#5e6ed4' },
]

interface Props {
  open: boolean
  onClose: () => void
  /** Optional callback để apply template trực tiếp vào editor (LaTeXEditor list view không có, LaTeXEditorDocument có) */
  onApplyTemplate?: (tpl: LatexTemplateOption) => void
}

export default function AiTemplateGuideModal({ open, onClose, onApplyTemplate }: Props) {
  const [activeCat, setActiveCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>(LATEX_TEMPLATES.find(t => t.aiPrompt)?.id || '')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Filter templates: chỉ show templates có aiPrompt (V2 enhanced)
  const visible = useMemo(() => {
    let list = LATEX_TEMPLATES.filter(t => t.aiPrompt)
    if (activeCat !== 'all') list = list.filter(t => t.category === activeCat)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      )
    }
    return list
  }, [activeCat, search])

  // Categories có ít nhất 1 template
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const t of LATEX_TEMPLATES) if (t.aiPrompt && t.category) set.add(t.category)
    return Array.from(set)
  }, [])

  const selected = visible.find(t => t.id === selectedId) || visible[0]

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
      toast.success('Đã copy vào clipboard')
    } catch {
      toast.error('Trình duyệt không cho phép copy')
    }
  }

  if (!open) return null

  const content = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">
              🤖 Hướng dẫn dùng AI tạo văn bản LaTeX
            </h2>
            <p className="text-xs text-zinc-400">
              Copy prompt mẫu → Paste vào ChatGPT/Claude/Gemini → Nhận LaTeX code hoàn chỉnh → Paste lại vào editor
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-zinc-800 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: 2 columns */}
        <div className="flex-1 min-h-0 flex">
          {/* LEFT: template list */}
          <div className="w-72 border-r border-zinc-800 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm mẫu..."
                  className="w-full pl-8 pr-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Category filter */}
            <div className="p-2 border-b border-zinc-800 flex flex-wrap gap-1">
              <button
                onClick={() => setActiveCat('all')}
                className={`px-2 py-1 text-[10.5px] rounded font-bold transition-colors ${
                  activeCat === 'all'
                    ? 'bg-violet-500/25 text-violet-200 border border-violet-400/50'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Tất cả ({visible.length})
              </button>
              {categories.map(cat => {
                const m = CATEGORY_META[cat]
                if (!m) return null
                const count = LATEX_TEMPLATES.filter(t => t.aiPrompt && t.category === cat).length
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCat(cat)}
                    className={`px-2 py-1 text-[10.5px] rounded font-bold transition-colors inline-flex items-center gap-1 ${
                      activeCat === cat
                        ? `${m.color} border`
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m.label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Template list */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {visible.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 py-6">Không tìm thấy mẫu</p>
              ) : visible.map(t => {
                const m = t.category ? CATEGORY_META[t.category] : null
                const isActive = selected?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-violet-500/15 border border-violet-400/40'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="text-sm font-bold text-white line-clamp-2">{t.name}</div>
                    {m && (
                      <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded border mt-1.5 ${m.color}`}>
                        <m.icon className="w-2.5 h-2.5" />
                        {m.label}
                      </span>
                    )}
                    {t.description && (
                      <div className="text-[10.5px] text-zinc-500 line-clamp-2 mt-1">
                        {t.description}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* RIGHT: prompt detail */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <FileText className="w-12 h-12" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{selected.name}</h3>
                  {selected.description && (
                    <p className="text-xs text-zinc-400">{selected.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selected.audience && (
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        👤 {selected.audience}
                      </span>
                    )}
                    {(selected.tags || []).map(t => (
                      <span key={t} className="text-[10.5px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Step 1: Open AI */}
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
                  <div className="text-xs font-bold text-violet-300 uppercase tracking-wider mb-2">
                    Bước 1 · Mở công cụ AI
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {AI_TOOLS.map(t => (
                      <a
                        key={t.name}
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-violet-400 bg-zinc-900 text-sm text-white font-medium"
                        style={{ borderLeft: `3px solid ${t.color}` }}
                      >
                        {t.name}
                        <ExternalLink className="w-3 h-3 text-zinc-500" />
                      </a>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-zinc-500 mt-2">
                    💡 Gợi ý: <b className="text-violet-300">Claude</b> giỏi nhất khi viết LaTeX dài + chính xác cú pháp.
                  </p>
                </div>

                {/* Step 2: Copy prompt */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Bước 2 · Copy prompt
                    </div>
                    <button
                      onClick={() => copyToClipboard(selected.aiPrompt!, 'prompt')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        copiedField === 'prompt'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/15 text-amber-200 border border-amber-500/40 hover:bg-amber-500/25'
                      }`}
                    >
                      {copiedField === 'prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'prompt' ? 'Đã copy!' : 'Copy prompt'}
                    </button>
                  </div>
                  <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 max-h-72 overflow-y-auto">
                    <pre className="text-[11.5px] text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {selected.aiPrompt}
                    </pre>
                  </div>
                  <p className="text-[10.5px] text-zinc-500 mt-2">
                    ⚙ Trước khi copy, hãy sửa các phần <code className="text-amber-300">[...]</code> trong prompt
                    bằng thông tin của bạn (tên trường, môn, lý do, v.v.)
                  </p>
                </div>

                {/* Step 3: Apply */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2">
                    Bước 3 · Paste LaTeX code AI trả về vào editor
                  </div>
                  <ol className="text-xs text-emerald-100/85 space-y-1 ml-4 list-decimal">
                    <li>AI trả về 1 block code LaTeX bắt đầu <code className="text-emerald-200">\documentclass...</code></li>
                    <li>Copy toàn bộ code → quay lại editor inphysic</li>
                    <li>Paste vào trình soạn → bấm <b>Biên dịch</b> để xem PDF</li>
                    <li>Nếu lỗi: hỏi AI <i>"Code trên báo lỗi: [paste lỗi]. Sửa giúp tôi"</i></li>
                  </ol>
                  {onApplyTemplate && (
                    <button
                      onClick={() => { onApplyTemplate(selected); onClose() }}
                      className="mt-3 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Áp dụng template gốc vào editor
                    </button>
                  )}
                </div>

                {/* Tips */}
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs text-cyan-100/85">
                  <div className="font-bold text-cyan-300 mb-1.5">💡 Mẹo nâng cao</div>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>Thêm vào cuối prompt: <i>"Output ONLY the LaTeX code, no explanation"</i> để AI không kèm text thừa</li>
                    <li>Nếu code quá dài → AI có thể bị cắt. Hỏi tiếp: <i>"Continue from where you stopped"</i></li>
                    <li>Sau khi AI sinh xong, có thể fine-tune: <i>"Đổi font Times sang Charter"</i> hoặc <i>"Tăng kích cỡ heading lên \\Huge"</i></li>
                    <li>Lưu prompt yêu thích trong Notes app để tái sử dụng nhanh</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
