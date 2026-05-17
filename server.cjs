/**
 * AeroEduVision — Production Server (consolidated, no separate auth service)
 *
 * - Serves Vite static build from ./dist
 * - Built-in /api/auth/* (Node.js, dùng Postgres + bcryptjs + jsonwebtoken)
 *   → KHÔNG cần pixiai-auth Cloud Run service nữa
 * - Built-in /api/payment/*, /api/entitlements/*, /api/telegram/webhook
 * - Proxies /api/exam-matrices*, /api/media*, /api/documents*, /api/exams*,
 *           /api/questions*, /api/question-bank* → MEDIA_SERVICE_URL
 * - Proxies /api/teacher/*  → TEACHER_SERVICE_URL (built-in handlers chạy trước)
 * - Proxies /api/latex-projects* → LATEX_SERVICE_URL
 * - Proxies /api/*               → BACKEND_URL  (aero-backend gateway, fallback)
 * - Proxies /socket.io           → BACKEND_URL  (WebSocket)
 * - Handles SPA routing          → index.html
 *
 * ENV vars (set by Cloud Run — do NOT override PORT):
 *   PORT              — set automatically by Cloud Run
 *   DATABASE_URL      — Postgres connection (BẮT BUỘC cho auth + payment)
 *   JWT_SECRET        — JWT signing secret  (BẮT BUỘC)
 *   PUBLIC_URL        — base URL của site (cho password reset link, payment)
 *   BACKEND_URL       — Rust aero-backend URL (default: http://localhost:8090)
 *   MEDIA_SERVICE_URL — pixiai-media Cloud Run URL
 *   TEACHER_SERVICE_URL — pixiai-teacher Cloud Run URL
 *   LATEX_SERVICE_URL — pixiai-latex Cloud Run URL
 *   TELEGRAM_BOT_TOKEN, SMTP_*, FAL_API_KEY — xem .env.example
 *
 * AUTH_SERVICE_URL: DEPRECATED — pixiai-auth đã được merge vào server này.
 */

'use strict';

const express = require('express');
const path = require('path');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8090';

// AUTH_SERVICE_URL: DEPRECATED — built-in handlers cover toàn bộ /api/auth/*.
// Giữ biến để log warning nếu user còn set, nhưng KHÔNG dùng làm fallback nữa.
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || '';
if (AUTH_SERVICE_URL) {
  console.warn('[server] ⚠ AUTH_SERVICE_URL set nhưng đã DEPRECATED — built-in auth thay thế. Bỏ env này đi.');
}

// Media service (pixiai-media Cloud Run) — handles /api/exam-matrices, /api/media, /api/documents,
// /api/questions, /api/question-bank, /api/exams
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://localhost:8098';

// Teacher service (pixiai-teacher Cloud Run) — handles /api/teacher/*
const TEACHER_SERVICE_URL = process.env.TEACHER_SERVICE_URL || 'http://localhost:8106';

// LaTeX service (pixiai-latex Cloud Run) — handles /api/latex-projects/*
// Self-contained: own DB queries + JWT auth, không cần qua aero-backend.
const LATEX_SERVICE_URL = process.env.LATEX_SERVICE_URL || 'http://localhost:8109';

// ── Auth routing strategy (updated 2026-04-21) ────────────
// Built-in Node.js handlers luôn chạy TRƯỚC nếu DATABASE_URL có sẵn.
// Nếu Rust AUTH_SERVICE_URL được set, proxy sẽ catch các endpoint còn lại
// (refresh, forgot-password, reset-password, change-password) mà built-in chưa cover.
// Lý do: khi Rust auth-service down/chết, login/register/google/me/logout vẫn hoạt động
// (trước đây proxy treo 30s → UI hiển thị "Lỗi kết nối mạng").
const HAS_DATABASE_URL = !!process.env.DATABASE_URL;
const USE_NODEJS_AUTH = HAS_DATABASE_URL;      // built-in auth handlers (login/register/google/me/logout/refresh/forgot/reset/change)

// USE_NODEJS_QUESTIONS = true  → built-in Node.js handlers query "Question" table directly
// USE_NODEJS_QUESTIONS = false → proxy to MEDIA_SERVICE_URL (pixiai-media Cloud Run)
//
// Default: true (Node.js built-in) UNLESS DIRECT_RUST_MEDIA_PROXY=true is set explicitly.
// pixiai-media Rust service must have a working DATABASE_URL before enabling the proxy.
// Set DIRECT_RUST_MEDIA_PROXY=true in Cloud Run env vars when pixiai-media is healthy.
const USE_NODEJS_QUESTIONS = process.env.DIRECT_RUST_MEDIA_PROXY !== 'true';

console.log(`[server] PORT=${PORT}`);
console.log(`[server] BACKEND_URL=${BACKEND_URL}`);
console.log(`[server] USE_NODEJS_AUTH=${USE_NODEJS_AUTH} (built-in /api/auth/* — no separate auth service)`);
console.log(`[server] MEDIA_SERVICE_URL=${MEDIA_SERVICE_URL}`);
console.log(`[server] TEACHER_SERVICE_URL=${TEACHER_SERVICE_URL}`);
console.log(`[server] LATEX_SERVICE_URL=${LATEX_SERVICE_URL}`);

// ── Security headers (required for Google OAuth) ───────────
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// ── Body parser (needed for auth routes) ───────────────────
// Default limit là 100kb; PDF base64 có thể tới ~30MB → bump lên 50mb cho
// các route đặc biệt (quiz-extract). express.json() chấp nhận limit duy nhất
// nên ta dùng giới hạn lớn cho mọi request — tin tưởng vì backend đứng sau auth.
app.use(express.json({ limit: '50mb' }));

// ══════════════════════════════════════════════════════════════
// BUILT-IN NODE.JS AUTH — active when AUTH_SERVICE_URL is not set
// Handles: /api/auth/login, /api/auth/google, /api/auth/me, /api/auth/logout
// Requires secrets: DATABASE_URL, JWT_SECRET (mounted via Cloud Run secrets)
// ══════════════════════════════════════════════════════════════
if (USE_NODEJS_AUTH) {
  console.log('[auth] Built-in Node.js auth handlers active');

  const { Pool } = require('pg');
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  // hash-wasm provides pure-WASM Argon2 — no native compilation needed
  const { argon2Verify } = require('hash-wasm');

  // Verify password against bcrypt ($2b/$2a) OR argon2 ($argon2id/$argon2i) hash
  // Mirrors Rust auth_service.rs: verify_password()
  async function verifyPassword(password, hash) {
    if (hash.startsWith('$2')) {
      return bcrypt.compare(password, hash);
    }
    if (hash.startsWith('$argon2')) {
      try {
        return await argon2Verify({ password, hash });
      } catch {
        return false;
      }
    }
    console.warn('[auth] Unknown hash format:', hash.substring(0, 10));
    return false;
  }

  const JWT_SECRET = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';
  const JWT_EXPIRY_SECONDS = 86400; // 24h

  // Lazy DB pool — created on first request
  let _pool = null;
  function getPool() {
    if (!_pool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _pool = new Pool({
        connectionString: DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
    return _pool;
  }

  // Issue a JWT matching the format expected by auth.service.ts
  function issueToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY_SECONDS }
    );
  }

  // Safe user object (no password hash)
  function publicUser(u) {
    return {
      id: u.id,
      email: u.email,
      name: u.name || null,
      role: u.role || 'STUDENT',
      image: u.image || null,
      emailVerified: u.emailVerified || null,
    };
  }

  // ── POST /api/auth/login ───────────────────────────────────
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email và mật khẩu không được để trống' });
      }

      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT * FROM "User" WHERE LOWER(email) = $1 LIMIT 1',
        [email.toLowerCase().trim()]
      );
      const user = rows[0];

      if (!user || !user.password) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
      }

      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
      }

      // Update lastLoginAt
      pool.query(
        'UPDATE "User" SET "lastLoginAt" = $1 WHERE id = $2',
        [new Date(), user.id]
      ).catch(() => {});

      const token = issueToken(user);
      console.log(`[auth:login] ✅ ${user.email}`);
      return res.json({
        user: publicUser(user),
        tokens: { accessToken: token, refreshToken: '' },
        requiresTwoFactor: false,
      });
    } catch (err) {
      const cls = classifyDbError(err);
      console.error(`[auth:login] ❌ [${cls.kind}]`, err.message);
      return res.status(cls.status).json({
        error: cls.userMessage,
        retryable: cls.status === 503,
        kind: cls.kind,
      });
    }
  });

  // ── Helper: detect lỗi infra DB (Neon quota, connection pool, network) ──
  // Trả về { status, message } cho frontend hiểu đây là vấn đề tạm thời.
  function classifyDbError(err) {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('compute time quota') || msg.includes('exceeded')) {
      return {
        status: 503,
        userMessage: 'Hệ thống đang quá tải tạm thời. Vui lòng thử lại sau 5-10 phút.',
        kind: 'quota_exceeded',
      };
    }
    if (msg.includes('connection') || msg.includes('econnrefused') || msg.includes('etimedout')) {
      return {
        status: 503,
        userMessage: 'Mất kết nối tới cơ sở dữ liệu. Đang khắc phục, vui lòng thử lại sau.',
        kind: 'db_unreachable',
      };
    }
    return {
      status: 500,
      userMessage: 'Lỗi máy chủ, vui lòng thử lại',
      kind: 'unknown',
    };
  }

  // ── POST /api/auth/google ─────────────────────────────────
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential } = req.body || {};
      if (!credential) {
        return res.status(400).json({ error: 'Google credential is required' });
      }

      // Verify via Google tokeninfo API (no extra library needed)
      const infoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!infoRes.ok) {
        const errText = await infoRes.text().catch(() => '');
        console.warn('[auth:google] Google tokeninfo rejected:', infoRes.status, errText);
        return res.status(401).json({ error: 'Google credential không hợp lệ' });
      }
      const claims = await infoRes.json();

      const email = claims.email?.toLowerCase().trim();
      if (!email) {
        return res.status(401).json({ error: 'Không tìm thấy email trong Google token' });
      }

      const pool = getPool();

      // Find existing user
      let { rows } = await pool.query(
        'SELECT * FROM "User" WHERE LOWER(email) = $1 LIMIT 1',
        [email]
      );
      let user = rows[0];

      if (!user) {
        // Create new user (Google-authenticated, no password)
        const { randomUUID } = require('crypto'); // Node.js built-in
        const id = randomUUID();
        const now = new Date();
        const displayName = claims.name || email.split('@')[0];

        await pool.query(
          `INSERT INTO "User" (
            id, email, name, password, role, image,
            "emailVerified", "twoFactorEnabled", "failedLoginAttempts",
            "lastLoginAt", "createdAt", "updatedAt"
          ) VALUES ($1,$2,$3,NULL,'STUDENT',$4,$5,false,0,$6,$7,$8)`,
          [id, email, displayName, claims.picture || null, now, now, now, now]
        );

        // Account record (for provider tracking)
        const accountId = randomUUID();
        await pool.query(
          `INSERT INTO "Account" (id,"userId",provider,"providerAccountId",type,"createdAt","updatedAt")
           VALUES ($1,$2,'google',$3,'oauth',$4,$5)
           ON CONFLICT ("provider","providerAccountId") DO NOTHING`,
          [accountId, id, claims.sub, now, now]
        ).catch(() => {}); // non-critical

        const fetched = await pool.query('SELECT * FROM "User" WHERE id = $1', [id]);
        user = fetched.rows[0];
        console.log(`[auth:google] 🆕 New user: ${email}`);
      } else {
        // Update profile picture if missing
        if (!user.image && claims.picture) {
          pool.query(
            'UPDATE "User" SET image=$1,"updatedAt"=$2 WHERE id=$3',
            [claims.picture, new Date(), user.id]
          ).catch(() => {});
        }
      }

      const token = issueToken(user);
      console.log(`[auth:google] ✅ ${user.email}`);
      return res.json({
        user: publicUser(user),
        tokens: { accessToken: token, refreshToken: '' },
      });
    } catch (err) {
      const cls = classifyDbError(err);
      console.error(`[auth:google] ❌ [${cls.kind}]`, err.message);
      if (cls.kind === 'unknown' && err.stack) {
        console.error('[auth:google] stack:', err.stack.split('\n').slice(0, 5).join('\n'));
      }
      return res.status(cls.status).json({
        error: cls.kind === 'quota_exceeded' || cls.kind === 'db_unreachable'
          ? cls.userMessage
          : 'Lỗi xác thực Google, vui lòng thử lại',
        retryable: cls.status === 503,
        kind: cls.kind,
      });
    }
  });

  // ── GET /api/auth/me ──────────────────────────────────────
  app.get('/api/auth/me', async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = auth.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      // Cache: 60s TTL, key per-user. Profile thay đổi qua /change-password,
      // /update-profile sẽ invalidate (xem cache.del bên dưới các handler đó).
      const cache = require('./lib/cache.cjs');
      const cacheKey = `auth:me:${decoded.sub}`;
      const result = await cache.getOrFetch(cacheKey, 60, async () => {
        const pool = getPool();
        const { rows } = await pool.query(
          'SELECT * FROM "User" WHERE id = $1 LIMIT 1',
          [decoded.sub]
        );
        if (!rows[0]) return { __notFound: true };
        return publicUser(rows[0]);
      });
      if (result?.__notFound) return res.status(404).json({ error: 'User not found' });
      return res.json(result);
    } catch {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  });

  // ── POST /api/auth/logout ─────────────────────────────────
  app.post('/api/auth/logout', (_req, res) => {
    // JWT is stateless — client discards the token
    return res.json({ success: true });
  });

  // ── GET /api/health/cache ─────────────────────────────────
  // Public endpoint hiển thị trạng thái Redis cache. Dùng debug khi
  // Redis bị disconnect / quota cap → mức degrade từ "fast cached"
  // sang "slow Postgres only".
  app.get('/api/health/cache', async (_req, res) => {
    try {
      const cache = require('./lib/cache.cjs');
      const enabled = cache.isEnabled();
      let pingMs = null;
      if (enabled) {
        const t0 = Date.now();
        await cache.set('__healthcheck__', Date.now(), 5);
        const v = await cache.get('__healthcheck__');
        pingMs = Date.now() - t0;
        if (v === null) {
          return res.json({ status: 'degraded', enabled: true, reason: 'set/get round-trip lost' });
        }
      }
      return res.json({
        status: enabled ? 'ok' : 'disabled',
        enabled,
        backend: process.env.REDIS_URL ? 'REDIS_URL' : (process.env.REDIS_HOST ? 'REDIS_HOST' : 'none'),
        pingMs,
      });
    } catch (e) {
      return res.json({ status: 'error', error: e.message });
    }
  });

  // ── POST /api/auth/refresh ────────────────────────────────
  // JWT stateless: chấp nhận token cũ (kể cả expired ≤ 7 ngày) → cấp token mới.
  // Production thực thụ nên dùng refresh-token riêng + DB; ở đây tối giản
  // để bỏ pixiai-auth service.
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const auth = req.headers.authorization || '';
      const oldToken = auth.startsWith('Bearer ') ? auth.slice(7) : (req.body?.refreshToken || '');
      if (!oldToken) return res.status(401).json({ error: 'No token' });

      let decoded;
      try {
        decoded = jwt.verify(oldToken, JWT_SECRET);
      } catch (e) {
        // Token hết hạn → vẫn decode payload để re-issue (gracefully)
        if (e.name !== 'TokenExpiredError') {
          return res.status(401).json({ error: 'Invalid token' });
        }
        decoded = jwt.decode(oldToken);
        // Reject nếu token expired quá lâu (> 7 ngày)
        if (!decoded || (decoded.exp * 1000 + 7 * 24 * 3600 * 1000) < Date.now()) {
          return res.status(401).json({ error: 'Refresh window expired, please login again' });
        }
      }

      const pool = getPool();
      const { rows } = await pool.query('SELECT * FROM "User" WHERE id = $1', [decoded.sub]);
      if (!rows[0]) return res.status(401).json({ error: 'User not found' });

      const newToken = issueToken(rows[0]);
      return res.json({ accessToken: newToken, refreshToken: '' });
    } catch (err) {
      console.error('[auth:refresh] ❌', err.message);
      return res.status(500).json({ error: 'Refresh failed' });
    }
  });

  // ── POST /api/auth/forgot-password ─────────────────────────
  // Body: { email }. Sinh reset token (JWT 30 phút), gửi email.
  // KHÔNG báo email tồn tại hay không (chống user enumeration).
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Email required' });

      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT id, email, name FROM "User" WHERE LOWER(email) = $1 LIMIT 1',
        [String(email).toLowerCase().trim()]
      );
      const user = rows[0];

      if (user) {
        const resetToken = jwt.sign(
          { sub: user.id, type: 'password_reset' },
          JWT_SECRET,
          { expiresIn: '30m' }
        );
        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
        const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
        try {
          const { sendEmail } = require('./lib/email-sender.cjs');
          await sendEmail({
            to: user.email,
            subject: '[AeroEdu] Đặt lại mật khẩu',
            html: `<p>Xin chào ${user.name || ''},</p>
                   <p>Bạn đã yêu cầu đặt lại mật khẩu. Click link bên dưới (hết hạn sau 30 phút):</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>
                   <p>Nếu không phải bạn, vui lòng bỏ qua email này.</p>`,
            text: `Đặt lại mật khẩu: ${resetUrl}`,
          });
          console.log(`[auth:forgot] ✅ reset email → ${user.email}`);
        } catch (e) {
          console.error('[auth:forgot] email failed:', e.message);
        }
      }
      // Trả thành công bất kể email tồn tại không
      return res.json({ ok: true, message: 'Nếu email tồn tại, link đặt lại đã được gửi.' });
    } catch (err) {
      console.error('[auth:forgot] ❌', err.message);
      return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // ── POST /api/auth/reset-password ──────────────────────────
  // Body: { token, newPassword }
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword) return res.status(400).json({ error: 'token + newPassword required' });
      if (String(newPassword).length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });

      let decoded;
      try { decoded = jwt.verify(token, JWT_SECRET); }
      catch { return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' }); }

      if (decoded.type !== 'password_reset') return res.status(401).json({ error: 'Token sai loại' });

      const hash = await bcrypt.hash(newPassword, 12);
      const pool = getPool();
      const { rowCount } = await pool.query(
        'UPDATE "User" SET password = $1, "updatedAt" = $2 WHERE id = $3',
        [hash, new Date(), decoded.sub]
      );
      if (!rowCount) return res.status(404).json({ error: 'User not found' });
      console.log(`[auth:reset] ✅ user=${decoded.sub}`);
      return res.json({ ok: true, message: 'Đặt lại mật khẩu thành công' });
    } catch (err) {
      console.error('[auth:reset] ❌', err.message);
      return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // ── POST /api/auth/change-password ─────────────────────────
  // Body: { currentPassword, newPassword }. Yêu cầu Bearer token.
  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      let decoded;
      try { decoded = jwt.verify(auth.slice(7), JWT_SECRET); }
      catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }

      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Thiếu mật khẩu' });
      if (String(newPassword).length < 6) return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });

      const pool = getPool();
      const { rows } = await pool.query('SELECT * FROM "User" WHERE id = $1', [decoded.sub]);
      const user = rows[0];
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!user.password) return res.status(400).json({ error: 'Tài khoản này dùng Google đăng nhập' });

      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });

      const hash = await bcrypt.hash(newPassword, 12);
      await pool.query(
        'UPDATE "User" SET password = $1, "updatedAt" = $2 WHERE id = $3',
        [hash, new Date(), user.id]
      );
      // Invalidate /auth/me cache cho user này
      try { require('./lib/cache.cjs').del(`auth:me:${user.id}`); } catch {}
      console.log(`[auth:change-password] ✅ user=${user.id}`);
      return res.json({ ok: true, message: 'Đổi mật khẩu thành công' });
    } catch (err) {
      console.error('[auth:change-password] ❌', err.message);
      return res.status(500).json({ error: 'Lỗi máy chủ' });
    }
  });

  // ── POST /api/auth/register ───────────────────────────────
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, role } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email và mật khẩu không được để trống' });
      }
      // role: 'STUDENT' (default) hoặc 'TEACHER'. KHÔNG cho phép tự đăng ký ADMIN.
      const safeRole = String(role || '').toUpperCase() === 'TEACHER' ? 'TEACHER' : 'STUDENT';

      const pool = getPool();
      const existing = await pool.query(
        'SELECT id FROM "User" WHERE LOWER(email) = $1',
        [email.toLowerCase().trim()]
      );
      if (existing.rows.length) {
        return res.status(409).json({ error: 'Email đã được sử dụng' });
      }

      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const now = new Date();
      const hash = await bcrypt.hash(password, 12);
      const displayName = name || email.split('@')[0];

      await pool.query(
        `INSERT INTO "User" (
          id, email, name, password, role, image,
          "emailVerified", "twoFactorEnabled", "failedLoginAttempts",
          "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,NULL,NULL,false,0,$6,$7)`,
        [id, email.toLowerCase().trim(), displayName, hash, safeRole, now, now]
      );

      const { rows } = await pool.query('SELECT * FROM "User" WHERE id = $1', [id]);
      const user = rows[0];

      // ── Auto-link nếu role=STUDENT và email match ClassStudent đã import ──
      // GV import HS với cột email → khi HS đăng ký bằng email đó, tự động
      // được kết nối với GV đã import. KHÔNG cần GV duyệt (vì GV đã chủ động
      // import = đã chấp nhận). Notification gửi cho GV biết HS vừa join.
      if (safeRole === 'STUDENT') {
        try {
          // Đảm bảo bảng tồn tại trước khi query (lazy init nếu chưa có)
          await pool.query(`
            CREATE TABLE IF NOT EXISTS "TeacherStudentLink" (
              id           TEXT PRIMARY KEY,
              "teacherId"  TEXT NOT NULL,
              "studentId"  TEXT NOT NULL,
              status       TEXT NOT NULL,
              "initiatedBy" TEXT NOT NULL,
              message      TEXT,
              "approvedAt" TIMESTAMPTZ,
              "rejectedAt" TIMESTAMPTZ,
              "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              UNIQUE("teacherId", "studentId")
            )
          `).catch(() => {});
          // Tìm các (classId, teacherId) HS này đã được import
          const matches = await pool.query(`
            SELECT DISTINCT tc."teacherId", tc.name AS "className", tc.subject
              FROM "ClassStudent" cs
              JOIN "TeacherClass" tc ON tc.id = cs."classId"
             WHERE LOWER(cs.email) = LOWER($1)
               AND tc."teacherId" IS NOT NULL
               AND tc."teacherId" != $2
          `, [user.email, user.id]).catch(() => ({ rows: [] }));
          let autoLinks = 0;
          for (const row of matches.rows) {
            try {
              await pool.query(`
                INSERT INTO "TeacherStudentLink"
                  (id, "teacherId", "studentId", status, "initiatedBy", "approvedAt")
                VALUES ($1, $2, $3, 'approved', 'auto', NOW())
                ON CONFLICT ("teacherId", "studentId") DO NOTHING
              `, [randomUUID(), row.teacherId, user.id]);
              autoLinks++;
              // Notification cho GV (best-effort, không fail register nếu lỗi)
              try {
                await pool.query(`
                  INSERT INTO "Notification"
                    (id, "userId", "fromUserId", type, title, body, link, metadata)
                  VALUES ($1, $2, $3, 'link_approved', $4, $5, $6, $7)
                `, [randomUUID(), row.teacherId, user.id,
                    `Học sinh ${user.name} vừa đăng ký`,
                    `${user.name} đã được tự động kết nối vào lớp "${row.className}" mà bạn đã import.`,
                    '/teacher/student-requests',
                    JSON.stringify({ studentId: user.id, className: row.className, subject: row.subject, autoLinked: true })]);
              } catch { /* notification fail không ảnh hưởng */ }
            } catch (e) {
              if (!/already exists|duplicate/i.test(e.message)) {
                console.warn('[auth:register:auto-link]', e.message.slice(0, 100));
              }
            }
          }
          if (autoLinks > 0) {
            console.log(`[auth:register] 🔗 auto-linked ${user.email} với ${autoLinks} GV (đã import lớp)`);
          }
        } catch (linkErr) {
          // Auto-link thất bại không cản đăng ký
          console.warn('[auth:register:auto-link-block]', linkErr.message.slice(0, 100));
        }
      }

      const token = issueToken(user);
      console.log(`[auth:register] ✅ ${user.email}`);
      return res.status(201).json({
        user: publicUser(user),
        tokens: { accessToken: token, refreshToken: '' },
      });
    } catch (err) {
      const cls = classifyDbError(err);
      console.error(`[auth:register] ❌ [${cls.kind}]`, err.message);
      return res.status(cls.status).json({
        error: cls.kind === 'unknown' ? 'Lỗi đăng ký, vui lòng thử lại' : cls.userMessage,
        retryable: cls.status === 503,
        kind: cls.kind,
      });
    }
  });
}

// ── Shared proxy factory ────────────────────────────────────
// proxyTimeout = thời gian chờ upstream response (socket idle timeout sau khi connect).
// timeout      = thời gian chờ cả incoming request (client → proxy) idle.
// Đặt 10s: tránh request treo 30s+ khi upstream (Rust service) chết/hang, giúp client
// nhận 504 nhanh thay vì axios timeout 30s → rơi vào nhánh "Lỗi kết nối mạng".
function makeProxy(target, label, pathFilter) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter,
    proxyTimeout: 10000,
    timeout: 10000,
    on: {
      error: (err, req, res) => {
        console.error(`[proxy:${label}] ${req.method} ${req.originalUrl} → ${err.message}`);
        if (!res.headersSent) {
          // ECONNREFUSED / ECONNRESET / ETIMEDOUT → 503 (service maintenance), dễ phân biệt với 502
          const isConnErr = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(err.code);
          const status = isConnErr ? 503 : 502;
          res.status(status).json({ error: `${label} unavailable`, detail: err.message, code: err.code || null });
        }
      },
      proxyReq: (proxyReq, req) => {
        console.log(`[proxy:${label}] ${req.method} ${req.originalUrl} → ${target}${req.originalUrl}`);
        // CRITICAL: express.json() ở server.cjs đã consume request body.
        // Nếu không re-stream body vào proxyReq, HPM v3 sẽ hang → timeout → 503.
        // fixRequestBody: no-op nếu không có body, re-write body + Content-Length nếu có.
        // Bug này ảnh hưởng MỌI POST/PUT/PATCH qua mọi proxy (latex, media, teacher).
        fixRequestBody(proxyReq, req);
      },
    },
  });
}

// /api/auth/* — KHÔNG có proxy. Tất cả 9 endpoints (login, register, google,
// me, logout, refresh, forgot-password, reset-password, change-password) đều
// xử lý built-in trong block USE_NODEJS_AUTH ở trên. pixiai-auth Cloud Run
// đã được merge vào server này.

// ══════════════════════════════════════════════════════════════
// BUILT-IN TEACHER EXAM HANDLERS
// Handles: GET  /api/teacher/exams
//          DELETE /api/teacher/exams/:id
//          POST   /api/teacher/exams/:id/duplicate
// Requires: DATABASE_URL + JWT_SECRET
// Falls through to teacher-service proxy for everything else.
// ══════════════════════════════════════════════════════════════
{
  const { Pool: EPool } = require('pg');
  const ejwt = require('jsonwebtoken');
  const { randomUUID: examUUID } = require('crypto');

  let _epool = null;
  function getEPool() {
    if (!_epool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _epool = new EPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _epool;
  }

  const EJWT_SECRET = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  function getExamUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      // ignoreExpiration: chấp nhận token sắp hết hạn (interceptor refresh background)
      const decoded = ejwt.verify(auth.slice(7), EJWT_SECRET, { ignoreExpiration: true });
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }

  // Parse description JSON ({"subject","grade","notes","public","publishedAt"})
  // → return obj. Nếu description là string thuần, đặt nó vào notes.
  function parseExamMeta(description) {
    if (!description) return {};
    try {
      const p = JSON.parse(description);
      return {
        subject:     p.subject || null,
        grade:       p.grade || null,
        notes:       p.notes || null,
        isPublic:    !!p.public,
        publishedAt: p.publishedAt || null,
      };
    } catch {
      return { notes: description };
    }
  }

  function mapExam(row) {
    const meta = parseExamMeta(row.description);
    return {
      id:             row.id,
      title:          row.title,
      subject:        meta.subject,
      grade:          meta.grade,
      notes:          meta.notes,
      isPublic:       meta.isPublic,
      publishedAt:    meta.publishedAt,
      examType:       row.examType,
      duration:       row.duration,
      totalScore:     parseFloat(row.totalScore) || 10,
      totalQuestions: row.totalQuestions,
      status:         row.status,
      matrixId:       row.matrixId || null,
      userId:         row.userId,
      createdAt:      row.createdAt,
      updatedAt:      row.updatedAt,
    };
  }

  // ── GET /api/teacher/exams ─────────────────────────────────
  app.get('/api/teacher/exams', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const pool = getEPool();
      const { rows } = await pool.query(
        `SELECT * FROM "Exam" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
        [userId]
      );

      console.log(`[teacher:exams] ✅ ${rows.length} exams for user ${userId}`);
      return res.json({ exams: rows.map(mapExam) });
    } catch (err) {
      console.error('[teacher:exams] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/exams ─────────────────────────────
  // Tạo đề thi mới (manual). Body:
  //   { title, subject?, grade?, examType, duration, description?,
  //     totalQuestions?, totalScore?, passingScore?, shuffle?, status? }
  // Trả về { id, exam } để FE navigate /teacher/exams/:id sau khi tạo.
  app.post('/api/teacher/exams', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const body = req.body || {};
      const title = String(body.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề đề thi' });

      const pool = getEPool();
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const now = new Date();
      const examType = String(body.examType || 'Trắc nghiệm');
      const duration = Math.max(1, Number(body.duration) || 45);
      const totalQuestions = Math.max(0, Number(body.totalQuestions) || 0);
      const totalScore = Number(body.totalScore) || 10;
      const status = String(body.status || 'Nháp');

      // Đóng gói metadata phụ vào description JSON (giống các handler khác)
      const desc = JSON.stringify({
        subject: body.subject || 'Vật lý',
        grade: String(body.grade || ''),
        passingScore: Number(body.passingScore) || 50,
        shuffle: !!body.shuffle,
        notes: String(body.description || '').trim() || undefined,
        public: !!body.public,
        publishedAt: body.public ? now.toISOString() : null,
        source: 'manual',
      });

      await pool.query(
        `INSERT INTO "Exam"
           (id, title, description, "examType", duration, "totalScore",
            "totalQuestions", status, "matrixId", "userId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,$9,$10,$10)`,
        [id, title, desc, examType, duration, totalScore, totalQuestions, status, userId, now]
      );
      console.log(`[teacher:exams:create] ✅ ${id} title="${title.slice(0,40)}"`);
      const { rows } = await pool.query(`SELECT * FROM "Exam" WHERE id = $1`, [id]);
      return res.status(201).json({ id, exam: mapExam(rows[0]) });
    } catch (err) {
      console.error('[teacher:exams:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/teacher/exams/:id ─────────────────────────
  app.delete('/api/teacher/exams/:id', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const pool = getEPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "Exam" WHERE id = $1 AND "userId" = $2`,
        [req.params.id, userId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy đề thi' });

      console.log(`[teacher:exams:delete] ✅ ${req.params.id}`);
      return res.json({ success: true });
    } catch (err) {
      console.error('[teacher:exams:delete] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/exams/:id/duplicate ─────────────────
  app.post('/api/teacher/exams/:id/duplicate', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const pool = getEPool();
      const { rows } = await pool.query(
        `SELECT * FROM "Exam" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy đề thi' });

      const src = rows[0];
      const newId  = examUUID();
      const now    = new Date();
      const newTitle = `${src.title} (Bản sao)`;

      const { rows: created } = await pool.query(
        `INSERT INTO "Exam"
           (id, title, description, "examType", duration, "totalScore",
            "totalQuestions", status, "matrixId", "userId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'Nháp',$8,$9,$10,$11)
         RETURNING *`,
        [newId, newTitle, src.description, src.examType, src.duration,
         src.totalScore, src.totalQuestions, src.matrixId || null,
         userId, now, now]
      );

      console.log(`[teacher:exams:duplicate] ✅ ${src.id} → ${newId}`);
      return res.status(201).json({ success: true, exam: mapExam(created[0]) });
    } catch (err) {
      console.error('[teacher:exams:duplicate] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/teacher/exams/:id ─────────────────────────────
  // Trả exam + questions array (join Question qua ExamQuestion).
  app.get('/api/teacher/exams/:id', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getEPool();
      const { rows: examRows } = await pool.query(
        `SELECT * FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!examRows[0]) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      const exam = mapExam(examRows[0]);

      const { rows: qRows } = await pool.query(
        `SELECT q.id, q."questionType", q.content, q.options, q."correctAnswer",
                q.explanation, eq."order", eq.points
         FROM "ExamQuestion" eq
         JOIN "Question" q ON q.id = eq."questionId"
         WHERE eq."examId" = $1
         ORDER BY eq."order" ASC`,
        [req.params.id]
      );
      // mapExam đã parse subject/grade/notes/isPublic/publishedAt từ description
      return res.json({ exam, questions: qRows });
    } catch (err) {
      console.error('[teacher:exams:get] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/exams/:examId/questions ──────────────
  // Body: { content, questionType?, options?, correctAnswer?, explanation?, points? }
  // Tạo Question mới + INSERT ExamQuestion link, append vào cuối exam.
  // Tự recalc Exam.totalScore + totalQuestions.
  app.post('/api/teacher/exams/:examId/questions', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { examId } = req.params;
      const pool = getEPool();
      // Verify ownership
      const own = await pool.query(
        `SELECT subject, grade FROM "Exam" e
           LEFT JOIN LATERAL (SELECT description::jsonb AS d) j ON true
          WHERE e.id=$1 AND e."userId"=$2 LIMIT 1`,
        [examId, userId]
      ).catch(() => ({ rows: [] }));
      const ownCheck = await pool.query(
        `SELECT description FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [examId, userId]
      );
      if (!ownCheck.rows.length) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      let examMeta = {};
      try { examMeta = JSON.parse(ownCheck.rows[0].description || '{}'); } catch { /* keep {} */ }

      const body = req.body || {};
      const content = String(body.content || '').trim();
      if (!content) return res.status(400).json({ error: 'Thiếu nội dung câu hỏi' });
      const points = Math.max(0, Math.min(10, Number(body.points) || 1));

      const { randomUUID } = require('crypto');
      const qid = randomUUID();
      const now = new Date();
      // INSERT Question
      await pool.query(
        `INSERT INTO "Question"
           (id, topic, subject, grade, "questionType", difficulty, content,
            options, "correctAnswer", explanation, "qualityScore", "usageCount",
            "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,false,false,'Hoạt động',$11,$12,$12)`,
        [
          qid,
          String(body.topic || examMeta.subject || ''),
          String(body.subject || examMeta.subject || 'Vật lí'),
          String(body.grade || examMeta.grade || '11'),
          String(body.questionType || 'MULTIPLE_CHOICE'),
          String(body.difficulty || 'medium'),
          content,
          Array.isArray(body.options) ? body.options.map(String) : [],
          String(body.correctAnswer || ''),
          String(body.explanation || ''),
          userId, now,
        ]
      );
      // Find next order
      const ord = await pool.query(
        `SELECT COALESCE(MAX("order"), 0) + 1 AS next FROM "ExamQuestion" WHERE "examId"=$1`,
        [examId]
      );
      const nextOrder = Number(ord.rows[0]?.next) || 1;
      await pool.query(
        `INSERT INTO "ExamQuestion" (id, "examId", "questionId", "order", points)
         VALUES ($1,$2,$3,$4,$5)`,
        [randomUUID(), examId, qid, nextOrder, points]
      );
      // Recalc totalScore + totalQuestions
      const sums = await pool.query(
        `SELECT COUNT(*)::int AS cnt, COALESCE(SUM(points), 0)::float AS total
           FROM "ExamQuestion" WHERE "examId"=$1`,
        [examId]
      );
      const cnt = Number(sums.rows[0]?.cnt || 0);
      const totalScore = Number(sums.rows[0]?.total || 0);
      await pool.query(
        `UPDATE "Exam" SET "totalQuestions"=$2, "totalScore"=$3, "updatedAt"=NOW()
          WHERE id=$1`,
        [examId, cnt, totalScore]
      );
      return res.status(201).json({
        ok: true,
        questionId: qid,
        order: nextOrder,
        points,
        totalQuestions: cnt,
        totalScore,
      });
    } catch (err) {
      console.error('[teacher:exam-question:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/teacher/exams/:examId/questions/:questionId ──
  // Xoá ExamQuestion (link) — KHÔNG xoá Question gốc (có thể dùng ở đề khác).
  // Tự recalc + reorder.
  app.delete('/api/teacher/exams/:examId/questions/:questionId', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { examId, questionId } = req.params;
      const pool = getEPool();
      const own = await pool.query(
        `SELECT 1 FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [examId, userId]
      );
      if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      const del = await pool.query(
        `DELETE FROM "ExamQuestion" WHERE "examId"=$1 AND "questionId"=$2`,
        [examId, questionId]
      );
      if (!del.rowCount) return res.status(404).json({ error: 'Câu hỏi không thuộc đề này' });
      // Compact order: 1, 2, 3, ...
      const remaining = await pool.query(
        `SELECT id FROM "ExamQuestion" WHERE "examId"=$1 ORDER BY "order" ASC`,
        [examId]
      );
      for (let i = 0; i < remaining.rows.length; i++) {
        await pool.query(`UPDATE "ExamQuestion" SET "order"=$2 WHERE id=$1`, [remaining.rows[i].id, i + 1]);
      }
      // Recalc Exam totals
      const sums = await pool.query(
        `SELECT COUNT(*)::int AS cnt, COALESCE(SUM(points), 0)::float AS total
           FROM "ExamQuestion" WHERE "examId"=$1`,
        [examId]
      );
      await pool.query(
        `UPDATE "Exam" SET "totalQuestions"=$2, "totalScore"=$3, "updatedAt"=NOW()
          WHERE id=$1`,
        [examId, Number(sums.rows[0]?.cnt || 0), Number(sums.rows[0]?.total || 0)]
      );
      return res.json({
        ok: true,
        totalQuestions: Number(sums.rows[0]?.cnt || 0),
        totalScore: Number(sums.rows[0]?.total || 0),
      });
    } catch (err) {
      console.error('[teacher:exam-question:delete] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/exams/:examId/questions/reorder ──
  // Body: { questionIds: [...] } — mảng questionId theo thứ tự mới
  app.post('/api/teacher/exams/:examId/questions/reorder', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { examId } = req.params;
      const ids = Array.isArray(req.body?.questionIds) ? req.body.questionIds : [];
      if (ids.length === 0) return res.status(400).json({ error: 'Thiếu questionIds' });
      const pool = getEPool();
      const own = await pool.query(
        `SELECT 1 FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [examId, userId]
      );
      if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      for (let i = 0; i < ids.length; i++) {
        await pool.query(
          `UPDATE "ExamQuestion" SET "order"=$3
            WHERE "examId"=$1 AND "questionId"=$2`,
          [examId, ids[i], i + 1]
        );
      }
      await pool.query(`UPDATE "Exam" SET "updatedAt"=NOW() WHERE id=$1`, [examId]);
      return res.json({ ok: true, count: ids.length });
    } catch (err) {
      console.error('[teacher:exam-question:reorder] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /api/teacher/exams/:examId/questions/:questionId ─
  // Body: { points?: number }
  // Cập nhật điểm cho cặp (exam, question) trong ExamQuestion,
  // rồi tự động recalc Exam.totalScore = SUM(eq.points).
  app.patch('/api/teacher/exams/:examId/questions/:questionId', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { examId, questionId } = req.params;
      const points = Number(req.body?.points);
      if (!Number.isFinite(points) || points < 0 || points > 100) {
        return res.status(400).json({ error: 'points phải là số ≥ 0' });
      }
      const pool = getEPool();
      // Verify ownership của exam trước khi update join row
      const own = await pool.query(
        `SELECT 1 FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [examId, userId]
      );
      if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      const upd = await pool.query(
        `UPDATE "ExamQuestion" SET points=$3
          WHERE "examId"=$1 AND "questionId"=$2
          RETURNING points`,
        [examId, questionId, points]
      );
      if (!upd.rowCount) {
        return res.status(404).json({ error: 'Không tìm thấy câu hỏi trong đề' });
      }
      // Recalc totalScore từ tổng points
      const sum = await pool.query(
        `SELECT COALESCE(SUM(points), 0)::float AS total FROM "ExamQuestion" WHERE "examId"=$1`,
        [examId]
      );
      const totalScore = Number(sum.rows[0]?.total ?? 0);
      await pool.query(
        `UPDATE "Exam" SET "totalScore"=$2, "updatedAt"=NOW() WHERE id=$1`,
        [examId, totalScore]
      );
      return res.json({ ok: true, points, totalScore });
    } catch (err) {
      console.error('[teacher:exam-question:points] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════
  // BÁO CÁO & KẾT QUẢ HỌC SINH (cá nhân + nhóm)
  // ══════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════
  // GET /api/teacher/leaderboard — Bảng vàng thành tích
  // Top N học sinh xếp theo điểm DESC, thời gian ASC (nhanh hơn = cao hơn)
  // Hợp dữ liệu từ:
  //   - PracticeExam (HS làm cá nhân từ /student/exam-prep)
  //   - QuizRoomParticipant (HS làm phòng live qua /play/:code)
  // Chỉ tính bài của các đề thuộc TEACHER hiện tại.
  // Query params:
  //   - examId? : lọc theo 1 đề cụ thể
  //   - limit?  : max top (mặc định 20, max 50)
  // ══════════════════════════════════════════════════════════
  app.get('/api/teacher/leaderboard', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getEPool();
      const examFilter = String(req.query.examId || '').trim();
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

      const entries = [];

      // ── 1. PracticeExam (individual) ──
      try {
        const params = [userId];
        let examWhere = '';
        if (examFilter) {
          examWhere = ` AND pe."sourceExamId" = $2`;
          params.push(examFilter);
        }
        const r = await pool.query(
          `SELECT pe."id", pe."studentId", pe."score", pe."percentage",
                  pe."createdAt", pe."completedAt", pe."sourceExamId",
                  u.name AS student_name, u.image AS student_image,
                  e.title AS exam_title
             FROM "PracticeExam" pe
             JOIN "Exam" e ON e.id = pe."sourceExamId"
             LEFT JOIN "User" u ON u.id = pe."studentId"
            WHERE pe."completed" = true
              AND e."userId" = $1${examWhere}
              AND pe."score" IS NOT NULL
            ORDER BY pe."completedAt" DESC NULLS LAST
            LIMIT 500`,
          params
        );
        for (const row of r.rows) {
          const durationSec = row.completedAt && row.createdAt
            ? Math.max(1, Math.round((new Date(row.completedAt) - new Date(row.createdAt)) / 1000))
            : null;
          entries.push({
            id: row.id,
            studentId: row.studentId,
            studentName: row.student_name || 'Học sinh ẩn',
            studentImage: row.student_image,
            score: Number(row.score) || 0,
            percentage: Number(row.percentage) || 0,
            durationSec,
            completedAt: row.completedAt,
            examTitle: row.exam_title || '—',
            examId: row.sourceExamId,
            source: 'individual',
          });
        }
      } catch (e) {
        if (!/relation .* does not exist/i.test(e.message)) {
          console.warn('[leaderboard:individual]', e.message);
        }
      }

      // ── 2. QuizRoomParticipant (group live) ──
      try {
        const params = [userId];
        let examWhere = '';
        if (examFilter) {
          examWhere = ` AND r."examId" = $2`;
          params.push(examFilter);
        }
        const r = await pool.query(
          `SELECT p.id, p.name AS student_name, p.avatar, p.score,
                  p."correctCount", p."joinedAt",
                  r."examId", r."startedAt", r."endedAt",
                  e.title AS exam_title, e."totalQuestions"
             FROM "QuizRoomParticipant" p
             JOIN "QuizRoom" r ON r.id = p."roomId"
             JOIN "Exam" e ON e.id = r."examId"
            WHERE r."teacherId" = $1${examWhere}
            ORDER BY p.score DESC, p."joinedAt" ASC
            LIMIT 500`,
          params
        );
        for (const row of r.rows) {
          // QuizRoom score là điểm tích luỹ (~ 1000 / câu khi đúng nhanh)
          // Normalize về thang 10: score / (totalQ * 1000) * 10
          const totalQ = Number(row.totalQuestions) || 1;
          const normScore = Math.min(10, (Number(row.score) || 0) / (totalQ * 100));
          const percentage = Math.min(100, (normScore / 10) * 100);
          // Duration ~ thời gian từ start đến joined-end (sấp xỉ)
          const durationSec = row.endedAt && row.startedAt
            ? Math.max(1, Math.round((new Date(row.endedAt) - new Date(row.startedAt)) / 1000))
            : null;
          entries.push({
            id: row.id,
            studentId: null,  // Quiz room participants không cần auth
            studentName: row.student_name,
            studentImage: row.avatar || null,
            score: Number(normScore.toFixed(2)),
            percentage: Math.round(percentage),
            durationSec,
            completedAt: row.endedAt || row.joinedAt,
            examTitle: row.exam_title || '—',
            examId: row.examId,
            source: 'group',
          });
        }
      } catch (e) {
        if (!/relation .* does not exist/i.test(e.message)) {
          console.warn('[leaderboard:group]', e.message);
        }
      }

      // Sort: điểm cao trước, thời gian ngắn trước (cùng điểm)
      entries.sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
        const da = a.durationSec ?? Number.MAX_SAFE_INTEGER;
        const db = b.durationSec ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      });

      const top = entries.slice(0, limit);
      // Đánh dấu rank
      const ranked = top.map((e, i) => ({ ...e, rank: i + 1 }));

      res.json({
        examId: examFilter || null,
        total: entries.length,
        items: ranked,
      });
    } catch (err) {
      console.error('[teacher:leaderboard] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/teacher/exams/:id/attempts
  // Trả: { individual: [...], group: [{room, participants}] }
  // - individual: PracticeExam where sourceExamId = :id (HS làm cá nhân từ /student/exam-prep)
  // - group: QuizRoom where examId = :id, teacherId = current (live phòng thi)
  app.get('/api/teacher/exams/:id/attempts', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { id: examId } = req.params;
      const pool = getEPool();
      // Verify ownership
      const own = await pool.query(
        `SELECT 1 FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [examId, userId]
      );
      if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy đề thi' });

      // ── INDIVIDUAL attempts (PracticeExam) ──
      // Join với User để lấy tên + email HS
      let individual = [];
      try {
        const r = await pool.query(
          `SELECT pe."id", pe."studentId", pe."score", pe."percentage",
                  pe."completed", pe."createdAt", pe."completedAt",
                  pe."questions", pe."answers",
                  u.name AS student_name, u.email AS student_email, u.image AS student_image
             FROM "PracticeExam" pe
             LEFT JOIN "User" u ON u.id = pe."studentId"
            WHERE pe."sourceExamId" = $1
            ORDER BY pe."completedAt" DESC NULLS LAST, pe."createdAt" DESC
            LIMIT 200`,
          [examId]
        );
        individual = r.rows.map(row => {
          const qs = Array.isArray(row.questions) ? row.questions : [];
          const ans = row.answers && typeof row.answers === 'object' ? row.answers : {};
          const answeredCount = qs.filter(q => ans[q.questionId] !== undefined && ans[q.questionId] !== null).length;
          const durationSec = row.completedAt && row.createdAt
            ? Math.max(0, Math.round((new Date(row.completedAt) - new Date(row.createdAt)) / 1000))
            : null;
          return {
            id:           row.id,
            studentId:    row.studentId,
            studentName:  row.student_name || row.student_email || 'Học sinh ẩn',
            studentEmail: row.student_email || null,
            studentImage: row.student_image || null,
            score:        Number(row.score) || 0,
            percentage:   Number(row.percentage) || 0,
            completed:    !!row.completed,
            answeredCount,
            totalQuestions: qs.length,
            startedAt:    row.createdAt,
            completedAt:  row.completedAt,
            durationSec,
            source:       'individual',
          };
        });
      } catch (e) {
        if (!/relation .* does not exist/i.test(e.message)) {
          console.warn('[attempts:individual]', e.message);
        }
      }

      // ── GROUP attempts (QuizRoom + QuizRoomParticipant) ──
      let group = [];
      try {
        const rooms = await pool.query(
          `SELECT id, code, status, "currentQuestion", "startedAt", "endedAt", "createdAt"
             FROM "QuizRoom"
            WHERE "examId" = $1 AND "teacherId" = $2
            ORDER BY "createdAt" DESC
            LIMIT 50`,
          [examId, userId]
        );
        for (const room of rooms.rows) {
          const parts = await pool.query(
            `SELECT id, name, avatar, score, "correctCount", "joinedAt"
               FROM "QuizRoomParticipant"
              WHERE "roomId" = $1
              ORDER BY score DESC, "correctCount" DESC`,
            [room.id]
          );
          group.push({
            roomId:    room.id,
            code:      room.code,
            status:    room.status,
            startedAt: room.startedAt,
            endedAt:   room.endedAt,
            createdAt: room.createdAt,
            participantCount: parts.rows.length,
            participants: parts.rows.map(p => ({
              id:           p.id,
              studentName:  p.name,
              avatar:       p.avatar,
              score:        Number(p.score) || 0,
              correctCount: Number(p.correctCount) || 0,
              joinedAt:     p.joinedAt,
              source:       'group',
            })),
          });
        }
      } catch (e) {
        if (!/relation .* does not exist/i.test(e.message)) {
          console.warn('[attempts:group]', e.message);
        }
      }

      const summary = {
        individualCount: individual.length,
        individualCompleted: individual.filter(a => a.completed).length,
        groupRoomCount: group.length,
        groupParticipantCount: group.reduce((s, r) => s + r.participantCount, 0),
        totalUniqueStudents: new Set([
          ...individual.map(a => a.studentId).filter(Boolean),
          ...group.flatMap(r => r.participants.map(p => p.studentName)),
        ]).size,
      };

      res.json({ examId, summary, individual, group });
    } catch (err) {
      console.error('[teacher:exams:attempts] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/teacher/exams/:id/analytics
  // Aggregate stats từ individual + group attempts
  app.get('/api/teacher/exams/:id/analytics', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { id: examId } = req.params;
      const pool = getEPool();
      const own = await pool.query(
        `SELECT id, "totalQuestions", "totalScore"
           FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [examId, userId]
      );
      if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      const examMeta = own.rows[0];

      // Pull completed PracticeExam attempts for stats
      let scores = [];
      let durations = [];
      let completed = 0, inProgress = 0;
      try {
        const r = await pool.query(
          `SELECT score, percentage, "completed", "createdAt", "completedAt"
             FROM "PracticeExam"
            WHERE "sourceExamId" = $1`,
          [examId]
        );
        for (const row of r.rows) {
          if (row.completed) {
            completed++;
            const s = Number(row.score) || 0;
            scores.push(s);
            if (row.completedAt && row.createdAt) {
              const mins = (new Date(row.completedAt) - new Date(row.createdAt)) / 60000;
              if (mins > 0 && mins < 24 * 60) durations.push(mins);
            }
          } else {
            inProgress++;
          }
        }
      } catch (e) {
        if (!/relation .* does not exist/i.test(e.message)) {
          console.warn('[analytics:individual]', e.message);
        }
      }
      // Pull QuizRoom participant scores (group results)
      try {
        const r = await pool.query(
          `SELECT p.score, r."totalQuestions" AS room_total
             FROM "QuizRoomParticipant" p
             JOIN "QuizRoom" r ON r.id = p."roomId"
            WHERE r."examId" = $1 AND r."teacherId" = $2`,
          [examId, userId]
        );
        for (const row of r.rows) {
          // QuizRoom score là điểm tích luỹ — quy về thang 10 cho dễ so sánh
          // Giả định mỗi câu group ≈ 1000 điểm; chuẩn hoá: score / (totalQ * 1000) * 10
          const totalQ = Number(row.room_total || examMeta.totalQuestions || 1);
          const norm = totalQ > 0 ? Math.min(10, Number(row.score) / (totalQ * 100)) : 0;
          if (Number.isFinite(norm) && norm >= 0) {
            scores.push(norm);
            completed++;
          }
        }
      } catch (e) {
        if (!/relation .* does not exist/i.test(e.message)) {
          console.warn('[analytics:group]', e.message);
        }
      }

      const total = scores.length;
      const sum = scores.reduce((a, b) => a + b, 0);
      const avg = total ? sum / total : 0;
      const sorted = [...scores].sort((a, b) => a - b);
      const median = total ? (
        total % 2 === 1
          ? sorted[(total - 1) / 2]
          : (sorted[total / 2 - 1] + sorted[total / 2]) / 2
      ) : 0;
      const high = total ? Math.max(...scores) : 0;
      const low = total ? Math.min(...scores) : 0;
      const variance = total > 1
        ? scores.reduce((a, b) => a + (b - avg) ** 2, 0) / (total - 1)
        : 0;
      const stdDev = Math.sqrt(variance);
      const passCount = scores.filter(s => s >= 5).length;
      const passRate = total ? (passCount / total) * 100 : 0;

      // Grade distribution
      const grade_distribution = { '9-10': 0, '8-8.9': 0, '7-7.9': 0, '6-6.9': 0, '5-5.9': 0, '0-4.9': 0 };
      for (const s of scores) {
        if (s >= 9)      grade_distribution['9-10']++;
        else if (s >= 8) grade_distribution['8-8.9']++;
        else if (s >= 7) grade_distribution['7-7.9']++;
        else if (s >= 6) grade_distribution['6-6.9']++;
        else if (s >= 5) grade_distribution['5-5.9']++;
        else             grade_distribution['0-4.9']++;
      }

      const time_analysis = durations.length ? {
        average_time_minutes: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        median_time_minutes:  Math.round(durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]),
        fastest_completion:   Math.round(Math.min(...durations)),
        slowest_completion:   Math.round(Math.max(...durations)),
      } : { average_time_minutes: 0, median_time_minutes: 0, fastest_completion: 0, slowest_completion: 0 };

      res.json({
        overview: {
          total_submissions: total + inProgress,
          completed: completed,
          in_progress: inProgress,
          average_score: Number(avg.toFixed(2)),
          median_score:  Number(median.toFixed(2)),
          highest_score: Number(high.toFixed(2)),
          lowest_score:  Number(low.toFixed(2)),
          std_deviation: Number(stdDev.toFixed(2)),
          pass_rate:     Number(passRate.toFixed(1)),
        },
        grade_distribution,
        question_analysis: [], // Cần phân tích từ answers JSON — skip phase này
        time_analysis,
        reliability: { cronbach_alpha: 0 },
      });
    } catch (err) {
      console.error('[teacher:exams:analytics] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── PUT /api/teacher/exams/:id ─────────────────────────────
  // Body: { title?, duration?, description?, status? }
  app.put('/api/teacher/exams/:id', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const sets = [];
      const vals = [req.params.id, userId];
      let i = 3;
      const { title, duration, status } = req.body || {};
      if (title !== undefined)    { sets.push(`title=$${i++}`);     vals.push(String(title).slice(0, 200)); }
      if (duration !== undefined) { sets.push(`duration=$${i++}`);  vals.push(Number(duration)); }
      if (status !== undefined)   { sets.push(`status=$${i++}`);    vals.push(String(status)); }
      if (!sets.length) return res.status(400).json({ error: 'Không có field nào để update' });
      sets.push(`"updatedAt"=$${i++}`); vals.push(new Date());
      const { rowCount } = await getEPool().query(
        `UPDATE "Exam" SET ${sets.join(', ')} WHERE id=$1 AND "userId"=$2`, vals
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[teacher:exams:update] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/exams/:id/publish ─────────────────────
  // Body: { status?, isPublic? }. Đổi status (mặc định "Đang diễn ra")
  // để học sinh nhìn thấy đề trong /student/exams. Nếu isPublic=true,
  // lưu metadata.public=true vào description JSON.
  app.post('/api/teacher/exams/:id/publish', async (req, res) => {
    try {
      const userId = getExamUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const newStatus = (req.body && req.body.status) || 'Đang diễn ra';
      const isPublic = req.body && req.body.isPublic !== false; // mặc định true

      const pool = getEPool();
      const { rows } = await pool.query(
        `SELECT * FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy đề thi' });

      // Merge isPublic vào description JSON (đã lưu subject ở đó)
      let descObj = {};
      try { descObj = JSON.parse(rows[0].description || '{}'); } catch {}
      descObj.public = isPublic;
      descObj.publishedAt = new Date().toISOString();

      await pool.query(
        `UPDATE "Exam" SET status=$1, description=$2, "updatedAt"=$3 WHERE id=$4`,
        [newStatus, JSON.stringify(descObj), new Date(), req.params.id]
      );
      console.log(`[teacher:exams:publish] ✅ ${req.params.id} → ${newStatus} public=${isPublic}`);
      return res.json({ ok: true, status: newStatus, isPublic });
    } catch (err) {
      console.error('[teacher:exams:publish] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// BUILT-IN QUIZ EXTRACTOR — Wayground-style flow
// Handles: POST /api/teacher/quiz-extract  → fal.ai trích xuất câu hỏi từ PDF
//          POST /api/teacher/quiz-publish  → lưu Exam + ExamQuestion vào DB
//
// Body cho extract:  { fileBase64, filename, mode, subject, grade, language, model? }
// Body cho publish:  { title, subject, grade, duration, questions[] }
//
// Khoá fal.ai lấy từ env FAL_API_KEY ("key_id:secret"). Routes này luôn
// chạy TRƯỚC proxy /api/teacher để không bị forward sang teacher-service.
// ══════════════════════════════════════════════════════════════
{
  const { extractQuestionsFromPdf, generateQuestionsFromPdf } = require('./lib/fal-quiz-extractor.cjs');
  const { Pool: QPool } = require('pg');
  const qjwt = require('jsonwebtoken');
  const { randomUUID: quizUUID } = require('crypto');

  let _qpool = null;
  function getQPool() {
    if (!_qpool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _qpool = new QPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _qpool;
  }

  const QJWT_SECRET = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  function getQuizUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const decoded = qjwt.verify(auth.slice(7), QJWT_SECRET);
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }

  // ── POST /api/teacher/quiz-extract ─────────────────────────
  // Bắt đầu pipeline Wayground: PDF → fal.ai → JSON câu hỏi.
  // KHÔNG yêu cầu DATABASE_URL — extractor stateless để dev nhanh.
  app.post('/api/teacher/quiz-extract', async (req, res) => {
    const t0 = Date.now();
    try {
      // Auth optional ở dev: cho phép gọi không cần token nếu ALLOW_QUIZ_ANON=1.
      const userId = getQuizUserId(req);
      if (!userId && process.env.ALLOW_QUIZ_ANON !== '1') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { fileBase64, filename, mode, subject, grade, language, model, count } = req.body || {};
      if (!fileBase64) return res.status(400).json({ error: 'fileBase64 is required' });

      const pdfBuffer = Buffer.from(fileBase64, 'base64');
      if (pdfBuffer.length < 100) {
        return res.status(400).json({ error: 'PDF buffer quá nhỏ — base64 sai?' });
      }
      if (pdfBuffer.length > 30 * 1024 * 1024) {
        return res.status(413).json({ error: 'PDF tối đa 30MB' });
      }

      const opts = {
        subject: subject || 'Vật lí',
        grade: grade || '11',
        language: language || 'Vietnamese',
        model,
        count: Number(count) || 20,
      };

      const result = mode === 'generate'
        ? await generateQuestionsFromPdf(pdfBuffer, opts)
        : await extractQuestionsFromPdf(pdfBuffer, opts);

      console.log(`[quiz-extract] ✅ user=${userId || 'anon'} mode=${mode || 'extract'} `
        + `file=${filename || 'unknown'} questions=${result.questions.length} `
        + `model=${result._internalModel || 'unknown'} took=${Date.now() - t0}ms`);

      // Strip internal field — không gửi tên model/provider về client.
      const { _internalModel, ...publicResult } = result;
      void _internalModel;
      return res.json({
        success: true,
        ...publicResult,
        receivedFilename: filename || null,
      });
    } catch (err) {
      console.error('[quiz-extract] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/teacher/quiz-publish ─────────────────────────
  // Lưu Exam vào bảng "Exam"; mỗi câu hỏi tạo Question + ExamQuestion link.
  // Mọi op trong 1 transaction — fail thì rollback toàn bộ.
  app.post('/api/teacher/quiz-publish', async (req, res) => {
    const client = await (async () => {
      try { return await getQPool().connect(); }
      catch { return null; }
    })();
    if (!client) {
      return res.status(503).json({ error: 'Database không kết nối được — thiếu DATABASE_URL?' });
    }

    try {
      const userId = getQuizUserId(req);
      if (!userId) {
        client.release();
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, subject, grade, duration, questions, description } = req.body || {};
      if (!title || !Array.isArray(questions) || !questions.length) {
        client.release();
        return res.status(400).json({ error: 'title + questions[] required' });
      }

      await client.query('BEGIN');
      const examId = quizUUID();
      const now = new Date();

      const examDescription = JSON.stringify({
        subject: subject || 'Vật lí',
        grade: grade || '11',
        source: 'wayground',
        notes: description || '',
      });

      await client.query(
        `INSERT INTO "Exam"
           (id, title, description, "examType", duration, "totalScore",
            "totalQuestions", status, "userId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,'Trắc nghiệm',$4,$5,$6,'Nháp',$7,$8,$8)`,
        [examId, title, examDescription, Number(duration) || 45,
         questions.length, questions.length, userId, now]
      );

      // Insert từng Question + ExamQuestion (order = idx + 1)
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qid = quizUUID();
        await client.query(
          `INSERT INTO "Question"
             (id, topic, subject, grade, "questionType", difficulty, content,
              options, "correctAnswer", explanation, "qualityScore", "usageCount",
              "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,'medium',$6,$7,$8,$9,0,0,true,true,'active',$10,$11,$11)`,
          [
            qid,
            // Topic: dùng từ AI extract nếu có, fallback subject. KHÔNG lưu
            // 'wayground-import' để không xuất hiện trong "Chủ đề cần ôn tập".
            (q.topic && String(q.topic).trim()) || subject || 'Vật lí',
            subject || 'Vật lí',
            String(grade || '11'),
            String(q.questionType || 'MULTIPLE_CHOICE'),
            String(q.content || ''),
            // Question.options là String[] (Postgres TEXT[]) — pg driver tự convert
            // JS array → Postgres array literal {…}. KHÔNG stringify (sẽ ra
            // chuỗi JSON `["A.","B."]` mà Postgres báo "malformed array literal").
            Array.isArray(q.options) ? q.options.map(String) : [],
            String(q.correctAnswer || ''),
            q.explanation || '',  // Question.explanation NOT NULL trong schema
            userId,
            now,
          ]
        );
        await client.query(
          `INSERT INTO "ExamQuestion" (id, "examId", "questionId", "order", points)
           VALUES ($1,$2,$3,$4,1)`,
          [quizUUID(), examId, qid, i + 1]
        );
      }

      await client.query('COMMIT');
      console.log(`[quiz-publish] ✅ exam=${examId} questions=${questions.length} user=${userId}`);
      return res.status(201).json({ success: true, examId });
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch {}
      console.error('[quiz-publish] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      client.release();
    }
  });

  // ── POST /api/teacher/question-bank/import-latex ──────────
  // Import LaTeX template → strip + extract via fal.ai → INSERT từng câu
  // vào Question table (status='Hoạt động', humanReviewed=true vì source
  // là teacher upload, không phải AI tự sinh).
  // Body: { content, subject, grade, topic? }
  app.post('/api/teacher/question-bank/import-latex', async (req, res) => {
    const t0 = Date.now();
    try {
      const userId = getQuizUserId(req);
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      const pool = getQPool();
      if (!pool) return res.status(503).json({ success: false, error: 'DB không khả dụng' });

      const content = String(req.body?.content || '').trim();
      const subject = String(req.body?.subject || 'Vật lí').trim();
      const grade = String(req.body?.grade || '11').trim();
      const topic = req.body?.topic ? String(req.body.topic).trim() : null;
      if (content.length < 50) return res.status(400).json({ success: false, error: 'LaTeX content quá ngắn' });
      if (content.length > 200_000) return res.status(413).json({ success: false, error: 'LaTeX quá lớn (>200KB)' });

      // Strip LaTeX commands phổ biến để text sạch hơn cho AI parse
      const stripped = content
        .replace(/\\documentclass[^\n]*\n/g, '')
        .replace(/\\usepackage[^\n]*\n/g, '')
        .replace(/\\begin\{document\}|\\end\{document\}/g, '')
        .replace(/\\geometry\{[^}]*\}/g, '')
        .replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '')
        .replace(/\\begin\{center\}|\\end\{center\}/g, '')
        .replace(/\\begin\{minipage\}[^\n]*|\\end\{minipage\}/g, '')
        .replace(/\\begin\{enumerate\}[^\n]*|\\end\{enumerate\}/g, '')
        .replace(/\\textbf\{([^}]*)\}/g, '$1')
        .replace(/\\textit\{([^}]*)\}/g, '$1')
        .replace(/\\section\*?\{([^}]*)\}/g, '\n\n=== $1 ===\n')
        .replace(/\\hfill|\\\\|\\noindent|\\vspace\{[^}]*\}/g, '\n')
        .replace(/\\rule\{[^}]*\}\{[^}]*\}/g, '')
        .replace(/\\framebox\[[^\]]*\]\[[^\]]*\]\{([^}]*)\}/g, '$1')
        .trim();

      const { extractQuestionsFromText } = require('./lib/fal-quiz-extractor.cjs');
      console.log(`[bank-import] ⏳ user=${userId.slice(0,8)} subject=${subject} grade=${grade} chars=${stripped.length}`);
      const result = await extractQuestionsFromText(stripped, {
        subject, grade, language: 'Vietnamese', count: 50,
      });
      const questions = result.questions || [];
      if (questions.length === 0) {
        return res.status(422).json({ success: false, error: 'Không trích xuất được câu hỏi nào' });
      }

      // INSERT vào Question table
      const { randomUUID: bUUID } = require('crypto');
      const now = new Date();
      let inserted = 0, skipped = 0;
      for (const q of questions) {
        try {
          const qid = bUUID();
          await pool.query(
            `INSERT INTO "Question"
               (id, topic, subject, grade, "questionType", difficulty, content,
                options, "correctAnswer", explanation, "qualityScore", "usageCount",
                "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,'medium',$6,$7,$8,$9,0,0,false,true,'Hoạt động',$10,$11,$11)`,
            [
              qid,
              (q.topic && String(q.topic).trim()) || topic || subject,
              subject, grade,
              String(q.questionType || 'MULTIPLE_CHOICE'),
              String(q.content || ''),
              Array.isArray(q.options) ? q.options.map(String) : [],
              String(q.correctAnswer || ''),
              q.explanation || '',
              userId, now,
            ]
          );
          inserted++;
        } catch (insErr) {
          console.warn(`[bank-import] insert skip: ${insErr.message.slice(0, 100)}`);
          skipped++;
        }
      }
      console.log(`[bank-import] ✅ user=${userId.slice(0,8)} inserted=${inserted} skipped=${skipped} took=${Date.now()-t0}ms`);
      return res.json({
        success: true,
        data: { inserted, skipped, total: questions.length, subject, grade, topic },
      });
    } catch (err) {
      console.error('[bank-import] ❌', err.message.slice(0, 300));
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// BUILT-IN PAYMENT (bank transfer + Telegram notification)
//
// Endpoints:
//   GET  /api/payment/plans              → danh sách gói
//   GET  /api/payment/bank               → thông tin tài khoản nhận
//   POST /api/payment/orders             → tạo order { planId, userId?, userEmail?, userName? }
//   GET  /api/payment/orders/:id         → poll status
//   POST /api/payment/orders/:id/notify  → user click "đã chuyển khoản" → ping admin Telegram
//   POST /api/telegram/webhook           → callback từ Telegram (Approve/Reject)
//
// ENV:
//   TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_CHAT_ID (optional, auto-bind via /start),
//   PAYMENT_BANK_NAME, PAYMENT_BANK_NAME_FULL, PAYMENT_ACCOUNT_NUMBER, PAYMENT_ACCOUNT_HOLDER
// ══════════════════════════════════════════════════════════════
{
  const tg = require('./lib/telegram-bot.cjs');
  const orders = require('./lib/payment-orders.cjs');
  const entitlements = require('./lib/entitlements.cjs');
  const emailSender = require('./lib/email-sender.cjs');
  const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

  // Callback từ admin (cả polling lẫn webhook đều dùng chung handler này)
  // Khi PAID: sinh activation code + gửi email cho user + ack qua Telegram.
  async function onAdminCallback({ action, orderId, fromChatId, messageId }) {
    if (!orderId || !['approve','reject'].includes(action)) return;
    const order = await orders.getOrder(orderId);
    if (!order) {
      console.warn('[payment] callback: order not found', orderId);
      return;
    }
    const newStatus = action === 'approve' ? 'PAID' : 'REJECTED';
    const updated = await orders.setStatus(orderId, newStatus);
    await tg.markOrderHandled(fromChatId, messageId, action, updated);
    console.log(`[payment] order=${orderId} → ${newStatus} via Telegram`);

    if (newStatus !== 'PAID') return;
    try {
      const code = await entitlements.generateActivationCode(updated);
      console.log(`[payment] code generated for order=${orderId} → ${code.code}`);
      if (updated.userEmail) {
        const result = await emailSender.sendActivationEmail({
          to: updated.userEmail,
          code: code.code,
          planName: updated.planName,
          features: code.features.map(f => entitlements.FEATURES[f] || f),
          durationDays: code.durationDays,
          baseUrl: PUBLIC_URL,
        });
        console.log(`[payment] activation email → ${updated.userEmail} via ${result.provider}`);
      }
      // Forward code qua Telegram cho admin (phòng email lỗi)
      try {
        await tg.tgCall('sendMessage', {
          chat_id: fromChatId,
          text: `🔑 Mã kích hoạt cho order <code>${updated.id}</code>:\n` +
                `<b>${code.code}</b>\n\n` +
                `Email: ${updated.userEmail || '(không có)'}\n` +
                `Hiệu lực ${code.durationDays} ngày`,
          parse_mode: 'HTML',
        });
      } catch {}
    } catch (e) {
      console.error('[payment] generate/email code FAILED:', e.message);
    }
  }

  // Helper: lấy userKey từ JWT Bearer (dùng EJWT_SECRET đã decl bên trên).
  function getUserKey(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const decoded = require('jsonwebtoken').verify(auth.slice(7),
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!');
      return decoded.sub || decoded.userId || decoded.email || null;
    } catch { return null; }
  }

  /**
   * Async helper: kiểm tra user có quyền dùng feature không.
   *   Trả về { ok: true } nếu đã có entitlement
   *   Hoặc { ok: false, status, body } nếu thiếu → caller dùng res.status(status).json(body)
   *
   * Bypass cho:
   *   - role = ADMIN
   *   - role = TEACHER với feature thuộc list teacher (cho phép GV test)
   *   - DEV mode (NODE_ENV !== 'production')  ← chỉ khi env DISABLE_GATING=1
   */
  async function checkEntitlement(req, feature) {
    const p = getJwtPayload(req);
    if (!p) return { ok: false, status: 401, body: { error: 'Unauthorized — đăng nhập trước khi dùng AI' } };
    // Admin bypass
    if (p.role === 'ADMIN') return { ok: true, bypass: 'admin' };
    // Dev bypass flag — bật bằng env nếu muốn test không cần subscribe
    if (process.env.DISABLE_GATING === '1') return { ok: true, bypass: 'dev' };

    const userKey = p.sub || p.email;
    if (!userKey) return { ok: false, status: 401, body: { error: 'Unauthorized' } };

    try {
      const ok = await entitlements.hasFeature(userKey, feature);
      if (ok) return { ok: true };
      return {
        ok: false,
        status: 402,   // Payment Required
        body: {
          error: 'subscription_required',
          message: `Tính năng "${entitlements.FEATURES[feature] || feature}" yêu cầu gói trả phí`,
          feature,
          upgradeUrl: '/payment',
        },
      };
    } catch (e) {
      console.warn('[checkEntitlement] DB error:', e.message);
      // Fail-open chỉ khi NEON quota — không khoá user nếu hệ thống lỗi
      const msg = (e.message || '').toLowerCase();
      if (msg.includes('quota') || msg.includes('connection')) {
        return { ok: true, bypass: 'db-degraded' };
      }
      return { ok: false, status: 500, body: { error: 'check_failed', message: e.message } };
    }
  }

  // Long polling worker (chỉ cần khi không setWebhook)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_USE_WEBHOOK !== 'true') {
    tg.startPolling({ onCallback: onAdminCallback });
  }

  app.get('/api/payment/plans', (_req, res) => {
    res.json({ plans: orders.PLANS });
  });

  app.get('/api/payment/bank', (_req, res) => {
    res.json(orders.getBankInfo());
  });

  app.post('/api/payment/orders', async (req, res) => {
    try {
      const { planId, userId, userEmail, userName, metadata } = req.body || {};
      if (!planId) return res.status(400).json({ error: 'planId required' });
      const order = await orders.createOrder({ planId, userId, userEmail, userName, metadata });
      const bank = orders.getBankInfo();
      const qrUrl = orders.buildQrUrl({
        bankCode: bank.bankCode,
        accountNo: bank.accountNo,
        accountName: bank.accountName,
        amount: order.amount,
        code: order.transferCode,
      });
      console.log(`[payment] created order=${order.id} plan=${planId} amount=${order.amount}`);
      res.status(201).json({ order, bank, qrUrl });
    } catch (err) {
      console.error('[payment:create] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/payment/orders/:id', async (req, res) => {
    const o = await orders.getOrder(req.params.id);
    if (!o) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: o });
  });

  app.post('/api/payment/orders/:id/notify', async (req, res) => {
    try {
      const order = await orders.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'PENDING') {
        return res.status(409).json({ error: 'Order already in status: ' + order.status });
      }
      // Send Telegram FIRST — chỉ đổi status nếu thành công, để tránh user
      // nghĩ "đã thông báo cho admin" nhưng thực ra notify failed.
      const tgRes = await tg.sendOrderNotification(order);
      const updated = await orders.setStatus(order.id, 'AWAITING_REVIEW', {
        tgChatId: tgRes.chatId, tgMessageId: tgRes.messageId,
      });
      console.log(`[payment] order=${order.id} → AWAITING_REVIEW (tg msg ${tgRes.messageId})`);
      res.json({ ok: true, status: 'AWAITING_REVIEW', order: updated });
    } catch (err) {
      console.error('[payment:notify] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Entitlements ──────────────────────────────────────────
  app.get('/api/entitlements/plan-features', (_req, res) => {
    res.json({
      features: entitlements.FEATURES,
      planFeatures: entitlements.PLAN_FEATURES,
    });
  });

  app.get('/api/entitlements/me', async (req, res) => {
    const userKey = getUserKey(req);
    if (!userKey) return res.status(401).json({ error: 'Unauthorized' });
    const list = await entitlements.listEntitlements(userKey);
    res.json({ userKey, entitlements: list });
  });

  app.post('/api/entitlements/activate', async (req, res) => {
    try {
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ error: 'code required' });
      const userKey = getUserKey(req);
      if (!userKey) return res.status(401).json({ error: 'Đăng nhập trước khi kích hoạt' });
      const result = await entitlements.activateCode(String(code).trim().toUpperCase(), userKey);
      console.log(`[entitlements] user=${userKey} activated ${result.code} → ${result.features.join(',')}`);
      // Invalidate auth/me cache + entitlements:me cache (nếu có)
      try {
        const cache = require('./lib/cache.cjs');
        cache.del(`auth:me:${userKey}`);
        cache.del(`entitlements:${userKey}`);
      } catch {}
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ─── Admin Payment Dashboard ───────────────────────────────
  // Tất cả endpoint dưới đây yêu cầu JWT role = ADMIN.
  function getJwtPayload(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const jwt = require('jsonwebtoken');
      return jwt.verify(auth.slice(7),
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!');
    } catch { return null; }
  }

  function requireAdmin(req, res) {
    const p = getJwtPayload(req);
    if (!p) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    if (p.role !== 'ADMIN') { res.status(403).json({ error: 'Cần quyền admin' }); return null; }
    return p;
  }

  // GET /api/admin/payments/list?status=&search=&limit=&offset=
  app.get('/api/admin/payments/list', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const list = await orders.listOrders({
        status: req.query.status || null,
        search: req.query.search || '',
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      res.json({ orders: list });
    } catch (err) {
      console.error('[admin:payments:list] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/payments/stats — revenue + counts + breakdown by plan
  app.get('/api/admin/payments/stats', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const cache = require('./lib/cache.cjs');
      // Cache 60s — stats không cần realtime, giảm load cho admin polling
      const result = await cache.getOrFetch('admin:payments:stats', 60, async () => {
        return {
          ...(await orders.getStats()),
          countByStatus: await orders.countByStatus(),
          updatedAt: new Date().toISOString(),
        };
      });
      res.json(result);
    } catch (err) {
      console.error('[admin:payments:stats] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/admin/payments/:id/approve — admin xác nhận đã nhận tiền
  // → status = PAID + sinh activation code + gửi email cho user
  app.post('/api/admin/payments/:id/approve', async (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    try {
      const order = await orders.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'PAID') return res.json({ ok: true, order, note: 'already paid' });

      const updated = await orders.setStatus(req.params.id, 'PAID');
      const code = await entitlements.generateActivationCode(updated);

      // Invalidate caches
      try {
        const cache = require('./lib/cache.cjs');
        cache.del('admin:payments:stats');
        cache.del('admin:notifications');
        if (order.userId) cache.del(`auth:me:${order.userId}`);
      } catch {}

      // Gửi email activation cho user (cùng pattern Telegram approve)
      try {
        if (updated.userEmail) {
          await emailSender.sendActivationEmail({
            to: updated.userEmail,
            code: code.code,
            planName: updated.planName,
            features: code.features.map(f => entitlements.FEATURES[f] || f),
            durationDays: code.durationDays,
            baseUrl: PUBLIC_URL,
          });
          console.log(`[admin:approve] activation email → ${updated.userEmail}`);
        }
      } catch (e) {
        console.warn('[admin:approve] email send failed (non-fatal):', e.message);
      }
      console.log(`[admin:payments] approved by ${admin.email} → order=${req.params.id} code=${code.code}`);
      res.json({ ok: true, order: updated, code: code.code });
    } catch (err) {
      console.error('[admin:payments:approve] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/admin/payments/:id/reject — admin từ chối, không sinh code
  app.post('/api/admin/payments/:id/reject', async (req, res) => {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    try {
      const order = await orders.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const updated = await orders.setStatus(req.params.id, 'REJECTED');
      try {
        const cache = require('./lib/cache.cjs');
        cache.del('admin:payments:stats');
        cache.del('admin:notifications');
      } catch {}
      console.log(`[admin:payments] rejected by ${admin.email} → order=${req.params.id}`);
      res.json({ ok: true, order: updated });
    } catch (err) {
      console.error('[admin:payments:reject] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/notifications — pending count + recent activity cho header badge
  app.get('/api/admin/notifications', async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const cache = require('./lib/cache.cjs');
      // Cache 30s — admin sidebar poll mỗi 60s nên không bị stale
      const result = await cache.getOrFetch('admin:notifications', 30, async () => {
        const counts = await orders.countByStatus();
        const pendingOrders = await orders.listOrders({
          status: 'AWAITING_REVIEW', limit: 5,
        });
        return {
          pendingPaymentCount: counts.AWAITING_REVIEW || 0,
          counts,
          pendingOrders,
          updatedAt: new Date().toISOString(),
        };
      });
      res.json(result);
    } catch (err) {
      console.error('[admin:notifications] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Webhook entry (Telegram → server). Chỉ dùng nếu set TELEGRAM_USE_WEBHOOK=true
  // và setWebhook đã trỏ về URL này. Header X-Telegram-Bot-Api-Secret-Token được
  // verify nếu TELEGRAM_WEBHOOK_SECRET có set.
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
      if (secret) {
        const got = req.headers['x-telegram-bot-api-secret-token'];
        if (got !== secret) return res.status(401).json({ error: 'bad secret' });
      }
      await tg.handleUpdate(req.body, { onCallback: onAdminCallback });
      res.json({ ok: true });
    } catch (err) {
      console.error('[telegram:webhook] ❌', err.message);
      res.status(500).json({ error: err.message });
    }
  });
}

// Stub specific endpoints TRƯỚC proxy /api/teacher/* — express match theo
// thứ tự đăng ký, không add ở đây thì proxy sẽ catch trước → 503.
app.get('/api/teacher/students', (_req, res) => res.json({ students: [] }));
app.get('/api/teacher/students/:id', (req, res) => res.json({ id: req.params.id, name: '—', email: '—' }));

// ── BUG FIX deploy 200/207: routing collision với teacher-service proxy ──
// Các endpoint /api/teacher/* được đăng ký Ở DƯỚI line 2016 sẽ bị proxy chặn
// trước → 503 (vì pixiai-teacher backend không tồn tại trên prod).
// Cập nhật mỗi khi thêm endpoint /api/teacher/* mới ở phần sau của file.
//
// Endpoints (xếp theo registration line) cần SKIP proxy → forward Express:
const _TEACHER_LOCAL_PREFIXES = [
  '/api/teacher-student-link/',  // line ~5005 (TSL feature)
  '/api/teacher/my-students',    // line 5283  (TSL my-students)
  '/api/teacher/students',       // line 9513  (stubs)
  '/api/teacher/gradebook',      // line 10076 (TT58 gradebook GET+POST)
  '/api/teacher/news',           // line 10426 (news compose)
  '/api/teacher/analytics',      // teacher analytics aggregate (real student data)
  '/api/teacher/roster',         // teacher full roster (ClassStudent + TSL approved)
  '/api/teacher/learning-paths', // teacher learning path builder (per-student)
  '/api/teacher/lesson-plans',   // teacher lesson plan editor (Google Docs-like + LaTeX)
];

app.use(makeProxy(TEACHER_SERVICE_URL, 'teacher-service', (pathname) => {
  // Skip proxy cho các endpoint local đã liệt kê trên (Express tìm handler bên dưới)
  for (const prefix of _TEACHER_LOCAL_PREFIXES) {
    if (pathname.startsWith(prefix)) return false;
  }
  // Mọi /api/teacher/* khác (exams, leaderboard, ...) → proxy bình thường
  return pathname.startsWith('/api/teacher');
}));

// ══════════════════════════════════════════════════════════════
// BUILT-IN INSTRUCTOR COURSE MANAGEMENT
// Handles: GET /api/instructor/courses
//          GET /api/instructor/courses/:id
//          DELETE /api/instructor/courses/:id
//          PATCH /api/instructor/courses/:id/publish
//          GET /api/categories
// Requires: DATABASE_URL + JWT_SECRET (same secrets as auth)
// ══════════════════════════════════════════════════════════════
{
  console.log('[instructor] Built-in Node.js instructor-course handlers active');

  const { Pool: IPool } = require('pg');
  const ijwt = require('jsonwebtoken');

  let _ipool = null;
  function getIPool() {
    if (!_ipool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _ipool = new IPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _ipool;
  }

  const IJWT_SECRET = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  // Extract userId from Bearer token (returns null if invalid)
  function getUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const decoded = ijwt.verify(auth.slice(7), IJWT_SECRET);
      return decoded.sub || decoded.userId || null;
    } catch {
      return null;
    }
  }

  // ── LMS standard column migration (chuẩn elearniv ref) ────
  // Mở rộng Course table với các cột: slug, before_price, lessons, duration,
  // access_time + 3 cột nội dung dài (requirements, what_you_will_learn,
  // who_is_this_course_for). Lazy ALTER lần đầu request.
  let _courseColsReady = false;
  async function ensureCourseColumns() {
    if (_courseColsReady) return;
    const pool = getIPool();
    if (!pool) return;
    const adds = [
      ['slug',                'TEXT'],
      ['before_price',        'NUMERIC'],
      ['lessons_count',       'INTEGER'],
      ['duration_text',       'TEXT'],
      ['access_time',         'TEXT'],
      ['requirements',        'TEXT'],
      ['what_you_will_learn', 'TEXT'],
      ['who_is_this_course_for', 'TEXT'],
    ];
    for (const [col, kind] of adds) {
      try { await pool.query(`ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "${col}" ${kind}`); }
      catch (e) { console.warn(`[course] migrate ${col}:`, e.message); }
    }
    try { await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Course_slug_uq" ON "Course"(slug)`); } catch {}
    _courseColsReady = true;
  }
  function slugifyTitle(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'khoa-hoc'
  }
  async function uniqueSlug(pool, base) {
    let s = base;
    for (let i = 0; i < 5; i++) {
      const r = await pool.query(`SELECT 1 FROM "Course" WHERE slug=$1 LIMIT 1`, [s]);
      if (!r.rows.length) return s;
      s = `${base}-${Math.floor(Math.random() * 900) + 100}`;
    }
    return s;
  }

  // Map DB Course row → InstructorCourse shape expected by frontend
  function mapCourse(row, category, enrollments, chapters) {
    const computedLessons = (chapters || []).filter(c => c.ispublished).length;
    return {
      id:                 row.id,
      userId:             row.userId,
      title:              row.title,
      slug:               row.slug || row.id,                        // dùng slug nếu có, fallback id
      overview:           row.description || null,
      image:              row.imageUrl || null,
      regularPrice:       parseFloat(row.price) || 0,
      beforePrice:        parseFloat(row.before_price) || 0,         // ✅ now persisted
      lessons:            row.lessons_count != null
                            ? Number(row.lessons_count)
                            : computedLessons,                       // fallback computed
      duration:           row.duration_text || null,                 // ✅ now persisted
      accessTime:         row.access_time || null,                   // ✅ now persisted
      requirements:       row.requirements || null,                  // ✅ now persisted
      whatYouWillLearn:   row.what_you_will_learn || null,           // ✅ now persisted
      whoIsThisCourseFor: row.who_is_this_course_for || null,        // ✅ now persisted
      isPublished:        row.isPublished,
      categoryId:         row.categoryId || null,
      category:           category || null,
      enrollments:        (enrollments || []).map(e => ({ id: e.id })),
      videos:             [],
      assets:             [],
      user:               { id: row.userId, name: row.userName || null, image: row.userImage || null },
      createdAt:          row.createdAt,
      updatedAt:          row.updatedAt,
    };
  }

  // ── GET /api/instructor/courses ────────────────────────────
  app.get('/api/instructor/courses', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const pool = getIPool();
      await ensureCourseColumns();
      const { rows: courses } = await pool.query(
        `SELECT c.*, u.name AS "userName", u.image AS "userImage",
                cat.id AS "catId", cat.name AS "catName"
         FROM "Course" c
         LEFT JOIN "User" u ON u.id = c."userId"
         LEFT JOIN "Category" cat ON cat.id = c."categoryId"
         WHERE c."userId" = $1
         ORDER BY c."createdAt" DESC`,
        [userId]
      );

      if (courses.length === 0) return res.json([]);

      // Batch-load chapters and purchases for all courses
      const courseIds = courses.map(c => c.id);
      const [chapRows, purchRows] = await Promise.all([
        pool.query(
          `SELECT id, "courseId", "isPublished" AS ispublished
           FROM "Chapter" WHERE "courseId" = ANY($1)`,
          [courseIds]
        ),
        pool.query(
          `SELECT id, "courseId" FROM "Purchase" WHERE "courseId" = ANY($1)`,
          [courseIds]
        ),
      ]);

      const chapsByCourse = {};
      for (const ch of chapRows.rows) {
        (chapsByCourse[ch.courseId] = chapsByCourse[ch.courseId] || []).push(ch);
      }
      const purchByCourse = {};
      for (const p of purchRows.rows) {
        (purchByCourse[p.courseId] = purchByCourse[p.courseId] || []).push(p);
      }

      const result = courses.map(row => {
        const category = row.catId ? { id: row.catId, name: row.catName } : null;
        return mapCourse(row, category, purchByCourse[row.id] || [], chapsByCourse[row.id] || []);
      });

      console.log(`[instructor:courses] ✅ ${result.length} courses for user ${userId}`);
      return res.json(result);
    } catch (err) {
      console.error('[instructor:courses] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/instructor/courses/:id ───────────────────────
  app.get('/api/instructor/courses/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const pool = getIPool();
      await ensureCourseColumns();
      const { rows } = await pool.query(
        `SELECT c.*, u.name AS "userName", u.image AS "userImage",
                cat.id AS "catId", cat.name AS "catName"
         FROM "Course" c
         LEFT JOIN "User" u ON u.id = c."userId"
         LEFT JOIN "Category" cat ON cat.id = c."categoryId"
         WHERE c.id = $1 AND c."userId" = $2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy khoá học' });

      const row = rows[0];
      const [chapRows, purchRows] = await Promise.all([
        pool.query(`SELECT id, "isPublished" AS ispublished FROM "Chapter" WHERE "courseId" = $1`, [row.id]),
        pool.query(`SELECT id FROM "Purchase" WHERE "courseId" = $1`, [row.id]),
      ]);
      const category = row.catId ? { id: row.catId, name: row.catName } : null;
      return res.json(mapCourse(row, category, purchRows.rows, chapRows.rows));
    } catch (err) {
      console.error('[instructor:course-get] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/instructor/courses/:id ────────────────────
  app.delete('/api/instructor/courses/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const pool = getIPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "Course" WHERE id=$1 AND "userId"=$2`,
        [req.params.id, userId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy khoá học' });

      console.log(`[instructor:delete] ✅ Course ${req.params.id}`);
      return res.json({ success: true });
    } catch (err) {
      console.error('[instructor:delete] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /api/instructor/courses/:id/publish ─────────────
  app.patch('/api/instructor/courses/:id/publish', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { isPublished } = req.body || {};
      const pool = getIPool();
      const { rows } = await pool.query(
        `UPDATE "Course" SET "isPublished"=$1, "updatedAt"=NOW()
         WHERE id=$2 AND "userId"=$3 RETURNING *`,
        [Boolean(isPublished), req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy khoá học' });

      console.log(`[instructor:publish] ✅ Course ${req.params.id} → isPublished=${isPublished}`);
      return res.json({ success: true, isPublished: rows[0].isPublished });
    } catch (err) {
      console.error('[instructor:publish] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/categories ───────────────────────────────────
  app.get('/api/categories', async (req, res) => {
    try {
      const pool = getIPool();
      const { rows } = await pool.query(`SELECT id, name FROM "Category" ORDER BY name`);
      return res.json(rows);
    } catch (err) {
      console.error('[categories:list] ❌', err.message);
      // Fallback empty array — UI dropdown vẫn render (chưa setup Category table)
      return res.json([]);
    }
  });

  // ── POST /api/instructor/courses ──────────────────────────
  // Tạo course mới. Required: title. Tất cả field LMS chuẩn elearniv:
  //   { title, categoryId, regularPrice, beforePrice, lessons, duration,
  //     accessTime, image, overview, requirements, whatYouWillLearn,
  //     whoIsThisCourseFor }
  // FE gửi nhiều shape: { title, regularPrice, image, overview, ... }
  // Tự auto-generate slug + ensure unique.
  app.post('/api/instructor/courses', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getIPool();
      // Tự auto-create Course table nếu chưa có
      try {
        await pool.query(`CREATE TABLE IF NOT EXISTS "Course" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          "imageUrl" TEXT,
          price NUMERIC,
          "categoryId" TEXT,
          "isPublished" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`);
      } catch {}
      await ensureCourseColumns();

      const b = req.body || {};
      const title = String(b.title || '').trim();
      if (!title) return res.status(400).json({ error: 'title required' });

      const slug = await uniqueSlug(pool, slugifyTitle(title));
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const now = new Date();
      // Accept cả shape Next.js (overview) lẫn shape mới (description)
      const overview = b.overview || b.description || null;
      const image    = b.image    || b.imageUrl    || null;
      const regular  = b.regularPrice != null ? Number(b.regularPrice) : (b.price != null ? Number(b.price) : null);
      const before   = b.beforePrice  != null ? Number(b.beforePrice)  : null;

      await pool.query(
        `INSERT INTO "Course"
           (id, "userId", title, slug, description, "imageUrl", price, before_price,
            lessons_count, duration_text, access_time, "categoryId",
            requirements, what_you_will_learn, who_is_this_course_for,
            "isPublished", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,$16,$16)`,
        [id, userId, title.slice(0, 200), slug,
         overview, image, regular, before,
         b.lessons != null ? Number(b.lessons) : null,
         b.duration || null,
         b.accessTime || null,
         b.categoryId || null,
         b.requirements || null,
         b.whatYouWillLearn || null,
         b.whoIsThisCourseFor || null,
         now]
      );
      // Re-load + map để FE nhận đầy đủ shape
      const { rows } = await pool.query(
        `SELECT c.*, u.name AS "userName", u.image AS "userImage",
                cat.id AS "catId", cat.name AS "catName"
           FROM "Course" c
           LEFT JOIN "User" u ON u.id = c."userId"
           LEFT JOIN "Category" cat ON cat.id = c."categoryId"
          WHERE c.id = $1 LIMIT 1`,
        [id]
      );
      const row = rows[0];
      const cat = row.catId ? { id: row.catId, name: row.catName } : null;
      console.log(`[instructor:create] ✅ ${id.slice(0,8)} slug="${slug}" title="${title.slice(0,40)}"`);
      return res.status(201).json(mapCourse(row, cat, [], []));
    } catch (err) {
      console.error('[instructor:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /api/instructor/courses/:id ─────────────────────
  // Whitelist mở rộng cho LMS-standard fields (chuẩn elearniv).
  app.patch('/api/instructor/courses/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getIPool();
      await ensureCourseColumns();
      // Map FE field name → DB column name
      const fieldMap = {
        title:                'title',
        description:          'description',
        overview:             'description',           // alias
        imageUrl:             '"imageUrl"',
        image:                '"imageUrl"',            // alias
        price:                'price',
        regularPrice:         'price',                 // alias
        beforePrice:          'before_price',
        lessons:              'lessons_count',
        duration:             'duration_text',
        accessTime:           'access_time',
        categoryId:           '"categoryId"',
        requirements:         'requirements',
        whatYouWillLearn:     'what_you_will_learn',
        whoIsThisCourseFor:   'who_is_this_course_for',
      };
      const sets = []; const vals = [req.params.id, userId]; let i = 3;
      for (const [feKey, dbCol] of Object.entries(fieldMap)) {
        if (req.body && req.body[feKey] !== undefined) {
          // Avoid duplicate set when both `image` and `imageUrl` are provided
          if (sets.some(s => s.startsWith(dbCol + ' '))) continue;
          sets.push(`${dbCol} = $${i++}`);
          let v = req.body[feKey];
          if (feKey === 'price' || feKey === 'regularPrice' || feKey === 'beforePrice') {
            v = v === '' || v == null ? null : Number(v);
          } else if (feKey === 'lessons') {
            v = v === '' || v == null ? null : Number(v);
          }
          vals.push(v);
        }
      }
      // Slug auto-update khi đổi title
      if (req.body?.title) {
        const newSlug = await uniqueSlug(pool, slugifyTitle(req.body.title));
        sets.push(`slug = $${i++}`); vals.push(newSlug);
      }
      if (!sets.length) return res.status(400).json({ error: 'No fields' });
      sets.push(`"updatedAt" = $${i++}`); vals.push(new Date());
      const { rowCount } = await pool.query(
        `UPDATE "Course" SET ${sets.join(', ')} WHERE id=$1 AND "userId"=$2`, vals
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true, updated: sets.length - 1 });
    } catch (err) {
      console.error('[instructor:update] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Stubs cho videos + assets endpoints (chưa implement full) ──
  const _501 = (msg) => (_req, res) => res.status(501).json({ error: msg });
  const _ok  = (_req, res) => res.json({ ok: true });
  app.get('/api/instructor/courses/:id/assets', (_req, res) => res.json([]));
  app.post('/api/instructor/courses/:id/assets', _501('Upload assets đang phát triển'));
  app.delete('/api/instructor/courses/:id/assets/:assetId', _ok);

  // ════════════════════════════════════════════════════════════════
  // VIDEO MANAGEMENT — URL paste (YouTube/Vimeo/MP4) + GCS upload
  // ────────────────────────────────────────────────────────────────
  // Backed by table "CourseVideo" + GCS bucket aeroedu-media-* (asia-southeast1).
  // Public read bucket → URL trực tiếp playback không cần auth FE.
  // ════════════════════════════════════════════════════════════════
  {
    const { Pool: VPool } = require('pg');
    const vJwt = require('jsonwebtoken');
    let _vPool = null;
    function getVPool() {
      if (!_vPool && process.env.DATABASE_URL) {
        _vPool = new VPool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
      }
      return _vPool;
    }
    const V_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
    function getVTeacher(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        const d = vJwt.verify(auth.slice(7), V_SECRET, { ignoreExpiration: true });
        return { id: d.sub || d.userId || d.id };
      } catch { return null; }
    }
    let _vReady = false;
    async function ensureVideoTable() {
      if (_vReady) return;
      const pool = getVPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "CourseVideo" (
          id          TEXT PRIMARY KEY,
          "courseId"  TEXT NOT NULL,
          "userId"    TEXT NOT NULL,
          title       TEXT NOT NULL,
          type        TEXT NOT NULL,
          url         TEXT NOT NULL,
          "thumbUrl"  TEXT,
          duration    INTEGER,
          position    INTEGER NOT NULL DEFAULT 1,
          "isPreview" BOOLEAN NOT NULL DEFAULT false,
          "groupName" TEXT,
          "gcsPath"   TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS "CourseVideo_course_idx"
        ON "CourseVideo"("courseId", position ASC)`);
      _vReady = true;
    }

    // Detect video type từ URL
    function detectVideoType(url) {
      const u = String(url || '').trim();
      if (/youtube\.com\/watch|youtu\.be\//i.test(u))       return 'youtube';
      if (/vimeo\.com\//i.test(u))                          return 'vimeo';
      if (/storage\.googleapis\.com.*aeroedu-media/i.test(u)) return 'gcs';
      if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u))             return 'mp4';
      return 'unknown';
    }

    const GCS_BUCKET = process.env.GCS_BUCKET_MEDIA || 'aeroedu-media-extreme-lattice-491123-p2';

    // ── GET /api/instructor/courses/:id/videos ──
    app.get('/api/instructor/courses/:id/videos', async (req, res) => {
      try {
        const tid = getVTeacher(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getVPool();
        if (!pool) return res.json([]);
        await ensureVideoTable();
        // Verify course ownership
        const own = await pool.query(`SELECT 1 FROM "Course" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
          [req.params.id, tid]);
        if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy khoá học' });
        const { rows } = await pool.query(
          `SELECT * FROM "CourseVideo" WHERE "courseId"=$1 ORDER BY position ASC, "createdAt" ASC`,
          [req.params.id]
        );
        return res.json(rows);
      } catch (err) {
        console.error('[videos:list]', err.message);
        return res.json([]);
      }
    });

    // ── POST /api/instructor/courses/:id/videos ── add video bằng URL
    // Body: { title, url, type?, thumbUrl?, duration?, isPreview?, groupName? }
    app.post('/api/instructor/courses/:id/videos', express.json({ limit: '4kb' }), async (req, res) => {
      try {
        const tid = getVTeacher(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getVPool();
        if (!pool) return res.status(503).json({ error: 'DB unavailable' });
        await ensureVideoTable();
        const own = await pool.query(`SELECT 1 FROM "Course" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
          [req.params.id, tid]);
        if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy khoá học' });

        const b = req.body || {};
        const title = String(b.title || '').trim();
        // Accept cả 'url' (mới) và 'videoUrl' (legacy FE) — backward compat
        const url = String(b.url || b.videoUrl || '').trim();
        if (!title) return res.status(400).json({ error: 'Thiếu title' });
        if (!url)   return res.status(400).json({ error: 'Thiếu URL video' });
        const type = b.type || detectVideoType(url);
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        // Auto-position cuối list
        const pRes = await pool.query(`SELECT COALESCE(MAX(position),0)+1 AS p FROM "CourseVideo" WHERE "courseId"=$1`,
          [req.params.id]);
        const position = Number(pRes.rows[0]?.p) || 1;
        await pool.query(
          `INSERT INTO "CourseVideo"
             (id, "courseId", "userId", title, type, url, "thumbUrl", duration, position, "isPreview", "groupName", "gcsPath")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [id, req.params.id, tid,
           title.slice(0, 300), type, url.slice(0, 1000),
           b.thumbUrl ? String(b.thumbUrl).slice(0, 1000) : null,
           b.duration != null ? Number(b.duration) : null,
           position,
           !!b.isPreview,
           b.groupName ? String(b.groupName).slice(0, 200) : null,
           b.gcsPath ? String(b.gcsPath).slice(0, 500) : null]
        );
        const { rows } = await pool.query(`SELECT * FROM "CourseVideo" WHERE id=$1`, [id]);
        console.log(`[videos:create] ✅ ${id.slice(0,8)} "${title.slice(0,40)}" type=${type}`);
        return res.status(201).json(rows[0]);
      } catch (err) {
        console.error('[videos:create]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── DELETE /api/instructor/courses/:id/videos/:videoId ──
    app.delete('/api/instructor/courses/:id/videos/:videoId', async (req, res) => {
      try {
        const tid = getVTeacher(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getVPool();
        await ensureVideoTable();
        // Verify ownership + get gcsPath để cleanup
        const own = await pool.query(
          `SELECT v."gcsPath" FROM "CourseVideo" v
             JOIN "Course" c ON c.id = v."courseId"
            WHERE v.id=$1 AND v."courseId"=$2 AND c."userId"=$3 LIMIT 1`,
          [req.params.videoId, req.params.id, tid]
        );
        if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy video' });
        const gcsPath = own.rows[0].gcsPath;
        await pool.query(`DELETE FROM "CourseVideo" WHERE id=$1`, [req.params.videoId]);
        // Best-effort GCS file cleanup (không block response)
        if (gcsPath) {
          (async () => {
            try {
              const { Storage } = require('@google-cloud/storage');
              const storage = new Storage();
              await storage.bucket(GCS_BUCKET).file(gcsPath).delete();
              console.log(`[videos:delete] cleanup GCS ${gcsPath}`);
            } catch (e) { console.warn('[videos:delete] GCS cleanup fail:', e.message.slice(0, 80)); }
          })();
        }
        return res.json({ ok: true });
      } catch (err) {
        console.error('[videos:delete]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/upload/video-signed-url ──
    // Cấp signed URL TTL 15p để FE upload trực tiếp tới GCS (PUT method).
    // FE không phải gửi file qua Cloud Run → tiết kiệm bandwidth + nhanh.
    // Body: { filename, contentType, courseId }
    // Returns: { uploadUrl, publicUrl, gcsPath, expiresAt }
    app.post('/api/upload/video-signed-url', express.json({ limit: '4kb' }), async (req, res) => {
      try {
        const tid = getVTeacher(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const b = req.body || {};
        const filename    = String(b.filename || '').trim();
        const contentType = String(b.contentType || 'video/mp4').trim();
        const courseId    = String(b.courseId || '').trim();
        if (!filename || !courseId) return res.status(400).json({ error: 'Thiếu filename hoặc courseId' });
        if (!/^(video\/|application\/octet-stream)/.test(contentType)) {
          return res.status(400).json({ error: 'contentType phải là video/* (mp4, webm, mov)' });
        }
        // Verify course ownership
        const pool = getVPool();
        if (pool) {
          const own = await pool.query(`SELECT 1 FROM "Course" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
            [courseId, tid]);
          if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy khoá học' });
        }
        // GCS path: courses/{courseId}/videos/{timestamp}-{safe-filename}
        const safeFile = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
        const gcsPath = `courses/${courseId}/videos/${Date.now()}-${safeFile}`;
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage();
        const file = storage.bucket(GCS_BUCKET).file(gcsPath);
        const [uploadUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 15 * 60 * 1000,
          contentType,
        });
        const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${gcsPath}`;
        console.log(`[upload:signed-url] ✅ course=${courseId.slice(0,8)} → ${safeFile}`);
        return res.json({
          uploadUrl,
          publicUrl,
          gcsPath,
          contentType,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        });
      } catch (err) {
        console.error('[upload:signed-url]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });
  }

  // ── Upload image endpoint (avatar / course thumbnail) ─────
  // POST /api/upload/image — DEPRECATED stub (FE đã chuyển sang client-side
  // compress + data URL). Giữ stub để không vỡ extension cũ nào còn gọi.
  // Nếu cần real upload sau này → setup GCS bucket + multer.
  app.post('/api/upload/image', _501('Upload ảnh đã chuyển sang client-side data URL (xem instructor.service.ts:uploadImage). Endpoint này deprecated.'));
}

// ══════════════════════════════════════════════════════════════
// BUILT-IN QUESTION BANK — active when MEDIA_SERVICE_URL is localhost
// Handles: GET/POST /api/questions, /api/question-bank
//          POST /api/questions/batch, PUT/DELETE /api/questions/:id
// Requires: DATABASE_URL (same Neon secret used by auth)
// ══════════════════════════════════════════════════════════════
if (USE_NODEJS_QUESTIONS) {
  console.log('[questions] Built-in Node.js question-bank handlers active');

  const { Pool: QPool } = require('pg');
  const { randomUUID } = require('crypto');

  let _qpool = null;
  function getQPool() {
    if (!_qpool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _qpool = new QPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _qpool;
  }

  // ── GET /api/questions  (also /api/question-bank alias) ────
  async function handleListQuestions(req, res) {
    try {
      const pool = getQPool();
      const limit  = Math.min(parseInt(req.query.limit  || '20', 10), 200);
      const offset = parseInt(req.query.offset || '0', 10);
      const subject    = req.query.subject    || '';
      const grade      = req.query.grade      || '';
      const difficulty = req.query.difficulty || '';
      const topic      = req.query.topic      || '';
      const search     = req.query.search     || '';
      const status     = req.query.status     || '';

      const conditions = [];
      const values     = [];
      let   idx        = 1;

      if (subject)    { conditions.push(`subject = $${idx++}`);               values.push(subject); }
      if (grade)      { conditions.push(`grade = $${idx++}`);                 values.push(grade); }
      if (difficulty) { conditions.push(`difficulty = $${idx++}`);            values.push(difficulty); }
      if (topic)      { conditions.push(`topic ILIKE $${idx++}`);             values.push(`%${topic}%`); }
      if (status)     { conditions.push(`status = $${idx++}`);                values.push(status); }
      if (search)     { conditions.push(`content ILIKE $${idx++}`);           values.push(`%${search}%`); }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

      const countRes = await pool.query(`SELECT COUNT(*) FROM "Question" ${where}`, values);
      const total    = parseInt(countRes.rows[0].count, 10);

      const dataRes  = await pool.query(
        `SELECT id, topic, subject, grade, "questionType", difficulty, content,
                options, "correctAnswer", explanation, tags, status,
                "aiGenerated", "humanReviewed", "usageCount",
                "createdBy", "createdAt", "updatedAt"
         FROM "Question" ${where}
         ORDER BY "createdAt" DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      );

      return res.json({
        success: true,
        data: {
          questions:  dataRes.rows,
          pagination: { total, limit, offset, page: Math.floor(offset / limit) + 1 },
        },
      });
    } catch (err) {
      console.error('[questions:list] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── POST /api/questions  (create single) ───────────────────
  app.post('/api/questions', async (req, res) => {
    try {
      const pool = getQPool();
      const {
        content, questionType = 'MCQ', subject = 'Vật lý', grade = 'Khối 12',
        difficulty = 'MEDIUM', topic = '', explanation = '',
        options = [], correctAnswer = '',
        learningObjectives = [], keywords = [], tags = [],
        status = 'Hoạt động',
      } = req.body || {};

      if (!content) return res.status(400).json({ success: false, error: 'content is required' });

      const id  = randomUUID();
      const now = new Date();
      const allTags = [...new Set([...tags, ...(keywords || []), topic].filter(Boolean))];

      const { rows } = await pool.query(
        `INSERT INTO "Question"
           (id, topic, subject, grade, "questionType", difficulty, content, options,
            "correctAnswer", explanation, "learningObjectives", tags,
            "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt", "usageCount")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,false,$13,$14,$15,$16,0)
         RETURNING *`,
        [id, topic || subject, subject, grade, questionType, difficulty, content,
         options, correctAnswer, explanation, learningObjectives, allTags,
         status, 'teacher', now, now]
      );

      console.log(`[questions:create] ✅ ${id}`);
      return res.status(201).json({ success: true, data: { question: rows[0] } });
    } catch (err) {
      console.error('[questions:create] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── POST /api/questions/batch  (bulk import) ───────────────
  app.post('/api/questions/batch', async (req, res) => {
    try {
      const pool = getQPool();
      const { questions = [] } = req.body || {};
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, error: 'questions array required' });
      }

      const now = new Date();
      let inserted = 0;
      for (const q of questions) {
        if (!q.content) continue;
        const id = randomUUID();
        const tags = [...new Set([q.topic, q.subject, ...(q.tags || [])].filter(Boolean))];
        await pool.query(
          `INSERT INTO "Question"
             (id, topic, subject, grade, "questionType", difficulty, content, options,
              "correctAnswer", explanation, "learningObjectives", tags,
              "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt", "usageCount")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,false,$13,$14,$15,$16,0)
           ON CONFLICT (id) DO NOTHING`,
          [id, q.topic || q.subject || 'Chung', q.subject || 'Vật lý',
           q.grade || 'Khối 12', q.questionType || 'MCQ', q.difficulty || 'MEDIUM',
           q.content, q.options || [], q.correctAnswer || '', q.explanation || '',
           q.learningObjectives || [], tags, q.status || 'Hoạt động',
           'teacher', now, now]
        ).catch(() => {});
        inserted++;
      }

      console.log(`[questions:batch] ✅ ${inserted}/${questions.length} inserted`);
      return res.json({ success: true, data: { inserted, total: questions.length } });
    } catch (err) {
      console.error('[questions:batch] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── PUT /api/questions/:id  (update) ───────────────────────
  app.put('/api/questions/:id', async (req, res) => {
    try {
      const pool = getQPool();
      const { id } = req.params;
      const {
        content, questionType, subject, grade, difficulty, topic,
        explanation, options, correctAnswer, tags, status,
      } = req.body || {};

      const sets = []; const vals = []; let i = 1;
      if (content      != null) { sets.push(`content=$${i++}`);          vals.push(content); }
      if (questionType != null) { sets.push(`"questionType"=$${i++}`);   vals.push(questionType); }
      if (subject      != null) { sets.push(`subject=$${i++}`);          vals.push(subject); }
      if (grade        != null) { sets.push(`grade=$${i++}`);            vals.push(grade); }
      if (difficulty   != null) { sets.push(`difficulty=$${i++}`);       vals.push(difficulty); }
      if (topic        != null) { sets.push(`topic=$${i++}`);            vals.push(topic); }
      if (explanation  != null) { sets.push(`explanation=$${i++}`);      vals.push(explanation); }
      if (options      != null) { sets.push(`options=$${i++}`);          vals.push(options); }
      if (correctAnswer!= null) { sets.push(`"correctAnswer"=$${i++}`);  vals.push(correctAnswer); }
      if (tags         != null) { sets.push(`tags=$${i++}`);             vals.push(tags); }
      if (status       != null) { sets.push(`status=$${i++}`);           vals.push(status); }
      sets.push(`"updatedAt"=$${i++}`);
      vals.push(new Date());
      vals.push(id);

      const { rows } = await pool.query(
        `UPDATE "Question" SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals
      );
      if (!rows[0]) return res.status(404).json({ success: false, error: 'Not found' });
      return res.json({ success: true, data: { question: rows[0] } });
    } catch (err) {
      console.error('[questions:update] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── DELETE /api/questions/:id ──────────────────────────────
  app.delete('/api/questions/:id', async (req, res) => {
    try {
      const pool = getQPool();
      await pool.query(`DELETE FROM "Question" WHERE id=$1`, [req.params.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error('[questions:delete] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── GET /api/questions (& /api/question-bank alias) ────────
  app.get('/api/questions', handleListQuestions);
  app.get('/api/question-bank', handleListQuestions);

}

// ══════════════════════════════════════════════════════════════
// DIAGNOSTIC: /api/questions/_debug/distribution
// ──────────────────────────────────────────────────────────────
// Đặt NGOÀI `if (USE_NODEJS_QUESTIONS)` block → luôn hoạt động bất kể
// giá trị DIRECT_RUST_MEDIA_PROXY. Dùng để chẩn đoán lỗi "no_questions" /
// "insufficient_questions" khi student tạo đề: backend lọc exact-match
// subject+grade+status='Hoạt động', nên nếu DB có câu hỏi nhưng sai 1
// trong 3 trường trên → trả 400.
//
// Gọi: GET https://inphysic.com/api/questions/_debug/distribution
// Không yêu cầu auth (chỉ đọc metadata, không lộ nội dung câu hỏi).
// ══════════════════════════════════════════════════════════════
{
  const { Pool: DbgPool } = require('pg');
  let _dbgpool = null;
  function getDbgPool() {
    if (!_dbgpool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _dbgpool = new DbgPool({ connectionString: DATABASE_URL, max: 2,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _dbgpool;
  }

  app.get('/api/questions/_debug/distribution', async (_req, res) => {
    try {
      const pool = getDbgPool();
      const { rows } = await pool.query(`
        SELECT subject, grade, status, COUNT(*)::int AS count
          FROM "Question"
         GROUP BY subject, grade, status
         ORDER BY subject, grade, status
      `);
      const totalRes = await pool.query(`SELECT COUNT(*)::int AS total FROM "Question"`);
      const statusRes = await pool.query(`
        SELECT status, COUNT(*)::int AS count
          FROM "Question"
         GROUP BY status
         ORDER BY count DESC
      `);
      return res.json({
        success: true,
        flags: {
          USE_NODEJS_QUESTIONS,
          DIRECT_RUST_MEDIA_PROXY: process.env.DIRECT_RUST_MEDIA_PROXY || '(unset)',
        },
        data: {
          total: totalRes.rows[0].total,
          byStatus: statusRes.rows,
          bySubjectGradeStatus: rows,
          expectedFilter: "subject + grade + status='Hoạt động'",
          hint: rows.length === 0
            ? 'Bảng Question trống.'
            : (statusRes.rows.find(r => r.status === 'Hoạt động')
              ? 'Có câu hỏi với status "Hoạt động". Kiểm tra subject/grade có khớp giá trị student ExamPrep gửi không.'
              : 'Không có câu hỏi nào với status = "Hoạt động". Kiểm tra status DB thực tế (xem byStatus).'),
        },
      });
    } catch (err) {
      console.error('[questions:debug:distribution] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// AI TUTOR — /api/ai-tutor/chat (Claude via Anthropic SDK)
// Used by: aeroedu-vite/src/pages/student/AiTutor.tsx
//          aeroedu-vite/src/pages/dashboard/AiTutor.tsx
// Public deployment: inphysic.com/ai-tutor
// Requires env: ANTHROPIC_API_KEY
// Optional env: ANTHROPIC_MODEL (default: claude-opus-4-6)
// ══════════════════════════════════════════════════════════════
{
  // Lazy-load the Anthropic client so missing SDK / missing key does not
  // crash the whole server on startup. Every environment that wants AI
  // Tutor must provide ANTHROPIC_API_KEY.
  let _anthropic = null;
  let _anthropicLoadError = null;
  function getAnthropic() {
    if (_anthropic) return _anthropic;
    if (_anthropicLoadError) throw _anthropicLoadError;
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        _anthropicLoadError = new Error(
          'ANTHROPIC_API_KEY is not set — add it to .env or Cloud Run secrets'
        );
        throw _anthropicLoadError;
      }
      // SDK exposes either a default export or a named Anthropic constructor
      const Ctor = Anthropic.default || Anthropic.Anthropic || Anthropic;
      _anthropic = new Ctor({ apiKey });
      return _anthropic;
    } catch (err) {
      _anthropicLoadError = err;
      throw err;
    }
  }

  const AI_TUTOR_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';
  const AI_TUTOR_MAX_TOKENS = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1500', 10);

  // System prompt: Vietnamese science tutor for K-12 / university learners.
  // Emphasises step-by-step reasoning, LaTeX for formulae, Socratic guidance,
  // and honesty when uncertain. Tuned for the subject list in AiTutor.tsx.
  function buildSystemPrompt(subject) {
    const subj = (subject || '').trim() || 'khoa học';
    return [
      'Bạn là "Gia Sư AI" của AeroEdu / inPhysic — một trợ lý học thuật chuyên sâu',
      'dành cho học sinh và sinh viên Việt Nam, tập trung vào các môn khoa học',
      '(Toán, Vật Lý, Hóa Học, Sinh Học) cũng như các môn học phổ thông khác.',
      '',
      `Môn học trong phiên hiện tại: ${subj}.`,
      '',
      'Nguyên tắc trả lời:',
      '1. Luôn trả lời bằng tiếng Việt rõ ràng, chuẩn mực, thân thiện với người học.',
      '2. Giải thích theo từng bước (step-by-step): nêu ý tưởng → công thức → tính toán → kết luận.',
      '3. Viết công thức toán/vật lý/hoá học bằng LaTeX, bọc trong $...$ cho inline',
      '   hoặc $$...$$ cho khối, ví dụ: $v = u + at$, $$E = mc^2$$.',
      '4. Khi giải bài tập: tóm tắt đề → liệt kê dữ kiện (kèm đơn vị) → phân tích',
      '   phương pháp → lời giải chi tiết → kiểm tra lại kết quả và đơn vị.',
      '5. Khi học sinh hỏi khái niệm: đưa ra định nghĩa chính xác, ví dụ trực quan,',
      '   và một câu hỏi gợi mở để kiểm tra hiểu bài.',
      '6. Khuyến khích tư duy phản biện: nếu học sinh sai, hãy chỉ ra chỗ sai một',
      '   cách nhẹ nhàng và gợi ý cách suy nghĩ lại thay vì chỉ đưa đáp án.',
      '7. Tuyệt đối không bịa thông tin. Nếu không chắc, hãy nói rõ "Tôi không chắc"',
      '   và đề xuất nguồn kiểm chứng (SGK, tài liệu chuẩn).',
      '8. Không làm bài thay học sinh trong các kỳ thi chính thức — hỗ trợ hiểu bài',
      '   và luyện tập là chính. Nếu phát hiện câu hỏi có dấu hiệu gian lận thi cử,',
      '   hãy nhắc nhở nhẹ nhàng về tính trung thực học thuật.',
      '9. Giữ câu trả lời cô đọng — tối đa khoảng 400 từ trừ khi học sinh yêu cầu dài hơn.',
    ].join('\n');
  }

  // Normalise the history array coming from the frontend into the message
  // format expected by Anthropic's /messages API.
  function normaliseHistory(history) {
    if (!Array.isArray(history)) return [];
    const out = [];
    for (const m of history) {
      if (!m || typeof m !== 'object') continue;
      const role = m.role === 'assistant' ? 'assistant' : m.role === 'user' ? 'user' : null;
      const content = typeof m.content === 'string' ? m.content.trim() : '';
      if (!role || !content) continue;
      out.push({ role, content });
    }
    // Anthropic requires the first message to be 'user' and alternation —
    // drop any leading assistant messages and collapse consecutive same-role.
    while (out.length && out[0].role !== 'user') out.shift();
    const collapsed = [];
    for (const m of out) {
      const last = collapsed[collapsed.length - 1];
      if (last && last.role === m.role) {
        last.content += '\n\n' + m.content;
      } else {
        collapsed.push({ ...m });
      }
    }
    return collapsed.slice(-10); // keep last ~10 turns
  }

  app.post('/api/ai-tutor/chat', async (req, res) => {
    const startedAt = Date.now();
    try {
      // Gating: yêu cầu subscription ai_tutor (admin + dev bypass)
      const gate = await checkEntitlement(req, 'ai_tutor');
      if (!gate.ok) return res.status(gate.status).json(gate.body);

      const body = req.body || {};
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const subject = typeof body.subject === 'string' ? body.subject : '';
      const history = normaliseHistory(body.history);

      if (!message) {
        return res.status(400).json({ error: 'message_required', reply: 'Câu hỏi không được để trống.' });
      }

      let client;
      try {
        client = getAnthropic();
      } catch (err) {
        console.error('[ai-tutor] Anthropic SDK unavailable:', err.message);
        return res.status(503).json({
          error: 'ai_unavailable',
          reply: 'Dịch vụ AI hiện chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
        });
      }

      // Ensure the final message from the user is the new query. If history
      // already ends with the current user message we don't duplicate it.
      const messages = [...history];
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
        messages.push({ role: 'user', content: message });
      }

      const completion = await client.messages.create({
        model: AI_TUTOR_MODEL,
        max_tokens: AI_TUTOR_MAX_TOKENS,
        system: buildSystemPrompt(subject),
        messages,
      });

      // The SDK returns content as an array of blocks; concatenate text blocks.
      let reply = '';
      if (Array.isArray(completion.content)) {
        for (const block of completion.content) {
          if (block && block.type === 'text' && typeof block.text === 'string') {
            reply += block.text;
          }
        }
      }
      reply = reply.trim() || 'Xin lỗi, tôi chưa tạo được câu trả lời. Bạn thử đặt lại câu hỏi nhé.';

      const latencyMs = Date.now() - startedAt;
      console.log(`[ai-tutor] ok model=${AI_TUTOR_MODEL} subject="${subject}" latency=${latencyMs}ms tokens=${completion.usage ? completion.usage.output_tokens : '?'}`);

      return res.json({
        reply,
        model: completion.model || AI_TUTOR_MODEL,
        usage: completion.usage || null,
      });
    } catch (err) {
      const status = err && err.status ? err.status : 500;
      console.error(`[ai-tutor] ❌ ${status} ${err.message}`);
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: 'ai_error',
        message: err.message,
        reply: 'Xin lỗi, có lỗi khi gọi Gia Sư AI. Vui lòng thử lại sau.',
      });
    }
  });

  // Conversation history — not persisted yet. Return [] so the frontend
  // sidebar renders cleanly. (Persistence can be added later via Prisma.)
  app.get('/api/ai-tutor/conversations', (_req, res) => res.json([]));
}

// ══════════════════════════════════════════════════════════════
// LEARNING HISTORY — per-student per-course timeline
// Endpoints:
//   POST /api/learning/events                          — append event
//   GET  /api/learning/history/course/:courseId        — course timeline
//   GET  /api/learning/history/path/:learningPathId    — path timeline
//   GET  /api/learning/my-courses-activity             — enrollments + last activity
//
// Storage: Postgres (Neon) via `pg`. Table `LessonHistory` is bootstrapped
// with CREATE TABLE IF NOT EXISTS on first call so no migration is needed.
//
// Auth: reads the JWT on Authorization: Bearer <token>. If the token is
// invalid we fall back to anonymous user "anonymous" — but ONLY for event
// writes in dev; read endpoints require a valid token.
// ══════════════════════════════════════════════════════════════
{
  const { Pool } = require('pg');
  const jwt = require('jsonwebtoken');

  const JWT_SECRET_LH = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  let _lhPool = null;
  function getLearningPool() {
    if (_lhPool) return _lhPool;
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) throw new Error('DATABASE_URL not set');
    _lhPool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    return _lhPool;
  }

  let _lhReady = false;
  async function ensureLessonHistoryTable() {
    if (_lhReady) return;
    const pool = getLearningPool();
    // Idempotent; safe to run on every cold start.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "LessonHistory" (
        "id"              TEXT PRIMARY KEY,
        "userId"          TEXT NOT NULL,
        "courseId"        TEXT,
        "chapterId"       TEXT,
        "instructorId"    TEXT,
        "learningPathId"  TEXT,
        "segmentId"       TEXT,
        "action"          TEXT NOT NULL,
        "title"           TEXT,
        "metadata"        JSONB,
        "occurredAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "LessonHistory_user_course_time_idx"
        ON "LessonHistory" ("userId", "courseId", "occurredAt" DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "LessonHistory_user_path_time_idx"
        ON "LessonHistory" ("userId", "learningPathId", "occurredAt" DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "LessonHistory_user_time_idx"
        ON "LessonHistory" ("userId", "occurredAt" DESC);
    `);
    _lhReady = true;
    console.log('[learning-history] ✅ LessonHistory table & indexes ready');
  }

  function getUserFromReq(req) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return null;
    try {
      const payload = jwt.verify(token, JWT_SECRET_LH);
      // auth.service.ts issues { sub, email, role }
      return { id: payload.sub || payload.userId || payload.id, role: payload.role };
    } catch {
      return null;
    }
  }

  // Simple cuid-ish id generator to match Prisma's @id @default(cuid())
  // Doesn't need cryptographic strength; just uniqueness.
  function newId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  const VALID_ACTIONS = new Set(['OPENED', 'RESUMED', 'COMPLETED', 'QUIZ_ATTEMPT', 'CUSTOM']);

  // ── POST /api/learning/events ─────────────────────────────
  app.post('/api/learning/events', async (req, res) => {
    try {
      const user = getUserFromReq(req);
      if (!user || !user.id) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const body = req.body || {};
      const action = typeof body.action === 'string' ? body.action.toUpperCase() : '';
      if (!VALID_ACTIONS.has(action)) {
        return res.status(400).json({
          error: 'invalid_action',
          message: `action must be one of: ${Array.from(VALID_ACTIONS).join(', ')}`,
        });
      }

      const courseId = body.courseId || null;
      const chapterId = body.chapterId || null;
      const instructorId = body.instructorId || null;
      const learningPathId = body.learningPathId || null;
      const segmentId = body.segmentId || null;
      const title = typeof body.title === 'string' ? body.title.slice(0, 500) : null;
      const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : null;

      if (!courseId && !learningPathId) {
        return res.status(400).json({
          error: 'missing_context',
          message: 'courseId or learningPathId is required',
        });
      }

      await ensureLessonHistoryTable();
      const pool = getLearningPool();

      const id = newId();
      await pool.query(
        `INSERT INTO "LessonHistory"
           ("id","userId","courseId","chapterId","instructorId",
            "learningPathId","segmentId","action","title","metadata","occurredAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [id, user.id, courseId, chapterId, instructorId, learningPathId,
         segmentId, action, title, metadata ? JSON.stringify(metadata) : null]
      );

      return res.status(201).json({ id, occurredAt: new Date().toISOString() });
    } catch (err) {
      console.error('[learning-history:event] ❌', err.message);
      return res.status(500).json({ error: 'internal', message: err.message });
    }
  });

  // ── GET /api/learning/history/course/:courseId ────────────
  app.get('/api/learning/history/course/:courseId', async (req, res) => {
    try {
      const user = getUserFromReq(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

      const { courseId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 500);

      await ensureLessonHistoryTable();
      const pool = getLearningPool();
      const { rows } = await pool.query(
        `SELECT "id","userId","courseId","chapterId","instructorId",
                "learningPathId","segmentId","action","title","metadata","occurredAt"
           FROM "LessonHistory"
          WHERE "userId" = $1 AND "courseId" = $2
          ORDER BY "occurredAt" DESC
          LIMIT $3`,
        [user.id, courseId, limit]
      );
      return res.json(rows);
    } catch (err) {
      console.error('[learning-history:course] ❌', err.message);
      return res.status(500).json({ error: 'internal', message: err.message });
    }
  });

  // ── GET /api/learning/history/path/:learningPathId ────────
  app.get('/api/learning/history/path/:learningPathId', async (req, res) => {
    try {
      const user = getUserFromReq(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

      const { learningPathId } = req.params;
      const limit = Math.min(parseInt(req.query.limit || '200', 10) || 200, 1000);

      await ensureLessonHistoryTable();
      const pool = getLearningPool();
      const { rows } = await pool.query(
        `SELECT "id","userId","courseId","chapterId","instructorId",
                "learningPathId","segmentId","action","title","metadata","occurredAt"
           FROM "LessonHistory"
          WHERE "userId" = $1 AND "learningPathId" = $2
          ORDER BY "occurredAt" DESC
          LIMIT $3`,
        [user.id, learningPathId, limit]
      );
      return res.json(rows);
    } catch (err) {
      console.error('[learning-history:path] ❌', err.message);
      return res.status(500).json({ error: 'internal', message: err.message });
    }
  });

  // ── GET /api/learning/my-courses-activity ─────────────────
  // For each course the student is enrolled in (via Purchase), return the
  // latest event + per-action counts. Used by MyCourses.tsx cards.
  app.get('/api/learning/my-courses-activity', async (req, res) => {
    try {
      const user = getUserFromReq(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });

      await ensureLessonHistoryTable();
      const pool = getLearningPool();

      // Most-recent event per (userId, courseId).
      const { rows } = await pool.query(
        `WITH ranked AS (
           SELECT h.*,
                  ROW_NUMBER() OVER (
                    PARTITION BY h."courseId"
                    ORDER BY h."occurredAt" DESC
                  ) AS rn
             FROM "LessonHistory" h
            WHERE h."userId" = $1 AND h."courseId" IS NOT NULL
         ),
         counts AS (
           SELECT "courseId",
                  COUNT(*) FILTER (WHERE "action" = 'COMPLETED') AS completed_count,
                  COUNT(*) FILTER (WHERE "action" = 'OPENED')    AS opened_count,
                  COUNT(*) FILTER (WHERE "action" = 'RESUMED')   AS resumed_count,
                  COUNT(*) FILTER (WHERE "action" = 'QUIZ_ATTEMPT') AS quiz_count,
                  COUNT(*) AS total_events
             FROM "LessonHistory"
            WHERE "userId" = $1 AND "courseId" IS NOT NULL
            GROUP BY "courseId"
         )
         SELECT r."courseId",
                r."chapterId"    AS last_chapter_id,
                r."title"        AS last_title,
                r."action"       AS last_action,
                r."occurredAt"   AS last_occurred_at,
                c.completed_count,
                c.opened_count,
                c.resumed_count,
                c.quiz_count,
                c.total_events
           FROM ranked r
           JOIN counts c ON c."courseId" = r."courseId"
          WHERE r.rn = 1`,
        [user.id]
      );
      return res.json(rows);
    } catch (err) {
      console.error('[learning-history:activity] ❌', err.message);
      return res.status(500).json({ error: 'internal', message: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// EXAM-PREP AGENT — /api/agents/exam-prep
// ══════════════════════════════════════════════════════════════
// Module "Ôn thi thông minh" for students. Generates MCQ practice exams
// from the Question Bank (status='Hoạt động' only) or from teacher-published
// exams / matrices, grades answers, persists to PracticeExam, and logs a
// LessonHistory row with action='QUIZ_ATTEMPT' so attempts can be surfaced
// in learning timelines.
//
// Fixed difficulty distribution: 40% Dễ / 30% TB / 30% Khó (random shuffle).
// Storage: Postgres (Neon) via `pg`. Table PracticeExam is bootstrapped
// with CREATE TABLE IF NOT EXISTS on first call.
// ══════════════════════════════════════════════════════════════
{
  const { Pool } = require('pg');
  const jwt = require('jsonwebtoken');

  const JWT_SECRET_EP = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  let _epPool = null;
  function getExamPool() {
    if (_epPool) return _epPool;
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) throw new Error('DATABASE_URL not set');
    _epPool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    return _epPool;
  }

  let _peReady = false;
  async function ensurePracticeExamTable() {
    if (_peReady) return;
    const pool = getExamPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "PracticeExam" (
        "id"              TEXT PRIMARY KEY,
        "studentId"       TEXT NOT NULL,
        "subject"         TEXT NOT NULL,
        "grade"           TEXT NOT NULL,
        "examType"        TEXT NOT NULL,
        "questionCount"   INTEGER NOT NULL DEFAULT 30,
        "timeLimit"       INTEGER NOT NULL DEFAULT 45,
        "questions"       JSONB NOT NULL DEFAULT '[]'::jsonb,
        "answers"         JSONB NOT NULL DEFAULT '[]'::jsonb,
        "score"           DOUBLE PRECISION,
        "percentage"      DOUBLE PRECISION,
        "breakdown"       JSONB,
        "recommendations" JSONB DEFAULT '[]'::jsonb,
        "completed"       BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "completedAt"     TIMESTAMPTZ
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "PracticeExam_student_idx" ON "PracticeExam" ("studentId", "createdAt" DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "PracticeExam_subject_idx" ON "PracticeExam" ("subject");`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "PracticeExam_grade_idx" ON "PracticeExam" ("grade");`);
    // Migration: thêm sourceExamId để link về Teacher Exam gốc (báo cáo).
    try {
      await pool.query(`ALTER TABLE "PracticeExam" ADD COLUMN IF NOT EXISTS "sourceExamId" TEXT`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "PracticeExam_sourceExamId_idx" ON "PracticeExam" ("sourceExamId")`);
    } catch (e) { console.warn('[exam-prep] sourceExamId migration:', e.message); }
    _peReady = true;
    console.log('[exam-prep] ✅ PracticeExam table & indexes ready');
  }

  function getUserFromReqEP(req) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return null;
    try {
      const payload = jwt.verify(token, JWT_SECRET_EP);
      return { id: payload.sub || payload.userId || payload.id, role: payload.role };
    } catch {
      return null;
    }
  }

  function newIdEP() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  // Fisher-Yates shuffle (mutating, returns same array)
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Distribute N questions across EASY/MEDIUM/HARD buckets with a fixed
   * 40/30/30 ratio, then fall back to any available bucket if one is
   * under-filled.  Returns up to `count` question rows (may be fewer if
   * the bank doesn't have enough total questions for the filter).
   */
  function pickByDifficulty(rows, count) {
    const buckets = { EASY: [], MEDIUM: [], HARD: [] };
    for (const r of rows) {
      const d = String(r.difficulty || '').toUpperCase();
      if (d === 'EASY' || d === 'DE' || d === 'DỄ') buckets.EASY.push(r);
      else if (d === 'HARD' || d === 'KHO' || d === 'KHÓ') buckets.HARD.push(r);
      else buckets.MEDIUM.push(r);
    }
    shuffle(buckets.EASY);
    shuffle(buckets.MEDIUM);
    shuffle(buckets.HARD);

    const targets = {
      EASY: Math.round(count * 0.4),
      MEDIUM: Math.round(count * 0.3),
      HARD: count - Math.round(count * 0.4) - Math.round(count * 0.3),
    };
    const picked = [];
    const take = (key, n) => {
      for (let i = 0; i < n && buckets[key].length > 0; i++) {
        picked.push(buckets[key].shift());
      }
    };
    take('EASY', targets.EASY);
    take('MEDIUM', targets.MEDIUM);
    take('HARD', targets.HARD);

    // Fill remaining slots from whatever bucket still has questions
    const remaining = count - picked.length;
    if (remaining > 0) {
      const leftover = [...buckets.EASY, ...buckets.MEDIUM, ...buckets.HARD];
      shuffle(leftover);
      picked.push(...leftover.slice(0, remaining));
    }
    return shuffle(picked);
  }

  /** Project a DB Question row into the shape the frontend expects. */
  function toClientQuestion(row, position) {
    // points: ưu tiên row.eq_points (alias từ join ExamQuestion.points),
    // fallback row.points, mặc định 1.0 để không vỡ existing flow.
    const rawPts = row.eq_points ?? row.points ?? 1;
    const points = Number(rawPts);
    return {
      questionId: row.id,
      position,
      content: row.content,
      questionType: row.questionType || row.questiontype || 'MCQ',
      options: Array.isArray(row.options) ? row.options : [],
      correctAnswer: row.correctAnswer ?? row.correctanswer ?? '',
      explanation: row.explanation || '',
      difficulty: String(row.difficulty || 'MEDIUM').toUpperCase(),
      topic: row.topic || undefined,
      points: Number.isFinite(points) && points > 0 ? points : 1,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // GET /api/agents/exam-prep?action=...
  // ══════════════════════════════════════════════════════════════
  app.get('/api/agents/exam-prep', async (req, res) => {
    try {
      const user = getUserFromReqEP(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });

      const action = String(req.query.action || '').toLowerCase();
      const pool = getExamPool();
      await ensurePracticeExamTable();
      const cache = require('./lib/cache.cjs');

      // ── stats ─────────────────────────────────────────
      // Cache 120s per-user; invalidate khi POST submit/grade (cache.del).
      if (action === 'stats') {
        const cacheKey = `examPrep:stats:${user.id}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.json(cached);

        const [sumQ, trendQ, bankQ] = await Promise.all([
          pool.query(
            `SELECT
               COUNT(*) FILTER (WHERE completed)                     AS total_exams,
               COALESCE(AVG(percentage) FILTER (WHERE completed), 0) AS avg_score,
               COALESCE(MAX(percentage) FILTER (WHERE completed), 0) AS best_score
             FROM "PracticeExam"
             WHERE "studentId" = $1`,
            [user.id]
          ),
          pool.query(
            `SELECT percentage, breakdown
               FROM "PracticeExam"
              WHERE "studentId" = $1 AND completed
              ORDER BY "completedAt" DESC
              LIMIT 10`,
            [user.id]
          ),
          pool.query(
            `SELECT COUNT(*)::int AS n FROM "Question" WHERE status = 'Hoạt động'`
          ),
        ]);

        // Aggregate weak topics from last 10 exams' breakdown.byTopic
        const topicAgg = new Map(); // topic → { correct, total }
        // Topic markers nội bộ — không hiển thị trong "Chủ đề cần ôn tập".
        const INTERNAL_TOPICS = new Set([
          'wayground-import', 'latex-import', 'pdf-import',
          'ai-generated', 'manual', 'unknown', '', null,
        ]);
        for (const row of trendQ.rows) {
          const byTopic = (row.breakdown && row.breakdown.byTopic) || {};
          for (const [topic, v] of Object.entries(byTopic)) {
            if (INTERNAL_TOPICS.has(topic) || INTERNAL_TOPICS.has(String(topic).toLowerCase())) continue;
            const prev = topicAgg.get(topic) || { correct: 0, total: 0 };
            prev.correct += (v && v.correct) || 0;
            prev.total += (v && v.total) || 0;
            topicAgg.set(topic, prev);
          }
        }
        const weakTopics = [];
        for (const [topic, v] of topicAgg.entries()) {
          if (v.total >= 3 && v.correct / v.total < 0.6) weakTopics.push(topic);
        }

        const recentTrend = trendQ.rows
          .slice()
          .reverse()
          .map((r) => Math.round(Number(r.percentage) || 0));

        const s = sumQ.rows[0] || {};
        const payload = {
          success: true,
          data: {
            stats: {
              totalExams: Number(s.total_exams) || 0,
              avgScore: Math.round(Number(s.avg_score) || 0),
              bestScore: Math.round(Number(s.best_score) || 0),
              recentTrend,
              weakTopics: weakTopics.slice(0, 5),
              questionBankCount: Number(bankQ.rows[0]?.n) || 0,
            },
          },
        };
        cache.set(cacheKey, payload, 120).catch(() => {});
        return res.json(payload);
      }

      // ── topics ────────────────────────────────────────
      // Cache 600s shared (Question table thay đổi chậm, theo subject).
      if (action === 'topics') {
        const subject = String(req.query.subject || '').trim();
        if (!subject) return res.json({ success: true, data: { topics: [] } });
        const cacheKey = `examPrep:topics:${subject}`;
        const payload = await cache.getOrFetch(cacheKey, 600, async () => {
          const { rows } = await pool.query(
            `SELECT DISTINCT topic
               FROM "Question"
              WHERE subject = $1 AND status = 'Hoạt động' AND topic IS NOT NULL AND topic <> ''
              ORDER BY topic ASC
              LIMIT 200`,
            [subject]
          );
          return { success: true, data: { topics: rows.map((r) => r.topic) } };
        });
        return res.json(payload);
      }

      // ── teacher_exams ─────────────────────────────────
      // Cache 120s shared (mọi HS nhìn cùng list). Invalidate khi GV publish
      // đề mới (xem POST handler bên dưới) hoặc khi HS hoàn thành (ảnh hưởng
      // takerCount + recent takers).
      if (action === 'teacher_exams') {
        const teCacheKey = 'examPrep:teacherExams:v2';
        const cachedTE = await cache.get(teCacheKey);
        if (cachedTE) return res.json(cachedTE);

        const exams = await pool.query(
          `SELECT e."id", e."title", e."description", e."examType", e."duration",
                  e."totalQuestions", e."totalScore", e."status", e."createdAt",
                  u."name" AS user_name
             FROM "Exam" e
             LEFT JOIN "User" u ON u."id" = e."userId"
            WHERE e."status" <> 'Nháp' AND e."totalQuestions" > 0
            ORDER BY e."createdAt" DESC
            LIMIT 100`
        );

        // Lấy danh sách người làm cho mỗi đề từ ExamXpReward (giải xong + nhận XP).
        // Mỗi user chỉ có 1 row per exam (UNIQUE constraint) nên đây là số user
        // riêng biệt đã hoàn thành. Lấy 8 người gần nhất + tổng count.
        // Try/catch để không vỡ flow chính nếu bảng chưa tồn tại.
        const examIds = exams.rows.map((r) => r.id);
        let takersMap = new Map(); // examId → { recent: [...], count: N }
        if (examIds.length > 0) {
          try {
            // Dùng cùng pool (cùng DATABASE_URL) — ExamXpReward & Exam ở cùng DB.
            const tRes = await pool.query(
              `SELECT "examId", "playerName", percentage, "earnedAt",
                      ROW_NUMBER() OVER (PARTITION BY "examId" ORDER BY "earnedAt" DESC) AS rn,
                      COUNT(*) OVER (PARTITION BY "examId") AS total
                 FROM "ExamXpReward"
                WHERE "examId" = ANY($1::text[])`,
              [examIds]
            );
            for (const row of tRes.rows) {
              if (!takersMap.has(row.examId)) {
                takersMap.set(row.examId, { recent: [], count: Number(row.total) || 0 });
              }
              if (Number(row.rn) <= 8) {
                takersMap.get(row.examId).recent.push({
                  name: row.playerName || 'Ẩn danh',
                  percentage: Number(row.percentage) || 0,
                  earnedAt: row.earnedAt,
                });
              }
            }
          } catch (e) {
            // ExamXpReward chưa tồn tại (mới bật flow) → log silent, không vỡ trả về
            console.warn('[exam-prep] takers query failed (non-fatal):', e.message);
          }
        }

        // ── Học sinh được phân công làm đề (assigned but not necessarily done) ──
        // Một Assignment được tạo từ Exam có content JSON chứa { examId: "..." }.
        // AssignmentTarget liên kết assignment → student/class.
        // Với class target: expand sang tất cả ClassStudent.
        // Trả về list { name, examId } để FE hiển thị avatar phụ.
        // Try/catch: assignments/AssignmentTarget có thể chưa tồn tại trên DB cũ.
        let assignedMap = new Map(); // examId → Set<string> names
        if (examIds.length > 0) {
          try {
            const aRes = await pool.query(
              `WITH exam_asgn AS (
                 SELECT a.id AS asgn_id,
                        regexp_replace(a.content, '.*"examId"\\s*:\\s*"([^"]+)".*', '\\1') AS exam_id
                   FROM assignments a
                  WHERE a.content IS NOT NULL
                    AND a.content LIKE '%"examId"%'
               )
               SELECT ea.exam_id, cs.name
                 FROM exam_asgn ea
                 JOIN "AssignmentTarget" at ON at."assignmentId" = ea.asgn_id
                 LEFT JOIN "ClassStudent" cs ON (
                   (at."targetType" = 'student' AND cs.id = at."targetId") OR
                   (at."targetType" = 'class'   AND cs."classId" = at."targetId")
                 )
                WHERE ea.exam_id = ANY($1::text[]) AND cs.name IS NOT NULL`,
              [examIds]
            );
            for (const row of aRes.rows) {
              if (!assignedMap.has(row.exam_id)) assignedMap.set(row.exam_id, new Set());
              assignedMap.get(row.exam_id).add(row.name);
            }
          } catch (e) {
            // Bảng assignments/AssignmentTarget có thể chưa tồn tại — log silent
            console.warn('[exam-prep] assigned-students query failed (non-fatal):', e.message);
          }
        }

        const matrices = await pool.query(
          `SELECT m."id", m."name", m."subject", m."grade", m."examType", m."duration",
                  m."totalQuestions", m."totalScore", m."status", m."createdAt",
                  u."name" AS user_name,
                  (SELECT COUNT(*)::int FROM "MatrixSelectedQuestion" msq WHERE msq."matrixId" = m."id") AS selected_count
             FROM "ExamMatrix" m
             LEFT JOIN "User" u ON u."id" = m."userId"
            WHERE m."totalQuestions" > 0
            ORDER BY m."createdAt" DESC
            LIMIT 100`
        );
        const tePayload = {
          success: true,
          data: {
            exams: exams.rows.map((e) => {
              const tk = takersMap.get(e.id) || { recent: [], count: 0 };
              // Loại bỏ những học sinh đã hoàn thành khỏi danh sách assigned
              // (avatar tô màu sẽ là takers, avatar gray là assigned-chưa-làm)
              const takerNames = new Set(tk.recent.map((t) => (t.name || '').toLowerCase()));
              const assignedSet = assignedMap.get(e.id) || new Set();
              const assignedStudents = Array.from(assignedSet).filter(
                (name) => !takerNames.has(String(name).toLowerCase())
              );
              return {
                id: e.id,
                title: e.title,
                description: e.description || undefined,
                examType: e.examType,
                duration: e.duration,
                totalQuestions: e.totalQuestions,
                totalScore: Number(e.totalScore) || 0,
                createdAt: e.createdAt,
                user: e.user_name ? { name: e.user_name } : undefined,
                takers: tk.recent,
                takerCount: tk.count,
                assignedStudents,            // học sinh được phân công chưa làm
                assignedCount: assignedSet.size, // tổng được phân công (bao gồm đã làm)
              };
            }),
            matrices: matrices.rows.map((m) => ({
              id: m.id,
              name: m.name,
              subject: m.subject || '',
              grade: m.grade,
              examType: m.examType,
              duration: m.duration,
              totalQuestions: m.totalQuestions,
              totalScore: Number(m.totalScore) || 0,
              createdAt: m.createdAt,
              user: m.user_name ? { name: m.user_name } : undefined,
              _count: { selectedQuestions: Number(m.selected_count) || 0 },
            })),
          },
        };
        // Cache 120s shared — chấp nhận takerCount lag 2 phút
        cache.set(teCacheKey, tePayload, 120).catch(() => {});
        return res.json(tePayload);
      }

      // ── community-stats ───────────────────────────────
      // Shape khớp với type ExamCommunityStats trong aeroedu-vite/src/types
      // (totalAttempts/totalUsers/averagePercentage/leaderboard/bySubject/byExamType/recentActivity).
      // Đứng tên người dùng ẩn danh (User_xxx) — không expose email/full name.
      // Cache 300s shared — leaderboard + bySubject + recent activity. User
      // chấp nhận lag 5 phút cho rankings (đỡ tải DB Neon đáng kể).
      if (action === 'community-stats') {
        const csCacheKey = 'examPrep:community:v2';
        const cachedCS = await cache.get(csCacheKey);
        if (cachedCS) return res.json(cachedCS);

        const [overallQ, leaderboardQ, bySubjQ, byTypeQ, recentQ] = await Promise.all([
          pool.query(
            `SELECT COUNT(*)::int                            AS total_attempts,
                    COUNT(DISTINCT "studentId")::int         AS total_users,
                    COALESCE(AVG(percentage),0)::float       AS avg_pct
               FROM "PracticeExam"
              WHERE completed = TRUE`
          ),
          pool.query(
            `SELECT pe.subject, pe."examType", pe.percentage, pe.score,
                    pe."questionCount" AS total, pe."completedAt", pe."studentId"
               FROM "PracticeExam" pe
              WHERE pe.completed = TRUE AND pe.percentage IS NOT NULL
              ORDER BY pe.percentage DESC, pe."completedAt" DESC
              LIMIT 10`
          ),
          pool.query(
            `SELECT subject,
                    COUNT(*)::int                AS count,
                    COALESCE(AVG(percentage),0)::float AS avg_pct
               FROM "PracticeExam"
              WHERE completed = TRUE AND percentage IS NOT NULL AND subject <> ''
              GROUP BY subject
              ORDER BY count DESC LIMIT 10`
          ),
          pool.query(
            `SELECT "examType",
                    COUNT(*)::int                AS count,
                    COALESCE(AVG(percentage),0)::float AS avg_pct
               FROM "PracticeExam"
              WHERE completed = TRUE AND percentage IS NOT NULL AND "examType" <> ''
              GROUP BY "examType"
              ORDER BY count DESC LIMIT 10`
          ),
          pool.query(
            `SELECT subject, "examType", percentage, "completedAt", "studentId"
               FROM "PracticeExam"
              WHERE completed = TRUE AND percentage IS NOT NULL
              ORDER BY "completedAt" DESC LIMIT 10`
          ),
        ]);
        const ovr = overallQ.rows[0] || {};
        const anonName = (sid) => `Học sinh ${String(sid || '').slice(0, 4) || '----'}`;
        const csPayload = {
          success: true,
          data: {
            totalAttempts: ovr.total_attempts || 0,
            totalUsers: ovr.total_users || 0,
            averagePercentage: Math.round(Number(ovr.avg_pct || 0)),
            updatedAt: new Date().toISOString(),
            leaderboard: leaderboardQ.rows.map(r => ({
              userName: anonName(r.studentId),
              userImage: null,
              subject: r.subject || '',
              examType: r.examType || '',
              percentage: Math.round(Number(r.percentage || 0)),
              score: Number(r.score || 0),
              total: Number(r.total || 0),
              completedAt: r.completedAt,
            })),
            bySubject: bySubjQ.rows.map(r => ({
              subject: r.subject,
              count: r.count,
              avgPercentage: Math.round(Number(r.avg_pct || 0)),
            })),
            byExamType: byTypeQ.rows.map(r => ({
              examType: r.examType,
              count: r.count,
              avgPercentage: Math.round(Number(r.avg_pct || 0)),
            })),
            recentActivity: recentQ.rows.map(r => ({
              userName: anonName(r.studentId),
              userImage: null,
              subject: r.subject || '',
              examType: r.examType || '',
              percentage: Math.round(Number(r.percentage || 0)),
              completedAt: r.completedAt,
            })),
          },
        };
        cache.set(csCacheKey, csPayload, 300).catch(() => {});
        return res.json(csPayload);
      }

      // ── history ───────────────────────────────────────
      if (action === 'history') {
        const { rows } = await pool.query(
          `SELECT "id","subject","grade","examType","questionCount","score",
                  "percentage","completed","createdAt","completedAt"
             FROM "PracticeExam"
            WHERE "studentId" = $1
            ORDER BY "createdAt" DESC
            LIMIT 50`,
          [user.id]
        );
        return res.json({
          success: true,
          data: {
            history: rows.map((r) => ({
              id: r.id,
              subject: r.subject,
              grade: r.grade,
              examType: r.examType,
              questionCount: r.questionCount,
              score: r.score === null ? null : Number(r.score),
              percentage: r.percentage === null ? null : Number(r.percentage),
              completed: !!r.completed,
              createdAt: r.createdAt,
              completedAt: r.completedAt,
            })),
          },
        });
      }

      return res.status(400).json({ success: false, error: 'invalid_action' });
    } catch (err) {
      console.error('[exam-prep:GET] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // POST /api/agents/exam-prep  { action: 'create' | 'create_from_exam'
  //   | 'create_from_matrix' | 'submit' }
  // ══════════════════════════════════════════════════════════════
  app.post('/api/agents/exam-prep', async (req, res) => {
    try {
      const user = getUserFromReqEP(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });

      const body = req.body || {};
      const action = String(body.action || '').toLowerCase();
      const pool = getExamPool();
      await ensurePracticeExamTable();

      // ── create (from Question Bank) ───────────────────
      if (action === 'create') {
        // Gating: AI ôn thi cá nhân hoá (sinh đề từ AI khi bank thiếu câu)
        const gate = await checkEntitlement(req, 'ai_examprep');
        if (!gate.ok) return res.status(gate.status).json(gate.body);

        const subject = String(body.subject || '').trim();
        const grade = String(body.grade || '').trim();
        const examType = String(body.examType || 'Kiểm tra 1 tiết').trim();
        const questionCount = Math.max(5, Math.min(parseInt(body.questionCount, 10) || 30, 100));
        const timeLimit = Math.max(5, Math.min(parseInt(body.timeLimit, 10) || 45, 240));
        const topic = body.topic && body.topic !== '__all__' ? String(body.topic) : null;

        if (!subject || !grade) {
          return res.status(400).json({ success: false, error: 'missing_fields', message: 'subject and grade are required' });
        }

        // Pull a pool of candidate questions. We take up to 5x the needed count
        // so each difficulty bucket has room to shuffle from.
        const sql = topic
          ? `SELECT id, topic, subject, grade, "questionType", difficulty, content,
                    options, "correctAnswer", explanation, status
               FROM "Question"
              WHERE subject = $1 AND grade = $2 AND status = 'Hoạt động' AND topic = $3
              LIMIT $4`
          : `SELECT id, topic, subject, grade, "questionType", difficulty, content,
                    options, "correctAnswer", explanation, status
               FROM "Question"
              WHERE subject = $1 AND grade = $2 AND status = 'Hoạt động'
              LIMIT $3`;
        const params = topic
          ? [subject, grade, topic, questionCount * 5]
          : [subject, grade, questionCount * 5];
        const { rows } = await pool.query(sql, params);

        // ── AI Auto-fill: nếu ngân hàng KHÔNG đủ → generate qua AI + lưu lại ──
        // Workflow: lấy hết existing + sinh phần thiếu + INSERT vào Question
        // (status='Hoạt động', aiGenerated=true) → lần sau topic này có sẵn.
        let augmented = [...rows];
        let aiAdded = 0;

        if (augmented.length < questionCount) {
          const missing = questionCount - augmented.length;
          try {
            const { generateQuestionsByTopic } = require('./lib/fal-quiz-extractor.cjs');
            const { randomUUID: qbUUID } = require('crypto');
            // Batch 5 câu/lần (giảm từ 10 → 5) — output ngắn hơn ⇒
            // ít chance LLM hết max_tokens và cắt JSON giữa chừng.
            // 30 câu = 6 batches song song.
            const BATCH = 5;
            const batches = [];
            for (let i = 0; i < missing; i += BATCH) {
              batches.push(Math.min(BATCH, missing - i));
            }
            console.log(`[exam-prep:create] 🤖 AI generate ${missing} câu cho ${subject}-${grade}${topic ? `-${topic}` : ''} (${batches.length} batches × ${BATCH})`);

            // Helper: gọi 1 batch + retry 1 lần nếu JSON parse fail
            const callBatchWithRetry = async (count) => {
              try {
                return await generateQuestionsByTopic({
                  subject, grade,
                  topic: topic || `${subject} lớp ${grade}`,
                  count, difficulty: 'medium',
                });
              } catch (err) {
                // Retry 1 lần nếu lỗi JSON (không phải timeout)
                if (/JSON|parse|Salvage/i.test(err.message)) {
                  console.log(`[exam-prep:create] retry batch (${count}) after JSON fail`);
                  return await generateQuestionsByTopic({
                    subject, grade,
                    topic: topic || `${subject} lớp ${grade}`,
                    count, difficulty: 'medium',
                  });
                }
                throw err;
              }
            };

            // Promise.allSettled — batch fail không kéo các batch khác fail
            const results = await Promise.allSettled(batches.map(callBatchWithRetry));
            const newQs = [];
            for (const r of results) {
              if (r.status === 'fulfilled' && r.value?.questions) {
                newQs.push(...r.value.questions);
              } else if (r.status === 'rejected') {
                console.warn(`[exam-prep:create] batch fail: ${r.reason?.message?.slice(0, 200) || r.reason}`);
              }
            }
            console.log(`[exam-prep:create] AI batches done: collected ${newQs.length}/${missing} questions`);

            // INSERT từng câu vào Question table (lưu cho lần sau)
            const now = new Date();
            for (const q of newQs) {
              const qid = qbUUID();
              try {
                await pool.query(
                  `INSERT INTO "Question"
                     (id, topic, subject, grade, "questionType", difficulty, content,
                      options, "correctAnswer", explanation, "qualityScore", "usageCount",
                      "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt")
                   VALUES ($1,$2,$3,$4,$5,'medium',$6,$7,$8,$9,0,0,true,false,'Hoạt động',NULL,$10,$10)`,
                  [
                    qid,
                    (q.topic && String(q.topic).trim()) || topic || subject,
                    subject, String(grade),
                    String(q.questionType || 'MULTIPLE_CHOICE'),
                    String(q.content || ''),
                    Array.isArray(q.options) ? q.options.map(String) : [],
                    String(q.correctAnswer || ''),
                    q.explanation || '',
                    now,
                  ]
                );
                augmented.push({
                  id: qid,
                  topic: (q.topic && String(q.topic).trim()) || topic || subject,
                  subject, grade, questionType: q.questionType || 'MULTIPLE_CHOICE',
                  difficulty: 'medium',
                  content: q.content, options: q.options || [],
                  correctAnswer: q.correctAnswer, explanation: q.explanation || '',
                  status: 'Hoạt động',
                });
                aiAdded++;
              } catch (insErr) {
                console.warn(`[exam-prep:create] insert AI question failed: ${insErr.message.slice(0, 100)}`);
              }
            }
          } catch (aiErr) {
            console.warn(`[exam-prep:create] AI generate failed: ${aiErr.message.slice(0, 200)}`);
            // Tiếp tục với augmented hiện tại (có thể < questionCount)
          }
        }

        if (augmented.length === 0) {
          return res.status(503).json({
            success: false,
            error: 'no_questions_no_ai',
            message: `Không có câu hỏi nào cho ${subject} - ${grade}${topic ? ' (' + topic + ')' : ''} và AI tạm thời không khả dụng. Vui lòng thử lại sau hoặc đổi chủ đề.`,
          });
        }

        const picked = pickByDifficulty(augmented, Math.min(questionCount, augmented.length));
        const questions = picked.map((r, i) => toClientQuestion(r, i + 1));

        const id = newIdEP();
        await pool.query(
          `INSERT INTO "PracticeExam"
             ("id","studentId","subject","grade","examType","questionCount","timeLimit",
              "questions","answers","completed","createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]'::jsonb,FALSE,NOW())`,
          [id, user.id, subject, grade, examType, questions.length, timeLimit, JSON.stringify(questions)]
        );

        console.log(`[exam-prep:create] ✅ practice=${id.slice(0,8)} bank=${rows.length} +AI=${aiAdded} → total=${questions.length}`);
        return res.json({
          success: true,
          data: {
            practice: {
              id, subject, grade, examType,
              source: aiAdded > 0 ? 'bank+ai' : 'bank',
              aiAdded,  // Số câu AI sinh thêm (UI có thể hiện banner)
              questions,
              timeLimit,
            },
          },
        });
      }

      // ── create_from_exam (teacher-published exam) ─────
      if (action === 'create_from_exam') {
        const examId = String(body.examId || '').trim();
        if (!examId) return res.status(400).json({ success: false, error: 'missing_examId' });

        const examRes = await pool.query(
          `SELECT e."id", e."title", e."examType", e."duration", e."totalQuestions"
             FROM "Exam" e
            WHERE e."id" = $1`,
          [examId]
        );
        if (examRes.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'exam_not_found' });
        }
        const exam = examRes.rows[0];

        const qRes = await pool.query(
          `SELECT q.id, q.topic, q.subject, q.grade, q."questionType", q.difficulty,
                  q.content, q.options, q."correctAnswer", q.explanation,
                  eq."order", eq.points AS eq_points
             FROM "ExamQuestion" eq
             JOIN "Question" q ON q.id = eq."questionId"
            WHERE eq."examId" = $1
            ORDER BY eq."order" ASC`,
          [examId]
        );
        if (qRes.rows.length === 0) {
          return res.status(400).json({ success: false, error: 'empty_exam', message: 'Đề thi này chưa có câu hỏi.' });
        }

        const questions = qRes.rows.map((r, i) => toClientQuestion(r, i + 1));
        const subject = qRes.rows[0]?.subject || '';
        const grade = qRes.rows[0]?.grade || '';

        const id = newIdEP();
        await pool.query(
          `INSERT INTO "PracticeExam"
             ("id","studentId","subject","grade","examType","questionCount","timeLimit",
              "questions","answers","completed","createdAt","sourceExamId")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]'::jsonb,FALSE,NOW(),$9)`,
          [id, user.id, subject, grade, exam.examType || 'Đề giáo viên', questions.length, exam.duration || 45, JSON.stringify(questions), examId]
        );

        return res.json({
          success: true,
          data: {
            practice: {
              id, subject, grade,
              examType: exam.examType || 'Đề giáo viên',
              source: 'teacher_exam',
              questions,
              timeLimit: exam.duration || 45,
            },
          },
        });
      }

      // ── create_from_matrix ────────────────────────────
      if (action === 'create_from_matrix') {
        const matrixId = String(body.matrixId || '').trim();
        if (!matrixId) return res.status(400).json({ success: false, error: 'missing_matrixId' });

        const mRes = await pool.query(
          `SELECT "id","name","subject","grade","examType","duration","totalQuestions"
             FROM "ExamMatrix"
            WHERE "id" = $1`,
          [matrixId]
        );
        if (mRes.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'matrix_not_found' });
        }
        const m = mRes.rows[0];

        const qRes = await pool.query(
          `SELECT q.id, q.topic, q.subject, q.grade, q."questionType", q.difficulty,
                  q.content, q.options, q."correctAnswer", q.explanation
             FROM "MatrixSelectedQuestion" msq
             JOIN "Question" q ON q.id = msq."questionId"
            WHERE msq."matrixId" = $1
            ORDER BY msq."createdAt" ASC`,
          [matrixId]
        );
        if (qRes.rows.length === 0) {
          return res.status(400).json({ success: false, error: 'empty_matrix', message: 'Ma trận này chưa chọn câu hỏi.' });
        }

        const shuffled = shuffle(qRes.rows.slice());
        const questions = shuffled.map((r, i) => toClientQuestion(r, i + 1));

        const id = newIdEP();
        await pool.query(
          `INSERT INTO "PracticeExam"
             ("id","studentId","subject","grade","examType","questionCount","timeLimit",
              "questions","answers","completed","createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]'::jsonb,FALSE,NOW())`,
          [id, user.id, m.subject || '', m.grade || '', m.examType || 'Ma trận giáo viên', questions.length, m.duration || 45, JSON.stringify(questions)]
        );

        return res.json({
          success: true,
          data: {
            practice: {
              id,
              subject: m.subject || '',
              grade: m.grade || '',
              examType: m.examType || 'Ma trận giáo viên',
              source: 'teacher_matrix',
              questions,
              timeLimit: m.duration || 45,
            },
          },
        });
      }

      // ── submit (grade + persist + log history) ────────
      if (action === 'submit') {
        const practiceId = String(body.practiceId || '').trim();
        const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
        if (!practiceId) return res.status(400).json({ success: false, error: 'missing_practiceId' });

        const peRes = await pool.query(
          `SELECT "id","studentId","subject","grade","examType","questions","completed"
             FROM "PracticeExam"
            WHERE "id" = $1`,
          [practiceId]
        );
        if (peRes.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'practice_not_found' });
        }
        const pe = peRes.rows[0];
        if (pe.studentId !== user.id) {
          return res.status(403).json({ success: false, error: 'forbidden' });
        }
        if (pe.completed) {
          return res.status(400).json({ success: false, error: 'already_submitted' });
        }

        const questions = Array.isArray(pe.questions) ? pe.questions : [];
        const total = questions.length;

        // Tổng điểm theo `points` của từng câu (fallback 1.0 cho legacy data)
        const totalPoints = questions.reduce(
          (sum, q) => sum + (Number(q.points) > 0 ? Number(q.points) : 1),
          0
        );
        let pointsEarned = 0;

        let correct = 0, incorrect = 0, unanswered = 0;
        const byTopic = {};
        const byDifficulty = { EASY: { correct: 0, total: 0, accuracy: 0 }, MEDIUM: { correct: 0, total: 0, accuracy: 0 }, HARD: { correct: 0, total: 0, accuracy: 0 } };
        const details = [];

        // normalizeAnswer — chuẩn hoá đáp án để so sánh giữa user_ans và
        // correct_ans (TỰ HOẠT ĐỘNG cho cả MCQ + SHORT_ANSWER):
        //   • MCQ: extract letter ABCD từ "D. F = k·q₁·q₂/r²" → "D"
        //   • Số: chuẩn hoá '0,4' / '0.40' / ' 0.4 ' → '0.4'
        //   • Text: lowercase + trim
        // Lý do: publish-li10.py lưu correctAnswer="D" (1 chữ) nhưng UI
        // gửi user_ans là full option text "D. công thức..." → so sánh
        // string thẳng sẽ ra false dù user chọn đúng.
        const normalizeAnswer = (ans) => {
          const s = String(ans ?? '').trim();
          if (!s) return '';
          if (/^[A-Z]$/i.test(s)) return s.toUpperCase();
          const m = s.match(/^([A-Z])[\.\)\s]/i);
          if (m) return m[1].toUpperCase();
          const numStr = s.replace(/,/g, '.').replace(/\s+/g, '');
          if (numStr !== '' && !isNaN(Number(numStr))) {
            return String(Number(numStr));
          }
          return s.toLowerCase();
        };

        // Khi user_ans là text option thuần (không có prefix "A. "), tìm
        // index trong q.options để quy về letter. Bug fix: trước đây HS bấm
        // "C=C1+C2" → BE compare với correctAnswer "A" → false sai. Giờ map
        // text → letter trước khi normalize.
        const collapseSpace = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
        const userAnswerToLetter = (rawAns, options) => {
          const a = String(rawAns ?? '').trim();
          if (!a) return a;
          // Nếu đã là letter hoặc có prefix "A. " thì giữ nguyên
          if (/^[A-Z]$/i.test(a)) return a.toUpperCase();
          if (/^[A-Z][\.\)\s]/i.test(a)) return a;
          // Tìm trong options array (so trùng case-insensitive, bỏ space)
          if (Array.isArray(options) && options.length > 0) {
            const target = collapseSpace(a);
            for (let i = 0; i < options.length; i++) {
              const opt = collapseSpace(options[i]);
              // Chấp nhận match trực tiếp HOẶC option có prefix vd "A. xxx"
              const stripped = opt.replace(/^[a-z][\.\)\s]+/i, '').trim();
              if (opt === target || stripped === target) {
                return String.fromCharCode(65 + i); // A/B/C/D
              }
            }
          }
          return a;
        };

        for (const q of questions) {
          const qid = q.questionId;
          const user_ans_raw = answers[qid];
          const correct_ans = q.correctAnswer || '';
          const isAnswered = user_ans_raw !== undefined && user_ans_raw !== null && String(user_ans_raw).length > 0;

          // Map text option → letter trước khi normalize (fix MCQ no-prefix bug)
          const user_ans = isAnswered ? userAnswerToLetter(user_ans_raw, q.options) : user_ans_raw;

          let isCorrect = false;
          if (isAnswered && correct_ans) {
            isCorrect = normalizeAnswer(user_ans) === normalizeAnswer(correct_ans);
          }

          if (!isAnswered) unanswered++;
          else if (isCorrect) correct++;
          else incorrect++;

          // Weighted: cộng dồn points của câu đúng
          if (isCorrect) {
            const qPts = Number(q.points) > 0 ? Number(q.points) : 1;
            pointsEarned += qPts;
          }

          const topic = q.topic || 'Khác';
          if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0, accuracy: 0 };
          byTopic[topic].total++;
          if (isCorrect) byTopic[topic].correct++;

          const diff = (String(q.difficulty || 'MEDIUM').toUpperCase() in byDifficulty)
            ? String(q.difficulty).toUpperCase()
            : 'MEDIUM';
          byDifficulty[diff].total++;
          if (isCorrect) byDifficulty[diff].correct++;

          details.push({
            questionId: qid,
            position: q.position,
            content: q.content,
            userAnswer: isAnswered ? String(user_ans_raw) : null,
            correctAnswer: correct_ans,
            isCorrect,
            explanation: q.explanation || undefined,
            topic: q.topic || undefined,
          });
        }

        // Finalize accuracy numbers
        for (const t of Object.keys(byTopic)) {
          const b = byTopic[t];
          b.accuracy = b.total ? Math.round((b.correct / b.total) * 100) / 100 : 0;
        }
        for (const d of Object.keys(byDifficulty)) {
          const b = byDifficulty[d];
          b.accuracy = b.total ? Math.round((b.correct / b.total) * 100) / 100 : 0;
        }

        // Weighted scoring:
        //   percentage = pointsEarned / totalPoints (theo TRỌNG SỐ điểm, không phải số câu)
        //   score = pointsEarned scale theo thang 10 (totalPoints → 10đ)
        const percentage = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0;
        const score = totalPoints > 0
          ? Math.round((pointsEarned / totalPoints) * 100) / 10
          : 0; // 0–10 scale

        // Recommendations: weakest topics + difficulty-level hints
        // Loại bỏ topic markers nội bộ (wayground-import / latex-import / ...)
        const INTERNAL_TOPICS_REC = new Set([
          'wayground-import', 'latex-import', 'pdf-import',
          'ai-generated', 'manual', 'unknown',
        ]);
        const recommendations = [];
        const weakTopics = Object.entries(byTopic)
          .filter(([t, v]) => v.total >= 2 && v.accuracy < 0.6
            && t && !INTERNAL_TOPICS_REC.has(String(t).toLowerCase()))
          .sort((a, b) => a[1].accuracy - b[1].accuracy)
          .slice(0, 3)
          .map(([topic]) => topic);
        if (weakTopics.length > 0) {
          recommendations.push(`Nên ôn kỹ các chủ đề: ${weakTopics.join(', ')}`);
        }
        if (byDifficulty.EASY.total > 0 && byDifficulty.EASY.accuracy < 0.7) {
          recommendations.push('Câu dễ chưa vững — xem lại kiến thức nền tảng trước khi làm đề khó hơn.');
        }
        if (byDifficulty.HARD.total > 0 && byDifficulty.HARD.accuracy < 0.4) {
          recommendations.push('Câu khó đang đuối — luyện thêm bài vận dụng và đọc kỹ phần lời giải.');
        }
        if (unanswered > 0) {
          recommendations.push(`Còn ${unanswered} câu chưa trả lời — lần sau quản lý thời gian tốt hơn để làm hết đề.`);
        }
        if (percentage >= 85) {
          recommendations.push('Kết quả xuất sắc — thử đề nâng cao hoặc đề ở khối lớp cao hơn.');
        }
        if (recommendations.length === 0) {
          recommendations.push('Tiếp tục giữ phong độ — luyện thêm đề mới để củng cố kiến thức.');
        }

        const breakdown = { correct, incorrect, unanswered, byTopic, byDifficulty };

        await pool.query(
          `UPDATE "PracticeExam"
              SET "answers" = $1,
                  "score" = $2,
                  "percentage" = $3,
                  "breakdown" = $4,
                  "recommendations" = $5,
                  "completed" = TRUE,
                  "completedAt" = NOW()
            WHERE "id" = $6`,
          [
            JSON.stringify(answers),
            score,
            percentage,
            JSON.stringify(breakdown),
            JSON.stringify(recommendations),
            practiceId,
          ]
        );

        // Invalidate cache: user stats (đã có data mới) + community stats
        // (avg + leaderboard + recentActivity bị ảnh hưởng).
        // teacher_exams cache cũng invalidate vì takerCount sẽ tăng sau khi
        // /exam-xp/award chạy fire-and-forget từ FE.
        try {
          const cache = require('./lib/cache.cjs');
          cache.del(`examPrep:stats:${user.id}`);
          cache.del('examPrep:community:v2');
          cache.del('examPrep:teacherExams:v2');
        } catch {}

        // Write a LessonHistory QUIZ_ATTEMPT row so the attempt surfaces in
        // learning timelines. courseId/learningPathId are null because
        // exam-prep is cross-course; metadata captures the salient numbers.
        try {
          const lhId = newIdEP();
          const title = `Ôn thi ${pe.subject} — ${pe.examType} · ${percentage}%`;
          const metadata = {
            score, percentage, examType: pe.examType, subject: pe.subject,
            grade: pe.grade, practiceId, questionCount: total,
            correct, incorrect, unanswered,
          };
          await pool.query(
            `INSERT INTO "LessonHistory"
               ("id","userId","courseId","chapterId","instructorId",
                "learningPathId","segmentId","action","title","metadata","occurredAt")
             VALUES ($1,$2,NULL,NULL,NULL,NULL,NULL,'QUIZ_ATTEMPT',$3,$4,NOW())`,
            [lhId, user.id, title, JSON.stringify(metadata)]
          );
        } catch (e) {
          // Don't fail the submit if history write fails — the grade is primary.
          console.warn('[exam-prep:submit] history write failed', e.message);
        }

        return res.json({
          success: true,
          data: {
            result: {
              score, total, percentage,
              breakdown,
              recommendations,
              details,
            },
          },
        });
      }

      // ── regrade (re-chấm bài đã nộp với logic normalize mới) ──
      // Dùng khi: fix bug grading rồi muốn cập nhật điểm cho các bài đã nộp.
      // Body: { action: 'regrade', practiceId: 'xxx' } HOẶC { action: 'regrade', all: true }
      if (action === 'regrade') {
        const targetIds = [];
        if (body.all === true) {
          // Chỉ admin được regrade ALL — check qua header X-Admin-Key.
          const adminKey = req.headers['x-admin-key'];
          if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
            return res.status(403).json({ success: false, error: 'admin_required' });
          }
          const { rows } = await pool.query(
            `SELECT id FROM "PracticeExam" WHERE completed = TRUE`
          );
          for (const r of rows) targetIds.push(r.id);
        } else {
          const practiceId = String(body.practiceId || '').trim();
          if (!practiceId) return res.status(400).json({ success: false, error: 'missing_practiceId' });
          targetIds.push(practiceId);
        }

        const normalize = (ans) => {
          const s = String(ans ?? '').trim();
          if (!s) return '';
          if (/^[A-Z]$/i.test(s)) return s.toUpperCase();
          const m = s.match(/^([A-Z])[\.\)\s]/i);
          if (m) return m[1].toUpperCase();
          const numStr = s.replace(/,/g, '.').replace(/\s+/g, '');
          if (numStr !== '' && !isNaN(Number(numStr))) return String(Number(numStr));
          return s.toLowerCase();
        };

        const results = [];
        for (const pid of targetIds) {
          const r = await pool.query(
            `SELECT id, "studentId", questions, answers, score, percentage, completed
               FROM "PracticeExam" WHERE id = $1`, [pid]
          );
          if (r.rows.length === 0) {
            results.push({ practiceId: pid, error: 'not_found' });
            continue;
          }
          const pe = r.rows[0];
          if (!body.all && pe.studentId !== user.id) {
            results.push({ practiceId: pid, error: 'forbidden' });
            continue;
          }
          if (!pe.completed) {
            results.push({ practiceId: pid, error: 'not_submitted' });
            continue;
          }
          const qs = Array.isArray(pe.questions) ? pe.questions : [];
          const ans = pe.answers && typeof pe.answers === 'object' ? pe.answers : {};
          let c = 0, ic = 0, un = 0;
          for (const q of qs) {
            const u = ans[q.questionId];
            const ca = q.correctAnswer || '';
            const answered = u !== undefined && u !== null && String(u).length > 0;
            if (!answered) un++;
            else if (ca && normalize(u) === normalize(ca)) c++;
            else ic++;
          }
          const newPct = qs.length > 0 ? Math.round((c / qs.length) * 100) : 0;
          const newScore = qs.length > 0 ? Math.round((c / qs.length) * 100) / 10 : 0;
          await pool.query(
            `UPDATE "PracticeExam" SET score = $1, percentage = $2,
               breakdown = jsonb_set(COALESCE(breakdown,'{}'::jsonb), '{correct}', $3::jsonb)
             WHERE id = $4`,
            [newScore, newPct, JSON.stringify(c), pid]
          );
          results.push({
            practiceId: pid,
            before: { score: pe.score, percentage: pe.percentage },
            after: { score: newScore, percentage: newPct, correct: c, incorrect: ic, unanswered: un, total: qs.length },
            changed: pe.percentage !== newPct,
          });
        }
        const changedCount = results.filter(r => r.changed).length;
        console.log(`[exam-prep:regrade] ✅ ${results.length} bài, ${changedCount} bài thay đổi điểm`);
        return res.json({ success: true, data: { results, changedCount } });
      }

      return res.status(400).json({ success: false, error: 'invalid_action' });
    } catch (err) {
      console.error('[exam-prep:POST] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });
}

// ════════════════════════════════════════════════════════════════════════
// ASSIGNMENTS — /api/assignments  (teacher-created, QR-scannable)
// Handles: teacher CRUD, QR token generation, public scan & submit, stats.
// Must register BEFORE the catch-all makeProxy(BACKEND_URL, ...) at line ~2085.
// ════════════════════════════════════════════════════════════════════════
{
  const { Pool: AsgnPool } = require('pg');
  const jwtAsgn = require('jsonwebtoken');
  const cryptoAsgn = require('crypto');

  let _asgnPool = null;
  function getAsgnPool() {
    if (_asgnPool) return _asgnPool;
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    _asgnPool = new AsgnPool({
      connectionString: url,
      ssl: url.includes('neon.tech') || url.includes('sslmode=require')
        ? { rejectUnauthorized: false } : false,
      max: 5,
    });
    return _asgnPool;
  }

  function newAsgnId(prefix) {
    return (prefix || 'asgn_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function newQrToken() {
    // 24-char URL-safe token
    return cryptoAsgn.randomBytes(18).toString('base64url');
  }

  function getUserAsgn(req) {
    try {
      const h = req.headers.authorization || '';
      const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (!tok) return null;
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
        || 'dev-insecure-fallback-change-me';
      const decoded = jwtAsgn.verify(tok, secret);
      return {
        id: decoded.sub || decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role || 'STUDENT',
      };
    } catch { return null; }
  }

  async function ensureAsgnTables() {
    const pool = getAsgnPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        subject VARCHAR(100) NOT NULL DEFAULT 'Chung',
        assignment_type VARCHAR(50) NOT NULL DEFAULT 'lesson',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
        duration INTEGER NOT NULL DEFAULT 30,
        xp_reward INTEGER NOT NULL DEFAULT 100,
        accuracy DOUBLE PRECISION,
        progress INTEGER NOT NULL DEFAULT 0,
        user_id VARCHAR(255) NOT NULL,
        teacher_id VARCHAR(255),
        qr_token VARCHAR(64) UNIQUE,
        max_score DOUBLE PRECISION DEFAULT 10,
        due_date TIMESTAMPTZ,
        content TEXT,
        tags JSONB,
        ai_generated BOOLEAN NOT NULL DEFAULT false,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Best-effort: add columns if pre-existing table is older
    const addCols = [
      `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(255)`,
      `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64)`,
      `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_score DOUBLE PRECISION DEFAULT 10`,
      `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ`,
      `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS content TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_qr_token ON assignments(qr_token) WHERE qr_token IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id)`,
      `CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status)`,
    ];
    for (const sql of addCols) { try { await pool.query(sql); } catch (_) { /* ignore */ } }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id VARCHAR(255) PRIMARY KEY,
        assignment_id VARCHAR(255) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        scanner_name VARCHAR(255) NOT NULL,
        scanner_email VARCHAR(255),
        scanner_user_id VARCHAR(255),
        score DOUBLE PRECISION,
        answer_text TEXT,
        time_spent INTEGER,
        metadata JSONB,
        ip VARCHAR(64),
        user_agent TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subm_assignment ON assignment_submissions(assignment_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_subm_submitted_at ON assignment_submissions(submitted_at DESC)`);
    } catch (_) { /* ignore */ }
  }

  let asgnReady = null;
  function ensureAsgnReady() {
    if (!asgnReady) asgnReady = ensureAsgnTables().catch((e) => {
      console.error('[assignments:init] ❌', e.message); asgnReady = null;
    });
    return asgnReady;
  }

  // DB row → client camelCase shape
  function asgnToClient(r, extras) {
    const base = {
      id: r.id,
      title: r.title,
      description: r.description || '',
      subject: r.subject || 'Chung',
      type: r.assignment_type || 'lesson',
      status: r.status || 'pending',
      difficulty: r.difficulty || 'medium',
      duration: r.duration || 30,
      xpReward: r.xp_reward || 100,
      accuracy: r.accuracy == null ? undefined : Number(r.accuracy),
      progress: r.progress || 0,
      tags: Array.isArray(r.tags) ? r.tags : (r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : []),
      aiGenerated: !!r.ai_generated,
      assignedAt: r.assigned_at ? new Date(r.assigned_at).toISOString() : null,
      completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
      teacherId: r.teacher_id || null,
      qrToken: r.qr_token || null,
      maxScore: r.max_score == null ? 10 : Number(r.max_score),
      dueDate: r.due_date ? new Date(r.due_date).toISOString() : null,
      content: r.content || '',
    };
    return extras ? { ...base, ...extras } : base;
  }

  function scanUrlFor(req, token) {
    if (!token) return null;
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${proto}://${host}/a/${token}`;
  }

  // ── GET /api/assignments ─────────────────────────────────────────
  //   default: student view (own rows + all teacher-published with qr_token)
  //   ?role=teacher: assignments I created
  app.get('/api/assignments', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });

      const pool = getAsgnPool();
      const role = (req.query.role || '').toString().toLowerCase();

      let rows;
      if (role === 'teacher' || (user.role && /TEACHER|ADMIN/i.test(user.role) && role !== 'student')) {
        // Teacher: everything I own as teacher_id OR user_id (back-compat)
        const q = await pool.query(
          `SELECT a.*,
             COALESCE(s.c, 0) AS submission_count,
             COALESCE(s.avg_score, 0) AS avg_score
           FROM assignments a
           LEFT JOIN (
             SELECT assignment_id, COUNT(*)::int AS c, AVG(score) AS avg_score
             FROM assignment_submissions GROUP BY assignment_id
           ) s ON s.assignment_id = a.id
           WHERE a.teacher_id = $1 OR (a.user_id = $1 AND a.teacher_id IS NULL)
           ORDER BY a.created_at DESC
           LIMIT 200`,
          [user.id]
        );
        rows = q.rows.map((r) => asgnToClient(r, {
          submissionCount: Number(r.submission_count) || 0,
          avgScore: Number(r.avg_score) || 0,
          scanUrl: scanUrlFor(req, r.qr_token),
        }));
      } else {
        // Student: my rows (status ≠ recommended) + any teacher-published with qr_token
        const q = await pool.query(
          `SELECT * FROM assignments
             WHERE user_id = $1
                OR (teacher_id IS NOT NULL AND qr_token IS NOT NULL AND status IN ('pending','in-progress','published'))
             ORDER BY assigned_at DESC
             LIMIT 200`,
          [user.id]
        );
        rows = q.rows.map((r) => asgnToClient(r, { scanUrl: scanUrlFor(req, r.qr_token) }));

        // Auto-seed 3 demo rows for brand-new students with no data at all
        if (rows.length === 0) {
          const seeds = [
            { title: 'Phương trình bậc hai', subject: 'Toán', type: 'lesson', difficulty: 'medium', duration: 45, xp: 150, desc: 'Giải các bài toán phương trình bậc hai từ cơ bản đến nâng cao', tags: ['algebra'] },
            { title: 'Chuyển động thẳng đều', subject: 'Vật lý', type: 'lesson', difficulty: 'easy', duration: 30, xp: 100, desc: 'Phân tích chuyển động thẳng đều và các đại lượng liên quan', tags: ['kinematics'] },
            { title: 'Cấu tạo nguyên tử', subject: 'Hoá học', type: 'quiz', difficulty: 'medium', duration: 40, xp: 125, desc: 'Cấu tạo nguyên tử và bảng tuần hoàn nguyên tố', tags: ['chemistry'] },
          ];
          for (const s of seeds) {
            const id = newAsgnId();
            await pool.query(
              `INSERT INTO assignments (id,title,description,subject,assignment_type,status,difficulty,duration,xp_reward,user_id,tags,ai_generated)
               VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9,$10,false)`,
              [id, s.title, s.desc, s.subject, s.type, s.difficulty, s.duration, s.xp, user.id, JSON.stringify(s.tags)]
            );
          }
          const q2 = await pool.query(
            `SELECT * FROM assignments WHERE user_id = $1 ORDER BY assigned_at DESC LIMIT 200`,
            [user.id]
          );
          rows = q2.rows.map((r) => asgnToClient(r, { scanUrl: scanUrlFor(req, r.qr_token) }));
        }
      }

      return res.json(rows);
    } catch (err) {
      console.error('[assignments:list] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── GET /api/assignments/recommended ─────────────────────────────
  app.get('/api/assignments/recommended', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();

      const q = await pool.query(
        `SELECT * FROM assignments
           WHERE user_id = $1 AND status = 'recommended'
           ORDER BY assigned_at DESC LIMIT 20`,
        [user.id]
      );
      const rows = q.rows.map((r) => asgnToClient(r, { scanUrl: scanUrlFor(req, r.qr_token) }));
      return res.json(rows);
    } catch (err) {
      console.error('[assignments:recommended] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── GET /api/assignments/:id ─────────────────────────────────────
  app.get('/api/assignments/:id', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const q = await pool.query(`SELECT * FROM assignments WHERE id = $1 LIMIT 1`, [req.params.id]);
      if (q.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const r = q.rows[0];
      // Access: owner (user_id) OR teacher (teacher_id) OR if it has qr_token (public via QR in-app)
      if (r.user_id !== user.id && r.teacher_id !== user.id && !r.qr_token) {
        return res.status(403).json({ success: false, error: 'forbidden' });
      }
      return res.json(asgnToClient(r, { scanUrl: scanUrlFor(req, r.qr_token) }));
    } catch (err) {
      console.error('[assignments:get] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── POST /api/assignments ────────────────────────────────────────
  //   Teacher creates a QR-scannable assignment
  app.post('/api/assignments', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });

      const b = req.body || {};
      const title = String(b.title || '').trim();
      if (!title) return res.status(400).json({ success: false, error: 'title_required' });

      const pool = getAsgnPool();
      const id = newAsgnId();
      const qrToken = b.generateQr === false ? null : newQrToken();

      const row = {
        id,
        title,
        description: String(b.description || '').trim(),
        subject: String(b.subject || 'Chung'),
        type: String(b.type || 'lesson'),
        difficulty: String(b.difficulty || 'medium'),
        duration: Number(b.duration) || 30,
        xpReward: Number(b.xpReward) || 100,
        maxScore: Number(b.maxScore) || 10,
        content: String(b.content || ''),
        tags: Array.isArray(b.tags) ? b.tags : [],
        dueDate: b.dueDate ? new Date(b.dueDate) : null,
        status: b.status || 'published',
      };

      await pool.query(
        `INSERT INTO assignments
           (id, title, description, subject, assignment_type, status, difficulty,
            duration, xp_reward, user_id, teacher_id, qr_token, max_score, due_date,
            content, tags, ai_generated)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15,false)`,
        [
          row.id, row.title, row.description, row.subject, row.type, row.status,
          row.difficulty, row.duration, row.xpReward,
          user.id,                        // $10 — owner AND teacher
          qrToken,                        // $11
          row.maxScore,                   // $12
          row.dueDate,                    // $13
          row.content,                    // $14
          JSON.stringify(row.tags),       // $15
        ]
      );

      const q = await pool.query(`SELECT * FROM assignments WHERE id = $1`, [id]);
      const created = asgnToClient(q.rows[0], {
        scanUrl: scanUrlFor(req, qrToken),
        submissionCount: 0,
        avgScore: 0,
      });
      return res.status(201).json(created);
    } catch (err) {
      console.error('[assignments:create] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── PATCH /api/assignments/:id/progress ──────────────────────────
  app.patch('/api/assignments/:id/progress', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const progress = Math.max(0, Math.min(100, Number((req.body || {}).progress) || 0));
      const status = progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';
      const pool = getAsgnPool();
      const q = await pool.query(
        `UPDATE assignments SET progress=$1, status=$2, updated_at=NOW(),
            completed_at=CASE WHEN $2='completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
          WHERE id=$3 AND user_id=$4 RETURNING *`,
        [progress, status, req.params.id, user.id]
      );
      if (q.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      return res.json(asgnToClient(q.rows[0], { scanUrl: scanUrlFor(req, q.rows[0].qr_token) }));
    } catch (err) {
      console.error('[assignments:progress] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── POST /api/assignments/:id/complete ───────────────────────────
  app.post('/api/assignments/:id/complete', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const accuracy = (req.body || {}).accuracy == null ? null : Number((req.body || {}).accuracy);
      const pool = getAsgnPool();
      const q = await pool.query(
        `UPDATE assignments
            SET progress=100, status='completed', accuracy=COALESCE($1, accuracy),
                completed_at=NOW(), updated_at=NOW()
          WHERE id=$2 AND user_id=$3 RETURNING *`,
        [accuracy, req.params.id, user.id]
      );
      if (q.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      return res.json(asgnToClient(q.rows[0], { scanUrl: scanUrlFor(req, q.rows[0].qr_token) }));
    } catch (err) {
      console.error('[assignments:complete] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── DELETE /api/assignments/:id ──────────────────────────────────
  app.delete('/api/assignments/:id', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const q = await pool.query(
        `DELETE FROM assignments WHERE id=$1 AND (user_id=$2 OR teacher_id=$2) RETURNING id`,
        [req.params.id, user.id]
      );
      if (q.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      return res.json({ success: true, id: q.rows[0].id });
    } catch (err) {
      console.error('[assignments:delete] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── GET /api/assignments/:id/submissions  (teacher) ─────────────
  app.get('/api/assignments/:id/submissions', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const aq = await pool.query(`SELECT teacher_id, user_id FROM assignments WHERE id=$1`, [req.params.id]);
      if (aq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const a = aq.rows[0];
      if (a.teacher_id !== user.id && a.user_id !== user.id) {
        return res.status(403).json({ success: false, error: 'forbidden' });
      }
      const sq = await pool.query(
        `SELECT id, assignment_id, scanner_name, scanner_email, scanner_user_id,
                score, answer_text, time_spent, metadata, submitted_at
           FROM assignment_submissions
          WHERE assignment_id=$1
          ORDER BY submitted_at DESC LIMIT 500`,
        [req.params.id]
      );
      return res.json(sq.rows.map((r) => ({
        id: r.id,
        assignmentId: r.assignment_id,
        scannerName: r.scanner_name,
        scannerEmail: r.scanner_email,
        scannerUserId: r.scanner_user_id,
        score: r.score == null ? null : Number(r.score),
        answerText: r.answer_text,
        timeSpent: r.time_spent,
        metadata: r.metadata,
        submittedAt: r.submitted_at,
      })));
    } catch (err) {
      console.error('[assignments:submissions] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── GET /api/assignments/:id/stats  (teacher) ───────────────────
  app.get('/api/assignments/:id/stats', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const aq = await pool.query(`SELECT id, teacher_id, user_id, max_score, title FROM assignments WHERE id=$1`, [req.params.id]);
      if (aq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const a = aq.rows[0];
      if (a.teacher_id !== user.id && a.user_id !== user.id) {
        return res.status(403).json({ success: false, error: 'forbidden' });
      }
      const sq = await pool.query(
        `SELECT
             COUNT(*)::int                              AS total,
             COUNT(*) FILTER (WHERE score IS NOT NULL)::int AS scored,
             AVG(score)                                 AS avg_score,
             MIN(score)                                 AS min_score,
             MAX(score)                                 AS max_score,
             COUNT(DISTINCT COALESCE(scanner_email, scanner_name))::int AS unique_scanners
           FROM assignment_submissions WHERE assignment_id=$1`,
        [req.params.id]
      );
      const hq = await pool.query(
        `SELECT date_trunc('day', submitted_at) AS day, COUNT(*)::int AS c
           FROM assignment_submissions
          WHERE assignment_id=$1 AND submitted_at > NOW() - INTERVAL '30 days'
          GROUP BY 1 ORDER BY 1`,
        [req.params.id]
      );
      const s = sq.rows[0] || {};
      return res.json({
        assignmentId: a.id,
        title: a.title,
        maxScore: Number(a.max_score) || 10,
        total: Number(s.total) || 0,
        scored: Number(s.scored) || 0,
        avgScore: s.avg_score == null ? 0 : Number(s.avg_score),
        minScore: s.min_score == null ? 0 : Number(s.min_score),
        maxSubmittedScore: s.max_score == null ? 0 : Number(s.max_score),
        uniqueScanners: Number(s.unique_scanners) || 0,
        daily: hq.rows.map((r) => ({ day: r.day, count: r.c })),
      });
    } catch (err) {
      console.error('[assignments:stats] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // ASSIGNMENT TARGETING + IN-APP NOTIFICATIONS
  // ────────────────────────────────────────────────────────────────
  // Cho phép giáo viên:
  //   1. Tạo assignment từ Exam có sẵn (POST /from-exam)
  //   2. Giao bài cho student/class cụ thể (POST :id/targets)
  //   3. Học sinh được giao tự động nhận Notification trong app
  // ════════════════════════════════════════════════════════════════
  let _asgnTargetReady = false;
  async function ensureAsgnTargetTables() {
    if (_asgnTargetReady) return;
    const pool = getAsgnPool();
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AssignmentTarget" (
        id            TEXT PRIMARY KEY,
        "assignmentId" TEXT NOT NULL,
        "targetType"  TEXT NOT NULL,
        "targetId"    TEXT NOT NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("assignmentId", "targetType", "targetId")
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "AssignmentTarget_assignment_idx"
      ON "AssignmentTarget"("assignmentId")`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        id           TEXT PRIMARY KEY,
        "userId"     TEXT NOT NULL,
        "fromUserId" TEXT,
        type         TEXT NOT NULL,
        title        TEXT NOT NULL,
        body         TEXT,
        link         TEXT,
        metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
        read         BOOLEAN NOT NULL DEFAULT false,
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "Notification_user_idx"
      ON "Notification"("userId", "createdAt" DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "Notification_unread_idx"
      ON "Notification"("userId") WHERE read = false`);
    _asgnTargetReady = true;
  }

  // ── POST /api/assignments/from-exam — convert Exam → Assignment ──
  // Body: { examId, title?, description?, dueDate?, duration? }
  app.post('/api/assignments/from-exam', async (req, res) => {
    try {
      await ensureAsgnReady();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const { examId } = req.body || {};
      if (!examId) return res.status(400).json({ success: false, error: 'examId_required' });

      // Verify exam ownership + load metadata
      const ex = await pool.query(
        `SELECT id, title, description, "examType", duration, "totalScore", "totalQuestions"
           FROM "Exam" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [examId, user.id]
      );
      if (!ex.rows.length) {
        return res.status(404).json({ success: false, error: 'exam_not_found' });
      }
      const exam = ex.rows[0];
      let meta = {};
      try { meta = JSON.parse(exam.description || '{}'); } catch {}

      const id = newAsgnId();
      const qrToken = newQrToken();
      const title = String(req.body.title || exam.title || 'Bài tập từ đề thi');
      const subject = meta.subject || 'Chung';
      const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
      const duration = Number(req.body.duration) || Number(exam.duration) || 45;

      await pool.query(
        `INSERT INTO assignments
           (id, title, description, subject, assignment_type, status, difficulty,
            duration, xp_reward, user_id, teacher_id, qr_token, max_score, due_date,
            content, tags, ai_generated)
         VALUES ($1,$2,$3,$4,'quiz','published','medium',$5,100,$6,$6,$7,$8,$9,$10,$11,false)`,
        [id, title,
         String(req.body.description || meta.notes || `Đề thi gồm ${exam.totalQuestions} câu`),
         subject, duration, user.id, qrToken,
         Number(exam.totalScore) || 10, dueDate,
         JSON.stringify({ examId, examTitle: exam.title }),
         JSON.stringify(['from-exam'])]
      );
      const q = await pool.query(`SELECT * FROM assignments WHERE id=$1`, [id]);
      const created = asgnToClient(q.rows[0], {
        scanUrl: scanUrlFor(req, qrToken),
        submissionCount: 0, avgScore: 0,
      });
      console.log(`[assignments:from-exam] ✅ exam=${examId.slice(0,8)} → asgn=${id.slice(0,8)}`);
      return res.status(201).json(created);
    } catch (err) {
      console.error('[assignments:from-exam] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── GET /api/assignments/:id/targets — list targets ─────────────
  app.get('/api/assignments/:id/targets', async (req, res) => {
    try {
      await ensureAsgnReady();
      await ensureAsgnTargetTables();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      // Ownership check
      const own = await pool.query(
        `SELECT 1 FROM assignments WHERE id=$1 AND (user_id=$2 OR teacher_id=$2) LIMIT 1`,
        [req.params.id, user.id]
      );
      if (!own.rows.length) return res.status(404).json({ success: false, error: 'not_found' });

      const tRes = await pool.query(
        `SELECT * FROM "AssignmentTarget" WHERE "assignmentId"=$1 ORDER BY "createdAt" DESC`,
        [req.params.id]
      );
      // Enrich với tên class/student để FE hiển thị
      const targets = [];
      for (const t of tRes.rows) {
        let label = '—';
        try {
          if (t.targetType === 'class') {
            const r = await pool.query(`SELECT name FROM "TeacherClass" WHERE id=$1 LIMIT 1`, [t.targetId]);
            label = r.rows[0]?.name || `Lớp ${t.targetId.slice(0,8)}`;
          } else if (t.targetType === 'student') {
            const r = await pool.query(`SELECT name FROM "ClassStudent" WHERE id=$1 LIMIT 1`, [t.targetId]);
            label = r.rows[0]?.name || `HS ${t.targetId.slice(0,8)}`;
          }
        } catch {}
        targets.push({ id: t.id, type: t.targetType, targetId: t.targetId, label, createdAt: t.createdAt });
      }
      return res.json({ targets });
    } catch (err) {
      console.error('[assignments:targets:list] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal' });
    }
  });

  // ── POST /api/assignments/:id/targets — assign to classes/students
  // Body: { classIds: [], studentIds: [] }
  // Side effect: tạo Notification cho mỗi HS được giao (qua ClassStudent.email →
  // User lookup; nếu không có User account thì skip notification, vẫn giao bài).
  app.post('/api/assignments/:id/targets', async (req, res) => {
    try {
      await ensureAsgnReady();
      await ensureAsgnTargetTables();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const aRes = await pool.query(
        `SELECT id, title, qr_token FROM assignments WHERE id=$1 AND (user_id=$2 OR teacher_id=$2) LIMIT 1`,
        [req.params.id, user.id]
      );
      if (!aRes.rows.length) return res.status(404).json({ success: false, error: 'not_found' });
      const asgn = aRes.rows[0];
      const classIds   = Array.isArray(req.body?.classIds)   ? req.body.classIds.filter(Boolean) : [];
      const studentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds.filter(Boolean) : [];
      if (classIds.length === 0 && studentIds.length === 0) {
        return res.status(400).json({ success: false, error: 'no_targets' });
      }

      // Insert AssignmentTarget rows
      let added = 0;
      for (const cid of classIds) {
        try {
          const { rowCount } = await pool.query(
            `INSERT INTO "AssignmentTarget" (id, "assignmentId", "targetType", "targetId")
             VALUES ($1,$2,'class',$3)
             ON CONFLICT ("assignmentId","targetType","targetId") DO NOTHING`,
            [newAsgnId('tg_'), req.params.id, cid]
          );
          if (rowCount) added++;
        } catch {}
      }
      for (const sid of studentIds) {
        try {
          const { rowCount } = await pool.query(
            `INSERT INTO "AssignmentTarget" (id, "assignmentId", "targetType", "targetId")
             VALUES ($1,$2,'student',$3)
             ON CONFLICT ("assignmentId","targetType","targetId") DO NOTHING`,
            [newAsgnId('tg_'), req.params.id, sid]
          );
          if (rowCount) added++;
        } catch {}
      }

      // Resolve student userIds (qua email match) để gửi notification
      // ClassStudent có cột email → JOIN User để lấy id của user account
      const studentRowIds = new Set(studentIds);
      if (classIds.length > 0) {
        const r = await pool.query(
          `SELECT id FROM "ClassStudent" WHERE "classId" = ANY($1::text[])`,
          [classIds]
        );
        for (const row of r.rows) studentRowIds.add(row.id);
      }
      let notified = 0;
      if (studentRowIds.size > 0) {
        const userRes = await pool.query(
          `SELECT u.id AS uid
             FROM "ClassStudent" cs
             JOIN "User" u ON LOWER(u.email) = LOWER(cs.email)
            WHERE cs.id = ANY($1::text[]) AND cs.email IS NOT NULL`,
          [Array.from(studentRowIds)]
        );
        const link = `/student/assignments?focus=${encodeURIComponent(req.params.id)}`;
        for (const ur of userRes.rows) {
          try {
            await pool.query(
              `INSERT INTO "Notification"
                 (id, "userId", "fromUserId", type, title, body, link, metadata)
               VALUES ($1,$2,$3,'assignment',$4,$5,$6,$7)`,
              [newAsgnId('nt_'), ur.uid, user.id,
               `Bài tập mới: ${asgn.title}`,
               'Giáo viên vừa giao bài cho bạn. Bấm để xem.',
               link,
               JSON.stringify({ assignmentId: req.params.id, qrToken: asgn.qr_token })]
            );
            notified++;
          } catch (e) {
            console.warn('[notify:assignment] insert fail:', e.message.slice(0, 80));
          }
        }
      }
      console.log(`[assignments:targets:assign] ✅ asgn=${req.params.id.slice(0,8)} added=${added} notified=${notified}`);
      return res.json({ ok: true, added, notified });
    } catch (err) {
      console.error('[assignments:targets:assign] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── DELETE /api/assignments/:id/targets/:targetType/:targetId
  app.delete('/api/assignments/:id/targets/:targetType/:targetId', async (req, res) => {
    try {
      await ensureAsgnTargetTables();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const own = await pool.query(
        `SELECT 1 FROM assignments WHERE id=$1 AND (user_id=$2 OR teacher_id=$2) LIMIT 1`,
        [req.params.id, user.id]
      );
      if (!own.rows.length) return res.status(404).json({ success: false, error: 'not_found' });
      await pool.query(
        `DELETE FROM "AssignmentTarget"
          WHERE "assignmentId"=$1 AND "targetType"=$2 AND "targetId"=$3`,
        [req.params.id, req.params.targetType, req.params.targetId]
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error('[assignments:targets:del] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal' });
    }
  });

  // ── GET /api/notifications — list user's notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      await ensureAsgnTargetTables();
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.json({ notifications: [], unreadCount: 0 });
      const pool = getAsgnPool();
      const onlyUnread = req.query.unread === '1';
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const where = onlyUnread ? `"userId"=$1 AND read=false` : `"userId"=$1`;
      const r = await pool.query(
        `SELECT * FROM "Notification" WHERE ${where} ORDER BY "createdAt" DESC LIMIT $2`,
        [user.id, limit]
      );
      const cRes = await pool.query(
        `SELECT COUNT(*)::int AS n FROM "Notification" WHERE "userId"=$1 AND read=false`,
        [user.id]
      );
      return res.json({
        notifications: r.rows,
        unreadCount: Number(cRes.rows[0]?.n) || 0,
      });
    } catch (err) {
      console.error('[notifications:list] ❌', err.message);
      return res.json({ notifications: [], unreadCount: 0 });
    }
  });

  // ── PATCH /api/notifications/:id/read
  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      await pool.query(
        `UPDATE "Notification" SET read=true WHERE id=$1 AND "userId"=$2`,
        [req.params.id, user.id]
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error('[notifications:read] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal' });
    }
  });

  // ── POST /api/notifications/read-all
  app.post('/api/notifications/read-all', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ success: false, error: 'unauthorized' });
      const pool = getAsgnPool();
      const { rowCount } = await pool.query(
        `UPDATE "Notification" SET read=true WHERE "userId"=$1 AND read=false`,
        [user.id]
      );
      return res.json({ ok: true, marked: rowCount });
    } catch (err) {
      console.error('[notifications:read-all] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal' });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // TEACHER ↔ STUDENT LINK — Sync data riêng tư giữa GV và HS
  // ────────────────────────────────────────────────────────────────
  // Many-to-many: 1 HS có thể kết nối nhiều GV (theo môn).
  // 3 luồng:
  //   - Auto: khi HS đăng ký + email match ClassStudent → status=approved
  //   - Student-init: HS request → notification GV → approve/reject
  //   - Teacher-init: GV mời → notification HS → approve/reject
  // Sau khi approved: assignment + grade + notification chỉ flow giữa cặp.
  // Reject anti-spam: 30 ngày không cho request lại cùng cặp.
  // Disconnect: data cũ giữ (read-only), chỉ stop sync mới.
  // ════════════════════════════════════════════════════════════════
  let _tslReady = false;
  async function ensureTSLTable() {
    if (_tslReady) return;
    const pool = getAsgnPool();
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TeacherStudentLink" (
        id            TEXT PRIMARY KEY,
        "teacherId"   TEXT NOT NULL,
        "studentId"   TEXT NOT NULL,
        status        TEXT NOT NULL,
        "initiatedBy" TEXT NOT NULL,
        message       TEXT,
        "approvedAt"  TIMESTAMPTZ,
        "rejectedAt"  TIMESTAMPTZ,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("teacherId", "studentId")
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "TSL_teacher_idx"
      ON "TeacherStudentLink"("teacherId", status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "TSL_student_idx"
      ON "TeacherStudentLink"("studentId", status)`);
    _tslReady = true;
  }

  // Helper: gửi notification, fail silent
  async function sendNotif(pool, userId, fromUserId, type, title, body, link, metadata) {
    try {
      await pool.query(
        `INSERT INTO "Notification"
           (id, "userId", "fromUserId", type, title, body, link, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [newAsgnId('nt_'), userId, fromUserId, type, title, body || null, link || null,
         metadata ? JSON.stringify(metadata) : '{}']
      );
    } catch (e) { console.warn('[notif:send]', e.message.slice(0, 80)); }
  }

  // ── POST /api/teacher-student-link/request ── HS gửi request tới GV
  // Body: { teacherEmail OR teacherId, message? }
  app.post('/api/teacher-student-link/request', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      if (!/STUDENT/i.test(user.role || '')) return res.status(403).json({ error: 'Chỉ học sinh được dùng endpoint này' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      const { teacherEmail, teacherId: tId, message } = req.body || {};
      if (!teacherEmail && !tId) return res.status(400).json({ error: 'Thiếu teacherEmail hoặc teacherId' });
      // Resolve teacher
      let teacher;
      if (tId) {
        const r = await pool.query(`SELECT id, email, name FROM "User" WHERE id=$1 AND UPPER(role)='TEACHER' LIMIT 1`, [tId]);
        teacher = r.rows[0];
      } else {
        const r = await pool.query(`SELECT id, email, name FROM "User" WHERE LOWER(email)=LOWER($1) AND UPPER(role)='TEACHER' LIMIT 1`, [teacherEmail]);
        teacher = r.rows[0];
      }
      if (!teacher) return res.status(404).json({ error: 'Không tìm thấy giáo viên' });
      if (teacher.id === user.id) return res.status(400).json({ error: 'Không thể tự kết nối với chính mình' });
      // Check existing link
      const existing = await pool.query(
        `SELECT id, status, "rejectedAt" FROM "TeacherStudentLink" WHERE "teacherId"=$1 AND "studentId"=$2`,
        [teacher.id, user.id]
      );
      if (existing.rows[0]) {
        const e = existing.rows[0];
        if (e.status === 'approved')  return res.status(409).json({ error: 'Đã kết nối với GV này rồi' });
        if (e.status === 'pending')   return res.status(409).json({ error: 'Đã gửi yêu cầu, đang chờ duyệt' });
        if (e.status === 'rejected') {
          // Anti-spam: 30 ngày không cho request lại
          const daysSince = (Date.now() - new Date(e.rejectedAt).getTime()) / 86_400_000;
          if (daysSince < 30) {
            return res.status(429).json({ error: `GV đã từ chối — vui lòng chờ ${Math.ceil(30 - daysSince)} ngày nữa` });
          }
          // Hết 30 ngày → reset link để request lại
          await pool.query(`DELETE FROM "TeacherStudentLink" WHERE id=$1`, [e.id]);
        }
      }
      const id = newAsgnId('tsl_');
      await pool.query(
        `INSERT INTO "TeacherStudentLink"
           (id, "teacherId", "studentId", status, "initiatedBy", message)
         VALUES ($1, $2, $3, 'pending', 'student', $4)`,
        [id, teacher.id, user.id, message ? String(message).slice(0, 500) : null]
      );
      // Notify teacher
      await sendNotif(pool, teacher.id, user.id, 'link_request',
        `Học sinh ${user.email} muốn kết nối`,
        message ? String(message).slice(0, 200) : 'Bấm để xem chi tiết và duyệt yêu cầu',
        '/teacher/student-requests',
        { linkId: id, studentId: user.id, studentEmail: user.email });
      return res.status(201).json({ ok: true, linkId: id });
    } catch (err) {
      console.error('[tsl:request]', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher-student-link/invite ── GV mời HS
  // Body: { studentEmail, message? }
  app.post('/api/teacher-student-link/invite', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      if (!/TEACHER|ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Chỉ giáo viên được dùng endpoint này' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      const { studentEmail, message } = req.body || {};
      if (!studentEmail) return res.status(400).json({ error: 'Thiếu studentEmail' });
      const r = await pool.query(`SELECT id, email, name FROM "User" WHERE LOWER(email)=LOWER($1) LIMIT 1`, [studentEmail]);
      const student = r.rows[0];
      if (!student) return res.status(404).json({ error: 'HS chưa có tài khoản — họ cần đăng ký với email này trước' });
      if (student.id === user.id) return res.status(400).json({ error: 'Không thể tự mời chính mình' });
      const existing = await pool.query(
        `SELECT id, status FROM "TeacherStudentLink" WHERE "teacherId"=$1 AND "studentId"=$2`,
        [user.id, student.id]
      );
      if (existing.rows[0]?.status === 'approved') return res.status(409).json({ error: 'Đã kết nối với HS này' });
      if (existing.rows[0]?.status === 'pending')  return res.status(409).json({ error: 'Đã gửi lời mời, đang chờ HS duyệt' });
      if (existing.rows[0]) {
        await pool.query(`DELETE FROM "TeacherStudentLink" WHERE id=$1`, [existing.rows[0].id]);
      }
      const id = newAsgnId('tsl_');
      await pool.query(
        `INSERT INTO "TeacherStudentLink"
           (id, "teacherId", "studentId", status, "initiatedBy", message)
         VALUES ($1, $2, $3, 'pending', 'teacher', $4)`,
        [id, user.id, student.id, message ? String(message).slice(0, 500) : null]
      );
      await sendNotif(pool, student.id, user.id, 'link_request',
        `Giáo viên ${user.email} mời bạn kết nối`,
        message ? String(message).slice(0, 200) : 'Bấm để duyệt — bài tập sẽ được đồng bộ sau khi đồng ý',
        '/student/teachers',
        { linkId: id, teacherId: user.id, teacherEmail: user.email });
      return res.status(201).json({ ok: true, linkId: id });
    } catch (err) {
      console.error('[tsl:invite]', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher-student-link/:id/approve ── người nhận đồng ý
  app.post('/api/teacher-student-link/:id/approve', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      // Phải là người nhận của request (initiatedBy != user role)
      const r = await pool.query(`SELECT * FROM "TeacherStudentLink" WHERE id=$1`, [req.params.id]);
      const link = r.rows[0];
      if (!link) return res.status(404).json({ error: 'Yêu cầu không tồn tại' });
      if (link.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý' });
      const isReceiverOfStudentReq = link.initiatedBy === 'student' && link.teacherId === user.id;
      const isReceiverOfTeacherReq = link.initiatedBy === 'teacher' && link.studentId === user.id;
      if (!isReceiverOfStudentReq && !isReceiverOfTeacherReq) {
        return res.status(403).json({ error: 'Bạn không phải người nhận yêu cầu này' });
      }
      await pool.query(`UPDATE "TeacherStudentLink" SET status='approved', "approvedAt"=NOW() WHERE id=$1`, [req.params.id]);
      // Notify initiator
      const initiatorId = link.initiatedBy === 'student' ? link.studentId : link.teacherId;
      await sendNotif(pool, initiatorId, user.id, 'link_approved',
        `${user.email} đã đồng ý kết nối`,
        'Bài tập + điểm số sẽ được đồng bộ từ giờ',
        link.initiatedBy === 'student' ? '/student/teachers' : '/teacher/student-requests',
        { linkId: link.id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[tsl:approve]', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher-student-link/:id/reject
  app.post('/api/teacher-student-link/:id/reject', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      const r = await pool.query(`SELECT * FROM "TeacherStudentLink" WHERE id=$1`, [req.params.id]);
      const link = r.rows[0];
      if (!link) return res.status(404).json({ error: 'Yêu cầu không tồn tại' });
      if (link.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý' });
      const isReceiverOfStudentReq = link.initiatedBy === 'student' && link.teacherId === user.id;
      const isReceiverOfTeacherReq = link.initiatedBy === 'teacher' && link.studentId === user.id;
      if (!isReceiverOfStudentReq && !isReceiverOfTeacherReq) {
        return res.status(403).json({ error: 'Bạn không phải người nhận' });
      }
      await pool.query(`UPDATE "TeacherStudentLink" SET status='rejected', "rejectedAt"=NOW() WHERE id=$1`, [req.params.id]);
      const initiatorId = link.initiatedBy === 'student' ? link.studentId : link.teacherId;
      await sendNotif(pool, initiatorId, user.id, 'link_rejected',
        `Yêu cầu kết nối bị từ chối`,
        '30 ngày sau bạn có thể gửi lại nếu muốn', null, { linkId: link.id });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/teacher-student-link/pending ── inbox của user (có cả request gửi đi và nhận về)
  app.get('/api/teacher-student-link/pending', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.json({ incoming: [], outgoing: [] });
      await ensureTSLTable();
      const pool = getAsgnPool();
      // Incoming: yêu cầu cần tôi duyệt
      const incomingQ = await pool.query(`
        SELECT tsl.*,
               other.email AS "otherEmail",
               other.name  AS "otherName",
               other.image AS "otherImage"
          FROM "TeacherStudentLink" tsl
          JOIN "User" other ON other.id = CASE
            WHEN tsl."initiatedBy" = 'student' THEN tsl."studentId"
            WHEN tsl."initiatedBy" = 'teacher' THEN tsl."teacherId"
          END
         WHERE tsl.status = 'pending'
           AND ((tsl."initiatedBy" = 'student' AND tsl."teacherId" = $1)
                OR (tsl."initiatedBy" = 'teacher' AND tsl."studentId" = $1))
         ORDER BY tsl."createdAt" DESC
      `, [user.id]);
      // Outgoing: yêu cầu tôi đã gửi đang chờ
      const outgoingQ = await pool.query(`
        SELECT tsl.*,
               other.email AS "otherEmail",
               other.name  AS "otherName",
               other.image AS "otherImage"
          FROM "TeacherStudentLink" tsl
          JOIN "User" other ON other.id = CASE
            WHEN tsl."initiatedBy" = 'student' THEN tsl."teacherId"
            WHEN tsl."initiatedBy" = 'teacher' THEN tsl."studentId"
          END
         WHERE tsl.status = 'pending'
           AND ((tsl."initiatedBy" = 'student' AND tsl."studentId" = $1)
                OR (tsl."initiatedBy" = 'teacher' AND tsl."teacherId" = $1))
         ORDER BY tsl."createdAt" DESC
      `, [user.id]);
      return res.json({ incoming: incomingQ.rows, outgoing: outgoingQ.rows });
    } catch (err) {
      console.error('[tsl:pending]', err.message);
      return res.json({ incoming: [], outgoing: [] });
    }
  });

  // ── GET /api/teacher/my-students ── list HS approved của GV
  app.get('/api/teacher/my-students', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      const { rows } = await pool.query(`
        SELECT tsl.id AS "linkId", tsl."initiatedBy", tsl."approvedAt",
               u.id, u.email, u.name, u.image
          FROM "TeacherStudentLink" tsl
          JOIN "User" u ON u.id = tsl."studentId"
         WHERE tsl."teacherId" = $1 AND tsl.status = 'approved'
         ORDER BY tsl."approvedAt" DESC NULLS LAST
      `, [user.id]);
      return res.json({ students: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/teacher/analytics?period=week|month|semester ──
  // Aggregate analytics theo dữ liệu THẬT từ:
  //   1. ClassStudent của TeacherClass mà GV quản lý (HS đã import)
  //   2. TeacherStudentLink approved (HS chủ động kết nối với GV)
  //   3. GradedSheet (điểm GV đã chấm, là source of truth cho score)
  //
  // Trả về cùng shape với FE TeacherAnalyticsPage:
  //   { totalStudents, averageScore, completionRate, engagementScore,
  //     topPerformingStudents, strugglingStudents, subjectPerformance,
  //     weeklyProgress }
  app.get('/api/teacher/analytics', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      const period = String(req.query.period || 'month');
      // Khoảng thời gian
      const sinceDays = period === 'week' ? 7 : period === 'semester' ? 180 : 30;
      const sinceISO = new Date(Date.now() - sinceDays * 86400_000).toISOString();

      // ── 1. Tập students = ClassStudent (in classes của GV) ∪ TSL approved ──
      // Dedupe theo email (case-insensitive), giữ ưu tiên data từ TSL (có User.id)
      const { rows: classStudents } = await pool.query(`
        SELECT cs.id AS "csId", cs.name, cs.email, cs."classId", tc.name AS "className"
          FROM "ClassStudent" cs
          JOIN "TeacherClass" tc ON tc.id = cs."classId"
         WHERE tc."teacherId" = $1
      `, [user.id]).catch(e => {
        console.warn('[analytics:classStudents]', e.message);
        return { rows: [] };
      });
      const { rows: linkedStudents } = await pool.query(`
        SELECT u.id AS "userId", u.name, u.email
          FROM "TeacherStudentLink" tsl
          JOIN "User" u ON u.id = tsl."studentId"
         WHERE tsl."teacherId" = $1 AND tsl.status = 'approved'
      `, [user.id]).catch(e => {
        console.warn('[analytics:linkedStudents]', e.message);
        return { rows: [] };
      });
      // Merge dedupe theo email
      const studentMap = {};   // email_lower → { name, email, classNames: Set, userId? }
      for (const r of classStudents) {
        const k = String(r.email || '').toLowerCase().trim();
        if (!k) continue;
        if (!studentMap[k]) studentMap[k] = { name: r.name, email: r.email, classNames: new Set(), userId: null };
        if (r.className) studentMap[k].classNames.add(r.className);
      }
      for (const r of linkedStudents) {
        const k = String(r.email || '').toLowerCase().trim();
        if (!k) continue;
        if (!studentMap[k]) studentMap[k] = { name: r.name, email: r.email, classNames: new Set(), userId: r.userId };
        else { studentMap[k].userId = r.userId; if (!studentMap[k].name) studentMap[k].name = r.name; }
      }
      const allStudents = Object.values(studentMap);

      // ── 2. GradedSheet của GV trong period ──
      const { rows: graded } = await pool.query(`
        SELECT "studentName", "examCode", "className", score, "maxScore", "createdAt"
          FROM "GradedSheet"
         WHERE "teacherId" = $1 AND "createdAt" >= $2
         ORDER BY "createdAt" ASC
      `, [user.id, sinceISO]).catch(e => {
        console.warn('[analytics:graded]', e.message);
        return { rows: [] };
      });

      // ── 3. Per-student aggregates ──
      // Index graded theo studentName lowercase (vì GradedSheet ko ref tới User.id,
      // chỉ có studentName text từ OCR)
      const perStudent = {};   // nameKey → { name, scores: [], normalizedScores: [], firstScore, lastScore }
      for (const g of graded) {
        const nameKey = String(g.studentName || '').toLowerCase().trim();
        if (!nameKey) continue;
        const norm = g.maxScore > 0 ? (Number(g.score) / Number(g.maxScore)) * 100 : Number(g.score);
        if (!perStudent[nameKey]) perStudent[nameKey] = { name: g.studentName, normalizedScores: [], rawScores: [], examCodes: new Set() };
        perStudent[nameKey].normalizedScores.push(norm);
        perStudent[nameKey].rawScores.push({ score: Number(g.score), max: Number(g.maxScore) });
        if (g.examCode) perStudent[nameKey].examCodes.add(g.examCode);
      }
      // Match perStudent với allStudents — fuzzy by name lowercase
      const enrichedStudents = allStudents.map(s => {
        const nameKey = String(s.name || '').toLowerCase().trim();
        const ps = perStudent[nameKey];
        const scores = ps?.normalizedScores || [];
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const improvement = scores.length >= 2
          ? Math.round(scores[scores.length - 1] - scores[0])
          : 0;
        return {
          name: s.name,
          email: s.email,
          className: Array.from(s.classNames).join(', ') || null,
          isLinked: !!s.userId,
          averageScore: avg != null ? Math.round(avg * 10) / 10 : null,
          examCount: scores.length,
          improvement,
        };
      });

      // ── 4. Top-level aggregates ──
      const studentsWithScore = enrichedStudents.filter(s => s.averageScore != null);
      const totalStudents = enrichedStudents.length;
      const averageScore = studentsWithScore.length > 0
        ? Math.round((studentsWithScore.reduce((a, s) => a + (s.averageScore || 0), 0) / studentsWithScore.length) * 10) / 10
        : 0;
      // completionRate: % students có ≥1 exam đã chấm trong period
      const completionRate = totalStudents > 0
        ? Math.round((studentsWithScore.length / totalStudents) * 1000) / 10
        : 0;
      // engagementScore: % students có ≥3 examCount (engaged) — rough metric
      const engagedCount = enrichedStudents.filter(s => s.examCount >= 3).length;
      const engagementScore = totalStudents > 0
        ? Math.round((engagedCount / totalStudents) * 1000) / 10
        : 0;

      // ── 5. Top performing (top 3 by avg, ≥1 exam) ──
      const topPerformingStudents = [...studentsWithScore]
        .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
        .slice(0, 3)
        .map(s => ({ name: s.name, score: s.averageScore || 0, improvement: s.improvement }));

      // ── 6. Struggling (avg < 50 hoặc 0 exam, top 5) ──
      const strugglingStudents = [
        ...studentsWithScore.filter(s => (s.averageScore || 0) < 50)
          .sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0)),
        ...enrichedStudents.filter(s => s.examCount === 0),
      ].slice(0, 5).map(s => ({
        name: s.name,
        score: s.averageScore == null ? 0 : Math.round(s.averageScore),
        issues: s.examCount === 0
          ? ['Chưa làm bài kiểm tra nào trong kỳ', 'Cần liên hệ phụ huynh']
          : [`Điểm dưới 5/10 (${(s.averageScore || 0).toFixed(1)})`, 'Cần ôn tập thêm'],
      }));

      // ── 7. Subject performance (group GradedSheet by examCode) ──
      const bySubject = {};
      for (const g of graded) {
        const code = g.examCode || 'Khác';
        if (!bySubject[code]) bySubject[code] = { scores: [], dates: [] };
        const norm = g.maxScore > 0 ? (Number(g.score) / Number(g.maxScore)) * 100 : Number(g.score);
        bySubject[code].scores.push(norm);
        bySubject[code].dates.push(new Date(g.createdAt).getTime());
      }
      const subjectPerformance = Object.entries(bySubject)
        .map(([subject, data]) => {
          const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          // Trend: so sánh nửa đầu vs nửa sau period
          const half = Math.floor(data.scores.length / 2);
          let trend = 'stable';
          if (data.scores.length >= 4) {
            const firstHalfAvg = data.scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
            const secondHalfAvg = data.scores.slice(half).reduce((a, b) => a + b, 0) / (data.scores.length - half);
            if (secondHalfAvg > firstHalfAvg + 3) trend = 'up';
            else if (secondHalfAvg < firstHalfAvg - 3) trend = 'down';
          }
          return { subject, averageScore: Math.round(avg * 10) / 10, trend, examCount: data.scores.length };
        })
        .sort((a, b) => b.examCount - a.examCount)
        .slice(0, 6);

      // ── 8. Weekly progress (last 4 weeks of period) ──
      const weeks = [];
      const now = Date.now();
      for (let w = 3; w >= 0; w--) {
        const wStart = now - (w + 1) * 7 * 86400_000;
        const wEnd = now - w * 7 * 86400_000;
        const inWeek = graded.filter(g => {
          const t = new Date(g.createdAt).getTime();
          return t >= wStart && t < wEnd;
        });
        const scores = inWeek.map(g => g.maxScore > 0 ? (Number(g.score) / Number(g.maxScore)) * 100 : Number(g.score));
        const avgWeek = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        // completion = % students có exam trong tuần đó
        const studentsInWeek = new Set(inWeek.map(g => String(g.studentName || '').toLowerCase()));
        const completion = totalStudents > 0
          ? Math.round((studentsInWeek.size / totalStudents) * 100)
          : 0;
        weeks.push({
          week: `Tuần ${4 - w}`,
          completion,
          averageScore: Math.round(avgWeek * 10) / 10,
        });
      }

      return res.json({
        period,
        meta: {
          fromClassStudent: classStudents.length,
          fromTeacherStudentLink: linkedStudents.length,
          uniqueStudents: totalStudents,
          gradedSheets: graded.length,
        },
        totalStudents,
        averageScore,
        completionRate,
        engagementScore,
        topPerformingStudents,
        strugglingStudents,
        subjectPerformance,
        weeklyProgress: weeks,
      });
    } catch (err) {
      console.error('[teacher:analytics]', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/teacher/roster ──
  // Roster đầy đủ HS GV quản lý (UNION: ClassStudent ∪ TSL approved).
  // Đây là source of truth cho mọi UI cần "danh sách HS của GV":
  // AI Dashboard, Analytics, Notifications, Bulk message...
  //
  // Trả về: [{ id, name, email, avatar, classNames[], isLinked, userId? }]
  // Dedupe theo email (LOWER). Ưu tiên data TSL (có User.id).
  app.get('/api/teacher/roster', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureTSLTable();
      const pool = getAsgnPool();

      // 1. Students từ ClassStudent (đã import qua xls)
      const { rows: classStudents } = await pool.query(`
        SELECT cs.id, cs.name, cs.email, cs."classId", tc.name AS "className"
          FROM "ClassStudent" cs
          JOIN "TeacherClass" tc ON tc.id = cs."classId"
         WHERE tc."teacherId" = $1
         ORDER BY cs.name ASC
      `, [user.id]).catch(e => { console.warn('[roster:cs]', e.message); return { rows: [] }; });

      // 2. Students linked qua TSL (có User account)
      const { rows: linkedStudents } = await pool.query(`
        SELECT u.id AS "userId", u.name, u.email, u.image AS avatar
          FROM "TeacherStudentLink" tsl
          JOIN "User" u ON u.id = tsl."studentId"
         WHERE tsl."teacherId" = $1 AND tsl.status = 'approved'
      `, [user.id]).catch(e => { console.warn('[roster:tsl]', e.message); return { rows: [] }; });

      // Dedupe theo email lowercase
      const map = {};   // emailLower → { id, name, email, avatar, classNames[], userId, isLinked }
      for (const r of classStudents) {
        const k = String(r.email || '').toLowerCase().trim();
        if (!k) continue;
        if (!map[k]) map[k] = {
          id: r.id,                     // ClassStudent.id (fallback nếu chưa link)
          name: r.name, email: r.email,
          avatar: null,
          classNames: [],
          userId: null, isLinked: false,
        };
        if (r.className && !map[k].classNames.includes(r.className)) {
          map[k].classNames.push(r.className);
        }
      }
      for (const r of linkedStudents) {
        const k = String(r.email || '').toLowerCase().trim();
        if (!k) continue;
        if (!map[k]) {
          map[k] = {
            id: r.userId, name: r.name, email: r.email,
            avatar: r.avatar || null,
            classNames: [],
            userId: r.userId, isLinked: true,
          };
        } else {
          map[k].id = r.userId;     // ưu tiên User.id để match với leaderboard
          map[k].userId = r.userId;
          map[k].isLinked = true;
          map[k].avatar = r.avatar || map[k].avatar;
          if (!map[k].name) map[k].name = r.name;
        }
      }

      const students = Object.values(map);
      res.json({
        students,
        count: students.length,
        meta: {
          fromClassStudent: classStudents.length,
          fromTSL: linkedStudents.length,
        },
      });
    } catch (err) {
      console.error('[teacher:roster]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════════
  // LEARNING PATHS — GV soạn lộ trình học tập riêng cho từng HS
  // Tables (lazy migration):
  //   "LearningPath"     — path metadata + modules JSONB
  //   "LearningPathAssignment" — gán path cho HS (M:N)
  // ════════════════════════════════════════════════════════════
  let _lpReady = false;
  async function ensureLPTables() {
    if (_lpReady) return;
    const pool = getAsgnPool();
    if (!pool) return;
    try {
      // CREATE IF NOT EXISTS — sẽ noop nếu Prisma đã tạo table với schema cũ
      await pool.query(`CREATE TABLE IF NOT EXISTS "LearningPath" (
        id TEXT PRIMARY KEY
      )`);
      // ALTER TABLE ADD COLUMN IF NOT EXISTS — patch missing cols cho table cũ
      // (idempotent, an toàn chạy lại nhiều lần)
      const lpCols = [
        ['"teacherId"',     'TEXT'],
        ['name',            'TEXT'],
        ['description',     'TEXT'],
        ['subject',         'TEXT'],
        ['difficulty',      `TEXT DEFAULT 'medium'`],
        ['modules',         `JSONB DEFAULT '[]'::jsonb`],
        ['"estimatedDays"', 'INT DEFAULT 7'],
        ['"totalXP"',       'INT DEFAULT 0'],
        ['"totalDuration"', 'INT DEFAULT 0'],
        ['"isTemplate"',    'BOOLEAN DEFAULT false'],
        ['"createdAt"',     'TIMESTAMPTZ DEFAULT NOW()'],
        ['"updatedAt"',     'TIMESTAMPTZ DEFAULT NOW()'],
      ];
      for (const [col, typeDef] of lpCols) {
        try {
          await pool.query(`ALTER TABLE "LearningPath" ADD COLUMN IF NOT EXISTS ${col} ${typeDef}`);
        } catch (e) {
          console.warn('[lp:alter]', col, e.message);
        }
      }
      // Discover-and-DROP NOT NULL cho columns ngoài whitelist (Prisma schema cũ
      // có thể có FK columns mà code mới không biết)
      try {
        const knownCols = new Set([
          'id', 'teacherId', 'name', 'description', 'subject', 'difficulty',
          'modules', 'estimatedDays', 'totalXP', 'totalDuration', 'isTemplate',
          'createdAt', 'updatedAt',
        ]);
        const { rows: schemaCols } = await pool.query(
          `SELECT column_name, is_nullable
             FROM information_schema.columns
            WHERE table_name = 'LearningPath' AND table_schema = 'public'`
        );
        for (const c of schemaCols) {
          if (!knownCols.has(c.column_name) && c.is_nullable === 'NO') {
            try {
              await pool.query(`ALTER TABLE "LearningPath" ALTER COLUMN "${c.column_name}" DROP NOT NULL`);
            } catch (e) {
              console.warn('[lp:drop-not-null]', c.column_name, e.message);
            }
          }
        }
        // Drop FK constraints (Prisma legacy có thể ref tới Class table mà code mới ko dùng)
        const { rows: fks } = await pool.query(
          `SELECT con.conname
             FROM pg_constraint con
             JOIN pg_class cls ON cls.oid = con.conrelid
            WHERE cls.relname = 'LearningPath' AND con.contype = 'f'`
        );
        for (const fk of fks) {
          try {
            await pool.query(`ALTER TABLE "LearningPath" DROP CONSTRAINT IF EXISTS "${fk.conname}"`);
          } catch (e) {
            console.warn('[lp:drop-fk]', fk.conname, e.message);
          }
        }
      } catch (e) {
        console.warn('[lp:discover]', e.message);
      }
      // Backfill teacherId NULL cho rows cũ (nếu có) — set = '__legacy__' để tránh
      // crash query với WHERE "teacherId" = $1
      try {
        await pool.query(`UPDATE "LearningPath" SET "teacherId" = '__legacy__' WHERE "teacherId" IS NULL`);
      } catch (e) { /* ignore */ }
      // ALTER COLUMN SET DEFAULT — ADD COLUMN IF NOT EXISTS không update DEFAULT
      // cho col đã tồn tại (Prisma có thể tạo timestamp NOT NULL không default).
      // Set DEFAULT cho mọi col có default để INSERT không cần điền tay.
      const lpDefaults = [
        ['"createdAt"', 'NOW()'],
        ['"updatedAt"', 'NOW()'],
        ['difficulty', `'medium'`],
        ['modules', `'[]'::jsonb`],
        ['"estimatedDays"', '7'],
        ['"totalXP"', '0'],
        ['"totalDuration"', '0'],
        ['"isTemplate"', 'false'],
      ];
      for (const [col, def] of lpDefaults) {
        try {
          await pool.query(`ALTER TABLE "LearningPath" ALTER COLUMN ${col} SET DEFAULT ${def}`);
        } catch (e) {
          console.warn('[lp:set-default]', col, e.message);
        }
      }
      // Backfill NULL timestamps cho rows cũ
      try {
        await pool.query(`UPDATE "LearningPath" SET "createdAt" = NOW() WHERE "createdAt" IS NULL`);
        await pool.query(`UPDATE "LearningPath" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL`);
      } catch (_e) { /* ignore */ }
      // Set NOT NULL cho teacherId + name sau khi backfill
      try { await pool.query(`ALTER TABLE "LearningPath" ALTER COLUMN "teacherId" SET NOT NULL`); } catch (_e) { /* ignore */ }
      try { await pool.query(`ALTER TABLE "LearningPath" ALTER COLUMN name SET NOT NULL`); } catch (_e) { /* ignore */ }

      await pool.query(`CREATE INDEX IF NOT EXISTS "LearningPath_teacher_idx"
        ON "LearningPath"("teacherId", "createdAt" DESC)`);

      // ── LearningPathAssignment ── same pattern
      await pool.query(`CREATE TABLE IF NOT EXISTS "LearningPathAssignment" (
        id TEXT PRIMARY KEY
      )`);
      const lpaCols = [
        ['"pathId"',         'TEXT'],
        ['"studentId"',      'TEXT'],
        ['"studentName"',    'TEXT'],
        ['"studentEmail"',   'TEXT'],
        ['status',           `TEXT DEFAULT 'assigned'`],
        ['"progressPct"',    'INT DEFAULT 0'],
        ['"moduleStatus"',   `JSONB DEFAULT '{}'::jsonb`],
        ['"assignedAt"',     'TIMESTAMPTZ DEFAULT NOW()'],
        ['"completedAt"',    'TIMESTAMPTZ'],
        ['"lastActivityAt"', 'TIMESTAMPTZ'],
      ];
      for (const [col, typeDef] of lpaCols) {
        try {
          await pool.query(`ALTER TABLE "LearningPathAssignment" ADD COLUMN IF NOT EXISTS ${col} ${typeDef}`);
        } catch (e) {
          console.warn('[lpa:alter]', col, e.message);
        }
      }
      // Discover-and-DROP NOT NULL + FK cho assignment table
      try {
        const knownLPA = new Set([
          'id', 'pathId', 'studentId', 'studentName', 'studentEmail',
          'status', 'progressPct', 'moduleStatus',
          'assignedAt', 'completedAt', 'lastActivityAt',
        ]);
        const { rows: schemaCols } = await pool.query(
          `SELECT column_name, is_nullable
             FROM information_schema.columns
            WHERE table_name = 'LearningPathAssignment' AND table_schema = 'public'`
        );
        for (const c of schemaCols) {
          if (!knownLPA.has(c.column_name) && c.is_nullable === 'NO') {
            try {
              await pool.query(`ALTER TABLE "LearningPathAssignment" ALTER COLUMN "${c.column_name}" DROP NOT NULL`);
            } catch (_e) { /* ignore */ }
          }
        }
        const { rows: fks } = await pool.query(
          `SELECT con.conname FROM pg_constraint con
             JOIN pg_class cls ON cls.oid = con.conrelid
            WHERE cls.relname = 'LearningPathAssignment' AND con.contype = 'f'`
        );
        for (const fk of fks) {
          try {
            await pool.query(`ALTER TABLE "LearningPathAssignment" DROP CONSTRAINT IF EXISTS "${fk.conname}"`);
          } catch (_e) { /* ignore */ }
        }
      } catch (e) {
        console.warn('[lpa:discover]', e.message);
      }
      // SET DEFAULT cho LPA cols có default
      const lpaDefaults = [
        ['status', `'assigned'`],
        ['"progressPct"', '0'],
        ['"moduleStatus"', `'{}'::jsonb`],
        ['"assignedAt"', 'NOW()'],
      ];
      for (const [col, def] of lpaDefaults) {
        try {
          await pool.query(`ALTER TABLE "LearningPathAssignment" ALTER COLUMN ${col} SET DEFAULT ${def}`);
        } catch (e) {
          console.warn('[lpa:set-default]', col, e.message);
        }
      }
      // Backfill NULL assignedAt
      try {
        await pool.query(`UPDATE "LearningPathAssignment" SET "assignedAt" = NOW() WHERE "assignedAt" IS NULL`);
      } catch (_e) { /* ignore */ }
      try { await pool.query(`ALTER TABLE "LearningPathAssignment" ALTER COLUMN "pathId" SET NOT NULL`); } catch (_e) { /* ignore */ }
      try { await pool.query(`ALTER TABLE "LearningPathAssignment" ALTER COLUMN "studentId" SET NOT NULL`); } catch (_e) { /* ignore */ }

      // UNIQUE (pathId, studentId) — tạo nếu chưa có
      try {
        await pool.query(`ALTER TABLE "LearningPathAssignment"
          ADD CONSTRAINT "LPA_path_student_unique" UNIQUE ("pathId", "studentId")`);
      } catch (e) {
        // ignore if already exists
        if (!/already exists|duplicate/i.test(e.message)) {
          console.warn('[lpa:unique]', e.message);
        }
      }
      await pool.query(`CREATE INDEX IF NOT EXISTS "LPA_path_idx"
        ON "LearningPathAssignment"("pathId", status)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "LPA_student_idx"
        ON "LearningPathAssignment"("studentId", status)`);
      _lpReady = true;
    } catch (e) {
      console.error('[learning-path:ensure]', e.message);
    }
  }

  function lpGenId(prefix = 'lp') {
    return `${prefix}_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36).slice(-4)}`;
  }

  function mapLPRow(r, assignments = []) {
    return {
      id: r.id,
      name: r.name,
      description: r.description || '',
      subject: r.subject || null,
      difficulty: r.difficulty || 'medium',
      modules: r.modules || [],
      estimatedDays: r.estimatedDays,
      totalXP: r.totalXP,
      totalDuration: r.totalDuration,
      isTemplate: !!r.isTemplate,
      assignments,
      assignedCount: assignments.length,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  function mapLPAssignment(a) {
    return {
      id: a.id,
      pathId: a.pathId,
      studentId: a.studentId,
      studentName: a.studentName || '',
      studentEmail: a.studentEmail || '',
      status: a.status,
      progressPct: a.progressPct || 0,
      moduleStatus: a.moduleStatus || {},
      assignedAt: a.assignedAt,
      completedAt: a.completedAt,
      lastActivityAt: a.lastActivityAt,
    };
  }

  // ── GET /api/teacher/learning-paths ──
  app.get('/api/teacher/learning-paths', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLPTables();
      const pool = getAsgnPool();
      const { rows: paths } = await pool.query(
        `SELECT * FROM "LearningPath" WHERE "teacherId" = $1 ORDER BY "createdAt" DESC`,
        [user.id]
      );
      if (paths.length === 0) return res.json({ paths: [], count: 0 });
      // Batch-load assignments
      const pathIds = paths.map(p => p.id);
      const { rows: assignments } = await pool.query(
        `SELECT * FROM "LearningPathAssignment" WHERE "pathId" = ANY($1)`,
        [pathIds]
      );
      const byPath = {};
      for (const a of assignments) {
        if (!byPath[a.pathId]) byPath[a.pathId] = [];
        byPath[a.pathId].push(mapLPAssignment(a));
      }
      return res.json({
        paths: paths.map(p => mapLPRow(p, byPath[p.id] || [])),
        count: paths.length,
      });
    } catch (err) {
      console.error('[learning-path:list]', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/teacher/learning-paths/:id ──
  app.get('/api/teacher/learning-paths/:id', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLPTables();
      const pool = getAsgnPool();
      const { rows } = await pool.query(
        `SELECT * FROM "LearningPath" WHERE id = $1 AND "teacherId" = $2 LIMIT 1`,
        [req.params.id, user.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Path không tồn tại' });
      const { rows: assignments } = await pool.query(
        `SELECT * FROM "LearningPathAssignment" WHERE "pathId" = $1 ORDER BY "assignedAt" DESC`,
        [req.params.id]
      );
      return res.json(mapLPRow(rows[0], assignments.map(mapLPAssignment)));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/learning-paths ──
  app.post('/api/teacher/learning-paths', express.json({ limit: '256kb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const b = req.body || {};
      if (!b.name || !String(b.name).trim()) {
        return res.status(400).json({ error: 'Thiếu tên path' });
      }
      const modules = Array.isArray(b.modules) ? b.modules : [];
      const totalXP = modules.reduce((s, m) => s + (Number(m.xpTarget) || 0), 0);
      const totalDuration = modules.reduce((s, m) => s + (Number(m.duration) || 0), 0);
      const estimatedDays = Math.max(1, Math.ceil(totalDuration / 60));
      await ensureLPTables();
      const pool = getAsgnPool();
      const id = lpGenId();
      const { rows } = await pool.query(
        `INSERT INTO "LearningPath" (id, "teacherId", name, description, subject,
            difficulty, modules, "estimatedDays", "totalXP", "totalDuration", "isTemplate",
            "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW())
         RETURNING *`,
        [id, user.id, String(b.name).trim(), b.description || '', b.subject || null,
         b.difficulty || 'medium', JSON.stringify(modules),
         estimatedDays, totalXP, totalDuration, !!b.isTemplate]
      );
      // Auto-assign tới studentIds nếu kèm
      let assignments = [];
      if (Array.isArray(b.assignTo) && b.assignTo.length > 0) {
        for (const s of b.assignTo) {
          const sid = s.studentId || s.id;
          if (!sid) continue;
          try {
            const { rows: aRows } = await pool.query(
              `INSERT INTO "LearningPathAssignment"
                 (id, "pathId", "studentId", "studentName", "studentEmail", "assignedAt", status)
               VALUES ($1,$2,$3,$4,$5, NOW(), 'assigned')
               ON CONFLICT ("pathId","studentId") DO NOTHING
               RETURNING *`,
              [lpGenId('lpa'), id, sid, s.studentName || s.name || '', s.studentEmail || s.email || '']
            );
            if (aRows[0]) assignments.push(mapLPAssignment(aRows[0]));
          } catch (e) {
            console.warn('[learning-path:assign]', e.message);
          }
        }
      }
      return res.json({ path: mapLPRow(rows[0], assignments) });
    } catch (err) {
      console.error('[learning-path:create]', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /api/teacher/learning-paths/:id ──
  app.patch('/api/teacher/learning-paths/:id', express.json({ limit: '256kb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const b = req.body || {};
      await ensureLPTables();
      const pool = getAsgnPool();
      const sets = []; const vals = [];
      const allowed = ['name', 'description', 'subject', 'difficulty', 'isTemplate'];
      for (const k of allowed) {
        if (k in b) { sets.push(`"${k}" = $${vals.length + 1}`); vals.push(b[k]); }
      }
      if (Array.isArray(b.modules)) {
        const totalXP = b.modules.reduce((s, m) => s + (Number(m.xpTarget) || 0), 0);
        const totalDuration = b.modules.reduce((s, m) => s + (Number(m.duration) || 0), 0);
        const estimatedDays = Math.max(1, Math.ceil(totalDuration / 60));
        sets.push(`modules = $${vals.length + 1}`); vals.push(JSON.stringify(b.modules));
        sets.push(`"totalXP" = $${vals.length + 1}`); vals.push(totalXP);
        sets.push(`"totalDuration" = $${vals.length + 1}`); vals.push(totalDuration);
        sets.push(`"estimatedDays" = $${vals.length + 1}`); vals.push(estimatedDays);
      }
      if (sets.length === 0) return res.status(400).json({ error: 'Không có gì để cập nhật' });
      sets.push(`"updatedAt" = NOW()`);
      vals.push(req.params.id, user.id);
      const { rows } = await pool.query(
        `UPDATE "LearningPath" SET ${sets.join(', ')}
          WHERE id = $${vals.length - 1} AND "teacherId" = $${vals.length}
          RETURNING *`,
        vals
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Path không tồn tại' });
      return res.json({ path: mapLPRow(rows[0], []) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/teacher/learning-paths/:id ──
  app.delete('/api/teacher/learning-paths/:id', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLPTables();
      const pool = getAsgnPool();
      const r = await pool.query(
        `DELETE FROM "LearningPath" WHERE id = $1 AND "teacherId" = $2`,
        [req.params.id, user.id]
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'Path không tồn tại' });
      // Xoá assignments liên quan
      await pool.query(`DELETE FROM "LearningPathAssignment" WHERE "pathId" = $1`, [req.params.id]);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/learning-paths/:id/assign ──
  // Body: { students: [{ studentId, studentName?, studentEmail? }] }
  // Tạo assignment cho mỗi HS (skip nếu đã có)
  app.post('/api/teacher/learning-paths/:id/assign', express.json({ limit: '64kb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const list = Array.isArray(req.body?.students) ? req.body.students : [];
      if (list.length === 0) return res.status(400).json({ error: 'Không có HS nào để gán' });
      await ensureLPTables();
      const pool = getAsgnPool();
      // Verify path ownership
      const { rows: pathRows } = await pool.query(
        `SELECT id FROM "LearningPath" WHERE id = $1 AND "teacherId" = $2 LIMIT 1`,
        [req.params.id, user.id]
      );
      if (pathRows.length === 0) return res.status(404).json({ error: 'Path không tồn tại' });
      const created = [];
      for (const s of list) {
        const sid = s.studentId || s.id;
        if (!sid) continue;
        try {
          const { rows } = await pool.query(
            `INSERT INTO "LearningPathAssignment"
               (id, "pathId", "studentId", "studentName", "studentEmail", "assignedAt", status)
             VALUES ($1,$2,$3,$4,$5, NOW(), 'assigned')
             ON CONFLICT ("pathId","studentId") DO NOTHING
             RETURNING *`,
            [lpGenId('lpa'), req.params.id, sid, s.studentName || s.name || '', s.studentEmail || s.email || '']
          );
          if (rows[0]) created.push(mapLPAssignment(rows[0]));
        } catch (e) {
          console.warn('[learning-path:assign:row]', e.message);
        }
      }
      return res.json({ assigned: created.length, total: list.length, assignments: created });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/teacher/learning-paths/:id/assign/:assignmentId ──
  app.delete('/api/teacher/learning-paths/:id/assign/:assignmentId', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLPTables();
      const pool = getAsgnPool();
      // Verify path ownership
      const { rows: pathRows } = await pool.query(
        `SELECT id FROM "LearningPath" WHERE id = $1 AND "teacherId" = $2 LIMIT 1`,
        [req.params.id, user.id]
      );
      if (pathRows.length === 0) return res.status(404).json({ error: 'Path không tồn tại' });
      await pool.query(
        `DELETE FROM "LearningPathAssignment" WHERE id = $1 AND "pathId" = $2`,
        [req.params.assignmentId, req.params.id]
      );
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ────────────────────────────────────────────────────────────
  // STUDENT-side: GET /api/student/learning-paths
  // Trả về tất cả LearningPath mà student được phân công (qua
  // LearningPathAssignment.studentId HOẶC studentEmail match user email)
  // + thông tin teacher (name) để FE hiển thị "Lộ trình từ GV X".
  // ────────────────────────────────────────────────────────────
  app.get('/api/student/learning-paths', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLPTables();
      const pool = getAsgnPool();
      // 2 nguồn match: theo studentId trực tiếp HOẶC theo email (GV import mailing list)
      const { rows: assignments } = await pool.query(
        `SELECT lpa.*, lp.name AS path_name, lp.description AS path_desc,
                lp.subject AS path_subject, lp.difficulty AS path_difficulty,
                lp.modules AS path_modules, lp."estimatedDays" AS path_estimated_days,
                lp."totalXP" AS path_total_xp, lp."totalDuration" AS path_total_duration,
                lp."teacherId" AS path_teacher_id, lp."createdAt" AS path_created_at,
                u.name AS teacher_name, u.email AS teacher_email
           FROM "LearningPathAssignment" lpa
           JOIN "LearningPath" lp ON lp.id = lpa."pathId"
           LEFT JOIN "User" u ON u.id = lp."teacherId"
          WHERE lpa."studentId" = $1
             OR (lpa."studentEmail" IS NOT NULL AND LOWER(lpa."studentEmail") = LOWER($2))
          ORDER BY lpa."assignedAt" DESC NULLS LAST`,
        [user.id, user.email || '']
      );
      const paths = assignments.map((a) => ({
        // Assignment-level fields
        assignmentId: a.id,
        status: a.status,                  // 'assigned' | 'in_progress' | 'completed'
        progressPct: a.progressPct || 0,
        moduleStatus: a.moduleStatus || {},
        assignedAt: a.assignedAt,
        completedAt: a.completedAt,
        lastActivityAt: a.lastActivityAt,
        // Path-level fields
        id: a.pathId,
        name: a.path_name,
        description: a.path_desc || '',
        subject: a.path_subject || null,
        difficulty: a.path_difficulty || 'medium',
        modules: a.path_modules || [],
        estimatedDays: a.path_estimated_days,
        totalXP: a.path_total_xp,
        totalDuration: a.path_total_duration,
        createdAt: a.path_created_at,
        // Teacher info
        teacher: {
          id: a.path_teacher_id,
          name: a.teacher_name || null,
          email: a.teacher_email || null,
        },
      }));
      return res.json({ paths, count: paths.length });
    } catch (err) {
      console.error('[student:learning-paths]', err.message);
      return res.status(500).json({ error: err.message, paths: [], count: 0 });
    }
  });

  // ════════════════════════════════════════════════════════════
  // LESSON PLANS — GV soạn giáo án WYSIWYG (Google Docs-like)
  // Lưu HTML/JSON content → DB. Optional snapshot lên GCS bucket.
  //
  // Schema: id, teacherId, title, content (HTML), contentJson (TipTap doc),
  //   subject, grade, tags[], wordCount, lastSavedAt, createdAt, updatedAt
  //
  // Auto-save pattern: FE debounce 3s → PATCH content. DB chỉ update,
  // không tạo version mỗi lần (giảm I/O). Optional /backup endpoint
  // để snapshot snapshot lên GCS khi user "Lưu vào Drive".
  // ════════════════════════════════════════════════════════════
  let _lpsReady = false;
  async function ensureLessonPlanTables() {
    if (_lpsReady) return;
    const pool = getAsgnPool();
    if (!pool) return;
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS "LessonPlan" (id TEXT PRIMARY KEY)`);

      // ── NUCLEAR: drop legacy cols có TYPE SAI (Prisma có thể tạo JSON
      // cho 'content' column → INSERT '<p></p>' fails "Token < invalid").
      // Discover-based: query information_schema, mọi col TYPE=json/jsonb
      // mà code expect TEXT → DROP. Cộng thêm danh sách candidate.
      // An toàn vì LessonPlan là feature MỚI ngày 15/5 — chưa có user data.
      const dropCandidates = ['contentJson', 'tags', 'data', 'meta', 'metadata'];
      try {
        // Cộng thêm content nếu nó là JSON type (Prisma có thể đã tạo vậy)
        const { rows: contentCol } = await pool.query(`
          SELECT data_type, udt_name FROM information_schema.columns
          WHERE table_name = 'LessonPlan' AND column_name = 'content' AND table_schema = 'public'
        `);
        if (contentCol.length > 0 && (contentCol[0].udt_name === 'json' || contentCol[0].udt_name === 'jsonb')) {
          console.log(`[lp] content column is ${contentCol[0].udt_name} (legacy Prisma) — will DROP + recreate as TEXT`);
          dropCandidates.push('content');
        }
        // Tương tự cho title — nếu Prisma tạo JSON
        const { rows: titleCol } = await pool.query(`
          SELECT udt_name FROM information_schema.columns
          WHERE table_name = 'LessonPlan' AND column_name = 'title' AND table_schema = 'public'
        `);
        if (titleCol.length > 0 && (titleCol[0].udt_name === 'json' || titleCol[0].udt_name === 'jsonb')) {
          dropCandidates.push('title');
        }
      } catch (e) {
        console.warn('[lp:detect-content-type]', e.message);
      }
      for (const col of dropCandidates) {
        try {
          await pool.query(`ALTER TABLE "LessonPlan" DROP COLUMN IF EXISTS "${col}"`);
        } catch (e) {
          console.warn('[lp:drop-legacy]', col, e.message);
        }
      }
      const cols = [
        ['"teacherId"',    'TEXT'],
        ['title',          `TEXT DEFAULT 'Giáo án mới'`],
        ['content',        `TEXT DEFAULT ''`],         // HTML hoặc LaTeX source tuỳ format
        ['"contentJson"',  `JSONB DEFAULT '{}'::jsonb`], // TipTap doc JSON (chỉ format=html)
        ['subject',        'TEXT'],
        ['grade',          'TEXT'],
        ['tags',           `JSONB DEFAULT '[]'::jsonb`],
        ['"wordCount"',    'INT DEFAULT 0'],
        ['"isArchived"',   'BOOLEAN DEFAULT false'],
        ['"gcsBackupUrl"', 'TEXT'],                     // URL snapshot GCS
        ['"gcsBackupAt"',  'TIMESTAMPTZ'],
        ['format',         `TEXT DEFAULT 'html'`],      // 'html' | 'latex'
        ['"latexProjectId"', 'TEXT'],                   // FK soft tới LatexProject (khi format=latex)
        ['"lastSavedAt"',  'TIMESTAMPTZ DEFAULT NOW()'],
        ['"createdAt"',    'TIMESTAMPTZ DEFAULT NOW()'],
        ['"updatedAt"',    'TIMESTAMPTZ DEFAULT NOW()'],
      ];
      for (const [col, typeDef] of cols) {
        try { await pool.query(`ALTER TABLE "LessonPlan" ADD COLUMN IF NOT EXISTS ${col} ${typeDef}`); }
        catch (e) { console.warn('[lp:alter]', col, e.message); }
      }
      // Set DEFAULT for existing cols (in case they were created without)
      const defaults = [
        ['title', `'Giáo án mới'`], ['content', `''`], ['"contentJson"', `'{}'::jsonb`],
        ['tags', `'[]'::jsonb`], ['"wordCount"', '0'], ['"isArchived"', 'false'],
        ['"lastSavedAt"', 'NOW()'], ['"createdAt"', 'NOW()'], ['"updatedAt"', 'NOW()'],
      ];
      for (const [col, def] of defaults) {
        try { await pool.query(`ALTER TABLE "LessonPlan" ALTER COLUMN ${col} SET DEFAULT ${def}`); }
        catch (_e) { /* ignore */ }
      }
      // Discover-and-DROP NOT NULL/FK pattern (Prisma legacy safety)
      // PLUS: detect JSON/JSONB columns với invalid default (empty string từ
      // Prisma) → force default '{}' hoặc '[]' để INSERT không crash với
      // "invalid input syntax for type json"
      try {
        const knownCols = new Set([
          'id', 'teacherId', 'title', 'content', 'contentJson', 'subject', 'grade',
          'tags', 'wordCount', 'isArchived', 'gcsBackupUrl', 'gcsBackupAt',
          'format', 'latexProjectId',
          'lastSavedAt', 'createdAt', 'updatedAt',
        ]);
        const { rows: schemaCols } = await pool.query(
          `SELECT column_name, is_nullable, data_type, udt_name, column_default
             FROM information_schema.columns
            WHERE table_name = 'LessonPlan' AND table_schema = 'public'`
        );
        for (const c of schemaCols) {
          // DROP NOT NULL cho cols ngoài whitelist
          if (!knownCols.has(c.column_name) && c.is_nullable === 'NO') {
            try { await pool.query(`ALTER TABLE "LessonPlan" ALTER COLUMN "${c.column_name}" DROP NOT NULL`); }
            catch (_e) { /* ignore */ }
          }
          // Fix invalid JSON defaults (Prisma may set '' or NULL → JSON parse error)
          if ((c.data_type === 'json' || c.data_type === 'jsonb' || c.udt_name === 'json' || c.udt_name === 'jsonb')) {
            const isArray = ['tags'].includes(c.column_name);
            const goodDefault = isArray ? `'[]'::${c.udt_name}` : `'{}'::${c.udt_name}`;
            try {
              await pool.query(`ALTER TABLE "LessonPlan" ALTER COLUMN "${c.column_name}" SET DEFAULT ${goodDefault}`);
            } catch (_e) { /* ignore */ }
            // Backfill NULL hoặc empty string thành valid JSON
            try {
              await pool.query(`UPDATE "LessonPlan" SET "${c.column_name}" = ${goodDefault} WHERE "${c.column_name}" IS NULL`);
            } catch (_e) { /* ignore — may fail nếu col is text masquerading */ }
          }
        }
        const { rows: fks } = await pool.query(
          `SELECT con.conname FROM pg_constraint con
             JOIN pg_class cls ON cls.oid = con.conrelid
            WHERE cls.relname = 'LessonPlan' AND con.contype = 'f'`
        );
        for (const fk of fks) {
          try { await pool.query(`ALTER TABLE "LessonPlan" DROP CONSTRAINT IF EXISTS "${fk.conname}"`); }
          catch (_e) { /* ignore */ }
        }
      } catch (e) { console.warn('[lp:discover]', e.message); }
      // Backfill NULL timestamps + teacherId
      try {
        await pool.query(`UPDATE "LessonPlan" SET "createdAt" = NOW() WHERE "createdAt" IS NULL`);
        await pool.query(`UPDATE "LessonPlan" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL`);
        await pool.query(`UPDATE "LessonPlan" SET "lastSavedAt" = NOW() WHERE "lastSavedAt" IS NULL`);
        await pool.query(`UPDATE "LessonPlan" SET "teacherId" = '__legacy__' WHERE "teacherId" IS NULL`);
      } catch (_e) { /* ignore */ }
      try { await pool.query(`ALTER TABLE "LessonPlan" ALTER COLUMN "teacherId" SET NOT NULL`); } catch (_e) {}

      // ALWAYS DROP NOT NULL cho optional cols (subject, grade, gcsBackupUrl, gcsBackupAt)
      // Code mới INSERT NULL cho các col này khi user không fill, nhưng Prisma
      // legacy có thể đã SET NOT NULL → INSERT crash.
      const optionalCols = ['subject', 'grade', 'gcsBackupUrl', 'gcsBackupAt'];
      for (const col of optionalCols) {
        try {
          await pool.query(`ALTER TABLE "LessonPlan" ALTER COLUMN "${col}" DROP NOT NULL`);
        } catch (_e) { /* ignore — col may not exist yet, ALTER ADD COLUMN sẽ thêm */ }
      }
      // Index
      await pool.query(`CREATE INDEX IF NOT EXISTS "LessonPlan_teacher_idx"
        ON "LessonPlan"("teacherId", "updatedAt" DESC) WHERE "isArchived" = false`);
      _lpsReady = true;
    } catch (e) {
      console.error('[lesson-plan:ensure]', e.message);
    }
  }

  function lpsGenId() {
    return `lpn_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36).slice(-4)}`;
  }

  function mapLessonPlan(r, summary = false) {
    const base = {
      id: r.id,
      title: r.title || 'Giáo án mới',
      subject: r.subject || null,
      grade: r.grade || null,
      tags: r.tags || [],
      wordCount: r.wordCount || 0,
      isArchived: !!r.isArchived,
      gcsBackupUrl: r.gcsBackupUrl || null,
      gcsBackupAt: r.gcsBackupAt || null,
      format: r.format || 'html',                    // 'html' | 'latex'
      latexProjectId: r.latexProjectId || null,      // ref tới LatexProject khi format=latex
      lastSavedAt: r.lastSavedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
    // List view: skip large content fields
    if (summary) {
      // Preview: nếu LaTeX, lấy phần text giữa \begin{document}…\end{document}
      // strip LaTeX commands → readable preview
      const preview = r.format === 'latex'
        ? String(r.content || '')
            .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, ' ')
            .replace(/\$[^$]*\$/g, '[công thức]')
            .replace(/\s+/g, ' ').trim().slice(0, 160)
        : String(r.content || '').replace(/<[^>]+>/g, '').slice(0, 160);
      return { ...base, contentPreview: preview };
    }
    return { ...base, content: r.content || '', contentJson: r.contentJson || {} };
  }

  // ── GET /api/teacher/lesson-plans ──
  app.get('/api/teacher/lesson-plans', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLessonPlanTables();
      const pool = getAsgnPool();
      const includeArchived = req.query.archived === '1' || req.query.archived === 'true';
      const { rows } = await pool.query(
        `SELECT id, "teacherId", title, content, "contentJson", subject, grade,
                tags, "wordCount", "isArchived", "gcsBackupUrl", "gcsBackupAt",
                "lastSavedAt", "createdAt", "updatedAt"
           FROM "LessonPlan"
          WHERE "teacherId" = $1 ${includeArchived ? '' : `AND "isArchived" = false`}
          ORDER BY "updatedAt" DESC
          LIMIT 200`,
        [user.id]
      );
      res.json({ plans: rows.map(r => mapLessonPlan(r, true)), count: rows.length });
    } catch (err) {
      console.error('[lesson-plan:list]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/teacher/lesson-plans/:id ──
  app.get('/api/teacher/lesson-plans/:id', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLessonPlanTables();
      const pool = getAsgnPool();
      const { rows } = await pool.query(
        `SELECT * FROM "LessonPlan" WHERE id = $1 AND "teacherId" = $2 LIMIT 1`,
        [req.params.id, user.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Giáo án không tồn tại' });
      res.json(mapLessonPlan(rows[0], false));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/lesson-plans ──
  app.post('/api/teacher/lesson-plans', express.json({ limit: '2mb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const b = req.body || {};
      await ensureLessonPlanTables();
      const pool = getAsgnPool();
      const id = lpsGenId();
      const wordCount = computeWordCount(b.content || '');
      const { rows } = await pool.query(
        `INSERT INTO "LessonPlan" (id, "teacherId", title, content, "contentJson",
            subject, grade, tags, "wordCount",
            "lastSavedAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9, NOW(), NOW(), NOW())
         RETURNING *`,
        [id, user.id, b.title || 'Giáo án mới', b.content || '',
         JSON.stringify(b.contentJson || {}),
         b.subject || null, b.grade || null,
         JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
         wordCount]
      );
      res.json({ plan: mapLessonPlan(rows[0], false) });
    } catch (err) {
      console.error('[lesson-plan:create]', err.message,
        '| code:', err.code, '| detail:', err.detail,
        '| column:', err.column, '| where:', err.where);
      res.status(500).json({ error: err.message, detail: err.detail || null });
    }
  });

  // ── PATCH /api/teacher/lesson-plans/:id (auto-save) ──
  app.patch('/api/teacher/lesson-plans/:id', express.json({ limit: '2mb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const b = req.body || {};
      await ensureLessonPlanTables();
      const pool = getAsgnPool();
      const sets = []; const vals = [];
      const allowed = ['title', 'content', 'subject', 'grade', 'isArchived'];
      for (const k of allowed) {
        if (k in b) { sets.push(`"${k}" = $${vals.length + 1}`); vals.push(b[k]); }
      }
      if (b.contentJson !== undefined) {
        sets.push(`"contentJson" = $${vals.length + 1}::jsonb`);
        vals.push(JSON.stringify(b.contentJson || {}));
      }
      if (b.tags !== undefined && Array.isArray(b.tags)) {
        sets.push(`tags = $${vals.length + 1}::jsonb`);
        vals.push(JSON.stringify(b.tags));
      }
      if ('content' in b) {
        const wc = computeWordCount(b.content || '');
        sets.push(`"wordCount" = $${vals.length + 1}`);
        vals.push(wc);
      }
      if (sets.length === 0) return res.status(400).json({ error: 'Không có gì để cập nhật' });
      sets.push(`"lastSavedAt" = NOW()`);
      sets.push(`"updatedAt" = NOW()`);
      vals.push(req.params.id, user.id);
      const { rows } = await pool.query(
        `UPDATE "LessonPlan" SET ${sets.join(', ')}
          WHERE id = $${vals.length - 1} AND "teacherId" = $${vals.length}
          RETURNING *`,
        vals
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Giáo án không tồn tại' });
      res.json({ plan: mapLessonPlan(rows[0], false) });
    } catch (err) {
      console.error('[lesson-plan:update]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/lesson-plans/from-latex ──
  // Tạo bản LessonPlan từ 1 LatexProject (lưu copy LaTeX source vào danh
  // mục giáo án). User soạn giáo án bằng LaTeX (template CV2345 LaTeX) →
  // bấm "Lưu vào Giáo án" → endpoint này tạo LessonPlan mới với:
  //   - format = 'latex'
  //   - content = mainContent (LaTeX source)
  //   - latexProjectId = ref về LatexProject gốc (để click ở list mở
  //     lại đúng latex doc, không phải tạo mới).
  app.post('/api/teacher/lesson-plans/from-latex', express.json({ limit: '256kb' }), async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const { latexProjectId, title, subject, grade } = req.body || {};
      if (!latexProjectId) return res.status(400).json({ error: 'Thiếu latexProjectId' });

      await ensureLessonPlanTables();
      const pool = getAsgnPool();

      // Fetch LatexProject để verify ownership + lấy mainContent
      const latex = await pool.query(
        `SELECT id, title, "mainContent" FROM "LatexProject" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
        [latexProjectId, user.id]
      ).catch(() => ({ rows: [] }));
      if (latex.rows.length === 0) {
        return res.status(404).json({ error: 'LaTeX project không tồn tại hoặc không phải của bạn' });
      }
      const lpx = latex.rows[0];
      const finalTitle = (title || lpx.title || 'Giáo án LaTeX').trim();
      const latexSource = lpx.mainContent || '';

      // Check nếu đã có LessonPlan ref tới LatexProject này → update thay vì tạo mới
      const existing = await pool.query(
        `SELECT id FROM "LessonPlan" WHERE "teacherId" = $1 AND "latexProjectId" = $2 LIMIT 1`,
        [user.id, latexProjectId]
      ).catch(() => ({ rows: [] }));
      if (existing.rows.length > 0) {
        // UPDATE — refresh content + title từ latex
        const upd = await pool.query(
          `UPDATE "LessonPlan"
              SET title = $1, content = $2, subject = COALESCE($3, subject),
                  grade = COALESCE($4, grade),
                  "lastSavedAt" = NOW(), "updatedAt" = NOW()
            WHERE id = $5 AND "teacherId" = $6
            RETURNING *`,
          [finalTitle, latexSource, subject || null, grade || null, existing.rows[0].id, user.id]
        );
        return res.json({ plan: mapLessonPlan(upd.rows[0], false), action: 'updated' });
      }

      // INSERT mới
      const id = lpsGenId();
      const wordCount = computeWordCount(latexSource);
      const ins = await pool.query(
        `INSERT INTO "LessonPlan"
          (id, "teacherId", title, content, "contentJson",
           subject, grade, tags, "wordCount",
           format, "latexProjectId",
           "lastSavedAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10,$11, NOW(), NOW(), NOW())
         RETURNING *`,
        [id, user.id, finalTitle, latexSource,
         JSON.stringify({}),  // contentJson rỗng cho LaTeX
         subject || null, grade || null,
         JSON.stringify([]),
         wordCount,
         'latex', latexProjectId]
      );
      return res.json({ plan: mapLessonPlan(ins.rows[0], false), action: 'created' });
    } catch (err) {
      console.error('[lesson-plan:from-latex]', err.message,
        '| code:', err.code, '| detail:', err.detail);
      res.status(500).json({ error: err.message, detail: err.detail || null });
    }
  });

  // ── DELETE /api/teacher/lesson-plans/:id ──
  app.delete('/api/teacher/lesson-plans/:id', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLessonPlanTables();
      const pool = getAsgnPool();
      const r = await pool.query(
        `DELETE FROM "LessonPlan" WHERE id = $1 AND "teacherId" = $2`,
        [req.params.id, user.id]
      );
      if (r.rowCount === 0) return res.status(404).json({ error: 'Giáo án không tồn tại' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/teacher/lesson-plans/:id/backup ──
  // Snapshot HTML lên GCS bucket "aeroedu-media-..."
  // Chỉ tạo backup khi user click "Lưu vào Drive" (KHÔNG auto, để
  // tiết kiệm GCS write ops).
  app.post('/api/teacher/lesson-plans/:id/backup', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureLessonPlanTables();
      const pool = getAsgnPool();
      const { rows } = await pool.query(
        `SELECT * FROM "LessonPlan" WHERE id = $1 AND "teacherId" = $2 LIMIT 1`,
        [req.params.id, user.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Giáo án không tồn tại' });
      const plan = rows[0];
      // Try GCS upload (graceful fallback nếu chưa setup)
      try {
        const { Storage } = require('@google-cloud/storage');
        const bucketName = process.env.GCS_BUCKET_MEDIA || 'aeroedu-media-extreme-lattice-491123-p2';
        const storage = new Storage();
        const bucket = storage.bucket(bucketName);
        const safeTitle = (plan.title || 'giao-an')
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/đ/gi, 'd').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
        const objectKey = `lesson-plans/${user.id}/${safeTitle}-${Date.now()}.html`;
        // Wrap content trong standalone HTML — định dạng theo Nghị định
        // 30/2020/NĐ-CP cho văn bản hành chính:
        //   • Khổ A4, lề trên/dưới 2cm, lề trái 3cm, lề phải 2cm
        //   • Times New Roman 13pt (chuẩn), giãn dòng 1.5 lines
        //   • Canh đều 2 lề (justify), khoảng cách đoạn ≥6pt
        // @page rule cho khi user In ra (Ctrl+P) hoặc save as PDF
        const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>${plan.title || 'Giáo án'}</title>
<style>
@page {
  size: A4;
  margin: 2cm 2cm 2cm 3cm;  /* trên phải dưới TRÁI — NĐ 30: trái 3cm */
}
html { background: #f5f5f5; }
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 13pt;
  line-height: 1.5;
  text-align: justify;
  color: #111;
  background: #fff;
  margin: 0 auto;
  /* Trên màn hình: simulate khổ A4 (210mm × 297mm) */
  max-width: 21cm;
  min-height: 29.7cm;
  padding: 2cm 2cm 2cm 3cm;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  box-sizing: border-box;
}
@media print {
  html, body { background: white; box-shadow: none; max-width: none; padding: 0; }
}
h1, h2, h3, h4 { color: #1a1a1a; line-height: 1.3; margin-top: 1em; margin-bottom: 0.5em; }
h1 { font-size: 16pt; text-align: center; }
h2 { font-size: 14pt; }
h3 { font-size: 13pt; }
p { margin: 0 0 6pt 0; }
ul, ol { margin: 0 0 6pt 0; padding-left: 1.5cm; }
li { margin-bottom: 4pt; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; page-break-inside: avoid; }
table td, table th { border: 1px solid #333; padding: 6pt 8pt; vertical-align: top; }
table th { background: #f0f0f0; font-weight: 700; text-align: center; }
hr { border: none; border-top: 1px solid #999; margin: 12pt 0; }
.metadata { font-size: 10pt; color: #666; text-align: center; margin-top: 24pt; }
</style>
</head><body>
<h1>${plan.title || 'Giáo án'}</h1>
${plan.content || '<p>(Trống)</p>'}
<hr/>
<p class="metadata">
  Định dạng theo Nghị định 30/2020/NĐ-CP · Sao lưu từ AeroEduVision lúc ${new Date().toLocaleString('vi-VN')}
</p>
</body></html>`;
        const file = bucket.file(objectKey);
        await file.save(html, { contentType: 'text/html; charset=utf-8' });
        await file.makePublic();
        const url = `https://storage.googleapis.com/${bucketName}/${objectKey}`;
        await pool.query(
          `UPDATE "LessonPlan" SET "gcsBackupUrl" = $1, "gcsBackupAt" = NOW(), "updatedAt" = NOW()
            WHERE id = $2`,
          [url, req.params.id]
        );
        return res.json({ ok: true, url, backedUpAt: new Date().toISOString() });
      } catch (gcsErr) {
        console.warn('[lesson-plan:backup:gcs]', gcsErr.message);
        return res.status(503).json({
          error: 'GCS backup chưa khả dụng. Đã lưu vào DB. Liên hệ admin để cấu hình bucket.',
        });
      }
    } catch (err) {
      console.error('[lesson-plan:backup]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Helper: đếm từ trong HTML content (strip tags, trim, split whitespace)
  function computeWordCount(html) {
    if (!html) return 0;
    const text = String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }

  // ── GET /api/teacher/lesson-plans-gcs ──
  // List tất cả file HTML của teacher đã backup lên GCS bucket
  // (lesson-plans/{teacherId}/*.html). Dùng cho danh mục "Drive Snapshots".
  app.get('/api/teacher/lesson-plans-gcs', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const { Storage } = require('@google-cloud/storage');
      const bucketName = process.env.GCS_BUCKET_MEDIA || 'aeroedu-media-extreme-lattice-491123-p2';
      const storage = new Storage();
      const bucket = storage.bucket(bucketName);
      const prefix = `lesson-plans/${user.id}/`;
      const [files] = await bucket.getFiles({ prefix });
      const items = files.map(f => {
        const m = f.metadata || {};
        const name = f.name.replace(prefix, '');
        return {
          name,
          fullPath: f.name,
          url: `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(f.name).replace(/%2F/g, '/')}`,
          size: Number(m.size) || 0,
          updated: m.updated || null,
          contentType: m.contentType || 'text/html',
        };
      });
      // Sort by updated DESC
      items.sort((a, b) => new Date(b.updated || 0).getTime() - new Date(a.updated || 0).getTime());
      res.json({ snapshots: items, count: items.length, bucket: bucketName, prefix });
    } catch (err) {
      console.warn('[lesson-plan:gcs-list]', err.message);
      // 503 nếu GCS không sẵn sàng — FE hiện empty state với hint
      res.status(503).json({ error: 'GCS list không khả dụng', detail: err.message, snapshots: [] });
    }
  });

  // ── DELETE /api/teacher/lesson-plans-gcs/:filename ──
  // Xoá 1 snapshot khỏi GCS (verify ownership qua prefix lesson-plans/{userId}/)
  app.delete('/api/teacher/lesson-plans-gcs/:filename(*)', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const filename = req.params.filename;
      // Security: filename phải bắt đầu bằng tên teacher (hoặc đã có full path lesson-plans/{user.id}/)
      const expectedPrefix = `lesson-plans/${user.id}/`;
      const fullPath = filename.startsWith(expectedPrefix) ? filename : expectedPrefix + filename;
      if (!fullPath.startsWith(expectedPrefix)) {
        return res.status(403).json({ error: 'Forbidden — không phải snapshot của bạn' });
      }
      const { Storage } = require('@google-cloud/storage');
      const bucketName = process.env.GCS_BUCKET_MEDIA || 'aeroedu-media-extreme-lattice-491123-p2';
      const storage = new Storage();
      await storage.bucket(bucketName).file(fullPath).delete().catch(() => null);
      res.json({ ok: true, deleted: fullPath });
    } catch (err) {
      console.warn('[lesson-plan:gcs-delete]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/student/my-teachers ── list GV approved của HS
  app.get('/api/student/my-teachers', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      const { rows } = await pool.query(`
        SELECT tsl.id AS "linkId", tsl."initiatedBy", tsl."approvedAt",
               u.id, u.email, u.name, u.image
          FROM "TeacherStudentLink" tsl
          JOIN "User" u ON u.id = tsl."teacherId"
         WHERE tsl."studentId" = $1 AND tsl.status = 'approved'
         ORDER BY tsl."approvedAt" DESC NULLS LAST
      `, [user.id]);
      return res.json({ teachers: rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/student/progress-overview ──
  // Aggregate real data từ exam history + KG interactions + lesson plans HS xem.
  // Trả về JSON đầy đủ cho trang /student/progress dashboard.
  app.get('/api/student/progress-overview', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const pool = getAsgnPool();

      // 1. User profile + level/XP (nếu schema có)
      let profile = { name: user.email, level: 1, totalXp: 0, mbtiType: null };
      try {
        const ur = await pool.query(
          `SELECT email, name, image, "createdAt" FROM "User" WHERE id=$1 LIMIT 1`,
          [user.id]
        );
        if (ur.rows[0]) profile = { ...profile, ...ur.rows[0] };
      } catch {/* schema missing fields → ignore */}

      // 2. Exam stats — count + avgScore từ ExamAttempt nếu tồn tại
      let examStats = { count: 0, avgScore: 0, recent: [] };
      try {
        const er = await pool.query(`
          SELECT COUNT(*) AS count, AVG(score)::float AS avg_score
          FROM "ExamAttempt"
          WHERE "studentId" = $1 OR "userId" = $1
        `, [user.id]);
        examStats.count = parseInt(er.rows[0]?.count, 10) || 0;
        examStats.avgScore = Math.round((er.rows[0]?.avg_score || 0) * 100) / 100;
        // 5 attempts gần nhất
        const rec = await pool.query(`
          SELECT id, "examTitle", score, "completedAt"
          FROM "ExamAttempt"
          WHERE "studentId" = $1 OR "userId" = $1
          ORDER BY "completedAt" DESC NULLS LAST LIMIT 5
        `, [user.id]);
        examStats.recent = rec.rows.map(r => ({
          id: r.id, title: r.examTitle, score: r.score, at: r.completedAt,
        }));
      } catch {/* table not exist → keep zeros */}

      // 3. Streak — count consecutive days có ExamAttempt hoặc activity
      let streak = { current: 0, longest: 0, lastActive: null };
      try {
        const sr = await pool.query(`
          SELECT DISTINCT DATE("completedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day
          FROM "ExamAttempt"
          WHERE ("studentId" = $1 OR "userId" = $1) AND "completedAt" > NOW() - INTERVAL '90 days'
          ORDER BY day DESC
        `, [user.id]);
        const days = sr.rows.map(r => r.day);
        if (days.length > 0) {
          streak.lastActive = days[0];
          // Compute current streak (consecutive days từ hôm nay)
          let cur = 0;
          const today = new Date(); today.setHours(0, 0, 0, 0);
          for (let i = 0; i < days.length; i++) {
            const d = new Date(days[i]); d.setHours(0, 0, 0, 0);
            const expected = new Date(today.getTime() - i * 86400000);
            if (d.getTime() === expected.getTime()) cur++;
            else break;
          }
          streak.current = cur;
          // Longest (greedy max consecutive)
          let longest = 1, run = 1;
          for (let i = 1; i < days.length; i++) {
            const d1 = new Date(days[i - 1]); const d2 = new Date(days[i]);
            if ((d1.getTime() - d2.getTime()) === 86400000) { run++; longest = Math.max(longest, run); }
            else run = 1;
          }
          streak.longest = Math.max(longest, cur);
        }
      } catch {/* ignore */}

      // 4. Weekly XP heatmap — 7 ngày gần đây, group exam attempts → XP estimate
      const weekly = [];
      const today = new Date();
      try {
        const wr = await pool.query(`
          SELECT DATE("completedAt" AT TIME ZONE 'Asia/Ho_Chi_Minh') AS day,
                 COUNT(*) AS attempts, AVG(score)::float AS avg
          FROM "ExamAttempt"
          WHERE ("studentId" = $1 OR "userId" = $1) AND "completedAt" > NOW() - INTERVAL '7 days'
          GROUP BY day ORDER BY day
        `, [user.id]);
        const map = new Map(wr.rows.map(r => [String(r.day).slice(0, 10), r]));
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today.getTime() - i * 86400000);
          const key = d.toISOString().slice(0, 10);
          const r = map.get(key);
          // XP heuristic: 50 cho mỗi attempt + bonus theo score
          const xp = r ? Math.round((parseInt(r.attempts, 10) || 0) * 50 + (parseFloat(r.avg) || 0) * 5) : 0;
          weekly.push({
            date: key,
            label: ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()],
            xp,
            activities: r ? parseInt(r.attempts, 10) || 0 : 0,
          });
        }
      } catch {
        // Fallback: empty 7 days
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today.getTime() - i * 86400000);
          weekly.push({
            date: d.toISOString().slice(0, 10),
            label: ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()],
            xp: 0, activities: 0,
          });
        }
      }

      // 5. Knowledge Graph — count node interactions (votes/feedback by user)
      let kgStats = { topicsExplored: 0, votesGiven: 0, feedbackPosted: 0 };
      try {
        const kgPool = getKcPool();
        const v = await kgPool.query(`SELECT COUNT(*)::int AS c FROM stem_project_votes WHERE voter_id=$1`, [user.id]);
        const f = await kgPool.query(`SELECT COUNT(*)::int AS c FROM stem_project_feedback WHERE author_id=$1`, [user.id]);
        kgStats.votesGiven = v.rows[0]?.c || 0;
        kgStats.feedbackPosted = f.rows[0]?.c || 0;
      } catch {/* tables not exist → keep zeros */}

      // 6. KeoCo competitive — wins (count session where user team won)
      let keocoStats = { wins: 0, totalPlayed: 0 };
      try {
        const kcPool = getKcPool();
        const k = await kcPool.query(`
          SELECT
            COUNT(DISTINCT s.id) FILTER (WHERE s.winner_team = p.team) AS wins,
            COUNT(DISTINCT s.id) AS total
          FROM keoco_participants p
          JOIN keoco_sessions s ON s.id = p.session_id
          WHERE p.display_name = $1 OR p.display_name = $2
        `, [profile.name, profile.email]);
        keocoStats.wins = parseInt(k.rows[0]?.wins, 10) || 0;
        keocoStats.totalPlayed = parseInt(k.rows[0]?.total, 10) || 0;
      } catch {/* ignore */}

      // 7. Lesson plans HS được giao (qua TeacherStudentLink)
      let lessonsAssigned = 0;
      try {
        const lp = await pool.query(`
          SELECT COUNT(*)::int AS c FROM "LearningPathAssignment"
          WHERE "studentId" = $1
        `, [user.id]);
        lessonsAssigned = lp.rows[0]?.c || 0;
      } catch {/* ignore */}

      return res.json({
        success: true,
        profile,
        examStats,
        streak,
        weekly,
        kgStats,
        keocoStats,
        lessonsAssigned,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[student:progress-overview] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/teacher-student-link/:id ── 1 trong 2 phía gỡ link
  // KHÔNG xoá data cũ (assignments + grades giữ nguyên), chỉ stop sync mới
  app.delete('/api/teacher-student-link/:id', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      await ensureTSLTable();
      const pool = getAsgnPool();
      const r = await pool.query(`SELECT * FROM "TeacherStudentLink" WHERE id=$1`, [req.params.id]);
      const link = r.rows[0];
      if (!link) return res.status(404).json({ error: 'Link không tồn tại' });
      if (link.teacherId !== user.id && link.studentId !== user.id) {
        return res.status(403).json({ error: 'Bạn không có quyền gỡ link này' });
      }
      await pool.query(`DELETE FROM "TeacherStudentLink" WHERE id=$1`, [req.params.id]);
      // Notify phía còn lại
      const otherId = link.teacherId === user.id ? link.studentId : link.teacherId;
      await sendNotif(pool, otherId, user.id, 'link_rejected',
        `${user.email} đã gỡ kết nối`,
        'Dữ liệu cũ vẫn được lưu, chỉ ngừng đồng bộ mới', null, { linkId: link.id });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/users/search?q=... ── search user (cho UI tìm GV/HS để link)
  // Limit 20 results, search by email or name (LOWER), filter optional role
  app.get('/api/users/search', async (req, res) => {
    try {
      const user = getUserAsgn(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const pool = getAsgnPool();
      const q = String(req.query.q || '').trim().toLowerCase();
      const role = String(req.query.role || '').toUpperCase();
      if (q.length < 2) return res.json({ users: [] });
      const params = [`%${q}%`];
      let where = `(LOWER(email) LIKE $1 OR LOWER(name) LIKE $1)`;
      if (role === 'TEACHER' || role === 'STUDENT') {
        where += ` AND UPPER(role) = $2`;
        params.push(role);
      }
      // Loại trừ chính mình
      params.push(user.id);
      where += ` AND id != $${params.length}`;
      const { rows } = await pool.query(
        `SELECT id, email, name, image, role FROM "User" WHERE ${where} ORDER BY name ASC LIMIT 20`,
        params
      );
      return res.json({ users: rows });
    } catch (err) {
      return res.json({ users: [] });
    }
  });

  // ── GET /api/public/assignments/:token  (no auth) ────────────────
  app.get('/api/public/assignments/:token', async (req, res) => {
    try {
      await ensureAsgnReady();
      const pool = getAsgnPool();
      const q = await pool.query(
        `SELECT a.id, a.title, a.description, a.subject, a.difficulty, a.duration,
                a.content, a.max_score, a.due_date, a.qr_token,
                u.name AS teacher_name
           FROM assignments a
           LEFT JOIN "User" u ON u.id = a.teacher_id
          WHERE a.qr_token=$1 LIMIT 1`,
        [req.params.token]
      );
      if (q.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const r = q.rows[0];
      return res.json({
        id: r.id,
        title: r.title,
        description: r.description || '',
        subject: r.subject,
        difficulty: r.difficulty,
        duration: r.duration,
        content: r.content || '',
        maxScore: Number(r.max_score) || 10,
        dueDate: r.due_date ? new Date(r.due_date).toISOString() : null,
        teacherName: r.teacher_name || 'Giáo viên',
        qrToken: r.qr_token,
      });
    } catch (err) {
      console.error('[assignments:public-get] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ── POST /api/public/assignments/:token/submit  (no auth) ────────
  //   body: { scannerName (required), scannerEmail?, answerText?, score?, timeSpent?, metadata? }
  app.post('/api/public/assignments/:token/submit', async (req, res) => {
    try {
      await ensureAsgnReady();
      const b = req.body || {};
      const name = String(b.scannerName || '').trim();
      if (!name) return res.status(400).json({ success: false, error: 'name_required' });
      if (name.length > 200) return res.status(400).json({ success: false, error: 'name_too_long' });

      const pool = getAsgnPool();
      const aq = await pool.query(`SELECT id FROM assignments WHERE qr_token=$1 LIMIT 1`, [req.params.token]);
      if (aq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const assignmentId = aq.rows[0].id;

      // Optional auth: if scanner is logged in we capture their userId
      const user = getUserAsgn(req);

      const id = newAsgnId('sub_');
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim().slice(0, 60);
      const ua = (req.headers['user-agent'] || '').toString().slice(0, 500);

      await pool.query(
        `INSERT INTO assignment_submissions
           (id, assignment_id, scanner_name, scanner_email, scanner_user_id,
            score, answer_text, time_spent, metadata, ip, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id, assignmentId, name,
          b.scannerEmail ? String(b.scannerEmail).slice(0, 200) : null,
          user?.id || null,
          b.score == null ? null : Number(b.score),
          b.answerText ? String(b.answerText).slice(0, 20000) : null,
          b.timeSpent == null ? null : Number(b.timeSpent),
          b.metadata ? JSON.stringify(b.metadata) : null,
          ip, ua,
        ]
      );

      return res.status(201).json({ success: true, data: { id, assignmentId, scannerName: name } });
    } catch (err) {
      console.error('[assignments:public-submit] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });
}

// ════════════════════════════════════════════════════════════════════════
// KÉO CO KIẾN THỨC — Knowledge Tug-of-War
//   /api/keoco/*   teacher CRUD + public scan/join/answer + 1v1 challenge
// Two modes:
//   1) Classroom — teacher creates session, students scan QR, auto-balanced
//      to RED/BLUE teams, synchronized question delivery, live rope position.
//   2) 1v1 Challenge — async; creator plays first, sets baseline score,
//      opponent gets a shareable link to try and beat it.
// Pulls questions from existing "Question" table (same as exam-prep).
// MUST register BEFORE the catch-all aero-backend proxy at the bottom.
// ════════════════════════════════════════════════════════════════════════
{
  const { Pool: KcPool } = require('pg');
  const jwtKc = require('jsonwebtoken');
  const cryptoKc = require('crypto');

  let _kcPool = null;
  function getKcPool() {
    if (_kcPool) return _kcPool;
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    _kcPool = new KcPool({
      connectionString: url,
      ssl: url.includes('neon.tech') || url.includes('sslmode=require')
        ? { rejectUnauthorized: false } : false,
      max: 5,
    });
    return _kcPool;
  }

  function newKcId(prefix) {
    return (prefix || 'kc_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function newKcToken() {
    return cryptoKc.randomBytes(18).toString('base64url'); // 24 chars URL-safe
  }
  function newKcShortCode() {
    // 6-digit numeric code for easy classroom entry
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function getUserKc(req) {
    try {
      const h = req.headers.authorization || '';
      const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (!tok) return null;
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
        || 'dev-insecure-fallback-change-me';
      const decoded = jwtKc.verify(tok, secret);
      return {
        id: decoded.sub || decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role || 'STUDENT',
      };
    } catch { return null; }
  }

  async function ensureKcTables() {
    const pool = getKcPool();
    // ── classroom sessions ────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS keoco_sessions (
        id              VARCHAR(255) PRIMARY KEY,
        title           VARCHAR(500) NOT NULL,
        subject         VARCHAR(100) NOT NULL DEFAULT 'Vật lý',
        grade           VARCHAR(50)  NOT NULL DEFAULT 'Khối 12',
        difficulty      VARCHAR(20),
        topic           VARCHAR(200),
        question_count  INTEGER NOT NULL DEFAULT 10,
        question_ids    JSONB,
        time_per_question INTEGER NOT NULL DEFAULT 20,
        rope_max        INTEGER NOT NULL DEFAULT 100,
        teacher_id      VARCHAR(255) NOT NULL,
        qr_token        VARCHAR(64) UNIQUE,
        short_code      VARCHAR(8)  UNIQUE,
        status          VARCHAR(20) NOT NULL DEFAULT 'lobby',
        rope_position   INTEGER NOT NULL DEFAULT 0,
        current_index   INTEGER NOT NULL DEFAULT -1,
        current_started_at TIMESTAMPTZ,
        winner          VARCHAR(10),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at     TIMESTAMPTZ
      );
    `);
    // ── players in a session ──────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS keoco_players (
        id           VARCHAR(255) PRIMARY KEY,
        session_id   VARCHAR(255) NOT NULL REFERENCES keoco_sessions(id) ON DELETE CASCADE,
        player_token VARCHAR(64)  NOT NULL,
        name         VARCHAR(200) NOT NULL,
        team         VARCHAR(10)  NOT NULL,
        user_id      VARCHAR(255),
        score        INTEGER NOT NULL DEFAULT 0,
        correct      INTEGER NOT NULL DEFAULT 0,
        wrong        INTEGER NOT NULL DEFAULT 0,
        streak       INTEGER NOT NULL DEFAULT 0,
        ip           VARCHAR(64),
        joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(session_id, player_token)
      );
    `);
    // ── per-answer log ────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS keoco_answers (
        id           VARCHAR(255) PRIMARY KEY,
        session_id   VARCHAR(255) NOT NULL REFERENCES keoco_sessions(id) ON DELETE CASCADE,
        player_id    VARCHAR(255) NOT NULL REFERENCES keoco_players(id) ON DELETE CASCADE,
        question_idx INTEGER NOT NULL,
        question_id  VARCHAR(255),
        answer       TEXT,
        correct      BOOLEAN NOT NULL,
        time_ms      INTEGER,
        delta        INTEGER NOT NULL,
        rope_after   INTEGER NOT NULL,
        team         VARCHAR(10) NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // ── 1v1 challenges (async) ────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS keoco_challenges (
        id              VARCHAR(255) PRIMARY KEY,
        title           VARCHAR(500) NOT NULL,
        subject         VARCHAR(100) NOT NULL DEFAULT 'Vật lý',
        grade           VARCHAR(50)  NOT NULL DEFAULT 'Khối 12',
        difficulty      VARCHAR(20),
        topic           VARCHAR(200),
        question_count  INTEGER NOT NULL DEFAULT 10,
        question_ids    JSONB,
        time_per_question INTEGER NOT NULL DEFAULT 20,
        token           VARCHAR(64) UNIQUE,
        creator_id      VARCHAR(255),
        creator_name    VARCHAR(200) NOT NULL,
        creator_score   INTEGER,
        creator_correct INTEGER,
        creator_time_ms INTEGER,
        creator_played_at TIMESTAMPTZ,
        opponent_name   VARCHAR(200),
        opponent_score  INTEGER,
        opponent_correct INTEGER,
        opponent_time_ms INTEGER,
        opponent_played_at TIMESTAMPTZ,
        winner          VARCHAR(20),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // best-effort indices
    const idx = [
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_keoco_qr_token ON keoco_sessions(qr_token) WHERE qr_token IS NOT NULL`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_keoco_short_code ON keoco_sessions(short_code) WHERE short_code IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_keoco_teacher ON keoco_sessions(teacher_id)`,
      `CREATE INDEX IF NOT EXISTS idx_keoco_status ON keoco_sessions(status)`,
      `CREATE INDEX IF NOT EXISTS idx_keoco_players_session ON keoco_players(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_keoco_answers_session ON keoco_answers(session_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_keoco_chal_token ON keoco_challenges(token)`,
      `CREATE INDEX IF NOT EXISTS idx_keoco_chal_creator ON keoco_challenges(creator_id)`,
    ];
    for (const sql of idx) { try { await pool.query(sql); } catch (_) { /* ignore */ } }
  }

  let kcReady = null;
  function ensureKcReady() {
    if (!kcReady) kcReady = ensureKcTables().catch((e) => {
      console.error('[keoco:init] ❌', e.message); kcReady = null;
    });
    return kcReady;
  }

  function scanUrlForKc(req, token) {
    if (!token) return null;
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${proto}://${host}/k/${token}`;
  }
  function challengeUrlForKc(req, token) {
    if (!token) return null;
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${proto}://${host}/kc/${token}`;
  }

  function sessionToClient(r, extras) {
    const base = {
      id: r.id,
      title: r.title,
      subject: r.subject,
      grade: r.grade,
      difficulty: r.difficulty || null,
      topic: r.topic || null,
      questionCount: r.question_count,
      questionIds: Array.isArray(r.question_ids) ? r.question_ids
                  : (r.question_ids ? (typeof r.question_ids === 'string' ? JSON.parse(r.question_ids) : r.question_ids) : []),
      timePerQuestion: r.time_per_question,
      ropeMax: r.rope_max,
      teacherId: r.teacher_id,
      qrToken: r.qr_token,
      shortCode: r.short_code,
      status: r.status,
      ropePosition: r.rope_position,
      currentIndex: r.current_index,
      currentStartedAt: r.current_started_at ? new Date(r.current_started_at).toISOString() : null,
      winner: r.winner || null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
    };
    return extras ? { ...base, ...extras } : base;
  }
  function playerToClient(r) {
    return {
      id: r.id,
      name: r.name,
      team: r.team,
      score: r.score,
      correct: r.correct,
      wrong: r.wrong,
      streak: r.streak,
      joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : null,
    };
  }

  // Pick N questions for a session/challenge from "Question" table.
  // Returns array of question rows (id, content, options, correctAnswer, ...)
  async function pickQuestions(pool, { subject, grade, difficulty, topic, count }) {
    const conds = [];
    const vals = [];
    let j = 1;
    if (subject)    { conds.push(`subject = $${j++}`);    vals.push(subject); }
    if (grade)      { conds.push(`grade = $${j++}`);      vals.push(grade); }
    if (difficulty) { conds.push(`difficulty = $${j++}`); vals.push(difficulty); }
    if (topic)      { conds.push(`topic ILIKE $${j++}`);  vals.push(`%${topic}%`); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    let q;
    try {
      q = await pool.query(
        `SELECT id, content, options, "correctAnswer", explanation, difficulty, topic, subject
           FROM "Question" ${where} ORDER BY RANDOM() LIMIT $${j}`,
        [...vals, count]
      );
    } catch (err) {
      console.warn('[keoco:pickQuestions] Question table query failed:', err.message);
      q = { rows: [] };
    }
    return q.rows;
  }

  // Look up a single question by id (for grading)
  async function getQuestionById(pool, id) {
    try {
      const q = await pool.query(
        `SELECT id, content, options, "correctAnswer" FROM "Question" WHERE id=$1 LIMIT 1`,
        [id]
      );
      return q.rows[0] || null;
    } catch { return null; }
  }

  // Strip the correct answer for client delivery
  function publicQuestion(q, idx) {
    if (!q) return null;
    return {
      index: idx,
      id: q.id,
      content: q.content,
      options: Array.isArray(q.options) ? q.options
              : (q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : []),
      topic: q.topic || null,
      difficulty: q.difficulty || null,
    };
  }

  // Normalize MCQ + numeric + text answers — xem comment ở exam-prep submit.
  function normalizeKcAnswer(s) {
    s = String(s ?? '').trim();
    if (!s) return '';
    if (/^[A-Z]$/i.test(s)) return s.toUpperCase();
    const m = s.match(/^([A-Z])[\.\)\s]/i);
    if (m) return m[1].toUpperCase();
    const numStr = s.replace(/,/g, '.').replace(/\s+/g, '');
    if (numStr !== '' && !isNaN(Number(numStr))) return String(Number(numStr));
    return s.toLowerCase();
  }

  function isCorrect(q, given) {
    if (!q) return false;
    const a = normalizeKcAnswer(q.correctAnswer);
    if (!a) return false;
    return a === normalizeKcAnswer(given);
  }

  // ════════════════════════════════════════════════
  // CLASSROOM MODE — teacher routes
  // ════════════════════════════════════════════════

  // POST /api/keoco/sessions  (teacher creates session)
  app.post('/api/keoco/sessions', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();

      const b = req.body || {};
      const title = String(b.title || 'Kéo Co Kiến Thức').slice(0, 500);
      const subject = String(b.subject || 'Vật lý').slice(0, 100);
      const grade = String(b.grade || 'Khối 12').slice(0, 50);
      const difficulty = b.difficulty ? String(b.difficulty).slice(0, 20) : null;
      const topic = b.topic ? String(b.topic).slice(0, 200) : null;
      const questionCount = Math.min(Math.max(parseInt(b.questionCount || '10', 10), 3), 50);
      const timePerQuestion = Math.min(Math.max(parseInt(b.timePerQuestion || '20', 10), 5), 120);
      const ropeMax = Math.min(Math.max(parseInt(b.ropeMax || '100', 10), 50), 500);

      // Pre-pick the question set so all players see the same questions
      const picked = await pickQuestions(pool, { subject, grade, difficulty, topic, count: questionCount });
      const qIds = picked.map((q) => q.id);
      if (qIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'no_questions',
          message: 'Không tìm thấy câu hỏi nào trong ngân hàng đề khớp với tiêu chí. Hãy thêm câu hỏi vào "/dashboard/labtwin/labs/question-bank" trước.',
        });
      }

      const id = newKcId('kcs_');
      const qrToken = newKcToken();
      const shortCode = newKcShortCode();

      await pool.query(
        `INSERT INTO keoco_sessions
          (id, title, subject, grade, difficulty, topic, question_count, question_ids,
           time_per_question, rope_max, teacher_id, qr_token, short_code, status,
           rope_position, current_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'lobby',0,-1)`,
        [id, title, subject, grade, difficulty, topic, qIds.length, JSON.stringify(qIds),
         timePerQuestion, ropeMax, user.id, qrToken, shortCode]
      );

      const r = (await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [id])).rows[0];
      return res.status(201).json({
        success: true,
        data: sessionToClient(r, {
          scanUrl: scanUrlForKc(req, qrToken),
        }),
      });
    } catch (err) {
      console.error('[keoco:create] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/sessions  (teacher lists their sessions)
  app.get('/api/keoco/sessions', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();
      const q = await pool.query(
        `SELECT * FROM keoco_sessions WHERE teacher_id=$1 ORDER BY created_at DESC LIMIT 50`,
        [user.id]
      );
      return res.json({
        success: true,
        data: q.rows.map((r) => sessionToClient(r, { scanUrl: scanUrlForKc(req, r.qr_token) })),
      });
    } catch (err) {
      console.error('[keoco:list] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/sessions/:id  (teacher view — full state)
  app.get('/api/keoco/sessions/:id', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();
      const sq = await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [req.params.id]);
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];
      if (s.teacher_id !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });

      const pq = await pool.query(`SELECT * FROM keoco_players WHERE session_id=$1 ORDER BY joined_at`, [s.id]);
      const players = pq.rows.map(playerToClient);
      const teamCounts = { red: 0, blue: 0 };
      const teamScores = { red: 0, blue: 0 };
      for (const p of players) {
        teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
        teamScores[p.team] = (teamScores[p.team] || 0) + (p.score || 0);
      }

      // current question (if running)
      let currentQuestion = null;
      const qIds = Array.isArray(s.question_ids) ? s.question_ids
                  : (s.question_ids ? JSON.parse(s.question_ids) : []);
      if (s.status === 'running' && s.current_index >= 0 && qIds[s.current_index]) {
        const q = await getQuestionById(pool, qIds[s.current_index]);
        currentQuestion = publicQuestion(q, s.current_index);
      }

      return res.json({
        success: true,
        data: {
          ...sessionToClient(s, { scanUrl: scanUrlForKc(req, s.qr_token) }),
          players,
          teamCounts,
          teamScores,
          currentQuestion,
        },
      });
    } catch (err) {
      console.error('[keoco:get] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/sessions/:id/start  (teacher starts the game)
  app.post('/api/keoco/sessions/:id/start', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();
      const sq = await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [req.params.id]);
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];
      if (s.teacher_id !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });
      if (s.status !== 'lobby') return res.status(400).json({ success: false, error: 'not_in_lobby' });

      await pool.query(
        `UPDATE keoco_sessions
            SET status='running', current_index=0, current_started_at=NOW(), updated_at=NOW()
          WHERE id=$1`,
        [s.id]
      );
      const r = (await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [s.id])).rows[0];
      return res.json({ success: true, data: sessionToClient(r) });
    } catch (err) {
      console.error('[keoco:start] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/sessions/:id/next  (teacher advances to next question)
  app.post('/api/keoco/sessions/:id/next', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();
      const sq = await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [req.params.id]);
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];
      if (s.teacher_id !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });
      if (s.status !== 'running') return res.status(400).json({ success: false, error: 'not_running' });

      const next = s.current_index + 1;
      if (next >= s.question_count) {
        // finish
        const winner = s.rope_position > 0 ? 'blue' : (s.rope_position < 0 ? 'red' : 'tie');
        await pool.query(
          `UPDATE keoco_sessions SET status='finished', winner=$1, finished_at=NOW(), updated_at=NOW() WHERE id=$2`,
          [winner, s.id]
        );
      } else {
        await pool.query(
          `UPDATE keoco_sessions SET current_index=$1, current_started_at=NOW(), updated_at=NOW() WHERE id=$2`,
          [next, s.id]
        );
      }
      const r = (await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [s.id])).rows[0];
      return res.json({ success: true, data: sessionToClient(r) });
    } catch (err) {
      console.error('[keoco:next] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/sessions/:id/finish  (teacher ends early)
  app.post('/api/keoco/sessions/:id/finish', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();
      const sq = await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [req.params.id]);
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];
      if (s.teacher_id !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });
      const winner = s.rope_position > 0 ? 'blue' : (s.rope_position < 0 ? 'red' : 'tie');
      await pool.query(
        `UPDATE keoco_sessions SET status='finished', winner=$1, finished_at=NOW(), updated_at=NOW() WHERE id=$2`,
        [winner, s.id]
      );
      const r = (await pool.query(`SELECT * FROM keoco_sessions WHERE id=$1`, [s.id])).rows[0];
      return res.json({ success: true, data: sessionToClient(r) });
    } catch (err) {
      console.error('[keoco:finish] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // DELETE /api/keoco/sessions/:id  (teacher deletes)
  app.delete('/api/keoco/sessions/:id', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();
      const sq = await pool.query(`SELECT teacher_id FROM keoco_sessions WHERE id=$1`, [req.params.id]);
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      if (sq.rows[0].teacher_id !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });
      await pool.query(`DELETE FROM keoco_sessions WHERE id=$1`, [req.params.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error('[keoco:delete] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // GAME CATALOG — đề thi được GV add vào danh mục trò chơi đối kháng
  // (Keo-co, Speed-quiz...). KeoCoApp dropdown chọn đề từ catalog này.
  // ════════════════════════════════════════════════
  let gameCatalogReady = false;
  async function ensureGameCatalogReady() {
    if (gameCatalogReady) return;
    const pool = getKcPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_catalog (
        id TEXT PRIMARY KEY,
        teacher_id TEXT NOT NULL,
        exam_id TEXT NOT NULL,
        exam_title TEXT NOT NULL,
        subject TEXT,
        grade TEXT,
        question_count INT DEFAULT 0,
        game_type TEXT NOT NULL DEFAULT 'keo-co',
        added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_game_catalog_type ON game_catalog(game_type, added_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_game_catalog_teacher ON game_catalog(teacher_id, added_at DESC)`);
    gameCatalogReady = true;
  }

  // POST /api/games/catalog — GV add 1 đề vào danh mục trò chơi
  app.post('/api/games/catalog', express.json({ limit: '256kb' }), async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      const { examId, examTitle, subject, grade, questionCount, gameType } = req.body || {};
      if (!examId || !examTitle) {
        return res.status(400).json({ success: false, error: 'examId + examTitle required' });
      }
      const validTypes = ['keo-co', 'speed-quiz', 'best-of-3', 'duel-3min'];
      const gt = validTypes.includes(gameType) ? gameType : 'keo-co';
      await ensureGameCatalogReady();
      const pool = getKcPool();
      // Check duplicate: nếu đã add đề này cho game type rồi thì update added_at
      const existing = await pool.query(
        `SELECT id FROM game_catalog WHERE teacher_id=$1 AND exam_id=$2 AND game_type=$3`,
        [user.id, String(examId), gt]
      );
      if (existing.rowCount > 0) {
        await pool.query(`UPDATE game_catalog SET added_at=NOW() WHERE id=$1`, [existing.rows[0].id]);
        return res.json({ success: true, id: existing.rows[0].id, deduped: true });
      }
      const id = 'gc_' + Math.random().toString(36).slice(2, 12);
      await pool.query(
        `INSERT INTO game_catalog (id, teacher_id, exam_id, exam_title, subject, grade, question_count, game_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, user.id, String(examId), String(examTitle).slice(0, 200),
         subject ? String(subject).slice(0, 80) : null,
         grade ? String(grade).slice(0, 20) : null,
         Number(questionCount) || 0, gt]
      );
      console.log(`[games:catalog] ✅ added exam=${examId} type=${gt} teacher=${user.id}`);
      return res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('[games:catalog:add] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/games/catalog?type=keo-co — list đề trong catalog cho game type
  app.get('/api/games/catalog', async (req, res) => {
    try {
      await ensureGameCatalogReady();
      const pool = getKcPool();
      const gameType = String(req.query.type || 'keo-co').slice(0, 30);
      const r = await pool.query(
        `SELECT id, exam_id, exam_title, subject, grade, question_count, game_type, added_at
         FROM game_catalog WHERE game_type=$1 ORDER BY added_at DESC LIMIT 100`,
        [gameType]
      );
      return res.json({
        success: true,
        items: r.rows.map(x => ({
          id: x.id, examId: x.exam_id, examTitle: x.exam_title,
          subject: x.subject, grade: x.grade, questionCount: x.question_count,
          gameType: x.game_type, addedAt: x.added_at,
        })),
      });
    } catch (err) {
      console.error('[games:catalog:list] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /api/games/catalog/:id — remove khỏi catalog (chỉ owner)
  app.delete('/api/games/catalog/:id', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureGameCatalogReady();
      const pool = getKcPool();
      const q = await pool.query(`SELECT teacher_id FROM game_catalog WHERE id=$1`, [req.params.id]);
      if (q.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      if (q.rows[0].teacher_id !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });
      await pool.query(`DELETE FROM game_catalog WHERE id=$1`, [req.params.id]);
      return res.json({ success: true });
    } catch (err) {
      console.error('[games:catalog:del] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // KEO-CO LEADERBOARD — top players/teams across sessions
  // Aggregate từ keoco_sessions + keoco_participants (mỗi session 1 winner).
  // ════════════════════════════════════════════════
  app.get('/api/keoco/leaderboard', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      // Top players by wins (group by name from participants table, count sessions
      // where their team won). Limit 10.
      // Fallback: nếu schema chưa có winner column hoặc bảng chưa create → return []
      let rows = [];
      try {
        const r = await pool.query(`
          SELECT
            p.display_name AS name,
            COUNT(DISTINCT s.id) FILTER (WHERE s.winner_team = p.team) AS wins,
            COUNT(DISTINCT s.id) AS total_played,
            COALESCE(SUM(p.score), 0) AS total_score
          FROM keoco_participants p
          JOIN keoco_sessions s ON s.id = p.session_id
          WHERE p.display_name IS NOT NULL AND p.display_name <> ''
          GROUP BY p.display_name
          ORDER BY wins DESC, total_score DESC, total_played DESC
          LIMIT 10
        `);
        rows = r.rows;
      } catch (e) {
        console.warn('[keoco:leaderboard] schema chưa đủ, return []:', e.message);
        rows = [];
      }
      return res.json({
        success: true,
        leaderboard: rows.map((x, i) => ({
          rank: i + 1,
          name: x.name,
          wins: parseInt(x.wins, 10) || 0,
          totalPlayed: parseInt(x.total_played, 10) || 0,
          totalScore: parseInt(x.total_score, 10) || 0,
          winRate: x.total_played > 0 ? Math.round((x.wins / x.total_played) * 100) : 0,
        })),
      });
    } catch (err) {
      console.error('[keoco:leaderboard] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // STEM PROJECT VOTE + FEEDBACK (cho project public)
  // Bảng stem_project_votes + stem_project_feedback (discover-and-patch)
  // ════════════════════════════════════════════════
  let stemSocialReady = false;
  async function ensureStemSocialReady() {
    if (stemSocialReady) return;
    const pool = getKcPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stem_project_votes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        voter_id TEXT NOT NULL,
        vote_type TEXT NOT NULL CHECK (vote_type IN ('up','down')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (project_id, voter_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stem_project_feedback (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_name TEXT,
        comment TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_stem_votes_proj ON stem_project_votes(project_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_stem_fb_proj ON stem_project_feedback(project_id, created_at DESC)`);
    stemSocialReady = true;
  }

  // GET /api/stem/projects/:id/social — tổng vote + list feedback
  app.get('/api/stem/projects/:id/social', async (req, res) => {
    try {
      await ensureStemSocialReady();
      const pool = getKcPool();
      const pid = req.params.id;
      const user = getUserKc(req);
      const [vq, fq, mq] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE vote_type='up') AS ups,
             COUNT(*) FILTER (WHERE vote_type='down') AS downs
           FROM stem_project_votes WHERE project_id=$1`,
          [pid]
        ),
        pool.query(
          `SELECT id, author_id, author_name, comment, created_at
           FROM stem_project_feedback WHERE project_id=$1 ORDER BY created_at DESC LIMIT 50`,
          [pid]
        ),
        user
          ? pool.query(
              `SELECT vote_type FROM stem_project_votes WHERE project_id=$1 AND voter_id=$2`,
              [pid, user.id]
            )
          : Promise.resolve({ rows: [] }),
      ]);
      return res.json({
        success: true,
        ups: parseInt(vq.rows[0]?.ups, 10) || 0,
        downs: parseInt(vq.rows[0]?.downs, 10) || 0,
        myVote: mq.rows[0]?.vote_type || null,
        feedback: fq.rows.map(x => ({
          id: x.id, authorId: x.author_id, authorName: x.author_name || 'Ẩn danh',
          comment: x.comment, createdAt: x.created_at,
        })),
      });
    } catch (err) {
      console.error('[stem:social:get] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/stem/projects/:id/vote — vote up/down (toggle nếu đã vote)
  app.post('/api/stem/projects/:id/vote', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      const { vote } = req.body || {};
      if (vote !== 'up' && vote !== 'down' && vote !== null) {
        return res.status(400).json({ success: false, error: 'vote must be up|down|null' });
      }
      await ensureStemSocialReady();
      const pool = getKcPool();
      const pid = req.params.id;
      if (vote === null) {
        await pool.query(
          `DELETE FROM stem_project_votes WHERE project_id=$1 AND voter_id=$2`,
          [pid, user.id]
        );
      } else {
        await pool.query(
          `INSERT INTO stem_project_votes (id, project_id, voter_id, vote_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (project_id, voter_id) DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = NOW()`,
          ['v_' + Math.random().toString(36).slice(2, 12), pid, user.id, vote]
        );
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('[stem:vote] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/stem/projects/:id/feedback — submit comment
  app.post('/api/stem/projects/:id/feedback', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      const { comment, authorName } = req.body || {};
      if (!comment || typeof comment !== 'string' || comment.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'comment ≥2 chars required' });
      }
      await ensureStemSocialReady();
      const pool = getKcPool();
      const id = 'fb_' + Math.random().toString(36).slice(2, 12);
      await pool.query(
        `INSERT INTO stem_project_feedback (id, project_id, author_id, author_name, comment)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, req.params.id, user.id, String(authorName || '').slice(0, 80) || null, comment.trim().slice(0, 1000)]
      );
      return res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('[stem:feedback] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // STARTUP BLUEPRINT AI — generate Lean Canvas từ STEM project description
  // ════════════════════════════════════════════════
  app.post('/api/stem/blueprint-suggest', express.json({ limit: '32kb' }), async (req, res) => {
    const t0 = Date.now();
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      const { projectTitle, projectDescription, targetMarket } = req.body || {};
      if (!projectTitle || projectTitle.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'projectTitle ≥3 chars required' });
      }

      const fal = require('./lib/fal-client.cjs');
      const sysPrompt = [
        'Bạn là cố vấn khởi nghiệp cho HS THPT Việt Nam. Người dùng có 1 dự án STEM và muốn biến nó thành sản phẩm khởi nghiệp.',
        'Hãy phân tích theo phương pháp Lean Canvas (9 ô) — đơn giản, dễ hiểu cho HS, văn phong khích lệ.',
        '',
        'TRẢ VỀ duy nhất JSON object theo schema:',
        '{',
        '  "productIdea": "1 câu mô tả sản phẩm khởi nghiệp",',
        '  "problem": "vấn đề thực tế mà sản phẩm giải quyết (2-3 câu)",',
        '  "customerSegments": ["nhóm KH 1", "nhóm KH 2", "nhóm KH 3"],',
        '  "uniqueValueProposition": "giá trị độc đáo (1-2 câu hấp dẫn)",',
        '  "solution": "giải pháp cụ thể (cách thức hoạt động)",',
        '  "channels": ["kênh tiếp cận KH 1", "kênh 2", "kênh 3"],',
        '  "revenueStreams": ["nguồn doanh thu 1 (VD: bán sản phẩm)", "nguồn 2 (VD: subscription)"],',
        '  "costStructure": ["chi phí 1 (linh kiện)", "chi phí 2 (marketing)", "chi phí 3"],',
        '  "keyMetrics": ["chỉ số 1 (VD: số đơn/tháng)", "chỉ số 2 (VD: NPS)"],',
        '  "unfairAdvantage": "lợi thế cạnh tranh khó copy",',
        '  "estimatedStartupCost": "X triệu VND (range thực tế HS có thể tự bỏ vốn)",',
        '  "firstMilestone": "mục tiêu 90 ngày đầu cụ thể, đo được",',
        '  "risks": ["rủi ro 1", "rủi ro 2"],',
        '  "nextSteps": ["bước 1 làm ngay", "bước 2", "bước 3"]',
        '}',
        '',
        'KHÔNG markdown code fence. CHỈ JSON thuần. Tất cả text tiếng Việt.',
      ].join('\n');

      const userPrompt = [
        `TÊN DỰ ÁN STEM: ${projectTitle.trim()}`,
        projectDescription ? `\nMÔ TẢ: ${projectDescription.trim()}` : '',
        targetMarket ? `\nTHỊ TRƯỜNG MỤC TIÊU GỢI Ý: ${targetMarket.trim()}` : '',
        '',
        'Hãy phân tích dự án này như 1 startup có tiềm năng và sinh blueprint chi tiết.',
      ].filter(Boolean).join('\n');

      const result = await fal.complete({
        messages: [{ role: 'user', content: userPrompt }],
        system: sysPrompt,
      });

      let raw = (result?.content || '').trim();
      // Strip fence nếu có
      const fenceMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (fenceMatch) raw = fenceMatch[1].trim();

      let blueprint;
      try {
        blueprint = JSON.parse(raw);
      } catch (e) {
        console.warn('[stem:blueprint] AI returned non-JSON, fallback to text:', raw.slice(0, 200));
        return res.status(502).json({
          success: false, error: 'AI trả về không phải JSON hợp lệ', rawPreview: raw.slice(0, 500),
        });
      }

      console.log(`[stem:blueprint] ✅ user=${user.id} project="${projectTitle.slice(0, 40)}" took=${Date.now() - t0}ms`);
      return res.json({ success: true, blueprint, tookMs: Date.now() - t0 });
    } catch (err) {
      console.error('[stem:blueprint] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // KNOWLEDGE GRAPH — Đồ thị tri thức cho việc tìm kiếm liên ngành
  // 2 bảng: kg_nodes + kg_edges. Search/expand/seed endpoints.
  // ════════════════════════════════════════════════
  let kgReady = false;
  async function ensureKgReady() {
    if (kgReady) return;
    const pool = getKcPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kg_nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        properties JSONB DEFAULT '{}'::jsonb,
        source_type TEXT,
        source_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kg_edges (
        id TEXT PRIMARY KEY,
        from_id TEXT NOT NULL,
        to_id TEXT NOT NULL,
        rel_type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        properties JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (from_id, to_id, rel_type)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes(type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kg_edges_from ON kg_edges(from_id, rel_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kg_edges_to   ON kg_edges(to_id, rel_type)`);
    // ── Phase 3: personal mastery layer ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kg_mastery (
        user_id    TEXT NOT NULL,
        node_id    TEXT NOT NULL,
        score      REAL NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
        attempts   INTEGER NOT NULL DEFAULT 0,
        source     TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, node_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kg_mastery_user ON kg_mastery(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kg_mastery_node ON kg_mastery(node_id)`);
    // Trigram extension cho fuzzy search (skip nếu đã có)
    try {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_kg_nodes_label_trgm ON kg_nodes USING gin (label gin_trgm_ops)`);
    } catch (e) { console.warn('[kg] pg_trgm setup skipped:', e.message); }
    kgReady = true;
  }

  // Seed Vật lí 11 — ~80 nodes + ~150 edges (idempotent: ON CONFLICT DO NOTHING)
  async function seedKgPhysics11() {
    await ensureKgReady();
    const pool = getKcPool();
    // ── Nodes ──
    const nodes = [
      // Subject (1)
      { id: 'subj-vatli', type: 'Subject', label: 'Vật lí', description: 'Môn Vật lí THPT theo GDPT 2018' },
      // Chapters (5)
      { id: 'chap-co-hoc',     type: 'Chapter', label: 'Cơ học',     description: 'Chuyển động, lực, năng lượng' },
      { id: 'chap-nhiet-hoc',  type: 'Chapter', label: 'Nhiệt học',  description: 'Nhiệt độ, áp suất, khí lý tưởng' },
      { id: 'chap-dien-hoc',   type: 'Chapter', label: 'Điện học',   description: 'Điện tích, dòng điện, mạch' },
      { id: 'chap-tu-truong',  type: 'Chapter', label: 'Từ trường',  description: 'Lực Lorentz, cảm ứng điện từ' },
      { id: 'chap-dao-dong',   type: 'Chapter', label: 'Dao động & Sóng', description: 'Dao động điều hòa, sóng cơ' },
      // Topics (~22)
      { id: 'topic-dong-luong',     type: 'Topic', label: 'Động lượng',         description: 'Đại lượng vector p = m·v đặc trưng cho khả năng truyền chuyển động' },
      { id: 'topic-bao-toan-p',     type: 'Topic', label: 'Bảo toàn động lượng', description: 'Tổng động lượng hệ kín không đổi' },
      { id: 'topic-va-cham',        type: 'Topic', label: 'Va chạm',             description: 'Va chạm đàn hồi & không đàn hồi' },
      { id: 'topic-cong',           type: 'Topic', label: 'Công cơ học',         description: 'A = F·s·cosα' },
      { id: 'topic-cong-suat',      type: 'Topic', label: 'Công suất',           description: 'P = A/t (đơn vị Watt)' },
      { id: 'topic-nang-luong',     type: 'Topic', label: 'Năng lượng',          description: 'Cơ năng = động năng + thế năng' },
      { id: 'topic-bao-toan-e',     type: 'Topic', label: 'Bảo toàn năng lượng', description: 'Định luật bảo toàn cơ năng' },
      { id: 'topic-luc-newton',     type: 'Topic', label: '3 định luật Newton',  description: 'Quán tính, F=ma, phản lực' },
      { id: 'topic-trong-luc',      type: 'Topic', label: 'Trọng lực',           description: 'Lực hấp dẫn của Trái Đất' },
      { id: 'topic-luc-ma-sat',     type: 'Topic', label: 'Lực ma sát',          description: 'Ma sát nghỉ + trượt + lăn' },
      { id: 'topic-dao-dong-dh',    type: 'Topic', label: 'Dao động điều hòa',   description: 'x = A·cos(ωt+φ)' },
      { id: 'topic-con-lac-don',    type: 'Topic', label: 'Con lắc đơn',         description: 'Chu kì T = 2π√(l/g)' },
      { id: 'topic-con-lac-lo-xo',  type: 'Topic', label: 'Con lắc lò xo',       description: 'Chu kì T = 2π√(m/k)' },
      { id: 'topic-song-co',        type: 'Topic', label: 'Sóng cơ',             description: 'Lan truyền dao động trong môi trường' },
      { id: 'topic-giao-thoa',      type: 'Topic', label: 'Giao thoa sóng',      description: 'Tổng hợp 2 sóng kết hợp' },
      { id: 'topic-dien-tich',      type: 'Topic', label: 'Điện tích & Coulomb', description: 'Lực Coulomb F = kq1q2/r²' },
      { id: 'topic-dien-truong',    type: 'Topic', label: 'Điện trường',         description: 'E = F/q (V/m)' },
      { id: 'topic-dien-the',       type: 'Topic', label: 'Hiệu điện thế',       description: 'U = A/q (Volt)' },
      { id: 'topic-mach-dien',      type: 'Topic', label: 'Mạch điện một chiều', description: 'Định luật Ohm + Kirchhoff' },
      { id: 'topic-tu-truong',      type: 'Topic', label: 'Từ trường',           description: 'Đường sức từ + lực Lorentz' },
      { id: 'topic-cam-ung-dt',     type: 'Topic', label: 'Cảm ứng điện từ',     description: 'Định luật Faraday + Lenz' },
      { id: 'topic-nhiet-do',       type: 'Topic', label: 'Nhiệt độ',            description: 'Đại lượng đo độ nóng lạnh (Kelvin)' },
      // Formulas (~18)
      { id: 'form-p-mv',          type: 'Formula', label: 'p = m·v',                description: 'Động lượng = khối lượng × vận tốc', properties: { unit: 'kg·m/s' } },
      { id: 'form-f-ma',          type: 'Formula', label: 'F = m·a',                description: 'Định luật II Newton', properties: { unit: 'N' } },
      { id: 'form-a-fs',          type: 'Formula', label: 'A = F·s·cosα',           description: 'Công cơ học', properties: { unit: 'J' } },
      { id: 'form-p-at',          type: 'Formula', label: 'P = A/t',                description: 'Công suất', properties: { unit: 'W' } },
      { id: 'form-wd-mv2',        type: 'Formula', label: 'Wđ = ½·m·v²',            description: 'Động năng', properties: { unit: 'J' } },
      { id: 'form-wt-mgh',        type: 'Formula', label: 'Wt = m·g·h',             description: 'Thế năng trọng trường', properties: { unit: 'J' } },
      { id: 'form-x-acos',        type: 'Formula', label: 'x = A·cos(ωt+φ)',        description: 'Phương trình dao động điều hòa' },
      { id: 'form-t-2pi-lg',      type: 'Formula', label: 'T = 2π√(l/g)',           description: 'Chu kì con lắc đơn', properties: { unit: 's' } },
      { id: 'form-t-2pi-mk',      type: 'Formula', label: 'T = 2π√(m/k)',           description: 'Chu kì con lắc lò xo', properties: { unit: 's' } },
      { id: 'form-omega-2pi-t',   type: 'Formula', label: 'ω = 2π/T = 2πf',         description: 'Tần số góc' },
      { id: 'form-coulomb',       type: 'Formula', label: 'F = k·|q₁·q₂|/r²',       description: 'Định luật Coulomb', properties: { unit: 'N', k: '9e9' } },
      { id: 'form-e-fq',          type: 'Formula', label: 'E = F/q',                description: 'Cường độ điện trường', properties: { unit: 'V/m' } },
      { id: 'form-u-aq',          type: 'Formula', label: 'U = A/q',                description: 'Hiệu điện thế', properties: { unit: 'V' } },
      { id: 'form-ohm',           type: 'Formula', label: 'U = I·R',                description: 'Định luật Ohm', properties: { unit: 'V' } },
      { id: 'form-pkvt',          type: 'Formula', label: 'P = U·I',                description: 'Công suất tiêu thụ điện' },
      { id: 'form-faraday',       type: 'Formula', label: 'e = -dΦ/dt',             description: 'Suất điện động cảm ứng (Faraday)' },
      { id: 'form-lorentz',       type: 'Formula', label: 'F = q·v·B·sinθ',         description: 'Lực Lorentz' },
      { id: 'form-pv-nrt',        type: 'Formula', label: 'PV = nRT',               description: 'Phương trình khí lý tưởng' },
      // Concepts (~8)
      { id: 'concept-vector',     type: 'Concept', label: 'Đại lượng vector',  description: 'Có hướng + độ lớn (khác scalar)' },
      { id: 'concept-bao-toan',   type: 'Concept', label: 'Định luật bảo toàn', description: 'Đại lượng không đổi trong hệ kín' },
      { id: 'concept-he-kin',     type: 'Concept', label: 'Hệ kín',            description: 'Không trao đổi với bên ngoài' },
      { id: 'concept-quan-tinh',  type: 'Concept', label: 'Quán tính',         description: 'Xu hướng giữ trạng thái chuyển động' },
      { id: 'concept-luc',        type: 'Concept', label: 'Lực',               description: 'Đại lượng vector tác động' },
      { id: 'concept-truong',     type: 'Concept', label: 'Trường vật lý',     description: 'Vùng không gian có tác động vật lý' },
      { id: 'concept-dien-tu',    type: 'Concept', label: 'Điện từ trường',    description: 'Trường thống nhất điện + từ' },
      { id: 'concept-dao-dong',   type: 'Concept', label: 'Dao động',          description: 'Lặp lại quanh vị trí cân bằng' },
      // Careers (~7)
      { id: 'career-ky-su-co-khi',  type: 'Career', label: 'Kỹ sư cơ khí',          description: 'Thiết kế máy, cơ cấu, robot' },
      { id: 'career-ky-su-dien',    type: 'Career', label: 'Kỹ sư điện - điện tử',  description: 'Mạch, năng lượng, hệ thống' },
      { id: 'career-vat-ly-thien-van', type: 'Career', label: 'Nhà thiên văn học',  description: 'Nghiên cứu vũ trụ' },
      { id: 'career-ky-su-otc',     type: 'Career', label: 'Kỹ sư ô tô',            description: 'Động lực học, ma sát, va chạm' },
      { id: 'career-ky-su-nang-luong', type: 'Career', label: 'Kỹ sư năng lượng',   description: 'Năng lượng tái tạo, pin' },
      { id: 'career-bac-si-rad',    type: 'Career', label: 'Bác sĩ X-quang',        description: 'Ứng dụng điện từ y tế' },
      { id: 'career-game-dev',      type: 'Career', label: 'Lập trình viên game',   description: 'Vật lý game (collision, gravity)' },
    ];

    for (const n of nodes) {
      await pool.query(
        `INSERT INTO kg_nodes (id, type, label, description, properties)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description`,
        [n.id, n.type, n.label, n.description || null, JSON.stringify(n.properties || {})]
      );
    }

    // ── Edges ──
    const edges = [
      // Subject → Chapter
      ['subj-vatli', 'chap-co-hoc',     'HAS_CHAPTER'],
      ['subj-vatli', 'chap-nhiet-hoc',  'HAS_CHAPTER'],
      ['subj-vatli', 'chap-dien-hoc',   'HAS_CHAPTER'],
      ['subj-vatli', 'chap-tu-truong',  'HAS_CHAPTER'],
      ['subj-vatli', 'chap-dao-dong',   'HAS_CHAPTER'],
      // Chapter → Topic
      ['chap-co-hoc', 'topic-dong-luong',  'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-bao-toan-p',  'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-va-cham',     'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-cong',        'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-cong-suat',   'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-nang-luong',  'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-bao-toan-e',  'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-luc-newton',  'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-trong-luc',   'HAS_TOPIC'],
      ['chap-co-hoc', 'topic-luc-ma-sat',  'HAS_TOPIC'],
      ['chap-dao-dong', 'topic-dao-dong-dh',   'HAS_TOPIC'],
      ['chap-dao-dong', 'topic-con-lac-don',   'HAS_TOPIC'],
      ['chap-dao-dong', 'topic-con-lac-lo-xo', 'HAS_TOPIC'],
      ['chap-dao-dong', 'topic-song-co',       'HAS_TOPIC'],
      ['chap-dao-dong', 'topic-giao-thoa',     'HAS_TOPIC'],
      ['chap-dien-hoc', 'topic-dien-tich',  'HAS_TOPIC'],
      ['chap-dien-hoc', 'topic-dien-truong','HAS_TOPIC'],
      ['chap-dien-hoc', 'topic-dien-the',   'HAS_TOPIC'],
      ['chap-dien-hoc', 'topic-mach-dien',  'HAS_TOPIC'],
      ['chap-tu-truong', 'topic-tu-truong', 'HAS_TOPIC'],
      ['chap-tu-truong', 'topic-cam-ung-dt','HAS_TOPIC'],
      ['chap-nhiet-hoc', 'topic-nhiet-do',  'HAS_TOPIC'],
      // Topic → Formula
      ['topic-dong-luong',    'form-p-mv',        'USES_FORMULA'],
      ['topic-luc-newton',    'form-f-ma',        'USES_FORMULA'],
      ['topic-cong',          'form-a-fs',        'USES_FORMULA'],
      ['topic-cong-suat',     'form-p-at',        'USES_FORMULA'],
      ['topic-nang-luong',    'form-wd-mv2',      'USES_FORMULA'],
      ['topic-nang-luong',    'form-wt-mgh',      'USES_FORMULA'],
      ['topic-dao-dong-dh',   'form-x-acos',      'USES_FORMULA'],
      ['topic-dao-dong-dh',   'form-omega-2pi-t', 'USES_FORMULA'],
      ['topic-con-lac-don',   'form-t-2pi-lg',    'USES_FORMULA'],
      ['topic-con-lac-lo-xo', 'form-t-2pi-mk',    'USES_FORMULA'],
      ['topic-dien-tich',     'form-coulomb',     'USES_FORMULA'],
      ['topic-dien-truong',   'form-e-fq',        'USES_FORMULA'],
      ['topic-dien-the',      'form-u-aq',        'USES_FORMULA'],
      ['topic-mach-dien',     'form-ohm',         'USES_FORMULA'],
      ['topic-mach-dien',     'form-pkvt',        'USES_FORMULA'],
      ['topic-cam-ung-dt',    'form-faraday',     'USES_FORMULA'],
      ['topic-tu-truong',     'form-lorentz',     'USES_FORMULA'],
      ['topic-nhiet-do',      'form-pv-nrt',      'USES_FORMULA'],
      // Topic → Concept
      ['topic-dong-luong',    'concept-vector',     'USES_CONCEPT'],
      ['topic-dong-luong',    'concept-bao-toan',   'USES_CONCEPT'],
      ['topic-bao-toan-p',    'concept-bao-toan',   'USES_CONCEPT'],
      ['topic-bao-toan-p',    'concept-he-kin',     'USES_CONCEPT'],
      ['topic-bao-toan-e',    'concept-bao-toan',   'USES_CONCEPT'],
      ['topic-luc-newton',    'concept-quan-tinh',  'USES_CONCEPT'],
      ['topic-luc-newton',    'concept-luc',        'USES_CONCEPT'],
      ['topic-trong-luc',     'concept-luc',        'USES_CONCEPT'],
      ['topic-luc-ma-sat',    'concept-luc',        'USES_CONCEPT'],
      ['topic-dien-truong',   'concept-truong',     'USES_CONCEPT'],
      ['topic-tu-truong',     'concept-truong',     'USES_CONCEPT'],
      ['topic-cam-ung-dt',    'concept-dien-tu',    'USES_CONCEPT'],
      ['topic-dao-dong-dh',   'concept-dao-dong',   'USES_CONCEPT'],
      ['topic-con-lac-don',   'concept-dao-dong',   'USES_CONCEPT'],
      ['topic-con-lac-lo-xo', 'concept-dao-dong',   'USES_CONCEPT'],
      // Topic ↔ Topic (RELATES_TO — semantic)
      ['topic-dong-luong',    'topic-bao-toan-p',   'RELATES_TO'],
      ['topic-dong-luong',    'topic-va-cham',      'RELATES_TO'],
      ['topic-bao-toan-p',    'topic-va-cham',      'RELATES_TO'],
      ['topic-cong',          'topic-nang-luong',   'RELATES_TO'],
      ['topic-cong',          'topic-cong-suat',    'RELATES_TO'],
      ['topic-nang-luong',    'topic-bao-toan-e',   'RELATES_TO'],
      ['topic-luc-newton',    'topic-trong-luc',    'RELATES_TO'],
      ['topic-luc-newton',    'topic-luc-ma-sat',   'RELATES_TO'],
      ['topic-dao-dong-dh',   'topic-con-lac-don',  'RELATES_TO'],
      ['topic-dao-dong-dh',   'topic-con-lac-lo-xo','RELATES_TO'],
      ['topic-dao-dong-dh',   'topic-song-co',      'RELATES_TO'],
      ['topic-song-co',       'topic-giao-thoa',    'RELATES_TO'],
      ['topic-dien-tich',     'topic-dien-truong',  'RELATES_TO'],
      ['topic-dien-truong',   'topic-dien-the',     'RELATES_TO'],
      ['topic-dien-the',      'topic-mach-dien',    'RELATES_TO'],
      ['topic-tu-truong',     'topic-cam-ung-dt',   'RELATES_TO'],
      // Topic → Career
      ['topic-dong-luong',    'career-ky-su-otc',         'APPLIED_IN_CAREER'],
      ['topic-va-cham',       'career-ky-su-otc',         'APPLIED_IN_CAREER'],
      ['topic-va-cham',       'career-game-dev',          'APPLIED_IN_CAREER'],
      ['topic-luc-newton',    'career-ky-su-co-khi',      'APPLIED_IN_CAREER'],
      ['topic-luc-newton',    'career-game-dev',          'APPLIED_IN_CAREER'],
      ['topic-trong-luc',     'career-vat-ly-thien-van',  'APPLIED_IN_CAREER'],
      ['topic-mach-dien',     'career-ky-su-dien',        'APPLIED_IN_CAREER'],
      ['topic-dien-truong',   'career-ky-su-dien',        'APPLIED_IN_CAREER'],
      ['topic-cam-ung-dt',    'career-ky-su-dien',        'APPLIED_IN_CAREER'],
      ['topic-cam-ung-dt',    'career-ky-su-nang-luong',  'APPLIED_IN_CAREER'],
      ['topic-tu-truong',     'career-bac-si-rad',        'APPLIED_IN_CAREER'],
      ['topic-dao-dong-dh',   'career-ky-su-co-khi',      'APPLIED_IN_CAREER'],
      ['topic-song-co',       'career-bac-si-rad',        'APPLIED_IN_CAREER'],
      // Concept → Concept
      ['concept-bao-toan',    'concept-he-kin',           'REQUIRES'],
      ['concept-luc',         'concept-vector',           'IS_A'],
      ['concept-dien-tu',     'concept-truong',           'IS_A'],
    ];

    let inserted = 0;
    for (const [from, to, rel] of edges) {
      const id = `${from}__${rel}__${to}`;
      try {
        const r = await pool.query(
          `INSERT INTO kg_edges (id, from_id, to_id, rel_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (from_id, to_id, rel_type) DO NOTHING`,
          [id.slice(0, 200), from, to, rel]
        );
        if (r.rowCount) inserted++;
      } catch (e) { console.warn('[kg:seed:edge]', from, '→', to, e.message); }
    }
    return { nodeCount: nodes.length, edgeCount: edges.length, edgeInserted: inserted };
  }

  // ── Phase 5: Cross-Subject Seed (Toán 11 + Hóa 11 + cross-edges) ──
  async function seedKgMathChem11() {
    await ensureKgReady();
    const pool = getKcPool();

    const nodes = [
      // === TOÁN 11 (subject + chapters + topics + formulas) ===
      { id: 'subj-toan', type: 'Subject', label: 'Toán', description: 'Môn Toán THPT theo GDPT 2018', properties: { color: '#a78bfa' } },
      { id: 'chap-toan-luong-giac', type: 'Chapter', label: 'Lượng giác', description: 'Hàm sin/cos/tan, phương trình lượng giác' },
      { id: 'chap-toan-dao-ham',    type: 'Chapter', label: 'Đạo hàm',    description: 'Đạo hàm, ứng dụng đạo hàm' },
      { id: 'chap-toan-day-so',     type: 'Chapter', label: 'Dãy số & Cấp số', description: 'Dãy số, cấp số cộng/nhân' },
      { id: 'chap-toan-to-hop',     type: 'Chapter', label: 'Tổ hợp - Xác suất', description: 'Hoán vị, chỉnh hợp, xác suất' },
      // Topics Toán
      { id: 'topic-ham-sin',      type: 'Topic', label: 'Hàm số sin/cos', description: 'Hàm số y = sin(x), y = cos(x) — chu kì 2π' },
      { id: 'topic-pt-luong-giac',type: 'Topic', label: 'Phương trình lượng giác', description: 'sin(x) = a, cos(x) = b, tan(x) = c' },
      { id: 'topic-dao-ham-cb',   type: 'Topic', label: 'Đạo hàm cơ bản', description: 'f\'(x) = lim (f(x+h)-f(x))/h' },
      { id: 'topic-dao-ham-ham-so', type: 'Topic', label: 'Đạo hàm hàm số', description: '(x^n)\' = nx^(n-1), (sin x)\' = cos x' },
      { id: 'topic-cap-so-cong',  type: 'Topic', label: 'Cấp số cộng',     description: 'a_n = a_1 + (n-1)d' },
      { id: 'topic-cap-so-nhan',  type: 'Topic', label: 'Cấp số nhân',     description: 'a_n = a_1 · q^(n-1)' },
      { id: 'topic-xac-suat',     type: 'Topic', label: 'Xác suất',        description: 'P(A) = số kết quả thuận lợi / tổng số kết quả' },
      { id: 'topic-hoan-vi',      type: 'Topic', label: 'Hoán vị · Chỉnh hợp · Tổ hợp', description: 'P_n, A^k_n, C^k_n' },
      // Formulas Toán
      { id: 'form-sin-cos',       type: 'Formula', label: 'sin²x + cos²x = 1', description: 'Hệ thức cơ bản lượng giác' },
      { id: 'form-derivative-sin',type: 'Formula', label: "(sin x)' = cos x",   description: 'Đạo hàm hàm sin' },
      { id: 'form-cong-thuc-newton', type: 'Formula', label: '(a+b)^n = Σ C^k_n a^(n-k) b^k', description: 'Nhị thức Newton' },
      // Careers liên ngành
      { id: 'career-kts',         type: 'Career', label: 'Kiến trúc sư',     description: 'Dùng hình học, đạo hàm, lượng giác' },
      { id: 'career-actuary',     type: 'Career', label: 'Chuyên viên thống kê (Actuary)', description: 'Xác suất, mô hình tài chính' },

      // === HÓA 11 ===
      { id: 'subj-hoa',           type: 'Subject', label: 'Hóa học', description: 'Môn Hóa THPT theo GDPT 2018', properties: { color: '#34d399' } },
      { id: 'chap-hoa-can-bang',  type: 'Chapter', label: 'Cân bằng hóa học', description: 'Phản ứng thuận nghịch, hằng số cân bằng' },
      { id: 'chap-hoa-nitrogen',  type: 'Chapter', label: 'Nitrogen - Sulfur', description: 'N₂, NH₃, HNO₃, S, SO₂, H₂SO₄' },
      { id: 'chap-hoa-huu-co',    type: 'Chapter', label: 'Đại cương Hóa hữu cơ', description: 'Đồng phân, danh pháp, phản ứng cơ bản' },
      { id: 'chap-hoa-hidrocarbon', type: 'Chapter', label: 'Hidrocarbon',   description: 'Ankan, anken, ankin, aren' },
      // Topics Hóa
      { id: 'topic-hang-so-kc',   type: 'Topic', label: 'Hằng số cân bằng Kc', description: 'Kc = [C]^c[D]^d / [A]^a[B]^b' },
      { id: 'topic-axit-bazo',    type: 'Topic', label: 'Axit - Bazơ',     description: 'pH, pOH, Bronsted, Lewis' },
      { id: 'topic-ankan',        type: 'Topic', label: 'Ankan',           description: 'CnH(2n+2), phản ứng thế halogen' },
      { id: 'topic-anken',        type: 'Topic', label: 'Anken',           description: 'CnH(2n), phản ứng cộng, trùng hợp' },
      { id: 'topic-ankin',        type: 'Topic', label: 'Ankin',           description: 'CnH(2n-2), liên kết 3' },
      { id: 'topic-aren',         type: 'Topic', label: 'Aren (benzene)',  description: 'Vòng thơm, phản ứng thế electrophilic' },
      { id: 'topic-amoniac',      type: 'Topic', label: 'Amoniac NH₃',     description: 'Tính bazơ yếu, sản xuất công nghiệp' },
      { id: 'topic-axit-nitric',  type: 'Topic', label: 'Axit nitric HNO₃', description: 'Tính oxi hóa mạnh' },
      // Formulas Hóa
      { id: 'form-ph-log',        type: 'Formula', label: 'pH = -log[H⁺]', description: 'Định nghĩa pH' },
      { id: 'form-kc-formula',    type: 'Formula', label: 'Kc = [C]^c[D]^d / [A]^a[B]^b', description: 'Hằng số cân bằng' },
      { id: 'form-ankan-general', type: 'Formula', label: 'CnH(2n+2)',     description: 'Công thức chung ankan' },
      // Careers
      { id: 'career-duoc-si',     type: 'Career', label: 'Dược sĩ',         description: 'Hóa hữu cơ + sinh học' },
      { id: 'career-ks-mt',       type: 'Career', label: 'Kỹ sư môi trường', description: 'Hóa phân tích, xử lý nước' },
    ];

    let insertedNodes = 0;
    for (const n of nodes) {
      try {
        const r = await pool.query(
          `INSERT INTO kg_nodes (id, type, label, description, properties)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [n.id, n.type, n.label, n.description, JSON.stringify(n.properties || {})]
        );
        if (r.rowCount) insertedNodes++;
      } catch (e) { console.warn('[kg:seed-mc:node]', n.id, e.message); }
    }

    // ── Edges trong môn + cross-subject ──
    const edges = [
      // Toán hierarchical
      ['subj-toan',          'chap-toan-luong-giac', 'HAS_CHAPTER'],
      ['subj-toan',          'chap-toan-dao-ham',    'HAS_CHAPTER'],
      ['subj-toan',          'chap-toan-day-so',     'HAS_CHAPTER'],
      ['subj-toan',          'chap-toan-to-hop',     'HAS_CHAPTER'],
      ['chap-toan-luong-giac','topic-ham-sin',       'HAS_TOPIC'],
      ['chap-toan-luong-giac','topic-pt-luong-giac', 'HAS_TOPIC'],
      ['chap-toan-dao-ham',  'topic-dao-ham-cb',     'HAS_TOPIC'],
      ['chap-toan-dao-ham',  'topic-dao-ham-ham-so', 'HAS_TOPIC'],
      ['chap-toan-day-so',   'topic-cap-so-cong',    'HAS_TOPIC'],
      ['chap-toan-day-so',   'topic-cap-so-nhan',    'HAS_TOPIC'],
      ['chap-toan-to-hop',   'topic-hoan-vi',        'HAS_TOPIC'],
      ['chap-toan-to-hop',   'topic-xac-suat',       'HAS_TOPIC'],
      ['topic-ham-sin',      'form-sin-cos',         'USES_FORMULA'],
      ['topic-dao-ham-ham-so','form-derivative-sin', 'USES_FORMULA'],
      ['topic-hoan-vi',      'form-cong-thuc-newton','USES_FORMULA'],
      ['topic-dao-ham-ham-so','topic-dao-ham-cb',    'REQUIRES'],
      ['topic-pt-luong-giac','topic-ham-sin',        'REQUIRES'],
      ['topic-dao-ham-cb',   'career-kts',           'APPLIED_IN_CAREER'],
      ['topic-xac-suat',     'career-actuary',       'APPLIED_IN_CAREER'],

      // Hóa hierarchical
      ['subj-hoa',           'chap-hoa-can-bang',    'HAS_CHAPTER'],
      ['subj-hoa',           'chap-hoa-nitrogen',    'HAS_CHAPTER'],
      ['subj-hoa',           'chap-hoa-huu-co',      'HAS_CHAPTER'],
      ['subj-hoa',           'chap-hoa-hidrocarbon', 'HAS_CHAPTER'],
      ['chap-hoa-can-bang',  'topic-hang-so-kc',     'HAS_TOPIC'],
      ['chap-hoa-can-bang',  'topic-axit-bazo',      'HAS_TOPIC'],
      ['chap-hoa-nitrogen',  'topic-amoniac',        'HAS_TOPIC'],
      ['chap-hoa-nitrogen',  'topic-axit-nitric',    'HAS_TOPIC'],
      ['chap-hoa-hidrocarbon','topic-ankan',         'HAS_TOPIC'],
      ['chap-hoa-hidrocarbon','topic-anken',         'HAS_TOPIC'],
      ['chap-hoa-hidrocarbon','topic-ankin',         'HAS_TOPIC'],
      ['chap-hoa-hidrocarbon','topic-aren',          'HAS_TOPIC'],
      ['topic-axit-bazo',    'form-ph-log',          'USES_FORMULA'],
      ['topic-hang-so-kc',   'form-kc-formula',      'USES_FORMULA'],
      ['topic-ankan',        'form-ankan-general',   'USES_FORMULA'],
      ['topic-anken',        'topic-ankan',          'REQUIRES'],
      ['topic-aren',         'topic-anken',          'REQUIRES'],
      ['topic-axit-nitric',  'topic-amoniac',        'RELATES_TO'],
      ['topic-axit-bazo',    'career-duoc-si',       'APPLIED_IN_CAREER'],
      ['topic-aren',         'career-ks-mt',         'APPLIED_IN_CAREER'],

      // ─── CROSS-SUBJECT EDGES (highlight liên môn) ───
      // Vật lí ↔ Toán
      ['topic-dao-dong-dh',  'topic-ham-sin',        'USES_CONCEPT'],   // dao động dùng sin/cos
      ['topic-dao-dong-dh',  'form-sin-cos',         'USES_FORMULA'],
      ['topic-song-co',      'topic-ham-sin',        'USES_CONCEPT'],
      ['topic-cam-ung-dt',   'topic-dao-ham-cb',     'REQUIRES'],       // Faraday cần đạo hàm
      ['topic-mach-dien',    'topic-cap-so-cong',    'RELATES_TO'],     // mạch nối tiếp = tổng
      ['topic-va-cham',      'topic-xac-suat',       'RELATES_TO'],     // va chạm thống kê

      // Vật lí ↔ Hóa
      ['topic-nhiet-do',     'topic-hang-so-kc',     'RELATES_TO'],     // Kc phụ thuộc T
      ['topic-dien-tich',    'topic-axit-bazo',      'RELATES_TO'],     // ion H+/OH-
      ['topic-mach-dien',    'topic-axit-bazo',      'RELATES_TO'],     // dung dịch điện ly

      // Toán ↔ Hóa
      ['topic-xac-suat',     'topic-hang-so-kc',     'RELATES_TO'],     // xác suất hạt va chạm
      ['topic-cap-so-nhan',  'form-ph-log',          'RELATES_TO'],     // log = nghịch đảo nhân
    ];

    let insertedEdges = 0;
    for (const [from, to, rel] of edges) {
      const id = `${from}__${rel}__${to}`;
      try {
        const r = await pool.query(
          `INSERT INTO kg_edges (id, from_id, to_id, rel_type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (from_id, to_id, rel_type) DO NOTHING`,
          [id.slice(0, 200), from, to, rel]
        );
        if (r.rowCount) insertedEdges++;
      } catch (e) { console.warn('[kg:seed-mc:edge]', from, '→', to, e.message); }
    }

    return { nodeCount: nodes.length, edgeCount: edges.length, nodeInserted: insertedNodes, edgeInserted: insertedEdges };
  }

  // GET /api/kg/seed — admin-only, idempotent
  // Query: ?subjects=all → Lý + Toán + Hóa (default chỉ Lý cho backward-compat)
  app.get('/api/kg/seed', async (req, res) => {
    try {
      const all = req.query.subjects === 'all' || req.query.all === '1';
      const r1 = await seedKgPhysics11();
      let r2 = null;
      if (all) r2 = await seedKgMathChem11();
      return res.json({
        success: true,
        nodeCount: r1.nodeCount + (r2?.nodeCount || 0),
        edgeCount: r1.edgeCount + (r2?.edgeCount || 0),
        edgeInserted: r1.edgeInserted + (r2?.edgeInserted || 0),
        physics: r1,
        mathChem: r2,
        message: all
          ? 'Đã seed Vật lí 11 + Toán 11 + Hóa 11 (3 subjects, cross-edges)'
          : 'Đã seed Vật lí 11 (thêm ?subjects=all để seed cả Toán + Hóa)',
      });
    } catch (err) {
      console.error('[kg:seed] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/kg/search?q=động+lượng&limit=20 — fuzzy search nodes
  app.get('/api/kg/search', async (req, res) => {
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const q = String(req.query.q || '').trim().slice(0, 120);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
      const type = req.query.type ? String(req.query.type).slice(0, 30) : null;
      if (!q) {
        // Empty query → return top nodes by type (preview)
        const r = await pool.query(
          `SELECT id, type, label, description FROM kg_nodes
           ${type ? 'WHERE type = $2' : ''}
           ORDER BY type, label LIMIT $1`,
          type ? [limit, type] : [limit]
        );
        return res.json({ success: true, items: r.rows });
      }
      // Trigram + ILIKE fallback
      let r;
      try {
        r = await pool.query(
          `SELECT id, type, label, description,
                  similarity(label, $1) AS sim
           FROM kg_nodes
           WHERE label ILIKE $2 ${type ? 'AND type = $4' : ''}
              OR similarity(label, $1) > 0.2
           ORDER BY sim DESC NULLS LAST, label
           LIMIT $3`,
          type ? [q, `%${q}%`, limit, type] : [q, `%${q}%`, limit]
        );
      } catch (e) {
        // Fallback nếu pg_trgm chưa enable
        r = await pool.query(
          `SELECT id, type, label, description FROM kg_nodes
           WHERE label ILIKE $1 ${type ? 'AND type = $3' : ''}
           ORDER BY label LIMIT $2`,
          type ? [`%${q}%`, limit, type] : [`%${q}%`, limit]
        );
      }
      return res.json({ success: true, items: r.rows });
    } catch (err) {
      console.error('[kg:search] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/kg/node/:id — chi tiết + 1-hop neighbors
  app.get('/api/kg/node/:id', async (req, res) => {
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const nq = await pool.query(`SELECT * FROM kg_nodes WHERE id = $1`, [req.params.id]);
      if (nq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const node = nq.rows[0];
      const eq = await pool.query(
        `SELECT e.*, n.label AS to_label, n.type AS to_type
         FROM kg_edges e JOIN kg_nodes n ON n.id = e.to_id
         WHERE e.from_id = $1
         UNION ALL
         SELECT e.*, n.label AS to_label, n.type AS to_type
         FROM kg_edges e JOIN kg_nodes n ON n.id = e.from_id
         WHERE e.to_id = $1`,
        [req.params.id]
      );
      return res.json({
        success: true,
        node,
        neighbors: eq.rows.map(r => ({
          id: r.from_id === req.params.id ? r.to_id : r.from_id,
          label: r.to_label,
          type: r.to_type,
          relType: r.rel_type,
          direction: r.from_id === req.params.id ? 'out' : 'in',
          weight: r.weight,
        })),
      });
    } catch (err) {
      console.error('[kg:node] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/kg/expand/:id?depth=2 — BFS traversal n-hop
  // Dùng JS BFS (đơn giản, ổn định) thay vì recursive CTE phức tạp.
  // Với graph ≤500 nodes / ≤2000 edges (typical scale của KG giáo dục),
  // load toàn bộ edges 1 lần rồi BFS trong memory nhanh hơn + tránh
  // edge case của recursive CTE (cycle, UNION dedup, path overflow).
  app.get('/api/kg/expand/:id', async (req, res) => {
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const depth = Math.min(3, Math.max(1, parseInt(String(req.query.depth || '2'), 10)));
      const startId = req.params.id;
      if (!startId) {
        return res.status(400).json({ success: false, error: 'Missing node id' });
      }

      // 1) Verify startId exists. Nếu không → trả empty (200, không 500)
      //    để FE handle gracefully.
      const startCheck = await pool.query(
        `SELECT id FROM kg_nodes WHERE id = $1 LIMIT 1`,
        [startId]
      );
      if (startCheck.rowCount === 0) {
        console.warn(`[kg:expand] node not found: ${startId}`);
        return res.json({ success: true, nodes: [], edges: [], startId, depth, error: 'node_not_found' });
      }

      // 2) Load tất cả edges 1 lần (graph thường ≤2000 edges)
      const edgeRows = await pool.query(
        `SELECT id, from_id, to_id, rel_type, weight FROM kg_edges LIMIT 5000`
      );
      const allEdges = edgeRows.rows;

      // 3) Build adjacency (undirected)
      const adj = new Map(); // id → Set<neighbor_id>
      for (const e of allEdges) {
        if (!adj.has(e.from_id)) adj.set(e.from_id, new Set());
        if (!adj.has(e.to_id))   adj.set(e.to_id, new Set());
        adj.get(e.from_id).add(e.to_id);
        adj.get(e.to_id).add(e.from_id);
      }

      // 4) BFS từ startId tới depth max
      const visited = new Map(); // id → depth
      visited.set(startId, 0);
      let frontier = [startId];
      for (let d = 0; d < depth; d++) {
        const next = [];
        for (const nodeId of frontier) {
          const neighbors = adj.get(nodeId) || new Set();
          for (const nb of neighbors) {
            if (!visited.has(nb)) {
              visited.set(nb, d + 1);
              next.push(nb);
            }
          }
        }
        if (next.length === 0) break;
        frontier = next;
      }

      const ids = Array.from(visited.keys());
      if (ids.length === 0) {
        return res.json({ success: true, nodes: [], edges: [], startId, depth });
      }

      // 5) Load node details + filter edges within subgraph
      const nq = await pool.query(
        `SELECT id, type, label, description, properties FROM kg_nodes WHERE id = ANY($1)`,
        [ids]
      );
      const idSet = new Set(ids);
      const subgraphEdges = allEdges.filter(e => idSet.has(e.from_id) && idSet.has(e.to_id));

      return res.json({
        success: true,
        nodes: nq.rows.map(n => ({ ...n, depth: visited.get(n.id) || 0 })),
        edges: subgraphEdges,
        startId,
        depth,
      });
    } catch (err) {
      console.error('[kg:expand] ❌', err?.message || err, err?.stack?.split('\n')[1]);
      // Trả 200 với empty + error message để FE không crash
      return res.json({
        success: false,
        nodes: [], edges: [],
        startId: req.params.id,
        depth: parseInt(String(req.query.depth || '2'), 10),
        error: err?.message || 'expand_failed',
      });
    }
  });

  // ────────────────────────────────────────────────
  // KG Phase 2 — AI auto-extract entities + similarity linking
  // ────────────────────────────────────────────────

  // Slugify Vietnamese label → ASCII id (idempotent)
  function kgSlugify(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/gi, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'node-' + Math.random().toString(36).slice(2, 7);
  }

  // Levenshtein-style normalized similarity 0..1 (đơn giản, không cần lib)
  function kgSimilarity(a, b) {
    const A = String(a || '').toLowerCase().trim();
    const B = String(b || '').toLowerCase().trim();
    if (!A || !B) return 0;
    if (A === B) return 1;
    // Word overlap ratio (fast, đủ tốt cho label ngắn)
    const wa = new Set(A.split(/\s+/).filter(w => w.length > 1));
    const wb = new Set(B.split(/\s+/).filter(w => w.length > 1));
    if (wa.size === 0 || wb.size === 0) return 0;
    let common = 0;
    for (const w of wa) if (wb.has(w)) common++;
    return common / Math.max(wa.size, wb.size);
  }

  /**
   * Strip HTML tags, decode entities, collapse whitespace.
   * Để feed vào AI prompt mà không bị token bloat.
   */
  function kgStripHtml(html) {
    return String(html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // POST /api/kg/extract — AI extract entities từ text hoặc lesson_plan/transcript
  // Body: { text?: string, source?: { type: 'lesson_plan'|'transcript'|'exam', id: string },
  //         autoLink?: boolean (default true) }
  app.post('/api/kg/extract', express.json({ limit: '512kb' }), async (req, res) => {
    const t0 = Date.now();
    try {
      await ensureKgReady();
      const pool = getKcPool();
      let { text, source, autoLink } = req.body || {};
      if (autoLink === undefined) autoLink = true;

      // Resolve text từ source nếu chưa có
      let sourceLabel = null;
      let sourceNodeType = null;
      if (!text && source?.type && source?.id) {
        if (source.type === 'lesson_plan') {
          const r = await pool.query(`SELECT id, title, content, subject FROM "LessonPlan" WHERE id=$1`, [source.id]);
          if (r.rowCount === 0) return res.status(404).json({ success: false, error: 'Lesson plan not found' });
          text = kgStripHtml(r.rows[0].content || '');
          sourceLabel = r.rows[0].title;
          sourceNodeType = 'Lesson';
        } else if (source.type === 'transcript') {
          const r = await pool.query(`SELECT id, title, transcript FROM "Transcript" WHERE id=$1`, [source.id]);
          if (r.rowCount === 0) return res.status(404).json({ success: false, error: 'Transcript not found' });
          text = String(r.rows[0].transcript || '').slice(0, 30000);
          sourceLabel = r.rows[0].title;
          sourceNodeType = 'Lesson'; // transcript treat như Lesson
        }
      }
      if (!text || text.length < 30) {
        return res.status(400).json({ success: false, error: 'Cần text ≥30 ký tự (hoặc source với content hợp lệ)' });
      }
      if (text.length > 30000) text = text.slice(0, 30000);

      // Gọi AI extract
      const fal = require('./lib/fal-client.cjs');
      const sysPrompt = [
        'Bạn là chuyên gia phân tích nội dung giáo dục Việt Nam. Trích xuất các thực thể tri thức từ văn bản người dùng cung cấp.',
        '',
        'TRẢ VỀ duy nhất 1 JSON object (không markdown fence) theo schema:',
        '{',
        '  "topics":   [{ "label": "Chủ đề ngắn gọn", "description": "1 câu mô tả" }],',
        '  "concepts": [{ "label": "Khái niệm khoa học", "description": "1 câu" }],',
        '  "formulas": [{ "label": "Công thức (VD: F=ma)", "description": "Ý nghĩa", "unit": "đơn vị nếu có" }],',
        '  "edges":    [{ "from": "label A", "to": "label B", "rel": "RELATES_TO|USES_FORMULA|USES_CONCEPT|REQUIRES" }]',
        '}',
        '',
        'QUY TẮC:',
        '1. Topics: chủ đề chính (max 8). VD: "Động lượng", "Va chạm đàn hồi"',
        '2. Concepts: khái niệm/định luật trừu tượng (max 6). VD: "Bảo toàn năng lượng", "Quán tính"',
        '3. Formulas: công thức toán/lý/hoá xuất hiện trong văn bản (max 8). Label đúng format: "F = m·a", "p = m·v"',
        '4. Edges: liên kết giữa các entity vừa trích (max 12). dùng đúng label đã trích ở trên.',
        '5. Tất cả label tiếng Việt (trừ ký hiệu công thức). KHÔNG markdown fence. CHỈ JSON thuần.',
      ].join('\n');

      const userPrompt = `VĂN BẢN:\n\n${text}\n\nHãy trích xuất theo schema.`;
      const aiResult = await fal.complete({
        messages: [{ role: 'user', content: userPrompt }],
        system: sysPrompt,
      });

      let raw = (aiResult?.content || '').trim();
      const fenceMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (fenceMatch) raw = fenceMatch[1].trim();

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn('[kg:extract] AI returned non-JSON, raw preview:', raw.slice(0, 200));
        return res.status(502).json({
          success: false, error: 'AI trả về không phải JSON', rawPreview: raw.slice(0, 500),
        });
      }

      const topics   = Array.isArray(parsed.topics)   ? parsed.topics   : [];
      const concepts = Array.isArray(parsed.concepts) ? parsed.concepts : [];
      const formulas = Array.isArray(parsed.formulas) ? parsed.formulas : [];
      const aiEdges  = Array.isArray(parsed.edges)    ? parsed.edges    : [];

      // ── Persist ──
      const persisted = { newNodes: [], reusedNodes: [], newEdges: [], skippedEdges: 0 };

      // Build labelMap: label → existing node id (cho dedup)
      const allLabels = [
        ...topics.map(t => t.label),
        ...concepts.map(c => c.label),
        ...formulas.map(f => f.label),
      ].filter(Boolean);

      const existingByLabel = new Map();
      if (allLabels.length > 0) {
        const er = await pool.query(
          `SELECT id, label FROM kg_nodes WHERE LOWER(label) = ANY($1)`,
          [allLabels.map(l => String(l).toLowerCase())]
        );
        for (const row of er.rows) existingByLabel.set(String(row.label).toLowerCase(), row.id);
      }

      const labelToId = new Map();   // label (lowercase) → id (sau khi insert/reuse)

      const upsertNode = async (type, label, description, extraProps) => {
        if (!label) return null;
        const lower = String(label).toLowerCase().trim();
        if (labelToId.has(lower)) return labelToId.get(lower);
        const existing = existingByLabel.get(lower);
        if (existing) {
          labelToId.set(lower, existing);
          persisted.reusedNodes.push({ id: existing, label, type });
          return existing;
        }
        // Insert new
        const id = `${type.toLowerCase().slice(0,4)}-${kgSlugify(label)}-${Math.random().toString(36).slice(2,5)}`;
        await pool.query(
          `INSERT INTO kg_nodes (id, type, label, description, properties, source_type, source_id)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [id, type, label, description || null, JSON.stringify(extraProps || {}),
           source?.type || 'ai_extract', source?.id || null]
        );
        labelToId.set(lower, id);
        persisted.newNodes.push({ id, label, type });
        return id;
      };

      for (const t of topics)   await upsertNode('Topic',   t.label, t.description);
      for (const c of concepts) await upsertNode('Concept', c.label, c.description);
      for (const f of formulas) await upsertNode('Formula', f.label, f.description, f.unit ? { unit: f.unit } : {});

      // Source node + edges nếu có source
      let sourceNodeId = null;
      if (source?.id && sourceNodeType && sourceLabel) {
        sourceNodeId = `lesson-${source.id}`;
        await pool.query(
          `INSERT INTO kg_nodes (id, type, label, description, source_type, source_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label`,
          [sourceNodeId, sourceNodeType, sourceLabel, null, source.type, source.id]
        );
        // Tạo edges từ source → tất cả nodes mới/reused
        for (const id of labelToId.values()) {
          const edgeId = `${sourceNodeId}__MENTIONS__${id}`.slice(0, 200);
          try {
            const r = await pool.query(
              `INSERT INTO kg_edges (id, from_id, to_id, rel_type)
               VALUES ($1, $2, $3, 'MENTIONS_TOPIC')
               ON CONFLICT (from_id, to_id, rel_type) DO NOTHING`,
              [edgeId, sourceNodeId, id]
            );
            if (r.rowCount) persisted.newEdges.push({ from: sourceNodeId, to: id, rel: 'MENTIONS_TOPIC' });
          } catch (e) { persisted.skippedEdges++; }
        }
      }

      // Insert AI-suggested edges (resolve labels → ids)
      const validRels = new Set(['RELATES_TO','USES_FORMULA','USES_CONCEPT','REQUIRES','HAS_TOPIC','APPLIED_IN_CAREER']);
      for (const e of aiEdges) {
        const fromId = labelToId.get(String(e.from || '').toLowerCase());
        const toId   = labelToId.get(String(e.to   || '').toLowerCase());
        const rel    = validRels.has(String(e.rel || '').toUpperCase()) ? e.rel.toUpperCase() : 'RELATES_TO';
        if (!fromId || !toId || fromId === toId) { persisted.skippedEdges++; continue; }
        const edgeId = `${fromId}__${rel}__${toId}`.slice(0, 200);
        try {
          const r = await pool.query(
            `INSERT INTO kg_edges (id, from_id, to_id, rel_type)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (from_id, to_id, rel_type) DO NOTHING`,
            [edgeId, fromId, toId, rel]
          );
          if (r.rowCount) persisted.newEdges.push({ from: fromId, to: toId, rel });
          else persisted.skippedEdges++;
        } catch (e2) { persisted.skippedEdges++; }
      }

      // Optional auto-link: chạy similarity linking cho nodes mới
      let autoLinkResult = null;
      if (autoLink && persisted.newNodes.length > 0) {
        autoLinkResult = await kgAutoLinkNodes(pool, persisted.newNodes.map(n => n.id), 0.6);
      }

      console.log(`[kg:extract] ✅ extracted ${topics.length}T+${concepts.length}C+${formulas.length}F → newNodes=${persisted.newNodes.length} reused=${persisted.reusedNodes.length} newEdges=${persisted.newEdges.length} took=${Date.now() - t0}ms`);

      return res.json({
        success: true,
        extracted: { topics, concepts, formulas, edges: aiEdges },
        persisted,
        autoLink: autoLinkResult,
        sourceNodeId,
        tookMs: Date.now() - t0,
      });
    } catch (err) {
      console.error('[kg:extract] ❌', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Lỗi extract' });
    }
  });

  // Helper: auto-link 1 set of node ids với existing nodes cùng type theo similarity ≥ threshold
  async function kgAutoLinkNodes(pool, newNodeIds, threshold = 0.6) {
    if (!newNodeIds || newNodeIds.length === 0) return { linked: 0 };
    const newNodesQ = await pool.query(
      `SELECT id, type, label FROM kg_nodes WHERE id = ANY($1)`, [newNodeIds]
    );
    const newNodes = newNodesQ.rows;
    let linked = 0;
    for (const nn of newNodes) {
      const candidates = await pool.query(
        `SELECT id, label FROM kg_nodes WHERE type = $1 AND id <> $2 LIMIT 200`,
        [nn.type, nn.id]
      );
      for (const cand of candidates.rows) {
        const sim = kgSimilarity(nn.label, cand.label);
        if (sim < threshold) continue;
        const edgeId = `${nn.id}__SIMILAR_TO__${cand.id}`.slice(0, 200);
        try {
          const r = await pool.query(
            `INSERT INTO kg_edges (id, from_id, to_id, rel_type, weight)
             VALUES ($1, $2, $3, 'RELATES_TO', $4)
             ON CONFLICT (from_id, to_id, rel_type) DO NOTHING`,
            [edgeId, nn.id, cand.id, sim]
          );
          if (r.rowCount) linked++;
        } catch (_) { /* ignore */ }
      }
    }
    return { linked };
  }

  // POST /api/kg/link-similar — quét toàn bộ nodes, tạo edges RELATES_TO cho các cặp có similarity ≥ threshold
  // Body: { type?: string, threshold?: number (default 0.7) }
  app.post('/api/kg/link-similar', express.json({ limit: '8kb' }), async (req, res) => {
    const t0 = Date.now();
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const threshold = Math.max(0.5, Math.min(1.0, Number(req.body?.threshold) || 0.7));
      const filterType = req.body?.type ? String(req.body.type) : null;
      const q = filterType
        ? await pool.query(`SELECT id, type, label FROM kg_nodes WHERE type=$1 LIMIT 500`, [filterType])
        : await pool.query(`SELECT id, type, label FROM kg_nodes LIMIT 500`);
      const nodes = q.rows;
      let linked = 0; let scanned = 0;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].type !== nodes[j].type) continue;  // same-type only
          scanned++;
          const sim = kgSimilarity(nodes[i].label, nodes[j].label);
          if (sim < threshold) continue;
          const edgeId = `${nodes[i].id}__SIMILAR_TO__${nodes[j].id}`.slice(0, 200);
          try {
            const r = await pool.query(
              `INSERT INTO kg_edges (id, from_id, to_id, rel_type, weight)
               VALUES ($1, $2, $3, 'RELATES_TO', $4)
               ON CONFLICT (from_id, to_id, rel_type) DO NOTHING`,
              [edgeId, nodes[i].id, nodes[j].id, sim]
            );
            if (r.rowCount) linked++;
          } catch (_) { /* ignore */ }
        }
      }
      console.log(`[kg:link-similar] ✅ scanned=${scanned} linked=${linked} threshold=${threshold} took=${Date.now() - t0}ms`);
      return res.json({ success: true, linked, scanned, threshold, tookMs: Date.now() - t0 });
    } catch (err) {
      console.error('[kg:link-similar] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // KG — PHASE 4: Auto Learning Path from Graph
  // BFS shortest path từ 1 node (hoặc tự pick từ weak mastery) → target,
  // dùng để tạo lộ trình học có thứ tự prerequisite.
  // ════════════════════════════════════════════════

  // POST /api/kg/path/find
  // Body: { fromId?: string,
  //         toId: string,
  //         maxLen?: number (default 8, max 15),
  //         autoFromWeak?: boolean (nếu fromId không có → pick từ weak mastery) }
  app.post('/api/kg/path/find', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const body = req.body || {};
      const toId = String(body.toId || '').trim();
      if (!toId) return res.status(400).json({ success: false, error: 'toId required' });
      const maxLen = Math.min(15, Math.max(2, parseInt(String(body.maxLen || 8), 10)));

      // Auto-pick fromId từ weak mastery nếu không cung cấp + có user
      let fromId = String(body.fromId || '').trim();
      if (!fromId && body.autoFromWeak) {
        const user = getKgUser(req);
        if (user) {
          const wr = await pool.query(
            `SELECT m.node_id FROM kg_mastery m
             WHERE m.user_id = $1 AND m.score < 50
             ORDER BY m.score ASC LIMIT 1`,
            [user.id]
          );
          if (wr.rows.length > 0) fromId = wr.rows[0].node_id;
        }
      }
      // Fallback: subj-vatli (top-level subject)
      if (!fromId) fromId = 'subj-vatli';

      if (fromId === toId) {
        return res.status(400).json({
          success: false, error: 'from = to (đã đến đích)',
        });
      }

      // Load tất cả edges trong subgraph có chứa fromId hoặc toId
      // Bidirectional BFS với edges undirected để tìm path ngắn nhất.
      const allEdges = await pool.query(
        `SELECT from_id, to_id, rel_type, weight FROM kg_edges`
      );
      // Build adjacency (undirected)
      const adj = new Map(); // nodeId → [{to, rel, weight}]
      const addAdjEdge = (a, b, rel, weight) => {
        if (!adj.has(a)) adj.set(a, []);
        adj.get(a).push({ to: b, rel, weight: weight ?? 1 });
      };
      for (const e of allEdges.rows) {
        addAdjEdge(e.from_id, e.to_id, e.rel_type, e.weight);
        addAdjEdge(e.to_id, e.from_id, e.rel_type, e.weight);
      }

      // BFS với visited tracking
      const parent = new Map();
      const visited = new Set([fromId]);
      const queue = [fromId];
      let found = false;
      let hops = 0;
      while (queue.length > 0 && hops < maxLen) {
        const sz = queue.length;
        for (let i = 0; i < sz; i++) {
          const cur = queue.shift();
          if (cur === toId) { found = true; break; }
          const neighbors = adj.get(cur) || [];
          for (const n of neighbors) {
            if (visited.has(n.to)) continue;
            visited.add(n.to);
            parent.set(n.to, { from: cur, rel: n.rel });
            queue.push(n.to);
            if (n.to === toId) { found = true; break; }
          }
          if (found) break;
        }
        if (found) break;
        hops++;
      }

      if (!found) {
        return res.json({
          success: true, found: false, fromId, toId,
          hops: hops, message: `Không tìm thấy path ≤${maxLen} hops từ ${fromId} → ${toId}`,
        });
      }

      // Trace back path từ toId → fromId
      const pathIds = [toId];
      const pathRels = [];
      let cur = toId;
      while (cur !== fromId) {
        const p = parent.get(cur);
        if (!p) break;
        pathIds.unshift(p.from);
        pathRels.unshift(p.rel);
        cur = p.from;
      }

      // Load chi tiết nodes
      const nodeDetail = await pool.query(
        `SELECT id, type, label, description FROM kg_nodes WHERE id = ANY($1::text[])`,
        [pathIds]
      );
      const detailMap = Object.fromEntries(nodeDetail.rows.map(r => [r.id, r]));

      // Lấy mastery cho user (để hiển thị score trên path)
      const masteryMap = {};
      const user = getKgUser(req);
      if (user) {
        const mr = await pool.query(
          `SELECT node_id, score FROM kg_mastery
           WHERE user_id = $1 AND node_id = ANY($2::text[])`,
          [user.id, pathIds]
        );
        for (const m of mr.rows) masteryMap[m.node_id] = Math.round(m.score);
      }

      // Heuristic estimated time per node type (minutes)
      const ESTIMATE_MIN = {
        Subject: 0,    Chapter: 25,   Topic: 30,
        Concept: 20,   Formula: 15,   Question: 5,
        Lesson: 40,    Project: 60,   Career: 10,   Person: 5,
      };
      const path = pathIds.map((id, idx) => {
        const type = detailMap[id]?.type || 'Unknown';
        return {
          nodeId: id,
          order: idx + 1,
          label: detailMap[id]?.label || id,
          type,
          description: detailMap[id]?.description || null,
          masteryScore: masteryMap[id] ?? null,
          relFromPrev: idx > 0 ? pathRels[idx - 1] : null,
          estimatedMinutes: ESTIMATE_MIN[type] ?? 20,
        };
      });
      const totalMinutes = path.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

      return res.json({
        success: true, found: true, fromId, toId,
        hops: pathIds.length - 1,
        path,
        totalMinutes,
      });
    } catch (err) {
      console.error('[kg:path:find] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/kg/path/save-as-learning-path
  // Body: { path: [{ nodeId, label, type, description, estimatedMinutes }],
  //         name, description?, subject?, fromLabel?, toLabel? }
  // Creates a new LearningPath + LearningPathAssignment cho current user.
  app.post('/api/kg/path/save-as-learning-path', express.json({ limit: '128kb' }), async (req, res) => {
    const user = getKgUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureKgReady();
      await ensureLPTables(); // ensure LearningPath + LPA tables exist
      // LearningPath dùng pool khác — but cùng DATABASE_URL nên reuse được
      const pool = getKcPool();
      const body = req.body || {};
      const pathSteps = Array.isArray(body.path) ? body.path : [];
      if (pathSteps.length < 2) {
        return res.status(400).json({ success: false, error: 'Path cần ≥2 steps' });
      }
      const name = String(body.name || '').trim().slice(0, 200) ||
        `Lộ trình tự sinh: ${body.fromLabel || 'điểm yếu'} → ${body.toLabel || 'mục tiêu'}`;
      const description = String(body.description || '').trim().slice(0, 1000) ||
        `Tự động sinh từ Knowledge Graph: ${pathSteps.length} bước học prerequisite có thứ tự.`;
      const subject = String(body.subject || 'Vật lí 11').slice(0, 60);

      // Build modules từ path steps
      const modules = pathSteps.map((step, idx) => ({
        id: `mod_${step.nodeId}_${idx}`,
        type: step.type === 'Question' ? 'quiz'
          : step.type === 'Formula' ? 'reading'
          : step.type === 'Project' ? 'assignment'
          : 'lesson',
        title: step.label || `Bước ${idx + 1}`,
        description: step.description || `Học khái niệm "${step.label}" trong lộ trình`,
        duration: Number(step.estimatedMinutes) || 20,
        xpReward: 10 + (Number(step.estimatedMinutes) || 20),
        order: idx,
        // Tham chiếu node KG → frontend mở drawer khi click
        resourceId: step.nodeId,
        resourceUrl: `/dashboard/knowledge-graph?focus=${encodeURIComponent(step.nodeId)}`,
      }));

      const totalDuration = modules.reduce((s, m) => s + m.duration, 0);
      const totalXP = modules.reduce((s, m) => s + m.xpReward, 0);

      const pathId = 'lp_kg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      await pool.query(
        `INSERT INTO "LearningPath"
           (id, "teacherId", name, description, subject, difficulty,
            modules, "estimatedDays", "totalXP", "totalDuration",
            "isTemplate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          pathId,
          user.id,  // dùng user.id làm "owner" tạm (HS tự tạo cho mình)
          name,
          description,
          subject,
          'medium',
          JSON.stringify(modules),
          Math.max(1, Math.ceil(totalDuration / 30)), // 30 phút/ngày
          totalXP,
          totalDuration,
          false,  // không phải template
        ]
      );

      // Auto-assign cho chính user
      const lpaId = 'lpa_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
      await pool.query(
        `INSERT INTO "LearningPathAssignment"
           (id, "pathId", "studentId", "studentName", "studentEmail",
            status, "progressPct", "moduleStatus",
            "assignedAt", "lastActivityAt")
         VALUES ($1, $2, $3, $4, $5, 'assigned', 0, '{}'::jsonb, NOW(), NOW())`,
        [lpaId, pathId, user.id, '', '']
      );

      // ── NOTIFY TEACHERS ──
      // Tìm GV phụ trách (linked teacher của HS qua TeacherStudentLink approved).
      // Gửi notification kèm preview path để GV biết HS đang tự khảo sát.
      let notifiedTeachers = 0;
      try {
        // Pull student name từ User table cho nội dung notification
        const userRow = await pool.query(
          `SELECT name, email FROM "User" WHERE id = $1 LIMIT 1`,
          [user.id]
        );
        const studentName = userRow.rows[0]?.name || userRow.rows[0]?.email || 'Học sinh';

        // Tìm tất cả GV đã approved kết nối với HS
        const teacherRows = await pool.query(
          `SELECT "teacherId" FROM "TeacherStudentLink"
           WHERE "studentId" = $1 AND status = 'approved'`,
          [user.id]
        );

        // Build path preview (compact list of node labels)
        const stepsPreview = pathSteps
          .map((s, i) => `${i + 1}. ${s.label || s.nodeId}`)
          .join('\n');

        for (const tr of teacherRows.rows) {
          const notifId = 'notif_kg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
          await pool.query(
            `INSERT INTO "Notification"
               (id, "userId", "fromUserId", type, title, body, link, metadata, "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
            [
              notifId,
              tr.teacherId,
              user.id,
              'kg_path_saved',
              `${studentName} vừa tự tạo lộ trình "${name}"`,
              `${modules.length} bước, ~${totalDuration} phút, môn ${subject}.\n\nLộ trình:\n${stepsPreview}`,
              `/learning-paths`, // GV có thể vào xem (cùng route HS)
              JSON.stringify({
                pathId,
                assignmentId: lpaId,
                studentId: user.id,
                studentName,
                subject,
                modulesCount: modules.length,
                totalDuration,
                pathPreview: pathSteps.slice(0, 12).map(s => ({
                  nodeId: s.nodeId,
                  label: s.label,
                  type: s.type,
                  masteryScore: s.masteryScore,
                  estimatedMinutes: s.estimatedMinutes,
                })),
              }),
            ]
          );
          notifiedTeachers++;
        }
      } catch (notifErr) {
        console.warn('[kg:path:save-as-lp:notify]', notifErr.message);
        // Không fail toàn bộ request nếu notification lỗi
      }

      return res.status(201).json({
        success: true,
        pathId, assignmentId: lpaId,
        modulesCount: modules.length,
        totalDuration, totalXP,
        notifiedTeachers,
        message: notifiedTeachers > 0
          ? `Đã tạo lộ trình ${modules.length} module + gửi cho ${notifiedTeachers} giáo viên`
          : `Đã tạo lộ trình ${modules.length} module (chưa có GV được liên kết để báo)`,
      });
    } catch (err) {
      console.error('[kg:path:save-as-lp] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // KG — PHASE 6: AI Smart Search & Recommendation
  // User gõ câu hỏi tự nhiên ("Tôi muốn học dao động"), AI parse
  // intent → match best nodes → optionally đề xuất path.
  // ════════════════════════════════════════════════

  // POST /api/kg/smart-query
  // Body: { query: "Tôi muốn học về dao động", limit?: 10 }
  app.post('/api/kg/smart-query', express.json({ limit: '8kb' }), async (req, res) => {
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const query = String(req.body?.query || '').trim().slice(0, 500);
      if (query.length < 3) {
        return res.status(400).json({ success: false, error: 'Query quá ngắn (≥3 ký tự)' });
      }
      const limit = Math.min(20, Math.max(3, parseInt(String(req.body?.limit || 8), 10)));

      // Bước 1: Lấy TẤT CẢ labels của nodes (≤500) để AI biết catalog
      const allLabels = await pool.query(
        `SELECT id, type, label FROM kg_nodes ORDER BY type, label LIMIT 500`
      );
      const catalog = allLabels.rows
        .map(r => `${r.id} | ${r.type} | ${r.label}`)
        .join('\n');

      // Bước 2: Hỏi AI Claude — parse intent + match best nodes
      let aiResult;
      try {
        const client = getAnthropic();
        const sys = `Bạn là trợ lý điều hướng Knowledge Graph cho học sinh THPT VN.
Người dùng hỏi 1 câu, bạn phải:
1. Phân tích intent (muốn HỌC khái niệm gì? muốn ĐỊNH NGHĨA? muốn THỰC HÀNH? muốn LIÊN MÔN?)
2. Match với CATALOG được cung cấp
3. Trả về JSON CHẶT chẽ: {intent, suggestedNodeIds: [id1, id2, ...], explanation, suggestedPathTo?: nodeId}
- suggestedNodeIds: ≤${limit} ids từ catalog, sắp xếp theo relevance giảm dần
- suggestedPathTo: id node "đích" nếu user đang hỏi muốn học cái gì
- explanation: 1-2 câu tiếng Việt giải thích lựa chọn
CHỈ TRẢ JSON, không bọc markdown.`;

        const msg = await client.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-6',
          max_tokens: 800,
          system: sys,
          messages: [{
            role: 'user',
            content: `CATALOG (id | type | label):\n${catalog}\n\nCÂU HỎI: ${query}\n\nTrả JSON:`,
          }],
        });
        const text = msg.content?.[0]?.text || '{}';
        // Strip markdown if present
        const cleaned = text.replace(/```json|```/g, '').trim();
        aiResult = JSON.parse(cleaned);
      } catch (e) {
        // Fallback: trigram search nếu AI fail
        console.warn('[kg:smart-query] AI failed, fallback trigram:', e.message);
        const fb = await pool.query(
          `SELECT id FROM kg_nodes
           WHERE label ILIKE $1 OR similarity(label, $2) > 0.3
           ORDER BY similarity(label, $2) DESC LIMIT $3`,
          [`%${query}%`, query, limit]
        );
        aiResult = {
          intent: 'fallback-search',
          suggestedNodeIds: fb.rows.map(r => r.id),
          explanation: 'AI tạm không khả dụng, dùng tìm kiếm trigram thay thế.',
        };
      }

      // Bước 3: Load chi tiết các nodes được suggest
      const ids = Array.isArray(aiResult.suggestedNodeIds)
        ? aiResult.suggestedNodeIds.slice(0, limit) : [];
      let nodeDetails = [];
      if (ids.length > 0) {
        const nr = await pool.query(
          `SELECT id, type, label, description FROM kg_nodes WHERE id = ANY($1::text[])`,
          [ids]
        );
        // Preserve order from AI suggestion
        const map = Object.fromEntries(nr.rows.map(r => [r.id, r]));
        nodeDetails = ids.map(id => map[id]).filter(Boolean);
      }

      return res.json({
        success: true,
        query,
        intent: aiResult.intent || 'unknown',
        explanation: aiResult.explanation || '',
        suggestedNodes: nodeDetails,
        suggestedPathTo: aiResult.suggestedPathTo || null,
      });
    } catch (err) {
      console.error('[kg:smart-query] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // KG — PHASE 7: Collaborative Editing (suggestions)
  // GV/HS đề xuất khái niệm/relation mới → admin duyệt.
  // ════════════════════════════════════════════════

  // Helper migration: bảng kg_suggestions
  let _kgSuggReady = false;
  async function ensureKgSuggReady() {
    if (_kgSuggReady) return;
    await ensureKgReady();
    const pool = getKcPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kg_suggestions (
        id TEXT PRIMARY KEY,
        author_id TEXT,
        kind TEXT NOT NULL,                  -- 'add_node' | 'add_edge' | 'edit_node' | 'remove'
        payload JSONB NOT NULL,              -- {type, label, description, ...} hoặc {from, to, rel}
        status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
        upvotes INTEGER NOT NULL DEFAULT 0,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kg_sugg_status ON kg_suggestions(status)`);
    _kgSuggReady = true;
  }

  // POST /api/kg/suggestions — submit đề xuất
  // Body: { kind: 'add_node'|'add_edge'|'edit_node', payload: object, reason?: string }
  app.post('/api/kg/suggestions', express.json({ limit: '32kb' }), async (req, res) => {
    const user = getKgUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureKgSuggReady();
      const pool = getKcPool();
      const body = req.body || {};
      const kind = String(body.kind || '');
      const validKinds = ['add_node', 'add_edge', 'edit_node', 'remove'];
      if (!validKinds.includes(kind)) {
        return res.status(400).json({ success: false, error: 'kind không hợp lệ' });
      }
      if (!body.payload || typeof body.payload !== 'object') {
        return res.status(400).json({ success: false, error: 'payload required' });
      }
      const id = 'sugg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
      await pool.query(
        `INSERT INTO kg_suggestions (id, author_id, kind, payload, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, user.id, kind, JSON.stringify(body.payload), String(body.reason || '').slice(0, 500)]
      );
      return res.status(201).json({
        success: true, id,
        message: 'Đã ghi nhận đề xuất, admin sẽ xem xét trong vài ngày tới.',
      });
    } catch (err) {
      console.error('[kg:suggestions:create] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/kg/suggestions?status=pending&limit=50 — list (cho admin review)
  app.get('/api/kg/suggestions', async (req, res) => {
    try {
      await ensureKgSuggReady();
      const pool = getKcPool();
      const status = ['pending', 'approved', 'rejected'].includes(String(req.query.status || ''))
        ? String(req.query.status) : 'pending';
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || 50), 10)));
      const r = await pool.query(
        `SELECT id, author_id, kind, payload, status, upvotes, reason, created_at, reviewed_at
         FROM kg_suggestions WHERE status = $1
         ORDER BY upvotes DESC, created_at DESC LIMIT $2`,
        [status, limit]
      );
      return res.json({
        success: true,
        items: r.rows.map(x => ({
          id: x.id, authorId: x.author_id, kind: x.kind,
          payload: x.payload, status: x.status, upvotes: x.upvotes,
          reason: x.reason, createdAt: x.created_at, reviewedAt: x.reviewed_at,
        })),
        count: r.rows.length,
      });
    } catch (err) {
      console.error('[kg:suggestions:list] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/kg/suggestions/:id/upvote — vote up
  app.post('/api/kg/suggestions/:id/upvote', async (req, res) => {
    const user = getKgUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureKgSuggReady();
      const pool = getKcPool();
      const r = await pool.query(
        `UPDATE kg_suggestions SET upvotes = upvotes + 1
         WHERE id = $1 AND status = 'pending' RETURNING upvotes`,
        [req.params.id]
      );
      if (r.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Not found or already reviewed' });
      }
      return res.json({ success: true, upvotes: r.rows[0].upvotes });
    } catch (err) {
      console.error('[kg:suggestions:upvote] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/kg/sources/lesson-plans?limit=50 — list LP cho dropdown trong UI extract
  app.get('/api/kg/sources/lesson-plans', async (req, res) => {
    try {
      const pool = getKcPool();
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
      const r = await pool.query(
        `SELECT id, title, subject, "wordCount", "updatedAt"
         FROM "LessonPlan"
         WHERE content IS NOT NULL AND LENGTH(content) > 100
         ORDER BY "updatedAt" DESC NULLS LAST
         LIMIT $1`, [limit]
      );
      return res.json({
        success: true,
        items: r.rows.map(x => ({
          id: x.id, title: x.title, subject: x.subject,
          wordCount: x.wordCount, updatedAt: x.updatedAt,
        })),
      });
    } catch (err) {
      console.warn('[kg:sources:lesson-plans] ⚠', err.message);
      return res.json({ success: true, items: [] });
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // RECOMMENDATION SYSTEM (RS) — "For You" feed cho HS/GV
  // Lấy cảm hứng từ X/Twitter algorithm (Home Mixer + Phoenix + Thunder):
  //   - Sources: in-network (GV linked) + out-of-network (popular) + KG-driven
  //   - Hydrators: enrich với metadata (title, mastery, duration, ...)
  //   - Filters: dedup, đã làm rồi, blocked, expired
  //   - Scorers: weighted multi-signal (recency, mastery gap, popularity)
  //   - Selector: top-K diverse
  //
  // RS-Phase 1: action logging
  // RS-Phase 2: rule-based pipeline (no ML yet)
  // RS-Phase 3+: ML embeddings (defer)
  // ═══════════════════════════════════════════════════════════════════
  let _rsReady = false;
  async function ensureRsReady() {
    if (_rsReady) return;
    const pool = getKcPool();
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rs_action_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        weight REAL NOT NULL DEFAULT 1.0,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rs_user_recent ON rs_action_log(user_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_rs_target ON rs_action_log(target_type, target_id, created_at DESC)`);
    _rsReady = true;
  }

  function getRsUser(req) {
    try {
      const jwt = require('jsonwebtoken');
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
      const d = jwt.verify(auth.slice(7), secret, { ignoreExpiration: true });
      return { id: d.sub || d.userId || d.id, role: d.role || 'student' };
    } catch { return null; }
  }

  // Weight mặc định cho từng loại action (Twitter pattern: positive vs negative)
  const RS_WEIGHTS = {
    'view':        0.5,
    'click':       1.0,
    'dwell_30s':   1.5,
    'complete':    3.0,
    'like':        2.0,
    'save':        2.5,
    'share':       3.0,
    'pass_quiz':   4.0,
    'fail_quiz':  -1.0,
    'skip':       -0.5,
    'not_interested': -2.0,
    'block':      -3.0,
    'report':     -5.0,
  };

  // POST /api/reco/track — log 1 action của user
  // Body: { action, targetType, targetId, metadata? }
  app.post('/api/reco/track', express.json({ limit: '4kb' }), async (req, res) => {
    const user = getRsUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureRsReady();
      const pool = getKcPool();
      const body = req.body || {};
      const action = String(body.action || '').toLowerCase();
      const targetType = String(body.targetType || '').slice(0, 30);
      const targetId = String(body.targetId || '').slice(0, 200);
      if (!action || !targetType || !targetId) {
        return res.status(400).json({ success: false, error: 'action/targetType/targetId required' });
      }
      const weight = Number.isFinite(body.weight) ? Number(body.weight) : (RS_WEIGHTS[action] ?? 1.0);
      const id = 'rs_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      await pool.query(
        `INSERT INTO rs_action_log (id, user_id, action, target_type, target_id, weight, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, user.id, action, targetType, targetId, weight, JSON.stringify(body.metadata || {})]
      );
      return res.status(201).json({ success: true, id });
    } catch (err) {
      console.error('[rs:track] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/reco/history?limit=50 — user's recent actions (debug + UI)
  app.get('/api/reco/history', async (req, res) => {
    const user = getRsUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureRsReady();
      const pool = getKcPool();
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || 50), 10)));
      const r = await pool.query(
        `SELECT id, action, target_type, target_id, weight, metadata, created_at
         FROM rs_action_log WHERE user_id = $1
         ORDER BY created_at DESC LIMIT $2`,
        [user.id, limit]
      );
      return res.json({
        success: true,
        items: r.rows.map(x => ({
          id: x.id, action: x.action,
          targetType: x.target_type, targetId: x.target_id,
          weight: x.weight, metadata: x.metadata,
          createdAt: x.created_at,
        })),
      });
    } catch (err) {
      console.error('[rs:history] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/reco/feed?audience=student|teacher&limit=20
  // RS-Phase 2: rule-based pipeline (Sources → Hydrate → Filter → Score → Select)
  //
  // Cho HS: mix 4 nguồn
  //   1. Weak topics từ KG mastery (40% weight) — học cái yếu nhất trước
  //   2. From linked teachers (30%) — đề/path GV mới tạo
  //   3. Popular (20%) — exams/paths được nhiều bạn làm
  //   4. Curious (10%) — out-of-network: lĩnh vực user chưa engage
  // Cho GV: students cần hỗ trợ + content gap suggestions
  app.get('/api/reco/feed', async (req, res) => {
    const user = getRsUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureRsReady();
      await ensureKgReady();
      const pool = getKcPool();
      const audience = String(req.query.audience || 'student');
      const limit = Math.min(50, Math.max(5, parseInt(String(req.query.limit || 20), 10)));

      const candidates = []; // {type, id, title, score, source, meta}

      if (audience === 'student') {
        // ── Source 1: Weak topics từ KG mastery ──
        try {
          const weakRows = await pool.query(
            `SELECT m.node_id, m.score, n.label, n.type, n.description
             FROM kg_mastery m JOIN kg_nodes n ON n.id = m.node_id
             WHERE m.user_id = $1 AND m.score < 50
             ORDER BY m.score ASC LIMIT 8`,
            [user.id]
          );
          for (const w of weakRows.rows) {
            const recencyBoost = (50 - w.score) * 2; // 0-100 range
            candidates.push({
              type: 'kg_weak_topic',
              id: w.node_id,
              title: w.label,
              subtitle: `Bạn còn yếu (${Math.round(w.score)}%) — học lại ngay`,
              description: w.description,
              score: 60 + recencyBoost, // ~60-160
              source: 'kg-mastery',
              link: `/dashboard/knowledge-graph?focus=${encodeURIComponent(w.node_id)}`,
              meta: { masteryScore: w.score, nodeType: w.type },
              cta: 'Học lại',
            });
          }
        } catch (e) { console.warn('[rs:source:kg-weak]', e.message); }

        // ── Source 2: From linked teachers ──
        try {
          const teacherContent = await pool.query(
            `SELECT lp.id, lp.name, lp.description, lp.subject, lp."estimatedDays",
                    lp."totalDuration", lp."totalXP", lp."createdAt", u.name AS teacher_name
             FROM "LearningPath" lp
             LEFT JOIN "User" u ON u.id = lp."teacherId"
             JOIN "TeacherStudentLink" tsl ON tsl."teacherId" = lp."teacherId"
             WHERE tsl."studentId" = $1 AND tsl.status = 'approved'
               AND lp."createdAt" > NOW() - INTERVAL '30 days'
             ORDER BY lp."createdAt" DESC LIMIT 6`,
            [user.id]
          );
          for (const lp of teacherContent.rows) {
            const ageDays = (Date.now() - new Date(lp.createdAt).getTime()) / 86400000;
            const recencyDecay = Math.max(0, 30 - ageDays);
            candidates.push({
              type: 'teacher_learning_path',
              id: lp.id,
              title: lp.name,
              subtitle: `GV: ${lp.teacher_name || 'Giáo viên'} · ${lp.subject || 'Tổng hợp'}`,
              description: lp.description,
              score: 50 + recencyDecay, // ~50-80
              source: 'teacher-network',
              link: `/learning-paths`,
              meta: {
                duration: lp.totalDuration,
                xp: lp.totalXP, days: lp.estimatedDays,
                teacherId: lp.teacherId, teacherName: lp.teacher_name,
              },
              cta: 'Vào lộ trình',
            });
          }
        } catch (e) { console.warn('[rs:source:teacher]', e.message); }

        // ── Source 3: Popular exams ──
        try {
          const popularExams = await pool.query(
            `SELECT e.id, e.title, e.description, e.subject, e."examType",
                    COUNT(DISTINCT pe."studentId") AS taker_count,
                    AVG(pe."percentage") AS avg_pct
             FROM "Exam" e
             LEFT JOIN "PracticeExam" pe ON pe."examId" = e.id
             WHERE e.published = true AND e."createdAt" > NOW() - INTERVAL '60 days'
             GROUP BY e.id, e.title, e.description, e.subject, e."examType"
             HAVING COUNT(DISTINCT pe."studentId") > 0
             ORDER BY taker_count DESC LIMIT 6`
          );
          for (const ex of popularExams.rows) {
            // Skip nếu user đã làm
            const taken = await pool.query(
              `SELECT 1 FROM "PracticeExam" WHERE "studentId" = $1 AND "examId" = $2 LIMIT 1`,
              [user.id, ex.id]
            );
            if (taken.rows.length > 0) continue;
            candidates.push({
              type: 'popular_exam',
              id: ex.id,
              title: ex.title,
              subtitle: `${ex.subject || 'Đề thi'} · ${ex.taker_count} HS đã làm`,
              description: ex.description,
              score: 40 + Math.min(40, Number(ex.taker_count)),
              source: 'popular',
              link: `/student/exams`,
              meta: { takerCount: Number(ex.taker_count), avgPct: Number(ex.avg_pct) || 0 },
              cta: 'Làm thử',
            });
          }
        } catch (e) { console.warn('[rs:source:popular-exam]', e.message); }

        // ── Source 4: Curious — random KG topics chưa engage ──
        try {
          const curious = await pool.query(
            `SELECT n.id, n.label, n.type, n.description
             FROM kg_nodes n
             LEFT JOIN kg_mastery m ON m.node_id = n.id AND m.user_id = $1
             WHERE m.node_id IS NULL
               AND n.type IN ('Topic', 'Concept', 'Career')
             ORDER BY RANDOM() LIMIT 4`,
            [user.id]
          );
          for (const c of curious.rows) {
            candidates.push({
              type: 'curious_topic',
              id: c.id,
              title: c.label,
              subtitle: c.type === 'Career' ? 'Khám phá nghề nghiệp' : 'Khái niệm chưa khám phá',
              description: c.description,
              score: 30 + Math.random() * 15,
              source: 'curious',
              link: `/dashboard/knowledge-graph?focus=${encodeURIComponent(c.id)}`,
              meta: { nodeType: c.type },
              cta: 'Khám phá',
            });
          }
        } catch (e) { console.warn('[rs:source:curious]', e.message); }
      }

      else if (audience === 'teacher') {
        // ── Teacher: HS cần hỗ trợ ──
        try {
          const struggling = await pool.query(
            `SELECT u.id, u.name, u.email,
                    AVG(m.score) AS avg_score,
                    COUNT(m.node_id) FILTER (WHERE m.score < 30) AS weak_count
             FROM "TeacherStudentLink" tsl
             JOIN "User" u ON u.id = tsl."studentId"
             LEFT JOIN kg_mastery m ON m.user_id = u.id
             WHERE tsl."teacherId" = $1 AND tsl.status = 'approved'
             GROUP BY u.id, u.name, u.email
             HAVING COUNT(m.node_id) FILTER (WHERE m.score < 30) > 0
             ORDER BY weak_count DESC, avg_score ASC LIMIT 10`,
            [user.id]
          );
          for (const s of struggling.rows) {
            const avgScore = Math.round(Number(s.avg_score) || 0);
            candidates.push({
              type: 'student_needs_help',
              id: s.id,
              title: s.name || s.email,
              subtitle: `${s.weak_count} chủ đề yếu · TB ${avgScore}%`,
              description: `HS có nhiều điểm yếu cần GV giúp tạo lộ trình`,
              score: 100 + Number(s.weak_count) * 5,
              source: 'student-need',
              link: `/teacher/dashboard`,
              meta: { studentId: s.id, weakCount: Number(s.weak_count), avgScore },
              cta: 'Xem chi tiết',
            });
          }
        } catch (e) { console.warn('[rs:source:struggling]', e.message); }

        // ── Recent student-self-saved paths (KG-derived) ──
        try {
          const studentPaths = await pool.query(
            `SELECT lp.id, lp.name, lp.description, lp."createdAt",
                    u.name AS student_name, u.id AS student_id
             FROM "LearningPath" lp
             JOIN "User" u ON u.id = lp."teacherId"
             JOIN "TeacherStudentLink" tsl ON tsl."studentId" = lp."teacherId"
             WHERE tsl."teacherId" = $1 AND tsl.status = 'approved'
               AND lp.id LIKE 'lp_kg_%'
               AND lp."createdAt" > NOW() - INTERVAL '14 days'
             ORDER BY lp."createdAt" DESC LIMIT 6`,
            [user.id]
          );
          for (const sp of studentPaths.rows) {
            candidates.push({
              type: 'student_self_path',
              id: sp.id,
              title: `${sp.student_name} vừa tự tạo lộ trình`,
              subtitle: sp.name,
              description: sp.description,
              score: 80,
              source: 'student-activity',
              link: `/learning-paths`,
              meta: { studentId: sp.student_id, studentName: sp.student_name },
              cta: 'Xem lộ trình',
            });
          }
        } catch (e) { console.warn('[rs:source:student-paths]', e.message); }
      }

      // ── Filter: deduplicate by (type, id) ──
      const seen = new Set();
      const filtered = [];
      for (const c of candidates) {
        const key = `${c.type}::${c.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        filtered.push(c);
      }

      // ── Filter: skip items user has "not_interested" or "skip" recently ──
      try {
        const recentNeg = await pool.query(
          `SELECT target_type, target_id FROM rs_action_log
           WHERE user_id = $1 AND action IN ('not_interested', 'block', 'skip')
             AND created_at > NOW() - INTERVAL '14 days'`,
          [user.id]
        );
        const negSet = new Set(recentNeg.rows.map(r => `${r.target_type}::${r.target_id}`));
        for (let i = filtered.length - 1; i >= 0; i--) {
          if (negSet.has(`${filtered[i].type}::${filtered[i].id}`)) {
            filtered.splice(i, 1);
          }
        }
      } catch (e) { console.warn('[rs:filter:neg]', e.message); }

      // ─────────────────────────────────────────────────────────
      // RS-PHASE 3: HYDRATION — enrich candidates với rich signals
      // (mastery của user, prerequisites status, popularity từ action log)
      // ─────────────────────────────────────────────────────────
      try {
        // 1. Collect KG node IDs để batch fetch mastery
        const kgNodeIds = filtered
          .filter(c => c.type === 'kg_weak_topic' || c.type === 'curious_topic')
          .map(c => c.id);

        // 2. Batch fetch mastery scores (1 query thay vì N)
        const masteryById = {};
        if (kgNodeIds.length > 0) {
          const mr = await pool.query(
            `SELECT node_id, score FROM kg_mastery
             WHERE user_id = $1 AND node_id = ANY($2::text[])`,
            [user.id, kgNodeIds]
          );
          for (const row of mr.rows) masteryById[row.node_id] = Math.round(row.score);
        }

        // 3. Batch fetch prerequisites (REQUIRES edges) cho KG nodes
        const prereqsByNode = {};
        if (kgNodeIds.length > 0) {
          const pr = await pool.query(
            `SELECT from_id, to_id FROM kg_edges
             WHERE rel_type = 'REQUIRES' AND from_id = ANY($1::text[])`,
            [kgNodeIds]
          );
          for (const row of pr.rows) {
            if (!prereqsByNode[row.from_id]) prereqsByNode[row.from_id] = [];
            prereqsByNode[row.from_id].push(row.to_id);
          }
          // Fetch mastery cho prereq nodes (cùng query)
          const allPrereqIds = Array.from(new Set(Object.values(prereqsByNode).flat()));
          if (allPrereqIds.length > 0) {
            const pm = await pool.query(
              `SELECT node_id, score FROM kg_mastery
               WHERE user_id = $1 AND node_id = ANY($2::text[])`,
              [user.id, allPrereqIds]
            );
            for (const row of pm.rows) masteryById[row.node_id] = Math.round(row.score);
          }
        }

        // 4. Popularity per target — view count từ action log 30 ngày
        const popularityKeys = filtered.map(c => `${c.type}::${c.id}`);
        const popularityByKey = {};
        if (popularityKeys.length > 0) {
          const pop = await pool.query(
            `SELECT target_type, target_id, COUNT(DISTINCT user_id) AS unique_users
             FROM rs_action_log
             WHERE created_at > NOW() - INTERVAL '30 days'
               AND action IN ('view', 'click', 'complete', 'pass_quiz')
             GROUP BY target_type, target_id`
          );
          for (const r of pop.rows) {
            popularityByKey[`${r.target_type}::${r.target_id}`] = Number(r.unique_users);
          }
        }

        // 5. Apply hydration signals + compute reasons
        for (const c of filtered) {
          c.hydration = {};
          c.reasons = [];

          // Mastery boost: nodes user weak → tăng score
          const myMastery = masteryById[c.id];
          if (myMastery !== undefined) {
            c.hydration.currentMastery = myMastery;
            const masteryGapBoost = (100 - myMastery) * 0.5;
            c.score += masteryGapBoost;
            if (myMastery < 30) {
              c.reasons.push('🎯 Bạn còn yếu chủ đề này');
            } else if (myMastery < 70) {
              c.reasons.push('📈 Đang học — cải thiện thêm');
            }
          }

          // Prerequisites check — nếu user thiếu prereq → giảm score + warning
          const prereqs = prereqsByNode[c.id] || [];
          if (prereqs.length > 0) {
            const prereqScores = prereqs.map(pid => masteryById[pid] ?? 0);
            const masteredCount = prereqScores.filter(s => s >= 70).length;
            const prereqRatio = masteredCount / prereqs.length;
            c.hydration.prereqStatus = Math.round(prereqRatio * 100);
            c.hydration.prereqCount = prereqs.length;
            c.hydration.prereqMastered = masteredCount;
            // Penalty: missing prereqs lower score
            const penalty = (1 - prereqRatio) * 25;
            c.score -= penalty;
            if (prereqRatio < 0.5 && prereqs.length > 0) {
              c.reasons.push(`⚠ Cần học ${prereqs.length - masteredCount}/${prereqs.length} prerequisite trước`);
            } else if (prereqRatio >= 0.8) {
              c.reasons.push('✓ Bạn đã có nền tảng');
            }
          }

          // Popularity boost (giới hạn ±10 để không dominate)
          const popularity = popularityByKey[`${c.type}::${c.id}`] || 0;
          c.hydration.popularity = popularity;
          if (popularity > 0) {
            const popBoost = Math.min(15, popularity * 1.5);
            c.score += popBoost;
            if (popularity >= 5) {
              c.reasons.push(`🔥 ${popularity} HS đã tương tác`);
            }
          }

          // Recency boost (đã tính trong source baseline cho 1 số types,
          // ở đây chỉ là metadata để hiển thị)
          if (c.meta?.duration) {
            c.hydration.estimatedMinutes = c.meta.duration;
          }
        }
      } catch (e) { console.warn('[rs:hydrate]', e.message); }

      // ── Score: apply user's engagement history boost ──
      try {
        const userHistory = await pool.query(
          `SELECT target_type, SUM(weight) AS total_weight
           FROM rs_action_log
           WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
           GROUP BY target_type`,
          [user.id]
        );
        const affinityByType = Object.fromEntries(
          userHistory.rows.map(r => [r.target_type, Math.max(-5, Math.min(5, Number(r.total_weight))) ])
        );
        for (const c of filtered) {
          const affinity = affinityByType[c.type] || 0;
          c.score += affinity * 3; // boost up to ±15
          if (affinity > 2) c.reasons?.push?.(`💜 Bạn hay tương tác với ${c.type.replace(/_/g, ' ')}`);
        }
      } catch (e) { console.warn('[rs:score:affinity]', e.message); }

      // ── Diversity: penalize repeated source ──
      const sourceCount = {};
      for (const c of filtered) {
        sourceCount[c.source] = (sourceCount[c.source] || 0) + 1;
        if (sourceCount[c.source] > 2) {
          c.score *= 0.7; // penalize after 2nd from same source
        }
      }

      // ── Selector: sort + top-K ──
      filtered.sort((a, b) => b.score - a.score);
      const top = filtered.slice(0, limit);

      return res.json({
        success: true,
        audience,
        count: top.length,
        items: top.map(c => ({
          type: c.type, id: c.id, title: c.title, subtitle: c.subtitle,
          description: c.description, score: Math.round(c.score * 10) / 10,
          source: c.source, link: c.link, meta: c.meta, cta: c.cta,
          // RS-Phase 3: hydration signals + human-readable reasons
          hydration: c.hydration || null,
          reasons: c.reasons || [],
        })),
        sources: Array.from(new Set(top.map(c => c.source))),
      });
    } catch (err) {
      console.error('[rs:feed] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // KG — PHASE 3: Personal Mastery Layer
  // Mỗi user có mức độ thông thạo (score 0-100) cho từng node — render
  // overlay màu trên graph để biết chỗ nào còn yếu, chỗ nào đã thông thạo.
  // ════════════════════════════════════════════════

  // Helper: lấy userId từ JWT (reuse cùng pattern với phần khác)
  function getKgUser(req) {
    try {
      const jwt = require('jsonwebtoken');
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
      const d = jwt.verify(auth.slice(7), secret, { ignoreExpiration: true });
      return { id: d.sub || d.userId || d.id };
    } catch { return null; }
  }

  // GET /api/kg/mastery/me — Map<nodeId, { score, attempts, source, updatedAt }>
  app.get('/api/kg/mastery/me', async (req, res) => {
    const user = getKgUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const r = await pool.query(
        `SELECT node_id, score, attempts, source, updated_at
         FROM kg_mastery WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 5000`,
        [user.id]
      );
      const mastery = {};
      for (const row of r.rows) {
        mastery[row.node_id] = {
          score: Math.round(row.score),
          attempts: row.attempts,
          source: row.source,
          updatedAt: row.updated_at,
        };
      }
      return res.json({ success: true, mastery, count: r.rows.length });
    } catch (err) {
      console.error('[kg:mastery:me] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/kg/mastery/update — bulk upsert
  // Body: { updates: [{ nodeId, score, source? }, ...], incrementAttempts?: true }
  app.post('/api/kg/mastery/update', express.json({ limit: '128kb' }), async (req, res) => {
    const user = getKgUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureKgReady();
      const pool = getKcPool();
      const body = req.body || {};
      const updates = Array.isArray(body.updates) ? body.updates : [];
      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'Empty updates array' });
      }
      if (updates.length > 200) {
        return res.status(400).json({ success: false, error: 'Max 200 updates per request' });
      }
      const incrAttempts = body.incrementAttempts !== false;
      let upserted = 0;
      for (const u of updates) {
        const nodeId = String(u.nodeId || '').slice(0, 200);
        let score = Number(u.score);
        if (!nodeId || Number.isNaN(score)) continue;
        score = Math.max(0, Math.min(100, score));
        const source = String(u.source || 'manual').slice(0, 30);
        try {
          await pool.query(
            `INSERT INTO kg_mastery (user_id, node_id, score, attempts, source, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (user_id, node_id) DO UPDATE SET
               score      = EXCLUDED.score,
               attempts   = kg_mastery.attempts + $4,
               source     = EXCLUDED.source,
               updated_at = NOW()`,
            [user.id, nodeId, score, incrAttempts ? 1 : 0, source]
          );
          upserted++;
        } catch (e) { console.warn('[kg:mastery:upsert]', nodeId, e.message); }
      }
      return res.json({ success: true, upserted, total: updates.length });
    } catch (err) {
      console.error('[kg:mastery:update] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/kg/mastery/stats/me — aggregate stats + top weak nodes
  app.get('/api/kg/mastery/stats/me', async (req, res) => {
    const user = getKgUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
      await ensureKgReady();
      const pool = getKcPool();
      // Tổng nodes user đã có data + phân bố
      const dist = await pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE score < 30)  AS weak,
            COUNT(*) FILTER (WHERE score >= 30 AND score < 70) AS learning,
            COUNT(*) FILTER (WHERE score >= 70) AS mastered,
            COUNT(*) AS total,
            COALESCE(AVG(score), 0) AS avg_score
         FROM kg_mastery WHERE user_id = $1`,
        [user.id]
      );
      // Top 10 weak nodes — JOIN với kg_nodes để có label
      const weak = await pool.query(
        `SELECT m.node_id, m.score, m.attempts, m.updated_at,
                n.label, n.type, n.description
         FROM kg_mastery m
         LEFT JOIN kg_nodes n ON n.id = m.node_id
         WHERE m.user_id = $1 AND m.score < 50
         ORDER BY m.score ASC, m.updated_at DESC
         LIMIT 10`,
        [user.id]
      );
      // Recent activity
      const recent = await pool.query(
        `SELECT m.node_id, m.score, m.updated_at, n.label, n.type
         FROM kg_mastery m
         LEFT JOIN kg_nodes n ON n.id = m.node_id
         WHERE m.user_id = $1
         ORDER BY m.updated_at DESC LIMIT 5`,
        [user.id]
      );
      const d = dist.rows[0] || {};
      return res.json({
        success: true,
        stats: {
          total:    Number(d.total) || 0,
          weak:     Number(d.weak) || 0,
          learning: Number(d.learning) || 0,
          mastered: Number(d.mastered) || 0,
          avgScore: Math.round(Number(d.avg_score) || 0),
        },
        weakTopics: weak.rows.map(r => ({
          nodeId: r.node_id, label: r.label || '(deleted)',
          type: r.type || 'Concept',
          score: Math.round(r.score), attempts: r.attempts,
          description: r.description,
          updatedAt: r.updated_at,
        })),
        recent: recent.rows.map(r => ({
          nodeId: r.node_id, label: r.label || '(deleted)',
          type: r.type || 'Concept',
          score: Math.round(r.score), updatedAt: r.updated_at,
        })),
      });
    } catch (err) {
      console.error('[kg:mastery:stats] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // CLASSROOM MODE — public student routes (no auth, QR scan)
  // ════════════════════════════════════════════════

  // GET /api/keoco/public/sessions/:token
  // Look up by qr_token OR short_code. Returns lobby state for join screen.
  app.get('/api/keoco/public/sessions/:token', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const t = req.params.token;
      const sq = await pool.query(
        `SELECT * FROM keoco_sessions WHERE qr_token=$1 OR short_code=$1 LIMIT 1`,
        [t]
      );
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];
      const pq = await pool.query(
        `SELECT id, name, team, score FROM keoco_players WHERE session_id=$1 ORDER BY joined_at`,
        [s.id]
      );
      const teamCounts = { red: 0, blue: 0 };
      for (const p of pq.rows) teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
      return res.json({
        success: true,
        data: {
          id: s.id,
          title: s.title,
          subject: s.subject,
          grade: s.grade,
          status: s.status,
          questionCount: s.question_count,
          timePerQuestion: s.time_per_question,
          ropeMax: s.rope_max,
          ropePosition: s.rope_position,
          shortCode: s.short_code,
          teamCounts,
          playerCount: pq.rowCount,
        },
      });
    } catch (err) {
      console.error('[keoco:public-get] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/public/sessions/:token/join
  // body: { name, team? ('auto'|'red'|'blue') }
  // Returns { playerToken, player, session }
  app.post('/api/keoco/public/sessions/:token/join', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const t = req.params.token;
      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 200);
      if (!name) return res.status(400).json({ success: false, error: 'name_required' });
      const wantTeam = ['red', 'blue'].includes(b.team) ? b.team : 'auto';

      const sq = await pool.query(
        `SELECT * FROM keoco_sessions WHERE qr_token=$1 OR short_code=$1 LIMIT 1`,
        [t]
      );
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];
      if (s.status === 'finished') return res.status(400).json({ success: false, error: 'finished' });

      // Auto-balance: assign to smaller team
      let team = wantTeam;
      if (team === 'auto') {
        const cq = await pool.query(
          `SELECT team, COUNT(*)::int AS c FROM keoco_players WHERE session_id=$1 GROUP BY team`,
          [s.id]
        );
        const counts = { red: 0, blue: 0 };
        for (const r of cq.rows) counts[r.team] = r.c;
        team = counts.red <= counts.blue ? 'red' : 'blue';
      }

      const id = newKcId('kcp_');
      const playerToken = newKcToken();
      const user = getUserKc(req);
      const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim().slice(0, 60);

      await pool.query(
        `INSERT INTO keoco_players
           (id, session_id, player_token, name, team, user_id, ip)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, s.id, playerToken, name, team, user?.id || null, ip]
      );

      return res.status(201).json({
        success: true,
        data: {
          playerToken,
          player: { id, name, team, score: 0, correct: 0, wrong: 0, streak: 0 },
          session: {
            id: s.id, title: s.title, status: s.status, ropeMax: s.rope_max,
            timePerQuestion: s.time_per_question, questionCount: s.question_count,
          },
        },
      });
    } catch (err) {
      console.error('[keoco:join] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/public/sessions/:token/state?playerToken=...
  // Polled by mobile clients (1-2s) for live updates: rope, current question, scores.
  app.get('/api/keoco/public/sessions/:token/state', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const t = req.params.token;
      const playerToken = req.query.playerToken || '';

      const sq = await pool.query(
        `SELECT * FROM keoco_sessions WHERE qr_token=$1 OR short_code=$1 LIMIT 1`,
        [t]
      );
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];

      // Player (if known)
      let player = null;
      if (playerToken) {
        const pq = await pool.query(
          `SELECT id, name, team, score, correct, wrong, streak
             FROM keoco_players WHERE session_id=$1 AND player_token=$2 LIMIT 1`,
          [s.id, playerToken]
        );
        if (pq.rowCount) {
          player = pq.rows[0];
          // touch last_seen
          pool.query(`UPDATE keoco_players SET last_seen_at=NOW() WHERE id=$1`, [player.id]).catch(()=>{});
        }
      }

      // Current question (sanitized)
      let currentQuestion = null;
      let alreadyAnswered = false;
      const qIds = Array.isArray(s.question_ids) ? s.question_ids
                  : (s.question_ids ? JSON.parse(s.question_ids) : []);
      if (s.status === 'running' && s.current_index >= 0 && qIds[s.current_index]) {
        const q = await getQuestionById(pool, qIds[s.current_index]);
        currentQuestion = publicQuestion(q, s.current_index);
        if (player) {
          const aq = await pool.query(
            `SELECT 1 FROM keoco_answers WHERE session_id=$1 AND player_id=$2 AND question_idx=$3 LIMIT 1`,
            [s.id, player.id, s.current_index]
          );
          alreadyAnswered = aq.rowCount > 0;
        }
      }

      // Team counts/scores (cheap aggregate)
      const tq = await pool.query(
        `SELECT team, COUNT(*)::int AS c, COALESCE(SUM(score),0)::int AS s FROM keoco_players WHERE session_id=$1 GROUP BY team`,
        [s.id]
      );
      const teamCounts = { red: 0, blue: 0 };
      const teamScores = { red: 0, blue: 0 };
      for (const r of tq.rows) {
        teamCounts[r.team] = r.c;
        teamScores[r.team] = r.s;
      }

      return res.json({
        success: true,
        data: {
          session: {
            id: s.id, title: s.title, status: s.status,
            ropePosition: s.rope_position, ropeMax: s.rope_max,
            currentIndex: s.current_index, questionCount: s.question_count,
            timePerQuestion: s.time_per_question,
            currentStartedAt: s.current_started_at ? new Date(s.current_started_at).toISOString() : null,
            winner: s.winner || null,
          },
          player,
          currentQuestion,
          alreadyAnswered,
          teamCounts,
          teamScores,
        },
      });
    } catch (err) {
      console.error('[keoco:state] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/public/sessions/:token/answer
  // body: { playerToken, questionIdx, answer, timeMs }
  // Grades, applies rope delta, updates player score & streak.
  app.post('/api/keoco/public/sessions/:token/answer', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const t = req.params.token;
      const b = req.body || {};
      const playerToken = String(b.playerToken || '').trim();
      const questionIdx = parseInt(b.questionIdx, 10);
      const answer = b.answer == null ? '' : String(b.answer);
      const timeMs = Math.max(0, parseInt(b.timeMs || '0', 10));

      if (!playerToken || isNaN(questionIdx)) {
        return res.status(400).json({ success: false, error: 'bad_request' });
      }

      const sq = await pool.query(
        `SELECT * FROM keoco_sessions WHERE qr_token=$1 OR short_code=$1 LIMIT 1`,
        [t]
      );
      if (sq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const s = sq.rows[0];
      if (s.status !== 'running') return res.status(400).json({ success: false, error: 'not_running' });
      if (s.current_index !== questionIdx) {
        return res.status(400).json({ success: false, error: 'wrong_index', message: 'Câu hỏi đã đổi.' });
      }

      const pq = await pool.query(
        `SELECT * FROM keoco_players WHERE session_id=$1 AND player_token=$2 LIMIT 1`,
        [s.id, playerToken]
      );
      if (pq.rowCount === 0) return res.status(404).json({ success: false, error: 'player_not_found' });
      const p = pq.rows[0];

      // Already answered this question?
      const dupe = await pool.query(
        `SELECT 1 FROM keoco_answers WHERE session_id=$1 AND player_id=$2 AND question_idx=$3 LIMIT 1`,
        [s.id, p.id, questionIdx]
      );
      if (dupe.rowCount) return res.status(409).json({ success: false, error: 'already_answered' });

      const qIds = Array.isArray(s.question_ids) ? s.question_ids
                  : (s.question_ids ? JSON.parse(s.question_ids) : []);
      const qid = qIds[questionIdx];
      const q = await getQuestionById(pool, qid);
      const correct = isCorrect(q, answer);

      // Scoring:
      //   correct: base +10; speed bonus +5 if <5s; streak +2 per consecutive (max +10); cap +25
      //   wrong:   -5
      let delta = 0;
      let scoreAdd = 0;
      let newStreak = p.streak;
      if (correct) {
        let pts = 10;
        if (timeMs > 0 && timeMs < 5000) pts += 5;
        newStreak = p.streak + 1;
        const sb = Math.min(newStreak * 2, 10);
        pts += sb;
        scoreAdd = pts;
        delta = p.team === 'blue' ? +pts : -pts;
      } else {
        scoreAdd = -5;
        newStreak = 0;
        delta = p.team === 'blue' ? -5 : +5; // wrong answer pulls toward opponent
      }

      // Apply rope position with clamp
      const ropeMax = s.rope_max;
      const newRope = Math.max(-ropeMax, Math.min(ropeMax, s.rope_position + delta));

      // Update player
      await pool.query(
        `UPDATE keoco_players
            SET score = score + $1,
                correct = correct + $2,
                wrong   = wrong   + $3,
                streak  = $4,
                last_seen_at = NOW()
          WHERE id=$5`,
        [scoreAdd, correct ? 1 : 0, correct ? 0 : 1, newStreak, p.id]
      );

      // Update session rope
      await pool.query(
        `UPDATE keoco_sessions SET rope_position=$1, updated_at=NOW() WHERE id=$2`,
        [newRope, s.id]
      );

      // Log answer
      const aid = newKcId('kca_');
      await pool.query(
        `INSERT INTO keoco_answers
          (id, session_id, player_id, question_idx, question_id, answer, correct, time_ms, delta, rope_after, team)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [aid, s.id, p.id, questionIdx, qid || null, answer.slice(0, 500), correct, timeMs, delta, newRope, p.team]
      );

      // If a side wins by reaching ropeMax, finish
      if (Math.abs(newRope) >= ropeMax) {
        const winner = newRope > 0 ? 'blue' : 'red';
        await pool.query(
          `UPDATE keoco_sessions SET status='finished', winner=$1, finished_at=NOW(), updated_at=NOW() WHERE id=$2`,
          [winner, s.id]
        );
      }

      return res.json({
        success: true,
        data: {
          correct,
          correctAnswer: q ? q.correctAnswer : null,
          scoreAdd,
          delta,
          ropePosition: newRope,
          newScore: p.score + scoreAdd,
          newStreak,
        },
      });
    } catch (err) {
      console.error('[keoco:answer] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // 1v1 CHALLENGE MODE — async
  // ════════════════════════════════════════════════

  // POST /api/keoco/challenges
  // body: { title?, subject?, grade?, difficulty?, topic?, questionCount?, timePerQuestion?, creatorName }
  // No auth required (creator can be anonymous), but if authenticated we record creator_id.
  app.post('/api/keoco/challenges', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const b = req.body || {};
      const creatorName = String(b.creatorName || '').trim().slice(0, 200);
      if (!creatorName) return res.status(400).json({ success: false, error: 'creator_name_required' });

      const title = String(b.title || `Thách đấu của ${creatorName}`).slice(0, 500);
      const subject = String(b.subject || 'Vật lý').slice(0, 100);
      const grade = String(b.grade || 'Khối 12').slice(0, 50);
      const difficulty = b.difficulty ? String(b.difficulty).slice(0, 20) : null;
      const topic = b.topic ? String(b.topic).slice(0, 200) : null;
      const questionCount = Math.min(Math.max(parseInt(b.questionCount || '10', 10), 3), 30);
      const timePerQuestion = Math.min(Math.max(parseInt(b.timePerQuestion || '15', 10), 5), 60);

      const picked = await pickQuestions(pool, { subject, grade, difficulty, topic, count: questionCount });
      const qIds = picked.map((q) => q.id);
      if (qIds.length === 0) {
        return res.status(400).json({ success: false, error: 'no_questions' });
      }

      const id = newKcId('kch_');
      const token = newKcToken();
      const user = getUserKc(req);

      await pool.query(
        `INSERT INTO keoco_challenges
           (id, title, subject, grade, difficulty, topic, question_count, question_ids,
            time_per_question, token, creator_id, creator_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id, title, subject, grade, difficulty, topic, qIds.length, JSON.stringify(qIds),
         timePerQuestion, token, user?.id || null, creatorName]
      );

      return res.status(201).json({
        success: true,
        data: {
          id, token, title, subject, grade, difficulty, topic,
          questionCount: qIds.length, timePerQuestion,
          challengeUrl: challengeUrlForKc(req, token),
          // Include the question set so the creator can play immediately
          questions: picked.map((q, idx) => publicQuestion(q, idx)),
        },
      });
    } catch (err) {
      console.error('[keoco:challenge-create] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/public/challenges/:token
  // Returns challenge metadata + creator score (if played) + opponent score (if played).
  // Includes the question set IF the caller hasn't played yet.
  app.get('/api/keoco/public/challenges/:token', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const t = req.params.token;
      const cq = await pool.query(`SELECT * FROM keoco_challenges WHERE token=$1 LIMIT 1`, [t]);
      if (cq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const c = cq.rows[0];

      const qIds = Array.isArray(c.question_ids) ? c.question_ids
                  : (c.question_ids ? JSON.parse(c.question_ids) : []);
      let questions = [];
      // Fetch question set so opponent can play; include sanitized form
      if (qIds.length) {
        const qs = await pool.query(
          `SELECT id, content, options, "correctAnswer", topic, difficulty
             FROM "Question" WHERE id = ANY($1::text[])`,
          [qIds]
        );
        // Re-order to match qIds
        const byId = new Map(qs.rows.map((r) => [r.id, r]));
        questions = qIds.map((id, idx) => publicQuestion(byId.get(id), idx)).filter(Boolean);
      }

      return res.json({
        success: true,
        data: {
          id: c.id,
          token: c.token,
          title: c.title,
          subject: c.subject,
          grade: c.grade,
          difficulty: c.difficulty,
          topic: c.topic,
          questionCount: c.question_count,
          timePerQuestion: c.time_per_question,
          creatorName: c.creator_name,
          creatorScore: c.creator_score,
          creatorCorrect: c.creator_correct,
          creatorTimeMs: c.creator_time_ms,
          creatorPlayedAt: c.creator_played_at ? new Date(c.creator_played_at).toISOString() : null,
          opponentName: c.opponent_name,
          opponentScore: c.opponent_score,
          opponentCorrect: c.opponent_correct,
          opponentTimeMs: c.opponent_time_ms,
          opponentPlayedAt: c.opponent_played_at ? new Date(c.opponent_played_at).toISOString() : null,
          winner: c.winner,
          questions,
        },
      });
    } catch (err) {
      console.error('[keoco:challenge-get] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/public/challenges/:token/submit
  // body: { role ('creator'|'opponent'), name?, answers: [{ questionId, answer, timeMs }] }
  // Grades all answers server-side, computes total score, records result.
  app.post('/api/keoco/public/challenges/:token/submit', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const t = req.params.token;
      const b = req.body || {};
      const role = b.role === 'creator' ? 'creator' : 'opponent';
      const name = String(b.name || '').trim().slice(0, 200);
      const answers = Array.isArray(b.answers) ? b.answers : [];

      const cq = await pool.query(`SELECT * FROM keoco_challenges WHERE token=$1 LIMIT 1`, [t]);
      if (cq.rowCount === 0) return res.status(404).json({ success: false, error: 'not_found' });
      const c = cq.rows[0];

      if (role === 'creator' && c.creator_played_at) {
        return res.status(409).json({ success: false, error: 'creator_already_played' });
      }
      if (role === 'opponent' && c.opponent_played_at) {
        return res.status(409).json({ success: false, error: 'opponent_already_played' });
      }
      if (role === 'opponent' && !c.creator_played_at) {
        return res.status(400).json({ success: false, error: 'creator_must_play_first' });
      }

      // Grade
      const qIds = Array.isArray(c.question_ids) ? c.question_ids
                  : (c.question_ids ? JSON.parse(c.question_ids) : []);
      const qs = await pool.query(
        `SELECT id, "correctAnswer" FROM "Question" WHERE id = ANY($1::text[])`,
        [qIds]
      );
      const byId = new Map(qs.rows.map((r) => [r.id, r]));

      let total = 0;
      let correctCount = 0;
      let totalTimeMs = 0;
      const results = [];
      for (let i = 0; i < qIds.length; i++) {
        const qid = qIds[i];
        const a = answers[i] || {};
        const q = byId.get(qid);
        const correct = isCorrect(q, a.answer);
        const tm = Math.max(0, parseInt(a.timeMs || '0', 10));
        totalTimeMs += tm;
        let pts = 0;
        if (correct) {
          pts = 10;
          if (tm > 0 && tm < 5000) pts += 5;
          correctCount++;
        }
        total += pts;
        results.push({ questionId: qid, correct, points: pts });
      }

      // Persist
      let winner = c.winner;
      if (role === 'creator') {
        await pool.query(
          `UPDATE keoco_challenges
              SET creator_score=$1, creator_correct=$2, creator_time_ms=$3, creator_played_at=NOW(),
                  creator_name = COALESCE(NULLIF($4,''), creator_name)
            WHERE id=$5`,
          [total, correctCount, totalTimeMs, name, c.id]
        );
      } else {
        // Opponent — also decide winner
        if (!name) return res.status(400).json({ success: false, error: 'opponent_name_required' });
        const cs = c.creator_score == null ? 0 : c.creator_score;
        if (total > cs) winner = 'opponent';
        else if (total < cs) winner = 'creator';
        else {
          // tie → faster wins
          const ct = c.creator_time_ms == null ? Number.MAX_SAFE_INTEGER : c.creator_time_ms;
          winner = totalTimeMs <= ct ? 'opponent' : 'creator';
        }
        await pool.query(
          `UPDATE keoco_challenges
              SET opponent_score=$1, opponent_correct=$2, opponent_time_ms=$3, opponent_played_at=NOW(),
                  opponent_name=$4, winner=$5
            WHERE id=$6`,
          [total, correctCount, totalTimeMs, name, winner, c.id]
        );
      }

      return res.json({
        success: true,
        data: {
          role,
          score: total,
          correct: correctCount,
          totalQuestions: qIds.length,
          totalTimeMs,
          winner,
          opponentScore: role === 'opponent' ? (c.creator_score ?? 0) : null,
          results,
        },
      });
    } catch (err) {
      console.error('[keoco:challenge-submit] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ════════════════════════════════════════════════
  // LIVE 1v1 MATCH MODE — synchronous; both players scan QR, first one waits.
  // Computer screen acts as scoreboard (who's leading, progress, scores).
  // Stored in-memory only (ephemeral, short matches).
  // ════════════════════════════════════════════════

  /** @type {Map<string, any>} token → LiveMatch */
  const kcLives = new Map();

  function liveUrlForKc(req, token) {
    if (!token) return null;
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${proto}://${host}/kl/${token}`;
  }

  // Garbage-collect old finished matches every 10 min
  setInterval(() => {
    const now = Date.now();
    for (const [tok, m] of kcLives.entries()) {
      const age = now - (m.updatedAt || m.createdAt || now);
      if ((m.status === 'finished' && age > 30 * 60 * 1000) || age > 6 * 60 * 60 * 1000) {
        kcLives.delete(tok);
      }
    }
  }, 10 * 60 * 1000).unref?.();

  function liveMatchToTeacher(m, req) {
    const players = m.players.map((p) => ({
      token: p.token,
      name: p.name,
      slot: p.slot,
      score: p.score,
      correct: p.correct,
      wrong: p.wrong,
      streak: p.streak,
      joinedAt: p.joinedAt,
      hasAnswered: p.currentAnswer != null,
    }));
    let leader = null;
    if (players.length === 2) {
      if (players[0].score > players[1].score) leader = players[0].slot;
      else if (players[1].score > players[0].score) leader = players[1].slot;
      else leader = 'tie';
    }
    let currentQuestion = null;
    if (m.status === 'running' && m.currentIndex >= 0 && m.questions[m.currentIndex]) {
      currentQuestion = publicQuestion(m.questions[m.currentIndex], m.currentIndex);
    }
    return {
      id: m.id,
      token: m.token,
      title: m.title,
      subject: m.subject,
      grade: m.grade,
      difficulty: m.difficulty,
      topic: m.topic,
      questionCount: m.questionCount,
      timePerQuestion: m.timePerQuestion,
      teacherId: m.teacherId,
      status: m.status,
      currentIndex: m.currentIndex,
      currentStartedAt: m.currentStartedAt ? new Date(m.currentStartedAt).toISOString() : null,
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
      updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : null,
      finishedAt: m.finishedAt ? new Date(m.finishedAt).toISOString() : null,
      winner: m.winner,
      leader,
      players,
      currentQuestion,
      scanUrl: liveUrlForKc(req, m.token),
    };
  }

  function liveMatchToPlayer(m, playerToken) {
    const me = m.players.find((p) => p.token === playerToken) || null;
    const opponent = m.players.find((p) => p.token !== playerToken) || null;
    const sanitize = (p) => p && {
      name: p.name,
      slot: p.slot,
      score: p.score,
      correct: p.correct,
      wrong: p.wrong,
      streak: p.streak,
      hasAnswered: p.currentAnswer != null,
    };
    let currentQuestion = null;
    if (m.status === 'running' && m.currentIndex >= 0 && m.questions[m.currentIndex]) {
      currentQuestion = publicQuestion(m.questions[m.currentIndex], m.currentIndex);
    }
    return {
      session: {
        id: m.id,
        token: m.token,
        title: m.title,
        subject: m.subject,
        grade: m.grade,
        questionCount: m.questionCount,
        timePerQuestion: m.timePerQuestion,
        status: m.status,
        currentIndex: m.currentIndex,
        currentStartedAt: m.currentStartedAt ? new Date(m.currentStartedAt).toISOString() : null,
        winner: m.winner,
        playerCount: m.players.length,
        slotsTaken: m.players.map((p) => p.slot),
      },
      me: sanitize(me),
      opponent: sanitize(opponent),
      currentQuestion,
      alreadyAnswered: !!(me && me.currentAnswer != null),
    };
  }

  // Advance the question pointer when both players have answered OR the timer expired.
  function maybeAdvanceLive(m) {
    if (m.status !== 'running') return;
    if (m.currentIndex < 0) return;
    if (m.players.length < 2) return;
    const bothAnswered = m.players.every((p) => p.currentAnswer != null);
    const expired = m.currentStartedAt && (Date.now() - m.currentStartedAt) > (m.timePerQuestion * 1000 + 500);
    if (!bothAnswered && !expired) return;

    // Reset per-question state
    for (const p of m.players) p.currentAnswer = null;

    const nextIdx = m.currentIndex + 1;
    if (nextIdx >= m.questionCount) {
      // Game over
      m.status = 'finished';
      m.finishedAt = Date.now();
      // Determine winner
      if (m.players.length === 2) {
        const [a, b] = m.players;
        if (a.score > b.score) m.winner = a.slot;
        else if (b.score > a.score) m.winner = b.slot;
        else m.winner = 'tie';
      }
    } else {
      m.currentIndex = nextIdx;
      m.currentStartedAt = Date.now();
    }
    m.updatedAt = Date.now();
  }

  // Periodic timer-driven advancement (in case nobody answers)
  setInterval(() => {
    for (const m of kcLives.values()) {
      if (m.status === 'running') maybeAdvanceLive(m);
    }
  }, 1000).unref?.();

  // POST /api/keoco/lives  (teacher creates a live 1v1 match)
  app.post('/api/keoco/lives', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      await ensureKcReady();
      const pool = getKcPool();

      const b = req.body || {};
      const title = String(b.title || 'Đối kháng Kéo Co').slice(0, 500);
      const subject = String(b.subject || 'Vật lý').slice(0, 100);
      const grade = String(b.grade || 'Khối 12').slice(0, 50);
      const difficulty = b.difficulty ? String(b.difficulty).slice(0, 20) : null;
      const topic = b.topic ? String(b.topic).slice(0, 200) : null;
      const questionCount = Math.min(Math.max(parseInt(b.questionCount || '8', 10), 3), 30);
      const timePerQuestion = Math.min(Math.max(parseInt(b.timePerQuestion || '20', 10), 5), 120);

      const picked = await pickQuestions(pool, { subject, grade, difficulty, topic, count: questionCount });
      if (picked.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'no_questions',
          message: 'Không tìm thấy câu hỏi nào trong ngân hàng đề khớp với tiêu chí.',
        });
      }

      const id = newKcId('kcl_');
      const token = newKcToken();
      const now = Date.now();
      const match = {
        id,
        token,
        title,
        subject,
        grade,
        difficulty,
        topic,
        questionCount: picked.length,
        timePerQuestion,
        teacherId: user.id,
        questionIds: picked.map((q) => q.id),
        questions: picked,
        status: 'waiting',  // waiting → running → finished
        currentIndex: -1,
        currentStartedAt: null,
        players: [],
        createdAt: now,
        updatedAt: now,
        finishedAt: null,
        winner: null,
      };
      kcLives.set(token, match);
      return res.status(201).json({ success: true, data: liveMatchToTeacher(match, req) });
    } catch (err) {
      console.error('[keoco:live-create] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/lives  (teacher lists their active live matches)
  app.get('/api/keoco/lives', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      const out = [];
      for (const m of kcLives.values()) {
        if (m.teacherId === user.id) out.push(liveMatchToTeacher(m, req));
      }
      out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return res.json({ success: true, data: out });
    } catch (err) {
      console.error('[keoco:live-list] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/lives/:token  (teacher view — full scoreboard state)
  app.get('/api/keoco/lives/:token', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      const m = kcLives.get(req.params.token);
      if (!m) return res.status(404).json({ success: false, error: 'not_found' });
      if (m.teacherId !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });
      // tick advancement on view
      maybeAdvanceLive(m);
      return res.json({ success: true, data: liveMatchToTeacher(m, req) });
    } catch (err) {
      console.error('[keoco:live-get] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // DELETE /api/keoco/lives/:token  (teacher removes a match)
  app.delete('/api/keoco/lives/:token', async (req, res) => {
    try {
      const user = getUserKc(req);
      if (!user) return res.status(401).json({ success: false, error: 'unauthorized' });
      const m = kcLives.get(req.params.token);
      if (!m) return res.status(404).json({ success: false, error: 'not_found' });
      if (m.teacherId !== user.id) return res.status(403).json({ success: false, error: 'forbidden' });
      kcLives.delete(req.params.token);
      return res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      console.error('[keoco:live-delete] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/public/lives/:token  (lobby info — no auth)
  app.get('/api/keoco/public/lives/:token', async (req, res) => {
    try {
      const m = kcLives.get(req.params.token);
      if (!m) return res.status(404).json({ success: false, error: 'not_found' });
      return res.json({
        success: true,
        data: {
          id: m.id,
          token: m.token,
          title: m.title,
          subject: m.subject,
          grade: m.grade,
          questionCount: m.questionCount,
          timePerQuestion: m.timePerQuestion,
          status: m.status,
          playerCount: m.players.length,
          slotsTaken: m.players.map((p) => p.slot),
          slotsAvailable: ['red', 'blue'].filter((s) => !m.players.some((p) => p.slot === s)),
          full: m.players.length >= 2,
        },
      });
    } catch (err) {
      console.error('[keoco:live-public-lobby] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/public/lives/:token/join  body: { name, slot? }
  app.post('/api/keoco/public/lives/:token/join', async (req, res) => {
    try {
      const m = kcLives.get(req.params.token);
      if (!m) return res.status(404).json({ success: false, error: 'not_found' });
      if (m.status === 'finished') return res.status(400).json({ success: false, error: 'finished' });
      if (m.players.length >= 2) {
        return res.status(409).json({ success: false, error: 'full', message: 'Trận đấu đã đủ 2 người chơi.' });
      }
      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 200);
      if (!name) return res.status(400).json({ success: false, error: 'name_required' });

      // Slot assignment: prefer requested slot if free, otherwise auto
      const taken = new Set(m.players.map((p) => p.slot));
      let slot = (b.slot === 'red' || b.slot === 'blue') ? b.slot : null;
      if (!slot || taken.has(slot)) {
        slot = !taken.has('red') ? 'red' : 'blue';
      }

      const playerToken = newKcToken();
      const player = {
        token: playerToken,
        name,
        slot,
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        currentAnswer: null,
        joinedAt: new Date().toISOString(),
      };
      m.players.push(player);
      m.updatedAt = Date.now();

      // Auto-start when 2nd player joins
      if (m.players.length === 2 && m.status === 'waiting') {
        m.status = 'running';
        m.currentIndex = 0;
        m.currentStartedAt = Date.now();
      }

      return res.json({
        success: true,
        data: {
          playerToken,
          player: { name, slot },
          waiting: m.status === 'waiting',
        },
      });
    } catch (err) {
      console.error('[keoco:live-public-join] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/public/lives/:token/state?playerToken=...
  app.get('/api/keoco/public/lives/:token/state', async (req, res) => {
    try {
      const m = kcLives.get(req.params.token);
      if (!m) return res.status(404).json({ success: false, error: 'not_found' });
      maybeAdvanceLive(m);
      const playerToken = String(req.query.playerToken || '');
      return res.json({ success: true, data: liveMatchToPlayer(m, playerToken) });
    } catch (err) {
      console.error('[keoco:live-public-state] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // POST /api/keoco/public/lives/:token/answer  body: { playerToken, questionIdx, answer, timeMs }
  app.post('/api/keoco/public/lives/:token/answer', async (req, res) => {
    try {
      const m = kcLives.get(req.params.token);
      if (!m) return res.status(404).json({ success: false, error: 'not_found' });
      if (m.status !== 'running') return res.status(400).json({ success: false, error: 'not_running' });

      const b = req.body || {};
      const playerToken = String(b.playerToken || '');
      const questionIdx = parseInt(b.questionIdx, 10);
      const answer = String(b.answer || '').trim();
      const timeMs = Math.max(0, parseInt(b.timeMs || '0', 10));

      const player = m.players.find((p) => p.token === playerToken);
      if (!player) return res.status(403).json({ success: false, error: 'not_a_player' });
      if (questionIdx !== m.currentIndex) {
        return res.status(409).json({ success: false, error: 'wrong_question_idx' });
      }
      if (player.currentAnswer != null) {
        return res.status(409).json({ success: false, error: 'already_answered' });
      }

      const q = m.questions[questionIdx];
      const correct = isCorrect(q, answer);
      let pts = 0;
      if (correct) {
        pts = 10;
        // Speed bonus: < 5s gives +5, < 10s gives +2
        if (timeMs > 0 && timeMs < 5000) pts += 5;
        else if (timeMs > 0 && timeMs < 10000) pts += 2;
        // Streak bonus
        player.streak += 1;
        if (player.streak >= 3) pts += 3;
        player.correct += 1;
      } else {
        player.streak = 0;
        player.wrong += 1;
      }
      player.score += pts;
      player.currentAnswer = answer;
      m.updatedAt = Date.now();

      // If both have answered, advance immediately
      maybeAdvanceLive(m);

      return res.json({
        success: true,
        data: {
          correct,
          correctAnswer: q ? q.correctAnswer : null,
          pointsEarned: pts,
          newScore: player.score,
          newStreak: player.streak,
          opponentAnswered: m.players.some((p) => p.token !== playerToken && p.currentAnswer != null),
        },
      });
    } catch (err) {
      console.error('[keoco:live-public-answer] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // GET /api/keoco/challenges/leaderboard  (top 50 finished challenges by score)
  app.get('/api/keoco/challenges/leaderboard', async (req, res) => {
    try {
      await ensureKcReady();
      const pool = getKcPool();
      const q = await pool.query(
        `SELECT token, title, creator_name, creator_score, opponent_name, opponent_score, winner, created_at
           FROM keoco_challenges
          WHERE creator_played_at IS NOT NULL
          ORDER BY GREATEST(COALESCE(creator_score,0), COALESCE(opponent_score,0)) DESC, created_at DESC
          LIMIT 50`
      );
      return res.json({
        success: true,
        data: q.rows.map((r) => ({
          token: r.token,
          title: r.title,
          creatorName: r.creator_name,
          creatorScore: r.creator_score,
          opponentName: r.opponent_name,
          opponentScore: r.opponent_score,
          winner: r.winner,
          createdAt: r.created_at,
        })),
      });
    } catch (err) {
      console.error('[keoco:leaderboard] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// BUILT-IN EXAM MATRICES — không cần pixiai-media Cloud Run cho CRUD cơ bản
// Handles list/get/create/update/delete/duplicate. Endpoints AI phức tạp
// (digitize, generate-from-matrix) trả 501 cho phiên bản này.
// ══════════════════════════════════════════════════════════════
{
  const { Pool: MPool } = require('pg');
  const mjwt = require('jsonwebtoken');
  const { randomUUID: matrixUUID } = require('crypto');

  let _mpool = null;
  function getMPool() {
    if (!_mpool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _mpool = new MPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _mpool;
  }
  const MJWT_SECRET = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  function getMatrixUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      // ignoreExpiration: chấp nhận token sắp hết hạn (interceptor sẽ refresh
      // trong background). Tránh reject false → 401 spam khi user vào trang
      // ngay sau khi token vừa expire.
      const decoded = mjwt.verify(auth.slice(7), MJWT_SECRET, { ignoreExpiration: true });
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }

  // Lazy migration: ExamMatrix gốc (Prisma) không có cột description.
  // UI mới lưu metadata (sections/topics/schoolYear/notes) vào JSON ở cột này.
  // Tự ALTER ADD COLUMN IF NOT EXISTS lần đầu gọi.
  let _matrixDescReady = false;
  async function ensureMatrixDescription() {
    if (_matrixDescReady) return;
    try {
      await getMPool().query(`ALTER TABLE "ExamMatrix" ADD COLUMN IF NOT EXISTS description TEXT`);
      _matrixDescReady = true;
    } catch (e) {
      console.warn('[matrix] ALTER description:', e.message);
    }
  }

  // GET /api/exam-matrices?subject=&grade=&status=
  app.get('/api/exam-matrices', async (req, res) => {
    try {
      const userId = getMatrixUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureMatrixDescription();
      const wheres = [`"userId" = $1`];
      const vals = [userId];
      let i = 2;
      if (req.query.subject) { wheres.push(`subject = $${i++}`); vals.push(String(req.query.subject)); }
      if (req.query.grade)   { wheres.push(`grade = $${i++}`);   vals.push(String(req.query.grade)); }
      if (req.query.status)  { wheres.push(`status = $${i++}`);  vals.push(String(req.query.status)); }
      const { rows } = await getMPool().query(
        `SELECT * FROM "ExamMatrix" WHERE ${wheres.join(' AND ')} ORDER BY "createdAt" DESC`,
        vals
      );
      return res.json({ matrices: rows });
    } catch (err) {
      console.error('[matrix:list] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/exam-matrices/:id
  // Parse description JSON back → {description, schoolYear, sections, topics}
  // (lưu ở POST). Nếu description không phải JSON, giữ string thuần.
  app.get('/api/exam-matrices/:id', async (req, res) => {
    try {
      const userId = getMatrixUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureMatrixDescription();
      const { rows } = await getMPool().query(
        `SELECT * FROM "ExamMatrix" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy' });
      const row = rows[0];
      let meta = {};
      if (row.description && typeof row.description === 'string') {
        try {
          const parsed = JSON.parse(row.description);
          if (parsed && typeof parsed === 'object') meta = parsed;
        } catch { meta = { description: row.description }; }
      }
      return res.json({ ...row, ...meta });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/exam-matrices → tạo manual
  // Body: {name, subject, grade, examType, duration, totalScore, totalQuestions,
  //        type, schoolYear?, description?, sections?, topics?}
  // sections + topics + description gói chung vào ExamMatrix.description (JSON)
  // để không cần migrate schema (Prisma quản lý).
  app.post('/api/exam-matrices', async (req, res) => {
    try {
      const userId = getMatrixUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const {
        name, subject, grade, examType, duration,
        totalScore, totalQuestions, type,
        schoolYear, description, sections, topics,
      } = req.body || {};
      if (!name || !grade || !examType || !duration) {
        return res.status(400).json({ error: 'name + grade + examType + duration required' });
      }
      // Pack metadata vào description JSON
      const meta = {
        description: description || '',
        schoolYear: schoolYear || null,
        sections: Array.isArray(sections) ? sections : [],
        topics: Array.isArray(topics) ? topics : [],
      };
      const id = matrixUUID();
      const now = new Date();
      const { rows } = await getMPool().query(
        `INSERT INTO "ExamMatrix"
          (id, name, subject, grade, "examType", duration, "totalScore",
           "totalQuestions", type, status, "userId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Hoạt động',$10,$11,$11)
         RETURNING *`,
        [id, String(name).slice(0, 200), subject || null, String(grade), String(examType),
         Number(duration) || 45, Number(totalScore) || 10,
         Number(totalQuestions) || 0, type || 'manual', userId, now]
      );
      // Đảm bảo column description tồn tại (idempotent ALTER) rồi update metadata
      await ensureMatrixDescription();
      await getMPool().query(
        `UPDATE "ExamMatrix" SET description=$1 WHERE id=$2`,
        [JSON.stringify(meta), id]
      );
      console.log(`[matrix:create] ✅ ${id} user=${userId} sections=${meta.sections.length} topics=${meta.topics.length}`);
      return res.status(201).json({ ...rows[0], ...meta, id });
    } catch (err) {
      console.error('[matrix:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/exam-matrices/:id
  // Accept: name, subject, grade, examType, duration, totalScore, totalQuestions,
  //         status, type, sections[], topics[], schoolYear, description.
  // sections + topics + schoolYear + description gói vào ExamMatrix.description
  // JSON (giống POST), không cần migrate Prisma schema.
  app.put('/api/exam-matrices/:id', async (req, res) => {
    try {
      const userId = getMatrixUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureMatrixDescription();
      const pool = getMPool();
      const body = req.body || {};

      // Load current row để merge metadata cũ + mới
      const cur = await pool.query(
        `SELECT description FROM "ExamMatrix" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!cur.rows[0]) return res.status(404).json({ error: 'Không tìm thấy' });
      let currentMeta = {};
      try { currentMeta = JSON.parse(cur.rows[0].description || '{}'); } catch {}

      // Build dynamic UPDATE cho columns thật
      const allowed = ['name','subject','grade','examType','duration','totalScore','totalQuestions','status','type'];
      const sets = []; const vals = [req.params.id, userId]; let idx = 3;
      for (const k of allowed) {
        if (body[k] !== undefined) {
          sets.push(`"${k}" = $${idx++}`);
          vals.push(typeof body[k] === 'number' ? body[k] : String(body[k]));
        }
      }

      // Merge metadata (sections/topics/schoolYear/description text)
      const META_KEYS = ['sections', 'topics', 'schoolYear', 'description'];
      let metaChanged = false;
      const newMeta = { ...currentMeta };
      for (const k of META_KEYS) {
        if (body[k] !== undefined) { newMeta[k] = body[k]; metaChanged = true; }
      }
      if (metaChanged) {
        sets.push(`description = $${idx++}`);
        vals.push(JSON.stringify(newMeta));
      }

      if (!sets.length) return res.status(400).json({ error: 'Không có field nào để update' });
      sets.push(`"updatedAt" = $${idx++}`); vals.push(new Date());

      const { rowCount } = await pool.query(
        `UPDATE "ExamMatrix" SET ${sets.join(', ')} WHERE id=$1 AND "userId"=$2`, vals
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      console.log(`[matrix:update] ✅ ${req.params.id.slice(0,8)} fields=${allowed.filter(k => body[k] !== undefined).length} meta=${metaChanged}`);
      return res.json({ ok: true });
    } catch (err) {
      console.error('[matrix:update] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/exam-matrices/:id
  app.delete('/api/exam-matrices/:id', async (req, res) => {
    try {
      const userId = getMatrixUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { rowCount } = await getMPool().query(
        `DELETE FROM "ExamMatrix" WHERE id=$1 AND "userId"=$2`,
        [req.params.id, userId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/exam-matrices/:id/duplicate
  app.post('/api/exam-matrices/:id/duplicate', async (req, res) => {
    try {
      const userId = getMatrixUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getMPool();
      const { rows } = await pool.query(
        `SELECT * FROM "ExamMatrix" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy' });
      const src = rows[0];
      const newId = matrixUUID();
      const now = new Date();
      const { rows: created } = await pool.query(
        `INSERT INTO "ExamMatrix"
          (id, name, subject, grade, "examType", duration, "totalScore",
           "totalQuestions", type, status, "userId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Hàng đợi',$10,$11,$11)
         RETURNING *`,
        [newId, `${src.name} (Bản sao)`, src.subject, src.grade, src.examType,
         src.duration, src.totalScore, src.totalQuestions, src.type, userId, now]
      );
      console.log(`[matrix:duplicate] ✅ ${src.id} → ${newId}`);
      return res.status(201).json(created[0]);
    } catch (err) {
      console.error('[matrix:duplicate] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Endpoints AI phức tạp — chưa implement cho phiên bản này
  app.post('/api/exam-matrices/digitize', (_req, res) => {
    res.status(501).json({ error: 'Số hoá ma trận từ ảnh chưa khả dụng — dùng "Tạo mới" thủ công' });
  });
}

// Stub specific endpoints TRƯỚC proxy /api/documents — express thứ tự matter.
app.get('/api/documents', (_req, res) => res.json({ documents: [] }));
app.post('/api/documents/upload', (_req, res) => res.status(501).json({ error: 'Upload tài liệu đang phát triển' }));
app.post('/api/documents/fix-status', (_req, res) => res.json({ ok: true }));

// ── media-service routes (only if MEDIA_SERVICE_URL is external) ──
// /api/exam-matrices đã được merge built-in ở trên — bỏ proxy.
app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/media'));
app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/documents'));
if (!USE_NODEJS_QUESTIONS) {
  app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/questions'));
  app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/question-bank'));
}
// /api/exams* (catch-all built-in) — list + detail cho học sinh + teacher.
// Hai endpoint:
//   GET  /api/exams           → list, filter theo bearer token (own + public)
//   GET  /api/exams/:id       → detail + questions (chỉ public, hoặc của owner)
{
  const { Pool: PXPool } = require('pg');
  const xjwt = require('jsonwebtoken');
  let _xpool = null;
  function getXPool() {
    if (!_xpool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) return null;
      _xpool = new PXPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _xpool;
  }
  const XJWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';
  function getXUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const decoded = xjwt.verify(auth.slice(7), XJWT_SECRET, { ignoreExpiration: true });
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }
  function parseMeta(description) {
    if (!description) return {};
    try {
      const p = JSON.parse(description);
      return { subject: p.subject || null, grade: p.grade || null,
        notes: p.notes || null, isPublic: !!p.public,
        publishedAt: p.publishedAt || null,
        examMode: p.examMode || null,
        sectionCounts: p.sectionCounts || null,
        latexProjectId: p.latexProjectId || null };
    } catch { return { notes: description }; }
  }
  function mapRow(row) {
    const m = parseMeta(row.description);
    return {
      id: row.id, title: row.title,
      subject: m.subject, grade: m.grade, notes: m.notes,
      isPublic: m.isPublic, publishedAt: m.publishedAt,
      examType: row.examType, duration: row.duration,
      totalScore: parseFloat(row.totalScore) || 10,
      totalQuestions: row.totalQuestions, status: row.status,
      matrixId: row.matrixId || null, userId: row.userId,
      examMode: m.examMode || null,
      sectionCounts: m.sectionCounts || null,
      pdfUrl: m.examMode === 'pdf-only' ? `/api/exams/${row.id}/pdf` : null,
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    };
  }

  app.get('/api/exams', async (req, res) => {
    try {
      const xpool = getXPool();
      if (!xpool) return res.json({ exams: [] });
      const userId = getXUserId(req);
      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const q = userId
        ? `SELECT * FROM "Exam"
           WHERE "userId" = $1 OR (status = 'Đang diễn ra' AND description LIKE '%"public":true%')
           ORDER BY "createdAt" DESC LIMIT $2`
        : `SELECT * FROM "Exam"
           WHERE status = 'Đang diễn ra' AND description LIKE '%"public":true%'
           ORDER BY "createdAt" DESC LIMIT $1`;
      const params = userId ? [userId, limit] : [limit];
      const { rows } = await xpool.query(q, params);
      return res.json({ exams: rows.map(mapRow) });
    } catch (err) {
      console.error('[exams:list] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/exams/:id/grade — chấm bài exam-sheet (Bộ-style)
  // Body: { answers: { questionId: 'A'|'B'|'TFFT'|'0.4'|... } }
  // Logic:
  //   - Mặc định: load Question.correctAnswer cho từng câu, so sánh, tính %.
  //   - Nếu exam có description.examMode='pdf-only': dùng answerKey trong
  //     description thay vì Question table (PDF-only mode, không có Question).
  app.post('/api/exams/:id/grade', async (req, res) => {
    try {
      const xpool = getXPool();
      if (!xpool) return res.status(503).json({ error: 'DB not available' });
      const userAnswers = req.body?.answers || {};
      const examId = req.params.id;

      // Check exam mode trước
      const { rows: examRows } = await xpool.query(
        `SELECT description FROM "Exam" WHERE id = $1 LIMIT 1`, [examId]
      );
      const examDesc = (() => {
        try { return JSON.parse(examRows[0]?.description || '{}'); } catch { return {}; }
      })();

      // ── PDF-only mode: chấm bằng answerKey trong description ─────
      if (examDesc.examMode === 'pdf-only' && examDesc.answerKey) {
        const ak = examDesc.answerKey;
        const normLetter = (s) => {
          const t = String(s ?? '').trim().toUpperCase();
          if (/^[A-D]$/.test(t)) return t;
          const m = t.match(/^([A-D])[\.\)\s]/);
          if (m) return m[1];
          return '';
        };
        const normNum = (s) => {
          const t = String(s ?? '').trim().replace(/,/g, '.').replace(/\s+/g, '');
          if (t === '' || isNaN(Number(t))) return t.toLowerCase();
          return String(Number(t));
        };
        let correctCount = 0;
        let totalCount = 0;
        // PHẦN I
        const phanI = String(ak.phanI || '');
        for (let i = 0; i < phanI.length; i++) {
          totalCount++;
          const ua = userAnswers[`phanI-${i + 1}`];
          if (normLetter(ua) === phanI[i].toUpperCase()) correctCount++;
        }
        // PHẦN II — TFFT 4 ký tự, 1 câu = 4 sub-statements
        const phanII = Array.isArray(ak.phanII) ? ak.phanII : [];
        for (let i = 0; i < phanII.length; i++) {
          totalCount++;
          const ua = String(userAnswers[`phanII-${i + 1}`] || '').padEnd(4, '-').slice(0, 4).toUpperCase();
          const ca = String(phanII[i] || '').padEnd(4, '-').slice(0, 4).toUpperCase();
          let sub = 0;
          for (let k = 0; k < 4; k++) if (ua[k] !== '-' && ua[k] === ca[k]) sub++;
          if (sub === 4) correctCount += 1;
          else if (sub >= 3) correctCount += 0.5;
        }
        // PHẦN III
        const phanIII = Array.isArray(ak.phanIII) ? ak.phanIII : [];
        for (let i = 0; i < phanIII.length; i++) {
          totalCount++;
          const ua = userAnswers[`phanIII-${i + 1}`];
          if (normNum(ua) === normNum(phanIII[i])) correctCount++;
        }
        // PHẦN IV — Tự luận: AI chấm bằng rubric, trả về score + feedback/câu
        // Weighted: maxScore của mỗi câu cộng vào totalPointsIV; aiScore vào earnedIV.
        const phanIV = Array.isArray(ak.phanIV) ? ak.phanIV : [];
        const phanIVResults = [];
        let phanIVMax = 0, phanIVEarned = 0;
        if (phanIV.length > 0) {
          const { complete } = require('./lib/fal-client.cjs');
          for (let i = 0; i < phanIV.length; i++) {
            const { rubric, maxScore } = phanIV[i];
            const ms = Math.max(0.5, Math.min(10, Number(maxScore) || 1));
            phanIVMax += ms;
            const ua = String(userAnswers[`phanIV-${i + 1}`] || '').trim();
            if (!ua) {
              phanIVResults.push({ index: i + 1, score: 0, maxScore: ms, feedback: 'HS bỏ trống câu này.' });
              continue;
            }
            const aiPrompt = [
              `Bạn là giáo viên chấm bài tự luận môn ${examDesc.subject || 'Vật lí'} lớp ${examDesc.grade || '11'}.`,
              ``,
              `--- TIÊU CHÍ CHẤM (RUBRIC) CỦA GIÁO VIÊN — ĐIỂM TỐI ĐA ${ms}đ ---`,
              rubric,
              `--- HẾT RUBRIC ---`,
              ``,
              `--- BÀI LÀM CỦA HỌC SINH ---`,
              ua,
              `--- HẾT BÀI LÀM ---`,
              ``,
              `Hãy chấm điểm bài làm theo rubric trên. Yêu cầu output CHỈ JSON:`,
              `{ "score": <số thực 0 đến ${ms}>, "feedback": "<nhận xét 1-3 câu, nêu rõ làm đúng/sai gì>" }`,
              `KHÔNG markdown, KHÔNG giải thích thêm. Chỉ JSON.`,
            ].join('\n');
            try {
              const resp = await complete({
                system: 'Bạn là trợ lý chấm bài chính xác. CHỈ trả JSON đúng định dạng yêu cầu.',
                messages: [{ role: 'user', content: aiPrompt }],
              });
              const raw = String(resp.content || '').trim();
              // Trích JSON từ output (loại bỏ markdown fences nếu có)
              const jsonMatch = raw.match(/\{[\s\S]*\}/);
              if (!jsonMatch) throw new Error('AI output không có JSON');
              const parsed = JSON.parse(jsonMatch[0]);
              const aiScore = Math.max(0, Math.min(ms, Number(parsed.score) || 0));
              const feedback = String(parsed.feedback || '').slice(0, 500);
              phanIVEarned += aiScore;
              phanIVResults.push({ index: i + 1, score: aiScore, maxScore: ms, feedback });
            } catch (aiErr) {
              console.warn(`[exam:grade:phanIV-${i+1}] AI fail:`, aiErr.message.slice(0, 200));
              phanIVResults.push({
                index: i + 1, score: 0, maxScore: ms,
                feedback: 'Không thể chấm tự động — vui lòng nhờ giáo viên chấm tay.',
                error: 'ai_unavailable',
              });
            }
          }
        }
        // Tổng hợp: PHẦN I/II/III tính theo CÂU (mỗi câu 1 unit), PHẦN IV tính theo ĐIỂM
        // Để chuẩn hoá: nếu có phanIV, weighted theo tổng (mỗi câu PI/II/III = maxScoreUnit điểm)
        const phanIVCount = phanIV.length;
        totalCount += phanIVCount; // include in count for display
        // Score thang 10:
        const otherTotal = (ak.phanI?.length || 0) + (Array.isArray(ak.phanII) ? ak.phanII.length : 0) + (Array.isArray(ak.phanIII) ? ak.phanIII.length : 0);
        // Coi mỗi câu PI/II/III = 1 đơn vị; PHẦN IV cộng thêm điểm thực.
        // Chuẩn hoá final score = (correctCount + phanIVEarned/phanIVMax * otherTotal) / (otherTotal + ?) — phức tạp.
        // Đơn giản: percentage = (correctCount/otherTotal + phanIVEarned/phanIVMax) / 2 nếu có cả 2.
        let percentage;
        if (otherTotal > 0 && phanIVMax > 0) {
          // Weighted 50/50 giữa MCQ và Tự luận
          const mcqPct = correctCount / otherTotal;
          const essayPct = phanIVEarned / phanIVMax;
          percentage = ((mcqPct + essayPct) / 2) * 100;
        } else if (otherTotal > 0) {
          percentage = (correctCount / otherTotal) * 100;
        } else if (phanIVMax > 0) {
          percentage = (phanIVEarned / phanIVMax) * 100;
        } else {
          percentage = 0;
        }
        const score = Math.round(percentage) / 10;
        console.log(`[exam:grade:pdf-only] ✅ exam=${examId.slice(0,8)} I/II/III=${correctCount}/${otherTotal}, IV=${phanIVEarned.toFixed(1)}/${phanIVMax} → ${Math.round(percentage)}%`);
        return res.json({
          correct: Math.round(correctCount * 10) / 10,
          total: totalCount,
          percentage,
          score,
          mode: 'pdf-only',
          phanIV: phanIVResults,        // cho FE hiển thị feedback từng câu tự luận
          phanIVMax,
          phanIVEarned: Math.round(phanIVEarned * 10) / 10,
        });
      }

      // ── Mode mặc định: load Question table ─────
      // Lấy questions của exam (correctAnswer + options + points cho weighted grade)
      const { rows: qs } = await xpool.query(
        `SELECT q.id, q."questionType", q."correctAnswer", q.options, eq.points
           FROM "ExamQuestion" eq
           JOIN "Question" q ON q.id = eq."questionId"
          WHERE eq."examId" = $1 ORDER BY eq."order" ASC`,
        [examId]
      );
      if (qs.length === 0) return res.status(404).json({ error: 'Đề không có câu hỏi' });

      const norm = (s) => {
        s = String(s ?? '').trim();
        if (!s) return '';
        if (/^[A-Z]$/i.test(s)) return s.toUpperCase();
        const m = s.match(/^([A-Z])[\.\)\s]/i);
        if (m) return m[1].toUpperCase();
        const numStr = s.replace(/,/g, '.').replace(/\s+/g, '');
        if (numStr !== '' && !isNaN(Number(numStr))) return String(Number(numStr));
        return s.toLowerCase();
      };
      // Map text option → letter (fix HS chọn option text báo sai)
      const collapse = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
      const toLetter = (raw, options) => {
        const a = String(raw ?? '').trim();
        if (!a) return a;
        if (/^[A-Z]$/i.test(a)) return a.toUpperCase();
        if (/^[A-Z][\.\)\s]/i.test(a)) return a;
        if (Array.isArray(options) && options.length > 0) {
          const target = collapse(a);
          for (let i = 0; i < options.length; i++) {
            const opt = collapse(options[i]);
            const stripped = opt.replace(/^[a-z][\.\)\s]+/i, '').trim();
            if (opt === target || stripped === target) {
              return String.fromCharCode(65 + i);
            }
          }
        }
        return a;
      };

      let pointsEarned = 0;
      let totalPoints = 0;
      let correctCount = 0;
      for (const q of qs) {
        const qPts = Number(q.points) > 0 ? Number(q.points) : 1;
        totalPoints += qPts;
        const userAns = userAnswers[q.id];
        if (userAns == null || userAns === '') continue;
        const t = (q.questionType || '').toUpperCase();
        if (t.includes('TRUE') || t.includes('FALSE')) {
          const u = String(userAns).slice(0, 4).padEnd(4, '-');
          const c = String(q.correctAnswer || '').slice(0, 4).padEnd(4, '-');
          let subCorrect = 0;
          for (let i = 0; i < 4; i++) {
            if (u[i] !== '-' && u[i] === c[i]) subCorrect++;
          }
          // Trọng số theo điểm câu: đúng cả 4 = full, 3/4 = 50% điểm
          if (subCorrect === 4) { pointsEarned += qPts; correctCount += 1; }
          else if (subCorrect >= 3) { pointsEarned += qPts * 0.5; correctCount += 0.5; }
        } else {
          if (norm(toLetter(userAns, q.options)) === norm(q.correctAnswer)) {
            pointsEarned += qPts;
            correctCount += 1;
          }
        }
      }
      const total = qs.length;
      const percentage = totalPoints > 0 ? (pointsEarned / totalPoints) * 100 : 0;
      const score = totalPoints > 0
        ? Math.round((pointsEarned / totalPoints) * 100) / 10
        : 0;
      console.log(`[exam:grade] ✅ exam=${examId.slice(0,8)} ${pointsEarned.toFixed(2)}/${totalPoints} pts (${Math.round(percentage)}%)`);
      return res.json({
        correct: Math.round(correctCount * 10) / 10,
        total, percentage, score,
        pointsEarned: Math.round(pointsEarned * 100) / 100,
        totalPoints,
      });
    } catch (err) {
      console.error('[exam:grade] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/exams/:id — detail + questions, cho học sinh xem trước khi làm.
  // Cho phép xem nếu (a) là exam công khai + status "Đang diễn ra", hoặc
  // (b) là chủ đề thi (Bearer token khớp userId).
  app.get('/api/exams/:id', async (req, res, next) => {
    // Skip nếu :id là special path (vd 'generate-from-matrix') — let next
    // handler match. Express :id wildcard match cả static path → cần guard.
    if (req.params.id === 'generate-from-matrix') return next('route');
    try {
      const xpool = getXPool();
      if (!xpool) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      const { rows: examRows } = await xpool.query(
        `SELECT * FROM "Exam" WHERE id=$1 LIMIT 1`, [req.params.id]
      );
      if (!examRows[0]) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      const exam = mapRow(examRows[0]);
      const userId = getXUserId(req);
      const isOwner = userId && examRows[0].userId === userId;
      const isPublicLive = exam.isPublic && exam.status === 'Đang diễn ra';
      if (!isOwner && !isPublicLive) {
        return res.status(403).json({ error: 'Đề thi này chưa công khai' });
      }
      const { rows: qRows } = await xpool.query(
        `SELECT q.id, q."questionType", q.content, q.options, q."correctAnswer",
                q.explanation, eq."order", eq.points
         FROM "ExamQuestion" eq
         JOIN "Question" q ON q.id = eq."questionId"
         WHERE eq."examId" = $1
         ORDER BY eq."order" ASC`,
        [req.params.id]
      );
      // Học sinh không phải owner → ẩn correctAnswer + explanation cho đến
      // khi nộp bài. Owner thì trả full để chỉnh sửa.
      const questions = isOwner ? qRows : qRows.map(q => ({
        id: q.id, questionType: q.questionType, content: q.content,
        options: q.options, order: q.order, points: q.points,
      }));
      return res.json({ exam, questions });
    } catch (err) {
      console.error('[exams:get] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// ONLINE EXAM ROOM — phòng thi online (scheduled). Khác với LIVE quiz
// rooms ở /api/quiz-rooms (instant + code 6 chữ số). Đây là phòng có:
//   - Lịch thi (schedule: start, end, duration)
//   - Access code optional
//   - Học sinh join trước giờ + chờ activation
//
// Đang phát triển — hiện stub empty/501 để UI /teacher/online-exam-room
// không 503. Thực thi đầy đủ sẽ làm sau.
// ══════════════════════════════════════════════════════════════
// ── ExamRoom CRUD (online exam room — phòng thi có lịch + access code) ──
{
  const { Pool: ERPool } = require('pg');
  let _erpool = null;
  function getERPool() {
    if (!_erpool && process.env.DATABASE_URL) {
      _erpool = new ERPool({
        connectionString: process.env.DATABASE_URL,
        max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
      });
    }
    return _erpool;
  }
  // Self-contained: require + secret từ env (tránh dựa vào const ở scope khác)
  const _erjwt = require('jsonwebtoken');
  const _erSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
  function getERTeacher(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const d = _erjwt.verify(auth.slice(7), _erSecret, { ignoreExpiration: true });
      return { id: d.sub || d.userId || d.id, email: d.email, role: d.role };
    } catch { return null; }
  }
  let _erReady = false;
  async function ensureExamRoomTables() {
    if (_erReady) return;
    const pool = getERPool();
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ExamRoom" (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        description  TEXT,
        "examId"     TEXT NOT NULL,
        "teacherId"  TEXT NOT NULL,
        "startTime"  TIMESTAMPTZ,
        "endTime"    TIMESTAMPTZ,
        duration     INTEGER NOT NULL DEFAULT 45,
        "accessCode" VARCHAR(8),
        "isPublic"   BOOLEAN NOT NULL DEFAULT false,
        "maxStudents" INTEGER,
        status       VARCHAR(20) NOT NULL DEFAULT 'draft',
        "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "ExamRoom_teacher_idx" ON "ExamRoom" ("teacherId")`);
    await pool.query(`CREATE INDEX IF NOT EXISTS "ExamRoom_public_idx" ON "ExamRoom" ("isPublic", status) WHERE "isPublic" = true`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ExamRoom_code_idx" ON "ExamRoom" ("accessCode") WHERE "accessCode" IS NOT NULL`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ExamRoomParticipant" (
        id           TEXT PRIMARY KEY,
        "roomId"     TEXT NOT NULL,
        "userId"     TEXT,
        "studentName" TEXT,
        "joinedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        score        DOUBLE PRECISION,
        "submittedAt" TIMESTAMPTZ,
        UNIQUE ("roomId", "userId")
      )
    `);
    _erReady = true;
  }
  function makeAccessCode() {
    // 6-char alphanumeric, capital — vd "X7K9PB"
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // bỏ I,O,0,1 (gây nhầm)
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function mapRoom(r, exam, teacher, count) {
    return {
      id: r.id, name: r.name, description: r.description,
      status: r.status,
      startTime: r.startTime, endTime: r.endTime,
      duration: r.duration,
      accessCode: r.accessCode,
      isPublic: !!r.isPublic,
      maxStudents: r.maxStudents,
      Teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
      ExamMatrix: exam ? {
        id: exam.id, name: exam.title,
        grade: exam.grade || '', examType: exam.examType || '',
      } : null,
      _count: { participants: Number(count?.participants) || 0, questions: Number(count?.questions) || 0 },
    };
  }

  // GET /api/online-exam-room — list teacher's rooms + public rooms
  app.get('/api/online-exam-room', async (req, res) => {
    const user = getERTeacher(req);
    const pool = getERPool();
    if (!pool) return res.json({ rooms: [], publicRooms: [] });
    try {
      await ensureExamRoomTables();
      // My rooms (teacher only)
      let rooms = [];
      if (user) {
        const r = await pool.query(
          `SELECT er.*,
                  e.title AS exam_title, e."examType",
                  u.name AS teacher_name,
                  (SELECT COUNT(*) FROM "ExamRoomParticipant" p WHERE p."roomId" = er.id) AS participants,
                  (SELECT COUNT(*) FROM "ExamQuestion" eq WHERE eq."examId" = er."examId") AS questions
             FROM "ExamRoom" er
             LEFT JOIN "Exam" e ON e.id = er."examId"
             LEFT JOIN "User" u ON u.id = er."teacherId"
            WHERE er."teacherId" = $1
            ORDER BY er."createdAt" DESC`,
          [user.id]
        );
        rooms = r.rows.map(row => mapRoom(
          row,
          row.exam_title ? { id: row.examId, title: row.exam_title, examType: row.examType } : null,
          row.teacher_name ? { id: row.teacherId, name: row.teacher_name } : null,
          row,
        ));
      }
      // Public rooms (everyone)
      const pr = await pool.query(
        `SELECT er.*,
                e.title AS exam_title, e."examType",
                u.name AS teacher_name,
                (SELECT COUNT(*) FROM "ExamRoomParticipant" p WHERE p."roomId" = er.id) AS participants,
                (SELECT COUNT(*) FROM "ExamQuestion" eq WHERE eq."examId" = er."examId") AS questions
           FROM "ExamRoom" er
           LEFT JOIN "Exam" e ON e.id = er."examId"
           LEFT JOIN "User" u ON u.id = er."teacherId"
          WHERE er."isPublic" = true AND er.status IN ('draft', 'active')
          ORDER BY er."startTime" ASC NULLS LAST
          LIMIT 30`,
      );
      const publicRooms = pr.rows.map(row => mapRoom(
        row,
        row.exam_title ? { id: row.examId, title: row.exam_title, examType: row.examType } : null,
        row.teacher_name ? { id: row.teacherId, name: row.teacher_name } : null,
        row,
      ));
      // Return both `rooms` (student page) AND `examRooms` (teacher page) —
      // historic naming inconsistency, không break consumer cũ.
      res.json({ rooms, examRooms: rooms, publicRooms });
    } catch (err) {
      console.error('[exam-room:list]', err.message);
      res.json({ rooms: [], examRooms: [], publicRooms: [] });
    }
  });

  // POST /api/online-exam-room — create
  app.post('/api/online-exam-room', async (req, res) => {
    const user = getERTeacher(req);
    if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    const pool = getERPool();
    if (!pool) return res.status(503).json({ error: 'DB unavailable' });
    try {
      await ensureExamRoomTables();
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const examId = String(body.examId || '').trim();
      if (!name) return res.status(400).json({ error: 'Thiếu tên phòng' });
      if (!examId) return res.status(400).json({ error: 'Thiếu examId — phải gắn 1 đề thi' });
      // Verify exam tồn tại + thuộc teacher
      const ex = await pool.query(`SELECT id, "userId" FROM "Exam" WHERE id = $1`, [examId]);
      if (!ex.rows.length) return res.status(404).json({ error: 'Đề thi không tồn tại' });
      if (ex.rows[0].userId !== user.id) {
        return res.status(403).json({ error: 'Bạn không sở hữu đề thi này' });
      }
      const startTime = body.startTime ? new Date(body.startTime) : null;
      const endTime = body.endTime ? new Date(body.endTime) : null;
      const duration = Math.max(1, Math.min(600, Number(body.duration) || 45));
      const isPublic = !!body.isPublic;
      const maxStudents = body.maxStudents != null ? Math.max(1, Number(body.maxStudents)) : null;
      // Tạo accessCode unique cho phòng bí mật
      let accessCode = null;
      if (!isPublic) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const c = makeAccessCode();
          const dup = await pool.query(`SELECT 1 FROM "ExamRoom" WHERE "accessCode" = $1`, [c]);
          if (!dup.rows.length) { accessCode = c; break; }
        }
        if (!accessCode) return res.status(500).json({ error: 'Không tạo được mã phòng — thử lại' });
      }
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      await pool.query(
        `INSERT INTO "ExamRoom"
           (id, name, description, "examId", "teacherId", "startTime", "endTime",
            duration, "accessCode", "isPublic", "maxStudents", status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft')`,
        [id, name, String(body.description || '').slice(0, 500),
         examId, user.id, startTime, endTime, duration,
         accessCode, isPublic, maxStudents]
      );
      console.log(`[exam-room:create] ✅ ${id} "${name}" by ${user.id}`);
      const { rows } = await pool.query(`SELECT * FROM "ExamRoom" WHERE id = $1`, [id]);
      const exTitle = await pool.query(`SELECT title, "examType" FROM "Exam" WHERE id = $1`, [examId]);
      res.status(201).json({
        ok: true,
        examRoom: mapRoom(
          rows[0],
          exTitle.rows[0] ? { id: examId, title: exTitle.rows[0].title, examType: exTitle.rows[0].examType } : null,
          { id: user.id, name: user.email },
          { participants: 0, questions: 0 },
        ),
      });
    } catch (err) {
      console.error('[exam-room:create]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/online-exam-room/:id — update (status / name / time)
  app.put('/api/online-exam-room/:id', async (req, res) => {
    const user = getERTeacher(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const pool = getERPool();
    try {
      await ensureExamRoomTables();
      const { id } = req.params;
      const own = await pool.query(
        `SELECT 1 FROM "ExamRoom" WHERE id = $1 AND "teacherId" = $2 LIMIT 1`,
        [id, user.id]
      );
      if (!own.rows.length) return res.status(404).json({ error: 'Phòng không tồn tại hoặc không thuộc bạn' });
      const body = req.body || {};
      const sets = [];
      const vals = [id];
      let i = 2;
      const allowed = ['name','description','status','isPublic','duration','startTime','endTime','maxStudents'];
      for (const key of allowed) {
        if (body[key] === undefined) continue;
        let v = body[key];
        if (key === 'startTime' || key === 'endTime') v = v ? new Date(v) : null;
        sets.push(`"${key}" = $${i++}`);
        vals.push(v);
      }
      if (sets.length === 0) return res.status(400).json({ error: 'Không có field nào để update' });
      sets.push(`"updatedAt" = NOW()`);
      const { rows } = await pool.query(
        `UPDATE "ExamRoom" SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );
      res.json({ ok: true, examRoom: rows[0] });
    } catch (err) {
      console.error('[exam-room:update]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/online-exam-room/:id
  app.delete('/api/online-exam-room/:id', async (req, res) => {
    const user = getERTeacher(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const pool = getERPool();
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM "ExamRoom" WHERE id = $1 AND "teacherId" = $2`,
        [req.params.id, user.id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Phòng không tồn tại' });
      // Xoá participants luôn
      await pool.query(`DELETE FROM "ExamRoomParticipant" WHERE "roomId" = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error('[exam-room:delete]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/online-exam-room/join { accessCode? | roomId? }
  // - Nếu có accessCode: tìm phòng bí mật theo mã
  // - Nếu có roomId: join phòng public theo id
  app.post('/api/online-exam-room/join', async (req, res) => {
    const user = getERTeacher(req);
    if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập trước' });
    const pool = getERPool();
    try {
      await ensureExamRoomTables();
      const { accessCode, roomId } = req.body || {};
      let room = null;
      if (accessCode) {
        const r = await pool.query(
          `SELECT * FROM "ExamRoom" WHERE "accessCode" = $1 LIMIT 1`,
          [String(accessCode).trim().toUpperCase()]
        );
        room = r.rows[0];
      } else if (roomId) {
        const r = await pool.query(
          `SELECT * FROM "ExamRoom" WHERE id = $1 AND "isPublic" = true LIMIT 1`,
          [roomId]
        );
        room = r.rows[0];
      } else {
        return res.status(400).json({ error: 'Thiếu accessCode hoặc roomId' });
      }
      if (!room) return res.status(404).json({ error: 'Phòng không tồn tại hoặc mã sai' });
      if (room.status === 'completed' || room.status === 'cancelled') {
        return res.status(400).json({ error: 'Phòng đã kết thúc' });
      }
      // Insert participant (idempotent)
      const { randomUUID } = require('crypto');
      await pool.query(
        `INSERT INTO "ExamRoomParticipant" (id, "roomId", "userId", "studentName")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("roomId", "userId") DO NOTHING`,
        [randomUUID(), room.id, user.id, user.email]
      );
      res.json({
        ok: true,
        room: { id: room.id, name: room.name, examId: room.examId, status: room.status, duration: room.duration },
      });
    } catch (err) {
      console.error('[exam-room:join]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/online-exam-room/:id/schedule — placeholder (chưa làm scheduling sâu)
  app.get('/api/online-exam-room/:id/schedule', (req, res) =>
    res.json({ roomId: req.params.id, schedules: [] }));
  app.post('/api/online-exam-room/:id/schedule', (_req, res) =>
    res.status(501).json({ error: 'Đặt lịch thi nâng cao đang phát triển — dùng startTime/endTime trong tạo phòng' }));
  app.post('/api/online-exam-room/:id/schedule/activate', (_req, res) =>
    res.status(501).json({ error: 'Kích hoạt lịch thi đang phát triển' }));

  // ────────────────────────────────────────────────────────────
  // STUDENT-side endpoints cho exam rooms
  // ────────────────────────────────────────────────────────────

  // GET /api/student/exam-rooms — list phòng thi HS có thể vào
  // Bao gồm:
  //   - Public rooms (status: draft hoặc active) — ai cũng vào được
  //   - Rooms HS đã từng tham gia (qua ExamRoomParticipant) — kể cả private
  // Mỗi room kèm leaderboard top 10 (theo score DESC) + my participant info.
  app.get('/api/student/exam-rooms', async (req, res) => {
    const user = getERTeacher(req); // JWT decode — không phân biệt role
    const pool = getERPool();
    if (!pool) return res.json({ rooms: [], count: 0 });
    try {
      await ensureExamRoomTables();
      const userId = user?.id || null;
      // Lấy rooms theo 2 điều kiện: public-and-open HOẶC student đã join
      const r = await pool.query(
        `SELECT DISTINCT er.*,
                e.title AS exam_title, e."examType",
                u.name AS teacher_name,
                (SELECT COUNT(*) FROM "ExamRoomParticipant" p WHERE p."roomId" = er.id) AS participants,
                (SELECT COUNT(*) FROM "ExamQuestion" eq WHERE eq."examId" = er."examId") AS questions,
                (SELECT row_to_json(mp) FROM (
                   SELECT score, "joinedAt", "submittedAt"
                     FROM "ExamRoomParticipant"
                    WHERE "roomId" = er.id AND "userId" = $1
                    LIMIT 1
                 ) mp) AS my_participant
           FROM "ExamRoom" er
           LEFT JOIN "Exam" e ON e.id = er."examId"
           LEFT JOIN "User" u ON u.id = er."teacherId"
          WHERE (er."isPublic" = true AND er.status IN ('draft','active'))
             OR EXISTS (
               SELECT 1 FROM "ExamRoomParticipant" p
                WHERE p."roomId" = er.id AND p."userId" = $1
             )
          ORDER BY
            CASE er.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
            er."startTime" ASC NULLS LAST
          LIMIT 50`,
        [userId]
      );
      if (r.rows.length === 0) return res.json({ rooms: [], count: 0 });

      // Batch-load leaderboard cho tất cả rooms (top 10 mỗi room).
      const roomIds = r.rows.map(row => row.id);
      const lbRes = await pool.query(
        `SELECT "roomId", "userId", "studentName", score, "submittedAt", "joinedAt",
                ROW_NUMBER() OVER (PARTITION BY "roomId" ORDER BY score DESC NULLS LAST, "submittedAt" ASC NULLS LAST) AS rn
           FROM "ExamRoomParticipant"
          WHERE "roomId" = ANY($1::text[])`,
        [roomIds]
      );
      const byRoom = new Map();
      for (const lb of lbRes.rows) {
        if (Number(lb.rn) > 10) continue; // chỉ top 10
        if (!byRoom.has(lb.roomId)) byRoom.set(lb.roomId, []);
        byRoom.get(lb.roomId).push({
          userId: lb.userId,
          name: lb.studentName || 'Ẩn danh',
          score: lb.score == null ? null : Number(lb.score),
          rank: Number(lb.rn),
          submittedAt: lb.submittedAt,
          isMe: lb.userId === userId,
        });
      }

      const rooms = r.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        startTime: row.startTime,
        endTime: row.endTime,
        duration: row.duration,
        isPublic: !!row.isPublic,
        maxStudents: row.maxStudents,
        // Hide accessCode từ student-side public list (chỉ teacher dùng mã)
        Teacher: row.teacher_name ? { id: row.teacherId, name: row.teacher_name } : null,
        Exam: row.exam_title ? { id: row.examId, title: row.exam_title, examType: row.examType } : null,
        _count: {
          participants: Number(row.participants) || 0,
          questions: Number(row.questions) || 0,
        },
        // Student-specific fields
        myParticipant: row.my_participant ? {
          score: row.my_participant.score == null ? null : Number(row.my_participant.score),
          joinedAt: row.my_participant.joinedAt,
          submittedAt: row.my_participant.submittedAt,
          completed: !!row.my_participant.submittedAt,
        } : null,
        leaderboard: byRoom.get(row.id) || [],
      }));
      res.json({ rooms, count: rooms.length });
    } catch (err) {
      console.error('[student:exam-rooms]', err.message);
      res.json({ rooms: [], count: 0, error: err.message });
    }
  });

  // GET /api/online-exam-room/:id/leaderboard — full leaderboard 1 phòng
  // (top 50, public — ai cũng xem được). HS dùng để xem chi tiết khi click
  // vào room card.
  app.get('/api/online-exam-room/:id/leaderboard', async (req, res) => {
    const pool = getERPool();
    if (!pool) return res.json({ leaderboard: [], count: 0 });
    try {
      await ensureExamRoomTables();
      const { rows } = await pool.query(
        `SELECT "userId", "studentName", score, "submittedAt", "joinedAt",
                ROW_NUMBER() OVER (ORDER BY score DESC NULLS LAST, "submittedAt" ASC NULLS LAST) AS rank
           FROM "ExamRoomParticipant"
          WHERE "roomId" = $1
          ORDER BY rank ASC
          LIMIT 50`,
        [req.params.id]
      );
      const user = getERTeacher(req);
      const userId = user?.id || null;
      const leaderboard = rows.map(r => ({
        userId: r.userId,
        name: r.studentName || 'Ẩn danh',
        score: r.score == null ? null : Number(r.score),
        rank: Number(r.rank),
        submittedAt: r.submittedAt,
        isMe: r.userId === userId,
      }));
      res.json({ roomId: req.params.id, leaderboard, count: leaderboard.length });
    } catch (err) {
      console.error('[exam-room:leaderboard]', err.message);
      res.json({ leaderboard: [], count: 0, error: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// CAREER PROFILE — lưu kết quả bài test hướng nghiệp (MBTI + Holland)
// + thống kê cộng đồng + đề xuất ngành Hot xu thế 2026.
// ──────────────────────────────────────────────────────────────
// POST /api/personality-test  body{action:'save', ...}     → lưu
// GET  /api/personality-test?action=history (auth)         → lịch sử cá nhân
// GET  /api/personality-test?action=community-stats        → thống kê + trending
// ══════════════════════════════════════════════════════════════
{
  const { Pool: CpPool } = require('pg');
  const cpJwt = require('jsonwebtoken');
  const { randomUUID: cpUUID } = require('crypto');

  let _cpPool = null;
  let _cpReady = null;
  function getCpPool() {
    if (!_cpPool) {
      const url = process.env.DATABASE_URL;
      if (!url) return null;
      _cpPool = new CpPool({ connectionString: url, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _cpPool;
  }
  async function ensureCpTable() {
    if (_cpReady) return _cpReady;
    const pool = getCpPool();
    if (!pool) return null;
    _cpReady = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS "CareerProfile" (
        id TEXT PRIMARY KEY,
        "userId" TEXT,
        "userName" TEXT,
        "userImage" TEXT,
        "userYearOfBirth" INT,
        "mbtiType" TEXT,
        "mbtiScores" JSONB,
        "hollandCode" TEXT,
        "hollandScores" JSONB,
        "personalityName" TEXT,
        careers TEXT[],
        answers JSONB,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "CareerProfile_userId_idx"
        ON "CareerProfile"("userId")`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "CareerProfile_createdAt_idx"
        ON "CareerProfile"("createdAt" DESC)`);
      console.log('[career] ✅ CareerProfile table ready');
    })().catch(e => { console.error('[career] ❌ ensureCpTable', e.message); _cpReady = null; });
    return _cpReady;
  }
  const CP_JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';
  function getCpUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      return cpJwt.verify(auth.slice(7), CP_JWT_SECRET).sub || null;
    } catch { return null; }
  }

  // Danh sách ngành Hot xu thế 2026 (cross-reference với careers từ test result).
  // Match nhẹ: lowercase + contains keyword. Mỗi ngành có lý do trending.
  const TRENDING_2026 = [
    { keyword: ['ai','machine learning','trí tuệ nhân tạo','ml engineer'],
      label: 'AI / Machine Learning Engineer', reason: 'Bùng nổ AI generative + ứng dụng doanh nghiệp', heat: 5 },
    { keyword: ['data scientist','khoa học dữ liệu','phân tích dữ liệu'],
      label: 'Data Scientist / Data Analyst', reason: 'Doanh nghiệp Việt Nam số hoá, nhu cầu phân tích lớn', heat: 5 },
    { keyword: ['cyber','an ninh mạng','bảo mật'],
      label: 'Cybersecurity / An ninh mạng', reason: 'Tấn công mạng tăng → vai trò critical', heat: 5 },
    { keyword: ['cloud','devops','sre'],
      label: 'Cloud / DevOps Engineer', reason: 'Mọi startup VN dùng AWS/GCP/Azure', heat: 4 },
    { keyword: ['renewable','năng lượng tái tạo','solar','wind'],
      label: 'Năng lượng tái tạo', reason: 'Cam kết Net-Zero 2050 + đầu tư điện gió/mặt trời', heat: 4 },
    { keyword: ['bác sĩ','y tá','y khoa','điều dưỡng','dược'],
      label: 'Y tế / Healthcare', reason: 'Già hoá dân số + nhu cầu chăm sóc sức khoẻ', heat: 5 },
    { keyword: ['tâm lý','counselor','tham vấn'],
      label: 'Tâm lý học / Tham vấn tâm lý', reason: 'Sức khoẻ tinh thần được quan tâm hơn', heat: 4 },
    { keyword: ['biotech','sinh học','công nghệ sinh học','di truyền'],
      label: 'Công nghệ sinh học', reason: 'Vaccine, GMO, công nghệ gen', heat: 4 },
    { keyword: ['robot','automation','tự động hoá','cơ điện tử'],
      label: 'Robotics / Tự động hoá', reason: 'Industry 4.0 trong sản xuất Việt Nam', heat: 4 },
    { keyword: ['ux','ui','thiết kế trải nghiệm','product designer'],
      label: 'UX/UI Designer', reason: 'Sản phẩm số bùng nổ, cần thiết kế tốt', heat: 4 },
    { keyword: ['content creator','sáng tạo nội dung','marketing số','digital marketing'],
      label: 'Digital Content Creator / Marketing', reason: 'Creator economy + thương mại điện tử', heat: 4 },
    { keyword: ['kỹ sư phần mềm','software engineer','lập trình','developer'],
      label: 'Kỹ sư Phần mềm', reason: 'Outsourcing + product VN tiếp tục phát triển', heat: 5 },
    { keyword: ['fintech','tài chính số','blockchain'],
      label: 'Fintech / Blockchain', reason: 'Chuyển đổi số ngân hàng + thanh toán điện tử', heat: 4 },
    { keyword: ['logistics','chuỗi cung ứng','supply chain'],
      label: 'Logistics / Supply Chain', reason: 'Thương mại điện tử + xuất khẩu tăng trưởng', heat: 3 },
    { keyword: ['esg','sustainability','phát triển bền vững'],
      label: 'ESG / Phát triển bền vững', reason: 'Doanh nghiệp ép tuân thủ tiêu chuẩn xanh', heat: 3 },
  ];
  function matchTrending(careerName) {
    const n = String(careerName || '').toLowerCase();
    return TRENDING_2026.find(t => t.keyword.some(k => n.includes(k))) || null;
  }

  // POST /api/personality-test  { action: 'save', ... }
  // (dùng POST cho cả save thay vì query string để body không bị log/cache)
  app.post('/api/personality-test', async (req, res) => {
    try {
      const action = String(req.body?.action || 'save').toLowerCase();
      if (action !== 'save') return res.status(400).json({ success: false, error: 'invalid_action' });

      const pool = getCpPool();
      if (!pool) return res.status(503).json({ success: false, error: 'DB not available' });
      await ensureCpTable();

      // userId optional — học sinh có thể làm bài chưa login (ẩn danh)
      const tokenUserId = getCpUserId(req);
      const body = req.body || {};
      const userId = tokenUserId || body.userId || null;

      const id = cpUUID();
      const now = new Date();
      await pool.query(
        `INSERT INTO "CareerProfile"
           (id, "userId", "userName", "userImage", "userYearOfBirth",
            "mbtiType", "mbtiScores", "hollandCode", "hollandScores",
            "personalityName", careers, answers, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id, userId,
          String(body.userName || '').slice(0, 100) || null,
          body.userImage || null,
          body.userYearOfBirth ? Number(body.userYearOfBirth) : null,
          String(body.mbtiType || '').slice(0, 8),
          JSON.stringify(body.mbtiScores || {}),
          String(body.hollandCode || '').slice(0, 8),
          JSON.stringify(body.hollandScores || {}),
          String(body.personalityName || '').slice(0, 200),
          Array.isArray(body.careers) ? body.careers.map(String).slice(0, 30) : [],
          JSON.stringify(body.answers || {}),
          now,
        ]
      );
      console.log(`[career:save] ✅ id=${id.slice(0,8)} user=${userId?.slice(0,8) || 'anon'} mbti=${body.mbtiType} holland=${body.hollandCode}`);
      return res.json({
        success: true,
        data: {
          id, userId,
          user: body.userName ? { id: userId || 'anon', name: body.userName, image: body.userImage || null } : null,
          mbtiType: body.mbtiType, mbtiScores: body.mbtiScores,
          hollandCode: body.hollandCode, hollandScores: body.hollandScores,
          personalityName: body.personalityName, careers: body.careers,
          createdAt: now.toISOString(),
        },
      });
    } catch (err) {
      console.error('[career:save] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/personality-test?action=history|community-stats
  app.get('/api/personality-test', async (req, res) => {
    try {
      const pool = getCpPool();
      if (!pool) return res.status(503).json({ success: false, error: 'DB not available' });
      await ensureCpTable();
      const action = String(req.query.action || '').toLowerCase();

      // Hỗ trợ ?type=latest (Progress page) → trả CareerProfile mới nhất của user
      if (req.query.type === 'latest' || action === 'latest') {
        const userId = getCpUserId(req);
        if (!userId) return res.json({ success: true, data: null });
        const { rows: latest } = await pool.query(
          `SELECT id, "userId", "mbtiType", "mbtiScores", "hollandCode", "hollandScores",
                  "personalityName", careers, "createdAt"
             FROM "CareerProfile" WHERE "userId" = $1
            ORDER BY "createdAt" DESC LIMIT 1`,
          [userId]
        );
        if (latest.length === 0) return res.json({ success: true, data: null });
        const r = latest[0];
        return res.json({
          success: true,
          data: {
            id: r.id, userId: r.userId,
            mbtiType: r.mbtiType, mbtiScores: r.mbtiScores,
            hollandCode: r.hollandCode, hollandScores: r.hollandScores,
            personalityName: r.personalityName, careers: r.careers || [],
            createdAt: r.createdAt,
          },
        });
      }

      if (action === 'history') {
        const userId = getCpUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
        const { rows } = await pool.query(
          `SELECT id, "userId", "userName", "userImage", "mbtiType", "mbtiScores",
                  "hollandCode", "hollandScores", "personalityName", careers, "createdAt"
             FROM "CareerProfile"
            WHERE "userId" = $1
            ORDER BY "createdAt" DESC LIMIT 20`,
          [userId]
        );
        return res.json({
          success: true,
          data: rows.map(r => ({
            id: r.id, userId: r.userId,
            user: r.userName ? { id: r.userId, name: r.userName, image: r.userImage } : null,
            mbtiType: r.mbtiType, mbtiScores: r.mbtiScores,
            hollandCode: r.hollandCode, hollandScores: r.hollandScores,
            personalityName: r.personalityName, careers: r.careers || [],
            createdAt: r.createdAt,
          })),
        });
      }

      if (action === 'community-stats') {
        // Aggregate từ TOÀN BỘ CareerProfile (public stats)
        const [overall, mbtiQ, careersQ, recentQ, yobQ] = await Promise.all([
          pool.query(`SELECT COUNT(*)::int AS total, COUNT(DISTINCT "userId")::int AS users,
                             MAX("createdAt") AS last_at FROM "CareerProfile"`),
          pool.query(`SELECT "mbtiType", COUNT(*)::int AS count
                        FROM "CareerProfile" WHERE "mbtiType" <> ''
                        GROUP BY "mbtiType" ORDER BY count DESC`),
          // careers TEXT[] → unnest để đếm từng ngành
          pool.query(`SELECT career, COUNT(*)::int AS count
                        FROM "CareerProfile", unnest(careers) AS career
                       GROUP BY career
                       ORDER BY count DESC LIMIT 30`),
          pool.query(`SELECT "userName", "userImage", "userYearOfBirth", "mbtiType",
                             "personalityName", "hollandCode", "createdAt"
                        FROM "CareerProfile" WHERE "userName" IS NOT NULL
                        ORDER BY "createdAt" DESC LIMIT 10`),
          pool.query(`SELECT "userYearOfBirth" AS year, COUNT(*)::int AS count
                        FROM "CareerProfile" WHERE "userYearOfBirth" IS NOT NULL
                        GROUP BY "userYearOfBirth" ORDER BY count DESC LIMIT 10`),
        ]);
        const total = overall.rows[0].total || 0;
        const pct = (n) => total ? Math.round((n / total) * 1000) / 10 : 0;

        // Holland distribution: derive bằng cách tách ký tự đầu của hollandCode
        const hollandQ = await pool.query(
          `SELECT LEFT("hollandCode", 1) AS code, COUNT(*)::int AS count
             FROM "CareerProfile" WHERE "hollandCode" <> ''
             GROUP BY LEFT("hollandCode", 1)`
        );
        const HOLLAND_LABELS = {
          R: 'Realistic - Thực tế', I: 'Investigative - Nghiên cứu',
          A: 'Artistic - Nghệ thuật', S: 'Social - Xã hội',
          E: 'Enterprising - Quản lý', C: 'Conventional - Quy tắc',
        };
        const MBTI_NAMES = {
          INTJ:'Nhà chiến lược',INTP:'Nhà tư duy',ENTJ:'Nhà chỉ huy',ENTP:'Nhà tranh luận',
          INFJ:'Người che chở',INFP:'Người hoà giải',ENFJ:'Người dẫn dắt',ENFP:'Người truyền cảm hứng',
          ISTJ:'Người nề nếp',ISFJ:'Người bảo vệ',ESTJ:'Nhà điều hành',ESFJ:'Người chăm sóc',
          ISTP:'Nghệ nhân',ISFP:'Nghệ sĩ',ESTP:'Doanh nhân',ESFP:'Người giải trí',
        };

        // Đánh dấu trending cho topCareers
        const topCareers = careersQ.rows.map(r => ({
          name: r.career,
          count: r.count,
          percentage: pct(r.count),
          trending: matchTrending(r.career),
        }));

        return res.json({
          success: true,
          data: {
            totalAttempts: total,
            totalUsers: overall.rows[0].users || 0,
            updatedAt: overall.rows[0].last_at || new Date().toISOString(),
            mbtiDistribution: mbtiQ.rows.map(r => ({
              type: r.mbtiType,
              name: MBTI_NAMES[r.mbtiType] || r.mbtiType,
              count: r.count,
              percentage: pct(r.count),
            })),
            hollandDistribution: hollandQ.rows.map(r => ({
              code: r.code,
              label: HOLLAND_LABELS[r.code] || r.code,
              count: r.count,
              percentage: pct(r.count),
            })),
            topCareers,
            recentTakers: recentQ.rows.map(r => ({
              userName: r.userName,
              userImage: r.userImage,
              userYearOfBirth: r.userYearOfBirth,
              mbtiType: r.mbtiType,
              personalityName: r.personalityName,
              hollandCode: r.hollandCode,
              createdAt: r.createdAt,
            })),
            yearOfBirthDistribution: yobQ.rows.map(r => ({
              year: r.year, count: r.count, percentage: pct(r.count),
            })),
            // Bonus: full trending list 2026 (UI có thể hiện ngay cả khi 0 ai chọn)
            trendingCareers2026: TRENDING_2026.map(t => ({
              label: t.label, reason: t.reason, heat: t.heat,
            })),
          },
        });
      }

      return res.status(400).json({ success: false, error: 'invalid_action' });
    } catch (err) {
      console.error('[career:get] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// LEADERBOARD REAL-TIME — top học sinh dẫn đầu với chỉ số
// cảm xúc + tương tác. Aggregate từ PracticeExam + LessonHistory
// + QuizRoomParticipant. Dùng chung cho Teacher + Student dashboard.
// ──────────────────────────────────────────────────────────────
// GET /api/leaderboard/realtime?limit=10
//   → trả top users theo điểm tổng (sum percentage) + engagement
//     (action 7d) + emotion (derive từ trend percentage)
// ══════════════════════════════════════════════════════════════
{
  const { Pool: LbPool } = require('pg');
  let _lbPool = null;
  function getLbPool() {
    if (!_lbPool) {
      const url = process.env.DATABASE_URL;
      if (!url) return null;
      _lbPool = new LbPool({ connectionString: url, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _lbPool;
  }
  const anonName = (sid) => `Học sinh ${String(sid || '').slice(0, 4) || '----'}`;
  // Emotion derive từ trend percentage:
  //   improving (avg gần đây > avg cũ + 5)  → 😊
  //   declining (avg gần đây < avg cũ - 5)  → 😔
  //   stable                                → 😐
  function emotionFrom(recentAvg, oldAvg, total) {
    if (!total || total < 2) return { emoji: '🙂', label: 'Mới bắt đầu', tone: 'neutral' };
    const diff = recentAvg - oldAvg;
    if (diff >= 5) return { emoji: '😊', label: 'Tiến bộ', tone: 'positive' };
    if (diff <= -5) return { emoji: '😔', label: 'Đi xuống', tone: 'negative' };
    return { emoji: '😐', label: 'Ổn định', tone: 'neutral' };
  }
  // Engagement label từ số action 7 ngày
  function engagementFrom(actions7d) {
    if (actions7d >= 20) return { level: 'Cao', score: Math.min(100, actions7d * 3), tone: 'high' };
    if (actions7d >= 5)  return { level: 'Trung bình', score: actions7d * 4, tone: 'mid' };
    return { level: 'Thấp', score: actions7d * 8, tone: 'low' };
  }

  app.get('/api/leaderboard/realtime', async (_req, res) => {
    try {
      const pool = getLbPool();
      if (!pool) return res.json({ leaders: [] });

      // Lấy top 30 candidate theo tổng score (sum percentage cho practice exams)
      const topQ = await pool.query(`
        SELECT
          pe."studentId" AS user_id,
          COUNT(*)::int                                       AS total_attempts,
          COALESCE(SUM(pe.percentage),0)::int                 AS total_score,
          COALESCE(AVG(pe.percentage),0)::float               AS avg_pct,
          COALESCE(AVG(pe.percentage) FILTER (
            WHERE pe."completedAt" > NOW() - INTERVAL '7 days'
          ),0)::float                                         AS recent_avg,
          COALESCE(AVG(pe.percentage) FILTER (
            WHERE pe."completedAt" <= NOW() - INTERVAL '7 days'
          ),0)::float                                         AS old_avg,
          MAX(pe."completedAt")                               AS last_attempt
        FROM "PracticeExam" pe
        WHERE pe.completed = TRUE AND pe.percentage IS NOT NULL
        GROUP BY pe."studentId"
        ORDER BY total_score DESC, total_attempts DESC
        LIMIT 30
      `);

      const userIds = topQ.rows.map(r => r.user_id);
      if (userIds.length === 0) return res.json({ leaders: [] });

      // Lấy engagement (action count 7d) từ LessonHistory
      const engQ = await pool.query(`
        SELECT "userId", COUNT(*)::int AS actions_7d
          FROM "LessonHistory"
         WHERE "userId" = ANY($1::text[])
           AND "occurredAt" > NOW() - INTERVAL '7 days'
         GROUP BY "userId"
      `, [userIds]);
      const engMap = new Map(engQ.rows.map(r => [r.userId, r.actions_7d]));

      // Lấy live quiz scores (QuizRoomParticipant) — Note: participant không
      // link userId, chỉ có name. Bỏ qua nếu không match được.

      // Lấy User name + image (nếu có)
      let userMap = new Map();
      try {
        const usersQ = await pool.query(
          `SELECT id, name, image FROM "User" WHERE id = ANY($1::text[])`,
          [userIds]
        );
        userMap = new Map(usersQ.rows.map(r => [r.id, r]));
      } catch { /* User table có thể thiếu — fallback anon */ }

      const leaders = topQ.rows.slice(0, 10).map((r, idx) => {
        const u = userMap.get(r.user_id);
        const emotion = emotionFrom(Number(r.recent_avg), Number(r.old_avg), Number(r.total_attempts));
        const engagement = engagementFrom(engMap.get(r.user_id) || 0);
        return {
          rank: idx + 1,
          userId: r.user_id,
          name: u?.name || anonName(r.user_id),
          avatar: u?.image || null,
          totalAttempts: Number(r.total_attempts),
          totalScore: Number(r.total_score),
          avgPercentage: Math.round(Number(r.avg_pct)),
          lastAttemptAt: r.last_attempt,
          emotion,
          engagement: {
            level: engagement.level,
            score: engagement.score,
            tone: engagement.tone,
            actions7d: engMap.get(r.user_id) || 0,
          },
        };
      });

      return res.json({ leaders, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[leaderboard:realtime] ❌', err.message);
      return res.status(500).json({ error: err.message, leaders: [] });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// LIVE QUIZ ROOMS — Wayground/Quizizz-style live game mode
// Handles: teacher tạo room, học sinh quét QR + nhập tên, leaderboard
// real-time qua polling 2s. Không dùng WebSocket vì Cloud Run autoscale
// và HTTP polling đủ tốt cho lớp ≤50 học sinh.
// ──────────────────────────────────────────────────────────────
// Endpoints:
//   POST  /api/quiz-rooms                  → teacher tạo room (cần auth)
//   GET   /api/quiz-rooms/:code            → public state (poll mỗi 2s)
//   POST  /api/quiz-rooms/:code/join       → public, body{name,avatar}
//   POST  /api/quiz-rooms/:code/start      → teacher khởi động (cần auth)
//   POST  /api/quiz-rooms/:code/next       → teacher next question
//   POST  /api/quiz-rooms/:code/answer     → student nộp đáp án
//   POST  /api/quiz-rooms/:code/end        → teacher kết thúc
// ══════════════════════════════════════════════════════════════
{
  const { Pool: QrPool } = require('pg');
  const qrJwt = require('jsonwebtoken');
  const { randomUUID: qrUUID } = require('crypto');

  let _qrPool = null;
  let _qrReady = null;
  function getQrPool() {
    if (!_qrPool) {
      const url = process.env.DATABASE_URL;
      if (!url) return null;
      _qrPool = new QrPool({ connectionString: url, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _qrPool;
  }
  async function ensureQrTables() {
    if (_qrReady) return _qrReady;
    const pool = getQrPool();
    if (!pool) return null;
    _qrReady = (async () => {
      // examId/teacherId/questionId là TEXT (Prisma cuid), không phải UUID native.
      // Drop bảng cũ nếu lỡ tạo type sai (chỉ run lần đầu — không mất data thật vì
      // chưa launch production live quiz).
      const colCheck = await pool.query(
        `SELECT data_type FROM information_schema.columns
          WHERE table_name='QuizRoom' AND column_name='examId'`
      );
      if (colCheck.rows[0]?.data_type === 'uuid') {
        await pool.query(`DROP TABLE IF EXISTS "QuizRoomAnswer"`);
        await pool.query(`DROP TABLE IF EXISTS "QuizRoomParticipant"`);
        await pool.query(`DROP TABLE IF EXISTS "QuizRoom"`);
        console.log('[quiz-rooms] dropped legacy UUID tables');
      }
      await pool.query(`CREATE TABLE IF NOT EXISTS "QuizRoom" (
        id TEXT PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        "examId" TEXT NOT NULL,
        "teacherId" TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'waiting',
        "currentQuestion" INT DEFAULT -1,
        "questionStartedAt" TIMESTAMP,
        "startedAt" TIMESTAMP,
        "endedAt" TIMESTAMP,
        settings JSONB DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS "QuizRoomParticipant" (
        id TEXT PRIMARY KEY,
        "roomId" TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        avatar VARCHAR(20),
        score INT DEFAULT 0,
        "correctCount" INT DEFAULT 0,
        "joinedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("roomId", name)
      )`);
      await pool.query(`CREATE TABLE IF NOT EXISTS "QuizRoomAnswer" (
        id TEXT PRIMARY KEY,
        "roomId" TEXT NOT NULL,
        "participantId" TEXT NOT NULL,
        "questionId" TEXT NOT NULL,
        "questionIndex" INT,
        answer TEXT,
        "isCorrect" BOOLEAN,
        "responseTime" INT,
        "submittedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("roomId", "participantId", "questionId")
      )`);
      console.log('[quiz-rooms] ✅ tables ready (TEXT ids)');
    })().catch(e => { console.error('[quiz-rooms] ❌ ensureTables', e.message); _qrReady = null; });
    return _qrReady;
  }
  const QR_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';
  function getQrTeacherId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      return qrJwt.verify(auth.slice(7), QR_SECRET).sub || null;
    } catch { return null; }
  }
  function gen6digit() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
  function normalizeQuizAns(s) {
    s = String(s ?? '').trim();
    if (!s) return '';
    if (/^[A-Z]$/i.test(s)) return s.toUpperCase();
    const m = s.match(/^([A-Z])[\.\)\s]/i);
    if (m) return m[1].toUpperCase();
    const numStr = s.replace(/,/g, '.').replace(/\s+/g, '');
    if (numStr !== '' && !isNaN(Number(numStr))) return String(Number(numStr));
    return s.toLowerCase();
  }

  // ── POST /api/quiz-rooms — teacher tạo room ──────────────
  app.post('/api/quiz-rooms', async (req, res) => {
    try {
      const teacherId = getQrTeacherId(req);
      if (!teacherId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getQrPool();
      if (!pool) return res.status(503).json({ error: 'DB not available' });
      await ensureQrTables();

      const examId = String(req.body?.examId || '').trim();
      if (!examId) return res.status(400).json({ error: 'examId required' });

      // Verify exam tồn tại + có ít nhất 1 question
      const ex = await pool.query(`SELECT id, title, "totalQuestions" FROM "Exam" WHERE id = $1`, [examId]);
      if (ex.rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
      if (!ex.rows[0].totalQuestions) return res.status(400).json({ error: 'Đề chưa có câu hỏi' });

      // Sinh code 6 chữ số unique (retry max 5 lần)
      let code = '';
      for (let i = 0; i < 5; i++) {
        const c = gen6digit();
        const exists = await pool.query(`SELECT 1 FROM "QuizRoom" WHERE code = $1 AND status <> 'ended'`, [c]);
        if (exists.rows.length === 0) { code = c; break; }
      }
      if (!code) return res.status(500).json({ error: 'Không sinh được code unique' });

      const roomId = qrUUID();
      const settings = req.body?.settings || {};
      await pool.query(
        `INSERT INTO "QuizRoom" (id, code, "examId", "teacherId", status, settings)
         VALUES ($1,$2,$3,$4,'waiting',$5)`,
        [roomId, code, examId, teacherId, JSON.stringify(settings)]
      );
      console.log(`[quiz-rooms] ✅ created code=${code} exam=${examId.slice(0,8)} teacher=${teacherId.slice(0,8)}`);
      return res.json({ roomId, code, examTitle: ex.rows[0].title });
    } catch (err) {
      console.error('[quiz-rooms:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/quiz-rooms/:code — public state poll ────────
  app.get('/api/quiz-rooms/:code', async (req, res) => {
    try {
      const pool = getQrPool();
      if (!pool) return res.status(503).json({ error: 'DB not available' });
      await ensureQrTables();
      const { rows } = await pool.query(
        `SELECT r.*, e.title AS "examTitle", e."totalQuestions"
           FROM "QuizRoom" r
           LEFT JOIN "Exam" e ON e.id = r."examId"
          WHERE r.code = $1 LIMIT 1`,
        [req.params.code]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Phòng không tồn tại' });
      const room = rows[0];
      const parts = await pool.query(
        `SELECT id, name, avatar, score, "correctCount", "joinedAt"
           FROM "QuizRoomParticipant" WHERE "roomId" = $1
          ORDER BY score DESC, "correctCount" DESC, "joinedAt" ASC`,
        [room.id]
      );
      // Nếu đang playing → trả thêm câu hỏi hiện tại (ẩn correctAnswer cho student)
      let currentQuestion = null;
      if (room.status === 'playing' && room.currentQuestion >= 0) {
        const q = await pool.query(
          `SELECT q.id, q."questionType", q.content, q.options, eq."order", eq.points
             FROM "ExamQuestion" eq
             JOIN "Question" q ON q.id = eq."questionId"
            WHERE eq."examId" = $1 ORDER BY eq."order" ASC OFFSET $2 LIMIT 1`,
          [room.examId, room.currentQuestion]
        );
        if (q.rows[0]) {
          currentQuestion = {
            id: q.rows[0].id,
            index: room.currentQuestion,
            content: q.rows[0].content,
            options: q.rows[0].options,
            questionType: q.rows[0].questionType,
            startedAt: room.questionStartedAt,
          };
        }
      }
      return res.json({
        room: {
          id: room.id,
          code: room.code,
          examId: room.examId,
          examTitle: room.examTitle,
          totalQuestions: room.totalQuestions,
          status: room.status,
          currentQuestion: room.currentQuestion,
          startedAt: room.startedAt,
          endedAt: room.endedAt,
        },
        participants: parts.rows,
        currentQuestion,
      });
    } catch (err) {
      console.error('[quiz-rooms:get] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/quiz-rooms/:code/join — học sinh join ──────
  app.post('/api/quiz-rooms/:code/join', async (req, res) => {
    try {
      const pool = getQrPool();
      if (!pool) return res.status(503).json({ error: 'DB not available' });
      await ensureQrTables();
      const name = String(req.body?.name || '').trim().slice(0, 100);
      const avatar = String(req.body?.avatar || '🐸').slice(0, 20);
      if (!name) return res.status(400).json({ error: 'Cần nhập tên' });

      const r = await pool.query(`SELECT id, status FROM "QuizRoom" WHERE code = $1`, [req.params.code]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Phòng không tồn tại' });
      const room = r.rows[0];
      if (room.status === 'ended') return res.status(410).json({ error: 'Phòng đã kết thúc' });

      // Check trùng tên trong room → trả participantId hiện có
      const exist = await pool.query(
        `SELECT id FROM "QuizRoomParticipant" WHERE "roomId" = $1 AND name = $2 LIMIT 1`,
        [room.id, name]
      );
      if (exist.rows[0]) {
        return res.json({ participantId: exist.rows[0].id, name, avatar, rejoined: true });
      }
      const pid = qrUUID();
      await pool.query(
        `INSERT INTO "QuizRoomParticipant" (id, "roomId", name, avatar) VALUES ($1,$2,$3,$4)`,
        [pid, room.id, name, avatar]
      );
      console.log(`[quiz-rooms:join] ✅ code=${req.params.code} name=${name}`);
      return res.json({ participantId: pid, name, avatar, rejoined: false });
    } catch (err) {
      console.error('[quiz-rooms:join] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/quiz-rooms/:code/start — teacher khởi động ──
  app.post('/api/quiz-rooms/:code/start', async (req, res) => {
    try {
      const teacherId = getQrTeacherId(req);
      if (!teacherId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getQrPool();
      if (!pool) return res.status(503).json({ error: 'DB not available' });
      const { rowCount } = await pool.query(
        `UPDATE "QuizRoom"
            SET status='playing', "currentQuestion"=0,
                "questionStartedAt"=NOW(), "startedAt"=NOW()
          WHERE code=$1 AND "teacherId"=$2 AND status='waiting'`,
        [req.params.code, teacherId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Phòng không hợp lệ hoặc không phải owner' });
      console.log(`[quiz-rooms:start] ✅ code=${req.params.code}`);
      return res.json({ ok: true });
    } catch (err) {
      console.error('[quiz-rooms:start] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/quiz-rooms/:code/next — câu kế tiếp / kết thúc ──
  app.post('/api/quiz-rooms/:code/next', async (req, res) => {
    try {
      const teacherId = getQrTeacherId(req);
      if (!teacherId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getQrPool();
      if (!pool) return res.status(503).json({ error: 'DB not available' });
      const r = await pool.query(
        `SELECT r.id, r."currentQuestion", e."totalQuestions"
           FROM "QuizRoom" r LEFT JOIN "Exam" e ON e.id = r."examId"
          WHERE r.code=$1 AND r."teacherId"=$2 AND r.status='playing'`,
        [req.params.code, teacherId]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Phòng không hợp lệ' });
      const room = r.rows[0];
      const nextIdx = (room.currentQuestion || 0) + 1;
      if (nextIdx >= (room.totalQuestions || 0)) {
        await pool.query(
          `UPDATE "QuizRoom" SET status='ended', "endedAt"=NOW() WHERE id=$1`,
          [room.id]
        );
        return res.json({ ended: true });
      }
      await pool.query(
        `UPDATE "QuizRoom" SET "currentQuestion"=$1, "questionStartedAt"=NOW() WHERE id=$2`,
        [nextIdx, room.id]
      );
      return res.json({ ended: false, currentQuestion: nextIdx });
    } catch (err) {
      console.error('[quiz-rooms:next] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/quiz-rooms/:code/answer — student nộp đáp án ──
  app.post('/api/quiz-rooms/:code/answer', async (req, res) => {
    try {
      const pool = getQrPool();
      if (!pool) return res.status(503).json({ error: 'DB not available' });
      const participantId = String(req.body?.participantId || '').trim();
      const questionId = String(req.body?.questionId || '').trim();
      const answer = String(req.body?.answer ?? '');
      if (!participantId || !questionId) {
        return res.status(400).json({ error: 'participantId + questionId required' });
      }
      const r = await pool.query(
        `SELECT r.id, r."currentQuestion", r."questionStartedAt"
           FROM "QuizRoom" r WHERE r.code=$1 AND r.status='playing'`,
        [req.params.code]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Phòng không hoạt động' });
      const room = r.rows[0];

      // Lấy correctAnswer của question
      const q = await pool.query(`SELECT "correctAnswer" FROM "Question" WHERE id=$1`, [questionId]);
      if (q.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
      const isCorrect = normalizeQuizAns(answer) === normalizeQuizAns(q.rows[0].correctAnswer);

      // Speed bonus: nhanh hơn → nhiều điểm hơn
      // Base 1000, mỗi giây giảm 50, min 500
      const elapsedMs = room.questionStartedAt
        ? Date.now() - new Date(room.questionStartedAt).getTime()
        : 0;
      const points = isCorrect
        ? Math.max(500, 1000 - Math.floor(elapsedMs / 1000) * 50)
        : 0;

      // Insert answer (UNIQUE → conflict do nothing nếu đã nộp)
      await pool.query(
        `INSERT INTO "QuizRoomAnswer"
           (id, "roomId", "participantId", "questionId", "questionIndex",
            answer, "isCorrect", "responseTime")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT ("roomId","participantId","questionId") DO NOTHING`,
        [qrUUID(), room.id, participantId, questionId, room.currentQuestion,
         answer, isCorrect, elapsedMs]
      );
      // Update participant score nếu đúng
      if (isCorrect) {
        await pool.query(
          `UPDATE "QuizRoomParticipant"
              SET score = score + $1, "correctCount" = "correctCount" + 1
            WHERE id = $2`,
          [points, participantId]
        );
      }
      return res.json({ isCorrect, points });
    } catch (err) {
      console.error('[quiz-rooms:answer] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/quiz-rooms/:code/end — teacher kết thúc ──
  app.post('/api/quiz-rooms/:code/end', async (req, res) => {
    try {
      const teacherId = getQrTeacherId(req);
      if (!teacherId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getQrPool();
      if (!pool) return res.status(503).json({ error: 'DB not available' });
      await pool.query(
        `UPDATE "QuizRoom" SET status='ended', "endedAt"=NOW()
          WHERE code=$1 AND "teacherId"=$2`,
        [req.params.code, teacherId]
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error('[quiz-rooms:end] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });
}

// NOTE: proxy /api/exams* moved to LATER in file — phải đăng ký AFTER
// /api/exams/generate-from-matrix endpoints (line 7263+) để Express match
// specific routes trước catch-all proxy.

// ══════════════════════════════════════════════════════════════
// BUILT-IN LATEX PROJECTS — không cần pixiai-latex Cloud Run riêng
// Handles 5 endpoints chính: list, create, get, update, delete.
// 2 endpoint export-from-* trả 501 (chưa implement, không phải critical).
// Yêu cầu: DATABASE_URL + JWT_SECRET (đã có sẵn cho built-in auth).
// ══════════════════════════════════════════════════════════════
{
  const { Pool: LPool } = require('pg');
  const ljwt = require('jsonwebtoken');
  const { randomUUID: latexUUID } = require('crypto');

  let _lpool = null;
  let _lpoolReady = null; // promise: ensure tables created once
  function getLPool() {
    if (!_lpool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _lpool = new LPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000,
        // Bump 5s → 15s để xử lý Neon serverless cold-start
        // (đã thấy "Connection terminated due to connection timeout" khi pool wake-up).
        connectionTimeoutMillis: 15000 });
    }
    return _lpool;
  }
  // Lazy migration — chạy một lần duy nhất, idempotent
  async function ensureLatexTables() {
    if (_lpoolReady) return _lpoolReady;
    const pool = getLPool();
    _lpoolReady = (async () => {
      // Main project table
      await pool.query(`CREATE TABLE IF NOT EXISTS "LatexProject" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT 'Tài liệu LaTeX',
        "mainContent" TEXT DEFAULT '',
        "folderId" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_latex_project_user ON "LatexProject" ("userId")`);
      // Add folderId column if missing (for DB tables created before this column)
      await pool.query(`ALTER TABLE "LatexProject" ADD COLUMN IF NOT EXISTS "folderId" TEXT`);
      // Version history table
      await pool.query(`CREATE TABLE IF NOT EXISTS "LatexProjectVersion" (
        id TEXT PRIMARY KEY,
        "projectId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "titleSnapshot" TEXT,
        "contentSnapshot" TEXT,
        trigger TEXT DEFAULT 'manual',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_latex_version_project ON "LatexProjectVersion" ("projectId")`);
    })();
    return _lpoolReady;
  }
  const LJWT_SECRET = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  function getLatexUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const decoded = ljwt.verify(auth.slice(7), LJWT_SECRET, { ignoreExpiration: true });
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }

  // GET /api/latex-projects → list all projects của user
  app.get('/api/latex-projects', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureLatexTables();
      const { rows } = await getLPool().query(
        `SELECT id, "userId", title, "folderId", "createdAt", "updatedAt"
         FROM "LatexProject" WHERE "userId" = $1 ORDER BY "updatedAt" DESC`,
        [userId]
      );
      return res.json({ projects: rows });
    } catch (err) {
      console.error('[latex:list] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/latex-projects/:id → 1 project
  app.get('/api/latex-projects/:id', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      await ensureLatexTables();
      const { rows } = await getLPool().query(
        `SELECT * FROM "LatexProject" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json(rows[0]);
    } catch (err) {
      console.error('[latex:get] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/latex-projects → tạo mới { title, mainContent? }
  app.post('/api/latex-projects', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { title, mainContent } = req.body || {};
      if (!title) return res.status(400).json({ error: 'title required' });
      await ensureLatexTables();
      const id = latexUUID();
      const now = new Date();
      await getLPool().query(
        `INSERT INTO "LatexProject" (id, "userId", title, "mainContent", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$5)`,
        [id, userId, String(title).slice(0, 200), String(mainContent || ''), now]
      );
      console.log(`[latex:create] ✅ ${id} user=${userId}`);
      return res.status(201).json({ id, userId, title, mainContent: mainContent || '', createdAt: now, updatedAt: now });
    } catch (err) {
      console.error('[latex:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/latex-projects/:id → update title + mainContent
  app.put('/api/latex-projects/:id', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { title, mainContent } = req.body || {};
      const sets = [];
      const vals = [req.params.id, userId];
      let idx = 3;
      if (title !== undefined)        { sets.push(`title=$${idx++}`);          vals.push(String(title).slice(0, 200)); }
      if (mainContent !== undefined)  { sets.push(`"mainContent"=$${idx++}`);  vals.push(String(mainContent)); }
      if (!sets.length)               return res.status(400).json({ error: 'Không có field nào để update' });
      sets.push(`"updatedAt"=$${idx++}`); vals.push(new Date());

      const { rowCount } = await getLPool().query(
        `UPDATE "LatexProject" SET ${sets.join(', ')} WHERE id=$1 AND "userId"=$2`, vals
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[latex:update] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/latex-projects/:id
  app.delete('/api/latex-projects/:id', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { rowCount } = await getLPool().query(
        `DELETE FROM "LatexProject" WHERE id=$1 AND "userId"=$2`,
        [req.params.id, userId]
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ success: true });
    } catch (err) {
      console.error('[latex:delete] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/latex-projects/ai-generate
  // Sinh đề thi LaTeX bằng AI (fal.ai → Claude/Gemini). Body: ExamConfig
  // (subject, grade, topic, difficulty {easy,medium,hard,veryHard}, ...).
  // Trả { latex, totalQuestions } — frontend sẽ in `source: 'ai'`.
  app.post('/api/latex-projects/ai-generate', async (req, res) => {
    const t0 = Date.now();
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const cfg = req.body || {};
      const totalQuestions =
        (cfg.difficulty?.easy || 0) + (cfg.difficulty?.medium || 0) +
        (cfg.difficulty?.hard || 0) + (cfg.difficulty?.veryHard || 0);
      if (!totalQuestions) return res.status(400).json({ error: 'Cần ít nhất 1 câu hỏi' });

      const fal = require('./lib/fal-client.cjs');
      const subject = cfg.subject || 'Toán';
      const grade = cfg.grade || '11';
      const topic = cfg.topic || '';
      const prompt = [
        `Bạn là chuyên gia ra đề ${subject} lớp ${grade}.`,
        topic ? `Chủ đề: ${topic}.` : '',
        `Sinh ${totalQuestions} câu hỏi với phân bố độ khó:`,
        `- Dễ: ${cfg.difficulty?.easy || 0}`,
        `- Trung bình: ${cfg.difficulty?.medium || 0}`,
        `- Khó: ${cfg.difficulty?.hard || 0}`,
        `- Vận dụng cao: ${cfg.difficulty?.veryHard || 0}`,
        cfg.notes ? `Lưu ý: ${cfg.notes}` : '',
        '',
        `OUTPUT: 1 file LaTeX hoàn chỉnh (\\documentclass{article} → \\end{document}).`,
        `Dùng package: amsmath, amssymb, geometry, vietnam (cho tiếng Việt).`,
        `Mỗi câu trắc nghiệm: 4 lựa chọn A/B/C/D.`,
        cfg.title ? `Tiêu đề: ${cfg.title}` : '',
        cfg.schoolName ? `Trường: ${cfg.schoolName}` : '',
        cfg.includeAnswerKey ? 'Cuối đề thêm phần "ĐÁP ÁN".' : '',
        '',
        `CHỈ trả về nội dung LaTeX, KHÔNG markdown fence, KHÔNG giải thích.`,
      ].filter(Boolean).join('\n');

      const result = await fal.complete({
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a LaTeX exam paper generator. Output only valid LaTeX, no markdown fences.',
      });
      // Strip code fence nếu có
      let latex = result.content.trim();
      const fenceMatch = latex.match(/^```(?:latex|tex)?\s*([\s\S]*?)\s*```$/);
      if (fenceMatch) latex = fenceMatch[1].trim();

      console.log(`[latex:ai-generate] ✅ user=${userId} questions=${totalQuestions} took=${Date.now() - t0}ms`);
      return res.json({ latex, totalQuestions });
    } catch (err) {
      console.error('[latex:ai-generate] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/latex-projects/ai-fill-template
  // Input:  { prompt: string, template: string }
  // Output: { latex: string }
  // AI fill nội dung vào template LaTeX có sẵn (placeholder "...." / "[TÊN BÀI]").
  // Dùng cho "Tạo giáo án bằng AI" trên /teacher/lesson-plans.
  app.post('/api/latex-projects/ai-fill-template', express.json({ limit: '512kb' }), async (req, res) => {
    const t0 = Date.now();
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { prompt, template } = req.body || {};
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 5) {
        return res.status(400).json({ error: 'Yêu cầu prompt mô tả nội dung giáo án (≥5 ký tự)' });
      }
      if (!template || typeof template !== 'string' || template.trim().length < 50) {
        return res.status(400).json({ error: 'Cần template LaTeX (≥50 ký tự)' });
      }
      if (template.length > 80000) {
        return res.status(400).json({ error: 'Template quá dài (max 80000 ký tự)' });
      }

      const fal = require('./lib/fal-client.cjs');
      const sysPrompt = [
        'Bạn là chuyên gia soạn giáo án theo Công văn 2345/BGDĐT (kế hoạch bài dạy) và Nghị định 30/2020/NĐ-CP (định dạng văn bản hành chính).',
        'Người dùng cung cấp một template LaTeX có sẵn cấu trúc + định dạng. Bạn cần fill nội dung chi tiết vào các placeholder.',
        '',
        'QUY TẮC:',
        '1. KHÔNG đổi cấu trúc, KHÔNG bỏ/thêm \\section / \\subsection / \\begin{...} / \\end{...} / macro / package.',
        '2. KHÔNG đổi geometry, linespread, parskip, titleformat, các định dạng đã được thiết lập.',
        '3. Thay thế các chuỗi placeholder ("..........", "[TÊN BÀI]", "...", "...../...../.....") bằng nội dung thực tế dựa trên yêu cầu của giáo viên.',
        '4. Với các bảng tabularx ô trống, fill cột "Hoạt động của Giáo viên" và "Hoạt động của Học sinh" với mô tả chi tiết, cụ thể (ít nhất 2-3 câu mỗi ô).',
        '5. Yêu cầu cần đạt: viết theo CV2345 — Năng lực đặc thù, Năng lực chung, Phẩm chất, mỗi mục có gạch đầu dòng cụ thể.',
        '6. Mỗi tiết phải có hoạt động Mở đầu / Hình thành kiến thức / Luyện tập / Vận dụng đầy đủ, có thời lượng ước tính (5 phút / 15 phút...).',
        '7. Nếu là bài Vật Lý / Toán / Hóa có công thức — DÙNG đúng MathJax LaTeX: $\\vec{p}=m\\vec{v}$, $\\Delta p$, $E = \\frac{1}{2}mv^2$...',
        '8. Tên môn / lớp / tuần / ngày dạy — fill dựa trên prompt (nếu prompt không nói rõ thì suy luận hợp lý theo chủ đề bài học).',
        '9. CHỈ trả về thuần LaTeX hoàn chỉnh (từ \\documentclass đến \\end{document}). KHÔNG markdown code fence, KHÔNG giải thích, KHÔNG mô tả thêm.',
      ].join('\n');

      const userPrompt = [
        `YÊU CẦU CỦA GIÁO VIÊN:`,
        prompt.trim(),
        '',
        `TEMPLATE LATEX (fill nội dung vào, giữ nguyên cấu trúc):`,
        '```',
        template.trim(),
        '```',
      ].join('\n');

      const result = await fal.complete({
        messages: [{ role: 'user', content: userPrompt }],
        system: sysPrompt,
      });
      let latex = (result?.content || '').trim();
      // Strip code fence nếu AI vẫn trả về dù đã dặn không
      const fenceMatch = latex.match(/^```(?:latex|tex)?\s*([\s\S]*?)\s*```$/);
      if (fenceMatch) latex = fenceMatch[1].trim();
      // Sanity check: phải bắt đầu bằng \documentclass
      if (!latex.includes('\\documentclass') || !latex.includes('\\end{document}')) {
        console.warn(`[latex:ai-fill] ⚠ AI output không hợp lệ (missing documentclass/end), trả raw cho FE`);
      }

      console.log(`[latex:ai-fill-template] ✅ user=${userId} promptLen=${prompt.length} tplLen=${template.length} outLen=${latex.length} took=${Date.now() - t0}ms`);
      return res.json({ latex });
    } catch (err) {
      console.error('[latex:ai-fill-template] ❌', err?.message || err);
      return res.status(500).json({ error: err?.message || 'AI generate failed' });
    }
  });

  app.post('/api/latex-projects/export-from-exam', (_req, res) => {
    res.status(501).json({ error: 'Tính năng đang phát triển' });
  });
  app.post('/api/latex-projects/export-from-matrix', (_req, res) => {
    res.status(501).json({ error: 'Tính năng đang phát triển' });
  });

  // GET /api/latex-projects/:id/versions → lịch sử lưu (auto-save snapshots).
  // Bảng "LatexProjectVersion" tự create lazy nếu chưa có.
  app.get('/api/latex-projects/:id/versions', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getLPool();
      // Verify ownership
      const { rows: own } = await pool.query(
        `SELECT id FROM "LatexProject" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!own[0]) return res.status(404).json({ error: 'Không tìm thấy' });
      // Auto-create table nếu chưa
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "LatexProjectVersion" (
          id            TEXT PRIMARY KEY,
          "projectId"   TEXT NOT NULL,
          "mainContent" TEXT NOT NULL,
          "titleSnapshot" TEXT,
          trigger       TEXT NOT NULL DEFAULT 'save',
          "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_latex_version_project ON "LatexProjectVersion" ("projectId");
      `).catch(() => {});
      const { rows } = await pool.query(
        `SELECT id, "titleSnapshot", trigger, "createdAt"
         FROM "LatexProjectVersion" WHERE "projectId"=$1 ORDER BY "createdAt" DESC LIMIT 50`,
        [req.params.id]
      );
      return res.json({ versions: rows });
    } catch (err) {
      console.error('[latex:versions] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Collaborators (stub — tính năng chia sẻ chưa implement đầy đủ) ────────
  // Frontend gọi khi GV mở Share dialog. Trả mảng rỗng để tránh 503 từ
  // aero-backend catch-all khi route không tồn tại.
  app.get('/api/latex-projects/:id/collaborators', async (req, res) => {
    const userId = getLatexUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ collaborators: [] });
  });

  app.post('/api/latex-projects/:id/collaborators', async (req, res) => {
    const userId = getLatexUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // Stub — tính năng invite chưa implement: trả 501 thay vì 503
    return res.status(501).json({ error: 'Tính năng chia sẻ đang phát triển' });
  });

  app.delete('/api/latex-projects/:id/collaborators/:userId', async (req, res) => {
    const userId = getLatexUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    return res.status(501).json({ error: 'Tính năng chia sẻ đang phát triển' });
  });

  // POST /api/latex-projects/:id/versions/restore — khôi phục version ─────
  app.post('/api/latex-projects/:id/versions/restore', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { versionId } = req.body || {};
      if (!versionId) return res.status(400).json({ error: 'versionId required' });
      const pool = getLPool();
      // Lấy content từ version snapshot
      const { rows: vRows } = await pool.query(
        `SELECT v."contentSnapshot", v."titleSnapshot"
         FROM "LatexProjectVersion" v
         JOIN "LatexProject" p ON p.id = v."projectId"
         WHERE v.id = $1 AND p."userId" = $2 LIMIT 1`,
        [versionId, userId]
      );
      if (!vRows[0]) return res.status(404).json({ error: 'Version không tồn tại' });
      const { contentSnapshot, titleSnapshot } = vRows[0];
      // Cập nhật project với content của version được chọn
      const sets = [`"mainContent"=$3`, `"updatedAt"=NOW()`];
      const vals = [req.params.id, userId, contentSnapshot || ''];
      if (titleSnapshot) { sets.push(`title=$4`); vals.push(titleSnapshot); }
      await pool.query(
        `UPDATE "LatexProject" SET ${sets.join(', ')} WHERE id=$1 AND "userId"=$2`,
        vals
      );
      return res.json({ ok: true, content: contentSnapshot || '', title: titleSnapshot });
    } catch (err) {
      console.error('[latex:restore] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/latex-projects/:id/to-exam — convert LaTeX → Exam + Questions
  // Pipeline: LatexProject.mainContent → fal.ai extract → INSERT Exam + Question
  // → return {examId} để UI navigate sang trang làm bài chuẩn Bộ.
  app.post('/api/latex-projects/:id/to-exam', async (req, res) => {
    const t0 = Date.now();
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getLPool();

      // Fetch project
      const { rows: prjRows } = await pool.query(
        `SELECT * FROM "LatexProject" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!prjRows[0]) return res.status(404).json({ error: 'Tài liệu không tồn tại' });
      const project = prjRows[0];
      const content = String(project.mainContent || '').trim();
      if (content.length < 50) return res.status(400).json({ error: 'Tài liệu quá ngắn để extract' });

      // Strip một số LaTeX commands khó parse (giữ text + công thức)
      const stripped = content
        .replace(/\\documentclass[^\n]*\n/g, '')
        .replace(/\\usepackage[^\n]*\n/g, '')
        .replace(/\\begin\{document\}|\\end\{document\}/g, '')
        .replace(/\\geometry\{[^}]*\}/g, '')
        .replace(/\\textbf\{([^}]*)\}/g, '$1')
        .replace(/\\textit\{([^}]*)\}/g, '$1')
        .replace(/\\hfill|\\\\|\\noindent|\\vspace\{[^}]*\}/g, '\n')
        .trim();

      // Extract via fal.ai (text mode)
      const { extractQuestionsFromText } = require('./lib/fal-quiz-extractor.cjs');
      const { subject, grade, count } = req.body || {};
      let result;
      try {
        result = await extractQuestionsFromText(stripped, {
          subject: subject || 'Vật lí',
          grade: grade || '11',
          language: 'Vietnamese',
          count: Number(count) || 40,
        });
      } catch (extractErr) {
        console.error('[latex:to-exam] extract failed:', extractErr.message.slice(0, 500));
        return res.status(422).json({
          error: 'AI không đọc được nội dung đề. Hãy kiểm tra: (1) tài liệu đã có câu hỏi rõ ràng, (2) cấu trúc 3 phần (PHẦN I trắc nghiệm / PHẦN II Đúng-Sai / PHẦN III trả lời ngắn) nếu theo chuẩn Bộ.',
          detail: extractErr.message.slice(0, 300),
        });
      }
      const questions = result.questions || [];
      if (questions.length === 0) {
        return res.status(422).json({
          error: 'AI trích xuất xong nhưng không tìm thấy câu hỏi nào. Đảm bảo tài liệu có các câu "Câu 1.", "Câu 2." rõ ràng kèm các đáp án A/B/C/D.',
        });
      }
      // Đếm theo từng phần để log
      const counts = {
        mcq:  questions.filter(q => q.questionType === 'MULTIPLE_CHOICE').length,
        tf:   questions.filter(q => q.questionType === 'TRUE_FALSE').length,
        sa:   questions.filter(q => q.questionType === 'SHORT_ANSWER').length,
      };
      console.log(`[latex:to-exam] AI extracted ${questions.length}Q: PHẦN I=${counts.mcq}, II=${counts.tf}, III=${counts.sa}`);

      // Insert Exam + ExamQuestion + Question (transaction)
      // Default public=true vì teacher đang share với học sinh ngay sau khi
      // tạo từ LaTeX (use case chính). Có thể tắt qua body.public=false.
      const isPublic = req.body?.public !== false;
      const examStatus = req.body?.status || (isPublic ? 'Đang diễn ra' : 'Nháp');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const examId = latexUUID();
        const now = new Date();
        const examTitle = `${project.title} — Đề thi`;
        const desc = JSON.stringify({
          subject: subject || 'Vật lí',
          grade: String(grade || '11'),
          source: 'latex-import',
          notes: `Tạo từ tài liệu LaTeX: ${project.title}`,
          public: isPublic,
          publishedAt: now.toISOString(),
        });

        await client.query(
          `INSERT INTO "Exam"
             (id, title, description, "examType", duration, "totalScore",
              "totalQuestions", status, "matrixId", "userId", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,'Trắc nghiệm',45,$4,$5,$6,NULL,$7,$8,$8)`,
          [examId, examTitle, desc, questions.length, questions.length, examStatus, userId, now]
        );

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const qid = latexUUID();
          await client.query(
            `INSERT INTO "Question"
               (id, topic, subject, grade, "questionType", difficulty, content,
                options, "correctAnswer", explanation, "qualityScore", "usageCount",
                "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,'medium',$6,$7,$8,$9,0,0,true,false,'active',$10,$11,$11)`,
            [
              qid,
              (q.topic && String(q.topic).trim()) || subject || 'Vật lí',
              subject || 'Vật lí', String(grade || '11'),
              String(q.questionType || 'MULTIPLE_CHOICE'),
              String(q.content || ''),
              Array.isArray(q.options) ? q.options.map(String) : [],
              String(q.correctAnswer || ''),
              q.explanation || '',
              userId, now,
            ]
          );
          await client.query(
            `INSERT INTO "ExamQuestion" (id, "examId", "questionId", "order", points)
             VALUES ($1,$2,$3,$4,1)`,
            [latexUUID(), examId, qid, i + 1]
          );
        }
        await client.query('COMMIT');
        console.log(`[latex:to-exam] ✅ project=${project.id.slice(0,8)} → exam=${examId.slice(0,8)} (${questions.length}Q, public=${isPublic}, ${Date.now()-t0}ms)`);
        return res.json({
          ok: true, examId,
          totalQuestions: questions.length,
          isPublic, status: examStatus,
          examTitle,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally { client.release(); }
    } catch (err) {
      console.error('[latex:to-exam] ❌', err.message.slice(0, 300));
      return res.status(500).json({ error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════
  // PDF-ONLY EXAM — KHÔNG trích xuất câu hỏi.
  // GV xem PDF làm hình đề; HS quan sát PDF + tô đáp án bên phải.
  // ══════════════════════════════════════════════════════════

  // POST /api/latex-projects/:id/to-pdf-exam
  // Body: {
  //   title?: string,
  //   phanIAnswers?: "ABCDA..." (chuỗi nhiều ký tự A-D, mỗi ký tự = 1 câu),
  //   phanIIAnswers?: ["TFFT", "TTFF", ...] (mỗi phần tử là 4 ký tự T/F),
  //   phanIIIAnswers?: ["0.4", "12.5", ...] (mỗi phần tử là 1 số/chuỗi),
  //   subject?, grade?, duration?, public?
  // }
  // Tạo Exam KHÔNG có Question rows. Học sinh dùng /exam-sheet để xem PDF
  // + tô bảng trả lời. Backend chấm bằng answerKey lưu trong description.
  app.post('/api/latex-projects/:id/to-pdf-exam', async (req, res) => {
    const t0 = Date.now();
    // Helper retry 1 lần nếu pool timeout (Neon cold start)
    const queryWithRetry = async (pool, sql, params) => {
      try {
        return await pool.query(sql, params);
      } catch (err) {
        if (/Connection terminated|connection timeout|timeout/i.test(err.message)) {
          console.warn('[latex:to-pdf-exam] pool retry after:', err.message);
          await new Promise(r => setTimeout(r, 500));
          return await pool.query(sql, params);
        }
        throw err;
      }
    };
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getLPool();
      const { rows: prjRows } = await queryWithRetry(pool,
        `SELECT id, title, "mainContent" FROM "LatexProject"
          WHERE id = $1 AND "userId" = $2 LIMIT 1`,
        [req.params.id, userId]
      );
      if (!prjRows[0]) return res.status(404).json({ error: 'Tài liệu không tồn tại' });
      const project = prjRows[0];

      // Sanitize answer key from body
      const body = req.body || {};
      const phanIRaw = String(body.phanIAnswers || '').toUpperCase().replace(/[^ABCD]/g, '');
      const phanII = Array.isArray(body.phanIIAnswers)
        ? body.phanIIAnswers.map(s => {
            const t = String(s || '').toUpperCase().replace(/[^TF\-]/g, '');
            return t.slice(0, 4).padEnd(4, '-');
          })
        : [];
      const phanIII = Array.isArray(body.phanIIIAnswers)
        ? body.phanIIIAnswers.map(s => String(s ?? '').trim())
        : [];
      // PHẦN IV — Tự luận: mỗi câu có rubric (tiêu chí chấm) + maxScore.
      // AI sẽ so sánh bài làm HS với rubric để chấm.
      const phanIV = Array.isArray(body.phanIVQuestions)
        ? body.phanIVQuestions
            .map(q => ({
              rubric: String(q?.rubric ?? '').trim(),
              maxScore: Math.max(0, Math.min(10, Number(q?.maxScore) || 1)),
            }))
            .filter(q => q.rubric.length > 0)
        : [];

      const sectionCounts = {
        phanI:   phanIRaw.length,
        phanII:  phanII.length,
        phanIII: phanIII.length,
        phanIV:  phanIV.length,
      };
      const totalQuestions = sectionCounts.phanI + sectionCounts.phanII + sectionCounts.phanIII + sectionCounts.phanIV;
      if (totalQuestions === 0) {
        return res.status(400).json({
          error: 'Cần nhập ít nhất 1 đáp án (PHẦN I / II / III / IV)',
        });
      }

      const isPublic = body.public !== false;
      const examStatus = body.status || (isPublic ? 'Đang diễn ra' : 'Nháp');
      const duration = Number(body.duration) || 90;
      const examId = latexUUID();
      const now = new Date();
      const examTitle = String(body.title || `${project.title} — Đề thi PDF`).slice(0, 200);
      const desc = JSON.stringify({
        subject: body.subject || 'Vật lí',
        grade: String(body.grade || '11'),
        source: 'pdf-only',
        examMode: 'pdf-only',
        latexProjectId: project.id,
        sectionCounts,
        answerKey: {
          phanI: phanIRaw,
          phanII,
          phanIII,
          phanIV,  // [{ rubric, maxScore }]
        },
        notes: `Đề PDF-only từ tài liệu LaTeX: ${project.title}`,
        public: isPublic,
        publishedAt: now.toISOString(),
      });
      // totalScore = tổng điểm Phần I/II/III (1đ/câu) + sum maxScore Phần IV
      const totalScore = (sectionCounts.phanI + sectionCounts.phanII + sectionCounts.phanIII)
        + phanIV.reduce((s, q) => s + (Number(q.maxScore) || 0), 0);
      await queryWithRetry(pool,
        `INSERT INTO "Exam"
           (id, title, description, "examType", duration, "totalScore",
            "totalQuestions", status, "matrixId", "userId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,'PDF + Phiếu trả lời',$4,$5,$6,$7,NULL,$8,$9,$9)`,
        [examId, examTitle, desc, duration, totalScore, totalQuestions, examStatus, userId, now]
      );
      console.log(`[latex:to-pdf-exam] ✅ project=${project.id.slice(0,8)} → exam=${examId.slice(0,8)} (I=${sectionCounts.phanI}, II=${sectionCounts.phanII}, III=${sectionCounts.phanIII}, IV=${sectionCounts.phanIV}, ${Date.now()-t0}ms)`);
      return res.json({
        ok: true,
        examId,
        examTitle,
        totalQuestions,
        sectionCounts,
        isPublic,
        status: examStatus,
      });
    } catch (err) {
      console.error('[latex:to-pdf-exam] ❌', err.message.slice(0, 300));
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/exams/:id/pdf — stream PDF của LaTeX project gốc (cho pdf-only exam)
  // Public nếu exam isPublic, owner luôn được.
  app.get('/api/exams/:id/pdf', async (req, res) => {
    try {
      const pool = getLPool();
      // Fetch exam
      const { rows: examRows } = await pool.query(
        `SELECT id, description, "userId" FROM "Exam" WHERE id = $1 LIMIT 1`,
        [req.params.id]
      );
      if (!examRows[0]) return res.status(404).json({ error: 'Đề thi không tồn tại' });
      const desc = (() => { try { return JSON.parse(examRows[0].description || '{}'); } catch { return {}; } })();
      const userId = getLatexUserId(req);
      const isOwner = userId && examRows[0].userId === userId;
      if (!isOwner && !desc.public) {
        return res.status(403).json({ error: 'Đề chưa công khai' });
      }
      if (desc.examMode !== 'pdf-only' || !desc.latexProjectId) {
        return res.status(400).json({ error: 'Đề này không phải dạng PDF-only' });
      }
      // Fetch LaTeX content
      const { rows: prjRows } = await pool.query(
        `SELECT "mainContent" FROM "LatexProject" WHERE id = $1 LIMIT 1`,
        [desc.latexProjectId]
      );
      if (!prjRows[0]) return res.status(404).json({ error: 'Tài liệu nguồn không tồn tại' });
      const rawContent = String(prjRows[0].mainContent || '');
      if (!rawContent) return res.status(404).json({ error: 'Tài liệu rỗng' });

      // Pre-process giống /api/latex-projects/compile: strip pdflatex packages,
      // inject fontspec cho Vietnamese, strip "\\" đầu dòng (vertical mode bug).
      // Trước đây endpoint này KHÔNG có preprocess → fail "There's no line here".
      let content = rawContent;
      content = content.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{inputenc\}\s*\n?/g, '');
      content = content.replace(/\\usepackage\s*\[\s*[A-Za-z0-9]+\s*\]\s*\{fontenc\}\s*\n?/g, '');
      content = content.replace(/\\usepackage\s*\{fontenc\}\s*\n?/g, '');
      content = content.replace(/\\usepackage\s*\{(vntex|vncaps)\}\s*\n?/g, '');
      const hasVietnamesebabel = /\\usepackage\s*\[\s*vietnamese\s*\]\s*\{babel\}/.test(content);
      if (hasVietnamesebabel) {
        content = content.replace(/\\usepackage\s*\[\s*vietnamese\s*\]\s*\{babel\}\s*\n?/g, '');
      }
      const hasFontspec = /\\usepackage\s*(\[[^\]]*\])?\s*\{fontspec\}/.test(content);
      const hasVietnamese = hasVietnamesebabel || /[À-ỿ]/.test(content);
      if (hasVietnamese && !hasFontspec) {
        content = content.replace(
          /(\\documentclass[^\n]*\n)/,
          '$1% [auto-injected for tectonic XeLaTeX]\n'
          + '\\usepackage{fontspec}\n'
          + '\\defaultfontfeatures{Ligatures=TeX}\n'
          + '\\setmainfont{Latin Modern Roman}\n'
        );
      }
      // Strip "\\" ở đầu dòng (vertical mode → "There's no line here to end")
      content = content.replace(/^[ \t]*\\\\(\s)/gm, '$1');

      // Compile via tectonic (giống endpoint /api/latex-projects/compile)
      const { spawn } = require('child_process');
      const fs = require('fs').promises;
      const os = require('os');
      const path = require('path');
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfexam-'));
      const inFile = path.join(tmpDir, 'input.tex');
      const outFile = path.join(tmpDir, 'input.pdf');
      try {
        await fs.writeFile(inFile, content, 'utf8');
        await new Promise((resolve, reject) => {
          const proc = spawn('tectonic',
            ['--outdir', tmpDir, '--keep-logs', '--reruns', '1',
             '--chatter', 'minimal', inFile],
            { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000 }
          );
          let stderr = '';
          proc.stdout.on('data', d => stderr += d.toString());
          proc.stderr.on('data', d => stderr += d.toString());
          proc.on('close', code => code === 0 ? resolve() : reject(new Error(`tectonic exit ${code}: ${stderr.slice(0, 400)}`)));
          proc.on('error', err => reject(err));
        });
        const pdf = await fs.readFile(outFile);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdf.length);
        res.setHeader('Cache-Control', 'public, max-age=600'); // cache 10 phút
        res.send(pdf);
      } finally {
        try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
      }
    } catch (err) {
      console.error('[exams:pdf] ❌', err.message.slice(0, 300));
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/latex-projects/compile — compile LaTeX → PDF qua tectonic
  // (tectonic 0.15 single binary, cài trong Dockerfile, in-house không gửi
  // nội dung LaTeX của user ra service ngoài).
  // Body: { projectId?, content }
  // Response: PDF binary HOẶC JSON {error, log} nếu compile fail.
  app.post('/api/latex-projects/compile', async (req, res) => {
    const { spawn } = require('child_process');
    const fs = require('fs').promises;
    const fsSync = require('fs');
    const os = require('os');
    const path = require('path');

    const rawContent = String(req.body?.content || '').trim();
    if (!rawContent) return res.status(400).json({ error: 'Thiếu nội dung LaTeX' });
    if (rawContent.length > 200_000) {
      return res.status(413).json({ error: 'File LaTeX quá lớn (>200KB)' });
    }

    // ── Pre-process: tectonic dùng XeLaTeX (Unicode native), nhưng nhiều
    // file user import packages cho pdflatex (utf8 inputenc + T5 fontenc).
    // T5 fontenc làm font Vietnamese hỏng → diacritics thành ký tự lạ.
    // Transform: strip pdflatex-only packages, inject fontspec + Latin Modern.
    function makeXelatexCompat(src) {
      let s = src;
      // Strip inputenc (XeLaTeX luôn UTF-8 native)
      s = s.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{inputenc\}\s*\n?/g, '');
      // Strip fontenc với T5/T1/etc (XeLaTeX dùng fontspec/Unicode)
      s = s.replace(/\\usepackage\s*\[\s*[A-Za-z0-9]+\s*\]\s*\{fontenc\}\s*\n?/g, '');
      s = s.replace(/\\usepackage\s*\{fontenc\}\s*\n?/g, '');
      // Strip vntex / vncaps (Vietnamese-specific cho pdflatex)
      s = s.replace(/\\usepackage\s*\{(vntex|vncaps)\}\s*\n?/g, '');

      // Nếu user dùng [vietnamese]{babel}, strip babel hoàn toàn vì babel
      // vietnamese conflict với XeLaTeX trong nhiều case (shorthands, font
      // setup). XeLaTeX với fontspec + Latin Modern Roman (full Vietnamese
      // glyph coverage) là đủ cho VN text — không cần babel hyphenation.
      // Hyphenation cho Vietnamese không thật sự cần thiết (từ ngắn).
      const hasVietnamesebabel = /\\usepackage\s*\[\s*vietnamese\s*\]\s*\{babel\}/.test(s);
      if (hasVietnamesebabel) {
        s = s.replace(/\\usepackage\s*\[\s*vietnamese\s*\]\s*\{babel\}\s*\n?/g, '');
      }

      // Inject fontspec + font Unicode nếu cần. Latin Modern Roman + Noto Sans
      // đều ship sẵn với tectonic và support Vietnamese đầy đủ.
      const hasFontspec = /\\usepackage\s*(\[[^\]]*\])?\s*\{fontspec\}/.test(s);
      const hasVietnamese = hasVietnamesebabel || /[À-ỿ]/.test(s);
      if (hasVietnamese && !hasFontspec) {
        s = s.replace(
          /(\\documentclass[^\n]*\n)/,
          '$1% [auto-injected by server] tectonic XeLaTeX cần fontspec cho Unicode\n'
          + '\\usepackage{fontspec}\n'
          + '\\defaultfontfeatures{Ligatures=TeX}\n'
          + '\\setmainfont{Latin Modern Roman}\n'
        );
      }

      // ── Fix common LaTeX "vertical mode" bug ──────────────
      // Pattern phổ biến trong template VN: dùng "\\ A. option" ở đầu dòng
      // để tạo line break giữa các đáp án. LaTeX cho phép \\ trong horizontal
      // mode (giữa text trong paragraph), nhưng KHÔNG cho phép sau \section{},
      // \end{center}, \end{tikzpicture}, blank line, etc. (= vertical mode).
      //
      // Error: "There's no line here to end."
      //
      // Fix: strip "\\" ở đầu dòng → text sau "\\ " tự thành paragraph mới.
      // KHÔNG đụng tới "\\" ở cuối dòng (line break trong header minipage OK).
      s = s.replace(/^[ \t]*\\\\(\s)/gm, '$1');

      return s;
    }
    const content = makeXelatexCompat(rawContent);

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'latex-'));
    const inFile = path.join(tmpDir, 'input.tex');
    const outFile = path.join(tmpDir, 'input.pdf');
    const logFile = path.join(tmpDir, 'input.log');

    try {
      await fs.writeFile(inFile, content, 'utf8');

      // Spawn tectonic. --keep-logs để có log khi fail. --reruns để xử lý
      // cross-references (TOC, cite). --chatter minimal để giảm noise.
      await new Promise((resolve, reject) => {
        const proc = spawn('tectonic',
          ['--outdir', tmpDir, '--keep-logs', '--reruns', '1',
           '--chatter', 'minimal', inFile],
          { stdio: ['ignore', 'pipe', 'pipe'], timeout: 90_000 }
        );
        let stderr = '';
        proc.stdout.on('data', d => stderr += d.toString());
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
          if (code === 0) resolve();
          else {
            // Đọc thêm log file nếu có để báo chi tiết hơn
            let extraLog = '';
            try { extraLog = fsSync.readFileSync(logFile, 'utf8').slice(-3000); } catch {}
            reject(new Error(`tectonic exit ${code}\n${stderr}\n--- log tail ---\n${extraLog}`));
          }
        });
        proc.on('error', err => reject(err));
      });

      const pdf = await fs.readFile(outFile);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdf.length);
      res.setHeader('Cache-Control', 'no-store');
      console.log(`[latex:compile] ✅ pdf=${pdf.length}B src=${content.length}B`);
      return res.end(pdf);
    } catch (err) {
      // Log full error message (was truncated at 300 → mất phần error chính,
      // chỉ thấy warnings ở cuối).
      console.error('[latex:compile] ❌', err.message.slice(0, 2500));
      const isTimeout = /ETIMEDOUT|timeout/i.test(err.message);
      const isNoBin = /ENOENT|not found/i.test(err.message);
      if (isNoBin) {
        return res.status(501).json({
          error: 'Tectonic chưa được cài trong runtime',
          hint: 'Container Docker cần install tectonic. Liên hệ admin.',
        });
      }
      return res.status(isTimeout ? 504 : 422).json({
        error: isTimeout
          ? 'Biên dịch timeout (>90s) — file quá phức tạp'
          : 'Biên dịch thất bại',
        log: err.message.slice(0, 5000),
      });
    } finally {
      // Dọn temp dir bất kể success/fail
      fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  });
}
// LATEX_SERVICE_URL: DEPRECATED — built-in handlers thay thế.
// (proxy cũ đã xoá vì pixiai-latex Cloud Run service không còn tồn tại)

// ══════════════════════════════════════════════════════════════
// SAFE-DEFAULT STUBS — endpoints frontend gọi nhưng aero-backend Cloud Run
// không tồn tại trên prod. Trả empty/mock data 200 thay vì 503 ECONNREFUSED.
// Có thể implement sau khi cần real data.
// ══════════════════════════════════════════════════════════════
{
  const emptyArr = (_req, res) => res.json([]);
  const emptyObj = (_req, res) => res.json({});
  const okMsg   = (_req, res) => res.json({ ok: true });
  const notImpl = (msg = 'Tính năng đang phát triển') =>
    (_req, res) => res.status(501).json({ error: msg });

  // ─ Teacher / Class management ─────────────────────────────
  app.get('/api/teacher/students', (_req, res) => res.json({ students: [] }));
  app.get('/api/teacher/students/:id', (req, res) => res.json({ id: req.params.id, name: '—', email: '—' }));
  // ─ Class management — built-in CRUD + bulk import students từ Excel ─
  // Tables auto-create. Authentication: Bearer JWT.
  {
    const { Pool: ClsPool } = require('pg');
    const clsJwt = require('jsonwebtoken');
    const { randomUUID: clsUUID } = require('crypto');
    let _clsPool = null;
    let _clsReady = null;
    function getClsPool() {
      if (!_clsPool) {
        const url = process.env.DATABASE_URL;
        if (!url) return null;
        _clsPool = new ClsPool({ connectionString: url, max: 5,
          idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
      }
      return _clsPool;
    }
    async function ensureClsTables() {
      if (_clsReady) return _clsReady;
      const pool = getClsPool();
      if (!pool) return null;
      _clsReady = (async () => {
        await pool.query(`CREATE TABLE IF NOT EXISTS "TeacherClass" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          grade TEXT,
          subject TEXT,
          "schoolYear" TEXT,
          description TEXT,
          "teacherId" TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "TeacherClass_teacherId_idx"
          ON "TeacherClass"("teacherId")`);
        await pool.query(`CREATE TABLE IF NOT EXISTS "ClassStudent" (
          id TEXT PRIMARY KEY,
          "classId" TEXT NOT NULL,
          stt INT,
          mssv TEXT,
          name TEXT NOT NULL,
          dob TEXT,
          gender TEXT,
          email TEXT,
          phone TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          UNIQUE("classId", mssv)
        )`);
        await pool.query(`CREATE INDEX IF NOT EXISTS "ClassStudent_classId_idx"
          ON "ClassStudent"("classId")`);

        // ── Lazy schema migration cho prod table cũ ──
        // CREATE TABLE IF NOT EXISTS không update schema nếu table đã có sẵn
        // (vd Prisma migration cũ tạo trước với schema khác). Dùng ALTER TABLE
        // để: (1) ADD COLUMN IF NOT EXISTS thêm cột thiếu,
        //      (2) DROP NOT NULL trên những cột Prisma cũ mà code không biết.
        //
        // Bug discovered chronologically:
        //   - Deploy 203: 'column "mssv" does not exist'  → fix bằng ADD COLUMN
        //   - Deploy 204: '"studentId" violates not-null' → fix bằng DROP NOT NULL
        //
        // Strategy: thay vì gọi từng ALTER, dùng information_schema để DISCOVER
        // và DROP NOT NULL trên MỌI column không nằm trong whitelist của code.
        // Idempotent + an toàn (dữ liệu cũ vẫn còn).

        // (1) ADD COLUMN cho 7 cột code dùng
        const cols = [
          ['stt',    'INT'],
          ['mssv',   'TEXT'],
          ['name',   'TEXT'],
          ['dob',    'TEXT'],
          ['gender', 'TEXT'],
          ['email',  'TEXT'],
          ['phone',  'TEXT'],
        ];
        for (const [col, kind] of cols) {
          try {
            await pool.query(`ALTER TABLE "ClassStudent" ADD COLUMN IF NOT EXISTS "${col}" ${kind}`);
          } catch (e) {
            console.warn(`[classes] migrate ADD ${col}:`, e.message.slice(0, 100));
          }
        }
        try {
          await pool.query(`ALTER TABLE "ClassStudent" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW()`);
        } catch {}

        // (2) Discover & DROP NOT NULL trên cột ngoài whitelist
        // Whitelist = cột code biết về (id, classId, name, createdAt là NOT NULL của code)
        const knownCols = new Set([
          'id',         // PK NOT NULL OK
          'classId',    // FK NOT NULL OK
          'name',       // NOT NULL OK (tên HS bắt buộc)
          'createdAt',  // NOT NULL với DEFAULT OK
          // các cột khác đều nullable trong code:
          'stt', 'mssv', 'dob', 'gender', 'email', 'phone',
        ]);
        try {
          const r = await pool.query(`
            SELECT column_name
              FROM information_schema.columns
             WHERE table_name = 'ClassStudent'
               AND is_nullable = 'NO'
          `);
          for (const row of r.rows) {
            const col = row.column_name;
            if (knownCols.has(col)) continue;
            try {
              await pool.query(`ALTER TABLE "ClassStudent" ALTER COLUMN "${col}" DROP NOT NULL`);
              console.log(`[classes] migrate DROP NOT NULL ${col}`);
            } catch (e) {
              console.warn(`[classes] migrate DROP NOT NULL ${col}:`, e.message.slice(0, 100));
            }
          }
        } catch (e) {
          console.warn('[classes] migrate discover NOT NULL:', e.message.slice(0, 100));
        }

        // (3) Discover & DROP MỌI Foreign Key constraint trên ClassStudent
        // Bug deploy 204: 'classId violates FK ClassStudent_classId_fkey'
        // Lý do: Prisma cũ tạo FK trỏ tới bảng "Class" (Prisma model), nhưng
        // code mới INSERT classId trỏ tới "TeacherClass" → mismatch → fail.
        // Code Node.js manage relationships qua app logic (verify ownership,
        // ensure exists trước khi INSERT) → không cần DB FK.
        try {
          const fks = await pool.query(`
            SELECT conname
              FROM pg_constraint
             WHERE conrelid = '"ClassStudent"'::regclass
               AND contype = 'f'
          `);
          for (const row of fks.rows) {
            try {
              await pool.query(`ALTER TABLE "ClassStudent" DROP CONSTRAINT "${row.conname}"`);
              console.log(`[classes] migrate DROP FK ${row.conname}`);
            } catch (e) {
              console.warn(`[classes] migrate DROP FK ${row.conname}:`, e.message.slice(0, 100));
            }
          }
        } catch (e) {
          console.warn('[classes] migrate discover FK:', e.message.slice(0, 100));
        }

        console.log('[classes] ✅ tables ready (lazy migration ran)');
      })().catch(e => { console.error('[classes] ❌ ensureTables', e.message); _clsReady = null; });
      return _clsReady;
    }
    const CLS_JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
      || 'dev-secret-fallback-change-in-production!!';
    function getClsTeacherId(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        return clsJwt.verify(auth.slice(7), CLS_JWT_SECRET).sub || null;
      } catch { return null; }
    }

    // GET /api/classes — list classes của teacher
    app.get('/api/classes', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.json({ classes: [] });
        const pool = getClsPool();
        if (!pool) return res.json({ classes: [] });
        await ensureClsTables();
        const { rows } = await pool.query(
          `SELECT c.*,
                  (SELECT COUNT(*)::int FROM "ClassStudent" s WHERE s."classId" = c.id) AS "studentCount"
             FROM "TeacherClass" c
            WHERE c."teacherId" = $1
            ORDER BY c."createdAt" DESC`,
          [tid]
        );
        return res.json({ classes: rows });
      } catch (err) {
        console.error('[classes:list] ❌', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // GET /api/classes/:id — class detail
    app.get('/api/classes/:id', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.status(503).json({ error: 'DB not available' });
        await ensureClsTables();
        const { rows } = await pool.query(
          `SELECT * FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2 LIMIT 1`,
          [req.params.id, tid]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        return res.json({ class: rows[0] });
      } catch (err) {
        console.error('[classes:get] ❌', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // GET /api/classes/:id/students — list students của class
    // Trả về shape FE expect (nested student object + stats placeholders).
    // Bug deploy 205: trước trả flat ClassStudent rows → ClassDetail.tsx
    // expect s.student.name → render trống. Fix: map sang nested shape.
    app.get('/api/classes/:id/students', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.json({ students: [] });
        await ensureClsTables();
        // Verify ownership
        const own = await pool.query(`SELECT 1 FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2`,
          [req.params.id, tid]);
        if (own.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        const { rows } = await pool.query(
          `SELECT * FROM "ClassStudent" WHERE "classId"=$1 ORDER BY stt ASC NULLS LAST, name ASC`,
          [req.params.id]
        );
        // Map flat → nested (shape ClassDetail.tsx expect)
        const students = rows.map(r => ({
          id: r.id,
          studentId: r.id,             // dùng id ClassStudent cho DELETE :studentId
          student: {
            id:          r.id,
            name:        r.name || '',
            email:       r.email || '',
            idNumber:    r.mssv || '',
            dateOfBirth: r.dob  || '',
            gender:      r.gender || '',
          },
          studentNumber:  r.stt || null,
          attendanceRate: 0,           // placeholder — chưa có data attendance
          averageScore:   0,           // placeholder — sẽ tính từ StudentGrade sau
          totalXP:        0,
          completedExams: 0,
          passedExams:    0,
          status:         'active',
          enrollmentDate: r.createdAt,
        }));
        return res.json({ students });
      } catch (err) {
        console.error('[classes:students:list] ❌', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // DELETE /api/classes/:id/students/:studentId — xoá HS khỏi lớp
    // :studentId = ClassStudent.id (dùng id row, không phải User.id)
    app.delete('/api/classes/:id/students/:studentId', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.status(503).json({ error: 'DB not available' });
        await ensureClsTables();
        // Verify ownership của class
        const own = await pool.query(`SELECT 1 FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2`,
          [req.params.id, tid]);
        if (own.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        const { rowCount } = await pool.query(
          `DELETE FROM "ClassStudent" WHERE id=$1 AND "classId"=$2`,
          [req.params.studentId, req.params.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'HS không thuộc lớp này' });
        console.log(`[classes:student:delete] ✅ class=${req.params.id.slice(0,8)} student=${req.params.studentId.slice(0,8)}`);
        return res.json({ ok: true });
      } catch (err) {
        console.error('[classes:student:delete] ❌', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // POST /api/classes — tạo class mới
    // Body: { name, grade, schoolYear, subject?, description? }
    app.post('/api/classes', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.status(503).json({ error: 'DB not available' });
        await ensureClsTables();

        const { name, grade, schoolYear, subject, description } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Tên lớp là bắt buộc' });
        const id = clsUUID();
        const now = new Date();
        const { rows } = await pool.query(
          `INSERT INTO "TeacherClass" (id, name, grade, subject, "schoolYear", description, "teacherId", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
          [id, String(name).slice(0, 200), grade || null, subject || null,
           schoolYear || null, description || null, tid, now]
        );
        console.log(`[classes:create] ✅ id=${id.slice(0,8)} name=${name} teacher=${tid.slice(0,8)}`);
        return res.status(201).json({ success: true, class: rows[0], id });
      } catch (err) {
        console.error('[classes:create] ❌', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // POST /api/classes/:id/students/import — bulk import từ Excel parsed
    // Body: { students: [{stt, hoTen, ngaySinh, gioiTinh, maDinhDanh}] }
    //
    // Bug fix: trước dùng `ON CONFLICT ("classId", mssv) DO UPDATE` → require
    // UNIQUE constraint phải tồn tại. CREATE TABLE IF NOT EXISTS có khai báo
    // nhưng nếu table đã tồn tại từ trước KHÔNG có constraint, IF NOT EXISTS
    // không update schema → mọi INSERT throw "no unique or exclusion constraint
    // matching the ON CONFLICT specification" → catch → tất cả HS bị skip.
    //
    // Giờ: SELECT-then-INSERT/UPDATE explicit, không phụ thuộc constraint.
    // Cũng track riêng inserted vs updated cho user biết bao nhiêu HS mới vs cập nhật.
    // Trả về 3 sample errors đầu tiên để debug nếu vẫn fail.
    app.post('/api/classes/:id/students/import', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.status(503).json({ error: 'DB not available' });
        await ensureClsTables();

        // Verify ownership
        const own = await pool.query(`SELECT 1 FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2`,
          [req.params.id, tid]);
        if (own.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy lớp' });

        const students = Array.isArray(req.body?.students) ? req.body.students : [];
        if (students.length === 0) return res.status(400).json({ error: 'Không có học sinh nào để import' });

        let inserted = 0, updated = 0, skipped = 0;
        const errSamples = [];   // tối đa 3 ví dụ lỗi đầu tiên để debug
        const now = new Date();
        for (const s of students) {
          const name = String(s.hoTen || s.name || '').trim();
          const mssv = String(s.maDinhDanh || s.mssv || '').trim();
          const stt  = s.stt != null && !isNaN(Number(s.stt)) ? Number(s.stt) : null;
          const dob  = String(s.ngaySinh || s.dob || '').trim() || null;
          const gen  = String(s.gioiTinh || s.gender || '').trim() || null;
          if (!name) {
            skipped++;
            if (errSamples.length < 3) errSamples.push(`Dòng STT=${s.stt}: thiếu họ tên`);
            continue;
          }
          try {
            // Tìm row đã tồn tại theo (classId, mssv) — chỉ khi mssv có giá trị
            // Nếu mssv rỗng → luôn INSERT mới (mỗi import là HS riêng)
            let existingId = null;
            if (mssv) {
              const r = await pool.query(
                `SELECT id FROM "ClassStudent" WHERE "classId"=$1 AND mssv=$2 LIMIT 1`,
                [req.params.id, mssv]
              );
              existingId = r.rows[0]?.id || null;
            }
            if (existingId) {
              await pool.query(
                `UPDATE "ClassStudent"
                    SET stt=$2, name=$3, dob=$4, gender=$5
                  WHERE id=$1`,
                [existingId, stt, name, dob, gen]
              );
              updated++;
            } else {
              await pool.query(
                `INSERT INTO "ClassStudent"
                   (id, "classId", stt, mssv, name, dob, gender, "createdAt")
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [clsUUID(), req.params.id, stt, mssv || null, name, dob, gen, now]
              );
              inserted++;
            }
          } catch (err) {
            const msg = err.message.slice(0, 200);
            console.warn(`[classes:import] skip "${name}" (mssv=${mssv}): ${msg}`);
            if (errSamples.length < 3) errSamples.push(`HS "${name}" (MSSV ${mssv || 'rỗng'}): ${msg}`);
            skipped++;
          }
        }
        const total = students.length;
        console.log(`[classes:import] ✅ class=${req.params.id.slice(0,8)} inserted=${inserted} updated=${updated} skipped=${skipped} total=${total}`);
        // Compose user-friendly message
        const parts = [];
        if (inserted > 0) parts.push(`thêm mới ${inserted} HS`);
        if (updated  > 0) parts.push(`cập nhật ${updated} HS`);
        if (skipped  > 0) parts.push(`bỏ qua ${skipped}`);
        const message = parts.length
          ? 'Đã ' + parts.join(', ')
          : `Không xử lý được HS nào / ${total} dòng`;
        return res.json({
          success: inserted > 0 || updated > 0,
          message,
          results: { inserted, updated, skipped, total },
          ...(errSamples.length ? { errors: errSamples } : {}),
        });
      } catch (err) {
        console.error('[classes:import] ❌', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // DELETE /api/classes/:id
    app.delete('/api/classes/:id', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.status(503).json({ error: 'DB not available' });
        await pool.query(`DELETE FROM "ClassStudent" WHERE "classId" IN
          (SELECT id FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2)`,
          [req.params.id, tid]);
        const { rowCount } = await pool.query(
          `DELETE FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2`,
          [req.params.id, tid]
        );
        if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        return res.json({ success: true });
      } catch (err) {
        console.error('[classes:delete] ❌', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ════════════════════════════════════════════════════════════════
    // TEACHER SUBJECTS + STUDENT GRADES — Hồ sơ dạy học TT58/22-2021
    // ────────────────────────────────────────────────────────────────
    // 1 giáo viên có thể dạy nhiều môn trong 1 lớp:
    //   TeacherSubject(teacherId, classId, subject) — UNIQUE composite
    // Điểm theo TT58 (sửa đổi 22/2021/TT-BGDĐT):
    //   ĐĐGtx[]  — đánh giá thường xuyên (3-5 cột mỗi học kỳ)
    //   ĐĐGgk    — đánh giá giữa kỳ (hệ số 2)
    //   ĐĐGck    — đánh giá cuối kỳ (hệ số 3)
    //   ĐTBmhk   = (Σ ĐĐGtx + 2 ĐĐGgk + 3 ĐĐGck) / (số ĐĐGtx + 5)
    //   ĐTBmcn   = (ĐTBmhk1 + 2 ĐTBmhk2) / 3
    // ════════════════════════════════════════════════════════════════
    let _gradeReady = false;
    async function ensureGradeTables() {
      if (_gradeReady) return;
      const pool = getClsPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "TeacherSubject" (
          id           TEXT PRIMARY KEY,
          "teacherId"  TEXT NOT NULL,
          "classId"    TEXT NOT NULL,
          subject      TEXT NOT NULL,
          "schoolYear" TEXT,
          "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE("teacherId", "classId", subject)
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS "TeacherSubject_class_idx"
        ON "TeacherSubject"("classId")`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StudentGrade" (
          id              TEXT PRIMARY KEY,
          "classId"       TEXT NOT NULL,
          "studentId"     TEXT NOT NULL,
          "teacherId"     TEXT NOT NULL,
          subject         TEXT NOT NULL,
          semester        TEXT NOT NULL,
          ddgtx           JSONB NOT NULL DEFAULT '[]'::jsonb,
          ddggk           NUMERIC(4,2),
          ddgck           NUMERIC(4,2),
          "noteProgress"  TEXT,
          "noteRecord"    TEXT,
          "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE("classId", "studentId", subject, semester)
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS "StudentGrade_lookup_idx"
        ON "StudentGrade"("classId", subject, semester)`);
      _gradeReady = true;
    }

    // ── GET /api/classes/:id/subjects ── liệt kê môn GV này dạy ở lớp này
    // Bao gồm cả môn mặc định ghi trong TeacherClass.subject (nếu có) để
    // không vỡ data cũ trước feature này.
    app.get('/api/classes/:id/subjects', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.json({ subjects: [] });
        await ensureClsTables();
        await ensureGradeTables();
        // Verify ownership
        const own = await pool.query(
          `SELECT subject FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2 LIMIT 1`,
          [req.params.id, tid]
        );
        if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        const defaultSubject = own.rows[0].subject;
        const { rows } = await pool.query(
          `SELECT subject, "schoolYear", "createdAt"
             FROM "TeacherSubject"
            WHERE "teacherId"=$1 AND "classId"=$2
            ORDER BY "createdAt" ASC`,
          [tid, req.params.id]
        );
        const subjects = rows.map(r => r.subject);
        // Auto-include legacy default subject if not yet in TeacherSubject
        if (defaultSubject && !subjects.includes(defaultSubject)) {
          subjects.unshift(defaultSubject);
        }
        return res.json({ subjects });
      } catch (err) {
        console.error('[classes:subjects:list]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/classes/:id/subjects { subject }
    app.post('/api/classes/:id/subjects', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.status(503).json({ error: 'DB not available' });
        await ensureGradeTables();
        const subject = String(req.body?.subject || '').trim();
        if (!subject) return res.status(400).json({ error: 'Thiếu tên môn' });
        const own = await pool.query(
          `SELECT "schoolYear" FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2 LIMIT 1`,
          [req.params.id, tid]
        );
        if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        await pool.query(
          `INSERT INTO "TeacherSubject" (id, "teacherId", "classId", subject, "schoolYear")
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT ("teacherId","classId",subject) DO NOTHING`,
          [clsUUID(), tid, req.params.id, subject.slice(0, 100), own.rows[0].schoolYear || null]
        );
        return res.status(201).json({ ok: true, subject });
      } catch (err) {
        console.error('[classes:subjects:add]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── DELETE /api/classes/:id/subjects/:subject
    app.delete('/api/classes/:id/subjects/:subject', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        await pool.query(
          `DELETE FROM "TeacherSubject"
            WHERE "teacherId"=$1 AND "classId"=$2 AND subject=$3`,
          [tid, req.params.id, decodeURIComponent(req.params.subject)]
        );
        return res.json({ ok: true });
      } catch (err) {
        console.error('[classes:subjects:del]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/teacher/gradebook ── full ma trận điểm
    // Query: classId, subject, semester (HK1|HK2)
    // Trả về { students: [{id, stt, name, mssv, dob, gender}],
    //          grades: { [studentId]: { ddgtx, ddggk, ddgck, noteProgress, noteRecord } } }
    app.get('/api/teacher/gradebook', async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.json({ students: [], grades: {} });
        await ensureClsTables();
        await ensureGradeTables();
        const classId = String(req.query.classId || '').trim();
        const subject = String(req.query.subject || '').trim();
        const semester = String(req.query.semester || 'HK2').trim();
        if (!classId || !subject) {
          return res.status(400).json({ error: 'Thiếu classId hoặc subject' });
        }
        // Ownership check
        const own = await pool.query(
          `SELECT 1 FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2 LIMIT 1`,
          [classId, tid]
        );
        if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        // Students
        const sRes = await pool.query(
          `SELECT id, stt, mssv, name, dob, gender
             FROM "ClassStudent"
            WHERE "classId"=$1
            ORDER BY stt ASC NULLS LAST, name ASC`,
          [classId]
        );
        // Grades
        const gRes = await pool.query(
          `SELECT "studentId", ddgtx, ddggk, ddgck, "noteProgress", "noteRecord"
             FROM "StudentGrade"
            WHERE "classId"=$1 AND subject=$2 AND semester=$3`,
          [classId, subject, semester]
        );
        const grades = {};
        for (const g of gRes.rows) {
          grades[g.studentId] = {
            ddgtx: Array.isArray(g.ddgtx) ? g.ddgtx : [],
            ddggk: g.ddggk == null ? null : Number(g.ddggk),
            ddgck: g.ddgck == null ? null : Number(g.ddgck),
            noteProgress: g.noteProgress || '',
            noteRecord: g.noteRecord || '',
          };
        }
        return res.json({ students: sRes.rows, grades, classId, subject, semester });
      } catch (err) {
        console.error('[gradebook:get]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── POST /api/teacher/gradebook ── bulk save
    // Body: { classId, subject, semester, rows: [{studentId, ddgtx[], ddggk, ddgck, noteProgress, noteRecord}] }
    app.post('/api/teacher/gradebook', express.json({ limit: '2mb' }), async (req, res) => {
      try {
        const tid = getClsTeacherId(req);
        if (!tid) return res.status(401).json({ error: 'Unauthorized' });
        const pool = getClsPool();
        if (!pool) return res.status(503).json({ error: 'DB not available' });
        await ensureGradeTables();
        const { classId, subject, semester, rows } = req.body || {};
        if (!classId || !subject || !semester || !Array.isArray(rows)) {
          return res.status(400).json({ error: 'Thiếu classId/subject/semester/rows' });
        }
        const own = await pool.query(
          `SELECT 1 FROM "TeacherClass" WHERE id=$1 AND "teacherId"=$2 LIMIT 1`,
          [classId, tid]
        );
        if (!own.rows.length) return res.status(404).json({ error: 'Không tìm thấy lớp' });
        const clampScore = (v) => {
          if (v === null || v === undefined || v === '') return null;
          const n = Number(v);
          if (!Number.isFinite(n)) return null;
          return Math.max(0, Math.min(10, n));
        };
        let saved = 0;
        for (const r of rows) {
          if (!r.studentId) continue;
          const ddgtx = Array.isArray(r.ddgtx)
            ? r.ddgtx.map(clampScore).filter(x => x !== null)
            : [];
          await pool.query(
            `INSERT INTO "StudentGrade"
               (id, "classId", "studentId", "teacherId", subject, semester,
                ddgtx, ddggk, ddgck, "noteProgress", "noteRecord", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
             ON CONFLICT ("classId","studentId",subject,semester) DO UPDATE SET
               ddgtx        = EXCLUDED.ddgtx,
               ddggk        = EXCLUDED.ddggk,
               ddgck        = EXCLUDED.ddgck,
               "noteProgress" = EXCLUDED."noteProgress",
               "noteRecord"   = EXCLUDED."noteRecord",
               "updatedAt"  = NOW()`,
            [clsUUID(), classId, r.studentId, tid, subject, semester,
             JSON.stringify(ddgtx),
             clampScore(r.ddggk), clampScore(r.ddgck),
             r.noteProgress ? String(r.noteProgress).slice(0, 1000) : null,
             r.noteRecord   ? String(r.noteRecord).slice(0, 1000)   : null]
          );
          saved++;
        }
        console.log(`[gradebook:save] ✅ class=${classId.slice(0,8)} subj="${subject}" sem=${semester} rows=${saved}`);
        return res.json({ ok: true, saved });
      } catch (err) {
        console.error('[gradebook:save]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });
  }

  // ─ Public courses (Postgres-backed) ──────────────────────
  // FE shape: Course { id, name, title, description, imageUrl, price, level,
  //   duration, enrollCount, rating, isPublished, chapters[], instructor, tags }
  {
    const { Pool: CPool } = require('pg');
    let _cpool = null;
    function getCPool() {
      if (!_cpool && process.env.DATABASE_URL) {
        _cpool = new CPool({
          connectionString: process.env.DATABASE_URL,
          max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
        });
      }
      return _cpool;
    }

    // Map row PG → shape FE
    function mapCourseRow(r, chapters = [], teacherName = 'AeroEduVision') {
      return {
        id:           r.id,
        name:         r.title,           // FE dùng cả `name` lẫn `title`
        title:        r.title,
        slug:         r.id,
        description:  r.description || '',
        imageUrl:     r.imageUrl || null,
        image:        r.imageUrl || null,
        price:        Number(r.price || 0),
        regularPrice: Number(r.price || 0),
        beforePrice:  0,
        categoryId:   r.categoryId || null,
        categoryName: r.category_name || null,   // tên hiển thị (Vật lý, Hoá học, ...)
        isPublished:  !!r.isPublished,
        level:        'Trung cấp',
        duration:     chapters.reduce((s, c) => s + (c.duration || 30), 0),
        lessons:      chapters.length,
        enrollCount:  0,
        rating:       4.7,
        chapters:     chapters,
        instructor:   { name: teacherName, avatar: null, title: 'Giảng viên' },
        user:         { id: r.userId, name: teacherName, image: null },
        tags:         [],
        createdAt:    r.createdAt,
        updatedAt:    r.updatedAt,
      };
    }
    function mapChapterRow(r) {
      return {
        id:          r.id,
        name:        r.title,
        title:       r.title,
        description: r.description || '',
        duration:    Number(r.duration || 30),
        isFree:      !!r.isFree,
        isPublished: !!r.isPublished,
        position:    Number(r.position || 0),
        videoUrl:    r.videoUrl || null,
        progress:    0,
      };
    }

    // GET /api/courses — list public (paginated, only published courses từ teacher)
    app.get('/api/courses', async (req, res) => {
      const pool = getCPool();
      if (!pool) return res.json({ courses: [], total: 0 });
      try {
        const limit  = Math.min(parseInt(req.query.limit) || 48, 100);
        const offset = parseInt(req.query.offset) || 0;
        const { rows } = await pool.query(
          `SELECT c.*, u.name AS teacher_name, cat.name AS category_name
             FROM "Course" c
             LEFT JOIN "User"     u   ON u.id   = c."userId"
             LEFT JOIN "Category" cat ON cat.id = c."categoryId"
            WHERE c."isPublished" = true
            ORDER BY c."createdAt" DESC
            LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        // Batch-load chapter counts to populate `lessons` correctly
        const courseIds = rows.map(r => r.id);
        const chapMap = {};
        if (courseIds.length > 0) {
          try {
            const ch = await pool.query(
              `SELECT "courseId", COUNT(*)::int AS cnt, COALESCE(SUM(duration), 0)::int AS dur
                 FROM "Chapter"
                WHERE "courseId" = ANY($1) AND "isPublished" = true
                GROUP BY "courseId"`,
              [courseIds]
            );
            for (const r of ch.rows) chapMap[r.courseId] = { count: r.cnt, dur: r.dur };
          } catch (e) {
            if (!/relation .* does not exist/i.test(e.message)) {
              console.warn('[courses:list:chapters]', e.message);
            }
          }
        }
        const items = rows.map(r => {
          const stats = chapMap[r.id] || { count: 0, dur: 0 };
          // Pseudo-chapters array (chỉ count) để mapCourseRow tính được lessons + duration
          const fakeChapters = Array.from({ length: stats.count }, () => ({ duration: stats.count > 0 ? stats.dur / stats.count : 0 }));
          return mapCourseRow(r, fakeChapters, r.teacher_name || 'AeroEduVision');
        });
        res.json({ courses: items, items, total: items.length });
      } catch (e) {
        if (/relation .* does not exist/i.test(e.message)) return res.json({ courses: [], total: 0 });
        console.error('[courses:list]', e.message);
        res.json({ courses: [], total: 0 });
      }
    });

    // GET /api/courses/:id
    app.get('/api/courses/:id', async (req, res) => {
      const pool = getCPool();
      if (!pool) return res.status(404).json({ error: 'not found' });
      try {
        const { id } = req.params;
        const { rows } = await pool.query(
          `SELECT c.*, u.name AS teacher_name
             FROM "Course" c
             LEFT JOIN "User" u ON u.id = c."userId"
            WHERE c.id = $1
            LIMIT 1`,
          [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Course not found' });
        const course = rows[0];

        // Lấy chapters
        let chapters = [];
        try {
          const ch = await pool.query(
            `SELECT id, title, description, position, "isFree", "isPublished",
                    duration, "videoUrl", "courseId"
               FROM "Chapter"
              WHERE "courseId" = $1
              ORDER BY position ASC`,
            [id]
          );
          chapters = ch.rows.map(mapChapterRow);
        } catch (e) {
          if (!/relation .* does not exist/i.test(e.message)) {
            console.warn('[courses:get:chapters]', e.message);
          }
        }
        res.json(mapCourseRow(course, chapters, course.teacher_name || 'AeroEduVision'));
      } catch (e) {
        if (/relation .* does not exist/i.test(e.message)) return res.status(404).json({ error: 'not found' });
        console.error('[courses:get]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // GET /api/courses/:courseId/chapters/:chapterId
    app.get('/api/courses/:courseId/chapters/:chapterId', async (req, res) => {
      const pool = getCPool();
      if (!pool) return res.status(404).json({ error: 'not found' });
      try {
        const { rows } = await pool.query(
          `SELECT * FROM "Chapter" WHERE id = $1 AND "courseId" = $2 LIMIT 1`,
          [req.params.chapterId, req.params.courseId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Chapter not found' });
        res.json(mapChapterRow(rows[0]));
      } catch (e) {
        if (/relation .* does not exist/i.test(e.message)) return res.status(404).json({ error: 'not found' });
        console.error('[courses:chapter]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // GET /api/courses/:courseId/progress (đơn giản — luôn 0 cho user mới)
    app.get('/api/courses/:courseId/progress', (_req, res) => res.json(0));

    // POST /api/courses/:courseId/chapters/:chapterId/progress
    app.post('/api/courses/:courseId/chapters/:chapterId/progress', (_req, res) => res.json({ ok: true }));

    // GET /api/courses/dashboard — split completed/in-progress (empty mặc định)
    app.get('/api/courses/dashboard', (_req, res) =>
      res.json({ completedCourses: [], coursesInProgress: [] })
    );

    // ══════════════════════════════════════════════════════════
    // NEWS DRAFTS — Giáo viên soạn tin, Admin duyệt, public hiển thị
    // ══════════════════════════════════════════════════════════
    async function ensureNewsTable() {
      const pool = getCPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "NewsDraft" (
          id          TEXT PRIMARY KEY,
          slug        TEXT UNIQUE NOT NULL,
          title       TEXT NOT NULL,
          sapo        TEXT,
          body        TEXT,
          hero_image  TEXT,
          tags        TEXT,
          category    TEXT DEFAULT 'cong-nghe-giao-duc',
          status      TEXT NOT NULL DEFAULT 'PENDING',
          "authorId"  TEXT NOT NULL,
          "authorName" TEXT,
          "rejectReason" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "publishedAt" TIMESTAMPTZ,
          views       INTEGER DEFAULT 0
        )
      `);
    }
    function getUserFromAuth(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        const d = ljwt.verify(auth.slice(7), LJWT_SECRET);
        return { id: d.sub || d.userId, email: d.email, role: d.role || 'STUDENT', name: d.name };
      } catch { return null; }
    }
    function slugify(s) {
      return String(s).toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim().replace(/\s+/g, '-')
        .slice(0, 80) || `tin-${Date.now()}`;
    }

    // GET /api/news — public list (PUBLISHED)
    app.get('/api/news', async (_req, res) => {
      const pool = getCPool();
      if (!pool) return res.json({ items: [] });
      try {
        await ensureNewsTable();
        const { rows } = await pool.query(
          `SELECT * FROM "NewsDraft"
            WHERE status = 'PUBLISHED'
            ORDER BY "publishedAt" DESC NULLS LAST
            LIMIT 50`
        );
        res.json({ items: rows });
      } catch (e) {
        console.error('[news:public:list]', e.message);
        res.json({ items: [] });
      }
    });

    // GET /api/news/:slug — single PUBLISHED article
    app.get('/api/news/:slug', async (req, res) => {
      const pool = getCPool();
      if (!pool) return res.status(404).json({ error: 'not found' });
      try {
        await ensureNewsTable();
        const { rows } = await pool.query(
          `SELECT * FROM "NewsDraft" WHERE slug = $1 AND status = 'PUBLISHED' LIMIT 1`,
          [req.params.slug]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        // tăng view counter (không chặn response)
        pool.query(`UPDATE "NewsDraft" SET views = views + 1 WHERE id = $1`, [rows[0].id]).catch(() => {});
        res.json(rows[0]);
      } catch (e) {
        console.error('[news:public:get]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // POST /api/teacher/news — teacher tạo bài viết (status=PENDING)
    app.post('/api/teacher/news', async (req, res) => {
      const user = getUserFromAuth(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (!/TEACHER|ADMIN/i.test(user.role || '')) {
        return res.status(403).json({ error: 'Chỉ giáo viên mới được soạn tin' });
      }
      const pool = getCPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });
      try {
        await ensureNewsTable();
        const { title, sapo, body, heroImage, tags, category } = req.body || {};
        if (!title || !body) return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung' });
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        let slug = slugify(title);
        // ensure unique slug
        const existing = await pool.query('SELECT id FROM "NewsDraft" WHERE slug = $1', [slug]);
        if (existing.rows.length) slug = `${slug}-${id.slice(0, 6)}`;
        await pool.query(
          `INSERT INTO "NewsDraft"
             (id, slug, title, sapo, body, hero_image, tags, category,
              status, "authorId", "authorName")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,$10)`,
          [id, slug, title, sapo || '', body, heroImage || null,
           Array.isArray(tags) ? tags.join(',') : (tags || ''),
           category || 'cong-nghe-giao-duc',
           user.id, user.name || user.email]
        );
        res.status(201).json({ id, slug, status: 'PENDING' });
      } catch (e) {
        console.error('[news:teacher:create]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // GET /api/teacher/news/mine — teacher xem bài của mình
    app.get('/api/teacher/news/mine', async (req, res) => {
      const user = getUserFromAuth(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getCPool();
      if (!pool) return res.json({ items: [] });
      try {
        await ensureNewsTable();
        const { rows } = await pool.query(
          `SELECT * FROM "NewsDraft" WHERE "authorId" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
          [user.id]
        );
        res.json({ items: rows });
      } catch (e) {
        console.error('[news:teacher:mine]', e.message);
        res.json({ items: [] });
      }
    });

    // GET /api/admin/news/pending — admin xem queue
    app.get('/api/admin/news/pending', async (req, res) => {
      const user = getUserFromAuth(req);
      if (!user || !/ADMIN/i.test(user.role || '')) {
        return res.status(403).json({ error: 'Admin only' });
      }
      const pool = getCPool();
      if (!pool) return res.json({ items: [] });
      try {
        await ensureNewsTable();
        const { rows } = await pool.query(
          `SELECT * FROM "NewsDraft" WHERE status = 'PENDING' ORDER BY "createdAt" ASC LIMIT 100`
        );
        res.json({ items: rows });
      } catch (e) {
        console.error('[news:admin:pending]', e.message);
        res.json({ items: [] });
      }
    });

    // POST /api/admin/news/:id/approve
    app.post('/api/admin/news/:id/approve', async (req, res) => {
      const user = getUserFromAuth(req);
      if (!user || !/ADMIN/i.test(user.role || '')) {
        return res.status(403).json({ error: 'Admin only' });
      }
      const pool = getCPool();
      try {
        await pool.query(
          `UPDATE "NewsDraft" SET status='PUBLISHED', "publishedAt"=NOW(), "updatedAt"=NOW()
            WHERE id = $1`,
          [req.params.id]
        );
        res.json({ ok: true });
      } catch (e) {
        console.error('[news:admin:approve]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // POST /api/admin/news/:id/reject  body: { reason }
    app.post('/api/admin/news/:id/reject', async (req, res) => {
      const user = getUserFromAuth(req);
      if (!user || !/ADMIN/i.test(user.role || '')) {
        return res.status(403).json({ error: 'Admin only' });
      }
      const pool = getCPool();
      try {
        await pool.query(
          `UPDATE "NewsDraft" SET status='REJECTED', "rejectReason"=$2, "updatedAt"=NOW()
            WHERE id = $1`,
          [req.params.id, req.body?.reason || 'Không có lý do']
        );
        res.json({ ok: true });
      } catch (e) {
        console.error('[news:admin:reject]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // ══════════════════════════════════════════════════════════
    // EXAM XP — Cộng điểm thưởng sau khi làm bài
    // ══════════════════════════════════════════════════════════
    async function ensureXpTables() {
      const pool = getCPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "UserXP" (
          "userId"    TEXT PRIMARY KEY,
          "totalXp"   INTEGER NOT NULL DEFAULT 0,
          "examCount" INTEGER NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "ExamXpReward" (
          id           TEXT PRIMARY KEY,
          "userId"     TEXT NOT NULL,
          "examId"     TEXT NOT NULL,
          "playerName" TEXT,
          percentage   INTEGER NOT NULL,
          "xpEarned"   INTEGER NOT NULL,
          "isFirstTry" BOOLEAN NOT NULL DEFAULT true,
          "earnedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE ("userId", "examId")
        )
      `);
    }

    function calcXp(percentage, isFirstTry, perfect) {
      // Base: 0-50 XP theo %
      let xp = Math.round(Math.max(0, Math.min(100, percentage)) / 2);
      // Bonus first-try
      if (isFirstTry) xp += 10;
      // Perfect bonus
      if (perfect) xp += 20;
      // Min 5 XP cho participation
      return Math.max(5, xp);
    }

    // POST /api/exam-xp/award  body: { examId, percentage, playerName? }
    app.post('/api/exam-xp/award', async (req, res) => {
      const user = getUserFromAuth(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getCPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });
      try {
        await ensureXpTables();
        const { examId, percentage, playerName } = req.body || {};
        if (!examId || typeof percentage !== 'number') {
          return res.status(400).json({ error: 'Thiếu examId hoặc percentage' });
        }
        const pct = Math.round(Math.max(0, Math.min(100, percentage)));
        const perfect = pct === 100;

        // Check first-try
        const prior = await pool.query(
          `SELECT id, "xpEarned" FROM "ExamXpReward" WHERE "userId" = $1 AND "examId" = $2`,
          [user.id, examId]
        );
        const isFirstTry = prior.rows.length === 0;
        const xp = calcXp(pct, isFirstTry, perfect);

        if (isFirstTry) {
          // First time → insert + bump total
          const { randomUUID } = require('crypto');
          await pool.query(
            `INSERT INTO "ExamXpReward" (id, "userId", "examId", "playerName", percentage, "xpEarned", "isFirstTry")
             VALUES ($1,$2,$3,$4,$5,$6,true)`,
            [randomUUID(), user.id, examId, playerName || null, pct, xp]
          );
          await pool.query(
            `INSERT INTO "UserXP" ("userId", "totalXp", "examCount", "updatedAt")
             VALUES ($1, $2, 1, NOW())
             ON CONFLICT ("userId") DO UPDATE SET
               "totalXp" = "UserXP"."totalXp" + EXCLUDED."totalXp",
               "examCount" = "UserXP"."examCount" + 1,
               "updatedAt" = NOW()`,
            [user.id, xp]
          );
        }
        // Retake không trao XP nữa (chỉ retake bonus nhỏ 5xp đã tính ở base)
        // Nhưng vẫn cập nhật percentage nếu cao hơn lần trước
        else if (pct > (prior.rows[0].percentage || 0)) {
          await pool.query(
            `UPDATE "ExamXpReward" SET percentage = $1, "earnedAt" = NOW()
              WHERE "userId" = $2 AND "examId" = $3`,
            [pct, user.id, examId]
          );
        }

        // Invalidate teacher_exams cache — takerCount + recent takers thay đổi
        try { require('./lib/cache.cjs').del('examPrep:teacherExams:v2'); } catch {}

        // Trả tổng
        const total = await pool.query(
          `SELECT "totalXp", "examCount" FROM "UserXP" WHERE "userId" = $1`,
          [user.id]
        );
        const totalXp = total.rows[0]?.totalXp ?? xp;
        const examCount = total.rows[0]?.examCount ?? 1;
        // Tính cấp: mỗi level 100 XP
        const level = Math.floor(totalXp / 100) + 1;
        const nextLevelXp = level * 100;
        const xpToNext = Math.max(0, nextLevelXp - totalXp);

        res.json({
          xpEarned: isFirstTry ? xp : 0,
          isFirstTry,
          perfect,
          totalXp,
          examCount,
          level,
          xpToNext,
          nextLevelXp,
          message: isFirstTry
            ? perfect
              ? `🎉 Hoàn hảo! +${xp} XP (gồm +20 thưởng đạt 100%)`
              : `+${xp} XP (gồm +10 thưởng lần đầu)`
            : 'Đây là lần làm lại — không cộng XP mới',
        });
      } catch (e) {
        console.error('[xp:award]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // GET /api/exam-xp/me — tổng XP + lịch sử gần
    app.get('/api/exam-xp/me', async (req, res) => {
      const user = getUserFromAuth(req);
      if (!user) return res.json({ totalXp: 0, examCount: 0, level: 1, history: [] });
      const pool = getCPool();
      if (!pool) return res.json({ totalXp: 0, examCount: 0, level: 1, history: [] });
      try {
        await ensureXpTables();
        const total = await pool.query(
          `SELECT "totalXp", "examCount" FROM "UserXP" WHERE "userId" = $1`,
          [user.id]
        );
        const history = await pool.query(
          `SELECT id, "examId", percentage, "xpEarned", "earnedAt"
             FROM "ExamXpReward" WHERE "userId" = $1
             ORDER BY "earnedAt" DESC LIMIT 10`,
          [user.id]
        );
        const totalXp = total.rows[0]?.totalXp ?? 0;
        const examCount = total.rows[0]?.examCount ?? 0;
        const level = Math.floor(totalXp / 100) + 1;
        res.json({
          totalXp, examCount, level,
          nextLevelXp: level * 100,
          xpToNext: Math.max(0, level * 100 - totalXp),
          history: history.rows,
        });
      } catch (e) {
        console.error('[xp:me]', e.message);
        res.json({ totalXp: 0, examCount: 0, level: 1, history: [] });
      }
    });

    // ── AI entitlement check ─────────────────────────────────
    // GET /api/entitlements/check?feature=ai_tutor
    // Return { allowed: bool, plan: 'FREE'|'PREMIUM'|'PRO', reason: string }
    // Đơn giản: ADMIN/TEACHER được dùng AI; STUDENT free chỉ được dùng giới hạn.
    // Thực tế production sẽ tra Entitlement table; ở đây stub theo role.
    app.get('/api/entitlements/check', (req, res) => {
      const user = getUserFromAuth(req);
      const feature = req.query.feature || '';
      if (!user) return res.json({ allowed: false, plan: 'GUEST', reason: 'Vui lòng đăng nhập' });
      // Admin và teacher → cho phép full
      if (/ADMIN|TEACHER/i.test(user.role || '')) {
        return res.json({ allowed: true, plan: 'PRO', reason: 'Tài khoản chuyên nghiệp' });
      }
      // Free student: cho phép feature cơ bản, block các AI nâng cao
      const FREE_ALLOWED = new Set([
        'ai_tutor_basic', 'exam_basic',
      ]);
      const PREMIUM_ONLY = new Set([
        'ai_tutor_unlimited', 'ai_content_gen', 'ocr_digitize',
        'transcript_whisper', 'quiz_extract_ai', 'aura_3d',
      ]);
      if (FREE_ALLOWED.has(feature)) {
        return res.json({ allowed: true, plan: 'FREE', reason: 'Gói miễn phí' });
      }
      if (PREMIUM_ONLY.has(feature)) {
        return res.json({
          allowed: false, plan: 'FREE',
          reason: 'Tính năng này yêu cầu gói Premium hoặc Pro.',
          upgradeUrl: '/pricing',
        });
      }
      // Mặc định: cho phép (feature không khai báo)
      res.json({ allowed: true, plan: 'FREE', reason: 'OK' });
    });

    // ── Seed mock courses (idempotent) ──────────────────────
    // POST /api/admin/seed-mock-courses
    // - Tạo teacher@example.com (role=TEACHER) nếu chưa có
    // - Tạo 3 category Vật lý / Toán / Hoá
    // - UPSERT 6 khoá id c1..c6 + chapters c{N}-ch{P}
    // Yêu cầu: header X-Seed-Token = ENV SEED_TOKEN (mặc định "aero-seed-2026")
    app.post('/api/admin/seed-mock-courses', async (req, res) => {
      const token = req.header('X-Seed-Token') || req.query.token;
      const expected = process.env.SEED_TOKEN || 'aero-seed-2026';
      if (token !== expected) return res.status(401).json({ error: 'Invalid seed token' });

      const pool = getCPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });

      const TEACHER_EMAIL = 'teacher@example.com';
      const TEACHER_NAME  = 'Nguyễn Văn Thành';
      const DEMO_VIDEO    = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      const CATEGORIES = [
        { name: 'Vật lý' }, { name: 'Toán học' }, { name: 'Hoá học' },
      ];

      const COURSES = [
        {
          id: 'c1', cat: 'Vật lý',
          title: 'Vật lý 12 — Dao động và Sóng cơ',
          description: 'Khoá học toàn diện về dao động điều hoà, con lắc lò xo / con lắc đơn, sóng cơ và sóng âm. Đầy đủ lý thuyết + 200+ bài tập có lời giải chi tiết. Dành cho học sinh lớp 12 ôn thi THPT Quốc gia môn Vật lý.',
          imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
          price: 299000, isPublished: true,
          chapters: [
            { title: 'Dao động điều hoà — Khái niệm và phương trình', description: 'Định nghĩa dao động điều hoà, phương trình x = A·cos(ωt + φ), biên độ — tần số góc — pha ban đầu.', duration: 45, isFree: true,  isPublished: true },
            { title: 'Con lắc lò xo — Năng lượng và chu kỳ',           description: 'Phương trình con lắc lò xo, định luật bảo toàn năng lượng cơ học, chu kỳ T = 2π√(m/k).',     duration: 60, isFree: false, isPublished: true },
            { title: 'Con lắc đơn — Ứng dụng thực tế',                  description: 'Dao động của con lắc đơn, chu kỳ T = 2π√(l/g), ảnh hưởng nhiệt độ — vĩ độ — độ cao.',     duration: 55, isFree: false, isPublished: true },
            { title: 'Sóng cơ — Bản chất và đặc trưng',                description: 'Sóng cơ, sóng ngang/sóng dọc, các đại lượng đặc trưng (chu kỳ, tần số, bước sóng, vận tốc).', duration: 50, isFree: false, isPublished: true },
            { title: 'Giao thoa sóng & Sóng dừng',                      description: 'Điều kiện giao thoa, vị trí cực đại — cực tiểu, sóng dừng trên sợi dây.',                 duration: 65, isFree: false, isPublished: true },
            { title: 'Sóng âm — Đặc trưng vật lý và sinh lý',           description: 'Cường độ âm, mức cường độ âm L = 10·log(I/I₀), âm cơ bản — hoạ âm, hiệu ứng Doppler.',     duration: 40, isFree: false, isPublished: true },
          ],
        },
        {
          id: 'c2', cat: 'Vật lý',
          title: 'Vật lý 12 — Điện xoay chiều',
          description: 'Phân tích sâu mạch RLC nối tiếp, công suất tiêu thụ, hệ số công suất, máy biến áp và truyền tải điện năng. Phương pháp giản đồ Fresnel + số phức để giải nhanh bài tập.',
          imageUrl: 'https://images.unsplash.com/photo-1620714223084-8fcacc2dcea1?w=1200&q=80',
          price: 349000, isPublished: true,
          chapters: [
            { title: 'Đại cương dòng điện xoay chiều',         description: 'Suất điện động xoay chiều, giá trị hiệu dụng, biểu thức i(t) — u(t), pha của các đại lượng.', duration: 50, isFree: true,  isPublished: true },
            { title: 'Mạch thuần trở, thuần cảm, thuần dung',  description: 'Quan hệ pha u — i, cảm kháng Z_L = ωL, dung kháng Z_C = 1/(ωC).',                          duration: 55, isFree: false, isPublished: true },
            { title: 'Mạch R-L-C nối tiếp — Cộng hưởng điện', description: 'Tổng trở Z, độ lệch pha φ, điều kiện cộng hưởng ω² = 1/(LC).',                              duration: 70, isFree: false, isPublished: true },
            { title: 'Công suất và hệ số công suất',           description: 'P = UI·cosφ, ý nghĩa hệ số công suất, biện pháp nâng cao cosφ trong thực tế.',              duration: 45, isFree: false, isPublished: true },
            { title: 'Máy biến áp — Truyền tải điện năng',     description: 'Nguyên lý máy biến áp, công thức U₁/U₂ = N₁/N₂, hao phí trên đường dây.',                  duration: 50, isFree: false, isPublished: true },
          ],
        },
        {
          id: 'c3', cat: 'Vật lý',
          title: 'Luyện thi THPT — Vật lý Hạt nhân',
          description: 'Chuyên đề hạt nhân nguyên tử: cấu tạo, năng lượng liên kết, phóng xạ, phản ứng hạt nhân (phân hạch — nhiệt hạch). Giải chi tiết 200+ bài tập theo cấu trúc đề thi mới.',
          imageUrl: 'https://images.unsplash.com/photo-1532094349884-543559450146?w=1200&q=80',
          price: 199000, isPublished: true,
          chapters: [
            { title: 'Cấu tạo hạt nhân — Năng lượng liên kết', description: 'Số khối A, số proton Z, đồng vị, năng lượng liên kết ΔE = Δm·c², độ hụt khối.', duration: 45, isFree: true,  isPublished: true },
            { title: 'Phóng xạ — Định luật phân rã',            description: 'α, β⁻, β⁺, γ, định luật phân rã N(t) = N₀·e^(-λt), chu kỳ bán rã T.',         duration: 50, isFree: false, isPublished: true },
            { title: 'Phản ứng phân hạch và nhiệt hạch',        description: 'Phản ứng phân hạch dây chuyền, hệ số nhân nơtron, nhiệt hạch trong Mặt Trời.', duration: 55, isFree: false, isPublished: true },
            { title: 'Bài tập tổng hợp chương hạt nhân',        description: 'Tổng hợp 50+ bài tập tự luyện kèm lời giải, phân loại theo dạng & mức độ.',    duration: 90, isFree: false, isPublished: true },
          ],
        },
        {
          id: 'c4', cat: 'Toán học',
          title: 'Toán 12 — Giải tích (Đạo hàm & Tích phân)',
          description: 'Hệ thống lý thuyết và bài tập đạo hàm, tích phân, ứng dụng thực tế. Mỗi chương có 30+ bài luyện kèm video chữa chi tiết. Khoá học MIỄN PHÍ — chỉ cần đăng ký để học.',
          imageUrl: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=1200&q=80',
          price: 0, isPublished: true,
          chapters: [
            { title: 'Đạo hàm — Định nghĩa và quy tắc',                description: 'Định nghĩa đạo hàm, đạo hàm các hàm sơ cấp, quy tắc đạo hàm tổng/hiệu/tích/thương/hợp.',  duration: 50, isFree: true,  isPublished: true },
            { title: 'Ứng dụng đạo hàm — Cực trị, tiếp tuyến',         description: 'Tìm cực trị, viết PT tiếp tuyến, khảo sát hàm số, bài toán tối ưu thực tế.',             duration: 60, isFree: true,  isPublished: true },
            { title: 'Tích phân — Định nghĩa và bảng nguyên hàm',      description: 'Nguyên hàm, tích phân xác định, công thức Newton-Leibniz, phương pháp đổi biến.',         duration: 70, isFree: false, isPublished: true },
            { title: 'Ứng dụng tích phân — Diện tích, thể tích',       description: 'Diện tích hình phẳng, thể tích vật thể tròn xoay, ứng dụng vật lý (quãng đường — công).',   duration: 65, isFree: false, isPublished: true },
            { title: 'Đề thi thử THPT — Giải chi tiết',                description: '5 đề thi thử full, mỗi đề 50 câu trắc nghiệm có video chữa.',                              duration: 120, isFree: false, isPublished: true },
          ],
        },
        {
          id: 'c5', cat: 'Hoá học',
          title: 'Hoá học 12 — Hoá hữu cơ nâng cao',
          description: 'Chinh phục Hoá hữu cơ: ancol, anđehit, axit, este, amin, amino axit, protein, polime. Giải thích cơ chế phản ứng + 150+ bài tập chuyên đề THPT.',
          imageUrl: 'https://images.unsplash.com/photo-1628863353691-0071c8c1874c?w=1200&q=80',
          price: 249000, isPublished: true,
          chapters: [
            { title: 'Ancol — Phân loại và tính chất',  description: 'Cấu tạo, đồng phân, danh pháp, tính chất hoá học (tác dụng Na, axit, oxi hoá).',     duration: 50, isFree: true,  isPublished: true },
            { title: 'Anđehit và Axit cacboxylic',      description: 'Phản ứng tráng bạc, phản ứng với Cu(OH)₂, axit cacboxylic và tính chất chung.',     duration: 55, isFree: false, isPublished: true },
            { title: 'Este và Lipit',                   description: 'Phản ứng este hoá, xà phòng hoá, chất béo và phản ứng hidro hoá dầu thực vật.',      duration: 60, isFree: false, isPublished: true },
            { title: 'Amin — Amino axit — Protein',     description: 'Tính bazơ của amin, tính lưỡng tính của amino axit, peptit và phản ứng biure.',    duration: 55, isFree: false, isPublished: true },
            { title: 'Polime — Vật liệu polime',        description: 'Phân loại, điều chế (trùng hợp/trùng ngưng), ứng dụng polime tổng hợp & thiên nhiên.', duration: 45, isFree: false, isPublished: true },
          ],
        },
        {
          id: 'c6', cat: 'Vật lý',
          title: 'Vật lý Cơ học Nâng cao — Lab 3D Tương tác',
          description: 'Khám phá cơ học Newton bằng thí nghiệm 3D tương tác và phỏng vấn vật lý chuyên sâu. Phù hợp học sinh giỏi và sinh viên năm 1 vật lý đại cương.',
          imageUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=1200&q=80',
          price: 0, isPublished: true,
          chapters: [
            { title: 'Giới thiệu về Cơ học Newtonian',          description: 'Ba định luật Newton, lực — gia tốc — khối lượng, hệ quy chiếu quán tính.',         duration: 45, isFree: true,  isPublished: true },
            { title: 'Động lực học chuyển động thẳng',           description: 'Vận tốc, gia tốc, quãng đường, đồ thị chuyển động.',                              duration: 60, isFree: true,  isPublished: true },
            { title: 'Chuyển động tròn và lực hướng tâm',        description: 'Phân tích chuyển động tròn đều và không đều, lực hướng tâm F = mv²/r.',          duration: 55, isFree: false, isPublished: true },
            { title: 'Định luật bảo toàn năng lượng',            description: 'Cơ năng, thế năng trọng trường, động năng, định luật bảo toàn cơ năng.',         duration: 70, isFree: false, isPublished: true },
            { title: 'Va chạm và xung lượng',                    description: 'Va chạm đàn hồi, va chạm không đàn hồi, định luật bảo toàn động lượng.',         duration: 50, isFree: false, isPublished: true },
            { title: 'Dao động và sóng cơ — Phòng lab 3D',       description: 'Con lắc đơn, con lắc lò xo, sóng cơ trong phòng lab ảo 3D tương tác.',          duration: 65, isFree: false, isPublished: true },
          ],
        },
      ];

      const { randomUUID } = require('crypto');
      const log = [];

      try {
        // Đảm bảo các bảng + cột (tránh "relation does not exist" trên DB sạch)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "User" (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'STUDENT',
            "emailVerified" TIMESTAMPTZ,
            "twoFactorEnabled" BOOLEAN DEFAULT false,
            "failedLoginAttempts" INTEGER DEFAULT 0,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await pool.query(`CREATE TABLE IF NOT EXISTS "Category" (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL)`);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Course" (
            id TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            "imageUrl" TEXT,
            price NUMERIC,
            "categoryId" TEXT,
            "isPublished" BOOLEAN DEFAULT false,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "Chapter" (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            duration INTEGER,
            "videoUrl" TEXT,
            position INTEGER NOT NULL DEFAULT 1,
            "isPublished" BOOLEAN DEFAULT false,
            "isFree" BOOLEAN DEFAULT false,
            "courseId" TEXT NOT NULL,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        // Bổ sung column nếu Chapter cũ thiếu
        for (const [col, kind] of [['description','TEXT'],['duration','INTEGER'],['videoUrl','TEXT']]) {
          try { await pool.query(`ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "${col}" ${kind}`); } catch (e) { /* ignore */ }
        }

        // 1) Teacher
        const u = await pool.query('SELECT id FROM "User" WHERE email = $1 LIMIT 1', [TEACHER_EMAIL]);
        let teacherId;
        if (u.rows.length) {
          teacherId = u.rows[0].id;
          await pool.query(`UPDATE "User" SET role='TEACHER', name=$1 WHERE id=$2`, [TEACHER_NAME, teacherId]);
          log.push(`✅ Teacher exists: ${teacherId}`);
        } else {
          teacherId = randomUUID();
          await pool.query(
            `INSERT INTO "User" (id, email, name, role, "emailVerified")
             VALUES ($1, $2, $3, 'TEACHER', NOW())`,
            [teacherId, TEACHER_EMAIL, TEACHER_NAME]
          );
          log.push(`✅ Created teacher: ${TEACHER_EMAIL}`);
        }

        // 2) Categories
        const catMap = {};
        for (const cat of CATEGORIES) {
          const r = await pool.query('SELECT id FROM "Category" WHERE name = $1 LIMIT 1', [cat.name]);
          if (r.rows.length) {
            catMap[cat.name] = r.rows[0].id;
          } else {
            const id = randomUUID();
            await pool.query('INSERT INTO "Category" (id, name) VALUES ($1, $2)', [id, cat.name]);
            catMap[cat.name] = id;
            log.push(`✅ Created category: ${cat.name}`);
          }
        }

        // 3) Courses + chapters (UPSERT)
        let coursesCount = 0, chaptersCount = 0;
        for (let i = 0; i < COURSES.length; i++) {
          const c = COURSES[i];
          const created = new Date(Date.now() - (30 - i * 5) * 86400_000);
          const updated = new Date(Date.now() - (1 + i) * 86400_000);
          await pool.query(
            `INSERT INTO "Course"
               (id, "userId", title, description, "imageUrl", price,
                "isPublished", "categoryId", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (id) DO UPDATE SET
               "userId"=EXCLUDED."userId", title=EXCLUDED.title,
               description=EXCLUDED.description, "imageUrl"=EXCLUDED."imageUrl",
               price=EXCLUDED.price, "isPublished"=EXCLUDED."isPublished",
               "categoryId"=EXCLUDED."categoryId", "updatedAt"=EXCLUDED."updatedAt"`,
            [c.id, teacherId, c.title, c.description, c.imageUrl, c.price,
             c.isPublished, catMap[c.cat], created, updated]
          );
          // Xoá chapters cũ rồi insert lại
          await pool.query('DELETE FROM "Chapter" WHERE "courseId" = $1', [c.id]);
          for (let p = 0; p < c.chapters.length; p++) {
            const ch = c.chapters[p];
            const chId = `${c.id}-ch${p + 1}`;
            await pool.query(
              `INSERT INTO "Chapter"
                 (id, title, description, duration, "videoUrl", position,
                  "isPublished", "isFree", "courseId", "createdAt", "updatedAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
              [chId, ch.title, ch.description, ch.duration,
               (ch.isFree || p === 0) ? DEMO_VIDEO : null,
               p + 1, ch.isPublished, ch.isFree, c.id, created, updated]
            );
            chaptersCount++;
          }
          coursesCount++;
          log.push(`✅ /courses/${c.id} — ${c.title} (${c.chapters.length} chapters)`);
        }

        res.json({
          ok: true,
          teacher: TEACHER_EMAIL,
          courses: coursesCount,
          chapters: chaptersCount,
          urls: COURSES.map(c => `/courses/${c.id}`),
          log,
        });
      } catch (e) {
        console.error('[seed:courses]', e);
        res.status(500).json({ error: e.message, log });
      }
    });
  }

  // ─ Stats / Progress ───────────────────────────────────────
  app.get('/api/exam-stats', (_req, res) => res.json({ totalExams: 0, avgScore: 0, completed: 0 }));
  app.get('/api/courses-progress', (_req, res) => res.json({ progress: [] }));
  // /api/update-learning-progress: UI dùng cả GET (load) lẫn POST (save)
  app.get('/api/update-learning-progress', (_req, res) => res.json({ progress: [], updatedAt: null }));
  app.post('/api/update-learning-progress', okMsg);
  app.get('/api/agents/progress-tracker', emptyObj);

  // ─ User profile ───────────────────────────────────────────
  // GET  /api/profile          → trả thông tin user hiện tại (mở rộng cột bio/phone/website)
  // PATCH/PUT /api/profile     → update name/bio/phone/website (KHÔNG cho đổi email)
  // Email là identity binding → đổi cần verification flow riêng.
  {
    const { Pool: PPool } = require('pg');
    let _ppool = null;
    function getPPool() {
      if (!_ppool && process.env.DATABASE_URL) {
        _ppool = new PPool({
          connectionString: process.env.DATABASE_URL,
          max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
        });
      }
      return _ppool;
    }
    // Tự require jsonwebtoken + đọc secret từ env (không dựa vào JWT_SECRET
    // const ở scope khác — cách scoping của file này khá rối, dễ undefined).
    const _pjwt = require('jsonwebtoken');
    const _pSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
    function getProfileUser(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        const tok = auth.slice(7);
        const d = _pjwt.verify(tok, _pSecret, { ignoreExpiration: true });
        return { id: d.sub || d.userId || d.id, email: d.email };
      } catch { return null; }
    }
    let _profileColsReady = false;
    async function ensureProfileColumns() {
      if (_profileColsReady) return;
      const pool = getPPool();
      if (!pool) return;
      // Migration: thêm cột bio/phone/website vào User nếu chưa có
      for (const [col, kind] of [['bio','TEXT'],['phone','TEXT'],['website','TEXT']]) {
        try {
          await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "${col}" ${kind}`);
        } catch (e) {
          console.warn(`[profile] migrate ${col}:`, e.message);
        }
      }
      _profileColsReady = true;
    }

    app.get('/api/profile', async (req, res) => {
      const user = getProfileUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getPPool();
      if (!pool) return res.json({ profile: {} });
      try {
        await ensureProfileColumns();
        const { rows } = await pool.query(
          `SELECT id, email, name, role, image, bio, phone, website,
                  "createdAt", "updatedAt"
             FROM "User" WHERE id = $1 LIMIT 1`,
          [user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json({ profile: rows[0] });
      } catch (err) {
        console.error('[profile:get]', err.message);
        res.json({ profile: {} });
      }
    });

    const updateProfileHandler = async (req, res) => {
      const user = getProfileUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getPPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });
      try {
        await ensureProfileColumns();
        const body = req.body || {};
        // Allowed fields — KHÔNG bao gồm email/role/id
        const sets = [];
        const vals = [user.id];
        let i = 2;
        if (body.name !== undefined) {
          const n = String(body.name).trim();
          if (n.length < 2) return res.status(400).json({ error: 'Tên phải ≥ 2 ký tự' });
          sets.push(`name = $${i++}`); vals.push(n.slice(0, 100));
        }
        if (body.bio !== undefined)     { sets.push(`bio = $${i++}`);     vals.push(String(body.bio).slice(0, 500)); }
        if (body.phone !== undefined)   { sets.push(`phone = $${i++}`);   vals.push(String(body.phone).slice(0, 20)); }
        if (body.website !== undefined) { sets.push(`website = $${i++}`); vals.push(String(body.website).slice(0, 200)); }
        if (body.image !== undefined)   { sets.push(`image = $${i++}`);   vals.push(String(body.image).slice(0, 500)); }
        if (sets.length === 0) {
          return res.status(400).json({ error: 'Không có field nào để update' });
        }
        sets.push(`"updatedAt" = NOW()`);
        const { rows } = await pool.query(
          `UPDATE "User" SET ${sets.join(', ')} WHERE id = $1
             RETURNING id, email, name, role, image, bio, phone, website, "updatedAt"`,
          vals
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        console.log(`[profile:update] ✅ ${user.id} fields=${sets.length - 1}`);
        res.json({ ok: true, profile: rows[0], user: rows[0] });
      } catch (err) {
        console.error('[profile:update]', err.message);
        res.status(500).json({ error: err.message });
      }
    };
    app.patch('/api/profile', updateProfileHandler);
    app.put('/api/profile', updateProfileHandler);
  }

  // ─ Emotion ────────────────────────────────────────────────
  app.get('/api/emotion', (_req, res) => res.json({ records: [] }));
  app.get('/api/emotion/stats', (_req, res) => res.json({ stats: [], total: 0 }));
  // /api/plg/<id>, /api/xp/analyze/<id>
  app.get(/^\/api\/plg\/.+/, (_req, res) => res.json({ riskLevel: 0, factors: [] }));
  app.get(/^\/api\/xp\/analyze\/.+/, (_req, res) => res.json({ totalXp: 0, recent: [] }));

  // ─ Grading ────────────────────────────────────────────────
  // ── Grading: AnswerKey + GradedSheet (DB-backed, JSON column cho flexibility) ──
  {
    const { Pool: GrPool } = require('pg');
    let _grpool = null;
    function getGrPool() {
      if (!_grpool && process.env.DATABASE_URL) {
        _grpool = new GrPool({
          connectionString: process.env.DATABASE_URL,
          max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
        });
      }
      return _grpool;
    }
    const _grjwt = require('jsonwebtoken');
    const _grSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
    function getGrTeacher(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        const d = _grjwt.verify(auth.slice(7), _grSecret, { ignoreExpiration: true });
        return { id: d.sub || d.userId || d.id };
      } catch { return null; }
    }
    let _grReady = false;
    async function ensureGradingTables() {
      if (_grReady) return;
      const pool = getGrPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "AnswerKey" (
          id           TEXT PRIMARY KEY,
          "teacherId"  TEXT NOT NULL,
          "examName"   TEXT,
          "examCode"   TEXT,
          "examDate"   TEXT,
          "examSite"   TEXT,
          "examRoom"   TEXT,
          payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
          "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS "AnswerKey_teacher_idx" ON "AnswerKey" ("teacherId", "createdAt" DESC)`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "GradedSheet" (
          id              TEXT PRIMARY KEY,
          "teacherId"     TEXT NOT NULL,
          "answerKeyId"   TEXT,
          "studentName"   TEXT,
          "studentId"     TEXT,
          "examCode"      TEXT,
          "className"     TEXT,
          score           DOUBLE PRECISION,
          "maxScore"      DOUBLE PRECISION,
          payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
          "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS "GradedSheet_teacher_idx" ON "GradedSheet" ("teacherId", "createdAt" DESC)`);
      _grReady = true;
    }
    function akToClient(row) {
      const p = row.payload || {};
      return {
        id: row.id,
        examName: row.examName || p.examName || '',
        examCode: row.examCode || p.examCode || '',
        examDate: row.examDate || p.examDate || '',
        examSite: row.examSite || p.examSite || '',
        examRoom: row.examRoom || p.examRoom || '',
        studentName: p.studentName || '',
        studentId: p.studentId || '',
        dob: p.dob || '',
        part1: p.part1 || {},
        part2: p.part2 || {},
        part3: p.part3 || {},
        essayQuestions: Array.isArray(p.essayQuestions) ? p.essayQuestions : [],
        createdAt: row.createdAt,
      };
    }

    // GET /api/grading/answer-keys → list của teacher
    app.get('/api/grading/answer-keys', async (req, res) => {
      const user = getGrTeacher(req);
      if (!user) return res.json({ keys: [] });  // không lỗi để FE không vỡ
      const pool = getGrPool();
      if (!pool) return res.json({ keys: [] });
      try {
        await ensureGradingTables();
        const { rows } = await pool.query(
          `SELECT * FROM "AnswerKey" WHERE "teacherId" = $1 ORDER BY "createdAt" DESC`,
          [user.id]
        );
        res.json({ keys: rows.map(akToClient) });
      } catch (e) {
        console.error('[grading:answer-keys:list]', e.message);
        res.json({ keys: [] });
      }
    });

    // POST /api/grading/answer-keys → tạo mới, trả { key }
    app.post('/api/grading/answer-keys', express.json({ limit: '5mb' }), async (req, res) => {
      const user = getGrTeacher(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getGrPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });
      try {
        await ensureGradingTables();
        const body = req.body || {};
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        // Tách field index (search-friendly) khỏi payload (tự do)
        const { examName, examCode, examDate, examSite, examRoom, ...rest } = body;
        const payload = { ...body };  // lưu full để load lại đầy đủ
        await pool.query(
          `INSERT INTO "AnswerKey"
             (id, "teacherId", "examName", "examCode", "examDate", "examSite", "examRoom", payload)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, user.id,
           String(examName || '').slice(0, 200),
           String(examCode || '').slice(0, 50),
           String(examDate || '').slice(0, 50),
           String(examSite || '').slice(0, 200),
           String(examRoom || '').slice(0, 50),
           JSON.stringify(payload)]
        );
        const { rows } = await pool.query(`SELECT * FROM "AnswerKey" WHERE id = $1`, [id]);
        console.log(`[grading:answer-keys:create] ✅ ${id} "${examName || '(no name)'}"`);
        res.status(201).json({ ok: true, key: akToClient(rows[0]) });
      } catch (e) {
        console.error('[grading:answer-keys:create]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // DELETE /api/grading/answer-keys/:id
    app.delete('/api/grading/answer-keys/:id', async (req, res) => {
      const user = getGrTeacher(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getGrPool();
      try {
        const { rowCount } = await pool.query(
          `DELETE FROM "AnswerKey" WHERE id = $1 AND "teacherId" = $2`,
          [req.params.id, user.id]
        );
        if (!rowCount) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
      } catch (e) {
        console.error('[grading:answer-keys:delete]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // GET /api/grading/graded-sheets → list (filter optional ?keyId=)
    app.get('/api/grading/graded-sheets', async (req, res) => {
      const user = getGrTeacher(req);
      if (!user) return res.json({ sheets: [] });
      const pool = getGrPool();
      if (!pool) return res.json({ sheets: [] });
      try {
        await ensureGradingTables();
        const params = [user.id];
        let where = `"teacherId" = $1`;
        if (req.query.keyId) {
          where += ` AND "answerKeyId" = $2`;
          params.push(String(req.query.keyId));
        }
        const { rows } = await pool.query(
          `SELECT * FROM "GradedSheet" WHERE ${where} ORDER BY "createdAt" DESC LIMIT 500`,
          params
        );
        res.json({
          sheets: rows.map(r => ({
            id: r.id,
            answerKeyId: r.answerKeyId,
            studentName: r.studentName,
            studentId: r.studentId,
            examCode: r.examCode,
            className: r.className,
            score: r.score,
            maxScore: r.maxScore,
            createdAt: r.createdAt,
            ...(r.payload || {}),
          })),
        });
      } catch (e) {
        console.error('[grading:graded-sheets:list]', e.message);
        res.json({ sheets: [] });
      }
    });

    // POST /api/grading/graded-sheets → save graded result
    app.post('/api/grading/graded-sheets', express.json({ limit: '5mb' }), async (req, res) => {
      const user = getGrTeacher(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getGrPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });
      try {
        await ensureGradingTables();
        const body = req.body || {};
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        await pool.query(
          `INSERT INTO "GradedSheet"
             (id, "teacherId", "answerKeyId", "studentName", "studentId",
              "examCode", "className", score, "maxScore", payload)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [id, user.id,
           body.answerKeyId || null,
           String(body.studentName || '').slice(0, 200),
           String(body.studentId || '').slice(0, 50),
           String(body.examCode || '').slice(0, 50),
           String(body.className || '').slice(0, 50),
           Number(body.score) || 0,
           Number(body.maxScore) || 10,
           JSON.stringify(body)]
        );
        res.status(201).json({ ok: true, id });
      } catch (e) {
        console.error('[grading:graded-sheets:create]', e.message);
        res.status(500).json({ error: e.message });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CUSTOM CIRCUIT LIBRARY — lưu mạch Custom của user (Wokwi-style)
  // Bảng "CustomCircuit": id, ownerId, name, description, board,
  // difficulty, category, diagram (JSONB), sketch (TEXT), objectives
  // (JSONB array of strings), isPublic (bool, default false), createdAt,
  // updatedAt. Endpoint dùng cùng JWT pattern getGrTeacher (rename
  // getCircuitUser vì áp dụng cho cả HS lẫn GV).
  // ═══════════════════════════════════════════════════════════════════
  {
    let _ccpool = null;
    function getCcPool() {
      if (!_ccpool) {
        const { Pool } = require('pg');
        const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        if (!url) return null;
        _ccpool = new Pool({
          connectionString: url,
          ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
          max: 4,
          idleTimeoutMillis: 30000,
        });
      }
      return _ccpool;
    }
    const _ccjwt = require('jsonwebtoken');
    const _ccSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
    function getCircuitUser(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        const d = _ccjwt.verify(auth.slice(7), _ccSecret, { ignoreExpiration: true });
        return { id: d.sub || d.userId || d.id, role: d.role || 'student' };
      } catch { return null; }
    }
    let _ccReady = false;
    async function ensureCustomCircuitTable() {
      if (_ccReady) return;
      const pool = getCcPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "CustomCircuit" (
          id            TEXT PRIMARY KEY,
          "ownerId"     TEXT NOT NULL,
          name          TEXT NOT NULL,
          description   TEXT,
          board         TEXT NOT NULL DEFAULT 'Arduino UNO',
          difficulty    TEXT NOT NULL DEFAULT 'Dễ',
          category      TEXT NOT NULL DEFAULT 'general',
          diagram       JSONB NOT NULL DEFAULT '{}'::jsonb,
          sketch        TEXT NOT NULL DEFAULT '',
          objectives    JSONB NOT NULL DEFAULT '[]'::jsonb,
          "isPublic"    BOOLEAN NOT NULL DEFAULT FALSE,
          "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS "CustomCircuit_owner_idx" ON "CustomCircuit" ("ownerId", "createdAt" DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "CustomCircuit_public_idx" ON "CustomCircuit" ("isPublic", "category") WHERE "isPublic" = TRUE`);
      _ccReady = true;
    }
    function ccToClient(row) {
      return {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        description: row.description || '',
        board: row.board || 'Arduino UNO',
        difficulty: row.difficulty || 'Dễ',
        category: row.category || 'general',
        diagram: row.diagram || { parts: [], connections: [] },
        sketch: row.sketch || '',
        objectives: Array.isArray(row.objectives) ? row.objectives : [],
        isPublic: !!row.isPublic,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }

    // GET /api/iot/custom-circuits → list mạch của user + ?public=1 cho public
    app.get('/api/iot/custom-circuits', async (req, res) => {
      const user = getCircuitUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getCcPool();
      if (!pool) return res.json({ circuits: [] });
      try {
        await ensureCustomCircuitTable();
        const includePublic = req.query.includePublic === '1' || req.query.includePublic === 'true';
        const sql = includePublic
          ? `SELECT * FROM "CustomCircuit" WHERE "ownerId" = $1 OR "isPublic" = TRUE ORDER BY "updatedAt" DESC LIMIT 200`
          : `SELECT * FROM "CustomCircuit" WHERE "ownerId" = $1 ORDER BY "updatedAt" DESC LIMIT 200`;
        const r = await pool.query(sql, [user.id]);
        res.json({ circuits: r.rows.map(ccToClient), count: r.rows.length });
      } catch (e) {
        console.error('[custom-circuit:list]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // POST /api/iot/custom-circuits → tạo mạch mới
    // Body: { name, description?, board?, difficulty?, category?,
    //         diagram, sketch?, objectives?, isPublic? }
    app.post('/api/iot/custom-circuits', express.json({ limit: '2mb' }), async (req, res) => {
      const user = getCircuitUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getCcPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });
      try {
        await ensureCustomCircuitTable();
        const body = req.body || {};
        const name = String(body.name || '').trim();
        if (!name) return res.status(400).json({ error: 'Tên mạch không được trống' });
        if (!body.diagram || typeof body.diagram !== 'object' || !Array.isArray(body.diagram.parts)) {
          return res.status(400).json({ error: 'Diagram không hợp lệ (thiếu parts)' });
        }
        const id = 'cc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        const objectives = Array.isArray(body.objectives)
          ? body.objectives.filter(o => typeof o === 'string').slice(0, 10)
          : [];
        const r = await pool.query(
          `INSERT INTO "CustomCircuit" (
             id, "ownerId", name, description, board, difficulty,
             category, diagram, sketch, objectives, "isPublic"
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          [
            id,
            user.id,
            name.slice(0, 200),
            String(body.description || '').slice(0, 1000),
            String(body.board || 'Arduino UNO').slice(0, 60),
            ['Dễ', 'Trung bình', 'Nâng cao'].includes(body.difficulty) ? body.difficulty : 'Dễ',
            String(body.category || 'general').slice(0, 60),
            JSON.stringify(body.diagram),
            String(body.sketch || '').slice(0, 50_000),
            JSON.stringify(objectives),
            !!body.isPublic,
          ]
        );
        res.status(201).json({ ok: true, circuit: ccToClient(r.rows[0]) });
      } catch (e) {
        console.error('[custom-circuit:create]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // PUT /api/iot/custom-circuits/:id → cập nhật mạch (chỉ owner)
    app.put('/api/iot/custom-circuits/:id', express.json({ limit: '2mb' }), async (req, res) => {
      const user = getCircuitUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getCcPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });
      try {
        await ensureCustomCircuitTable();
        const body = req.body || {};
        const checked = await pool.query(
          `SELECT "ownerId" FROM "CustomCircuit" WHERE id = $1`,
          [req.params.id]
        );
        if (checked.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy' });
        if (checked.rows[0].ownerId !== user.id) {
          return res.status(403).json({ error: 'Không có quyền sửa mạch này' });
        }
        const objectives = Array.isArray(body.objectives)
          ? body.objectives.filter(o => typeof o === 'string').slice(0, 10)
          : null;
        const r = await pool.query(
          `UPDATE "CustomCircuit" SET
             name        = COALESCE($2, name),
             description = COALESCE($3, description),
             board       = COALESCE($4, board),
             difficulty  = COALESCE($5, difficulty),
             category    = COALESCE($6, category),
             diagram     = COALESCE($7::jsonb, diagram),
             sketch      = COALESCE($8, sketch),
             objectives  = COALESCE($9::jsonb, objectives),
             "isPublic"  = COALESCE($10, "isPublic"),
             "updatedAt" = NOW()
           WHERE id = $1 RETURNING *`,
          [
            req.params.id,
            body.name ? String(body.name).slice(0, 200) : null,
            body.description !== undefined ? String(body.description).slice(0, 1000) : null,
            body.board ? String(body.board).slice(0, 60) : null,
            ['Dễ', 'Trung bình', 'Nâng cao'].includes(body.difficulty) ? body.difficulty : null,
            body.category ? String(body.category).slice(0, 60) : null,
            body.diagram ? JSON.stringify(body.diagram) : null,
            body.sketch !== undefined ? String(body.sketch).slice(0, 50_000) : null,
            objectives ? JSON.stringify(objectives) : null,
            typeof body.isPublic === 'boolean' ? body.isPublic : null,
          ]
        );
        res.json({ ok: true, circuit: ccToClient(r.rows[0]) });
      } catch (e) {
        console.error('[custom-circuit:update]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // DELETE /api/iot/custom-circuits/:id → xoá (chỉ owner)
    app.delete('/api/iot/custom-circuits/:id', async (req, res) => {
      const user = getCircuitUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getCcPool();
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });
      try {
        await ensureCustomCircuitTable();
        const r = await pool.query(
          `DELETE FROM "CustomCircuit" WHERE id = $1 AND "ownerId" = $2 RETURNING id`,
          [req.params.id, user.id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy hoặc không có quyền' });
        res.json({ ok: true, id: r.rows[0].id });
      } catch (e) {
        console.error('[custom-circuit:delete]', e.message);
        res.status(500).json({ error: e.message });
      }
    });
  }

  // POST /api/grading/ocr — Vision AI extract thông tin học sinh từ phiếu trả lời
  // Body JSON: { image: base64String, mimeType: 'image/jpeg', language?: 'vi' }
  // Trả về { success: true, exam_info: { student_name, student_id, exam_code, class_name } }
  // Phiếu chuẩn Bộ GD&ĐT có các ô: SBD (số báo danh), Mã đề, Họ tên, Lớp.
  app.post('/api/grading/ocr', express.json({ limit: '20mb' }), async (req, res) => {
    try {
      // Gating: OCR phiếu trắc nghiệm cần feature ocr_pdf (gói teacher)
      const gating = require('./lib/gating.cjs');
      const gate = await gating.checkEntitlement(req, 'ocr_pdf');
      if (!gate.ok) return res.status(gate.status).json(gate.body);

      const { image, mimeType = 'image/jpeg' } = req.body || {};
      if (!image || typeof image !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Thiếu trường image (base64). Gửi JSON: { image, mimeType }',
        });
      }
      // Strip data:URI prefix nếu có
      const base64 = image.replace(/^data:[^,]+,/, '');
      // Gọi fal vision để extract fields
      const { completeWithVision } = require('./lib/fal-client.cjs');
      const prompt = [
        'Đây là Phiếu Trả Lời Trắc Nghiệm chuẩn Bộ GD&ĐT 2025 của Việt Nam.',
        'Hãy trích xuất các thông tin sau từ phần header phiếu (KHÔNG cần đọc đáp án bubble):',
        '',
        'YÊU CẦU OUTPUT — CHỈ trả JSON hợp lệ, không markdown, không giải thích:',
        '{',
        '  "student_name": "<Họ và tên thí sinh>",',
        '  "student_id":   "<Số báo danh — chuỗi số 6-8 chữ số>",',
        '  "exam_code":    "<Mã đề thi — chuỗi 3 chữ số, vd 132/209/357/485>",',
        '  "class_name":   "<Lớp — vd 12A1, 11B3>",',
        '  "exam_session": "<Kỳ thi nếu có — vd Giữa kỳ I 2025>"',
        '}',
        '',
        'Quy tắc:',
        '- Nếu không đọc được trường nào, để chuỗi rỗng "".',
        '- KHÔNG suy đoán, chỉ extract những gì thấy rõ trên phiếu.',
        '- Nếu SBD có ô tô bubble số → đọc theo bubble đã tô (không đọc số in sẵn).',
        '- Tên thí sinh: giữ nguyên dấu tiếng Việt (vd "Nguyễn Văn A").',
        '',
        'Trả JSON ngay:',
      ].join('\n');
      const t0 = Date.now();
      const resp = await completeWithVision({
        system: 'Bạn là OCR engine chuyên đọc phiếu trắc nghiệm Việt Nam. CHỈ trả JSON.',
        messages: [{ role: 'user', content: prompt }],
        images: [{ data: base64, mimeType }],
      });
      const raw = String(resp.content || '').trim();
      // Trích JSON object từ output
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) {
        console.warn('[grading:ocr] AI output không có JSON:', raw.slice(0, 200));
        return res.status(502).json({
          success: false,
          error: 'AI không trả về JSON hợp lệ',
          raw: raw.slice(0, 300),
        });
      }
      let parsed;
      try { parsed = JSON.parse(m[0]); }
      catch (e) {
        return res.status(502).json({
          success: false,
          error: `JSON parse fail: ${e.message}`,
          raw: m[0].slice(0, 300),
        });
      }
      const exam_info = {
        student_name: String(parsed.student_name || '').trim(),
        student_id:   String(parsed.student_id   || '').trim(),
        exam_code:    String(parsed.exam_code    || '').trim(),
        class_name:   String(parsed.class_name   || '').trim(),
        exam_session: String(parsed.exam_session || '').trim(),
      };
      console.log(`[grading:ocr] ✅ ${Date.now()-t0}ms ${JSON.stringify(exam_info)}`);
      return res.json({ success: true, exam_info, tookMs: Date.now() - t0 });
    } catch (err) {
      console.error('[grading:ocr] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // PAGE VIEW ANALYTICS — YouTube-style tracking cho admin
  // ────────────────────────────────────────────────────────────────
  // Track lượt truy cập + thời gian xem từng route để admin biết:
  //   - Trang nào được dùng nhiều nhất
  //   - Lúc nào user active nhất (peak hour)
  //   - Bao nhiêu unique users mỗi ngày
  //   - Tỷ lệ bounce (xem < 5s)
  // ════════════════════════════════════════════════════════════════
  {
    const { Pool: AnPool } = require('pg');
    const anJwt = require('jsonwebtoken');
    let _anPool = null;
    function getAnPool() {
      if (!_anPool && process.env.DATABASE_URL) {
        _anPool = new AnPool({
          connectionString: process.env.DATABASE_URL,
          max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
        });
      }
      return _anPool;
    }
    const AN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
    function getAnUser(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        const d = anJwt.verify(auth.slice(7), AN_SECRET, { ignoreExpiration: true });
        return { id: d.sub || d.userId || d.id, role: d.role || 'STUDENT', email: d.email };
      } catch { return null; }
    }
    let _anReady = false;
    async function ensurePageViewTable() {
      if (_anReady) return;
      const pool = getAnPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "PageView" (
          id           TEXT PRIMARY KEY,
          "userId"     TEXT,
          "userRole"   TEXT,
          path         TEXT NOT NULL,
          referrer     TEXT,
          "userAgent"  TEXT,
          ip           TEXT,
          "sessionId"  TEXT,
          "viewMs"     INTEGER,
          "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS "PageView_path_idx"
        ON "PageView"(path, "createdAt" DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "PageView_user_idx"
        ON "PageView"("userId", "createdAt" DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS "PageView_recent_idx"
        ON "PageView"("createdAt" DESC)`);
      // Cleanup view older than 90 days (keep DB small) — chạy lazy 1 lần
      pool.query(`DELETE FROM "PageView" WHERE "createdAt" < NOW() - INTERVAL '90 days'`)
        .catch(() => {});
      _anReady = true;
    }

    // Normalize path để gom các route :id thành 1 bucket
    // Ví dụ: /dashboard/stem/abc123 → /dashboard/stem/:id
    function normalizePath(raw) {
      if (!raw) return '/';
      let p = String(raw).split('?')[0].split('#')[0].slice(0, 200);
      // UUIDs → :uuid
      p = p.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid');
      // Numeric IDs → :id
      p = p.replace(/\/\d+(?=\/|$)/g, '/:id');
      // Hash IDs (10+ chars alphanumeric) → :id
      p = p.replace(/\/[a-zA-Z0-9_-]{10,}(?=\/|$)/g, '/:id');
      return p;
    }

    // ── POST /api/analytics/pageview ── public, no auth required
    // Body: { path, referrer?, sessionId, viewMs? }
    // Trả 204 No Content (fire-and-forget cho FE)
    app.post('/api/analytics/pageview', express.json({ limit: '4kb' }), async (req, res) => {
      try {
        const pool = getAnPool();
        if (!pool) return res.status(204).end();
        await ensurePageViewTable();
        const b = req.body || {};
        const path = normalizePath(b.path);
        if (!path || path.length < 1) return res.status(400).json({ error: 'path required' });
        // Bỏ qua nếu path là API endpoint hoặc static asset
        if (path.startsWith('/api/') || path.startsWith('/assets/') || path.match(/\.(js|css|png|jpg|svg|ico)$/)) {
          return res.status(204).end();
        }
        const user = getAnUser(req);
        const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
          .toString().split(',')[0].trim().slice(0, 45);
        const ua = (req.headers['user-agent'] || '').toString().slice(0, 300);
        const sid = String(b.sessionId || '').slice(0, 64) || null;
        const ref = String(b.referrer || '').slice(0, 200) || null;
        const viewMs = b.viewMs != null && Number.isFinite(Number(b.viewMs))
          ? Math.min(Number(b.viewMs), 86_400_000)  // cap 1 ngày
          : null;
        const { randomUUID } = require('crypto');
        await pool.query(
          `INSERT INTO "PageView"
             (id, "userId", "userRole", path, referrer, "userAgent", ip, "sessionId", "viewMs")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [randomUUID(), user?.id || null, user?.role || null, path, ref, ua, ip, sid, viewMs]
        );
        return res.status(204).end();
      } catch (err) {
        console.warn('[analytics:pv] insert fail:', err.message.slice(0, 100));
        return res.status(204).end();   // never fail FE tracking
      }
    });

    // ── GET /api/admin/analytics/overview ── admin only
    app.get('/api/admin/analytics/overview', async (req, res) => {
      const user = getAnUser(req);
      if (!user || !/ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Admin only' });
      const pool = getAnPool();
      if (!pool) return res.json({});
      try {
        await ensurePageViewTable();

        // Tổng quan: today / week / month + unique users + avg duration
        const [totalsRes, uniquesRes, durationRes, dailyRes, byRoleRes] = await Promise.all([
          pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '24 hours')::int  AS today,
              COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days')::int    AS week,
              COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days')::int   AS month,
              COUNT(*)::int                                                            AS all_time
            FROM "PageView"
          `),
          pool.query(`
            SELECT
              COUNT(DISTINCT "sessionId") FILTER (WHERE "sessionId" IS NOT NULL AND "createdAt" >= NOW() - INTERVAL '24 hours')::int AS sessions_today,
              COUNT(DISTINCT "userId")    FILTER (WHERE "userId" IS NOT NULL    AND "createdAt" >= NOW() - INTERVAL '24 hours')::int AS users_today,
              COUNT(DISTINCT "userId")    FILTER (WHERE "userId" IS NOT NULL    AND "createdAt" >= NOW() - INTERVAL '7 days')::int   AS users_week
            FROM "PageView"
          `),
          pool.query(`
            SELECT AVG("viewMs")::int AS avg_ms
            FROM "PageView"
            WHERE "viewMs" IS NOT NULL AND "viewMs" > 1000
              AND "createdAt" >= NOW() - INTERVAL '7 days'
          `),
          pool.query(`
            SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::int AS views
            FROM "PageView"
            WHERE "createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY day
            ORDER BY day ASC
          `),
          pool.query(`
            SELECT COALESCE("userRole", 'GUEST') AS role, COUNT(*)::int AS views
            FROM "PageView"
            WHERE "createdAt" >= NOW() - INTERVAL '7 days'
            GROUP BY role
            ORDER BY views DESC
          `),
        ]);
        return res.json({
          totals: totalsRes.rows[0] || { today: 0, week: 0, month: 0, all_time: 0 },
          uniques: uniquesRes.rows[0] || { sessions_today: 0, users_today: 0, users_week: 0 },
          avgViewMs: Number(durationRes.rows[0]?.avg_ms) || 0,
          daily: dailyRes.rows.map(r => ({ day: r.day, views: r.views })),
          byRole: byRoleRes.rows,
        });
      } catch (err) {
        console.error('[analytics:overview]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/admin/analytics/routes ── top routes với chi tiết
    // Query: days (default 7), limit (default 30)
    app.get('/api/admin/analytics/routes', async (req, res) => {
      const user = getAnUser(req);
      if (!user || !/ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Admin only' });
      const pool = getAnPool();
      if (!pool) return res.json({ routes: [] });
      try {
        await ensurePageViewTable();
        const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
        const { rows } = await pool.query(`
          SELECT
            path,
            COUNT(*)::int                                  AS views,
            COUNT(DISTINCT "sessionId")::int               AS unique_sessions,
            COUNT(DISTINCT "userId") FILTER (WHERE "userId" IS NOT NULL)::int AS unique_users,
            AVG("viewMs") FILTER (WHERE "viewMs" > 1000)::int AS avg_view_ms,
            COUNT(*) FILTER (WHERE "viewMs" IS NOT NULL AND "viewMs" < 5000)::int AS bounces,
            MAX("createdAt")                               AS last_view
          FROM "PageView"
          WHERE "createdAt" >= NOW() - ($1::int || ' days')::interval
          GROUP BY path
          ORDER BY views DESC
          LIMIT $2
        `, [days, limit]);
        return res.json({
          routes: rows.map(r => ({
            path: r.path,
            views: r.views,
            uniqueSessions: r.unique_sessions,
            uniqueUsers: r.unique_users,
            avgViewMs: Number(r.avg_view_ms) || 0,
            bounces: r.bounces,
            bounceRate: r.views > 0 ? Math.round((r.bounces / r.views) * 100) : 0,
            lastView: r.last_view,
          })),
        });
      } catch (err) {
        console.error('[analytics:routes]', err.message);
        return res.status(500).json({ error: err.message });
      }
    });

    // ── GET /api/admin/analytics/realtime ── active users last 5 min
    app.get('/api/admin/analytics/realtime', async (req, res) => {
      const user = getAnUser(req);
      if (!user || !/ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Admin only' });
      const pool = getAnPool();
      if (!pool) return res.json({ activeNow: 0, recent: [] });
      try {
        const { rows } = await pool.query(`
          SELECT
            COUNT(DISTINCT "sessionId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '5 minutes')::int AS active_now,
            (SELECT json_agg(t) FROM (
              SELECT path, "userRole", "createdAt"
              FROM "PageView"
              WHERE "createdAt" >= NOW() - INTERVAL '15 minutes'
              ORDER BY "createdAt" DESC
              LIMIT 20
            ) t) AS recent
          FROM "PageView"
        `);
        return res.json({
          activeNow: Number(rows[0]?.active_now) || 0,
          recent: rows[0]?.recent || [],
        });
      } catch (err) {
        return res.json({ activeNow: 0, recent: [] });
      }
    });

    // ════════════════════════════════════════════════════════════
    // ADMIN INSIGHTS — phân tích hành vi user + trending topics/exams
    //
    // 4 endpoints (admin only):
    //   /behavior         — phân tích hành vi (peak hours, retention, ...)
    //   /trending-topics  — top subjects (từ PageView path + Exam category)
    //   /trending-exams   — top exams được làm (PracticeExam group by exam)
    //   /recommendations  — auto-generated từ patterns trong data
    // ════════════════════════════════════════════════════════════

    // ── GET /api/admin/insights/behavior ──
    app.get('/api/admin/insights/behavior', async (req, res) => {
      const user = getAnUser(req);
      if (!user || !/ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Admin only' });
      const pool = getAnPool();
      if (!pool) return res.json({});
      try {
        // Hourly distribution last 7 days — find peak hours
        const hourly = await pool.query(`
          SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour,
                 COUNT(*)::int AS views,
                 COUNT(DISTINCT "sessionId")::int AS unique_sessions
            FROM "PageView"
           WHERE "createdAt" >= NOW() - INTERVAL '7 days'
           GROUP BY hour ORDER BY hour ASC
        `).catch(() => ({ rows: [] }));

        // DAU/WAU/MAU (Daily/Weekly/Monthly Active Users)
        const dau = await pool.query(`
          SELECT
            COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '1 day' AND "userId" IS NOT NULL)::int AS dau,
            COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days' AND "userId" IS NOT NULL)::int AS wau,
            COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days' AND "userId" IS NOT NULL)::int AS mau
          FROM "PageView"
        `).catch(() => ({ rows: [{ dau: 0, wau: 0, mau: 0 }] }));

        // Retention: % WAU returning DAU
        const dauVal = Number(dau.rows[0]?.dau) || 0;
        const wauVal = Number(dau.rows[0]?.wau) || 0;
        const mauVal = Number(dau.rows[0]?.mau) || 0;
        const stickiness = wauVal > 0 ? (dauVal / wauVal * 100) : 0;

        // Avg session duration (min) by role last 7d
        const sessionDur = await pool.query(`
          SELECT "userRole" AS role,
                 ROUND(AVG("viewDurationMs") / 60000.0, 2)::float AS avg_min,
                 COUNT(DISTINCT "sessionId")::int AS sessions
            FROM "PageView"
           WHERE "createdAt" >= NOW() - INTERVAL '7 days'
             AND "viewDurationMs" > 0
           GROUP BY "userRole"
        `).catch(() => ({ rows: [] }));

        // Top entry pages (first page in session) — proxy for landing pattern
        const topEntries = await pool.query(`
          WITH first_views AS (
            SELECT DISTINCT ON ("sessionId") "sessionId", path
            FROM "PageView"
            WHERE "createdAt" >= NOW() - INTERVAL '7 days'
            ORDER BY "sessionId", "createdAt" ASC
          )
          SELECT path, COUNT(*)::int AS sessions
          FROM first_views
          GROUP BY path ORDER BY sessions DESC LIMIT 10
        `).catch(() => ({ rows: [] }));

        // Bounce rate per role (sessions với only 1 PageView)
        const bounce = await pool.query(`
          WITH session_counts AS (
            SELECT "sessionId", "userRole", COUNT(*)::int AS pv
            FROM "PageView"
            WHERE "createdAt" >= NOW() - INTERVAL '7 days'
            GROUP BY "sessionId", "userRole"
          )
          SELECT "userRole" AS role,
                 COUNT(*) FILTER (WHERE pv = 1)::int AS bounced,
                 COUNT(*)::int AS total,
                 ROUND(COUNT(*) FILTER (WHERE pv = 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::float AS bounce_rate_pct
          FROM session_counts
          GROUP BY "userRole"
        `).catch(() => ({ rows: [] }));

        return res.json({
          hourly: hourly.rows,
          dau: dauVal, wau: wauVal, mau: mauVal,
          stickiness: Math.round(stickiness * 10) / 10,
          sessionDurByRole: sessionDur.rows,
          topEntries: topEntries.rows,
          bounceByRole: bounce.rows,
          period: 'last_7_days',
        });
      } catch (e) {
        console.warn('[insights:behavior]', e.message);
        return res.json({ error: e.message });
      }
    });

    // ── GET /api/admin/insights/trending-topics ──
    app.get('/api/admin/insights/trending-topics', async (req, res) => {
      const user = getAnUser(req);
      if (!user || !/ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Admin only' });
      const pool = getAnPool();
      if (!pool) return res.json({ topics: [] });
      try {
        // Topics derived from PracticeExam → Exam.title (split by spaces, top words)
        // OR from Exam.subject if available. Use last 7 days.
        const examAttempts = await pool.query(`
          SELECT e.title, e."subject", COUNT(pe.id)::int AS attempts,
                 COUNT(DISTINCT pe."studentId")::int AS unique_students
            FROM "PracticeExam" pe
            JOIN "Exam" e ON e.id = pe."sourceExamId"
           WHERE pe."createdAt" >= NOW() - INTERVAL '7 days'
           GROUP BY e.title, e."subject"
           ORDER BY attempts DESC LIMIT 50
        `).catch(() => ({ rows: [] }));

        // Aggregate by subject
        const subjectMap = {};
        for (const row of examAttempts.rows) {
          const s = row.subject || 'Khác';
          if (!subjectMap[s]) subjectMap[s] = { subject: s, attempts: 0, students: new Set(), examCount: 0 };
          subjectMap[s].attempts += Number(row.attempts);
          subjectMap[s].examCount += 1;
        }
        // Get unique students per subject (separate query to avoid double counting)
        const subjStudents = await pool.query(`
          SELECT e."subject", COUNT(DISTINCT pe."studentId")::int AS unique_students
            FROM "PracticeExam" pe
            JOIN "Exam" e ON e.id = pe."sourceExamId"
           WHERE pe."createdAt" >= NOW() - INTERVAL '7 days' AND pe."studentId" IS NOT NULL
           GROUP BY e."subject"
        `).catch(() => ({ rows: [] }));
        for (const row of subjStudents.rows) {
          const s = row.subject || 'Khác';
          if (subjectMap[s]) subjectMap[s].uniqueStudents = Number(row.unique_students);
        }

        const topics = Object.values(subjectMap)
          .map(t => ({
            subject: t.subject,
            attempts: t.attempts,
            uniqueStudents: t.uniqueStudents || 0,
            examCount: t.examCount,
            avgAttemptsPerStudent: t.uniqueStudents ? Math.round(t.attempts / t.uniqueStudents * 10) / 10 : 0,
          }))
          .sort((a, b) => b.attempts - a.attempts)
          .slice(0, 10);

        // Trend comparison: last 7d vs prev 7d (growth %)
        const trendComp = await pool.query(`
          SELECT e."subject",
                 COUNT(*) FILTER (WHERE pe."createdAt" >= NOW() - INTERVAL '7 days')::int AS recent,
                 COUNT(*) FILTER (WHERE pe."createdAt" >= NOW() - INTERVAL '14 days'
                              AND pe."createdAt" < NOW() - INTERVAL '7 days')::int AS previous
            FROM "PracticeExam" pe
            JOIN "Exam" e ON e.id = pe."sourceExamId"
           WHERE pe."createdAt" >= NOW() - INTERVAL '14 days'
           GROUP BY e."subject"
        `).catch(() => ({ rows: [] }));
        const growthMap = {};
        for (const row of trendComp.rows) {
          const recent = Number(row.recent);
          const prev = Number(row.previous);
          const growth = prev > 0 ? ((recent - prev) / prev * 100) : (recent > 0 ? 100 : 0);
          growthMap[row.subject || 'Khác'] = Math.round(growth);
        }
        for (const t of topics) {
          t.growthPct = growthMap[t.subject] ?? 0;
          t.trend = t.growthPct > 20 ? 'up' : t.growthPct < -20 ? 'down' : 'stable';
        }

        return res.json({ topics, period: 'last_7_days' });
      } catch (e) {
        console.warn('[insights:trending-topics]', e.message);
        return res.json({ topics: [], error: e.message });
      }
    });

    // ── GET /api/admin/insights/trending-exams ──
    app.get('/api/admin/insights/trending-exams', async (req, res) => {
      const user = getAnUser(req);
      if (!user || !/ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Admin only' });
      const pool = getAnPool();
      if (!pool) return res.json({ exams: [] });
      try {
        const { rows } = await pool.query(`
          SELECT e.id, e.title, e."subject", e."totalQuestions",
                 COUNT(pe.id)::int AS attempts,
                 COUNT(DISTINCT pe."studentId")::int AS unique_students,
                 ROUND(AVG(pe.percentage)::numeric, 1)::float AS avg_percentage,
                 ROUND(AVG(pe.score)::numeric, 2)::float AS avg_score,
                 COUNT(*) FILTER (WHERE pe.percentage >= 50)::int AS pass_count,
                 ROUND(COUNT(*) FILTER (WHERE pe.percentage >= 50)::numeric
                       / NULLIF(COUNT(pe.id), 0) * 100, 1)::float AS pass_rate
            FROM "PracticeExam" pe
            JOIN "Exam" e ON e.id = pe."sourceExamId"
           WHERE pe."createdAt" >= NOW() - INTERVAL '30 days'
             AND pe.completed = true
           GROUP BY e.id, e.title, e."subject", e."totalQuestions"
          HAVING COUNT(pe.id) >= 3
           ORDER BY attempts DESC, avg_percentage DESC
           LIMIT 15
        `).catch(() => ({ rows: [] }));

        return res.json({ exams: rows, period: 'last_30_days' });
      } catch (e) {
        console.warn('[insights:trending-exams]', e.message);
        return res.json({ exams: [], error: e.message });
      }
    });

    // ── GET /api/admin/insights/recommendations ──
    app.get('/api/admin/insights/recommendations', async (req, res) => {
      const user = getAnUser(req);
      if (!user || !/ADMIN/i.test(user.role || '')) return res.status(403).json({ error: 'Admin only' });
      const pool = getAnPool();
      if (!pool) return res.json({ recommendations: [] });
      try {
        const recs = [];

        // Rec 1: Low DAU/WAU stickiness → engagement issue
        try {
          const stick = await pool.query(`
            SELECT
              COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '1 day' AND "userId" IS NOT NULL)::int AS dau,
              COUNT(DISTINCT "userId") FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days' AND "userId" IS NOT NULL)::int AS wau
            FROM "PageView"
          `);
          const d = Number(stick.rows[0]?.dau) || 0;
          const w = Number(stick.rows[0]?.wau) || 0;
          const ratio = w > 0 ? d / w : 0;
          if (w >= 10 && ratio < 0.2) {
            recs.push({
              priority: 'high',
              category: 'engagement',
              icon: '📉',
              title: 'Stickiness DAU/WAU thấp',
              insight: `Tỷ lệ DAU/WAU = ${(ratio * 100).toFixed(1)}% (DAU=${d}, WAU=${w}). User vào 1 lần/tuần thì rời.`,
              action: 'Cân nhắc: gửi email/push reminder hằng ngày, gamify XP daily streak, weekly digest.',
            });
          } else if (w >= 10 && ratio > 0.5) {
            recs.push({
              priority: 'low',
              category: 'engagement',
              icon: '🌟',
              title: 'Engagement tốt',
              insight: `DAU/WAU = ${(ratio * 100).toFixed(1)}% — user quay lại đều đặn (>50%). Giữ vững.`,
              action: 'Tận dụng momentum: launch features mới, mời user feedback.',
            });
          }
        } catch {}

        // Rec 2: Bounce rate cao trên 1 trang
        try {
          const bounce = await pool.query(`
            WITH sc AS (
              SELECT "sessionId", path, COUNT(*)::int AS pv
              FROM "PageView" WHERE "createdAt" >= NOW() - INTERVAL '7 days' GROUP BY "sessionId", path
            ),
            entries AS (
              SELECT DISTINCT ON ("sessionId") "sessionId", path FROM "PageView"
              WHERE "createdAt" >= NOW() - INTERVAL '7 days' ORDER BY "sessionId", "createdAt"
            )
            SELECT e.path,
                   COUNT(*) FILTER (WHERE sc.pv = 1)::int AS bounces,
                   COUNT(*)::int AS sessions,
                   ROUND(COUNT(*) FILTER (WHERE sc.pv = 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::float AS rate
            FROM entries e LEFT JOIN sc ON sc."sessionId" = e."sessionId" AND sc.path = e.path
            GROUP BY e.path HAVING COUNT(*) >= 5 ORDER BY rate DESC LIMIT 3
          `);
          for (const r of bounce.rows) {
            if (r.rate >= 70) {
              recs.push({
                priority: 'high',
                category: 'ux',
                icon: '🚪',
                title: `Bounce cao trên ${r.path}`,
                insight: `${r.rate}% session vào ${r.path} thoát ngay (${r.bounces}/${r.sessions} sessions).`,
                action: `Audit UX của ${r.path}: load chậm? content không relevant? CTA khó thấy?`,
              });
            }
          }
        } catch {}

        // Rec 3: Trending exam có pass rate thấp
        try {
          const lowPass = await pool.query(`
            SELECT e.title, e."subject", COUNT(pe.id)::int AS attempts,
                   ROUND(AVG(pe.percentage)::numeric, 1)::float AS avg_pct
              FROM "PracticeExam" pe
              JOIN "Exam" e ON e.id = pe."sourceExamId"
             WHERE pe."createdAt" >= NOW() - INTERVAL '30 days' AND pe.completed = true
             GROUP BY e.id, e.title, e."subject"
            HAVING COUNT(pe.id) >= 10 AND AVG(pe.percentage) < 40
             ORDER BY attempts DESC LIMIT 3
          `);
          for (const r of lowPass.rows) {
            recs.push({
              priority: 'high',
              category: 'content',
              icon: '🎯',
              title: `Đề "${r.title}" quá khó`,
              insight: `${r.attempts} lượt làm nhưng điểm TB chỉ ${r.avg_pct}%.`,
              action: 'GV review lại độ khó. Thêm hướng dẫn/lời giải chi tiết cho HS tự học.',
            });
          }
        } catch {}

        // Rec 4: Subject growing fast → invest content
        try {
          const growing = await pool.query(`
            SELECT e."subject",
                   COUNT(*) FILTER (WHERE pe."createdAt" >= NOW() - INTERVAL '7 days')::int AS recent,
                   COUNT(*) FILTER (WHERE pe."createdAt" >= NOW() - INTERVAL '14 days'
                                AND pe."createdAt" < NOW() - INTERVAL '7 days')::int AS previous
              FROM "PracticeExam" pe
              JOIN "Exam" e ON e.id = pe."sourceExamId"
             WHERE pe."createdAt" >= NOW() - INTERVAL '14 days' AND e."subject" IS NOT NULL
             GROUP BY e."subject"
            HAVING COUNT(*) FILTER (WHERE pe."createdAt" >= NOW() - INTERVAL '7 days') >= 5
          `);
          for (const r of growing.rows) {
            const recent = Number(r.recent);
            const prev = Number(r.previous);
            const growth = prev > 0 ? ((recent - prev) / prev * 100) : 0;
            if (growth >= 50) {
              recs.push({
                priority: 'medium',
                category: 'content',
                icon: '🚀',
                title: `${r.subject} tăng trưởng nhanh`,
                insight: `Lượt làm bài ${r.subject} tăng ${growth.toFixed(0)}% so với tuần trước (${recent} vs ${prev}).`,
                action: `Đầu tư thêm content ${r.subject}: nhờ GV soạn thêm đề, mua bộ sưu tập, AI generate.`,
              });
            }
          }
        } catch {}

        // Rec 5: Roles không hoạt động
        try {
          const roleAct = await pool.query(`
            SELECT "userRole" AS role, COUNT(DISTINCT "sessionId")::int AS sessions
              FROM "PageView" WHERE "createdAt" >= NOW() - INTERVAL '7 days' AND "userRole" IS NOT NULL
              GROUP BY "userRole"
          `);
          const total = roleAct.rows.reduce((s, r) => s + Number(r.sessions), 0);
          for (const r of roleAct.rows) {
            const pct = total > 0 ? Number(r.sessions) / total * 100 : 0;
            if (pct < 5 && r.role !== 'GUEST') {
              recs.push({
                priority: 'medium',
                category: 'engagement',
                icon: '👥',
                title: `${r.role} tham gia thấp`,
                insight: `${r.role} chỉ chiếm ${pct.toFixed(1)}% sessions tuần qua (${r.sessions} sessions).`,
                action: `Khảo sát: ${r.role} có rào cản gì? Onboarding khó? UX phù hợp?`,
              });
            }
          }
        } catch {}

        // Sort by priority
        const order = { high: 0, medium: 1, low: 2 };
        recs.sort((a, b) => (order[a.priority] || 9) - (order[b.priority] || 9));

        return res.json({ recommendations: recs, generated_at: new Date().toISOString() });
      } catch (e) {
        console.warn('[insights:recommendations]', e.message);
        return res.json({ recommendations: [], error: e.message });
      }
    });

    console.log('[init] Admin Insights endpoints (behavior + trending + recommendations) ready');
  }

  // ─ STEM AI Project Generator ─────────────────────────────
  // Blueprint.am-style: GV/HS mô tả ý tưởng → AI sinh project plan
  // Body: { prompt: string, level?: 'easy'|'medium'|'hard' }
  // Returns: { title, description, difficulty, durationHours, category,
  //           components[], steps[], learningOutcomes[], tags[] }
  app.post('/api/stem/ai-generate', express.json({ limit: '50kb' }), async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim();
      const level = String(req.body?.level || 'medium');
      if (!prompt || prompt.length < 5) {
        return res.status(400).json({ error: 'Vui lòng nhập mô tả ý tưởng (≥ 5 ký tự)' });
      }
      const { complete } = require('./lib/fal-client.cjs');
      const sysPrompt = [
        'Bạn là chuyên gia STEM education hỗ trợ học sinh/giáo viên Việt Nam thiết kế dự án',
        'sử dụng Arduino, ESP32, cảm biến, lập trình. Phong cách giải thích đơn giản, thực tế,',
        'phù hợp với HS THPT (lớp 10-12). CHỈ trả về JSON hợp lệ, không markdown, không lời mở đầu.',
      ].join(' ');
      const userPrompt = [
        `Ý tưởng dự án: "${prompt}"`,
        `Trình độ mong muốn: ${level === 'easy' ? 'dễ (mới học)' : level === 'hard' ? 'nâng cao' : 'trung bình'}`,
        '',
        'Hãy sinh kế hoạch dự án STEM hoàn chỉnh dưới dạng JSON với schema:',
        '{',
        '  "title": "Tên dự án ngắn gọn (≤60 ký tự)",',
        '  "description": "Mô tả 2-3 câu về dự án",',
        '  "difficulty": "easy" | "medium" | "hard",',
        '  "durationHours": <số giờ ước tính, vd 4>,',
        '  "category": "Science" | "Technology" | "Engineering" | "Math",',
        '  "components": [{"name": "Tên linh kiện", "qty": <số lượng>, "estimatedPrice": <giá VND>}],',
        '  "steps": ["Bước 1...", "Bước 2...", "Bước 3..." (tối thiểu 5 bước, tối đa 10)],',
        '  "learningOutcomes": ["Kỹ năng/kiến thức 1", "Kỹ năng 2", ...],',
        '  "tags": ["tag1", "tag2", ...]',
        '}',
        '',
        'YÊU CẦU:',
        '- components phải khả thi, có bán ở VN (vd: Arduino UNO, cảm biến DHT22, LED, servo MG90S)',
        '- estimatedPrice tính VND, dùng giá thị trường tham khảo',
        '- steps phải cụ thể (Bước 1: lắp mạch theo sơ đồ X, Bước 2: viết code...)',
        '- learningOutcomes liên quan kiến thức vật lý/hoá/sinh/lập trình',
        '- Trả JSON đầy đủ, KHÔNG thêm chữ "json" hay backticks markdown',
      ].join('\n');
      const t0 = Date.now();
      const resp = await complete({
        system: sysPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.7,
      });
      const raw = String(resp.content || '').trim();
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) {
        return res.status(502).json({ error: 'AI không trả về JSON hợp lệ', raw: raw.slice(0, 300) });
      }
      let parsed;
      try { parsed = JSON.parse(m[0]); }
      catch (e) {
        return res.status(502).json({ error: `JSON parse fail: ${e.message}`, raw: m[0].slice(0, 300) });
      }
      // Sanitize + defaults
      const project = {
        title: String(parsed.title || prompt.slice(0, 60)),
        description: String(parsed.description || ''),
        difficulty: ['easy','medium','hard'].includes(parsed.difficulty) ? parsed.difficulty : level,
        durationHours: Number(parsed.durationHours) || 4,
        category: ['Science','Technology','Engineering','Math'].includes(parsed.category)
          ? parsed.category : 'Technology',
        components: Array.isArray(parsed.components)
          ? parsed.components.slice(0, 20).map(c => ({
              name: String(c.name || '').slice(0, 100),
              qty: Number(c.qty) || 1,
              estimatedPrice: Number(c.estimatedPrice) || 0,
            }))
          : [],
        steps: Array.isArray(parsed.steps)
          ? parsed.steps.slice(0, 12).map(s => String(s).slice(0, 500))
          : [],
        learningOutcomes: Array.isArray(parsed.learningOutcomes)
          ? parsed.learningOutcomes.slice(0, 8).map(s => String(s).slice(0, 200))
          : [],
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.slice(0, 8).map(s => String(s).slice(0, 30))
          : [],
      };
      const totalCost = project.components.reduce((s, c) => s + c.qty * c.estimatedPrice, 0);
      console.log(`[stem:ai-generate] ✅ "${project.title}" ${project.components.length} parts ${totalCost.toLocaleString()}đ ${Date.now()-t0}ms`);
      return res.json({ success: true, project, totalCost, tookMs: Date.now() - t0 });
    } catch (err) {
      console.error('[stem:ai-generate] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ─ Documents ──────────────────────────────────────────────
  app.get('/api/documents', (_req, res) => res.json({ documents: [] }));
  app.post('/api/documents/upload', notImpl('Upload tài liệu đang phát triển'));
  app.post('/api/documents/fix-status', okMsg);

  // ─ Question bank ──────────────────────────────────────────
  app.post('/api/questions/bulk-generate', notImpl('AI bulk generate đang phát triển'));
  app.post('/api/questions/bulk-save', okMsg);
  app.post('/api/questions/import', okMsg);
  app.post('/api/questions/batch', okMsg);

  // ─ Exam matrix advanced ───────────────────────────────────
  // GET /api/exams/generate-from-matrix?matrixId=... → preview
  app.get('/api/exams/generate-from-matrix', async (req, res) => {
    try {
      const { Pool: GfmPool } = require('pg');
      const gjwt = require('jsonwebtoken');
      const url = process.env.DATABASE_URL;
      if (!url) return res.status(503).json({ success: false, error: 'DB not available' });
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
      let userId;
      try {
        const d = gjwt.verify(
          auth.slice(7),
          process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!',
          { ignoreExpiration: true }
        );
        userId = d.sub || d.userId || d.id;
      }
      catch { return res.status(401).json({ success: false, error: 'Invalid token' }); }
      if (!userId) return res.status(401).json({ success: false, error: 'Token thiếu userId' });
      const matrixId = String(req.query.matrixId || '');
      if (!matrixId) return res.status(400).json({ success: false, error: 'matrixId required' });
      const pool = new GfmPool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
      try {
        const { rows } = await pool.query(
          `SELECT * FROM "ExamMatrix" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
          [matrixId, userId]
        );
        if (!rows[0]) return res.status(404).json({ success: false, error: 'Không tìm thấy ma trận' });
        const m = rows[0];
        let meta = {};
        try { meta = JSON.parse(m.description || '{}'); } catch {}
        return res.json({
          success: true,
          data: {
            matrix: { id: m.id, name: m.name, subject: m.subject, grade: m.grade,
                     totalQuestions: m.totalQuestions, totalScore: m.totalScore,
                     ...meta },
          },
        });
      } finally { await pool.end().catch(() => {}); }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/exams/generate-from-matrix → tạo exam thật
  // Body: { matrixId, title?, description?, useAIForMissing? }
  app.post('/api/exams/generate-from-matrix', async (req, res) => {
    const t0 = Date.now();
    try {
      const { Pool: GfmPool } = require('pg');
      const gjwt = require('jsonwebtoken');
      const { randomUUID: gfmUUID } = require('crypto');
      const url = process.env.DATABASE_URL;
      if (!url) return res.status(503).json({ success: false, error: 'DB not available' });
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
      let userId;
      try {
        const d = gjwt.verify(
          auth.slice(7),
          process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!',
          { ignoreExpiration: true }
        );
        userId = d.sub || d.userId || d.id;
      }
      catch { return res.status(401).json({ success: false, error: 'Invalid token' }); }
      if (!userId) return res.status(401).json({ success: false, error: 'Token thiếu userId' });

      const { matrixId, title: customTitle, useAIForMissing = true } = req.body || {};
      if (!matrixId) return res.status(400).json({ success: false, error: 'matrixId required' });
      const pool = new GfmPool({ connectionString: url, max: 5, connectionTimeoutMillis: 5000 });
      try {
        // 1. Load matrix + parse meta
        const mRes = await pool.query(
          `SELECT * FROM "ExamMatrix" WHERE id=$1 AND "userId"=$2 LIMIT 1`,
          [matrixId, userId]
        );
        if (!mRes.rows[0]) return res.status(404).json({ success: false, error: 'Không tìm thấy ma trận' });
        const matrix = mRes.rows[0];
        let meta = {};
        try { meta = JSON.parse(matrix.description || '{}'); } catch {}
        const topics = Array.isArray(meta.topics) ? meta.topics : [];
        if (topics.length === 0) {
          return res.status(400).json({ success: false, error: 'Ma trận chưa có chủ đề. Vui lòng cập nhật ma trận.' });
        }

        // 2. Cho mỗi topic + difficulty → pick từ Question table, missing → AI generate
        const subject = matrix.subject || 'Vật lí';
        const grade = matrix.grade || 'Khối 11';
        const allPicked = [];  // {questionId, points, order}
        const aiNeeded = [];   // {topic, difficulty, count}
        const DIFF_MAP = { nb: 'easy', th: 'medium', vd: 'hard', vdc: 'hard' };

        for (const topic of topics) {
          // Hỗ trợ 2 schema: legacy counts {nb,th,vd,vdc} hoặc new byPhan {I/II/III: {nb,th,vd}}
          // Gộp về flat counts để query Question bank.
          let counts = topic.counts || {};
          if (topic.byPhan && typeof topic.byPhan === 'object') {
            const sum = (k) => ['I','II','III'].reduce((s, p) => s + Number(topic.byPhan[p]?.[k] || 0), 0);
            counts = { nb: sum('nb'), th: sum('th'), vd: sum('vd'), vdc: counts.vdc || 0 };
          }
          for (const [diffKey, n] of Object.entries(counts)) {
            const need = Number(n) || 0;
            if (need <= 0) continue;
            const dbDiff = DIFF_MAP[diffKey] || 'medium';
            // Pick từ bank — match topic case-insensitive + lowercase difficulty
            const qRes = await pool.query(
              `SELECT id FROM "Question"
                WHERE subject = $1
                  AND grade = $2
                  AND LOWER(difficulty) = LOWER($3)
                  AND LOWER(topic) = LOWER($4)
                  AND (status = 'Hoạt động' OR status = 'active' OR status IS NULL)
                ORDER BY RANDOM() LIMIT $5`,
              [subject, grade, dbDiff, topic.name, need]
            );
            qRes.rows.forEach(r => allPicked.push({ questionId: r.id, points: 1 }));
            const got = qRes.rows.length;
            if (got < need) {
              aiNeeded.push({ topic: topic.name, difficulty: dbDiff, count: need - got });
            }
          }
        }

        // 3. AI fill nếu missing + useAIForMissing
        let aiAdded = 0;
        if (aiNeeded.length > 0 && useAIForMissing) {
          const { generateQuestionsByTopic } = require('./lib/fal-quiz-extractor.cjs');
          console.log(`[generate-from-matrix] 🤖 AI fill ${aiNeeded.length} groups for matrix ${matrixId.slice(0,8)}`);
          const tasks = aiNeeded.map(g => generateQuestionsByTopic({
            subject, grade, topic: g.topic, count: g.count, difficulty: g.difficulty,
          }).catch(e => ({ questions: [], _err: e.message })));
          const results = await Promise.all(tasks);
          const now = new Date();
          for (let gi = 0; gi < results.length; gi++) {
            const group = aiNeeded[gi];
            const newQs = results[gi]?.questions || [];
            for (const q of newQs) {
              const qid = gfmUUID();
              try {
                await pool.query(
                  `INSERT INTO "Question"
                     (id, topic, subject, grade, "questionType", difficulty, content,
                      options, "correctAnswer", explanation, "qualityScore", "usageCount",
                      "aiGenerated", "humanReviewed", status, "createdBy", "createdAt", "updatedAt")
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,true,false,'Hoạt động',$11,$12,$12)`,
                  [qid, group.topic, subject, grade,
                   String(q.questionType || 'MULTIPLE_CHOICE'), group.difficulty,
                   String(q.content || ''),
                   Array.isArray(q.options) ? q.options.map(String) : [],
                   String(q.correctAnswer || ''), q.explanation || '',
                   userId, now]
                );
                allPicked.push({ questionId: qid, points: 1 });
                aiAdded++;
              } catch (e) {
                console.warn(`[generate-from-matrix] insert AI question fail: ${e.message.slice(0, 100)}`);
              }
            }
          }
        }

        if (allPicked.length === 0) {
          // Trả về chi tiết để giáo viên biết bank vs AI bị gì
          const aiErrors = (typeof results !== 'undefined' ? results : [])
            .filter(r => r?._err)
            .map(r => r._err.slice(0, 100));
          return res.status(503).json({
            success: false,
            error: `Không pick được câu nào. ${
              aiNeeded.length === 0
                ? 'Ngân hàng rỗng cho subject/grade/topic này.'
                : useAIForMissing
                  ? `AI fail tất cả ${aiNeeded.length} group: ${aiErrors[0] || 'không rõ lý do'}.`
                  : 'Bank thiếu câu và AI tắt — bật useAIForMissing để AI sinh tiếp.'
            } Cần: ${aiNeeded.reduce((s, g) => s + g.count, 0)} câu, có: ${allPicked.length}.`,
            aiErrors,
            needed: aiNeeded.map(g => `${g.topic} (${g.difficulty}) × ${g.count}`),
          });
        }

        // 4. Tạo Exam + ExamQuestion (transaction)
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const examId = gfmUUID();
          const now = new Date();
          const examTitle = customTitle || `${matrix.name} — Đề thi`;
          const examDesc = JSON.stringify({
            subject, grade: String(grade).replace(/^Khối\s+/, ''),
            source: 'from-matrix', matrixId,
            notes: `Sinh từ ma trận: ${matrix.name}. ${aiAdded > 0 ? `AI bổ sung ${aiAdded} câu.` : ''}`,
            public: false,
            publishedAt: now.toISOString(),
          });
          await client.query(
            `INSERT INTO "Exam"
               (id, title, description, "examType", duration, "totalScore",
                "totalQuestions", status, "matrixId", "userId", "createdAt", "updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,'Nháp',$8,$9,$10,$10)`,
            [examId, examTitle, examDesc,
             matrix.examType || 'Trắc nghiệm', matrix.duration || 45,
             matrix.totalScore || 10, allPicked.length, matrixId, userId, now]
          );
          for (let i = 0; i < allPicked.length; i++) {
            await client.query(
              `INSERT INTO "ExamQuestion" (id, "examId", "questionId", "order", points)
               VALUES ($1,$2,$3,$4,$5)`,
              [gfmUUID(), examId, allPicked[i].questionId, i + 1, allPicked[i].points]
            );
          }
          await client.query('COMMIT');
          console.log(`[generate-from-matrix] ✅ matrix=${matrixId.slice(0,8)} → exam=${examId.slice(0,8)} (${allPicked.length}Q, AI+${aiAdded}, ${Date.now()-t0}ms)`);
          return res.json({
            success: true,
            data: { examId, totalQuestions: allPicked.length, aiAdded },
          });
        } catch (txErr) {
          await client.query('ROLLBACK');
          throw txErr;
        } finally { client.release(); }
      } finally { await pool.end().catch(() => {}); }
    } catch (err) {
      console.error('[generate-from-matrix] ❌', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post('/api/ai/exam/generate-from-matrix', notImpl());
  app.post('/api/ai/exam/generate-multiple-variants', notImpl());

  // Proxy /api/exams* (catch-all) đăng ký SAU specific routes ở trên.
  // Trước đây ở line 6513 nhưng catch trước nên endpoint generate-from-matrix
  // bị shadow → 503 ECONNREFUSED 127.0.0.1:8098 (media-service không tồn tại).
  app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/exams'));

  // ─ AI services ────────────────────────────────────────────
  app.get('/api/ai-tutor/conversations', (_req, res) => res.json({ conversations: [] }));
  app.post('/api/ai-tutor/chat', notImpl('AI Tutor chat đang nâng cấp'));
  app.post('/api/ai/summarize', notImpl('AI summarize đang phát triển'));

  // ─ Extract / Scrape ───────────────────────────────────────
  app.post('/api/extract/website', notImpl('Trích xuất web đang phát triển'));
  app.post('/api/extract/youtube', notImpl('Trích xuất YouTube đang phát triển'));

  // ─ Transcript ─────────────────────────────────────────────
  // ── Transcript persistence (Postgres-backed) ────────────────────
  // GET    /api/transcript/history       — list của user (sort updated DESC)
  // POST   /api/transcript/save          — insert mới
  // GET    /api/transcript/:id           — chi tiết (full text)
  // DELETE /api/transcript/:id           — xoá
  // PATCH  /api/transcript/:id           — update title/type/summary
  {
    const { Pool: TPool } = require('pg');
    const tjwt = require('jsonwebtoken');
    const T_JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
      || 'dev-secret-fallback-change-in-production!!';
    let _tpool = null;
    function getTPool() {
      if (!_tpool && process.env.DATABASE_URL) {
        _tpool = new TPool({
          connectionString: process.env.DATABASE_URL,
          max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
        });
      }
      return _tpool;
    }
    function getTUser(req) {
      const auth = req.headers.authorization || '';
      const tok = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!tok) return null;
      try { return tjwt.verify(tok, T_JWT_SECRET, { ignoreExpiration: true }); }
      catch { return null; }
    }
    function tGenId() {
      return `tr_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36).slice(-4)}`;
    }
    let _tReady = false;
    async function ensureTranscriptTable() {
      if (_tReady) return;
      const pool = getTPool();
      if (!pool) return;
      try {
        // CREATE skeleton + ALTER ADD COLUMN IF NOT EXISTS pattern (Prisma legacy safety)
        await pool.query(`CREATE TABLE IF NOT EXISTS "Transcript" (id TEXT PRIMARY KEY)`);
        const cols = [
          ['"userId"',     'TEXT'],
          ['title',        `TEXT DEFAULT 'Transcript'`],
          ['transcript',   `TEXT DEFAULT ''`],          // full text (1 line per segment, \n-separated)
          ['summary',      `TEXT DEFAULT ''`],
          ['type',         `TEXT DEFAULT 'lecture'`],   // lecture | meeting | other
          ['duration',     'INT DEFAULT 0'],            // seconds
          ['"sourceLanguage"', `TEXT DEFAULT 'vi'`],
          ['"targetLanguage"', `TEXT DEFAULT 'vi'`],
          ['provider',     `TEXT DEFAULT 'fal.ai/whisper-large-v3'`],
          ['"wordCount"',  'INT DEFAULT 0'],
          ['"createdAt"',  'TIMESTAMPTZ DEFAULT NOW()'],
          ['"updatedAt"',  'TIMESTAMPTZ DEFAULT NOW()'],
        ];
        for (const [c, t] of cols) {
          try { await pool.query(`ALTER TABLE "Transcript" ADD COLUMN IF NOT EXISTS ${c} ${t}`); }
          catch (_e) { /* ignore */ }
        }
        // Discover-and-DROP NOT NULL ngoài whitelist + DROP NOT NULL cho optional cols
        try {
          const known = new Set(['id', 'userId', 'title', 'transcript', 'summary', 'type',
            'duration', 'sourceLanguage', 'targetLanguage', 'provider', 'wordCount',
            'createdAt', 'updatedAt']);
          const { rows } = await pool.query(
            `SELECT column_name, is_nullable FROM information_schema.columns
              WHERE table_name = 'Transcript' AND table_schema = 'public'`
          );
          for (const c of rows) {
            if (!known.has(c.column_name) && c.is_nullable === 'NO') {
              try { await pool.query(`ALTER TABLE "Transcript" ALTER COLUMN "${c.column_name}" DROP NOT NULL`); }
              catch (_e) {}
            }
          }
          // Drop FK constraints (Prisma legacy)
          const { rows: fks } = await pool.query(
            `SELECT con.conname FROM pg_constraint con
               JOIN pg_class cls ON cls.oid = con.conrelid
              WHERE cls.relname = 'Transcript' AND con.contype = 'f'`
          );
          for (const fk of fks) {
            try { await pool.query(`ALTER TABLE "Transcript" DROP CONSTRAINT IF EXISTS "${fk.conname}"`); }
            catch (_e) {}
          }
        } catch (_e) {}
        // Backfill timestamps + userId
        try {
          await pool.query(`UPDATE "Transcript" SET "createdAt" = NOW() WHERE "createdAt" IS NULL`);
          await pool.query(`UPDATE "Transcript" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL`);
          await pool.query(`UPDATE "Transcript" SET "userId" = '__legacy__' WHERE "userId" IS NULL`);
        } catch (_e) {}
        try { await pool.query(`ALTER TABLE "Transcript" ALTER COLUMN "userId" SET NOT NULL`); } catch (_e) {}
        await pool.query(`CREATE INDEX IF NOT EXISTS "Transcript_user_idx"
          ON "Transcript"("userId", "createdAt" DESC)`);
        _tReady = true;
      } catch (e) {
        console.error('[transcript:ensure]', e.message);
      }
    }

    function mapTranscript(r, summary = false) {
      const base = {
        id: r.id,
        title: r.title || 'Transcript',
        summary: r.summary || '',
        type: r.type || 'lecture',
        duration: r.duration || 0,
        sourceLanguage: r.sourceLanguage || 'vi',
        targetLanguage: r.targetLanguage || 'vi',
        provider: r.provider || 'fal.ai/whisper-large-v3',
        wordCount: r.wordCount || 0,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
      if (summary) {
        return { ...base, preview: String(r.transcript || '').slice(0, 200) };
      }
      return { ...base, transcript: r.transcript || '' };
    }

    function tWordCount(text) {
      if (!text) return 0;
      const t = String(text).trim();
      if (!t) return 0;
      return t.split(/\s+/).length;
    }

    // GET /api/transcript/history
    app.get('/api/transcript/history', async (req, res) => {
      const user = getTUser(req);
      if (!user || !user.id) return res.json({ history: [] });
      try {
        await ensureTranscriptTable();
        const pool = getTPool();
        if (!pool) return res.json({ history: [] });
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const { rows } = await pool.query(
          `SELECT * FROM "Transcript" WHERE "userId" = $1
           ORDER BY "createdAt" DESC LIMIT $2`,
          [user.id, limit]
        );
        res.json({ history: rows.map(r => mapTranscript(r, true)), count: rows.length });
      } catch (e) {
        console.warn('[transcript:history]', e.message);
        res.json({ history: [], error: e.message });
      }
    });

    // GET /api/transcript/:id
    app.get('/api/transcript/:id', async (req, res) => {
      const user = getTUser(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      try {
        await ensureTranscriptTable();
        const pool = getTPool();
        if (!pool) return res.status(404).json({ error: 'not found' });
        const { rows } = await pool.query(
          `SELECT * FROM "Transcript" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
          [req.params.id, user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Transcript không tồn tại' });
        res.json(mapTranscript(rows[0], false));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // POST /api/transcript/save
    app.post('/api/transcript/save', express.json({ limit: '4mb' }), async (req, res) => {
      const user = getTUser(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const b = req.body || {};
      if (!b.transcript) return res.status(400).json({ error: 'Thiếu trường transcript' });
      try {
        await ensureTranscriptTable();
        const pool = getTPool();
        if (!pool) return res.status(503).json({ error: 'DB chưa sẵn sàng' });
        const id = tGenId();
        const wc = tWordCount(b.transcript);
        const { rows } = await pool.query(
          `INSERT INTO "Transcript" (id, "userId", title, transcript, summary, type, duration,
              "sourceLanguage", "targetLanguage", provider, "wordCount", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW())
           RETURNING *`,
          [id, user.id, b.title || 'Transcript', b.transcript, b.summary || '',
           b.type || 'lecture', Number(b.duration) || 0,
           b.sourceLanguage || 'vi', b.targetLanguage || 'vi',
           b.provider || 'fal.ai/whisper-large-v3', wc]
        );
        res.json({ ok: true, transcript: mapTranscript(rows[0], false) });
      } catch (e) {
        console.error('[transcript:save]', e.message, '| code:', e.code, '| detail:', e.detail);
        res.status(500).json({ error: e.message });
      }
    });

    // PATCH /api/transcript/:id (update title/type/summary)
    app.patch('/api/transcript/:id', express.json({ limit: '4mb' }), async (req, res) => {
      const user = getTUser(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      const b = req.body || {};
      try {
        await ensureTranscriptTable();
        const pool = getTPool();
        if (!pool) return res.status(503).json({ error: 'DB chưa sẵn sàng' });
        const sets = []; const vals = [];
        for (const k of ['title', 'type', 'summary']) {
          if (k in b) { sets.push(`"${k}" = $${vals.length + 1}`); vals.push(b[k]); }
        }
        if (sets.length === 0) return res.status(400).json({ error: 'Không có gì để cập nhật' });
        sets.push(`"updatedAt" = NOW()`);
        vals.push(req.params.id, user.id);
        const { rows } = await pool.query(
          `UPDATE "Transcript" SET ${sets.join(', ')}
           WHERE id = $${vals.length - 1} AND "userId" = $${vals.length}
           RETURNING *`, vals
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Transcript không tồn tại' });
        res.json({ ok: true, transcript: mapTranscript(rows[0], false) });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // DELETE /api/transcript/:id
    app.delete('/api/transcript/:id', async (req, res) => {
      const user = getTUser(req);
      if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' });
      try {
        await ensureTranscriptTable();
        const pool = getTPool();
        if (!pool) return res.status(503).json({ error: 'DB chưa sẵn sàng' });
        const r = await pool.query(
          `DELETE FROM "Transcript" WHERE id = $1 AND "userId" = $2`,
          [req.params.id, user.id]
        );
        if (r.rowCount === 0) return res.status(404).json({ error: 'Transcript không tồn tại' });
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  }

  // ── POST /api/transcript/local/transcribe ── fal.ai Whisper STT
  // FE gửi multipart/form-data: { audio: Blob, sourceLanguage, targetLanguage }
  // Trả: { segments: [{ original, translated? }] } để FE map sang TranscriptSegment
  try {
    const multer = require('multer');
    const falWhisper = require('./lib/fal-whisper.cjs');
    // Upload memory storage, max 25MB (fal.ai whisper limit ~25MB cho data URL)
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

    app.post('/api/transcript/local/transcribe', upload.single('audio'), async (req, res) => {
      try {
        if (!req.file || !req.file.buffer) {
          return res.status(400).json({ error: 'Thiếu file audio' });
        }
        const sourceLanguage = req.body?.sourceLanguage || 'auto';
        const targetLanguage = req.body?.targetLanguage || sourceLanguage;
        const mimeType = req.file.mimetype || 'audio/webm';

        console.log(`[transcript:local] file=${req.file.size}B mime=${mimeType} src=${sourceLanguage} tgt=${targetLanguage}`);

        // STEP 1: Transcribe audio → text bằng fal.ai Whisper
        const result = await falWhisper.transcribeBuffer(req.file.buffer, mimeType, {
          language: sourceLanguage,
          task: 'transcribe',
        });

        // STEP 2: Map chunks → segments format FE expect
        // Nếu translate sang target language khác source → có thể chain qua any-llm
        // (defer cho v2 — v1 chỉ transcribe)
        const segments = (result.chunks || []).map(c => ({
          original: c.text || '',
          translated: targetLanguage !== sourceLanguage && targetLanguage !== 'auto' ? null : undefined,
          startTime: c.timestamp?.[0] || 0,
          endTime: c.timestamp?.[1] || 0,
        }));

        // Nếu chunks rỗng nhưng có text tổng → tạo 1 segment duy nhất
        if (segments.length === 0 && result.text) {
          segments.push({ original: result.text, translated: undefined, startTime: 0, endTime: 0 });
        }

        res.json({
          segments,
          fullText: result.text,
          language: result.inferred_languages?.[0] || sourceLanguage,
          provider: 'fal.ai/whisper-large-v3',
        });
      } catch (e) {
        console.error('[transcript:local]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // Stream endpoint: V1 simply rejects (FE will fall back to non-stream
    // submit at end of recording). True streaming whisper API chưa có ở fal.ai.
    app.post('/api/transcript/local/transcribe-stream', (_req, res) => {
      res.status(202).json({
        ok: true,
        note: 'Stream chưa hỗ trợ — chunks được gửi cùng /transcribe khi dừng ghi',
      });
    });
    console.log('[init] Transcript fal.ai Whisper endpoint ready');
  } catch (e) {
    console.warn('[init] multer/fal-whisper require failed — transcript /local/* sẽ trả 501:', e.message);
    app.post('/api/transcript/local/transcribe', notImpl('multer chưa cài — chạy npm install multer'));
    app.post('/api/transcript/local/transcribe-stream', notImpl('multer chưa cài'));
  }

  app.post('/api/transcript/elevenlabs/transcribe', notImpl('ElevenLabs đang phát triển — dùng "fal.ai Whisper" mode mặc định'));
  app.post('/api/transcript/summarize', notImpl('Transcript summarize đang phát triển'));

  // ─ Camera / IoT ──────────────────────────────────────────
  app.get('/api/camera/recording', (_req, res) => res.json({ recordings: [] }));

  // ════════════════════════════════════════════════════════════
  // CAMERA MANAGEMENT (ONVIF-compliant) — admin CRUD + teacher list
  //
  // Schema "Camera" (lazy migration): id, name, brand, model, ipAddress,
  // httpPort, rtspPort, onvifPort, username, password (base64 obfuscated
  // — TODO replace KMS), mainProfile, subProfile, rtspMainUrl, rtspSubUrl,
  // hlsUrl, snapshotUrl, location, locationType, schoolId, classId,
  // roomNumber, enabled, status, lastSeenAt, lastError, hasPTZ, hasAudio,
  // hasMotion, createdById, createdAt, updatedAt.
  //
  // Endpoints:
  //  GET    /api/cameras                  — teacher: list mình được xem
  //  GET    /api/cameras/:id              — teacher: detail (NO password)
  //  POST   /api/cameras/:id/copy-url     — teacher: trả RTSP có cred để copy
  //  GET    /api/admin/cameras            — admin: list full + cred mask
  //  POST   /api/admin/cameras            — admin: create
  //  PATCH  /api/admin/cameras/:id        — admin: update
  //  DELETE /api/admin/cameras/:id        — admin: delete
  //  POST   /api/admin/cameras/:id/test   — admin: test connection (mock)
  //  POST   /api/admin/cameras/discover   — admin: ONVIF discovery (mock)
  // ════════════════════════════════════════════════════════════
  {
    const { Pool: CamPool } = require('pg');
    const cjwt = require('jsonwebtoken');
    const cnano = (() => { try { return require('nanoid').nanoid; } catch { return null; } })();
    const CAM_JWT_SECRET = process.env.JWT_SECRET
      || process.env.NEXTAUTH_SECRET
      || 'dev-secret-fallback-change-in-production!!';
    let _cmPool = null;
    function getCMPool() {
      if (!_cmPool && process.env.DATABASE_URL) {
        _cmPool = new CamPool({
          connectionString: process.env.DATABASE_URL,
          max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
        });
      }
      return _cmPool;
    }

    function genId(prefix = 'cam') {
      if (cnano) return `${prefix}_${cnano(16)}`;
      return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-6)}`;
    }

    // Bcrypt-style "obfuscation" cho password camera. KHÔNG phải mã hoá thật,
    // chỉ chống đọc trực tiếp khi DB dump. TODO: chuyển sang Cloud KMS.
    function obfuscatePass(p) {
      if (!p) return null;
      return Buffer.from('cam:' + p).toString('base64');
    }
    function deobfuscatePass(s) {
      if (!s) return '';
      try {
        const dec = Buffer.from(s, 'base64').toString('utf8');
        return dec.startsWith('cam:') ? dec.slice(4) : dec;
      } catch { return ''; }
    }

    // Lazy migration — tạo bảng + add cột missing (idempotent)
    let _camTablesEnsured = false;
    async function ensureCameraTables() {
      if (_camTablesEnsured) return;
      const pool = getCMPool();
      if (!pool) return;
      try {
        await pool.query(`CREATE TABLE IF NOT EXISTS "Camera" (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          brand         TEXT,
          model         TEXT,
          serialNumber  TEXT,
          ipAddress     TEXT NOT NULL,
          httpPort      INT  DEFAULT 80,
          rtspPort      INT  DEFAULT 554,
          onvifPort     INT  DEFAULT 80,
          username      TEXT,
          password      TEXT,
          mainProfile   TEXT,
          subProfile    TEXT,
          rtspMainUrl   TEXT,
          rtspSubUrl    TEXT,
          hlsUrl        TEXT,
          snapshotUrl   TEXT,
          location      TEXT,
          locationType  TEXT,
          schoolId      TEXT,
          classId       TEXT,
          roomNumber    TEXT,
          enabled       BOOLEAN NOT NULL DEFAULT true,
          status        TEXT    NOT NULL DEFAULT 'unknown',
          lastSeenAt    TIMESTAMPTZ,
          lastError     TEXT,
          hasPTZ        BOOLEAN NOT NULL DEFAULT false,
          hasAudio      BOOLEAN NOT NULL DEFAULT false,
          hasMotion     BOOLEAN NOT NULL DEFAULT false,
          createdById   TEXT,
          createdAt     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updatedAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
        // Indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_camera_school ON "Camera"(schoolId)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_camera_class  ON "Camera"(classId)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_camera_enabled ON "Camera"(enabled, status)`);
        _camTablesEnsured = true;
      } catch (e) {
        console.error('[camera:ensureTables]', e.message);
      }
    }

    // Auto-build RTSP URL theo brand nếu admin không cung cấp custom URL
    // Hikvision: rtsp://user:pass@ip:554/Streaming/Channels/101 (main) / 102 (sub)
    // Dahua:     rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0
    // Generic:   rtsp://user:pass@ip:554/  (user phải custom)
    function buildRtspUrl(cam, sub = false) {
      if (sub && cam.rtspSubUrl) return cam.rtspSubUrl;
      if (!sub && cam.rtspMainUrl) return cam.rtspMainUrl;
      const auth = (cam.username || cam.password)
        ? `${encodeURIComponent(cam.username || '')}:${encodeURIComponent(deobfuscatePass(cam.password) || '')}@`
        : '';
      const host = `${cam.ipAddress}:${cam.rtspPort || 554}`;
      const brand = (cam.brand || '').toLowerCase();
      let path;
      if (brand.includes('hikvision')) {
        path = `/Streaming/Channels/${sub ? '102' : '101'}`;
      } else if (brand.includes('dahua')) {
        path = `/cam/realmonitor?channel=1&subtype=${sub ? 1 : 0}`;
      } else if (brand.includes('axis')) {
        path = `/axis-media/media.amp?streamprofile=${sub ? 'Mobile' : 'Quality'}`;
      } else if (brand.includes('uniview')) {
        path = `/media/video${sub ? '2' : '1'}`;
      } else {
        path = '/'; // generic — rely on profile token
      }
      return `rtsp://${auth}${host}${path}`;
    }

    // Map row → response shape (KHÔNG bao gồm password rõ)
    function mapCameraPublic(r) {
      return {
        id: r.id, name: r.name, brand: r.brand || '', model: r.model || '',
        ipAddress: r.ipAddress, httpPort: r.httpPort, rtspPort: r.rtspPort,
        onvifPort: r.onvifPort,
        username: r.username || '',
        // password masked
        passwordMask: r.password ? '••••••••' : null,
        mainProfile: r.mainProfile || '', subProfile: r.subProfile || '',
        rtspMainUrl: buildRtspUrl(r, false),
        rtspSubUrl:  buildRtspUrl(r, true),
        hlsUrl: r.hlsUrl || null, snapshotUrl: r.snapshotUrl || null,
        location: r.location || '', locationType: r.locationType || '',
        schoolId: r.schoolId || null, classId: r.classId || null,
        roomNumber: r.roomNumber || '',
        enabled: !!r.enabled, status: r.status || 'unknown',
        lastSeenAt: r.lastSeenAt, lastError: r.lastError || null,
        hasPTZ: !!r.hasPTZ, hasAudio: !!r.hasAudio, hasMotion: !!r.hasMotion,
        createdAt: r.createdAt, updatedAt: r.updatedAt,
      };
    }
    // Teacher view — KHÔNG cred + ko mask password info
    function mapCameraTeacher(r) {
      return {
        id: r.id, name: r.name, brand: r.brand || '', model: r.model || '',
        ipAddress: r.ipAddress,
        rtspUrl: buildRtspUrl(r, false),     // có cred để copy / play
        hlsUrl: r.hlsUrl || null,
        snapshotUrl: r.snapshotUrl || null,
        location: r.location || '', locationType: r.locationType || '',
        classId: r.classId || null, roomNumber: r.roomNumber || '',
        enabled: !!r.enabled, status: r.status || 'unknown',
        hasPTZ: !!r.hasPTZ, hasAudio: !!r.hasAudio,
      };
    }

    function getCamUser(req) {
      const auth = req.headers.authorization || '';
      const tok = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!tok) return null;
      try { return cjwt.verify(tok, CAM_JWT_SECRET, { ignoreExpiration: true }); }
      catch { return null; }
    }
    function isAdminRole(u) {
      const r = (u?.role || '').toUpperCase();
      return r === 'ADMIN' || r === 'SUPERADMIN';
    }

    // ── GET /api/cameras ──────────────────────────────────────
    // Teacher view: list cameras enabled + thuộc class teacher dạy hoặc
    // toàn trường (school cameras). Tạm thời: trả tất cả enabled = true.
    app.get('/api/cameras', async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.json({ cameras: [] });
        const { rows } = await pool.query(
          `SELECT * FROM "Camera" WHERE enabled = true ORDER BY name ASC`
        );
        res.json({ cameras: rows.map(mapCameraTeacher), count: rows.length });
      } catch (e) {
        console.error('[cameras:list]', e.message);
        res.json({ cameras: [], count: 0 });
      }
    });

    // ── GET /api/cameras/:id ──────────────────────────────────
    app.get('/api/cameras/:id', async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.status(404).json({ error: 'not found' });
        const { rows } = await pool.query(`SELECT * FROM "Camera" WHERE id = $1 LIMIT 1`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Camera không tồn tại' });
        res.json(mapCameraTeacher(rows[0]));
      } catch (e) {
        console.error('[cameras:get]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // ── POST /api/cameras/:id/copy-url ────────────────────────
    // Trả RTSP URL có credentials để teacher copy vào VLC / phần mềm khác.
    // Audit log mỗi lần copy (chống abuse — nhưng v1 chưa enforce).
    app.post('/api/cameras/:id/copy-url', async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.status(404).json({ error: 'not found' });
        const { rows } = await pool.query(`SELECT * FROM "Camera" WHERE id = $1 AND enabled = true LIMIT 1`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Camera không tồn tại hoặc đã bị tắt' });
        const cam = rows[0];
        console.log(`[camera:copy-url] user=${user.id} cam=${cam.id} ip=${cam.ipAddress}`);
        res.json({
          rtspMain: buildRtspUrl(cam, false),
          rtspSub:  buildRtspUrl(cam, true),
          hls:      cam.hlsUrl || null,
          snapshot: cam.snapshotUrl || null,
          name:     cam.name,
        });
      } catch (e) {
        console.error('[cameras:copy-url]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // ── GET /api/admin/cameras ────────────────────────────────
    app.get('/api/admin/cameras', async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      if (!isAdminRole(user)) return res.status(403).json({ error: 'forbidden — chỉ ADMIN' });
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.json({ cameras: [] });
        const { rows } = await pool.query(`SELECT * FROM "Camera" ORDER BY createdAt DESC`);
        res.json({ cameras: rows.map(mapCameraPublic), count: rows.length });
      } catch (e) {
        console.error('[admin:cameras:list]', e.message);
        res.json({ cameras: [], count: 0 });
      }
    });

    // ── POST /api/admin/cameras ───────────────────────────────
    app.post('/api/admin/cameras', express.json({ limit: '128kb' }), async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      if (!isAdminRole(user)) return res.status(403).json({ error: 'forbidden — chỉ ADMIN' });
      const b = req.body || {};
      if (!b.name || !b.ipAddress) {
        return res.status(400).json({ error: 'Thiếu trường bắt buộc: name, ipAddress' });
      }
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.status(503).json({ error: 'DB chưa sẵn sàng' });
        const id = genId();
        const params = [
          id, b.name, b.brand || null, b.model || null, b.serialNumber || null,
          b.ipAddress, Number(b.httpPort) || 80, Number(b.rtspPort) || 554,
          Number(b.onvifPort) || 80,
          b.username || null, obfuscatePass(b.password),
          b.mainProfile || null, b.subProfile || null,
          b.rtspMainUrl || null, b.rtspSubUrl || null,
          b.hlsUrl || null, b.snapshotUrl || null,
          b.location || null, b.locationType || null,
          b.schoolId || null, b.classId || null, b.roomNumber || null,
          b.enabled !== false,
          !!b.hasPTZ, !!b.hasAudio, !!b.hasMotion,
          user.id,
        ];
        const { rows } = await pool.query(`
          INSERT INTO "Camera" (id, name, brand, model, "serialNumber",
            "ipAddress", "httpPort", "rtspPort", "onvifPort", username, password,
            "mainProfile", "subProfile", "rtspMainUrl", "rtspSubUrl",
            "hlsUrl", "snapshotUrl", location, "locationType",
            "schoolId", "classId", "roomNumber", enabled, "hasPTZ", "hasAudio",
            "hasMotion", "createdById")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                  $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
          RETURNING *
        `, params);
        res.json({ camera: mapCameraPublic(rows[0]) });
      } catch (e) {
        console.error('[admin:cameras:create]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // ── PATCH /api/admin/cameras/:id ──────────────────────────
    app.patch('/api/admin/cameras/:id', express.json({ limit: '128kb' }), async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      if (!isAdminRole(user)) return res.status(403).json({ error: 'forbidden — chỉ ADMIN' });
      const b = req.body || {};
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.status(503).json({ error: 'DB chưa sẵn sàng' });
        const allowed = [
          'name', 'brand', 'model', 'serialNumber', 'ipAddress',
          'httpPort', 'rtspPort', 'onvifPort', 'username',
          'mainProfile', 'subProfile', 'rtspMainUrl', 'rtspSubUrl',
          'hlsUrl', 'snapshotUrl', 'location', 'locationType',
          'schoolId', 'classId', 'roomNumber', 'enabled',
          'hasPTZ', 'hasAudio', 'hasMotion',
        ];
        const sets = []; const vals = [];
        for (const k of allowed) {
          if (k in b) { sets.push(`"${k}" = $${vals.length + 1}`); vals.push(b[k]); }
        }
        // password chỉ update khi admin gửi mới (không gửi → giữ nguyên)
        if (b.password !== undefined && b.password !== null && b.password !== '') {
          sets.push(`password = $${vals.length + 1}`); vals.push(obfuscatePass(b.password));
        }
        if (sets.length === 0) return res.status(400).json({ error: 'Không có gì để cập nhật' });
        sets.push(`"updatedAt" = NOW()`);
        vals.push(req.params.id);
        const { rows } = await pool.query(
          `UPDATE "Camera" SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
          vals
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Camera không tồn tại' });
        res.json({ camera: mapCameraPublic(rows[0]) });
      } catch (e) {
        console.error('[admin:cameras:update]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // ── DELETE /api/admin/cameras/:id ─────────────────────────
    app.delete('/api/admin/cameras/:id', async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      if (!isAdminRole(user)) return res.status(403).json({ error: 'forbidden — chỉ ADMIN' });
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.status(503).json({ error: 'DB chưa sẵn sàng' });
        const r = await pool.query(`DELETE FROM "Camera" WHERE id = $1`, [req.params.id]);
        if (r.rowCount === 0) return res.status(404).json({ error: 'Camera không tồn tại' });
        res.json({ ok: true });
      } catch (e) {
        console.error('[admin:cameras:delete]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // ── POST /api/admin/cameras/:id/test ──────────────────────
    // Mock test connection — v1 chỉ check IP+port reachable bằng TCP probe.
    // Sau này sẽ dùng node-onvif probe ONVIF capabilities.
    app.post('/api/admin/cameras/:id/test', async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      if (!isAdminRole(user)) return res.status(403).json({ error: 'forbidden — chỉ ADMIN' });
      try {
        await ensureCameraTables();
        const pool = getCMPool();
        if (!pool) return res.status(503).json({ error: 'DB chưa sẵn sàng' });
        const { rows } = await pool.query(`SELECT * FROM "Camera" WHERE id = $1 LIMIT 1`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Camera không tồn tại' });
        const cam = rows[0];
        // TCP probe RTSP port (timeout 3s)
        const net = require('net');
        const result = await new Promise((resolve) => {
          const sock = net.createConnection({ host: cam.ipAddress, port: cam.rtspPort || 554, timeout: 3000 });
          let resolved = false;
          const done = (ok, msg) => { if (resolved) return; resolved = true; try { sock.destroy(); } catch {} resolve({ ok, msg }); };
          sock.once('connect', () => done(true, `TCP ${cam.ipAddress}:${cam.rtspPort || 554} OK`));
          sock.once('error', (e) => done(false, `TCP error: ${e.message}`));
          sock.once('timeout', () => done(false, 'Timeout 3s — không kết nối được'));
        });
        // Update DB status
        await pool.query(
          `UPDATE "Camera" SET status = $1, "lastSeenAt" = $2, "lastError" = $3, "updatedAt" = NOW() WHERE id = $4`,
          [result.ok ? 'online' : 'offline', result.ok ? new Date() : null, result.ok ? null : result.msg, cam.id]
        );
        res.json({
          ok: result.ok,
          message: result.msg,
          status: result.ok ? 'online' : 'offline',
          rtspMain: buildRtspUrl(cam, false),
          rtspSub:  buildRtspUrl(cam, true),
        });
      } catch (e) {
        console.error('[admin:cameras:test]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // ── POST /api/admin/cameras/discover ──────────────────────
    // ONVIF WS-Discovery v1 mock — trả 0 results với hint setup manual.
    // Production: dùng node-onvif Discovery hoặc UDP multicast 239.255.255.250:3702.
    app.post('/api/admin/cameras/discover', express.json({ limit: '8kb' }), async (req, res) => {
      const user = getCamUser(req);
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });
      if (!isAdminRole(user)) return res.status(403).json({ error: 'forbidden — chỉ ADMIN' });
      // V1: chưa scan thật. Trả notice cho UI hiển thị hướng dẫn nhập tay.
      res.json({
        discovered: [],
        message: 'ONVIF discovery chưa khả dụng trên Cloud Run (UDP multicast bị NAT block). ' +
                 'Vui lòng nhập manual IP camera bằng SADP Tool / Hikvision iVMS / Dahua ConfigTool ở mạng LAN, ' +
                 'sau đó nhập IP + cred vào form Add Camera.',
        hint: {
          sadpDownload: 'https://www.hikvision.com/en/support/tools/hitools/clea4befef0726a8e4/',
          dahuaTool:    'https://www.dahuasecurity.com/support/downloadCenter/tools',
          nxWitness:    'https://www.networkoptix.com/nx-witness/free-trial',
          commonRtspPaths: {
            Hikvision: 'rtsp://user:pass@IP:554/Streaming/Channels/101',
            Dahua:     'rtsp://user:pass@IP:554/cam/realmonitor?channel=1&subtype=0',
            Axis:      'rtsp://user:pass@IP:554/axis-media/media.amp',
            Uniview:   'rtsp://user:pass@IP:554/media/video1',
          },
        },
      });
    });

    console.log('[init] Camera management endpoints (Camera CRUD + ONVIF) ready');
  }

  // ─ Agents / Settings ─────────────────────────────────────
  app.get('/api/student/agent-settings', emptyObj);
  app.put('/api/student/agent-settings', okMsg);

  // ─ Openfang stub ─────────────────────────────────────────
  app.get('/api/openfang-service', emptyObj);
  app.post('/api/openfang-service/chat', notImpl('Service đang nâng cấp'));

  // ─ Learning service: Wishlist + Purchase History (Postgres-backed) ─
  // FE shape: WishlistItem[] / Enrollment[] (array trực tiếp, KHÔNG bọc object).
  // Các endpoint còn lại (videos/assets/reviews/...) → empty array đúng shape.
  {
    const { Pool: LPool } = require('pg');
    const ljwt = require('jsonwebtoken');
    const LJWT_SECRET = process.env.JWT_SECRET
      || process.env.NEXTAUTH_SECRET
      || 'dev-secret-fallback-change-in-production!!';
    let _lpool = null;
    function getLPool() {
      if (!_lpool && process.env.DATABASE_URL) {
        _lpool = new LPool({
          connectionString: process.env.DATABASE_URL,
          max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
        });
      }
      return _lpool;
    }
    function getLearnUserId(req) {
      try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) return null;
        const d = ljwt.verify(auth.slice(7), LJWT_SECRET);
        return d.sub || d.userId || d.email || null;
      } catch { return null; }
    }
    let _wishTableReady = false;
    async function ensureWishlistTable() {
      if (_wishTableReady) return;
      const pool = getLPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "Wishlist" (
          id          TEXT PRIMARY KEY,
          "userId"    TEXT NOT NULL,
          "courseId"  TEXT NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE ("userId", "courseId")
        )
      `);
      _wishTableReady = true;
    }

    // GET /api/learning/wishlist → WishlistItem[]
    app.get('/api/learning/wishlist', async (req, res) => {
      const userId = getLearnUserId(req);
      if (!userId) return res.json([]); // chưa login → empty (UI hiển thị empty state)
      const pool = getLPool();
      if (!pool) return res.json([]);
      try {
        await ensureWishlistTable();
        // LEFT JOIN Course để lấy thông tin hiển thị; nếu course đã xoá → vẫn trả entry
        const { rows } = await pool.query(
          `SELECT w.id, w."userId", w."courseId", w."createdAt",
                  c.id AS c_id, c.title AS c_title, c."imageUrl" AS c_image,
                  c.price AS c_price, c."userId" AS c_owner_id
             FROM "Wishlist" w
             LEFT JOIN "Course" c ON c.id = w."courseId"
            WHERE w."userId" = $1
            ORDER BY w."createdAt" DESC`,
          [userId]
        );
        const items = rows.map(r => ({
          id: r.id,
          userId: r.userId,
          courseId: r.courseId,
          createdAt: r.createdAt,
          course: {
            id: r.c_id || r.courseId,
            title: r.c_title || 'Khoá học không còn khả dụng',
            slug: r.c_id || r.courseId,
            image: r.c_image || null,
            regularPrice: Number(r.c_price || 0),
            beforePrice: 0,
            lessons: 0,
            user: { id: r.c_owner_id || '', name: 'AeroEduVision', image: null },
          },
        }));
        res.json(items);
      } catch (e) {
        console.error('[learning:wishlist:GET]', e.message);
        res.json([]); // never 500 cho UI list
      }
    });

    // POST /api/learning/wishlist/:courseId
    app.post('/api/learning/wishlist/:courseId', async (req, res) => {
      const userId = getLearnUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getLPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });
      try {
        await ensureWishlistTable();
        const { randomUUID } = require('crypto');
        const id = randomUUID();
        await pool.query(
          `INSERT INTO "Wishlist" (id, "userId", "courseId")
           VALUES ($1, $2, $3)
           ON CONFLICT ("userId", "courseId") DO NOTHING`,
          [id, userId, req.params.courseId]
        );
        res.json({ ok: true });
      } catch (e) {
        console.error('[learning:wishlist:POST]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // DELETE /api/learning/wishlist/:courseId
    app.delete('/api/learning/wishlist/:courseId', async (req, res) => {
      const userId = getLearnUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getLPool();
      if (!pool) return res.status(503).json({ error: 'DB unavailable' });
      try {
        await ensureWishlistTable();
        await pool.query(
          `DELETE FROM "Wishlist" WHERE "userId"=$1 AND "courseId"=$2`,
          [userId, req.params.courseId]
        );
        res.json({ ok: true });
      } catch (e) {
        console.error('[learning:wishlist:DELETE]', e.message);
        res.status(500).json({ error: e.message });
      }
    });

    // GET /api/learning/purchase-history → Enrollment[]
    // Nguồn dữ liệu: PaymentOrder (status=PAID) — map plan → "course" để FE hiển thị.
    app.get('/api/learning/purchase-history', async (req, res) => {
      const userId = getLearnUserId(req);
      if (!userId) return res.json([]);
      const pool = getLPool();
      if (!pool) return res.json([]);
      try {
        // Truy vấn PaymentOrder; nếu bảng chưa tồn tại → empty
        const { rows } = await pool.query(
          `SELECT id, "userId", "userEmail", "planId", "planName", amount,
                  status, "createdAt", "approvedAt"
             FROM "PaymentOrder"
            WHERE ("userId" = $1 OR "userEmail" = $1) AND status = 'PAID'
            ORDER BY COALESCE("approvedAt", "createdAt") DESC`,
          [userId]
        );
        const items = rows.map(r => ({
          id: r.id,
          userId: r.userId || userId,
          courseId: r.planId,
          price: Number(r.amount || 0),
          createdAt: r.approvedAt || r.createdAt,
          course: {
            id: r.planId,
            title: r.planName || r.planId,
            slug: r.planId,
            image: null,
            duration: null,
            lessons: 0,
            accessTime: null,
            user: { id: 'aeroedu', name: 'AeroEduVision', image: null },
          },
        }));
        res.json(items);
      } catch (e) {
        // PaymentOrder chưa tồn tại trên DB → trả empty, không 500
        if (/relation .* does not exist/i.test(e.message)) return res.json([]);
        console.error('[learning:purchase-history]', e.message);
        res.json([]);
      }
    });
  }

  // ─ Learning service: các endpoint khác (empty đúng shape) ─
  app.get('/api/learning/my-courses', emptyArr);
  app.get('/api/learning/certificate/:courseId',
    notImpl('Chứng chỉ chưa khả dụng — hoàn thành khoá học để nhận'));
  app.get('/api/learning/course/:courseId/videos', emptyArr);
  app.get('/api/learning/course/:courseId/assets', emptyArr);
  app.get('/api/learning/course/:courseId/reviews', emptyArr);
  app.post('/api/learning/course/:courseId/reviews', okMsg);
  // my-courses-activity đã có handler thật ở trên (line ~2226), không stub đè.
  // Catch-all học sinh đăng ký khoá học, like, bookmark...
  app.post('/api/learning/enroll/:courseId', okMsg);
  app.post('/api/learning/like/:courseId', okMsg);
  app.post('/api/learning/bookmark/:courseId', okMsg);

  // ─ Achievements (chưa có data thật) ───────────────────────
  // Trả structure đúng format AchievementsResponse để FE render được skeleton
  app.get('/api/achievements', (_req, res) => res.json({
    achievements: [],
    totalXP: 0,
    earnedCount: 0,
    totalCount: 0,
    level: 1,
    currentXP: 0,
    nextLevelXP: 100,
    streak: 0,
  }));

  // ─ Analytics dashboard (chưa có data thật cho dashboard tổng quan) ────────
  // 4 endpoints frontend analytics.service.ts gọi
  app.get('/api/analytics/dashboard', (_req, res) => res.json({
    totalUsers: 0, totalCourses: 0, totalRevenue: 0,
    totalEnrollments: 0, monthlyGrowth: 0, weeklyActive: 0,
  }));
  app.get('/api/analytics/activity', emptyArr);
  app.get('/api/analytics/courses', emptyArr);
  app.get('/api/analytics/students', emptyArr);

  // ─ Chat (chưa implement chat thực — trả empty để FE không 503) ────────────
  app.get('/api/chat/rooms', emptyArr);
  app.post('/api/chat/rooms', notImpl('Chat đang phát triển'));
  app.get('/api/chat/rooms/:id/messages', emptyArr);
  app.post('/api/chat/rooms/:id/messages', notImpl('Chat đang phát triển'));
  app.post('/api/chat/rooms/:id/read', okMsg);
  app.get('/api/chat/users/search', emptyArr);

  // ─ Categories CRUD (PUT/DELETE — admin Categories.tsx) ────────────────────
  app.put('/api/categories/:id', notImpl('Admin categories editor đang phát triển'));
  app.delete('/api/categories/:id', notImpl('Admin categories editor đang phát triển'));

  // ─ Teacher exam upload PDF + answer-key (CreateExam.tsx) ──────────────────
  // Frontend gọi multipart/form-data → trả 501 thay vì 503 ECONNREFUSED
  app.post('/api/teacher/exams/upload-pdf', notImpl('Upload PDF đang phát triển — dùng tạo đề thủ công'));
  app.post('/api/teacher/exams/:examId/answer-key', okMsg);

  // ─ Generic upload signed URL (useGcsUpload hook) ──────────────────────────
  // Hook hooks/useGcsUpload.ts POST tới /upload/request để xin signed-URL GCS.
  // Stub trả 501 — FE đã có fallback data-URL trong instructor.service.ts.
  app.post('/api/upload/request', notImpl('Upload signed URL đang phát triển — dùng client-side data URL'));
}

// ── /api/* → Rust aero-backend gateway ─────────────────────
app.use(makeProxy(BACKEND_URL, 'aero-backend', '/api'));

// ── /socket.io → WebSocket proxy ───────────────────────────
app.use('/socket.io', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  ws: true,
  on: {
    error: (err, req, res) => {
      console.error(`[proxy:websocket] ${req.method} ${req.originalUrl} → ${err.message}`);
      if (res && !res.headersSent) res.status(502).end();
    },
  },
}));

// ── Static files (Vite build output) ───────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

// ── SPA Fallback → index.html ───────────────────────────────
app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// ── Start ───────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] ✅ AeroEduVision listening on 0.0.0.0:${PORT}`);
  console.log(`[server] 📡 API proxy     → ${BACKEND_URL}`);
  if (!USE_NODEJS_AUTH) {
    console.log(`[server] 🔐 Auth proxy    → ${AUTH_SERVICE_URL}`);
  }
});
