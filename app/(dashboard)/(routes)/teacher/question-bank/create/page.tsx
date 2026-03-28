"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Plus, Trash2, Save, Loader2, HelpCircle, Sparkles } from "lucide-react"
import { toast } from "react-hot-toast"

const QUESTION_TYPES = [
  { value: "TNKQ - Nhiều lựa chọn", label: "TNKQ - Nhiều lựa chọn" },
  { value: "TNKQ - Đúng/Sai", label: "TNKQ - Đúng/Sai" },
  { value: "TNKQ - Trả lời ngắn", label: "TNKQ - Trả lời ngắn" },
  { value: "Tự luận", label: "Tự luận" },
]

const DIFFICULTY_LEVELS = [
  { value: "EASY", label: "Dễ (NB)" },
  { value: "MEDIUM", label: "Trung bình (TH)" },
  { value: "HARD", label: "Khó (VD)" },
  { value: "VERY_HARD", label: "Rất khó (VDC)" },
]

const COGNITIVE_LEVEL_MAP: Record<string, string> = {
  EASY: "Nhận biết",
  MEDIUM: "Thông hiểu",
  HARD: "Vận dụng",
  VERY_HARD: "Vận dụng cao"
}

const COGNITIVE_LEVELS = [
  { value: "Nhận biết", label: "Nhận biết" },
  { value: "Thông hiểu", label: "Thông hiểu" },
  { value: "Vận dụng", label: "Vận dụng" },
  { value: "Vận dụng cao", label: "Vận dụng cao" },
]

const SUBJECTS = [
  "Toán học",
  "Ngữ văn",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Lịch sử và Địa lý",
  "Tiếng Việt",
  "Tiếng Anh",
  "GDCD",
  "Đạo đức",
  "Tin học",
  "Khoa học máy tính",
  "KHTN",
  "Khoa học",
  "Tự nhiên và Xã hội",
  "Công nghệ",
  "Kinh tế pháp luật",
  "Âm nhạc",
  "Mĩ thuật",
  "Thể dục",
  "Hoạt động trải nghiệm",
  "Quốc phòng",
]

const GRADES = [
  "Khối 1",
  "Khối 2",
  "Khối 3",
  "Khối 4",
  "Khối 5",
  "Khối 6",
  "Khối 7",
  "Khối 8",
  "Khối 9",
  "Khối 10",
  "Khối 11",
  "Khối 12",
]

interface QuestionFormData {
  content: string
  type: string
  subject: string
  grade: string
  difficulty: string
  cognitiveLevel: string
  topic: string
  explanation: string
  options: string[]
  correctAnswer: string
  keywords: string[]
  learningObjectives: string[]
}

// AI Native Glass Card
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
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
  children: React.ReactNode; onClick?: () => void;
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

