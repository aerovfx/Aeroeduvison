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

// Stub specific endpoints TRƯỚC proxy /api/teacher/* — express match theo
// thứ tự đăng ký, không add ở đây thì proxy sẽ catch trước → 503.
app.get('/api/teacher/students', (_req, res) => res.json({ students: [] }));
app.get('/api/teacher/students/:id', (req, res) => res.json({ id: req.params.id, name: '—', email: '—' }));

// ── /api/teacher/* → teacher-service ───────────────────────
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
      // Fallback empty array — UI dropdown vẫn render (chưa setup Category table)
      return res.json([]);
    }
  });

  // ── POST /api/instructor/courses ──────────────────────────
  // Tạo course mới. Required: title. Other fields optional.
  app.post('/api/instructor/courses', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getIPool();
      const { title, description, price, imageUrl, categoryId } = req.body || {};
      if (!title) return res.status(400).json({ error: 'title required' });
      // Try to auto-create Course table if missing
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
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const now = new Date();
      const { rows } = await pool.query(
        `INSERT INTO "Course" (id, "userId", title, description, "imageUrl", price, "categoryId", "isPublished", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8,$8) RETURNING *`,
        [id, userId, String(title).slice(0, 200),
         description || null, imageUrl || null,
         price ? Number(price) : null,
         categoryId || null, now]
      );
      console.log(`[instructor:create] ✅ ${id.slice(0,8)} title="${title}"`);
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.error('[instructor:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /api/instructor/courses/:id ─────────────────────
  app.patch('/api/instructor/courses/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const pool = getIPool();
      const allowed = ['title','description','imageUrl','price','categoryId'];
      const sets = []; const vals = [req.params.id, userId]; let i = 3;
      for (const k of allowed) {
        if (req.body && req.body[k] !== undefined) {
          sets.push(`"${k}" = $${i++}`);
          vals.push(req.body[k]);
        }
      }
      if (!sets.length) return res.status(400).json({ error: 'No fields' });
      sets.push(`"updatedAt" = $${i++}`); vals.push(new Date());
      const { rowCount } = await pool.query(
        `UPDATE "Course" SET ${sets.join(', ')} WHERE id=$1 AND "userId"=$2`, vals
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[instructor:update] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Stubs cho videos + assets endpoints (chưa implement full) ──
  const _501 = (msg) => (_req, res) => res.status(501).json({ error: msg });
  const _ok  = (_req, res) => res.json({ ok: true });
  app.get('/api/instructor/courses/:id/videos', (_req, res) => res.json([]));
  app.post('/api/instructor/courses/:id/videos', _501('Upload video đang phát triển'));
  app.delete('/api/instructor/courses/:id/videos/:videoId', _ok);
  app.get('/api/instructor/courses/:id/assets', (_req, res) => res.json([]));
  app.post('/api/instructor/courses/:id/assets', _501('Upload assets đang phát triển'));
  app.delete('/api/instructor/courses/:id/assets/:assetId', _ok);

  // ── Upload image endpoint (avatar / course thumbnail) ─────
  app.post('/api/upload/image', _501('Upload ảnh đang phát triển — hãy paste link URL ảnh có sẵn vào ô imageUrl'));
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

      // ── community-stats ───────────────────────────────
      // Shape khớp với type ExamCommunityStats trong aeroedu-vite/src/types
      // (totalAttempts/totalUsers/averagePercentage/leaderboard/bySubject/byExamType/recentActivity).
      // Đứng tên người dùng ẩn danh (User_xxx) — không expose email/full name.
      if (action === 'community-stats') {
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
        return res.json({
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

        for (const q of questions) {
          const qid = q.questionId;
          const user_ans = answers[qid];
          const correct_ans = q.correctAnswer || '';
          const isAnswered = user_ans !== undefined && user_ans !== null && String(user_ans).length > 0;

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
      const decoded = mjwt.verify(auth.slice(7), MJWT_SECRET);
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }

  // GET /api/exam-matrices?subject=&grade=&status=
  app.get('/api/exam-matrices', async (req, res) => {
    try {
      const userId = getMatrixUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
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
      // Try optional update description column với metadata JSON (nếu column tồn tại)
      try {
        await getMPool().query(
          `UPDATE "ExamMatrix" SET description=$1 WHERE id=$2`,
          [JSON.stringify(meta), id]
        );
      } catch { /* description column có thể không tồn tại — ignore */ }
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
      const decoded = xjwt.verify(auth.slice(7), XJWT_SECRET);
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }
  function parseMeta(description) {
    if (!description) return {};
    try {
      const p = JSON.parse(description);
      return { subject: p.subject || null, grade: p.grade || null,
        notes: p.notes || null, isPublic: !!p.public,
        publishedAt: p.publishedAt || null };
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
  // Logic: load Question.correctAnswer cho từng câu, so sánh, tính %.
  app.post('/api/exams/:id/grade', async (req, res) => {
    try {
      const xpool = getXPool();
      if (!xpool) return res.status(503).json({ error: 'DB not available' });
      const userAnswers = req.body?.answers || {};
      const examId = req.params.id;

      // Lấy questions của exam (correctAnswer cho server-side grade)
      const { rows: qs } = await xpool.query(
        `SELECT q.id, q."questionType", q."correctAnswer"
           FROM "ExamQuestion" eq
           JOIN "Question" q ON q.id = eq."questionId"
          WHERE eq."examId" = $1 ORDER BY eq."order" ASC`,
        [examId]
      );
      if (qs.length === 0) return res.status(404).json({ error: 'Đề không có câu hỏi' });

      // Normalize giống logic của quiz-rooms (xử lý "D. xxx" → "D")
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

      let correct = 0;
      for (const q of qs) {
        const userAns = userAnswers[q.id];
        if (userAns == null || userAns === '') continue;
        const t = (q.questionType || '').toUpperCase();
        if (t.includes('TRUE') || t.includes('FALSE')) {
          // True/False: answer là string 4 ký tự "TFFT" — so sánh từng ký tự
          // Question.correctAnswer cũng nên là "TFFT" hoặc "TTFT"
          const u = String(userAns).slice(0, 4).padEnd(4, '-');
          const c = String(q.correctAnswer || '').slice(0, 4).padEnd(4, '-');
          // Tính số ký tự khớp / 4 → quy đổi 1 câu (1 đúng cả = 1, 3/4 = 0.75, ...)
          let subCorrect = 0;
          for (let i = 0; i < 4; i++) {
            if (u[i] !== '-' && u[i] === c[i]) subCorrect++;
          }
          if (subCorrect === 4) correct += 1;
          else if (subCorrect >= 3) correct += 0.5;  // 3/4 = 0.5 điểm theo Bộ
        } else {
          if (norm(userAns) === norm(q.correctAnswer)) correct += 1;
        }
      }
      const total = qs.length;
      const percentage = total > 0 ? (correct / total) * 100 : 0;
      const score = Math.round((correct / total) * 100) / 10;  // thang 10
      console.log(`[exam:grade] ✅ exam=${examId.slice(0,8)} ${correct}/${total} (${Math.round(percentage)}%)`);
      return res.json({
        correct: Math.round(correct * 10) / 10,
        total, percentage, score,
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
app.get('/api/online-exam-room', (_req, res) => res.json({ rooms: [] }));
app.get('/api/online-exam-room/:id/schedule', (req, res) =>
  res.json({ roomId: req.params.id, schedules: [] }));
app.post('/api/online-exam-room', (_req, res) =>
  res.status(501).json({ error: 'Tạo phòng thi online đang phát triển — dùng LIVE quiz ở /teacher/exams/:id/play để mở phòng nhanh.' }));
app.post('/api/online-exam-room/join', (_req, res) =>
  res.status(501).json({ error: 'Join phòng online đang phát triển — học sinh có thể vào /play để join LIVE quiz qua mã số.' }));
app.post('/api/online-exam-room/:id/schedule', (_req, res) =>
  res.status(501).json({ error: 'Đặt lịch thi đang phát triển' }));
app.post('/api/online-exam-room/:id/schedule/activate', (_req, res) =>
  res.status(501).json({ error: 'Kích hoạt lịch thi đang phát triển' }));

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
  function getLPool() {
    if (!_lpool) {
      const DATABASE_URL = process.env.DATABASE_URL;
      if (!DATABASE_URL) throw new Error('DATABASE_URL env var not set');
      _lpool = new LPool({ connectionString: DATABASE_URL, max: 5,
        idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
    }
    return _lpool;
  }
  const LJWT_SECRET = process.env.JWT_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'dev-secret-fallback-change-in-production!!';

  function getLatexUserId(req) {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return null;
      const decoded = ljwt.verify(auth.slice(7), LJWT_SECRET);
      return decoded.sub || decoded.userId || null;
    } catch { return null; }
  }

  // GET /api/latex-projects → list all projects của user
  app.get('/api/latex-projects', async (req, res) => {
    try {
      const userId = getLatexUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { rows } = await getLPool().query(
        `SELECT id, "userId", title, "mainContent", "folderId", "createdAt", "updatedAt"
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
      const result = await extractQuestionsFromText(stripped, {
        subject: subject || 'Vật lí',
        grade: grade || '11',
        language: 'Vietnamese',
        count: Number(count) || 40,
      });
      const questions = result.questions || [];
      if (questions.length === 0) {
        return res.status(422).json({ error: 'Không trích xuất được câu hỏi nào từ tài liệu' });
      }

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
        console.log('[classes] ✅ tables ready');
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
        return res.json({ students: rows });
      } catch (err) {
        console.error('[classes:students:list] ❌', err.message);
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
        const now = new Date();
        for (const s of students) {
          const name = String(s.hoTen || s.name || '').trim();
          const mssv = String(s.maDinhDanh || s.mssv || '').trim();
          if (!name) { skipped++; continue; }
          try {
            // Upsert by (classId, mssv)
            const { rowCount } = await pool.query(
              `INSERT INTO "ClassStudent" (id, "classId", stt, mssv, name, dob, gender, "createdAt")
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               ON CONFLICT ("classId", mssv) DO UPDATE
                 SET name = EXCLUDED.name,
                     stt = EXCLUDED.stt,
                     dob = EXCLUDED.dob,
                     gender = EXCLUDED.gender`,
              [clsUUID(), req.params.id,
               s.stt ? Number(s.stt) : null,
               mssv || null, name,
               s.ngaySinh || s.dob || null,
               s.gioiTinh || s.gender || null,
               now]
            );
            if (rowCount > 0) inserted++;
          } catch (err) {
            console.warn(`[classes:import] skip "${name}": ${err.message.slice(0, 80)}`);
            skipped++;
          }
        }
        console.log(`[classes:import] ✅ class=${req.params.id.slice(0,8)} inserted=${inserted} updated=${updated} skipped=${skipped}`);
        return res.json({
          success: true,
          message: `Đã import ${inserted} học sinh${skipped ? ` (bỏ qua ${skipped})` : ''}`,
          results: { inserted, updated, skipped, total: students.length },
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

    // GET /api/courses — list public (paginated)
    app.get('/api/courses', async (req, res) => {
      const pool = getCPool();
      if (!pool) return res.json({ courses: [], total: 0 });
      try {
        const limit  = Math.min(parseInt(req.query.limit) || 24, 100);
        const offset = parseInt(req.query.offset) || 0;
        const { rows } = await pool.query(
          `SELECT c.*, u.name AS teacher_name
             FROM "Course" c
             LEFT JOIN "User" u ON u.id = c."userId"
            WHERE c."isPublished" = true
            ORDER BY c."createdAt" DESC
            LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        const items = rows.map(r => mapCourseRow(r, [], r.teacher_name || 'AeroEduVision'));
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
  // PATCH /api/profile (UI Settings update name/avatar/...) — stub trả ok
  app.get('/api/profile', (_req, res) => res.json({ profile: {} }));
  app.patch('/api/profile', okMsg);
  app.put('/api/profile', okMsg);

  // ─ Emotion ────────────────────────────────────────────────
  app.get('/api/emotion', (_req, res) => res.json({ records: [] }));
  app.get('/api/emotion/stats', (_req, res) => res.json({ stats: [], total: 0 }));
  // /api/plg/<id>, /api/xp/analyze/<id>
  app.get(/^\/api\/plg\/.+/, (_req, res) => res.json({ riskLevel: 0, factors: [] }));
  app.get(/^\/api\/xp\/analyze\/.+/, (_req, res) => res.json({ totalXp: 0, recent: [] }));

  // ─ Grading ────────────────────────────────────────────────
  app.get('/api/grading/answer-keys', (_req, res) => res.json({ keys: [] }));
  app.post('/api/grading/answer-keys', okMsg);
  app.get('/api/grading/graded-sheets', (_req, res) => res.json({ sheets: [] }));
  app.post('/api/grading/graded-sheets', okMsg);
  app.post('/api/grading/ocr', notImpl('OCR phiếu chấm đang phát triển'));

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
      try { userId = gjwt.verify(auth.slice(7), process.env.JWT_SECRET || 'dev-secret-fallback-change-in-production!!').sub; }
      catch { return res.status(401).json({ success: false, error: 'Invalid token' }); }
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
      try { userId = gjwt.verify(auth.slice(7), process.env.JWT_SECRET || 'dev-secret-fallback-change-in-production!!').sub; }
      catch { return res.status(401).json({ success: false, error: 'Invalid token' }); }

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
          const counts = topic.counts || {};
          for (const [diffKey, n] of Object.entries(counts)) {
            const need = Number(n) || 0;
            if (need <= 0) continue;
            const dbDiff = DIFF_MAP[diffKey] || 'medium';
            // Pick từ bank
            const qRes = await pool.query(
              `SELECT id FROM "Question"
                WHERE subject=$1 AND grade=$2 AND difficulty=$3 AND topic=$4 AND status='Hoạt động'
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
          return res.status(503).json({
            success: false,
            error: 'Không pick được câu nào (bank rỗng + AI fail). Hãy import câu vào ngân hàng trước.',
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
  app.get('/api/transcript/history', (_req, res) => res.json({ history: [] }));
  app.post('/api/transcript/save', okMsg);
  app.post('/api/transcript/local/transcribe', notImpl('Transcript đang phát triển'));
  app.post('/api/transcript/local/transcribe-stream', notImpl('Transcript đang phát triển'));
  app.post('/api/transcript/elevenlabs/transcribe', notImpl('Transcript đang phát triển'));
  app.post('/api/transcript/summarize', notImpl('Transcript summarize đang phát triển'));

  // ─ Camera / IoT ──────────────────────────────────────────
  app.get('/api/camera/recording', (_req, res) => res.json({ recordings: [] }));

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
