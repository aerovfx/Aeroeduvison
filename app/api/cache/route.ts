/**
 * API Route for Cache Management
 * 
 * Invalidate and manage Redis cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clearCache, getCacheStats, invalidateExam, invalidatePDF } from '@/lib/cache/redis-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getCacheStats();
      return NextResponse.json(stats);
    }

    return NextResponse.json({
      message: 'Cache management API',
      endpoints: {
        'GET /api/cache?action=stats': 'Get cache statistics',
        'DELETE /api/cache/invalidate?key=exam:123': 'Invalidate specific cache',
        'DELETE /api/cache/clear?pattern=exam:*': 'Clear cache by pattern',
      },
    });
  } catch (error) {
    console.error('Cache API error:', error);
    return NextResponse.json(
      { error: 'Failed to access cache' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !['ADMIN', 'TEACHER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const pattern = searchParams.get('pattern');

    if (key) {
      // Invalidate specific key
      if (key.startsWith('exam:')) {
        await invalidateExam(key.replace('exam:', ''));
      } else if (key.startsWith('pdf:')) {
        await invalidatePDF(key.replace('pdf:', ''));
      } else {
        const { clearCache } = await import('@/lib/cache/redis-cache');
        await clearCache(key);
      }

      return NextResponse.json({ success: true, message: `Invalidated cache: ${key}` });
    }

    if (pattern) {
      const { clearCache } = await import('@/lib/cache/redis-cache');
      const count = await clearCache(pattern);
      return NextResponse.json({ success: true, message: `Cleared ${count} cache entries` });
    }

    return NextResponse.json(
      { error: 'Missing key or pattern parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
