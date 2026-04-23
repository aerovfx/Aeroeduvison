import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Activity, Cpu, HardDrive, Network,
  RefreshCw, Trash2, Database, Shield,
  AlertTriangle, CheckCircle, ChevronRight,
  Terminal, Settings, Brain, Sparkles,
  Download, Upload, Clock, FolderArchive,
  FileUp, FilePlus, CheckCircle2, XCircle,
  RotateCcw, Save, Package,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */
interface LogEntry { msg: string; type: 'info' | 'success' | 'warn' | 'error'; ts: Date }
interface BackupRecord {
  id: string; name: string; size: string; date: string;
  status: 'completed' | 'running' | 'failed'; type: 'full' | 'incremental' | 'config';
}
interface ImportJob {
  id: string; filename: string; rows: number; source: string;
  status: 'completed' | 'running' | 'queued' | 'failed'; progress: number;
  startedAt: string;
}

/* ─── Mock backup history ────────────────────────────────── */
const BACKUP_RECORDS: BackupRecord[] = [
  { id: 'b1', name: 'Full backup 12/04/2026', size: '4.2 GB', date: '12/04 02:00', status: 'completed', type: 'full' },
  { id: 'b2', name: 'Incremental 11/04/2026', size: '320 MB', date: '11/04 02:00', status: 'completed', type: 'incremental' },
  { id: 'b3', name: 'Config snapshot',        size: '12 MB',  date: '10/04 14:30', status: 'completed', type: 'config' },
  { id: 'b4', name: 'Incremental 10/04/2026', size: '418 MB', date: '10/04 02:00', status: 'completed', type: 'incremental' },
  { id: 'b5', name: 'Incremental 09/04/2026', size: '276 MB', date: '09/04 02:00', status: 'failed',    type: 'incremental' },
];

const IMPORT_JOBS: ImportJob[] = [
  { id: 'i1', filename: 'students_Q1_2026.csv',    rows: 1248, source: 'SMAS',      status: 'completed', progress: 100, startedAt: '11/04 10:22' },
  { id: 'i2', filename: 'teachers_roster_v3.xlsx', rows: 87,   source: 'Manual',    status: 'completed', progress: 100, startedAt: '10/04 09:10' },
  { id: 'i3', filename: 'iot_devices_batch.json',  rows: 34,   source: 'IoT Hub',   status: 'running',   progress: 67,  startedAt: '12/04 08:55' },
  { id: 'i4', filename: 'curriculum_2026.json',    rows: 512,  source: 'Ministry',  status: 'queued',    progress: 0,   startedAt: '—' },
  { id: 'i5', filename: 'old_grades_2024.csv',     rows: 3100, source: 'Legacy DB', status: 'failed',    progress: 23,  startedAt: '09/04 16:45' },
];

/* ─── Palette helpers ────────────────────────────────────── */
function backupTypeStyle(type: BackupRecord['type']) {
  if (type === 'full')        return { bg: 'bg-purple-500/10', text: 'text-purple-300', label: 'Full' };
  if (type === 'incremental') return { bg: 'bg-indigo-500/10', text: 'text-indigo-300', label: 'Incr.' };
  return                             { bg: 'bg-slate-500/10',  text: 'text-slate-400',  label: 'Config' };
}

function statusDot(status: BackupRecord['status'] | ImportJob['status']) {
  if (status === 'completed') return 'bg-green-400 shadow-[0_0_6px_#4ade80]';
  if (status === 'running')   return 'bg-yellow-400 animate-pulse';
  if (status === 'queued')    return 'bg-blue-400';
  return                             'bg-red-400';
}

function statusText(status: BackupRecord['status'] | ImportJob['status']) {
  if (status === 'completed') return 'text-green-400';
  if (status === 'running')   return 'text-yellow-400';
  if (status === 'queued')    return 'text-blue-400';
  return                             'text-red-400';
}

