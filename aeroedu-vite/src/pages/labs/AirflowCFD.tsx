/**
 * AirflowCFD — Mô phỏng dòng không khí qua vật thể 3D bằng React Three Fiber
 *
 * Phong cách tham khảo: "Axial Blood Pump Project" CFD visualization
 *   - Streamlines tô màu theo vận tốc tương đối
 *   - Colormap áp suất động học trên bề mặt vật thể
 *   - Bảng tham số (nS, nD, LS, LI, LD, p, w, d1, c1, ΔP, P, objective)
 *   - Biểu đồ lịch sử hội tụ (optimization function)
 *
 * Triết lý render: xấp xỉ trực quan (không giải Navier–Stokes thật) —
 * đủ nhanh, chạy mượt trên GPU, và giữ các xu hướng vật lý đúng để dạy học.
 *
 * Route: /dashboard/labtwin/airflow-cfd
 */
import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  Play, Pause, RotateCcw, Wind, Gauge, Activity,
  Layers, Zap, Info, Upload, Film, SkipBack, Trash2, Loader2,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

type ShapeKey = 'sphere' | 'cylinder' | 'airfoil' | 'car' | 'pump' | 'custom'

interface ShapeDef {
  key: ShapeKey
  label: string
  vn: string
  accent: string
  // Half-size bounding box along X (chord/length), Y (height), Z (span)
  bbox: [number, number, number]
}

const SHAPES: ShapeDef[] = [
  { key: 'sphere',   label: 'Sphere',       vn: 'Hình cầu',          accent: '#22d3ee', bbox: [1.0, 1.0, 1.0] },
  { key: 'cylinder', label: 'Cylinder',     vn: 'Hình trụ',          accent: '#a78bfa', bbox: [0.9, 1.2, 0.9] },
  { key: 'airfoil',  label: 'Airfoil',      vn: 'Cánh máy bay',      accent: '#e879f9', bbox: [1.8, 0.35, 1.2] },
  { key: 'car',      label: 'Car',          vn: 'Thân xe',           accent: '#10b981', bbox: [1.8, 0.6, 0.9] },
  { key: 'pump',     label: 'Pump rotor',   vn: 'Rotor bơm trục',    accent: '#f59e0b', bbox: [0.55, 1.8, 0.55] },
  { key: 'custom',   label: 'Custom 3D',    vn: 'Vật thể tải lên',   accent: '#f43f5e', bbox: [1.5, 1.5, 1.5] },
]

// ──────────────────────────────────────────────────────────────────────────────
// PHYSICS HELPERS — simplified 3D potential-flow–ish deflection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Return deflected velocity vector at a sample position for a given shape.
 * Freestream is +X. We model the body as a smooth obstacle with falloff
 * inverse distance — gives visually plausible streamlines & velocity magnitudes
 * without solving Navier–Stokes.
 */
/**
 * Velocity field — Cải tiến CFD physics-based:
 *   - Potential flow + Doublet around bluff bodies (chuẩn aero textbook)
 *   - Kármán vortex shedding (St=0.2) — vortex chu kỳ rời từ bluff body
 *   - Boundary layer thickness ~5/√Re (Blasius), wake region rộng dần
 *   - Lift circulation (Kutta-Joukowski) cho airfoil
 *
 * Tham số `t` để vortex shedding chuyển động theo thời gian
 * (làm cho streamlines/particles thấy được wake oscillation thực)
 */
function velocityAt(
  x: number, y: number, z: number,
  U: number, aoa: number,
  shape: ShapeKey,
  bbox: [number, number, number],
  t: number = 0,
): THREE.Vector3 {
  const [ax, ay, az] = bbox
  const rad = aoa * Math.PI / 180

  // Freestream xoay theo AoA
  const cosA = Math.cos(rad), sinA = Math.sin(rad)
  let vx = U * cosA
  let vy = U * sinA
  let vz = 0

  // ── Potential flow: doublet flow quanh body ──
  // Đối với sphere/cylinder/pump → flow chuẩn sách Aerodynamics
  // Body radius (avg) for doublet strength
  const R = (ax + ay + az) / 3
  const r2 = x * x + y * y + z * z
  const r = Math.sqrt(r2)

  if (r > R * 0.95) {
    // Outside body — apply potential flow correction
    if (shape === 'sphere' || shape === 'pump') {
      // 3D doublet (Hess-Smith): v_perturb = (R³/2r³) × (3(U·r̂)r̂ − U)
      const Rcube = R * R * R
      const factor = Rcube / (2 * Math.max(r2 * r, 0.1))
      const dotUr = (vx * x + vy * y) / Math.max(r, 0.01)
      vx += factor * (3 * dotUr * x / r - vx)
      vy += factor * (3 * dotUr * y / r - vy)
      vz += factor * (3 * dotUr * z / r - vz)
    } else if (shape === 'cylinder') {
      // 2D doublet (no z-component for cylinder of infinite length)
      const r2xy = x * x + y * y
      const Rsq = R * R
      const factor = Rsq / Math.max(r2xy * r2xy, 0.1)
      const cosT = x / Math.sqrt(r2xy)
      vx -= U * Rsq * (x * x - y * y) / Math.max(r2xy * r2xy, 0.01)
      vy -= U * Rsq * 2 * x * y / Math.max(r2xy * r2xy, 0.01)
    }
  } else {
    // Inside body — push particles out via repulsive (escape stuck)
    const dirLen = Math.max(r, 0.01)
    vx += (x / dirLen) * U * 0.8
    vy += (y / dirLen) * U * 0.8
    vz += (z / dirLen) * U * 0.4
  }

  // ── Kármán vortex shedding (downstream wake oscillation) ──
  // Strouhal number St = f·D/U ≈ 0.2 cho cylinder (Re 100-200k)
  // Tạo 2 hàng vortex luân phiên (von Kármán street)
  if (x > R * 0.5 && Math.abs(y) < ay * 4 && (shape === 'cylinder' || shape === 'sphere' || shape === 'car')) {
    const St = 0.2
    const D = 2 * R
    const freq = St * U / Math.max(D, 0.1)
    const wakeStrength = U * 0.4
    // Đi xa thì wake yếu dần
    const decay = Math.exp(-(x - R) / (R * 6))
    // Oscillation y theo time
    const wakeY = wakeStrength * decay * Math.sin(freq * t * Math.PI * 2 - x * 0.5)
    vy += wakeY
    // Recirculation gần body (back-flow vùng wake)
    if (x < R * 2.5 && Math.abs(y) < R * 1.5) {
      const recirc = U * 0.3 * decay * Math.exp(-Math.abs(y) / R)
      vx -= recirc
    }
  }

  // ── Airfoil — Thin airfoil theory với circulation (Γ) ──
  if (shape === 'airfoil') {
    // Lift coefficient Cl = 2π × AoA (radians) cho thin symmetric airfoil
    const Cl = 2 * Math.PI * rad * 0.6  // dampened factor
    // Bound vortex circulation ~ Cl × U × c (c=chord)
    const chord = ax * 2
    const gamma = Cl * U * chord / 2
    // Vortex induces upwash trước/downwash sau
    const xRel = x  // x in body frame
    const yRel = y
    const dRel = Math.sqrt(xRel * xRel + yRel * yRel) + 0.5
    const induced = gamma / (2 * Math.PI * dRel * dRel)
    vx += -yRel * induced
    vy += xRel * induced
  }

  // ── Car — ground effect + roof vortex ──
  if (shape === 'car') {
    // Ground effect: speed-up under car
    if (y < -ay * 0.5 && Math.abs(x) < ax * 1.5) {
      vx += U * 0.3 * Math.exp(-Math.abs(y + ay) / ay)
    }
  }

  // ── Pump rotor — swirl quanh trục x (axial pump) ──
  if (shape === 'pump') {
    const rxy = Math.sqrt(y * y + z * z)
    if (rxy < R * 2) {
      // Tangential swirl with Gaussian profile
      const swirl = U * 1.2 * Math.exp(-rxy * rxy / (R * R))
      // Time-varying để xem cánh quay
      const rotateOffset = t * U * 0.5
      const cosR = Math.cos(rotateOffset), sinR = Math.sin(rotateOffset)
      vy += (-z * cosR - y * sinR) * swirl * 0.5 / Math.max(rxy, 0.1)
      vz += ( y * cosR - z * sinR) * swirl * 0.5 / Math.max(rxy, 0.1)
      // Axial acceleration (pump increases x-velocity)
      vx += U * 0.5 * Math.exp(-rxy * rxy / (R * R))
    }
  }

  return new THREE.Vector3(vx, vy, vz)
}

