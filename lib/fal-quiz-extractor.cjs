/**
 * fal-quiz-extractor.cjs
 *
 * Trích xuất câu hỏi trắc nghiệm từ PDF bằng fal.ai (any-llm).
 *
 * Quy trình:
 *   1. Nhận buffer PDF
 *   2. pdf-parse → text thô
 *   3. Gọi fal.ai any-llm với model mạnh (anthropic/claude-3.5-sonnet
 *      hoặc google/gemini-flash-1.5) + JSON-only prompt
 *   4. Parse output → mảng câu hỏi chuẩn hoá
 *
 * ENV:
 *   FAL_API_KEY  — bắt buộc, format "key_id:secret"
 *   FAL_MODEL    — optional, mặc định "anthropic/claude-3.5-sonnet"
 *
 * Public API:
 *   extractQuestionsFromPdf(buffer, opts) → { questions, meta, rawText, model }
 *   generateQuestionsFromPdf(buffer, opts) → tương tự nhưng AI tự sinh thêm
 */

'use strict';

// pdf-parse v1 export = function trực tiếp; v2+ export = { default: fn }.
// Defensive resolve để chấp nhận cả 2 shape (phòng `npm install` lấy v2).
const _pdfParseModule = require('pdf-parse');
const pdfParse = typeof _pdfParseModule === 'function'
  ? _pdfParseModule
  : (_pdfParseModule && typeof _pdfParseModule.default === 'function'
      ? _pdfParseModule.default
      : null);
if (!pdfParse) {
  throw new Error('pdf-parse: không resolve được export. Pin pdf-parse@1.1.4 trong package.json.');
}
const falClient = require('./fal-client.cjs');

const DEFAULT_MODEL = process.env.FAL_MODEL || process.env.FAL_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';

// ─────────────────────────────────────────────────────────────
// fal.ai invoke (delegates to lib/fal-client.cjs)
// ─────────────────────────────────────────────────────────────
async function falInvoke({ prompt, model = DEFAULT_MODEL, system = null }) {
  const r = await falClient.complete({
    messages: [{ role: 'user', content: prompt }],
    system,
    model,
  });
  return { output: r.content, model: r.model };
}

// ─────────────────────────────────────────────────────────────
// JSON extraction helpers
// ─────────────────────────────────────────────────────────────
function stripJsonFence(s) {
  if (!s) return '';
  let t = String(s).trim();
  // ```json ... ```  hoặc  ``` ... ```
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1].trim();
  return t;
}

// Sửa các lỗi JSON thường gặp khi LLM tự generate:
//   • \u không theo sau 4 hex digits → escape ngược thành \\u
//   • Trailing comma trong array/object
//   • Literal newline/tab trong string literal (LLM thường wrap text dài
//     và quên escape \n) → tự escape thành \\n / \\t
function sanitizeJsonish(s) {
  if (!s) return s;
  let t = String(s);
  // Bad unicode escape: \u không theo sau bởi 4 hex chars
  t = t.replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
  // Trailing comma trước ] hoặc }
  t = t.replace(/,(\s*[\]}])/g, '$1');
  // Escape control chars (newline/CR/tab) bên trong string literals.
  // State machine: track in-string mode bằng cách đếm unescaped quote.
  let inString = false;
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    const prev = i > 0 ? t[i - 1] : '';
    if (c === '"' && prev !== '\\') {
      inString = !inString;
      out += c;
      continue;
    }
    if (inString) {
      if (c === '\n') { out += '\\n'; continue; }
      if (c === '\r') { out += '\\r'; continue; }
      if (c === '\t') { out += '\\t'; continue; }
      if (c === '\b') { out += '\\b'; continue; }
      if (c === '\f') { out += '\\f'; continue; }
    }
    out += c;
  }
  return out;
}

function tryParseJsonArray(s) {
  const t = stripJsonFence(s);
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON array found in model output');
  }
  const slice = t.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (e) {
    // Retry với sanitize — handle bad unicode escape, trailing comma...
    return JSON.parse(sanitizeJsonish(slice));
  }
}

function tryParseJsonObject(s) {
  const t = stripJsonFence(s);
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found');
  const slice = t.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return JSON.parse(sanitizeJsonish(slice));
  }
}

