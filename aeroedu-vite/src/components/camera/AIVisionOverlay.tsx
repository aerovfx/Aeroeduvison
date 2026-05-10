import '@/lib/mediapipe-console-filter'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  FilesetResolver,
  ObjectDetector,
  FaceLandmarker,
  PoseLandmarker,
  DrawingUtils,
} from '@mediapipe/tasks-vision'
import {
  AdvancedEmotionDetector,
  EMOTION_CONFIG,
  EmotionType
} from '@/lib/advanced-emotion-recognition'

/* ───────────────────────────────────────────────
 * Constants
 * ─────────────────────────────────────────────── */
const WASM_BASE_PATH = '/mediapipe-wasm/wasm'
const MODEL_PATHS = {
  objectDetector: '/models/efficientdet_lite0.tflite',
  faceLandmarker: '/models/face_landmarker.task',
  poseLandmarker: '/models/pose_landmarker.task',
} as const

const EMOTION_SAMPLE_INTERVAL_MS = 3000
const EMOTION_FLUSH_INTERVAL_MS  = 30_000
const MAX_FACES                  = 12
const MAX_POSES                  = 12
const OBJECT_SCORE_THRESHOLD     = 0.40
const HAND_RAISE_THRESHOLD       = 0.12
const NMS_IOU_THRESHOLD          = 0.45
const MIN_BBOX_AREA_RATIO        = 0.003
const COUNT_SMOOTHING_WINDOW     = 15
const FACE_FUSION_WEIGHT         = 0.35

interface AIVisionOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isActive: boolean
  cameraId: string
  studentNames?: string[]
  /** Student class name, e.g. "Lớp 11A2" */
  className?: string
  onAnalysisUpdate?: (data: AnalysisResult) => void
  onSnapshot?: (data: AnalysisResult & { timestamp: string }) => void
}

export interface AnalysisResult {
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
  studentEmotions: Array<{ name: string; emotion: EmotionType; confidence: number }>
  timestamp?: string
}

interface BBox { x: number; y: number; w: number; h: number; score: number }

/* ── NMS ── */
function computeIoU(a: BBox, b: BBox): number {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a.w * a.h + b.w * b.h - inter
  return union > 0 ? inter / union : 0
}

function nonMaxSuppression(boxes: BBox[], iouThreshold: number): BBox[] {
  if (boxes.length === 0) return []
  const sorted = [...boxes].sort((a, b) => b.score - a.score)
  const keep: BBox[] = []
  const suppressed = new Set<number>()
  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue
    keep.push(sorted[i])
    for (let j = i + 1; j < sorted.length; j++) {
      if (!suppressed.has(j) && computeIoU(sorted[i], sorted[j]) > iouThreshold)
        suppressed.add(j)
    }
  }
  return keep
}

/* ── Temporal Smoothing ── */
class CountSmoother {
  private window: number[] = []
  constructor(private size: number) {}
  push(count: number): number {
    this.window.push(count)
    if (this.window.length > this.size) this.window.shift()
    const sorted = [...this.window].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid]
  }
  reset() { this.window = [] }
}

