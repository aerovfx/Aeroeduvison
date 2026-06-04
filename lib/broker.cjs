/**
 * AeroEduVision — Realtime Broker (Cấp 2: Redis Pub/Sub + WebSocket)
 *
 * Mục tiêu: cho phép server và client trao đổi event realtime qua topic.
 *
 * Kiến trúc:
 *   Browser ─(WebSocket /api/broker)─→ Server.cjs
 *                                       │
 *                                       ▼
 *                              ┌────────────────┐
 *                              │  ioredis pub   │  ← publish topic
 *                              │  ioredis sub   │  ← psubscribe broker:*
 *                              └────────────────┘
 *                                       │
 *                              Multiple Cloud Run pods chia sẻ
 *                              cùng Redis → cross-instance realtime
 *
 * Fallback khi Redis OFF:
 *   - Vẫn hoạt động ở chế độ "single-server" (chỉ in-memory)
 *   - Hữu ích cho dev local
 *
 * Protocol (JSON qua WebSocket):
 *   Client → Server:
 *     {type: "subscribe",   topics: ["user:abc", "class:xyz"]}
 *     {type: "unsubscribe", topics: ["user:abc"]}
 *     {type: "publish",     topic: "presence:lobby", payload: {...}}
 *     {type: "ping"}
 *
 *   Server → Client:
 *     {type: "welcome",      userId, role, ts}
 *     {type: "subscribed",   topics: [...], rejected: [...]}
 *     {type: "unsubscribed", topics: [...]}
 *     {type: "msg",          topic, payload, ts, from?}
 *     {type: "error",        message}
 *     {type: "pong",         ts}
 *
 * Authentication:
 *   WebSocket connect URL: /api/broker?token=<JWT>
 *   (browsers cannot set custom headers on WebSocket upgrade)
 *
 * Topic ACL (default policy):
 *   - presence:*           → public (mọi authed user)
 *   - user:<sub>           → chỉ chính user đó
 *   - role:<roleName>      → user phải có role đó
 *   - admin:*              → chỉ ADMIN
 *   - teacher:*            → ADMIN hoặc TEACHER
 *   - class:<id>           → MVP: allow authed (TODO: check membership)
 *   - exam:<id>            → MVP: allow authed (TODO: check enrollment)
 *   - iot:device:<id>      → MVP: allow authed (TODO: check ownership)
 *   - sim:<simId>          → MVP: allow authed (cộng tác lab)
 *   - kg:*                 → MVP: allow authed
 *   - drone:room|lobby:<code> → MVP: allow authed (multiplayer drone thách đấu)
 *   - * (others)           → reject
 *
 * Khi publish qua WebSocket → server cũng kiểm ACL trước khi forward.
 *
 * Server-side publish (Node.js):
 *   const broker = require('./lib/broker.cjs')
 *   broker.publish('user:abc', { kind: 'notification', text: '...' })
 *
 * Health: GET /api/broker/health
 */

'use strict';

const REDIS_CHANNEL_PREFIX = 'broker:';
const PING_INTERVAL_MS = 30_000;       // server ping mỗi 30s
const DEAD_AFTER_MS = 90_000;          // không pong sau 90s → close
const MAX_TOPICS_PER_CLIENT = 100;
const MAX_PAYLOAD_BYTES = 32 * 1024;   // 32 KB per message

// In-memory state ──────────────────────────────────────────────
const clients = new Set();                  // Set<WSClient>
const localSubs = new Map();                // topic → Set<WSClient>
let _pubClient = null;                      // ioredis publisher
let _subClient = null;                      // ioredis subscriber (psubscribe)
let _redisReady = false;
let _redisDisabled = false;
let _stats = {
  totalConnects: 0,
  totalDisconnects: 0,
  totalMessagesIn: 0,
  totalMessagesOut: 0,
  totalPublishes: 0,
  startedAt: Date.now(),
};

