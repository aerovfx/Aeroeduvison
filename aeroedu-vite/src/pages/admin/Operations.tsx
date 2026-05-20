/**
 * AdminOperations — System monitoring center cho admin.
 *
 * 4 sections (4 tabs):
 *   1. Service Health      — probe DB/GCS/Anthropic/Telegram/Rust services
 *   2. System Resources    — CPU/Memory/Process info live (Node process)
 *   3. Security Audit Log  — screenshot attempts, failed logins, bans, devtools
 *   4. Recent Errors       — placeholder + link to Cloud Run logs
 *
 * Auto-refresh: Service Health mỗi 30s với countdown indicator,
 * System Resources mỗi 15s, Security Events on tab open + manual refresh.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Cpu, HardDrive, Server, Shield, ShieldAlert,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Database,
  Cloud, Mail, Bot, Zap, Sparkles, Search, ExternalLink,
  Loader2, Eye, Lock, Globe, Clock,
} from 'lucide-react'
import { api } from '@/services/api'
import toast from 'react-hot-toast'

/* ── Types ──────────────────────────────────────────────── */

type ServiceStatus = 'up' | 'down' | 'degraded'
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

interface ServiceHealth {
  name: string
  icon?: string
  status: ServiceStatus
  latencyMs?: number
  error?: string
  note?: string
  lastCheck: string
}

interface HealthResponse {
  services: ServiceHealth[]
  summary: { up: number; down: number; degraded: number; total: number; uptime: string }
  updatedAt: string
}

interface SystemResources {
  cpu: { loadavg: number[]; cores: number; percent: number }
  memory: {
    rss: number; heapUsed: number; heapTotal: number; external?: number
    sysTotal: number; sysFree: number; sysUsedPercent: number; heapPercent: number
  }
  process: {
    uptime: number; pid: number; nodeVersion: string
    platform: string; arch?: string; hostname?: string
  }
  updatedAt: string
}

interface SecurityEvent {
  id: string
  userId: string | null
  userEmail: string | null
  eventType: string
  severity: SeverityLevel
  reason: string | null
  url: string | null
  ip: string | null
  userAgent: string | null
  metadata: any
  occurredAt: string
}

interface SecurityResponse {
  events: SecurityEvent[]
  summary: {
    totalLast24h: number
    totalAll: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
  }
}

type TabKey = 'health' | 'resources' | 'security' | 'errors'

/* ── Helpers ────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${Math.floor(seconds % 60)}s`
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit',
    })
  } catch {
    return iso
  }
}

function getServiceIcon(iconName?: string) {
  switch (iconName) {
    case 'database': return Database
    case 'cloud':    return Cloud
    case 'mail':     return Mail
    case 'bot':      return Bot
    case 'cpu':      return Cpu
    case 'server':   return Server
    case 'sparkles': return Sparkles
    case 'zap':      return Zap
    default:         return Server
  }
}

function statusBadge(status: ServiceStatus) {
  if (status === 'up') return {
    bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    icon: CheckCircle,
    label: 'UP',
  }
  if (status === 'degraded') return {
    bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    icon: AlertTriangle,
    label: 'DEGRADED',
  }
  return {
    bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    icon: XCircle,
    label: 'DOWN',
  }
}

function severityStyle(sev: SeverityLevel): { bg: string; dot: string; label: string } {
  switch (sev) {
    case 'critical': return { bg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',  dot: 'bg-rose-400 shadow-[0_0_6px_#fb7185]',  label: 'CRITICAL' }
    case 'high':     return { bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',  dot: 'bg-rose-400',                            label: 'HIGH' }
    case 'medium':   return { bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-400',                         label: 'MEDIUM' }
    default:         return { bg: 'bg-zinc-500/10 text-zinc-300 border-zinc-600/40',  dot: 'bg-zinc-400',                            label: 'LOW' }
  }
}

const EVENT_LABEL: Record<string, string> = {
  'screenshot-attempt':   'Chụp màn hình',
  'devtools':             'Mở DevTools',
  'save-page-attempt':    'Lưu trang',
  'failed-login':         'Đăng nhập sai',
  'ban':                  'Bị chặn',
  'banned-login-attempt': 'Đăng nhập tài khoản banned',
}

/* ── Main page ──────────────────────────────────────────── */

