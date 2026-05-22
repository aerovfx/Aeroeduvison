/**
 * Eclipse Simulations
 *
 * SolarEclipseSim — Nhật Thực (Solar Eclipse)
 *   Camera từ Trái Đất nhìn lên Mặt Trời.
 *   Mặt Trăng đi qua giữa — che dần, toàn phần (corona), rồi ra.
 *   Giai đoạn: Bán phần → Toàn phần → Bán phần.
 *
 * LunarEclipseSim — Nguyệt Thực (Lunar Eclipse)
 *   Trái Đất ở giữa, Mặt Trăng quỹ đạo đi vào bóng tối.
 *   Bán ảnh (penumbra) → Bóng tối hoàn toàn (umbra) → Blood Moon đỏ cam.
 *
 * Cả hai: Play/Pause, Speed (0.5x/1x/2x/5x), Reset + label giáo dục.
 */

import { useRef, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

const BG = '#000005'
const canvasStyle: React.CSSProperties = { width: '100%', height: '100%' }

// ─────────────────────────────────────────────────────────────
// Shared UI controls (Play/Pause, Speed, Reset)
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
      {/* Phase label */}
      <div
        className="self-center px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm border"
        style={{
          color: phaseColor,
          borderColor: `${phaseColor}40`,
          background: `${phaseColor}15`,
          pointerEvents: 'none',
        }}
      >
        {phase}
      </div>

      {/* Controls bar */}
      <div
        className="flex items-center gap-2 justify-center"
        style={{ pointerEvents: 'all' }}
      >
        <button
          onClick={onToggle}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: playing ? '#374151' : '#7c3aed', color: '#fff' }}
        >
          {playing ? '⏸ Dừng' : '▶ Chạy'}
        </button>

        {[0.5, 1, 2, 5].map(s => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: speed === s ? '#7c3aed' : '#1f2937',
              color: speed === s ? '#fff' : '#9ca3af',
              border: '1px solid #374151',
            }}
          >
            {s}x
          </button>
        ))}

        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-gray-700 transition-colors"
          style={{ background: '#111827' }}
        >
          ↺ Reset
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SOLAR ECLIPSE
// ─────────────────────────────────────────────────────────────

