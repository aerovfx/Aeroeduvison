"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Edit, Trash2, CheckCircle, Eye, Database } from "lucide-react"
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

// AI Native Glass Card
function GlassCard({ children, className = '', hover = false, onClick }: { children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void; }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${hover ? 'transition-all hover:border-purple-200 hover:shadow-sm cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// AI Native Badge
function AIBadge({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; className?: string; }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-yellow-200',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
    info: 'bg-[hsl(var(--info)/0.15)] text-blue-600 border-[hsl(var(--info)/0.3)]',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// AI Native Button
function AIButton({ children, onClick, variant = 'default', size = 'default', disabled = false, className = '' }: {
  children: React.ReactNode; onClick?: (e: any) => void;
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  disabled?: boolean; className?: string;
}) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'icon' ? 'p-2.5 flex items-center justify-center shrink-0' : 'px-4 py-2.5';
  
  let variantClass = '';
  switch(variant) {
    case 'primary': variantClass = 'ai-button-primary text-white'; break;
    case 'danger': variantClass = 'bg-[hsl(var(--destructive)/0.1)] text-red-600 hover:bg-[hsl(var(--destructive)/0.2)] border border-red-200'; break;
    case 'success': variantClass = 'bg-[hsl(var(--success)/0.1)] text-green-600 hover:bg-[hsl(var(--success)/0.2)] border border-green-200'; break;
    case 'outline': variantClass = 'ai-button border border-gray-200 hover:border-purple-200 text-gray-900'; break;
    case 'ghost': variantClass = 'hover:bg-gray-50 text-gray-900'; break;
    default: variantClass = 'ai-button hover:bg-gray-50 text-gray-900'; break;
  }
  
  return (
    <button onClick={onClick} disabled={disabled} className={`${sizeClass} ${variantClass} ${className} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>
      {children}
    </button>
  );
}

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <GlassCard className="relative overflow-hidden mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
                <Database className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600 mb-2">Danh sách Câu hỏi</h1>
                <p className="text-sm text-gray-600">
                  {questions.length} câu hỏi • {questionTypeCounts["TRUE_FALSE"] || 0} Đúng-Sai • {questionTypeCounts["MCQ"] || 0} Nhiều lựa chọn
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AIButton className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" onClick={() => router.push("/teacher/question-bank")}>
                <Plus className="h-4 w-4 mr-2" />
                Sinh hàng loạt
              </AIButton>
              <AIButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={() => router.push("/teacher/question-bank/add")}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm câu hỏi
              </AIButton>
            </div>
          </div>
        </GlassCard>

        {/* Filters */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-600" />
              <input 
                placeholder="Tìm kiếm câu hỏi, chủ đề..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="ai-input w-full pl-12 pr-4 py-3 rounded-xl bg-transparent" 
              />
            </div>
            <select 
              value={filterSubject} 
              onChange={(e) => setFilterSubject(e.target.value)} 
              className="ai-input px-4 py-3 rounded-xl appearance-none bg-transparent"
            >
              <option value="" className="bg-[hsl(var(--background))]">Tất cả môn</option>
              <option value="Toán" className="bg-[hsl(var(--background))]">Toán</option>
              <option value="Ngữ văn" className="bg-[hsl(var(--background))]">Ngữ văn</option>
              <option value="Tiếng Anh" className="bg-[hsl(var(--background))]">Tiếng Anh</option>
              <option value="Vật lý" className="bg-[hsl(var(--background))]">Vật lý</option>
            </select>
            <select 
              value={filterGrade} 
              onChange={(e) => setFilterGrade(e.target.value)} 
              className="ai-input px-4 py-3 rounded-xl appearance-none bg-transparent"
            >
              <option value="" className="bg-[hsl(var(--background))]">Tất cả khối</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={`Khối ${num}`} className="bg-[hsl(var(--background))]">Khối {num}</option>
              ))}
            </select>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="ai-input px-4 py-3 rounded-xl appearance-none bg-transparent"
            >
              <option value="" className="bg-[hsl(var(--background))]">Tất cả dạng</option>
              <option value="MCQ" className="bg-[hsl(var(--background))]">Nhiều lựa chọn</option>
              <option value="TRUE_FALSE" className="bg-[hsl(var(--background))]">Đúng - Sai</option>
              <option value="SHORT_ANSWER" className="bg-[hsl(var(--background))]">Trả lời ngắn</option>
              <option value="ESSAY" className="bg-[hsl(var(--background))]">Tự luận</option>
            </select>
          </div>
        </GlassCard>

        {/* Content */}
        <div className="space-y-4">
          {selectedQuestions.length > 0 && (
            <GlassCard className="p-4 bg-[hsl(var(--primary)/0.05)] border-[hsl(var(--primary)/0.2)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-purple-600">
                  Đã chọn {selectedQuestions.length} câu hỏi
                </div>
                <div className="flex gap-3">
                  <AIButton size="sm" className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600" onClick={handleBulkApprove}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Duyệt tất cả
                  </AIButton>
                  <AIButton size="sm" className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa đã chọn
                  </AIButton>
                  <AIButton size="sm" className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={() => setSelectedQuestions([])}>
                    Hủy
                  </AIButton>
                </div>
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-[hsl(var(--muted-foreground)/0.05)] text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedQuestions.length === questions.length && questions.length > 0} 
                        onChange={(e) => setSelectedQuestions(e.target.checked ? questions.map((q) => q.id) : [])} 
                        className="rounded border-gray-200 bg-transparent"
                      />
                    </th>
                    <th className="px-6 py-4">Chủ đề & Nội dung</th>
                    <th className="px-6 py-4 text-center">Môn</th>
                    <th className="px-6 py-4 text-center">Khối</th>
                    <th className="px-6 py-4 text-center">Dạng</th>
                    <th className="px-6 py-4 text-center">Độ khó</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-center">Nguồn</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="w-6 h-6 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-gray-600">Đang tải...</p>
                      </td>
                    </tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-600">
                        Không có câu hỏi nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((question) => (
                      <tr key={question.id} className="hover:bg-[hsl(var(--muted-foreground)/0.02)] transition-colors">
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedQuestions.includes(question.id)} 
                            onChange={(e) => setSelectedQuestions(e.target.checked ? [...selectedQuestions, question.id] : selectedQuestions.filter((id) => id !== question.id))} 
                            className="rounded border-gray-200 bg-transparent"
                          />
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <div className="font-bold text-gray-900 truncate mb-1">{question.topic}</div>
                          <div className="text-xs text-gray-600 truncate">
                            {question.content}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <AIBadge variant="info">{question.subject}</AIBadge>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">
                          {question.grade}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <AIBadge variant={question.questionType === "TRUE_FALSE" ? "primary" : "default"}>
                            {QUESTION_TYPE_LABELS[question.questionType]}
                          </AIBadge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <AIBadge variant={question.difficulty === "HARD" ? "danger" : question.difficulty === "MEDIUM" ? "warning" : "success"}>
                            {DIFFICULTY_LABELS[question.difficulty]}
                          </AIBadge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <AIBadge variant={question.status === "Đã duyệt" ? "success" : "default"}>
                            {question.status}
                          </AIBadge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {question.aiGenerated ? (
                            <AIBadge className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">AI</AIBadge>
                          ) : (
                            <AIBadge className="px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">Thủ công</AIBadge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <AIButton className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg" size="icon" onClick={() => { setSelectedQuestion(question); setViewDialogOpen(true) }}>
                              <Eye className="h-4 w-4" />
                            </AIButton>
                            <AIButton
                              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault()
                                router.push(`/teacher/question-bank/edit/${question.id}`)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </AIButton>
                            <AIButton className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg" size="icon" onClick={() => handleDelete(question.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </AIButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* View Dialog */}
      {selectedQuestion && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl bg-[hsl(var(--background))] border-gray-200 text-gray-900">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-purple-600">Chi tiết câu hỏi</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[hsl(var(--muted-foreground)/0.05)] rounded-xl border border-gray-200">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1">Môn học</div>
                  <div className="font-semibold">{selectedQuestion.subject}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1">Khối lớp</div>
                  <div className="font-semibold">{selectedQuestion.grade}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1">Dạng</div>
                  <div className="font-semibold">{QUESTION_TYPE_LABELS[selectedQuestion.questionType]}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-600 tracking-wider mb-1">Độ khó</div>
                  <div className="font-semibold">{DIFFICULTY_LABELS[selectedQuestion.difficulty]}</div>
                </div>
              </div>
              
              <div>
                <div className="text-xs uppercase font-bold text-gray-600 tracking-wider mb-2">Nội dung</div>
                <div className="p-4 bg-[hsl(var(--card))] rounded-xl border border-gray-200 leading-relaxed shadow-inner">
                  {selectedQuestion.content}
                </div>
              </div>
              
              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <div>
                  <div className="text-xs uppercase font-bold text-gray-600 tracking-wider mb-2">Phương án</div>
                  <div className="space-y-3">
                    {selectedQuestion.options.map((opt, idx) => {
                      const isCorrect = opt === selectedQuestion.correctAnswer;
                      return (
                        <div key={idx} className={`p-3 rounded-xl border ${isCorrect ? "bg-[hsl(var(--success)/0.1)] border-green-200 text-green-600 font-bold shadow-[0_0_10px_hsl(var(--success)/0.1)]" : "bg-[hsl(var(--background))] border-gray-200 text-gray-900"}`}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-[hsl(var(--success))] text-white' : 'bg-[hsl(var(--muted-foreground)/0.1)] text-gray-600'}`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                            </span>
                            {isCorrect && <CheckCircle className="h-5 w-5" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {selectedQuestion.explanation && (
                <div>
                  <div className="text-xs uppercase font-bold text-gray-600 tracking-wider mb-2">Giải thích</div>
                  <div className="p-4 bg-[hsl(var(--primary)/0.05)] rounded-xl border border-[hsl(var(--primary)/0.2)] text-gray-900 shadow-inner">
                    {selectedQuestion.explanation}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
