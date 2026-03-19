"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, FileText, Save, Loader2, Search, PlusCircle,
  ArrowUp, ArrowDown, Trash2, Plus, ChevronDown, ChevronUp,
  CheckCircle2, Hash, PenLine, BookOpen, GripVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"

type PartType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY"

interface EditableExamQuestion {
  id: string
  order: number
  points: number
  questionId: string
  content: string
  options: string[]
  correctAnswer: string
  explanation: string
  questionType: PartType
  tfItems?: { label: string; isTrue: boolean }[]
  isNew?: boolean
}

interface QuestionBankItem {
  id: string
  content: string
  type: string
  subject: string
  grade: string
  difficulty: string
}

const PART_CONFIG = [
  {
    type: "MCQ" as PartType, roman: "I", title: "Trắc nghiệm nhiều lựa chọn",
    short: "MCQ · A/B/C/D",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-800/50",
    accent: "rose",
    icon: CheckCircle2, defaultPoints: 0.25,
  },
  {
    type: "TRUE_FALSE" as PartType, roman: "II", title: "Trắc nghiệm đúng sai",
    short: "Đ/S · 4 ý",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800/50",
    accent: "blue",
    icon: Hash, defaultPoints: 1,
  },
  {
    type: "SHORT_ANSWER" as PartType, roman: "III", title: "Trả lời ngắn",
    short: "Điền đáp án",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800/50",
    accent: "amber",
    icon: PenLine, defaultPoints: 1,
  },
  {
    type: "ESSAY" as PartType, roman: "IV", title: "Tự luận",
    short: "Trình bày lời giải",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-200 dark:border-violet-800/50",
    accent: "violet",
    icon: BookOpen, defaultPoints: 2,
  },
]

