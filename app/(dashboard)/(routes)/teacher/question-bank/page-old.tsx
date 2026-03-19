"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Upload, Sparkles, Database, BookOpen, List,
  Search, Filter, BarChart3, CheckCircle2, Clock,
  Calculator, Atom, TestTube, Globe, PenTool, Users,
  Landmark, Cpu, Music, Palette
} from "lucide-react"
import { BulkGenerateModal } from "@/components/question-bank/bulk-generate-modal"
import { ImportModal } from "@/components/question-bank/import-modal"
import { toast } from "react-hot-toast"

interface Question {
  id: string
  title: string
  subject: string
  type: string
  difficulty: string
  status: string
  createdAt: string
}

interface SubjectCategory {
  id: string
  name: string
  icon: any
  color: string
  bgColor: string
  count: number
  description: string
}

const SUBJECT_CATEGORIES: SubjectCategory[] = [
  {
    id: "toan",
    name: "Toán học",
    icon: Calculator,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    count: 0,
    description: "Đại số, Hình học, Giải tích",
    dbValue: "Toán học"
  },
  {
    id: "vat-ly",
    name: "Vật lý",
    icon: Atom,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    count: 0,
    description: "Cơ học, Điện học, Quang học",
    dbValue: "Vật lý"
  },
  {
    id: "hoa-hoc",
    name: "Hóa học",
    icon: TestTube,
    color: "text-green-600",
    bgColor: "bg-green-50",
    count: 0,
    description: "Hóa vô cơ, Hóa hữu cơ",
    dbValue: "Hóa học"
  },
  {
    id: "sinh-hoc",
    name: "Sinh học",
    icon: Users,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    count: 0,
    description: "Tế bào, Di truyền, Sinh thái",
    dbValue: "Sinh học"
  },
  {
    id: "ngu-van",
    name: "Ngữ văn",
    icon: PenTool,
    color: "text-red-600",
    bgColor: "bg-red-50",
    count: 0,
    description: "Văn học, Tiếng Việt",
    dbValue: "Ngữ văn"
  },
  {
    id: "tieng-anh",
    name: "Tiếng Anh",
    icon: Globe,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    count: 0,
    description: "Grammar, Vocabulary, Reading",
    dbValue: "Tiếng Anh"
  },
  {
    id: "lich-su",
    name: "Lịch sử",
    icon: Landmark,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    count: 0,
    description: "Sử Việt Nam, Sử Thế giới",
    dbValue: "Lịch sử"
  },
  {
    id: "dia-ly",
    name: "Địa lý",
    icon: Globe,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    count: 0,
    description: "Địa lý tự nhiên, Kinh tế",
    dbValue: "Địa lý"
  },
  {
    id: "gdcd",
    name: "GDCD",
    icon: Users,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    count: 0,
    description: "Giáo dục công dân",
    dbValue: "GDCD"
  },
  {
    id: "tin-hoc",
    name: "Tin học",
    icon: Cpu,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    count: 0,
    description: "Lập trình, Ứng dụng",
    dbValue: "Tin học"
  }
]

// Map subject ID to database value
const getSubjectDbValue = (subjectId: string): string => {
  const subject = SUBJECT_CATEGORIES.find(s => s.id === subjectId)
  return subject?.dbValue || subjectId
}

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

