"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  FileText, 
  HelpCircle,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Filter,
  BookOpen,
  Tag,
  CheckCircle2,
  XCircle,
  Clock
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
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

type QuestionStatus = "Tất cả" | "Đã duyệt" | "Chờ duyệt" | "Nháp"
type QuestionType = "Tất cả loại" | "TNKQ - Nhiều lựa chọn" | "TNKQ - Đúng/Sai" | "TNKQ - Trả lời ngắn" | "Tự luận"

interface Question {
  id: string
  content: string
  type: string
  subject: string
  grade: string
  difficulty: string
  cognitiveLevel: string
  status: string
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export default function QuestionBankPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<QuestionStatus>("Tất cả")
  const [selectedType, setSelectedType] = useState<QuestionType>("Tất cả loại")
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetchQuestions()
    }
  }, [session, selectedStatus, selectedType])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedStatus !== "Tất cả") {
        params.append("status", selectedStatus)
      }
      if (selectedType !== "Tất cả loại") {
        params.append("type", selectedType)
      }
      if (searchQuery) {
        params.append("search", searchQuery)
      }

      const response = await fetch(`/api/question-bank?${params.toString()}`)
      
      if (!response.ok) {
        let errorMessage = "Không thể tải danh sách câu hỏi"
        try {
          const error = await response.json()
          if (error.code === "PRISMA_SCHEMA_NOT_SYNCED") {
            errorMessage = "Database chưa được đồng bộ. Vui lòng chạy: npx prisma generate && npx prisma db push"
          } else {
            errorMessage = error.error || errorMessage
          }
        } catch {
          // Ignore JSON parse errors
        }
        toast.error(errorMessage)
        setQuestions([])
        return
      }
      
      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (error: any) {
      console.error("Error fetching questions:", error)
      toast.error("Lỗi khi tải danh sách câu hỏi")
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchQuestions()
  }

  const handleDelete = async (questionId: string) => {
    try {
      const response = await fetch(`/api/question-bank/${questionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Không thể xóa câu hỏi")
      }

      toast.success("Đã xóa câu hỏi")
      fetchQuestions()
      setDeleteDialogOpen(false)
      setQuestionToDelete(null)
    } catch (error: any) {
      console.error("Error deleting question:", error)
      toast.error(error.message || "Lỗi khi xóa câu hỏi")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Đã duyệt":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Đã duyệt</Badge>
      case "Chờ duyệt":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>
      case "Nháp":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Nháp</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    // Map database types to display format
    const typeMap: { [key: string]: { label: string; color: string } } = {
      "MCQ": { label: "Nhiều lựa chọn", color: "bg-blue-100 text-blue-800" },
      "TRUE_FALSE": { label: "Đúng/Sai", color: "bg-purple-100 text-purple-800" },
      "SHORT_ANSWER": { label: "Trả lời ngắn", color: "bg-orange-100 text-orange-800" },
      "ESSAY": { label: "Tự luận", color: "bg-green-100 text-green-800" },
      // Also support old format for backward compatibility
      "TNKQ_Nhiều_lựa_chọn": { label: "Nhiều lựa chọn", color: "bg-blue-100 text-blue-800" },
      "TNKQ_Đúng_Sai": { label: "Đúng/Sai", color: "bg-purple-100 text-purple-800" },
      "TNKQ_Trả_lời_ngắn": { label: "Trả lời ngắn", color: "bg-orange-100 text-orange-800" },
      "Tự_luận": { label: "Tự luận", color: "bg-green-100 text-green-800" },
    }
    
    const typeInfo = typeMap[type] || { label: type, color: "bg-gray-100 text-gray-800" }
    return <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
  }

  const getDifficultyBadge = (difficulty: string) => {
    // Map database difficulty to display format
    const difficultyMap: { [key: string]: { label: string; color: string } } = {
      "EASY": { label: "Dễ", color: "bg-green-100 text-green-800" },
      "MEDIUM": { label: "Trung bình", color: "bg-yellow-100 text-yellow-800" },
      "HARD": { label: "Khó", color: "bg-red-100 text-red-800" },
      // Also support Vietnamese format for backward compatibility
      "Dễ": { label: "Dễ", color: "bg-green-100 text-green-800" },
      "Trung bình": { label: "Trung bình", color: "bg-yellow-100 text-yellow-800" },
      "Khó": { label: "Khó", color: "bg-red-100 text-red-800" },
    }
    
    const diffInfo = difficultyMap[difficulty] || { label: difficulty, color: "bg-gray-100 text-gray-800" }
    return (
      <Badge className={diffInfo.color}>
        {diffInfo.label}
      </Badge>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-blue-600" />
            Ngân hàng câu hỏi
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý và tổ chức câu hỏi cho các kỳ thi
          </p>
        </div>
        <Button onClick={() => router.push("/teacher/question-bank/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Tạo câu hỏi mới
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
        
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as QuestionStatus)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tất cả">Tất cả</SelectItem>
            <SelectItem value="Đã duyệt">Đã duyệt</SelectItem>
            <SelectItem value="Chờ duyệt">Chờ duyệt</SelectItem>
            <SelectItem value="Nháp">Nháp</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as QuestionType)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Loại câu hỏi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tất cả loại">Tất cả loại</SelectItem>
            <SelectItem value="TNKQ - Nhiều lựa chọn">TNKQ - Nhiều lựa chọn</SelectItem>
            <SelectItem value="TNKQ - Đúng/Sai">TNKQ - Đúng/Sai</SelectItem>
            <SelectItem value="TNKQ - Trả lời ngắn">TNKQ - Trả lời ngắn</SelectItem>
            <SelectItem value="Tự luận">Tự luận</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center p-12">
            <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Chưa có câu hỏi nào</p>
            <Button onClick={() => router.push("/teacher/question-bank/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo câu hỏi đầu tiên
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="min-w-[300px]">Nội dung câu hỏi</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Môn học</TableHead>
                <TableHead>Khối</TableHead>
                <TableHead>Độ khó</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question, index) => (
                <TableRow key={question.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="max-w-[300px]">
                      <p className="line-clamp-2 text-sm">{question.content}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(question.type)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{question.subject}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{question.grade}</Badge>
                  </TableCell>
                  <TableCell>{getDifficultyBadge(question.difficulty)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{question.cognitiveLevel}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(question.status)}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(question.createdAt).toLocaleDateString("vi-VN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/teacher/question-bank/${question.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/teacher/question-bank/${question.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setQuestionToDelete(question.id)
                          setDeleteDialogOpen(true)
                        }}
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
              Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuestionToDelete(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => questionToDelete && handleDelete(questionToDelete)}
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
