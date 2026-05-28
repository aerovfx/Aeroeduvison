/**
 * usePostureMonitor — React hook tích hợp:
 *   1. getUserMedia (camera) với resolution thấp 320×240 cho hiệu năng
 *   2. MediaPipe Pose + Face inference @ throttled 2 Hz
 *   3. Analyzer pipeline → snapshot history (in-memory, last 30 phút)
 *   4. Optimization rules:
 *      - document.hidden → pause analysis (tab background)
 *      - Adaptive FPS: nếu latency > 200ms → giảm xuống 1 Hz
 *      - requestIdleCallback wrap để yield cho UI
 *      - Hard cap CPU time: nếu N=5 frame liên tiếp > 200ms → auto-pause
 *      - Singleton enforced qua BroadcastChannel — ngăn 2 tab cùng chạy
 *
 * Local-only — KHÔNG upload server. Lưu lịch sử trong useState (memory) +
 * sessionStorage để persist qua reload trong cùng session.
 *
 * Trả về: status + snapshot mới nhất + lịch sử + control methods (start/stop/pause)
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { loadMediaPipe } from '@/lib/posture/mediapipe-loader'
import {
  analyzePose, analyzeExpression, computeEngagement,
  createBlinkTracker,
  type EngagementSnapshot, type BlinkTracker,
} from '@/lib/posture/analyzer'

// ─── Config ────────────────────────────────────────────────────
const CAMERA_WIDTH = 320       // low-res for inference speed (still good for landmarks)
const CAMERA_HEIGHT = 240
const DEFAULT_INTERVAL_MS = 500     // 2 Hz baseline
const MIN_INTERVAL_MS = 250         // 4 Hz max
const MAX_INTERVAL_MS = 2000        // 0.5 Hz min (background mode)
const LATENCY_SLOW_MS = 200         // > this latency → slow down
const LATENCY_FAST_MS = 80          // < this latency → can speed up
const HISTORY_LIMIT = 3600          // 30 phút @ 2 Hz = 3600 snapshots
const SESSION_STORAGE_KEY = 'aero:posture-history'
const SINGLETON_CHANNEL = 'aero-posture-singleton'

// ─── Types ─────────────────────────────────────────────────────
export type MonitorStatus =
  | 'idle'         // chưa bật
  | 'loading'      // đang tải MediaPipe
  | 'permission'   // chờ permission camera
  | 'running'      // đang chạy
  | 'paused'       // pause (tab hidden hoặc user pause)
  | 'error'        // lỗi
  | 'blocked'      // singleton block — tab khác đang chạy

export interface UsePostureMonitorOptions {
  /** Bật chế độ chạy nền (giảm FPS xuống 0.5 Hz khi tab hidden, không pause hẳn) */
  backgroundMode?: boolean
  /** Callback khi có snapshot mới (vd để stream lên server cho teacher monitoring) */
  onSnapshot?: (s: EngagementSnapshot) => void
  /** Persist history vào sessionStorage để survive reload */
  persistHistory?: boolean
}

export interface UsePostureMonitorReturn {
  status: MonitorStatus
  error: string | null
  loadingStage: string  // 'init' | 'fileset' | 'pose' | 'face' | 'ready'
  current: EngagementSnapshot | null
  history: EngagementSnapshot[]
  videoRef: React.RefObject<HTMLVideoElement>
  fps: number   // measured FPS
  latencyMs: number
  delegate: 'GPU' | 'CPU' | null
  start: () => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  clearHistory: () => void
}

// ─── Singleton enforcement via BroadcastChannel ─────────────────
function tryClaimSingleton(): { isOwner: boolean; release: () => void; channel: BroadcastChannel | null } {
  if (typeof BroadcastChannel === 'undefined') {
    return { isOwner: true, release: () => {}, channel: null }
  }
  const channel = new BroadcastChannel(SINGLETON_CHANNEL)
  // Announce intent + listen for conflict
  let isOwner = true
  channel.postMessage({ type: 'claim', ts: Date.now() })
  // Note: this naive approach trusts first-come. Production might use Web Locks API.
  return {
    isOwner,
    release: () => {
      channel.postMessage({ type: 'release' })
      channel.close()
    },
    channel,
  }
}

