"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { X, Download, CheckCircle2, Loader2, FileText, Copy, RefreshCw, Brain, Eye, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface Document {
  id: string
  name: string
  displayName: string
  originalUrl: string
  digitizedUrl?: string
  status: string
  ocrText?: string
  createdAt: string
  processedAt?: string
  mimeType?: string
  metadata?: any
  processingLogs?: Array<{
    stage: string
    message: string
    createdAt: string
  }>
}

export default function DocumentReviewPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchDocument()
  }, [documentId])

  const fetchDocument = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/documents/${documentId}`)
      if (!response.ok) throw new Error("Failed to fetch document")
      
      const data = await response.json()
      setDocument(data.document)
      
      // Log document info for debugging
      console.log("Document loaded:", {
        id: data.document.id,
        originalUrl: data.document.originalUrl,
        digitizedUrl: data.document.digitizedUrl,
        status: data.document.status,
        hasOcrText: !!data.document.ocrText,
      })
      
      // TODO: Calculate total pages from metadata
      setTotalPages(data.document.metadata?.pages || 1)
    } catch (error) {
      console.error("Error fetching document:", error)
      toast.error("Không thể tải tài liệu")
      router.push("/teacher/document-digitization")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!document) return
    
    try {
      // Check if result file exists
      const resultFile = (document.metadata as any)?.resultFile
      const digitizedUrl = document.digitizedUrl
      
      if (resultFile?.url || digitizedUrl) {
        // Download existing result file
        const fileUrl = resultFile?.url || digitizedUrl
        const fileName = resultFile?.fileName || `${document.displayName || document.name}_digitized.txt`
        
        // Convert to API route if needed
        let downloadUrl = fileUrl
        if (fileUrl.startsWith("/uploads/")) {
          const path = fileUrl.replace("/uploads/", "")
          downloadUrl = `/api/documents/file/${path}`
        }
        
        // Create download link
        const a = document.createElement("a")
        a.href = downloadUrl
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        toast.success("Đã tải kết quả số hóa")
      } else if (document.ocrText) {
        // Save result file first, then download
        toast.loading("Đang tạo file kết quả...", { id: "save-result" })
        
        const response = await fetch(`/api/documents/${document.id}/save-result`, {
          method: "POST",
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Không thể tạo file kết quả")
        }
        
        const data = await response.json()
        
        // Download the newly created file
        const downloadUrl = data.file.url.startsWith("/uploads/")
          ? `/api/documents/file/${data.file.url.replace("/uploads/", "")}`
          : data.file.url
        
        const a = document.createElement("a")
        a.href = downloadUrl
        a.download = data.file.fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        toast.success("Đã tải kết quả số hóa", { id: "save-result" })
        
        // Refresh document to get updated metadata
        router.refresh()
      } else {
        toast.error("Bản số hoá chưa sẵn sàng")
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải file", { id: "save-result" })
    }
  }

  const handleCopyText = () => {
    if (document?.ocrText) {
      navigator.clipboard.writeText(document.ocrText)
      toast.success("Đã copy text vào clipboard")
    }
  }

  const getFileUrl = (url: string) => {
    if (!url) return ""
    
    // If URL starts with /uploads/, convert to API route
    if (url.startsWith("/uploads/")) {
      const path = url.replace("/uploads/", "")
      return `/api/documents/file/${path}`
    }
    
    // If already an API route or external URL, return as is
    if (url.startsWith("/api/") || url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }
    
    // If it's a relative path without /uploads, assume it's already in uploads
    // and add the documents/ prefix if needed
    const cleanPath = url.replace(/^\//, "")
    if (cleanPath.startsWith("documents/")) {
      return `/api/documents/file/${cleanPath}`
    }
    
    // Default: try to construct the path
    return `/api/documents/file/${cleanPath}`
  }

  const handleReprocess = async () => {
    if (!document) return
    
    try {
      setProcessing(true)
      toast.loading("Đang số hóa lại tài liệu...", { id: "reprocess" })
      
      const response = await fetch(`/api/documents/${document.id}/process`, {
        method: "POST",
      })
      
      if (!response.ok) {
        const error = await response.json()
        const errorMessage = error.error || error.message || "Failed to process document"
        
        // Check if it's OCR service error
        if (errorMessage.includes("OCR service") || errorMessage.includes("không khả dụng")) {
          throw new Error(`${errorMessage}\n\n💡 Hướng dẫn: Khởi động OCR service tại http://localhost:8001`)
        }
        
        throw new Error(errorMessage)
      }
      
      toast.success("Đã bắt đầu số hóa lại", { id: "reprocess" })
      
      // Refresh document after a delay
      setTimeout(() => {
        fetchDocument()
      }, 2000)
    } catch (error: any) {
      console.error("Error reprocessing:", error)
      const errorMessage = error.message || "Không thể số hóa lại"
      
      // Show error with helpful message
      toast.error(errorMessage, { 
        id: "reprocess",
        duration: 6000, // Show longer for OCR errors
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleFixStatus = async () => {
    if (!document) return
    
    try {
      setProcessing(true)
      toast.loading("Đang sửa status...", { id: "fix-status" })
      
      const response = await fetch(`/api/documents/fix-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: document.id,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fix status")
      }
      
      const data = await response.json()
      toast.success(data.message || "Đã sửa status thành công", { id: "fix-status" })
      
      // Refresh document after a delay
      setTimeout(() => {
        fetchDocument()
      }, 1000)
    } catch (error: any) {
      console.error("Error fixing status:", error)
      toast.error(error.message || "Không thể sửa status", { id: "fix-status" })
    } finally {
      setProcessing(false)
    }
  }

  // Check if document has invalid status (Hoàn tất but no OCR text)
  const hasInvalidStatus = document?.status === "Hoàn tất" && !document?.ocrText

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!document) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{document.displayName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(document.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasInvalidStatus && (
              <Button
                variant="outline"
                onClick={handleFixStatus}
                disabled={processing}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                Sửa Status
              </Button>
            )}
            <Badge
              className={
                document.status === "Hoàn tất"
                  ? "bg-green-100 text-green-800"
                  : document.status === "Đang xử lý"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {document.status}
            </Badge>
            {document.status === "Hoàn tất" && document.ocrText && (
              <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Tải kết quả số hóa
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.back()}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content - Tabs for different views */}
      <div className="flex-1 overflow-hidden p-4">
        <Tabs defaultValue="comparison" className="h-full flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="comparison">So sánh</TabsTrigger>
            <TabsTrigger value="text">Text đã số hóa</TabsTrigger>
            <TabsTrigger value="restructured">Văn bản tái cấu trúc</TabsTrigger>
            <TabsTrigger value="analysis">Phân tích AI</TabsTrigger>
            <TabsTrigger value="logs">Log xử lý</TabsTrigger>
          </TabsList>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Left Panel - Original */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Bản gốc</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  {document.originalUrl ? (
                    <div className="space-y-4">
                      {document.mimeType === "application/pdf" ? (
                        <iframe
                          src={getFileUrl(document.originalUrl)}
                          className="w-full h-full min-h-[600px] border rounded"
                          title="Original Document"
                        />
                      ) : (
                        <div className="relative">
                          <img
                            src={getFileUrl(document.originalUrl)}
                            alt="Original Document"
                            className="w-full h-auto rounded shadow-sm"
                            onError={(e) => {
                              console.error("Image load error:", {
                                originalUrl: document.originalUrl,
                                convertedUrl: getFileUrl(document.originalUrl),
                              })
                              // Try alternative URL format
                              const altUrl = document.originalUrl.startsWith("/") 
                                ? document.originalUrl 
                                : `/${document.originalUrl}`
                              if (e.currentTarget.src !== altUrl) {
                                e.currentTarget.src = altUrl
                              } else {
                                e.currentTarget.style.display = "none"
                                e.currentTarget.parentElement!.innerHTML = `
                                  <div class="p-8 text-center text-muted-foreground">
                                    <p>Không thể tải ảnh</p>
                                    <p class="text-xs mt-2">URL: ${document.originalUrl}</p>
                                  </div>
                                `
                              }
                            }}
                            onLoad={() => {
                              console.log("Image loaded successfully:", getFileUrl(document.originalUrl))
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Không có bản gốc
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Panel - Digitized */}
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Bản số hoá</CardTitle>
                    {document.status !== "Hoàn tất" && document.status !== "Đang xử lý" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReprocess}
                        disabled={processing}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                        Số hóa lại
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  {document.status === "Hoàn tất" ? (
                    <div className="space-y-4">
                      {(() => {
                        // Check if digitizedUrl is a result file (.txt) or actual image
                        const digitizedUrl = document.digitizedUrl
                        const isResultFile = digitizedUrl?.endsWith('.txt') || digitizedUrl?.endsWith('.md')
                        const isImage = document.mimeType?.startsWith('image/')
                        const isPdf = document.mimeType === "application/pdf"
                        
                        // Only show digitizedUrl if it's an image or PDF, not a result file
                        // Otherwise, show originalUrl
                        const displayUrl = (digitizedUrl && !isResultFile && (isImage || isPdf)) 
                          ? digitizedUrl 
                          : document.originalUrl
                        
                        if (!displayUrl) return null
                        
                        const displayMimeType = (digitizedUrl && !isResultFile && (isImage || isPdf))
                          ? document.mimeType
                          : document.mimeType
                        
                        if (displayMimeType === "application/pdf") {
                          return (
                            <iframe
                              src={getFileUrl(displayUrl)}
                              className="w-full h-full min-h-[600px] border rounded"
                              title="Digitized Document"
                            />
                          )
                        } else if (displayMimeType?.startsWith('image/')) {
                          return (
                            <img
                              src={getFileUrl(displayUrl)}
                              alt="Digitized Document"
                              className="w-full h-auto rounded shadow-sm"
                              onError={(e) => {
                                console.error("Image load error:", displayUrl)
                                e.currentTarget.src = "/placeholder-image.png"
                              }}
                            />
                          )
                        } else {
                          // For non-image, non-PDF files, show a file icon or message
                          return (
                            <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-gray-50">
                              <FileText className="h-16 w-16 text-gray-400 mb-4" />
                              <p className="text-sm text-gray-600">
                                File đã được xử lý. Vui lòng tải xuống để xem nội dung.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={handleDownload}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Tải kết quả
                              </Button>
                            </div>
                          )
                        }
                      })()}
                      {document.ocrText && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-blue-900">Text đã trích xuất (OCR)</h3>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyText}
                                title="Copy text"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap text-blue-800 bg-white p-3 rounded border max-h-96 overflow-auto">
                            {document.ocrText}
                          </p>
                          {document.metadata?.ocrResult && (
                            <div className="mt-2 text-xs text-blue-600">
                              Độ tin cậy: {((document.metadata.ocrResult.confidence || 0) * 100).toFixed(1)}% • 
                              Số dòng: {document.metadata.ocrResult.totalLines || 0}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : document.status === "Đang xử lý" ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="h-12 w-12 animate-spin mb-4 text-blue-600" />
                      <p>Đang xử lý với AI...</p>
                      <p className="text-xs mt-2">Vui lòng đợi trong giây lát</p>
                    </div>
                  ) : document.status === "Lỗi" ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="text-center space-y-4 p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
                        <XCircle className="h-16 w-16 text-red-600 mx-auto" />
                        <div>
                          <h3 className="font-semibold text-red-900 mb-2">Xử lý thất bại</h3>
                          <p className="text-sm text-red-700 mb-4">
                            {document.processingError || "Không thể trích xuất text từ tài liệu. OCR service có thể không khả dụng."}
                          </p>
                          <Button
                            onClick={handleReprocess}
                            disabled={processing}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                            {processing ? "Đang xử lý..." : "Số hóa lại"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <FileText className="h-12 w-12 mb-4 text-gray-400" />
                      <p>Bản số hoá chưa sẵn sàng</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleReprocess}
                        disabled={processing}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                        Số hóa ngay
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="flex-1 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Text đã số hóa</CardTitle>
                    <CardDescription>
                      Nội dung đã được trích xuất từ tài liệu bằng OCR
                    </CardDescription>
                  </div>
                  {document.ocrText && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyText}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload}
                        title="Tải kết quả số hóa cuối cùng (có metadata và văn bản tái cấu trúc)"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Tải kết quả
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {document.ocrText ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                        {document.ocrText}
                      </pre>
                    </div>
                    {document.metadata?.ocrResult && (
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Độ tin cậy</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                              {((document.metadata.ocrResult.confidence || 0) * 100).toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Số dòng</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                              {document.metadata.ocrResult.totalLines || 0}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Số ký tự</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                              {document.ocrText.length.toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 text-gray-400" />
                    <p>Chưa có text đã số hóa</p>
                    {document.status !== "Đang xử lý" && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleReprocess}
                        disabled={processing}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                        Số hóa ngay
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restructured Text Tab */}
          <TabsContent value="restructured" className="flex-1 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      Văn bản đã tái cấu trúc
                    </CardTitle>
                    <CardDescription>
                      Văn bản đã được AI tổ chức lại với định dạng rõ ràng và cấu trúc tốt hơn
                    </CardDescription>
                  </div>
                  {document.metadata?.aiAnalysis?.restructuredText && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(document.metadata.aiAnalysis.restructuredText)
                          toast.success("Đã copy văn bản tái cấu trúc")
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([document.metadata.aiAnalysis.restructuredText], { type: "text/plain" })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement("a")
                          a.href = url
                          a.download = `${document.displayName || document.name}_restructured.txt`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                          toast.success("Đã tải văn bản tái cấu trúc")
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Tải về
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {document.metadata?.aiAnalysis?.restructuredText ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-purple-900">Văn bản đã được AI tái cấu trúc</span>
                      </div>
                      <p className="text-sm text-purple-700">
                        Văn bản đã được tổ chức lại với định dạng rõ ràng, headings, paragraphs và cấu trúc logic. 
                        Nội dung gốc được giữ nguyên, chỉ cải thiện format và tổ chức.
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-6 border-2 border-purple-200 shadow-sm">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                        {document.metadata.aiAnalysis.restructuredText}
                      </pre>
                    </div>

                    {/* Comparison with original */}
                    {document.ocrText && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">So sánh với văn bản gốc</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium mb-2 text-gray-600">Văn bản gốc (OCR)</div>
                              <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 max-h-40 overflow-auto">
                                <pre className="whitespace-pre-wrap font-mono">
                                  {document.ocrText.substring(0, 500)}...
                                </pre>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium mb-2 text-purple-600">Văn bản tái cấu trúc</div>
                              <div className="bg-purple-50 rounded p-3 text-xs text-purple-700 max-h-40 overflow-auto">
                                <pre className="whitespace-pre-wrap font-sans">
                                  {document.metadata.aiAnalysis.restructuredText.substring(0, 500)}...
                                </pre>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 text-xs text-muted-foreground">
                            💡 Văn bản tái cấu trúc có định dạng rõ ràng hơn, dễ đọc và tổ chức tốt hơn
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Brain className="h-12 w-12 mb-4 text-gray-400" />
                    <p>Chưa có văn bản tái cấu trúc</p>
                    <p className="text-xs mt-2">
                      Văn bản tái cấu trúc sẽ xuất hiện sau khi phân tích AI hoàn tất
                    </p>
                    {document.status === "Hoàn tất" && !document.metadata?.aiAnalysis && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleReprocess}
                        disabled={processing}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                        Số hóa lại để tạo văn bản tái cấu trúc
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis Tab */}
          <TabsContent value="analysis" className="flex-1 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  Phân tích AI
                </CardTitle>
                <CardDescription>
                  Kết quả phân tích nội dung và cấu trúc tài liệu bằng AI
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {document.metadata?.aiAnalysis ? (
                  <div className="space-y-4">
                    {/* Mục đích của Phân tích AI */}
                    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-5 w-5 text-purple-600" />
                          Mục đích Phân tích AI
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-purple-600">📋</span>
                            <div>
                              <div className="font-medium">Xác định loại tài liệu</div>
                              <div className="text-muted-foreground text-xs">Đề thi, Sách giáo khoa, Ngân hàng câu hỏi...</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600">📚</span>
                            <div>
                              <div className="font-medium">Phân tích cấu trúc</div>
                              <div className="text-muted-foreground text-xs">Các phần, chương, bài trong tài liệu</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-green-600">🏷️</span>
                            <div>
                              <div className="font-medium">Trích xuất chủ đề</div>
                              <div className="text-muted-foreground text-xs">Toán, Văn, Lý, Hóa, Sinh, Sử, Địa...</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-orange-600">📝</span>
                            <div>
                              <div className="font-medium">Tóm tắt nội dung</div>
                              <div className="text-muted-foreground text-xs">Tóm tắt ngắn gọn nội dung chính</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-red-600">🔄</span>
                            <div>
                              <div className="font-medium">Tái cấu trúc văn bản</div>
                              <div className="text-muted-foreground text-xs">Tổ chức lại với định dạng rõ ràng</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-indigo-600">🖼️</span>
                            <div>
                              <div className="font-medium">Phân tích layout</div>
                              <div className="text-muted-foreground text-xs">Bố cục, vị trí các phần trong hình ảnh</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Loại tài liệu</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {document.metadata.aiAnalysis.type === "exam" && "📝 Đề thi"}
                          {document.metadata.aiAnalysis.type === "textbook" && "📚 Sách giáo khoa"}
                          {document.metadata.aiAnalysis.type === "question_bank" && "📚 Ngân hàng câu hỏi"}
                          {document.metadata.aiAnalysis.type === "document" && "📄 Tài liệu"}
                        </Badge>
                      </CardContent>
                    </Card>

                    {document.metadata.aiAnalysis.keyTopics && document.metadata.aiAnalysis.keyTopics.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Chủ đề chính</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {document.metadata.aiAnalysis.keyTopics.map((topic: string, index: number) => (
                              <Badge key={index} variant="secondary">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {document.metadata.aiAnalysis.summary && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Tóm tắt</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {document.metadata.aiAnalysis.summary}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {document.metadata.aiAnalysis.structure?.sections && document.metadata.aiAnalysis.structure.sections.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Cấu trúc ({document.metadata.aiAnalysis.structure.sections.length} phần)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {document.metadata.aiAnalysis.structure.sections.map((section: any, index: number) => (
                              <div key={index} className="p-3 bg-gray-50 rounded border">
                                <div className="font-medium text-sm">{section.title}</div>
                                {section.content && (
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {section.content.substring(0, 100)}...
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Văn bản đã tái cấu trúc */}
                    {document.metadata.aiAnalysis.restructuredText && (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">Văn bản đã tái cấu trúc</CardTitle>
                              <CardDescription>
                                Văn bản đã được AI tổ chức lại với định dạng rõ ràng hơn
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(document.metadata.aiAnalysis.restructuredText)
                                  toast.success("Đã copy văn bản tái cấu trúc")
                                }}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const blob = new Blob([document.metadata.aiAnalysis.restructuredText], { type: "text/plain" })
                                  const url = URL.createObjectURL(blob)
                                  const a = document.createElement("a")
                                  a.href = url
                                  a.download = `${document.displayName || document.name}_restructured.txt`
                                  document.body.appendChild(a)
                                  a.click()
                                  document.body.removeChild(a)
                                  URL.revokeObjectURL(url)
                                  toast.success("Đã tải văn bản tái cấu trúc")
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Tải về
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 max-h-96 overflow-auto">
                              {document.metadata.aiAnalysis.restructuredText}
                            </pre>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            💡 Văn bản đã được AI tái cấu trúc để dễ đọc và tổ chức tốt hơn, giữ nguyên nội dung gốc
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Phân tích Layout */}
                    {document.metadata.aiAnalysis.layoutAnalysis && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Phân tích Layout</CardTitle>
                          <CardDescription>
                            Phân tích bố cục và cấu trúc hình ảnh của tài liệu
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {document.metadata.aiAnalysis.layoutAnalysis.regions && 
                           document.metadata.aiAnalysis.layoutAnalysis.regions.length > 0 ? (
                            <div className="space-y-3">
                              {document.metadata.aiAnalysis.layoutAnalysis.regions.map((region: any, index: number) => (
                                <div key={index} className="p-3 bg-gray-50 rounded border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">
                                      {region.type === "text" && "📝 Text"}
                                      {region.type === "image" && "🖼️ Hình ảnh"}
                                      {region.type === "table" && "📊 Bảng"}
                                      {region.type === "formula" && "🔢 Công thức"}
                                      {!["text", "image", "table", "formula"].includes(region.type) && region.type}
                                    </Badge>
                                    {region.position && (
                                      <Badge variant="secondary" className="text-xs">
                                        {region.position}
                                      </Badge>
                                    )}
                                  </div>
                                  {region.content && (
                                    <p className="text-sm text-muted-foreground">
                                      {region.content}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Không có thông tin layout chi tiết
                            </div>
                          )}
                          
                          {document.metadata.aiAnalysis.structure?.layout && (
                            <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
                              <div className="text-sm font-medium mb-2">Thông tin Layout:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {document.metadata.aiAnalysis.structure.layout.hasHeader && (
                                  <div>✓ Có Header</div>
                                )}
                                {document.metadata.aiAnalysis.structure.layout.hasFooter && (
                                  <div>✓ Có Footer</div>
                                )}
                                {document.metadata.aiAnalysis.structure.layout.hasImages && (
                                  <div>✓ Có Hình ảnh</div>
                                )}
                                {document.metadata.aiAnalysis.structure.layout.hasTables && (
                                  <div>✓ Có Bảng</div>
                                )}
                                {document.metadata.aiAnalysis.structure.layout.columns && (
                                  <div>Số cột: {document.metadata.aiAnalysis.structure.layout.columns}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {document.metadata.aiAnalysis.metadata && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Thống kê</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Số từ:</span>
                              <div className="font-semibold">{document.metadata.aiAnalysis.metadata.wordCount?.toLocaleString() || 0}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Số ký tự:</span>
                              <div className="font-semibold">{document.metadata.aiAnalysis.metadata.characterCount?.toLocaleString() || 0}</div>
                            </div>
                            {document.metadata.aiAnalysis.metadata.estimatedPages && (
                              <div>
                                <span className="text-muted-foreground">Trang ước tính:</span>
                                <div className="font-semibold">{document.metadata.aiAnalysis.metadata.estimatedPages}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Brain className="h-12 w-12 mb-4 text-gray-400" />
                    <p className="font-medium mb-2">Chưa có phân tích AI</p>
                    
                    {/* Giải thích mục đích */}
                    <Card className="w-full max-w-2xl mt-4 bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-base">Mục đích của Phân tích AI</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <span className="text-lg">📋</span>
                            <div>
                              <div className="font-medium text-gray-900">Xác định loại tài liệu</div>
                              <div className="text-muted-foreground">Tự động nhận diện: Đề thi, Sách giáo khoa, Ngân hàng câu hỏi, hoặc Tài liệu thông thường</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-lg">📚</span>
                            <div>
                              <div className="font-medium text-gray-900">Phân tích cấu trúc</div>
                              <div className="text-muted-foreground">Nhận diện các phần, chương, bài và mối quan hệ giữa chúng</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-lg">🏷️</span>
                            <div>
                              <div className="font-medium text-gray-900">Trích xuất chủ đề chính</div>
                              <div className="text-muted-foreground">Xác định các môn học và chủ đề: Toán, Văn, Lý, Hóa, Sinh, Sử, Địa, Anh...</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-lg">📝</span>
                            <div>
                              <div className="font-medium text-gray-900">Tạo tóm tắt</div>
                              <div className="text-muted-foreground">Tóm tắt ngắn gọn nội dung chính của tài liệu</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-lg">🔄</span>
                            <div>
                              <div className="font-medium text-gray-900">Tái cấu trúc văn bản</div>
                              <div className="text-muted-foreground">Tổ chức lại văn bản với định dạng rõ ràng, headings, paragraphs để dễ đọc hơn</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-lg">🖼️</span>
                            <div>
                              <div className="font-medium text-gray-900">Phân tích layout</div>
                              <div className="text-muted-foreground">Phân tích bố cục hình ảnh: vị trí text, images, tables, formulas và mối quan hệ giữa chúng</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hướng dẫn */}
                    <div className="mt-6 text-center space-y-2">
                      {document.status === "Hoàn tất" && document.ocrText ? (
                        <>
                          <p className="text-sm text-gray-600">
                            Tài liệu đã số hóa nhưng chưa có phân tích AI. 
                            Phân tích AI sẽ tự động chạy khi bạn số hóa lại.
                          </p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={handleReprocess}
                            disabled={processing}
                          >
                            <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                            Số hóa lại để phân tích AI
                          </Button>
                        </>
                      ) : document.status === "Đang xử lý" ? (
                        <p className="text-sm text-gray-600">
                          Đang xử lý... Phân tích AI sẽ xuất hiện sau khi số hóa hoàn tất
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Phân tích AI sẽ tự động chạy sau khi số hóa tài liệu hoàn tất
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Processing Logs Tab */}
          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Log xử lý</CardTitle>
                <CardDescription>
                  Chi tiết quá trình xử lý tài liệu
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {document.processingLogs && document.processingLogs.length > 0 ? (
                  <div className="space-y-2">
                    {document.processingLogs.map((log, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border text-sm",
                          log.stage === "error" && "bg-red-50 border-red-200",
                          log.stage === "completed" && "bg-green-50 border-green-200",
                          log.stage === "ocr" && "bg-blue-50 border-blue-200",
                          log.stage === "processing" && "bg-yellow-50 border-yellow-200",
                          !["error", "completed", "ocr", "processing"].includes(log.stage) && "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {log.stage === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                            {log.stage === "completed" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            {log.stage === "ocr" && <Eye className="h-4 w-4 text-blue-600" />}
                            {log.stage === "processing" && <Loader2 className="h-4 w-4 text-yellow-600" />}
                            <span className="font-medium">{log.stage}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString("vi-VN")}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{log.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Chưa có log xử lý</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {document.processedAt
            ? `Hoàn tất: ${new Date(document.processedAt).toLocaleString("vi-VN")}`
            : `Tải lên: ${new Date(document.createdAt).toLocaleString("vi-VN")}`}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Đóng
          </Button>
          {document.status === "Hoàn tất" && (
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Tải bản số hoá
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
