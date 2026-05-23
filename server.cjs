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
      console.error('[auth:login] ❌', err.message);
      return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại' });
    }
  });

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
      console.error('[auth:google] ❌', err.message);
      return res.status(500).json({ error: 'Lỗi xác thực Google, vui lòng thử lại' });
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

      const pool = getPool();
      const { rows } = await pool.query(
        'SELECT * FROM "User" WHERE id = $1 LIMIT 1',
        [decoded.sub]
      );
      if (!rows[0]) return res.status(404).json({ error: 'User not found' });
      return res.json(publicUser(rows[0]));
    } catch {
      return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
  });

  // ── POST /api/auth/logout ─────────────────────────────────
  app.post('/api/auth/logout', (_req, res) => {
    // JWT is stateless — client discards the token
    return res.json({ success: true });
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
      const { email, password, name } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email và mật khẩu không được để trống' });
      }

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
        ) VALUES ($1,$2,$3,$4,'STUDENT',NULL,NULL,false,0,$5,$6)`,
        [id, email.toLowerCase().trim(), displayName, hash, now, now]
      );

      const { rows } = await pool.query('SELECT * FROM "User" WHERE id = $1', [id]);
      const user = rows[0];
      const token = issueToken(user);
      console.log(`[auth:register] ✅ ${user.email}`);
      return res.status(201).json({
        user: publicUser(user),
        tokens: { accessToken: token, refreshToken: '' },
      });
    } catch (err) {
      console.error('[auth:register] ❌', err.message);
      return res.status(500).json({ error: 'Lỗi đăng ký, vui lòng thử lại' });
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
      const decoded = ejwt.verify(auth.slice(7), EJWT_SECRET);
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }

  // Parse subject out of description JSON (stored as {"subject":"Vật lý"})
  function parseSubject(description) {
    if (!description) return null;
    try {
      const parsed = JSON.parse(description);
      return parsed.subject || null;
    } catch {
      return description || null;
    }
  }

  function mapExam(row) {
    return {
      id:             row.id,
      title:          row.title,
      subject:        parseSubject(row.description),
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
        + `file=${filename || 'unknown'} questions=${result.questions.length} took=${Date.now() - t0}ms`);

      return res.json({
        success: true,
        ...result,
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
            'wayground-import',
            subject || 'Vật lí',
            String(grade || '11'),
            String(q.questionType || 'MULTIPLE_CHOICE'),
            String(q.content || ''),
            JSON.stringify(q.options || []),
            String(q.correctAnswer || ''),
            q.explanation || null,
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
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
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

// ── Teacher stubs — PHẢI trước proxy teacher-service (port 8106 offline) ──
// Trả empty thay vì 503. Khi service được khôi phục, xoá các stub này.

// /api/teacher/analytics — shape khớp AnalyticsData interface ở frontend
// (có totalStudents, topPerformingStudents[], strugglingStudents[], v.v.)
app.get('/api/teacher/analytics', async (req, res) => {
  const auth = req.headers.authorization || '';
  let teacherId = null;
  if (auth.startsWith('Bearer ')) { try { teacherId = _akVerify(auth.slice(7)).sub; } catch {} }
  const period = (req.query.period === 'week' || req.query.period === 'semester') ? req.query.period : 'month';
  // Default empty shape — match AnalyticsData interface để page không crash
  let totalStudents = 0;
  if (teacherId) {
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT COUNT(DISTINCT cs.id)::int AS n
        FROM "ClassStudent" cs
        JOIN "Class" c ON c.id = cs.class_id
        WHERE c.teacher_id = $1
      `, [teacherId]);
      totalStudents = rows[0]?.n || 0;
    } catch { /* bảng có thể chưa có data */ }
  }
  return res.json({
    period,
    meta: { fromClassStudent: totalStudents, fromTeacherStudentLink: 0, uniqueStudents: totalStudents, gradedSheets: 0 },
    totalStudents,
    averageScore: 0,
    completionRate: 0,
    engagementScore: 0,
    topPerformingStudents: [],
    strugglingStudents: [],
    subjectPerformance: [],
    weeklyProgress: [],
  });
});
app.get('/api/teacher/dashboard', (_req, res) => res.json({ classes: 0, students: 0, exams: 0, pending_grading: 0 }));
app.get('/api/teacher/modules', (_req, res) => res.json({ modules: [], total: 0 }));
app.get('/api/teacher/modules/public', (_req, res) => res.json({ modules: [], total: 0 }));
app.get('/api/teacher/my-students', (_req, res) => res.json({ students: [], total: 0 }));
app.get('/api/teacher/student-requests', (_req, res) => res.json({ requests: [], total: 0 }));
app.get('/api/teacher/sprints', (_req, res) => res.json({ sprints: [], total: 0 }));
app.get('/api/teacher/students', (_req, res) => res.json({ students: [], total: 0 }));
app.get('/api/teacher/leaderboard', (_req, res) => res.json({ teachers: [], total: 0 }));
app.get('/api/teacher/roster', (_req, res) => res.json({ roster: [], total: 0 }));

// ── Career Survey + Teacher CPD (Knowledge Graph) — DB-backed
// /api/users/me/career-survey GET/POST — khảo sát nghề nghiệp GV/PH/HS
// /api/teachers/cpd          GET/POST — Continuing Professional Development log
// Cần persistence để GV không mất tiến độ khi reload trang.

async function _ensureKGTables() {
  const pool = _getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "UserCareerSurvey" (
      user_id     VARCHAR(255) PRIMARY KEY,
      data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
      completed   BOOLEAN      NOT NULL DEFAULT false,
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('UserCareerSurvey', [
    ['data',       "JSONB DEFAULT '{}'::jsonb"],
    ['completed',  "BOOLEAN DEFAULT false"],
    ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('UserCareerSurvey', ['userId','data','completed','createdAt','updatedAt']);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "TeacherCPD" (
      user_id     VARCHAR(255) PRIMARY KEY,
      progress    JSONB        NOT NULL DEFAULT '{}'::jsonb,
      cpd_log     JSONB        NOT NULL DEFAULT '[]'::jsonb,
      lat         NUMERIC,
      lon         NUMERIC,
      province    VARCHAR(100),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('TeacherCPD', [
    ['progress',   "JSONB DEFAULT '{}'::jsonb"],
    ['cpd_log',    "JSONB DEFAULT '[]'::jsonb"],
    ['lat',        "NUMERIC"],
    ['lon',        "NUMERIC"],
    ['province',   "VARCHAR(100)"],
    ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('TeacherCPD', ['userId','progress','cpdLog','lat','lon','province','createdAt','updatedAt']);
}
_ensureKGTables().catch(e => console.error('[kg] migration error:', e.message));

function _kgAuth(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try { return _akVerify(auth.slice(7)); }
  catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
}

// GET /api/users/me/career-survey → { completed, data }
app.get('/api/users/me/career-survey', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT data, completed FROM "UserCareerSurvey" WHERE user_id = $1`,
      [decoded.sub]);
    if (!rows.length) return res.json({ completed: false, data: null });
    return res.json({ completed: rows[0].completed, data: rows[0].data });
  } catch (e) { console.error('[career-survey:get]', e.message); return res.json({ completed: false, data: null }); }
});

// POST /api/users/me/career-survey { ...SurveyData } — upsert
app.post('/api/users/me/career-survey', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const data = req.body || {};
    const completed = !data.skipped;
    const pool = _getPool();
    await pool.query(`
      INSERT INTO "UserCareerSurvey"(user_id, data, completed, updated_at)
      VALUES ($1, $2::jsonb, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        data = EXCLUDED.data, completed = EXCLUDED.completed, updated_at = NOW()
    `, [decoded.sub, JSON.stringify(data), completed]);
    return res.json({ ok: true, completed });
  } catch (e) { console.error('[career-survey:post]', e.message); return res.status(500).json({ error: 'Lỗi lưu khảo sát' }); }
});

// GET /api/teachers/cpd → { progress, cpdLog, lat, lon, province }
app.get('/api/teachers/cpd', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT progress, cpd_log, lat, lon, province FROM "TeacherCPD" WHERE user_id = $1`,
      [decoded.sub]);
    if (!rows.length) return res.json({ progress: {}, cpdLog: [], lat: null, lon: null, province: null });
    const r = rows[0];
    return res.json({ progress: r.progress || {}, cpdLog: r.cpd_log || [], lat: r.lat, lon: r.lon, province: r.province });
  } catch (e) { console.error('[cpd:get]', e.message); return res.json({ progress: {}, cpdLog: [] }); }
});

// POST /api/teachers/cpd { progress, cpdLog?, lat?, lon?, province? } — upsert
app.post('/api/teachers/cpd', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const { progress = {}, cpdLog = null, lat = null, lon = null, province = null } = req.body || {};
    const pool = _getPool();
    if (cpdLog !== null) {
      await pool.query(`
        INSERT INTO "TeacherCPD"(user_id, progress, cpd_log, lat, lon, province, updated_at)
        VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          progress = EXCLUDED.progress, cpd_log = EXCLUDED.cpd_log,
          lat = COALESCE(EXCLUDED.lat, "TeacherCPD".lat),
          lon = COALESCE(EXCLUDED.lon, "TeacherCPD".lon),
          province = COALESCE(EXCLUDED.province, "TeacherCPD".province),
          updated_at = NOW()
      `, [decoded.sub, JSON.stringify(progress), JSON.stringify(cpdLog), lat, lon, province]);
    } else {
      await pool.query(`
        INSERT INTO "TeacherCPD"(user_id, progress, lat, lon, province, updated_at)
        VALUES ($1, $2::jsonb, $3, $4, $5, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          progress = EXCLUDED.progress,
          lat = COALESCE(EXCLUDED.lat, "TeacherCPD".lat),
          lon = COALESCE(EXCLUDED.lon, "TeacherCPD".lon),
          province = COALESCE(EXCLUDED.province, "TeacherCPD".province),
          updated_at = NOW()
      `, [decoded.sub, JSON.stringify(progress), lat, lon, province]);
    }
    return res.json({ ok: true });
  } catch (e) { console.error('[cpd:post]', e.message); return res.status(500).json({ error: 'Lỗi lưu CPD' }); }
});

// ── Teacher Exams CRUD — TRƯỚC proxy teacher-service ──
// /api/teacher/exams* dùng cùng bảng "Exam" (đã có _ensureExamTables ở dưới).
// Cần POST/upload-pdf/answer-key cho CreateExam page.

// POST /api/teacher/exams — tạo đề thi mới (return { id } hoặc { exam: {id} })
app.post('/api/teacher/exams', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const b = req.body || {};
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const pool = _getPool();
    // Build description với metadata (subject, examType, passingScore, shuffle, sourceType)
    const meta = JSON.stringify({
      subject: b.subject, examType: b.examType,
      passingScore: b.passingScore, shuffle: b.shuffle,
      sourceType: b.sourceType, description: b.description || '',
    });
    const { rows } = await pool.query(`
      INSERT INTO "Exam"(id, teacher_id, title, description, subject, grade, duration_min,
                         total_points, status, settings)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
      RETURNING id, title, status, created_at`,
      [id, decoded.sub, String(b.title || 'Đề mới').slice(0, 500),
       b.description || null, b.subject || null, b.grade || null,
       Number(b.duration) || 45, Number(b.totalQuestions) || 0,
       b.status || 'draft', meta]);
    return res.json({ id: rows[0].id, exam: rows[0] });
  } catch (e) { console.error('[teacher-exams:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo đề thi' }); }
});

// GET /api/teacher/exams/:id — detail + hydrate questions
app.get('/api/teacher/exams/:id', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    // Cho phép xem đề của mình HOẶC public
    const { rows } = await pool.query(
      `SELECT *, (teacher_id = $2) AS is_owner FROM "Exam"
       WHERE id = $1 AND (teacher_id = $2 OR visibility = 'public')`,
      [req.params.id, decoded.sub]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy đề (hoặc không có quyền)' });
    const r = rows[0];
    const settings = r.settings || {};
    const qIds = Array.isArray(r.question_ids) ? r.question_ids : [];
    const pointsMap = settings.pointsMap || {};

    // Hydrate question rows + giữ thứ tự theo qIds
    let questions = [];
    if (qIds.length > 0) {
      const { rows: qRows } = await pool.query(
        `SELECT id, content, type, subject, grade, chapter, difficulty,
                options, answer, explanation, tags, created_at, updated_at
         FROM "Question" WHERE id = ANY($1::text[])`,
        [qIds.map(String)]);
      const byId = new Map(qRows.map(q => [q.id, q]));
      questions = qIds.map((qid, idx) => {
        const q = byId.get(String(qid));
        if (!q) return null;
        return {
          id: q.id, order: idx + 1,
          points: Number(pointsMap[q.id]) || 1,
          content: q.content || '',
          questionType: q.type || 'multiple_choice',
          type: q.type || 'multiple_choice',
          subject: q.subject, grade: q.grade, chapter: q.chapter,
          difficulty: q.difficulty,
          options: q.options || [],
          correctAnswer: q.answer || '',
          answer: q.answer || '',
          explanation: q.explanation || null,
          tags: q.tags || [],
          createdAt: q.created_at, updatedAt: q.updated_at,
        };
      }).filter(Boolean);
    }

    return res.json({
      exam: {
        id: r.id, title: r.title, description: r.description,
        subject: r.subject || settings.subject,
        grade: r.grade, examType: settings.examType,
        duration: r.duration_min, totalPoints: r.total_points,
        totalQuestions: qIds.length,
        status: r.status, sourceType: settings.sourceType,
        passingScore: settings.passingScore, shuffle: settings.shuffle,
        questionIds: qIds,
        answerKey: settings.answerKey || [],
        visibility: r.visibility || 'private',
        isOwner: !!r.is_owner,
        teacherId: r.teacher_id,
        createdAt: r.created_at, updatedAt: r.updated_at,
      },
      questions,
    });
  } catch (e) { console.error('[teacher-exams:get]', e.message); return res.status(500).json({ error: 'Lỗi tải đề' }); }
});