// ── Redis setup ────────────────────────────────────────────────
function initRedis() {
  if (_redisDisabled || _redisReady) return;

  const url = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST;
  if (!url && !host) {
    console.log('[broker] No REDIS_URL/REDIS_HOST — single-server mode (no cross-pod fan-out)');
    _redisDisabled = true;
    return;
  }

  try {
    const Redis = require('ioredis');
    const baseOpts = {
      lazyConnect: false,
      enableReadyCheck: true,
      maxRetriesPerRequest: null,        // sub clients need null
      connectTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 10) {
          console.warn('[broker] Redis retry exceeded — falling back to single-server');
          _redisDisabled = true;
          return null;
        }
        return Math.min(times * 300, 3000);
      },
    };

    if (url) {
      _pubClient = new Redis(url, baseOpts);
      _subClient = new Redis(url, baseOpts);
    } else {
      const conn = {
        host,
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        ...baseOpts,
      };
      _pubClient = new Redis(conn);
      _subClient = new Redis(conn);
    }

    _pubClient.on('error', (err) => {
      if (!_pubClient._lastErr || _pubClient._lastErr !== err.message) {
        console.warn('[broker:pub] error:', err.message);
        _pubClient._lastErr = err.message;
      }
    });
    _subClient.on('error', (err) => {
      if (!_subClient._lastErr || _subClient._lastErr !== err.message) {
        console.warn('[broker:sub] error:', err.message);
        _subClient._lastErr = err.message;
      }
    });

    _subClient.on('ready', () => {
      console.log('[broker] ✅ Redis sub ready — psubscribe', REDIS_CHANNEL_PREFIX + '*');
      _subClient.psubscribe(REDIS_CHANNEL_PREFIX + '*', (err) => {
        if (err) console.warn('[broker] psubscribe failed:', err.message);
        else _redisReady = true;
      });
    });

    // Fan-out: Redis → local subscribers
    _subClient.on('pmessage', (_pattern, channel, message) => {
      const topic = channel.slice(REDIS_CHANNEL_PREFIX.length);
      let parsed;
      try {
        parsed = JSON.parse(message);
      } catch {
        return; // ignore bad payload
      }
      deliverLocal(topic, parsed);
    });
  } catch (e) {
    console.warn('[broker] ioredis init failed:', e.message);
    _redisDisabled = true;
  }
}

// ── Topic ACL ──────────────────────────────────────────────────
/**
 * Trả về true nếu user được phép sub/pub topic này.
 * mode: 'sub' | 'pub' — một số topic chỉ cho server publish (TODO)
 */
function canAccessTopic(user, topic, mode = 'sub') {
  if (!topic || typeof topic !== 'string') return false;
  if (topic.length > 200) return false;

  // Hệ thống reserved
  if (topic.startsWith('__')) return false;

  // Public
  if (topic.startsWith('presence:')) return true;

  // Self-only
  if (topic.startsWith('user:')) {
    const uid = topic.slice(5);
    return uid && user && (uid === user.sub || uid === user.userId);
  }

  // Role-gated
  if (topic.startsWith('role:')) {
    const r = topic.slice(5).toUpperCase();
    return user && (user.role || '').toUpperCase() === r;
  }
  if (topic.startsWith('admin:')) {
    return user && (user.role || '').toUpperCase() === 'ADMIN';
  }
  if (topic.startsWith('teacher:')) {
    const ur = (user?.role || '').toUpperCase();
    return ur === 'ADMIN' || ur === 'TEACHER';
  }

  // Drone multiplayer thách đấu — CHO PHÉP ẨN DANH (quét mã/link là chơi cùng nhau,
  // không cần đăng nhập). Phòng đã được phân tách theo mã (drone:room:<code>).
  if (topic.startsWith('drone:')) return true;

  // Cộng tác: cần ĐĂNG NHẬP (không cho ẩn danh)
  if (
    topic.startsWith('class:') ||
    topic.startsWith('exam:') ||
    topic.startsWith('iot:') ||
    topic.startsWith('sim:') ||
    topic.startsWith('kg:') ||
    topic.startsWith('chat:')
  ) {
    return !!user && !user.anonymous;
  }

  // Default deny
  return false;
}

// ── Client wrapper ────────────────────────────────────────────
class WSClient {
  constructor(ws, user) {
    this.ws = ws;
    this.user = user;        // {sub, email, role}
    this.topics = new Set(); // topic strings
    this.alive = true;
    this.lastSeen = Date.now();
    this.id = (user?.sub || 'anon') + ':' + Math.random().toString(36).slice(2, 8);
  }
  send(obj) {
    try {
      if (this.ws.readyState !== 1) return false;
      this.ws.send(JSON.stringify(obj));
      _stats.totalMessagesOut++;
      return true;
    } catch {
      return false;
    }
  }
  close(code = 1000, reason = '') {
    try { this.ws.close(code, reason); } catch {}
  }
}

