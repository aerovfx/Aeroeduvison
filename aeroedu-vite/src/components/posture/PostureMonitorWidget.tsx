/**
 * PostureMonitorWidget — floating mini panel cho background monitoring
 *
 * Vị trí: fixed bottom-right corner, có thể minimize → 1 chip nhỏ.
 * Hiển thị: engagement % + emoji emotion + posture status + sparkline.
 * Click → mở /dashboard/posture-monitor cho full report.
 *
 * Render tối thiểu — không animate skeleton overlay để tiết kiệm CPU.
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Camera, X, Maximize2, Minimize2, Loader2, Pause, Play, AlertCircle,
} from 'lucide-react'
import { usePostureMonitor, type UsePostureMonitorReturn } from '@/hooks/usePostureMonitor'
import type { EmotionState, PostureState } from '@/lib/posture/analyzer'

const EMOTION_EMOJI: Record<EmotionState, string> = {
  focused: '🎯', happy: '😊', confused: '🤔', tired: '😪', drowsy: '😴',
  distracted: '👀', unknown: '·',
}

const POSTURE_COLOR: Record<PostureState, string> = {
  good: 'text-emerald-300',
  leaning: 'text-amber-300',
  tilted: 'text-amber-300',
  asymmetric: 'text-amber-300',
  far: 'text-cyan-300',
  close: 'text-cyan-300',
  absent: 'text-rose-300',
  turned: 'text-rose-300',
}

/** Inline sparkline SVG — 60 data points = last ~30s @ 2 Hz */
function Sparkline({ data, color = '#22d3ee' }: { data: number[]; color?: string }) {
  if (data.length < 2) return <div className="h-7" />
  const w = 100, h = 28
  const max = 100, min = 0
  const step = w / (data.length - 1)
  const path = data.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / (max - min)) * h
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="url(#spark-grad)" />
      <path d={path} stroke={color} strokeWidth={1.2} fill="none" />
    </svg>
  )
}

interface Props {
  monitor: UsePostureMonitorReturn
  onClose?: () => void
  defaultMinimized?: boolean
}

