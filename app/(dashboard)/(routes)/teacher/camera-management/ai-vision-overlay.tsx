"use client"

import '@/lib/mediapipe-console-filter'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  FilesetResolver,
  ObjectDetector,
  FaceLandmarker,
  PoseLandmarker,
  DrawingUtils
} from '@mediapipe/tasks-vision'
import {
  AdvancedEmotionDetector,
  EMOTION_CONFIG,
  EmotionType
} from '../../dashboard/vision-tracker/advanced-emotion-recognition'

/* ───────────────────────────────────────────────
 * Constants
 * ─────────────────────────────────────────────── */
const WASM_BASE_PATH = '/api/mediapipe-wasm/wasm'
const MODEL_PATHS = {
  objectDetector: '/models/efficientdet_lite0.tflite',
  faceLandmarker: '/models/face_landmarker.task',
  poseLandmarker: '/models/pose_landmarker.task',
} as const

/** How often (ms) to sample emotions for cloud analytics */
const EMOTION_SAMPLE_INTERVAL_MS = 3000
/** How often (ms) to flush buffered emotion samples to the server */
const EMOTION_FLUSH_INTERVAL_MS = 30_000
/** Max faces to detect simultaneously */
const MAX_FACES = 12
/** Max poses to detect simultaneously */
const MAX_POSES = 12
/** Object detection confidence threshold */
const OBJECT_SCORE_THRESHOLD = 0.40
/** Minimum confidence for hand-raise detection */
const HAND_RAISE_THRESHOLD = 0.12
/** IoU threshold for Non-Maximum Suppression */
const NMS_IOU_THRESHOLD = 0.45
/** Minimum bounding box area as fraction of frame area */
const MIN_BBOX_AREA_RATIO = 0.003
/** Number of frames to smooth the people count over */
const COUNT_SMOOTHING_WINDOW = 15
/** Weight factor: how much face count influences the final count (0‒1) */
const FACE_FUSION_WEIGHT = 0.35

interface AIVisionOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isActive: boolean
  cameraId: string
  /** List of student names for the class shown on this camera */
  studentNames?: string[]
  /** Class name, e.g. "Lớp 11A2" */
  className?: string
  onAnalysisUpdate?: (data: AnalysisResult) => void
  onSnapshot?: (data: AnalysisResult & { timestamp: string }) => void
}

interface AnalysisResult {
  peopleCount: number
  rawObjectCount: number
  faceCount: number
  emotions: EmotionType[]
  emotionDistribution: Record<string, number>
  dominantEmotion: EmotionType | null
  avgConfidence: number
  actions: string[]
  handRaiseCount: number
  attentionScore: number
  /** Per-face student name → detected emotion mapping */
  studentEmotions: Array<{ name: string; emotion: EmotionType; confidence: number }>
  timestamp?: string
}

interface BBox {
  x: number; y: number; w: number; h: number; score: number
}

/* ───────────────────────────────────────────────
 * NMS — Non-Maximum Suppression
 *
 * Removes duplicate overlapping bounding boxes
 * keeping only the highest-score box per cluster.
 * ─────────────────────────────────────────────── */
function computeIoU(a: BBox, b: BBox): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  const interW = Math.max(0, x2 - x1)
  const interH = Math.max(0, y2 - y1)
  const intersection = interW * interH
  const union = a.w * a.h + b.w * b.h - intersection
  return union > 0 ? intersection / union : 0
}

function nonMaxSuppression(boxes: BBox[], iouThreshold: number): BBox[] {
  if (boxes.length === 0) return []
  // Sort by score descending
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const keep: BBox[] = []
  const suppressed = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue
    keep.push(sorted[i])
    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue
      if (computeIoU(sorted[i], sorted[j]) > iouThreshold) {
        suppressed.add(j)
      }
    }
  }
  return keep
}

/* ───────────────────────────────────────────────
 * Temporal Smoothing — sliding window median
 *
 * Using median instead of mean to reject outlier
 * spikes where the detector suddenly sees double.
 * ─────────────────────────────────────────────── */
class CountSmoother {
  private window: number[]
  private size: number

  constructor(windowSize: number) {
    this.window = []
    this.size = windowSize
  }

  push(count: number): number {
    this.window.push(count)
    if (this.window.length > this.size) this.window.shift()
    // Return median
    const sorted = [...this.window].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid]
  }

  reset() { this.window = [] }
}