export default function CreateQuestionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<QuestionFormData>({
    content: "",
    type: "",
    subject: "",
    grade: "",
    difficulty: "Trung bình",
    cognitiveLevel: "Hiểu",
    topic: "",
    explanation: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    keywords: [],
    learningObjectives: [],
  })

  const [newKeyword, setNewKeyword] = useState("")
  const [newObjective, setNewObjective] = useState("")
  const [generatingAnswer, setGeneratingAnswer] = useState(false)

  const handleInputChange = (field: keyof QuestionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }

  const addOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ""] }))
  }

  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()],
      }))
      setNewKeyword("")
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }))
  }

  const addObjective = () => {
    if (newObjective.trim() && !formData.learningObjectives.includes(newObjective.trim())) {
      setFormData((prev) => ({
        ...prev,
        learningObjectives: [...prev.learningObjectives, newObjective.trim()],
      }))
      setNewObjective("")
    }
  }

  const removeObjective = (objective: string) => {
    setFormData((prev) => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter((o) => o !== objective),
    }))
  }

  const handleGenerateAnswer = async () => {
    if (!formData.content.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi trước")
      return
    }
    setGeneratingAnswer(true)
    try {
      const res = await fetch("/api/question-bank/generate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: formData.content,
          questionType: formData.type,
          subject: formData.subject,
          grade: formData.grade,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Không thể sinh đáp án")
      }
      const data = await res.json()
      if (data.answer) {
        handleInputChange("correctAnswer", data.answer)
        toast.success("Đã sinh đáp án mẫu bằng AI")
      }
    } catch (e: any) {
      toast.error(e.message || "Không thể sinh đáp án")
    } finally {
      setGeneratingAnswer(false)
    }
  }

  const validateForm = (): boolean => {
    if (!formData.content.trim()) {
      toast.error("Vui lòng nhập nội dung câu hỏi")
      return false
    }

    if (!formData.type) {
      toast.error("Vui lòng chọn loại câu hỏi")
      return false
    }

    if (!formData.subject) {
      toast.error("Vui lòng chọn môn học")
      return false
    }

    if (!formData.grade) {
      toast.error("Vui lòng chọn khối")
      return false
    }

    if (formData.type === "TNKQ - Nhiều lựa chọn") {
      const validOptions = formData.options.filter((opt) => opt.trim())
      if (validOptions.length < 2) {
        toast.error("Câu hỏi nhiều lựa chọn cần ít nhất 2 phương án")
        return false
      }

      if (!formData.correctAnswer) {
        toast.error("Vui lòng chọn đáp án đúng")
        return false
      }
    }

    if (formData.type === "TNKQ - Đúng/Sai") {
      if (!formData.correctAnswer || !["Đúng", "Sai"].includes(formData.correctAnswer)) {
        toast.error("Vui lòng chọn đáp án đúng (Đúng hoặc Sai)")
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      let options = formData.options
      if (formData.type === "TNKQ - Nhiều lựa chọn") {
        options = formData.options.filter((opt) => opt.trim())
      } else if (formData.type === "TNKQ - Đúng/Sai") {
        options = ["Đúng", "Sai"]
      } else {
        options = []
      }

      const response = await fetch("/api/question-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: formData.content,
          type: formData.type,
          subject: formData.subject,
          grade: formData.grade,
          difficulty: formData.difficulty,
          cognitiveLevel: formData.cognitiveLevel,
          topic: formData.topic || formData.subject,
          explanation: formData.explanation,
          options: options,
          correctAnswer: formData.correctAnswer,
          keywords: formData.keywords,
          learningObjectives: formData.learningObjectives.length > 0
            ? formData.learningObjectives
            : [formData.cognitiveLevel],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        let errorMessage = error.error || "Không thể tạo câu hỏi"
        
        if (error.code === "PRISMA_SCHEMA_NOT_SYNCED") {
          errorMessage = "Database chưa được đồng bộ. Vui lòng chạy: npx prisma generate && npx prisma db push"
        }
        
        throw new Error(errorMessage)
      }

      toast.success("Đã tạo câu hỏi thành công")
      router.push("/teacher/question-bank")
    } catch (error: any) {
      console.error("Create question error:", error)
      toast.error(error.message || "Không thể tạo câu hỏi")
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const isMCQ = formData.type === "TNKQ - Nhiều lựa chọn"
  const isTrueFalse = formData.type === "TNKQ - Đúng/Sai"

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <GlassCard className="relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
        <div className="relative flex items-center gap-4">
          <AIButton
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </AIButton>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-purple-600">
                Tạo câu hỏi mới
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Thêm câu hỏi vào ngân hàng câu hỏi
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Information */}
        <GlassCard>
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Thông tin cơ bản</h2>
            <p className="text-sm text-gray-600">
              Nhập thông tin cơ bản của câu hỏi
            </p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="content" className="block text-sm font-semibold text-gray-900">Nội dung câu hỏi *</label>
              <textarea
                id="content"
                placeholder="Nhập nội dung câu hỏi..."
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                rows={4}
                className="ai-input w-full px-4 py-3 rounded-xl resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="type" className="block text-sm font-semibold text-gray-900">Loại câu hỏi *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                  className="ai-input w-full px-4 py-2.5 rounded-xl appearance-none bg-transparent"
                >
                  <option value="" disabled hidden>Chọn loại câu hỏi</option>
                  {QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value} className="bg-[hsl(var(--background))]">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-900">Môn học *</label>
                <select
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="ai-input w-full px-4 py-2.5 rounded-xl appearance-none bg-transparent"
                >
                  <option value="" disabled hidden>Chọn môn học</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject} className="bg-[hsl(var(--background))]">
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="grade" className="block text-sm font-semibold text-gray-900">Khối *</label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => handleInputChange("grade", e.target.value)}
                  className="ai-input w-full px-4 py-2.5 rounded-xl appearance-none bg-transparent"
                >
                  <option value="" disabled hidden>Chọn khối</option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade} className="bg-[hsl(var(--background))]">
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="difficulty" className="block text-sm font-semibold text-gray-900">Độ khó</label>
                <select
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange("difficulty", e.target.value)}
                  className="ai-input w-full px-4 py-2.5 rounded-xl appearance-none bg-transparent"
                >
                  <option value="" disabled hidden>Chọn độ khó</option>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value} className="bg-[hsl(var(--background))]">
                      {level.label}
                    </option>
                  ))}
                </select>
                {formData.difficulty && (
                  <p className="text-xs text-gray-500">
                    Mức độ nhận thức: <span className="font-medium text-purple-600">{COGNITIVE_LEVEL_MAP[formData.difficulty]}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="cognitiveLevel" className="block text-sm font-semibold text-gray-900">Mức độ nhận thức</label>
                <select
                  id="cognitiveLevel"
                  value={formData.cognitiveLevel}
                  onChange={(e) => handleInputChange("cognitiveLevel", e.target.value)}
                  className="ai-input w-full px-4 py-2.5 rounded-xl appearance-none bg-transparent"
                >
                  {COGNITIVE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value} className="bg-[hsl(var(--background))]">
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="topic" className="block text-sm font-semibold text-gray-900">Chủ đề</label>
                <input
                  id="topic"
                  placeholder="Nhập chủ đề..."
                  value={formData.topic}
                  onChange={(e) => handleInputChange("topic", e.target.value)}
                  className="ai-input w-full px-4 py-2.5 rounded-xl"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Options for MCQ */}
        {isMCQ && (
          <GlassCard>
            <div className="mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Phương án trả lời</h2>
              <p className="text-sm text-gray-600">
                Thêm các phương án trả lời cho câu hỏi nhiều lựa chọn
              </p>
            </div>
            <div className="space-y-4">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      placeholder={`Phương án ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="ai-input w-full px-4 py-2.5 rounded-xl"
                    />
                  </div>
                  <AIButton
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={formData.options.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </AIButton>
                </div>
              ))}
              <AIButton
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                onClick={addOption}
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm phương án
              </AIButton>

              <div className="space-y-2 mt-6 p-4 bg-[hsl(var(--success)/0.05)] rounded-xl border border-[hsl(var(--success)/0.2)]">
                <label htmlFor="correctAnswer" className="block text-sm font-semibold text-green-600">Đáp án đúng *</label>
                <select
                  id="correctAnswer"
                  value={formData.correctAnswer}
                  onChange={(e) => handleInputChange("correctAnswer", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--background))] border border-green-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--success))]"
                >
                  <option value="" disabled hidden>Chọn đáp án đúng</option>
                  {formData.options
                    .map((opt, idx) => ({
                      value: idx.toString(),
                      label: `${String.fromCharCode(65 + idx)}. ${opt || `Phương án ${String.fromCharCode(65 + idx)}`}`,
                    }))
                    .filter((opt) => formData.options[parseInt(opt.value)]?.trim())
                    .map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[hsl(var(--background))]">
                        {opt.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Options for True/False */}
        {isTrueFalse && (
          <GlassCard>
            <div className="mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Đáp án</h2>
            </div>
            <div>
              <div className="space-y-2 p-4 bg-[hsl(var(--success)/0.05)] rounded-xl border border-[hsl(var(--success)/0.2)]">
                <label htmlFor="correctAnswer" className="block text-sm font-semibold text-green-600">Đáp án đúng *</label>
                <select
                  id="correctAnswer"
                  value={formData.correctAnswer}
                  onChange={(e) => handleInputChange("correctAnswer", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[hsl(var(--background))] border border-green-200 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--success))]"
                >
                  <option value="" disabled hidden>Chọn đáp án đúng</option>
                  <option value="Đúng" className="bg-[hsl(var(--background))]">Đúng</option>
                  <option value="Sai" className="bg-[hsl(var(--background))]">Sai</option>
                </select>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Answer for Short Answer and Essay */}
        {(formData.type === "TNKQ - Trả lời ngắn" || formData.type === "Tự luận") && (
          <GlassCard>
            <div className="mb-6 border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Đáp án mẫu</h2>
              <p className="text-sm text-gray-600">
                Nhập đáp án mẫu hoặc hướng dẫn chấm điểm
              </p>
            </div>
            <div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <label htmlFor="correctAnswer" className="block text-sm font-semibold text-green-600">Đáp án / Hướng dẫn chấm *</label>
                  <AIButton
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    size="sm"
                    onClick={handleGenerateAnswer}
                    disabled={generatingAnswer || !formData.content.trim()}
                  >
                    {generatingAnswer ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Gen đáp án AI
                  </AIButton>
                </div>
                <textarea
                  id="correctAnswer"
                  placeholder="Nhập đáp án mẫu hoặc hướng dẫn chấm điểm..."
                  value={formData.correctAnswer}
                  onChange={(e) => handleInputChange("correctAnswer", e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--success)/0.05)] border border-[hsl(var(--success)/0.2)] text-gray-900 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--success))] resize-y"
                />
              </div>
            </div>
          </GlassCard>
        )}

        {/* Explanation */}
        <GlassCard>
          <div className="mb-6 border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Giải thích</h2>
            <p className="text-sm text-gray-600">
              Giải thích chi tiết cho câu hỏi (tùy chọn)
            </p>
          </div>
          <div>
            <div className="space-y-2">
              <label htmlFor="explanation" className="block text-sm font-semibold text-gray-900">Giải thích</label>
              <textarea
                id="explanation"
                placeholder="Nhập giải thích chi tiết..."
                value={formData.explanation}
                onChange={(e) => handleInputChange("explanation", e.target.value)}
                rows={4}
                className="ai-input w-full px-4 py-3 rounded-xl resize-y"
              />
            </div>
          </div>
        </GlassCard>

        {/* Keywords and Learning Objectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard>
            <div className="mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Từ khóa</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  placeholder="Nhập từ khóa..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="ai-input w-full px-3 py-2 rounded-xl"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                />
                <AIButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" size="icon" onClick={addKeyword}>
                  <Plus className="h-4 w-4" />
                </AIButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {formData.keywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="flex items-center gap-2 bg-[hsl(var(--info)/0.15)] text-blue-600 border border-[hsl(var(--info)/0.3)] px-3 py-1.5 rounded-xl text-xs font-bold"
                  >
                    <span>{keyword}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Mục tiêu học tập</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  placeholder="Nhập mục tiêu..."
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  className="ai-input w-full px-3 py-2 rounded-xl"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addObjective()
                    }
                  }}
                />
                <AIButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" size="icon" onClick={addObjective}>
                  <Plus className="h-4 w-4" />
                </AIButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {formData.learningObjectives.map((objective) => (
                  <div
                    key={objective}
                    className="flex items-center gap-2 bg-[hsl(var(--success)/0.15)] text-green-600 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                  >
                    <span>{objective}</span>
                    <button
                      type="button"
                      onClick={() => removeObjective(objective)}
                      className="hover:text-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <AIButton
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            onClick={() => router.back()}
            disabled={loading}
          >
            Hủy
          </AIButton>
          <AIButton className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Lưu câu hỏi
              </>
            )}
          </AIButton>
        </div>
      </div>
    </div>
  )
}
