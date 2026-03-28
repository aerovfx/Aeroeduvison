import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { DeepLearningOcrService } from "@/lib/ocr/deep-learning-ocr"

export const runtime = "nodejs"
export const maxDuration = 30

const STD_W = 1200

// ======================== LAYOUT CONSTANTS ========================
// All values are fractions (0–1) relative to the normalized sheet area.

const PART1 = {
  yStart: 0.342,
  yEnd: 0.555,
  rows: 10,
  groups: [
    { q0: 1, A: 0.052, B: 0.082, C: 0.112, D: 0.142 },
    { q0: 11, A: 0.286, B: 0.316, C: 0.346, D: 0.376 },
    { q0: 21, A: 0.520, B: 0.550, C: 0.580, D: 0.610 },
    { q0: 31, A: 0.752, B: 0.782, C: 0.812, D: 0.842 },
  ],
}

const PART2 = {
  yStart: 0.618,
  yHeaderEnd: 0.638,
  yEnd: 0.690,
  subCount: 4,
  boxes: [
    { q: 1, dung: 0.048, sai: 0.078 },
    { q: 2, dung: 0.148, sai: 0.178 },
    { q: 3, dung: 0.268, sai: 0.298 },
    { q: 4, dung: 0.368, sai: 0.398 },
    { q: 5, dung: 0.510, sai: 0.540 },
    { q: 6, dung: 0.618, sai: 0.648 },
    { q: 7, dung: 0.738, sai: 0.768 },
    { q: 8, dung: 0.858, sai: 0.888 },
  ],
}

const PART3 = {
  yStart: 0.745,
  yEnd: 0.968,
  rows: 12,
  boxes: [
    { q: 1, x: 0.042 }, { q: 2, x: 0.205 }, { q: 3, x: 0.370 },
    { q: 4, x: 0.535 }, { q: 5, x: 0.695 }, { q: 6, x: 0.860 },
  ],
}

const SBD = { xStart: 0.660, xEnd: 0.810, yStart: 0.035, yEnd: 0.195, cols: 6, digits: 10 }
const EXAM_CODE = { xStart: 0.875, xEnd: 0.960, yStart: 0.035, yEnd: 0.195, cols: 3, digits: 10 }
const STUDENT_NAME_BANDS = [
  { left: 0.45, top: 0.18, right: 0.82, bottom: 0.228 },
  { left: 0.41, top: 0.172, right: 0.85, bottom: 0.236 },
  { left: 0.38, top: 0.165, right: 0.87, bottom: 0.248 },
]

const DEFAULT_NAME_OCR_PROVIDERS = "paddleocr,ocr_process,ocr_advanced"
const NAME_OCR_TIMEOUT_MS = Number(process.env.GRADING_NAME_OCR_TIMEOUT_MS || 4500)

type Point = { x: number; y: number }
type Marker = { cx: number; cy: number; area: number; w: number; h: number }
type NameCandidate = { provider: string; text: string; confidence: number }

function clamp(v: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v))
}

function avg(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((s, v) => s + v, 0) / values.length
}

function toX(frac: number, w: number) {
  return Math.round(frac * w)
}

function toY(frac: number, h: number) {
  return Math.round(frac * h)
}

async function prepareEnhancedGrayscale(input: Buffer): Promise<{ enhanced: Buffer; base: Buffer; width: number; height: number }> {
  const base = await sharp(input)
    .rotate()
    .resize({ width: STD_W, withoutEnlargement: true })
    .grayscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const W = base.info.width
  const H = base.info.height

  const background = await sharp(base.data, { raw: { width: W, height: H, channels: 1 } })
    .blur(18)
    .raw()
    .toBuffer()

  const flattened = Buffer.alloc(base.data.length)
  for (let i = 0; i < base.data.length; i++) {
    // Background flattening: remove lighting gradients.
    const v = 128 + (base.data[i] - background[i]) * 1.7
    flattened[i] = clamp(Math.round(v))
  }

  const enhanced = await sharp(flattened, { raw: { width: W, height: H, channels: 1 } })
    .blur(0.7)
    .sharpen({ sigma: 1.25, m1: 1, m2: 2, x1: 2, y2: 10, y3: 20 })
    .raw()
    .toBuffer()

  return { enhanced, base: base.data, width: W, height: H }
}

function computeOtsuThreshold(gray: Buffer): number {
  const hist = new Array(256).fill(0)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++

  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]

  let sumB = 0
  let wB = 0
  let maxVar = -1
  let threshold = 128

  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = t
    }
  }

  return threshold
}

function binarize(gray: Buffer, threshold: number): Uint8Array {
  const out = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) {
    out[i] = gray[i] < threshold ? 1 : 0 // 1 = dark pixel
  }
  return out
}

