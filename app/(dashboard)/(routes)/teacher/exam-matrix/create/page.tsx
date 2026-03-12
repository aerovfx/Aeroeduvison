"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Save, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MatrixTable } from "@/components/exam-matrix/matrix-table"
import { AutoGenerateModal } from "@/components/exam-matrix/auto-generate-modal"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"

interface MatrixFormData {
  name: string
  grade: string
  examType: string
  duration: number
  totalScore: number
}

interface Topic {
  id: string
  order: number
  topic: string
  content: string
  distributions: {
    questionType: string
    cognitiveLevel: string
    count: number
  }[]
  percentageScore?: number
}

const QUESTION_TYPES = [
  { value: "TNKQ_Nhiều_lựa_chọn", label: "Nhiều lựa chọn" },
  { value: "TNKQ_Đúng_Sai", label: "Đúng - Sai" },
  { value: "TNKQ_Trả_lời_ngắn", label: "Trả lời ngắn" },
  { value: "Tự_luận", label: "Tự luận" },
]

const COGNITIVE_LEVELS = ["Biết", "Hiểu", "Vận dụng"]

export default function CreateMatrixPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [autoGenerateOpen, setAutoGenerateOpen] = useState(false)
  const [formData, setFormData] = useState<MatrixFormData>({
    name: "",
    grade: "Khối 6",
    examType: "Kiểm tra 1 tiết",
    duration: 45,
    totalScore: 10,
  })
  const [topics, setTopics] = useState<Topic[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)

  // Calculate total questions whenever topics change
  useEffect(() => {
    const total = topics.reduce((sum, topic) => {
      return sum + topic.distributions.reduce((topicSum, dist) => topicSum + dist.count, 0)
    }, 0)
    setTotalQuestions(total)
  }, [topics])

  const handleAddTopic = () => {
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      order: topics.length + 1,
      topic: "",
      content: "",
      distributions: [],
    }
    setTopics([...topics, newTopic])
  }

  const handleDeleteTopic = (topicId: string) => {
    const updatedTopics = topics
      .filter((t) => t.id !== topicId)
      .map((t, index) => ({ ...t, order: index + 1 }))
    setTopics(updatedTopics)
  }

  const handleUpdateTopic = (topicId: string, updates: Partial<Topic>) => {
    setTopics(
      topics.map((t) => (t.id === topicId ? { ...t, ...updates } : t))
    )
  }

  const handleUpdateDistribution = (
    topicId: string,
    questionType: string,
    cognitiveLevel: string,
    count: number
  ) => {
    setTopics(
      topics.map((topic) => {
        if (topic.id !== topicId) return topic

        const existingIndex = topic.distributions.findIndex(
          (d) =>
            d.questionType === questionType &&
            d.cognitiveLevel === cognitiveLevel
        )

        let newDistributions = [...topic.distributions]

        if (existingIndex >= 0) {
          if (count === 0) {
            newDistributions.splice(existingIndex, 1)
          } else {
            newDistributions[existingIndex] = {
              questionType,
              cognitiveLevel,
              count,
            }
          }
        } else if (count > 0) {
          newDistributions.push({ questionType, cognitiveLevel, count })
        }

        return { ...topic, distributions: newDistributions }
      })
    )
  }

  const calculatePercentageScore = (topic: Topic): number => {
    const topicTotal = topic.distributions.reduce(
      (sum, dist) => sum + dist.count,
      0
    )
    if (totalQuestions === 0) return 0
    return Math.round((topicTotal / totalQuestions) * 100)
  }

  const handleAutoGenerateSuccess = (matrixData: any) => {
    // Populate the form with auto-generated data
    const generatedTopics: Topic[] = matrixData.topics.map((t: any, index: number) => ({
      id: `topic-${index}`,
      order: index + 1,
      topic: t.topic,
      content: t.content,
      distributions: t.distributions,
      percentageScore: t.percentageScore,
    }))
    
    setTopics(generatedTopics)
    toast.success("Đã tạo ma trận thành công! Bạn có thể chỉnh sửa thêm nếu cần.")
  }

  // Update percentage scores when topics or totalQuestions change
  useEffect(() => {
    setTopics((prevTopics) =>
      prevTopics.map((topic) => ({
        ...topic,
        percentageScore: calculatePercentageScore(topic),
      }))
    )
  }, [totalQuestions])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên ma trận")
      return
    }

    if (topics.length === 0) {
      toast.error("Vui lòng thêm ít nhất một chủ đề")
      return
    }

    // Validate topics
    for (const topic of topics) {
      if (!topic.topic.trim()) {
        toast.error(`Vui lòng nhập tên chủ đề cho hàng ${topic.order}`)
        return
      }
    }

    setLoading(true)

    try {
      const response = await fetch("/api/exam-matrices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          topics: topics.map((topic) => ({
            order: topic.order,
            topic: topic.topic,
            content: topic.content,
            distributions: topic.distributions,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to save matrix")
      }

      const data = await response.json()
      toast.success("Đã lưu ma trận thành công")
      router.push(`/teacher/exam-matrix/${data.matrix.id}`)
    } catch (error: any) {
      console.error("Save error:", error)
      toast.error(error.message || "Không thể lưu ma trận")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Tạo ma trận mới</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Thiết lập cấu trúc đề thi theo ma trận chuẩn
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setAutoGenerateOpen(true)}
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Tạo tự động
            </Button>
            <div className="px-4 py-2 bg-gray-100 rounded-lg">
              <div className="text-xs text-muted-foreground">TỔNG SỐ CÂU</div>
              <div className="text-2xl font-bold">{totalQuestions}</div>
            </div>
            <Button onClick={handleSave} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu ma trận
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          {/* Configuration Form */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  TÊN MA TRẬN
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nhập tên ma trận"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">KHỐI</label>
                <Select
                  value={formData.grade}
                  onValueChange={(value) =>
                    setFormData({ ...formData, grade: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={`Khối ${num}`}>
                        Khối {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  LOẠI ĐỀ KIỂM TRA
                </label>
                <Select
                  value={formData.examType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, examType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kiểm tra 1 tiết">Kiểm tra 1 tiết</SelectItem>
                    <SelectItem value="Kiểm tra giữa kỳ">Kiểm tra giữa kỳ</SelectItem>
                    <SelectItem value="Kiểm tra cuối kỳ">Kiểm tra cuối kỳ</SelectItem>
                    <SelectItem value="Thi học kỳ">Thi học kỳ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  THỜI GIAN LÀM BÀI (PHÚT)
                </label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  TỔNG ĐIỂM TOÀN BÀI
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.totalScore}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalScore: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <MatrixTable
              topics={topics}
              totalScore={formData.totalScore}
              onUpdateTopic={handleUpdateTopic}
              onUpdateDistribution={handleUpdateDistribution}
              onDeleteTopic={handleDeleteTopic}
            />
          </div>

          {/* Add Topic Button */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleAddTopic}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm chủ đề
            </Button>
          </div>
        </div>
      </div>

      {/* Auto Generate Modal */}
      <AutoGenerateModal
        isOpen={autoGenerateOpen}
        onClose={() => setAutoGenerateOpen(false)}
        onSuccess={handleAutoGenerateSuccess}
        defaultValues={formData}
      />
    </div>
  )
}
