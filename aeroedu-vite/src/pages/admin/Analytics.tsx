/**
 * Admin Analytics — YouTube-style page view tracking
 *
 * Hiển thị:
 *   1. 4 stat cards: Today / Week / Month / Active now
 *   2. Daily views chart 30 ngày (bar chart SVG simple)
 *   3. Top routes table với views/unique users/avg duration/bounce rate
 *   4. Realtime active sessions panel (5 phút qua)
 *   5. Breakdown theo role: STUDENT/TEACHER/ADMIN/GUEST
 */
import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  BarChart3, TrendingUp, Users, Clock, Eye, RefreshCw,
  Loader2, Activity, ArrowUpRight, Filter, Calendar,
  TrendingDown, GitBranch, PieChart, Network, Cpu, Layers,
} from 'lucide-react'
import { api } from '@/services/api'
import { ExportMenu } from '@/components/common/ExportMenu'
import type { SheetData } from '@/lib/exportReport'

interface OverviewData {
  totals: { today: number; week: number; month: number; all_time: number }
  uniques: { sessions_today: number; users_today: number; users_week: number }
  avgViewMs: number
  daily: { day: string; views: number }[]
  byRole: { role: string; views: number }[]
}

interface RouteRow {
  path: string
  views: number
  uniqueSessions: number
  uniqueUsers: number
  avgViewMs: number
  bounces: number
  bounceRate: number
  lastView: string
}

interface RealtimeData {
  activeNow: number               // last 5 min (backward compat)
  activeLast30s?: number          // truly realtime
  activeLast1min?: number
  activeLast5min?: number
  activeUsers5min?: number        // logged-in only
  recent: { path: string; userRole: string | null; userName?: string | null; userImage?: string | null; createdAt: string }[]
  byPath?: { path: string; viewers: number; lastView: string }[]
  timestamp?: string
}

interface FunnelStage {
  name: string
  count: number
  drop: number | null
  rate: number
}
interface FunnelData {
  stages: FunnelStage[]
  totalUsers: number
}

interface SourceBucket {
  bucket: string
  views: number
  sessions: number
}
interface SourceMixData {
  inNetwork: { totalViews: number; totalSessions: number; breakdown: SourceBucket[] }
  outNetwork: { totalViews: number; totalSessions: number; breakdown: SourceBucket[] }
  ratio: { inNetwork: number; outNetwork: number }
}

interface ScoreBucket {
  label: string
  count: number
  color: string
}
interface ScoreDistributionData {
  metric: string
  buckets: ScoreBucket[]
  total: number
  error?: string
}

type ScoreMetric = 'engagement' | 'exam' | 'mastery'

// ── YouTube-style audience demographics ────────────────────
interface BucketCount { label: string; count: number }
interface AudienceData {
  days: number
  totalViews: number
  devices: BucketCount[]
  os: BucketCount[]
  browsers: BucketCount[]
  countries: BucketCount[]
  regions: BucketCount[]
  cities: BucketCount[]
  screenSizes: BucketCount[]
  languages: BucketCount[]
  timezones: BucketCount[]
  roles: BucketCount[]
  ageGroups: BucketCount[]
  updatedAt: string
}

