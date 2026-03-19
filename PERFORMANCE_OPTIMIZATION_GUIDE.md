# Performance Optimization Guide - Aeroeduvison

## 📋 Overview

This guide documents all performance optimizations implemented in the Aeroeduvison application to reduce latency and improve speed.

## ✅ Implemented Optimizations

### 1. **Next.js Configuration** (`next.config.js`)

#### Image Optimization
- Increased cache TTL from 60s to 300s
- Added WebP and AVIF format support
- Optimized device sizes and image sizes
- Enabled `loadImgWidth` for better layout stability

#### HTTP Caching Headers
```javascript
// Static assets: 1 year immutable
Cache-Control: public, max-age=31536000, immutable

// API routes: No cache
Cache-Control: no-cache, no-store, must-revalidate
```

#### Bundle Optimization
- Split large vendor bundles (three.js, MUI, deck.gl)
- Enabled tree shaking
- Deterministic module/chunk IDs
- SWC minification
- CSS optimization

#### Package Import Optimization
```javascript
experimental: {
  optimizePackageImports: [
    'lucide-react', 
    '@mui/material', 
    '@radix-ui/react-dialog',
    'recharts',
    'three',
    'deck.gl',
    'maplibre-gl',
  ]
}
```

### 2. **Multi-Tier Caching System** (`lib/performance/cache-enhanced.ts`)

#### L1 Cache: In-Memory LRU
- Max size: 5000 entries
- TTL: 1 minute
- Fastest access (< 1ms)

#### L2 Cache: Redis
- Default TTL: 5 minutes
- Long TTL: 1 hour
- Distributed across instances

#### Features
- Tag-based invalidation
- Cache warming
- Performance metrics
- Automatic fallback

#### Usage Example
```typescript
import { enhancedCache } from '@/lib/performance/cache-enhanced';

// Get with fallback
const data = await enhancedCache.getOrSet(
  'user:123:profile',
  async () => fetchUser(123),
  { ttl: 300, tags: ['user:123'] }
);

// Manual set/get
await enhancedCache.set('key', data, { ttl: 600, tags: ['resource'] });
const cached = await enhancedCache.get('key');

// Invalidate by tag
await enhancedCache.invalidateByTag('user:123');
```

### 3. **Request Deduplication** (`lib/performance/request-dedup.ts`)

#### Prevents duplicate concurrent requests
```typescript
import { deduplicateRequest } from '@/lib/performance/request-dedup';

// Multiple calls with same key return same promise
const result = await deduplicateRequest('user:123', () => fetchUser(123));
```

#### Debouncing
```typescript
import { debounce, useDebouncedCallback } from '@/lib/performance/request-dedup';
import { useDebouncedCallback } from '@/hooks/usePerformance';

// Function debouncing
const debouncedSearch = debounce(searchFn, 500);

// React hook
const handleSearch = useDebouncedCallback((query) => {
  searchApi(query);
}, 500);
```

#### Throttling
```typescript
import { throttle, useThrottledCallback } from '@/lib/performance/request-dedup';
import { useThrottledCallback } from '@/hooks/usePerformance';

// Limit to once per second
const throttledScroll = throttle(handleScroll, 1000);

// React hook
const handleScroll = useThrottledCallback((e) => {
  updateScroll(e);
}, 100);
```

### 4. **Database Optimization** (`lib/performance/db-optimized.ts`)

#### Query Timeout
```typescript
const result = await db.withTimeout(
  () => db.$queryRaw`SELECT * FROM large_table`,
  10000 // 10 seconds
);
```

#### Query with Caching
```typescript
const users = await db.queryWithCache({
  query: () => db.user.findMany({ where: { active: true } }),
  cacheKey: 'users:active',
  ttl: 300,
  tags: ['users'],
});
```

#### Batch Operations
```typescript
const results = await db.batch(
  [
    () => db.user.findMany(),
    () => db.course.findMany(),
    () => db.assignment.findMany(),
  ],
  { concurrency: 10 }
);
```

#### Transaction with Retry
```typescript
const result = await db.transactionWithRetry(
  async (tx) => {
    await tx.user.update({ ... });
    await tx.course.create({ ... });
  },
  { maxRetries: 3, timeout: 30000 }
);
```

#### Pagination with Cursor
```typescript
import { QueryOptimizer } from '@/lib/performance/db-optimized';

const { data, hasMore, nextCursor } = await QueryOptimizer.paginate(
  (opts) => db.user.findMany(opts),
  { page: 1, pageSize: 20 }
);
```

### 5. **Performance Monitoring** (`lib/performance/performance-middleware.ts`)

#### Middleware Wrapper
```typescript
import { withPerformance } from '@/lib/performance/performance-middleware';

export const GET = withPerformance(async (request: NextRequest) => {
  // Your handler
});
```

#### Features
- Request timing
- Slow request detection (> 1s warning, > 3s error)
- Performance metrics
- Automatic cache headers
- Request ID tracking

#### Get Metrics
```typescript
import { getPerformanceMetrics } from '@/lib/performance/performance-middleware';

const metrics = getPerformanceMetrics();
// { totalRequests, avgLatency, slowRequests, uptime, paths }
```

