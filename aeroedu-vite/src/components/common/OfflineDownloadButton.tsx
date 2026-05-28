/**
 * OfflineDownloadButton — nút "Tải về để học offline" cho 1 nội dung
 * (video GCS / PDF / audio). Reusable.
 *
 * State:
 *   - idle: "Tải về để học offline"
 *   - downloading: progress % (web) / spinner (native)
 *   - downloaded: "Đã tải offline ✓" + nút xoá
 *
 * Chỉ hiển thị cho URL tải được (GCS / direct file). Ẩn cho YouTube/Vimeo
 * (caller tự quyết định có render hay không).
 */
import { useEffect, useState } from 'react'
import { Download, Check, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  downloadFile, isDownloaded, removeDownload,
  type OfflineType, type DownloadProgress,
} from '@/lib/offline/downloadManager'
import { haptic } from '@/lib/capacitor/native'

interface Props {
  downloadKey: string
  url: string
  title: string
  type: OfflineType
  className?: string
}

export function OfflineDownloadButton({ downloadKey, url, title, type, className }: Props) {
  const [state, setState] = useState<'idle' | 'downloading' | 'done'>('idle')
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    setState(isDownloaded(downloadKey) ? 'done' : 'idle')
  }, [downloadKey])

  const handleDownload = async () => {
    if (state === 'downloading') return
    setState('downloading')
    setPercent(0)
    try {
      await downloadFile(downloadKey, url, title, type, (p: DownloadProgress) => {
        setPercent(p.percent)
      })
      setState('done')
      haptic('success')
      toast.success('Đã tải về — xem được khi offline')
    } catch (e: any) {
      setState('idle')
      haptic('error')
      toast.error(`Tải thất bại: ${e?.message || 'lỗi mạng'}`)
    }
  }

  const handleRemove = async () => {
    await removeDownload(downloadKey)
    setState('idle')
    haptic('light')
    toast.success('Đã xoá khỏi offline')
  }

  if (state === 'done') {
    return (
      <button onClick={handleRemove}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                    bg-emerald-500/15 border border-emerald-500/40 text-emerald-500
                    hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-400 transition group ${className ?? ''}`}
        title="Đã tải offline — bấm để xoá">
        <Check className="w-3.5 h-3.5 group-hover:hidden" />
        <Trash2 className="w-3.5 h-3.5 hidden group-hover:inline" />
        <span className="group-hover:hidden">Đã tải offline</span>
        <span className="hidden group-hover:inline">Xoá offline</span>
      </button>
    )
  }

  if (state === 'downloading') {
    return (
      <button disabled
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                    bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 ${className ?? ''}`}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {percent > 0 ? `Đang tải ${percent}%` : 'Đang tải…'}
      </button>
    )
  }

  return (
    <button onClick={handleDownload}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                  bg-white/[0.06] border border-white/15 text-foreground/80
                  hover:bg-cyan-500/15 hover:border-cyan-500/40 hover:text-cyan-400 transition ${className ?? ''}`}
      title="Tải về để xem khi không có mạng">
      <Download className="w-3.5 h-3.5" />
      Tải về để học offline
    </button>
  )
}
