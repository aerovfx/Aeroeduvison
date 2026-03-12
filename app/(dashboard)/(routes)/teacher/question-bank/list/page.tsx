"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Edit, Trash2, CheckCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "react-hot-toast"

interface Question {
  id: string
  topic: string
  subject: string
  grade: string
  questionType: string
  difficulty: string
  content: string
  options: string[]
  correctAnswer: string
  status: string
  aiGenerated: boolean
}

const QUESTION_TYPE_LABELS: Record<string, string> = { MCQ: "Nhiều lựa chọn", TRUE_FALSE: "Đúng - Sai", SHORT_ANSWER: "Trả lời ngắn", ESSAY: "Tự luận" }
const DIFFICULTY_LABELS: Record<string, string> = { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" }

export default function QuestionListPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [filterGrade, setFilterGrade] = useState("")
  const [filterType, setFilterType] = useState("")
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  useEffect(() => { loadQuestions() }, [filterSubject, filterGrade, filterType])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSubject) params.set("subject", filterSubject)
      if (filterGrade) params.set("grade", filterGrade)
      if (filterType) params.set("questionType", filterType)
      params.set("limit", "100")
      const response = await fetch(`/api/questions?${params.toString()}`)
      const data = await response.json()
      if (data.success) setQuestions(data.data.questions)
    } catch (error) { toast.error("Không thể tải danh sách câu hỏi") } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa câu hỏi này?")) return
    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" })
      toast.success("Đã xóa")
      loadQuestions()
    } catch (error) { toast.error("Không thể xóa") }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Xóa ${selectedQuestions.length} câu hỏi?`)) return
    try {
      const response = await fetch("/api/questions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionIds: selectedQuestions }) })
      const data = await response.json()
      if (data.success) { toast.success(`Đã xóa ${data.data.deleted} câu hỏi`); setSelectedQuestions([]); loadQuestions() }
    } catch (error) { toast.error("Không thể xóa") }
  }

  const handleBulkApprove = async () => {
    try {
      const response = await fetch("/api/questions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionIds: selectedQuestions, status: "Đã duyệt" }) })
      const data = await response.json()
      if (data.success) { toast.success(`Đã duyệt ${data.data.updated} câu hỏi`); setSelectedQuestions([]); loadQuestions() }
    } catch (error) { toast.error("Không thể duyệt") }
  }

  const filteredQuestions = questions.filter((q) => q.content.toLowerCase().includes(searchTerm.toLowerCase()) || q.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  const questionTypeCounts = questions.reduce((acc, q) => { acc[q.questionType] = (acc[q.questionType] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ngân hàng câu hỏi</h1>
            <p className="text-sm text-muted-foreground mt-1">{questions.length} câu hỏi • {questionTypeCounts["TRUE_FALSE"] || 0} Đúng-Sai • {questionTypeCounts["MCQ"] || 0} Nhiều lựa chọn</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/teacher/question-bank")}><Plus className="h-4 w-4 mr-2" />Sinh hàng loạt</Button>
            <Button onClick={() => router.push("/teacher/question-bank/add")}><Plus className="h-4 w-4 mr-2" />Thêm câu hỏi</Button>
          </div>
        </div>
      </div>
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Tất cả môn</option>
            <option value="Toán">Toán</option>
            <option value="Ngữ văn">Ngữ văn</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
            <option value="Vật lý">Vật lý</option>
          </select>
          <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Tất cả khối</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (<option key={num} value={`Khối ${num}`}>Khối {num}</option>))}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Tất cả dạng</option>
            <option value="MCQ">Nhiều lựa chọn</option>
            <option value="TRUE_FALSE">Đúng - Sai</option>
            <option value="SHORT_ANSWER">Trả lời ngắn</option>
            <option value="ESSAY">Tự luận</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          {selectedQuestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
              <div className="text-sm text-blue-800">Đã chọn <strong>{selectedQuestions.length}</strong> câu hỏi</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleBulkApprove}><CheckCircle className="h-4 w-4 mr-1" />Duyệt</Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-1" />Xóa</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedQuestions([])}>Hủy</Button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"><input type="checkbox" checked={selectedQuestions.length === questions.length && questions.length > 0} onChange={(e) => setSelectedQuestions(e.target.checked ? questions.map((q) => q.id) : [])} /></TableHead>
                  <TableHead>Chủ đề</TableHead>
                  <TableHead>Môn</TableHead>
                  <TableHead>Khối</TableHead>
                  <TableHead>Dạng</TableHead>
                  <TableHead>Độ khó</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (<TableRow><TableCell colSpan={9} className="text-center py-8">Đang tải...</TableCell></TableRow>) : filteredQuestions.length === 0 ? (<TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Không có câu hỏi</TableCell></TableRow>) : (filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell><input type="checkbox" checked={selectedQuestions.includes(question.id)} onChange={(e) => setSelectedQuestions(e.target.checked ? [...selectedQuestions, question.id] : selectedQuestions.filter((id) => id !== question.id))} /></TableCell>
                    <TableCell className="max-w-[200px] truncate"><div className="font-medium">{question.topic}</div><div className="text-xs text-muted-foreground truncate">{question.content.substring(0, 50)}...</div></TableCell>
                    <TableCell><Badge variant="outline">{question.subject}</Badge></TableCell>
                    <TableCell>{question.grade}</TableCell>
                    <TableCell><Badge variant="outline" className={question.questionType === "TRUE_FALSE" ? "bg-blue-50 text-blue-700 border-blue-300" : ""}>{QUESTION_TYPE_LABELS[question.questionType]}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{DIFFICULTY_LABELS[question.difficulty]}</Badge></TableCell>
                    <TableCell><Badge variant={question.status === "Đã duyệt" ? "default" : "outline"} className={question.status === "Đã duyệt" ? "bg-green-100 text-green-800" : ""}>{question.status}</Badge></TableCell>
                    <TableCell>{question.aiGenerated ? (<Badge variant="secondary">AI</Badge>) : (<Badge variant="outline">Thủ công</Badge>)}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" onClick={() => { setSelectedQuestion(question); setViewDialogOpen(true) }}><Eye className="h-4 w-4" /></Button><Button
                      variant="ghost"
                      size="icon"
                      title="Chỉnh sửa câu hỏi"
                      onClick={(e) => {
                        e.preventDefault()
                        router.push(`/teacher/question-bank/edit/${question.id}`)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button><Button variant="ghost" size="icon" onClick={() => handleDelete(question.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      {selectedQuestion && (<Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}><DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Chi tiết câu hỏi</DialogTitle></DialogHeader><div className="space-y-4 mt-4"><div className="grid grid-cols-2 gap-4"><div><div className="text-sm font-medium">Môn học</div><div>{selectedQuestion.subject}</div></div><div><div className="text-sm font-medium">Khối lớp</div><div>{selectedQuestion.grade}</div></div><div><div className="text-sm font-medium">Dạng</div><div>{QUESTION_TYPE_LABELS[selectedQuestion.questionType]}</div></div><div><div className="text-sm font-medium">Độ khó</div><div>{DIFFICULTY_LABELS[selectedQuestion.difficulty]}</div></div></div><div><div className="text-sm font-medium">Nội dung</div><div className="p-3 bg-muted rounded mt-1">{selectedQuestion.content}</div></div>{selectedQuestion.options && selectedQuestion.options.length > 0 && (<div><div className="text-sm font-medium">Phương án</div><div className="space-y-2 mt-1">{selectedQuestion.options.map((opt, idx) => (<div key={idx} className={`p-2 rounded border ${opt === selectedQuestion.correctAnswer ? "bg-green-50 border-green-300 text-green-800" : "bg-background"}`}>{opt} {opt === selectedQuestion.correctAnswer && "✓"}</div>))}</div></div>)}{selectedQuestion.explanation && (<div><div className="text-sm font-medium">Giải thích</div><div className="p-3 bg-muted rounded mt-1">{selectedQuestion.explanation}</div></div>)}</div></DialogContent></Dialog>)}
    </div>
  )
}