function findSquareMarkers(binary: Uint8Array, w: number, h: number): Marker[] {
  const visited = new Uint8Array(binary.length)
  const markers: Marker[] = []

  const minArea = Math.max(90, Math.round((w * h) * 0.00008))
  const maxArea = Math.max(2500, Math.round((w * h) * 0.0025))

  const stack: number[] = []

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const start = y * w + x
      if (binary[start] !== 1 || visited[start] === 1) continue

      stack.length = 0
      stack.push(start)
      visited[start] = 1

      let area = 0
      let minX = x, maxX = x, minY = y, maxY = y

      while (stack.length > 0) {
        const idx = stack.pop() as number
        const cy = Math.floor(idx / w)
        const cx = idx - cy * w
        area++
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy

        const left = idx - 1
        const right = idx + 1
        const up = idx - w
        const down = idx + w

        if (cx > 0 && binary[left] === 1 && visited[left] === 0) { visited[left] = 1; stack.push(left) }
        if (cx < w - 1 && binary[right] === 1 && visited[right] === 0) { visited[right] = 1; stack.push(right) }
        if (cy > 0 && binary[up] === 1 && visited[up] === 0) { visited[up] = 1; stack.push(up) }
        if (cy < h - 1 && binary[down] === 1 && visited[down] === 0) { visited[down] = 1; stack.push(down) }
      }

      if (area < minArea || area > maxArea) continue

      const bw = maxX - minX + 1
      const bh = maxY - minY + 1
      const ratio = bw / Math.max(1, bh)
      const fill = area / Math.max(1, bw * bh)
      const minSide = Math.min(bw, bh)

      if (ratio < 0.7 || ratio > 1.35) continue
      if (fill < 0.45) continue
      if (minSide < 10) continue

      markers.push({
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        area,
        w: bw,
        h: bh,
      })
    }
  }

  return markers
}

function detectMarkersAndCorners(gray: Buffer, w: number, h: number): {
  markers: Marker[]
  corners: { tl: Point; tr: Point; br: Point; bl: Point } | null
  threshold: number
} {
  const otsu = computeOtsuThreshold(gray)
  const attempts = [
    Math.round(otsu * 0.85),
    Math.round(otsu * 0.95),
    Math.round(otsu * 1.05),
    Math.round(otsu * 1.15),
    90,
    110,
    130,
    150,
    170,
  ]

  const dedup = Array.from(
    new Set(
      attempts.map((v) => clamp(v, 50, 220))
    )
  )

  let best: {
    markers: Marker[]
    corners: { tl: Point; tr: Point; br: Point; bl: Point } | null
    threshold: number
    score: number
  } | null = null

  for (const threshold of dedup) {
    const binary = binarize(gray, threshold)
    const markers = findSquareMarkers(binary, w, h)
    const corners = pickCornerMarkers(markers, w, h)

    let score = markers.length
    if (corners) {
      const dTL = Math.hypot(corners.tl.x - 0, corners.tl.y - 0)
      const dTR = Math.hypot(corners.tr.x - (w - 1), corners.tr.y - 0)
      const dBR = Math.hypot(corners.br.x - (w - 1), corners.br.y - (h - 1))
      const dBL = Math.hypot(corners.bl.x - 0, corners.bl.y - (h - 1))
      const norm = (dTL + dTR + dBR + dBL) / Math.max(1, Math.hypot(w, h))
      const poly = [corners.tl, corners.tr, corners.br, corners.bl]
      let twiceArea = 0
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i]
        const q = poly[(i + 1) % poly.length]
        twiceArea += p.x * q.y - p.y * q.x
      }
      const areaRatio = Math.abs(twiceArea) / (2 * Math.max(1, w * h))
      score = markers.length * 6 + areaRatio * 200 - norm * 3
    }

    if (!best || score > best.score) {
      best = { markers, corners, threshold, score }
    }
  }

  if (!best) return { markers: [], corners: null, threshold: 128 }
  return {
    markers: best.markers,
    corners: best.corners,
    threshold: best.threshold,
  }
}

