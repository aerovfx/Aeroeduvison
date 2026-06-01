/**
 * CircularMotion3D — Chuyển động tròn đều trong không gian 3D + hình
 * chiếu lên các mặt phẳng tọa độ.
 *
 * Route: /dashboard/labtwin/circular-motion-3d
 *
 * User: "thêm một giả lập chuyển động tròn đều trong không gian 3 chiều
 *  và hình chiếu lên các mặt phẳng" + tham khảo GIF complex exponential
 *  e^(iωt) helix.
 *
 * Visualization (R3F):
 *   - Particle quay trên vòng tròn trong mặt phẳng XY (chuyển động tròn đều)
 *   - Optional: thêm drift dọc trục Z → spiral / helix (như reference GIF)
 *   - 3 mặt phẳng (XY/XZ/YZ) hiển thị shadow projection
 *   - Trail 3D + shadow trên mỗi plane
 *   - Vector v (tiếp tuyến) + a (hướng tâm)
 */
import { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { XRCanvas } from '../../components/ar/XRCanvas'
import { OrbitControls, Grid, Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Info, Activity, Eye, EyeOff,
} from 'lucide-react'

// ─── Particle + Trail component ──────────────────────────────────

interface SimParams {
  radius: number       // m
  omega: number        // rad/s
  driftZ: number       // m/s along Z (0 = pure circle, ≠0 = helix)
  showXY: boolean
  showXZ: boolean
  showYZ: boolean
  showVectors: boolean
  showTrail: boolean
  paused: boolean
}

function ParticleAndTrail({ params }: { params: SimParams }) {
  const particleRef = useRef<THREE.Mesh>(null!)
  const trailPointsRef = useRef<THREE.Vector3[]>([])
  const trailLineRef = useRef<THREE.Line>(null!)
  const shadowXYRef = useRef<THREE.Line>(null!)
  const shadowXZRef = useRef<THREE.Line>(null!)
  const shadowYZRef = useRef<THREE.Line>(null!)
  const tRef = useRef(0)

  // Vector lines
  const velocityRef = useRef<THREE.Group>(null!)
  const accelRef = useRef<THREE.Group>(null!)
  const radiusRef = useRef<THREE.Group>(null!)

  // Reset trail khi params đổi (radius/omega/driftZ)
  useMemo(() => {
    trailPointsRef.current = []
    tRef.current = 0
  }, [params.radius, params.omega, params.driftZ])

  useFrame((_, dt) => {
    if (params.paused) return
    tRef.current += dt
    const t = tRef.current
    const { radius: r, omega: w, driftZ } = params
    const x = r * Math.cos(w * t)
    const y = r * Math.sin(w * t)
    // Z drift: makes a helix. Limit ±5m so doesn't go off-screen
    const zRaw = driftZ * t
    const zMax = 5
    const z = ((zRaw + zMax) % (2 * zMax)) - zMax  // wrap in [-5, 5]

    // Update particle
    if (particleRef.current) {
      particleRef.current.position.set(x, y, z)
    }

    // Append trail
    trailPointsRef.current.push(new THREE.Vector3(x, y, z))
    if (trailPointsRef.current.length > 600) trailPointsRef.current.shift()

    // Update trail line geometry
    if (trailLineRef.current && params.showTrail) {
      const geo = new THREE.BufferGeometry().setFromPoints(trailPointsRef.current)
      trailLineRef.current.geometry.dispose()
      trailLineRef.current.geometry = geo
    }

    // Update shadow projections
    if (shadowXYRef.current && params.showXY) {
      const pts = trailPointsRef.current.map((p) => new THREE.Vector3(p.x, p.y, -5.05))
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      shadowXYRef.current.geometry.dispose()
      shadowXYRef.current.geometry = geo
    }
    if (shadowXZRef.current && params.showXZ) {
      const pts = trailPointsRef.current.map((p) => new THREE.Vector3(p.x, -5.05, p.z))
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      shadowXZRef.current.geometry.dispose()
      shadowXZRef.current.geometry = geo
    }
    if (shadowYZRef.current && params.showYZ) {
      const pts = trailPointsRef.current.map((p) => new THREE.Vector3(-5.05, p.y, p.z))
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      shadowYZRef.current.geometry.dispose()
      shadowYZRef.current.geometry = geo
    }

    // Update vectors
    if (params.showVectors) {
      // Radius vector: from origin to particle
      if (radiusRef.current) {
        radiusRef.current.position.set(0, 0, 0)
        radiusRef.current.lookAt(x, y, z)
        const len = Math.sqrt(x * x + y * y + z * z)
        radiusRef.current.scale.set(1, 1, len)
      }
      // Velocity tangent: perpendicular to radius (in XY plane)
      const vx = -r * w * Math.sin(w * t)
      const vy = r * w * Math.cos(w * t)
      const vz = driftZ
      const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz)
      if (velocityRef.current && vMag > 0.01) {
        velocityRef.current.position.set(x, y, z)
        velocityRef.current.lookAt(x + vx, y + vy, z + vz)
        velocityRef.current.scale.set(1, 1, vMag * 0.5)
      }
      // Acceleration (centripetal in XY): -ω²·r toward axis
      const ax = -w * w * x
      const ay = -w * w * y
      const aMag = Math.sqrt(ax * ax + ay * ay)
      if (accelRef.current && aMag > 0.01) {
        accelRef.current.position.set(x, y, z)
        accelRef.current.lookAt(x + ax, y + ay, z)
        accelRef.current.scale.set(1, 1, aMag * 0.05)
      }
    }
  })

  return (
    <>
      {/* Particle (M) */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
      </mesh>

      {/* Trail (3D helix) */}
      {params.showTrail && (
        // @ts-expect-error R3F line element
        <line ref={trailLineRef}>
          <bufferGeometry />
          <lineBasicMaterial color="#ef4444" linewidth={2} transparent opacity={0.85} />
        </line>
      )}

      {/* Plane shadows */}
      {params.showXY && (
        // @ts-expect-error
        <line ref={shadowXYRef}>
          <bufferGeometry />
          <lineBasicMaterial color="#06b6d4" linewidth={2} transparent opacity={0.7} />
        </line>
      )}
      {params.showXZ && (
        // @ts-expect-error
        <line ref={shadowXZRef}>
          <bufferGeometry />
          <lineBasicMaterial color="#10b981" linewidth={2} transparent opacity={0.7} />
        </line>
      )}
      {params.showYZ && (
        // @ts-expect-error
        <line ref={shadowYZRef}>
          <bufferGeometry />
          <lineBasicMaterial color="#fbbf24" linewidth={2} transparent opacity={0.7} />
        </line>
      )}

      {/* Vectors */}
      {params.showVectors && (
        <>
          {/* Radius (white) */}
          <group ref={radiusRef}>
            <mesh position={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
              <meshBasicMaterial color="#94a3b8" />
            </mesh>
          </group>
          {/* Velocity (green) */}
          <group ref={velocityRef}>
            <mesh position={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.08, 0.16, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          </group>
          {/* Acceleration (red) */}
          <group ref={accelRef}>
            <mesh position={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.08, 0.16, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        </>
      )}
    </>
  )
}

// ─── Plane (visual reference) ────────────────────────────────────

function ProjectionPlane({ plane, visible }: {
  plane: 'XY' | 'XZ' | 'YZ'
  visible: boolean
}) {
  if (!visible) return null
  // Plane at z=-5 (XY), y=-5 (XZ), x=-5 (YZ)
  const position: [number, number, number] =
    plane === 'XY' ? [0, 0, -5]
    : plane === 'XZ' ? [0, -5, 0]
    : [-5, 0, 0]
  const rotation: [number, number, number] =
    plane === 'XY' ? [0, 0, 0]
    : plane === 'XZ' ? [Math.PI / 2, 0, 0]
    : [0, Math.PI / 2, 0]
  const color =
    plane === 'XY' ? '#06b6d4'
    : plane === 'XZ' ? '#10b981'
    : '#fbbf24'
  return (
    <group position={position} rotation={rotation}>
      {/* Plane background */}
      <mesh>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
      {/* Border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(10, 10)]} />
        <lineBasicMaterial color={color} transparent opacity={0.5} />
      </lineSegments>
      {/* Plane label */}
      <Text position={[4, 4, 0.1]} fontSize={0.4} color={color} anchorX="right" anchorY="top">
        {`Mặt ${plane}`}
      </Text>
    </group>
  )
}

// ─── Axes with labels ────────────────────────────────────────────

function Axes() {
  return (
    <group>
      {/* X axis (red) */}
      <mesh position={[2.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 5, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <Text position={[5.4, 0, 0]} fontSize={0.4} color="#ef4444" anchorX="left">X (Real)</Text>

      {/* Y axis (green) */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 5, 8]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 5, 0]}>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      <Text position={[0, 5.4, 0]} fontSize={0.4} color="#22c55e" anchorX="center">Y (Imag)</Text>

      {/* Z axis (blue) */}
      <mesh position={[0, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 5, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[0, 0, 5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <Text position={[0, 0, 5.4]} fontSize={0.4} color="#3b82f6" anchorX="center">Z (Time)</Text>

      {/* Origin */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </group>
  )
}

// ─── Reference circle (XY plane at z=0) ─────────────────────────

function ReferenceCircle({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const arr: THREE.Vector3[] = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      arr.push(new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0))
    }
    return arr
  }, [radius])
  return (
    <Line
      points={points.map((p): [number, number, number] => [p.x, p.y, p.z])}
      color="#94a3b8"
      lineWidth={1.5}
      transparent
      opacity={0.4}
    />
  )
}

// ─── Main component ─────────────────────────────────────────────

export default function CircularMotion3D() {
  const [params, setParams] = useState<SimParams>({
    radius: 2,
    omega: 1,
    driftZ: 0.6,
    showXY: true,
    showXZ: true,
    showYZ: true,
    showVectors: true,
    showTrail: true,
    paused: false,
  })

  const update = <K extends keyof SimParams>(key: K, value: SimParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                <Activity className="w-6 h-6 text-cyan-400" />
                Chuyển động tròn 3D — Hình chiếu lên 3 mặt phẳng
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Helix complex e<sup>iωt</sup> · Real (X) + Imaginary (Y) + Time (Z) · Shadow XY/XZ/YZ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => update('paused', !params.paused)}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition ${
                !params.paused ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}>
              {!params.paused ? <><Pause className="w-4 h-4" /> Tạm dừng</> : <><Play className="w-4 h-4" /> Chạy</>}
            </button>
            <button onClick={() => setParams({ ...params })}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset trail
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Controls */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Thông số</h3>
              <Slider label="Bán kính r" value={params.radius} min={0.5} max={3.5} step={0.1}
                suffix=" m" onChange={(v) => update('radius', v)} />
              <Slider label="Vận tốc góc ω" value={params.omega} min={0.2} max={3} step={0.1}
                suffix=" rad/s" onChange={(v) => update('omega', v)} />
              <Slider label="Trôi dọc Z (helix)" value={params.driftZ} min={0} max={2} step={0.1}
                suffix=" m/s" onChange={(v) => update('driftZ', v)} />
              <p className="text-[10px] text-white/40 italic mt-1">
                Z=0: vòng tròn trên XY · Z&gt;0: xoắn ốc theo Z (helix) như e<sup>iωt</sup>
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🪟 Hình chiếu lên mặt phẳng</h3>
              <ToggleRow label="🟦 Mặt XY (z = −5)" checked={params.showXY} color="cyan" onChange={(v) => update('showXY', v)} />
              <ToggleRow label="🟩 Mặt XZ (y = −5)" checked={params.showXZ} color="emerald" onChange={(v) => update('showXZ', v)} />
              <ToggleRow label="🟧 Mặt YZ (x = −5)" checked={params.showYZ} color="amber" onChange={(v) => update('showYZ', v)} />
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🎨 Hiển thị</h3>
              <ToggleRow label="🔴 Quỹ đạo 3D" checked={params.showTrail} color="rose" onChange={(v) => update('showTrail', v)} />
              <ToggleRow label="➡️ Vector v, a, r" checked={params.showVectors} color="violet" onChange={(v) => update('showVectors', v)} />
            </div>

            {/* Computed values */}
            <div className="rounded-2xl bg-cyan-500/[0.06] border border-cyan-500/25 p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-300">📊 Đại lượng</h3>
              <Row label="T (chu kỳ)" value={`${(2 * Math.PI / params.omega).toFixed(2)} s`} color="text-cyan-300" />
              <Row label="v = ω·r" value={`${(params.omega * params.radius).toFixed(2)} m/s`} color="text-emerald-300" />
              <Row label="a = ω²·r" value={`${(params.omega * params.omega * params.radius).toFixed(2)} m/s²`} color="text-rose-300" />
              <Row label="Bước Helix" value={`${(2 * Math.PI / params.omega * params.driftZ).toFixed(2)} m`} color="text-amber-300" />
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 h-[560px]">
              <XRCanvas
                camera={{ position: [8, 6, 10], fov: 45 }}
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: false }}>
                <color attach="background" args={['#050714']} />
                <fog attach="fog" args={['#050714', 12, 30]} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 10, 5]} intensity={1.0} />
                <pointLight position={[0, 0, 10]} intensity={0.3} color="#22d3ee" />

                {/* Grid floor */}
                <Grid args={[20, 20]} position={[0, -5, 0]} cellColor="#1e293b" sectionColor="#334155" fadeDistance={25} infiniteGrid />

                {/* Coordinate axes + labels */}
                <Axes />

                {/* Reference circle in XY plane at z=0 */}
                <ReferenceCircle radius={params.radius} />

                {/* Projection planes */}
                <ProjectionPlane plane="XY" visible={params.showXY} />
                <ProjectionPlane plane="XZ" visible={params.showXZ} />
                <ProjectionPlane plane="YZ" visible={params.showYZ} />

                {/* Particle + trail + shadows + vectors */}
                <ParticleAndTrail params={params} />

                <OrbitControls
                  enablePan
                  minDistance={5} maxDistance={30}
                  enableDamping dampingFactor={0.1}
                />
              </XRCanvas>
            </div>

            {/* Theory */}
            <div className="rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 p-4">
              <h3 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Ý nghĩa
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-emerald-300 mb-1">📐 Helix = e<sup>iωt</sup></h4>
                  <p className="text-white/55 leading-relaxed">
                    Khi cho điểm vừa quay tròn (XY) vừa trôi đều theo trục Z, quỹ đạo thành <strong>xoắn ốc</strong> (helix).
                    Trong số phức: e<sup>iωt</sup> · z(t) = (cos ωt, sin ωt, vt) — mô hình toán cơ bản của sóng.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">🪟 Hình chiếu lên 3 mặt phẳng</h4>
                  <p className="text-white/55 leading-relaxed">
                    <strong>XY</strong>: vòng tròn (chuyển động tròn đều).<br />
                    <strong>XZ</strong>: hàm cos (SHM theo X).<br />
                    <strong>YZ</strong>: hàm sin (SHM theo Y, lệch pha π/2).
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-bold text-violet-300 mb-1">🎯 Vector</h4>
                  <p className="text-white/55 leading-relaxed">
                    <span className="text-white/80">⬜ Radius (xám)</span>: từ trục Z đến vị trí hạt ·{' '}
                    <span className="text-emerald-300">▶ Velocity (xanh lá)</span>: tiếp tuyến + thành phần dọc Z ·{' '}
                    <span className="text-rose-300">◀ Acceleration (đỏ)</span>: hướng tâm trong mặt XY (luôn vuông góc trục Z).
                    Kéo chuột để xoay · scroll để zoom.
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

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-cyan-300">{value.toFixed(1)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500" />
    </div>
  )
}

function ToggleRow({ label, checked, color, onChange }: {
  label: string; checked: boolean
  color: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet'
  onChange: (v: boolean) => void
}) {
  const accents = {
    cyan: 'accent-cyan-500',
    emerald: 'accent-emerald-500',
    amber: 'accent-amber-500',
    rose: 'accent-rose-500',
    violet: 'accent-violet-500',
  }
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className={accents[color]} />
      <span className="text-white/75 flex items-center gap-1">
        {checked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-30" />}
        {label}
      </span>
    </label>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/55">{label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  )
}
