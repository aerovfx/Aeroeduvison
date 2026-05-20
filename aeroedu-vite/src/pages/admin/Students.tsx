import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search, Users, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Brain, Heart, Zap,
  Eye, MessageSquare, ChevronRight, Activity, Award, Target, Clock,
  Lock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ExportMenu } from '@/components/common/ExportMenu'
import type { SheetData } from '@/lib/exportReport'
import { adminUsersService, type AdminUser } from '@/services/adminUsers.service'

/* ────────────────────────────────────────────────
   Types
──────────────────────────────────────────────── */
interface Student {
  id: string
  name: string
  email: string
  avatar: string
  class: string
  currentXP: number
  xpChange: number
  masteryPercentage: number
  emotionScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastActive: string
}

interface PLGSkill {
  name: string
  mastery: number
  status: 'mastered' | 'learning' | 'review' | 'struggling'
  nextReview?: string
  predictedGain?: number
}

interface TimelineEvent {
  id: string
  type: 'quiz' | 'login' | 'emotion_spike' | 'intervention' | 'achievement'
  title: string
  timestamp: string
  details?: string
  xpGained?: number
  emotionChange?: { from: string; to: string }
}

interface AISuggestion {
  id: string
  type: 'alert' | 'suggestion' | 'opportunity'
  title: string
  description: string
  confidence: number
  action: string
}

/* ────────────────────────────────────────────────
   Mock data
──────────────────────────────────────────────── */
const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Nguyễn Văn An', email: 'an.nv@school.edu', avatar: 'NA', class: 'Class 10A', currentXP: 2450, xpChange: 15.3, masteryPercentage: 82, emotionScore: 8.5, riskLevel: 'low', lastActive: 'Today' },
  { id: '2', name: 'Trần Thị Bình', email: 'binh.tt@school.edu', avatar: 'TB', class: 'Class 10B', currentXP: 1820, xpChange: -8.5, masteryPercentage: 45, emotionScore: 5.5, riskLevel: 'high', lastActive: '5 days ago' },
  { id: '3', name: 'Lê Minh Châu', email: 'chau.lm@school.edu', avatar: 'LC', class: 'Class 11A', currentXP: 3100, xpChange: 22.1, masteryPercentage: 91, emotionScore: 9.0, riskLevel: 'low', lastActive: 'Today' },
  { id: '4', name: 'Phạm Đức Duy', email: 'duy.pd@school.edu', avatar: 'PD', class: 'Class 10C', currentXP: 890, xpChange: -15.2, masteryPercentage: 18, emotionScore: 4.0, riskLevel: 'critical', lastActive: '10 days ago' },
  { id: '5', name: 'Hoàng Thị Em', email: 'em.ht@school.edu', avatar: 'HE', class: 'Class 11B', currentXP: 2200, xpChange: 8.7, masteryPercentage: 68, emotionScore: 7.5, riskLevel: 'medium', lastActive: 'Yesterday' },
  { id: '6', name: 'Đặng Văn Phong', email: 'phong.dv@school.edu', avatar: 'DP', class: 'Class 12A', currentXP: 4200, xpChange: 31.0, masteryPercentage: 96, emotionScore: 9.5, riskLevel: 'low', lastActive: 'Today' },
  { id: '7', name: 'Vũ Thị Giang', email: 'giang.vt@school.edu', avatar: 'VG', class: 'Class 10A', currentXP: 1650, xpChange: 5.2, masteryPercentage: 57, emotionScore: 7.0, riskLevel: 'medium', lastActive: '2 days ago' },
  { id: '8', name: 'Bùi Minh Hải', email: 'hai.bm@school.edu', avatar: 'BH', class: 'Class 11C', currentXP: 1900, xpChange: 11.8, masteryPercentage: 63, emotionScore: 7.2, riskLevel: 'low', lastActive: 'Today' },
]

const MOCK_PLG_SKILLS: PLGSkill[] = [
  { name: 'Linear Equations', mastery: 0.92, status: 'mastered', nextReview: '5 days' },
  { name: 'Quadratic Functions', mastery: 0.75, status: 'learning', predictedGain: 0.15 },
  { name: 'Trigonometry', mastery: 0.45, status: 'struggling', predictedGain: 0.08 },
  { name: 'Calculus Basics', mastery: 0.68, status: 'learning', predictedGain: 0.12 },
  { name: 'Statistics', mastery: 0.88, status: 'mastered', nextReview: '3 days' },
  { name: 'Geometry', mastery: 0.52, status: 'review', nextReview: 'today' },
]

const MOCK_TIMELINE: TimelineEvent[] = [
  { id: '1', type: 'quiz', title: 'Completed Algebra Quiz', timestamp: '2 hours ago', details: 'Score: 85% • Time: 15 minutes', xpGained: 120 },
  { id: '2', type: 'emotion_spike', title: 'Emotion Change Detected', timestamp: '5 hours ago', emotionChange: { from: 'Confused', to: 'Focused' } },
  { id: '3', type: 'achievement', title: 'Unlocked: Problem Solver', timestamp: '1 day ago', details: 'Solved 10 challenging problems in a row', xpGained: 250 },
  { id: '4', type: 'intervention', title: 'Teacher Check-in', timestamp: '2 days ago', details: 'Provided personalized feedback' },
  { id: '5', type: 'login', title: 'Started Learning Session', timestamp: '2 days ago' },
]

const MOCK_AI_SUGGESTIONS: AISuggestion[] = [
  { id: '1', type: 'alert', title: 'Low Engagement Alert', description: "Student hasn't logged in for 3 consecutive days. Consider sending a check-in message.", confidence: 0.87, action: 'Send Message' },
  { id: '2', type: 'suggestion', title: 'Recommend Reteach Module', description: 'Trigonometry mastery is below 50%. A targeted review module could help.', confidence: 0.82, action: 'Assign Module' },
  { id: '3', type: 'opportunity', title: 'Ready for Advancement', description: 'Student shows high consistency in Linear Equations. Consider advancing to next topic.', confidence: 0.91, action: 'Adjust Path' },
]

const CLASSES = ['all', 'Class 10A', 'Class 10B', 'Class 10C', 'Class 11A', 'Class 11B', 'Class 11C', 'Class 12A']

/* ────────────────────────────────────────────────
   Helper functions
──────────────────────────────────────────────── */
function getRiskVariant(level: string): 'success' | 'warning' | 'danger' {
  switch (level) {
    case 'critical': return 'danger'
    case 'high': return 'warning'
    case 'medium': return 'warning'
    default: return 'success'
  }
}

function getSkillStatusColor(status: string): string {
  switch (status) {
    case 'mastered': return '#48bb78'
    case 'learning': return '#4299e1'
    case 'review': return '#ed8936'
    case 'struggling': return '#f56565'
    default: return '#718096'
  }
}

function getEventConfig(type: string): { Icon: React.ElementType; color: string } {
  switch (type) {
    case 'quiz': return { Icon: Award, color: '#4299e1' }
    case 'login': return { Icon: Activity, color: '#48bb78' }
    case 'emotion_spike': return { Icon: Heart, color: '#f56565' }
    case 'intervention': return { Icon: MessageSquare, color: '#9f7aea' }
    case 'achievement': return { Icon: Zap, color: '#ed8936' }
    default: return { Icon: CheckCircle, color: '#718096' }
  }
}

/* ────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────── */
function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' }) {
  const styles: Record<string, string> = {
    default: 'bg-white/[0.06] text-white/70 border-white/[0.08]',
    success: 'bg-green-500/15 text-green-300 border-green-500/25',
    danger: 'bg-red-500/15 text-red-300 border-red-500/25',
    warning: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    info: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  )
}

function StatCard({ label, value, subValue, icon: Icon, iconColor }: { label: string; value: string | number; subValue?: string; icon: React.ElementType; iconColor: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 hover:border-white/[0.12] transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-white/45 font-medium">{label}</span>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <p className="text-2xl font-bold text-white/90">{value}</p>
      {subValue && <p className="text-sm mt-1 font-semibold text-emerald-400">{subValue}</p>}
    </div>
  )
}

/* Circular mastery ring */
function MasteryRing({ pct }: { pct: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="relative w-[72px] h-[72px] mx-auto">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="5" fill="none" />
        <circle
          cx="36" cy="36" r={r}
          stroke="url(#masteryGrad)"
          strokeWidth="5" fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="masteryGrad">
            <stop offset="0%" stopColor="#4299e1" />
            <stop offset="100%" stopColor="#9f7aea" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/90">
        {pct}%
      </span>
    </div>
  )
}

/* ────────────────────────────────────────────────
   Detail View
──────────────────────────────────────────────── */
function StudentDetailView({ student, onBack }: { student: Student; onBack: () => void }) {
  return (
    <div className="animate-[fadeIn_0.4s_ease-out]">
      {/* Back + header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="mb-6 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white/90 hover:bg-white/[0.07] transition-all text-sm font-medium"
        >
          ← Quay lại danh sách
        </button>

        <div className="flex items-start justify-between flex-wrap gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {student.avatar}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                {student.name}
              </h1>
              <p className="text-white/50">{student.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="info">{student.class}</Badge>
                <Badge variant={getRiskVariant(student.riskLevel)}>
                  {student.riskLevel.toUpperCase()} Risk
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white/90 hover:bg-white/[0.07] transition-all text-sm font-semibold">
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Target className="w-4 h-4" /> Adjust Path
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        <StatCard label="Current XP" value={student.currentXP} subValue={`+${student.xpChange}%`} icon={TrendingUp} iconColor="#48bb78" />
        <StatCard label="Mastery" value={`${student.masteryPercentage}%`} icon={Award} iconColor="#4299e1" />
        <StatCard label="Emotion Score" value={`${student.emotionScore}/10`} icon={Heart} iconColor="#f56565" />
        <StatCard label="Last Active" value={student.lastActive} icon={Clock} iconColor="#718096" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: PLG + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* PLG Skills */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6">
            <h2 className="text-xl font-bold text-white/90 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              Personal Learning Graph
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MOCK_PLG_SKILLS.map((skill, i) => (
                <div key={i}
                  className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-white/[0.12] hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">{skill.name}</span>
                    <div className="w-3 h-3 rounded-full" style={{ background: getSkillStatusColor(skill.status) }} />
                  </div>
                  <div className="mb-3">
                    <div className="w-full rounded-full h-2 bg-white/[0.05]">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${skill.mastery * 100}%`,
                          background: 'linear-gradient(90deg, #4299e1 0%, #667eea 100%)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs">
                    {skill.predictedGain ? (
                      <span className="text-emerald-400 font-semibold">
                        +{Math.round(skill.predictedGain * 100)}% gain predicted
                      </span>
                    ) : skill.nextReview ? (
                      <span className="text-white/40">Review in {skill.nextReview}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6">
            <h2 className="text-xl font-bold text-white/90 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4299e1 0%, #667eea 100%)' }}>
                <Activity className="w-5 h-5 text-white" />
              </div>
              Activity Timeline
            </h2>
            <div className="space-y-4">
              {MOCK_TIMELINE.map(event => {
                const { Icon, color } = getEventConfig(event.type)
                return (
                  <div key={event.id} className="flex gap-4 pb-4 last:pb-0 border-l-2 border-white/[0.08] pl-4">
                    <div className="mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                      bg-white/[0.04] border border-white/[0.08]">
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-white/85 text-sm">{event.title}</h3>
                        <span className="text-xs text-white/35 font-medium ml-3 whitespace-nowrap">{event.timestamp}</span>
                      </div>
                      {event.details && (
                        <p className="text-sm text-white/50 mt-1 leading-relaxed">{event.details}</p>
                      )}
                      {event.xpGained && (
                        <span className="inline-block mt-2 px-3 py-0.5 text-xs font-semibold rounded-lg
                          bg-green-500/15 text-green-300 border border-green-500/25">
                          +{event.xpGained} XP
                        </span>
                      )}
                      {event.emotionChange && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="text-white/45">{event.emotionChange.from}</span>
                          <ChevronRight className="w-4 h-4 text-white/25" />
                          <span className="text-blue-300 font-semibold">{event.emotionChange.to}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: AI Suggestions */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 h-fit">
          <h2 className="text-xl font-bold text-white/90 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ed8936 0%, #f56565 100%)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            AI Suggestions
          </h2>
          <div className="space-y-4">
            {MOCK_AI_SUGGESTIONS.map(s => {
              const icon = s.type === 'alert'
                ? <AlertTriangle className="w-5 h-5 text-red-400" />
                : s.type === 'suggestion'
                  ? <Brain className="w-5 h-5 text-blue-400" />
                  : <Zap className="w-5 h-5 text-green-400" />
              const border = s.type === 'alert' ? 'border-red-500/25 bg-red-500/[0.07]'
                : s.type === 'suggestion' ? 'border-blue-500/25 bg-blue-500/[0.07]'
                  : 'border-green-500/25 bg-green-500/[0.07]'

              return (
                <div key={s.id} className={`rounded-xl border p-4 transition-all ${border}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.05]">
                      {icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-white/85 mb-1">{s.title}</h3>
                      <p className="text-xs text-white/50 leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/35">
                      {Math.round(s.confidence * 100)}% confidence
                    </span>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold
                      bg-white/[0.05] border border-white/[0.08] text-violet-300
                      hover:-translate-y-0.5 transition-all">
                      {s.action}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 p-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.07]">
            <p className="text-xs text-white/50 leading-relaxed">
              <strong className="text-violet-400 font-bold">💡 AI Tip:</strong> Suggestions are generated in real-time based on PLG, XP, and emotion data. Click an action to execute automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────
   Real data mapping
──────────────────────────────────────────────── */

/**
 * Map AdminUser (từ DB) → Student (interface UI cũ).
 * Các field analytics (XP, mastery, emotion) chưa có ở backend → tạm
 * dùng placeholder hợp lý (0 / 'Chưa có dữ liệu'). Khi backend bổ sung
 * /api/admin/users/:id/stats → cập nhật mapping thực.
 */
function mapUserToStudent(u: AdminUser): Student {
  // Avatar: 2 chữ đầu của tên
  const initials = (u.name || u.email).split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase().slice(0, 2)
  // Last active: dựa vào lastLoginAt
  let lastActive = 'Chưa đăng nhập'
  if (u.lastLoginAt) {
    const diffH = (Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60)
    if (diffH < 1)        lastActive = 'Vừa xong'
    else if (diffH < 24)  lastActive = `${Math.floor(diffH)} giờ trước`
    else if (diffH < 168) lastActive = `${Math.floor(diffH / 24)} ngày trước`
    else                  lastActive = `${Math.floor(diffH / 168)} tuần trước`
  }
  // Risk: nếu banned → critical, mới đăng ký + chưa login → high, có login → low (placeholder)
  const riskLevel: Student['riskLevel'] =
    u.banned ? 'critical' :
    !u.lastLoginAt ? 'high' :
    'low'
  return {
    id: u.id,
    name: u.name || u.email.split('@')[0],
    email: u.email,
    avatar: initials,
    class: 'Chưa phân lớp',  // TODO: backend trả về class từ ClassStudent
    currentXP: 0,
    xpChange: 0,
    masteryPercentage: 0,
    emotionScore: 0,
    riskLevel,
    lastActive,
  }
}

/* ────────────────────────────────────────────────
   Main Page
──────────────────────────────────────────────── */
export default function Students() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedRisk, setSelectedRisk] = useState('all')
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Fetch real students từ /api/admin/users ────────────────────────────
  // Khác mock cũ: data thật từ DB, không có XP/mastery/emotion → tạm
  // placeholder vì các field này chưa được tính trên backend.
  // Lớp = lấy từ ClassStudent (nếu có) hoặc 'Chưa phân lớp'.
  useEffect(() => {
    setIsLoading(true)
    setLoadError(null)
    adminUsersService.list({ accountType: 'STUDENT', limit: 500, sortBy: 'createdAt', sortOrder: 'desc' })
      .then(({ users, total }) => {
        setTotalCount(total)
        const mapped: Student[] = users.map(u => mapUserToStudent(u))
        setStudents(mapped)
      })
      .catch(err => {
        console.error('[admin:students] load failed', err)
        setLoadError(err?.response?.data?.error || 'Không tải được danh sách học sinh')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase())
        || s.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchClass = selectedClass === 'all' || s.class === selectedClass
      const matchRisk = selectedRisk === 'all' || s.riskLevel === selectedRisk
      return matchSearch && matchClass && matchRisk
    })
  }, [students, searchTerm, selectedClass, selectedRisk])

  /** Build export sheets — main list + breakdown by class + by risk + XP distribution */
  const getStudentsSheets = useCallback((): SheetData[] => {
    if (filtered.length === 0) return []
    const sheets: SheetData[] = []
    sheets.push({
      name: `Danh sách HS (${filtered.length})`,
      columns: [
        { key: 'name',               label: 'Họ tên' },
        { key: 'email',              label: 'Email' },
        { key: 'class',              label: 'Lớp' },
        { key: 'currentXP',          label: 'XP hiện tại',   type: 'number' },
        { key: 'xpChange',           label: 'XP thay đổi',   type: 'number' },
        { key: 'masteryPercentage',  label: 'Mastery %',     type: 'number' },
        { key: 'emotionScore',       label: 'Cảm xúc (1-10)', type: 'number' },
        { key: 'riskLevel',          label: 'Mức rủi ro' },
        { key: 'lastActive',         label: 'Hoạt động gần đây' },
      ],
      rows: filtered,
    })
    // Breakdown by class
    const byClass = new Map<string, { count: number; avgXP: number; avgMastery: number }>()
    for (const s of filtered) {
      const c = byClass.get(s.class) || { count: 0, avgXP: 0, avgMastery: 0 }
      c.count++
      c.avgXP += s.currentXP
      c.avgMastery += s.masteryPercentage
      byClass.set(s.class, c)
    }
    sheets.push({
      name: 'Theo lớp',
      columns: [
        { key: 'class',      label: 'Lớp' },
        { key: 'count',      label: 'Số HS',     type: 'number' },
        { key: 'avgXP',      label: 'XP trung bình',   type: 'number' },
        { key: 'avgMastery', label: 'Mastery TB %',    type: 'number' },
      ],
      rows: Array.from(byClass.entries()).map(([cls, v]) => ({
        class: cls,
        count: v.count,
        avgXP: Math.round(v.avgXP / v.count),
        avgMastery: Math.round(v.avgMastery / v.count),
      })),
    })
    // Breakdown by risk level
    const byRisk = new Map<string, number>()
    for (const s of filtered) byRisk.set(s.riskLevel, (byRisk.get(s.riskLevel) || 0) + 1)
    sheets.push({
      name: 'Theo mức rủi ro',
      columns: [
        { key: 'level', label: 'Mức' },
        { key: 'count', label: 'Số HS', type: 'number' },
        { key: 'pct',   label: 'Tỉ lệ', type: 'percent' },
      ],
      rows: Array.from(byRisk.entries()).map(([level, count]) => ({
        level, count, pct: count / filtered.length,
      })),
    })
    return sheets
  }, [filtered])

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student)
    setViewMode('detail')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Detail view ───────────────────────────────
  if (viewMode === 'detail' && selectedStudent) {
    return (
      <div className="p-6 md:p-8 min-h-screen bg-[hsl(260,30%,8%)]">
        <StudentDetailView student={selectedStudent} onBack={() => setViewMode('list')} />
      </div>
    )
  }

  // ── List view ─────────────────────────────────
  return (
    <div className="p-6 md:p-8 min-h-screen bg-[hsl(260,30%,8%)]">

      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Users className="w-10 h-10 text-violet-400" />
            <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent"
              style={{ letterSpacing: '-1px' }}>
              Student Insights Hub
            </span>
          </h1>
          <p className="text-white/50 font-medium">
            Dữ liệu thật từ DB · Tổng <span className="text-violet-300 font-bold">{totalCount}</span> học sinh đăng ký
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/users?accountType=STUDENT"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition"
          >
            <Lock className="w-3.5 h-3.5" />
            Quản lý (ban/reset)
          </Link>
          <ExportMenu
            filename={`students-${new Date().toISOString().slice(0, 10)}`}
            getSheets={getStudentsSheets}
            meta={{
              title: 'Danh sách Học sinh',
              subtitle: `Xuất sau khi filter (${filtered.length} HS) — AeroEduVision`,
              authorName: 'Admin Dashboard',
            }}
          />
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {loadError}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03]
                text-white/85 placeholder-white/30 text-sm outline-none
                focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
            />
          </div>
          {/* Class filter */}
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/85
              text-sm outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer transition-all"
          >
            <option value="all" className="bg-[hsl(260,30%,12%)]">All Classes</option>
            {CLASSES.filter(c => c !== 'all').map(c => (
              <option key={c} value={c} className="bg-[hsl(260,30%,12%)]">{c}</option>
            ))}
          </select>
          {/* Risk filter */}
          <select
            value={selectedRisk}
            onChange={e => setSelectedRisk(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white/85
              text-sm outline-none focus:ring-2 focus:ring-violet-500/40 cursor-pointer transition-all"
          >
            <option value="all" className="bg-[hsl(260,30%,12%)]">All Risk Levels</option>
            {['critical', 'high', 'medium', 'low'].map(r => (
              <option key={r} value={r} className="bg-[hsl(260,30%,12%)]">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-12 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 animate-spin"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderBottom: '3px solid transparent' }} />
          <p className="text-white/50 font-medium">Loading students...</p>
        </div>
      )}

      {/* Student cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(student => (
            <div key={student.id}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 hover:border-white/[0.12] transition-all">
              <div className="flex items-center justify-between flex-wrap gap-6">
                {/* Left: avatar + info */}
                <div className="flex items-center gap-5">
                  <div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    {student.avatar}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white/90 mb-0.5">{student.name}</h3>
                    <p className="text-sm text-white/45">{student.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="info">{student.class}</Badge>
                      <Badge variant={getRiskVariant(student.riskLevel)}>
                        {student.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Right: metrics + actions */}
                <div className="flex items-center gap-8 flex-wrap">
                  {/* XP */}
                  <div className="text-center">
                    <p className="text-sm text-white/45 font-medium mb-1">XP</p>
                    <p className="text-xl font-bold text-white/90">{student.currentXP}</p>
                    <div className="flex items-center gap-1 text-sm mt-1 justify-center">
                      {student.xpChange > 0
                        ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                        : student.xpChange < 0
                          ? <TrendingDown className="w-4 h-4 text-red-400" />
                          : <Minus className="w-4 h-4 text-white/35" />}
                      <span className={student.xpChange > 0 ? 'text-emerald-400 font-semibold' : student.xpChange < 0 ? 'text-red-400 font-semibold' : 'text-white/45'}>
                        {student.xpChange > 0 ? '+' : ''}{student.xpChange}%
                      </span>
                    </div>
                  </div>

                  {/* Mastery ring */}
                  <div className="text-center">
                    <p className="text-sm text-white/45 font-medium mb-2">Mastery</p>
                    <MasteryRing pct={student.masteryPercentage} />
                  </div>

                  {/* Emotion */}
                  <div className="text-center">
                    <p className="text-sm text-white/45 font-medium mb-1">Emotion</p>
                    <div className="flex items-center gap-2 justify-center">
                      <Heart className="w-5 h-5 text-red-400" />
                      <span className="text-xl font-bold text-white/90">{student.emotionScore}</span>
                      <span className="text-sm text-white/40">/10</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleViewStudent(student)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold
                        hover:-translate-y-0.5 transition-all"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    >
                      <Eye className="w-4 h-4" /> View Details
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                      bg-white/[0.04] border border-white/[0.08] text-white/70
                      hover:text-white/90 hover:bg-white/[0.07] transition-all">
                      <MessageSquare className="w-4 h-4" /> Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
              <h3 className="text-xl font-bold text-white/70 mb-2">No students found</h3>
              <p className="text-white/40">Try adjusting your filters or search term</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
