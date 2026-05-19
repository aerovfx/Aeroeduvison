
import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Clock, BookOpen, Trophy, TrendingUp, AlertCircle, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, RotateCcw, FileText,
  GraduationCap, BarChart3, History, Loader2, Search,
  Users, Medal, Sparkles, RefreshCw,
  Rocket, ArrowRight,
} from "lucide-react"
import { toast } from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"

import { examPrepService } from "@/services/examPrep.service"
import { useAuth } from "@/hooks/useAuth"
import { formatRelativeTime } from "@/lib/utils"
import { QuickScanQr } from "@/components/common/QuickScanQr"
import { MathText } from "@/components/common/MathText"
import { DocRef } from "@/components/docs/DocRef"
import { NameStartModal } from "@/components/exam/NameStartModal"
import { GalaxyHero } from "@/components/common/GalaxyHero"
import { LevelXPCard } from "@/components/common/LevelXPCard"
import { RecoDebugBadge } from "@/components/reco/RecoDebugBadge"
import { RecoDebugLayer } from "@/components/reco/RecoDebugLayer"
import { ExportMenu } from "@/components/common/ExportMenu"
import type { SheetData as ExportSheetData } from "@/lib/exportReport"
import { api } from "@/services/api"
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

/** Vietnamese label cho lý do reco (chip nhỏ trên card đề) */
const REASON_LABELS: Record<string, string> = {
  'weak-topic':        '🎯 Phù hợp điểm yếu',
  'peer-engagement':   '👥 Bạn cùng lớp đã làm',
  'recency':           '🆕 Mới ra',
  'difficulty-match':  '⚖ Vừa sức',
}

