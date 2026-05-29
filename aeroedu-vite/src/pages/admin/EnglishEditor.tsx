/**
 * EnglishEditor — Admin biên tập module Tiếng Anh "Hành trình Vũ trụ".
 * Route: /admin/english-editor (chỉ ADMIN — PUT được gate ở server).
 *
 * Sửa cấu trúc JOURNEY: điểm đến → bài học → từ vựng (thêm/sửa/xoá/di chuyển),
 * Lưu lên backend (/api/english/curriculum) → learner thấy ngay. Có nút khôi
 * phục bản mặc định + chế độ JSON nâng cao để chỉnh/nhập hàng loạt.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Save, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown, Code, Rocket, Loader2,
} from 'lucide-react'
import { JOURNEY, type Destination, type EnLesson, type EnWord, type Tier } from '@/lib/english/curriculum'
import { fetchCurriculum, saveCurriculum } from '@/lib/english/contentApi'

const TIERS: Tier[] = ['launch', 'beginner', 'elementary', 'intermediate', 'advanced', 'expert']
const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`
const clone = <T,>(x: T): T =>
  typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x))

export default function EnglishEditor() {
  const navigate = useNavigate()
  const [journey, setJourney] = useState<Destination[]>(() => clone(JOURNEY))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')

  const role = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem('user') || '{}').role || '').toUpperCase() } catch { return '' }
  }, [])

  useEffect(() => {
    fetchCurriculum()
      .then(({ journey: j }) => { if (j && j.length) setJourney(clone(j)) })
      .catch(() => { /* dùng seed */ })
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    let lessons = 0, words = 0
    journey.forEach(d => d.lessons.forEach(l => { lessons++; words += l.words.length }))
    return { destinations: journey.length, lessons, words }
  }, [journey])

  // Cập nhật immutable qua clone
  function mutate(fn: (draft: Destination[]) => void) {
    setJourney(prev => { const next = clone(prev); fn(next); return next })
  }

  async function handleSave() {
    // Validate cơ bản
    for (const d of journey) {
      if (!d.id.trim() || !d.lessons.length) { toast.error(`Điểm đến "${d.nameVi || d.id}" cần id + ≥1 bài`); return }
      for (const l of d.lessons) {
        if (!l.id.trim() || !l.words.length) { toast.error(`Bài "${l.titleVi || l.id}" cần id + ≥1 từ`); return }
        for (const wd of l.words) if (!wd.id.trim() || !wd.en.trim() || !wd.vi.trim()) {
          toast.error(`Từ trong "${l.titleVi}" thiếu id/en/vi`); return
        }
      }
    }
    setSaving(true)
    try {
      const r = await saveCurriculum(journey)
      toast.success(`Đã lưu — ${r.destinations} điểm đến. Học viên sẽ thấy nội dung mới.`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lưu thất bại'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText)
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('JSON phải là mảng điểm đến')
      setJourney(parsed)
      setJsonMode(false)
      toast.success('Đã áp dụng JSON (nhớ bấm Lưu để xuất bản)')
    } catch (e) { toast.error('JSON không hợp lệ: ' + (e as Error).message) }
  }

  if (role && role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
        <p>Chỉ tài khoản <b>Admin</b> được biên tập module Tiếng Anh.</p>
      </div>
    )
  }

  const inputCls = 'px-2.5 py-1.5 rounded-lg text-sm w-full outline-none'
  const inputStyle = { background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)', color: 'hsl(var(--foreground))' }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      {/* Toolbar */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--ai-page-bg) 88%, transparent)', borderBottom: '1px solid var(--ai-card-border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 font-extrabold">
            <Rocket className="w-5 h-5" style={{ color: '#7fd8e8' }} /> Biên tập Tiếng Anh
          </div>
          <span className="text-xs opacity-60">{stats.destinations} điểm đến · {stats.lessons} bài · {stats.words} từ</span>
          <div className="flex-1" />
          <button onClick={() => setJsonMode(m => { if (!m) setJsonText(JSON.stringify(journey, null, 2)); return !m })}
            className="px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5" style={{ border: '1px solid var(--ai-card-border)' }}>
            <Code className="w-4 h-4" /> JSON
          </button>
          <button onClick={() => { if (confirm('Khôi phục bản mặc định? Thay đổi chưa lưu sẽ mất.')) setJourney(clone(JOURNEY)) }}
            className="px-3 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5" style={{ border: '1px solid var(--ai-card-border)' }}>
            <RotateCcw className="w-4 h-4" /> Mặc định
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-extrabold text-white inline-flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#58cc02' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu & xuất bản
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20 opacity-60"><Loader2 className="w-7 h-7 animate-spin" /></div>
        ) : jsonMode ? (
          <div>
            <p className="text-sm opacity-70 mb-2">Chỉnh JSON toàn bộ hành trình rồi "Áp dụng". Hữu ích để nhập hàng loạt.</p>
            <textarea value={jsonText} onChange={e => setJsonText(e.target.value)}
              className="w-full h-[60vh] font-mono text-xs p-3 rounded-xl outline-none" style={inputStyle} spellCheck={false} />
            <div className="flex gap-2 mt-3">
              <button onClick={applyJson} className="px-4 py-2 rounded-xl font-bold text-white" style={{ background: '#1cb0f6' }}>Áp dụng JSON</button>
              <button onClick={() => setJsonMode(false)} className="px-4 py-2 rounded-xl font-bold" style={{ border: '1px solid var(--ai-card-border)' }}>Huỷ</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {journey.map((dest, di) => (
              <details key={dest.id + di} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${dest.color}55`, background: 'var(--ai-card-bg)' }}>
                <summary className="cursor-pointer select-none px-4 py-3 flex items-center gap-2 font-bold" style={{ background: `${dest.color}18` }}>
                  <span className="text-xl">{dest.emoji}</span>
                  <span>{dest.nameVi || dest.id}</span>
                  <span className="text-xs opacity-60">({dest.lessons.length} bài · {dest.cefr})</span>
                  <span className="flex-1" />
                  <span onClick={(e) => { e.preventDefault(); if (di > 0) mutate(d => { [d[di - 1], d[di]] = [d[di], d[di - 1]] }) }} className="p-1 opacity-60 hover:opacity-100"><ChevronUp className="w-4 h-4" /></span>
                  <span onClick={(e) => { e.preventDefault(); if (di < journey.length - 1) mutate(d => { [d[di + 1], d[di]] = [d[di], d[di + 1]] }) }} className="p-1 opacity-60 hover:opacity-100"><ChevronDown className="w-4 h-4" /></span>
                  <span onClick={(e) => { e.preventDefault(); if (confirm('Xoá điểm đến này?')) mutate(d => { d.splice(di, 1) }) }} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></span>
                </summary>

                <div className="p-4 space-y-3">
                  {/* Meta điểm đến */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([['id', 'id'], ['emoji', 'emoji'], ['nameVi', 'Tên VI'], ['name', 'Tên EN'], ['distanceVi', 'Khoảng cách'], ['cefr', 'CEFR'], ['color', 'Màu (hex)'], ['blurbVi', 'Mô tả VI']] as const).map(([k, label]) => (
                      <label key={k} className="text-xs opacity-70">{label}
                        <input className={inputCls} style={inputStyle} value={(dest as unknown as Record<string, string>)[k] || ''}
                          onChange={e => mutate(d => { (d[di] as unknown as Record<string, string>)[k] = e.target.value })} />
                      </label>
                    ))}
                    <label className="text-xs opacity-70">Tier
                      <select className={inputCls} style={inputStyle} value={dest.tier}
                        onChange={e => mutate(d => { d[di].tier = e.target.value as Tier })}>
                        {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                  </div>

                  {/* Bài học */}
                  {dest.lessons.map((lesson, li) => (
                    <details key={lesson.id + li} className="rounded-xl ml-1" style={{ border: '1px solid var(--ai-card-border)' }}>
                      <summary className="cursor-pointer select-none px-3 py-2 flex items-center gap-2 text-sm font-semibold">
                        <span>{lesson.icon}</span><span>{lesson.titleVi || lesson.id}</span>
                        <span className="text-xs opacity-50">({lesson.words.length} từ)</span>
                        <span className="flex-1" />
                        <span onClick={(e) => { e.preventDefault(); if (confirm('Xoá bài này?')) mutate(d => { d[di].lessons.splice(li, 1) }) }} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></span>
                      </summary>
                      <div className="p-3 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {([['id', 'id'], ['icon', 'icon'], ['titleVi', 'Tên VI'], ['title', 'Tên EN']] as const).map(([k, label]) => (
                            <label key={k} className="text-xs opacity-70">{label}
                              <input className={inputCls} style={inputStyle} value={(lesson as unknown as Record<string, string>)[k] || ''}
                                onChange={e => mutate(d => { (d[di].lessons[li] as unknown as Record<string, string>)[k] = e.target.value })} />
                            </label>
                          ))}
                        </div>
                        {/* Từ vựng */}
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 text-[10px] opacity-50 px-1">
                            <span>EN</span><span>VI</span><span>IPA · emoji</span><span></span>
                          </div>
                          {lesson.words.map((wd, wi) => (
                            <div key={wd.id + wi} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1.5 items-center">
                              <input className={inputCls} style={inputStyle} placeholder="en" value={wd.en}
                                onChange={e => mutate(d => { d[di].lessons[li].words[wi].en = e.target.value })} />
                              <input className={inputCls} style={inputStyle} placeholder="nghĩa VI" value={wd.vi}
                                onChange={e => mutate(d => { d[di].lessons[li].words[wi].vi = e.target.value })} />
                              <div className="flex gap-1">
                                <input className={inputCls} style={inputStyle} placeholder="IPA" value={wd.ipa || ''}
                                  onChange={e => mutate(d => { d[di].lessons[li].words[wi].ipa = e.target.value })} />
                                <input className="px-2 py-1.5 rounded-lg text-sm w-12 text-center outline-none" style={inputStyle} placeholder="😀" value={wd.emoji || ''}
                                  onChange={e => mutate(d => { d[di].lessons[li].words[wi].emoji = e.target.value })} />
                              </div>
                              <button onClick={() => mutate(d => { d[di].lessons[li].words.splice(wi, 1) })} className="p-1 text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                          <button onClick={() => mutate(d => { d[di].lessons[li].words.push({ id: rid('en-custom'), en: '', vi: '' } as EnWord) })}
                            className="text-xs font-semibold inline-flex items-center gap-1 mt-1" style={{ color: '#1cb0f6' }}>
                            <Plus className="w-3.5 h-3.5" /> Thêm từ
                          </button>
                        </div>
                      </div>
                    </details>
                  ))}
                  <button onClick={() => mutate(d => { d[di].lessons.push({ id: rid('lesson'), title: 'New lesson', titleVi: 'Bài mới', icon: '📘', words: [] } as EnLesson) })}
                    className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: dest.color }}>
                    <Plus className="w-4 h-4" /> Thêm bài học
                  </button>
                </div>
              </details>
            ))}

            <button onClick={() => mutate(d => { d.push({ id: rid('dest'), name: 'New', nameVi: 'Điểm đến mới', emoji: '🪐', distanceVi: '', tier: 'beginner', cefr: 'A1', color: '#58cc02', blurbVi: '', lessons: [] }) })}
              className="w-full py-3 rounded-2xl font-bold inline-flex items-center justify-center gap-2" style={{ border: '1px dashed var(--ai-card-border)', color: '#7fd8e8' }}>
              <Plus className="w-5 h-5" /> Thêm điểm đến (hành tinh)
            </button>
            <p className="text-center text-xs opacity-50 pt-2">
              Lưu ý: giữ <b>id</b> từ ổn định để không mất tiến độ/SRS của học viên. Sau khi sửa nhớ bấm <b>Lưu & xuất bản</b>.
            </p>
            <button onClick={() => navigate('/student/english')} className="block mx-auto text-xs opacity-60 underline mt-1">Xem trước trang học →</button>
          </div>
        )}
      </div>
    </div>
  )
}