/** Sun glow via layers */
function SunGlow({ coverFraction }: { coverFraction: number }) {
  // dim sun as moon covers it, but keep corona visible at totality
  const isTotality = coverFraction > 0.98
  const sunOpacity = Math.max(0.05, 1 - coverFraction * 0.95)

  return (
    <group>
      {/* Sun sphere */}
      <mesh>
        <sphereGeometry args={[1.8, 64, 64]} />
        <meshStandardMaterial
          color="#fff7a0"
          emissive="#fbbf24"
          emissiveIntensity={sunOpacity * 2.5}
          transparent
          opacity={sunOpacity}
        />
      </mesh>
      {/* Outer corona (ring) — brightest during totality */}
      {coverFraction > 0.7 && (
        <mesh>
          <ringGeometry args={[1.85, 2.8, 128]} />
          <meshBasicMaterial
            color="#fff5d0"
            transparent
            opacity={Math.min(1, (coverFraction - 0.7) * 3.3) * 0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {/* Corona shimmer ring (inner) */}
      {isTotality && (
        <mesh>
          <ringGeometry args={[1.82, 2.1, 64]} />
          <meshBasicMaterial
            color="#ff9900"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {/* Ambient glow halo */}
      <mesh>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={sunOpacity * 0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

/** Moon moving across Sun face */
function MoonPassing({
  angleRef,
}: {
  angleRef: React.MutableRefObject<number>
}) {
  const moonRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!moonRef.current) return
    // angle 0 = fully left; PI = fully right; PI/2 = center (totality)
    const a = angleRef.current
    const x = Math.cos(a) * 3.5  // amplitude so moon starts/ends off-screen relative to sun
    const y = 0
    moonRef.current.position.set(x, y, 0.1)
  })

  return (
    <mesh ref={moonRef}>
      <sphereGeometry args={[1.7, 64, 64]} />
      <meshStandardMaterial
        color="#111827"
        roughness={0.9}
        metalness={0}
      />
    </mesh>
  )
}

function SolarEclipseScene({
  playingRef,
  speedRef,
  angleRef,
}: {
  playingRef: React.MutableRefObject<boolean>
  speedRef: React.MutableRefObject<number>
  angleRef: React.MutableRefObject<number>
}) {
  useFrame((_, delta) => {
    if (!playingRef.current) return
    // Moon sweeps from angle 0 → PI (left to right across sun)
    angleRef.current = (angleRef.current + delta * 0.4 * speedRef.current) % (Math.PI * 1.5)
    if (angleRef.current > Math.PI * 1.5) angleRef.current = 0
  })

  return (
    <>
      <color attach="background" args={[BG]} />
      <Stars radius={80} depth={50} count={2000} factor={3} saturation={0} fade />
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#fbbf24" distance={50} />

      <SunGlow coverFraction={0} />
      <MoonPassing angleRef={angleRef} />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={4}
        maxDistance={20}
        target={[0, 0, 0]}
      />
    </>
  )
}

export function SolarEclipseSim() {
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [phase, setPhase] = useState('Bán phần (Partial)')
  const [phaseColor, setPhaseColor] = useState('#facc15')
  const [tick, setTick] = useState(0)

  const playingRef = useRef(true)
  const speedRef = useRef(1)
  const angleRef = useRef(0)

  // Read angle from the ref and update UI phase label (polling via requestAnimationFrame would be overkill; use a light interval)
  const phaseInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const startPhasePolling = useCallback(() => {
    if (phaseInterval.current) return
    phaseInterval.current = setInterval(() => {
      const a = angleRef.current
      // a in [0, PI*1.5]
      // Center = PI/2 ≈ 1.57 → totality
      const distFromCenter = Math.abs(a - Math.PI / 2)
      if (distFromCenter < 0.25) {
        setPhase('Toàn phần — Corona hiển thị (Totality)')
        setPhaseColor('#ff9900')
      } else if (distFromCenter < 0.8) {
        setPhase('Bán phần (Partial Eclipse)')
        setPhaseColor('#facc15')
      } else {
        setPhase('Trước / Sau nhật thực')
        setPhaseColor('#94a3b8')
      }
      setTick(t => t + 1)
    }, 200)
  }, [])

  if (!phaseInterval.current) startPhasePolling()

  const toggle = () => {
    playingRef.current = !playingRef.current
    setPlaying(playingRef.current)
  }
  const setSpeedVal = (s: number) => {
    speedRef.current = s
    setSpeed(s)
  }
  const reset = () => {
    angleRef.current = 0
    setPhase('Bán phần (Partial)')
    setPhaseColor('#facc15')
  }

  return (
    <div className="relative w-full h-full">
      <Canvas style={canvasStyle} camera={{ position: [0, 0, 8], fov: 40 }}>
        <SolarEclipseScene
          playingRef={playingRef}
          speedRef={speedRef}
          angleRef={angleRef}
        />
      </Canvas>

      {/* Educational labels (overlaid via absolute) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 text-right text-[11px] text-white/40 pointer-events-none select-none">
        <span>Mặt Trời (Sun) ☀️</span>
        <span>Mặt Trăng (Moon) — che khuất</span>
        <span>Quan sát từ Trái Đất</span>
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
// LUNAR ECLIPSE
// ─────────────────────────────────────────────────────────────

function EarthWithShadow() {
  return (
    <group>
      {/* Earth */}
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          color="#1d4ed8"
          roughness={0.7}
          emissive="#0ea5e9"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Penumbra shadow cone (lighter) */}
      <mesh position={[6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[4, 12, 32, 1, true]} />
        <meshBasicMaterial
          color="#1e293b"
          transparent
          opacity={0.35}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Umbra shadow cone (darker, narrower) */}
      <mesh position={[5.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[1.8, 11, 32, 1, true]} />
        <meshBasicMaterial
          color="#000a1a"
          transparent
          opacity={0.82}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

function OrbitingMoon({
  angleRef,
}: {
  angleRef: React.MutableRefObject<number>
}) {
  const moonRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    if (!moonRef.current || !matRef.current) return
    const a = angleRef.current
    // Orbit on x-axis: starts from angle=0 (right side, full moon)
    // Goes through angle=PI (left = totality in Earth's shadow)
    const x = Math.cos(a) * 5.5
    const y = Math.sin(a) * 0.3   // slight y offset so orbit not perfectly ecliptic
    moonRef.current.position.set(x, y, 0)

    // Color: white → dark gray (penumbra) → deep red/orange (umbra blood moon)
    // shadow zone: x > 1.5 (entering from right side means in Earth's shadow on right)
    // Actually a=PI means moon is at x=-5.5, which is the shadow side (behind Earth from Sun)
    const distFromOpposite = Math.abs(a - Math.PI)  // 0 = deepest umbra
    let moonColor = '#e2e8f0'
    let emissive = '#000000'
    let emissiveInt = 0

    if (distFromOpposite < 0.5) {
      // Deep umbra — blood moon
      const t = 1 - distFromOpposite / 0.5
      moonColor = '#7f1d1d'
      emissive = '#ef4444'
      emissiveInt = t * 0.4
    } else if (distFromOpposite < 1.0) {
      // Partial umbra — darkening
      const t = 1 - (distFromOpposite - 0.5) / 0.5
      moonColor = new THREE.Color('#e2e8f0').lerp(new THREE.Color('#7f1d1d'), t).getStyle()
    }

    matRef.current.color.set(moonColor)
    matRef.current.emissive.set(emissive)
    matRef.current.emissiveIntensity = emissiveInt
    matRef.current.needsUpdate = true
  })

  return (
    <mesh ref={moonRef}>
      <sphereGeometry args={[0.55, 48, 48]} />
      <meshStandardMaterial
        ref={matRef}
        color="#e2e8f0"
        roughness={0.85}
      />
    </mesh>
  )
}

function LunarEclipseScene({
  playingRef,
  speedRef,
  angleRef,
}: {
  playingRef: React.MutableRefObject<boolean>
  speedRef: React.MutableRefObject<number>
  angleRef: React.MutableRefObject<number>
}) {
  useFrame((_, delta) => {
    if (!playingRef.current) return
    angleRef.current = (angleRef.current + delta * 0.35 * speedRef.current) % (Math.PI * 2)
  })

  return (
    <>
      <color attach="background" args={[BG]} />
      <Stars radius={100} depth={60} count={3000} factor={2.5} saturation={0} fade />
      {/* Directional light from the Sun (left side, x=-∞) */}
      <directionalLight position={[-20, 0, 0]} intensity={2.5} color="#fff7e6" />
      <ambientLight intensity={0.02} />

      <EarthWithShadow />
      <OrbitingMoon angleRef={angleRef} />

      {/* Shadow zone labels */}
      <Html position={[4, 2, 0]} center>
        <div className="text-[10px] text-blue-300/70 bg-gray-900/60 px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
          Bán ảnh (Penumbra)
        </div>
      </Html>
      <Html position={[5.5, -2, 0]} center>
        <div className="text-[10px] text-red-400/80 bg-gray-900/60 px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
          Bóng tối (Umbra)
        </div>
      </Html>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={5}
        maxDistance={20}
        target={[0, 0, 0]}
      />
    </>
  )
}

export function LunarEclipseSim() {
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [phase, setPhase] = useState('Trăng tròn (Full Moon)')
  const [phaseColor, setPhaseColor] = useState('#e2e8f0')
  const [, setTick] = useState(0)

  const playingRef = useRef(true)
  const speedRef = useRef(1)
  const angleRef = useRef(0)

  const phaseInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const startPolling = useCallback(() => {
    if (phaseInterval.current) return
    phaseInterval.current = setInterval(() => {
      const a = angleRef.current
      const distFromPi = Math.abs(a - Math.PI)
      if (distFromPi < 0.25) {
        setPhase('Nguyệt thực toàn phần — Blood Moon 🌕')
        setPhaseColor('#ef4444')
      } else if (distFromPi < 0.7) {
        setPhase('Nguyệt thực một phần (Partial)')
        setPhaseColor('#f97316')
      } else if (distFromPi < 1.2) {
        setPhase('Vào bán ảnh (Penumbra)')
        setPhaseColor('#94a3b8')
      } else {
        setPhase('Trăng tròn (Full Moon)')
        setPhaseColor('#e2e8f0')
      }
      setTick(t => t + 1)
    }, 200)
  }, [])

  if (!phaseInterval.current) startPolling()

  const toggle = () => {
    playingRef.current = !playingRef.current
    setPlaying(playingRef.current)
  }
  const setSpeedVal = (s: number) => {
    speedRef.current = s
    setSpeed(s)
  }
  const reset = () => {
    angleRef.current = 0
    setPhase('Trăng tròn (Full Moon)')
    setPhaseColor('#e2e8f0')
  }

  return (
    <div className="relative w-full h-full">
      <Canvas style={canvasStyle} camera={{ position: [0, 6, 12], fov: 45 }}>
        <LunarEclipseScene
          playingRef={playingRef}
          speedRef={speedRef}
          angleRef={angleRef}
        />
      </Canvas>

      {/* Labels */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 text-right text-[11px] text-white/40 pointer-events-none select-none">
        <span>☀️ Mặt Trời (trái)</span>
        <span>🌏 Trái Đất (trung tâm)</span>
        <span>🌕 Mặt Trăng (quỹ đạo)</span>
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
