"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Grid3x3,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { GenerateExamModal } from "@/components/exam-matrix/generate-exam-modal"

interface ExamMatrix {
  id: string
  name: string
  grade: string
  examType: string
  duration: number
  totalScore: number
  totalQuestions: number
  type: string
  status: string
  originalFileUrl?: string
  digitizedFileUrl?: string
  processingError?: string
  createdAt: string
  updatedAt: string
  processedAt?: string
  topics?: Array<{
    id: string
    order: number
    topic: string
    content?: string
    percentageScore?: number
    distributions: Array<{
      questionType: string
      cognitiveLevel: string
      count: number
    }>
  }>
  processingLogs?: Array<{
    stage: string
    message: string
    createdAt: string
  }>
}

export default function MatrixReviewPage() {
  const params = useParams()
  const router = useRouter()
  const matrixId = params.id as string

  const [matrix, setMatrix] = useState<ExamMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [generateExamModalOpen, setGenerateExamModalOpen] = useState(false)

  useEffect(() => {
    fetchMatrix()
  }, [matrixId])

  const fetchMatrix = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/exam-matrices/${matrixId}`)
      if (!response.ok) throw new Error("Failed to fetch matrix")
      
      const data = await response.json()
      setMatrix(data.matrix)
    } catch (error) {
      console.error("Error fetching matrix:", error)
      toast.error("Không thể tải ma trận")
      router.push("/teacher/exam-matrix")
    } finally {
      setLoading(false)
    }
  }

  const getFileUrl = (url?: string) => {
    if (!url) return ""
    
    // If URL starts with /uploads/, convert to API route
    if (url.startsWith("/uploads/")) {
      const path = url.replace("/uploads/", "")
      return `/api/exam-matrices/file/${path}`
    }
    
    // If already an API route or external URL, return as is
    if (url.startsWith("/api/") || url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }
    
    // Default: try to construct the path
    const cleanPath = url.replace(/^\//, "")
    return `/api/exam-matrices/file/${cleanPath}`
  }

  const handleDownload = async () => {
    if (!matrix) return

    const fileUrl = matrix.digitizedFileUrl || matrix.originalFileUrl
    if (!fileUrl) {
      toast.error("Không có file để tải xuống")
      return
    }

    try {
      const url = getFileUrl(fileUrl)
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to download file")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `${matrix.name}_${new Date().getTime()}.${fileUrl.split('.').pop()}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
      toast.success("Đã tải xuống thành công")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Không thể tải xuống file")
    }
  }

  const handleDelete = async () => {
    if (!matrix) return

    try {
      const response = await fetch(`/api/exam-matrices/${matrixId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete matrix")

      toast.success("Đã xóa ma trận thành công")
      router.push("/teacher/exam-matrix")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Không thể xóa ma trận")
    }
  }

  const handleReprocess = async () => {
    if (!matrix) return

    setProcessing(true)
    try {
      // TODO: Implement reprocess API
      toast.success("Đã gửi yêu cầu số hóa lại")
      setTimeout(() => {
        fetchMatrix()
      }, 2000)
    } catch (error) {
      console.error("Reprocess error:", error)
      toast.error("Không thể số hóa lại")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!matrix) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        <p className="text-lg font-semibold">Không tìm thấy ma trận</p>
        <Button onClick={() => router.push("/teacher/exam-matrix")} className="mt-4">
          Quay lại
        </Button>
      </div>
    )
  }

  const displayImageUrl = matrix.digitizedFileUrl || matrix.originalFileUrl
  const canGenerateExam = matrix.status === "Hoàn tất" && matrix.topics && matrix.topics.length > 0

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/teacher/exam-matrix")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{matrix.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      matrix.status === "Hoàn tất"
                        ? "default"
                        : matrix.status === "Đang xử lý"
                        ? "secondary"
                        : matrix.status === "Lỗi"
                        ? "destructive"
                        : "outline"
                    }
                  >
                    {matrix.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {matrix.grade} • {matrix.examType}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {canGenerateExam && (
                <Button
                  onClick={() => setGenerateExamModalOpen(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Tạo đề thi
                </Button>
              )}
              {displayImageUrl && (
                <Button variant="outline" onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Tải xuống
                </Button>
              )}
              {matrix.status === "Hoàn tất" && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/teacher/exam-matrix/${matrixId}/edit`)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Sửa
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push(`/teacher/exam-matrix/${matrixId}`)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Xem chi tiết
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          <Tabs defaultValue="image" className="space-y-4">
            <TabsList>
              <TabsTrigger value="image">Hình ảnh</TabsTrigger>
              <TabsTrigger value="details">Chi tiết</TabsTrigger>
              {matrix.processingLogs && matrix.processingLogs.length > 0 && (
                <TabsTrigger value="logs">Nhật ký xử lý</TabsTrigger>
              )}
            </TabsList>

            {/* Image Tab */}
            <TabsContent value="image" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Hình ảnh ma trận</CardTitle>
                      <CardDescription>
                        {matrix.status === "Hoàn tất"
                          ? "Ma trận đã được số hóa thành công"
                          : matrix.status === "Đang xử lý"
                          ? "Đang xử lý ma trận..."
                          : matrix.status === "Lỗi"
                          ? "Số hóa thất bại"
                          : "Đang chờ xử lý"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {displayImageUrl && (
                        <Button variant="outline" size="sm" onClick={handleDownload}>
                          <Download className="h-4 w-4 mr-2" />
                          Tải xuống
                        </Button>
                      )}
                      {matrix.status === "Lỗi" && (
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
                  </div>
                </CardHeader>
                <CardContent>
                  {matrix.status === "Hoàn tất" || matrix.status === "Đang xử lý" ? (
                    displayImageUrl ? (
                      <div className="space-y-4">
                        <div className="relative border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={getFileUrl(displayImageUrl)}
                            alt={matrix.name}
                            className="w-full h-auto max-h-[800px] object-contain mx-auto"
                            onError={(e) => {
                              console.error("Image load error:", displayImageUrl)
                              e.currentTarget.src = "/placeholder-image.png"
                            }}
                          />
                        </div>

                        {/* Action Buttons Overlay */}
                        <div className="flex flex-wrap gap-2 justify-center">
                          {canGenerateExam && (
                            <Button
                              onClick={() => setGenerateExamModalOpen(true)}
                              size="lg"
                              className="gap-2"
                            >
                              <Sparkles className="h-5 w-5" />
                              Tạo đề thi từ ma trận này
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => router.push(`/teacher/exam-matrix/${matrixId}`)}
                            size="lg"
                            className="gap-2"
                          >
                            <Grid3x3 className="h-5 w-5" />
                            Xem ma trận chi tiết
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDownload}
                            size="lg"
                            className="gap-2"
                          >
                            <Download className="h-5 w-5" />
                            Tải xuống file
                          </Button>
                          {matrix.status === "Hoàn tất" && (
                            <Button
                              variant="outline"
                              onClick={() => router.push(`/teacher/exam-matrix/${matrixId}/edit`)}
                              size="lg"
                              className="gap-2"
                            >
                              <Edit className="h-5 w-5" />
                              Chỉnh sửa ma trận
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-gray-50">
                        <FileText className="h-16 w-16 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 mb-4">
                          Không có hình ảnh để hiển thị
                        </p>
                        <Button variant="outline" onClick={handleReprocess} disabled={processing}>
                          <RefreshCw className={cn("h-4 w-4 mr-2", processing && "animate-spin")} />
                          Số hóa lại
                        </Button>
                      </div>
                    )
                  ) : matrix.status === "Lỗi" ? (
                    <div className="flex flex-col items-center justify-center p-12">
                      <div className="text-center space-y-4 p-8 bg-red-50 rounded-lg border border-red-200 max-w-md">
                        <XCircle className="h-16 w-16 text-red-600 mx-auto" />
                        <div>
                          <h3 className="font-semibold text-red-900 mb-2">Số hóa thất bại</h3>
                          <p className="text-sm text-red-700 mb-4">
                            {matrix.processingError || "Không thể xử lý file ma trận. Vui lòng thử lại."}
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
                    <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-gray-50">
                      <Clock className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600 mb-2">Đang chờ xử lý</p>
                      <p className="text-xs text-gray-500">
                        Ma trận đang trong hàng đợi và sẽ được xử lý sớm
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Thông tin ma trận</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Tên ma trận</p>
                      <p className="font-medium">{matrix.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Khối</p>
                      <p className="font-medium">{matrix.grade}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loại đề kiểm tra</p>
                      <p className="font-medium">{matrix.examType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Thời gian làm bài</p>
                      <p className="font-medium">{matrix.duration} phút</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng điểm</p>
                      <p className="font-medium">{matrix.totalScore} điểm</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng số câu hỏi</p>
                      <p className="font-medium">{matrix.totalQuestions} câu</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trạng thái</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Trạng thái</p>
                      <Badge
                        variant={
                          matrix.status === "Hoàn tất"
                            ? "default"
                            : matrix.status === "Đang xử lý"
                            ? "secondary"
                            : matrix.status === "Lỗi"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {matrix.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loại</p>
                      <p className="font-medium">{matrix.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ngày tạo</p>
                      <p className="font-medium">
                        {new Date(matrix.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    {matrix.processedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Ngày xử lý</p>
                        <p className="font-medium">
                          {new Date(matrix.processedAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    )}
                    {matrix.topics && matrix.topics.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Số chủ đề</p>
                        <p className="font-medium">{matrix.topics.length} chủ đề</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {matrix.topics && matrix.topics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cấu trúc ma trận</CardTitle>
                    <CardDescription>
                      {matrix.topics.length} chủ đề đã được phân tích
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {matrix.topics.map((topic, index) => (
                        <div
                          key={topic.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground w-8">
                              {topic.order}
                            </span>
                            <div>
                              <p className="font-medium">{topic.topic}</p>
                              {topic.content && (
                                <p className="text-sm text-muted-foreground">{topic.content}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              {topic.distributions.reduce((sum, d) => sum + d.count, 0)} câu
                            </span>
                            {topic.percentageScore && (
                              <Badge variant="outline">
                                {topic.percentageScore.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Processing Logs Tab */}
            {matrix.processingLogs && matrix.processingLogs.length > 0 && (
              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Nhật ký xử lý</CardTitle>
                    <CardDescription>
                      Chi tiết quá trình số hóa ma trận
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {matrix.processingLogs.map((log, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {log.stage === "completed" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : log.stage === "error" ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{log.stage}</p>
                            {log.message && (
                              <p className="text-sm text-muted-foreground mt-1">{log.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.createdAt).toLocaleString("vi-VN")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Generate Exam Modal */}
      {canGenerateExam && (
        <GenerateExamModal
          isOpen={generateExamModalOpen}
          onClose={() => setGenerateExamModalOpen(false)}
          matrixId={matrixId}
          matrixName={matrix.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa ma trận</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa ma trận "{matrix.name}"? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