/* ── Model fetcher ── */
async function fetchModelBuffer(path: string): Promise<Uint8Array> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Failed to fetch model ${path}: ${response.status}`)
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('text/html'))
    throw new Error(`Model ${path} returned HTML — check file exists`)
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength < 1024)
    throw new Error(`Model ${path} too small (${buffer.byteLength} bytes)`)
  return new Uint8Array(buffer)
}

/* ── Component ── */
export const AIVisionOverlay = ({
  videoRef, isActive, cameraId, studentNames, className, onAnalysisUpdate, onSnapshot
}: AIVisionOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isReady, setIsReady] = useState(false)

  const objectDetectorRef  = useRef<ObjectDetector | null>(null)
  const faceLandmarkerRef  = useRef<FaceLandmarker  | null>(null)
  const poseLandmarkerRef  = useRef<PoseLandmarker  | null>(null)
  const emotionDetectorRef = useRef<AdvancedEmotionDetector>(new AdvancedEmotionDetector())

  const animationFrameRef  = useRef<number>(0)
  const isActiveRef        = useRef(isActive)
  const countSmootherRef   = useRef<CountSmoother>(new CountSmoother(COUNT_SMOOTHING_WINDOW))

  const emotionBufferRef = useRef<Array<{ emotionType: string; confidence: number; timestamp: number }>>([])
  const lastSampleRef    = useRef<number>(0)
  const lastFlushRef     = useRef<number>(Date.now())
  const fpsRef           = useRef<{ frames: number; lastTick: number; current: number }>({ frames: 0, lastTick: Date.now(), current: 0 })

  const studentNamesRef = useRef(studentNames)
  useEffect(() => { isActiveRef.current = isActive },      [isActive])
  useEffect(() => { studentNamesRef.current = studentNames }, [studentNames])

  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }
    countSmootherRef.current.reset()
    setIsReady(false)
  }, [])

  const initMediaPipe = useCallback(async () => {
    try {
      console.log('[VisionOverlay] Initializing MediaPipe v0.10.32 Engine...')
      const wasmBase = `${window.location.origin}${WASM_BASE_PATH}`
      const vision   = await FilesetResolver.forVisionTasks(wasmBase)

      console.log('[VisionOverlay] Downloading AI models...')
      const [objBuf, faceBuf, poseBuf] = await Promise.all([
        fetchModelBuffer(MODEL_PATHS.objectDetector),
        fetchModelBuffer(MODEL_PATHS.faceLandmarker),
        fetchModelBuffer(MODEL_PATHS.poseLandmarker),
      ])
      console.log(`[VisionOverlay] Models loaded: OD=${(objBuf.length/1e6).toFixed(1)}MB FL=${(faceBuf.length/1e6).toFixed(1)}MB PL=${(poseBuf.length/1e6).toFixed(1)}MB`)

      objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: objBuf, delegate: 'GPU' },
        runningMode: 'VIDEO', scoreThreshold: OBJECT_SCORE_THRESHOLD,
        maxResults: 60, categoryAllowlist: ['person'],
      })

      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: faceBuf, delegate: 'GPU' },
        runningMode: 'VIDEO', numFaces: MAX_FACES,
        outputFaceBlendshapes: true, outputFacialTransformationMatrixes: false,
      })

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetBuffer: poseBuf, delegate: 'GPU' },
        runningMode: 'VIDEO', numPoses: MAX_POSES,
      })

      console.log('[VisionOverlay] MediaPipe v0.10.32 Engine Ready ✓')
      setIsReady(true)
    } catch (err) {
      console.error('[VisionOverlay] MediaPipe Init Error:', err)
    }
  }, [])

  const flushEmotions = useCallback(async () => {
    if (emotionBufferRef.current.length === 0) return
    const samples = [...emotionBufferRef.current]
    emotionBufferRef.current = []
    lastFlushRef.current = Date.now()
    try {
      const res = await fetch('/api/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: samples.map(s => ({ emotionType: s.emotionType, confidence: s.confidence })),
          sessionId: cameraId, source: 'camera-overlay',
          deviceTimestamp: new Date().toISOString(),
        }),
      })
      if (res.ok && import.meta.env.DEV)
        console.log(`[VisionOverlay] Cloud Sync: ${samples.length} emotion samples ✓`)
    } catch (e) {
      console.warn('[VisionOverlay] Emotion Sync Failed:', e)
      if (emotionBufferRef.current.length < 200) emotionBufferRef.current.unshift(...samples)
    }
  }, [cameraId])

  const startAnalysis = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    if (!ctx) return

    const snapshotTimer = setInterval(() => {
      if (isActiveRef.current && latestResultRef.current)
        onSnapshot?.({ ...latestResultRef.current, timestamp: new Date().toISOString() })
    }, 5 * 60 * 1000)

    const latestResultRef = { current: null as AnalysisResult | null }

    const render = () => {
      if (!isActiveRef.current || !video || video.paused || video.ended) {
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      const now = performance.now()

      fpsRef.current.frames++
      if (Date.now() - fpsRef.current.lastTick > 1000) {
        fpsRef.current.current = fpsRef.current.frames
        fpsRef.current.frames  = 0
        fpsRef.current.lastTick = Date.now()
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const frameArea   = canvas.width * canvas.height
      const minBboxArea = frameArea * MIN_BBOX_AREA_RATIO
      const drawingUtils = new DrawingUtils(ctx)

      const result: AnalysisResult = {
        peopleCount: 0, rawObjectCount: 0, faceCount: 0,
        emotions: [], emotionDistribution: {}, dominantEmotion: null,
        avgConfidence: 0, actions: [], handRaiseCount: 0, attentionScore: 0,
        studentEmotions: [],
      }

      // ── 1. OBJECT DETECTION ──
      let nmsBoxes: BBox[] = []
      if (objectDetectorRef.current && video.readyState >= 2) {
        try {
          const detections = objectDetectorRef.current.detectForVideo(video, now)
          const rawBoxes: BBox[] = []
          for (const d of detections.detections) {
            if (!d.boundingBox) continue
            const cat = d.categories[0]
            if (!cat || cat.categoryName !== 'person') continue
            const { originX, originY, width, height } = d.boundingBox
            if (width * height < minBboxArea) continue
            const ar = height / (width || 1)
            if (ar < 0.4 || ar > 5) continue
            rawBoxes.push({ x: originX, y: originY, w: width, h: height, score: cat.score })
          }
          result.rawObjectCount = rawBoxes.length
          nmsBoxes = nonMaxSuppression(rawBoxes, NMS_IOU_THRESHOLD)

          nmsBoxes.forEach((box, idx) => {
            const { x, y, w, h, score } = box
            const alpha = Math.max(0.3, Math.min(1, score))
            ctx.strokeStyle = `rgba(34,197,94,${alpha * 0.6})`
            ctx.lineWidth = 1.5; ctx.setLineDash([4, 4])
            ctx.strokeRect(x, y, w, h); ctx.setLineDash([])
            const cl = Math.min(w, h) * 0.15
            ctx.strokeStyle = `rgba(34,197,94,${alpha})`; ctx.lineWidth = 2.5
            ctx.beginPath(); ctx.moveTo(x, y+cl); ctx.lineTo(x, y); ctx.lineTo(x+cl, y); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(x+w-cl, y); ctx.lineTo(x+w, y); ctx.lineTo(x+w, y+cl); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(x, y+h-cl); ctx.lineTo(x, y+h); ctx.lineTo(x+cl, y+h); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(x+w-cl, y+h); ctx.lineTo(x+w, y+h); ctx.lineTo(x+w, y+h-cl); ctx.stroke()
            const sLabel  = studentNamesRef.current?.length ? studentNamesRef.current[idx % studentNamesRef.current.length] : `S${(idx+1).toString().padStart(2,'0')}`
            const labelText = `${sLabel} ${Math.round(score*100)}%`
            ctx.font = '900 10px "IBM Plex Mono",monospace'
            const tm = ctx.measureText(labelText)
            ctx.fillStyle = 'rgba(0,0,0,0.55)'
            ctx.fillRect(x, y > 18 ? y-16 : y, tm.width+6, 14)
            ctx.fillStyle = `rgba(34,197,94,${alpha})`; ctx.textAlign = 'left'
            ctx.fillText(labelText, x+3, y > 18 ? y-4 : y+11)
          })
        } catch { /* skip frame */ }
      }

      // ── 2. FACE LANDMARKS ──
      let totalConfidence = 0, emotionCount = 0
      if (faceLandmarkerRef.current && video.readyState >= 2) {
        try {
          const faceResults = faceLandmarkerRef.current.detectForVideo(video, now)
          if (faceResults.faceLandmarks) {
            result.faceCount = faceResults.faceLandmarks.length
            faceResults.faceLandmarks.forEach((landmarks, idx) => {
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#C0C0C025', lineWidth: 0.5 })
              drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,  { color: '#3b82f630', lineWidth: 1.5 })
              if (faceResults.faceBlendshapes?.[idx]) {
                const emotion = emotionDetectorRef.current.detectEmotion(faceResults.faceBlendshapes[idx].categories)
                if (emotion) {
                  const type = emotion.type as EmotionType
                  result.emotions.push(type)
                  result.emotionDistribution[type] = (result.emotionDistribution[type] || 0) + 1
                  totalConfidence += emotion.confidence; emotionCount++
                  const names = studentNamesRef.current
                  const studentName = names?.length ? names[idx % names.length] : `Student ${(idx+1).toString().padStart(2,'0')}`
                  result.studentEmotions.push({ name: studentName, emotion: type, confidence: emotion.confidence })
                  const nowMs = Date.now()
                  if (nowMs - lastSampleRef.current > EMOTION_SAMPLE_INTERVAL_MS) {
                    lastSampleRef.current = nowMs
                    emotionBufferRef.current.push({ emotionType: type, confidence: emotion.confidence, timestamp: nowMs })
                  }
                  const config = EMOTION_CONFIG[type]
                  if (config && landmarks[10]) {
                    const lx = landmarks[10].x * canvas.width
                    const ly = landmarks[10].y * canvas.height - 14
                    const sName = names?.length ? names[idx % names.length] : null
                    const emotionLabel = `${config.emoji} ${config.labelVi}`
                    const nameLabel    = sName || `Student ${(idx+1).toString().padStart(2,'0')}`
                    ctx.font = 'bold 13px sans-serif'; const emotionW = ctx.measureText(emotionLabel).width
                    ctx.font = 'bold 11px sans-serif'; const nameW    = ctx.measureText(nameLabel).width
                    const boxW = Math.max(emotionW, nameW) + 16
                    const boxH = sName ? 38 : 22
                    const boxY = ly - boxH + 2
                    ctx.save()
                    ctx.fillStyle = 'rgba(0,0,0,0.65)'
                    ctx.beginPath(); ctx.roundRect(lx - boxW/2, boxY, boxW, boxH, 6); ctx.fill()
                    ctx.strokeStyle = `${config.color}50`; ctx.lineWidth = 1; ctx.stroke()
                    ctx.restore()
                    ctx.textAlign = 'center'
                    if (sName) {
                      ctx.fillStyle = 'rgba(241,245,249,0.95)'
                      ctx.font = 'bold 11px sans-serif'
                      ctx.fillText(nameLabel, lx, boxY + 14)
                    }
                    ctx.fillStyle = config.color; ctx.font = 'bold 13px sans-serif'
                    ctx.fillText(emotionLabel, lx, sName ? boxY+31 : ly)
                    ctx.textAlign = 'left'
                  }
                }
              }
            })
          }
        } catch { /* skip frame */ }
      }

      if (emotionCount > 0) {
        result.avgConfidence   = totalConfidence / emotionCount
        const sorted = Object.entries(result.emotionDistribution).sort((a, b) => b[1] - a[1])
        result.dominantEmotion = (sorted[0]?.[0] as EmotionType) ?? null
      }

      // ── 3. PEOPLE COUNT — Multi-signal fusion ──
      const fusedRaw = result.faceCount > nmsBoxes.length
        ? result.faceCount
        : Math.max(
            Math.round(nmsBoxes.length * (1-FACE_FUSION_WEIGHT) + result.faceCount * FACE_FUSION_WEIGHT),
            result.faceCount
          )
      result.peopleCount = countSmootherRef.current.push(fusedRaw)

      // ── 4. POSE LANDMARKS ──
      if (poseLandmarkerRef.current && video.readyState >= 2) {
        try {
          const poseResults = poseLandmarkerRef.current.detectForVideo(video, now)
          if (poseResults.landmarks) {
            poseResults.landmarks.forEach((landmarks) => {
              drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#3b82f630', lineWidth: 1.5 })
              const nose = landmarks[0], leftWrist = landmarks[15], rightWrist = landmarks[16]
              const leftShoulder = landmarks[11], rightShoulder = landmarks[12]
              const shoulderY    = (leftShoulder.y + rightShoulder.y) / 2
              const leftRaised   = leftWrist.y  < shoulderY - HAND_RAISE_THRESHOLD
              const rightRaised  = rightWrist.y < shoulderY - HAND_RAISE_THRESHOLD
              if (leftRaised || rightRaised) {
                result.actions.push('GIƠ TAY'); result.handRaiseCount++
                const handX = leftRaised ? leftWrist.x : rightWrist.x
                const handY = Math.min(leftWrist.y, rightWrist.y)
                ctx.save()
                const pulseScale = 1 + Math.sin(Date.now()/200) * 0.1
                ctx.fillStyle = '#f59e0b'; ctx.font = `bold ${Math.round(16*pulseScale)}px sans-serif`
                ctx.textAlign = 'center'; ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(245,158,11,0.5)'
                ctx.fillText('✋ PHÁT BIỂU', handX * canvas.width, handY * canvas.height - 25)
                ctx.restore()
              }
              const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2
              result.attentionScore += Math.max(0, 1 - Math.abs(nose.x - shoulderMidX) * 5)
            })
            if (poseResults.landmarks.length > 0)
              result.attentionScore /= poseResults.landmarks.length
          }
        } catch { /* skip frame */ }
      }

      if (Date.now() - lastFlushRef.current > EMOTION_FLUSH_INTERVAL_MS) flushEmotions()

      if (onAnalysisUpdate) onAnalysisUpdate(result)
      latestResultRef.current = result
      renderHUD(ctx, result, fpsRef.current.current)
      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()
    return () => { clearInterval(snapshotTimer) }
  }, [videoRef, onAnalysisUpdate, onSnapshot, flushEmotions])

  useEffect(() => {
    if (isActive) {
      initMediaPipe().then(() => { startAnalysis() })
    } else {
      stopAnalysis(); flushEmotions()
    }
    return () => { stopAnalysis(); flushEmotions() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

/* ── HUD Renderer ── */
function renderHUD(ctx: CanvasRenderingContext2D, result: AnalysisResult, fps: number) {
  const pw = 270, ph = 125, r = 12, x0 = 15, y0 = 15
  ctx.save()
  ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(59,130,246,0.3)'
  ctx.fillStyle = 'rgba(5,5,15,0.88)'
  ctx.beginPath(); ctx.roundRect(x0, y0, pw, ph, r); ctx.fill()
  ctx.strokeStyle = 'rgba(59,130,246,0.35)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(59,130,246,0.03)'
  for (let i = 0; i < ph; i += 3) ctx.fillRect(x0, y0+i, pw, 1)
  const lx = x0 + 10
  ctx.fillStyle = '#fff'; ctx.font = '900 8px "IBM Plex Mono",monospace'; ctx.textAlign = 'left'
  ctx.fillText('NEURAL_VISION_ENGINE_V3.1', lx, y0+15)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px "IBM Plex Mono",monospace'
  ctx.fillText(`${fps} FPS`, x0+pw-55, y0+15)
  const pulse = 0.5 + Math.sin(Date.now()/300) * 0.5
  ctx.fillStyle = `rgba(34,197,94,${0.5+pulse*0.5})`
  ctx.beginPath(); ctx.arc(x0+pw-15, y0+13, 3, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 11px sans-serif'
  ctx.fillText(`CENSUS: ${result.peopleCount.toString().padStart(2,'0')} STUDENTS`, lx, y0+33)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px "IBM Plex Mono",monospace'
  ctx.fillText(`OBJ:${result.rawObjectCount} FACE:${result.faceCount} NMS→FUSED→SMOOTH`, lx, y0+43)
  if (result.dominantEmotion) {
    const config = EMOTION_CONFIG[result.dominantEmotion]
    if (config) {
      ctx.fillStyle = config.color; ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`SENTIMENT: ${config.emoji} ${config.labelVi.toUpperCase()}`, lx, y0+58)
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = 'bold 11px sans-serif'
    ctx.fillText('SCANNING BIOMETRICS...', lx, y0+58)
  }
  if (result.handRaiseCount > 0) {
    ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 11px sans-serif'
    ctx.fillText(`✋ RAISED: ${result.handRaiseCount}`, lx, y0+73)
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '10px sans-serif'
    ctx.fillText('ACTIVITY: STABLE', lx, y0+73)
  }
  const barX = lx, barY = y0+83, barW = pw-20, barH = 3
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(barX, barY, barW, barH)
  const attPct   = Math.min(1, result.attentionScore)
  const attColor = attPct > 0.7 ? '#22c55e' : attPct > 0.4 ? '#f59e0b' : '#ef4444'
  ctx.fillStyle  = attColor; ctx.fillRect(barX, barY, barW*attPct, barH)
  ctx.fillStyle  = 'rgba(255,255,255,0.35)'; ctx.font = '8px "IBM Plex Mono",monospace'
  ctx.fillText(`ATTENTION: ${Math.round(attPct*100)}%`, barX, barY+14)
  const syncY    = y0+ph-8
  const syncProg = (Date.now() % EMOTION_FLUSH_INTERVAL_MS) / EMOTION_FLUSH_INTERVAL_MS
  ctx.fillStyle  = 'rgba(255,255,255,0.04)'; ctx.fillRect(barX, syncY, barW, 2)
  ctx.fillStyle  = 'rgba(59,130,246,0.5)';  ctx.fillRect(barX, syncY, barW*syncProg, 2)
  ctx.restore()
}
