# Redis Setup Guide

## Tổng Quan

Redis được sử dụng trong hệ thống AeroEdu để:
- **Session Storage**: Lưu trữ session NextAuth.js
- **Caching**: Cache dữ liệu để tăng tốc độ phản hồi
- **Rate Limiting**: Ngăn chặn brute force attacks
- **Background Jobs**: Xử lý công việc bất đồng bộ với BullMQ
- **Real-time Features**: WebSocket pub/sub

## Cấu Hình Cơ Bản

### 1. Environment Variables

```bash
# Redis URL cho production (Docker)
REDIS_URL="redis://:redis_password@redis:6379"

# Redis URL cho development (local)
REDIS_URL="redis://:redis_password@localhost:6379"

# Hoặc cấu hình chi tiết
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="redis_password"
```

### 2. Docker Setup

Redis đã được cấu hình trong `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  container_name: lmsmath-redis
  restart: unless-stopped
  command: redis-server --appendonly yes --requirepass redis_password
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
    interval: 10s
    timeout: 3s
    retries: 5
```

### 3. Local Development

Để chạy Redis locally:

```bash
# Sử dụng Docker
docker run --name redis -p 6379:6379 -d redis:7-alpine redis-server --requirepass redis_password

# Hoặc cài đặt Redis native
# macOS
brew install redis
redis-server --requirepass redis_password

# Ubuntu/Debian
sudo apt update && sudo apt install redis-server
sudo systemctl start redis-server
```

## Các Tính Năng Redis

### 1. Session Storage (`lib/redis.ts`)

```typescript
import { getRedisClient } from '@/lib/redis';

const redis = getRedisClient();
if (redis) {
  // Lưu session data
  await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));

  // Lấy session data
  const sessionData = await redis.get(`session:${sessionId}`);
}
```

### 2. Caching System (`lib/cache.ts`)

```typescript
import CacheManager from '@/lib/cache';

// Cache dữ liệu
await CacheManager.set('user:123', userData, 300); // 5 phút

// Lấy từ cache
const cachedData = await CacheManager.get('user:123');

// Cache theo pattern
await CacheManager.invalidatePattern('user:123:*');
```

### 3. Rate Limiting (`lib/rate-limit.ts`)

```typescript
import { checkRateLimit } from '@/lib/rate-limit';

const result = await checkRateLimit(`login:${userId}`, RATE_LIMIT_CONFIG.login);
if (!result.allowed) {
  // Rate limited
  return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
}
```

### 4. Background Jobs (`lib/queue/bullmq.ts`)

```typescript
import { getBullMQManager } from '@/lib/queue/bullmq';

const bullMQ = getBullMQManager();

// Thêm job vào queue
const jobId = await bullMQ.addJob('email-queue', 'send-welcome-email', {
  userId: '123',
  email: 'user@example.com'
});

// Theo dõi job status
const status = await bullMQ.getJobStatus('email-queue', jobId);
```

## Monitoring và Debugging

### 1. Health Check

```typescript
import { checkRedisHealth } from '@/lib/redis';

const health = await checkRedisHealth();
console.log('Redis Health:', health);
// { connected: true, latency: 2 }
```

### 2. Cache Statistics

```typescript
import CacheManager from '@/lib/cache';

const stats = CacheManager.getStats();
console.log('Cache Stats:', stats);
// { redis: true, memorySize: 150, memoryTtl: 60000 }
```

### 3. Queue Statistics

```typescript
const stats = await bullMQ.getQueueStats('email-queue');
console.log('Queue Stats:', stats);
// { waiting: 5, active: 2, completed: 100, failed: 1, delayed: 0 }
```

## Best Practices

### 1. Key Naming Convention

```typescript
// Sử dụng prefix để tránh conflict
const keys = {
  session: 'session:{sessionId}',
  user: 'user:{userId}',
  cache: 'cache:{resource}:{id}',
  rateLimit: 'ratelimit:{type}:{identifier}',
  job: 'job:{queue}:{jobId}'
};
```

### 2. TTL Strategy

