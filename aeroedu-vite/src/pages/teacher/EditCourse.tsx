/**
 * Teacher: Edit Course
 * Ported from elearniv: /instructor/course/[courseId]/edit (CourseUpdateForm.jsx)
 */
/**
 * EditCourse — Chỉnh sửa khoá học cho GV.
 * Nạp thông tin khoá hiện có theo :courseId, cho phép update tiêu đề, danh mục,
 * giá, ảnh bìa (upload mới) và các trường nội dung rich text (Tiptap), lưu qua API.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  Save,
  Upload,
  FileText,
  ImageIcon,
  X,
  DollarSign,
} from 'lucide-react'
import { instructorService } from '@/services/instructor.service'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import TiptapEditor from '@/components/editor/TiptapEditor'

const ACCESS_TIME_OPTIONS = ['Trọn đời', '1 tháng', '3 tháng', '6 tháng', '1 năm']

interface FormValues {
  title: string
  categoryId: string
  lessons: number
  duration: string
  regularPrice: number
  beforePrice: number
  accessTime: string
}

// Component chính: form chỉnh sửa khoá + xử lý lưu cập nhật
export default function EditCourse() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Rich text fields
  const [overview, setOverview] = useState('')
  const [whatYouWillLearn, setWhatYouWillLearn] = useState('')
  const [requirements, setRequirements] = useState('')
  const [whoIsThisCourseFor, setWhoIsThisCourseFor] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: instructorService.getCategories,
  })

  const { data: course, isLoading } = useQuery({
    queryKey: ['instructor-course', courseId],
    queryFn: () => instructorService.getCourse(courseId!),
    enabled: !!courseId,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>()

  // Populate form + rich text when course loads
  useEffect(() => {
    if (course) {
      reset({
        title: course.title,
        categoryId: course.categoryId || '',
        lessons: course.lessons,
        duration: course.duration || '',
        regularPrice: course.regularPrice,
        beforePrice: course.beforePrice,
        accessTime: course.accessTime || 'Trọn đời',
      })
      setOverview(course.overview || '')
      setWhatYouWillLearn(course.whatYouWillLearn || '')
      setRequirements(course.requirements || '')
      setWhoIsThisCourseFor(course.whoIsThisCourseFor || '')
      if (course.image) {
        setImagePreview(course.image)
        setImageUrl(course.image)
      }
    }
  }, [course, reset])

  const update = useMutation({
    mutationFn: (data: any) => instructorService.updateCourse(courseId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-course', courseId] })
      qc.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('Khoá học đã được cập nhật!')
    },
    onError: () => toast.error('Có lỗi xảy ra, vui lòng thử lại.'),
  })

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingImage(true)
    try {
      const { url } = await instructorService.uploadImage(file)
      setImageUrl(url)
    } catch {
      toast.error('Upload ảnh thất bại')
    } finally {
      setUploadingImage(false)
    }
  }

  const onSubmit = (data: FormValues) => {
    update.mutate({
      ...data,
      image: imageUrl || undefined,
      overview,
      whatYouWillLearn,
      requirements,
      whoIsThisCourseFor,
    })
  }

  const inputCls = (err?: any) =>
    cn(
      'w-full rounded-lg bg-white/5 border px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors',
      err ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-purple-500'
    )
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-gray-400">Khoá học không tồn tại.</p>
        <Link to="/teacher/my-courses" className="text-purple-400 hover:text-purple-300">
          ← Quay lại
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/teacher/my-courses"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Khoá học của tôi
        </Link>
      </div>

      <div className="flex items-start justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Chỉnh sửa khoá học</h1>
            <p className="text-gray-400 text-sm truncate max-w-xs">{course.title}</p>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="hidden sm:flex gap-2">
          <Link
            to={`/teacher/course/${courseId}/videos`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Video
          </Link>
          <Link
            to={`/teacher/course/${courseId}/assets`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Tài liệu
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tiêu đề khoá học *</label>
            <input
              {...register('title', { required: true })}
              className={inputCls(errors.title)}
            />
          </div>
          <div>
            <label className={labelCls}>Danh mục</label>
            <select {...register('categoryId')} className={inputCls()}>
              <option value="">Chọn danh mục...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Lessons + Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Số bài học</label>
            <input type="number" min={1} {...register('lessons')} className={inputCls()} />
          </div>
          <div>
            <label className={labelCls}>Thời lượng</label>
            <input {...register('duration')} placeholder="VD: 10 giờ 30 phút" className={inputCls()} />
          </div>
        </div>

        {/* Price */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Giá bán (₫)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="number" min={0} {...register('regularPrice')} className={cn(inputCls(), 'pl-9')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Giá gốc (₫)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="number" min={0} {...register('beforePrice')} className={cn(inputCls(), 'pl-9')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Thời hạn truy cập</label>
            <select {...register('accessTime')} className={inputCls()}>
              {ACCESS_TIME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className={labelCls}>Ảnh bìa (750×500px)</label>
          <div
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              'relative rounded-xl border-2 border-dashed transition-colors overflow-hidden',
              imagePreview ? 'border-purple-500/50 h-48' : 'border-white/20 hover:border-purple-500/50 h-36'
            )}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(null); setImageUrl('') }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            ) : (
              <label className="flex flex-col items-center justify-center h-full gap-2 cursor-pointer">
                <ImageIcon className="w-8 h-8 text-gray-500" />
                <span className="text-sm text-gray-400">Kéo thả hoặc click để thay ảnh</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
              </label>
            )}
          </div>
        </div>

        {/* Rich text fields */}
        <div>
          <label className={labelCls}>Mô tả khoá học</label>
          <TiptapEditor
            value={overview}
            onChange={setOverview}
            placeholder="Mô tả ngắn gọn về nội dung và giá trị khoá học..."
            minHeight={140}
          />
        </div>

        <div>
          <label className={labelCls}>Học viên sẽ học được gì?</label>
          <TiptapEditor
            value={whatYouWillLearn}
            onChange={setWhatYouWillLearn}
            placeholder="Liệt kê các kỹ năng và kiến thức học viên sẽ đạt được..."
            minHeight={120}
          />
        </div>

        <div>
          <label className={labelCls}>Yêu cầu đầu vào</label>
          <TiptapEditor
            value={requirements}
            onChange={setRequirements}
            placeholder="Kiến thức cần có trước khi học khoá này..."
            minHeight={100}
          />
        </div>

        <div>
          <label className={labelCls}>Khoá học dành cho ai?</label>
          <TiptapEditor
            value={whoIsThisCourseFor}
            onChange={setWhoIsThisCourseFor}
            placeholder="Đối tượng phù hợp với khoá học này..."
            minHeight={100}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Link
            to="/teacher/my-courses"
            className="px-6 py-3 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm font-medium transition-colors"
          >
            Huỷ
          </Link>
          <button
            type="submit"
            disabled={update.isPending || uploadingImage}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {update.isPending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            {update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  )
}
