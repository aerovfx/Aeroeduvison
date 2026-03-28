'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Heart, Smile, Frown, Meh, Zap, Target, Users, Eye, Activity,
  Brain, Camera, Focus, TrendingUp, TrendingDown, AlertTriangle,
  Sparkles, Timer, BarChart3, ArrowUpRight, ArrowDownRight,
  ChevronRight, ChevronDown, Layers, Shield, BookOpen, Star,
  Volume2, Monitor, Wifi
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { EMOTION_CONFIG, EmotionType } from '../vision-tracker/advanced-emotion-recognition';

// ───────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────
interface EmotionBucket {
  periodStart: string; sampleCount: number; avgConfidence: number;
  dominantEmotion: string | null; distribution: Record<string, number>;
}
interface EmotionSummary {
  from: string; to: string; totalSamples: number; avgConfidence: number;
  emotionDistribution: Record<string, number>; dominantEmotion: string | null;
}
interface Student {
  id: number; name: string; emotion: string; performance: number;
  energy: number; x: number; y: number; seatLabel?: string;
}
interface ClassData {
  id: string; name: string; teacher: string; room: string;
  students: Student[]; camera: string; schedule: string;
}

// ───────────────────────────────────────────────
// PALETTE
// ───────────────────────────────────────────────
const C = {
  teal: 'hsl(175,80%,50%)', blue: 'hsl(210,90%,60%)', purple: 'hsl(245,85%,65%)',
  violet: 'hsl(280,75%,60%)', amber: 'hsl(35,90%,55%)', red: 'hsl(0,70%,55%)',
  green: 'hsl(145,70%,45%)', pink: 'hsl(330,80%,60%)', cyan: 'hsl(190,85%,55%)',
};
const EMOTION_CLR: Record<string, string> = {
  happy: C.green, very_happy: C.teal, laughing: C.teal, excited: C.amber,
  energetic: C.amber, confident: C.blue, grateful: C.pink, hopeful: C.green,
  humble: C.purple, concentrating: C.blue, thinking: C.purple,
  neutral: 'hsl(220,15%,50%)', confused: C.amber, surprised: C.amber,
  worried: C.violet, sad: C.blue, crying: C.blue, angry: C.red, annoyed: C.red,
  fearful: C.violet, stressed: C.red, bored: 'hsl(220,10%,45%)',
  sleepy: 'hsl(220,10%,40%)', exhausted: C.red, desperate: C.red,
};
const eClr = (e: string) => EMOTION_CLR[e] || C.purple;
const glass = "bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl";
const glassH = "hover:bg-white/[0.04] hover:border-white/[0.1] hover:-translate-y-0.5 transition-all duration-300";

// ───────────────────────────────────────────────
// STUDENT ROSTERS — Lớp 11A2 & 10A6
// ───────────────────────────────────────────────
const NAMES_11A2 = [
  'Nguyễn Minh Anh','Trần Đức Bảo','Lê Thị Cẩm','Phạm Hoàng Duy','Vũ Ngọc Hà',
  'Đỗ Quốc Hưng','Hoàng Thị Lan','Bùi Văn Long','Đặng Thu Mai','Ngô Thanh Nam',
  'Trịnh Hải Phong','Lý Quỳnh Như','Cao Minh Quân','Đinh Thùy Trang','Hồ Anh Tuấn',
  'Phan Bích Ngọc','Dương Công Vinh','Võ Thị Yến','Tạ Đình Khoa','Mai Hương Giang',
  'Lương Thanh Sơn','Châu Thị Bích','Nghiêm Đức Thắng','Tô Minh Châu','Kiều Thị Hồng',
  'Hà Quốc Đạt','Thái Văn Hùng','Lâm Ngọc Diệp','Sơn Thị Thảo','Trương Minh Đức',
  'Huỳnh Thị Linh','Phùng Văn Tài','Đoàn Thị Nhung','Nguyễn Hữu Phát','Lê Thị Mỹ Duyên',
  'Trần Quang Hải','Phạm Thị Kim Chi','Vũ Đình Toàn','Đỗ Thị Thanh Huyền','Hoàng Minh Trí',
];
const NAMES_10A6 = [
  'Bùi Thị An','Cao Văn Bình','Đặng Minh Châu','Đinh Thị Dung','Dương Quốc Em',
  'Hà Thị Phương','Hoàng Đức Giang','Huỳnh Thị Hoa','Kiều Văn Khải','Lâm Thị Lệ',
  'Lê Công Minh','Lương Thị Nga','Lý Đình Phúc','Mai Thị Quyên','Ngô Anh Sáng',
  'Nguyễn Thị Tâm','Nghiêm Văn Uy','Phạm Thị Vân','Phan Đức Anh','Sơn Thị Bảo',
  'Tạ Minh Cường','Thái Thị Diễm','Tô Văn Hiếu','Trần Thị Khánh','Trịnh Đình Lâm',
  'Trương Thị Mến','Võ Đức Nghĩa','Vũ Thị Oanh','Châu Minh Phát','Đoàn Thị Thanh',
  'Hồ Quốc Trung','Lê Thị Uyên','Nguyễn Văn Vinh','Phạm Thị Xuân','Cao Đình Yên',
  'Đặng Thị Ánh','Đinh Văn Bách','Hoàng Thị Cúc','Huỳnh Minh Đạt','Kiều Thị Hằng',
];

function makeStudents(names: string[], seed: number): Student[] {
  const emos = ['happy','concentrating','neutral','sad','stressed','excited','bored','thinking','worried','confident'];
  return names.map((name, i) => {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const s = (seed + i * 7 + 13) % 100;
    return {
      id: i + 1, name, emotion: emos[(i + seed) % emos.length],
      performance: 50 + (s % 45), energy: 35 + (s % 55),
      x: 7 + col * 11.8, y: 10 + row * 17,
      seatLabel: `${String.fromCharCode(65 + col)}${row + 1}`,
    };
  });
}

