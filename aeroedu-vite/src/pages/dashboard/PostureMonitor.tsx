/**
 * PostureMonitor — full dashboard cho theo dõi tư thế + biểu cảm
 *
 * Route: /dashboard/posture-monitor (HS) · /teacher/posture-monitor (GV)
 *
 * Layout:
 *   - Top: hero stats (engagement avg + posture/emotion breakdown + recommendation)
 *   - Middle: timeline graph 30 phút gần nhất (engagement over time)
 *   - Bottom: posture % + emotion % breakdowns + raw video preview (optional)
 *
 * Privacy:
 *   - LOCAL ONLY — không upload server
 *   - Lịch sử lưu sessionStorage (mất khi đóng tab)
 *   - Camera tắt khi rời trang
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Camera, Activity, Eye, Info, Download, Trash2, ShieldCheck,
  Pause, Play,
} from 'lucide-react'
import { usePostureMonitor } from '@/hooks/usePostureMonitor'
import { aggregate, type PostureState, type EmotionState } from '@/lib/posture/analyzer'

const POSTURE_LABEL: Record<PostureState, string> = {
  good: 'Đúng tư thế', leaning: 'Cúi xuống bàn', tilted: 'Nghiêng đầu',
  asymmetric: 'Lệch vai', far: 'Ngồi xa', close: 'Ngồi quá gần',
  absent: 'Vắng mặt', turned: 'Quay đi',
}
const POSTURE_COLOR: Record<PostureState, string> = {
  good: '#10b981', leaning: '#f59e0b', tilted: '#f59e0b', asymmetric: '#f59e0b',
  far: '#06b6d4', close: '#06b6d4', absent: '#ef4444', turned: '#ef4444',
}
const EMOTION_LABEL: Record<EmotionState, string> = {
  focused: 'Tập trung', happy: 'Vui vẻ', confused: 'Bối rối', tired: 'Mệt mỏi',
  drowsy: 'Buồn ngủ', distracted: 'Mất tập trung', unknown: 'Trung tính',
}
const EMOTION_COLOR: Record<EmotionState, string> = {
  focused: '#06b6d4', happy: '#10b981', confused: '#f59e0b', tired: '#f97316',
  drowsy: '#ef4444', distracted: '#8b5cf6', unknown: '#64748b',
}

export default function PostureMonitor() {
  const [showVideo, setShowVideo] = useState(false)
  const [backgroundMode, setBackgroundMode] = useState(false)
  const monitor = usePostureMonitor({ backgroundMode })

  // Aggregate windows
  const last5min = useMemo(() => aggregate(monitor.history, 5 * 60_000), [monitor.history])
  const last30min = useMemo(() => aggregate(monitor.history, 30 * 60_000), [monitor.history])

  // Timeline graph data — last 30 min, sample every 30s
  const timelineData = useMemo(() => {
    if (monitor.history.length === 0) return []
    const now = Date.now()
    const buckets: { t: number; eng: number; n: number }[] = []
    const BUCKET_MS = 30_000
    for (const s of monitor.history) {
      const bucketIdx = Math.floor((now - s.timestamp) / BUCKET_MS)
      if (bucketIdx > 60) continue  // > 30 min
      const tMs = now - bucketIdx * BUCKET_MS
      let b = buckets.find(b => b.t === tMs)
      if (!b) { b = { t: tMs, eng: 0, n: 0 }; buckets.push(b) }
      b.eng += s.engagement
      b.n += 1
    }
    return buckets
      .map(b => ({ t: b.t, eng: b.eng / b.n }))
      .sort((a, b) => a.t - b.t)
  }, [monitor.history])

  // Export JSON snapshot
  const exportJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      stats: { last5min, last30min },
      history: monitor.history,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `posture-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950 text-white/90">
      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent flex items-center gap-2">
                <Camera className="w-6 h-6 text-cyan-400" />
                Theo dõi tư thế & biểu cảm
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                MediaPipe Pose + Face · Phân tích LOCAL · Không upload server
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {monitor.status === 'idle' && (
              <button onClick={() => monitor.start()}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 font-bold flex items-center gap-2 text-sm shadow-lg shadow-cyan-500/25">
                <Camera className="w-4 h-4" /> Bật theo dõi
              </button>
            )}
            {monitor.status === 'running' && (
              <button onClick={monitor.pause}
                className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-200 font-bold flex items-center gap-1.5 text-sm">
                <Pause className="w-4 h-4" /> Tạm dừng
              </button>
            )}
            {monitor.status === 'paused' && (
              <button onClick={monitor.resume}
                className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-200 font-bold flex items-center gap-1.5 text-sm">
                <Play className="w-4 h-4" /> Tiếp tục
              </button>
            )}
            {(monitor.status === 'running' || monitor.status === 'paused') && (
              <button onClick={monitor.stop}
                className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-200 font-bold text-sm">
                Tắt camera
              </button>
            )}
            {monitor.history.length > 0 && (
              <>
                <button onClick={exportJSON}
                  className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] text-white/70 font-bold flex items-center gap-1.5 text-sm">
                  <Download className="w-4 h-4" /> JSON
                </button>
                <button onClick={monitor.clearHistory}
                  className="px-3 py-2 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 hover:bg-rose-500/15 text-rose-300/80 font-bold flex items-center gap-1.5 text-sm">
                  <Trash2 className="w-4 h-4" /> Xoá lịch sử
                </button>
              </>
            )}
          </div>
        </div>

        {/* Permission state */}
        {monitor.status === 'idle' && (
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/[0.06] to-violet-500/[0.06] border border-cyan-500/25 p-6">
            <ShieldCheck className="w-12 h-12 text-cyan-400 mb-3" />
            <h2 className="text-xl font-bold mb-2">Bật camera để bắt đầu theo dõi</h2>
            <p className="text-sm text-white/65 leading-relaxed mb-4">
              Hệ thống dùng <strong className="text-cyan-300">MediaPipe Tasks Vision</strong> chạy
              hoàn toàn trên trình duyệt của bạn — phân tích pose 33 landmarks + face 52 blendshapes
              để đánh giá tư thế ngồi học và biểu cảm. <strong className="text-emerald-300">Không
              upload server</strong>, không chia sẻ video. Tắt camera bất cứ lúc nào.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <FeatureCard icon="🎯" title="Tư thế" desc="Phát hiện cúi, nghiêng đầu, lệch vai, ngồi xa/gần" />
              <FeatureCard icon="😊" title="Biểu cảm" desc="Tập trung, vui vẻ, bối rối, mệt mỏi, mất tập trung" />
              <FeatureCard icon="⚡" title="Hiệu năng" desc="320×240 @ 2 Hz · GPU WebGL · ~50-100ms/frame" />
            </div>
            <div className="space-y-2 text-[12px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={backgroundMode}
                  onChange={e => setBackgroundMode(e.target.checked)}
                  className="accent-cyan-500" />
                <span className="text-white/75">
                  <strong>Chạy nền</strong> — vẫn theo dõi (0.5 Hz) khi chuyển tab khác.
                  Tốn pin nhẹ. Bỏ tick → auto-pause khi tab ẩn.
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showVideo}
                  onChange={e => setShowVideo(e.target.checked)}
                  className="accent-cyan-500" />
                <span className="text-white/75">Hiển thị video camera (debug — tốn thêm ~5ms/frame để render)</span>
              </label>
            </div>
            <button onClick={() => monitor.start()}
              className="mt-4 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/30">
              <Camera className="w-5 h-5" /> Bắt đầu — cho phép camera
            </button>
          </div>
        )}

        {/* Loading state */}
        {(monitor.status === 'loading' || monitor.status === 'permission') && (
          <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 text-center">
            <Camera className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-pulse" />
            <h2 className="font-bold mb-1">
              {monitor.status === 'loading' ? `Đang tải MediaPipe… (${monitor.loadingStage})` : 'Đang xin quyền camera…'}
            </h2>
            <p className="text-sm text-white/50">Tổng ~6 MB model — sau lần đầu sẽ cache, vào sau khởi động nhanh.</p>
          </div>
        )}

        {monitor.status === 'error' && (
          <div className="rounded-2xl bg-rose-500/[0.06] border border-rose-500/25 p-4">
            <h2 className="font-bold text-rose-300 mb-1">Lỗi</h2>
            <p className="text-sm text-rose-200/80">{monitor.error}</p>
            <button onClick={() => monitor.start()}
              className="mt-3 px-3 py-1.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-bold">
              Thử lại
            </button>
          </div>
        )}

        {/* Running state */}
        {(monitor.status === 'running' || monitor.status === 'paused') && (
          <>
            {/* Hero — current engagement + recommendation */}
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <div className="rounded-2xl bg-gradient-to-br from-cyan-500/15 to-violet-500/15 border border-cyan-500/30 p-4">
                <div className="text-[10px] uppercase tracking-wider text-cyan-200/70 font-bold">Engagement hiện tại</div>
                <div className="text-5xl font-mono font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent leading-none mt-1">
                  {monitor.current?.engagement ?? 0}<span className="text-2xl text-white/40">%</span>
                </div>
                <div className="text-[11px] text-white/55 mt-2">
                  TB 5 phút: <strong className="text-cyan-300">{last5min.avgEngagement}%</strong> · 30 phút: <strong className="text-cyan-300">{last30min.avgEngagement}%</strong>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
                <div className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Tư thế hiện tại
                </div>
                <div className="text-lg font-bold mt-1 leading-tight">
                  {monitor.current?.posture ? POSTURE_LABEL[monitor.current.posture.posture] : '—'}
                </div>
                <div className="text-[11px] text-white/55 mt-1 leading-snug">
                  {monitor.current?.posture?.postureMessage}
                </div>
                <div className="text-[10px] text-white/40 mt-1.5 font-mono">
                  Score: {monitor.current?.posture?.postureScore ?? '—'}/100
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
                <div className="text-[10px] uppercase tracking-wider text-violet-300/80 font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Biểu cảm
                </div>
                <div className="text-lg font-bold mt-1 leading-tight">
                  {monitor.current?.expression ? EMOTION_LABEL[monitor.current.expression.emotion] : '—'}
                </div>
                <div className="text-[11px] text-white/55 mt-1 leading-snug">
                  {monitor.current?.expression?.emotionMessage}
                </div>
                <div className="text-[10px] text-white/40 mt-1.5 font-mono">
                  Chớp mắt: {monitor.current?.expression?.blinkRate ?? '—'}/phút
                </div>
              </div>
            </div>

            {/* Recommendation card */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/[0.08] to-cyan-500/[0.08] border border-emerald-500/25 p-4 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-bold mb-1">
                💡 Gợi ý cải thiện (TB 30 phút)
              </div>
              <p className="text-sm text-white/85 leading-relaxed">{last30min.topRecommendation}</p>
            </div>

            {/* Timeline graph */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-cyan-300">📈 Engagement 30 phút gần nhất</h3>
                <span className="text-[10px] text-white/40 font-mono">
                  {monitor.history.length} mẫu · {monitor.fps.toFixed(1)} FPS · {monitor.latencyMs}ms · {monitor.delegate}
                </span>
              </div>
              <TimelineChart data={timelineData} />
            </div>

            {/* Breakdowns */}
            <div className="grid md:grid-cols-2 gap-3">
              <BreakdownCard
                title="🪑 Phân bố tư thế (30 phút)"
                data={last30min.postureBreakdown}
                labelMap={POSTURE_LABEL}
                colorMap={POSTURE_COLOR}
              />
              <BreakdownCard
                title="😊 Phân bố biểu cảm (30 phút)"
                data={last30min.emotionBreakdown}
                labelMap={EMOTION_LABEL}
                colorMap={EMOTION_COLOR}
              />
            </div>

            {/* Video preview (optional) */}
            {showVideo && (
              <div className="mt-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-cyan-300">🎥 Camera preview (320×240, mirror)</h3>
                  <button onClick={() => setShowVideo(false)}
                    className="text-[10px] text-white/45 hover:text-white/80">Tắt</button>
                </div>
                <video ref={monitor.videoRef} playsInline muted
                  className="rounded-lg w-80 h-60 object-cover" style={{ transform: 'scaleX(-1)' }} />
              </div>
            )}

            {/* Tech info */}
            <div className="mt-4 rounded-2xl bg-slate-900/40 border border-white/[0.06] p-3 text-[10.5px] text-white/55 leading-relaxed">
              <h4 className="font-bold text-white/70 mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Cách bảo vệ hiệu năng
              </h4>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Camera <strong>320×240 @ 15 FPS max</strong> (16× ít pixel hơn 1080p)</li>
                <li>Inference throttle <strong>2 Hz</strong> baseline — đủ phát hiện thay đổi tư thế</li>
                <li>Adaptive: latency &gt; 200ms → giảm xuống 0.5 Hz; &lt; 80ms → tăng lên 4 Hz</li>
                <li>Tab ẩn → {backgroundMode ? '0.5 Hz background' : 'auto-pause'}</li>
                <li>requestIdleCallback wrap → yield cho UI tác vụ ưu tiên cao</li>
                <li>BroadcastChannel singleton → chặn 2 tab cùng chạy</li>
              </ul>
            </div>
          </>
        )}

        {/* Hidden video element when not showing preview */}
        {!showVideo && <video ref={monitor.videoRef} playsInline muted className="hidden" />}
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-bold text-sm text-white/90">{title}</div>
      <div className="text-[11px] text-white/55 leading-relaxed mt-0.5">{desc}</div>
    </div>
  )
}