// PUT /api/teacher/exams/:id — full update (alias của PATCH cho frontend)
app.put('/api/teacher/exams/:id', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const b = req.body || {};
    const updates = ['updated_at = NOW()'];
    const params = [req.params.id, decoded.sub];
    const map = { title: 'title', subject: 'subject', grade: 'grade',
                  duration: 'duration_min', description: 'description', status: 'status' };
    for (const [key, col] of Object.entries(map)) {
      if (b[key] !== undefined) { params.push(b[key]); updates.push(`${col} = $${params.length}`); }
    }
    if (b.visibility !== undefined && ['private','public'].includes(b.visibility)) {
      params.push(b.visibility); updates.push(`visibility = $${params.length}`);
    }
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Exam" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = $2`, params);
    if (!rowCount) return res.status(403).json({ error: 'Bạn không phải chủ sở hữu — không thể sửa' });
    return res.json({ ok: true });
  } catch (e) { console.error('[teacher-exams:put]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật' }); }
});

// POST /api/teacher/exams/:id/publish — đổi status + isPublic
app.post('/api/teacher/exams/:id/publish', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const status = req.body?.status || 'published';
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Exam" SET status = $1, updated_at = NOW() WHERE id = $2 AND teacher_id = $3`,
      [status, req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    return res.json({ ok: true, status });
  } catch (e) { console.error('[teacher-exams:publish]', e.message); return res.status(500).json({ error: 'Lỗi publish' }); }
});

// POST /api/teacher/exams/:id/questions/attach — gắn nhiều câu hỏi từ QB
app.post('/api/teacher/exams/:id/questions/attach', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const ids = Array.isArray(req.body?.questionIds) ? req.body.questionIds
              : Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: 'Thiếu questionIds[]' });
    const pool = _getPool();
    // Append unique IDs vào Exam.question_ids JSONB
    const { rows } = await pool.query(
      `SELECT question_ids FROM "Exam" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy đề' });
    const cur = Array.isArray(rows[0].question_ids) ? rows[0].question_ids : [];
    const merged = Array.from(new Set([...cur, ...ids.map(String)]));
    await pool.query(
      `UPDATE "Exam" SET question_ids = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), req.params.id]);
    return res.json({ ok: true, attached: merged.length - cur.length, total: merged.length });
  } catch (e) { console.error('[teacher-exams:attach]', e.message); return res.status(500).json({ error: 'Lỗi gắn câu hỏi' }); }
});

// DELETE /api/teacher/exams/:id/questions/:qid — gỡ câu hỏi khỏi đề
app.delete('/api/teacher/exams/:id/questions/:qid', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT question_ids FROM "Exam" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy đề' });
    const cur = Array.isArray(rows[0].question_ids) ? rows[0].question_ids : [];
    const next = cur.filter(x => String(x) !== String(req.params.qid));
    await pool.query(
      `UPDATE "Exam" SET question_ids = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(next), req.params.id]);
    return res.json({ ok: true, total: next.length });
  } catch (e) { console.error('[teacher-exams:detach]', e.message); return res.status(500).json({ error: 'Lỗi gỡ câu hỏi' }); }
});

// POST /api/teacher/exams/:id/questions/reorder — sắp xếp lại
app.post('/api/teacher/exams/:id/questions/reorder', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const ids = Array.isArray(req.body?.questionIds) ? req.body.questionIds : [];
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Exam" SET question_ids = $1::jsonb, updated_at = NOW()
       WHERE id = $2 AND teacher_id = $3`,
      [JSON.stringify(ids), req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    return res.json({ ok: true });
  } catch (e) { console.error('[teacher-exams:reorder]', e.message); return res.status(500).json({ error: 'Lỗi sắp xếp' }); }
});

// PATCH /api/teacher/exams/:id/questions/:qid — update points (lưu vào settings.pointsMap)
app.patch('/api/teacher/exams/:id/questions/:qid', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const points = Number(req.body?.points);
    if (!Number.isFinite(points)) return res.status(400).json({ error: 'Points phải là số' });
    const pool = _getPool();
    const { rowCount } = await pool.query(`
      UPDATE "Exam"
      SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), $1, to_jsonb($2::numeric)),
          updated_at = NOW()
      WHERE id = $3 AND teacher_id = $4`,
      [`{pointsMap,${req.params.qid}}`, points, req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    return res.json({ ok: true });
  } catch (e) { console.error('[teacher-exams:points]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật điểm' }); }
});

// POST /api/teacher/exams/:id/questions — tạo câu hỏi mới TRONG đề (insert + attach)
app.post('/api/teacher/exams/:id/questions', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const q = req.body || {};
    const { randomUUID } = require('crypto');
    const qid = randomUUID();
    const pool = _getPool();
    // Verify exam ownership
    const { rows: exams } = await pool.query(
      `SELECT question_ids FROM "Exam" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]);
    if (!exams.length) return res.status(404).json({ error: 'Không tìm thấy đề' });
    // Insert question
    await pool.query(
      `INSERT INTO "Question"(id, teacher_id, content, type, subject, grade, difficulty, options, answer, explanation, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb)`,
      [qid, decoded.sub, q.content || '', q.type || 'multiple_choice',
       q.subject || null, q.grade || null, q.difficulty || 'TH',
       JSON.stringify(q.options || []), q.answer || q.correctAnswer || '',
       q.explanation || null, JSON.stringify(q.tags || [])]);
    // Attach to exam
    const cur = Array.isArray(exams[0].question_ids) ? exams[0].question_ids : [];
    const merged = [...cur, qid];
    await pool.query(
      `UPDATE "Exam" SET question_ids = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), req.params.id]);
    return res.json({ ok: true, question: { id: qid } });
  } catch (e) { console.error('[teacher-exams:newq]', e.message); return res.status(500).json({ error: 'Lỗi tạo câu hỏi' }); }
});

// POST /api/teacher/exams/upload-pdf — stub 501 (cần GCS storage)
app.post('/api/teacher/exams/upload-pdf', (_req, res) =>
  res.status(501).json({ error: 'Upload PDF cần GCS bucket — đang phát triển' }));

// POST /api/teacher/exams/:id/answer-key — lưu đáp án vào settings JSONB
app.post('/api/teacher/exams/:id/answer-key', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const pool = _getPool();
    const { rowCount } = await pool.query(`
      UPDATE "Exam"
      SET settings = COALESCE(settings, '{}'::jsonb) || $1::jsonb,
          updated_at = NOW()
      WHERE id = $2 AND teacher_id = $3`,
      [JSON.stringify({ answerKey: questions }), req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy đề' });
    return res.json({ ok: true, count: questions.length });
  } catch (e) { console.error('[teacher-exams:answer-key]', e.message); return res.status(500).json({ error: 'Lỗi lưu đáp án' }); }
});

// PATCH /api/teacher/exams/:id — partial update
app.patch('/api/teacher/exams/:id', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const b = req.body || {};
    const updates = ['updated_at = NOW()'];
    const params = [req.params.id, decoded.sub];
    const map = { title: 'title', subject: 'subject', grade: 'grade',
                  duration: 'duration_min', description: 'description', status: 'status' };
    for (const [key, col] of Object.entries(map)) {
      if (b[key] !== undefined) { params.push(b[key]); updates.push(`${col} = $${params.length}`); }
    }
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Exam" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = $2`, params);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    return res.json({ ok: true });
  } catch (e) { console.error('[teacher-exams:patch]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật' }); }
});

// DELETE /api/teacher/exams/:id
app.delete('/api/teacher/exams/:id', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM "Exam" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    return res.json({ ok: true });
  } catch (e) { console.error('[teacher-exams:del]', e.message); return res.status(500).json({ error: 'Lỗi xoá' }); }
});

