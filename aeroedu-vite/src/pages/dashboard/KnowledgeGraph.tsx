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
  ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronRight, Info, BookOpen, Wand2,
  Target, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  knowledgeGraphService as kgs,
  NODE_TYPE_COLORS, NODE_TYPE_LABELS, REL_TYPE_LABELS, getNodeColor,
  getMasteryColor,
  type KgNode, type KgEdge, type KgNodeType, type KgNeighbor,
} from '@/services/knowledge-graph.service'
import AiExtractModal from '@/components/knowledge-graph/AiExtractModal'
import { recommendationService as rs } from '@/services/recommendation.service'
import { lazy, Suspense } from 'react'
// Lazy load 3D view — bundle khá lớn vì Three.js
const KnowledgeGraph3D = lazy(() => import('@/components/kg/KnowledgeGraph3D'))
import NodeBrainPanel from '@/components/kg/NodeBrainPanel'
import KgNodeResources from '@/components/kg/KgNodeResources'
import KgHistoryTrail, { useKgHistory } from '@/components/kg/KgHistoryTrail'
import BrainSuggestions from '@/components/kg/BrainSuggestions'
import KgRolePanel from '@/components/kg/KgRolePanel'
import SoftSkillsPanel from '@/components/kg/SoftSkillsPanel'
import NodeExplorer from '@/components/kg/NodeExplorer'
import KgAudioPlayer from '@/components/kg/KgAudioPlayer'
import { sfxBubblePop, sfxChime } from '@/lib/kgAudio'
import { api } from '@/services/api'

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
    case 'Subject':     return 30
    case 'Chapter':     return 26
    case 'Topic':       return 22
    case 'Career':      return 20
    case 'Application': return 20  // ứng dụng — visually prominent
    case 'Phenomenon':  return 19  // hiện tượng
    case 'Concept':     return 18
    case 'Formula':     return 18
    default:            return 18
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
  /** View mode: 2D SVG (default) or 3D neural network (Three.js) */
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  /** Fullscreen mode: mở rộng <main> ra toàn màn hình (HTML5 Fullscreen API) */
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)

  // ── Phase 3: Personal Mastery overlay ─────────────────────────
  const [masteryOn, setMasteryOn] = useState(false)
  const [masteryMap, setMasteryMap] = useState<Record<string, { score: number; attempts: number }>>({})
  const [masteryStats, setMasteryStats] = useState<{
    stats: { total: number; weak: number; learning: number; mastered: number; avgScore: number }
    weakTopics: Array<{ nodeId: string; label: string; type: string; score: number }>
  } | null>(null)
  const [masteryLoading, setMasteryLoading] = useState(false)

  // ── UX redesign: Unified left sidebar with tabs ──
  // Thay cho 2 floating panels (mastery + path), consolidate vào left sidebar
  // có tabs để dễ navigate, ít clutter.
  type SidebarTab = 'filter' | 'mastery' | 'path' | 'help'
  const [activeTab, setActiveTab] = useState<SidebarTab>('filter')

  // Mobile UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  // Compatibility: showMasteryPanel = activeTab === 'mastery'
  const showMasteryPanel = activeTab === 'mastery'
  const setShowMasteryPanel = (v: boolean) => {
    setActiveTab(v ? 'mastery' : 'filter')
  }

  // ── Phase 6: AI Smart Search ─────────────────────────────────
  const [smartOpen, setSmartOpen] = useState(false)
  const [smartQuery, setSmartQuery] = useState('')
  const [smartLoading, setSmartLoading] = useState(false)
  const [smartResult, setSmartResult] = useState<{
    intent: string; explanation: string
    suggestedNodes: KgNode[]; suggestedPathTo: string | null
  } | null>(null)

  // ── Phase 4: Auto Learning Path ───────────────────────────────
  const [pathFinding, setPathFinding] = useState(false)
  const [pathResult, setPathResult] = useState<{
    found: boolean
    fromId: string; toId: string; hops: number
    path: Array<{
      nodeId: string; order: number; label: string; type: string
      description?: string | null; masteryScore: number | null
      relFromPrev: string | null
      estimatedMinutes?: number
    }>
    totalMinutes?: number
    message?: string
  } | null>(null)
  // showPathPanel = activeTab === 'path' (consolidated into tabs)
  const showPathPanel = activeTab === 'path'
  const setShowPathPanel = (v: boolean) => {
    setActiveTab(v ? 'path' : 'filter')
  }
  const [savingAsLP, setSavingAsLP] = useState(false)

  // Set các nodeId đang trong path → highlight gold trên graph
  const pathNodeIds = useMemo(
    () => new Set((pathResult?.path ?? []).map(p => p.nodeId)),
    [pathResult]
  )
  // Set các cặp adjacent trong path → highlight edge gold
  const pathEdgePairs = useMemo(() => {
    const s = new Set<string>()
    const p = pathResult?.path
    if (!p) return s
    for (let i = 0; i < p.length - 1; i++) {
      s.add(`${p[i].nodeId}::${p[i + 1].nodeId}`)
      s.add(`${p[i + 1].nodeId}::${p[i].nodeId}`) // undirected
    }
    return s
  }, [pathResult])

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
      // Phase 5: seed cả 3 môn (Lý + Toán + Hóa + cross-edges)
      const r = await kgs.seedAllSubjects()
      toast.success(`Đã seed ${r.nodeCount} nodes + ${r.edgeInserted} edges mới`)
      await loadFromNode('subj-vatli', 2)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi seed')
    } finally {
      setSeeding(false)
    }
  }, [seeding, loadFromNode])

  /** Phase 3: Fetch mastery map + stats. Gọi khi user bật overlay
   *  hoặc mở mastery panel. */
  const fetchMastery = useCallback(async () => {
    setMasteryLoading(true)
    try {
      const [m, s] = await Promise.all([
        kgs.getMyMastery(),
        kgs.getMasteryStats(),
      ])
      setMasteryMap(
        Object.fromEntries(
          Object.entries(m).map(([k, v]) => [k, { score: v.score, attempts: v.attempts }])
        )
      )
      setMasteryStats({ stats: s.stats, weakTopics: s.weakTopics })
    } catch (e: any) {
      // Auth lỗi → toast gọn (không spam khi user chưa login)
      if (e?.response?.status !== 401) {
        toast.error('Không tải được mastery: ' + (e?.message || 'unknown'))
      }
    } finally {
      setMasteryLoading(false)
    }
  }, [])

  /** Phase 6: Hỏi AI bằng câu NL → AI match nodes + auto-path nếu thích hợp. */
  const handleSmartQuery = useCallback(async () => {
    const q = smartQuery.trim()
    if (q.length < 3) {
      toast.error('Nhập ≥ 3 ký tự')
      return
    }
    setSmartLoading(true)
    setSmartResult(null)
    try {
      const r = await kgs.smartQuery(q, 8)
      setSmartResult(r)
      if (r.suggestedNodes.length === 0) {
        toast('AI không tìm thấy node phù hợp', { icon: '🤔' })
      } else {
        toast.success(`AI tìm được ${r.suggestedNodes.length} node`, { icon: '🪄' })
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Lỗi AI smart query')
    } finally {
      setSmartLoading(false)
    }
  }, [smartQuery])

  /** Phase 7: Đề xuất khái niệm mới (add_node suggestion). */
  const handleSuggestNode = useCallback(async () => {
    const label = window.prompt('Tên khái niệm muốn đề xuất:')
    if (!label || label.trim().length < 2) return
    const description = window.prompt('Mô tả ngắn (tùy chọn):') || ''
    const typeChoice = window.prompt('Loại: Concept / Topic / Formula / Career (default Concept):', 'Concept') || 'Concept'
    try {
      const r = await kgs.submitSuggestion({
        kind: 'add_node',
        payload: { type: typeChoice.trim(), label: label.trim(), description: description.trim() },
        reason: 'Đề xuất từ Knowledge Graph viewer',
      })
      toast.success(r.message, { duration: 5000 })
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Lỗi gửi đề xuất')
    }
  }, [])

  /** Phase 4: Lưu path hiện tại thành LearningPath thật + assign cho user. */
  const savePathAsLP = useCallback(async () => {
    if (!pathResult?.found || pathResult.path.length < 2) return
    setSavingAsLP(true)
    try {
      const last = pathResult.path[pathResult.path.length - 1]
      const first = pathResult.path[0]
      const r = await kgs.savePathAsLearningPath({
        path: pathResult.path,
        name: `Lộ trình KG: ${first.label} → ${last.label}`,
        description: `${pathResult.hops + 1} bước (${pathResult.totalMinutes ?? '?'} phút) - tự sinh từ Knowledge Graph`,
        subject: 'Vật lí 11',
        fromLabel: first.label,
        toLabel: last.label,
      })
      toast.success(
        `✓ Đã tạo lộ trình ${r.modulesCount} module · ${r.totalDuration}p`,
        { duration: 4000 }
      )
      // Sau khi save: mở /learning-paths để user thấy ngay
      setTimeout(() => {
        if (window.confirm(
          `Lộ trình đã lưu thành công!\nMở /learning-paths để bắt đầu học?`
        )) {
          window.location.href = '/learning-paths'
        }
      }, 500)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Không lưu được')
    } finally {
      setSavingAsLP(false)
    }
  }, [pathResult])

  /** Phase 4: Tìm path từ điểm yếu (auto) → node đích. */
  const findPathToNode = useCallback(async (targetNodeId: string) => {
    setPathFinding(true)
    setPathResult(null)
    try {
      const r = await kgs.findPath({
        toId: targetNodeId,
        autoFromWeak: true,
        maxLen: 8,
      })
      setPathResult(r)
      setShowPathPanel(true)
      if (!r.found) {
        toast(`Không tìm thấy lộ trình ≤8 hops`, { icon: '⚠️' })
      } else {
        toast.success(`Tìm thấy path ${r.hops} hops`, { icon: '🛣' })
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Lỗi tìm path')
    } finally {
      setPathFinding(false)
    }
  }, [])

  /** Demo seed: gán mastery ngẫu nhiên cho ~20 node hiện có để user thấy
   *  overlay hoạt động (chỉ dùng nếu user chưa có data nào). */
  const seedDemoMastery = useCallback(async () => {
    const visibleNodeIds = simRef.current
      .filter(n => ['Topic', 'Concept', 'Formula', 'Chapter'].includes(n.type))
      .slice(0, 20)
      .map(n => n.id)
    if (visibleNodeIds.length === 0) {
      toast.error('Chưa có nodes phù hợp để seed mastery demo')
      return
    }
    const updates = visibleNodeIds.map(id => ({
      nodeId: id,
      // Random score nhưng skew theo type cho realistic:
      // Chapter cao hơn (đã học khái quát), Formula thấp hơn (khó nhớ)
      score: Math.round(Math.random() * 100),
      source: 'demo-seed',
    }))
    try {
      const r = await kgs.updateMastery(updates, false)
      toast.success(`Đã seed mastery demo cho ${r.upserted} nodes`)
      await fetchMastery()
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi seed mastery')
    }
  }, [fetchMastery])

  // Phase 3: Fetch mastery khi bật overlay hoặc mở panel
  useEffect(() => {
    if ((masteryOn || showMasteryPanel) && !masteryLoading && Object.keys(masteryMap).length === 0) {
      fetchMastery()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masteryOn, showMasteryPanel])

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

  // ── Fullscreen toggle + state sync ──
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await mainRef.current?.requestFullscreen?.()
      } else {
        await document.exitFullscreen?.()
      }
    } catch {
      // User cancelled or browser denied — không cần báo lỗi
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
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

  // ── KG visit history (đường mòn tri thức) ──
  const kgHistory = useKgHistory()

  // ── Click node ──
  const onNodeClick = useCallback(async (id: string) => {
    try {
      const r = await kgs.getNode(id)
      setSelectedNode(r)
      // Record visit cho đường mòn tri thức
      kgHistory.record({ id: r.node.id, label: r.node.label, type: r.node.type })
      // RS: track click — signal mạnh cho recsys hiểu user quan tâm topic
      rs.track({
        action: 'click',
        targetType: 'kg_node',
        targetId: id,
        metadata: {
          nodeType: r.node.type,
          label: r.node.label,
          neighborCount: r.neighbors.length,
        },
      })
      // KG role-aware: track visit cho stats + auto-append vào workflow recording.
      // Fire-and-forget — silently ignore if endpoint unavailable.
      api.post('/kg/visits', { nodeId: id }).catch(() => {})
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi tải node')
    }
  }, [kgHistory])

  /**
   * Điều hướng tới 1 node = mở detail + LOAD nó làm tâm graph.
   * Dùng cho click sidebar (Brain suggestions, related list, search result, ...)
   * — nơi user mong muốn "nhảy tới" node đó.
   * Khác `onNodeClick` (chỉ mở detail, không re-load graph).
   */
  const onNavigateNode = useCallback(async (id: string) => {
    sfxChime(0.25)  // Chime nhẹ — feedback "dive into" node mới
    await loadFromNode(id, 2)
    await onNodeClick(id)
  }, [loadFromNode, onNodeClick])

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
    sfxBubblePop(0.3)  // 🫧 Pop sound khi click node 2D
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

  /**
   * Double-click 1 node = ĐƯA NÓ THÀNH TÂM GRAPH (re-load với depth 2).
   *
   * Trước đây: double-click = pin/unpin (giữ vị trí cố định trong physics).
   * Pin là feature ít dùng + khó hiểu cho user mới. Giờ đổi sang
   * "centre this node" — UX trực quan hơn, không cần dùng menu phụ.
   *
   * Hotkey thay thế: nếu cần pin, dùng nút trong detail panel (TBD).
   */
  const onDoubleClickNode = async (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    toast(`Đang đưa "${nodeId}" thành tâm…`, { icon: '🎯', duration: 1500 })
    await onNavigateNode(nodeId)
  }

  /**
   * Wheel handler — TÁCH RIÊNG pinch-zoom vs 2-finger drag (trackpad Mac).
   *
   * Trên Mac trackpad:
   *  - Pinch (zoom in/out 2 ngón mở/khép) → wheel event với `ctrlKey=true`
   *    (browser tự synthesize từ pinch gesture của OS)
   *  - 2-finger drag (di chuyển 2 ngón) → wheel event với `ctrlKey=false`,
   *    có cả `deltaX` lẫn `deltaY`
   *
   * Trên mouse:
   *  - Scroll wheel → ctrlKey=false, chỉ deltaY → user mong PAN dọc
   *  - Ctrl+wheel → ctrlKey=true → ZOOM
   *
   * Trước đây: mọi wheel event đều zoom → user drag trackpad bị "zoom phá"
   * Giờ: chỉ pinch/ctrl mới zoom, drag/scroll thì PAN (chuẩn Figma/Miro).
   */
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      // PINCH-ZOOM (trackpad) hoặc Ctrl+wheel (mouse)
      const factor = e.deltaY < 0 ? 1.04 : 0.96  // gentler than 1.1/0.9
      setZoom(z => Math.max(0.3, Math.min(3, z * factor)))
    } else {
      // 2-FINGER DRAG (trackpad) hoặc scroll wheel → PAN canvas
      setPan(p => ({
        x: p.x - e.deltaX / zoom,
        y: p.y - e.deltaY / zoom,
      }))
    }
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
    /* 2026-05-19: Page bg + text theme-aware. Cosmic dark giữ trong .dark
       qua tailwind variant. Light mode: white bg + dark text. SVG canvas
       riêng bên trong giữ dark cosmic luôn (visual exploration). */
    <div className="min-h-screen bg-background text-foreground dark:bg-[#0a0612] dark:text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card/80 dark:bg-black/40 backdrop-blur sticky top-0 z-30">
        {/* ── ROW 1: Back · Title · Search · Reset (responsive) ── */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground shrink-0 p-1.5 -ml-1.5 rounded hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Network className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 hidden sm:block" />
          <div className="min-w-0 flex-1 sm:flex-none">
            <h1 className="font-bold text-sm sm:text-base truncate text-foreground">🌳 Cây Sự Sống Tri Thức</h1>
            <p className="text-[10px] text-cyan-700 dark:text-cyan-300/80 truncate hidden sm:block">
              Mọi khái niệm sinh sôi · kết nối · cùng phát triển
            </p>
          </div>

          <div className="flex-1 hidden sm:block" />

          {/* Search — full width on mobile, fixed width on desktop */}
          <div className="relative flex-1 sm:flex-none max-w-md sm:max-w-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Tìm khái niệm…"
              className="w-full sm:w-64 pl-9 pr-3 py-1.5 rounded-lg bg-muted dark:bg-white/5 border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-cyan-500/60"
            />
            {searchOpen && (searchResults.length > 0 || searching) && (
              <div className="absolute top-full mt-1 right-0 left-0 sm:left-auto sm:w-80 bg-popover text-popover-foreground border rounded-lg shadow-xl overflow-hidden max-h-80 overflow-y-auto z-50">
                {searching && (
                  <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tìm…
                  </div>
                )}
                {searchResults.map(n => {
                  const c = getNodeColor(n.type)
                  return (
                    <button
                      key={n.id}
                      onClick={() => onPickSearchResult(n)}
                      className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0 flex items-start gap-2"
                    >
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.stroke }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{n.label}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {NODE_TYPE_LABELS[n.type] || n.type}
                        </div>
                        {n.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.description}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Mobile menu toggle (⋯) — hidden on desktop */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="lg:hidden p-1.5 rounded-lg bg-muted dark:bg-white/5 border hover:bg-accent shrink-0"
            aria-label="Menu"
          >
            <span className="text-base leading-none">⋯</span>
          </button>
        </div>

        {/* ── ROW 2: Action buttons — horizontal scroll on mobile, wrap on desktop ── */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 pb-2 sm:pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Zoom controls (desktop only — mobile uses pinch) */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            <button onClick={resetView} title="Reset zoom/pan" className="p-1.5 rounded-lg bg-muted dark:bg-white/5 border hover:bg-accent">
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="p-1.5 rounded-lg bg-muted dark:bg-white/5 border hover:bg-accent">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} className="p-1.5 rounded-lg bg-muted dark:bg-white/5 border hover:bg-accent">
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-border mx-1" />
          </div>

          {/* Mastery toggle — always visible (key feature) */}
          <button
            onClick={() => setMasteryOn(v => !v)}
            title={masteryOn ? 'Tắt overlay mastery' : 'Bật overlay mastery'}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition whitespace-nowrap ${
              masteryOn
                ? 'bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/50 text-emerald-700 dark:text-emerald-200'
                : 'bg-muted dark:bg-white/5 border text-foreground/85 hover:bg-accent'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            Mastery
            {masteryOn && masteryLoading && <Loader2 className="w-3 h-3 animate-spin" />}
          </button>

          {/* AI tools group — hide on mobile (in ⋯ menu) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSmartOpen(true)}
              title="Hỏi AI bằng câu tự nhiên"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-[1.02] inline-flex items-center gap-1 shadow-md transition-transform"
            >
              🪄 Hỏi AI
            </button>
            <button
              onClick={() => setExtractOpen(true)}
              title="AI trích xuất tri thức"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-[1.02] inline-flex items-center gap-1 shadow-md transition-transform"
            >
              <Wand2 className="w-3.5 h-3.5" /> Trích xuất
            </button>
            <button
              onClick={handleSuggestNode}
              title="Đề xuất khái niệm/relation mới"
              className="px-2 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/15 hover:bg-white/10 text-foreground/80 inline-flex items-center gap-1"
            >
              💡 Đề xuất
            </button>
            <button
              onClick={seed}
              disabled={seeding}
              title="Seed lại data (idempotent)"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 inline-flex items-center gap-1"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Seed
            </button>
          </div>

          {/* Mobile: AI button gradient (most-used) */}
          <button
            onClick={() => setSmartOpen(true)}
            className="lg:hidden shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white inline-flex items-center gap-1 shadow-md whitespace-nowrap"
          >
            🪄 Hỏi AI
          </button>
        </div>

        {/* Mobile actions menu (⋯ dropdown) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-background/95 backdrop-blur p-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => { setExtractOpen(true); setMobileMenuOpen(false) }}
              className="px-3 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white inline-flex items-center justify-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" /> Trích xuất AI
            </button>
            <button
              onClick={() => { handleSuggestNode(); setMobileMenuOpen(false) }}
              className="px-3 py-2.5 rounded-lg text-xs font-bold bg-white/10 border border-white/20 text-foreground inline-flex items-center justify-center gap-1.5"
            >
              💡 Đề xuất
            </button>
            <button
              onClick={() => { seed(); setMobileMenuOpen(false) }}
              disabled={seeding}
              className="px-3 py-2.5 rounded-lg text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 inline-flex items-center justify-center gap-1.5"
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Seed
            </button>
            <button
              onClick={() => { resetView(); setMobileMenuOpen(false) }}
              className="px-3 py-2.5 rounded-lg text-xs font-bold bg-white/10 border border-white/20 text-foreground inline-flex items-center justify-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Reset zoom
            </button>
          </div>
        )}
      </header>

      {/* Phase 6: Smart Search Modal */}
      {smartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-3 pt-8 sm:p-4 sm:pt-20"
          onClick={() => setSmartOpen(false)}
        >
          <div
            className="bg-card border border-purple-500/30 rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-5 space-y-3 sm:space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-purple-300 inline-flex items-center gap-2">
                🪄 Hỏi AI về tri thức
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-normal">Phase 6</span>
              </h3>
              <button onClick={() => setSmartOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Gõ câu hỏi tự nhiên (vd. "Tôi muốn học về dao động điều hòa" hoặc "Liên hệ giữa lượng giác và sóng cơ"). AI sẽ phân tích intent + tìm các node phù hợp + có thể đề xuất lộ trình.
            </p>

            <div>
              <textarea
                value={smartQuery}
                onChange={(e) => setSmartQuery(e.target.value)}
                rows={2}
                autoFocus
                placeholder="Bạn muốn học/hỏi gì?"
                className="w-full px-3 py-2 bg-background border-2 border-border focus:border-purple-500/60 rounded-md text-sm text-foreground focus:outline-none resize-none"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSmartQuery()
                }}
              />
              <div className="text-[10px] text-zinc-500 mt-1">⌘+Enter để gửi · AI có thể mất ~3-5 giây</div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setSmartQuery(''); setSmartResult(null) }}
                className="text-xs px-3 py-2 rounded-md bg-secondary hover:bg-accent text-foreground/80 border border-border"
              >
                Xóa
              </button>
              <button
                onClick={handleSmartQuery}
                disabled={smartLoading || smartQuery.trim().length < 3}
                className="text-xs px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {smartLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Hỏi AI
              </button>
            </div>

            {smartResult && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-md p-2.5 text-xs">
                  <div className="font-bold text-purple-300 mb-1">
                    Ý định: <span className="font-mono">{smartResult.intent}</span>
                  </div>
                  <div className="text-foreground">{smartResult.explanation}</div>
                </div>

                {smartResult.suggestedNodes.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase font-bold text-zinc-500 mb-2">
                      Gợi ý {smartResult.suggestedNodes.length} node:
                    </div>
                    <div className="space-y-1.5">
                      {smartResult.suggestedNodes.map((n, idx) => {
                        const c = getNodeColor(n.type)
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              loadFromNode(n.id, 2)
                              setSmartOpen(false)
                            }}
                            className="w-full text-left p-2.5 rounded-md bg-background border border-border hover:border-purple-500/40 transition flex items-start gap-2.5"
                          >
                            <span className="shrink-0 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: c.fill, color: c.stroke, border: `1px solid ${c.stroke}` }}>
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">{n.label}</div>
                              <div className="text-[10px] text-zinc-500">
                                {NODE_TYPE_LABELS[n.type] || n.type}
                                {n.description && ` · ${n.description.slice(0, 80)}${n.description.length > 80 ? '…' : ''}`}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {smartResult.suggestedPathTo && (
                  <button
                    onClick={() => {
                      findPathToNode(smartResult.suggestedPathTo!)
                      setSmartOpen(false)
                    }}
                    className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    🛣 Tạo lộ trình tới đích AI gợi ý
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Mastery legend overlay khi bật mastery mode */}
      {masteryOn && (
        <div className="absolute top-20 left-3 md:left-72 right-3 md:right-auto z-20 bg-card/95 dark:bg-zinc-900/95 backdrop-blur border border-emerald-500/30 rounded-lg shadow-lg px-2.5 py-1.5 md:px-3 md:py-2 flex items-center gap-2 md:gap-3 text-[10px] md:text-[11px] overflow-x-auto scrollbar-hide">
          <span className="text-emerald-700 dark:text-emerald-300 font-bold inline-flex items-center gap-1 shrink-0">
            <Target className="w-3.5 h-3.5" /> Mastery overlay
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(244,63,94,0.3)', border: '1px solid #f43f5e' }} />
            <span className="text-foreground/80">&lt;30%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(251,191,36,0.3)', border: '1px solid #fbbf24' }} />
            <span className="text-foreground/80">30-70%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(16,185,129,0.3)', border: '1px solid #10b981' }} />
            <span className="text-foreground/80">≥70%</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-border pl-3 ml-1">
            <span className="w-3 h-3 rounded-full" style={{ background: 'rgba(148,163,184,0.15)', border: '1px solid #475569' }} />
            <span className="text-zinc-500">chưa có data</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* ═════ LEFT SIDEBAR / MOBILE BOTTOM SHEET ═════
            Desktop ≥ md: aside left fixed-width w-72
            Mobile: bottom sheet that slides up khi user tap bottom tab bar
            Cùng tab content cho cả 2 layout — chỉ thay đổi positioning. */}
        {/* Mobile backdrop khi sheet open */}
        {mobileSheetOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setMobileSheetOpen(false)}
          />
        )}
        <aside className={`
          bg-card/95 dark:bg-black/95 backdrop-blur md:bg-card/60 md:dark:bg-black/30 md:backdrop-blur-none
          md:relative md:flex md:flex-col md:w-72 md:border-r md:flex-shrink-0
          ${mobileSheetOpen
            ? 'fixed bottom-0 left-0 right-0 z-40 max-h-[70vh] flex flex-col rounded-t-2xl border-t shadow-2xl'
            : 'hidden md:flex'
          }
        `}>
          {/* Tab nav */}
          <div className="flex border-b bg-muted/50 dark:bg-black/50">
            {([
              { id: 'filter',  icon: '🎨', label: 'Lọc',     badge: enabledTypes.size },
              { id: 'mastery', icon: '🎯', label: 'Mastery', badge: masteryStats?.stats.total ?? null },
              { id: 'path',    icon: '🛣',  label: 'Lộ trình', badge: pathResult?.path.length ?? null },
              { id: 'help',    icon: 'ℹ',  label: 'Hướng dẫn' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as SidebarTab)}
                className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-[10px] font-bold transition-colors relative ${
                  activeTab === t.id
                    ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 border-b-2 border-cyan-500'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent border-b-2 border-transparent'
                }`}
              >
                <span className="text-base mb-0.5">{t.icon}</span>
                <span className="leading-none">{t.label}</span>
                {t.badge !== null && t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute top-1 right-1 text-[8px] px-1 rounded bg-cyan-500/20 dark:bg-cyan-500/30 text-cyan-800 dark:text-cyan-200">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 🧠 Brain v2 — Phoenix-style smart suggestions */}
            {/* Sidebar click = navigate (mở detail + load làm tâm) — UX rõ hơn */}
            <BrainSuggestions onNodeClick={onNavigateNode} />

            {/* 🧠 Bộ não cá nhân theo role — HS/GV/Admin đều có.
                currentNodeId truyền vào để HS thấy "Học từ KG" gợi ý chapters/questions
                + GV gửi recommendation đúng node đang xem. */}
            <div className="mt-3">
              <KgRolePanel onNodeClick={onNavigateNode} currentNodeId={selectedNode?.node.id || null} />
            </div>

            {/* 💝 KỸ NĂNG MỀM — 21st century skills song hành với kiến thức hàn lâm.
                Self-assess + activities gợi ý → KG tự +mastery khi user tham gia */}
            <div className="mt-3">
              <SoftSkillsPanel role="STUDENT" userId={null} />
            </div>

            {/* 🌿 Đường mòn tri thức (always visible nếu có history) */}
            <KgHistoryTrail
              history={kgHistory.history}
              currentId={selectedNode?.node.id}
              onJump={onNodeClick}
              onClear={kgHistory.clear}
              onRemove={kgHistory.remove}
            />

            {/* ── FILTER tab ── */}
            {activeTab === 'filter' && (
              <>
                <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Loại node</h3>
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
                          active ? 'bg-muted dark:bg-white/[0.06]' : 'opacity-40 hover:opacity-70'
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.stroke }} />
                        <span className="text-xs text-foreground/85">{label}</span>
                      </button>
                    )
                  })}
                </div>
                <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Thống kê</h3>
                <div className="text-xs space-y-1 text-foreground/85">
                  <div>Nodes: <strong className="text-white">{visibleNodes.length}</strong></div>
                  <div>Edges: <strong className="text-white">{visibleEdges.length}</strong></div>
                  <div>Zoom: <strong className="text-white">{(zoom * 100).toFixed(0)}%</strong></div>
                </div>
              </>
            )}

            {/* ── MASTERY tab ── */}
            {activeTab === 'mastery' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-300 inline-flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Mastery của bạn
                  </h3>
                  <label className="text-[10px] text-zinc-400 inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={masteryOn} onChange={e => setMasteryOn(e.target.checked)} className="accent-emerald-500" />
                    Overlay
                  </label>
                </div>

                {masteryLoading && !masteryStats && (
                  <div className="text-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
                    <p className="text-xs text-zinc-500 mt-2">Đang tải mastery…</p>
                  </div>
                )}

                {!masteryLoading && masteryStats && masteryStats.stats.total === 0 && (
                  <div className="space-y-3">
                    <div className="text-xs text-zinc-400 text-center py-2">
                      <Target className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                      Chưa có mastery data. Làm bài thi để cập nhật, hoặc:
                    </div>
                    <button onClick={seedDemoMastery} className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 inline-flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Tạo demo (~20 nodes)
                    </button>
                  </div>
                )}

                {!masteryLoading && masteryStats && masteryStats.stats.total > 0 && (
                  <>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="text-center p-2 rounded-md bg-rose-500/10 border border-rose-500/30">
                        <div className="text-lg font-bold text-rose-300">{masteryStats.stats.weak}</div>
                        <div className="text-[9px] text-zinc-400">Yếu</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                        <div className="text-lg font-bold text-amber-300">{masteryStats.stats.learning}</div>
                        <div className="text-[9px] text-zinc-400">Học</div>
                      </div>
                      <div className="text-center p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                        <div className="text-lg font-bold text-emerald-300">{masteryStats.stats.mastered}</div>
                        <div className="text-[9px] text-zinc-400">Thông thạo</div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-zinc-400">Điểm TB</span>
                        <span className="font-mono text-foreground">{masteryStats.stats.avgScore}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${masteryStats.stats.avgScore}%`, background: 'linear-gradient(90deg,#f43f5e,#fbbf24,#10b981)' }} />
                      </div>
                    </div>
                    {masteryStats.weakTopics.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Top yếu nhất
                        </div>
                        {masteryStats.weakTopics.slice(0, 5).map(t => (
                          <button key={t.nodeId} onClick={() => { loadFromNode(t.nodeId, 2); toast(`Focus: ${t.label}`, { icon: '🎯' }) }} className="w-full text-left p-1.5 rounded bg-zinc-950/60 border border-border hover:border-rose-500/40 group">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-semibold text-foreground truncate group-hover:text-rose-200">{t.label}</span>
                              <span className="shrink-0 text-[9px] px-1 rounded bg-rose-500/15 text-rose-300 font-mono">{t.score}%</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                      <button onClick={fetchMastery} disabled={masteryLoading} className="flex-1 px-2 py-1 rounded text-[10px] bg-secondary hover:bg-accent text-foreground/80 inline-flex items-center justify-center gap-1 disabled:opacity-50">
                        <RefreshCw className={`w-3 h-3 ${masteryLoading ? 'animate-spin' : ''}`} /> Làm mới
                      </button>
                      <Link to="/student/exam-prep" className="flex-1 px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 inline-flex items-center justify-center gap-1">
                        <BookOpen className="w-3 h-3" /> Luyện đề
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── PATH tab ── */}
            {activeTab === 'path' && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-300 inline-flex items-center gap-1.5">
                  🛣 Lộ trình học gợi ý
                </h3>
                {!pathResult && (
                  <div className="text-xs text-zinc-400 text-center py-6">
                    <div className="text-3xl mb-2">🛣</div>
                    Chưa có lộ trình.
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Click 1 khái niệm → nút "🛣 Lộ trình từ điểm yếu" trong drawer bên phải.
                    </div>
                  </div>
                )}
                {pathResult && !pathResult.found && (
                  <div className="text-xs text-zinc-400 py-4 text-center">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                    {pathResult.message || `Không tìm thấy path từ ${pathResult.fromId} → ${pathResult.toId}`}
                  </div>
                )}
                {pathResult && pathResult.found && (
                  <>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2 text-[11px] text-amber-200">
                      <strong>{pathResult.hops} bước</strong> từ điểm yếu → <span className="text-amber-100">{pathResult.path[pathResult.path.length - 1]?.label}</span>
                      {pathResult.totalMinutes !== undefined && (
                        <div className="mt-1 text-[10px] text-amber-300">
                          ⏱ ~<strong>{pathResult.totalMinutes}</strong>p · ~{Math.ceil(pathResult.totalMinutes / 30)} ngày
                        </div>
                      )}
                    </div>
                    <button onClick={savePathAsLP} disabled={savingAsLP} className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50">
                      {savingAsLP ? <Loader2 className="w-3 h-3 animate-spin" /> : '💾'}
                      Lưu thành lộ trình + gửi GV
                    </button>
                    <div className="space-y-1">
                      {pathResult.path.map((step, idx) => {
                        const isFirst = idx === 0
                        const isLast = idx === pathResult.path.length - 1
                        const score = step.masteryScore
                        const scoreColor = score === null ? '#475569' : score < 30 ? '#f43f5e' : score < 70 ? '#fbbf24' : '#10b981'
                        return (
                          <div key={step.nodeId} className="relative">
                            {!isLast && <div className="absolute left-3 top-7 bottom-0 w-px bg-amber-500/30" style={{ height: 'calc(100% - 1rem)' }} />}
                            <button onClick={() => onNodeClick(step.nodeId)} className="w-full text-left p-1.5 rounded bg-zinc-950/60 border border-border hover:border-amber-500/60 flex items-start gap-2">
                              <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2" style={{ background: isFirst ? '#f43f5e' : isLast ? '#10b981' : '#fbbf24', color: '#0a0f1e', borderColor: '#0a0f1e' }}>
                                {isFirst ? 'S' : isLast ? 'E' : step.order}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-semibold text-foreground truncate">{step.label}</span>
                                  {score !== null && <span className="text-[9px] px-1 rounded font-mono shrink-0" style={{ background: `${scoreColor}25`, color: scoreColor }}>{score}%</span>}
                                </div>
                                <div className="text-[9px] text-zinc-500 truncate">
                                  {NODE_TYPE_LABELS[step.type] || step.type}
                                  {step.estimatedMinutes !== undefined && step.estimatedMinutes > 0 && <span> · <span className="text-amber-400">⏱{step.estimatedMinutes}p</span></span>}
                                </div>
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── HELP tab ── */}
            {activeTab === 'help' && (
              <div className="space-y-3 text-[11px] text-white/80">
                <div className="p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <Info className="w-3.5 h-3.5" /> Tương tác graph
                  </div>
                  <div>• <strong>Kéo node</strong> để di chuyển</div>
                  <div>• <strong>Double-click</strong> để ghim/bỏ ghim</div>
                  <div>• <strong>Click</strong> để mở chi tiết bên phải</div>
                  <div>• <strong>Scroll</strong> để zoom in/out</div>
                  <div>• <strong>Kéo nền</strong> để pan canvas</div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                    🪄 AI Tools
                  </div>
                  <div>• <strong>Hỏi AI</strong>: NL query "Tôi muốn học X"</div>
                  <div>• <strong>Trích xuất AI</strong>: paste văn bản → AI lấy entities</div>
                  <div>• <strong>Đề xuất</strong>: thêm khái niệm mới (admin duyệt)</div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    🛣 Lộ trình học
                  </div>
                  <div>• Click khái niệm → "Lộ trình từ điểm yếu"</div>
                  <div>• AI tính BFS từ điểm yếu nhất → đích</div>
                  <div>• Lưu thành Learning Path → GV nhận thông báo</div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas — cosmic dark trong dark, slate-100 trong light cho graph viz */}
        <main ref={mainRef} className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-[#06030f] pb-14 md:pb-0">
          {/* Toolbar floating top-right — Fullscreen + View mode toggle */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Thoát toàn màn hình (ESC)' : 'Mở rộng toàn màn hình'}
              className="p-1.5 rounded-lg bg-card/95 dark:bg-zinc-900/95 backdrop-blur border
                         hover:bg-accent text-foreground transition hover:scale-105"
            >
              {isFullscreen
                ? <Minimize2 className="w-4 h-4" />
                : <Maximize2 className="w-4 h-4" />
              }
            </button>

            {/* View mode toggle */}
            <div className="flex gap-1 bg-card/95 dark:bg-zinc-900/95 backdrop-blur rounded-lg border p-1">
              <button
                onClick={() => setViewMode('2d')}
                title="Xem dạng 2D (SVG, mặc định)"
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                  viewMode === '2d' ? 'bg-cyan-500 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                2D
              </button>
              <button
                onClick={() => setViewMode('3d')}
                title="Xem dạng 3D Neural Network"
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                  viewMode === '3d' ? 'bg-purple-500 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🧠 3D
              </button>
            </div>
          </div>

          {/* 3D view */}
          {viewMode === '3d' && (
            <div className="absolute inset-0 p-2 pb-14 md:pb-2">
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-black rounded-2xl">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              }>
                <KnowledgeGraph3D
                  nodes={visibleNodes}
                  edges={visibleEdges}
                  centerId={startIdRef.current || 'subj-vatli'}
                  onNodeClick={onNodeClick}
                  onFocusCenter={(id) => loadFromNode(id, 2)}
                  showLabels
                />
              </Suspense>
            </div>
          )}

          {/* 2D SVG view (hidden khi 3D)
              ─ preserveAspectRatio="xMidYMid slice" → SVG FILL toàn canvas
                + content centered (cropped edges nếu cần) thay vì letterbox
                → graph luôn ở giữa màn hình, không có vùng đen 2 bên. */}
          {viewMode === '2d' && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full"
            onMouseDown={onMouseDownCanvas}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
            style={{ cursor: dragStateRef.current.type === 'pan' ? 'grabbing' : 'default' }}
          >
            <defs>
              <pattern id="kgGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
              {/* Center glow — SÁNG HƠN trước (35% thay 15%) để user thấy "đây là tâm" */}
              <radialGradient id="centerGlow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
                <stop offset="50%" stopColor="rgba(168,85,247,0.18)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </radialGradient>
              {/* Pulse glow cho center marker khi không có dữ liệu */}
              <radialGradient id="centerPulse" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="40%" stopColor="rgba(34,211,238,0.3)" />
                <stop offset="100%" stopColor="rgba(34,211,238,0)" />
              </radialGradient>
              {/* Arrow marker for directed edges */}
              <marker id="kgArrow" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
            </defs>

            {/* Background grid — sub-tinted to match dark theme */}
            <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#kgGrid)" />

            {/* Center glow ellipse — sáng hơn để user thấy ngay vị trí tâm */}
            <ellipse cx={VIEWBOX_W / 2} cy={VIEWBOX_H / 2} rx="450" ry="320" fill="url(#centerGlow)" />

            {/* CENTER ANCHOR MARKER — luôn hiện, dấu hiệu chính xác trung tâm
                Khi chưa load xong → user thấy ngay "đây là nơi đồ thị sẽ xuất hiện".
                Khi đã load → marker này nằm dưới center node, vẫn nhìn được như aura. */}
            <g transform={`translate(${VIEWBOX_W / 2}, ${VIEWBOX_H / 2})`} style={{ pointerEvents: 'none' }}>
              {/* Outer pulse ring */}
              <circle r="40" fill="url(#centerPulse)" opacity={visibleNodes.length > 0 ? 0.3 : 0.9}>
                <animate attributeName="r" values="40;55;40" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite" />
              </circle>
              {/* Inner crosshair */}
              <circle r="6" fill="rgba(34,211,238,0.85)" opacity={visibleNodes.length > 0 ? 0 : 1} />
              <line x1="-18" y1="0" x2="-10" y2="0" stroke="rgba(34,211,238,0.7)" strokeWidth="2" opacity={visibleNodes.length > 0 ? 0 : 1} />
              <line x1="10" y1="0" x2="18" y2="0" stroke="rgba(34,211,238,0.7)" strokeWidth="2" opacity={visibleNodes.length > 0 ? 0 : 1} />
              <line x1="0" y1="-18" x2="0" y2="-10" stroke="rgba(34,211,238,0.7)" strokeWidth="2" opacity={visibleNodes.length > 0 ? 0 : 1} />
              <line x1="0" y1="10" x2="0" y2="18" stroke="rgba(34,211,238,0.7)" strokeWidth="2" opacity={visibleNodes.length > 0 ? 0 : 1} />
              {/* "Center" label (only when no nodes loaded yet) */}
              {visibleNodes.length === 0 && (
                <text y="50" textAnchor="middle" fill="rgba(34,211,238,0.85)" fontSize="14" fontWeight="700"
                      fontFamily="-apple-system, system-ui, sans-serif" style={{ userSelect: 'none' }}>
                  TÂM ĐỒ THỊ
                </text>
              )}
            </g>

            <g transform={`scale(${zoom}) translate(${pan.x}, ${pan.y})`}>
              {/* Edges */}
              {visibleEdges.map(e => {
                const a = simRef.current.find(n => n.id === e.from_id)
                const b = simRef.current.find(n => n.id === e.to_id)
                if (!a || !b) return null
                const midX = (a.x + b.x) / 2
                const midY = (a.y + b.y) / 2
                // Phase 4: highlight edges along the path
                const isPathEdge = pathEdgePairs.has(`${e.from_id}::${e.to_id}`)
                return (
                  <g key={e.id}>
                    <line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={isPathEdge ? '#fbbf24' : 'rgba(148,163,184,0.35)'}
                      strokeWidth={isPathEdge ? 3 : 1.2}
                      opacity={isPathEdge ? 0.95 : (pathEdgePairs.size > 0 ? 0.15 : 1)}
                      markerEnd="url(#kgArrow)"
                    />
                    {/* Edge label (only when zoomed in OR path edge) */}
                    {(zoom > 0.85 || isPathEdge) && (
                      <text
                        x={midX} y={midY}
                        fill={isPathEdge ? '#fbbf24' : '#64748b'}
                        fontSize={isPathEdge ? 10 : 9}
                        fontWeight={isPathEdge ? 700 : 400}
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

                // Phase 3: apply mastery overlay nếu bật
                const m = masteryOn ? masteryMap[n.id] : undefined
                const mc = masteryOn ? getMasteryColor(m?.score) : null
                const useMastery = masteryOn && mc !== null

                // Phase 4: highlight nodes trong path
                const isInPath = pathNodeIds.has(n.id)
                const isPathStart = pathResult?.fromId === n.id
                const isPathEnd = pathResult?.toId === n.id

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
                    {/* Phase 4: Path highlight halo (gold animate) */}
                    {isInPath && (
                      <circle r={n.radius + 8} fill="none" stroke="#fbbf24" strokeWidth={2.5} opacity={0.8}>
                        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Main circle — mastery overlay thay fill+stroke khi bật */}
                    <circle
                      r={n.radius}
                      fill={useMastery ? mc!.fill : c.fill}
                      stroke={isInPath ? '#fbbf24' : useMastery ? mc!.stroke : c.stroke}
                      strokeWidth={isInPath ? 3 : isCenter ? 3 : isSelected ? 2.5 : 1.5}
                    />
                    {/* Path order badge */}
                    {isInPath && pathResult && (
                      <>
                        <circle cx={n.radius - 4} cy={-n.radius + 4} r={9} fill="#fbbf24" stroke="#0a0f1e" strokeWidth={1.5} />
                        <text x={n.radius - 4} y={-n.radius + 7} textAnchor="middle" fontSize="9" fontWeight="800" fill="#0a0f1e">
                          {isPathStart ? 'S' : isPathEnd ? 'E' : (pathResult.path.find(p => p.nodeId === n.id)?.order ?? '?')}
                        </text>
                      </>
                    )}
                    {/* Mastery score badge (small arc bottom) */}
                    {useMastery && m && (
                      <>
                        <text
                          x={0} y={n.radius + 10}
                          textAnchor="middle" fontSize="9" fontWeight="700"
                          fill={mc!.stroke}
                        >
                          {m.score}%
                        </text>
                      </>
                    )}
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
          )}

          {/* Loading overlay — BIG + branded, dễ nhận biết khi tải lần đầu */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-10 pointer-events-none">
              <div className="text-center px-6">
                {/* Pulsing tree icon */}
                <div className="text-6xl mb-4 animate-pulse" style={{ filter: 'drop-shadow(0 0 20px rgba(34,211,238,0.6))' }}>
                  🌳
                </div>
                <div className="text-xl font-bold mb-2 bg-gradient-to-r from-cyan-300 via-purple-300 to-emerald-300 bg-clip-text text-transparent">
                  Cây Sự Sống Tri Thức
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-cyan-200/80">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang khởi tạo đồ thị…
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && visibleNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-md px-4">
                <Network className="w-16 h-16 mx-auto mb-3 text-cyan-600/50 dark:text-cyan-400/40" />
                <h3 className="text-lg font-bold mb-2 text-foreground">Chưa có dữ liệu</h3>
                <p className="text-sm text-muted-foreground mb-4">Bấm "Seed" trên thanh trên để khởi tạo dữ liệu Vật lí 11.</p>
                <button
                  onClick={seed}
                  disabled={seeding}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold inline-flex items-center gap-2"
                >
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Seed Vật lí 11
                </button>
              </div>
            </div>
          )}

          {/* 🎵 NHẠC NỀN — floating player (bottom-right) cho cả 2D + 3D mode.
              3 track instrumental thư giãn (Aventure, Hoffy Beats) — giúp HS
              tập trung khi duyệt cây tri thức. Auto-loop + persist preference. */}
          <KgAudioPlayer />
        </main>

        {/* Right: detail drawer
            Desktop: aside right 320px, full height
            Mobile: bottom sheet (above the bottom tab bar) with backdrop */}
        {selectedNode && (
          <>
            {/* Mobile backdrop */}
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-30"
              onClick={() => setSelectedNode(null)}
            />
            <aside
              className="
                bg-card text-foreground overflow-y-auto
                md:relative md:w-80 md:border-l md:flex-shrink-0 md:p-4 md:max-h-none
                fixed bottom-14 left-0 right-0 z-40 max-h-[80vh] p-4 rounded-t-2xl border-t shadow-2xl md:rounded-none md:shadow-none
              "
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0) + 1rem)' }}
            >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                  {NODE_TYPE_LABELS[selectedNode.node.type] || selectedNode.node.type}
                </div>
                <h2 className="text-lg font-bold leading-tight text-foreground" style={{ color: getNodeColor(selectedNode.node.type).text }}>
                  {selectedNode.node.label}
                </h2>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedNode.node.description && (
              <p className="text-sm text-foreground/85 leading-relaxed mb-4 p-3 rounded-lg bg-muted border">
                {selectedNode.node.description}
              </p>
            )}

            {selectedNode.node.properties && Object.keys(selectedNode.node.properties).length > 0 && (
              <div className="mb-4">
                <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Thuộc tính</h3>
                <div className="space-y-1 text-xs bg-muted rounded-lg p-3 border">
                  {Object.entries(selectedNode.node.properties).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brain panel — collaborative notes + discussions */}
            <div className="mb-4">
              <h3 className="text-[10px] uppercase font-bold text-cyan-300/60 tracking-wider mb-2 inline-flex items-center gap-1">
                🧠 Bộ não tri thức
              </h3>
              <NodeBrainPanel nodeId={selectedNode.node.id} nodeLabel={selectedNode.node.label} />
            </div>

            {/* Học liệu liên quan — fetch lessons/exams/videos/labs/paths theo label */}
            <div className="mb-4">
              <h3 className="text-[10px] uppercase font-bold text-amber-300/70 tracking-wider mb-2 inline-flex items-center gap-1">
                📚 Học liệu để tìm hiểu
              </h3>
              <KgNodeResources nodeId={selectedNode.node.id} nodeLabel={selectedNode.node.label} />
            </div>

            <button
              onClick={expandFromSelected}
              className="w-full py-2 mb-2 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              <Network className="w-4 h-4" />
              Lấy node này làm tâm
            </button>

            {/* Phase 4: Auto Learning Path button */}
            <button
              onClick={() => findPathToNode(selectedNode.node.id)}
              disabled={pathFinding}
              className="w-full py-2 mb-4 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              title="BFS shortest path từ điểm yếu nhất của bạn → node này"
            >
              {pathFinding ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>🛣</span>}
              Lộ trình từ điểm yếu
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/30 ml-1">NEW</span>
            </button>

            {/* NodeExplorer — phân nhóm liên kết + đánh dấu LIÊN MÔN */}
            <NodeExplorer
              neighbors={selectedNode.neighbors}
              currentNodeId={selectedNode.node.id}
              onNavigate={onNavigateNode}
            />
            </aside>
          </>
        )}
      </div>

      {/* Bottom hint bar — desktop only */}
      <div className="border-t border-white/10 bg-black/40 px-4 py-2 text-[11px] text-white/40 text-center hidden md:block">
        💡 Mẹo: gõ "động lượng" hoặc "Newton" → click kết quả để xem mạng tri thức xung quanh khái niệm đó
      </div>

      {/* ═════ MOBILE BOTTOM TAB BAR (iPhone 14 Pro Max optimized) ═════
          Hiển thị 4 tab + Reset zoom. Tap tab → mở bottom sheet với content tương ứng.
          Position: fixed bottom với safe-area padding cho iPhone notch. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <div className="flex items-stretch h-14">
          {([
            { id: 'filter',  icon: '🎨', label: 'Lọc' },
            { id: 'mastery', icon: '🎯', label: 'Mastery', badge: masteryStats?.stats.total },
            { id: 'path',    icon: '🛣',  label: 'Lộ trình', badge: pathResult?.path.length },
            { id: 'help',    icon: 'ℹ',  label: 'Trợ giúp' },
          ] as const).map(t => {
            const isActive = activeTab === t.id && mobileSheetOpen
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (activeTab === t.id && mobileSheetOpen) {
                    setMobileSheetOpen(false)
                  } else {
                    setActiveTab(t.id as SidebarTab)
                    setMobileSheetOpen(true)
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  isActive
                    ? 'text-cyan-300 bg-cyan-500/10'
                    : 'text-zinc-400 active:bg-white/5'
                }`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="text-[10px] font-bold leading-none">{t.label}</span>
                {t.badge !== undefined && t.badge !== null && t.badge > 0 && (
                  <span className="absolute top-1 right-1/4 text-[8px] px-1 rounded-full bg-cyan-500 text-zinc-950 font-bold min-w-[14px] text-center">
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
