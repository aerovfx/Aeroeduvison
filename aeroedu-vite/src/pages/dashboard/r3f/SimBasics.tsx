import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { XRCanvas } from '../../../components/ar/XRCanvas'
import {
  OrbitControls,
  MeshTransmissionMaterial,
  Float,
  Text,
  Line,
  Environment,
  Sphere,
  Box,
  Stars,
} from '@react-three/drei'
import * as THREE from 'three'

const canvasStyle: React.CSSProperties = { width: '100%', height: '100%' }
const BG = '#0a0a0f'

// ============================================================================
// 1. INTERACTIVE BOX SIMULATION
// ============================================================================

function SpinningBox({
  position,
  color,
}: {
  position: [number, number, number]
  color: string
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  useFrame((_s, dt) => {
    if (mesh.current) {
      mesh.current.rotation.x += dt * 0.5
      mesh.current.rotation.y += dt * 0.3
    }
  })

  return (
    <mesh
      ref={mesh}
      position={position}
      scale={active ? 1.5 : 1}
      onClick={() => setActive((a) => !a)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={hovered ? '#f472b6' : color}
        metalness={0.2}
        roughness={0.4}
      />
    </mesh>
  )
}

function InteractiveBoxSim() {
  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 0, 7], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <SpinningBox position={[-2.2, 0, 0]} color="#61dafb" />
      <SpinningBox position={[0, 0, 0]} color="#10b981" />
      <SpinningBox position={[2.2, 0, 0]} color="#f59e0b" />

      <OrbitControls autoRotate autoRotateSpeed={0.5} />
    </XRCanvas>
  )
}

// ============================================================================
// 2. WATER MOLECULE SIMULATION
// ============================================================================

function WaterMolecule() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  const angle = (52.25 * Math.PI) / 180
  const h1x = Math.sin(angle) * 0.96
  const h1y = Math.cos(angle) * 0.96
  const h2x = -Math.sin(angle) * 0.96
  const h2y = Math.cos(angle) * 0.96

  return (
    <group ref={groupRef} scale={2}>
      {/* Oxygen */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#ef4444" metalness={0.3} roughness={0.5} />
      </mesh>
      <Text position={[0, -0.7, 0]} fontSize={0.25} color="white">
        O
      </Text>

      {/* Hydrogen 1 */}
      <mesh position={[h1x, h1y, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.4} />
      </mesh>
      <Text position={[h1x, h1y - 0.5, 0]} fontSize={0.2} color="white">
        H
      </Text>

      {/* Hydrogen 2 */}
      <mesh position={[h2x, h2y, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.4} />
      </mesh>
      <Text position={[h2x, h2y - 0.5, 0]} fontSize={0.2} color="white">
        H
      </Text>

      {/* Bond O-H1 */}
      <mesh position={[h1x / 2, h1y / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.96, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.1} roughness={0.3} />
      </mesh>

      {/* Bond O-H2 */}
      <mesh position={[h2x / 2, h2y / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.96, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.1} roughness={0.3} />
      </mesh>
    </group>
  )
}

function WaterMoleculeSim() {
  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 0, 6], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <WaterMolecule />

      <OrbitControls />
    </XRCanvas>
  )
}

// ============================================================================
// 3. CHEMISTRY LAB SIMULATION
// ============================================================================

function Bubble({
  position,
  beakerHeight,
}: {
  position: [number, number, number]
  beakerHeight: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [yOffset, setYOffset] = useState(0)

  useFrame(() => {
    if (meshRef.current) {
      setYOffset((prev) => {
        const newOffset = prev + 0.02
        return newOffset > beakerHeight ? -0.2 : newOffset
      })
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + yOffset, position[2]]}
    >
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial
        color="#ffffff"
        metalness={0}
        roughness={0.3}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

function Beaker({
  position,
  liquidColor,
  bubbleCount,
}: {
  position: [number, number, number]
  liquidColor: string
  bubbleCount: number
}) {
  return (
    <group position={position}>
      {/* Outer glass cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 1.2, 32]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.3}
          roughness={0}
          metalness={0}
          transmission={0.9}
          ior={1.5}
        />
      </mesh>

      {/* Liquid inside */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.7, 32]} />
        <meshStandardMaterial
          color={liquidColor}
          transparent
          opacity={0.8}
          metalness={0.1}
          roughness={0.4}
        />
      </mesh>

      {/* Bubbles */}
      {Array.from({ length: bubbleCount }).map((_, i) => (
        <Bubble
          key={i}
          position={[
            (Math.random() - 0.5) * 0.2,
            -0.25,
            (Math.random() - 0.5) * 0.2,
          ]}
          beakerHeight={0.7}
        />
      ))}
    </group>
  )
}

function ChemistryLabSim() {
  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 0, 6], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 1, 20]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <Stars radius={100} depth={50} count={5000} factor={4} />

      <Beaker position={[-2, 0, 0]} liquidColor="#3b82f6" bubbleCount={5} />
      <Beaker position={[0, 0, 0]} liquidColor="#22c55e" bubbleCount={5} />
      <Beaker position={[2, 0, 0]} liquidColor="#f59e0b" bubbleCount={5} />

      <OrbitControls />
    </XRCanvas>
  )
}

// ============================================================================
// 4. FROSTED GLASS SIMULATION
// ============================================================================

function FrostedGlassSim() {
  const bgColors = ['#ef4444', '#3b82f6', '#22c55e', '#fbbf24', '#a855f7']
  const bgPositions = useMemo(
    () => [
      [-2, -2, -3],
      [2, -2, -3],
      [-1.5, 2, -3],
      [1.5, 2, -3],
      [0, 0, -4],
    ] as const,
    []
  )

  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 0, 4], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      {/* Background colored spheres */}
      {bgPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial
            color={bgColors[i]}
            metalness={0.3}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Glass sphere with transmission */}
      <Float speed={1.5} floatIntensity={0.3} rotationIntensity={0.2}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1.5, 64, 64]} />
          <MeshTransmissionMaterial
            thickness={0.5}
            roughness={0.1}
            transmission={1}
            ior={1.5}
            chromaticAberration={0.05}
          />
        </mesh>
      </Float>

      <Environment preset="city" />
      <OrbitControls />
    </XRCanvas>
  )
}

