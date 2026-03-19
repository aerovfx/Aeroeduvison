"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileAudio, FileVideo, X, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

export default function TranscriptUploadPage() {
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    const validTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "video/mp4",
      "video/webm",
      "video/ogg",
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm|m4a|mp4|avi|mov|mkv)$/)) {
      toast.error("Chỉ hỗ trợ file audio/video (MP3, WAV, MP4, WebM, etc.)")
      return
    }

    // Check file size (max 100MB for demo)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File quá lớn. Tối đa 100MB")
      return
    }

    setFile(file)
    toast.success(`Đã chọn: ${file.name}`)
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error("Vui lòng chọn file")
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      // TODO: Implement actual file upload API
      // For now, simulate upload
      await new Promise(resolve => setTimeout(resolve, 5000))

      clearInterval(progressInterval)
      setProgress(100)
      setUploading(false)

      // Start transcription
      startTranscription()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(`Lỗi upload: ${error.message}`)
      setUploading(false)
      setProgress(0)
    }
  }

  const startTranscription = async () => {
    setTranscribing(true)
    
    try {
      // TODO: Implement actual transcription API
      // Simulate transcription
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      toast.success("Transcription hoàn tất!")
      
      // Redirect to transcript library or editor
      router.push("/teacher/transcript/library")
    } catch (error: any) {
      console.error("Transcription error:", error)
      toast.error(`Lỗi transcription: ${error.message}`)
    } finally {
      setTranscribing(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
    setProgress(0)
    setUploading(false)
    setTranscribing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Upload File</h1>
                <p className="text-sm text-gray-600">Transcribe từ file audio/video</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Quay lại
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {!file ? (
          /* Upload Area */
          <Card>
            <CardHeader>
              <CardTitle>Chọn file audio/video</CardTitle>
              <CardDescription>
                Hỗ trợ MP3, WAV, MP4, WebM, và các định dạng phổ biến khác
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <Upload className="w-10 h-10 text-blue-600" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Kéo thả file vào đây hoặc click để chọn
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Audio: MP3, WAV, OGG, WebM, M4A<br/>
                  Video: MP4, WebM, AVI, MOV, MKV<br/>
                  Tối đa: 100MB
                </p>
                <Button
                  onClick={() => inputRef.current?.click()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Chọn file
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleChange}
                  className="hidden"
                />
              </div>

              {/* Info Box */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <FileAudio className="w-8 h-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Audio Files</h3>
                  <p className="text-sm text-gray-600">MP3, WAV, OGG, WebM</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <FileVideo className="w-8 h-8 text-purple-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Video Files</h3>
                  <p className="text-sm text-gray-600">MP4, WebM, AVI, MOV</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">Auto Transcribe</h3>
                  <p className="text-sm text-gray-600">Tự động tạo transcript</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* File Selected */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    {file.type.startsWith("video") ? (
                      <FileVideo className="w-6 h-6 text-blue-600" />
                    ) : (
                      <FileAudio className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{file.name}</h3>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split("/")[0]}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={uploading || transcribing}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(uploading || transcribing) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {uploading ? "Đang upload..." : "Đang transcribe..."}
                    </span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        transcribing ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {!uploading && !transcribing && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleUpload}
                    className="px-6 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Transcribe
                  </Button>
                </div>
              )}

              {transcribing && (
                <div className="flex items-center justify-center gap-3 p-4 bg-green-50 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  <span className="text-green-700 font-medium">
                    Đang transcribe file...
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Lưu ý:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>File sẽ được xử lý tự động</li>
                      <li>Thời gian xử lý phụ thuộc vào độ dài file</li>
                      <li>Kết quả sẽ lưu vào thư viện transcript</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
