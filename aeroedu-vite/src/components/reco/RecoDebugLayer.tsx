/**
 * RecoDebugLayer — global floating panel hiển thị ranked candidates +
 * breakdown của 1 mixer hiện tại. Dùng cho tune weight đồng thời nhiều item.
 *
 * Toggle:
 *   - URL ?recoDebug=1 hoặc localStorage.aero_reco_debug=1 → mặc định ẩn,
 *     bấm icon Sigma góc dưới-phải để mở
 *   - Nhấn ESC để đóng
 *
 * Usage trong page:
 *   <RecoDebugLayer
 *     title="ExamPrep"
 *     items={rankedExams}
 *     getTitle={(ex) => ex.title}
 *     getId={(ex) => ex.id}
 *   />
 *
 * KHÔNG render trong production unless flag enabled.
 */
import { useEffect, useState } from 'react'
import { Sigma, X, Search } from 'lucide-react'
import { isRecoDebugEnabled } from './RecoDebugBadge'

export interface RecoDebugLayerProps<T> {
  /** Tên mixer hiển thị header (vd "ExamPrep", "News") */
  title: string
  /** Items đã được rank (mỗi item có __score, __breakdown, __reasons) */
  items: Array<T & { __score?: number; __breakdown?: Record<string, number>; __reasons?: string[] }>
  /** Map item → display title */
  getTitle: (item: T) => string
  /** Map item → unique id */
  getId: (item: T) => string
}

export function RecoDebugLayer<T>({
  title, items, getTitle, getId,
}: RecoDebugLayerProps<T>) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!isRecoDebugEnabled()) return null

  const filtered = filter
    ? items.filter(it => getTitle(it).toLowerCase().includes(filter.toLowerCase()))
    : items

  return (
    <>
      {/* FAB toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-400/60 hover:border-cyan-400 backdrop-blur-md flex items-center justify-center transition shadow-lg"
        title={`Mở Reco Debug Layer — ${items.length} items`}
        style={{ boxShadow: '0 0 20px rgba(34, 211, 238, 0.4)' }}
      >
        <Sigma className="w-5 h-5 text-cyan-300" />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-cyan-400 text-zinc-900 text-[9px] font-bold">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-950/98 border-l-2 border-cyan-500/30 backdrop-blur-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Sigma className="w-4 h-4" /> Reco Debug — {title}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {items.length} candidates · sorted by __score DESC
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search filter */}
          <div className="px-4 py-2 border-b border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Lọc theo title..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filtered.length === 0 && (
              <div className="text-center text-zinc-500 text-xs py-8">
                Không có item nào khớp filter.
              </div>
            )}
            {filtered.map((it, idx) => (
              <DebugRow
                key={getId(it)}
                rank={idx + 1}
                title={getTitle(it)}
                score={it.__score}
                breakdown={it.__breakdown}
                reasons={it.__reasons}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-500">
            Tinh chỉnh weight: <code className="text-cyan-400">src/lib/reco/stages/scorers.ts</code>
            <br />
            Tắt overlay: <code className="text-cyan-400">localStorage.removeItem('aero_reco_debug')</code>
          </div>
        </div>
      )}
    </>
  )
}

function DebugRow({ rank, title, score, breakdown, reasons }: {
  rank: number
  title: string
  score: number | undefined
  breakdown: Record<string, number> | undefined
  reasons: string[] | undefined
}) {
  const [expanded, setExpanded] = useState(false)

  const color =
    !score ? '#64748b' :
    score >= 0.7 ? '#22c55e' :
    score >= 0.4 ? '#f59e0b' : '#ef4444'

  return (
    <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left"
      >
        <span className="text-[10px] font-mono text-zinc-500 w-6 shrink-0">#{rank}</span>
        <span
          className="text-xs font-mono font-bold w-12 shrink-0"
          style={{ color }}
        >
          {score?.toFixed(3) ?? '—'}
        </span>
        <span className="text-xs text-zinc-200 flex-1 truncate" title={title}>
          {title}
        </span>
        {reasons && reasons.length > 0 && (
          <span className="text-[10px] text-amber-400 shrink-0">
            +{reasons.length}
          </span>
        )}
      </button>
      {expanded && breakdown && (
        <div className="px-3 pb-2 pt-1 border-t border-zinc-800 text-[10px] font-mono">
          {Object.entries(breakdown).map(([name, v]) => (
            <div key={name} className="flex items-center justify-between py-0.5">
              <span className="text-zinc-400">{name}</span>
              <span
                className="text-zinc-200"
                style={{ color: v >= 0.7 ? '#22c55e' : v >= 0.4 ? '#f59e0b' : '#94a3b8' }}
              >
                {v.toFixed(3)}
              </span>
            </div>
          ))}
          {reasons && reasons.length > 0 && (
            <div className="pt-1 mt-1 border-t border-zinc-800">
              <span className="text-zinc-500">reasons: </span>
              <span className="text-amber-300">{reasons.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
