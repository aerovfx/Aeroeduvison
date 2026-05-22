/**
 * Scorers cho ExamPrep — assign score 0..1 cho mỗi candidate.
 *
 * Mỗi scorer độc lập, mixer tổng hợp weighted average.
 * Khi có ML model (Phase 3), thay HeuristicScorer bằng LightGBMScorer mà
 * không cần đổi pipeline.
 */
import type { Scorer } from '../types'
import type { TeacherExam } from '@/types'

/* ── Utilities ─────────────────────────────────────── */
function sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)) }

function topicMatchScore(title: string, topics: string[]): number {
  if (!topics?.length) return 0
  const t = title.toLowerCase()
  let hits = 0
  for (const topic of topics) {
    if (t.includes(topic.toLowerCase())) hits++
  }
  return Math.min(1, hits / Math.min(3, topics.length))
}

/* ── Weak topic match — đề có topic HS đang yếu */
export const weakTopicScorer: Scorer<TeacherExam> = {
  name: 'weak-topic',
  weight: 0.40,
  enable: (ctx) => (ctx.weakTopics?.length ?? 0) > 0,
  score: async (items, ctx) =>
    items.map(e => topicMatchScore(e.title || '', ctx.weakTopics || [])),
}

/* ── Peer engagement — nhiều bạn cùng lớp làm + điểm cao */
export const peerEngagementScorer: Scorer<TeacherExam> = {
  name: 'peer-engagement',
  weight: 0.30,
  score: async (items) =>
    items.map(e => {
      const n = e.takerCount ?? 0
      const takers = e.takers ?? []
      if (n === 0) return 0.1   // 0 takers → score thấp nhưng không zero
      const avgPct = takers.length > 0
        ? takers.reduce((a, t) => a + (t.percentage || 0), 0) / takers.length / 100
        : 0.5
      // sigmoid của log10(takers) + bonus theo avg score
      return sigmoid(Math.log10(n + 1) * 1.5 - 1) * (0.5 + 0.5 * avgPct)
    }),
}

/* ── Recency — đề mới ưu tiên (decay 1/14d) */
export const recencyScorer: Scorer<TeacherExam> = {
  name: 'recency',
  weight: 0.20,
  score: async (items, ctx) =>
    items.map(e => {
      const ageDays = (ctx.now - new Date(e.createdAt).getTime()) / 86400_000
      return Math.exp(-ageDays / 14)   // half-life ~10 days
    }),
}

/* ── Difficulty match — gap |userAvg − examDifficulty| ngắn ⇒ score cao
 *    Heuristic: estimate examDifficulty từ takers avg percentage
 *    userAvg: tính từ ctx.history avg percentage
 */
export const difficultyMatchScorer: Scorer<TeacherExam> = {
  name: 'difficulty-match',
  weight: 0.10,
  enable: (ctx) => ctx.history.length >= 3,
  score: async (items, ctx) => {
    const userAvg = ctx.history.reduce((a, h) => a + h.percentage, 0) / ctx.history.length / 100
    return items.map(e => {
      const takers = e.takers ?? []
      if (takers.length < 2) return 0.5
      const examAvg = takers.reduce((a, t) => a + t.percentage, 0) / takers.length / 100
      const gap = Math.abs(userAvg - examAvg)
      // gap 0 → 1.0; gap 0.5 → 0.0
      return Math.max(0, 1 - gap * 2)
    })
  },
}

/* ── Author diversity — penalize đề cùng GV với đề trước trong list
 *    NB: chỉ work khi mixer sort xong, ta replay penalty sequential.
 *    Implementation: scorer này chạy SAU những scorer khác, dùng state đã sort
 *    Thực tế: cho phép trick — chấp nhận tiny correctness loss để đơn giản.
 *    Đề từ GV nào lặp lại 2+ lần → score *= 0.7
 */
export const authorDiversityScorer: Scorer<TeacherExam> = {
  name: 'author-diversity',
  weight: 0.10,
  score: async (items) => {
    const authorCount = new Map<string, number>()
    return items.map(e => {
      const author = e.user?.name || 'unknown'
      const n = (authorCount.get(author) ?? 0) + 1
      authorCount.set(author, n)
      // 1st = 1.0, 2nd = 0.85, 3rd = 0.7, 4th+ = 0.55
      return Math.max(0.4, 1.0 - (n - 1) * 0.15)
    })
  },
}

export function defaultScorers(): Scorer<TeacherExam>[] {
  return [
    weakTopicScorer,
    peerEngagementScorer,
    recencyScorer,
    difficultyMatchScorer,
    authorDiversityScorer,
  ]
}
