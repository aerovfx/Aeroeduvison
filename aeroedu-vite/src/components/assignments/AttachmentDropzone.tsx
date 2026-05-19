/**
 * AttachmentDropzone — Drag-drop multi-file upload cho bài tập.
 *
 * Cho phép GV đính kèm file đa loại khi tạo/sửa bài tập:
 *   - Tài liệu: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PPT (.ppt/.pptx)
 *   - Ảnh: JPG, PNG, WebP, GIF, HEIC
 *   - Video: MP4, MOV, WebM, MKV
 *   - Audio: MP3, WAV, OGG, M4A
 *   - Khác: TXT, CSV, MD, ZIP
 *
 * Upload từng file qua POST /api/assignments/upload-attachment.
 * Tối đa 100MB/file (backend limit).
 *
 * Props:
 *   value: Attachment[]               — current list
 *   onChange: (next) => void          — emit khi add/remove
 *   maxFiles?: number = 20            — giới hạn số file
 *   className?: string
 */
import { useState, useRef, useCallback } from 'react'
import {
  Upload, X, FileText, Image as ImageIcon, Video, Music,
  FileSpreadsheet, Presentation, FileArchive, File as FileIcon,
  Loader2, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

export interface Attachment {
  url: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: string
}

interface QueueItem {
  id: string
  file: File
  status: 'uploading' | 'done' | 'failed'
  attachment?: Attachment
  error?: string
}

interface Props {
  value: Attachment[]
  onChange: (next: Attachment[]) => void
  maxFiles?: number
  className?: string
}

const MAX_SIZE_MB = 100

/** Pick icon component theo mime/extension */
function pickIcon(mime: string, filename: string): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const m = (mime || '').toLowerCase()
  const ext = (filename.match(/\.[^.]+$/) || [''])[0].toLowerCase()
  if (m.startsWith('image/'))    return ImageIcon
  if (m.startsWith('video/'))    return Video
  if (m.startsWith('audio/'))    return Music
  if (m.includes('spreadsheet') || m.includes('excel') || /\.(xlsx?|csv)$/.test(ext)) return FileSpreadsheet
  if (m.includes('presentation') || m.includes('powerpoint') || /\.pptx?$/.test(ext)) return Presentation
  if (m.includes('zip') || /\.zip$/.test(ext)) return FileArchive
  if (m === 'application/pdf' || m.includes('word') || m === 'text/plain' || /\.(pdf|docx?|txt|md)$/.test(ext)) return FileText
  return FileIcon
}

/** Pick màu icon theo loại */
function pickColor(mime: string, filename: string): string {
  const m = (mime || '').toLowerCase()
  const ext = (filename.match(/\.[^.]+$/) || [''])[0].toLowerCase()
  if (m.startsWith('image/'))    return '#a855f7'  // purple
  if (m.startsWith('video/'))    return '#ef4444'  // red
  if (m.startsWith('audio/'))    return '#f59e0b'  // amber
  if (m.includes('spreadsheet') || m.includes('excel') || /\.xlsx?$/.test(ext)) return '#10b981' // green
  if (m.includes('presentation') || /\.pptx?$/.test(ext))                       return '#f97316' // orange
  if (m === 'application/pdf' || /\.pdf$/.test(ext))                            return '#dc2626' // red-600
  if (m.includes('word') || /\.docx?$/.test(ext))                               return '#2563eb' // blue
  if (m.includes('zip'))                                                        return '#737373' // gray
  return '#6b7280'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AttachmentDropzone({ value, onChange, maxFiles = 20, className = '' }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const totalCount = value.length + queue.filter(q => q.status !== 'failed').length

  const uploadOne = useCallback(async (file: File): Promise<Attachment | null> => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`File "${file.name}" > ${MAX_SIZE_MB}MB`)
    }
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<{ success: boolean; attachment: Attachment; error?: string }>(
      '/assignments/upload-attachment',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180_000,  // 3 phút cho video lớn
      }
    )
    if (!res.data?.success) throw new Error(res.data?.error || 'Upload thất bại')
    return res.data.attachment
  }, [])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const remaining = maxFiles - totalCount
    if (arr.length > remaining) {
      toast(`Chỉ thêm được ${remaining} file nữa (giới hạn ${maxFiles})`, { icon: '⚠️' })
    }
    const toAdd = arr.slice(0, Math.max(0, remaining))
    if (toAdd.length === 0) return

    // Tạo queue items + start upload song song (max 3 cùng lúc)
    const newItems: QueueItem[] = toAdd.map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      status: 'uploading' as const,
    }))
    setQueue(prev => [...prev, ...newItems])

    /* Concurrency limit 3 — tránh saturate connection cho file lớn */
    const CONCURRENCY = 3
    let cursor = 0
    const completed: Attachment[] = []
    async function worker() {
      while (cursor < newItems.length) {
        const idx = cursor++
        const item = newItems[idx]
        try {
          const att = await uploadOne(item.file)
          if (att) {
            completed.push(att)
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done', attachment: att } : q))
            // Tự remove khỏi queue sau 1s để clean UI
            setTimeout(() => setQueue(prev => prev.filter(q => q.id !== item.id)), 1500)
          }
        } catch (err: any) {
          setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: err?.message || 'Lỗi' } : q))
          toast.error(`Upload "${item.file.name}" lỗi: ${err?.message || ''}`)
        }
      }
    }
    const workers = Array.from({ length: Math.min(CONCURRENCY, newItems.length) }, worker)
    await Promise.all(workers)

    // Sau khi tất cả xong, push vào value
    if (completed.length > 0) {
      onChange([...value, ...completed])
      toast.success(`Đã upload ${completed.length} file`)
    }
  }, [value, onChange, maxFiles, totalCount, uploadOne])

  const removeAttachment = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const removeQueueItem = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
        }}
        className={`rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors text-center ${
          dragOver ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/20' : 'border-border bg-muted/30 hover:bg-muted'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          /* Accept: tất cả các loại GV thường gửi.
             Note: vẫn cho phép upload .heic, .mkv qua extension fallback. */
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.zip,.heic,.mkv"
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
        <Upload className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-1.5" />
        <p className="text-sm font-medium text-foreground">
          Kéo-thả file vào đây
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          hoặc click chọn · <strong>ảnh / video / Word / Excel / PPT / PDF / audio / zip</strong> · ≤ {MAX_SIZE_MB}MB/file · tối đa {maxFiles} file
        </p>
      </div>

      {/* Queue (đang upload + lỗi) */}
      {queue.length > 0 && (
        <div className="space-y-1">
          {queue.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${
                item.status === 'failed'
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/15'
                  : 'border-border bg-card'
              }`}
            >
              {item.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />}
              {item.status === 'failed' && <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />}
              <span className="flex-1 truncate text-foreground">{item.file.name}</span>
              <span className="text-muted-foreground tabular-nums">{formatSize(item.file.size)}</span>
              {item.status === 'failed' && (
                <button
                  onClick={() => removeQueueItem(item.id)}
                  className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Attachment list (uploaded successfully) */}
      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((att, idx) => {
            const Icon = pickIcon(att.mimeType, att.filename)
            const color = pickColor(att.mimeType, att.filename)
            return (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card hover:bg-accent/30 transition-colors text-sm group"
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  title={att.filename}
                >
                  {att.filename}
                </a>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatSize(att.size)}
                </span>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Mở trong tab mới"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Xoá khỏi danh sách"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AttachmentDropzone
