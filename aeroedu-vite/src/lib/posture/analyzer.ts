/**
 * Posture + Expression analyzer — MediaPipe Tasks Vision
 *
 * Phân tích pose landmarks + face blendshapes → kết luận:
 *   - Tư thế học tập (đúng/cúi/nghiêng/lệch vai/xa rời)
 *   - Biểu cảm (tập trung/vui vẻ/bối rối/mệt mỏi/buồn ngủ)
 *   - Engagement score 0-100 (tổng hợp)
 *
 * Design notes:
 *   - PURE FUNCTIONS — không state, không DOM access → dễ test + chạy trong Worker
 *   - INPUT: PoseLandmarkerResult + FaceLandmarkerResult (từ MediaPipe Tasks)
 *   - OUTPUT: PostureAnalysis object để FE render
 *
 * Reference:
 *   - MediaPipe pose 33 landmarks: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 *   - Face blendshapes 52 categories: ARKit-compatible
 */

// ─── Types ──────────────────────────────────────────────────────

export type PostureState =
  | 'good'        // tư thế tốt
  | 'leaning'     // cúi quá thấp về phía trước
  | 'tilted'      // nghiêng đầu
  | 'asymmetric'  // lệch vai
  | 'far'         // ngồi quá xa
  | 'close'       // ngồi quá gần
  | 'absent'      // không thấy người
  | 'turned'      // quay đi

export type EmotionState =
  | 'focused'     // tập trung (neutral, eyes on screen)
  | 'happy'       // vui vẻ
  | 'confused'    // bối rối
  | 'tired'       // mệt mỏi
  | 'drowsy'      // buồn ngủ
  | 'distracted'  // xa rời (mất tập trung)
  | 'unknown'     // chưa đủ data

export interface PostureAnalysis {
  // Raw measurements
  headTiltDeg: number          // -90..90, dương = nghiêng phải
  shoulderTiltDeg: number      // dương = vai phải cao hơn
  forwardLeanScore: number     // 0..1, 1 = cúi mạnh
  shoulderWidthPx: number      // ước lượng khoảng cách camera
  faceVisibility: number       // 0..1, average landmark visibility
  // Classified state
  posture: PostureState
  postureScore: number         // 0..100, 100 = perfect
  postureMessage: string       // tiếng Việt cho UI
}

export interface ExpressionAnalysis {
  // Raw blendshape scores (0..1)
  smile: number
  frown: number
  browFurrow: number       // browDown — sign of confusion
  blinkRate: number        // blinks per minute (running avg)
  eyeOpenness: number      // 0..1, 1 = wide open
  gazeDeviation: number    // 0..1, 1 = looking far from center
  jawOpen: number
  // Classified state
  emotion: EmotionState
  emotionScore: number     // 0..100 (positivity * focus)
  emotionMessage: string
}

export interface EngagementSnapshot {
  timestamp: number          // ms epoch
  engagement: number         // 0..100 composite
  posture: PostureAnalysis | null
  expression: ExpressionAnalysis | null
  noPersonDetected: boolean
}

// ─── Pose analysis ──────────────────────────────────────────────

// MediaPipe pose landmark indices
const NOSE = 0
const LEFT_EAR = 7
const RIGHT_EAR = 8
const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12
const LEFT_HIP = 23
const RIGHT_HIP = 24

interface Landmark {
  x: number          // normalized 0..1
  y: number          // normalized 0..1
  z?: number         // depth relative
  visibility?: number // 0..1
}

