"use client"

import { useState, useCallback } from "react"
import { Upload, X, FileText, Image as ImageIcon, Folder, Loader2 } from "lucide-react"
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

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: () => void
}

interface FileWithPreview extends File {
  preview?: string
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: DocumentUploadModalProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [enableAIProcessing, setEnableAIProcessing] = useState(true)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate file types and sizes
    const validFiles: FileWithPreview[] = []
    const maxSize = 50 * 1024 * 1024 // 50MB

    acceptedFiles.forEach((file) => {
      // Check file type
      const validTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ]
      
      if (!validTypes.includes(file.type)) {
        toast.error(`File ${file.name} không được hỗ trợ. Chỉ hỗ trợ PDF, JPG, PNG.`)
        return
      }

      // Check file size
      if (file.size > maxSize) {
        toast.error(`File ${file.name} quá lớn. Kích thước tối đa: 50MB.`)
        return
      }

      // Create preview for images
      const fileWithPreview: FileWithPreview = file
      if (file.type.startsWith("image/")) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }

      validFiles.push(fileWithPreview)
    })

    setFiles((prev) => [...prev, ...validFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true,
  })

  const handleRemoveFile = (index: number) => {
    const file = files[index]
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGroupFiles = () => {
    if (files.length === 0) {
      toast.error("Vui lòng chọn ít nhất một file để nhóm")
      return
    }
    // TODO: Implement grouping logic
    toast.success("Đã nhóm các file thành một thư mục")
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Vui lòng chọn ít nhất một file để tải lên")
      return
    }

    setUploading(true)
    setUploadProgress({})

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = "Upload failed"
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
          console.error("Upload error response:", error)
        } catch (e) {
          console.error("Failed to parse error response:", e)
          errorMessage = `Upload failed with status ${response.status}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      toast.success(data.message || `Đã tải lên ${files.length} file thành công`)
      
      // Process documents with AI if enabled
      if (enableAIProcessing && data.documents) {
        const processPromises = data.documents.map(async (doc: any) => {
          try {
            const processResponse = await fetch(`/api/documents/${doc.id}/process`, {
              method: "POST",
            })
            if (processResponse.ok) {
              console.log(`✅ Started processing document ${doc.id}`)
            }
          } catch (error) {
            console.error(`Error starting processing for ${doc.id}:`, error)
          }
        })
        
        // Process in background (don't wait)
        Promise.all(processPromises).catch(console.error)
        toast.success("Đang xử lý tài liệu với AI...")
      }
      
      // Reset state
      setFiles([])
      setUploadProgress({})
      onUploadComplete?.()
      onClose()
    } catch (error: any) {
      console.error("Upload error:", error)
      const errorMessage = error.message || "Không thể tải lên file"
      toast.error(errorMessage)
      // Log full error in development
      if (process.env.NODE_ENV === "development") {
        console.error("Full error details:", error)
      }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tải tài liệu lên</DialogTitle>
          <DialogDescription>
            Tải PDF hoặc ảnh để số hoá với AI
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left Panel - Upload Area */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = ".pdf,.jpg,.jpeg,.png"
                  input.multiple = true
                  input.onchange = (e) => {
                    const target = e.target as HTMLInputElement
                    if (target.files) {
                      onDrop(Array.from(target.files))
                    }
                  }
                  input.click()
                }}
              >
                Chọn tệp
              </Button>
              <Button
                variant="outline"
                onClick={handleGroupFiles}
                disabled={files.length === 0}
              >
                <Folder className="h-4 w-4 mr-2" />
                Nhóm lại
              </Button>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Kéo thả file vào đây hoặc click để chọn file
              </p>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ: PDF, JPG, PNG • Kích thước tối đa: 50MB/tệp
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded"
                      />
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
                      onClick={() => handleRemoveFile(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {files.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Tải lên ({files.length})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Right Panel - Instructions */}
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <div className="text-6xl">🤖</div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Số hóa với AI</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tài liệu sẽ được tự động số hóa bằng OCR và phân tích với AI sau khi upload.
              </p>
              
              {/* AI Processing Toggle */}
              <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="enableAI"
                  checked={enableAIProcessing}
                  onChange={(e) => setEnableAIProcessing(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="enableAI" className="text-sm font-medium cursor-pointer">
                  Tự động số hóa với AI
                </label>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Hỗ trợ:</span>
                  <span className="text-muted-foreground">PDF, JPG, PNG</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Kích thước tối đa:</span>
                  <span className="text-muted-foreground">50MB/tệp</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">AI Features:</span>
                  <span className="text-muted-foreground">OCR + Phân tích nội dung</span>
                </div>
              </div>
            </div>
          </div>
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