// Flag emoji cho 2-letter ISO country code (vẽ qua codepoint regional indicator)
function flagEmoji(cc: string): string {
  if (!cc || cc.length !== 2) return '🌐'
  const codePoints = cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

const COUNTRY_NAMES_VI: Record<string, string> = {
  VN: 'Việt Nam', US: 'Hoa Kỳ', CN: 'Trung Quốc', JP: 'Nhật Bản', KR: 'Hàn Quốc',
  TH: 'Thái Lan', SG: 'Singapore', AU: 'Úc', GB: 'Anh', DE: 'Đức',
  FR: 'Pháp', RU: 'Nga', IN: 'Ấn Độ', CA: 'Canada', MY: 'Malaysia',
  ID: 'Indonesia', PH: 'Philippines', LA: 'Lào', KH: 'Campuchia', HK: 'Hồng Kông',
  TW: 'Đài Loan',
}

const DEVICE_LABELS_VI: Record<string, string> = {
  mobile: 'Điện thoại', desktop: 'Máy tính', tablet: 'Máy tính bảng',
  bot: 'Bot/Crawler', unknown: 'Không rõ',
}

const DEVICE_ICONS: Record<string, string> = {
  mobile: '📱', desktop: '🖥️', tablet: '📲', bot: '🤖', unknown: '❓',
}

const OS_ICONS: Record<string, string> = {
  Windows: '🪟', macOS: '🍎', iOS: '📱', Android: '🤖',
  Linux: '🐧', ChromeOS: '🌐', Bot: '🤖', Other: '⚙️',
}

const BROWSER_ICONS: Record<string, string> = {
  Chrome: '🟢', Safari: '🧭', Firefox: '🦊', Edge: '🌊',
  Opera: '🎭', IE: '🌐', Bot: '🤖', Other: '🌍',
}

// Generic horizontal bar list — dùng cho mọi bucket aggregation
function HorizontalBarList({
  data, total, colors, labelMap, icons, maxRows = 8, emptyText = 'Chưa có dữ liệu',
}: {
  data: BucketCount[]
  total: number
  colors?: string[]
  labelMap?: Record<string, string>
  icons?: Record<string, string>
  maxRows?: number
  emptyText?: string
}) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-white/30 italic py-4 text-center">{emptyText}</p>
  }
  const top = data.slice(0, maxRows)
  const palette = colors || ['#a78bfa','#22d3ee','#10b981','#f59e0b','#ec4899','#6366f1','#f97316','#84cc16']
  return (
    <div className="space-y-2">
      {top.map((b, i) => {
        const pct = total > 0 ? (b.count / total) * 100 : 0
        const color = palette[i % palette.length]
        const displayLabel = labelMap?.[b.label] || b.label
        const icon = icons?.[b.label]
        return (
          <div key={b.label}>
            <div className="flex items-center justify-between text-xs mb-1 gap-2">
              <span className="text-white/80 font-semibold truncate flex items-center gap-1.5">
                {icon && <span className="text-base leading-none">{icon}</span>}
                {displayLabel}
              </span>
              <span className="text-white/50 font-mono whitespace-nowrap">
                {b.count.toLocaleString('vi-VN')} <span className="text-white/30">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}50` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const BUCKET_LABELS: Record<string, string> = {
  teacher:        'Khoá GV (/teacher)',
  courses:        'Khoá học',
  exams:          'Đề thi & Luyện thi',
  assignments:    'Bài tập về nhà',
  'free-courses': 'Khoá miễn phí',
  news:           'Tin tức',
  labs:           'Phòng lab',
  games:          'Game học tập',
  career:         'Khám phá nghề',
  aura:           'Aura',
}

const BUCKET_COLORS: Record<string, string> = {
  teacher:        '#8b5cf6',
  courses:        '#a78bfa',
  exams:          '#7c3aed',
  assignments:    '#c4b5fd',
  'free-courses': '#22d3ee',
  news:           '#0ea5e9',
  labs:           '#10b981',
  games:          '#f59e0b',
  career:         '#f97316',
  aura:           '#ec4899',
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  TEACHER: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  ADMIN:   'bg-red-500/20 text-red-300 border-red-500/40',
  GUEST:   'bg-gray-500/20 text-gray-300 border-gray-500/40',
}

function fmtDuration(ms: number): string {
  if (!ms) return '—'
  if (ms < 1000) return ms + 'ms'
  const sec = Math.round(ms / 1000)
  if (sec < 60) return sec + 's'
  const min = Math.floor(sec / 60)
  return `${min}p ${sec % 60}s`
}

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const min = Math.round(diffMs / 60_000)
  if (min < 1) return 'vừa xong'
  if (min < 60) return `${min}p trước`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h trước`
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

// Simple SVG bar chart cho daily views
function DailyChart({ data }: { data: { day: string; views: number }[] }) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        Chưa có dữ liệu
      </div>
    )
  }
  const max = Math.max(...data.map(d => d.views), 1)
  const W = 800, H = 180, padding = 30
  const barW = (W - padding * 2) / data.length

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H + 40} className="min-w-[600px]" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <g key={p}>
            <line x1={padding} y1={H - p * (H - 30)} x2={W - padding} y2={H - p * (H - 30)} stroke="#ffffff15" strokeDasharray="3,3" />
            <text x={padding - 5} y={H - p * (H - 30) + 4} textAnchor="end" fontSize="10" fill="#ffffff60">{Math.round(max * p)}</text>
          </g>
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const h = (d.views / max) * (H - 30)
          const x = padding + i * barW
          return (
            <g key={d.day}>
              <rect
                x={x + 2} y={H - h} width={barW - 4} height={h}
                fill="url(#bgrad)" rx="2"
              />
              {/* day label every 5 bars */}
              {(i % 5 === 0 || i === data.length - 1) && (
                <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize="9" fill="#ffffff60">
                  {new Date(d.day).getDate()}/{new Date(d.day).getMonth() + 1}
                </text>
              )}
            </g>
          )
        })}
        <defs>
          <linearGradient id="bgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// PHOENIX-INSPIRED VISUALIZATIONS
// ════════════════════════════════════════════════════════════

/**
 * FunnelChart — vẽ phễu dọc với mỗi stage shrink dần.
 * Inspired by Phoenix Pipeline Stages.
 */
