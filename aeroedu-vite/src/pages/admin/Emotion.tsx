import React, { useMemo, useState } from 'react';
import {
  Heart, Activity, Brain, TrendingUp, TrendingDown,
  Minus, Users, Smile, Frown, Meh, Zap, Clock,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
interface HeatCell {
  day: string;
  hour: string;
  engagement: number;
}

interface EmotionStat {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'flat';
  trendVal: string;
}

interface ClassSnapshot {
  id: string;
  name: string;
  avgEngagement: number;
  dominantEmotion: string;
  studentCount: number;
  alertLevel: 'none' | 'mild' | 'high';
}

/* ─── Stable mock data (useMemo so no re-render flicker) ─── */
const DAYS    = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS   = ['7h', '8h', '9h', '10h', '11h', '12h', '13h', '14h'];

// Deterministic pseudo-random (no Math.random at render)
function seededVal(day: number, hour: number): number {
  const raw = Math.sin(day * 13.7 + hour * 5.3) * 43758.5453123;
  return Math.abs(raw - Math.floor(raw));
}

const HEATMAP: HeatCell[] = DAYS.flatMap((day, di) =>
  HOURS.map((hour, hi) => ({
    day, hour, engagement: Math.round(seededVal(di, hi) * 85 + 10),
  }))
);

const EMOTIONS: EmotionStat[] = [
  { label: 'Hứng khởi',   value: 34, color: '#f59e0b', icon: Zap,     trend: 'up',   trendVal: '+4%' },
  { label: 'Tập trung',   value: 28, color: '#6366f1', icon: Brain,    trend: 'up',   trendVal: '+2%' },
  { label: 'Lúng túng',   value: 14, color: '#f97316', icon: Meh,      trend: 'down', trendVal: '-3%' },
  { label: 'Chán nản',    value: 11, color: '#64748b', icon: Frown,    trend: 'flat', trendVal: '0%'  },
  { label: 'Lo lắng',     value: 8,  color: '#ec4899', icon: Heart,    trend: 'down', trendVal: '-1%' },
  { label: 'Thất vọng',   value: 5,  color: '#ef4444', icon: TrendingDown, trend: 'down', trendVal: '-2%' },
];

const CLASSES: ClassSnapshot[] = [
  { id: '9A1', name: '9A1 – Toán nâng cao', avgEngagement: 78, dominantEmotion: 'Tập trung', studentCount: 32, alertLevel: 'none' },
  { id: '9A2', name: '9A2 – Vật lý',        avgEngagement: 61, dominantEmotion: 'Hứng khởi', studentCount: 30, alertLevel: 'none' },
  { id: '8B1', name: '8B1 – Văn học',       avgEngagement: 43, dominantEmotion: 'Chán nản',  studentCount: 28, alertLevel: 'mild' },
  { id: '7C2', name: '7C2 – Hóa học',       avgEngagement: 29, dominantEmotion: 'Lúng túng', studentCount: 33, alertLevel: 'high' },
  { id: '10A', name: '10A – Tiếng Anh',     avgEngagement: 82, dominantEmotion: 'Hứng khởi', studentCount: 31, alertLevel: 'none' },
  { id: '11B', name: '11B – Lịch sử',       avgEngagement: 38, dominantEmotion: 'Lo lắng',   studentCount: 29, alertLevel: 'mild' },
];

/* ─── Helpers ────────────────────────────────────────────── */
function engagementColor(val: number): string {
  if (val >= 75) return `rgba(99,102,241,${0.3 + (val / 100) * 0.7})`;
  if (val >= 50) return `rgba(99,102,241,${0.1 + (val / 100) * 0.5})`;
  if (val >= 25) return `rgba(99,102,241,${0.05 + (val / 100) * 0.3})`;
  return 'rgba(255,255,255,0.03)';
}

function alertBadge(level: ClassSnapshot['alertLevel']) {
  if (level === 'high') return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-400">⚠ Cảnh báo</span>;
  if (level === 'mild') return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-yellow-500/15 text-yellow-400">! Chú ý</span>;
  return null;
}

function engBar(pct: number) {
  const color = pct >= 70 ? '#6366f1' : pct >= 50 ? '#f59e0b' : pct >= 35 ? '#f97316' : '#ef4444';
  return (
    <div className="w-full bg-white/[0.05] rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-5 group hover:border-purple-500/30 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 rounded-xl text-white group-hover:scale-110 transition-transform"
          style={{ background: color, boxShadow: `0 0 14px ${color}50` }}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[10px] text-white/30 font-mono">{sub}</span>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">{label}</p>
      <p className="text-2xl font-black text-white/90">{value}</p>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AdminEmotion() {
  const [hoverCell, setHoverCell] = useState<HeatCell | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const displayedHeatmap = useMemo(() =>
    selectedDay ? HEATMAP.filter(c => c.day === selectedDay) : HEATMAP,
  [selectedDay]);

  const avgEngagement = useMemo(() =>
    Math.round(HEATMAP.reduce((s, c) => s + c.engagement, 0) / HEATMAP.length),
  []);

  const alertCount = CLASSES.filter(c => c.alertLevel !== 'none').length;

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8 relative">

      {/* Ambient blobs */}
      <div className="fixed -bottom-24 -right-24 w-80 h-80 bg-pink-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="fixed -top-24 -left-24  w-80 h-80 bg-purple-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg,#ec4899 0%,#a855f7 100%)' }}>
              <Heart className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg,#ec4899 0%,#a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Emotion & Engagement Monitor
            </h1>
          </div>
          <p className="text-sm text-white/50">Theo dõi trạng thái cảm xúc và mức độ tập trung theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Cập nhật: vừa xong
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tổng lớp giám sát" value={CLASSES.length}     sub="lớp học"     icon={Users}      color="#6366f1" />
        <StatCard label="Engagement TB"      value={`${avgEngagement}%`} sub="hôm nay"     icon={Activity}   color="#a855f7" />
        <StatCard label="Cảm xúc chủ đạo"   value="Tập trung"           sub="toàn trường" icon={Brain}      color="#ec4899" />
        <StatCard label="Lớp cần chú ý"      value={alertCount}          sub="cảnh báo"    icon={Smile}      color="#f97316" />
      </div>

      {/* ── Two-column layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

        {/* Heatmap — spans 2 cols */}
        <div className="xl:col-span-2 bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-white/90 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Engagement Heatmap
            </h2>
            {/* Day filter pills */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDay(null)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all
                  ${selectedDay === null ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                style={selectedDay === null ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}
              >
                Cả tuần
              </button>
              {DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d === selectedDay ? null : d)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all
                    ${selectedDay === d ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                  style={selectedDay === d ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Hour labels */}
          <div className={`grid gap-1.5 mb-1 ${selectedDay ? 'grid-cols-8' : 'grid-cols-8'}`}
            style={{ paddingLeft: selectedDay ? '0' : '40px' }}>
            {HOURS.map(h => (
              <div key={h} className="text-center text-[9px] text-white/25 font-mono">{h}</div>
            ))}
          </div>

          {/* Grid rows */}
          <div className="space-y-1.5">
            {(selectedDay ? [selectedDay] : DAYS).map(day => (
              <div key={day} className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/30 font-mono w-8 flex-shrink-0 text-right">{day}</span>
                <div className="flex-1 grid grid-cols-8 gap-1.5">
                  {HOURS.map((hour, hi) => {
                    const di = DAYS.indexOf(day);
                    const cell = HEATMAP.find(c => c.day === day && c.hour === hour)!;
                    return (
                      <div
                        key={hour}
                        onMouseEnter={() => setHoverCell(cell)}
                        onMouseLeave={() => setHoverCell(null)}
                        title={`${day} ${hour}: ${cell.engagement}%`}
                        className="aspect-square rounded-lg flex items-center justify-center text-[9px] font-bold cursor-default transition-all hover:scale-105 hover:z-10"
                        style={{
                          background: engagementColor(cell.engagement),
                          color: cell.engagement > 55 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                          border: hoverCell === cell ? '1px solid rgba(99,102,241,0.6)' : '1px solid transparent',
                        }}
                      >
                        {cell.engagement}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.05]">
            <span className="text-[9px] text-white/30">Thấp</span>
            {[10, 30, 50, 70, 90].map(v => (
              <div key={v} className="w-5 h-3 rounded-sm" style={{ background: engagementColor(v) }} />
            ))}
            <span className="text-[9px] text-white/30">Cao</span>
            {hoverCell && (
              <span className="ml-auto text-[10px] text-indigo-300 font-mono">
                {hoverCell.day} {hoverCell.hour} → {hoverCell.engagement}%
              </span>
            )}
          </div>
        </div>

        {/* Emotion distribution */}
        <div className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-base font-bold text-white/90 flex items-center gap-2 mb-5">
            <Brain className="w-5 h-5 text-pink-400" />
            Phân bố cảm xúc
          </h2>

          {/* Donut-style summary */}
          <div className="flex items-center gap-3 mb-6 p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                {EMOTIONS.reduce<{ offset: number; els: React.ReactNode[] }>((acc, em) => {
                  const circ = 2 * Math.PI * 14;
                  const dash = (em.value / 100) * circ;
                  const gap  = circ - dash;
                  acc.els.push(
                    <circle key={em.label} cx="18" cy="18" r="14" fill="none"
                      stroke={em.color} strokeWidth="4"
                      strokeDasharray={`${dash} ${gap}`}
                      strokeDashoffset={-acc.offset}
                    />
                  );
                  acc.offset += dash;
                  return acc;
                }, { offset: 0, els: [] }).els}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-white/60">100%</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-white/80">Hứng khởi + Tập trung</p>
              <p className="text-lg font-black text-indigo-300">62%</p>
              <p className="text-[10px] text-white/40">trạng thái tích cực</p>
            </div>
          </div>

          <div className="space-y-3">
            {EMOTIONS.map(em => {
              const Icon = em.icon;
              return (
                <div key={em.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: em.color }} />
                      <span className="text-xs font-medium text-white/80">{em.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white/50">{em.value}%</span>
                      <span className={`text-[9px] font-bold flex items-center gap-0.5
                        ${em.trend === 'up' ? 'text-green-400' : em.trend === 'down' ? 'text-red-400' : 'text-white/30'}`}>
                        {em.trend === 'up' ? '↑' : em.trend === 'down' ? '↓' : '→'} {em.trendVal}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${em.value}%`, background: em.color, boxShadow: `0 0 8px ${em.color}60` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Class snapshots ────────────────────────────────── */}
      <div className="bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-base font-bold text-white/90 flex items-center gap-2 mb-5">
          <Users className="w-5 h-5 text-purple-400" />
          Trạng thái từng lớp
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CLASSES.map(cls => (
            <div
              key={cls.id}
              className={`p-4 rounded-xl border transition-all hover:border-purple-500/30 cursor-default
                ${cls.alertLevel === 'high' ? 'bg-red-500/5 border-red-500/20'
                : cls.alertLevel === 'mild' ? 'bg-yellow-500/5 border-yellow-500/15'
                : 'bg-white/[0.02] border-white/[0.06]'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-white/90 leading-tight">{cls.name}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{cls.studentCount} học sinh</p>
                </div>
                {alertBadge(cls.alertLevel)}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-white/40 mb-0.5">Cảm xúc chủ đạo</p>
                  <p className="text-xs font-bold text-white/70">{cls.dominantEmotion}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40">Engagement</p>
                  <p className={`text-lg font-black leading-none
                    ${cls.avgEngagement >= 70 ? 'text-indigo-300'
                    : cls.avgEngagement >= 50 ? 'text-yellow-400'
                    : cls.avgEngagement >= 35 ? 'text-orange-400'
                    : 'text-red-400'}`}>
                    {cls.avgEngagement}%
                  </p>
                </div>
              </div>
              {engBar(cls.avgEngagement)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
