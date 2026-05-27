import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  Shield, Users, Award, Activity, Cpu, Server,
  Brain, Settings2, RefreshCw, Zap,
  DollarSign, Globe, Video, ChevronRight,
  Lock, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Loader2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

/* ─── Types matching BE /api/admin/overview/full ─────────── */
type TimeRange = 'today' | 'week' | 'month';

interface OverviewKpis {
  activeStudents: number;
  totalUsers: number;
  avgMastery: number;
  attendancePercent: number;
  systemUptime: number;        // %
  moduleLoad: number;          // % memory
  cpuPercent: number;          // %
  uptimeText: string;
}

interface EnrollmentRow {
  month: string;               // YYYY-MM
  students: number;
}

interface SentimentRow {
  date: string;
  dayShort: string;
  positiveRatio: number;       // 0-100
}

interface XpVelocityItem {
  id: string;
  labelVi: string;
  labelEn: string;
  value: number;               // %
  color: string;
}

interface RevenueData {
  total: number;
  last30Days: number;
  projectedQuarter: number;
  paidOrders: number;
  paidUsers: number;
}

interface ServiceItem {
  name: string;
  icon: string;
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
}

interface ServicesSummary {
  up: number;
  down: number;
  degraded: number;
  total: number;
  uptime: string;
}

interface NetworkLoadItem {
  hour: string;
  requests: number;
  percent: number;
}

interface RoleBreakdown {
  students: number;
  teachers: number;
  admins: number;
  parents: number;
}

interface SecurityEvent {
  type?: string;
  severity?: string;
  message?: string;
  timestamp?: string;
  detail?: string;
}

interface SecurityEventsResp {
  events: SecurityEvent[];
  summary: { totalLast24h: number; totalAll: number };
}

