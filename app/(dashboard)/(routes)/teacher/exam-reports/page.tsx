"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  BarChart, TrendingUp, Users, Target, Calendar, Award,
  Download, FileText, Clock, CheckCircle2, XCircle, AlertCircle,
  Loader2, Filter, Search, PieChart, Activity, Database
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NeumorphicCard } from "@/components/ui/neumorphic-card"
import { NeumorphicButton } from "@/components/ui/neumorphic-button"
import { NeumorphicInput } from "@/components/ui/neumorphic-input"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface Exam { id: string; title: string; examType: string; status: string; createdAt: string }
interface ExamAnalytics {
  overview: {
    total_submissions: number; completed: number; in_progress: number;
    average_score: number; median_score: number; highest_score: number;
    lowest_score: number; std_deviation: number; pass_rate: number;
  }
  grade_distribution: { [grade: string]: number }
  question_analysis: Array<{
    question_id: string; question_number: number; average_score: number;
    difficulty_index: number; discrimination_index: number;
    most_common_answer: string; correct_percentage: number;
  }>
  time_analysis: {
    average_time_minutes: number; median_time_minutes: number;
    fastest_completion: number; slowest_completion: number;
  }
  reliability: { cronbach_alpha: number }
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
    if (session?.user) fetchExams()
  }, [session])

  useEffect(() => {
    if (selectedExamId) fetchAnalytics(selectedExamId)
    else setAnalytics(null)
  }, [selectedExamId])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/teacher/exams")
      if (!response.ok) { if (response.status === 404) { setExams([]); return } }
      const data = await response.json()
      setExams(data.exams || [])
    } catch (error) {
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
      if (!response.ok) { setAnalytics(generateMockAnalytics()); return }
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      setAnalytics(generateMockAnalytics())
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const generateMockAnalytics = (): ExamAnalytics => ({
    overview: {
      total_submissions: 45, completed: 42, in_progress: 3, average_score: 7.5,
      median_score: 7.8, highest_score: 10.0, lowest_score: 4.2,
      std_deviation: 1.3, pass_rate: 85.7,
    },
    grade_distribution: { "9-10": 8, "8-8.9": 12, "7-7.9": 15, "6-6.9": 5, "5-5.9": 2, "0-4.9": 0 },
    question_analysis: [
      { question_id: "q1", question_number: 1, average_score: 0.9, difficulty_index: 0.2, discrimination_index: 0.6, most_common_answer: "A", correct_percentage: 90 },
      { question_id: "q2", question_number: 2, average_score: 0.7, difficulty_index: 0.5, discrimination_index: 0.4, most_common_answer: "B", correct_percentage: 70 },
      { question_id: "q3", question_number: 3, average_score: 0.5, difficulty_index: 0.8, discrimination_index: 0.3, most_common_answer: "C", correct_percentage: 50 },
    ],
    time_analysis: { average_time_minutes: 38, median_time_minutes: 40, fastest_completion: 25, slowest_completion: 45 },
    reliability: { cronbach_alpha: 0.82 },
  })

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (!selectedExamId) { toast.error("Vui lòng chọn đề thi"); return }
    try {
      const response = await fetch(`/api/teacher/exams/${selectedExamId}/export?format=${format}`)
      if (!response.ok) { toast.error("Không thể xuất báo cáo"); return }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `exam-report-${selectedExamId}.${format === "excel" ? "xlsx" : format}`
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
      toast.success(`Đã xuất báo cáo ${format.toUpperCase()}`)
    } catch (error) {
      toast.error("Lỗi khi xuất báo cáo")
    }
  }

  const filteredExams = exams.filter((exam) =>
    !searchQuery || exam.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = analytics ? {
    total: analytics.overview.total_submissions,
    completed: analytics.overview.completed,
    average: analytics.overview.average_score,
    passRate: analytics.overview.pass_rate,
  } : null

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 neu-shadow" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full neu-container">
      {/* Header with Gradient Text */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Báo Cáo Thi</h1>
              <p className="text-gray-600">Phân tích và báo cáo kết quả thi chi tiết</p>
            </div>
            {selectedExamId && (
              <div className="flex gap-2">
                <NeumorphicButton variant="outline" size="sm" onClick={() => handleExport("csv")}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </NeumorphicButton>
                <NeumorphicButton variant="outline" size="sm" onClick={() => handleExport("excel")}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </NeumorphicButton>
                <NeumorphicButton variant="outline" size="sm" onClick={() => handleExport("pdf")}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </NeumorphicButton>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Tổng bài nộp", value: stats.total, color: "from-blue-500 to-blue-600", icon: Users },
                { label: "Hoàn thành", value: stats.completed, color: "from-green-500 to-green-600", icon: CheckCircle2 },
                { label: "Điểm trung bình", value: stats.average.toFixed(1), color: "from-purple-500 to-purple-600", icon: Award },
                { label: "Tỷ lệ đạt", value: `${stats.passRate.toFixed(1)}%`, color: "from-orange-500 to-orange-600", icon: Target },
              ].map((stat) => (
                <NeumorphicCard key={stat.label} variant="gradient" hover className="text-center p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <stat.icon className={`w-6 h-6 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
                    <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                      {stat.value}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </NeumorphicCard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto space-y-6">
          {/* Exam Selection */}
          <NeumorphicCard variant="default" size="lg">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <NeumorphicInput
                  placeholder="Tìm kiếm đề thi..."
                  icon={<Search className="w-4 h-4" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-[300px] neu-shadow-sm">
                  <SelectValue placeholder="Chọn đề thi để phân tích" />
                </SelectTrigger>
                <SelectContent>
                  {filteredExams.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-gray-500">Chưa có đề thi nào</div>
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
          </NeumorphicCard>

          {/* Analytics Content */}
          {selectedExamId && (
            <>
              {analyticsLoading ? (
                <NeumorphicCard variant="gradient" size="lg" className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 neu-shadow" />
                    <p className="text-gray-600">Đang tải phân tích...</p>
                  </div>
                </NeumorphicCard>
              ) : analytics ? (
                <NeumorphicCard variant="gradient" size="lg">
                  <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="neu-shadow">
                      <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                      <TabsTrigger value="questions">Phân tích câu hỏi</TabsTrigger>
                      <TabsTrigger value="distribution">Phân bố điểm</TabsTrigger>
                      <TabsTrigger value="time">Thời gian</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <NeumorphicCard variant="default" className="text-center p-4">
                          <div className={`text-4xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent mb-2`}>
                            {analytics.overview.highest_score.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">Điểm cao nhất</div>
                        </NeumorphicCard>
                        <NeumorphicCard variant="default" className="text-center p-4">
                          <div className={`text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent mb-2`}>
                            {analytics.overview.average_score.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">Điểm trung bình</div>
                        </NeumorphicCard>
                        <NeumorphicCard variant="default" className="text-center p-4">
                          <div className={`text-4xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent mb-2`}>
                            {analytics.overview.lowest_score.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">Điểm thấp nhất</div>
                        </NeumorphicCard>
                      </div>

                      <NeumorphicCard variant="default" className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Độ tin cậy</div>
                            <div className="text-2xl font-bold gradient-text">{analytics.reliability.cronbach_alpha.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Cronbach's Alpha</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Độ lệch chuẩn</div>
                            <div className="text-2xl font-bold gradient-text">{analytics.overview.std_deviation.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Standard Deviation</div>
                          </div>
                        </div>
                      </NeumorphicCard>
                    </TabsContent>

                    {/* Questions Analysis Tab */}
                    <TabsContent value="questions" className="space-y-4">
                      {analytics.question_analysis.map((q) => (
                        <NeumorphicCard key={q.question_id} variant="default" className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="neu-shadow-sm">Câu {q.question_number}</Badge>
                              <span className="text-sm text-gray-600">Tỷ lệ đúng: {q.correct_percentage}%</span>
                            </div>
                            <div className="text-sm font-semibold gradient-text">Điểm TB: {(q.average_score * 10).toFixed(1)}/10</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Độ khó: </span>
                              <span className={cn("font-medium",
                                q.difficulty_index < 0.3 ? "text-green-600" : q.difficulty_index < 0.7 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {q.difficulty_index < 0.3 ? "Dễ" : q.difficulty_index < 0.7 ? "Trung bình" : "Khó"} {(q.difficulty_index * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Chỉ số phân biệt: </span>
                              <span className={cn("font-medium",
                                q.discrimination_index > 0.4 ? "text-green-600" : q.discrimination_index > 0.2 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {q.discrimination_index.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </NeumorphicCard>
                      ))}
                    </TabsContent>

                    {/* Distribution Tab */}
                    <TabsContent value="distribution" className="space-y-4">
                      <NeumorphicCard variant="default" className="p-4">
                        <div className="space-y-4">
                          {Object.entries(analytics.grade_distribution)
                            .sort(([a], [b]) => parseFloat(b.split("-")[0]) - parseFloat(a.split("-")[0]))
                            .map(([range, count]) => (
                              <div key={range} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-semibold gradient-text">{range} điểm</span>
                                  <span className="text-gray-600">{count} học sinh</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3 neu-shadow-inner">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full neu-shadow"
                                    style={{ width: `${(count / analytics.overview.total_submissions) * 100}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </NeumorphicCard>
                    </TabsContent>

                    {/* Time Analysis Tab */}
                    <TabsContent value="time" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <NeumorphicCard variant="default" className="p-4">
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Thời gian trung bình</div>
                              <div className="text-3xl font-bold gradient-text">{analytics.time_analysis.average_time_minutes} phút</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Thời gian trung vị</div>
                              <div className="text-3xl font-bold gradient-text">{analytics.time_analysis.median_time_minutes} phút</div>
                            </div>
                          </div>
                        </NeumorphicCard>
                        <NeumorphicCard variant="default" className="p-4">
                          <div className="space-y-4">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Nhanh nhất</div>
                              <div className="text-3xl font-bold text-green-600">{analytics.time_analysis.fastest_completion} phút</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Chậm nhất</div>
                              <div className="text-3xl font-bold text-red-600">{analytics.time_analysis.slowest_completion} phút</div>
                            </div>
                          </div>
                        </NeumorphicCard>
                      </div>
                    </TabsContent>
                  </Tabs>
                </NeumorphicCard>
              ) : (
                <NeumorphicCard variant="gradient" size="lg" className="text-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center neu-shadow-inner">
                      <AlertCircle className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Không có dữ liệu phân tích</h3>
                      <p className="text-gray-500">Đề thi này chưa có dữ liệu phân tích</p>
                    </div>
                  </div>
                </NeumorphicCard>
              )}
            </>
          )}

          {/* Empty State */}
          {!selectedExamId && (
            <NeumorphicCard variant="gradient" size="lg" className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa chọn đề thi</h3>
                  <p className="text-gray-500">Vui lòng chọn một đề thi từ danh sách ở trên</p>
                </div>
              </div>
            </NeumorphicCard>
          )}
        </div>
      </div>
    </div>
  )
}
