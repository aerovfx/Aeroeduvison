import { useState, useEffect, useCallback } from "react"
import {
  Plus, Upload, Sparkles, Database,
  Search, CheckCircle2, ChevronDown, ChevronUp, Edit2,
  Save, X, Loader2, Trash2, PenLine, PlusCircle, Check,
  Wand2, BookOpen, Hash, Tag,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { BulkGenerateModal } from "@/components/question-bank/BulkGenerateModal"
import { ImportModal } from "@/components/question-bank/ImportModal"
import { api } from "@/services/api"

interface Question {
  id: string
  content: string
  subject: string
  grade: string
  questionType: string
  difficulty: string
  options: string[]
  correctAnswer: string
  explanation: string
  status: string
  aiGenerated: boolean
  // Taxonomy fields (2026-05-19)
  topic?: string
  chapter?: string | null
  lesson?: string | null
  keywords?: string[]
  tags?: string[]
}

interface TaxonomyResp {
  subjects: Array<{ name: string; count: number }>
  grades: Array<{ name: string; count: number }>
  chapters: Array<{ name: string; count: number }>
  lessons: Array<{ name: string; count: number }>
  topKeywords: Array<{ name: string; count: number }>
}

interface SubjectCategory {
  id: string
  name: string
  dbValue: string
  description: string
}

const SUBJECT_CATEGORIES: SubjectCategory[] = [
  { id: "toan", name: "Toán học", dbValue: "Toán học", description: "Đại số, Hình học, Giải tích" },
  { id: "vat-ly", name: "Vật lý", dbValue: "Vật lý", description: "Cơ học, Điện học, Quang học" },
  { id: "hoa-hoc", name: "Hóa học", dbValue: "Hóa học", description: "Hóa vô cơ, Hóa hữu cơ" },
  { id: "sinh-hoc", name: "Sinh học", dbValue: "Sinh học", description: "Tế bào, Di truyền, Sinh thái" },
  { id: "ngu-van", name: "Ngữ văn", dbValue: "Ngữ văn", description: "Văn học, Tiếng Việt" },
  { id: "tieng-viet", name: "Tiếng Việt", dbValue: "Tiếng Việt", description: "Vần, Chính tả, Tập đọc" },
  { id: "tieng-anh", name: "Tiếng Anh", dbValue: "Tiếng Anh", description: "Grammar, Vocabulary, Reading" },
  { id: "lich-su", name: "Lịch sử", dbValue: "Lịch sử", description: "Sử Việt Nam, Sử Thế giới" },
  { id: "dia-ly", name: "Địa lý", dbValue: "Địa lý", description: "Địa lý tự nhiên, Kinh tế" },
  { id: "lich-su-dia-ly", name: "LS & Địa lý", dbValue: "Lịch sử và Địa lý", description: "Lịch sử, Địa lý tiểu học" },
  { id: "gdcd", name: "GDCD", dbValue: "GDCD", description: "Giáo dục công dân" },
  { id: "dao-duc", name: "Đạo đức", dbValue: "Đạo đức", description: "Đạo đức tiểu học" },
  { id: "tin-hoc", name: "Tin học", dbValue: "Tin học", description: "Lập trình, Ứng dụng" },
  { id: "khtn", name: "KHTN", dbValue: "KHTN", description: "Khoa học tự nhiên" },
  { id: "khoa-hoc", name: "Khoa học", dbValue: "Khoa học", description: "Khoa học tiểu học" },
  { id: "cong-nghe", name: "Công nghệ", dbValue: "Công nghệ", description: "Công nghệ, Kỹ thuật" },
  { id: "am-nhac", name: "Âm nhạc", dbValue: "Âm nhạc", description: "Âm nhạc, Hát" },
  { id: "mi-thuat", name: "Mĩ thuật", dbValue: "Mĩ thuật", description: "Vẽ, Tạo hình" },
  { id: "the-duc", name: "Thể dục", dbValue: "Thể dục", description: "Thể thao, Sức khỏe" },
  { id: "quoc-phong", name: "QPAN", dbValue: "Quốc phòng", description: "Quốc phòng, An ninh" },
]

const getSubjectDbValue = (subjectId: string): string => {
  const subject = SUBJECT_CATEGORIES.find((s) => s.id === subjectId)
  return subject?.dbValue || subjectId
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Nhiều lựa chọn",
  TRUE_FALSE: "Đúng - Sai",
  MULTIPLE_TF: "Đúng/Sai nhiều ý",
  SHORT_ANSWER: "Trả lời ngắn",
  ESSAY: "Tự luận",
}

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
}

