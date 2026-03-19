'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Zap, Activity, Cpu, HardDrive, Network, 
  RefreshCw, Trash2, Database, Shield, 
  AlertTriangle, CheckCircle, ChevronRight,
  TrendingUp, Terminal, Play, Settings,
  Brain, Sparkles, Gauge, MousePointer2
} from 'lucide-react';

// ============================================
// AI Native Design Components
// ============================================

const NeuCard = ({ children, className = '', hover = true, variant = 'flat', style = {} }: any) => {
  const isPressed = variant === 'pressed';
  return (
    <div
      className={`neu-card ${hover ? 'neu-bento-item' : ''} ${className}`}
      style={{
        background: 'var(--neu-card-bg)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: isPressed 
          ? 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)'
          : '10px 10px 20px var(--neu-shadow-dark), -10px -10px 20px var(--neu-shadow-light)',
        border: '1px solid var(--neu-border)',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        ...style
      }}
    >
      {children}
    </div>
  );
};

const MetricGauge = ({ label, value, unit, color, icon: Icon }: any) => (
  <NeuCard variant="pressed" className="flex flex-col items-center justify-center gap-2">
    <div className="relative w-20 h-20 flex items-center justify-center">
       <svg className="w-full h-full -rotate-90">
         <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
         <circle 
           cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6" 
           strokeDasharray={213.6} 
           strokeDashoffset={213.6 - (213.6 * value) / 100}
           strokeLinecap="round"
           className="transition-all duration-1000 ease-out"
         />
       </svg>
       <div className="absolute flex flex-col items-center">
          <Icon className="w-4 h-4 text-white/40 mb-1" />
          <span className="text-sm font-black text-white">{value}{unit}</span>
       </div>
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
  </NeuCard>
);

// ============================================
// Main Page Component
// ============================================

