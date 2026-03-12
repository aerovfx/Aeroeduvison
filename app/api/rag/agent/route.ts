/**
 * POST /api/rag/agent
 * RAG Agent (OpenFang-style): Planner → Search / Index / Summarize → Answer (Ollama).
 * Body: { question } hoặc formData với question + optional file (index trước khi hỏi).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runRAGAgentPipeline } from '@/lib/rag/agent';
import { indexTool } from '@/lib/rag/agent/tools';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let question: string | null = null;
    let model: string | undefined;
    let k: number | undefined;
    let summarizeThreshold: number | undefined;
    let indexResult: { documentId: string; source: string; chunksCount: number } | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      question = (formData.get('question') as string) || (formData.get('query') as string) || null;
      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name || 'document';
        const mimeType = file.type || undefined;
        indexResult = await indexTool(buffer, filename, mimeType);
      }
      const modelVal = formData.get('model');
      const kVal = formData.get('k');
      const sumVal = formData.get('summarizeThreshold');
      if (modelVal) model = String(modelVal);
      if (kVal) k = parseInt(String(kVal), 10);
      if (sumVal) summarizeThreshold = parseInt(String(sumVal), 10);
    } else {
      const body = await req.json().catch(() => ({}));
      question = body.question ?? body.query ?? null;
      model = body.model;
      k = body.k;
      summarizeThreshold = body.summarizeThreshold;
    }

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Missing "question" or "query" in body.' },
        { status: 400 }
      );
    }

    const result = await runRAGAgentPipeline(question.trim(), {
      model,
      k,
      summarizeThreshold,
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      steps: result.steps,
      model: result.model,
      contextChunks: result.contextChunks,
      indexResult: indexResult || undefined,
    });
  } catch (e) {
    console.error('[RAG Agent]', e);
    return NextResponse.json(
      { error: (e as Error).message || 'RAG Agent failed' },
      { status: 500 }
    );
  }
}
