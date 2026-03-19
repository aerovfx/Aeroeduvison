"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Clock, Edit, FileText, Loader2, Tag, Save,
  Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, BookOpen,
  PenLine, Hash,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "react-hot-toast"

interface ExamQuestion {
  id: string
  order: number
  points: number
  questionId: string
  question?: {
    id: string
    content: string
    question?: string
    questionType: string
    options?: string[]
    correctAnswer?: string
    explanation?: string
    cognitiveLevel?: string
  }
}

interface ExamDetail {
  id: string
  title: string
  description?: string
  examType: string
  duration: number
  totalQuestions: number
  totalScore?: number
  totalPoints?: number
  status: string
  createdAt: string
  updatedAt: string
  examQuestions?: ExamQuestion[]
}

type PartType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY"

interface InlineQuestion {
  tempId: string
  content: string
  questionType: PartType
  points: number
  options: string[]
  correctAnswer: string
  explanation: string
  subItems?: { label: string; isTrue: boolean }[]
}

const PART_CONFIG: {
  type: PartType
  roman: string
  title: string
  subtitle: string
  color: string
  bgColor: string
  borderColor: string
  darkBorder: string
  icon: typeof FileText
  defaultPoints: number
}[] = [
  {
    type: "MCQ", roman: "I", title: "Trắc nghiệm nhiều lựa chọn",
    subtitle: "A, B, C, D", color: "text-rose-500", bgColor: "bg-rose-50 dark:bg-rose-950/20",
    borderColor: "border-rose-200", darkBorder: "dark:border-rose-900/40",
    icon: CheckCircle2, defaultPoints: 0.25,
  },
  {
    type: "TRUE_FALSE", roman: "II", title: "Trắc nghiệm đúng sai",
    subtitle: "4 ý mỗi câu · Đ/S", color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200", darkBorder: "dark:border-blue-900/40",
    icon: Hash, defaultPoints: 1,
  },
  {
    type: "SHORT_ANSWER", roman: "III", title: "Trả lời ngắn",
    subtitle: "Điền đáp án ngắn", color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200", darkBorder: "dark:border-amber-900/40",
    icon: PenLine, defaultPoints: 1,
  },
  {
    type: "ESSAY", roman: "IV", title: "Tự luận",
    subtitle: "Trình bày lời giải", color: "text-violet-500", bgColor: "bg-violet-50 dark:bg-violet-950/20",
    borderColor: "border-violet-200", darkBorder: "dark:border-violet-900/40",
    icon: BookOpen, defaultPoints: 2,
  },
]

function newInlineQuestion(type: PartType, points: number): InlineQuestion {
  return {
    tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    content: "",
    questionType: type,
    points,
    options: type === "MCQ" ? ["", "", "", ""] : [],
    correctAnswer: "",
    explanation: "",
    subItems: type === "TRUE_FALSE" ? [
      { label: "a", isTrue: true },
      { label: "b", isTrue: true },
      { label: "c", isTrue: false },
      { label: "d", isTrue: false },
    ] : undefined,
  }
}

