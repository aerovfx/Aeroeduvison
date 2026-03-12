"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, CheckCircle2, XCircle, FileText, FileCode2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

interface GenerateExamModalProps {
  isOpen: boolean
  onClose: () => void
  matrixId: string
  matrixName: string
}

interface RequirementStatus {
  topic: string
  questionType: string
  cognitiveLevel: string
  required: number
  available: number
  status: "sufficient" | "insufficient" | "missing"
}

interface PreviewData {
  matrix: {
    id: string
    name: string
    grade: string
    examType: string
    totalQuestions: number
    totalScore: number
  }
  requirements: RequirementStatus[]
  summary: {
    totalRequired: number
    totalAvailable: number
    coverage: number
    canGenerate: boolean
  }
}

export function GenerateExamModal({
  isOpen,
  onClose,
  matrixId,
  matrixName,
}: GenerateExamModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [generating, setGenerating] = useState(false)
  const [exportingToLatex, setExportingToLatex] = useState(false)

  // Load preview when modal opens
  useEffect(() => {
    if (isOpen && matrixId) {
      loadPreview()
      setTitle(`${matrixName} - Đề thi`)
      setDescription(`Đề thi được tạo tự động từ ma trận: ${matrixName}`)
    }
  }, [isOpen, matrixId, matrixName])

  const loadPreview = async () => {
    try {
      setPreviewLoading(true)
      const response = await fetch(`/api/exams/generate-from-matrix?matrixId=${matrixId}`)
      
      if (!response.ok) {
        throw new Error("Failed to load preview")
      }
      
      const data = await response.json()
      if (data.success) {
        setPreviewData(data.data)
      }
    } catch (error: any) {
      console.error("Preview error:", error)
      toast.error("Không thể tải preview")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên đề thi")
      return
    }

    setGenerating(true)

    try {
      const response = await fetch("/api/exams/generate-from-matrix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matrixId,
          title,
          description,
          useAIForMissing: false, // TODO: Add option
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || err.error || "Không thể tạo đề thi")
      }

      const data = await response.json()

      if (data.success && data.data) {
        const { examId, message } = data.data
        toast.success(message || "Đã tạo đề thi từ ma trận!")
        onClose()
        // Cho user chọn: Xem đề thi hoặc Mở Soạn LaTeX với đề vừa tạo
        if (examId) {
          const openLatex = window.confirm("Đã tạo đề thi. Bạn có muốn mở Soạn LaTeX với đề vừa tạo không?")
          if (openLatex) {
            try {
              const res = await fetch("/api/latex-projects/export-from-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ examId }),
              })
              if (res.ok) {
                const d = await res.json()
                router.push(`/teacher/latex-documents/${d.id}`)
                return
              }
            } catch (_) {}
          }
        }
        router.push(`/teacher/exams`)
      }
    } catch (error: any) {
      console.error("Generate error:", error)
      toast.error(error.message || "Không thể tạo đề thi")
    } finally {
      setGenerating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sufficient":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "insufficient":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "missing":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const handleExportMatrixToLatex = async () => {
    setExportingToLatex(true)
    try {
      const res = await fetch("/api/latex-projects/export-from-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrixId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Xuất thất bại")
      }
      const data = await res.json()
      toast.success("Đã tạo tài liệu LaTeX. Đang mở...")
      onClose()
      router.push(`/teacher/latex-documents/${data.id}`)
    } catch (e: any) {
      toast.error(e.message || "Không thể xuất sang LaTeX")
    } finally {
      setExportingToLatex(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sufficient":
        return "bg-green-100 text-green-800"
      case "insufficient":
        return "bg-yellow-100 text-yellow-800"
      case "missing":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tạo đề thi từ ma trận
          </DialogTitle>
          <DialogDescription>
            Hệ thống sẽ tự động chọn câu hỏi từ ngân hàng câu hỏi theo yêu cầu của ma trận
          </DialogDescription>
        </DialogHeader>

        {previewLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : previewData ? (
          <div className="space-y-6 mt-4">
            {/* Exam Info Form */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tên đề thi *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tên đề thi"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mô tả
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả đề thi (tùy chọn)"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-blue-600 mb-1">Tổng câu hỏi cần</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {previewData.summary.totalRequired}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 mb-1">Có sẵn</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {previewData.summary.totalAvailable}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 mb-1">Độ phủ</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {Math.round(previewData.summary.coverage * 100)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 mb-1">Trạng thái</div>
                  <div className="mt-1">
                    {previewData.summary.canGenerate ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Có thể tạo
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Thiếu câu hỏi
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Requirements List */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Chi tiết yêu cầu</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {previewData.requirements.map((req, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(req.status)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {req.topic}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {req.questionType} • {req.cognitiveLevel}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {req.available} / {req.required}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          câu hỏi
                        </div>
                      </div>
                      <Badge className={getStatusBadge(req.status)}>
                        {req.status === "sufficient"
                          ? "Đủ"
                          : req.status === "insufficient"
                          ? "Thiếu"
                          : "Không có"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning if insufficient */}
            {!previewData.summary.canGenerate && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      Cảnh báo: Không đủ câu hỏi
                    </p>
                    <p className="text-sm text-yellow-800">
                      Một số yêu cầu không có đủ câu hỏi trong ngân hàng câu hỏi. 
                      Bạn có thể tạo đề thi với số câu hỏi có sẵn hoặc thêm câu hỏi vào ngân hàng trước.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExportMatrixToLatex}
                disabled={exportingToLatex}
                className="gap-2 text-muted-foreground"
              >
                {exportingToLatex ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileCode2 className="h-4 w-4" />
                )}
                Xuất ma trận sang LaTeX
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Hủy
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !title.trim()}
                  className="gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Tạo đề thi
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Không thể tải preview. Vui lòng thử lại.
            </p>
            <Button variant="outline" onClick={loadPreview} className="mt-4">
              Thử lại
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
