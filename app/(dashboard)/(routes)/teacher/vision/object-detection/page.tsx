'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Upload, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, Download, Trash2, Eye } from 'lucide-react'

interface Detection {
  category: string
  score: number
  bounding_box: {
    origin_x: number
    origin_y: number
    width: number
    height: number
  }
}

interface DetectionResult {
  success: boolean
  detections: Detection[]
  detection_count: number
  annotated_image?: string
  image_width?: number
  image_height?: number
  error?: string
}

export default function MediaPipeObjectDetectionPage() {
  const { data: session } = useSession()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [threshold, setThreshold] = useState(0.5)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh')
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDetect = async () => {
    if (!selectedFile) return

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('threshold', threshold.toString())

      const res = await fetch('/api/vision/object-detect', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        setResult(data)
      } else {
        alert('Lỗi: ' + (data.error || 'Không thể phát hiện vật thể'))
      }
    } catch (error: any) {
      console.error('Detection error:', error)
      alert('Lỗi: ' + (error.message || 'Không thể phát hiện vật thể'))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result?.annotated_image) return

    const link = document.createElement('a')
    link.href = result.annotated_image
    link.download = `detected-${Date.now()}.jpg`
    link.click()
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreviewUrl('')
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-slate-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
              <Eye className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-purple-600">Phát Hiện Vật Thể MediaPipe</h1>
              <p className="text-sm text-gray-600">
                Sử dụng AI để nhận diện và khoanh vùng các vật thể trong hình ảnh
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <GlassCard title="1. Chọn hình ảnh">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[hsl(var(--primary))/0.5] hover:bg-[hsl(var(--primary))/0.05] transition-all"
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg shadow-lg"
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleClear() }}
                      className="ai-button text-gray-900 px-4 py-2 rounded-xl flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Xóa
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-gray-600 mx-auto" />
                  <p className="text-gray-900 font-semibold">
                    Kéo thả hình ảnh vào đây hoặc click để chọn
                  </p>
                  <p className="text-sm text-gray-600">
                    Hỗ trợ JPG, PNG
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          </GlassCard>

          <GlassCard title="2. Cấu hình">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Độ tin cậy tối thiểu: {threshold.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-[hsl(var(--primary))]"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0.1 (Thấp)</span>
                  <span>0.9 (Cao)</span>
                </div>
              </div>

              <AIButton
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                onClick={handleDetect}
                disabled={!selectedFile || loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang phân tích...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" /> Phát hiện vật thể
                  </>
                )}
              </AIButton>
            </div>
          </GlassCard>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <GlassCard title="3. Kết quả">
            {!result ? (
              <div className="text-center py-12 text-gray-600">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Chưa có kết quả</p>
                <p className="text-sm">Chọn hình ảnh và click "Phát hiện vật thể"</p>
              </div>
            ) : result.error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <p className="text-red-600 font-semibold">Lỗi: {result.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[hsl(var(--muted))/20] rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-purple-600">{result.detection_count}</p>
                    <p className="text-sm text-gray-600">Vật thể phát hiện</p>
                  </div>
                  <div className="bg-[hsl(var(--muted))/20] rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {result.image_width} x {result.image_height}
                    </p>
                    <p className="text-sm text-gray-600">Kích thước ảnh</p>
                  </div>
                </div>

                {/* Annotated Image */}
                {result.annotated_image && (
                  <div>
                    <img
                      src={result.annotated_image}
                      alt="Detection result"
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                )}

                {/* Detections List */}
                {result.detections.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Danh sách vật thể:
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {result.detections.map((det, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-[hsl(var(--muted))/20] rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white text-sm font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 capitalize">
                                {det.category}
                              </p>
                              <p className="text-xs text-gray-600">
                                Vị trí: ({det.bounding_box.origin_x}, {det.bounding_box.origin_y})
                              </p>
                            </div>
                          </div>
                          <AIBadge className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                            {(det.score * 100).toFixed(0)}%
                          </AIBadge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <AIButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={handleDownload} className="flex-1">
                    <Download className="w-4 h-4" /> Tải ảnh kết quả
                  </AIButton>
                  <AIButton onClick={handleClear} className="flex-1">
                    <Trash2 className="w-4 h-4" /> Xóa tất cả
                  </AIButton>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Example Images */}
      <div className="max-w-7xl mx-auto mt-6">
        <GlassCard title="Hình ảnh mẫu">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Cat & Dog', url: 'https://storage.googleapis.com/mediapipe-tasks/object_detector/cat_and_dog.jpg' },
              { name: 'Objects', url: 'https://storage.googleapis.com/mediapipe-tasks/object_detector/objects.jpg' },
              { name: 'Fruits', url: 'https://storage.googleapis.com/mediapipe-models/examples/fruits.jpg' },
              { name: 'Street', url: 'https://storage.googleapis.com/mediapipe-models/examples/street.jpg' },
            ].map((img) => (
              <button
                key={img.name}
                onClick={() => {
                  fetch(img.url)
                    .then(res => res.blob())
                    .then(blob => {
                      const file = new File([blob], `${img.name}.jpg`, { type: 'image/jpeg' })
                      handleFileSelect(file)
                    })
                }}
                className="relative group rounded-xl overflow-hidden border border-gray-200 hover:border-[hsl(var(--primary))/0.5] transition-all"
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-32 object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-sm font-semibold">{img.name}</p>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// Reusable Components
function GlassCard({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {title && (
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  )
}

function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-yellow-200',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variants[variant]}`}>
      {children}
    </span>
  )
}

function AIButton({
  children, onClick, variant = 'default', disabled = false, className = '',
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'default' | 'primary';
  disabled?: boolean; className?: string;
}) {
  const variantClass = variant === 'primary'
    ? 'ai-button-primary text-white'
    : 'ai-button text-gray-900 hover:bg-gray-50'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${className}`}
    >
      {children}
    </button>
  )
}
