/**
 * Deep Learning OCR Service for Student Name Recognition
 * 
 * Implements state-of-the-art OCR algorithms:
 * - Text Detection: DBNet, EAST, CTPN
 * - Text Recognition: CRNN, Attention-based, Transformer (TrOCR)
 * - End-to-End: PaddleOCR, EasyOCR
 * 
 * Integration: /api/grading/recognize
 */

import { z } from "zod";

// ======================== CONFIGURATION ========================

export interface OcrProviderConfig {
  name: string;
  endpoint: string;
  timeout: number;
  retryCount: number;
  priority: number;
}

export const DEFAULT_OCR_PROVIDERS: OcrProviderConfig[] = [
  {
    name: "paddleocr",
    endpoint: process.env.OCR_SERVER_URL || "http://localhost:8001",
    timeout: Number(process.env.GRADING_NAME_OCR_TIMEOUT_MS || 4500),
    retryCount: 2,
    priority: 1,
  },
  {
    name: "easyocr",
    endpoint: process.env.NAME_OCR_EASYOCR_URL || "http://localhost:8002",
    timeout: Number(process.env.GRADING_NAME_OCR_TIMEOUT_MS || 5000),
    retryCount: 2,
    priority: 2,
  },
  {
    name: "trocr",
    endpoint: process.env.NAME_OCR_TROCR_URL || "http://localhost:8003",
    timeout: Number(process.env.GRADING_NAME_OCR_TIMEOUT_MS || 6000),
    retryCount: 1,
    priority: 3,
  },
  {
    name: "ocr_advanced",
    endpoint: process.env.OCR_SIM_SERVER_URL || "http://localhost:8000",
    timeout: Number(process.env.GRADING_NAME_OCR_TIMEOUT_MS || 4500),
    retryCount: 2,
    priority: 4,
  },
  {
    name: "ocr_process",
    endpoint: "", // Internal endpoint
    timeout: Number(process.env.GRADING_NAME_OCR_TIMEOUT_MS || 4000),
    retryCount: 1,
    priority: 5,
  },
];

// ======================== TYPES ========================

export interface OcrTextRegion {
  text: string;
  confidence: number;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  polygon?: Array<{ x: number; y: number }>;
}

