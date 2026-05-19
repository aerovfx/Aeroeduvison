/**
 * TranscriptPanel — Hiển thị transcript của video với language switcher.
 *
 * Features:
 *  - Auto-load transcripts cho videoId hiện tại
 *  - Language switcher pills (vi/en/zh/ja/ko/fr)
 *  - Scrollable text area với search highlight
 *  - "Auto-scroll" mode khi video đang phát
 *  - Copy + Download .txt button
 *
 * Truy cập: GET /api/learning/videos/:vid/transcripts — public (any logged-in)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Languages, Search, Copy, Download, Loader2, FileText } from 'lucide-react'
import { api } from '@/services/api'
import { toast } from 'react-hot-toast'

interface Transcript {
  id: string
  videoId: string
  language: string
  languageName: string
  content: string
  segments: Array<{ start: number; end: number; text: string }> | null
  source: 'manual' | 'whisper' | 'translation'
  translatedFrom: string | null
  createdAt: string
}

interface Props {
  videoId: string | null
  videoTitle?: string
}

export default function TranscriptPanel({ videoId, videoTitle }: Props) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(false)
  const [activeLang, setActiveLang] = useState<string>('vi')
  const [searchQ, setSearchQ] = useState('')

  // Load transcripts cho video
  useEffect(() => {
    if (!videoId) return
    setLoading(true)
    api.get<{ items: Transcript[] }>(`/learning/videos/${videoId}/transcripts`)
      .then(r => {
        const items = r.data.items || []
        setTranscripts(items)
        // Auto-select first available language (ưu tiên vi)
        if (items.length > 0) {
          const viExists = items.find(t => t.language === 'vi')
          setActiveLang(viExists ? 'vi' : items[0].language)
        }
      })
      .catch(() => setTranscripts([]))
      .finally(() => setLoading(false))
  }, [videoId])

  const current = useMemo(
    () => transcripts.find(t => t.language === activeLang),
    [transcripts, activeLang]
  )

  // Highlight search results
  const renderedContent = useMemo(() => {
    if (!current) return null
    const text = current.content
    if (!searchQ.trim()) return text
    const q = searchQ.trim()
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? <mark key={i} className="bg-amber-500/40 text-amber-100 rounded px-0.5">{part}</mark>
        : <span key={i}>{part}</span>
    )
  }, [current, searchQ])

  const handleCopy = useCallback(() => {
    if (!current) return
    navigator.clipboard.writeText(current.content)
      .then(() => toast.success('Đã copy transcript'))
      .catch(() => toast.error('Không copy được'))
  }, [current])

  const handleDownload = useCallback(() => {
    if (!current) return
    const blob = new Blob([current.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(videoTitle || 'transcript').replace(/[^\w-]/g, '_')}_${current.language}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [current, videoTitle])

  if (!videoId) return null

  if (loading) {
    return (
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-4 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" />
        <p className="text-[10px] text-zinc-500 mt-2">Đang tải transcript…</p>
      </div>
    )
  }

  if (transcripts.length === 0) {
    return (
      <div className="bg-zinc-900/40 rounded-xl border border-zinc-800/60 p-4 text-center">
        <FileText className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
        <p className="text-xs text-zinc-400">Video này chưa có transcript</p>
        <p className="text-[10px] text-zinc-500 mt-1">Giáo viên sẽ bổ sung sau</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/50 flex items-center gap-2">
        <Languages className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold text-zinc-100 flex-1">📄 Transcript</h3>
        <button
          onClick={handleCopy}
          title="Copy transcript"
          className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDownload}
          title="Tải xuống .txt"
          className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Language switcher pills */}
      <div className="flex flex-wrap gap-1.5 p-2 border-b border-zinc-800">
        {transcripts.map(t => {
          const active = t.language === activeLang
          return (
            <button
              key={t.id}
              onClick={() => setActiveLang(t.language)}
              style={{ touchAction: 'manipulation' }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                active
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {LANG_FLAGS[t.language] || '🌐'} {t.languageName}
              {t.source === 'translation' && (
                <span className="ml-1 text-[8px] opacity-70">(dịch)</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Tìm trong transcript..."
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded bg-zinc-950 border border-zinc-700
                       focus:border-cyan-500 outline-none text-zinc-200 placeholder-zinc-600"
          />
        </div>
      </div>

      {/* Transcript content — scrollable */}
      <div className="px-3 py-3 max-h-80 overflow-y-auto text-xs leading-relaxed text-zinc-200
                      whitespace-pre-wrap select-text"
           style={{ WebkitOverflowScrolling: 'touch' }}>
        {renderedContent}
      </div>

      {/* Footer info */}
      {current && (
        <div className="px-3 py-1.5 border-t border-zinc-800 bg-zinc-950/30
                        text-[9px] text-zinc-500 flex justify-between">
          <span>{current.content.length.toLocaleString()} ký tự</span>
          <span>
            {current.source === 'manual' ? '✍ Nhập tay'
              : current.source === 'whisper' ? '🎙 AI nhận dạng'
              : `🌐 Dịch từ ${LANG_FLAGS[current.translatedFrom || ''] || ''} ${current.translatedFrom || ''}`}
          </span>
        </div>
      )}
    </div>
  )
}

const LANG_FLAGS: Record<string, string> = {
  vi: '🇻🇳',
  en: '🇬🇧',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  fr: '🇫🇷',
}
