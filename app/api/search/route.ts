import { NextRequest, NextResponse } from 'next/server';
import { getMeilisearchClient } from '@/lib/search/meilisearch';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');
    const index = searchParams.get('index') || 'courses';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filter = searchParams.get('filter') || undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const meilisearch = getMeilisearchClient();
    if (!meilisearch.isAvailable()) {
      return NextResponse.json(
        { error: 'Search service not available' },
        { status: 503 }
      );
    }

    const results = await meilisearch.search(index, query, {
      limit,
      offset,
      filter,
    });

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

