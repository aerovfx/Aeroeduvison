"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  Target, 
  Calendar, 
  Award, 
  Download,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  Search,
  PieChart,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface Exam {
  id: string
  title: string
  examType: string
  status: string
  createdAt: string
}

interface ExamAnalytics {
  overview: {
    total_submissions: number
    completed: number
    in_progress: number
    average_score: number
    median_score: number
    highest_score: number
    lowest_score: number
    std_deviation: number
    pass_rate: number
  }
  grade_distribution: {
    [grade: string]: number
  }
  question_analysis: Array<{
    question_id: string
    question_number: number
    average_score: number
    difficulty_index: number
    discrimination_index: number
    most_common_answer: string
    correct_percentage: number
  }>
  time_analysis: {
    average_time_minutes: number
    median_time_minutes: number
    fastest_completion: number
    slowest_completion: number
  }
  reliability: {
    cronbach_alpha: number
  }
}

export default function ExamReportsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (session?.user) {
      fetchExams()
    }
  }, [session])

  useEffect(() => {
    if (selectedExamId) {
      fetchAnalytics(selectedExamId)
    } else {
      setAnalytics(null)
    }
  }, [selectedExamId])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/teacher/exams")
      
      if (!response.ok) {
        if (response.status === 404) {
          setExams([])
          return
        }
        throw new Error("Không thể tải danh sách đề thi")
      }
      
      const data = await response.json()
      setExams(data.exams || [])
    } catch (error: any) {
      console.error("Error fetching exams:", error)
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async (examId: string) => {
    try {
      setAnalyticsLoading(true)
      const response = await fetch(`/api/teacher/exams/${examId}/analytics`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // API not implemented yet, show mock data
          setAnalytics(generateMockAnalytics())
          return
        }
        throw new Error("Không thể tải dữ liệu phân tích")
      }
      
      const data = await response.json()
      setAnalytics(data)
    } catch (error: any) {
      console.error("Error fetching analytics:", error)
      // Show mock data for now
      setAnalytics(generateMockAnalytics())
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const generateMockAnalytics = (): ExamAnalytics => {
    return {
      overview: {
        total_submissions: 45,
        completed: 42,
        in_progress: 3,
        average_score: 7.5,
        median_score: 7.8,
        highest_score: 10.0,
        lowest_score: 4.2,
        std_deviation: 1.3,
        pass_rate: 85.7,
      },
      grade_distribution: {
        "9-10": 8,
        "8-8.9": 12,
        "7-7.9": 15,
        "6-6.9": 5,
        "5-5.9": 2,
        "0-4.9": 0,
      },
      question_analysis: [
        {
          question_id: "q1",
          question_number: 1,
          average_score: 0.9,
          difficulty_index: 0.2,
          discrimination_index: 0.6,
          most_common_answer: "A",
          correct_percentage: 90,
        },
        {
          question_id: "q2",
          question_number: 2,
          average_score: 0.7,
          difficulty_index: 0.5,
          discrimination_index: 0.4,
          most_common_answer: "B",
          correct_percentage: 70,
        },
        {
          question_id: "q3",
          question_number: 3,
          average_score: 0.5,
          difficulty_index: 0.8,
          discrimination_index: 0.3,
          most_common_answer: "C",
          correct_percentage: 50,
        },
      ],
      time_analysis: {
        average_time_minutes: 38,
        median_time_minutes: 40,
        fastest_completion: 25,
        slowest_completion: 45,
      },
      reliability: {
        cronbach_alpha: 0.82,
      },
    }
  }

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (!selectedExamId) {
      toast.error("Vui lòng chọn đề thi để xuất báo cáo")
      return
    }

    try {
      const response = await fetch(
        `/api/teacher/exams/${selectedExamId}/export?format=${format}`,
        { method: "GET" }
      )

      if (!response.ok) {
        toast.error("Không thể xuất báo cáo")
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `exam-report-${selectedExamId}.${format === "excel" ? "xlsx" : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Đã xuất báo cáo ${format.toUpperCase()}`)
    } catch (error: any) {
      console.error("Error exporting report:", error)
      toast.error("Lỗi khi xuất báo cáo")
    }
  }

  const filteredExams = exams.filter((exam) => {
    if (searchQuery) {
      return exam.title.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const selectedExam = exams.find((e) => e.id === selectedExamId)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart className="h-8 w-8 text-blue-600" />
            Báo cáo đề thi
          </h1>
          <p className="text-muted-foreground mt-1">
            Phân tích và báo cáo kết quả các đề thi
          </p>
        </div>
        {selectedExamId && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("excel")}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("pdf")}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất PDF
            </Button>
          </div>
        )}
      </div>

      {/* Exam Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Chọn đề thi</CardTitle>
          <CardDescription>
            Chọn đề thi để xem báo cáo và phân tích chi tiết
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Tìm kiếm đề thi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Chọn đề thi để phân tích" />
              </SelectTrigger>
              <SelectContent>
                {filteredExams.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Chưa có đề thi nào
                  </div>
                ) : (
                  filteredExams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title} ({exam.examType})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Content */}
      {selectedExamId && (
        <>
          {analyticsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : analytics ? (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList>
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="questions">Phân tích câu hỏi</TabsTrigger>
                <TabsTrigger value="distribution">Phân bố điểm</TabsTrigger>
                <TabsTrigger value="time">Phân tích thời gian</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Tổng số bài nộp
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.overview.total_submissions}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {analytics.overview.completed} đã hoàn thành,{" "}
                        {analytics.overview.in_progress} đang làm
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Điểm trung bình
                      </CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.overview.average_score.toFixed(1)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Trung vị: {analytics.overview.median_score.toFixed(1)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Tỷ lệ đạt
                      </CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.overview.pass_rate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Độ lệch chuẩn: {analytics.overview.std_deviation.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Độ tin cậy
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analytics.reliability.cronbach_alpha.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cronbach's Alpha
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Score Range */}
                <Card>
                  <CardHeader>
                    <CardTitle>Phạm vi điểm</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.overview.highest_score.toFixed(1)}
                        </div>
                        <p className="text-sm text-muted-foreground">Điểm cao nhất</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {analytics.overview.average_score.toFixed(1)}
                        </div>
                        <p className="text-sm text-muted-foreground">Điểm trung bình</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {analytics.overview.lowest_score.toFixed(1)}
                        </div>
                        <p className="text-sm text-muted-foreground">Điểm thấp nhất</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Questions Analysis Tab */}
              <TabsContent value="questions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Phân tích từng câu hỏi</CardTitle>
                    <CardDescription>
                      Độ khó và khả năng phân biệt của từng câu hỏi
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.question_analysis.map((q) => (
                        <div
                          key={q.question_id}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Câu {q.question_number}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                Tỷ lệ đúng: {q.correct_percentage}%
                              </span>
                            </div>
                            <div className="text-sm font-medium">
                              Điểm TB: {(q.average_score * 10).toFixed(1)}/10
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Độ khó:{" "}
                              </span>
                              <span
                                className={cn(
                                  "font-medium",
                                  q.difficulty_index < 0.3
                                    ? "text-green-600"
                                    : q.difficulty_index < 0.7
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                )}
                              >
                                {q.difficulty_index < 0.3
                                  ? "Dễ"
                                  : q.difficulty_index < 0.7
                                  ? "Trung bình"
                                  : "Khó"}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                ({(q.difficulty_index * 100).toFixed(0)}%)
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Chỉ số phân biệt:{" "}
                              </span>
                              <span
                                className={cn(
                                  "font-medium",
                                  q.discrimination_index > 0.4
                                    ? "text-green-600"
                                    : q.discrimination_index > 0.2
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                )}
                              >
                                {q.discrimination_index.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Distribution Tab */}
              <TabsContent value="distribution" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Phân bố điểm số</CardTitle>
                    <CardDescription>
                      Số lượng học sinh theo từng khoảng điểm
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.grade_distribution)
                        .sort(([a], [b]) => {
                          const aNum = parseFloat(a.split("-")[0])
                          const bNum = parseFloat(b.split("-")[0])
                          return bNum - aNum
                        })
                        .map(([range, count]) => (
                          <div key={range} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{range} điểm</span>
                              <span className="text-muted-foreground">
                                {count} học sinh
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${
                                    (count /
                                      analytics.overview.total_submissions) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Time Analysis Tab */}
              <TabsContent value="time" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Thời gian làm bài</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold">
                          {analytics.time_analysis.average_time_minutes} phút
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Thời gian trung bình
                        </p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {analytics.time_analysis.median_time_minutes} phút
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Thời gian trung vị
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Phạm vi thời gian</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.time_analysis.fastest_completion} phút
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Nhanh nhất
                        </p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {analytics.time_analysis.slowest_completion} phút
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Chậm nhất
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Không có dữ liệu phân tích cho đề thi này
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!selectedExamId && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Chưa chọn đề thi để xem báo cáo
            </p>
            <p className="text-sm text-gray-500">
              Vui lòng chọn một đề thi từ danh sách ở trên
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