export function analyzePose(landmarks: Landmark[] | null | undefined): PostureAnalysis | null {
  if (!landmarks || landmarks.length < 25) return null

  const nose = landmarks[NOSE]
  const lEar = landmarks[LEFT_EAR]
  const rEar = landmarks[RIGHT_EAR]
  const lShoulder = landmarks[LEFT_SHOULDER]
  const rShoulder = landmarks[RIGHT_SHOULDER]
  const lHip = landmarks[LEFT_HIP]
  const rHip = landmarks[RIGHT_HIP]

  // Average visibility (proxy for "person clearly visible")
  const visibilitySum = [nose, lShoulder, rShoulder, lHip, rHip]
    .reduce((sum, lm) => sum + (lm.visibility ?? 1), 0)
  const faceVisibility = visibilitySum / 5

  // ─ Shoulder tilt (degree) ─
  // angle between shoulder line and horizontal
  // positive = right shoulder higher
  const dyShoulder = rShoulder.y - lShoulder.y
  const dxShoulder = rShoulder.x - lShoulder.x
  const shoulderTiltDeg = (Math.atan2(dyShoulder, dxShoulder) * 180) / Math.PI

  // ─ Head tilt (degree) ─
  const dyEar = rEar.y - lEar.y
  const dxEar = rEar.x - lEar.x
  const headTiltDeg = (Math.atan2(dyEar, dxEar) * 180) / Math.PI

  // ─ Forward lean score ─
  // When user cúi xuống bàn → nose comes close to shoulder Y level (head dropped).
  // Healthy: nose.y < shoulder midY (head ABOVE shoulders, since y axis grows downward
  // in image coords, "above" means smaller y).
  // Bad: nose.y → shoulder midY → head dropped down.
  const shoulderMidY = (lShoulder.y + rShoulder.y) / 2
  // Distance from nose to shoulder midpoint, normalized by shoulder width
  const shoulderWidth = Math.hypot(dxShoulder, dyShoulder)
  const headOffset = shoulderMidY - nose.y  // positive = head above shoulders (normal)
  // Healthy ratio ≈ 0.8-1.2 (head 1× shoulder-width above shoulders)
  // Forward lean → ratio drops to < 0.3
  const headRatio = shoulderWidth > 0.01 ? headOffset / shoulderWidth : 1
  // Map: ratio 1.0 → 0 (good), ratio 0.0 → 1 (very leaned)
  const forwardLeanScore = Math.max(0, Math.min(1, 1 - headRatio))

  // ─ Distance to camera ─
  // shoulderWidth normalized 0..1. Comfortable working distance ≈ 0.18-0.30
  // Too close (< 0.15) → user nhoài người về phía trước
  // Too far (> 0.40) → user ngồi xa, image too small
  const shoulderWidthPx = shoulderWidth  // already normalized, treat as "fraction of frame"

  // ─ Classify posture ─
  let posture: PostureState
  let postureMessage: string

  if (faceVisibility < 0.4) {
    posture = 'absent'
    postureMessage = '⚠ Không phát hiện người trước camera'
  } else if (shoulderWidth < 0.10) {
    posture = 'far'
    postureMessage = '↩ Bạn đang ngồi xa camera — di chuyển gần hơn'
  } else if (shoulderWidth > 0.45) {
    posture = 'close'
    postureMessage = '↪ Bạn đang ngồi quá gần — lùi lại để bảo vệ mắt'
  } else if (forwardLeanScore > 0.6) {
    posture = 'leaning'
    postureMessage = '↓ Bạn đang cúi xuống bàn — ngồi thẳng lưng lên'
  } else if (Math.abs(headTiltDeg) > 18) {
    posture = 'tilted'
    postureMessage = `↺ Đầu nghiêng ${Math.abs(headTiltDeg).toFixed(0)}° — giữ thẳng cổ`
  } else if (Math.abs(shoulderTiltDeg) > 12) {
    posture = 'asymmetric'
    postureMessage = `⇆ Vai lệch ${Math.abs(shoulderTiltDeg).toFixed(0)}° — cân đối 2 vai`
  } else {
    posture = 'good'
    postureMessage = '✓ Tư thế đúng — tiếp tục duy trì'
  }

  // ─ Posture score 0..100 ─
  let postureScore = 100
  postureScore -= Math.min(40, Math.abs(headTiltDeg) * 1.5)        // head tilt up to -40
  postureScore -= Math.min(30, Math.abs(shoulderTiltDeg) * 2)       // shoulder up to -30
  postureScore -= Math.min(40, forwardLeanScore * 80)               // lean up to -40
  postureScore -= Math.min(20, Math.max(0, 0.15 - shoulderWidth) * 200) // too far
  postureScore -= Math.min(20, Math.max(0, shoulderWidth - 0.40) * 200) // too close
  if (faceVisibility < 0.4) postureScore = Math.max(0, postureScore - 50)
  postureScore = Math.max(0, Math.min(100, postureScore))

  return {
    headTiltDeg, shoulderTiltDeg, forwardLeanScore, shoulderWidthPx,
    faceVisibility,
    posture, postureScore, postureMessage,
  }
}

