import React, { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'

const canvasStyle: React.CSSProperties = { width: '100%', height: '100%' }
const BG = '#0a0a0f'

// ============================================================================
// 1. PENDULUM SIM
// ============================================================================

function Pendulum({
  length,
  phase,
  color,
  x,
}: {
  length: number
  phase: number
  color: string
  x: number
}) {
  const group = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (group.current) {
      const t = clock.getElapsedTime()
      group.current.rotation.z = Math.sin(t * Math.sqrt(9.8 / length) + phase) * 0.4
    }
  })

  return (
    <group ref={group} position={[x, 2, 0]}>
      {/* vertical rod */}
      <mesh position={[0, -length / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, length, 8]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      {/* bob sphere */}
      <mesh position={[0, -length, 0]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.1} />
      </mesh>
    </group>
  )
}

function PendulumSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 8], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* horizontal bar */}
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[5, 0.1, 0.1]} />
        <meshStandardMaterial color="#444" />
      </mesh>

      {/* three pendulums */}
      <Pendulum length={1.5} phase={0} color="#ef4444" x={-2} />
      <Pendulum length={2.2} phase={1.2} color="#3b82f6" x={0} />
      <Pendulum length={3.0} phase={2.4} color="#22c55e" x={2} />

      <OrbitControls />
    </Canvas>
  )
}

// ============================================================================
// 2. SOLAR SYSTEM SIM — Thái Dương Hệ (8 planets + Moon + Saturn rings)
// ============================================================================
//
// Compressed-scale model for readability (NOT astronomically accurate).
// - Orbit radii compressed logarithmically so outer planets stay on-screen.
// - Orbital speeds inversely scaled by semi-major axis (Kepler-inspired).
// - Planet radii exaggerated vs. Sun for visibility (real Jupiter is ~1/10 Sun).
// - Axial tilts approximated (Uranus visibly rolls on its side, etc.).
// ----------------------------------------------------------------------------

interface PlanetInfo {
  vi: string                 // Vietnamese name
  type: string               // planet type (terrestrial, gas giant, ice giant)
  distanceAU: string         // average distance from Sun
  diameterKm: string         // equatorial diameter
  dayLength: string          // rotation period
  yearLength: string         // orbital period
  moons: string              // moon count
  fact: string               // one-line fun fact in Vietnamese
}

interface PlanetSpec {
  name: string
  color: string
  emissive?: string
  radius: number       // display radius
  orbit: number        // display orbit radius from Sun
  speed: number        // base angular speed (rad/sec), scaled by 1/sqrt(orbit) internally
  phase: number        // starting angle offset so planets don't line up
  tilt: number         // axial tilt in radians
  rings?: { inner: number; outer: number; color: string; opacity: number }
  metalness?: number
  roughness?: number
  info: PlanetInfo
}

// Info for the Sun (not a planet but hoverable)
const SUN_INFO: PlanetInfo = {
  vi: 'Mặt Trời',
  type: 'Ngôi sao (G2V — sao lùn vàng)',
  distanceAU: '0 AU (trung tâm hệ)',
  diameterKm: '1 391 400 km (109× Trái Đất)',
  dayLength: '~27 ngày Trái Đất (xích đạo)',
  yearLength: '~225 triệu năm quay quanh tâm Ngân Hà',
  moons: '—',
  fact: 'Chứa 99.86% khối lượng toàn hệ, lõi nhiệt độ ~15 triệu °C — nơi diễn ra phản ứng tổng hợp hạt nhân H → He.',
}

