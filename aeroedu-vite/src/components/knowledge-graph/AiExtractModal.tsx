/**
 * AiExtractModal — Modal "Trích xuất tri thức bằng AI"
 *
 * GV/HS có 2 cách input:
 *   1. Tab "Văn bản"     — paste text trực tiếp (ví dụ: nội dung 1 chương sách)
 *   2. Tab "Lesson Plan" — chọn 1 giáo án đã có trong DB
 *
 * Sau khi AI extract xong → hiện preview các entities (topics/concepts/formulas
 * + edges). User bấm "Áp dụng" → backend persist + tự link similarity → graph
 * ngoài tự refresh node mới.
 */
import { useEffect, useState } from 'react'
import {
  X, Sparkles, FileText, Loader2, Check, AlertCircle, RefreshCw,
  Plus, Network, ChevronRight,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  knowledgeGraphService as kgs,
  NODE_TYPE_COLORS, NODE_TYPE_LABELS,
  type KgExtractResult, type KgLessonPlanSource,
} from '@/services/knowledge-graph.service'

interface Props {
  open: boolean
  onClose: () => void
  /** Gọi sau khi extract+persist thành công với 1 nodeId để focus graph vào */
  onApplied?: (focusNodeId: string | null) => void
}

type Tab = 'text' | 'lesson_plan'

