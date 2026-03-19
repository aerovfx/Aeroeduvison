"use client"

import { useState } from "react"
import { Clock, BookOpen, Trophy, TrendingUp, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        body: JSON.stringify({ action: 'create', ...formData }),
      })
      const data = await response.json()
      if (data.success) {
        setCurrentExam(data.data.practice)
        setTimeRemaining(formData.timeLimit * 60)
        toast.success('Đã tạo đề thi thử!')
      }
    } catch {
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
        body: JSON.stringify({ action: 'submit', practiceId: currentExam.id, answers }),
      })
      const data = await response.json()
      if (data.success) {
        setResult(data.data.result)
        toast.success('Đã nộp bài!')
      }
    } catch {
      toast.error('Không thể nộp bài')
    }
  }

  const questions = [
    { id: 'q1', content: 'Giải phương trình: 2x + 3 = 7', options: ['x=1', 'x=2', 'x=3', 'x=4'] },
    { id: 'q2', content: 'Tính diện tích hình tròn bán kính 5cm', options: ['25π', '10π', '5π', '15π'] },
    { id: 'q3', content: 'Tìm nghiệm của x² - 4 = 0', options: ['x=2', 'x=-2', 'x=±2', 'x=0'] },
  ]

  const selectClass = "w-full rounded-xl bg-black/25 backdrop-blur-sm border border-white/[0.06] px-3 py-2.5 text-sm text-white/85 focus:outline-none focus:border-[hsl(245,85%,65%)]/40 focus:shadow-[0_0_15px_rgba(120,100,255,0.1)]"

  if (result) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Kết Quả Ôn Thi" description="Phân tích chi tiết bài làm của bạn" />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="bg-gradient-to-r from-[hsl(245,85%,55%)] to-[hsl(280,75%,55%)] rounded-2xl p-8 text-center text-white shadow-[0_0_30px_rgba(120,100,255,0.2)]">
              <div className="text-6xl font-bold mb-2">{result.percentage}%</div>
              <div className="text-xl opacity-80">{result.score}/{questions.length} câu đúng</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center">
                <div className="text-3xl font-bold text-[hsl(175,80%,55%)]">{result.breakdown.correct}</div>
                <div className="text-xs text-white/40 mt-1">Câu đúng</div>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center">
                <div className="text-3xl font-bold text-[hsl(0,80%,65%)]">{result.breakdown.incorrect}</div>
                <div className="text-xs text-white/40 mt-1">Câu sai</div>
              </div>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[hsl(175,80%,55%)]" />
                Đề Xuất Ôn Tập
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
                    <AlertCircle className="h-4 w-4 text-[hsl(210,90%,60%)] mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button onClick={() => { setResult(null); setCurrentExam(null); setAnswers({}); }} className="w-full bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] border-0 text-white hover:brightness-110">
              Làm Đề Khác
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (currentExam) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.06] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white/90">{currentExam.subject} - {currentExam.grade}</h1>
            <p className="text-xs text-white/40">Câu {currentQuestion + 1}/{questions.length}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${timeRemaining < 300 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[hsl(245,85%,65%)]/10 text-[hsl(245,85%,75%)] border border-[hsl(245,85%,65%)]/20'}`}>
            <Clock className="h-4 w-4" />
            <span className="text-lg font-bold font-mono">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          <Button onClick={submitExam} className="bg-[hsl(175,80%,40%)] hover:bg-[hsl(175,80%,45%)] text-white border-0">
            Nộp bài
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8">
              <div className="text-lg font-medium text-white/90 mb-6">{questions[currentQuestion].content}</div>
              <div className="space-y-3">
                {questions[currentQuestion].options.map((option, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      answers[questions[currentQuestion].id] === option
                        ? 'border-[hsl(245,85%,65%)]/50 bg-[hsl(245,85%,65%)]/10'
                        : 'border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                    }`}
                    onClick={() => setAnswers({ ...answers, [questions[currentQuestion].id]: option })}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                        answers[questions[currentQuestion].id] === option
                          ? 'border-[hsl(245,85%,65%)] bg-[hsl(245,85%,65%)] text-white'
                          : 'border-white/20'
                      }`}>
                        {answers[questions[currentQuestion].id] === option && '✓'}
                      </div>
                      <span className="text-white/80">{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-5">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white/90"
              >
                ← Câu trước
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                disabled={currentQuestion === questions.length - 1}
                className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white/90"
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
    <div className="flex flex-col h-full">
      <PageHeader title="Ôn Thi Thông Minh" description="Luyện tập với đề thi thử tự động" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <BookOpen className="h-7 w-7 text-[hsl(210,90%,60%)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white/90">12</div>
              <div className="text-[0.65rem] text-white/40 uppercase tracking-wider mt-1">Đã làm</div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <Trophy className="h-7 w-7 text-[hsl(35,90%,55%)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white/90">8.5</div>
              <div className="text-[0.65rem] text-white/40 uppercase tracking-wider mt-1">Điểm TB</div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <TrendingUp className="h-7 w-7 text-[hsl(175,80%,50%)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white/90">+0.3</div>
              <div className="text-[0.65rem] text-white/40 uppercase tracking-wider mt-1">Tiến bộ</div>
            </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 space-y-4">
            <h3 className="font-semibold text-lg text-white/90">Tạo Đề Thi Thử</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/50 text-xs">Môn học</Label>
                <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className={selectClass}>
                  <option value="Toán">Toán</option>
                  <option value="Lý">Vật Lý</option>
                  <option value="Hóa">Hóa Học</option>
                  <option value="Sinh">Sinh Học</option>
                  <option value="Văn">Ngữ Văn</option>
                  <option value="Anh">Tiếng Anh</option>
                </select>
              </div>

              <div>
                <Label className="text-white/50 text-xs">Khối lớp</Label>
                <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className={selectClass}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={`Khối ${num}`}>Khối {num}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-white/50 text-xs">Loại kiểm tra</Label>
                <select value={formData.examType} onChange={(e) => setFormData({ ...formData, examType: e.target.value })} className={selectClass}>
                  <option value="Kiểm tra 15 phút">15 phút</option>
                  <option value="Kiểm tra 1 tiết">1 tiết</option>
                  <option value="Kiểm tra giữa kỳ">Giữa kỳ</option>
                  <option value="Kiểm tra học kỳ">Học kỳ</option>
                </select>
              </div>

              <div>
                <Label className="text-white/50 text-xs">Số câu hỏi</Label>
                <Input
                  type="number"
                  value={formData.questionCount}
                  onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) || 30 })}
                  className="bg-black/25 border-white/[0.06] text-white/85 focus:border-[hsl(245,85%,65%)]/40"
                />
              </div>

              <div>
                <Label className="text-white/50 text-xs">Thời gian (phút)</Label>
                <Input
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 45 })}
                  className="bg-black/25 border-white/[0.06] text-white/85 focus:border-[hsl(245,85%,65%)]/40"
                />
              </div>
            </div>

            <Button onClick={startPracticeExam} disabled={loading} className="w-full bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] border-0 text-white shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.35)] hover:brightness-110">
              {loading ? 'Đang tạo đề...' : 'Bắt Đầu Làm Bài'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