/* ───────────────────────────────────────────────
 * Helper: fetch a model as ArrayBuffer with validation
 * ─────────────────────────────────────────────── */
async function fetchModelBuffer(path: string): Promise<Uint8Array> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Failed to fetch model ${path}: ${response.status}`)
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('text/html')) {
    throw new Error(`Model ${path} returned HTML instead of binary — check file exists`)
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength < 1024) {
    throw new Error(`Model ${path} is too small (${buffer.byteLength} bytes) — likely corrupted`)
  }
  return new Uint8Array(buffer)
}

/* ───────────────────────────────────────────────
 * Component
 * ─────────────────────────────────────────────── */
export const AIVisionOverlay = ({ videoRef, isActive, cameraId, studentNames, className, onAnalysisUpdate, onSnapshot }: AIVisionOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isReady, setIsReady] = useState(false)

  // MediaPipe Task refs
  const objectDetectorRef = useRef<ObjectDetector | null>(null)
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null)
  const emotionDetectorRef = useRef<AdvancedEmotionDetector>(new AdvancedEmotionDetector())

  const animationFrameRef = useRef<number>(0)
  const isActiveRef = useRef(isActive)

  // Count smoothing
  const countSmootherRef = useRef<CountSmoother>(new CountSmoother(COUNT_SMOOTHING_WINDOW))

  // ── Emotion Analytics Buffer ──
  const emotionBufferRef = useRef<Array<{ emotionType: string; confidence: number; timestamp: number }>>([])
  const lastSampleRef = useRef<number>(0)
  const lastFlushRef = useRef<number>(Date.now())
  const fpsRef = useRef<{ frames: number; lastTick: number; current: number }>({ frames: 0, lastTick: Date.now(), current: 0 })

  // Keep props in refs for closure access without re-creating render loop
  const studentNamesRef = useRef(studentNames)
  useEffect(() => { isActiveRef.current = isActive }, [isActive])
  useEffect(() => { studentNamesRef.current = studentNames }, [studentNames])

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }
    countSmootherRef.current.reset()
    setIsReady(false)
  }, [])

  /* ── Initialize MediaPipe v0.10.32 Engine ── */
  const initMediaPipe = useCallback(async () => {
    try {
      console.log('[VisionOverlay] Initializing MediaPipe v0.10.32 Engine...')
      const wasmBase = `${window.location.origin}${WASM_BASE_PATH}`
      const vision = await FilesetResolver.forVisionTasks(wasmBase)

      // Parallel model download
      console.log('[VisionOverlay] Downloading AI models...')
      const [objBuf, faceBuf, poseBuf] = await Promise.all([
        fetchModelBuffer(MODEL_PATHS.objectDetector),
        fetchModelBuffer(MODEL_PATHS.faceLandmarker),
        fetchModelBuffer(MODEL_PATHS.poseLandmarker),
      ])
      console.log(`[VisionOverlay] Models loaded: OD=${(objBuf.length / 1e6).toFixed(1)}MB, FL=${(faceBuf.length / 1e6).toFixed(1)}MB, PL=${(poseBuf.length / 1e6).toFixed(1)}MB`)

      // Create detectors with latest API options
      objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: objBuf, delegate: 'GPU' },
        runningMode: 'VIDEO',
        scoreThreshold: OBJECT_SCORE_THRESHOLD,
        maxResults: 60,
        categoryAllowlist: ['person'],
      })

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: faceBuf, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: MAX_FACES,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
      })

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: poseBuf, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: MAX_POSES,
      })

      console.log('[VisionOverlay] MediaPipe v0.10.32 Engine Ready ✓')
      setIsReady(true)
    } catch (err) {
      console.error('[VisionOverlay] MediaPipe Init Error:', err)
    }
  }, [])

  /* ── Flush emotion samples to cloud analytics ── */
  const flushEmotions = useCallback(async () => {
    if (emotionBufferRef.current.length === 0) return
    const samples = [...emotionBufferRef.current]
    emotionBufferRef.current = []
    lastFlushRef.current = Date.now()

    try {
      const res = await fetch('/api/vision-tracker/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: samples.map(s => ({
            emotionType: s.emotionType,
            confidence: s.confidence,
          })),
          sessionId: cameraId,
          source: 'camera-overlay',
          deviceTimestamp: new Date().toISOString(),
        }),
      })
      if (res.ok && process.env.NODE_ENV === 'development') {
        console.log(`[VisionOverlay] Cloud Sync: ${samples.length} emotion samples ✓`)
      }
    } catch (e) {
      console.warn('[VisionOverlay] Emotion Sync Failed:', e)
      if (emotionBufferRef.current.length < 200) {
        emotionBufferRef.current.unshift(...samples)
      }
    }
  }, [cameraId])

  /* ── Main render loop ── */
  const startAnalysis = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 5-minute snapshot timer
    const snapshotTimer = setInterval(() => {
      if (isActiveRef.current && latestResultRef.current) {
        onSnapshot?.({ ...latestResultRef.current, timestamp: new Date().toISOString() })
      }
    }, 5 * 60 * 1000)

    const latestResultRef = { current: null as AnalysisResult | null }

    const render = () => {
      if (!isActiveRef.current || !video || video.paused || video.ended) {
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      const now = performance.now()

      // FPS tracking
      fpsRef.current.frames++
      if (Date.now() - fpsRef.current.lastTick > 1000) {
        fpsRef.current.current = fpsRef.current.frames
        fpsRef.current.frames = 0
        fpsRef.current.lastTick = Date.now()
      }

      // Canvas sizing
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const frameArea = canvas.width * canvas.height
      const minBboxArea = frameArea * MIN_BBOX_AREA_RATIO

      const drawingUtils = new DrawingUtils(ctx)
      const result: AnalysisResult = {
        peopleCount: 0,
        rawObjectCount: 0,
        faceCount: 0,
        emotions: [],
        emotionDistribution: {},
        dominantEmotion: null,
        avgConfidence: 0,
        actions: [],
        handRaiseCount: 0,
        attentionScore: 0,
        studentEmotions: [],
      }

      // ══════════════════════════════════════════
      // 1. OBJECT DETECTION — Population Census
      //    with NMS + min-area + temporal smoothing
      // ══════════════════════════════════════════
      let nmsBoxes: BBox[] = []
      if (objectDetectorRef.current && video.readyState >= 2) {
        try {
          const detections = objectDetectorRef.current.detectForVideo(video, now)

          // Collect raw boxes
          const rawBoxes: BBox[] = []
          for (const d of detections.detections) {
            if (!d.boundingBox) continue
            const cat = d.categories[0]
            if (!cat || cat.categoryName !== 'person') continue
            const { originX, originY, width, height } = d.boundingBox
            // Filter: minimum area
            if (width * height < minBboxArea) continue
            // Filter: reasonable aspect ratio for a person (not too wide/flat)
            const ar = height / (width || 1)
            if (ar < 0.4 || ar > 5) continue
            rawBoxes.push({ x: originX, y: originY, w: width, h: height, score: cat.score })
          }
          result.rawObjectCount = rawBoxes.length

          // NMS deduplication
          nmsBoxes = nonMaxSuppression(rawBoxes, NMS_IOU_THRESHOLD)

          // Draw surviving boxes
          nmsBoxes.forEach((box, idx) => {
            const { x, y, w, h, score } = box
            const alpha = Math.max(0.3, Math.min(1, score))

            // Dashed bounding box
            ctx.strokeStyle = `rgba(34, 197, 94, ${alpha * 0.6})`
            ctx.lineWidth = 1.5
            ctx.setLineDash([4, 4])
            ctx.strokeRect(x, y, w, h)
            ctx.setLineDash([])

            // Corner brackets
            const cornerLen = Math.min(w, h) * 0.15
            ctx.strokeStyle = `rgba(34, 197, 94, ${alpha})`
            ctx.lineWidth = 2.5
            // Top-left
            ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke()
            // Top-right
            ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke()
            // Bottom-left
            ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke()
            // Bottom-right
            ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke()

            // Label — use student name if available
            const sLabel = studentNamesRef.current && studentNamesRef.current.length > 0
              ? studentNamesRef.current[idx % studentNamesRef.current.length]
              : `S${(idx + 1).toString().padStart(2, '0')}`
            const labelText = `${sLabel} ${Math.round(score * 100)}%`
            ctx.font = '900 10px "IBM Plex Mono", monospace'
            const tm = ctx.measureText(labelText)

            // Label background
            ctx.fillStyle = `rgba(0, 0, 0, 0.55)`
            ctx.fillRect(x, y > 18 ? y - 16 : y, tm.width + 6, 14)

            ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`
            ctx.textAlign = 'left'
            ctx.fillText(labelText, x + 3, y > 18 ? y - 4 : y + 11)
          })
        } catch (e) { /* skip frame on error */ }
      }

      // ══════════════════════════════════════════
      // 2. FACE LANDMARKS — Biometrics & Emotion
      // ══════════════════════════════════════════
      let totalConfidence = 0
      let emotionCount = 0

      if (faceLandmarkerRef.current && video.readyState >= 2) {
        try {
          const faceResults = faceLandmarkerRef.current.detectForVideo(video, now)
          if (faceResults.faceLandmarks) {
            result.faceCount = faceResults.faceLandmarks.length

            faceResults.faceLandmarks.forEach((landmarks, idx) => {
              // Draw tessellation with subtle glass effect
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#C0C0C025', lineWidth: 0.5 })
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: '#3b82f630', lineWidth: 1.5 })

              if (faceResults.faceBlendshapes?.[idx]) {
                const emotion = emotionDetectorRef.current.detectEmotion(faceResults.faceBlendshapes[idx].categories)
                if (emotion) {
                  const type = emotion.type as EmotionType
                  result.emotions.push(type)
                  result.emotionDistribution[type] = (result.emotionDistribution[type] || 0) + 1
                  totalConfidence += emotion.confidence
                  emotionCount++

                  // Map student name to emotion
                  const names = studentNamesRef.current
                  const studentName = names && names.length > 0
                    ? names[idx % names.length]
                    : `Student ${(idx + 1).toString().padStart(2, '0')}`
                  result.studentEmotions.push({ name: studentName, emotion: type, confidence: emotion.confidence })

                  // Periodic sampling for cloud analytics (deterministic interval)
                  const nowMs = Date.now()
                  if (nowMs - lastSampleRef.current > EMOTION_SAMPLE_INTERVAL_MS) {
                    lastSampleRef.current = nowMs
                    emotionBufferRef.current.push({
                      emotionType: type,
                      confidence: emotion.confidence,
                      timestamp: nowMs,
                    })
                  }

                  // Emotion + student name overlay
                  const config = EMOTION_CONFIG[type]
                  if (config && landmarks[10]) {
                    const topLandmark = landmarks[10]
                    const lx = topLandmark.x * canvas.width
                    const ly = topLandmark.y * canvas.height - 14

                    // Determine student name for this face index
                    const nameList = studentNamesRef.current
                    const sName = nameList && nameList.length > 0
                      ? nameList[idx % nameList.length]
                      : null

                    // Build label lines
                    const emotionLabel = `${config.emoji} ${config.labelVi}`
                    const nameLabel = sName || `Student ${(idx + 1).toString().padStart(2, '0')}`

                    // Measure widths
                    ctx.font = 'bold 13px sans-serif'
                    const emotionW = ctx.measureText(emotionLabel).width
                    ctx.font = 'bold 11px sans-serif'
                    const nameW = ctx.measureText(nameLabel).width
                    const boxW = Math.max(emotionW, nameW) + 16
                    const boxH = sName ? 38 : 22
                    const boxY = ly - boxH + 2

                    // Glass label background
                    ctx.save()
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
                    ctx.beginPath()
                    ctx.roundRect(lx - boxW / 2, boxY, boxW, boxH, 6)
                    ctx.fill()
                    ctx.strokeStyle = `${config.color}50`
                    ctx.lineWidth = 1
                    ctx.stroke()
                    ctx.restore()

                    // Student name (top line)
                    ctx.textAlign = 'center'
                    if (sName) {
                      ctx.fillStyle = 'hsl(var(--foreground) / 0.95)'
                      ctx.font = 'bold 11px sans-serif'
                      ctx.fillText(nameLabel, lx, boxY + 14)
                    }

                    // Emotion (bottom line or only line)
                    ctx.fillStyle = config.color
                    ctx.font = 'bold 13px sans-serif'
                    ctx.fillText(emotionLabel, lx, sName ? boxY + 31 : ly)
                    ctx.textAlign = 'left'
                  }
                }
              }
            })
          }
        } catch (e) { /* skip frame */ }
      }

      // Compute dominant emotion & avg confidence
      if (emotionCount > 0) {
        result.avgConfidence = totalConfidence / emotionCount
        const sorted = Object.entries(result.emotionDistribution).sort((a, b) => b[1] - a[1])
        result.dominantEmotion = sorted[0]?.[0] as EmotionType ?? null
      }

      // ══════════════════════════════════════════
      // 3. PEOPLE COUNT — Multi-signal Fusion
      //
      // Object detector can miss faces (far away) or
      // double-count (overlaps). Face detector is more
      // precise per-face but misses people facing away.
      // We fuse: count = max(objNMS, face) weighted.
      // ══════════════════════════════════════════
      const objCount = nmsBoxes.length
      const faceCount = result.faceCount

      // Fused raw count: take the higher of the two signals,
      // but if face count is significantly higher, trust it more
      let fusedRaw: number
      if (faceCount > objCount) {
        // Faces found more people (small/distant figures object detector missed)
        fusedRaw = faceCount
      } else {
        // Object detector found more people (people facing away, no face visible)
        // Blend: mostly objCount but adjust towards faceCount
        fusedRaw = Math.round(objCount * (1 - FACE_FUSION_WEIGHT) + faceCount * FACE_FUSION_WEIGHT)
        // Never go below face count (we know at least that many people exist)
        fusedRaw = Math.max(fusedRaw, faceCount)
      }

      // Temporal smoothing (median filter over N frames)
      result.peopleCount = countSmootherRef.current.push(fusedRaw)

      // ══════════════════════════════════════════
      // 4. POSE LANDMARKS — Activity Detection
      // ══════════════════════════════════════════
      if (poseLandmarkerRef.current && video.readyState >= 2) {
        try {
          const poseResults = poseLandmarkerRef.current.detectForVideo(video, now)
          if (poseResults.landmarks) {
            poseResults.landmarks.forEach((landmarks) => {
              // Draw skeleton with subtle glow
              drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#3b82f630', lineWidth: 1.5 })

              const nose = landmarks[0]
              const leftWrist = landmarks[15]
              const rightWrist = landmarks[16]
              const leftShoulder = landmarks[11]
              const rightShoulder = landmarks[12]

              // Hand-raise detection (improved algorithm with shoulder reference)
              const shoulderY = (leftShoulder.y + rightShoulder.y) / 2
              const leftRaised = leftWrist.y < shoulderY - HAND_RAISE_THRESHOLD
              const rightRaised = rightWrist.y < shoulderY - HAND_RAISE_THRESHOLD

              if (leftRaised || rightRaised) {
                result.actions.push('GIƠ TAY')
                result.handRaiseCount++

                const handX = leftRaised ? leftWrist.x : rightWrist.x
                const handY = Math.min(leftWrist.y, rightWrist.y)

                // Animated hand-raise indicator
                ctx.save()
                const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.1
                ctx.fillStyle = '#f59e0b'
                ctx.font = `bold ${Math.round(16 * pulseScale)}px sans-serif`
                ctx.textAlign = 'center'
                ctx.shadowBlur = 10
                ctx.shadowColor = 'rgba(245, 158, 11, 0.5)'
                ctx.fillText('✋ PHÁT BIỂU', handX * canvas.width, handY * canvas.height - 25)
                ctx.restore()
              }

              // Attention scoring: head orientation (nose vs shoulders midpoint)
              const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
              const headOffset = Math.abs(nose.x - shoulderMidX)
              const attentionForPose = Math.max(0, 1 - headOffset * 5)
              result.attentionScore += attentionForPose
            })

            // Average attention score
            if (poseResults.landmarks.length > 0) {
              result.attentionScore = result.attentionScore / poseResults.landmarks.length
            }
          }
        } catch (e) { /* skip frame */ }
      }

      // ── Periodic flush to analytics API ──
      if (Date.now() - lastFlushRef.current > EMOTION_FLUSH_INTERVAL_MS) {
        flushEmotions()
      }

      // Notify parent
      if (onAnalysisUpdate) onAnalysisUpdate(result)
      latestResultRef.current = result

      // ══════════════════════════════════════════
      // HUD — Neural Vision Engine v3.1
      // ══════════════════════════════════════════
      renderHUD(ctx, result, fpsRef.current.current)

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()
    return () => { clearInterval(snapshotTimer) }
  }, [videoRef, onAnalysisUpdate, onSnapshot, flushEmotions])

  /* ── Lifecycle ── */
  useEffect(() => {
    if (isActive) {
      initMediaPipe().then(() => {
        startAnalysis()
      })
    } else {
      stopAnalysis()
      flushEmotions()
    }
    return () => {
      stopAnalysis()
      flushEmotions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full object-cover" />
}

/* ───────────────────────────────────────────────
 * HUD Renderer — Neural Vision Engine v3.1
 * ─────────────────────────────────────────────── */
function renderHUD(ctx: CanvasRenderingContext2D, result: AnalysisResult, fps: number) {
  const pw = 270, ph = 125, r = 12
  const x0 = 15, y0 = 15

  ctx.save()

  // Glass panel background
  ctx.shadowBlur = 20
  ctx.shadowColor = 'rgba(59, 130, 246, 0.3)'
  ctx.fillStyle = 'rgba(5, 5, 15, 0.88)'
  ctx.beginPath()
  ctx.roundRect(x0, y0, pw, ph, r)
  ctx.fill()

  // Border glow
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Scanline effect
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(59, 130, 246, 0.03)'
  for (let i = 0; i < ph; i += 3) ctx.fillRect(x0, y0 + i, pw, 1)

  const lx = x0 + 10

  // Header
  ctx.fillStyle = '#fff'
  ctx.font = '900 8px "IBM Plex Mono", monospace'
  ctx.textAlign = 'left'
  ctx.fillText('NEURAL_VISION_ENGINE_V3.1', lx, y0 + 15)

  // FPS + Status dot
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '8px "IBM Plex Mono", monospace'
  ctx.fillText(`${fps} FPS`, x0 + pw - 55, y0 + 15)

  const pulse = 0.5 + Math.sin(Date.now() / 300) * 0.5
  ctx.fillStyle = `rgba(34, 197, 94, ${0.5 + pulse * 0.5})`
  ctx.beginPath()
  ctx.arc(x0 + pw - 15, y0 + 13, 3, 0, Math.PI * 2)
  ctx.fill()

  // Census — now shows smoothed + raw counts
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText(`CENSUS: ${result.peopleCount.toString().padStart(2, '0')} STUDENTS`, lx, y0 + 33)
  // Sub-detail: raw signals
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.font = '8px "IBM Plex Mono", monospace'
  ctx.fillText(`OBJ:${result.rawObjectCount} FACE:${result.faceCount} NMS→FUSED→SMOOTH`, lx, y0 + 43)

  // Dominant Emotion
  if (result.dominantEmotion) {
    const config = EMOTION_CONFIG[result.dominantEmotion]
    if (config) {
      ctx.fillStyle = config.color
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`SENTIMENT: ${config.emoji} ${config.labelVi.toUpperCase()}`, lx, y0 + 58)
    }
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText('SCANNING BIOMETRICS...', lx, y0 + 58)
  }

  // Hand-raise
  if (result.handRaiseCount > 0) {
    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText(`✋ RAISED: ${result.handRaiseCount}`, lx, y0 + 73)
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.font = '10px sans-serif'
    ctx.fillText('ACTIVITY: STABLE', lx, y0 + 73)
  }

  // Attention bar
  const barX = lx, barY = y0 + 83, barW = pw - 20, barH = 3
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.fillRect(barX, barY, barW, barH)

  const attPct = Math.min(1, result.attentionScore)
  const attColor = attPct > 0.7 ? '#22c55e' : attPct > 0.4 ? '#f59e0b' : '#ef4444'
  ctx.fillStyle = attColor
  ctx.fillRect(barX, barY, barW * attPct, barH)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.font = '8px "IBM Plex Mono", monospace'
  ctx.fillText(`ATTENTION: ${Math.round(attPct * 100)}%`, barX, barY + 14)

  // Sync progress bar
  const syncY = y0 + ph - 8
  const syncProg = (Date.now() % EMOTION_FLUSH_INTERVAL_MS) / EMOTION_FLUSH_INTERVAL_MS
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.fillRect(barX, syncY, barW, 2)
  ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'
  ctx.fillRect(barX, syncY, barW * syncProg, 2)

  ctx.restore()
}