function pickCornerMarkers(markers: Marker[], w: number, h: number): { tl: Point; tr: Point; br: Point; bl: Point } | null {
  if (markers.length < 4) return null

  const edgeMarkers = markers.filter((m) =>
    m.cx < w * 0.22 || m.cx > w * 0.78 || m.cy < h * 0.22 || m.cy > h * 0.78
  )
  const pool = (edgeMarkers.length >= 4 ? edgeMarkers : markers)
    .sort((a, b) => b.area - a.area)
    .slice(0, 120)

  if (pool.length < 4) return null

  const bonus = (m: Marker) => 0.9 * Math.sqrt(m.area)
  const K = 14

  const cTL = [...pool].sort((a, b) => (a.cx + a.cy - bonus(a)) - (b.cx + b.cy - bonus(b))).slice(0, K)
  const cTR = [...pool].sort((a, b) => ((w - a.cx) + a.cy - bonus(a)) - ((w - b.cx) + b.cy - bonus(b))).slice(0, K)
  const cBR = [...pool].sort((a, b) => ((w - a.cx) + (h - a.cy) - bonus(a)) - ((w - b.cx) + (h - b.cy) - bonus(b))).slice(0, K)
  const cBL = [...pool].sort((a, b) => (a.cx + (h - a.cy) - bonus(a)) - (b.cx + (h - b.cy) - bonus(b))).slice(0, K)

  let best: { tl: Marker; tr: Marker; br: Marker; bl: Marker; score: number } | null = null

  for (const tl of cTL) {
    for (const tr of cTR) {
      if (tr === tl) continue
      for (const br of cBR) {
        if (br === tl || br === tr) continue
        for (const bl of cBL) {
          if (bl === tl || bl === tr || bl === br) continue
          if (!(tl.cx < tr.cx && bl.cx < br.cx && tl.cy < bl.cy && tr.cy < br.cy)) continue

          const poly: Point[] = [
            { x: tl.cx, y: tl.cy },
            { x: tr.cx, y: tr.cy },
            { x: br.cx, y: br.cy },
            { x: bl.cx, y: bl.cy },
          ]
          let twiceArea = 0
          for (let i = 0; i < poly.length; i++) {
            const p = poly[i]
            const q = poly[(i + 1) % poly.length]
            twiceArea += p.x * q.y - p.y * q.x
          }
          const area = Math.abs(twiceArea) / 2
          const areaRatio = area / Math.max(1, w * h)
          if (areaRatio < 0.08) continue

          const topLen = Math.hypot(tr.cx - tl.cx, tr.cy - tl.cy)
          const botLen = Math.hypot(br.cx - bl.cx, br.cy - bl.cy)
          const leftLen = Math.hypot(bl.cx - tl.cx, bl.cy - tl.cy)
          const rightLen = Math.hypot(br.cx - tr.cx, br.cy - tr.cy)
          const shapePenalty =
            Math.abs(topLen - botLen) / Math.max(1, topLen + botLen) +
            Math.abs(leftLen - rightLen) / Math.max(1, leftLen + rightLen)

          const cornerPenalty =
            Math.hypot(tl.cx, tl.cy) +
            Math.hypot(w - tr.cx, tr.cy) +
            Math.hypot(w - br.cx, h - br.cy) +
            Math.hypot(bl.cx, h - bl.cy)

          const areaBonus = Math.sqrt(tl.area + tr.area + br.area + bl.area)
          const score = areaRatio * 220 - shapePenalty * 40 - cornerPenalty / Math.max(1, Math.hypot(w, h)) + areaBonus * 0.08

          if (!best || score > best.score) {
            best = { tl, tr, br, bl, score }
          }
        }
      }
    }
  }

  if (!best) return null
  return {
    tl: { x: best.tl.cx, y: best.tl.cy },
    tr: { x: best.tr.cx, y: best.tr.cy },
    br: { x: best.br.cx, y: best.br.cy },
    bl: { x: best.bl.cx, y: best.bl.cy },
  }
}

function solveLinear8(A: number[][], b: number[]): number[] | null {
  const n = 8
  const M = A.map((row, i) => [...row, b[i]])

  for (let i = 0; i < n; i++) {
    let pivot = i
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[pivot][i])) pivot = r
    }
    if (Math.abs(M[pivot][i]) < 1e-9) return null
    if (pivot !== i) [M[i], M[pivot]] = [M[pivot], M[i]]

    const div = M[i][i]
    for (let c = i; c <= n; c++) M[i][c] /= div

    for (let r = 0; r < n; r++) {
      if (r === i) continue
      const factor = M[r][i]
      for (let c = i; c <= n; c++) M[r][c] -= factor * M[i][c]
    }
  }

  return M.map((row) => row[n])
}

function computeHomography(from: Point[], to: Point[]): number[] | null {
  if (from.length !== 4 || to.length !== 4) return null
  const A: number[][] = []
  const b: number[] = []

  for (let i = 0; i < 4; i++) {
    const x = from[i].x
    const y = from[i].y
    const u = to[i].x
    const v = to[i].y
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v)
  }

  const sol = solveLinear8(A, b)
  if (!sol) return null
  return [sol[0], sol[1], sol[2], sol[3], sol[4], sol[5], sol[6], sol[7], 1]
}

function sampleBilinear(gray: Buffer, w: number, h: number, x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(w - 1, x0 + 1)
  const y1 = Math.min(h - 1, y0 + 1)
  if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return 255

  const fx = x - x0
  const fy = y - y0

  const p00 = gray[y0 * w + x0]
  const p10 = gray[y0 * w + x1]
  const p01 = gray[y1 * w + x0]
  const p11 = gray[y1 * w + x1]

  const p0 = p00 + (p10 - p00) * fx
  const p1 = p01 + (p11 - p01) * fx
  return Math.round(p0 + (p1 - p0) * fy)
}