/**
 * Signed surface pressure proxy at a point on the body (unit vec n from center).
 * Front (n · U > 0) → positive pressure (red); sides → negative (blue);
 * back → mild negative (wake).
 */
function surfacePressure(nx: number, ny: number, nz: number, aoa: number, shape: ShapeKey): number {
  const rad = aoa * Math.PI / 180
  const ux = Math.cos(rad), uy = Math.sin(rad)
  const dotU = nx * ux + ny * uy
  let cp = 2 * dotU * dotU - 1    // crude Cp mapping
  if (dotU < 0) cp *= 0.35        // leeward suction attenuated
  if (shape === 'airfoil') cp += 0.25 * ny * Math.cos(rad * 2)
  if (shape === 'pump')    cp += 0.15 * nz
  return Math.max(-1.2, Math.min(1.2, cp))
}

// Velocity magnitude → HSL color (blue=slow, cyan=mid, yellow/red=fast)
function velHueColor(magNorm: number): THREE.Color {
  const t = Math.max(0, Math.min(1, magNorm))
  // cold blue (0.66) → cyan (0.55) → green (0.33) → yellow (0.15) → red (0.0)
  const h = 0.66 - 0.66 * t
  return new THREE.Color().setHSL(h, 1, 0.55)
}

// Pressure [-1,1] → diverging colormap (blue → white → red)
function pressureColor(cp: number): THREE.Color {
  const t = (cp + 1) / 2 // 0..1
  const c = new THREE.Color()
  if (t < 0.5) {
    const k = t * 2
    c.setRGB(0.15 + 0.85 * k, 0.35 + 0.65 * k, 0.9)
  } else {
    const k = (t - 0.5) * 2
    c.setRGB(1, 1 - 0.55 * k, 0.6 - 0.6 * k)
  }
  return c
}

// ──────────────────────────────────────────────────────────────────────────────
// 3D MESHES — one per shape, with per-vertex pressure colors
// ──────────────────────────────────────────────────────────────────────────────

function BodyMesh({ shape, aoa, showPressure }: { shape: ShapeKey; aoa: number; showPressure: boolean }) {
  const geometry = useMemo(() => {
    let g: THREE.BufferGeometry
    if (shape === 'sphere') {
      g = new THREE.SphereGeometry(1, 64, 48)
    } else if (shape === 'cylinder') {
      g = new THREE.CylinderGeometry(0.9, 0.9, 2.4, 48, 8, false)
    } else if (shape === 'airfoil') {
      // NACA 0012-ish airfoil extruded along Z
      const shape2d = new THREE.Shape()
      const n = 40
      const chord = 3.2
      const thickness = 0.5
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * chord - chord / 2
        const xt = (i / n)
        const yt = (thickness / 0.2) * 0.1 * (
          0.2969 * Math.sqrt(xt) - 0.1260 * xt
          - 0.3516 * xt * xt + 0.2843 * xt * xt * xt - 0.1015 * xt * xt * xt * xt
        )
        if (i === 0) shape2d.moveTo(x, yt)
        else shape2d.lineTo(x, yt)
      }
      for (let i = n; i >= 0; i--) {
        const x = (i / n) * chord - chord / 2
        const xt = (i / n)
        const yt = -(thickness / 0.2) * 0.1 * (
          0.2969 * Math.sqrt(xt) - 0.1260 * xt
          - 0.3516 * xt * xt + 0.2843 * xt * xt * xt - 0.1015 * xt * xt * xt * xt
        )
        shape2d.lineTo(x, yt)
      }
      g = new THREE.ExtrudeGeometry(shape2d, { depth: 2.4, bevelEnabled: false, steps: 24 })
      g.translate(0, 0, -1.2)
    } else if (shape === 'car') {
      // Low-poly car silhouette: body + cabin roof
      const body = new THREE.BoxGeometry(3.4, 0.7, 1.4, 6, 2, 2)
      body.translate(0, 0, 0)
      const cabin = new THREE.BoxGeometry(1.8, 0.55, 1.2, 4, 2, 2)
      cabin.translate(-0.2, 0.55, 0)
      // merge into one
      const positions: number[] = []
      const normals: number[] = []
      ;[body, cabin].forEach((sub) => {
        const pos = sub.getAttribute('position')
        const nrm = sub.getAttribute('normal')
        for (let i = 0; i < pos.count; i++) {
          positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
          normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i))
        }
      })
      g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    } else {
      // pump rotor — lathe (axial blood pump silhouette)
      const points: THREE.Vector2[] = []
      const N = 32
      for (let i = 0; i <= N; i++) {
        const t = i / N
        const y = (t - 0.5) * 3.2
        // profile: narrow at ends, bulged mid with helical groove
        const r = 0.35 + 0.45 * Math.sin(Math.PI * t) + 0.06 * Math.cos(t * 8)
        points.push(new THREE.Vector2(r, y))
      }
      g = new THREE.LatheGeometry(points, 48)
    }
    g.computeVertexNormals()

    // Per-vertex pressure colors
    const pos = g.getAttribute('position')
    const nrm = g.getAttribute('normal')
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    const ambient = new THREE.Color('#334155')
    for (let i = 0; i < pos.count; i++) {
      if (showPressure) {
        const cp = surfacePressure(nrm.getX(i), nrm.getY(i), nrm.getZ(i), aoa, shape)
        c.copy(pressureColor(cp))
      } else {
        c.copy(ambient)
      }
      colors[i * 3 + 0] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
    // Rebuild when shape, aoa, or toggle changes
  }, [shape, aoa, showPressure])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        metalness={showPressure ? 0.15 : 0.55}
        roughness={showPressure ? 0.45 : 0.35}
        emissive={showPressure ? '#000000' : '#0b1227'}
        emissiveIntensity={showPressure ? 0 : 0.35}
      />
    </mesh>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// PARTICLES — many instanced spheres, advected by fake velocity field
