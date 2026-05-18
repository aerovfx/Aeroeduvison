/**
 * KnowledgeGraph3D — 3D neural-network-style visualization của KG.
 *
 * Cảm hứng: mạng neuron + nervous system. Center node là tâm, các node
 * khác xếp 3D quanh bằng force-directed layout. Edges như synapses.
 * Bloom postprocessing tạo hiệu ứng neuron phát sáng.
 *
 * Stack: @react-three/fiber + drei (OrbitControls, Stars) +
 *       @react-three/postprocessing (Bloom)
 *
 * Force simulation: simple custom (O(n²) repulsion — fine ≤300 nodes).
 * - Repulsion: F = k_rep / d² between all pairs
 * - Attraction: F = k_attr * d for edges (spring)
 * - Center node pinned at origin
 * - Damping 0.85/step, run 200 iterations on data change
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Vector3, Color, Group, type Mesh } from 'three'
import { type KgNode, type KgEdge, getNodeColor } from '@/services/knowledge-graph.service'

interface Props {
  nodes: KgNode[]
  edges: KgEdge[]
  centerId: string
  onNodeClick?: (id: string) => void
  /** Nếu set, hover node hiển thị label */
  showLabels?: boolean
}

interface PositionedNode extends KgNode {
  pos: Vector3
  vel: Vector3
  radius: number
  color: Color
  isCenter: boolean
}

/* ────────────────────────── Force simulation ────────────────────────── */

function nodeRadius3D(type: string, isCenter: boolean): number {
  if (isCenter) return 5
  switch (type) {
    case 'Subject':     return 4.5
    case 'Chapter':     return 3.8
    case 'Application': return 3.5
    case 'Phenomenon':  return 3.2
    case 'Topic':       return 3
    case 'Career':      return 2.8
    case 'Concept':     return 2.5
    case 'Formula':     return 2.5
    default:            return 2.5
  }
}

function colorForType(type: string): Color {
  // Map từ NODE_TYPE_COLORS stroke (vibrant hex) → Three.js Color
  const c = getNodeColor(type)
  return new Color(c.stroke)
}

/** Init positions: center at origin, others random sphere R~50 */
function initPositions(nodes: KgNode[], centerId: string): PositionedNode[] {
  return nodes.map(n => {
    const isCenter = n.id === centerId
    const pos = isCenter
      ? new Vector3(0, 0, 0)
      : (() => {
          // Random on sphere surface radius 50
          const phi = Math.acos(2 * Math.random() - 1)
          const theta = 2 * Math.PI * Math.random()
          const r = 50 + (Math.random() - 0.5) * 20
          return new Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
          )
        })()
    return {
      ...n,
      pos,
      vel: new Vector3(0, 0, 0),
      radius: nodeRadius3D(n.type, isCenter),
      color: colorForType(n.type),
      isCenter,
    }
  })
}

/** 1 step force simulation. Mutates positions in place. */
function stepForces(
  pNodes: PositionedNode[],
  edges: KgEdge[],
  dt: number,
) {
  const K_REP = 800   // repulsion strength
  const K_ATTR = 0.02 // spring constant
  const REST_LEN = 18 // ideal edge length
  const DAMPING = 0.85

  // Build edge lookup once per step
  const edgeMap = new Map<string, PositionedNode[]>()
  for (const n of pNodes) edgeMap.set(n.id, [])
  for (const e of edges) {
    const a = pNodes.find(n => n.id === e.from_id)
    const b = pNodes.find(n => n.id === e.to_id)
    if (a && b) {
      edgeMap.get(a.id)!.push(b)
      edgeMap.get(b.id)!.push(a)
    }
  }

  // Compute forces
  for (let i = 0; i < pNodes.length; i++) {
    const a = pNodes[i]
    if (a.isCenter) continue // pin center
    const force = new Vector3(0, 0, 0)

    // Repulsion from all other nodes (O(n²))
    for (let j = 0; j < pNodes.length; j++) {
      if (i === j) continue
      const b = pNodes[j]
      const diff = new Vector3().subVectors(a.pos, b.pos)
      const d = Math.max(2, diff.length())
      const f = K_REP / (d * d)
      force.add(diff.normalize().multiplyScalar(f))
    }

    // Attraction along edges (spring)
    const neighbors = edgeMap.get(a.id) || []
    for (const b of neighbors) {
      const diff = new Vector3().subVectors(b.pos, a.pos)
      const d = diff.length()
      const f = K_ATTR * (d - REST_LEN)
      force.add(diff.normalize().multiplyScalar(f))
    }

    // Pull lightly toward center (prevent drift to infinity)
    const distFromCenter = a.pos.length()
    if (distFromCenter > 80) {
      force.add(a.pos.clone().normalize().multiplyScalar(-0.5))
    }

    // Update velocity + position
    a.vel.add(force.multiplyScalar(dt))
    a.vel.multiplyScalar(DAMPING)
    // Clamp velocity for stability
    const speed = a.vel.length()
    if (speed > 8) a.vel.multiplyScalar(8 / speed)
    a.pos.add(a.vel.clone().multiplyScalar(dt))
  }
}

/* ────────────────────────── Three.js scene ────────────────────────── */

