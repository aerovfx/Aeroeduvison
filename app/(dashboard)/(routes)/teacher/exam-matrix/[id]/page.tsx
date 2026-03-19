"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Edit,
  Trash2,
  Copy,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Sparkles,
  FileCode2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { MatrixTable } from "@/components/exam-matrix/matrix-table"
import { MATRIX_TYPES, type MatrixSection } from "@/lib/constants/question-bank"

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
  matrixType?: string
  customSections?: MatrixSection[]
  sectionScores?: Record<string, number>
  createdAt: string
  updatedAt: string
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
}

export default function MatrixDetailPage() {
  const params = useParams()
  const router = useRouter()
  const matrixId = params.id as string

  const [matrix, setMatrix] = useState<ExamMatrix | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [generateExamModalOpen, setGenerateExamModalOpen] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [exportingLatex, setExportingLatex] = useState(false)

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

  const handleDuplicate = async () => {
    if (!matrix) return

    try {
      setDuplicating(true)
      const response = await fetch(`/api/exam-matrices/${matrixId}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to duplicate matrix")
      }

      const data = await response.json()
      toast.success("Đã nhân bản ma trận thành công")
      router.push(`/teacher/exam-matrix/${data.matrix.id}`)
    } catch (error: any) {
      console.error("Error duplicating matrix:", error)
      toast.error(error.message || "Không thể nhân bản ma trận")
    } finally {
      setDuplicating(false)
    }
  }

  const handleExportToLatex = async () => {
    if (!matrix) return

    try {
      setExportingLatex(true)
      const response = await fetch("/api/latex-projects/export-from-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrixId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to export to LaTeX")
      }

      const data = await response.json()
      toast.success("Đã xuất đề thi sang LaTeX thành công")
      router.push(`/teacher/latex-documents/${data.id}`)
    } catch (error: any) {
      console.error("Error exporting to LaTeX:", error)
      toast.error(error.message || "Không thể xuất sang LaTeX")
    } finally {
      setExportingLatex(false)
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

  const canGenerateExam = matrix.status === "Hoàn tất" && matrix.topics && matrix.topics.length > 0

  // Derive sections from matrixType / customSections
  const activeSections: MatrixSection[] =
    matrix.matrixType === "custom"
      ? (matrix.customSections ?? [])
      : (MATRIX_TYPES.find((t) => t.id === (matrix.matrixType ?? "type3"))?.sections
          ?? MATRIX_TYPES[2].sections)

  // Convert matrix topics to MatrixTable format
  const tableTopics = (matrix.topics || []).map((topic) => ({
    id: topic.id,
    order: topic.order,
    topic: topic.topic,
    content: topic.content || "",
    distributions: topic.distributions,
    percentageScore: topic.percentageScore,
  }))

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
              {matrix.status === "Hoàn tất" && (
                <Button
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 gap-2"
                  onClick={handleExportToLatex}
                  disabled={exportingLatex}
                >
                  {exportingLatex ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileCode2 className="h-4 w-4" />
                  )}
                  Xuất LaTeX
                </Button>
              )}
              {matrix.status === "Hoàn tất" && (
                <Button
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 gap-2"
                  onClick={() => router.push(`/teacher/exam-matrix/${matrixId}/edit`)}
                >
                  <Edit className="h-4 w-4" />
                  Sửa
                </Button>
              )}
              <Button
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 gap-2"
                onClick={handleDuplicate}
                disabled={duplicating}
              >
                {duplicating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Nhân bản
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Matrix Info */}
            <div className="lg:col-span-1 space-y-4">
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
                  <div>
                    <p className="text-sm text-muted-foreground">Loại</p>
                    <Badge className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">{matrix.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ngày tạo</p>
                    <p className="font-medium">
                      {new Date(matrix.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Matrix Table */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cấu trúc ma trận</CardTitle>
                  <CardDescription>
                    {matrix.topics?.length || 0} chủ đề
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {matrix.topics && matrix.topics.length > 0 ? (
                    <MatrixTable
                      sections={activeSections}
                      topics={tableTopics}
                      totalScore={matrix.totalScore}
                      sectionScores={matrix.sectionScores ?? {}}
                      onUpdateTopic={() => {}}
                      onUpdateDistribution={() => {}}
                      onDeleteTopic={() => {}}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-gray-50">
                      <FileText className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-sm text-gray-600">
                        Ma trận chưa có chủ đề. Vui lòng chỉnh sửa để thêm chủ đề.
                      </p>
                      {matrix.status === "Hoàn tất" && (
                        <Button
                          className="mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          onClick={() => router.push(`/teacher/exam-matrix/${matrixId}/edit`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa ma trận
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
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
