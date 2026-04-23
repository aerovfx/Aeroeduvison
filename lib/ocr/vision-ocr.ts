/**
 * lib/ocr/vision-ocr.ts
 *
 * OCR via OpenAI GPT-4o Vision API.
 * Thay thế toàn bộ Python OCR backends:
 *   - PaddleOCR (port 8001)
 *   - EasyOCR  (port 8002)
 *   - TrOCR    (port 8003)
 *   - Tesseract (ocr_engine.py)
 *   - OCR_BACKEND_URL (Python FastAPI, port 8014)
 *   - RUST_BACKEND_URL OCR (port 8090)
 *
 * Không cần khởi động Python server, không cần cài đặt thêm deps.
 * Chỉ cần OPENAI_API_KEY trong Cloud Run secrets.
 */

import { visionCompletion, DEFAULT_VISION_MODEL } from '@/lib/ai/openai-client';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OcrResult {
  text: string;
  confidence: number;       // 0-1 (estimated from model response quality)
  provider: string;
  language?: string;
  processingTimeMs: number;
}

export interface ExamGradeOcrResult {
  studentName?: string;
  studentId?: string;
  examCode?: string;
  answers: {
    questionId: number | string;
    answer: string;          // e.g. "A", "B", "C", "D" or text
    part?: number;
  }[];
  rawText?: string;
  provider: string;
  processingTimeMs: number;
}

export interface AutoGradeResult {
  answers: { q: number; answer: string }[];
  studentName?: string;
  studentId?: string;
  examCode?: string;
  score?: number;
  rawText: string;
  provider: string;
  processingTimeMs: number;
}

// ── Core: extract plain text ───────────────────────────────────────────────────

/**
 * Extract all text from an image.
 * Supports: Vietnamese + English mixed documents.
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  opts?: {
    language?: 'vi' | 'en' | 'mixed';
    detail?: 'low' | 'high' | 'auto';
    customPrompt?: string;
  }
): Promise<OcrResult> {
  const start = Date.now();

  const langHint =
    opts?.language === 'vi'
      ? 'The document is in Vietnamese. '
      : opts?.language === 'en'
      ? 'The document is in English. '
      : 'The document may contain both Vietnamese and English text. ';

  const prompt =
    opts?.customPrompt ??
    `${langHint}Extract ALL text from this image exactly as it appears. ` +
    `Preserve the layout, line breaks, and formatting as much as possible. ` +
    `Return only the extracted text, nothing else. ` +
    `If there is no text, return an empty string.`;

  try {
    const text = await visionCompletion(imageBuffer, prompt, {
      detail: opts?.detail ?? 'high',
      maxTokens: 4000,
    });

    return {
      text: text.trim(),
      confidence: 0.95,
      provider: `openai-vision/${DEFAULT_VISION_MODEL}`,
      language: opts?.language ?? 'mixed',
      processingTimeMs: Date.now() - start,
    };
  } catch (err) {
    throw new Error(
      `[VisionOCR] extractTextFromImage failed: ${(err as Error).message}`
    );
  }
}

// ── Student name recognition ───────────────────────────────────────────────────

/**
 * Recognize student name from a cropped region of an exam sheet.
 * Replaces: PaddleOCR + EasyOCR + TrOCR failover chain.
 */
export async function recognizeStudentName(
  imageBuffer: Buffer
): Promise<{ name: string; confidence: number; processingTimeMs: number }> {
  const start = Date.now();

  const prompt =
    `This is a cropped section of a Vietnamese exam answer sheet containing the student's full name (Họ và tên). ` +
    `Extract ONLY the student's name. ` +
    `Return just the name text, nothing else. ` +
    `If you cannot read it, return an empty string.`;

  try {
    const rawText = await visionCompletion(imageBuffer, prompt, {
      detail: 'high',
      maxTokens: 50,
    });

    const name = normalizeVietnameseName(rawText.trim());
    return {
      name,
      confidence: name.length > 0 ? 0.9 : 0.1,
      processingTimeMs: Date.now() - start,
    };
  } catch (err) {
    return { name: '', confidence: 0, processingTimeMs: Date.now() - start };
  }
}

// ── Exam auto-grading ─────────────────────────────────────────────────────────

/**
 * Full exam sheet processing: student info + answers → structured result.
 * Replaces: /api/ocr/auto-grade → Python FastAPI at OCR_BACKEND_URL.
 *
 * Supports:
 *   - Multiple choice (bubble sheets, Part 1/Part 2/Part 3)
 *   - Student ID / Exam code grid
 *   - Student name region
 */