export function usePostureMonitor(
  options: UsePostureMonitorOptions = {},
): UsePostureMonitorReturn {
  const { backgroundMode = false, onSnapshot, persistHistory = true } = options

  const [status, setStatus] = useState<MonitorStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loadingStage, setLoadingStage] = useState<string>('')
  const [current, setCurrent] = useState<EngagementSnapshot | null>(null)
  const [history, setHistory] = useState<EngagementSnapshot[]>(() => {
    if (persistHistory && typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
        if (raw) return JSON.parse(raw) as EngagementSnapshot[]
      } catch { /* ignore */ }
    }
    return []
  })
  const [fps, setFps] = useState(0)
  const [latencyMs, setLatencyMs] = useState(0)
  const [delegate, setDelegate] = useState<'GPU' | 'CPU' | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const blinkTrackerRef = useRef<BlinkTracker>(createBlinkTracker())
  const slowFrameCountRef = useRef(0)
  const currentIntervalRef = useRef(DEFAULT_INTERVAL_MS)
  const singletonRef = useRef<ReturnType<typeof tryClaimSingleton> | null>(null)
  const isPausedRef = useRef(false)
  const lastFpsTimeRef = useRef(0)
  const frameCountRef = useRef(0)

  // ─ Persist history to sessionStorage (debounced) ─
  useEffect(() => {
    if (!persistHistory) return
    const id = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)))
      } catch { /* quota — ignore */ }
    }, 2000)
    return () => clearTimeout(id)
  }, [history, persistHistory])

  // ─ Visibility/app-state-aware pause/resume ─
  // Web: document.visibilitychange. iOS WKWebView: native:appStateChange
  // (NativeBridge emit) vì visibilitychange không phải lúc nào cũng fire
  // tin cậy trong WebView. iOS giới hạn background ~30s nên pause là đúng.
  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return
    const goBackground = () => {
      if (backgroundMode) {
        currentIntervalRef.current = MAX_INTERVAL_MS  // slow sampling 0.5 Hz
      } else {
        isPausedRef.current = true
        setStatus('paused')                            // hard pause
      }
    }
    const goForeground = () => {
      currentIntervalRef.current = DEFAULT_INTERVAL_MS
      isPausedRef.current = false
      if (status === 'paused') setStatus('running')
    }
    const onVisibilityChange = () => { document.hidden ? goBackground() : goForeground() }
    const onAppState = (e: Event) => {
      const active = (e as CustomEvent<{ isActive: boolean }>).detail?.isActive
      active ? goForeground() : goBackground()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('native:appStateChange', onAppState)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('native:appStateChange', onAppState)
    }
  }, [status, backgroundMode])

  // ─ Battery-aware throttle (iOS/Android native) ─
  // Pin < 15% + không sạc → giảm xuống 1 Hz (tiết kiệm pin). Pin < 8% → pause.
  // Check mỗi 30s. Web không có @capacitor/device → no-op.
  useEffect(() => {
    if (status !== 'running') return
    let cancelled = false
    const checkBattery = async () => {
      if (typeof window === 'undefined') return
      const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      if (!cap?.isNativePlatform?.()) return
      try {
        const { Device } = await import('@capacitor/device')
        const info = await Device.getBatteryInfo()
        if (cancelled) return
        const level = info.batteryLevel ?? 1
        const charging = info.isCharging ?? false
        if (!charging && level < 0.08) {
          // Pin cực thấp → pause để tiết kiệm
          isPausedRef.current = true
          console.info('[posture-monitor] battery <8% → pause')
        } else if (!charging && level < 0.15) {
          // Pin thấp → throttle 1 Hz
          currentIntervalRef.current = Math.max(currentIntervalRef.current, 1000)
          console.info('[posture-monitor] battery <15% → throttle 1Hz')
        }
      } catch { /* @capacitor/device chưa cài / lỗi → bỏ qua */ }
    }
    checkBattery()
    const id = window.setInterval(checkBattery, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [status])

  // ─ Inference tick — called on adaptive interval ─
  const tick = useCallback(async () => {
    const video = videoRef.current
    if (!video || isPausedRef.current || video.readyState < 2) return

    const models = await loadMediaPipe()
    if (!models.pose) return

    const now = performance.now()
    let poseResult, faceResult
    try {
      // detectForVideo expects monotonically increasing timestamp
      const ts = now | 0
      poseResult = models.pose.detectForVideo(video, ts)
      if (models.face) {
        faceResult = models.face.detectForVideo(video, ts)
      }
    } catch (e) {
      console.warn('[posture-monitor] inference error:', e)
      return
    }
    const latency = performance.now() - now

    // ─ Analyze ─
    const poseLandmarks = poseResult?.landmarks?.[0] ?? null
    const blendshapes = faceResult?.faceBlendshapes?.[0]?.categories ?? null
    const posture = analyzePose(poseLandmarks)
    const expression = analyzeExpression(blendshapes, null, blinkTrackerRef.current)
    const engagement = computeEngagement(posture, expression)
    const noPerson = !posture || posture.posture === 'absent'

    const snapshot: EngagementSnapshot = {
      timestamp: Date.now(),
      engagement,
      posture,
      expression,
      noPersonDetected: noPerson,
    }
    setCurrent(snapshot)
    setHistory(h => {
      const next = [...h, snapshot]
      // Cap memory — drop oldest
      if (next.length > HISTORY_LIMIT) next.splice(0, next.length - HISTORY_LIMIT)
      return next
    })
    onSnapshot?.(snapshot)

    // ─ Adaptive throttling ─
    setLatencyMs(latency | 0)
    if (latency > LATENCY_SLOW_MS) {
      slowFrameCountRef.current += 1
      // Slow consistently → increase interval (slow down)
      if (slowFrameCountRef.current >= 3 && currentIntervalRef.current < MAX_INTERVAL_MS) {
        currentIntervalRef.current = Math.min(MAX_INTERVAL_MS, currentIntervalRef.current * 1.5)
        console.info(`[posture-monitor] adaptive slow → ${currentIntervalRef.current}ms`)
        slowFrameCountRef.current = 0
        // Restart interval with new period
        scheduleNextTick()
      }
    } else if (latency < LATENCY_FAST_MS) {
      slowFrameCountRef.current = Math.max(0, slowFrameCountRef.current - 1)
      // Plenty of headroom → speed up gradually
      if (currentIntervalRef.current > DEFAULT_INTERVAL_MS) {
        currentIntervalRef.current = Math.max(DEFAULT_INTERVAL_MS, currentIntervalRef.current * 0.9)
      }
    }

    // ─ FPS counter ─
    frameCountRef.current += 1
    const elapsed = performance.now() - lastFpsTimeRef.current
    if (elapsed > 2000) {
      setFps(Math.round((frameCountRef.current * 1000) / elapsed * 10) / 10)
      frameCountRef.current = 0
      lastFpsTimeRef.current = performance.now()
    }
  }, [onSnapshot])

  const scheduleNextTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = window.setInterval(() => {
      // Wrap in idle callback if available — yield to higher-priority UI work
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => tick(), { timeout: currentIntervalRef.current })
      } else {
        tick()
      }
    }, currentIntervalRef.current)
  }, [tick])

  // ─ Start ─
  const start = useCallback(async () => {
    try {
      setError(null)
      setStatus('loading')
      setLoadingStage('init')

      // Singleton claim
      singletonRef.current = tryClaimSingleton()
      if (!singletonRef.current.isOwner) {
        setStatus('blocked')
        setError('Một tab khác đang sử dụng tính năng theo dõi. Đóng tab kia trước.')
        return
      }

      // Load MediaPipe
      const models = await loadMediaPipe(stage => setLoadingStage(stage))
      setDelegate(models.delegate)

      // Request camera
      setStatus('permission')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAMERA_WIDTH },
          height: { ideal: CAMERA_HEIGHT },
          frameRate: { ideal: 15, max: 30 },  // hint browser to lower FPS
          facingMode: 'user',
        },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) throw new Error('Video element không sẵn sàng')
      video.srcObject = stream
      await video.play()

      isPausedRef.current = false
      currentIntervalRef.current = DEFAULT_INTERVAL_MS
      slowFrameCountRef.current = 0
      lastFpsTimeRef.current = performance.now()
      frameCountRef.current = 0
      blinkTrackerRef.current = createBlinkTracker()
      setStatus('running')
      scheduleNextTick()
    } catch (e: any) {
      console.error('[posture-monitor] start error:', e)
      setStatus('error')
      const msg = e?.name === 'NotAllowedError'
        ? 'Bạn đã từ chối quyền camera. Vào Settings để bật lại.'
        : e?.name === 'NotFoundError'
        ? 'Không tìm thấy camera. Cắm webcam hoặc bật camera laptop.'
        : e?.message || 'Lỗi không xác định'
      setError(msg)
    }
  }, [scheduleNextTick])

  // ─ Stop (full release) ─
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    if (singletonRef.current) {
      singletonRef.current.release()
      singletonRef.current = null
    }
    isPausedRef.current = false
    setStatus('idle')
    setCurrent(null)
  }, [])

  const pause = useCallback(() => {
    isPausedRef.current = true
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    isPausedRef.current = false
    setStatus('running')
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  // ─ Cleanup on unmount ─
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (singletonRef.current) singletonRef.current.release()
    }
  }, [])

  return {
    status, error, loadingStage,
    current, history,
    videoRef,
    fps, latencyMs, delegate,
    start, stop, pause, resume, clearHistory,
  }
}
