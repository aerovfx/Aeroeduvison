/**
 * SM-2 algorithm edge cases — verify behaviour khớp spec Anki.
 *
 * Cover:
 *   - applyRating với 6 rating (0-5) → interval/EF/reps chính xác
 *   - Sequence học chuẩn (5,5,5,5) → interval grow exponential ×EF
 *   - Forget mid-sequence (5,5,1) → reset rep+interval=1, EF giảm
 *   - EF clamp tại MIN_EF=1.3 và MAX_EF=3.0
 *   - percentageToRating mapping đúng bucket
 *   - getDueCards filter theo subject + sort theo dueAt
 *   - recordReview persist localStorage
 *
 * Polyfill localStorage trong test env vì happy-dom default không expose
 * localStorage như global. In-memory Map đủ cho mọi case test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Polyfill localStorage trước khi import lib (vì lib có thể init đọc storage)
const storageStub = (() => {
  let store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  }
})()
vi.stubGlobal('localStorage', storageStub)

const {
  applyRating, newRecord, getRecord, recordReview, getDueCards,
  getStats, reset, percentageToRating,
  exportState, importState,
} = await import('./srs')
type ReviewRecord = Awaited<ReturnType<typeof getRecord>>

beforeEach(() => {
  localStorage.clear()
})

describe('applyRating', () => {
  it('first review rating 5 (easy) → interval=1, reps=1, EF tăng', () => {
    const prev = newRecord('q1')
    const next = applyRating(prev, 5)
    expect(next.reps).toBe(1)
    expect(next.interval).toBe(1)
    expect(next.ef).toBeGreaterThan(prev.ef)   // bonus easy
    expect(next.dueAt).toBeGreaterThan(prev.dueAt)
  })

  it('first review rating 3 (good) → interval=1, EF gần như giữ', () => {
    const prev = newRecord('q1')
    const next = applyRating(prev, 3)
    expect(next.reps).toBe(1)
    expect(next.interval).toBe(1)
    // r=3: ef += 0.1 - 2*(0.08 + 2*0.02) = 0.1 - 0.24 = -0.14
    expect(next.ef).toBeCloseTo(2.5 - 0.14, 2)
  })

  it('rating 0-2 (forget) reset reps=0, interval=1, EF giảm mạnh', () => {
    let rec = newRecord('q1')
    rec = applyRating(rec, 5)
    rec = applyRating(rec, 5)   // reps=2, interval=6
    expect(rec.reps).toBe(2)
    const efBefore = rec.ef

    const next = applyRating(rec, 1)
    expect(next.reps).toBe(0)
    expect(next.interval).toBe(1)
    expect(next.ef).toBeLessThan(efBefore)
  })

  it('sequence (5,5,5,5) → interval grow đúng SM-2: 1, 6, 6×EF, ...', () => {
    // Lưu ý: SM-2 tính interval mới = ceil(prev_interval × prev_ef), rồi mới
    // update ef. Test phải capture ef TRƯỚC khi rating đó.
    let rec = newRecord('q1')
    rec = applyRating(rec, 5)
    expect(rec.interval).toBe(1)

    const efBefore2 = rec.ef
    rec = applyRating(rec, 5)
    expect(rec.interval).toBe(6)

    const efBefore3 = rec.ef
    rec = applyRating(rec, 5)
    expect(rec.interval).toBe(Math.ceil(6 * efBefore3))

    const prevInt = rec.interval
    const efBefore4 = rec.ef
    rec = applyRating(rec, 5)
    expect(rec.interval).toBe(Math.ceil(prevInt * efBefore4))
    // efBefore2 unused — chỉ giữ làm reference cho debug
    void efBefore2
  })

  it('EF không bao giờ < 1.3 (MIN_EF clamp)', () => {
    let rec = newRecord('q1')
    for (let i = 0; i < 20; i++) rec = applyRating(rec, 0)
    expect(rec.ef).toBeGreaterThanOrEqual(1.3)
    expect(rec.ef).toBe(1.3)
  })

  it('EF không bao giờ > 3.0 (MAX_EF clamp)', () => {
    let rec = newRecord('q1')
    for (let i = 0; i < 30; i++) rec = applyRating(rec, 5)
    expect(rec.ef).toBeLessThanOrEqual(3.0)
  })

  it('dueAt = now + interval × 86400000ms', () => {
    const now = 1_000_000_000_000
    const prev: ReviewRecord = { ...newRecord('q1'), dueAt: now }
    const next = applyRating(prev, 5, now)
    expect(next.dueAt).toBe(now + 86_400_000)
  })
})

describe('percentageToRating', () => {
  it('100% → 5 (perfect)', () => expect(percentageToRating(100)).toBe(5))
  it('80% → 4',  () => expect(percentageToRating(80)).toBe(4))
  it('60% → 3',  () => expect(percentageToRating(60)).toBe(3))
  it('40% → 2',  () => expect(percentageToRating(40)).toBe(2))
  it('20% → 1',  () => expect(percentageToRating(20)).toBe(1))
  it('0% → 0',   () => expect(percentageToRating(0)).toBe(0))
  it('99% → 4 (boundary)',  () => expect(percentageToRating(99)).toBe(4))
  it('clamp [0,100]',       () => {
    expect(percentageToRating(-50)).toBe(0)
    expect(percentageToRating(200)).toBe(5)
  })
})

describe('getDueCards', () => {
  it('lọc theo subject', () => {
    recordReview('q1', 0, { subject: 'Toán' })
    recordReview('q2', 0, { subject: 'Lý' })
    // Card sau recordReview có dueAt = now + 1 day → kiểm tra ở tương lai
    const future = Date.now() + 86_400_000 + 1000
    expect(getDueCards(future, { subject: 'Toán' })).toHaveLength(1)
    expect(getDueCards(future, { subject: 'Lý' })).toHaveLength(1)
    expect(getDueCards(future)).toHaveLength(2)
  })

  it('chỉ trả card có dueAt <= now', () => {
    recordReview('q1', 0)
    const now = Date.now()
    expect(getDueCards(now)).toHaveLength(0)
    expect(getDueCards(now + 86_400_000 + 1)).toHaveLength(1)
  })

  it('sort theo dueAt ASC (oldest first)', () => {
    const t = Date.now()
    importState({
      a: { qid: 'a', ef: 2.5, interval: 0, reps: 0, lastReviewedAt: 0, dueAt: t + 1000 },
      b: { qid: 'b', ef: 2.5, interval: 0, reps: 0, lastReviewedAt: 0, dueAt: t - 1000 },
      c: { qid: 'c', ef: 2.5, interval: 0, reps: 0, lastReviewedAt: 0, dueAt: t - 5000 },
    })
    const due = getDueCards(t + 2000)
    expect(due.map(r => r.qid)).toEqual(['c', 'b', 'a'])
  })

  it('limit cắt sau khi sort', () => {
    importState({
      a: { qid: 'a', ef: 2.5, interval: 0, reps: 0, lastReviewedAt: 0, dueAt: 1 },
      b: { qid: 'b', ef: 2.5, interval: 0, reps: 0, lastReviewedAt: 0, dueAt: 2 },
      c: { qid: 'c', ef: 2.5, interval: 0, reps: 0, lastReviewedAt: 0, dueAt: 3 },
    })
    const due = getDueCards(Date.now(), { limit: 2 })
    expect(due.map(r => r.qid)).toEqual(['a', 'b'])
  })
})

describe('getStats', () => {
  it('rỗng khi không có data', () => {
    const s = getStats()
    expect(s).toEqual({ total: 0, due: 0, learning: 0, mature: 0 })
  })

  it('phân loại learning (reps<3) vs mature (interval>=21)', () => {
    importState({
      a: { qid: 'a', ef: 2.5, interval: 1,  reps: 1, lastReviewedAt: 0, dueAt: 0 },
      b: { qid: 'b', ef: 2.5, interval: 5,  reps: 2, lastReviewedAt: 0, dueAt: 0 },
      c: { qid: 'c', ef: 2.5, interval: 30, reps: 5, lastReviewedAt: 0, dueAt: 0 },
    })
    const s = getStats(Date.now())
    expect(s.total).toBe(3)
    expect(s.learning).toBe(2)
    expect(s.mature).toBe(1)
    expect(s.due).toBe(3)
  })
})

describe('persistence (localStorage)', () => {
  it('recordReview persist sang localStorage', () => {
    recordReview('q1', 4, { subject: 'Toán' })
    const raw = localStorage.getItem('aero_srs_v1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.q1).toBeDefined()
    expect(parsed.q1.subject).toBe('Toán')
  })

  it('getRecord trả về newRecord nếu chưa có', () => {
    const r = getRecord('new-q', { subject: 'Lý' })
    expect(r.qid).toBe('new-q')
    expect(r.subject).toBe('Lý')
    expect(r.reps).toBe(0)
    expect(r.ef).toBe(2.5)
  })

  it('reset() xoá hết', () => {
    recordReview('q1', 5)
    expect(getStats().total).toBe(1)
    reset()
    expect(getStats().total).toBe(0)
  })

  it('export/import round-trip', () => {
    recordReview('q1', 4)
    recordReview('q2', 2)
    const snap = exportState()
    reset()
    expect(getStats().total).toBe(0)
    importState(snap)
    expect(getStats().total).toBe(2)
  })
})
