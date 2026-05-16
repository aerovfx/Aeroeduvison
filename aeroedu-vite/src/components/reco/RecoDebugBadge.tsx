/**
 * RecoDebugBadge — dev-only overlay hiển thị __score + __breakdown từ mixer.
 *
 * Mục đích: giúp tune weight của scorer trong `lib/reco/stages/scorers.ts`.
 * Khi dev mở /student/exam-prep với ?recoDebug=1, mỗi card đề sẽ có badge
 * nhỏ ở góc hiển thị:
 *   - Score tổng hợp (0..1) — màu green/amber/red theo ngưỡng
 *   - Hover/click → tooltip với từng scorer + weight tương ứng
 *   - Reason chips (đã có trong card)
 *
 * KHÔNG render trong production unless ?recoDebug=1 — kiểm bằng URLSearchParams.
 *
 * Usage:
 *   <RecoDebugBadge score={ex.__score} breakdown={ex.__breakdown} />
 */
import { useState } from 'react'
import { Sigma, X } from 'lucide-react'

export interface RecoDebugBadgeProps {
  /** Final score 0..1 từ mixer */
  score: number | undefined
  /** Per-scorer breakdown { weak-topic: 0.8, peer: 0.4, ... } */
  breakdown: Record<string, number> | undefined
  /** Per-scorer weight {weak-topic: 0.4, ...} — hiển thị weighted contribution */
  weights?: Record<string, number>
  className?: string
}

/** Default weights khớp với stages/scorers.ts */
const DEFAULT_WEIGHTS: Record<string, number> = {
  'weak-topic':       0.40,
  'peer-engagement':  0.30,
  'recency':          0.20,
  'difficulty-match': 0.10,
  'author-diversity': 0.10,
}

/** Toggle debug mode khi URL có ?recoDebug=1 (hoặc localStorage flag) */
export function isRecoDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const sp = new URLSearchParams(window.location.search)
  if (sp.get('recoDebug') === '1') return true
  try { return localStorage.getItem('aero_reco_debug') === '1' } catch { return false }
}

export function RecoDebugBadge({
  score, breakdown, weights = DEFAULT_WEIGHTS, className = '',
}: RecoDebugBadgeProps) {
  const [open, setOpen] = useState(false)

  if (!isRecoDebugEnabled()) return null
  if (score === undefined) return null

  const color =
    score >= 0.7 ? '#22c55e' :
    score >= 0.4 ? '#f59e0b' : '#ef4444'

  // Compute weighted contribution per scorer (for visualization)
  const rows = Object.entries(breakdown ?? {}).map(([name, raw]) => {
    const w = weights[name] ?? 1.0
    return { name, raw, weight: w, contribution: raw * w }
  }).sort((a, b) => b.contribution - a.contribution)

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border"
        style={{ color, borderColor: `${color}66`, background: `${color}1a` }}
        title={`Reco score: ${score.toFixed(3)} — click để xem breakdown`}
      >
        <Sigma className="w-2.5 h-2.5" />
        {score.toFixed(2)}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-50 w-72 p-3 rounded-lg bg-black/95 border border-zinc-700 shadow-2xl text-xs"
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800">
            <span className="font-mono font-bold text-cyan-300">
              Reco breakdown — Σ = {score.toFixed(4)}
            </span>
            <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-200">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            {rows.length === 0 ? (
              <div className="text-zinc-500 italic">Không có breakdown</div>
            ) : rows.map(r => (
              <div key={r.name} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center font-mono">
                <span className="text-zinc-300 truncate" title={r.name}>{r.name}</span>
                <span className="text-zinc-500">
                  {r.raw.toFixed(3)} × {r.weight.toFixed(2)}
                </span>
                <span
                  className="text-right font-bold"
                  style={{ color: r.contribution >= 0.2 ? '#22c55e' : r.contribution >= 0.05 ? '#f59e0b' : '#94a3b8' }}
                >
                  = {r.contribution.toFixed(3)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 leading-relaxed">
            Tinh chỉnh weight ở <code className="text-cyan-400">lib/reco/stages/scorers.ts</code>.
            Tắt overlay bằng <code className="text-cyan-400">localStorage.removeItem('aero_reco_debug')</code>.
          </div>
        </div>
      )}
    </div>
  )
}
