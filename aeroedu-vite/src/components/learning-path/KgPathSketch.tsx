/**
 * KgPathSketch — Bảng vẽ lộ trình kéo thả node KG
 *
 * User: "Bảng có các từ khoá (node) giáo viên kéo thả và nối các node
 *  với nhau tạo ra lộ trình. Tất cả sau đó được giáo viên thêm các nội
 *  dung cụ thể vào sau khi cho các nội dung chính của lộ trình"
 *
 * Workflow:
 *   1. GV search KG node → drag node từ palette vào canvas
 *   2. Click "+" trên node → drag tới node khác để nối → tạo edge
 *   3. Click node → edit content modal (title, description, type, duration)
 *   4. "Lưu thành lộ trình" → topological sort edges → emit Module[]
 *
 * Implementation:
 *   - SVG canvas 1000×600 (scrollable)
 *   - Nodes: circles with KG node info, draggable on canvas
 *   - Edges: SVG paths between node centers (Bezier curves)
 *   - Edge creation: click "+" handle → drag → drop on target
 *   - Persist sketch to localStorage (sketch state survives reload)
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Search, Plus, Trash2, Loader2, X, Save, Eye, FileText, Link2, ListChecks,
  GripVertical, MousePointer2, Info, ArrowRight,
} from 'lucide-react'
import {
  knowledgeGraphService,
  NODE_TYPE_LABELS, getNodeColor, type KgNode,
} from '@/services/knowledge-graph.service'

// ─── Module shape ───────────────────────────────────────────────
// Compatible with builder's Module type via convert
export interface SketchModuleOut {
  id: string
  type: 'lesson' | 'quiz' | 'project' | 'assignment' | 'video' | 'survey' | 'final-exam' | 'stem-skill' | 'challenge'
  title: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  duration: number
  xpTarget: number
  description?: string
  tags?: string[]
  kgNodeId?: string
  kgNodeType?: string
}

interface SketchNode {
  id: string                  // local id (unique on canvas)
  kgNodeId?: string           // ref to KG node
  kgNodeType?: string
  x: number                   // canvas position
  y: number
  label: string
  description?: string
  duration: number            // minutes
  type: SketchModuleOut['type']
  difficulty: SketchModuleOut['difficulty']
  contentFilled: boolean      // GV đã điền nội dung chi tiết chưa
}

interface SketchEdge {
  id: string
  from: string                // node id
  to: string                  // node id
}

interface Props {
  pathSubject: string
  onSave: (modules: SketchModuleOut[]) => void
}

const CANVAS_W = 1100
const CANVAS_H = 640
const NODE_R = 38

// ─── Type → color ─────────────────────────────────────────────────
const MODULE_TYPE_COLOR: Record<SketchModuleOut['type'], string> = {
  lesson:       '#a78bfa',
  quiz:         '#22d3ee',
  project:      '#f97316',
  assignment:   '#10b981',
  video:        '#ec4899',
  survey:       '#fbbf24',
  'final-exam': '#ef4444',
  'stem-skill': '#8b5cf6',
  challenge:    '#f43f5e',
}

const MODULE_TYPE_LABEL: Record<SketchModuleOut['type'], string> = {
  lesson: 'Bài giảng', quiz: 'Trắc nghiệm', project: 'Dự án', assignment: 'Bài tập',
  video: 'Video', survey: 'Khảo sát', 'final-exam': 'Cuối khóa', 'stem-skill': 'Kĩ năng STEM', challenge: 'Thách đấu',
}

// ─── Component ───────────────────────────────────────────────────

export default function KgPathSketch({ pathSubject, onSave }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [searchQ, setSearchQ] = useState('')
  const [palette, setPalette] = useState<KgNode[]>([])
  const [paletteLoading, setPaletteLoading] = useState(false)
  const [nodes, setNodes] = useState<SketchNode[]>([])
  const [edges, setEdges] = useState<SketchEdge[]>([])
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [, setForceR] = useState(0)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Persist + restore from localStorage ──────────────────────
  const STORAGE_KEY = 'kg-path-sketch'
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { nodes: SketchNode[]; edges: SketchEdge[] }
        if (parsed.nodes && Array.isArray(parsed.nodes)) setNodes(parsed.nodes)
        if (parsed.edges && Array.isArray(parsed.edges)) setEdges(parsed.edges)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }))
    } catch { /* quota */ }
  }, [nodes, edges])

  // ─── KG search → palette ──────────────────────────────────────
  const doSearch = useCallback((q: string) => {
    if (debRef.current) clearTimeout(debRef.current)
    if (!q.trim()) { setPalette([]); return }
    debRef.current = setTimeout(async () => {
      setPaletteLoading(true)
      try {
        const items = await knowledgeGraphService.search(q.trim(), { limit: 20 })
        setPalette(items)
      } catch { setPalette([]) }
      finally { setPaletteLoading(false) }
    }, 250)
  }, [])

  // ─── Node CRUD ────────────────────────────────────────────────
  const addNodeFromKg = (kg: KgNode) => {
    // Place new node at center of canvas, offset by existing count
    const offsetX = (nodes.length % 6) * 70
    const offsetY = Math.floor(nodes.length / 6) * 70
    const newNode: SketchNode = {
      id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kgNodeId: kg.id,
      kgNodeType: kg.type,
      x: 150 + offsetX,
      y: 120 + offsetY,
      label: kg.label,
      description: kg.description || '',
      duration: 30,
      type: 'lesson',
      difficulty: 'medium',
      contentFilled: false,
    }
    setNodes((prev) => [...prev, newNode])
  }

  const updateNode = (id: string, patch: Partial<SketchNode>) => {
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, ...patch } : n))
  }

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id))
  }

  const removeEdge = (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id))
  }

  const clearAll = () => {
    if (!confirm('Xóa hết nodes + edges trên bảng?')) return
    setNodes([])
    setEdges([])
  }

  // ─── Mouse handlers on SVG ────────────────────────────────────
  const getSvgPos = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
    }
  }

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    const pos = getSvgPos(e)
    if (draggingNodeId) {
      updateNode(draggingNodeId, {
        x: pos.x - dragOffset.dx,
        y: pos.y - dragOffset.dy,
      })
    }
    if (connectingFromId) {
      setMousePos(pos)
    }
  }

  const handleSvgMouseUp = () => {
    setDraggingNodeId(null)
    setConnectingFromId(null)
    setMousePos(null)
  }

  const startNodeDrag = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const pos = getSvgPos(e)
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    setDraggingNodeId(nodeId)
    setDragOffset({ dx: pos.x - node.x, dy: pos.y - node.y })
  }

  const startEdgeFrom = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setConnectingFromId(nodeId)
    setMousePos(getSvgPos(e))
  }

  const completeEdgeTo = (toNodeId: string) => {
    if (!connectingFromId || connectingFromId === toNodeId) {
      setConnectingFromId(null)
      setMousePos(null)
      return
    }
    // Avoid duplicate edge
    const exists = edges.some((e) => e.from === connectingFromId && e.to === toNodeId)
    if (!exists) {
      setEdges((prev) => [...prev, {
        id: `e-${Date.now()}`,
        from: connectingFromId,
        to: toNodeId,
      }])
    }
    setConnectingFromId(null)
    setMousePos(null)
  }

  // ─── Topological sort → ordered modules ───────────────────────
  const handleSave = () => {
    if (nodes.length === 0) {
      alert('Chưa có node nào trên bảng')
      return
    }
    // Build adjacency
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()
    for (const n of nodes) {
      inDegree.set(n.id, 0)
      adj.set(n.id, [])
    }
    for (const e of edges) {
      adj.get(e.from)?.push(e.to)
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1)
    }
    // Kahn's algorithm
    const queue: string[] = []
    for (const [nid, deg] of inDegree) if (deg === 0) queue.push(nid)
    const order: string[] = []
    while (queue.length > 0) {
      const cur = queue.shift()!
      order.push(cur)
      for (const next of adj.get(cur) || []) {
        const d = (inDegree.get(next) || 0) - 1
        inDegree.set(next, d)
        if (d === 0) queue.push(next)
      }
    }
    if (order.length < nodes.length) {
      // Cycle detected — fallback to original order
      alert('Phát hiện chu trình (cycle) — sẽ dùng thứ tự gốc. Hãy xoá edge gây vòng lặp.')
      order.push(...nodes.map((n) => n.id).filter((id) => !order.includes(id)))
    }

    const modules: SketchModuleOut[] = order.map((nodeId) => {
      const n = nodes.find((x) => x.id === nodeId)!
      return {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: n.type,
        title: n.label,
        subject: pathSubject,
        difficulty: n.difficulty,
        duration: n.duration,
        xpTarget: 80 + n.duration * 2,
        description: n.description,
        tags: n.kgNodeType ? [n.kgNodeType, 'sketch'] : ['sketch'],
        kgNodeId: n.kgNodeId,
        kgNodeType: n.kgNodeType,
      }
    })
    onSave(modules)
  }

  // ─── Stats ────────────────────────────────────────────────────
  const filledCount = nodes.filter((n) => n.contentFilled).length

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-white/55 leading-relaxed bg-violet-500/[0.06] border border-violet-500/20 rounded p-2 flex items-start gap-2">
        <Info className="w-3 h-3 mt-0.5 shrink-0 text-violet-300" />
        <span>
          <strong className="text-violet-200">3 bước</strong>: 1) Tìm node KG → 2) Kéo vào bảng + nối edge → 3) Click node để điền nội dung → Lưu thành lộ trình.
        </span>
      </div>

      {/* Search bar + palette */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 8 }}>
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); doSearch(e.target.value) }}
            placeholder="Tìm node KG để thêm vào bảng..."
            style={{
              width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 26px',
              fontSize: 12, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#fff', outline: 'none',
            }}
          />
          {paletteLoading && (
            <Loader2 size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite' }} />
          )}
        </div>
        {/* Palette */}
        {palette.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxHeight: 100, overflowY: 'auto' }}>
            {palette.map((kg) => {
              const c = getNodeColor(kg.type)
              const inCanvas = nodes.some((n) => n.kgNodeId === kg.id)
              return (
                <button key={kg.id}
                  onClick={() => !inCanvas && addNodeFromKg(kg)}
                  disabled={inCanvas}
                  style={{
                    padding: '4px 8px', borderRadius: 6,
                    background: inCanvas ? 'rgba(74,222,128,0.15)' : c.fill,
                    border: `1px solid ${inCanvas ? 'rgba(74,222,128,0.4)' : c.stroke + '40'}`,
                    color: inCanvas ? '#4ade80' : c.text,
                    fontSize: 10.5, fontWeight: 700, cursor: inCanvas ? 'default' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                  {inCanvas ? '✓' : <Plus size={9} />}
                  {kg.label}
                  <span style={{ opacity: 0.55, fontSize: 9 }}>· {NODE_TYPE_LABELS[kg.type] || kg.type}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Canvas toolbar */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', padding: '0 6px' }}>
          <strong style={{ color: '#a78bfa' }}>{nodes.length}</strong> node
          {' · '}
          <strong style={{ color: '#22d3ee' }}>{edges.length}</strong> edge
          {' · '}
          <strong style={{ color: filledCount === nodes.length && nodes.length > 0 ? '#4ade80' : '#f59e0b' }}>{filledCount}/{nodes.length}</strong> đã điền
        </span>
        <button onClick={clearAll}
          style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: 10.5, fontWeight: 700,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171', borderRadius: 6, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <Trash2 size={10} /> Xoá hết
        </button>
        <button onClick={handleSave} disabled={nodes.length === 0}
          style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700,
            background: nodes.length === 0 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            border: '1px solid rgba(124,58,237,0.6)',
            color: nodes.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
            borderRadius: 6, cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Save size={11} /> Lưu thành lộ trình
        </button>
      </div>

      {/* SVG Canvas */}
      <div style={{ background: 'radial-gradient(ellipse at center, #1a1428 0%, #0a0612 70%)',
        border: '1px solid rgba(168,139,250,0.2)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        <svg ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          style={{ width: '100%', height: 'auto', cursor: connectingFromId ? 'crosshair' : 'default' }}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}>
          <defs>
            {/* Arrowhead marker for edges */}
            <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#a78bfa" />
            </marker>
          </defs>

          {/* Grid background */}
          {Array.from({ length: Math.ceil(CANVAS_W / 50) }, (_, i) => (
            <line key={`gx${i}`} x1={i * 50} y1={0} x2={i * 50} y2={CANVAS_H}
              stroke="rgba(168,139,250,0.05)" strokeWidth="1" />
          ))}
          {Array.from({ length: Math.ceil(CANVAS_H / 50) }, (_, i) => (
            <line key={`gy${i}`} x1={0} y1={i * 50} x2={CANVAS_W} y2={i * 50}
              stroke="rgba(168,139,250,0.05)" strokeWidth="1" />
          ))}

          {/* Empty state hint */}
          {nodes.length === 0 && (
            <g>
              <text x={CANVAS_W / 2} y={CANVAS_H / 2 - 10} textAnchor="middle"
                fontSize="16" fontWeight="bold" fill="rgba(168,139,250,0.5)">
                Tìm node KG bên trên → bấm để thêm vào bảng
              </text>
              <text x={CANVAS_W / 2} y={CANVAS_H / 2 + 14} textAnchor="middle"
                fontSize="11" fill="rgba(255,255,255,0.35)">
                Kéo node để di chuyển · Click "+" trên node để nối edge · Click node để điền nội dung
              </text>
            </g>
          )}

          {/* Edges */}
          {edges.map((e) => {
            const from = nodes.find((n) => n.id === e.from)
            const to = nodes.find((n) => n.id === e.to)
            if (!from || !to) return null
            const dx = to.x - from.x
            const dy = to.y - from.y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            // Offset start/end to circle edges
            const sx = from.x + (dx / len) * NODE_R
            const sy = from.y + (dy / len) * NODE_R
            const ex = to.x - (dx / len) * (NODE_R + 6)
            const ey = to.y - (dy / len) * (NODE_R + 6)
            // Bezier midpoint
            const mx = (sx + ex) / 2
            const my = (sy + ey) / 2 - Math.min(40, len * 0.2)
            return (
              <g key={e.id}>
                <path
                  d={`M ${sx},${sy} Q ${mx},${my} ${ex},${ey}`}
                  fill="none"
                  stroke="rgba(168,139,250,0.6)"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  style={{ cursor: 'pointer' }}
                  onClick={() => removeEdge(e.id)}
                >
                  <title>Click để xoá edge</title>
                </path>
              </g>
            )
          })}

          {/* Connecting line in progress */}
          {connectingFromId && mousePos && (() => {
            const from = nodes.find((n) => n.id === connectingFromId)
            if (!from) return null
            return (
              <line x1={from.x} y1={from.y} x2={mousePos.x} y2={mousePos.y}
                stroke="rgba(34,211,238,0.8)" strokeWidth="2" strokeDasharray="6 4" />
            )
          })()}

          {/* Nodes */}
          {nodes.map((n) => {
            const color = MODULE_TYPE_COLOR[n.type]
            const isFilled = n.contentFilled
            return (
              <g key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                style={{ cursor: draggingNodeId === n.id ? 'grabbing' : 'grab' }}
                onMouseDown={(e) => startNodeDrag(e, n.id)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (connectingFromId) {
                    completeEdgeTo(n.id)
                  } else if (!draggingNodeId) {
                    setEditingNodeId(n.id)
                  }
                }}>
                {/* Halo */}
                {isFilled && (
                  <circle cx={0} cy={0} r={NODE_R + 8}
                    fill="none" stroke={color} strokeWidth="1.5" opacity="0.3" />
                )}
                {/* Main circle */}
                <circle cx={0} cy={0} r={NODE_R}
                  fill={`${color}25`}
                  stroke={color}
                  strokeWidth={isFilled ? 3 : 2}
                />
                {/* Number badge (order if sorted) — show order index */}
                <circle cx={-NODE_R + 6} cy={-NODE_R + 6} r="10"
                  fill={isFilled ? '#22c55e' : color}
                  stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
                <text x={-NODE_R + 6} y={-NODE_R + 9} textAnchor="middle"
                  fontSize="10" fontWeight="bold" fill="#fff">
                  {isFilled ? '✓' : '?'}
                </text>
                {/* Label */}
                <text x={0} y={-3} textAnchor="middle"
                  fontSize="11" fontWeight="bold" fill="#fff"
                  style={{ pointerEvents: 'none' }}>
                  {truncate(n.label, 14)}
                </text>
                {/* Type label */}
                <text x={0} y={12} textAnchor="middle"
                  fontSize="9" fill="rgba(255,255,255,0.65)"
                  style={{ pointerEvents: 'none' }}>
                  {MODULE_TYPE_LABEL[n.type]} · {n.duration}p
                </text>
                {/* "+" button to start edge */}
                <g
                  transform={`translate(${NODE_R - 5}, ${-NODE_R + 5})`}
                  style={{ cursor: 'crosshair' }}
                  onMouseDown={(e) => startEdgeFrom(e, n.id)}>
                  <circle cx={0} cy={0} r="9" fill="#22d3ee" stroke="rgba(0,0,0,0.5)" />
                  <text x={0} y={3} textAnchor="middle"
                    fontSize="11" fontWeight="bold" fill="#000">+</text>
                </g>
                {/* X button to delete */}
                <g
                  transform={`translate(${NODE_R - 5}, ${NODE_R - 5})`}
                  style={{ cursor: 'pointer' }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    if (confirm(`Xoá node "${n.label}"?`)) removeNode(n.id)
                  }}>
                  <circle cx={0} cy={0} r="8" fill="rgba(239,68,68,0.85)" />
                  <text x={0} y={3} textAnchor="middle"
                    fontSize="10" fontWeight="bold" fill="#fff">×</text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Edit node modal */}
      {editingNodeId && (() => {
        const node = nodes.find((n) => n.id === editingNodeId)
        if (!node) return null
        return (
          <NodeEditModal
            node={node}
            onClose={() => setEditingNodeId(null)}
            onSave={(patch) => {
              updateNode(editingNodeId, { ...patch, contentFilled: true })
              setEditingNodeId(null)
              setForceR((n) => n + 1)
            }}
            onDelete={() => {
              if (confirm(`Xoá node "${node.label}"?`)) {
                removeNode(editingNodeId)
                setEditingNodeId(null)
              }
            }}
          />
        )
      })()}
    </div>
  )
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

// ─── Node Edit Modal ────────────────────────────────────────────

function NodeEditModal({ node, onClose, onSave, onDelete }: {
  node: SketchNode
  onClose: () => void
  onSave: (patch: Partial<SketchNode>) => void
  onDelete: () => void
}) {
  const [label, setLabel] = useState(node.label)
  const [description, setDescription] = useState(node.description || '')
  const [duration, setDuration] = useState(node.duration)
  const [type, setType] = useState(node.type)
  const [difficulty, setDifficulty] = useState(node.difficulty)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#1a1428', border: '1px solid rgba(168,139,250,0.4)', borderRadius: 14,
        padding: 24, maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(168,139,250,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: '#a78bfa' }} />
            Điền nội dung cho node
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {node.kgNodeId && (
          <div style={{
            marginBottom: 12, padding: 8, borderRadius: 6,
            background: 'rgba(168,139,250,0.08)', border: '1px solid rgba(168,139,250,0.25)',
            fontSize: 11, color: 'rgba(255,255,255,0.7)',
          }}>
            🌐 Nguồn KG: <strong style={{ color: '#a78bfa' }}>{node.kgNodeType}</strong> · ID {node.kgNodeId.slice(0, 8)}…
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Tiêu đề (sẽ thành Module title)">
            <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Mô tả chi tiết">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Mục tiêu HS đạt được sau khi học xong node này..." />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Field label="Loại">
              <select value={type} onChange={(e) => setType(e.target.value as SketchModuleOut['type'])} style={inputStyle}>
                {(Object.keys(MODULE_TYPE_LABEL) as Array<SketchModuleOut['type']>).map((t) => (
                  <option key={t} value={t}>{MODULE_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Độ khó">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as SketchModuleOut['difficulty'])} style={inputStyle}>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </Field>
            <Field label="Thời lượng (phút)">
              <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                min={5} max={240} style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={() => onSave({ label, description, duration, type, difficulty })}
            disabled={!label.trim()}
            style={{
              flex: 1, padding: '10px 18px', borderRadius: 8,
              background: !label.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              border: 'none', color: !label.trim() ? 'rgba(255,255,255,0.3)' : '#fff',
              fontWeight: 700, fontSize: 13,
              cursor: !label.trim() ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <Save size={14} /> Lưu nội dung
          </button>
          <button onClick={onDelete}
            style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
              color: '#f87171', fontWeight: 700, fontSize: 12, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <Trash2 size={12} /> Xoá node
          </button>
          <button onClick={onClose}
            style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>
            Huỷ
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '8px 12px',
  color: '#fff', fontSize: 13, outline: 'none',
}