function warpByHomography(src: Buffer, srcW: number, srcH: number, H: number[], dstW: number, dstH: number): Buffer {
  const out = Buffer.alloc(dstW * dstH, 255)
  const h11 = H[0], h12 = H[1], h13 = H[2]
  const h21 = H[3], h22 = H[4], h23 = H[5]
  const h31 = H[6], h32 = H[7]

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const den = h31 * x + h32 * y + 1
      if (Math.abs(den) < 1e-9) continue
      const sx = (h11 * x + h12 * y + h13) / den
      const sy = (h21 * x + h22 * y + h23) / den
      out[y * dstW + x] = sampleBilinear(src, srcW, srcH, sx, sy)
    }
  }

  return out
}

function cropRect(gray: Buffer, w: number, h: number, left: number, top: number, width: number, height: number): Buffer {
  const out = Buffer.alloc(width * height, 255)
  for (let y = 0; y < height; y++) {
    const sy = top + y
    if (sy < 0 || sy >= h) continue
    for (let x = 0; x < width; x++) {
      const sx = left + x
      if (sx < 0 || sx >= w) continue
      out[y * width + x] = gray[sy * w + sx]
    }
  }
  return out
}

function detectSheetBoundsByProfiles(px: Buffer, w: number, h: number): { left: number; top: number; right: number; bottom: number } {
  const darkT = 70

  const colDark = new Array(w).fill(0)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (px[y * w + x] < darkT) colDark[x]++
    }
  }

  const rowDark = new Array(h).fill(0)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[y * w + x] < darkT) rowDark[y]++
    }
  }

  const colMin = h * 0.015
  const rowMin = w * 0.015
  let left = 0
  for (let x = 0; x < Math.round(w * 0.45); x++) if (colDark[x] >= colMin) { left = x; break }
  let right = w - 1
  for (let x = w - 1; x > Math.round(w * 0.55); x--) if (colDark[x] >= colMin) { right = x; break }
  let top = 0
  for (let y = 0; y < Math.round(h * 0.3); y++) if (rowDark[y] >= rowMin) { top = y; break }
  let bottom = h - 1
  for (let y = h - 1; y > Math.round(h * 0.7); y--) if (rowDark[y] >= rowMin) { bottom = y; break }

  return {
    left: (left / w) * 100,
    top: (top / h) * 100,
    right: (right / w) * 100,
    bottom: (bottom / h) * 100,
  }
}

function regionMean(gray: Buffer, w: number, h: number, cx: number, cy: number, r: number): number {
  let sum = 0
  let n = 0
  const r2 = r * r
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const x = Math.round(cx + dx)
      const y = Math.round(cy + dy)
      if (x >= 0 && x < w && y >= 0 && y < h) {
        sum += gray[y * w + x]
        n++
      }
    }
  }
  return n > 0 ? sum / n : 255
}

function pickDarkestIndex(means: number[], threshold: number, minGap: number): number | null {
  const indexed = means.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  if (indexed.length < 2) return null
  if (indexed[0].v >= threshold) return null
  if ((indexed[1].v - indexed[0].v) < minGap) return null
  return indexed[0].i
}

function detectBestInColumn(gray: Buffer, w: number, h: number, cx: number, yPositions: number[], radius: number, threshold: number): number | null {
  const means = yPositions.map((y) => regionMean(gray, w, h, cx, y, radius))
  return pickDarkestIndex(means, threshold, 7)
}

function regionMeanByFrac(
  gray: Buffer,
  w: number,
  h: number,
  leftFrac: number,
  topFrac: number,
  rightFrac: number,
  bottomFrac: number,
  step = 3
): number {
  const left = Math.max(0, Math.min(w - 1, Math.round(leftFrac * w)))
  const right = Math.max(left + 1, Math.min(w, Math.round(rightFrac * w)))
  const top = Math.max(0, Math.min(h - 1, Math.round(topFrac * h)))
  const bottom = Math.max(top + 1, Math.min(h, Math.round(bottomFrac * h)))

  let sum = 0
  let count = 0
  for (let y = top; y < bottom; y += Math.max(1, step)) {
    for (let x = left; x < right; x += Math.max(1, step)) {
      sum += gray[y * w + x]
      count++
    }
  }
  return count > 0 ? sum / count : 255
}

function confidence01(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return 0
  if (n <= 0) return 0
  if (n <= 1) return n
  if (n <= 100) return n / 100
  return 1
}

function isLikelyNameText(text: string): boolean {
  if (!text) return false
  if (/\d/.test(text)) return false
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 7) return false
  const letters = (text.match(/\p{L}/gu) || []).length
  if (letters < 5) return false
  const letterRatio = letters / Math.max(1, text.length)
  return letterRatio > 0.6
}

