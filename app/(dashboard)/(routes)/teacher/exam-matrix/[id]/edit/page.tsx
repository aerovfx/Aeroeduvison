"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plus, Save, Loader2, Info, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { MatrixTable, type Topic } from "@/components/exam-matrix/matrix-table"
import { MatrixTypeSelector } from "@/components/exam-matrix/matrix-type-selector"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"
import {
  SUBJECTS, GRADES, EXAM_TYPES, MATRIX_TYPES,
  type MatrixSection,
} from "@/lib/constants/question-bank"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveSections(matrixType: string, customSections: MatrixSection[]): MatrixSection[] {
  if (matrixType === "custom") return customSections
  return MATRIX_TYPES.find((t) => t.id === matrixType)?.sections ?? MATRIX_TYPES[2].sections
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditMatrixPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const matrixId = params.id as string

  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [topics,  setTopics]    = useState<Topic[]>([])
  const [totalQuestions, setTQ] = useState(0)

  const [form, setForm] = useState<FormData>({
    name: "",
    subject: "Toán",
    grade: "Khối 10",
    examType: "Kiểm tra giữa kỳ",
    duration: 45,
    totalScore: 10,
    examInfo: "",
    matrixType: "type3",
    customSections: [],
    sectionScores: { TNKQ_Nhiều_lựa_chọn: 5, TNKQ_Đúng_Sai: 2, Tự_luận: 3 },
  })

  const activeSections = useMemo(
    () => deriveSections(form.matrixType, form.customSections),
    [form.matrixType, form.customSections]
  )

  // ── Load existing matrix ──────────────────────────────────────────────────

  useEffect(() => {
    if (matrixId && session?.user) fetchMatrix()
  }, [matrixId, session?.user])

  const fetchMatrix = async () => {
    try {
      setLoading(true)
      const res  = await fetch(`/api/exam-matrices/${matrixId}`)
      if (!res.ok) throw new Error("Failed to fetch matrix")
      const data = await res.json()
      const m    = data.matrix

      // Migrate old sectionScores format { phanI, phanII, phanIII } → keyed by section.key
      let scores: Record<string, number>
      if (m.sectionScores && "phanI" in (m.sectionScores as object)) {
        scores = {
          TNKQ_Nhiều_lựa_chọn: (m.sectionScores as any).phanI  ?? 5,
          TNKQ_Đúng_Sai:        (m.sectionScores as any).phanII ?? 2,
          Tự_luận:              (m.sectionScores as any).phanIII ?? 3,
        }
      } else {
        scores = (m.sectionScores as Record<string, number>) ?? { TNKQ_Nhiều_lựa_chọn: 5, TNKQ_Đúng_Sai: 2, Tự_luận: 3 }
      }

      setForm({
        name:           m.name,
        subject:        m.subject  || "Toán",
        grade:          m.grade,
        examType:       m.examType,
        duration:       m.duration  ?? 45,
        totalScore:     m.totalScore ?? 10,
        examInfo:       m.examInfo  || "",
        matrixType:     m.matrixType || "type3",
        customSections: (m.customSections as MatrixSection[]) || [],
        sectionScores:  scores,
      })
      setTopics(
        (m.topics || []).map((t: any) => ({
          id: t.id, order: t.order, topic: t.topic,
          content: t.content || "", soTiet: t.soTiet ?? 0,
          distributions: t.distributions || [],
          percentageScore: t.percentageScore,
        }))
      )
    } catch {
      toast.error("Không thể tải ma trận")
      router.push("/teacher/exam-matrix")
    } finally {
      setLoading(false)
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  useEffect(() => {
    setTQ(topics.reduce((sum, t) =>
      sum + t.distributions.reduce((s, d) => s + d.count, 0), 0
    ))
  }, [topics])

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

  // ── Section score handling ─────────────────────────────────────────────────

  const handleTypeChange = (
    matrixType: string,
    sections: MatrixSection[],
    scores: Record<string, number>
  ) => {
    setForm((f) => ({ ...f, matrixType, customSections: sections, sectionScores: scores }))
  }

  const scoreSum   = activeSections.reduce((s, sec) => s + (form.sectionScores[sec.key] || 0), 0)
  const scoresOk   = Math.abs(scoreSum - form.totalScore) < 0.01

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Vui lòng nhập tên ma trận")
    if (topics.length === 0) return toast.error("Vui lòng thêm ít nhất một nội dung")
    for (const t of topics)
      if (!t.topic.trim()) return toast.error(`Vui lòng nhập nội dung cho hàng ${t.order}`)
    if (!scoresOk)
      return toast.error(`Tổng điểm các phần (${scoreSum}) phải bằng tổng điểm toàn bài (${form.totalScore})`)

    setSaving(true)
    try {
      const res = await fetch(`/api/exam-matrices/${matrixId}`, {
        method: "PUT",
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
        throw new Error(err.error || err.message || "Failed")
      }
      toast.success("Đã cập nhật ma trận thành công")
      router.push(`/teacher/exam-matrix/${matrixId}`)
    } catch (e: any) {
      toast.error(e.message || "Không thể cập nhật ma trận")
    } finally {
      setSaving(false)
    }
  }

  // ── Loading states ────────────────────────────────────────────────────────

  if (!session?.user) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="border-b bg-white px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/teacher/exam-matrix/${matrixId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Chỉnh sửa ma trận đề</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {form.subject} — {form.grade} — {form.examType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Tổng số câu</div>
              <div className="text-xl font-bold leading-tight">{totalQuestions}</div>
            </div>
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</>
                : <><Save className="h-4 w-4 mr-2" />Lưu thay đổi</>}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-6 space-y-5">

          {/* ── 1. Loại ma trận ──────────────────────────────────────── */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-slate-500" />
              <span className="font-semibold text-sm text-slate-700 uppercase tracking-wide">
                Loại ma trận
              </span>
            </div>
            <div className="p-5">
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
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <span className="font-semibold text-sm text-slate-700 uppercase tracking-wide">
                Thông tin đề kiểm tra
              </span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4">

              <div className="md:col-span-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Tên ma trận
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: MA TRẬN ĐỀ KIỂM TRA GIỮA KÌ II — VẬT LÍ 10"
                  className="font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Môn học</label>
                <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Khối</label>
                <Select value={form.grade} onValueChange={(v) => setForm({ ...form, grade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Loại đề</label>
                <Select value={form.examType} onValueChange={(v) => setForm({ ...form, examType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXAM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Thời gian (ph)</label>
                <Input type="number" value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} />
              </div>

              <div className="md:col-span-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Tổng điểm</label>
                <Input type="number" step="0.5" value={form.totalScore}
                  onChange={(e) => setForm({ ...form, totalScore: parseFloat(e.target.value) || 0 })} />
              </div>

              <div className="md:col-span-5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Thời điểm kiểm tra
                </label>
                <Input
                  value={form.examInfo}
                  onChange={(e) => setForm({ ...form, examInfo: e.target.value })}
                  placeholder="VD: Kiểm tra giữa học kì II – Tuần 26"
                />
              </div>

              {activeSections.map((s, i) => (
                <div key={s.key} className="md:col-span-2">
                  <label className={`text-xs font-semibold uppercase tracking-wide mb-1.5 block ${
                    i === 0 ? "text-blue-600"
                    : i === 1 ? "text-emerald-600"
                    : i === 2 ? "text-amber-600"
                    : "text-purple-600"
                  }`}>
                    Điểm {s.label}
                  </label>
                  <Input
                    type="number" step="0.25" min="0"
                    value={form.sectionScores[s.key] ?? 0}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sectionScores: {
                          ...form.sectionScores,
                          [s.key]: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className={i === 0 ? "border-blue-200" : i === 1 ? "border-emerald-200" : i === 2 ? "border-amber-200" : "border-purple-200"}
                  />
                </div>
              ))}

              <div className="md:col-span-2 flex items-end">
                <div className={`text-xs px-3 py-2 rounded-md w-full text-center font-medium ${
                  scoresOk ? "bg-green-50 text-green-700 border border-green-200"
                           : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  Tổng: {scoreSum} / {form.totalScore}đ {scoresOk ? "✓" : "✗"}
                </div>
              </div>

            </div>

            <div className="px-5 pb-4">
              <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-700">Hình thức kiểm tra:</strong>{" "}
                {form.duration} phút — {form.examType}.<br />
                <strong className="text-slate-700">Cấu trúc:</strong>{" "}
                {activeSections.map((s) =>
                  `${s.label}. ${s.sublabel.replace(/[()]/g, "").trim()} (${form.sectionScores[s.key] ?? 0}đ)`
                ).join(" · ")}
                {" "}— Tổng: {form.totalScore}đ.
              </div>
            </div>
          </div>

          {/* ── 3. Matrix table ──────────────────────────────────────── */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-700 uppercase tracking-wide">
                Bảng năng lực và cấp độ tư duy — Ma trận
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {["NB = Nhận biết", "TH = Thông hiểu", "VD = Vận dụng"].map((label, i) => (
                  <span key={i} className={`px-2 py-1 rounded font-medium ${
                    i === 0 ? "bg-blue-50 text-blue-600"
                    : i === 1 ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                  }`}>{label}</span>
                ))}
              </div>
            </div>
            <div className="p-4">
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

          <Button variant="outline" onClick={addTopic} className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-2" />
            Thêm nội dung
          </Button>

        </div>
      </div>
    </div>
  )
}
