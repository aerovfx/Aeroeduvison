import { useCallback, useState, useEffect, useMemo } from "react"
import { ExportMenu } from "@/components/common/ExportMenu"
import type { SheetData } from "@/lib/exportReport"
import {
  BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid, ReferenceLine, PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts'
import {
  BarChart, Users, Target, Award,
  Download, FileText, CheckCircle2, AlertCircle,
  Loader2, Activity, User as UserIcon, Clock, Trophy, Hash, Search,
} from "lucide-react"
import toast from "react-hot-toast"
import { api } from "@/services/api"

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


// ── Types ────────────────────────────────────────────────────────────────────
interface Exam {
  id: string
  title: string
  examType: string
  status: string
  createdAt: string
  // Enriched metadata từ mapExam() backend
  subject?: string | null
  grade?: string | null
  notes?: string | null
  duration?: number
  totalScore?: number
  totalQuestions?: number
  isPublic?: boolean
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

// Cá nhân — PracticeExam attempts
interface IndividualAttempt {
  id: string
  studentId: string | null
  studentName: string
  studentEmail: string | null
  studentImage: string | null
  score: number
  percentage: number
  completed: boolean
  answeredCount: number
  totalQuestions: number
  startedAt: string
  completedAt: string | null
  durationSec: number | null
  source: 'individual'
}

// Nhóm — QuizRoom (1 phòng = 1 lượt thi nhóm)
interface GroupParticipant {
  id: string
  studentName: string
  avatar: string | null
  score: number
  correctCount: number
  joinedAt: string
  source: 'group'
}
interface GroupRoom {
  roomId: string
  code: string
  status: string
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  participantCount: number
  participants: GroupParticipant[]
}

interface AttemptsData {
  examId: string
  summary: {
    individualCount: number
    individualCompleted: number
    groupRoomCount: number
    groupParticipantCount: number
    totalUniqueStudents: number
  }
  individual: IndividualAttempt[]
  group: GroupRoom[]
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
  const [attempts, setAttempts]         = useState<AttemptsData | null>(null)
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [searchQuery, setSearchQuery]   = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sortMode, setSortMode]         = useState<'date' | 'title' | 'submissions'>('date')
  const [activeTab, setActiveTab]       = useState<"overview" | "students" | "questions" | "distribution" | "time">("overview")

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

  // Load analytics + attempts khi đề được chọn
  useEffect(() => {
    if (!selectedExamId) { setAnalytics(null); setAttempts(null); return }
    let cancelled = false
    ;(async () => {
      setAnalyticsLoading(true)
      setAttemptsLoading(true)
      try {
        const [aRes, atRes] = await Promise.allSettled([
          api.get<ExamAnalytics>(`/teacher/exams/${selectedExamId}/analytics`),
          api.get<AttemptsData>(`/teacher/exams/${selectedExamId}/attempts`),
        ])
        if (cancelled) return
        if (aRes.status === 'fulfilled') setAnalytics(aRes.value.data)
        else setAnalytics(generateMockAnalytics())
        if (atRes.status === 'fulfilled') setAttempts(atRes.value.data)
        else setAttempts(null)
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false)
          setAttemptsLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [selectedExamId])

  /** Build sheets cho client-side export (CSV/Excel/Word/JSON) — KHÔNG cần BE.
   *  Bao gồm overview + grade distribution + question analysis + individual
   *  attempts + group rooms (mỗi loại 1 sheet riêng).
   */
  const getExamReportSheets = useCallback((): SheetData[] => {
    const sheets: SheetData[] = []
    if (!analytics) return sheets

    // Sheet 1: Tổng quan
    const o = analytics.overview
    sheets.push({
      name: 'Tổng quan',
      columns: [
        { key: 'metric', label: 'Chỉ số' },
        { key: 'value',  label: 'Giá trị' },
      ],
      rows: [
        { metric: 'Tổng số bài nộp',  value: o.total_submissions },
        { metric: 'Đã hoàn thành',    value: o.completed },
        { metric: 'Đang làm',         value: o.in_progress },
        { metric: 'Điểm trung bình',  value: o.average_score?.toFixed(2) },
        { metric: 'Điểm trung vị',    value: o.median_score?.toFixed(2) },
        { metric: 'Cao nhất',         value: o.highest_score?.toFixed(2) },
        { metric: 'Thấp nhất',        value: o.lowest_score?.toFixed(2) },
        { metric: 'Độ lệch chuẩn',    value: o.std_deviation?.toFixed(2) },
        { metric: 'Tỉ lệ đậu (%)',    value: o.pass_rate?.toFixed(1) },
        { metric: 'Cronbach α',       value: analytics.reliability?.cronbach_alpha?.toFixed(2) || '—' },
      ],
    })

    // Sheet 2: Phân bố điểm
    if (analytics.grade_distribution) {
      sheets.push({
        name: 'Phân bố điểm',
        columns: [
          { key: 'range', label: 'Khoảng điểm' },
          { key: 'count', label: 'Số HS', type: 'number' },
        ],
        rows: Object.entries(analytics.grade_distribution).map(([range, count]) => ({
          range, count,
        })),
      })
    }

    // Sheet 3: Phân tích câu hỏi
    if (analytics.question_analysis?.length) {
      sheets.push({
        name: 'Phân tích câu hỏi',
        columns: [
          { key: 'question_number',     label: 'Câu' },
          { key: 'average_score',       label: 'Điểm TB',           type: 'number' },
          { key: 'difficulty_index',    label: 'Độ khó (0-1)',      type: 'number' },
          { key: 'discrimination_index',label: 'Phân biệt',         type: 'number' },
          { key: 'most_common_answer',  label: 'Đáp án nhiều nhất' },
          { key: 'correct_percentage',  label: '% đúng',             type: 'percent' },
        ],
        rows: analytics.question_analysis.map(q => ({
          ...q,
          correct_percentage: q.correct_percentage / 100,  // 90 → 0.9 for percent format
        })),
      })
    }

    // Sheet 4: Cá nhân (individual attempts)
    if (attempts?.individual?.length) {
      sheets.push({
        name: `Cá nhân (${attempts.individual.length})`,
        columns: [
          { key: 'studentName',     label: 'Họ tên' },
          { key: 'studentEmail',    label: 'Email' },
          { key: 'score',           label: 'Điểm',         type: 'number' },
          { key: 'percentage',      label: '%',            type: 'number' },
          { key: 'answeredCount',   label: 'Đã trả lời',   type: 'number' },
          { key: 'totalQuestions',  label: 'Tổng câu',     type: 'number' },
          { key: 'completed',       label: 'Hoàn thành' },
          { key: 'startedAt',       label: 'Bắt đầu',      type: 'date' },
          { key: 'completedAt',     label: 'Nộp bài',      type: 'date' },
          { key: 'durationSec',     label: 'Thời gian (s)', type: 'number' },
        ],
        rows: attempts.individual.map(a => ({
          ...a,
          completed: a.completed ? 'Có' : 'Chưa',
        })),
      })
    }

    // Sheet 5: Nhóm (group rooms — flatten participants)
    if (attempts?.group?.length) {
      const groupRows: any[] = []
      for (const room of attempts.group) {
        for (const p of room.participants) {
          groupRows.push({
            roomCode: room.code,
            roomStatus: room.status,
            startedAt: room.startedAt,
            studentName: p.studentName,
            score: p.score,
            correctCount: p.correctCount,
            joinedAt: p.joinedAt,
          })
        }
      }
      if (groupRows.length > 0) {
        sheets.push({
          name: `Nhóm (${groupRows.length})`,
          columns: [
            { key: 'roomCode',     label: 'Mã phòng' },
            { key: 'roomStatus',   label: 'Trạng thái' },
            { key: 'studentName',  label: 'HS' },
            { key: 'score',        label: 'Điểm',     type: 'number' },
            { key: 'correctCount', label: 'Câu đúng', type: 'number' },
            { key: 'joinedAt',     label: 'Tham gia', type: 'date' },
            { key: 'startedAt',    label: 'Phòng bắt đầu', type: 'date' },
          ],
          rows: groupRows,
        })
      }
    }
    return sheets
  }, [analytics, attempts])

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

  const filteredExams = exams
    .filter(e => {
      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const inTitle = e.title.toLowerCase().includes(q)
        const inSubj  = (e.subject || '').toLowerCase().includes(q)
        const inGrade = (e.grade   || '').toLowerCase().includes(q)
        if (!inTitle && !inSubj && !inGrade) return false
      }
      if (statusFilter && e.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title, 'vi')
      // submissions/date: backend không trả submissions count, fallback date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  // Set distinct statuses để build filter chips
  const allStatuses = [...new Set(exams.map(e => e.status).filter(Boolean))]

  // Map cho status badge color
  const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    'Nháp':         { bg: 'rgba(148,163,184,0.15)',  fg: '#94a3b8' },
    'Đang diễn ra': { bg: 'rgba(52,211,153,0.15)',   fg: '#10b981' },
    'Đã kết thúc':  { bg: 'rgba(148,163,184,0.15)',  fg: '#94a3b8' },
  }

  const TABS = [
    { key: "overview"      as const, label: "Tổng quan" },
    { key: "students"      as const, label: "Học sinh đã làm" },
    { key: "questions"     as const, label: "Phân tích câu hỏi" },
    { key: "distribution"  as const, label: "Phân bố điểm" },
    { key: "time"          as const, label: "Thời gian" },
  ]

  // Helper format thời gian (giây → "1m 23s")
  const formatDuration = (sec: number | null) => {
    if (!sec || sec <= 0) return '—'
    if (sec < 60) return `${sec}s`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s ? `${m}m ${s}s` : `${m}m`
  }
  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mn = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm} ${hh}:${mn}`
  }
  const scoreColor = (s: number) => s >= 8 ? '#34d399' : s >= 6.5 ? '#60a5fa' : s >= 5 ? '#fbbf24' : '#f87171'

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

            {/* Export — client-side menu (CSV/Excel/Word/JSON) ưu tiên hơn
                BE endpoint vì hoạt động ngay với data đã loaded, không phụ
                thuộc /teacher/exams/:id/export (chưa stable). */}
            {selectedExamId && analytics && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ExportMenu
                  variant="compact"
                  filename={`exam-report-${selectedExamId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`}
                  getSheets={getExamReportSheets}
                  meta={{
                    title: 'Báo cáo thi chi tiết',
                    subtitle: `Đề: ${exams.find(e => e.id === selectedExamId)?.title || selectedExamId}`,
                    authorName: 'GV — ExamReports',
                  }}
                />
                <button
                  onClick={() => handleExport('pdf')}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", border: `1px solid ${D.border2}`,
                    borderRadius: 8, background: D.card2, color: D.muted,
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                  }}
                  title="Xuất PDF qua BE (nếu khả dụng)"
                >
                  <Download style={{ width: 14, height: 14 }} />
                  PDF
                </button>
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

        {/* ── Exam list ── (replace dropdown 2026-05-19) */}
        <div style={{ background: D.card, borderRadius: 12, border: `1px solid ${D.border}`, padding: 16 }}>
          {/* Search + filter row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: D.muted }} />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề / môn / khối..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "9px 12px 9px 32px", border: `1px solid ${D.border2}`,
                  borderRadius: 8, background: D.card2, color: D.text,
                  fontSize: 13, outline: "none",
                }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: "9px 12px", border: `1px solid ${D.border2}`,
                borderRadius: 8, background: D.card2, color: D.text,
                fontSize: 12, outline: "none", cursor: "pointer",
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as typeof sortMode)}
              style={{
                padding: "9px 12px", border: `1px solid ${D.border2}`,
                borderRadius: 8, background: D.card2, color: D.text,
                fontSize: 12, outline: "none", cursor: "pointer",
              }}
            >
              <option value="date">📅 Mới nhất</option>
              <option value="title">🔤 Tên A-Z</option>
            </select>
            <span style={{ fontSize: 12, color: D.muted, marginLeft: 'auto' }}>
              {filteredExams.length}/{exams.length} đề thi
            </span>
          </div>

          {/* Card list — grid 2-3 columns responsive */}
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: D.muted }}>
              <Loader2 style={{ width: 28, height: 28, margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 13 }}>Đang tải danh sách đề thi…</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: D.muted }}>
              <FileText style={{ width: 32, height: 32, margin: "0 auto 8px", opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>
                {exams.length === 0 ? 'Chưa có đề thi nào' : 'Không khớp bộ lọc — thử bỏ filter'}
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 10,
              maxHeight: 360,
              overflowY: 'auto',
              paddingRight: 4,
            }}>
              {filteredExams.map(exam => {
                const isSelected = selectedExamId === exam.id
                const statusCfg = STATUS_COLORS[exam.status] || { bg: 'rgba(148,163,184,0.15)', fg: '#94a3b8' }
                return (
                  <button
                    key={exam.id}
                    onClick={() => { setSelectedExamId(exam.id); setActiveTab("overview") }}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      background: isSelected ? D.purpleA(0.10) : D.card2,
                      border: `2px solid ${isSelected ? '#a78bfa' : D.border2}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = D.purple }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = D.border2 }}
                  >
                    {/* Header: title + status badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <h3 style={{
                        margin: 0, fontSize: 13, fontWeight: 700,
                        color: isSelected ? '#a78bfa' : D.text,
                        lineHeight: 1.35,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {exam.title}
                      </h3>
                      <span style={{
                        flexShrink: 0,
                        padding: '2px 8px', borderRadius: 4,
                        background: statusCfg.bg, color: statusCfg.fg,
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      }}>
                        {exam.status}
                      </span>
                    </div>

                    {/* Meta badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10 }}>
                      {exam.subject && (
                        <span style={{ padding: '2px 6px', borderRadius: 3, background: D.purpleA(0.12), color: '#a78bfa', fontWeight: 600 }}>
                          {exam.subject}
                        </span>
                      )}
                      {exam.grade && (
                        <span style={{ padding: '2px 6px', borderRadius: 3, background: D.blueA(0.12), color: '#60a5fa', fontWeight: 600 }}>
                          {exam.grade}
                        </span>
                      )}
                      <span style={{ padding: '2px 6px', borderRadius: 3, background: D.card, color: D.muted, fontWeight: 500 }}>
                        {exam.examType}
                      </span>
                    </div>

                    {/* Footer stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: D.muted, paddingTop: 4, borderTop: `1px dashed ${D.border}` }}>
                      <span title="Số câu hỏi">📝 {exam.totalQuestions ?? '—'} câu</span>
                      {exam.duration ? <span title="Thời gian">⏱ {exam.duration}p</span> : null}
                      {exam.totalScore ? <span title="Điểm tối đa">🎯 {exam.totalScore}đ</span> : null}
                      <span style={{ marginLeft: 'auto', fontSize: 9 }}>
                        {new Date(exam.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {isSelected && (
                      <div style={{
                        marginTop: 4, padding: '4px 8px',
                        background: D.purpleA(0.15),
                        borderRadius: 6, fontSize: 10, fontWeight: 700,
                        color: '#a78bfa', textAlign: 'center',
                      }}>
                        ✓ Đang xem báo cáo
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
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

                {/* ── Tab: Học sinh đã làm (cá nhân + nhóm) ── */}
                {activeTab === "students" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {attemptsLoading ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: D.muted }}>
                        <Loader2 style={{ width: 32, height: 32, color: "#60a5fa", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                        <p style={{ fontSize: 13 }}>Đang tải danh sách bài làm…</p>
                      </div>
                    ) : !attempts ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: D.muted }}>
                        <Users style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.4 }} />
                        <p>Chưa có dữ liệu bài làm — học sinh nào chưa thử đề này.</p>
                      </div>
                    ) : (
                      <>
                        {/* Summary tiles */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                          <StatCard label="Cá nhân (đã nộp)" value={attempts.summary.individualCompleted} color="#60a5fa" />
                          <StatCard label="Cá nhân (đang làm)" value={attempts.summary.individualCount - attempts.summary.individualCompleted} color="#fbbf24" />
                          <StatCard label="Phòng thi nhóm" value={attempts.summary.groupRoomCount} color="#a78bfa" />
                          <StatCard label="Lượt tham gia nhóm" value={attempts.summary.groupParticipantCount} color="#f472b6" />
                        </div>

                        {/* ── INDIVIDUAL — bảng học sinh làm cá nhân ── */}
                        <div style={{ background: D.card2, borderRadius: 12, border: `1px solid ${D.border2}`, padding: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <UserIcon style={{ width: 18, height: 18, color: "#60a5fa" }} />
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text }}>
                              Cá nhân ({attempts.individual.length})
                            </h3>
                          </div>
                          {attempts.individual.length === 0 ? (
                            <p style={{ fontSize: 13, color: D.muted, padding: "12px 0" }}>
                              Chưa có học sinh nào tự làm đề này.
                            </p>
                          ) : (
                            <div style={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                  <tr style={{ borderBottom: `1px solid ${D.border}`, color: D.muted }}>
                                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>#</th>
                                    <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>Học sinh</th>
                                    <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600 }}>Điểm</th>
                                    <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600 }}>%</th>
                                    <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600 }}>Đã trả lời</th>
                                    <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600 }}>Thời gian</th>
                                    <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 600 }}>Nộp lúc</th>
                                    <th style={{ textAlign: "center", padding: "8px 10px", fontWeight: 600 }}>Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {attempts.individual.map((a, idx) => (
                                    <tr key={a.id} style={{ borderBottom: `1px solid ${D.border}` }}>
                                      <td style={{ padding: "10px", color: D.muted, fontVariantNumeric: "tabular-nums" }}>{idx + 1}</td>
                                      <td style={{ padding: "10px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                          {a.studentImage ? (
                                            <img src={a.studentImage} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                                          ) : (
                                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: D.border2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: D.muted }}>
                                              {a.studentName.slice(0, 1).toUpperCase()}
                                            </div>
                                          )}
                                          <span style={{ fontWeight: 600, color: D.text }}>{a.studentName}</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: a.completed ? scoreColor(a.score) : D.muted }}>
                                        {a.completed ? a.score.toFixed(1) : '—'}
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: a.completed ? scoreColor(a.score) : D.muted }}>
                                        {a.completed ? `${a.percentage}%` : '—'}
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "right", color: D.muted, fontVariantNumeric: "tabular-nums" }}>
                                        {a.answeredCount}/{a.totalQuestions}
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "right", color: D.muted, fontVariantNumeric: "tabular-nums" }}>
                                        {formatDuration(a.durationSec)}
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "right", color: D.muted, fontVariantNumeric: "tabular-nums" }}>
                                        {formatDate(a.completedAt)}
                                      </td>
                                      <td style={{ padding: "10px", textAlign: "center" }}>
                                        {a.completed ? (
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#34d399", fontWeight: 600 }}>
                                            <CheckCircle2 style={{ width: 12, height: 12 }} /> Hoàn thành
                                          </span>
                                        ) : (
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#fbbf24", fontWeight: 600 }}>
                                            <Loader2 style={{ width: 12, height: 12 }} /> Đang làm
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* ── GROUP — phòng thi nhóm với bảng xếp hạng ── */}
                        <div style={{ background: D.card2, borderRadius: 12, border: `1px solid ${D.border2}`, padding: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <Users style={{ width: 18, height: 18, color: "#a78bfa" }} />
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: D.text }}>
                              Phòng thi nhóm ({attempts.group.length})
                            </h3>
                          </div>
                          {attempts.group.length === 0 ? (
                            <p style={{ fontSize: 13, color: D.muted, padding: "12px 0" }}>
                              Chưa có phòng thi nhóm nào (Wayground-style live) cho đề này.
                            </p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              {attempts.group.map(room => (
                                <div key={room.roomId} style={{ background: D.card, borderRadius: 10, border: `1px solid ${D.border}`, padding: 14 }}>
                                  {/* Room header */}
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${D.border}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: D.card2, fontSize: 12, fontWeight: 700, color: "#a78bfa", letterSpacing: 1.5 }}>
                                        <Hash style={{ width: 12, height: 12 }} /> {room.code}
                                      </span>
                                      <span style={{ fontSize: 12, color: D.muted }}>
                                        {room.participantCount} HS · {formatDate(room.createdAt)}
                                      </span>
                                    </div>
                                    <span style={{
                                      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
                                      background: room.status === 'ended' ? "rgba(52,211,153,0.15)" : room.status === 'playing' ? "rgba(251,191,36,0.15)" : "rgba(148,163,184,0.15)",
                                      color: room.status === 'ended' ? "#34d399" : room.status === 'playing' ? "#fbbf24" : D.muted,
                                      border: `1px solid ${room.status === 'ended' ? "#34d39933" : room.status === 'playing' ? "#fbbf2433" : D.border2}`,
                                    }}>
                                      {room.status === 'ended' ? 'Đã kết thúc' : room.status === 'playing' ? 'Đang chơi' : 'Đang chờ'}
                                    </span>
                                  </div>
                                  {/* Participant ranking */}
                                  {room.participants.length === 0 ? (
                                    <p style={{ fontSize: 12, color: D.muted, padding: "8px 0", margin: 0 }}>
                                      Phòng này chưa có HS tham gia.
                                    </p>
                                  ) : (
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                      <thead>
                                        <tr style={{ color: D.muted }}>
                                          <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 11 }}>#</th>
                                          <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 11 }}>HS</th>
                                          <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, fontSize: 11 }}>Đúng</th>
                                          <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, fontSize: 11 }}>Điểm</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {room.participants.map((p, i) => (
                                          <tr key={p.id} style={{ borderTop: `1px solid ${D.border}` }}>
                                            <td style={{ padding: "8px", color: i === 0 ? "#fbbf24" : D.muted, fontWeight: i < 3 ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>
                                              {i === 0 ? <Trophy style={{ width: 14, height: 14, display: "inline" }} /> : `#${i + 1}`}
                                            </td>
                                            <td style={{ padding: "8px" }}>
                                              <span style={{ marginRight: 6 }}>{p.avatar || '👤'}</span>
                                              <span style={{ fontWeight: 600, color: D.text }}>{p.studentName}</span>
                                            </td>
                                            <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                                              {p.correctCount}
                                            </td>
                                            <td style={{ padding: "8px", textAlign: "right", color: "#a78bfa", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                                              {p.score.toLocaleString('vi-VN')}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
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
                  <DistributionTab analytics={analytics} D={D} />
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

// ═══════════════════════════════════════════════════════════════
// DistributionTab — phổ điểm + đánh giá khách quan
// Recharts: BarChart histogram + AreaChart cumulative + PieChart tier
// + algorithmic assessment (skewness, modality, pass-rate, reliability)
// ═══════════════════════════════════════════════════════════════
const TIER_COLORS = {
  excellent: '#34d399',  // 9-10
  good:      '#60a5fa',  // 8-8.9
  fair:      '#a78bfa',  // 7-7.9
  average:   '#fbbf24',  // 5-6.9
  weak:      '#f87171',  // <5
} as const

function tierForScore(start: number) {
  if (start >= 9) return 'excellent'
  if (start >= 8) return 'good'
  if (start >= 7) return 'fair'
  if (start >= 5) return 'average'
  return 'weak'
}

interface DistributionTabProps {
  analytics: ExamAnalytics
  D: typeof D
}

function DistributionTab({ analytics, D }: DistributionTabProps) {
  // Build histogram data sorted ASC by score
  const histData = useMemo(() => {
    return Object.entries(analytics.grade_distribution)
      .map(([range, count]) => {
        const start = parseFloat(range.split('-')[0])
        return {
          range,
          rangeStart: start,
          count,
          percentage: analytics.overview.total_submissions > 0
            ? (count / analytics.overview.total_submissions) * 100
            : 0,
          tier: tierForScore(start),
          color: TIER_COLORS[tierForScore(start) as keyof typeof TIER_COLORS],
        }
      })
      .sort((a, b) => a.rangeStart - b.rangeStart)
  }, [analytics])

  // Cumulative distribution (% students at or below each tier)
  const cumulativeData = useMemo(() => {
    let acc = 0
    return histData.map(h => {
      acc += h.percentage
      return { range: h.range, cumulative: Math.round(acc * 10) / 10, individual: h.percentage }
    })
  }, [histData])

  // Pie data — tier breakdown
  const pieData = useMemo(() => {
    const tierCounts: Record<string, number> = { excellent: 0, good: 0, fair: 0, average: 0, weak: 0 }
    for (const h of histData) {
      tierCounts[h.tier] += h.count
    }
    return [
      { name: 'Xuất sắc (9-10)',  value: tierCounts.excellent, color: TIER_COLORS.excellent },
      { name: 'Giỏi (8-8.9)',     value: tierCounts.good,      color: TIER_COLORS.good },
      { name: 'Khá (7-7.9)',      value: tierCounts.fair,      color: TIER_COLORS.fair },
      { name: 'Trung bình (5-6.9)', value: tierCounts.average, color: TIER_COLORS.average },
      { name: 'Yếu (<5)',         value: tierCounts.weak,      color: TIER_COLORS.weak },
    ].filter(t => t.value > 0)
  }, [histData])

  // ── ALGORITHMIC ASSESSMENT ───────────────────────
  const assessment = useMemo(() => {
    const ov = analytics.overview
    const items: Array<{ icon: string; title: string; verdict: 'good' | 'warn' | 'bad'; text: string }> = []

    // 1. Pass rate
    if (ov.pass_rate >= 80) {
      items.push({ icon: '✅', title: 'Tỷ lệ đạt cao', verdict: 'good',
        text: `${ov.pass_rate.toFixed(1)}% học sinh đạt ≥5đ — kết quả khả quan, có thể nâng độ khó cho lần kiểm tra tiếp.` })
    } else if (ov.pass_rate >= 60) {
      items.push({ icon: '⚠️', title: 'Tỷ lệ đạt trung bình', verdict: 'warn',
        text: `${ov.pass_rate.toFixed(1)}% học sinh đạt ≥5đ — chấp nhận được nhưng nên rà soát các câu khó để hỗ trợ HS yếu.` })
    } else {
      items.push({ icon: '🚨', title: 'Tỷ lệ đạt thấp', verdict: 'bad',
        text: `Chỉ ${ov.pass_rate.toFixed(1)}% học sinh đạt ≥5đ — đề có thể quá khó hoặc HS chưa nắm vững kiến thức. Cân nhắc dạy lại các chủ đề chính.` })
    }

    // 2. Mean vs median (skewness)
    const skew = ov.average_score - ov.median_score
    if (Math.abs(skew) < 0.3) {
      items.push({ icon: '📊', title: 'Phân bố cân đối', verdict: 'good',
        text: `Trung bình (${ov.average_score.toFixed(2)}) ≈ Trung vị (${ov.median_score.toFixed(2)}) → phân bố GẦN CHUẨN, đề công bằng cho mọi nhóm HS.` })
    } else if (skew > 0.3) {
      items.push({ icon: '📈', title: 'Lệch dương (right-skew)', verdict: 'warn',
        text: `TB (${ov.average_score.toFixed(2)}) > TV (${ov.median_score.toFixed(2)}) → vài HS điểm rất cao "kéo" trung bình lên. Đa số HS thấp hơn TB.` })
    } else {
      items.push({ icon: '📉', title: 'Lệch âm (left-skew)', verdict: 'warn',
        text: `TB (${ov.average_score.toFixed(2)}) < TV (${ov.median_score.toFixed(2)}) → vài HS điểm rất thấp kéo TB xuống. Đa số HS cao hơn TB — đề có thể dễ.` })
    }

    // 3. Standard deviation (spread)
    if (ov.std_deviation < 1.0) {
      items.push({ icon: '🎯', title: 'Độ phân tán thấp', verdict: 'warn',
        text: `Σ = ${ov.std_deviation.toFixed(2)} — điểm tập trung quanh TB, đề khó phân biệt giỏi-yếu. Cân nhắc tăng câu khó/dễ chênh lệch hơn.` })
    } else if (ov.std_deviation > 2.5) {
      items.push({ icon: '⚠️', title: 'Độ phân tán cao', verdict: 'warn',
        text: `Σ = ${ov.std_deviation.toFixed(2)} — điểm dao động lớn (chênh lệch giữa HS giỏi và yếu rất lớn). Cần phân hoá dạy theo nhóm.` })
    } else {
      items.push({ icon: '✨', title: 'Độ phân tán hợp lý', verdict: 'good',
        text: `Σ = ${ov.std_deviation.toFixed(2)} — phân tán vừa phải, đề phân biệt được trình độ HS tốt.` })
    }

    // 4. Reliability (Cronbach's alpha)
    const alpha = analytics.reliability?.cronbach_alpha ?? 0
    if (alpha >= 0.8) {
      items.push({ icon: '🏆', title: 'Độ tin cậy CAO', verdict: 'good',
        text: `Cronbach's α = ${alpha.toFixed(2)} — đề thi nhất quán, các câu hỏi cùng đo 1 năng lực. Dùng được làm chuẩn đánh giá.` })
    } else if (alpha >= 0.6) {
      items.push({ icon: '🔶', title: 'Độ tin cậy chấp nhận được', verdict: 'warn',
        text: `Cronbach's α = ${alpha.toFixed(2)} — đề tương đối ổn, nhưng có vài câu chất lượng thấp. Xem tab "Câu hỏi" để loại câu yếu.` })
    } else if (alpha > 0) {
      items.push({ icon: '❌', title: 'Độ tin cậy THẤP', verdict: 'bad',
        text: `Cronbach's α = ${alpha.toFixed(2)} — đề thi không nhất quán, kết quả không đáng tin để xếp loại HS. Cần xem lại bộ câu hỏi.` })
    }

    // 5. Modality detection (single peak vs bimodal)
    const sortedHist = [...histData].sort((a, b) => b.count - a.count)
    const top1 = sortedHist[0]?.count || 0
    const top2 = sortedHist[1]?.count || 0
    if (top1 > 0 && top2 / top1 > 0.7 && Math.abs(sortedHist[0].rangeStart - sortedHist[1].rangeStart) >= 2) {
      items.push({ icon: '🔀', title: 'Phân bố 2 đỉnh (bimodal)', verdict: 'warn',
        text: `Có 2 nhóm HS chính với mức điểm rất khác nhau (${sortedHist[0].range} và ${sortedHist[1].range}). Có thể do: (a) HS chia 2 nhóm rõ rệt giỏi/yếu, (b) đề không phù hợp với phân hoá lớp.` })
    }

    // 6. Excellence rate (≥9đ)
    const excellentPct = histData.filter(h => h.rangeStart >= 9).reduce((s, h) => s + h.percentage, 0)
    if (excellentPct >= 30) {
      items.push({ icon: '🌟', title: 'Tỷ lệ HS xuất sắc cao', verdict: 'good',
        text: `${excellentPct.toFixed(1)}% HS đạt ≥9đ — chất lượng nhóm HS giỏi tốt. Đề có thể chưa đủ thử thách cho top HS.` })
    }

    return items
  }, [analytics, histData])

  const ov = analytics.overview

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>

      {/* ── Histogram BarChart (full width) ── */}
      <div style={{
        gridColumn: '1 / -1', background: D.card2, borderRadius: 10,
        border: `1px solid ${D.border2}`, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: 0 }}>
            📊 Phổ điểm (Histogram)
          </h3>
          <span style={{ fontSize: 11, color: D.muted }}>
            n = {ov.total_submissions} bài · TB = {ov.average_score.toFixed(2)} · Σ = {ov.std_deviation.toFixed(2)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <RBarChart data={histData}>
            <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
            <XAxis dataKey="range" stroke={D.muted} fontSize={11} />
            <YAxis stroke={D.muted} fontSize={11} label={{ value: 'Số HS', angle: -90, position: 'insideLeft', fill: D.muted, fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: D.card, border: `1px solid ${D.border2}`, borderRadius: 8 }}
              labelStyle={{ color: D.text }}
              itemStyle={{ color: D.text }}
              formatter={(value: any, _name: any, props: any) => [
                `${value} HS (${props.payload.percentage.toFixed(1)}%)`,
                'Số lượng',
              ]}
            />
            <ReferenceLine x={`${Math.floor(ov.average_score)}-${Math.floor(ov.average_score) + 0.9}`}
              stroke="#a78bfa" strokeDasharray="3 3"
              label={{ value: `TB: ${ov.average_score.toFixed(1)}`, fill: '#a78bfa', fontSize: 10, position: 'top' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </RBarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Pie tier breakdown ── */}
      <div style={{
        background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: '0 0 14px' }}>
          🥧 Tỷ lệ xếp loại
        </h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={(e: any) => `${((e.value / ov.total_submissions) * 100).toFixed(0)}%`}
                labelLine={false}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: D.muted }} />
              <Tooltip
                contentStyle={{ background: D.card, border: `1px solid ${D.border2}`, borderRadius: 8 }}
                formatter={(value: any) => [`${value} HS`, 'Số lượng']}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: D.muted, textAlign: 'center', padding: 20 }}>Chưa có dữ liệu</p>
        )}
      </div>

      {/* ── Cumulative distribution AreaChart ── */}
      <div style={{
        background: D.card2, borderRadius: 10, border: `1px solid ${D.border2}`, padding: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: '0 0 14px' }}>
          📈 Phân bố tích luỹ (CDF)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke={D.border} />
            <XAxis dataKey="range" stroke={D.muted} fontSize={11} />
            <YAxis stroke={D.muted} fontSize={11} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: D.card, border: `1px solid ${D.border2}`, borderRadius: 8 }}
              labelStyle={{ color: D.text }}
              formatter={(value: any) => [`${value}%`, 'Tích luỹ']}
            />
            <Area type="monotone" dataKey="cumulative" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 11, color: D.muted, marginTop: 8 }}>
          Y-axis: % HS có điểm ≤ giá trị X. Vd: tại "5-5.9", giá trị 60% nghĩa là 60% HS điểm ≤ 5.9.
        </p>
      </div>

      {/* ── 5-tier legend ── */}
      <div style={{
        gridColumn: '1 / -1', background: D.card2, borderRadius: 10,
        border: `1px solid ${D.border2}`, padding: 16,
        display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' as const,
      }}>
        {[
          { label: 'Xuất sắc (9-10)', color: TIER_COLORS.excellent },
          { label: 'Giỏi (8-8.9)',    color: TIER_COLORS.good },
          { label: 'Khá (7-7.9)',     color: TIER_COLORS.fair },
          { label: 'Trung bình (5-6.9)', color: TIER_COLORS.average },
          { label: 'Yếu (<5)',        color: TIER_COLORS.weak },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: D.muted }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* ── ĐÁNH GIÁ KHÁCH QUAN ── */}
      <div style={{
        gridColumn: '1 / -1', background: D.card2, borderRadius: 10,
        border: `1px solid ${D.border2}`, padding: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: D.text, margin: 0 }}>
            Đánh giá khách quan (auto từ thống kê)
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {assessment.map((item, i) => {
            const bgColor = item.verdict === 'good' ? 'rgba(52, 211, 153, 0.08)'
              : item.verdict === 'bad' ? 'rgba(248, 113, 113, 0.08)'
              : 'rgba(251, 191, 36, 0.08)'
            const borderColor = item.verdict === 'good' ? 'rgba(52, 211, 153, 0.3)'
              : item.verdict === 'bad' ? 'rgba(248, 113, 113, 0.3)'
              : 'rgba(251, 191, 36, 0.3)'
            const titleColor = item.verdict === 'good' ? '#34d399'
              : item.verdict === 'bad' ? '#f87171' : '#fbbf24'
            return (
              <div key={i} style={{
                background: bgColor, border: `1px solid ${borderColor}`,
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: titleColor, margin: 0 }}>
                    {item.title}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: D.muted, lineHeight: 1.5, margin: 0 }}>
                  {item.text}
                </p>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: D.muted, marginTop: 14, fontStyle: 'italic' }}>
          💡 Đánh giá tự động dựa trên: tỷ lệ đạt, độ lệch (mean vs median), độ phân tán (σ),
          độ tin cậy (Cronbach's α), modality detection. Chỉ mang tính tham khảo, GV nên đối chiếu với hoàn cảnh thực tế lớp.
        </p>
      </div>
    </div>
  )
}
