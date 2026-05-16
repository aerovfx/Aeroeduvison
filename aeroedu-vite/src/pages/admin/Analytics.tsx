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
  activeNow: number
  recent: { path: string; userRole: string | null; createdAt: string }[]
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

export default function AdminAnalytics() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [routes, setRoutes] = useState<RouteRow[]>([])
  const [realtime, setRealtime] = useState<RealtimeData>({ activeNow: 0, recent: [] })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<7 | 30 | 90>(7)
  const [error, setError] = useState<string | null>(null)
  const [refreshTs, setRefreshTs] = useState(Date.now())

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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              Page View Analytics
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

        {/* Realtime indicator */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <span className="text-sm font-bold text-emerald-300">
            {realtime.activeNow} người đang online
          </span>
          <span className="text-xs text-white/40">— cập nhật mỗi 15 giây</span>
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

        <p className="text-center text-xs text-white/30 pt-4">
          💾 Dữ liệu lưu 90 ngày · 🔒 Chỉ admin xem được · 🚀 Auto-cleanup hằng ngày
        </p>
      </div>
    </div>
  )
}
