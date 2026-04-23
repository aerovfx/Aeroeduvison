/**
 * lib/rag/simple-rag.ts
 *
 * RAG đơn giản dùng OpenAI API — không cần Qdrant, không cần Ollama.
 *
 * Kiến trúc mới:
 *   1. Ingest: text extraction → chunk → lưu vào module-level store
 *      (Cloud Run min-instances=1 → instance luôn sống, store không bị reset)
 *   2. Ask:   query → tìm chunks liên quan (keyword + embedding) → context stuffing → OpenAI → answer
 *
 * Với tài liệu lớn, dùng getEmbedding để tìm chunk liên quan nhất.
 * Với tài liệu nhỏ (<6000 tokens), nhét toàn bộ vào context để đơn giản.
 *
 * Env vars:
 *   OPENAI_API_KEY hoặc OPENROUTER_API_KEY (tự động chọn)
 *   OPENAI_DEFAULT_MODEL   — chat model
 *   RAG_MAX_CONTEXT_TOKENS — số tokens context tối đa (default: 6000)
 */

import { chatCompletion, getEmbedding, cosineSimilarity, DEFAULT_CHAT_MODEL } from '@/lib/ai/openai-client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Chunk {
  id: string;
  documentId: string;
  source: string;
  text: string;
  index: number;
  embedding?: number[];
}

interface Document {
  id: string;
  source: string;
  chunks: Chunk[];
  createdAt: number;
}

export interface IngestResult {
  documentId: string;
  source: string;
  chunksCount: number;
  chunkIds: string[];
}

export interface RagAskResult {
  answer: string;
  contextChunks: { text: string; source: string; score: number }[];
  model: string;
}

// ── In-memory document store ───────────────────────────────────────────────────
// Dùng global để survive giữa các requests (Next.js Edge + Node.js runtime)
declare global {
  // eslint-disable-next-line no-var
  var __ragDocuments: Map<string, Document> | undefined;
}

function getStore(): Map<string, Document> {
  if (!global.__ragDocuments) {
    global.__ragDocuments = new Map();
  }
  return global.__ragDocuments;
}

// ── Text chunking ──────────────────────────────────────────────────────────────

function chunkText(
  text: string,
  chunkSize = 800,
  chunkOverlap = 100
): string[] {
  const chunks: string[] = [];
  let start = 0;
  const len = text.length;

  while (start < len) {
    let end = Math.min(start + chunkSize, len);
    // Try to break on sentence boundary
    if (end < len) {
      const breakPoints = ['. ', '.\n', '\n\n', '? ', '! '];
      for (const bp of breakPoints) {
        const idx = text.lastIndexOf(bp, end);
        if (idx > start + chunkSize * 0.5) {
          end = idx + bp.length;
          break;
        }
      }
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) chunks.push(chunk);
    start = end - chunkOverlap;
    if (start >= end) break;
  }

  return chunks;
}

// ── Text extraction from file ──────────────────────────────────────────────────

async function extractText(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const name = filename.toLowerCase();

  // PDF
  if (name.endsWith('.pdf') || mimeType === 'application/pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return data.text;
    } catch (e) {
      throw new Error(`PDF parse failed: ${(e as Error).message}`);
    }
  }

  // Plain text / Markdown
  if (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.mdx') ||
    (mimeType && mimeType.startsWith('text/'))
  ) {
    return buffer.toString('utf-8');
  }

  // JSON
  if (name.endsWith('.json') || mimeType === 'application/json') {
    try {
      const obj = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(obj, null, 2);
    } catch {
      return buffer.toString('utf-8');
    }
  }

  // Fallback: try UTF-8
  return buffer.toString('utf-8');
}

// ── Ingest document ────────────────────────────────────────────────────────────

/**
 * Ingest a file buffer into the RAG store.
 * Supports PDF, TXT, MD.
 */
export async function ragIngest(
  buffer: Buffer,
  filename: string,
  mimeType?: string,
  opts?: { chunkSize?: number; chunkOverlap?: number }
): Promise<IngestResult> {
  const text = await extractText(buffer, filename, mimeType);
  return ragIngestText(text, filename, opts);
}

/**
 * Ingest from URL (GitHub raw, plain text, etc.)
 */
export async function ragIngestFromUrl(
  url: string,
  opts?: { chunkSize?: number; chunkOverlap?: number }
): Promise<IngestResult> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch URL ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const source = url.split('/').pop() ?? url;
  return ragIngestText(text, source, opts);
}

/**
 * Core ingestion: text → chunks → store
 */
