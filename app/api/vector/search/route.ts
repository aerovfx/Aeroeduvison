import { NextRequest, NextResponse } from 'next/server';
import { getVectorService } from '@/lib/embeddings/vector-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, limit, scoreThreshold, filter, model } = await req.json();

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const vectorService = getVectorService();
    const results = await vectorService.search(query, {
      limit,
      scoreThreshold,
      filter,
      model,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Vector search API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