// ============================================================================
// 5. SHOE DISPLAY SIMULATION
// ============================================================================

function ShoeDisplay() {
  return (
    <group>
      {/* Sole */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.4, 0.2, 0.8]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Midsole */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[2.2, 0.3, 0.7]} />
        <meshStandardMaterial color="#f97316" metalness={0.1} roughness={0.5} />
      </mesh>

      {/* Upper front (toe box) */}
      <mesh position={[0.7, 0.55, 0]} scale={[1.2, 0.8, 0.9]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.15} roughness={0.4} />
      </mesh>

      {/* Upper middle */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.0, 0.5, 0.65]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.15} roughness={0.4} />
      </mesh>

      {/* Upper back */}
      <mesh position={[-0.85, 0.6, 0]}>
        <boxGeometry args={[0.6, 0.7, 0.65]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.1} roughness={0.5} />
      </mesh>

      {/* Heel counter */}
      <mesh position={[-0.95, 0.35, 0]} scale={[1, 0.9, 1]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.1} roughness={0.5} />
      </mesh>
    </group>
  )
}

function ShoeDisplaySim() {
  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 0.5, 4], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <spotLight position={[3, 3, 3]} intensity={1.5} angle={0.5} penumbra={1} />

      <Float speed={1.5} floatIntensity={0.5} rotationIntensity={0.3}>
        <ShoeDisplay />
      </Float>

      <Environment preset="studio" />
      <OrbitControls />
    </XRCanvas>
  )
}

// ============================================================================
// 6. DNA HELIX SIMULATION
// ============================================================================

// ── DNA helpers ───────────────────────────────────────────────────────
// Pair colors theo Watson-Crick: A=Red, T=Blue, G=Green, C=Yellow
// A↔T (2 H-bonds), G↔C (3 H-bonds)
const BASE_COLORS = {
  A: '#ef4444', // red
  T: '#3b82f6', // blue
  G: '#22c55e', // green
  C: '#f59e0b', // amber
} as const
type Base = keyof typeof BASE_COLORS
const COMPLEMENT: Record<Base, Base> = { A: 'T', T: 'A', G: 'C', C: 'G' }