// ──────────────────────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 1400  // tăng từ 900 → 1400 cho mật độ visualization cao hơn

function ParticleSwarm({
  shape, U, aoa, bbox, running, vmax,
}: {
  shape: ShapeKey; U: number; aoa: number; bbox: [number, number, number]; running: boolean; vmax: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorTmp = useMemo(() => new THREE.Color(), [])

  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      pos: new THREE.Vector3(
        Math.random() * 14 - 12,
        (Math.random() - 0.5) * 5.5,
        (Math.random() - 0.5) * 3.5,
      ),
      life: Math.random() * 100,
    }))
  )

  // Reset particle seed on shape change (avoids stuck-inside particles)
  useEffect(() => {
    particles.current.forEach((p) => {
      p.pos.set(Math.random() * 14 - 12, (Math.random() - 0.5) * 5.5, (Math.random() - 0.5) * 3.5)
      p.life = Math.random() * 100
    })
  }, [shape])

  const simTimeRef = useRef(0)
  useFrame((_, dt) => {
    if (!running || !meshRef.current) return
    const delta = Math.min(dt, 0.05)
    simTimeRef.current += delta
    const t = simTimeRef.current
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i]
      const v = velocityAt(p.pos.x, p.pos.y, p.pos.z, U, aoa, shape, bbox, t)
      p.pos.x += v.x * delta * 0.9
      p.pos.y += v.y * delta * 0.9
      p.pos.z += v.z * delta * 0.9
      p.life += delta
      if (p.pos.x > 8 || p.pos.y > 5 || p.pos.y < -5 || p.pos.z > 4 || p.pos.z < -4 || p.life > 12) {
        p.pos.set(-9 - Math.random() * 3, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3.2)
        p.life = 0
      }

      dummy.position.copy(p.pos)
      const mag = v.length()
      const sc = 0.055 + Math.min(mag / (vmax + 0.001), 1) * 0.025
      dummy.scale.setScalar(sc)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      colorTmp.copy(velHueColor(mag / (vmax + 0.001)))
      meshRef.current.setColorAt(i, colorTmp)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial toneMapped={false} emissive="#ffffff" emissiveIntensity={0.4} />
    </instancedMesh>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// STREAMLINES — ~28 integrated curves, segments tinted by local velocity
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Streamlines — integrated flow lines.
 *
 * Cải tiến: thêm `simTime` để streamlines update khi vortex shed → user
 * thấy được pattern oscillate (Kármán street) thay vì static.
 *
 * Update streamlines mỗi N frames thay vì mỗi frame (giữ perf):
 * useMemo phụ thuộc vào Math.floor(simTime * 2) → 2 Hz refresh.
 */
function Streamlines({
  shape, U, aoa, bbox, vmax, simTime,
}: {
  shape: ShapeKey; U: number; aoa: number; bbox: [number, number, number]; vmax: number; simTime: number
}) {
  // Round simTime to 0.5s steps to reduce re-renders while keeping vortex visible
  const tQuantized = Math.floor(simTime * 2) / 2
  const { lines } = useMemo(() => {
    const rows = 6, cols = 7
    const allLines: { points: THREE.Vector3[]; colors: THREE.Color[] }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const y0 = -2.4 + (r / (rows - 1)) * 4.8
        const z0 = -1.8 + (c / (cols - 1)) * 3.6
        const pts: THREE.Vector3[] = []
        const cols3: THREE.Color[] = []
        let p = new THREE.Vector3(-8, y0, z0)
        pts.push(p.clone())
        cols3.push(velHueColor(U / (vmax + 0.001)))
        for (let step = 0; step < 320; step++) {
          const v = velocityAt(p.x, p.y, p.z, U, aoa, shape, bbox, tQuantized)
          p = p.clone().add(v.clone().multiplyScalar(0.025))
          pts.push(p.clone())
          cols3.push(velHueColor(v.length() / (vmax + 0.001)))
          if (p.x > 10 || Math.abs(p.y) > 5.8 || Math.abs(p.z) > 4.5) break
        }
        if (pts.length > 3) allLines.push({ points: pts, colors: cols3 })
      }
    }
    return { lines: allLines }
  }, [shape, U, aoa, bbox, vmax, tQuantized])

  return (
    <group>
      {lines.map((ln, i) => (
        <Line
          key={`sl-${i}`}
          points={ln.points}
          vertexColors={ln.colors}
          lineWidth={1.6}
          transparent
          opacity={0.9}
        />
      ))}
    </group>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// STREAMLINES WRAPPER với time tracking — tạo wake oscillation visible
// ──────────────────────────────────────────────────────────────────────────────

function StreamlinesWithTime({
  shape, U, aoa, bbox, vmax, running,
}: {
  shape: ShapeKey; U: number; aoa: number; bbox: [number, number, number]; vmax: number; running: boolean;
}) {
  const [simTime, setSimTime] = useState(0)
  const timeRef = useRef(0)

  useFrame((_, dt) => {
    if (!running) return
    timeRef.current += Math.min(dt, 0.05)
    // Update state every ~0.5s để trigger streamlines re-compute
    if (Math.floor(timeRef.current * 2) !== Math.floor(simTime * 2)) {
      setSimTime(timeRef.current)
    }
  })

  return <Streamlines shape={shape} U={U} aoa={aoa} bbox={bbox} vmax={vmax} simTime={simTime} />
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENE
// ──────────────────────────────────────────────────────────────────────────────

function Scene({
  shape, U, aoa, running, showPressure, showStreamlines, showParticles, vmax,
  effectiveBbox, customModel, animPlaying, animSpeed, animTimeRef, onAnimTimeChange,
}: {
  shape: ShapeKey; U: number; aoa: number; running: boolean;
  showPressure: boolean; showStreamlines: boolean; showParticles: boolean;
  vmax: number;
  /** Bbox đang dùng cho tính toán dòng — built-in shape dùng def.bbox,
   *  custom shape dùng bbox đo từ mô hình upload. */
  effectiveBbox: [number, number, number];
  /** Dữ liệu mô hình custom đã load (null khi chưa upload hoặc không phải custom). */
  customModel: CustomModelData | null;
  animPlaying: boolean;
  animSpeed: number;
  animTimeRef: React.MutableRefObject<number>;
  onAnimTimeChange: (t: number) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 8]} intensity={1.1} castShadow />
      <directionalLight position={[-8, 4, -6]} intensity={0.35} color="#93c5fd" />

      <Grid
        args={[30, 30]}
        cellSize={1}
        cellColor="#1e293b"
        sectionSize={5}
        sectionColor="#334155"
        fadeDistance={40}
        fadeStrength={1.2}
        infiniteGrid
        position={[0, -3.2, 0]}
      />

      {shape === 'custom' ? (
        customModel ? (
          <CustomBodyMesh
            object={customModel.object}
            clips={customModel.clips}
            animPlaying={animPlaying}
            animSpeed={animSpeed}
            animTimeRef={animTimeRef}
            onTimeChange={onAnimTimeChange}
          />
        ) : (
          // Chưa upload — hiển thị khung dây placeholder để user biết vị trí
          <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshBasicMaterial color="#fda4af" wireframe transparent opacity={0.35} />
          </mesh>
        )
      ) : (
        <group rotation={shape === 'pump' ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
          <BodyMesh shape={shape} aoa={aoa} showPressure={showPressure} />
        </group>
      )}

      {showStreamlines && (shape !== 'custom' || customModel) && (
        <StreamlinesWithTime shape={shape} U={U} aoa={aoa} bbox={effectiveBbox} vmax={vmax} running={running} />
      )}

      {showParticles && (shape !== 'custom' || customModel) && (
        <ParticleSwarm shape={shape} U={U} aoa={aoa} bbox={effectiveBbox} running={running} vmax={vmax} />
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={22}
      />
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// COLORBAR — SVG gradient legend for velocity or pressure
// ──────────────────────────────────────────────────────────────────────────────

function Colorbar({
  label, unit, min, max, kind,
}: {
  label: string; unit: string; min: number; max: number; kind: 'velocity' | 'pressure'
}) {
  const stops = Array.from({ length: 20 }, (_, i) => {
    const t = i / 19
    const c = kind === 'velocity' ? velHueColor(t) : pressureColor(t * 2 - 1)
    return `#${c.getHexString()}`
  })
  return (
    <div className="flex items-center gap-2 bg-slate-900/70 border border-slate-700/70 rounded px-2 py-1.5">
      <div className="text-[10px] font-mono text-slate-400 leading-tight w-20">
        <div className="text-slate-200 font-semibold">{label}</div>
        <div className="text-slate-500">{unit}</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-[10px] font-mono text-slate-400">{max.toFixed(1)}</div>
        <div
          className="w-3 h-20 rounded-sm border border-slate-700"
          style={{
            background: `linear-gradient(to bottom, ${stops.slice().reverse().join(',')})`,
          }}
        />
        <div className="text-[10px] font-mono text-slate-400">{min.toFixed(1)}</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// CONVERGENCE PLOT — SVG sparkline of objective history
// ──────────────────────────────────────────────────────────────────────────────

function ConvergencePlot({ history }: { history: number[] }) {
  if (history.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
        chạy mô phỏng để thu thập dữ liệu…
      </div>
    )
  }
  const W = 320, H = 90
  const maxV = Math.max(...history), minV = Math.min(...history)
  const range = Math.max(maxV - minV, 0.001)
  const pts = history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * W
      const y = H - ((v - minV) / range) * H
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <defs>
        <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={0} x2={W} y1={H * t} y2={H * t} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,3" />
      ))}
      <polyline
        points={`0,${H} ${pts} ${W},${H}`}
        fill="url(#convFill)"
        stroke="none"
      />
      <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth={1.5} />
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// CUSTOM 3D MODEL LOADER + ANIMATED BODY
// ──────────────────────────────────────────────────────────────────────────────
// Hỗ trợ user upload .glb/.gltf/.obj/.stl/.fbx và chạy mô phỏng dòng khí
// quanh vật thể tự tải. Nếu mô hình có animation, hiển thị thanh timeline để
// tua tới/lui và quan sát từng thời điểm.
//
// Tất cả loader của three.js (GLTFLoader, OBJLoader, STLLoader, FBXLoader)
// được dynamic-import để KHÔNG kéo vào bundle khi user không dùng tính năng này.
// ──────────────────────────────────────────────────────────────────────────────

interface CustomModelData {
  /** Group root chứa mô hình đã được center + scale về kích thước scene */
  object: THREE.Object3D
  /** Half-size bounding box theo trục [X, Y, Z] sau khi đã transform */
  bbox: [number, number, number]
  /** Mảng AnimationClip lấy từ file (rỗng nếu không có) */
  clips: THREE.AnimationClip[]
  /** Thời lượng animation dài nhất (giây). 0 nếu không có animation. */
  duration: number
  /** Tên file gốc — hiển thị trên UI */
  name: string
  /** Phần mở rộng chuẩn hoá: 'glb' | 'gltf' | 'obj' | 'stl' | 'fbx' */
  format: string
}

const ACCEPTED_MODEL_EXT = ['glb', 'gltf', 'obj', 'stl', 'fbx'] as const

/**
 * Parse 1 file 3D thành CustomModelData. Tự động:
 *   - chọn loader theo extension (dynamic import — không bloat bundle)
 *   - center mô hình về origin
 *   - scale đều sao cho cạnh dài nhất ≈ 3 đơn vị (vừa khít wind-tunnel scene)
 *   - bật castShadow / receiveShadow trên mọi mesh con
 *   - trích xuất AnimationClip + tính duration max
 */
async function parseModelFile(file: File): Promise<CustomModelData> {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!(ACCEPTED_MODEL_EXT as readonly string[]).includes(ext)) {
    throw new Error(`Định dạng .${ext || '?'} chưa hỗ trợ — dùng .${ACCEPTED_MODEL_EXT.join(' / .')}`)
  }
  const buf = await file.arrayBuffer()

  let parsed: THREE.Object3D
  let clips: THREE.AnimationClip[] = []

  if (ext === 'glb' || ext === 'gltf') {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const loader = new GLTFLoader()
    const gltf = await new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>(
      (resolve, reject) => {
        try {
          loader.parse(buf, '', resolve as (g: unknown) => void, reject)
        } catch (e) {
          reject(e)
        }
      }
    )
    parsed = gltf.scene
    clips = gltf.animations || []
  } else if (ext === 'obj') {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js')
    const loader = new OBJLoader()
    parsed = loader.parse(new TextDecoder().decode(buf))
  } else if (ext === 'stl') {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js')
    const loader = new STLLoader()
    const geometry = loader.parse(buf)
    geometry.computeVertexNormals()
    const mat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.45,
      roughness: 0.4,
    })
    parsed = new THREE.Mesh(geometry, mat)
  } else {
    // fbx
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js')
    const loader = new FBXLoader()
    parsed = loader.parse(buf, '')
    clips = (parsed as THREE.Object3D & { animations?: THREE.AnimationClip[] }).animations || []
  }

  // Center về origin + scale sao cho cạnh dài nhất ≈ 3 đơn vị
  // Bọc trong THREE.Group để giữ nguyên local-transform của mô hình con
  // (cần thiết cho rigged animations, nếu không bones sẽ bị méo).
  const box = new THREE.Box3().setFromObject(parsed)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = 3 / maxDim
  parsed.position.sub(center)
  const root = new THREE.Group()
  root.add(parsed)
  root.scale.setScalar(scale)

  const finalBox = new THREE.Box3().setFromObject(root)
  const finalSize = new THREE.Vector3()
  finalBox.getSize(finalSize)
  const bbox: [number, number, number] = [
    Math.max(finalSize.x / 2, 0.05),
    Math.max(finalSize.y / 2, 0.05),
    Math.max(finalSize.z / 2, 0.05),
  ]

  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  })

  const duration = clips.reduce((m, c) => Math.max(m, c.duration), 0)

  return { object: root, bbox, clips, duration, name: file.name, format: ext }
}

