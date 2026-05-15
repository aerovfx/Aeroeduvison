/**
 * Knowledge Graph Service — đồ thị tri thức cho việc tìm kiếm liên ngành
 *
 * Backend: 4 endpoints
 *  - GET /api/kg/seed              → idempotent seed Vật lí 11 (~80 nodes)
 *  - GET /api/kg/search?q=...      → fuzzy search nodes (trigram + ILIKE)
 *  - GET /api/kg/node/:id          → chi tiết node + 1-hop neighbors
 *  - GET /api/kg/expand/:id?depth= → BFS traversal n-hop (max 3)
 */
import { api } from '@/services/api'

export type KgNodeType =
  | 'Subject' | 'Chapter' | 'Topic' | 'Concept' | 'Formula'
  | 'Question' | 'Lesson' | 'Project' | 'Career' | 'Person'

export interface KgNode {
  id: string
  type: KgNodeType | string
  label: string
  description?: string | null
  properties?: Record<string, any>
  /** Set khi trả về từ /expand — khoảng cách BFS từ start node */
  depth?: number
}

export interface KgEdge {
  id: string
  from_id: string
  to_id: string
  rel_type: string
  weight?: number
  properties?: Record<string, any>
}

export interface KgNeighbor {
  id: string
  label: string
  type: string
  relType: string
  direction: 'in' | 'out'
  weight?: number
}

export interface KgNodeDetail {
  node: KgNode & { source_type?: string; source_id?: string; created_at?: string }
  neighbors: KgNeighbor[]
}

export interface KgExpandResult {
  nodes: KgNode[]
  edges: KgEdge[]
  startId: string
  depth: number
}

// ─── Phase 2 types ─────────────────────────────────────────────────
export interface KgExtractInput {
  /** Văn bản thô (≥30 chars, ≤30000 chars). Bỏ qua nếu cung cấp source. */
  text?: string
  /** Hoặc trích từ source DB sẵn có. */
  source?: { type: 'lesson_plan' | 'transcript'; id: string }
  /** Sau extract có tự động link similarity không (default true). */
  autoLink?: boolean
}

export interface KgExtractResult {
  extracted: {
    topics: Array<{ label: string; description?: string }>
    concepts: Array<{ label: string; description?: string }>
    formulas: Array<{ label: string; description?: string; unit?: string }>
    edges: Array<{ from: string; to: string; rel: string }>
  }
  persisted: {
    newNodes: Array<{ id: string; label: string; type: string }>
    reusedNodes: Array<{ id: string; label: string; type: string }>
    newEdges: Array<{ from: string; to: string; rel: string }>
    skippedEdges: number
  }
  autoLink: { linked: number } | null
  sourceNodeId: string | null
  tookMs: number
}

export interface KgLessonPlanSource {
  id: string
  title: string
  subject?: string | null
  wordCount?: number | null
  updatedAt?: string | null
}