```typescript
// TTL theo loại dữ liệu
const ttls = {
  session: 7 * 24 * 60 * 60,     // 7 ngày
  userCache: 60 * 60,            // 1 giờ
  apiCache: 5 * 60,              // 5 phút
  rateLimit: 15 * 60,            // 15 phút
  jobResult: 24 * 60 * 60        // 1 ngày
};
```

### 3. Error Handling

```typescript
try {
  const result = await redis.get(key);
  if (!result) {
    // Cache miss - fetch from DB
    const data = await fetchFromDatabase();
    await redis.setex(key, ttl, JSON.stringify(data));
    return data;
  }
  return JSON.parse(result);
} catch (error) {
  // Fallback to database
  console.error('Redis error:', error);
  return await fetchFromDatabase();
}
```

## Troubleshooting

### 1. Connection Issues

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 -a redis_password ping

# Check Redis logs
docker logs lmsmath-redis

# Restart Redis container
docker restart lmsmath-redis
```

### 2. Memory Issues

```bash
# Check Redis memory usage
redis-cli -h localhost -p 6379 -a redis_password info memory

# Clear all keys (development only)
redis-cli -h localhost -p 6379 -a redis_password FLUSHALL
```

### 3. Performance Monitoring

```typescript
// Monitor Redis performance
const monitorRedis = async () => {
  const info = await redis.info();
  const stats = {
    connected_clients: info.connected_clients,
    used_memory: info.used_memory_human,
    total_commands_processed: info.total_commands_processed,
    keyspace_hits: info.keyspace_hits,
    keyspace_misses: info.keyspace_misses
  };
  console.log('Redis Stats:', stats);
};
```

## Production Deployment

### 1. Redis Cluster (Recommended)

```yaml
# docker-compose.prod.yml
redis:
  image: redis:7-alpine
  deploy:
    replicas: 3
    restart_policy:
      condition: on-failure
  command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
  volumes:
    - redis_data:/data
```

### 2. Redis Sentinel (High Availability)

```yaml
# Redis Sentinel for HA
redis-sentinel:
  image: redis:7-alpine
  command: redis-sentinel /etc/redis/sentinel.conf
  depends_on:
    - redis-master
    - redis-slave-1
    - redis-slave-2
```

### 3. Cloud Redis (AWS ElastiCache, GCP Memorystore)

```bash
# AWS ElastiCache
REDIS_URL="redis://your-cluster-url:6379"

# GCP Memorystore
REDIS_URL="redis://your-instance-ip:6379"
```

## Security Best Practices

1. **Password Protection**: Luôn sử dụng password mạnh
2. **Network Security**: Chỉ cho phép kết nối từ app servers
3. **Data Encryption**: Mã hóa dữ liệu nhạy cảm trước khi lưu
4. **Access Control**: Sử dụng Redis ACLs nếu có
5. **Monitoring**: Giám sát các truy cập bất thường
6. **Backup**: Sao lưu dữ liệu Redis định kỳ

## Migration Guide

### Từ In-Memory Cache sang Redis

```typescript
// Before (In-memory)
const cache = new Map();

// After (Redis)
import CacheManager from '@/lib/cache';

// Replace all Map operations with CacheManager
await CacheManager.set(key, data, ttl);
const data = await CacheManager.get(key);
```

### Từ Local Queues sang BullMQ

```typescript
// Before (Local processing)
processEmailQueue();

// After (BullMQ)
const jobId = await bullMQ.addJob('email-queue', 'send-email', data);
const status = await bullMQ.getJobStatus('email-queue', jobId);
```

## Performance Benchmarks

### Cache Performance
- **In-memory**: ~1-2ms
- **Redis local**: ~5-10ms
- **Redis remote**: ~20-50ms

### Queue Throughput
- **Local processing**: ~100 jobs/second
- **BullMQ**: ~500-1000 jobs/second (tùy cấu hình)

### Memory Usage
- **Session storage**: ~1KB per session
- **Cache entries**: Variable (JSON size)
- **Rate limiting**: ~100 bytes per record
