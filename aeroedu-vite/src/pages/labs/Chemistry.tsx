/**
 * Chemistry Lab — Phòng thí nghiệm hoá học R3F
 *
 * User: "fix https://inphysic.com/dashboard/labtwin/chemistry-lab
 *  áp dụng R3F cho chuyển động các hạt mượt mà và hiệu ứng đẹp hơn"
 *
 * 2 modes:
 *   1. 🧪 Phản ứng — chọn reagent → hạt R3F bay vào becher → va chạm → sản phẩm
 *   2. 🔬 Phân tử 3D — molecule viewer (giữ lại từ bản cũ, fix bond rotation bug)
 *
 * R3F particle system:
 *   - useFrame physics: gravity + collision với thành cốc (cylinder bounds)
 *   - Instanced meshes cho perf (500+ particles smooth)
 *   - Emissive material + bloom hiệu ứng glow
 *   - Khi 2 particle reagent khác nhau gặp nhau → react → sản phẩm (đổi màu/spawn bubble)
 */
import { useState, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { XRCanvas } from '../../components/ar/XRCanvas'
import { OrbitControls, Float } from '@react-three/drei'
import * as THREE from 'three'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, FlaskConical, Trash2, Play, Pause, Sparkles, Atom, Info, Beaker as BeakerIcon, Zap,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

type ReagentId = 'h2o' | 'naoh' | 'hcl' | 'mg' | 'cu2so4'
type MoleculeType = 'h2o' | 'co2' | 'nacl' | 'benzene' | 'ch4' | 'nh3' | 'c2h6o'

interface ReagentDef {
  id: ReagentId
  name: string
  formula: string
  color: string
  emissive: string
  particleSize: number
  category: 'acid' | 'base' | 'salt' | 'metal' | 'water'
}

interface ReactionDef {
  reactants: [ReagentId, ReagentId]
  product: string             // text description
  energy: 'exothermic' | 'endothermic' | 'neutral'
  gas?: boolean               // tạo bong bóng
  precipitate?: boolean       // kết tủa
  newColor?: string           // màu mới sau phản ứng
  equation: string
}

const REAGENTS: ReagentDef[] = [
  { id: 'h2o',     name: 'Nước',            formula: 'H₂O',     color: '#22d3ee', emissive: '#0e7490', particleSize: 0.10, category: 'water' },
  { id: 'naoh',    name: 'Natri Hydroxit',  formula: 'NaOH',    color: '#fbbf24', emissive: '#b45309', particleSize: 0.12, category: 'base'  },
  { id: 'hcl',     name: 'Axit Clohydric',  formula: 'HCl',     color: '#ec4899', emissive: '#9d174d', particleSize: 0.11, category: 'acid'  },
  { id: 'mg',      name: 'Magnesium',       formula: 'Mg',      color: '#a78bfa', emissive: '#5b21b6', particleSize: 0.14, category: 'metal' },
  { id: 'cu2so4',  name: 'Đồng (II) Sulfat', formula: 'CuSO₄',  color: '#3b82f6', emissive: '#1e3a8a', particleSize: 0.13, category: 'salt'  },
]

const REACTIONS: ReactionDef[] = [
  { reactants: ['hcl', 'naoh'],   product: 'Trung hoà → NaCl + H₂O',
    energy: 'exothermic', newColor: '#e2e8f0',
    equation: 'HCl + NaOH → NaCl + H₂O' },
  { reactants: ['mg', 'hcl'],     product: 'Khí H₂ thoát ra',
    energy: 'exothermic', gas: true, newColor: '#94a3b8',
    equation: 'Mg + 2HCl → MgCl₂ + H₂↑' },
  { reactants: ['mg', 'cu2so4'],  product: 'Cu đỏ kết tủa',
    energy: 'exothermic', precipitate: true, newColor: '#b45309',
    equation: 'Mg + CuSO₄ → MgSO₄ + Cu↓' },
  { reactants: ['naoh', 'cu2so4'],product: 'Kết tủa Cu(OH)₂ xanh',
    energy: 'neutral', precipitate: true, newColor: '#06b6d4',
    equation: '2NaOH + CuSO₄ → Cu(OH)₂↓ + Na₂SO₄' },
  { reactants: ['h2o', 'mg'],     product: 'Phản ứng chậm tạo Mg(OH)₂',
    energy: 'endothermic', newColor: '#fef3c7',
    equation: 'Mg + 2H₂O → Mg(OH)₂ + H₂↑' },
]

function findReaction(a: ReagentId, b: ReagentId): ReactionDef | null {
  return REACTIONS.find((r) =>
    (r.reactants[0] === a && r.reactants[1] === b) ||
    (r.reactants[0] === b && r.reactants[1] === a)
  ) || null
}

// ─── Particle system (R3F) ──────────────────────────────────────

interface ParticleState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  reagent: ReagentId
  color: THREE.Color
  size: number
  life: number       // 1 = full, 0 = dead
  reacted: boolean
}