const selectClass = "w-full rounded-xl bg-black/25 backdrop-blur-sm border border-white/[0.06] px-3 py-2.5 text-sm text-white/85 focus:outline-none focus:border-indigo-400/40 focus:shadow-[0_0_15px_rgba(120,100,255,0.1)]"
const inputClass = "w-full rounded-xl bg-black/25 border border-white/[0.06] px-3 py-2.5 text-sm text-white/85 placeholder-white/30 focus:outline-none focus:border-indigo-400/40"

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
  const navigate = useNavigate()

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

  // Name-picker modal + XP state
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [pendingStart, setPendingStart] = useState<null | (() => void)>(null)
  const [pendingExamTitle, setPendingExamTitle] = useState<string>('')
  const [xpAward, setXpAward] = useState<null | {
    xpEarned: number; isFirstTry: boolean; perfect: boolean;
    totalXp: number; level: number; xpToNext: number; message: string;
  }>(null)
  const [playerName, setPlayerName] = useState<string>(() => {
    try { return sessionStorage.getItem('aero_player_name') || '' } catch { return '' }
  })

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
  const teacherExamsRaw = teacherExamsData?.exams ?? []
  const examMatrices = teacherExamsData?.matrices ?? []

  /* ─── Reco pipeline: rank đề theo personalization ───
   * X For You-style mixer compose 4 source + 3 filter + 5 scorer.
   * - WeakTopicSource ưu tiên đề thuộc topic HS yếu (từ stats.weakTopics)
   * - PeerSource đề có ≥3 HS đã làm
   * - HeuristicScorer kết hợp weak-topic·peer·recency·difficulty·diversity
   * Reorder client-side mỗi khi stats hoặc exam list thay đổi.
   * Trả về Scored<TeacherExam>[] với __reasons cho UI chip.
   */
  const [rankedExams, setRankedExams] = useState<Array<TeacherExam & { __score?: number; __reasons?: string[] }>>([])
  const [rankedMatrices, setRankedMatrices] = useState<Array<ExamMatrixItem & { __score?: number; __reasons?: string[] }>>([])
  useEffect(() => {
    if (teacherExamsRaw.length === 0 && examMatrices.length === 0) {
      setRankedExams([])
      setRankedMatrices([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { rankExams, rankMatrices, buildContext } = await import('@/lib/reco')
        const ctx = buildContext({
          userId: user?.id ?? null,
          userName: user?.name ?? undefined,
          grade: formData.grade,
          weakTopics: stats?.weakTopics ?? [],
        })
        const [ranked, rankedMx] = await Promise.all([
          teacherExamsRaw.length > 0 ? rankExams(teacherExamsRaw, ctx, { topK: 50 }) : Promise.resolve([]),
          examMatrices.length > 0 ? rankMatrices(examMatrices, ctx, { topK: 20 }) : Promise.resolve([]),
        ])
        if (!cancelled) {
          setRankedExams(ranked)
          setRankedMatrices(rankedMx)
        }
      } catch (e) {
        console.warn('[ExamPrep] reco failed, fallback to raw:', e)
        if (!cancelled) {
          setRankedExams(teacherExamsRaw)
          setRankedMatrices(examMatrices)
        }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherExamsRaw.length, examMatrices.length, stats?.weakTopics?.join('|'), user?.id, formData.grade])

  const teacherExams = rankedExams.length > 0 ? rankedExams : teacherExamsRaw
  const matricesDisplay = rankedMatrices.length > 0 ? rankedMatrices : examMatrices

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

  /* ─── Yêu cầu nhập tên trước khi bắt đầu (Wayground-style) ─────
   * Nếu chưa có playerName → mở NameStartModal, lưu xong gọi doStart().
   * Nếu đã có → gọi doStart() luôn.
   */
  const requireName = (examTitle: string, doStart: () => void) => {
    if (playerName && playerName.trim().length >= 2) {
      doStart()
      return
    }
    setPendingExamTitle(examTitle || 'Bài làm')
    setPendingStart(() => doStart)
    setNameModalOpen(true)
  }

  /* ─── Create exam from Question Bank ──────────────── */
  const _startFromBank = async () => {
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
  // Wrapper public — hỏi tên trước rồi mới start
  const startFromBank = () => {
    const examTitle = `${formData.subject} — ${formData.examType}`
    requireName(examTitle, _startFromBank)
  }

  /* ─── Open Teacher Exam in Bộ-GD&ĐT answer sheet UI ───
   * Đề từ giáo viên (đặc biệt từ LaTeX → /teacher/latex-documents)
   * → mở trực tiếp /exam-sheet/:examId (chuẩn Bộ + phiếu tô đáp án).
   * Trước đây mở inline 5-mode picker; giờ navigate thẳng cho gọn. */
  const _startFromTeacherExam = (examId: string, type: "exam" | "matrix") => {
    if (type === "matrix") {
      // Matrix → vẫn dùng inline flow (chưa có sheet UI cho matrix)
      setLoading(true)
      examPrepService.createFromTeacherExam(examId, type)
        .then(p => {
          if (!p) { toast.error("Không tạo được đề từ ma trận"); return }
          setPractice(p)
          setAnswers({})
          setCurrentQ(0)
          setTimeLeft(p.timeLimit * 60)
          setView("taking")
          toast.success(`Đề thi ${p.questions.length} câu đã sẵn sàng!`)
        })
        .catch(err => {
          const msg = err instanceof Error ? err.message : "Không thể tạo đề thi"
          toast.error(msg)
        })
        .finally(() => setLoading(false))
      return
    }
    // Đề công khai từ GV → phiếu tô đáp án Bộ-GD&ĐT
    navigate(`/exam-sheet/${examId}`)
  }
  // Wrapper: hỏi tên trước. Tham số phụ "title" để hiển thị trong modal.
  const startFromTeacherExam = (examId: string, type: "exam" | "matrix", title?: string) => {
    requireName(title || 'Đề từ giáo viên', () => _startFromTeacherExam(examId, type))
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
        // ── Ghi vào reco history + SRS ───────────────────────
        // history: dùng để mixer score `already-mastered` filter + difficulty-match
        // SRS: từng câu sai/đúng được track riêng cho spaced repetition trong AI Tutor
        ;(async () => {
          try {
            const { pushHistory } = await import('@/lib/reco')
            pushHistory({
              examId: practice.id,
              subject: practice.subject,
              percentage: gradeResult.percentage ?? 0,
              completedAt: new Date().toISOString(),
            })
            // SRS: rate từng câu hỏi theo correctness
            const srs = await import('@/lib/srs')
            const details = (gradeResult as any).details || []
            for (const d of details) {
              if (!d?.questionId) continue
              const rating = d.isCorrect ? 5 : 1   // đúng = easy, sai = forget
              srs.recordReview(d.questionId, rating, { subject: practice.subject })
            }
          } catch (e) {
            if (import.meta.env.DEV) console.warn('[reco/srs] push failed:', e)
          }
        })()
        // Cộng XP — chạy fire-and-forget, không chặn UX
        ;(async () => {
          try {
            const { data } = await api.post('/exam-xp/award', {
              examId: practice.id,
              percentage: gradeResult.percentage,
              playerName,
            })
            setXpAward(data)
            if (data?.isFirstTry && data?.xpEarned > 0) {
              toast.success(`✨ +${data.xpEarned} XP! Cấp ${data.level}`, { duration: 4000 })
            }
          } catch (err) {
            // im lặng — không ảnh hưởng UX
            if (import.meta.env.DEV) console.warn('[xp:award] fail', err)
          }
        })()
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
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isUrgent ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" : "bg-indigo-400/10 text-indigo-300 border border-indigo-400/20"}`}>
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
                      ? "bg-cyan-600/20 text-cyan-500 border border-cyan-600/30"
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
                  <span className="px-2 py-0.5 rounded-md bg-indigo-400/10 text-indigo-300 text-xs font-medium">
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
                              ? "border-indigo-400/50 bg-indigo-400/10"
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
                      className="w-full rounded-xl bg-black/25 border border-white/[0.06] px-4 py-3 text-white/85 placeholder-white/30 focus:outline-none focus:border-indigo-400/40 resize-y"
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
              {playerName && <div className="text-base opacity-80 mb-2">🎉 {playerName}</div>}
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

            {/* XP Reward Banner — gamification */}
            {xpAward && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-pink-500/10 to-purple-500/15 border-2 border-amber-500/40 p-5 sm:p-6">
                <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row items-center gap-4">
                  <div className="text-5xl sm:text-6xl flex-shrink-0">
                    {xpAward.perfect ? '🏆' : xpAward.xpEarned > 30 ? '⭐' : '✨'}
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 text-amber-300 font-black text-2xl sm:text-3xl mb-1">
                      {xpAward.isFirstTry ? `+${xpAward.xpEarned} XP` : 'Đã làm rồi'}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                        Cấp {xpAward.level}
                      </span>
                    </div>
                    <p className="text-sm text-white/75 leading-relaxed">
                      {xpAward.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-pink-500"
                          style={{
                            width: `${Math.max(8, Math.round(((xpAward.totalXp % 100) / 100) * 100))}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-white/65 tabular-nums font-semibold">
                        {xpAward.totalXp} XP · còn {xpAward.xpToNext} lên cấp
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center">
                <div className="text-3xl font-bold text-cyan-500">{result.breakdown.correct}</div>
                <div className="text-xs text-white/40 mt-1">Đúng</div>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center">
                <div className="text-3xl font-bold text-red-400">{result.breakdown.incorrect}</div>
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
                  <BarChart3 className="h-5 w-5 text-sky-400" />
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
                <TrendingUp className="h-5 w-5 text-cyan-500" />
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
                onClick={() => { setView("home"); setResult(null); setPractice(null); setAnswers({}); setXpAward(null) }}
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
                    <div className="mt-3 p-3 rounded-lg bg-sky-400/5 border border-sky-400/10">
                      <p className="text-xs text-sky-400">💡 {d.explanation}</p>
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
    const historySheets = (): ExportSheetData[] => {
      if (history.length === 0) return []
      const avg = history.filter(h => h.percentage != null).reduce((s, h) => s + (h.percentage || 0), 0) /
                  Math.max(1, history.filter(h => h.percentage != null).length)
      return [
        {
          name: 'Lịch sử làm bài',
          columns: [
            { key: 'subject',       label: 'Môn' },
            { key: 'grade',         label: 'Lớp' },
            { key: 'examType',      label: 'Loại đề' },
            { key: 'questionCount', label: 'Số câu',   type: 'number' },
            { key: 'score',         label: 'Điểm',     type: 'number' },
            { key: 'percentage',    label: '%',        type: 'number' },
            { key: 'completed',     label: 'Hoàn thành' },
            { key: 'createdAt',     label: 'Tạo lúc',     type: 'date' },
            { key: 'completedAt',   label: 'Nộp bài lúc', type: 'date' },
          ],
          rows: history.map(h => ({
            ...h,
            completed: h.completed ? 'Có' : 'Chưa',
          })),
        },
        {
          name: 'Thống kê cá nhân',
          columns: [
            { key: 'metric', label: 'Chỉ số' },
            { key: 'value',  label: 'Giá trị' },
          ],
          rows: [
            { metric: 'Tổng bài đã làm',     value: history.length },
            { metric: 'Đã hoàn thành',       value: history.filter(h => h.completed).length },
            { metric: 'Điểm trung bình (%)', value: avg.toFixed(1) },
            { metric: 'Cao nhất',            value: Math.max(...history.map(h => h.percentage || 0)) },
          ],
        },
      ]
    }

    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Lịch Sử Làm Bài" description="Xem lại các lần luyện tập trước đây" />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            {history.length > 0 && (
              <div className="flex justify-end">
                <ExportMenu
                  variant="compact"
                  filename={`lich-su-on-thi-${new Date().toISOString().slice(0, 10)}`}
                  getSheets={historySheets}
                  meta={{
                    title: 'Lịch sử ôn thi cá nhân',
                    subtitle: `${user?.name || 'Học sinh'} — AeroEduVision`,
                    authorName: user?.name || undefined,
                  }}
                />
              </div>
            )}
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

          {/* ── Galaxy Hero — Meteor-style cosmic banner ─────────── */}
          <GalaxyHero
            badge={`${greeting}, ${firstName}!`}
            title={<>SẴN SÀNG<br/>CHINH PHỤC ĐỀ?</>}
            description="Chọn 1 đề từ giáo viên hoặc luyện tập từ ngân hàng câu hỏi — mỗi bài làm cộng XP, lên cấp."
            ctaLabel="Bắt đầu ngay"
            ctaTo="#exam-tabs"
            orbEmoji="🪐"
          />

          {/* ── QR Cover Banner — đưa mã QR ra làm hình bìa, hiển thị ngay top ── */}
          <QuickScanQr
            accent="emerald"
            title="Quét QR để mở trang này trên điện thoại"
            description="Mở camera điện thoại quét QR → vào thẳng trang ôn thi. Giáo viên có thể tải PNG để in dán bảng lớp, học sinh nào cũng tham gia nhanh."
            downloadName="examprep-qr.png"
          />

          {/* Level XP card — Meteor "Adelik Fratz" style */}
          <LevelXPCard />

          {/* Anchor để nút CTA scroll xuống */}
          <div id="exam-tabs" />

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
                      className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-4 h-12 sm:h-14 text-base text-white font-medium focus:outline-none focus:border-indigo-400/60 focus:bg-black/40"
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
                      className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-4 h-12 sm:h-14 text-base text-white font-bold tabular-nums focus:outline-none focus:border-indigo-400/60 focus:bg-black/40"
                    />
                  </FieldBig>
                  <FieldBig label="Phút">
                    <input
                      type="number"
                      value={formData.timeLimit}
                      onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 15 })}
                      min={5}
                      max={180}
                      className="w-full rounded-xl bg-black/30 border border-white/[0.08] px-4 h-12 sm:h-14 text-base text-white font-bold tabular-nums focus:outline-none focus:border-indigo-400/60 focus:bg-black/40"
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
                <div className="bg-card backdrop-blur-xl rounded-3xl border p-12 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-base">Đang tải danh sách đề thi…</p>
                </div>
              ) : (
                <>
                  {teacherExams.length > 0 && (
                    <>
                      {/* Header với toggle hiển thị */}
                      <div className="flex items-center justify-between px-1">
                        <h3 className="font-bold text-foreground text-lg sm:text-xl flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-500" />
                          <span>{teacherExams.length} đề từ giáo viên</span>
                        </h3>
                        <div className="text-xs text-muted-foreground">
                          Sắp xếp: <span className="text-foreground/85 font-medium">Mới nhất</span>
                        </div>
                      </div>

                      {/* Task-card style list — full-width row mỗi đề */}
                      <div className="space-y-2.5 sm:space-y-3">
                        {teacherExams.map((ex, idx) => {
                          const t = inferExamTheme(ex, idx)
                          const isHot =
                            Date.now() - new Date(ex.createdAt).getTime() < 7 * 86400_000
                          const subject = inferExamSubject(ex.title)
                          return (
                            <div
                              key={ex.id}
                              className="group rounded-2xl bg-card border hover:border-foreground/20 hover:bg-accent/30 transition-all p-4 sm:p-5"
                            >
                              {/* Top row: time pill (left) · counter chips (right) */}
                              <div className="flex items-center justify-between mb-2.5">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border bg-muted text-xs sm:text-sm text-foreground/80">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="font-medium">{ex.duration} phút</span>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                  {/* Dev-only reco debug badge (?recoDebug=1) */}
                                  <RecoDebugBadge
                                    score={(ex as any).__score}
                                    breakdown={(ex as any).__breakdown}
                                  />
                                  <span className="inline-flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" />
                                    {ex.totalQuestions}
                                  </span>
                                  {/* QR icon attached vào card */}
                                  <span title={`Quét QR — ${ex.title}`}>
                                    <QuickScanQr
                                      variant="compact"
                                      accent="indigo"
                                      title={`Quét QR — ${ex.title}`}
                                      downloadName={`qr-exam-${ex.id}.png`}
                                      targetUrl={`${window.location.origin}/student/exam-prep?startExam=${ex.id}&type=exam`}
                                    />
                                  </span>
                                </div>
                              </div>

                              {/* Title big */}
                              <h4
                                className="font-bold text-foreground text-base sm:text-lg leading-tight mb-3 line-clamp-2"
                                title={ex.title}
                              >
                                {ex.title}
                              </h4>

                              {/* Reason chips từ reco mixer — chỉ render khi có __reasons */}
                              {(ex as any).__reasons && (ex as any).__reasons.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                  {((ex as any).__reasons as string[]).slice(0, 3).map((r) => {
                                    const label = REASON_LABELS[r]
                                    if (!label) return null
                                    return (
                                      <span
                                        key={r}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-200 border border-amber-500/30"
                                        title={`Gợi ý vì: ${label}`}
                                      >
                                        {label}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}

                              {/* Bottom row: badges (left) · Start button (right) */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  {isHot && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-rose-500/30 bg-rose-500/12 text-xs font-bold text-rose-700 dark:text-rose-300">
                                      Mới
                                    </span>
                                  )}
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold"
                                    /* 2026-05-19: color dùng t.from thay vì 'white' hard-coded
                                       → trên light mode tinted bg (${t.from}18 = 9% alpha)
                                       white text invisible; full-saturation t.from readable
                                       cả 2 themes (same-hue contrast). */
                                    style={{
                                      borderColor: `${t.from}50`,
                                      background: `${t.from}18`,
                                      color: t.from,
                                    }}
                                  >
                                    <span>{t.emoji}</span> {subject.tag === 'EXM' ? ex.examType : subject.tag}
                                  </span>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full border bg-muted text-xs text-foreground/85">
                                    {ex.totalScore} điểm
                                  </span>
                                  {ex.user?.name && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full border bg-muted text-xs text-muted-foreground">
                                      GV: {ex.user.name}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => startFromTeacherExam(ex.id, "exam", ex.title)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-lg text-white font-bold text-sm shadow hover:brightness-110 active:scale-[0.97] transition disabled:opacity-50"
                                  style={{
                                    background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                                    boxShadow: `0 2px 12px ${t.from}50`,
                                  }}
                                  title={`Bắt đầu — ${ex.title}`}
                                >
                                  <Rocket className="h-4 w-4" />
                                  Bắt đầu
                                </button>
                              </div>

                              {/* Stack avatar học sinh đã làm + đã được phân công */}
                              {((ex.takers?.length ?? 0) > 0 ||
                                (ex.assignedStudents?.length ?? 0) > 0) && (
                                <TakerAvatarStack
                                  takers={ex.takers ?? []}
                                  totalCount={ex.takerCount ?? ex.takers?.length ?? 0}
                                  assignedStudents={ex.assignedStudents ?? []}
                                  assignedCount={ex.assignedCount ?? 0}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {teacherExams.length === 0 && examMatrices.length === 0 && (
                    <div className="bg-card backdrop-blur-xl rounded-3xl border p-10 sm:p-12 text-center">
                      <GraduationCap className="h-14 w-14 sm:h-16 sm:w-16 text-muted-foreground/40 mx-auto mb-4" />
                      <h3 className="text-foreground text-lg sm:text-xl font-bold mb-1">
                        Chưa có đề thi
                      </h3>
                      <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto">
                        Khi giáo viên công bố đề mới, bạn sẽ thấy tại đây. Trong lúc đợi, thử
                        {' '}<button onClick={() => setActiveTab("bank")} className="text-purple-600 dark:text-purple-300 underline font-medium">luyện tập từ ngân hàng câu hỏi</button>.
                      </p>
                    </div>
                  )}

                  {/* Đề từ ma trận — rank bằng rankMatrices, hiển thị nếu có */}
                  {matricesDisplay.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-foreground text-base sm:text-lg font-bold flex items-center gap-2">
                          📊 Đề từ ma trận ({matricesDisplay.length})
                        </h3>
                        <span className="text-[10px] text-muted-foreground">— random theo cấu trúc GV chọn</span>
                      </div>
                      <div className="space-y-2.5 sm:space-y-3">
                        {matricesDisplay.slice(0, 8).map((mx, idx) => {
                          const t = inferExamTheme({ id: mx.id, title: mx.name, examType: mx.examType } as TeacherExam, idx)
                          return (
                            <div
                              key={mx.id}
                              className="group rounded-2xl bg-card border hover:border-foreground/20 hover:bg-accent/30 transition-all p-4 sm:p-5"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/12 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                                  Ma trận
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <RecoDebugBadge
                                    score={(mx as any).__score}
                                    breakdown={(mx as any).__breakdown}
                                  />
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {mx.duration} phút
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {mx.totalQuestions}
                                  </span>
                                </div>
                              </div>

                              {(mx as any).__reasons && (mx as any).__reasons.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                  {((mx as any).__reasons as string[]).slice(0, 3).map(r => {
                                    const label = REASON_LABELS[r]
                                    if (!label) return null
                                    return (
                                      <span
                                        key={r}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-200 border border-amber-500/30"
                                      >
                                        {label}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}

                              <h4 className="font-bold text-foreground text-base sm:text-lg leading-tight mb-2 line-clamp-2" title={mx.name}>
                                {mx.name}
                              </h4>

                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border bg-muted text-[11px] text-foreground/85">
                                    {mx.subject || 'Đa môn'}
                                  </span>
                                  {mx.user?.name && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border bg-muted text-[11px] text-muted-foreground">
                                      GV: {mx.user.name}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => startFromTeacherExam(mx.id, "matrix", mx.name)}
                                  disabled={loading}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow hover:brightness-110 active:scale-[0.97] transition disabled:opacity-50"
                                  style={{
                                    background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                                  }}
                                >
                                  <Rocket className="h-3.5 w-3.5" />
                                  Bắt đầu
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* QR đã đưa lên đầu trang làm cover — xem trên top */}

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

      {/* Name picker modal (Wayground-style) — hỏi tên trước khi vào đề */}
      <NameStartModal
        open={nameModalOpen}
        onClose={() => { setNameModalOpen(false); setPendingStart(null) }}
        defaultName={user?.name || ''}
        title="Bắt đầu làm bài"
        examTitle={pendingExamTitle}
        subtitle="Tên hiển thị trên bảng xếp hạng cộng đồng"
        onStart={({ name }) => {
          setPlayerName(name)
          setNameModalOpen(false)
          const fn = pendingStart
          setPendingStart(null)
          if (fn) fn()
        }}
      />

      {/* Dev-only RecoDebugLayer — toggle bằng ?recoDebug=1 */}
      <RecoDebugLayer
        title="ExamPrep"
        items={[
          ...rankedExams.map(e => ({ ...e, _kind: 'exam' as const })),
          ...rankedMatrices.map(m => ({ ...m, _kind: 'matrix' as const, title: m.name })),
        ]}
        getTitle={(it) => (it as any).title || (it as any).name || it.id}
        getId={(it) => `${(it as any)._kind}:${it.id}`}
      />
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
      : rank === 1 ? "text-foreground/80"
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
            <Users className="h-5 w-5 text-indigo-400" />
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

/* ─── TakerAvatarStack ────────────────────────────────
 * Hiển thị 2 nhóm học sinh dưới card đề dạng avatar tròn (Slack/Linear style):
 *   1. Takers — đã hoàn thành (avatar gradient màu + chấm score dot)
 *   2. Assigned — được GV phân công nhưng CHƯA làm (avatar gray, no dot)
 * Mỗi avatar có:
 *   - Initial 1-2 chữ từ tên
 *   - Border viền đen mỏng để cách avatar liền kề
 *   - Tooltip native: "Tên — điểm %" (taker) hoặc "Tên — chưa làm" (assigned)
 * Hiển thị tối đa 5 avatar tổng; còn lại gộp thành "+N".
 * Caption dưới hiển thị "X đã làm · Y được phân công".
 */
function TakerAvatarStack({
  takers, totalCount,
  assignedStudents = [], assignedCount = 0,
  maxShown = 5,
}: {
  takers: NonNullable<TeacherExam['takers']>
  totalCount: number
  assignedStudents?: string[]
  assignedCount?: number
  maxShown?: number
}) {
  if (takers.length === 0 && assignedStudents.length === 0) return null
  // Ưu tiên hiển thị takers trước, rồi đến assigned
  const takerSlots = takers.slice(0, maxShown)
  const remainingSlots = Math.max(0, maxShown - takerSlots.length)
  const assignedSlots = assignedStudents.slice(0, remainingSlots)
  const shownTotal = takerSlots.length + assignedSlots.length
  // Tổng cộng cả 2 nhóm chưa hiển thị
  const totalAll = totalCount + assignedCount
  const extra = Math.max(0, totalAll - shownTotal)
  // Caption: gộp 2 con số nếu cả 2 đều > 0
  let caption = ''
  if (totalCount > 0 && assignedCount > 0) {
    caption = `${totalCount} đã làm · ${assignedCount} được phân công`
  } else if (totalCount > 0) {
    caption = totalCount === 1 ? '1 học sinh đã làm' : `${totalCount} học sinh đã làm`
  } else if (assignedCount > 0) {
    caption = assignedCount === 1 ? '1 học sinh được phân công' : `${assignedCount} học sinh được phân công`
  }
  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
      <div className="flex items-center -space-x-2.5">
        {takerSlots.map((t, i) => (
          <TakerAvatar key={`t-${t.name}-${i}`} name={t.name} percentage={t.percentage} />
        ))}
        {assignedSlots.map((name, i) => (
          <AssignedAvatar key={`a-${name}-${i}`} name={name} />
        ))}
        {extra > 0 && (
          <div
            className="relative w-7 h-7 rounded-full border-2 border-black/40 bg-white/[0.08] flex items-center justify-center text-[10px] font-bold text-white/70"
            title={`+${extra} học sinh khác`}
            style={{ zIndex: 0 }}
          >
            +{extra}
          </div>
        )}
      </div>
      {caption && (
        <span className="text-[11px] text-white/45">{caption}</span>
      )}
    </div>
  )
}

function TakerAvatar({ name, percentage }: { name: string; percentage: number }) {
  const initials = getInitials(name)
  const [c1, c2] = colorFromName(name)
  const passed = percentage >= 50
  return (
    <div
      className="relative w-7 h-7 rounded-full border-2 border-black/40 flex items-center justify-center text-[10px] font-bold text-white/95 shadow-sm"
      title={`${name} — ${percentage}%${passed ? '' : ' (chưa đạt)'}`}
      style={{
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        zIndex: 1,
      }}
    >
      {initials}
      {/* Small dot bottom-right: green ≥ 80, amber 50-79, red < 50 */}
      <span
        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black/40"
        style={{
          background:
            percentage >= 80 ? '#22c55e' :
            percentage >= 50 ? '#f59e0b' : '#ef4444',
        }}
      />
    </div>
  )
}

/** Avatar cho học sinh ĐƯỢC PHÂN CÔNG nhưng CHƯA làm.
 *  Visual: gradient mờ (40% opacity của color hash), không có score dot,
 *  thay vào đó là dấu chấm gray nhỏ ở góc → biểu thị "đang chờ làm". */
function AssignedAvatar({ name }: { name: string }) {
  const initials = getInitials(name)
  const [c1, c2] = colorFromName(name)
  return (
    <div
      className="relative w-7 h-7 rounded-full border-2 border-black/40 flex items-center justify-center text-[10px] font-bold text-white/85 shadow-sm"
      title={`${name} — được phân công (chưa làm)`}
      style={{
        // 50% opacity của gradient để phân biệt với takers (sáng full)
        background: `linear-gradient(135deg, ${c1}80, ${c2}80)`,
        zIndex: 1,
      }}
    >
      {initials}
      {/* Gray dot bottom-right để báo "chưa làm" */}
      <span
        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black/40 bg-white/40"
      />
    </div>
  )
}

function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  // Lấy chữ cái đầu của họ + chữ cái đầu của tên
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/** Hash tên → 2 màu HSL cho gradient. Cùng tên = cùng màu (consistent). */
function colorFromName(name: string): [string, string] {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  const h1 = Math.abs(hash) % 360
  const h2 = (h1 + 40) % 360
  return [`hsl(${h1}, 65%, 55%)`, `hsl(${h2}, 70%, 45%)`]
}
