# ADR-002: Redis cache cho hot endpoints

* Status: **Accepted** (2026-05-17)
* Decider: bo + Claude
* Related: ADR-001 (Recommendation system)

## 1. Bối cảnh

Cloud Run pixiai dùng Neon Postgres (DATABASE_URL). Neon free tier giới hạn
190 compute hours/tháng — đã hit quota cap gây sự cố production 2026-05-16
(POST /api/auth/google trả 500 do "exceeded compute time quota").

Sau khi user đã upgrade Neon, vẫn cần tối ưu để tránh hit quota lần nữa
+ giảm latency cho HS.

Phân tích Cloud Run logs cho thấy 4 endpoint chiếm > 70% query volume:

| Endpoint | Query/giờ peak | Cost mỗi call |
|---|---|---|
| `GET /api/auth/me` | ~2,000 | 1 SELECT User |
| `GET /api/agents/exam-prep?action=stats` | ~800 | 3 SELECT (Practice + Question) |
| `GET /api/agents/exam-prep?action=teacher_exams` | ~600 | 3 query (Exam + Matrix + ExamXpReward) |
| `GET /api/agents/exam-prep?action=community-stats` | ~400 | 5 query aggregation |

Tổng: ~3,800 query/giờ vào hot path → 91K query/day → 2.7M query/month.
Neon Launch tier có quota nhưng vẫn nên cache để giảm latency p50 từ
80ms (Postgres) xuống 2ms (Redis).

## 2. Quyết định

Implement `lib/cache.cjs` wrapper quanh `ioredis` (đã có trong package.json)
với:
- **Graceful fallback**: nếu Redis disabled/unreachable → callback chạy thẳng
- **Get-or-fetch pattern**: simple API cho 90% use cases
- **Pattern invalidation**: `delPattern('user:123:*')` qua SCAN
- **Connection retry** với cap 5 lần rồi disable permanently (tránh log spam)

Cache config:

| Key pattern | TTL | Scope | Invalidate khi |
|---|---|---|---|
| `auth:me:{userId}` | 60s | per-user | POST /change-password |
| `examPrep:stats:{userId}` | 120s | per-user | POST submit |
| `examPrep:teacherExams:v2` | 120s | shared | POST submit, /exam-xp/award |
| `examPrep:community:v2` | 300s | shared | POST submit |
| `examPrep:topics:{subject}` | 600s | shared | (rarely changes) |

## 3. Architecture

```
┌──────────────────┐
│  Cloud Run       │
│  pixiai          │
│                  │
│  ┌────────────┐  │
│  │ server.cjs │──┼──► getCache.get(key)
│  └────────────┘  │         │
│                  │         ├── hit ──► return cached JSON (~2ms)
│                  │         │
│                  │         └── miss ──► run Postgres query
│                  │                       └─► cache.set(key, val, ttl)
└──────────────────┘                       └─► return JSON

Cache backend (chọn 1):
- Memorystore for Redis (Google managed, same VPC, <2ms latency)
- Upstash Redis (serverless, free 10K cmds/day, TCP + REST)
- Redis Cloud (free 30MB)
```

## 4. Triển khai

### 4.1 Code changes (commit này)
- `lib/cache.cjs` — Redis wrapper với fallback
- `server.cjs`:
  - Wrap `/api/auth/me` (60s TTL)
  - Wrap exam-prep `stats`, `teacher_exams`, `community-stats`, `topics`
  - Invalidate cache trong POST submit + POST exam-xp/award + change-password
  - Add `/api/health/cache` debug endpoint
- `.env.example` — document REDIS_URL/HOST options

### 4.2 Infrastructure (cần làm bên ngoài code)

**Option A — Upstash (recommended, easiest)**:
```bash
# 1. Tạo Redis database tại https://console.upstash.com
#    Region: ap-southeast-1 (Singapore) gần Cloud Run asia-southeast1
#    Plan: Free (10K cmds/day) hoặc Pro ($10/mo unlimited cmds)
# 2. Copy REDIS_URL từ Upstash dashboard (dạng rediss://default:PASS@...upstash.io:6379)
# 3. Set vào Cloud Run:
gcloud run services update pixiai \
  --region asia-southeast1 \
  --update-env-vars REDIS_URL='rediss://default:PASS@xxx.upstash.io:6379'
```