// Cylinder giữa 2 điểm — orient ĐÚNG bằng quaternion (Vector3.UP → direction)
function Bond({
  from, to, radius = 0.05, color = '#94a3b8', opacity = 1,
}: {
  from: THREE.Vector3; to: THREE.Vector3; radius?: number; color?: string; opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null)
  useMemo(() => {
    if (!ref.current) return
    const dir = new THREE.Vector3().subVectors(to, from)
    const length = dir.length()
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
    ref.current.position.copy(mid)
    const up = new THREE.Vector3(0, 1, 0)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())
    ref.current.quaternion.copy(quat)
    ref.current.scale.y = length
  }, [from, to])
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[radius, radius, 1, 12]} />
      <meshStandardMaterial
        color={color}
        metalness={0.4}
        roughness={0.35}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  )
}

// Smooth helical strand qua TubeGeometry — tránh nhìn rời rạc như sphere chain
function HelixBackbone({
  phase, radius, height, turns, color,
}: {
  phase: number; radius: number; height: number; turns: number; color: string;
}) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = []
    const samples = 200
    for (let i = 0; i <= samples; i++) {
      const t = i / samples
      const y = (t - 0.5) * height
      const angle = t * turns * Math.PI * 2 + phase
      points.push(new THREE.Vector3(
        radius * Math.cos(angle),
        y,
        radius * Math.sin(angle),
      ))
    }
    const curve = new THREE.CatmullRomCurve3(points)
    return new THREE.TubeGeometry(curve, 200, 0.13, 12, false)
  }, [phase, radius, height, turns])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.6}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </mesh>
  )
}

function DNAHelix() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003
    }
  })

  const RADIUS = 1.4
  const HEIGHT = 8
  const TURNS = 3
  const PAIRS = 30 // 10 base pairs per turn (chuẩn B-DNA)

  // Sample base pair positions evenly along helix
  const pairs = useMemo(() => {
    const arr: { pos1: THREE.Vector3; pos2: THREE.Vector3; base: Base }[] = []
    const bases: Base[] = ['A', 'T', 'G', 'C']
    for (let i = 0; i < PAIRS; i++) {
      const t = i / (PAIRS - 1)
      const y = (t - 0.5) * HEIGHT
      const angle = t * TURNS * Math.PI * 2
      const pos1 = new THREE.Vector3(
        RADIUS * Math.cos(angle),
        y,
        RADIUS * Math.sin(angle),
      )
      const pos2 = new THREE.Vector3(
        RADIUS * Math.cos(angle + Math.PI),
        y,
        RADIUS * Math.sin(angle + Math.PI),
      )
      arr.push({ pos1, pos2, base: bases[i % 4] })
    }
    return arr
  }, [])

  return (
    <group ref={groupRef}>
      {/* Two smooth helical backbones */}
      <HelixBackbone phase={0} radius={RADIUS} height={HEIGHT} turns={TURNS} color="#06b6d4" />
      <HelixBackbone phase={Math.PI} radius={RADIUS} height={HEIGHT} turns={TURNS} color="#a855f7" />

      {/* Base pairs */}
      {pairs.map((p, i) => {
        const baseColor = BASE_COLORS[p.base]
        const compColor = BASE_COLORS[COMPLEMENT[p.base]]
        // Mid point → 2 cylinders mỗi cylinder 1 nửa với màu base tương ứng
        const mid = new THREE.Vector3().addVectors(p.pos1, p.pos2).multiplyScalar(0.5)
        return (
          <group key={i}>
            {/* Strand-1 side (half cylinder color of base) */}
            <Bond from={p.pos1} to={mid} radius={0.08} color={baseColor} />
            {/* Strand-2 side (complement base color) */}
            <Bond from={mid} to={p.pos2} radius={0.08} color={compColor} />
            {/* Nucleotide spheres at the attachment points */}
            <mesh position={p.pos1.toArray()}>
              <sphereGeometry args={[0.18, 24, 24]} />
              <meshStandardMaterial color={baseColor} metalness={0.5} roughness={0.3} emissive={baseColor} emissiveIntensity={0.25} />
            </mesh>
            <mesh position={p.pos2.toArray()}>
              <sphereGeometry args={[0.18, 24, 24]} />
              <meshStandardMaterial color={compColor} metalness={0.5} roughness={0.3} emissive={compColor} emissiveIntensity={0.25} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function DnaHelixSim() {
  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 0, 9], fov: 45 }} gl={{ antialias: true }} dpr={[1, 2]}>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 12, 25]} />
      {/* Studio 3-point lighting cho material glow */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[6, 8, 6]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-6, 3, -4]} intensity={0.4} color="#a855f7" />
      <pointLight position={[0, 0, 5]} intensity={0.6} color="#06b6d4" />
      <Stars radius={50} depth={50} count={1500} factor={2} fade speed={0.5} />

      <DNAHelix />

      <OrbitControls enablePan={false} minDistance={4} maxDistance={18} autoRotate autoRotateSpeed={0.3} />
    </XRCanvas>
  )
}

