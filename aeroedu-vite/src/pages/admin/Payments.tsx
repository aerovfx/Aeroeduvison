/**
 * AdminPayments — Quản lý đơn hàng + xác thực thanh toán + theo dõi gói.
 *
 * Tabs:
 *   1. Chờ duyệt (AWAITING_REVIEW) — admin click "Duyệt" / "Từ chối"
 *   2. Đã duyệt (PAID) — danh sách thành công + tổng doanh thu
 *   3. Tất cả — filter theo status/search
 *   4. Thống kê — revenue 30d chart + breakdown by plan
 *
 * Auto-refresh mỗi 30s để admin thấy đơn mới gần realtime.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CreditCard, CheckCircle2, XCircle, Search, RefreshCw,
  TrendingUp, DollarSign, Package, AlertCircle, Loader2,
  Copy, Users, AlertTriangle, Clock, Sparkles, ChevronDown,
  Gift, Plus, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { ExportMenu } from '@/components/common/ExportMenu'
import type { SheetData } from '@/lib/exportReport'

type OrderStatus = 'PENDING' | 'AWAITING_REVIEW' | 'PAID' | 'REJECTED'

interface SubscriberFeature {
  feature: string
  count: number
  lastUsed: string | null
}

type SubSource = 'trial' | 'paid' | 'admin' | 'apple-iap'
type SubState = 'trialing' | 'active' | 'expired'

interface Subscriber {
  userId: string | null
  name: string
  email: string
  image: string | null
  role: string | null
  source: SubSource
  status: SubState
  activePlan: { id: string; name: string; priceVnd: number; durationDays: number }
  startedAt: string
  expiresAt: string
  daysUsed: number
  daysRemaining: number
  percentUsed: number
  isExpiringSoon: boolean
  isExpired: boolean
  featuresAccessed: SubscriberFeature[]
  lastActivityAt: string | null
  lifetimeSpend: number
  orderCount: number
}

const SOURCE_BADGE: Record<SubSource, { label: string; cls: string }> = {
  trial:       { label: '🎁 Dùng thử', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  paid:        { label: '💳 Đã mua',   cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  admin:       { label: '🛠 Admin cấp', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/40' },
  'apple-iap': { label: ' App Store',  cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
}

type SubFilter = 'all' | 'active' | 'expiring' | 'expired' | 'trial'

interface PaymentOrder {
  id: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  planId: string
  planName: string
  amount: number
  transferCode: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  approvedAt: string | null
}

interface Stats {
  totalRevenue: number
  paidCount: number
  totalOrders: number
  countByStatus: Record<OrderStatus, number>
  last30Days: Array<{ day: string; revenue: number; count: number }>
  byPlan: Array<{ planId: string; planName: string; paidCount: number; revenue: number }>
  recentPaid: PaymentOrder[]
  updatedAt: string
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:          'Mới tạo',
  AWAITING_REVIEW:  'Chờ duyệt',
  PAID:             'Đã thanh toán',
  REJECTED:         'Đã từ chối',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING:          'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
  AWAITING_REVIEW:  'bg-amber-500/15 text-amber-300 border-amber-500/40',
  PAID:             'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  REJECTED:         'bg-rose-500/15 text-rose-300 border-rose-500/40',
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ'
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch { return iso }
}

export default function AdminPayments() {
  const [tab, setTab] = useState<OrderStatus | 'ALL' | 'STATS' | 'SUBSCRIBERS'>('AWAITING_REVIEW')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)
  // Subscribers tab state
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [subFilter, setSubFilter] = useState<SubFilter>('all')
  const [subSearch, setSubSearch] = useState('')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const fetchOrders = async () => {
    if (tab === 'STATS' || tab === 'SUBSCRIBERS') return
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (tab !== 'ALL') params.status = tab
      if (search) params.search = search
      const { data } = await api.get<{ orders: PaymentOrder[] }>('/admin/payments/list', { params })
      setOrders(data.orders || [])
    } catch (err: any) {
      toast.error('Không tải được đơn hàng: ' + (err?.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscribers = async () => {
    setSubsLoading(true)
    try {
      const params: Record<string, string> = { filter: subFilter }
      if (subSearch) params.search = subSearch
      const { data } = await api.get<{ subscribers: Subscriber[]; total: number }>(
        '/admin/payments/subscribers',
        { params }
      )
      setSubs(data.subscribers || [])
    } catch (err: any) {
      toast.error('Không tải được người đăng ký: ' + (err?.response?.data?.error || err.message))
    } finally {
      setSubsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data } = await api.get<Stats>('/admin/payments/stats')
      setStats(data)
    } catch (err: any) {
      console.warn('[admin:payments] stats fetch failed', err)
    }
  }

  // Initial + tab change
  useEffect(() => {
    fetchOrders()
    fetchStats()
    if (tab === 'SUBSCRIBERS') fetchSubscribers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Auto-refresh mỗi 30s
  useEffect(() => {
    const i = setInterval(() => {
      fetchOrders()
      fetchStats()
      if (tab === 'SUBSCRIBERS') fetchSubscribers()
    }, 30_000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, subFilter, subSearch])

  // Debounced search trigger
  useEffect(() => {
    const t = setTimeout(fetchOrders, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Subscribers: re-fetch on filter/search change
  useEffect(() => {
    if (tab !== 'SUBSCRIBERS') return
    const t = setTimeout(fetchSubscribers, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subFilter, subSearch])

  const handleApprove = async (order: PaymentOrder) => {
    if (!confirm(`Xác nhận đã nhận ${formatVnd(order.amount)} từ ${order.userEmail || order.userName || 'unknown'}?\nMã kích hoạt sẽ được sinh + gửi email tự động.`)) return
    setActioningId(order.id)
    try {
      const { data } = await api.post(`/admin/payments/${order.id}/approve`)
      toast.success(`✅ Đã duyệt — Mã: ${data.code}`)
      fetchOrders()
      fetchStats()
    } catch (err: any) {
      toast.error('Lỗi duyệt: ' + (err?.response?.data?.error || err.message))
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async (order: PaymentOrder) => {
    if (!confirm(`Từ chối đơn ${order.transferCode} (${formatVnd(order.amount)})?\nUser sẽ không nhận được code.`)) return
    setActioningId(order.id)
    try {
      await api.post(`/admin/payments/${order.id}/reject`)
      toast.success('Đã từ chối')
      fetchOrders()
      fetchStats()
    } catch (err: any) {
      toast.error('Lỗi từ chối: ' + (err?.response?.data?.error || err.message))
    } finally {
      setActioningId(null)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Đã copy mã chuyển khoản')
  }

  const tabCounts = stats?.countByStatus || { AWAITING_REVIEW: 0, PAID: 0, PENDING: 0, REJECTED: 0 }

  /** Sheets cho export — bao gồm orders đang hiển thị + stats tổng */
  const getPaymentsSheets = useCallback((): SheetData[] => {
    const sheets: SheetData[] = []

    // Sheet 1: Orders đang hiển thị
    if (orders.length > 0) {
      sheets.push({
        name: `Đơn hàng (${tab})`,
        columns: [
          { key: 'id',           label: 'Mã đơn' },
          { key: 'transferCode', label: 'Mã CK' },
          { key: 'userEmail',    label: 'Email' },
          { key: 'userName',     label: 'Tên' },
          { key: 'planName',     label: 'Gói' },
          { key: 'amount',       label: 'Số tiền', type: 'currency_vnd' },
          { key: 'status',       label: 'Trạng thái' },
          { key: 'createdAt',    label: 'Tạo lúc',    type: 'date' },
          { key: 'approvedAt',   label: 'Duyệt lúc',  type: 'date' },
        ],
        rows: orders,
      })
    }

    // Sheet 2: Stats tổng (nếu có)
    if (stats) {
      sheets.push({
        name: 'Tổng quan',
        columns: [
          { key: 'metric', label: 'Chỉ số' },
          { key: 'value',  label: 'Giá trị' },
        ],
        rows: [
          { metric: 'Tổng doanh thu (đ)',    value: stats.totalRevenue },
          { metric: 'Số đơn thành công',     value: stats.paidCount },
          { metric: 'Tổng số đơn',           value: stats.totalOrders },
          { metric: 'Chờ duyệt',             value: stats.countByStatus.AWAITING_REVIEW },
          { metric: 'Mới tạo',               value: stats.countByStatus.PENDING },
          { metric: 'Đã từ chối',            value: stats.countByStatus.REJECTED },
        ],
      })
      // Sheet 3: Doanh thu theo gói
      if (stats.byPlan?.length) {
        sheets.push({
          name: 'Theo gói',
          columns: [
            { key: 'planName',  label: 'Gói' },
            { key: 'planId',    label: 'Mã gói' },
            { key: 'paidCount', label: 'Số đơn', type: 'number' },
            { key: 'revenue',   label: 'Doanh thu', type: 'currency_vnd' },
          ],
          rows: stats.byPlan,
        })
      }
      // Sheet 4: 30 ngày qua
      if (stats.last30Days?.length) {
        sheets.push({
          name: '30 ngày qua',
          columns: [
            { key: 'day',     label: 'Ngày',     type: 'date' },
            { key: 'count',   label: 'Số đơn',   type: 'number' },
            { key: 'revenue', label: 'Doanh thu', type: 'currency_vnd' },
          ],
          rows: stats.last30Days,
        })
      }
    }
    return sheets
  }, [orders, stats, tab])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-400" />
            Quản lý thanh toán
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Xác thực đơn chuyển khoản · sinh mã kích hoạt · theo dõi doanh thu
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { fetchOrders(); fetchStats() }}
            className="px-3 py-2 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/[0.1] flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Tải lại
          </button>
          <ExportMenu
            filename={`payments-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}`}
            getSheets={getPaymentsSheets}
            meta={{
              title: 'Báo cáo thanh toán',
              subtitle: `Tab: ${tab} — AeroEduVision (inphysic.com)`,
              authorName: 'Admin Dashboard',
            }}
          />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={DollarSign} label="Doanh thu tổng"
          value={stats ? formatVnd(stats.totalRevenue) : '—'}
          color="emerald" big
        />
        <StatCard
          icon={CheckCircle2} label="Đơn thành công"
          value={String(stats?.paidCount ?? '—')}
          color="cyan"
        />
        <StatCard
          icon={AlertCircle} label="Chờ duyệt"
          value={String(tabCounts.AWAITING_REVIEW)}
          color="amber" highlight={tabCounts.AWAITING_REVIEW > 0}
        />
        <StatCard
          icon={Package} label="Tổng đơn"
          value={String(stats?.totalOrders ?? '—')}
          color="zinc"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 w-fit overflow-x-auto">
        {([
          ['AWAITING_REVIEW', `Chờ duyệt (${tabCounts.AWAITING_REVIEW})`],
          ['PAID',            `Đã thanh toán (${tabCounts.PAID})`],
          ['SUBSCRIBERS',     '👥 Người dùng đăng ký'],
          ['REJECTED',        `Đã từ chối (${tabCounts.REJECTED})`],
          ['PENDING',         `Mới tạo (${tabCounts.PENDING})`],
          ['ALL',             'Tất cả'],
          ['STATS',           '📊 Thống kê'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap ${
              tab === k
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                : 'text-white/55 hover:text-white/85'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'STATS' ? (
        <StatsPanel stats={stats} />
      ) : tab === 'SUBSCRIBERS' ? (
        <SubscribersPanel
          subs={subs}
          loading={subsLoading}
          filter={subFilter}
          setFilter={setSubFilter}
          search={subSearch}
          setSearch={setSubSearch}
          expandedUserId={expandedUserId}
          setExpandedUserId={setExpandedUserId}
          onRefresh={fetchSubscribers}
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo email, tên, mã chuyển khoản, gói…"
              className="w-full pl-10 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Orders list */}
          {loading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-white/40 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải đơn hàng…
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Không có đơn nào.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  busy={actioningId === o.id}
                  onApprove={() => handleApprove(o)}
                  onReject={() => handleReject(o)}
                  onCopyCode={() => copyCode(o.transferCode)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Sub components ─────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color, highlight, big }: {
  icon: typeof CreditCard; label: string; value: string
  color: 'emerald' | 'cyan' | 'amber' | 'zinc'; highlight?: boolean; big?: boolean
}) {
  const bg = {
    emerald: 'bg-emerald-500/8 border-emerald-500/30 text-emerald-300',
    cyan:    'bg-cyan-500/8 border-cyan-500/30 text-cyan-300',
    amber:   'bg-amber-500/8 border-amber-500/30 text-amber-300',
    zinc:    'bg-zinc-500/5 border-zinc-700 text-zinc-300',
  }[color]
  return (
    <div className={`rounded-xl border p-4 ${bg} ${highlight ? 'ring-2 ring-amber-400/40 animate-pulse' : ''}`}>
      <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider opacity-70">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={big ? 'text-xl font-bold font-mono' : 'text-2xl font-bold'}>{value}</div>
    </div>
  )
}

function OrderCard({ order: o, busy, onApprove, onReject, onCopyCode }: {
  order: PaymentOrder
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onCopyCode: () => void
}) {
  return (
    <div className="rounded-xl bg-white/[0.025] border border-white/[0.08] p-4 hover:border-white/[0.18] transition">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_COLOR[o.status]}`}>
              {STATUS_LABEL[o.status]}
            </span>
            <span className="text-xs text-white/40">{formatTime(o.createdAt)}</span>
            <button
              onClick={onCopyCode}
              className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 flex items-center gap-1"
              title="Copy mã chuyển khoản"
            >
              {o.transferCode}
              <Copy className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {o.planName} — <span className="text-amber-300 font-mono">{formatVnd(o.amount)}</span>
          </div>
          <div className="text-xs text-white/50 mt-1">
            <span className="text-white/70">{o.userName || '(không tên)'}</span> ·
            <span className="ml-1">{o.userEmail || '(không email)'}</span>
            {o.userId && (
              <span className="ml-2 font-mono text-[10px] text-white/30">uid:{o.userId.slice(0, 8)}</span>
            )}
          </div>
          {o.approvedAt && (
            <div className="text-[11px] text-emerald-400/70 mt-1">
              ✓ Duyệt lúc {formatTime(o.approvedAt)}
            </div>
          )}
        </div>

        {/* Actions */}
        {o.status === 'AWAITING_REVIEW' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onApprove}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Duyệt + Sinh mã
            </button>
            <button
              onClick={onReject}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" /> Từ chối
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Subscribers tab ──────────────────────────────────── */

function progressColor(pct: number): { bar: string; text: string } {
  if (pct >= 80) return { bar: 'bg-rose-500', text: 'text-rose-300' }
  if (pct >= 50) return { bar: 'bg-amber-500', text: 'text-amber-300' }
  return { bar: 'bg-emerald-500', text: 'text-emerald-300' }
}

const FEATURE_LABEL: Record<string, string> = {
  VIEWED:           'Mở bài học',
  STARTED:          'Bắt đầu khoá',
  COMPLETED:        'Hoàn thành',
  QUIZ_ATTEMPT:     'Làm quiz',
  ASSIGNMENT_OPEN:  'Mở bài tập',
  ASSIGNMENT_SUBMIT:'Nộp bài',
  AI_TUTOR:         'AI Tutor',
  EXAM_PREP:        'Ôn thi',
  OCR_PDF:          'OCR PDF',
  GRADING:          'Chấm tự động',
}

function SubscribersPanel({
  subs, loading, filter, setFilter, search, setSearch,
  expandedUserId, setExpandedUserId, onRefresh,
}: {
  subs: Subscriber[]
  loading: boolean
  filter: SubFilter
  setFilter: (f: SubFilter) => void
  search: string
  setSearch: (s: string) => void
  expandedUserId: string | null
  setExpandedUserId: (id: string | null) => void
  onRefresh: () => void
}) {
  const totalActive = subs.filter(s => !s.isExpired).length
  const totalTrial = subs.filter(s => s.source === 'trial' && !s.isExpired).length
  const totalExpiring = subs.filter(s => s.isExpiringSoon).length
  const totalExpired = subs.filter(s => s.isExpired).length
  const totalLifetime = subs.reduce((sum, s) => sum + (s.lifetimeSpend || 0), 0)

  const [grantOpen, setGrantOpen] = useState(false)
  const [grantPrefill, setGrantPrefill] = useState<{ email?: string; planId?: string }>({})
  const openGrant = (prefill: { email?: string; planId?: string } = {}) => {
    setGrantPrefill(prefill); setGrantOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SubStatCard icon={Users}        color="cyan"    label="Đang đăng ký"  value={String(totalActive)} />
        <SubStatCard icon={Gift}         color="amber"   label="Đang dùng thử" value={String(totalTrial)} />
        <SubStatCard icon={AlertTriangle} color="amber"   label="Sắp hết hạn"   value={String(totalExpiring)} />
        <SubStatCard icon={XCircle}      color="rose"    label="Đã hết hạn"    value={String(totalExpired)} />
        <SubStatCard icon={DollarSign}   color="emerald" label="Tổng chi tiêu" value={formatVnd(totalLifetime)} mono />
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1">
          {([
            ['all',      'Tất cả'],
            ['active',   'Đang dùng'],
            ['trial',    '🎁 Dùng thử'],
            ['expiring', 'Sắp hết hạn (<7 ngày)'],
            ['expired',  'Đã hết hạn'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap ${
                filter === k
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                  : 'text-white/55 hover:text-white/85'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo email, tên…"
            className="w-full pl-10 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-2 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/[0.1] flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </button>

        <button
          onClick={() => openGrant()}
          className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 flex items-center gap-2 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Cấp / Gia hạn gói
        </button>
      </div>

      {/* Table */}
      {loading && subs.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-white/40 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải người đăng ký…
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          Không có người dùng nào khớp bộ lọc.
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-white/[0.025]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="text-left px-4 py-3">Người dùng</th>
                  <th className="text-left px-3 py-3">Gói</th>
                  <th className="text-right px-3 py-3 w-20">Đã dùng</th>
                  <th className="text-right px-3 py-3 w-20">Còn lại</th>
                  <th className="text-left px-3 py-3 w-44">Tiến độ</th>
                  <th className="text-left px-3 py-3 w-32">Hoạt động</th>
                  <th className="text-right px-3 py-3 w-28">Tổng chi</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {subs.map(s => {
                  const key = s.userId || s.email
                  const isExpanded = expandedUserId === key
                  const col = progressColor(s.percentUsed)
                  return (
                    <SubscriberRow
                      key={key}
                      s={s}
                      isExpanded={isExpanded}
                      col={col}
                      onToggle={() => setExpandedUserId(isExpanded ? null : key)}
                      onExtend={() => openGrant({ email: s.email, planId: s.activePlan.id })}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {grantOpen && (
        <GrantModal
          prefill={grantPrefill}
          onClose={() => setGrantOpen(false)}
          onDone={() => { setGrantOpen(false); onRefresh() }}
        />
      )}
    </div>
  )
}

function SubscriberRow({ s, isExpanded, col, onToggle, onExtend }: {
  s: Subscriber
  isExpanded: boolean
  col: { bar: string; text: string }
  onToggle: () => void
  onExtend: () => void
}) {
  return (
    <>
                      <tr
                        className="hover:bg-white/[0.03] transition cursor-pointer"
                        onClick={onToggle}
                      >
                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/40 to-purple-500/40 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 overflow-hidden">
                              {s.image
                                ? <img src={s.image} className="w-full h-full object-cover" alt="" />
                                : (s.name || s.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-white text-sm font-medium truncate">{s.name}</div>
                              <div className="text-xs text-white/40 truncate">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        {/* Plan */}
                        <td className="px-3 py-3 text-xs">
                          <div className="text-white/85 font-medium truncate max-w-[140px]">{s.activePlan.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${SOURCE_BADGE[s.source]?.cls || 'bg-white/5 text-white/50 border-white/10'}`}>
                              {SOURCE_BADGE[s.source]?.label || s.source}
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">{s.activePlan.id}</span>
                          </div>
                        </td>
                        {/* Days used */}
                        <td className="px-3 py-3 text-right text-xs text-white/70 font-mono">
                          {s.daysUsed}d
                        </td>
                        {/* Days remaining */}
                        <td className="px-3 py-3 text-right text-xs">
                          {s.isExpired ? (
                            <span className="text-rose-300 font-bold">Hết hạn</span>
                          ) : s.isExpiringSoon ? (
                            <span className="text-amber-300 font-bold font-mono">{s.daysRemaining}d</span>
                          ) : (
                            <span className="text-emerald-300 font-mono">{s.daysRemaining}d</span>
                          )}
                        </td>
                        {/* Progress */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${col.bar}`}
                                style={{ width: `${Math.min(100, s.percentUsed)}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono ${col.text} w-8 text-right`}>{s.percentUsed}%</span>
                          </div>
                        </td>
                        {/* Last activity */}
                        <td className="px-3 py-3 text-xs text-white/55">
                          {s.lastActivityAt ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(s.lastActivityAt)}
                            </span>
                          ) : (
                            <span className="text-white/30 italic text-[10px]">chưa hoạt động</span>
                          )}
                        </td>
                        {/* Lifetime spend */}
                        <td className="px-3 py-3 text-right">
                          <div className="text-emerald-300 font-mono text-xs">{formatVnd(s.lifetimeSpend)}</div>
                          {s.orderCount > 1 && (
                            <div className="text-[10px] text-white/40">{s.orderCount} đơn</div>
                          )}
                        </td>
                        {/* Gia hạn + Expand chevron */}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); onExtend() }}
                              className="px-2 py-1 rounded-md bg-purple-500/15 text-purple-200 border border-purple-500/30 hover:bg-purple-500/25 text-[10px] font-semibold whitespace-nowrap"
                              title="Gia hạn / đổi gói cho người dùng này"
                            >
                              Gia hạn
                            </button>
                            <ChevronDown
                              className={`w-4 h-4 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row: features breakdown */}
                      {isExpanded && (
                        <tr className="bg-black/30">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Dates */}
                              <div className="space-y-2 text-xs">
                                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">Thời gian</div>
                                <div className="flex items-center justify-between">
                                  <span className="text-white/50">Bắt đầu:</span>
                                  <span className="text-white/80 font-mono">{formatTime(s.startedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-white/50">Hết hạn:</span>
                                  <span className={`font-mono ${s.isExpired ? 'text-rose-300' : s.isExpiringSoon ? 'text-amber-300' : 'text-white/80'}`}>
                                    {formatTime(s.expiresAt)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-white/50">Thời hạn gói:</span>
                                  <span className="text-white/80 font-mono">{s.activePlan.durationDays} ngày</span>
                                </div>
                              </div>

                              {/* Features */}
                              <div className="md:col-span-2">
                                <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2 flex items-center gap-2">
                                  <Sparkles className="w-3 h-3" /> Tính năng đã sử dụng (90 ngày qua)
                                </div>
                                {s.featuresAccessed.length === 0 ? (
                                  <p className="text-xs text-white/40 italic">Chưa ghi nhận hoạt động.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {s.featuresAccessed.map(f => (
                                      <div
                                        key={f.feature}
                                        className="rounded-lg px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-xs flex items-center gap-2"
                                        title={f.lastUsed ? `Lần cuối: ${formatTime(f.lastUsed)}` : ''}
                                      >
                                        <span className="text-cyan-200 font-medium">
                                          {FEATURE_LABEL[f.feature] || f.feature}
                                        </span>
                                        <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                                          {f.count}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
  )
}

function SubStatCard({ icon: Icon, color, label, value, mono }: {
  icon: typeof Users
  color: 'cyan' | 'amber' | 'rose' | 'emerald'
  label: string
  value: string
  mono?: boolean
}) {
  const bg = {
    cyan:    'bg-cyan-500/8 border-cyan-500/30 text-cyan-300',
    amber:   'bg-amber-500/8 border-amber-500/30 text-amber-300',
    rose:    'bg-rose-500/8 border-rose-500/30 text-rose-300',
    emerald: 'bg-emerald-500/8 border-emerald-500/30 text-emerald-300',
  }[color]
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-1 text-xs uppercase tracking-wider opacity-70">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={mono ? 'text-lg font-bold font-mono' : 'text-2xl font-bold'}>{value}</div>
    </div>
  )
}

/* ── Modal: cấp / gia hạn gói thủ công ─────────────────── */

interface GrantPlan { id: string; name: string; amount: number; durationDays: number; audience?: string }

function GrantModal({ prefill, onClose, onDone }: {
  prefill: { email?: string; planId?: string }
  onClose: () => void
  onDone: () => void
}) {
  const [plans, setPlans] = useState<GrantPlan[]>([])
  const [email, setEmail] = useState(prefill.email || '')
  const [planId, setPlanId] = useState(prefill.planId || '')
  const [days, setDays] = useState<string>('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get<{ plans: GrantPlan[] }>('/payment/plans')
      .then(r => {
        const list = r.data.plans || []
        setPlans(list)
        if (!planId && list[0]) setPlanId(list[0].id)
      })
      .catch(() => toast.error('Không tải được danh sách gói'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = plans.find(p => p.id === planId)
  const effectiveDays = Number(days) > 0 ? Number(days) : (selected?.durationDays || 30)

  const submit = async () => {
    if (!email.trim()) { toast.error('Nhập email người dùng'); return }
    if (!planId) { toast.error('Chọn gói'); return }
    setBusy(true)
    try {
      const { data } = await api.post('/admin/payments/grant', {
        email: email.trim(), planId,
        days: Number(days) > 0 ? Number(days) : undefined,
      })
      toast.success(`✅ Đã cấp ${planId} cho ${data.email} (+${data.days} ngày)`)
      onDone()
    } catch (err: any) {
      toast.error('Lỗi cấp gói: ' + (err?.response?.data?.error || err.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" /> Cấp / Gia hạn gói thủ công
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-white/50">
          Cấp quyền trực tiếp cho 1 tài khoản (không cần thanh toán). Nếu user còn hạn,
          thời gian sẽ <b className="text-purple-300">cộng dồn</b> từ ngày hết hạn hiện tại.
        </p>

        <div className="space-y-1">
          <label className="text-xs text-white/60">Email người dùng</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/60">Gói</label>
          <select
            value={planId}
            onChange={e => setPlanId(e.target.value)}
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/50"
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.amount === 0 ? 'Miễn phí' : formatVnd(p.amount)} ({p.durationDays}d)
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-white/60">Số ngày (để trống = theo gói: {selected?.durationDays || 30} ngày)</label>
          <input
            type="number" min={1}
            value={days}
            onChange={e => setDays(e.target.value)}
            placeholder={String(selected?.durationDays || 30)}
            className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.1] rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-white/60 hover:text-white text-sm">Huỷ</button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-purple-500/25 text-purple-100 border border-purple-500/50 hover:bg-purple-500/35 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Cấp (+{effectiveDays} ngày)
          </button>
        </div>
      </div>
    </div>
  )
}

function StatsPanel({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return <div className="text-center py-12 text-white/40 text-sm">Đang tải thống kê…</div>
  }

  const maxRevenue = useMemo(() => Math.max(1, ...stats.last30Days.map(d => d.revenue)), [stats])

  return (
    <div className="space-y-5">
      {/* Revenue 30d chart (simple bars) */}
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.08] p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Doanh thu 30 ngày qua
        </h3>
        {stats.last30Days.length === 0 ? (
          <p className="text-xs text-white/40">Chưa có dữ liệu</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {stats.last30Days.map(d => (
              <div
                key={d.day}
                className="flex-1 bg-gradient-to-t from-emerald-500/40 to-emerald-300/20 rounded-t hover:from-emerald-400 transition-colors"
                style={{ height: `${(d.revenue / maxRevenue) * 100}%` }}
                title={`${new Date(d.day).toLocaleDateString('vi-VN')}: ${formatVnd(d.revenue)} (${d.count} đơn)`}
              />
            ))}
          </div>
        )}
        <div className="text-xs text-white/40 mt-2 flex justify-between">
          <span>{stats.last30Days[0] ? new Date(stats.last30Days[0].day).toLocaleDateString('vi-VN') : '—'}</span>
          <span>Hôm nay</span>
        </div>
      </div>

      {/* By plan breakdown */}
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.08] p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          Doanh thu theo gói
        </h3>
        {stats.byPlan.length === 0 ? (
          <p className="text-xs text-white/40">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-2">
            {stats.byPlan.map(p => (
              <div key={p.planId} className="flex items-center justify-between px-3 py-2 rounded bg-white/[0.03] border border-white/[0.05]">
                <div>
                  <div className="text-sm font-medium text-white">{p.planName}</div>
                  <div className="text-[10px] text-white/40 font-mono">{p.planId}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-amber-300 font-mono">{formatVnd(p.revenue)}</div>
                  <div className="text-[10px] text-white/50">{p.paidCount} đơn</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent paid orders */}
      <div className="rounded-xl bg-white/[0.025] border border-white/[0.08] p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          10 đơn duyệt gần nhất
        </h3>
        {stats.recentPaid.length === 0 ? (
          <p className="text-xs text-white/40">Chưa có đơn nào</p>
        ) : (
          <div className="space-y-1.5">
            {stats.recentPaid.map(o => (
              <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded bg-white/[0.03] text-xs">
                <span className="text-white/85 truncate flex-1">
                  {o.userEmail || o.userName || '(anon)'} — {o.planName}
                </span>
                <span className="font-mono text-emerald-300 ml-2">{formatVnd(o.amount)}</span>
                <span className="ml-2 text-white/40 text-[10px]">{o.approvedAt ? formatTime(o.approvedAt) : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
