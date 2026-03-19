"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Clock, Loader2, Send, CheckCircle2, AlertTriangle,
  ChevronLeft, ChevronRight, BookOpen, Hash, PenLine, Timer,
  FileText, User, Shield, CalendarClock, Zap, Trophy,
} from "lucide-react"
import { toast } from "react-hot-toast"

type QType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY"

interface ExamQuestion {
  id: string
  position: number
  questionType: string
  points: number
  content: string
  options: string[]
}

interface RoomInfo {
  id: string
  name: string
  description?: string
  duration: number
  status: string
  startTime: string
  endTime: string
  accessCode?: string
  teacherName: string
  instructions?: string
}

const PART_LABELS: Record<QType, { roman: string; title: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  MCQ: { roman: "I", title: "Trắc nghiệm", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800", icon: CheckCircle2 },
  TRUE_FALSE: { roman: "II", title: "Đúng / Sai", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", icon: Hash },
  SHORT_ANSWER: { roman: "III", title: "Trả lời ngắn", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", icon: PenLine },
  ESSAY: { roman: "IV", title: "Tự luận", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200 dark:border-violet-800", icon: BookOpen },
}
const PART_ORDER: QType[] = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"]

export default function TakeExamPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const roomId = params?.id

  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [isTeacher, setIsTeacher] = useState(false)
  const [participantStatus, setParticipantStatus] = useState<string | null>(null)

  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [viewMode, setViewMode] = useState<"sheet" | "single">("sheet")

  interface NextSchedule {
    id: string
    label: string | null
    activeFrom: string
    activeTo: string
    isActive: boolean
    examTitle: string
    examQuestions: number
  }
  const [nextSchedules, setNextSchedules] = useState<NextSchedule[]>([])
  const [countdownToNext, setCountdownToNext] = useState<number>(0)
  const nextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadExam = useCallback(async () => {
    if (!roomId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/online-exam-room/${roomId}/take`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Không thể tải đề thi")

      setRoom(data.data.examRoom)
      setQuestions(data.data.questions)
      setIsTeacher(data.data.isTeacher)
      setParticipantStatus(data.data.participantStatus)
      if (data.data.savedAnswers) setAnswers(data.data.savedAnswers)
      if (data.data.participantStatus === "submitted") {
        setSubmitted(true)
        if (data.data.participantScore !== null && data.data.participantScore !== undefined) {
          setScore(data.data.participantScore)
        }
      }
      if (data.data.nextSchedules) setNextSchedules(data.data.nextSchedules)

      const dur = data.data.examRoom.duration * 60
      setSecondsLeft(dur)
    } catch (e: any) {
      toast.error(e.message || "Lỗi tải đề thi")
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => { void loadExam() }, [loadExam])

  useEffect(() => {
    if (submitted || loading || secondsLeft <= 0) return
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [submitted, loading, secondsLeft])

  useEffect(() => {
    if (secondsLeft === 0 && !submitted && !loading && questions.length > 0) {
      void handleSubmit(true)
    }
  }, [secondsLeft])

  const nearestSchedule = nextSchedules.length > 0 ? nextSchedules[0] : null

  useEffect(() => {
    if (!nearestSchedule || !submitted) {
      setCountdownToNext(0)
      return
    }
    const target = new Date(nearestSchedule.activeFrom).getTime()
    const calc = () => Math.max(0, Math.floor((target - Date.now()) / 1000))
    setCountdownToNext(calc())

    nextTimerRef.current = setInterval(() => {
      const remaining = calc()
      setCountdownToNext(remaining)
      if (remaining <= 0) {
        clearInterval(nextTimerRef.current!)
      }
    }, 1000)
    return () => { if (nextTimerRef.current) clearInterval(nextTimerRef.current) }
  }, [nearestSchedule, submitted])

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    const pad = (n: number) => String(n).padStart(2, "0")
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
    return `${pad(m)}:${pad(s)}`
  }

  const setAnswer = (qId: string, value: string) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  const handleSubmit = async (auto = false) => {
    if (submitted) return
    if (!auto && !confirm("Bạn chắc chắn muốn nộp bài?")) return
    setSubmitting(true)
    try {
      const payload = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }))
      const res = await fetch(`/api/online-exam-room/${roomId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitted(true)
      setScore(data.data?.score ?? null)
      if (timerRef.current) clearInterval(timerRef.current)
      toast.success(auto ? "Hết giờ — Bài đã được nộp tự động" : "Đã nộp bài thành công!")
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi nộp bài")
    } finally {
      setSubmitting(false)
    }
  }

  const grouped = useMemo(() => {
    const g: Record<QType, ExamQuestion[]> = { MCQ: [], TRUE_FALSE: [], SHORT_ANSWER: [], ESSAY: [] }
    for (const q of questions) {
      const t = (q.questionType || "MCQ") as QType
      if (g[t]) g[t].push(q)
      else g.MCQ.push(q)
    }
    return g
  }, [questions])

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  const isUrgent = secondsLeft > 0 && secondsLeft <= 300

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-muted-foreground">Đang tải đề thi...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Không tìm thấy phòng thi</h2>
          <p className="text-sm text-muted-foreground mb-4">Phòng thi không tồn tại hoặc bạn chưa được phép tham gia.</p>
          <button onClick={() => router.push("/teacher/online-exam-room")}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Quay lại</button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <FileText className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Phòng thi chưa có câu hỏi</h2>
          <p className="text-sm text-muted-foreground">
            Phòng &quot;{room.name}&quot; chưa được gắn đề thi hoặc đề thi không có câu hỏi nào.
          </p>
          {isTeacher && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Bạn là giáo viên — hãy xoá phòng này và tạo lại, nhớ chọn đề thi khi tạo phòng.
            </p>
          )}
          <button onClick={() => router.push("/teacher/online-exam-room")}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Quay lại</button>
        </div>
      </div>
    )
  }

  if (submitted) {
    const totalPoints = questions.reduce((s, q) => s + q.points, 0)

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Đã nộp bài!</h1>
            <p className="text-muted-foreground mt-1">{room.name}</p>
          </div>

          {/* Score card */}
          {score !== null && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-6 text-center">
              <Trophy className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Điểm của bạn</p>
              <p className="text-5xl font-black text-emerald-700 dark:text-emerald-400">
                {score}<span className="text-2xl text-emerald-500/60">/{totalPoints}</span>
              </p>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>Trả lời: {answeredCount}/{questions.length} câu</span>
                <span>·</span>
                <span>Tỉ lệ: {totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0}%</span>
              </div>
            </div>
          )}

          {/* Next schedule */}
          {nearestSchedule && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-foreground">Lịch thi tiếp theo</span>
              </div>

              <div className="rounded-xl bg-white/70 dark:bg-black/20 border border-amber-200/50 dark:border-amber-800/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-foreground text-sm">
                    {nearestSchedule.label || nearestSchedule.examTitle}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {nearestSchedule.examQuestions} câu
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(nearestSchedule.activeFrom).toLocaleString("vi-VN", {
                      weekday: "long", day: "2-digit", month: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Countdown */}
              {countdownToNext > 0 ? (
                <div className="text-center py-2">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider mb-2">
                    Bắt đầu sau
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {(() => {
                      const h = Math.floor(countdownToNext / 3600)
                      const m = Math.floor((countdownToNext % 3600) / 60)
                      const s = countdownToNext % 60
                      const pad = (n: number) => String(n).padStart(2, "0")
                      const blocks = h > 0
                        ? [{ v: pad(h), l: "Giờ" }, { v: pad(m), l: "Phút" }, { v: pad(s), l: "Giây" }]
                        : [{ v: pad(m), l: "Phút" }, { v: pad(s), l: "Giây" }]
                      return blocks.map((b, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <span className={`text-3xl font-black font-mono tabular-nums ${
                            countdownToNext <= 300
                              ? "text-red-600 dark:text-red-400 animate-pulse"
                              : "text-amber-700 dark:text-amber-300"
                          }`}>{b.v}</span>
                          <span className="text-[9px] text-muted-foreground font-medium mt-0.5">{b.l}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm animate-pulse">
                    <Zap className="w-4 h-4" /> Đã đến giờ thi!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All upcoming schedules list */}
          {nextSchedules.length > 1 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Các ca thi khác</p>
              {nextSchedules.slice(1).map(sch => (
                <div key={sch.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{sch.label || sch.examTitle}</p>
                    <p className="text-[10px] text-muted-foreground">{sch.examQuestions} câu</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-3">
                    {new Date(sch.activeFrom).toLocaleString("vi-VN", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => router.push("/teacher/online-exam-room")}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header with timer */}
      <div className={`sticky top-0 z-30 border-b transition-colors ${
        isUrgent ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : "bg-card border-border"
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/teacher/online-exam-room")}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">{room.name}</h1>
              <p className="text-[10px] text-muted-foreground">{room.teacherName} · {questions.length} câu</p>
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-lg font-black ${
            isUrgent
              ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse"
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          }`}>
            <Timer className="w-4 h-4" />
            {formatTime(secondsLeft)}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {answeredCount}/{questions.length}
            </span>
            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button onClick={() => setViewMode("sheet")}
                className={`px-2 py-1 text-[10px] font-medium ${viewMode === "sheet" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                Phiếu
              </button>
              <button onClick={() => setViewMode("single")}
                className={`px-2 py-1 text-[10px] font-medium ${viewMode === "single" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                Từng câu
              </button>
            </div>
            <button onClick={() => void handleSubmit(false)} disabled={submitting}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Nộp bài
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {viewMode === "sheet" ? (
          <SheetView
            grouped={grouped}
            answers={answers}
            setAnswer={setAnswer}
          />
        ) : (
          <SingleView
            questions={questions}
            currentQ={currentQ}
            setCurrentQ={setCurrentQ}
            answers={answers}
            setAnswer={setAnswer}
          />
        )}
      </div>

      {/* Bottom answer map */}
      <div className="sticky bottom-0 bg-card border-t border-border py-2 px-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] text-muted-foreground shrink-0 font-medium mr-1">Bản đồ:</span>
          {questions.map((q, i) => {
            const hasAnswer = !!answers[q.id]?.trim()
            const isCurrent = viewMode === "single" && currentQ === i
            return (
              <button
                key={q.id}
                onClick={() => { setCurrentQ(i); setViewMode("single") }}
                className={`w-7 h-7 rounded text-[10px] font-bold shrink-0 border transition-all ${
                  isCurrent
                    ? "bg-purple-600 text-white border-purple-600"
                    : hasAnswer
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                      : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ───────── SHEET VIEW (phiếu làm bài) ───────── */
function SheetView({ grouped, answers, setAnswer }: {
  grouped: Record<QType, ExamQuestion[]>
  answers: Record<string, string>
  setAnswer: (id: string, v: string) => void
}) {
  let globalIdx = 0
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {PART_ORDER.map(type => {
        const qs = grouped[type]
        if (qs.length === 0) return null
        const cfg = PART_LABELS[type]
        return (
          <div key={type} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
            <div className={`px-5 py-3 ${cfg.bg} flex items-center gap-2`}>
              <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
              <span className="font-bold text-sm text-foreground">PHẦN {cfg.roman} — {cfg.title}</span>
              <span className="text-xs text-muted-foreground">({qs.length} câu)</span>
            </div>
            <div className="divide-y divide-border">
              {qs.map(q => {
                globalIdx++
                const num = globalIdx
                return (
                  <div key={q.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center text-xs font-black ${cfg.color}`}>
                        {num}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{q.content}</p>
                        <span className="text-[10px] text-muted-foreground">{q.points}đ</span>
                      </div>
                    </div>
                    <AnswerInput q={q} value={answers[q.id] || ""} onChange={v => setAnswer(q.id, v)} cfg={cfg} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ───────── SINGLE VIEW (từng câu) ───────── */
function SingleView({ questions, currentQ, setCurrentQ, answers, setAnswer }: {
  questions: ExamQuestion[]
  currentQ: number
  setCurrentQ: (n: number) => void
  answers: Record<string, string>
  setAnswer: (id: string, v: string) => void
}) {
  const q = questions[currentQ]
  if (!q) return null
  const type = (q.questionType || "MCQ") as QType
  const cfg = PART_LABELS[type] || PART_LABELS.MCQ

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center">
      <div className={`w-full rounded-2xl border-2 ${cfg.border} overflow-hidden shadow-sm`}>
        <div className={`px-5 py-3 ${cfg.bg} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
            <span className="text-xs font-bold text-muted-foreground uppercase">Phần {cfg.roman} — {cfg.title}</span>
          </div>
          <span className="text-xs text-muted-foreground">{q.points}đ</span>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className={`shrink-0 w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-sm font-black ${cfg.color}`}>
              {currentQ + 1}
            </span>
            <p className="text-base text-foreground whitespace-pre-wrap pt-1">{q.content}</p>
          </div>
          <AnswerInput q={q} value={answers[q.id] || ""} onChange={v => setAnswer(q.id, v)} cfg={cfg} large />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between w-full mt-6">
        <button
          onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-30 hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" /> Câu trước
        </button>
        <span className="text-sm text-muted-foreground font-medium">
          {currentQ + 1} / {questions.length}
        </span>
        <button
          onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
          disabled={currentQ === questions.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-30 hover:bg-muted"
        >
          Câu sau <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ───────── ANSWER INPUT ───────── */
function AnswerInput({ q, value, onChange, cfg, large }: {
  q: ExamQuestion
  value: string
  onChange: (v: string) => void
  cfg: { color: string; bg: string; border: string }
  large?: boolean
}) {
  const type = (q.questionType || "MCQ") as QType

  if (type === "MCQ") {
    const letters = q.options.map((_, i) => String.fromCharCode(65 + i))
    return (
      <div className={`grid ${large ? "grid-cols-1 gap-3" : "grid-cols-2 gap-2"}`}>
        {q.options.map((opt, i) => {
          const letter = letters[i]
          const selected = value === letter
          return (
            <button
              key={i}
              onClick={() => onChange(letter)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                selected
                  ? `${cfg.border} ${cfg.bg} ring-2 ring-offset-1 ring-purple-400`
                  : "border-border hover:border-purple-200 dark:hover:border-purple-800"
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                selected ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"
              }`}>{letter}</span>
              <span className={`text-sm ${selected ? "font-medium text-foreground" : "text-muted-foreground"}`}>{opt}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (type === "TRUE_FALSE") {
    const parts = ["a", "b", "c", "d"]
    const currentVals = value ? value.split(";").reduce<Record<string, string>>((acc, s) => {
      const [k, v] = s.split(":")
      if (k) acc[k.trim()] = v?.trim() || ""
      return acc
    }, {}) : {}

    const toggle = (label: string, val: string) => {
      const updated = { ...currentVals, [label]: val }
      onChange(parts.map(p => `${p}:${updated[p] || ""}`).join(";"))
    }

    return (
      <div className="grid grid-cols-4 gap-2">
        {parts.map(p => (
          <div key={p} className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">{p})</span>
            <div className="flex gap-1">
              <button
                onClick={() => toggle(p, "Đ")}
                className={`w-9 h-9 rounded-lg text-xs font-black border-2 transition-all ${
                  currentVals[p] === "Đ" ? "bg-emerald-500 border-emerald-500 text-white" : "border-border text-muted-foreground hover:border-emerald-400"
                }`}
              >Đ</button>
              <button
                onClick={() => toggle(p, "S")}
                className={`w-9 h-9 rounded-lg text-xs font-black border-2 transition-all ${
                  currentVals[p] === "S" ? "bg-red-500 border-red-500 text-white" : "border-border text-muted-foreground hover:border-red-400"
                }`}
              >S</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "SHORT_ANSWER") {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Nhập đáp án..."
        className={`w-full px-4 ${large ? "py-3 text-base" : "py-2 text-sm"} border-2 border-border rounded-xl bg-background text-foreground focus:outline-none focus:border-purple-400`}
      />
    )
  }

  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Trình bày lời giải..."
      rows={large ? 8 : 4}
      className={`w-full px-4 py-3 ${large ? "text-base" : "text-sm"} border-2 border-border rounded-xl bg-background text-foreground focus:outline-none focus:border-purple-400 resize-y`}
    />
  )
}
