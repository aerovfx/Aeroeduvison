"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2, Clock, FileText, Sparkles,
  ScanLine, ListChecks, Camera, RotateCcw,
  Plus, Trash2, BookOpen, ChevronDown, ChevronUp, GripVertical,
} from "lucide-react"
import ScanGrading, { type AnswerKey, type EssayQuestion } from "./_components/ScanGrading"

function newAnswerKey(): AnswerKey {
  return {
    examName: "", examCode: "", examDate: "",
    studentName: "", studentId: "", examSite: "", examRoom: "", dob: "",
    part1: {}, part2: {}, part3: {}, essayQuestions: [],
  }
}

const OPTS = ["A", "B", "C", "D"] as const
const SUBS = ["a", "b", "c", "d"] as const

function EssayQuestionCard({
  eq, idx, onChange, onRemove,
}: {
  eq: EssayQuestion
  idx: number
  onChange: (updated: EssayQuestion) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-violet-200 dark:border-violet-800 rounded-lg overflow-hidden">
      <div className="bg-violet-50/80 dark:bg-violet-950/30 px-4 py-2.5 flex items-center gap-3">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        <span className="text-xs font-black text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded shrink-0">
          Câu {idx + 1}
        </span>
        <input
          type="text"
          value={eq.questionText}
          onChange={e => onChange({ ...eq, questionText: e.target.value })}
          placeholder={`Nội dung / tiêu đề câu ${idx + 1}...`}
          className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-[10px] text-muted-foreground font-medium">Điểm tối đa:</label>
          <input
            type="number"
            min={0}
            step={0.25}
            value={eq.maxScore}
            onChange={e => onChange({ ...eq, maxScore: parseFloat(e.target.value) || 0 })}
            className="w-14 text-center text-sm font-bold border border-input rounded-md px-1 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-violet-400"
          />
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-red-500 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 bg-card">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Đáp án mẫu / Hướng dẫn chấm
            </label>
            <textarea
              value={eq.sampleAnswer}
              onChange={e => onChange({ ...eq, sampleAnswer: e.target.value })}
              placeholder="Nhập đáp án mẫu hoặc các bước giải chi tiết..."
              rows={3}
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Thang điểm chi tiết (Rubric)
              </label>
              <textarea
                value={eq.rubric}
                onChange={e => onChange({ ...eq, rubric: e.target.value })}
                placeholder={"VD:\n0.5đ — Nêu đúng công thức\n1.0đ — Thay số và tính đúng kết quả\n0.5đ — Kết luận"}
                rows={3}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-y"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Ghi chú cho giám khảo
              </label>
              <textarea
                value={eq.notes}
                onChange={e => onChange({ ...eq, notes: e.target.value })}
                placeholder="Những lưu ý khi chấm, cách tính điểm từng phần..."
                rows={3}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-y"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface GradedSheetRow {
  id: string
  studentName: string
  studentId: string
  totalScore: number
  maxScore: number
  percentage: number
  gradeLabel: string
  reviewed: boolean
  published: boolean
  frontImageUrl?: string | null
  backImageUrl?: string | null
  createdAt: string
  answerKeyId: string
}

function GradedResults({ savedKeys }: { savedKeys: AnswerKey[] }) {
  const [rows, setRows] = useState<GradedSheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterKeyId, setFilterKeyId] = useState<string>("all")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const url = filterKeyId === "all"
          ? "/api/grading/graded-sheets"
          : `/api/grading/graded-sheets?answerKeyId=${filterKeyId}`
        const res = await fetch(url)
        if (!res.ok || cancelled) return
        const { sheets } = await res.json()
        if (!cancelled) setRows(sheets ?? [])
      } catch (err) {
        console.error("Failed to load graded sheets:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [filterKeyId])

  const keyName = (keyId: string) => {
    const k = savedKeys.find(k => k.dbId === keyId)
    return k?.examName || keyId.slice(0, 8)
  }

  const gradeColor = (label: string) => {
    switch (label) {
      case 'A': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
      case 'B': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'
      case 'C': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30'
      case 'D': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30'
      default:  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Đang tải kết quả chấm bài…</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="font-semibold text-foreground">Chưa có bài nào được chấm</p>
        <p className="text-sm text-muted-foreground mt-1">Upload và chấm bài làm để xem kết quả tại đây</p>
      </div>
    )
  }

  const keysWithSheets = [...new Set(rows.map(r => r.answerKeyId))]

  return (
    <div className="space-y-4">
      {/* Filter */}
      {keysWithSheets.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Lọc theo đề:</span>
          <select
            value={filterKeyId}
            onChange={e => { setFilterKeyId(e.target.value); setLoading(true) }}
            className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground"
          >
            <option value="all">Tất cả ({rows.length})</option>
            {keysWithSheets.map(kId => (
              <option key={kId} value={kId}>{keyName(kId)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-black text-foreground">{rows.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Bài đã chấm</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {rows.length > 0 ? (rows.reduce((s, r) => s + r.percentage, 0) / rows.length).toFixed(1) : 0}%
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Trung bình</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-black text-foreground">
            {rows.length > 0 ? Math.max(...rows.map(r => r.totalScore)).toFixed(1) : 0}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Cao nhất</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-black text-foreground">
            {rows.length > 0 ? Math.min(...rows.map(r => r.totalScore)).toFixed(1) : 0}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Thấp nhất</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Họ tên</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">SBD</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Điểm</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">%</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Loại</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Ảnh</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Đề thi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{r.studentName || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{r.studentId || "—"}</td>
                  <td className="px-4 py-3 text-center font-bold text-foreground">{r.totalScore}/{r.maxScore}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{r.percentage.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColor(r.gradeLabel)}`}>
                      {r.gradeLabel || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {r.frontImageUrl && <span className="text-[10px] text-emerald-500" title="Mặt trước">▣</span>}
                      {r.backImageUrl && <span className="text-[10px] text-blue-500" title="Mặt sau">▣</span>}
                      {!r.frontImageUrl && !r.backImageUrl && <span className="text-muted-foreground/30">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{keyName(r.answerKeyId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function GradingPage() {
  const [activeTab, setActiveTab]           = useState<"scan" | "answerkey" | "graded">("scan")
  const [savedKeys, setSavedKeys]           = useState<AnswerKey[]>([])
  const [selectedKeyIdx, setSelectedKeyIdx] = useState(0)
  const [draftKey, setDraftKey]             = useState<AnswerKey>(newAnswerKey())
  const [savingKey, setSavingKey]           = useState(false)
  const [loadingKeys, setLoadingKeys]       = useState(true)

  // Load saved answer keys from database on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/grading/answer-keys")
        if (!res.ok) throw new Error("Failed to load")
        const { keys } = await res.json()
        if (cancelled) return
        const mapped: AnswerKey[] = (keys ?? []).map((k: any) => ({
          dbId: k.id,
          examName: k.examName ?? "",
          examCode: k.examCode ?? "",
          examDate: k.examDate ?? "",
          studentName: k.studentName ?? "",
          studentId: k.studentId ?? "",
          examSite: k.examSite ?? "",
          examRoom: k.examRoom ?? "",
          dob: k.dob ?? "",
          part1: k.part1 ?? {},
          part2: k.part2 ?? {},
          part3: k.part3 ?? {},
          essayQuestions: k.essayQuestions ?? [],
        }))
        setSavedKeys(mapped)
        if (mapped.length > 0) setSelectedKeyIdx(0)
      } catch (err) {
        console.error("Failed to load answer keys:", err)
      } finally {
        if (!cancelled) setLoadingKeys(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleSaveKey = useCallback(async () => {
    setSavingKey(true)
    try {
      const res = await fetch("/api/grading/answer-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftKey),
      })
      if (!res.ok) throw new Error("Save failed")
      const { key } = await res.json()

      const saved: AnswerKey = { ...draftKey, dbId: key.id }
      setSavedKeys(prev => {
        const next = [...prev, saved]
        setSelectedKeyIdx(next.length - 1)
        return next
      })
      setDraftKey(newAnswerKey())
      setActiveTab("scan")
    } catch (err) {
      console.error("Failed to save answer key:", err)
      alert("Lưu đáp án thất bại. Vui lòng thử lại.")
    } finally {
      setSavingKey(false)
    }
  }, [draftKey])

  const handleDeleteKey = useCallback(async (idx: number) => {
    const key = savedKeys[idx]
    if (!key) return
    if (!confirm(`Xoá đáp án "${key.examName || `Đề #${idx + 1}`}"?`)) return

    if (key.dbId) {
      try {
        await fetch("/api/grading/answer-keys", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: key.dbId }),
        })
      } catch (err) {
        console.error("Failed to delete answer key:", err)
      }
    }

    setSavedKeys(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (selectedKeyIdx >= next.length) setSelectedKeyIdx(Math.max(0, next.length - 1))
      return next
    })
  }, [savedKeys, selectedKeyIdx])

  const TABS = [
    { key: "scan",      label: "Quét & Chấm", Icon: ScanLine   },
    { key: "answerkey", label: "Nhập đáp án", Icon: ListChecks },
    { key: "graded",    label: "Đã chấm",     Icon: Clock      },
  ] as const

  const STATS = [
    { label: "Tổng số bài",   Icon: FileText,     accent: "text-blue-500 dark:text-blue-400",    val: 0               },
    { label: "Chưa chấm",     Icon: Clock,        accent: "text-amber-500 dark:text-amber-400",  val: 0               },
    { label: "Đã chấm",       Icon: CheckCircle2, accent: "text-emerald-500 dark:text-emerald-400", val: 0            },
    { label: "Đáp án đã lưu", Icon: Sparkles,     accent: "text-purple-500 dark:text-purple-400", val: savedKeys.length},
  ]

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">

            {/* Title */}
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Chấm Điểm</h1>
                <p className="text-sm text-muted-foreground">Quét phiếu trả lời · Chấm tự động với AI</p>
              </div>
            </div>

            {/* Pill tabs */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === key
                      ? "bg-card text-purple-600 dark:text-purple-400 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(({ label, Icon, accent, val }) => (
            <div key={label} className="bg-card rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${accent} shrink-0`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-semibold text-foreground">{val}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab: Quét & Chấm ─────────────────────────────────────── */}
        {activeTab === "scan" && (
          <ScanGrading
            savedKeys={savedKeys}
            selectedKeyIdx={selectedKeyIdx}
            setSelectedKeyIdx={setSelectedKeyIdx}
            onSwitchToAnswerKey={() => setActiveTab("answerkey")}
          />
        )}

        {/* ── Tab: Nhập đáp án ─────────────────────────────────────── */}
        {activeTab === "answerkey" && (
          <div className="space-y-5">
            {/* ── Thông tin đề ───────────────────────────────────────── */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                  <h2 className="font-semibold text-foreground">Tạo đáp án mới</h2>
                </div>
                <div className="flex items-center gap-2">
                  {savedKeys.length > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      {savedKeys.length} đã lưu
                    </span>
                  )}
                  <button
                    onClick={() => setDraftKey(newAnswerKey())}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    title="Xoá hết"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { field: "examName", label: "Tên đề thi",  placeholder: "VD: Vật lý 10 — GKII" },
                  { field: "examCode", label: "Mã đề",       placeholder: "132"        },
                  { field: "examDate", label: "Ngày thi",    placeholder: "15/04/2025" },
                  { field: "examSite", label: "Địa điểm",   placeholder: "Trường THPT" },
                ] as const).map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
                    <input
                      type="text"
                      value={draftKey[field]}
                      placeholder={placeholder}
                      onChange={(e) => setDraftKey((k) => ({ ...k, [field]: e.target.value }))}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── PHẦN I — Trắc nghiệm 40 câu ──────────────────────── */}
            <div className="bg-card rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">PHẦN I — Trắc nghiệm nhiều lựa chọn <span className="text-muted-foreground font-normal">(40 câu · A B C D)</span></h3>
                <span className="text-xs text-muted-foreground">
                  {Object.values(draftKey.part1).filter(v => v !== null && v !== undefined).length}/40 đã nhập
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-x-4 gap-y-0">
                  {[0, 1, 2, 3].map(col => (
                    <div key={col}>
                      {/* Column header */}
                      <div className="grid grid-cols-[2rem_repeat(4,1fr)] gap-0 mb-1 px-1">
                        <span className="text-[9px] font-bold text-muted-foreground"></span>
                        {OPTS.map(o => (
                          <span key={o} className="text-center text-[10px] font-black text-rose-500 dark:text-rose-400">{o}</span>
                        ))}
                      </div>
                      {/* Questions */}
                      {Array.from({ length: 10 }, (_, r) => {
                        const q = col * 10 + r + 1
                        const val = draftKey.part1[q] ?? null
                        return (
                          <div key={q} className="grid grid-cols-[2rem_repeat(4,1fr)] gap-0 items-center py-[3px] px-1 rounded hover:bg-muted/50 transition-colors">
                            <span className="text-xs font-bold text-foreground tabular-nums">{q}</span>
                            {OPTS.map(o => {
                              const active = val === o
                              return (
                                <button
                                  key={o}
                                  type="button"
                                  onClick={() => setDraftKey(k => ({
                                    ...k,
                                    part1: { ...k.part1, [q]: active ? null : o },
                                  }))}
                                  className={`mx-auto w-6 h-6 rounded-full border-2 text-[10px] font-bold transition-all ${
                                    active
                                      ? "bg-rose-500 border-rose-500 text-white shadow-sm scale-110"
                                      : "border-rose-300 dark:border-rose-700 text-transparent hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                  }`}
                                >
                                  {o}
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── PHẦN II — Đúng / Sai (8 câu × 4 ý) ────────────────── */}
            <div className="bg-card rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">PHẦN II — Đúng / Sai <span className="text-muted-foreground font-normal">(8 câu × 4 ý a, b, c, d)</span></h3>
                <span className="text-xs text-muted-foreground">
                  {Object.values(draftKey.part2).reduce((n, sub) => n + Object.values(sub).filter(v => v !== null && v !== undefined).length, 0)}/32 đã nhập
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-4 gap-4">
                  {Array.from({ length: 8 }, (_, i) => {
                    const q = i + 1
                    const subVals = draftKey.part2[q] ?? {}
                    return (
                      <div key={q} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 border-b border-border flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">Câu {q}</span>
                          <div className="flex gap-3">
                            <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 w-6 text-center">Đ</span>
                            <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 w-6 text-center">S</span>
                          </div>
                        </div>
                        <div className="px-3 py-1">
                          {SUBS.map(s => {
                            const v = subVals[s] ?? null
                            return (
                              <div key={s} className="flex items-center justify-between py-1">
                                <span className="text-xs text-foreground font-medium">{s})</span>
                                <div className="flex gap-3">
                                  {/* Đúng */}
                                  <button
                                    type="button"
                                    onClick={() => setDraftKey(k => ({
                                      ...k,
                                      part2: {
                                        ...k.part2,
                                        [q]: { ...(k.part2[q] ?? {}), [s]: v === true ? null : true },
                                      },
                                    }))}
                                    className={`w-6 h-6 rounded-full border-2 text-[9px] font-bold transition-all ${
                                      v === true
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm"
                                        : "border-blue-300 dark:border-blue-700 text-transparent hover:border-blue-400"
                                    }`}
                                  >
                                    Đ
                                  </button>
                                  {/* Sai */}
                                  <button
                                    type="button"
                                    onClick={() => setDraftKey(k => ({
                                      ...k,
                                      part2: {
                                        ...k.part2,
                                        [q]: { ...(k.part2[q] ?? {}), [s]: v === false ? null : false },
                                      },
                                    }))}
                                    className={`w-6 h-6 rounded-full border-2 text-[9px] font-bold transition-all ${
                                      v === false
                                        ? "bg-red-500 border-red-500 text-white shadow-sm"
                                        : "border-blue-300 dark:border-blue-700 text-transparent hover:border-blue-400"
                                    }`}
                                  >
                                    S
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── PHẦN III — Trả lời ngắn (6 câu) ────────────────────── */}
            <div className="bg-card rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">PHẦN III — Trả lời ngắn <span className="text-muted-foreground font-normal">(6 câu · điền số)</span></h3>
                <span className="text-xs text-muted-foreground">
                  {Object.values(draftKey.part3).filter(v => v && v.trim()).length}/6 đã nhập
                </span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }, (_, i) => {
                    const q = i + 1
                    return (
                      <div key={q} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-3 py-1.5 border-b border-border text-center">
                          <span className="text-xs font-bold text-foreground">Câu {q}</span>
                        </div>
                        <div className="p-2">
                          <input
                            type="text"
                            value={draftKey.part3[q] ?? ""}
                            onChange={(e) => setDraftKey(k => ({
                              ...k,
                              part3: { ...k.part3, [q]: e.target.value },
                            }))}
                            placeholder="—"
                            className="w-full text-center border border-input rounded-lg px-2 py-2 text-sm font-mono font-bold text-foreground bg-background placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── PHẦN IV — Tự luận (Mặt sau) ─────────────────────── */}
            <div className="bg-card rounded-xl border border-violet-200 dark:border-violet-900/40 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-violet-50 dark:bg-violet-950/20 border-b border-violet-200 dark:border-violet-900/40 flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm">
                  PHẦN IV — Tự luận <span className="text-muted-foreground font-normal">(Mặt sau · {draftKey.essayQuestions.length} câu · {draftKey.essayQuestions.reduce((s, q) => s + q.maxScore, 0)}đ)</span>
                </h3>
                <button
                  onClick={() => {
                    const newQ: EssayQuestion = {
                      id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      questionText: "",
                      maxScore: 2,
                      rubric: "",
                      sampleAnswer: "",
                      notes: "",
                    }
                    setDraftKey(k => ({
                      ...k,
                      essayQuestions: [...k.essayQuestions, newQ],
                    }))
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm câu tự luận
                </button>
              </div>

              <div className="p-4">
                {draftKey.essayQuestions.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <BookOpen className="w-10 h-10 text-violet-300 dark:text-violet-700 mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Chưa có câu tự luận nào</p>
                      <p className="text-xs text-muted-foreground mt-1">Nhấn "Thêm câu tự luận" để nhập đáp án & thang điểm cho phần mặt sau</p>
                    </div>
                    <button
                      onClick={() => {
                        const presets: EssayQuestion[] = Array.from({ length: 4 }, (_, i) => ({
                          id: `eq_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                          questionText: `Câu ${i + 1}`,
                          maxScore: i < 2 ? 1 : 1.5,
                          rubric: "",
                          sampleAnswer: "",
                          notes: "",
                        }))
                        setDraftKey(k => ({ ...k, essayQuestions: [...k.essayQuestions, ...presets] }))
                      }}
                      className="text-xs text-violet-500 hover:text-violet-600 font-medium underline underline-offset-2"
                    >
                      + Tạo nhanh 4 câu mẫu
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftKey.essayQuestions.map((eq, idx) => (
                      <EssayQuestionCard
                        key={eq.id}
                        eq={eq}
                        idx={idx}
                        onChange={(updated) => {
                          setDraftKey(k => ({
                            ...k,
                            essayQuestions: k.essayQuestions.map(q => q.id === eq.id ? updated : q),
                          }))
                        }}
                        onRemove={() => {
                          setDraftKey(k => ({
                            ...k,
                            essayQuestions: k.essayQuestions.filter(q => q.id !== eq.id),
                          }))
                        }}
                      />
                    ))}

                    {/* Total score summary */}
                    <div className="flex items-center justify-between pt-3 border-t border-violet-100 dark:border-violet-900/30">
                      <span className="text-xs text-muted-foreground">
                        Tổng điểm tự luận: <span className="font-bold text-foreground">{draftKey.essayQuestions.reduce((s, q) => s + q.maxScore, 0)}đ</span>
                      </span>
                      <button
                        onClick={() => {
                          const newQ: EssayQuestion = {
                            id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                            questionText: "",
                            maxScore: 1,
                            rubric: "",
                            sampleAnswer: "",
                            notes: "",
                          }
                          setDraftKey(k => ({ ...k, essayQuestions: [...k.essayQuestions, newQ] }))
                        }}
                        className="text-xs text-violet-500 hover:text-violet-600 font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Thêm câu
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 px-3 py-2 bg-violet-50/60 dark:bg-violet-950/10 rounded-lg border border-violet-100 dark:border-violet-900/20">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-bold text-violet-500">Hướng dẫn:</span> Lật phiếu bài thi và chụp mặt sau (phần tự luận), đính kèm ảnh ở danh sách phiếu khi chấm bài.
                    Điểm tự luận sẽ được giáo viên chấm thủ công dựa trên đáp án mẫu & thang điểm (rubric) đã khai báo.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Actions & saved list ────────────────────────────────── */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{Object.values(draftKey.part1).filter(v => v).length}</span> TN +{" "}
                  <span className="font-medium text-foreground">{Object.values(draftKey.part2).reduce((n, s) => n + Object.values(s).filter(v => v !== null && v !== undefined).length, 0)}</span> Đ/S +{" "}
                  <span className="font-medium text-foreground">{Object.values(draftKey.part3).filter(v => v && v.trim()).length}</span> ngắn +{" "}
                  <span className="font-medium text-foreground">{draftKey.essayQuestions.length}</span> TL
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab("scan")}
                    className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleSaveKey}
                    disabled={!draftKey.examName.trim() || savingKey}
                    className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingKey ? "Đang lưu…" : "Lưu đáp án"}
                  </button>
                </div>
              </div>

              {loadingKeys && (
                <div className="mt-4 pt-4 border-t border-border text-center py-3">
                  <p className="text-xs text-muted-foreground animate-pulse">Đang tải đáp án…</p>
                </div>
              )}
              {savedKeys.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Đáp án đã lưu</p>
                  {savedKeys.map((k, i) => (
                    <div
                      key={k.dbId || i}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        i === selectedKeyIdx
                          ? "border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-500/10 text-purple-900 dark:text-purple-200"
                          : "border-border bg-muted/50 hover:bg-muted text-foreground"
                      }`}
                      onClick={() => { setSelectedKeyIdx(i); setActiveTab("scan") }}
                    >
                      <span className="font-medium">{k.examName || `Đề #${i + 1}`}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Mã: {k.examCode || "—"}</span>
                        <span>{Object.values(k.part1).filter(v => v).length} TN</span>
                        {k.essayQuestions.length > 0 && (
                          <span className="text-blue-500">{k.essayQuestions.length} TL</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteKey(i) }}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Xoá đáp án"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Đã chấm ─────────────────────────────────────────── */}
        {activeTab === "graded" && (
          <GradedResults savedKeys={savedKeys} />
        )}

      </div>
    </div>
  )
}
