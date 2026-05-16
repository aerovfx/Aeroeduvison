/**
 * ExamPrepMixer — high-level API rank đề thi cho học sinh.
 *
 * Compose 4 source + 3 filter + 5 scorer:
 *   sources  : recent, weak-topic, peer, top-rated, cached (fallback)
 *   filters  : has-questions, already-mastered (≥80%), not-too-old (>90d)
 *   scorers  : weak-topic (0.4), peer-engagement (0.3), recency (0.2),
 *              difficulty-match (0.1), author-diversity (0.1)
 *
 * Trả TeacherExam[] đã sort theo score DESC, kèm __score + __reasons.
 */
import type { TeacherExam } from '@/types'
import { mix } from './mixer'
import type { RecoContext, Scored } from './types'
import { defaultSources } from './stages/sources'
import { defaultFilters } from './stages/filters'
import { defaultScorers } from './stages/scorers'

export interface RankExamsOptions {
  /** Số đề trả về (default 30) */
  topK?: number
  /** Min score để gắn lý do (default 0.7) */
  reasonThreshold?: number
}

export async function rankExams(
  items: TeacherExam[],
  ctx: RecoContext,
  opts: RankExamsOptions = {},
): Promise<Scored<TeacherExam>[]> {
  return mix(
    {
      sources: defaultSources(items),
      filters: defaultFilters(),
      scorers: defaultScorers(),
      topK: opts.topK ?? 30,
      reasonThreshold: opts.reasonThreshold ?? 0.7,
      dedupeKey: (e) => e.id,
    },
    ctx,
  )
}

/** Helper — Vietnamese label cho scorer name (để hiện reason chip trên card) */
export function reasonLabel(scorerName: string): string {
  const map: Record<string, string> = {
    'weak-topic':        '🎯 Phù hợp điểm yếu',
    'peer-engagement':   '👥 Bạn cùng lớp đã làm',
    'recency':           '🆕 Mới ra',
    'difficulty-match':  '⚖ Vừa sức',
    'author-diversity':  '',  // không show
  }
  return map[scorerName] || ''
}
