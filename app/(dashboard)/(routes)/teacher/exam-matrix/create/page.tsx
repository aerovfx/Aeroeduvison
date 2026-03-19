"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, Save, Loader2, Sparkles, Info, LayoutGrid,
  Settings2, Check, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MatrixTable, type Topic } from "@/components/exam-matrix/matrix-table"
import { MatrixTypeSelector } from "@/components/exam-matrix/matrix-type-selector"
import { AutoGenerateModal } from "@/components/exam-matrix/auto-generate-modal"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"
import {
  SUBJECTS, GRADES, EXAM_TYPES, MATRIX_TYPES,
  type MatrixSection, type MatrixTypeConfig,
} from "@/lib/constants/question-bank"

// ─── Helper ───────────────────────────────────────────────────────────────────

const FALLBACK_MATRIX_TYPES: MatrixTypeConfig[] = [
  {
    id: "type3",
    name: "Loại 3",
    badge: "3 PHẦN",
    description: "Mặc định hệ thống",
    sections: [
      { key: "TNKQ_Nhiều_lựa_chọn", label: "PHẦN I", sublabel: "(TN 4 lựa chọn)" },
      { key: "TNKQ_Đúng_Sai", label: "PHẦN II", sublabel: "(TN đúng sai)" },
      { key: "Tự_luận", label: "PHẦN III", sublabel: "(Tự luận)" },
    ],
    defaultSectionScores: {
      TNKQ_Nhiều_lựa_chọn: 5,
      TNKQ_Đúng_Sai: 2,
      Tự_luận: 3,
    },
  },
  {
    id: "custom",
    name: "Tuỳ chỉnh",
    badge: "CUSTOM",
    description: "Giáo viên tự cấu hình phần thi và tỉ lệ điểm",
    sections: [],
    defaultSectionScores: {},
  },
]

const MATRIX_TYPE_LIST: MatrixTypeConfig[] =
  Array.isArray(MATRIX_TYPES) && MATRIX_TYPES.length > 0 ? MATRIX_TYPES : FALLBACK_MATRIX_TYPES

const DEFAULT_MATRIX_TYPE: MatrixTypeConfig =
  MATRIX_TYPE_LIST.find((t) => t.id === "type3") ??
  MATRIX_TYPE_LIST.find((t) => t.id !== "custom") ??
  FALLBACK_MATRIX_TYPES[0]

function deriveSections(matrixType: string, customSections: MatrixSection[]): MatrixSection[] {
  if (matrixType === "custom") return customSections
  return MATRIX_TYPE_LIST.find((t) => t.id === matrixType)?.sections ?? DEFAULT_MATRIX_TYPE.sections
}

// Scale preset scores to match a given totalScore
function scaleScores(preset: MatrixTypeConfig, totalScore: number): Record<string, number> {
  const defSum = Object.values(preset.defaultSectionScores).reduce((a, b) => a + b, 0)
  if (defSum === 0) return { ...preset.defaultSectionScores }
  return Object.fromEntries(
    Object.entries(preset.defaultSectionScores).map(([k, v]) => [
      k,
      parseFloat(((v / defSum) * totalScore).toFixed(2)),
    ])
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  subject: string
  grade: string
  examType: string
  duration: number
  totalScore: number
  examInfo: string
  matrixType: string
  customSections: MatrixSection[]
  sectionScores: Record<string, number>
}

// ─── Step 1: Choose matrix type ───────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  type1: <span className="text-xl font-bold">①</span>,
  type2: <span className="text-xl font-bold">②</span>,
  type3: <span className="text-xl font-bold">③</span>,
  custom: <Settings2 className="h-4 w-4" />,
}

