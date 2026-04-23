import { useState, type ComponentType } from 'react';
import {
  Zap,
  Timer,
  Sigma,
  Activity,
  Cpu,
  Waves,
  Radio,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import DiodeExplorer from './semiconductor/DiodeExplorer';
import Timer555Lab from './semiconductor/Timer555Lab';
import OpAmpLab from './semiconductor/OpAmpLab';
import BJTCurves from './semiconductor/BJTCurves';
import CommonEmitter from './semiconductor/CommonEmitter';
import FunctionGenerator from './semiconductor/FunctionGenerator';
import FilterLab from './semiconductor/FilterLab';
import OscillatorZoo from './semiconductor/OscillatorZoo';
import MOSFETLab from './semiconductor/MOSFETLab';

type ModuleEntry = {
  id: string;
  name: string;
  desc: string;
  phase: 1 | 2 | 3;
  icon: LucideIcon;
  color: string; // tailwind text color class for the accent
  ring: string; // ring color for active state
  Component: ComponentType;
};

// (All phases implemented — placeholder removed)

const MODULES: ModuleEntry[] = [
  // Phase 1 — done
  {
    id: 'diode',
    name: 'Diode Explorer',
    desc: 'Đặc tuyến I-V, Zener, LED',
    phase: 1,
    icon: Zap,
    color: 'text-cyan-300',
    ring: 'ring-cyan-400/60',
    Component: DiodeExplorer,
  },
  {
    id: 'timer555',
    name: 'Timer 555',
    desc: 'Astable & Monostable NE555',
    phase: 1,
    icon: Timer,
    color: 'text-amber-300',
    ring: 'ring-amber-400/60',
    Component: Timer555Lab,
  },
  {
    id: 'opamp',
    name: 'Op-Amp Lab',
    desc: '7 topo: inv / non-inv / schmitt…',
    phase: 1,
    icon: Sigma,
    color: 'text-emerald-300',
    ring: 'ring-emerald-400/60',
    Component: OpAmpLab,
  },
  // Phase 2 — placeholders
  {
    id: 'bjt',
    name: 'BJT Curves',
    desc: 'Họ đặc tuyến Ic-Vce + Load line',
    phase: 2,
    icon: Activity,
    color: 'text-rose-300',
    ring: 'ring-rose-400/60',
    Component: BJTCurves,
  },
  {
    id: 'ce',
    name: 'CE Amplifier',
    desc: 'Mạch khuếch đại phát chung',
    phase: 2,
    icon: Cpu,
    color: 'text-fuchsia-300',
    ring: 'ring-fuchsia-400/60',
    Component: CommonEmitter,
  },
  {
    id: 'funcgen',
    name: 'Function Gen',
    desc: 'Sine / Square / Triangle / PWM',
    phase: 2,
    icon: Waves,
    color: 'text-sky-300',
    ring: 'ring-sky-400/60',
    Component: FunctionGenerator,
  },
  // Phase 3 — placeholders
  {
    id: 'filter',
    name: 'Filter Lab',
    desc: 'LPF / HPF / BPF + Bode plot',
    phase: 3,
    icon: Gauge,
    color: 'text-violet-300',
    ring: 'ring-violet-400/60',
    Component: FilterLab,
  },
  {
    id: 'osc',
    name: 'Oscillator Zoo',
    desc: 'Wien / LC / RC phase shift',
    phase: 3,
    icon: Radio,
    color: 'text-orange-300',
    ring: 'ring-orange-400/60',
    Component: OscillatorZoo,
  },
  {
    id: 'mosfet',
    name: 'MOSFET Lab',
    desc: 'NMOS Id-Vds · 3 vùng hoạt động',
    phase: 3,
    icon: Zap,
    color: 'text-teal-300',
    ring: 'ring-teal-400/60',
    Component: MOSFETLab,
  },
];

const PHASE_TITLES: Record<1 | 2 | 3, string> = {
  1: 'Phase 1 · Khối cơ bản',
  2: 'Phase 2 · Khuếch đại & nguồn tín hiệu',
  3: 'Phase 3 · Lọc & dao động',
};

export default function SemiconductorLab() {
  const [activeId, setActiveId] = useState<string>('diode');
  const active = MODULES.find((m) => m.id === activeId) ?? MODULES[0];
  const ActiveComponent = active.Component;

  const byPhase = (p: 1 | 2 | 3) => MODULES.filter((m) => m.phase === p);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Semiconductor Modules
          </div>
          <div className="text-[11px] text-slate-500">
            {MODULES.length} module sẵn sàng · Phase 1 + 2 + 3 hoàn tất
          </div>
        </div>

        {[1, 2, 3].map((p) => {
          const phase = p as 1 | 2 | 3;
          return (
            <div key={phase}>
              <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {PHASE_TITLES[phase]}
              </div>
              <div className="space-y-2">
                {byPhase(phase).map((m) => {
                  const Icon = m.icon;
                  const isActive = m.id === activeId;
                  const isReady = true; // All 3 phases implemented
                  return (
                    <button
                      key={m.id}
                      onClick={() => setActiveId(m.id)}
                      className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        isActive
                          ? `border-transparent bg-slate-800 ring-1 ${m.ring}`
                          : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                      }`}
                    >
                      <div
                        className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
                          isActive ? 'bg-slate-900' : 'bg-slate-800/60'
                        }`}
                      >
                        <Icon size={16} className={m.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`truncate text-sm font-semibold ${
                              isActive ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {m.name}
                          </span>
                          {!isReady && (
                            <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              Soon
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </aside>

      {/* Main panel */}
      <section className="min-w-0">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-900/80 to-slate-800/40 px-4 py-3">
          <div className={`rounded-xl bg-slate-900 p-2 ring-1 ${active.ring}`}>
            <active.icon size={20} className={active.color} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-bold ${active.color}`}>{active.name}</div>
            <div className="truncate text-[11px] text-slate-400">
              {active.desc} · {PHASE_TITLES[active.phase]}
            </div>
          </div>
        </div>

        {/* Remount on switch so RAF / scope state resets cleanly */}
        <div key={active.id}>
          <ActiveComponent />
        </div>
      </section>
    </div>
  );
}
