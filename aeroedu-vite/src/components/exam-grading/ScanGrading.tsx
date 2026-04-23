
import { useState, useCallback, useRef, useEffect, DragEvent, ChangeEvent, useMemo } from 'react';
import {
  Upload, FileUp, X, Loader2, CheckCircle, Sparkles, Eye, EyeOff,
  Plus, Trash2, Save, Send, AlertTriangle, Edit3, ChevronDown, ChevronUp,
  FileText, Image, Camera, RotateCcw, Download, ZoomIn, Search, Filter,
  ArrowUpDown, Printer, ClipboardCheck, BarChart3, AlertCircle
} from 'lucide-react';

// ===================== HEIC CONVERSION =====================

const isHeicFile = (file: File): boolean => {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'
  );
};

type Heic2AnyFn = (options: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>;
let heic2anyModule: Heic2AnyFn | null = null;

const loadHeic2Any = (): Promise<Heic2AnyFn> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (heic2anyModule) return resolve(heic2anyModule);
    if ((window as any).heic2any) {
      heic2anyModule = (window as any).heic2any;
      return resolve(heic2anyModule!);
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    script.onload = () => {
      heic2anyModule = (window as any).heic2any;
      if (heic2anyModule) resolve(heic2anyModule);
      else reject(new Error('heic2any loaded but not found on window'));
    };
    script.onerror = () => reject(new Error('Failed to load heic2any from CDN'));
    document.head.appendChild(script);
  });
};

const convertHeicToJpeg = async (file: File): Promise<File> => {
  if (!isHeicFile(file)) return file;

  const heic2any = await loadHeic2Any();
  if (!heic2any) throw new Error('HEIC converter not available');

  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
  const blob = Array.isArray(result) ? result[0] : result;
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], newName, { type: 'image/jpeg' });
};

const processFiles = async (
  files: File[],
  onProgress?: (fileName: string) => void
): Promise<File[]> => {
  const results: File[] = [];
  for (const file of files) {
    if (isHeicFile(file)) {
      onProgress?.(file.name);
      try {
        results.push(await convertHeicToJpeg(file));
      } catch (err) {
        console.error(`Failed to convert ${file.name}:`, err);
        // Skip unconvertible files
      }
    } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(file.name)) {
      results.push(file);
    }
  }
  return results;
};

// ===================== TYPES =====================

export interface EssayQuestion {
  id: string;
  questionText: string;
  maxScore: number;
  rubric: string;
  sampleAnswer: string;
  notes: string;
}

export interface AnswerKey {
  dbId?: string;
  examName: string;
  examCode: string;
  examDate: string;
  studentName: string;
  studentId: string;
  examSite: string;
  examRoom: string;
  dob: string;
  part1: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  part2: Record<number, Record<string, boolean | null>>;
  part3: Record<number, string>;
  essayQuestions: EssayQuestion[];
}

interface SheetBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ScannedSheet {
  id: string;
  dbId?: string;
  fileName: string;
  preview: string;
  backPreview: string;
  backFileName: string;
  frontFile?: File;
  backFile?: File;
  frontImageUrl?: string;
  backImageUrl?: string;
  status: 'scanning' | 'scanned' | 'error';
  studentName: string;
  studentId: string;
  examCode: string;
  sheetBounds?: SheetBounds;
  detectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  detectedPart2: Record<number, Record<string, boolean | null>>;
  detectedPart3: Record<number, string>;
  essayScores: Record<string, number>;
  essayNotes: Record<string, string>;
  overrides: Set<number>;
  totalScore: number;
  maxScore: number;
  reviewed: boolean;
  published: boolean;
}

interface BubblePosition {
  x: number;
  y: number;
  label: string;
  section: 'part1' | 'part2' | 'part3';
  questionId: number;
  optionLabel: string;
  filled?: boolean;
  correct?: boolean;
}

interface DetectedMarker {
  x: number;
  y: number;
  size: number;
}

// ===================== CONSTANTS & TEMPLATE =====================
// Calibrated from real "PHIẾU TRẢ LỜI TRẮC NGHIỆM" standard Vietnamese answer sheet
// All coordinates are fractions [0..1] relative to sheet area (defined by corner markers)

const SHEET_TEMPLATE = {
  part1: {
    options: ['A', 'B', 'C', 'D'] as string[],
  },
  part2: {
    subItems: ['a', 'b', 'c', 'd'] as string[],
  },
  part3: {
    digitRows: ['-', ',', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as string[],
  },
};

// Pencil detection thresholds (tuned for graphite on white paper)
const PENCIL_DARK_THRESHOLD = 140;     // Pencil is lighter than print — use a higher threshold
const PENCIL_FILL_RATIO = 0.28;        // Lower fill ratio for pencil (they don't fill 100%)
const PRINT_DARK_THRESHOLD = 80;       // Printed text/lines are very dark
const CORNER_MARKER_MIN_SIZE = 0.005;  // Minimum corner marker size as fraction of image dimension
const CORNER_MARKER_MAX_SIZE = 0.04;   // Maximum corner marker size

// ===================== CORNER MARKER DETECTION =====================
// Finds the 4 black square alignment markers at corners of the answer sheet
// These markers are used to establish a coordinate reference frame

interface CornerMarkers {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  found: boolean;
}

function findCornerMarkers(canvas: HTMLCanvasElement): CornerMarkers {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return defaultCorners(w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Convert to grayscale
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Otsu's method for adaptive threshold
  const threshold = otsuThreshold(gray);
  const binaryThresh = Math.min(threshold * 0.7, PRINT_DARK_THRESHOLD);

  // Binary image
  const binary = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    binary[i] = gray[i] < binaryThresh ? 1 : 0;
  }

  // Find dark connected components using optimized flood-fill
  const visited = new Uint8Array(w * h);
  const candidates: { cx: number; cy: number; area: number; width: number; height: number; fillRatio: number }[] = [];

  const minArea = Math.round(w * CORNER_MARKER_MIN_SIZE) * Math.round(h * CORNER_MARKER_MIN_SIZE);
  const maxArea = Math.round(w * CORNER_MARKER_MAX_SIZE) * Math.round(h * CORNER_MARKER_MAX_SIZE);

  for (let startY = 0; startY < h; startY += 2) {
    for (let startX = 0; startX < w; startX += 2) {
      const si = startY * w + startX;
      if (visited[si] || binary[si] === 0) continue;

      // BFS flood fill
      const queue: number[] = [si];
      let qHead = 0;
      let minX = startX, maxX = startX, minY = startY, maxY = startY;
      let pixelCount = 0;

      while (qHead < queue.length) {
        const idx = queue[qHead++];
        if (visited[idx]) continue;
        visited[idx] = 1;
        pixelCount++;

        const py = Math.floor(idx / w);
        const px = idx % w;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;

        // Limit flood fill to prevent OOM on large dark areas
        if (pixelCount > maxArea * 2) break;

        if (px > 0 && !visited[idx - 1] && binary[idx - 1]) queue.push(idx - 1);
        if (px < w - 1 && !visited[idx + 1] && binary[idx + 1]) queue.push(idx + 1);
        if (py > 0 && !visited[idx - w] && binary[idx - w]) queue.push(idx - w);
        if (py < h - 1 && !visited[idx + w] && binary[idx + w]) queue.push(idx + w);
      }

      if (pixelCount >= minArea && pixelCount <= maxArea) {
        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;
        const aspectRatio = Math.max(bw, bh) / (Math.min(bw, bh) || 1);
        const fillRatio = pixelCount / (bw * bh);

        // Square-ish marker: aspect ratio close to 1, high fill ratio
        if (aspectRatio < 1.8 && fillRatio > 0.5) {
          candidates.push({
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2,
            area: pixelCount,
            width: bw,
            height: bh,
            fillRatio,
          });
        }
      }
    }
  }

  // Select 4 corners: pick candidates closest to each corner of the image
  if (candidates.length < 4) return defaultCorners(w, h);

  const corners = [
    { target: { x: 0, y: 0 }, label: 'topLeft' },
    { target: { x: w, y: 0 }, label: 'topRight' },
    { target: { x: 0, y: h }, label: 'bottomLeft' },
    { target: { x: w, y: h }, label: 'bottomRight' },
  ];

  const selected: Record<string, { x: number; y: number }> = {};

  for (const corner of corners) {
    let best = candidates[0];
    let bestDist = Infinity;

    for (const c of candidates) {
      const d = Math.hypot(c.cx - corner.target.x, c.cy - corner.target.y);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }

    selected[corner.label] = { x: best.cx / w, y: best.cy / h };
  }

  return {
    topLeft: selected.topLeft,
    topRight: selected.topRight,
    bottomLeft: selected.bottomLeft,
    bottomRight: selected.bottomRight,
    found: true,
  };
}

function defaultCorners(w: number, h: number): CornerMarkers {
  return {
    topLeft: { x: 0.015, y: 0.015 },
    topRight: { x: 0.985, y: 0.015 },
    bottomLeft: { x: 0.015, y: 0.985 },
    bottomRight: { x: 0.985, y: 0.985 },
    found: false,
  };
}

// Otsu's threshold — finds optimal binary threshold separating foreground/background
function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVar) {
      maxVar = variance;
      threshold = t;
    }
  }

  return threshold;
}

// ===================== PERSPECTIVE CORRECTION (LÀM PHẲNG TỜ GIẤY) =====================
// Straightens the scanned answer sheet by computing a homography from the 4 corner markers
// and warping the image to a perfect rectangle. This compensates for:
//   - Camera tilt/angle when photographing
//   - Paper curl, warp, or wrinkle
//   - Perspective distortion from non-perpendicular capture
//
// Algorithm: 4-point homography using Direct Linear Transform (DLT)
// Maps source quadrilateral (detected corners) → destination rectangle (flat sheet)

/**
 * Solve 3x3 homography matrix H such that dst = H * src (in homogeneous coords)
 * Given 4 point correspondences: src[i] → dst[i]
 * Uses Direct Linear Transform (DLT): builds 8x9 matrix A, solves Ah=0 via SVD-like approach
 */
