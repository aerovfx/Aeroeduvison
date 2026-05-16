/**
 * Filters cho ExamPrep — drop candidates không phù hợp.
 */
import type { Filter } from '../types'
import type { TeacherExam } from '@/types'

/** Bỏ đề HS đã làm với điểm ≥ 80% (gợi ý cái khác để học mới) */
export const alreadyMastered: Filter<TeacherExam> = {
  name: 'already-mastered',
  predicate: (item, ctx) => {
    const done = ctx.history.find(h => h.examId === item.id)
    if (!done) return true
    return done.percentage < 80
  },
}

/** Bỏ đề > 90 ngày tuổi (giữ feed tươi) */
export const notTooOld: Filter<TeacherExam> = {
  name: 'not-too-old',
  predicate: (item, ctx) => {
    const age = ctx.now - new Date(item.createdAt).getTime()
    return age < 90 * 86400_000
  },
}

/** Bỏ đề rỗng (totalQuestions = 0) — defensive */
export const hasQuestions: Filter<TeacherExam> = {
  name: 'has-questions',
  predicate: (item) => (item.totalQuestions ?? 0) > 0,
}

export function defaultFilters(): Filter<TeacherExam>[] {
  return [hasQuestions, alreadyMastered, notTooOld]
}