export default function AiExtractModal({ open, onClose, onApplied }: Props) {
  const [tab, setTab] = useState<Tab>('text')
  const [text, setText] = useState('')
  const [lessonPlans, setLessonPlans] = useState<KgLessonPlanSource[]>([])
  const [lpLoading, setLpLoading] = useState(false)
  const [selectedLpId, setSelectedLpId] = useState<string>('')
  const [extracting, setExtracting] = useState(false)
  const [linking, setLinking] = useState(false)
  const [result, setResult] = useState<KgExtractResult | null>(null)
  const [autoLinkOn, setAutoLinkOn] = useState(true)

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setText('')
      setSelectedLpId('')
      setResult(null)
      setExtracting(false)
      setLinking(false)
    }
  }, [open])

  // Lazy load lesson plans khi switch sang tab lesson_plan
  useEffect(() => {
    if (open && tab === 'lesson_plan' && lessonPlans.length === 0 && !lpLoading) {
      setLpLoading(true)
      kgs.listLessonPlans(50)
        .then(setLessonPlans)
        .catch(e => {
          console.warn('[kg-extract] load lesson plans failed', e?.message)
          toast.error('Không tải được danh sách giáo án')
        })
        .finally(() => setLpLoading(false))
    }
  }, [open, tab, lessonPlans.length, lpLoading])

  const canExtract =
    !extracting && (
      (tab === 'text' && text.trim().length >= 30) ||
      (tab === 'lesson_plan' && selectedLpId)
    )

  const handleExtract = async () => {
    if (!canExtract) return
    setExtracting(true)
    setResult(null)
    try {
      const input = tab === 'text'
        ? { text: text.trim(), autoLink: autoLinkOn }
        : { source: { type: 'lesson_plan' as const, id: selectedLpId }, autoLink: autoLinkOn }
      const r = await kgs.extract(input)
      setResult(r)
      const totalEntities =
        r.extracted.topics.length + r.extracted.concepts.length + r.extracted.formulas.length
      toast.success(
        `AI đã trích ${totalEntities} entity (${r.persisted.newNodes.length} mới, ${r.persisted.reusedNodes.length} reuse)`
      )
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.rawPreview || e?.message || 'Lỗi extract'
      toast.error(msg.slice(0, 200))
    } finally {
      setExtracting(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    // Focus vào source node nếu có, hoặc node mới đầu tiên
    const focusId = result.sourceNodeId || result.persisted.newNodes[0]?.id || null
    onApplied?.(focusId)
    onClose()
  }

  const handleLinkSimilar = async () => {
    if (linking) return
    setLinking(true)
    try {
      const r = await kgs.linkSimilar({ threshold: 0.65 })
      toast.success(`Đã link ${r.linked} cặp node tương đồng (quét ${r.scanned})`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi link similarity')
    } finally {
      setLinking(false)
    }
  }

  if (!open) return null

  return (
    <div
      onClick={() => !extracting && onClose()}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#0d0e17] border border-cyan-500/30 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl"
        style={{ boxShadow: '0 24px 80px rgba(34,211,238,0.15)' }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-white/10 flex items-center justify-between"
          style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.12), transparent)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"
              style={{ boxShadow: '0 4px 14px rgba(34,211,238,0.4)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">🤖 Trích xuất tri thức bằng AI</h2>
              <p className="text-xs text-white/50">AI đọc nội dung → tự động sinh nodes + edges vào đồ thị</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={extracting}
            className="text-slate-400 hover:text-white p-1 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 flex gap-1 border-b border-white/10">
          {([
            { key: 'text' as const,         label: 'Từ văn bản',     icon: FileText },
            { key: 'lesson_plan' as const,  label: 'Từ giáo án',     icon: Network  },
          ]).map(t => {
            const TabIcon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-bold border-b-2 inline-flex items-center gap-1.5 -mb-px ${
                  tab === t.key
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Tab: text */}
          {tab === 'text' && !result && (
            <div>
              <label className="block text-xs uppercase font-bold text-white/40 tracking-wider mb-2">
                Văn bản nguồn (≥30 ký tự, tối đa ~30k)
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={10}
                placeholder="Paste nội dung 1 chương sách / 1 phần giáo án / 1 bài giảng... AI sẽ trích Topics, Concepts, Formulas tự động."
                disabled={extracting}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-cyan-400/50 resize-y"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                <span>{text.length.toLocaleString('vi-VN')} ký tự</span>
                <span className={text.length < 30 ? 'text-rose-400' : 'text-emerald-400'}>
                  {text.length < 30 ? `Cần thêm ${30 - text.length} ký tự` : '✓ Đủ độ dài'}
                </span>
              </div>
            </div>
          )}

          {/* Tab: lesson_plan */}
          {tab === 'lesson_plan' && !result && (
            <div>
              <label className="block text-xs uppercase font-bold text-white/40 tracking-wider mb-2">
                Chọn giáo án có sẵn
              </label>
              {lpLoading ? (
                <div className="text-xs text-slate-400 italic flex items-center gap-2 py-3">
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang tải danh sách giáo án…
                </div>
              ) : lessonPlans.length === 0 ? (
                <div className="text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg px-3 py-3">
                  Chưa có giáo án nào trong DB. Vào{' '}
                  <span className="text-cyan-300">/teacher/lesson-plans</span> để soạn trước.
                </div>
              ) : (
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {lessonPlans.map(lp => (
                    <button
                      key={lp.id}
                      onClick={() => setSelectedLpId(lp.id)}
                      disabled={extracting}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        selectedLpId === lp.id
                          ? 'bg-cyan-500/15 border-cyan-400/50'
                          : 'bg-white/5 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">{lp.title}</div>
                      <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-2">
                        {lp.subject && <span>📚 {lp.subject}</span>}
                        {!!lp.wordCount && <span>· {lp.wordCount} từ</span>}
                        {lp.updatedAt && <span>· {new Date(lp.updatedAt).toLocaleDateString('vi-VN')}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Result preview */}
          {result && (
            <div className="space-y-4">
              {/* Stats banner */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Topics',   count: result.extracted.topics.length,   color: '#34d399' },
                  { label: 'Concepts', count: result.extracted.concepts.length, color: '#facc15' },
                  { label: 'Formulas', count: result.extracted.formulas.length, color: '#fb923c' },
                  { label: 'Edges',    count: result.extracted.edges.length,    color: '#60a5fa' },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                    <div className="text-[10px] uppercase text-white/50 tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Persisted summary */}
              <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-3 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                  <Check className="w-3.5 h-3.5" /> Đã lưu vào graph
                </div>
                <div className="space-y-0.5 text-white/70">
                  <div>· {result.persisted.newNodes.length} <strong className="text-white">nodes mới</strong> insert</div>
                  <div>· {result.persisted.reusedNodes.length} nodes reuse (đã có trong graph)</div>
                  <div>· {result.persisted.newEdges.length} edges mới</div>
                  {result.autoLink && (
                    <div>· {result.autoLink.linked} edges similarity tự link</div>
                  )}
                  {result.persisted.skippedEdges > 0 && (
                    <div className="text-white/40">· {result.persisted.skippedEdges} edges bỏ qua (duplicate hoặc invalid)</div>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[10px] text-white/40">
                  Hoàn tất trong {(result.tookMs / 1000).toFixed(1)}s
                </div>
              </div>

              {/* Extracted entities lists */}
              {result.extracted.topics.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: NODE_TYPE_COLORS.Topic.stroke }} />
                    Topics ({result.extracted.topics.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.extracted.topics.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-md border"
                        style={{ background: NODE_TYPE_COLORS.Topic.fill, borderColor: NODE_TYPE_COLORS.Topic.stroke, color: NODE_TYPE_COLORS.Topic.text }}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.extracted.concepts.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: NODE_TYPE_COLORS.Concept.stroke }} />
                    Concepts ({result.extracted.concepts.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.extracted.concepts.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-md border"
                        style={{ background: NODE_TYPE_COLORS.Concept.fill, borderColor: NODE_TYPE_COLORS.Concept.stroke, color: NODE_TYPE_COLORS.Concept.text }}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {result.extracted.formulas.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: NODE_TYPE_COLORS.Formula.stroke }} />
                    Formulas ({result.extracted.formulas.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.extracted.formulas.map((f, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-md border font-mono"
                        style={{ background: NODE_TYPE_COLORS.Formula.fill, borderColor: NODE_TYPE_COLORS.Formula.stroke, color: NODE_TYPE_COLORS.Formula.text }}>
                        {f.label}{f.unit ? ` (${f.unit})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* New nodes detail */}
              {result.persisted.newNodes.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1.5">
                    Node mới insert ({result.persisted.newNodes.length})
                  </h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.persisted.newNodes.map(n => (
                      <div key={n.id} className="text-xs px-2 py-1 rounded bg-white/[0.03] border border-white/10 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{
                          background: (NODE_TYPE_COLORS[n.type] || NODE_TYPE_COLORS.Topic).stroke
                        }} />
                        <span className="text-white/85">{n.label}</span>
                        <span className="text-[10px] text-white/40 ml-auto">{NODE_TYPE_LABELS[n.type] || n.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!result && (
              <label className="text-xs text-white/60 inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLinkOn}
                  onChange={e => setAutoLinkOn(e.target.checked)}
                  disabled={extracting}
                  className="cursor-pointer"
                />
                Auto-link similarity (≥0.6)
              </label>
            )}
            {result && (
              <button
                onClick={handleLinkSimilar}
                disabled={linking}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 hover:bg-violet-500/25 disabled:opacity-50 inline-flex items-center gap-1.5"
                title="Quét toàn bộ graph, tạo edges RELATES_TO cho các cặp tương đồng ≥ 0.65"
              >
                {linking ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Link similarity full graph
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={extracting}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-sm font-medium disabled:opacity-40"
            >
              {result ? 'Đóng' : 'Hủy'}
            </button>
            {!result ? (
              <button
                onClick={handleExtract}
                disabled={!canExtract}
                className={`px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-1.5 ${
                  canExtract
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                }`}
              >
                {extracting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> AI đang phân tích…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Trích xuất bằng AI</>
                )}
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white text-sm font-bold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
              >
                <Check className="w-4 h-4" /> Mở graph với node mới
              </button>
            )}
          </div>
        </div>

        {/* Hint */}
        {!result && (
          <div className="px-5 py-2 border-t border-white/5 text-[11px] text-white/40 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            AI sẽ trích Topics + Concepts + Formulas + Edges. Node có label trùng được reuse, không tạo duplicate.
          </div>
        )}
      </div>
    </div>
  )
}