export default function QuestionBankPage() {
  const router = useRouter()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  useEffect(() => {
    loadQuestions()
  }, [selectedSubject])

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedSubject) {
        const dbValue = getSubjectDbValue(selectedSubject)
        params.set('subject', dbValue)
      }
      const response = await fetch(`/api/questions?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setTotalQuestions(data.data.pagination.total)
        setQuestions(data.data.questions || [])
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = async (count: number) => {
    setTotalQuestions(count)
    toast.success('Đã thêm câu hỏi vào ngân hàng đề!')
    loadQuestions()
  }

  const handleImportSuccess = async (count: number) => {
    setTotalQuestions(prev => prev + count)
    loadQuestions()
  }

  const getStatusBadge = (status: string) => {
    const config = {
      "Hoàn tất": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
      "Đang xử lý": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      "Nháp": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
    }
    const c = config[status as keyof typeof config] || config["Nháp"]
    return (
      <span className={`px-2 py-1 rounded-md text-xs border ${c.bg} ${c.text} ${c.border}`}>
        {status}
      </span>
    )
  }

  const getDifficultyBadge = (difficulty: string) => {
    const config = {
      "Dễ": { bg: "bg-green-50", text: "text-green-700" },
      "Trung bình": { bg: "bg-yellow-50", text: "text-yellow-700" },
      "Khó": { bg: "bg-red-50", text: "text-red-700" },
    }
    const c = config[difficulty as keyof typeof config] || config["Trung bình"]
    return (
      <span className={`px-2 py-1 rounded-md text-xs ${c.bg} ${c.text}`}>
        {difficulty}
      </span>
    )
  }

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ngân Hàng Câu Hỏi</h1>
                <p className="text-sm text-gray-600">Quản lý và sinh câu hỏi với AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Import từ file
              </button>
              <button
                onClick={() => setGenerateOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Sinh hàng loạt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Subject Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Chọn môn học</h2>
            {selectedSubject && (
              <button
                onClick={() => setSelectedSubject(null)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Xem tất cả
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {SUBJECT_CATEGORIES.map((subject) => (
              <GlassCard
                key={subject.id}
                hover
                onClick={() => setSelectedSubject(selectedSubject === subject.id ? null : subject.id)}
                className={`cursor-pointer transition-all ${
                  selectedSubject === subject.id
                    ? 'ring-2 ring-purple-500 border-purple-300'
                    : ''
                }`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`w-12 h-12 rounded-xl ${subject.bgColor} flex items-center justify-center`}>
                    <subject.icon className={`w-6 h-6 ${subject.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{subject.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{subject.description}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        {selectedSubject && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Tìm kiếm trong ${SUBJECT_CATEGORIES.find(s => s.id === selectedSubject)?.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Questions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Câu hỏi</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Môn</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Loại</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Độ khó</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-600 uppercase">Trạng thái</th>
                  <th className="text-right p-4 text-xs font-medium text-gray-600 uppercase">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                        <span className="text-gray-600">Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <div className="text-center">
                        <Database className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-gray-600 font-medium">
                          {selectedSubject ? `Chưa có câu hỏi nào cho ${SUBJECT_CATEGORIES.find(s => s.id === selectedSubject)?.name}` : 'Chưa có câu hỏi nào'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedSubject ? 'Chọn môn khác hoặc import câu hỏi' : 'Chọn môn học hoặc import câu hỏi'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  questions.map((question) => (
                    <tr
                      key={question.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                        selectedQuestionId === question.id ? 'bg-purple-50' : ''
                      }`}
                      onClick={() => setSelectedQuestionId(question.id)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{question.title}</div>
                            <div className="text-xs text-gray-500">ID: {question.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{question.subject}</td>
                      <td className="p-4 text-sm text-gray-600">{question.type}</td>
                      <td className="p-4">{getDifficultyBadge(question.difficulty)}</td>
                      <td className="p-4">{getStatusBadge(question.status)}</td>
                      <td className="text-right p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/teacher/question-bank/edit/${question.id}`)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Upload className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(question.title)
                              toast.success('Đã copy câu hỏi!')
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy"
                          >
                            <List className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Question Details */}
        {selectedQuestion && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Chi tiết</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[300px]">{selectedQuestion.title}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Môn học</span>
                <span className="text-sm font-medium text-gray-900">{selectedQuestion.subject}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Loại câu</span>
                <span className="text-sm font-medium text-gray-900">{selectedQuestion.type}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Độ khó</span>
                {getDifficultyBadge(selectedQuestion.difficulty)}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Trạng thái</span>
                {getStatusBadge(selectedQuestion.status)}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => router.push(`/teacher/question-bank/edit/${selectedQuestion.id}`)}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Chỉnh sửa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <BulkGenerateModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={handleSuccess}
      />
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}