function computeHomography(
  src: { x: number; y: number }[],
  dst: { x: number; y: number }[]
): number[] | null {
  if (src.length < 4 || dst.length < 4) return null;

  // Build 8x9 matrix A for DLT
  // For each point pair: two equations
  //   -sx*h1 - sy*h2 - h3 + dx*sx*h7 + dx*sy*h8 + dx*h9 = 0
  //   -sx*h4 - sy*h5 - h6 + dy*sx*h7 + dy*sy*h8 + dy*h9 = 0
  //
  // Rearranged to solve [h1..h8] with h9=1:
  // Build 8x8 system Ax = b

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x, sy = src[i].y;
    const dx = dst[i].x, dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  // Solve 8x8 linear system using Gaussian elimination with partial pivoting
  const h = solveLinearSystem(A, b);
  if (!h) return null;

  // H = [h0 h1 h2; h3 h4 h5; h6 h7 1]
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/**
 * Gaussian elimination with partial pivoting for Ax = b
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Augmented matrix [A|b]
  const aug = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find row with max |value| in this column
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null; // Singular matrix

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return x;
}

/**
 * Apply inverse homography to map destination pixel to source pixel
 * H maps src→dst, so H_inv maps dst→src
 */
function applyHomographyInverse(
  H: number[],
  dx: number,
  dy: number
): { x: number; y: number } {
  // H = [h0 h1 h2; h3 h4 h5; h6 h7 1]
  // For inverse mapping, we compute H^-1 analytically for 3x3 matrix
  // But it's simpler to invert the matrix once and cache it
  // Here we just apply the pre-computed inverse
  const w = H[6] * dx + H[7] * dy + H[8];
  if (Math.abs(w) < 1e-10) return { x: dx, y: dy };
  return {
    x: (H[0] * dx + H[1] * dy + H[2]) / w,
    y: (H[3] * dx + H[4] * dy + H[5]) / w,
  };
}

/**
 * Invert a 3x3 matrix stored as flat array [a b c; d e f; g h i]
 */
function invertHomography(H: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = H;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1 / det;
  return [
    (e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet,
    (f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet,
    (d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet,
  ];
}

/**
 * Warp the source canvas to a flat rectangle using perspective transform.
 * Uses bilinear interpolation for smooth output.
 *
 * @param srcCanvas - Original (distorted) image canvas
 * @param corners  - Detected corner markers in normalized [0,1] coordinates
 * @param outputWidth  - Width of the output (rectified) image
 * @param outputHeight - Height of the output (rectified) image
 * @returns A new canvas with the perspective-corrected image, or null if transform fails
 */
function perspectiveWarp(
  srcCanvas: HTMLCanvasElement,
  corners: CornerMarkers,
  outputWidth?: number,
  outputHeight?: number
): HTMLCanvasElement | null {
  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return null;

  // Source points (corner markers in pixel coordinates)
  const srcPts = [
    { x: corners.topLeft.x * srcW, y: corners.topLeft.y * srcH },
    { x: corners.topRight.x * srcW, y: corners.topRight.y * srcH },
    { x: corners.bottomRight.x * srcW, y: corners.bottomRight.y * srcH },
    { x: corners.bottomLeft.x * srcW, y: corners.bottomLeft.y * srcH },
  ];

  // Compute output dimensions from the corner marker distances
  // Top edge width, bottom edge width → take max
  const topW = Math.hypot(srcPts[1].x - srcPts[0].x, srcPts[1].y - srcPts[0].y);
  const botW = Math.hypot(srcPts[2].x - srcPts[3].x, srcPts[2].y - srcPts[3].y);
  const leftH = Math.hypot(srcPts[3].x - srcPts[0].x, srcPts[3].y - srcPts[0].y);
  const rightH = Math.hypot(srcPts[2].x - srcPts[1].x, srcPts[2].y - srcPts[1].y);

  const dstW = outputWidth || Math.round(Math.max(topW, botW));
  const dstH = outputHeight || Math.round(Math.max(leftH, rightH));

  if (dstW < 100 || dstH < 100) return null;

  // Destination points (perfect rectangle)
  const dstPts = [
    { x: 0, y: 0 },        // top-left
    { x: dstW, y: 0 },     // top-right
    { x: dstW, y: dstH },  // bottom-right
    { x: 0, y: dstH },     // bottom-left
  ];

  // Compute homography: dst → src (inverse mapping for each output pixel)
  const H = computeHomography(dstPts, srcPts);
  if (!H) return null;

  // Get source pixel data
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcPixels = srcData.data;

  // Create output canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) return null;

  const dstData = dstCtx.createImageData(dstW, dstH);
  const dstPixels = dstData.data;

  // For each output pixel, find source pixel via homography and bilinear interpolation
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      // Map destination pixel → source pixel
      const w = H[6] * dx + H[7] * dy + H[8];
      if (Math.abs(w) < 1e-10) continue;
      const sx = (H[0] * dx + H[1] * dy + H[2]) / w;
      const sy = (H[3] * dx + H[4] * dy + H[5]) / w;

      // Bilinear interpolation
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;

      if (x0 < 0 || x1 >= srcW || y0 < 0 || y1 >= srcH) continue;

      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      const dstIdx = (dy * dstW + dx) * 4;
      for (let c = 0; c < 4; c++) {
        dstPixels[dstIdx + c] = Math.round(
          srcPixels[i00 + c] * w00 +
          srcPixels[i10 + c] * w10 +
          srcPixels[i01 + c] * w01 +
          srcPixels[i11 + c] * w11
        );
      }
    }
  }

  dstCtx.putImageData(dstData, 0, 0);
  return dstCanvas;
}

/**
 * Quick skew angle detection using horizontal line analysis (Hough-lite).
 * Finds the dominant angle of horizontal printed lines and rotates to correct.
 * Useful as a pre-step before perspective correction.
 */
function detectSkewAngle(canvas: HTMLCanvasElement): number {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Convert to grayscale
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Detect horizontal edges (Sobel-like)
  const edges = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gy = -gray[(y - 1) * w + x] + gray[(y + 1) * w + x];
      edges[y * w + x] = Math.abs(gy) > 30 ? 1 : 0;
    }
  }

  // Accumulate angles from edge pixel pairs (simplified Hough)
  // Sample edge pixels and compute angle of horizontal line segments
  const angleVotes = new Float64Array(361); // -18.0° to +18.0° in 0.1° steps
  const sampleStep = Math.max(1, Math.floor(w / 200));

  for (let y = Math.floor(h * 0.2); y < Math.floor(h * 0.8); y += 3) {
    // Find horizontal runs of edge pixels
    let runStart = -1;
    for (let x = 0; x < w; x += sampleStep) {
      if (edges[y * w + x]) {
        if (runStart === -1) runStart = x;
      } else {
        if (runStart >= 0) {
          const runLen = x - runStart;
          if (runLen > w * 0.05) {
            // Good horizontal segment, check nearby rows for offset
            const midX = Math.floor((runStart + x) / 2);
            for (let dy = -5; dy <= 5; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= h) continue;
              if (edges[ny * w + midX]) {
                const angle = Math.atan2(dy, runLen) * 180 / Math.PI;
                const bin = Math.round((angle + 18) * 10);
                if (bin >= 0 && bin < 361) angleVotes[bin]++;
              }
            }
          }
          runStart = -1;
        }
      }
    }
  }

  // Find peak angle
  let maxVote = 0;
  let peakBin = 180; // 0° default
  for (let i = 0; i < 361; i++) {
    if (angleVotes[i] > maxVote) {
      maxVote = angleVotes[i];
      peakBin = i;
    }
  }

  return (peakBin / 10) - 18; // Convert bin back to degrees
}

/**
 * Rotate canvas by a small angle (for deskewing)
 */
function rotateCanvas(
  srcCanvas: HTMLCanvasElement,
  angleDeg: number
): HTMLCanvasElement {
  if (Math.abs(angleDeg) < 0.1) return srcCanvas; // Skip if negligible

  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const angleRad = (angleDeg * Math.PI) / 180;

  // Compute new bounding box
  const cos = Math.abs(Math.cos(angleRad));
  const sin = Math.abs(Math.sin(angleRad));
  const newW = Math.ceil(w * cos + h * sin);
  const newH = Math.ceil(w * sin + h * cos);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = newW;
  dstCanvas.height = newH;
  const ctx = dstCanvas.getContext('2d')!;

  // Translate to center, rotate, translate back
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(angleRad);
  ctx.drawImage(srcCanvas, -w / 2, -h / 2);

  return dstCanvas;
}

/**
 * Full image straightening pipeline:
 * 1. Detect skew angle → rotate to level
 * 2. Find corner markers
 * 3. If corners found → apply perspective warp to flatten
 * 4. Return corrected canvas + new corners for bubble mapping
 */
function straightenSheet(
  srcCanvas: HTMLCanvasElement
): { canvas: HTMLCanvasElement; corners: CornerMarkers; corrected: boolean } {
  const t0 = performance.now();

  // Step 1: Detect and correct small rotation (skew from tilted camera)
  const skewAngle = detectSkewAngle(srcCanvas);
  let workCanvas = srcCanvas;
  if (Math.abs(skewAngle) > 0.3 && Math.abs(skewAngle) < 15) {
    workCanvas = rotateCanvas(srcCanvas, -skewAngle);
    console.log(`[straightenSheet] Deskew: rotated ${skewAngle.toFixed(1)}°`);
  }

  // Step 2: Find corner markers on the (possibly rotated) image
  const corners = findCornerMarkers(workCanvas);

  if (!corners.found) {
    console.log('[straightenSheet] No corner markers found, using original image');
    return { canvas: workCanvas, corners, corrected: false };
  }

  // Step 3: Check if perspective correction is needed
  // If corners form a near-perfect rectangle, skip the expensive warp
  const w = workCanvas.width;
  const h = workCanvas.height;
  const tl = { x: corners.topLeft.x * w, y: corners.topLeft.y * h };
  const tr = { x: corners.topRight.x * w, y: corners.topRight.y * h };
  const bl = { x: corners.bottomLeft.x * w, y: corners.bottomLeft.y * h };
  const br = { x: corners.bottomRight.x * w, y: corners.bottomRight.y * h };

  // Measure how "rectangular" the corners are
  // A perfect rectangle has parallel sides and equal diagonals
  const topAngle = Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI;
  const botAngle = Math.atan2(br.y - bl.y, br.x - bl.x) * 180 / Math.PI;
  const leftAngle = Math.atan2(bl.y - tl.y, bl.x - tl.x) * 180 / Math.PI;
  const rightAngle = Math.atan2(br.y - tr.y, br.x - tr.x) * 180 / Math.PI;

  const horizontalSkew = Math.abs(topAngle - botAngle);
  const verticalSkew = Math.abs(leftAngle - rightAngle);
  const maxSkew = Math.max(horizontalSkew, verticalSkew);

  console.log(`[straightenSheet] Corner analysis: h-skew=${horizontalSkew.toFixed(2)}°, v-skew=${verticalSkew.toFixed(2)}°, max=${maxSkew.toFixed(2)}°`);

  if (maxSkew < 0.5) {
    // Already very rectangular, skip warp
    console.log('[straightenSheet] Sheet is already flat enough, skipping warp');
    return { canvas: workCanvas, corners, corrected: false };
  }

  // Step 4: Apply perspective warp
  const warped = perspectiveWarp(workCanvas, corners);
  if (!warped) {
    console.log('[straightenSheet] Perspective warp failed, using original');
    return { canvas: workCanvas, corners, corrected: false };
  }

  // After warping, corners are at the edges of the output canvas
  const newCorners: CornerMarkers = {
    topLeft: { x: 0.005, y: 0.005 },
    topRight: { x: 0.995, y: 0.005 },
    bottomLeft: { x: 0.005, y: 0.995 },
    bottomRight: { x: 0.995, y: 0.995 },
    found: true,
  };

  const elapsed = performance.now() - t0;
  console.log(`[straightenSheet] ✅ Perspective corrected in ${elapsed.toFixed(0)}ms (${warped.width}x${warped.height})`);

  return { canvas: warped, corners: newCorners, corrected: true };
}

// Bilinear coordinate transform: maps normalized [0,1] to pixel coordinates
// using the 4 detected corner markers as reference frame
function mapNormToPixel(
  nx: number,
  ny: number,
  corners: CornerMarkers,
  imgW: number,
  imgH: number
): { x: number; y: number } {
  const tl = corners.topLeft;
  const tr = corners.topRight;
  const bl = corners.bottomLeft;
  const br = corners.bottomRight;

  // Bilinear interpolation
  const topX = tl.x + (tr.x - tl.x) * nx;
  const topY = tl.y + (tr.y - tl.y) * nx;
  const botX = bl.x + (br.x - bl.x) * nx;
  const botY = bl.y + (br.y - bl.y) * nx;

  return {
    x: (topX + (botX - topX) * ny) * imgW,
    y: (topY + (botY - topY) * ny) * imgH,
  };
}

// ===================== LEGACY WRAPPER =====================
// Keep findMarkers for backward compatibility
function findMarkers(canvas: HTMLCanvasElement): DetectedMarker[] {
  const corners = findCornerMarkers(canvas);
  if (!corners.found) return [];
  return [
    { x: corners.topLeft.x, y: corners.topLeft.y, size: 10 },
    { x: corners.topRight.x, y: corners.topRight.y, size: 10 },
    { x: corners.bottomLeft.x, y: corners.bottomLeft.y, size: 10 },
    { x: corners.bottomRight.x, y: corners.bottomRight.y, size: 10 },
  ];
}

// ===================== BUBBLE COORDINATE MAPPING =====================
// All bubble positions are defined in TEMPLATE-ABSOLUTE coordinates (0..1 of full sheet)
// from template_config.py, then transformed to CORNER-MARKER-RELATIVE coordinates
// for use with mapNormToPixel() which uses the 4 detected corner markers as reference frame.
//
// The outermost corner markers on the template are:
//   Top-Left:  p1_t_left  = (0.022, 0.315)
//   Top-Right: p1_t_right = (0.975, 0.315)
//   Bot-Left:  p3_b_left  = (0.022, 0.980)
//   Bot-Right: p3_b_right = (0.975, 0.980)
//
// After perspective warp, these markers map to the canvas edges, so all bubble coordinates
// must be expressed relative to this marker frame, NOT the full template.

