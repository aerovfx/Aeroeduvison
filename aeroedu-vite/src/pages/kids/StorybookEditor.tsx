/**
 * StorybookEditor — GV biên tập Flipbook có audio cho thiếu nhi.
 *
 * Quy trình: GV chỉ cần đưa PDF hoặc ảnh → mỗi trang thành 1 trang sách.
 * Hai cách gắn âm thanh:
 *   • Theo trang (perPage):   mỗi trang tải 1 đoạn audio kể; nghe xong tự lật.
 *   • Theo lời kể (narration): tải 1 file kể chuyện, tua tới đâu bấm "Đặt mốc lật
 *     tại đây" để chọn VỊ TRÍ lật sang trang tương ứng với VỊ TRÍ âm thanh.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, FileUp, ImagePlus, Music, Trash2, ArrowUp, ArrowDown,
  Loader2, Save, Eye, Clock, X, BookOpen, Volume2, CheckCircle2,
} from 'lucide-react'
import { uploadFileToGcs } from '@/lib/uploadFile'
import { pdfToImageBlobs } from '@/lib/pdfToImages'
import { getStorybook, createStorybook, updateStorybook, deleteStorybook } from '@/services/storybook.service'
import type { Storybook, StorybookPage } from '@/types/storybook'

const uid = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const fmt = (s?: number | null) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`)

export default function StorybookEditor() {
  const { id } = useParams<{ id: string }>()
  const editing = !!id
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [mode, setMode] = useState<'perPage' | 'narration'>('perPage')
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [narrationUrl, setNarrationUrl] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [pages, setPages] = useState<StorybookPage[]>([])
  const [published, setPublished] = useState(false)

  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)  // thông báo tiến trình
  const [note, setNote] = useState<string | null>(null)
  const narrationRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!editing) return
    getStorybook(id!).then((b: Storybook) => {
      setTitle(b.title); setDescription(b.description || ''); setMode(b.mode)
      setAutoAdvance(b.autoAdvance); setNarrationUrl(b.narrationUrl || '')
      setCoverUrl(b.coverUrl || ''); setPages(b.pages || []); setPublished(b.published)
      setLoading(false)
    }).catch((e) => { setNote(e?.response?.data?.error || 'Không tải được sách'); setLoading(false) })
  }, [id, editing])

  const patchPage = (pid: string, patch: Partial<StorybookPage>) =>
    setPages((ps) => ps.map((p) => (p.id === pid ? { ...p, ...patch } : p)))
  const removePage = (pid: string) => setPages((ps) => ps.filter((p) => p.id !== pid))
  const movePage = (idx: number, dir: -1 | 1) => setPages((ps) => {
    const j = idx + dir
    if (j < 0 || j >= ps.length) return ps
    const next = [...ps];[next[idx], next[j]] = [next[j], next[idx]]; return next
  })

  // ── Tải PDF → rasterize từng trang → upload ảnh ──
  const onPdf = async (file: File) => {
    try {
      setBusy('Đang đọc PDF…')
      const blobs = await pdfToImageBlobs(file, { onProgress: (d, t) => setBusy(`Đang chuyển trang ${d}/${t}…`) })
      const added: StorybookPage[] = []
      for (let i = 0; i < blobs.length; i++) {
        setBusy(`Đang tải trang ${i + 1}/${blobs.length} lên…`)
        const url = await uploadFileToGcs(blobs[i], { filename: `page-${i + 1}.jpg`, folder: 'storybooks' })
        added.push({ id: uid(), imageUrl: url, caption: '', audioUrl: '', flipAtSec: null })
      }
      setPages((ps) => [...ps, ...added])
      if (!coverUrl && added[0]) setCoverUrl(added[0].imageUrl)
      setBusy(null); setNote(`✓ Đã thêm ${added.length} trang từ PDF`)
    } catch (e: any) { setBusy(null); setNote('Lỗi PDF: ' + (e?.message || e)) }
  }

  // ── Tải nhiều ảnh ──
  const onImages = async (files: FileList) => {
    try {
      const arr = Array.from(files)
      const added: StorybookPage[] = []
      for (let i = 0; i < arr.length; i++) {
        setBusy(`Đang tải ảnh ${i + 1}/${arr.length}…`)
        const url = await uploadFileToGcs(arr[i], { folder: 'storybooks' })
        added.push({ id: uid(), imageUrl: url, caption: '', audioUrl: '', flipAtSec: null })
      }
      setPages((ps) => [...ps, ...added])
      if (!coverUrl && added[0]) setCoverUrl(added[0].imageUrl)
      setBusy(null); setNote(`✓ Đã thêm ${added.length} ảnh`)
    } catch (e: any) { setBusy(null); setNote('Lỗi tải ảnh: ' + (e?.message || e)) }
  }

  const onPageAudio = async (pid: string, file: File) => {
    try {
      setBusy('Đang tải âm thanh trang…')
      const url = await uploadFileToGcs(file, { folder: 'storybooks' })
      patchPage(pid, { audioUrl: url }); setBusy(null)
    } catch (e: any) { setBusy(null); setNote('Lỗi audio: ' + (e?.message || e)) }
  }

  const onNarration = async (file: File) => {
    try {
      setBusy('Đang tải file kể chuyện…')
      const url = await uploadFileToGcs(file, { folder: 'storybooks' })
      setNarrationUrl(url); setBusy(null)
    } catch (e: any) { setBusy(null); setNote('Lỗi audio: ' + (e?.message || e)) }
  }
  const onCover = async (file: File) => {
    try { setBusy('Đang tải ảnh bìa…'); const url = await uploadFileToGcs(file, { folder: 'storybooks' }); setCoverUrl(url); setBusy(null) }
    catch (e: any) { setBusy(null); setNote('Lỗi ảnh bìa: ' + (e?.message || e)) }
  }

  const markFlipHere = (pid: string) => {
    const t = narrationRef.current?.currentTime ?? 0
    patchPage(pid, { flipAtSec: Math.round(t * 10) / 10 })
  }

  const valid = title.trim() && pages.length > 0

  const save = async (alsoPublish?: boolean) => {
    if (!valid) { setNote('Cần có tiêu đề và ít nhất 1 trang'); return }
    setSaving(true)
    const body: Partial<Storybook> = {
      title: title.trim(), description, mode, autoAdvance, narrationUrl,
      coverUrl: coverUrl || pages[0]?.imageUrl, pages,
      published: alsoPublish ?? published,
    }
    try {
      const saved = editing ? await updateStorybook(id!, body) : await createStorybook(body)
      if (alsoPublish !== undefined) setPublished(alsoPublish)
      setSaving(false)
      setNote('✓ Đã lưu')
      if (!editing) navigate(`/kids/storybooks/${saved.id}/edit`, { replace: true })
    } catch (e: any) { setSaving(false); setNote('Lỗi lưu: ' + (e?.response?.data?.error || e?.message || e)) }
  }

  const onDelete = async () => {
    if (!editing || !window.confirm('Xoá hẳn sách này?')) return
    try { await deleteStorybook(id!); navigate('/kids/storybooks') }
    catch (e: any) { setNote('Lỗi xoá: ' + (e?.message || e)) }
  }

  const sortedHint = useMemo(() => {
    if (mode !== 'narration') return null
    let bad = false
    let prev = -1
    for (const p of pages) { if (p.flipAtSec != null) { if (p.flipAtSec < prev) bad = true; prev = p.flipAtSec } }
    return bad ? 'Mốc thời gian giữa các trang nên TĂNG DẦN theo thứ tự đọc.' : null
  }, [mode, pages])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 text-foreground">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button onClick={() => navigate('/kids/storybooks')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Thư viện
          </button>
          <h1 className="flex-1 text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <BookOpen className="w-6 h-6" /> {editing ? 'Sửa truyện tranh' : 'Tạo truyện tranh có audio'}
          </h1>
          {editing && (
            <button onClick={() => navigate(`/kids/storybooks/${id}`)} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 border border-border flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> Xem thử
            </button>
          )}
        </div>

        {note && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 text-sm flex items-center justify-between gap-2">
            <span>{note}</span><button onClick={() => setNote(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Thông tin chung */}
        <section className="rounded-2xl bg-white dark:bg-slate-800/60 border border-border p-4 sm:p-5 mb-5 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên truyện (vd: Chú Vịt Con Lạc Mẹ)"
            className="w-full text-lg font-bold px-3 py-2.5 rounded-xl border border-border bg-background" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn cho bé / phụ huynh…" rows={2}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" />

          {/* Chọn cách gắn audio */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => setMode('perPage')}
              className={`flex-1 text-left p-3 rounded-xl border-2 transition ${mode === 'perPage' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-border'}`}>
              <div className="font-bold flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-indigo-500" /> Âm thanh theo TRANG</div>
              <div className="text-xs text-slate-500 mt-0.5">Mỗi trang 1 đoạn kể. Nghe xong tự lật sang trang sau.</div>
            </button>
            <button onClick={() => setMode('narration')}
              className={`flex-1 text-left p-3 rounded-xl border-2 transition ${mode === 'narration' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-border'}`}>
              <div className="font-bold flex items-center gap-1.5"><Music className="w-4 h-4 text-pink-500" /> Một file KỂ CHUYỆN</div>
              <div className="text-xs text-slate-500 mt-0.5">1 audio chạy liên tục, đặt mốc thời gian để tự lật từng trang.</div>
            </button>
          </div>

          {mode === 'perPage' && (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={autoAdvance} onChange={(e) => setAutoAdvance(e.target.checked)} />
              Tự động lật trang khi nghe xong audio của trang
            </label>
          )}

          {mode === 'narration' && (
            <div className="rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 p-3">
              <div className="text-sm font-bold mb-2 flex items-center gap-1.5"><Music className="w-4 h-4 text-pink-500" /> File kể chuyện</div>
              {narrationUrl
                ? <audio ref={narrationRef} src={narrationUrl} controls className="w-full" />
                : <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500 text-white text-sm font-bold cursor-pointer">
                    <Music className="w-4 h-4" /> Tải file audio kể chuyện
                    <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && onNarration(e.target.files[0])} />
                  </label>}
              {narrationUrl && (
                <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-pink-600 cursor-pointer">
                  <Music className="w-3.5 h-3.5" /> Đổi file khác
                  <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && onNarration(e.target.files[0])} />
                </label>
              )}
              <p className="text-xs text-slate-500 mt-2">Phát file ở trên, tua tới đoạn cần lật rồi bấm <b>“Đặt mốc lật tại đây”</b> ở từng trang bên dưới.</p>
              {sortedHint && <p className="text-xs text-amber-600 mt-1">⚠ {sortedHint}</p>}
            </div>
          )}

          {/* Bìa */}
          <div className="flex items-center gap-3">
            {coverUrl
              ? <img src={coverUrl} alt="bìa" className="w-16 h-16 object-cover rounded-xl border border-border" />
              : <div className="w-16 h-16 rounded-xl border border-dashed border-border flex items-center justify-center text-slate-300"><ImagePlus className="w-6 h-6" /></div>}
            <label className="text-sm text-indigo-600 font-semibold cursor-pointer">
              {coverUrl ? 'Đổi ảnh bìa' : 'Chọn ảnh bìa (tuỳ chọn)'}
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} />
            </label>
          </div>
        </section>

        {/* Thêm trang */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer shadow hover:bg-indigo-700">
            <FileUp className="w-4 h-4" /> Tải PDF
            <input type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && onPdf(e.target.files[0])} />
          </label>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-border font-bold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
            <ImagePlus className="w-4 h-4 text-indigo-500" /> Tải ảnh trang
            <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onImages(e.target.files)} />
          </label>
          {busy && <span className="inline-flex items-center gap-1.5 text-sm text-indigo-600"><Loader2 className="w-4 h-4 animate-spin" /> {busy}</span>}
          <span className="ml-auto text-sm text-slate-500">{pages.length} trang</span>
        </div>

        {/* Danh sách trang */}
        {pages.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            Chưa có trang nào. Tải PDF hoặc ảnh để bắt đầu.
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((p, idx) => (
              <div key={p.id} className="flex gap-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-border p-3">
                <div className="relative shrink-0">
                  <img src={p.imageUrl} alt={`Trang ${idx + 1}`} className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-border bg-white" />
                  <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shadow">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <textarea value={p.caption || ''} onChange={(e) => patchPage(p.id, { caption: e.target.value })}
                    placeholder="Lời thoại / câu kể hiển thị dưới tranh (tuỳ chọn)…" rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />

                  {mode === 'perPage' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.audioUrl
                        ? <audio src={p.audioUrl} controls className="h-9 max-w-[240px]" />
                        : <span className="text-xs text-slate-400">Chưa có audio</span>}
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-xs font-bold cursor-pointer">
                        <Music className="w-3.5 h-3.5" /> {p.audioUrl ? 'Đổi audio' : 'Tải audio trang'}
                        <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && onPageAudio(p.id, e.target.files[0])} />
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${p.flipAtSec != null ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        <Clock className="w-3.5 h-3.5" /> Lật tại {fmt(p.flipAtSec)}
                      </span>
                      <button onClick={() => markFlipHere(p.id)} disabled={!narrationUrl}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-bold disabled:opacity-40">
                        <Clock className="w-3.5 h-3.5" /> Đặt mốc lật tại đây
                      </button>
                      {p.flipAtSec != null && (
                        <button onClick={() => patchPage(p.id, { flipAtSec: null })} className="text-xs text-slate-400 hover:text-rose-500">Xoá mốc</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => movePage(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => movePage(idx, 1)} disabled={idx === pages.length - 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => removePage(p.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Thanh lưu */}
        <div className="sticky bottom-0 mt-6 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-gradient-to-t from-indigo-50 dark:from-slate-900 to-transparent">
          <div className="flex items-center gap-2 flex-wrap rounded-2xl bg-white dark:bg-slate-800 border border-border p-3 shadow-lg">
            <span className={`text-sm font-bold flex items-center gap-1.5 ${published ? 'text-emerald-600' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-4 h-4" /> {published ? 'Đã xuất bản' : 'Bản nháp'}
            </span>
            {editing && (
              <button onClick={onDelete} className="text-sm text-rose-500 font-semibold ml-1">Xoá sách</button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => save(false)} disabled={saving || !valid}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold disabled:opacity-50 flex items-center gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu nháp
              </button>
              <button onClick={() => save(true)} disabled={saving || !valid}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-black disabled:opacity-50 flex items-center gap-1.5 shadow">
                <CheckCircle2 className="w-4 h-4" /> Lưu & Xuất bản
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