/* ─── DarkCard ───────────────────────────────────────────── */
function DarkCard({ children, className = '', glowColor = '' }: {
  children: React.ReactNode; className?: string; glowColor?: string;
}) {
  return (
    <div
      className={`bg-[hsl(260,30%,8%)] border border-white/[0.06] rounded-2xl p-6 transition-all hover:border-white/[0.12] ${className}`}
      style={glowColor ? { boxShadow: `0 0 30px ${glowColor}15` } : {}}
    >
      {children}
    </div>
  );
}

/* ─── Metric Gauge ───────────────────────────────────────── */
function MetricGauge({ label, value, unit, color, icon: Icon }: {
  label: string; value: number; unit: string; color: string; icon: React.ElementType;
}) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(value, 100)) / 100;

  return (
    <DarkCard className="flex flex-col items-center justify-center gap-3 p-5">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <Icon className="w-3.5 h-3.5 text-white/40 mb-0.5" />
          <span className="text-sm font-black text-white/90 leading-none">
            {value}{unit}
          </span>
        </div>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</span>
    </DarkCard>
  );
}

/* ─── Section heading ────────────────────────────────────── */
function SectionHead({ icon: Icon, label, color = 'text-white/40' }: {
  icon: React.ElementType; label: string; color?: string;
}) {
  return (
    <h2 className={`text-[10px] font-black uppercase tracking-[.3em] ${color} flex items-center gap-2`}>
      <Icon className="w-4 h-4" /> {label}
    </h2>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AdminOperations() {
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState({ cpu: 42, ram: 68, latency: 12, fps: 60 });
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [importJobs, setImportJobs] = useState<ImportJob[]>(IMPORT_JOBS);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Live telemetry
  useEffect(() => {
    const iv = setInterval(() => {
      setMetrics(p => ({
        cpu:     Math.round(Math.max(10, Math.min(95, p.cpu     + Math.random() * 10 - 5))),
        ram:     Math.round(Math.max(20, Math.min(95, p.ram     + Math.random() * 6  - 3))),
        latency: Math.round(Math.max(5,  Math.min(150, p.latency + Math.random() * 20 - 10))),
        fps:     Math.round(Math.max(30, Math.min(60, p.fps     + Math.random() * 4  - 2))),
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // Simulate import progress
  useEffect(() => {
    const iv = setInterval(() => {
      setImportJobs(prev => prev.map(j =>
        j.status === 'running' && j.progress < 100
          ? { ...j, progress: Math.min(100, j.progress + Math.random() * 8) }
          : j
      ));
    }, 800);
    return () => clearInterval(iv);
  }, []);

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    setLogs(p => [{ msg, type, ts: new Date() }, ...p].slice(0, 12));
  };

  const runAutomation = async (id: string, name: string) => {
    if (optimizing) return;
    setOptimizing(id);
    addLog(`Khởi chạy ${name}...`, 'info');
    await sleep(1500);
    addLog(`Phân tích trạng thái hệ thống cho ${name}`, 'info');
    await sleep(1000);
    addLog(`Áp dụng patches & garbage collection`, 'success');
    await sleep(800);
    setOptimizing(null);
    addLog(`${name} hoàn tất. Hiệu suất tăng +12%`, 'success');
  };

  const runBackup = async () => {
    if (backupRunning) return;
    setBackupRunning(true);
    setBackupProgress(0);
    addLog('Bắt đầu sao lưu toàn bộ (Full Backup)...', 'info');
    for (let p = 0; p <= 100; p += Math.round(Math.random() * 12 + 5)) {
      await sleep(300);
      setBackupProgress(Math.min(p, 100));
    }
    setBackupProgress(100);
    addLog('Full backup hoàn tất · 4.2 GB · Lưu tại /backups/2026-04-12', 'success');
    await sleep(1000);
    setBackupRunning(false);
    setBackupProgress(0);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) enqueueImport(file.name);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) enqueueImport(file.name);
    e.target.value = '';
  };

  const enqueueImport = (filename: string) => {
    const job: ImportJob = {
      id: `i${Date.now()}`, filename, rows: 0, source: 'Manual Upload',
      status: 'running', progress: 0, startedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setImportJobs(p => [job, ...p]);
    addLog(`Import job queued: ${filename}`, 'info');
  };

  return (
    <>
      <style>{`
        @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(400%); } }
        .animate-scan { animation: scan 3s linear infinite; }
      `}</style>

      <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-10 relative">
        {/* Ambient */}
        <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-orange-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="fixed -top-24 -right-24  w-96 h-96 bg-purple-600/[0.04] rounded-full blur-[100px] -z-10 pointer-events-none" />

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)', boxShadow: '0 0 24px rgba(249,115,22,0.35)' }}>
              <Zap className="w-7 h-7 fill-current" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic"
                style={{ background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.4) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Operations Center
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_#4ade80]" />
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Autonomous Mode: Active</span>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:border-orange-500/40 text-[10px] font-black uppercase tracking-widest text-white transition-all">
            <Shield className="w-4 h-4 text-orange-400" /> Secure Protocol v4.2
          </button>
        </div>

        {/* ── Tier 1: Telemetry gauges ─────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <MetricGauge label="CPU Core Load"   value={metrics.cpu}     unit="%" color="#f97316" icon={Cpu} />
          <MetricGauge label="Memory RSS"      value={metrics.ram}     unit="%" color="#8b5cf6" icon={HardDrive} />
          <MetricGauge label="API Latency"     value={metrics.latency} unit="ms"
            color={metrics.latency < 50 ? '#22c55e' : '#eab308'} icon={Network} />
          <MetricGauge label="UI Logic FPS"    value={metrics.fps}     unit=""  color="#3b82f6" icon={Activity} />
        </div>

        {/* ── Tier 2: Self-healing + Diagnostics ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">

          {/* Self-Healing Actions */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            <SectionHead icon={Settings} label="Autonomous Self-Healing" color="text-orange-400/70" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { id: 'db',    name: 'Database Indexer',   desc: 'Tối ưu query plans và rebuild indices để truy vấn nhanh hơn.',          icon: Database, color: 'text-blue-400',   glow: '#3b82f6' },
                { id: 'cache', name: 'Memory Purge',       desc: 'Xoá Redis keys hết hạn và thu hồi bộ nhớ V8 không sử dụng.',           icon: Trash2,   color: 'text-orange-400', glow: '#f97316' },
                { id: 'rust',  name: 'Node Rejuvenation',  desc: 'Soft-restart các Rust microservices và vision nodes không ổn định.',    icon: Cpu,      color: 'text-green-400',  glow: '#22c55e' },
                { id: 'iot',   name: 'IoT Bandwidth',      desc: 'Giới hạn luồng camera phụ để bảo vệ băng thông hệ thống chính.',       icon: Network,  color: 'text-purple-400', glow: '#a855f7' },
              ].map(act => (
                <DarkCard key={act.id} glowColor={optimizing === act.id ? act.glow : ''}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-xl bg-white/[0.04] ${act.color}`}>
                      <act.icon className="w-5 h-5" />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border border-white/[0.05]
                      ${optimizing === act.id ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse' : 'text-white/20'}`}>
                      {optimizing === act.id ? 'Optimizing...' : 'IDLE'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white/90 mb-2">{act.name}</h3>
                  <p className="text-[11px] text-white/40 leading-relaxed mb-5 h-10">{act.desc}</p>
                  <button
                    disabled={!!optimizing}
                    onClick={() => runAutomation(act.id, act.name)}
                    className={`w-full py-2.5 rounded-xl border border-white/[0.06] text-[10px] font-black uppercase tracking-widest transition-all
                      ${optimizing === act.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.05] hover:border-white/[0.15] hover:scale-[1.01]'}
                      ${optimizing && optimizing !== act.id ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {optimizing === act.id
                      ? <RefreshCw className="w-4 h-4 mx-auto animate-spin" />
                      : 'Execute Sequence'}
                  </button>
                </DarkCard>
              ))}
            </div>
          </div>

          {/* AeroBrain Diagnostics + Terminal */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <SectionHead icon={Brain} label="AeroBrain Diagnostics" color="text-purple-400/70" />

            <DarkCard glowColor="#a855f7">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-[10px] font-black text-white/70 uppercase italic tracking-widest">Live System Analysis</h4>
              </div>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-[9px] font-black text-red-400 uppercase">Bottleneck Detected</p>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">LocalStorage write latency cao. Đề xuất: flush system sync buffer.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    <p className="text-[9px] font-black text-orange-400 uppercase">Performance Tip</p>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">CPU spikes ở Media-Service. Cân nhắc auto-scale Rust nodes.</p>
                </div>
                <button className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] group hover:border-purple-500/40 transition-all mt-2">
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest group-hover:text-white group-hover:italic">Auto-Fix Everything</span>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                </button>
              </div>
            </DarkCard>

            {/* Live Terminal */}
            <DarkCard className="bg-black/60 border-white/[0.04] flex flex-col min-h-[160px]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-widest font-mono">Sys_Log.init_0</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
              </div>
              <div className="space-y-1.5 font-mono text-[9px] flex-1">
                {logs.length === 0
                  ? <p className="text-white/15 uppercase italic">Awaiting technical events...</p>
                  : logs.map((log, i) => (
                    <p key={i} className={`flex gap-2 ${log.type === 'success' ? 'text-green-400' : log.type === 'warn' ? 'text-orange-400' : log.type === 'error' ? 'text-red-400' : 'text-white/35'}`}>
                      <span className="opacity-30 flex-shrink-0">[{log.ts.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                      <span>{log.msg}</span>
                    </p>
                  ))
                }
              </div>
            </DarkCard>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* ── Tier 3: Data Backup ─────────────────────────── */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <SectionHead icon={FolderArchive} label="Sao lưu dữ liệu" color="text-indigo-400/70" />
            <div className="flex items-center gap-2">
              <button
                onClick={runBackup}
                disabled={backupRunning}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-white transition-all
                  ${backupRunning ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}`}
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
              >
                {backupRunning
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang sao lưu...</>
                  : <><Save className="w-3.5 h-3.5" /> Sao lưu ngay</>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Backup stats */}
            <div className="flex flex-col gap-4">
              {[
                { label: 'Tổng kích thước', value: '38.4 GB', icon: HardDrive, color: '#6366f1' },
                { label: 'Bản sao lưu thành công',  value: `${BACKUP_RECORDS.filter(b=>b.status==='completed').length} / ${BACKUP_RECORDS.length}`, icon: CheckCircle2, color: '#22c55e' },
                { label: 'Sao lưu tiếp theo', value: '13/04 · 02:00', icon: Clock, color: '#f59e0b' },
              ].map(s => (
                <DarkCard key={s.label} className="flex items-center gap-4 p-4">
                  <div className="p-2.5 rounded-xl text-white flex-shrink-0"
                    style={{ background: s.color, boxShadow: `0 0 12px ${s.color}40` }}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{s.label}</p>
                    <p className="text-base font-black text-white/90">{s.value}</p>
                  </div>
                </DarkCard>
              ))}
            </div>

            {/* Backup progress (when running) + history */}
            <div className="lg:col-span-2 flex flex-col gap-4">

              {/* Running progress bar */}
              {backupRunning && (
                <DarkCard className="border-indigo-500/30 bg-indigo-500/[0.04]" glowColor="#6366f1">
                  <div className="flex items-center gap-3 mb-3">
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Full Backup đang chạy</span>
                    <span className="ml-auto text-[11px] font-black text-indigo-300">{backupProgress}%</span>
                  </div>
                  <div className="w-full bg-white/[0.05] rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${backupProgress}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
                  </div>
                  <p className="text-[9px] text-white/30 mt-2 font-mono">Đang nén và mã hoá dữ liệu…</p>
                </DarkCard>
              )}

              {/* History table */}
              <DarkCard className="flex-1 p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2">
                  <Package className="w-4 h-4 text-white/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Lịch sử sao lưu</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {BACKUP_RECORDS.map(b => {
                    const ts = backupTypeStyle(b.type);
                    return (
                      <div key={b.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(b.status)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white/80 truncate">{b.name}</p>
                          <p className="text-[9px] text-white/35 font-mono">{b.date} · {b.size}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ts.bg} ${ts.text}`}>{ts.label}</span>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-white/40 hover:text-white transition-all"
                            title="Khôi phục">
                            <RotateCcw className="w-3 h-3" />
                          </button>
                          <button className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-white/40 hover:text-white transition-all"
                            title="Tải xuống">
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DarkCard>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* ── Tier 4: Data Import ─────────────────────────── */}
        {/* ══════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <SectionHead icon={Upload} label="Import dữ liệu" color="text-cyan-400/70" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all min-h-[200px]
                ${dragOver
                  ? 'border-cyan-400/60 bg-cyan-500/[0.06]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-cyan-400/30 hover:bg-white/[0.04]'}`}
            >
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput}
                accept=".csv,.xlsx,.json,.xml" />
              <div className={`p-4 rounded-2xl transition-all ${dragOver ? 'bg-cyan-500/20' : 'bg-white/[0.05]'}`}>
                <FileUp className={`w-8 h-8 ${dragOver ? 'text-cyan-300' : 'text-white/30'}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/70">Kéo thả hoặc click để chọn file</p>
                <p className="text-[10px] text-white/35 mt-1">Hỗ trợ: CSV · XLSX · JSON · XML</p>
              </div>
              <div className="flex gap-2">
                {['CSV', 'XLSX', 'JSON', 'XML'].map(f => (
                  <span key={f} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/40 font-bold">{f}</span>
                ))}
              </div>
            </div>

            {/* Import job list */}
            <div className="lg:col-span-2">
              <DarkCard className="p-0 overflow-hidden h-full">
                <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-2">
                  <FilePlus className="w-4 h-4 text-white/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Danh sách import jobs</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {importJobs.map(job => (
                    <div key={job.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(job.status)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white/85 truncate">{job.filename}</p>
                          <div className="flex items-center gap-3 text-[9px] text-white/35 font-mono mt-0.5">
                            <span>{job.source}</span>
                            {job.rows > 0 && <span>{job.rows.toLocaleString()} dòng</span>}
                            {job.startedAt !== '—' && <span>Bắt đầu {job.startedAt}</span>}
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase ${statusText(job.status)}`}>
                          {job.status === 'completed' ? '✓ Xong'
                            : job.status === 'running' ? `${Math.round(job.progress)}%`
                            : job.status === 'queued' ? '⏳ Chờ'
                            : '✕ Lỗi'}
                        </span>
                      </div>
                      {/* Progress bar */}
                      {(job.status === 'running' || (job.status === 'failed' && job.progress > 0)) && (
                        <div className="w-full bg-white/[0.05] rounded-full h-1">
                          <div className="h-1 rounded-full transition-all duration-500"
                            style={{
                              width: `${job.progress}%`,
                              background: job.status === 'failed' ? '#ef4444' : 'linear-gradient(90deg,#06b6d4,#6366f1)',
                            }} />
                        </div>
                      )}
                      {job.status === 'completed' && (
                        <div className="w-full bg-white/[0.05] rounded-full h-1">
                          <div className="h-1 rounded-full bg-green-500/60 w-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </DarkCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── util ───────────────────────────────────────────────── */
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }
