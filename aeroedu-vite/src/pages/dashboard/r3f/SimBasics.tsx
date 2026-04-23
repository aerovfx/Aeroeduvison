import { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 7], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <SpinningBox position={[-2.2, 0, 0]} color="#61dafb" />
      <SpinningBox position={[0, 0, 0]} color="#10b981" />
      <SpinningBox position={[2.2, 0, 0]} color="#f59e0b" />

      <OrbitControls autoRotate autoRotateSpeed={0.5} />
    </Canvas>
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
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 6], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <WaterMolecule />

      <OrbitControls />
    </Canvas>
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
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 6], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 1, 20]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />

      <Stars radius={100} depth={50} count={5000} factor={4} />

      <Beaker position={[-2, 0, 0]} liquidColor="#3b82f6" bubbleCount={5} />
      <Beaker position={[0, 0, 0]} liquidColor="#22c55e" bubbleCount={5} />
      <Beaker position={[2, 0, 0]} liquidColor="#f59e0b" bubbleCount={5} />

      <OrbitControls />
    </Canvas>
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
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 4], fov: 50 }}>
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
    </Canvas>
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
    <Canvas style={canvasStyle} camera={{ position: [0, 0.5, 4], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <spotLight position={[3, 3, 3]} intensity={1.5} angle={0.5} penumbra={1} />

      <Float speed={1.5} floatIntensity={0.5} rotationIntensity={0.3}>
        <ShoeDisplay />
      </Float>

      <Environment preset="studio" />
      <OrbitControls />
    </Canvas>
  )
}

// ============================================================================
// 6. DNA HELIX SIMULATION
// ============================================================================

function DNAHelix() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003
    }
  })

  const strand1Positions: [number, number, number][] = []
  const strand2Positions: [number, number, number][] = []
  const radius = 1.2

  for (let t = 0; t < 20; t++) {
    const angle = t * (Math.PI / 3)
    const x1 = radius * Math.cos(angle)
    const z1 = radius * Math.sin(angle)
    const y1 = t * 0.3 - 3

    const x2 = radius * Math.cos(angle + Math.PI)
    const z2 = radius * Math.sin(angle + Math.PI)
    const y2 = t * 0.3 - 3

    strand1Positions.push([x1, y1, z1])
    strand2Positions.push([x2, y2, z2])
  }

  return (
    <group ref={groupRef}>
      {/* Strand 1 */}
      {strand1Positions.map((pos, i) => (
        <mesh key={`s1-${i}`} position={pos}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#ef4444' : '#3b82f6'}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* Strand 2 */}
      {strand2Positions.map((pos, i) => (
        <mesh key={`s2-${i}`} position={pos}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#22c55e' : '#f59e0b'}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      ))}

      {/* Base pair connections */}
      {strand1Positions.map((pos1, i) => {
        const pos2 = strand2Positions[i]
        const midX = (pos1[0] + pos2[0]) / 2
        const midY = (pos1[1] + pos2[1]) / 2
        const midZ = (pos1[2] + pos2[2]) / 2
        const dist = Math.hypot(
          pos2[0] - pos1[0],
          pos2[1] - pos1[1],
          pos2[2] - pos1[2]
        )
        const angle = Math.atan2(
          Math.hypot(pos2[0] - pos1[0], pos2[2] - pos1[2]),
          pos2[1] - pos1[1]
        )

        return (
          <mesh
            key={`bp-${i}`}
            position={[midX, midY, midZ]}
            rotation={[angle, 0, 0]}
          >
            <cylinderGeometry args={[0.06, 0.06, dist, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.2} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

function DnaHelixSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 8], fov: 40 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <DNAHelix />

      <OrbitControls />
    </Canvas>
  )
}

// ============================================================================
// 7. DNA DETAIL SIMULATION
// ============================================================================

function DNADetail() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003
    }
  })

  const strand1Positions: [number, number, number][] = []
  const strand2Positions: [number, number, number][] = []
  const radius = 1.8
  const yStep = 0.8

  for (let t = 0; t < 5; t++) {
    const angle = t * (Math.PI / 3)
    const x1 = radius * Math.cos(angle)
    const z1 = radius * Math.sin(angle)
    const y1 = t * yStep - 1.6

    const x2 = radius * Math.cos(angle + Math.PI)
    const z2 = radius * Math.sin(angle + Math.PI)
    const y2 = t * yStep - 1.6

    strand1Positions.push([x1, y1, z1])
    strand2Positions.push([x2, y2, z2])
  }

  const labels = ['A', 'T', 'G', 'C', 'A']
  const baseColors = ['#ef4444', '#3b82f6', '#22c55e', '#fbbf24', '#ef4444']

  return (
    <group ref={groupRef}>
      {/* Strand 1 with labels */}
      {strand1Positions.map((pos, i) => (
        <group key={`s1-${i}`}>
          <mesh position={pos}>
            <sphereGeometry args={[0.25, 32, 32]} />
            <meshStandardMaterial
              color={baseColors[i]}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
          <Text position={[pos[0] + 0.5, pos[1], pos[2]]} fontSize={0.2} color="white">
            {labels[i]}
          </Text>
        </group>
      ))}

      {/* Strand 2 with labels */}
      {strand2Positions.map((pos, i) => {
        const complementLabel = labels[i] === 'A' ? 'T' : labels[i] === 'T' ? 'A' : labels[i] === 'G' ? 'C' : 'G'
        const complementColor = labels[i] === 'A' || labels[i] === 'T' ? (labels[i] === 'A' ? '#3b82f6' : '#ef4444') : labels[i] === 'G' ? '#fbbf24' : '#22c55e'

        return (
          <group key={`s2-${i}`}>
            <mesh position={pos}>
              <sphereGeometry args={[0.25, 32, 32]} />
              <meshStandardMaterial
                color={complementColor}
                metalness={0.3}
                roughness={0.4}
              />
            </mesh>
            <Text position={[pos[0] - 0.5, pos[1], pos[2]]} fontSize={0.2} color="white">
              {complementLabel}
            </Text>
          </group>
        )
      })}

      {/* Base pair connections */}
      {strand1Positions.map((pos1, i) => {
        const pos2 = strand2Positions[i]
        const midX = (pos1[0] + pos2[0]) / 2
        const midY = (pos1[1] + pos2[1]) / 2
        const midZ = (pos1[2] + pos2[2]) / 2
        const dist = Math.hypot(
          pos2[0] - pos1[0],
          pos2[1] - pos1[1],
          pos2[2] - pos1[2]
        )
        const angle = Math.atan2(
          Math.hypot(pos2[0] - pos1[0], pos2[2] - pos1[2]),
          pos2[1] - pos1[1]
        )

        return (
          <mesh
            key={`bp-${i}`}
            position={[midX, midY, midZ]}
            rotation={[angle, 0, 0]}
          >
            <cylinderGeometry args={[0.08, 0.08, dist, 8]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.2} roughness={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

function DnaDetailSim() {
  return (
    <Canvas style={canvasStyle} camera={{ position: [0, 0, 6], fov: 45 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <DNADetail />

      <OrbitControls />
    </Canvas>
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
    <Canvas style={canvasStyle} camera={{ position: [0, 1, 8], fov: 50 }}>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      <Carousel />

      <OrbitControls />
    </Canvas>
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
