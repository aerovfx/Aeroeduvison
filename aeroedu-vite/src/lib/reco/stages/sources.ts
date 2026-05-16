/**
 * Sources cho ExamPrep — fetch candidates từ nhiều nguồn.
 *
 * Mỗi source nhận RecoContext, trả Promise<TeacherExam[]>. Mixer fan-out song
 * song. Tất cả sources hiện tại dùng cùng input `teacherExams` (loaded từ
 * react-query), nên thực chất là filter/derive — không gọi API thêm.
 *
 * Khi BE có endpoint riêng (vd /api/reco/similar-exams) → có thể wrap thành
 * async fetch source độc lập.
 */
import type { Source, RecoContext } from '../types'
import type { TeacherExam } from '@/types'

/** Source nội bộ — wrap mảng có sẵn (đã load qua react-query) */
export function fromArray(items: TeacherExam[]): Source<TeacherExam> {
  return {
    name: 'cached',
    fetch: async () => items,
  }
}

/** RecentSource — đề mới nhất (1 tuần) — recency bias */
export function makeRecentSource(items: TeacherExam[], days = 7): Source<TeacherExam> {
  return {
    name: 'recent',
    fetch: async (ctx) => {
      const cutoff = ctx.now - days * 86400_000
      return items.filter(e => new Date(e.createdAt).getTime() >= cutoff)
    },
  }
}

/** WeakTopicSource — đề thuộc topic HS yếu (từ ExamPrepStats.weakTopics) */
export function makeWeakTopicSource(items: TeacherExam[]): Source<TeacherExam> {
  return {
    name: 'weak-topic',
    enable: (ctx) => (ctx.weakTopics?.length ?? 0) > 0,
    fetch: async (ctx) => {
      const wt = (ctx.weakTopics ?? []).map(s => s.toLowerCase())
      return items.filter(e =>
        wt.some(t => e.title?.toLowerCase().includes(t))
      )
    },
  }
}

/** PeerSource — đề mà ≥ 3 HS đã hoàn thành (social proof) */
export function makePeerSource(items: TeacherExam[], minTakers = 3): Source<TeacherExam> {
  return {
    name: 'peer-engagement',
    fetch: async () =>
      items.filter(e => (e.takerCount ?? 0) >= minTakers),
  }
}

/** TopRatedSource — đề có avgScore của takers cao (xác định "đề hay") */
export function makeTopRatedSource(items: TeacherExam[], minAvg = 0.7): Source<TeacherExam> {
  return {
    name: 'top-rated',
    fetch: async () =>
      items.filter(e => {
        const ts = e.takers ?? []
        if (ts.length < 2) return false
        const avg = ts.reduce((a, t) => a + (t.percentage || 0), 0) / ts.length / 100
        return avg >= minAvg
      }),
  }
}

/** Default source bundle — gộp 4 source phổ biến */
export function defaultSources(items: TeacherExam[]): Source<TeacherExam>[] {
  return [
    makeRecentSource(items, 7),
    makeWeakTopicSource(items),
    makePeerSource(items, 3),
    makeTopRatedSource(items, 0.6),
    // Fallback — nếu mọi source khác trả ít, vẫn có toàn bộ items
    fromArray(items),
  ]
}
