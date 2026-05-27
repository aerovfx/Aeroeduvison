/**
 * VideoUploader — Upload file (video/audio/pdf/pptx/document) lên GCS bucket
 * qua signed URL flow.
 *
 * Flow:
 *  1. User chọn file → validate (type/size)
 *  2. POST /api/upload/video-signed-url với { filename, contentType, courseId }
 *     → backend trả { uploadUrl, publicUrl }
 *  3. XHR PUT file lên uploadUrl (track progress %)
 *  4. onComplete(publicUrl, fileSize) → caller set content = publicUrl
 *
 * Tiết kiệm bandwidth Cloud Run: file đi trực tiếp browser → GCS,
 * không qua Cloud Run.
 *
 * Note: tên component giữ là VideoUploader để khỏi vỡ import cũ, nhưng
 * hiện đã hỗ trợ mọi mediaType (video/audio/pdf/pptx/document).
 */
import { useRef, useState } from 'react'
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, FileVideo, FileText,
  Presentation, RotateCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

type MediaType = 'video' | 'audio' | 'pdf' | 'pptx' | 'document'

interface Props {
  /** courseId hoặc generic identifier (vd: "learning-path", "assignment").
   * Optional — nếu thiếu, BE auto fallback uploads/{userId}/ */
  courseId?: string
  /** Loại media: video/audio/pdf/pptx/document. Signed URL endpoint accept tất cả. */
  mediaType?: MediaType
  /** Max size MB. Default: 500 video / 100 audio / 50 pdf-pptx-doc */
  maxSizeMB?: number
  /** Callback khi upload xong thành công */
  onComplete: (info: { url: string; fileSize: number; contentType: string; filename: string }) => void
}

const ACCEPT_VIDEO = 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska'
const ACCEPT_AUDIO = 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-m4a,audio/aac'
const ACCEPT_PDF   = 'application/pdf,.pdf'
const ACCEPT_PPTX  = 'application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,.pptx,.ppt'
const ACCEPT_DOC   =
  'application/pdf,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/msword,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation,' +
  'application/vnd.ms-powerpoint,' +
  '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt'

function getAccept(t: MediaType): string {
  switch (t) {
    case 'video':    return ACCEPT_VIDEO
    case 'audio':    return ACCEPT_AUDIO
    case 'pdf':      return ACCEPT_PDF
    case 'pptx':     return ACCEPT_PPTX
    case 'document': return ACCEPT_DOC
  }
}

function getDefaultMaxMB(t: MediaType): number {
  switch (t) {
    case 'video':    return 500
    case 'audio':    return 100
    case 'pdf':      return 50
    case 'pptx':     return 100
    case 'document': return 50
  }
}

function getDefaultMime(t: MediaType): string {
  switch (t) {
    case 'video':    return 'video/mp4'
    case 'audio':    return 'audio/mpeg'
    case 'pdf':      return 'application/pdf'
    case 'pptx':     return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case 'document': return 'application/octet-stream'
  }
}

function getMediaIcon(t: MediaType) {
  if (t === 'pdf')  return FileText
  if (t === 'pptx') return Presentation
  if (t === 'document') return FileText
  return FileVideo
}

function getLabel(t: MediaType): string {
  if (t === 'pdf')  return 'PDF'
  if (t === 'pptx') return 'PowerPoint'
  if (t === 'document') return 'tài liệu'
  if (t === 'audio') return 'audio'
  return 'video'
}

function getFormatHint(t: MediaType): string {
  if (t === 'pdf')  return 'PDF'
  if (t === 'pptx') return 'PPTX / PPT'
  if (t === 'document') return 'PDF / DOCX / XLSX / PPTX'
  if (t === 'audio') return 'MP3 / WAV / M4A'
  return 'MP4 / WebM / MOV'
}

