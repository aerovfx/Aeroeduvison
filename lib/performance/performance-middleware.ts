/**
 * performance-middleware.ts - API performance monitoring and optimization
 * 
 * Features:
 * - Request timing and latency tracking
 * - Slow request detection
 * - Performance metrics collection
 * - Automatic caching headers
 * - Request compression
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '../logging-simple';

// Performance thresholds
const THRESHOLDS = {
  FAST: 100, // ms
  NORMAL: 500, // ms
  SLOW: 1000, // ms
  VERY_SLOW: 3000, // ms
};

// Metrics storage (in production, use Redis or external service)
const metrics = {
  requests: new Map<string, { count: number; totalLatency: number; errors: number }>(),
  slowRequests: Array<{
    path: string;
    latency: number;
    timestamp: number;
    method: string;
  }>().slice(-100), // Keep last 100
  startTime: Date.now(),
};

/**
 * Performance middleware wrapper for API routes
 */
export function withPerformance(handler: Function) {
  return async function (req: NextRequest, ...args: any[]) {
    const startTime = Date.now();
    const path = req.nextUrl.pathname;
    const method = req.method;
    const requestId = generateRequestId();

    // Add request ID to headers
    const headers = new Headers(req.headers);
    headers.set('x-request-id', requestId);
    headers.set('x-start-time', startTime.toString());

    try {
      // Execute handler
      const response = await handler(req, ...args);
      
      // Calculate latency
      const latency = Date.now() - startTime;

      // Track metrics
      trackMetrics(path, latency, false);

      // Add performance headers
      if (response instanceof NextResponse) {
        response.headers.set('x-request-id', requestId);
        response.headers.set('x-latency', latency.toString());
        response.headers.set('x-cache-status', response.headers.get('x-cache-status') || 'MISS');

        // Add cache control headers based on method
        if (method === 'GET') {
          if (latency < THRESHOLDS.FAST) {
            response.headers.set('Cache-Control', 'public, max-age=60');
          } else {
            response.headers.set('Cache-Control', 'no-cache');
          }
        }
      }

      // Log slow requests
      if (latency > THRESHOLDS.SLOW) {
        logSlowRequest(path, latency, method, requestId);
      }

      return response;
    } catch (error) {
      // Track error
      trackMetrics(path, Date.now() - startTime, true);
      
      apiLogger.error('Request failed', {
        metadata: {
          path,
          method,
          requestId,
          latency: Date.now() - startTime,
          error: (error as Error).message,
        },
      });

      throw error;
    }
  };
}

/**
 * Add caching headers to response
 */
export function withCacheHeaders(handler: Function, options?: {
  maxAge?: number;
  staleWhileRevalidate?: number;
  private?: boolean;
}) {
  const {
    maxAge = 300,
    staleWhileRevalidate = 60,
    private: isPrivate = false,
  } = options || {};

  return async function (req: NextRequest, ...args: any[]) {
    const response = await handler(req, ...args);

    if (response instanceof NextResponse) {
      const cacheControl = isPrivate
        ? `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
        : `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

      response.headers.set('Cache-Control', cacheControl);
      response.headers.set('Vary', 'Accept-Encoding');
    }

    return response;
  };
}

/**
 * Rate limiting helper
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options?: {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: NextRequest) => string;
}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 100,
    keyGenerator = (req) => req.ip || req.headers.get('x-forwarded-for') || 'unknown',
  } = options || {};

  return async function (req: NextRequest, handler: Function) {
    const key = keyGenerator(req);
    const now = Date.now();

    let rateLimitData = rateLimitStore.get(key);

    // Initialize or reset window
    if (!rateLimitData || now > rateLimitData.resetTime) {
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, rateLimitData);
    }

    // Increment count
    rateLimitData.count++;

    // Check if limit exceeded
    if (rateLimitData.count > maxRequests) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
      
      return NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitData.resetTime.toString(),
          },
        }
      );
    }

    const response = await handler(req);

    // Add rate limit headers
    if (response instanceof NextResponse) {
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitData.count).toString());
      response.headers.set('X-RateLimit-Reset', rateLimitData.resetTime.toString());
    }

    return response;
  };
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): {
  totalRequests: number;
  avgLatency: number;
  slowRequests: typeof metrics.slowRequests;
  uptime: number;
  paths: Array<{ path: string; avgLatency: number; requests: number; errors: number }>;
} {
  const totalRequests = Array.from(metrics.requests.values()).reduce(
    (sum, m) => sum + m.count,
    0
  );

  const totalLatency = Array.from(metrics.requests.values()).reduce(
    (sum, m) => sum + m.totalLatency,
    0
  );

  const paths = Array.from(metrics.requests.entries()).map(([path, data]) => ({
    path,
    avgLatency: Math.round(data.totalLatency / data.count),
    requests: data.count,
    errors: data.errors,
  }));

  return {
    totalRequests,
    avgLatency: totalRequests > 0 ? Math.round(totalLatency / totalRequests) : 0,
    slowRequests: metrics.slowRequests,
    uptime: Date.now() - metrics.startTime,
    paths,
  };
}

/**
 * Clear metrics
 */
export function clearMetrics(): void {
  metrics.requests.clear();
  metrics.slowRequests = [];
  metrics.startTime = Date.now();
}

// Helper functions

function trackMetrics(path: string, latency: number, isError: boolean): void {
  const existing = metrics.requests.get(path);

  if (existing) {
    existing.count++;
    existing.totalLatency += latency;
    if (isError) {
      existing.errors++;
    }
  } else {
    metrics.requests.set(path, {
      count: 1,
      totalLatency: latency,
      errors: isError ? 1 : 0,
    });
  }

  // Track slow requests
  if (latency > THRESHOLDS.SLOW) {
    metrics.slowRequests.push({
      path,
      latency,
      timestamp: Date.now(),
      method: 'GET', // Simplified
    });

    // Keep only last 100
    if (metrics.slowRequests.length > 100) {
      metrics.slowRequests.shift();
    }
  }
}

function logSlowRequest(path: string, latency: number, method: string, requestId: string): void {
  let level = 'warn';
  if (latency > THRESHOLDS.VERY_SLOW) {
    level = 'error';
  }

  apiLogger[level]('Slow request detected', {
    metadata: {
      path,
      method,
      latency,
      requestId,
      threshold: THRESHOLDS.SLOW,
    },
  });
}

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compression middleware (gzip/deflate)
 */
export function withCompression(handler: Function) {
  return async function (req: NextRequest, ...args: any[]) {
    const response = await handler(req, ...args);

    if (response instanceof NextResponse) {
      const acceptEncoding = req.headers.get('accept-encoding') || '';
      
      // Check if client supports compression
      if (acceptEncoding.includes('gzip')) {
        response.headers.set('Vary', 'Accept-Encoding');
        // Note: Actual compression is handled by Next.js compress: true config
      }
    }

    return response;
  };
}

/**
 * Prefetch hints for faster navigation
 */
export function addPrefetchHints(response: NextResponse, urls: string[]): void {
  urls.forEach((url) => {
    response.headers.append('Link', `<${url}>; rel=prefetch; as=fetch`);
  });
}

export default withPerformance;