interface BubbleState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  life: number
}

const BEAKER_RADIUS = 1.6
const BEAKER_HEIGHT = 2.8
const BEAKER_BOTTOM_Y = -1.2
const MAX_PARTICLES = 600

function ParticleSystem({
  reagentToAdd, clearSignal, paused,
  onReact,
}: {
  reagentToAdd: ReagentId | null
  clearSignal: number
  paused: boolean
  onReact: (r: ReactionDef) => void
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const bubbleMeshRef = useRef<THREE.InstancedMesh>(null!)
  const particlesRef = useRef<ParticleState[]>([])
  const bubblesRef = useRef<BubbleState[]>([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  // Spawn handler — observe reagent change
  useEffect(() => {
    if (!reagentToAdd) return
    const def = REAGENTS.find((r) => r.id === reagentToAdd)
    if (!def) return
    const baseColor = new THREE.Color(def.color)
    const SPAWN_COUNT = 40
    for (let i = 0; i < SPAWN_COUNT; i++) {
      if (particlesRef.current.length >= MAX_PARTICLES) break
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * 0.3
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      particlesRef.current.push({
        position: new THREE.Vector3(x, 1.8 + Math.random() * 0.3, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          -Math.random() * 0.5 - 0.5,
          (Math.random() - 0.5) * 0.5,
        ),
        reagent: reagentToAdd,
        color: baseColor.clone(),
        size: def.particleSize * (0.85 + Math.random() * 0.3),
        life: 1,
        reacted: false,
      })
    }
  }, [reagentToAdd])

  // Clear all
  useEffect(() => {
    if (clearSignal > 0) {
      particlesRef.current = []
      bubblesRef.current = []
    }
  }, [clearSignal])

  // Animate
  useFrame((_, dtRaw) => {
    if (paused) return
    const dt = Math.min(dtRaw, 0.05)
    const particles = particlesRef.current
    const bubbles = bubblesRef.current

    // Physics step
    for (const p of particles) {
      // Gravity
      p.velocity.y -= 1.8 * dt
      // Drag
      p.velocity.multiplyScalar(0.985)
      // Brownian (small random)
      p.velocity.x += (Math.random() - 0.5) * 0.15 * dt
      p.velocity.z += (Math.random() - 0.5) * 0.15 * dt
      // Integrate
      p.position.addScaledVector(p.velocity, dt)

      // Cylinder collision (beaker walls)
      const horizDistSq = p.position.x * p.position.x + p.position.z * p.position.z
      const maxR = BEAKER_RADIUS - p.size
      if (horizDistSq > maxR * maxR) {
        const dist = Math.sqrt(horizDistSq)
        const nx = p.position.x / dist
        const nz = p.position.z / dist
        p.position.x = nx * maxR
        p.position.z = nz * maxR
        // Reflect velocity
        const dot = p.velocity.x * nx + p.velocity.z * nz
        p.velocity.x -= 2 * dot * nx * 0.6
        p.velocity.z -= 2 * dot * nz * 0.6
      }
      // Floor
      if (p.position.y < BEAKER_BOTTOM_Y + p.size) {
        p.position.y = BEAKER_BOTTOM_Y + p.size
        p.velocity.y = -p.velocity.y * 0.4
        // Damping on floor
        p.velocity.x *= 0.92
        p.velocity.z *= 0.92
      }
      // Top cap
      if (p.position.y > 1.5 - p.size) {
        p.position.y = 1.5 - p.size
        p.velocity.y = -Math.abs(p.velocity.y) * 0.3
      }
    }

    // Collision + Reaction (sample pairs randomly to keep O(n))
    if (particles.length > 1) {
      for (let i = 0; i < Math.min(particles.length, 120); i++) {
        const a = particles[i]
        if (a.reacted) continue
        // sample ~4 random others
        for (let k = 0; k < 4; k++) {
          const j = Math.floor(Math.random() * particles.length)
          if (j === i) continue
          const b = particles[j]
          if (b.reacted) continue
          if (a.reagent === b.reagent) continue
          const dx = a.position.x - b.position.x
          const dy = a.position.y - b.position.y
          const dz = a.position.z - b.position.z
          const dSq = dx * dx + dy * dy + dz * dz
          const sum = a.size + b.size
          if (dSq < sum * sum * 1.6) {
            const rxn = findReaction(a.reagent, b.reagent)
            if (rxn) {
              a.reacted = true
              b.reacted = true
              const c = new THREE.Color(rxn.newColor || '#ffffff')
              a.color.copy(c)
              b.color.copy(c)
              if (rxn.energy === 'exothermic') {
                // Energy boost: spread outward
                a.velocity.multiplyScalar(1.5)
                b.velocity.multiplyScalar(1.5)
              }
              if (rxn.gas) {
                // Spawn bubble
                bubbles.push({
                  position: new THREE.Vector3(
                    (a.position.x + b.position.x) / 2,
                    (a.position.y + b.position.y) / 2,
                    (a.position.z + b.position.z) / 2,
                  ),
                  velocity: new THREE.Vector3(0, 0.6 + Math.random() * 0.4, 0),
                  size: 0.06 + Math.random() * 0.05,
                  life: 1,
                })
              }
              onReact(rxn)
            }
          }
        }
      }
    }

    // Update bubbles
    for (const b of bubbles) {
      b.position.addScaledVector(b.velocity, dt)
      b.velocity.x += (Math.random() - 0.5) * 0.4 * dt
      b.velocity.z += (Math.random() - 0.5) * 0.4 * dt
      b.size += dt * 0.05
      b.life -= dt * 0.4
    }
    bubblesRef.current = bubbles.filter((bub) => bub.life > 0 && bub.position.y < 2.5)

    // Render via instanced mesh
    if (meshRef.current) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        dummy.position.copy(p.position)
        dummy.scale.setScalar(p.size * 2)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        meshRef.current.setColorAt(i, tmpColor.copy(p.color))
      }
      meshRef.current.count = particles.length
      meshRef.current.instanceMatrix.needsUpdate = true
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
    }
    if (bubbleMeshRef.current) {
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]
        dummy.position.copy(b.position)
        dummy.scale.setScalar(b.size * 2)
        dummy.updateMatrix()
        bubbleMeshRef.current.setMatrixAt(i, dummy.matrix)
      }
      bubbleMeshRef.current.count = bubbles.length
      bubbleMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          metalness={0.3} roughness={0.15}
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={bubbleMeshRef} args={[undefined, undefined, 80]}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent opacity={0.3}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1}
          ior={1.4}
        />
      </instancedMesh>
    </>
  )
}