// ── /api/teacher/* → teacher-service (sẽ chỉ chạy cho paths chưa có stub) ──
app.use(makeProxy(TEACHER_SERVICE_URL, 'teacher-service', '/api/teacher'));

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

  // Map DB Course row → InstructorCourse shape expected by frontend
  function mapCourse(row, category, enrollments, chapters) {
    return {
      id:                 row.id,
      userId:             row.userId,
      title:              row.title,
      slug:               row.id, // no slug column — use id
      overview:           row.description || null,
      image:              row.imageUrl || null,
      regularPrice:       parseFloat(row.price) || 0,
      beforePrice:        0,
      lessons:            (chapters || []).filter(c => c.ispublished).length,
      duration:           null,
      accessTime:         null,
      requirements:       null,
      whatYouWillLearn:   null,
      whoIsThisCourseFor: null,
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
      return res.status(500).json({ error: err.message });
    }
  });
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
  // Insert questions với teacher_id = real user ID từ JWT (không phải literal 'teacher')
  // Cũng set vào cả "teacher_id" snake_case (handler mới) và "createdBy" camelCase (legacy)
  // để GET /api/question-bank?scope=mine WHERE teacher_id=$me match được.
  app.post('/api/questions/batch', async (req, res) => {
    // Auth: lấy userId thực từ Bearer
    const auth = req.headers.authorization || '';
    let userId = null;
    if (auth.startsWith('Bearer ')) {
      try { userId = _akVerify(auth.slice(7)).sub; } catch {}
    }
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized — login lại' });

    try {
      const pool = getQPool();
      const { questions = [] } = req.body || {};
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, error: 'questions array required' });
      }

      const now = new Date();
      let inserted = 0;
      let failed = 0;
      const errors = [];
      for (const q of questions) {
        if (!q.content) { failed++; continue; }
        const id = randomUUID();
        const tags = [...new Set([q.topic, q.subject, ...(q.tags || [])].filter(Boolean))];
        const optionsJson = JSON.stringify(q.options || []);
        const tagsJson = JSON.stringify(tags);
        try {
          // Try modern schema first (snake_case + JSONB + teacher_id + visibility)
          // NOTE: cast $::text rõ ràng và KHÔNG reuse $N giữa nhiều cột để
          // tránh "inconsistent types deduced for parameter" (PG strict).
          const correctAns = q.correctAnswer || q.answer || '';
          await pool.query(
            `INSERT INTO "Question"
               (id, teacher_id, "createdBy", topic, subject, grade, "questionType", type,
                difficulty, content, options, "correctAnswer", answer, explanation,
                "learningObjectives", tags, "aiGenerated", "humanReviewed", status,
                visibility, "createdAt", "updatedAt", "usageCount")
             VALUES ($1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,
                     $9::text,$10::text,$11::jsonb,$12::text,$13::text,$14::text,
                     $15::jsonb,$16::jsonb,false,false,$17::text,'private',$18,$19,0)
             ON CONFLICT (id) DO NOTHING`,
            [
              id,                                              // $1  id
              userId,                                          // $2  teacher_id
              userId,                                          // $3  createdBy
              q.topic || q.subject || 'Chung',                 // $4  topic
              q.subject || 'Vật lý',                           // $5  subject
              q.grade || 'Khối 12',                            // $6  grade
              q.questionType || 'MCQ',                         // $7  questionType (camelCase)
              q.questionType || 'multiple_choice',             // $8  type (snake)
              q.difficulty || 'MEDIUM',                        // $9
              q.content,                                       // $10
              optionsJson,                                     // $11 jsonb
              correctAns,                                      // $12 correctAnswer
              correctAns,                                      // $13 answer
              q.explanation || '',                             // $14
              JSON.stringify(q.learningObjectives || []),      // $15 jsonb
              tagsJson,                                        // $16 jsonb
              q.status || 'Hoạt động',                         // $17 status
              now,                                             // $18 createdAt
              now,                                             // $19 updatedAt
            ]
          );
          inserted++;
        } catch (e) {
          failed++;
          // Log MỌI lỗi vào server logs (đầy đủ) để debug
          if (failed <= 3) {
            console.error(`[questions:batch] insert fail Q${inserted+failed}:`, e.message);
          }
          if (errors.length < 3) errors.push(`Q${inserted+failed}: ${e.message.slice(0, 150)}`);
        }
      }

      console.log(`[questions:batch] user=${userId} ✅ ${inserted}/${questions.length} inserted, ${failed} failed`);
      return res.json({
        success: true,
        data: { inserted, failed, total: questions.length, errors: errors.length ? errors : undefined },
      });
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

      // ── stats ─────────────────────────────────────────
      if (action === 'stats') {
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
        for (const row of trendQ.rows) {
          const byTopic = (row.breakdown && row.breakdown.byTopic) || {};
          for (const [topic, v] of Object.entries(byTopic)) {
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
        return res.json({
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
        });
      }

      // ── topics ────────────────────────────────────────
      if (action === 'topics') {
        const subject = String(req.query.subject || '').trim();
        if (!subject) return res.json({ success: true, data: { topics: [] } });
        const { rows } = await pool.query(
          `SELECT DISTINCT topic
             FROM "Question"
            WHERE subject = $1 AND status = 'Hoạt động' AND topic IS NOT NULL AND topic <> ''
            ORDER BY topic ASC
            LIMIT 200`,
          [subject]
        );
        return res.json({
          success: true,
          data: { topics: rows.map((r) => r.topic) },
        });
      }

      // ── teacher_exams ─────────────────────────────────
      if (action === 'teacher_exams') {
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
        return res.json({
          success: true,
          data: {
            exams: exams.rows.map((e) => ({
              id: e.id,
              title: e.title,
              description: e.description || undefined,
              examType: e.examType,
              duration: e.duration,
              totalQuestions: e.totalQuestions,
              totalScore: Number(e.totalScore) || 0,
              createdAt: e.createdAt,
              user: e.user_name ? { name: e.user_name } : undefined,
            })),
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
        });
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

        if (rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'no_questions',
            message: `Ngân hàng câu hỏi chưa có câu nào cho ${subject} - ${grade}${topic ? ' (' + topic + ')' : ''}. Hãy liên hệ giáo viên để bổ sung.`,
          });
        }
        if (rows.length < Math.ceil(questionCount * 0.5)) {
          return res.status(400).json({
            success: false,
            error: 'insufficient_questions',
            message: `Chỉ có ${rows.length} câu hỏi phù hợp trong ngân hàng (cần ít nhất ${Math.ceil(questionCount * 0.5)} cho đề ${questionCount} câu).`,
          });
        }

        const picked = pickByDifficulty(rows, questionCount);
        const questions = picked.map((r, i) => toClientQuestion(r, i + 1));

        const id = newIdEP();
        await pool.query(
          `INSERT INTO "PracticeExam"
             ("id","studentId","subject","grade","examType","questionCount","timeLimit",
              "questions","answers","completed","createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]'::jsonb,FALSE,NOW())`,
          [id, user.id, subject, grade, examType, questions.length, timeLimit, JSON.stringify(questions)]
        );

        return res.json({
          success: true,
          data: {
            practice: {
              id, subject, grade, examType,
              source: 'bank',
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
                  q.content, q.options, q."correctAnswer", q.explanation, eq."order"
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
              "questions","answers","completed","createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]'::jsonb,FALSE,NOW())`,
          [id, user.id, subject, grade, exam.examType || 'Đề giáo viên', questions.length, exam.duration || 45, JSON.stringify(questions)]
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

        let correct = 0, incorrect = 0, unanswered = 0;
        const byTopic = {};
        const byDifficulty = { EASY: { correct: 0, total: 0, accuracy: 0 }, MEDIUM: { correct: 0, total: 0, accuracy: 0 }, HARD: { correct: 0, total: 0, accuracy: 0 } };
        const details = [];

        for (const q of questions) {
          const qid = q.questionId;
          const user_ans = answers[qid];
          const correct_ans = q.correctAnswer || '';
          const isAnswered = user_ans !== undefined && user_ans !== null && String(user_ans).length > 0;

          let isCorrect = false;
          if (isAnswered && correct_ans) {
            // Robust compare: trim + case-insensitive for text answers; exact for MCQ option strings
            isCorrect = String(user_ans).trim() === String(correct_ans).trim()
              || String(user_ans).trim().toLowerCase() === String(correct_ans).trim().toLowerCase();
          }

          if (!isAnswered) unanswered++;
          else if (isCorrect) correct++;
          else incorrect++;

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
            userAnswer: isAnswered ? String(user_ans) : null,
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

        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        const score = total > 0 ? Math.round((correct / total) * 100) / 10 : 0; // 0–10 scale

        // Recommendations: weakest topics + difficulty-level hints
        const recommendations = [];
        const weakTopics = Object.entries(byTopic)
          .filter(([_, v]) => v.total >= 2 && v.accuracy < 0.6)
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

  function isCorrect(q, given) {
    if (!q) return false;
    const a = String(q.correctAnswer || '').trim().toLowerCase();
    const g = String(given || '').trim().toLowerCase();
    if (!a) return false;
    return a === g;
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

// ── Exam Matrix Node.js handlers — TRƯỚC proxy media-service (offline) ──
// Bảng "ExamMatrix" persist matrix do GV tự tạo (manual) hoặc số hoá (PDF).
// Module-scope IIFE để khai báo helpers + table migration mà không phụ thuộc scope.
;(() => {
  async function _ensureMatrixTable() {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ExamMatrix" (
        id              VARCHAR(36)  PRIMARY KEY,
        teacher_id      VARCHAR(255) NOT NULL,
        name            VARCHAR(500) NOT NULL DEFAULT 'Ma trận mới',
        subject         VARCHAR(100),
        grade           VARCHAR(50),
        exam_type       VARCHAR(50),
        duration_min    INTEGER      DEFAULT 45,
        total_score     NUMERIC      DEFAULT 10,
        total_questions INTEGER      DEFAULT 0,
        type            VARCHAR(20)  DEFAULT 'manual',
        school_year     VARCHAR(20),
        description     TEXT,
        sections        JSONB        NOT NULL DEFAULT '[]'::jsonb,
        topics          JSONB        NOT NULL DEFAULT '[]'::jsonb,
        status          VARCHAR(30)  DEFAULT 'Hoàn tất',
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('ExamMatrix', [
      ['teacher_id',      "VARCHAR(255)"], ['name', "VARCHAR(500)"],
      ['subject',         "VARCHAR(100)"], ['grade', "VARCHAR(50)"],
      ['exam_type',       "VARCHAR(50)"], ['duration_min', "INTEGER DEFAULT 45"],
      ['total_score',     "NUMERIC DEFAULT 10"], ['total_questions', "INTEGER DEFAULT 0"],
      ['type',            "VARCHAR(20) DEFAULT 'manual'"], ['school_year', "VARCHAR(20)"],
      ['description',     "TEXT"], ['sections', "JSONB DEFAULT '[]'::jsonb"],
      ['topics',          "JSONB DEFAULT '[]'::jsonb"], ['status', "VARCHAR(30) DEFAULT 'Hoàn tất'"],
      ['created_at',      "TIMESTAMPTZ DEFAULT NOW()"], ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('ExamMatrix', ['teacherId','userId','ownerId','name','subject','grade','examType','duration','durationMin','totalScore','totalPoints','totalQuestions','type','schoolYear','description','sections','topics','status','createdAt','updatedAt']);
    await _backfillSnakeFromCamel('ExamMatrix', [
      ['teacher_id',   ['teacherId', 'userId', 'createdBy', 'ownerId']],
      ['exam_type',    ['examType']],
      ['duration_min', ['duration', 'durationMin']],
      ['total_score',  ['totalScore']],
      ['total_questions', ['totalQuestions']],
      ['school_year',  ['schoolYear']],
    ]);
    // Legacy sections/topics có thể TEXT/JSONB — đảm bảo JSONB
    for (const col of ['sections', 'topics']) {
      try { await pool.query(`ALTER TABLE "ExamMatrix" ALTER COLUMN ${col} TYPE JSONB USING to_jsonb(${col})`); } catch {}
    }
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_matrix_teacher ON "ExamMatrix"(teacher_id, created_at DESC)`);
  }
  _ensureMatrixTable().catch(e => console.error('[exam-matrix] migration:', e.message));

  function mxAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }

  function mxRow(r) {
    return {
      id: r.id, name: r.name, grade: r.grade || '',
      examType: r.exam_type || '', type: r.type || 'manual',
      subject: r.subject || '', schoolYear: r.school_year || '',
      description: r.description || '', duration: r.duration_min,
      totalScore: Number(r.total_score) || 0, totalQuestions: r.total_questions || 0,
      status: r.status || 'Hoàn tất',
      sections: r.sections || [], topics: r.topics || [],
      createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  // GET /api/exam-matrices?status=...&examType=...
  app.get('/api/exam-matrices', async (req, res) => {
    const decoded = mxAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const filters = ['teacher_id = $1']; const params = [decoded.sub];
      const status = req.query.status;
      if (status && status !== 'Tất cả') { params.push(status); filters.push(`status = $${params.length}`); }
      const examType = req.query.examType;
      if (examType && examType !== 'Tất cả loại đề') { params.push(examType); filters.push(`exam_type = $${params.length}`); }
      const { rows } = await pool.query(
        `SELECT * FROM "ExamMatrix" WHERE ${filters.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
        params);
      return res.json({ matrices: rows.map(mxRow), total: rows.length });
    } catch (e) { console.error('[exam-matrix:list]', e.message); return res.json({ matrices: [], total: 0 }); }
  });

  // POST /api/exam-matrices
  app.post('/api/exam-matrices', async (req, res) => {
    const decoded = mxAuth(req, res); if (!decoded) return;
    try {
      const b = req.body || {};
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const pool = _getPool();
      const { rows } = await pool.query(`
        INSERT INTO "ExamMatrix"(id, teacher_id, name, subject, grade, exam_type, duration_min,
                                 total_score, total_questions, type, school_year, description,
                                 sections, topics, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,'Hoàn tất')
        RETURNING *`,
        [id, decoded.sub, String(b.name || 'Ma trận mới').slice(0, 500),
         b.subject || null, b.grade || null, b.examType || null,
         Number(b.duration) || 45, Number(b.totalScore) || 10,
         Number(b.totalQuestions) || 0, b.type || 'manual',
         b.schoolYear || null, b.description || null,
         JSON.stringify(b.sections || []), JSON.stringify(b.topics || [])]);
      const matrix = mxRow(rows[0]);
      return res.json({ id, matrix });
    } catch (e) { console.error('[exam-matrix:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo ma trận' }); }
  });

  // GET /api/exam-matrices/:id
  app.get('/api/exam-matrices/:id', async (req, res) => {
    if (req.params.id.startsWith('sample-')) return res.status(404).json({ error: 'Ma trận mẫu chỉ để tham khảo' });
    const decoded = mxAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT * FROM "ExamMatrix" WHERE id = $1 AND teacher_id = $2`,
        [req.params.id, decoded.sub]);
      if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy' });
      // ExamMatrixDetail page làm setMatrix(r.data) trực tiếp → trả root level
      // ExamMatrixCreate (edit mode) cũng đọc r.data.id trực tiếp.
      const m = mxRow(rows[0]);
      return res.json({ ...m, matrix: m });  // root + nested để backward compat
    } catch (e) { console.error('[exam-matrix:get]', e.message); return res.status(500).json({ error: 'Lỗi tải ma trận' }); }
  });

  // PUT /api/exam-matrices/:id
  app.put('/api/exam-matrices/:id', async (req, res) => {
    const decoded = mxAuth(req, res); if (!decoded) return;
    try {
      const b = req.body || {};
      const pool = _getPool();
      const { rowCount } = await pool.query(`
        UPDATE "ExamMatrix" SET name=$1, subject=$2, grade=$3, exam_type=$4, duration_min=$5,
          total_score=$6, total_questions=$7, type=$8, school_year=$9, description=$10,
          sections=$11::jsonb, topics=$12::jsonb, updated_at=NOW()
        WHERE id=$13 AND teacher_id=$14`,
        [String(b.name || '').slice(0,500), b.subject || null, b.grade || null,
         b.examType || null, Number(b.duration) || 45, Number(b.totalScore) || 10,
         Number(b.totalQuestions) || 0, b.type || 'manual', b.schoolYear || null,
         b.description || null, JSON.stringify(b.sections || []),
         JSON.stringify(b.topics || []), req.params.id, decoded.sub]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (e) { console.error('[exam-matrix:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật' }); }
  });

  // DELETE /api/exam-matrices/:id
  app.delete('/api/exam-matrices/:id', async (req, res) => {
    if (req.params.id.startsWith('sample-')) return res.status(400).json({ error: 'Không xoá được mẫu' });
    const decoded = mxAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "ExamMatrix" WHERE id = $1 AND teacher_id = $2`,
        [req.params.id, decoded.sub]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (e) { console.error('[exam-matrix:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá' }); }
  });

  // POST /api/exam-matrices/:id/duplicate
  app.post('/api/exam-matrices/:id/duplicate', async (req, res) => {
    const decoded = mxAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows: src } = await pool.query(
        `SELECT * FROM "ExamMatrix" WHERE id = $1 AND teacher_id = $2`,
        [req.params.id, decoded.sub]);
      if (!src.length) return res.status(404).json({ error: 'Không tìm thấy' });
      const s = src[0];
      const { randomUUID } = require('crypto');
      const newId = randomUUID();
      await pool.query(`
        INSERT INTO "ExamMatrix"(id, teacher_id, name, subject, grade, exam_type, duration_min,
          total_score, total_questions, type, school_year, description, sections, topics, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15)`,
        [newId, decoded.sub, `${s.name} (bản sao)`, s.subject, s.grade, s.exam_type,
         s.duration_min, s.total_score, s.total_questions, s.type, s.school_year,
         s.description, JSON.stringify(s.sections || []), JSON.stringify(s.topics || []),
         'Hoàn tất']);
      return res.json({ id: newId });
    } catch (e) { console.error('[exam-matrix:dup]', e.message); return res.status(500).json({ error: 'Lỗi nhân bản' }); }
  });

  // POST /api/exam-matrices/digitize — stub 501 (cần AI vision service)
  app.post('/api/exam-matrices/digitize', (_req, res) =>
    res.status(501).json({ error: 'Số hoá PDF cần media-service AI — đang phát triển' }));
})();

// ── media-service routes (only if MEDIA_SERVICE_URL is external) ──
// Skip /api/exam-matrices — đã có Node.js handlers ở trên
app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/media'));
app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/documents'));
if (!USE_NODEJS_QUESTIONS) {
  app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/questions'));
  app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/question-bank'));
}
app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/exams'));

// ── Shared module-scope DB pool — phải khai báo TRƯỚC mọi _ensure*Table()
// (getPool() ở line 133 bị block-scoped trong if(USE_NODEJS_AUTH){} với
// 'use strict' → không accessible từ đây). Dùng var để không TDZ.
var _akPool = null;
function _getPool() {
  if (!_akPool) {
    const { Pool } = require('pg');
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL không được set');
    _akPool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
  }
  return _akPool;
}

// Helper: ALTER TABLE ADD COLUMN IF NOT EXISTS (PostgreSQL native từ 9.6)
// — dùng cho lazy schema migration khi bảng đã tồn tại với schema cũ.
async function _alterAddColumns(table, columns) {
  const pool = _getPool();
  for (const [col, type] of columns) {
    try {
      await pool.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    } catch (e) {
      console.warn(`[migration] ${table}.${col}:`, e.message);
    }
  }
}

// Helper: DROP NOT NULL trên các cột legacy camelCase (từ Rust service).
// Handler mới chỉ ghi snake_case → cột camelCase sẽ là NULL → vi phạm NOT NULL.
// Cần drop NOT NULL để insert mới không fail.
async function _dropLegacyNotNull(table, legacyCols) {
  const pool = _getPool();
  for (const col of legacyCols) {
    try {
      await pool.query(`ALTER TABLE "${table}" ALTER COLUMN "${col}" DROP NOT NULL`);
    } catch { /* cột có thể không tồn tại — skip */ }
  }
}

// Helper: BACKFILL data từ cột camelCase legacy sang cột snake_case mới
// VD: UPDATE "Question" SET teacher_id = COALESCE(teacher_id, "teacherId", "userId", "createdBy")
// Critical để data của GV cũ (tạo trên Rust service) vẫn truy cập được qua handler mới.
async function _backfillSnakeFromCamel(table, mappings) {
  const pool = _getPool();
  for (const [snakeCol, camelCols] of mappings) {
    try {
      const coalesceArgs = [snakeCol, ...camelCols.map(c => `"${c}"`)].join(', ');
      const { rowCount } = await pool.query(
        `UPDATE "${table}" SET ${snakeCol} = COALESCE(${coalesceArgs})
         WHERE ${snakeCol} IS NULL AND (${camelCols.map(c => `"${c}" IS NOT NULL`).join(' OR ')})`
      );
      if (rowCount > 0) {
        console.log(`[backfill] ${table}.${snakeCol}: copied ${rowCount} rows from legacy ${camelCols.join('/')}`);
      }
    } catch (e) {
      // Có thể fail nếu cột legacy không tồn tại — silent skip
      if (!e.message.includes('does not exist')) {
        console.warn(`[backfill] ${table}.${snakeCol}:`, e.message.slice(0, 100));
      }
    }
  }
}

// ── /api/latex-projects/* → Node.js handlers (latex-service offline) ──
// latex-service Rust (port 8109) ECONNREFUSED → fallback Node.js CRUD trực tiếp
// trên bảng "LatexProject" trong DB chung. Khi nào latex-service được khôi phục,
// có thể disable đoạn này và unbơ proxy bên dưới.
async function _ensureLatexProjectTable() {
  const pool = _getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "LatexProject" (
      id            VARCHAR(36)  PRIMARY KEY,
      user_id       VARCHAR(255) NOT NULL,
      title         VARCHAR(500) NOT NULL DEFAULT 'Tài liệu LaTeX mới',
      main_content  TEXT         NOT NULL DEFAULT '',
      folder_id     VARCHAR(36),
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  // Migrate old schema (Rust service) → đảm bảo cột cần thiết tồn tại
  await _alterAddColumns('LatexProject', [
    ['user_id',      "VARCHAR(255)"],
    ['title',        "VARCHAR(500) DEFAULT 'Tài liệu LaTeX mới'"],
    ['main_content', "TEXT DEFAULT ''"],
    ['folder_id',    "VARCHAR(36)"],
    ['visibility',   "VARCHAR(20) DEFAULT 'private'"],
    ['created_at',   "TIMESTAMPTZ DEFAULT NOW()"],
    ['updated_at',   "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('LatexProject', ['userId','title','mainContent','folderId','createdAt','updatedAt','ownerId']);
  // BACKFILL: legacy camelCase columns (userId/ownerId) → user_id mới
  await _backfillSnakeFromCamel('LatexProject', [
    ['user_id',      ['userId', 'ownerId', 'createdBy']],
    ['title',        ['title']],   // tên cột giống — chỉ COALESCE để no-op nếu NULL
    ['main_content', ['mainContent', 'content']],
  ]);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_latex_user ON "LatexProject"(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_latex_visibility ON "LatexProject"(visibility)`);
}
_ensureLatexProjectTable().catch(e => console.error('[latex-projects] migration error:', e.message));

function _latexAuth(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try { return _akVerify(auth.slice(7)); }
  catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
}

function _latexRowToProject(r) {
  return {
    id: r.id,
    title: r.title,
    mainContent: r.main_content,
    folderId: r.folder_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET /api/latex-projects → { success, data: [...], count }
app.get('/api/latex-projects', async (req, res) => {
  const decoded = _latexAuth(req, res); if (!decoded) return;
  try {
    const scope = req.query.scope || 'mine';  // 'mine' | 'public' | 'all'
    const pool = _getPool();
    let where;
    const params = [decoded.sub];
    if (scope === 'public') {
      where = `visibility = 'public' AND user_id != $1`;
    } else if (scope === 'all') {
      where = `user_id = $1 OR visibility = 'public'`;
    } else {
      where = `user_id = $1`;
    }
    const { rows } = await pool.query(`
      SELECT id, title, folder_id, visibility, user_id, created_at, updated_at, ''::text AS main_content,
             (user_id = $1) AS is_owner
      FROM "LatexProject" WHERE ${where} ORDER BY updated_at DESC LIMIT 200
    `, params);
    const data = rows.map(r => ({
      ..._latexRowToProject(r),
      visibility: r.visibility || 'private',
      isOwner: !!r.is_owner,
    }));
    return res.json({ success: true, data, count: data.length });
  } catch (e) { console.error('[latex-projects:list]', e.message); return res.status(500).json({ error: 'Lỗi tải danh sách' }); }
});

// POST /api/latex-projects { title? } → { success, data: { id, ... } }
app.post('/api/latex-projects', async (req, res) => {
  const decoded = _latexAuth(req, res); if (!decoded) return;
  try {
    const { title = 'Tài liệu LaTeX mới' } = req.body || {};
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const pool = _getPool();
    const { rows } = await pool.query(`
      INSERT INTO "LatexProject"(id, user_id, title, main_content)
      VALUES ($1,$2,$3,'')
      RETURNING id, title, folder_id, created_at, updated_at, main_content
    `, [id, decoded.sub, String(title).slice(0, 500)]);
    return res.json({ success: true, data: _latexRowToProject(rows[0]) });
  } catch (e) { console.error('[latex-projects:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo tài liệu' }); }
});

// GET /api/latex-projects/:id → { success, data: { id, title, mainContent, ... } }
app.get('/api/latex-projects/:id', async (req, res) => {
  const decoded = _latexAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    // Cho phép xem tài liệu của mình HOẶC public của người khác
    const { rows } = await pool.query(`
      SELECT id, title, main_content, folder_id, visibility, user_id,
             created_at, updated_at, (user_id = $2) AS is_owner
      FROM "LatexProject"
      WHERE id = $1 AND (user_id = $2 OR visibility = 'public')
    `, [req.params.id, decoded.sub]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy tài liệu (hoặc không có quyền truy cập)' });
    return res.json({ success: true, data: {
      ..._latexRowToProject(rows[0]),
      visibility: rows[0].visibility || 'private',
      isOwner: !!rows[0].is_owner,
    }});
  } catch (e) { console.error('[latex-projects:get]', e.message); return res.status(500).json({ error: 'Lỗi tải tài liệu' }); }
});

// PUT /api/latex-projects/:id { title?, mainContent?, visibility? } — chỉ owner
app.put('/api/latex-projects/:id', async (req, res) => {
  const decoded = _latexAuth(req, res); if (!decoded) return;
  try {
    const { title, mainContent, visibility } = req.body || {};
    const updates = ['updated_at = NOW()'];
    const params = [req.params.id, decoded.sub];
    if (title !== undefined)        { params.push(String(title).slice(0, 500));  updates.push(`title = $${params.length}`); }
    if (mainContent !== undefined)  { params.push(String(mainContent));          updates.push(`main_content = $${params.length}`); }
    if (visibility !== undefined && ['private','public'].includes(visibility)) {
      params.push(visibility); updates.push(`visibility = $${params.length}`);
    }
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "LatexProject" SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2`,
      params
    );
    if (!rowCount) return res.status(403).json({ error: 'Bạn không phải chủ sở hữu — không thể sửa' });
    return res.json({ success: true });
  } catch (e) { console.error('[latex-projects:update]', e.message); return res.status(500).json({ error: 'Lỗi lưu tài liệu' }); }
});

// DELETE /api/latex-projects/:id
app.delete('/api/latex-projects/:id', async (req, res) => {
  const decoded = _latexAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM "LatexProject" WHERE id = $1 AND user_id = $2`,
      [req.params.id, decoded.sub]
    );
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
    return res.json({ success: true });
  } catch (e) { console.error('[latex-projects:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá tài liệu' }); }
});

// Versions + collaborators stubs (chưa implement) — trả 200 empty để UI không crash
app.get('/api/latex-projects/:id/versions', (_req, res) => res.json({ success: true, data: [] }));
app.get('/api/latex-projects/:id/collaborators', (_req, res) => res.json({ success: true, data: [] }));
app.post('/api/latex-projects/:id/versions/restore', (_req, res) => res.status(501).json({ error: 'Versions chưa khả dụng' }));
app.post('/api/latex-projects/:id/collaborators', (_req, res) => res.status(501).json({ error: 'Collaborators chưa khả dụng' }));
app.delete('/api/latex-projects/:id/collaborators/:userId', (_req, res) => res.status(501).json({ error: 'Collaborators chưa khả dụng' }));

// POST /api/latex-projects/:id/to-pdf-exam — convert LaTeX project → Exam
// Body: { phanIAnswers, phanIIAnswers, phanIIIAnswers, phanIVQuestions, public }
// Tạo Exam mới, lưu answers vào settings.answerKey, return { examId, examTitle,
// totalQuestions, sectionCounts: { phanI, phanII, phanIII, phanIV } }
app.post('/api/latex-projects/:id/to-pdf-exam', async (req, res) => {
  const decoded = _latexAuth(req, res); if (!decoded) return;
  try {
    const b = req.body || {};
    const phanI = Array.isArray(b.phanIAnswers) ? b.phanIAnswers : [];
    const phanII = Array.isArray(b.phanIIAnswers) ? b.phanIIAnswers : [];
    const phanIII = Array.isArray(b.phanIIIAnswers) ? b.phanIIIAnswers : [];
    const phanIV = Array.isArray(b.phanIVQuestions) ? b.phanIVQuestions : [];
    const sectionCounts = {
      phanI: phanI.filter(Boolean).length,
      phanII: phanII.filter(Boolean).length,
      phanIII: phanIII.filter(Boolean).length,
      phanIV: phanIV.length,
    };
    const totalQuestions = sectionCounts.phanI + sectionCounts.phanII +
                           sectionCounts.phanIII + sectionCounts.phanIV;

    const pool = _getPool();
    // Load LatexProject để lấy title
    const { rows: projects } = await pool.query(
      `SELECT title, main_content FROM "LatexProject" WHERE id = $1 AND user_id = $2`,
      [req.params.id, decoded.sub]);
    if (!projects.length) return res.status(404).json({ error: 'Không tìm thấy tài liệu LaTeX' });
    const project = projects[0];

    // Tạo Exam
    const { randomUUID } = require('crypto');
    const examId = randomUUID();
    const examTitle = project.title || 'Đề thi từ LaTeX';
    const settings = JSON.stringify({
      sourceType: 'latex_import',
      latexProjectId: req.params.id,
      isPublic: !!b.public,
      answerKey: {
        phanI, phanII, phanIII, phanIV,
      },
      sectionCounts,
    });
    await pool.query(`
      INSERT INTO "Exam"(id, teacher_id, title, description, status, settings)
      VALUES ($1,$2,$3,$4,'published',$5::jsonb)`,
      [examId, decoded.sub, examTitle,
       `Đề tạo tự động từ tài liệu LaTeX (${totalQuestions} câu)`, settings]);

    return res.json({
      examId, examTitle, totalQuestions, sectionCounts,
    });
  } catch (e) {
    console.error('[latex-to-exam]', e.message);
    return res.status(500).json({ error: 'Lỗi tạo đề từ LaTeX' });
  }
});

// POST /api/latex-projects/compile — biên dịch LaTeX → PDF qua tectonic
// Docker image đã có tectonic ở /usr/local/bin/tectonic + cache /home/appuser/.cache/Tectonic
app.post('/api/latex-projects/compile', async (req, res) => {
  const decoded = _latexAuth(req, res); if (!decoded) return;
  try {
    const { content = '', projectId = null } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Thiếu nội dung LaTeX' });
    }
    const { randomUUID } = require('crypto');
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Tmp dir riêng cho mỗi compile để tránh race
    const sessionId = randomUUID();
    const tmpDir = `/tmp/latex-${sessionId}`;
    fs.mkdirSync(tmpDir, { recursive: true });
    const texFile = path.join(tmpDir, 'main.tex');
    fs.writeFileSync(texFile, content, 'utf-8');

    let pdfBuffer = null;
    let logOutput = '';
    try {
      const { stdout, stderr } = await execAsync(
        `tectonic --outdir "${tmpDir}" "${texFile}"`,
        { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
      );
      logOutput = `${stdout}\n${stderr}`;
      const pdfPath = path.join(tmpDir, 'main.pdf');
      if (fs.existsSync(pdfPath)) {
        pdfBuffer = fs.readFileSync(pdfPath);
      }
    } catch (err) {
      logOutput = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + err.message;
    } finally {
      // Cleanup tmp dir (best-effort)
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }

    if (!pdfBuffer) {
      return res.status(422).json({
        error: 'Biên dịch LaTeX thất bại',
        log: logOutput.slice(-3000),  // last 3KB của log để debug
      });
    }
    // Optional: update LatexProject.updated_at + main_content nếu projectId given
    if (projectId) {
      try {
        const pool = _getPool();
        await pool.query(
          `UPDATE "LatexProject" SET main_content = $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [content, projectId, decoded.sub]);
      } catch { /* silent */ }
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(pdfBuffer.length));
    return res.end(pdfBuffer);
  } catch (e) {
    console.error('[latex-compile]', e.message);
    return res.status(500).json({ error: 'Lỗi server khi biên dịch' });
  }
});

// (Proxy cũ disable — latex-service offline. Có thể bật lại khi service up)
// app.use(makeProxy(LATEX_SERVICE_URL, 'latex-service', '/api/latex-projects'));

// ── API Keys (MCP) — PHẢI trước catch-all /api proxy ────────
// Xử lý /api/user/api-keys và /api/auth/validate-key tại đây (Node.js).
// Không được proxy lên Rust backend vì backend không có các routes này.
// NOTE: dùng inline require() vì jwt/bcrypt/JWT_SECRET được khai báo block-scoped
// bên trong if(USE_NODEJS_AUTH){} — không accessible ở scope ngoài.

const _akJwt = require('jsonwebtoken');
const _akBcrypt = require('bcryptjs');
const _akSecret = () => process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-fallback-change-in-production!!';
function _akVerify(token) {
  return _akJwt.verify(token, _akSecret(), { ignoreExpiration: true });
}

// (_getPool helper đã được khai báo ở đầu file — TRƯỚC _ensureLatexProjectTable)

app.post('/api/user/api-keys', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    let decoded;
    try { decoded = _akVerify(auth.slice(7)); } catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }
    const { name = 'MCP Key' } = req.body || {};
    const { randomBytes, randomUUID } = require('crypto');
    const rawKey = 'AERO-' + randomBytes(16).toString('hex');
    const prefix = rawKey.slice(0, 12);
    const hash = await _akBcrypt.hash(rawKey, 10);
    const id = randomUUID();
    const pool = _getPool();
    await pool.query(
      `INSERT INTO user_api_keys(id, user_id, key_prefix, key_hash, name) VALUES($1,$2,$3,$4,$5)`,
      [id, decoded.sub, prefix, hash, String(name).slice(0, 200)]
    );
    return res.json({ ok: true, id, key: rawKey, prefix, name });
  } catch (e) { console.error('[api-keys:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo API key' }); }
});

