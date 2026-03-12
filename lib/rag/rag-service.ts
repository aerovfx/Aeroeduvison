/**
 * RAG (Retrieval-Augmented Generation) với Ollama.
 * Pipeline: Documents (PDF/TXT/MD) → Text Extraction → Chunking → Embedding → Vector DB
 *           → User Query → Semantic Search → Context Retrieval → LLM (Ollama) → Answer
 */

import { getEmbeddingService } from '@/lib/embeddings/service';
import { getQdrantRagClient } from '@/lib/vector-db/qdrant';
import { loadDocumentFromBuffer, loadDocumentFromUrl } from './document-loaders';
import { splitTextIntoChunks } from './chunker';
import { createId } from '@paralleldrive/cuid2';

const OLLAMA_BASE = process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_LLM_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';
const RAG_EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || undefined; // use embedding service default

export interface IngestResult {
  documentId: string;
  source: string;
  chunksCount: number;
  chunkIds: string[];
}

export interface RAGAskOptions {
  model?: string;
  k?: number;
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Ingest: đọc file (PDF/TXT/MD) → chunk → embed → lưu vector DB (collection RAG).
 */
export async function ragIngest(
  buffer: Buffer,
  filename: string,
  mimeType?: string,
  options: { chunkSize?: number; chunkOverlap?: number } = {}
): Promise<IngestResult> {
  const doc = await loadDocumentFromBuffer(buffer, filename, mimeType);
  const chunks = splitTextIntoChunks(doc.text, {
    chunkSize: options.chunkSize ?? 500,
    chunkOverlap: options.chunkOverlap ?? 50,
  });

  if (chunks.length === 0) {
    return {
      documentId: createId(),
      source: filename,
      chunksCount: 0,
      chunkIds: [],
    };
  }

  const embeddingService = getEmbeddingService();
  const texts = chunks.map((c) => c.text);
  const embeddingResults = await embeddingService.generateEmbeddings(texts, {
    model: RAG_EMBEDDING_MODEL,
  });

  const docId = createId();
  const points = chunks.map((chunk, i) => ({
    id: `${docId}_chunk_${i}`,
    vector: embeddingResults[i].embedding,
    payload: {
      text: chunk.text,
      source: filename,
      documentId: docId,
      chunkIndex: chunk.index,
    },
  }));

  const qdrant = getQdrantRagClient();
  await qdrant.ensureCollection();
  await qdrant.upsertPoints(points);

  return {
    documentId: docId,
    source: filename,
    chunksCount: chunks.length,
    chunkIds: points.map((p) => String(p.id)),
  };
}

/**
 * Ingest từ URL (GitHub blob/raw, hoặc URL trả về Markdown/TXT).
 */
export async function ragIngestFromUrl(
  url: string,
  options: { chunkSize?: number; chunkOverlap?: number } = {}
): Promise<IngestResult> {
  const doc = await loadDocumentFromUrl(url);
  const chunks = splitTextIntoChunks(doc.text, {
    chunkSize: options.chunkSize ?? 500,
    chunkOverlap: options.chunkOverlap ?? 50,
  });

  if (chunks.length === 0) {
    return {
      documentId: createId(),
      source: doc.source,
      chunksCount: 0,
      chunkIds: [],
    };
  }

  const embeddingService = getEmbeddingService();
  const texts = chunks.map((c) => c.text);
  const embeddingResults = await embeddingService.generateEmbeddings(texts, {
    model: RAG_EMBEDDING_MODEL,
  });

  const docId = createId();
  const points = chunks.map((chunk, i) => ({
    id: `${docId}_chunk_${i}`,
    vector: embeddingResults[i].embedding,
    payload: {
      text: chunk.text,
      source: doc.source,
      documentId: docId,
      chunkIndex: chunk.index,
    },
  }));

  const qdrant = getQdrantRagClient();
  await qdrant.ensureCollection();
  await qdrant.upsertPoints(points);

  return {
    documentId: docId,
    source: doc.source,
    chunksCount: chunks.length,
    chunkIds: points.map((p) => String(p.id)),
  };
}

/**
 * Semantic search trong vector DB RAG.
 */
export async function ragRetrieve(
  query: string,
  k: number = 3
): Promise<{ text: string; score: number; source?: string }[]> {
  const embeddingService = getEmbeddingService();
  const res = await embeddingService.generateEmbedding(query, {
    model: RAG_EMBEDDING_MODEL,
  });

  const qdrant = getQdrantRagClient();
  await qdrant.ensureCollection();
  const results = await qdrant.search(res.embedding, k, undefined, undefined);

  return results.map((r) => ({
    text: (r.payload?.text as string) || '',
    score: r.score,
    source: r.payload?.source as string | undefined,
  }));
}

/**
 * RAG ask: query → retrieve context → build prompt → Ollama → answer.
 */
export async function ragAsk(
  question: string,
  options: RAGAskOptions = {}
): Promise<{ answer: string; contextChunks: number; model: string }> {
  const k = options.k ?? 3;
  const model = options.model ?? DEFAULT_LLM_MODEL;

  const docs = await ragRetrieve(question, k);
  const context = docs.map((d) => d.text).join('\n\n');
  const contextTrimmed = context.substring(0, 4000);

  const prompt = `Dựa vào tài liệu sau:

${contextTrimmed}

Trả lời câu hỏi (bằng tiếng Việt nếu phù hợp):
${question}`;

  const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama generate failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as { response?: string };
  const answer = (data.response || '').trim();

  return {
    answer,
    contextChunks: docs.length,
    model,
  };
}
