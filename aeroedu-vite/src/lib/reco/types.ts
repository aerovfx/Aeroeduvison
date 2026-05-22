/**
 * Recommendation framework — TypeScript port của X For You candidate-pipeline.
 *
 * Phân lớp 4 stage cho mọi pipeline đề xuất nội dung trong aeroedu:
 *   Source    → fetch candidates từ 1 nguồn (DB query, in-memory, API…)
 *   Hydrator  → enrich candidates với metadata (counts, embeddings, tags…)
 *   Filter    → drop candidates không đủ điều kiện
 *   Scorer    → assign score 0..1 cho từng candidate
 *
 * Sau khi qua hết 4 stage → mixer sort theo score, lấy top K trả về.
 *
 * Reference: /Users/pixidev/Aeroeduvison/algorithm/candidate-pipeline/
 */

/** Context truyền qua mọi stage — user identity + history + filters người dùng */
export interface RecoContext {
  /** ID học sinh (nullable cho anonymous browsing) */
  userId: string | null
  /** Tên hiển thị (cho personalization) */
  userName?: string
  /** Lịch sử làm bài (cached client-side trong localStorage) */
  history: Array<{
    examId: string
    subject?: string
    topic?: string
    percentage: number
    completedAt: string
  }>
  /** Subject HS đang học (lớp) — để filter theo cấp */
  grade?: string
  /** Topic yếu cần luyện (avg < 60%) — từ ExamPrepStats */
  weakTopics?: string[]
  /** Topic mạnh (avg ≥ 80%) — để tránh dồn đề quá dễ */
  strongTopics?: string[]
  /** Timestamp request (cho recency calc) */
  now: number
  /** Tracking flags — A/B test source */
  experiments?: Record<string, boolean>
}

/** Base trait cho mọi stage — name + enable check */
export interface CandidateStage {
  /** Tên hiển thị trong logs/debug */
  name: string
  /** Tắt stage này nếu return false (cho feature flag / A/B) */
  enable?: (ctx: RecoContext) => boolean
}

/** Source — fetch candidates ban đầu */
export interface Source<T> extends CandidateStage {
  fetch: (ctx: RecoContext) => Promise<T[]>
}

/** Hydrator — enrich candidates với data bổ sung. Phải preserve order + cardinality. */
export interface Hydrator<T> extends CandidateStage {
  enrich: (items: T[], ctx: RecoContext) => Promise<T[]>
}

/** Filter — predicate, return false để drop item */
export interface Filter<T> extends CandidateStage {
  predicate: (item: T, ctx: RecoContext) => boolean
}

/** Scorer — assign score (0..1). Score cuối = trung bình weighted của tất cả scorer. */
export interface Scorer<T> extends CandidateStage {
  /** Trọng số scorer này khi tổng hợp final score (default 1.0) */
  weight?: number
  /** Trả về array score song song với items (cùng index) */
  score: (items: T[], ctx: RecoContext) => Promise<number[]>
}

/** Item đã có score sau khi qua pipeline */
export type Scored<T> = T & {
  /** Score tổng hợp 0..1 */
  __score: number
  /** Breakdown từng scorer để debug */
  __breakdown?: Record<string, number>
  /** Lý do gợi ý — concat từ scorer (vd "Phù hợp Hàm số · Bạn cùng lớp đã làm") */
  __reasons?: string[]
}

/** Cấu hình pipeline */
export interface MixerConfig<T> {
  sources: Source<T>[]
  hydrators?: Hydrator<T>[]
  filters?: Filter<T>[]
  scorers: Scorer<T>[]
  /** Số candidates trả về sau khi rank */
  topK: number
  /** Dedupe key — function trả về unique id cho mỗi item */
  dedupeKey: (item: T) => string
  /** (Optional) Đường truyền lý do — gắn vào __reasons nếu scorer score > threshold */
  reasonThreshold?: number
}