export default function AdminOperations() {
  const [tab, setTab] = useState<TabKey>('health')

  return (
    <div className="p-6 space-y-5">
      <Header tab={tab} />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 w-fit overflow-x-auto">
        {([
          ['health',    'Sức khỏe Service', Server],
          ['resources', 'Tài nguyên hệ thống', Cpu],
          ['security',  'Bảo mật / Vi phạm', Shield],
          ['errors',    'Lỗi gần đây', AlertTriangle],
        ] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 whitespace-nowrap ${
              tab === k
                ? 'bg-orange-500/20 text-orange-200 border border-orange-500/40'
                : 'text-white/55 hover:text-white/85'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'health'    && <ServiceHealthPanel />}
      {tab === 'resources' && <SystemResourcesPanel />}
      {tab === 'security'  && <SecurityAuditPanel />}
      {tab === 'errors'    && <RecentErrorsPanel />}
    </div>
  )
}

/* ── Header ─────────────────────────────────────────────── */

function Header({ tab }: { tab: TabKey }) {
  const sub: Record<TabKey, string> = {
    health:    'Probe DB, GCS, AI APIs, microservices · auto-refresh 30s',
    resources: 'CPU loadavg, memory, process info · auto-refresh 15s',
    security:  'Vi phạm: screenshot, devtools, failed login, ban · audit log',
    errors:    'Lỗi server gần đây · xem log Cloud Run để chi tiết',
  }
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-400" />
          Operations Center
        </h1>
        <p className="text-sm text-white/50 mt-1">{sub[tab]}</p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────── */
/* Tab 1: Service Health                                    */
/* ──────────────────────────────────────────────────────── */

function ServiceHealthPanel() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)

  const fetchHealth = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get<HealthResponse>('/admin/operations/services-health')
      setData(d)
      setCountdown(30)
    } catch (err: any) {
      toast.error('Không tải được service health: ' + (err?.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const i = setInterval(fetchHealth, 30_000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    const i = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(i)
  }, [])

  const summary = data?.summary
  const up = summary?.up ?? 0
  const down = summary?.down ?? 0
  const degraded = summary?.degraded ?? 0
  const total = summary?.total ?? 0
  const allUp = total > 0 && up === total

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SumCard color={allUp ? 'emerald' : 'amber'} icon={Activity} label="Uptime" value={summary?.uptime ?? '—'} big />
        <SumCard color="emerald" icon={CheckCircle} label="UP"        value={String(up)} />
        <SumCard color="amber"   icon={AlertTriangle} label="Degraded" value={String(degraded)} highlight={degraded > 0} />
        <SumCard color="rose"    icon={XCircle} label="DOWN"          value={String(down)} highlight={down > 0} />
      </div>

      {/* Countdown + refresh */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/40 flex items-center gap-2">
          <Clock className="w-3 h-3" />
          Tự refresh sau <span className="font-mono text-white/70">{countdown}s</span>
          {data && <span className="ml-3 text-white/30">· Cập nhật: {formatTime(data.updatedAt)}</span>}
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/[0.1] flex items-center gap-2 text-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      {/* Service grid */}
      {!data ? (
        <div className="flex items-center justify-center py-16 text-white/40 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang probe…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.services.map((s) => {
            const Icon = getServiceIcon(s.icon)
            const badge = statusBadge(s.status)
            const BadgeIcon = badge.icon
            return (
              <div
                key={s.name}
                className={`rounded-xl border p-4 transition ${
                  s.status === 'up'
                    ? 'bg-white/[0.025] border-white/[0.08] hover:border-emerald-500/30'
                    : s.status === 'degraded'
                    ? 'bg-amber-500/[0.04] border-amber-500/30'
                    : 'bg-rose-500/[0.04] border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      s.status === 'up' ? 'bg-emerald-500/10 text-emerald-300'
                      : s.status === 'degraded' ? 'bg-amber-500/10 text-amber-300'
                      : 'bg-rose-500/10 text-rose-300'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{s.name}</div>
                      {s.latencyMs !== undefined && (
                        <div className="text-[10px] text-white/40 font-mono">{s.latencyMs}ms</div>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border flex items-center gap-1 ${badge.bg}`}>
                    <BadgeIcon className="w-3 h-3" />
                    {badge.label}
                  </span>
                </div>
                {s.note && (
                  <div className="text-[11px] text-white/55 truncate" title={s.note}>{s.note}</div>
                )}
                {s.error && (
                  <div className="text-[11px] text-rose-300/80 mt-1 font-mono truncate" title={s.error}>
                    ✕ {s.error}
                  </div>
                )}
                <div className="text-[10px] text-white/30 mt-2 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {formatTime(s.lastCheck)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────── */
/* Tab 2: System Resources                                  */
/* ──────────────────────────────────────────────────────── */

function SystemResourcesPanel() {
  const [data, setData] = useState<SystemResources | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchResources = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get<SystemResources>('/admin/operations/system-resources')
      setData(d)
    } catch (err: any) {
      toast.error('Không tải được tài nguyên: ' + (err?.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
    const i = setInterval(fetchResources, 15_000)
    return () => clearInterval(i)
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-white/40 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang đo…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 3 gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Gauge
          icon={Cpu} label="CPU Load (1m)" color="orange"
          value={data.cpu.percent} unit="%"
          subtitle={`loadavg ${data.cpu.loadavg.map(n => n.toFixed(2)).join(' · ')} · ${data.cpu.cores} cores`}
        />
        <Gauge
          icon={HardDrive} label="Memory (V8 Heap)" color="violet"
          value={data.memory.heapPercent} unit="%"
          subtitle={`${formatBytes(data.memory.heapUsed)} / ${formatBytes(data.memory.heapTotal)}`}
        />
        <Gauge
          icon={Activity} label="System Memory" color="cyan"
          value={data.memory.sysUsedPercent} unit="%"
          subtitle={`${formatBytes(data.memory.sysTotal - data.memory.sysFree)} / ${formatBytes(data.memory.sysTotal)}`}
        />
      </div>

      {/* Process info table */}
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.08] p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" /> Process info
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Info label="Uptime"       value={formatDuration(data.process.uptime)} />
          <Info label="PID"          value={String(data.process.pid)} mono />
          <Info label="Node"         value={data.process.nodeVersion} mono />
          <Info label="Platform"     value={`${data.process.platform}${data.process.arch ? '/' + data.process.arch : ''}`} mono />
          <Info label="RSS"          value={formatBytes(data.memory.rss)} mono />
          <Info label="Heap Used"    value={formatBytes(data.memory.heapUsed)} mono />
          <Info label="Heap Total"   value={formatBytes(data.memory.heapTotal)} mono />
          {data.process.hostname && (
            <Info label="Hostname" value={data.process.hostname} mono />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-white/40 flex items-center gap-2">
          <Clock className="w-3 h-3" /> Cập nhật {formatTime(data.updatedAt)}
        </div>
        <button
          onClick={fetchResources}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/[0.1] flex items-center gap-2 text-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────── */
/* Tab 3: Security Audit                                    */
/* ──────────────────────────────────────────────────────── */

function SecurityAuditPanel() {
  const [data, setData] = useState<SecurityResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [eventType, setEventType] = useState('')
  const [search, setSearch] = useState('')

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { limit: '200' }
      if (eventType) params.eventType = eventType
      if (search) params.search = search
      const { data: d } = await api.get<SecurityResponse>(
        '/admin/operations/security-events',
        { params }
      )
      setData(d)
    } catch (err: any) {
      toast.error('Không tải được security events: ' + (err?.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(fetchEvents, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, search])

  const summary = data?.summary
  const byType = summary?.byType || {}
  const bySeverity = summary?.bySeverity || {}
  const eventTypes = useMemo(() => Object.keys(byType).sort(), [byType])

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SumCard
          icon={Eye} color="cyan" label="Tổng sự kiện 24h"
          value={String(summary?.totalLast24h ?? 0)}
          highlight={(summary?.totalLast24h ?? 0) > 50}
        />
        <SumCard
          icon={ShieldAlert} color="rose" label="Severity HIGH+"
          value={String((bySeverity.high || 0) + (bySeverity.critical || 0))}
          highlight={((bySeverity.high || 0) + (bySeverity.critical || 0)) > 0}
        />
        <SumCard
          icon={Lock} color="amber" label="Failed login"
          value={String(byType['failed-login'] || 0)}
        />
        <SumCard
          icon={Eye} color="violet" label="Screenshot/DevTools"
          value={String((byType['screenshot-attempt'] || 0) + (byType['devtools'] || 0))}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={eventType}
          onChange={e => setEventType(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-orange-500/50"
        >
          <option value="">Tất cả loại</option>
          {eventTypes.map(t => (
            <option key={t} value={t}>{EVENT_LABEL[t] || t}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Email, lý do…"
            className="w-full pl-10 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/[0.1] flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>
      </div>

      {/* Events table */}
      {!data ? (
        <div className="flex items-center justify-center py-16 text-white/40 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải…
        </div>
      ) : data.events.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Chưa có sự kiện bảo mật nào.
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.025]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="text-left px-4 py-3 w-32">Thời gian</th>
                  <th className="text-left px-3 py-3 w-32">Loại</th>
                  <th className="text-left px-3 py-3 w-24">Mức độ</th>
                  <th className="text-left px-3 py-3">Người dùng</th>
                  <th className="text-left px-3 py-3">Chi tiết</th>
                  <th className="text-left px-3 py-3 w-32">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.events.map(e => {
                  const sev = severityStyle(e.severity)
                  return (
                    <tr key={e.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-xs text-white/60 font-mono whitespace-nowrap">
                        {formatTime(e.occurredAt)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className="text-white/80 font-medium">
                          {EVENT_LABEL[e.eventType] || e.eventType}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 w-fit ${sev.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                          {sev.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {e.userEmail ? (
                          <div className="text-white/85 truncate max-w-[200px]" title={e.userEmail}>{e.userEmail}</div>
                        ) : (
                          <span className="text-white/30 italic">(guest)</span>
                        )}
                        {e.userId && (
                          <div className="text-[10px] text-white/30 font-mono">uid:{e.userId.slice(0, 8)}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div className="text-white/70 line-clamp-2 max-w-[400px]" title={e.reason || ''}>
                          {e.reason || '—'}
                        </div>
                        {e.url && (
                          <div className="text-[10px] text-white/40 font-mono truncate max-w-[400px]" title={e.url}>
                            <Globe className="w-2.5 h-2.5 inline mr-1" />
                            {e.url}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-white/55 font-mono whitespace-nowrap">
                        {e.ip || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────── */
/* Tab 4: Recent Errors (placeholder)                       */
/* ──────────────────────────────────────────────────────── */

function RecentErrorsPanel() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.08] p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-400 opacity-70" />
        <h3 className="text-base font-semibold text-white mb-2">
          Theo dõi lỗi chi tiết
        </h3>
        <p className="text-sm text-white/55 max-w-xl mx-auto mb-5">
          Chưa tích hợp Sentry / Datadog. Để xem stack trace, log error chi tiết của
          server hiện tại, mở Cloud Run logs.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href="https://console.cloud.google.com/run/detail/asia-southeast1/pixiai/logs?project=extreme-lattice-491123-p2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 text-sm font-semibold hover:bg-orange-500/25 transition"
          >
            <ExternalLink className="w-4 h-4" />
            Mở Cloud Run logs
          </a>
          <a
            href="https://console.cloud.google.com/errors?project=extreme-lattice-491123-p2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white/80 text-sm font-semibold hover:bg-white/[0.08] transition"
          >
            <ExternalLink className="w-4 h-4" />
            GCP Error Reporting
          </a>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.025] border border-white/[0.08] p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Đề xuất bước tiếp theo
        </h3>
        <ul className="text-xs text-white/60 space-y-1.5 list-disc list-inside">
          <li>Tích hợp Sentry: SDK <code className="font-mono text-amber-300">@sentry/node</code> + DSN env <code className="font-mono text-amber-300">SENTRY_DSN</code></li>
          <li>Thêm error middleware Express → capture 5xx tự động</li>
          <li>Setup alert: Cloud Run → Logs Router → Sinks → Slack/Email khi <code className="font-mono text-amber-300">severity=ERROR</code></li>
          <li>Audit table cho server-side actions (đã có <code className="font-mono text-amber-300">SecurityEvent</code> cho user actions)</li>
        </ul>
      </div>
    </div>
  )
}

/* ── Shared sub-components ──────────────────────────────── */

function SumCard({ icon: Icon, label, value, color, highlight, big }: {
  icon: typeof Activity
  label: string
  value: string
  color: 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet'
  highlight?: boolean
  big?: boolean
}) {
  const bg = {
    emerald: 'bg-emerald-500/8 border-emerald-500/30 text-emerald-300',
    amber:   'bg-amber-500/8 border-amber-500/30 text-amber-300',
    rose:    'bg-rose-500/8 border-rose-500/30 text-rose-300',
    cyan:    'bg-cyan-500/8 border-cyan-500/30 text-cyan-300',
    violet:  'bg-violet-500/8 border-violet-500/30 text-violet-300',
  }[color]
  return (
    <div className={`rounded-xl border p-4 ${bg} ${highlight ? 'ring-2 ring-current/40' : ''}`}>
      <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider opacity-70">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={big ? 'text-xl font-bold font-mono' : 'text-2xl font-bold'}>{value}</div>
    </div>
  )
}

function Gauge({ icon: Icon, label, color, value, unit, subtitle }: {
  icon: typeof Activity
  label: string
  color: 'orange' | 'violet' | 'cyan'
  value: number
  unit: string
  subtitle?: string
}) {
  const colorMap = {
    orange: { stroke: '#f97316', text: 'text-orange-300', bg: 'bg-orange-500/8 border-orange-500/30' },
    violet: { stroke: '#8b5cf6', text: 'text-violet-300', bg: 'bg-violet-500/8 border-violet-500/30' },
    cyan:   { stroke: '#06b6d4', text: 'text-cyan-300',   bg: 'bg-cyan-500/8 border-cyan-500/30' },
  }[color]
  const pct = Math.min(100, Math.max(0, value))
  const r = 42
  const circ = 2 * Math.PI * r
  const offset = circ - (circ * pct) / 100

  return (
    <div className={`rounded-xl border p-5 ${colorMap.bg}`}>
      <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider opacity-70">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke={colorMap.stroke} strokeWidth="8"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700"
              style={{ filter: `drop-shadow(0 0 6px ${colorMap.stroke})` }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-xl font-bold font-mono ${colorMap.text}`}>{value}{unit}</span>
          </div>
        </div>
        {subtitle && (
          <div className="text-[11px] text-white/55 font-mono leading-relaxed flex-1 min-w-0 break-words">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-0.5 text-sm text-white/90 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