// Corner marker positions in template-absolute coordinates
const MARKER_TL = { x: 0.022, y: 0.315 };
const MARKER_BR = { x: 0.975, y: 0.980 };
const MARKER_SCALE_X = MARKER_BR.x - MARKER_TL.x; // ≈ 0.953
const MARKER_SCALE_Y = MARKER_BR.y - MARKER_TL.y; // ≈ 0.665

/** Transform template-absolute coordinate to corner-marker-relative coordinate */
function tmpl(tx: number, ty: number): { nx: number; ny: number } {
  return {
    nx: (tx - MARKER_TL.x) / MARKER_SCALE_X,
    ny: (ty - MARKER_TL.y) / MARKER_SCALE_Y,
  };
}

function mapBubbleCoordinates(
  markers: DetectedMarker[],
  imageWidth: number,
  imageHeight: number
): BubblePosition[] {
  // Reconstruct corner markers from legacy format, or use defaults
  let corners: CornerMarkers;
  if (markers.length >= 4) {
    const sorted = [...markers];
    const tl = sorted.reduce((a, b) => (a.x + a.y < b.x + b.y ? a : b));
    const br = sorted.reduce((a, b) => (a.x + a.y > b.x + b.y ? a : b));
    const tr = sorted.reduce((a, b) => (a.x - a.y > b.x - b.y ? a : b));
    const bl = sorted.reduce((a, b) => (a.y - a.x > b.y - b.x ? a : b));
    corners = { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br, found: true };
  } else {
    corners = defaultCorners(imageWidth, imageHeight);
  }

  const bubbles: BubblePosition[] = [];
  // mp takes TEMPLATE-ABSOLUTE coords, transforms to marker-relative, then maps to pixels
  const mp = (tx: number, ty: number) => {
    const { nx, ny } = tmpl(tx, ty);
    return mapNormToPixel(nx, ny, corners, imageWidth, imageHeight);
  };

  // ─── PHẦN I: 40 câu trắc nghiệm ABCD ─────────────────────────
  // All coordinates are in TEMPLATE-ABSOLUTE space (from template_config.py)
  // The mp() function handles the transform to marker-relative space

  const P1_FIRST_ROW_Y = 0.342;   // Y center of first bubble row (Q1/11/21/31)
  const P1_LAST_ROW_Y = 0.555;    // Y center of last bubble row (Q10/20/30/40)
  const P1_ROW_SPACING = (P1_LAST_ROW_Y - P1_FIRST_ROW_Y) / 9;

  // Column groups — bubble center X positions for A, B, C, D
  // Measured from standard template (template_config.py ground truth)
  const P1_COLS = [
    { qStart: 1,  optXs: [0.052, 0.082, 0.112, 0.142] },  // Column 1: Q1-10
    { qStart: 11, optXs: [0.286, 0.316, 0.346, 0.376] },  // Column 2: Q11-20
    { qStart: 21, optXs: [0.520, 0.550, 0.580, 0.610] },  // Column 3: Q21-30
    { qStart: 31, optXs: [0.752, 0.782, 0.812, 0.842] },  // Column 4: Q31-40
  ];

  for (const col of P1_COLS) {
    for (let r = 0; r < 10; r++) {
      const q = col.qStart + r;
      const ty = P1_FIRST_ROW_Y + r * P1_ROW_SPACING;

      for (let i = 0; i < 4; i++) {
        const { x, y } = mp(col.optXs[i], ty);
        bubbles.push({
          x, y,
          label: `Q${q}-${SHEET_TEMPLATE.part1.options[i]}`,
          section: 'part1',
          questionId: q,
          optionLabel: SHEET_TEMPLATE.part1.options[i],
        });
      }
    }
  }

  // ─── PHẦN II: 8 câu Đúng/Sai ─────────────────────────────────
  // 4 groups of 2 questions each: (Câu 1,2), (Câu 3,4), (Câu 5,6), (Câu 7,8)
  // Each question has 4 sub-items: a, b, c, d
  // Each sub-item has 2 bubbles: Đúng (●) and Sai (●)

  const P2_FIRST_ROW_Y = 0.618;   // Y center of first sub-item row (from template_config)
  const P2_SUB_SPACING = 0.024;    // Y gap between sub-items (a→b→c→d) = (0.690 - 0.618) / 3
  const P2_QUESTION_GAP = 0.003;   // Extra Y gap between questions within a group

  // X positions from template_config PART2_LAYOUT.questions[].dung/sai
  const P2_GROUPS = [
    { qStart: 1, dongX: 0.048, saiX: 0.078, dongX2: 0.148, saiX2: 0.178 }, // Câu 1 + Câu 2
    { qStart: 3, dongX: 0.268, saiX: 0.298, dongX2: 0.368, saiX2: 0.398 }, // Câu 3 + Câu 4
    { qStart: 5, dongX: 0.510, saiX: 0.540, dongX2: 0.618, saiX2: 0.648 }, // Câu 5 + Câu 6
    { qStart: 7, dongX: 0.738, saiX: 0.768, dongX2: 0.858, saiX2: 0.888 }, // Câu 7 + Câu 8
  ];

  for (const grp of P2_GROUPS) {
    // Question 1 of group (e.g., Câu 1)
    for (let s = 0; s < 4; s++) {
      const ty = P2_FIRST_ROW_Y + s * P2_SUB_SPACING;
      const sub = SHEET_TEMPLATE.part2.subItems[s];
      const { x: dx, y: dy } = mp(grp.dongX, ty);
      bubbles.push({ x: dx, y: dy, label: `Q${grp.qStart}-${sub}-Đ`, section: 'part2', questionId: grp.qStart, optionLabel: sub });
      const { x: sx, y: sy } = mp(grp.saiX, ty);
      bubbles.push({ x: sx, y: sy, label: `Q${grp.qStart}-${sub}-S`, section: 'part2', questionId: grp.qStart, optionLabel: sub });
    }
    // Question 2 of group (e.g., Câu 2)
    for (let s = 0; s < 4; s++) {
      const ty = P2_FIRST_ROW_Y + s * P2_SUB_SPACING;
      const sub = SHEET_TEMPLATE.part2.subItems[s];
      const { x: dx, y: dy } = mp(grp.dongX2, ty);
      bubbles.push({ x: dx, y: dy, label: `Q${grp.qStart + 1}-${sub}-Đ`, section: 'part2', questionId: grp.qStart + 1, optionLabel: sub });
      const { x: sx, y: sy } = mp(grp.saiX2, ty);
      bubbles.push({ x: sx, y: sy, label: `Q${grp.qStart + 1}-${sub}-S`, section: 'part2', questionId: grp.qStart + 1, optionLabel: sub });
    }
  }

  // ─── PHẦN III: 6 câu trả lời ngắn ─────────────────────────────
  // Each question has 5 digit columns × 12 rows
  // Digit rows: -, comma, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9

  const P3_FIRST_ROW_Y = 0.745;   // Y center of first digit row ('-') from template_config
  const P3_LAST_ROW_Y = 0.968;    // Y center of last digit row ('9')
  const P3_DIGIT_ROW_SPACING = (P3_LAST_ROW_Y - P3_FIRST_ROW_Y) / 11;  // = 0.02027

  // Each question has 5 digit columns (from template_config PART3_LAYOUT)
  const P3_QUESTIONS = [
    { q: 1, cols: [0.042, 0.060, 0.078, 0.096, 0.114] },
    { q: 2, cols: [0.205, 0.223, 0.241, 0.259, 0.277] },
    { q: 3, cols: [0.370, 0.388, 0.406, 0.424, 0.442] },
    { q: 4, cols: [0.535, 0.553, 0.571, 0.589, 0.607] },
    { q: 5, cols: [0.695, 0.713, 0.731, 0.749, 0.767] },
    { q: 6, cols: [0.860, 0.878, 0.896, 0.914, 0.932] },
  ];

  for (const pq of P3_QUESTIONS) {
    for (let row = 0; row < 12; row++) {
      const ty = P3_FIRST_ROW_Y + row * P3_DIGIT_ROW_SPACING;
      for (let col = 0; col < 5; col++) {
        const tx = pq.cols[col];
        const { x, y } = mp(tx, ty);
        bubbles.push({
          x, y,
          label: `Q${pq.q}-col${col}-${SHEET_TEMPLATE.part3.digitRows[row]}`,
          section: 'part3',
          questionId: pq.q,
          optionLabel: SHEET_TEMPLATE.part3.digitRows[row],
        });
      }
    }
  }

  return bubbles;
}

// ===================== PENCIL FILL DETECTION =====================
// Detects whether each bubble has been filled in with pencil
// Uses adaptive thresholding: compares bubble darkness to surrounding paper

function detectBubbles(canvas: HTMLCanvasElement, bubblePositions: BubblePosition[]): BubblePosition[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return bubblePositions;

  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Precompute grayscale
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  // Adaptive sampling radius — scales with image size
  const bubbleRadius = Math.max(6, Math.round(Math.min(w, h) * 0.008));
  const surroundRadius = bubbleRadius * 3; // Larger area to sample paper background

  for (const bubble of bubblePositions) {
    const cx = Math.round(bubble.x);
    const cy = Math.round(bubble.y);

    if (cx < 0 || cx >= w || cy < 0 || cy >= h) {
      bubble.filled = false;
      continue;
    }

    // Sample bubble center intensity
    let bubbleSum = 0, bubbleCount = 0;
    for (let dy = -bubbleRadius; dy <= bubbleRadius; dy++) {
      for (let dx = -bubbleRadius; dx <= bubbleRadius; dx++) {
        if (dx * dx + dy * dy > bubbleRadius * bubbleRadius) continue; // Circular sample
        const px = cx + dx, py = cy + dy;
        if (px >= 0 && px < w && py >= 0 && py < h) {
          bubbleSum += gray[py * w + px];
          bubbleCount++;
        }
      }
    }

    // Sample surrounding paper intensity (ring around the bubble)
    let paperSum = 0, paperCount = 0;
    for (let dy = -surroundRadius; dy <= surroundRadius; dy += 2) {
      for (let dx = -surroundRadius; dx <= surroundRadius; dx += 2) {
        const dist2 = dx * dx + dy * dy;
        if (dist2 < bubbleRadius * bubbleRadius * 4 || dist2 > surroundRadius * surroundRadius) continue;
        const px = cx + dx, py = cy + dy;
        if (px >= 0 && px < w && py >= 0 && py < h) {
          paperSum += gray[py * w + px];
          paperCount++;
        }
      }
    }

    const bubbleMean = bubbleCount > 0 ? bubbleSum / bubbleCount : 200;
    const paperMean = paperCount > 0 ? paperSum / paperCount : 220;

    // Pencil detection: bubble is significantly darker than surrounding paper
    // The contrast ratio accounts for varying lighting conditions
    const contrast = paperMean > 0 ? bubbleMean / paperMean : 1;

    // A filled bubble with pencil has contrast < 0.75 (darker than paper)
    // Also check absolute darkness — pencil marks are typically < 140 gray
    bubble.filled = (contrast < 0.72 && bubbleMean < PENCIL_DARK_THRESHOLD)
                 || (bubbleMean < PRINT_DARK_THRESHOLD); // Very dark = definitely filled

    // Store the contrast for debugging
    (bubble as any)._contrast = contrast;
    (bubble as any)._mean = bubbleMean;
    (bubble as any)._paper = paperMean;
  }

  return bubblePositions;
}

// ===================== BUBBLE OVERLAY COMPONENT =====================

