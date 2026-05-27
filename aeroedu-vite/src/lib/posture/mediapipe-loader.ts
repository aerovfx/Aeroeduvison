/**
 * MediaPipe Tasks Vision lazy loader
 *
 * Models tải từ Google CDN (~6 MB total cho pose lite + face landmarker).
 * Cache trong memory để các hook con sau khởi tạo nhanh.
 *
 * Tại sao lazy?
 *   - SDK 4 MB + models 6 MB = 10 MB không nên ship trong main bundle
 *   - User mặc định KHÔNG bật theo dõi — chỉ load khi click "Bật theo dõi"
 *   - Dynamic import() ⇒ Vite tự động code-split thành chunk riêng
 *
 * GPU delegate fallback to CPU nếu thiết bị không hỗ trợ WebGL2.
 */
import type {
  PoseLandmarker,
  FaceLandmarker,
} from '@mediapipe/tasks-vision'

// Model URLs from Google Storage. Lite = ~3 MB, Full = ~9 MB.
// Lite đủ chính xác cho tracking thô (posture/emotion).
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'

interface LoadedModels {
  pose: PoseLandmarker | null
  face: FaceLandmarker | null
  /** GPU = WebGL2 inference, CPU = WASM SIMD fallback */
  delegate: 'GPU' | 'CPU'
}

let modelsCache: LoadedModels | null = null
let loadingPromise: Promise<LoadedModels> | null = null

/**
 * Load (or return cached) MediaPipe models. Idempotent — second call returns
 * the in-flight promise to avoid double-init.
 *
 * @param onProgress optional callback ('init' | 'fileset' | 'pose' | 'face' | 'ready')
 */
export async function loadMediaPipe(
  onProgress?: (stage: string) => void,
): Promise<LoadedModels> {
  if (modelsCache) return modelsCache
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    onProgress?.('init')
    // Dynamic import — Vite code-splits this into its own chunk
    const { FilesetResolver, PoseLandmarker, FaceLandmarker } = await import(
      '@mediapipe/tasks-vision'
    )

    onProgress?.('fileset')
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL)

    // Try GPU first; if fails, retry CPU.
    let delegate: 'GPU' | 'CPU' = 'GPU'
    let pose: PoseLandmarker | null = null
    let face: FaceLandmarker | null = null

    onProgress?.('pose')
    try {
      pose = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputSegmentationMasks: false,
      })
    } catch (gpuErr) {
      console.warn('[mediapipe] Pose GPU init fail, fallback CPU:', gpuErr)
      delegate = 'CPU'
      pose = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    }

    onProgress?.('face')
    try {
      face = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: delegate },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    } catch (faceErr) {
      console.warn('[mediapipe] Face init fail (delegate=', delegate, '):', faceErr)
      face = null
    }

    onProgress?.('ready')
    modelsCache = { pose, face, delegate }
    return modelsCache
  })()

  return loadingPromise
}

/**
 * Cleanup — call when user disables monitoring permanently to free WebGL ctx + WASM memory.
 * Note: cached models stay loaded for fast re-enable. Only call this on app shutdown.
 */
export function disposeMediaPipe() {
  if (modelsCache) {
    modelsCache.pose?.close()
    modelsCache.face?.close()
    modelsCache = null
  }
  loadingPromise = null
}
