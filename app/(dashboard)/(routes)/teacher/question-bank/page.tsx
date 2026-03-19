"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Upload, Sparkles, Database,
  Search, CheckCircle2, ChevronDown, ChevronUp, Edit2,
  Save, X, Loader2, Trash2, PenLine, CirclePlus, Check
} from "lucide-react"
import { BulkGenerateModal } from "@/components/question-bank/bulk-generate-modal"
import { ImportModal } from "@/components/question-bank/import-modal"
import { toast } from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  { id: "tieng-anh", name: "Tiếng Anh", dbValue: "Tiếng Anh", description: "Grammar, Vocabulary, Reading" },
  { id: "lich-su", name: "Lịch sử", dbValue: "Lịch sử", description: "Sử Việt Nam, Sử Thế giới" },
  { id: "dia-ly", name: "Địa lý", dbValue: "Địa lý", description: "Địa lý tự nhiên, Kinh tế" },
  { id: "gdcd", name: "GDCD", dbValue: "GDCD", description: "Giáo dục công dân" },
  { id: "tin-hoc", name: "Tin học", dbValue: "Tin học", description: "Lập trình, Ứng dụng" }
]

const getSubjectDbValue = (subjectId: string): string => {
  const subject = SUBJECT_CATEGORIES.find(s => s.id === subjectId)
  return subject?.dbValue || subjectId
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Nhiều lựa chọn",
  TRUE_FALSE: "Đúng - Sai",
  MULTIPLE_TF: "Đúng/Sai nhiều ý",
  SHORT_ANSWER: "Trả lời ngắn",
  ESSAY: "Tự luận"
}

const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó"
}

const QUESTION_TYPE_OPTIONS = [
  { value: "MCQ", label: "Nhiều lựa chọn (A, B, C, D)", icon: "🔘" },
  { value: "TRUE_FALSE", label: "Đúng / Sai", icon: "✅" },
  { value: "SHORT_ANSWER", label: "Trả lời ngắn", icon: "✏️" },
  { value: "ESSAY", label: "Tự luận", icon: "📝" },
]

const DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "Dễ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HARD", label: "Khó" },
]

const GRADE_OPTIONS = [
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12",
]