export async function processExamSheet(
  imageBuffer: Buffer,
  opts?: {
    totalQuestions?: number;
    examType?: 'multiple_choice' | 'essay' | 'mixed';
    language?: 'vi' | 'en';
  }
): Promise<AutoGradeResult> {
  const start = Date.now();
  const totalQ = opts?.totalQuestions ?? 40;
  const langNote =
    opts?.language === 'vi'
      ? 'Đây là phiếu trả lời của học sinh Việt Nam.'
      : 'This is a student answer sheet.';

  const prompt =
    `${langNote} ` +
    `This is an exam answer sheet. Extract the following information:\n` +
    `1. Student's full name (if visible)\n` +
    `2. Student ID / Số báo danh (if visible, usually a grid of digits)\n` +
    `3. Exam code / Mã đề (if visible)\n` +
    `4. All ${totalQ} multiple choice answers (each bubbled A/B/C/D)\n\n` +
    `Return a JSON object with this exact format (no markdown, pure JSON):\n` +
    `{\n` +
    `  "studentName": "...",\n` +
    `  "studentId": "...",\n` +
    `  "examCode": "...",\n` +
    `  "answers": [{"q": 1, "answer": "A"}, {"q": 2, "answer": "B"}, ...]\n` +
    `}\n` +
    `If a field is not visible, use null or empty string. ` +
    `For answers not clearly marked, use "?" as the answer.`;

  try {
    const raw = await visionCompletion(imageBuffer, prompt, {
      detail: 'high',
      maxTokens: 2000,
    });

    // Parse JSON response
    let parsed: Partial<AutoGradeResult & { answers: { q: number; answer: string }[] }> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If JSON parse fails, return raw text
    }

    return {
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      studentName: parsed.studentName ?? '',
      studentId: parsed.studentId ?? '',
      examCode: parsed.examCode ?? '',
      rawText: raw,
      provider: `openai-vision/${DEFAULT_VISION_MODEL}`,
      processingTimeMs: Date.now() - start,
    };
  } catch (err) {
    throw new Error(
      `[VisionOCR] processExamSheet failed: ${(err as Error).message}`
    );
  }
}

// ── Document digitization ─────────────────────────────────────────────────────

/**
 * Extract structured text from a document/worksheet image.
 * Used by /teacher/document-digitization routes.
 */
export async function digitizeDocument(
  imageBuffer: Buffer,
  opts?: {
    docType?: 'worksheet' | 'textbook' | 'form' | 'general';
    language?: 'vi' | 'en' | 'mixed';
    extractTables?: boolean;
  }
): Promise<{ text: string; tables?: string[][]; rawResponse: string; processingTimeMs: number }> {
  const start = Date.now();

  const tableInstruction = opts?.extractTables
    ? 'If there are tables, represent them as CSV rows separated by newlines, preceded by [TABLE_START] and followed by [TABLE_END]. '
    : '';

  const docTypeHint: Record<string, string> = {
    worksheet: 'Đây là phiếu bài tập của học sinh. ',
    textbook: 'Đây là trang sách giáo khoa. ',
    form: 'Đây là biểu mẫu/form. ',
    general: '',
  };

  const prompt =
    (docTypeHint[opts?.docType ?? 'general'] ?? '') +
    `Extract all text from this document image accurately. ` +
    `Preserve headings, numbered lists, and structure. ` +
    tableInstruction +
    `Language may be Vietnamese, English, or both. ` +
    `Return only the extracted content.`;

  try {
    const rawResponse = await visionCompletion(imageBuffer, prompt, {
      detail: 'high',
      maxTokens: 4000,
    });

    let text = rawResponse.trim();
    let tables: string[][] | undefined;

    if (opts?.extractTables) {
      const tableRegex = /\[TABLE_START\]([\s\S]*?)\[TABLE_END\]/g;
      const tableMatches: string[][] = [];
      let match;
      while ((match = tableRegex.exec(rawResponse)) !== null) {
        const rows = match[1].trim().split('\n').map((row) => row.split(','));
        tableMatches.push(...rows);
        text = text.replace(match[0], '');
      }
      if (tableMatches.length > 0) tables = tableMatches;
    }

    return { text, tables, rawResponse, processingTimeMs: Date.now() - start };
  } catch (err) {
    throw new Error(
      `[VisionOCR] digitizeDocument failed: ${(err as Error).message}`
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeVietnameseName(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-ZÀ-ỹ\s]/g, '') // keep Vietnamese chars + spaces
    .trim();
}
