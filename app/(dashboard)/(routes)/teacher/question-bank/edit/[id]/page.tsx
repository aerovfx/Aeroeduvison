"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, Save, Loader2, HelpCircle, Sparkles } from "lucide-react"
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
const SUBJECTS = ["Toán học", "Văn học", "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý", "Tiếng Anh", "GDCD", "Công nghệ"]
const GRADES = ["Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"]

const TYPE_DB_TO_UI: Record<string, string> = {
  MCQ: "TNKQ - Nhiều lựa chọn",
  TRUE_FALSE: "TNKQ - Đúng/Sai",
  SHORT_ANSWER: "TNKQ - Trả lời ngắn",
  ESSAY: "Tự luận",
}
const DIFFICULTY_DB_TO_UI: Record<string, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
}

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

const initialForm: QuestionFormData = {
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
}

export default function EditQuestionPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [formData, setFormData] = useState<QuestionFormData>(initialForm)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [newKeyword, setNewKeyword] = useState("")
  const [newObjective, setNewObjective] = useState("")
  const [generatingAnswer, setGeneratingAnswer] = useState(false)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setFetching(true)
      try {
        const res = await fetch(`/api/question-bank/${id}`)
        if (!res.ok) throw new Error("Không tìm thấy câu hỏi")
        const data = await res.json()
        const q = data.question
        if (!q) throw new Error("Dữ liệu không hợp lệ")
        const typeUI = TYPE_DB_TO_UI[q.type] || q.type
        const difficultyUI = DIFFICULTY_DB_TO_UI[q.difficulty] || q.difficulty || "Trung bình"
        let options = Array.isArray(q.options) ? [...q.options] : []
        if (typeUI === "TNKQ - Nhiều lựa chọn" && options.length < 4) {
          while (options.length < 4) options.push("")
        }
        if (typeUI !== "TNKQ - Nhiều lựa chọn" && typeUI !== "TNKQ - Đúng/Sai") options = ["", "", "", ""]
        setFormData({
          content: q.content ?? "",
          type: typeUI,
          subject: q.subject ?? "",
          grade: q.grade ?? "",
          difficulty: difficultyUI,
          cognitiveLevel: Array.isArray(q.learningObjectives)?.[0] ?? "Hiểu",
          topic: q.topic ?? "",
          explanation: q.explanation ?? "",
          options,
          correctAnswer: q.correctAnswer != null ? String(q.correctAnswer) : "",
          keywords: Array.isArray(q.keywords) ? q.keywords : [],
          learningObjectives: Array.isArray(q.learningObjectives) ? q.learningObjectives : [],
        })
      } catch (e: any) {
        toast.error(e.message || "Không tải được câu hỏi")
        router.push("/teacher/question-bank/list")
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [id, router])

  const handleInputChange = (field: keyof QuestionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }
  const addOption = () => setFormData((prev) => ({ ...prev, options: [...prev.options, ""] }))
  const removeOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }
  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData((prev) => ({ ...prev, keywords: [...prev.keywords, newKeyword.trim()] }))
      setNewKeyword("")
    }
  }
  const removeKeyword = (keyword: string) => setFormData((prev) => ({ ...prev, keywords: prev.keywords.filter((k) => k !== keyword) }))
  const addObjective = () => {
    if (newObjective.trim() && !formData.learningObjectives.includes(newObjective.trim())) {
      setFormData((prev) => ({ ...prev, learningObjectives: [...prev.learningObjectives, newObjective.trim()] }))
      setNewObjective("")
    }
  }
  const removeObjective = (objective: string) => setFormData((prev) => ({ ...prev, learningObjectives: prev.learningObjectives.filter((o) => o !== objective) }))

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
    if (!formData.content.trim()) { toast.error("Vui lòng nhập nội dung câu hỏi"); return false }
    if (!formData.type) { toast.error("Vui lòng chọn loại câu hỏi"); return false }
    if (!formData.subject) { toast.error("Vui lòng chọn môn học"); return false }
    if (!formData.grade) { toast.error("Vui lòng chọn khối"); return false }
    if (formData.type === "TNKQ - Nhiều lựa chọn") {
      const valid = formData.options.filter((o) => o.trim()).length >= 2
      if (!valid) { toast.error("Câu hỏi nhiều lựa chọn cần ít nhất 2 phương án"); return false }
      if (!formData.correctAnswer) { toast.error("Vui lòng chọn đáp án đúng"); return false }
    }
    if (formData.type === "TNKQ - Đúng/Sai" && !["Đúng", "Sai"].includes(formData.correctAnswer)) {
      toast.error("Vui lòng chọn đáp án đúng (Đúng hoặc Sai)"); return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm() || !id) return
    setLoading(true)
    try {
      let options = formData.options
      if (formData.type === "TNKQ - Nhiều lựa chọn") options = formData.options.filter((o) => o.trim())
      else if (formData.type === "TNKQ - Đúng/Sai") options = ["Đúng", "Sai"]
      else options = []

      const res = await fetch(`/api/question-bank/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: formData.content,
          type: formData.type,
          subject: formData.subject,
          grade: formData.grade,
          difficulty: formData.difficulty,
          cognitiveLevel: formData.cognitiveLevel,
          topic: formData.topic || formData.subject,
          explanation: formData.explanation,
          options,
          correctAnswer: formData.correctAnswer,
          keywords: formData.keywords,
          learningObjectives: formData.learningObjectives.length > 0 ? formData.learningObjectives : [formData.cognitiveLevel],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Không thể cập nhật")
      }
      toast.success("Đã cập nhật câu hỏi")
      router.push("/teacher/question-bank/list")
    } catch (e: any) {
      toast.error(e.message || "Không thể cập nhật câu hỏi")
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
  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isMCQ = formData.type === "TNKQ - Nhiều lựa chọn"
  const isTrueFalse = formData.type === "TNKQ - Đúng/Sai"

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/teacher/question-bank/list")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-blue-600" />
            Chỉnh sửa câu hỏi
          </h1>
          <p className="text-muted-foreground mt-1">Biên tập nội dung câu hỏi trong ngân hàng</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
            <CardDescription>Chỉnh sửa nội dung và thuộc tính câu hỏi</CardDescription>
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
                <Label>Loại câu hỏi *</Label>
                <Select value={formData.type} onValueChange={(v) => handleInputChange("type", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Môn học *</Label>
                <Select value={formData.subject} onValueChange={(v) => handleInputChange("subject", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn môn" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Khối *</Label>
                <Select value={formData.grade} onValueChange={(v) => handleInputChange("grade", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn khối" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Độ khó</Label>
                <Select value={formData.difficulty} onValueChange={(v) => handleInputChange("difficulty", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mức độ nhận thức</Label>
                <Select value={formData.cognitiveLevel} onValueChange={(v) => handleInputChange("cognitiveLevel", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COGNITIVE_LEVELS.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chủ đề</Label>
                <Input
                  value={formData.topic}
                  onChange={(e) => handleInputChange("topic", e.target.value)}
                  placeholder="Chủ đề..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isMCQ && (
          <Card>
            <CardHeader>
              <CardTitle>Phương án trả lời</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Phương án ${String.fromCharCode(65 + i)}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)} disabled={formData.options.length <= 2}>
                    ×
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOption}>+ Thêm phương án</Button>
              <div className="space-y-2">
                <Label>Đáp án đúng *</Label>
                <Select value={formData.correctAnswer} onValueChange={(v) => handleInputChange("correctAnswer", v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn đáp án" /></SelectTrigger>
                  <SelectContent>
                    {formData.options
                      .map((o, i) => ({ value: String(i), label: `${String.fromCharCode(65 + i)}. ${o || `Phương án ${i + 1}`}` }))
                      .filter((opt) => formData.options[parseInt(opt.value)]?.trim())
                      .map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {isTrueFalse && (
          <Card>
            <CardHeader><CardTitle>Đáp án</CardTitle></CardHeader>
            <CardContent>
              <Label>Đáp án đúng *</Label>
              <Select value={formData.correctAnswer} onValueChange={(v) => handleInputChange("correctAnswer", v)}>
                <SelectTrigger><SelectValue placeholder="Đúng / Sai" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Đúng">Đúng</SelectItem>
                  <SelectItem value="Sai">Sai</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {(formData.type === "TNKQ - Trả lời ngắn" || formData.type === "Tự luận") && (
          <Card>
            <CardHeader><CardTitle>Đáp án mẫu</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Đáp án / Hướng dẫn chấm *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAnswer}
                    disabled={generatingAnswer || !formData.content.trim()}
                    className="gap-1.5 shrink-0"
                  >
                    {generatingAnswer ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Gen đáp án
                  </Button>
                </div>
                <Textarea
                  value={formData.correctAnswer}
                  onChange={(e) => handleInputChange("correctAnswer", e.target.value)}
                  placeholder="Đáp án mẫu hoặc hướng dẫn chấm..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Giải thích</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={formData.explanation}
              onChange={(e) => handleInputChange("explanation", e.target.value)}
              placeholder="Giải thích chi tiết..."
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Button variant="outline" onClick={() => router.push("/teacher/question-bank/list")} disabled={loading}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Cập nhật câu hỏi
          </Button>
        </div>
      </div>
    </div>
  )
}