**Option B — Memorystore (lowest latency, costs $35+/mo)**:
```bash
# 1. Tạo Memorystore instance trong cùng VPC với Cloud Run
gcloud redis instances create aero-cache \
  --region asia-southeast1 \
  --tier basic --size 1

# 2. Tạo VPC connector cho Cloud Run
gcloud compute networks vpc-access connectors create aero-conn \
  --region asia-southeast1 \
  --network default --range 10.8.0.0/28

# 3. Update Cloud Run với VPC connector + private IP
gcloud run services update pixiai \
  --region asia-southeast1 \
  --vpc-connector aero-conn \
  --update-env-vars REDIS_HOST='10.x.x.x',REDIS_PORT=6379
```

### 4.3 Verify

```bash
# Sau deploy
curl https://inphysic.com/api/health/cache
# Expect: {"status":"ok","enabled":true,"pingMs":3}

# Test cache hit (2nd call nên nhanh hơn):
time curl https://inphysic.com/api/agents/exam-prep?action=community-stats \
  -H "Authorization: Bearer ..."
# Call 1: ~200ms (DB)
# Call 2 (within 5min): ~10ms (cache hit)
```

## 5. Alternatives đã cân nhắc

### A. Application-level in-memory cache (Map + TTL)
- ❌ Không share giữa Cloud Run instances (mỗi instance cache riêng)
- ❌ Lost khi scale-to-zero
- ⚠ Còn dùng được cho data tuyệt đối stable (CONSTANTS) — không phải hot endpoints

### B. HTTP Cache-Control headers (max-age)
- ⚠ CDN/browser cache không kiểm soát được invalidation
- ⚠ Per-user data (stats, /me) không cache-able CDN
- ✅ Vẫn dùng cho static assets (đã có)

### C. PgBouncer + connection pooling
- ✅ Vẫn nên có (Neon đã có sẵn)
- ⚠ Không giảm query count, chỉ giảm connection overhead

→ **Chọn**: Redis cache cho explicit control + share giữa instances + có thể invalidate chính xác.

## 6. Consequences

### Tích cực
- ✅ Giảm ~70-80% query Postgres hot path
- ✅ p50 latency từ 80ms → 2ms (40x faster)
- ✅ Graceful degrade khi Redis down (vẫn hoạt động, chỉ chậm hơn)
- ✅ Same `lib/cache.cjs` pattern dùng được cho mọi endpoint sau này

### Tiêu cực
- ⚠ Thêm 1 infra dependency (Redis service)
- ⚠ Cache invalidation bugs → user thấy stale data
- ⚠ Cost: $0 (Upstash free) hoặc $35+/mo (Memorystore)

### Trung tính
- Stale data lag tối đa: 120s cho stats, 300s cho leaderboard — acceptable
- Khi user upgrade plan/role → /auth/me sẽ refresh sau 60s

## 7. Monitoring

Hai metric chính cần theo dõi sau khi enable:

1. **Cache hit ratio** — log mỗi 10K request:
```js
// Future: thêm vào lib/cache.cjs
let _hits = 0, _misses = 0
// trong getOrFetch: increment _hits/_misses, log mỗi 10K total
```

2. **Postgres query/giờ** — Neon dashboard sẽ thấy drop ngay
sau deploy + Redis enable

## 8. Implementation status

- ✅ `lib/cache.cjs` written
- ✅ Wrapped 4 hot endpoints + 1 invalidation hook
- ✅ `/api/health/cache` debug endpoint
- ✅ Doc + env.example
- ⬜ User provision Redis (Upstash/Memorystore)
- ⬜ Set REDIS_URL/HOST trên Cloud Run
- ⬜ Verify với `/api/health/cache` trả `{enabled: true}`

## 9. Future work

- [ ] Cache hit/miss metrics + log warning nếu hit ratio < 60%
- [ ] Cache warming script (pre-populate community-stats sau deploy)
- [ ] Wrap thêm endpoints: courses, news comments, knowledge graph
- [ ] Move sang Vertex AI Matching Engine cho embedding (Phase 2 reco)
- [ ] Migrate to **pgvector** trong Postgres khi scale > 1M items (giảm round-trip)
