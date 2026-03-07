"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Plus, Trash2, Save, Loader2, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "react-hot-toast"

const QUESTION_TYPES = [
  { value: "TNKQ - Nhiều lựa chọn", label: "TNKQ - Nhiều lựa chọn" },
  { value: "TNKQ - Đúng/Sai", label: "TNKQ - Đúng/Sai" },
  { value: "TNKQ - Trả lời ngắn", label: "TNKQ - Trả lời ngắn" },
  { value: "Tự luận", label: "Tự luận" },
]

const DIFFICULTY_LEVELS = [
  { value: "Dễ", label: "Dễ" },
  { value: "Trung bình", label: "Trung bình" },
  { value: "Khó", label: "Khó" },
]

const COGNITIVE_LEVELS = [
  { value: "Biết", label: "Biết" },
  { value: "Hiểu", label: "Hiểu" },
  { value: "Vận dụng", label: "Vận dụng" },
  { value: "Phân tích", label: "Phân tích" },
  { value: "Đánh giá", label: "Đánh giá" },
  { value: "Sáng tạo", label: "Sáng tạo" },
]

const SUBJECTS = [
  "Toán học",
  "Văn học",
  "Vật lý",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lý",
  "Tiếng Anh",
  "GDCD",
  "Công nghệ",
]

const GRADES = [
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

    // Validate options for MCQ
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

    // Validate for True/False
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
      // Prepare options for MCQ
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

      const data = await response.json()
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-blue-600" />
            Tạo câu hỏi mới
          </h1>
          <p className="text-muted-foreground mt-1">
            Thêm câu hỏi vào ngân hàng câu hỏi
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
            <CardDescription>
              Nhập thông tin cơ bản của câu hỏi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Nội dung câu hỏi *</Label>
              <Textarea
                id="content"
                placeholder="Nhập nội dung câu hỏi..."
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Loại câu hỏi *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Chọn loại câu hỏi" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Môn học *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(value) => handleInputChange("subject", value)}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Chọn môn học" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Khối *</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) => handleInputChange("grade", value)}
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="Chọn khối" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Độ khó</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => handleInputChange("difficulty", value)}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cognitiveLevel">Mức độ nhận thức</Label>
                <Select
                  value={formData.cognitiveLevel}
                  onValueChange={(value) => handleInputChange("cognitiveLevel", value)}
                >
                  <SelectTrigger id="cognitiveLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COGNITIVE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic">Chủ đề</Label>
                <Input
                  id="topic"
                  placeholder="Nhập chủ đề..."
                  value={formData.topic}
                  onChange={(e) => handleInputChange("topic", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options for MCQ */}
        {isMCQ && (
          <Card>
            <CardHeader>
              <CardTitle>Phương án trả lời</CardTitle>
              <CardDescription>
                Thêm các phương án trả lời cho câu hỏi nhiều lựa chọn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder={`Phương án ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={formData.options.length <= 2}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm phương án
              </Button>

              <div className="space-y-2">
                <Label htmlFor="correctAnswer">Đáp án đúng *</Label>
                <Select
                  value={formData.correctAnswer}
                  onValueChange={(value) => handleInputChange("correctAnswer", value)}
                >
                  <SelectTrigger id="correctAnswer">
                    <SelectValue placeholder="Chọn đáp án đúng" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.options
                      .map((opt, idx) => ({
                        value: idx.toString(),
                        label: `${String.fromCharCode(65 + idx)}. ${opt || `Phương án ${String.fromCharCode(65 + idx)}`}`,
                      }))
                      .filter((opt) => formData.options[parseInt(opt.value)]?.trim())
                      .map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Options for True/False */}
        {isTrueFalse && (
          <Card>
            <CardHeader>
              <CardTitle>Đáp án</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="correctAnswer">Đáp án đúng *</Label>
                <Select
                  value={formData.correctAnswer}
                  onValueChange={(value) => handleInputChange("correctAnswer", value)}
                >
                  <SelectTrigger id="correctAnswer">
                    <SelectValue placeholder="Chọn đáp án đúng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Đúng">Đúng</SelectItem>
                    <SelectItem value="Sai">Sai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Answer for Short Answer and Essay */}
        {(formData.type === "TNKQ - Trả lời ngắn" || formData.type === "Tự luận") && (
          <Card>
            <CardHeader>
              <CardTitle>Đáp án mẫu</CardTitle>
              <CardDescription>
                Nhập đáp án mẫu hoặc hướng dẫn chấm điểm
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="correctAnswer">Đáp án / Hướng dẫn chấm *</Label>
                <Textarea
                  id="correctAnswer"
                  placeholder="Nhập đáp án mẫu hoặc hướng dẫn chấm điểm..."
                  value={formData.correctAnswer}
                  onChange={(e) => handleInputChange("correctAnswer", e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Giải thích</CardTitle>
            <CardDescription>
              Giải thích chi tiết cho câu hỏi (tùy chọn)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="explanation">Giải thích</Label>
              <Textarea
                id="explanation"
                placeholder="Nhập giải thích chi tiết..."
                value={formData.explanation}
                onChange={(e) => handleInputChange("explanation", e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Keywords and Learning Objectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Từ khóa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập từ khóa..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addKeyword()
                    }
                  }}
                />
                <Button type="button" onClick={addKeyword} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.keywords.map((keyword) => (
                  <div
                    key={keyword}
                    className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="hover:text-blue-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mục tiêu học tập</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập mục tiêu..."
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addObjective()
                    }
                  }}
                />
                <Button type="button" onClick={addObjective} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.learningObjectives.map((objective) => (
                  <div
                    key={objective}
                    className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-md text-sm"
                  >
                    {objective}
                    <button
                      type="button"
                      onClick={() => removeObjective(objective)}
                      className="hover:text-green-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
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
          </Button>
        </div>
      </div>
    </div>
  )
}
