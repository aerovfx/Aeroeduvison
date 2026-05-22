/**
 * Mixer — orchestration của pipeline reco.
 *
 * Pipeline:
 *   1. Source fan-out (Promise.all all sources) → gộp candidates
 *   2. Dedupe theo dedupeKey
 *   3. Hydrator chain (sequential — mỗi hydrator có thể phụ thuộc kết quả trước)
 *   4. Filter chain (parallel predicate evaluation)
 *   5. Scorer fan-out (Promise.all all scorers) → weighted sum
 *   6. Sort theo final score DESC → top K
 *
 * Lỗi:
 *   - Source/hydrator/scorer fail → log warn, skip stage đó, không vỡ pipeline.
 *   - Filter throw → coi như drop item (defensive).
 */
import type {
  RecoContext, MixerConfig, Scored, Source, Hydrator, Scorer,
} from './types'

export async function mix<T>(
  config: MixerConfig<T>,
  ctx: RecoContext,
): Promise<Scored<T>[]> {
  const t0 = performance.now()

  // ── 1. Fetch sources song song ─────────────────────────
  const enabledSources = config.sources.filter(s => !s.enable || s.enable(ctx))
  const sourceResults = await Promise.allSettled(
    enabledSources.map(async (s) => {
      try {
        const items = await s.fetch(ctx)
        return { source: s.name, items }
      } catch (e: any) {
        console.warn(`[reco/mixer] source "${s.name}" failed:`, e?.message)
        return { source: s.name, items: [] as T[] }
      }
    }),
  )
  const allItems: T[] = []
  for (const r of sourceResults) {
    if (r.status === 'fulfilled') allItems.push(...r.value.items)
  }

  // ── 2. Dedupe ───────────────────────────────────────────
  const seen = new Set<string>()
  const deduped: T[] = []
  for (const item of allItems) {
    const k = config.dedupeKey(item)
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(item)
  }

  // ── 3. Hydrators chain (sequential) ────────────────────
  let hydrated = deduped
  for (const h of (config.hydrators ?? [])) {
    if (h.enable && !h.enable(ctx)) continue
    try {
      hydrated = await h.enrich(hydrated, ctx)
    } catch (e: any) {
      console.warn(`[reco/mixer] hydrator "${h.name}" failed:`, e?.message)
    }
  }

  // ── 4. Filters ─────────────────────────────────────────
  let filtered = hydrated
  for (const f of (config.filters ?? [])) {
    if (f.enable && !f.enable(ctx)) continue
    filtered = filtered.filter((item) => {
      try { return f.predicate(item, ctx) } catch { return false }
    })
  }

  // ── 5. Scorers fan-out ─────────────────────────────────
  if (filtered.length === 0) return []
  const enabledScorers = (config.scorers ?? []).filter(s => !s.enable || s.enable(ctx))
  const scoreResults = await Promise.allSettled(
    enabledScorers.map(async (s) => {
      try {
        const scores = await s.score(filtered, ctx)
        return { name: s.name, weight: s.weight ?? 1.0, scores }
      } catch (e: any) {
        console.warn(`[reco/mixer] scorer "${s.name}" failed:`, e?.message)
        return { name: s.name, weight: 0, scores: filtered.map(() => 0.5) }
      }
    }),
  )

  // ── 6. Combine + rank ──────────────────────────────────
  const reasonThreshold = config.reasonThreshold ?? 0.7
  const scored: Scored<T>[] = filtered.map((item, idx) => {
    const breakdown: Record<string, number> = {}
    const reasons: string[] = []
    let weightedSum = 0
    let weightTotal = 0
    for (const r of scoreResults) {
      if (r.status !== 'fulfilled') continue
      const s = r.value.scores[idx] ?? 0
      breakdown[r.value.name] = s
      weightedSum += s * r.value.weight
      weightTotal += r.value.weight
      if (s >= reasonThreshold) reasons.push(r.value.name)
    }
    const final = weightTotal > 0 ? weightedSum / weightTotal : 0
    return {
      ...item,
      __score: final,
      __breakdown: breakdown,
      __reasons: reasons,
    }
  })

  scored.sort((a, b) => b.__score - a.__score)
  const topK = scored.slice(0, config.topK)

  const t1 = performance.now()
  if (typeof console !== 'undefined' && (import.meta as any)?.env?.DEV) {
    console.debug(
      `[reco/mixer] ${enabledSources.length} src · ${deduped.length} unique · ${filtered.length} after filter · ${enabledScorers.length} scorers · top ${topK.length} · ${(t1 - t0).toFixed(1)}ms`,
    )
  }
  return topK
}

/** Helper — build a mixer "instance" (curried fn) cho reuse */
export function createMixer<T>(config: MixerConfig<T>) {
  return (ctx: RecoContext) => mix(config, ctx)
}

/** Re-export source/hydrator/scorer types để consumer chỉ import từ mixer */
export type { Source, Hydrator, Scorer, RecoContext, Scored }