function isAcceptableMime(t: MediaType, mime: string): boolean {
  if (t === 'video')    return mime.startsWith('video/')
  if (t === 'audio')    return mime.startsWith('audio/')
  if (t === 'pdf')      return mime === 'application/pdf'
  if (t === 'pptx')     return /presentation|powerpoint/.test(mime)
  if (t === 'document') {
    return mime === 'application/pdf'
      || /officedocument|msword|ms-excel|ms-powerpoint/.test(mime)
  }
  return false
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function VideoUploader({
  courseId,
  mediaType = 'video',
  maxSizeMB,
  onComplete,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)  // 0-100
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const effectiveMaxMB = maxSizeMB ?? getDefaultMaxMB(mediaType)
  const acceptAttr = getAccept(mediaType)
  const MediaIcon = getMediaIcon(mediaType)
  const label = getLabel(mediaType)

  const pickFile = () => fileRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError(null)
    setDone(false)
    setProgress(0)
    // Validate type — some browsers ko set MIME đúng (vd .pptx cũ), accept luôn
    // nếu MIME rỗng + extension hợp lệ
    let accepted = isAcceptableMime(mediaType, f.type || '')
    if (!accepted && !f.type) {
      const lowerName = f.name.toLowerCase()
      if (mediaType === 'pdf' && lowerName.endsWith('.pdf')) accepted = true
      if (mediaType === 'pptx' && (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt'))) accepted = true
      if (mediaType === 'document' && /\.(pdf|docx?|xlsx?|pptx?)$/i.test(lowerName)) accepted = true
    }
    if (!accepted) {
      setError(`File phải là ${getFormatHint(mediaType)}`)
      return
    }
    // Validate size
    if (f.size > effectiveMaxMB * 1024 * 1024) {
      setError(`File quá lớn: ${formatBytes(f.size)} (giới hạn ${effectiveMaxMB} MB)`)
      return
    }
    setFile(f)
  }

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort()
      xhrRef.current = null
    }
    setUploading(false)
    setProgress(0)
  }

  const resetAll = () => {
    cancelUpload()
    setFile(null)
    setError(null)
    setDone(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const startUpload = async () => {
    if (!file) return
    // courseId optional — BE fallback uploads/{userId}/
    setError(null)
    setUploading(true)
    setProgress(0)

    try {
      // 1. Request signed URL từ backend
      const { data } = await api.post<{
        uploadUrl: string; publicUrl: string; contentType: string
      }>('/upload/video-signed-url', {
        filename: file.name,
        contentType: file.type || getDefaultMime(mediaType),
        courseId,
      })

      // 2. PUT file lên GCS với XHR (track progress)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhrRef.current = xhr
        xhr.open('PUT', data.uploadUrl)
        xhr.setRequestHeader('Content-Type', data.contentType)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`GCS upload failed: HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.onabort = () => reject(new Error('Upload bị huỷ'))
        xhr.send(file)
      })

      // 3. Done
      xhrRef.current = null
      setUploading(false)
      setDone(true)
      onComplete({
        url: data.publicUrl,
        fileSize: file.size,
        contentType: data.contentType,
        filename: file.name,
      })
      toast.success(`Upload ${file.name} thành công`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        || (e as { message?: string })?.message
        || 'Upload thất bại'
      setError(msg)
      setUploading(false)
      xhrRef.current = null
    }
  }

  // ─── UI states ───────────────────────────────────────────────────
  // 1. Đã upload xong → success card
  if (done && file) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-emerald-200 truncate">{file.name}</div>
            <div className="text-[11px] text-zinc-400">
              {formatBytes(file.size)} · Đã upload lên GCS
            </div>
          </div>
          <button
            onClick={resetAll}
            type="button"
            className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded inline-flex items-center gap-1"
          >
            <RotateCw className="w-3 h-3" /> Upload khác
          </button>
        </div>
      </div>
    )
  }

  // 2. Đang upload → progress bar
  if (uploading && file) {
    return (
      <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-3">
        <div className="flex items-center gap-3 mb-2">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-purple-200 truncate">{file.name}</div>
            <div className="text-[11px] text-zinc-400">
              {formatBytes(file.size)} · Đang upload {progress}%
            </div>
          </div>
          <button
            onClick={cancelUpload}
            type="button"
            className="text-xs text-rose-300 hover:text-rose-200 px-2 py-1 rounded inline-flex items-center gap-1 border border-rose-500/30"
          >
            <X className="w-3 h-3" /> Huỷ
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  // 3. Đã pick file nhưng chưa upload → show file info + nút Upload/Bỏ
  if (file) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
        <div className="flex items-center gap-3">
          <MediaIcon className="w-5 h-5 text-purple-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{file.name}</div>
            <div className="text-[11px] text-zinc-400">
              {formatBytes(file.size)} · {file.type || 'unknown'}
            </div>
          </div>
          <button
            onClick={() => { setFile(null); setError(null) }}
            type="button"
            className="text-xs text-zinc-400 hover:text-zinc-200 p-1 rounded"
            title="Bỏ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && (
          <div className="mt-2 text-xs text-rose-300 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <button
          onClick={startUpload}
          type="button"
          className="w-full mt-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" /> Bắt đầu upload lên GCS
        </button>
      </div>
    )
  }

  // 4. Empty state → dropzone button
  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept={acceptAttr}
        onChange={onFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={pickFile}
        className="w-full p-5 rounded-xl border border-dashed border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 text-purple-200 transition-colors flex flex-col items-center gap-2"
      >
        <Upload className="w-7 h-7" />
        <div className="font-bold text-sm">Chọn file {label} để upload</div>
        <div className="text-[11px] text-purple-300/70">
          {getFormatHint(mediaType)} · Tối đa {effectiveMaxMB} MB
        </div>
        <div className="text-[10px] text-zinc-500">
          Upload trực tiếp lên GCS bucket — không qua Cloud Run
        </div>
      </button>
      {error && (
        <div className="mt-2 text-xs text-rose-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
