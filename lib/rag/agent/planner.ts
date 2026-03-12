/**
 * RAG Agent Planner (OpenFang-style)
 * Quyết định: cần index? → search? → summarize? → answer.
 * Pipeline: User Question → Planner → Tools (Search / Index / Summarize) → Answer Agent (Ollama).
 */

import { searchTool, summarizeTool } from './tools';

const OLLAMA_BASE = process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const DEFAULT_LLM_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5';

export interface AgentStep {
  step: 'index' | 'search' | 'summarize' | 'answer';
  result?: string;
  detail?: Record<string, unknown>;
}

export interface AgentRunResult {
  answer: string;
  steps: AgentStep[];
  model: string;
  contextChunks: number;
}

export interface AgentRunOptions {
  model?: string;
  /** Số đoạn lấy từ vector DB */
  k?: number;
  /** Nếu context dài hơn ngưỡng này thì tóm tắt trước khi trả lời (0 = tắt) */
  summarizeThreshold?: number;
}

/**
 * Answer Agent: sinh câu trả lời từ context + question (Ollama).
 */
async function answerTool(
  question: string,
  context: string,
  model: string
): Promise<string> {
  const contextTrimmed = context.substring(0, 4000);
  const prompt = `Dựa vào tài liệu sau:

${contextTrimmed}

Trả lời câu hỏi (bằng tiếng Việt nếu phù hợp):
${question}`;

  const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama generate failed: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as { response?: string };
  return (data.response || '').trim();
}

/**
 * Chạy pipeline RAG Agent: Search → (Summarize nếu cần) → Answer.
 * Index được gọi riêng khi client upload file (API ingest).
 */
export async function runRAGAgentPipeline(
  question: string,
  options: AgentRunOptions = {}
): Promise<AgentRunResult> {
  const model = options.model ?? DEFAULT_LLM_MODEL;
  const k = options.k ?? 5;
  const summarizeThreshold = options.summarizeThreshold ?? 2500;
  const steps: AgentStep[] = [];

  // 1. Retrieval Agent: search vector DB
  const { context, chunks } = await searchTool(question, k);
  steps.push({
    step: 'search',
    result: `Retrieved ${chunks.length} chunks`,
    detail: { chunksCount: chunks.length, sources: [...new Set(chunks.map((c) => c.source))] },
  });

  let contextForAnswer = context;

  // 2. (Tùy chọn) Summarize nếu context quá dài
  if (summarizeThreshold > 0 && context.length > summarizeThreshold) {
    const summary = await summarizeTool(context, model);
    contextForAnswer = summary;
    steps.push({
      step: 'summarize',
      result: `Summarized ${context.length} chars → ${summary.length} chars`,
      detail: { originalLength: context.length, summaryLength: summary.length },
    });
  }

  // 3. Answer Agent: LLM với context
  const answer = await answerTool(question, contextForAnswer, model);
  steps.push({
    step: 'answer',
    result: answer.substring(0, 200) + (answer.length > 200 ? '...' : ''),
    detail: { length: answer.length },
  });

  return {
    answer,
    steps,
    model,
    contextChunks: chunks.length,
  };
}
