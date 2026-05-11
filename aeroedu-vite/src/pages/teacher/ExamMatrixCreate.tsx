/**
 * ExamMatrixCreate — Tạo ma trận đề chuẩn Bộ GD&ĐT 2025
 *
 * Cấu trúc 4 phần chuẩn (PT.040 cấp THPT):
 *   PHẦN I  — Trắc nghiệm nhiều lựa chọn (NB + TH) — 16 câu × 0,25đ = 4,0đ
 *   PHẦN II — Trắc nghiệm Đúng/Sai (TH + VD)       — 2 câu × 1,0đ  = 2,0đ
 *   PHẦN III— Trả lời ngắn (VD)                     — 4 câu × 0,5đ = 2,0đ
 *   PHẦN IV — Tự luận (VD + VDC)                    — 2 câu × 1,0đ = 2,0đ
 *   Tổng    — 24 câu                                                = 10,0đ
 *   Tỉ lệ   — 40% NB / 30% TH / 30% VD+VDC
 *
 * UI có 3 tab:
 *   1. Thông tin chung (name, subject, grade, year)
 *   2. Cấu trúc đề (4 sections — số câu mỗi phần, có thể tuỳ chỉnh)
 *   3. Phân bổ chủ đề (topics dynamic — mỗi topic có NB/TH/VD/VDC count)
 *
 * Live preview: bảng tổng hợp + tỉ lệ % theo NB/TH/VD/VDC
 */
import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, Plus, Trash2, BookOpen, Hash, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

interface Section {
  key: 'I' | 'II' | 'III' | 'IV'
  title: string
  type: string
  count: number
  pointsPerQ: number
  totalPoints: number
  // Difficulty hint cho UI (không strict)
  difficultyHint: string
}

interface Topic {
  id: string
  name: string
  description: string
  nb: number  // Nhận biết
  th: number  // Thông hiểu
  vd: number  // Vận dụng
  vdc: number // Vận dụng cao
}

const DEFAULT_SECTIONS: Section[] = [
  { key: 'I',   title: 'PHẦN I',   type: 'Trắc nghiệm nhiều lựa chọn', count: 16, pointsPerQ: 0.25, totalPoints: 4, difficultyHint: 'NB + TH' },
  { key: 'II',  title: 'PHẦN II',  type: 'Trắc nghiệm Đúng/Sai',         count: 2,  pointsPerQ: 1.0,  totalPoints: 2, difficultyHint: 'TH + VD' },
  { key: 'III', title: 'PHẦN III', type: 'Trả lời ngắn',                 count: 4,  pointsPerQ: 0.5,  totalPoints: 2, difficultyHint: 'VD' },
  { key: 'IV',  title: 'PHẦN IV',  type: 'Tự luận',                      count: 2,  pointsPerQ: 1.0,  totalPoints: 2, difficultyHint: 'VD + VDC' },
]