function NeuralNetwork({ nodes, edges, centerId, onNodeClick, showLabels }: Props) {
  const groupRef = useRef<Group>(null)
  const [pNodes, setPNodes] = useState<PositionedNode[]>(() =>
    initPositions(nodes, centerId)
  )
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [stepsRemaining, setStepsRemaining] = useState(200) // pre-cook layout

  // Re-init when nodes change
  useEffect(() => {
    setPNodes(initPositions(nodes, centerId))
    setStepsRemaining(200)
  }, [nodes, centerId])

  useFrame((_, dt) => {
    if (stepsRemaining > 0) {
      // Pre-cook: multiple steps per frame để layout settle nhanh
      const stepsThisFrame = Math.min(stepsRemaining, 4)
      for (let i = 0; i < stepsThisFrame; i++) {
        stepForces(pNodes, edges, dt * 60) // normalize dt
      }
      setStepsRemaining(s => s - stepsThisFrame)
    } else {
      // Continue simulating gently for interactive feel
      stepForces(pNodes, edges, dt * 30)
    }

    // Update group rotation slightly for cinematic feel (auto-rotate)
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Edges as glowing lines */}
      <group>
        {edges.map(e => {
          const a = pNodes.find(n => n.id === e.from_id)
          const b = pNodes.find(n => n.id === e.to_id)
          if (!a || !b) return null
          const isHovered = hoveredId === a.id || hoveredId === b.id
          return <EdgeLine
            key={e.id}
            from={a.pos}
            to={b.pos}
            color={isHovered ? '#ffffff' : '#475569'}
            opacity={isHovered ? 0.8 : 0.25}
          />
        })}
      </group>

      {/* Nodes as glowing spheres */}
      {pNodes.map(n => (
        <NodeSphere
          key={n.id}
          node={n}
          hovered={hoveredId === n.id}
          onHover={(h) => setHoveredId(h ? n.id : null)}
          onClick={() => onNodeClick?.(n.id)}
          showLabel={!!showLabels && (n.isCenter || hoveredId === n.id)}
        />
      ))}
    </group>
  )
}

/** Edge as a thin line segment với glow */
function EdgeLine({ from, to, color, opacity }: {
  from: Vector3; to: Vector3; color: string; opacity: number
}) {
  const ref = useRef<any>(null)
  useFrame(() => {
    if (ref.current) {
      ref.current.geometry.setFromPoints([from, to])
    }
  })
  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  )
}

/** Node as glowing sphere với label on hover */
function NodeSphere({ node, hovered, onHover, onClick, showLabel }: {
  node: PositionedNode
  hovered: boolean
  onHover: (h: boolean) => void
  onClick: () => void
  showLabel: boolean
}) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, dt) => {
    if (!meshRef.current) return
    meshRef.current.position.copy(node.pos)
    // Pulse center node
    if (node.isCenter) {
      const scale = 1 + Math.sin(performance.now() / 600) * 0.08
      meshRef.current.scale.setScalar(scale)
    } else if (hovered) {
      meshRef.current.scale.lerp({ x: 1.4, y: 1.4, z: 1.4 } as any, dt * 8)
    } else {
      meshRef.current.scale.lerp({ x: 1, y: 1, z: 1 } as any, dt * 8)
    }
  })

  return (
    <mesh
      ref={meshRef}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { onHover(false); document.body.style.cursor = '' }}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <sphereGeometry args={[node.radius, 16, 16]} />
      <meshStandardMaterial
        color={node.color}
        emissive={node.color}
        emissiveIntensity={node.isCenter ? 2.5 : hovered ? 2 : 1.2}
        toneMapped={false}
      />
      {showLabel && (
        <Html
          distanceFactor={40}
          position={[0, node.radius + 2, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-2 py-0.5 rounded-md bg-black/80 border border-white/30 text-white text-[10px] font-bold whitespace-nowrap shadow-xl"
            style={{ color: '#' + node.color.getHexString() }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </mesh>
  )
}

/* ────────────────────────── Main export ────────────────────────── */

export default function KnowledgeGraph3D({
  nodes, edges, centerId, onNodeClick, showLabels = true,
}: Props) {
  // Memoize to avoid re-render thrash
  const memoNodes = useMemo(() => nodes, [nodes.length, nodes.map(n => n.id).join(',')])
  const memoEdges = useMemo(() => edges, [edges.length, edges.map(e => e.id).join(',')])

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-zinc-800">
      <Canvas
        camera={{ position: [0, 0, 150], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={0.3} />
        <pointLight position={[100, 100, 100]} intensity={0.5} color="#a78bfa" />
        <pointLight position={[-100, -50, -100]} intensity={0.3} color="#22d3ee" />

        <Stars
          radius={300}
          depth={60}
          count={2000}
          factor={4}
          saturation={0.5}
          fade
          speed={0.5}
        />

        <NeuralNetwork
          nodes={memoNodes}
          edges={memoEdges}
          centerId={centerId}
          onNodeClick={onNodeClick}
          showLabels={showLabels}
        />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          autoRotate={false}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={30}
          maxDistance={400}
        />

        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>

      {/* Overlay hint */}
      <div className="absolute bottom-3 left-3 text-[10px] text-white/50 leading-tight pointer-events-none">
        🖱 Kéo: xoay · 🖱 Cuộn: zoom · 🖱 Phải: pan · Click node để focus
      </div>
      <div className="absolute top-3 left-3 text-[10px] text-cyan-300 font-bold pointer-events-none">
        🧠 3D Neural · {memoNodes.length} nodes · {memoEdges.length} edges
      </div>
    </div>
  )
}