function BubbleOverlay({
  imageUrl,
  bubbles,
  answerKey,
  detectedAnswers,
  detectedPart2,
  detectedPart3,
  onBubbleClick,
}: {
  imageUrl: string;
  bubbles: BubblePosition[];
  answerKey: AnswerKey;
  detectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
  detectedPart2: Record<number, Record<string, boolean | null>>;
  detectedPart3: Record<number, string>;
  onBubbleClick: (bubble: BubblePosition) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const newImg = document.createElement('img');
    newImg.crossOrigin = 'anonymous';
    newImg.src = imageUrl;
    newImg.onload = () => {
      imgRef.current = newImg;
      setImageDims({ width: newImg.naturalWidth, height: newImg.naturalHeight });
      setImageLoaded(true);
    };
  }, [imageUrl]);

  // Draw canvas: image + colored bubble overlay
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to natural image resolution
    canvas.width = imageDims.width;
    canvas.height = imageDims.height;

    // Draw the base image
    ctx.drawImage(imgRef.current, 0, 0, imageDims.width, imageDims.height);

    // Adaptive bubble radius based on image size
    const bubbleRadius = Math.max(8, Math.round(imageDims.width * 0.012));
    const lineWidth = Math.max(2, Math.round(bubbleRadius * 0.35));

    // For Part I: determine which option is the correct answer per question
    const correctPart1: Record<number, string> = {};
    for (let q = 1; q <= 40; q++) {
      const val = answerKey.part1[q];
      if (val) correctPart1[q] = val;
    }

    for (const bubble of bubbles) {
      if (bubble.section !== 'part1') continue;

      const q = bubble.questionId;
      const opt = bubble.optionLabel;
      const studentAnswer = detectedAnswers[q];
      const correctAnswer = correctPart1[q];

      const isStudentChoice = studentAnswer === opt;
      const isCorrectOption = correctAnswer === opt;

      if (isStudentChoice && isCorrectOption) {
        // ✓ Student chose the correct answer → BIG GREEN circle
        drawBubble(ctx, bubble.x, bubble.y, bubbleRadius, {
          fill: 'rgba(34, 197, 94, 0.55)',
          stroke: '#16a34a',
          lineWidth: lineWidth + 1,
          icon: 'check',
        });
      } else if (isStudentChoice && !isCorrectOption) {
        // ✗ Student chose wrong answer → BIG RED circle
        drawBubble(ctx, bubble.x, bubble.y, bubbleRadius, {
          fill: 'rgba(239, 68, 68, 0.55)',
          stroke: '#dc2626',
          lineWidth: lineWidth + 1,
          icon: 'cross',
        });
      } else if (!isStudentChoice && isCorrectOption) {
        // Correct answer student missed → YELLOW ring
        drawBubble(ctx, bubble.x, bubble.y, bubbleRadius, {
          fill: 'rgba(250, 204, 21, 0.25)',
          stroke: '#eab308',
          lineWidth: lineWidth,
          icon: 'none',
        });
      }
      // else: not selected, not correct → skip (no overlay)
    }

    // Part II bubbles
    for (const bubble of bubbles) {
      if (bubble.section !== 'part2') continue;
      const q = bubble.questionId;
      const sub = bubble.optionLabel; // a, b, c, d
      const keyVal = answerKey.part2[q]?.[sub];
      const detVal = detectedPart2[q]?.[sub];

      if (keyVal == null || detVal == null) continue;

      const isCorrect = detVal === keyVal;
      if (detVal !== null) {
        drawBubble(ctx, bubble.x, bubble.y, bubbleRadius * 0.8, {
          fill: isCorrect ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          stroke: isCorrect ? '#16a34a' : '#dc2626',
          lineWidth,
          icon: isCorrect ? 'check' : 'cross',
        });
      }
    }
  }, [imageLoaded, imageDims, bubbles, detectedAnswers, detectedPart2, detectedPart3, answerKey]);

  // Handle click: convert display coords to natural coords
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || bubbles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = imageDims.width / rect.width;
    const scaleY = imageDims.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hitRadius = Math.max(15, imageDims.width * 0.02);

    let closest: BubblePosition | null = null;
    let minDist = Infinity;
    for (const b of bubbles) {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < minDist) { minDist = d; closest = b; }
    }

    if (closest && minDist < hitRadius) {
      onBubbleClick(closest);
    }
  }, [bubbles, imageDims, onBubbleClick]);

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-auto cursor-pointer rounded-lg border border-border"
        style={{ display: 'block' }}
        onClick={handleClick}
      />
    </div>
  );
}

