/**
 * Teacher: Course Assets — tài liệu đính kèm
 * Ported from elearniv: /instructor/course/[courseId]/assets
 */
import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText,
  Upload,
  Trash2,
  Download,
  File,
  Video,
  Archive,
  Plus,
} from 'lucide-react'
import { instructorService } from '@/services/instructor.service'
import { toast } from 'react-hot-toast'
import { CourseManagementNav } from '@/components/teacher/CourseManagementNav'

function fileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />
  if (type.includes('video')) return <Video className="w-5 h-5 text-purple-400" />
  if (type.includes('zip') || type.includes('rar')) return <Archive className="w-5 h-5 text-yellow-400" />
  return <File className="w-5 h-5 text-blue-400" />
}

function fmtSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CourseAssets() {
  const { courseId } = useParams<{ courseId: string }>()
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [assetTitle, setAssetTitle] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['instructor-assets', courseId],
    queryFn: () => instructorService.getAssets(courseId!),
    enabled: !!courseId,
  })

  const del = useMutation({
    mutationFn: (assetId: string) => instructorService.deleteAsset(courseId!, assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-assets', courseId] })
      toast.success('Đã xoá tài liệu')
    },
  })

  const handleFileSelect = (file: File) => {
    setPendingFile(file)
    setAssetTitle(file.name.replace(/\.[^.]+$/, '')) // filename without extension
  }

  const handleUpload = async () => {
    if (!pendingFile || !assetTitle.trim()) return
    setUploading(true)
    try {
      await instructorService.uploadAsset(courseId!, pendingFile, assetTitle.trim())
      qc.invalidateQueries({ queryKey: ['instructor-assets', courseId] })
      toast.success('Tài liệu đã được upload!')
      setPendingFile(null)
      setAssetTitle('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      toast.error('Upload thất bại, vui lòng thử lại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* PageNavigation từ elearniv */}
      <CourseManagementNav courseId={courseId!} />

      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Tài liệu đính kèm</h1>
          <p className="text-gray-400 text-sm">{assets.length} tài liệu</p>
        </div>
      </div>

      {/* Upload area */}
      <div className="rounded-xl bg-white/5 border border-dashed border-white/20 hover:border-purple-500/40 transition-colors p-6 space-y-4">
        <div
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) handleFileSelect(file)
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !pendingFile && fileInputRef.current?.click()}
          className="flex flex-col items-center gap-3 cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Upload className="w-7 h-7 text-purple-400" />
          </div>
          {!pendingFile ? (
            <>
              <p className="text-sm text-gray-300 font-medium">Kéo thả hoặc click để chọn file</p>
              <p className="text-xs text-gray-500">PDF, DOCX, ZIP, MP4, PNG... tối đa 50MB</p>
            </>
          ) : (
            <p className="text-sm text-green-400 font-medium">✓ {pendingFile.name} ({fmtSize(pendingFile.size)})</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />

        {pendingFile && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Tên tài liệu *</label>
              <input
                value={assetTitle}
                onChange={(e) => setAssetTitle(e.target.value)}
                placeholder="VD: Bài tập chương 1"
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
                {uploading
                  ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />}
                {uploading ? 'Đang upload...' : 'Thêm tài liệu'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <FileText className="w-10 h-10 text-gray-600" />
          <p className="text-gray-400 text-sm">Chưa có tài liệu nào. Upload file để học viên tải xuống.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 p-3 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                {fileIcon(asset.fileType)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{asset.title}</p>
                <p className="text-xs text-gray-500">
                  {asset.fileType.toUpperCase()}
                  {asset.fileSize ? ` · ${fmtSize(asset.fileSize)}` : ''}
                </p>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={asset.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-400 transition-colors"
                  title="Tải xuống"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => {
                    if (window.confirm(`Xoá tài liệu "${asset.title}"?`)) del.mutate(asset.id)
                  }}
                  className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
