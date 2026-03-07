/**
 * Redis Cache Test API
 * GET /api/redis/cache - Test cache operations
 * POST /api/redis/cache - Set cache value
 * DELETE /api/redis/cache - Clear cache
 */

import { NextRequest, NextResponse } from 'next/server';
import CacheManager from '@/lib/cache';
import { apiLogger } from '@/lib/logging-simple';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || 'test-key';

    // Test cache get
    const cachedValue = await CacheManager.get(key);
    const stats = CacheManager.getStats();

    return NextResponse.json({
      operation: 'get',
      key,
      value: cachedValue,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    apiLogger.error('Cache GET operation failed', {
      metadata: { error: (error as Error).message }
    });

    return NextResponse.json(
      { error: 'Cache operation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, ttl = 300 } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing key or value' },
        { status: 400 }
      );
    }

    // Test cache set
    await CacheManager.set(key, value, ttl);
    const stats = CacheManager.getStats();

    return NextResponse.json({
      operation: 'set',
      key,
      value,
      ttl,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    apiLogger.error('Cache SET operation failed', {
      metadata: { error: (error as Error).message }
    });

    return NextResponse.json(
      { error: 'Cache operation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const pattern = searchParams.get('pattern');

    if (pattern) {
      // Clear by pattern
      await CacheManager.invalidatePattern(pattern);
      return NextResponse.json({
        operation: 'invalidate_pattern',
        pattern,
        timestamp: new Date().toISOString(),
      });
    } else if (key) {
      // Clear specific key
      await CacheManager.delete(key);
      return NextResponse.json({
        operation: 'delete',
        key,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Clear all cache
      await CacheManager.clear();
      return NextResponse.json({
        operation: 'clear_all',
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    apiLogger.error('Cache DELETE operation failed', {
      metadata: { error: (error as Error).message }
    });

    return NextResponse.json(
      { error: 'Cache operation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
