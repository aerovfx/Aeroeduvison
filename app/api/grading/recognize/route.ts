import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export const runtime = "nodejs"
export const maxDuration = 30

const STD_W = 1200
const BUBBLE_R = 10

// ======================== LAYOUT CONSTANTS ========================
// All values are fractions (0–1) relative to the SHEET content area
// (bounded by the black timing marks), NOT the full image.

const PART1 = {
  yStart: 0.268,
  yEnd: 0.565,
  rows: 10,
  groups: [
    { q0: 1,  A: 0.078, B: 0.118, C: 0.155, D: 0.195 },
    { q0: 11, A: 0.310, B: 0.350, C: 0.390, D: 0.428 },
    { q0: 21, A: 0.548, B: 0.588, C: 0.625, D: 0.665 },
    { q0: 31, A: 0.785, B: 0.825, C: 0.862, D: 0.902 },
  ],
}

const PART2 = {
  yStart: 0.610,
  yHeaderEnd: 0.638,
  yEnd: 0.728,
  subCount: 4,
  boxes: [
    { q: 1, dung: 0.055, sai: 0.090 },
    { q: 2, dung: 0.170, sai: 0.205 },
    { q: 3, dung: 0.280, sai: 0.315 },
    { q: 4, dung: 0.390, sai: 0.425 },
    { q: 5, dung: 0.520, sai: 0.555 },
    { q: 6, dung: 0.630, sai: 0.665 },
    { q: 7, dung: 0.740, sai: 0.775 },
    { q: 8, dung: 0.850, sai: 0.885 },
  ],
}

const PART3 = {
  yStart: 0.770, yEnd: 0.960, rows: 10,
  boxes: [
    { q: 1, x: 0.068 }, { q: 2, x: 0.218 }, { q: 3, x: 0.375 },
    { q: 4, x: 0.548 }, { q: 5, x: 0.715 }, { q: 6, x: 0.880 },
  ],
}

const SBD = { xStart: 0.640, xEnd: 0.800, yStart: 0.042, yEnd: 0.200, cols: 6, digits: 10 }
const EXAM_CODE = { xStart: 0.860, xEnd: 0.960, yStart: 0.030, yEnd: 0.145, cols: 3, digits: 10 }

// ======================== SHEET BOUNDARY DETECTION ========================

function detectSheetBounds(
  px: Buffer, w: number, h: number
): { left: number; top: number; right: number; bottom: number } {
  const darkT = 70

  // Column darkness profile (count very dark pixels per column)
  const colDark = new Array(w).fill(0)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (px[y * w + x] < darkT) colDark[x]++
    }
  }

  // Row darkness profile
  const rowDark = new Array(h).fill(0)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[y * w + x] < darkT) rowDark[y]++
    }
  }

  // The timing marks form vertical lines of dark pixels near left/right edges.
  // Find the first/last columns with a meaningful number of dark pixels.
  const colMin = h * 0.015
  const rowMin = w * 0.015

  let left = 0
  for (let x = 0; x < Math.round(w * 0.45); x++) {
    if (colDark[x] >= colMin) { left = x; break }
  }

  let right = w - 1
  for (let x = w - 1; x > Math.round(w * 0.55); x--) {
    if (colDark[x] >= colMin) { right = x; break }
  }

  let top = 0
  for (let y = 0; y < Math.round(h * 0.3); y++) {
    if (rowDark[y] >= rowMin) { top = y; break }
  }

  let bottom = h - 1
  for (let y = h - 1; y > Math.round(h * 0.7); y--) {
    if (rowDark[y] >= rowMin) { bottom = y; break }
  }

  return {
    left: (left / w) * 100,
    top: (top / h) * 100,
    right: (right / w) * 100,
    bottom: (bottom / h) * 100,
  }
}

// ======================== PIXEL ANALYSIS ========================

function regionDarkness(
  px: Buffer, w: number, h: number,
  cx: number, cy: number, r: number
): number {
  let sum = 0, n = 0
  const r2 = r * r
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const x = Math.round(cx + dx)
      const y = Math.round(cy + dy)
      if (x >= 0 && x < w && y >= 0 && y < h) {
        sum += px[y * w + x]
        n++
      }
    }
  }
  return n > 0 ? sum / n : 255
}

function detectBestInColumn(
  px: Buffer, w: number, h: number,
  cx: number, yPositions: number[],
  radius: number, threshold: number
): number | null {
  const darks = yPositions.map((y, i) => ({
    idx: i,
    val: regionDarkness(px, w, h, cx, y, radius),
  }))
  darks.sort((a, b) => a.val - b.val)
  if (darks[0].val < threshold && darks.length > 1 && (darks[1].val - darks[0].val) > 12) {
    return darks[0].idx
  }
  return null
}

// Map a sheet-relative fraction (0–1) to an absolute pixel position
function toAbsX(frac: number, sheetLeft: number, sheetW: number) {
  return Math.round(sheetLeft + frac * sheetW)
}
function toAbsY(frac: number, sheetTop: number, sheetH: number) {
  return Math.round(sheetTop + frac * sheetH)
}