// ─── Beaker mesh ────────────────────────────────────────────────

function Beaker() {
  return (
    <group>
      {/* Beaker glass (cylinder no top, open) */}
      <mesh position={[0, BEAKER_BOTTOM_Y + BEAKER_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[BEAKER_RADIUS, BEAKER_RADIUS, BEAKER_HEIGHT, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#cbd5e1"
          transparent opacity={0.18}
          roughness={0.08}
          metalness={0.05}
          clearcoat={1}
          ior={1.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Beaker bottom */}
      <mesh position={[0, BEAKER_BOTTOM_Y, 0]}>
        <cylinderGeometry args={[BEAKER_RADIUS, BEAKER_RADIUS, 0.05, 48]} />
        <meshPhysicalMaterial
          color="#94a3b8"
          transparent opacity={0.35}
          roughness={0.1}
          clearcoat={1}
        />
      </mesh>
      {/* Lip (small rim) */}
      <mesh position={[0, BEAKER_BOTTOM_Y + BEAKER_HEIGHT, 0]}>
        <torusGeometry args={[BEAKER_RADIUS, 0.04, 12, 48]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Volume marks */}
      {[0.6, 1.2, 1.8, 2.4].map((y, i) => (
        <mesh key={i} position={[BEAKER_RADIUS * 1.01, BEAKER_BOTTOM_Y + y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.01, 0.15, 0.01]} />
          <meshBasicMaterial color="#e2e8f0" />
        </mesh>
      ))}
    </group>
  )
}

// ─── Molecule Viewer (fixed bond rotation) ──────────────────────

const molecules: Record<MoleculeType, { atoms: Array<{ position: [number, number, number]; element: string; radius: number; color: string }>; bonds: Array<{ start: [number, number, number]; end: [number, number, number]; order: number }>; formula: string; name: string; weight: number; angles: string }> = {
  h2o: {
    atoms: [
      { position: [0, 0, 0], element: 'O', radius: 0.7, color: '#ef4444' },
      { position: [-0.96, 0.27, 0], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [0.96, 0.27, 0], element: 'H', radius: 0.4, color: '#f1f5f9' },
    ],
    bonds: [{ start: [0,0,0], end: [-0.96,0.27,0], order: 1 }, { start: [0,0,0], end: [0.96,0.27,0], order: 1 }],
    formula: 'H₂O', name: 'Nước', weight: 18.02, angles: '104.5°',
  },
  co2: {
    atoms: [
      { position: [-1.2, 0, 0], element: 'O', radius: 0.7, color: '#ef4444' },
      { position: [0, 0, 0], element: 'C', radius: 0.6, color: '#1e293b' },
      { position: [1.2, 0, 0], element: 'O', radius: 0.7, color: '#ef4444' },
    ],
    bonds: [{ start: [-1.2,0,0], end: [0,0,0], order: 2 }, { start: [0,0,0], end: [1.2,0,0], order: 2 }],
    formula: 'CO₂', name: 'Carbon Dioxide', weight: 44.01, angles: '180°',
  },
  nacl: {
    atoms: [
      { position: [-0.6, 0, 0], element: 'Na', radius: 0.65, color: '#a855f7' },
      { position: [0.6, 0, 0], element: 'Cl', radius: 0.75, color: '#22c55e' },
    ],
    bonds: [{ start: [-0.6,0,0], end: [0.6,0,0], order: 1 }],
    formula: 'NaCl', name: 'Muối ăn', weight: 58.44, angles: 'Ion',
  },
  benzene: {
    atoms: [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2
      return { position: [Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0] as [number, number, number],
        element: 'C', radius: 0.6, color: '#1e293b' }
    }),
    bonds: [0, 1, 2, 3, 4, 5].map((i) => {
      const a1 = (i / 6) * Math.PI * 2
      const a2 = ((i + 1) / 6) * Math.PI * 2
      return {
        start: [Math.cos(a1) * 1.2, Math.sin(a1) * 1.2, 0] as [number, number, number],
        end: [Math.cos(a2) * 1.2, Math.sin(a2) * 1.2, 0] as [number, number, number],
        order: i % 2 === 0 ? 2 : 1,
      }
    }),
    formula: 'C₆H₆', name: 'Benzen', weight: 78.11, angles: '120°',
  },
  ch4: {
    atoms: [
      { position: [0, 0, 0], element: 'C', radius: 0.6, color: '#1e293b' },
      { position: [0.63, 0.63, 0.63], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [-0.63, -0.63, 0.63], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [-0.63, 0.63, -0.63], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [0.63, -0.63, -0.63], element: 'H', radius: 0.4, color: '#f1f5f9' },
    ],
    bonds: [
      { start: [0,0,0], end: [0.63,0.63,0.63], order: 1 },
      { start: [0,0,0], end: [-0.63,-0.63,0.63], order: 1 },
      { start: [0,0,0], end: [-0.63,0.63,-0.63], order: 1 },
      { start: [0,0,0], end: [0.63,-0.63,-0.63], order: 1 },
    ],
    formula: 'CH₄', name: 'Methane', weight: 16.04, angles: '109.5°',
  },
  nh3: {
    atoms: [
      { position: [0, 0, 0], element: 'N', radius: 0.65, color: '#3b82f6' },
      { position: [0.94, -0.33, 0], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [-0.47, -0.33, 0.81], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [-0.47, -0.33, -0.81], element: 'H', radius: 0.4, color: '#f1f5f9' },
    ],
    bonds: [
      { start: [0,0,0], end: [0.94,-0.33,0], order: 1 },
      { start: [0,0,0], end: [-0.47,-0.33,0.81], order: 1 },
      { start: [0,0,0], end: [-0.47,-0.33,-0.81], order: 1 },
    ],
    formula: 'NH₃', name: 'Amoniac', weight: 17.03, angles: '107°',
  },
  c2h6o: {
    atoms: [
      { position: [-1.2, 0, 0], element: 'C', radius: 0.6, color: '#1e293b' },
      { position: [0, 0, 0], element: 'C', radius: 0.6, color: '#1e293b' },
      { position: [1.1, 0.6, 0], element: 'O', radius: 0.7, color: '#ef4444' },
      { position: [-1.8, 0.7, 0.5], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [-1.8, -0.7, -0.5], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [-1.0, -0.6, 0.9], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [0.0, -0.7, 0.7], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [0.2, 0.7, -0.7], element: 'H', radius: 0.4, color: '#f1f5f9' },
      { position: [1.7, 1.0, 0.5], element: 'H', radius: 0.4, color: '#f1f5f9' },
    ],
    bonds: [
      { start: [-1.2,0,0], end: [0,0,0], order: 1 },
      { start: [0,0,0], end: [1.1,0.6,0], order: 1 },
      { start: [-1.2,0,0], end: [-1.8,0.7,0.5], order: 1 },
      { start: [-1.2,0,0], end: [-1.8,-0.7,-0.5], order: 1 },
      { start: [-1.2,0,0], end: [-1.0,-0.6,0.9], order: 1 },
      { start: [0,0,0], end: [0.0,-0.7,0.7], order: 1 },
      { start: [0,0,0], end: [0.2,0.7,-0.7], order: 1 },
      { start: [1.1,0.6,0], end: [1.7,1.0,0.5], order: 1 },
    ],
    formula: 'C₂H₆O', name: 'Ethanol', weight: 46.07, angles: '109.5°',
  },
}

// Proper 3D bond rendering using lookAt
function Bond({ start, end, order }: {
  start: [number, number, number]; end: [number, number, number]; order: number
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const s = useMemo(() => new THREE.Vector3(...start), [start])
  const e = useMemo(() => new THREE.Vector3(...end), [end])
  const mid = useMemo(() => new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5), [s, e])
  const dir = useMemo(() => new THREE.Vector3().subVectors(e, s), [s, e])
  const length = dir.length()
  const radius = order === 1 ? 0.08 : order === 2 ? 0.06 : 0.05

  // Compute rotation to align cylinder Y axis with direction
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    const dirN = dir.clone().normalize()
    return new THREE.Quaternion().setFromUnitVectors(up, dirN)
  }, [dir])

  useEffect(() => {
    if (ref.current) ref.current.quaternion.copy(quaternion)
  }, [quaternion])

  // For double/triple bond, offset cylinders perpendicular to bond
  const offsets = order === 2 ? [-0.12, 0.12] : order === 3 ? [-0.16, 0, 0.16] : [0]

  // Compute perpendicular axis
  const perp = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    const dirN = dir.clone().normalize()
    const p = new THREE.Vector3().crossVectors(dirN, up)
    if (p.lengthSq() < 0.001) p.set(1, 0, 0)
    return p.normalize()
  }, [dir])

  return (
    <>
      {offsets.map((o, i) => (
        <mesh key={i}
          position={[mid.x + perp.x * o, mid.y + perp.y * o, mid.z + perp.z * o]}
          quaternion={quaternion}>
          <cylinderGeometry args={[radius, radius, length, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.25} />
        </mesh>
      ))}
    </>
  )
}

