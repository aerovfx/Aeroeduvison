/**
 * API Route Template - Optimized with caching, deduplication, and performance monitoring
 * 
 * This template demonstrates best practices for high-performance API routes:
 * - Multi-tier caching (L1 memory + L2 Redis)
 * - Request deduplication
 * - Debouncing for frequent requests
 * - Performance monitoring
 * - Error handling with retry logic
 * - Efficient database queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPerformance, withCacheHeaders, rateLimit } from '@/lib/performance/performance-middleware';
import { enhancedCache } from '@/lib/performance/cache-enhanced';
import { deduplicateRequest, debounceAsync } from '@/lib/performance/request-dedup';
import { db, QueryOptimizer } from '@/lib/performance/db-optimized';
import { apiLogger } from '@/lib/logging-simple';

// ===== CONFIGURATION =====

const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
};

const RATE_LIMIT = {
  windowMs: 60000, // 1 minute
  maxRequests: 100,
};

// ===== HANDLERS =====

/**
 * GET handler with full optimization
 */
async function handleGet(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  // Extract parameters
  const id = searchParams.get('id');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (!id) {
    return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
  }

  // Generate cache key
  const cacheKey = `api:resource:${id}:page:${page}:size:${pageSize}`;

  try {
    // Use deduplication for concurrent requests
    const result = await deduplicateRequest(cacheKey, async () => {
      // Try cache first
      const cached = await enhancedCache.get(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true };
      }

      // Fetch from database with optimization
      const data = await db.$queryRaw`
        SELECT * FROM resources
        WHERE id = ${id}
        LIMIT 1
      `;

      if (!data || data.length === 0) {
        return { data: null, fromCache: false };
      }

      // Cache the result
      await enhancedCache.set(cacheKey, data[0], {
        ttl: CACHE_TTL.MEDIUM,
        tags: [`resource:${id}`],
      });

      return { data: data[0], fromCache: false };
    });

    // Log performance
    apiLogger.debug('Request completed', {
      metadata: {
        duration: Date.now() - startTime,
        fromCache: result.fromCache,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error('Error in optimized API', {
      metadata: {
        error: (error as Error).message,
        id,
        page,
      },
    });

    return NextResponse.json(
      { error: 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

/**
 * POST handler with validation and optimization
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.data) {
      return NextResponse.json(
        { error: 'Missing required field: data' },
        { status: 400 }
      );
    }

    // Process with transaction
    const result = await db.transactionWithRetry(async (tx) => {
      // Your database operations here
      const created = await tx.$executeRaw`
        INSERT INTO resources (data)
        VALUES (${JSON.stringify(body.data)})
      `;

      return { success: true, id: created };
    });

    // Invalidate related cache
    await enhancedCache.invalidateByTag('resource:*');

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    apiLogger.error('Error creating resource', {
      metadata: { error: (error as Error).message },
    });

    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}

/**
 * Main handler with middleware wrappers
 */
export const GET = withPerformance(
  withCacheHeaders(handleGet, {
    maxAge: CACHE_TTL.SHORT,
    staleWhileRevalidate: 30,
  })
);

export const POST = withPerformance(
  async (request: NextRequest) => {
    // Apply rate limiting
    return rateLimit(RATE_LIMIT)(request, handlePost);
  }
);

// Export handler for testing
export { handleGet, handlePost };