export default function AdminOperationsPage() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'success' | 'warn'}[]>([]);
  
  // Real-time simulated stats
  const [metrics, setMetrics] = useState({ cpu: 42, ram: 6.8, latency: 12, fps: 60 });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/sign-in");
    
    // Simulate live telemetry
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(2, Math.min(16, prev.ram + (Math.random() * 0.4 - 0.2))),
        latency: Math.max(5, Math.min(150, prev.latency + (Math.random() * 20 - 10))),
        fps: Math.max(30, Math.min(60, prev.fps + (Math.random() * 4 - 2))),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [status, router]);

  const addLog = (msg: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 10));
  };

  const runAutomation = async (id: string, name: string) => {
    setOptimizing(id);
    addLog(`Initiating ${name} sequence...`, 'info');
    
    // Simulate automation steps
    await new Promise(r => setTimeout(r, 1500));
    addLog(`Analyzing system state for ${name}`, 'info');
    await new Promise(r => setTimeout(r, 1000));
    addLog(`Applying patches & garbage collection`, 'success');
    await new Promise(r => setTimeout(r, 800));
    
    setOptimizing(null);
    addLog(`${name} completed successfully. Performance improved +12%`, 'success');
  };

  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-[var(--neu-bg)] p-6 md:p-10">
      
      {/* ── Header Area ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-[0_0_20px_rgba(249,115,22,0.4)] flex items-center justify-center text-white">
              <Zap className="w-8 h-8 fill-current" />
           </div>
           <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic gradient-text">Operations Center</h1>
              <div className="flex items-center gap-3 mt-1">
                 <span className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Autonomous Mode: Active
                 </span>
              </div>
           </div>
        </div>

        <button className="px-6 py-3 rounded-2xl glass-panel border border-white/10 hover:border-orange-500/50 text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-3">
           <Shield className="w-4 h-4 text-orange-500" /> Secure Protocol v4.2
        </button>
      </div>

      {/* ── Tier 1: Real-time Telemetry Wall ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
         <MetricGauge label="CPU CORE Load" value={Math.round(metrics.cpu)} unit="%" color="#f97316" icon={Cpu} />
         <MetricGauge label="Memory (V8) RSS" value={Math.round((metrics.ram / 16) * 100)} unit="%" color="#8b5cf6" icon={HardDrive} />
         <MetricGauge label="API Latency" value={Math.round(metrics.latency)} unit="ms" color={metrics.latency < 50 ? "#22c55e" : "#eab308"} icon={Network} />
         <MetricGauge label="UI Logic FPS" value={Math.round(metrics.fps)} unit="" color="#3b82f6" icon={Activity} />
      </div>

      {/* ── Tier 2: Autonomous Optimization Control ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        
        {/* Left: Self-Healing Actions */}
        <div className="lg:col-span-8 flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[.3em] text-white/40 flex items-center gap-2">
                 <Settings className="w-4 h-4 text-orange-500" />
                 Autonomous Self-Healing
              </h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'db', name: 'Database Indexer', desc: 'Optimize query plans and rebuild indices for faster data retrieval.', icon: Database, color: 'text-blue-500' },
                { id: 'cache', name: 'Memory Purge', desc: 'Flush expired Redis keys and garbage-collected V8 memory pools.', icon: Trash2, color: 'text-orange-500' },
                { id: 'rust', name: 'Node Rejuvenation', desc: 'Soft-restart unstable Rust microservices and vision nodes.', icon: Cpu, color: 'text-green-500' },
                { id: 'iot', name: 'IoT Bandwidth', desc: 'Throttle non-critical camera feeds to preserve system backplane.', icon: Network, color: 'text-purple-500' },
              ].map((act) => (
                <NeuCard key={act.id} className="group relative overflow-hidden">
                   <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-white/5 ${act.color}`}>
                         <act.icon className="w-6 h-6" />
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border border-white/5 ${optimizing === act.id ? 'bg-orange-500/10 text-orange-500 animate-pulse' : 'text-white/20'}`}>
                         {optimizing === act.id ? 'Optimizing...' : 'IDLE'}
                      </div>
                   </div>
                   <h3 className="text-sm font-black text-white mb-2">{act.name}</h3>
                   <p className="text-[11px] text-white/40 leading-relaxed mb-6 h-12">{act.desc}</p>
                   
                   <button 
                     disabled={!!optimizing}
                     onClick={() => runAutomation(act.id, act.name)}
                     className={`w-full py-3 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest transition-all ${optimizing === act.id ? 'opacity-50' : 'hover:bg-white/5 hover:border-white/20 hover:scale-[1.02]'}`}
                   >
                     {optimizing === act.id ? <RefreshCw className="w-4 h-4 mx-auto animate-spin" /> : 'Execute Sequence'}
                   </button>
                </NeuCard>
              ))}
           </div>
        </div>

        {/* Right: AI Diagnostic Hub */}
        <div className="lg:col-span-4 flex flex-col gap-6">
           <h2 className="text-xs font-black uppercase tracking-[.3em] text-white/40 flex items-center gap-2">
              <Brain className="w-4 h-4 text-[hsl(var(--primary))]" />
              AeroBrain Diagnostics
           </h2>

           <NeuCard className="bg-gradient-to-br from-[#1a1c2c] to-[#121212] border-none shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                    <Sparkles className="w-5 h-5" />
                 </div>
                 <h4 className="text-xs font-black text-white uppercase italic tracking-widest">Live System Analysis</h4>
              </div>

              <div className="space-y-6">
                 <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 relative">
                    <AlertTriangle className="absolute top-4 right-4 w-4 h-4 text-red-500/40" />
                    <p className="text-[10px] font-black text-red-400 uppercase mb-1">Bottleneck Detected</p>
                    <p className="text-xs text-white/70 font-medium">LocalStorage write latency is high. Recommendation: Flush system sync buffer.</p>
                 </div>

                 <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                    <p className="text-[10px] font-black text-orange-400 uppercase mb-1">Performance Tip</p>
                    <p className="text-xs text-white/70 font-medium">CPU spikes detected in Media-Service. Consider auto-scaling Rust nodes.</p>
                 </div>

                 <div className="mt-8 pt-6 border-t border-white/5">
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-[hsl(var(--primary))] transition-all">
                       <span className="text-[10px] font-black text-white uppercase tracking-widest group-hover:italic">Auto-Fix Everything</span>
                       <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white" />
                    </button>
                 </div>
              </div>
           </NeuCard>

           {/* Live Terminal Overlay */}
           <NeuCard variant="pressed" className="flex-1 bg-black/40 border-white/5 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                 <div className="flex items-center gap-2">
                    <Terminal className="w-3 h-3 text-green-500" />
                    <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Sys_Log.init_0</span>
                 </div>
                 <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                 </div>
              </div>
              <div className="space-y-2 font-mono text-[9px]">
                 {logs.length === 0 ? (
                   <p className="text-white/10 uppercase italic">Awaiting technical events...</p>
                 ) : (
                   logs.map((log, i) => (
                     <p key={i} className={`flex gap-2 ${log.type === 'success' ? 'text-green-500' : log.type === 'warn' ? 'text-orange-500' : 'text-white/40'}`}>
                        <span className="opacity-20">[{new Date().toLocaleTimeString()}]</span>
                        <span className="flex-1">{log.msg}</span>
                     </p>
                   ))
                 )}
              </div>
           </NeuCard>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(400%); }
        }
        .animate-scan { animation: scan 3s linear infinite; }
        .gradient-text {
          background: linear-gradient(135deg, white 0%, rgba(255,255,255,0.4) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}
