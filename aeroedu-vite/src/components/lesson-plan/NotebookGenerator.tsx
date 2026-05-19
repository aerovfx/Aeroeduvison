/**
 * NotebookGenerator — Soạn giáo án theo workflow NotebookLM:
 *
 *   STEP 1: SOURCES (tư liệu đầu vào)
 *     - Upload PDF / TXT (backend extract text qua pdf-parse)
 *     - Paste URL → backend fetch + strip HTML
 *     - Paste text trực tiếp
 *     - Mỗi nguồn có title + preview content
 *     - Tối đa 10 nguồn (~180k chars total)
 *
 *   STEP 2: TOPIC + CONFIG
 *     - Chủ đề bài học (input ngắn)
 *     - Môn / Lớp / Số tiết
 *     - Định dạng output: LaTeX (giáo án chính thức) hoặc Markdown
 *     - Hướng dẫn thêm cho AI (optional)
 *
 *   STEP 3: GENERATE + PREVIEW
 *     - Claude API call với grounded prompt
 *     - Hiển thị giáo án + citations [Nguồn #N]
 *     - Save vào LatexProject (nếu LaTeX) → mở editor
 *     - Download .md / .tex file
 */
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, FileText, Globe, Type, Upload, Trash2, Sparkles, Loader2,
  ChevronRight, ChevronLeft, Check, Copy, Download, FileCode, BookOpen,
} from 'lucide-react'
import { api } from '@/services/api'
import { toast } from 'react-hot-toast'