app.get('/api/user/api-keys', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    let decoded;
    try { decoded = _akVerify(auth.slice(7)); } catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT id, key_prefix, name, created_at, last_used_at, revoked FROM user_api_keys WHERE user_id=$1 ORDER BY created_at DESC`,
      [decoded.sub]
    );
    return res.json({ ok: true, keys: rows });
  } catch (e) { console.error('[api-keys:list]', e.message); return res.status(500).json({ error: 'Lỗi lấy danh sách key' }); }
});

app.delete('/api/user/api-keys/:id', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    let decoded;
    try { decoded = _akVerify(auth.slice(7)); } catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE user_api_keys SET revoked=true WHERE id=$1 AND user_id=$2`,
      [req.params.id, decoded.sub]
    );
    if (!rowCount) return res.status(404).json({ error: 'Key không tồn tại' });
    return res.json({ ok: true });
  } catch (e) { console.error('[api-keys:revoke]', e.message); return res.status(500).json({ error: 'Lỗi xoá key' }); }
});

app.post('/api/auth/validate-key', async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key || !String(key).startsWith('AERO-')) return res.status(401).json({ ok: false, error: 'Invalid key format' });
    const prefix = String(key).slice(0, 12);
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT k.*, u.role, u.name, u.email FROM user_api_keys k JOIN "User" u ON u.id=k.user_id WHERE k.key_prefix=$1 AND k.revoked=false`,
      [prefix]
    );
    for (const row of rows) {
      const valid = await _akBcrypt.compare(key, row.key_hash);
      if (valid) {
        pool.query('UPDATE user_api_keys SET last_used_at=NOW() WHERE id=$1', [row.id]).catch(() => {});
        return res.json({ ok: true, userId: row.user_id, role: row.role, name: row.name, email: row.email });
      }
    }
    return res.status(401).json({ ok: false, error: 'Key không hợp lệ hoặc đã bị thu hồi' });
  } catch (e) { console.error('[api-keys:validate]', e.message); return res.status(500).json({ error: 'Lỗi xác thực key' }); }
});

// ── Classes (GV tạo/xem/xoá lớp) — PHẢI trước catch-all /api proxy ────────
// Rust aero-backend hiện không serve /api/classes (ECONNREFUSED 127.0.0.1:8090)
// → handler Node.js trực tiếp với bảng "Class" trong DB chung.
async function _ensureClassTable() {
  const pool = _getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Class" (
      id              VARCHAR(36)  PRIMARY KEY,
      teacher_id      VARCHAR(255) NOT NULL,
      name            VARCHAR(200) NOT NULL,
      grade           VARCHAR(50),
      school_year     VARCHAR(20),
      description     TEXT,
      context_type    VARCHAR(20)  DEFAULT 'SCHOOL',
      institution_name VARCHAR(200),
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('Class', [
    ['teacher_id',       "VARCHAR(255)"],
    ['name',             "VARCHAR(200)"],
    ['grade',            "VARCHAR(50)"],
    ['school_year',      "VARCHAR(20)"],
    ['description',      "TEXT"],
    ['context_type',     "VARCHAR(20) DEFAULT 'SCHOOL'"],
    ['institution_name', "VARCHAR(200)"],
    ['created_at',       "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('Class', ['schoolYear','teacherId','name','grade','description','createdAt','updatedAt','contextType','institutionName']);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_teacher ON "Class"(teacher_id)`);

  // ClassStudent bảng cho danh sách HS trong lớp (import từ Excel)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ClassStudent" (
      id              VARCHAR(36)  PRIMARY KEY,
      class_id        VARCHAR(36)  NOT NULL,
      stt             INTEGER,
      ho_ten          VARCHAR(200) NOT NULL,
      ma_dinh_danh    VARCHAR(50),
      ngay_sinh       VARCHAR(20),
      gioi_tinh       VARCHAR(20),
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('ClassStudent', [
    ['class_id',     "VARCHAR(36)"],
    ['stt',          "INTEGER"],
    ['ho_ten',       "VARCHAR(200)"],
    ['ma_dinh_danh', "VARCHAR(50)"],
    ['ngay_sinh',    "VARCHAR(20)"],
    ['gioi_tinh',    "VARCHAR(20)"],
    ['created_at',   "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('ClassStudent', ['classId','studentId','fullName','identifier','name','dob','gender','birthDate','createdAt','updatedAt']);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_classstudent_class ON "ClassStudent"(class_id)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_classstudent_madd ON "ClassStudent"(class_id, ma_dinh_danh) WHERE ma_dinh_danh IS NOT NULL AND ma_dinh_danh <> ''`);
}
_ensureClassTable().catch(e => console.error('[classes] migration error:', e.message));

// Helper trả về user từ JWT
function _classAuth(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try { return _akVerify(auth.slice(7)); }
  catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
}

// GET /api/classes → { classes: [...] }
app.get('/api/classes', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT c.id, c.name, c.grade, c.school_year AS "schoolYear", c.description,
             c.context_type, c.institution_name, c.created_at AS "createdAt",
             COALESCE((SELECT COUNT(*) FROM "ClassStudent" cs WHERE cs.class_id = c.id), 0)::int AS "studentCount"
      FROM "Class" c WHERE c.teacher_id = $1 ORDER BY c.created_at DESC
    `, [decoded.sub]);
    return res.json({ classes: rows });
  } catch (e) {
    // Bảng ClassStudent có thể chưa tồn tại — fallback query bỏ join
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT id, name, grade, school_year AS "schoolYear", description,
               context_type, institution_name, created_at AS "createdAt",
               0 AS "studentCount"
        FROM "Class" WHERE teacher_id = $1 ORDER BY created_at DESC
      `, [decoded.sub]);
      return res.json({ classes: rows });
    } catch (e2) {
      console.error('[classes:list]', e2.message);
      return res.status(500).json({ error: 'Lỗi lấy danh sách lớp' });
    }
  }
});

