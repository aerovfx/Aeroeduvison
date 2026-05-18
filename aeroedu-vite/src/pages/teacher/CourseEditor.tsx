/**
 * CourseEditor — Trình soạn khoá học (Create + Edit, 4 bước)
 *
 * Workflow cloned từ elearniv LMS:
 *   Bước 1 · Cơ bản   → title, category, price, duration, cover image
 *   Bước 2 · Nội dung → overview, requirements, learn goals, target audience
 *   Bước 3 · Video    → upload nhóm video (group, title, thumbnail, is_preview)
 *   Bước 4 · Tài liệu → upload file đính kèm (PDF, DOCX, ZIP…)
 *
 * Route:
 *   /teacher/course/create       → courseId = undefined → tạo mới
 *   /teacher/course/:courseId/edit → courseId có → chỉnh sửa
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Image as ImageIcon, DollarSign, Clock,
  Tag, ChevronRight, ChevronLeft, Check,
  Play, Upload, FileText, Plus, Trash2, GripVertical,
  Link as LinkIcon, Eye, EyeOff, ToggleLeft, ToggleRight,
  Download, File, Save, Rocket, ArrowLeft, X,
} from 'lucide-react'
import { instructorService, type CreateCoursePayload } from '@/services/instructor.service'
import { RichTextEditor } from '@/components/teacher/RichTextEditor'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import type { CourseVideo, CourseAsset } from '@/types'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

const ACCESS_OPTS = ['Trọn đời', '1 tháng', '3 tháng', '6 tháng', '1 năm']
const STEPS = ['Cơ bản', 'Nội dung', 'Video', 'Tài liệu'] as const
type Step = 0 | 1 | 2 | 3

interface BasicForm {
  title: string
  categoryId: string
  lessons: number
  duration: string
  regularPrice: number
  beforePrice: number
  accessTime: string
}

interface ContentForm {
  overview: string
  requirements: string
  whatYouWillLearn: string
  whoIsThisCourseFor: string
}

// ─────────────────────────────────────────────────────────────
// Step indicator (chuẩn elearniv PageNavigation)
// ─────────────────────────────────────────────────────────────
function StepNav({ current, courseId, onJump }: {
  current: Step
  courseId?: string
  onJump: (step: Step) => void
}) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        const disabled = !courseId && i > 0
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={disabled}
              onClick={() => { if (!disabled) onJump(i as Step) }}
              className={cn(
                'flex flex-col items-center gap-1 group',
                disabled && 'cursor-not-allowed opacity-40'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                  done
                    ? 'bg-green-500 border-green-500 text-white'
                    : active
                    ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-transparent border-white/20 text-gray-500'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  active ? 'text-purple-300' : done ? 'text-green-400' : 'text-gray-500'
                )}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 rounded-full transition-colors',
                  i < current ? 'bg-green-500' : 'bg-white/10'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Step 1 — Thông tin cơ bản
// ─────────────────────────────────────────────────────────────
function BasicInfoStep({
  onNext,
  defaultValues,
  coverImage,
  onCoverChange,
  isLoading,
}: {
  onNext: (data: BasicForm) => void
  defaultValues?: Partial<BasicForm>
  coverImage: { preview: string | null; url: string }
  onCoverChange: (preview: string, url: string) => void
  isLoading: boolean
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: instructorService.getCategories,
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicForm>({ defaultValues })

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Chỉ chấp nhận ảnh'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      setUploading(true)
      instructorService.uploadImage(file)
        .then(({ url }) => { onCoverChange(preview, url) })
        .catch(() => toast.error('Upload ảnh thất bại'))
        .finally(() => setUploading(false))
    }
    reader.readAsDataURL(file)
  }

  const inp = (err?: any) => cn(
    'w-full rounded-lg bg-white/5 border px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors',
    err ? 'border-red-500' : 'border-white/10 focus:border-purple-500'
  )

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Tiêu đề khoá học <span className="text-red-400">*</span></label>
          <input
            {...register('title', { required: 'Bắt buộc' })}
            placeholder="VD: Vật lý cơ học dành cho học sinh lớp 10"
            className={inp(errors.title)}
          />
          {errors.title && <p className="err">{errors.title.message}</p>}
        </div>

        <div>
          <label className="label">Danh mục <span className="text-red-400">*</span></label>
          <select
            {...register('categoryId', { required: 'Bắt buộc' })}
            className={inp(errors.categoryId)}
          >
            <option value="">— Chọn danh mục —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.categoryId && <p className="err">{errors.categoryId.message}</p>}
        </div>

        <div>
          <label className="label">Thời hạn truy cập</label>
          <select {...register('accessTime')} className={inp()}>
            {ACCESS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Số bài học</label>
          <input type="number" min={1} {...register('lessons')} className={inp()} />
        </div>

        <div>
          <label className="label">Tổng thời lượng</label>
          <input {...register('duration')} placeholder="VD: 12 giờ 30 phút" className={inp()} />
        </div>

        <div>
          <label className="label">Giá bán (₫)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="number" min={0} {...register('regularPrice')} placeholder="0 = Miễn phí" className={cn(inp(), 'pl-9')} />
          </div>
        </div>

        <div>
          <label className="label">Giá gốc (₫) — để hiện giảm giá</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="number" min={0} {...register('beforePrice')} placeholder="Để trống nếu không có" className={cn(inp(), 'pl-9')} />
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div>
        <label className="label">Ảnh bìa khoá học (750×500px)</label>
        <div
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f) }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'relative rounded-xl border-2 border-dashed transition-colors overflow-hidden',
            coverImage.preview
              ? 'border-purple-500/40 h-52'
              : 'border-white/20 hover:border-purple-500/40 h-36'
          )}
        >
          {coverImage.preview ? (
            <>
              <img src={coverImage.preview} alt="" className="w-full h-full object-cover" />
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onCoverChange('', '')}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-500/80 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center h-full gap-2 cursor-pointer">
              <ImageIcon className="w-8 h-8 text-gray-500" />
              <span className="text-sm text-gray-400">Kéo thả hoặc click để chọn ảnh</span>
              <span className="text-xs text-gray-600">PNG, JPG — tối đa 5MB</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading || uploading}
          className="flex items-center gap-2 px-7 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
        >
          {isLoading ? <Spin /> : null}
          {isLoading ? 'Đang lưu...' : 'Tiếp theo →'}
        </button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────
// Step 2 — Nội dung khoá học
// ─────────────────────────────────────────────────────────────
function ContentStep({
  onNext,
  onBack,
  defaultValues,
  isLoading,
}: {
  onNext: (data: ContentForm) => void
  onBack: () => void
  defaultValues?: Partial<ContentForm>
  isLoading: boolean
}) {
  const { control, handleSubmit } = useForm<ContentForm>({ defaultValues })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {[
        { name: 'overview', label: 'Mô tả khoá học', placeholder: 'Tóm tắt khoá học, điểm nổi bật...' },
        { name: 'whatYouWillLearn', label: 'Học viên sẽ đạt được gì?', placeholder: 'Liệt kê kỹ năng, kiến thức sau khi hoàn thành...' },
        { name: 'requirements', label: 'Yêu cầu đầu vào', placeholder: 'Kiến thức, thiết bị, phần mềm cần có trước khi học...' },
        { name: 'whoIsThisCourseFor', label: 'Khoá học dành cho ai?', placeholder: 'Học sinh lớp 10-12, người muốn ôn thi...' },
      ].map(({ name, label, placeholder }) => (
        <div key={name}>
          <label className="label">{label}</label>
          <Controller
            name={name as keyof ContentForm}
            control={control}
            defaultValue=""
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                placeholder={placeholder}
              />
            )}
          />
        </div>
      ))}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-7 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
        >
          {isLoading ? <Spin /> : null}
          {isLoading ? 'Đang lưu...' : 'Tiếp theo →'}
        </button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────
// Step 3 — Quản lý video
// ─────────────────────────────────────────────────────────────
function VideoStep({ courseId, onNext, onBack }: { courseId: string; onNext: () => void; onBack: () => void }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  // Tab: paste URL hoặc upload file lên GCS bucket
  const [mode, setMode] = useState<'url' | 'file'>('url')

  const [groupName, setGroupName] = useState('')
  const [title, setTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbUrl, setThumbUrl] = useState('')
  const [thumbPreview, setThumbPreview] = useState('')
  const [serialId, setSerialId] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [thumbUploading, setThumbUploading] = useState(false)

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedGcsPath, setUploadedGcsPath] = useState<string>('')

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['instructor-videos', courseId],
    queryFn: () => instructorService.getVideos(courseId),
  })

  const add = useMutation({
    mutationFn: () =>
      instructorService.uploadVideo(courseId, {
        title: title.trim(),
        url: videoUrl.trim(),
        position: videos.length + 1,
        thumbUrl: thumbUrl || undefined,
        isPreview,
        groupName: groupName.trim() || undefined,
        gcsPath: uploadedGcsPath || undefined,   // chỉ có khi upload file
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-videos', courseId] })
      toast.success(mode === 'file' ? 'Đã upload + thêm video!' : 'Đã thêm video!')
      resetForm()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lỗi, thử lại nhé.')
    },
  })

  const del = useMutation({
    mutationFn: (id: string) => instructorService.deleteVideo(courseId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instructor-videos', courseId] }),
  })

  const resetForm = () => {
    setGroupName(''); setTitle(''); setVideoUrl('')
    setThumbUrl(''); setThumbPreview(''); setSerialId(''); setIsPreview(false)
    setUploadFile(null); setUploadProgress(0); setUploadedGcsPath('')
    setShowForm(false)
  }

  // Upload file → GCS qua signed URL → AUTO-SAVE metadata vào DB.
  //
  // UX FIX (2026-05-18): Trước đây sau khi upload, user phải bấm tiếp
  // "Thêm bài học" để lưu vào DB. Nhiều user upload xong tưởng đã xong
  // → đóng tab → file mồ côi trên GCS (đã thấy 3 file orphan trong bucket
  // user 223321a8). Giờ auto-save sau upload, user chỉ cần PICK FILE.
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Chỉ chấp nhận file video (mp4, webm, mov)')
      return
    }
    const sizeMB = file.size / 1024 / 1024
    if (sizeMB > 500) {
      toast.error(`File quá lớn (${sizeMB.toFixed(0)}MB). Tối đa 500MB.`)
      return
    }
    setUploadFile(file)
    setUploadingFile(true)
    setUploadProgress(0)
    try {
      const { publicUrl, gcsPath } = await instructorService.uploadVideoFile(
        courseId, file, (pct) => setUploadProgress(pct),
      )
      setVideoUrl(publicUrl)
      setUploadedGcsPath(gcsPath)
      // Auto-fill title từ filename nếu chưa nhập
      const finalTitle = title.trim() || file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
      if (!title.trim()) setTitle(finalTitle)
      toast.success(`📤 Upload xong (${sizeMB.toFixed(1)}MB) — đang lưu...`, { duration: 2000 })

      // AUTO-SAVE: thay vì bắt user bấm thêm 1 nút, gọi luôn API tạo
      // CourseVideo trong DB. Body dùng state hiện tại + finalTitle.
      try {
        await instructorService.uploadVideo(courseId, {
          title:     finalTitle,
          url:       publicUrl,
          position:  videos.length + 1,
          thumbUrl:  thumbUrl || undefined,
          isPreview,
          groupName: groupName.trim() || undefined,
          gcsPath,
        })
        qc.invalidateQueries({ queryKey: ['instructor-videos', courseId] })
        toast.success('✅ Đã thêm video vào khoá học!')
        resetForm()
      } catch (saveErr: unknown) {
        const e = saveErr as { response?: { data?: { error?: string } }; message?: string }
        toast.error(`Upload OK nhưng lưu DB thất bại: ${e.response?.data?.error || e.message}. File ở GCS, bạn có thể edit + bấm "Thêm bài học" thủ công.`)
        // Không reset form → user vẫn thấy form đã fill, click thủ công được
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string }
      toast.error(e.response?.data?.error || e.message || 'Upload thất bại')
      setUploadFile(null)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleThumbFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setThumbPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setThumbUploading(true)
    try {
      const { url } = await instructorService.uploadImage(file)
      setThumbUrl(url)
    } catch {
      toast.error('Upload thumbnail thất bại')
    } finally {
      setThumbUploading(false)
    }
  }

  const isYT = (u: string) => u.includes('youtube') || u.includes('youtu.be')
  const isVimeo = (u: string) => u.includes('vimeo')

  // Group videos by group_name (displayed as section headers)
  const grouped = videos.reduce<Record<string, typeof videos>>((acc, v) => {
    const g = (v as any).groupName || 'Chưa phân nhóm'
    ;(acc[g] ??= []).push(v)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {/* Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Danh sách video ({videos.length})</h3>
          <p className="text-xs text-gray-500 mt-0.5">Hỗ trợ YouTube, Vimeo, và URL video trực tiếp</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm video
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="rounded-xl bg-purple-900/20 border border-purple-500/30 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-purple-300">Thêm bài học mới</h4>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nhóm bài học</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="VD: Chương 1 — Động lực học"
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="label">Số thứ tự</label>
              <input
                type="number"
                value={serialId}
                onChange={(e) => setSerialId(e.target.value)}
                placeholder="1, 2, 3…"
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Tiêu đề bài học <span className="text-red-400">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Bài 1 — Giới thiệu định luật Newton"
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            </div>

            {/* ── Tab nav: URL paste vs File upload ── */}
            <div className="sm:col-span-2">
              <div className="flex gap-1 mb-3 border-b border-white/10">
                {([
                  { key: 'url'  as const, label: 'Dán URL',     icon: LinkIcon },
                  { key: 'file' as const, label: 'Upload file', icon: Upload   },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setMode(key); setVideoUrl(''); setUploadFile(null); setUploadedGcsPath('') }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px',
                      mode === key
                        ? 'border-purple-500 text-purple-300'
                        : 'border-transparent text-white/50 hover:text-white/80'
                    )}
                  >
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>

              {mode === 'url' ? (
                <>
                  <label className="label">URL video (YouTube / Vimeo / MP4 trực tiếp) <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... hoặc https://cdn.example.com/video.mp4"
                      className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                    />
                  </div>
                  {videoUrl && (
                    <p className={cn('text-xs mt-1', isYT(videoUrl) ? 'text-green-400' : isVimeo(videoUrl) ? 'text-blue-400' : 'text-gray-400')}>
                      {isYT(videoUrl) ? '✓ YouTube' : isVimeo(videoUrl) ? '✓ Vimeo' : '✓ URL trực tiếp (MP4/WebM)'}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">
                    💡 YouTube/Vimeo: nhúng player tự động. MP4: phát native HTML5.
                  </p>
                </>
              ) : (
                <>
                  <label className="label">Chọn file video từ máy <span className="text-red-400">*</span></label>
                  {!uploadFile ? (
                    <label className={cn(
                      'flex flex-col items-center justify-center gap-2 h-32',
                      'rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/40',
                      'cursor-pointer transition-colors'
                    )}>
                      <Upload className="w-7 h-7 text-gray-500" />
                      <span className="text-sm text-gray-400">Click để chọn hoặc kéo file vào đây</span>
                      <span className="text-xs text-gray-600">MP4 / WebM / MOV — tối đa 500MB</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                      />
                    </label>
                  ) : (
                    <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Play className="w-8 h-8 text-purple-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{uploadFile.name}</p>
                          <p className="text-xs text-gray-400">
                            {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                            {uploadedGcsPath && ' • ✅ Đã upload lên GCS'}
                          </p>
                        </div>
                        {!uploadingFile && (
                          <button
                            type="button"
                            onClick={() => { setUploadFile(null); setVideoUrl(''); setUploadedGcsPath(''); setUploadProgress(0) }}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {uploadingFile && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-purple-300 mb-1">
                            <span>Đang upload tới Google Cloud Storage...</span>
                            <span className="font-mono">{uploadProgress}%</span>
                          </div>
                          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {uploadedGcsPath && !uploadingFile && (
                        <a
                          href={videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 truncate block"
                        >
                          🔗 {videoUrl}
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    💡 File upload trực tiếp từ trình duyệt → GCS bucket asia-southeast1, không qua server (nhanh + tiết kiệm bandwidth).
                  </p>
                </>
              )}
            </div>

            {/* Thumbnail */}
            <div>
              <label className="label">Thumbnail bài học (tuỳ chọn)</label>
              <div
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleThumbFile(f) }}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  'relative rounded-lg border-2 border-dashed overflow-hidden transition-colors',
                  thumbPreview ? 'border-purple-500/40 h-28' : 'border-white/20 hover:border-purple-500/40 h-20'
                )}
              >
                {thumbPreview ? (
                  <>
                    <img src={thumbPreview} alt="" className="w-full h-full object-cover" />
                    {thumbUploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Spin />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setThumbPreview(''); setThumbUrl('') }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </>
                ) : (
                  <label className="flex items-center justify-center h-full gap-2 cursor-pointer">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                    <span className="text-xs text-gray-500">Chọn thumbnail</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbFile(f) }} />
                  </label>
                )}
              </div>
            </div>

            {/* Is preview */}
            <div className="flex items-center gap-3 self-end pb-2">
              <button
                type="button"
                onClick={() => setIsPreview((v) => !v)}
                className="flex items-center gap-2 text-sm text-gray-300"
              >
                {isPreview ? (
                  <ToggleRight className="w-8 h-8 text-green-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-600" />
                )}
                <span className={isPreview ? 'text-green-400' : 'text-gray-500'}>
                  {isPreview ? 'Bài xem thử (miễn phí)' : 'Yêu cầu đăng ký'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 text-sm hover:border-white/40 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={
                !title.trim() ||
                !videoUrl.trim() ||
                add.isPending ||
                thumbUploading ||
                uploadingFile
              }
              onClick={() => add.mutate()}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {add.isPending && <Spin />}
              {uploadingFile ? 'Đang upload...' : 'Thêm bài học'}
            </button>
          </div>
        </div>
      )}

      {/* Video list grouped */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-dashed border-white/10 p-10 flex flex-col items-center gap-3 text-center">
          <Play className="w-10 h-10 text-gray-600" />
          <p className="text-gray-400 text-sm">Chưa có bài học nào. Thêm video đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, gVideos]) => (
            <div key={group}>
              {group !== 'Chưa phân nhóm' && (
                <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 pl-2">
                  {group}
                </p>
              )}
              <div className="space-y-1.5">
                {gVideos.map((v, idx) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 p-3 transition-colors group"
                  >
                    <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />

                    {/* Thumbnail or play icon */}
                    <div className="w-12 h-9 rounded overflow-hidden bg-gray-800 flex-shrink-0 flex items-center justify-center">
                      {(v as any).thumbUrl ? (
                        <img src={(v as any).thumbUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-4 h-4 text-gray-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{v.title}</p>
                      <p className="text-xs text-gray-500 truncate">{v.videoUrl}</p>
                    </div>

                    {(v as any).isPreview && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex-shrink-0">
                        <Eye className="w-3 h-3" /> Xem thử
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (window.confirm(`Xoá bài "${v.title}"?`)) del.mutate(v.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-7 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
        >
          Tiếp theo → <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Step 4 — Tài liệu đính kèm
// ─────────────────────────────────────────────────────────────
function AssetStep({ courseId, onBack, onFinish }: { courseId: string; onBack: () => void; onFinish: () => void }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [assetTitle, setAssetTitle] = useState('')

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['instructor-assets', courseId],
    queryFn: () => instructorService.getAssets(courseId),
  })

  const del = useMutation({
    mutationFn: (id: string) => instructorService.deleteAsset(courseId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instructor-assets', courseId] }),
  })

  const fmtSize = (b?: number) => {
    if (!b) return ''
    if (b < 1024) return `${b}B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)}KB`
    return `${(b / 1048576).toFixed(1)}MB`
  }

  const fileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />
    if (type.includes('video')) return <Play className="w-5 h-5 text-purple-400" />
    return <File className="w-5 h-5 text-blue-400" />
  }

  const handleUpload = async () => {
    if (!pendingFile || !assetTitle.trim()) return
    setUploading(true)
    try {
      await instructorService.uploadAsset(courseId, pendingFile, assetTitle.trim())
      qc.invalidateQueries({ queryKey: ['instructor-assets', courseId] })
      toast.success('Upload thành công!')
      setPendingFile(null)
      setAssetTitle('')
    } catch {
      toast.error('Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setPendingFile(f); setAssetTitle(f.name.replace(/\.[^.]+$/, '')) } }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !pendingFile && fileRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/40 p-7 flex flex-col items-center gap-3 cursor-pointer transition-colors"
      >
        <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center">
          <Upload className="w-7 h-7 text-purple-400" />
        </div>
        {pendingFile ? (
          <p className="text-sm text-green-400 font-medium">✓ {pendingFile.name} ({fmtSize(pendingFile.size)})</p>
        ) : (
          <>
            <p className="text-sm text-gray-300">Kéo thả tài liệu vào đây hoặc click để chọn</p>
            <p className="text-xs text-gray-500">PDF, DOCX, XLSX, ZIP, MP4… tối đa 50MB</p>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); setAssetTitle(f.name.replace(/\.[^.]+$/, '')) } }} />

      {pendingFile && (
        <div className="space-y-3">
          <div>
            <label className="label">Tên tài liệu <span className="text-red-400">*</span></label>
            <input
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              placeholder="VD: Tài liệu bài giảng chương 1"
              className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-purple-500 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setPendingFile(null); setAssetTitle('') }}
              className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 text-sm hover:border-white/40 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={!assetTitle.trim() || uploading}
              onClick={handleUpload}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {uploading && <Spin />}
              {uploading ? 'Đang upload...' : 'Upload tài liệu'}
            </button>
          </div>
        </div>
      )}

      {/* Asset list */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : assets.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-dashed border-white/10 p-8 flex flex-col items-center gap-2 text-center">
          <FileText className="w-10 h-10 text-gray-600" />
          <p className="text-gray-400 text-sm">Chưa có tài liệu. Upload file để học viên tải xuống.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 p-3 group transition-colors">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">{fileIcon(a.fileType)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{a.title}</p>
                <p className="text-xs text-gray-500">{a.fileType.toUpperCase()}{a.fileSize ? ` · ${fmtSize(a.fileSize)}` : ''}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={a.fileUrl} target="_blank" rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => { if (window.confirm(`Xoá "${a.title}"?`)) del.mutate(a.id) }}
                  className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="flex items-center gap-2 px-7 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
        >
          <Rocket className="w-4 h-4" /> Hoàn thành
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────
function Spin() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

// ─────────────────────────────────────────────────────────────
// Main CourseEditor
// ─────────────────────────────────────────────────────────────
export default function CourseEditor() {
  const { courseId } = useParams<{ courseId?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEditMode = !!courseId

  const [searchParams, setSearchParams] = useSearchParams()
  const [step, setStep] = useState<Step>(() => {
    const s = parseInt(searchParams.get('step') || '0') as Step
    return (s >= 0 && s <= 3) ? s : 0
  })

  const [coverImage, setCoverImage] = useState({ preview: '', url: '' })
  const [basicData, setBasicData] = useState<BasicForm | null>(null)
  const [contentData, setContentData] = useState<ContentForm | null>(null)

  // Sync step → URL (replace for clean history)
  useEffect(() => {
    setSearchParams({ step: String(step) }, { replace: true })
  }, [step, setSearchParams])

  // Load existing course in edit mode
  const { data: course } = useQuery({
    queryKey: ['instructor-course', courseId],
    queryFn: () => instructorService.getCourse(courseId!),
    enabled: isEditMode,
  })

  useEffect(() => {
    if (course) {
      setBasicData({
        title: course.title,
        categoryId: course.categoryId || '',
        lessons: course.lessons,
        duration: course.duration || '',
        regularPrice: course.regularPrice,
        beforePrice: course.beforePrice,
        accessTime: course.accessTime || 'Trọn đời',
      })
      setContentData({
        overview: course.overview || '',
        requirements: course.requirements || '',
        whatYouWillLearn: course.whatYouWillLearn || '',
        whoIsThisCourseFor: course.whoIsThisCourseFor || '',
      })
      if (course.image) setCoverImage({ preview: course.image, url: course.image })
    }
  }, [course])

  const [saving, setSaving] = useState(false)

  const saveBasic = async (data: BasicForm) => {
    setSaving(true)
    try {
      const payload: CreateCoursePayload = {
        ...data,
        image: coverImage.url,
        overview: contentData?.overview || '',
        requirements: contentData?.requirements || '',
        whatYouWillLearn: contentData?.whatYouWillLearn || '',
        whoIsThisCourseFor: contentData?.whoIsThisCourseFor || '',
      }
      if (isEditMode) {
        await instructorService.updateCourse(courseId!, payload)
        qc.invalidateQueries({ queryKey: ['instructor-course', courseId] })
        toast.success('Đã lưu thông tin cơ bản')
      } else {
        const created = await instructorService.createCourse(payload)
        toast.success('Khoá học đã được tạo!')
        navigate(`/teacher/course/${created.id}/edit?step=1`, { replace: true })
        return
      }
      setBasicData(data)
      setStep(1)
    } catch {
      toast.error('Lỗi lưu, thử lại nhé.')
    } finally {
      setSaving(false)
    }
  }

  const saveContent = async (data: ContentForm) => {
    setSaving(true)
    try {
      if (isEditMode) {
        await instructorService.updateCourse(courseId!, { ...data })
        qc.invalidateQueries({ queryKey: ['instructor-course', courseId] })
        toast.success('Đã lưu nội dung khoá học')
      }
      setContentData(data)
      setStep(2)
    } catch {
      toast.error('Lỗi lưu, thử lại nhé.')
    } finally {
      setSaving(false)
    }
  }

  const handleFinish = () => {
    toast.success('Khoá học đã sẵn sàng! 🎉')
    navigate('/teacher/my-courses')
  }

  const stepTitle = ['Thông tin cơ bản', 'Nội dung khoá học', 'Bài học & Video', 'Tài liệu đính kèm'][step]

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      {/* Top nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/teacher/my-courses"
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Khoá học của tôi
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-gray-300 text-sm font-medium">
          {isEditMode
            ? (course?.title ? course.title.slice(0, 40) + (course.title.length > 40 ? '…' : '') : 'Chỉnh sửa')
            : 'Tạo khoá học mới'
          }
        </span>
      </div>

      {/* Publish toggle (edit mode only) */}
      {isEditMode && course && (
        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-6">
          <div>
            <p className="text-sm font-medium text-white">Trạng thái khoá học</p>
            <p className="text-xs text-gray-400">
              {course.isPublished ? '✅ Đang hiển thị cho học viên' : '🔒 Nháp — chưa công bố'}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await instructorService.togglePublish(courseId!, !course.isPublished)
              qc.invalidateQueries({ queryKey: ['instructor-course', courseId] })
              qc.invalidateQueries({ queryKey: ['instructor-courses'] })
              toast.success(course.isPublished ? 'Đã ẩn khoá học' : 'Đã đăng khoá học!')
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              course.isPublished
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30'
            )}
          >
            {course.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {course.isPublished ? 'Ẩn khoá học' : 'Đăng khoá học'}
          </button>
        </div>
      )}

      {/* Slug + preview link (chỉ hiện sau khi đã save Bước 1) */}
      {isEditMode && course && (course.slug || course.id) && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20">
          <LinkIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-xs text-gray-400">URL công khai:</span>
          <code className="text-xs text-purple-300 font-mono truncate flex-1">
            /courses/{course.slug || course.id}
          </code>
          <a
            href={`/courses/${course.slug || course.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-purple-300 hover:bg-purple-500/10 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Xem trước
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/courses/${course.slug || course.id}`)
              toast.success('Đã copy link')
            }}
            className="text-xs text-gray-400 hover:text-purple-300 px-2 py-1"
            title="Copy link"
          >
            📋
          </button>
        </div>
      )}

      {/* Step indicator */}
      <StepNav current={step} courseId={courseId} onJump={setStep} />

      {/* Step content */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
        <h2 className="text-lg font-bold text-white mb-5">{stepTitle}</h2>

        {step === 0 && (
          <BasicInfoStep
            onNext={saveBasic}
            defaultValues={basicData || undefined}
            coverImage={coverImage}
            onCoverChange={(p, u) => setCoverImage({ preview: p, url: u })}
            isLoading={saving}
          />
        )}

        {step === 1 && (
          <ContentStep
            onNext={saveContent}
            onBack={() => setStep(0)}
            defaultValues={contentData || undefined}
            isLoading={saving}
          />
        )}

        {step === 2 && courseId && (
          <VideoStep
            courseId={courseId}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && courseId && (
          <AssetStep
            courseId={courseId}
            onBack={() => setStep(2)}
            onFinish={handleFinish}
          />
        )}

        {/* Step 2/3 — no courseId yet */}
        {(step === 2 || step === 3) && !courseId && (
          <div className="text-center py-10 text-gray-400">
            <p>Vui lòng hoàn thành bước 1 để lưu khoá học trước.</p>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
            >
              ← Quay lại bước 1
            </button>
          </div>
        )}
      </div>

      {/* Bottom: Quick links to other steps (edit mode) */}
      {isEditMode && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">Chuyển nhanh:</span>
          {STEPS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i as Step)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-colors',
                step === i
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              )}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