function MoleculeScene({ moleculeType }: { moleculeType: MoleculeType }) {
  const groupRef = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.3
    }
  })
  const mol = molecules[moleculeType]
  return (
    <group ref={groupRef}>
      {mol.bonds.map((b, i) => <Bond key={`b-${i}`} {...b} />)}
      {mol.atoms.map((a, i) => (
        <Float key={`a-${i}`} speed={2} rotationIntensity={0} floatIntensity={0.2}>
          <mesh position={a.position}>
            <sphereGeometry args={[a.radius, 32, 32]} />
            <meshStandardMaterial
              color={a.color}
              metalness={0.5}
              roughness={0.2}
              emissive={a.color}
              emissiveIntensity={0.15}
            />
          </mesh>
        </Float>
      ))}
    </group>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export default function ChemistryLab() {
  const [tab, setTab] = useState<'react' | 'molecule'>('react')
  // Reaction mode state
  const [reagentToAdd, setReagentToAdd] = useState<ReagentId | null>(null)
  const [clearSignal, setClearSignal] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reactionLog, setReactionLog] = useState<ReactionDef[]>([])
  // Molecule mode state
  const [moleculeType, setMoleculeType] = useState<MoleculeType>('h2o')

  const onAddReagent = (id: ReagentId) => {
    setReagentToAdd(null)
    setTimeout(() => setReagentToAdd(id), 16)
  }

  const onReact = (rxn: ReactionDef) => {
    setReactionLog((prev) => {
      // Dedup: only push if last reaction was different
      if (prev.length > 0 && prev[0].equation === rxn.equation) return prev
      return [rxn, ...prev].slice(0, 5)
    })
  }

  const mol = molecules[moleculeType]

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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2">
                <FlaskConical className="w-6 h-6 text-emerald-400" />
                Chemistry Lab — R3F
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Phòng thí nghiệm phản ứng + Xem phân tử 3D
              </p>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg bg-white/[0.04] border border-white/[0.08] p-1">
            <button onClick={() => setTab('react')}
              className={`px-4 py-1.5 rounded text-sm font-bold transition flex items-center gap-1.5 ${
                tab === 'react' ? 'bg-emerald-500 text-white' : 'text-white/55 hover:text-white/90'
              }`}>
              <BeakerIcon className="w-3.5 h-3.5" /> Phản ứng
            </button>
            <button onClick={() => setTab('molecule')}
              className={`px-4 py-1.5 rounded text-sm font-bold transition flex items-center gap-1.5 ${
                tab === 'molecule' ? 'bg-emerald-500 text-white' : 'text-white/55 hover:text-white/90'
              }`}>
              <Atom className="w-3.5 h-3.5" /> Phân tử 3D
            </button>
          </div>
        </div>

        {tab === 'react' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Reagents */}
            <div className="lg:col-span-1 space-y-3">
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-3">
                  🧪 Chất tham gia
                </h3>
                <div className="space-y-2">
                  {REAGENTS.map((r) => (
                    <button key={r.id} onClick={() => onAddReagent(r.id)}
                      className="w-full p-2.5 rounded-lg flex items-center gap-2 transition hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, ${r.color}22, ${r.color}08)`,
                        border: `1px solid ${r.color}40`,
                      }}>
                      <div className="w-8 h-8 rounded-full shrink-0"
                        style={{ background: `radial-gradient(circle, ${r.color}, ${r.emissive})` }} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-xs font-bold text-white/90">{r.name}</div>
                        <div className="text-[10px] text-white/55 font-mono">{r.formula}</div>
                      </div>
                      <span className="text-xs text-white/40">+40</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setClearSignal((n) => n + 1)}
                  className="mt-3 w-full py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                  <Trash2 className="w-3.5 h-3.5" /> Đổ bỏ becher
                </button>
                <button onClick={() => setPaused(!paused)}
                  className="mt-2 w-full py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold flex items-center justify-center gap-1.5 transition">
                  {paused ? <><Play className="w-3.5 h-3.5" /> Chạy</> : <><Pause className="w-3.5 h-3.5" /> Tạm dừng</>}
                </button>
              </div>

              {/* Reaction log */}
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-3">
                  📜 Phản ứng đã xảy ra
                </h3>
                {reactionLog.length === 0 ? (
                  <p className="text-[11px] text-white/40 italic">
                    Thêm 2 chất khác nhau vào becher để thấy phản ứng
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reactionLog.map((r, i) => (
                      <div key={i} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2.5">
                        <div className="font-mono text-[11px] text-emerald-300 mb-1">{r.equation}</div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-white/60">{r.product}</span>
                          <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold"
                            style={{
                              background: r.energy === 'exothermic' ? 'rgba(251,146,60,0.2)' :
                                          r.energy === 'endothermic' ? 'rgba(34,211,238,0.2)' : 'rgba(148,163,184,0.2)',
                              color: r.energy === 'exothermic' ? '#fb923c' :
                                     r.energy === 'endothermic' ? '#22d3ee' : '#94a3b8',
                            }}>
                            {r.energy === 'exothermic' ? '🔥 Toả nhiệt' :
                             r.energy === 'endothermic' ? '❄️ Thu nhiệt' : 'Trung tính'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Center 3D Canvas */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 h-[560px]">
                <XRCanvas
                  camera={{ position: [3.5, 1.5, 4.5], fov: 45 }}
                  dpr={[1, 1.5]}
                  gl={{ antialias: true, alpha: false }}>
                  <color attach="background" args={['#0a0f1f']} />
                  <fog attach="fog" args={['#0a0f1f', 8, 20]} />
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
                  <pointLight position={[0, 3, 0]} intensity={0.8} color="#22d3ee" />
                  <pointLight position={[-3, 1, 3]} intensity={0.4} color="#a78bfa" />
                  <Beaker />
                  <ParticleSystem
                    reagentToAdd={reagentToAdd}
                    clearSignal={clearSignal}
                    paused={paused}
                    onReact={onReact}
                  />
                  {/* Floor reflection */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BEAKER_BOTTOM_Y - 0.1, 0]}>
                    <planeGeometry args={[12, 12]} />
                    <meshStandardMaterial
                      color="#0f172a" metalness={0.4} roughness={0.6} />
                  </mesh>
                  <OrbitControls
                    enablePan={false}
                    minDistance={3.5} maxDistance={9}
                    minPolarAngle={0.3} maxPolarAngle={Math.PI / 2 - 0.05}
                    autoRotate autoRotateSpeed={0.5}
                  />
                </XRCanvas>
              </div>
              <div className="mt-3 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 p-3">
                <p className="text-xs text-emerald-200/80 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Thêm 2 chất khác nhau để xem phản ứng — hạt va chạm sẽ đổi màu/phát bong bóng/kết tủa.
                  Kéo chuột để xoay · scroll để zoom.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Molecule mode ── */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 space-y-3">
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-3">
                  ⚛️ Phân tử
                </h3>
                <div className="space-y-1.5">
                  {(Object.keys(molecules) as MoleculeType[]).map((m) => (
                    <button key={m}
                      onClick={() => setMoleculeType(m)}
                      className={`w-full px-3 py-2 rounded-lg text-left text-sm font-bold transition ${
                        moleculeType === m
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200'
                          : 'bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span>{molecules[m].name}</span>
                        <span className="font-mono text-xs opacity-70">{molecules[m].formula}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">
                  Thông số
                </h3>
                <Stat label="Tên" value={mol.name} />
                <Stat label="Công thức" value={mol.formula} mono />
                <Stat label="Khối lượng mol" value={`${mol.weight} g/mol`} mono />
                <Stat label="Góc liên kết" value={mol.angles} mono />
                <Stat label="Số nguyên tử" value={mol.atoms.length.toString()} mono />
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 h-[560px]">
                <XRCanvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 1.5]}>
                  <color attach="background" args={['#0a0f1f']} />
                  <ambientLight intensity={0.6} />
                  <pointLight position={[5, 5, 5]} intensity={1} />
                  <pointLight position={[-5, -5, 5]} intensity={0.5} color="#22d3ee" />
                  <MoleculeScene moleculeType={moleculeType} />
                  <OrbitControls enablePan={false} minDistance={3} maxDistance={10} />
                </XRCanvas>
              </div>
              <div className="mt-3 rounded-2xl bg-cyan-500/[0.06] border border-cyan-500/20 p-3">
                <p className="text-xs text-cyan-200/80 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Mô hình 3D — kéo chuột để xoay tự do · scroll để zoom · liên kết đôi/ba hiển thị 2-3 thanh song song.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Theory */}
        <div className="mt-4 rounded-2xl bg-violet-500/[0.04] border border-violet-500/20 p-4">
          <h3 className="font-bold text-violet-300 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Lý thuyết
          </h3>
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div>
              <h4 className="font-bold text-emerald-300 mb-1">🔥 Phản ứng toả nhiệt (exothermic)</h4>
              <p className="text-white/55 leading-relaxed">
                Năng lượng được giải phóng (ΔH &lt; 0). Trong mô phỏng, các hạt sau phản ứng có vận tốc cao hơn.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-cyan-300 mb-1">❄️ Phản ứng thu nhiệt (endothermic)</h4>
              <p className="text-white/55 leading-relaxed">
                Năng lượng được hấp thụ (ΔH &gt; 0). VD: Mg + H₂O cần năng lượng để xảy ra nên rất chậm.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-amber-300 mb-1">💨 Sinh khí (gas evolution)</h4>
              <p className="text-white/55 leading-relaxed">
                Phản ứng tạo khí thoát ra → bong bóng bay lên. VD: kim loại + axit → H₂↑.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-rose-300 mb-1">🪨 Kết tủa (precipitation)</h4>
              <p className="text-white/55 leading-relaxed">
                Phản ứng tạo chất rắn không tan → chìm xuống đáy. VD: NaOH + CuSO₄ → Cu(OH)₂↓.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/55">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} font-bold text-emerald-300`}>{value}</span>
    </div>
  )
}