// POST /api/classes — body: { name, grade, schoolYear, description, context_type, institution_name }
app.post('/api/classes', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  try {
    const { name = '', grade = '', schoolYear = '', description = '',
            context_type = 'SCHOOL', institution_name = '' } = req.body || {};
    if (!String(name).trim()) return res.status(400).json({ error: 'Thiếu tên lớp' });
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const pool = _getPool();
    await pool.query(`
      INSERT INTO "Class"(id, teacher_id, name, grade, school_year, description, context_type, institution_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [id, decoded.sub, String(name).slice(0,200), String(grade).slice(0,50),
        String(schoolYear).slice(0,20), String(description), String(context_type),
        String(institution_name).slice(0,200)]);
    return res.json({ ok: true, id, name, grade, schoolYear, description, context_type, institution_name, studentCount: 0, createdAt: new Date().toISOString() });
  } catch (e) { console.error('[classes:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo lớp học' }); }
});

// DELETE /api/classes/:id
app.delete('/api/classes/:id', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM "Class" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]
    );
    if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
    return res.json({ ok: true });
  } catch (e) { console.error('[classes:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá lớp' }); }
});

// PATCH /api/classes/:id
app.patch('/api/classes/:id', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  try {
    const { name, grade, schoolYear, description, context_type, institution_name } = req.body || {};
    const updates = [];
    const params = [req.params.id, decoded.sub];
    if (name !== undefined)              { params.push(String(name).slice(0,200));            updates.push(`name = $${params.length}`); }
    if (grade !== undefined)             { params.push(String(grade).slice(0,50));            updates.push(`grade = $${params.length}`); }
    if (schoolYear !== undefined)        { params.push(String(schoolYear).slice(0,20));       updates.push(`school_year = $${params.length}`); }
    if (description !== undefined)       { params.push(String(description));                  updates.push(`description = $${params.length}`); }
    if (context_type !== undefined)      { params.push(String(context_type));                 updates.push(`context_type = $${params.length}`); }
    if (institution_name !== undefined)  { params.push(String(institution_name).slice(0,200)); updates.push(`institution_name = $${params.length}`); }
    if (!updates.length) return res.json({ ok: true });
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Class" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = $2`,
      params
    );
    if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
    return res.json({ ok: true });
  } catch (e) { console.error('[classes:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật lớp' }); }
});

// GET /api/classes/:id/students → { students: [...] }
app.get('/api/classes/:id/students', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    // Verify lớp thuộc teacher
    const { rowCount } = await pool.query(
      `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
    const { rows } = await pool.query(
      `SELECT id, stt, ho_ten AS "hoTen", ma_dinh_danh AS "maDinhDanh",
              ngay_sinh AS "ngaySinh", gioi_tinh AS "gioiTinh", created_at AS "createdAt"
       FROM "ClassStudent" WHERE class_id = $1 ORDER BY stt NULLS LAST, ho_ten`,
      [req.params.id]);
    return res.json({ students: rows, total: rows.length });
  } catch (e) { console.error('[classes:students:list]', e.message); return res.status(500).json({ error: 'Lỗi tải DS học sinh' }); }
});

// POST /api/classes/:id/students/import — bulk insert/update từ Excel
// Body: { students: [{ stt, hoTen, ngaySinh, gioiTinh, maDinhDanh }, ...] }
// Returns: { success, message, results: { inserted, updated, skipped, total }, errors }
app.post('/api/classes/:id/students/import', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  const classId = req.params.id;
  const studentsIn = Array.isArray(req.body?.students) ? req.body.students : [];
  if (!studentsIn.length) return res.status(400).json({ error: 'Danh sách HS rỗng' });
  try {
    const pool = _getPool();
    const { rowCount: ok } = await pool.query(
      `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = $2`,
      [classId, decoded.sub]);
    if (!ok) return res.status(404).json({ error: 'Lớp không tồn tại' });

    const { randomUUID } = require('crypto');
    let inserted = 0, updated = 0, skipped = 0;
    const errors = [];
    for (const s of studentsIn) {
      const hoTen = String(s.hoTen || '').trim();
      const maDD = String(s.maDinhDanh || '').trim();
      const stt = s.stt ? Number(s.stt) : null;
      const ngaySinh = String(s.ngaySinh || '').trim();
      const gioiTinh = String(s.gioiTinh || '').trim();
      if (!hoTen) { skipped++; if (errors.length < 3) errors.push(`Bỏ qua HS dòng ${stt || '?'}: thiếu họ tên`); continue; }
      try {
        if (maDD) {
          // Có mã định danh → upsert theo (class_id, ma_dinh_danh)
          const upd = await pool.query(
            `UPDATE "ClassStudent" SET stt = $1, ho_ten = $2, ngay_sinh = $3, gioi_tinh = $4
             WHERE class_id = $5 AND ma_dinh_danh = $6 RETURNING id`,
            [stt, hoTen.slice(0,200), ngaySinh.slice(0,20), gioiTinh.slice(0,20), classId, maDD.slice(0,50)]);
          if (upd.rowCount) { updated++; }
          else {
            await pool.query(
              `INSERT INTO "ClassStudent"(id, class_id, stt, ho_ten, ma_dinh_danh, ngay_sinh, gioi_tinh)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [randomUUID(), classId, stt, hoTen.slice(0,200), maDD.slice(0,50), ngaySinh.slice(0,20), gioiTinh.slice(0,20)]);
            inserted++;
          }
        } else {
          // Không có mã → chỉ insert
          await pool.query(
            `INSERT INTO "ClassStudent"(id, class_id, stt, ho_ten, ngay_sinh, gioi_tinh)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [randomUUID(), classId, stt, hoTen.slice(0,200), ngaySinh.slice(0,20), gioiTinh.slice(0,20)]);
          inserted++;
        }
      } catch (e) {
        skipped++;
        if (errors.length < 3) errors.push(`Dòng ${stt || '?'}: ${e.message.slice(0,100)}`);
      }
    }
    return res.json({
      success: true,
      message: `Import xong: ${inserted} thêm mới + ${updated} cập nhật + ${skipped} bỏ qua`,
      results: { inserted, updated, skipped, total: studentsIn.length },
      errors,
    });
  } catch (e) { console.error('[classes:students:import]', e.message); return res.status(500).json({ error: 'Lỗi import học sinh' }); }
});

// DELETE /api/classes/:id/students/:studentId
app.delete('/api/classes/:id/students/:studentId', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rowCount: ok } = await pool.query(
      `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]);
    if (!ok) return res.status(404).json({ error: 'Lớp không tồn tại' });
    const { rowCount } = await pool.query(
      `DELETE FROM "ClassStudent" WHERE id = $1 AND class_id = $2`,
      [req.params.studentId, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'HS không tồn tại' });
    return res.json({ ok: true });
  } catch (e) { console.error('[classes:students:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá HS' }); }
});

