/**
 * POST /api/rag/ask
 * RAG: query → semantic search (vector DB) → context + prompt → Ollama → answer.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragAsk } from '@/lib/rag/rag-service';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const query = body.query ?? body.question;
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing "query" or "question" in body.' },
        { status: 400 }
      );
    }

    const result = await ragAsk(query, {
      model: body.model,
      k: body.k ?? 3,
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      contextChunks: result.contextChunks,
      model: result.model,
    });
  } catch (e) {
    console.error('[RAG ask]', e);
    return NextResponse.json(
      { error: (e as Error).message || 'RAG ask failed' },
      { status: 500 }
    );
  }
}