function makeId() {
  return `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function newBlankQuestion(type: PartType, defaultPoints: number): EditableExamQuestion {
  return {
    id: makeId(),
    order: 0,
    points: defaultPoints,
    questionId: "",
    content: "",
    options: type === "MCQ" ? ["", "", "", ""] : [],
    correctAnswer: "",
    explanation: "",
    questionType: type,
    tfItems: type === "TRUE_FALSE"
      ? [{ label: "a", isTrue: true }, { label: "b", isTrue: true }, { label: "c", isTrue: false }, { label: "d", isTrue: false }]
      : undefined,
    isNew: true,
  }
}

export default function EditExamPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [subject, setSubject] = useState("Vật lý")
  const [grade, setGrade] = useState("10")
  const [examType, setExamType] = useState("Giữa kỳ")
  const [duration, setDuration] = useState(45)

  const [questions, setQuestions] = useState<EditableExamQuestion[]>([])
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({
    MCQ: true, TRUE_FALSE: true, SHORT_ANSWER: true, ESSAY: true,
  })
  const [showInfo, setShowInfo] = useState(false)

  const [bankLoading, setBankLoading] = useState(false)
  const [bankSearch, setBankSearch] = useState("")
  const [bankFilter, setBankFilter] = useState<PartType | "ALL">("ALL")
  const [bankQuestions, setBankQuestions] = useState<QuestionBankItem[]>([])
  const [addingQuestionId, setAddingQuestionId] = useState<string | null>(null)

  const fetchExam = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/exams/${params.id}`)
      if (!res.ok) throw new Error("Không thể tải đề thi")
      const data = await res.json()
      if (data.success && data.data.exam) {
        const e = data.data.exam
        setTitle(e.title)
        setDescription(e.description || "")
        setSubject(e.subject || "Vật lý")
        setGrade(e.grade || "10")
        setExamType(e.examType || "Giữa kỳ")
        setDuration(e.duration || 45)
        const mapped: EditableExamQuestion[] = Array.isArray(e.examQuestions)
          ? e.examQuestions.map((eq: any, index: number) => {
              const qType = String(eq.question?.questionType || "MCQ") as PartType
              const base: EditableExamQuestion = {
                id: String(eq.id),
                order: Number(eq.order || index + 1),
                points: Number(eq.points || 0),
                questionId: String(eq.questionId || eq.question?.id || ""),
                content: String(eq.question?.content || ""),
                options: Array.isArray(eq.question?.options) ? eq.question.options.map((o: any) => String(o)) : [],
                correctAnswer: String(eq.question?.correctAnswer || ""),
                explanation: String(eq.question?.explanation || ""),
                questionType: qType,
                isNew: false,
              }
              if (qType === "TRUE_FALSE") {
                base.tfItems = parseTfAnswer(base.correctAnswer)
              }
              return base
            })
          : []
        setQuestions(mapped)
      } else {
        throw new Error("Đề thi không tồn tại")
      }
    } catch (error: any) {
      toast.error(error.message || "Không thể tải đề thi")
      router.push("/teacher/exams")
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  const fetchQuestionBank = useCallback(async () => {
    try {
      setBankLoading(true)
      const query = new URLSearchParams({ limit: "50" })
      if (bankSearch.trim()) query.set("search", bankSearch.trim())
      if (subject.trim()) query.set("subject", subject.trim())
      if (grade.trim()) query.set("grade", grade.trim())
      const res = await fetch(`/api/question-bank?${query.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json().catch(() => ({}))
      const list = Array.isArray(data?.questions) ? data.questions : []
      setBankQuestions(list.map((q: any) => ({
        id: String(q.id), content: String(q.content || ""),
        type: String(q.type || q.questionType || "MCQ"),
        subject: String(q.subject || ""), grade: String(q.grade || ""),
        difficulty: String(q.difficulty || ""),
      })))
    } catch {
      setBankQuestions([])
    } finally {
      setBankLoading(false)
    }
  }, [bankSearch, subject, grade])

  useEffect(() => { void fetchExam() }, [fetchExam])
  useEffect(() => {
    const t = setTimeout(() => void fetchQuestionBank(), 300)
    return () => clearTimeout(t)
  }, [fetchQuestionBank])

  const grouped = useMemo(() => {
    const g: Record<PartType, EditableExamQuestion[]> = { MCQ: [], TRUE_FALSE: [], SHORT_ANSWER: [], ESSAY: [] }
    for (const q of questions) {
      const t = q.questionType as PartType
      if (g[t]) g[t].push(q)
      else g.MCQ.push(q)
    }
    return g
  }, [questions])

  const totalPoints = useMemo(() =>
    questions.reduce((s, q) => s + (Number.isFinite(q.points) ? q.points : 0), 0),
  [questions])

  const updateQ = (id: string, patch: Partial<EditableExamQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q))
  }

  const removeQ = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const moveWithinPart = (type: PartType, localIdx: number, dir: -1 | 1) => {
    setQuestions(prev => {
      const partQs = prev.filter(q => q.questionType === type)
      const swapIdx = localIdx + dir
      if (swapIdx < 0 || swapIdx >= partQs.length) return prev
      const idA = partQs[localIdx].id
      const idB = partQs[swapIdx].id
      const globalA = prev.findIndex(q => q.id === idA)
      const globalB = prev.findIndex(q => q.id === idB)
      const next = [...prev]
      ;[next[globalA], next[globalB]] = [next[globalB], next[globalA]]
      return next
    })
  }

  const addBlankQuestion = (type: PartType) => {
    const cfg = PART_CONFIG.find(p => p.type === type)!
    setQuestions(prev => [...prev, newBlankQuestion(type, cfg.defaultPoints)])
  }

  const addFromBank = async (bankItem: QuestionBankItem, targetType?: PartType) => {
    if (questions.some(q => q.questionId === bankItem.id)) {
      toast("Câu hỏi này đã có trong đề")
      return
    }
    try {
      setAddingQuestionId(bankItem.id)
      const res = await fetch(`/api/question-bank/${bankItem.id}`)
      if (!res.ok) throw new Error("Không thể tải chi tiết")
      const data = await res.json().catch(() => ({}))
      const q = data?.question
      if (!q?.id) throw new Error("Không tìm thấy")

      const qType = (targetType || q.type || q.questionType || "MCQ") as PartType
      const cfg = PART_CONFIG.find(p => p.type === qType)!
      const newQ: EditableExamQuestion = {
        id: `bank_${q.id}_${Date.now()}`,
        order: 0, points: cfg.defaultPoints,
        questionId: String(q.id),
        content: String(q.content || ""),
        options: Array.isArray(q.options) ? q.options.map((v: any) => String(v)) : [],
        correctAnswer: String(q.correctAnswer || ""),
        explanation: String(q.explanation || ""),
        questionType: qType,
        isNew: false,
      }
      if (qType === "TRUE_FALSE") newQ.tfItems = parseTfAnswer(newQ.correctAnswer)
      setQuestions(prev => [...prev, newQ])
      toast.success("Đã thêm câu hỏi")
    } catch (e: any) {
      toast.error(e?.message || "Lỗi")
    } finally {
      setAddingQuestionId(null)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Vui lòng nhập tên đề thi"); return }
    setSaving(true)
    try {
      const orderedQuestions = PART_CONFIG.flatMap(cfg => grouped[cfg.type])
      let globalOrder = 0
      const payload = orderedQuestions.map(q => {
        globalOrder++
        let correctAnswer = q.correctAnswer
        if (q.questionType === "TRUE_FALSE" && q.tfItems) {
          correctAnswer = q.tfItems.map(s => `${s.label}:${s.isTrue ? "Đ" : "S"}`).join(";")
        }
        return {
          id: q.isNew ? `new-inline-${q.id}` : q.id,
          questionId: q.isNew ? "" : q.questionId,
          order: globalOrder,
          points: Number.isFinite(q.points) ? q.points : 0,
          content: q.content,
          options: q.options.filter(Boolean),
          correctAnswer,
          explanation: q.explanation,
          questionType: q.questionType,
        }
      })

      const res = await fetch(`/api/exams/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description: description.trim(),
          subject, grade, examType, duration,
          questions: payload,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        toast.success("Đã lưu đề thi thành công!")
        router.push(`/teacher/exams/${params.id}`)
      } else {
        throw new Error(data.error || "Không thể lưu")
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu đề thi")
    } finally {
      setSaving(false)
    }
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

  const filteredBank = bankFilter === "ALL"
    ? bankQuestions
    : bankQuestions.filter(b => b.type === bankFilter)

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 shrink-0">
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Button>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">Chỉnh sửa đề thi</h1>
              <p className="text-xs text-muted-foreground">
                {questions.length} câu · {totalPoints}đ
              </p>
            </div>
          </div>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2 shrink-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5">
        <div className="grid grid-cols-12 gap-5">
          {/* Main content */}
          <div className="col-span-12 xl:col-span-8 space-y-5">
            {/* Exam info toggle */}
            <Card>
              <div
                className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setShowInfo(v => !v)}
              >
                <CardTitle className="text-base">Thông tin đề thi</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs">{title || "Chưa đặt tên"}</span>
                  {showInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              {showInfo && (
                <CardContent className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Tên đề thi *</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Đề kiểm tra giữa kỳ 2 - Vật lý 10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả..." rows={2} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Môn học</Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Vật lý","Toán học","Hóa học","Sinh học","Ngữ văn","Tiếng Anh"].map(s =>
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Khối lớp</Label>
                      <Select value={grade} onValueChange={setGrade}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["10","11","12"].map(g => <SelectItem key={g} value={g}>Lớp {g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Loại đề</Label>
                      <Select value={examType} onValueChange={setExamType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["15 phút","Giữa kỳ","Cuối kỳ","Học kỳ I","Học kỳ II","Khác"].map(t =>
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Thời gian (phút)</Label>
                      <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={5} step={5} />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PART_CONFIG.map(cfg => {
                const qs = grouped[cfg.type]
                const pts = qs.reduce((s, q) => s + q.points, 0)
                return (
                  <div key={cfg.type} className={`rounded-xl border ${cfg.border} p-3 ${cfg.bg}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Phần {cfg.roman}</span>
                    </div>
                    <p className="text-xl font-black text-foreground leading-tight">{qs.length}</p>
                    <p className="text-[10px] text-muted-foreground">{pts}đ · {cfg.short}</p>
                  </div>
                )
              })}
            </div>

            {/* 4 Parts */}
            {PART_CONFIG.map(cfg => {
              const partQs = grouped[cfg.type]
              const isOpen = expandedParts[cfg.type]
              return (
                <div key={cfg.type} className={`rounded-xl border ${cfg.border} bg-card shadow-sm overflow-hidden`}>
                  <div
                    className={`px-4 py-3 ${cfg.bg} flex items-center justify-between cursor-pointer`}
                    onClick={() => setExpandedParts(p => ({ ...p, [cfg.type]: !p[cfg.type] }))}
                  >
                    <div className="flex items-center gap-2">
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                      <span className="font-bold text-sm text-foreground">PHẦN {cfg.roman}</span>
                      <span className="text-xs text-muted-foreground">— {cfg.title} ({partQs.length} câu)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost" size="sm" className={`h-7 text-xs ${cfg.color}`}
                        onClick={e => { e.stopPropagation(); addBlankQuestion(cfg.type) }}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Thêm câu
                      </Button>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-4 space-y-3">
                      {partQs.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          <cfg.icon className={`w-8 h-8 mx-auto mb-2 opacity-20 ${cfg.color}`} />
                          <p className="text-sm">Chưa có câu hỏi · Nhấn &quot;Thêm câu&quot; hoặc kéo từ ngân hàng đề</p>
                        </div>
                      )}

                      {partQs.map((q, localIdx) => (
                        <QuestionEditor
                          key={q.id}
                          q={q}
                          localIdx={localIdx}
                          partSize={partQs.length}
                          cfg={cfg}
                          onUpdate={patch => updateQ(q.id, patch)}
                          onRemove={() => removeQ(q.id)}
                          onMove={dir => moveWithinPart(cfg.type, localIdx, dir)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sidebar — Question bank */}
          <div className="col-span-12 xl:col-span-4">
            <div className="sticky top-20 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ngân hàng câu hỏi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={bankSearch} onChange={e => setBankSearch(e.target.value)}
                      placeholder="Tìm câu hỏi..." className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[{ v: "ALL" as const, label: "Tất cả" }, ...PART_CONFIG.map(c => ({ v: c.type, label: `P.${c.roman}` }))].map(f => (
                      <button
                        key={f.v}
                        onClick={() => setBankFilter(f.v)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          bankFilter === f.v
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >{f.label}</button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="max-h-[65vh] overflow-auto space-y-2 pr-1">
                {bankLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
                  </div>
                ) : filteredBank.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">Không tìm thấy câu hỏi phù hợp.</p>
                ) : (
                  filteredBank.map(item => {
                    const exists = questions.some(q => q.questionId === item.id)
                    const isAdding = addingQuestionId === item.id
                    const itemCfg = PART_CONFIG.find(c => c.type === item.type) || PART_CONFIG[0]
                    return (
                      <div key={item.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                        <div className="flex items-center gap-2 text-[10px]">
                          <Badge variant="outline" className={`${itemCfg.color} text-[10px]`}>
                            P.{itemCfg.roman}
                          </Badge>
                          <span className="text-muted-foreground">{item.subject} · Lớp {item.grade}</span>
                        </div>
                        <p className="text-xs text-foreground line-clamp-3">{item.content}</p>
                        <Button
                          size="sm" className="w-full gap-1.5 h-7 text-xs"
                          onClick={() => addFromBank(item)}
                          disabled={exists || isAdding}
                          variant={exists ? "outline" : "default"}
                        >
                          {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                          {exists ? "Đã có" : "Thêm vào đề"}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseTfAnswer(raw: string): { label: string; isTrue: boolean }[] {
  const defaults = [
    { label: "a", isTrue: true }, { label: "b", isTrue: true },
    { label: "c", isTrue: false }, { label: "d", isTrue: false },
  ]
  if (!raw || !raw.includes(":")) return defaults
  try {
    const items = raw.split(";").map(s => {
      const [label, val] = s.split(":")
      return { label: label.trim(), isTrue: val?.trim() === "Đ" }
    })
    return items.length >= 4 ? items : defaults
  } catch {
    return defaults
  }
}

function QuestionEditor({ q, localIdx, partSize, cfg, onUpdate, onRemove, onMove }: {
  q: EditableExamQuestion
  localIdx: number
  partSize: number
  cfg: typeof PART_CONFIG[number]
  onUpdate: (patch: Partial<EditableExamQuestion>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const isNewBlank = q.isNew && !q.questionId

  return (
    <div className={`rounded-lg border ${isNewBlank ? 'border-dashed' : ''} ${cfg.border} p-3 space-y-3 transition-all`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <span className={`text-xs font-black ${cfg.color}`}>Câu {localIdx + 1}</span>
          {isNewBlank && <Badge variant="outline" className="text-[9px] h-4">Mới</Badge>}
          {!collapsed && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Điểm:</span>
              <input
                type="number" min={0} step={0.25} value={q.points}
                onChange={e => onUpdate({ points: parseFloat(e.target.value) || 0 })}
                className="w-14 text-center text-xs font-bold border border-input rounded px-1 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onMove(-1)} disabled={localIdx === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20">
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={localIdx === partSize - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setCollapsed(v => !v)} className="p-1 text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-red-500">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {collapsed ? (
        <p className="text-xs text-muted-foreground line-clamp-1 pl-6">{q.content || "(chưa nhập nội dung)"}</p>
      ) : (
        <>
          {/* Content */}
          <Textarea
            value={q.content} onChange={e => onUpdate({ content: e.target.value })}
            placeholder="Nhập nội dung câu hỏi..." rows={3} className="text-sm"
          />

          {/* MCQ options */}
          {q.questionType === "MCQ" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Đáp án A, B, C, D</label>
                {q.options.length < 6 && (
                  <button
                    onClick={() => onUpdate({ options: [...q.options, ""] })}
                    className="text-[10px] text-muted-foreground hover:text-foreground underline"
                  >+ thêm lựa chọn</button>
                )}
              </div>
              {q.options.map((opt, oi) => {
                const letter = String.fromCharCode(65 + oi)
                const isCorrect = q.correctAnswer === letter
                return (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdate({ correctAnswer: letter })}
                      className={`w-7 h-7 rounded-md text-xs font-black border-2 transition-all shrink-0 ${
                        isCorrect
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-border text-muted-foreground hover:border-emerald-400"
                      }`}
                    >{letter}</button>
                    <Input value={opt} onChange={e => {
                      const newOpts = [...q.options]; newOpts[oi] = e.target.value
                      onUpdate({ options: newOpts })
                    }} placeholder={`Đáp án ${letter}`} className="text-sm flex-1" />
                    {q.options.length > 2 && (
                      <button onClick={() => {
                        const newOpts = q.options.filter((_, i) => i !== oi)
                        onUpdate({ options: newOpts })
                      }} className="p-1 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* TRUE_FALSE */}
          {q.questionType === "TRUE_FALSE" && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">4 ý nhỏ — Đúng / Sai</label>
              {(q.tfItems || []).map((sub, si) => (
                <div key={si} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5">{sub.label})</span>
                  <button
                    onClick={() => {
                      const items = [...(q.tfItems || [])]
                      items[si] = { ...items[si], isTrue: true }
                      onUpdate({ tfItems: items })
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-full border-2 transition-all ${
                      sub.isTrue ? "bg-emerald-500 border-emerald-500 text-white" : "border-border text-muted-foreground hover:border-emerald-400"
                    }`}
                  >Đ</button>
                  <button
                    onClick={() => {
                      const items = [...(q.tfItems || [])]
                      items[si] = { ...items[si], isTrue: false }
                      onUpdate({ tfItems: items })
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-full border-2 transition-all ${
                      !sub.isTrue ? "bg-red-500 border-red-500 text-white" : "border-border text-muted-foreground hover:border-red-400"
                    }`}
                  >S</button>
                </div>
              ))}
            </div>
          )}

          {/* SHORT_ANSWER */}
          {q.questionType === "SHORT_ANSWER" && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Đáp án đúng</label>
              <Input value={q.correctAnswer} onChange={e => onUpdate({ correctAnswer: e.target.value })}
                placeholder="Nhập đáp án..." className="text-sm" />
            </div>
          )}

          {/* ESSAY */}
          {q.questionType === "ESSAY" && (
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Đáp án mẫu / Hướng dẫn chấm</label>
              <Textarea value={q.correctAnswer} onChange={e => onUpdate({ correctAnswer: e.target.value })}
                placeholder="Rubric, đáp án mẫu, hoặc hướng dẫn chấm..." rows={3} className="text-sm" />
            </div>
          )}

          {/* Explanation */}
          <details className="group">
            <summary className="text-[10px] font-bold text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none">
              Giải thích (tuỳ chọn)
            </summary>
            <Textarea value={q.explanation} onChange={e => onUpdate({ explanation: e.target.value })}
              placeholder="Giải thích đáp án..." rows={2} className="text-sm mt-2" />
          </details>
        </>
      )}
    </div>
  )
}
