/**
 * BrainSuggestions — Phoenix-style smart KG recommendations widget.
 *
 * Tham khảo /algorithm: home-mixer + phoenix + candidate-pipeline.
 * Multi-source recommendation: mastery_gap + graph_neighbor + goal_path
 * + trending + discover. Score-ranked with diversity-aware selector.
 *
 * Display:
 *   - 3 focus tabs: 🎯 Học tiếp · 📚 Ôn tập · ✨ Khám phá
 *   - Top 8-12 candidates với reasons + hydration badges
 *   - Click → focus node trong KG
 *   - Pipeline stats (debug expandable)
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Brain, Loader2, RefreshCw, ChevronRight, Target, BookOpen, Sparkles,
} from 'lucide-react'
import {
  knowledgeGraphBrainV2 as kgBrain,
  type KgBrainItem, type KgBrainRecommendation,
  NODE_TYPE_COLORS, NODE_TYPE_LABELS,
} from '@/services/knowledge-graph.service'

interface Props {
  /** Callback khi user click 1 suggested node */
  onNodeClick?: (nodeId: string) => void
}

type Focus = 'next-to-learn' | 'review' | 'discover'

const FOCUS_TABS: { id: Focus; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { id: 'next-to-learn', label: 'Học tiếp', icon: Target, accent: '#22d3ee' },
  { id: 'review',        label: 'Ôn tập',   icon: BookOpen, accent: '#a78bfa' },
  { id: 'discover',      label: 'Khám phá', icon: Sparkles, accent: '#fbbf24' },
]

export default function BrainSuggestions({ onNodeClick }: Props) {
  const [focus, setFocus] = useState<Focus>('next-to-learn')
  const [data, setData] = useState<KgBrainRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const load = useCallback(async (f: Focus = focus) => {
    setLoading(true)
    try {
      const r = await kgBrain.recommend({ focus: f, limit: 12 })
      setData(r)
    } catch (e) {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [focus])

  useEffect(() => { load(focus) }, [focus, load])

  return (
    /* 2026-05-19: theme-aware — bg-card cho light, dark:bg-zinc-900/60 giữ dark mode */
    <div className="bg-card dark:bg-zinc-900/60 rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-amber-500/10">
        <Brain className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-foreground">🧠 Brain v2 — Smart Suggestions</h3>
          <p className="text-[9px] text-muted-foreground leading-tight">
            Phoenix-style pipeline · multi-source ML
          </p>
        </div>
        <button
          onClick={() => load(focus)}
          disabled={loading}
          className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
          title="Tải lại"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Focus tabs */}
      <div className="flex border-b bg-muted/50 dark:bg-zinc-950/50">
        {FOCUS_TABS.map(t => {
          const Icon = t.icon
          const active = focus === t.id
          return (
            <button
              key={t.id}
              onClick={() => setFocus(t.id)}
              className={`flex-1 px-2 py-1.5 text-[10px] font-bold inline-flex items-center justify-center gap-1 transition ${
                active ? 'bg-card dark:bg-zinc-900/80 border-b-2' : 'text-muted-foreground hover:text-foreground'
              }`}
              style={active ? { borderColor: t.accent, color: t.accent } : {}}
            >
              <Icon className="w-3 h-3" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="px-3 py-6 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-600 dark:text-cyan-400" />
          <p className="text-[10px] text-muted-foreground mt-2">Đang chạy ML pipeline…</p>
        </div>
      )}

      {/* Items list */}
      {!loading && data && (
        <>
          {data.items.length === 0 ? (
            <p className="px-3 py-4 text-center text-[10px] text-muted-foreground italic">
              Chưa có gợi ý — tương tác KG thêm để pipeline có data
            </p>
          ) : (
            <div className="divide-y divide-border">
              {data.items.map(item => (
                <SuggestionCard
                  key={item.id}
                  item={item}
                  onClick={() => onNodeClick?.(item.id)}
                />
              ))}
            </div>
          )}

          {/* Pipeline stats (collapsible, debug) */}
          <button
            onClick={() => setShowStats(s => !s)}
            className="w-full px-3 py-1.5 text-[9px] text-muted-foreground hover:text-foreground text-center border-t font-mono"
          >
            {showStats ? '▼ Ẩn pipeline stats' : `▶ Pipeline ${data.pipeline.totalMs}ms · ${data.stats.candidatesCollected} cand → ${data.stats.finalSelected} chọn`}
          </button>
          {showStats && (
            <div className="px-3 py-2 bg-muted dark:bg-zinc-950/80 text-[9px] text-muted-foreground font-mono space-y-0.5">
              <div>📥 Hydrate:&nbsp; {data.pipeline.hydrateMs}ms ({data.stats.masteryNodesLoaded} mastery, {data.stats.recentVisitsLoaded} recent)</div>
              <div>🔍 Source:&nbsp;&nbsp; {data.pipeline.sourceMs}ms ({data.stats.candidatesCollected} candidates)</div>
              <div>🧬 Enrich:&nbsp;&nbsp; {data.pipeline.enrichMs}ms (prereq + popularity)</div>
              <div>🛡 Filter:&nbsp;&nbsp; {data.pipeline.filterMs}ms (→ {data.stats.afterFilter} kept)</div>
              <div>⚖️ Score:&nbsp;&nbsp;&nbsp; {data.pipeline.scoreMs}ms (weighted Σ)</div>
              <div className="text-cyan-600 dark:text-cyan-400 mt-1">⏱ Total: {data.pipeline.totalMs}ms</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ──────────────── Suggestion card ──────────────── */

function SuggestionCard({ item, onClick }: { item: KgBrainItem; onClick: () => void }) {
  const color = NODE_TYPE_COLORS[item.type] || NODE_TYPE_COLORS.Topic
  const label = NODE_TYPE_LABELS[item.type] || item.type
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 hover:bg-accent transition flex items-start gap-2 group"
    >
      <div
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold mt-0.5"
        style={{ background: color.fill, border: `1px solid ${color.stroke}`, color: color.text }}
      >
        {label.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1 flex-1 min-w-0">
            {item.label}
          </p>
          <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 shrink-0">
            {Math.round(item.score)}
          </span>
        </div>
        {item.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.reasons.slice(0, 2).map((r, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded bg-muted dark:bg-zinc-800/70 text-foreground/85 border"
              >
                {r}
              </span>
            ))}
          </div>
        )}
        {/* Hydration mini-stats */}
        {(item.hydration.userMastery > 0 ||
          item.hydration.prereqPct !== undefined ||
          item.hydration.popularity) && (
          <div className="flex gap-2 mt-1 text-[9px] text-muted-foreground">
            {item.hydration.userMastery > 0 && (
              <span>⭐ {item.hydration.userMastery}%</span>
            )}
            {item.hydration.prereqPct !== undefined && (
              <span className={item.hydration.prereqPct >= 70 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                ✓ prereq {item.hydration.prereqPct}%
              </span>
            )}
            {item.hydration.popularity && item.hydration.popularity > 0 && (
              <span className="text-orange-700 dark:text-orange-400">🔥 {item.hydration.popularity}</span>
            )}
          </div>
        )}
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
    </button>
  )
}