// Order: Mercury → Neptune. Real relative size ratios flattened for visibility.
const PLANETS: PlanetSpec[] = [
  {
    name: 'Mercury', color: '#9ca3af', radius: 0.14, orbit: 2.2, speed: 1.60, phase: 0.0, tilt: 0.01,
    metalness: 0.3, roughness: 0.8,
    info: {
      vi: 'Sao Thuỷ', type: 'Hành tinh đá (terrestrial)',
      distanceAU: '0.39 AU (~57.9 triệu km)',
      diameterKm: '4 879 km (~38% Trái Đất)',
      dayLength: '~58.6 ngày Trái Đất',
      yearLength: '88 ngày Trái Đất',
      moons: '0',
      fact: 'Gần Mặt Trời nhất, nhiệt độ dao động từ −173°C (đêm) tới +427°C (ngày). Không có khí quyển đáng kể.',
    },
  },
  {
    name: 'Venus', color: '#f0b060', radius: 0.22, orbit: 3.0, speed: 1.18, phase: 1.1, tilt: 0.05,
    metalness: 0.1, roughness: 0.7,
    info: {
      vi: 'Sao Kim', type: 'Hành tinh đá (terrestrial)',
      distanceAU: '0.72 AU (~108.2 triệu km)',
      diameterKm: '12 104 km (~95% Trái Đất)',
      dayLength: '243 ngày Trái Đất (quay ngược!)',
      yearLength: '225 ngày Trái Đất',
      moons: '0',
      fact: 'Nóng nhất hệ (~465°C) do hiệu ứng nhà kính CO₂ dày đặc. Quay ngược chiều so với hầu hết hành tinh.',
    },
  },
  {
    name: 'Earth', color: '#3b82f6', radius: 0.24, orbit: 4.0, speed: 1.00, phase: 2.4, tilt: 0.41,
    metalness: 0.2, roughness: 0.6,
    info: {
      vi: 'Trái Đất', type: 'Hành tinh đá (terrestrial)',
      distanceAU: '1.00 AU (~149.6 triệu km)',
      diameterKm: '12 742 km',
      dayLength: '23 giờ 56 phút',
      yearLength: '365.25 ngày',
      moons: '1 (Mặt Trăng)',
      fact: 'Hành tinh duy nhất đã biết có sự sống. 71% bề mặt là nước lỏng, khí quyển N₂/O₂ giàu oxy.',
    },
  },
  {
    name: 'Mars', color: '#dc2626', radius: 0.18, orbit: 5.0, speed: 0.80, phase: 0.6, tilt: 0.44,
    metalness: 0.1, roughness: 0.9,
    info: {
      vi: 'Sao Hoả', type: 'Hành tinh đá (terrestrial)',
      distanceAU: '1.52 AU (~227.9 triệu km)',
      diameterKm: '6 779 km (~53% Trái Đất)',
      dayLength: '24 giờ 37 phút',
      yearLength: '687 ngày Trái Đất',
      moons: '2 (Phobos, Deimos)',
      fact: 'Màu đỏ do oxit sắt trên bề mặt. Có Olympus Mons — núi lửa cao 22 km, lớn nhất hệ.',
    },
  },
  {
    name: 'Jupiter', color: '#d97706', radius: 0.68, orbit: 7.0, speed: 0.43, phase: 3.2, tilt: 0.05,
    metalness: 0.1, roughness: 0.7,
    info: {
      vi: 'Sao Mộc', type: 'Khổng lồ khí (gas giant)',
      distanceAU: '5.20 AU (~778.5 triệu km)',
      diameterKm: '139 820 km (~11× Trái Đất)',
      dayLength: '~9.9 giờ (quay nhanh nhất hệ)',
      yearLength: '11.86 năm Trái Đất',
      moons: '95+ (Io, Europa, Ganymede, Callisto...)',
      fact: 'Hành tinh lớn nhất. Vết Đỏ Lớn (Great Red Spot) là cơn bão khổng lồ tồn tại >350 năm.',
    },
  },
  {
    name: 'Saturn', color: '#eab308', radius: 0.58, orbit: 9.0, speed: 0.32, phase: 4.5, tilt: 0.47,
    rings: { inner: 0.80, outer: 1.30, color: '#d4a373', opacity: 0.75 },
    metalness: 0.1, roughness: 0.6,
    info: {
      vi: 'Sao Thổ', type: 'Khổng lồ khí (gas giant)',
      distanceAU: '9.58 AU (~1.43 tỷ km)',
      diameterKm: '116 460 km (~9.4× Trái Đất)',
      dayLength: '~10.7 giờ',
      yearLength: '29.46 năm Trái Đất',
      moons: '146+ (Titan, Enceladus, Mimas...)',
      fact: 'Nổi tiếng với vành đai băng/đá rộng tới 282 000 km nhưng dày chỉ 10–100 m. Mật độ thấp hơn nước!',
    },
  },
  {
    name: 'Uranus', color: '#67e8f9', radius: 0.40, orbit: 11.0, speed: 0.23, phase: 1.8, tilt: 1.71,
    metalness: 0.3, roughness: 0.5,
    info: {
      vi: 'Sao Thiên Vương', type: 'Khổng lồ băng (ice giant)',
      distanceAU: '19.22 AU (~2.87 tỷ km)',
      diameterKm: '50 724 km (~4× Trái Đất)',
      dayLength: '~17.2 giờ',
      yearLength: '84 năm Trái Đất',
      moons: '27 (Titania, Oberon, Miranda...)',
      fact: 'Nghiêng 98° — "lăn" trên quỹ đạo như quả bóng. Màu xanh lam do khí methane hấp thụ ánh sáng đỏ.',
    },
  },
  {
    name: 'Neptune', color: '#2563eb', radius: 0.38, orbit: 13.0, speed: 0.18, phase: 5.0, tilt: 0.49,
    metalness: 0.3, roughness: 0.5,
    info: {
      vi: 'Sao Hải Vương', type: 'Khổng lồ băng (ice giant)',
      distanceAU: '30.05 AU (~4.50 tỷ km)',
      diameterKm: '49 244 km (~3.9× Trái Đất)',
      dayLength: '~16.1 giờ',
      yearLength: '164.8 năm Trái Đất',
      moons: '14 (Triton là lớn nhất)',
      fact: 'Hành tinh xa nhất, gió mạnh nhất hệ (~2 100 km/h). Được tiên đoán bằng tính toán trước khi quan sát.',
    },
  },
]

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.01, radius + 0.01, 128]} />
      <meshBasicMaterial color="#ffffff" opacity={0.07} transparent side={THREE.DoubleSide} />
    </mesh>
  )
}

