/**
 * AdminSkillsContent — quản lý nội dung 3 khoá kỹ năng (Tiếng Anh · Toán · AI).
 * Route: /admin/skills-content (ADMIN).
 *
 * - Tiếng Anh: dùng trình biên tập riêng (/admin/english-editor).
 * - Toán & AI: lớp phủ DB — admin THÊM câu hỏi tuỳ chỉnh theo từng chặng, gộp
 *   với nội dung gốc lúc học sinh học (lib/skill-overlay).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, FunctionSquare, Languages, Plus, Trash2, Save, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { JOURNEY as MATH_JOURNEY } from '@/lib/math/curriculum'
import { JOURNEY as AI_JOURNEY } from '@/lib/ai/curriculum'
import { loadOverlayFresh, saveOverlay, type SkillOverlay, type OverlayQuestion, type SkillKey } from '@/lib/skill-overlay'

type Stop = { id: string; placeVi: string; emoji: string; era: string }
const STOPS: Record<'math' | 'ai', Stop[]> = {
  math: MATH_JOURNEY.map(s => ({ id: s.id, placeVi: s.placeVi, emoji: s.emoji, era: s.era })),
  ai: AI_JOURNEY.map(s => ({ id: s.id, placeVi: s.placeVi, emoji: s.emoji, era: s.era })),
}

function emptyQ(): OverlayQuestion {
  return { id: `ov-${Math.random().toString(36).slice(2, 9)}`, prompt: '', options: ['', '', '', ''], correctIdx: 0, explain: '' }
}

export default function AdminSkillsContent() {
  const navigate = useNavigate()
  const [skill, setSkill] = useState<'math' | 'ai'>('ai')
  const [overlay, setOverlay] = useState<SkillOverlay>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openStop, setOpenStop] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    loadOverlayFresh(skill as SkillKey).then(setOverlay).catch(() => setOverlay({})).finally(() => setLoading(false))
  }, [skill])

  const stops = STOPS[skill]
  const extraOf = (stopId: string): OverlayQuestion[] => overlay.extraQuestions?.[stopId] || []
  const totalExtra = useMemo(() => Object.values(overlay.extraQuestions || {}).reduce((s, a) => s + a.length, 0), [overlay])

  const setStopQuestions = (stopId: string, qs: OverlayQuestion[]) => {
    setOverlay(o => ({ ...o, extraQuestions: { ...(o.extraQuestions || {}), [stopId]: qs } }))
  }
  const addQ = (stopId: string) => { setStopQuestions(stopId, [...extraOf(stopId), emptyQ()]); setOpenStop(stopId) }
  const delQ = (stopId: string, qid: string) => setStopQuestions(stopId, extraOf(stopId).filter(q => q.id !== qid))
  const patchQ = (stopId: string, qid: string, patch: Partial<OverlayQuestion>) =>
    setStopQuestions(stopId, extraOf(stopId).map(q => q.id === qid ? { ...q, ...patch } : q))

  const save = async () => {
    // bỏ câu trống
    const cleaned: Record<string, OverlayQuestion[]> = {}
    for (const [sid, qs] of Object.entries(overlay.extraQuestions || {})) {
      const valid = qs.filter(q => q.prompt.trim() && q.options.filter(o => o.trim()).length >= 2)
      if (valid.length) cleaned[sid] = valid
    }
    setSaving(true)
    try {
      await saveOverlay(skill as SkillKey, { ...overlay, extraQuestions: cleaned })
      toast.success('Đã lưu nội dung')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || 'Lưu thất bại')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg">
          <Cpu className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý nội dung khoá kỹ năng</h1>
          <p className="text-sm text-muted-foreground">Tiếng Anh · Toán · AI — phổ cập cho học sinh, phụ huynh, giáo viên</p>
        </div>
      </div>

      {/* 3 skill cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button onClick={() => navigate('/admin/english-editor')}
          className="text-left p-4 rounded-2xl border border-border bg-card hover:border-violet-500/40">
          <div className="flex items-center gap-2 font-bold text-foreground"><Languages className="w-5 h-5 text-violet-400" /> Tiếng Anh</div>
          <p className="text-xs text-muted-foreground mt-1">Mở trình biên tập riêng →</p>
        </button>
        <button onClick={() => setSkill('math')}
          className={`text-left p-4 rounded-2xl border ${skill === 'math' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border bg-card hover:border-emerald-500/40'}`}>
          <div className="flex items-center gap-2 font-bold text-foreground"><FunctionSquare className="w-5 h-5 text-emerald-400" /> Toán học</div>
          <p className="text-xs text-muted-foreground mt-1">{MATH_JOURNEY.length} chặng · quản lý câu hỏi</p>
        </button>
        <button onClick={() => setSkill('ai')}
          className={`text-left p-4 rounded-2xl border ${skill === 'ai' ? 'border-cyan-500 bg-cyan-500/10' : 'border-border bg-card hover:border-cyan-500/40'}`}>
          <div className="flex items-center gap-2 font-bold text-foreground"><Cpu className="w-5 h-5 text-cyan-400" /> Trí tuệ nhân tạo</div>
          <p className="text-xs text-muted-foreground mt-1">{AI_JOURNEY.length} chặng · quản lý câu hỏi</p>
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          Đang sửa: <b className="text-foreground">{skill === 'math' ? 'Toán học' : 'Trí tuệ nhân tạo'}</b> · {totalExtra} câu hỏi thêm
        </p>
        <button onClick={save} disabled={saving || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-bold disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu nội dung
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin inline" /> Đang tải…</div>
      ) : (
        <div className="space-y-2">
          {stops.map(stop => {
            const qs = extraOf(stop.id)
            const open = openStop === stop.id
            return (
              <div key={stop.id} className="rounded-xl border border-border bg-card">
                <button onClick={() => setOpenStop(open ? null : stop.id)} className="w-full flex items-center gap-2 p-3 text-left">
                  {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-lg">{stop.emoji}</span>
                  <span className="font-semibold text-foreground">{stop.placeVi}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{stop.era}</span>
                  {qs.length > 0 && <span className="ml-auto text-xs text-cyan-400 font-bold">+{qs.length} câu</span>}
                </button>
                {open && (
                  <div className="px-3 pb-3 space-y-3">
                    {qs.map(q => (
                      <div key={q.id} className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <textarea value={q.prompt} onChange={e => patchQ(stop.id, q.id, { prompt: e.target.value })}
                            rows={2} placeholder="Câu hỏi (hỗ trợ $LaTeX$)…"
                            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm" />
                          <button onClick={() => delQ(stop.id, q.id)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <button onClick={() => patchQ(stop.id, q.id, { correctIdx: i })}
                                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${q.correctIdx === i ? 'bg-green-500 text-white' : 'bg-secondary text-foreground/70'}`}
                                title="Đáp án đúng">{String.fromCharCode(65 + i)}</button>
                              <input value={opt} onChange={e => { const o = [...q.options]; o[i] = e.target.value; patchQ(stop.id, q.id, { options: o }) }}
                                placeholder={`Phương án ${String.fromCharCode(65 + i)}`}
                                className={`flex-1 px-3 py-1.5 rounded-lg bg-background border text-foreground text-sm ${q.correctIdx === i ? 'border-green-600' : 'border-border'}`} />
                            </div>
                          ))}
                        </div>
                        <input value={q.explain} onChange={e => patchQ(stop.id, q.id, { explain: e.target.value })}
                          placeholder="Giải thích đáp án…"
                          className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-sm" />
                      </div>
                    ))}
                    <button onClick={() => addQ(stop.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground/80 hover:bg-secondary">
                      <Plus className="w-4 h-4" /> Thêm câu hỏi
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-4">Câu hỏi thêm sẽ được gộp vào bài học tương ứng của học sinh (sau nội dung gốc). Đáp án đúng = ô chữ cái bôi xanh.</p>
    </div>
  )
}
