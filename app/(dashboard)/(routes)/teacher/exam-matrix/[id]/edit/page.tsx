"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plus, Save, Loader2 } from "lucide-react"
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

export default function EditMatrixPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const matrixId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<MatrixFormData>({
    name: "",
    grade: "Khối 6",
    examType: "Kiểm tra 1 tiết",
    duration: 45,
    totalScore: 10,
  })
  const [topics, setTopics] = useState<Topic[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)

  useEffect(() => {
    if (matrixId && session?.user) {
      fetchMatrix()
    }
  }, [matrixId, session?.user])

  const fetchMatrix = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/exam-matrices/${matrixId}`)
      if (!response.ok) throw new Error("Failed to fetch matrix")
      const data = await response.json()
      const m = data.matrix
      setFormData({
        name: m.name,
        grade: m.grade,
        examType: m.examType,
        duration: m.duration ?? 45,
        totalScore: m.totalScore ?? 10,
      })
      const loadedTopics: Topic[] = (m.topics || []).map((t: any) => ({
        id: t.id,
        order: t.order,
        topic: t.topic,
        content: t.content || "",
        distributions: t.distributions || [],
        percentageScore: t.percentageScore,
      }))
      setTopics(loadedTopics)
    } catch (error: any) {
      console.error("Fetch matrix error:", error)
      toast.error("Không thể tải ma trận")
      router.push("/teacher/exam-matrix")
    } finally {
      setLoading(false)
    }
  }

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
    for (const topic of topics) {
      if (!topic.topic.trim()) {
        toast.error(`Vui lòng nhập tên chủ đề cho hàng ${topic.order}`)
        return
      }
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/exam-matrices/${matrixId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(error.error || error.message || "Failed to update matrix")
      }

      toast.success("Đã cập nhật ma trận thành công")
      router.push(`/teacher/exam-matrix/${matrixId}`)
    } catch (error: any) {
      console.error("Update error:", error)
      toast.error(error.message || "Không thể cập nhật ma trận")
    } finally {
      setSaving(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/teacher/exam-matrix/${matrixId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Chỉnh sửa ma trận</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Cập nhật cấu trúc đề thi theo ma trận
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-gray-100 rounded-lg">
              <div className="text-xs text-muted-foreground">TỔNG SỐ CÂU</div>
              <div className="text-2xl font-bold">{totalQuestions}</div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6">
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">TÊN MA TRẬN</label>
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

          <div className="bg-white rounded-lg border overflow-hidden">
            <MatrixTable
              topics={topics}
              totalScore={formData.totalScore}
              onUpdateTopic={handleUpdateTopic}
              onUpdateDistribution={handleUpdateDistribution}
              onDeleteTopic={handleDeleteTopic}
            />
          </div>

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
    </div>
  )
}