function InfoTooltip({
  title,
  accent,
  info,
}: {
  title: string
  accent: string
  info: PlanetInfo
}) {
  return (
    <div
      style={{
        pointerEvents: 'none',
        transform: 'translate3d(16px, -50%, 0)',
        minWidth: 240,
        maxWidth: 300,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'rgba(10, 10, 15, 0.92)',
        border: `1px solid ${accent}40`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${accent}20`,
        backdropFilter: 'blur(8px)',
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: accent, boxShadow: `0 0 8px ${accent}`,
          }}
        />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.95)' }}>{title}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{info.type}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 11 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Khoảng cách:</span>
        <span>{info.distanceAU}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Đường kính:</span>
        <span>{info.diameterKm}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Ngày:</span>
        <span>{info.dayLength}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Năm:</span>
        <span>{info.yearLength}</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Vệ tinh:</span>
        <span>{info.moons}</span>
      </div>

      <div
        style={{
          marginTop: 8, paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic',
        }}
      >
        {info.fact}
      </div>
    </div>
  )
}

function Planet({
  spec,
  moonRef,
  hovered,
  onHover,
}: {
  spec: PlanetSpec
  moonRef?: React.RefObject<THREE.Mesh>
  hovered: boolean
  onHover: (name: string | null) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const angle = useRef(spec.phase)
  const moonAngle = useRef(0)

  useFrame((_s, dt) => {
    // Pause orbital motion while hovered — easier to read tooltip
    if (!hovered) {
      angle.current += dt * spec.speed * 0.25
    }
    if (groupRef.current) {
      groupRef.current.position.set(
        Math.cos(angle.current) * spec.orbit,
        0,
        Math.sin(angle.current) * spec.orbit
      )
    }
    // Self-rotation (day cycle) continues even when hovered
    if (bodyRef.current) {
      bodyRef.current.rotation.y += dt * (spec.speed * 2 + 0.5)
    }
    // Moon orbiting Earth (only passed for Earth)
    if (moonRef?.current && groupRef.current) {
      moonAngle.current += dt * 2.5
      const p = groupRef.current.position
      moonRef.current.position.set(
        p.x + Math.cos(moonAngle.current) * 0.6,
        Math.sin(moonAngle.current * 0.6) * 0.08,
        p.z + Math.sin(moonAngle.current) * 0.6
      )
    }
  })

  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
    onHover(spec.name)
  }
  const handlePointerOut = (e: any) => {
    e.stopPropagation()
    document.body.style.cursor = ''
    onHover(null)
  }

  return (
    <group ref={groupRef}>
      <group rotation={[0, 0, spec.tilt]}>
        <mesh
          ref={bodyRef}
          castShadow
          receiveShadow
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          scale={hovered ? 1.15 : 1}
        >
          <sphereGeometry args={[spec.radius, 32, 32]} />
          <meshStandardMaterial
            color={spec.color}
            metalness={spec.metalness ?? 0.2}
            roughness={spec.roughness ?? 0.6}
            emissive={hovered ? spec.color : (spec.emissive ?? '#000000')}
            emissiveIntensity={hovered ? 0.35 : (spec.emissive ? 0.3 : 0)}
          />
        </mesh>
        {spec.rings && (
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          >
            <ringGeometry args={[spec.radius * spec.rings.inner, spec.radius * spec.rings.outer, 96]} />
            <meshBasicMaterial
              color={spec.rings.color}
              opacity={spec.rings.opacity}
              transparent
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        {/* Label always visible (small, subtle) */}
        <Html
          position={[0, spec.radius + 0.18, 0]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              color: hovered ? '#fff' : 'rgba(255,255,255,0.55)',
              fontSize: 11,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 500,
              textShadow: '0 1px 2px rgba(0,0,0,0.9)',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}
          >
            {spec.info.vi}
          </div>
        </Html>
      </group>

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[spec.radius + 0.3, 0, 0]} style={{ pointerEvents: 'none' }}>
          <InfoTooltip title={spec.info.vi} accent={spec.color} info={spec.info} />
        </Html>
      )}
    </group>
  )
}

function SolarSystemScene() {
  const moonRef = useRef<THREE.Mesh>(null)
  const sunRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  // Slow Sun self-rotation for subtle life
  useFrame((_s, dt) => {
    if (sunRef.current) sunRef.current.rotation.y += dt * 0.1
  })

  const handleSunOver = (e: any) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
    setHovered('Sun')
  }
  const handleSunOut = (e: any) => {
    e.stopPropagation()
    document.body.style.cursor = ''
    setHovered(null)
  }

  const sunHovered = hovered === 'Sun'

  return (
    <>
      {/* ── Sun ── */}
      <group>
        <mesh
          ref={sunRef}
          onPointerOver={handleSunOver}
          onPointerOut={handleSunOut}
          scale={sunHovered ? 1.08 : 1}
        >
          <sphereGeometry args={[1.2, 48, 48]} />
          <meshStandardMaterial
            color="#fde047"
            emissive="#f59e0b"
            emissiveIntensity={sunHovered ? 2.8 : 2.2}
            toneMapped={false}
          />
        </mesh>
        {/* Sun glow halo */}
        <mesh>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={sunHovered ? 0.2 : 0.12} />
        </mesh>

        {/* Sun label */}
        <Html position={[0, 1.45, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              color: sunHovered ? '#fff7cc' : 'rgba(253, 224, 71, 0.8)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}
          >
            ☀ Mặt Trời
          </div>
        </Html>

        {/* Sun tooltip */}
        {sunHovered && (
          <Html position={[1.6, 0, 0]} style={{ pointerEvents: 'none' }}>
            <InfoTooltip title={SUN_INFO.vi} accent="#fbbf24" info={SUN_INFO} />
          </Html>
        )}
      </group>

      {/* Sun point light — cast light on planets */}
      <pointLight color="#fff7cc" intensity={3} distance={80} decay={1.2} />

      {/* Orbit rings for all planets */}
      {PLANETS.map(p => (
        <OrbitRing key={`ring-${p.name}`} radius={p.orbit} />
      ))}

      {/* Planets */}
      {PLANETS.map(p => (
        <Planet
          key={p.name}
          spec={p}
          moonRef={p.name === 'Earth' ? moonRef : undefined}
          hovered={hovered === p.name}
          onHover={setHovered}
        />
      ))}

      {/* Earth's Moon */}
      <mesh ref={moonRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#d1d5db" roughness={0.9} />
      </mesh>

      {/* Ambient fill so shadow sides aren't pitch black */}
      <ambientLight intensity={0.15} />

      {/* Starfield background */}
      <Stars radius={120} depth={60} count={5000} factor={4} saturation={0} fade speed={0.5} />

      <OrbitControls
        enablePan
        enableZoom
        autoRotate
        autoRotateSpeed={hovered ? 0 : 0.15}
        maxDistance={40}
        minDistance={3}
      />
    </>
  )
}

function SolarSystemSim() {
  return (
    <Canvas
      style={canvasStyle}
      camera={{ position: [0, 10, 20], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[BG]} />
      <SolarSystemScene />
    </Canvas>
  )
}

// ============================================================================
// 3. COLLISION (NEWTON'S CRADLE) SIM
// ============================================================================

const CRADLE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // purple
]

function CradleBall({
  idx,
  total,
  stringLen,
  ballR,
  speed,
}: {
  idx: number
  total: number
  stringLen: number
  ballR: number
  speed: number
}) {
  const group = useRef<THREE.Group>(null)
  const color = CRADLE_COLORS[idx % CRADLE_COLORS.length]

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime()
    const s = Math.sin(t * speed)
    let angle = 0

    if (idx === 0) {
      angle = s > 0 ? -s * 0.5 : 0
    }
    if (idx === total - 1) {
      angle = s < 0 ? -s * 0.5 : 0
    }

    group.current.rotation.z = angle
  })

  const spacing = ballR * 2.05
  const x = (idx - (total - 1) / 2) * spacing
  // Anchor at y=1.2, ball hangs at y = 1.2 - stringLen
  const stringCenterY = -stringLen / 2
  const ballCenterY = -stringLen

  return (
    <group ref={group} position={[x, 1.2, 0]}>
      {/* anchor point on bar */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {/* string */}
      <mesh position={[0, stringCenterY, 0]}>
        <cylinderGeometry args={[0.012, 0.012, stringLen, 6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {/* sphere */}
      <mesh position={[0, ballCenterY, 0]} castShadow>
        <sphereGeometry args={[ballR, 32, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.5}
          roughness={0.25}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  )
}

function CollisionSim() {
  const [total, setTotal] = useState(5)
  const [stringLen, setStringLen] = useState(1.0)
  const [ballR, setBallR] = useState(0.22)
  const [speed, setSpeed] = useState(2.8)
  const [showShadows, setShowShadows] = useState(true)

  const barWidth = total * ballR * 2.2 + 0.4
  const period = 2 * Math.PI * Math.sqrt(stringLen / 9.8)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        style={canvasStyle}
        camera={{ position: [0, 0, 5], fov: 45 }}
        shadows={showShadows}
      >
        <color attach="background" args={[BG]} />
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.1}
          castShadow={showShadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#a5b4fc" />

        {/* bar */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[barWidth, 0.08, 0.08]} />
          <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* support legs (4 corners) */}
        {[
          [-barWidth / 2 + 0.05, 0, 0.4],
          [barWidth / 2 - 0.05, 0, 0.4],
          [-barWidth / 2 + 0.05, 0, -0.4],
          [barWidth / 2 - 0.05, 0, -0.4],
        ].map((pos, i) => (
          <mesh key={i} position={[pos[0], (pos[1] + 1.2) / 2, pos[2]]}>
            <cylinderGeometry args={[0.04, 0.04, 1.2 - pos[1], 8]} />
            <meshStandardMaterial color="#52525b" metalness={0.4} roughness={0.5} />
          </mesh>
        ))}

        {/* base ground */}
        {showShadows && (
          <mesh
            position={[0, -1.2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[10, 6]} />
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </mesh>
        )}

        {/* cradle balls */}
        {Array.from({ length: total }).map((_, i) => (
          <CradleBall
            key={i}
            idx={i}
            total={total}
            stringLen={stringLen}
            ballR={ballR}
            speed={speed}
          />
        ))}

        <OrbitControls enablePan={false} />
      </Canvas>

      {/* info badge */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          padding: '6px 10px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: 8,
          color: '#e2e8f0',
          fontSize: 11,
          fontWeight: 500,
          pointerEvents: 'none',
        }}
      >
        ⚡ Bảo toàn động lượng + KE · Va chạm đàn hồi
      </div>

      {/* controls overlay */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          width: 240,
          padding: 12,
          background: 'rgba(15, 23, 42, 0.78)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: 10,
          color: '#e2e8f0',
          fontSize: 11,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 12, color: '#a5b4fc' }}>
          ⚙️ Điều khiển
        </div>
        <CtrlSlider
          label="Số quả bóng"
          value={total}
          min={3}
          max={7}
          step={1}
          onChange={setTotal}
          suffix=""
        />
        <CtrlSlider
          label="Chiều dài dây"
          value={stringLen}
          min={0.5}
          max={2.2}
          step={0.05}
          onChange={setStringLen}
          suffix="m"
        />
        <CtrlSlider
          label="Bán kính bóng"
          value={ballR}
          min={0.12}
          max={0.35}
          step={0.01}
          onChange={setBallR}
          suffix="m"
        />
        <CtrlSlider
          label="Tốc độ"
          value={speed}
          min={1}
          max={5}
          step={0.1}
          onChange={setSpeed}
          suffix="×"
        />
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={showShadows}
            onChange={(e) => setShowShadows(e.target.checked)}
          />
          <span>Hiện đổ bóng</span>
        </label>
        <div
          style={{
            marginTop: 4,
            paddingTop: 8,
            borderTop: '1px solid rgba(148, 163, 184, 0.25)',
            fontSize: 10,
            color: '#94a3b8',
          }}
        >
          T = 2π·√(L/g) ={' '}
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>
            {period.toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  )
}

function CtrlSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  suffix: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
        }}
      >
        <span>{label}</span>
        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
          {step < 1 ? value.toFixed(2) : value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#a5b4fc' }}
      />
    </div>
  )
}

// ============================================================================
// 4. PARTICLES SIM
// ============================================================================

function ParticleField() {
  const ref = useRef<THREE.Points>(null)
  const velocities = useRef<Float32Array>(new Float32Array(800 * 3))

  const positions = useMemo(() => {
    const count = 800
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5
      velocities.current[i * 3] = (Math.random() - 0.5) * 0.01
      velocities.current[i * 3 + 1] = (Math.random() - 0.5) * 0.01
    }
    return pos
  }, [])

  useFrame(({ pointer }) => {
    if (!ref.current) return
    const geo = ref.current.geometry
    const pos = geo.attributes.position.array as Float32Array
    const vel = velocities.current
    const mx = pointer.x * 5
    const my = pointer.y * 5

    for (let i = 0; i < 800; i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      const dx = pos[ix] - mx
      const dy = pos[iy] - my
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001

      if (dist < 2) {
        vel[ix] += (dx / dist) * 0.02 / dist
        vel[iy] += (dy / dist) * 0.02 / dist
      }

      vel[ix] *= 0.95
      vel[iy] *= 0.95

      pos[ix] += vel[ix]
      pos[iy] += vel[iy]

      if (pos[ix] > 5) pos[ix] = -5
      if (pos[ix] < -5) pos[ix] = 5
      if (pos[iy] > 5) pos[iy] = -5
      if (pos[iy] < -5) pos[iy] = 5
    }

    geo.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#06b6d4" sizeAttenuation transparent opacity={0.8} />
    </points>
  )
}

function ParticlesSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 8], fov: 60 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.5} />
      <ParticleField />
    </Canvas>
  )
}

// ============================================================================
// 5. SWARM SIM
// ============================================================================

function SwarmField() {
  const ref = useRef<THREE.Points>(null)
  const velocities = useRef<Float32Array>(new Float32Array(500 * 3))
  const [attract, setAttract] = useState(true)

  const positions = useMemo(() => {
    const count = 500
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5
      velocities.current[i * 3] = (Math.random() - 0.5) * 0.01
      velocities.current[i * 3 + 1] = (Math.random() - 0.5) * 0.01
    }
    return pos
  }, [])

  useFrame(({ pointer }) => {
    if (!ref.current) return
    const geo = ref.current.geometry
    const pos = geo.attributes.position.array as Float32Array
    const vel = velocities.current
    const mx = pointer.x * 5
    const my = pointer.y * 5

    for (let i = 0; i < 500; i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      const dx = mx - pos[ix]
      const dy = my - pos[iy]
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001

      const direction = attract ? 1 : -1
      vel[ix] += (dx / dist) * 0.01 * direction
      vel[iy] += (dy / dist) * 0.01 * direction

      vel[ix] *= 0.95
      vel[iy] *= 0.95

      pos[ix] += vel[ix]
      pos[iy] += vel[iy]

      if (pos[ix] > 5) pos[ix] = -5
      if (pos[ix] < -5) pos[ix] = 5
      if (pos[iy] > 5) pos[iy] = -5
      if (pos[iy] < -5) pos[iy] = 5
    }

    geo.attributes.position.needsUpdate = true
  })

  const handleCanvasClick = () => {
    setAttract(!attract)
  }

  const color = attract ? '#10b981' : '#ef4444'
  const mode = attract ? 'ATTRACT' : 'REPEL'

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: 'pointer',
      }}
      onClick={handleCanvasClick}
    >
      <Canvas style={canvasStyle} camera={{ position: [0, 0, 8], fov: 60 }}>
        <color attach="background" args={[BG]} />
        <ambientLight intensity={0.5} />
        <points ref={ref}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.05} color={color} sizeAttenuation transparent opacity={0.8} />
        </points>
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          color: color,
          fontFamily: 'monospace',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none',
        }}
      >
        {mode}
      </div>
    </div>
  )
}

function SwarmSim() {
  return <SwarmField />
}

// ============================================================================
// 6. AUDIO WAVE SIM
// ============================================================================

function AudioBars() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const count = 32

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      const baseHeight = i < 8 ? 3 : i < 16 ? 2 : i < 24 ? 1.5 : 1
      const h =
        baseHeight *
        (0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i * 0.5) * Math.sin(t * 1.3 + i * 0.3)))
      const x = (i - count / 2) * 0.35

      matrix.makeScale(0.25, h, 0.25)
      matrix.setPosition(x, h / 2 - 0.5, 0)
      meshRef.current.setMatrixAt(i, matrix)

      const hue = i / count
      meshRef.current.setColorAt(i, new THREE.Color().setHSL(hue, 1, 0.6))
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  )
}

function AudioWaveSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 2, 12], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <AudioBars />
      <OrbitControls />
    </Canvas>
  )
}

// ============================================================================
// 7. INSTANCED BOXES SIM
// ============================================================================

function BoxField() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const positions = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < 1000; i++) {
      arr.push(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      )
    }
    return arr
  }, [])

  const rotations = useMemo(
    () =>
      Float32Array.from({ length: 3000 }, () => {
        return Math.random() * Math.PI * 2
      }),
    []
  )

  const speeds = useMemo(
    () =>
      Float32Array.from({ length: 3000 }, () => {
        return 0.2 + Math.random() * 0.8
      }),
    []
  )

  useFrame((_s, dt) => {
    if (!meshRef.current) return

    for (let i = 0; i < 1000; i++) {
      rotations[i * 3] += dt * 0.3 * speeds[i * 3]
      rotations[i * 3 + 1] += dt * 0.5 * speeds[i * 3 + 1]
      rotations[i * 3 + 2] += dt * 0.4 * speeds[i * 3 + 2]

      dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
      dummy.rotation.set(rotations[i * 3], rotations[i * 3 + 1], rotations[i * 3 + 2])
      dummy.scale.setScalar(0.3)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < 1000; i++) {
      meshRef.current.setColorAt(i, new THREE.Color().setHSL(Math.random(), 0.7, 0.6))
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 1000]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  )
}

function InstancedBoxesSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 15], fov: 60 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <BoxField />
      <OrbitControls autoRotate autoRotateSpeed={0.3} />
    </Canvas>
  )
}

// ============================================================================
// 8. INSTANCED FLOW SIM
// ============================================================================

function FlowField() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const count = 500

  const offsets = useMemo(
    () => Float32Array.from({ length: count }, (_, i) => i / count),
    []
  )

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime() * 0.2

    for (let i = 0; i < count; i++) {
      const u = (offsets[i] + t) % 1
      const angle = u * Math.PI * 8
      const y = (u - 0.5) * 10
      const r = 2 + Math.sin(u * Math.PI * 4) * 0.5

      dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
      dummy.scale.setScalar(0.08)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
      meshRef.current.setColorAt(i, new THREE.Color().setHSL(u, 0.9, 0.6))
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  )
}

function InstancedFlowSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [6, 3, 6], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <FlowField />
      <OrbitControls autoRotate />
    </Canvas>
  )
}

// ============================================================================
// 9. CLOTH SIM
// ============================================================================

const CLOTH_W = 20
const CLOTH_H = 20

function ClothScene() {
  const positions = useRef<Float32Array>(
    new Float32Array((CLOTH_W + 1) * (CLOTH_H + 1) * 3)
  )
  const velocities = useRef<Float32Array>(
    new Float32Array((CLOTH_W + 1) * (CLOTH_H + 1) * 3)
  )
  const oldPos = useRef<Float32Array>(
    new Float32Array((CLOTH_W + 1) * (CLOTH_H + 1) * 3)
  )
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const pos = positions.current
    for (let y = 0; y <= CLOTH_H; y++) {
      for (let x = 0; x <= CLOTH_W; x++) {
        const i = (y * (CLOTH_W + 1) + x) * 3
        pos[i] = (x / CLOTH_W - 0.5) * 4
        pos[i + 1] = (1 - y / CLOTH_H) * 4 - 1
        pos[i + 2] = 0
      }
    }
    oldPos.current.set(pos)
  }, [])

  useFrame((_s, dt) => {
    const pos = positions.current
    const old = oldPos.current
    const vel = velocities.current
    const GRAVITY = -9.8
    const DAMPING = 0.99
    const REST_LEN = 4 / CLOTH_W
    const dtSq = Math.min(dt, 0.016) * Math.min(dt, 0.016)

    const next = new Float32Array(pos.length)

    // Verlet integration
    for (let i = 0; i < (CLOTH_W + 1) * (CLOTH_H + 1); i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      const row = Math.floor(i / (CLOTH_W + 1))

      if (row === 0) {
        next[ix] = pos[ix]
        next[iy] = pos[iy]
        next[iz] = pos[iz]
        continue
      }

      next[ix] = pos[ix] + (pos[ix] - old[ix]) * DAMPING
      next[iy] = pos[iy] + (pos[iy] - old[iy]) * DAMPING + GRAVITY * dtSq
      next[iz] = pos[iz] + (pos[iz] - old[iz]) * DAMPING
    }

    // Constraint relaxation (3 iterations)
    for (let iter = 0; iter < 3; iter++) {
      for (let y = 0; y <= CLOTH_H; y++) {
        for (let x = 0; x <= CLOTH_W; x++) {
          const i = y * (CLOTH_W + 1) + x

          // Right neighbor
          if (x < CLOTH_W) {
            const j = y * (CLOTH_W + 1) + x + 1
            const dx = next[j * 3] - next[i * 3]
            const dy = next[j * 3 + 1] - next[i * 3 + 1]
            const dz = next[j * 3 + 2] - next[i * 3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001
            const correction = ((dist - REST_LEN) / dist) * 0.5

            if (y > 0) {
              next[i * 3] += dx * correction
              next[i * 3 + 1] += dy * correction
              next[i * 3 + 2] += dz * correction
            }
            if (y > 0 || x > 0) {
              next[j * 3] -= dx * correction
              next[j * 3 + 1] -= dy * correction
              next[j * 3 + 2] -= dz * correction
            }
          }

          // Down neighbor
          if (y < CLOTH_H) {
            const j = (y + 1) * (CLOTH_W + 1) + x
            const dx = next[j * 3] - next[i * 3]
            const dy = next[j * 3 + 1] - next[i * 3 + 1]
            const dz = next[j * 3 + 2] - next[i * 3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001
            const correction = ((dist - REST_LEN) / dist) * 0.5

            if (y > 0) {
              next[i * 3] += dx * correction
              next[i * 3 + 1] += dy * correction
              next[i * 3 + 2] += dz * correction
            }

            next[j * 3] -= dx * correction
            next[j * 3 + 1] -= dy * correction
            next[j * 3 + 2] -= dz * correction
          }
        }
      }
    }

    old.set(pos)
    pos.set(next)

    if (geoRef.current) {
      const posAttr = geoRef.current.attributes.position.array as Float32Array
      posAttr.set(pos)
      geoRef.current.attributes.position.needsUpdate = true
      geoRef.current.computeVertexNormals()
    }
  })

  const { indices, uvs } = useMemo(() => {
    const idx: number[] = []
    const uv: number[] = []

    for (let y = 0; y <= CLOTH_H; y++) {
      for (let x = 0; x <= CLOTH_W; x++) {
        uv.push(x / CLOTH_W, y / CLOTH_H)
      }
    }

    for (let y = 0; y < CLOTH_H; y++) {
      for (let x = 0; x < CLOTH_W; x++) {
        const a = y * (CLOTH_W + 1) + x
        const b = a + 1
        const c = a + (CLOTH_W + 1)
        const d = c + 1
        idx.push(a, c, b, b, c, d)
      }
    }

    return { indices: new Uint16Array(idx), uvs: new Float32Array(uv) }
  }, [])

  return (
    <mesh ref={meshRef}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
        <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
        <bufferAttribute attach="index" args={[indices, 1]} />
      </bufferGeometry>
      <meshStandardMaterial color="#8b5cf6" side={THREE.DoubleSide} wireframe={false} />
    </mesh>
  )
}

function ClothSimSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 1, 7], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <ClothScene />
      <OrbitControls />
    </Canvas>
  )
}

// ============================================================================
// 10. FLAG SIM
// ============================================================================

const FLAG_W = 20
const FLAG_H = 20

function FlagScene() {
  const positions = useRef<Float32Array>(
    new Float32Array((FLAG_W + 1) * (FLAG_H + 1) * 3)
  )
  const velocities = useRef<Float32Array>(
    new Float32Array((FLAG_W + 1) * (FLAG_H + 1) * 3)
  )
  const oldPos = useRef<Float32Array>(
    new Float32Array((FLAG_W + 1) * (FLAG_H + 1) * 3)
  )
  const geoRef = useRef<THREE.BufferGeometry>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useEffect(() => {
    const pos = positions.current
    for (let y = 0; y <= FLAG_H; y++) {
      for (let x = 0; x <= FLAG_W; x++) {
        const i = (y * (FLAG_W + 1) + x) * 3
        pos[i] = (x / FLAG_W - 0.5) * 4
        pos[i + 1] = (1 - y / FLAG_H) * 4 - 1
        pos[i + 2] = 0
      }
    }
    oldPos.current.set(pos)
  }, [])

  useFrame(({ clock }, dt) => {
    const pos = positions.current
    const old = oldPos.current
    const vel = velocities.current
    const GRAVITY = -9.8
    const DAMPING = 0.99
    const REST_LEN = 4 / FLAG_W
    const dtSq = Math.min(dt, 0.016) * Math.min(dt, 0.016)

    const t = clock.getElapsedTime()
    const wind = 5 * Math.sin(t * 0.5 + 0.5)

    const next = new Float32Array(pos.length)

    // Verlet integration
    for (let i = 0; i < (FLAG_W + 1) * (FLAG_H + 1); i++) {
      const ix = i * 3
      const iy = i * 3 + 1
      const iz = i * 3 + 2

      const col = i % (FLAG_W + 1)

      // Pin left column (x=0)
      if (col === 0) {
        next[ix] = pos[ix]
        next[iy] = pos[iy]
        next[iz] = pos[iz]
        continue
      }

      next[ix] = pos[ix] + (pos[ix] - old[ix]) * DAMPING
      next[iy] = pos[iy] + (pos[iy] - old[iy]) * DAMPING + GRAVITY * dtSq
      next[iz] = pos[iz] + (pos[iz] - old[iz]) * DAMPING

      // Wind force (stronger on right side)
      const x = col
      next[iz] += wind * dtSq * (1 - x / FLAG_W)
    }

    // Constraint relaxation (3 iterations)
    for (let iter = 0; iter < 3; iter++) {
      for (let y = 0; y <= FLAG_H; y++) {
        for (let x = 0; x <= FLAG_W; x++) {
          const i = y * (FLAG_W + 1) + x

          // Right neighbor
          if (x < FLAG_W) {
            const j = y * (FLAG_W + 1) + x + 1
            const dx = next[j * 3] - next[i * 3]
            const dy = next[j * 3 + 1] - next[i * 3 + 1]
            const dz = next[j * 3 + 2] - next[i * 3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001
            const correction = ((dist - REST_LEN) / dist) * 0.5

            if (x > 0) {
              next[i * 3] += dx * correction
              next[i * 3 + 1] += dy * correction
              next[i * 3 + 2] += dz * correction
            }
            next[j * 3] -= dx * correction
            next[j * 3 + 1] -= dy * correction
            next[j * 3 + 2] -= dz * correction
          }

          // Down neighbor
          if (y < FLAG_H) {
            const j = (y + 1) * (FLAG_W + 1) + x
            const dx = next[j * 3] - next[i * 3]
            const dy = next[j * 3 + 1] - next[i * 3 + 1]
            const dz = next[j * 3 + 2] - next[i * 3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001
            const correction = ((dist - REST_LEN) / dist) * 0.5

            if (x > 0) {
              next[i * 3] += dx * correction
              next[i * 3 + 1] += dy * correction
              next[i * 3 + 2] += dz * correction
            }

            next[j * 3] -= dx * correction
            next[j * 3 + 1] -= dy * correction
            next[j * 3 + 2] -= dz * correction
          }
        }
      }
    }

    old.set(pos)
    pos.set(next)

    if (geoRef.current) {
      const posAttr = geoRef.current.attributes.position.array as Float32Array
      posAttr.set(pos)
      geoRef.current.attributes.position.needsUpdate = true
      geoRef.current.computeVertexNormals()
    }
  })

  const { indices, uvs } = useMemo(() => {
    const idx: number[] = []
    const uv: number[] = []

    for (let y = 0; y <= FLAG_H; y++) {
      for (let x = 0; x <= FLAG_W; x++) {
        uv.push(x / FLAG_W, y / FLAG_H)
      }
    }

    for (let y = 0; y < FLAG_H; y++) {
      for (let x = 0; x < FLAG_W; x++) {
        const a = y * (FLAG_W + 1) + x
        const b = a + 1
        const c = a + (FLAG_W + 1)
        const d = c + 1
        idx.push(a, c, b, b, c, d)
      }
    }

    return { indices: new Uint16Array(idx), uvs: new Float32Array(uv) }
  }, [])

  return (
    <>
      {/* flag cloth */}
      <mesh ref={meshRef}>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
          <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          <bufferAttribute attach="index" args={[indices, 1]} />
        </bufferGeometry>
        <meshStandardMaterial color="#dc2626" side={THREE.DoubleSide} wireframe={false} />
      </mesh>

      {/* pole */}
      <mesh position={[-2, 1, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 5, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* ball on top */}
      <mesh position={[-2, 3.5, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>
    </>
  )
}

function FlagSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [2, 1, 7], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <FlagScene />
      <OrbitControls />
    </Canvas>
  )
}

// ============================================================================
// EXPORT
// ============================================================================

export const physicsSimulations: Record<string, React.ComponentType> = {
  pendulum: PendulumSim,
  'solar-system': SolarSystemSim,
  collision: CollisionSim,
  particles: ParticlesSim,
  swarm: SwarmSim,
  'audio-wave': AudioWaveSim,
  'instanced-boxes': InstancedBoxesSim,
  'instanced-flow': InstancedFlowSim,
  'cloth-sim': ClothSimSim,
  flag: FlagSim,
}
