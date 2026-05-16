/**
 * Redis cache wrapper — graceful fallback nếu Redis unavailable.
 *
 * Mục tiêu: giảm 70-80% query lên Neon Postgres cho hot endpoints.
 *
 * Pattern chính: get-or-fetch
 *   const data = await cache.getOrFetch('key', 300, async () => {
 *     return await pool.query(...)
 *   })
 *   → Nếu key hit: trả từ Redis (~1ms).
 *   → Nếu miss: chạy callback, set cache, trả result.
 *   → Nếu Redis unavailable: chạy callback luôn (degrade gracefully).
 *
 * Config env vars (set trên Cloud Run hoặc .env):
 *   REDIS_URL       — full URI redis://[:pass@]host:port[/db]  (ưu tiên)
 *   REDIS_HOST      — fallback nếu không có URL
 *   REDIS_PORT      — default 6379
 *   REDIS_PASSWORD  — optional
 *   REDIS_DB        — default 0
 *   REDIS_PREFIX    — default "aero:"
 *
 * Recommendation:
 *   - Memorystore for Redis (cùng VPC với Cloud Run, latency <2ms)
 *   - Upstash Redis (serverless, free 10K cmds/day, TCP + REST)
 *   - Redis Cloud (free 30MB)
 *
 * Khi REDIS_URL/HOST không set → cache trở thành no-op (callback luôn chạy).
 */

let _client = null
let _initialized = false
let _disabled = false   // set true nếu connect fail repeatedly

function getClient() {
  if (_initialized) return _client
  _initialized = true

  const url = process.env.REDIS_URL
  const host = process.env.REDIS_HOST
  if (!url && !host) {
    console.log('[cache] No REDIS_URL/REDIS_HOST set — running in no-op mode')
    _disabled = true
    return null
  }

  try {
    // Lazy require để không load ioredis khi chưa cần
    const Redis = require('ioredis')
    const opts = {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      keyPrefix: process.env.REDIS_PREFIX || 'aero:',
      retryStrategy: (times) => {
        if (times > 5) {
          console.warn('[cache] Connection retry exceeded — disabling cache')
          _disabled = true
          return null   // stop retrying
        }
        return Math.min(times * 300, 3000)
      },
      reconnectOnError: (err) => {
        const msg = (err.message || '').toLowerCase()
        // Reconnect on READONLY (Redis failover), don't on auth fail
        return msg.includes('readonly')
      },
    }

    if (url) {
      _client = new Redis(url, opts)
    } else {
      _client = new Redis({
        host,
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        ...opts,
      })
    }

    _client.on('error', (err) => {
      // Spam control: chỉ log lần đầu mỗi loại error
      if (!_client._lastErr || _client._lastErr !== err.message) {
        console.warn('[cache] Redis error:', err.message)
        _client._lastErr = err.message
      }
    })
    _client.on('ready', () => {
      console.log('[cache] ✅ Redis connected, prefix:', opts.keyPrefix)
      _disabled = false
      _client._lastErr = null
    })

    return _client
  } catch (e) {
    console.warn('[cache] ioredis init failed:', e.message)
    _disabled = true
    return null
  }
}

/** Generic GET — trả null nếu miss hoặc Redis disabled */
async function get(key) {
  if (_disabled) return null
  const c = getClient()
  if (!c) return null
  try {
    const v = await c.get(key)
    if (v === null) return null
    try { return JSON.parse(v) } catch { return v }
  } catch (e) {
    // Don't spam logs — get failures are usually transient
    return null
  }
}

/** Generic SET với TTL (seconds) */
async function set(key, value, ttlSeconds = 60) {
  if (_disabled) return false
  const c = getClient()
  if (!c) return false
  try {
    const payload = typeof value === 'string' ? value : JSON.stringify(value)
    await c.set(key, payload, 'EX', Math.max(1, ttlSeconds))
    return true
  } catch {
    return false
  }
}

/** Delete 1 key */
async function del(key) {
  if (_disabled) return 0
  const c = getClient()
  if (!c) return 0
  try { return await c.del(key) } catch { return 0 }
}

/** Delete tất cả keys match pattern (SCAN-based, không block).
 *  WARNING: dùng pattern selective (vd "user:123:*"), tránh quét full DB.
 */
async function delPattern(pattern) {
  if (_disabled) return 0
  const c = getClient()
  if (!c) return 0
  try {
    const prefix = c.options.keyPrefix || ''
    const fullPattern = `${prefix}${pattern}`
    let cursor = '0'
    let deleted = 0
    do {
      const [next, keys] = await c.scan(cursor, 'MATCH', fullPattern, 'COUNT', 200)
      cursor = next
      if (keys.length > 0) {
        // ioredis del nhận array; strip prefix vì SCAN trả full key NHƯNG
        // del cần unprefixed key (ioredis tự thêm prefix lại)
        const unprefixed = prefix
          ? keys.map(k => k.startsWith(prefix) ? k.slice(prefix.length) : k)
          : keys
        deleted += await c.del(...unprefixed)
      }
    } while (cursor !== '0')
    return deleted
  } catch (e) {
    console.warn('[cache] delPattern failed:', e.message)
    return 0
  }
}

/**
 * Get-or-fetch pattern: hit cache, miss thì chạy callback rồi set.
 * Callback nên throw nếu fail — KHÔNG cache exception.
 *
 * Trả về data hoặc throw error từ callback nếu cache miss + callback fail.
 */
async function getOrFetch(key, ttlSeconds, fetcher) {
  const cached = await get(key)
  if (cached !== null) return cached
  const fresh = await fetcher()
  // Set fire-and-forget — không await để không chậm response
  set(key, fresh, ttlSeconds).catch(() => {})
  return fresh
}

/** Stats nhanh cho health endpoint */
function isEnabled() {
  return !_disabled && getClient() !== null
}

module.exports = {
  get,
  set,
  del,
  delPattern,
  getOrFetch,
  isEnabled,
}
