/**
 * Profile: Photo / Avatar Update
 * Ported from elearniv: /profile/photo (AvatarForm.jsx)
 */
import { useRef, useState } from 'react'
import { Camera, Upload, X, Check } from 'lucide-react'
import { learningService } from '@/services/learning.service'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'

export default function Photo() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh không được vượt quá 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setPendingFile(file)
  }

  const handleUpload = async () => {
    if (!pendingFile) return
    setUploading(true)
    try {
      await learningService.uploadPhoto(pendingFile)
      toast.success('Ảnh đại diện đã được cập nhật!')
      setPreview(null)
      setPendingFile(null)
      // Reload page to refresh auth context
      window.location.reload()
    } catch {
      toast.error('Upload thất bại, thử lại nhé.')
    } finally {
      setUploading(false)
    }
  }

  const displayImage = preview || user?.image || null
  const initials = (user?.name || user?.email || 'U')[0].toUpperCase()

  return (
    <div className="p-6 lg:p-8 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Camera className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Ảnh đại diện</h1>
          <p className="text-gray-400 text-sm">Cập nhật ảnh hồ sơ của bạn</p>
        </div>
      </div>

      {/* Avatar display */}
      <div className="flex flex-col items-center gap-6">
        <div
          className={cn(
            'relative w-36 h-36 rounded-full overflow-hidden ring-4 transition-all',
            preview ? 'ring-purple-500' : 'ring-white/10'
          )}
        >
          {displayImage ? (
            <img src={displayImage} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-purple-500/20 text-5xl font-bold text-purple-300">
              {initials}
            </div>
          )}

          {/* Overlay on hover */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer gap-1"
          >
            <Camera className="w-8 h-8 text-white" />
            <span className="text-xs text-white font-medium">Đổi ảnh</span>
          </div>
        </div>

        {preview && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-purple-300">Xem trước ảnh mới</span>
            <button
              onClick={() => { setPreview(null); setPendingFile(null) }}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-300" />
            </button>
          </div>
        )}
      </div>

      {/* Upload area */}
      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-white/20 hover:border-purple-500/50 transition-colors p-8 flex flex-col items-center gap-3 cursor-pointer"
      >
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
          <Upload className="w-6 h-6 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-300">Kéo thả ảnh vào đây hoặc click để chọn</p>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP — tối đa 5MB</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {/* Tips */}
      <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-gray-400 space-y-1">
        <p className="font-medium text-gray-300">Gợi ý cho ảnh đẹp:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Dùng ảnh vuông (1:1) để hiển thị tốt nhất</li>
          <li>Kích thước tối thiểu 200×200px</li>
          <li>Ảnh rõ mặt, nền tươi sáng</li>
        </ul>
      </div>

      {/* Submit */}
      {pendingFile && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold transition-colors"
        >
          {uploading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Check className="w-4 h-4" />}
          {uploading ? 'Đang upload...' : 'Lưu ảnh đại diện'}
        </button>
      )}
    </div>
  )
}
