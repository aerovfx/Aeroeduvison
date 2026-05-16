/**
 * RecoContext factory — build context từ user + localStorage state.
 *
 * Trong tương lai: thêm cache layer + invalidation. Hiện tại đọc localStorage
 * trực tiếp mỗi request (cheap, <1ms).
 */
import type { RecoContext } from './types'

const HISTORY_KEY = 'aero_exam_history_v1'
const MAX_HISTORY = 200

export interface HistoryRecord {
  examId: string
  subject?: string
  topic?: string
  percentage: number
  completedAt: string
}

/** Đọc lịch sử làm bài từ localStorage */
export function readLocalHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : []
  } catch { return [] }
}

/** Ghi 1 record mới vào history (giữ MAX_HISTORY gần nhất) */
export function pushHistory(rec: HistoryRecord): void {
  try {
    const list = readLocalHistory()
    list.unshift(rec)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)))
  } catch {}
}

/** Build RecoContext từ user + stats */
export function buildContext(opts: {
  userId: string | null
  userName?: string
  grade?: string
  weakTopics?: string[]
  strongTopics?: string[]
  experiments?: Record<string, boolean>
}): RecoContext {
  return {
    userId: opts.userId,
    userName: opts.userName,
    grade: opts.grade,
    weakTopics: opts.weakTopics ?? [],
    strongTopics: opts.strongTopics ?? [],
    history: readLocalHistory(),
    experiments: opts.experiments ?? {},
    now: Date.now(),
  }
}
