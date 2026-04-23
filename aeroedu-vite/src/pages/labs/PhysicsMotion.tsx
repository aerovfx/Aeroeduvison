import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Settings, Zap, Play, Pause, RotateCcw,
  ChevronLeft, Calculator, TrendingUp
} from 'lucide-react';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface MotionState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

interface SimulationData {
  trajectory: MotionState[];
  results: {
    time_to_ground?: number;
    velocity_at_ground?: number;
    max_height?: number;
    range?: number;
    time_of_flight?: number;
  };
}

// ─── Config ──────────────────────────────────────────────────────────────────

const config = {
  name: 'physics-motion',
  title: 'Chuyển động vật lý cơ bản',
  description: 'Khám phá các loại chuyển động cơ học: rơi tự do, ném xiên, dao động điều hòa, và nhiều hơn nữa.',
  level: 'Dễ',
  duration: '20 phút',
  xp: 120,
  category: 'Cơ học',
};

// ─── Physics Calculation Functions ───────────────────────────────────────────

function calculateFreeFall(h0: number, v0: number, g: number): SimulationData {
  const trajectory: MotionState[] = [];
  const time_to_ground = (v0 + Math.sqrt(v0 * v0 + 2 * g * h0)) / g;

  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * time_to_ground;
    const y = h0 + v0 * t - 0.5 * g * t * t;
    const vy = v0 - g * t;
    trajectory.push({ t, x: 0, y: Math.max(0, y), vx: 0, vy, ax: 0, ay: -g });
  }

  const velocity_at_ground = Math.sqrt(v0 * v0 + 2 * g * h0);
  return {
    trajectory,
    results: { time_to_ground, velocity_at_ground, max_height: h0 + (v0 * v0) / (2 * g) },
  };
}

function calculateProjectile(v0: number, angle: number, h0: number, g: number): SimulationData {
  const rad = (angle * Math.PI) / 180;
  const vx0 = v0 * Math.cos(rad);
  const vy0 = v0 * Math.sin(rad);
  const time_of_flight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;
  const trajectory: MotionState[] = [];

  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * time_of_flight;
    const x = vx0 * t;
    const y = h0 + vy0 * t - 0.5 * g * t * t;
    const vy = vy0 - g * t;
    trajectory.push({ t, x, y: Math.max(0, y), vx: vx0, vy, ax: 0, ay: -g });
  }

  const range = vx0 * time_of_flight;
  const max_height = h0 + (vy0 * vy0) / (2 * g);
  return { trajectory, results: { range, max_height, time_of_flight } };
}

function calculateHarmonic(A: number, omega: number, phi: number): SimulationData {
  const duration = (2 * Math.PI) / omega * 3;
  const trajectory: MotionState[] = [];

  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * duration;
    const x = A * Math.cos(omega * t + phi);
    const y = 0;
    const vx = -A * omega * Math.sin(omega * t + phi);
    const ax = -omega * omega * x;
    trajectory.push({ t, x, y, vx, vy: 0, ax, ay: 0 });
  }

  return { trajectory, results: {} };
}

function calculateUniform(v: number, x0: number, duration: number): SimulationData {
  const trajectory: MotionState[] = [];

  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * duration;
    const x = x0 + v * t;
    trajectory.push({ t, x, y: 0, vx: v, vy: 0, ax: 0, ay: 0 });
  }

  return { trajectory, results: {} };
}

function calculateAccelerated(v0: number, a: number, x0: number, duration: number): SimulationData {
  const trajectory: MotionState[] = [];

  for (let i = 0; i <= 100; i++) {
    const t = (i / 100) * duration;
    const x = x0 + v0 * t + 0.5 * a * t * t;
    const vx = v0 + a * t;
    trajectory.push({ t, x, y: 0, vx, vy: 0, ax: a, ay: 0 });
  }

  return { trajectory, results: {} };
}

function calculateCircular(r: number, omega: number, duration: number): SimulationData {
  const trajectory: MotionState[] = [];

  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * duration;
    const theta = omega * t;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const vx = -r * omega * Math.sin(theta);
    const vy = r * omega * Math.cos(theta);
    const ax = -omega * omega * x;
    const ay = -omega * omega * y;
    trajectory.push({ t, x, y, vx, vy, ax, ay });
  }

  return { trajectory, results: {} };
}

