/**
 * Teacher: Create Course
 * Ported from elearniv: /instructor/course/create (CourseCreateForm.jsx)
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BookOpen,
  DollarSign,
  ImageIcon,
  X,
} from 'lucide-react'
import { instructorService, type CreateCoursePayload } from '@/services/instructor.service'
import { cn } from '@/lib/utils'
import TiptapEditor from '@/components/editor/TiptapEditor'
import { toast } from 'react-hot-toast'

const ACCESS_TIME_OPTIONS = [
  'Trọn đời',
  '1 tháng',
  '3 tháng',
  '6 tháng',
  '1 năm',
]

interface FormValues {
  title: string
  categoryId: string
  lessons: number
  duration: string
  regularPrice: number
  beforePrice: number
  accessTime: string
}

export default function CreateCourse() {
  const navigate = useNavigate()
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Rich text fields (managed by TiptapEditor, not react-hook-form)
  const [overview, setOverview] = useState('')
  const [whatYouWillLearn, setWhatYouWillLearn] = useState('')
  const [requirements, setRequirements] = useState('')
  const [whoIsThisCourseFor, setWhoIsThisCourseFor] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: instructorService.getCategories,
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      categoryId: '',
      lessons: 1,
      duration: '',
      regularPrice: 0,
      beforePrice: 0,
      accessTime: 'Trọn đời',
    },
  })

  const create = useMutation({
    mutationFn: (data: CreateCoursePayload) => instructorService.createCourse(data),
    onSuccess: (course) => {
      toast.success('Khoá học đã được tạo!')
      navigate(`/teacher/course/${course.id}/videos`)
    },
    onError: () => toast.error('Có lỗi xảy ra, vui lòng thử lại.'),
  })

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh')
      return
    }
    // Local preview
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload to server
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
    if (!imageUrl) {
      toast.error('Vui lòng upload ảnh bìa khoá học (750×500)')
      return
    }
    create.mutate({
      ...data,
      image: imageUrl,
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

      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Tạo khoá học mới</h1>
          <p className="text-gray-400 text-sm">Chia sẻ kiến thức của bạn với học viên</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tiêu đề khoá học *</label>
            <input
              {...register('title', { required: 'Vui lòng nhập tiêu đề' })}
              placeholder="VD: Vật lý cơ bản cho học sinh THPT"
              className={inputCls(errors.title)}
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Danh mục *</label>
            <select
              {...register('categoryId', { required: 'Vui lòng chọn danh mục' })}
              className={inputCls(errors.categoryId)}
            >
              <option value="">Chọn danh mục...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1 text-xs text-red-400">{errors.categoryId.message}</p>
            )}
          </div>
        </div>

        {/* Lessons + Duration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Số bài học</label>
            <input
              type="number"
              min={1}
              {...register('lessons', { min: 1 })}
              className={inputCls()}
            />
          </div>
          <div>
            <label className={labelCls}>Thời lượng</label>
            <input
              {...register('duration')}
              placeholder="VD: 10 giờ 30 phút"
              className={inputCls()}
            />
          </div>
        </div>

        {/* Price */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Giá bán (₫)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                min={0}
                {...register('regularPrice')}
                placeholder="0 = Miễn phí"
                className={cn(inputCls(), 'pl-9')}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Giá gốc (₫, tuỳ chọn)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                min={0}
                {...register('beforePrice')}
                placeholder="Để trống nếu không có"
                className={cn(inputCls(), 'pl-9')}
              />
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
          <label className={labelCls}>Ảnh bìa (750×500px) *</label>
          <div
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) handleImageFile(file)
            }}
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
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-sm text-gray-400">Kéo thả hoặc click để chọn ảnh</span>
                <span className="text-xs text-gray-600">PNG, JPG tối đa 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageFile(file)
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Overview */}
        <div>
          <label className={labelCls}>Mô tả khoá học</label>
          <TiptapEditor
            value={overview}
            onChange={setOverview}
            placeholder="Mô tả ngắn gọn về nội dung và giá trị khoá học..."
            minHeight={140}
          />
        </div>

        {/* What you'll learn */}
        <div>
          <label className={labelCls}>Học viên sẽ học được gì?</label>
          <TiptapEditor
            value={whatYouWillLearn}
            onChange={setWhatYouWillLearn}
            placeholder="VD: Hiểu được các định luật Newton, tính toán gia tốc, lực..."
            minHeight={120}
          />
        </div>

        {/* Requirements */}
        <div>
          <label className={labelCls}>Yêu cầu đầu vào</label>
          <TiptapEditor
            value={requirements}
            onChange={setRequirements}
            placeholder="VD: Kiến thức Toán cơ bản, không cần kinh nghiệm trước..."
            minHeight={100}
          />
        </div>

        {/* Who is this for */}
        <div>
          <label className={labelCls}>Khoá học dành cho ai?</label>
          <TiptapEditor
            value={whoIsThisCourseFor}
            onChange={setWhoIsThisCourseFor}
            placeholder="VD: Học sinh THPT lớp 10-12, người muốn ôn thi đại học..."
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
            disabled={create.isPending || uploadingImage}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {create.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
            {create.isPending ? 'Đang tạo...' : 'Tạo khoá học'}
          </button>
        </div>
      </form>
    </div>
  )
}
