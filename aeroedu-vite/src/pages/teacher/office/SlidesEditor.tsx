/** Trình chiếu online — soạn slide (tiêu đề + gạch đầu dòng + nền) + trình chiếu
 *  toàn màn hình + xuất PDF. Dữ liệu: { slides: [{id,title,body,bg}] }. */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { Plus, Trash2, ArrowUp, ArrowDown, Play, FileDown, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { uploadFileToGcs } from '@/lib/uploadFile'
import { getOfficeDoc, useOfficeAutosave } from '@/services/office.service'
import type { SlidesData, Slide } from '@/types/office'
import EditorBar from './EditorBar'

const PALETTE = ['#0f172a', '#1e3a8a', '#3b0764', '#7c2d12', '#064e3b', '#831843', '#111827', '#0c4a6e']
const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
function textOn(bg: string): string {
  const h = bg.replace('#', ''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1a1a1a' : '#ffffff'
}

/** 1 slide hiển thị (dùng cho canvas soạn, present, và export). */
function SlideView({ s, scale = 1 }: { s: Slide; scale?: number }) {
  const fg = textOn(s.bg)
  const lines = (s.body || '').split('\n').filter((l) => l.trim())
  const isImg = /^https?:\/\//.test(s.body.trim()) && /\.(png|jpe?g|gif|webp|svg)$/i.test(s.body.trim())
  return (
    <div style={{ width: 960 * scale, height: 540 * scale, background: s.bg, color: fg, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, padding: 56 * scale, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 44 * scale, fontWeight: 900, lineHeight: 1.15, marginBottom: 24 * scale }}>{s.title || ''}</div>
        {isImg ? (
          <img src={s.body.trim()} alt="" style={{ maxWidth: '100%', maxHeight: 360 * scale, objectFit: 'contain', borderRadius: 10 * scale }} />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 28 * scale, display: 'flex', flexDirection: 'column', gap: 14 * scale }}>
            {lines.map((l, i) => <li key={i} style={{ fontSize: 28 * scale, lineHeight: 1.35 }}>{l}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function SlidesEditor() {
  const { id } = useParams<{ id: string }>()
  const [title, setTitle] = useState('Bài trình chiếu')
  const [slides, setSlides] = useState<Slide[]>([])
  const [cur, setCur] = useState(0)
  const [ready, setReady] = useState(false)
  const [present, setPresent] = useState(false)
  const [exp, setExp] = useState(false)
  const [upl, setUpl] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    getOfficeDoc(id).then((d) => {
      const s = (d.data as SlidesData)?.slides
      setTitle(d.title); setSlides(s && s.length ? s : [{ id: uid(), title: 'Slide 1', body: '', bg: '#0f172a' }]); setReady(true)
    }).catch(() => setReady(true))
  }, [id])

  const status = useOfficeAutosave(id, ready, () => ({ title, data: { slides } }), [title, slides])
  const s = slides[cur]
  const patch = (p: Partial<Slide>) => setSlides((xs) => xs.map((x, i) => (i === cur ? { ...x, ...p } : x)))
  const addSlide = () => { setSlides((xs) => { const n = [...xs]; n.splice(cur + 1, 0, { id: uid(), title: `Slide ${xs.length + 1}`, body: '', bg: s?.bg || '#0f172a' }); return n }); setCur((c) => c + 1) }
  const delSlide = () => { if (slides.length <= 1) return; setSlides((xs) => xs.filter((_, i) => i !== cur)); setCur((c) => Math.max(0, c - 1)) }
  const move = (dir: -1 | 1) => { const j = cur + dir; if (j < 0 || j >= slides.length) return; setSlides((xs) => { const n = [...xs];[n[cur], n[j]] = [n[j], n[cur]]; return n }); setCur(j) }
  const addImage = async (f: File) => { setUpl(true); try { const url = await uploadFileToGcs(f, { folder: 'office' }); patch({ body: url }) } catch { /* noop */ } setUpl(false) }

  // Present mode keyboard
  useEffect(() => {
    if (!present) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setCur((c) => Math.min(slides.length - 1, c + 1))
      else if (e.key === 'ArrowLeft') setCur((c) => Math.max(0, c - 1))
      else if (e.key === 'Escape') setPresent(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [present, slides.length])

  const exportPdf = async () => {
    setExp(true)
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [960, 540] })
      const host = exportRef.current!
      for (let i = 0; i < slides.length; i++) {
        host.innerHTML = ''
        const div = document.createElement('div'); host.appendChild(div)
        // render slide tĩnh vào div (đồng bộ với SlideView)
        const sl = slides[i]; const fg = textOn(sl.bg)
        const lines = (sl.body || '').split('\n').filter((l) => l.trim())
        const isImg = /^https?:\/\//.test(sl.body.trim()) && /\.(png|jpe?g|gif|webp|svg)$/i.test(sl.body.trim())
        div.style.cssText = `width:960px;height:540px;background:${sl.bg};color:${fg};font-family:system-ui,sans-serif;position:relative;overflow:hidden`
        div.innerHTML = `<div style="position:absolute;inset:0;padding:56px;display:flex;flex-direction:column">
          <div style="font-size:44px;font-weight:900;line-height:1.15;margin-bottom:24px">${escapeHtml(sl.title || '')}</div>
          ${isImg ? `<img src="${sl.body.trim()}" style="max-width:100%;max-height:360px;object-fit:contain;border-radius:10px"/>`
            : `<ul style="margin:0;padding-left:28px;display:flex;flex-direction:column;gap:14px">${lines.map((l) => `<li style="font-size:28px;line-height:1.35">${escapeHtml(l)}</li>`).join('')}</ul>`}
        </div>`
        const png = await toPng(div, { width: 960, height: 540, cacheBust: true, pixelRatio: 1.5 })
        if (i > 0) pdf.addPage([960, 540], 'landscape')
        pdf.addImage(png, 'PNG', 0, 0, 960, 540)
      }
      host.innerHTML = ''
      pdf.save(`${title || 'trinh-chieu'}.pdf`)
    } catch (e) { console.warn('pdf', e) }
    setExp(false)
  }

  if (present && s) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <div style={{ transform: `scale(${Math.min(window.innerWidth / 960, (window.innerHeight - 60) / 540)})` }}><SlideView s={s} /></div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white/80">
          <button onClick={() => setCur((c) => Math.max(0, c - 1))} className="p-2 rounded-full bg-white/15"><ChevronLeft className="w-6 h-6" /></button>
          <span className="text-sm font-bold">{cur + 1} / {slides.length}</span>
          <button onClick={() => setCur((c) => Math.min(slides.length - 1, c + 1))} className="p-2 rounded-full bg-white/15"><ChevronRight className="w-6 h-6" /></button>
        </div>
        <button onClick={() => setPresent(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/15 text-white"><X className="w-5 h-5" /></button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-foreground flex flex-col">
      <EditorBar title={title} onTitle={setTitle} status={status}>
        <button onClick={() => setPresent(true)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-border inline-flex items-center gap-1"><Play className="w-3.5 h-3.5" /> Trình chiếu</button>
        <button onClick={exportPdf} disabled={exp} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 text-white inline-flex items-center gap-1 disabled:opacity-50">{exp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF</button>
      </EditorBar>

      <div className="flex-1 flex min-h-0">
        {/* Danh sách slide */}
        <div className="w-40 sm:w-48 shrink-0 border-r border-border bg-white dark:bg-slate-900 overflow-y-auto p-2 space-y-2">
          {slides.map((sl, i) => (
            <button key={sl.id} onClick={() => setCur(i)}
              className={`block w-full rounded-lg overflow-hidden border-2 ${i === cur ? 'border-orange-500' : 'border-transparent'}`}>
              <div className="relative" style={{ aspectRatio: '16/9' }}>
                <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}><SlideView s={sl} /></div>
                <span className="absolute bottom-0.5 right-1 text-[9px] font-bold bg-black/50 text-white px-1 rounded">{i + 1}</span>
              </div>
            </button>
          ))}
          <button onClick={addSlide} className="w-full py-2 rounded-lg border-2 border-dashed border-border text-slate-400 text-sm inline-flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> Thêm slide</button>
        </div>

        {/* Soạn slide hiện tại */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {s && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">Nền:</span>
                {PALETTE.map((c) => <button key={c} onClick={() => patch({ bg: c })} className={`w-6 h-6 rounded-full border-2 ${s.bg === c ? 'border-orange-500' : 'border-white/40'}`} style={{ background: c }} />)}
                <input type="color" value={s.bg} onChange={(e) => patch({ bg: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => move(-1)} disabled={cur === 0} className="p-1.5 rounded hover:bg-accent disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(1)} disabled={cur === slides.length - 1} className="p-1.5 rounded hover:bg-accent disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={delSlide} disabled={slides.length <= 1} className="p-1.5 rounded text-rose-500 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {/* Xem trước (co theo bề rộng) */}
              <div className="rounded-xl overflow-hidden shadow-lg border border-border" style={{ width: '100%', aspectRatio: '16 / 9', position: 'relative' }}>
                <div className="absolute inset-0"><ScaledSlide s={s} /></div>
              </div>
              <input value={s.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Tiêu đề slide"
                className="w-full text-lg font-bold px-3 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Nội dung (mỗi dòng = 1 ý), hoặc dán URL ảnh để chèn ảnh:</span>
                <label className="text-xs text-orange-600 font-semibold cursor-pointer inline-flex items-center gap-1">
                  {upl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Chèn ảnh
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])} />
                </label>
              </div>
              <textarea value={s.body} onChange={(e) => patch({ body: e.target.value })} rows={6} placeholder={'• Ý thứ nhất\n• Ý thứ hai\n• Ý thứ ba'}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-sm" />
            </div>
          )}
        </div>
      </div>
      {/* host ẩn để render slide → PNG khi xuất PDF */}
      <div ref={exportRef} style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }} aria-hidden />
    </div>
  )
}

// Slide xem trước co theo bề rộng container (960 → 100%)
function ScaledSlide({ s }: { s: Slide }) {
  const ref = useRef<HTMLDivElement>(null)
  const [sc, setSc] = useState(1)
  useEffect(() => {
    const el = ref.current?.parentElement; if (!el) return
    const ro = new ResizeObserver(() => setSc(el.clientWidth / 960))
    ro.observe(el); setSc(el.clientWidth / 960)
    return () => ro.disconnect()
  }, [])
  return <div ref={ref} style={{ transform: `scale(${sc})`, transformOrigin: 'top left', width: 960, height: 540 }}><SlideView s={s} /></div>
}

function escapeHtml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