function ChooseTypeStep({
  onSelect,
  onBack,
}: {
  onSelect: (type: MatrixTypeConfig) => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="container mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold">Tạo ma trận đề mới</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Bước 1 / 2 — Chọn loại ma trận
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">

          <div className="text-center mb-6">
            <p className="text-muted-foreground text-xs">
              Chọn loại ma trận phù hợp hoặc tự thiết kế theo ý muốn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MATRIX_TYPE_LIST.map((type) => {
              const isCustom = type.id === "custom"
              const colorClass = isCustom ? "border-amber-400/50" : type.id === "type1" ? "border-blue-400/50" : type.id === "type2" ? "border-emerald-400/50" : "border-violet-400/50"
              const iconBgClass = isCustom ? "bg-amber-500" : type.id === "type1" ? "bg-blue-500" : type.id === "type2" ? "bg-emerald-500" : "bg-violet-500"
              const badgeClass = isCustom ? "bg-amber-100 text-amber-700" : type.id === "type1" ? "bg-blue-100 text-blue-700" : type.id === "type2" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
              
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onSelect(type)}
                  className={`group relative flex flex-col text-left rounded-xl border-2 p-4 transition-all hover:border-foreground/30 hover:bg-foreground/[0.02] ${colorClass}`}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBgClass} text-white shrink-0`}>
                      {TYPE_ICONS[type.id]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{type.name}</span>
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${badgeClass}`}>
                          {type.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                  </div>

                  {/* Sections preview */}
                  {isCustom ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/50 text-amber-700 text-[11px]">
                      <Settings2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Tự cấu hình số phần, nhãn tên và tỉ lệ điểm</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {type.sections.map((s, i) => {
                        const sectionColor = i === 0 ? "text-blue-700 bg-blue-50/50 border-blue-200/50" 
                          : i === 1 ? "text-emerald-700 bg-emerald-50/50 border-emerald-200/50" 
                          : i === 2 ? "text-amber-700 bg-amber-50/50 border-amber-200/50" 
                          : "text-purple-700 bg-purple-50/50 border-purple-200/50"
                        return (
                          <div
                            key={s.key}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded border text-[11px] font-medium ${sectionColor}`}
                          >
                            <span className="truncate">
                              {s.label}
                            </span>
                            <span className="font-semibold text-[10px]">
                              {type.defaultSectionScores[s.key]}đ
                            </span>
                          </div>
                        )
                      })}
                      <div className="flex justify-end pt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Tổng: <strong>{Object.values(type.defaultSectionScores).reduce((a, b) => a + b, 0)}đ</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className={`mt-3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-medium transition-opacity ${iconBgClass} text-white`}>
                    {isCustom ? "Tự thiết kế" : "Dùng loại này"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateMatrixPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [step, setStep]             = useState<"choose" | "fill">("choose")
  const [loading, setLoading]       = useState(false)
  const [autoGenerateOpen, setAuto] = useState(false)
  const [topics, setTopics]         = useState<Topic[]>([])
  const [totalQuestions, setTQ]     = useState(0)

  const [form, setForm] = useState<FormData>({
    name: "",
    subject: "Toán",
    grade: "Khối 10",
    examType: "Kiểm tra giữa kỳ",
    duration: 45,
    totalScore: 10,
    examInfo: "",
    matrixType: DEFAULT_MATRIX_TYPE.id,
    customSections: [],
    sectionScores: { ...DEFAULT_MATRIX_TYPE.defaultSectionScores },
  })

  const activeSections = useMemo(
    () => deriveSections(form.matrixType, form.customSections),
    [form.matrixType, form.customSections]
  )

  useEffect(() => {
    setTQ(topics.reduce((sum, t) =>
      sum + t.distributions.reduce((s, d) => s + d.count, 0), 0
    ))
  }, [topics])

  // ── Wizard step 1 handler ──────────────────────────────────────────────────

  const handleChooseType = (type: MatrixTypeConfig) => {
    if (type.id === "custom") {
      // Keep any previously configured custom sections; default to type3 sections
      const defaultSections = form.customSections.length > 0
        ? form.customSections
        : DEFAULT_MATRIX_TYPE.sections
      const defaultScores = Object.keys(form.sectionScores).length > 0
        ? form.sectionScores
        : DEFAULT_MATRIX_TYPE.defaultSectionScores
      setForm((f) => ({ ...f, matrixType: "custom", customSections: defaultSections, sectionScores: defaultScores }))
    } else {
      setForm((f) => ({
        ...f,
        matrixType: type.id,
        customSections: [],
        sectionScores: scaleScores(type, f.totalScore),
      }))
    }
    setStep("fill")
  }

  // ── Topic handlers ────────────────────────────────────────────────────────

  const addTopic = () =>
    setTopics([...topics, {
      id: `topic-${Date.now()}`, order: topics.length + 1,
      topic: "", content: "", soTiet: 0, distributions: [],
    }])

  const deleteTopic = (id: string) =>
    setTopics(topics.filter((t) => t.id !== id).map((t, i) => ({ ...t, order: i + 1 })))

  const updateTopic = (id: string, updates: Partial<Topic>) =>
    setTopics(topics.map((t) => (t.id === id ? { ...t, ...updates } : t)))

  const updateDist = (topicId: string, qType: string, level: string, count: number) => {
    setTopics(topics.map((topic) => {
      if (topic.id !== topicId) return topic
      const idx  = topic.distributions.findIndex(
        (d) => d.questionType === qType && d.cognitiveLevel === level
      )
      const dists = [...topic.distributions]
      if (idx >= 0) {
        count === 0 ? dists.splice(idx, 1) : (dists[idx] = { questionType: qType, cognitiveLevel: level, count })
      } else if (count > 0) {
        dists.push({ questionType: qType, cognitiveLevel: level, count })
      }
      return { ...topic, distributions: dists }
    }))
  }

  const handleAutoGenerateSuccess = (matrixData: any) => {
    setTopics(matrixData.topics.map((t: any, i: number) => ({
      id: `topic-${i}`, order: i + 1, topic: t.topic,
      content: t.content || "", soTiet: t.soTiet ?? 0,
      distributions: t.distributions, percentageScore: t.percentageScore,
    })))
    toast.success("Đã tạo ma trận tự động! Bạn có thể chỉnh sửa thêm nếu cần.")
  }

  // ── Type change (from the selector in step 2) ─────────────────────────────

  const handleTypeChange = (
    matrixType: string,
    sections: MatrixSection[],
    scores: Record<string, number>
  ) => {
    setForm((f) => ({ ...f, matrixType, customSections: sections, sectionScores: scores }))
  }

  const scoreSum = activeSections.reduce((s, sec) => s + (form.sectionScores[sec.key] || 0), 0)
  const scoresOk = Math.abs(scoreSum - form.totalScore) < 0.01

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên ma trận")
    if (topics.length === 0) return toast.error("Vui lòng thêm ít nhất một nội dung")
    for (const t of topics)
      if (!t.topic.trim()) return toast.error(`Vui lòng nhập nội dung cho hàng ${t.order}`)
    if (!scoresOk)
      return toast.error(`Tổng điểm các phần (${scoreSum}) phải bằng tổng điểm toàn bài (${form.totalScore})`)

    setLoading(true)
    try {
      const res = await fetch("/api/exam-matrices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, subject: form.subject, grade: form.grade,
          examType: form.examType, duration: form.duration, totalScore: form.totalScore,
          examInfo: form.examInfo, sectionScores: form.sectionScores,
          matrixType: form.matrixType, customSections: form.customSections,
          topics: topics.map((t) => ({
            order: t.order, topic: t.topic, content: t.content,
            soTiet: t.soTiet ?? 0, distributions: t.distributions,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Failed")
      }
      const data = await res.json()
      toast.success("Đã lưu ma trận thành công")
      router.push(`/teacher/exam-matrix/${data.matrix.id}`)
    } catch (e: any) {
      toast.error(e.message || "Không thể lưu ma trận")
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (step === "choose") {
    return (
      <ChooseTypeStep
        onSelect={handleChooseType}
        onBack={() => router.back()}
      />
    )
  }

  // step === "fill"
  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="border-b px-4 py-3 sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep("choose")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-semibold">Tạo ma trận đề mới</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Bước 2 / 2 — Điền thông tin và nội dung ma trận
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStep("choose")} className="h-8 text-xs">
              ← Đổi loại
            </Button>
            <Button variant="outline" onClick={() => setAuto(true)} className="h-8 text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />Tạo tự động
            </Button>
            <div className="px-2.5 py-1.5 bg-foreground/[0.05] rounded-lg text-center border">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Tổng số câu</div>
              <div className="text-sm font-bold leading-tight">{totalQuestions}</div>
            </div>
            <Button onClick={handleSave} disabled={loading} className="h-8 text-xs">
              {loading
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Đang lưu...</>
                : <><Save className="h-3.5 w-3.5 mr-1.5" />Lưu ma trận</>}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-4 space-y-4">

          {/* ── 1. Loại ma trận ──────────────────────────────────────── */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/[0.02] flex items-center gap-2">
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-[11px] uppercase tracking-wide">
                Loại ma trận
              </span>
            </div>
            <div className="p-4">
              <MatrixTypeSelector
                value={form.matrixType}
                customSections={form.customSections}
                sectionScores={form.sectionScores}
                totalScore={form.totalScore}
                onChange={handleTypeChange}
              />
            </div>
          </div>

          {/* ── 2. Thông tin đề kiểm tra ─────────────────────────────── */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/[0.02] flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold text-[11px] uppercase tracking-wide">
                Thông tin đề kiểm tra
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3">

              <div className="md:col-span-5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Tên ma trận
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: MA TRẬN ĐỀ KIỂM TRA GIỮA KÌ II — VẬT LÍ 10"
                  className="text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Môn học</label>
                <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Khối</label>
                <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Loại đề</label>
                <Select value={form.examType} onValueChange={(v) => setForm({ ...form, examType: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Thời gian (ph)</label>
                <Input type="number" value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} 
                  className="h-9 text-sm" />
              </div>

              <div className="md:col-span-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Tổng điểm</label>
                <Input type="number" step="0.5" value={form.totalScore}
                  onChange={(e) => setForm({ ...form, totalScore: parseFloat(e.target.value) || 0 })} 
                  className="h-9 text-sm" />
              </div>

              <div className="md:col-span-5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Thời điểm kiểm tra
                </label>
                <Input
                  value={form.examInfo}
                  onChange={(e) => setForm({ ...form, examInfo: e.target.value })}
                  placeholder="VD: Kiểm tra giữa học kì II – Tuần 26"
                  className="text-sm"
                />
              </div>

              {activeSections.map((s, i) => {
                const labelColor = i === 0 ? "text-blue-600" : i === 1 ? "text-emerald-600" : i === 2 ? "text-amber-600" : "text-purple-600"
                const inputBorder = i === 0 ? "focus-visible:ring-blue-200" : i === 1 ? "focus-visible:ring-emerald-200" : i === 2 ? "focus-visible:ring-amber-200" : "focus-visible:ring-purple-200"
                return (
                  <div key={s.key} className="md:col-span-2">
                    <label className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 block ${labelColor}`}>
                      Điểm {s.label}
                    </label>
                    <Input
                      type="number" step="0.25" min="0"
                      value={form.sectionScores[s.key] ?? 0}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sectionScores: { ...form.sectionScores, [s.key]: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className={`h-9 text-sm ${inputBorder}`}
                    />
                  </div>
                )
              })}

              <div className="md:col-span-2 flex items-end">
                <div className={`text-[10px] px-2.5 py-1.5 rounded w-full text-center font-medium ${
                  scoresOk ? "bg-green-50 text-green-700 border" : "bg-red-50 text-red-700 border"
                }`}>
                  Tổng: {scoreSum} / {form.totalScore}đ {scoresOk ? "✓" : "✗"}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="rounded-lg bg-muted/[0.03] p-2.5 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Hình thức kiểm tra:</strong>{" "}
                {form.duration} phút — {form.examType}.<br />
                <strong className="text-foreground">Cấu trúc:</strong>{" "}
                {activeSections.map((s) =>
                  `${s.label}. ${s.sublabel.replace(/[()]/g, "").trim()} (${form.sectionScores[s.key] ?? 0}đ)`
                ).join(" · ")}
                {" "}— Tổng: {form.totalScore}đ.
              </div>
            </div>
          </div>

          {/* ── 3. Matrix table ──────────────────────────────────────── */}
          <div className="rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/[0.02] flex items-center justify-between">
              <span className="font-semibold text-[11px] uppercase tracking-wide">
                Bảng năng lực và cấp độ tư duy — Ma trận
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                {["NB = Nhận biết", "TH = Thông hiểu", "VD = Vận dụng"].map((label, i) => {
                  const badgeClass = i === 0 ? "bg-blue-50 text-blue-600" : i === 1 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  return (
                    <span key={i} className={`px-1.5 py-1 rounded font-medium ${badgeClass}`}>{label}</span>
                  )
                })}
              </div>
            </div>
            <div className="p-3">
              <MatrixTable
                sections={activeSections}
                topics={topics}
                totalScore={form.totalScore}
                totalQuestions={totalQuestions}
                sectionScores={form.sectionScores}
                onUpdateTopic={updateTopic}
                onUpdateDistribution={updateDist}
                onDeleteTopic={deleteTopic}
              />
            </div>
          </div>

          <Button variant="outline" onClick={addTopic} className="w-full border-dashed h-9 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />Thêm nội dung
          </Button>

        </div>
      </div>

      <AutoGenerateModal
        isOpen={autoGenerateOpen}
        onClose={() => setAuto(false)}
        onSuccess={handleAutoGenerateSuccess}
        defaultValues={form}
      />
    </div>
  )
}