// ── Delivery: Redis pmessage → local sockets ───────────────────
function deliverLocal(topic, envelope) {
  const set = localSubs.get(topic);
  if (!set || set.size === 0) return;
  const out = { type: 'msg', topic, ...envelope };
  for (const client of set) {
    client.send(out);
  }
}

// ── Publish: local fan-out + Redis (nếu có) ────────────────────
function publish(topic, payload, meta = {}) {
  if (!topic) return false;
  _stats.totalPublishes++;
  const envelope = {
    payload,
    ts: Date.now(),
    from: meta.from || 'server',
  };
  // Local first (cùng pod) — Redis psubscribe sẽ KHÔNG tự echo về sub trên cùng client
  deliverLocal(topic, envelope);
  // Cross-pod via Redis (nếu enabled)
  if (_redisReady && _pubClient) {
    _pubClient
      .publish(REDIS_CHANNEL_PREFIX + topic, JSON.stringify(envelope))
      .catch((e) => console.warn('[broker] publish err:', e.message));
  }
  return true;
}

// ── Subscribe ops ──────────────────────────────────────────────
function subscribeLocal(client, topic) {
  let set = localSubs.get(topic);
  if (!set) {
    set = new Set();
    localSubs.set(topic, set);
  }
  set.add(client);
  client.topics.add(topic);
}

function unsubscribeLocal(client, topic) {
  const set = localSubs.get(topic);
  if (set) {
    set.delete(client);
    if (set.size === 0) localSubs.delete(topic);
  }
  client.topics.delete(topic);
}

function unsubscribeAll(client) {
  for (const t of client.topics) {
    const set = localSubs.get(t);
    if (set) {
      set.delete(client);
      if (set.size === 0) localSubs.delete(t);
    }
  }
  client.topics.clear();
}

// ── JWT decode ─────────────────────────────────────────────────
function authFromQuery(reqUrl, jwtSecret) {
  try {
    const jwt = require('jsonwebtoken');
    const u = new URL(reqUrl, 'http://localhost');
    const token = u.searchParams.get('token');
    if (!token) return null;
    const decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true });
    if (!decoded || typeof decoded !== 'object') return null;
    return {
      sub: decoded.sub,
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'STUDENT',
    };
  } catch {
    return null;
  }
}

// ── HTTP upgrade handler ───────────────────────────────────────
function attachToHttpServer(httpServer, opts = {}) {
  const { WebSocketServer } = require('ws');
  const path = opts.path || '/api/broker';
  const jwtSecret =
    opts.jwtSecret ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'dev-secret-fallback-change-in-production!!';

  // noServer mode → tự handle upgrade để filter theo path
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });

  initRedis();

  httpServer.on('upgrade', (req, socket, head) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }
    if (pathname !== path) return; // để các handler khác (vd socket.io proxy) xử lý

    // Ẩn danh ĐƯỢC PHÉP: chơi drone thách đấu chỉ cần quét mã/link, không cần đăng
    // nhập. user.anonymous=true → canAccessTopic chỉ cho vào drone:/presence:.
    const user = authFromQuery(req.url, jwtSecret) || {
      sub: 'anon-' + Math.random().toString(36).slice(2, 10),
      userId: null, email: null, role: 'ANON', anonymous: true,
    };

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, user);
    });
  });

  wss.on('connection', (ws, _req, user) => {
    const client = new WSClient(ws, user);
    clients.add(client);
    _stats.totalConnects++;

    client.send({
      type: 'welcome',
      userId: user.sub,
      role: user.role,
      ts: Date.now(),
    });

    ws.on('pong', () => {
      client.alive = true;
      client.lastSeen = Date.now();
    });

    ws.on('message', (raw) => {
      _stats.totalMessagesIn++;
      if (raw.length > MAX_PAYLOAD_BYTES) {
        client.send({ type: 'error', message: 'Payload too large' });
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        client.send({ type: 'error', message: 'Invalid JSON' });
        return;
      }
      handleMessage(client, msg);
    });

    ws.on('close', () => {
      unsubscribeAll(client);
      clients.delete(client);
      _stats.totalDisconnects++;
    });

    ws.on('error', () => {
      // close handler will clean up
    });
  });

  // Heartbeat
  const pingTimer = setInterval(() => {
    const now = Date.now();
    for (const client of clients) {
      if (!client.alive || now - client.lastSeen > DEAD_AFTER_MS) {
        client.close(1001, 'idle timeout');
        continue;
      }
      client.alive = false;
      try { client.ws.ping(); } catch {}
    }
  }, PING_INTERVAL_MS);

  // Cleanup khi process exit
  httpServer.on('close', () => clearInterval(pingTimer));

  return { wss, publish };
}