function calculatePendulum(L: number, theta0: number, duration: number): SimulationData {
  const g = 9.8;
  const omega = Math.sqrt(g / L);
  const trajectory: MotionState[] = [];
  const thetaRad = (theta0 * Math.PI) / 180;

  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * duration;
    const theta = thetaRad * Math.cos(omega * t);
    const x = L * Math.sin(theta);
    const y = -L * Math.cos(theta);
    const vx = -L * omega * thetaRad * Math.sin(omega * t) * Math.cos(theta);
    const vy = L * omega * thetaRad * Math.sin(omega * t) * Math.sin(theta);
    trajectory.push({ t, x, y, vx, vy, ax: 0, ay: 0 });
  }

  return { trajectory, results: {} };
}

// ─── GraphCanvas Sub-Component ───────────────────────────────────────────────

function GraphCanvas({
  data,
  currentTime,
  graphType,
}: {
  data: MotionState[];
  currentTime: number;
  graphType: 'position' | 'velocity' | 'acceleration';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#1a1f35');
    bgGradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const padding = 50;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    let yDataX: number[] = [];
    let yDataY: number[] = [];
    let yLabelX = '';
    let yLabelY = '';

    if (graphType === 'position') {
      yDataX = data.map(p => p.x);
      yDataY = data.map(p => p.y);
      yLabelX = 'X (m)';
      yLabelY = 'Y (m)';
    } else if (graphType === 'velocity') {
      yDataX = data.map(p => p.vx);
      yDataY = data.map(p => p.vy);
      yLabelX = 'Vx (m/s)';
      yLabelY = 'Vy (m/s)';
    } else {
      yDataX = data.map(p => p.ax);
      yDataY = data.map(p => p.ay);
      yLabelX = 'Ax (m/s²)';
      yLabelY = 'Ay (m/s²)';
    }

    const tData = data.map(p => p.t);
    const minT = Math.min(...tData);
    const maxT = Math.max(...tData);
    const minYX = Math.min(...yDataX);
    const maxYX = Math.max(...yDataX);
    const minYY = Math.min(...yDataY);
    const maxYY = Math.max(...yDataY);

    const rangeT = maxT - minT || 1;
    const rangeYX = maxYX - minYX || 1;
    const rangeYY = maxYY - minYY || 1;

    const scaleX = graphWidth / rangeT;
    const scaleYX = graphHeight / (rangeYX * 1.2);
    const scaleYY = graphHeight / (rangeYY * 1.2);

    const toScreenX = (t: number) => padding + (t - minT) * scaleX;
    const toScreenYX = (y: number) => height - padding - ((y - minYX) + rangeYX * 0.1) * scaleYX;
    const toScreenYY = (y: number) => height - padding - ((y - minYY) + rangeYY * 0.1) * scaleYY;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * graphWidth;
      ctx.beginPath(); ctx.moveTo(x, padding); ctx.lineTo(x, height - padding); ctx.stroke();
      const y = padding + (i / 10) * graphHeight;
      ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding); ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, padding); ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // X component line (blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.t);
      const y = toScreenYX(yDataX[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Y component line (red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.t);
      const y = toScreenYY(yDataY[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Current time indicator (green dashed)
    const currentX = toScreenX(currentTime);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(currentX, padding); ctx.lineTo(currentX, height - padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current points
    const currentIdx = data.findIndex(p => p.t >= currentTime);
    if (currentIdx >= 0) {
      const point = data[currentIdx];
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(toScreenX(point.t), toScreenYX(yDataX[currentIdx]), 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(toScreenX(point.t), toScreenYY(yDataY[currentIdx]), 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Thời gian (s)', width / 2 - 40, height - 10);

    // Legend
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(width - 150, 20, 20, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px Arial';
    ctx.fillText(yLabelX, width - 125, 25);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - 150, 35, 20, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(yLabelY, width - 125, 40);

    // Time axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Arial';
    for (let i = 0; i <= 5; i++) {
      const t = minT + (i / 5) * rangeT;
      const x = toScreenX(t);
      ctx.fillText(t.toFixed(1), x - 10, height - padding + 20);
    }

    // Y axis labels
    ctx.fillStyle = '#3b82f6';
    for (let i = 0; i <= 5; i++) {
      const y = minYX + (i / 5) * rangeYX;
      const screenY = toScreenYX(y);
      ctx.fillText(y.toFixed(1), 5, screenY + 3);
    }
  }, [data, currentTime, graphType]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={280}
      className="w-full rounded-lg border border-white/[0.08]"
    />
  );
}

// ─── Slider helper ───────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  color = 'purple',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const colorMap: Record<string, string> = {
    purple: '#a855f7',
    green: '#22c55e',
    blue: '#3b82f6',
    orange: '#f97316',
    sky: '#0ea5e9',
    pink: '#ec4899',
  };
  const c = colorMap[color] ?? '#a855f7';

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">{label}</span>
        <span className="text-lg font-bold" style={{ color: c }}>
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${c} 0%, ${c} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
          accentColor: c,
        }}
      />
      <div className="flex justify-between text-xs text-white/30">
        <span>{min}</span>
        <span>{((min + max) / 2).toFixed(1)}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = 'free-fall' | 'projectile' | 'harmonic' | 'uniform' | 'accelerated' | 'circular' | 'pendulum';
type GraphType = 'position' | 'velocity' | 'acceleration';

const TABS: { id: TabId; label: string }[] = [
  { id: 'free-fall', label: 'Rơi tự do' },
  { id: 'projectile', label: 'Ném xiên' },
  { id: 'harmonic', label: 'Dao động' },
  { id: 'uniform', label: 'Đều' },
  { id: 'accelerated', label: 'Nhanh dần' },
  { id: 'circular', label: 'Tròn' },
  { id: 'pendulum', label: 'Con lắc' },
];

export default function PhysicsMotion() {
  // ── Simulation state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('free-fall');
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [graphType, setGraphType] = useState<GraphType>('position');

  // ── Visualization toggles ───────────────────────────────────────────────
  const [showGrid, setShowGrid] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showAccelerationVector, setShowAccelerationVector] = useState(false);

  // ── Lab completion ──────────────────────────────────────────────────────
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Param state ─────────────────────────────────────────────────────────
  const [freeFallParams, setFreeFallParams] = useState({ h0: 50, v0: 0, g: 9.8 });
  const [projectileParams, setProjectileParams] = useState({ v0: 20, angle: 45, h0: 0, g: 9.8 });
  const [harmonicParams, setHarmonicParams] = useState({ A: 1.0, omega: 2.0, phi: 0 });
  const [uniformParams, setUniformParams] = useState({ v: 5, x0: 0, duration: 10 });
  const [acceleratedParams, setAcceleratedParams] = useState({ v0: 0, a: 2, x0: 0, duration: 10 });
  const [circularParams, setCircularParams] = useState({ r: 5, omega: 1, duration: 10 });
  const [pendulumParams, setPendulumParams] = useState({ L: 1.0, theta0: 30, duration: 10 });

  // ── Refs ─────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // ── completeLab ───────────────────────────────────────────────────────────
  const completeLab = useCallback(async () => {
    if (!hasInteracted || isCompleted) return;
    setIsCompleting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsCompleted(true);
    setIsCompleting(false);
    showToast(`🎉 Hoàn thành thí nghiệm! +${config.xp} XP`);
  }, [hasInteracted, isCompleted]);

  // ── runSimulation ─────────────────────────────────────────────────────────
  const runSimulation = () => {
    setLoading(true);
    setHasInteracted(true);
    let data: SimulationData;

    if (activeTab === 'free-fall') {
      data = calculateFreeFall(freeFallParams.h0, freeFallParams.v0, freeFallParams.g);
    } else if (activeTab === 'projectile') {
      data = calculateProjectile(projectileParams.v0, projectileParams.angle, projectileParams.h0, projectileParams.g);
    } else if (activeTab === 'harmonic') {
      data = calculateHarmonic(harmonicParams.A, harmonicParams.omega, harmonicParams.phi);
    } else if (activeTab === 'uniform') {
      data = calculateUniform(uniformParams.v, uniformParams.x0, uniformParams.duration);
    } else if (activeTab === 'accelerated') {
      data = calculateAccelerated(acceleratedParams.v0, acceleratedParams.a, acceleratedParams.x0, acceleratedParams.duration);
    } else if (activeTab === 'circular') {
      data = calculateCircular(circularParams.r, circularParams.omega, circularParams.duration);
    } else {
      data = calculatePendulum(pendulumParams.L, pendulumParams.theta0, pendulumParams.duration);
    }

    setSimulationData(data);
    setCurrentTime(0);
    setLoading(false);
  };

  // ── Animation controls ────────────────────────────────────────────────────
  const startAnimation = () => {
    if (!simulationData) return;
    setIsAnimating(true);
    setCurrentTime(0);
    startTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = ((timestamp - startTimeRef.current) / 1000) * animationSpeed;
      const maxTime = simulationData.trajectory[simulationData.trajectory.length - 1].t;

      if (elapsed >= maxTime) {
        setCurrentTime(maxTime);
        setIsAnimating(false);
        return;
      }
      setCurrentTime(elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    setIsAnimating(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const resetSimulation = () => {
    setIsAnimating(false);
    setCurrentTime(0);
    setSimulationData(null);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  // ── Canvas drawing ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Gradient background (keep light for visualization clarity)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const padding = 60;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    // Find bounds
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    simulationData.trajectory.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    minX -= rangeX * 0.15; maxX += rangeX * 0.15;
    minY -= rangeY * 0.15; maxY += rangeY * 0.15;

    const scaleX = graphWidth / (maxX - minX);
    const scaleY = graphHeight / (maxY - minY);

    const toScreenX = (x: number) => padding + (x - minX) * scaleX;
    const toScreenY = (y: number) => height - padding - (y - minY) * scaleY;

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      const gridSpacingX = Math.pow(10, Math.floor(Math.log10(rangeX / 10)));
      const gridSpacingY = Math.pow(10, Math.floor(Math.log10(rangeY / 10)));

      for (let x = Math.ceil(minX / gridSpacingX) * gridSpacingX; x <= maxX; x += gridSpacingX) {
        ctx.beginPath(); ctx.moveTo(toScreenX(x), padding); ctx.lineTo(toScreenX(x), height - padding); ctx.stroke();
      }
      for (let y = Math.ceil(minY / gridSpacingY) * gridSpacingY; y <= maxY; y += gridSpacingY) {
        ctx.beginPath(); ctx.moveTo(padding, toScreenY(y)); ctx.lineTo(width - padding, toScreenY(y)); ctx.stroke();
      }
    }

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding); ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding); ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Axis arrows
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(width - padding, height - padding);
    ctx.lineTo(width - padding - 10, height - padding - 5);
    ctx.lineTo(width - padding - 10, height - padding + 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding - 5, padding + 10);
    ctx.lineTo(padding + 5, padding + 10);
    ctx.fill();

    // Trajectory gradient
    const traj0 = simulationData.trajectory[0];
    const trajLast = simulationData.trajectory[simulationData.trajectory.length - 1];
    const trajectoryGradient = ctx.createLinearGradient(
      toScreenX(traj0.x), toScreenY(traj0.y),
      toScreenX(trajLast.x), toScreenY(trajLast.y)
    );
    trajectoryGradient.addColorStop(0, '#3b82f6');
    trajectoryGradient.addColorStop(1, '#8b5cf6');

    ctx.strokeStyle = trajectoryGradient;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(59,130,246,0.3)';
    ctx.shadowBlur = 5;
    ctx.beginPath();

    simulationData.trajectory.forEach((point, index) => {
      const x = toScreenX(point.x);
      const y = toScreenY(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      if (showTrail && index % 5 === 0 && point.t <= currentTime) {
        ctx.save();
        ctx.fillStyle = 'rgba(59,130,246,0.3)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current position
    const currentIdx = simulationData.trajectory.findIndex(p => p.t >= currentTime);
    const currentPoint =
      currentIdx >= 0
        ? simulationData.trajectory[currentIdx]
        : simulationData.trajectory[simulationData.trajectory.length - 1];

    if (currentPoint) {
      const x = toScreenX(currentPoint.x);
      const y = toScreenY(currentPoint.y);

      ctx.shadowColor = 'rgba(239,68,68,0.5)';
      ctx.shadowBlur = 15;
      const objGrad = ctx.createRadialGradient(x, y, 0, x, y, 12);
      objGrad.addColorStop(0, '#fca5a5');
      objGrad.addColorStop(1, '#ef4444');
      ctx.fillStyle = objGrad;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Velocity vector
      if (showVelocityVector && (currentPoint.vx !== 0 || currentPoint.vy !== 0)) {
        const scale = 0.5;
        const vxS = currentPoint.vx * scaleX * scale;
        const vyS = -currentPoint.vy * scaleY * scale;
        ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + vxS, y + vyS); ctx.stroke();
        const ang = Math.atan2(vyS, vxS);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(x + vxS, y + vyS);
        ctx.lineTo(x + vxS - 10 * Math.cos(ang - Math.PI / 6), y + vyS - 10 * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(x + vxS - 10 * Math.cos(ang + Math.PI / 6), y + vyS - 10 * Math.sin(ang + Math.PI / 6));
        ctx.fill();
        ctx.font = 'bold 11px Arial';
        ctx.fillText('v', x + vxS + 15, y + vyS);
      }

      // Acceleration vector
      if (showAccelerationVector && (currentPoint.ax !== 0 || currentPoint.ay !== 0)) {
        const axS = currentPoint.ax * scaleX;
        const ayS = -currentPoint.ay * scaleY;
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + axS, y + ayS); ctx.stroke();
        const ang = Math.atan2(ayS, axS);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x + axS, y + ayS);
        ctx.lineTo(x + axS - 10 * Math.cos(ang - Math.PI / 6), y + ayS - 10 * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(x + axS - 10 * Math.cos(ang + Math.PI / 6), y + ayS - 10 * Math.sin(ang + Math.PI / 6));
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('a', x + axS + 15, y + ayS);
      }

      // Info box
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
      const infoX = Math.min(x + 20, width - 165);
      const infoY = Math.max(y - 60, padding + 5);
      ctx.fillRect(infoX, infoY, 145, 50);
      ctx.strokeRect(infoX, infoY, 145, 50);
      ctx.fillStyle = '#1e293b'; ctx.font = '11px Arial';
      ctx.fillText(`t = ${currentPoint.t.toFixed(2)} s`, infoX + 6, infoY + 16);
      ctx.fillText(`x = ${currentPoint.x.toFixed(2)} m`, infoX + 6, infoY + 30);
      ctx.fillText(`y = ${currentPoint.y.toFixed(2)} m`, infoX + 6, infoY + 44);
    }

    // Axis labels
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 14px Arial';
    ctx.fillText('X (m)', width - 60, height - 25);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y (m)', 0, 0);
    ctx.restore();
  }, [simulationData, currentTime, showGrid, showTrail, showVelocityVector, showAccelerationVector]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // ── Results from simulationData ───────────────────────────────────────────
  const results = simulationData?.results ?? {};

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all">
          {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Back link */}
        <Link
          to="/dashboard/labtwin/labs"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách labs
        </Link>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">{config.title}</h1>
          </div>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">{config.description}</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[config.category, config.level, config.duration, `+${config.xp} XP`].map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-white/70 border border-white/[0.08]">
                {tag}
              </span>
            ))}
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Local Mode
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Controls panel ── */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-white/90 font-semibold">
              <Settings className="h-5 w-5 text-purple-400" />
              <span>Điều khiển thí nghiệm</span>
            </div>
            <p className="text-sm text-white/40">Chọn loại chuyển động và điều chỉnh tham số</p>

            {/* Tab selector */}
            <div className="flex flex-wrap gap-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSimulationData(null); setCurrentTime(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab params */}
            <div className="space-y-3">
              {activeTab === 'free-fall' && (
                <>
                  <Slider label="Độ cao ban đầu" value={freeFallParams.h0} min={0} max={200} step={1} unit="m"
                    onChange={v => setFreeFallParams(p => ({ ...p, h0: v }))} color="purple" />
                  <Slider label="Vận tốc ban đầu" value={freeFallParams.v0} min={-20} max={20} step={0.5} unit="m/s"
                    onChange={v => setFreeFallParams(p => ({ ...p, v0: v }))} color="green" />
                  <Slider label="Gia tốc trọng trường" value={freeFallParams.g} min={1} max={20} step={0.1} unit="m/s²"
                    onChange={v => setFreeFallParams(p => ({ ...p, g: v }))} color="blue" />
                </>
              )}

              {activeTab === 'projectile' && (
                <>
                  <Slider label="Vận tốc ban đầu" value={projectileParams.v0} min={0} max={100} step={1} unit="m/s"
                    onChange={v => setProjectileParams(p => ({ ...p, v0: v }))} color="purple" />
                  <Slider label="Góc ném" value={projectileParams.angle} min={0} max={90} step={1} unit="°"
                    onChange={v => setProjectileParams(p => ({ ...p, angle: v }))} color="orange" />
                  <Slider label="Độ cao ban đầu" value={projectileParams.h0} min={0} max={100} step={1} unit="m"
                    onChange={v => setProjectileParams(p => ({ ...p, h0: v }))} color="green" />
                  <Slider label="Gia tốc trọng trường" value={projectileParams.g} min={1} max={20} step={0.1} unit="m/s²"
                    onChange={v => setProjectileParams(p => ({ ...p, g: v }))} color="blue" />
                </>
              )}

              {activeTab === 'harmonic' && (
                <>
                  <Slider label="Biên độ (A)" value={harmonicParams.A} min={0.1} max={5} step={0.1} unit="m"
                    onChange={v => setHarmonicParams(p => ({ ...p, A: v }))} color="purple" />
                  <Slider label="Tần số góc (ω)" value={harmonicParams.omega} min={0.5} max={10} step={0.1} unit="rad/s"
                    onChange={v => setHarmonicParams(p => ({ ...p, omega: v }))} color="pink" />
                  <Slider label="Pha ban đầu (φ)" value={harmonicParams.phi} min={0} max={6.28} step={0.1} unit="rad"
                    onChange={v => setHarmonicParams(p => ({ ...p, phi: v }))} color="orange" />
                </>
              )}

              {activeTab === 'uniform' && (
                <>
                  <Slider label="Vận tốc (v)" value={uniformParams.v} min={-20} max={20} step={0.5} unit="m/s"
                    onChange={v => setUniformParams(p => ({ ...p, v }))} color="green" />
                  <Slider label="Vị trí ban đầu (x₀)" value={uniformParams.x0} min={-50} max={50} step={1} unit="m"
                    onChange={v => setUniformParams(p => ({ ...p, x0: v }))} color="blue" />
                  <Slider label="Thời gian" value={uniformParams.duration} min={1} max={30} step={1} unit="s"
                    onChange={v => setUniformParams(p => ({ ...p, duration: v }))} color="purple" />
                </>
              )}

              {activeTab === 'accelerated' && (
                <>
                  <Slider label="Vận tốc ban đầu (v₀)" value={acceleratedParams.v0} min={-20} max={20} step={0.5} unit="m/s"
                    onChange={v => setAcceleratedParams(p => ({ ...p, v0: v }))} color="green" />
                  <Slider label="Gia tốc (a)" value={acceleratedParams.a} min={-10} max={10} step={0.1} unit="m/s²"
                    onChange={v => setAcceleratedParams(p => ({ ...p, a: v }))} color="orange" />
                  <Slider label="Vị trí ban đầu (x₀)" value={acceleratedParams.x0} min={-50} max={50} step={1} unit="m"
                    onChange={v => setAcceleratedParams(p => ({ ...p, x0: v }))} color="blue" />
                  <Slider label="Thời gian" value={acceleratedParams.duration} min={1} max={30} step={1} unit="s"
                    onChange={v => setAcceleratedParams(p => ({ ...p, duration: v }))} color="purple" />
                </>
              )}

              {activeTab === 'circular' && (
                <>
                  <Slider label="Bán kính (r)" value={circularParams.r} min={0.5} max={20} step={0.5} unit="m"
                    onChange={v => setCircularParams(p => ({ ...p, r: v }))} color="sky" />
                  <Slider label="Tốc độ góc (ω)" value={circularParams.omega} min={0.1} max={5} step={0.1} unit="rad/s"
                    onChange={v => setCircularParams(p => ({ ...p, omega: v }))} color="purple" />
                  <Slider label="Thời gian" value={circularParams.duration} min={1} max={30} step={1} unit="s"
                    onChange={v => setCircularParams(p => ({ ...p, duration: v }))} color="blue" />
                </>
              )}

              {activeTab === 'pendulum' && (
                <>
                  <Slider label="Chiều dài dây (L)" value={pendulumParams.L} min={0.1} max={5} step={0.1} unit="m"
                    onChange={v => setPendulumParams(p => ({ ...p, L: v }))} color="purple" />
                  <Slider label="Góc ban đầu (θ₀)" value={pendulumParams.theta0} min={1} max={45} step={1} unit="°"
                    onChange={v => setPendulumParams(p => ({ ...p, theta0: v }))} color="orange" />
                  <Slider label="Thời gian" value={pendulumParams.duration} min={1} max={30} step={1} unit="s"
                    onChange={v => setPendulumParams(p => ({ ...p, duration: v }))} color="green" />
                </>
              )}
            </div>

            {/* Run button */}
            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {loading ? 'Đang tính toán...' : 'Tính toán & Vẽ quỹ đạo'}
            </button>
          </div>

          {/* ── Canvas panel ── */}
          <div className="bg-[hsl(230,25%,10%)] border border-white/[0.06] rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/60">Quỹ đạo chuyển động</span>
              {simulationData && (
                <span className="text-xs text-white/40">
                  t = {currentTime.toFixed(2)} s
                </span>
              )}
            </div>

            <canvas
              ref={canvasRef}
              width={600}
              height={420}
              className="w-full rounded-xl border border-white/[0.06]"
            />

            {/* Animation controls */}
            {simulationData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isAnimating ? pauseAnimation : startAnimation}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isAnimating
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isAnimating ? 'Tạm dừng' : 'Chạy'}
                  </button>
                  <button
                    onClick={resetSimulation}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.08] transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>

                {/* Speed slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-20">Tốc độ: {animationSpeed}x</span>
                  <input
                    type="range"
                    min={0.25}
                    max={3}
                    step={0.25}
                    value={animationSpeed}
                    onChange={e => setAnimationSpeed(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500"
                    style={{
                      background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((animationSpeed - 0.25) / 2.75) * 100}%, rgba(255,255,255,0.1) ${((animationSpeed - 0.25) / 2.75) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />
                </div>
              </div>
            )}

            {!simulationData && (
              <div className="flex items-center justify-center h-16 text-white/20 text-sm">
                Nhấn "Tính toán" để xem quỹ đạo
              </div>
            )}
          </div>
        </div>

        {/* ── Results + Visualization + Graphs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Results */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-white/90">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Kết quả
            </div>
            {simulationData ? (
              <div className="space-y-2">
                {results.time_to_ground !== undefined && (
                  <div className="flex justify-between text-sm py-2 border-b border-white/[0.05]">
                    <span className="text-white/50">Thời gian rơi</span>
                    <span className="font-mono text-white/80">{results.time_to_ground.toFixed(3)} s</span>
                  </div>
                )}
                {results.velocity_at_ground !== undefined && (
                  <div className="flex justify-between text-sm py-2 border-b border-white/[0.05]">
                    <span className="text-white/50">Vận tốc chạm đất</span>
                    <span className="font-mono text-white/80">{results.velocity_at_ground.toFixed(2)} m/s</span>
                  </div>
                )}
                {results.max_height !== undefined && (
                  <div className="flex justify-between text-sm py-2 border-b border-white/[0.05]">
                    <span className="text-white/50">Độ cao cực đại</span>
                    <span className="font-mono text-white/80">{results.max_height.toFixed(2)} m</span>
                  </div>
                )}
                {results.range !== undefined && (
                  <div className="flex justify-between text-sm py-2 border-b border-white/[0.05]">
                    <span className="text-white/50">Tầm xa</span>
                    <span className="font-mono text-white/80">{results.range.toFixed(2)} m</span>
                  </div>
                )}
                {results.time_of_flight !== undefined && (
                  <div className="flex justify-between text-sm py-2 border-b border-white/[0.05]">
                    <span className="text-white/50">Thời gian bay</span>
                    <span className="font-mono text-white/80">{results.time_of_flight.toFixed(3)} s</span>
                  </div>
                )}
                {Object.keys(results).length === 0 && (
                  <p className="text-sm text-white/30">Xem đồ thị bên dưới</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/30">Chưa có dữ liệu</p>
            )}
          </div>

          {/* Visualization toggles */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-semibold text-white/90">
              <Settings className="h-4 w-4 text-emerald-400" />
              Hiển thị
            </div>
            <div className="space-y-3">
              {([
                { label: 'Lưới tọa độ', state: showGrid, set: setShowGrid },
                { label: 'Vệt chuyển động', state: showTrail, set: setShowTrail },
                { label: 'Vector vận tốc', state: showVelocityVector, set: setShowVelocityVector },
                { label: 'Vector gia tốc', state: showAccelerationVector, set: setShowAccelerationVector },
              ] as const).map(item => (
                <label key={item.label} className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{item.label}</span>
                  <button
                    onClick={() => item.set(!item.state)}
                    className={`relative w-10 h-5 rounded-full transition-all ${
                      item.state ? 'bg-emerald-500' : 'bg-white/10'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        item.state ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Complete lab */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-white/90">
                <Zap className="h-4 w-4 text-yellow-400" />
                Hoàn thành thí nghiệm
              </div>
              <p className="text-sm text-white/40">
                {isCompleted
                  ? '🎉 Bạn đã hoàn thành thí nghiệm này!'
                  : hasInteracted
                  ? 'Nhấn để nhận XP!'
                  : 'Hãy chạy ít nhất một mô phỏng trước.'}
              </p>
            </div>
            <button
              onClick={completeLab}
              disabled={!hasInteracted || isCompleted || isCompleting}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : hasInteracted
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                  : 'bg-white/[0.04] text-white/20 border border-white/[0.06] cursor-not-allowed'
              }`}
            >
              {isCompleting ? 'Đang xử lý...' : isCompleted ? '✓ Đã hoàn thành' : `Hoàn thành (+${config.xp} XP)`}
            </button>
          </div>
        </div>

        {/* ── Time-domain graphs ── */}
        {simulationData && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white/90">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Đồ thị theo thời gian
              </div>
              <div className="flex gap-1">
                {(['position', 'velocity', 'acceleration'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => setGraphType(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      graphType === g
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    {g === 'position' ? 'Vị trí' : g === 'velocity' ? 'Vận tốc' : 'Gia tốc'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-500" /> Thành phần X</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-red-500" /> Thành phần Y</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-emerald-500 opacity-60 border-t border-dashed border-emerald-500" /> Thời điểm hiện tại</span>
            </div>
            <GraphCanvas
              data={simulationData.trajectory}
              currentTime={currentTime}
              graphType={graphType}
            />
          </div>
        )}

        {/* ── Info card ── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-semibold text-white/90">Thông tin thí nghiệm</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="text-3xl mb-2">⏱️</div>
              <h4 className="text-sm font-semibold text-blue-300">Thời gian</h4>
              <p className="text-xs text-blue-400/70 mt-1">{config.duration}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="text-3xl mb-2">⭐</div>
              <h4 className="text-sm font-semibold text-yellow-300">Phần thưởng XP</h4>
              <p className="text-xs text-yellow-400/70 mt-1">+{config.xp} XP</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="text-3xl mb-2">🔬</div>
              <h4 className="text-sm font-semibold text-purple-300">Danh mục</h4>
              <p className="text-xs text-purple-400/70 mt-1">{config.category}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="text-sm font-semibold text-emerald-300">Độ khó</h4>
              <p className="text-xs text-emerald-400/70 mt-1">{config.level}</p>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
              <Zap className="h-4 w-4 text-yellow-400" />
              Hướng dẫn sử dụng
            </div>
            <ul className="text-sm text-white/50 space-y-1.5 list-disc list-inside">
              <li>Chọn loại chuyển động từ các tab trên cùng</li>
              <li>Điều chỉnh các thông số bằng thanh trượt</li>
              <li>Nhấn &quot;Tính toán&quot; để xem quỹ đạo</li>
              <li>Sử dụng các nút &quot;Chạy&quot;, &quot;Tạm dừng&quot;, Reset để điều khiển animation</li>
              <li>Bật/tắt lưới, vệt, và vector để xem chi tiết hơn</li>
              <li>Xem đồ thị thời gian thực ở phần bên dưới</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