const INITIAL_FORM = {
  content: "",
  questionType: "",
  subject: "",
  grade: "",
  difficulty: "MEDIUM",
  topic: "",
  explanation: "",
  options: ["", "", "", ""],
  correctAnswer: "",
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Manual creation state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)

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
      params.set('limit', '100')
      const response = await fetch(`/api/questions?${params.toString()}`)
      const data = await response.json()
      if (data.success) {
        setTotalQuestions(data.data.pagination.total)
        setQuestions(data.data.questions || [])
      }
    } catch (error) {
      console.error('Error loading questions:', error)
      toast.error("Không thể tải câu hỏi")
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
    } catch (error) {
      toast.error("Lỗi khi lưu")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa câu hỏi này?")) return
    try {
      await fetch(`/api/questions/${id}`, { method: "DELETE" })
      toast.success("Đã xóa")
      loadQuestions()
    } catch (error) {
      toast.error("Không thể xóa")
    }
  }

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const expandAll = () => {
    setExpandedRows(new Set(questions.map(q => q.id)))
  }

  const collapseAll = () => {
    setExpandedRows(new Set())
  }

  const filteredQuestions = questions.filter((q) => 
    q.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Manual creation handlers ──────────────────────────────────────────
  const updateForm = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateOption = (idx: number, value: string) => {
    setForm(prev => {
      const opts = [...prev.options]
      opts[idx] = value
      return { ...prev, options: opts }
    })
  }

  const addOption = () => {
    setForm(prev => ({ ...prev, options: [...prev.options, ""] }))
  }

  const removeOption = (idx: number) => {
    setForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
      correctAnswer:
        prev.correctAnswer === String.fromCharCode(65 + idx)
          ? ""
          : prev.correctAnswer,
    }))
  }

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
      const filled = form.options.filter(o => o.trim())
      if (filled.length < 2) { toast.error("Cần ít nhất 2 phương án trả lời"); return false }
      if (!form.correctAnswer) { toast.error("Vui lòng chọn đáp án đúng"); return false }
    }
    if (form.questionType === "TRUE_FALSE" && !form.correctAnswer) {
      toast.error("Vui lòng chọn Đúng hoặc Sai"); return false
    }
    if ((form.questionType === "SHORT_ANSWER" || form.questionType === "ESSAY") && !form.correctAnswer.trim()) {
      toast.error("Vui lòng nhập đáp án mẫu"); return false
    }

    setCreating(true)
    try {
      let options: string[] = []
      if (form.questionType === "MCQ") {
        options = form.options.filter(o => o.trim())
      } else if (form.questionType === "TRUE_FALSE") {
        options = ["Đúng", "Sai"]
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
          correctAnswer: form.correctAnswer,
          learningObjectives: [form.topic.trim() || form.subject],
          keywords: [form.topic.trim() || form.subject, form.subject],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Không thể tạo câu hỏi")

      toast.success("Đã tạo câu hỏi thành công!")

      if (keepFormOpen) {
        setForm(prev => ({
          ...INITIAL_FORM,
          questionType: prev.questionType,
          subject: prev.subject,
          grade: prev.grade,
          difficulty: prev.difficulty,
          topic: prev.topic,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ngân Hàng Câu Hỏi</h1>
                <p className="text-sm text-gray-600">{totalQuestions} câu hỏi</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm(v => !v)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                  showCreateForm
                    ? "bg-purple-100 text-purple-700 border border-purple-300"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <PenLine className="w-4 h-4" />
                Thêm thủ công
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {SUBJECT_CATEGORIES.map((subject) => (
              <div
                key={subject.id}
                onClick={() => setSelectedSubject(selectedSubject === subject.id ? null : subject.id)}
                className={`bg-white rounded-xl shadow-sm border p-3 cursor-pointer transition-all hover:shadow-md ${
                  selectedSubject === subject.id
                    ? 'ring-2 ring-purple-500 border-purple-300 bg-purple-50'
                    : 'border-gray-100'
                }`}
              >
                <div className="text-center">
                  <h3 className="font-bold text-gray-900 text-sm">{subject.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 truncate">{subject.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Manual Create Form ─────────────────────────────────────── */}
        {showCreateForm && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
                  <CirclePlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Tạo câu hỏi thủ công</h3>
                  <p className="text-xs text-gray-500">Chọn loại câu hỏi, nhập nội dung và đáp án</p>
                </div>
              </div>
              <button onClick={() => setShowCreateForm(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Question Type Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">1. Chọn loại câu hỏi *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {QUESTION_TYPE_OPTIONS.map(qt => (
                    <button
                      key={qt.value}
                      onClick={() => {
                        updateForm("questionType", qt.value)
                        if (qt.value === "TRUE_FALSE") {
                          updateForm("correctAnswer", "")
                        } else if (qt.value !== "MCQ") {
                          updateForm("correctAnswer", "")
                        }
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        form.questionType === qt.value
                          ? "border-purple-500 bg-purple-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{qt.icon}</span>
                      <span className={`text-sm font-semibold ${
                        form.questionType === qt.value ? "text-purple-700" : "text-gray-700"
                      }`}>
                        {qt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Meta (Subject, Grade, Difficulty, Topic) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">2. Thông tin phân loại</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Môn học *</label>
                    <select
                      value={form.subject}
                      onChange={e => updateForm("subject", e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="">Chọn môn</option>
                      {SUBJECT_CATEGORIES.map(s => (
                        <option key={s.id} value={s.dbValue}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Khối *</label>
                    <select
                      value={form.grade}
                      onChange={e => updateForm("grade", e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      <option value="">Chọn khối</option>
                      {GRADE_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Độ khó</label>
                    <select
                      value={form.difficulty}
                      onChange={e => updateForm("difficulty", e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      {DIFFICULTY_OPTIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Chủ đề</label>
                    <input
                      value={form.topic}
                      onChange={e => updateForm("topic", e.target.value)}
                      placeholder="VD: Dao động cơ"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Question Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">3. Nội dung câu hỏi *</label>
                <textarea
                  value={form.content}
                  onChange={e => updateForm("content", e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
                />
              </div>

              {/* Step 4: Answer section – dynamic by type */}
              {form.questionType && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">4. Đáp án</label>

                  {/* ── MCQ ── */}
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
                                  ? "bg-green-500 text-white shadow-sm"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                              title={isCorrect ? "Đáp án đúng" : "Chọn làm đáp án đúng"}
                            >
                              {isCorrect ? <Check className="w-4 h-4" /> : letter}
                            </button>
                            <input
                              value={opt}
                              onChange={e => updateOption(idx, e.target.value)}
                              placeholder={`Phương án ${letter}`}
                              className={`flex-1 px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                isCorrect ? "border-green-300 bg-green-50" : "border-gray-300"
                              }`}
                            />
                            {form.options.length > 2 && (
                              <button
                                onClick={() => removeOption(idx)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      <button
                        onClick={addOption}
                        className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm phương án
                      </button>
                      {!form.correctAnswer && form.options.some(o => o.trim()) && (
                        <p className="text-xs text-amber-600">Nhấn vào chữ cái bên trái để chọn đáp án đúng</p>
                      )}
                    </div>
                  )}

                  {/* ── TRUE_FALSE ── */}
                  {form.questionType === "TRUE_FALSE" && (
                    <div className="flex gap-4">
                      {["Đúng", "Sai"].map(val => (
                        <button
                          key={val}
                          onClick={() => updateForm("correctAnswer", val)}
                          className={`flex-1 py-4 rounded-xl border-2 text-center font-semibold transition-all ${
                            form.correctAnswer === val
                              ? val === "Đúng"
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-red-500 bg-red-50 text-red-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {val === "Đúng" ? "✓ " : "✗ "}{val}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── SHORT_ANSWER / ESSAY ── */}
                  {(form.questionType === "SHORT_ANSWER" || form.questionType === "ESSAY") && (
                    <textarea
                      value={form.correctAnswer}
                      onChange={e => updateForm("correctAnswer", e.target.value)}
                      placeholder={
                        form.questionType === "SHORT_ANSWER"
                          ? "Nhập đáp án ngắn..."
                          : "Nhập đáp án mẫu hoặc hướng dẫn chấm..."
                      }
                      rows={form.questionType === "ESSAY" ? 5 : 2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y bg-green-50 border-green-200"
                    />
                  )}
                </div>
              )}

              {/* Explanation (optional) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Giải thích <span className="text-gray-400 font-normal">(tùy chọn)</span>
                </label>
                <textarea
                  value={form.explanation}
                  onChange={e => updateForm("explanation", e.target.value)}
                  placeholder="Giải thích chi tiết cho đáp án..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCreateQuestion(true)}
                    disabled={creating}
                    className="px-4 py-2.5 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
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

        {/* Search and Controls */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          {questions.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="px-3 py-2 text-sm"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                Mở tất cả
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="px-3 py-2 text-sm"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                Thu gọn tất cả
              </Button>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="space-y-2 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 font-medium">Chưa có câu hỏi nào</p>
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

// Question Card Component
function QuestionCard({ 
  question, 
  index, 
  isExpanded, 
  onToggle, 
  onSave,
  onDelete 
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

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...editedOptions]
    newOptions[index] = value
    setEditedOptions(newOptions)
  }

  return (
    <div className={`border rounded-xl transition-all ${
      isExpanded 
        ? 'border-purple-300 bg-purple-50 shadow-md' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Collapsed View */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <button
            onClick={onToggle}
            className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                Câu {index + 1}
              </span>
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {question.subject}
              </span>
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {question.grade}
              </span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {QUESTION_TYPE_LABELS[question.questionType]}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                question.difficulty === 'EASY' ? 'text-green-600 bg-green-100' :
                question.difficulty === 'MEDIUM' ? 'text-yellow-600 bg-yellow-100' :
                'text-red-600 bg-red-100'
              }`}>
                {DIFFICULTY_LABELS[question.difficulty]}
              </span>
            </div>
            
            <p className="text-gray-900 font-medium line-clamp-2">{question.content}</p>
            
            {question.options.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3 max-w-2xl">
                {question.options.slice(0, 4).map((opt, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      String.fromCharCode(65 + idx) === question.correctAnswer
                        ? 'bg-green-50 border-green-200 text-green-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(true)
                  onToggle()
                }}
                className="text-sm"
              >
                <Edit2 className="w-3 h-3 mr-1" />
                Sửa nhanh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Xóa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Edit View */}
      {isExpanded && (
        <div className="border-t border-purple-200 p-4 space-y-4">
          {isEditing ? (
            <>
              {/* Content */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Nội dung câu hỏi
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>

              {/* Options */}
              {editedOptions.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Phương án trả lời
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {editedOptions.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          String.fromCharCode(65 + idx) === editedCorrectAnswer
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          value={option}
                          onChange={(e) => handleOptionChange(idx, e.target.value)}
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                            String.fromCharCode(65 + idx) === editedCorrectAnswer
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-300'
                          }`}
                        />
                        <button
                          onClick={() => setEditedCorrectAnswer(String.fromCharCode(65 + idx))}
                          className="p-2 hover:bg-gray-200 rounded transition-colors"
                          title="Chọn làm đáp án đúng"
                        >
                          {String.fromCharCode(65 + idx) === editedCorrectAnswer && (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Giải thích
                </label>
                <textarea
                  value={editedExplanation}
                  onChange={(e) => setEditedExplanation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  placeholder="Giải thích chi tiết (tùy chọn)..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-green-600 text-white hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-gray-600">
              <p>Chế độ xem nhanh. Click "Sửa nhanh" để chỉnh sửa.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
