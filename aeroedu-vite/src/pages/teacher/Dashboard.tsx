/**
 * Teacher AI Dashboard
 * Port of app/(dashboard)/(routes)/teacher/ai-dashboard/page.tsx → Vite
 *
 * Inline: ClassOverview, StudentList, AICoTeacherPanel,
 *         EngagementHeatmap, EmotionTimeline, QuickActions
 * Removes: useRouter → useNavigate, useSession → useAuth, useLanguage → removed
 */

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'
import { LiveLeaderboard } from '@/components/dashboard/LiveLeaderboard'
import { recommendationService as rs, getRsTypeMeta } from '@/services/recommendation.service'
import {
  Users, Brain, TrendingUp, AlertTriangle, Sparkles,
  BarChart3, Heart, Zap, Target, Clock, Award, Eye,
  MessageSquare, BookOpen, Settings, Bell, Trophy,
  Activity, Search, ChevronRight, RefreshCw,
  Flame, Star, CheckCircle, Plus, FileText, Camera,
  Cpu, Lightbulb, ArrowUpRight,
} from 'lucide-react'

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


/* ─── Types ─────────────────────────────────────────────────────── */
interface Student {
  id: string
  name: string
  email: string
  image?: string | null
  totalXP: number
  level: number
  progress: number
  averageScore: number          // 0-10 scale
  lessonsCompleted: number
  examAttempts?: number
  lastActive: string             // formatted "X phút trước"
  lastActiveAt?: string | null   // ISO ts (raw, for sorting)
  emotion: 'happy' | 'neutral' | 'sad' | 'focused' | 'confused'
  atRisk: boolean
  excelling: boolean
  engagement: number             // 0-100
  streak: number                 // consecutive days
  capability: number             // 0-100
  motivation: number             // 0-100
  classes?: { id: string; name: string }[]
}

interface ClassStats {
  totalStudents: number
  classCount?: number
  averageXP: number
  averageProgress: number
  averageScore: number
  averageEngagement: number
  averageCapability: number
  atRiskCount: number
  excellingCount: number
  totalLessonsCompleted?: number
  totalExamAttempts?: number
  activeToday?: number
  activeThisWeek?: number
}

interface ClassInfo { id: string; name: string; studentCount: number }
interface PerformerInfo { id: string; name: string; image: string | null; averageScore: number; level?: number }
interface AttentionInfo { id: string; name: string; image: string | null; averageScore: number; lastActive: string; engagement: number }
interface AiSuggestion {
  type: 'alert' | 'warning' | 'success' | 'tip'
  severity?: 'high' | 'medium' | 'info'
  title: string
  desc: string
  action?: string
}

interface DashboardFullData {
  students: Student[]
  stats: ClassStats
  classes: ClassInfo[]
  emotionCounts: Record<string, number>
  topPerformers: PerformerInfo[]
  needAttention: AttentionInfo[]
  aiSuggestions: AiSuggestion[]
  updatedAt: string
}

const EMOTION_META: Record<string, { icon: string; color: string; label: string }> = {
  happy:   { icon: '😊', color: D.green, label: 'Vui vẻ' },
  neutral: { icon: '😐', color: D.muted, label: 'Bình thường' },
  sad:     { icon: '😢', color: D.red,   label: 'Buồn' },
  focused: { icon: '🎯', color: D.cyan,  label: 'Tập trung' },
  confused:{ icon: '😕', color: D.amber, label: 'Bối rối' },
}

