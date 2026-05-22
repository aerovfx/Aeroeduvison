/**
 * Spaced Repetition System (SM-2) — algorithm Anki/Mnemosyne dùng.
 *
 * Mỗi câu hỏi có 1 review record:
 *   - easeFactor (EF): 1.3..2.5+ — câu dễ nhớ EF cao, câu khó EF giảm
 *   - interval: số ngày tới review tiếp theo
 *   - repetitions: số lần ôn liên tiếp đúng (reset khi sai)
 *   - dueAt: timestamp lần ôn tiếp theo
 *
 * User rate mỗi lần xem: 0-5
 *   0-2 → quên (reset rep, interval về 1)
 *   3   → hard (interval × EF, EF -= 0.15)
 *   4   → good (interval × EF)
 *   5   → easy (interval × EF × 1.3, EF += 0.15)
 *
 * Storage: localStorage `aero_srs_v1` — Map<questionId, ReviewRecord>
 * Sẽ migrate sang IndexedDB hoặc BE khi > 10K cards/user.
 *
 * Reference: https://en.wikipedia.org/wiki/SuperMemo#Algorithm_SM-2
 */

export type Rating = 0 | 1 | 2 | 3 | 4 | 5

export interface ReviewRecord {
  /** Question id */
  qid: string
  /** Ease factor — cao = dễ nhớ. Min 1.3 để tránh stuck */
  ef: number
  /** Khoảng ngày tới review tiếp theo */
  interval: number
  /** Số lần ôn liên tiếp đúng (reset khi rate < 3) */
  reps: number
  /** Timestamp last review */
  lastReviewedAt: number
  /** Timestamp due — Date.now() >= dueAt nghĩa là cần ôn */
  dueAt: number
  /** Optional metadata để filter */
  subject?: string
  topic?: string
}

const STORAGE_KEY = 'aero_srs_v1'
const MIN_EF = 1.3
const MAX_EF = 3.0

/* ── Storage ──────────────────────────────────────────── */
function load(): Record<string, ReviewRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) || {}
  } catch { return {} }
}

function save(state: Record<string, ReviewRecord>): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

/* ── Core SM-2 ────────────────────────────────────────── */

/**
 * Cập nhật record sau khi user rate.
 * Trả về record mới (immutable, không mutate input).
 */
export function applyRating(prev: ReviewRecord, rating: Rating, now = Date.now()): ReviewRecord {
  let { ef, interval, reps } = prev
  const r = Math.max(0, Math.min(5, rating))

  if (r < 3) {
    // Quên — reset
    reps = 0
    interval = 1
  } else {
    if (reps === 0) interval = 1
    else if (reps === 1) interval = 6
    else interval = Math.ceil(interval * ef)
    reps += 1
  }

  // Update EF
  ef = ef + (0.1 - (5 - r) * (0.08 + (5 - r) * 0.02))
  ef = Math.max(MIN_EF, Math.min(MAX_EF, ef))

  // Easy bonus
  if (r === 5) ef = Math.min(MAX_EF, ef + 0.05)

  const lastReviewedAt = now
  const dueAt = now + interval * 86400_000
  return {
    ...prev,
    ef, interval, reps,
    lastReviewedAt, dueAt,
  }
}

/** Tạo record mới cho câu hỏi chưa từng review */
export function newRecord(qid: string, meta?: { subject?: string; topic?: string }): ReviewRecord {
  const now = Date.now()
  return {
    qid,
    ef: 2.5,
    interval: 0,
    reps: 0,
    lastReviewedAt: 0,
    dueAt: now,
    subject: meta?.subject,
    topic: meta?.topic,
  }
}

/* ── Public API ───────────────────────────────────────── */

/** Lấy record cho qid, tạo mới nếu chưa có */
export function getRecord(qid: string, meta?: { subject?: string; topic?: string }): ReviewRecord {
  const state = load()
  return state[qid] || newRecord(qid, meta)
}

/** Lưu kết quả review — return record mới */
export function recordReview(qid: string, rating: Rating, meta?: { subject?: string; topic?: string }): ReviewRecord {
  const state = load()
  const prev = state[qid] || newRecord(qid, meta)
  const next = applyRating(prev, rating)
  state[qid] = next
  save(state)
  return next
}

/** Lấy danh sách câu đang due (dueAt <= now) — sort theo dueAt ASC (oldest first) */
export function getDueCards(now = Date.now(), opts?: { subject?: string; limit?: number }): ReviewRecord[] {
  const state = load()
  const all = Object.values(state)
  const due = all.filter(r => {
    if (r.dueAt > now) return false
    if (opts?.subject && r.subject !== opts.subject) return false
    return true
  })
  due.sort((a, b) => a.dueAt - b.dueAt)
  return opts?.limit ? due.slice(0, opts.limit) : due
}

/** Stats nhanh — số card learning / due / mature / total */
export function getStats(now = Date.now()): {
  total: number
  due: number
  learning: number      // reps < 3 (chưa stable)
  mature: number        // interval >= 21 ngày (Anki standard)
} {
  const state = load()
  const all = Object.values(state)
  return {
    total: all.length,
    due: all.filter(r => r.dueAt <= now).length,
    learning: all.filter(r => r.reps < 3).length,
    mature: all.filter(r => r.interval >= 21).length,
  }
}

/** Reset hoàn toàn (cho dev / user request "clear") */
export function reset(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

/** Export full state (cho backup/sync khi BE ready) */
export function exportState(): Record<string, ReviewRecord> {
  return load()
}

/** Import state từ backup (overwrite) */
export function importState(state: Record<string, ReviewRecord>): void {
  save(state)
}

/** Convert rating số từ % điểm bài thi
 *  100% → 5, 80-99% → 4, 60-79% → 3, 40-59% → 2, 20-39% → 1, 0-19% → 0
 */
export function percentageToRating(percentage: number): Rating {
  const p = Math.max(0, Math.min(100, percentage))
  if (p === 100) return 5
  if (p >= 80) return 4
  if (p >= 60) return 3
  if (p >= 40) return 2
  if (p >= 20) return 1
  return 0
}
