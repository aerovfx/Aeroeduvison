/**
 * Eclipse Simulations — Nhật thực & Nguyệt thực
 *
 * User: ảnh ref (vùng tối/nửa tối + 9-photo grid totality)
 * "cập nhật Nhật thực cho chính xác góc nhìn từ Trái đất, nếu người dùng
 * muốn thì zoom tổng thể để nhìn vị trí từ hệ mặt trời. Làm tương tự
 * với Nguyệt thực"
 *
 * 2 view modes mỗi sim:
 *   - 🌍 Quan sát từ Trái Đất — close-up góc nhìn observer
 *   - 🌌 Tổng thể hệ Mặt Trời — wide view với shadow cones + labels
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

const BG = '#000005'
const canvasStyle: React.CSSProperties = { width: '100%', height: '100%' }

type ViewMode = 'earth' | 'system'

// ─────────────────────────────────────────────────────────────
// Shared UI controls
// ─────────────────────────────────────────────────────────────
interface SimControlsProps {
  playing: boolean
  speed: number
  onToggle: () => void
  onSpeed: (s: number) => void
  onReset: () => void
  phase: string
  phaseColor?: string
}

function SimControls({ playing, speed, onToggle, onSpeed, onReset, phase, phaseColor = '#facc15' }: SimControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 p-3 pointer-events-none select-none">
      <div className="self-center px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm border"
        style={{ color: phaseColor, borderColor: `${phaseColor}40`, background: `${phaseColor}15`, pointerEvents: 'none' }}>
        {phase}
      </div>
      <div className="flex items-center gap-2 justify-center" style={{ pointerEvents: 'all' }}>
        <button onClick={onToggle}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors bg-white/10 hover:bg-white/20 text-white border border-white/10">
          {playing ? '⏸ Tạm dừng' : '▶ Phát'}
        </button>
        <div className="flex gap-1 items-center bg-white/5 rounded-lg p-1 border border-white/10">
          {[0.5, 1, 2, 5].map(s => (
            <button key={s} onClick={() => onSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-bold ${speed === s ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'}`}>
              {s}×
            </button>
          ))}
        </div>
        <button onClick={onReset}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10">
          ↻ Reset
        </button>
      </div>
    </div>
  )
}

function ViewModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="absolute top-3 left-3 z-10 flex gap-1 p-1 rounded-lg bg-black/60 backdrop-blur border border-white/10">
      <button onClick={() => onChange('earth')}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
          mode === 'earth' ? 'bg-cyan-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
        }`}>
        🌍 Từ Trái Đất
      </button>
      <button onClick={() => onChange('system')}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
          mode === 'system' ? 'bg-purple-500 text-white shadow-lg' : 'text-white/60 hover:text-white'
        }`}>
        🌌 Tổng thể
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SOLAR ECLIPSE — Earth View (chính xác góc nhìn observer)
// ─────────────────────────────────────────────────────────────

/** Sun disk + corona — góc nhìn từ Trái Đất */
function SunFromEarth({ coverFraction }: { coverFraction: number }) {
  const isTotality = coverFraction > 0.98
  const isPartial = coverFraction > 0.05 && coverFraction < 0.98
  const sunVisible = Math.max(0.05, 1 - coverFraction * 0.95)

  return (
    <group>
      {/* Sun photosphere — bright yellow disk */}
      <mesh>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshBasicMaterial color="#fff5a0" toneMapped={false} />
      </mesh>
      {/* Inner halo (chromosphere) */}
      <mesh>
        <sphereGeometry args={[1.7, 64, 64]} />
        <meshBasicMaterial color="#ffd000" transparent opacity={sunVisible * 0.7} />
      </mesh>
      {/* Corona — chỉ visible khi gần totality */}
      {coverFraction > 0.85 && (
        <>
          {/* Inner corona ring */}
          <mesh>
            <ringGeometry args={[1.62, 2.0, 128]} />
            <meshBasicMaterial color="#fff8e0"
              transparent opacity={Math.min(1, (coverFraction - 0.85) * 6.7) * 0.95}
              side={THREE.DoubleSide} />
          </mesh>
          {/* Outer corona — wispy */}
          <mesh>
            <ringGeometry args={[2.0, 3.2, 128]} />
            <meshBasicMaterial color="#fffacd"
              transparent opacity={Math.min(1, (coverFraction - 0.85) * 6.7) * 0.6}
              side={THREE.DoubleSide} />
          </mesh>
          {/* Far corona streamers */}
          <mesh>
            <ringGeometry args={[3.2, 5.0, 64]} />
            <meshBasicMaterial color="#ffeaa7"
              transparent opacity={Math.min(1, (coverFraction - 0.9) * 10) * 0.3}
              side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      {/* Diamond ring effect — at edges of totality (Bailey's beads) */}
      {coverFraction > 0.95 && coverFraction < 0.99 && (
        <mesh position={[
          Math.cos((coverFraction - 0.97) * 30) * 1.65,
          Math.sin((coverFraction - 0.97) * 30) * 1.65,
          0.05,
        ]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      )}
      {/* Ambient glow */}
      <mesh>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={sunVisible * 0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

/** Moon disk passing in front of sun */
function MoonDiskTransit({ progress }: { progress: number }) {
  const moonRef = useRef<THREE.Mesh>(null)
  // progress 0 → 1: moon from -3 to +3 across sun face
  useFrame(() => {
    if (!moonRef.current) return
    const x = (progress - 0.5) * 6  // -3 → +3
    moonRef.current.position.set(x, 0, 0.15)
  })
  return (
    <mesh ref={moonRef}>
      <sphereGeometry args={[1.6, 64, 64]} />
      {/* Black disk silhouette — angular size = sun ratio 1:1 (eclipse condition) */}
      <meshBasicMaterial color="#000000" />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────
// SOLAR ECLIPSE — System View (tổng thể hệ Mặt Trời)
// ─────────────────────────────────────────────────────────────

function SolarSystemView({ progress }: { progress: number }) {
  // Layout (compressed scale): Sun(left, x=-12) — Moon(middle, x ~ -2) — Earth(right, x=4)
  // Moon orbits between them on the ecliptic
  const moonRef = useRef<THREE.Mesh>(null)
  const umbraRef = useRef<THREE.Mesh>(null)
  const penumbraRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!moonRef.current) return
    // progress 0→1: moon transits from off-axis (above) to on-axis (eclipse) to off-axis (below)
    const angle = (progress - 0.5) * Math.PI * 0.5 // -π/4 → +π/4
    const moonOrbitR = 2.5
    const moonX = -2 + Math.cos(angle) * 0  // stays at x=-2 (between sun and earth)
    const moonY = Math.sin(angle) * moonOrbitR
    moonRef.current.position.set(moonX, moonY, 0)
    // Shadow cones follow moon
    if (umbraRef.current) umbraRef.current.position.set(moonX + 3, moonY * 0.5, 0)
    if (penumbraRef.current) penumbraRef.current.position.set(moonX + 3, moonY * 0.5, 0)
  })

  return (
    <>
      {/* Sun (large, left) */}
      <group position={[-12, 0, 0]}>
        <mesh>
          <sphereGeometry args={[3, 48, 48]} />
          <meshBasicMaterial color="#fff5a0" toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[3.6, 32, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} side={THREE.BackSide} />
        </mesh>
        <pointLight intensity={4} color="#fff7e6" distance={40} />
        <Html position={[0, -4, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="text-xs font-bold text-yellow-300 whitespace-nowrap"
            style={{ textShadow: '0 0 4px #000' }}>☀️ MẶT TRỜI</div>
        </Html>
      </group>

      {/* Earth (right) */}
      <group position={[4, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.9, 48, 48]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#0ea5e9" emissiveIntensity={0.15} roughness={0.7} />
        </mesh>
        <Html position={[0, -1.5, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="text-xs font-bold text-blue-300 whitespace-nowrap"
            style={{ textShadow: '0 0 4px #000' }}>🌍 TRÁI ĐẤT</div>
        </Html>
      </group>

      {/* Moon (transits between sun + earth) */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.9} />
      </mesh>
      <Html position={[-2, -0.8, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="text-xs font-bold text-slate-300 whitespace-nowrap"
          style={{ textShadow: '0 0 4px #000' }}>🌑 MẶT TRĂNG</div>
      </Html>

      {/* Umbra shadow cone (umbra = bóng tối hoàn toàn) — narrow */}
      <mesh ref={umbraRef} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.25, 6, 32, 1, true]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Penumbra shadow cone (penumbra = vùng nửa tối) — wider */}
      <mesh ref={penumbraRef} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.9, 6, 32, 1, true]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Labels for shadow zones */}
      <Html position={[1.5, 1.8, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] text-slate-400 whitespace-nowrap"
          style={{ textShadow: '0 0 4px #000' }}>← Vùng nửa tối (Penumbra)</div>
      </Html>
      <Html position={[2.5, -0.3, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] text-amber-400 whitespace-nowrap"
          style={{ textShadow: '0 0 4px #000' }}>← Vùng tối (Umbra)</div>
      </Html>

      {/* Earth orbit hint (dashed circle) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[-12, 0, 0]}>
        <ringGeometry args={[15.95, 16.05, 128]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// SOLAR ECLIPSE — Main wrapper với view mode toggle
// ─────────────────────────────────────────────────────────────

function CameraSwitch({ mode }: { mode: ViewMode }) {
  const { camera } = useThree()
  useEffect(() => {
    if (mode === 'earth') {
      camera.position.set(0, 0, 8)
      camera.lookAt(0, 0, 0)
    } else {
      camera.position.set(0, 4, 18)
      camera.lookAt(-4, 0, 0)
    }
  }, [mode, camera])
  return null
}

function SolarEclipseScene({
  mode, playingRef, speedRef, progressRef,
}: {
  mode: ViewMode
  playingRef: React.MutableRefObject<boolean>
  speedRef: React.MutableRefObject<number>
  progressRef: React.MutableRefObject<number>
}) {
  useFrame((_, delta) => {
    if (!playingRef.current) return
    progressRef.current += delta * 0.15 * speedRef.current
    if (progressRef.current > 1.2) progressRef.current = -0.2
  })

  // Cover fraction for Earth view (1 - distance from center)
  const progress = progressRef.current
  const coverFraction = Math.max(0, 1 - Math.abs(progress - 0.5) * 2)

  return (
    <>
      <color attach="background" args={[BG]} />
      <Stars radius={100} depth={50} count={mode === 'earth' ? 1200 : 2500} factor={3} saturation={0} fade />
      <ambientLight intensity={0.06} />

      <CameraSwitch mode={mode} />

      {mode === 'earth' ? (
        <>
          <SunFromEarth coverFraction={coverFraction} />
          <MoonDiskTransit progress={progress} />
        </>
      ) : (
        <SolarSystemView progress={progress} />
      )}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={mode === 'earth' ? 4 : 8}
        maxDistance={mode === 'earth' ? 16 : 35}
        target={mode === 'earth' ? [0, 0, 0] : [-4, 0, 0]}
      />
    </>
  )
}

export function SolarEclipseSim() {
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [mode, setMode] = useState<ViewMode>('earth')
  const [phase, setPhase] = useState('Mặt Trời sáng — chưa bắt đầu')
  const [phaseColor, setPhaseColor] = useState('#facc15')
  const [, setTick] = useState(0)

  const playingRef = useRef(true)
  const speedRef = useRef(1)
  const progressRef = useRef(0)

  const phaseInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (phaseInterval.current) return
    phaseInterval.current = setInterval(() => {
      const p = progressRef.current
      const cover = Math.max(0, 1 - Math.abs(p - 0.5) * 2)
      if (cover >= 0.98) {
        setPhase('🌑 Toàn phần (Totality) — Corona hiện rõ')
        setPhaseColor('#ff9900')
      } else if (cover >= 0.75) {
        setPhase('💎 Nhẫn kim cương (Diamond Ring)')
        setPhaseColor('#fcd34d')
      } else if (cover >= 0.3) {
        setPhase('🌗 Bán phần (Partial Eclipse)')
        setPhaseColor('#facc15')
      } else if (cover > 0.05) {
        setPhase('🌖 Bắt đầu / kết thúc che khuất')
        setPhaseColor('#fbbf24')
      } else {
        setPhase('☀️ Mặt Trời tròn — chưa eclipse')
        setPhaseColor('#fde68a')
      }
      setTick(t => t + 1)
    }, 200)
    return () => {
      if (phaseInterval.current) {
        clearInterval(phaseInterval.current)
        phaseInterval.current = null
      }
    }
  }, [])

  const toggle = () => { playingRef.current = !playingRef.current; setPlaying(playingRef.current) }
  const setSpeedVal = (s: number) => { speedRef.current = s; setSpeed(s) }
  const reset = () => { progressRef.current = 0 }

  return (
    <div className="relative w-full h-full">
      <ViewModeToggle mode={mode} onChange={setMode} />

      <Canvas style={canvasStyle} camera={{ position: [0, 0, 8], fov: 40 }}>
        <SolarEclipseScene
          mode={mode}
          playingRef={playingRef}
          speedRef={speedRef}
          progressRef={progressRef}
        />
      </Canvas>

      {/* Educational labels */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 text-right text-[11px] text-white/40 pointer-events-none select-none">
        {mode === 'earth' ? (
          <>
            <span>👁 Góc nhìn từ Trái Đất</span>
            <span>Mặt Trăng che Mặt Trời</span>
            <span>Corona = vành sáng quanh đĩa đen</span>
          </>
        ) : (
          <>
            <span>🌌 Vị trí 3 thiên thể</span>
            <span>Mặt Trăng đi vào giữa</span>
            <span>Bóng đổ xuống Trái Đất</span>
          </>
        )}
      </div>

      <SimControls
        playing={playing}
        speed={speed}
        onToggle={toggle}
        onSpeed={setSpeedVal}
        onReset={reset}
        phase={phase}
        phaseColor={phaseColor}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LUNAR ECLIPSE — Earth View (close-up moon entering shadow)
// ─────────────────────────────────────────────────────────────

function MoonFromEarth({ progress }: { progress: number }) {
  // progress 0→1: moon enters Earth's shadow gradually
  // Real lunar eclipse: moon enters penumbra → umbra → blood moon → exits
  const moonRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(() => {
    if (!moonRef.current || !matRef.current) return
    // Moon stays centered, just changes color/shadow
    moonRef.current.position.set(0, 0, 0)

    // Color transition based on progress (eclipse depth)
    const depth = Math.max(0, 1 - Math.abs(progress - 0.5) * 2)
    let color = new THREE.Color('#e2e8f0')  // bright full moon
    if (depth > 0.85) {
      // Deep umbra — blood moon (red-orange)
      color = new THREE.Color('#7f1d1d').lerp(new THREE.Color('#dc2626'), (depth - 0.85) * 6.7)
    } else if (depth > 0.4) {
      // Partial — gradient from white to dark red
      const t = (depth - 0.4) / 0.45
      color = new THREE.Color('#e2e8f0').lerp(new THREE.Color('#7f1d1d'), t)
    } else if (depth > 0.1) {
      // Penumbra — slight darkening
      const t = (depth - 0.1) / 0.3
      color = new THREE.Color('#e2e8f0').lerp(new THREE.Color('#94a3b8'), t * 0.4)
    }
    matRef.current.color.copy(color)
  })

  return (
    <group>
      {/* Background dark sky */}
      <mesh position={[0, 0, -5]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial color="#000003" />
      </mesh>

      {/* Moon disk (close-up) */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshBasicMaterial ref={matRef} color="#e2e8f0" />
      </mesh>

      {/* Subtle craters texture (decorative spots) */}
      {[[0.5, 0.3], [-0.4, 0.6], [0.7, -0.5], [-0.6, -0.4], [0.1, 0.8]].map(([x, y], i) => (
        <mesh key={i} position={[x * 1.5, y * 1.5, 1]}>
          <circleGeometry args={[0.12, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.18} />
        </mesh>
      ))}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// LUNAR ECLIPSE — System View (Sun—Earth—Moon alignment + shadow)
// ─────────────────────────────────────────────────────────────

function LunarSystemView({ progress }: { progress: number }) {
  const moonRef = useRef<THREE.Mesh>(null)
  const moonMatRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    if (!moonRef.current || !moonMatRef.current) return
    // Layout: Sun(-15) — Earth(0) — Moon(orbits around Earth at r=4)
    // progress 0→1: moon orbits from outside Earth's shadow (right) → into shadow (left, x=-4 = opposite of sun)
    const angle = progress * Math.PI * 2
    const orbitR = 4
    const x = Math.cos(angle) * orbitR
    const y = Math.sin(angle) * 0.5
    const z = Math.sin(angle) * orbitR
    moonRef.current.position.set(x, y, z)

    // Eclipse condition: moon at x < 0 AND |y| < earth shadow radius at that distance
    // Simplified: when angle close to PI (180°), moon is opposite of sun = in shadow
    const distFromOpposite = Math.min(Math.abs(angle - Math.PI), Math.abs(angle - Math.PI - 2 * Math.PI))
    let moonColor = new THREE.Color('#e2e8f0')
    let emissiveColor = new THREE.Color('#000000')
    let emissiveInt = 0
    if (distFromOpposite < 0.3) {
      moonColor = new THREE.Color('#7f1d1d')
      emissiveColor = new THREE.Color('#ef4444')
      emissiveInt = 0.5
    } else if (distFromOpposite < 0.7) {
      const t = 1 - (distFromOpposite - 0.3) / 0.4
      moonColor = new THREE.Color('#e2e8f0').lerp(new THREE.Color('#7f1d1d'), t)
    }
    moonMatRef.current.color.copy(moonColor)
    moonMatRef.current.emissive.copy(emissiveColor)
    moonMatRef.current.emissiveIntensity = emissiveInt
  })

  return (
    <>
      {/* Sun (far left) */}
      <group position={[-15, 0, 0]}>
        <mesh>
          <sphereGeometry args={[2.5, 48, 48]} />
          <meshBasicMaterial color="#fff5a0" toneMapped={false} />
        </mesh>
        <pointLight intensity={5} color="#fff7e6" distance={50} />
        <Html position={[0, -3.5, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="text-xs font-bold text-yellow-300 whitespace-nowrap"
            style={{ textShadow: '0 0 4px #000' }}>☀️ MẶT TRỜI</div>
        </Html>
      </group>

      {/* Earth (center) */}
      <group position={[0, 0, 0]}>
        <mesh>
          <sphereGeometry args={[1.4, 48, 48]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#0ea5e9" emissiveIntensity={0.15} roughness={0.7} />
        </mesh>
        <Html position={[0, -2.1, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
          <div className="text-xs font-bold text-blue-300 whitespace-nowrap"
            style={{ textShadow: '0 0 4px #000' }}>🌍 TRÁI ĐẤT</div>
        </Html>
      </group>

      {/* Earth's penumbra shadow cone */}
      <mesh position={[5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[3.5, 10, 32, 1, true]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {/* Earth's umbra shadow cone — narrower, darker */}
      <mesh position={[4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[1.4, 8, 32, 1, true]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Moon orbiting */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial ref={moonMatRef} color="#e2e8f0" roughness={0.85} />
      </mesh>

      {/* Moon orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.95, 4.05, 128]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      {/* Shadow labels */}
      <Html position={[6.5, 1.8, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] text-slate-400 whitespace-nowrap"
          style={{ textShadow: '0 0 4px #000' }}>Vùng nửa tối (Penumbra)</div>
      </Html>
      <Html position={[5, -0.3, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] text-amber-400 whitespace-nowrap"
          style={{ textShadow: '0 0 4px #000' }}>Vùng tối (Umbra)</div>
      </Html>
      <Html position={[-4, 2, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] text-slate-300 whitespace-nowrap"
          style={{ textShadow: '0 0 4px #000' }}>🌑 Quỹ đạo Mặt Trăng</div>
      </Html>
    </>
  )
}

function LunarEclipseScene({
  mode, playingRef, speedRef, progressRef,
}: {
  mode: ViewMode
  playingRef: React.MutableRefObject<boolean>
  speedRef: React.MutableRefObject<number>
  progressRef: React.MutableRefObject<number>
}) {
  useFrame((_, delta) => {
    if (!playingRef.current) return
    progressRef.current += delta * 0.12 * speedRef.current
    if (progressRef.current > 1.2) progressRef.current = -0.2
  })

  const progress = progressRef.current

  return (
    <>
      <color attach="background" args={[BG]} />
      <Stars radius={120} depth={60} count={mode === 'earth' ? 800 : 2500} factor={2.5} saturation={0} fade />
      <ambientLight intensity={mode === 'earth' ? 0.5 : 0.04} />
      {mode === 'system' && <directionalLight position={[-20, 0, 0]} intensity={2.5} color="#fff7e6" />}

      <CameraSwitch mode={mode} />

      {mode === 'earth' ? (
        <MoonFromEarth progress={progress} />
      ) : (
        <LunarSystemView progress={progress} />
      )}

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={mode === 'earth' ? 4 : 8}
        maxDistance={mode === 'earth' ? 16 : 40}
        target={[0, 0, 0]}
      />
    </>
  )
}

export function LunarEclipseSim() {
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [mode, setMode] = useState<ViewMode>('earth')
  const [phase, setPhase] = useState('🌕 Trăng tròn — chưa bắt đầu')
  const [phaseColor, setPhaseColor] = useState('#e2e8f0')
  const [, setTick] = useState(0)

  const playingRef = useRef(true)
  const speedRef = useRef(1)
  const progressRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const p = progressRef.current
      const depth = Math.max(0, 1 - Math.abs(p - 0.5) * 2)
      if (depth >= 0.85) {
        setPhase('🔴 Blood Moon — Toàn phần')
        setPhaseColor('#dc2626')
      } else if (depth >= 0.5) {
        setPhase('🌘 Một phần (Partial Umbra)')
        setPhaseColor('#f97316')
      } else if (depth >= 0.15) {
        setPhase('🌗 Vào bán ảnh (Penumbra)')
        setPhaseColor('#94a3b8')
      } else {
        setPhase('🌕 Trăng tròn — chưa eclipse')
        setPhaseColor('#e2e8f0')
      }
      setTick(t => t + 1)
    }, 200)
    return () => clearInterval(id)
  }, [])

  const toggle = () => { playingRef.current = !playingRef.current; setPlaying(playingRef.current) }
  const setSpeedVal = (s: number) => { speedRef.current = s; setSpeed(s) }
  const reset = () => { progressRef.current = 0 }

  return (
    <div className="relative w-full h-full">
      <ViewModeToggle mode={mode} onChange={setMode} />

      <Canvas style={canvasStyle} camera={{ position: [0, 0, 8], fov: 45 }}>
        <LunarEclipseScene
          mode={mode}
          playingRef={playingRef}
          speedRef={speedRef}
          progressRef={progressRef}
        />
      </Canvas>

      <div className="absolute top-3 right-3 flex flex-col gap-1 text-right text-[11px] text-white/40 pointer-events-none select-none">
        {mode === 'earth' ? (
          <>
            <span>👁 Mặt Trăng nhìn từ Trái Đất</span>
            <span>Vào bóng → đỏ máu (Blood Moon)</span>
          </>
        ) : (
          <>
            <span>🌌 Mặt Trời — Trái Đất — Mặt Trăng</span>
            <span>Mặt Trăng vào shadow Trái Đất</span>
          </>
        )}
      </div>

      <SimControls
        playing={playing}
        speed={speed}
        onToggle={toggle}
        onSpeed={setSpeedVal}
        onReset={reset}
        phase={phase}
        phaseColor={phaseColor}
      />
    </div>
  )
}

// Named export map for r3f/index.ts
export const eclipseSimulations: Record<string, React.ComponentType> = {
  'solar-eclipse': SolarEclipseSim,
  'lunar-eclipse': LunarEclipseSim,
}