interface OverviewFullResp {
  kpis: OverviewKpis;
  enrollment: EnrollmentRow[];
  sentiment: SentimentRow[];
  xpVelocity: XpVelocityItem[];
  revenue: RevenueData;
  services: ServiceItem[];
  servicesSummary: ServicesSummary;
  networkLoad: NetworkLoadItem[];
  roleBreakdown: RoleBreakdown;
  range: string;
  updatedAt: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
function DarkCard({ children, className = '', style, onClick }: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-4 transition-all ${onClick ? 'cursor-pointer hover:border-purple-500/30 hover:scale-[1.01]' : 'hover:border-white/[0.1]'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function Badge({ children, variant = 'default' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'premium';
}) {
  const cls: Record<string, string> = {
    default: 'bg-white/10 text-white/70',
    success: 'bg-green-500/15 text-green-400 border border-green-500/20',
    warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    danger:  'bg-red-500/15   text-red-400   border border-red-500/20',
    info:    'bg-blue-500/15  text-blue-400  border border-blue-500/20',
    premium: 'text-white border-none',
  };
  const style = variant === 'premium' ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {};
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cls[variant]}`} style={style}>
      {children}
    </span>
  );
}

function SectionHead({ icon: Icon, label, color = 'text-purple-400' }: {
  icon: React.ElementType; label: string; color?: string;
}) {
  return (
    <h2 className={`text-[10px] font-black uppercase tracking-[.3em] text-white/40 flex items-center gap-2`}>
      <Icon className={`w-4 h-4 ${color}`} /> {label}
    </h2>
  );
}

function KPICard({ label, value, trend, change, icon: Icon, color, borderColor, subtitle }: {
  label: string; value: string | number; trend: 'up' | 'down' | 'stable';
  change: number; icon: React.ElementType; color: string; borderColor: string;
  subtitle?: string;
}) {
  return (
    <DarkCard className="border-l-4" style={{ borderLeftColor: borderColor }}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-xl bg-white/[0.04]" style={{ color }}>
          <Icon className="w-4 h-4" />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black
          ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-white/20'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : '●'}
          {change > 0 ? ` +${change}%` : change < 0 ? ` ${change}%` : ''}
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40 mb-0.5">{label}</p>
      <h3 className="text-2xl font-black text-white/90 leading-tight">{value}</h3>
      {subtitle && <p className="text-[9px] font-bold text-white/30 mt-0.5">{subtitle}</p>}
    </DarkCard>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

/* ─── Helpers format ─────────────────────────────────────── */
const fmtVnd = (n: number) =>
  n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(1)}B ₫`
  : n >= 1_000_000   ? `${(n / 1_000_000).toFixed(1)}M ₫`
  : n >= 1_000       ? `${(n / 1_000).toFixed(0)}K ₫`
  : `${n} ₫`;

const fmtNum = (n: number) => n.toLocaleString('vi-VN');

function monthLabel(yyyymm: string, vi: boolean): string {
  const [, mm] = yyyymm.split('-');
  const m = parseInt(mm, 10);
  return vi ? `T${m}` : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] || mm;
}

function relTime(ts: string, vi: boolean): string {
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return vi ? 'Vừa xong' : 'Just now';
  if (m < 60) return vi ? `${m} phút trước` : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return vi ? `${h} giờ trước` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return vi ? `${d} ngày trước` : `${d}d ago`;
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function Overview() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const VI = language === 'vi';
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<OverviewFullResp | null>(null);
  const [secEvents, setSecEvents] = useState<SecurityEvent[]>([]);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [overviewRes, secRes] = await Promise.all([
        api.get<OverviewFullResp>(`/admin/overview/full?range=${timeRange}`),
        api.get<SecurityEventsResp>('/admin/operations/security-events').catch(() => ({ data: { events: [], summary: { totalLast24h: 0, totalAll: 0 } } })),
      ]);
      setData(overviewRes.data);
      setSecEvents(secRes.data.events.slice(0, 5));
    } catch (err: any) {
      toast.error(VI ? 'Không tải được dữ liệu' : 'Failed to load data');
      console.error('[admin:overview]', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [timeRange]);
  // Auto-refresh every 30s (silent)
  useEffect(() => {
    const t = setInterval(() => load(true), 30_000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const tRange = (r: TimeRange) =>
    VI ? (r === 'today' ? 'Hôm nay' : r === 'week' ? 'Tuần' : 'Tháng')
       : (r === 'today' ? 'Today'   : r === 'week' ? 'Week' : 'Month');

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-sm font-bold">{VI ? 'Đang tải bảng điều khiển…' : 'Loading Command Center…'}</span>
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const enrollmentChart = data.enrollment.map(e => ({
    month: monthLabel(e.month, VI),
    students: e.students,
  }));
  const networkChart = data.networkLoad.length > 0
    ? data.networkLoad
    : Array.from({ length: 30 }, (_, i) => ({ hour: '', requests: 0, percent: 5 + (i % 7) * 8 }));

  // Module Registry — derive từ services (active = up, inactive = down/degraded)
  const activeServices = data.services.filter(s => s.status === 'up').length;
  const inactiveServices = data.services.length - activeServices;

  // System Health label
  const healthLabel = (s: ServiceItem) => {
    if (s.status === 'up') return VI ? 'Trực tuyến' : 'Online';
    if (s.status === 'degraded') return VI ? 'Suy giảm' : 'Degraded';
    return VI ? 'Ngoại tuyến' : 'Offline';
  };

  // Sentiment score (avg positiveRatio)
  const sentimentAvg = data.sentiment.length > 0
    ? Math.round(data.sentiment.reduce((s, d) => s + d.positiveRatio, 0) / data.sentiment.length)
    : 0;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-4 md:py-6 relative">
      {/* Ambient blobs */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-indigo-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed -top-24 -right-24  w-96 h-96 bg-purple-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* ── Tier 1: Header ──────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', boxShadow: '0 0 24px rgba(102,126,234,0.35)' }}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none"
              style={{ background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.45) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {VI ? 'Bảng điều khiển' : 'Command Center'}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={data.servicesSummary.down === 0 ? 'success' : data.servicesSummary.down <= 2 ? 'warning' : 'danger'}>
                {data.servicesSummary.down === 0
                  ? (VI ? 'Hệ thống ổn định' : 'System Healthy')
                  : (VI ? `${data.servicesSummary.down} service offline` : `${data.servicesSummary.down} services down`)}
              </Badge>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                {VI ? `Uptime ${k.uptimeText}` : `Uptime ${k.uptimeText}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range */}
          <div className="flex p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
            {(['today', 'week', 'month'] as TimeRange[]).map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition-all
                  ${timeRange === r ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                style={timeRange === r ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}>
                {tRange(r)}
              </button>
            ))}
          </div>
          <button onClick={() => load()}
            disabled={refreshing}
            title={`Updated ${relTime(data.updatedAt, VI)}`}
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-purple-500/30 transition-all">
            <RefreshCw className={`w-4 h-4 text-white/50 hover:text-purple-300 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Tier 2: KPI Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <KPICard
          label={VI ? 'Học sinh hoạt động' : 'Active Students'}
          value={fmtNum(k.activeStudents)}
          trend={k.activeStudents > 0 ? 'up' : 'stable'} change={0}
          icon={Users} color="#3b82f6" borderColor="#3b82f6"
          subtitle={VI ? `Trong ${timeRange === 'today' ? '24h' : timeRange === 'week' ? '7 ngày' : '30 ngày'}` : `Last ${timeRange === 'today' ? '24h' : timeRange === 'week' ? '7d' : '30d'}`}
        />
        <KPICard
          label={VI ? 'Thành thạo TB' : 'Avg Mastery'}
          value={`${k.avgMastery}%`}
          trend={k.avgMastery >= 70 ? 'up' : k.avgMastery >= 50 ? 'stable' : 'down'} change={0}
          icon={Award} color="#10b981" borderColor="#10b981"
          subtitle={VI ? 'Avg PracticeExam 30d' : 'Avg PracticeExam 30d'}
        />
        <KPICard
          label={VI ? 'Service Uptime' : 'Service Uptime'}
          value={`${k.systemUptime}%`}
          trend={k.systemUptime >= 95 ? 'up' : k.systemUptime >= 75 ? 'stable' : 'down'} change={0}
          icon={Activity} color="#6366f1" borderColor="#6366f1"
          subtitle={`${data.servicesSummary.up}/${data.servicesSummary.total} services`}
        />
        <KPICard
          label={VI ? 'Tải bộ nhớ' : 'Memory Load'}
          value={`${k.moduleLoad}%`}
          trend={k.moduleLoad < 60 ? 'up' : k.moduleLoad < 80 ? 'stable' : 'down'} change={0}
          icon={Cpu} color="#f59e0b" borderColor="#f59e0b"
          subtitle={`CPU ${k.cpuPercent}%`}
        />
        {/* Tổng người dùng (thay Agent OS mockup) */}
        <DarkCard className="border-l-4" style={{ borderLeftColor: '#a78bfa' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-xl bg-white/[0.04] text-purple-400">
              <Server className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-purple-400">
              {fmtNum(data.roleBreakdown.students)} HS · {fmtNum(data.roleBreakdown.teachers)} GV
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40 mb-0.5">
            {VI ? 'Tổng người dùng' : 'Total Users'}
          </p>
          <h3 className="text-2xl font-black text-white/90 leading-tight">{fmtNum(k.totalUsers)}</h3>
        </DarkCard>
      </div>

      {/* ── Tier 3: Intelligence + Infrastructure ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">

        {/* Left: Actionable Intelligence */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <SectionHead icon={Brain} label={VI ? 'Phân tích hành động' : 'Actionable Intelligence'} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* User breakdown card (thay Critical Alert mockup) */}
            <DarkCard className="md:col-span-2 relative overflow-hidden border-purple-500/15 hover:border-purple-500/35">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/[0.05] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="info">{VI ? 'Phân tích người dùng' : 'User Breakdown'}</Badge>
                  <span className="text-[10px] text-white/30">{VI ? `Cập nhật ${relTime(data.updatedAt, VI)}` : `Updated ${relTime(data.updatedAt, VI)}`}</span>
                </div>
                <button onClick={() => navigate('/admin/users')} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <h3 className="text-base font-black text-white/95 mb-3 italic">
                {VI ? 'Phân bố vai trò hệ thống' : 'System Role Distribution'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {[
                  { label: VI ? 'Học sinh' : 'Students', value: data.roleBreakdown.students, color: '#3b82f6' },
                  { label: VI ? 'Giáo viên' : 'Teachers', value: data.roleBreakdown.teachers, color: '#10b981' },
                  { label: VI ? 'Phụ huynh' : 'Parents', value: data.roleBreakdown.parents, color: '#f59e0b' },
                  { label: VI ? 'Quản trị' : 'Admins', value: data.roleBreakdown.admins, color: '#ef4444' },
                ].map(r => {
                  const total = data.roleBreakdown.students + data.roleBreakdown.teachers + data.roleBreakdown.parents + data.roleBreakdown.admins;
                  const pct = total > 0 ? Math.round((r.value / total) * 100) : 0;
                  return (
                    <div key={r.label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <p className="text-[9px] font-black uppercase text-white/40">{r.label}</p>
                      <p className="text-xl font-black text-white/90 mt-1" style={{ color: r.color }}>{fmtNum(r.value)}</p>
                      <div className="h-1 bg-white/[0.05] rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                      </div>
                      <p className="text-[9px] font-bold text-white/30 mt-1">{pct}%</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-[10px] font-bold text-white/40">
                  {VI ? 'Tỷ lệ tham gia 7 ngày' : 'Engagement 7d'}: <span className="text-white/70 font-black">{k.attendancePercent}%</span>
                </span>
                <button onClick={() => navigate('/admin/users')} className="px-4 py-1.5 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 0 20px rgba(102,126,234,0.3)' }}>
                  {VI ? 'Quản lý người dùng' : 'Manage Users'}
                </button>
              </div>
            </DarkCard>

            {/* XP Velocity — real data từ BE */}
            <DarkCard className="bg-white/[0.03]">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[.2em] mb-3">
                {VI ? 'Chỉ số học tập' : 'Learning Metrics'}
              </h4>
              <div className="space-y-3">
                {data.xpVelocity.map(x => (
                  <div key={x.id} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-white/55">{VI ? x.labelVi : x.labelEn}</span>
                      <span style={{ color: x.color }}>{Math.min(100, x.value)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, x.value)}%`, background: x.color, boxShadow: `0 0 8px ${x.color}60` }} />
                    </div>
                  </div>
                ))}
                {data.xpVelocity.every(x => x.value === 0) && (
                  <p className="text-[10px] text-white/30 italic pt-2">
                    {VI ? 'Chưa có dữ liệu — HS làm bài tập sẽ hiện ở đây' : 'No data — students need to take exams'}
                  </p>
                )}
              </div>
            </DarkCard>

            {/* Sentiment Map — real từ FaceEmotionSample */}
            <DarkCard className="bg-white/[0.03]">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[.2em] mb-1 flex items-center justify-between">
                <span>{VI ? 'Bản đồ cảm xúc 7d' : 'Sentiment Map 7d'}</span>
                <span style={{ color: sentimentAvg >= 60 ? '#22c55e' : sentimentAvg >= 40 ? '#f59e0b' : '#ef4444' }}>
                  {sentimentAvg}%
                </span>
              </h4>
              <p className="text-[9px] text-white/30 mb-2">
                {VI ? 'Tỷ lệ cảm xúc tích cực mỗi ngày' : 'Daily positive emotion ratio'}
              </p>
              <div className="flex items-end justify-between h-20 gap-1.5">
                {data.sentiment.map(d => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md hover:opacity-100 opacity-80 transition-opacity"
                      style={{
                        height: `${Math.max(8, d.positiveRatio)}%`,
                        background: `linear-gradient(180deg, ${d.positiveRatio >= 60 ? '#22c55e' : d.positiveRatio >= 40 ? '#f59e0b' : '#ef4444'}, rgba(102,126,234,0.25))`,
                      }}
                      title={`${d.date}: ${d.positiveRatio}% tích cực`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {data.sentiment.map(d => (
                  <span key={d.date} className="text-[8px] font-black text-white/20 uppercase">{d.dayShort}</span>
                ))}
              </div>
            </DarkCard>
          </div>

          {/* Enrollment Chart — real từ User.createdAt */}
          <DarkCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-black text-white/70 italic flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                {VI ? 'Tuyển sinh 8 tháng qua' : 'Last 8 Months Enrollment'}
              </h3>
              <Badge variant="info">{enrollmentChart.reduce((s, e) => s + e.students, 0)} {VI ? 'HS mới' : 'new'}</Badge>
            </div>
            {enrollmentChart.length === 0 ? (
              <p className="text-[10px] text-white/30 italic py-8 text-center">
                {VI ? 'Chưa có HS đăng ký 8 tháng qua' : 'No enrollment data in last 8 months'}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={enrollmentChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="students" name={VI ? 'Học sinh' : 'Students'} stroke="#667eea" strokeWidth={2} fill="url(#enrollGrad)" dot={{ fill: '#667eea', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </DarkCard>
        </div>

        {/* Right: Infrastructure */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <SectionHead icon={Settings2} label={VI ? 'Hạ tầng hệ thống' : 'System Infrastructure'} />

          {/* Service registry — real services từ services-health */}
          <DarkCard className="flex-1 p-0 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-white/80 italic">
                  {VI ? 'Trạng thái dịch vụ' : 'Service Registry'}
                </span>
                <span className="text-[10px] font-mono text-purple-400">
                  {activeServices} {VI ? 'BẬT' : 'UP'} / {inactiveServices} {VI ? 'TẮT' : 'DOWN'}
                </span>
              </div>
            </div>
            <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-72">
              {data.services.map(svc => {
                const active = svc.status === 'up';
                const degraded = svc.status === 'degraded';
                return (
                  <div key={svc.name} className="group p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] transition-all flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : degraded ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-[11px] font-black text-white/80 leading-tight">{svc.name}</p>
                        {svc.latencyMs !== undefined && (
                          <p className="text-[9px] text-white/30 font-bold">{svc.latencyMs}ms</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full
                      ${active ? 'text-green-400 bg-green-500/10' : degraded ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'}`}>
                      {healthLabel(svc)}
                    </span>
                  </div>
                );
              })}
            </div>
          </DarkCard>

          {/* Self-Healing Hub */}
          <DarkCard onClick={() => navigate('/admin/operations')}
            className="bg-gradient-to-br from-[#1a1c2c] to-[#1a1025] border-white/[0.06] hover:border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-black text-white/80 italic">
                {VI ? 'Operations Hub' : 'Operations Hub'}
              </h4>
              <Zap className="w-4 h-4 text-orange-400 fill-current" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-black text-white leading-none">{k.systemUptime}%</span>
              <span className={`text-[10px] font-bold ${k.systemUptime >= 95 ? 'text-green-400' : k.systemUptime >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                {k.systemUptime >= 95 ? (VI ? 'TỐI ƯU' : 'OPTIMAL') : k.systemUptime >= 75 ? (VI ? 'CHẤP NHẬN' : 'OK') : (VI ? 'CẢNH BÁO' : 'WARNING')}
              </span>
            </div>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-[.2em] mb-3">
              {VI ? `Uptime ${k.uptimeText}` : `Process up ${k.uptimeText}`}
            </p>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <span className="text-[10px] font-black text-white/55">{VI ? 'Memory · CPU' : 'Memory · CPU'}</span>
              <span className="text-[10px] font-bold text-white/80">{k.moduleLoad}% · {k.cpuPercent}%</span>
            </div>
          </DarkCard>

          {/* Billing Hub — real từ PaymentOrder */}
          <DarkCard onClick={() => navigate('/admin/payments')} className="bg-[#0f0f0f] border-white/[0.04] cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-black text-white/80 italic">
                {VI ? 'Doanh thu' : 'Revenue Hub'}
              </h4>
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-black text-white leading-none">{fmtVnd(data.revenue.total)}</span>
              {data.revenue.last30Days > 0 && (
                <span className="text-[10px] font-bold text-green-400">+{fmtVnd(data.revenue.last30Days)}</span>
              )}
            </div>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-[.2em] mb-3">
              {VI ? `Dự kiến quý: ${fmtVnd(data.revenue.projectedQuarter)}` : `Projected Q: ${fmtVnd(data.revenue.projectedQuarter)}`}
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.05] text-white/50">
                <span>{VI ? 'Đơn đã thanh toán' : 'Paid Orders'}</span>
                <span className="text-white/80">{fmtNum(data.revenue.paidOrders)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.05] text-white/50">
                <span>{VI ? 'Người dùng đã mua' : 'Paying Users'}</span>
                <span className="text-white/80">{fmtNum(data.revenue.paidUsers)}</span>
              </div>
            </div>
          </DarkCard>
        </div>
      </div>

      {/* ── Tier 4: Security + Network ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Security Logs — real từ /api/admin/operations/security-events */}
        <DarkCard>
          <h3 className="text-[11px] font-black text-white/70 italic mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            {VI ? 'Nhật ký bảo mật' : 'Security Logs'}
          </h3>
          <div className="space-y-2">
            {secEvents.length === 0 ? (
              <div className="flex items-center gap-2 py-2 text-[10px] text-white/30 italic">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                {VI ? 'Không có sự kiện bảo mật nào' : 'No security events'}
              </div>
            ) : secEvents.map((ev, i) => {
              const sev = (ev.severity || '').toLowerCase();
              const level = sev === 'critical' || sev === 'high' ? 'danger' : sev === 'medium' || sev === 'warn' ? 'warn' : 'info';
              return (
                <div key={i} className="flex gap-2.5 pb-2 border-b border-white/[0.05] last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                    ${level === 'danger' ? 'bg-red-400 animate-pulse shadow-[0_0_6px_#f87171]'
                    : level === 'warn'   ? 'bg-yellow-400'
                    : 'bg-blue-400'}`} />
                  <div>
                    <p className="text-[11px] font-bold text-white/75 leading-tight">
                      {ev.message || ev.type || (VI ? 'Sự kiện không tên' : 'Unnamed event')}
                    </p>
                    <p className="text-[9px] text-white/25 font-black uppercase tracking-widest">
                      {ev.timestamp ? relTime(ev.timestamp, VI) : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </DarkCard>

        {/* System Health — real từ /api/admin/operations/services-health */}
        <DarkCard>
          <h3 className="text-[11px] font-black text-white/70 italic mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            {VI ? 'Sức khoẻ hệ thống' : 'System Health'}
            <span className="ml-auto text-[10px] font-mono text-white/40">
              {data.servicesSummary.up}/{data.servicesSummary.total}
            </span>
          </h3>
          <div className="space-y-1.5">
            {data.services.slice(0, 6).map(svc => (
              <div key={svc.name} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
                    ${svc.status === 'up' ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : svc.status === 'degraded' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-[11px] font-bold text-white/70">{svc.name}</span>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full
                  ${svc.status === 'up' ? 'text-green-400 bg-green-500/10' : svc.status === 'degraded' ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {healthLabel(svc)}
                </span>
              </div>
            ))}
          </div>
        </DarkCard>

        {/* Network Load — real PageView count last 30h */}
        <DarkCard>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-black text-white/70 italic flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              {VI ? 'Lưu lượng (30h)' : 'Traffic (30h)'}
            </h3>
            <span className="text-[10px] font-mono text-white/40">
              {fmtNum(networkChart.reduce((s, n) => s + (n.requests || 0), 0))} req
            </span>
          </div>
          <div className="h-20 flex items-end gap-0.5 px-1">
            {networkChart.map((d, i) => (
              <div key={i} className="flex-1 rounded-t-sm transition-all group relative"
                style={{
                  height: `${Math.max(3, d.percent)}%`,
                  background: i === networkChart.length - 1 ? '#3b82f6' : 'rgba(102,126,234,0.25)',
                }}>
                {i === networkChart.length - 1 && d.requests > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[8px] font-bold whitespace-nowrap">
                    {d.requests}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-white/30 mt-2 text-right">
            {VI ? 'PageView · 30 giờ qua' : 'PageView · Last 30h'}
          </p>
        </DarkCard>
      </div>
    </div>
  );
}
