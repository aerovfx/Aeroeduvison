/**
 * Profile: Basic Information
 * Ported from elearniv: /profile/basic-information (InfoForm.jsx)
 * Shared for both STUDENT and TEACHER roles
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { User, Phone, Globe, FileText, Save } from 'lucide-react'
import { learningService } from '@/services/learning.service'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface FormValues {
  name: string
  bio: string
  phone: string
  website: string
}

export default function BasicInfo() {
  const { user, refreshUser } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: { name: '', bio: '', phone: '', website: '' },
  })

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        bio: (user as any).bio || '',
        phone: (user as any).phone || '',
        website: (user as any).website || '',
      })
    }
  }, [user, reset])

  const update = useMutation({
    mutationFn: learningService.updateProfile,
    onSuccess: async () => {
      toast.success('Hồ sơ đã được cập nhật!')
      // Refetch user → Navbar / Sidebar / mọi nơi dùng useAuth.user sẽ thấy tên mới
      await refreshUser()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Có lỗi xảy ra, thử lại nhé.')
    },
  })

  const inputCls = (err?: any) =>
    cn(
      'w-full rounded-lg bg-white/5 border px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none transition-colors',
      err ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-purple-500'
    )
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5'

  return (
    <div className="p-6 lg:p-8 max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <User className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Thông tin cơ bản</h1>
          <p className="text-gray-400 text-sm">Cập nhật hồ sơ cá nhân của bạn</p>
        </div>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
          {user?.image ? (
            <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-purple-300 bg-purple-500/20">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-white font-medium">{user?.name || '—'}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <a
            href="/profile/photo"
            className="text-purple-400 hover:text-purple-300 text-xs mt-1 inline-block transition-colors"
          >
            Đổi ảnh đại diện →
          </a>
        </div>
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold',
            user?.role === 'TEACHER'
              ? 'bg-blue-500/20 text-blue-300'
              : user?.role === 'ADMIN'
              ? 'bg-red-500/20 text-red-300'
              : 'bg-purple-500/20 text-purple-300'
          )}
        >
          {user?.role === 'TEACHER' ? 'Giảng viên' : user?.role === 'ADMIN' ? 'Quản trị viên' : 'Học viên'}
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit((data) => update.mutate(data))} className="space-y-4">
        {/* Name */}
        <div>
          <label className={labelCls}>Họ và tên *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              {...register('name', { required: 'Vui lòng nhập họ tên' })}
              placeholder="Nguyễn Văn A"
              className={cn(inputCls(errors.name), 'pl-9')}
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className={labelCls}>Số điện thoại</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              {...register('phone')}
              placeholder="+84 xxx xxx xxx"
              className={cn(inputCls(), 'pl-9')}
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label className={labelCls}>Website / LinkedIn</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              {...register('website')}
              placeholder="https://..."
              type="url"
              className={cn(inputCls(), 'pl-9')}
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className={labelCls}>Giới thiệu bản thân</label>
          <div className="relative">
            <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
            <textarea
              {...register('bio')}
              placeholder="Mô tả ngắn về bạn: chuyên môn, kinh nghiệm, sở thích..."
              rows={4}
              className={cn(inputCls(), 'pl-9 resize-none')}
            />
          </div>
        </div>

        {/* Read-only email */}
        <div>
          <label className={labelCls}>Email</label>
          <input
            value={user?.email || ''}
            disabled
            className="w-full rounded-lg bg-white/5 border border-white/5 px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">
            🔒 <strong>Email là định danh tài khoản</strong>, không thể đổi để tránh ảnh hưởng phiên đăng nhập,
            mã kích hoạt gói cước, và đề thi đã chia sẻ.
            Nếu cần dùng email mới, hãy đăng ký tài khoản mới hoặc liên hệ admin.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={update.isPending || !isDirty}
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