// ─────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────
function buildExtractPrompt(text, opts) {
  const grade = opts.grade || '11';
  const language = opts.language || 'Vietnamese';
  return [
    `Bạn là trợ lý số hoá đề thi. Đề thi sau là môn ${opts.subject || 'Vật lí'} lớp ${grade}.`,
    `Hãy TRÍCH XUẤT toàn bộ câu hỏi trắc nghiệm có sẵn trong đề (không tự sinh thêm).`,
    ``,
    `YÊU CẦU OUTPUT — CHỈ trả về JSON array hợp lệ, KHÔNG markdown, KHÔNG giải thích.`,
    `Mỗi phần tử có schema:`,
    `{`,
    `  "index": <số thứ tự>,`,
    `  "questionType": "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER",`,
    `  "content": "<nội dung câu hỏi>",`,
    `  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],   // bỏ trống nếu SHORT_ANSWER`,
    `  "correctAnswer": "A" | "B" | "C" | "D" | "<chuỗi>"     // chỉ chữ cái cho MCQ`,
    `}`,
    ``,
    `Lưu ý:`,
    `- Giữ nguyên ký hiệu toán/lý (Ω, U, I, R, ²...) như văn bản gốc.`,
    `- Nếu đề có đáp án sẵn (đã đánh dấu hoặc bảng đáp án ở cuối), dùng đáp án đó.`,
    `- Nếu KHÔNG biết đáp án chắc chắn, đặt correctAnswer là "" (chuỗi rỗng).`,
    `- Ngôn ngữ output: ${language}.`,
    ``,
    `=== ĐỀ THI ===`,
    text.slice(0, 60_000),
    `=== HẾT ===`,
    ``,
    `Trả về JSON array ngay bây giờ:`,
  ].join('\n');
}

