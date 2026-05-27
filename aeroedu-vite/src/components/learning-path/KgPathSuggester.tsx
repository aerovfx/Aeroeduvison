/**
 * KgPathSuggester — Gợi ý mục lục lộ trình từ Knowledge Graph
 *
 * User: "https://inphysic.com/teacher/learning-path-builder được xây
 *  dựng dựa trên KG nhé, thuật toán gợi ý tự động tìm các node có mối
 *  quan hệ với nhau và gợi ý xây dựng lộ trình học tập theo gợi ý từ
 *  các node trong KG"
 *
 * 3 chế độ:
 *   1. 🛤  Lộ trình ngắn nhất — BFS từ "đang ở" → "muốn đạt" (Phase 4)
 *   2. 🕸  Khám phá liên quan — graph-walk 2-hops từ 1 node hạt giống
 *   3. 🧠 AI gợi ý tiếp — Phoenix recommendation theo mục tiêu
 *
 * Click "Thêm" trên mỗi node để convert thành Module → push vào builder.
 * Click "Thêm tất cả" để bulk import cả lộ trình.
 */
import { useState, useCallback, useRef } from 'react'
import {
  Search, Loader2, GitBranch, Network, Sparkles, Plus, Check,
  ArrowRight, AlertCircle, Target, X,
} from 'lucide-react'
import {
  knowledgeGraphService, knowledgeGraphBrainV2,
  NODE_TYPE_LABELS, REL_TYPE_LABELS, getNodeColor,
  type KgNode, type KgPathStep, type KgRelatedNode,
} from '@/services/knowledge-graph.service'

/* ── Module convert types (mirror builder's Module) ─────────────── */
export interface KgSuggestedModule {
  id: string
  type: 'lesson' | 'quiz' | 'project' | 'assignment' | 'video' | 'survey' | 'final-exam' | 'stem-skill' | 'challenge'
  title: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard'
  duration: number
  xpTarget: number
  description?: string
  tags?: string[]
  /** Lưu vết source KG để debug/audit */
  kgNodeId?: string
  kgNodeType?: string
}

interface Props {
  pathSubject: string
  onAdd: (m: KgSuggestedModule) => void
  onAddMany: (mods: KgSuggestedModule[]) => void
  /** ID các module đã có (để tránh thêm trùng) — match theo kgNodeId */
  existingKgNodeIds?: string[]
}

/* ── Helpers convert KG node → Module ─────────────────────────────── */
function kgNodeTypeToModuleType(t: string): KgSuggestedModule['type'] {
  switch (t) {
    case 'Question': return 'quiz'
    case 'Project':  return 'project'
    case 'Lesson':   return 'lesson'
    case 'Formula':  return 'lesson'
    case 'Concept':  return 'lesson'
    case 'Topic':    return 'lesson'
    case 'Chapter':  return 'lesson'
    case 'Subject':  return 'lesson'
    default:         return 'lesson'
  }
}

function masteryToDifficulty(score: number | null | undefined): KgSuggestedModule['difficulty'] {
  if (score == null) return 'medium'
  if (score < 30) return 'medium'   // còn yếu — học lại bình thường
  if (score < 70) return 'medium'   // đang học — TB
  return 'easy'                     // đã thông thạo — ôn nhẹ
}

function nodeToModule(
  node: { id: string; label: string; type: string; description?: string | null },
  opts: { subject: string; estimatedMinutes?: number; masteryScore?: number | null },
): KgSuggestedModule {
  const duration = Math.max(15, Math.min(120, opts.estimatedMinutes ?? 30))
  const type = kgNodeTypeToModuleType(node.type)
  return {
    id: `kg-${node.id}-${Date.now().toString(36)}`,
    type,
    title: node.label,
    subject: opts.subject,
    difficulty: masteryToDifficulty(opts.masteryScore),
    duration,
    xpTarget: 80 + Math.round(duration * 2),
    description: node.description || undefined,
    tags: [node.type, 'kg'],
    kgNodeId: node.id,
    kgNodeType: node.type,
  }
}