function FunnelChart({ data }: { data: FunnelData }) {
  if (!data.stages.length) {
    return <p className="text-center py-8 text-white/40 text-sm">Chưa có dữ liệu phễu</p>
  }
  const max = Math.max(...data.stages.map(s => s.count), 1)
  return (
    <div className="space-y-1">
      {data.stages.map((stage, i) => {
        const widthPct = max > 0 ? (stage.count / max) * 100 : 0
        const dropPct = stage.drop != null && i > 0 && data.stages[i - 1].count > 0
          ? (stage.drop / data.stages[i - 1].count) * 100
          : 0
        return (
          <div key={stage.name}>
            {/* Drop-off indicator between stages */}
            {i > 0 && stage.drop != null && stage.drop > 0 && (
              <div className="flex items-center gap-2 pl-4 py-1">
                <TrendingDown className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="text-[10px] font-mono text-red-400">
                  -{fmtNumber(stage.drop)} người ({dropPct.toFixed(1)}% rời)
                </span>
              </div>
            )}
            {/* Stage bar */}
            <div className="relative">
              <div
                className="relative h-12 rounded-lg overflow-hidden transition-all duration-500"
                style={{ width: `${Math.max(widthPct, 18)}%`, marginLeft: `${(100 - Math.max(widthPct, 18)) / 2}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/40 via-purple-500/60 to-fuchsia-500/40 border border-purple-400/50 rounded-lg" />
                <div className="relative h-full flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/30 border border-purple-400/50 flex items-center justify-center text-[10px] font-bold text-purple-200">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-white truncate">{stage.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 flex-shrink-0">
                    <span className="text-lg font-bold text-white font-mono">{fmtNumber(stage.count)}</span>
                    <span className={`text-xs font-bold ${
                      stage.rate >= 50 ? 'text-emerald-300' :
                      stage.rate >= 25 ? 'text-yellow-300' :
                      'text-red-300'
                    }`}>
                      {stage.rate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <span className="text-xs text-white/40">
          Tổng <span className="font-bold text-white/70">{fmtNumber(data.totalUsers)}</span> user · Conversion cuối:{' '}
          <span className="font-bold text-purple-300">
            {data.stages.length > 0 ? data.stages[data.stages.length - 1].rate : 0}%
          </span>
        </span>
      </div>
    </div>
  )
}

/**
 * SourceMixDonut — donut chart so sánh in-network vs out-of-network.
 * Inspired by Thunder (in-network) vs Phoenix (out-of-network) split.
 */
function SourceMixDonut({ ratio }: { ratio: { inNetwork: number; outNetwork: number } }) {
  const R = 80, CX = 100, CY = 100, SW = 22
  const C = 2 * Math.PI * R
  const inLen = (ratio.inNetwork / 100) * C
  const outLen = (ratio.outNetwork / 100) * C
  return (
    <div className="flex items-center justify-center">
      <svg width={200} height={200} viewBox="0 0 200 200">
        <defs>
          <linearGradient id="inGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="outGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#ffffff10" strokeWidth={SW} />
        {/* In-network arc */}
        <circle
          cx={CX} cy={CY} r={R} fill="none"
          stroke="url(#inGrad)" strokeWidth={SW}
          strokeDasharray={`${inLen} ${C}`}
          strokeLinecap="butt"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 600ms ease' }}
        />
        {/* Out-network arc — start where in ends */}
        <circle
          cx={CX} cy={CY} r={R} fill="none"
          stroke="url(#outGrad)" strokeWidth={SW}
          strokeDasharray={`${outLen} ${C}`}
          strokeDashoffset={-inLen}
          strokeLinecap="butt"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 600ms ease' }}
        />
        {/* Center text */}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">
          {ratio.inNetwork.toFixed(0)}%
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize="10" fill="#ffffff70">
          từ GV
        </text>
      </svg>
    </div>
  )
}

/**
 * SourceCard — card hiển thị 1 nguồn (in/out) với breakdown by bucket.
 */
function SourceCard({
  title, icon, iconColor, totalViews, totalSessions, breakdown, totalAll,
}: {
  title: string
  icon: React.ReactNode
  iconColor: string
  totalViews: number
  totalSessions: number
  breakdown: SourceBucket[]
  totalAll: number
}) {
  const pct = totalAll > 0 ? (totalViews / totalAll) * 100 : 0
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              {pct.toFixed(1)}% tổng lưu lượng
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-white font-mono">{fmtNumber(totalViews)}</p>
          <p className="text-[10px] text-white/40">views · {fmtNumber(totalSessions)} sessions</p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
        {breakdown.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-2">Không có dữ liệu</p>
        ) : breakdown.map(b => {
          const bPct = totalViews > 0 ? (b.views / totalViews) * 100 : 0
          return (
            <div key={b.bucket}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-white/70">{BUCKET_LABELS[b.bucket] || b.bucket}</span>
                <span className="text-white/50 font-mono">{fmtNumber(b.views)} · {bPct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${bPct}%`,
                    backgroundColor: BUCKET_COLORS[b.bucket] || '#94a3b8',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ScoreDistributionChart — horizontal bar chart cho histogram.
 */
function ScoreDistributionChart({ data }: { data: ScoreDistributionData | null }) {
  if (!data) return null
  if (data.error || data.buckets.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-white/40">{data.error || 'Chưa có dữ liệu'}</p>
      </div>
    )
  }
  const max = Math.max(...data.buckets.map(b => b.count), 1)
  return (
    <div className="space-y-2">
      {data.buckets.map(b => {
        const pct = max > 0 ? (b.count / max) * 100 : 0
        const totalPct = data.total > 0 ? (b.count / data.total) * 100 : 0
        return (
          <div key={b.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/70 font-medium font-mono w-20">{b.label}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-bold font-mono">{fmtNumber(b.count)}</span>
                <span className="text-white/40 text-[10px]">({totalPct.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: b.color,
                  boxShadow: `0 0 12px ${b.color}40`,
                }}
              />
            </div>
          </div>
        )
      })}
      <div className="pt-2 border-t border-white/[0.05] mt-3 text-center">
        <span className="text-xs text-white/40">
          Tổng <span className="font-bold text-white/70">{fmtNumber(data.total)}</span> bản ghi
        </span>
      </div>
    </div>
  )
}

export default function AdminAnalytics() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [realtime, setRealtime] = useState<RealtimeData>({ activeNow: 0, recent: [] })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<7 | 30 | 90>(7)
  const [error, setError] = useState<string | null>(null)
  const [refreshTs, setRefreshTs] = useState(Date.now())

  // Phoenix-inspired sections
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [sourceMix, setSourceMix] = useState<SourceMixData | null>(null)
  const [scoreMetric, setScoreMetric] = useState<ScoreMetric>('engagement')
  const [scoreDist, setScoreDist] = useState<ScoreDistributionData | null>(null)
  const [scoreLoading, setScoreLoading] = useState(false)

  // YouTube-style audience demographics
  const [audience, setAudience] = useState<AudienceData | null>(null)
  const [audienceLoading, setAudienceLoading] = useState(true)

  // Load overview + routes
  useEffect(() => {
    let cancel = false
    setLoading(true)
    setError(null)
    Promise.all([
      api.get<OverviewData>('/admin/analytics/overview'),
      api.get<{ routes: RouteRow[] }>(`/admin/analytics/routes?days=${period}&limit=50`),
    ])
      .then(([oRes, rRes]) => {
        if (cancel) return
        setOverview(oRes.data)
        setRoutes(rRes.data?.routes || [])
      })
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number; data?: { error?: string } } }
        if (e.response?.status === 403) setError('Bạn cần quyền ADMIN để xem trang này')
        else setError(e.response?.data?.error || 'Không tải được dữ liệu')
      })
      .finally(() => { if (!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [period, refreshTs])

  // Poll realtime every 15s
  useEffect(() => {
    let cancel = false
    const fetchRT = () => api.get<RealtimeData>('/admin/analytics/realtime')
      .then(r => { if (!cancel) setRealtime(r.data) })
      .catch(() => {})
    fetchRT()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchRT()
    }, 15_000)
    return () => { cancel = true; clearInterval(id) }
  }, [])

  // Load funnel + source-mix (Phoenix-inspired)
  useEffect(() => {
    let cancel = false
    Promise.all([
      api.get<FunnelData>('/admin/analytics/funnel').catch(() => null),
      api.get<SourceMixData>(`/admin/analytics/source-mix?days=${period}`).catch(() => null),
    ]).then(([fRes, sRes]) => {
      if (cancel) return
      if (fRes) setFunnel(fRes.data)
      if (sRes) setSourceMix(sRes.data)
    })
    return () => { cancel = true }
  }, [period, refreshTs])

  // Load score distribution (changes on metric toggle)
  useEffect(() => {
    let cancel = false
    setScoreLoading(true)
    api.get<ScoreDistributionData>(`/admin/analytics/score-distribution?metric=${scoreMetric}`)
      .then(r => { if (!cancel) setScoreDist(r.data) })
      .catch(() => { if (!cancel) setScoreDist({ metric: scoreMetric, buckets: [], total: 0, error: 'data not available' }) })
      .finally(() => { if (!cancel) setScoreLoading(false) })
    return () => { cancel = true }
  }, [scoreMetric, refreshTs])

  // Load YouTube-style audience demographics
  useEffect(() => {
    let cancel = false
    setAudienceLoading(true)
    api.get<AudienceData>(`/admin/analytics/audience?days=${period}`)
      .then(r => { if (!cancel) setAudience(r.data) })
      .catch(() => { if (!cancel) setAudience(null) })
      .finally(() => { if (!cancel) setAudienceLoading(false) })
    return () => { cancel = true }
  }, [period, refreshTs])

  const totalRoleViews = useMemo(
    () => (overview?.byRole || []).reduce((s, r) => s + r.views, 0),
    [overview?.byRole]
  )

  /** Build sheets cho export — lazy, chỉ gọi khi user click "Tải xuống" */
  const getExportSheets = useCallback((): SheetData[] => {
    const sheets: SheetData[] = []
    if (overview) {
      // Sheet 1: Tổng quan
      sheets.push({
        name: 'Tổng quan',
        columns: [
          { key: 'metric', label: 'Chỉ số' },
          { key: 'value',  label: 'Giá trị', type: 'number' },
        ],
        rows: [
          { metric: 'Lượt xem hôm nay',     value: overview.totals.today },
          { metric: 'Lượt xem 7 ngày',      value: overview.totals.week },
          { metric: 'Lượt xem 30 ngày',     value: overview.totals.month },
          { metric: 'Tổng lượt xem',        value: overview.totals.all_time },
          { metric: 'Sessions hôm nay',     value: overview.uniques.sessions_today },
          { metric: 'Users hôm nay',        value: overview.uniques.users_today },
          { metric: 'Users 7 ngày',         value: overview.uniques.users_week },
          { metric: 'TB thời gian xem (ms)', value: overview.avgViewMs },
        ],
      })
      // Sheet 2: Theo ngày
      if (overview.daily?.length) {
        sheets.push({
          name: 'Theo ngày',
          columns: [
            { key: 'day',   label: 'Ngày',     type: 'date' },
            { key: 'views', label: 'Lượt xem', type: 'number' },
          ],
          rows: overview.daily,
        })
      }
      // Sheet 3: Theo vai trò
      if (overview.byRole?.length) {
        sheets.push({
          name: 'Theo vai trò',
          columns: [
            { key: 'role',  label: 'Vai trò' },
            { key: 'views', label: 'Lượt xem', type: 'number' },
            { key: 'pct',   label: 'Tỉ lệ',    type: 'percent' },
          ],
          rows: overview.byRole.map(r => ({
            role: r.role,
            views: r.views,
            pct: totalRoleViews > 0 ? r.views / totalRoleViews : 0,
          })),
        })
      }
    }
    // Sheet 4: Top routes
    if (routes.length > 0) {
      sheets.push({
        name: 'Top đường dẫn',
        columns: [
          { key: 'path',           label: 'Đường dẫn' },
          { key: 'views',          label: 'Lượt xem',     type: 'number' },
          { key: 'uniqueSessions', label: 'Sessions',     type: 'number' },
          { key: 'uniqueUsers',    label: 'Users',        type: 'number' },
          { key: 'avgViewMs',      label: 'TB thời gian', type: 'duration_ms' },
          { key: 'bounceRate',     label: 'Bounce',       type: 'percent' },
          { key: 'lastView',       label: 'Xem gần nhất', type: 'date' },
        ],
        rows: routes,
      })
    }
    // Sheet 5: Realtime recent
    if (realtime.recent.length > 0) {
      sheets.push({
        name: 'Realtime 5 phút qua',
        columns: [
          { key: 'path',      label: 'Đường dẫn' },
          { key: 'userRole',  label: 'Vai trò' },
          { key: 'createdAt', label: 'Thời gian', type: 'date' },
        ],
        rows: realtime.recent.map(r => ({
          path: r.path,
          userRole: r.userRole || 'GUEST',
          createdAt: r.createdAt,
        })),
      })
    }
    return sheets
  }, [overview, routes, realtime, totalRoleViews])

  if (loading && !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(260,30%,8%)] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(260,30%,8%)] text-white p-6">
        <div className="text-center max-w-md">
          <Activity className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Không thể tải Analytics</h2>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 flex-wrap">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              Page View Analytics
              <span
                className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase tracking-wider"
                title="Các section dưới được thiết kế theo cảm hứng X's For You algorithm: Phoenix retrieval (out-of-network), Thunder (in-network), Home Mixer (ranking) và Candidate Pipeline framework"
              >
                Inspired by Phoenix / Home Mixer
              </span>
            </h1>
            <p className="text-white/50 mt-1">Thống kê lượt truy cập + tiếp cận nội dung kiểu YouTube</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={period}
              onChange={e => setPeriod(Number(e.target.value) as 7 | 30 | 90)}
              className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-sm focus:outline-none focus:border-purple-500"
            >
              <option value={7}>7 ngày qua</option>
              <option value={30}>30 ngày qua</option>
              <option value={90}>90 ngày qua</option>
            </select>
            <button
              onClick={() => setRefreshTs(Date.now())}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
            <ExportMenu
              filename={`analytics-${period}d-${new Date().toISOString().slice(0, 10)}`}
              getSheets={getExportSheets}
              meta={{
                title: 'Báo cáo Page View Analytics',
                subtitle: `Thống kê ${period} ngày qua — AeroEduVision (inphysic.com)`,
                authorName: 'Admin Dashboard',
              }}
            />
          </div>
        </div>

        {/* Realtime indicator — multi-window */}
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <span className="text-sm font-bold text-emerald-300">
              {realtime.activeLast5min ?? realtime.activeNow} người đang hoạt động
            </span>
            {(realtime.activeUsers5min ?? 0) > 0 && (
              <span className="text-xs text-emerald-200/70">
                ({realtime.activeUsers5min} đã đăng nhập)
              </span>
            )}
            <span className="text-xs text-white/40 ml-auto">— refresh 15s</span>
          </div>

          {/* Granular time windows */}
          {(realtime.activeLast30s != null || realtime.activeLast1min != null) && (
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-emerald-500/20 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-emerald-200">{realtime.activeLast30s ?? 0}</span>
                <span className="text-emerald-200/60">≤30s (ngay bây giờ)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                <span className="font-bold text-cyan-200">{realtime.activeLast1min ?? 0}</span>
                <span className="text-cyan-200/60">≤1 phút</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/30">
                <span className="font-bold text-blue-200">{realtime.activeLast5min ?? realtime.activeNow}</span>
                <span className="text-blue-200/60">≤5 phút</span>
              </div>
              {realtime.timestamp && (
                <span className="text-[10px] text-white/40 ml-auto font-mono">
                  Cập nhật {new Date(realtime.timestamp).toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
          )}

          {/* Top pages being viewed RIGHT NOW */}
          {realtime.byPath && realtime.byPath.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-emerald-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 mb-1.5">
                🔥 Đang được xem nhiều nhất:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {realtime.byPath.slice(0, 6).map(p => (
                  <a
                    key={p.path}
                    href={p.path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25 transition font-mono"
                  >
                    {p.path.length > 30 ? p.path.slice(0, 28) + '…' : p.path}
                    <span className="ml-1.5 font-bold text-emerald-300">{p.viewers}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Hôm nay', value: overview?.totals.today || 0, icon: Eye, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: '7 ngày', value: overview?.totals.week || 0, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: '30 ngày', value: overview?.totals.month || 0, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Tổng từ trước', value: overview?.totals.all_time || 0, icon: BarChart3, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          ].map((s, i) => (
            <div key={i} className={`p-4 rounded-xl border border-white/10 ${s.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50 font-medium uppercase tracking-wider">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{fmtNumber(s.value)}</p>
              <p className="text-xs text-white/40 mt-0.5">lượt truy cập</p>
            </div>
          ))}
        </div>

        {/* Unique users + avg duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/50 uppercase tracking-wider">Sessions hôm nay</span>
            </div>
            <p className="text-xl font-bold text-blue-300">{fmtNumber(overview?.uniques.sessions_today || 0)}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-white/50 uppercase tracking-wider">Người dùng login (7d)</span>
            </div>
            <p className="text-xl font-bold text-purple-300">{fmtNumber(overview?.uniques.users_week || 0)}</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-white/50 uppercase tracking-wider">Thời gian xem TB</span>
            </div>
            <p className="text-xl font-bold text-emerald-300">{fmtDuration(overview?.avgViewMs || 0)}</p>
          </div>
        </div>

        {/* Daily chart */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
          <h2 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            Lượt truy cập 30 ngày qua
          </h2>
          <DailyChart data={overview?.daily || []} />
        </div>

        {/* By role breakdown */}
        {overview?.byRole && overview.byRole.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
            <h2 className="text-sm font-bold text-white/80 mb-4 uppercase tracking-wider">Phân bổ theo vai trò (7 ngày)</h2>
            <div className="space-y-2">
              {overview.byRole.map(r => {
                const pct = totalRoleViews > 0 ? (r.views / totalRoleViews) * 100 : 0
                return (
                  <div key={r.role}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${ROLE_COLORS[r.role] || ROLE_COLORS.GUEST}`}>
                        {r.role}
                      </span>
                      <span className="text-white/70 font-mono">{fmtNumber(r.views)} <span className="text-white/40">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── YOUTUBE-STYLE AUDIENCE DEMOGRAPHICS ────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-500/[0.04] to-blue-500/[0.04] border border-purple-500/20 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white/90 flex items-center gap-2 uppercase tracking-wider">
                <PieChart className="w-4 h-4 text-purple-400" />
                Phân tích đối tượng (YouTube-style) — {period} ngày
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                Thiết bị · Hệ điều hành · Trình duyệt · Quốc gia · Vùng miền · Độ tuổi · Vai trò
              </p>
            </div>
            {audience && (
              <span className="text-[10px] text-white/40 font-mono">
                {audience.totalViews.toLocaleString('vi-VN')} lượt xem mẫu
              </span>
            )}
          </div>

          {audienceLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : !audience ? (
            <p className="text-center text-white/40 italic py-8 text-sm">
              Không tải được dữ liệu audience
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* DEVICES */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  Thiết bị
                </h3>
                <HorizontalBarList
                  data={audience.devices}
                  total={audience.totalViews}
                  colors={['#3b82f6','#a78bfa','#10b981','#f59e0b','#94a3b8']}
                  labelMap={DEVICE_LABELS_VI}
                  icons={DEVICE_ICONS}
                />
              </div>

              {/* OPERATING SYSTEMS */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Hệ điều hành
                </h3>
                <HorizontalBarList
                  data={audience.os}
                  total={audience.totalViews}
                  colors={['#06b6d4','#10b981','#f59e0b','#a78bfa','#ec4899','#94a3b8']}
                  icons={OS_ICONS}
                />
              </div>

              {/* BROWSERS */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-purple-400" />
                  Trình duyệt
                </h3>
                <HorizontalBarList
                  data={audience.browsers}
                  total={audience.totalViews}
                  colors={['#22c55e','#0ea5e9','#f97316','#3b82f6','#94a3b8']}
                  icons={BROWSER_ICONS}
                />
              </div>

              {/* COUNTRIES — flag emoji + country name VI */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-base leading-none">🌍</span>
                  Quốc gia (Top 10)
                </h3>
                {audience.countries.length === 0 ? (
                  <p className="text-xs text-white/30 italic py-4 text-center">
                    Geo headers chưa active — cấu hình Cloudflare cf-ipcountry hoặc Cloud Run x-appengine-country
                  </p>
                ) : (
                  <div className="space-y-2">
                    {audience.countries.slice(0, 10).map((c, i) => {
                      const pct = audience.totalViews > 0 ? (c.count / audience.totalViews) * 100 : 0
                      const palette = ['#3b82f6','#a78bfa','#10b981','#f59e0b','#ec4899','#06b6d4','#f97316','#22c55e','#8b5cf6','#94a3b8']
                      const color = palette[i % palette.length]
                      return (
                        <div key={c.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-white/80 font-semibold truncate flex items-center gap-1.5">
                              <span className="text-base leading-none">{flagEmoji(c.label)}</span>
                              {COUNTRY_NAMES_VI[c.label] || c.label}
                            </span>
                            <span className="text-white/50 font-mono whitespace-nowrap">
                              {c.count.toLocaleString('vi-VN')} <span className="text-white/30">({pct.toFixed(1)}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}50` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* CITIES (proxy "vùng miền") */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-base leading-none">🏙️</span>
                  Vùng miền · Thành phố
                </h3>
                {audience.cities.length === 0 ? (
                  <div className="text-xs text-white/30 italic py-2">
                    <p>Top region/city (cần Cloudflare/CDN gửi cf-region, cf-ipcity):</p>
                    <ul className="mt-1 list-disc list-inside text-white/40 text-[10px]">
                      <li>Cloudflare Workers tự động</li>
                      <li>Cloud Run + Cloud CDN</li>
                      <li>Vercel: x-vercel-ip-city</li>
                    </ul>
                  </div>
                ) : (
                  <HorizontalBarList
                    data={audience.cities}
                    total={audience.totalViews}
                    colors={['#ec4899','#f59e0b','#a78bfa','#06b6d4','#10b981']}
                  />
                )}
              </div>

              {/* SCREEN SIZES */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-base leading-none">📐</span>
                  Kích thước màn hình
                </h3>
                <HorizontalBarList
                  data={audience.screenSizes}
                  total={audience.totalViews}
                  colors={['#f97316','#3b82f6','#a78bfa','#10b981','#94a3b8']}
                />
              </div>

              {/* LANGUAGES */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-base leading-none">🗣️</span>
                  Ngôn ngữ
                </h3>
                <HorizontalBarList
                  data={audience.languages}
                  total={audience.totalViews}
                  colors={['#a78bfa','#22d3ee','#10b981','#f59e0b']}
                />
              </div>

              {/* TIMEZONES */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-base leading-none">🕐</span>
                  Múi giờ
                </h3>
                <HorizontalBarList
                  data={audience.timezones}
                  total={audience.totalViews}
                  colors={['#06b6d4','#a78bfa','#ec4899','#f59e0b']}
                />
              </div>

              {/* AGE GROUPS */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <h3 className="text-[11px] font-black text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-base leading-none">🎂</span>
                  Độ tuổi
                </h3>
                {audience.ageGroups.length === 0 || audience.ageGroups.every(a => a.label === 'Unknown') ? (
                  <p className="text-xs text-white/30 italic py-4 text-center">
                    Chưa có user nào nhập ngày sinh<br />
                    <span className="text-[10px] text-white/20">
                      (lưu dob vào UserProfile.data-{'>'}'dob' qua /profile/edit)
                    </span>
                  </p>
                ) : (
                  <HorizontalBarList
                    data={audience.ageGroups.filter(a => a.label !== 'Unknown')}
                    total={audience.ageGroups.filter(a => a.label !== 'Unknown').reduce((s, x) => s + x.count, 0)}
                    colors={['#10b981','#22d3ee','#3b82f6','#a78bfa','#ec4899','#94a3b8']}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top routes table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white/80 flex items-center gap-2 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-purple-400" />
              Top {routes.length} routes ({period} ngày)
            </h2>
            <span className="text-xs text-white/40">Sort theo lượt xem</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/[0.03] text-xs text-white/50 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Route</th>
                  <th className="px-4 py-3 text-right">Lượt xem</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">TG TB</th>
                  <th className="px-4 py-3 text-right">Bounce</th>
                  <th className="px-4 py-3 text-right">Lần cuối</th>
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-white/40">
                      Chưa có dữ liệu — đợi vài lượt truy cập đầu tiên rồi quay lại
                    </td>
                  </tr>
                ) : routes.map((r, i) => (
                  <tr key={r.path} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5 text-white/40 font-mono">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={r.path.replace(/:[a-z]+/gi, '')}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white/80 hover:text-purple-300 font-mono text-xs flex items-center gap-1"
                        title="Mở trang"
                      >
                        {r.path}
                        <ArrowUpRight className="w-3 h-3 opacity-40" />
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-purple-300">{fmtNumber(r.views)}</td>
                    <td className="px-4 py-2.5 text-right text-white/70">{fmtNumber(r.uniqueSessions)}</td>
                    <td className="px-4 py-2.5 text-right text-blue-300">{fmtNumber(r.uniqueUsers)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-300">{fmtDuration(r.avgViewMs)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-semibold ${
                        r.bounceRate > 70 ? 'text-red-400' :
                        r.bounceRate > 40 ? 'text-yellow-400' :
                        'text-emerald-400'
                      }`}>
                        {r.bounceRate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-white/40">{fmtTime(r.lastView)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Realtime feed */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
          <h2 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-emerald-400" />
            Hoạt động real-time (15 phút qua)
          </h2>
          {realtime.recent.length === 0 ? (
            <p className="text-center py-6 text-white/40 text-sm">Chưa có hoạt động gần đây</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {realtime.recent.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${ROLE_COLORS[r.userRole || 'GUEST']}`}>
                    {r.userRole || 'GUEST'}
                  </span>
                  <code className="flex-1 text-xs text-white/70 font-mono truncate">{r.path}</code>
                  <span className="text-[10px] text-white/40 flex-shrink-0">{fmtTime(r.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* PHOENIX-INSPIRED SECTIONS — section divider                   */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div className="pt-8 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30">
              <Cpu className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">
                Phoenix · Home Mixer · Candidate Pipeline
              </span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          </div>
          <p className="text-center text-xs text-white/40 mt-2">
            Bộ chỉ số lấy cảm hứng từ thuật toán <span className="text-purple-300 font-semibold">For You của X</span> —
            giúp admin nhìn user journey theo pipeline & phân phối engagement.
          </p>
        </div>

        {/* ─── Section A: User Journey Funnel ─── */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-400" />
                Phễu hành trình người dùng
              </h2>
              <p className="text-xs text-white/40 mt-1">
                8 giai đoạn từ đăng ký → hoàn thành khảo sát nghề · Phoenix-style pipeline stages
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
              Pipeline Stages
            </span>
          </div>
          {funnel ? (
            <FunnelChart data={funnel} />
          ) : (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-white/40">Đang tải phễu...</p>
            </div>
          )}
        </div>

        {/* ─── Section B: Source Mix (In-network vs Out-of-network) ─── */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-cyan-400" />
                Nguồn nội dung — In-Network vs Out-of-Network
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Nội dung từ GV đã đăng ký (Thunder) vs khám phá tự do (Phoenix) · {period} ngày qua
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              Thunder · Phoenix split
            </span>
          </div>

          {sourceMix ? (
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_1fr] gap-5 items-center">
              {/* Donut */}
              <div className="flex flex-col items-center gap-3">
                <SourceMixDonut ratio={sourceMix.ratio} />
                <div className="flex flex-col gap-1.5 text-xs w-full">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-purple-400 to-purple-600" />
                      <span className="text-white/70">In-network</span>
                    </span>
                    <span className="font-mono font-bold text-purple-300">{sourceMix.ratio.inNetwork.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-cyan-400 to-sky-600" />
                      <span className="text-white/70">Out-of-network</span>
                    </span>
                    <span className="font-mono font-bold text-cyan-300">{sourceMix.ratio.outNetwork.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* In-network card */}
              <SourceCard
                title="🏫 Nội dung từ GV (In-Network)"
                icon={<Layers className="w-4 h-4 text-purple-300" />}
                iconColor="bg-purple-500/20 border border-purple-400/40"
                totalViews={sourceMix.inNetwork.totalViews}
                totalSessions={sourceMix.inNetwork.totalSessions}
                breakdown={sourceMix.inNetwork.breakdown}
                totalAll={sourceMix.inNetwork.totalViews + sourceMix.outNetwork.totalViews}
              />

              {/* Out-of-network card */}
              <SourceCard
                title="🌍 Khám phá (Out-of-Network)"
                icon={<PieChart className="w-4 h-4 text-cyan-300" />}
                iconColor="bg-cyan-500/20 border border-cyan-400/40"
                totalViews={sourceMix.outNetwork.totalViews}
                totalSessions={sourceMix.outNetwork.totalSessions}
                breakdown={sourceMix.outNetwork.breakdown}
                totalAll={sourceMix.inNetwork.totalViews + sourceMix.outNetwork.totalViews}
              />
            </div>
          ) : (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
              <p className="text-sm text-white/40">Đang tải nguồn nội dung...</p>
            </div>
          )}
        </div>

        {/* ─── Section C: Engagement / Score Distribution ─── */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-5">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                Phân phối engagement
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Histogram phân phối user theo độ engagement / điểm thi / mastery · Phoenix-style score histogram
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              Grox · Score histogram
            </span>
          </div>

          {/* Metric tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {([
              { key: 'engagement' as const, label: 'Engagement (last-login)',     icon: Activity },
              { key: 'exam'       as const, label: 'Điểm bài thi',                 icon: BarChart3 },
              { key: 'mastery'    as const, label: 'Mastery (hoàn thành bài học)', icon: TrendingUp },
            ]).map(t => {
              const active = scoreMetric === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setScoreMetric(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    active
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white/80'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {scoreLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-white/40">Đang tải phân phối...</p>
            </div>
          ) : (
            <ScoreDistributionChart data={scoreDist} />
          )}
        </div>

        <p className="text-center text-xs text-white/30 pt-4">
          💾 Dữ liệu lưu 90 ngày · 🔒 Chỉ admin xem được · 🚀 Auto-cleanup hằng ngày
        </p>
      </div>
    </div>
  )
}
