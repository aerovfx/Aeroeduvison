/**
 * Barrel export — main entry point cho mọi consumer của reco framework.
 *
 * Usage:
 *   import { rankExams, buildContext } from '@/lib/reco'
 *   const ctx = buildContext({ userId, weakTopics: stats.weakTopics })
 *   const ranked = await rankExams(teacherExams, ctx)
 */
export type {
  RecoContext, Source, Hydrator, Filter, Scorer, Scored, MixerConfig, CandidateStage,
} from './types'
export { mix, createMixer } from './mixer'
export { buildContext, readLocalHistory, pushHistory } from './context'
export type { HistoryRecord } from './context'

// Use-case mixers
export { rankExams, rankMatrices, reasonLabel } from './examPrepMixer'
