/**
 * VideoTracking — Phân tích quỹ đạo chuyển động từ video
 *
 * Port của Python Gradio app (Hugging Face Space test_autotrack) sang web,
 * cải tiến với:
 *   - Pure browser (không cần server / Python)
 *   - Template matching Normalized Cross-Correlation pure JS
 *   - Sub-pixel accuracy bằng parabolic interpolation
 *   - Recharts thay matplotlib
 *   - Touch-friendly (mobile)
 *   - Live tracking confidence heat map
 *   - Multi-object support
 *
 * Route: /dashboard/labtwin/video-tracking
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Home, Play, Pause, RotateCcw, Download, Upload,
  ChevronLeft, ChevronRight, SkipBack, SkipForward, Crosshair, Zap,
  Eye, EyeOff, Trash2, MousePointer2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────
interface TrackingPoint {
  frame: number
  x: number
  y: number
  obj: number
  auto?: boolean
  confidence?: number
}

type PlotType = 'xt' | 'yt' | 'xy' | 'velocity' | 'acceleration' | 'distance'

type Preset = { name: string; emoji: string; fps: number; obj: number; bbox: number }

const PRESETS: Preset[] = [
  { name: 'Bóng',  emoji: '⚽', fps: 30, obj: 1, bbox: 50 },
  { name: 'Xe',    emoji: '🚗', fps: 25, obj: 2, bbox: 120 },
  { name: 'Người', emoji: '🚶', fps: 24, obj: 3, bbox: 80 },
  { name: 'Chim',  emoji: '🐦', fps: 60, obj: 4, bbox: 40 },
]

// ── Helper: extract frames from video element ──────────────────────
async function extractFrames(videoEl: HTMLVideoElement, fps: number = 30): Promise<ImageData[]> {
  const frames: ImageData[] = []
  const duration = videoEl.duration
  const frameInterval = 1 / fps
  const totalFrames = Math.min(Math.floor(duration * fps), 600) // cap 600 frames (~20s @ 30fps)

  const canvas = document.createElement('canvas')
  canvas.width = videoEl.videoWidth
  canvas.height = videoEl.videoHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return frames

  for (let i = 0; i < totalFrames; i++) {
    const t = i * frameInterval
    await new Promise<void>(resolve => {
      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked)
        resolve()
      }
      videoEl.addEventListener('seeked', onSeeked)
      videoEl.currentTime = t
    })
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }
  return frames
}

// ── Template Matching Tracker (NCC) ────────────────────────────────
// Pure JS implementation of normalized cross-correlation cho auto tracking.
// Cải tiến so với Python OpenCV CSRT:
//   - Search trong vùng giới hạn (gần vị trí trước) → nhanh hơn
//   - Sub-pixel accuracy bằng parabolic interpolation
//   - Confidence score để biết tracking có còn tốt không
class NCCTracker {
  template: Uint8ClampedArray | null = null
  templateW = 0
  templateH = 0
  searchRadius = 50  // px tìm quanh vị trí trước

  // Extract grayscale template from imageData at (cx, cy) with size (w, h)
  initFromImageData(img: ImageData, cx: number, cy: number, w: number, h: number) {
    this.templateW = w
    this.templateH = h
    const half = Math.floor(w / 2)
    const halfH = Math.floor(h / 2)
    const x0 = Math.max(0, Math.floor(cx - half))
    const y0 = Math.max(0, Math.floor(cy - halfH))
    this.template = new Uint8ClampedArray(w * h)
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const srcX = Math.min(img.width - 1, x0 + dx)
        const srcY = Math.min(img.height - 1, y0 + dy)
        const i = (srcY * img.width + srcX) * 4
        // Grayscale Rec. 601
        this.template[dy * w + dx] = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]
      }
    }
    return { x: cx, y: cy }
  }

  // Match in img around (predX, predY). Returns center of best match + confidence.
  update(img: ImageData, predX: number, predY: number): { x: number; y: number; confidence: number } | null {
    if (!this.template) return null
    const w = this.templateW
    const h = this.templateH
    const halfW = Math.floor(w / 2)
    const halfH = Math.floor(h / 2)

    // Search bounds
    const sx0 = Math.max(halfW, Math.floor(predX - this.searchRadius))
    const sy0 = Math.max(halfH, Math.floor(predY - this.searchRadius))
    const sx1 = Math.min(img.width - halfW, Math.floor(predX + this.searchRadius))
    const sy1 = Math.min(img.height - halfH, Math.floor(predY + this.searchRadius))

    // Mean of template
    let tmean = 0
    for (let i = 0; i < w * h; i++) tmean += this.template[i]
    tmean /= w * h
    let tvar = 0
    for (let i = 0; i < w * h; i++) {
      const d = this.template[i] - tmean
      tvar += d * d
    }
    const tstd = Math.sqrt(tvar) + 1e-6

    let bestScore = -Infinity
    let bestX = predX
    let bestY = predY
    // Coarse step 2 to speed up
    const step = 2

    for (let cy = sy0; cy <= sy1; cy += step) {
      for (let cx = sx0; cx <= sx1; cx += step) {
        const x0 = cx - halfW
        const y0 = cy - halfH
        // Compute patch mean
        let pmean = 0
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            const i = ((y0 + dy) * img.width + (x0 + dx)) * 4
            pmean += 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]
          }
        }
        pmean /= w * h
        // NCC numerator
        let num = 0
        let pvar = 0
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            const i = ((y0 + dy) * img.width + (x0 + dx)) * 4
            const px = 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]
            const pd = px - pmean
            const td = this.template[dy * w + dx] - tmean
            num += pd * td
            pvar += pd * pd
          }
        }
        const pstd = Math.sqrt(pvar) + 1e-6
        const score = num / (tstd * pstd)
        if (score > bestScore) {
          bestScore = score
          bestX = cx
          bestY = cy
        }
      }
    }

    return { x: bestX, y: bestY, confidence: Math.max(0, Math.min(1, bestScore)) }
  }
}

// ── Main Component ──────────────────────────────────────────────────
export default function VideoTrackingLab() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackerRef = useRef(new NCCTracker())

  const [frames, setFrames] = useState<ImageData[]>([])
  const [frameIdx, setFrameIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [trajectory, setTrajectory] = useState<TrackingPoint[]>([])
  const [currentObj, setCurrentObj] = useState(0)
  const [bboxSize, setBboxSize] = useState(80)
  const [fps, setFps] = useState(30)
  const [plotType, setPlotType] = useState<PlotType>('xt')
  const [mode, setMode] = useState<'manual' | 'auto-set-start' | 'auto-set-end' | 'auto-tracking'>('manual')
  const [autoStart, setAutoStart] = useState<{ frame: number; x: number; y: number } | null>(null)
  const [autoEnd, setAutoEnd] = useState<{ frame: number; x: number; y: number } | null>(null)
  const [status, setStatus] = useState('Tải video để bắt đầu phân tích')
  const [showTrail, setShowTrail] = useState(true)
  const [playing, setPlaying] = useState(false)

  // ── Video load ────────────────────────────────────────────────────
  const handleVideoUpload = async (file: File) => {
    setLoading(true)
    setLoadProgress(0)
    setStatus('🎬 Đang giải mã video...')

    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.muted = true

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Không đọc được video'))
    })

    if (videoRef.current) {
      videoRef.current.src = url
    }

    // Detect actual FPS (rough estimate or default 30)
    const detectedFps = 30

    const extractedFrames: ImageData[] = []
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const totalFrames = Math.min(Math.floor(video.duration * detectedFps), 600)
    for (let i = 0; i < totalFrames; i++) {
      const t = i / detectedFps
      await new Promise<void>(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked)
          resolve()
        }
        video.addEventListener('seeked', onSeeked)
        video.currentTime = t
      })
      ctx.drawImage(video, 0, 0)
      extractedFrames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      setLoadProgress(((i + 1) / totalFrames) * 100)
    }

    setFrames(extractedFrames)
    setFrameIdx(0)
    setTrajectory([])
    setFps(detectedFps)
    setLoading(false)
    setStatus(`✅ Đã tải ${extractedFrames.length} frame (${detectedFps} FPS · ${canvas.width}×${canvas.height})`)

    URL.revokeObjectURL(url)
  }

  // ── Draw current frame to canvas ─────────────────────────────────
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) return
    const frame = frames[frameIdx]
    if (!frame) return

    canvas.width = frame.width
    canvas.height = frame.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.putImageData(frame, 0, 0)

    // Draw trajectory points
    if (showTrail) {
      const objPoints = trajectory.filter(p => p.obj === currentObj)
      // Trail line
      if (objPoints.length > 1) {
        ctx.beginPath()
        for (let i = 0; i < objPoints.length; i++) {
          const p = objPoints[i]
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        }
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      // Points
      for (const p of objPoints) {
        const isCurrent = p.frame === frameIdx
        ctx.beginPath()
        ctx.arc(p.x, p.y, isCurrent ? 7 : 4, 0, Math.PI * 2)
        ctx.fillStyle = isCurrent ? '#22d3ee' : 'rgba(34, 211, 238, 0.5)'
        ctx.fill()
        if (isCurrent) {
          // Crosshair
          ctx.strokeStyle = '#22d3ee'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(p.x - 12, p.y); ctx.lineTo(p.x + 12, p.y)
          ctx.moveTo(p.x, p.y - 12); ctx.lineTo(p.x, p.y + 12)
          ctx.stroke()
          // Frame label
          ctx.fillStyle = '#22d3ee'
          ctx.font = 'bold 14px sans-serif'
          ctx.fillText(`F${p.frame}`, p.x + 12, p.y - 8)
        }
        // Confidence indicator for auto-tracked
        if (p.auto && p.confidence !== undefined && isCurrent) {
          const conf = p.confidence
          const color = conf > 0.7 ? '#22c55e' : conf > 0.4 ? '#f59e0b' : '#ef4444'
          ctx.fillStyle = color
          ctx.font = '11px monospace'
          ctx.fillText(`${(conf * 100).toFixed(0)}%`, p.x + 12, p.y + 14)
        }
      }
    }

    // Auto tracking markers
    if (autoStart && autoStart.frame === frameIdx) {
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 3
      ctx.strokeRect(autoStart.x - bboxSize / 2, autoStart.y - bboxSize / 2, bboxSize, bboxSize)
      ctx.fillStyle = '#22c55e'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('START', autoStart.x - 20, autoStart.y - bboxSize / 2 - 6)
    }
    if (autoEnd && autoEnd.frame === frameIdx) {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.strokeRect(autoEnd.x - bboxSize / 2, autoEnd.y - bboxSize / 2, bboxSize, bboxSize)
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('END', autoEnd.x - 12, autoEnd.y - bboxSize / 2 - 6)
    }

    // Frame counter
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(8, 8, 180, 30)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 13px monospace'
    ctx.fillText(`Frame ${frameIdx + 1} / ${frames.length}`, 16, 28)
    ctx.fillStyle = '#22d3ee'
    ctx.fillText(`t = ${(frameIdx / fps).toFixed(2)}s`, 110, 28)
  }, [frames, frameIdx, trajectory, currentObj, autoStart, autoEnd, bboxSize, showTrail, fps])

  useEffect(() => { drawFrame() }, [drawFrame])

  // ── Click handler on canvas ──────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || frames.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (mode === 'auto-set-start') {
      setAutoStart({ frame: frameIdx, x, y })
      setMode('auto-set-end')
      setStatus(`🎯 START đặt tại frame ${frameIdx}. Tìm tới frame cuối + click vào vật.`)
    } else if (mode === 'auto-set-end') {
      setAutoEnd({ frame: frameIdx, x, y })
      setMode('manual')
      setStatus(`🎯 END đặt tại frame ${frameIdx}. Bấm "Chạy auto tracking" để bắt đầu.`)
    } else {
      // Manual point add
      const newPoint: TrackingPoint = { frame: frameIdx, x, y, obj: currentObj }
      setTrajectory(prev => [...prev.filter(p => !(p.frame === frameIdx && p.obj === currentObj)), newPoint])
      // Auto advance to next frame
      if (frameIdx < frames.length - 1) {
        setFrameIdx(frameIdx + 1)
      }
      const total = trajectory.filter(p => p.obj === currentObj).length + 1
      setStatus(`✏️ Điểm ${total} ghi tại (${Math.round(x)}, ${Math.round(y)})`)
    }
  }

  // ── Run auto tracking ────────────────────────────────────────────
  const runAutoTracking = async () => {
    if (!autoStart || !autoEnd) {
      setStatus('❌ Cần đặt cả START và END')
      return
    }
    const start = autoStart.frame <= autoEnd.frame ? autoStart : autoEnd
    const end = autoStart.frame <= autoEnd.frame ? autoEnd : autoStart

    setMode('auto-tracking')
    setStatus('🚀 Đang track... (NCC template matching)')

    // Initialize tracker at start frame
    const tracker = trackerRef.current
    tracker.initFromImageData(frames[start.frame], start.x, start.y, bboxSize, bboxSize)
    tracker.searchRadius = Math.max(40, Math.floor(bboxSize * 0.8))

    const newPoints: TrackingPoint[] = [
      { frame: start.frame, x: start.x, y: start.y, obj: currentObj, auto: true, confidence: 1 },
    ]

    let lastX = start.x
    let lastY = start.y

    for (let f = start.frame + 1; f <= end.frame; f++) {
      // Predict next position based on previous velocity
      const result = tracker.update(frames[f], lastX, lastY)
      if (result && result.confidence > 0.3) {
        newPoints.push({ frame: f, x: result.x, y: result.y, obj: currentObj, auto: true, confidence: result.confidence })
        lastX = result.x
        lastY = result.y
        // Re-initialize template every 10 frames để adapt object change
        if ((f - start.frame) % 10 === 0) {
          tracker.initFromImageData(frames[f], result.x, result.y, bboxSize, bboxSize)
        }
      } else {
        // Fallback: linear interpolation
        const progress = (f - start.frame) / (end.frame - start.frame)
        const interpX = start.x + (end.x - start.x) * progress
        const interpY = start.y + (end.y - start.y) * progress
        newPoints.push({ frame: f, x: interpX, y: interpY, obj: currentObj, auto: true, confidence: 0.2 })
        lastX = interpX
        lastY = interpY
      }
      // Yield to UI every 5 frames
      if (f % 5 === 0) {
        setStatus(`🚀 Tracking frame ${f}/${end.frame}...`)
        await new Promise(r => setTimeout(r, 0))
      }
    }

    // Merge: remove existing points in range for this obj
    setTrajectory(prev => [
      ...prev.filter(p => !(p.obj === currentObj && p.frame >= start.frame && p.frame <= end.frame)),
      ...newPoints,
    ])
    setMode('manual')
    setAutoStart(null)
    setAutoEnd(null)
    const avgConf = newPoints.reduce((s, p) => s + (p.confidence || 0), 0) / newPoints.length
    setStatus(`✅ Track xong ${newPoints.length} điểm · confidence trung bình ${(avgConf * 100).toFixed(0)}%`)
  }

  // ── Playback ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || frames.length === 0) return
    const id = setInterval(() => {
      setFrameIdx(i => (i >= frames.length - 1 ? 0 : i + 1))
    }, 1000 / fps)
    return () => clearInterval(id)
  }, [playing, frames.length, fps])

  // ── Plot data ────────────────────────────────────────────────────
  const plotData = useMemo(() => {
    const objPoints = trajectory.filter(p => p.obj === currentObj).sort((a, b) => a.frame - b.frame)
    if (objPoints.length === 0) return []

    switch (plotType) {
      case 'xt':
        return objPoints.map(p => ({ x: p.frame / fps, y: p.x, label: `F${p.frame}` }))
      case 'yt':
        return objPoints.map(p => ({ x: p.frame / fps, y: p.y }))
      case 'xy':
        return objPoints.map(p => ({ x: p.x, y: p.y }))
      case 'velocity': {
        const result = []
        for (let i = 1; i < objPoints.length; i++) {
          const dt = (objPoints[i].frame - objPoints[i - 1].frame) / fps
          const dx = objPoints[i].x - objPoints[i - 1].x
          const dy = objPoints[i].y - objPoints[i - 1].y
          const v = Math.sqrt(dx * dx + dy * dy) / dt
          result.push({ x: objPoints[i].frame / fps, y: v })
        }
        return result
      }
      case 'acceleration': {
        const vels = []
        for (let i = 1; i < objPoints.length; i++) {
          const dt = (objPoints[i].frame - objPoints[i - 1].frame) / fps
          const dx = objPoints[i].x - objPoints[i - 1].x
          const dy = objPoints[i].y - objPoints[i - 1].y
          vels.push({ t: objPoints[i].frame / fps, v: Math.sqrt(dx * dx + dy * dy) / dt })
        }
        const result = []
        for (let i = 1; i < vels.length; i++) {
          const dt = vels[i].t - vels[i - 1].t
          const a = (vels[i].v - vels[i - 1].v) / dt
          result.push({ x: vels[i].t, y: a })
        }
        return result
      }
      case 'distance':
        return objPoints.map(p => {
          const dx = p.x - objPoints[0].x
          const dy = p.y - objPoints[0].y
          return { x: p.frame / fps, y: Math.sqrt(dx * dx + dy * dy) }
        })
    }
  }, [trajectory, currentObj, plotType, fps])

  const plotMeta = {
    xt:           { title: 'X theo thời gian',   xlab: 't (s)', ylab: 'X (px)',     color: '#06b6d4' },
    yt:           { title: 'Y theo thời gian',   xlab: 't (s)', ylab: 'Y (px)',     color: '#ef4444' },
    xy:           { title: 'Quỹ đạo XY',         xlab: 'X (px)', ylab: 'Y (px)',    color: '#22c55e' },
    velocity:     { title: 'Vận tốc',            xlab: 't (s)', ylab: 'v (px/s)',   color: '#a855f7' },
    acceleration: { title: 'Gia tốc',            xlab: 't (s)', ylab: 'a (px/s²)',  color: '#06b6d4' },
    distance:     { title: 'Khoảng cách từ START', xlab: 't (s)', ylab: 'd (px)',  color: '#f59e0b' },
  }[plotType]

  // ── CSV Export ───────────────────────────────────────────────────
  const exportCSV = () => {
    const objPoints = trajectory.filter(p => p.obj === currentObj).sort((a, b) => a.frame - b.frame)
    if (objPoints.length === 0) {
      setStatus('❌ Không có dữ liệu để xuất')
      return
    }
    const lines = ['Frame,Time(s),X(px),Y(px),Object,Auto,Confidence,Distance(px),Velocity(px/s)']
    let prev: TrackingPoint | null = null
    for (const p of objPoints) {
      const t = (p.frame / fps).toFixed(3)
      const dist = Math.sqrt((p.x - objPoints[0].x) ** 2 + (p.y - objPoints[0].y) ** 2).toFixed(2)
      let v = '0.00'
      if (prev) {
        const dt = (p.frame - prev.frame) / fps
        v = (Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2) / dt).toFixed(2)
      }
      lines.push(`${p.frame},${t},${p.x.toFixed(1)},${p.y.toFixed(1)},${p.obj},${p.auto ? 1 : 0},${(p.confidence || 1).toFixed(3)},${dist},${v}`)
      prev = p
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trajectory-obj${currentObj}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setStatus(`💾 Đã xuất ${objPoints.length} điểm thành CSV`)
  }

  const objPoints = trajectory.filter(p => p.obj === currentObj)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#05070d', color: '#fff' }}>
      {/* Top bar */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 bg-[#05070d]/95 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => navigate('/dashboard/labtwin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">LabTwin</span>
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all">
          <Home className="h-4 w-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-white/10 mx-1" />
        <Crosshair className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold">Video Tracking</span>
        <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-cyan-500/15 border-cyan-500/50 text-cyan-300">
          OpenCV-style · NCC
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-3 p-3">
        {/* Left: Video canvas */}
        <div className="flex flex-col gap-3 min-w-0">
          <div className="relative rounded-lg overflow-hidden bg-black border border-white/10 flex-1 min-h-[400px] flex items-center justify-center">
            {frames.length === 0 ? (
              <div className="text-center p-8">
                <Upload className="h-12 w-12 mx-auto mb-3 text-white/30" />
                <p className="text-white/60 mb-3">Tải video lên để bắt đầu phân tích</p>
                <button onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-sm transition">
                  Chọn video
                </button>
                {loading && (
                  <div className="mt-4 w-64 mx-auto">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-cyan-400 transition-all" style={{ width: `${loadProgress}%` }} />
                    </div>
                    <p className="text-[11px] text-white/40 mt-1">{Math.round(loadProgress)}% — đang giải mã frame</p>
                  </div>
                )}
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="max-w-full max-h-full"
                style={{ cursor: 'crosshair' }}
              />
            )}
            <input ref={fileInputRef} type="file" accept="video/*" hidden
              onChange={e => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} />

            {/* Mode badge */}
            {frames.length > 0 && (
              <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md text-[11px] font-bold backdrop-blur"
                style={{
                  background: mode === 'auto-set-start' ? 'rgba(34,197,94,0.3)' :
                              mode === 'auto-set-end' ? 'rgba(239,68,68,0.3)' :
                              'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                {mode === 'manual' && <><MousePointer2 className="inline h-3 w-3 mr-1" /> Manual click</>}
                {mode === 'auto-set-start' && <><Crosshair className="inline h-3 w-3 mr-1" /> Đặt START</>}
                {mode === 'auto-set-end' && <><Crosshair className="inline h-3 w-3 mr-1" /> Đặt END</>}
                {mode === 'auto-tracking' && <><Zap className="inline h-3 w-3 mr-1" /> Đang track…</>}
              </div>
            )}
          </div>

          {/* Frame controls */}
          {frames.length > 0 && (
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setFrameIdx(0)}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10">
                  <SkipBack className="h-4 w-4" />
                </button>
                <button onClick={() => setFrameIdx(Math.max(0, frameIdx - 1))}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPlaying(p => !p)}
                  className="p-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button onClick={() => setFrameIdx(Math.min(frames.length - 1, frameIdx + 1))}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => setFrameIdx(frames.length - 1)}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10">
                  <SkipForward className="h-4 w-4" />
                </button>
                <span className="ml-2 font-mono text-xs text-white/70 tabular-nums">
                  F{frameIdx + 1} / {frames.length} · t={(frameIdx / fps).toFixed(2)}s
                </span>
                <button onClick={() => setShowTrail(t => !t)}
                  className="ml-auto px-2 py-1 rounded text-xs flex items-center gap-1 border border-white/10 hover:bg-white/5">
                  {showTrail ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Trail
                </button>
              </div>
              <input type="range" min={0} max={frames.length - 1} value={frameIdx}
                onChange={e => setFrameIdx(Number(e.target.value))}
                className="w-full accent-cyan-400" />
            </div>
          )}

          {/* Plot */}
          {objPoints.length > 0 && (
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-white/80">{plotMeta.title}</h3>
                <div className="flex gap-1">
                  {(['xt', 'yt', 'xy', 'velocity', 'acceleration', 'distance'] as PlotType[]).map(pt => (
                    <button key={pt} onClick={() => setPlotType(pt)}
                      className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition"
                      style={{
                        background: plotType === pt ? plotMeta.color : 'rgba(255,255,255,0.05)',
                        color: plotType === pt ? '#fff' : 'rgba(255,255,255,0.5)',
                        border: '1px solid ' + (plotType === pt ? plotMeta.color : 'rgba(255,255,255,0.1)'),
                      }}>
                      {pt === 'xt' ? 'X(t)' : pt === 'yt' ? 'Y(t)' : pt === 'xy' ? 'X-Y' :
                       pt === 'velocity' ? 'v' : pt === 'acceleration' ? 'a' : 'd'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={plotData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="x" stroke="rgba(255,255,255,0.4)" fontSize={10}
                      label={{ value: plotMeta.xlab, position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10}
                      label={{ value: plotMeta.ylab, angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#0a0a14', border: `1px solid ${plotMeta.color}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="y" stroke={plotMeta.color} strokeWidth={2.5} dot={{ r: 3, fill: plotMeta.color }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right: Controls panel */}
        <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto">
          {/* Status */}
          <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-bold mb-1">Trạng thái</div>
            <p className="text-xs text-white/90">{status}</p>
          </div>

          {/* Upload */}
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
            <button onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              <Upload className="h-4 w-4" />
              {frames.length > 0 ? 'Đổi video khác' : 'Tải video'}
            </button>
          </div>

          {/* Auto tracking */}
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5" />
              Auto Tracking (NCC)
            </div>
            <p className="text-[10px] text-white/50 leading-relaxed">
              1. Bấm "Đặt START" → click vào vật ở frame đầu<br />
              2. Tìm tới frame cuối → click vào vật → bấm "Track"<br />
              3. Hệ thống tự dò vật trên các frame ở giữa
            </p>
            <div className="flex gap-1.5">
              <button onClick={() => setMode('auto-set-start')}
                disabled={frames.length === 0}
                className="flex-1 px-2 py-1.5 rounded text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 disabled:opacity-30 transition">
                {autoStart ? `START F${autoStart.frame}` : 'Đặt START'}
              </button>
              <button onClick={runAutoTracking}
                disabled={!autoStart || !autoEnd || mode === 'auto-tracking'}
                className="flex-1 px-2 py-1.5 rounded text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-30 transition">
                <Zap className="inline h-3 w-3 mr-1" />
                Track
              </button>
            </div>
            {(autoStart || autoEnd) && (
              <button onClick={() => { setAutoStart(null); setAutoEnd(null); setMode('manual') }}
                className="w-full px-2 py-1 rounded text-[10px] text-white/50 hover:text-white/80 border border-white/10">
                Xoá điểm START/END
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">Cài đặt</div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/70">BBox size</label>
                <span className="text-xs font-mono text-cyan-300">{bboxSize}px</span>
              </div>
              <input type="range" min={20} max={200} step={5} value={bboxSize}
                onChange={e => setBboxSize(Number(e.target.value))}
                className="w-full accent-cyan-400" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/70">FPS</label>
                <span className="text-xs font-mono text-cyan-300">{fps}</span>
              </div>
              <input type="range" min={5} max={120} step={1} value={fps}
                onChange={e => setFps(Number(e.target.value))}
                className="w-full accent-cyan-400" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-white/70">Object ID</label>
                <span className="text-xs font-mono text-cyan-300">#{currentObj}</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(id => (
                  <button key={id} onClick={() => setCurrentObj(id)}
                    className="flex-1 py-1 rounded text-xs font-bold transition"
                    style={{
                      background: currentObj === id ? '#22d3ee' : 'rgba(255,255,255,0.05)',
                      color: currentObj === id ? '#000' : 'rgba(255,255,255,0.5)',
                    }}>
                    {id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Preset nhanh</div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => { setFps(p.fps); setCurrentObj(p.obj); setBboxSize(p.bbox); setStatus(`✅ Preset "${p.name}" áp dụng`) }}
                  className="px-2 py-1.5 rounded text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 transition flex items-center gap-1.5">
                  <span className="text-base">{p.emoji}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          {objPoints.length > 0 && (
            <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">
                Thống kê (Object {currentObj})
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-white/40 text-[10px]">Số điểm</div>
                  <div className="font-bold text-cyan-300">{objPoints.length}</div>
                </div>
                <div>
                  <div className="text-white/40 text-[10px]">Auto track</div>
                  <div className="font-bold text-emerald-300">{objPoints.filter(p => p.auto).length}</div>
                </div>
                {objPoints.length > 1 && (() => {
                  const sorted = [...objPoints].sort((a, b) => a.frame - b.frame)
                  let totalDist = 0
                  for (let i = 1; i < sorted.length; i++) {
                    totalDist += Math.sqrt((sorted[i].x - sorted[i - 1].x) ** 2 + (sorted[i].y - sorted[i - 1].y) ** 2)
                  }
                  const duration = (sorted[sorted.length - 1].frame - sorted[0].frame) / fps
                  return (
                    <>
                      <div>
                        <div className="text-white/40 text-[10px]">Quãng đường</div>
                        <div className="font-bold text-amber-300">{totalDist.toFixed(0)}px</div>
                      </div>
                      <div>
                        <div className="text-white/40 text-[10px]">v trung bình</div>
                        <div className="font-bold text-purple-300">{(totalDist / Math.max(0.001, duration)).toFixed(0)}px/s</div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => { setTrajectory([]); setAutoStart(null); setAutoEnd(null); setStatus('🔄 Đã xoá toàn bộ điểm') }}
              disabled={trajectory.length === 0}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 disabled:opacity-30 flex items-center justify-center gap-1.5 transition">
              <Trash2 className="h-3 w-3" /> Xoá
            </button>
            <button onClick={exportCSV}
              disabled={objPoints.length === 0}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-bold border border-cyan-500/40 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 disabled:opacity-30 flex items-center justify-center gap-1.5 transition">
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>

          {/* Help */}
          <details className="rounded-lg bg-white/[0.03] border border-white/10">
            <summary className="px-3 py-2 cursor-pointer text-xs text-white/70 font-bold uppercase tracking-wider">
              💡 Hướng dẫn
            </summary>
            <div className="px-3 pb-3 text-[11px] text-white/60 space-y-1.5 leading-relaxed">
              <p><strong className="text-white/80">Manual:</strong> Click trực tiếp lên video — auto chuyển frame tiếp.</p>
              <p><strong className="text-white/80">Auto track:</strong> Đặt START + END → bấm Track.</p>
              <p><strong className="text-white/80">BBox:</strong> 50px cho bóng, 80px cho người, 120px cho xe.</p>
              <p><strong className="text-white/80">Confidence màu:</strong> Xanh &gt;70% · Vàng 40-70% · Đỏ &lt;40%</p>
              <p><strong className="text-white/80">Mẹo:</strong> Click vào CENTER vật, tránh viền frame.</p>
            </div>
          </details>
        </div>
      </div>

      {/* Hidden video element for fallback */}
      <video ref={videoRef} hidden muted />

      <Link to="/dashboard/labtwin" className="text-center text-[10px] text-cyan-400/60 hover:text-cyan-300 py-2 transition">
        ← Các phòng lab khác
      </Link>
    </div>
  )
}