function buildGeneratePrompt(text, opts) {
  const grade = opts.grade || '11';
  const language = opts.language || 'Vietnamese';
  const count = opts.count || 20;
  return [
    `Bạn là giáo viên ra đề ${opts.subject || 'Vật lí'} lớp ${grade}.`,
    `Dựa trên TÀI LIỆU bên dưới (chương/bài học), HÃY SINH ${count} câu hỏi trắc nghiệm mới`,
    `cùng chủ đề, cùng độ khó, KHÔNG sao chép nguyên văn câu hỏi cũ.`,
    ``,
    `OUTPUT: JSON array, mỗi phần tử:`,
    `{`,
    `  "index": <số thứ tự bắt đầu từ 1>,`,
    `  "questionType": "MULTIPLE_CHOICE",`,
    `  "content": "<câu hỏi mới>",`,
    `  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],`,
    `  "correctAnswer": "A" | "B" | "C" | "D",`,
    `  "explanation": "<giải thích ngắn>"`,
    `}`,
    ``,
    `Ngôn ngữ: ${language}. Chỉ trả về JSON, không markdown.`,
    ``,
    `=== TÀI LIỆU ===`,
    text.slice(0, 60_000),
    `=== HẾT ===`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// Normalization
// ─────────────────────────────────────────────────────────────
function normalizeQuestion(q, idx) {
  const type = String(q.questionType || q.type || 'MULTIPLE_CHOICE').toUpperCase();
  const opts = Array.isArray(q.options) ? q.options.map(s => String(s).trim()).filter(Boolean) : [];
  let correct = q.correctAnswer ?? q.answer ?? '';
  if (typeof correct !== 'string') correct = String(correct);
  correct = correct.trim();
  // Chuẩn hoá: nếu correct là "A. xxx" → chỉ lấy "A"
  if (type === 'MULTIPLE_CHOICE' && correct.length > 1) {
    const m = correct.match(/^[A-D]/i);
    if (m) correct = m[0].toUpperCase();
  }
  return {
    index: Number(q.index) || idx + 1,
    questionType: type,
    content: String(q.content || q.question || '').trim(),
    options: opts,
    correctAnswer: correct,
    explanation: q.explanation ? String(q.explanation) : undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
async function pdfBufferToText(buffer) {
  const result = await pdfParse(buffer);
  // pdf-parse trả {text, numpages, info}
  return {
    text: result.text || '',
    pages: result.numpages || 0,
    info: result.info || {},
  };
}

// Extract questions từ text thô (LaTeX source, Markdown, plain text...).
// Reuse logic của extractQuestionsFromPdf nhưng skip pdf-parse step.
async function extractQuestionsFromText(text, opts = {}) {
  const t0 = Date.now();
  const cleanText = String(text || '').trim();
  if (cleanText.length < 20) {
    throw new Error('Text quá ngắn — cần ≥20 ký tự để extract');
  }
  const prompt = buildExtractPrompt(cleanText, opts);
  const { output, model } = await falInvoke({
    prompt,
    model: opts.model || DEFAULT_MODEL,
    system: 'You are a precise JSON extractor. You only output valid JSON arrays. No prose, no markdown fences.',
  });
  let raw;
  try { raw = tryParseJsonArray(output); }
  catch (e) {
    throw new Error(`Model output không phải JSON hợp lệ: ${e.message}\nOutput: ${String(output).slice(0, 400)}`);
  }
  if (!Array.isArray(raw)) throw new Error('Model output không phải mảng');
  const questions = raw.map(normalizeQuestion);
  return {
    questions,
    meta: { tookMs: Date.now() - t0, mode: 'extract-text', sourceLength: cleanText.length },
    _internalModel: model,
  };
}

async function extractQuestionsFromPdf(buffer, opts = {}) {
  const t0 = Date.now();
  const { text, pages, info } = await pdfBufferToText(buffer);
  if (!text || text.trim().length < 20) {
    throw new Error('PDF không đọc được text (có thể là ảnh scan, cần OCR riêng)');
  }
  const prompt = buildExtractPrompt(text, opts);
  const { output, model } = await falInvoke({
    prompt,
    model: opts.model || DEFAULT_MODEL,
    system: 'You are a precise JSON extractor. You only output valid JSON arrays. No prose, no markdown fences.',
  });

  let raw;
  try {
    raw = tryParseJsonArray(output);
  } catch (e) {
    throw new Error(`Model output không phải JSON hợp lệ: ${e.message}\nOutput: ${String(output).slice(0, 400)}`);
  }
  if (!Array.isArray(raw)) {
    throw new Error('Model output không phải mảng');
  }

  const questions = raw.map(normalizeQuestion);
  return {
    questions,
    // KHÔNG trả `model` cho client để tránh expose AI provider/model name.
    // Field internal `_model` dùng cho server-side logging/billing nếu cần.
    meta: {
      pages,
      pdfTitle: info?.Title || null,
      pdfAuthor: info?.Author || null,
      tookMs: Date.now() - t0,
      mode: 'extract',
    },
    _internalModel: model,
  };
}

// Sinh câu hỏi từ chủ đề/môn/lớp KHÔNG cần source text — dùng cho student
// "Tạo đề thi thử" khi ngân hàng chưa có đủ câu cho topic.
async function generateQuestionsByTopic(opts = {}) {
  const t0 = Date.now();
  const subject = opts.subject || 'Vật lí';
  const grade = opts.grade || '11';
  const topic = opts.topic || 'tổng hợp';
  const count = opts.count || 10;
  const difficulty = opts.difficulty || 'medium';

  const prompt = [
    `Bạn là giáo viên ra đề ${subject} lớp ${grade}.`,
    `Hãy SINH ${count} câu hỏi trắc nghiệm mới về chủ đề: "${topic}".`,
    `Độ khó: ${difficulty} (easy=cơ bản, medium=trung bình, hard=khó).`,
    ``,
    `OUTPUT: CHỈ trả về JSON array, KHÔNG markdown, KHÔNG giải thích trước/sau JSON.`,
    `Mỗi phần tử có schema:`,
    `{`,
    `  "index": <số thứ tự bắt đầu 1>,`,
    `  "questionType": "MULTIPLE_CHOICE",`,
    `  "content": "<câu hỏi đầy đủ, có thể chứa LaTeX $...$>",`,
    `  "topic": "${topic}",`,
    `  "options": ["A. <option>", "B. <option>", "C. <option>", "D. <option>"],`,
    `  "correctAnswer": "A" | "B" | "C" | "D",`,
    `  "explanation": "<giải thích ngắn 1-2 câu>"`,
    `}`,
    ``,
    `Yêu cầu chất lượng:`,
    `- Câu hỏi rõ ràng, đúng kiến thức ${subject} chương trình lớp ${grade}.`,
    `- 4 đáp án phải khác nhau, chỉ 1 đúng. Đáp án sai phải hợp lý (gây nhiễu thật sự).`,
    `- Giải thích ngắn gọn, dễ hiểu.`,
    `- Dùng ký hiệu LaTeX cho công thức: $E = mc^2$, $\\vec{F} = m\\vec{a}$, etc.`,
    `- Ngôn ngữ: Tiếng Việt.`,
    ``,
    `Bắt đầu trả về JSON array ngay (không có \`\`\`json):`,
  ].join('\n');

  const { output, model } = await falInvoke({
    prompt,
    model: opts.model || DEFAULT_MODEL,
    system: 'You are a precise JSON generator. You only output valid JSON arrays. No prose, no markdown fences.',
  });
  let raw;
  try { raw = tryParseJsonArray(output); }
  catch (e) {
    throw new Error(`AI generate JSON lỗi: ${e.message}\nOutput: ${String(output).slice(0, 400)}`);
  }
  if (!Array.isArray(raw)) throw new Error('AI output không phải mảng');
  const questions = raw.map(normalizeQuestion);
  return {
    questions,
    meta: { tookMs: Date.now() - t0, mode: 'generate-topic', subject, grade, topic, difficulty },
    _internalModel: model,
  };
}

async function generateQuestionsFromPdf(buffer, opts = {}) {
  const t0 = Date.now();
  const { text, pages } = await pdfBufferToText(buffer);
  if (!text || text.trim().length < 20) {
    throw new Error('PDF không đọc được text (có thể là ảnh scan, cần OCR riêng)');
  }
  const prompt = buildGeneratePrompt(text, opts);
  const { output, model } = await falInvoke({
    prompt,
    model: opts.model || DEFAULT_MODEL,
    system: 'You are a precise JSON generator. Output only valid JSON arrays.',
  });
  const raw = tryParseJsonArray(output);
  const questions = raw.map(normalizeQuestion);
  return {
    questions,
    meta: { pages, tookMs: Date.now() - t0, mode: 'generate' },
    _internalModel: model,
  };
}

module.exports = {
  extractQuestionsFromPdf,
  extractQuestionsFromText,
  generateQuestionsFromPdf,
  generateQuestionsByTopic,
  pdfBufferToText,
  // expose internals for testing
  _internal: { falInvoke, tryParseJsonArray, tryParseJsonObject, normalizeQuestion },
};