// ── Analytics pageview — PHẢI trước catch-all /api proxy ────────
// Rust aero-backend không serve /api/analytics/pageview → 503 spam console
// mỗi route change. Handler nhẹ: insert vào "PageView" (best-effort) + 204.
async function _ensurePageViewTable() {
  const pool = _getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "PageView" (
      id          BIGSERIAL    PRIMARY KEY,
      path        VARCHAR(500) NOT NULL,
      session_id  VARCHAR(60),
      user_id     VARCHAR(255),
      view_ms     INTEGER,
      referrer    VARCHAR(500),
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('PageView', [
    ['path',       "VARCHAR(500)"],
    ['session_id', "VARCHAR(60)"],
    ['user_id',    "VARCHAR(255)"],
    ['view_ms',    "INTEGER"],
    ['referrer',   "VARCHAR(500)"],
    ['created_at', "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('PageView', ['sessionId','userId','viewMs','createdAt']);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageview_created ON "PageView"(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageview_path ON "PageView"(path)`);
}
_ensurePageViewTable().catch(e => console.error('[pageview] migration error:', e.message));

app.post('/api/analytics/pageview', async (req, res) => {
  // 204 trước khi insert — fire-and-forget, không block UX
  res.status(204).end();
  try {
    const { path = '', sessionId = null, viewMs = null, referrer = null } = req.body || {};
    if (!path) return;
    // Optional auth: nếu có Bearer token hợp lệ → log user_id
    let userId = null;
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      try { userId = _akVerify(auth.slice(7)).sub; } catch { /* anonymous OK */ }
    }
    const pool = _getPool();
    await pool.query(
      `INSERT INTO "PageView"(path, session_id, user_id, view_ms, referrer)
       VALUES ($1,$2,$3,$4,$5)`,
      [String(path).slice(0,500), sessionId ? String(sessionId).slice(0,60) : null,
       userId, typeof viewMs === 'number' ? Math.max(0, Math.min(viewMs, 86_400_000)) : null,
       referrer ? String(referrer).slice(0,500) : null]
    );
  } catch (e) {
    // Best-effort — không log mỗi request để tránh spam log
    if (Math.random() < 0.01) console.warn('[pageview]', e.message);
  }
});

// ── Stub handlers cho Rust microservices offline ──────────
// (aero-backend, teacher-service, reco-service đều ECONNREFUSED)
// Trả empty payload thay vì 503 → UI hiện empty state, không lỗi đỏ.
// Xoá các stub này khi service được khôi phục.

// Notifications (aero-backend)
app.get('/api/notifications', (_req, res) => res.json({ notifications: [], unread: 0, total: 0 }));
app.post('/api/notifications/:id/read', (_req, res) => res.json({ ok: true }));
app.post('/api/notifications/mark-all-read', (_req, res) => res.json({ ok: true }));

// Exam matrices list (media-service) — UI đã có SAMPLE_MATRICES fallback
// (exam-matrices CRUD moved above proxy — line ~4950)

// Recommendation feed (reco-service)
// Sprint AI feed — real DB query cho teacher (RsFeedItem shape):
// Items dựa trên dữ liệu thực của GV trong bảng "Exam", "LessonPlan", "Class"
app.get('/api/reco/feed', async (req, res) => {
  const audience = req.query.audience || 'student';
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const auth = req.headers.authorization || '';
  let teacherId = null;
  if (auth.startsWith('Bearer ')) {
    try { teacherId = _akVerify(auth.slice(7)).sub; } catch { /* anonymous */ }
  }
  // Student audience — chưa có signals, trả empty
  if (audience !== 'teacher' || !teacherId) {
    return res.json({ audience, count: 0, items: [], sources: [], isColdStart: true });
  }
  try {
    const pool = _getPool();
    const items = [];
    // 1) content_gap — Exam draft chưa có câu hỏi
    const { rows: draftExams } = await pool.query(`
      SELECT id, title, subject, grade, jsonb_array_length(question_ids) AS qcount, created_at
      FROM "Exam" WHERE teacher_id = $1 AND (status = 'draft' OR status IS NULL)
      ORDER BY created_at DESC LIMIT 5
    `, [teacherId]);
    for (const e of draftExams) {
      if (e.qcount < 5) {
        items.push({
          type: 'content_gap',
          id: `exam-${e.id}`,
          title: `Đề "${e.title}" còn trống`,
          subtitle: `${e.qcount} câu — Khối ${e.grade || '?'} ${e.subject ? '· ' + e.subject : ''}`,
          description: 'Đề thi đang ở trạng thái nháp với ít câu hỏi. Bấm để thêm câu từ Ngân hàng.',
          score: 0.8 - (e.qcount * 0.1),
          source: 'exam-draft',
          link: `/teacher/exams`,
          cta: 'Mở đề',
          reasons: ['🎯 Còn trống', '✏️ Cần thêm câu hỏi'],
        });
      }
    }
    // 2) content_gap — LessonPlan ngắn (<200 từ)
    const { rows: shortPlans } = await pool.query(`
      SELECT id, title, subject, grade, word_count, updated_at
      FROM "LessonPlan" WHERE teacher_id = $1 AND word_count < 200 AND is_archived = false
      ORDER BY updated_at DESC LIMIT 5
    `, [teacherId]);
    for (const p of shortPlans) {
      items.push({
        type: 'content_gap',
        id: `plan-${p.id}`,
        title: `Giáo án "${p.title}" còn ngắn`,
        subtitle: `${p.word_count} từ ${p.grade ? '· Khối ' + p.grade : ''} ${p.subject ? '· ' + p.subject : ''}`,
        description: 'Giáo án có dưới 200 từ — cần bổ sung mục tiêu, hoạt động, đánh giá.',
        score: 0.7,
        source: 'lesson-plan-short',
        link: `/teacher/lesson-plans`,
        cta: 'Hoàn thiện',
        reasons: ['📝 Cần mở rộng nội dung'],
      });
    }
    // 3) class_trending_weak — Class không có exam gắn (proxy của "lớp chưa khảo sát")
    const { rows: classes } = await pool.query(`
      SELECT id, name, grade FROM "Class" WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 10
    `, [teacherId]);
    if (classes.length === 0) {
      items.push({
        type: 'class_trending_weak',
        id: 'no-class',
        title: 'Chưa tạo lớp nào',
        subtitle: 'Tạo lớp đầu tiên để bắt đầu',
        description: 'Sprint AI sẽ phân tích điểm yếu lớp khi bạn có HS làm bài.',
        score: 1.0,
        source: 'setup',
        link: '/teacher/classes',
        cta: 'Tạo lớp',
        reasons: ['👋 Bắt đầu tại đây'],
      });
    }
    // 4) student_needs_help — chưa có signals từ HS → skip
    // 5) student_self_path — chưa có KG mastery → skip

    return res.json({
      audience: 'teacher',
      count: items.length,
      items: items.slice(0, limit),
      sources: ['exam-draft','lesson-plan-short','setup'],
      isColdStart: items.length < 3,
    });
  } catch (e) {
    console.error('[reco/feed:teacher]', e.message);
    return res.json({ audience: 'teacher', count: 0, items: [], sources: [], isColdStart: true });
  }
});
app.post('/api/reco/feedback', (_req, res) => res.json({ ok: true }));

// Teacher service (port 8106)
app.get('/api/teacher/students', (_req, res) => res.json({ students: [], total: 0 }));
app.get('/api/teacher/leaderboard', (_req, res) => res.json({ teachers: [], total: 0 }));
app.get('/api/teacher/roster', (_req, res) => res.json({ roster: [], total: 0 }));

// Lesson Plans CRUD (teacher-service offline) — bảng "LessonPlan" Node.js
async function _ensureLessonPlanTable() {
  const pool = _getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "LessonPlan" (
      id              VARCHAR(36)  PRIMARY KEY,
      teacher_id      VARCHAR(255) NOT NULL,
      title           VARCHAR(500) NOT NULL DEFAULT 'Giáo án mới',
      subject         VARCHAR(100),
      grade           VARCHAR(50),
      tags            JSONB        NOT NULL DEFAULT '[]'::jsonb,
      content         TEXT         NOT NULL DEFAULT '',
      content_json    JSONB,
      word_count      INTEGER      NOT NULL DEFAULT 0,
      is_archived     BOOLEAN      NOT NULL DEFAULT false,
      format          VARCHAR(10)  NOT NULL DEFAULT 'html',
      latex_project_id VARCHAR(36),
      gcs_backup_url  TEXT,
      gcs_backup_at   TIMESTAMPTZ,
      last_saved_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('LessonPlan', [
    ['teacher_id',       "VARCHAR(255)"],
    ['title',            "VARCHAR(500) DEFAULT 'Giáo án mới'"],
    ['subject',          "VARCHAR(100)"],
    ['grade',            "VARCHAR(50)"],
    ['tags',             "JSONB DEFAULT '[]'::jsonb"],
    ['content',          "TEXT DEFAULT ''"],
    ['content_json',     "JSONB"],
    ['word_count',       "INTEGER DEFAULT 0"],
    ['is_archived',      "BOOLEAN DEFAULT false"],
    ['format',           "VARCHAR(10) DEFAULT 'html'"],
    ['latex_project_id', "VARCHAR(36)"],
    ['gcs_backup_url',   "TEXT"],
    ['gcs_backup_at',    "TIMESTAMPTZ"],
    ['last_saved_at',    "TIMESTAMPTZ DEFAULT NOW()"],
    ['created_at',       "TIMESTAMPTZ DEFAULT NOW()"],
    ['updated_at',       "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('LessonPlan', ['teacherId','title','subject','grade','tags','content','contentJson','wordCount','isArchived','format','latexProjectId','gcsBackupUrl','gcsBackupAt','lastSavedAt','createdAt','updatedAt']);
  await _backfillSnakeFromCamel('LessonPlan', [
    ['teacher_id',   ['teacherId', 'userId', 'createdBy', 'ownerId']],
    ['word_count',   ['wordCount']],
  ]);
  // Legacy tags/content_json có thể TEXT[] hoặc TEXT — migrate sang JSONB
  for (const col of ['tags', 'content_json']) {
    try { await pool.query(`ALTER TABLE "LessonPlan" ALTER COLUMN ${col} TYPE JSONB USING to_jsonb(${col})`); }
    catch { /* skip */ }
  }
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_lessonplan_teacher ON "LessonPlan"(teacher_id, updated_at DESC)`);
}
_ensureLessonPlanTable().catch(e => console.error('[lesson-plans] migration error:', e.message));

function _lpAuth(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try { return _akVerify(auth.slice(7)); }
  catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
}

function _lpRow(r) {
  return {
    id: r.id,
    title: r.title,
    subject: r.subject,
    grade: r.grade,
    tags: r.tags || [],
    wordCount: r.word_count || 0,
    isArchived: !!r.is_archived,
    format: r.format || 'html',
    latexProjectId: r.latex_project_id,
    gcsBackupUrl: r.gcs_backup_url,
    gcsBackupAt: r.gcs_backup_at,
    lastSavedAt: r.last_saved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    contentPreview: r.content ? String(r.content).slice(0, 200) : '',
  };
}

// GET /api/teacher/lesson-plans → { plans, count }
app.get('/api/teacher/lesson-plans', async (req, res) => {
  const decoded = _lpAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT id, title, subject, grade, tags, word_count, is_archived, format,
             latex_project_id, gcs_backup_url, gcs_backup_at, last_saved_at,
             created_at, updated_at, content
      FROM "LessonPlan" WHERE teacher_id = $1 ORDER BY updated_at DESC
    `, [decoded.sub]);
    return res.json({ plans: rows.map(_lpRow), count: rows.length });
  } catch (e) { console.error('[lesson-plans:list]', e.message); return res.status(500).json({ error: 'Lỗi tải danh sách giáo án' }); }
});

// GET /api/teacher/lesson-plans/:id
app.get('/api/teacher/lesson-plans/:id', async (req, res) => {
  const decoded = _lpAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT * FROM "LessonPlan" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]
    );
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy giáo án' });
    const r = rows[0];
    return res.json({ ..._lpRow(r), content: r.content || '', contentJson: r.content_json || null });
  } catch (e) { console.error('[lesson-plans:get]', e.message); return res.status(500).json({ error: 'Lỗi tải giáo án' }); }
});

// POST /api/teacher/lesson-plans
app.post('/api/teacher/lesson-plans', async (req, res) => {
  const decoded = _lpAuth(req, res); if (!decoded) return;
  try {
    const { title = 'Giáo án mới', content = '', contentJson = null, subject = null, grade = null, tags = [] } = req.body || {};
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const wordCount = String(content).replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
    const pool = _getPool();
    const { rows } = await pool.query(`
      INSERT INTO "LessonPlan"(id, teacher_id, title, subject, grade, tags, content, content_json, word_count)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9)
      RETURNING *
    `, [id, decoded.sub, String(title).slice(0, 500), subject, grade,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        String(content), contentJson ? JSON.stringify(contentJson) : null, wordCount]);
    const r = rows[0];
    return res.json({ plan: { ..._lpRow(r), content: r.content || '', contentJson: r.content_json || null } });
  } catch (e) { console.error('[lesson-plans:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo giáo án' }); }
});

