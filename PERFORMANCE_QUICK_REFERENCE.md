# Performance Optimization - Quick Reference Card

## 🚀 Quick Start (5 Minutes)

### 1. Enable Redis (Optional but Recommended)
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 2. Add Environment Variables
```bash
# .env.local
REDIS_URL=redis://localhost:6379
ENABLE_ADVANCED_CACHING=true
ENABLE_PERFORMANCE_MONITORING=true
```

### 3. Import Performance Utilities
```typescript
import { enhancedCache, withPerformance, db } from '@/lib/performance';
```

---

## 📦 Common Patterns

### API Route Optimization
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withPerformance } from '@/lib/performance/performance-middleware';
import { enhancedCache } from '@/lib/performance/cache-enhanced';
import { deduplicateRequest } from '@/lib/performance/request-dedup';

export const GET = withPerformance(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // Deduplicate concurrent requests
  const result = await deduplicateRequest(`resource:${id}`, async () => {
    // Try cache first
    const cached = await enhancedCache.get(`resource:${id}`);
    if (cached) return cached;
    
    // Fetch from DB
    const data = await db.resource.findUnique({ where: { id } });
    
    // Cache result
    await enhancedCache.set(`resource:${id}`, data, { ttl: 300 });
    
    return data;
  });
  
  return NextResponse.json(result);
});
```

### React Component Optimization
```typescript
'use client';

import { useDebounce, useLazyLoad, useThrottledCallback } from '@/hooks/usePerformance';

function OptimizedComponent() {
  // Lazy load content
  const { ref, isVisible } = useLazyLoad({ rootMargin: '50px' });
  
  // Debounce search input
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  // Throttle scroll handler
  const handleScroll = useThrottledCallback((e) => {
    // Handle scroll
  }, 100);
  
  return (
    <div ref={ref} onScroll={handleScroll}>
      {isVisible && <ExpensiveContent query={debouncedQuery} />}
    </div>
  );
}
```

### Database Query Optimization
```typescript
import { db, QueryOptimizer } from '@/lib/performance/db-optimized';

// Query with caching
const users = await db.queryWithCache({
  query: () => db.user.findMany({ where: { active: true } }),
  cacheKey: 'users:active',
  ttl: 300,
  tags: ['users'],
});

// Batch operations
const [users, courses, assignments] = await db.batch([
  () => db.user.findMany(),
  () => db.course.findMany(),
  () => db.assignment.findMany(),
], { concurrency: 10 });

// Pagination with cursor
const { data, hasMore, nextCursor } = await QueryOptimizer.paginate(
  (opts) => db.user.findMany(opts),
  { page: 1, pageSize: 20 }
);

// Transaction with retry
await db.transactionWithRetry(async (tx) => {
  await tx.user.update({ ... });
  await tx.course.create({ ... });
}, { maxRetries: 3 });
```

---

## 🎯 Performance Checklist

### For Every API Route
- [ ] Wrap with `withPerformance`
- [ ] Add caching with `enhancedCache`
- [ ] Deduplicate concurrent requests
- [ ] Set appropriate TTL
- [ ] Add error handling
- [ ] Log slow queries

### For Every Component
- [ ] Lazy load heavy components
- [ ] Debounce user input
- [ ] Throttle scroll/resize
- [ ] Use React.memo for pure components
- [ ] Use useMemo/useCallback for expensive calculations
- [ ] Implement virtual scrolling for long lists

### For Every Database Query
- [ ] Use `queryWithCache` for reads
- [ ] Add selective field queries
- [ ] Implement pagination
- [ ] Set query timeout
- [ ] Use indexes
- [ ] Batch related queries

---

## 🔧 Configuration Quick Reference

### Cache TTL Guidelines
| Type | TTL | Example |
|------|-----|---------|
| Short | 60s | Real-time data, user sessions |
| Medium | 300s | User profiles, course data |
| Long | 3600s | Static content, configurations |

### Rate Limiting
```typescript
// Default: 100 requests per minute
rateLimit({ windowMs: 60000, maxRequests: 100 })

// Stricter: 20 requests per minute
rateLimit({ windowMs: 60000, maxRequests: 20 })

// More lenient: 500 requests per minute
rateLimit({ windowMs: 60000, maxRequests: 500 })
```

### Debounce/Throttle Delays
| Use Case | Delay | Type |
|----------|-------|------|
| Search input | 300-500ms | Debounce |
| Scroll handler | 100-200ms | Throttle |
| Resize handler | 200-300ms | Throttle |
| Form validation | 500-1000ms | Debounce |
| API polling | 1000-5000ms | Throttle |

---

## 📊 Monitoring & Debugging

### Check Health
```bash
# Basic health
curl http://localhost:3000/api/health

# Detailed health
curl http://localhost:3000/api/health?detailed=true
```

### Get Metrics
```bash
# All metrics
curl http://localhost:3000/api/performance/metrics

# Cache metrics
curl http://localhost:3000/api/performance/metrics?type=cache

# Database metrics
curl http://localhost:3000/api/performance/metrics?type=database

# Request metrics
curl http://localhost:3000/api/performance/metrics?type=requests
```

### Clear Cache
```bash
curl -X POST http://localhost:3000/api/performance/metrics?action=clear-cache
```

### Check Logs
```bash
# Application logs
tail -f logs/app.log

# Slow queries
grep "Slow query" logs/app.log

# Performance warnings
grep "Slow request" logs/app.log
```

---

## 🐛 Troubleshooting

### High Latency
1. Check cache hit rate: `/api/performance/metrics?type=cache`
2. Review slow queries: grep logs for "Slow query"
3. Check Redis connection: `curl /api/health`
4. Monitor connection pool: check DB metrics

### Cache Not Working
1. Verify Redis is running: `docker ps | grep redis`
2. Check REDIS_URL environment variable
3. Test Redis connection: `redis-cli ping`
4. Review cache key patterns

### Memory Issues
1. Reduce L1 cache size: `CACHE_L1_MAX_SIZE=1000`
2. Clear cache: `enhancedCache.clear()`
3. Check for memory leaks: monitor `process.memoryUsage()`
4. Use streaming for large responses

---

## 📈 Performance Goals

| Metric | Target | How to Measure |
|--------|--------|----------------|
| API Response | < 200ms | `/api/performance/metrics` |
| Cache Hit Rate | > 80% | Cache metrics dashboard |
| Slow Requests | < 1% | Request metrics |
| LCP | < 2.5s | Web Vitals |
| FID | < 100ms | Web Vitals |
| CLS | < 0.1 | Web Vitals |

---

## 🔗 Useful Links

- Full Guide: `PERFORMANCE_OPTIMIZATION_GUIDE.md`
- Environment Config: `.env.performance`
- Performance Library: `lib/performance/`
- React Hooks: `hooks/usePerformance.ts`

---

**Last Updated:** 2026-03-16
**Version:** 1.0.0
