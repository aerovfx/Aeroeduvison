"use client"

import { useState } from "react"
import { Clock, BookOpen, Trophy, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { PageHeader } from "@/components/layout/page-header"

interface PracticeExam {
  id: string
  subject: string
  grade: string
  examType: string
  questionCount: number
  timeLimit: number
  score?: number
  completed: boolean
}

export default function ExamPrepPage() {
  const [loading, setLoading] = useState(false)
  const [currentExam, setCurrentExam] = useState<PracticeExam | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [result, setResult] = useState<any>(null)

  const [formData, setFormData] = useState({
    subject: "Toán",
    grade: "Khối 9",
    examType: "Kiểm tra 1 tiết",
    questionCount: 30,
    timeLimit: 45,
  })

  const startPracticeExam = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/agents/exam-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...formData,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setCurrentExam(data.data.practice)
        setTimeRemaining(formData.timeLimit * 60)
        toast.success('Đã tạo đề thi thử!')
      }
    } catch (error) {
      toast.error('Không thể tạo đề thi')
    } finally {
      setLoading(false)
    }
  }

  const submitExam = async () => {
    if (!currentExam) return
    
    if (!confirm('Nộp bài? Bạn sẽ không thể làm lại.')) return

    try {
      const response = await fetch('/api/agents/exam-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          practiceId: currentExam.id,
          answers,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setResult(data.data.result)
        toast.success('Đã nộp bài!')
      }
    } catch (error) {
      toast.error('Không thể nộp bài')
    }
  }

  const questions = [
    { id: 'q1', content: 'Giải phương trình: 2x + 3 = 7', options: ['x=1', 'x=2', 'x=3', 'x=4'] },
    { id: 'q2', content: 'Tính diện tích hình tròn bán kính 5cm', options: ['25π', '10π', '5π', '15π'] },
    { id: 'q3', content: 'Tìm nghiệm của x² - 4 = 0', options: ['x=2', 'x=-2', 'x=±2', 'x=0'] },
  ]

  if (result) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <PageHeader title="Kết Quả Ôn Thi" description="Phân tích chi tiết bài làm của bạn" />
        
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Overall Score */}
            <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="p-8 text-center">
                <div className="text-6xl font-bold mb-2">{result.percentage}%</div>
                <div className="text-xl opacity-90">
                  {result.score}/{questions.length} câu đúng
                </div>
              </CardContent>
            </Card>

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{result.breakdown.correct}</div>
                  <div className="text-sm text-muted-foreground">Câu đúng</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{result.breakdown.incorrect}</div>
                  <div className="text-sm text-muted-foreground">Câu sai</div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Đề Xuất Ôn Tập
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Button onClick={() => { setResult(null); setCurrentExam(null); setAnswers({}); }} className="w-full">
              Làm Đề Khác
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (currentExam) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Timer Bar */}
        <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{currentExam.subject} - {currentExam.grade}</h1>
            <p className="text-sm text-muted-foreground">Câu {currentQuestion + 1}/{questions.length}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            <Clock className="h-5 w-5" />
            <span className="text-lg font-bold font-mono">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <Button onClick={submitExam} className="bg-green-600 hover:bg-green-700">
            Nộp bài
          </Button>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-8">
                <div className="text-lg font-medium mb-6">{questions[currentQuestion].content}</div>
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        answers[questions[currentQuestion].id] === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setAnswers({ ...answers, [questions[currentQuestion].id]: option })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[questions[currentQuestion].id] === option
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          {answers[questions[currentQuestion].id] === option && '✓'}
                        </div>
                        <span>{option}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
              >
                ← Câu trước
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                disabled={currentQuestion === questions.length - 1}
              >
                Câu tiếp →
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <PageHeader
        title="Ôn Thi Thông Minh"
        description="Luyện tập với đề thi thử tự động"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">12</div>
                <div className="text-xs text-muted-foreground">Đã làm</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">8.5</div>
                <div className="text-xs text-muted-foreground">Điểm TB</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">+0.3</div>
                <div className="text-xs text-muted-foreground">Tiến bộ</div>
              </CardContent>
            </Card>
          </div>

          {/* Create Exam Form */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Tạo Đề Thi Thử</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Môn học</Label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Toán">Toán</option>
                    <option value="Lý">Vật Lý</option>
                    <option value="Hóa">Hóa Học</option>
                    <option value="Sinh">Sinh Học</option>
                    <option value="Văn">Ngữ Văn</option>
                    <option value="Anh">Tiếng Anh</option>
                  </select>
                </div>

                <div>
                  <Label>Khối lớp</Label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={`Khối ${num}`}>Khối {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Loại kiểm tra</Label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Kiểm tra 15 phút">15 phút</option>
                    <option value="Kiểm tra 1 tiết">1 tiết</option>
                    <option value="Kiểm tra giữa kỳ">Giữa kỳ</option>
                    <option value="Kiểm tra học kỳ">Học kỳ</option>
                  </select>
                </div>

                <div>
                  <Label>Số câu hỏi</Label>
                  <Input
                    type="number"
                    value={formData.questionCount}
                    onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) || 30 })}
                  />
                </div>

                <div>
                  <Label>Thời gian (phút)</Label>
                  <Input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 45 })}
                  />
                </div>
              </div>

              <Button onClick={startPracticeExam} disabled={loading} className="w-full">
                {loading ? 'Đang tạo đề...' : 'Bắt Đầu Làm Bài'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
