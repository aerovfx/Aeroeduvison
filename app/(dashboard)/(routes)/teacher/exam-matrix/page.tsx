"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  Upload, 
  Plus, 
  Search, 
  FileText, 
  Grid3x3,
  Eye,
  Edit,
  Trash2,
  Copy,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { DigitizeMatrixModal } from "@/components/exam-matrix/digitize-modal"
import { GenerateExamModal } from "@/components/exam-matrix/generate-exam-modal"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

type MatrixStatus = "Tất cả" | "Hàng đợi" | "Đang xử lý" | "Hoàn tất" | "Lỗi"

interface ExamMatrix {
  id: string
  name: string
  grade: string
  examType: string
  type: string
  status: string
  totalQuestions: number
  createdAt: string
}

export default function ExamMatrixPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [matrices, setMatrices] = useState<ExamMatrix[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<MatrixStatus>("Tất cả")
  const [searchQuery, setSearchQuery] = useState("")
  const [examTypeFilter, setExamTypeFilter] = useState("Tất cả loại đề")
  const [isDigitizeModalOpen, setIsDigitizeModalOpen] = useState(false)
  const [isGenerateExamModalOpen, setIsGenerateExamModalOpen] = useState(false)
  const [selectedMatrixForExam, setSelectedMatrixForExam] = useState<{ id: string; name: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [matrixToDelete, setMatrixToDelete] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  useEffect(() => {
    fetchMatrices()
  }, [selectedStatus, examTypeFilter])

  const fetchMatrices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") {
        params.append("status", selectedStatus)
      }
      if (examTypeFilter !== "Tất cả loại đề") {
        params.append("examType", examTypeFilter)
      }

      const response = await fetch(`/api/exam-matrices?${params.toString()}`)
      
      if (!response.ok) {
        let errorMessage = "Không thể tải danh sách ma trận"
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
          console.error("Fetch matrices error response:", error)
          
          // Show specific error for schema issues
          if (errorMessage.includes("Database schema")) {
            errorMessage = "Database chưa được cập nhật. Vui lòng chạy: npx prisma db push"
          }
        } catch (e) {
          console.error("Failed to parse error response:", e)
          errorMessage = `Lỗi khi tải danh sách (status ${response.status})`
        }
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      setMatrices(data.matrices || [])
    } catch (error: any) {
      console.error("Error fetching matrices:", error)
      const errorMessage = error.message || "Không thể tải danh sách ma trận"
      toast.error(errorMessage)
      
      // Log full error in development
      if (process.env.NODE_ENV === "development") {
        console.error("Full error details:", error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (status: MatrixStatus) => {
    setSelectedStatus(status)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const filteredMatrices = matrices.filter((matrix) => {
    if (searchQuery) {
      return matrix.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/exam-matrices/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete matrix")
      
      toast.success("Đã xóa ma trận")
      fetchMatrices()
      setDeleteDialogOpen(false)
      setMatrixToDelete(null)
    } catch (error) {
      console.error("Error deleting matrix:", error)
      toast.error("Không thể xóa ma trận")
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      setDuplicating(id)
      const response = await fetch(`/api/exam-matrices/${id}/duplicate`, {
        method: "POST",
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to duplicate matrix")
      }
      
      const data = await response.json()
      toast.success("Đã nhân bản ma trận thành công")
      fetchMatrices()
    } catch (error: any) {
      console.error("Error duplicating matrix:", error)
      toast.error(error.message || "Không thể nhân bản ma trận")
    } finally {
      setDuplicating(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Hoàn tất":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "Đang xử lý":
        return <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
      case "Lỗi":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "Hàng đợi":
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      "Hoàn tất": "bg-green-100 text-green-800",
      "Đang xử lý": "bg-orange-100 text-orange-800",
      "Lỗi": "bg-red-100 text-red-800",
      "Hàng đợi": "bg-gray-100 text-gray-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    const dateStr = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    return `${time} / ${dateStr}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Ma trận đề</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Quản lý và tạo ma trận đề thi
              </p>
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs value={selectedStatus} onValueChange={(v) => handleStatusChange(v as MatrixStatus)}>
            <TabsList className="grid w-full max-w-md grid-cols-5">
              <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
              <TabsTrigger value="Hàng đợi">Hàng đợi</TabsTrigger>
              <TabsTrigger value="Đang xử lý">Đang xử lý</TabsTrigger>
              <TabsTrigger value="Hoàn tất">Hoàn tất</TabsTrigger>
              <TabsTrigger value="Lỗi">Lỗi</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm ma trận..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tất cả loại đề" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả loại đề">Tất cả loại đề</SelectItem>
                <SelectItem value="Kiểm tra 1 tiết">Kiểm tra 1 tiết</SelectItem>
                <SelectItem value="Kiểm tra giữa kỳ">Kiểm tra giữa kỳ</SelectItem>
                <SelectItem value="Kiểm tra cuối kỳ">Kiểm tra cuối kỳ</SelectItem>
                <SelectItem value="Thi học kỳ">Thi học kỳ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsDigitizeModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Số hoá ma trận
            </Button>
            <Button onClick={() => router.push("/teacher/exam-matrix/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo ma trận
            </Button>
          </div>
        </div>
      </div>

      {/* Matrices Table */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMatrices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Grid3x3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Chưa có ma trận nào</p>
              <p className="text-sm text-muted-foreground mb-4">
                Bắt đầu bằng cách tạo ma trận mới
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDigitizeModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Số hoá ma trận
                </Button>
                <Button onClick={() => router.push("/teacher/exam-matrix/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo ma trận
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="flex items-center gap-2">
                    TÊN MA TRẬN
                    <span className="text-muted-foreground">↓</span>
                  </TableHead>
                  <TableHead>LOẠI</TableHead>
                  <TableHead>LOẠI ĐỀ</TableHead>
                  <TableHead className="flex items-center gap-2">
                    THỜI GIAN
                    <span className="text-muted-foreground">↓</span>
                  </TableHead>
                  <TableHead>TRẠNG THÁI</TableHead>
                  <TableHead>HÀNH ĐỘNG</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatrices.map((matrix) => (
                  <TableRow key={matrix.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div className="font-medium">{matrix.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{matrix.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {matrix.examType || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(matrix.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(matrix.status)}
                        <Badge className={cn("text-xs", getStatusBadge(matrix.status))}>
                          {matrix.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Xem - Available for all matrices */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (matrix.type === "Số hoá") {
                              router.push(`/teacher/exam-matrix/${matrix.id}/review`)
                            } else {
                              router.push(`/teacher/exam-matrix/${matrix.id}`)
                            }
                          }}
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Sửa - Available for completed matrices */}
                        {matrix.status === "Hoàn tất" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/teacher/exam-matrix/${matrix.id}/edit`)}
                            title="Sửa ma trận"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Tạo đề thi - Only for completed matrices */}
                        {matrix.status === "Hoàn tất" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedMatrixForExam({ id: matrix.id, name: matrix.name })
                              setIsGenerateExamModalOpen(true)
                            }}
                            title="Tạo đề thi từ ma trận"
                            className="text-primary hover:text-primary"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Nhân bản - Available for all matrices except processing */}
                        {matrix.status !== "Đang xử lý" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(matrix.id)}
                            disabled={duplicating === matrix.id}
                            title="Nhân bản ma trận"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {duplicating === matrix.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Xóa - Available for all matrices except processing */}
                        {matrix.status !== "Đang xử lý" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setMatrixToDelete(matrix.id)
                              setDeleteDialogOpen(true)
                            }}
                            title="Xóa ma trận"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Digitize Modal */}
      <DigitizeMatrixModal
        isOpen={isDigitizeModalOpen}
        onClose={() => setIsDigitizeModalOpen(false)}
        onUploadComplete={() => {
          fetchMatrices()
          setIsDigitizeModalOpen(false)
        }}
      />

      {/* Generate Exam Modal */}
      {selectedMatrixForExam && (
        <GenerateExamModal
          isOpen={isGenerateExamModalOpen}
          onClose={() => {
            setIsGenerateExamModalOpen(false)
            setSelectedMatrixForExam(null)
          }}
          matrixId={selectedMatrixForExam.id}
          matrixName={selectedMatrixForExam.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa ma trận này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMatrixToDelete(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => matrixToDelete && handleDelete(matrixToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