export const knowledgeGraphService = {
  /** Seed dữ liệu Vật lí 11 vào graph (idempotent). */
  seed: () =>
    api.get<{ success: boolean; nodeCount: number; edgeCount: number; edgeInserted: number; message: string }>('/kg/seed')
      .then(r => r.data),

  /** Fuzzy search nodes theo label. Optional filter by type. */
  search: (q: string, opts?: { type?: KgNodeType | string; limit?: number }) =>
    api.get<{ success: boolean; items: KgNode[] }>('/kg/search', {
      params: {
        q,
        ...(opts?.type ? { type: opts.type } : {}),
        ...(opts?.limit ? { limit: opts.limit } : {}),
      },
    }).then(r => r.data.items || []),

  /** Chi tiết 1 node + tất cả 1-hop neighbors (cả in + out). */
  getNode: (id: string) =>
    api.get<{ success: boolean } & KgNodeDetail>(`/kg/node/${encodeURIComponent(id)}`)
      .then(r => ({ node: r.data.node, neighbors: r.data.neighbors })),

  /** Mở rộng graph từ node — BFS depth ≤ 3. */
  expand: (id: string, depth: number = 2) =>
    api.get<{ success: boolean } & KgExpandResult>(`/kg/expand/${encodeURIComponent(id)}`, {
      params: { depth: Math.min(3, Math.max(1, depth)) },
    }).then(r => ({
      nodes: r.data.nodes || [],
      edges: r.data.edges || [],
      startId: r.data.startId,
      depth: r.data.depth,
    })),

  // ── Phase 2: AI extract + similarity linking ─────────────────────

  /** AI extract entities từ text hoặc lesson_plan/transcript có sẵn. */
  extract: (input: KgExtractInput, timeout: number = 90_000) =>
    api.post<{ success: boolean } & KgExtractResult>('/kg/extract', input, { timeout })
      .then(r => r.data),

  /** Quét toàn bộ nodes, tạo RELATES_TO cho cặp có similarity ≥ threshold. */
  linkSimilar: (opts?: { type?: string; threshold?: number }) =>
    api.post<{ success: boolean; linked: number; scanned: number; threshold: number; tookMs: number }>(
      '/kg/link-similar', opts || {}
    ).then(r => r.data),

  /** List lesson plans cho dropdown trong UI extract. */
  listLessonPlans: (limit: number = 50) =>
    api.get<{ success: boolean; items: KgLessonPlanSource[] }>('/kg/sources/lesson-plans', {
      params: { limit },
    }).then(r => r.data.items || []),
}

// ─── Helpers cho UI ────────────────────────────────────────────────
export const NODE_TYPE_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  Subject:  { fill: 'rgba(96,165,250,0.15)',  stroke: '#60a5fa', text: '#bfdbfe' },
  Chapter:  { fill: 'rgba(167,139,250,0.15)', stroke: '#a78bfa', text: '#ddd6fe' },
  Topic:    { fill: 'rgba(52,211,153,0.15)',  stroke: '#34d399', text: '#a7f3d0' },
  Concept:  { fill: 'rgba(250,204,21,0.15)',  stroke: '#facc15', text: '#fef08a' },
  Formula:  { fill: 'rgba(251,146,60,0.15)',  stroke: '#fb923c', text: '#fed7aa' },
  Question: { fill: 'rgba(248,113,113,0.15)', stroke: '#f87171', text: '#fecaca' },
  Lesson:   { fill: 'rgba(34,211,238,0.15)',  stroke: '#22d3ee', text: '#a5f3fc' },
  Project:  { fill: 'rgba(192,132,252,0.15)', stroke: '#c084fc', text: '#e9d5ff' },
  Career:   { fill: 'rgba(244,114,182,0.15)', stroke: '#f472b6', text: '#fbcfe8' },
  Person:   { fill: 'rgba(148,163,184,0.15)', stroke: '#94a3b8', text: '#e2e8f0' },
}

export const NODE_TYPE_LABELS: Record<string, string> = {
  Subject:  'Môn học',
  Chapter:  'Chương',
  Topic:    'Chủ đề',
  Concept:  'Khái niệm',
  Formula:  'Công thức',
  Question: 'Câu hỏi',
  Lesson:   'Bài giảng',
  Project:  'Dự án',
  Career:   'Nghề nghiệp',
  Person:   'Người',
}

export const REL_TYPE_LABELS: Record<string, string> = {
  HAS_CHAPTER:        'có chương',
  HAS_TOPIC:          'có chủ đề',
  USES_FORMULA:       'dùng công thức',
  USES_CONCEPT:       'dùng khái niệm',
  RELATES_TO:         'liên quan',
  APPLIED_IN_CAREER:  'ứng dụng trong nghề',
  REQUIRES:           'yêu cầu',
  IS_A:               'là một',
  PART_OF_PATH:       'thuộc lộ trình',
  ASSESSES_TOPIC:     'kiểm tra chủ đề',
  MASTERED_BY:        'đã thông thạo',
}

/** Trả màu cho type, fallback grey nếu type lạ. */
export function getNodeColor(type: string) {
  return NODE_TYPE_COLORS[type] || { fill: 'rgba(148,163,184,0.15)', stroke: '#94a3b8', text: '#e2e8f0' }
}
