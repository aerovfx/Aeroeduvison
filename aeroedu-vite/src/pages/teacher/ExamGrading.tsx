import { useState, useEffect, useCallback } from "react"
import { api } from "@/services/api"
import { ExportMenu } from "@/components/common/ExportMenu"
import type { SheetData } from "@/lib/exportReport"
import {
  CheckCircle2, Clock, FileText, Sparkles,
  ScanLine, ListChecks, Camera, RotateCcw,
  Plus, Trash2, BookOpen, ChevronDown, ChevronUp, GripVertical,
} from "lucide-react"
import ScanGrading, { type AnswerKey, type EssayQuestion } from "@/components/exam-grading/ScanGrading"

// ── Dark palette ─────────────────────────────────────────────────────────────
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


// ── Helpers ──────────────────────────────────────────────────────────────────
function newAnswerKey(): AnswerKey {
  return {
    examName: "", examCode: "", examDate: "",
    studentName: "", studentId: "", examSite: "", examRoom: "", dob: "",
    part1: {}, part2: {}, part3: {}, essayQuestions: [],
  }
}

const OPTS = ["A", "B", "C", "D"] as const
const SUBS = ["a", "b", "c", "d"] as const

// ── DInput helper ─────────────────────────────────────────────────────────────
function DInput({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        background: D.card2, color: D.text,
        border: `1px solid ${D.border2}`, borderRadius: 8,
        padding: "7px 12px", fontSize: 13, outline: "none", width: "100%",
        boxSizing: "border-box" as const,
      }}
    />
  )
}