const CLASSES: ClassData[] = [
  { id: '11a2', name: 'Lớp 11A2', teacher: 'Cô Nguyễn Thị Hương', room: 'P.301', students: makeStudents(NAMES_11A2, 3), camera: 'CAM-301-A', schedule: 'Tiết 1-2 (7:00-8:30)' },
  { id: '10a6', name: 'Lớp 10A6', teacher: 'Thầy Trần Văn Minh', room: 'P.205', students: makeStudents(NAMES_10A6, 7), camera: 'CAM-205-A', schedule: 'Tiết 3-4 (8:45-10:15)' },
];

// ───────────────────────────────────────────────
// SVG: Radial Progress
// ───────────────────────────────────────────────
function Radial({ value, size = 96, sw = 7, color = C.teal, icon: Icon, sub }: {
  value: number; size?: number; sw?: number; color?: string; sub?: string; icon?: any;
}) {
  const r = (size - sw) / 2, circ = r * 2 * Math.PI, off = circ - (Math.min(value, 100) / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 text-foreground/[0.06]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {Icon && <Icon className="h-3.5 w-3.5 mb-0.5" style={{ color }} />}
        <span className="text-sm font-bold text-white/90">{value}%</span>
        {sub && <span className="text-[0.5rem] text-white/25 mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// SVG: Stacked Area Wave
// ───────────────────────────────────────────────
function WaveChart({ data, h = 140 }: { data: { label: string; vals: Record<string, number> }[]; h?: number }) {
  if (!data || data.length < 2) return <div className="text-white/15 text-xs text-center py-10">Chưa có dữ liệu camera</div>;
  const w = 600, pad = { t: 8, b: 22, l: 0, r: 0 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const emos = ['happy','concentrating','neutral','sad','angry'];
  const cols = [C.green, C.blue, 'hsl(220,15%,50%)', C.violet, C.red];
  const norm = data.map(d => {
    const tot = Object.values(d.vals).reduce((s, v) => s + v, 0) || 1;
    const m: Record<string, number> = {};
    emos.forEach(e => {
      let v = d.vals[e] || 0;
      if (e === 'happy') v += (d.vals.very_happy||0)+(d.vals.laughing||0)+(d.vals.excited||0)+(d.vals.grateful||0)+(d.vals.hopeful||0)+(d.vals.energetic||0)+(d.vals.confident||0);
      if (e === 'concentrating') v += (d.vals.thinking||0);
      if (e === 'neutral') v += (d.vals.confused||0)+(d.vals.surprised||0)+(d.vals.bored||0)+(d.vals.sleepy||0);
      if (e === 'sad') v += (d.vals.worried||0)+(d.vals.crying||0)+(d.vals.fearful||0)+(d.vals.desperate||0)+(d.vals.exhausted||0);
      if (e === 'angry') v += (d.vals.annoyed||0)+(d.vals.stressed||0);
      m[e] = (v / tot) * 100;
    });
    return { ...d, pct: m };
  });
  const step = pw / (norm.length - 1);
  const areas: { path: string; color: string }[] = [];
  const bases = norm.map(() => 0);
  emos.forEach((emo, ei) => {
    const tops = norm.map((d, i) => bases[i] + (d.pct[emo] || 0));
    let up = '', dn = '';
    tops.forEach((v, i) => { const x = pad.l + i * step, y = pad.t + ph - (v / 100) * ph; up += (i === 0 ? 'M' : 'L') + `${x},${y}`; });
    for (let i = norm.length - 1; i >= 0; i--) { const x = pad.l + i * step, y = pad.t + ph - (bases[i] / 100) * ph; dn += `L${x},${y}`; }
    areas.push({ path: up + dn + 'Z', color: cols[ei] });
    tops.forEach((v, i) => { bases[i] = v; });
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <defs>{areas.map((a, i) => <linearGradient key={i} id={`wg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={a.color} stopOpacity="0.55" /><stop offset="100%" stopColor={a.color} stopOpacity="0.1" /></linearGradient>)}</defs>
      {areas.map((a, i) => <path key={i} d={a.path} fill={`url(#wg${i})`} stroke={a.color} strokeWidth="1" strokeOpacity="0.35" />)}
      {norm.filter((_, i) => i % Math.max(1, Math.floor(norm.length / 8)) === 0 || i === norm.length - 1).map((d, idx, arr) => {
        const oi = norm.indexOf(d);
        return <text key={oi} x={pad.l + oi * step} y={h - 3} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8">{d.label}</text>;
      })}
    </svg>
  );
}

// ───────────────────────────────────────────────
// SVG: Donut
// ───────────────────────────────────────────────
function Donut({ segs, size = 130, thick = 16, centerLabel, centerSub }: {
  segs: { label: string; value: number; color: string; emoji?: string }[];
  size?: number; thick?: number; centerLabel?: string; centerSub?: string;
}) {
  const total = segs.reduce((s, sg) => s + sg.value, 0) || 1;
  const r = (size - thick) / 2, circ = r * 2 * Math.PI;
  let off = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 text-foreground/[0.06]">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={thick} />
        {segs.map((sg, i) => {
          const pct = sg.value / total, dash = pct * circ, gap = circ - dash, cur = off; off += dash;
          return <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={sg.color} strokeWidth={thick}
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-cur}
            className="transition-all duration-700" style={{ filter: `drop-shadow(0 0 4px ${sg.color}30)` }} />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white/90">{centerLabel || total}</span>
        <span className="text-[0.5rem] text-white/25">{centerSub || 'mẫu'}</span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Interactive Heatmap (DOM-based, drag-and-drop)
// ───────────────────────────────────────────────
function Heatmap({ students, height = 280, onStudentMove, onStudentClick, editMode = false }: {
  students: Student[]; height?: number;
  onStudentMove?: (id: number, x: number, y: number) => void;
  onStudentClick?: (s: Student) => void;
  editMode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Draw heatmap blobs on canvas (background layer)
  const drawBlobs = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const rc = cv.getBoundingClientRect();
    const dp = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
    cv.width = rc.width * dp; cv.height = rc.height * dp;
    ctx.scale(dp, dp);
    ctx.clearRect(0, 0, rc.width, rc.height);
    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
    for (let r = 0; r <= 5; r++) { const y = (r / 5) * rc.height; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rc.width, y); ctx.stroke(); }
    for (let c = 0; c <= 8; c++) { const x = (c / 8) * rc.width; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rc.height); ctx.stroke(); }
    // Seat grid dots
    for (let r = 0; r <= 5; r++) {
      for (let c = 0; c <= 8; c++) {
        const x = (c / 8) * rc.width, y = (r / 5) * rc.height;
        ctx.fillStyle = 'rgba(255,255,255,0.015)';
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Radial glow blobs (screen mode)
    ctx.globalCompositeOperation = 'screen';
    students.forEach(s => {
      const x = (s.x / 100) * rc.width, y = (s.y / 100) * rc.height;
      const rgb = s.emotion === 'happy' || s.emotion === 'very_happy' || s.emotion === 'excited' ? [56, 200, 120]
        : s.emotion === 'concentrating' || s.emotion === 'thinking' || s.emotion === 'confident' ? [80, 140, 240]
        : s.emotion === 'stressed' || s.emotion === 'angry' || s.emotion === 'annoyed' ? [230, 80, 80]
        : s.emotion === 'sad' || s.emotion === 'worried' || s.emotion === 'crying' ? [140, 100, 220]
        : [120, 120, 140];
      const int = s.performance / 100;
      const rad = 35 + (s.energy / 100) * 30;
      const isHov = s.id === hoveredId || s.id === dragId;
      const mult = isHov ? 1.4 : 1;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad * mult);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${int * (isHov ? 0.8 : 0.5)})`);
      g.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${int * (isHov ? 0.35 : 0.15)})`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * mult, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }, [students, hoveredId, dragId]);

  useEffect(() => {
    drawBlobs();
    const h = () => drawBlobs();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [drawBlobs]);

  // Snap position to grid
  const snapToGrid = (val: number) => {
    const step = 11.8;
    return Math.round(val / step) * step;
  };

  // Mouse handlers for drag-and-drop
  const handleMouseDown = (e: React.MouseEvent, s: Student) => {
    if (!editMode) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragId(s.id);
    setDragOffset({
      x: e.clientX - (s.x / 100) * rect.width,
      y: e.clientY - (s.y / 100) * rect.height,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragId === null || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newX = ((e.clientX - dragOffset.x) / rect.width) * 100;
    let newY = ((e.clientY - dragOffset.y) / rect.height) * 100;
    newX = Math.max(3, Math.min(97, newX));
    newY = Math.max(3, Math.min(97, newY));
    onStudentMove?.(dragId, newX, newY);
  }, [dragId, dragOffset, onStudentMove]);

  const handleMouseUp = useCallback(() => {
    if (dragId === null) return;
    // Snap to grid on release
    const student = students.find(s => s.id === dragId);
    if (student && onStudentMove) {
      onStudentMove(dragId, snapToGrid(student.x), snapToGrid(student.y));
    }
    setDragId(null);
  }, [dragId, students, onStudentMove]);

  useEffect(() => {
    if (dragId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragId, handleMouseMove, handleMouseUp]);

  const hoveredStudent = students.find(s => s.id === hoveredId);

  return (
    <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden"
      style={{ height, background: 'radial-gradient(ellipse at 50% 30%, rgba(120,100,255,0.04) 0%, rgba(0,0,0,0.3) 100%)' }}>
      {/* Canvas background blobs */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ mixBlendMode: 'screen' }} />

      {/* Teacher desk indicator */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] z-10">
        <span className="text-[0.5rem] text-white/20 tracking-wider uppercase">Bảng giáo viên</span>
      </div>

      {/* Student nodes (DOM elements) */}
      {students.map(s => {
        const cfg = EMOTION_CONFIG[s.emotion as EmotionType];
        const col = cfg?.color || '#6b7280';
        const isHov = s.id === hoveredId;
        const isDrag = s.id === dragId;
        const isNeg = cfg?.category === 'negative';
        return (
          <div
            key={s.id}
            className="absolute group"
            style={{
              left: `${s.x}%`, top: `${s.y}%`,
              transform: `translate(-50%, -50%) scale(${isDrag ? 1.3 : isHov ? 1.15 : 1})`,
              zIndex: isDrag ? 100 : isHov ? 50 : 10,
              transition: isDrag ? 'none' : 'transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease',
              cursor: editMode ? (isDrag ? 'grabbing' : 'grab') : 'pointer',
            }}
            onMouseEnter={(e) => {
              setHoveredId(s.id);
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseLeave={() => { if (dragId === null) { setHoveredId(null); setTooltipPos(null); } }}
            onMouseDown={(e) => handleMouseDown(e, s)}
            onClick={() => { if (!editMode && onStudentClick) onStudentClick(s); }}
          >
            {/* Pulse ring for negative emotions */}
            {isNeg && (
              <div className="absolute inset-[-6px] rounded-full animate-ping opacity-20" style={{ background: col }} />
            )}
            {/* Glow ring */}
            <div className="absolute inset-[-4px] rounded-full opacity-40" style={{
              background: `radial-gradient(circle, ${col}60 0%, transparent 70%)`,
              animation: isHov ? 'none' : undefined,
              transform: isHov ? 'scale(1.5)' : 'scale(1)',
              transition: 'transform 0.3s ease',
            }} />
            {/* Main dot */}
            <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center relative border border-white/20"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${col}dd, ${col}88)`,
                boxShadow: `0 0 ${isHov ? 16 : 8}px ${col}${isHov ? '80' : '40'}, inset 0 1px 2px rgba(255,255,255,0.2)`,
              }}>
              <span className="text-[11px] leading-none select-none" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}>
                {cfg?.emoji || '😐'}
              </span>
            </div>
            {/* Seat label */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[6px] text-white/15 font-medium whitespace-nowrap select-none">
              {s.seatLabel}
            </div>
            {/* Edit mode handle indicator */}
            {editMode && (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white/40 border border-white/60" />
            )}
          </div>
        );
      })}

      {/* Floating tooltip */}
      {hoveredStudent && tooltipPos && !dragId && (
        <div className="absolute z-[200] pointer-events-none"
          style={{
            left: `${Math.min(tooltipPos.x, (containerRef.current?.offsetWidth || 400) - 180)}px`,
            top: `${tooltipPos.y - 85}px`,
          }}>
          <div className="bg-black/80 backdrop-blur-xl rounded-xl border border-white/10 p-2.5 shadow-2xl min-w-[150px]"
            style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${eClr(hoveredStudent.emotion)}20` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{EMOTION_CONFIG[hoveredStudent.emotion as EmotionType]?.emoji || '😐'}</span>
              <div>
                <div className="text-[0.65rem] font-semibold text-white/90">{hoveredStudent.name}</div>
                <div className="text-[0.5rem] text-white/35">
                  {EMOTION_CONFIG[hoveredStudent.emotion as EmotionType]?.labelVi} &middot; {hoveredStudent.seatLabel}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full" style={{ background: C.blue }} />
                <span className="text-[0.5rem] text-white/40">Hiệu suất</span>
                <span className="text-[0.55rem] font-bold ml-auto" style={{ color: C.blue }}>{hoveredStudent.performance}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full" style={{ background: C.amber }} />
                <span className="text-[0.5rem] text-white/40">Năng lượng</span>
                <span className="text-[0.55rem] font-bold ml-auto" style={{ color: C.amber }}>{hoveredStudent.energy}%</span>
              </div>
            </div>
            {/* Mini performance bar */}
            <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${hoveredStudent.performance}%`, background: `linear-gradient(90deg, ${eClr(hoveredStudent.emotion)}, ${C.teal})` }} />
            </div>
          </div>
        </div>
      )}

      {/* Drag indicator */}
      {dragId && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] z-[200]">
          <span className="text-[0.55rem] text-white/50">Thả để đặt vị trí mới</span>
        </div>
      )}

      {/* Edit mode overlay text */}
      {editMode && !dragId && (
        <div className="absolute bottom-2 right-3 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/25 z-[200]">
          <span className="text-[0.5rem] text-amber-400/70">Kéo thả học sinh để sắp xếp</span>
        </div>
      )}

      {/* Legend row */}
      <div className="absolute bottom-2 left-3 flex gap-2 z-[100]">
        {[
          { c: 'rgba(56,200,120,0.6)', l: 'Tích cực' },
          { c: 'rgba(80,140,240,0.6)', l: 'Tập trung' },
          { c: 'rgba(120,120,140,0.5)', l: 'Trung tính' },
          { c: 'rgba(140,100,220,0.6)', l: 'Buồn' },
          { c: 'rgba(230,80,80,0.6)', l: 'Căng thẳng' },
        ].map(x => (
          <div key={x.l} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: x.c, boxShadow: `0 0 4px ${x.c}` }} />
            <span className="text-[0.45rem] text-white/15">{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────
function classStats(students: Student[]) {
  const dist: Record<string, number> = {};
  students.forEach(s => { dist[s.emotion] = (dist[s.emotion] || 0) + 1; });
  const total = students.length || 1;
  let pos = 0, neg = 0;
  Object.entries(dist).forEach(([k, v]) => {
    const cat = EMOTION_CONFIG[k as EmotionType]?.category;
    if (cat === 'positive') pos += v; else if (cat === 'negative') neg += v;
  });
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0]?.[0] || 'neutral';
  const avgPerf = Math.round(students.reduce((s, st) => s + st.performance, 0) / total);
  const avgEnergy = Math.round(students.reduce((s, st) => s + st.energy, 0) / total);
  return {
    dist, total, pos, neg, neutral: total - pos - neg,
    posRate: Math.round((pos / total) * 100),
    negRate: Math.round((neg / total) * 100),
    dominant, dominantCfg: EMOTION_CONFIG[dominant as EmotionType],
    sorted: sorted.slice(0, 8), avgPerf, avgEnergy,
    engagement: Math.min(100, Math.round((pos / total) * 100) + Math.round(((total - pos - neg) / total) * 50)),
    alerts: students.filter(s => ['stressed','sad','angry','crying','worried','desperate','exhausted','annoyed'].includes(s.emotion)),
  };
}

// ───────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────
export default function EmotionTrackerPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EmotionSummary | null>(null);
  const [buckets, setBuckets] = useState<EmotionBucket[]>([]);
  const [classes, setClasses] = useState<ClassData[]>(CLASSES);
  const [activeClass, setActiveClass] = useState<string>('11a2');
  const [period, setPeriod] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [isLive, setIsLive] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Handler for drag-and-drop repositioning
  const handleStudentMove = useCallback((studentId: number, x: number, y: number) => {
    setClasses(prev => prev.map(cl => ({
      ...cl,
      students: cl.students.map(s => s.id === studentId ? { ...s, x, y } : s),
    })));
  }, []);

  const cls = classes.find(c => c.id === activeClass) || classes[0];
  const stats = useMemo(() => classStats(cls.students), [cls.students]);

  // Fetch
  const fetchStats = useCallback(async () => {
    try {
      const now = new Date();
      const hrs = period === '1h' ? 1 : period === '6h' ? 6 : period === '24h' ? 24 : 168;
      const from = new Date(now.getTime() - hrs * 3600000);
      const groupBy = period === '1h' ? 'minute' : period === '6h' ? 'hour' : period === '24h' ? 'hour' : 'day';
      const res = await fetch(`/api/vision-tracker/emotion/stats?from=${from.toISOString()}&to=${now.toISOString()}&groupBy=${groupBy}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary); setBuckets(data.buckets || []);
        if (data.summary?.totalSamples > 0) {
          const dist = data.summary.emotionDistribution;
          const emoList: string[] = [];
          Object.entries(dist).forEach(([t, c]) => { for (let i = 0; i < Number(c); i++) emoList.push(t); });
          if (emoList.length > 0) {
            setClasses(prev => prev.map(cl => ({
              ...cl, students: cl.students.map((s, idx) => ({ ...s, emotion: emoList[(idx + (cl.id === '10a6' ? 5 : 0)) % emoList.length] }))
            })));
          }
        }
      }
    } catch (err) { console.error('Emotion stats error:', err); }
    finally { setLoading(false); }
  }, [period]);

  useEffect(() => {
    fetchStats();
    if (isLive) { const iv = setInterval(fetchStats, 30000); return () => clearInterval(iv); }
  }, [fetchStats, isLive]);

  const waveData = buckets.map(b => ({
    label: period === '7d'
      ? new Date(b.periodStart).toLocaleDateString('vi-VN', { weekday: 'short' })
      : new Date(b.periodStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    vals: b.distribution,
  }));

  const donutSegs = stats.sorted.map(([emo, cnt]) => ({
    label: EMOTION_CONFIG[emo as EmotionType]?.labelVi || emo,
    value: cnt, color: eClr(emo),
    emoji: EMOTION_CONFIG[emo as EmotionType]?.emoji || '😐',
  }));

  // Compare stats for both classes
  const stats11 = useMemo(() => classStats(classes[0].students), [classes]);
  const stats10 = useMemo(() => classStats(classes[1].students), [classes]);

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-white/10 border-t-[hsl(330,80%,60%)] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white/30 text-xs">Đang kết nối camera lớp học...</p>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="min-h-screen px-3 py-5 max-w-[1440px] mx-auto space-y-3">

      {/* ── HERO HEADER ── */}
      <div className={`${glass} p-4 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(330,80%,60%)]/8 via-[hsl(280,75%,60%)]/4 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(330,80%,60%)] to-[hsl(280,75%,60%)] flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white/90 tracking-tight">Bản đồ Cảm xúc Lớp học</h1>
              <p className="text-[0.65rem] text-white/35">Camera AI Tracking &middot; Giáo viên theo dõi biểu cảm thời gian thực</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Class selector tabs */}
            <div className="flex bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.06]">
              {classes.map(c => (
                <button key={c.id} onClick={() => { setActiveClass(c.id); setSelectedStudent(null); setCompareMode(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeClass === c.id && !compareMode ? 'bg-white/[0.08] text-white/90 shadow-sm' : 'text-white/30 hover:text-white/50'}`}>
                  {c.name}
                </button>
              ))}
              <button onClick={() => setCompareMode(!compareMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${compareMode ? 'bg-gradient-to-r from-[hsl(330,80%,60%)]/30 to-[hsl(245,85%,65%)]/30 text-white/90 border border-white/[0.08]' : 'text-white/25 hover:text-white/40'}`}>
                So sánh
              </button>
            </div>
            {/* Live */}
            <button onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${isLive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/[0.04] text-white/35 border border-white/[0.06]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
              {isLive ? 'LIVE' : 'Tạm dừng'}
            </button>
            {/* Period */}
            <div className="flex bg-white/[0.03] rounded-xl p-0.5 border border-white/[0.06]">
              {(['1h','6h','24h','7d'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${period === p ? 'bg-white/[0.08] text-white/90' : 'text-white/25 hover:text-white/40'}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ COMPARE MODE ═══ */}
      {compareMode ? (
        <div className="space-y-3">
          {/* Side-by-side KPI comparison */}
          <div className="grid grid-cols-2 gap-3">
            {[{ cl: classes[0], st: stats11 }, { cl: classes[1], st: stats10 }].map(({ cl, st }) => (
              <div key={cl.id} className={`${glass} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(330,80%,60%)] to-[hsl(280,75%,60%)] flex items-center justify-center">
                    <Monitor className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white/80">{cl.name}</div>
                    <div className="text-[0.55rem] text-white/30">{cl.teacher} &middot; {cl.room} &middot; {cl.camera}</div>
                  </div>
                  <span className="ml-auto text-3xl">{st.dominantCfg?.emoji || '😐'}</span>
                </div>
                {/* Mini KPI row */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: 'Tích cực', val: `${st.posRate}%`, color: C.green },
                    { label: 'Tiêu cực', val: `${st.negRate}%`, color: C.red },
                    { label: 'Tương tác', val: `${st.engagement}%`, color: C.blue },
                    { label: 'Năng lượng', val: `${st.avgEnergy}%`, color: C.amber },
                  ].map(k => (
                    <div key={k.label} className="text-center p-2 rounded-xl bg-white/[0.02]">
                      <div className="text-sm font-bold" style={{ color: k.color }}>{k.val}</div>
                      <div className="text-[0.5rem] text-white/25">{k.label}</div>
                    </div>
                  ))}
                </div>
                {/* Emotion bars */}
                <div className="space-y-1.5">
                  {st.sorted.slice(0, 5).map(([emo, cnt]) => {
                    const cfg = EMOTION_CONFIG[emo as EmotionType]; const mx = st.sorted[0]?.[1] || 1;
                    return (
                      <div key={emo} className="flex items-center gap-2">
                        <span className="text-sm">{cfg?.emoji || '😐'}</span>
                        <span className="text-[0.6rem] text-white/40 w-16 truncate">{cfg?.labelVi || emo}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(cnt / mx) * 100}%`, background: eClr(emo) }} />
                        </div>
                        <span className="text-[0.55rem] text-white/30 w-6 text-right">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Alerts */}
                {st.alerts.length > 0 && (
                  <div className="mt-3 p-2 rounded-xl bg-red-500/5 border border-red-500/10">
                    <div className="flex items-center gap-1 mb-1.5">
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                      <span className="text-[0.6rem] text-red-400/70 font-medium">{st.alerts.length} HS cần chú ý</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {st.alerts.slice(0, 6).map(s => (
                        <span key={s.id} className="px-1.5 py-0.5 rounded-md bg-white/[0.03] text-[0.55rem] text-white/40 border border-white/[0.04]">
                          {EMOTION_CONFIG[s.emotion as EmotionType]?.emoji} {s.name.split(' ').slice(-2).join(' ')}
                        </span>
                      ))}
                      {st.alerts.length > 6 && <span className="text-[0.55rem] text-white/20">+{st.alerts.length - 6}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Side-by-side heatmaps */}
          <div className="grid grid-cols-2 gap-3">
            {classes.map(cl => (
              <div key={cl.id} className={`${glass} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-3.5 w-3.5 text-white/30" />
                  <span className="text-[0.6rem] uppercase tracking-wider text-white/35 font-semibold">{cl.name} — Sơ đồ chỗ ngồi</span>
                </div>
                <Heatmap students={cl.students} height={220} onStudentClick={s => setSelectedStudent(s)} />
              </div>
            ))}
          </div>

          {/* Comparison summary */}
          <div className={`${glass} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4" style={{ color: C.purple }} />
              <span className="text-[0.65rem] uppercase tracking-wider text-white/35 font-semibold">Phân tích so sánh AI</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-xs font-medium text-white/50 mb-1">Lớp tích cực hơn</div>
                <div className="text-sm font-bold" style={{ color: stats11.posRate >= stats10.posRate ? C.teal : C.pink }}>
                  {stats11.posRate >= stats10.posRate ? classes[0].name : classes[1].name}
                </div>
                <div className="text-[0.6rem] text-white/25 mt-0.5">Chênh lệch: {Math.abs(stats11.posRate - stats10.posRate)}%</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-xs font-medium text-white/50 mb-1">Lớp cần chú ý hơn</div>
                <div className="text-sm font-bold" style={{ color: C.amber }}>
                  {stats11.negRate >= stats10.negRate ? classes[0].name : classes[1].name}
                </div>
                <div className="text-[0.6rem] text-white/25 mt-0.5">{Math.max(stats11.alerts.length, stats10.alerts.length)} HS tiêu cực</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-xs font-medium text-white/50 mb-1">Tương tác tổng</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold" style={{ color: C.blue }}>{stats11.engagement}%</span>
                  <span className="text-[0.6rem] text-white/20">vs</span>
                  <span className="text-sm font-bold" style={{ color: C.violet }}>{stats10.engagement}%</span>
                </div>
                <div className="text-[0.6rem] text-white/25 mt-0.5">{classes[0].name} vs {classes[1].name}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ═══ SINGLE CLASS VIEW ═══ */}

          {/* Class info bar */}
          <div className={`${glass} px-4 py-2.5 flex items-center gap-4 flex-wrap`}>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-white/25" />
              <span className="text-xs text-white/50 font-medium">{cls.teacher}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-white/25" />
              <span className="text-[0.65rem] text-white/35">{cls.camera}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-white/25" />
              <span className="text-[0.65rem] text-white/35">{cls.schedule}</span>
            </div>
            <div className="w-px h-4 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-white/25" />
              <span className="text-[0.65rem] text-white/35">{cls.students.length} học sinh &middot; {cls.room}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Wifi className="h-3 w-3 text-emerald-400" />
              <span className="text-[0.55rem] text-emerald-400/70">Camera đang hoạt động</span>
            </div>
          </div>

          {/* ── ROW 1: 6 KPI CARDS ── */}
          <div className="grid grid-cols-6 gap-2.5">
            {/* Dominant Emotion */}
            <div className={`${glass} ${glassH} p-3.5`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.55rem] uppercase tracking-wider text-white/25 font-semibold">Cảm xúc chính</span>
                <span className="text-xl">{stats.dominantCfg?.emoji || '😐'}</span>
              </div>
              <div className="text-base font-bold text-white/85">{stats.dominantCfg?.labelVi || 'Bình thường'}</div>
              <div className="text-[0.55rem] text-white/25 mt-0.5">Tin cậy: {summary?.avgConfidence ? Math.round(summary.avgConfidence * 100) : 78}%</div>
            </div>
            {/* Positive */}
            <div className={`${glass} ${glassH} p-3.5`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.55rem] uppercase tracking-wider text-white/25 font-semibold">Tích cực</span>
                <Smile className="h-3.5 w-3.5" style={{ color: C.green }} />
              </div>
              <div className="text-xl font-bold" style={{ color: C.green }}>{stats.posRate}%</div>
              <div className="flex items-center gap-1 mt-0.5"><ArrowUpRight className="h-2.5 w-2.5 text-emerald-400/60" /><span className="text-[0.55rem] text-emerald-400/50">{stats.pos} HS</span></div>
            </div>
            {/* Negative */}
            <div className={`${glass} ${glassH} p-3.5`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.55rem] uppercase tracking-wider text-white/25 font-semibold">Tiêu cực</span>
                <Frown className="h-3.5 w-3.5" style={{ color: C.red }} />
              </div>
              <div className="text-xl font-bold" style={{ color: C.red }}>{stats.negRate}%</div>
              <div className="flex items-center gap-1 mt-0.5">
                {stats.negRate > 25 ? <AlertTriangle className="h-2.5 w-2.5 text-amber-400/60" /> : <ArrowDownRight className="h-2.5 w-2.5 text-emerald-400/60" />}
                <span className="text-[0.55rem] text-white/25">{stats.neg} HS</span>
              </div>
            </div>
            {/* Engagement */}
            <div className={`${glass} ${glassH} p-3.5`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.55rem] uppercase tracking-wider text-white/25 font-semibold">Tương tác</span>
                <Activity className="h-3.5 w-3.5" style={{ color: C.blue }} />
              </div>
              <div className="text-xl font-bold" style={{ color: C.blue }}>{stats.engagement}%</div>
              <div className="text-[0.55rem] text-white/25 mt-0.5">Hiệu suất TB: {stats.avgPerf}%</div>
            </div>
            {/* Energy */}
            <div className={`${glass} ${glassH} p-3.5`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.55rem] uppercase tracking-wider text-white/25 font-semibold">Năng lượng</span>
                <Zap className="h-3.5 w-3.5" style={{ color: C.amber }} />
              </div>
              <div className="text-xl font-bold" style={{ color: C.amber }}>{stats.avgEnergy}%</div>
              <div className="text-[0.55rem] text-white/25 mt-0.5">Trung bình lớp</div>
            </div>
            {/* Alerts */}
            <div className={`${glass} ${glassH} p-3.5 ${stats.alerts.length > 0 ? 'border-red-500/15' : ''}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.55rem] uppercase tracking-wider text-white/25 font-semibold">Cảnh báo</span>
                <Shield className="h-3.5 w-3.5" style={{ color: stats.alerts.length > 0 ? C.red : C.green }} />
              </div>
              <div className="text-xl font-bold" style={{ color: stats.alerts.length > 0 ? C.red : C.green }}>{stats.alerts.length}</div>
              <div className="text-[0.55rem] text-white/25 mt-0.5">HS cần chú ý</div>
            </div>
          </div>

          {/* ── ROW 2: WAVE + DONUT + ALERT LIST ── */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className={`col-span-7 ${glass} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[hsl(330,80%,60%)] to-[hsl(280,75%,60%)] flex items-center justify-center"><TrendingUp className="h-3 w-3 text-white" /></div>
                  <span className="text-[0.6rem] uppercase tracking-wider text-white/35 font-semibold">Dòng cảm xúc</span>
                </div>
                <div className="flex gap-1.5">
                  {[{l:'Vui',c:C.green},{l:'Tập trung',c:C.blue},{l:'Trung tính',c:'hsl(220,15%,50%)'},{l:'Buồn',c:C.violet},{l:'Tức',c:C.red}].map(x => (
                    <div key={x.l} className="flex items-center gap-0.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: x.c }} /><span className="text-[0.5rem] text-white/20">{x.l}</span></div>
                  ))}
                </div>
              </div>
              <WaveChart data={waveData} h={150} />
            </div>

            <div className={`col-span-2 ${glass} p-3 flex flex-col items-center justify-center`}>
              <span className="text-[0.55rem] uppercase tracking-wider text-white/25 font-semibold mb-2">Phân bổ</span>
              <Donut segs={donutSegs} size={110} thick={14} centerLabel={`${stats.total}`} centerSub="học sinh" />
              <div className="mt-2 space-y-0.5 w-full">
                {donutSegs.slice(0, 3).map(s => (
                  <div key={s.label} className="flex items-center gap-1 justify-center">
                    <span className="text-xs">{s.emoji}</span>
                    <span className="text-[0.5rem] text-white/30">{s.label}: {s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`col-span-3 ${glass} p-3`}>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: C.amber }} />
                <span className="text-[0.6rem] uppercase tracking-wider text-white/35 font-semibold">Cần chú ý</span>
                {stats.alerts.length > 0 && <span className="ml-auto px-1.5 py-0.5 rounded-full text-[0.5rem] font-bold bg-red-500/20 text-red-400 border border-red-500/25">{stats.alerts.length}</span>}
              </div>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 cscroll">
                {stats.alerts.length === 0 ? (
                  <div className="text-center py-8"><Sparkles className="h-5 w-5 text-emerald-400/30 mx-auto mb-1" /><p className="text-[0.6rem] text-white/20">Tất cả HS đều ổn!</p></div>
                ) : stats.alerts.map(s => {
                  const cfg = EMOTION_CONFIG[s.emotion as EmotionType];
                  return (
                    <div key={s.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all cursor-pointer"
                      onClick={() => setSelectedStudent(s)}>
                      <span className="text-sm">{cfg?.emoji || '😐'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.65rem] text-white/60 truncate">{s.name}</div>
                        <div className="text-[0.5rem] text-white/25">{cfg?.labelVi} &middot; {s.seatLabel}</div>
                      </div>
                      <span className="text-[0.55rem] font-medium" style={{ color: eClr(s.emotion) }}>{s.performance}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── ROW 3: HEATMAP + RADIALS ── */}
          <div className="grid grid-cols-12 gap-2.5">
            <div className={`col-span-8 ${glass} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[hsl(330,80%,60%)] to-[hsl(280,75%,60%)] flex items-center justify-center"><Users className="h-3 w-3 text-white" /></div>
                  <span className="text-[0.6rem] uppercase tracking-wider text-white/35 font-semibold">Sơ đồ lớp {cls.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[0.6rem] font-medium transition-all ${isEditMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/[0.03] text-white/30 border border-white/[0.06] hover:text-white/50'}`}>
                    <Layers className="h-3 w-3" />
                    {isEditMode ? 'Đang sắp xếp' : 'Sắp xếp chỗ'}
                  </button>
                </div>
              </div>
              <Heatmap students={cls.students} height={290} editMode={isEditMode}
                onStudentMove={handleStudentMove}
                onStudentClick={s => setSelectedStudent(s)} />
            </div>

            <div className={`col-span-4 ${glass} p-4 flex flex-col`}>
              <span className="text-[0.6rem] uppercase tracking-wider text-white/35 font-semibold mb-3">Chỉ số tổng quan</span>
              <div className="flex-1 grid grid-cols-2 gap-2 place-items-center">
                <Radial value={stats.posRate} color={C.green} icon={Smile} sub="Tích cực" />
                <Radial value={stats.engagement} color={C.blue} icon={Focus} sub="Tương tác" />
                <Radial value={Math.max(0, 100 - stats.negRate)} color={C.teal} icon={Heart} sub="Sức khỏe TT" />
                <Radial value={stats.avgEnergy} color={C.amber} icon={Zap} sub="Năng lượng" />
              </div>
              {/* Mood Pulse mini */}
              <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{stats.dominantCfg?.emoji || '😐'}</span>
                  <span className="text-xs text-white/50 font-medium">Nhịp cảm xúc</span>
                </div>
                <div className="flex gap-0.5">
                  {stats.sorted.slice(0, 6).map(([emo, cnt], i) => {
                    const w = Math.max(8, (cnt / stats.total) * 100);
                    return <div key={emo} className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${w}%`, background: eClr(emo), opacity: 1 - i * 0.12 }} />;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 4: BREAKDOWN + AI INSIGHTS ── */}
          <div className="grid grid-cols-12 gap-2.5">
            {/* Breakdown */}
            <div className={`col-span-5 ${glass} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(280,75%,60%)] flex items-center justify-center"><BarChart3 className="h-3 w-3 text-white" /></div>
                <span className="text-[0.6rem] uppercase tracking-wider text-white/35 font-semibold">Chi tiết cảm xúc</span>
              </div>
              <div className="space-y-2">
                {stats.sorted.map(([emo, cnt]) => {
                  const cfg = EMOTION_CONFIG[emo as EmotionType]; const mx = stats.sorted[0]?.[1] || 1;
                  return (
                    <div key={emo} className="flex items-center gap-2">
                      <span className="text-sm w-5 text-center">{cfg?.emoji || '😐'}</span>
                      <span className="text-[0.6rem] text-white/40 w-16 truncate">{cfg?.labelVi || emo}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(cnt / mx) * 100}%`, background: eClr(emo), boxShadow: `0 0 6px ${eClr(emo)}30` }} />
                      </div>
                      <span className="text-[0.6rem] text-white/35 w-8 text-right font-medium">{cnt}</span>
                      <span className="text-[0.5rem] text-white/20 w-8 text-right">{Math.round((cnt / stats.total) * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Insights */}
            <div className={`col-span-7 ${glass} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[hsl(175,80%,50%)] to-[hsl(210,90%,60%)] flex items-center justify-center"><Brain className="h-3 w-3 text-white" /></div>
                <span className="text-[0.6rem] uppercase tracking-wider text-white/35 font-semibold">Phân tích AI — {cls.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Smile, color: C.green, title: 'Tâm trạng chung',
                    text: stats.posRate >= 60 ? `${cls.name} có tâm trạng rất tích cực (${stats.posRate}%). ${stats.dominantCfg?.labelVi || 'Bình thường'} là cảm xúc chủ đạo — giáo viên có thể tận dụng để giảng bài khó.`
                    : stats.posRate >= 40 ? `Tâm trạng ở mức trung bình (${stats.posRate}% tích cực). Nên tạo thêm hoạt động tương tác nhóm để kích thích sự hứng thú.`
                    : `Cần lưu ý: chỉ ${stats.posRate}% học sinh có cảm xúc tích cực. Đề xuất ${cls.teacher} điều chỉnh nhịp bài giảng.` },
                  { icon: Eye, color: C.blue, title: 'Mức tập trung',
                    text: stats.engagement >= 70 ? `Tương tác cao (${stats.engagement}%). Camera ghi nhận phần lớn học sinh đang tập trung — thời điểm tốt để kiểm tra nhanh.`
                    : stats.engagement >= 50 ? `Tập trung trung bình (${stats.engagement}%). Nên xen kẽ 2-3 phút hoạt động (đố vui, thảo luận nhóm) mỗi 15 phút.`
                    : `Tập trung thấp (${stats.engagement}%). Camera phát hiện nhiều HS mất tập trung — nên cho giải lao hoặc đổi hình thức.` },
                  { icon: AlertTriangle, color: C.amber, title: 'Cảnh báo',
                    text: stats.alerts.length === 0 ? 'Không có HS nào cần chú ý đặc biệt. Không khí lớp rất ổn định — tuyệt vời!'
                    : `${stats.alerts.length} HS đang có biểu cảm tiêu cực: ${stats.alerts.slice(0, 3).map(s => s.name.split(' ').slice(-2).join(' ')).join(', ')}${stats.alerts.length > 3 ? '...' : ''}. Giáo viên nên quan tâm riêng.` },
                  { icon: Sparkles, color: C.purple, title: `Gợi ý cho ${cls.teacher.split(' ').slice(-2).join(' ')}`,
                    text: stats.negRate > 30 ? 'Nên dành 5 phút cho hoạt động thư giãn (mindfulness, trò chơi ngắn) trước khi tiếp tục bài giảng.'
                    : stats.avgEnergy < 50 ? 'Năng lượng lớp đang thấp. Thử cho HS đứng dậy vận động hoặc chuyển sang thảo luận nhóm.'
                    : 'Tiếp tục duy trì nhịp hiện tại — lớp đang phản hồi tốt! Có thể thử thêm câu hỏi tương tác.' },
                ].map((card, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="w-4.5 h-4.5 rounded-md flex items-center justify-center" style={{ background: `${card.color}15`, color: card.color }}><card.icon className="h-2.5 w-2.5" /></span>
                      <span className="text-[0.65rem] font-medium text-white/50">{card.title}</span>
                    </div>
                    <p className="text-[0.6rem] text-white/35 leading-relaxed">{card.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── STUDENT DETAIL PANEL ── */}
          {selectedStudent && (
            <div className={`${glass} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${eClr(selectedStudent.emotion)}15` }}>
                    {EMOTION_CONFIG[selectedStudent.emotion as EmotionType]?.emoji || '😐'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/80">{selectedStudent.name}</div>
                    <div className="text-[0.55rem] text-white/25">{EMOTION_CONFIG[selectedStudent.emotion as EmotionType]?.labelVi} &middot; Chỗ {selectedStudent.seatLabel} &middot; {cls.name}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-white/25 hover:text-white/50 transition text-[0.65rem] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">Đóng</button>
              </div>
              <div className="grid grid-cols-5 gap-2.5">
                {[
                  { label: 'Hiệu suất', val: `${selectedStudent.performance}%`, color: eClr(selectedStudent.emotion) },
                  { label: 'Năng lượng', val: `${selectedStudent.energy}%`, color: C.amber },
                  { label: 'Vị trí', val: selectedStudent.seatLabel || '—', color: C.blue },
                  { label: 'Trạng thái', val: EMOTION_CONFIG[selectedStudent.emotion as EmotionType]?.category === 'positive' ? 'Tốt' : EMOTION_CONFIG[selectedStudent.emotion as EmotionType]?.category === 'negative' ? 'Cần chú ý' : 'Ổn', color: EMOTION_CONFIG[selectedStudent.emotion as EmotionType]?.category === 'negative' ? C.red : C.green },
                  { label: 'Camera', val: cls.camera, color: C.cyan },
                ].map(k => (
                  <div key={k.label} className="text-center p-2.5 rounded-xl bg-white/[0.02]">
                    <div className="text-sm font-bold" style={{ color: k.color }}>{k.val}</div>
                    <div className="text-[0.5rem] text-white/25 mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style jsx global>{`
        .cscroll::-webkit-scrollbar { width: 3px; }
        .cscroll::-webkit-scrollbar-track { background: transparent; }
        .cscroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
        .cscroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
      `}</style>
    </div>
  );
}
