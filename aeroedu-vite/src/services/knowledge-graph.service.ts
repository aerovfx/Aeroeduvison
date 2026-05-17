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

// ─── Phase 3 types: Personal Mastery Layer ───────────────────────
export interface KgMasteryEntry {
  score: number       // 0-100
  attempts: number
  source?: string | null
  updatedAt: string
}

export interface KgMasteryMap {
  [nodeId: string]: KgMasteryEntry
}

export interface KgMasteryStats {
  total: number
  weak: number      // score < 30
  learning: number  // 30 ≤ score < 70
  mastered: number  // score ≥ 70
  avgScore: number
}

export interface KgWeakTopic {
  nodeId: string
  label: string
  type: string
  score: number
  attempts: number
  description?: string | null
  updatedAt: string
}

export interface KgMasteryUpdate {
  nodeId: string
  /** 0-100 */
  score: number
  /** 'exam' | 'manual' | 'ai-extract' | 'practice' */
  source?: string
}

// ─── Phase 4 types: Auto Learning Path from Graph ────────────────
export interface KgPathStep {
  nodeId: string
  order: number
  label: string
  type: string
  description?: string | null
  /** Mastery score 0-100 nếu user đã có data, null nếu chưa */
  masteryScore: number | null
  /** Tên relation từ step trước → step này (null cho step 1) */
  relFromPrev: string | null
  /** Estimated phút để học step này */
  estimatedMinutes?: number
}

export interface KgPathResult {
  found: boolean
  fromId: string
  toId: string
  hops: number
  path: KgPathStep[]
  /** Tổng thời gian estimate (phút) */
  totalMinutes?: number
  message?: string
}

export interface KgSaveAsLearningPathInput {
  path: KgPathStep[]
  name: string
  description?: string
  subject?: string
  fromLabel?: string
  toLabel?: string
}

export interface KgSaveAsLearningPathResult {
  pathId: string
  assignmentId: string
  modulesCount: number
  totalDuration: number
  totalXP: number
  message: string
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

  // ── Phase 3: Personal Mastery Layer ──────────────────────────────

  /** GET mastery của user hiện tại: Map<nodeId, {score, attempts...}> */
  getMyMastery: () =>
    api.get<{ success: boolean; mastery: KgMasteryMap; count: number }>('/kg/mastery/me')
      .then(r => r.data.mastery || {}),

  /** Bulk update mastery (vd. sau khi nộp bài thi). */
  updateMastery: (updates: KgMasteryUpdate[], incrementAttempts: boolean = true) =>
    api.post<{ success: boolean; upserted: number; total: number }>(
      '/kg/mastery/update',
      { updates, incrementAttempts }
    ).then(r => r.data),

  /** GET aggregate stats + top 10 weak topics + recent activity. */
  getMasteryStats: () =>
    api.get<{
      success: boolean
      stats: KgMasteryStats
      weakTopics: KgWeakTopic[]
      recent: Array<{ nodeId: string; label: string; type: string; score: number; updatedAt: string }>
    }>('/kg/mastery/stats/me').then(r => ({
      stats: r.data.stats,
      weakTopics: r.data.weakTopics || [],
      recent: r.data.recent || [],
    })),

  // ── Phase 4: Auto Learning Path from Graph ───────────────────────

  /** Tìm BFS shortest path từ fromId → toId (undirected graph).
   *  Nếu fromId rỗng + autoFromWeak=true + có user: tự pick từ weak mastery.
   *  Fallback: subj-vatli làm start. */
  findPath: (params: {
    toId: string
    fromId?: string
    maxLen?: number
    autoFromWeak?: boolean
  }) =>
    api.post<{ success: boolean } & KgPathResult>('/kg/path/find', params)
      .then(r => ({
        found: r.data.found,
        fromId: r.data.fromId,
        toId: r.data.toId,
        hops: r.data.hops,
        path: r.data.path || [],
        totalMinutes: r.data.totalMinutes,
        message: r.data.message,
      })),

  /** Save graph-derived path thành Learning Path thật + auto-assign cho user. */
  savePathAsLearningPath: (input: KgSaveAsLearningPathInput) =>
    api.post<{ success: boolean } & KgSaveAsLearningPathResult>(
      '/kg/path/save-as-learning-path', input
    ).then(r => r.data),

  // ── Phase 5: Cross-Subject seed ──────────────────────────────────
  /** Seed cả 3 môn Lý + Toán + Hóa với cross-edges. */
  seedAllSubjects: () =>
    api.get<{ success: boolean; nodeCount: number; edgeInserted: number; message: string }>(
      '/kg/seed?subjects=all'
    ).then(r => r.data),

  // ── Phase 6: AI Smart Search ─────────────────────────────────────
  /** Hỏi AI bằng câu NL tự nhiên → AI match best nodes + có thể đề
   *  xuất path. Timeout 90s vì AI có thể chậm. */
  smartQuery: (query: string, limit: number = 8) =>
    api.post<{
      success: boolean
      query: string; intent: string; explanation: string
      suggestedNodes: KgNode[]
      suggestedPathTo: string | null
    }>('/kg/smart-query', { query, limit }, { timeout: 90_000 })
      .then(r => ({
        intent: r.data.intent,
        explanation: r.data.explanation,
        suggestedNodes: r.data.suggestedNodes || [],
        suggestedPathTo: r.data.suggestedPathTo,
      })),

  // ── Phase 7: Collaborative suggestions ──────────────────────────
  submitSuggestion: (input: {
    kind: 'add_node' | 'add_edge' | 'edit_node' | 'remove'
    payload: Record<string, any>
    reason?: string
  }) =>
    api.post<{ success: boolean; id: string; message: string }>(
      '/kg/suggestions', input
    ).then(r => r.data),

  listSuggestions: (status: 'pending' | 'approved' | 'rejected' = 'pending') =>
    api.get<{
      success: boolean
      items: Array<{
        id: string; authorId: string | null; kind: string
        payload: any; status: string; upvotes: number
        reason: string | null; createdAt: string; reviewedAt: string | null
      }>
      count: number
    }>('/kg/suggestions', { params: { status, limit: 50 } })
      .then(r => r.data.items || []),

  upvoteSuggestion: (id: string) =>
    api.post<{ success: boolean; upvotes: number }>(`/kg/suggestions/${id}/upvote`)
      .then(r => r.data),
}

/** Trả màu mastery overlay theo score 0-100 */
export function getMasteryColor(score: number | undefined): {
  fill: string; stroke: string; label: string
} {
  if (score === undefined) return { fill: 'rgba(148,163,184,0.1)', stroke: '#475569', label: 'chưa có dữ liệu' }
  if (score < 30)  return { fill: 'rgba(244,63,94,0.25)',  stroke: '#f43f5e', label: 'còn yếu' }
  if (score < 70)  return { fill: 'rgba(251,191,36,0.25)', stroke: '#fbbf24', label: 'đang học' }
  return { fill: 'rgba(16,185,129,0.25)', stroke: '#10b981', label: 'đã thông thạo' }
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