// ======================== MAIN HANDLER ========================

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) {
      return NextResponse.json({ error: "No image file" }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const { data: pixels, info } = await sharp(buf)
      .resize(STD_W)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const W = info.width
    const H = info.height

    // Detect sheet boundaries using black timing marks
    const bounds = detectSheetBounds(pixels, W, H)
    const sL = Math.round((bounds.left / 100) * W)
    const sT = Math.round((bounds.top / 100) * H)
    const sR = Math.round((bounds.right / 100) * W)
    const sB = Math.round((bounds.bottom / 100) * H)
    const sW = sR - sL
    const sH = sB - sT

    // Adaptive threshold based on sheet area brightness
    let totalBrightness = 0, sampleCount = 0
    for (let y = sT; y < sB; y += 3) {
      for (let x = sL; x < sR; x += 3) {
        totalBrightness += pixels[y * W + x]
        sampleCount++
      }
    }
    const avgBrightness = sampleCount > 0 ? totalBrightness / sampleCount : 200
    const fillThreshold = avgBrightness * 0.68

    // ──── Part I: MCQ (40 questions) ────
    const part1: Record<number, string | null> = {}
    const rowStep = PART1.rows > 1 ? (PART1.yEnd - PART1.yStart) / (PART1.rows - 1) : 0

    for (const g of PART1.groups) {
      for (let r = 0; r < PART1.rows; r++) {
        const q = g.q0 + r
        const y = toAbsY(PART1.yStart + r * rowStep, sT, sH)
        const opts = ["A", "B", "C", "D"] as const
        const dark = opts.map(opt => ({
          opt,
          val: regionDarkness(pixels, W, H, toAbsX((g as any)[opt], sL, sW), y, BUBBLE_R),
        }))
        dark.sort((a, b) => a.val - b.val)

        if (dark[0].val < fillThreshold && (dark[1].val - dark[0].val) > 15) {
          part1[q] = dark[0].opt
        } else {
          part1[q] = null
        }
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
        const y = toAbsY(PART2.yHeaderEnd + si * p2SubStep, sT, sH)
        const dung = regionDarkness(pixels, W, H, toAbsX(box.dung, sL, sW), y, BUBBLE_R - 2)
        const sai = regionDarkness(pixels, W, H, toAbsX(box.sai, sL, sW), y, BUBBLE_R - 2)
        const diff = Math.abs(dung - sai)
        if (diff > 12 && Math.min(dung, sai) < fillThreshold) {
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
      const cx = toAbsX(box.x, sL, sW)
      const yPositions = Array.from({ length: PART3.rows }, (_, i) =>
        toAbsY(PART3.yStart + i * p3RowStep, sT, sH)
      )
      const digit = detectBestInColumn(pixels, W, H, cx, yPositions, BUBBLE_R - 2, fillThreshold)
      if (digit !== null) part3[box.q] = String(digit)
    }

    // ──── SBD ────
    let studentId = ""
    const sbdColStep = SBD.cols > 1 ? (SBD.xEnd - SBD.xStart) / (SBD.cols - 1) : 0
    const sbdRowStep = SBD.digits > 1 ? (SBD.yEnd - SBD.yStart) / (SBD.digits - 1) : 0
    for (let col = 0; col < SBD.cols; col++) {
      const cx = toAbsX(SBD.xStart + col * sbdColStep, sL, sW)
      const yPositions = Array.from({ length: SBD.digits }, (_, d) =>
        toAbsY(SBD.yStart + d * sbdRowStep, sT, sH)
      )
      const digit = detectBestInColumn(pixels, W, H, cx, yPositions, BUBBLE_R - 2, fillThreshold)
      if (digit !== null) studentId += String(digit)
    }

    // ──── Exam code ────
    let examCode = ""
    const ecColStep = EXAM_CODE.cols > 1 ? (EXAM_CODE.xEnd - EXAM_CODE.xStart) / (EXAM_CODE.cols - 1) : 0
    const ecRowStep = EXAM_CODE.digits > 1 ? (EXAM_CODE.yEnd - EXAM_CODE.yStart) / (EXAM_CODE.digits - 1) : 0
    for (let col = 0; col < EXAM_CODE.cols; col++) {
      const cx = toAbsX(EXAM_CODE.xStart + col * ecColStep, sL, sW)
      const yPositions = Array.from({ length: EXAM_CODE.digits }, (_, d) =>
        toAbsY(EXAM_CODE.yStart + d * ecRowStep, sT, sH)
      )
      const digit = detectBestInColumn(pixels, W, H, cx, yPositions, BUBBLE_R - 2, fillThreshold)
      if (digit !== null) examCode += String(digit)
    }

    const p1Filled = Object.values(part1).filter(v => v !== null).length

    return NextResponse.json({
      success: true,
      data: {
        examCode,
        studentId,
        studentName: "",
        part1,
        part2,
        part3,
        sheetBounds: bounds,
        imageWidth: W,
        imageHeight: H,
        avgBrightness: Math.round(avgBrightness),
        fillThreshold: Math.round(fillThreshold),
        confidence: { part1: Math.round((p1Filled / 40) * 100), sbd: studentId.length, examCode: examCode.length },
      },
    })
  } catch (error: any) {
    console.error("Recognition error:", error)
    return NextResponse.json({ error: error.message || "Recognition failed" }, { status: 500 })
  }
}