// Helper: draw a single colored bubble with optional icon
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  opts: { fill: string; stroke: string; lineWidth: number; icon: 'check' | 'cross' | 'none' }
) {
  ctx.save();

  // Filled circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = opts.fill;
  ctx.fill();
  ctx.strokeStyle = opts.stroke;
  ctx.lineWidth = opts.lineWidth;
  ctx.stroke();

  // Icon inside
  const iconSize = radius * 0.55;
  ctx.strokeStyle = opts.stroke;
  ctx.lineWidth = Math.max(2, opts.lineWidth * 0.8);
  ctx.lineCap = 'round';

  if (opts.icon === 'check') {
    ctx.beginPath();
    ctx.moveTo(x - iconSize * 0.6, y);
    ctx.lineTo(x - iconSize * 0.1, y + iconSize * 0.5);
    ctx.lineTo(x + iconSize * 0.7, y - iconSize * 0.5);
    ctx.stroke();
  } else if (opts.icon === 'cross') {
    ctx.beginPath();
    ctx.moveTo(x - iconSize * 0.5, y - iconSize * 0.5);
    ctx.lineTo(x + iconSize * 0.5, y + iconSize * 0.5);
    ctx.moveTo(x + iconSize * 0.5, y - iconSize * 0.5);
    ctx.lineTo(x - iconSize * 0.5, y + iconSize * 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

// ===================== ANSWER COMPARISON GRID =====================

function AnswerComparisonGrid({
  sheet,
  answerKey,
  updateDetectedAnswers,
  updateDetectedPart2,
  updateDetectedPart3,
}: {
  sheet: ScannedSheet;
  answerKey: AnswerKey;
  updateDetectedAnswers: (sheetId: string, q: number, ans: 'A' | 'B' | 'C' | 'D' | null) => void;
  updateDetectedPart2: (sheetId: string, q: number, sub: string, val: boolean | null) => void;
  updateDetectedPart3: (sheetId: string, q: number, val: string) => void;
}) {
  const opts: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  // Helper: get bubble color for Part I
  const getPart1BubbleStyle = (q: number, opt: 'A' | 'B' | 'C' | 'D') => {
    const detected = sheet.detectedAnswers[q];
    const keyAns = answerKey.part1[q];
    const isDetected = detected === opt;
    const isKey = keyAns === opt;
    const hasKey = keyAns !== null && keyAns !== undefined;

    if (isDetected && hasKey && isKey) {
      // Correct answer selected — green
      return 'bg-green-500 text-white border-green-600 shadow-[0_0_6px_rgba(34,197,94,0.5)]';
    } else if (isDetected && hasKey && !isKey) {
      // Wrong answer selected — red
      return 'bg-red-500 text-white border-red-600 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
    } else if (!isDetected && hasKey && isKey) {
      // Correct answer but student didn't select — yellow outline (show what was correct)
      return 'bg-transparent text-yellow-500 border-yellow-500 border-2';
    } else if (isDetected && !hasKey) {
      // Student selected but no key — purple (detected, no grading)
      return 'bg-purple-500/30 text-purple-300 border-purple-500';
    }
    // Not selected, not key — default empty
    return 'bg-transparent text-muted-foreground/40 border-border/50';
  };

  // Helper: get bubble color for Part II (True/False)
  const getPart2BubbleStyle = (q: number, sub: string, val: boolean) => {
    const detected = sheet.detectedPart2[q]?.[sub];
    const keyVal = answerKey.part2[q]?.[sub];
    const isDetected = detected === val;
    const hasKey = keyVal !== null && keyVal !== undefined;

    if (isDetected && hasKey && keyVal === val) {
      return 'bg-green-500 text-white border-green-600 shadow-[0_0_6px_rgba(34,197,94,0.5)]';
    } else if (isDetected && hasKey && keyVal !== val) {
      return 'bg-red-500 text-white border-red-600 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
    } else if (!isDetected && hasKey && keyVal === val) {
      return 'bg-transparent text-yellow-500 border-yellow-500 border-2';
    } else if (isDetected && !hasKey) {
      return 'bg-purple-500/30 text-purple-300 border-purple-500';
    }
    return 'bg-transparent text-muted-foreground/40 border-border/50';
  };

  // Part I score details
  const part1Stats = (() => {
    let correct = 0;
    let total = 0;
    for (let q = 1; q <= 40; q++) {
      const k = answerKey.part1[q];
      if (k !== null && k !== undefined) {
        total++;
        if (sheet.detectedAnswers[q] === k) correct++;
      }
    }
    return { correct, total, score: correct * 0.25 };
  })();

  // Part II score details
  const part2Stats = (() => {
    let totalScore = 0;
    let totalQuestions = 0;
    for (let q = 1; q <= 8; q++) {
      const keyQ = answerKey.part2[q];
      if (!keyQ) continue;
      const subs = ['a', 'b', 'c', 'd'];
      let correctSubs = 0;
      let totalSubs = 0;
      for (const sub of subs) {
        if (keyQ[sub] === null || keyQ[sub] === undefined) continue;
        totalSubs++;
        if (sheet.detectedPart2[q]?.[sub] === keyQ[sub]) correctSubs++;
      }
      if (totalSubs > 0) {
        totalQuestions++;
        if (correctSubs === totalSubs) totalScore += 1;
        else if (correctSubs >= totalSubs - 1 && correctSubs >= 3) totalScore += 0.5;
      }
    }
    return { totalScore, totalQuestions };
  })();

  // Part III score details
  const part3Stats = (() => {
    let correct = 0;
    let total = 0;
    for (let q = 1; q <= 6; q++) {
      const k = answerKey.part3[q];
      if (!k || k.trim().length === 0) continue;
      total++;
      const s = sheet.detectedPart3[q]?.trim() || '';
      if (s.toLowerCase() === k.trim().toLowerCase()) correct++;
    }
    return { correct, total, score: correct * 1 };
  })();

  return (
    <div className="space-y-5">
      {/* ─── PHẦN I — Trắc nghiệm ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">PHẦN I — Trắc nghiệm</span>
          <span className="text-white/90 text-xs font-medium">
            {part1Stats.correct}/{part1Stats.total} đúng = {part1Stats.score.toFixed(2)}đ
          </span>
        </div>
        <div className="p-3">
          {/* Header row */}
          <div className="grid grid-cols-[40px_repeat(4,1fr)] gap-0 mb-1">
            <div className="text-[10px] text-muted-foreground text-center font-bold">Câu</div>
            {opts.map(o => (
              <div key={o} className="text-[10px] text-muted-foreground text-center font-bold">{o}</div>
            ))}
          </div>
          {/* Question rows — 4 columns of 10 */}
          <div className="grid grid-cols-4 gap-x-3 gap-y-0">
            {[0, 1, 2, 3].map(col => (
              <div key={col} className="space-y-0.5">
                {Array.from({ length: 10 }, (_, i) => col * 10 + i + 1).map(q => {
                  if (q > 40) return null;
                  const keyAns = answerKey.part1[q];
                  const detected = sheet.detectedAnswers[q];
                  const hasKey = keyAns !== null && keyAns !== undefined;
                  const isCorrect = hasKey && detected === keyAns;

                  return (
                    <div key={q} className="grid grid-cols-[24px_repeat(4,1fr)] items-center gap-0">
                      <span className={`text-[10px] font-bold text-center ${
                        hasKey ? (isCorrect ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground'
                      }`}>
                        {q}
                      </span>
                      {opts.map(opt => {
                        const style = getPart1BubbleStyle(q, opt);
                        return (
                          <div key={opt} className="flex justify-center">
                            <button
                              onClick={() => updateDetectedAnswers(sheet.id, q, detected === opt ? null : opt)}
                              className={`w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center transition-all hover:scale-110 ${style}`}
                              title={`Câu ${q} — ${opt}`}
                            >
                              {(sheet.detectedAnswers[q] === opt || (hasKey && keyAns === opt)) ? opt : ''}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="px-4 py-2 border-t border-border flex flex-wrap gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Đúng
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Sai
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full border-2 border-yellow-500 inline-block" /> Đáp án đúng (HS không chọn)
          </span>
        </div>
      </div>

      {/* ─── PHẦN II — Đúng/Sai ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">PHẦN II — Đúng/Sai</span>
          <span className="text-white/90 text-xs font-medium">
            {part2Stats.totalScore.toFixed(1)}/{part2Stats.totalQuestions}đ
          </span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(q => {
              const keyQ = answerKey.part2[q];
              const subs = ['a', 'b', 'c', 'd'];
              let correctSubs = 0;
              let totalSubs = 0;
              for (const sub of subs) {
                if (keyQ?.[sub] !== null && keyQ?.[sub] !== undefined) {
                  totalSubs++;
                  if (sheet.detectedPart2[q]?.[sub] === keyQ[sub]) correctSubs++;
                }
              }
              const qScore = totalSubs > 0 ? (correctSubs === totalSubs ? 1 : (correctSubs >= totalSubs - 1 && correctSubs >= 3 ? 0.5 : 0)) : 0;

              return (
                <div key={q} className="border border-border rounded-lg overflow-hidden">
                  <div className={`px-2 py-1 text-center text-[10px] font-bold ${
                    totalSubs === 0 ? 'bg-muted text-muted-foreground'
                      : qScore >= 1 ? 'bg-green-500/20 text-green-500'
                      : qScore >= 0.5 ? 'bg-yellow-500/20 text-yellow-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    Câu {q} {totalSubs > 0 && <span className="ml-1">({qScore}đ)</span>}
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    {subs.map(sub => {
                      const detected = sheet.detectedPart2[q]?.[sub];
                      const keyVal = keyQ?.[sub];
                      const hasKey = keyVal !== null && keyVal !== undefined;

                      return (
                        <div key={sub} className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground w-3">{sub})</span>
                          <div className="flex gap-0.5">
                            {[true, false].map(val => {
                              const style = getPart2BubbleStyle(q, sub, val);
                              const isDetected = detected === val;
                              return (
                                <button
                                  key={String(val)}
                                  onClick={() => updateDetectedPart2(sheet.id, q, sub, detected === val ? null : val)}
                                  className={`w-5 h-4 rounded text-[8px] font-bold border flex items-center justify-center transition-all hover:scale-110 ${style}`}
                                  title={`Câu ${q}${sub}: ${val ? 'Đ' : 'S'}`}
                                >
                                  {(isDetected || (hasKey && keyVal === val)) ? (val ? 'Đ' : 'S') : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── PHẦN III — Trả lời ngắn ─── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 flex items-center justify-between">
          <span className="text-white font-bold text-sm">PHẦN III — Trả lời ngắn</span>
          <span className="text-white/90 text-xs font-medium">
            {part3Stats.correct}/{part3Stats.total} đúng = {part3Stats.score}đ
          </span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(q => {
              const keyAns = answerKey.part3[q];
              const hasKey = keyAns && keyAns.trim().length > 0;
              const studentAns = sheet.detectedPart3[q]?.trim() || '';
              const isCorrect = hasKey && studentAns.toLowerCase() === keyAns.trim().toLowerCase();

              return (
                <div key={q} className={`border rounded-lg overflow-hidden ${
                  !hasKey ? 'border-border' : isCorrect ? 'border-green-500' : 'border-red-500'
                }`}>
                  <div className={`px-2 py-1 text-center text-[10px] font-bold ${
                    !hasKey ? 'bg-muted text-muted-foreground'
                      : isCorrect ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    Câu {q} {hasKey && (isCorrect ? '✓' : '✗')}
                  </div>
                  <div className="p-2 space-y-1">
                    <input
                      type="text"
                      value={studentAns}
                      onChange={(e) => updateDetectedPart3(sheet.id, q, e.target.value)}
                      className={`w-full px-2 py-1 rounded border text-xs text-center font-medium bg-background focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        !hasKey ? 'border-border text-foreground'
                          : isCorrect ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'
                      }`}
                      placeholder="—"
                    />
                    {hasKey && !isCorrect && (
                      <p className="text-[9px] text-center text-yellow-500 font-medium">
                        ĐA: {keyAns}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== HELPER FUNCTIONS =====================

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card rounded-xl shadow-sm border border-border p-6 ${className}`}>{children}</div>;
}

function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const variantMap: Record<string, string> = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-yellow-200',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variantMap[variant]}`}>
      {children}
    </span>
  );
}

function gradeAgainstKey(
  studentAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | null>,
  studentPart2: Record<number, Record<string, boolean | null>>,
  studentPart3: Record<number, string>,
  essayScores: Record<string, number>,
  answerKey: AnswerKey
): { score: number; maxScore: number } {
  let score = 0;
  let maxScore = 0;

  // Part I: Trắc nghiệm — 0.25đ mỗi câu (tối đa 40 câu = 10đ)
  for (let q = 1; q <= 40; q++) {
    const keyAnswer = answerKey.part1[q];
    // Chỉ tính câu đã có đáp án (không null, không undefined)
    if (keyAnswer !== null && keyAnswer !== undefined) {
      maxScore += 0.25;
      if (studentAnswers[q] === keyAnswer) score += 0.25;
    }
  }

  // Part II: Đúng/Sai — 4 ý đúng hết = 1đ, 3 đúng = 0.5đ, ≤2 đúng = 0đ (tối đa 8 câu = 8đ)
  for (let q = 1; q <= 8; q++) {
    const keyQ = answerKey.part2[q];
    if (!keyQ) continue; // Chưa nhập đáp án cho câu này

    const subs = ['a', 'b', 'c', 'd'];
    let correct = 0;
    let totalSubs = 0;

    for (const sub of subs) {
      const keyVal = keyQ[sub];
      if (keyVal === null || keyVal === undefined) continue;
      totalSubs++;
      // So sánh đáp án học sinh với đáp án đúng
      const studentVal = studentPart2[q]?.[sub];
      if (studentVal === keyVal) correct++;
    }

    if (totalSubs > 0) {
      maxScore += 1;
      if (correct === totalSubs) score += 1;       // Đúng hết = 1đ
      else if (correct >= totalSubs - 1 && correct >= 3) score += 0.5; // Sai 1 ý = 0.5đ
      // Sai 2+ ý = 0đ
    }
  }

  // Part III: Trả lời ngắn — 1đ mỗi câu đúng (tối đa 6 câu = 6đ)
  for (let q = 1; q <= 6; q++) {
    const keyAnswer = answerKey.part3[q];
    if (!keyAnswer || keyAnswer.trim().length === 0) continue;

    maxScore += 1;
    const studentAnswer = studentPart3[q]?.trim() || '';
    const expected = keyAnswer.trim();

    // So sánh không phân biệt hoa thường, loại bỏ khoảng trắng thừa
    if (studentAnswer.toLowerCase() === expected.toLowerCase()) {
      score += 1;
    }
  }

  // Part IV: Tự luận — điểm do giáo viên chấm tay
  for (const eq of answerKey.essayQuestions) {
    if (eq.maxScore > 0) {
      maxScore += eq.maxScore;
      score += Math.min(essayScores[eq.id] || 0, eq.maxScore);
    }
  }

  return { score: Math.round(score * 100) / 100, maxScore: Math.round(maxScore * 100) / 100 };
}

// ===================== UPLOAD VIEW =====================

// ── Reusable drop zone for a single side ────────────────────────────
function DropZone({
  label,
  sublabel,
  icon: Icon,
  dragActive,
  onDrag,
  onDrop,
  onFileSelect,
  onCameraCapture,
  convertingHeic,
  multiple = true,
}: {
  label: string;
  sublabel: string;
  icon: any;
  dragActive: boolean;
  onDrag: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onCameraCapture: (e: ChangeEvent<HTMLInputElement>) => void;
  convertingHeic?: boolean;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {/* Drop area */}
      <div
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-border hover:border-purple-400'
        }`}
      >
        <Icon className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-foreground font-semibold text-sm mb-1">{label}</p>
        <p className="text-[11px] text-muted-foreground mb-3">{sublabel}</p>
        <p className="text-[10px] text-muted-foreground mb-3">JPG · PNG · HEIC (iPhone)</p>

        {convertingHeic && (
          <div className="flex items-center justify-center gap-2 mb-3 text-xs text-purple-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang chuyển đổi HEIC...</span>
          </div>
        )}

        <input ref={inputRef} type="file" multiple={multiple} accept="image/*,.heic,.heif" onChange={onFileSelect} className="hidden" />
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="ai-button-primary text-white px-4 py-2 rounded-lg font-semibold text-xs hover:shadow-lg transition-all"
          >
            <FileUp className="w-3.5 h-3.5 inline mr-1.5" />
            Chọn file
          </button>
          <button
            onClick={() => camRef.current?.click()}
            className="px-4 py-2 rounded-lg font-semibold text-xs border border-border text-foreground hover:bg-muted transition-all"
          >
            <Camera className="w-3.5 h-3.5 inline mr-1.5" />
            Chụp ảnh
          </button>
        </div>
        <input ref={camRef} type="file" accept="image/*,.heic,.heif" capture="environment" onChange={onCameraCapture} className="hidden" />
      </div>
    </div>
  );
}

function UploadView({
  answerKey,
  sheets,
  addSheets,
  addBackImages,
  isScanningRef,
  convertingHeic = false,
}: {
  answerKey: AnswerKey;
  sheets: ScannedSheet[];
  addSheets: (files: File[]) => Promise<void>;
  addBackImages: (sheetId: string, file: File) => void;
  isScanningRef: React.MutableRefObject<boolean>;
  convertingHeic?: boolean;
}) {
  const [dragFront, setDragFront] = useState(false);
  const [dragBack, setDragBack] = useState(false);
  const hasEssay = answerKey.essayQuestions.length > 0;

  // ── Front side (trắc nghiệm) ──
  const handleDragFront = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragFront(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDropFront = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragFront(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || isHeicFile(f));
    if (files.length > 0) addSheets(files);
  };
  const handleFileSelectFront = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    if (files.length > 0) addSheets(files);
    e.currentTarget.value = '';
  };

  // ── Back side (tự luận) ──
  const handleDragBack = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragBack(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDropBack = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragBack(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || isHeicFile(f));
    // Assign back images to sheets in order
    files.forEach((f, i) => {
      if (sheets[i]) addBackImages(sheets[i].id, f);
    });
  };
  const handleFileSelectBack = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    files.forEach((f, i) => {
      if (sheets[i]) addBackImages(sheets[i].id, f);
    });
    e.currentTarget.value = '';
  };

  return (
    <GlassCard>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Quét phiếu trả lời</h2>
          <p className="text-sm text-muted-foreground">Mã đề: {answerKey.examCode} | {answerKey.examName}</p>
        </div>

        {/* ── Hai mặt upload ─────────────────────────────── */}
        <div className={`grid gap-4 ${hasEssay ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* MẶT TRƯỚC */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold">1</span>
              <h3 className="font-semibold text-foreground text-sm">Mặt trước — Trắc nghiệm</h3>
            </div>
            <DropZone
              label="Kéo & thả phiếu mặt trước"
              sublabel="Phần I (TN) · Phần II (Đ/S) · Phần III (Ngắn)"
              icon={FileText}
              dragActive={dragFront}
              onDrag={handleDragFront}
              onDrop={handleDropFront}
              onFileSelect={handleFileSelectFront}
              onCameraCapture={handleFileSelectFront}
              convertingHeic={convertingHeic}
              multiple={true}
            />
          </div>

          {/* MẶT SAU (chỉ hiện khi có tự luận) */}
          {hasEssay && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
                <h3 className="font-semibold text-foreground text-sm">Mặt sau — Tự luận</h3>
              </div>
              {sheets.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center opacity-50">
                  <RotateCcw className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground font-medium">Upload mặt trước trước</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Sau khi quét mặt trước, bạn sẽ upload mặt sau tương ứng</p>
                </div>
              ) : (
                <DropZone
                  label="Kéo & thả phiếu mặt sau"
                  sublabel={`Ghép theo thứ tự với ${sheets.length} phiếu mặt trước`}
                  icon={RotateCcw}
                  dragActive={dragBack}
                  onDrag={handleDragBack}
                  onDrop={handleDropBack}
                  onFileSelect={handleFileSelectBack}
                  onCameraCapture={handleFileSelectBack}
                  convertingHeic={convertingHeic}
                  multiple={true}
                />
              )}
            </div>
          )}
        </div>

        {/* ── Danh sách phiếu đã tải ──────────────────────── */}
        {sheets.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Phiếu đã tải ({sheets.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sheets.map((sheet, idx) => (
                <div key={sheet.id} className="bg-muted rounded-xl border border-border overflow-hidden">
                  <div className="grid grid-cols-2 gap-px bg-border">
                    {/* Mặt trước thumbnail */}
                    <div className="relative bg-background">
                      <div className="aspect-[3/4] overflow-hidden">
                        <img src={sheet.preview} alt={sheet.fileName} className="w-full h-full object-cover" />
                      </div>
                      <span className="absolute top-1.5 left-1.5 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Trước
                      </span>
                      {sheet.status === 'scanning' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>

                    {/* Mặt sau thumbnail */}
                    <div className="relative bg-background">
                      {sheet.backPreview ? (
                        <div className="aspect-[3/4] overflow-hidden">
                          <img src={sheet.backPreview} alt="Mặt sau" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] flex flex-col items-center justify-center text-muted-foreground">
                          {hasEssay ? (
                            <label className="cursor-pointer flex flex-col items-center gap-1 hover:text-purple-400 transition-colors">
                              <Plus className="w-6 h-6" />
                              <span className="text-[9px] font-medium">Thêm mặt sau</span>
                              <input
                                type="file"
                                accept="image/*,.heic,.heif"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) addBackImages(sheet.id, f);
                                  e.currentTarget.value = '';
                                }}
                              />
                            </label>
                          ) : (
                            <span className="text-[9px]">Không có mặt sau</span>
                          )}
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Sau
                      </span>
                    </div>
                  </div>

                  {/* Sheet info */}
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-foreground font-medium truncate">Phiếu #{idx + 1}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        sheet.status === 'scanning' ? 'bg-yellow-500/20 text-yellow-500' :
                        sheet.status === 'scanned' ? 'bg-green-500/20 text-green-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {sheet.status === 'scanning' ? 'Đang quét' : sheet.status === 'scanned' ? 'Đã quét' : 'Lỗi'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sheet.fileName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ===================== PROCESSING VIEW =====================

function ProcessingView({ sheets, totalProgress }: { sheets: ScannedSheet[]; totalProgress: number }) {
  const scannedCount = sheets.filter(s => s.status === 'scanned' || s.status === 'error').length;
  const allDone = scannedCount === sheets.length;

  return (
    <GlassCard>
      <div className="text-center space-y-6">
        <div>
          {allDone ? (
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
          ) : (
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-purple-600 animate-spin" />
          )}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {allDone ? 'Quét hoàn tất!' : 'Đang quét phiếu...'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {scannedCount}/{sheets.length} phiếu đã quét | {Math.round(totalProgress)}%
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full overflow-hidden h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all duration-300"
            style={{ width: `${totalProgress}%` }}
          />
        </div>

        {/* Status Items */}
        <div className="space-y-2 text-left">
          {sheets.slice(0, 5).map(sheet => (
            <div key={sheet.id} className="flex items-center gap-3 text-sm">
              {sheet.status === 'scanning' && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
              {sheet.status === 'scanned' && <CheckCircle className="w-4 h-4 text-green-600" />}
              {sheet.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
              <span className="text-muted-foreground">{sheet.fileName}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

// ===================== REVIEW VIEW =====================

function ReviewView({
  sheets,
  answerKey,
  currentSheetIdx,
  setCurrentSheetIdx,
  updateDetectedAnswers,
  updateDetectedPart2,
  updateDetectedPart3,
  updateEssayScore,
  updateEssayNotes,
  updateBackImage,
  showOverlay,
  setShowOverlay,
  onSwitchToResults,
}: {
  sheets: ScannedSheet[];
  answerKey: AnswerKey;
  currentSheetIdx: number;
  setCurrentSheetIdx: (idx: number) => void;
  updateDetectedAnswers: (sheetId: string, q: number, ans: 'A' | 'B' | 'C' | 'D' | null) => void;
  updateDetectedPart2: (sheetId: string, q: number, sub: string, val: boolean | null) => void;
  updateDetectedPart3: (sheetId: string, q: number, val: string) => void;
  updateEssayScore: (sheetId: string, eqId: string, val: number) => void;
  updateEssayNotes: (sheetId: string, eqId: string, note: string) => void;
  updateBackImage: (sheetId: string, file: File) => void;
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  onSwitchToResults: () => void;
}) {
  const sheet = sheets[currentSheetIdx];
  if (!sheet) return null;

  const [bubbles, setBubbles] = useState<BubblePosition[]>([]);
  const [correctedImageUrl, setCorrectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = sheet.preview;
    img.onload = () => {
      // Create an offscreen canvas for detection (not attached to DOM)
      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.naturalWidth;
      offCanvas.height = img.naturalHeight;
      const ctx = offCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          // === STEP 1: Straighten the sheet (deskew + perspective correction) ===
          const { canvas: flatCanvas, corners: flatCorners, corrected } = straightenSheet(offCanvas);

          // If the image was corrected, produce a new image URL for the overlay
          if (corrected) {
            setCorrectedImageUrl(flatCanvas.toDataURL('image/jpeg', 0.92));
          } else {
            setCorrectedImageUrl(null);
          }

          // === STEP 2: Map bubble positions on the (now-flat) canvas ===
          const markers = findMarkers(flatCanvas);

          // If straightenSheet found corners but findMarkers returns empty,
          // construct markers from flatCorners for mapBubbleCoordinates
          let effectiveMarkers = markers;
          if (markers.length === 0 && flatCorners.found) {
            effectiveMarkers = [
              { x: flatCorners.topLeft.x, y: flatCorners.topLeft.y, size: 10 },
              { x: flatCorners.topRight.x, y: flatCorners.topRight.y, size: 10 },
              { x: flatCorners.bottomLeft.x, y: flatCorners.bottomLeft.y, size: 10 },
              { x: flatCorners.bottomRight.x, y: flatCorners.bottomRight.y, size: 10 },
            ];
          }

          const positions = mapBubbleCoordinates(effectiveMarkers, flatCanvas.width, flatCanvas.height);

          // === STEP 3: Detect pencil fills on the flat canvas ===
          const detected = detectBubbles(flatCanvas, positions);

          console.log('[ReviewView] Bubble detection:', {
            corrected,
            canvasSize: `${flatCanvas.width}x${flatCanvas.height}`,
            markersCount: effectiveMarkers.length,
            positions: positions.length,
            filled: detected.filter(b => b.filled).length,
            total: detected.length,
          });
          setBubbles(detected);
        } catch (e) {
          console.error('[ReviewView] Bubble detection error:', e);
        }
      }
    };
    img.onerror = (e) => {
      console.error('[ReviewView] Image load error:', e);
    };
  }, [sheet.preview]);

  const handleBubbleClick = (bubble: BubblePosition) => {
    if (bubble.section === 'part1') {
      const current = sheet.detectedAnswers[bubble.questionId];
      const next: 'A' | 'B' | 'C' | 'D' | null =
        current === bubble.optionLabel ? null : (bubble.optionLabel as 'A' | 'B' | 'C' | 'D');
      updateDetectedAnswers(sheet.id, bubble.questionId, next);
    }
  };

  return (
    <GlassCard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Xem lại kết quả quét</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Phiếu {currentSheetIdx + 1}/{sheets.length}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className="ai-button text-foreground px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-all flex items-center gap-2"
            >
              {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showOverlay ? 'Ẩn' : 'Hiện'} overlay
            </button>
          </div>
        </div>

        {/* Image & Overlay */}
        <div className="bg-muted rounded-lg overflow-hidden border border-border">
          {showOverlay ? (
            <BubbleOverlay
              imageUrl={correctedImageUrl || sheet.preview}
              bubbles={bubbles}
              answerKey={answerKey}
              detectedAnswers={sheet.detectedAnswers}
              detectedPart2={sheet.detectedPart2}
              detectedPart3={sheet.detectedPart3}
              onBubbleClick={handleBubbleClick}
            />
          ) : (
            <img src={correctedImageUrl || sheet.preview} alt="Sheet" className="w-full rounded-lg" />
          )}

          {/* Correction indicator */}
          {correctedImageUrl && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border-t border-blue-500/20 text-xs text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm.75 2.5a.75.75 0 0 0-1.5 0v3a.75.75 0 0 0 .22.53l2 2a.75.75 0 1 0 1.06-1.06L8.75 7.69V5z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Đã làm phẳng ảnh (perspective correction)</span>
            </div>
          )}

          {/* Legend */}
          {showOverlay && (
            <div className="flex items-center gap-4 px-4 py-2 bg-card/80 border-t border-border text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-green-500/60 border-2 border-green-600" />
                <span className="text-muted-foreground font-medium">Đúng</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-red-500/60 border-2 border-red-600" />
                <span className="text-muted-foreground font-medium">Sai</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-yellow-400/30 border-2 border-yellow-500" />
                <span className="text-muted-foreground font-medium">Đáp án đúng (HS không chọn)</span>
              </span>
            </div>
          )}
        </div>

        {/* Mặt trước — Chi tiết đáp án (Green/Red bubbles) */}
        <AnswerComparisonGrid
          sheet={sheet}
          answerKey={answerKey}
          updateDetectedAnswers={updateDetectedAnswers}
          updateDetectedPart2={updateDetectedPart2}
          updateDetectedPart3={updateDetectedPart3}
        />

        {/* ── Mặt sau — Tự luận ─────────────────────────── */}
        {answerKey.essayQuestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Mặt sau — Tự luận ({answerKey.essayQuestions.length} câu)
              </h3>
            </div>

            {/* Back image upload */}
            <div className="border border-dashed border-border rounded-lg p-4">
              {sheet.backPreview ? (
                <div className="space-y-3">
                  <div className="relative bg-muted rounded-lg overflow-hidden border border-border">
                    <img src={sheet.backPreview} alt="Mặt sau" className="w-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{sheet.backFileName}</p>
                    <label className="text-xs text-purple-500 hover:text-purple-600 cursor-pointer font-medium">
                      Đổi ảnh
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) updateBackImage(sheet.id, f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer py-4">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Chụp/chọn ảnh mặt sau (tự luận)</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, HEIC</p>
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) updateBackImage(sheet.id, f);
                    }}
                  />
                </label>
              )}
            </div>

            {/* Essay scoring per question */}
            <div className="space-y-3">
              {answerKey.essayQuestions.map((eq, idx) => (
                <div key={eq.id} className="bg-muted rounded-lg p-4 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      Câu {idx + 1}: {eq.questionText || `Tự luận #${idx + 1}`}
                    </p>
                    <span className="text-xs text-muted-foreground">Tối đa: {eq.maxScore}đ</span>
                  </div>
                  {eq.rubric && (
                    <p className="text-xs text-muted-foreground italic">Rubric: {eq.rubric}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Điểm:</label>
                    <input
                      type="number"
                      min={0}
                      max={eq.maxScore}
                      step={0.25}
                      value={sheet.essayScores[eq.id] ?? ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) updateEssayScore(sheet.id, eq.id, Math.min(Math.max(0, v), eq.maxScore));
                      }}
                      className="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                    />
                    <span className="text-xs text-muted-foreground">/ {eq.maxScore}đ</span>
                  </div>
                  <textarea
                    placeholder="Ghi chú chấm bài..."
                    value={sheet.essayNotes[eq.id] ?? ''}
                    onChange={(e) => updateEssayNotes(sheet.id, eq.id, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              ))}
              <div className="text-right text-sm font-semibold text-foreground">
                Tổng tự luận:{' '}
                <span className="text-purple-600">
                  {answerKey.essayQuestions.reduce((s, eq) => s + (sheet.essayScores[eq.id] || 0), 0).toFixed(2)}
                </span>
                /{answerKey.essayQuestions.reduce((s, eq) => s + eq.maxScore, 0)}đ
              </div>
            </div>
          </div>
        )}

        {/* Score Summary */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4 border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Tổng điểm phiếu này</span>
            <span className="text-2xl font-bold text-purple-600">{sheet.totalScore.toFixed(2)}/{sheet.maxScore.toFixed(2)}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentSheetIdx(Math.max(0, currentSheetIdx - 1))}
            disabled={currentSheetIdx === 0}
            className="ai-button text-foreground px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <ChevronUp className="w-4 h-4" /> Trước
          </button>

          <div className="flex gap-2">
            {sheets.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSheetIdx(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  idx === currentSheetIdx
                    ? 'bg-purple-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentSheetIdx(Math.min(sheets.length - 1, currentSheetIdx + 1))}
            disabled={currentSheetIdx === sheets.length - 1}
            className="ai-button text-foreground px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            Tiếp <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Continue Button */}
        <button
          onClick={onSwitchToResults}
          className="w-full ai-button-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
        >
          <CheckCircle className="w-5 h-5" />
          Hoàn thành xem lại ({sheets.length} phiếu)
        </button>
      </div>
    </GlassCard>
  );
}

// ===================== RESULTS VIEW =====================

function ResultsView({
  sheets,
  answerKey,
  onSaveResults,
  saveStatus,
}: {
  sheets: ScannedSheet[];
  answerKey: AnswerKey;
  onSaveResults?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}) {
  const [sortBy, setSortBy] = useState<'score-desc' | 'score-asc' | 'name' | 'id'>('score-desc');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedSheets = useMemo(() => {
    let result = [...sheets];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.studentName.toLowerCase().includes(q) || s.studentId.includes(q)
      );
    }

    if (filterGrade !== 'all') {
      result = result.filter(s => {
        const pct = s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0;
        const g = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
        return g === filterGrade;
      });
    }

    switch (sortBy) {
      case 'score-desc':
        result.sort((a, b) => b.totalScore - a.totalScore);
        break;
      case 'score-asc':
        result.sort((a, b) => a.totalScore - b.totalScore);
        break;
      case 'name':
        result.sort((a, b) => a.studentName.localeCompare(b.studentName));
        break;
      case 'id':
        result.sort((a, b) => a.studentId.localeCompare(b.studentId));
        break;
    }

    return result;
  }, [sheets, searchQuery, filterGrade, sortBy]);

  const stats = useMemo(() => {
    if (sheets.length === 0) return null;
    const avg = sheets.reduce((s, r) => s + r.totalScore, 0) / sheets.length;
    const maxScore = Math.max(...sheets.map(r => r.totalScore));
    const minScore = Math.min(...sheets.map(r => r.totalScore));
    const maxPossible = sheets[0]?.maxScore || 0;
    const passCount = sheets.filter(r => maxPossible > 0 && r.totalScore / maxPossible >= 0.5).length;
    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    sheets.forEach(s => {
      const pct = s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0;
      const g = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
      gradeDistribution[g]++;
    });

    return { avg, maxScore, minScore, maxPossible, passCount, gradeDistribution, total: sheets.length };
  }, [sheets]);

  if (!stats) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-foreground font-semibold">Không có kết quả</p>
          <p className="text-sm text-muted-foreground mt-1">Quét phiếu trắc nghiệm để bắt đầu</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Kết quả quét phiếu</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Mã đề: {answerKey.examCode} | {answerKey.examName}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-muted rounded-lg border border-border">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Tổng phiếu</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.avg.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Điểm TB</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{typeof stats.maxScore === 'number' ? stats.maxScore.toFixed(2) : stats.maxScore}</p>
            <p className="text-xs text-muted-foreground mt-1">Điểm cao nhất</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{typeof stats.minScore === 'number' ? stats.minScore.toFixed(2) : stats.minScore}</p>
            <p className="text-xs text-muted-foreground mt-1">Điểm thấp nhất</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {stats.maxPossible > 0 ? Math.round((stats.passCount / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pass rate</p>
          </div>
        </div>

        {/* Grade Distribution */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Phân bố điểm</h3>
          <div className="grid grid-cols-5 gap-2">
            {['A', 'B', 'C', 'D', 'F'].map(grade => (
              <div key={grade} className="bg-muted rounded-lg p-4 text-center border border-border">
                <p className="text-2xl font-bold text-foreground">{stats.gradeDistribution[grade]}</p>
                <p className="text-xs text-muted-foreground mt-1">{grade}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Tìm theo tên hoặc ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Tất cả điểm</option>
            <option value="A">A (90-100%)</option>
            <option value="B">B (70-89%)</option>
            <option value="C">C (50-69%)</option>
            <option value="D">D (30-49%)</option>
            <option value="F">F (&lt;30%)</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 rounded-lg border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="score-desc">Điểm cao → thấp</option>
            <option value="score-asc">Điểm thấp → cao</option>
            <option value="name">Theo tên</option>
            <option value="id">Theo ID</option>
          </select>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground">Tên học sinh</th>
                <th className="text-left py-3 px-3 font-semibold text-muted-foreground">ID</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground">Điểm</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground">%</th>
                <th className="text-center py-3 px-3 font-semibold text-muted-foreground">Xếp loại</th>
              </tr>
            </thead>
            <tbody>
              {sortedSheets.map(sheet => {
                const pct = sheet.maxScore > 0 ? (sheet.totalScore / sheet.maxScore) * 100 : 0;
                const grade = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
                const gradeColor: Record<string, string> = {
                  A: 'text-green-600',
                  B: 'text-emerald-600',
                  C: 'text-yellow-600',
                  D: 'text-orange-600',
                  F: 'text-red-600',
                };

                return (
                  <tr key={sheet.id} className="border-b border-border hover:bg-muted transition-colors">
                    <td className="py-3 px-3 text-foreground font-medium">{sheet.studentName}</td>
                    <td className="py-3 px-3 text-muted-foreground">{sheet.studentId}</td>
                    <td className="py-3 px-3 text-center font-semibold text-foreground">
                      {sheet.totalScore.toFixed(2)}/{sheet.maxScore.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center text-foreground font-semibold">
                      {pct.toFixed(1)}%
                    </td>
                    <td className={`py-3 px-3 text-center font-bold ${gradeColor[grade]}`}>{grade}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sortedSheets.length === 0 && (
            <div className="text-center py-8">
              <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-foreground font-semibold">Không tìm thấy kết quả</p>
              <p className="text-sm text-muted-foreground mt-1">Hãy thử thay đổi bộ lọc hoặc tìm kiếm</p>
            </div>
          )}
        </div>

        {/* Save & Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onSaveResults && (
            <button
              onClick={onSaveResults}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                saveStatus === 'saved'
                  ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800'
                  : saveStatus === 'error'
                  ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-200'
                  : 'ai-button-primary text-white hover:shadow-lg'
              }`}
            >
              {saveStatus === 'saving' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Đang lưu...</>
              ) : saveStatus === 'saved' ? (
                <><CheckCircle className="w-5 h-5" /> Đã lưu kết quả</>
              ) : saveStatus === 'error' ? (
                <><AlertCircle className="w-5 h-5" /> Lỗi — Thử lại</>
              ) : (
                <><Save className="w-5 h-5" /> Lưu kết quả chấm</>
              )}
            </button>
          )}
          <button className="flex-1 ai-button text-foreground py-3 rounded-lg font-semibold flex items-center justify-center gap-2 border border-border hover:bg-muted transition-all">
            <Download className="w-5 h-5" />
            Tải báo cáo
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ===================== MAIN COMPONENT =====================

export interface ScanGradingProps {
  savedKeys: AnswerKey[];
  selectedKeyIdx: number;
  setSelectedKeyIdx: (idx: number) => void;
  onSwitchToAnswerKey: () => void;
}

export default function ScanGrading(props: ScanGradingProps) {
  const { savedKeys, selectedKeyIdx, setSelectedKeyIdx, onSwitchToAnswerKey } = props;

  const answerKey = savedKeys[selectedKeyIdx];
  const [sheets, setSheets] = useState<ScannedSheet[]>([]);
  const [viewMode, setViewMode] = useState<'scan' | 'review' | 'results'>('scan');
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const isScanningRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Save graded results to database
  const saveGradedResults = useCallback(async () => {
    if (!answerKey?.dbId || sheets.length === 0) return;
    const scannedSheets = sheets.filter(s => s.status === 'scanned');
    if (scannedSheets.length === 0) return;

    setSaveStatus('saving');
    try {
      const payload = scannedSheets.map(s => {
        const pct = s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0;
        const gradeLabel = pct >= 90 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : pct >= 30 ? 'D' : 'F';
        return {
          answerKeyId: answerKey.dbId,
          studentName: s.studentName,
          studentId: s.studentId,
          frontImageUrl: s.frontImageUrl || s.preview || null,
          backImageUrl: s.backImageUrl || s.backPreview || null,
          detectedAnswers: s.detectedAnswers,
          detectedPart2: s.detectedPart2,
          detectedPart3: s.detectedPart3,
          essayScores: s.essayScores,
          essayNotes: s.essayNotes,
          overrides: Array.from(s.overrides),
          totalScore: s.totalScore,
          maxScore: s.maxScore,
          percentage: pct,
          gradeLabel,
          reviewed: s.reviewed,
          published: true,
          status: 'scanned',
        };
      });

      const res = await fetch('/api/grading/graded-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheets: payload }),
      });

      if (!res.ok) throw new Error('Failed to save');
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save graded results:', err);
      setSaveStatus('error');
    }
  }, [answerKey, sheets]);

  const totalProgress = useMemo(() => {
    if (sheets.length === 0) return 0;
    const scanned = sheets.filter(s => s.status !== 'scanning').length;
    return Math.round((scanned / sheets.length) * 100);
  }, [sheets]);

  // Reset save status when sheets change (new scan)
  useEffect(() => { setSaveStatus('idle'); }, [sheets.length]);

  const [convertingHeic, setConvertingHeic] = useState(false);

  const addSheets = useCallback(
    async (files: File[]) => {
      // Convert HEIC/HEIF files from iPhone to JPEG
      let processedFiles = files;
      const hasHeic = files.some(f => isHeicFile(f));
      if (hasHeic) {
        setConvertingHeic(true);
        try {
          processedFiles = await processFiles(files);
        } catch (err) {
          console.error('HEIC conversion error:', err);
          processedFiles = files.filter(f => !isHeicFile(f));
        } finally {
          setConvertingHeic(false);
        }
      }

      if (processedFiles.length === 0) return;

      const newSheets: ScannedSheet[] = processedFiles.map(file => ({
        id: Math.random().toString(36),
        fileName: file.name,
        preview: URL.createObjectURL(file),
        backPreview: '',
        backFileName: '',
        status: 'scanning' as const,
        studentName: '',
        studentId: '',
        examCode: answerKey.examCode,
        detectedAnswers: {},
        detectedPart2: {},
        detectedPart3: {},
        essayScores: {},
        essayNotes: {},
        overrides: new Set(),
        totalScore: 0,
        maxScore: 0,
        reviewed: false,
        published: false,
      }));

      setSheets(prev => [...prev, ...newSheets]);

      // Real scanning: straighten + detect bubbles on each sheet
      for (const newSheet of newSheets) {
        try {
          // Load image into offscreen canvas
          const scanResult = await new Promise<{
            detectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
            detectedPart2: Record<number, Record<string, boolean | null>>;
            detectedPart3: Record<number, string>;
            correctedPreview: string | null;
          }>((resolve) => {
            const img = document.createElement('img');
            img.crossOrigin = 'anonymous';
            img.src = newSheet.preview;
            img.onload = () => {
              const offCanvas = document.createElement('canvas');
              offCanvas.width = img.naturalWidth;
              offCanvas.height = img.naturalHeight;
              const ctx = offCanvas.getContext('2d');
              if (!ctx) {
                resolve({ detectedAnswers: {}, detectedPart2: {}, detectedPart3: {}, correctedPreview: null });
                return;
              }
              ctx.drawImage(img, 0, 0);

              // === Step 1: Straighten (deskew + perspective correction) ===
              const { canvas: flatCanvas, corners: flatCorners, corrected } = straightenSheet(offCanvas);

              // === Step 2: Map bubble positions ===
              const markers = findMarkers(flatCanvas);
              let effectiveMarkers = markers;
              if (markers.length === 0 && flatCorners.found) {
                effectiveMarkers = [
                  { x: flatCorners.topLeft.x, y: flatCorners.topLeft.y, size: 10 },
                  { x: flatCorners.topRight.x, y: flatCorners.topRight.y, size: 10 },
                  { x: flatCorners.bottomLeft.x, y: flatCorners.bottomLeft.y, size: 10 },
                  { x: flatCorners.bottomRight.x, y: flatCorners.bottomRight.y, size: 10 },
                ];
              }
              const positions = mapBubbleCoordinates(effectiveMarkers, flatCanvas.width, flatCanvas.height);

              // === Step 3: Detect pencil fills ===
              const detected = detectBubbles(flatCanvas, positions);

              // === Step 4: Convert detected bubbles → answer records ===
              const detectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D' | null> = {};
              const detectedPart2: Record<number, Record<string, boolean | null>> = {};
              const detectedPart3: Record<number, string> = {};

              // Part I: for each question, find the filled bubble option
              for (let q = 1; q <= 40; q++) {
                const qBubbles = detected.filter(b => b.section === 'part1' && b.questionId === q && b.filled);
                if (qBubbles.length === 1) {
                  detectedAnswers[q] = qBubbles[0].optionLabel as 'A' | 'B' | 'C' | 'D';
                } else if (qBubbles.length > 1) {
                  // Multiple filled → pick darkest
                  qBubbles.sort((a, b) => ((a as any)._mean || 255) - ((b as any)._mean || 255));
                  detectedAnswers[q] = qBubbles[0].optionLabel as 'A' | 'B' | 'C' | 'D';
                } else {
                  detectedAnswers[q] = null;
                }
              }

              // Part II: Đúng/Sai — detect filled Đúng or Sai per sub-item
              for (let q = 1; q <= 8; q++) {
                detectedPart2[q] = {};
                for (const sub of ['a', 'b', 'c', 'd']) {
                  const dongBubbles = detected.filter(
                    b => b.section === 'part2' && b.questionId === q &&
                         b.optionLabel === sub && b.label.endsWith('-Đ') && b.filled
                  );
                  const saiBubbles = detected.filter(
                    b => b.section === 'part2' && b.questionId === q &&
                         b.optionLabel === sub && b.label.endsWith('-S') && b.filled
                  );
                  if (dongBubbles.length > 0 && saiBubbles.length === 0) {
                    detectedPart2[q][sub] = true;
                  } else if (saiBubbles.length > 0 && dongBubbles.length === 0) {
                    detectedPart2[q][sub] = false;
                  } else {
                    detectedPart2[q][sub] = null;
                  }
                }
              }

              // Part III: short answer — read filled digit bubbles per column
              for (let q = 1; q <= 6; q++) {
                let answer = '';
                for (let col = 0; col < 4; col++) {
                  const colBubbles = detected.filter(
                    b => b.section === 'part3' && b.questionId === q &&
                         b.label.includes(`col${col}`) && b.filled
                  );
                  if (colBubbles.length === 1) {
                    answer += colBubbles[0].optionLabel;
                  } else if (colBubbles.length > 1) {
                    colBubbles.sort((a, b) => ((a as any)._mean || 255) - ((b as any)._mean || 255));
                    answer += colBubbles[0].optionLabel;
                  }
                }
                detectedPart3[q] = answer;
              }

              const correctedPreview = corrected ? flatCanvas.toDataURL('image/jpeg', 0.92) : null;

              console.log('[Scan] Sheet detection complete:', {
                corrected,
                markersFound: effectiveMarkers.length,
                part1Answered: Object.values(detectedAnswers).filter(v => v !== null).length,
                totalBubblesFilled: detected.filter(b => b.filled).length,
              });

              resolve({ detectedAnswers, detectedPart2, detectedPart3, correctedPreview });
            };
            img.onerror = () => {
              resolve({ detectedAnswers: {}, detectedPart2: {}, detectedPart3: {}, correctedPreview: null });
            };
          });

          // === Step 5: OCR for student info (async, non-blocking) ===
          // Fire OCR request to Python service for student name/ID extraction
          let ocrStudentName = '';
          let ocrStudentId = '';
          let ocrExamCode = '';
          try {
            const file = processedFiles.find(f => f.name === newSheet.fileName);
            if (file) {
              const ocrForm = new FormData();
              ocrForm.append('image', file);
              ocrForm.append('mode', 'ocr');
              const ocrResp = await fetch('/api/grading/ocr', {
                method: 'POST',
                body: ocrForm,
              });
              if (ocrResp.ok) {
                const ocrData = await ocrResp.json();
                if (ocrData.success && ocrData.exam_info) {
                  ocrStudentName = ocrData.exam_info.student_name || '';
                  ocrStudentId = ocrData.exam_info.student_id || '';
                  ocrExamCode = ocrData.exam_info.exam_code || '';
                  console.log('[OCR] Extracted:', ocrData.exam_info);
                }
              }
            }
          } catch (ocrErr) {
            console.warn('[OCR] Service unavailable, skipping text recognition:', ocrErr);
          }

          // Update sheet state with real detection results + OCR info
          setSheets(prev =>
            prev.map(s => {
              if (s.id === newSheet.id) {
                const { score, maxScore } = gradeAgainstKey(
                  scanResult.detectedAnswers,
                  scanResult.detectedPart2,
                  scanResult.detectedPart3,
                  {},
                  answerKey
                );
                return {
                  ...s,
                  status: 'scanned' as const,
                  detectedAnswers: scanResult.detectedAnswers,
                  detectedPart2: scanResult.detectedPart2,
                  detectedPart3: scanResult.detectedPart3,
                  totalScore: score,
                  maxScore: maxScore,
                  // OCR-extracted student info
                  ...(ocrStudentName ? { studentName: ocrStudentName } : {}),
                  ...(ocrStudentId ? { studentId: ocrStudentId } : {}),
                  ...(ocrExamCode ? { examCode: ocrExamCode } : {}),
                  // Store corrected image URL if perspective was corrected
                  ...(scanResult.correctedPreview ? { preview: scanResult.correctedPreview } : {}),
                };
              }
              return s;
            })
          );
        } catch (err) {
          console.error('[Scan] Error processing sheet:', err);
          setSheets(prev =>
            prev.map(s => s.id === newSheet.id ? { ...s, status: 'error' as const } : s)
          );
        }
      }
    },
    [answerKey]
  );

  const updateDetectedAnswers = useCallback((sheetId: string, q: number, ans: 'A' | 'B' | 'C' | 'D' | null) => {
    setSheets(prev =>
      prev.map(s => {
        if (s.id === sheetId) {
          const newAnswers = { ...s.detectedAnswers, [q]: ans };
          const { score, maxScore } = gradeAgainstKey(newAnswers, s.detectedPart2, s.detectedPart3, s.essayScores, answerKey);
          return {
            ...s,
            detectedAnswers: newAnswers,
            totalScore: score,
            maxScore: maxScore,
            overrides: new Set(Array.from(s.overrides).concat([q])),
          };
        }
        return s;
      })
    );
  }, [answerKey]);

  const updateDetectedPart2 = useCallback((sheetId: string, q: number, sub: string, val: boolean | null) => {
    setSheets(prev =>
      prev.map(s => {
        if (s.id === sheetId) {
          const newPart2 = {
            ...s.detectedPart2,
            [q]: { ...s.detectedPart2[q], [sub]: val },
          };
          const { score, maxScore } = gradeAgainstKey(s.detectedAnswers, newPart2, s.detectedPart3, s.essayScores, answerKey);
          return {
            ...s,
            detectedPart2: newPart2,
            totalScore: score,
            maxScore: maxScore,
          };
        }
        return s;
      })
    );
  }, [answerKey]);

  const updateDetectedPart3 = useCallback((sheetId: string, q: number, val: string) => {
    setSheets(prev =>
      prev.map(s => {
        if (s.id === sheetId) {
          const newPart3 = { ...s.detectedPart3, [q]: val };
          const { score, maxScore } = gradeAgainstKey(s.detectedAnswers, s.detectedPart2, newPart3, s.essayScores, answerKey);
          return {
            ...s,
            detectedPart3: newPart3,
            totalScore: score,
            maxScore: maxScore,
          };
        }
        return s;
      })
    );
  }, [answerKey]);

  // Cập nhật điểm tự luận cho từng phiếu
  const updateEssayScore = useCallback((sheetId: string, eqId: string, val: number) => {
    setSheets(prev =>
      prev.map(s => {
        if (s.id === sheetId) {
          const newEssayScores = { ...s.essayScores, [eqId]: val };
          const { score, maxScore } = gradeAgainstKey(
            s.detectedAnswers, s.detectedPart2, s.detectedPart3, newEssayScores, answerKey
          );
          return { ...s, essayScores: newEssayScores, totalScore: score, maxScore };
        }
        return s;
      })
    );
  }, [answerKey]);

  // Cập nhật ghi chú tự luận
  const updateEssayNotes = useCallback((sheetId: string, eqId: string, note: string) => {
    setSheets(prev =>
      prev.map(s => s.id === sheetId
        ? { ...s, essayNotes: { ...s.essayNotes, [eqId]: note } }
        : s
      )
    );
  }, []);

  // Đính kèm ảnh mặt sau (tự luận) cho phiếu
  const updateBackImage = useCallback((sheetId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setSheets(prev =>
      prev.map(s => s.id === sheetId
        ? { ...s, backPreview: preview, backFileName: file.name }
        : s
      )
    );
  }, []);

  if (!answerKey) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-yellow-600" />
          <p className="text-foreground font-semibold">Chưa chọn đáp án khóa</p>
          <p className="text-sm text-muted-foreground mt-1">Vui lòng tạo hoặc chọn một đáp án khóa trước</p>
          <button
            onClick={onSwitchToAnswerKey}
            className="ai-button-primary text-white px-5 py-2.5 rounded-lg font-semibold mt-4 text-sm inline-block hover:shadow-lg transition-all"
          >
            Quay lại đáp án khóa
          </button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Quét & Chấm Điểm</h1>
        <div className="flex gap-2">
          {['scan', 'review', 'results'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === mode
                  ? 'bg-purple-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'scan' && 'Upload'}
              {mode === 'review' && 'Xem lại'}
              {mode === 'results' && 'Kết quả'}
            </button>
          ))}
        </div>
      </div>

      {/* Views */}
      {viewMode === 'scan' && <UploadView answerKey={answerKey} sheets={sheets} addSheets={addSheets} addBackImages={updateBackImage} isScanningRef={isScanningRef} convertingHeic={convertingHeic} />}

      {viewMode === 'scan' && sheets.length > 0 && <ProcessingView sheets={sheets} totalProgress={totalProgress} />}

      {viewMode === 'review' && sheets.filter(s => s.status !== 'scanning').length > 0 && (
        <ReviewView
          sheets={sheets.filter(s => s.status !== 'scanning')}
          answerKey={answerKey}
          currentSheetIdx={currentSheetIdx}
          setCurrentSheetIdx={setCurrentSheetIdx}
          updateDetectedAnswers={updateDetectedAnswers}
          updateDetectedPart2={updateDetectedPart2}
          updateDetectedPart3={updateDetectedPart3}
          updateEssayScore={updateEssayScore}
          updateEssayNotes={updateEssayNotes}
          updateBackImage={updateBackImage}
          showOverlay={showOverlay}
          setShowOverlay={setShowOverlay}
          onSwitchToResults={() => setViewMode('results')}
        />
      )}

      {viewMode === 'results' && (
        <ResultsView
          sheets={sheets.filter(s => s.status === 'scanned')}
          answerKey={answerKey}
          onSaveResults={saveGradedResults}
          saveStatus={saveStatus}
        />
      )}

      {sheets.length === 0 && viewMode !== 'scan' && (
        <GlassCard>
          <div className="text-center py-8">
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-foreground font-semibold">Chưa có phiếu nào</p>
            <p className="text-sm text-muted-foreground mt-1">Vui lòng upload phiếu trắc nghiệm để bắt đầu</p>
            <button
              onClick={() => setViewMode('scan')}
              className="ai-button-primary text-white px-5 py-2.5 rounded-lg font-semibold mt-4 text-sm inline-block hover:shadow-lg transition-all"
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload phiếu
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
