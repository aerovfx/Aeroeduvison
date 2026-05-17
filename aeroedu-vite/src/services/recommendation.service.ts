/**
 * Recommendation Service — "For You" feed cho HS/GV
 *
 * Lấy cảm hứng từ X/Twitter For You algorithm (Home Mixer + Phoenix):
 *   - track(): log mọi action user (view/click/complete/skip/...)
 *   - getFeed(): rank + return mixed recommendations từ multi-source
 *   - getHistory(): xem lại engagement của user (debug/transparency)
 *
 * Backend: POST /api/reco/track, GET /api/reco/feed, GET /api/reco/history
 */
import { api } from './api'

export type RsAction =
  | 'view' | 'click' | 'dwell_30s' | 'complete' | 'like' | 'save' | 'share'
  | 'pass_quiz' | 'fail_quiz' | 'skip' | 'not_interested' | 'block' | 'report'

export type RsTargetType =
  | 'kg_node' | 'learning_path' | 'exam' | 'lesson' | 'course'
  | 'video' | 'article' | 'teacher' | 'student_paths' | string

export interface RsHydration {
  /** 0-100 mastery hiện tại của user với node này (nếu là KG node) */
  currentMastery?: number
  /** 0-100 % prerequisites đã thông thạo ≥70% */
  prereqStatus?: number
  /** Tổng số prerequisites */
  prereqCount?: number
  /** Số prerequisites đã thông thạo */
  prereqMastered?: number
  /** Unique users đã tương tác trong 30 ngày */
  popularity?: number
  /** Phút estimate */
  estimatedMinutes?: number
}

/** RS-Phase 5: per-action probabilities (%) từ multi-action ranker */
export interface RsPredictions {
  /** 0-100 probability HS sẽ hoàn thành */
  complete: number
  /** 0-100 probability HS đạt được (pass quiz) */
  pass_quiz: number
  /** 0-100 probability HS thích */
  like: number
  /** 0-100 probability HS đọc kỹ (dwell ≥30s) */
  dwell_30s: number
  /** 0-100 probability HS skip (negative — càng cao càng tệ) */
  skip: number
  /** 0-100 probability HS đánh dấu "không quan tâm" (negative) */
  not_interested: number
  /** Tổng weighted ML signal (Σ weight × P), có thể âm hoặc dương */
  mlSignal: number
}

export interface RsFeedItem {
  type: string
  id: string
  title: string
  subtitle?: string
  description?: string | null
  score: number
  source: string
  link: string
  meta?: Record<string, any>
  cta?: string
  /** RS-Phase 3: hydration signals (transparency) */
  hydration?: RsHydration | null
  /** Human-readable reasons array, vd. ["🎯 Bạn còn yếu", "🔥 5 HS đã tương tác"] */
  reasons?: string[]
  /** RS-Phase 5: multi-action predictions */
  predictions?: RsPredictions | null
}

export interface RsFeedResponse {
  audience: 'student' | 'teacher'
  count: number
  items: RsFeedItem[]
  sources: string[]
}

export interface RsHistoryEntry {
  id: string
  action: RsAction | string
  targetType: string
  targetId: string
  weight: number
  metadata?: Record<string, any>
  createdAt: string
}

export const recommendationService = {
  /** Log 1 action — gọi từ mọi nơi (silent, không fail UI nếu lỗi). */
  track: (input: {
    action: RsAction
    targetType: RsTargetType
    targetId: string
    metadata?: Record<string, any>
    weight?: number
  }) =>
    api.post<{ success: boolean; id: string }>('/reco/track', input)
      .then(r => r.data)
      .catch(() => ({ success: false, id: '' })),

  /** Get For-You feed, default student. */
  getFeed: (audience: 'student' | 'teacher' = 'student', limit: number = 20) =>
    api.get<{ success: boolean } & RsFeedResponse>('/reco/feed', {
      params: { audience, limit },
    }).then(r => ({
      audience: r.data.audience,
      count: r.data.count,
      items: r.data.items || [],
      sources: r.data.sources || [],
    })),

  /** Get user's engagement history (debug/transparency). */
  getHistory: (limit: number = 50) =>
    api.get<{ success: boolean; items: RsHistoryEntry[] }>('/reco/history', {
      params: { limit },
    }).then(r => r.data.items || []),
}

/** UI helper: mapping cho từng item type → icon + accent color */
export function getRsTypeMeta(type: string): { emoji: string; accent: string; label: string } {
  const map: Record<string, { emoji: string; accent: string; label: string }> = {
    'kg_weak_topic':         { emoji: '🎯', accent: '#f43f5e', label: 'Điểm yếu' },
    'teacher_learning_path': { emoji: '👩‍🏫', accent: '#22d3ee', label: 'GV mới tạo' },
    'popular_exam':          { emoji: '🔥', accent: '#fb923c', label: 'Nổi bật' },
    'curious_topic':         { emoji: '✨', accent: '#a855f7', label: 'Khám phá' },
    'embedding_match':       { emoji: '🧠', accent: '#3b82f6', label: 'AI khớp sở thích' },
    'student_needs_help':    { emoji: '🆘', accent: '#f43f5e', label: 'HS cần hỗ trợ' },
    'student_self_path':     { emoji: '🛣',  accent: '#fbbf24', label: 'HS tự khảo sát' },
  }
  return map[type] || { emoji: '📌', accent: '#94a3b8', label: 'Khác' }
}

export default recommendationService
