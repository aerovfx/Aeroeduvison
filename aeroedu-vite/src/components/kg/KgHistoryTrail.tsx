/**
 * KgHistoryTrail — "Đường mòn tri thức" cho Cây Sự Sống.
 *
 * Hiển thị 10 nodes user vừa visit như breadcrumb chips. Click chip
 * để jump back. Lưu localStorage namespaced theo userId.
 *
 * Concept: cây tri thức có rễ-thân-cành-lá — user đi theo đường mòn
 * sẽ thấy con đường mình đã đi qua, dễ quay lại ôn lại.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { History, X, ChevronRight } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { NODE_TYPE_COLORS } from '@/services/knowledge-graph.service'

interface VisitedNode {
  id: string
  label: string
  type: string
  ts: number
}

const MAX_HISTORY = 15

function lsKey(userId: string | undefined): string {
  return `rs.kg.visited.${userId || 'anon'}`
}

function load(userId: string | undefined): VisitedNode[] {
  try {
    const raw = localStorage.getItem(lsKey(userId))
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, MAX_HISTORY) : []
  } catch { return [] }
}

function save(userId: string | undefined, nodes: VisitedNode[]) {
  try {
    localStorage.setItem(lsKey(userId), JSON.stringify(nodes.slice(0, MAX_HISTORY)))
  } catch {}
}

/** Hook public: gọi từ KG page khi user click node. */
export function useKgHistory() {
  const me = useCurrentUser()
  const [history, setHistory] = useState<VisitedNode[]>(() => load(me?.id))

  // Reload khi user change
  useEffect(() => {
    setHistory(load(me?.id))
  }, [me?.id])

  const record = useCallback((node: { id: string; label: string; type: string }) => {
    setHistory(prev => {
      // Dedupe: remove existing same-id, push to front
      const next = [
        { id: node.id, label: node.label, type: node.type, ts: Date.now() },
        ...prev.filter(n => n.id !== node.id),
      ].slice(0, MAX_HISTORY)
      save(me?.id, next)
      return next
    })
  }, [me?.id])

  const clear = useCallback(() => {
    setHistory([])
    save(me?.id, [])
  }, [me?.id])

  const remove = useCallback((nodeId: string) => {
    setHistory(prev => {
      const next = prev.filter(n => n.id !== nodeId)
      save(me?.id, next)
      return next
    })
  }, [me?.id])

  return { history, record, clear, remove }
}

interface TrailProps {
  history: VisitedNode[]
  currentId?: string
  onJump: (nodeId: string) => void
  onClear: () => void
  onRemove?: (nodeId: string) => void
}

export default function KgHistoryTrail({ history, currentId, onJump, onClear, onRemove }: TrailProps) {
  const [collapsed, setCollapsed] = useState(false)
  if (history.length === 0) return null

  return (
    <div className="bg-card/60 dark:bg-zinc-900/60 border border rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-bold text-emerald-300/90 hover:bg-muted/80 dark:bg-zinc-800/50"
      >
        <History className="w-3.5 h-3.5" />
        <span>🌿 Đường mòn tri thức</span>
        <span className="text-muted-foreground font-normal">{history.length} node</span>
        <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${collapsed ? '' : 'rotate-90'}`} />
      </button>

      {!collapsed && (
        <div className="px-2 py-2 space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {history.map((n, i) => {
              const color = NODE_TYPE_COLORS[n.type] || NODE_TYPE_COLORS.Topic
              const isCurrent = currentId === n.id
              const minutesAgo = Math.floor((Date.now() - n.ts) / 60000)
              const timeAgo = minutesAgo < 1 ? 'vừa xong'
                : minutesAgo < 60 ? `${minutesAgo}p`
                : `${Math.floor(minutesAgo / 60)}h`
              return (
                <div
                  key={`${n.id}-${i}`}
                  className={`group inline-flex items-center text-[10px] rounded-md border transition ${
                    isCurrent
                      ? 'bg-emerald-500/20 border-emerald-400'
                      : 'bg-muted dark:bg-zinc-800/60 border hover:border-zinc-500'
                  }`}
                  style={{ borderLeftColor: color.stroke, borderLeftWidth: 2 }}
                >
                  <button
                    onClick={() => onJump(n.id)}
                    className="px-1.5 py-0.5 text-foreground/90 font-medium max-w-[140px] truncate"
                    title={`${n.label} (${timeAgo})`}
                  >
                    {n.label}
                  </button>
                  <span className="text-muted-foreground text-[9px] px-1">{timeAgo}</span>
                  {onRemove && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(n.id) }}
                      className="opacity-0 group-hover:opacity-100 px-1 text-muted-foreground hover:text-rose-400"
                      title="Xoá khỏi đường mòn"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {history.length >= 3 && (
            <button
              onClick={onClear}
              className="text-[10px] text-muted-foreground hover:text-rose-400 underline"
            >
              Xoá tất cả lịch sử
            </button>
          )}
        </div>
      )}
    </div>
  )
}