// ─── Expression analysis ────────────────────────────────────────

// MediaPipe blendshape category names (ARKit-compatible)
// We look up by displayName from the result.categories array
export interface Blendshape {
  categoryName: string
  score: number
}

function getBlendshape(shapes: Blendshape[], name: string): number {
  const s = shapes.find(b => b.categoryName === name)
  return s ? s.score : 0
}

// State for blink rate tracking — running window of timestamps
// Caller passes this object to maintain blink history.
export interface BlinkTracker {
  history: number[]  // timestamps of blink events (ms epoch)
  lastBlinkState: boolean  // were eyes closed last frame?
}

export function createBlinkTracker(): BlinkTracker {
  return { history: [], lastBlinkState: false }
}

const BLINK_THRESHOLD = 0.5      // eyeBlink score above → closed
const BLINK_WINDOW_MS = 60_000   // 60s rolling window for blink rate

export function analyzeExpression(
  blendshapes: Blendshape[] | null | undefined,
  facialTransformMatrix: number[] | null | undefined,
  blinkTracker: BlinkTracker,
  now: number = Date.now(),
): ExpressionAnalysis | null {
  if (!blendshapes || blendshapes.length === 0) return null

  // ─ Raw blendshape extraction ─
  const smile = (getBlendshape(blendshapes, 'mouthSmileLeft') + getBlendshape(blendshapes, 'mouthSmileRight')) / 2
  const frown = (getBlendshape(blendshapes, 'mouthFrownLeft') + getBlendshape(blendshapes, 'mouthFrownRight')) / 2
  const browFurrow = (getBlendshape(blendshapes, 'browDownLeft') + getBlendshape(blendshapes, 'browDownRight')) / 2
  const jawOpen = getBlendshape(blendshapes, 'jawOpen')
  const eyeBlinkL = getBlendshape(blendshapes, 'eyeBlinkLeft')
  const eyeBlinkR = getBlendshape(blendshapes, 'eyeBlinkRight')
  const eyeBlink = (eyeBlinkL + eyeBlinkR) / 2
  const eyeOpenness = 1 - eyeBlink

  // Gaze deviation: how far eyes look from center (sum of in/out directions)
  const gazeOutL = getBlendshape(blendshapes, 'eyeLookOutLeft')
  const gazeOutR = getBlendshape(blendshapes, 'eyeLookOutRight')
  const gazeInL = getBlendshape(blendshapes, 'eyeLookInLeft')
  const gazeInR = getBlendshape(blendshapes, 'eyeLookInRight')
  const gazeUpL = getBlendshape(blendshapes, 'eyeLookUpLeft')
  const gazeUpR = getBlendshape(blendshapes, 'eyeLookUpRight')
  const gazeDownL = getBlendshape(blendshapes, 'eyeLookDownLeft')
  const gazeDownR = getBlendshape(blendshapes, 'eyeLookDownRight')
  // Max of horizontal & vertical components
  const gazeH = Math.max(gazeOutL, gazeOutR, gazeInL, gazeInR)
  const gazeV = Math.max(gazeUpL, gazeUpR, gazeDownL, gazeDownR)
  const gazeDeviation = Math.max(gazeH, gazeV)

  // ─ Track blinks ─
  const isClosedNow = eyeBlink > BLINK_THRESHOLD
  if (isClosedNow && !blinkTracker.lastBlinkState) {
    // Rising edge — blink onset
    blinkTracker.history.push(now)
  }
  blinkTracker.lastBlinkState = isClosedNow
  // Trim history > 60s
  while (blinkTracker.history.length > 0 && now - blinkTracker.history[0] > BLINK_WINDOW_MS) {
    blinkTracker.history.shift()
  }
  // Blinks per minute
  const blinkRate = blinkTracker.history.length

  // Suppress unused parameter warning (kept in signature for future head-pose work)
  void facialTransformMatrix

  // ─ Classify emotion ─
  let emotion: EmotionState
  let emotionMessage: string

  // Threshold tuning — empirical from MediaPipe defaults
  if (smile > 0.4) {
    emotion = 'happy'
    emotionMessage = '😊 Vui vẻ — tâm trạng tích cực'
  } else if (browFurrow > 0.45 && smile < 0.15) {
    emotion = 'confused'
    emotionMessage = '🤔 Bối rối — có thể gặp khó khăn với nội dung'
  } else if (blinkRate > 25) {
    // Normal blink rate 12-20/min. > 25 → mệt mỏi/khô mắt
    emotion = blinkRate > 35 ? 'drowsy' : 'tired'
    emotionMessage = blinkRate > 35
      ? '😴 Buồn ngủ — nên nghỉ giải lao'
      : '😪 Mệt mỏi — chớp mắt nhiều'
  } else if (gazeDeviation > 0.55) {
    emotion = 'distracted'
    emotionMessage = '👀 Mắt nhìn sang chỗ khác — đang phân tâm?'
  } else if (eyeOpenness < 0.5 && blinkRate < 8) {
    emotion = 'drowsy'
    emotionMessage = '😴 Mắt lim dim — nên nghỉ một chút'
  } else if (eyeOpenness > 0.6 && smile < 0.2 && frown < 0.2) {
    emotion = 'focused'
    emotionMessage = '🎯 Đang tập trung — duy trì nhịp này'
  } else {
    emotion = 'unknown'
    emotionMessage = '· Trạng thái trung tính'
  }

  // ─ Emotion score 0..100 (composite of positivity + focus) ─
  let emotionScore = 50  // neutral baseline
  emotionScore += smile * 30
  emotionScore -= frown * 25
  emotionScore -= browFurrow * 15
  emotionScore -= Math.max(0, blinkRate - 20) * 1.5  // penalize fatigue
  emotionScore -= gazeDeviation * 25
  emotionScore += Math.min(20, (eyeOpenness - 0.5) * 40)  // wide eyes = engaged
  emotionScore = Math.max(0, Math.min(100, emotionScore))

  return {
    smile, frown, browFurrow, blinkRate, eyeOpenness, gazeDeviation, jawOpen,
    emotion, emotionScore, emotionMessage,
  }
}

