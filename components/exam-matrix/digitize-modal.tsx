"use client"

import { useState, useCallback } from "react"
import { Upload, X, FileText, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDropzone } from "react-dropzone"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface DigitizeMatrixModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: () => void
}

interface FileWithPreview extends File {
  preview?: string
}

export function DigitizeMatrixModal({
  isOpen,
  onClose,
  onUploadComplete,
}: DigitizeMatrixModalProps) {
  const [file, setFile] = useState<FileWithPreview | null>(null)
  const [uploading, setUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    // Only accept 1 file
    const selectedFile = acceptedFiles[0]
    const maxSize = 50 * 1024 * 1024 // 50MB
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/jfif",
    ]

    // Validate file type
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Chỉ hỗ trợ PDF hoặc ảnh")
      return
    }

    // Validate file size
    if (selectedFile.size > maxSize) {
      toast.error("Kích thước tối đa: 50MB")
      return
    }

    // Create preview for images
    const fileWithPreview: FileWithPreview = selectedFile
    if (selectedFile.type.startsWith("image/")) {
      fileWithPreview.preview = URL.createObjectURL(selectedFile)
    }

    setFile(fileWithPreview)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/jfif": [".jfif"],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false, // Only 1 file
  })

  const handleRemoveFile = () => {
    if (file?.preview) {
      URL.revokeObjectURL(file.preview)
    }
    setFile(null)
  }

  const handleDigitize = async () => {
    if (!file) {
      toast.error("Vui lòng chọn file để số hoá")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/exam-matrices/digitize", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Upload failed")
      }

      const data = await response.json()
      toast.success("Đã tải lên file. Hệ thống đang xử lý...")
      
      // Reset state
      handleRemoveFile()
      onUploadComplete?.()
      onClose()
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(error.message || "Không thể tải lên file")
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return <FileText className="h-5 w-5 text-red-600" />
    } else if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-purple-600" />
    }
    return <FileText className="h-5 w-5 text-gray-600" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Số hoá ma trận</DialogTitle>
          <DialogDescription>
            Tải lên file ma trận để số hoá tự động
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Upload Area */}
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Kéo thả file vào đây
              </p>
              <Button variant="outline" className="mt-2">
                Chọn file từ máy tính
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Chỉ hỗ trợ PDF hoặc ảnh • Tối đa 50MB • 1 file mỗi lần
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Display */}
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Note */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">Lưu ý</p>
                    <p className="text-sm text-blue-800">
                      Sau khi tải lên, hệ thống sẽ tự động phân tích và số hoá ma trận. Bạn có thể theo dõi tiến trình xử lý tại danh sách ma trận.
                    </p>
                  </div>
                </div>
              </div>

              {/* Digitize Button */}
              <Button
                onClick={handleDigitize}
                disabled={uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Số hoá ma trận
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
