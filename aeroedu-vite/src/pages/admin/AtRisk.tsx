import { useState, useMemo } from 'react'
import {
  AlertTriangle, TrendingDown, TrendingUp, Minus,
  Brain, Play, CheckCircle, Clock, XCircle,
  Users, Filter, ChevronDown, ChevronUp, Eye,
  MessageSquare, UserCheck, Zap,
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
interface RiskFactor {
  factor: string
  weight: number
  trend: 'declining' | 'stable' | 'improving'
}

interface Recommendation {
  title: string
  expectedImpact: number
  confidence: number
}

interface AtRiskStudent {
  id: string
  studentName: string
  avatar: string
  class: string
  riskScore: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  factors: RiskFactor[]
  recommendations: Recommendation[]
  status: 'new' | 'in_progress' | 'resolved'
  assignedTo?: string
  createdAt: string
  lastActive: string
  emotionTag: string
}

/* ─────────────────────────────────────────────────────────────
   Mock data  (same shape as API, enriched)
───────────────────────────────────────────────────────────── */
const MOCK_STUDENTS: AtRiskStudent[] = [
  {
    id: 'risk_1',
    studentName: 'Phạm Đức Duy',
    avatar: 'PD',
    class: '10C',
    riskScore: 88,
    riskLevel: 'critical',
    factors: [
      { factor: 'Không đăng nhập 7 ngày', weight: 0.35, trend: 'declining' },
      { factor: 'XP giảm 28%', weight: 0.25, trend: 'declining' },
      { factor: 'Cảm xúc cuối: Thất vọng', weight: 0.20, trend: 'stable' },
      { factor: 'Điểm quiz < 40%', weight: 0.15, trend: 'declining' },
      { factor: 'Không có tương tác nhóm', weight: 0.05, trend: 'stable' },
    ],
    recommendations: [
      { title: 'Đặt lịch tư vấn 1-1 ngay', expectedImpact: 0.80, confidence: 0.91 },
      { title: 'Liên hệ phụ huynh khẩn cấp', expectedImpact: 0.72, confidence: 0.85 },
      { title: 'Giao bạn hỗ trợ học tập', expectedImpact: 0.58, confidence: 0.74 },
    ],
    status: 'new',
    createdAt: '10 phút trước',
    lastActive: '7 ngày trước',
    emotionTag: '😞 Thất vọng',
  },
  {
    id: 'risk_2',
    studentName: 'Ngô Văn Inh',
    avatar: 'NI',
    class: '10A',
    riskScore: 74,
    riskLevel: 'high',
    factors: [
      { factor: 'Thời gian học giảm dần', weight: 0.30, trend: 'declining' },
      { factor: 'Phát hiện căng thẳng 3 lần', weight: 0.25, trend: 'stable' },
      { factor: 'Yêu cầu trợ giúp tăng', weight: 0.20, trend: 'improving' },
      { factor: 'Tỉ lệ hoàn thành quiz thấp', weight: 0.15, trend: 'declining' },
      { factor: 'Độ thành thạo dưới mục tiêu', weight: 0.10, trend: 'stable' },
    ],
    recommendations: [
      { title: 'Điều chỉnh độ khó lộ trình học', expectedImpact: 0.70, confidence: 0.87 },
      { title: 'Cung cấp gia sư chuyên biệt', expectedImpact: 0.68, confidence: 0.80 },
      { title: 'Gửi nội dung tạo động lực', expectedImpact: 0.45, confidence: 0.72 },
    ],
    status: 'in_progress',
    assignedTo: 'Cô Nguyễn Thị Lan',
    createdAt: '2 giờ trước',
    lastActive: '5 ngày trước',
    emotionTag: '😰 Căng thẳng',
  },
  {
    id: 'risk_3',
    studentName: 'Hoàng Thị Em',
    avatar: 'HE',
    class: '11B',
    riskScore: 51,
    riskLevel: 'medium',
    factors: [
      { factor: 'Điểm quiz dao động bất thường', weight: 0.40, trend: 'stable' },
      { factor: 'Giảm thời gian học cuối tuần', weight: 0.30, trend: 'declining' },
      { factor: 'Chú ý thấp trong giờ livestream', weight: 0.20, trend: 'stable' },
      { factor: 'Hoàn thành bài tập chậm', weight: 0.10, trend: 'improving' },
    ],
    recommendations: [
      { title: 'Kiểm tra mức độ hiểu bài', expectedImpact: 0.60, confidence: 0.78 },
      { title: 'Nhắc lịch học theo lịch cố định', expectedImpact: 0.52, confidence: 0.70 },
    ],
    status: 'in_progress',
    assignedTo: 'Thầy Trần Văn Minh',
    createdAt: '1 ngày trước',
    lastActive: '2 ngày trước',
    emotionTag: '😐 Trung tính',
  },
  {
    id: 'risk_4',
    studentName: 'Lê Minh Châu',
    avatar: 'LC',
    class: '11A',
    riskScore: 22,
    riskLevel: 'low',
    factors: [
      { factor: 'Đã giải quyết vấn đề cảm xúc', weight: 0.50, trend: 'improving' },
      { factor: 'XP phục hồi +18%', weight: 0.30, trend: 'improving' },
      { factor: 'Tham gia nhóm trở lại', weight: 0.20, trend: 'improving' },
    ],
    recommendations: [
      { title: 'Tiếp tục theo dõi hàng tuần', expectedImpact: 0.40, confidence: 0.85 },
    ],
    status: 'resolved',
    createdAt: '3 ngày trước',
    lastActive: 'Hôm nay',
    emotionTag: '😊 Tích cực',
  },
]

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function riskStyle(level: string): { ring: string; score: string; badge: string } {
  switch (level) {
    case 'critical': return { ring: 'border-red-500/40 bg-red-500/[0.04]', score: 'text-red-400', badge: 'bg-red-500/15 text-red-300 border-red-500/30' }
    case 'high':     return { ring: 'border-orange-400/40 bg-orange-400/[0.04]', score: 'text-orange-400', badge: 'bg-orange-400/15 text-orange-300 border-orange-400/30' }
    case 'medium':   return { ring: 'border-yellow-400/40 bg-yellow-400/[0.04]', score: 'text-yellow-300', badge: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30' }
    default:         return { ring: 'border-green-500/30 bg-green-500/[0.03]', score: 'text-green-400', badge: 'bg-green-500/15 text-green-300 border-green-500/30' }
  }
}

function statusConfig(s: AtRiskStudent['status']): { icon: React.ElementType; label: string; cls: string } {
  if (s === 'new')         return { icon: AlertTriangle, label: 'Mới',       cls: 'bg-red-500/15 text-red-300 border-red-500/25' }
  if (s === 'in_progress') return { icon: Clock,         label: 'Đang xử lý', cls: 'bg-orange-400/15 text-orange-300 border-orange-400/25' }
  return                          { icon: CheckCircle,   label: 'Đã giải quyết', cls: 'bg-green-500/15 text-green-300 border-green-500/25' }
}

function trendIcon(trend: RiskFactor['trend']) {
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />
  if (trend === 'improving') return <TrendingUp   className="w-4 h-4 text-green-400" />
  return <Minus className="w-4 h-4 text-white/30" />
}

/* ─────────────────────────────────────────────────────────────
   Student card
───────────────────────────────────────────────────────────── */
function StudentCard({ student }: { student: AtRiskStudent }) {
  const [expanded, setExpanded] = useState(student.riskLevel === 'critical' || student.riskLevel === 'high')
  const st = riskStyle(student.riskLevel)
  const stat = statusConfig(student.status)
  const StatIcon = stat.icon

  // score ring progress for SVG
  const r = 26
  const circ = 2 * Math.PI * r
  const dash = (student.riskScore / 100) * circ

  return (
    <div className={`rounded-2xl border p-6 transition-all ${st.ring}`}>
      {/* ── Top row ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}
          >
            {student.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-lg font-bold text-white/90">{student.studentName}</h3>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${st.badge}`}>
                {student.riskLevel.toUpperCase()} RISK
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                {student.class}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${stat.cls}`}>
                <StatIcon className="w-3 h-3" /> {stat.label}
              </span>
            </div>
            <p className="text-xs text-white/40">
              {student.createdAt} &nbsp;•&nbsp; Hoạt động cuối: {student.lastActive} &nbsp;•&nbsp; {student.emotionTag}
            </p>
          </div>
        </div>

        {/* Risk score ring */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative w-[70px] h-[70px]">
            <svg width="70" height="70" className="-rotate-90">
              <circle cx="35" cy="35" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="5" fill="none" />
              <circle
                cx="35" cy="35" r={r}
                stroke={student.riskLevel === 'critical' ? '#f56565' : student.riskLevel === 'high' ? '#ed8936' : student.riskLevel === 'medium' ? '#ecc94b' : '#48bb78'}
                strokeWidth="5" fill="none"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black leading-none ${st.score}`}>{student.riskScore}</span>
              <span className="text-[9px] text-white/35 uppercase tracking-wider">risk</span>
            </div>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-white/[0.06] grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contributing factors */}
          <div>
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" /> Yếu tố nguy cơ
            </h4>
            <div className="space-y-2.5">
              {student.factors.map((f, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70">{f.factor}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white/50">{Math.round(f.weight * 100)}%</span>
                      {trendIcon(f.trend)}
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.05]">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${f.weight * 100}%`,
                        background: f.trend === 'declining' ? 'linear-gradient(90deg,#f56565,#e53e3e)'
                          : f.trend === 'improving' ? 'linear-gradient(90deg,#48bb78,#38a169)'
                          : 'linear-gradient(90deg,#718096,#4a5568)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI recommendations */}
          <div>
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> AI Đề Xuất Can Thiệp
            </h4>
            <div className="space-y-2.5">
              {student.recommendations.map((rec, i) => (
                <button
                  key={i}
                  className="w-full p-3.5 rounded-xl text-left border border-violet-500/20 bg-violet-500/[0.05]
                    hover:border-violet-500/40 hover:bg-violet-500/[0.10] hover:-translate-y-0.5 transition-all group"
                  onClick={() => alert(`Thực hiện: ${rec.title}`)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors">
                      {rec.title}
                    </span>
                    <Play className="w-4 h-4 text-violet-400 group-hover:text-violet-300 transition-colors flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span>Tác động: <span className="text-emerald-400 font-semibold">{Math.round(rec.expectedImpact * 100)}%</span></span>
                    <span>Độ tin cậy: <span className="text-blue-400 font-semibold">{Math.round(rec.confidence * 100)}%</span></span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer: assigned / actions ── */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-white/45">
            {student.assignedTo
              ? <>Phụ trách: <span className="font-semibold text-white/70">{student.assignedTo}</span></>
              : <span className="italic text-white/30">Chưa phân công</span>}
          </div>
          <div className="flex gap-2">
            {student.status !== 'resolved' && (
              <>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white/85 hover:bg-white/[0.08] transition-all">
                  <UserCheck className="w-3.5 h-3.5" /> Phân công
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white/85 hover:bg-white/[0.08] transition-all">
                  <MessageSquare className="w-3.5 h-3.5" /> Nhắn tin
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                  text-white hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
                  <Eye className="w-3.5 h-3.5" /> Xem hồ sơ
                </button>
              </>
            )}
            {student.status === 'resolved' && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                bg-green-500/15 text-green-300 border border-green-500/25">
                <CheckCircle className="w-3.5 h-3.5" /> Đã giải quyết
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
export default function AtRisk() {
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const counts = {
    critical: MOCK_STUDENTS.filter(s => s.riskLevel === 'critical').length,
    high:     MOCK_STUDENTS.filter(s => s.riskLevel === 'high').length,
    medium:   MOCK_STUDENTS.filter(s => s.riskLevel === 'medium').length,
    resolved: MOCK_STUDENTS.filter(s => s.status === 'resolved').length,
  }

  const filtered = useMemo(() => {
    return MOCK_STUDENTS.filter(s => {
      const lvlOk = filterLevel === 'all' || s.riskLevel === filterLevel
      const stOk  = filterStatus === 'all' || s.status === filterStatus
      return lvlOk && stOk
    }).sort((a, b) => b.riskScore - a.riskScore)
  }, [filterLevel, filterStatus])

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] p-6 md:p-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/30">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-300 bg-clip-text text-transparent"
            style={{ letterSpacing: '-1px' }}>
            At-Risk &amp; Intervention Manager
          </h1>
        </div>
        <p className="text-white/45 font-medium ml-1">
          Hệ thống can thiệp sớm tích hợp AI – phát hiện và hỗ trợ học sinh có nguy cơ
        </p>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Nghiêm trọng', value: counts.critical, color: 'text-red-400',    icon: XCircle,      bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Cao',         value: counts.high,     color: 'text-orange-400',  icon: AlertTriangle, bg: 'bg-orange-400/10 border-orange-400/20' },
          { label: 'Trung bình',  value: counts.medium,   color: 'text-yellow-300',  icon: Clock,        bg: 'bg-yellow-400/10 border-yellow-400/20' },
          { label: 'Đã giải quyết hôm nay', value: counts.resolved, color: 'text-green-400', icon: CheckCircle, bg: 'bg-green-500/10 border-green-500/20' },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl border p-5 transition-all ${s.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-white/50 font-medium">{s.label}</p>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/50">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Lọc:</span>
        </div>

        {/* Level pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all',      label: 'Tất cả',     cls: 'bg-white/[0.05] text-white/60 border-white/[0.08] hover:border-white/20' },
            { value: 'critical', label: 'Nghiêm trọng', cls: 'bg-red-500/10 text-red-300 border-red-500/25 hover:bg-red-500/20' },
            { value: 'high',     label: 'Cao',         cls: 'bg-orange-400/10 text-orange-300 border-orange-400/25 hover:bg-orange-400/20' },
            { value: 'medium',   label: 'Trung bình',  cls: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/25 hover:bg-yellow-400/20' },
            { value: 'low',      label: 'Thấp',        cls: 'bg-green-500/10 text-green-300 border-green-500/25 hover:bg-green-500/20' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setFilterLevel(p.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${p.cls}
                ${filterLevel === p.value ? 'ring-2 ring-white/20' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all',        label: 'Tất cả trạng thái' },
            { value: 'new',        label: 'Mới' },
            { value: 'in_progress',label: 'Đang xử lý' },
            { value: 'resolved',   label: 'Đã giải quyết' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setFilterStatus(p.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all
                bg-white/[0.03] border-white/[0.08] text-white/55 hover:text-white/80 hover:bg-white/[0.07]
                ${filterStatus === p.value ? 'ring-2 ring-violet-500/40 text-violet-300 border-violet-500/30' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-white/30 font-medium">
          {filtered.length} / {MOCK_STUDENTS.length} học sinh
        </span>
      </div>

      {/* ── AI alert banner (critical only) ── */}
      {counts.critical > 0 && filterLevel !== 'low' && filterLevel !== 'medium' && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/30 bg-red-500/[0.06] mb-6">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-300 mb-0.5">
              🚨 {counts.critical} học sinh ở mức NGHIÊM TRỌNG cần can thiệp ngay
            </p>
            <p className="text-xs text-white/45">
              AI phát hiện nguy cơ cao dựa trên XP, cảm xúc, và hành vi học tập. Hãy xem đề xuất và hành động ngay.
            </p>
          </div>
        </div>
      )}

      {/* ── Student cards ── */}
      <div className="space-y-4">
        {filtered.map(student => (
          <StudentCard key={student.id} student={student} />
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <Users className="w-16 h-16 text-white/15 mb-4" />
            <p className="text-white/50 font-semibold text-lg">Không có học sinh phù hợp</p>
            <p className="text-white/30 text-sm mt-1">Thử thay đổi bộ lọc</p>
          </div>
        )}
      </div>
    </div>
  )
}
