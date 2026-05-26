/**
 * PhysicsEngine2D — Engine vật lý 2D mini
 *
 * Route: /dashboard/labtwin/physics-engine-2d
 *
 * User: "cập nhật nội dung https://inphysic.com/dashboard/labtwin/physics-engine-2d"
 * Route chưa có content → build dedicated page.
 *
 * Features (Verlet/Euler integration):
 *   - Rigid bodies (circles + walls) với gravity + collision response
 *   - Particle system: sand, water, fire (3 presets)
 *   - User click → spawn body | drag → throw
 *   - Mouse attract / repel
 *   - FPS counter + body count
 *   - 4 preset scenes: Pyramid, Pool, Snow, Explosion
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Trash2, Sparkles, Zap, Cloud,
  Flame, Droplets, Mountain, Wind, MousePointer, Info,
} from 'lucide-react'

interface Body {
  x: number
  y: number
  prevX: number  // for Verlet
  prevY: number
  r: number
  mass: number
  pinned: boolean
  color: string
  life?: number  // for particles (remaining frames)
  type: 'ball' | 'sand' | 'water' | 'fire'
}

type ScenePreset = 'pyramid' | 'pool' | 'snow' | 'explosion' | 'empty'
type SpawnMode = 'ball' | 'sand' | 'water' | 'fire' | 'attract' | 'repel'

const CANVAS_W = 760
const CANVAS_H = 460
const GRAVITY = 600           // px/s²
const SUBSTEPS = 4             // for stability
const FLOOR_BOUNCE = 0.5
const FRICTION = 0.985

export default function PhysicsEngine2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bodiesRef = useRef<Body[]>([])
  const runningRef = useRef(true)
  const mouseRef = useRef({ x: 0, y: 0, down: false })
  const dragRef = useRef<{ start: { x: number; y: number; t: number } | null }>({ start: null })

  const [running, setRunning] = useState(true)
  const [spawnMode, setSpawnMode] = useState<SpawnMode>('ball')
  const [scene, setScene] = useState<ScenePreset>('pyramid')
  const [fps, setFps] = useState(60)
  const [bodyCount, setBodyCount] = useState(0)
  const [gravityScale, setGravityScale] = useState(1)
  const [restitution, setRestitution] = useState(0.6)

  runningRef.current = running

  // ─── Scene builders ────────────────────────────────────────────
  const buildScene = useCallback((preset: ScenePreset) => {
    const list: Body[] = []
    const make = (x: number, y: number, r = 12, mass = 1, color = '#22d3ee', type: Body['type'] = 'ball'): Body =>
      ({ x, y, prevX: x, prevY: y, r, mass, pinned: false, color, type })

    if (preset === 'pyramid') {
      const rows = 8
      const r = 14
      const startY = CANVAS_H - 60 - r
      for (let row = 0; row < rows; row++) {
        const count = rows - row
        const startX = CANVAS_W / 2 - (count - 1) * r * 1.05
        for (let i = 0; i < count; i++) {
          list.push(make(startX + i * r * 2.1, startY - row * r * 2.1, r, 1, [
            '#22d3ee', '#a78bfa', '#f97316', '#10b981', '#ec4899', '#fbbf24',
          ][row % 6]))
        }
      }
    } else if (preset === 'pool') {
      // Balls inside a pool — they should settle
      for (let i = 0; i < 60; i++) {
        const x = 80 + Math.random() * (CANVAS_W - 160)
        const y = 80 + Math.random() * 200
        list.push(make(x, y, 10 + Math.random() * 4, 1, ['#22d3ee', '#0ea5e9', '#06b6d4'][i % 3], 'water'))
      }
    } else if (preset === 'snow') {
      // Falling snowflakes
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * CANVAS_W
        const y = Math.random() * 100
        const b = make(x, y, 4 + Math.random() * 3, 0.5, '#e2e8f0', 'sand')
        b.prevY = b.y + 1  // small initial downward velocity
        list.push(b)
      }
    } else if (preset === 'explosion') {
      // Burst of particles from center
      const cx = CANVAS_W / 2
      const cy = CANVAS_H / 2
      for (let i = 0; i < 120; i++) {
        const angle = (i / 120) * Math.PI * 2
        const speed = 200 + Math.random() * 200
        const b = make(cx, cy, 6, 0.6,
          `hsl(${Math.random() * 60 + 10}, 100%, ${50 + Math.random() * 20}%)`, 'fire')
        b.prevX = b.x - Math.cos(angle) * speed * 0.016
        b.prevY = b.y - Math.sin(angle) * speed * 0.016
        b.life = 200
        list.push(b)
      }
    }
    bodiesRef.current = list
    setBodyCount(list.length)
  }, [])

  // Initial scene
  useEffect(() => { buildScene(scene) }, [scene, buildScene])

  // ─── Physics loop ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()
    let frameCount = 0
    let fpsTimer = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033)
      last = now

      if (runningRef.current) {
        const subDt = dt / SUBSTEPS
        const bodies = bodiesRef.current
        for (let step = 0; step < SUBSTEPS; step++) {
          // Verlet integration with gravity
          for (const b of bodies) {
            if (b.pinned) continue
            const vx = (b.x - b.prevX) * FRICTION
            const vy = (b.y - b.prevY) * FRICTION
            b.prevX = b.x
            b.prevY = b.y
            b.x += vx
            b.y += vy + GRAVITY * gravityScale * subDt * subDt
          }
          // Mouse attract/repel
          if (mouseRef.current.down && (spawnMode === 'attract' || spawnMode === 'repel')) {
            const mx = mouseRef.current.x
            const my = mouseRef.current.y
            const sign = spawnMode === 'attract' ? 1 : -1
            for (const b of bodies) {
              if (b.pinned) continue
              const dx = mx - b.x
              const dy = my - b.y
              const distSq = Math.max(20, dx * dx + dy * dy)
              const force = sign * 200000 / distSq
              const dist = Math.sqrt(distSq)
              b.x += (dx / dist) * force * subDt * subDt
              b.y += (dy / dist) * force * subDt * subDt
            }
          }
          // Wall collisions
          for (const b of bodies) {
            if (b.x - b.r < 0) { b.x = b.r; b.prevX = b.x + (b.x - b.prevX) * restitution }
            if (b.x + b.r > CANVAS_W) { b.x = CANVAS_W - b.r; b.prevX = b.x + (b.x - b.prevX) * restitution }
            if (b.y - b.r < 0) { b.y = b.r; b.prevY = b.y + (b.y - b.prevY) * restitution }
            if (b.y + b.r > CANVAS_H) {
              b.y = CANVAS_H - b.r
              b.prevY = b.y + (b.y - b.prevY) * FLOOR_BOUNCE * restitution
            }
          }
          // Pair collisions (O(n²) — fine for ≤200 bodies)
          for (let i = 0; i < bodies.length; i++) {
            const a = bodies[i]
            for (let j = i + 1; j < bodies.length; j++) {
              const b = bodies[j]
              const dx = b.x - a.x
              const dy = b.y - a.y
              const distSq = dx * dx + dy * dy
              const minDist = a.r + b.r
              if (distSq < minDist * minDist && distSq > 0.001) {
                const dist = Math.sqrt(distSq)
                const overlap = (minDist - dist) / 2
                const nx = dx / dist
                const ny = dy / dist
                if (!a.pinned) {
                  a.x -= nx * overlap
                  a.y -= ny * overlap
                }
                if (!b.pinned) {
                  b.x += nx * overlap
                  b.y += ny * overlap
                }
              }
            }
          }
          // Decay life for particles
          for (const b of bodies) {
            if (b.life !== undefined) b.life -= 1
          }
        }
        // Remove dead particles
        bodiesRef.current = bodies.filter((b) => b.life === undefined || b.life > 0)
        setBodyCount(bodiesRef.current.length)
      }

      // ─── Render ────────────────────────────────────────────
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, '#0a0f1f')
      grad.addColorStop(1, '#1e1b3a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      // Grid
      ctx.strokeStyle = 'rgba(148,163,184,0.05)'
      ctx.lineWidth = 1
      for (let x = 0; x < CANVAS_W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke()
      }
      for (let y = 0; y < CANVAS_H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
      }

      // Bodies
      for (const b of bodiesRef.current) {
        const lifeAlpha = b.life !== undefined ? Math.min(1, b.life / 100) : 1
        // Glow for fire
        if (b.type === 'fire') {
          ctx.shadowColor = b.color
          ctx.shadowBlur = 12
        } else {
          ctx.shadowBlur = 0
        }
        ctx.fillStyle = b.color
        ctx.globalAlpha = lifeAlpha
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
        // Highlight
        ctx.shadowBlur = 0
        ctx.globalAlpha = lifeAlpha * 0.5
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Cursor indicator for attract/repel
      if (mouseRef.current.down && (spawnMode === 'attract' || spawnMode === 'repel')) {
        ctx.strokeStyle = spawnMode === 'attract' ? '#22d3ee' : '#f97316'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 30, 0, Math.PI * 2)
        ctx.stroke()
      }

      // FPS
      frameCount++
      if (now - fpsTimer > 500) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)))
        frameCount = 0
        fpsTimer = now
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [gravityScale, restitution, spawnMode])

  // ─── Mouse handlers ───────────────────────────────────────────
  const mouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H
    mouseRef.current = { x, y, down: true }
    dragRef.current.start = { x, y, t: performance.now() }
  }
  const mouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * CANVAS_W
    mouseRef.current.y = ((e.clientY - rect.top) / rect.height) * CANVAS_H
  }
  const mouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H
    mouseRef.current.down = false

    if (spawnMode === 'attract' || spawnMode === 'repel') return

    // Spawn body with velocity from drag distance
    const start = dragRef.current.start
    if (!start) return
    const dx = x - start.x
    const dy = y - start.y

    const presets: Record<Exclude<SpawnMode, 'attract' | 'repel'>, Partial<Body>> = {
      ball: { r: 14, mass: 1, color: '#22d3ee', type: 'ball' },
      sand: { r: 5, mass: 0.5, color: '#fbbf24', type: 'sand' },
      water: { r: 8, mass: 0.7, color: '#22d3ee', type: 'water' },
      fire: { r: 7, mass: 0.4, color: `hsl(${Math.random() * 40 + 10}, 100%, 60%)`, type: 'fire', life: 200 } as Partial<Body>,
    }
    const proto = presets[spawnMode] || presets.ball

    const count = spawnMode === 'ball' ? 1 : (spawnMode === 'fire' ? 8 : 5)
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 6
      const oy = (Math.random() - 0.5) * 6
      const b: Body = {
        x: x + ox, y: y + oy,
        prevX: x + ox - dx * 0.1, prevY: y + oy - dy * 0.1,
        r: proto.r!, mass: proto.mass!,
        pinned: false, color: proto.color!, type: proto.type!,
        life: proto.life,
      }
      bodiesRef.current.push(b)
    }
    setBodyCount(bodiesRef.current.length)
    dragRef.current.start = null
  }

  const clearAll = () => {
    bodiesRef.current = []
    setBodyCount(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-400" />
                Physics Engine 2D
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Verlet integration · Collision detection · Particle system
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning(!running)}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 text-sm transition ${
                running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}>
              {running ? <><Pause className="w-4 h-4" /> Tạm dừng</> : <><Play className="w-4 h-4" /> Chạy</>}
            </button>
            <button onClick={clearAll}
              className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold flex items-center gap-1.5 text-sm">
              <Trash2 className="w-4 h-4" /> Xoá
            </button>
            <button onClick={() => buildScene(scene)}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left controls */}
          <div className="space-y-3">
            {/* Scene presets */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🎬 Scene</h3>
              <div className="grid grid-cols-2 gap-2">
                <SceneBtn icon={Mountain} label="Pyramid" active={scene === 'pyramid'} onClick={() => setScene('pyramid')} />
                <SceneBtn icon={Droplets} label="Pool" active={scene === 'pool'} onClick={() => setScene('pool')} />
                <SceneBtn icon={Cloud} label="Snow" active={scene === 'snow'} onClick={() => setScene('snow')} />
                <SceneBtn icon={Sparkles} label="Boom" active={scene === 'explosion'} onClick={() => setScene('explosion')} />
              </div>
            </div>

            {/* Spawn mode */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🖱 Click chuột</h3>
              <div className="space-y-1.5">
                <ModeBtn icon={Zap} label="Spawn ball" color="cyan" active={spawnMode === 'ball'} onClick={() => setSpawnMode('ball')} />
                <ModeBtn icon={Wind} label="Cát rơi" color="amber" active={spawnMode === 'sand'} onClick={() => setSpawnMode('sand')} />
                <ModeBtn icon={Droplets} label="Nước" color="blue" active={spawnMode === 'water'} onClick={() => setSpawnMode('water')} />
                <ModeBtn icon={Flame} label="Lửa (life=200)" color="orange" active={spawnMode === 'fire'} onClick={() => setSpawnMode('fire')} />
                <ModeBtn icon={MousePointer} label="Hút vào chuột" color="violet" active={spawnMode === 'attract'} onClick={() => setSpawnMode('attract')} />
                <ModeBtn icon={MousePointer} label="Đẩy ra khỏi chuột" color="rose" active={spawnMode === 'repel'} onClick={() => setSpawnMode('repel')} />
              </div>
              <p className="text-[10px] text-white/40 italic mt-2">
                Kéo chuột để ném theo hướng kéo
              </p>
            </div>

            {/* Sliders */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Vật lý</h3>
              <Slider label="Trọng lực" value={gravityScale} min={-1} max={2} step={0.1}
                onChange={setGravityScale} suffix="×g" />
              <Slider label="Đàn hồi" value={restitution} min={0} max={1} step={0.05}
                onChange={setRestitution} suffix="" />
            </div>
          </div>

          {/* Center canvas */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-white/50">
                  Click + Drag để spawn · {bodyCount} vật
                </span>
                <span className="font-mono text-emerald-300">
                  {fps} FPS
                </span>
              </div>
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="w-full h-auto rounded-lg border border-white/[0.06] cursor-crosshair"
                onMouseDown={mouseDown}
                onMouseMove={mouseMove}
                onMouseUp={mouseUp}
                onMouseLeave={() => { mouseRef.current.down = false }}
              />
            </div>

            {/* Theory */}
            <div className="mt-4 rounded-2xl bg-purple-500/[0.04] border border-purple-500/20 p-4">
              <h3 className="font-bold text-purple-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Engine hoạt động ra sao?
              </h3>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <h4 className="font-bold text-cyan-300 mb-1">1. Verlet Integration</h4>
                  <p className="text-white/55 leading-relaxed">
                    Vị trí mới = 2·vị trí hiện - vị trí trước + gia tốc·dt². Ổn định hơn Euler khi va chạm.
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <h4 className="font-bold text-amber-300 mb-1">2. Collision Resolution</h4>
                  <p className="text-white/55 leading-relaxed">
                    Khi 2 vòng tròn chồng lên nhau, đẩy theo trục nối tâm với khoảng overlap/2 mỗi vật.
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-3">
                  <h4 className="font-bold text-emerald-300 mb-1">3. Substep stability</h4>
                  <p className="text-white/55 leading-relaxed">
                    Mỗi frame chia {SUBSTEPS} substep nhỏ → constraint giải nhiều lần → ổn định hơn.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function SceneBtn({ icon: Icon, label, active, onClick }: {
  icon: typeof Mountain; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition ${
        active
          ? 'bg-purple-500/25 border border-purple-500/40 text-purple-200'
          : 'bg-white/[0.04] border border-white/[0.08] text-white/65 hover:bg-white/[0.08]'
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}

function ModeBtn({ icon: Icon, label, color, active, onClick }: {
  icon: typeof Zap; label: string
  color: 'cyan' | 'amber' | 'blue' | 'orange' | 'violet' | 'rose'
  active: boolean; onClick: () => void
}) {
  const map = {
    cyan:   { bg: 'bg-cyan-500/20',   border: 'border-cyan-500/40',   text: 'text-cyan-200' },
    amber:  { bg: 'bg-amber-500/20',  border: 'border-amber-500/40',  text: 'text-amber-200' },
    blue:   { bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   text: 'text-blue-200' },
    orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-200' },
    violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/40', text: 'text-violet-200' },
    rose:   { bg: 'bg-rose-500/20',   border: 'border-rose-500/40',   text: 'text-rose-200' },
  }[color]
  return (
    <button onClick={onClick}
      className={`w-full px-2 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 transition ${
        active ? `${map.bg} border ${map.border} ${map.text}` : 'bg-white/[0.03] border border-white/[0.06] text-white/60 hover:bg-white/[0.06]'
      }`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  )
}

function Slider({ label, value, min, max, step, onChange, suffix }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; suffix: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-purple-300">{value.toFixed(2)} {suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-purple-500" />
    </div>
  )
}
