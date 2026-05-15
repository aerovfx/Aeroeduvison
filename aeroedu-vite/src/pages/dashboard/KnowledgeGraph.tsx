/**
 * Knowledge Graph Explorer — /dashboard/knowledge-graph
 *
 * Trang khám phá tri thức dạng đồ thị: HS gõ 1 chủ đề → graph tự
 * hiển thị các khái niệm/công thức/nghề nghiệp liên quan thành mạng
 * lưới trực quan. Force-directed layout (custom physics engine, không
 * cần thư viện D3/react-flow).
 *
 * Tính năng:
 *   - Search bar fuzzy → dropdown autocomplete kết quả
 *   - Click node → mở detail drawer (description + neighbors)
 *   - Click "Mở rộng" → BFS depth+1 từ node đó
 *   - Filter theo type (toggle các loại node hiển thị)
 *   - Drag node để di chuyển + pin
 *   - Scroll để zoom + drag canvas để pan
 *   - Auto-seed Vật lí 11 lần đầu (nếu graph rỗng)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Search, X, Sparkles, RefreshCw, Network, Loader2,
  ZoomIn, ZoomOut, Maximize2, ChevronRight, Info, BookOpen, Wand2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  knowledgeGraphService as kgs,
  NODE_TYPE_COLORS, NODE_TYPE_LABELS, REL_TYPE_LABELS, getNodeColor,
  type KgNode, type KgEdge, type KgNodeType, type KgNeighbor,
} from '@/services/knowledge-graph.service'
import AiExtractModal from '@/components/knowledge-graph/AiExtractModal'

// ─── Physics simulation ───────────────────────────────────────────
interface SimNode extends KgNode {
  x: number; y: number
  vx: number; vy: number
  fx?: number | null; fy?: number | null   // pinned coords
  radius: number
}

const PHYSICS = {
  REPULSION:        2400,   // độ đẩy giữa các node (Coulomb)
  SPRING_K:         0.022,  // độ kéo của edge (Hooke)
  SPRING_LENGTH:    160,    // chiều dài lý tưởng của edge
  CENTERING:        0.0008, // lực kéo về tâm
  DAMPING:          0.85,
  MAX_VELOCITY:     12,
  TICKS_PER_FRAME:  2,
}

function nodeRadius(type: string, isCenter: boolean): number {
  if (isCenter) return 32
  switch (type) {
    case 'Subject': return 30
    case 'Chapter': return 26
    case 'Topic':   return 22
    case 'Career':  return 20
    case 'Concept': return 18
    case 'Formula': return 18
    default:        return 18
  }
}

function initSim(nodes: KgNode[], startId: string, w: number, h: number): SimNode[] {
  const cx = w / 2, cy = h / 2
  return nodes.map((n, i) => {
    const isCenter = n.id === startId
    if (isCenter) {
      return { ...n, x: cx, y: cy, vx: 0, vy: 0, fx: cx, fy: cy, radius: nodeRadius(n.type, true) }
    }
    // Random init xung quanh tâm
    const angle = (i / Math.max(1, nodes.length - 1)) * Math.PI * 2
    const r = 200 + Math.random() * 80
    return {
      ...n,
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      vx: 0, vy: 0,
      fx: null, fy: null,
      radius: nodeRadius(n.type, false),
    }
  })
}

function stepPhysics(nodes: SimNode[], edges: KgEdge[]) {
  const n = nodes.length
  const cx = nodes[0]?.x ?? 0, cy = nodes[0]?.y ?? 0  // dùng node đầu (centered) làm pivot tham khảo

  // Repulsion (O(n²) — OK cho n < 200)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i], b = nodes[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist2 = dx * dx + dy * dy + 0.1
      const dist = Math.sqrt(dist2)
      const force = PHYSICS.REPULSION / dist2
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      if (a.fx == null) { a.vx -= fx; a.vy -= fy }
      if (b.fx == null) { b.vx += fx; b.vy += fy }
    }
  }

  // Attraction along edges (spring)
  const idMap = new Map(nodes.map((n, i) => [n.id, i]))
  for (const e of edges) {
    const ai = idMap.get(e.from_id); const bi = idMap.get(e.to_id)
    if (ai == null || bi == null) continue
    const a = nodes[ai], b = nodes[bi]
    const dx = b.x - a.x, dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
    const force = PHYSICS.SPRING_K * (dist - PHYSICS.SPRING_LENGTH)
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    if (a.fx == null) { a.vx += fx; a.vy += fy }
    if (b.fx == null) { b.vx -= fx; b.vy -= fy }
  }

  // Centering + damping + integrate
  for (const node of nodes) {
    if (node.fx != null && node.fy != null) {
      node.x = node.fx; node.y = node.fy
      node.vx = node.vy = 0
      continue
    }
    node.vx += (cx - node.x) * PHYSICS.CENTERING
    node.vy += (cy - node.y) * PHYSICS.CENTERING
    node.vx *= PHYSICS.DAMPING
    node.vy *= PHYSICS.DAMPING
    // Clamp velocity
    node.vx = Math.max(-PHYSICS.MAX_VELOCITY, Math.min(PHYSICS.MAX_VELOCITY, node.vx))
    node.vy = Math.max(-PHYSICS.MAX_VELOCITY, Math.min(PHYSICS.MAX_VELOCITY, node.vy))
    node.x += node.vx
    node.y += node.vy
  }
}

// ─── Component ───────────────────────────────────────────────────
const VIEWBOX_W = 1200
const VIEWBOX_H = 800

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const simRef = useRef<SimNode[]>([])
  const edgesRef = useRef<KgEdge[]>([])
  const startIdRef = useRef<string>('')
  const [renderTick, setRenderTick] = useState(0)
  const rafRef = useRef<number | null>(null)

  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<KgNode[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)

  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [selectedNode, setSelectedNode] = useState<{ node: KgNode; neighbors: KgNeighbor[] } | null>(null)
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(
    new Set(Object.keys(NODE_TYPE_COLORS))
  )
  const [extractOpen, setExtractOpen] = useState(false)

  // Camera
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragStateRef = useRef<{
    type: 'pan' | 'node' | null
    nodeId?: string
    startX: number
    startY: number
    origPanX?: number
    origPanY?: number
  }>({ type: null, startX: 0, startY: 0 })

  // ── Load initial graph (Subject Vật lí làm tâm) ──
  const loadFromNode = useCallback(async (nodeId: string, depth: number = 2) => {
    setLoading(true)
    try {
      const r = await kgs.expand(nodeId, depth)
      if (r.nodes.length === 0) {
        toast.error('Node không có dữ liệu — thử seed lại')
        return
      }
      simRef.current = initSim(r.nodes, nodeId, VIEWBOX_W, VIEWBOX_H)
      edgesRef.current = r.edges
      startIdRef.current = nodeId
      setSelectedNode(null)
      setRenderTick(t => t + 1)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi load graph')
    } finally {
      setLoading(false)
    }
  }, [])

  const seed = useCallback(async () => {
    if (seeding) return
    setSeeding(true)
    try {
      const r = await kgs.seed()
      toast.success(`Đã seed ${r.nodeCount} nodes + ${r.edgeInserted} edges mới`)
      await loadFromNode('subj-vatli', 2)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi seed')
    } finally {
      setSeeding(false)
    }
  }, [seeding, loadFromNode])

  // Initial mount
  useEffect(() => {
    (async () => {
      try {
        // Thử expand subject Vật lí trước
        const r = await kgs.expand('subj-vatli', 2)
        if (r.nodes.length === 0) {
          // Empty → seed rồi load
          toast('Đang seed dữ liệu lần đầu…', { icon: '🌱' })
          await seed()
        } else {
          simRef.current = initSim(r.nodes, 'subj-vatli', VIEWBOX_W, VIEWBOX_H)
          edgesRef.current = r.edges
          startIdRef.current = 'subj-vatli'
          setLoading(false)
          setRenderTick(t => t + 1)
        }
      } catch (e) {
        toast('Backend chưa sẵn sàng. Bấm "Seed lại" để khởi tạo dữ liệu.', { icon: '⚠️' })
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Physics loop ──
  useEffect(() => {
    let frame = 0
    let lastT = performance.now()
    const tick = () => {
      const now = performance.now()
      lastT = now
      // Run multiple physics ticks per frame
      for (let i = 0; i < PHYSICS.TICKS_PER_FRAME; i++) {
        stepPhysics(simRef.current, edgesRef.current)
      }
      frame++
      // Re-render every 2 frames (~30fps for SVG, OK)
      if (frame % 2 === 0) setRenderTick(t => t + 1)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [])

  // ── Search ──
  useEffect(() => {
    const q = searchQ.trim()
    if (q.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await kgs.search(q, { limit: 10 })
        setSearchResults(r)
      } catch { /* ignore */ }
      finally { setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [searchQ])

  const onPickSearchResult = async (n: KgNode) => {
    setSearchQ('')
    setSearchResults([])
    setSearchOpen(false)
    await loadFromNode(n.id, 2)
  }

  // ── Click node ──
  const onNodeClick = useCallback(async (id: string) => {
    try {
      const r = await kgs.getNode(id)
      setSelectedNode(r)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi tải node')
    }
  }, [])

  // ── Mouse handlers (drag node + pan canvas) ──
  const screenToWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const sx = clientX - rect.left
    const sy = clientY - rect.top
    const wx = (sx / rect.width) * VIEWBOX_W / zoom - pan.x
    const wy = (sy / rect.height) * VIEWBOX_H / zoom - pan.y
    return { x: wx, y: wy }
  }

  const onMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const { x, y } = screenToWorld(e.clientX, e.clientY)
    dragStateRef.current = { type: 'node', nodeId, startX: x, startY: y }
    const node = simRef.current.find(n => n.id === nodeId)
    if (node) { node.fx = node.x; node.fy = node.y }
  }

  const onMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
      dragStateRef.current = {
        type: 'pan',
        startX: e.clientX, startY: e.clientY,
        origPanX: pan.x, origPanY: pan.y,
      }
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    const ds = dragStateRef.current
    if (!ds.type) return
    if (ds.type === 'node' && ds.nodeId) {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const node = simRef.current.find(n => n.id === ds.nodeId)
      if (node) { node.fx = x; node.fy = y; node.x = x; node.y = y }
    } else if (ds.type === 'pan') {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const dx = (e.clientX - ds.startX) / rect.width * VIEWBOX_W / zoom
      const dy = (e.clientY - ds.startY) / rect.height * VIEWBOX_H / zoom
      setPan({ x: (ds.origPanX || 0) + dx, y: (ds.origPanY || 0) + dy })
    }
  }

  const onMouseUp = () => {
    const ds = dragStateRef.current
    // Don't unpin on simple click — user must double-click to release pin
    dragStateRef.current = { type: null, startX: 0, startY: 0 }
  }

  const onDoubleClickNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = simRef.current.find(n => n.id === nodeId)
    if (node) {
      // Toggle pin
      if (node.fx != null) { node.fx = null; node.fy = null; toast('Bỏ ghim', { icon: '📍' }) }
      else { node.fx = node.x; node.fy = node.y; toast('Đã ghim node', { icon: '📌' }) }
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom(z => Math.max(0.3, Math.min(3, z * factor)))
  }

  const expandFromSelected = async () => {
    if (!selectedNode) return
    await loadFromNode(selectedNode.node.id, 2)
  }

  const resetView = () => {
    setZoom(1); setPan({ x: 0, y: 0 })
  }

  // Filtered nodes/edges to render
  const visibleNodes = useMemo(
    () => simRef.current.filter(n => enabledTypes.has(n.type)),
    [renderTick, enabledTypes]
  )
  const visibleEdges = useMemo(() => {
    const visIds = new Set(visibleNodes.map(n => n.id))
    return edgesRef.current.filter(e => visIds.has(e.from_id) && visIds.has(e.to_id))
  }, [renderTick, visibleNodes])

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#0a0612] text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/dashboard" className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <Network className="w-5 h-5 text-cyan-400" />
          <h1 className="font-bold">Knowledge Graph Explorer</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            Đồ thị tri thức · MVP Vật lí 11
          </span>
          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Tìm: động lượng, công thức Newton…"
              className="pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm w-64 focus:outline-none focus:border-cyan-400/50"
            />
            {searchOpen && (searchResults.length > 0 || searching) && (
              <div className="absolute top-full mt-1 right-0 w-80 bg-[#0d0e17] border border-white/15 rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto z-50">
                {searching && (
                  <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tìm…
                  </div>
                )}
                {searchResults.map(n => {
                  const c = getNodeColor(n.type)
                  return (
                    <button
                      key={n.id}
                      onClick={() => onPickSearchResult(n)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 border-b border-white/5 flex items-start gap-2"
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.stroke }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{n.label}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {NODE_TYPE_LABELS[n.type] || n.type}
                        </div>
                        {n.description && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.description}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button onClick={resetView} title="Reset zoom/pan" className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExtractOpen(true)}
            title="AI trích xuất tri thức từ văn bản hoặc giáo án"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-[1.02] inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/25 transition-transform"
          >
            <Wand2 className="w-3.5 h-3.5" /> Trích xuất AI
          </button>
          <button
            onClick={seed}
            disabled={seeding}
            title="Seed lại data Vật lí 11 (idempotent)"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 inline-flex items-center gap-1.5"
          >
            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Seed
          </button>
        </div>
      </header>

      {/* AI Extract Modal */}
      <AiExtractModal
        open={extractOpen}
        onClose={() => setExtractOpen(false)}
        onApplied={async (focusId) => {
          // Sau khi extract xong → load graph với focus node mới
          if (focusId) {
            await loadFromNode(focusId, 2)
            toast.success('Đã chuyển graph đến node mới', { icon: '🎯' })
          } else {
            // Fallback: reload graph hiện tại
            if (startIdRef.current) await loadFromNode(startIdRef.current, 2)
          }
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: legend + filter */}
        <aside className="w-64 border-r border-white/10 bg-black/30 p-3 overflow-y-auto flex-shrink-0 hidden md:block">
          <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Loại node</h3>
          <div className="space-y-1 mb-4">
            {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => {
              const c = NODE_TYPE_COLORS[type]
              const active = enabledTypes.has(type)
              return (
                <button
                  key={type}
                  onClick={() => {
                    setEnabledTypes(s => {
                      const next = new Set(s)
                      if (next.has(type)) next.delete(type); else next.add(type)
                      return next
                    })
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                    active ? 'bg-white/[0.06]' : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.stroke }} />
                  <span className="text-xs text-white/80">{label}</span>
                </button>
              )
            })}
          </div>

          {/* Stats */}
          <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Thống kê</h3>
          <div className="text-xs space-y-1 text-white/70">
            <div>Nodes: <strong className="text-white">{visibleNodes.length}</strong></div>
            <div>Edges: <strong className="text-white">{visibleEdges.length}</strong></div>
            <div>Zoom: <strong className="text-white">{(zoom * 100).toFixed(0)}%</strong></div>
          </div>

          {/* Hint */}
          <div className="mt-4 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-white/70 space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <Info className="w-3.5 h-3.5" /> Cách dùng
            </div>
            <div>• <strong>Kéo node</strong> để di chuyển</div>
            <div>• <strong>Double-click</strong> node để ghim</div>
            <div>• <strong>Click node</strong> để mở chi tiết</div>
            <div>• <strong>Scroll</strong> để zoom</div>
            <div>• <strong>Kéo nền</strong> để pan</div>
            <div>• <strong>Tìm kiếm</strong> → click kết quả → graph tự xoay quanh node đó</div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative overflow-hidden bg-[#06030f]">
          {/* Background grid pattern */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            className="w-full h-full"
            onMouseDown={onMouseDownCanvas}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
            style={{ cursor: dragStateRef.current.type === 'pan' ? 'grabbing' : 'default' }}
          >
            <defs>
              <pattern id="kgGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
              <radialGradient id="centerGlow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="rgba(34,211,238,0.15)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </radialGradient>
              {/* Arrow marker for directed edges */}
              <marker id="kgArrow" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
            </defs>
            <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#kgGrid)" />
            <ellipse cx={VIEWBOX_W / 2} cy={VIEWBOX_H / 2} rx="350" ry="250" fill="url(#centerGlow)" />

            <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
              {/* Edges */}
              {visibleEdges.map(e => {
                const a = simRef.current.find(n => n.id === e.from_id)
                const b = simRef.current.find(n => n.id === e.to_id)
                if (!a || !b) return null
                const midX = (a.x + b.x) / 2
                const midY = (a.y + b.y) / 2
                return (
                  <g key={e.id}>
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="rgba(148,163,184,0.35)"
                      strokeWidth={1.2}
                      markerEnd="url(#kgArrow)"
                    />
                    {/* Edge label (only when zoomed in) */}
                    {zoom > 0.85 && (
                      <text
                        x={midX} y={midY}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {REL_TYPE_LABELS[e.rel_type] || e.rel_type.toLowerCase().replace(/_/g, ' ')}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Nodes */}
              {visibleNodes.map(n => {
                const c = getNodeColor(n.type)
                const isCenter = n.id === startIdRef.current
                const isSelected = selectedNode?.node.id === n.id
                const pinned = n.fx != null && !isCenter
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x}, ${n.y})`}
                    onMouseDown={e => onMouseDownNode(e, n.id)}
                    onDoubleClick={e => onDoubleClickNode(e, n.id)}
                    onClick={() => onNodeClick(n.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Halo glow if center/selected */}
                    {(isCenter || isSelected) && (
                      <circle r={n.radius + 12} fill={c.fill} opacity={0.5}>
                        <animate attributeName="r"
                          values={`${n.radius + 8};${n.radius + 16};${n.radius + 8}`}
                          dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Main circle */}
                    <circle
                      r={n.radius}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={isCenter ? 3 : isSelected ? 2.5 : 1.5}
                    />
                    {/* Pin indicator */}
                    {pinned && (
                      <text x={n.radius - 4} y={-n.radius + 8} fontSize="11" fill="#fbbf24">📌</text>
                    )}
                    {/* Label */}
                    <text
                      y={n.radius + 14}
                      textAnchor="middle"
                      fill={c.text}
                      fontSize={isCenter ? 13 : 11}
                      fontWeight={isCenter ? 700 : 500}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label}
                    </text>
                    {/* Type label inside circle (small) */}
                    {n.radius >= 22 && (
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={c.text}
                        fontSize="9"
                        opacity="0.7"
                        style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {(NODE_TYPE_LABELS[n.type] || n.type).toUpperCase()}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="w-10 h-10 mx-auto mb-2 animate-spin text-cyan-400" />
                <p className="text-sm text-white/70">Đang tải đồ thị tri thức…</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && visibleNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md">
                <Network className="w-16 h-16 mx-auto mb-3 text-cyan-400/40" />
                <h3 className="text-lg font-bold mb-2">Chưa có dữ liệu</h3>
                <p className="text-sm text-white/60 mb-4">Bấm "Seed" trên thanh trên để khởi tạo dữ liệu Vật lí 11.</p>
                <button
                  onClick={seed}
                  disabled={seeding}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-sm font-bold inline-flex items-center gap-2"
                >
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Seed Vật lí 11
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Right: detail drawer */}
        {selectedNode && (
          <aside className="w-80 border-l border-white/10 bg-black/30 p-4 overflow-y-auto flex-shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-1">
                  {NODE_TYPE_LABELS[selectedNode.node.type] || selectedNode.node.type}
                </div>
                <h2 className="text-lg font-bold leading-tight" style={{ color: getNodeColor(selectedNode.node.type).text }}>
                  {selectedNode.node.label}
                </h2>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedNode.node.description && (
              <p className="text-sm text-white/75 leading-relaxed mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/10">
                {selectedNode.node.description}
              </p>
            )}

            {selectedNode.node.properties && Object.keys(selectedNode.node.properties).length > 0 && (
              <div className="mb-4">
                <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Thuộc tính</h3>
                <div className="space-y-1 text-xs bg-white/[0.03] rounded-lg p-3 border border-white/10">
                  {Object.entries(selectedNode.node.properties).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-white/50">{k}</span>
                      <span className="text-white font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={expandFromSelected}
              className="w-full py-2 mb-4 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Network className="w-4 h-4" />
              Lấy node này làm tâm
            </button>

            <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">
              Liên kết ({selectedNode.neighbors.length})
            </h3>
            <div className="space-y-1">
              {selectedNode.neighbors.length === 0 && (
                <p className="text-xs text-white/40 italic">Chưa có liên kết nào</p>
              )}
              {selectedNode.neighbors.map((nb, i) => {
                const c = getNodeColor(nb.type)
                return (
                  <button
                    key={`${nb.id}-${i}`}
                    onClick={() => onNodeClick(nb.id)}
                    className="w-full text-left p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.stroke }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">
                          {nb.direction === 'out' ? '→' : '←'} {REL_TYPE_LABELS[nb.relType] || nb.relType.toLowerCase().replace(/_/g, ' ')}
                        </div>
                        <div className="text-sm font-medium text-white leading-tight">{nb.label}</div>
                        <div className="text-[10px] text-white/40">{NODE_TYPE_LABELS[nb.type] || nb.type}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white" />
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Bottom hint bar */}
      <div className="border-t border-white/10 bg-black/40 px-4 py-2 text-[11px] text-white/40 text-center hidden md:block">
        💡 Mẹo: gõ "động lượng" hoặc "Newton" trên thanh tìm kiếm → click kết quả để xem mạng tri thức xung quanh khái niệm đó
      </div>
    </div>
  )
}