export default function TeacherExamDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const examId = params?.id

  const [exam, setExam] = useState<ExamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inlineQuestions, setInlineQuestions] = useState<InlineQuestion[]>([])
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({
    MCQ: true, TRUE_FALSE: true, SHORT_ANSWER: true, ESSAY: true,
  })

  const loadExam = useCallback(async () => {
    if (!examId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/exams/${examId}`)
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || !payload.success) throw new Error(payload?.error || "Không thể tải đề thi")
      setExam(payload.data?.exam ?? payload)
    } catch (error: any) {
      toast.error(error?.message || "Không thể tải đề thi")
      setExam(null)
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => { void loadExam() }, [loadExam])

  const groupedQuestions = useCallback(() => {
    const groups: Record<PartType, ExamQuestion[]> = {
      MCQ: [], TRUE_FALSE: [], SHORT_ANSWER: [], ESSAY: [],
    }
    for (const eq of exam?.examQuestions ?? []) {
      const type = (eq.question?.questionType || "MCQ") as PartType
      if (groups[type]) groups[type].push(eq)
      else groups.MCQ.push(eq)
    }
    return groups
  }, [exam])

  const addInlineQuestion = (type: PartType) => {
    const cfg = PART_CONFIG.find(p => p.type === type)!
    setInlineQuestions(prev => [...prev, newInlineQuestion(type, cfg.defaultPoints)])
  }

  const updateInline = (tempId: string, patch: Partial<InlineQuestion>) => {
    setInlineQuestions(prev => prev.map(q => q.tempId === tempId ? { ...q, ...patch } : q))
  }

  const removeInline = (tempId: string) => {
    setInlineQuestions(prev => prev.filter(q => q.tempId !== tempId))
  }

  const saveNewQuestions = async () => {
    if (inlineQuestions.length === 0) return
    const toSave = inlineQuestions.filter(q => q.content.trim())
    if (toSave.length === 0) {
      toast.error("Vui lòng nhập nội dung cho ít nhất 1 câu hỏi")
      return
    }

    setSaving(true)
    try {
      const existingQuestions = (exam?.examQuestions ?? []).map((eq, i) => ({
        id: eq.id,
        questionId: eq.questionId,
        order: i + 1,
        points: eq.points,
        content: eq.question?.content || eq.question?.question || "",
        options: eq.question?.options || [],
        correctAnswer: eq.question?.correctAnswer || "",
        explanation: eq.question?.explanation || "",
        questionType: eq.question?.questionType || "MCQ",
      }))

      let nextOrder = existingQuestions.length + 1
      const newQuestionsPayload = toSave.map(q => {
        let correctAnswer = q.correctAnswer
        if (q.questionType === "TRUE_FALSE" && q.subItems) {
          correctAnswer = q.subItems.map(s => `${s.label}:${s.isTrue ? "Đ" : "S"}`).join(";")
        }
        return {
          id: `new-inline-${q.tempId}`,
          questionId: "",
          order: nextOrder++,
          points: q.points,
          content: q.content,
          options: q.options.filter(Boolean),
          correctAnswer,
          explanation: q.explanation,
          questionType: q.questionType,
        }
      })

      const allQuestions = [...existingQuestions, ...newQuestionsPayload]

      const res = await fetch(`/api/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exam?.title,
          description: exam?.description,
          examType: exam?.examType,
          duration: exam?.duration,
          questions: allQuestions,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (data.success) {
        toast.success(`Đã thêm ${toSave.length} câu hỏi mới`)
        setInlineQuestions([])
        await loadExam()
      } else {
        throw new Error(data.error || "Không thể lưu")
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu câu hỏi")
    } finally {
      setSaving(false)
    }
  }

  const removeExistingQuestion = async (eqId: string) => {
    if (!confirm("Xoá câu hỏi này khỏi đề?")) return
    setSaving(true)
    try {
      const remaining = (exam?.examQuestions ?? [])
        .filter(eq => eq.id !== eqId)
        .map((eq, i) => ({
          id: eq.id,
          questionId: eq.questionId,
          order: i + 1,
          points: eq.points,
          content: eq.question?.content || eq.question?.question || "",
          options: eq.question?.options || [],
          correctAnswer: eq.question?.correctAnswer || "",
          explanation: eq.question?.explanation || "",
          questionType: eq.question?.questionType || "MCQ",
        }))

      const res = await fetch(`/api/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exam?.title, description: exam?.description,
          examType: exam?.examType, duration: exam?.duration,
          questions: remaining,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        toast.success("Đã xoá câu hỏi")
        await loadExam()
      }
    } catch { toast.error("Lỗi khi xoá") }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-muted-foreground">Đang tải đề thi...</p>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto bg-card rounded-xl border p-6 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">Không tìm thấy đề thi</h2>
          <Button className="mt-4" onClick={() => router.push("/teacher/exams")}>Quay lại</Button>
        </div>
      </div>
    )
  }

  const groups = groupedQuestions()
  const totalPoints = (exam.examQuestions ?? []).reduce((s, eq) => s + (eq.points || 0), 0)
  const inlineByType = (type: PartType) => inlineQuestions.filter(q => q.questionType === type)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/teacher/exams")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Danh sách
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">
                {exam.examType} · {exam.duration} phút · {exam.totalQuestions} câu · {totalPoints}đ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inlineQuestions.length > 0 && (
              <Button onClick={saveNewQuestions} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu {inlineQuestions.filter(q => q.content.trim()).length} câu mới
              </Button>
            )}
            <Button variant="outline" className="gap-2" onClick={() => router.push(`/teacher/exams/${exam.id}/edit`)}>
              <Edit className="w-4 h-4" /> Chỉnh sửa
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {/* Info cards row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PART_CONFIG.map(cfg => {
            const count = groups[cfg.type].length + inlineByType(cfg.type).length
            const pts = groups[cfg.type].reduce((s, eq) => s + (eq.points || 0), 0)
              + inlineByType(cfg.type).reduce((s, q) => s + q.points, 0)
            return (
              <div key={cfg.type} className={`bg-card rounded-xl border ${cfg.borderColor} ${cfg.darkBorder} p-4`}>
                <div className="flex items-center gap-2 mb-1">
                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className="text-xs font-bold text-muted-foreground">PHẦN {cfg.roman}</span>
                </div>
                <p className="text-lg font-black text-foreground">{count} <span className="text-sm font-normal text-muted-foreground">câu</span></p>
                <p className="text-xs text-muted-foreground">{pts}đ · {cfg.title}</p>
              </div>
            )
          })}
        </div>

        {/* 4 Parts */}
        {PART_CONFIG.map(cfg => {
          const existingQs = groups[cfg.type]
          const newQs = inlineByType(cfg.type)
          const isExpanded = expandedParts[cfg.type]
          const total = existingQs.length + newQs.length

          return (
            <div key={cfg.type} className={`bg-card rounded-xl border ${cfg.borderColor} ${cfg.darkBorder} shadow-sm overflow-hidden`}>
              {/* Section header */}
              <div
                className={`px-5 py-3 ${cfg.bgColor} border-b ${cfg.borderColor} ${cfg.darkBorder} flex items-center justify-between cursor-pointer`}
                onClick={() => setExpandedParts(prev => ({ ...prev, [cfg.type]: !prev[cfg.type] }))}
              >
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                  PHẦN {cfg.roman} — {cfg.title}
                  <span className="text-muted-foreground font-normal">({total} câu · {cfg.subtitle})</span>
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost" size="sm"
                    className={`h-7 text-xs ${cfg.color} hover:${cfg.bgColor}`}
                    onClick={(e) => { e.stopPropagation(); addInlineQuestion(cfg.type) }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Thêm câu
                  </Button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-3">
                  {/* Existing questions */}
                  {existingQs.length === 0 && newQs.length === 0 && (
                    <div className="text-center py-6">
                      <cfg.icon className={`w-8 h-8 mx-auto mb-2 ${cfg.color} opacity-30`} />
                      <p className="text-sm text-muted-foreground">Chưa có câu hỏi nào ở phần này</p>
                      <button
                        className={`text-xs ${cfg.color} font-medium mt-2 underline underline-offset-2`}
                        onClick={() => addInlineQuestion(cfg.type)}
                      >
                        + Thêm câu {cfg.title.toLowerCase()} đầu tiên
                      </button>
                    </div>
                  )}

                  {existingQs.map((eq, idx) => (
                    <div key={eq.id} className="rounded-lg border border-border p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className={`font-black ${cfg.color}`}>Câu {idx + 1}</span>
                          <Badge variant="secondary" className="text-[10px]">{eq.points}đ</Badge>
                          {eq.question?.cognitiveLevel && (
                            <Badge variant="outline" className="text-[10px]">{eq.question.cognitiveLevel}</Badge>
                          )}
                        </div>
                        <button
                          onClick={() => removeExistingQuestion(eq.id)}
                          disabled={saving}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {eq.question?.content || eq.question?.question || "Không có nội dung"}
                      </p>
                      {eq.question?.options && eq.question.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {eq.question.options.map((opt, oi) => {
                            const letter = String.fromCharCode(65 + oi)
                            const isCorrect = eq.question?.correctAnswer === letter || eq.question?.correctAnswer === opt
                            return (
                              <div key={oi} className={`text-xs px-2 py-1 rounded ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                                {letter}. {opt} {isCorrect && "✓"}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {eq.question?.correctAnswer && cfg.type !== "MCQ" && (
                        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                          <span className="font-bold">Đáp án:</span> {eq.question.correctAnswer}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Inline new questions */}
                  {newQs.map((q, idx) => (
                    <InlineQuestionForm
                      key={q.tempId}
                      q={q}
                      idx={existingQs.length + idx + 1}
                      cfg={cfg}
                      onChange={(patch) => updateInline(q.tempId, patch)}
                      onRemove={() => removeInline(q.tempId)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Description */}
        {exam.description && (
          <Card>
            <CardHeader><CardTitle>Mô tả</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{exam.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function InlineQuestionForm({
  q, idx, cfg, onChange, onRemove,
}: {
  q: InlineQuestion
  idx: number
  cfg: typeof PART_CONFIG[number]
  onChange: (patch: Partial<InlineQuestion>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className={`rounded-lg border-2 border-dashed ${cfg.borderColor} ${cfg.darkBorder} p-4 ${cfg.bgColor} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black ${cfg.color}`}>Câu {idx} (mới)</span>
          <Badge variant="outline" className="text-[10px]">Chưa lưu</Badge>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">Điểm:</label>
            <input
              type="number" min={0} step={0.25} value={q.points}
              onChange={e => onChange({ points: parseFloat(e.target.value) || 0 })}
              className="w-14 text-center text-sm font-bold border border-input rounded-md px-1 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button onClick={() => setExpanded(v => !v)} className="p-1 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <Textarea
            value={q.content}
            onChange={e => onChange({ content: e.target.value })}
            placeholder="Nhập nội dung câu hỏi..."
            rows={3}
            className="text-sm"
          />

          {q.questionType === "MCQ" && (
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Đáp án (A, B, C, D)</label>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-5">{String.fromCharCode(65 + oi)}.</span>
                  <Input
                    value={opt}
                    onChange={e => {
                      const newOpts = [...q.options]
                      newOpts[oi] = e.target.value
                      onChange({ options: newOpts })
                    }}
                    placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                    className="text-sm flex-1"
                  />
                  <button
                    onClick={() => onChange({ correctAnswer: String.fromCharCode(65 + oi) })}
                    className={`px-2 py-1 text-[10px] font-bold rounded border transition-all ${
                      q.correctAnswer === String.fromCharCode(65 + oi)
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-border text-muted-foreground hover:border-emerald-400"
                    }`}
                  >
                    Đúng
                  </button>
                </div>
              ))}
            </div>
          )}

          {q.questionType === "TRUE_FALSE" && q.subItems && (
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">4 ý nhỏ (a, b, c, d) — Đúng / Sai</label>
              {q.subItems.map((sub, si) => (
                <div key={si} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{sub.label})</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newSubs = [...q.subItems!]
                        newSubs[si] = { ...newSubs[si], isTrue: true }
                        onChange({ subItems: newSubs })
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-full border-2 transition-all ${
                        sub.isTrue
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-border text-muted-foreground hover:border-emerald-400"
                      }`}
                    >Đ</button>
                    <button
                      onClick={() => {
                        const newSubs = [...q.subItems!]
                        newSubs[si] = { ...newSubs[si], isTrue: false }
                        onChange({ subItems: newSubs })
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-full border-2 transition-all ${
                        !sub.isTrue
                          ? "bg-red-500 border-red-500 text-white"
                          : "border-border text-muted-foreground hover:border-red-400"
                      }`}
                    >S</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {q.questionType === "SHORT_ANSWER" && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Đáp án đúng</label>
              <Input
                value={q.correctAnswer}
                onChange={e => onChange({ correctAnswer: e.target.value })}
                placeholder="Nhập đáp án đúng..."
                className="text-sm"
              />
            </div>
          )}

          {q.questionType === "ESSAY" && (
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Đáp án mẫu / Hướng dẫn chấm</label>
              <Textarea
                value={q.correctAnswer}
                onChange={e => onChange({ correctAnswer: e.target.value })}
                placeholder="Nhập đáp án mẫu, rubric, hoặc hướng dẫn chấm..."
                rows={3}
                className="text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Giải thích (tuỳ chọn)</label>
            <Textarea
              value={q.explanation}
              onChange={e => onChange({ explanation: e.target.value })}
              placeholder="Giải thích đáp án..."
              rows={2}
              className="text-sm"
            />
          </div>
        </>
      )}
    </div>
  )
}