// ── Message handler ────────────────────────────────────────────
function handleMessage(client, msg) {
  if (!msg || typeof msg.type !== 'string') {
    client.send({ type: 'error', message: 'Missing type' });
    return;
  }

  switch (msg.type) {
    case 'ping':
      client.alive = true;
      client.lastSeen = Date.now();
      client.send({ type: 'pong', ts: Date.now() });
      return;

    case 'subscribe': {
      const topics = Array.isArray(msg.topics) ? msg.topics : [];
      const accepted = [];
      const rejected = [];
      for (const t of topics) {
        if (typeof t !== 'string') continue;
        if (client.topics.size >= MAX_TOPICS_PER_CLIENT) {
          rejected.push({ topic: t, reason: 'limit_reached' });
          continue;
        }
        if (!canAccessTopic(client.user, t, 'sub')) {
          rejected.push({ topic: t, reason: 'forbidden' });
          continue;
        }
        if (!client.topics.has(t)) {
          subscribeLocal(client, t);
        }
        accepted.push(t);
      }
      client.send({ type: 'subscribed', topics: accepted, rejected });
      return;
    }

    case 'unsubscribe': {
      const topics = Array.isArray(msg.topics) ? msg.topics : [];
      const done = [];
      for (const t of topics) {
        if (typeof t !== 'string') continue;
        if (client.topics.has(t)) {
          unsubscribeLocal(client, t);
          done.push(t);
        }
      }
      client.send({ type: 'unsubscribed', topics: done });
      return;
    }

    case 'publish': {
      const topic = msg.topic;
      if (typeof topic !== 'string' || !topic) {
        client.send({ type: 'error', message: 'Missing topic' });
        return;
      }
      if (!canAccessTopic(client.user, topic, 'pub')) {
        client.send({ type: 'error', message: 'Forbidden topic: ' + topic });
        return;
      }
      publish(topic, msg.payload, {
        from: client.user.sub || 'anon',
      });
      return;
    }

    default:
      client.send({ type: 'error', message: 'Unknown type: ' + msg.type });
  }
}

// ── Health snapshot ────────────────────────────────────────────
function health() {
  return {
    ok: true,
    redis: _redisReady ? 'ready' : (_redisDisabled ? 'disabled' : 'connecting'),
    clients: clients.size,
    topics: localSubs.size,
    uptimeSec: Math.floor((Date.now() - _stats.startedAt) / 1000),
    stats: { ..._stats },
  };
}

// ── Express middleware: REST publish (server-side trusted) ─────
/**
 * Mount: app.use('/api/broker', broker.expressRouter())
 * Cho phép service nội bộ publish qua REST (ví dụ Rust microservice không
 * giữ WebSocket riêng — gọi HTTP POST /api/broker/publish).
 *
 * Auth: header Authorization: Bearer <JWT>  HOẶC  X-Broker-Token (server secret)
 */
function expressRouter(opts = {}) {
  const express = require('express');
  const router = express.Router();
  const internalToken =
    opts.internalToken ||
    process.env.BROKER_INTERNAL_TOKEN ||
    null;
  const jwtSecret =
    opts.jwtSecret ||
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'dev-secret-fallback-change-in-production!!';

  router.get('/health', (_req, res) => res.json(health()));

  router.post('/publish', express.json({ limit: '64kb' }), (req, res) => {
    const xToken = req.headers['x-broker-token'];
    let user = null;
    if (internalToken && xToken && xToken === internalToken) {
      user = { sub: 'system', role: 'ADMIN', email: 'system@broker' };
    } else {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing bearer token' });
      }
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(auth.slice(7), jwtSecret, { ignoreExpiration: true });
        user = { sub: decoded.sub, email: decoded.email, role: decoded.role };
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    const { topic, payload } = req.body || {};
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Missing topic' });
    }
    if (!canAccessTopic(user, topic, 'pub')) {
      return res.status(403).json({ error: 'Forbidden topic: ' + topic });
    }
    publish(topic, payload, { from: user.sub });
    res.json({ ok: true, topic, ts: Date.now() });
  });

  return router;
}

module.exports = {
  attachToHttpServer,
  expressRouter,
  publish,
  health,
  canAccessTopic,
  // For unit tests
  _internal: { clients, localSubs },
};
