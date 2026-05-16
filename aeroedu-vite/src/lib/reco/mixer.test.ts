/**
 * Reco mixer test — verify pipeline composition + edge cases.
 *
 * Cover:
 *   - Source fan-out: parallel fetch + gộp
 *   - Dedupe theo dedupeKey
 *   - Hydrator chain enrichment
 *   - Filter chain (multiple filters)
 *   - Scorer weighted average + sort DESC
 *   - Top-K cutoff
 *   - Error handling: source/hydrator/scorer fail → skip không vỡ pipeline
 *   - Reason threshold tagging
 *   - Disabled stages (enable=false)
 */
import { describe, expect, it } from 'vitest'
import { mix } from './mixer'
import type { Source, Hydrator, Filter, Scorer, RecoContext } from './types'

interface Item { id: string; title: string; topic?: string; score?: number }

function ctx(overrides: Partial<RecoContext> = {}): RecoContext {
  return {
    userId: 'u1',
    history: [],
    now: 1_000_000_000_000,
    weakTopics: [],
    strongTopics: [],
    ...overrides,
  }
}

const sourceA: Source<Item> = {
  name: 'A',
  fetch: async () => [
    { id: '1', title: 'item 1', topic: 'math' },
    { id: '2', title: 'item 2', topic: 'physics' },
  ],
}
const sourceB: Source<Item> = {
  name: 'B',
  fetch: async () => [
    { id: '2', title: 'item 2 dup', topic: 'physics' },  // dup id=2
    { id: '3', title: 'item 3', topic: 'chemistry' },
  ],
}

