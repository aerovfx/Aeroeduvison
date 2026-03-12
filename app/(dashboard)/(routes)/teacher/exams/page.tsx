"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Plus, Search, FileText, Eye, Edit, Trash2, Loader2, CheckCircle2,
  XCircle, Clock, Copy, Play, Calendar, Users, Award, FileCode2, Database
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { NeumorphicCard } from "@/components/ui/neumorphic-card"
import { NeumorphicButton } from "@/components/ui/neumorphic-button"
import { NeumorphicInput } from "@/components/ui/neumorphic-input"
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
  const [exportingToLatexId, setExportingToLatexId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) fetchExams()
  }, [session, selectedStatus, selectedType])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") params.append("status", selectedStatus)
      if (selectedType !== "Tất cả loại") params.append("examType", selectedType)
      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`/api/teacher/exams?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 404) { setExams([]); return }
        toast.error("Không thể tải danh sách đề thi")
        setExams([])
        return
      }

      const data = await response.json()
      setExams(data.exams || [])
    } catch (error: any) {
      console.error("Error fetching exams:", error)
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (examId: string) => {
    try {
      await fetch(`/api/teacher/exams/${examId}`, { method: "DELETE" })
      toast.success("Đã xóa đề thi")
      fetchExams()
      setDeleteDialogOpen(false)
      setExamToDelete(null)
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi xóa đề thi")
    }
  }

  const handleExportToLatex = async (examId: string) => {
    try {
      setExportingToLatexId(examId)
      const res = await fetch("/api/latex-projects/export-from-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      })
      if (!res.ok) throw new Error("Export failed")
      const data = await res.json()
      toast.success("Đã tạo tài liệu LaTeX")
      router.push(`/teacher/latex-documents/${data.id}`)
    } catch (e: any) {
      toast.error(e.message || "Không thể xuất sang LaTeX")
    } finally {
      setExportingToLatexId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, any> = {
      "Đã hoàn thành": { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      "Đang diễn ra": { color: "bg-blue-100 text-blue-800", icon: Play },
      "Đã lên lịch": { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      "Nháp": { color: "bg-gray-100 text-gray-800", icon: FileText },
      "Đã lưu trữ": { color: "bg-purple-100 text-purple-800", icon: ArchiveIcon },
    }
    const badge = badges[status] || { color: "bg-gray-100 text-gray-800", icon: FileText }
    const Icon = badge.icon
    return (
      <Badge className={cn("neu-shadow-sm", badge.color)}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      "Kiểm tra 1 tiết": "bg-blue-100 text-blue-800",
      "Kiểm tra giữa kỳ": "bg-orange-100 text-orange-800",
      "Thi cuối kỳ": "bg-red-100 text-red-800",
      "Thi thử": "bg-green-100 text-green-800",
      "Bài tập": "bg-purple-100 text-purple-800",
    }
    return <Badge className={cn("neu-shadow-sm", typeMap[type] || "bg-gray-100 text-gray-800")}>{type}</Badge>
  }

  const filteredExams = exams.filter((exam) =>
    !searchQuery || exam.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: exams.length,
    draft: exams.filter(e => e.status === "Nháp").length,
    ongoing: exams.filter(e => e.status === "Đang diễn ra").length,
    completed: exams.filter(e => e.status === "Đã hoàn thành").length,
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 neu-shadow" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full neu-container">
      {/* Header with Gradient Text */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Đề Thi</h1>
              <p className="text-gray-600">Quản lý và tổ chức các đề thi chuyên nghiệp</p>
            </div>
            <NeumorphicButton
              variant="primary"
              size="lg"
              onClick={() => router.push("/teacher/exams/create")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Tạo đề thi mới
            </NeumorphicButton>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Tổng cộng", value: stats.total, color: "from-blue-500 to-blue-600", icon: Database },
              { label: "Nháp", value: stats.draft, color: "from-gray-500 to-gray-600", icon: FileText },
              { label: "Đang diễn ra", value: stats.ongoing, color: "from-green-500 to-green-600", icon: Play },
              { label: "Hoàn thành", value: stats.completed, color: "from-purple-500 to-purple-600", icon: Award },
            ].map((stat) => (
              <NeumorphicCard key={stat.label} variant="gradient" hover className="text-center p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <stat.icon className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
                  <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </NeumorphicCard>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <NeumorphicInput
                placeholder="Tìm kiếm đề thi..."
                icon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchExams()}
              />
            </div>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ExamStatus)}>
              <SelectTrigger className="w-[180px] neu-shadow-sm">
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
              <SelectTrigger className="w-[180px] neu-shadow-sm">
                <SelectValue placeholder="Loại đề" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả loại">Tất cả</SelectItem>
                <SelectItem value="Kiểm tra 1 tiết">1 tiết</SelectItem>
                <SelectItem value="Kiểm tra giữa kỳ">Giữa kỳ</SelectItem>
                <SelectItem value="Thi cuối kỳ">Cuối kỳ</SelectItem>
                <SelectItem value="Thi thử">Thi thử</SelectItem>
                <SelectItem value="Bài tập">Bài tập</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Exams Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto">
          <NeumorphicCard variant="gradient" size="lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 neu-shadow" />
                  <p className="text-gray-600">Đang tải...</p>
                </div>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner mb-4">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có đề thi nào</h3>
                <p className="text-gray-500 mb-6">Tạo đề thi mới để bắt đầu quản lý các kỳ thi</p>
                <NeumorphicButton variant="primary" onClick={() => router.push("/teacher/exams/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo đề thi đầu tiên
                </NeumorphicButton>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Tên đề thi</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Số câu</TableHead>
                    <TableHead>Điểm</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam, index) => (
                    <TableRow key={exam.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{exam.title}</div>
                          {exam.description && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">{exam.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(exam.examType)}</TableCell>
                      <TableCell>{getStatusBadge(exam.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">{exam.duration ? `${exam.duration} phút` : "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="neu-shadow-sm">{exam.totalQuestions || 0}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="neu-shadow-sm">{exam.totalPoints || 0}đ</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow" onClick={() => router.push(`/teacher/exams/${exam.id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow text-blue-600" onClick={() => router.push(`/teacher/exams/${exam.id}/edit`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow" onClick={() => router.push(`/teacher/exams/${exam.id}?action=duplicate`)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow" onClick={() => handleExportToLatex(exam.id)} disabled={exportingToLatexId === exam.id}>
                            {exportingToLatexId === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow text-red-600" onClick={() => { setExamToDelete(exam.id); setDeleteDialogOpen(true); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </NeumorphicCard>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="neu-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="gradient-text">Xóa đề thi?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neu-button">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => examToDelete && handleDelete(examToDelete)} className="neu-button bg-gradient-to-br from-red-500 to-red-600">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ArchiveIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/></svg>
}