### 6. **React Performance Hooks** (`hooks/usePerformance.ts`)

#### Lazy Loading
```typescript
import { useLazyLoad } from '@/hooks/usePerformance';

function LazyComponent() {
  const { ref, isVisible, hasBeenVisible } = useLazyLoad({
    rootMargin: '50px',
    threshold: 0.1,
  });

  return (
    <div ref={ref}>
      {isVisible && <ExpensiveContent />}
    </div>
  );
}
```

#### Debounce/Throttle
```typescript
import { useDebounce, useThrottle, useDebouncedCallback } from '@/hooks/usePerformance';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  const handleScroll = useThrottledCallback((e) => {
    // Handle scroll
  }, 100);

  return <input onChange={(e) => setQuery(e.target.value)} />;
}
```

#### Virtual Scroll
```typescript
import { useVirtualScroll } from '@/hooks/usePerformance';

function VirtualList({ items }) {
  const { visibleItems, totalHeight } = useVirtualScroll({
    itemCount: items.length,
    itemHeight: 50,
    containerHeight: 600,
  });

  return (
    <div style={{ height: totalHeight }}>
      {visibleItems.map(({ index, top }) => (
        <div key={index} style={{ position: 'absolute', top }}>
          {items[index]}
        </div>
      ))}
    </div>
  );
}
```

#### Network Status
```typescript
import { useNetworkStatus } from '@/hooks/usePerformance';

function NetworkAwareComponent() {
  const { online, downlink, effectiveType } = useNetworkStatus();
  
  // Adapt quality based on network
  const imageQuality = downlink > 10 ? 'high' : downlink > 5 ? 'medium' : 'low';
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Cache Configuration
CACHE_L1_MAX_SIZE=5000
CACHE_L1_TTL=60000
CACHE_L2_DEFAULT_TTL=300
CACHE_L2_LONG_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Query Configuration
QUERY_TIMEOUT=10000
SLOW_QUERY_THRESHOLD=1000

# Rust Services (for canary proxy)
RUST_VECTOR_SERVICE_URL=http://127.0.0.1:8091
RUST_BACKEND_URL=http://127.0.0.1:8090
ENABLE_RUST_CANARY_PROXY=true
RUST_CANARY_PERCENT=10
```

## 📊 Performance Metrics

### Monitoring Dashboard

Access performance metrics at `/api/metrics`:

```json
{
  "totalRequests": 10000,
  "avgLatency": 150,
  "slowRequests": 25,
  "uptime": 86400000,
  "paths": [
    {
      "path": "/api/users",
      "avgLatency": 120,
      "requests": 5000,
      "errors": 5
    }
  ],
  "cache": {
    "l1Size": 2500,
    "l2Connected": true,
    "hits": 8000,
    "misses": 2000,
    "hitRate": 80.00,
    "avgLatency": 2.5
  }
}
```

## 🚀 Quick Start

### 1. Enable Redis (Recommended)
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 2. Set Environment Variables
```bash
cp .env.example .env.local
# Edit .env.local and set REDIS_URL
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Test Performance
```bash
# Run benchmarks
npm run bench:strangler:vector
npm run bench:strangler:prod

# Check metrics
curl http://localhost:3000/api/metrics
```

## 📈 Best Practices

### API Routes
1. Always use `withPerformance` wrapper
2. Add caching with `enhancedCache`
3. Deduplicate concurrent requests
4. Implement proper error handling
5. Log slow queries

### Database Queries
1. Use `queryWithCache` for read operations
2. Implement cursor-based pagination
3. Use selective field queries
4. Batch related queries
5. Set appropriate timeouts

### Frontend Components
1. Lazy load heavy components
2. Debounce user input
3. Throttle scroll/resize events
4. Use virtual scrolling for long lists
5. Prefetch likely next pages

### Images & Assets
1. Use Next.js Image component
2. Enable lazy loading
3. Serve WebP/AVIF formats
4. Set appropriate sizes
5. Use blur placeholders

## 🔍 Troubleshooting

### High Latency
1. Check Redis connection: `curl http://localhost:3000/api/health`
2. Review slow query logs
3. Check cache hit rate
4. Monitor connection pool

### Cache Issues
1. Verify Redis is running
2. Check cache key patterns
3. Review TTL settings
4. Monitor cache invalidation

### Memory Usage
1. Reduce L1 cache size if needed
2. Implement cache eviction
3. Monitor query metrics
4. Use streaming for large responses

## 📚 Additional Resources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Prisma Query Optimization](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Redis Caching Patterns](https://redis.io/docs/manual/design-patterns/)
- [Web Vitals](https://web.dev/vitals/)

## 🎯 Performance Goals

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | < 200ms | - |
| Cache Hit Rate | > 80% | - |
| Slow Requests | < 1% | - |
| LCP | < 2.5s | - |
| FID | < 100ms | - |
| CLS | < 0.1 | - |

---

Last Updated: 2026-03-16
Author: Performance Optimization Team
lsof -ti :3000 | xargs kill -9