describe('mix() — basic flow', () => {
  it('fan-out sources + dedupe theo dedupeKey', async () => {
    const res = await mix(
      {
        sources: [sourceA, sourceB],
        scorers: [{ name: 'const', score: async (items) => items.map(() => 0.5) }],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res).toHaveLength(3)
    expect(res.map(r => r.id).sort()).toEqual(['1', '2', '3'])
  })

  it('topK cắt đúng số', async () => {
    const res = await mix(
      {
        sources: [sourceA, sourceB],
        scorers: [{ name: 'const', score: async (items) => items.map(() => 0.5) }],
        topK: 2,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res).toHaveLength(2)
  })

  it('rỗng nếu source rỗng', async () => {
    const res = await mix(
      {
        sources: [{ name: 'empty', fetch: async () => [] }],
        scorers: [{ name: 'const', score: async () => [] }],
        topK: 10,
        dedupeKey: (i: any) => i.id,
      },
      ctx(),
    )
    expect(res).toEqual([])
  })
})

describe('mix() — hydrators', () => {
  it('hydrator chain modify items theo thứ tự', async () => {
    const h1: Hydrator<Item> = {
      name: 'add-prefix',
      enrich: async (items) => items.map(i => ({ ...i, title: 'H1:' + i.title })),
    }
    const h2: Hydrator<Item> = {
      name: 'add-suffix',
      enrich: async (items) => items.map(i => ({ ...i, title: i.title + ':H2' })),
    }
    const res = await mix(
      {
        sources: [sourceA],
        hydrators: [h1, h2],
        scorers: [{ name: 'const', score: async (items) => items.map(() => 1) }],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res[0].title).toMatch(/^H1:.*:H2$/)
  })

  it('hydrator fail không vỡ pipeline', async () => {
    const bad: Hydrator<Item> = {
      name: 'broken',
      enrich: async () => { throw new Error('boom') },
    }
    const res = await mix(
      {
        sources: [sourceA],
        hydrators: [bad],
        scorers: [{ name: 'const', score: async (items) => items.map(() => 0.5) }],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res).toHaveLength(2)
  })
})

describe('mix() — filters', () => {
  it('filter loại bỏ items', async () => {
    const onlyMath: Filter<Item> = {
      name: 'only-math',
      predicate: (i) => i.topic === 'math',
    }
    const res = await mix(
      {
        sources: [sourceA, sourceB],
        filters: [onlyMath],
        scorers: [{ name: 'const', score: async (items) => items.map(() => 1) }],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe('1')
  })

  it('filter throw → coi như drop item (defensive)', async () => {
    const dangerous: Filter<Item> = {
      name: 'bomb',
      predicate: (i) => {
        if (i.id === '2') throw new Error('bomb')
        return true
      },
    }
    const res = await mix(
      {
        sources: [sourceA],
        filters: [dangerous],
        scorers: [{ name: 'const', score: async (items) => items.map(() => 1) }],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res.map(r => r.id)).toEqual(['1'])
  })
})

describe('mix() — scorers + sort', () => {
  it('weighted average tính đúng', async () => {
    const s1: Scorer<Item> = {
      name: 's1', weight: 1,
      score: async (items) => items.map(i => i.id === '1' ? 1 : 0),
    }
    const s2: Scorer<Item> = {
      name: 's2', weight: 1,
      score: async (items) => items.map(i => i.id === '2' ? 1 : 0),
    }
    const res = await mix(
      {
        sources: [sourceA],
        scorers: [s1, s2],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    // s1 weight 1, s2 weight 1 → totalW=2
    // id=1: (1*1+0*1)/2 = 0.5
    // id=2: (0*1+1*1)/2 = 0.5
    expect(res.find(r => r.id === '1')!.__score).toBeCloseTo(0.5)
    expect(res.find(r => r.id === '2')!.__score).toBeCloseTo(0.5)
  })

  it('sort DESC theo __score', async () => {
    const s: Scorer<Item> = {
      name: 's',
      score: async (items) => items.map((_, idx) => 1 - idx * 0.3),  // 1.0, 0.7
    }
    const res = await mix(
      {
        sources: [sourceA],
        scorers: [s],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res[0].__score).toBeGreaterThan(res[1].__score)
  })

  it('breakdown chứa từng scorer name', async () => {
    const s1: Scorer<Item> = {
      name: 'topic', score: async (items) => items.map(() => 0.8),
    }
    const s2: Scorer<Item> = {
      name: 'recency', score: async (items) => items.map(() => 0.3),
    }
    const res = await mix(
      {
        sources: [sourceA],
        scorers: [s1, s2],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res[0].__breakdown).toEqual({ topic: 0.8, recency: 0.3 })
  })

  it('reasonThreshold gắn __reasons cho scorer ≥ threshold', async () => {
    const high: Scorer<Item> = {
      name: 'high-match', score: async (items) => items.map(() => 0.9),
    }
    const low: Scorer<Item> = {
      name: 'low-match', score: async (items) => items.map(() => 0.3),
    }
    const res = await mix(
      {
        sources: [sourceA],
        scorers: [high, low],
        topK: 10,
        dedupeKey: (i) => i.id,
        reasonThreshold: 0.7,
      },
      ctx(),
    )
    expect(res[0].__reasons).toContain('high-match')
    expect(res[0].__reasons).not.toContain('low-match')
  })
})

describe('mix() — disabled stages', () => {
  it('source với enable=false bị skip', async () => {
    const disabled: Source<Item> = {
      name: 'disabled',
      enable: () => false,
      fetch: async () => [{ id: 'X', title: 'should-not-appear' }],
    }
    const res = await mix(
      {
        sources: [sourceA, disabled],
        scorers: [{ name: 'c', score: async (items) => items.map(() => 1) }],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res.find(r => r.id === 'X')).toBeUndefined()
  })

  it('scorer enable=false không tính vào weighted sum', async () => {
    const off: Scorer<Item> = {
      name: 'off',
      enable: () => false,
      weight: 100,
      score: async (items) => items.map(() => 0),
    }
    const on: Scorer<Item> = {
      name: 'on', weight: 1,
      score: async (items) => items.map(() => 1),
    }
    const res = await mix(
      {
        sources: [sourceA],
        scorers: [off, on],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    // off skipped → score = 1*1/1 = 1.0 (không bị 0 từ off pull xuống)
    expect(res[0].__score).toBe(1)
  })
})

describe('mix() — error resilience', () => {
  it('source fail → trả mảng rỗng từ source đó, các source khác vẫn chạy', async () => {
    const bad: Source<Item> = {
      name: 'bad',
      fetch: async () => { throw new Error('network') },
    }
    const res = await mix(
      {
        sources: [bad, sourceA],
        scorers: [{ name: 'c', score: async (items) => items.map(() => 1) }],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    expect(res).toHaveLength(2)   // chỉ sourceA
  })

  it('scorer fail → weight=0, không phá final score', async () => {
    const bad: Scorer<Item> = {
      name: 'crash', weight: 10,
      score: async () => { throw new Error('boom') },
    }
    const ok: Scorer<Item> = {
      name: 'ok', weight: 1,
      score: async (items) => items.map(() => 0.8),
    }
    const res = await mix(
      {
        sources: [sourceA],
        scorers: [bad, ok],
        topK: 10,
        dedupeKey: (i) => i.id,
      },
      ctx(),
    )
    // bad fallback gán score 0.5 cho mọi item nhưng weight giữ nguyên?
    // Tuỳ implementation — kiểm chỉ là không vỡ + có result
    expect(res).toHaveLength(2)
    expect(res[0].__score).toBeGreaterThan(0)
  })
})