// PATCH /api/teacher/lesson-plans/:id — auto-save
app.patch('/api/teacher/lesson-plans/:id', async (req, res) => {
  const decoded = _lpAuth(req, res); if (!decoded) return;
  try {
    const { title, content, contentJson, subject, grade, tags, isArchived } = req.body || {};
    const updates = ['updated_at = NOW()', 'last_saved_at = NOW()'];
    const params = [req.params.id, decoded.sub];
    if (title !== undefined)       { params.push(String(title).slice(0, 500));  updates.push(`title = $${params.length}`); }
    if (subject !== undefined)     { params.push(subject);                       updates.push(`subject = $${params.length}`); }
    if (grade !== undefined)       { params.push(grade);                         updates.push(`grade = $${params.length}`); }
    if (tags !== undefined)        { params.push(JSON.stringify(Array.isArray(tags) ? tags : [])); updates.push(`tags = $${params.length}::jsonb`); }
    if (content !== undefined) {
      const wc = String(content).replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
      params.push(String(content));               updates.push(`content = $${params.length}`);
      params.push(wc);                            updates.push(`word_count = $${params.length}`);
    }
    if (contentJson !== undefined) { params.push(contentJson ? JSON.stringify(contentJson) : null); updates.push(`content_json = $${params.length}::jsonb`); }
    if (isArchived !== undefined)  { params.push(!!isArchived);                  updates.push(`is_archived = $${params.length}`); }
    const pool = _getPool();
    const { rows } = await pool.query(
      `UPDATE "LessonPlan" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = $2 RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy giáo án' });
    const r = rows[0];
    return res.json({ plan: { ..._lpRow(r), content: r.content || '', contentJson: r.content_json || null } });
  } catch (e) { console.error('[lesson-plans:update]', e.message); return res.status(500).json({ error: 'Lỗi lưu giáo án' }); }
});

// DELETE /api/teacher/lesson-plans/:id
app.delete('/api/teacher/lesson-plans/:id', async (req, res) => {
  const decoded = _lpAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM "LessonPlan" WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, decoded.sub]
    );
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy giáo án' });
    return res.json({ ok: true });
  } catch (e) { console.error('[lesson-plans:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá giáo án' }); }
});

// Stub endpoints (chưa implement GCS backup + from-latex)
app.post('/api/teacher/lesson-plans/:id/backup', (_req, res) => res.status(501).json({ error: 'GCS backup chưa khả dụng (cần GCS bucket setup)' }));
app.post('/api/teacher/lesson-plans/from-latex', (_req, res) => res.status(501).json({ error: 'Import từ LaTeX chưa khả dụng' }));
app.get('/api/teacher/lesson-plans-gcs', (_req, res) => res.json({ snapshots: [], count: 0, bucket: '', prefix: '' }));
app.delete('/api/teacher/lesson-plans-gcs/:filename', (_req, res) => res.status(501).json({ error: 'GCS delete chưa khả dụng' }));

// Leaderboard realtime (aero-backend)
app.get('/api/leaderboard/realtime', (_req, res) => res.json({ leaders: [], updatedAt: new Date().toISOString() }));

// ════════════════════════════════════════════════════════════
// EXAMS + QUESTION BANK — Real CRUD (media-service offline)
// ════════════════════════════════════════════════════════════
async function _ensureExamTables() {
  const pool = _getPool();
  // Question Bank
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Question" (
      id           VARCHAR(36)  PRIMARY KEY,
      teacher_id   VARCHAR(255) NOT NULL,
      content      TEXT         NOT NULL,
      type         VARCHAR(20)  NOT NULL DEFAULT 'multiple_choice',
      subject      VARCHAR(100),
      grade        VARCHAR(50),
      chapter      VARCHAR(200),
      difficulty   VARCHAR(20)  DEFAULT 'TH',
      options      JSONB        DEFAULT '[]'::jsonb,
      answer       TEXT,
      explanation  TEXT,
      tags         JSONB        DEFAULT '[]'::jsonb,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('Question', [
    ['teacher_id', "VARCHAR(255)"], ['content', "TEXT"], ['type', "VARCHAR(20) DEFAULT 'multiple_choice'"],
    ['subject', "VARCHAR(100)"], ['grade', "VARCHAR(50)"], ['chapter', "VARCHAR(200)"],
    ['difficulty', "VARCHAR(20) DEFAULT 'TH'"], ['options', "JSONB DEFAULT '[]'::jsonb"],
    ['answer', "TEXT"], ['explanation', "TEXT"], ['tags', "JSONB DEFAULT '[]'::jsonb"],
    ['visibility', "VARCHAR(20) DEFAULT 'private'"],
    ['created_at', "TIMESTAMPTZ DEFAULT NOW()"], ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('Question', ['teacherId','content','type','subject','grade','chapter','difficulty','options','answer','explanation','tags','createdAt','updatedAt','ownerId','authorId','topic','questionType','correctAnswer','qualityScore','usageCount','aiGenerated','humanReviewed','status','createdBy']);
  // BACKFILL critical: GV cũ tạo Question trên Rust service với teacherId/createdBy/authorId
  // → handler mới query WHERE teacher_id=$me → empty → GV tưởng mất data
  await _backfillSnakeFromCamel('Question', [
    ['teacher_id', ['teacherId', 'createdBy', 'authorId', 'ownerId', 'userId']],
    ['type',       ['type', 'questionType']],
    ['answer',     ['answer', 'correctAnswer']],
  ]);
  // Legacy Question.options từ Rust service là TEXT[] → quiz-publish handler
  // JSON.stringify ra '["..."]' không khớp PG array literal '{...}' → 500.
  // Migrate sang JSONB cho cả 2 cột options + tags.
  for (const col of ['options', 'tags']) {
    try {
      await pool.query(`ALTER TABLE "Question" ALTER COLUMN ${col} TYPE JSONB USING to_jsonb(${col})`);
    } catch { /* đã JSONB sẵn — skip */ }
  }
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_question_teacher ON "Question"(teacher_id, created_at DESC)`);

  // Exams
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "Exam" (
      id           VARCHAR(36)  PRIMARY KEY,
      teacher_id   VARCHAR(255) NOT NULL,
      title        VARCHAR(500) NOT NULL DEFAULT 'Đề thi mới',
      description  TEXT,
      subject      VARCHAR(100),
      grade        VARCHAR(50),
      duration_min INTEGER      DEFAULT 45,
      total_points NUMERIC      DEFAULT 10,
      question_ids JSONB        DEFAULT '[]'::jsonb,
      settings     JSONB        DEFAULT '{}'::jsonb,
      status       VARCHAR(20)  DEFAULT 'draft',
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await _alterAddColumns('Exam', [
    ['teacher_id', "VARCHAR(255)"], ['title', "VARCHAR(500) DEFAULT 'Đề thi mới'"],
    ['description', "TEXT"], ['subject', "VARCHAR(100)"], ['grade', "VARCHAR(50)"],
    ['duration_min', "INTEGER DEFAULT 45"], ['total_points', "NUMERIC DEFAULT 10"],
    ['question_ids', "JSONB DEFAULT '[]'::jsonb"], ['settings', "JSONB DEFAULT '{}'::jsonb"],
    ['status', "VARCHAR(20) DEFAULT 'draft'"],
    ['visibility', "VARCHAR(20) DEFAULT 'private'"],
    ['created_at', "TIMESTAMPTZ DEFAULT NOW()"], ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
  ]);
  await _dropLegacyNotNull('Exam', ['teacherId','title','description','subject','grade','durationMin','totalPoints','questionIds','settings','status','createdAt','updatedAt','ownerId','examType','duration','totalScore','totalQuestions','passingScore','shuffle','sourceType','userId']);
  // BACKFILL: legacy GV data sang teacher_id
  await _backfillSnakeFromCamel('Exam', [
    ['teacher_id',   ['teacherId', 'userId', 'createdBy', 'ownerId']],
    ['duration_min', ['duration', 'durationMin']],
    ['total_points', ['totalScore', 'totalPoints']],
  ]);
  // Same fix cho Exam — legacy questionIds/settings có thể là array/text
  for (const col of ['question_ids', 'settings']) {
    try {
      await pool.query(`ALTER TABLE "Exam" ALTER COLUMN ${col} TYPE JSONB USING to_jsonb(${col})`);
    } catch { /* đã JSONB hoặc legacy column khác — skip */ }
  }
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_exam_teacher ON "Exam"(teacher_id, created_at DESC)`);

  // Add ExamQuestion + ExamQuestion legacy cleanup (cũng có "examId" camelCase NOT NULL)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "ExamQuestion" (
      id           VARCHAR(36)  PRIMARY KEY,
      "examId"     VARCHAR(36),
      "questionId" VARCHAR(36),
      "order"      INTEGER,
      points       NUMERIC DEFAULT 1
    )
  `);
  await _dropLegacyNotNull('ExamQuestion', ['examId','questionId','order','points','createdAt','updatedAt']);
}
_ensureExamTables().catch(e => console.error('[exams] migration error:', e.message));

function _examAuth(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  try { return _akVerify(auth.slice(7)); }
  catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
}

// ── Question Bank CRUD ──
// Visibility: 'private' (default) — chỉ GV tạo xem; 'public' — mọi GV xem & sử dụng
app.get('/api/question-bank', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const scope = req.query.scope || 'all';   // 'mine' | 'public' | 'all'
    const pool = _getPool();
    let where;
    const params = [decoded.sub];
    if (scope === 'mine') {
      where = `teacher_id = $1`;
    } else if (scope === 'public') {
      where = `visibility = 'public' AND teacher_id != $1`;
    } else {
      // 'all' = mình + public của người khác (default cho ngân hàng chung)
      where = `teacher_id = $1 OR visibility = 'public'`;
    }
    const { rows } = await pool.query(
      `SELECT *, (teacher_id = $1) AS is_owner FROM "Question"
       WHERE ${where} ORDER BY created_at DESC LIMIT 500`,
      params
    );
    const questions = rows.map(r => ({
      ...r,
      visibility: r.visibility || 'private',
      isOwner: !!r.is_owner,
    }));
    return res.json({ questions, total: questions.length });
  } catch (e) { console.error('[question-bank:list]', e.message); return res.json({ questions: [], total: 0 }); }
});

app.post('/api/question-bank', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const { content = '', type = 'multiple_choice', subject = null, grade = null, chapter = null,
            difficulty = 'TH', options = [], answer = '', explanation = '', tags = [] } = req.body || {};
    if (!content.trim()) return res.status(400).json({ error: 'Thiếu nội dung câu hỏi' });
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const pool = _getPool();
    const { rows } = await pool.query(
      `INSERT INTO "Question"(id, teacher_id, content, type, subject, grade, chapter, difficulty, options, answer, explanation, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb) RETURNING *`,
      [id, decoded.sub, content, type, subject, grade, chapter, difficulty,
       JSON.stringify(options || []), answer, explanation, JSON.stringify(tags || [])]
    );
    return res.json({ question: rows[0] });
  } catch (e) { console.error('[question-bank:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo câu hỏi' }); }
});

app.patch('/api/question-bank/:id', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const fields = ['content', 'type', 'subject', 'grade', 'chapter', 'difficulty', 'answer', 'explanation'];
    const jsonFields = ['options', 'tags'];
    const updates = ['updated_at = NOW()']; const params = [req.params.id, decoded.sub];
    for (const f of fields) if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f} = $${params.length}`); }
    for (const f of jsonFields) if (req.body[f] !== undefined) { params.push(JSON.stringify(req.body[f])); updates.push(`${f} = $${params.length}::jsonb`); }
    // Visibility toggle (chỉ owner mới đổi được)
    if (req.body.visibility !== undefined && ['private','public'].includes(req.body.visibility)) {
      params.push(req.body.visibility); updates.push(`visibility = $${params.length}`);
    }
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Question" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = $2`, params);
    if (!rowCount) return res.status(403).json({ error: 'Bạn không phải chủ sở hữu — không thể sửa câu hỏi này' });
    return res.json({ ok: true });
  } catch (e) { console.error('[question-bank:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật' }); }
});