function smartTitleCase(text: string): string {
  const letters = (text.match(/\p{L}/gu) || []).length
  const upper = (text.match(/\p{Lu}/gu) || []).length
  const upperRatio = upper / Math.max(1, letters)
  if (upperRatio < 0.75) return text
  return text
    .toLowerCase()
    .replace(/\b\p{L}/gu, (m) => m.toUpperCase())
}

function normalizeStudentName(raw: string): string {
  let text = raw
    .replace(/\b(h[ọo]\s*v[àa]\s*t[êe]n(?:\s*th[íi]\s*sinh)?|ho va ten(?: thi sinh)?|full\s*name|name)\b[:\-]*/giu, " ")
    .replace(/[^\p{L}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!text) return ""
  text = smartTitleCase(text)
  return text
}

function scoreName(name: string, confidence: number): number {
  if (!isLikelyNameText(name)) return 0
  const words = name.split(/\s+/).filter(Boolean).length
  const letters = (name.match(/\p{L}/gu) || []).length
  const letterRatio = letters / Math.max(1, name.length)
  const wordScore = Math.min(1, words / 3)
  const lenScore = Math.min(1, letters / 14)
  return confidence * 0.45 + wordScore * 0.25 + lenScore * 0.2 + letterRatio * 0.1
}

function collectTextCandidates(payload: any, provider: string): NameCandidate[] {
  const candidates: NameCandidate[] = []
  const push = (text: unknown, confidence: unknown) => {
    if (typeof text !== "string") return
    const normalized = normalizeStudentName(text)
    if (!normalized) return
    candidates.push({
      provider,
      text: normalized,
      confidence: confidence01(confidence),
    })
  }

  push(payload?.text, payload?.confidence)
  push(payload?.data?.text, payload?.data?.confidence)
  push(payload?.result?.text, payload?.result?.confidence)
  push(payload?.result?.recognition_results?.full_text, payload?.result?.recognition_results?.average_confidence)
  push(payload?.result?.extracted_data?.fields?.name?.value, payload?.result?.extracted_data?.fields?.name?.confidence)
  push(payload?.result?.extracted_data?.raw_text, payload?.result?.extracted_data?.confidence_score)

  if (Array.isArray(payload?.lines)) {
    for (const line of payload.lines) {
      if (typeof line === "string") push(line, payload?.confidence)
      else push(line?.text, line?.confidence)
    }
  }
  if (Array.isArray(payload?.data?.lines)) {
    for (const line of payload.data.lines) {
      if (typeof line === "string") push(line, payload?.data?.confidence)
      else push(line?.text, line?.confidence)
    }
  }
  if (Array.isArray(payload?.result?.recognition_results?.text_regions)) {
    for (const region of payload.result.recognition_results.text_regions) {
      push(region?.text, region?.confidence)
    }
  }

  return candidates
}

async function callNameOcrEndpoint(
  url: string,
  image: Buffer,
  fileField: string,
  filename = "student-name.png"
): Promise<any | null> {
  try {
    const form = new FormData()
    form.append(fileField, new File([image], filename, { type: "image/png" }))
    const res = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(NAME_OCR_TIMEOUT_MS),
    })
    if (!res.ok) return null
    return await res.json().catch(() => null)
  } catch {
    return null
  }
}

async function buildStudentNameCrops(sheetGray: Buffer, w: number, h: number): Promise<Buffer[]> {
  const crops: Buffer[] = []
  for (const band of STUDENT_NAME_BANDS) {
    const left = Math.max(0, Math.min(w - 1, Math.round(band.left * w)))
    const top = Math.max(0, Math.min(h - 1, Math.round(band.top * h)))
    const right = Math.max(left + 1, Math.min(w, Math.round(band.right * w)))
    const bottom = Math.max(top + 1, Math.min(h, Math.round(band.bottom * h)))
    const width = right - left
    const height = bottom - top
    if (width < 40 || height < 12) continue

    const base = sharp(sheetGray, { raw: { width: w, height: h, channels: 1 } })
      .extract({ left, top, width, height })
      .resize({ width: Math.max(900, width * 3), kernel: "lanczos3" })
      .grayscale()
      .normalise()
      .sharpen({ sigma: 1.1, m1: 1, m2: 2 })

    const v1 = await base.clone().png({ compressionLevel: 9 }).toBuffer()
    const v2 = await base.clone().threshold(165, { grayscale: true }).png({ compressionLevel: 9 }).toBuffer()
    crops.push(v1, v2)
  }
  return crops
}

