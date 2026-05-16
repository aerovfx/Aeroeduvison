/**
 * NewsMixer — rank tin tức cho từng học sinh.
 *
 * Sources:
 *   - Recent (7 ngày qua)
 *   - High-view (views ≥ median)
 *   - Tag-match (tag chứa môn HS đang yếu)
 *   - cached fallback
 *
 * Scorers:
 *   - recency (0.3) — exp decay half-life 14d
 *   - popularity (0.25) — log10 views normalized
 *   - tag-match (0.30) — phần trăm tags match weakTopics + grade
 *   - category-bonus (0.15) — bonus cho category "cap-nhat-san-pham"
 *
 * Filters:
 *   - not-too-old (>180 days)
 *   - has-content
 */
import { mix } from './mixer'
import type { Scored, RecoContext, Source, Filter, Scorer } from './types'
import type { NewsArticle } from '@/pages/news/articles'

/* ── Sources ──────────────────────────────────────────── */

function newsArrSource(items: NewsArticle[]): Source<NewsArticle> {
  return { name: 'cached', fetch: async () => items }
}

function newsRecentSource(items: NewsArticle[], days = 7): Source<NewsArticle> {
  return {
    name: 'news-recent',
    fetch: async (ctx) => {
      const cutoff = ctx.now - days * 86400_000
      return items.filter(n => new Date(n.publishedAt).getTime() >= cutoff)
    },
  }
}

function newsHighViewSource(items: NewsArticle[]): Source<NewsArticle> {
  return {
    name: 'news-popular',
    fetch: async () => {
      if (items.length === 0) return []
      const sorted = [...items].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      const median = sorted[Math.floor(sorted.length / 2)]?.views ?? 0
      return items.filter(n => (n.views ?? 0) >= median)
    },
  }
}

function newsTagMatchSource(items: NewsArticle[]): Source<NewsArticle> {
  return {
    name: 'news-tag-match',
    enable: (ctx) => (ctx.weakTopics?.length ?? 0) > 0,
    fetch: async (ctx) => {
      const wt = (ctx.weakTopics ?? []).map(s => s.toLowerCase())
      return items.filter(n =>
        (n.tags || []).some(tag => wt.some(w => tag.toLowerCase().includes(w))),
      )
    },
  }
}

/* ── Filters ──────────────────────────────────────────── */

const newsNotTooOld: Filter<NewsArticle> = {
  name: 'not-too-old',
  predicate: (n, ctx) => {
    const age = ctx.now - new Date(n.publishedAt).getTime()
    return age < 180 * 86400_000
  },
}

const newsHasContent: Filter<NewsArticle> = {
  name: 'has-content',
  predicate: (n) => Boolean(n.title && n.sapo),
}

/* ── Scorers ──────────────────────────────────────────── */

const newsRecencyScorer: Scorer<NewsArticle> = {
  name: 'recency',
  weight: 0.30,
  score: async (items, ctx) =>
    items.map(n => {
      const ageDays = (ctx.now - new Date(n.publishedAt).getTime()) / 86400_000
      return Math.exp(-ageDays / 14)   // half-life ~10 days
    }),
}

const newsPopularityScorer: Scorer<NewsArticle> = {
  name: 'popularity',
  weight: 0.25,
  score: async (items) => {
    if (items.length === 0) return []
    const maxLog = Math.log10(Math.max(...items.map(n => (n.views ?? 0) + 1)))
    return items.map(n => {
      const v = (n.views ?? 0) + 1
      return Math.log10(v) / Math.max(maxLog, 1)
    })
  },
}

const newsTagMatchScorer: Scorer<NewsArticle> = {
  name: 'tag-match',
  weight: 0.30,
  enable: (ctx) => (ctx.weakTopics?.length ?? 0) > 0,
  score: async (items, ctx) => {
    const wt = (ctx.weakTopics ?? []).map(s => s.toLowerCase())
    return items.map(n => {
      const tags = (n.tags || []).map(t => t.toLowerCase())
      let hits = 0
      for (const w of wt) {
        if (tags.some(t => t.includes(w))) hits++
      }
      return Math.min(1, hits / Math.min(3, wt.length))
    })
  },
}

const newsCategoryBonusScorer: Scorer<NewsArticle> = {
  name: 'category-bonus',
  weight: 0.15,
  score: async (items) =>
    items.map(n => {
      // Boost cho 4 category trong taxonomy — tin sản phẩm > hướng dẫn > sự kiện > công nghệ
      switch (n.category) {
        case 'cap-nhat-san-pham':  return 1.0
        case 'huong-dan':          return 0.85
        case 'su-kien':            return 0.65
        case 'cong-nghe-giao-duc': return 0.55
        default:                   return 0.5
      }
    }),
}

/* ── Public API ───────────────────────────────────────── */

export interface RankNewsOptions {
  topK?: number
  reasonThreshold?: number
}

export async function rankNews(
  items: NewsArticle[],
  ctx: RecoContext,
  opts: RankNewsOptions = {},
): Promise<Scored<NewsArticle>[]> {
  return mix(
    {
      sources: [
        newsRecentSource(items, 14),
        newsHighViewSource(items),
        newsTagMatchSource(items),
        newsArrSource(items),  // fallback
      ],
      filters: [newsHasContent, newsNotTooOld],
      scorers: [
        newsRecencyScorer,
        newsPopularityScorer,
        newsTagMatchScorer,
        newsCategoryBonusScorer,
      ],
      topK: opts.topK ?? 10,
      reasonThreshold: opts.reasonThreshold ?? 0.7,
      dedupeKey: (n) => n.slug,
    },
    ctx,
  )
}

/** Vietnamese label cho scorer name news */
export function newsReasonLabel(scorerName: string): string {
  const map: Record<string, string> = {
    'recency':         '🆕 Mới đăng',
    'popularity':      '🔥 Đang hot',
    'tag-match':       '🎯 Hợp môn của bạn',
    'category-bonus':  '⭐ Nội dung chính',
  }
  return map[scorerName] || ''
}
