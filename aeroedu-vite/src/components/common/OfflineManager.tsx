/**
 * OfflineManager — card quản lý nội dung đã tải offline.
 * Nhúng vào Settings. Hiển thị danh mục đã tải + tổng dung lượng + xoá.
 */
import { useEffect, useState, useCallback } from 'react'
import { Download, Trash2, Film, FileText, Image as ImageIcon, Music, File, HardDrive } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getManifest, totalOfflineSize, removeDownload, clearAllDownloads,
  formatSize, type OfflineEntry, type OfflineType,
} from '@/lib/offline/downloadManager'

const TYPE_ICON: Record<OfflineType, typeof Film> = {
  video: Film, pdf: FileText, image: ImageIcon, audio: Music, other: File,
}

export function OfflineManager() {
  const [entries, setEntries] = useState<OfflineEntry[]>([])
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    setEntries(getManifest().sort((a, b) => b.downloadedAt - a.downloadedAt))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleRemove = async (key: string) => {
    setBusy(true)
    try {
      await removeDownload(key)
      refresh()
      toast.success('Đã xoá nội dung offline')
    } finally { setBusy(false) }
  }

  const handleClearAll = async () => {
    if (!confirm('Xoá tất cả nội dung đã tải offline?')) return
    setBusy(true)
    try {
      await clearAllDownloads()
      refresh()
      toast.success('Đã xoá toàn bộ nội dung offline')
    } finally { setBusy(false) }
  }

  const total = totalOfflineSize()

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-500" />
          <h3 className="font-bold text-sm text-foreground">Nội dung offline</h3>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{formatSize(total)}</span>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Download className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs leading-relaxed">
            Chưa có nội dung nào tải về.<br />
            Bấm nút <strong>“Tải về để học offline”</strong> trong bài học để xem khi không có mạng.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {entries.map((e) => {
              const Icon = TYPE_ICON[e.type] ?? File
              return (
                <div key={e.key} className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/40">
                  <Icon className="w-4 h-4 text-cyan-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{e.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatSize(e.size)} · {new Date(e.downloadedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  <button onClick={() => handleRemove(e.key)} disabled={busy}
                    className="p-1.5 rounded hover:bg-rose-500/15 text-rose-400 transition disabled:opacity-40"
                    aria-label="Xoá">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
          <button onClick={handleClearAll} disabled={busy}
            className="w-full mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-40">
            <Trash2 className="w-3.5 h-3.5" /> Xoá tất cả ({entries.length} mục · {formatSize(total)})
          </button>
        </>
      )}
    </div>
  )
}