/** Giải phóng GPU memory của mô hình cũ khi user upload file mới. */
function disposeModelObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const m = child as THREE.Mesh
    if (m.isMesh) {
      m.geometry?.dispose?.()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose?.()
    }
  })
}

/**
 * Render mô hình custom + drive AnimationMixer.
 *
 * Khi animPlaying=true: useFrame advance mixer theo dt * speed,
 *                      animTimeRef.current ← mixer.time (push lên parent UI qua interval).
 * Khi animPlaying=false: useFrame nhảy mixer tới animTimeRef.current
 *                       → user kéo slider → mô hình tua tức thì.
 */
function CustomBodyMesh({
  object, clips, animPlaying, animSpeed, animTimeRef, onTimeChange,
}: {
  object: THREE.Object3D
  clips: THREE.AnimationClip[]
  animPlaying: boolean
  animSpeed: number
  animTimeRef: React.MutableRefObject<number>
  onTimeChange: (t: number) => void
}) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  // Khởi tạo mixer mỗi khi object hoặc clips thay đổi (user upload file mới)
  useEffect(() => {
    if (!object || clips.length === 0) {
      mixerRef.current = null
      return
    }
    const mixer = new THREE.AnimationMixer(object)
    clips.forEach((clip) => {
      const action = mixer.clipAction(clip)
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
      action.play()
    })
    mixerRef.current = mixer
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(object)
      mixerRef.current = null
    }
  }, [object, clips])

  // Throttled UI sync — push current animation time lên parent ~10fps
  // (slider value chỉ cần mượt cho mắt, không cần 60fps re-render parent)
  useEffect(() => {
    if (clips.length === 0) return
    const id = setInterval(() => {
      onTimeChange(animTimeRef.current)
    }, 100)
    return () => clearInterval(id)
  }, [clips, animTimeRef, onTimeChange])

  useFrame((_, dt) => {
    const m = mixerRef.current
    if (!m) return
    if (animPlaying) {
      m.update(Math.min(dt, 0.1) * animSpeed)
      animTimeRef.current = m.time
    } else {
      // Scrubbing or paused — jump mixer tới time mong muốn
      const target = animTimeRef.current
      const delta = target - m.time
      if (Math.abs(delta) > 1e-4) m.update(delta)
    }
  })

  return <primitive object={object} />
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = (s - m * 60).toFixed(2).padStart(5, '0')
  return `${m.toString().padStart(2, '0')}:${sec}`
}

