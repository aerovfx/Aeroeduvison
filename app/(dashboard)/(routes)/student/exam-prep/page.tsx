"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Clock, BookOpen, Trophy, TrendingUp, AlertCircle, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, RotateCcw, FileText,
  GraduationCap, BarChart3, History, Loader2, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { PageHeader } from "@/components/layout/page-header"

/* ─── Types ─────────────────────────────────────────── */
interface QuestionItem {
  questionId: string
  position: number
  content: string
  questionType: string
  options: string[]
  correctAnswer: string
  explanation?: string
  difficulty: string
  topic?: string
}

interface PracticeData {
  id: string
  subject: string
  grade: string
  examType: string
  source: string
  questions: QuestionItem[]
  timeLimit: number
}

interface GradeResult {
  score: number
  total: number
  percentage: number
  breakdown: {
    correct: number
    incorrect: number
    unanswered: number
    byTopic: Record<string, { correct: number; total: number; accuracy: number }>
    byDifficulty: Record<string, { correct: number; total: number; accuracy: number }>
  }
  recommendations: string[]
  details: Array<{
    questionId: string
    position: number
    content: string
    userAnswer: string | null
    correctAnswer: string
    isCorrect: boolean
    explanation?: string
    topic?: string
  }>
}

interface TeacherExam {
  id: string
  title: string
  description?: string
  examType: string
  duration: number
  totalQuestions: number
  totalScore: number
  createdAt: string
  user?: { name: string }
}

interface ExamMatrix {
  id: string
  name: string
  subject: string
  grade: string
  examType: string
  duration: number
  totalQuestions: number
  totalScore: number
  createdAt: string
  user?: { name: string }
  _count?: { selectedQuestions: number }
}

interface StudentStats {
  totalExams: number
  avgScore: number
  bestScore: number
  recentTrend: number[]
  weakTopics: string[]
  questionBankCount: number
}

interface HistoryItem {
  id: string
  subject: string
  grade: string
  examType: string
  questionCount: number
  score: number | null
  percentage: number | null
  completed: boolean
  createdAt: string
  completedAt: string | null
}

/* ─── Constants ─────────────────────────────────────── */
const SUBJECTS = [
  "Toán học", "Vật lý", "Hóa học", "Sinh học", "Ngữ văn", "Tiếng Anh",
  "Lịch sử", "Địa lý", "GDCD", "Tin học", "KHTN", "Công nghệ",
]

const EXAM_TYPES = [
  { value: "Kiểm tra 15 phút", label: "15 phút", duration: 15 },
  { value: "Kiểm tra 1 tiết", label: "1 tiết (45p)", duration: 45 },
  { value: "Kiểm tra giữa kỳ", label: "Giữa kỳ (60p)", duration: 60 },
  { value: "Kiểm tra học kỳ", label: "Học kỳ (90p)", duration: 90 },
]

const DIFF_LABELS: Record<string, string> = {
  EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó",
}

const selectClass = "w-full rounded-xl bg-black/25 backdrop-blur-sm border border-white/[0.06] px-3 py-2.5 text-sm text-white/85 focus:outline-none focus:border-[hsl(245,85%,65%)]/40 focus:shadow-[0_0_15px_rgba(120,100,255,0.1)]"

/* ─── Main Component ────────────────────────────────── */
export default function ExamPrepPage() {
  // View state
  type ViewState = "home" | "taking" | "result" | "review" | "history"
  const [view, setView] = useState<ViewState>("home")
  const [activeTab, setActiveTab] = useState<"bank" | "teacher">("bank")

  // Loading
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  // Exam data
  const [practice, setPractice] = useState<PracticeData | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Result
  const [result, setResult] = useState<GradeResult | null>(null)

  // Stats & data
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [teacherExams, setTeacherExams] = useState<TeacherExam[]>([])
  const [examMatrices, setExamMatrices] = useState<ExamMatrix[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [teacherExamsLoading, setTeacherExamsLoading] = useState(false)

  // Form
  const [formData, setFormData] = useState({
    subject: "Toán học",
    grade: "Khối 9",
    examType: "Kiểm tra 1 tiết",
    questionCount: 30,
    timeLimit: 45,
    topic: "__all__",
  })

  // Available topics for current subject/grade
  const [availableTopics, setAvailableTopics] = useState<string[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)

  /* ─── Load Stats on mount ─────────────────────────── */
  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/agents/exam-prep?action=stats")
      const data = await res.json()
      if (data.success) setStats(data.data.stats)
    } catch {} finally {
      setStatsLoading(false)
    }
  }

  /* ─── Fetch topics when subject changes ───────────── */
  useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true)
      try {
        const params = new URLSearchParams({ action: "topics", subject: formData.subject })
        const res = await fetch(`/api/agents/exam-prep?${params}`)
        const data = await res.json()
        if (data.success) {
          setAvailableTopics(data.data.topics || [])
        }
      } catch {
        setAvailableTopics([])
      } finally {
        setTopicsLoading(false)
      }
    }
    fetchTopics()
    setFormData((f) => ({ ...f, topic: "__all__" }))
  }, [formData.subject])

  /* ─── Timer ───────────────────────────────────────── */
  useEffect(() => {
    if (view === "taking" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            handleSubmit(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [view])

  /* ─── Auto-sync exam type → time ──────────────────── */
  useEffect(() => {
    const found = EXAM_TYPES.find((t) => t.value === formData.examType)
    if (found) setFormData((f) => ({ ...f, timeLimit: found.duration }))
  }, [formData.examType])

  /* ─── Create exam from Question Bank ──────────────── */
  const startFromBank = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agents/exam-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...formData }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || data.error || "Lỗi tạo đề")
        return
      }
      if (data.success && data.data.practice) {
        const p = data.data.practice
        if (!p.questions || p.questions.length === 0) {
          toast.error("Ngân hàng đề chưa có câu hỏi cho môn/khối này. Hãy liên hệ giáo viên để thêm câu hỏi.")
          return
        }
        setPractice(p)
        setAnswers({})
        setCurrentQ(0)
        setTimeLeft(p.timeLimit * 60)
        setView("taking")
        toast.success(`Đề thi ${p.questions.length} câu đã sẵn sàng!`)
      }
    } catch {
      toast.error("Không thể tạo đề thi")
    } finally {
      setLoading(false)
    }
  }

  /* ─── Create from Teacher Exam ────────────────────── */
  const startFromTeacherExam = async (examId: string, type: "exam" | "matrix") => {
    setLoading(true)
    try {
      const action = type === "exam" ? "create_from_exam" : "create_from_matrix"
      const key = type === "exam" ? "examId" : "matrixId"
      const res = await fetch("/api/agents/exam-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, [key]: examId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || data.error || "Lỗi tạo đề")
        return
      }
      if (data.success && data.data.practice) {
        const p = data.data.practice
        setPractice(p)
        setAnswers({})
        setCurrentQ(0)
        setTimeLeft(p.timeLimit * 60)
        setView("taking")
        toast.success(`Đề thi ${p.questions.length} câu đã sẵn sàng!`)
      }
    } catch {
      toast.error("Không thể tạo đề thi")
    } finally {
      setLoading(false)
    }
  }

  /* ─── Load Teacher Exams ──────────────────────────── */
  const loadTeacherExams = async () => {
    setTeacherExamsLoading(true)
    try {
      const res = await fetch("/api/agents/exam-prep?action=teacher_exams")
      const data = await res.json()
      if (data.success) {
        setTeacherExams(data.data.exams || [])
        setExamMatrices(data.data.matrices || [])
      }
    } catch {} finally {
      setTeacherExamsLoading(false)
    }
  }

  /* ─── Load History ────────────────────────────────── */
  const loadHistory = async () => {
    try {
      const res = await fetch("/api/agents/exam-prep?action=history")
      const data = await res.json()
      if (data.success) setHistory(data.data.history || [])
    } catch {}
  }

  /* ─── Submit Exam ─────────────────────────────────── */
  const handleSubmit = async (autoSubmit = false) => {
    if (!practice) return
    if (!autoSubmit && !confirm("Nộp bài? Bạn sẽ không thể sửa đáp án.")) return

    if (timerRef.current) clearInterval(timerRef.current)

    setLoading(true)
    try {
      const res = await fetch("/api/agents/exam-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", practiceId: practice.id, answers }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data.data.result)
        setView("result")
        toast.success(autoSubmit ? "Hết giờ! Đã tự động nộp bài." : "Đã nộp bài!")
        fetchStats()
      }
    } catch {
      toast.error("Không thể nộp bài")
    } finally {
      setLoading(false)
    }
  }

  /* ─── Format time ─────────────────────────────────── */
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  /* ─── RENDER: Taking Exam ─────────────────────────── */
  if (view === "taking" && practice) {
    const q = practice.questions[currentQ]
    const answeredCount = Object.keys(answers).length
    const totalQ = practice.questions.length
    const isUrgent = timeLeft < 300

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.06] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white/90">{practice.subject} - {practice.grade}</h1>
            <p className="text-xs text-white/40">{practice.examType} | Câu {currentQ + 1}/{totalQ} | Đã trả lời: {answeredCount}/{totalQ}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isUrgent ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" : "bg-[hsl(245,85%,65%)]/10 text-[hsl(245,85%,75%)] border border-[hsl(245,85%,65%)]/20"}`}>
            <Clock className="h-4 w-4" />
            <span className="text-lg font-bold font-mono">{formatTime(timeLeft)}</span>
          </div>
          <Button onClick={() => handleSubmit(false)} disabled={loading} className="bg-[hsl(175,80%,40%)] hover:bg-[hsl(175,80%,45%)] text-white border-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nộp bài"}
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Question navigation pills */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {practice.questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    i === currentQ
                      ? "bg-[hsl(245,85%,60%)] text-white shadow-lg"
                      : answers[practice.questions[i].questionId]
                      ? "bg-[hsl(175,80%,40%)]/20 text-[hsl(175,80%,55%)] border border-[hsl(175,80%,40%)]/30"
                      : "bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08]"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Question Card */}
            {q && (
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded-md bg-[hsl(245,85%,65%)]/10 text-[hsl(245,85%,75%)] text-xs font-medium">
                    Câu {q.position}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                    q.difficulty === "EASY" ? "bg-green-500/10 text-green-400" :
                    q.difficulty === "HARD" ? "bg-red-500/10 text-red-400" :
                    "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {DIFF_LABELS[q.difficulty] || q.difficulty}
                  </span>
                  {q.topic && (
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-white/40 text-xs">{q.topic}</span>
                  )}
                </div>

                <div className="text-lg font-medium text-white/90 mb-6 whitespace-pre-wrap">{q.content}</div>

                {/* Options */}
                {q.options && q.options.length > 0 ? (
                  <div className="space-y-3">
                    {q.options.map((opt, idx) => {
                      const label = String.fromCharCode(65 + idx) // A, B, C, D
                      const isSelected = answers[q.questionId] === opt
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-[hsl(245,85%,65%)]/50 bg-[hsl(245,85%,65%)]/10"
                              : "border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                          }`}
                          onClick={() => setAnswers({ ...answers, [q.questionId]: opt })}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                              isSelected
                                ? "border-[hsl(245,85%,65%)] bg-[hsl(245,85%,65%)] text-white"
                                : "border-white/20 text-white/40"
                            }`}>
                              {label}
                            </div>
                            <span className="text-white/80 whitespace-pre-wrap">{opt}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Short answer / Essay */
                  <div>
                    <textarea
                      value={answers[q.questionId] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q.questionId]: e.target.value })}
                      placeholder="Nhập câu trả lời..."
                      rows={4}
                      className="w-full rounded-xl bg-black/25 border border-white/[0.06] px-4 py-3 text-white/85 placeholder-white/30 focus:outline-none focus:border-[hsl(245,85%,65%)]/40 resize-y"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-5">
              <Button
                variant="outline"
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0}
                className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Câu trước
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentQ(Math.min(totalQ - 1, currentQ + 1))}
                disabled={currentQ === totalQ - 1}
                className="bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]"
              >
                Câu tiếp <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: Result ──────────────────────────────── */
  if (view === "result" && result) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Kết Quả Bài Thi" description="Phân tích chi tiết bài làm của bạn" />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Score Banner */}
            <div className="bg-gradient-to-r from-[hsl(245,85%,55%)] to-[hsl(280,75%,55%)] rounded-2xl p-8 text-center text-white shadow-[0_0_30px_rgba(120,100,255,0.2)]">
              <div className="text-6xl font-bold mb-2">{result.percentage}%</div>
              <div className="text-xl opacity-80">{result.score}/{result.total} câu đúng</div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center">
                <div className="text-3xl font-bold text-[hsl(175,80%,55%)]">{result.breakdown.correct}</div>
                <div className="text-xs text-white/40 mt-1">Đúng</div>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center">
                <div className="text-3xl font-bold text-[hsl(0,80%,65%)]">{result.breakdown.incorrect}</div>
                <div className="text-xs text-white/40 mt-1">Sai</div>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center">
                <div className="text-3xl font-bold text-white/30">{result.breakdown.unanswered}</div>
                <div className="text-xs text-white/40 mt-1">Bỏ qua</div>
              </div>
            </div>

            {/* By Topic */}
            {Object.keys(result.breakdown.byTopic).length > 0 && (
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
                <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[hsl(210,90%,60%)]" />
                  Phân tích theo chủ đề
                </h3>
                <div className="space-y-3">
                  {Object.entries(result.breakdown.byTopic).map(([topic, s]) => (
                    <div key={topic}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">{topic}</span>
                        <span className={`font-medium ${s.accuracy >= 70 ? "text-green-400" : s.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {s.correct}/{s.total} ({s.accuracy}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${s.accuracy >= 70 ? "bg-green-500" : s.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${s.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Difficulty */}
            {Object.keys(result.breakdown.byDifficulty).length > 0 && (
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
                <h3 className="font-semibold text-white/90 mb-4">Phân tích theo độ khó</h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(result.breakdown.byDifficulty).map(([diff, s]) => (
                    <div key={diff} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="text-xs text-white/40 mb-1">{DIFF_LABELS[diff] || diff}</div>
                      <div className={`text-xl font-bold ${s.accuracy >= 70 ? "text-green-400" : s.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                        {s.accuracy}%
                      </div>
                      <div className="text-xs text-white/30">{s.correct}/{s.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[hsl(175,80%,55%)]" />
                Đề Xuất Ôn Tập
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={() => setView("review")} variant="outline" className="flex-1 bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
                <Search className="h-4 w-4 mr-2" /> Xem lại đáp án
              </Button>
              <Button onClick={() => { setView("home"); setResult(null); setPractice(null); setAnswers({}); }} className="flex-1 bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] border-0 text-white hover:brightness-110">
                <RotateCcw className="h-4 w-4 mr-2" /> Làm Đề Khác
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: Review answers ──────────────────────── */
  if (view === "review" && result) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Xem Lại Đáp Án" description={`${result.score}/${result.total} câu đúng (${result.percentage}%)`} />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {result.details.map((d, i) => (
              <div key={d.questionId} className={`bg-white/[0.02] backdrop-blur-xl rounded-2xl border p-6 ${d.isCorrect ? "border-green-500/20" : "border-red-500/20"}`}>
                <div className="flex items-center gap-2 mb-3">
                  {d.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-white/70">Câu {d.position}</span>
                  {d.topic && <span className="text-xs px-2 py-0.5 rounded bg-white/[0.05] text-white/40">{d.topic}</span>}
                </div>
                <p className="text-white/90 mb-3 whitespace-pre-wrap">{d.content}</p>
                <div className="space-y-1 text-sm">
                  <p className="text-white/50">
                    Bạn chọn: <span className={d.isCorrect ? "text-green-400 font-medium" : "text-red-400 font-medium line-through"}>
                      {d.userAnswer || "(Bỏ qua)"}
                    </span>
                  </p>
                  {!d.isCorrect && (
                    <p className="text-white/50">
                      Đáp án đúng: <span className="text-green-400 font-medium">{d.correctAnswer}</span>
                    </p>
                  )}
                  {d.explanation && (
                    <div className="mt-3 p-3 rounded-lg bg-[hsl(210,90%,60%)]/5 border border-[hsl(210,90%,60%)]/10">
                      <p className="text-xs text-[hsl(210,90%,70%)]">💡 {d.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <Button onClick={() => setView("result")} variant="outline" className="w-full bg-white/[0.03] border-white/[0.08] text-white/70 hover:bg-white/[0.06]">
              <ChevronLeft className="h-4 w-4 mr-1" /> Quay lại kết quả
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: Home ────────────────────────────────── */
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Ôn Thi Thông Minh" description="Luyện tập với đề thi từ ngân hàng đề và bài kiểm tra của giáo viên" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <BookOpen className="h-6 w-6 text-[hsl(210,90%,60%)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white/90">{statsLoading ? "..." : stats?.totalExams || 0}</div>
              <div className="text-[0.65rem] text-white/40 uppercase tracking-wider mt-1">Đã làm</div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <Trophy className="h-6 w-6 text-[hsl(35,90%,55%)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white/90">{statsLoading ? "..." : stats?.avgScore || 0}%</div>
              <div className="text-[0.65rem] text-white/40 uppercase tracking-wider mt-1">Điểm TB</div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]">
              <TrendingUp className="h-6 w-6 text-[hsl(175,80%,50%)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white/90">{statsLoading ? "..." : stats?.bestScore || 0}%</div>
              <div className="text-[0.65rem] text-white/40 uppercase tracking-wider mt-1">Cao nhất</div>
            </div>
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all hover:-translate-y-0.5 hover:bg-white/[0.04] cursor-pointer" onClick={() => { loadHistory(); setView("history" as any); }}>
              <History className="h-6 w-6 text-[hsl(280,75%,60%)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white/90">{statsLoading ? "..." : stats?.questionBankCount || 0}</div>
              <div className="text-[0.65rem] text-white/40 uppercase tracking-wider mt-1">Ngân hàng</div>
            </div>
          </div>

          {/* Tabs: Ngân hàng đề / Đề thi giáo viên */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("bank")}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === "bank"
                  ? "bg-[hsl(245,85%,60%)]/15 text-[hsl(245,85%,75%)] border border-[hsl(245,85%,60%)]/30"
                  : "bg-white/[0.02] text-white/50 border border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <BookOpen className="h-4 w-4 inline-block mr-2" />
              Ngân hàng câu hỏi
            </button>
            <button
              onClick={() => { setActiveTab("teacher"); loadTeacherExams(); }}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === "teacher"
                  ? "bg-[hsl(175,80%,45%)]/15 text-[hsl(175,80%,60%)] border border-[hsl(175,80%,45%)]/30"
                  : "bg-white/[0.02] text-white/50 border border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <GraduationCap className="h-4 w-4 inline-block mr-2" />
              Đề thi giáo viên
            </button>
          </div>

          {/* TAB: Question Bank */}
          {activeTab === "bank" && (
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6 space-y-4">
              <h3 className="font-semibold text-lg text-white/90">Tạo Đề Thi Thử từ Ngân Hàng</h3>
              <p className="text-xs text-white/40">Hệ thống tự động chọn câu hỏi theo tỉ lệ: 40% Dễ, 30% Trung bình, 30% Khó</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/50 text-xs">Môn học</Label>
                  <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className={selectClass}>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-white/50 text-xs">Khối lớp</Label>
                  <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className={selectClass}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={`Khối ${n}`}>Khối {n}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label className="text-white/50 text-xs">Chủ đề (Topic)</Label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className={selectClass}
                    disabled={topicsLoading}
                  >
                    <option value="__all__">
                      {topicsLoading ? "Đang tải chủ đề..." : "Tất cả chủ đề"}
                    </option>
                    {availableTopics.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {availableTopics.length > 0 && formData.topic === "__all__" && (
                    <p className="text-[10px] text-white/30 mt-1">{availableTopics.length} chủ đề có sẵn</p>
                  )}
                  {stats?.weakTopics && stats.weakTopics.length > 0 && formData.topic === "__all__" && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] text-amber-400/70">Yếu:</span>
                      {stats.weakTopics.slice(0, 3).map((wt) => (
                        <button
                          key={wt}
                          type="button"
                          onClick={() => {
                            if (availableTopics.includes(wt)) {
                              setFormData({ ...formData, topic: wt })
                            }
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${
                            availableTopics.includes(wt)
                              ? "border-amber-500/30 text-amber-400/80 hover:bg-amber-500/10 cursor-pointer"
                              : "border-white/[0.06] text-white/30 cursor-default"
                          }`}
                        >
                          {wt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-white/50 text-xs">Loại kiểm tra</Label>
                  <select value={formData.examType} onChange={(e) => setFormData({ ...formData, examType: e.target.value })} className={selectClass}>
                    {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-white/50 text-xs">Số câu hỏi</Label>
                  <Input
                    type="number"
                    value={formData.questionCount}
                    onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) || 10 })}
                    min={5}
                    max={100}
                    className="bg-black/25 border-white/[0.06] text-white/85 focus:border-[hsl(245,85%,65%)]/40"
                  />
                </div>
                <div>
                  <Label className="text-white/50 text-xs">Thời gian (phút)</Label>
                  <Input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 15 })}
                    min={5}
                    max={180}
                    className="bg-black/25 border-white/[0.06] text-white/85 focus:border-[hsl(245,85%,65%)]/40"
                  />
                </div>
              </div>

              <Button onClick={startFromBank} disabled={loading} className="w-full bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] border-0 text-white shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.35)] hover:brightness-110">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang tạo đề...</> : "Bắt Đầu Làm Bài"}
              </Button>
            </div>
          )}

          {/* TAB: Teacher Exams */}
          {activeTab === "teacher" && (
            <div className="space-y-4">
              {teacherExamsLoading ? (
                <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white/30 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Đang tải danh sách đề thi...</p>
                </div>
              ) : (
                <>
                  {/* Exam Matrices */}
                  {examMatrices.length > 0 && (
                    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
                      <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[hsl(175,80%,55%)]" />
                        Ma Trận Đề ({examMatrices.length})
                      </h3>
                      <div className="space-y-3">
                        {examMatrices.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] hover:bg-white/[0.03] transition-all">
                            <div className="flex-1">
                              <h4 className="font-medium text-white/85">{m.name}</h4>
                              <p className="text-xs text-white/40 mt-1">
                                {m.subject} | {m.grade} | {m.examType} | {m._count?.selectedQuestions || m.totalQuestions} câu | {m.duration}p
                              </p>
                              {m.user?.name && <p className="text-xs text-white/30 mt-0.5">GV: {m.user.name}</p>}
                            </div>
                            <Button
                              onClick={() => startFromTeacherExam(m.id, "matrix")}
                              disabled={loading}
                              size="sm"
                              className="bg-[hsl(175,80%,40%)] hover:bg-[hsl(175,80%,45%)] text-white border-0"
                            >
                              Làm bài
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher Exams */}
                  {teacherExams.length > 0 && (
                    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
                      <h3 className="font-semibold text-white/90 mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-[hsl(210,90%,60%)]" />
                        Đề Thi ({teacherExams.length})
                      </h3>
                      <div className="space-y-3">
                        {teacherExams.map((ex) => (
                          <div key={ex.id} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] hover:bg-white/[0.03] transition-all">
                            <div className="flex-1">
                              <h4 className="font-medium text-white/85">{ex.title}</h4>
                              <p className="text-xs text-white/40 mt-1">
                                {ex.examType} | {ex.totalQuestions} câu | {ex.duration}p | {ex.totalScore} điểm
                              </p>
                              {ex.user?.name && <p className="text-xs text-white/30 mt-0.5">GV: {ex.user.name}</p>}
                            </div>
                            <Button
                              onClick={() => startFromTeacherExam(ex.id, "exam")}
                              disabled={loading}
                              size="sm"
                              className="bg-[hsl(210,90%,50%)] hover:bg-[hsl(210,90%,55%)] text-white border-0"
                            >
                              Làm bài
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {teacherExams.length === 0 && examMatrices.length === 0 && (
                    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-12 text-center">
                      <GraduationCap className="h-12 w-12 text-white/15 mx-auto mb-3" />
                      <p className="text-white/40 text-sm">Chưa có đề thi nào từ giáo viên.</p>
                      <p className="text-white/25 text-xs mt-1">Khi giáo viên tạo và công bố đề thi, bạn sẽ thấy tại đây.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Weak topics warning */}
          {stats && stats.weakTopics.length > 0 && (
            <div className="bg-red-500/5 backdrop-blur-xl rounded-2xl border border-red-500/10 p-5">
              <h3 className="font-semibold text-red-400 text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Chủ đề cần ôn tập
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.weakTopics.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs border border-red-500/15">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
