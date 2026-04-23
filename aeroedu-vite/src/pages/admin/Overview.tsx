import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  Shield, Users, Award, Activity, Cpu, Server,
  Brain, Settings2, Plus, RefreshCw, Zap,
  DollarSign, Globe, BookOpen, Video, ChevronRight,
  Clock, Lock, AlertTriangle, CheckCircle,
  TrendingUp, TrendingDown, Network, HardDrive,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
interface Module {
  id: string; name: string; description: string;
  icon: React.ElementType; status: 'active' | 'maintenance' | 'inactive';
  category: string; usage: number;
}

type TimeRange = 'today' | 'week' | 'month';

/* ─── Mock data ──────────────────────────────────────────── */
const ENROLLMENT_DATA = [
  { month: 'T1', students: 180 }, { month: 'T2', students: 220 },
  { month: 'T3', students: 290 }, { month: 'T4', students: 340 },
  { month: 'T5', students: 410 }, { month: 'T6', students: 520 },
  { month: 'T7', students: 480 }, { month: 'T8', students: 560 },
];

// Deterministic network load bars (no Math.random at render)
const NETWORK_DATA = Array.from({ length: 30 }, (_, i) => ({
  i,
  v: Math.round(20 + Math.abs(Math.sin(i * 0.4 + 1.2) * 60)),
}));

const SENTIMENT_DATA = [40, 65, 80, 50, 90, 75, 60];
const SENTIMENT_DAYS  = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const SECURITY_LOGS = [
  { t: 'Firewall Breach Blocked',   time: '2 phút trước', level: 'danger' as const },
  { t: 'Unauthorized Node Login',   time: '5 phút trước', level: 'warn'   as const },
  { t: 'API Key Rotated',           time: '14 phút trước', level: 'info'  as const },
  { t: 'Auth Token Expired × 3',   time: '22 phút trước', level: 'warn'   as const },
];

const HEALTH_SERVICES = [
  { name: 'Database',     status: 'online'   as const },
  { name: 'Auth Service', status: 'online'   as const },
  { name: 'AI Service',   status: 'degraded' as const },
  { name: 'Camera Svc',   status: 'online'   as const },
  { name: 'IoT Gateway',  status: 'online'   as const },
];

const XP_METRICS = [
  { l: 'Quiz Mastery',     v: 82, color: '#3b82f6' },
  { l: 'Attendance',       v: 94, color: '#22c55e' },
  { l: 'STEM Engagement',  v: 46, color: '#f97316' },
];

const INIT_MODULES: Module[] = [
  { id: 'users',    name: 'Users',     description: 'Identity & Access Control',  icon: Users,    status: 'active',      category: 'Core',       usage: 95 },
  { id: 'lms',      name: 'Curriculum',description: 'LMS Content Strategy',       icon: BookOpen, status: 'active',      category: 'Core',       usage: 82 },
  { id: 'video',    name: 'Streaming', description: 'VOD & Real-time Delivery',   icon: Video,    status: 'active',      category: 'Media',      usage: 45 },
  { id: 'appraise', name: 'Appraisal', description: 'Automated Assessment',       icon: Award,    status: 'active',      category: 'Assessment', usage: 60 },
  { id: 'stem',     name: 'STEM Labs', description: '3D Virtual Environments',    icon: Zap,      status: 'maintenance', category: 'Advanced',   usage: 12 },
];

/* ─── Helpers ────────────────────────────────────────────── */
function DarkCard({ children, className = '', style, onClick }: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-6 transition-all ${onClick ? 'cursor-pointer hover:border-purple-500/30 hover:scale-[1.01]' : 'hover:border-white/[0.1]'} ${className}`}
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
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cls[variant]}`} style={style}>
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

function KPICard({ label, value, trend, change, icon: Icon, color, borderColor }: {
  label: string; value: string | number; trend: 'up' | 'down' | 'stable';
  change: number; icon: React.ElementType; color: string; borderColor: string;
}) {
  return (
    <DarkCard className="border-l-4" style={{ borderLeftColor: borderColor }}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-white/[0.04]" style={{ color }}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black
          ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-white/20'}`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : '●'}
          {change > 0 ? ` +${change}%` : change < 0 ? ` ${change}%` : ''}
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40 mb-1">{label}</p>
      <h3 className="text-2xl font-black text-white/90">{value}</h3>
    </DarkCard>
  );
}

/* ─── Custom tooltip for recharts ───────────────────────── */
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