/* ── Mode-tab style ───────────────────────────────────────────────── */
const tabBase: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
  fontSize: 11.5, fontWeight: 700, border: '1px solid transparent',
  display: 'inline-flex', alignItems: 'center', gap: 5,
}
const tabActive: React.CSSProperties = {
  ...tabBase,
  background: 'rgba(168,139,250,0.18)', border: '1px solid #a78bfa', color: '#a78bfa',
}
const tabIdle: React.CSSProperties = {
  ...tabBase,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, color: '#fff', fontSize: 12, padding: '6px 10px',
  width: '100%', boxSizing: 'border-box', outline: 'none',
}

/* ── Node search dropdown (shared by all modes) ────────────────────── */
function NodeSearchPicker({
  label, placeholder, value, onPick, allowClear,
}: {
  label: string
  placeholder: string
  value: KgNode | null
  onPick: (n: KgNode | null) => void
  allowClear?: boolean
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<KgNode[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback((query: string) => {
    if (debRef.current) clearTimeout(debRef.current)
    if (!query.trim()) { setResults([]); return }
    debRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const items = await knowledgeGraphService.search(query.trim(), { limit: 12 })
        setResults(items)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 250)
  }, [])

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      {value ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
          background: getNodeColor(value.type).fill,
          border: `1px solid ${getNodeColor(value.type).stroke}40`,
          borderRadius: 8, fontSize: 12,
        }}>
          <span style={{ fontWeight: 700, color: getNodeColor(value.type).text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value.label}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7, color: getNodeColor(value.type).text }}>
            {NODE_TYPE_LABELS[value.type] || value.type}
          </span>
          {allowClear !== false && (
            <button
              onClick={() => onPick(null)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, opacity: 0.6 }}
              title="Bỏ chọn"
            >
              <X size={11} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.4)',
            }} />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); doSearch(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={placeholder}
              style={{ ...inputStyle, paddingLeft: 26 }}
            />
            {loading && (
              <Loader2 size={11} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)', animation: 'spin 1s linear infinite',
              }} />
            )}
          </div>
          {open && results.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              marginTop: 4, maxHeight: 220, overflowY: 'auto',
              background: '#1a1623', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {results.map(n => (
                <button
                  key={n.id}
                  onClick={() => { onPick(n); setQ(''); setResults([]); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    color: '#fff', cursor: 'pointer', fontSize: 12,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,139,250,0.10)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: getNodeColor(n.type).stroke, flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                    {NODE_TYPE_LABELS[n.type] || n.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────────────── */
type Mode = 'path' | 'related' | 'recommend'

export default function KgPathSuggester({ pathSubject, onAdd, onAddMany, existingKgNodeIds = [] }: Props) {
  const [mode, setMode] = useState<Mode>('path')

  // Path mode
  const [fromNode, setFromNode] = useState<KgNode | null>(null)
  const [toNode, setToNode] = useState<KgNode | null>(null)
  const [pathResult, setPathResult] = useState<KgPathStep[] | null>(null)
  const [pathMessage, setPathMessage] = useState<string>('')
  const [pathLoading, setPathLoading] = useState(false)

  // Related mode
  const [seedNode, setSeedNode] = useState<KgNode | null>(null)
  const [relatedNodes, setRelatedNodes] = useState<KgRelatedNode[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  // Recommend mode
  const [focus, setFocus] = useState<'next-to-learn' | 'review' | 'discover' | 'goal'>('next-to-learn')
  const [goalNode, setGoalNode] = useState<KgNode | null>(null)
  const [recItems, setRecItems] = useState<Array<{ id: string; label: string; type: string; description?: string | null; reasons: string[]; score: number }>>([])
  const [recLoading, setRecLoading] = useState(false)

  /* ── Actions ── */
  const runFindPath = async () => {
    if (!toNode) return
    setPathLoading(true); setPathResult(null); setPathMessage('')
    try {
      const r = await knowledgeGraphService.findPath({
        toId: toNode.id,
        fromId: fromNode?.id,
        autoFromWeak: !fromNode,
        maxLen: 10,
      })
      setPathResult(r.path || [])
      setPathMessage(r.message || (r.found ? `Tìm thấy ${r.hops + 1} bước` : 'Không tìm thấy đường đi'))
    } catch (e) {
      setPathMessage((e as { message?: string })?.message || 'Lỗi tìm path')
    } finally { setPathLoading(false) }
  }

  const runRelated = async () => {
    if (!seedNode) return
    setRelatedLoading(true); setRelatedNodes([])
    try {
      const r = await knowledgeGraphBrainV2.related(seedNode.id, 12)
      setRelatedNodes(r.related || [])
    } catch { setRelatedNodes([]) }
    finally { setRelatedLoading(false) }
  }

  const runRecommend = async () => {
    setRecLoading(true); setRecItems([])
    try {
      const r = await knowledgeGraphBrainV2.recommend({
        focus,
        goalId: focus === 'goal' ? goalNode?.id : undefined,
        limit: 10,
      })
      setRecItems(r.items.map(it => ({
        id: it.id, label: it.label, type: it.type, description: it.description,
        reasons: it.reasons || [], score: it.score,
      })))
    } catch { setRecItems([]) }
    finally { setRecLoading(false) }
  }

  /* ── Add helpers ── */
  const existingSet = new Set(existingKgNodeIds)
  const isAdded = (nodeId: string) => existingSet.has(nodeId)

  const addOne = (node: { id: string; label: string; type: string; description?: string | null }, est?: number, mastery?: number | null) => {
    if (isAdded(node.id)) return
    onAdd(nodeToModule(node, { subject: pathSubject, estimatedMinutes: est, masteryScore: mastery }))
  }

  const addPathAll = () => {
    if (!pathResult || pathResult.length === 0) return
    const mods = pathResult
      .filter(s => !isAdded(s.nodeId))
      .map(s => nodeToModule(
        { id: s.nodeId, label: s.label, type: s.type, description: s.description },
        { subject: pathSubject, estimatedMinutes: s.estimatedMinutes, masteryScore: s.masteryScore }
      ))
    if (mods.length > 0) onAddMany(mods)
  }

  const addRelatedAll = () => {
    if (relatedNodes.length === 0) return
    const mods = relatedNodes
      .filter(n => !isAdded(n.id))
      .map(n => nodeToModule(
        { id: n.id, label: n.label, type: n.type, description: n.description },
        { subject: pathSubject }
      ))
    if (mods.length > 0) onAddMany(mods)
  }

  /* ── Render ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <button onClick={() => setMode('path')} style={mode === 'path' ? tabActive : tabIdle}>
          <GitBranch size={11} /> Lộ trình
        </button>
        <button onClick={() => setMode('related')} style={mode === 'related' ? tabActive : tabIdle}>
          <Network size={11} /> Liên quan
        </button>
        <button onClick={() => setMode('recommend')} style={mode === 'recommend' ? tabActive : tabIdle}>
          <Sparkles size={11} /> AI gợi ý
        </button>
      </div>

      {/* ── Mode: PATH ── */}
      {mode === 'path' && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.45 }}>
            Tìm đường ngắn nhất qua KG từ <strong>"đang ở"</strong> → <strong>"muốn đạt"</strong>.
            Nếu để trống "Đang ở", thuật toán tự chọn từ node yếu của HS (hoặc môn gốc).
          </div>
          <NodeSearchPicker
            label="Đang ở (tuỳ chọn)"
            placeholder="VD: Định luật Newton..."
            value={fromNode}
            onPick={setFromNode}
          />
          <NodeSearchPicker
            label="Mục tiêu *"
            placeholder="VD: Định luật bảo toàn năng lượng..."
            value={toNode}
            onPick={setToNode}
          />
          <button
            onClick={runFindPath}
            disabled={!toNode || pathLoading}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, cursor: !toNode ? 'not-allowed' : 'pointer',
              background: !toNode ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              border: 'none', color: !toNode ? 'rgba(255,255,255,0.3)' : '#fff',
              fontWeight: 700, fontSize: 12,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: pathLoading ? 0.6 : 1,
            }}
          >
            {pathLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Target size={12} />}
            Gợi ý lộ trình
          </button>

          {pathMessage && !pathResult?.length && (
            <div style={{
              marginTop: 8, padding: 8, borderRadius: 6, fontSize: 11,
              background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <AlertCircle size={12} /> {pathMessage}
            </div>
          )}

          {pathResult && pathResult.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  {pathResult.length} bước · {pathResult.reduce((s, n) => s + (n.estimatedMinutes || 30), 0)} phút
                </span>
                <button
                  onClick={addPathAll}
                  style={{
                    padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)',
                    color: '#4ade80', fontSize: 10.5, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Plus size={10} /> Thêm tất cả
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pathResult.map((s, i) => {
                  const added = isAdded(s.nodeId)
                  const c = getNodeColor(s.type)
                  return (
                    <div key={s.nodeId} style={{
                      display: 'flex', flexDirection: 'column', gap: 3,
                    }}>
                      {s.relFromPrev && (
                        <div style={{
                          paddingLeft: 16, fontSize: 9.5, color: 'rgba(255,255,255,0.35)',
                          fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <ArrowRight size={9} />
                          {REL_TYPE_LABELS[s.relFromPrev] || s.relFromPrev}
                        </div>
                      )}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: 7,
                        background: c.fill, border: `1px solid ${c.stroke}30`, borderRadius: 7,
                      }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          background: c.stroke, color: '#0a0612', fontSize: 10, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 11.5, color: c.text, lineHeight: 1.25 }}>
                            {s.label}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
                            {NODE_TYPE_LABELS[s.type] || s.type} · {s.estimatedMinutes || 30}p
                            {s.masteryScore != null && ` · ${s.masteryScore}%`}
                          </div>
                        </div>
                        <button
                          onClick={() => addOne({ id: s.nodeId, label: s.label, type: s.type, description: s.description }, s.estimatedMinutes, s.masteryScore)}
                          disabled={added}
                          style={{
                            padding: 4, borderRadius: 5, cursor: added ? 'default' : 'pointer',
                            background: added ? 'rgba(74,222,128,0.15)' : 'rgba(168,139,250,0.15)',
                            border: `1px solid ${added ? 'rgba(74,222,128,0.4)' : 'rgba(168,139,250,0.4)'}`,
                            color: added ? '#4ade80' : '#a78bfa',
                          }}
                        >
                          {added ? <Check size={10} /> : <Plus size={10} />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mode: RELATED ── */}
      {mode === 'related' && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.45 }}>
            Chọn 1 node hạt giống — thuật toán tìm 2-hop neighbors có quan hệ
            chặt chẽ nhất (theo relevance score).
          </div>
          <NodeSearchPicker
            label="Node hạt giống *"
            placeholder="VD: Đạo hàm, Lực Coulomb..."
            value={seedNode}
            onPick={setSeedNode}
          />
          <button
            onClick={runRelated}
            disabled={!seedNode || relatedLoading}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, cursor: !seedNode ? 'not-allowed' : 'pointer',
              background: !seedNode ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #0891b2, #0e7490)',
              border: 'none', color: !seedNode ? 'rgba(255,255,255,0.3)' : '#fff',
              fontWeight: 700, fontSize: 12,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: relatedLoading ? 0.6 : 1,
            }}
          >
            {relatedLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Network size={12} />}
            Tìm liên quan
          </button>

          {relatedNodes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  {relatedNodes.length} node liên quan
                </span>
                <button
                  onClick={addRelatedAll}
                  style={{
                    padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)',
                    color: '#4ade80', fontSize: 10.5, fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Plus size={10} /> Thêm tất cả
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {relatedNodes.map(n => {
                  const added = isAdded(n.id)
                  const c = getNodeColor(n.type)
                  // Relevance bar (0..1)
                  const relPct = Math.max(0, Math.min(100, Math.round(n.relevance * 100)))
                  return (
                    <div key={n.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: 7,
                      background: c.fill, border: `1px solid ${c.stroke}30`, borderRadius: 7,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 11.5, color: c.text }}>{n.label}</span>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>·{n.depth}-hop</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <div style={{
                            height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2,
                            overflow: 'hidden', flex: 1,
                          }}>
                            <div style={{
                              height: '100%', width: `${relPct}%`, background: c.stroke, borderRadius: 2,
                            }} />
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, minWidth: 24 }}>
                            {relPct}%
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => addOne(n)}
                        disabled={added}
                        style={{
                          padding: 4, borderRadius: 5, cursor: added ? 'default' : 'pointer',
                          background: added ? 'rgba(74,222,128,0.15)' : 'rgba(168,139,250,0.15)',
                          border: `1px solid ${added ? 'rgba(74,222,128,0.4)' : 'rgba(168,139,250,0.4)'}`,
                          color: added ? '#4ade80' : '#a78bfa',
                        }}
                      >
                        {added ? <Check size={10} /> : <Plus size={10} />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Mode: RECOMMEND ── */}
      {mode === 'recommend' && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 8, lineHeight: 1.45 }}>
            Phoenix-style AI gợi ý — kết hợp mastery + popularity + prerequisites.
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 4, textTransform: 'uppercase' }}>
            Mục tiêu
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {([
              ['next-to-learn', 'Học tiếp'],
              ['review',        'Ôn tập'],
              ['discover',      'Khám phá'],
              ['goal',          'Theo mục tiêu'],
            ] as const).map(([f, lbl]) => (
              <button key={f} onClick={() => setFocus(f)}
                style={focus === f ? { ...tabActive, padding: '4px 8px', fontSize: 10.5 } : { ...tabIdle, padding: '4px 8px', fontSize: 10.5 }}>
                {lbl}
              </button>
            ))}
          </div>
          {focus === 'goal' && (
            <NodeSearchPicker
              label="Mục tiêu *"
              placeholder="Chọn node muốn đạt..."
              value={goalNode}
              onPick={setGoalNode}
            />
          )}
          <button
            onClick={runRecommend}
            disabled={recLoading || (focus === 'goal' && !goalNode)}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              cursor: (focus === 'goal' && !goalNode) ? 'not-allowed' : 'pointer',
              background: (focus === 'goal' && !goalNode) ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #c026d3, #a21caf)',
              border: 'none', color: (focus === 'goal' && !goalNode) ? 'rgba(255,255,255,0.3)' : '#fff',
              fontWeight: 700, fontSize: 12,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: recLoading ? 0.6 : 1,
            }}
          >
            {recLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
            Lấy gợi ý
          </button>

          {recItems.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recItems.map(it => {
                const added = isAdded(it.id)
                const c = getNodeColor(it.type)
                return (
                  <div key={it.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: 7,
                    background: c.fill, border: `1px solid ${c.stroke}30`, borderRadius: 7,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 11.5, color: c.text }}>{it.label}</div>
                      {it.reasons.length > 0 && (
                        <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.3 }}>
                          {it.reasons.slice(0, 2).join(' · ')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => addOne(it)}
                      disabled={added}
                      style={{
                        padding: 4, borderRadius: 5, cursor: added ? 'default' : 'pointer',
                        background: added ? 'rgba(74,222,128,0.15)' : 'rgba(168,139,250,0.15)',
                        border: `1px solid ${added ? 'rgba(74,222,128,0.4)' : 'rgba(168,139,250,0.4)'}`,
                        color: added ? '#4ade80' : '#a78bfa',
                      }}
                    >
                      {added ? <Check size={10} /> : <Plus size={10} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