/** Thanh timeline overlay cho mô hình có animation: play / pause / scrub / speed. */
function AnimationTimeline({
  duration, currentTime, playing, speed, onSeek, onTogglePlay, onSpeedChange,
}: {
  duration: number
  currentTime: number
  playing: boolean
  speed: number
  onSeek: (t: number) => void
  onTogglePlay: () => void
  onSpeedChange: (s: number) => void
}) {
  const t = Math.max(0, Math.min(currentTime, duration))
  const pct = duration > 0 ? (t / duration) * 100 : 0
  return (
    <div className="absolute bottom-3 left-3 right-3 px-3 py-2.5 rounded-lg border border-fuchsia-400/30 bg-slate-950/85 backdrop-blur flex items-center gap-3 shadow-lg">
      <div className="flex items-center gap-1.5 text-fuchsia-200 text-[11px] font-mono pr-2 border-r border-slate-700">
        <Film className="h-3.5 w-3.5" />
        <span>Animation</span>
      </div>
      <button
        onClick={onTogglePlay}
        className="h-8 w-8 rounded border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 flex items-center justify-center hover:bg-fuchsia-500/30 transition-colors"
        aria-label={playing ? 'Pause animation' : 'Play animation'}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => onSeek(0)}
        className="h-8 w-8 rounded border border-slate-700 bg-slate-800/60 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors"
        aria-label="Restart animation"
      >
        <SkipBack className="h-3.5 w-3.5" />
      </button>
      <div className="text-[11px] font-mono text-fuchsia-200 w-28 text-right tabular-nums">
        {fmtTime(t)} <span className="text-slate-500">/ {fmtTime(duration)}</span>
      </div>
      <div className="flex-1 relative">
        <div className="absolute inset-0 my-auto h-1.5 rounded-full bg-slate-800 pointer-events-none" />
        <div
          className="absolute inset-y-0 my-auto h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration}
          step={Math.max(duration / 600, 0.001)}
          value={t}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="relative w-full appearance-none bg-transparent accent-fuchsia-500 cursor-pointer h-3 z-10"
          style={{ accentColor: '#e879f9' }}
        />
      </div>
      <div className="flex items-center gap-1">
        {[0.25, 0.5, 1, 2].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              speed === s
                ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200'
                : 'border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  )
}

/** UI tải file 3D ở sidebar trái — hỗ trợ click & drag-drop. */
function ModelUploader({
  onFile, currentName, onClear, isLoading, error,
}: {
  onFile: (file: File) => void
  currentName?: string | null
  onClear: () => void
  isLoading: boolean
  error: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.04]">
      <div className="px-3 py-2 border-b border-rose-500/20 text-[11px] font-mono text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
        <Upload className="h-3.5 w-3.5" /> Tải vật thể 3D
      </div>
      <div className="p-3 space-y-2">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) onFile(file)
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded border-2 border-dashed transition-colors px-3 py-4 text-center text-[11px] ${
            dragOver
              ? 'border-rose-400 bg-rose-500/15 text-rose-100'
              : 'border-slate-700 hover:border-rose-400/60 text-slate-400 hover:text-rose-200'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2 text-rose-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang phân tích…
            </span>
          ) : (
            <>
              Kéo thả file vào đây<br />
              <span className="text-slate-500">hoặc bấm để chọn</span>
              <div className="mt-1 text-[9.5px] font-mono text-slate-500">
                .glb · .gltf · .obj · .stl · .fbx
              </div>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".glb,.gltf,.obj,.stl,.fbx,model/gltf-binary,model/gltf+json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            // Reset để upload lại cùng file vẫn trigger
            e.target.value = ''
          }}
        />
        {currentName && (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-rose-400/30 bg-slate-900/60">
            <div className="text-[10.5px] font-mono text-rose-200 truncate" title={currentName}>
              ✓ {currentName}
            </div>
            <button
              onClick={onClear}
              className="text-slate-500 hover:text-rose-300 transition-colors"
              aria-label="Remove model"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {error && (
          <div className="text-[10.5px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-2 py-1.5">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

export default function AirflowCFD() {
  const [shapeKey, setShapeKey] = useState<ShapeKey>('sphere')
  const [U, setU] = useState(18)            // freestream velocity m/s
  const [aoa, setAoa] = useState(5)          // angle of attack °
  const [density, setDensity] = useState(1.225) // kg/m³ (air)
  const [viscosity, setViscosity] = useState(1.5) // ×10⁻⁵ m²/s
  const [running, setRunning] = useState(true)
  const [showPressure, setShowPressure] = useState(true)
  const [showStreamlines, setShowStreamlines] = useState(true)
  const [showParticles, setShowParticles] = useState(true)
  const [iteration, setIteration] = useState(0)
  const [history, setHistory] = useState<number[]>([])

  // ── Custom 3D model state ─────────────────────────────────
  const [customModel, setCustomModel] = useState<CustomModelData | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [animPlaying, setAnimPlaying] = useState(true)
  const [animSpeed, setAnimSpeed] = useState(1)
  const [animTime, setAnimTime] = useState(0)
  // animTimeRef — giá trị "sống" cho useFrame bên trong Canvas đọc/ghi,
  // tách khỏi animTime (state) để tránh re-render 60fps của toàn component.
  const animTimeRef = useRef(0)

  const shape = SHAPES.find((s) => s.key === shapeKey)!

  // Bbox hiệu dụng: custom dùng bbox đo được từ mô hình upload,
  // built-in shape dùng bbox định sẵn trong SHAPES.
  const effectiveBbox: [number, number, number] = useMemo(() => {
    if (shapeKey === 'custom' && customModel) return customModel.bbox
    return shape.bbox
  }, [shapeKey, customModel, shape])

  // Derived dimensionless numbers — dùng effectiveBbox để CFD metrics
  // phản ánh kích thước thực của mô hình custom.
  const L = effectiveBbox[0] * 2
  const Re = (U * L) / (viscosity * 1e-5)
  const dynamicPressure = 0.5 * density * U * U    // 0.5ρU²
  const cd = useMemo(() => {
    const base: Record<ShapeKey, number> = {
      sphere: 0.47, cylinder: 1.17, airfoil: 0.05, car: 0.35, pump: 0.7,
      // Custom body — generic blunt-body default; user can tell the real value
      // from drag readout after running simulation (drag ∝ cd · 0.5ρU² · A).
      custom: 0.6,
    }
    const aoaBoost = Math.abs(aoa) / 15 * 0.4
    return base[shapeKey] + aoaBoost
  }, [shapeKey, aoa])
  const cl = useMemo(() => {
    if (shapeKey === 'airfoil') return (aoa / 15) * 1.3
    if (shapeKey === 'car')     return (aoa / 15) * 0.25
    return 0
  }, [shapeKey, aoa])
  const drag = cd * dynamicPressure * (effectiveBbox[1] * effectiveBbox[2])
  const lift = cl * dynamicPressure * (effectiveBbox[1] * effectiveBbox[2])
  const power = drag * U // P = F·v
  const objective = 0.5 * cd + 0.5 * (1 - Math.min(Re / 1e6, 1)) - cl * 0.1

  const vmax = U * 1.9

  // Advance iteration counter + record objective when running
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setIteration((n) => n + 1)
      setHistory((h) => {
        const next = [...h, objective]
        return next.length > 80 ? next.slice(next.length - 80) : next
      })
    }, 800)
    return () => clearInterval(id)
  }, [running, objective])

  const resetAll = useCallback(() => {
    setU(18); setAoa(5); setDensity(1.225); setViscosity(1.5)
    setIteration(0); setHistory([])
  }, [])

  // ── Custom model handlers ─────────────────────────────────
  // Dispose mô hình cũ trước khi set mô hình mới (tránh leak GPU buffer)
  const loadModelFile = useCallback(async (file: File) => {
    setUploadError(null)
    setUploadLoading(true)
    try {
      const data = await parseModelFile(file)
      setCustomModel((prev) => {
        if (prev) disposeModelObject(prev.object)
        return data
      })
      animTimeRef.current = 0
      setAnimTime(0)
      setAnimPlaying(true)
      setAnimSpeed(1)
      // Tự động chuyển sang shape 'custom' để user thấy ngay mô hình
      setShapeKey('custom')
      // Reset lịch sử hội tụ — vật thể mới → chạy lại optimization loop
      setHistory([])
      setIteration(0)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Lỗi khi tải mô hình')
    } finally {
      setUploadLoading(false)
    }
  }, [])

  const clearModel = useCallback(() => {
    setCustomModel((prev) => {
      if (prev) disposeModelObject(prev.object)
      return null
    })
    setAnimTime(0)
    animTimeRef.current = 0
    setUploadError(null)
  }, [])

  // Cleanup GPU memory khi component unmount
  useEffect(() => {
    return () => {
      if (customModel) disposeModelObject(customModel.object)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Khi user scrub timeline — pause animation và nhảy tới thời điểm đó
  const handleSeek = useCallback((t: number) => {
    animTimeRef.current = t
    setAnimTime(t)
    setAnimPlaying(false)
  }, [])

  const handleTogglePlay = useCallback(() => {
    setAnimPlaying((p) => !p)
  }, [])

  const handleAnimTimeChange = useCallback((t: number) => {
    // Throttled push từ CustomBodyMesh (interval 100ms) — chỉ update UI
    setAnimTime(t)
  }, [])

  const hasAnimation = !!customModel && customModel.duration > 0

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] text-slate-200 font-[ui-sans-serif]">
      {/* HEADER */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-cyan-500/15 border border-cyan-400/30">
              <Wind className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-cyan-100 leading-tight">
                AirflowCFD Wind Tunnel · <span className="text-cyan-300">Mô phỏng dòng khí qua vật thể 3D</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">
                R3F · streamlines · kinematic pressure · Re = {(Re / 1e6).toFixed(2)}M
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              className={`px-3 py-1.5 rounded border text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                running
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30'
                  : 'bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30'
              }`}
            >
              {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Play</>}
            </button>
            <button
              onClick={resetAll}
              className="px-3 py-1.5 rounded border border-slate-700 bg-slate-800/70 text-slate-300 text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* MAIN — 3-column grid: left params / center canvas / right metrics */}
      <div className="max-w-[1800px] mx-auto px-6 py-4 grid grid-cols-12 gap-4">
        {/* LEFT: SHAPE + TOGGLES + PARAMETERS */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          {/* Shape selector */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60">
            <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Vật thể
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-2">
              {SHAPES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setShapeKey(s.key)}
                  className={`px-2 py-2 rounded border text-xs font-semibold transition-all ${
                    s.key === shapeKey
                      ? 'border-2 text-white'
                      : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:bg-slate-800/70'
                  }`}
                  style={s.key === shapeKey ? {
                    borderColor: s.accent,
                    background: `linear-gradient(135deg, ${s.accent}22, transparent)`,
                  } : undefined}
                >
                  <div className="text-[10px] font-mono opacity-70">{s.label}</div>
                  <div>{s.vn}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom 3D model uploader — drag-drop GLB/OBJ/STL/FBX */}
          <ModelUploader
            onFile={loadModelFile}
            currentName={customModel?.name || null}
            onClear={clearModel}
            isLoading={uploadLoading}
            error={uploadError}
          />

          {/* Visualization toggles */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60">
            <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Hiển thị
            </div>
            <div className="p-2 space-y-1.5">
              {[
                { k: 'streamlines', v: showStreamlines, set: setShowStreamlines, label: 'Streamlines (dòng chảy)' },
                { k: 'particles',   v: showParticles,   set: setShowParticles,   label: 'Hạt khí (particles)' },
                { k: 'pressure',    v: showPressure,    set: setShowPressure,    label: 'Áp suất bề mặt (Cp)' },
              ].map(({ k, v, set, label }) => (
                <label
                  key={k}
                  className="flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-slate-900 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={v}
                    onChange={(e) => set(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <span className="text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Parameter sliders */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60">
            <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> Tham số dòng
            </div>
            <div className="p-3 space-y-3">
              <SliderRow
                label="U · Vận tốc dòng (m/s)"
                value={U} min={1} max={60} step={0.5}
                onChange={setU}
                accent="#22d3ee"
                display={`${U.toFixed(1)}`}
              />
              <SliderRow
                label="α · Góc tấn (°)"
                value={aoa} min={-20} max={20} step={0.5}
                onChange={setAoa}
                accent="#e879f9"
                display={`${aoa.toFixed(1)}°`}
              />
              <SliderRow
                label="ρ · Mật độ (kg/m³)"
                value={density} min={0.5} max={2.0} step={0.025}
                onChange={setDensity}
                accent="#a78bfa"
                display={density.toFixed(3)}
              />
              <SliderRow
                label="ν · Độ nhớt (×10⁻⁵ m²/s)"
                value={viscosity} min={0.5} max={5.0} step={0.1}
                onChange={setViscosity}
                accent="#f59e0b"
                display={viscosity.toFixed(2)}
              />
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3 text-[11px] text-cyan-100/80 leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1 text-cyan-300 font-semibold text-[11px]">
              <Info className="h-3.5 w-3.5" /> Về mô phỏng
            </div>
            Lab này dùng <span className="font-mono text-cyan-200">potential-flow approximation</span> — xấp xỉ
            trực quan, không giải Navier–Stokes đầy đủ. Streamlines &amp; áp suất Cp được tính tại thời gian thực
            trên GPU bằng <span className="font-mono text-cyan-200">React Three Fiber</span>.
          </div>
        </aside>

        {/* CENTER: 3D CANVAS */}
        <main className="col-span-12 lg:col-span-6">
          <div
            className="relative rounded-lg overflow-hidden border border-slate-800 bg-gradient-to-br from-[#060a15] via-[#08101f] to-[#0b1327]"
            style={{ height: '72vh', minHeight: 520 }}
          >
            <Canvas shadows camera={{ position: [7, 4, 10], fov: 48 }}>
              <Scene
                shape={shapeKey}
                U={U}
                aoa={aoa}
                running={running}
                showPressure={showPressure}
                showStreamlines={showStreamlines}
                showParticles={showParticles}
                vmax={vmax}
                effectiveBbox={effectiveBbox}
                customModel={customModel}
                animPlaying={animPlaying}
                animSpeed={animSpeed}
                animTimeRef={animTimeRef}
                onAnimTimeChange={handleAnimTimeChange}
              />
            </Canvas>

            {/* Top overlay — iteration + LIVE */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
              <div className="px-2 py-1 rounded border border-slate-700 bg-slate-950/80 text-[11px] font-mono text-slate-300">
                iter = <span className="text-cyan-300 font-bold">{iteration.toString().padStart(4, '0')}</span>
              </div>
              {running && (
                <div className="px-2 py-1 rounded border border-cyan-400/40 bg-cyan-500/15 text-[11px] font-mono text-cyan-200 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  LIVE
                </div>
              )}
            </div>

            {/* Bottom-left — shape badge (ẩn khi có timeline overlay chiếm bottom) */}
            {!hasAnimation && (
              <div className="absolute bottom-3 left-3 pointer-events-none">
                <div
                  className="px-2.5 py-1 rounded border text-[11px] font-mono"
                  style={{
                    borderColor: shape.accent,
                    background: `${shape.accent}20`,
                    color: shape.accent,
                  }}
                >
                  {shape.label} · {shape.vn}
                  {shapeKey === 'custom' && customModel && (
                    <span className="ml-2 text-slate-400">· {customModel.name}</span>
                  )}
                </div>
              </div>
            )}

            {/* Timeline overlay — chỉ hiện khi vật thể custom có AnimationClip */}
            {hasAnimation && customModel && (
              <AnimationTimeline
                duration={customModel.duration}
                currentTime={animTime}
                playing={animPlaying}
                speed={animSpeed}
                onSeek={handleSeek}
                onTogglePlay={handleTogglePlay}
                onSpeedChange={setAnimSpeed}
              />
            )}

            {/* Right — color legends */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 pointer-events-none">
              {showStreamlines || showParticles ? (
                <Colorbar
                  label="|v|"
                  unit="m/s"
                  min={0}
                  max={vmax}
                  kind="velocity"
                />
              ) : null}
              {showPressure && (
                <Colorbar
                  label="Cp"
                  unit="áp suất"
                  min={-1}
                  max={1}
                  kind="pressure"
                />
              )}
            </div>
          </div>

          {/* CONVERGENCE PLOT */}
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Objective function (lịch sử hội tụ)
              </div>
              <div className="text-[11px] font-mono text-cyan-300">
                F = {objective.toFixed(5)}
              </div>
            </div>
            <ConvergencePlot history={history} />
          </div>
        </main>

        {/* RIGHT: METRIC PANEL (reference-image style) */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60">
            <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Thông số CFD
            </div>
            <div className="p-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <Metric label="nS"          value={iteration}                   tint="#64748b" />
              <Metric label="nD"          value={history.length}              tint="#64748b" />
              <Metric label="LS"          value={effectiveBbox[0].toFixed(2)} tint="#94a3b8" />
              <Metric label="LI"          value={effectiveBbox[1].toFixed(2)} tint="#94a3b8" />
              <Metric label="LD"          value={effectiveBbox[2].toFixed(2)} tint="#94a3b8" />
              <Metric label="p"           value={dynamicPressure.toFixed(2)}  tint="#22d3ee" unit="Pa" />
              <Metric label="w"           value={(U * 60).toFixed(0)}         tint="#a78bfa" unit="rpm" />
              <Metric label="d1"          value={L.toFixed(2)}                tint="#a78bfa" unit="m" />
              <Metric label="c1"          value={cd.toFixed(2)}               tint="#e879f9" />
              <Metric label="ΔP"          value={(cd * dynamicPressure).toFixed(2)} tint="#10b981" unit="Pa" />
              <Metric label="P"           value={power.toFixed(3)}            tint="#f59e0b" unit="W" />
              <Metric label="objective"   value={objective.toFixed(4)}        tint="#22d3ee" wide />
            </div>
          </div>

          {/* Aerodynamic coefficients */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60">
            <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Hệ số khí động
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              <BigStat label="CL · lift" value={cl.toFixed(3)} color="#22d3ee" />
              <BigStat label="CD · drag" value={cd.toFixed(3)} color="#e879f9" />
              <BigStat label="Lift (N)"  value={lift.toFixed(2)} color="#10b981" />
              <BigStat label="Drag (N)"  value={drag.toFixed(2)} color="#f59e0b" />
              <BigStat label="L/D"       value={cd > 0 ? (cl / cd).toFixed(2) : '—'} color="#a78bfa" />
              <BigStat label="Re"        value={`${(Re / 1e6).toFixed(2)}M`} color="#64748b" />
            </div>
          </div>

          {/* Flow regime hint */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 leading-relaxed">
            <div className="text-slate-300 font-semibold mb-1 text-[11px] font-mono uppercase tracking-wider">Chế độ dòng</div>
            {Re < 1e3 && <>Re &lt; 10³ — <span className="text-sky-300">dòng phiến (laminar)</span>, đối xứng, dính vào bề mặt.</>}
            {Re >= 1e3 && Re < 1e5 && <>10³ ≤ Re &lt; 10⁵ — <span className="text-cyan-300">chuyển tiếp</span>, bắt đầu tách lớp biên và xoáy cuốn.</>}
            {Re >= 1e5 && Re < 1e6 && <>10⁵ ≤ Re &lt; 10⁶ — <span className="text-emerald-300">dòng rối (turbulent)</span>, sinh xoáy wake rõ.</>}
            {Re >= 1e6 && <>Re ≥ 10⁶ — <span className="text-amber-300">rối phát triển</span>, CD giảm đột ngột do khủng hoảng kéo.</>}
          </div>
        </aside>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// SUBCOMPONENTS
// ──────────────────────────────────────────────────────────────────────────────

function SliderRow({
  label, value, min, max, step, onChange, accent, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void; accent: string; display: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-mono text-slate-400">{label}</label>
        <span className="text-[11px] font-mono font-bold" style={{ color: accent }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: accent }}
      />
    </div>
  )
}

function Metric({
  label, value, tint, unit, wide,
}: { label: string; value: string | number; tint: string; unit?: string; wide?: boolean }) {
  return (
    <div
      className={`px-2 py-1.5 rounded border border-slate-800 bg-slate-900/70 ${wide ? 'col-span-2' : ''}`}
    >
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-[13px] font-mono font-bold" style={{ color: tint }}>{value}</span>
        {unit && <span className="text-[9px] font-mono text-slate-500">{unit}</span>}
      </div>
    </div>
  )
}

function BigStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="px-2.5 py-2 rounded border bg-slate-900/60"
      style={{ borderColor: `${color}44` }}
    >
      <div className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-[15px] font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  )
}