interface Source {
  id: string
  title: string
  content: string
  source: 'pdf' | 'url' | 'text'
  meta: any
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function NotebookGenerator({ open, onClose }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [sources, setSources] = useState<Source[]>([])

  // Step 1 inputs
  const [textInput, setTextInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [titleHint, setTitleHint] = useState('')
  const [extracting, setExtracting] = useState(false)

  // Step 2 inputs
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('Vật lí')
  const [grade, setGrade] = useState('10')
  const [lessonCount, setLessonCount] = useState(2)
  const [outputFormat, setOutputFormat] = useState<'latex' | 'markdown'>('latex')
  const [extraInstructions, setExtraInstructions] = useState('')

  // Step 3 state
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ content: string; citations: string[]; meta: any } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  /* ── STEP 1 handlers ── */

  const handleFileUpload = async (file: File) => {
    if (sources.length >= 10) { toast.error('Tối đa 10 nguồn'); return }
    setExtracting(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (titleHint) form.append('title', titleHint)
      const r = await api.post<Source & { source: any }>(
        '/lesson-plans/notebook-source-extract',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setSources(s => [...s, { ...r.data, id: `src-${Date.now()}` }])
      setTitleHint('')
      toast.success(`Đã thêm: ${r.data.title}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Extract thất bại')
    } finally { setExtracting(false) }
  }

  const handleUrlAdd = async () => {
    if (!urlInput.trim()) return
    if (sources.length >= 10) { toast.error('Tối đa 10 nguồn'); return }
    setExtracting(true)
    try {
      const r = await api.post<Source & { source: any }>(
        '/lesson-plans/notebook-source-extract',
        { url: urlInput.trim(), title: titleHint || undefined }
      )
      setSources(s => [...s, { ...r.data, id: `src-${Date.now()}` }])
      setUrlInput('')
      setTitleHint('')
      toast.success(`Đã thêm: ${r.data.title}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Fetch URL thất bại')
    } finally { setExtracting(false) }
  }

  const handleTextAdd = () => {
    if (!textInput.trim()) return
    if (sources.length >= 10) { toast.error('Tối đa 10 nguồn'); return }
    setSources(s => [...s, {
      id: `src-${Date.now()}`,
      title: titleHint || `Đoạn văn bản #${s.length + 1}`,
      content: textInput.trim(),
      source: 'text',
      meta: { charCount: textInput.length },
    }])
    setTextInput('')
    setTitleHint('')
    toast.success('Đã thêm đoạn văn')
  }

  /* ── STEP 3: Generate ── */

  const handleGenerate = useCallback(async () => {
    if (sources.length === 0) { toast.error('Cần ít nhất 1 nguồn'); return }
    if (!topic.trim()) { toast.error('Nhập chủ đề'); return }
    setGenerating(true)
    setResult(null)
    try {
      const r = await api.post('/lesson-plans/notebook-generate', {
        topic: topic.trim(),
        subject, grade, lessonCount,
        outputFormat,
        extraInstructions: extraInstructions.trim() || undefined,
        sources: sources.map(s => ({ title: s.title, content: s.content })),
      })
      setResult(r.data as any)
      toast.success('✨ Giáo án đã tạo!')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Generate thất bại')
    } finally { setGenerating(false) }
  }, [sources, topic, subject, grade, lessonCount, outputFormat, extraInstructions])

  const handleSaveProject = async () => {
    if (!result) return
    if (outputFormat !== 'latex') {
      // Markdown → download .md file
      const blob = new Blob([result.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${topic.replace(/[^\w-]/g, '_')}.md`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã tải xuống .md')
      return
    }
    // LaTeX → create LatexProject + redirect
    setSaving(true)
    try {
      const r = await api.post<{ id: string }>('/latex-projects', {
        title: `Giáo án: ${topic.slice(0, 80)}`,
        body: result.content,
      })
      toast.success('Đã lưu LaTeX project')
      navigate(`/teacher/latex-projects/${r.data.id}/edit`)
      onClose()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lưu thất bại')
    } finally { setSaving(false) }
  }

  /* ── Render ── */

  const totalChars = sources.reduce((s, src) => s + src.content.length, 0)
  const canNext1 = sources.length > 0
  const canNext2 = topic.trim().length >= 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="max-w-5xl w-full max-h-[92vh] bg-zinc-950 border-2 border-purple-500/40
                      rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header với step indicator */}
        <div className="px-5 py-3 border-b border-zinc-800 bg-gradient-to-r from-purple-900/30 to-pink-900/30
                        flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-purple-300" />
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">🧠 Soạn giáo án — Notebook AI</h2>
            <p className="text-xs text-purple-200/70">
              {step === 1 && '1. Nạp tư liệu đầu vào — AI sẽ học từ các nguồn này'}
              {step === 2 && '2. Chọn chủ đề + cấu hình giáo án'}
              {step === 3 && '3. AI tổng hợp + tạo giáo án (có citations)'}
            </p>
          </div>
          {/* Step pills */}
          <div className="hidden sm:flex items-center gap-1.5">
            {[1, 2, 3].map(n => (
              <div key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === n ? 'bg-purple-500 text-white'
                  : step > n ? 'bg-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-800 text-zinc-500'
              }`}>
                {step > n ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* STEP 1 — SOURCES */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 text-xs text-purple-200">
                💡 <b>Workflow NotebookLM</b>: Nạp 3-10 nguồn trước (SGK PDF, link bài viết, đoạn note...).
                AI sẽ tổng hợp <b>chỉ từ các nguồn này</b> để đảm bảo giáo án chính xác + có trích dẫn.
              </div>

              {/* Title hint shared input */}
              <input
                type="text"
                value={titleHint}
                onChange={e => setTitleHint(e.target.value)}
                placeholder="Tên cho nguồn này (tùy chọn, sẽ auto từ file/URL nếu trống)"
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white"
              />

              {/* 3 source input methods - grid */}
              <div className="grid md:grid-cols-3 gap-3">
                {/* File upload */}
                <label className="border-2 border-dashed border-zinc-700 hover:border-purple-500
                                  rounded-lg p-4 cursor-pointer transition-colors flex flex-col items-center justify-center text-center gap-2">
                  <Upload className="w-6 h-6 text-purple-400" />
                  <div className="text-xs font-bold text-white">📄 Upload PDF / TXT</div>
                  <div className="text-[10px] text-zinc-500">Max 15MB</div>
                  <input type="file" accept=".pdf,.txt,application/pdf,text/plain" className="hidden"
                         onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }} />
                </label>

                {/* URL */}
                <div className="border-2 border-zinc-700 rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <div className="text-xs font-bold text-white">🌐 Link Web</div>
                  </div>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-white"
                  />
                  <button onClick={handleUrlAdd} disabled={!urlInput.trim() || extracting}
                          className="w-full px-2 py-1.5 rounded bg-cyan-500/80 hover:bg-cyan-500 disabled:opacity-50 text-xs font-bold text-white">
                    + Thêm URL
                  </button>
                </div>

                {/* Text paste */}
                <div className="border-2 border-zinc-700 rounded-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Type className="w-5 h-5 text-amber-400" />
                    <div className="text-xs font-bold text-white">📝 Dán văn bản</div>
                  </div>
                  <textarea
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    placeholder="Paste đoạn văn..."
                    rows={2}
                    className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-white resize-y"
                  />
                  <button onClick={handleTextAdd} disabled={!textInput.trim()}
                          className="w-full px-2 py-1.5 rounded bg-amber-500/80 hover:bg-amber-500 disabled:opacity-50 text-xs font-bold text-white">
                    + Thêm đoạn
                  </button>
                </div>
              </div>

              {extracting && (
                <div className="bg-zinc-900/50 rounded-lg p-3 flex items-center gap-2 text-xs text-zinc-300">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  Đang extract nguồn...
                </div>
              )}

              {/* Sources list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    📚 Nguồn đã nạp ({sources.length} / 10)
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {(totalChars / 1000).toFixed(1)}k ký tự total
                  </span>
                </div>
                {sources.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs italic">
                    Chưa có nguồn nào — thêm ít nhất 1 nguồn để tiếp tục
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {sources.map((s, i) => (
                      <div key={s.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-2.5 flex items-start gap-2">
                        <span className="text-purple-400 font-bold text-xs shrink-0 w-6">#{i + 1}</span>
                        <span className="text-base shrink-0">
                          {s.source === 'pdf' ? '📄' : s.source === 'url' ? '🌐' : '📝'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{s.title}</div>
                          <div className="text-[10px] text-zinc-500 line-clamp-2">{s.content.slice(0, 200)}</div>
                          <div className="text-[9px] text-zinc-600 mt-0.5">
                            {(s.content.length / 1000).toFixed(1)}k chars · {s.source.toUpperCase()}
                          </div>
                        </div>
                        <button onClick={() => setSources(arr => arr.filter(x => x.id !== s.id))}
                                className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 — TOPIC + CONFIG */}
          {step === 2 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Chủ đề bài học <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="VD: Định luật Newton III — phản lực, lớp 10"
                  className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-purple-500 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Môn</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                         className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Lớp</label>
                  <input value={grade} onChange={e => setGrade(e.target.value)}
                         className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Số tiết (1-8)</label>
                  <input type="number" min={1} max={8} value={lessonCount} onChange={e => setLessonCount(+e.target.value)}
                         className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white" />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Định dạng output</label>
                <div className="flex gap-2">
                  {(['latex', 'markdown'] as const).map(fmt => (
                    <button key={fmt} onClick={() => setOutputFormat(fmt)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${
                              outputFormat === fmt
                                ? 'bg-purple-500 text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}>
                      {fmt === 'latex' ? '📐 LaTeX (giáo án chính thức)' : '📝 Markdown (đơn giản)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1 block">
                  Hướng dẫn thêm cho AI <span className="text-zinc-500">(tùy chọn)</span>
                </label>
                <textarea value={extraInstructions} onChange={e => setExtraInstructions(e.target.value)}
                          rows={3} placeholder="VD: Tập trung vào ví dụ thực tế, có hình minh hoạ..."
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white resize-y" />
              </div>

              <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 text-xs text-purple-200">
                ✨ AI sẽ tổng hợp <b>{sources.length} nguồn</b> ({(totalChars / 1000).toFixed(1)}k ký tự)
                để soạn giáo án {lessonCount} tiết. Mỗi câu trích từ nguồn sẽ có citation [Nguồn #N].
              </div>
            </div>
          )}

          {/* STEP 3 — GENERATE + RESULT */}
          {step === 3 && (
            <div className="space-y-4">
              {!result && !generating && (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Sẵn sàng tạo giáo án</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
                    AI sẽ dùng {sources.length} nguồn + chủ đề "{topic}" để tạo giáo án {lessonCount} tiết
                    định dạng {outputFormat}.
                  </p>
                  <button onClick={handleGenerate}
                          className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500
                                     hover:from-purple-400 hover:to-pink-400 text-white text-sm font-bold
                                     shadow-lg hover:scale-105 transition inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Tạo giáo án ngay
                  </button>
                </div>
              )}

              {generating && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-purple-400 mb-4" />
                  <p className="text-sm text-white">AI đang tổng hợp từ {sources.length} nguồn...</p>
                  <p className="text-xs text-zinc-500 mt-1">Có thể mất 30-90 giây</p>
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-400/30 rounded-lg p-3">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">✅ Giáo án đã tạo</h4>
                      <p className="text-[10px] text-emerald-200/70">
                        {result.content.length.toLocaleString()} ký tự ·
                        {result.citations.length} citation ·
                        {(result.meta.tookMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { navigator.clipboard.writeText(result.content); toast.success('Đã copy') }}
                              className="p-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Citations row */}
                  {result.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-zinc-500 mr-1">Citations:</span>
                      {result.citations.map(c => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/30">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Content preview */}
                  <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-[11px]
                                  text-zinc-200 leading-relaxed max-h-96 overflow-y-auto font-mono whitespace-pre-wrap">
                    {result.content}
                  </pre>

                  <button onClick={handleSaveProject} disabled={saving}
                          className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500
                                     hover:from-emerald-400 hover:to-cyan-400 text-white text-sm font-bold
                                     shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> :
                      outputFormat === 'latex' ? <FileCode className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {outputFormat === 'latex' ? '💾 Lưu LaTeX project + mở editor' : '⬇ Tải xuống .md'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <button onClick={() => step > 1 && setStep((step - 1) as any)}
                  disabled={step === 1}
                  className="px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 disabled:opacity-30
                             text-zinc-300 text-xs font-bold inline-flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Quay lại
          </button>
          <div className="text-xs text-zinc-500">Bước {step}/3</div>
          {step < 3 ? (
            <button onClick={() => setStep((step + 1) as any)}
                    disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30
                               text-white text-xs font-bold inline-flex items-center gap-1">
              Tiếp theo <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold">
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