// ============================================================================
// 7. DNA DETAIL SIMULATION
// ============================================================================

function DNADetail() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0025
    }
  })

  const RADIUS = 2
  const HEIGHT = 7
  const TURNS = 1.5         // ít vòng → mỗi base pair to dễ đọc label
  const PAIRS = 10

  // Watson-Crick sequence demo — 10 base pairs đa dạng
  const SEQUENCE: Base[] = ['A', 'T', 'G', 'C', 'A', 'T', 'G', 'C', 'T', 'A']

  const pairs = useMemo(() => {
    const arr: {
      pos1: THREE.Vector3; pos2: THREE.Vector3;
      base1: Base; base2: Base;
      labelPos1: THREE.Vector3; labelPos2: THREE.Vector3;
    }[] = []
    for (let i = 0; i < PAIRS; i++) {
      const t = i / (PAIRS - 1)
      const y = (t - 0.5) * HEIGHT
      const angle = t * TURNS * Math.PI * 2
      const pos1 = new THREE.Vector3(
        RADIUS * Math.cos(angle),
        y,
        RADIUS * Math.sin(angle),
      )
      const pos2 = new THREE.Vector3(
        RADIUS * Math.cos(angle + Math.PI),
        y,
        RADIUS * Math.sin(angle + Math.PI),
      )
      // Label đặt xa hơn radius để không đè base sphere
      const labelOffset = 0.7
      const labelPos1 = new THREE.Vector3(
        (RADIUS + labelOffset) * Math.cos(angle),
        y,
        (RADIUS + labelOffset) * Math.sin(angle),
      )
      const labelPos2 = new THREE.Vector3(
        (RADIUS + labelOffset) * Math.cos(angle + Math.PI),
        y,
        (RADIUS + labelOffset) * Math.sin(angle + Math.PI),
      )
      arr.push({
        pos1, pos2,
        base1: SEQUENCE[i],
        base2: COMPLEMENT[SEQUENCE[i]],
        labelPos1, labelPos2,
      })
    }
    return arr
  }, [])

  return (
    <group ref={groupRef}>
      {/* Backbones */}
      <HelixBackbone phase={0} radius={RADIUS} height={HEIGHT} turns={TURNS} color="#06b6d4" />
      <HelixBackbone phase={Math.PI} radius={RADIUS} height={HEIGHT} turns={TURNS} color="#a855f7" />

      {/* Base pairs + labels */}
      {pairs.map((p, i) => {
        const c1 = BASE_COLORS[p.base1]
        const c2 = BASE_COLORS[p.base2]
        const mid = new THREE.Vector3().addVectors(p.pos1, p.pos2).multiplyScalar(0.5)
        return (
          <group key={i}>
            {/* H-bond cylinders giữa 2 base */}
            <Bond from={p.pos1} to={mid} radius={0.1} color={c1} />
            <Bond from={mid} to={p.pos2} radius={0.1} color={c2} />

            {/* Nucleotide spheres lớn */}
            <mesh position={p.pos1.toArray()}>
              <sphereGeometry args={[0.32, 32, 32]} />
              <meshStandardMaterial color={c1} metalness={0.55} roughness={0.25} emissive={c1} emissiveIntensity={0.3} />
            </mesh>
            <mesh position={p.pos2.toArray()}>
              <sphereGeometry args={[0.32, 32, 32]} />
              <meshStandardMaterial color={c2} metalness={0.55} roughness={0.25} emissive={c2} emissiveIntensity={0.3} />
            </mesh>

            {/* Labels — outline + faces camera tự động */}
            <Text
              position={p.labelPos1.toArray()}
              fontSize={0.28}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.025}
              outlineColor={c1}
            >
              {p.base1}
            </Text>
            <Text
              position={p.labelPos2.toArray()}
              fontSize={0.28}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.025}
              outlineColor={c2}
            >
              {p.base2}
            </Text>
          </group>
        )
      })}

      {/* Legend ở phía trước (faces camera via Text default billboard) */}
      <group position={[0, -HEIGHT / 2 - 1.2, 0]}>
        <Text fontSize={0.22} color="#94a3b8" anchorX="center" outlineWidth={0.015} outlineColor="#000000">
          A · Adenine    T · Thymine    G · Guanine    C · Cytosine
        </Text>
        <Text position={[0, -0.4, 0]} fontSize={0.16} color="#64748b" anchorX="center">
          Watson-Crick base pairing · A↔T (2H)  ·  G↔C (3H)
        </Text>
      </group>
    </group>
  )
}

