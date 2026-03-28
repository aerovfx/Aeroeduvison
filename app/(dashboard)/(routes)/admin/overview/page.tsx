'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from '@/contexts/LanguageContext';
import { useDataSync } from "@/contexts/DataSyncContext";
import { listOpenfangAgents, getOpenfangHealth } from '@/lib/openfang-client';
import { DataSyncStatus } from "@/components/data-sync-status";
import '@/styles/neumorphic-theme.css';
import {
  TrendingUp, Users, Award, AlertTriangle, Brain,
  Activity, Heart, Zap, ArrowUp, ArrowDown,
  CheckCircle, Clock, RefreshCw, Eye, ChevronRight,
  School, LayoutDashboard, DollarSign, Settings,
  Database, Server, Globe, Lock, Shield, 
  Search, Filter, Download, Plus, Trash2, Edit,
  Video, Calendar, MousePointer2, Settings2,
  HardDrive, Cpu, Network
} from 'lucide-react';

// ============================================
// Neumorphic Design System (AI Native)
// ============================================

interface NeuCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  variant?: 'flat' | 'pressed' | 'glass';
  style?: React.CSSProperties;
}

const NeuCard: React.FC<NeuCardProps> = ({ children, className = '', hover = true, onClick, variant = 'flat', style = {} }) => {
  const isPressed = variant === 'pressed';
  const isGlass = variant === 'glass';
  
  return (
    <div
      className={`neu-card ${hover ? 'neu-bento-item' : ''} ${className}`}
      onClick={onClick}
      style={{
        background: isGlass ? 'rgba(255, 255, 255, 0.05)' : 'var(--neu-card-bg)',
        backdropFilter: isGlass ? 'blur(10px)' : 'none',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: isPressed 
          ? 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)'
          : '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light)',
        border: '1px solid var(--neu-border)',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        cursor: hover && !isPressed ? 'pointer' : 'default',
        ...style
      }}
    >
      {children}
    </div>
  );
};

