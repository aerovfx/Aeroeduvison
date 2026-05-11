
import { useState, useEffect, useRef, useMemo } from "react"
import {
  Clock, BookOpen, Trophy, TrendingUp, AlertCircle, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, RotateCcw, FileText,
  GraduationCap, BarChart3, History, Loader2, Search,
  Users, Medal, Sparkles, RefreshCw,
  Rocket, Mountain, Gamepad2, Target, Zap, ArrowRight, QrCode,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"

import { examPrepService } from "@/services/examPrep.service"
import { useAuth } from "@/hooks/useAuth"
import { formatRelativeTime } from "@/lib/utils"
import { QuickScanQr } from "@/components/common/QuickScanQr"
import { MathText } from "@/components/common/MathText"
import { DocRef } from "@/components/docs/DocRef"
import type {
  PracticeExam,
  GradeResult,
  TeacherExam,
  ExamMatrixItem,
  ExamPrepStats,
  ExamPrepHistoryItem,
  ExamCommunityStats,
} from "@/types"

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
const inputClass = "w-full rounded-xl bg-black/25 border border-white/[0.06] px-3 py-2.5 text-sm text-white/85 placeholder-white/30 focus:outline-none focus:border-[hsl(245,85%,65%)]/40"

/* ─── Inline replacements ────────────────────────────── */
function PageHeader({ title, description, docSlug, docAnchor }: { title: string; description: string; docSlug?: string; docAnchor?: string }) {
  return (
    <div className="px-6 py-5 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white/90">{title}</h1>
        {docSlug && (
          <DocRef slug={docSlug} anchor={docAnchor} term="Hướng dẫn" className="text-xs text-white/60 hover:text-white" />
        )}
      </div>
      {description && <p className="text-sm text-white/40 mt-0.5">{description}</p>}
    </div>
  )
}

/* ─── Main Component ────────────────────────────────── */
export default function ExamPrepPage() {
  const { user } = useAuth()

  type ViewState = "home" | "taking" | "result" | "review" | "history"
  const [view, setView] = useState<ViewState>("home")
  const [activeTab, setActiveTab] = useState<"bank" | "teacher">("teacher")

  const [loading, setLoading] = useState(false)

  const [practice, setPractice] = useState<PracticeExam | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [result, setResult] = useState<GradeResult | null>(null)
  const [history, setHistory] = useState<ExamPrepHistoryItem[]>([])

  const [formData, setFormData] = useState({
    subject: "Toán học",
    grade: "Khối 9",
    examType: "Kiểm tra 1 tiết",
    questionCount: 30,
    timeLimit: 45,
    topic: "__all__",
  })

  /* ─── React Query: Stats ──────────────────────────── */
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<ExamPrepStats | null>({
    queryKey: ["exam-prep", "stats"],
    queryFn: examPrepService.getStats,
    staleTime: 30_000,
    retry: false,
  })

  /* ─── React Query: Topics theo subject ────────────── */
  const { data: availableTopics = [], isLoading: topicsLoading } = useQuery<string[]>({
    queryKey: ["exam-prep", "topics", formData.subject],
    queryFn: () => examPrepService.getTopics(formData.subject),
    staleTime: 60_000,
    retry: false,
  })

  // Reset topic về "__all__" khi đổi môn
  useEffect(() => {
    setFormData((f) => ({ ...f, topic: "__all__" }))
  }, [formData.subject])

  /* ─── React Query: Teacher exams (chỉ load khi active tab) ── */
  const {
    data: teacherExamsData,
    isLoading: teacherExamsLoading,
  } = useQuery<{ exams: TeacherExam[]; matrices: ExamMatrixItem[] }>({
    queryKey: ["exam-prep", "teacher-exams"],
    queryFn: examPrepService.getTeacherExams,
    enabled: activeTab === "teacher",
    staleTime: 60_000,
    retry: false,
  })
  const teacherExams = teacherExamsData?.exams ?? []
  const examMatrices = teacherExamsData?.matrices ?? []

  /* ─── React Query: Community stats ────────────────── */
  const {
    data: communityStats,
    isLoading: communityLoading,
    refetch: refetchCommunity,
  } = useQuery<ExamCommunityStats>({
    queryKey: ["exam-prep", "community-stats"],
    queryFn: examPrepService.getCommunityStats,
    staleTime: 60_000,
    retry: false,
  })

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  /* ─── Auto-sync exam type → time ──────────────────── */
  useEffect(() => {
    const found = EXAM_TYPES.find((t) => t.value === formData.examType)
    if (found) setFormData((f) => ({ ...f, timeLimit: found.duration }))
  }, [formData.examType])

  /* ─── Auto-start exam khi vào qua link QR ─────────────
   *  /student/exam-prep?startExam=ID&type=exam|matrix
   *  Học sinh quét QR trên điện thoại → page tự động vào tab "teacher"
   *  + tự khởi tạo bài làm. Chỉ chạy 1 lần ở mount.
   */
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (autoStartedRef.current) return
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const examId = sp.get('startExam')
    const type = sp.get('type') === 'matrix' ? 'matrix' : 'exam'
    if (!examId) return
    autoStartedRef.current = true
    setActiveTab('teacher')
    // Defer 1 tick để state activeTab apply trước khi gọi API
    setTimeout(() => { startFromTeacherExam(examId, type) }, 50)
    // Dọn URL để không loop khi user reload
    window.history.replaceState({}, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ─── Create exam from Question Bank ──────────────── */
  const startFromBank = async () => {
    setLoading(true)
    try {
      const p = await examPrepService.createFromBank({
        subject: formData.subject,
        grade: formData.grade,
        examType: formData.examType,
        questionCount: formData.questionCount,
        timeLimit: formData.timeLimit,
        topic: formData.topic,
      })
      if (!p) {
        toast.error("Không tạo được đề. Ngân hàng có thể chưa có câu hỏi cho môn/khối này.")
        return
      }
      if (!p.questions || p.questions.length === 0) {
        toast.error("Ngân hàng đề chưa có câu hỏi cho môn/khối này. Hãy liên hệ giáo viên để thêm câu hỏi.")
        return
      }
      setPractice(p)
      setAnswers({})
      setCurrentQ(0)
      setTimeLeft(p.timeLimit * 60)
      setView("taking")
      // Nếu BE đã sinh thêm bằng AI → báo cho học sinh biết
      const ai = (p as { aiAdded?: number }).aiAdded ?? 0
      if (ai > 0) {
        toast.success(
          `🤖 AI đã tạo thêm ${ai} câu mới cho chủ đề "${formData.topic === '__all__' ? formData.subject : formData.topic}" — đã lưu vào ngân hàng cho lần sau!`,
          { duration: 5000 }
        )
        setTimeout(() => toast.success(`Đề thi ${p.questions.length} câu đã sẵn sàng!`), 800)
      } else {
        toast.success(`Đề thi ${p.questions.length} câu đã sẵn sàng!`)
      }
    } catch (err) {
      // BE trả 400/404/500 với body { success:false, error, message }.
      // Axios throw → err.response.data.message mới là nguồn chính xác.
      // Trước đây chỉ đọc err.message → luôn hiện "Request failed with status 400",
      // khiến người dùng không biết "ngân hàng câu hỏi trống" vs "không đủ câu".
      type ApiErr = {
        response?: { data?: { message?: string; error?: string } | string }
        message?: string
      }
      const e = err as ApiErr
      const d = typeof e.response?.data === 'object' ? e.response?.data : null
      const beMsg = d?.message || d?.error
      const errCode = d?.error
      // Map mã lỗi BE → hint thân thiện
      const friendly =
        errCode === 'no_questions'
          ? `Ngân hàng câu hỏi chưa có câu nào cho ${formData.subject} – ${formData.grade}. Vào trang "Ngân hàng câu hỏi" để thêm, hoặc liên hệ giáo viên.`
          : errCode === 'insufficient_questions'
            ? beMsg || `Không đủ câu cho đề ${formData.questionCount} câu. Hãy giảm số câu hoặc thêm câu vào ngân hàng.`
            : errCode === 'missing_fields'
              ? 'Thiếu môn học hoặc khối lớp.'
              : null
      toast.error(friendly || beMsg || e.message || 'Không thể tạo đề thi')
    } finally {
      setLoading(false)
    }
  }

  /* ─── Create from Teacher Exam ────────────────────── */
  const startFromTeacherExam = async (examId: string, type: "exam" | "matrix") => {
    setLoading(true)
    try {
      const p = await examPrepService.createFromTeacherExam(examId, type)
      if (!p) {
        toast.error("Không tạo được đề từ giáo viên")
        return
      }
      setPractice(p)
      setAnswers({})
      setCurrentQ(0)
      setTimeLeft(p.timeLimit * 60)
      setView("taking")
      toast.success(`Đề thi ${p.questions.length} câu đã sẵn sàng!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể tạo đề thi"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  /* ─── Load History ────────────────────────────────── */
  const loadHistory = async () => {
    const h = await examPrepService.getHistory()
    setHistory(h)
  }

  /* ─── Submit Exam ─────────────────────────────────── */
  const handleSubmit = async (autoSubmit = false) => {
    if (!practice) return
    if (!autoSubmit && !confirm("Nộp bài? Bạn sẽ không thể sửa đáp án.")) return

    if (timerRef.current) clearInterval(timerRef.current)

    setLoading(true)
    try {
      const gradeResult = await examPrepService.submit({
        practiceId: practice.id,
        answers,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        userImage: user?.image ?? null,
        subject: practice.subject,
        grade: practice.grade,
        examType: practice.examType,
        questionCount: practice.questions.length,
      })
      if (gradeResult) {
        setResult(gradeResult)
        setView("result")
        toast.success(autoSubmit ? "Hết giờ! Đã tự động nộp bài." : "Đã nộp bài!")
        refetchStats()
        refetchCommunity()
      } else {
        toast.error("Không nộp được bài — hãy thử lại")
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
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(175,80%,40%)] hover:bg-[hsl(175,80%,45%)] text-white text-sm font-medium transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Nộp bài"}
          </button>
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

                <MathText as="div" className="text-lg font-medium text-white/90 mb-6">{q.content}</MathText>

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
                            <MathText as="span" className="text-white/80">{opt}</MathText>
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
              <button
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Câu trước
              </button>
              <button
                onClick={() => setCurrentQ(Math.min(totalQ - 1, currentQ + 1))}
                disabled={currentQ === totalQ - 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                Câu tiếp <ChevronRight className="h-4 w-4 ml-1" />
              </button>
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
              {communityStats && communityStats.averagePercentage > 0 && (
                <div className="mt-3 text-sm opacity-75">
                  Trung bình cộng đồng: <span className="font-semibold">{communityStats.averagePercentage}%</span>
                  {" · "}
                  {result.percentage >= communityStats.averagePercentage
                    ? "Bạn đang trên trung bình 💪"
                    : "Cố gắng thêm nhé 🌱"}
                </div>
              )}
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
              <button
                onClick={() => setView("review")}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all text-sm font-medium"
              >
                <Search className="h-4 w-4" /> Xem lại đáp án
              </button>
              <button
                onClick={() => { setView("home"); setResult(null); setPractice(null); setAnswers({}) }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white hover:brightness-110 transition-all text-sm font-medium"
              >
                <RotateCcw className="h-4 w-4" /> Làm Đề Khác
              </button>
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
            {result.details.map((d) => (
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

            <button
              onClick={() => setView("result")}
              className="w-full flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all text-sm font-medium"
            >
              <ChevronLeft className="h-4 w-4" /> Quay lại kết quả
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: History ─────────────────────────────── */
  if (view === "history") {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Lịch Sử Làm Bài" description="Xem lại các lần luyện tập trước đây" />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            {history.length === 0 ? (
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-12 text-center">
                <History className="h-12 w-12 text-white/15 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Chưa có lịch sử luyện tập</p>
              </div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white/85 font-medium text-sm">{h.subject} — {h.examType}</p>
                    <p className="text-white/40 text-xs mt-0.5">{h.questionCount} câu | {new Date(h.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  {h.percentage != null && (
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${h.percentage >= 80 ? "bg-green-500/10 text-green-400" : h.percentage >= 60 ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>
                      {h.percentage}%
                    </span>
                  )}
                </div>
              ))
            )}
            <button
              onClick={() => setView("home")}
              className="w-full flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/70 hover:bg-white/[0.06] transition-all text-sm font-medium"
            >
              <ChevronLeft className="h-4 w-4" /> Quay lại
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── RENDER: Home (Wayground-style, mobile-first big text) ───────────── */
  // Greeting theo giờ trong ngày để cá nhân hoá hero
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 11) return 'Chào buổi sáng'
    if (h < 14) return 'Chào buổi trưa'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  })()
  const firstName = user?.name?.split(' ').pop() || 'bạn'

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Ôn Thi Thông Minh" description="Luyện tập với đề thi từ ngân hàng đề và bài kiểm tra của giáo viên" docSlug="student-guide" docAnchor="exam-prep" />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">

          {/* ── Hero greeting + Quick action ─────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(262,83%,30%)] via-[hsl(245,75%,28%)] to-[hsl(210,80%,25%)] p-5 sm:p-7">
            <div className="absolute -top-12 -right-8 w-48 h-48 rounded-full bg-[hsl(175,80%,50%)]/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-8 w-48 h-48 rounded-full bg-[hsl(280,75%,55%)]/20 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="h-4 w-4 text-[hsl(50,100%,70%)]" />
                <span className="text-xs sm:text-sm font-medium text-white/70 uppercase tracking-wider">
                  {greeting}, {firstName}!
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-1">
                Sẵn sàng cho 1 đề thi?
              </h2>
              <p className="text-sm sm:text-base text-white/70 mb-4 sm:mb-5">
                Chọn đề từ giáo viên hoặc luyện tập từ ngân hàng câu hỏi.
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setActiveTab("teacher")}
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white text-[hsl(262,83%,30%)] font-bold text-sm sm:text-base shadow-lg hover:scale-[1.02] transition-transform"
                >
                  <Rocket className="h-4 w-4 sm:h-5 sm:w-5" />
                  Bắt đầu ngay
                </button>
                <button
                  onClick={() => { loadHistory(); setView("history") }}
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white/10 backdrop-blur text-white font-semibold text-sm sm:text-base border border-white/20 hover:bg-white/20 transition"
                >
                  <History className="h-4 w-4 sm:h-5 sm:w-5" />
                  Lịch sử
                </button>
              </div>
            </div>
          </div>

          {/* ── Stats — 3 tiles BIG text ──────────────────────────── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatTile
              icon={<BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />}
              value={statsLoading ? "—" : `${stats?.totalExams || 0}`}
              label="Đã làm"
              accent="hsl(210,90%,60%)"
            />
            <StatTile
              icon={<Trophy className="h-5 w-5 sm:h-6 sm:w-6" />}
              value={statsLoading ? "—" : `${stats?.avgScore || 0}%`}
              label="Điểm TB"
              accent="hsl(35,90%,55%)"
            />
            <StatTile
              icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
              value={statsLoading ? "—" : `${stats?.bestScore || 0}%`}
              label="Cao nhất"
              accent="hsl(175,80%,50%)"
            />
          </div>

          {/* ── Tabs (BIG, Wayground-style pill) ──────────────────── */}
          <div className="flex gap-2 sm:gap-3 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <button
              onClick={() => setActiveTab("teacher")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-4 px-3 rounded-xl text-base sm:text-lg font-bold transition-all ${
                activeTab === "teacher"
                  ? "bg-gradient-to-br from-[hsl(175,80%,45%)] to-[hsl(190,80%,40%)] text-white shadow-lg"
                  : "text-white/55 hover:text-white/80"
              }`}
            >
              <GraduationCap className="h-5 w-5" />
              <span className="hidden xs:inline">Đề thi</span> giáo viên
            </button>
            <button
              onClick={() => setActiveTab("bank")}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-4 px-3 rounded-xl text-base sm:text-lg font-bold transition-all ${
                activeTab === "bank"
                  ? "bg-gradient-to-br from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white shadow-lg"
                  : "text-white/55 hover:text-white/80"
              }`}
            >
              <BookOpen className="h-5 w-5" />
              Ngân hàng
            </button>
          </div>

          {/* TAB: Question Bank — Wayground-style big-text form */}
          {activeTab === "bank" && (
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/[0.06] p-5 sm:p-7 space-y-5">
              <div>
                <h3 className="font-bold text-xl sm:text-2xl text-white leading-tight">
                  Luyện tập từ Ngân hàng
                </h3>
                <p className="text-sm sm:text-base text-white/55 mt-1">
                  Tự động chọn theo tỉ lệ <span className="text-emerald-300/80">40% Dễ</span> ·
                  {' '}<span className="text-amber-300/80">30% TB</span> ·
                  {' '}<span className="text-rose-300/80">30% Khó</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FieldBig label="Môn học">
                  <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="exam-select-big">
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FieldBig>
                <FieldBig label="Khối lớp">
                  <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="exam-select-big">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={`Khối ${n}`}>Khối {n}</option>
                    ))}
                  </select>
                </FieldBig>
                <div className="sm:col-span-2">
                  <FieldBig label="Chủ đề">
                    <select
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-4 h-12 sm:h-14 text-base text-white font-medium focus:outline-none focus:border-[hsl(245,85%,65%)]/60 focus:bg-black/40"
                      disabled={topicsLoading}
                    >
                      <option value="__all__">
                        {topicsLoading ? "Đang tải chủ đề…" : "Tất cả chủ đề"}
                      </option>
                      {availableTopics.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </FieldBig>
                  {availableTopics.length > 0 && formData.topic === "__all__" && (
                    <p className="text-xs text-white/35 mt-1.5">{availableTopics.length} chủ đề có sẵn</p>
                  )}
                  {stats?.weakTopics && stats.weakTopics.length > 0 && formData.topic === "__all__" && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-xs text-amber-400/80 font-medium">💪 Chủ đề yếu:</span>
                      {stats.weakTopics.slice(0, 3).map((wt) => (
                        <button
                          key={wt}
                          type="button"
                          onClick={() => {
                            if (availableTopics.includes(wt)) {
                              setFormData({ ...formData, topic: wt })
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            availableTopics.includes(wt)
                              ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/15 cursor-pointer"
                              : "border-white/[0.06] text-white/30 cursor-default"
                          }`}
                        >
                          {wt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <FieldBig label="Loại kiểm tra">
                  <select value={formData.examType} onChange={(e) => setFormData({ ...formData, examType: e.target.value })} className="exam-select-big">
                    {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </FieldBig>
                <div className="grid grid-cols-2 gap-3">
                  <FieldBig label="Số câu">
                    <input
                      type="number"
                      value={formData.questionCount}
                      onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) || 10 })}
                      min={5}
                      max={100}
                      className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-4 h-12 sm:h-14 text-base text-white font-bold tabular-nums focus:outline-none focus:border-[hsl(245,85%,65%)]/60 focus:bg-black/40"
                    />
                  </FieldBig>
                  <FieldBig label="Phút">
                    <input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 15 })}
                      min={5}
                      max={180}
                      className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-4 h-12 sm:h-14 text-base text-white font-bold tabular-nums focus:outline-none focus:border-[hsl(245,85%,65%)]/60 focus:bg-black/40"
                    />
                  </FieldBig>
                </div>
              </div>

              <button
                onClick={startFromBank}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-4 sm:py-5 px-6 rounded-2xl bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white font-bold text-lg sm:text-xl shadow-[0_8px_32px_rgba(120,100,255,0.35)] hover:shadow-[0_12px_40px_rgba(120,100,255,0.5)] hover:brightness-110 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="h-5 w-5 animate-spin" /> Đang tạo đề…</>
                  : <><Rocket className="h-5 w-5" /> Bắt đầu làm bài</>
                }
              </button>

              <p className="text-xs sm:text-sm text-white/40 text-center leading-relaxed">
                💡 Thiếu câu? AI sẽ tự sinh thêm và{' '}
                <span className="text-purple-300/90 font-medium">lưu cho lần sau</span>.
              </p>
            </div>
          )}

          {/* TAB: Teacher Exams — MUDREAM-style marketplace grid */}
          {activeTab === "teacher" && (
            <div className="space-y-4">
              {teacherExamsLoading ? (
                <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/[0.06] p-12 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-white/30 mx-auto mb-3" />
                  <p className="text-white/55 text-base">Đang tải danh sách đề thi…</p>
                </div>
              ) : (
                <>
                  {teacherExams.length > 0 && (
                    <>
                      {/* Header với toggle hiển thị */}
                      <div className="flex items-center justify-between px-1">
                        <h3 className="font-bold text-white text-lg sm:text-xl flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-[hsl(175,80%,55%)]" />
                          <span>{teacherExams.length} đề từ giáo viên</span>
                        </h3>
                        <div className="text-xs text-white/40">
                          Sắp xếp: <span className="text-white/70 font-medium">Mới nhất</span>
                        </div>
                      </div>

                      {/* Featured row — top 3 mới nhất theo style avatar lớn */}
                      {teacherExams.length >= 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {teacherExams.slice(0, 3).map((ex, idx) => (
                            <FeaturedExamPill
                              key={`feat-${ex.id}`}
                              exam={ex}
                              theme={inferExamTheme(ex, idx)}
                              loading={loading}
                              onStart={() => startFromTeacherExam(ex.id, "exam")}
                            />
                          ))}
                        </div>
                      )}

                      {/* Marketplace grid — Sản phẩm */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                        {teacherExams.map((ex, idx) => {
                          const t = inferExamTheme(ex, idx)
                          const isHot =
                            Date.now() - new Date(ex.createdAt).getTime() < 7 * 86400_000
                          const subject = inferExamSubject(ex.title)
                          return (
                            <div
                              key={ex.id}
                              className="group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.25] hover:-translate-y-0.5 transition-all"
                            >
                              {/* HOT badge */}
                              {isHot && (
                                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black tracking-wider">
                                  HOT
                                </div>
                              )}

                              {/* Top section — gradient + icon glow */}
                              <div
                                className="relative h-24 sm:h-28 flex items-center justify-center"
                                style={{
                                  background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                                }}
                              >
                                {/* Glow blob */}
                                <div
                                  className="absolute inset-0 opacity-50 pointer-events-none"
                                  style={{
                                    background: `radial-gradient(circle at 50% 60%, ${t.from}, transparent 70%)`,
                                  }}
                                />
                                {/* Round icon */}
                                <div
                                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white shadow-2xl"
                                  style={{
                                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), ${t.from} 60%, ${t.to})`,
                                    boxShadow: `0 8px 24px ${t.from}80`,
                                  }}
                                >
                                  <span className="text-2xl sm:text-3xl">{t.emoji}</span>
                                </div>
                              </div>

                              {/* Bottom — info */}
                              <div className="p-3 sm:p-4">
                                <h4
                                  className="font-bold text-white text-sm sm:text-base leading-tight mb-1 line-clamp-2"
                                  title={ex.title}
                                >
                                  {ex.title}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-white/40 mb-2.5 truncate">
                                  {ex.user?.name ? `GV: ${ex.user.name}` : 'AeroEduVision'}
                                </p>
                                {/* Stat chips kiểu DD +18 / FK +64 */}
                                <div className="flex flex-wrap items-center gap-1 mb-3">
                                  <StatBadge label={subject.tag} value={`+${ex.totalQuestions}`} color={t.from} />
                                  <StatBadge label="MIN" value={`+${ex.duration}`} color={t.to} />
                                </div>
                                {/* Price/status row */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                                      style={{ background: t.from }}
                                    >
                                      Đ
                                    </div>
                                    <span className="font-bold text-white text-sm sm:text-base tabular-nums truncate">
                                      {ex.totalScore}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => startFromTeacherExam(ex.id, "exam")}
                                    disabled={loading}
                                    className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-white font-bold text-xs sm:text-sm shadow hover:brightness-110 active:scale-[0.97] transition disabled:opacity-50"
                                    style={{
                                      background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                                      boxShadow: `0 2px 12px ${t.from}50`,
                                    }}
                                    title={`Bắt đầu — ${ex.title}`}
                                  >
                                    <Rocket className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Bắt đầu</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {teacherExams.length === 0 && (
                    <div className="bg-white/[0.02] backdrop-blur-xl rounded-3xl border border-white/[0.06] p-10 sm:p-12 text-center">
                      <GraduationCap className="h-14 w-14 sm:h-16 sm:w-16 text-white/15 mx-auto mb-4" />
                      <h3 className="text-white/85 text-lg sm:text-xl font-bold mb-1">
                        Chưa có đề thi
                      </h3>
                      <p className="text-white/45 text-sm sm:text-base max-w-sm mx-auto">
                        Khi giáo viên công bố đề mới, bạn sẽ thấy tại đây. Trong lúc đợi, thử
                        {' '}<button onClick={() => setActiveTab("bank")} className="text-purple-300 underline font-medium">luyện tập từ ngân hàng câu hỏi</button>.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── QR scan (collapsed at bottom for less clutter) ─────── */}
          <details className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <summary className="cursor-pointer px-5 py-4 flex items-center justify-between text-white/80 font-semibold text-base hover:bg-white/[0.04]">
              <span className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-300" />
                Quét QR để mở trên điện thoại
              </span>
              <span className="text-xs text-white/40">Hiện</span>
            </summary>
            <div className="p-5 pt-0">
              <QuickScanQr
                accent="emerald"
                title="Quét QR để làm đề ngay trên điện thoại"
                description="Mở camera điện thoại quét QR là vào thẳng trang ôn thi — không cần gõ link."
                downloadName="examprep-qr.png"
              />
            </div>
          </details>

          {/* Weak topics warning — filter ra các topic markers nội bộ */}
          {stats && (() => {
            const INTERNAL_TOPICS = new Set([
              'wayground-import', 'latex-import', 'pdf-import',
              'ai-generated', 'manual', 'unknown', '',
            ])
            const cleanTopics = (stats.weakTopics ?? []).filter(
              (t) => t && !INTERNAL_TOPICS.has(String(t).toLowerCase())
            )
            if (cleanTopics.length === 0) return null
            return (
            <div className="bg-red-500/5 backdrop-blur-xl rounded-2xl border border-red-500/10 p-5">
              <h3 className="font-semibold text-red-400 text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Chủ đề cần ôn tập
              </h3>
              <div className="flex flex-wrap gap-2">
                {cleanTopics.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs border border-red-500/15">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            )
          })()}

          {/* Community Stats */}
          <CommunityStatsPanel
            stats={communityStats}
            loading={communityLoading}
            onRefresh={() => refetchCommunity()}
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Community Stats Panel ─────────────────────────── */
function CommunityStatsPanel({
  stats,
  loading,
  onRefresh,
}: {
  stats: ExamCommunityStats | undefined
  loading: boolean
  onRefresh: () => void
}) {
  const medalColor = (rank: number) =>
    rank === 0 ? "text-yellow-300"
      : rank === 1 ? "text-slate-300"
      : rank === 2 ? "text-amber-500"
      : "text-white/30"

  const isEmpty = useMemo(
    () => !stats || stats.totalAttempts === 0,
    [stats],
  )

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white/90 flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(245,85%,70%)]" />
            Thống Kê Cộng Đồng
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            {stats?.updatedAt
              ? `Cập nhật ${formatRelativeTime(stats.updatedAt)}`
              : "Dữ liệu tham khảo từ các học sinh đã làm bài"}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-40"
          title="Tải lại"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/30 mx-auto mb-2" />
          <p className="text-xs text-white/40">Đang tải thống kê cộng đồng…</p>
        </div>
      ) : isEmpty ? (
        <div className="py-8 text-center">
          <Sparkles className="h-10 w-10 text-white/15 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Chưa có học sinh nào làm bài</p>
          <p className="text-white/30 text-xs mt-0.5">Hãy là người đầu tiên lên bảng xếp hạng!</p>
        </div>
      ) : stats ? (
        <div className="space-y-5">
          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryTile label="Tổng lượt làm" value={(stats.totalAttempts ?? 0).toLocaleString("vi-VN")} />
            <SummaryTile label="Học sinh tham gia" value={(stats.totalUsers ?? 0).toLocaleString("vi-VN")} />
            <SummaryTile label="Điểm TB cộng đồng" value={`${stats.averagePercentage ?? 0}%`} />
          </div>

          {/* Leaderboard */}
          {(stats.leaderboard?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Medal className="h-3.5 w-3.5 text-yellow-400" /> Bảng xếp hạng điểm cao
              </h4>
              <div className="rounded-xl border border-white/[0.05] overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Học sinh</div>
                  <div className="col-span-3">Môn / Loại đề</div>
                  <div className="col-span-2 text-right">Điểm</div>
                  <div className="col-span-1 text-right">%</div>
                </div>
                {(stats.leaderboard ?? []).map((row, idx) => (
                  <div
                    key={`${row.userName}-${row.completedAt}-${idx}`}
                    className="grid grid-cols-12 gap-2 px-3 py-2.5 border-t border-white/[0.04] text-sm items-center"
                  >
                    <div className={`col-span-1 font-bold ${medalColor(idx)}`}>#{idx + 1}</div>
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      {row.userImage ? (
                        <img src={row.userImage} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] text-white/50">
                          {row.userName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white/80 text-xs truncate">{row.userName}</span>
                    </div>
                    <div className="col-span-3 text-white/50 text-xs truncate">
                      {row.subject}
                      <span className="text-white/25"> · </span>
                      {row.examType}
                    </div>
                    <div className="col-span-2 text-right text-white/60 text-xs">
                      {row.score}/{row.total}
                    </div>
                    <div className={`col-span-1 text-right text-xs font-semibold ${
                      row.percentage >= 80 ? "text-green-400"
                      : row.percentage >= 60 ? "text-yellow-400"
                      : "text-red-400"
                    }`}>
                      {row.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribution grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(stats.bySubject?.length ?? 0) > 0 && (
              <DistributionCard
                title="Môn học được luyện nhiều nhất"
                items={(stats.bySubject ?? []).slice(0, 6).map((b) => ({
                  label: b.subject,
                  count: b.count,
                  extra: `TB ${b.avgPercentage}%`,
                }))}
              />
            )}
            {(stats.byExamType?.length ?? 0) > 0 && (
              <DistributionCard
                title="Loại đề phổ biến"
                items={(stats.byExamType ?? []).slice(0, 6).map((b) => ({
                  label: b.examType,
                  count: b.count,
                  extra: `TB ${b.avgPercentage}%`,
                }))}
              />
            )}
          </div>

          {/* Recent activity */}
          {(stats.recentActivity?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                Hoạt động gần đây
              </h4>
              <div className="space-y-1.5">
                {(stats.recentActivity ?? []).slice(0, 6).map((row, idx) => (
                  <div
                    key={`${row.userName}-${row.completedAt}-${idx}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {row.userImage ? (
                        <img src={row.userImage} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] text-white/50">
                          {row.userName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white/80 text-xs truncate max-w-[180px]">{row.userName}</span>
                      <span className="text-white/30 text-xs">·</span>
                      <span className="text-white/50 text-xs truncate">{row.subject}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${
                        row.percentage >= 80 ? "text-green-400"
                        : row.percentage >= 60 ? "text-yellow-400"
                        : "text-red-400"
                      }`}>
                        {row.percentage}%
                      </span>
                      <span className="text-[10px] text-white/30">
                        {formatRelativeTime(row.completedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ─── MUDREAM-style helpers cho marketplace grid ────────── */

// Mapping môn → theme color + emoji
const SUBJECT_THEMES: Record<string, {
  tag: string; from: string; to: string; emoji: string;
}> = {
  'vat-ly':   { tag: 'PHY', from: 'hsl(210,90%,55%)', to: 'hsl(245,85%,55%)', emoji: '⚛️' },
  'toan':     { tag: 'MTH', from: 'hsl(280,75%,55%)', to: 'hsl(260,70%,50%)', emoji: '∑'  },
  'hoa':      { tag: 'CHM', from: 'hsl(145,65%,45%)', to: 'hsl(170,75%,40%)', emoji: '⚗️' },
  'sinh':     { tag: 'BIO', from: 'hsl(95,60%,45%)',  to: 'hsl(120,55%,40%)', emoji: '🌱' },
  'van':      { tag: 'LIT', from: 'hsl(25,90%,55%)',  to: 'hsl(15,85%,50%)',  emoji: '📚' },
  'anh':      { tag: 'ENG', from: 'hsl(345,80%,55%)', to: 'hsl(320,75%,50%)', emoji: 'A'  },
  'su':       { tag: 'HIS', from: 'hsl(30,75%,50%)',  to: 'hsl(20,75%,45%)',  emoji: '🏛'  },
  'dia':      { tag: 'GEO', from: 'hsl(195,80%,45%)', to: 'hsl(175,80%,40%)', emoji: '🌍' },
  'tin':      { tag: 'CSC', from: 'hsl(218,55%,45%)', to: 'hsl(230,55%,40%)', emoji: '💻' },
  'default':  { tag: 'EXM', from: 'hsl(262,83%,58%)', to: 'hsl(280,75%,50%)', emoji: '📝' },
}

function inferExamSubject(title: string) {
  const t = title.toLowerCase()
  if (/vật\s*l[ýyi]|physics/i.test(t)) return SUBJECT_THEMES['vat-ly']
  if (/toán|maths?/i.test(t))           return SUBJECT_THEMES['toan']
  if (/hóa|hoá|chemistry/i.test(t))     return SUBJECT_THEMES['hoa']
  if (/sinh|biology/i.test(t))          return SUBJECT_THEMES['sinh']
  if (/văn|literature/i.test(t))        return SUBJECT_THEMES['van']
  if (/tiếng\s*anh|english/i.test(t))   return SUBJECT_THEMES['anh']
  if (/lịch\s*sử|history/i.test(t))     return SUBJECT_THEMES['su']
  if (/địa\s*l[ýyi]|geography/i.test(t)) return SUBJECT_THEMES['dia']
  if (/tin\s*học|computer/i.test(t))    return SUBJECT_THEMES['tin']
  return SUBJECT_THEMES['default']
}

function inferExamTheme(ex: { title: string }, fallbackIdx: number) {
  const found = inferExamSubject(ex.title)
  if (found !== SUBJECT_THEMES['default']) return found
  // Rotate qua 5 màu fallback nếu không detect được môn
  const rot = [
    SUBJECT_THEMES['default'],
    SUBJECT_THEMES['vat-ly'],
    SUBJECT_THEMES['hoa'],
    SUBJECT_THEMES['van'],
    SUBJECT_THEMES['anh'],
  ]
  return rot[fallbackIdx % rot.length]
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span
      className="inline-flex items-baseline gap-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md border"
      style={{
        background: `${color}15`,
        borderColor: `${color}30`,
        color: 'white',
      }}
    >
      <span className="text-white/60 font-semibold">{label}</span>
      <span style={{ color }}>{value}</span>
    </span>
  )
}

function FeaturedExamPill({
  exam, theme, loading, onStart,
}: {
  exam: TeacherExam
  theme: typeof SUBJECT_THEMES['default']
  loading: boolean
  onStart: () => void
}) {
  return (
    <button
      onClick={onStart}
      disabled={loading}
      className="group relative overflow-hidden text-left rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.2] transition-all p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 disabled:opacity-50"
    >
      {/* Round avatar with glow */}
      <div
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 text-white"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), ${theme.from} 60%, ${theme.to})`,
          boxShadow: `0 0 18px ${theme.from}AA`,
        }}
      >
        <span className="text-xl sm:text-2xl">{theme.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs font-bold text-white truncate uppercase">
          {exam.title}
        </p>
        <p className="text-[10px] text-white/55 truncate mt-0.5">
          {exam.user?.name || 'GV ẩn danh'}
        </p>
        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-semibold text-white/70">
          {exam.totalQuestions} câu · {exam.duration}p
        </div>
      </div>
    </button>
  )
}

function StatTile({
  icon, value, label, accent,
}: { icon: React.ReactNode; value: string; label: string; accent: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3 sm:p-5 text-center hover:border-white/[0.15] transition-all"
      style={{ boxShadow: `inset 0 0 0 0 ${accent}` }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent, opacity: 0.7 }}
      />
      <div className="flex items-center justify-center mb-1.5 sm:mb-2" style={{ color: accent }}>
        {icon}
      </div>
      <div className="text-2xl sm:text-3xl font-black text-white leading-none tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-xs text-white/45 uppercase tracking-wider mt-1 sm:mt-1.5 font-semibold">{label}</div>
    </div>
  )
}

function FieldBig({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-white/60 text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs sm:text-sm bg-white/[0.05] px-2.5 py-1 rounded-md text-white/80 font-medium">
      {children}
    </span>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-center">
      <div className="text-lg font-bold text-white/90">{value}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

function DistributionCard({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; count: number; extra?: string }>
}) {
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/75 truncate">{it.label}</span>
              <span className="text-white/40 tabular-nums">
                {it.count} lượt{it.extra ? ` · ${it.extra}` : ""}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)]"
                style={{ width: `${Math.max(4, Math.round((it.count / max) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