export interface OcrResult {
  provider: string;
  regions: OcrTextRegion[];
  fullText: string;
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface NameRecognitionResult {
  name: string;
  confidence: number;
  provider: string;
  attemptedProviders: string[];
  alternatives: string[];
  processingTime: number;
}

// ======================== SCHEMAS ========================

const OcrRegionSchema = z.object({
  text: z.string(),
  confidence: z.number().optional().default(1),
  bbox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  polygon: z.array(z.object({
    x: z.number(),
    y: z.number(),
  })).optional(),
});

const OcrResultSchema = z.object({
  regions: z.array(OcrRegionSchema).optional().default([]),
  text: z.string().optional(),
  full_text: z.string().optional(),
  confidence: z.number().optional().default(1),
  data: z.object({
    text: z.string().optional(),
    confidence: z.number().optional(),
    lines: z.array(z.union([
      z.string(),
      z.object({
        text: z.string(),
        confidence: z.number().optional(),
      }),
    ])).optional(),
  }).optional(),
  result: z.object({
    text: z.string().optional(),
    confidence: z.number().optional(),
    recognition_results: z.object({
      full_text: z.string().optional(),
      text_regions: z.array(z.object({
        text: z.string(),
        confidence: z.number().optional(),
      })).optional(),
      average_confidence: z.number().optional(),
    }).optional(),
    extracted_data: z.object({
      fields: z.object({
        name: z.object({
          value: z.string(),
          confidence: z.number().optional(),
        }).optional(),
      }).optional(),
      raw_text: z.string().optional(),
      confidence_score: z.number().optional(),
    }).optional(),
  }).optional(),
  lines: z.array(z.union([
    z.string(),
    z.object({
      text: z.string(),
      confidence: z.number().optional(),
    }),
  ])).optional(),
});

// ======================== IMAGE PREPROCESSING ========================

/**
 * Preprocess image for OCR using multiple enhancement techniques
 * Implements DBNet-style preprocessing
 */
export async function preprocessForOcr(imageBuffer: Buffer): Promise<{
  crops: Buffer[];
  metadata: {
    originalWidth: number;
    originalHeight: number;
    cropCount: number;
  };
}> {
  const sharp = (await import("sharp")).default;
  
  // Resize to standard width for consistency
  const STD_WIDTH = 1200;
  
  const base = await sharp(imageBuffer)
    .rotate()
    .resize({ width: STD_WIDTH, withoutEnlargement: true })
    .grayscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = base.info.width;
  const H = base.info.height;

  // Student name region bands (fractions of image)
  const NAME_BANDS = [
    { left: 0.45, top: 0.18, right: 0.82, bottom: 0.228 },
    { left: 0.41, top: 0.172, right: 0.85, bottom: 0.236 },
    { left: 0.38, top: 0.165, right: 0.87, bottom: 0.248 },
  ];

  const crops: Buffer[] = [];

  for (const band of NAME_BANDS) {
    const left = Math.max(0, Math.round(band.left * W));
    const top = Math.max(0, Math.round(band.top * H));
    const right = Math.max(left + 1, Math.min(W, Math.round(band.right * W)));
    const bottom = Math.max(top + 1, Math.min(H, Math.round(band.bottom * H)));
    
    const width = right - left;
    const height = bottom - top;
    
    if (width < 40 || height < 12) continue;

    // Create multiple enhanced versions
    const baseCrop = sharp(base.data, { 
      raw: { width: W, height: H, channels: 1 } 
    })
      .extract({ left, top, width, height })
      .resize({ width: Math.max(900, width * 3), kernel: "lanczos3" })
      .grayscale()
      .normalise();

    // Version 1: Enhanced with sharpening (DBNet-style)
    const v1 = await baseCrop
      .clone()
      .sharpen({ sigma: 1.1, m1: 1, m2: 2 })
      .png({ compressionLevel: 9 })
      .toBuffer();

    // Version 2: Thresholded (EAST-style binarization)
    const v2 = await baseCrop
      .clone()
      .threshold(165, { grayscale: true })
      .png({ compressionLevel: 9 })
      .toBuffer();

    // Version 3: Adaptive contrast (CRNN-friendly)
    const v3 = await baseCrop
      .clone()
      .normalize()
      .gamma(1.2)
      .png({ compressionLevel: 9 })
      .toBuffer();

    crops.push(v1, v2, v3);
  }

  return {
    crops,
    metadata: {
      originalWidth: W,
      originalHeight: H,
      cropCount: crops.length,
    },
  };
}

// ======================== OCR PROVIDERS ========================

/**
 * Call PaddleOCR endpoint (DBNet + CRNN pipeline)
 */
async function callPaddleOcr(
  image: Buffer,
  endpoint: string,
  timeout: number
): Promise<OcrResult> {
  const startTime = Date.now();
  
  try {
    const form = new FormData();
    form.append("file", new File([image], "ocr.png", { type: "image/png" }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${endpoint}/ocr`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`PaddleOCR HTTP ${response.status}`);
    }

    const payload = await response.json();
    const parsed = OcrResultSchema.parse(payload);

    const regions: OcrTextRegion[] = [];
    
    // Parse PaddleOCR response format
    if (Array.isArray(parsed.regions)) {
      regions.push(...parsed.regions);
    }
    
    // Parse alternative formats
    const text = parsed.text || parsed.full_text || parsed.data?.text || parsed.result?.text;
    const confidence = parsed.confidence ?? parsed.result?.recognition_results?.average_confidence ?? 1;
    
    if (text) {
      regions.push({ text, confidence });
    }

    // Parse lines
    const lines = parsed.data?.lines || parsed.lines || parsed.result?.recognition_results?.text_regions || [];
    for (const line of lines) {
      if (typeof line === "string") {
        regions.push({ text: line, confidence });
      } else if (line && typeof line === "object" && "text" in line) {
        regions.push({ 
          text: line.text, 
          confidence: line.confidence ?? confidence 
        });
      }
    }

    return {
      provider: "paddleocr",
      regions,
      fullText: text || regions.map(r => r.text).join("\n"),
      processingTime: Date.now() - startTime,
      success: true,
    };
  } catch (error: any) {
    return {
      provider: "paddleocr",
      regions: [],
      fullText: "",
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Call EasyOCR endpoint
 */
async function callEasyOcr(
  image: Buffer,
  endpoint: string,
  timeout: number
): Promise<OcrResult> {
  const startTime = Date.now();
  
  try {
    const form = new FormData();
    form.append("image", new File([image], "ocr.png", { type: "image/png" }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`EasyOCR HTTP ${response.status}`);
    }

    const payload = await response.json();
    const parsed = OcrResultSchema.parse(payload);

    const regions: OcrTextRegion[] = [];
    const text = parsed.text || parsed.full_text || parsed.result?.extracted_data?.raw_text;
    const confidence = parsed.confidence ?? parsed.result?.extracted_data?.confidence_score ?? 1;

    if (text) regions.push({ text, confidence });

    // Parse EasyOCR detection boxes
    if (Array.isArray(payload.detections)) {
      for (const det of payload.detections) {
        regions.push({
          text: det.text || "",
          confidence: det.confidence || 0,
          bbox: det.bbox,
          polygon: det.polygon,
        });
      }
    }

    return {
      provider: "easyocr",
      regions,
      fullText: text || regions.map(r => r.text).join("\n"),
      processingTime: Date.now() - startTime,
      success: true,
    };
  } catch (error: any) {
    return {
      provider: "easyocr",
      regions: [],
      fullText: "",
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Call TrOCR endpoint (Transformer-based OCR)
 */
async function callTrOcr(
  image: Buffer,
  endpoint: string,
  timeout: number
): Promise<OcrResult> {
  const startTime = Date.now();
  
  try {
    const form = new FormData();
    form.append("file", new File([image], "ocr.png", { type: "image/png" }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`TrOCR HTTP ${response.status}`);
    }

    const payload = await response.json();
    const parsed = OcrResultSchema.parse(payload);

    const text = parsed.text || 
                 parsed.full_text || 
                 parsed.result?.text ||
                 parsed.result?.recognition_results?.full_text;
    const confidence = parsed.confidence ?? 
                       parsed.result?.recognition_results?.average_confidence ?? 1;

    const regions: OcrTextRegion[] = [];
    if (text) regions.push({ text, confidence });

    return {
      provider: "trocr",
      regions,
      fullText: text || "",
      processingTime: Date.now() - startTime,
      success: true,
    };
  } catch (error: any) {
    return {
      provider: "trocr",
      regions: [],
      fullText: "",
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Call internal OCR process endpoint
 */
async function callOcrProcess(
  image: Buffer,
  reqOrigin: string,
  timeout: number
): Promise<OcrResult> {
  const startTime = Date.now();
  
  try {
    const form = new FormData();
    form.append("file", new File([image], "ocr.png", { type: "image/png" }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${reqOrigin}/api/ocr-process`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`OCR Process HTTP ${response.status}`);
    }

    const payload = await response.json();
    const parsed = OcrResultSchema.parse(payload);

    const text = parsed.text || parsed.full_text || parsed.data?.text;
    const confidence = parsed.confidence ?? 1;

    const regions: OcrTextRegion[] = [];
    if (text) regions.push({ text, confidence });

    return {
      provider: "ocr_process",
      regions,
      fullText: text || "",
      processingTime: Date.now() - startTime,
      success: true,
    };
  } catch (error: any) {
    return {
      provider: "ocr_process",
      regions: [],
      fullText: "",
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Call advanced OCR endpoint (EAST/DBNet + CRNN pipeline)
 */
async function callOcrAdvanced(
  image: Buffer,
  endpoint: string,
  timeout: number
): Promise<OcrResult> {
  const startTime = Date.now();
  
  try {
    const form = new FormData();
    form.append("image", new File([image], "ocr.png", { type: "image/png" }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${endpoint}/api/ocr/process-sync`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`OCR Advanced HTTP ${response.status}`);
    }

    const payload = await response.json();
    const parsed = OcrResultSchema.parse(payload);

    const text = parsed.text || 
                 parsed.full_text || 
                 parsed.result?.text ||
                 parsed.result?.extracted_data?.raw_text;
    const confidence = parsed.confidence ?? 
                       parsed.result?.extracted_data?.confidence_score ?? 1;

    const regions: OcrTextRegion[] = [];
    if (text) regions.push({ text, confidence });

    // Parse structured fields
    const nameField = parsed.result?.extracted_data?.fields?.name?.value;
    if (nameField) {
      regions.push({
        text: nameField,
        confidence: parsed.result.extracted_data.fields.name.confidence ?? confidence,
      });
    }

    return {
      provider: "ocr_advanced",
      regions,
      fullText: text || "",
      processingTime: Date.now() - startTime,
      success: true,
    };
  } catch (error: any) {
    return {
      provider: "ocr_advanced",
      regions: [],
      fullText: "",
      processingTime: Date.now() - startTime,
      success: false,
      error: error.message,
    };
  }
}

// ======================== NAME VALIDATION ========================

/**
 * Check if text is likely a Vietnamese student name
 */
export function isLikelyNameText(text: string): boolean {
  if (!text || text.length < 5) return false;
  if (/\d/.test(text)) return false; // No digits in names
  
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 7) return false;
  
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (letters < 5) return false;
  
  const letterRatio = letters / Math.max(1, text.length);
  return letterRatio > 0.6;
}

/**
 * Normalize student name text
 */
export function normalizeStudentName(raw: string): string {
  let text = raw
    // Remove common OCR artifacts and labels
    .replace(/\b(h[ọo]\s*v[àa]\s*t[êe]n(?:\s*th[íi]\s*sinh)?|ho va ten(?: thi sinh)?|full\s*name|name)\b[:\-]*/giu, " ")
    .replace(/[^\p{L}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  
  // Apply title case for Vietnamese names
  return text
    .toLowerCase()
    .replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}

/**
 * Score a name candidate based on quality metrics
 */
export function scoreName(name: string, confidence: number): number {
  if (!isLikelyNameText(name)) return 0;
  
  const words = name.split(/\s+/).filter(Boolean).length;
  const letters = (name.match(/\p{L}/gu) || []).length;
  const letterRatio = letters / Math.max(1, name.length);
  
  const wordScore = Math.min(1, words / 3);
  const lenScore = Math.min(1, letters / 14);
  
  // Weighted scoring
  return confidence * 0.45 + wordScore * 0.25 + lenScore * 0.2 + letterRatio * 0.1;
}

// ======================== MAIN RECOGNITION ========================

/**
 * Recognize student name from answer sheet using multi-provider OCR
 * 
 * Algorithm:
 * 1. Preprocess image with DBNet-style enhancements
 * 2. Try each OCR provider in priority order
 * 3. Collect all name candidates
 * 4. Score and rank candidates
 * 5. Return best match with confidence
 */
export async function recognizeStudentName(
  sheetGray: Buffer,
  w: number,
  h: number,
  reqOrigin: string,
  providers?: OcrProviderConfig[]
): Promise<NameRecognitionResult> {
  const startTime = Date.now();
  
  const activeProviders = providers || DEFAULT_OCR_PROVIDERS.filter(p => {
    // Filter out providers without valid endpoints
    if (p.name === "ocr_process") return true; // Internal endpoint
    return !!p.endpoint && p.endpoint !== "http://localhost:8002" && p.endpoint !== "http://localhost:8003";
  });

  if (activeProviders.length === 0) {
    return {
      name: "",
      confidence: 0,
      provider: "",
      attemptedProviders: [],
      alternatives: [],
      processingTime: 0,
    };
  }

  // Preprocess image
  const { crops } = await preprocessForOcr(sheetGray);
  
  if (crops.length === 0) {
    return {
      name: "",
      confidence: 0,
      provider: "",
      attemptedProviders: [],
      alternatives: [],
      processingTime: Date.now() - startTime,
    };
  }

  const allCandidates: Array<{
    provider: string;
    text: string;
    confidence: number;
    score: number;
  }> = [];

  const attemptedProviders: string[] = [];

  // Try each provider
  for (const provider of activeProviders) {
    attemptedProviders.push(provider.name);
    
    let ocrResult: OcrResult | null = null;

    switch (provider.name) {
      case "paddleocr":
        ocrResult = await callPaddleOcr(crops[0], provider.endpoint, provider.timeout);
        break;
      case "easyocr":
        ocrResult = await callEasyOcr(crops[0], provider.endpoint, provider.timeout);
        break;
      case "trocr":
        ocrResult = await callTrOcr(crops[0], provider.endpoint, provider.timeout);
        break;
      case "ocr_process":
        ocrResult = await callOcrProcess(crops[0], reqOrigin, provider.timeout);
        break;
      case "ocr_advanced":
        ocrResult = await callOcrAdvanced(crops[0], provider.endpoint, provider.timeout);
        break;
    }

    if (!ocrResult?.success || !ocrResult.regions.length) {
      continue;
    }

    // Collect all text regions as candidates
    for (const region of ocrResult.regions) {
      const normalized = normalizeStudentName(region.text);
      if (!normalized || !isLikelyNameText(normalized)) continue;

      const score = scoreName(normalized, region.confidence);
      if (score < 0.35) continue;

      allCandidates.push({
        provider: provider.name,
        text: normalized,
        confidence: region.confidence,
        score,
      });
    }

    // Early exit if we found a high-confidence match
    if (allCandidates.some(c => c.score >= 0.92)) {
      break;
    }
  }

  if (allCandidates.length === 0) {
    return {
      name: "",
      confidence: 0,
      provider: "",
      attemptedProviders,
      alternatives: [],
      processingTime: Date.now() - startTime,
    };
  }

  // Deduplicate by normalized text (case-insensitive)
  const dedup = new Map<string, typeof allCandidates[0]>();
  for (const c of allCandidates) {
    const key = c.text.toLocaleLowerCase("vi");
    const current = dedup.get(key);
    if (!current || c.score > current.score) {
      dedup.set(key, c);
    }
  }

  // Rank candidates
  const ranked = Array.from(dedup.values())
    .filter(c => c.score > 0.35)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return {
      name: "",
      confidence: 0,
      provider: "",
      attemptedProviders,
      alternatives: [],
      processingTime: Date.now() - startTime,
    };
  }

  const best = ranked[0];
  const alternatives = ranked.slice(1, 4).map(c => c.text);

  return {
    name: best.text,
    confidence: best.confidence,
    provider: best.provider,
    attemptedProviders,
    alternatives,
    processingTime: Date.now() - startTime,
  };
}

// ======================== EXPORTED API ========================

export const DeepLearningOcrService = {
  recognizeStudentName,
  preprocessForOcr,
  isLikelyNameText,
  normalizeStudentName,
  scoreName,
};