function DnaDetailSim() {
  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 0.5, 8], fov: 45 }} gl={{ antialias: true }} dpr={[1, 2]}>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 14, 28]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 6]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-6, 3, -4]} intensity={0.4} color="#a855f7" />
      <pointLight position={[0, 0, 5]} intensity={0.6} color="#06b6d4" />
      <Stars radius={50} depth={50} count={1000} factor={2} fade speed={0.5} />

      <DNADetail />

      <OrbitControls enablePan={false} minDistance={4} maxDistance={18} autoRotate autoRotateSpeed={0.25} />
    </XRCanvas>
  )
}

// ============================================================================
// 8. CAROUSEL SIMULATION
// ============================================================================

function CarouselPlane({
  index,
  color,
  onHover,
}: {
  index: number
  color: string
  onHover: (hovered: boolean) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const angle = (index * 2 * Math.PI) / 8
  const x = Math.sin(angle) * 3
  const z = Math.cos(angle) * 3

  return (
    <mesh
      ref={meshRef}
      position={[x, 0, z]}
      rotation={[0, angle, 0]}
      scale={hovered ? 1.1 : 1}
      onPointerOver={() => {
        setHovered(true)
        onHover(true)
      }}
      onPointerOut={() => {
        setHovered(false)
        onHover(false)
      }}
    >
      <planeGeometry args={[1.8, 2.5]} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} metalness={0.2} roughness={0.5} />
    </mesh>
  )
}

function Carousel() {
  const groupRef = useRef<THREE.Group>(null)
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#8b5cf6']

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  return (
    <group ref={groupRef}>
      {colors.map((color, i) => (
        <CarouselPlane
          key={i}
          index={i}
          color={color}
          onHover={() => {}}
        />
      ))}
    </group>
  )
}

function CarouselSim() {
  return (
    <XRCanvas style={canvasStyle} camera={{ position: [0, 1, 8], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <Carousel />

      <OrbitControls />
    </XRCanvas>
  )
}

// ============================================================================
// EXPORT
// ============================================================================

export const basicsSimulations: Record<string, React.ComponentType> = {
  'interactive-box': InteractiveBoxSim,
  'water-molecule': WaterMoleculeSim,
  'chemistry-lab': ChemistryLabSim,
  'frosted-glass': FrostedGlassSim,
  'shoe-display': ShoeDisplaySim,
  'dna-helix': DnaHelixSim,
  'dna-detail': DnaDetailSim,
  'carousel': CarouselSim,
}
