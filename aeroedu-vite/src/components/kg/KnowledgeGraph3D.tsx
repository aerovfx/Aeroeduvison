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
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Vector3, Color, Group, type Mesh } from 'three'
import { type KgNode, type KgEdge, getNodeColor } from '@/services/knowledge-graph.service'

interface Props {
  nodes: KgNode[]
  edges: KgEdge[]
  centerId: string
  onNodeClick?: (id: string) => void
  /**
   * Khi user bấm F hoặc nút "F Focus": gọi callback này với ID node
   * vừa chọn → parent sẽ re-load graph với node đó làm trung tâm.
   */
  onFocusCenter?: (id: string) => void
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
  if (isCenter) return 7  // ↑ from 5 — center phải nổi bật rõ ràng
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

function NeuralNetwork({
  nodes, edges, centerId, onNodeClick, showLabels,
  selectedId, onSelect, autoRotate,
}: Props & {
  selectedId: string | null
  onSelect: (id: string) => void
  autoRotate: boolean
}) {
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
    }
    // SAU pre-cook: KHÔNG chạy thêm force — layout đứng yên cho dễ điều hướng.
    // (Trước: chạy gentle 30 → node trôi liên tục → khó click)

    // Auto-rotation OPTIONAL — mặc định OFF, user bật khi muốn cinematic view.
    // Trước: bật mặc định → user mất phương hướng khi tìm node trung tâm.
    if (autoRotate && groupRef.current) {
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
      {pNodes.map(n => {
        // Hiển thị label cho các node quan trọng (Subject/Chapter/Application/
        // Phenomenon), không chỉ hover. Topic/Concept/Formula nhỏ hơn — chỉ
        // show label khi hover để không clutter.
        const importantTypes = ['Subject', 'Chapter', 'Application', 'Phenomenon']
        const alwaysShowLabel = importantTypes.includes(n.type)
        const isSelected = selectedId === n.id
        return (
          <NodeSphere
            key={n.id}
            node={n}
            hovered={hoveredId === n.id}
            selected={isSelected}
            onHover={(h) => setHoveredId(h ? n.id : null)}
            onClick={() => { onSelect(n.id); onNodeClick?.(n.id) }}
            showLabel={!!showLabels && (n.isCenter || isSelected || alwaysShowLabel || hoveredId === n.id)}
          />
        )
      })}
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
function NodeSphere({ node, hovered, selected, onHover, onClick, showLabel }: {
  node: PositionedNode
  hovered: boolean
  selected: boolean
  onHover: (h: boolean) => void
  onClick: () => void
  showLabel: boolean
}) {
  const meshRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const haloRef = useRef<Mesh>(null)

  useFrame((_, dt) => {
    if (!meshRef.current) return
    meshRef.current.position.copy(node.pos)
    // Pulse center node
    if (node.isCenter) {
      const scale = 1 + Math.sin(performance.now() / 600) * 0.08
      meshRef.current.scale.setScalar(scale)
    } else if (selected) {
      // Selected: pulse mạnh hơn hover để dễ nhận biết
      const scale = 1.3 + Math.sin(performance.now() / 400) * 0.1
      meshRef.current.scale.setScalar(scale)
    } else if (hovered) {
      meshRef.current.scale.lerp({ x: 1.4, y: 1.4, z: 1.4 } as any, dt * 8)
    } else {
      meshRef.current.scale.lerp({ x: 1, y: 1, z: 1 } as any, dt * 8)
    }
    // Selection ring billboard
    if (ringRef.current && selected && !node.isCenter) {
      ringRef.current.position.copy(node.pos)
      ringRef.current.rotation.z += dt * 1.2
    }
    // Center halo: pulse rộng hơn để dễ tìm trên màn hình
    if (haloRef.current && node.isCenter) {
      haloRef.current.position.copy(node.pos)
      const haloScale = 1 + Math.sin(performance.now() / 800) * 0.15
      haloRef.current.scale.setScalar(haloScale)
    }
  })

  return (
    <>
      {/* HALO cho center node — sphere transparent lớn ngoài cho center luôn dễ thấy */}
      {node.isCenter && (
        <mesh ref={haloRef}>
          <sphereGeometry args={[node.radius * 2.2, 32, 32]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.18}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}

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
          emissiveIntensity={node.isCenter ? 3.5 : selected ? 2.8 : hovered ? 2 : 1.2}
          toneMapped={false}
        />
        {showLabel && (
          <Html
            // distanceFactor nhỏ hơn → label TO hơn ở cùng khoảng cách.
            // Center: 12 (lớn nhất); Selected: 14; còn lại: 18.
            distanceFactor={node.isCenter ? 12 : selected ? 14 : 18}
            position={[0, node.radius + 2, 0]}
            center
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <div
              className="rounded-lg whitespace-nowrap shadow-2xl"
              style={{
                padding: node.isCenter ? '8px 18px' : selected ? '6px 14px' : '4px 10px',
                background: node.isCenter
                  ? 'linear-gradient(135deg, rgba(8,8,40,0.96), rgba(20,5,40,0.96))'
                  : selected ? 'rgba(20,5,40,0.95)' : 'rgba(0,0,0,0.92)',
                border: node.isCenter
                  ? `3px solid #${node.color.getHexString()}`
                  : `2px solid #${node.color.getHexString()}`,
                boxShadow: node.isCenter
                  ? `0 0 20px #${node.color.getHexString()}, 0 0 40px rgba(255,255,255,0.15)`
                  : selected ? `0 0 12px #${node.color.getHexString()}` : undefined,
                fontSize: node.isCenter ? 22 : selected ? 17 : (hovered ? 16 : 14),
                fontWeight: 800,
                color: '#fff',
                textShadow: `0 0 8px #${node.color.getHexString()}, 0 2px 4px rgba(0,0,0,0.9)`,
                letterSpacing: '0.5px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {node.isCenter ? '🎯 ' : (selected ? '✓ ' : '')}{node.label}
            </div>
          </Html>
        )}
      </mesh>

      {/* Selection ring (torus quay quanh node được chọn) */}
      {selected && !node.isCenter && (
        <mesh ref={ringRef}>
          <torusGeometry args={[node.radius * 1.8, 0.25, 8, 32]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      )}
    </>
  )
}

/* ────────────────────────── Main export ────────────────────────── */

/* ──────────────── Camera config ────────────────
 * - Camera ở Z=110 (gần hơn 150 cũ → node trung tâm to hơn)
 * - Target Y=-8 → camera nhìn dưới origin → origin (center node)
 *   appear ở UPPER-MIDDLE viewport, phù hợp rule of thirds.
 * - User cảm thấy center "cao lên ở trung tâm màn hình".
 */
const CAMERA_POS: [number, number, number] = [0, 0, 110]
const CAMERA_TARGET: [number, number, number] = [0, -8, 0]

export default function KnowledgeGraph3D({
  nodes, edges, centerId, onNodeClick, onFocusCenter, showLabels = true,
}: Props) {
  // Memoize to avoid re-render thrash
  const memoNodes = useMemo(() => nodes, [nodes.length, nodes.map(n => n.id).join(',')])
  const memoEdges = useMemo(() => edges, [edges.length, edges.map(e => e.id).join(',')])
  // Ref tới OrbitControls để có thể reset camera khi user click button
  const controlsRef = useRef<any>(null)
  // Trigger reset (counter, mỗi increment = 1 reset call)
  const [resetTick, setResetTick] = useState(0)
  // ID node đang được CHỌN (click trong 3D) — khác với centerId (đã re-load)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Auto-rotate MẶC ĐỊNH OFF — user bật khi muốn cinematic view.
  // Trước đây bật mặc định → user khó tìm node trung tâm.
  const [autoRotate, setAutoRotate] = useState(false)

  // Reset selection khi center thay đổi (vừa re-load graph)
  useEffect(() => { setSelectedId(null) }, [centerId])

  // Label hiển thị tên node đang chọn
  const selectedNode = useMemo(
    () => memoNodes.find(n => n.id === selectedId) || null,
    [memoNodes, selectedId]
  )

  // Tên node center (luôn hiện ở badge để user biết đang ở đâu)
  const centerNode = useMemo(
    () => memoNodes.find(n => n.id === centerId) || null,
    [memoNodes, centerId]
  )

  // F = focus & make-it-center; phím tắt cho power user
  const handleFocusCenter = () => {
    if (!selectedId) return
    if (selectedId === centerId) {
      // Đã là center — chỉ reset camera
      setResetTick(t => t + 1)
      return
    }
    onFocusCenter?.(selectedId)
  }

  // Keyboard: F = focus center, C = camera reset, ESC = clear selection,
  // R = toggle auto-rotate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Bỏ qua nếu user đang gõ trong input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); handleFocusCenter() }
      else if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setResetTick(t => t + 1) }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); setAutoRotate(r => !r) }
      else if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, centerId])

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-zinc-800">
      <Canvas
        camera={{ position: CAMERA_POS, fov: 50 }}
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
          selectedId={selectedId}
          onSelect={setSelectedId}
          autoRotate={autoRotate}
        />

        <OrbitControls
          ref={controlsRef}
          target={CAMERA_TARGET}
          enablePan={false}
          enableZoom
          enableRotate
          autoRotate={false}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          minDistance={20}
          maxDistance={400}
        />
        <CameraResetter resetTick={resetTick} controlsRef={controlsRef} />

        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>

      {/* ════════ Top-left: Center status badge ════════ */}
      <div className="absolute top-3 left-3 max-w-[260px] px-2.5 py-1.5 rounded-lg
                      bg-emerald-500/15 border border-emerald-400/40 text-emerald-200
                      text-[11px] font-semibold shadow-lg backdrop-blur pointer-events-none">
        <div className="text-[9px] text-emerald-300/70 uppercase tracking-wide flex items-center gap-1">
          🎯 Trung tâm
        </div>
        <div className="truncate">{centerNode?.label || centerId}</div>
        <div className="text-[9px] text-emerald-300/60 font-mono mt-0.5">
          {memoNodes.length} nodes · {memoEdges.length} edges
        </div>
      </div>

      {/* ════════ Bottom-left: Keyboard hint (compact 1-line) ════════ */}
      <div className="absolute bottom-2 left-3 text-[10px] text-white/60 leading-tight pointer-events-none">
        🖱 Kéo xoay · Cuộn zoom · Click node ·
        <span className="text-amber-300 font-mono font-bold"> F</span> Focus ·
        <span className="text-cyan-300 font-mono font-bold"> C</span> Reset ·
        <span className="text-purple-300 font-mono font-bold"> R</span> Rotate ·
        <span className="text-zinc-300 font-mono font-bold"> ESC</span> Bỏ chọn
      </div>

      {/* ════════ Selection badge (right side, above F button) ════════ */}
      {selectedNode && (
        <div className="absolute top-16 right-3 max-w-[260px] px-3 py-1.5 rounded-lg
                        bg-amber-500/15 border border-amber-400/50 text-amber-200
                        text-[11px] font-semibold shadow-lg backdrop-blur pointer-events-none">
          <div className="text-[9px] text-amber-300/70 uppercase tracking-wide">✓ Đã chọn</div>
          <div className="truncate">{selectedNode.label}</div>
          <div className="text-[9px] text-amber-300/70 mt-0.5">Bấm F để focus →</div>
        </div>
      )}

      {/* ════════ Top-right toolbar (3 buttons) ════════ */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {/* R: Toggle auto-rotate */}
        <button
          onClick={() => setAutoRotate(r => !r)}
          className={`px-2.5 py-2 rounded-lg border-2 text-xs font-bold shadow-lg
                      inline-flex items-center gap-1 transition hover:scale-105
                      ${autoRotate
                        ? 'bg-purple-500/90 hover:bg-purple-500 border-purple-300/70 text-white'
                        : 'bg-zinc-700/70 hover:bg-zinc-600/70 border-zinc-500/40 text-zinc-200'
                      }`}
          title={autoRotate ? 'Tắt tự xoay (phím R)' : 'Bật tự xoay cinematic (phím R)'}
        >
          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/30 border border-white/20">R</span>
          {autoRotate ? 'Rotating' : 'Rotate'}
        </button>

        {/* F: Focus selected node */}
        <button
          onClick={handleFocusCenter}
          disabled={!selectedId}
          className={`px-2.5 py-2 rounded-lg border-2 text-xs font-bold shadow-lg
                      inline-flex items-center gap-1 transition
                      ${selectedId
                        ? 'bg-amber-500/90 hover:bg-amber-500 border-amber-300/70 text-white hover:scale-105'
                        : 'bg-zinc-700/60 border-zinc-600/40 text-zinc-400 cursor-not-allowed opacity-60'
                      }`}
          title={selectedId
            ? `Đưa "${selectedNode?.label}" thành node trung tâm (phím F)`
            : 'Click 1 node trước → bấm F để focus + center'}
        >
          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/30 border border-white/20">F</span>
          Focus
        </button>

        {/* C: Reset camera to center */}
        <button
          onClick={() => setResetTick(t => t + 1)}
          className="px-2.5 py-2 rounded-lg bg-cyan-500/80 hover:bg-cyan-500
                     border-2 border-cyan-300/50 text-white text-xs font-bold shadow-lg
                     inline-flex items-center gap-1 hover:scale-105 transition"
          title="Reset camera về node trung tâm (phím C)"
        >
          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-black/30 border border-white/20">C</span>
          Center
        </button>
      </div>
    </div>
  )
}

/** Internal: reset camera về vị trí mặc định khi resetTick tăng. */
function CameraResetter({ resetTick, controlsRef }: {
  resetTick: number
  controlsRef: React.MutableRefObject<any>
}) {
  const { camera } = useThree()
  useEffect(() => {
    if (resetTick === 0) return
    // Reset camera position + orbit target về preset (push center node lên upper-middle)
    camera.position.set(CAMERA_POS[0], CAMERA_POS[1], CAMERA_POS[2])
    camera.lookAt(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2])
    if (controlsRef.current) {
      controlsRef.current.target.set(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2])
      controlsRef.current.update()
    }
  }, [resetTick, camera, controlsRef])
  return null
}
