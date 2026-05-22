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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Vector3, Color, Group, type Mesh } from 'three'
import { type KgNode, type KgEdge, getNodeColor, NODE_TYPE_LABELS } from '@/services/knowledge-graph.service'
import { Target, Info, X } from 'lucide-react'
import { sfxBubblePop, sfxWhoosh, sfxChime } from '@/lib/kgAudio'

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

      {/* Nodes as glowing spheres
          Label policy 3D (sau khi user phản hồi):
          - CHỈ hiện label cho: center (luôn) + selected (đang chọn) + hover
          - KHÔNG hiện label "always" cho Subject/Chapter — tránh clutter
            với graph 100+ nodes. Click node → popup hiển thị info đầy đủ. */}
      {pNodes.map(n => {
        const isSelected = selectedId === n.id
        return (
          <NodeSphere
            key={n.id}
            node={n}
            hovered={hoveredId === n.id}
            selected={isSelected}
            onHover={(h) => setHoveredId(h ? n.id : null)}
            // Click = chỉ setSelectedId → trigger popup. KHÔNG còn auto
            // open detail panel; user phải bấm nút trong popup mới mở.
            onClick={() => onSelect(n.id)}
            showLabel={!!showLabels && (n.isCenter || isSelected || hoveredId === n.id)}
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
  // Bubble pop effect — when user clicks node, scale up + fade out then back
  const [popping, setPopping] = useState(false)
  const popStartRef = useRef(0)
  const popRingRef = useRef<Mesh>(null)
  const [hovTime, setHovTime] = useState(0)

  // Trigger bubble pop animation + SFX
  const handleClick = useCallback(() => {
    sfxBubblePop(0.35)
    setPopping(true)
    popStartRef.current = performance.now()
    // Callback ngay (user feedback nhanh), animation chạy tiếp tục độc lập
    onClick()
    // Reset sau 600ms
    setTimeout(() => setPopping(false), 600)
  }, [onClick])

  const handleHover = useCallback((h: boolean) => {
    if (h && performance.now() - hovTime > 200) {
      // Hover sound — chỉ trigger nếu cách lần trước >200ms (anti-spam)
      sfxWhoosh(0.08)
      setHovTime(performance.now())
    }
    onHover(h)
  }, [onHover, hovTime])

  useFrame((_, dt) => {
    if (!meshRef.current) return
    meshRef.current.position.copy(node.pos)

    // BUBBLE POP animation (cao nhất priority)
    if (popping) {
      const elapsed = (performance.now() - popStartRef.current) / 600  // 0→1
      if (elapsed < 0.4) {
        // Phase 1 (0-40%): scale up 1.0 → 2.0 (expand như bong bóng phình)
        const t = elapsed / 0.4
        meshRef.current.scale.setScalar(1 + t * 1.0)
      } else {
        // Phase 2 (40-100%): scale back 2.0 → 1.2 + spring oscillation
        const t = (elapsed - 0.4) / 0.6
        const spring = Math.sin(t * Math.PI * 3) * (1 - t) * 0.15
        meshRef.current.scale.setScalar(2 - t * 0.8 + spring)
      }
    } else if (node.isCenter) {
      const scale = 1 + Math.sin(performance.now() / 600) * 0.08
      meshRef.current.scale.setScalar(scale)
    } else if (selected) {
      const scale = 1.3 + Math.sin(performance.now() / 400) * 0.1
      meshRef.current.scale.setScalar(scale)
    } else if (hovered) {
      meshRef.current.scale.lerp({ x: 1.4, y: 1.4, z: 1.4 } as any, dt * 8)
    } else {
      meshRef.current.scale.lerp({ x: 1, y: 1, z: 1 } as any, dt * 8)
    }

    // Bubble pop SHOCKWAVE ring (lan toả ra ngoài)
    if (popRingRef.current && popping) {
      const elapsed = (performance.now() - popStartRef.current) / 600
      popRingRef.current.position.copy(node.pos)
      popRingRef.current.scale.setScalar(1 + elapsed * 3)  // 1× → 4×
      const mat = (popRingRef.current.material as any)
      if (mat) mat.opacity = Math.max(0, 0.8 - elapsed)
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

      {/* BUBBLE POP SHOCKWAVE — lan toả khi click node */}
      {popping && (
        <mesh ref={popRingRef}>
          <torusGeometry args={[node.radius * 1.3, node.radius * 0.15, 8, 32]} />
          <meshBasicMaterial color={node.color} transparent opacity={0.8} toneMapped={false} depthWrite={false} />
        </mesh>
      )}

      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); handleHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { handleHover(false); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); handleClick() }}
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
            // KHÔNG dùng `distanceFactor` — vì ở Z=110, scale = factor/110
            // sẽ làm chữ chỉ còn ~2px (vô hình). Loại bỏ → label luôn
            // hiển thị ở pixel size cố định, đảm bảo đọc được mọi góc nhìn.
            position={[0, node.radius + 2, 0]}
            center
            zIndexRange={[100, 0]}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <div
              className="rounded-lg whitespace-nowrap shadow-2xl"
              style={{
                padding: node.isCenter ? '6px 14px' : selected ? '5px 12px' : '3px 9px',
                background: node.isCenter
                  ? 'linear-gradient(135deg, rgba(8,8,40,0.96), rgba(20,5,40,0.96))'
                  : selected ? 'rgba(20,5,40,0.95)' : 'rgba(0,0,0,0.92)',
                border: node.isCenter
                  ? `2px solid #${node.color.getHexString()}`
                  : `1.5px solid #${node.color.getHexString()}`,
                boxShadow: node.isCenter
                  ? `0 0 16px #${node.color.getHexString()}, 0 0 32px rgba(255,255,255,0.15)`
                  : selected ? `0 0 10px #${node.color.getHexString()}` : undefined,
                // Fixed pixel size — luôn đọc được, không co theo distance
                fontSize: node.isCenter ? 16 : selected ? 13 : (hovered ? 12 : 11),
                fontWeight: 700,
                color: '#fff',
                textShadow: `0 0 6px #${node.color.getHexString()}, 0 2px 4px rgba(0,0,0,0.9)`,
                letterSpacing: '0.3px',
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
    sfxChime(0.3)  // Chime nhẹ khi "dive into" node mới
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

      {/* ════════ NODE INFO POPUP — hiện khi click 1 node ════════
          Thay vì auto-mở sidebar detail (cũ), giờ hiện popup gọn ở giữa
          phía dưới, user chọn hành động tiếp theo bằng nút. */}
      {selectedNode && (
        <NodeInfoPopup
          node={selectedNode}
          isCenter={selectedId === centerId}
          onFocusCenter={handleFocusCenter}
          onOpenDetail={() => { onNodeClick?.(selectedNode.id) }}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Note: KgAudioPlayer ở component cha KnowledgeGraph.tsx
          để nhạc liên tục khi toggle 2D ↔ 3D. */}

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

/* ──────────────── Node Info Popup ────────────────
 * Hiện ở bottom-center của canvas khi user click 1 node.
 * Cung cấp 3 hành động chính:
 *   - 🎯 Đưa làm tâm (re-load graph centered ở node này)
 *   - ℹ Mở chi tiết (gọi parent.onNodeClick → mở sidebar detail panel)
 *   - ✕ Đóng (bỏ chọn)
 * Bấm ESC ngoài popup hoặc nút ✕ để đóng.
 */
function NodeInfoPopup({
  node, isCenter, onFocusCenter, onOpenDetail, onClose,
}: {
  node: KgNode
  isCenter: boolean
  onFocusCenter: () => void
  onOpenDetail: () => void
  onClose: () => void
}) {
  const colors = getNodeColor(node.type)
  const typeLabel = NODE_TYPE_LABELS[node.type] || node.type

  return (
    <>
    {/* Keyframes inline — không cần plugin animate ngoài */}
    <style>{`
      @keyframes kgPopupIn {
        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `}</style>
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-12 z-30
                 w-[min(440px,calc(100%-24px))]
                 rounded-2xl shadow-2xl border-2 backdrop-blur-lg"
      style={{
        background: 'linear-gradient(135deg, rgba(10,8,30,0.97), rgba(20,8,40,0.97))',
        borderColor: colors.stroke,
        boxShadow: `0 0 30px ${colors.stroke}40, 0 20px 60px rgba(0,0,0,0.8)`,
        animation: 'kgPopupIn 0.2s ease-out',
      }}
    >
      {/* Top accent strip */}
      <div
        className="h-1 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${colors.stroke}, transparent)` }}
      />

      {/* Body */}
      <div className="p-4 pb-3">
        {/* Header: type badge + close */}
        <div className="flex items-start gap-2 mb-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0"
            style={{
              background: colors.fill,
              color: colors.text,
              border: `1px solid ${colors.stroke}`,
            }}
          >
            {typeLabel}
          </span>
          {isCenter && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md
                             bg-emerald-500/20 text-emerald-200 border border-emerald-400/50
                             uppercase tracking-wider shrink-0">
              🎯 Đang là tâm
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition shrink-0"
            title="Đóng (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Label */}
        <h3
          className="text-lg font-extrabold leading-tight mb-1.5"
          style={{ color: colors.text }}
        >
          {node.label}
        </h3>

        {/* Description */}
        {node.description ? (
          <p className="text-xs text-zinc-300/90 leading-relaxed mb-3 line-clamp-4">
            {node.description}
          </p>
        ) : (
          <p className="text-xs text-zinc-500 italic mb-3">
            (Chưa có mô tả — bấm "Mở chi tiết" để xem các liên kết)
          </p>
        )}

        {/* Properties row (compact) */}
        {node.properties && Object.keys(node.properties).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(node.properties).slice(0, 4).map(([k, v]) => (
              <span key={k} className="text-[9px] font-mono px-1.5 py-0.5 rounded
                                       bg-zinc-800/70 border border-zinc-700/50 text-zinc-300">
                {k}: {typeof v === 'object' ? JSON.stringify(v).slice(0, 20) : String(v).slice(0, 20)}
              </span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2">
          <button
            onClick={onFocusCenter}
            disabled={isCenter}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition
                        inline-flex items-center justify-center gap-1.5
                        ${isCenter
                          ? 'bg-zinc-700/40 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                          : 'bg-amber-500/90 hover:bg-amber-500 text-white border-2 border-amber-300/50 hover:scale-[1.02] shadow-lg'
                        }`}
            title={isCenter ? 'Node này đã là tâm' : 'Đưa node này thành tâm (phím F)'}
          >
            <Target className="w-3.5 h-3.5" />
            {isCenter ? 'Đang là tâm' : 'Đưa làm tâm'}
          </button>
          <button
            onClick={onOpenDetail}
            className="flex-1 px-3 py-2 rounded-lg bg-cyan-500/90 hover:bg-cyan-500 text-white
                       text-xs font-bold transition border-2 border-cyan-300/50 hover:scale-[1.02] shadow-lg
                       inline-flex items-center justify-center gap-1.5"
            title="Mở chi tiết đầy đủ (sidebar phải)"
          >
            <Info className="w-3.5 h-3.5" />
            Mở chi tiết
          </button>
        </div>

        {/* ID footer (debug, small) */}
        <div className="mt-2 text-[9px] text-zinc-600 font-mono truncate">
          id: {node.id}
        </div>
      </div>
    </div>
    </>
  )
}