const NeuBadge: React.FC<{ children: React.ReactNode; variant?: string; className?: string }> = ({ children, variant = 'default', className = '' }) => {
  const styles: any = {
    default: { background: 'var(--neu-card-bg)', color: 'var(--neu-text-primary)' },
    success: { background: 'var(--neu-accent-success)', color: '#fff' },
    warning: { background: 'var(--neu-accent-warning)', color: '#fff' },
    danger: { background: 'var(--neu-accent-danger)', color: '#fff' },
    info: { background: 'var(--neu-accent-info)', color: '#fff' },
    premium: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff' }
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${className}`} style={styles[variant] || styles.default}>
      {children}
    </span>
  );
};

// ============================================
// Types & Interfaces
// ============================================

interface AIInsight {
  id: string;
  type: 'alert' | 'opportunity' | 'warning' | 'info';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  affectedCount: number;
  action: string;
  timestamp: string;
}

interface ModuleItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: string;
  category: string;
  usage: number;
}

// ============================================
// Main Page Component
// ============================================

export default function AdminOverviewPage() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const { syncData, syncAllData, isLoading, isModuleActive, setModuleActive } = useDataSync();

  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'analytics' | 'infrastructure'>('analytics');
  const [mounted, setMounted] = useState(false);
  const [openfangStatus, setOpenfangStatus] = useState<{ ok: boolean; agents: number; error?: string }>({ ok: false, agents: 0 });

  // Mock Modules for Infrastructure Layer
  const [modules, setModules] = useState<ModuleItem[]>([
    { id: "user-management", name: "Users", description: "Identity & Access Control", icon: Users, status: "active", category: "Core", usage: 95 },
    { id: "course-management", name: "Curriculum", description: "LMS Content Strategy", icon: BookOpen, status: "active", category: "Core", usage: 82 },
    { id: "video-platform", name: "Streaming", description: "VOD & Real-time Delivery", icon: Video, status: "active", category: "Media", usage: 45 },
    { id: "quiz-system", name: "Appraisal", description: "Automated Assessment", icon: Award, status: "active", category: "Assessment", usage: 60 },
    { id: "stem-projects", name: "STEM Labs", description: "3D Virtual Environments", icon: Zap, status: "maintenance", category: "Advanced", usage: 12 },
  ]);

  useEffect(() => {
    setMounted(true);
    if (status === "unauthenticated") router.push("/sign-in");
  }, [status, router]);

  useEffect(() => {
    async function fetchOpenfang() {
      try {
        const [health, agents] = await Promise.all([
          getOpenfangHealth().catch(() => null),
          listOpenfangAgents().catch(() => []),
        ]);
        setOpenfangStatus({
          ok: !!health,
          agents: Array.isArray(agents) ? agents.length : 0,
        });
      } catch (err: any) {
        setOpenfangStatus({ ok: false, agents: 0, error: err?.message || 'Failed to reach Agent OS' });
      }
    }
    if (session?.user?.role === 'ADMIN') {
      fetchOpenfang();
    }
  }, [session]);

  // Memoize KPI calculations to avoid recalculating on every render
  const kpis = useMemo(() => [
    { label: 'Active Students', value: syncData.users?.filter((u: any) => u.role === 'STUDENT').length || 1200, trend: 'up', change: 12, icon: Users, color: '#3b82f6' },
    { label: 'Avg Mastery', value: '78%', trend: 'up', change: 5, icon: Award, color: '#10b981' },
    { label: 'System Uptime', value: '99.9%', trend: 'stable', change: 0, icon: Activity, color: '#6366f1' },
    { label: 'Module Load', value: '64%', trend: 'down', change: 2, icon: Cpu, color: '#f59e0b' },
  ], [syncData.users]);

  // Stable data for simulated charts to avoid jitter and re-layout costs
  const sentimentMapData = useMemo(() => [40, 65, 80, 50, 90, 75, 60], []);
  const networkLoadData = useMemo(() => new Array(30).fill(0).map(() => 20 + Math.random() * 80), []);

  const handleToggleModule = (id: string) => {
    const isActive = isModuleActive(id);
    setModuleActive(id, !isActive);
    setModules(prev => prev.map(m => m.id === id ? { ...m, status: isActive ? 'inactive' : 'active' } : m));
  };

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-[var(--neu-bg)] p-6 md:p-10 font-sans">
      
      {/* ── Tier 1: System Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 animate-fade-in">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-foreground))] shadow-[var(--glow-primary)] flex items-center justify-center text-white">
              <Shield className="w-8 h-8" />
           </div>
           <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic gradient-text">Command Center</h1>
              <div className="flex items-center gap-3 mt-1">
                 <NeuBadge variant="success">System Healthy</NeuBadge>
                 <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">v4.2.0-Production</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1.5 glass-panel rounded-2xl border border-white/5 shadow-inner">
            {['today', 'week', 'month'].map((r) => (
              <button 
                key={r}
                onClick={() => setTimeRange(r as any)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${timeRange === r ? 'bg-[hsl(var(--primary))] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => syncAllData()} className="p-3 rounded-2xl glass-panel border border-white/5 hover:border-[hsl(var(--primary)/0.5)] transition-all group">
            <RefreshCw className={`w-5 h-5 text-white/60 group-hover:text-[hsl(var(--primary))] ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Tier 2: Real-time Strategic KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map((kpi: any, i: number) => (
          <NeuCard key={i} hover={false} className="border-l-4" style={{ borderLeftColor: kpi.color }}>
            <div className="flex items-center justify-between mb-3">
               <div className="p-2.5 rounded-xl bg-white/5" style={{ color: kpi.color }}>
                  <kpi.icon className="w-5 h-5" />
               </div>
               <div className={`flex items-center gap-1 text-[10px] font-black ${kpi.trend === 'up' ? 'text-green-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-white/20'}`}>
                  {kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '●'} {kpi.change}%
               </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40 mb-1">{kpi.label}</p>
            <h3 className="text-2xl font-black text-white">{kpi.value}</h3>
          </NeuCard>
        ))}
        <NeuCard hover={false} className="border-l-4" style={{ borderLeftColor: openfangStatus.ok ? '#22c55e' : '#ef4444' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-white/5 text-[hsl(var(--primary))]">
              <Server className="w-5 h-5" />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-black ${openfangStatus.ok ? 'text-green-500' : 'text-red-500'}`}>
              {openfangStatus.ok ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40 mb-1">Agent OS</p>
          <h3 className="text-xl font-black text-white">
            {openfangStatus.ok ? `${openfangStatus.agents} agents` : 'Unavailable'}
          </h3>
        </NeuCard>
      </div>

      {/* ── Tier 3: Core Insights & Management ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        
        {/* Left: Actionable Intelligence (Educational) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[.3em] text-white/40 flex items-center gap-2">
                 <Brain className="w-4 h-4 text-[hsl(var(--primary))]" />
                 Actionable intelligence
              </h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NeuCard className="md:col-span-2 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--primary)/0.05)] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-[hsl(var(--primary)/0.1)] transition-all" />
                 <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <NeuBadge variant="danger">Critical Alert</NeuBadge>
                       <span className="text-[10px] text-white/30">Just Now</span>
                    </div>
                    <button className="p-2 hover:bg-white/5 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                 </div>
                 <h3 className="text-lg font-black text-white mb-2 italic">Student Retention Risk Detected</h3>
                 <p className="text-sm text-white/60 mb-6 leading-relaxed">
                   AI patterns show a 14% drop in engagement for Grade 12 Advanced Math. Recommended: Immediate curriculum review or teacher intervention.
                 </p>
                 <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex -space-x-2">
                       {[1,2,3,4].map(idx => (
                         <div key={idx} className="w-8 h-8 rounded-full border-2 border-[#121212] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">S{idx}</div>
                       ))}
                    </div>
                    <button className="px-5 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-white text-[10px] font-black uppercase tracking-widest shadow-[var(--glow-primary)] hover:scale-105 transition-transform">
                       Initiate Analysis
                    </button>
                 </div>
              </NeuCard>

              <NeuCard variant="pressed">
                 <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[.2em] mb-4">XP Velocity</h4>
                 <div className="space-y-4">
                    {[
                      { l: 'Quiz Mastery', v: 82, c: 'text-blue-500' },
                      { l: 'Attendance', v: 94, c: 'text-green-500' },
                      { l: 'STEM Engagement', v: 46, c: 'text-orange-500' },
                    ].map((item, i) => (
                      <div key={i} className="space-y-1.5">
                         <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-white/60">{item.l}</span>
                            <span className={item.c}>{item.v}%</span>
                         </div>
                         <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.c.replace('text', 'bg')}`} style={{ width: `${item.v}%` }} />
                         </div>
                      </div>
                    ))}
                 </div>
              </NeuCard>

              <NeuCard variant="pressed">
                 <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[.2em] mb-4">Sentiment Map</h4>
                 <div className="flex items-end justify-between h-24 gap-1.5">
                    {sentimentMapData.map((h: number, i: number) => (
                      <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-[hsl(var(--primary)/0.4)] to-[hsl(var(--primary))] opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} />
                    ))}
                 </div>
                 <div className="flex justify-between mt-3 text-[8px] font-black text-white/20 uppercase">
                    <span>Mon</span><span>Wed</span><span>Sun</span>
                 </div>
              </NeuCard>
           </div>
        </div>

        {/* Right: Infrastructure Control (Scientific Management) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <h2 className="text-xs font-black uppercase tracking-[.3em] text-white/40 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[hsl(var(--primary))]" />
              System Architecture
           </h2>

           <NeuCard className="flex-1 p-0 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-white/5 bg-white/2">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black text-white italic">Active Node Registry</span>
                    <span className="text-[10px] font-mono text-[hsl(var(--primary))]">8 ON / 2 OFF</span>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[480px]">
                 {modules.map((m) => (
                   <div key={m.id} className="group p-3 rounded-2xl border border-white/5 hover:border-[hsl(var(--primary)/0.3)] bg-white/2 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl ${m.status === 'active' ? 'text-[hsl(var(--primary))] bg-white/5' : 'text-white/20 bg-white/2'}`}>
                            <m.icon className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-[11px] font-black text-white/80 tracking-tight">{m.name}</p>
                            <p className="text-[9px] text-white/30 uppercase font-bold">{m.category}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-bold text-white/40">{m.usage}% LOAD</p>
                            <div className="w-12 h-0.5 bg-white/5 mt-1 rounded-full overflow-hidden">
                               <div className="h-full bg-[hsl(var(--primary))] opacity-60" style={{ width: `${m.usage}%` }} />
                            </div>
                         </div>
                         <button 
                           onClick={() => handleToggleModule(m.id)}
                           className={`w-10 h-5 rounded-full relative transition-all ${isModuleActive(m.id) ? 'bg-[hsl(var(--primary))]' : 'bg-white/10'}`}
                         >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isModuleActive(m.id) ? 'left-6' : 'left-1'}`} />
                         </button>
                      </div>
                   </div>
                 ))}
                 
                 <div className="pt-4 mt-2 border-t border-white/5">
                    <button className="w-full py-3 rounded-xl border border-dashed border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:border-[hsl(var(--primary)/0.5)] hover:text-white transition-all flex items-center justify-center gap-2">
                       <Plus className="w-3.5 h-3.5" /> Deploy New Instance
                    </button>
                 </div>
              </div>
           </NeuCard>
           
           <NeuCard variant="pressed" className="border-none bg-gradient-to-br from-[#1a1c2c] to-[#222533] group hover:scale-[1.02] transition-all cursor-pointer" onClick={() => router.push('/admin/operations')}>
              <div className="flex items-center justify-between mb-4">
                 <h4 className="text-[11px] font-black text-white italic">Self-Healing Hub</h4>
                 <Zap className="w-4 h-4 text-orange-500 fill-current group-hover:animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                 <span className="text-2xl font-black text-white">99%</span>
                 <span className="text-[10px] font-bold text-green-500">OPTIMIZED</span>
              </div>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[.2em] mb-6">Manage System Velocity</p>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                 <span className="text-[10px] font-black text-white/60">Active Patching</span>
                 <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_green]" />
              </div>
           </NeuCard>

           <NeuCard variant="pressed" className="border-none bg-[#121212]">
              <div className="flex items-center justify-between mb-4">
                 <h4 className="text-[11px] font-black text-white italic">Billing Hub</h4>
                 <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                 <span className="text-2xl font-black text-white">$14,502</span>
                 <span className="text-[10px] font-bold text-green-500">+$2.1k</span>
              </div>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[.2em] mb-6">Projected Revenue (Q1)</p>
              <div className="space-y-3">
                 <div className="flex justify-between text-[10px] font-bold px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 text-white/60">
                    <span>Premium Tiers</span>
                    <span className="text-white">652 Users</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold px-2 py-1.5 rounded-lg bg-white/5 border border-white/5 text-white/60">
                    <span>Enterprise Nodes</span>
                    <span className="text-white">12 Teams</span>
                 </div>
              </div>
           </NeuCard>
        </div>
      </div>

      {/* ── Tier 4: Operational Logs & Network Layers ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <NeuCard className="md:col-span-1">
            <h3 className="text-[11px] font-black text-white italic mb-4 flex items-center gap-2">
               <History className="w-4 h-4 text-[hsl(var(--primary))]" />
               Security Logs
            </h3>
            <div className="space-y-4">
               {[
                 { t: 'Firewall Breach Blocked', time: '2m ago', type: 'shield' },
                 { t: 'Unauthorized Node Login', time: '5m ago', type: 'alert' },
                 { t: 'API Key Rotated', time: '14m ago', type: 'key' },
               ].map((log, i) => (
                 <div key={i} className="flex gap-3 pb-3 border-b border-white/5 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 animate-pulse" />
                    <div>
                       <p className="text-[11px] font-bold text-white/80">{log.t}</p>
                       <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{log.time}</p>
                    </div>
                 </div>
               ))}
            </div>
         </NeuCard>

         <NeuCard className="md:col-span-2">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[11px] font-black text-white italic flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Global Network Load
               </h3>
               <div className="flex items-center gap-4 text-[10px] font-black uppercase text-white/30">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-blue-500" /> Latency</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-purple-500" /> Traffic</span>
               </div>
            </div>
            <div className="h-24 flex items-end gap-1 px-2">
               {networkLoadData.map((h: number, i: number) => (
                 <div key={i} className="flex-1 bg-white/5 rounded-t-sm relative transition-all hover:bg-[hsl(var(--primary)/0.6)]" style={{ height: `${h}%` }}>
                    {i === 15 && <div className="absolute top-0 -translate-y-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-blue-500 text-white text-[8px] font-bold">12ms</div>}
                 </div>
               ))}
            </div>
         </NeuCard>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--glass-bg-hover); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.8s ease forwards; }
      `}</style>
    </div>
  );
}

function BookOpen({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  );
}

function History({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
      <path d="M3 3v5h5"></path>
      <path d="M12 7v5l4 2"></path>
    </svg>
  );
}