/* ─── Small hover-aware button ──────────────────────────────────── */
function ActionBtn({
  icon: Icon, label, color, onClick,
}: {
  icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties; className?: string }>
  label: string; color: string; onClick?: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '10px 14px', borderRadius: 10,
        background: hov ? `${color}18` : D.white(0.03),
        border: `1px solid ${hov ? color + '44' : D.border}`,
        color: hov ? color : D.text,
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        textAlign: 'left', transition: 'all .15s',
      }}
    >
      <Icon size={16} style={{ color }} />
      {label}
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function TeacherDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [students,     setStudents]     = useState<Student[]>([])
  const [classStats,   setClassStats]   = useState<ClassStats | null>(null)
  const [classes,      setClasses]      = useState<ClassInfo[]>([])
  const [topPerformers, setTopPerformers] = useState<PerformerInfo[]>([])
  const [needAttention, setNeedAttention] = useState<AttentionInfo[]>([])
  const [beSuggestions, setBeSuggestions] = useState<AiSuggestion[]>([])
  const [updatedAt,    setUpdatedAt]    = useState<string>('')
  const [selectedView, setSelectedView] = useState<'overview' | 'heatmap' | 'emotions'>('overview')
  const [timeRange,    setTimeRange]    = useState<'today' | 'week' | 'month'>('week')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'at-risk' | 'excelling'>('all')
  const [loading,      setLoading]      = useState(true)
  const [aiExpanded,   setAiExpanded]   = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [loadError,    setLoadError]    = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoadError(null)
    try {
      // FE Dashboard fetch real BE: /api/teacher/dashboard/full
      // BE return: { students, stats, classes, emotionCounts, topPerformers,
      //              needAttention, aiSuggestions, updatedAt }
      const { data } = await api.get<DashboardFullData>('/teacher/dashboard/full')
      setStudents(data.students || [])
      setClassStats(data.stats || null)
      setClasses(data.classes || [])
      setTopPerformers(data.topPerformers || [])
      setNeedAttention(data.needAttention || [])
      setBeSuggestions(data.aiSuggestions || [])
      setUpdatedAt(data.updatedAt || '')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Không tải được dữ liệu lớp'
      setLoadError(msg)
      // KHÔNG fallback DEMO — show empty state thực tế
      setStudents([]); setClassStats(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setTimeout(() => setRefreshing(false), 600)
  }

  const filteredStudents = students.filter(s => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.email.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterStatus === 'at-risk'   && !s.atRisk)    return false
    if (filterStatus === 'excelling' && !s.excelling) return false
    return true
  })

  /* ─── AI Co-Teacher suggestions — từ BE thật (rule-based on real data) ──── */
  // Map BE shape → FE display shape (icon + color)
  const aiSuggestions = beSuggestions.length > 0
    ? beSuggestions.map(s => {
        const meta = s.severity === 'high' || s.type === 'alert'
          ? { color: D.red,    icon: AlertTriangle }
          : s.type === 'success'
          ? { color: D.green,  icon: Sparkles }
          : s.severity === 'medium' || s.type === 'warning'
          ? { color: D.amber,  icon: AlertTriangle }
          : { color: D.cyan,   icon: Lightbulb }
        return { ...s, ...meta }
      })
    : [
        // Empty fallback hint khi chưa có data — không phải mock
        {
          type: 'tip' as const,
          color: D.cyan, icon: Lightbulb,
          title: classStats?.totalStudents === 0
            ? 'Chưa có HS nào kết nối với bạn'
            : 'Đang phân tích dữ liệu lớp...',
          desc: classStats?.totalStudents === 0
            ? 'Mời HS qua /teacher/student-requests hoặc import lớp tại /teacher/classes'
            : 'AI Co-Teacher sẽ gợi ý khi có đủ dữ liệu hoạt động.',
        },
      ]

  /* ─── Loading ─────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: D.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: `3px solid ${D.purpleA(0.2)}`,
          borderTopColor: D.purple,
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ color: D.muted, fontSize: 14 }}>Đang tải dữ liệu AI Dashboard...</p>
      </div>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
    </div>
  )

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes pulse-dot { 0%,100%{opacity:.4} 50%{opacity:1} }
        @keyframes cam-fab-pop { from{transform:scale(0.6) translateY(20px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
        .td-row:hover { background: rgba(255,255,255,0.025) !important; }
        .td-action-btn:hover { background: rgba(124,58,237,0.15) !important; color: #a78bfa !important; }
        .td-action-btn2:hover { background: rgba(34,211,238,0.12) !important; color: #22d3ee !important; }
        .custom-scrollbar::-webkit-scrollbar { width:4px; height:4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:rgba(124,58,237,.3); border-radius:4px; }
        .cam-fab { animation: cam-fab-pop .3s cubic-bezier(.34,1.56,.64,1) both; }
        .cam-fab:active { transform: scale(0.93) !important; }
        @media (min-width: 768px) { .cam-fab { display: none !important; } }
      `}</style>

      {/* ════ TOP BAR ════ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(13,14,23,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${D.border}`,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

            {/* Left: brand + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `linear-gradient(135deg, ${D.purple}, #5b21b6)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 16px ${D.purpleA(0.4)}`,
              }}>
                <Brain size={20} style={{ color: '#fff' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 18, fontWeight: 800, color: D.text, margin: 0 }}>AI Teacher Dashboard</h1>
                  <span style={{
                    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: D.purpleA(0.15), color: D.purpleL,
                    border: `1px solid ${D.purpleA(0.3)}`,
                  }}>BETA</span>
                </div>
                <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>
                  Xin chào, {user?.name ?? 'Giáo viên'}
                  {classes.length > 0 && ` · ${classes.length} lớp · ${classStats?.totalStudents ?? 0} HS`}
                  {classes.length === 0 && classStats && classStats.totalStudents > 0 && ` · ${classStats.totalStudents} HS đã kết nối`}
                </p>
              </div>
            </div>

            {/* Center: time range */}
            <div style={{ display: 'flex', gap: 4, background: D.white(0.05), borderRadius: 10, padding: 4 }}>
              {(['today', 'week', 'month'] as const).map(r => (
                <button key={r} onClick={() => setTimeRange(r)} style={{
                  padding: '6px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: timeRange === r ? D.purple : 'transparent',
                  color:      timeRange === r ? '#fff'   : D.muted,
                  boxShadow:  timeRange === r ? `0 2px 8px ${D.purpleA(0.4)}` : 'none',
                  transition: 'all .15s',
                }}>
                  {r === 'today' ? 'Hôm nay' : r === 'week' ? 'Tuần này' : 'Tháng này'}
                </button>
              ))}
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleRefresh} style={{
                width: 36, height: 36, borderRadius: 9, background: D.white(0.05),
                border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: D.muted,
              }}>
                <RefreshCw size={15} style={{ animation: refreshing ? 'spin .6s linear' : 'none' }} />
              </button>
              <button style={{
                position: 'relative', width: 36, height: 36, borderRadius: 9,
                background: D.white(0.05), border: `1px solid ${D.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: D.muted,
              }}>
                <Bell size={15} />
                {(classStats?.atRiskCount ?? 0) > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6, width: 7, height: 7,
                    borderRadius: '50%', background: D.red,
                    animation: 'pulse-dot 2s infinite',
                  }} />
                )}
              </button>
              <button
                onClick={() => navigate('/teacher/analytics')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: D.white(0.06), border: `1px solid ${D.border}`,
                  color: D.text, cursor: 'pointer',
                }}
              >
                <BarChart3 size={14} /> Analytics
              </button>
              <button
                onClick={() => navigate('/teacher/classes')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  background: `linear-gradient(135deg,${D.purple},#5b21b6)`,
                  border: 'none', color: '#fff', cursor: 'pointer',
                  boxShadow: `0 2px 12px ${D.purpleA(0.4)}`,
                }}
              >
                <Users size={14} /> Quản lý lớp
              </button>
            </div>
          </div>

          {/* Search + Filter row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: D.muted }} />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 38, paddingRight: 16, paddingTop: 8, paddingBottom: 8,
                  background: D.white(0.05), border: `1px solid ${D.border}`,
                  borderRadius: 9, fontSize: 13, color: D.text, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {(['all', 'at-risk', 'excelling'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)} style={{
                padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                border: `1px solid ${filterStatus === f ? (f === 'at-risk' ? D.red : f === 'excelling' ? D.green : D.purple) + '55' : D.border}`,
                background: filterStatus === f
                  ? (f === 'at-risk' ? D.redA(0.12) : f === 'excelling' ? D.greenA(0.12) : D.purpleA(0.12))
                  : 'transparent',
                color: filterStatus === f
                  ? (f === 'at-risk' ? D.red : f === 'excelling' ? D.green : D.purpleL)
                  : D.muted,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                {f === 'all' ? `Tất cả (${students.length})` : f === 'at-risk' ? `⚠ Cần hỗ trợ (${classStats?.atRiskCount ?? 0})` : `⭐ Xuất sắc (${classStats?.excellingCount ?? 0})`}
              </button>
            ))}
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 3, background: D.white(0.05), borderRadius: 9, padding: 3 }}>
              {([
                { id: 'overview' as const, Icon: BarChart3 },
                { id: 'heatmap'  as const, Icon: Activity },
                { id: 'emotions' as const, Icon: Heart },
              ]).map(({ id, Icon }) => (
                <button key={id} onClick={() => setSelectedView(id)} style={{
                  width: 32, height: 32, borderRadius: 7, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: selectedView === id ? D.purple : 'transparent',
                  color:      selectedView === id ? '#fff'   : D.muted,
                  transition: 'all .15s',
                }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════ MAIN CONTENT ════ */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px', display: 'flex', gap: 20 }}>

        {/* ── Left column (flex-1) ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Error banner */}
          {loadError && (
            <div style={{
              padding: 12, borderRadius: 12,
              background: D.redA(0.08), border: `1px solid ${D.redA(0.3)}`,
              color: D.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <AlertTriangle size={16} />
              <div style={{ flex: 1 }}>
                <strong>Lỗi tải dữ liệu:</strong> {loadError}
              </div>
              <button onClick={handleRefresh} style={{
                padding: '4px 10px', borderRadius: 6, border: `1px solid ${D.redA(0.4)}`,
                background: 'transparent', color: D.red, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>Thử lại</button>
            </div>
          )}

          {/* Empty state — chưa có HS nào */}
          {!loadError && classStats?.totalStudents === 0 && (
            <div style={{
              padding: 24, borderRadius: 14,
              background: D.purpleA(0.05), border: `1px solid ${D.purpleA(0.2)}`,
              textAlign: 'center',
            }}>
              <Users size={32} style={{ color: D.purpleL, margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: D.text, margin: '0 0 6px' }}>
                Chưa có học sinh nào kết nối
              </h3>
              <p style={{ fontSize: 13, color: D.muted, margin: '0 0 16px' }}>
                Mời HS qua link QR hoặc import danh sách lớp để bắt đầu theo dõi tiến độ.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/teacher/student-requests" style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: D.purple, color: '#fff', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none',
                }}>Mời HS</Link>
                <Link to="/teacher/classes" style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: D.white(0.06), color: D.text, fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', border: `1px solid ${D.border}`,
                }}>Quản lý lớp</Link>
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { icon: Users,         color: D.blue,   bg: D.blueA(0.12),   label: 'Học sinh',       value: classStats?.totalStudents ?? 0,        sub: `${classStats?.excellingCount ?? 0} xuất sắc` },
              { icon: Trophy,        color: D.amber,  bg: 'rgba(245,158,11,.12)', label: 'XP trung bình', value: (classStats?.averageXP ?? 0).toLocaleString('vi'), sub: `Cấp độ TB: ${Math.floor((classStats?.averageXP ?? 0) / 1000) + 1}` },
              { icon: Brain,         color: D.purple, bg: D.purpleA(0.12), label: 'Năng lực TB',    value: `${classStats?.averageCapability ?? 0}%`, sub: `Tương tác: ${classStats?.averageEngagement ?? 0}%` },
              { icon: AlertTriangle, color: (classStats?.atRiskCount ?? 0) > 0 ? D.red : D.green,
                bg: (classStats?.atRiskCount ?? 0) > 0 ? D.redA(0.12) : D.greenA(0.12),
                label: 'Cần hỗ trợ', value: classStats?.atRiskCount ?? 0,
                sub: (classStats?.atRiskCount ?? 0) === 0 ? 'Tất cả ổn định ✓' : 'Cần can thiệp ngay' },
            ].map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} style={{
                  background: D.card, border: `1px solid ${D.border}`,
                  borderRadius: 14, padding: 16,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} style={{ color: card.color }} />
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: D.muted, margin: '0 0 2px' }}>{card.label}</p>
                    <p style={{ fontSize: 11, color: D.white(0.4), margin: 0 }}>{card.sub}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* View panel */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4, padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
              {([
                { id: 'overview' as const, label: 'Tổng quan',    Icon: BarChart3 },
                { id: 'heatmap'  as const, label: 'Tương tác',    Icon: Activity },
                { id: 'emotions' as const, label: 'Cảm xúc',      Icon: Heart },
              ]).map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setSelectedView(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer', transition: 'all .15s',
                  background: selectedView === id ? D.purpleA(0.15) : 'transparent',
                  color:      selectedView === id ? D.purpleL : D.muted,
                }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {selectedView === 'overview' && (
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Điểm TB',       value: classStats?.averageScore, suffix: '/10', color: D.green, icon: Star },
                  { label: 'Tiến độ TB',    value: `${classStats?.averageProgress ?? 0}%`, suffix: '',      color: D.cyan,  icon: TrendingUp },
                  { label: 'Tương tác TB',  value: `${classStats?.averageEngagement ?? 0}%`, suffix: '',    color: D.purple, icon: Activity },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={i} style={{ background: D.white(0.03), borderRadius: 12, padding: 16, textAlign: 'center' }}>
                      <Icon size={22} style={{ color: item.color, marginBottom: 8 }} />
                      <p style={{ fontSize: 28, fontWeight: 800, color: item.color, margin: '0 0 4px' }}>{item.value}{item.suffix}</p>
                      <p style={{ fontSize: 12, color: D.muted, margin: 0 }}>{item.label}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Engagement Heatmap */}
            {selectedView === 'heatmap' && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: D.muted, margin: '0 0 8px' }}>Mức độ tương tác theo học sinh ({timeRange === 'today' ? 'hôm nay' : timeRange === 'week' ? 'tuần này' : 'tháng này'})</p>
                {filteredStudents.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: D.text, width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    <div style={{ flex: 1, height: 10, background: D.white(0.06), borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${s.engagement}%`, height: '100%', borderRadius: 99,
                        background: s.engagement >= 70
                          ? `linear-gradient(90deg,${D.green},${D.cyan})`
                          : s.engagement >= 40
                          ? `linear-gradient(90deg,${D.amber},#fbbf24)`
                          : `linear-gradient(90deg,${D.red},#f87171)`,
                        transition: 'width .8s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.engagement >= 70 ? D.green : s.engagement >= 40 ? D.amber : D.red, width: 40, textAlign: 'right' }}>
                      {s.engagement}%
                    </span>
                    {s.atRisk && (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: D.redA(0.12), color: D.red, border: `1px solid ${D.redA(0.3)}`, flexShrink: 0 }}>
                        Cần hỗ trợ
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Emotion Timeline */}
            {selectedView === 'emotions' && (
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  {(['happy', 'neutral', 'focused', 'confused', 'sad'] as const).map(em => {
                    const meta = EMOTION_META[em]
                    const count = students.filter(s => s.emotion === em).length
                    return (
                      <div key={em} style={{
                        flex: 1, padding: '12px 8px', borderRadius: 12,
                        background: `${meta.color}10`, border: `1px solid ${meta.color}30`,
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{meta.icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{count}</div>
                        <div style={{ fontSize: 11, color: D.muted }}>{meta.label}</div>
                      </div>
                    )
                  })}
                </div>
                {/* Emotion per-student row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredStudents.map(s => {
                    const meta = EMOTION_META[s.emotion]
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: D.white(0.02), borderRadius: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{meta.icon}</div>
                        <span style={{ flex: 1, fontSize: 13, color: D.text, fontWeight: 600 }}>{s.name}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}33` }}>{meta.label}</span>
                        <span style={{ fontSize: 12, color: D.muted }}>Streak: {s.streak}🔥</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Student table */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${D.border}` }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>
                Danh sách học sinh <span style={{ color: D.muted, fontWeight: 400, fontSize: 13 }}>({filteredStudents.length})</span>
              </h2>
              <button
                onClick={() => navigate('/teacher/student-insight')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: D.purpleA(0.12), border: `1px solid ${D.purpleA(0.3)}`,
                  color: D.purpleL, cursor: 'pointer',
                }}
              >
                <ArrowUpRight size={13} /> Xem chi tiết
              </button>
            </div>

            <div className="custom-scrollbar" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${D.border}` }}>
                    {['Học sinh', 'XP / Cấp', 'Năng lực', 'Tiến độ', 'Điểm TB', 'Cảm xúc', 'Trạng thái', ''].map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 16px', textAlign: i >= 7 ? 'right' : 'left',
                        fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: '.05em',
                        background: D.white(0.02),
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: D.muted, fontSize: 14 }}>Không tìm thấy học sinh</td></tr>
                  ) : filteredStudents.map(s => {
                    const em = EMOTION_META[s.emotion]
                    return (
                      <tr key={s.id} className="td-row" style={{ borderBottom: `1px solid ${D.border}`, transition: 'background .12s' }}>
                        {/* Name */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: s.atRisk ? D.redA(0.15) : s.excelling ? D.greenA(0.15) : D.purpleA(0.15),
                              border: `1px solid ${s.atRisk ? D.redA(0.4) : s.excelling ? D.greenA(0.4) : D.purpleA(0.35)}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, fontWeight: 700,
                              color: s.atRisk ? D.red : s.excelling ? D.green : D.purpleL,
                              flexShrink: 0,
                            }}>{s.name.charAt(0)}</div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: D.text, margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: 11, color: D.muted, margin: 0 }}>{s.lastActive}</p>
                            </div>
                          </div>
                        </td>
                        {/* XP / Level */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Trophy size={13} style={{ color: D.amber }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{s.totalXP.toLocaleString('vi')}</span>
                          </div>
                          <span style={{ fontSize: 11, color: D.muted }}>Cấp {s.level}</span>
                        </td>
                        {/* Capability */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 64, height: 6, background: D.white(0.06), borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{
                                width: `${s.capability}%`, height: '100%', borderRadius: 99,
                                background: s.capability >= 70 ? D.green : s.capability >= 40 ? D.amber : D.red,
                              }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.capability >= 70 ? D.green : s.capability >= 40 ? D.amber : D.red }}>{s.capability}%</span>
                          </div>
                        </td>
                        {/* Progress */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 64, height: 6, background: D.white(0.06), borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ width: `${s.progress}%`, height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${D.cyan},${D.blue})` }} />
                            </div>
                            <span style={{ fontSize: 12, color: D.muted }}>{s.progress}%</span>
                          </div>
                        </td>
                        {/* Score */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            background: s.averageScore >= 8 ? D.greenA(0.12) : s.averageScore >= 6 ? 'rgba(245,158,11,.12)' : D.redA(0.12),
                            color: s.averageScore >= 8 ? D.green : s.averageScore >= 6 ? D.amber : D.red,
                            border: `1px solid ${s.averageScore >= 8 ? D.greenA(0.3) : s.averageScore >= 6 ? 'rgba(245,158,11,.3)' : D.redA(0.3)}`,
                          }}>{s.averageScore}</span>
                        </td>
                        {/* Emotion */}
                        <td style={{ padding: '12px 16px' }}>
                          <span title={em.label} style={{ fontSize: 20 }}>{em.icon}</span>
                        </td>
                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          {s.atRisk ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: D.redA(0.12), color: D.red, border: `1px solid ${D.redA(0.3)}`,
                            }}><AlertTriangle size={10} /> Cần hỗ trợ</span>
                          ) : s.excelling ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: D.greenA(0.12), color: D.green, border: `1px solid ${D.greenA(0.3)}`,
                            }}><Star size={10} /> Xuất sắc</span>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              background: D.white(0.06), color: D.muted, border: `1px solid ${D.border}`,
                            }}><CheckCircle size={10} /> Ổn định</span>
                          )}
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              className="td-action-btn"
                              onClick={() => navigate(`/teacher/student/${s.id}`)}
                              style={{
                                width: 30, height: 30, borderRadius: 8, border: `1px solid ${D.border}`,
                                background: D.white(0.04), display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: D.muted, transition: 'all .15s',
                              }}
                              title="Xem chi tiết"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="td-action-btn2"
                              onClick={() => navigate(`/teacher/interaction-center?student=${s.id}`)}
                              style={{
                                width: 30, height: 30, borderRadius: 8, border: `1px solid ${D.border}`,
                                background: D.white(0.04), display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: D.muted, transition: 'all .15s',
                              }}
                              title="Tương tác"
                            >
                              <MessageSquare size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right column (320px) ── */}
        <div style={{ width: 308, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Reco card — HS cần hỗ trợ + tự khảo sát */}
          <TeacherRecoCard D={D} />

          {/* AI Co-Teacher panel */}
          <div style={{ background: D.card, border: `1px solid ${D.purpleA(0.25)}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px', background: `linear-gradient(135deg, ${D.purpleA(0.2)}, ${D.purpleA(0.05)})`,
              borderBottom: `1px solid ${D.purpleA(0.2)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
            }} onClick={() => setAiExpanded(!aiExpanded)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `linear-gradient(135deg,${D.purple},${D.pink})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 2px 10px ${D.purpleA(0.5)}`,
                }}>
                  <Sparkles size={15} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>AI Co-Teacher</p>
                  <p style={{ fontSize: 10, color: D.purpleL, margin: 0 }}>Gợi ý thông minh</p>
                </div>
              </div>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: D.green,
                animation: 'pulse-dot 2s infinite', boxShadow: `0 0 6px ${D.green}`,
              }} />
            </div>

            {/* Suggestions */}
            {aiExpanded && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiSuggestions.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: 10,
                      background: `${s.color}0d`, border: `1px solid ${s.color}28`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: 7,
                          background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon size={13} style={{ color: s.color }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: D.text, margin: '0 0 2px' }}>{s.title}</p>
                          <p style={{ fontSize: 11, color: D.muted, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Class performance ring */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: '0 0 14px' }}>Hiệu suất lớp học</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Năng lực',     val: classStats?.averageCapability ?? 0, color: D.purple },
                { label: 'Tương tác',    val: classStats?.averageEngagement ?? 0, color: D.cyan },
                { label: 'Tiến độ',      val: classStats?.averageProgress ?? 0,   color: D.green },
                { label: 'Hoàn thành',   val: Math.round(((classStats?.averageScore ?? 0) / 10) * 100), color: D.amber },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: D.muted }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.val}%</span>
                  </div>
                  <div style={{ height: 6, background: D.white(0.06), borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      width: `${item.val}%`, height: '100%', borderRadius: 99,
                      background: item.color, transition: 'width .8s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: '0 0 12px' }}>Thao tác nhanh</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <ActionBtn icon={FileText}  label="Tạo bài tập mới"         color={D.purple} onClick={() => navigate('/teacher/assignments')} />
              <ActionBtn icon={Cpu}       label="Tạo đề thi AI"           color={D.cyan}   onClick={() => navigate('/teacher/exam-generator')} />
              <ActionBtn icon={Camera}    label="Xem Camera AI"           color={D.amber}  onClick={() => navigate('/teacher/camera-management')} />
              <ActionBtn icon={Brain}     label="AI Dashboard phân tích"  color={D.pink}   onClick={() => navigate('/teacher/ai-dashboard')} />
              <ActionBtn icon={Activity}  label="Bản đồ cảm xúc"          color={D.green}  onClick={() => navigate('/teacher/emotion-map')} />
              <ActionBtn icon={MessageSquare} label="Trung tâm tương tác" color={D.blue}  onClick={() => navigate('/teacher/interaction-center')} />
            </div>
          </div>

          {/* Streak leaders */}
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>🔥 Streak hàng đầu</p>
              <Flame size={14} style={{ color: D.amber }} />
            </div>
            {[...students].sort((a, b) => b.streak - a.streak).slice(0, 4).map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 0', borderBottom: i < 3 ? `1px solid ${D.border}` : 'none',
              }}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{['🥇','🥈','🥉','4️⃣'][i]}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: D.purpleA(0.15), border: `1px solid ${D.purpleA(0.35)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: D.purpleL,
                }}>{s.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: D.text, margin: 0 }}>{s.name}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: D.amber }}>{s.streak} ngày</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════ LIVE LEADERBOARD — top học sinh dẫn đầu thời gian thực ════ */}
      <div style={{ maxWidth: 1400, margin: '24px auto 0', padding: '0 24px 32px' }}>
        <LiveLeaderboard />
      </div>

      {/* ════ FAB: Camera chấm ngay — chỉ hiện trên mobile (ẩn từ md trở lên) ════ */}
      <button
        className="cam-fab"
        onClick={() => navigate('/teacher/exam-grading?camera=1')}
        style={{
          position: 'fixed',
          bottom: 'max(24px, env(safe-area-inset-bottom, 0px) + 16px)',
          right: 20,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 18px',
          borderRadius: 99,
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          boxShadow: '0 4px 20px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.4)',
        }}
        aria-label="Camera chấm ngay"
      >
        <Camera size={18} />
        <span>Camera chấm ngay</span>
      </button>
    </div>
  )
}

/**
 * TeacherRecoCard — Hiển thị gợi ý cho GV trên dashboard:
 *   - 🆘 HS cần hỗ trợ (mastery yếu)
 *   - 🛣 HS vừa tự khảo sát lộ trình
 *
 * Refetch 5 phút. Click → navigate tới link tương ứng.
 */
function TeacherRecoCard({ D }: { D: any }) {
  const { data: feed } = useQuery({
    queryKey: ['reco-feed-teacher-dashboard'],
    queryFn: () => rs.getFeed('teacher', 6),
    staleTime: 5 * 60_000,
  })

  if (!feed || feed.items.length === 0) return null

  return (
    <div style={{
      background: D.card,
      border: `1px solid ${D.purpleA(0.25)}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px',
        background: `linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.05))`,
        borderBottom: `1px solid rgba(34,211,238,0.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `linear-gradient(135deg, #22d3ee, #3b82f6)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 10px rgba(34,211,238,0.5)`,
          }}>
            <span style={{ fontSize: 14 }}>✨</span>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: D.text, margin: 0 }}>Gợi ý cho bạn</p>
            <p style={{ fontSize: 10, color: '#67e8f9', margin: 0 }}>{feed.count} item · AI cá nhân hoá</p>
          </div>
        </div>
      </div>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {feed.items.map((item) => {
          const meta = getRsTypeMeta(item.type)
          return (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.link}
              onClick={() => rs.track({
                action: 'click',
                targetType: item.type,
                targetId: item.id,
                metadata: { source: 'teacher-dashboard' },
              })}
              style={{
                display: 'block',
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${D.border}`,
                borderLeftWidth: 3,
                borderLeftColor: meta.accent,
                textDecoration: 'none',
                transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 12 }}>{meta.emoji}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: 0.5, color: meta.accent,
                }}>
                  {meta.label}
                </span>
              </div>
              <p style={{
                fontSize: 12, fontWeight: 600, color: D.text, margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item.title}
              </p>
              {item.subtitle && (
                <p style={{
                  fontSize: 10, color: D.muted, margin: 0, marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.subtitle}
                </p>
              )}
            </Link>
          )
        })}
        {/* CTA tới Sprint Dashboard — RS Phase 7 UI */}
        <Link
          to="/teacher/sprint"
          onClick={() => rs.track({
            action: 'click',
            targetType: 'sprint_dashboard',
            targetId: 'teacher-sprint',
            metadata: { source: 'teacher-dashboard-cta' },
          })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 10px', borderRadius: 8, marginTop: 4,
            background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(168,85,247,0.12))',
            border: `1px dashed ${D.purpleA(0.45)}`,
            textDecoration: 'none', color: '#a5f3fc', fontSize: 11, fontWeight: 700,
          }}
        >
          ⚡ Mở Sprint Dashboard đầy đủ →
        </Link>
      </div>
    </div>
  )
}
