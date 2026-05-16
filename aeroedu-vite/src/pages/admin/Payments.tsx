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
  Copy, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { ExportMenu } from '@/components/common/ExportMenu'
import type { SheetData } from '@/lib/exportReport'

type OrderStatus = 'PENDING' | 'AWAITING_REVIEW' | 'PAID' | 'REJECTED'

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
  const [tab, setTab] = useState<OrderStatus | 'ALL' | 'STATS'>('AWAITING_REVIEW')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<PaymentOrder[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchOrders = async () => {
    if (tab === 'STATS') return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Auto-refresh mỗi 30s
  useEffect(() => {
    const i = setInterval(() => {
      fetchOrders()
      fetchStats()
    }, 30_000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search])

  // Debounced search trigger
  useEffect(() => {
    const t = setTimeout(fetchOrders, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

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
