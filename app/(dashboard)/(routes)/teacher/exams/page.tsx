"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  FileText, 
  Eye,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
  Play,
  Pause,
  Calendar,
  Users,
  Award
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { PageHeader } from "@/components/teacher/PageHeader"
import { PageFilters } from "@/components/teacher/PageFilters"
import { TableLoadingSkeleton } from "@/components/teacher/LoadingSkeleton"
import { EmptyState } from "@/components/teacher/EmptyState"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

type ExamStatus = "Tất cả" | "Nháp" | "Đã lên lịch" | "Đang diễn ra" | "Đã hoàn thành" | "Đã lưu trữ"
type ExamType = "Tất cả loại" | "Kiểm tra 1 tiết" | "Kiểm tra giữa kỳ" | "Thi cuối kỳ" | "Thi thử" | "Bài tập"

interface Exam {
  id: string
  title: string
  description?: string
  examType: string
  status: string
  duration: number
  totalQuestions: number
  totalPoints: number
  createdAt: string
  updatedAt: string
  startTime?: string
  endTime?: string
  submissionsCount?: number
}

export default function ExamsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<ExamStatus>("Tất cả")
  const [selectedType, setSelectedType] = useState<ExamType>("Tất cả loại")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchExams()
    }
  }, [session, selectedStatus, selectedType])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") {
        params.append("status", selectedStatus)
      }
      if (selectedType !== "Tất cả loại") {
        params.append("examType", selectedType)
      }
      if (searchQuery) {
        params.append("search", searchQuery)
      }

      // For now, return empty array until API is implemented
      // TODO: Replace with actual API call when Exam model is added
      const response = await fetch(`/api/teacher/exams?${params.toString()}`)
      
      if (!response.ok) {
        // If API doesn't exist yet, show empty state
        if (response.status === 404) {
          setExams([])
          return
        }
        
        let errorMessage = "Không thể tải danh sách đề thi"
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } catch {
          // Ignore JSON parse errors
        }
        toast.error(errorMessage)
        setExams([])
        return
      }
      
      const data = await response.json()
      setExams(data.exams || [])
    } catch (error: any) {
      console.error("Error fetching exams:", error)
      // Don't show error if API doesn't exist yet
      if (!error.message?.includes("404")) {
        toast.error("Lỗi khi tải danh sách đề thi")
      }
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchExams()
  }

  const handleDelete = async (examId: string) => {
    try {
      const response = await fetch(`/api/teacher/exams/${examId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Không thể xóa đề thi")
      }

      toast.success("Đã xóa đề thi")
      fetchExams()
      setDeleteDialogOpen(false)
      setExamToDelete(null)
    } catch (error: any) {
      console.error("Error deleting exam:", error)
      toast.error(error.message || "Lỗi khi xóa đề thi")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đã hoàn thành":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Đã hoàn thành</Badge>
      case "Đang diễn ra":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Play className="w-3 h-3 mr-1" />Đang diễn ra</Badge>
      case "Đã lên lịch":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Đã lên lịch</Badge>
      case "Nháp":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Nháp</Badge>
      case "Đã lưu trữ":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Đã lưu trữ</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    const typeMap: { [key: string]: { label: string; color: string } } = {
      "Kiểm tra 1 tiết": { label: "1 tiết", color: "bg-blue-100 text-blue-800" },
      "Kiểm tra giữa kỳ": { label: "Giữa kỳ", color: "bg-orange-100 text-orange-800" },
      "Thi cuối kỳ": { label: "Cuối kỳ", color: "bg-red-100 text-red-800" },
      "Thi thử": { label: "Thi thử", color: "bg-green-100 text-green-800" },
      "Bài tập": { label: "Bài tập", color: "bg-purple-100 text-purple-800" },
    }
    
    const typeInfo = typeMap[type] || { label: type, color: "bg-gray-100 text-gray-800" }
    return <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
  }

  const filteredExams = exams.filter((exam) => {
    if (searchQuery) {
      return exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             exam.description?.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <PageHeader
        title="Đề thi"
        description="Quản lý và tổ chức các đề thi cho học sinh. Tạo, chỉnh sửa và theo dõi kết quả thi."
        icon={<FileText className="h-6 w-6" />}
        badge="AI"
        actions={
          <Button onClick={() => router.push("/teacher/exams/create")} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Tạo đề thi mới
          </Button>
        }
      />

      {/* Filters and Search */}
      <PageFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        placeholder="Tìm kiếm đề thi..."
        filters={
          <>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ExamStatus)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả</SelectItem>
                <SelectItem value="Nháp">Nháp</SelectItem>
                <SelectItem value="Đã lên lịch">Đã lên lịch</SelectItem>
                <SelectItem value="Đang diễn ra">Đang diễn ra</SelectItem>
                <SelectItem value="Đã hoàn thành">Đã hoàn thành</SelectItem>
                <SelectItem value="Đã lưu trữ">Đã lưu trữ</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ExamType)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Loại đề thi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả loại">Tất cả loại</SelectItem>
                <SelectItem value="Kiểm tra 1 tiết">Kiểm tra 1 tiết</SelectItem>
                <SelectItem value="Kiểm tra giữa kỳ">Kiểm tra giữa kỳ</SelectItem>
                <SelectItem value="Thi cuối kỳ">Thi cuối kỳ</SelectItem>
                <SelectItem value="Thi thử">Thi thử</SelectItem>
                <SelectItem value="Bài tập">Bài tập</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* Exams Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableLoadingSkeleton rows={5} />
          </div>
        ) : filteredExams.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="Chưa có đề thi nào"
            description="Tạo đề thi mới để bắt đầu quản lý các kỳ thi cho học sinh của bạn"
            action={{
              label: "Tạo đề thi đầu tiên",
              icon: <Plus className="h-4 w-4" />,
              onClick: () => router.push("/teacher/exams/create")
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="min-w-[250px]">Tên đề thi</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Số câu hỏi</TableHead>
                <TableHead>Tổng điểm</TableHead>
                <TableHead>Thời gian tạo</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.map((exam, index) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="max-w-[250px]">
                      <p className="font-medium line-clamp-1">{exam.title}</p>
                      {exam.description && (
                        <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                          {exam.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(exam.examType)}</TableCell>
                  <TableCell>{getStatusBadge(exam.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {exam.duration ? `${exam.duration} phút` : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{exam.totalQuestions || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {exam.totalPoints || 0} điểm
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(exam.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/teacher/exams/${exam.id}`)}
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/teacher/exams/${exam.id}/edit`)}
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/teacher/exams/${exam.id}?action=duplicate`)}
                        title="Nhân bản"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExamToDelete(exam.id)
                          setDeleteDialogOpen(true)
                        }}
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa đề thi này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExamToDelete(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => examToDelete && handleDelete(examToDelete)}
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