// ─── Engagement composite ───────────────────────────────────────

/**
 * Engagement = 0.55 × postureScore + 0.45 × emotionScore
 *
 * Người ngồi sai tư thế nhưng vui vẻ → engagement medium.
 * Người tập trung + ngồi đúng → engagement cao.
 * Vắng mặt → engagement = 0.
 */
export function computeEngagement(
  posture: PostureAnalysis | null,
  expression: ExpressionAnalysis | null,
): number {
  if (!posture && !expression) return 0
  if (!posture) return Math.round(expression!.emotionScore * 0.6)  // partial info
  if (!expression) return Math.round(posture.postureScore * 0.7)
  if (posture.posture === 'absent') return 0
  const eng = 0.55 * posture.postureScore + 0.45 * expression.emotionScore
  return Math.round(eng)
}

// ─── History aggregation ────────────────────────────────────────

export interface AggregateStats {
  windowMs: number
  samples: number
  avgEngagement: number
  avgPosture: number
  avgEmotion: number
  postureBreakdown: Record<PostureState, number>  // % of time in each state
  emotionBreakdown: Record<EmotionState, number>
  topRecommendation: string                       // gợi ý hành động cụ thể
}

export function aggregate(snapshots: EngagementSnapshot[], windowMs: number): AggregateStats {
  const now = Date.now()
  const recent = snapshots.filter(s => now - s.timestamp <= windowMs)
  const samples = recent.length

  if (samples === 0) {
    return {
      windowMs, samples: 0,
      avgEngagement: 0, avgPosture: 0, avgEmotion: 0,
      postureBreakdown: {} as Record<PostureState, number>,
      emotionBreakdown: {} as Record<EmotionState, number>,
      topRecommendation: 'Chưa có dữ liệu — bật theo dõi và đợi vài phút',
    }
  }

  let sumEng = 0, sumPos = 0, sumEmo = 0, posN = 0, emoN = 0
  const postureCount: Record<string, number> = {}
  const emotionCount: Record<string, number> = {}

  for (const s of recent) {
    sumEng += s.engagement
    if (s.posture) {
      sumPos += s.posture.postureScore; posN++
      postureCount[s.posture.posture] = (postureCount[s.posture.posture] ?? 0) + 1
    }
    if (s.expression) {
      sumEmo += s.expression.emotionScore; emoN++
      emotionCount[s.expression.emotion] = (emotionCount[s.expression.emotion] ?? 0) + 1
    }
  }
  const avgEngagement = Math.round(sumEng / samples)
  const avgPosture = posN > 0 ? Math.round(sumPos / posN) : 0
  const avgEmotion = emoN > 0 ? Math.round(sumEmo / emoN) : 0

  // Convert counts to percentages
  const postureBreakdown = {} as Record<PostureState, number>
  for (const [k, v] of Object.entries(postureCount)) {
    postureBreakdown[k as PostureState] = Math.round((v / samples) * 100)
  }
  const emotionBreakdown = {} as Record<EmotionState, number>
  for (const [k, v] of Object.entries(emotionCount)) {
    emotionBreakdown[k as EmotionState] = Math.round((v / samples) * 100)
  }

  // Recommendation: pick the worst trend
  let topRecommendation = '🎉 Bạn đang học tập rất tốt — duy trì phong độ này!'
  if (avgEngagement < 40) {
    topRecommendation = '⚠ Engagement thấp — nghỉ giải lao 5 phút rồi quay lại'
  } else if ((postureBreakdown.leaning ?? 0) > 30) {
    topRecommendation = '↑ Bạn cúi xuống bàn >30% thời gian — thử nâng laptop bằng giá đỡ'
  } else if ((postureBreakdown.tilted ?? 0) > 25) {
    topRecommendation = '↺ Đầu nghiêng nhiều — kiểm tra góc nhìn màn hình'
  } else if ((emotionBreakdown.tired ?? 0) + (emotionBreakdown.drowsy ?? 0) > 30) {
    topRecommendation = '😴 Có dấu hiệu mệt mỏi — uống nước + giãn cơ vai gáy 2 phút'
  } else if ((emotionBreakdown.distracted ?? 0) > 30) {
    topRecommendation = '👀 Hay mất tập trung — tắt thông báo điện thoại, dùng kỹ thuật Pomodoro 25′'
  } else if ((emotionBreakdown.confused ?? 0) > 25) {
    topRecommendation = '🤔 Có dấu hiệu bối rối — đặt câu hỏi cho GV hoặc xem lại bài cũ'
  } else if (avgPosture < 60) {
    topRecommendation = '🪑 Tư thế chưa ổn — đặt 2 chân chạm đất, lưng tựa ghế'
  }

  return {
    windowMs, samples, avgEngagement, avgPosture, avgEmotion,
    postureBreakdown, emotionBreakdown, topRecommendation,
  }
}
