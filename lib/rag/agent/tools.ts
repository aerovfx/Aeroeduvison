/**
 * RAG Agent Tools (OpenFang-style)
 * Search, Index, Summarize – dùng bởi Planner Agent.
 */

import { ragRetrieve, ragIngest } from '../rag-service';

const OLLAMA_BASE = process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_LLM_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';

/** Search VectorDB (Qdrant RAG collection) */
export async function searchTool(
  query: string,
  k: number = 5
): Promise<{ context: string; chunks: { text: string; score: number; source?: string }[] }> {
  const chunks = await ragRetrieve(query, k);
  const context = chunks.map((d) => d.text).join('\n\n');
  return { context, chunks };
}

/** Index document (buffer + filename) → chunk → embed → store */
export async function indexTool(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<{ documentId: string; source: string; chunksCount: number }> {
  const result = await ragIngest(buffer, filename, mimeType);
  return {
    documentId: result.documentId,
    source: result.source,
    chunksCount: result.chunksCount,
  };
}

/** Summarize long text via Ollama */
export async function summarizeTool(
  longText: string,
  model: string = DEFAULT_LLM_MODEL,
  maxInputChars: number = 6000
): Promise<string> {
  const input = longText.substring(0, maxInputChars);
  const prompt = `Tóm tắt ngắn gọn nội dung sau (tiếng Việt hoặc giữ nguyên ngôn ngữ), chỉ đưa ra bản tóm tắt không giải thích thêm:

${input}`;

  const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama summarize failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as { response?: string };
  return (data.response || '').trim();
}
