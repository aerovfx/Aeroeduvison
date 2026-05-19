/**
 * TranscriptEditor — Modal cho GV nhập + dịch transcript.
 *
 * Flow:
 *  1. GV mở modal cho video X
 *  2. Tab ngôn ngữ: 🇻🇳 Tiếng Việt (primary) | + ngôn ngữ khác đã có
 *  3. Textarea nhập text (manual MVP)
 *  4. Nút "💾 Lưu transcript {lang}"
 *  5. Nút "🌐 Tự dịch sang..." → dropdown 5 ngôn ngữ → Claude API
 *  6. Sau dịch xong, tab ngôn ngữ mới xuất hiện
 *
 * API:
 *  - GET /api/learning/videos/:vid/transcripts (public, dùng cho list)
 *  - POST /api/instructor/videos/:vid/transcripts (save manual)
 *  - POST /api/instructor/videos/:vid/transcripts/translate (auto-translate)
 *  - DELETE /api/instructor/videos/:vid/transcripts/:lang
 */
import { useCallback, useEffect, useState } from 'react'
import { X, Languages, Save, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { api } from '@/services/api'
import { toast } from 'react-hot-toast'

interface Transcript {
  id: string
  language: string
  languageName: string
  content: string
  source: 'manual' | 'whisper' | 'translation'
  translatedFrom: string | null
}

interface Props {
  videoId: string
  videoTitle: string
  onClose: () => void
}

const LANGS = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English',     flag: '🇬🇧' },
  { code: 'zh', name: '中文',         flag: '🇨🇳' },
  { code: 'ja', name: '日本語',       flag: '🇯🇵' },
  { code: 'ko', name: '한국어',       flag: '🇰🇷' },
  { code: 'fr', name: 'Français',    flag: '🇫🇷' },
] as const

export default function TranscriptEditor({ videoId, videoTitle, onClose }: Props) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [activeLang, setActiveLang] = useState<string>('vi')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [showTranslateMenu, setShowTranslateMenu] = useState(false)

  // Load transcripts
  const load = useCallback(() => {
    setLoading(true)
    api.get<{ items: Transcript[] }>(`/learning/videos/${videoId}/transcripts`)
      .then(r => {
        const items = r.data.items || []
        setTranscripts(items)
        const cur = items.find(t => t.language === activeLang)
        setContent(cur?.content || '')
      })
      .catch(() => setTranscripts([]))
      .finally(() => setLoading(false))
  }, [videoId, activeLang])

  useEffect(() => { load() }, [load])

  // Switch language → load that transcript content
  const switchLang = (lang: string) => {
    setActiveLang(lang)
    const t = transcripts.find(tr => tr.language === lang)
    setContent(t?.content || '')
  }

  // Save current transcript
  const handleSave = async () => {
    if (!content.trim()) { toast.error('Nhập nội dung trước'); return }
    setSaving(true)
    try {
      await api.post(`/instructor/videos/${videoId}/transcripts`, {
        language: activeLang,
        content: content.trim(),
      })
      toast.success(`Đã lưu transcript ${LANGS.find(l => l.code === activeLang)?.name}`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  // Auto-translate
  const handleTranslate = async (target: string) => {
    setShowTranslateMenu(false)
    if (target === activeLang) { toast.error('Trùng ngôn ngữ nguồn'); return }
    setTranslating(true)
    try {
      const r = await api.post<{ language: string; content: string }>(
        `/instructor/videos/${videoId}/transcripts/translate`,
        { sourceLanguage: activeLang, targetLanguage: target }
      )
      toast.success(`✨ Đã dịch sang ${LANGS.find(l => l.code === target)?.name}`)
      load()
      setActiveLang(r.data.language)
      setContent(r.data.content)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Dịch thất bại')
    } finally {
      setTranslating(false)
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!confirm(`Xoá transcript ${LANGS.find(l => l.code === activeLang)?.name}?`)) return
    try {
      await api.delete(`/instructor/videos/${videoId}/transcripts/${activeLang}`)
      toast.success('Đã xoá')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Xoá thất bại')
    }
  }

  const currentTranscript = transcripts.find(t => t.language === activeLang)
  const availableForTranslate = LANGS.filter(l => l.code !== activeLang)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="max-w-3xl w-full max-h-[90vh] bg-zinc-950 border-2 border-cyan-500/40
                      rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50">
          <Languages className="w-5 h-5 text-cyan-400" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white">Transcript đa ngôn ngữ</h3>
            <p className="text-xs text-zinc-400 truncate">{videoTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-white/10 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language tabs */}
        <div className="px-5 py-2 border-b border-zinc-800 flex flex-wrap gap-1.5">
          {LANGS.map(lang => {
            const exists = transcripts.find(t => t.language === lang.code)
            const active = activeLang === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => switchLang(lang.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 ${
                  active ? 'bg-cyan-500 text-white shadow-lg'
                    : exists ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                    : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
                {exists && <span className="text-[9px] opacity-70">✓</span>}
              </button>
            )
          })}
        </div>

        {/* Source badge */}
        {currentTranscript && (
          <div className="px-5 py-1.5 bg-zinc-900/30 border-b border-zinc-800/50 text-[10px] text-zinc-400">
            {currentTranscript.source === 'manual' && '✍ Nhập tay bởi giáo viên'}
            {currentTranscript.source === 'whisper' && '🎙 AI nhận dạng (Whisper)'}
            {currentTranscript.source === 'translation' && `🌐 Dịch từ ${currentTranscript.translatedFrom}`}
          </div>
        )}

        {/* Textarea */}
        <div className="flex-1 p-5 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" /></div>
          ) : (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`Nhập transcript ${LANGS.find(l => l.code === activeLang)?.name} cho bài giảng…\n\nVD: Xin chào các em, hôm nay chúng ta sẽ học về định luật Newton...`}
              className="w-full min-h-[300px] p-4 rounded-lg bg-zinc-900 border border-zinc-800
                         focus:border-cyan-500 text-sm text-zinc-100 placeholder-zinc-600
                         font-mono leading-relaxed resize-y"
            />
          )}
          <div className="text-[10px] text-zinc-500 mt-1 text-right">
            {content.length.toLocaleString()} / 200,000 ký tự
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/30 flex items-center gap-2">
          {currentTranscript && (
            <button
              onClick={handleDelete}
              className="p-2 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
              title="Xoá transcript ngôn ngữ này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1" />

          {/* Auto-translate dropdown */}
          {content.trim() && (
            <div className="relative">
              <button
                onClick={() => setShowTranslateMenu(s => !s)}
                disabled={translating}
                className="px-3 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-600 disabled:opacity-50
                           text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Dịch sang...
              </button>
              {showTranslateMenu && !translating && (
                <div className="absolute bottom-full right-0 mb-1 w-48 rounded-lg
                                bg-zinc-900 border border-zinc-700 shadow-2xl py-1 z-10">
                  {availableForTranslate.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleTranslate(lang.code)}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-xs text-zinc-200
                                 inline-flex items-center gap-2"
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50
                       text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Lưu transcript
          </button>
        </div>
      </div>
    </div>
  )
}