async function extractStudentNameFromSheet(
  sheetGray: Buffer,
  w: number,
  h: number,
  reqOrigin: string
): Promise<{ name: string; confidence: number; provider: string; attemptedProviders: string[] }> {
  const providers = (process.env.GRADING_NAME_OCR_PROVIDERS || DEFAULT_NAME_OCR_PROVIDERS)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const attempts: string[] = []
  if (providers.length === 0) return { name: "", confidence: 0, provider: "", attemptedProviders: attempts }

  const crops = await buildStudentNameCrops(sheetGray, w, h)
  if (crops.length === 0) return { name: "", confidence: 0, provider: "", attemptedProviders: attempts }

  const ocrServerUrl = process.env.OCR_SERVER_URL || "http://localhost:8001"
  const simServerUrl = process.env.OCR_SIM_SERVER_URL || "http://localhost:8000"
  const easyOcrUrl = process.env.NAME_OCR_EASYOCR_URL
  const trocrUrl = process.env.NAME_OCR_TROCR_URL

  const allCandidates: NameCandidate[] = []

  for (const provider of providers) {
    attempts.push(provider)
    let endpoint = ""
    let fileField = "file"
    if (provider === "paddleocr") {
      endpoint = `${ocrServerUrl}/ocr`
    } else if (provider === "ocr_process") {
      endpoint = `${reqOrigin}/api/ocr-process`
    } else if (provider === "ocr_advanced") {
      endpoint = `${simServerUrl}/api/ocr/process-sync`
    } else if (provider === "easyocr" && easyOcrUrl) {
      endpoint = easyOcrUrl
    } else if (provider === "trocr" && trocrUrl) {
      endpoint = trocrUrl
    } else {
      continue
    }

    for (let i = 0; i < Math.min(3, crops.length); i++) {
      const payload = await callNameOcrEndpoint(endpoint, crops[i], fileField, `student-name-${i}.png`)
      if (!payload) {
        if (i === 0) break
        continue
      }
      const candidates = collectTextCandidates(payload, provider)
      allCandidates.push(...candidates)
      if (candidates.some((c) => scoreName(c.text, c.confidence) >= 0.92)) break
    }
  }

  if (allCandidates.length === 0) {
    return { name: "", confidence: 0, provider: "", attemptedProviders: attempts }
  }

  const dedup = new Map<string, NameCandidate>()
  for (const c of allCandidates) {
    const key = c.text.toLocaleLowerCase("vi")
    const current = dedup.get(key)
    if (!current || scoreName(c.text, c.confidence) > scoreName(current.text, current.confidence)) {
      dedup.set(key, c)
    }
  }

  const ranked = Array.from(dedup.values())
    .map((c) => ({ ...c, score: scoreName(c.text, c.confidence) }))
    .filter((c) => c.score > 0.35)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 0) {
    return { name: "", confidence: 0, provider: "", attemptedProviders: attempts }
  }

  const best = ranked[0]
  return {
    name: best.text,
    confidence: best.confidence,
    provider: best.provider,
    attemptedProviders: attempts,
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) {
      return NextResponse.json({ error: "No image file" }, { status: 400 })
    }

    const src = Buffer.from(await file.arrayBuffer())
    const prep = await prepareEnhancedGrayscale(src)
    const W = prep.width
    const H = prep.height
    const gray = prep.enhanced
    const markerGray = prep.base

    const markerDetect = detectMarkersAndCorners(markerGray, W, H)
    const markers = markerDetect.markers
    const corners = markerDetect.corners

    let sheet = gray
    let SW = W
    let SH = H
    let bounds: { left: number; top: number; right: number; bottom: number }
    let usedMarkerWarp = false

    if (corners) {
      const topLen = Math.hypot(corners.tr.x - corners.tl.x, corners.tr.y - corners.tl.y)
      const botLen = Math.hypot(corners.br.x - corners.bl.x, corners.br.y - corners.bl.y)
      const leftLen = Math.hypot(corners.bl.x - corners.tl.x, corners.bl.y - corners.tl.y)
      const rightLen = Math.hypot(corners.br.x - corners.tr.x, corners.br.y - corners.tr.y)

      const targetW = STD_W
      const avgW = (topLen + botLen) / 2
      const avgH = (leftLen + rightLen) / 2
      const targetH = Math.max(1200, Math.round((avgH / Math.max(1, avgW)) * targetW))

      const from: Point[] = [
        { x: 0, y: 0 },
        { x: targetW - 1, y: 0 },
        { x: targetW - 1, y: targetH - 1 },
        { x: 0, y: targetH - 1 },
      ]
      const to: Point[] = [corners.tl, corners.tr, corners.br, corners.bl]
      const Hinv = computeHomography(from, to)

      if (Hinv) {
        sheet = warpByHomography(gray, W, H, Hinv, targetW, targetH)
        SW = targetW
        SH = targetH
        usedMarkerWarp = true
      }

      const xs = [corners.tl.x, corners.tr.x, corners.br.x, corners.bl.x]
      const ys = [corners.tl.y, corners.tr.y, corners.br.y, corners.bl.y]
      bounds = {
        left: (Math.min(...xs) / W) * 100,
        top: (Math.min(...ys) / H) * 100,
        right: (Math.max(...xs) / W) * 100,
        bottom: (Math.max(...ys) / H) * 100,
      }
    } else {
      bounds = detectSheetBoundsByProfiles(gray, W, H)
      const sL = Math.max(0, Math.round((bounds.left / 100) * W))
      const sT = Math.max(0, Math.round((bounds.top / 100) * H))
      const sR = Math.min(W - 1, Math.round((bounds.right / 100) * W))
      const sB = Math.min(H - 1, Math.round((bounds.bottom / 100) * H))
      const sW = Math.max(1, sR - sL)
      const sH = Math.max(1, sB - sT)
      sheet = cropRect(gray, W, H, sL, sT, sW, sH)
      SW = sW
      SH = sH
    }

    const bubbleR = Math.max(6, Math.round(SW * 0.0085))
    const sampleStep = Math.max(3, Math.round(Math.min(SW, SH) / 400))
    let totalBrightness = 0
    let sampleCount = 0
    for (let y = 0; y < SH; y += sampleStep) {
      for (let x = 0; x < SW; x += sampleStep) {
        totalBrightness += sheet[y * SW + x]
        sampleCount++
      }
    }
    const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 200
    const fillThreshold = avgBrightness * 0.7

    // Core-focus: prioritise exam code + MC zones over the full sheet average.
    const focusStep = Math.max(2, Math.round(Math.min(SW, SH) / 520))
    const mcFocusBrightness = avg([
      regionMeanByFrac(sheet, SW, SH, 0.05, PART1.yStart - 0.02, 0.94, PART1.yEnd + 0.01, focusStep),
      regionMeanByFrac(sheet, SW, SH, 0.05, PART2.yStart - 0.01, 0.90, PART2.yEnd + 0.01, focusStep),
      regionMeanByFrac(sheet, SW, SH, 0.05, PART3.yStart - 0.01, 0.92, PART3.yEnd, focusStep),
    ])
    const examCodeFocusBrightness = regionMeanByFrac(
      sheet,
      SW,
      SH,
      EXAM_CODE.xStart - 0.02,
      EXAM_CODE.yStart - 0.01,
      EXAM_CODE.xEnd + 0.01,
      EXAM_CODE.yEnd + 0.01,
      focusStep
    )
    const sbdFocusBrightness = regionMeanByFrac(
      sheet,
      SW,
      SH,
      SBD.xStart - 0.02,
      SBD.yStart - 0.01,
      SBD.xEnd + 0.01,
      SBD.yEnd + 0.01,
      focusStep
    )

    const mcFillThreshold = Math.min(fillThreshold, mcFocusBrightness * 0.7)
    const examCodeFillThreshold = Math.min(fillThreshold, examCodeFocusBrightness * 0.68)
    const sbdFillThreshold = Math.min(fillThreshold, sbdFocusBrightness * 0.68)
    const nameOcr = await DeepLearningOcrService.recognizeStudentName(sheet, SW, SH, req.nextUrl.origin)

    // ──── Part I: MCQ (40 questions) ────
    const part1: Record<number, "A" | "B" | "C" | "D" | null> = {}
    const rowStep = PART1.rows > 1 ? (PART1.yEnd - PART1.yStart) / (PART1.rows - 1) : 0
    for (const g of PART1.groups) {
      for (let r = 0; r < PART1.rows; r++) {
        const q = g.q0 + r
        const y = toY(PART1.yStart + r * rowStep, SH)
        const means = [
          regionMean(sheet, SW, SH, toX(g.A, SW), y, bubbleR),
          regionMean(sheet, SW, SH, toX(g.B, SW), y, bubbleR),
          regionMean(sheet, SW, SH, toX(g.C, SW), y, bubbleR),
          regionMean(sheet, SW, SH, toX(g.D, SW), y, bubbleR),
        ]
        const localThreshold = Math.min(mcFillThreshold, avg(means) - 5)
        const idx = pickDarkestIndex(means, localThreshold, 8)
        part1[q] = idx === null ? null : (["A", "B", "C", "D"][idx] as "A" | "B" | "C" | "D")
      }
    }

    // ──── Part II: True/False ────
    const part2: Record<number, Record<string, boolean | null>> = {}
    const subLabels = ["a", "b", "c", "d"]
    const p2SubStep = PART2.subCount > 1
      ? (PART2.yEnd - PART2.yHeaderEnd) / (PART2.subCount - 1)
      : 0
    for (const box of PART2.boxes) {
      part2[box.q] = {}
      for (let si = 0; si < subLabels.length; si++) {
        const y = toY(PART2.yHeaderEnd + si * p2SubStep, SH)
        const dung = regionMean(sheet, SW, SH, toX(box.dung, SW), y, bubbleR - 2)
        const sai = regionMean(sheet, SW, SH, toX(box.sai, SW), y, bubbleR - 2)
        const minVal = Math.min(dung, sai)
        const diff = Math.abs(dung - sai)
        if (minVal < Math.min(mcFillThreshold, (dung + sai) / 2 - 3) && diff > 7) {
          part2[box.q][subLabels[si]] = dung < sai
        } else {
          part2[box.q][subLabels[si]] = null
        }
      }
    }

    // ──── Part III: Short answer ────
    const part3: Record<number, string> = {}
    const p3RowStep = PART3.rows > 1 ? (PART3.yEnd - PART3.yStart) / (PART3.rows - 1) : 0
    for (const box of PART3.boxes) {
      const cx = toX(box.x, SW)
      const yPositions = Array.from({ length: PART3.rows }, (_, i) =>
        toY(PART3.yStart + i * p3RowStep, SH)
      )
      const digit = detectBestInColumn(sheet, SW, SH, cx, yPositions, bubbleR - 2, mcFillThreshold)
      if (digit !== null) part3[box.q] = String(digit)
    }

    // ──── SBD ────
    let studentId = ""
    const sbdColStep = SBD.cols > 1 ? (SBD.xEnd - SBD.xStart) / (SBD.cols - 1) : 0
    const sbdRowStep = SBD.digits > 1 ? (SBD.yEnd - SBD.yStart) / (SBD.digits - 1) : 0
    for (let col = 0; col < SBD.cols; col++) {
      const cx = toX(SBD.xStart + col * sbdColStep, SW)
      const yPositions = Array.from({ length: SBD.digits }, (_, d) =>
        toY(SBD.yStart + d * sbdRowStep, SH)
      )
      const digit = detectBestInColumn(sheet, SW, SH, cx, yPositions, bubbleR - 2, sbdFillThreshold)
      if (digit !== null) studentId += String(digit)
    }

    // ──── Exam code ────
    let examCode = ""
    const ecColStep = EXAM_CODE.cols > 1 ? (EXAM_CODE.xEnd - EXAM_CODE.xStart) / (EXAM_CODE.cols - 1) : 0
    const ecRowStep = EXAM_CODE.digits > 1 ? (EXAM_CODE.yEnd - EXAM_CODE.yStart) / (EXAM_CODE.digits - 1) : 0
    for (let col = 0; col < EXAM_CODE.cols; col++) {
      const cx = toX(EXAM_CODE.xStart + col * ecColStep, SW)
      const yPositions = Array.from({ length: EXAM_CODE.digits }, (_, d) =>
        toY(EXAM_CODE.yStart + d * ecRowStep, SH)
      )
      const digit = detectBestInColumn(sheet, SW, SH, cx, yPositions, bubbleR - 2, examCodeFillThreshold)
      if (digit !== null) examCode += String(digit)
    }

    const p1Filled = Object.values(part1).filter((v) => v !== null).length
    const p2Filled = Object.values(part2)
      .flatMap((subs) => Object.values(subs))
      .filter((v) => v !== null).length
    const p3Filled = Object.keys(part3).length
    const coreFocusScore = Math.round(
      Math.min(
        100,
        (examCode.length / Math.max(1, EXAM_CODE.cols)) * 40
        + (p1Filled / 40) * 40
        + (p2Filled / (PART2.boxes.length * 4)) * 12
        + (p3Filled / PART3.boxes.length) * 8
      )
    )

    return NextResponse.json({
      success: true,
      data: {
        examCode,
        studentId,
        studentName: nameOcr.name,
        part1,
        part2,
        part3,
        sheetBounds: bounds,
        imageWidth: W,
        imageHeight: H,
        avgBrightness: Math.round(avgBrightness),
        fillThreshold: Math.round(fillThreshold),
        focusThresholds: {
          mc: Math.round(mcFillThreshold),
          examCode: Math.round(examCodeFillThreshold),
          sbd: Math.round(sbdFillThreshold),
        },
        markerCount: markers.length,
        markerWarp: usedMarkerWarp,
        markerThreshold: markerDetect.threshold,
        studentNameOCR: {
          provider: nameOcr.provider,
          confidence: Math.round(nameOcr.confidence * 100),
          attemptedProviders: nameOcr.attemptedProviders,
        },
        focusMode: "core_examcode_mcq",
        confidence: {
          part1: Math.round((p1Filled / 40) * 100),
          sbd: studentId.length,
          examCode: examCode.length,
          studentName: Math.round(nameOcr.confidence * 100),
          coreFocus: coreFocusScore,
        },
      },
    })
  } catch (error: any) {
    console.error("Recognition error:", error)
    return NextResponse.json({ error: error.message || "Recognition failed" }, { status: 500 })
  }
}