/* ─── Module toggle row ─────────────────────────────────── */
function ModuleRow({ mod, onToggle }: { mod: Module; onToggle: (id: string) => void }) {
  const active = mod.status === 'active';
  return (
    <div className="group p-3 rounded-xl border border-white/[0.05] hover:border-purple-500/20 bg-white/[0.02] transition-all flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${active ? 'bg-purple-500/10 text-purple-300' : 'bg-white/[0.03] text-white/20'}`}>
          <mod.icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] font-black text-white/80">{mod.name}</p>
          <p className="text-[9px] text-white/30 uppercase font-bold">{mod.category}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-bold text-white/40">{mod.usage}% LOAD</p>
          <div className="w-12 h-0.5 bg-white/[0.05] mt-1 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${mod.usage}%`, background: 'linear-gradient(90deg,#667eea,#764ba2)' }} />
          </div>
        </div>
        {/* Toggle */}
        <button onClick={() => onToggle(mod.id)}
          className={`w-9 h-5 rounded-full relative transition-all ${active ? 'bg-purple-600' : 'bg-white/10'}`}>
          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-5' : 'left-1'}`} />
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function Overview() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [modules, setModules] = useState<Module[]>(INIT_MODULES);
  const [loading, setLoading] = useState(false);

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m =>
      m.id === id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m
    ));
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  const activeModules   = modules.filter(m => m.status === 'active').length;
  const inactiveModules = modules.filter(m => m.status !== 'active').length;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-10 relative">
      {/* Ambient blobs */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-indigo-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed -top-24 -right-24  w-96 h-96 bg-purple-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* ── Tier 1: Header ──────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', boxShadow: '0 0 24px rgba(102,126,234,0.35)' }}>
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic"
              style={{ background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.45) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Command Center
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge variant="success">System Healthy</Badge>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">v4.2.0-Production</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range */}
          <div className="flex p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
            {(['today', 'week', 'month'] as TimeRange[]).map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all
                  ${timeRange === r ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                style={timeRange === r ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}>
                {r === 'today' ? 'Hôm nay' : r === 'week' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-purple-500/30 transition-all">
            <RefreshCw className={`w-5 h-5 text-white/50 hover:text-purple-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Tier 2: KPI Cards ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
        <KPICard label="Active Students" value="1,247"  trend="up"     change={12} icon={Users}    color="#3b82f6" borderColor="#3b82f6" />
        <KPICard label="Avg Mastery"     value="78%"    trend="up"     change={5}  icon={Award}    color="#10b981" borderColor="#10b981" />
        <KPICard label="System Uptime"   value="99.9%"  trend="stable" change={0}  icon={Activity} color="#6366f1" borderColor="#6366f1" />
        <KPICard label="Module Load"     value="64%"    trend="down"   change={-2} icon={Cpu}      color="#f59e0b" borderColor="#f59e0b" />
        {/* Agent OS */}
        <DarkCard className="border-l-4" style={{ borderLeftColor: '#ef4444' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-white/[0.04] text-purple-400">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-red-400">OFFLINE</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40 mb-1">Agent OS</p>
          <h3 className="text-xl font-black text-white/90">Unavailable</h3>
        </DarkCard>
      </div>

      {/* ── Tier 3: Intelligence + Infrastructure ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">

        {/* Left: Actionable Intelligence */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <SectionHead icon={Brain} label="Actionable Intelligence" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Critical Alert — spans 2 cols */}
            <DarkCard className="md:col-span-2 relative overflow-hidden border-red-500/20 hover:border-red-500/35">
              <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/[0.05] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="danger">Critical Alert</Badge>
                  <span className="text-[10px] text-white/30">Vừa xong</span>
                </div>
                <button className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors">
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
              <h3 className="text-lg font-black text-white/95 mb-2 italic">Student Retention Risk Detected</h3>
              <p className="text-sm text-white/55 mb-6 leading-relaxed">
                AI patterns show a 14% drop in engagement for Grade 12 Advanced Math.
                Recommended: Immediate curriculum review or teacher intervention.
              </p>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[hsl(260,30%,8%)] bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">S{i}</div>
                  ))}
                </div>
                <button className="px-5 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 0 20px rgba(102,126,234,0.3)' }}>
                  Initiate Analysis
                </button>
              </div>
            </DarkCard>

            {/* XP Velocity */}
            <DarkCard className="bg-white/[0.03]">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[.2em] mb-4">XP Velocity</h4>
              <div className="space-y-4">
                {XP_METRICS.map((x, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-white/55">{x.l}</span>
                      <span style={{ color: x.color }}>{x.v}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${x.v}%`, background: x.color, boxShadow: `0 0 8px ${x.color}60` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DarkCard>

            {/* Sentiment Map */}
            <DarkCard className="bg-white/[0.03]">
              <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[.2em] mb-4">Sentiment Map</h4>
              <div className="flex items-end justify-between h-24 gap-1.5">
                {SENTIMENT_DATA.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-md hover:opacity-100 opacity-80 transition-opacity"
                      style={{ height: `${h}%`, background: 'linear-gradient(180deg,#667eea,rgba(102,126,234,0.25))' }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {SENTIMENT_DAYS.map(d => (
                  <span key={d} className="text-[8px] font-black text-white/20 uppercase">{d}</span>
                ))}
              </div>
            </DarkCard>
          </div>

          {/* Enrollment Chart */}
          <DarkCard>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-black text-white/70 italic flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Tuyển sinh theo tháng
              </h3>
              <Badge variant="info">{timeRange === 'today' ? 'Hôm nay' : timeRange === 'week' ? 'Tuần này' : 'Năm 2026'}</Badge>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={ENROLLMENT_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                <Area type="monotone" dataKey="students" name="Học sinh" stroke="#667eea" strokeWidth={2} fill="url(#enrollGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </DarkCard>
        </div>

        {/* Right: Infrastructure */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <SectionHead icon={Settings2} label="System Architecture" />

          {/* Module registry */}
          <DarkCard className="flex-1 p-0 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-white/80 italic">Active Node Registry</span>
                <span className="text-[10px] font-mono text-purple-400">{activeModules} ON / {inactiveModules} OFF</span>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto">
              {modules.map(m => (
                <ModuleRow key={m.id} mod={m} onToggle={toggleModule} />
              ))}
              <div className="pt-3 mt-1 border-t border-white/[0.05]">
                <button className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.08] text-white/35 text-[10px] font-black uppercase tracking-widest hover:border-purple-500/30 hover:text-white/60 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Deploy New Instance
                </button>
              </div>
            </div>
          </DarkCard>

          {/* Self-Healing Hub */}
          <DarkCard onClick={() => navigate('/admin/operations')}
            className="bg-gradient-to-br from-[#1a1c2c] to-[#1a1025] border-white/[0.06] hover:border-orange-500/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[11px] font-black text-white/80 italic">Self-Healing Hub</h4>
              <Zap className="w-4 h-4 text-orange-400 fill-current" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-black text-white">99%</span>
              <span className="text-[10px] font-bold text-green-400">OPTIMIZED</span>
            </div>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-[.2em] mb-5">Manage System Velocity</p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/[0.05]">
              <span className="text-[10px] font-black text-white/55">Active Patching</span>
              <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />
            </div>
          </DarkCard>

          {/* Billing Hub */}
          <DarkCard className="bg-[#0f0f0f] border-white/[0.04]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[11px] font-black text-white/80 italic">Billing Hub</h4>
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-black text-white">$14,502</span>
              <span className="text-[10px] font-bold text-green-400">+$2.1k</span>
            </div>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-[.2em] mb-5">Projected Revenue (Q1)</p>
            <div className="space-y-2">
              {[
                { label: 'Premium Tiers',    value: '652 Users' },
                { label: 'Enterprise Nodes', value: '12 Teams'  },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-[10px] font-bold px-2.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.05] text-white/50">
                  <span>{row.label}</span>
                  <span className="text-white/80">{row.value}</span>
                </div>
              ))}
            </div>
          </DarkCard>
        </div>
      </div>

      {/* ── Tier 4: Security + Network ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Security Logs */}
        <DarkCard>
          <h3 className="text-[11px] font-black text-white/70 italic mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" /> Security Logs
          </h3>
          <div className="space-y-3">
            {SECURITY_LOGS.map((log, i) => (
              <div key={i} className="flex gap-3 pb-3 border-b border-white/[0.05] last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                  ${log.level === 'danger' ? 'bg-red-400 animate-pulse shadow-[0_0_6px_#f87171]'
                  : log.level === 'warn'   ? 'bg-yellow-400'
                  : 'bg-blue-400'}`} />
                <div>
                  <p className="text-[11px] font-bold text-white/75">{log.t}</p>
                  <p className="text-[9px] text-white/25 font-black uppercase tracking-widest">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </DarkCard>

        {/* System Health */}
        <DarkCard>
          <h3 className="text-[11px] font-black text-white/70 italic mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" /> System Health
          </h3>
          <div className="space-y-2">
            {HEALTH_SERVICES.map(svc => (
              <div key={svc.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
                    ${svc.status === 'online' ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-yellow-400 animate-pulse'}`} />
                  <span className="text-[11px] font-bold text-white/70">{svc.name}</span>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full
                  ${svc.status === 'online' ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                  {svc.status === 'online' ? 'Online' : 'Degraded'}
                </span>
              </div>
            ))}
          </div>
        </DarkCard>

        {/* Network Load */}
        <DarkCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-black text-white/70 italic flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Global Network Load
            </h3>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase text-white/30">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-blue-500" /> Latency</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-purple-500" /> Traffic</span>
            </div>
          </div>
          <div className="h-24 flex items-end gap-0.5 px-1">
            {NETWORK_DATA.map((d, i) => (
              <div key={i} className="flex-1 rounded-t-sm transition-all group relative"
                style={{ height: `${d.v}%`, background: i === 15 ? '#3b82f6' : 'rgba(102,126,234,0.25)' }}>
                {i === 15 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[8px] font-bold whitespace-nowrap">
                    12ms
                  </div>
                )}
              </div>
            ))}
          </div>
        </DarkCard>
      </div>
    </div>
  );
}