function TimelineChart({ data }: { data: { t: number; eng: number }[] }) {
  if (data.length < 2) {
    return <div className="h-32 flex items-center justify-center text-white/35 text-xs">Chờ thêm dữ liệu…</div>
  }
  const w = 800, h = 140, pad = 24
  const minT = data[0].t, maxT = data[data.length - 1].t
  const xS = (t: number) => pad + ((t - minT) / Math.max(1, maxT - minT)) * (w - pad * 2)
  const yS = (e: number) => h - pad - (e / 100) * (h - pad * 2)
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xS(d.t).toFixed(1)} ${yS(d.eng).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id="tl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Y grid */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={pad} y1={yS(v)} x2={w - pad} y2={yS(v)} stroke="#1f2937" strokeWidth={0.5} />
          <text x={4} y={yS(v) + 3} fill="#64748b" fontSize={9} fontFamily="monospace">{v}</text>
        </g>
      ))}
      <path d={`${path} L ${xS(data[data.length - 1].t)} ${h - pad} L ${pad} ${h - pad} Z`} fill="url(#tl-grad)" />
      <path d={path} stroke="#22d3ee" strokeWidth={1.5} fill="none" />
      {data.map((d, i) => (
        <circle key={i} cx={xS(d.t)} cy={yS(d.eng)} r={2} fill="#22d3ee" />
      ))}
    </svg>
  )
}

function BreakdownCard<T extends string>({
  title, data, labelMap, colorMap,
}: {
  title: string
  data: Record<T, number>
  labelMap: Record<T, string>
  colorMap: Record<T, string>
}) {
  const items = Object.entries(data)
    .map(([k, v]) => ({ key: k as T, label: labelMap[k as T] ?? k, color: colorMap[k as T] ?? '#888', pct: v as number }))
    .sort((a, b) => b.pct - a.pct)
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 text-white/35 text-xs">
        Chờ dữ liệu…
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
      <h3 className="text-sm font-bold text-cyan-300 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.key}>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-white/80">{it.label}</span>
              <span className="font-mono text-white/65">{it.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full transition-all"
                   style={{ width: `${it.pct}%`, background: it.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