export default function ExamMatrixCreatePage() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id?: string }>()
  const isEditMode = !!editId
  const [tab, setTab] = useState<'info' | 'structure' | 'topics'>('info')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEditMode)

  // Form state
  const [name, setName] = useState('Ma trận đề kiểm tra giữa học kỳ II')
  const [subject, setSubject] = useState('Vật lí')
  const [grade, setGrade] = useState('Khối 10')
  const [examType, setExamType] = useState('Kiểm tra giữa kỳ')
  const [duration, setDuration] = useState(45)
  const [schoolYear, setSchoolYear] = useState('2025-2026')
  const [description, setDescription] = useState('')

  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS)
  const [topics, setTopics] = useState<Topic[]>([
    { id: '1', name: 'Cân bằng lực, Moment lực', description: 'M, ngẫu lực, điều kiện cân bằng', nb: 3, th: 2, vd: 1, vdc: 0 },
    { id: '2', name: 'Công và Năng lượng',       description: 'Công phát động, công cản',         nb: 3, th: 1, vd: 1, vdc: 0 },
    { id: '3', name: 'Động năng, Thế năng, Cơ năng', description: 'Bảo toàn cơ năng, rơi tự do',  nb: 2, th: 2, vd: 1, vdc: 1 },
    { id: '4', name: 'Công suất',                 description: 'P = F.v, ý nghĩa công suất',       nb: 2, th: 1, vd: 1, vdc: 1 },
  ])

  // Edit mode: load matrix + pre-fill state
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    ;(async () => {
      try {
        interface MatrixApi {
          name?: string; subject?: string; grade?: string; examType?: string
          duration?: number; description?: string; schoolYear?: string
          sections?: Section[]
          topics?: Array<{ name?: string; description?: string; counts?: Record<string, number> }>
        }
        const r = await api.get<MatrixApi>(`/exam-matrices/${editId}`)
        if (cancelled) return
        const m = r.data
        if (m.name)       setName(m.name)
        if (m.subject)    setSubject(m.subject)
        if (m.grade)      setGrade(m.grade)
        if (m.examType)   setExamType(m.examType)
        if (m.duration)   setDuration(m.duration)
        if (m.schoolYear) setSchoolYear(m.schoolYear)
        if (typeof m.description === 'string' && !m.description.startsWith('{')) {
          setDescription(m.description)
        }
        if (Array.isArray(m.sections) && m.sections.length > 0) {
          setSections(m.sections)
        }
        if (Array.isArray(m.topics) && m.topics.length > 0) {
          // Backend lưu topics dạng {name, description, counts:{nb,th,vd,vdc}}
          // UI state dạng {id, name, description, nb, th, vd, vdc} → convert
          setTopics(m.topics.map((t, i) => ({
            id: String(i + 1),
            name: String(t.name || ''),
            description: String(t.description || ''),
            nb: Number(t.counts?.nb ?? 0),
            th: Number(t.counts?.th ?? 0),
            vd: Number(t.counts?.vd ?? 0),
            vdc: Number(t.counts?.vdc ?? 0),
          })))
        }
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: { error?: string } } }
        toast.error(e.response?.data?.error || 'Không tải được ma trận')
        if (e.response?.status === 404) setTimeout(() => navigate('/teacher/exam-matrix'), 1500)
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [editId, navigate])

  // ─── Computed totals ──────────────────────────────────
  const totalQuestions = sections.reduce((s, sec) => s + sec.count, 0)
  const totalPoints = sections.reduce((s, sec) => s + sec.totalPoints, 0)

  const topicTotals = useMemo(() => {
    const t = { nb: 0, th: 0, vd: 0, vdc: 0 }
    topics.forEach(top => { t.nb += top.nb; t.th += top.th; t.vd += top.vd; t.vdc += top.vdc })
    return t
  }, [topics])
  const totalByDifficulty = topicTotals.nb + topicTotals.th + topicTotals.vd + topicTotals.vdc
  const pct = (n: number) => totalByDifficulty > 0 ? Math.round((n / totalByDifficulty) * 100) : 0

  // ─── Topic ops ────────────────────────────────────────
  const addTopic = () => setTopics([...topics, {
    id: String(Date.now()), name: 'Chủ đề mới', description: '', nb: 0, th: 0, vd: 0, vdc: 0,
  }])
  const removeTopic = (id: string) => setTopics(topics.filter(t => t.id !== id))
  const updateTopic = (id: string, patch: Partial<Topic>) =>
    setTopics(topics.map(t => t.id === id ? { ...t, ...patch } : t))

  const updateSection = (key: Section['key'], patch: Partial<Section>) => {
    setSections(sections.map(s => {
      if (s.key !== key) return s
      const next = { ...s, ...patch }
      next.totalPoints = Math.round(next.count * next.pointsPerQ * 100) / 100
      return next
    }))
  }

  // ─── Save ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { toast.error('Cần nhập tên ma trận'); return }
    if (topics.length === 0) { toast.error('Cần ít nhất 1 chủ đề'); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        subject, grade,
        examType,
        duration: Number(duration),
        totalScore: totalPoints,
        totalQuestions,
        type: 'manual',
        schoolYear,
        description: description.trim() || `Tỉ lệ NB/TH/VD/VDC: ${pct(topicTotals.nb)}%/${pct(topicTotals.th)}%/${pct(topicTotals.vd)}%/${pct(topicTotals.vdc)}%`,
        sections: sections.map(s => ({
          key: s.key, title: s.title, type: s.type,
          count: s.count, pointsPerQ: s.pointsPerQ, totalPoints: s.totalPoints,
        })),
        topics: topics.map(t => ({
          name: t.name, description: t.description,
          counts: { nb: t.nb, th: t.th, vd: t.vd, vdc: t.vdc },
          total: t.nb + t.th + t.vd + t.vdc,
        })),
      }
      if (isEditMode && editId) {
        await api.put(`/exam-matrices/${editId}`, payload)
        toast.success('Đã cập nhật ma trận đề!')
        navigate(`/teacher/exam-matrix/${editId}`)
      } else {
        const res = await api.post<{ id: string; matrix?: { id: string } }>('/exam-matrices', payload)
        const id = res.data?.id || res.data?.matrix?.id
        toast.success('Đã tạo ma trận đề!')
        if (id) navigate(`/teacher/exam-matrix/${id}`)
        else navigate('/teacher/exam-matrix')
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không tạo được ma trận')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/teacher/exam-matrix')}
            className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <ArrowLeft className="w-4 h-4" /> Danh sách ma trận
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold flex items-center gap-2 hover:scale-105 disabled:opacity-50 transition">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu…</> : <><Save className="w-4 h-4" /> Lưu ma trận</>}
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-1">{isEditMode ? 'Chỉnh sửa Ma Trận Đề' : 'Tạo Ma Trận Đề'}</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          {loading
            ? <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải dữ liệu ma trận…</span>
            : 'Cấu trúc chuẩn Bộ GD&ĐT 2025: 4 phần · 24 câu · 10 điểm · tỉ lệ 40% NB / 30% TH / 30% VD+VDC'}
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 mb-6 w-fit">
          {[
            { id: 'info', label: '1. Thông tin chung', icon: BookOpen },
            { id: 'structure', label: '2. Cấu trúc đề', icon: Hash },
            { id: 'topics', label: '3. Phân bổ chủ đề', icon: Sparkles },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
                tab === t.id ? 'bg-purple-500 text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-white/[0.06]'
              }`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Info */}
        {tab === 'info' && (
          <div className="bg-white/[0.04] rounded-2xl p-5 space-y-4 border border-white/[0.06]">
            <Field label="Tên ma trận đề">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm focus:outline-none focus:border-purple-400" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Môn học">
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm focus:outline-none focus:border-purple-400">
                  {['Vật lí','Toán học','Hoá học','Sinh học','Ngữ văn','Tiếng Anh','Lịch sử','Địa lí'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Khối">
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm focus:outline-none focus:border-purple-400">
                  {['Khối 6','Khối 7','Khối 8','Khối 9','Khối 10','Khối 11','Khối 12'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Loại đề">
                <select value={examType} onChange={e => setExamType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm focus:outline-none focus:border-purple-400">
                  {['Kiểm tra 15 phút','Kiểm tra 1 tiết','Kiểm tra giữa kỳ','Kiểm tra học kỳ'].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Thời gian (phút)">
                <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm focus:outline-none focus:border-purple-400" />
              </Field>
              <Field label="Năm học">
                <input type="text" value={schoolYear} onChange={e => setSchoolYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm focus:outline-none focus:border-purple-400" />
              </Field>
            </div>
            <Field label="Mô tả (không bắt buộc)">
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="VD: Ma trận theo chuẩn Bộ GD&ĐT 2025 — chương I, II, III"
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-sm focus:outline-none focus:border-purple-400 resize-none" />
            </Field>
            <div className="flex justify-end pt-2">
              <button onClick={() => setTab('structure')}
                className="px-5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium">
                Tiếp theo →
              </button>
            </div>
          </div>
        )}

        {/* TAB: Structure */}
        {tab === 'structure' && (
          <div className="bg-white/[0.04] rounded-2xl p-5 space-y-3 border border-white/[0.06]">
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
              💡 Mặc định theo chuẩn Bộ GD&amp;ĐT 2025. Có thể tuỳ chỉnh số câu nếu cần.
            </p>
            {sections.map(s => (
              <div key={s.key} className="rounded-xl p-3 bg-black/20 border border-white/[0.06]">
                <div className="flex items-start gap-3">
                  <div className="px-2.5 py-1 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs">
                    {s.title}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{s.type}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Mức độ: {s.difficultyHint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={100} value={s.count}
                      onChange={e => updateSection(s.key, { count: Number(e.target.value) })}
                      className="w-16 px-2 py-1 text-center rounded-md bg-black/30 border border-white/[0.08] text-sm" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">câu</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">×</span>
                    <input type="number" step={0.05} min={0} value={s.pointsPerQ}
                      onChange={e => updateSection(s.key, { pointsPerQ: Number(e.target.value) })}
                      className="w-16 px-2 py-1 text-center rounded-md bg-black/30 border border-white/[0.08] text-sm" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">đ</span>
                    <span className="text-yellow-300 font-bold text-sm w-12 text-right">{s.totalPoints}đ</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-xl p-3 bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
              <span className="font-bold text-sm">Tổng</span>
              <div className="flex items-center gap-4">
                <span className="text-sm">{totalQuestions} câu</span>
                <span className="text-yellow-300 font-black text-lg">{totalPoints}đ</span>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setTab('info')}
                className="px-5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium">
                ← Quay lại
              </button>
              <button onClick={() => setTab('topics')}
                className="px-5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium">
                Tiếp theo →
              </button>
            </div>
          </div>
        )}

        {/* TAB: Topics */}
        {tab === 'topics' && (
          <div className="space-y-3">
            <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">Phân bổ câu hỏi theo chủ đề</p>
                <button onClick={addTopic}
                  className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Thêm chủ đề
                </button>
              </div>

              {/* Header */}
              <div className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_36px] gap-1 px-2 mb-1.5 text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))]">
                <div>Chủ đề</div>
                <div className="text-center text-green-400">NB</div>
                <div className="text-center text-yellow-400">TH</div>
                <div className="text-center text-orange-400">VD</div>
                <div className="text-center text-red-400">VDC</div>
                <div className="text-center">Tổng</div>
                <div></div>
              </div>

              <div className="space-y-2">
                {topics.map(t => (
                  <div key={t.id} className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_36px] gap-1 items-center">
                    <div className="space-y-1">
                      <input type="text" value={t.name}
                        onChange={e => updateTopic(t.id, { name: e.target.value })}
                        placeholder="Tên chủ đề"
                        className="w-full px-2 py-1.5 rounded-md bg-black/30 border border-white/[0.08] text-xs font-semibold focus:outline-none focus:border-purple-400" />
                      <input type="text" value={t.description}
                        onChange={e => updateTopic(t.id, { description: e.target.value })}
                        placeholder="Mô tả ngắn (đơn vị kiến thức)"
                        className="w-full px-2 py-1 rounded-md bg-black/20 border border-white/[0.05] text-[10px] text-[hsl(var(--muted-foreground))] italic focus:outline-none" />
                    </div>
                    {(['nb','th','vd','vdc'] as const).map(d => (
                      <input key={d} type="number" min={0} value={t[d]}
                        onChange={e => updateTopic(t.id, { [d]: Number(e.target.value) || 0 })}
                        className="w-full px-1 py-2 text-center rounded-md bg-black/30 border border-white/[0.08] text-sm" />
                    ))}
                    <span className="text-center text-yellow-300 font-bold">{t.nb + t.th + t.vd + t.vdc}</span>
                    <button onClick={() => removeTopic(t.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals + percentages */}
              <div className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_36px] gap-1 mt-3 pt-3 border-t border-white/[0.06] items-center">
                <div className="font-bold text-sm">Tổng / Tỉ lệ</div>
                <DiffStat n={topicTotals.nb} pct={pct(topicTotals.nb)} color="green-400" target={40} />
                <DiffStat n={topicTotals.th} pct={pct(topicTotals.th)} color="yellow-400" target={30} />
                <DiffStat n={topicTotals.vd} pct={pct(topicTotals.vd)} color="orange-400" target={20} />
                <DiffStat n={topicTotals.vdc} pct={pct(topicTotals.vdc)} color="red-400" target={10} />
                <span className="text-center text-yellow-300 font-black text-lg">{totalByDifficulty}</span>
                <div></div>
              </div>

              {totalByDifficulty !== totalQuestions && (
                <div className="mt-3 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs">
                  ⚠️ Tổng phân bổ chủ đề ({totalByDifficulty} câu) ≠ tổng cấu trúc đề ({totalQuestions} câu).
                  Hãy điều chỉnh để khớp.
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setTab('structure')}
                className="px-5 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium">
                ← Quay lại
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold flex items-center gap-2 hover:scale-105 disabled:opacity-50 transition">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu…</> : <><Save className="w-4 h-4" /> Lưu ma trận</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function DiffStat({ n, pct, color, target }: { n: number; pct: number; color: string; target: number }) {
  const ok = Math.abs(pct - target) <= 5
  return (
    <div className={`text-center font-bold text-xs text-${color}`}>
      <div>{n}</div>
      <div className={`text-[9px] ${ok ? 'opacity-100' : 'opacity-60'}`}>
        {pct}% {ok && '✓'}
      </div>
    </div>
  )
}