export function PostureMonitorWidget({ monitor, onClose, defaultMinimized = false }: Props) {
  const [minimized, setMinimized] = useState(defaultMinimized)

  const sparkData = useMemo(
    () => monitor.history.slice(-60).map(s => s.engagement),
    [monitor.history],
  )

  const engagement = monitor.current?.engagement ?? 0
  const emotion = monitor.current?.expression?.emotion ?? 'unknown'
  const posture = monitor.current?.posture?.posture ?? 'absent'
  const postureMsg = monitor.current?.posture?.postureMessage ?? '...'
  const emotionMsg = monitor.current?.expression?.emotionMessage ?? '...'

  const engColor = engagement >= 70 ? '#22d3ee' : engagement >= 40 ? '#fbbf24' : '#f87171'

  // ─ Minimized chip ─
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full
                   bg-slate-900/95 border border-white/15 shadow-lg hover:border-white/30
                   backdrop-blur transition"
        aria-label="Mở widget theo dõi tư thế"
      >
        <span className="text-lg leading-none">{EMOTION_EMOJI[emotion]}</span>
        <span className="text-xs font-mono font-bold" style={{ color: engColor }}>
          {engagement}%
        </span>
        <Maximize2 className="w-3 h-3 text-white/40" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-2xl bg-slate-900/95
                    border border-white/15 shadow-2xl backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-white/[0.08] bg-gradient-to-r from-cyan-500/10 to-violet-500/10">
        <div className="flex items-center gap-2">
          {monitor.status === 'loading' ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : monitor.status === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : monitor.status === 'paused' ? (
            <Pause className="w-4 h-4 text-amber-400" />
          ) : (
            <Activity className="w-4 h-4 text-cyan-400" />
          )}
          <span className="text-xs font-bold text-white/90">
            {monitor.status === 'loading' && `Đang tải… (${monitor.loadingStage})`}
            {monitor.status === 'permission' && 'Đang xin quyền camera…'}
            {monitor.status === 'running' && 'Theo dõi tư thế'}
            {monitor.status === 'paused' && 'Đang tạm dừng'}
            {monitor.status === 'error' && 'Lỗi'}
            {monitor.status === 'idle' && 'Sẵn sàng'}
            {monitor.status === 'blocked' && 'Tab khác đang chạy'}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setMinimized(true)}
            className="p-1 hover:bg-white/10 rounded" aria-label="Thu nhỏ">
            <Minimize2 className="w-3 h-3 text-white/55" />
          </button>
          {onClose && (
            <button onClick={onClose}
              className="p-1 hover:bg-white/10 rounded" aria-label="Đóng">
              <X className="w-3 h-3 text-white/55" />
            </button>
          )}
        </div>
      </div>

      {monitor.status === 'error' && monitor.error && (
        <div className="p-3 text-[11px] text-rose-200/90 bg-rose-500/[0.06]">
          {monitor.error}
        </div>
      )}

      {monitor.status === 'idle' && (
        <div className="p-3">
          <button onClick={() => monitor.start()}
            className="w-full px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition">
            <Camera className="w-3.5 h-3.5" /> Bật theo dõi
          </button>
          <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
            Camera chạy LOCAL — không upload server. Phân tích tư thế + biểu cảm bằng MediaPipe.
          </p>
        </div>
      )}

      {(monitor.status === 'running' || monitor.status === 'paused') && monitor.current && (
        <>
          {/* Engagement big number */}
          <div className="p-3 flex items-end justify-between">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/45 font-bold">Engagement</div>
              <div className="text-2xl font-mono font-bold leading-none mt-0.5"
                   style={{ color: engColor }}>
                {engagement}<span className="text-sm text-white/40">%</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl leading-none">{EMOTION_EMOJI[emotion]}</div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="px-3 pb-1">
            <Sparkline data={sparkData} color={engColor} />
            <div className="text-[9px] text-white/40 mt-0.5">30s gần nhất</div>
          </div>

          {/* Status lines */}
          <div className="px-3 pb-2 space-y-1 text-[10.5px]">
            <div className={`${POSTURE_COLOR[posture]} leading-tight`}>{postureMsg}</div>
            <div className="text-white/65 leading-tight">{emotionMsg}</div>
          </div>

          {/* Metrics row */}
          <div className="px-3 pb-2 grid grid-cols-3 gap-1 text-center">
            <div className="bg-white/[0.04] rounded p-1">
              <div className="text-[8px] text-white/40 uppercase">FPS</div>
              <div className="text-[10px] font-mono text-cyan-300">{monitor.fps.toFixed(1)}</div>
            </div>
            <div className="bg-white/[0.04] rounded p-1">
              <div className="text-[8px] text-white/40 uppercase">Lat</div>
              <div className="text-[10px] font-mono text-cyan-300">{monitor.latencyMs}ms</div>
            </div>
            <div className="bg-white/[0.04] rounded p-1">
              <div className="text-[8px] text-white/40 uppercase">{monitor.delegate ?? '-'}</div>
              <div className="text-[10px] font-mono text-cyan-300">{monitor.history.length}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 flex gap-1 border-t border-white/[0.08]">
            {monitor.status === 'running' ? (
              <button onClick={monitor.pause}
                className="flex-1 px-2 py-1.5 rounded bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1">
                <Pause className="w-3 h-3" /> Tạm dừng
              </button>
            ) : (
              <button onClick={monitor.resume}
                className="flex-1 px-2 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1">
                <Play className="w-3 h-3" /> Tiếp tục
              </button>
            )}
            <button onClick={monitor.stop}
              className="px-2 py-1.5 rounded bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-200 text-[10px] font-bold">
              Tắt
            </button>
            <Link to="/dashboard/posture-monitor"
              className="px-2 py-1.5 rounded bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-200 text-[10px] font-bold flex items-center">
              Xem báo cáo →
            </Link>
          </div>
        </>
      )}

      {/* Hidden video element — MediaPipe reads from this */}
      <video ref={monitor.videoRef} playsInline muted className="hidden" />
    </div>
  )
}