const QUESTION_TYPE_OPTIONS = [
  { value: "MCQ",         label: "Nhiều lựa chọn (A, B, C, D)",  icon: "🔘" },
  { value: "TRUE_FALSE",  label: "Đúng / Sai (1 phát biểu)",      icon: "✅" },
  { value: "MULTIPLE_TF", label: "Đúng/Sai nhiều ý (4 phát biểu)", icon: "☑️" },
  { value: "SHORT_ANSWER",label: "Trả lời ngắn",                  icon: "✏️" },
  { value: "ESSAY",       label: "Tự luận",                       icon: "📝" },
]

const DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "Dễ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HARD", label: "Khó" },
]

const GRADE_OPTIONS = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12",
]

// For MULTIPLE_TF: options = statements[], correctAnswer = "Đúng,Sai,Đúng,Sai"
const MTF_DEFAULTS = ["", "", "", ""]
const MTF_ANSWERS_DEFAULT = ["Đúng", "Đúng", "Đúng", "Đúng"]

const INITIAL_FORM = {
  content: "",
  questionType: "",
  subject: "",
  grade: "",
  difficulty: "MEDIUM",
  topic: "",
  chapter: "",
  lesson: "",
  keywords: [] as string[],
  explanation: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  mtfAnswers: MTF_ANSWERS_DEFAULT as string[], // per-statement Đúng/Sai for MULTIPLE_TF
}