app.delete('/api/question-bank/:id', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM "Question" WHERE id = $1 AND teacher_id = $2`, [req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    return res.json({ ok: true });
  } catch (e) { console.error('[question-bank:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá' }); }
});

// /api/questions stubs (taxonomy + fix-latex — không có DB)
app.get('/api/questions/taxonomy', (_req, res) => res.json({
  subjects: ['Toán', 'Vật lí', 'Hoá', 'Sinh', 'Văn', 'Sử', 'Địa', 'Tiếng Anh', 'GDCD', 'Tin học'],
  grades: ['Khối 6','Khối 7','Khối 8','Khối 9','Khối 10','Khối 11','Khối 12'],
  difficulties: ['NB','TH','VD','VDC'],
  types: ['multiple_choice','true_false','essay','fill_blank'],
}));
app.post('/api/questions/fix-latex', (req, res) => res.json({ fixed: req.body?.content || '', changes: [] }));

// ── Exams CRUD ──
// /api/exams + /api/teacher/exams — list đề: của mình + public của người khác
function _examListWhere(scope) {
  if (scope === 'mine') return `teacher_id = $1`;
  if (scope === 'public') return `visibility = 'public' AND teacher_id != $1`;
  return `teacher_id = $1 OR visibility = 'public'`;  // 'all' default
}
app.get('/api/exams', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const where = _examListWhere(req.query.scope || 'mine');
    const { rows } = await pool.query(
      `SELECT id, title, description, subject, grade, duration_min, total_points, status,
              visibility, teacher_id, created_at, updated_at,
              jsonb_array_length(question_ids) AS question_count,
              (teacher_id = $1) AS is_owner
       FROM "Exam" WHERE ${where} ORDER BY created_at DESC LIMIT 500`, [decoded.sub]);
    const exams = rows.map(r => ({ ...r, visibility: r.visibility || 'private', isOwner: !!r.is_owner }));
    return res.json({ exams, total: exams.length });
  } catch (e) { console.error('[exams:list]', e.message); return res.json({ exams: [], total: 0 }); }
});

app.get('/api/teacher/exams', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const where = _examListWhere(req.query.scope || 'mine');
    const { rows } = await pool.query(
      `SELECT *, (teacher_id = $1) AS is_owner FROM "Exam"
       WHERE ${where} ORDER BY created_at DESC LIMIT 500`, [decoded.sub]);
    const exams = rows.map(r => ({ ...r, visibility: r.visibility || 'private', isOwner: !!r.is_owner }));
    return res.json({ exams, total: exams.length });
  } catch (e) { console.error('[teacher-exams:list]', e.message); return res.json({ exams: [], total: 0 }); }
});

app.post('/api/exams', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const { title = 'Đề thi mới', description = null, subject = null, grade = null,
            duration_min = 45, total_points = 10, question_ids = [], settings = {} } = req.body || {};
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const pool = _getPool();
    const { rows } = await pool.query(
      `INSERT INTO "Exam"(id, teacher_id, title, description, subject, grade, duration_min, total_points, question_ids, settings)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb) RETURNING *`,
      [id, decoded.sub, title, description, subject, grade, duration_min, total_points,
       JSON.stringify(question_ids || []), JSON.stringify(settings || {})]
    );
    return res.json({ exam: rows[0] });
  } catch (e) { console.error('[exams:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo đề' }); }
});

app.get('/api/exams/:id', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    // Cho phép xem đề của mình HOẶC public
    const { rows } = await pool.query(
      `SELECT *, (teacher_id = $2) AS is_owner FROM "Exam"
       WHERE id = $1 AND (teacher_id = $2 OR visibility = 'public')`,
      [req.params.id, decoded.sub]);
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy đề (hoặc không có quyền)' });
    const exam = { ...rows[0], visibility: rows[0].visibility || 'private', isOwner: !!rows[0].is_owner };
    return res.json({ exam });
  } catch (e) { console.error('[exams:get]', e.message); return res.status(500).json({ error: 'Lỗi tải đề' }); }
});

app.patch('/api/exams/:id', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const fields = ['title','description','subject','grade','duration_min','total_points','status'];
    const jsonFields = ['question_ids','settings'];
    const updates = ['updated_at = NOW()']; const params = [req.params.id, decoded.sub];
    for (const f of fields) if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f} = $${params.length}`); }
    for (const f of jsonFields) if (req.body[f] !== undefined) { params.push(JSON.stringify(req.body[f])); updates.push(`${f} = $${params.length}::jsonb`); }
    if (req.body.visibility !== undefined && ['private','public'].includes(req.body.visibility)) {
      params.push(req.body.visibility); updates.push(`visibility = $${params.length}`);
    }
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Exam" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = $2`, params);
    if (!rowCount) return res.status(403).json({ error: 'Bạn không phải chủ sở hữu — không thể sửa đề này' });
    return res.json({ ok: true });
  } catch (e) { console.error('[exams:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật' }); }
});

app.delete('/api/exams/:id', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM "Exam" WHERE id = $1 AND teacher_id = $2`, [req.params.id, decoded.sub]);
    if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
    return res.json({ ok: true });
  } catch (e) { console.error('[exams:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá' }); }
});

// /api/exams/generate-from-matrix — stub: tạo exam rỗng
app.post('/api/exams/generate-from-matrix', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const { matrixId, title = 'Đề từ ma trận' } = req.body || {};
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const pool = _getPool();
    await pool.query(
      `INSERT INTO "Exam"(id, teacher_id, title, description, status) VALUES ($1,$2,$3,$4,'draft')`,
      [id, decoded.sub, title, `Tạo từ ma trận ${matrixId || ''}`]);
    return res.json({ exam: { id, title }, note: 'Generated stub — câu hỏi cần thêm thủ công' });
  } catch (e) { return res.status(500).json({ error: 'Lỗi generate đề' }); }
});

// ════════════════════════════════════════════════════════════
// STUBS — empty data cho mọi endpoint còn 503
// ════════════════════════════════════════════════════════════
const EMPTY_LIST = { items: [], total: 0, hasMore: false };
const OK = { ok: true };

// Teacher
// /api/teacher/analytics — shape khớp AnalyticsData interface ở frontend
// (có totalStudents, topPerformingStudents[], strugglingStudents[], v.v.)
app.get('/api/teacher/analytics', async (req, res) => {
  const auth = req.headers.authorization || '';
  let teacherId = null;
  if (auth.startsWith('Bearer ')) { try { teacherId = _akVerify(auth.slice(7)).sub; } catch {} }
  const period = (req.query.period === 'week' || req.query.period === 'semester') ? req.query.period : 'month';
  let totalStudents = 0;
  if (teacherId) {
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT COUNT(DISTINCT cs.id)::int AS n
        FROM "ClassStudent" cs
        JOIN "Class" c ON c.id = cs.class_id
        WHERE c.teacher_id = $1
      `, [teacherId]);
      totalStudents = rows[0]?.n || 0;
    } catch { /* skip */ }
  }
  return res.json({
    period,
    meta: { fromClassStudent: totalStudents, fromTeacherStudentLink: 0, uniqueStudents: totalStudents, gradedSheets: 0 },
    totalStudents,
    averageScore: 0,
    completionRate: 0,
    engagementScore: 0,
    topPerformingStudents: [],
    strugglingStudents: [],
    subjectPerformance: [],
    weeklyProgress: [],
  });
});
app.get('/api/teacher/dashboard', (_req, res) => res.json({ classes: 0, students: 0, exams: 0, pending_grading: 0 }));
app.get('/api/teacher/modules', (_req, res) => res.json({ modules: [], total: 0 }));
app.get('/api/teacher/modules/public', (_req, res) => res.json({ modules: [], total: 0 }));
app.get('/api/teacher/my-students', (_req, res) => res.json({ students: [], total: 0 }));
app.get('/api/teacher/student-requests', (_req, res) => res.json({ requests: [], total: 0 }));
app.get('/api/teacher/sprints', (_req, res) => res.json({ sprints: [], total: 0 }));

// Student
app.get('/api/student/my-teachers', (_req, res) => res.json({ teachers: [], total: 0 }));
app.get('/api/student/progress-overview', (_req, res) => res.json({ overall: 0, subjects: [], streak: 0 }));
app.get('/api/student/learning-paths', (_req, res) => res.json({ paths: [], total: 0 }));

// Courses
app.get('/api/courses', (_req, res) => res.json({ courses: [], total: 0 }));
app.get('/api/courses/dashboard', (_req, res) => res.json({ enrolled: [], featured: [], my_progress: {} }));
app.get('/api/instructor/courses', (_req, res) => res.json({ courses: [], total: 0 }));
app.get('/api/learning/my-courses', (_req, res) => res.json({ courses: [], total: 0 }));
app.get('/api/learning/wishlist', (_req, res) => res.json({ items: [], total: 0 }));
app.get('/api/learning/purchase-history', (_req, res) => res.json({ orders: [], total: 0 }));

// Agents (exam-prep stats)
app.get('/api/agents/exam-prep/stats', (_req, res) => res.json({ total: 0, today: 0, streak: 0, accuracy: 0 }));
app.get('/api/agents/exam-prep/topics', (_req, res) => res.json({ topics: [], total: 0 }));
app.get('/api/agents/exam-prep/teacher_exams', (_req, res) => res.json({ exams: [], total: 0 }));
app.get('/api/agents/exam-prep/community-stats', (_req, res) => res.json({ users: 0, sessions: 0 }));

// Admin (additional stubs)
app.get('/api/admin/cameras', (_req, res) => res.json({ cameras: [], total: 0 }));
app.get('/api/admin/cameras/discover', (_req, res) => res.json({ discovered: [] }));
app.get('/api/admin/insights/behavior', (_req, res) => res.json({ patterns: [] }));
app.get('/api/admin/insights/recommendations', (_req, res) => res.json({ recommendations: [] }));
app.get('/api/admin/insights/trending-exams', (_req, res) => res.json({ exams: [] }));
app.get('/api/admin/insights/trending-topics', (_req, res) => res.json({ topics: [] }));
app.get('/api/admin/users', (_req, res) => res.json({ users: [], total: 0 }));
app.get('/api/admin/users/stats', (_req, res) => res.json({ total: 0, by_role: {} }));
app.get('/api/admin/news/pending', (_req, res) => res.json({ articles: [], total: 0 }));

// Cameras
app.get('/api/cameras', (_req, res) => res.json({ cameras: [], total: 0 }));

// KG
app.get('/api/kg/search', (req, res) => res.json({ nodes: [], edges: [], query: req.query.q || '' }));
app.get('/api/kg/my-brain', (_req, res) => res.json({ nodes: [], edges: [] }));
app.get('/api/kg/mastery/me', (_req, res) => res.json({ mastery: [] }));
app.get('/api/kg/path/find', (_req, res) => res.json({ path: [] }));
app.get('/api/kg/sources/lesson-plans', (_req, res) => res.json({ sources: [] }));
app.post('/api/kg/extract', (_req, res) => res.json({ nodes: [], edges: [] }));
app.post('/api/kg/seed', (_req, res) => res.json(OK));

// Chat / Users / Profile
app.get('/api/chat/rooms', (_req, res) => res.json({ rooms: [], total: 0 }));
app.get('/api/chat/users/search', (_req, res) => res.json({ users: [] }));
app.get('/api/users/search', (_req, res) => res.json({ users: [] }));
app.get('/api/users/me/profile', (_req, res) => res.json({ profile: null }));
app.get('/api/profile', (_req, res) => res.json({ profile: null }));
app.patch('/api/users/me/profile', (_req, res) => res.json(OK));

// Misc
app.get('/api/categories', (_req, res) => res.json({ categories: [] }));
app.get('/api/types', (_req, res) => res.json({ types: [] }));
app.get('/api/achievements', (_req, res) => res.json({ achievements: [], total: 0 }));
app.get('/api/transcript/history', (_req, res) => res.json({ transcripts: [], total: 0 }));
app.get('/api/emotion', (_req, res) => res.json({ entries: [] }));
// /api/emotion/stats — shape khớp EmotionStatsResponse interface ở EmotionMap.tsx
app.get('/api/emotion/stats', (req, res) => {
  const groupBy = (req.query.groupBy === 'day') ? 'day' : 'hour';
  const from = req.query.from || new Date(Date.now() - 24*60*60*1000).toISOString();
  const to   = req.query.to   || new Date().toISOString();
  return res.json({
    success: true,
    groupBy,
    buckets: [],
    summary: {
      from, to,
      totalSamples: 0,
      avgConfidence: 0,
      emotionDistribution: {},
      dominantEmotion: null,
    },
  });
});
app.get('/api/assignments', (_req, res) => res.json({ assignments: [], total: 0 }));
app.get('/api/assignments/recommended', (_req, res) => res.json({ recommendations: [] }));
app.post('/api/assignments/from-exam', (_req, res) => res.status(501).json({ error: 'Chưa khả dụng' }));

// Reco extras
app.get('/api/reco/history', (_req, res) => res.json({ history: [], total: 0 }));
app.post('/api/reco/track', (_req, res) => res.json(OK));
app.post('/api/notifications/read-all', (_req, res) => res.json(OK));

// KeoCo (game)
app.get('/api/keoco/lives', (_req, res) => res.json({ lives: 5, next_at: null }));
app.get('/api/keoco/challenges', (_req, res) => res.json({ challenges: [] }));
app.get('/api/keoco/sessions', (_req, res) => res.json({ sessions: [] }));
app.get('/api/keoco/challenges/leaderboard', (_req, res) => res.json({ leaders: [] }));

// Analytics
app.get('/api/analytics/dashboard', (_req, res) => res.json({ stats: {} }));
app.get('/api/analytics/activity', (_req, res) => res.json({ activities: [] }));
app.get('/api/analytics/courses', (_req, res) => res.json({ courses: [] }));
app.get('/api/analytics/students', (_req, res) => res.json({ students: [] }));

// Documents + Media (media-service offline) — accept upload nhưng ko lưu thật
app.get('/api/documents', (_req, res) => res.json({ documents: [], total: 0 }));
app.post('/api/documents', (_req, res) => res.status(501).json({ error: 'Document upload cần GCS bucket — chưa khả dụng' }));
app.get('/api/media', (_req, res) => res.json({ media: [], total: 0 }));
app.post('/api/media/upload', (_req, res) => res.status(501).json({ error: 'Media upload cần GCS — chưa khả dụng' }));

// Exam matrix detail/actions (chưa implement)
// (exam-matrices CRUD moved above proxy — line ~4950)

// XP / Gamification
app.post('/api/exam-xp/award', (_req, res) => res.json(OK));
// /api/exam-xp/me — XP của user hiện tại (shape XpMe)
app.get('/api/exam-xp/me', (_req, res) => res.json({
  totalXp: 0, examCount: 0, level: 1, nextLevelXp: 500, xpToNext: 500, history: [],
}));

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

// ── API Keys (MCP integration) ──────────────────────────────
// Table: user_api_keys (id, user_id, key_prefix, key_hash, name, created_at, last_used_at, revoked)
// Key format: AERO-<32 hex chars>  e.g. AERO-a1b2c3d4e5f6...
// Only store bcrypt hash of the full key; return plaintext only on creation.

async function ensureApiKeysTable() {
  const pool = _getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_api_keys (
      id            VARCHAR(36) PRIMARY KEY,
      user_id       VARCHAR(255) NOT NULL,
      key_prefix    VARCHAR(12)  NOT NULL,
      key_hash      TEXT         NOT NULL,
      name          VARCHAR(200) NOT NULL DEFAULT 'MCP Key',
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      last_used_at  TIMESTAMPTZ,
      revoked       BOOLEAN      NOT NULL DEFAULT false
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_uak_user ON user_api_keys(user_id)`);
}
ensureApiKeysTable().catch(e => console.error('[api-keys] migration error:', e.message));

// (api-keys routes registered before catch-all proxy above — see _ak* helpers)

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
