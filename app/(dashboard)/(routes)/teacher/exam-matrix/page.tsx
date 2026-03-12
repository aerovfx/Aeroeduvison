"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Upload, Plus, Search, FileText, Grid3x3, Eye, Edit, Trash2,
  Copy, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, FileCode2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { DigitizeMatrixModal } from "@/components/exam-matrix/digitize-modal"
import { GenerateExamModal } from "@/components/exam-matrix/generate-exam-modal"
import { NeumorphicCard } from "@/components/ui/neumorphic-card"
import { NeumorphicButton } from "@/components/ui/neumorphic-button"
import { NeumorphicInput } from "@/components/ui/neumorphic-input"
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
  const [exportingToLatexId, setExportingToLatexId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [matrixToDelete, setMatrixToDelete] = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  useEffect(() => { fetchMatrices() }, [selectedStatus, examTypeFilter])

  const fetchMatrices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") params.append("status", selectedStatus)
      if (examTypeFilter !== "Tất cả loại đề") params.append("examType", examTypeFilter)

      const response = await fetch(`/api/exam-matrices?${params.toString()}`)
      if (!response.ok) throw new Error("Không thể tải danh sách ma trận")
      const data = await response.json()
      setMatrices(data.matrices || [])
    } catch (error: any) {
      toast.error(error.message || "Không thể tải danh sách ma trận")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/exam-matrices/${id}`, { method: "DELETE" })
      toast.success("Đã xóa ma trận")
      fetchMatrices()
      setDeleteDialogOpen(false)
      setMatrixToDelete(null)
    } catch (error) {
      toast.error("Không thể xóa ma trận")
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      setDuplicating(id)
      await fetch(`/api/exam-matrices/${id}/duplicate`, { method: "POST" })
      toast.success("Đã nhân bản ma trận")
      fetchMatrices()
    } catch (error: any) {
      toast.error(error.message || "Không thể nhân bản")
    } finally {
      setDuplicating(null)
    }
  }

  const handleExportToLatex = async (matrixId: string) => {
    try {
      setExportingToLatexId(matrixId)
      const res = await fetch("/api/latex-projects/export-from-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrixId }),
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

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      "Hoàn tất": CheckCircle2, "Đang xử lý": Loader2, "Lỗi": XCircle, "Hàng đợi": Clock,
    }
    const Icon = icons[status] || AlertCircle
    const colors: Record<string, string> = {
      "Hoàn tất": "text-green-600", "Đang xử lý": "text-orange-600", "Lỗi": "text-red-600", "Hàng đợi": "text-gray-600",
    }
    return <Icon className={`h-4 w-4 ${status === "Đang xử lý" ? "animate-spin" : ""} ${colors[status] || ""}`} />
  }

  const stats = {
    total: matrices.length,
    completed: matrices.filter(m => m.status === "Hoàn tất").length,
    processing: matrices.filter(m => m.status === "Đang xử lý").length,
    queue: matrices.filter(m => m.status === "Hàng đợi").length,
  }

  const filteredMatrices = matrices.filter(m =>
    !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full neu-container">
      {/* Header with Gradient Text */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Ma Trận Đề</h1>
              <p className="text-gray-600">Quản lý và tạo ma trận đề thi chuyên nghiệp</p>
            </div>
            <div className="flex gap-2">
              <NeumorphicButton variant="outline" onClick={() => setIsDigitizeModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Số hoá
              </NeumorphicButton>
              <NeumorphicButton variant="primary" onClick={() => router.push("/teacher/exam-matrix/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo ma trận
              </NeumorphicButton>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Tổng cộng", value: stats.total, color: "from-blue-500 to-blue-600", icon: Grid3x3 },
              { label: "Hoàn tất", value: stats.completed, color: "from-green-500 to-green-600", icon: CheckCircle2 },
              { label: "Đang xử lý", value: stats.processing, color: "from-orange-500 to-orange-600", icon: Loader2 },
              { label: "Hàng đợi", value: stats.queue, color: "from-gray-500 to-gray-600", icon: Clock },
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

          {/* Status Tabs */}
          <NeumorphicCard variant="default" size="sm">
            <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as MatrixStatus)}>
              <TabsList className="grid w-full grid-cols-5 neu-shadow">
                <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
                <TabsTrigger value="Hàng đợi">Hàng đợi</TabsTrigger>
                <TabsTrigger value="Đang xử lý">Đang xử lý</TabsTrigger>
                <TabsTrigger value="Hoàn tất">Hoàn tất</TabsTrigger>
                <TabsTrigger value="Lỗi">Lỗi</TabsTrigger>
              </TabsList>
            </Tabs>
          </NeumorphicCard>
        </div>
      </div>

      {/* Action Bar */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1 max-w-md">
                <NeumorphicInput
                  placeholder="Tìm kiếm ma trận..."
                  icon={<Search className="w-4 h-4" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
                <SelectTrigger className="w-[200px] neu-shadow-sm">
                  <SelectValue placeholder="Loại đề" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả loại đề">Tất cả</SelectItem>
                  <SelectItem value="Kiểm tra 1 tiết">1 tiết</SelectItem>
                  <SelectItem value="Kiểm tra giữa kỳ">Giữa kỳ</SelectItem>
                  <SelectItem value="Kiểm tra cuối kỳ">Cuối kỳ</SelectItem>
                  <SelectItem value="Thi học kỳ">Học kỳ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Matrices Table */}
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
            ) : filteredMatrices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner mb-4">
                  <Grid3x3 className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có ma trận nào</h3>
                <p className="text-gray-500 mb-6">Bắt đầu bằng cách tạo ma trận mới</p>
                <div className="flex gap-2">
                  <NeumorphicButton variant="outline" onClick={() => setIsDigitizeModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Số hoá
                  </NeumorphicButton>
                  <NeumorphicButton variant="primary" onClick={() => router.push("/teacher/exam-matrix/create")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo ma trận
                  </NeumorphicButton>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      TÊN MA TRẬN
                    </TableHead>
                    <TableHead>LOẠI</TableHead>
                    <TableHead>LOẠI ĐỀ</TableHead>
                    <TableHead className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      THỜI GIAN
                    </TableHead>
                    <TableHead>TRẠNG THÁI</TableHead>
                    <TableHead className="text-right">HÀNH ĐỘNG</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatrices.map((matrix) => (
                    <TableRow key={matrix.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner">
                            <FileText className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="font-medium">{matrix.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="neu-shadow-sm">{matrix.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{matrix.examType || "-"}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(matrix.createdAt).toLocaleDateString("vi-VN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(matrix.status)}
                          <Badge className={cn("neu-shadow", matrix.status === "Hoàn tất" ? "bg-green-100 text-green-800" : matrix.status === "Đang xử lý" ? "bg-orange-100 text-orange-800" : matrix.status === "Lỗi" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800")}>
                            {matrix.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow" onClick={() => router.push(`/teacher/exam-matrix/${matrix.id}`)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {matrix.status === "Hoàn tất" && (
                            <>
                              <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow text-blue-600" onClick={() => router.push(`/teacher/exam-matrix/${matrix.id}/edit`)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow" onClick={() => { setSelectedMatrixForExam({ id: matrix.id, name: matrix.name }); setIsGenerateExamModalOpen(true); }}>
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow" onClick={() => handleExportToLatex(matrix.id)} disabled={exportingToLatexId === matrix.id}>
                                {exportingToLatexId === matrix.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode2 className="w-4 h-4" />}
                              </Button>
                            </>
                          )}
                          {matrix.status !== "Đang xử lý" && (
                            <>
                              <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow text-blue-600" onClick={() => handleDuplicate(matrix.id)} disabled={duplicating === matrix.id}>
                                {duplicating === matrix.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="neu-shadow-sm hover:neu-shadow text-red-600" onClick={() => { setMatrixToDelete(matrix.id); setDeleteDialogOpen(true); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* Modals */}
      <DigitizeMatrixModal isOpen={isDigitizeModalOpen} onClose={() => setIsDigitizeModalOpen(false)} onUploadComplete={fetchMatrices} />
      {selectedMatrixForExam && (
        <GenerateExamModal isOpen={isGenerateExamModalOpen} onClose={() => { setIsGenerateExamModalOpen(false); setSelectedMatrixForExam(null); }} matrixId={selectedMatrixForExam.id} matrixName={selectedMatrixForExam.name} />
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="neu-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="gradient-text">Xóa ma trận?</AlertDialogTitle>
            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neu-button">Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => matrixToDelete && handleDelete(matrixToDelete)} className="neu-button bg-gradient-to-br from-red-500 to-red-600">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
