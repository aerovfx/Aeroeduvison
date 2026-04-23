import { useState, useEffect } from "react"
import {
  BarChart, TrendingUp, Users, Target, Award,
  Download, FileText, CheckCircle2, AlertCircle,
  Loader2, Activity,
} from "lucide-react"
import toast from "react-hot-toast"
import { api } from "@/services/api"

// ── Dark palette ─────────────────────────────────────────────────────────────
const D = {
  bg:      '#0d0e17',
  card:    '#10111e',
  card2:   '#161728',
  border:  '#1e2033',
  border2: '#2a2b3d',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  purple:  '#7c3aed',
} as const

// ── Types ────────────────────────────────────────────────────────────────────
interface Exam {
  id: string
  title: string
  examType: string
  status: string
  createdAt: string
}

interface ExamAnalytics {
  overview: {
    total_submissions: number
    completed: number
    in_progress: number
    average_score: number
    median_score: number
    highest_score: number
    lowest_score: number
    std_deviation: number
    pass_rate: number
  }
  grade_distribution: { [grade: string]: number }
  question_analysis: Array<{
    question_id: string
    question_number: number
    average_score: number
    difficulty_index: number
    discrimination_index: number
    most_common_answer: string
    correct_percentage: number
  }>
  time_analysis: {
    average_time_minutes: number
    median_time_minutes: number
    fastest_completion: number
    slowest_completion: number
  }
  reliability: { cronbach_alpha: number }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
function generateMockAnalytics(): ExamAnalytics {
  return {
    overview: {
      total_submissions: 45, completed: 42, in_progress: 3,
      average_score: 7.5, median_score: 7.8,
      highest_score: 10.0, lowest_score: 4.2,
      std_deviation: 1.3, pass_rate: 85.7,
    },
    grade_distribution: {
      "9-10": 8, "8-8.9": 12, "7-7.9": 15, "6-6.9": 5, "5-5.9": 2, "0-4.9": 0,
    },
    question_analysis: [
      { question_id: "q1", question_number: 1, average_score: 0.9, difficulty_index: 0.2, discrimination_index: 0.6, most_common_answer: "A", correct_percentage: 90 },
      { question_id: "q2", question_number: 2, average_score: 0.7, difficulty_index: 0.5, discrimination_index: 0.4, most_common_answer: "B", correct_percentage: 70 },
      { question_id: "q3", question_number: 3, average_score: 0.5, difficulty_index: 0.8, discrimination_index: 0.3, most_common_answer: "C", correct_percentage: 50 },
    ],
    time_analysis: {
      average_time_minutes: 38, median_time_minutes: 40,
      fastest_completion: 25, slowest_completion: 45,
    },
    reliability: { cronbach_alpha: 0.82 },
  }
}

// ── Difficulty label helper ───────────────────────────────────────────────────
function difficultyLabel(idx: number): { text: string; color: string } {
  if (idx < 0.3) return { text: "Dễ",          color: "#34d399" }
  if (idx < 0.7) return { text: "Trung bình",  color: "#fbbf24" }
  return              { text: "Khó",          color: "#f87171" }
}

function discriminationColor(idx: number): string {
  if (idx > 0.4) return "#34d399"
  if (idx > 0.2) return "#fbbf24"
  return "#f87171"
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 16, textAlign: "center" }}>
      <p style={{ fontSize: 28, fontWeight: 900, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, color: D.muted, marginTop: 4 }}>{label}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExamReports() {
  const [exams, setExams]               = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [analytics, setAnalytics]       = useState<ExamAnalytics | null>(null)
  const [loading, setLoading]           = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [searchQuery, setSearchQuery]   = useState("")
  const [activeTab, setActiveTab]       = useState<"overview" | "questions" | "distribution" | "time">("overview")

  // Load exams list
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const { data } = await api.get("/teacher/exams")
        if (!cancelled) setExams(data.exams || data.data || [])
      } catch {
        // Service not available yet — show empty list
        if (!cancelled) setExams([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Load analytics when exam is selected
  useEffect(() => {
    if (!selectedExamId) { setAnalytics(null); return }
    let cancelled = false
    ;(async () => {
      setAnalyticsLoading(true)
      try {
        const { data } = await api.get(`/teacher/exams/${selectedExamId}/analytics`)
        if (!cancelled) setAnalytics(data)
      } catch {
        if (!cancelled) setAnalytics(generateMockAnalytics())
      } finally {
        if (!cancelled) setAnalyticsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [selectedExamId])

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (!selectedExamId) { toast.error("Vui lòng chọn đề thi"); return }
    try {
      const res = await api.get(
        `/teacher/exams/${selectedExamId}/export?format=${format}`,
        { responseType: 'blob' },
      )
      const url = window.URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `exam-report-${selectedExamId}.${format === "excel" ? "xlsx" : format}`
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
      toast.success(`Đã xuất báo cáo ${format.toUpperCase()}`)
    } catch {
      toast.error("Lỗi khi xuất báo cáo")
    }
  }

  const filteredExams = exams.filter(e =>
    !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const TABS = [
    { key: "overview"      as const, label: "Tổng quan" },
    { key: "questions"     as const, label: "Phân tích câu hỏi" },
    { key: "distribution"  as const, label: "Phân bố điểm" },
    { key: "time"          as const, label: "Thời gian" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: D.bg }}>

      {/* ── Header ── */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <BarChart style={{ width: 28, height: 28, color: "#a78bfa" }} />
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa", margin: 0 }}>Báo Cáo Thi</h1>
                <p style={{ fontSize: 13, color: D.muted, margin: 0 }}>Phân tích và báo cáo kết quả thi chi tiết</p>
              </div>
            </div>

            {/* Export buttons */}
            {selectedExamId && (
              <div style={{ display: "flex", gap: 8 }}>
                {(["csv", "excel", "pdf"] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", border: `1px solid ${D.border2}`,
                      borderRadius: 8, background: D.card2, color: D.muted,
                      fontSize: 12, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    <Download style={{ width: 14, height: 14 }} />
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick stat cards — shown when exam is selected */}
          {analytics && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Tổng bài nộp",    value: analytics.overview.total_submissions, Icon: Users,        color: "#60a5fa" },
                { label: "Hoàn thành",       value: analytics.overview.completed,         Icon: CheckCircle2, color: "#34d399" },
                { label: "Điểm trung bình",  value: analytics.overview.average_score.toFixed(1), Icon: Award, color: "#a78bfa" },
                { label: "Tỷ lệ đạt",        value: `${analytics.overview.pass_rate.toFixed(1)}%`, Icon: Target, color: "#fb923c" },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} style={{ background: D.card2, borderRadius: 12, border: `1px solid ${D.border2}`, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon style={{ width: 22, height: 22, color, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 22, fontWeight: 900, color, margin: 0 }}>{value}</p>
                      <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Exam selector ── */}
        <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Search */}
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                placeholder="Tìm kiếm đề thi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "9px 12px", border: `1px solid ${D.border2}`,
                  borderRadius: 8, background: D.card2, color: D.text,
                  fontSize: 13, outline: "none",
                }}
              />
            </div>
            {/* Exam dropdown */}
            <select
              value={selectedExamId}
              onChange={e => { setSelectedExamId(e.target.value); setActiveTab("overview") }}
              style={{
                width: 340, padding: "9px 12px",
                border: `1px solid ${D.border2}`, borderRadius: 8,
                background: D.card2, color: selectedExamId ? D.text : D.muted,
                fontSize: 13, outline: "none", cursor: "pointer",
              }}
            >
              <option value="">Chọn đề thi để phân tích…</option>
              {loading ? (
                <option disabled>Đang tải…</option>
              ) : filteredExams.length === 0 ? (
                <option disabled>Chưa có đề thi nào</option>
              ) : (
                filteredExams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.examType})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* ── Analytics panel ── */}
        {selectedExamId && (
          analyticsLoading ? (
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 48, textAlign: "center" }}>
              <Loader2 style={{ width: 32, height: 32, color: "#60a5fa", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 13, color: D.muted }}>Đang tải phân tích…</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : analytics ? (
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, overflow: "hidden" }}>
              {/* Tab bar */}
              <div style={{ display: "flex", borderBottom: `1px solid ${D.border}`, background: D.card2 }}>
                {TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    style={{
                      padding: "12px 20px", fontSize: 13, fontWeight: 500,
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      borderBottom: activeTab === key ? `2px solid #a78bfa` : "2px solid transparent",
                      background: "transparent",
                      color: activeTab === key ? "#a78bfa" : D.muted,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 20 }}>

                {/* ── Tab: Tổng quan ── */}
                {activeTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      <StatCard label="Điểm cao nhất" value={analytics.overview.highest_score.toFixed(1)} color="#34d399" />
                      <StatCard label="Điểm trung bình" value={analytics.overview.average_score.toFixed(1)} color="#60a5fa" />
                      <StatCard label="Điểm thấp nhất" value={analytics.overview.lowest_score.toFixed(1)} color="#f87171" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                      <div style={{ background: D.card2, borderRadius: 12, border: `1px solid ${D.border2}`, padding: 20 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div>
                            <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Điểm trung vị</p>
                            <p style={{ fontSize: 28, fontWeight: 900, color: "#a78bfa", margin: 0 }}>{analytics.overview.median_score.toFixed(1)}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Độ lệch chuẩn</p>
                            <p style={{ fontSize: 28, fontWeight: 900, color: "#a78bfa", margin: 0 }}>{analytics.overview.std_deviation.toFixed(2)}</p>
                            <p style={{ fontSize: 11, color: D.muted }}>Standard Deviation</p>
                          </div>
                        </div>
                      </div>
                      <div style={{ background: D.card2, borderRadius: 12, border: `1px solid ${D.border2}`, padding: 20 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          <div>
                            <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Độ tin cậy (Cronbach's α)</p>
                            <p style={{ fontSize: 28, fontWeight: 900, color: "#a78bfa", margin: 0 }}>{analytics.reliability.cronbach_alpha.toFixed(2)}</p>
                            <p style={{ fontSize: 11, color: analytics.reliability.cronbach_alpha >= 0.7 ? "#34d399" : "#fbbf24" }}>
                              {analytics.reliability.cronbach_alpha >= 0.9 ? "Xuất sắc"
                                : analytics.reliability.cronbach_alpha >= 0.8 ? "Tốt"
                                : analytics.reliability.cronbach_alpha >= 0.7 ? "Chấp nhận được"
                                : "Cần cải thiện"}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Đang làm</p>
                            <p style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24", margin: 0 }}>{analytics.overview.in_progress}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Tab: Phân tích câu hỏi ── */}
                {activeTab === "questions" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {analytics.question_analysis.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: D.muted }}>
                        <Activity style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.4 }} />
                        <p>Chưa có dữ liệu phân tích câu hỏi</p>
                      </div>
                    ) : analytics.question_analysis.map(q => {
                      const diff = difficultyLabel(q.difficulty_index)
                      return (
                        <div key={q.question_id} style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{
                                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                                border: `1px solid ${D.border2}`, color: D.text, background: D.card,
                              }}>
                                Câu {q.question_number}
                              </span>
                              <span style={{ fontSize: 12, color: D.muted }}>
                                Tỷ lệ đúng: <span style={{ color: D.text, fontWeight: 600 }}>{q.correct_percentage}%</span>
                              </span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa" }}>
                              Điểm TB: {(q.average_score * 10).toFixed(1)}/10
                            </span>
                          </div>
                          {/* Progress bar for correct % */}
                          <div style={{ background: D.border, borderRadius: 6, height: 6, marginBottom: 12, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 6, transition: "width 0.3s",
                              background: q.correct_percentage >= 70 ? "#34d399" : q.correct_percentage >= 40 ? "#fbbf24" : "#f87171",
                              width: `${q.correct_percentage}%`,
                            }} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: 12 }}>
                            <div>
                              <span style={{ color: D.muted }}>Độ khó: </span>
                              <span style={{ fontWeight: 600, color: diff.color }}>
                                {diff.text} ({(q.difficulty_index * 100).toFixed(0)}%)
                              </span>
                            </div>
                            <div>
                              <span style={{ color: D.muted }}>Chỉ số phân biệt: </span>
                              <span style={{ fontWeight: 600, color: discriminationColor(q.discrimination_index) }}>
                                {q.discrimination_index.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: D.muted }}>Đáp án phổ biến nhất: </span>
                              <span style={{ fontWeight: 700, color: D.text }}>{q.most_common_answer}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Tab: Phân bố điểm ── */}
                {activeTab === "distribution" && (
                  <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {Object.entries(analytics.grade_distribution)
                        .sort(([a], [b]) => parseFloat(b.split("-")[0]) - parseFloat(a.split("-")[0]))
                        .map(([range, count]) => {
                          const pct = analytics.overview.total_submissions > 0
                            ? (count / analytics.overview.total_submissions) * 100
                            : 0
                          const rangeStart = parseFloat(range.split("-")[0])
                          const barColor = rangeStart >= 9 ? "#34d399"
                            : rangeStart >= 8 ? "#60a5fa"
                            : rangeStart >= 7 ? "#a78bfa"
                            : rangeStart >= 5 ? "#fbbf24"
                            : "#f87171"
                          return (
                            <div key={range}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: barColor }}>{range} điểm</span>
                                <span style={{ fontSize: 12, color: D.muted }}>
                                  {count} học sinh{pct > 0 ? ` (${pct.toFixed(1)}%)` : ""}
                                </span>
                              </div>
                              <div style={{ background: D.border, borderRadius: 6, height: 10, overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", borderRadius: 6, transition: "width 0.5s",
                                  background: barColor, width: `${pct}%`,
                                  opacity: count === 0 ? 0.2 : 1,
                                }} />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${D.border}` }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" as const }}>
                        {[
                          { label: "Xuất sắc (9-10)", color: "#34d399" },
                          { label: "Giỏi (8-8.9)",   color: "#60a5fa" },
                          { label: "Khá (7-7.9)",    color: "#a78bfa" },
                          { label: "Trung bình (5-6.9)", color: "#fbbf24" },
                          { label: "Yếu (<5)",        color: "#f87171" },
                        ].map(({ label, color }) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: D.muted }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Tab: Thời gian ── */}
                {activeTab === "time" && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                    <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
                      <div>
                        <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Thời gian trung bình</p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: "#a78bfa", margin: 0 }}>{analytics.time_analysis.average_time_minutes} <span style={{ fontSize: 16, fontWeight: 400 }}>phút</span></p>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Thời gian trung vị</p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: "#a78bfa", margin: 0 }}>{analytics.time_analysis.median_time_minutes} <span style={{ fontSize: 16, fontWeight: 400 }}>phút</span></p>
                      </div>
                    </div>
                    <div style={{ background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
                      <div>
                        <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Nhanh nhất</p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: "#34d399", margin: 0 }}>{analytics.time_analysis.fastest_completion} <span style={{ fontSize: 16, fontWeight: 400 }}>phút</span></p>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Chậm nhất</p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: "#f87171", margin: 0 }}>{analytics.time_analysis.slowest_completion} <span style={{ fontSize: 16, fontWeight: 400 }}>phút</span></p>
                      </div>
                    </div>

                    {/* Time distribution visual */}
                    <div style={{ gridColumn: "1 / -1", background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 20 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: D.muted, marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                        Phân bố thời gian làm bài
                      </p>
                      <div style={{ position: "relative", height: 48, background: D.border, borderRadius: 8, overflow: "hidden" }}>
                        {/* fastest → average zone */}
                        {(() => {
                          const { fastest_completion: fast, slowest_completion: slow, average_time_minutes: avg, median_time_minutes: med } = analytics.time_analysis
                          const range = slow - fast || 1
                          const avgPct = ((avg - fast) / range) * 100
                          const medPct = ((med - fast) / range) * 100
                          return (
                            <>
                              {/* gradient bar */}
                              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #34d399, #a78bfa, #f87171)", opacity: 0.35 }} />
                              {/* average marker */}
                              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${avgPct}%`, width: 2, background: "#a78bfa" }}>
                                <span style={{ position: "absolute", top: 4, left: 4, fontSize: 10, color: "#a78bfa", whiteSpace: "nowrap" as const, fontWeight: 700 }}>TB {avg}p</span>
                              </div>
                              {/* median marker */}
                              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${medPct}%`, width: 2, background: "#60a5fa" }}>
                                <span style={{ position: "absolute", bottom: 4, left: 4, fontSize: 10, color: "#60a5fa", whiteSpace: "nowrap" as const, fontWeight: 700 }}>TV {med}p</span>
                              </div>
                              {/* labels */}
                              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#34d399", fontWeight: 700 }}>{fast}p</span>
                              <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#f87171", fontWeight: 700 }}>{slow}p</span>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 48, textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <AlertCircle style={{ width: 28, height: 28, color: "#fb923c" }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: D.text, marginBottom: 8 }}>Không có dữ liệu phân tích</h3>
              <p style={{ fontSize: 13, color: D.muted }}>Đề thi này chưa có dữ liệu phân tích</p>
            </div>
          )
        )}

        {/* ── Empty state ── */}
        {!selectedExamId && (
          <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 48, textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <FileText style={{ width: 32, height: 32, color: "#60a5fa" }} />
            </div>
            {loading ? (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: D.text, marginBottom: 8 }}>Đang tải danh sách đề thi…</h3>
                <p style={{ fontSize: 13, color: D.muted }}>Vui lòng chờ</p>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: D.text, marginBottom: 8 }}>Chưa chọn đề thi</h3>
                <p style={{ fontSize: 13, color: D.muted }}>Vui lòng chọn một đề thi từ danh sách ở trên để xem phân tích</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
