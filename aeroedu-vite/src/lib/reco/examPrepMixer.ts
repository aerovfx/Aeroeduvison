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
import type { TeacherExam, ExamMatrixItem } from '@/types'
import { mix } from './mixer'
import type { RecoContext, Scored, Source, Filter } from './types'
import { defaultSources } from './stages/sources'
import { defaultFilters } from './stages/filters'
import { defaultScorers } from './stages/scorers'
import {
  weakTopicScorer, recencyScorer, authorDiversityScorer,
} from './stages/scorers'

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

/* ─────────────────────────────────────────────────────────
 * ExamMatrix support — ma trận đề KHÔNG có taker data (chưa
 * có HS làm trực tiếp, chỉ là blueprint câu hỏi). Dùng subset
 * scorer thích hợp: weak-topic, recency, author-diversity.
 */
export interface MatrixRankOptions {
  topK?: number
  reasonThreshold?: number
}

/** Adapt ExamMatrixItem → TeacherExam-shape để dùng chung scorer chain.
 *  Matrix dùng `name` thay vì `title`, không có duration/totalScore real.
 */
function matrixSource(items: ExamMatrixItem[]): Source<ExamMatrixItem> {
  return { name: 'matrices-cached', fetch: async () => items }
}

const matrixHasQuestions: Filter<ExamMatrixItem> = {
  name: 'has-questions',
  predicate: (item) => (item.totalQuestions ?? 0) > 0,
}

/** rankMatrices — variant của rankExams cho ExamMatrixItem.
 *  Cùng pattern, scorer subset (weak-topic 0.5, recency 0.3, diversity 0.2).
 */
export async function rankMatrices(
  items: ExamMatrixItem[],
  ctx: RecoContext,
  opts: MatrixRankOptions = {},
): Promise<Scored<ExamMatrixItem>[]> {
  // Scorer cần "title" — matrix có `name` thay vì `title`. Map adapter:
  const adapted = items.map(m => ({ ...m, title: m.name })) as unknown as Array<ExamMatrixItem & { title: string }>

  // Scorer xài "title" qua chỉ field → cast back sau
  const scored = await mix(
    {
      sources: [matrixSource(adapted as any)],
      filters: [matrixHasQuestions as any],
      scorers: [
        { ...weakTopicScorer, weight: 0.5 } as any,
        { ...recencyScorer, weight: 0.3 } as any,
        { ...authorDiversityScorer, weight: 0.2 } as any,
      ],
      topK: opts.topK ?? 20,
      reasonThreshold: opts.reasonThreshold ?? 0.6,
      dedupeKey: (e: any) => e.id,
    },
    ctx,
  )
  return scored as unknown as Scored<ExamMatrixItem>[]
}
