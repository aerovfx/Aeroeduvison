/**
 * Teacher: Course Videos — upload & manage video list
 * Supports YouTube/Vimeo URLs AND direct GCS upload (MP4/WebM/MOV)
 */
import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  Plus,
  Trash2,
  GripVertical,
  Link as LinkIcon,
  Upload as CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
} from 'lucide-react'
import { instructorService } from '@/services/instructor.service'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { CourseManagementNav } from '@/components/teacher/CourseManagementNav'
import { useGcsUpload } from '@/hooks/useGcsUpload'

// ── Video Upload Form ──────────────────────────────────────────────────────────

type InputMode = 'url' | 'gcs'

interface VideoFormProps {
  courseId: string
  videosCount: number
  onAdded: () => void
  onCancel: () => void
}

function VideoForm({ courseId, videosCount, onAdded, onCancel }: VideoFormProps) {
  const [mode, setMode] = useState<InputMode>('url')
  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [gcsUrl, setGcsUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const gcs = useGcsUpload({
    folder: `courses/${courseId}/videos`,
    onComplete: (url) => setGcsUrl(url),
    onError: (e) => toast.error(e),
  })

  const add = useMutation({
    mutationFn: () => {
      const url = mode === 'gcs' ? gcsUrl : videoUrl
      return instructorService.uploadVideo(courseId, {
        title,
        videoUrl: url,
        position: videosCount + 1,
      })
    },
    onSuccess: () => {
      toast.success('Video đã được thêm!')
      onAdded()
    },
    onError: () => toast.error('Có lỗi xảy ra'),
  })

  const isYoutube = (url: string) => url.includes('youtube') || url.includes('youtu.be')

  const canSubmit =
    title.trim() &&
    (mode === 'url' ? videoUrl.trim() : gcsUrl) &&
    !add.isPending &&
    !gcs.uploading

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ hỗ trợ MP4, WebM, MOV, AVI')
      return
    }
    gcs.upload(file)
  }

  return (
    <div className="rounded-xl bg-white/5 border border-purple-500/30 p-5 space-y-4">
      <h3 className="font-semibold text-white text-sm">Thêm video mới</h3>

      {/* Title */}
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Tiêu đề bài học *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Bài 1 - Giới thiệu định luật Newton"
          className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
        />
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-lg bg-white/5 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all',
            mode === 'url'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          )}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          URL (YouTube / Vimeo)
        </button>
        <button
          type="button"
          onClick={() => setMode('gcs')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all',
            mode === 'gcs'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          )}
        >
          <CloudUpload className="w-3.5 h-3.5" />
          Upload lên Cloud
        </button>
      </div>

      {/* URL input */}
      {mode === 'url' && (
        <div>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 pl-9 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>
          {videoUrl && isYoutube(videoUrl) && (
            <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> YouTube URL được nhận dạng
            </p>
          )}
        </div>
      )}

      {/* GCS upload */}
      {mode === 'gcs' && (
        <div className="space-y-3">
          {!gcs.uploading && !gcsUrl && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-white/20 hover:border-purple-500/50 rounded-xl p-6 text-center transition-colors group"
            >
              <Film className="w-8 h-8 text-gray-500 group-hover:text-purple-400 mx-auto mb-2 transition-colors" />
              <p className="text-sm text-gray-400 group-hover:text-gray-300">
                Nhấn để chọn file video
              </p>
              <p className="text-xs text-gray-600 mt-1">MP4, WebM, MOV, AVI — tối đa 4GB</p>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                className="hidden"
                onChange={handleFileChange}
              />
            </button>
          )}

          {/* Progress bar */}
          {gcs.uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  Đang upload lên Google Cloud Storage...
                </span>
                <span className="font-mono text-purple-400">{gcs.progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-300"
                  style={{ width: `${gcs.progress}%` }}
                />
              </div>
              <button
                type="button"
                onClick={gcs.cancel}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Huỷ upload
              </button>
            </div>
          )}

          {/* Upload complete */}
          {gcsUrl && !gcs.uploading && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
              <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Upload thành công!
              </div>
              <p className="text-xs text-gray-500 truncate">{gcsUrl}</p>
              <button
                type="button"
                onClick={() => { setGcsUrl(''); gcs.cancel() }}
                className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Chọn file khác
              </button>
            </div>
          )}

          {gcs.error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {gcs.error}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => add.mutate()}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {add.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Thêm video
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CourseVideos() {
  const { courseId } = useParams<{ courseId: string }>()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['instructor-videos', courseId],
    queryFn: () => instructorService.getVideos(courseId!),
    enabled: !!courseId,
  })

  const del = useMutation({
    mutationFn: (videoId: string) => instructorService.deleteVideo(courseId!, videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-videos', courseId] })
      toast.success('Đã xoá video')
    },
  })

  const handleAdded = () => {
    qc.invalidateQueries({ queryKey: ['instructor-videos', courseId] })
    setShowForm(false)
  }

  const confirmDelete = (id: string, name: string) => {
    if (window.confirm(`Xoá video "${name}"?`)) del.mutate(id)
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <CourseManagementNav courseId={courseId!} />

      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Quản lý video</h1>
          <p className="text-gray-400 text-sm">{videos.length} video</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm video
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <VideoForm
          courseId={courseId!}
          videosCount={videos.length}
          onAdded={handleAdded}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Video list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-400">Chưa có video nào. Thêm video đầu tiên!</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm video
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video, idx) => (
            <div
              key={video.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 p-3 transition-colors group"
            >
              <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0 cursor-grab" />
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300 text-xs font-bold">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{video.title}</p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                  {video.videoUrl?.includes('storage.googleapis.com') && (
                    <span className="text-blue-400 font-medium">☁ GCS</span>
                  )}
                  {video.videoUrl}
                </p>
              </div>
              {video.duration && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                </span>
              )}
              <button
                onClick={() => confirmDelete(video.id, video.title)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300 space-y-2">
        <p className="font-semibold">💡 Về lưu trữ video</p>
        <ul className="text-xs text-blue-400 space-y-1 list-disc list-inside">
          <li>
            <span className="text-blue-300 font-medium">Upload lên Cloud</span>: file được lưu vào
            Google Cloud Storage (GCS) — nhanh, ổn định, hỗ trợ đến 4GB
          </li>
          <li>YouTube / Vimeo: dùng link dạng youtube.com/watch?v=ID</li>
          <li>Video GCS được phát trực tiếp, không cần qua YouTube</li>
          <li>Kéo thả để sắp xếp thứ tự bài học</li>
        </ul>
      </div>
    </div>
  )
}