export default function QuestionBank() {
  const [generateOpen, setGenerateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterGrade, setFilterGrade] = useState<string>("")
  // 2026-05-19: chuẩn hoá danh mục — thêm Chương/Bài/Từ khoá filter
  const [filterChapter, setFilterChapter] = useState<string>("")
  const [filterLesson, setFilterLesson] = useState<string>("")
  const [filterKeyword, setFilterKeyword] = useState<string>("")
  const [taxonomy, setTaxonomy] = useState<TaxonomyResp | null>(null)
  const [fixingLatex, setFixingLatex] = useState(false)
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "difficulty">("newest")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Manual creation state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)

  useEffect(() => {
    loadQuestions()
  }, [selectedSubject])

  const loadQuestions = async (resetPage = true) => {
    try {
      if (resetPage) setLoading(true)
      else setLoadingMore(true)
      const params = new URLSearchParams()
      if (selectedSubject) {
        const dbValue = getSubjectDbValue(selectedSubject)
        params.set("subject", dbValue)
      }
      params.set("limit", String(PAGE_SIZE))
      const currentPage = resetPage ? 1 : page
      params.set("offset", String((currentPage - 1) * PAGE_SIZE))
      const response = await fetch(`/api/questions?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setTotalQuestions(data.data.pagination.total)
        if (resetPage) {
          setQuestions(data.data.questions || [])
          setPage(1)
        } else {
          setQuestions((prev) => [...prev, ...(data.data.questions || [])])
          setPage(currentPage)
        }
      }
    } catch (error) {
      console.error("Error loading questions:", error)
      toast.error("Không thể tải câu hỏi")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await loadQuestions(false)
  }

  const handleSuccess = async (count: number) => {
    setTotalQuestions(count)
    toast.success("Đã thêm câu hỏi vào ngân hàng đề!")
    loadQuestions()
  }

  const handleImportSuccess = async (count: number) => {
    setTotalQuestions((prev) => prev + count)
    loadQuestions()
  }

  const handleSaveEdit = async (id: string, updates: Partial<Question>) => {
    try {
      const response = await fetch(`/api/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (response.ok) {
        toast.success("Đã cập nhật câu hỏi")
        loadQuestions()
      } else {
        toast.error("Không thể cập nhật")
      }
    } catch {
      toast.error("Lỗi khi lưu")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa câu hỏi này?")) return
    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" })
      toast.success("Đã xóa")
      loadQuestions()
    } catch {
      toast.error("Không thể xóa")
    }
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) newExpanded.delete(id)
    else newExpanded.add(id)
    setExpandedRows(newExpanded)
  }

  const expandAll = () => setExpandedRows(new Set(questions.map((q) => q.id)))
  const collapseAll = () => setExpandedRows(new Set())

  // Load taxonomy (subjects, chapters, lessons, top keywords) — auto refresh khi đổi môn
  const loadTaxonomy = useCallback(async () => {
    try {
      const subjectDb = selectedSubject ? getSubjectDbValue(selectedSubject) : ''
      const params: Record<string, string> = {}
      if (subjectDb) params.subject = subjectDb
      const r = await api.get<{ data: TaxonomyResp }>('/questions/taxonomy', { params })
      setTaxonomy(r.data?.data || null)
    } catch {
      setTaxonomy(null)
    }
  }, [selectedSubject])
  useEffect(() => { loadTaxonomy() }, [loadTaxonomy])

  // Reset chapter/lesson khi đổi môn (vì chapter list khác)
  useEffect(() => {
    setFilterChapter('')
    setFilterLesson('')
  }, [selectedSubject])

  // Handler: 1-click fix LaTeX errors
  const handleFixLatex = async () => {
    if (!confirm('Quét + sửa lỗi LaTeX phổ biến (smart quotes, unicode minus, typos \\fra→\\frac, ...) trên toàn bộ ngân hàng đề?\n\nThao tác này KHÔNG thể hoàn tác.')) return
    setFixingLatex(true)
    try {
      const r = await api.post<{ data: { scanned: number; fixed: number } }>('/questions/fix-latex', {
        limit: 1000,
        subject: selectedSubject ? getSubjectDbValue(selectedSubject) : undefined,
      })
      const { scanned, fixed } = r.data?.data || { scanned: 0, fixed: 0 }
      toast.success(`Đã quét ${scanned} câu, sửa ${fixed} câu có lỗi LaTeX`)
      if (fixed > 0) {
        // Reload danh sách để xem kết quả
        setPage(1)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Lỗi fix LaTeX')
    } finally {
      setFixingLatex(false)
    }
  }

  const filteredQuestions = questions
    .filter((q) => {
      const sq = searchQuery.trim().toLowerCase()
      if (sq) {
        const inContent = q.content.toLowerCase().includes(sq)
        const inSubject = q.subject.toLowerCase().includes(sq)
        const inChapter = (q.chapter || '').toLowerCase().includes(sq)
        const inLesson  = (q.lesson  || '').toLowerCase().includes(sq)
        const inTopic   = (q.topic   || '').toLowerCase().includes(sq)
        const inKw      = (q.keywords || []).some(k => k.toLowerCase().includes(sq))
        if (!inContent && !inSubject && !inChapter && !inLesson && !inTopic && !inKw) return false
      }
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false
      if (filterType && q.questionType !== filterType) return false
      if (filterGrade && q.grade !== filterGrade) return false
      if (filterChapter && (q.chapter || '').toLowerCase() !== filterChapter.toLowerCase()) return false
      if (filterLesson && (q.lesson || '').toLowerCase() !== filterLesson.toLowerCase()) return false
      if (filterKeyword && !(q.keywords || []).some(k => k.toLowerCase() === filterKeyword.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === "difficulty") {
        const order = { EASY: 0, MEDIUM: 1, HARD: 2 } as Record<string, number>
        return (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1)
      }
      return 0 // newest/oldest depend on API ordering
    })

  const activeFilterCount = [filterDifficulty, filterType, filterGrade, filterChapter, filterLesson, filterKeyword].filter(Boolean).length

  // Manual creation handlers
  const updateForm = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const updateOption = (idx: number, value: string) =>
    setForm((prev) => {
      const opts = [...prev.options]
      opts[idx] = value
      return { ...prev, options: opts }
    })

  const addOption = () =>
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, ""],
      mtfAnswers: [...prev.mtfAnswers, "Đúng"],
    }))

  const removeOption = (idx: number) =>
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
      mtfAnswers: prev.mtfAnswers.filter((_, i) => i !== idx),
      correctAnswer:
        prev.correctAnswer === String.fromCharCode(65 + idx) ? "" : prev.correctAnswer,
    }))

  const toggleMtfAnswer = (idx: number) =>
    setForm((prev) => {
      const arr = [...prev.mtfAnswers]
      arr[idx] = arr[idx] === "Đúng" ? "Sai" : "Đúng"
      return { ...prev, mtfAnswers: arr }
    })

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setShowCreateForm(false)
  }

  const handleCreateQuestion = async (keepFormOpen = false): Promise<boolean> => {
    if (!form.content.trim()) { toast.error("Vui lòng nhập nội dung câu hỏi"); return false }
    if (!form.questionType) { toast.error("Vui lòng chọn loại câu hỏi"); return false }
    if (!form.subject) { toast.error("Vui lòng chọn môn học"); return false }
    if (!form.grade) { toast.error("Vui lòng chọn khối"); return false }

    if (form.questionType === "MCQ") {
      const filled = form.options.filter((o) => o.trim())
      if (filled.length < 2) { toast.error("Cần ít nhất 2 phương án trả lời"); return false }
      if (!form.correctAnswer) { toast.error("Vui lòng chọn đáp án đúng"); return false }
    }
    if (form.questionType === "TRUE_FALSE" && !form.correctAnswer) {
      toast.error("Vui lòng chọn Đúng hoặc Sai")
      return false
    }
    if (form.questionType === "MULTIPLE_TF") {
      const filled = form.options.filter((o) => o.trim())
      if (filled.length < 2) { toast.error("Cần ít nhất 2 phát biểu"); return false }
    }
    if (
      (form.questionType === "SHORT_ANSWER" || form.questionType === "ESSAY") &&
      !form.correctAnswer.trim()
    ) {
      toast.error("Vui lòng nhập đáp án mẫu")
      return false
    }

    setCreating(true)
    try {
      let options: string[] = []
      let correctAnswer = form.correctAnswer
      if (form.questionType === "MCQ") {
        options = form.options.filter((o) => o.trim())
      } else if (form.questionType === "TRUE_FALSE") {
        options = ["Đúng", "Sai"]
      } else if (form.questionType === "MULTIPLE_TF") {
        options = form.options.filter((o) => o.trim())
        // encode answers as "Đúng,Sai,Đúng,Đúng" parallel to filtered options
        const filtered = form.options.map((o, i) => ({ o, a: form.mtfAnswers[i] })).filter(x => x.o.trim())
        correctAnswer = filtered.map(x => x.a).join(",")
      }

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: form.content.trim(),
          questionType: form.questionType,
          subject: form.subject,
          grade: form.grade,
          difficulty: form.difficulty,
          topic: form.topic.trim() || form.subject,
          explanation: form.explanation.trim(),
          options,
          correctAnswer,
          learningObjectives: [form.topic.trim() || form.subject],
          keywords: [form.topic.trim() || form.subject, form.subject],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tạo câu hỏi")

      toast.success("Đã tạo câu hỏi thành công!")

      if (keepFormOpen) {
        setForm((prev) => ({
          ...INITIAL_FORM,
          questionType: prev.questionType,
          subject: prev.subject,
          grade: prev.grade,
          difficulty: prev.difficulty,
          topic: prev.topic,
          options: prev.questionType === "MULTIPLE_TF" ? MTF_DEFAULTS.slice() : ["", "", "", ""],
          mtfAnswers: MTF_ANSWERS_DEFAULT.slice(),
        }))
      } else {
        resetForm()
      }
      loadQuestions()
      return true
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo câu hỏi")
      return false
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--td-bg)' }}>
      {/* Top Bar */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--td-card)', borderBottom: '1px solid #1e2033' }}>
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Ngân Hàng Câu Hỏi</h1>
                <p className="text-sm text-muted-foreground">{totalQuestions} câu hỏi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm((v) => !v)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                  showCreateForm
                    ? "bg-purple-950/40 text-purple-300 border border-purple-700"
                    : "border border-border text-foreground/80 hover:bg-secondary"
                }`}
              >
                <PenLine className="w-4 h-4" />
                Thêm thủ công
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="px-4 py-2 border border-border text-foreground/80 rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => setGenerateOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Sinh AI
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Subject Categories */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Chọn môn học</h2>
            {selectedSubject && (
              <button
                onClick={() => setSelectedSubject(null)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Xem tất cả
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {SUBJECT_CATEGORIES.map((subject) => (
              <div
                key={subject.id}
                onClick={() =>
                  setSelectedSubject(selectedSubject === subject.id ? null : subject.id)
                }
                className={`bg-card rounded-xl shadow-sm border p-3 cursor-pointer transition-all hover:shadow-md ${
                  selectedSubject === subject.id
                    ? "ring-2 ring-purple-500 border-purple-700 bg-purple-950/40"
                    : "border-border"
                }`}
              >
                <div className="text-center">
                  <h3 className="font-bold text-foreground text-sm">{subject.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{subject.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Create Form */}
        {showCreateForm && (
          <div className="mb-6 bg-card rounded-xl shadow-sm border border-purple-700 overflow-hidden">
            <div className="px-6 py-4 bg-secondary border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Tạo câu hỏi thủ công</h3>
                  <p className="text-xs text-muted-foreground">Chọn loại câu hỏi, nhập nội dung và đáp án</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Question Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-3">
                  1. Chọn loại câu hỏi *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {QUESTION_TYPE_OPTIONS.map((qt) => (
                    <button
                      key={qt.value}
                      onClick={() => {
                        updateForm("questionType", qt.value)
                        if (qt.value !== "MCQ") updateForm("correctAnswer", "")
                        if (qt.value === "MULTIPLE_TF") {
                          setForm((prev) => ({ ...prev, questionType: qt.value, correctAnswer: "", options: MTF_DEFAULTS.slice(), mtfAnswers: MTF_ANSWERS_DEFAULT.slice() }))
                          return
                        }
                        if (qt.value === "MCQ") {
                          setForm((prev) => ({ ...prev, questionType: qt.value, options: ["", "", "", ""] }))
                          return
                        }
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        form.questionType === qt.value
                          ? "border-purple-500 bg-purple-950/40 shadow-sm"
                          : "border-border hover:border-border bg-card"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{qt.icon}</span>
                      <span
                        className={`text-sm font-semibold ${
                          form.questionType === qt.value ? "text-purple-700" : "text-foreground/80"
                        }`}
                      >
                        {qt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Classification */}
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-3">
                  2. Thông tin phân loại
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Môn học *</label>
                    <select
                      value={form.subject}
                      onChange={(e) => updateForm("subject", e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-secondary text-foreground placeholder-muted-foreground bg-secondary"
                    >
                      <option value="">Chọn môn</option>
                      {SUBJECT_CATEGORIES.map((s) => (
                        <option key={s.id} value={s.dbValue}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Khối *</label>
                    <select
                      value={form.grade}
                      onChange={(e) => updateForm("grade", e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-secondary text-foreground placeholder-muted-foreground bg-secondary"
                    >
                      <option value="">Chọn khối</option>
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Độ khó</label>
                    <select
                      value={form.difficulty}
                      onChange={(e) => updateForm("difficulty", e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-secondary text-foreground placeholder-muted-foreground bg-secondary"
                    >
                      {DIFFICULTY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Chủ đề</label>
                    <input
                      value={form.topic}
                      onChange={(e) => updateForm("topic", e.target.value)}
                      placeholder="VD: Dao động cơ"
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-secondary text-foreground placeholder-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Content */}
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-2">
                  3. Nội dung câu hỏi *
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => updateForm("content", e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y bg-secondary text-foreground placeholder-muted-foreground"
                />
              </div>

              {/* Step 4: Answers */}
              {form.questionType && (
                <div>
                  <label className="block text-sm font-semibold text-foreground/80 mb-3">4. Đáp án</label>

                  {/* MCQ */}
                  {form.questionType === "MCQ" && (
                    <div className="space-y-3">
                      {form.options.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx)
                        const isCorrect = form.correctAnswer === letter
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateForm("correctAnswer", letter)}
                              className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                                isCorrect
                                  ? "bg-green-600 text-white shadow-sm"
                                  : "bg-border text-foreground/80 hover:bg-accent"
                              }`}
                              title={isCorrect ? "Đáp án đúng" : "Chọn làm đáp án đúng"}
                            >
                              {isCorrect ? <Check className="w-4 h-4" /> : letter}
                            </button>
                            <input
                              value={opt}
                              onChange={(e) => updateOption(idx, e.target.value)}
                              placeholder={`Phương án ${letter}`}
                              className={`flex-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-secondary text-foreground ${
                                isCorrect ? "border-green-600 bg-green-900/20" : "border-border"
                              }`}
                            />
                            {form.options.length > 2 && (
                              <button
                                onClick={() => removeOption(idx)}
                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      <button
                        onClick={addOption}
                        className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-purple-600 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm phương án
                      </button>
                      {!form.correctAnswer && form.options.some((o) => o.trim()) && (
                        <p className="text-xs text-amber-600">
                          Nhấn vào chữ cái bên trái để chọn đáp án đúng
                        </p>
                      )}
                    </div>
                  )}

                  {/* True/False */}
                  {form.questionType === "TRUE_FALSE" && (
                    <div className="flex gap-4">
                      {["Đúng", "Sai"].map((val) => (
                        <button
                          key={val}
                          onClick={() => updateForm("correctAnswer", val)}
                          className={`flex-1 py-4 rounded-xl border-2 text-center font-semibold transition-all ${
                            form.correctAnswer === val
                              ? val === "Đúng"
                                ? "border-green-500 bg-green-900/30 text-green-400"
                                : "border-red-500 bg-red-900/30 text-red-400"
                              : "border-border text-muted-foreground hover:border-border"
                          }`}
                        >
                          {val === "Đúng" ? "✓ " : "✗ "}
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Multiple True/False */}
                  {form.questionType === "MULTIPLE_TF" && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Nhập từng phát biểu và chọn Đúng / Sai cho mỗi ý</p>
                      {form.options.map((opt, idx) => {
                        const label = String.fromCharCode(97 + idx) // a, b, c, d
                        const isTrue = form.mtfAnswers[idx] === "Đúng"
                        return (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{label})</span>
                            <input
                              value={opt}
                              onChange={(e) => updateOption(idx, e.target.value)}
                              placeholder={`Phát biểu ${label}...`}
                              className="flex-1 px-3 py-2.5 border border-border rounded-lg text-sm bg-secondary text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => toggleMtfAnswer(idx)}
                              className={`px-4 py-2.5 rounded-lg text-sm font-semibold shrink-0 border-2 transition-all ${
                                isTrue
                                  ? "border-green-500 bg-green-900/30 text-green-400"
                                  : "border-red-500 bg-red-900/30 text-red-400"
                              }`}
                            >
                              {isTrue ? "✓ Đúng" : "✗ Sai"}
                            </button>
                            {form.options.length > 2 && (
                              <button
                                onClick={() => removeOption(idx)}
                                className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {form.options.length < 6 && (
                        <button
                          onClick={addOption}
                          className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-purple-600 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Thêm phát biểu
                        </button>
                      )}
                    </div>
                  )}

                  {/* Short Answer / Essay */}
                  {(form.questionType === "SHORT_ANSWER" || form.questionType === "ESSAY") && (
                    <textarea
                      value={form.correctAnswer}
                      onChange={(e) => updateForm("correctAnswer", e.target.value)}
                      placeholder={
                        form.questionType === "SHORT_ANSWER"
                          ? "Nhập đáp án ngắn..."
                          : "Nhập đáp án mẫu hoặc hướng dẫn chấm..."
                      }
                      rows={form.questionType === "ESSAY" ? 5 : 2}
                      className="w-full px-4 py-3 border border-green-700/40 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y bg-green-900/10"
                    />
                  )}
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="block text-sm font-semibold text-foreground/80 mb-2">
                  Giải thích{" "}
                  <span className="text-slate-600 font-normal">(tùy chọn)</span>
                </label>
                <textarea
                  value={form.explanation}
                  onChange={(e) => updateForm("explanation", e.target.value)}
                  placeholder="Giải thích chi tiết cho đáp án..."
                  rows={2}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y bg-secondary text-foreground placeholder-muted-foreground"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-border rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCreateQuestion(true)}
                    disabled={creating}
                    className="px-4 py-2.5 border border-purple-700 text-purple-300 rounded-lg hover:bg-purple-950/30 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Lưu & Thêm tiếp
                  </button>
                  <button
                    onClick={() => handleCreateQuestion(false)}
                    disabled={creating}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {creating ? "Đang lưu..." : "Lưu câu hỏi"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        {!loading && questions.length > 0 && (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            {[
              { label: "Tổng", count: questions.length, cls: "text-foreground/80 bg-white/[0.05] border-white/[0.08]" },
              { label: "Dễ",   count: questions.filter(q => q.difficulty === "EASY").length,   cls: "text-green-400 bg-green-900/20 border-green-700/30" },
              { label: "TB",   count: questions.filter(q => q.difficulty === "MEDIUM").length, cls: "text-yellow-400 bg-yellow-900/20 border-yellow-700/30" },
              { label: "Khó",  count: questions.filter(q => q.difficulty === "HARD").length,   cls: "text-red-400 bg-red-900/20 border-red-700/30" },
            ].map(s => (
              <div key={s.label} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${s.cls}`}>
                <span>{s.label}</span>
                <span className="font-bold">{s.count}</span>
              </div>
            ))}
            <div className="flex-1" />
            {/* Type breakdown */}
            {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => {
              const cnt = questions.filter(q => q.questionType === type).length
              if (cnt === 0) return null
              return (
                <div key={type} className="text-xs text-muted-foreground bg-secondary border border-border px-2 py-1 rounded">
                  {label}: <span className="text-foreground/80 font-semibold">{cnt}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Search and Controls */}
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
            <input
              type="text"
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-secondary text-foreground placeholder-muted-foreground"
            />
          </div>
          {questions.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-2 border border-border text-foreground/80 rounded-lg text-sm hover:bg-secondary flex items-center gap-1"
              >
                <ChevronDown className="w-4 h-4" />
                Mở tất cả
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 border border-border text-foreground/80 rounded-lg text-sm hover:bg-secondary flex items-center gap-1"
              >
                <ChevronUp className="w-4 h-4" />
                Thu gọn
              </button>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-secondary text-foreground/80 focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Độ khó</option>
            {DIFFICULTY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-secondary text-foreground/80 focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Loại câu hỏi</option>
            {QUESTION_TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-secondary text-foreground/80 focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Khối lớp</option>
            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {/* Chương dropdown — auto populate từ taxonomy theo môn */}
          {taxonomy && taxonomy.chapters.length > 0 && (
            <select
              value={filterChapter}
              onChange={(e) => setFilterChapter(e.target.value)}
              title="Lọc theo Chương"
              className="px-3 py-2 border border-border rounded-lg text-sm bg-secondary text-foreground/80 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">📖 Chương</option>
              {taxonomy.chapters.slice(0, 50).map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
              ))}
            </select>
          )}
          {/* Bài dropdown — depend chương */}
          {taxonomy && taxonomy.lessons.length > 0 && (
            <select
              value={filterLesson}
              onChange={(e) => setFilterLesson(e.target.value)}
              title="Lọc theo Bài"
              className="px-3 py-2 border border-border rounded-lg text-sm bg-secondary text-foreground/80 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">📝 Bài</option>
              {taxonomy.lessons.slice(0, 80).map(l => (
                <option key={l.name} value={l.name}>{l.name} ({l.count})</option>
              ))}
            </select>
          )}
          {/* Từ khoá dropdown — chỉ show nếu có data */}
          {taxonomy && taxonomy.topKeywords.length > 0 && (
            <select
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              title="Lọc theo Từ khoá"
              className="px-3 py-2 border border-border rounded-lg text-sm bg-secondary text-foreground/80 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">🏷️ Từ khoá</option>
              {taxonomy.topKeywords.slice(0, 50).map(k => (
                <option key={k.name} value={k.name}>{k.name} ({k.count})</option>
              ))}
            </select>
          )}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-secondary text-foreground/80 focus:ring-2 focus:ring-purple-500"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="difficulty">Độ khó tăng dần</option>
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterDifficulty(""); setFilterType(""); setFilterGrade("")
                setFilterChapter(""); setFilterLesson(""); setFilterKeyword("")
              }}
              className="px-3 py-2 text-sm text-purple-400 hover:text-purple-300 border border-purple-700/50 rounded-lg hover:bg-purple-900/20 flex items-center gap-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Xóa bộ lọc ({activeFilterCount})
            </button>
          )}
          {/* Fix LaTeX errors button */}
          <button
            onClick={handleFixLatex}
            disabled={fixingLatex}
            title="Quét + sửa lỗi LaTeX phổ biến trong toàn bộ ngân hàng (smart quotes, unicode minus, typos \\fra→\\frac, ...)"
            className="px-3 py-2 text-sm text-amber-400 hover:text-amber-300 border border-amber-700/50 rounded-lg hover:bg-amber-900/20 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {fixingLatex ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {fixingLatex ? 'Đang fix...' : 'Fix LaTeX'}
          </button>
          {filteredQuestions.length !== questions.length && (
            <span className="text-xs text-muted-foreground ml-auto">
              Hiển thị {filteredQuestions.length} / {questions.length} câu hỏi
            </span>
          )}
        </div>

        {/* Questions List */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--td-card)', border: '1px solid #1e2033' }}>
          <div className="space-y-2 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-muted-foreground font-medium">Chưa có câu hỏi nào</p>
                <p className="text-slate-600 text-sm mt-1">
                  {activeFilterCount > 0 ? "Thử thay đổi bộ lọc để xem thêm câu hỏi" : "Tạo câu hỏi thủ công, import file hoặc sinh AI"}
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setFilterDifficulty(""); setFilterType(""); setFilterGrade("") }}
                    className="mt-3 text-sm text-purple-400 hover:text-purple-300 underline"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            ) : (
              filteredQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  isExpanded={expandedRows.has(question.id)}
                  onToggle={() => toggleRow(question.id)}
                  onSave={(updates) => handleSaveEdit(question.id, updates)}
                  onDelete={() => handleDelete(question.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Load More */}
        {!loading && questions.length < totalQuestions && activeFilterCount === 0 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-3 border border-border text-foreground/80 rounded-xl hover:bg-secondary transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải...</>
              ) : (
                <>Tải thêm ({totalQuestions - questions.length} câu còn lại)</>
              )}
            </button>
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

// ── Question Card Component ────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  isExpanded,
  onToggle,
  onSave,
  onDelete,
}: {
  question: Question
  index: number
  isExpanded: boolean
  onToggle: () => void
  onSave: (updates: Partial<Question>) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(question.content)
  const [editedOptions, setEditedOptions] = useState(question.options)
  const [editedCorrectAnswer, setEditedCorrectAnswer] = useState(question.correctAnswer)
  const [editedExplanation, setEditedExplanation] = useState(question.explanation)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await onSave({
      content: editedContent,
      options: editedOptions,
      correctAnswer: editedCorrectAnswer,
      explanation: editedExplanation,
    })
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleOptionChange = (idx: number, value: string) => {
    const newOptions = [...editedOptions]
    newOptions[idx] = value
    setEditedOptions(newOptions)
  }

  return (
    <div
      className={`border rounded-xl transition-all ${
        isExpanded
          ? "border-purple-700 bg-purple-950/30 shadow-md"
          : "border-border bg-card hover:border-border"
      }`}
    >
      {/* Collapsed View */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <button
            onClick={onToggle}
            className="mt-1 p-1 hover:bg-accent rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold text-purple-400 bg-purple-900/30 px-2 py-1 rounded">
                Câu {index + 1}
              </span>
              <span className="text-xs text-muted-foreground bg-border px-2 py-1 rounded">
                {question.subject}
              </span>
              <span className="text-xs text-muted-foreground bg-border px-2 py-1 rounded">
                {question.grade}
              </span>
              <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                {QUESTION_TYPE_LABELS[question.questionType] || question.questionType}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  question.difficulty === "EASY"
                    ? "text-green-400 bg-green-900/30"
                    : question.difficulty === "MEDIUM"
                    ? "text-yellow-400 bg-yellow-900/30"
                    : "text-red-400 bg-red-900/30"
                }`}
              >
                {DIFFICULTY_LABELS[question.difficulty] || question.difficulty}
              </span>
            </div>

            <p className="text-foreground font-medium line-clamp-2">{question.content}</p>

            {question.options.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3 max-w-2xl">
                {question.options.slice(0, 4).map((opt, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      String.fromCharCode(65 + idx) === question.correctAnswer
                        ? "bg-green-900/20 border-green-700 text-green-400 font-semibold"
                        : "bg-secondary border-border text-foreground/80"
                    }`}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => { setIsEditing(true); onToggle() }}
                className="px-3 py-1.5 border border-border text-foreground/80 rounded-lg text-xs hover:bg-secondary flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Sửa nhanh
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-red-400 hover:bg-red-900/30 rounded-lg text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Edit View */}
      {isExpanded && (
        <div className="border-t border-purple-800/40 p-4 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="text-sm font-semibold text-foreground/80 mb-2 block">
                  Nội dung câu hỏi
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-secondary text-foreground"
                  rows={3}
                />
              </div>

              {editedOptions.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-foreground/80 mb-2 block">
                    Phương án trả lời
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {editedOptions.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          onClick={() => setEditedCorrectAnswer(String.fromCharCode(65 + idx))}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                            String.fromCharCode(65 + idx) === editedCorrectAnswer
                              ? "bg-green-500 text-white"
                              : "bg-accent text-foreground/80 hover:bg-accent"
                          }`}
                          title="Chọn làm đáp án đúng"
                        >
                          {String.fromCharCode(65 + idx) === editedCorrectAnswer ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            String.fromCharCode(65 + idx)
                          )}
                        </button>
                        <input
                          value={option}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-secondary text-foreground ${
                            String.fromCharCode(65 + idx) === editedCorrectAnswer
                              ? "border-green-600 bg-green-900/20"
                              : "border-border"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-foreground/80 mb-2 block">Giải thích</label>
                <textarea
                  value={editedExplanation}
                  onChange={(e) => setEditedExplanation(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-secondary text-foreground"
                  rows={2}
                  placeholder="Giải thích chi tiết (tùy chọn)..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-border text-foreground/80 rounded-lg text-sm hover:bg-secondary flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Lưu thay đổi</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Full question content */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nội dung đầy đủ</p>
                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{question.content}</p>
              </div>

              {/* MULTIPLE_TF display */}
              {question.questionType === "MULTIPLE_TF" && question.options.length > 0 && (() => {
                const answers = question.correctAnswer.split(",")
                return (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Các phát biểu</p>
                    <div className="space-y-2">
                      {question.options.map((opt, idx) => {
                        const ans = answers[idx] || "?"
                        return (
                          <div key={idx} className={`flex items-start gap-3 px-3 py-2 rounded-lg border text-sm ${
                            ans === "Đúng" ? "border-green-700/40 bg-green-900/15 text-green-300" : "border-red-700/40 bg-red-900/15 text-red-300"
                          }`}>
                            <span className="font-bold shrink-0 text-xs mt-0.5">{String.fromCharCode(97 + idx)})</span>
                            <span className="flex-1 text-foreground">{opt}</span>
                            <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded ${ans === "Đúng" ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400"}`}>
                              {ans === "Đúng" ? "✓ Đúng" : "✗ Sai"}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Explanation */}
              {question.explanation && (
                <div className="bg-amber-900/15 border border-amber-700/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-400 mb-1">💡 Giải thích</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{question.explanation}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-purple-600/20 border border-purple-700 text-purple-300 rounded-lg text-sm hover:bg-purple-600/30 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Chỉnh sửa câu hỏi này
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
