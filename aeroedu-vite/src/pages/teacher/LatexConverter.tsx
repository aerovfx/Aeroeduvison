/**
 * Chuyển đổi AI: Word (DOCX) ↔ LaTeX — trong tài khoản giáo viên.
 *  • Word → LaTeX: tải .docx → mammoth trích HTML → AI dựng lại mã LaTeX.
 *  • LaTeX → Word: nhập/dán LaTeX → AI → HTML → sinh file .docx tải về.
 * Backend: POST /api/latex/from-docx · POST /api/latex/to-docx (Bearer).
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { FileText, FileType2, Upload, Copy, Download, Save, Loader2, ArrowLeftRight, CheckCircle2 } from 'lucide-react'

type Tab = 'docx2tex' | 'tex2docx'

export default function LatexConverter() {
  const [tab, setTab] = useState<Tab>('docx2tex')
  const navigate = useNavigate()

  // ── Word → LaTeX ──
  const [docxName, setDocxName] = useState('')
  const [docxBase64, setDocxBase64] = useState('')
  const [latexOut, setLatexOut] = useState('')
  const [busyD2T, setBusyD2T] = useState(false)
  const [errD2T, setErrD2T] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onPickDocx = (f: File | null) => {
    setErrD2T(''); setLatexOut('')
    if (!f) return
    if (!/\.docx$/i.test(f.name)) { setErrD2T('Chỉ hỗ trợ file .docx (Word)'); return }
    if (f.size > 15 * 1024 * 1024) { setErrD2T('File quá lớn (>15MB)'); return }
    setDocxName(f.name)
    const reader = new FileReader()
    reader.onload = () => setDocxBase64(String(reader.result || ''))
    reader.onerror = () => setErrD2T('Không đọc được file')
    reader.readAsDataURL(f)
  }

  const convertDocxToTex = async () => {
    if (!docxBase64) { setErrD2T('Hãy chọn file Word trước'); return }
    setBusyD2T(true); setErrD2T(''); setLatexOut('')
    try {
      const { data } = await api.post('/latex/from-docx', { docxBase64, filename: docxName })
      setLatexOut(data.latex || '')
    } catch (e: unknown) {
      setErrD2T((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Chuyển đổi thất bại')
    } finally { setBusyD2T(false) }
  }

  const copyLatex = async () => {
    try { await navigator.clipboard.writeText(latexOut); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ }
  }

  const saveAsProject = async () => {
    if (!latexOut.trim()) return
    setSaving(true)
    try {
      const title = (docxName || 'Tài liệu').replace(/\.docx$/i, '') + ' (LaTeX)'
      const { data } = await api.post('/latex-projects', { title })
      const id = data?.data?.id
      if (id) {
        await api.put(`/latex-projects/${id}`, { mainContent: latexOut })
        navigate(`/teacher/latex-documents/${id}`)
      }
    } catch { setErrD2T('Lưu dự án thất bại') } finally { setSaving(false) }
  }

  // ── LaTeX → Word ──
  const [latexIn, setLatexIn] = useState('')
  const [busyT2D, setBusyT2D] = useState(false)
  const [errT2D, setErrT2D] = useState('')
  const [doneT2D, setDoneT2D] = useState(false)

  const convertTexToDocx = async () => {
    if (latexIn.trim().length < 5) { setErrT2D('Hãy dán nội dung LaTeX'); return }
    setBusyT2D(true); setErrT2D(''); setDoneT2D(false)
    try {
      const resp = await api.post('/latex/to-docx', { latex: latexIn, filename: 'tai-lieu' }, { responseType: 'blob' })
      const blob = new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'tai-lieu.docx'; document.body.appendChild(a); a.click()
      a.remove(); URL.revokeObjectURL(url)
      setDoneT2D(true); setTimeout(() => setDoneT2D(false), 2500)
    } catch (e: unknown) {
      // Lỗi trả về dạng blob → đọc text
      const blob = (e as { response?: { data?: Blob } }).response?.data
      let msg = 'Chuyển đổi thất bại'
      try { if (blob && blob.text) { const t = JSON.parse(await blob.text()); msg = t.error || msg } } catch { /* noop */ }
      setErrT2D(msg)
    } finally { setBusyT2D(false) }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-slate-100">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-400/30 grid place-items-center"><ArrowLeftRight className="w-6 h-6 text-violet-300" /></div>
        <div>
          <h1 className="text-xl font-bold">Chuyển đổi AI: Word ↔ LaTeX</h1>
          <p className="text-sm text-slate-400">Trích nội dung Word dựng lại mã LaTeX, hoặc xuất tài liệu LaTeX ra file Word</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-4 mb-5 p-1 rounded-xl bg-slate-800/50 border border-slate-700/60 w-fit">
        <button onClick={() => setTab('docx2tex')} className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${tab === 'docx2tex' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
          <FileText className="w-4 h-4" /> Word → LaTeX
        </button>
        <button onClick={() => setTab('tex2docx')} className={`px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 ${tab === 'tex2docx' ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
          <FileType2 className="w-4 h-4" /> LaTeX → Word
        </button>
      </div>

      {tab === 'docx2tex' ? (
        <div className="space-y-4">
          {/* Drop / pick file */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onPickDocx(e.dataTransfer.files?.[0] || null) }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-600 hover:border-violet-400/60 bg-slate-800/30 p-8 text-center transition-colors">
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <div className="text-sm text-slate-300">{docxName ? <span className="text-violet-300 font-medium">{docxName}</span> : 'Bấm hoặc kéo-thả file .docx vào đây'}</div>
            <input ref={fileRef} type="file" accept=".docx" className="hidden" onChange={e => onPickDocx(e.target.files?.[0] || null)} />
          </div>

          <button onClick={convertDocxToTex} disabled={busyD2T || !docxBase64}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50">
            {busyD2T ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang chuyển đổi…</> : <>Chuyển sang LaTeX</>}
          </button>
          {errD2T && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-lg px-3 py-2">{errD2T}</div>}

          {latexOut && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-slate-300">Mã LaTeX</span>
                <button onClick={copyLatex} className="ml-auto px-2.5 py-1.5 rounded-lg text-xs bg-slate-700/60 hover:bg-slate-600 inline-flex items-center gap-1">
                  {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đã chép</> : <><Copy className="w-3.5 h-3.5" /> Sao chép</>}
                </button>
                <button onClick={saveAsProject} disabled={saving} className="px-2.5 py-1.5 rounded-lg text-xs bg-cyan-600 hover:bg-cyan-500 text-white inline-flex items-center gap-1 disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Lưu thành dự án
                </button>
              </div>
              <textarea value={latexOut} onChange={e => setLatexOut(e.target.value)} spellCheck={false}
                className="w-full h-80 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-sm font-mono leading-relaxed" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="text-sm font-medium text-slate-300">Dán mã LaTeX</span>
            <textarea value={latexIn} onChange={e => setLatexIn(e.target.value)} spellCheck={false}
              placeholder={'\\documentclass{article}\n\\begin{document}\n\\section{Mở đầu}\nNội dung... $E=mc^2$\n\\end{document}'}
              className="mt-2 w-full h-80 px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-sm font-mono leading-relaxed" />
          </div>
          <button onClick={convertTexToDocx} disabled={busyT2D || latexIn.trim().length < 5}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50">
            {busyT2D ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo file Word…</> : <><Download className="w-4 h-4" /> Tải file Word (.docx)</>}
          </button>
          {doneT2D && <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2 inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Đã tạo file Word</div>}
          {errT2D && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-lg px-3 py-2">{errT2D}</div>}
          <p className="text-xs text-slate-500">Lưu ý: công thức toán phức tạp sẽ được chuyển sang ký hiệu Unicode dễ đọc (vd α, ∑, x²). Để giữ công thức chuẩn, dùng nút biên dịch PDF trong trình soạn thảo LaTeX.</p>
        </div>
      )}
    </div>
  )
}