// ── EssayQuestionCard ─────────────────────────────────────────────────────────
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
    <div style={{ border: `1px solid rgba(139,92,246,0.35)`, borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "rgba(91,33,182,0.15)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <GripVertical style={{ width: 14, height: 14, color: D.muted, flexShrink: 0 }} />
        <span style={{
          fontSize: 11, fontWeight: 900, color: "#a78bfa",
          background: "rgba(91,33,182,0.3)", padding: "2px 8px", borderRadius: 6, flexShrink: 0,
        }}>
          Câu {idx + 1}
        </span>
        <input
          type="text"
          value={eq.questionText}
          onChange={e => onChange({ ...eq, questionText: e.target.value })}
          placeholder={`Nội dung / tiêu đề câu ${idx + 1}...`}
          style={{ flex: 1, fontSize: 13, background: "transparent", border: "none", outline: "none", color: D.text }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <label style={{ fontSize: 10, color: D.muted, fontWeight: 600 }}>Điểm tối đa:</label>
          <input
            type="number" min={0} step={0.25}
            value={eq.maxScore}
            onChange={e => onChange({ ...eq, maxScore: parseFloat(e.target.value) || 0 })}
            style={{
              width: 56, textAlign: "center", fontSize: 13, fontWeight: 700,
              border: `1px solid ${D.border2}`, borderRadius: 6, padding: "2px 4px",
              background: D.card2, color: D.text, outline: "none",
            }}
          />
        </div>
        <button onClick={() => setExpanded(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: D.muted, padding: 4 }}>
          {expanded ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
        </button>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: D.muted, padding: 4 }}>
          <Trash2 style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: 16, background: D.card, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: D.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
              Đáp án mẫu / Hướng dẫn chấm
            </label>
            <textarea
              value={eq.sampleAnswer}
              onChange={e => onChange({ ...eq, sampleAnswer: e.target.value })}
              placeholder="Nhập đáp án mẫu hoặc các bước giải chi tiết..."
              rows={3}
              style={{
                width: "100%", fontSize: 13, border: `1px solid ${D.border2}`, borderRadius: 8,
                padding: "8px 12px", background: D.card2, color: D.text, outline: "none",
                resize: "vertical" as const, boxSizing: "border-box" as const,
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: D.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
                Thang điểm chi tiết (Rubric)
              </label>
              <textarea
                value={eq.rubric}
                onChange={e => onChange({ ...eq, rubric: e.target.value })}
                placeholder={"VD:\n0.5đ — Nêu đúng công thức\n1.0đ — Thay số và tính đúng kết quả\n0.5đ — Kết luận"}
                rows={3}
                style={{
                  width: "100%", fontSize: 13, border: `1px solid ${D.border2}`, borderRadius: 8,
                  padding: "8px 12px", background: D.card2, color: D.text, outline: "none",
                  resize: "vertical" as const, boxSizing: "border-box" as const,
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: D.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
                Ghi chú cho giám khảo
              </label>
              <textarea
                value={eq.notes}
                onChange={e => onChange({ ...eq, notes: e.target.value })}
                placeholder="Những lưu ý khi chấm, cách tính điểm từng phần..."
                rows={3}
                style={{
                  width: "100%", fontSize: 13, border: `1px solid ${D.border2}`, borderRadius: 8,
                  padding: "8px 12px", background: D.card2, color: D.text, outline: "none",
                  resize: "vertical" as const, boxSizing: "border-box" as const,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── GradedResults ─────────────────────────────────────────────────────────────
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

function gradeStyle(label: string): { color: string; bg: string } {
  switch (label) {
    case 'A': return { color: '#34d399', bg: 'rgba(6,95,70,0.2)' }
    case 'B': return { color: '#60a5fa', bg: 'rgba(30,58,138,0.2)' }
    case 'C': return { color: '#fbbf24', bg: 'rgba(120,53,15,0.2)' }
    case 'D': return { color: '#fb923c', bg: 'rgba(124,45,18,0.2)' }
    default:  return { color: '#f87171', bg: 'rgba(127,29,29,0.2)' }
  }
}

function GradedResults({ savedKeys }: { savedKeys: AnswerKey[] }) {
  const [rows, setRows] = useState<GradedSheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterKeyId, setFilterKeyId] = useState<string>("all")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
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

  if (loading) {
    return (
      <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 48, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: D.muted }}>Đang tải kết quả chấm bài…</p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 48, textAlign: "center" }}>
        <Clock style={{ width: 40, height: 40, color: D.muted, margin: "0 auto 12px" }} />
        <p style={{ fontWeight: 600, color: D.text, marginBottom: 4 }}>Chưa có bài nào được chấm</p>
        <p style={{ fontSize: 13, color: D.muted }}>Upload và chấm bài làm để xem kết quả tại đây</p>
      </div>
    )
  }

  const keysWithSheets = Array.from(new Set(rows.map(r => r.answerKeyId)))

  /** Export sheets — bảng điểm + summary stats */
  const getGradedSheets = (): SheetData[] => {
    if (rows.length === 0) return []
    const avg = rows.reduce((s, r) => s + r.percentage, 0) / rows.length
    const max = Math.max(...rows.map(r => r.totalScore))
    const min = Math.min(...rows.map(r => r.totalScore))
    return [
      {
        name: `Bảng điểm (${rows.length})`,
        columns: [
          { key: 'studentName', label: 'Họ tên' },
          { key: 'studentId',   label: 'SBD' },
          { key: 'totalScore',  label: 'Điểm',     type: 'number' },
          { key: 'maxScore',    label: 'Tối đa',   type: 'number' },
          { key: 'percentage',  label: '%',        type: 'number' },
          { key: 'gradeLabel',  label: 'Loại' },
          { key: 'reviewed',    label: 'Đã review' },
          { key: 'published',   label: 'Đã công bố' },
          { key: 'createdAt',   label: 'Chấm lúc', type: 'date' },
          { key: 'examName',    label: 'Đề thi' },
        ],
        rows: rows.map(r => ({
          ...r,
          reviewed: r.reviewed ? 'Có' : 'Chưa',
          published: r.published ? 'Có' : 'Chưa',
          examName: keyName(r.answerKeyId),
        })),
      },
      {
        name: 'Thống kê',
        columns: [
          { key: 'metric', label: 'Chỉ số' },
          { key: 'value',  label: 'Giá trị' },
        ],
        rows: [
          { metric: 'Bài đã chấm',  value: rows.length },
          { metric: 'TB điểm (%)',  value: avg.toFixed(1) },
          { metric: 'Cao nhất',     value: max },
          { metric: 'Thấp nhất',    value: min },
          { metric: 'Số đề thi',    value: keysWithSheets.length },
        ],
      },
    ]
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filter + Export */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
        {keysWithSheets.length > 1 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: D.muted }}>Lọc theo đề:</span>
            <select
              value={filterKeyId}
              onChange={e => setFilterKeyId(e.target.value)}
              style={{ fontSize: 13, border: `1px solid ${D.border2}`, borderRadius: 8, padding: "6px 12px", background: D.card2, color: D.text, outline: "none" }}
            >
              <option value="all">Tất cả ({rows.length})</option>
              {keysWithSheets.map(kId => <option key={kId} value={kId}>{keyName(kId)}</option>)}
            </select>
          </div>
        ) : <div />}
        <ExportMenu
          variant="compact"
          filename={`bang-diem-${new Date().toISOString().slice(0, 10)}`}
          getSheets={getGradedSheets}
          meta={{
            title: 'Bảng điểm — Đã chấm',
            subtitle: `Tổng ${rows.length} bài · ${keysWithSheets.length} đề`,
            authorName: 'GV',
          }}
        />
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Bài đã chấm", val: String(rows.length), color: D.text },
          { label: "Trung bình", val: rows.length > 0 ? (rows.reduce((s, r) => s + r.percentage, 0) / rows.length).toFixed(1) + "%" : "0%", color: "#34d399" },
          { label: "Cao nhất", val: rows.length > 0 ? Math.max(...rows.map(r => r.totalScore)).toFixed(1) : "0", color: D.text },
          { label: "Thấp nhất", val: rows.length > 0 ? Math.min(...rows.map(r => r.totalScore)).toFixed(1) : "0", color: D.text },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 16, textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{val}</p>
            <p style={{ fontSize: 10, color: D.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginTop: 4 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 13 }}>
            <thead>
              <tr style={{ background: D.card2, borderBottom: `1px solid ${D.border}` }}>
                {["#", "Họ tên", "SBD", "Điểm", "%", "Loại", "Ảnh", "Đề thi"].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", fontWeight: 600, color: D.muted, textAlign: (i >= 3 && i <= 6 ? "center" : "left") as any }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const gs = gradeStyle(r.gradeLabel)
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${D.border}` }}>
                    <td style={{ padding: "12px 16px", color: D.muted }}>{i + 1}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: D.text }}>{r.studentName || "—"}</td>
                    <td style={{ padding: "12px 16px", color: D.muted, fontFamily: "monospace" }}>{r.studentId || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: D.text }}>{r.totalScore}/{r.maxScore}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: D.muted }}>{r.percentage.toFixed(1)}%</td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, color: gs.color, background: gs.bg }}>
                        {r.gradeLabel || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        {r.frontImageUrl && <span style={{ fontSize: 10, color: "#34d399" }} title="Mặt trước">▣</span>}
                        {r.backImageUrl && <span style={{ fontSize: 10, color: "#60a5fa" }} title="Mặt sau">▣</span>}
                        {!r.frontImageUrl && !r.backImageUrl && <span style={{ color: D.border2 }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 11, color: D.muted }}>{keyName(r.answerKeyId)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExamGrading() {
  const [activeTab, setActiveTab_] = useState<"scan" | "answerkey" | "graded" | "library">("answerkey")
  const [gradedRefreshKey, setGradedRefreshKey] = useState(0)
  const setActiveTab = useCallback((tab: "scan" | "answerkey" | "graded" | "library") => {
    setActiveTab_(tab)
    if (tab === "graded") setGradedRefreshKey(k => k + 1)
  }, [])

  const [savedKeys, setSavedKeys]           = useState<AnswerKey[]>([])
  const [selectedKeyIdx, setSelectedKeyIdx] = useState(0)
  const [draftKey, setDraftKey]             = useState<AnswerKey>(newAnswerKey())
  const [savingKey, setSavingKey]           = useState(false)
  const [loadingKeys, setLoadingKeys]       = useState(true)

  // Load saved answer keys
  // Bug fix: trước dùng raw fetch() → không có Authorization Bearer header
  // → BE trả 401. Đổi sang `api` (axios với interceptor) để token tự attach.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<{ keys: any[] }>("/grading/answer-keys")
        const { keys } = res.data
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
      const res = await api.post<{ ok: boolean; key: { id: string } }>(
        "/grading/answer-keys",
        draftKey,
      )
      const { key } = res.data
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
  }, [draftKey, setActiveTab])

  const handleDeleteKey = useCallback(async (idx: number) => {
    const key = savedKeys[idx]
    if (!key) return
    if (!confirm(`Xoá đáp án "${key.examName || `Đề #${idx + 1}`}"?`)) return
    if (key.dbId) {
      try {
        // BE handler: DELETE /api/grading/answer-keys/:id (id trong URL path,
        // KHÔNG phải body). Trước đây gửi body {id} → 404 vì missing :id param.
        await api.delete(`/grading/answer-keys/${encodeURIComponent(key.dbId)}`)
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
    { key: "answerkey" as const, label: "① Nhập đáp án", Icon: ListChecks },
    { key: "scan"      as const, label: "② Quét & Chấm", Icon: ScanLine   },
    { key: "graded"    as const, label: "③ Đã chấm",     Icon: Clock      },
    { key: "library"   as const, label: "④ Thư viện",    Icon: FileText   },
  ]

  return (
    <div style={{ minHeight: "100vh", background: D.bg }}>

      {/* ── Header ── */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Camera style={{ width: 24, height: 24, color: "#a78bfa" }} />
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: D.text, margin: 0 }}>Chấm Điểm</h1>
                <p style={{ fontSize: 13, color: D.muted, margin: 0 }}>Quét phiếu trả lời · Chấm tự động với AI</p>
              </div>
            </div>
            {/* Pill tabs */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: D.card2, borderRadius: 10, padding: 4 }}>
              {TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: activeTab === key ? D.card : "transparent",
                    color: activeTab === key ? "#a78bfa" : D.muted,
                    boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                  }}
                >
                  <Icon style={{ width: 16, height: 16 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Tổng số bài",   Icon: FileText,     accent: "#60a5fa", val: 0                },
            { label: "Chưa chấm",     Icon: Clock,        accent: "#fbbf24", val: 0                },
            { label: "Đã chấm",       Icon: CheckCircle2, accent: "#34d399", val: 0                },
            { label: "Đáp án đã lưu", Icon: Sparkles,     accent: "#a78bfa", val: savedKeys.length },
          ].map(({ label, Icon, accent, val }) => (
            <div key={label} style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon style={{ width: 20, height: 20, color: accent, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 20, fontWeight: 600, color: D.text, margin: 0 }}>{val}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab: Quét & Chấm ── */}
        {activeTab === "scan" && (
          savedKeys.length === 0 ? (
            <div style={{
              background: D.card, borderRadius: 12,
              border: `1px solid rgba(146,64,14,0.4)`,
              padding: 40, textAlign: "center",
            }}>
              <ListChecks style={{ width: 48, height: 48, color: "#fbbf24", margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: D.text, marginBottom: 8 }}>Chưa có đáp án nào</h3>
              <p style={{ fontSize: 13, color: D.muted, marginBottom: 16 }}>
                Bạn cần nhập đáp án chuẩn trước khi quét và chấm bài. Hãy chuyển sang tab "① Nhập đáp án" để bắt đầu.
              </p>
              <button
                onClick={() => setActiveTab("answerkey")}
                style={{
                  padding: "10px 24px", background: D.purple, color: "#fff",
                  fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", cursor: "pointer",
                }}
              >
                ① Nhập đáp án ngay
              </button>
            </div>
          ) : (
            <ScanGrading
              savedKeys={savedKeys}
              selectedKeyIdx={selectedKeyIdx}
              setSelectedKeyIdx={setSelectedKeyIdx}
              onSwitchToAnswerKey={() => setActiveTab("answerkey")}
            />
          )
        )}

        {/* ── Tab: Nhập đáp án ── */}
        {activeTab === "answerkey" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Thông tin đề */}
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ListChecks style={{ width: 20, height: 20, color: "#a78bfa" }} />
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: D.text, margin: 0 }}>Tạo đáp án mới</h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {savedKeys.length > 0 && (
                    <span style={{ fontSize: 11, color: D.muted, background: D.card2, padding: "4px 10px", borderRadius: 20 }}>
                      {savedKeys.length} đã lưu
                    </span>
                  )}
                  <button
                    onClick={() => setDraftKey(newAnswerKey())}
                    title="Xoá hết"
                    style={{ background: "none", border: "none", cursor: "pointer", color: D.muted, padding: 6, borderRadius: 8 }}
                  >
                    <RotateCcw style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {([
                  { field: "examName" as const, label: "Tên đề thi",  placeholder: "VD: Vật lý 10 — GKII" },
                  { field: "examCode" as const, label: "Mã đề",       placeholder: "132"        },
                  { field: "examDate" as const, label: "Ngày thi",    placeholder: "15/04/2025" },
                  { field: "examSite" as const, label: "Địa điểm",   placeholder: "Trường THPT" },
                ]).map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: D.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
                      {label}
                    </label>
                    <DInput value={draftKey[field]} placeholder={placeholder} onChange={v => setDraftKey(k => ({ ...k, [field]: v }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* PHẦN I — Trắc nghiệm 40 câu */}
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid rgba(190,18,60,0.35)`, overflow: "hidden" }}>
              <div style={{
                padding: "12px 20px", background: "rgba(159,18,57,0.12)",
                borderBottom: `1px solid rgba(190,18,60,0.25)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>
                  PHẦN I — Trắc nghiệm nhiều lựa chọn{" "}
                  <span style={{ color: D.muted, fontWeight: 400 }}>(40 câu · A B C D)</span>
                </h3>
                <span style={{ fontSize: 11, color: D.muted }}>
                  {Object.values(draftKey.part1).filter(v => v !== null && v !== undefined).length}/40 đã nhập
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0 16px" }}>
                  {[0, 1, 2, 3].map(col => (
                    <div key={col}>
                      {/* Column header */}
                      <div style={{ display: "grid", gridTemplateColumns: "2rem repeat(4, 1fr)", marginBottom: 4, padding: "0 4px" }}>
                        <span />
                        {OPTS.map(o => (
                          <span key={o} style={{ textAlign: "center" as const, fontSize: 10, fontWeight: 900, color: "#fb7185" }}>{o}</span>
                        ))}
                      </div>
                      {/* Questions */}
                      {Array.from({ length: 10 }, (_, r) => {
                        const q = col * 10 + r + 1
                        const val = draftKey.part1[q] ?? null
                        return (
                          <div key={q} style={{ display: "grid", gridTemplateColumns: "2rem repeat(4, 1fr)", alignItems: "center", padding: "3px 4px", borderRadius: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>{q}</span>
                            {OPTS.map(o => {
                              const active = val === o
                              return (
                                <button
                                  key={o}
                                  type="button"
                                  onClick={() => setDraftKey(k => ({ ...k, part1: { ...k.part1, [q]: active ? null : o } }))}
                                  style={{
                                    margin: "0 auto", width: 24, height: 24, borderRadius: "50%",
                                    fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.1s",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: active ? "2px solid #fb7185" : "2px solid rgba(251,113,133,0.3)",
                                    background: active ? "#fb7185" : "transparent",
                                    color: active ? "#fff" : "transparent",
                                    transform: active ? "scale(1.1)" : "scale(1)",
                                  }}
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

            {/* PHẦN II — Đúng / Sai */}
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid rgba(29,78,216,0.35)`, overflow: "hidden" }}>
              <div style={{
                padding: "12px 20px", background: "rgba(30,64,175,0.12)",
                borderBottom: `1px solid rgba(29,78,216,0.25)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>
                  PHẦN II — Đúng / Sai{" "}
                  <span style={{ color: D.muted, fontWeight: 400 }}>(8 câu × 4 ý a, b, c, d)</span>
                </h3>
                <span style={{ fontSize: 11, color: D.muted }}>
                  {Object.values(draftKey.part2).reduce((n, sub) => n + Object.values(sub).filter(v => v !== null && v !== undefined).length, 0)}/32 đã nhập
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                  {Array.from({ length: 8 }, (_, i) => {
                    const q = i + 1
                    const subVals = draftKey.part2[q] ?? {}
                    return (
                      <div key={q} style={{ border: `1px solid ${D.border2}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{
                          background: D.card2, padding: "8px 12px",
                          borderBottom: `1px solid ${D.border}`,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>Câu {q}</span>
                          <div style={{ display: "flex", gap: 12 }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: "#60a5fa", width: 24, textAlign: "center" as const }}>Đ</span>
                            <span style={{ fontSize: 9, fontWeight: 900, color: "#60a5fa", width: 24, textAlign: "center" as const }}>S</span>
                          </div>
                        </div>
                        <div style={{ padding: "4px 12px" }}>
                          {SUBS.map(s => {
                            const v = subVals[s] ?? null
                            return (
                              <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                                <span style={{ fontSize: 12, color: D.text, fontWeight: 500 }}>{s})</span>
                                <div style={{ display: "flex", gap: 12 }}>
                                  <button
                                    type="button"
                                    onClick={() => setDraftKey(k => ({ ...k, part2: { ...k.part2, [q]: { ...(k.part2[q] ?? {}), [s]: v === true ? null : true } } }))}
                                    style={{
                                      width: 24, height: 24, borderRadius: "50%", fontSize: 9, fontWeight: 700,
                                      cursor: "pointer", border: "none",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      background: v === true ? "#10b981" : "transparent",
                                      outline: v === true ? "2px solid #10b981" : `2px solid rgba(96,165,250,0.3)`,
                                      color: v === true ? "#fff" : "transparent",
                                    }}
                                  >Đ</button>
                                  <button
                                    type="button"
                                    onClick={() => setDraftKey(k => ({ ...k, part2: { ...k.part2, [q]: { ...(k.part2[q] ?? {}), [s]: v === false ? null : false } } }))}
                                    style={{
                                      width: 24, height: 24, borderRadius: "50%", fontSize: 9, fontWeight: 700,
                                      cursor: "pointer", border: "none",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      background: v === false ? "#ef4444" : "transparent",
                                      outline: v === false ? "2px solid #ef4444" : `2px solid rgba(96,165,250,0.3)`,
                                      color: v === false ? "#fff" : "transparent",
                                    }}
                                  >S</button>
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

            {/* PHẦN III — Trả lời ngắn */}
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid rgba(146,64,14,0.35)`, overflow: "hidden" }}>
              <div style={{
                padding: "12px 20px", background: "rgba(120,53,15,0.12)",
                borderBottom: `1px solid rgba(146,64,14,0.25)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>
                  PHẦN III — Trả lời ngắn{" "}
                  <span style={{ color: D.muted, fontWeight: 400 }}>(6 câu · điền số)</span>
                </h3>
                <span style={{ fontSize: 11, color: D.muted }}>
                  {Object.values(draftKey.part3).filter(v => v && (v as string).trim()).length}/6 đã nhập
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
                  {Array.from({ length: 6 }, (_, i) => {
                    const q = i + 1
                    return (
                      <div key={q} style={{ border: `1px solid ${D.border2}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ background: D.card2, padding: "6px 12px", borderBottom: `1px solid ${D.border}`, textAlign: "center" as const }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: D.text }}>Câu {q}</span>
                        </div>
                        <div style={{ padding: 8 }}>
                          <input
                            type="text"
                            value={draftKey.part3[q] ?? ""}
                            onChange={e => setDraftKey(k => ({ ...k, part3: { ...k.part3, [q]: e.target.value } }))}
                            placeholder="—"
                            style={{
                              width: "100%", textAlign: "center" as const, boxSizing: "border-box" as const,
                              border: `1px solid ${D.border2}`, borderRadius: 8, padding: "8px 4px",
                              fontSize: 13, fontWeight: 700, fontFamily: "monospace",
                              background: D.card2, color: D.text, outline: "none",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* PHẦN IV — Tự luận */}
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid rgba(91,33,182,0.35)`, overflow: "hidden" }}>
              <div style={{
                padding: "12px 20px", background: "rgba(91,33,182,0.12)",
                borderBottom: `1px solid rgba(91,33,182,0.25)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>
                  PHẦN IV — Tự luận{" "}
                  <span style={{ color: D.muted, fontWeight: 400 }}>
                    (Mặt sau · {draftKey.essayQuestions.length} câu · {draftKey.essayQuestions.reduce((s, q) => s + q.maxScore, 0)}đ)
                  </span>
                </h3>
                <button
                  onClick={() => {
                    const newQ: EssayQuestion = {
                      id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      questionText: "", maxScore: 2, rubric: "", sampleAnswer: "", notes: "",
                    }
                    setDraftKey(k => ({ ...k, essayQuestions: [...k.essayQuestions, newQ] }))
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", background: "#7c3aed", color: "#fff",
                    fontSize: 12, fontWeight: 600, borderRadius: 8, border: "none", cursor: "pointer",
                  }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Thêm câu tự luận
                </button>
              </div>

              <div style={{ padding: 16 }}>
                {draftKey.essayQuestions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <BookOpen style={{ width: 40, height: 40, color: "rgba(139,92,246,0.4)", margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 13, fontWeight: 500, color: D.text, marginBottom: 4 }}>Chưa có câu tự luận nào</p>
                    <p style={{ fontSize: 12, color: D.muted, marginBottom: 12 }}>
                      Nhấn "Thêm câu tự luận" để nhập đáp án & thang điểm cho phần mặt sau
                    </p>
                    <button
                      onClick={() => {
                        const presets: EssayQuestion[] = Array.from({ length: 4 }, (_, i) => ({
                          id: `eq_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
                          questionText: `Câu ${i + 1}`, maxScore: i < 2 ? 1 : 1.5,
                          rubric: "", sampleAnswer: "", notes: "",
                        }))
                        setDraftKey(k => ({ ...k, essayQuestions: [...k.essayQuestions, ...presets] }))
                      }}
                      style={{ fontSize: 12, color: "#a78bfa", fontWeight: 500, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                    >
                      + Tạo nhanh 4 câu mẫu
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {draftKey.essayQuestions.map((eq, idx) => (
                      <EssayQuestionCard
                        key={eq.id}
                        eq={eq}
                        idx={idx}
                        onChange={updated => setDraftKey(k => ({ ...k, essayQuestions: k.essayQuestions.map(q => q.id === eq.id ? updated : q) }))}
                        onRemove={() => setDraftKey(k => ({ ...k, essayQuestions: k.essayQuestions.filter(q => q.id !== eq.id) }))}
                      />
                    ))}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid rgba(91,33,182,0.2)` }}>
                      <span style={{ fontSize: 12, color: D.muted }}>
                        Tổng điểm tự luận:{" "}
                        <span style={{ fontWeight: 700, color: D.text }}>{draftKey.essayQuestions.reduce((s, q) => s + q.maxScore, 0)}đ</span>
                      </span>
                      <button
                        onClick={() => {
                          const newQ: EssayQuestion = {
                            id: `eq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                            questionText: "", maxScore: 1, rubric: "", sampleAnswer: "", notes: "",
                          }
                          setDraftKey(k => ({ ...k, essayQuestions: [...k.essayQuestions, newQ] }))
                        }}
                        style={{ fontSize: 12, color: "#a78bfa", fontWeight: 500, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <Plus style={{ width: 12, height: 12 }} /> Thêm câu
                      </button>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16, padding: "8px 12px", background: "rgba(91,33,182,0.08)", borderRadius: 8, border: `1px solid rgba(91,33,182,0.15)` }}>
                  <p style={{ fontSize: 10, color: D.muted, lineHeight: 1.6, margin: 0 }}>
                    <span style={{ fontWeight: 700, color: "#a78bfa" }}>Hướng dẫn:</span>{" "}
                    Lật phiếu bài thi và chụp mặt sau (phần tự luận), đính kèm ảnh ở danh sách phiếu khi chấm bài.
                    Điểm tự luận sẽ được giáo viên chấm thủ công dựa trên đáp án mẫu & thang điểm (rubric) đã khai báo.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions & saved list */}
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, color: D.muted }}>
                  <span style={{ fontWeight: 500, color: D.text }}>{Object.values(draftKey.part1).filter(v => v).length}</span> TN +{" "}
                  <span style={{ fontWeight: 500, color: D.text }}>
                    {Object.values(draftKey.part2).reduce((n, s) => n + Object.values(s).filter(v => v !== null && v !== undefined).length, 0)}
                  </span> Đ/S +{" "}
                  <span style={{ fontWeight: 500, color: D.text }}>{Object.values(draftKey.part3).filter(v => v && (v as string).trim()).length}</span> ngắn +{" "}
                  <span style={{ fontWeight: 500, color: D.text }}>{draftKey.essayQuestions.length}</span> TL
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setActiveTab("scan")}
                    style={{ padding: "8px 16px", fontSize: 13, color: D.muted, background: "none", border: "none", cursor: "pointer", borderRadius: 8 }}
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={handleSaveKey}
                    disabled={!draftKey.examName.trim() || savingKey}
                    style={{
                      padding: "8px 20px", background: D.purple, color: "#fff",
                      fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none",
                      cursor: !draftKey.examName.trim() || savingKey ? "not-allowed" : "pointer",
                      opacity: !draftKey.examName.trim() || savingKey ? 0.4 : 1,
                    }}
                  >
                    {savingKey ? "Đang lưu…" : "Lưu đáp án"}
                  </button>
                </div>
              </div>

              {loadingKeys && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${D.border}`, textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: D.muted }}>Đang tải đáp án…</p>
                </div>
              )}

              {savedKeys.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${D.border}` }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: D.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8 }}>
                    Đáp án đã lưu
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {savedKeys.map((k, i) => (
                      <div
                        key={k.dbId || i}
                        onClick={() => { setSelectedKeyIdx(i); setActiveTab("scan") }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                          border: i === selectedKeyIdx ? "1px solid rgba(167,139,250,0.5)" : `1px solid ${D.border}`,
                          background: i === selectedKeyIdx ? "rgba(124,58,237,0.12)" : D.card2,
                          color: i === selectedKeyIdx ? "#c4b5fd" : D.text,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{k.examName || `Đề #${i + 1}`}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: D.muted }}>
                          <span>Mã: {k.examCode || "—"}</span>
                          <span>{Object.values(k.part1).filter(v => v).length} TN</span>
                          {k.essayQuestions.length > 0 && (
                            <span style={{ color: "#60a5fa" }}>{k.essayQuestions.length} TL</span>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteKey(i) }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: D.muted, padding: 4 }}
                            title="Xoá đáp án"
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Đã chấm ── */}
        {activeTab === "graded" && (
          <GradedResults key={`graded-${gradedRefreshKey}`} savedKeys={savedKeys} />
        )}

        {/* ── Tab: Thư viện đề (archive theo năm) ── */}
        {activeTab === "library" && (
          <LibrarySection
            savedKeys={savedKeys}
            onPickKey={(idx) => {
              setSelectedKeyIdx(idx)
              setActiveTab("scan")
            }}
          />
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   LibrarySection — Thư viện đề chấm theo năm
   Group savedKeys theo năm (parse từ examDate hoặc createdAt)
   ───────────────────────────────────────────────────── */
function LibrarySection({
  savedKeys, onPickKey,
}: {
  savedKeys: AnswerKey[]
  onPickKey: (idx: number) => void
}) {
  // Parse year từ examDate "DD/MM/YYYY" hoặc fallback createdAt
  const parseYear = (k: AnswerKey): string => {
    const m = (k.examDate || '').match(/(\d{4})/)
    if (m) return m[1]
    if (k.createdAt) {
      const y = new Date(k.createdAt).getFullYear()
      if (!isNaN(y)) return String(y)
    }
    return 'Khác'
  }

  // Group by year DESC, mỗi nhóm sort theo examDate DESC
  const byYear = new Map<string, { idx: number; key: AnswerKey }[]>()
  savedKeys.forEach((k, idx) => {
    const y = parseYear(k)
    if (!byYear.has(y)) byYear.set(y, [])
    byYear.get(y)!.push({ idx, key: k })
  })
  const years = Array.from(byYear.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(168,85,247,0.05))',
        border: `1px solid rgba(168,85,247,0.30)`,
        borderRadius: 14, padding: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <FileText style={{ width: 28, height: 28, color: '#a78bfa' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: D.text, margin: 0 }}>Thư viện bài chấm</h2>
        </div>
        <p style={{ fontSize: 13, color: D.muted, margin: 0 }}>
          Lưu trữ tất cả đáp án đã tạo, nhóm theo năm để tham khảo cho các kỳ thi sau.
          Bấm vào một đề để dùng lại đáp án và quét bài.
        </p>
      </div>

      {savedKeys.length === 0 ? (
        <div style={{
          background: D.card, borderRadius: 12, border: `1px solid ${D.border}`,
          padding: 48, textAlign: 'center',
        }}>
          <FileText style={{ width: 48, height: 48, color: D.muted, margin: '0 auto 12px', opacity: 0.4 }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: D.text, marginBottom: 6 }}>
            Thư viện trống
          </h3>
          <p style={{ fontSize: 13, color: D.muted }}>
            Tạo đáp án ở tab "① Nhập đáp án" để xây dựng thư viện. Mỗi đề tự động xếp theo năm thi.
          </p>
        </div>
      ) : (
        years.map(year => {
          const items = byYear.get(year)!
          return (
            <div key={year}>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10,
                padding: '0 4px',
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: D.text, margin: 0 }}>
                  {year === 'Khác' ? 'Không rõ năm' : `Năm ${year}`}
                </h3>
                <span style={{ fontSize: 12, color: D.muted }}>
                  · {items.length} đề
                </span>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12,
              }}>
                {items.map(({ idx, key }) => {
                  const part1Count = Object.values(key.part1 || {}).filter(v => v != null).length
                  const part2Count = Object.values(key.part2 || {}).filter(v => v != null).length
                  const part3Count = Object.values(key.part3 || {}).filter(v => v != null).length
                  return (
                    <button
                      key={key.id || idx}
                      onClick={() => onPickKey(idx)}
                      style={{
                        background: D.card, border: `1px solid ${D.border}`,
                        borderRadius: 12, padding: 16, textAlign: 'left',
                        cursor: 'pointer', transition: 'all 0.15s',
                        color: D.text,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = D.border
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: D.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {key.examName || 'Đề chưa đặt tên'}
                          </p>
                          <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>
                            {key.examCode ? `Mã ${key.examCode} · ` : ''}
                            {key.examDate || (key.createdAt ? new Date(key.createdAt).toLocaleDateString('vi-VN') : 'N/A')}
                          </p>
                        </div>
                      </div>
                      {key.examSite && (
                        <p style={{ fontSize: 11, color: D.muted, marginBottom: 10, opacity: 0.8 }}>
                          📍 {key.examSite}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {part1Count > 0 && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(159,18,57,0.15)', color: '#fb7185', fontWeight: 600,
                          }}>I · {part1Count} câu</span>
                        )}
                        {part2Count > 0 && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontWeight: 600,
                          }}>II · {part2Count} câu</span>
                        )}
                        {part3Count > 0 && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 4,
                            background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', fontWeight: 600,
                          }}>III · {part3Count} câu</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