export async function ragIngestText(
  text: string,
  source: string,
  opts?: { chunkSize?: number; chunkOverlap?: number }
): Promise<IngestResult> {
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const chunkTexts = chunkText(
    text,
    opts?.chunkSize ?? 800,
    opts?.chunkOverlap ?? 100
  );

  const chunks: Chunk[] = chunkTexts.map((t, i) => ({
    id: `${documentId}_c${i}`,
    documentId,
    source,
    text: t,
    index: i,
  }));

  // Compute embeddings for chunks (background, for better semantic search)
  // Only embed if we have many chunks (small docs will use keyword fallback)
  if (chunks.length > 3) {
    try {
      const embeddings = await Promise.all(
        chunks.map((c) => getEmbedding(c.text).catch(() => undefined))
      );
      embeddings.forEach((emb, i) => {
        if (emb) chunks[i].embedding = emb;
      });
    } catch {
      // Embedding failure is non-fatal — keyword fallback will be used
    }
  }

  getStore().set(documentId, {
    id: documentId,
    source,
    chunks,
    createdAt: Date.now(),
  });

  return {
    documentId,
    source,
    chunksCount: chunks.length,
    chunkIds: chunks.map((c) => c.id),
  };
}

// ── Retrieve relevant chunks ───────────────────────────────────────────────────

async function retrieveChunks(
  query: string,
  k = 3
): Promise<{ text: string; source: string; score: number }[]> {
  const store = getStore();
  if (store.size === 0) return [];

  // Collect all chunks
  const allChunks: Chunk[] = [];
  for (const doc of store.values()) {
    allChunks.push(...doc.chunks);
  }

  // Try semantic search first
  let queryEmbedding: number[] | undefined;
  try {
    queryEmbedding = await getEmbedding(query);
  } catch {
    // Fall back to keyword search
  }

  const scored = allChunks.map((chunk) => {
    let score: number;

    if (queryEmbedding && chunk.embedding) {
      // Semantic similarity
      score = cosineSimilarity(queryEmbedding, chunk.embedding);
    } else {
      // Keyword overlap fallback
      const queryWords = query.toLowerCase().split(/\s+/);
      const chunkLower = chunk.text.toLowerCase();
      const matches = queryWords.filter((w) => w.length > 2 && chunkLower.includes(w));
      score = matches.length / Math.max(queryWords.length, 1);
    }

    return { text: chunk.text, source: chunk.source, score };
  });

  // Sort by score, return top k
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .filter((c) => c.score > 0.01); // filter irrelevant
}

// ── Ask ────────────────────────────────────────────────────────────────────────

/**
 * RAG Q&A: query → retrieve context → OpenAI → answer.
 * Thay thế: ragAsk() từ rag-service.ts (Qdrant + Ollama).
 */
export async function ragAsk(
  query: string,
  opts?: { model?: string; k?: number; systemPrompt?: string }
): Promise<RagAskResult> {
  const contextChunks = await retrieveChunks(query, opts?.k ?? 3);
  const model = opts?.model ?? DEFAULT_CHAT_MODEL;

  const contextText =
    contextChunks.length > 0
      ? contextChunks.map((c, i) => `[${i + 1}] (${c.source})\n${c.text}`).join('\n\n')
      : 'Không có tài liệu nào được nạp vào hệ thống.';

  const systemPrompt =
    opts?.systemPrompt ??
    `Bạn là trợ lý học tập thông minh của AeroEduVision. ` +
    `Hãy trả lời câu hỏi dựa trên ngữ cảnh được cung cấp. ` +
    `Nếu thông tin không có trong ngữ cảnh, hãy nói rõ điều đó. ` +
    `Trả lời bằng tiếng Việt nếu câu hỏi bằng tiếng Việt.`;

  const answer = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          `Ngữ cảnh:\n${contextText}\n\n---\n\nCâu hỏi: ${query}`,
      },
    ],
    { model, temperature: 0.3, maxTokens: 1500 }
  );

  return { answer, contextChunks, model };
}

// ── Store management ──────────────────────────────────────────────────────────

export function listDocuments(): { id: string; source: string; chunksCount: number; createdAt: number }[] {
  return Array.from(getStore().values()).map((d) => ({
    id: d.id,
    source: d.source,
    chunksCount: d.chunks.length,
    createdAt: d.createdAt,
  }));
}

export function deleteDocument(documentId: string): boolean {
  return getStore().delete(documentId);
}

export function clearAllDocuments(): void {
  getStore().clear();
}
