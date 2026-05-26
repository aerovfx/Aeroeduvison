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
  // Body: { email, password, name, role?: STUDENT|TEACHER, accountType?: STUDENT|TEACHER|PARENT }
  // role là enum DB (STUDENT/TEACHER); accountType là UI sub-type (PARENT chia chung TEACHER role).
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, role: roleInput, accountType: acctInput } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email và mật khẩu không được để trống' });
      }

      // Validate role — chỉ chấp nhận STUDENT hoặc TEACHER (ADMIN không tự đăng ký được)
      const allowedRoles = ['STUDENT', 'TEACHER'];
      const role = allowedRoles.includes(String(roleInput).toUpperCase())
        ? String(roleInput).toUpperCase()
        : 'STUDENT';  // default fallback

      // Validate accountType — UI sub-type lưu vào UserProfile.account_type
      const allowedAcct = ['STUDENT', 'TEACHER', 'PARENT'];
      const accountType = allowedAcct.includes(String(acctInput).toUpperCase())
        ? String(acctInput).toUpperCase()
        : role;  // fallback theo role

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
        [id, email.toLowerCase().trim(), displayName, hash, role, now, now]
      );

      // Lưu accountType vào UserProfile để PARENT bền qua thiết bị
      // (best-effort: bảng có thể chưa tồn tại — bọc try-catch)
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "UserProfile" (
            user_id      VARCHAR(255) PRIMARY KEY,
            account_type VARCHAR(20),
            data         JSONB DEFAULT '{}'::jsonb,
            updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        await pool.query(
          `INSERT INTO "UserProfile"(user_id, account_type, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET account_type = EXCLUDED.account_type, updated_at = NOW()`,
          [id, accountType]
        );
      } catch (e) {
        console.warn('[auth:register] UserProfile save failed:', e.message);
      }

      const { rows } = await pool.query('SELECT * FROM "User" WHERE id = $1', [id]);
      const user = rows[0];
      const token = issueToken(user);
      console.log(`[auth:register] ✅ ${user.email} role=${role} accountType=${accountType}`);
      return res.status(201).json({
        user: { ...publicUser(user), accountType },
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
  app.post('/api/teacher/quiz-extract', require('./lib/gating.cjs').requireFeature('quiz_extract'), async (req, res) => {
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

  // ── onDigestBind handler — wire khi user click deep-link Telegram ──
  async function onDigestBind({ chatId, userId, fromUser }) {
    try {
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT id, name, email FROM "User" WHERE id = $1`, [userId]
      );
      if (!rows.length) return { ok: false, error: 'Tài khoản không tồn tại' };
      const u = rows[0];
      // Upsert telegram_chat_id + auto-enable telegram channel
      await pool.query(`
        INSERT INTO "UserProfile"(user_id, telegram_chat_id, digest_channels, updated_at)
        VALUES ($1, $2, $3::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          telegram_chat_id = EXCLUDED.telegram_chat_id,
          digest_channels = COALESCE("UserProfile".digest_channels, '{}'::jsonb) || EXCLUDED.digest_channels,
          updated_at = NOW()
      `, [userId, String(chatId), JSON.stringify({ telegram: true })]);
      console.log(`[telegram:digest-bind] user=${userId} chat=${chatId} from=${fromUser?.username || '?'}`);
      return { ok: true, userName: u.name, email: u.email };
    } catch (e) {
      console.error('[telegram:digest-bind]', e.message);
      return { ok: false, error: e.message };
    }
  }

  // Long polling worker (chỉ cần khi không setWebhook)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_USE_WEBHOOK !== 'true') {
    tg.startPolling({ onCallback: onAdminCallback, onDigestBind });
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
      await tg.handleUpdate(req.body, { onCallback: onAdminCallback, onDigestBind });
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
// REMOVED stub /api/teacher/dashboard — real handler ở /api/teacher/dashboard/full (xem dưới)
//   FE Dashboard.tsx hiện gọi /api/teacher/students; ta thay bằng /dashboard/full
app.get('/api/teacher/modules', (_req, res) => res.json({ modules: [], total: 0 }));
app.get('/api/teacher/modules/public', (_req, res) => res.json({ modules: [], total: 0 }));
// REMOVED stub /api/teacher/my-students — shadow real handler line ~1911 (TSL)
app.get('/api/teacher/student-requests', (_req, res) => res.json({ requests: [], total: 0 }));
app.get('/api/teacher/sprints', (_req, res) => res.json({ sprints: [], total: 0 }));
// REMOVED stub /api/teacher/students — real handler dưới (đầy đủ metrics cho dashboard)
app.get('/api/teacher/leaderboard', (_req, res) => res.json({ teachers: [], total: 0 }));

// ── /api/teacher/dashboard + /api/teacher/dashboard/full + /api/teacher/students ──
// 1 IIFE gói chung 3 endpoints: simple dashboard counters, FULL dashboard với
// metrics chi tiết từng HS, và students list. Dùng TSL + ClassStudent merge.
//
// Per-student metrics tính từ:
//   - LessonHistory: totalXP (sum xp_reward), lessonsCompleted (count)
//   - PracticeExam: averageScore (AVG percentage), totalAttempts, last attempt
//   - PageView: lastActive (MAX), engagement (count last 7d)
//   - Streak: distinct DATE(created_at) consecutive from PageView
//
// atRisk = averageScore < 50% OR lastActive > 7 ngày
// excelling = averageScore >= 85% AND engagement >= 50
;(() => {
  function tAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  function _myIds(d) {
    return [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];
  }

  // Lấy danh sách HS của GV: merge ClassStudent (có user_id) + TSL approved
  async function _resolveTeacherStudentIds(pool, myIds) {
    // 1. TSL approved (HS đã connect)
    const { rows: tslRows } = await pool.query(`
      SELECT DISTINCT tsl.student_id, tsl.student_email
      FROM "TeacherStudentLink" tsl
      WHERE tsl.status = 'approved' AND tsl.teacher_id = ANY($1::text[])
        AND tsl.student_id IS NOT NULL
    `, [myIds]).catch(() => ({ rows: [] }));

    // 2. ClassStudent (HS GV import vào lớp — có thể có user_id hoặc không)
    const { rows: csRows } = await pool.query(`
      SELECT DISTINCT cs.user_id, cs.student_id, cs.ho_ten, cs.email, c.id AS class_id, c.name AS class_name
      FROM "Class" c
      JOIN "ClassStudent" cs ON cs.class_id = c.id
      WHERE c.teacher_id = ANY($1::text[])
    `, [myIds]).catch(() => ({ rows: [] }));

    const ids = new Set();
    const meta = new Map();  // id → { source, name?, email?, classes[] }
    for (const r of tslRows) {
      const id = r.student_id;
      ids.add(id);
      const m = meta.get(id) || { sources: new Set(), classes: [] };
      m.sources.add('tsl');
      m.email = m.email || r.student_email;
      meta.set(id, m);
    }
    for (const r of csRows) {
      const id = r.user_id || r.student_id;
      if (!id) continue;  // HS chưa có account → skip metrics (vẫn count totalStudents qua classCounter)
      ids.add(id);
      const m = meta.get(id) || { sources: new Set(), classes: [] };
      m.sources.add('class');
      m.name = m.name || r.ho_ten;
      m.email = m.email || r.email;
      m.classes.push({ id: r.class_id, name: r.class_name });
      meta.set(id, m);
    }
    return { ids: Array.from(ids), meta, csRows };
  }

  // Per-student metrics in 1 batch
  async function _batchStudentMetrics(pool, studentIds) {
    if (studentIds.length === 0) return new Map();
    const [xpR, examR, pvR, streakR] = await Promise.all([
      // totalXP + lessonsCompleted từ LessonHistory
      pool.query(`
        SELECT "userId" AS uid,
               COALESCE(SUM(xp_reward), 0)::int AS xp,
               COUNT(*)::int AS lessons,
               MAX(occurred_at) AS last_lesson
        FROM "LessonHistory"
        WHERE "userId" = ANY($1::text[])
        GROUP BY "userId"`, [studentIds]).catch(() => ({ rows: [] })),
      // PracticeExam aggregate
      pool.query(`
        SELECT "studentId" AS uid,
               COUNT(*)::int AS attempts,
               COUNT(*) FILTER (WHERE completed)::int AS completed_count,
               ROUND(AVG(NULLIF(percentage, 0)))::int AS avg_pct,
               MAX("completedAt") AS last_exam
        FROM "PracticeExam"
        WHERE "studentId" = ANY($1::text[])
        GROUP BY "studentId"`, [studentIds]).catch(() => ({ rows: [] })),
      // PageView engagement + last active
      pool.query(`
        SELECT user_id AS uid,
               MAX(created_at) AS last_active,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 day')::int AS pv_7d,
               COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 day')::int AS pv_30d
        FROM "PageView"
        WHERE user_id = ANY($1::text[])
        GROUP BY user_id`, [studentIds]).catch(() => ({ rows: [] })),
      // Streak: longest consecutive distinct dates from PageView 60d qua
      pool.query(`
        WITH days AS (
          SELECT user_id, DATE(created_at) AS d
          FROM "PageView"
          WHERE user_id = ANY($1::text[])
            AND created_at >= NOW() - INTERVAL '60 day'
          GROUP BY 1, 2
        ),
        ranked AS (
          SELECT user_id, d,
                 d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::int AS grp
          FROM days
        )
        SELECT user_id AS uid, MAX(c)::int AS streak FROM (
          SELECT user_id, grp, COUNT(*) AS c FROM ranked GROUP BY 1, 2
        ) g GROUP BY user_id`, [studentIds]).catch(() => ({ rows: [] })),
    ]);

    const metrics = new Map();
    for (const id of studentIds) {
      metrics.set(id, {
        xp: 0, lessons: 0, lastLesson: null,
        attempts: 0, completedCount: 0, avgPct: 0, lastExam: null,
        lastActive: null, pv7d: 0, pv30d: 0,
        streak: 0,
      });
    }
    for (const r of xpR.rows) { const m = metrics.get(r.uid); if (m) { m.xp = r.xp; m.lessons = r.lessons; m.lastLesson = r.last_lesson; } }
    for (const r of examR.rows) { const m = metrics.get(r.uid); if (m) { m.attempts = r.attempts; m.completedCount = r.completed_count; m.avgPct = r.avg_pct || 0; m.lastExam = r.last_exam; } }
    for (const r of pvR.rows) { const m = metrics.get(r.uid); if (m) { m.lastActive = r.last_active; m.pv7d = r.pv_7d; m.pv30d = r.pv_30d; } }
    for (const r of streakR.rows) { const m = metrics.get(r.uid); if (m) m.streak = r.streak; }
    return metrics;
  }

  // Format "X phút/giờ/ngày trước"
  function _relTimeVi(ts) {
    if (!ts) return 'Chưa hoạt động';
    const ms = Date.now() - new Date(ts).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    return `${d} ngày trước`;
  }

  // GET /api/teacher/dashboard — simple counters
  app.get('/api/teacher/dashboard', async (req, res) => {
    const decoded = tAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = _myIds(decoded);
      const [classesR, studentsR, examsR, asgnR] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM "Class" WHERE teacher_id = ANY($1::text[])`, [myIds]).catch(() => ({ rows: [{ n: 0 }] })),
        pool.query(`SELECT COUNT(DISTINCT student_id)::int AS n FROM "TeacherStudentLink" WHERE status = 'approved' AND teacher_id = ANY($1::text[])`, [myIds]).catch(() => ({ rows: [{ n: 0 }] })),
        pool.query(`SELECT COUNT(*)::int AS n FROM "Exam" WHERE teacher_id = ANY($1::text[]) OR "userId" = ANY($1::text[])`, [myIds]).catch(() => ({ rows: [{ n: 0 }] })),
        pool.query(`SELECT COUNT(*)::int AS n FROM "Assignment" WHERE teacher_id = ANY($1::text[])`, [myIds]).catch(() => ({ rows: [{ n: 0 }] })),
      ]);
      return res.json({
        classes: classesR.rows[0]?.n || 0,
        students: studentsR.rows[0]?.n || 0,
        exams: examsR.rows[0]?.n || 0,
        assignments: asgnR.rows[0]?.n || 0,
        pending_grading: 0,  // TODO: wire khi có AssignmentSubmission table
      });
    } catch (e) {
      console.error('[teacher:dashboard]', e.message);
      return res.json({ classes: 0, students: 0, exams: 0, assignments: 0, pending_grading: 0 });
    }
  });

  // GET /api/teacher/students — list HS thuộc lớp của GV với full metrics
  // Shape match Student interface trong FE Dashboard.tsx
  app.get('/api/teacher/students', async (req, res) => {
    const decoded = tAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = _myIds(decoded);
      const { ids: studentIds, meta } = await _resolveTeacherStudentIds(pool, myIds);

      if (studentIds.length === 0) {
        return res.json({ students: [], total: 0 });
      }

      // Fetch User info + metrics in parallel
      const [userR, metricsMap] = await Promise.all([
        pool.query(`
          SELECT id, name, email, image, role, "createdAt"
          FROM "User" WHERE id = ANY($1::text[]) OR LOWER(email) = ANY($2::text[])`,
          [studentIds, studentIds.map(x => String(x).toLowerCase())]).catch(() => ({ rows: [] })),
        _batchStudentMetrics(pool, studentIds),
      ]);

      const userById = new Map(userR.rows.map(u => [u.id, u]));
      const userByEmail = new Map(userR.rows.map(u => [String(u.email || '').toLowerCase(), u]));

      const students = studentIds.map(sid => {
        const m = metricsMap.get(sid) || {};
        const u = userById.get(sid) || userByEmail.get(String(sid).toLowerCase()) || {};
        const localMeta = meta.get(sid) || {};
        const avgPct = m.avgPct || 0;
        const lastActive = m.lastActive || m.lastLesson || m.lastExam;
        const daysSinceActive = lastActive
          ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (24 * 3600 * 1000))
          : 999;
        const atRisk = (avgPct > 0 && avgPct < 50) || daysSinceActive > 7;
        const excelling = avgPct >= 85 && (m.pv7d || 0) >= 5;
        const engagement = Math.min(100, Math.round(((m.pv7d || 0) / 50) * 100));
        const capability = avgPct;
        const motivation = Math.min(100, Math.round(((m.streak || 0) / 14) * 100 + engagement * 0.3));
        const progress = Math.min(100, Math.round((m.lessons || 0) * 4));  // proxy: 25 lessons = 100%
        const level = Math.max(1, Math.floor((m.xp || 0) / 1000) + 1);
        // Emotion proxy from engagement + score
        let emotion = 'neutral';
        if (atRisk) emotion = 'sad';
        else if (excelling) emotion = 'happy';
        else if (engagement > 60) emotion = 'focused';
        else if (avgPct > 0 && avgPct < 60) emotion = 'confused';

        return {
          id: sid,
          name: u.name || localMeta.name || (u.email || localMeta.email || 'Học sinh').split('@')[0],
          email: u.email || localMeta.email || '',
          image: u.image || null,
          totalXP: m.xp || 0,
          level,
          progress,
          averageScore: Math.round(avgPct / 10 * 10) / 10,  // 0-10 scale
          lessonsCompleted: m.lessons || 0,
          examAttempts: m.attempts || 0,
          lastActive: _relTimeVi(lastActive),
          lastActiveAt: lastActive,
          emotion,
          atRisk,
          excelling,
          engagement,
          streak: m.streak || 0,
          capability,
          motivation,
          classes: localMeta.classes || [],
        };
      });

      return res.json({ students, total: students.length });
    } catch (e) {
      console.error('[teacher:students]', e.message);
      return res.json({ students: [], total: 0 });
    }
  });

  // GET /api/teacher/dashboard/full — aggregated dashboard (students + stats + AI hints)
  app.get('/api/teacher/dashboard/full', async (req, res) => {
    const decoded = tAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = _myIds(decoded);
      const { ids: studentIds, csRows } = await _resolveTeacherStudentIds(pool, myIds);

      // Classes list
      const { rows: classes } = await pool.query(`
        SELECT c.id, c.name,
               (SELECT COUNT(*) FROM "ClassStudent" cs WHERE cs.class_id = c.id)::int AS student_count
        FROM "Class" c
        WHERE c.teacher_id = ANY($1::text[])
        ORDER BY c.created_at DESC LIMIT 50`, [myIds]).catch(() => ({ rows: [] }));

      // Fetch students với metrics (reuse logic từ /students)
      let students = [];
      if (studentIds.length > 0) {
        const [userR, metricsMap] = await Promise.all([
          pool.query(`
            SELECT id, name, email, image, role
            FROM "User" WHERE id = ANY($1::text[])`, [studentIds]).catch(() => ({ rows: [] })),
          _batchStudentMetrics(pool, studentIds),
        ]);
        const userById = new Map(userR.rows.map(u => [u.id, u]));
        students = studentIds.map(sid => {
          const m = metricsMap.get(sid) || {};
          const u = userById.get(sid) || {};
          const avgPct = m.avgPct || 0;
          const lastActive = m.lastActive || m.lastLesson || m.lastExam;
          const daysSinceActive = lastActive
            ? Math.floor((Date.now() - new Date(lastActive).getTime()) / (24 * 3600 * 1000))
            : 999;
          const atRisk = (avgPct > 0 && avgPct < 50) || daysSinceActive > 7;
          const excelling = avgPct >= 85 && (m.pv7d || 0) >= 5;
          const engagement = Math.min(100, Math.round(((m.pv7d || 0) / 50) * 100));
          let emotion = 'neutral';
          if (atRisk) emotion = 'sad';
          else if (excelling) emotion = 'happy';
          else if (engagement > 60) emotion = 'focused';
          else if (avgPct > 0 && avgPct < 60) emotion = 'confused';
          return {
            id: sid,
            name: u.name || (u.email || 'Học sinh').split('@')[0],
            email: u.email || '',
            image: u.image || null,
            totalXP: m.xp || 0,
            level: Math.max(1, Math.floor((m.xp || 0) / 1000) + 1),
            progress: Math.min(100, Math.round((m.lessons || 0) * 4)),
            averageScore: Math.round(avgPct / 10 * 10) / 10,
            lessonsCompleted: m.lessons || 0,
            examAttempts: m.attempts || 0,
            lastActive: _relTimeVi(lastActive),
            lastActiveAt: lastActive,
            emotion,
            atRisk, excelling,
            engagement,
            streak: m.streak || 0,
            capability: avgPct,
            motivation: Math.min(100, Math.round(((m.streak || 0) / 14) * 100 + engagement * 0.3)),
          };
        });
      }

      // Aggregate ClassStats
      const n = students.length || 1;
      const stats = students.length === 0 ? {
        totalStudents: csRows.length, classCount: classes.length,
        averageXP: 0, averageProgress: 0, averageScore: 0,
        averageEngagement: 0, averageCapability: 0,
        atRiskCount: 0, excellingCount: 0,
        totalLessonsCompleted: 0, totalExamAttempts: 0,
        activeToday: 0, activeThisWeek: 0,
      } : {
        totalStudents: students.length,
        classCount: classes.length,
        averageXP: Math.round(students.reduce((a, s) => a + s.totalXP, 0) / n),
        averageProgress: Math.round(students.reduce((a, s) => a + s.progress, 0) / n),
        averageScore: +(students.reduce((a, s) => a + s.averageScore, 0) / n).toFixed(1),
        averageEngagement: Math.round(students.reduce((a, s) => a + s.engagement, 0) / n),
        averageCapability: Math.round(students.reduce((a, s) => a + s.capability, 0) / n),
        atRiskCount: students.filter(s => s.atRisk).length,
        excellingCount: students.filter(s => s.excelling).length,
        totalLessonsCompleted: students.reduce((a, s) => a + s.lessonsCompleted, 0),
        totalExamAttempts: students.reduce((a, s) => a + s.examAttempts, 0),
        activeToday: students.filter(s => {
          if (!s.lastActiveAt) return false;
          return (Date.now() - new Date(s.lastActiveAt).getTime()) < 24 * 3600 * 1000;
        }).length,
        activeThisWeek: students.filter(s => {
          if (!s.lastActiveAt) return false;
          return (Date.now() - new Date(s.lastActiveAt).getTime()) < 7 * 24 * 3600 * 1000;
        }).length,
      };

      // Emotion distribution
      const emotionCounts = students.reduce((acc, s) => {
        acc[s.emotion] = (acc[s.emotion] || 0) + 1;
        return acc;
      }, {});

      // Top performers (top 5 by averageScore)
      const topPerformers = [...students]
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5)
        .map(s => ({ id: s.id, name: s.name, image: s.image, averageScore: s.averageScore, level: s.level }));

      // Need attention (atRisk students sorted by daysSinceActive)
      const needAttention = students
        .filter(s => s.atRisk)
        .sort((a, b) => (a.averageScore || 100) - (b.averageScore || 100))
        .slice(0, 5)
        .map(s => ({ id: s.id, name: s.name, image: s.image, averageScore: s.averageScore, lastActive: s.lastActive, engagement: s.engagement }));

      // Rule-based AI suggestions từ data thật
      const aiSuggestions = [];
      if (stats.atRiskCount > 0) {
        aiSuggestions.push({
          type: 'alert', severity: 'high',
          title: `${stats.atRiskCount} học sinh cần can thiệp`,
          desc: `Điểm TB <50% hoặc không hoạt động >7 ngày. Gửi tin nhắn hoặc lên lịch hỗ trợ riêng.`,
          action: 'view-at-risk',
        });
      }
      if (stats.activeToday === 0 && stats.totalStudents > 0) {
        aiSuggestions.push({
          type: 'warning', severity: 'medium',
          title: 'Không có HS nào hoạt động hôm nay',
          desc: 'Cân nhắc gửi bài tập mới hoặc thông báo nhắc nhở.',
          action: 'send-notification',
        });
      }
      if (stats.excellingCount > 0) {
        aiSuggestions.push({
          type: 'success', severity: 'info',
          title: `${stats.excellingCount} học sinh xuất sắc`,
          desc: `Điểm TB ≥85% và tương tác cao. Cân nhắc nâng độ khó hoặc thử thách thêm.`,
          action: 'view-top',
        });
      }
      if (stats.averageEngagement < 30 && stats.totalStudents > 0) {
        aiSuggestions.push({
          type: 'tip', severity: 'medium',
          title: 'Mức tương tác trung bình thấp',
          desc: `Engagement TB chỉ ${stats.averageEngagement}%. Thử bài tập tương tác, video ngắn, hoặc game học tập.`,
          action: 'browse-labs',
        });
      }
      if (stats.averageCapability >= 70) {
        aiSuggestions.push({
          type: 'success', severity: 'info',
          title: `Năng lực TB lớp đạt ${stats.averageCapability}%`,
          desc: 'Tốt hơn ngưỡng tốt nghiệp. Tiếp tục duy trì lộ trình hiện tại.',
        });
      }

      return res.json({
        students,
        stats,
        classes: classes.map(c => ({ id: c.id, name: c.name, studentCount: c.student_count })),
        emotionCounts,
        topPerformers,
        needAttention,
        aiSuggestions,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[teacher:dashboard:full]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });
})();

// /api/teacher/roster — merge ClassStudent (PII-safe, no maDinhDanh) + TSL-approved
// Shape: { students: RosterStudent[] } — match FE LearningPathBuilder
app.get('/api/teacher/roster', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let decoded;
  try { decoded = _akVerify(auth.slice(7)); }
  catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }

  try {
    const pool = _getPool();
    const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];

    // 1. HS từ Class → ClassStudent
    const { rows: classStuds } = await pool.query(`
      SELECT cs.id, cs.ho_ten AS "hoTen", cs.stt,
             c.id AS "classId", c.name AS "className"
      FROM "Class" c
      JOIN "ClassStudent" cs ON cs.class_id = c.id
      WHERE c.teacher_id = ANY($1::text[])
      ORDER BY c.name, cs.stt NULLS LAST, cs.ho_ten
      LIMIT 2000
    `, [myIds]).catch(() => ({ rows: [] }));

    // 2. HS đã kết nối TSL (approved)
    const { rows: tslStuds } = await pool.query(`
      SELECT tsl.student_id AS id, tsl.student_email AS "studentEmail",
             u.name, u.email, u.image
      FROM "TeacherStudentLink" tsl
      LEFT JOIN "User" u ON u.id = tsl.student_id
      WHERE tsl.status = 'approved' AND tsl.teacher_id = ANY($1::text[])
      LIMIT 1000
    `, [myIds]).catch(() => ({ rows: [] }));

    const byId = new Map();
    for (const r of classStuds) {
      if (!r.id) continue;
      const cur = byId.get(r.id) || {
        id: r.id, userId: null, name: r.hoTen || `HS ${r.stt || '?'}`,
        email: '', avatar: null, classNames: [], isLinked: false,
      };
      if (r.className && !cur.classNames.includes(r.className)) cur.classNames.push(r.className);
      byId.set(r.id, cur);
    }
    for (const r of tslStuds) {
      const id = r.id || `email:${r.studentEmail || ''}`;
      if (!id || id === 'email:') continue;
      const cur = byId.get(id) || {
        id, userId: r.id || null,
        name: r.name || r.email || r.studentEmail || `HS ${String(id).slice(0, 8)}`,
        email: r.email || r.studentEmail || '',
        avatar: r.image || null, classNames: [], isLinked: true,
      };
      cur.isLinked = true;
      if (r.name && cur.name.startsWith('HS ')) cur.name = r.name;
      if (r.email && !cur.email) cur.email = r.email;
      if (r.image && !cur.avatar) cur.avatar = r.image;
      byId.set(id, cur);
    }
    const students = Array.from(byId.values())
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
    return res.json({ students, total: students.length });
  } catch (e) {
    console.error('[teacher:roster]', e.message);
    return res.json({ students: [], total: 0 });
  }
});

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
// FIX 2026-05-24: schema mismatch — exam tạo qua quiz-publish/duplicate dùng
// "userId" camelCase (line 717, 863), exam tạo qua POST /api/teacher/exams
// dùng teacher_id snake_case (line 1390). Backfill chỉ chạy 1 lần lúc startup
// → exam tạo sau đó không được sync → 404 "Không tìm thấy đề".
// → COALESCE cả 2 column trong WHERE; "isPublic" + visibility cả 2 schema.
app.get('/api/teacher/exams/:id', async (req, res) => {
  const decoded = _kgAuth(req, res); if (!decoded) return;
  try {
    const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
    const pool = _getPool();

    // Try modern schema first (teacher_id + visibility)
    let rows = [];
    try {
      const r = await pool.query(
        `SELECT *,
                (COALESCE(teacher_id, "userId"::text) = ANY($2::text[])) AS is_owner
         FROM "Exam"
         WHERE id = $1 AND (
           teacher_id = ANY($2::text[])
           OR "userId" = ANY($2::text[])
           OR visibility = 'public'
           OR "isPublic" = true
         )`,
        [req.params.id, myIds]);
      rows = r.rows;
    } catch (e1) {
      // Một số legacy column có thể không tồn tại — fallback minimal query
      console.warn('[teacher:exams:get] modern query failed, fallback:', e1.message.slice(0, 100));
      const r = await pool.query(
        `SELECT *, (teacher_id = ANY($2::text[])) AS is_owner FROM "Exam"
         WHERE id = $1 AND (teacher_id = ANY($2::text[]) OR visibility = 'public')`,
        [req.params.id, myIds]);
      rows = r.rows;
    }

    if (!rows.length) {
      // Diagnostic: check xem exam có tồn tại không (giúp debug nhanh)
      const { rows: exists } = await pool.query(
        `SELECT id, teacher_id, "userId" FROM "Exam" WHERE id = $1 LIMIT 1`,
        [req.params.id]).catch(() => ({ rows: [] }));
      if (exists[0]) {
        console.log(`[teacher:exams:get] 403 — exam ${req.params.id} tồn tại nhưng owner = ${exists[0].teacher_id || exists[0].userId}, request from = ${myIds.join(',')}`);
        return res.status(403).json({ error: 'Đề thi này không thuộc về bạn (hoặc chưa public)' });
      }
      return res.status(404).json({ error: 'Không tìm thấy đề (hoặc không có quyền)' });
    }

    // Backfill teacher_id nếu chỉ có "userId" — để các handler khác hoạt động
    const r0 = rows[0];
    if (!r0.teacher_id && r0.userId) {
      pool.query(`UPDATE "Exam" SET teacher_id = $1 WHERE id = $2 AND teacher_id IS NULL`,
        [String(r0.userId), req.params.id])
        .catch(() => {/* silent */});
      r0.teacher_id = r0.userId;
    }
    const r = rows[0];
    const settings = r.settings || {};
    let qIds = Array.isArray(r.question_ids) ? r.question_ids : [];
    const pointsMap = settings.pointsMap || {};

    // Legacy schema fallback: exam tạo qua quiz-publish/duplicate dùng
    // ExamQuestion join table thay vì question_ids JSONB → load từ đó
    let legacyPoints = {};
    if (qIds.length === 0) {
      try {
        const { rows: eqRows } = await pool.query(
          `SELECT "questionId", "order", points
           FROM "ExamQuestion"
           WHERE "examId" = $1
           ORDER BY "order" ASC NULLS LAST`, [req.params.id]);
        qIds = eqRows.map(eq => eq.questionId).filter(Boolean);
        for (const eq of eqRows) legacyPoints[eq.questionId] = Number(eq.points) || 1;
      } catch { /* không có ExamQuestion → bỏ qua */ }
    }

    // Hydrate question rows — fallback giữa 2 schema (snake_case mới + camelCase legacy)
    let questions = [];
    if (qIds.length > 0) {
      const { rows: qRows } = await pool.query(
        `SELECT id, content,
                COALESCE(type, "questionType") AS type,
                COALESCE(subject, '') AS subject,
                COALESCE(grade, '') AS grade,
                COALESCE(chapter, topic) AS chapter,
                difficulty,
                options,
                COALESCE(answer, "correctAnswer") AS answer,
                explanation, tags,
                COALESCE(created_at, "createdAt") AS created_at,
                COALESCE(updated_at, "updatedAt") AS updated_at
         FROM "Question" WHERE id = ANY($1::text[])`,
        [qIds.map(String)]).catch(async () => {
          // Nếu camelCase không tồn tại → fallback chỉ snake_case
          const { rows } = await pool.query(
            `SELECT id, content, type, subject, grade, chapter, difficulty,
                    options, answer, explanation, tags, created_at, updated_at
             FROM "Question" WHERE id = ANY($1::text[])`,
            [qIds.map(String)]);
          return { rows };
        });
      const byId = new Map(qRows.map(q => [q.id, q]));
      questions = qIds.map((qid, idx) => {
        const q = byId.get(String(qid));
        if (!q) return null;
        const pts = pointsMap[q.id] != null ? Number(pointsMap[q.id])
                  : legacyPoints[q.id] != null ? Number(legacyPoints[q.id])
                  : 1;
        return {
          id: q.id, order: idx + 1, points: pts,
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
        grade: r.grade,
        examType: settings.examType || r.examType || 'Trắc nghiệm',
        // Fallback duration/totalPoints giữa 2 schema (snake mới ↔ camel legacy)
        duration: r.duration_min || r.duration || 45,
        totalPoints: r.total_points || r.totalScore || 10,
        totalQuestions: qIds.length || r.totalQuestions || 0,
        status: r.status, sourceType: settings.sourceType,
        passingScore: settings.passingScore, shuffle: settings.shuffle,
        questionIds: qIds,
        answerKey: settings.answerKey || [],
        visibility: r.visibility || (r.isPublic ? 'public' : 'private'),
        isOwner: !!r.is_owner,
        teacherId: r.teacher_id || r.userId || null,
        createdAt: r.created_at || r.createdAt,
        updatedAt: r.updated_at || r.updatedAt,
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

// ── Online Exam Room CRUD ─────────────────────────────────────
// Phòng thi online thời gian thực — GV tạo, HS join bằng access code.
;(() => {
  async function _ensureOnlineRoomTable() {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "OnlineExamRoom" (
        id            VARCHAR(36)  PRIMARY KEY,
        teacher_id    VARCHAR(255) NOT NULL,
        exam_id       VARCHAR(36),
        name          VARCHAR(500) NOT NULL DEFAULT 'Phòng thi mới',
        description   TEXT,
        status        VARCHAR(20)  DEFAULT 'draft',
        start_time    TIMESTAMPTZ,
        end_time      TIMESTAMPTZ,
        duration      INTEGER      DEFAULT 45,
        access_code   VARCHAR(20),
        is_public     BOOLEAN      DEFAULT false,
        max_students  INTEGER,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('OnlineExamRoom', [
      ['teacher_id', "VARCHAR(255)"], ['exam_id', "VARCHAR(36)"],
      ['name', "VARCHAR(500)"], ['description', "TEXT"],
      ['status', "VARCHAR(20) DEFAULT 'draft'"],
      ['start_time', "TIMESTAMPTZ"], ['end_time', "TIMESTAMPTZ"],
      ['duration', "INTEGER DEFAULT 45"], ['access_code', "VARCHAR(20)"],
      ['is_public', "BOOLEAN DEFAULT false"], ['max_students', "INTEGER"],
      ['created_at', "TIMESTAMPTZ DEFAULT NOW()"], ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('OnlineExamRoom', ['teacherId','examId','name','description','status','startTime','endTime','duration','accessCode','isPublic','maxStudents','createdAt','updatedAt','userId','ownerId']);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_room_teacher ON "OnlineExamRoom"(teacher_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_room_access_code ON "OnlineExamRoom"(access_code)`);
  }
  _ensureOnlineRoomTable().catch(e => console.error('[online-exam-room] migration:', e.message));

  function roomAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }

  function roomRow(r) {
    return {
      id: r.id, name: r.name, description: r.description,
      status: r.status || 'draft',
      startTime: r.start_time, endTime: r.end_time,
      duration: r.duration || 45,
      accessCode: r.access_code, isPublic: !!r.is_public,
      maxStudents: r.max_students,
      examId: r.exam_id,
      _count: { participants: 0, questions: 0 },
    };
  }

  // GET /api/online-exam-room — list rooms GV tạo
  app.get('/api/online-exam-room', async (req, res) => {
    const decoded = roomAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT * FROM "OnlineExamRoom" WHERE teacher_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [decoded.userId || decoded.id || decoded.sub]);
      return res.json({ rooms: rows.map(roomRow), total: rows.length });
    } catch (e) { console.error('[room:list]', e.message); return res.json({ rooms: [], total: 0 }); }
  });

  // POST /api/online-exam-room — tạo phòng
  app.post('/api/online-exam-room', async (req, res) => {
    const decoded = roomAuth(req, res); if (!decoded) return;
    try {
      const b = req.body || {};
      const userId = decoded.userId || decoded.id || decoded.sub;
      const { randomUUID, randomBytes } = require('crypto');
      const id = randomUUID();
      const accessCode = (b.accessCode || randomBytes(3).toString('hex')).toUpperCase();
      const pool = _getPool();
      const { rows } = await pool.query(`
        INSERT INTO "OnlineExamRoom"(id, teacher_id, exam_id, name, description, status,
          start_time, end_time, duration, access_code, is_public, max_students)
        VALUES ($1::text,$2::text,$3,$4::text,$5,$6::text,$7,$8,$9,$10::text,$11,$12)
        RETURNING *`,
        [id, userId, b.examId || null, String(b.name || 'Phòng thi mới').slice(0, 500),
         b.description || null, b.status || 'draft',
         b.startTime || null, b.endTime || null, Number(b.duration) || 45,
         accessCode, !!b.isPublic, b.maxStudents || null]);
      return res.json({ room: roomRow(rows[0]) });
    } catch (e) { console.error('[room:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo phòng thi' }); }
  });

  // GET /api/online-exam-room/:id
  app.get('/api/online-exam-room/:id', async (req, res) => {
    const decoded = roomAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT * FROM "OnlineExamRoom" WHERE id = $1`,
        [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy phòng' });
      return res.json({ room: roomRow(rows[0]) });
    } catch (e) { console.error('[room:get]', e.message); return res.status(500).json({ error: 'Lỗi tải phòng' }); }
  });

  // PUT /api/online-exam-room/:id — update (status, etc)
  app.put('/api/online-exam-room/:id', async (req, res) => {
    const decoded = roomAuth(req, res); if (!decoded) return;
    try {
      const b = req.body || {};
      const userId = decoded.userId || decoded.id || decoded.sub;
      const updates = ['updated_at = NOW()'];
      const params = [req.params.id, userId];
      const map = { name: 'name', description: 'description', status: 'status',
                    examId: 'exam_id', startTime: 'start_time', endTime: 'end_time',
                    duration: 'duration', isPublic: 'is_public', maxStudents: 'max_students' };
      for (const [k, col] of Object.entries(map)) {
        if (b[k] !== undefined) { params.push(b[k]); updates.push(`${col} = $${params.length}`); }
      }
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `UPDATE "OnlineExamRoom" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = $2`,
        params);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy phòng (hoặc không phải chủ)' });
      return res.json({ ok: true });
    } catch (e) { console.error('[room:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật phòng' }); }
  });

  // DELETE /api/online-exam-room/:id
  app.delete('/api/online-exam-room/:id', async (req, res) => {
    const decoded = roomAuth(req, res); if (!decoded) return;
    try {
      const userId = decoded.userId || decoded.id || decoded.sub;
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "OnlineExamRoom" WHERE id = $1 AND teacher_id = $2`,
        [req.params.id, userId]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy phòng' });
      return res.json({ ok: true });
    } catch (e) { console.error('[room:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá phòng' }); }
  });

  // GET /api/online-exam-room/:id/schedule — schedule (stub empty)
  app.get('/api/online-exam-room/:id/schedule', (_req, res) =>
    res.json({ schedules: [], total: 0 }));

  // POST /api/online-exam-room/join — HS/GV join bằng accessCode hoặc roomId
  app.post('/api/online-exam-room/join', async (req, res) => {
    const decoded = roomAuth(req, res); if (!decoded) return;
    try {
      const { accessCode, roomId } = req.body || {};
      const pool = _getPool();
      let row;
      if (roomId) {
        const r = await pool.query(`SELECT id FROM "OnlineExamRoom" WHERE id = $1`, [roomId]);
        row = r.rows[0];
      } else if (accessCode) {
        const r = await pool.query(`SELECT id FROM "OnlineExamRoom" WHERE access_code = $1`,
          [String(accessCode).toUpperCase()]);
        row = r.rows[0];
      }
      if (!row) return res.status(404).json({ error: 'Mã phòng không hợp lệ' });
      return res.json({ ok: true, roomId: row.id });
    } catch (e) { console.error('[room:join]', e.message); return res.status(500).json({ error: 'Lỗi join phòng' }); }
  });
})();

// ── Teacher-Student Link (kết nối GV-HS) — TRƯỚC proxy teacher-service ──
;(() => {
  async function _ensureTSLTable() {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TeacherStudentLink" (
        id          VARCHAR(36)  PRIMARY KEY,
        teacher_id  VARCHAR(255) NOT NULL,
        student_id  VARCHAR(255),
        student_email VARCHAR(255),
        status      VARCHAR(20)  DEFAULT 'pending',
        direction   VARCHAR(20)  DEFAULT 'teacher_invites',
        message     TEXT,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('TeacherStudentLink', [
      ['teacher_id', "VARCHAR(255)"], ['student_id', "VARCHAR(255)"],
      ['student_email', "VARCHAR(255)"], ['status', "VARCHAR(20) DEFAULT 'pending'"],
      ['direction', "VARCHAR(20) DEFAULT 'teacher_invites'"], ['message', "TEXT"],
      ['created_at', "TIMESTAMPTZ DEFAULT NOW()"], ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
      ['approved_at', "TIMESTAMPTZ"], ['rejected_at', "TIMESTAMPTZ"],
    ]);
    await _dropLegacyNotNull('TeacherStudentLink', [
      'teacherId','studentId','studentEmail','status','direction','message',
      'createdAt','updatedAt','initiatedBy','initiatorId','approvedAt','rejectedAt',
      'requesterId','recipientId','linkType','grade','subject','classId',
    ]);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tsl_teacher ON "TeacherStudentLink"(teacher_id, status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tsl_student ON "TeacherStudentLink"(student_id, status)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TeacherInviteLink" (
        token       VARCHAR(64)  PRIMARY KEY,
        teacher_id  VARCHAR(255) NOT NULL,
        label       VARCHAR(200),
        max_uses    INTEGER,
        used_count  INTEGER      DEFAULT 0,
        expires_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('TeacherInviteLink', [
      ['teacher_id', "VARCHAR(255)"], ['label', "VARCHAR(200)"],
      ['max_uses', "INTEGER"], ['used_count', "INTEGER DEFAULT 0"],
      ['expires_at', "TIMESTAMPTZ"], ['created_at', "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('TeacherInviteLink', ['teacherId','label','maxUses','usedCount','expiresAt','createdAt']);
  }
  _ensureTSLTable().catch(e => console.error('[tsl] migration:', e.message));

  function tslAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  const _ids = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

  // GET /api/teacher-student-link/pending → { incoming, outgoing }
  // Enrich với JOIN User để FE có otherName/otherEmail/otherImage hiển thị
  // (FE TeacherStudentLink interface expect các field này, không có → render rỗng)
  //
  // Vai trò teacher/student dùng để xác định ai là "other":
  //   GV ở /teacher/student-requests → "other" = student (JOIN student_id)
  //   HS ở /student/my-teachers      → "other" = teacher (JOIN teacher_id)
  // Endpoint này serve cả 2 vai trò: filter teacher_id = myIds (GV) hoặc
  // student_id = myIds (HS) tuỳ direction.
  app.get('/api/teacher-student-link/pending', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const myIds = _ids(decoded);
      const pool = _getPool();
      // Incoming: yêu cầu chờ tôi (myIds) duyệt
      //   - GV: student_requests + teacher_id = myIds (HS yêu cầu vào lớp)
      //   - HS: teacher_invites + student_id = myIds (GV mời HS)
      const { rows: incoming } = await pool.query(`
        SELECT tsl.id, tsl.teacher_id AS "teacherId", tsl.student_id AS "studentId",
               tsl.status, tsl.direction, tsl.message,
               tsl.created_at AS "createdAt",
               tsl.approved_at AS "approvedAt", tsl.rejected_at AS "rejectedAt",
               CASE tsl.direction
                 WHEN 'student_requests' THEN 'student'
                 WHEN 'teacher_invites'  THEN 'teacher'
                 ELSE 'auto'
               END AS "initiatedBy",
               COALESCE(us.email, tsl.student_email) AS "otherEmail",
               us.name AS "otherName", us.image AS "otherImage"
        FROM "TeacherStudentLink" tsl
        LEFT JOIN "User" us ON us.id = tsl.student_id
        LEFT JOIN "User" ut ON ut.id = tsl.teacher_id
        WHERE tsl.status = 'pending' AND (
          (tsl.direction = 'student_requests' AND tsl.teacher_id = ANY($1::text[]))
          OR (tsl.direction = 'teacher_invites' AND tsl.student_id = ANY($1::text[]))
        )
        ORDER BY tsl.created_at DESC
      `, [myIds]).catch(() => ({ rows: [] }));

      // Outgoing: yêu cầu TÔI đã gửi đang chờ đối phương duyệt
      //   - GV: teacher_invites + teacher_id = myIds (GV mời HS, HS chưa duyệt)
      //   - HS: student_requests + student_id = myIds (HS xin GV, GV chưa duyệt)
      const { rows: outgoing } = await pool.query(`
        SELECT tsl.id, tsl.teacher_id AS "teacherId", tsl.student_id AS "studentId",
               tsl.status, tsl.direction, tsl.message,
               tsl.created_at AS "createdAt",
               tsl.approved_at AS "approvedAt", tsl.rejected_at AS "rejectedAt",
               CASE tsl.direction
                 WHEN 'student_requests' THEN 'student'
                 WHEN 'teacher_invites'  THEN 'teacher'
                 ELSE 'auto'
               END AS "initiatedBy",
               -- otherEmail/Name tuỳ vai trò:
               CASE
                 WHEN tsl.direction = 'teacher_invites' THEN COALESCE(us.email, tsl.student_email)
                 ELSE ut.email
               END AS "otherEmail",
               CASE
                 WHEN tsl.direction = 'teacher_invites' THEN us.name
                 ELSE ut.name
               END AS "otherName",
               CASE
                 WHEN tsl.direction = 'teacher_invites' THEN us.image
                 ELSE ut.image
               END AS "otherImage"
        FROM "TeacherStudentLink" tsl
        LEFT JOIN "User" us ON us.id = tsl.student_id
        LEFT JOIN "User" ut ON ut.id = tsl.teacher_id
        WHERE tsl.status = 'pending' AND (
          (tsl.direction = 'teacher_invites' AND tsl.teacher_id = ANY($1::text[]))
          OR (tsl.direction = 'student_requests' AND tsl.student_id = ANY($1::text[]))
        )
        ORDER BY tsl.created_at DESC
      `, [myIds]).catch(() => ({ rows: [] }));

      return res.json({ incoming, outgoing });
    } catch (e) {
      console.error('[tsl:pending]', e.message);
      return res.json({ incoming: [], outgoing: [] });
    }
  });

  // GET /api/teacher/my-students — list HS đã approved
  // Shape LinkedUser (teacherStudentLink.service.ts):
  //   { linkId, initiatedBy, approvedAt, id, email, name, image }
  app.get('/api/teacher/my-students', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const myIds = _ids(decoded);
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT tsl.id AS link_id, tsl.student_id, tsl.student_email,
               tsl.created_at, tsl.approved_at, tsl.direction,
               u.name, u.email, u.image, u.role
        FROM "TeacherStudentLink" tsl
        LEFT JOIN "User" u ON u.id = tsl.student_id
        WHERE tsl.status = 'approved' AND tsl.teacher_id = ANY($1::text[])
        ORDER BY tsl.approved_at DESC NULLS LAST, tsl.created_at DESC LIMIT 500`, [myIds]);
      const students = rows.map(r => ({
        id: r.student_id,
        linkId: r.link_id,
        email: r.email || r.student_email,
        name: r.name || (r.student_email ? r.student_email.split('@')[0] : '(Chưa tên)'),
        image: r.image,
        role: r.role || 'STUDENT',
        initiatedBy: r.direction === 'student_requests' ? 'student'
                    : r.direction === 'teacher_invites' ? 'teacher'
                    : 'auto',
        approvedAt: r.approved_at || r.created_at,
        linkedAt: r.approved_at || r.created_at,
      }));
      return res.json({ students, total: students.length });
    } catch (e) { console.error('[tsl:my-students]', e.message); return res.json({ students: [], total: 0 }); }
  });

  // POST /api/teacher-student-link/request — HS request kết nối GV
  // Chấp nhận teacherId HOẶC teacherEmail (FE MyTeachers card click gửi teacherId)
  app.post('/api/teacher-student-link/request', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    const myId = decoded.userId || decoded.id || decoded.sub;
    try {
      const { teacherId, teacherEmail, message } = req.body || {};
      if (!teacherId && !teacherEmail) {
        return res.status(400).json({ error: 'Thiếu teacherId hoặc teacherEmail' });
      }
      const pool = _getPool();
      // Resolve teacher từ id HOẶC email
      let teacherRow = null;
      if (teacherId) {
        const { rows } = await pool.query(
          `SELECT id, name, email FROM "User" WHERE id = $1 AND role IN ('TEACHER','ADMIN') LIMIT 1`,
          [String(teacherId)]);
        teacherRow = rows[0] || null;
      }
      if (!teacherRow && teacherEmail) {
        const { rows } = await pool.query(
          `SELECT id, name, email FROM "User" WHERE LOWER(email) = $1 AND role IN ('TEACHER','ADMIN') LIMIT 1`,
          [String(teacherEmail).toLowerCase().trim()]);
        teacherRow = rows[0] || null;
      }
      if (!teacherRow) return res.status(404).json({ error: 'Không tìm thấy GV' });
      // Self-link check
      if (teacherRow.id === myId) {
        return res.status(400).json({ error: 'Không thể kết nối với chính mình' });
      }
      // Check duplicate pending request
      const { rows: existing } = await pool.query(`
        SELECT id, status FROM "TeacherStudentLink"
        WHERE teacher_id = $1 AND student_id = $2 AND status IN ('pending', 'approved')
        LIMIT 1
      `, [teacherRow.id, myId]);
      if (existing[0]) {
        const msg = existing[0].status === 'approved' ? 'Đã kết nối với GV này' : 'Đã gửi yêu cầu trước đó (đang chờ duyệt)';
        return res.status(409).json({ error: msg, linkId: existing[0].id });
      }
      const { randomUUID } = require('crypto');
      const linkId = randomUUID();
      await pool.query(`
        INSERT INTO "TeacherStudentLink"(id, teacher_id, student_id, status, direction, message)
        VALUES ($1, $2, $3, 'pending', 'student_requests', $4)`,
        [linkId, teacherRow.id, myId, message || null]);
      return res.json({ ok: true, linkId, teacherName: teacherRow.name });
    } catch (e) { console.error('[tsl:request]', e.message); return res.status(500).json({ error: 'Lỗi gửi yêu cầu' }); }
  });

  // POST /api/teacher-student-link/invite — GV mời HS (email)
  app.post('/api/teacher-student-link/invite', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    const myId = decoded.userId || decoded.id || decoded.sub;
    try {
      const { studentId, studentEmail, message } = req.body || {};
      if (!studentId && !studentEmail) {
        return res.status(400).json({ error: 'Thiếu studentId hoặc studentEmail' });
      }
      const pool = _getPool();
      // Resolve student từ id HOẶC email
      let studentRow = null;
      if (studentId) {
        const { rows } = await pool.query(
          `SELECT id, email FROM "User" WHERE id = $1 LIMIT 1`, [String(studentId)]);
        studentRow = rows[0] || null;
      }
      if (!studentRow && studentEmail) {
        const { rows } = await pool.query(
          `SELECT id, email FROM "User" WHERE LOWER(email) = $1 LIMIT 1`,
          [String(studentEmail).toLowerCase().trim()]);
        studentRow = rows[0] || null;
      }
      const finalStudentId = studentRow?.id || null;
      const finalStudentEmail = studentRow?.email || (studentEmail ? String(studentEmail).toLowerCase().trim() : null);
      // Self-invite check
      if (finalStudentId === myId) {
        return res.status(400).json({ error: 'Không thể mời chính mình' });
      }
      // Check duplicate (chỉ check khi có studentId để khớp PK)
      if (finalStudentId) {
        const { rows: existing } = await pool.query(`
          SELECT id, status FROM "TeacherStudentLink"
          WHERE teacher_id = $1 AND student_id = $2 AND status IN ('pending', 'approved') LIMIT 1
        `, [myId, finalStudentId]);
        if (existing[0]) {
          const msg = existing[0].status === 'approved' ? 'HS đã kết nối' : 'Đã mời HS này (đang chờ)';
          return res.status(409).json({ error: msg, linkId: existing[0].id });
        }
      }
      const { randomUUID } = require('crypto');
      const linkId = randomUUID();
      await pool.query(`
        INSERT INTO "TeacherStudentLink"(id, teacher_id, student_id, student_email, status, direction, message)
        VALUES ($1, $2, $3, $4, 'pending', 'teacher_invites', $5)`,
        [linkId, myId, finalStudentId, finalStudentEmail, message || null]);
      return res.json({ ok: true, linkId });
    } catch (e) { console.error('[tsl:invite]', e.message); return res.status(500).json({ error: 'Lỗi mời HS' }); }
  });

  // POST /api/teacher-student-link/:id/approve
  app.post('/api/teacher-student-link/:id/approve', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const myIds = _ids(decoded);
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `UPDATE "TeacherStudentLink"
         SET status = 'approved', approved_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND (teacher_id = ANY($2::text[]) OR student_id = ANY($2::text[]))`,
        [req.params.id, myIds]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (e) { console.error('[tsl:approve]', e.message); return res.status(500).json({ error: 'Lỗi duyệt' }); }
  });

  // POST /api/teacher-student-link/:id/reject
  app.post('/api/teacher-student-link/:id/reject', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const myIds = _ids(decoded);
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `UPDATE "TeacherStudentLink"
         SET status = 'rejected', rejected_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND (teacher_id = ANY($2::text[]) OR student_id = ANY($2::text[]))`,
        [req.params.id, myIds]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (e) { console.error('[tsl:reject]', e.message); return res.status(500).json({ error: 'Lỗi từ chối' }); }
  });

  // DELETE /api/teacher-student-link/:id — unlink
  app.delete('/api/teacher-student-link/:id', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const myIds = _ids(decoded);
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "TeacherStudentLink"
         WHERE id = $1 AND (teacher_id = ANY($2::text[]) OR student_id = ANY($2::text[]))`,
        [req.params.id, myIds]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (e) { console.error('[tsl:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá' }); }
  });

  // GET /api/users/search?q=...&role=STUDENT
  app.get('/api/users/search', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const q = String(req.query.q || '').trim();
      const role = req.query.role;
      if (q.length < 2) return res.json({ users: [] });
      const pool = _getPool();
      const params = [`%${q.toLowerCase()}%`];
      let where = `(LOWER(email) LIKE $1 OR LOWER(name) LIKE $1)`;
      if (role) { params.push(role); where += ` AND role = $${params.length}`; }
      const { rows } = await pool.query(
        `SELECT id, email, name, role, image FROM "User" WHERE ${where} LIMIT 20`, params);
      return res.json({ users: rows });
    } catch (e) { console.error('[users:search]', e.message); return res.json({ users: [] }); }
  });

  // ── Invite Link ────────────────────────────────────
  // POST /api/teacher-student-link/invite-link/create
  app.post('/api/teacher-student-link/invite-link/create', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    const myId = decoded.userId || decoded.id || decoded.sub;
    try {
      const { label, maxUses, expiresInDays } = req.body || {};
      const { randomBytes } = require('crypto');
      const token = randomBytes(16).toString('hex');
      const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400_000) : null;
      const pool = _getPool();
      await pool.query(`
        INSERT INTO "TeacherInviteLink"(token, teacher_id, label, max_uses, expires_at)
        VALUES ($1, $2, $3, $4, $5)`,
        [token, myId, label || null, maxUses ? Number(maxUses) : null, expiresAt]);
      const url = `https://inphysic.com/teacher-invite/${token}`;
      return res.json({ token, url, label: label || null, maxUses: maxUses || null, expiresAt });
    } catch (e) { console.error('[tsl:link-create]', e.message); return res.status(500).json({ error: 'Lỗi tạo link mời' }); }
  });

  // GET /api/teacher-student-link/invite-link/list
  app.get('/api/teacher-student-link/invite-link/list', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const myIds = _ids(decoded);
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT token, label, max_uses AS "maxUses", used_count AS "usedCount",
                expires_at AS "expiresAt", created_at AS "createdAt"
         FROM "TeacherInviteLink" WHERE teacher_id = ANY($1::text[]) ORDER BY created_at DESC LIMIT 50`,
        [myIds]);
      const links = rows.map(r => ({ ...r, url: `https://inphysic.com/teacher-invite/${r.token}` }));
      return res.json({ links });
    } catch (e) { console.error('[tsl:link-list]', e.message); return res.json({ links: [] }); }
  });

  // DELETE /api/teacher-student-link/invite-link/:token
  app.delete('/api/teacher-student-link/invite-link/:token', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    try {
      const myIds = _ids(decoded);
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "TeacherInviteLink" WHERE token = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.token, myIds]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json({ ok: true });
    } catch (e) { console.error('[tsl:link-delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá link' }); }
  });

  // GET /api/teacher-student-link/invite-link/:token/info — public, không cần auth
  app.get('/api/teacher-student-link/invite-link/:token/info', async (req, res) => {
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT til.label, til.max_uses AS "maxUses", til.used_count AS "usedCount",
               til.expires_at AS "expiresAt", u.name AS "teacherName", u.email AS "teacherEmail", u.image AS "teacherImage"
        FROM "TeacherInviteLink" til
        LEFT JOIN "User" u ON u.id = til.teacher_id
        WHERE til.token = $1`, [req.params.token]);
      if (!rows.length) return res.status(404).json({ error: 'Link không hợp lệ' });
      const r = rows[0];
      const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
      const full = r.maxUses && r.usedCount >= r.maxUses;
      if (expired) return res.status(410).json({ error: 'Link đã hết hạn' });
      if (full) return res.status(410).json({ error: 'Link đã đạt giới hạn sử dụng' });
      return res.json({
        teacher: { name: r.teacherName, email: r.teacherEmail, image: r.teacherImage },
        label: r.label, maxUses: r.maxUses, usedCount: r.usedCount, expiresAt: r.expiresAt,
      });
    } catch (e) { console.error('[tsl:link-info]', e.message); return res.status(500).json({ error: 'Lỗi tải link' }); }
  });

  // POST /api/teacher-student-link/invite-link/:token/join
  app.post('/api/teacher-student-link/invite-link/:token/join', async (req, res) => {
    const decoded = tslAuth(req, res); if (!decoded) return;
    const myId = decoded.userId || decoded.id || decoded.sub;
    try {
      const pool = _getPool();
      const { rows: links } = await pool.query(
        `SELECT * FROM "TeacherInviteLink" WHERE token = $1`, [req.params.token]);
      if (!links.length) return res.status(404).json({ error: 'Link không hợp lệ' });
      const link = links[0];
      if (link.expires_at && new Date(link.expires_at) < new Date()) return res.status(410).json({ error: 'Link đã hết hạn' });
      if (link.max_uses && link.used_count >= link.max_uses) return res.status(410).json({ error: 'Link đã đạt giới hạn' });
      // Tạo link approved ngay (HS click vào → tự động kết nối)
      const { randomUUID } = require('crypto');
      const linkId = randomUUID();
      await pool.query(`
        INSERT INTO "TeacherStudentLink"(id, teacher_id, student_id, status, direction)
        VALUES ($1, $2, $3, 'approved', 'student_requests')`,
        [linkId, link.teacher_id, myId]);
      await pool.query(`UPDATE "TeacherInviteLink" SET used_count = used_count + 1 WHERE token = $1`, [req.params.token]);
      return res.json({ ok: true, status: 'approved', linkId, message: 'Đã kết nối thành công với GV.' });
    } catch (e) { console.error('[tsl:link-join]', e.message); return res.status(500).json({ error: 'Lỗi kết nối' }); }
  });
})();

// ── Lesson Plans CRUD — TRƯỚC proxy teacher-service ──
// Bảng "LessonPlan" được migrate ở section riêng (line ~6582).
// Handlers ở đây để Express match trước proxy /api/teacher/*.
;(() => {
  function lpAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  function lpRow(r) {
    return {
      id: r.id, title: r.title, subject: r.subject, grade: r.grade,
      tags: r.tags || [], wordCount: r.word_count || 0,
      isArchived: !!r.is_archived,
      format: r.format || 'html', latexProjectId: r.latex_project_id,
      gcsBackupUrl: r.gcs_backup_url, gcsBackupAt: r.gcs_backup_at,
      lastSavedAt: r.last_saved_at,
      createdAt: r.created_at, updatedAt: r.updated_at,
      contentPreview: r.content ? String(r.content).slice(0, 200) : '',
    };
  }
  // Helper: match teacher_id qua ANY của mọi JWT field
  const _ids = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

  // GET list
  app.get('/api/teacher/lesson-plans', async (req, res) => {
    const decoded = lpAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT id, title, subject, grade, tags, word_count, is_archived, format,
               latex_project_id, gcs_backup_url, gcs_backup_at, last_saved_at,
               created_at, updated_at, content, teacher_id
        FROM "LessonPlan" WHERE teacher_id = ANY($1::text[]) ORDER BY updated_at DESC LIMIT 200
      `, [_ids(decoded)]);
      return res.json({ plans: rows.map(lpRow), count: rows.length });
    } catch (e) { console.error('[lp:list]', e.message); return res.json({ plans: [], count: 0 }); }
  });

  // GET detail
  app.get('/api/teacher/lesson-plans/:id', async (req, res) => {
    const decoded = lpAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT * FROM "LessonPlan" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, _ids(decoded)]);
      if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy giáo án' });
      const r = rows[0];
      return res.json({ ...lpRow(r), content: r.content || '', contentJson: r.content_json || null });
    } catch (e) { console.error('[lp:get]', e.message); return res.status(500).json({ error: 'Lỗi tải giáo án' }); }
  });

  // POST create
  app.post('/api/teacher/lesson-plans', async (req, res) => {
    const decoded = lpAuth(req, res); if (!decoded) return;
    const myId = decoded.userId || decoded.id || decoded.sub;
    try {
      const { title = 'Giáo án mới', content = '', contentJson = null,
              subject = null, grade = null, tags = [] } = req.body || {};
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const wordCount = String(content).replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
      const pool = _getPool();
      const { rows } = await pool.query(`
        INSERT INTO "LessonPlan"(id, teacher_id, title, subject, grade, tags, content, content_json, word_count)
        VALUES ($1::text,$2::text,$3::text,$4,$5,$6::jsonb,$7::text,$8::jsonb,$9)
        RETURNING *
      `, [id, myId, String(title).slice(0, 500), subject, grade,
          JSON.stringify(Array.isArray(tags) ? tags : []),
          String(content), contentJson ? JSON.stringify(contentJson) : null, wordCount]);
      const r = rows[0];
      return res.json({ plan: { ...lpRow(r), content: r.content || '', contentJson: r.content_json || null } });
    } catch (e) { console.error('[lp:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo giáo án' }); }
  });

  // PATCH update / auto-save
  app.patch('/api/teacher/lesson-plans/:id', async (req, res) => {
    const decoded = lpAuth(req, res); if (!decoded) return;
    try {
      const { title, content, contentJson, subject, grade, tags, isArchived } = req.body || {};
      const updates = ['updated_at = NOW()', 'last_saved_at = NOW()'];
      const params = [req.params.id, _ids(decoded)];
      if (title !== undefined)        { params.push(String(title).slice(0, 500));  updates.push(`title = $${params.length}`); }
      if (subject !== undefined)      { params.push(subject);                       updates.push(`subject = $${params.length}`); }
      if (grade !== undefined)        { params.push(grade);                         updates.push(`grade = $${params.length}`); }
      if (tags !== undefined)         { params.push(JSON.stringify(Array.isArray(tags) ? tags : [])); updates.push(`tags = $${params.length}::jsonb`); }
      if (content !== undefined) {
        const wc = String(content).replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length;
        params.push(String(content)); updates.push(`content = $${params.length}`);
        params.push(wc);              updates.push(`word_count = $${params.length}`);
      }
      if (contentJson !== undefined)  { params.push(contentJson ? JSON.stringify(contentJson) : null); updates.push(`content_json = $${params.length}::jsonb`); }
      if (isArchived !== undefined)   { params.push(!!isArchived);                  updates.push(`is_archived = $${params.length}`); }
      const pool = _getPool();
      const { rows } = await pool.query(
        `UPDATE "LessonPlan" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = ANY($2::text[]) RETURNING *`,
        params);
      if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy giáo án hoặc không có quyền' });
      const r = rows[0];
      return res.json({ plan: { ...lpRow(r), content: r.content || '', contentJson: r.content_json || null } });
    } catch (e) { console.error('[lp:update]', e.message); return res.status(500).json({ error: 'Lỗi lưu giáo án' }); }
  });

  // DELETE
  app.delete('/api/teacher/lesson-plans/:id', async (req, res) => {
    const decoded = lpAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "LessonPlan" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, _ids(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy giáo án' });
      return res.json({ ok: true });
    } catch (e) { console.error('[lp:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá' }); }
  });

  // Stubs GCS
  app.post('/api/teacher/lesson-plans/:id/backup', (_req, res) => res.status(501).json({ error: 'GCS backup chưa khả dụng' }));
  app.post('/api/teacher/lesson-plans/from-latex', (_req, res) => res.status(501).json({ error: 'Import từ LaTeX chưa khả dụng' }));
  app.get('/api/teacher/lesson-plans-gcs', (_req, res) => res.json({ snapshots: [], count: 0, bucket: '', prefix: '' }));
  app.delete('/api/teacher/lesson-plans-gcs/:filename', (_req, res) => res.status(501).json({ error: 'GCS delete chưa khả dụng' }));
})();

// ── Gradebook (TT58/TT22) — TRƯỚC proxy teacher-service ──
// Migration "Gradebook" table được khai báo ở section riêng (line ~7170+,
// trong block ClassSubject+Gradebook). Handler ở đây để bypass proxy.
;(() => {
  function _gbAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  const _gbIds = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

  // GET /api/teacher/gradebook?classId=&subject=&semester=
  app.get('/api/teacher/gradebook', async (req, res) => {
    const decoded = _gbAuth(req, res); if (!decoded) return;
    try {
      const { classId, subject, semester } = req.query;
      if (!classId || !subject || !semester) return res.status(400).json({ error: 'Thiếu classId/subject/semester' });
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [classId, _gbIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
      const [studs, grds] = await Promise.all([
        pool.query(
          `SELECT id, stt, ho_ten AS "hoTen", ma_dinh_danh AS "maDinhDanh",
                  ngay_sinh AS "ngaySinh", gioi_tinh AS "gioiTinh"
           FROM "ClassStudent" WHERE class_id = $1 ORDER BY stt NULLS LAST, ho_ten`,
          [classId]),
        pool.query(
          `SELECT student_id AS "studentId", ddgtx, ddggk, ddgck,
                  note_progress AS "noteProgress", note_record AS "noteRecord"
           FROM "Gradebook" WHERE class_id = $1 AND subject = $2 AND semester = $3`,
          [classId, subject, semester]).catch(() => ({ rows: [] })),
      ]);
      const grades = {};
      for (const g of grds.rows) {
        grades[g.studentId] = {
          ddgtx: Array.isArray(g.ddgtx) ? g.ddgtx.map(v => v == null ? null : Number(v)) : [],
          ddggk: g.ddggk == null ? null : Number(g.ddggk),
          ddgck: g.ddgck == null ? null : Number(g.ddgck),
          noteProgress: g.noteProgress || '',
          noteRecord:   g.noteRecord   || '',
        };
      }
      return res.json({ students: studs.rows, grades });
    } catch (e) { console.error('[gb:get]', e.message); return res.status(500).json({ error: 'Lỗi tải sổ điểm' }); }
  });

  // POST /api/teacher/gradebook — body: { classId, subject, semester, rows: [...] }
  app.post('/api/teacher/gradebook', async (req, res) => {
    const decoded = _gbAuth(req, res); if (!decoded) return;
    try {
      const { classId, subject, semester, rows = [] } = req.body || {};
      if (!classId || !subject || !semester) return res.status(400).json({ error: 'Thiếu classId/subject/semester' });
      if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows phải là array' });
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [classId, _gbIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
      const { randomUUID } = require('crypto');
      const clamp = v => {
        if (v == null || v === '') return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Math.max(0, Math.min(10, Math.round(n * 100) / 100));
      };
      let saved = 0;
      for (const r of rows) {
        if (!r?.studentId) continue;
        const ddgtx = Array.isArray(r.ddgtx) ? r.ddgtx.map(clamp) : [];
        const ddggk = clamp(r.ddggk);
        const ddgck = clamp(r.ddgck);
        const noteP = r.noteProgress != null ? String(r.noteProgress) : null;
        const noteR = r.noteRecord   != null ? String(r.noteRecord)   : null;
        await pool.query(`
          INSERT INTO "Gradebook"(id, class_id, subject, semester, student_id,
                                  ddgtx, ddggk, ddgck, note_progress, note_record, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,NOW())
          ON CONFLICT (class_id, subject, semester, student_id) DO UPDATE
            SET ddgtx = EXCLUDED.ddgtx, ddggk = EXCLUDED.ddggk, ddgck = EXCLUDED.ddgck,
                note_progress = EXCLUDED.note_progress, note_record = EXCLUDED.note_record,
                updated_at = NOW()
        `, [randomUUID(), classId, subject, semester, r.studentId,
            JSON.stringify(ddgtx), ddggk, ddgck, noteP, noteR]);
        saved++;
      }
      return res.json({ ok: true, saved });
    } catch (e) { console.error('[gb:save]', e.message); return res.status(500).json({ error: 'Lỗi lưu sổ điểm' }); }
  });
})();

// ── GCS signed-URL upload (VideoUploader) — TRƯỚC proxy ──
// Browser PUT file trực tiếp lên GCS, không qua Cloud Run → tiết kiệm
// bandwidth + không bị giới hạn 32MB request body của Cloud Run.
;(() => {
  let _storage = null;
  function _getStorage() {
    if (_storage) return _storage;
    try {
      const { Storage } = require('@google-cloud/storage');
      if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
        try {
          const creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
          _storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'extreme-lattice-491123-p2', credentials: creds });
        } catch { _storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'extreme-lattice-491123-p2' }); }
      } else {
        _storage = new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'extreme-lattice-491123-p2' });
      }
    } catch (e) { console.error('[gcs] init:', e.message); }
    return _storage;
  }
  const BUCKET = process.env.GCS_BUCKET_MEDIA || 'aeroedu-media-extreme-lattice-491123-p2';

  // POST /api/upload/video-signed-url { filename, contentType, courseId? }
  app.post('/api/upload/video-signed-url', async (req, res) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    let decoded;
    try { decoded = _akVerify(auth.slice(7)); }
    catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }

    try {
      const storage = _getStorage();
      if (!storage) return res.status(500).json({ error: 'GCS chưa cấu hình' });
      const { filename = 'video.mp4', contentType = 'video/mp4', courseId } = req.body || {};
      // Validate content type
      if (!/^(video|audio)\//.test(contentType)) {
        return res.status(400).json({ error: 'contentType phải là video/* hoặc audio/*' });
      }
      // Safe filename: timestamp + random + sanitized original
      const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
      const userId = decoded.userId || decoded.id || decoded.sub || 'anon';
      const prefix = courseId ? `courses/${String(courseId).replace(/[^a-zA-Z0-9_-]/g, '_')}`
                              : `uploads/${String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const gcsPath = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

      const file = storage.bucket(BUCKET).file(gcsPath);
      const [uploadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 60 * 60 * 1000,  // 1h
        contentType,
      });
      const publicUrl = `https://storage.googleapis.com/${BUCKET}/${gcsPath}`;
      return res.json({ uploadUrl, publicUrl, contentType, gcsPath });
    } catch (e) {
      console.error('[upload:signed-url]', e.message);
      return res.status(500).json({ error: 'Lỗi tạo signed URL: ' + e.message });
    }
  });
})();

// ── Stub student-cams (camera webcam HS làm bài) — TRƯỚC proxy ──
// Endpoint thực sẽ join với ExamSubmission + WebcamSession table.
// Tạm trả empty để CameraManagement.tsx không 503 mỗi 10s.
app.get('/api/teacher/student-cams', (_req, res) => res.json({ sessions: [], count: 0 }));

// ── Learning Paths (LearningPathBuilder.tsx) — TRƯỚC proxy ──
;(() => {
  async function _ensureLPTable() {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "LearningPath" (
        id           VARCHAR(36)  PRIMARY KEY,
        teacher_id   VARCHAR(255) NOT NULL,
        name         VARCHAR(500) NOT NULL,
        description  TEXT,
        subject      VARCHAR(100),
        difficulty   VARCHAR(20),
        modules      JSONB        NOT NULL DEFAULT '[]'::jsonb,
        competencies JSONB        NOT NULL DEFAULT '[]'::jsonb,
        path_rubric  JSONB,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('LearningPath', [
      ['teacher_id',   "VARCHAR(255)"],
      ['name',         "VARCHAR(500)"],
      ['description',  "TEXT"],
      ['subject',      "VARCHAR(100)"],
      ['difficulty',   "VARCHAR(20)"],
      ['modules',      "JSONB DEFAULT '[]'::jsonb"],
      ['competencies', "JSONB DEFAULT '[]'::jsonb"],
      ['path_rubric',  "JSONB"],
      ['created_at',   "TIMESTAMPTZ DEFAULT NOW()"],
      ['updated_at',   "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('LearningPath', ['teacherId','name','description','subject','difficulty','modules','competencies','pathRubric','createdAt','updatedAt']);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lp_teacher ON "LearningPath"(teacher_id, updated_at DESC)`);

    // Assignment 1-N: 1 path → nhiều HS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "LearningPathAssignment" (
        id             VARCHAR(36)  PRIMARY KEY,
        path_id        VARCHAR(36)  NOT NULL,
        student_id     VARCHAR(255) NOT NULL,
        student_name   VARCHAR(255),
        student_email  VARCHAR(255),
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('LearningPathAssignment', [
      ['path_id',       "VARCHAR(36)"],
      ['student_id',    "VARCHAR(255)"],
      ['student_name',  "VARCHAR(255)"],
      ['student_email', "VARCHAR(255)"],
      ['created_at',    "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('LearningPathAssignment', ['pathId','studentId','studentName','studentEmail','createdAt']);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_lp_assign ON "LearningPathAssignment"(path_id, student_id)`);
  }
  _ensureLPTable().catch(e => console.error('[learning-paths] migration:', e.message));

  function _lpAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  const _lpIds = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

  // GET list
  app.get('/api/teacher/learning-paths', async (req, res) => {
    const decoded = _lpAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = _lpIds(decoded);
      const { rows: paths } = await pool.query(
        `SELECT id, name, description, subject, difficulty, modules, competencies,
                path_rubric AS "pathRubric", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM "LearningPath" WHERE teacher_id = ANY($1::text[]) ORDER BY updated_at DESC LIMIT 200`,
        [myIds]);
      if (!paths.length) return res.json({ paths: [] });
      const ids = paths.map(p => p.id);
      const { rows: assigns } = await pool.query(
        `SELECT id, path_id AS "pathId", student_id AS "studentId",
                student_name AS "studentName", student_email AS "studentEmail"
         FROM "LearningPathAssignment" WHERE path_id = ANY($1::text[])`, [ids]);
      const byPath = {};
      for (const a of assigns) (byPath[a.pathId] = byPath[a.pathId] || []).push(a);
      const result = paths.map(p => ({ ...p, assignments: byPath[p.id] || [] }));
      return res.json({ paths: result });
    } catch (e) { console.error('[lp:list]', e.message); return res.json({ paths: [] }); }
  });

  // POST create
  app.post('/api/teacher/learning-paths', async (req, res) => {
    const decoded = _lpAuth(req, res); if (!decoded) return;
    const myId = decoded.userId || decoded.id || decoded.sub;
    try {
      const b = req.body || {};
      if (!String(b.name || '').trim()) return res.status(400).json({ error: 'Thiếu tên path' });
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const pool = _getPool();
      await pool.query(`
        INSERT INTO "LearningPath"(id, teacher_id, name, description, subject, difficulty,
                                   modules, competencies, path_rubric)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)
      `, [id, myId, String(b.name).slice(0,500), b.description || null,
          b.subject || null, b.difficulty || null,
          JSON.stringify(Array.isArray(b.modules) ? b.modules : []),
          JSON.stringify(Array.isArray(b.competencies) ? b.competencies : []),
          b.pathRubric ? JSON.stringify(b.pathRubric) : null]);
      // assignTo HS
      const assignTo = Array.isArray(b.assignTo) ? b.assignTo : [];
      for (const a of assignTo) {
        if (!a?.studentId) continue;
        try {
          await pool.query(
            `INSERT INTO "LearningPathAssignment"(id, path_id, student_id, student_name, student_email)
             VALUES ($1,$2,$3,$4,$5)`,
            [randomUUID(), id, a.studentId, a.studentName || null, a.studentEmail || null]);
        } catch (e) { if (e.code !== '23505') throw e; }
      }
      return res.json({ ok: true, id });
    } catch (e) { console.error('[lp:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo path' }); }
  });

  // PATCH update
  app.patch('/api/teacher/learning-paths/:id', async (req, res) => {
    const decoded = _lpAuth(req, res); if (!decoded) return;
    try {
      const b = req.body || {};
      const updates = ['updated_at = NOW()'];
      const params = [req.params.id, _lpIds(decoded)];
      const push = (col, val, cast = '') => { params.push(val); updates.push(`${col} = $${params.length}${cast}`); };
      if (b.name        !== undefined) push('name',        String(b.name).slice(0,500));
      if (b.description !== undefined) push('description', b.description || null);
      if (b.subject     !== undefined) push('subject',     b.subject || null);
      if (b.difficulty  !== undefined) push('difficulty',  b.difficulty || null);
      if (b.modules      !== undefined) push('modules',      JSON.stringify(Array.isArray(b.modules) ? b.modules : []), '::jsonb');
      if (b.competencies !== undefined) push('competencies', JSON.stringify(Array.isArray(b.competencies) ? b.competencies : []), '::jsonb');
      if (b.pathRubric   !== undefined) push('path_rubric',  b.pathRubric ? JSON.stringify(b.pathRubric) : null, '::jsonb');
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `UPDATE "LearningPath" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        params);
      if (!rowCount) return res.status(404).json({ error: 'Path không tồn tại hoặc không có quyền' });
      return res.json({ ok: true });
    } catch (e) { console.error('[lp:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật path' }); }
  });

  // DELETE
  app.delete('/api/teacher/learning-paths/:id', async (req, res) => {
    const decoded = _lpAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      // Verify owner
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "LearningPath" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, _lpIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Path không tồn tại' });
      await pool.query(`DELETE FROM "LearningPathAssignment" WHERE path_id = $1`, [req.params.id]);
      await pool.query(`DELETE FROM "LearningPath" WHERE id = $1`, [req.params.id]);
      return res.json({ ok: true });
    } catch (e) { console.error('[lp:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá path' }); }
  });

  // POST assign — body: { students: [{ studentId, studentName, studentEmail }, ...] }
  app.post('/api/teacher/learning-paths/:id/assign', async (req, res) => {
    const decoded = _lpAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "LearningPath" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, _lpIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Path không tồn tại' });
      const list = Array.isArray(req.body?.students) ? req.body.students : [];
      const { randomUUID } = require('crypto');
      let added = 0;
      for (const a of list) {
        if (!a?.studentId) continue;
        try {
          await pool.query(
            `INSERT INTO "LearningPathAssignment"(id, path_id, student_id, student_name, student_email)
             VALUES ($1,$2,$3,$4,$5)`,
            [randomUUID(), req.params.id, a.studentId, a.studentName || null, a.studentEmail || null]);
          added++;
        } catch (e) { if (e.code !== '23505') throw e; }
      }
      return res.json({ ok: true, added });
    } catch (e) { console.error('[lp:assign]', e.message); return res.status(500).json({ error: 'Lỗi gán HS' }); }
  });
})();

// ── /api/teachers/all — TRƯỚC proxy /api/teacher (string prefix sẽ match cả 's') ──
// Shape match TeacherProfile ở MyTeachers.tsx — FE crash nếu cpd.milestone undefined.
app.get('/api/teachers/all', async (req, res) => {
  try {
    const pool = _getPool();
    let viewerId = null;
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      try { viewerId = _akVerify(auth.slice(7)).sub; } catch {}
    }
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.image, u.role, u."createdAt" AS "joinedAt",
             up.bio, up.data AS profile_data,
             (SELECT COUNT(*)::int FROM "Class" WHERE teacher_id = u.id) AS "classCount",
             (SELECT COUNT(*)::int FROM "TeacherStudentLink" WHERE teacher_id = u.id AND status = 'approved') AS "studentCount",
             (SELECT EXISTS(SELECT 1 FROM "TeacherStudentLink" WHERE teacher_id = u.id AND student_id = $1 AND status = 'approved')) AS "isConnected"
      FROM "User" u
      LEFT JOIN "UserProfile" up ON up.user_id = u.id
      WHERE u.role IN ('TEACHER', 'ADMIN') AND COALESCE(u.banned, false) = false
      ORDER BY u."createdAt" DESC LIMIT 200
    `, [viewerId || '']).catch(() => ({ rows: [] }));

    const teachers = rows.map(r => {
      const pd = r.profile_data || {};
      return {
        id: r.id,
        name: r.name || (r.email ? r.email.split('@')[0] : 'GV'),
        // PII: chỉ expose email nếu đã connected (FE comment: "null nếu HS chưa kết nối")
        email: r.isConnected ? r.email : null,
        image: r.image,
        bio: r.bio || null,
        phone: r.isConnected ? (pd.phone || null) : null,
        website: pd.website || null,
        joinedAt: r.joinedAt,
        lat: typeof pd.lat === 'number' ? pd.lat : null,
        lon: typeof pd.lon === 'number' ? pd.lon : null,
        province: pd.province || null,
        isConnected: !!r.isConnected,
        // cpd object FULL với defaults — KHÔNG để null vì FE access .milestone trực tiếp
        cpd: {
          avgScore: 0,
          skillCount: 0,
          expertCount: 0,
          proficientCount: 0,
          milestone: null,
          updatedAt: null,
        },
        // bonus fields
        classCount: r.classCount || 0,
        studentCount: r.studentCount || 0,
      };
    });
    return res.json({ teachers, total: teachers.length });
  } catch (e) { console.error('[teachers:all]', e.message); return res.json({ teachers: [], total: 0 }); }
});

// ══════════════════════════════════════════════════════════════════════════
// STEM PROJECTS — Giáo viên tạo dự án + mời HS qua QR / link
// ══════════════════════════════════════════════════════════════════════════
// User: "Riêng stem thì giáo viên là người tạo dự án và quyết định đưa học
// sinh nào vào trong dự án bằng cách gửi link, quét mã QR"
//
// Tables:
//   StemProject       — dự án (teacher_id chủ sở hữu)
//   StemProjectInvite — token invite (max_uses, expires_at, revoked)
//   StemProjectMember — HS đã join vào dự án (status: pending/active)
// ══════════════════════════════════════════════════════════════════════════
;(() => {
  let _stemReady = false;
  async function _ensureStemTables() {
    if (_stemReady) return;
    try {
      const pool = _getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StemProject" (
          id           VARCHAR(36)  PRIMARY KEY,
          teacher_id   VARCHAR(255) NOT NULL,
          title        VARCHAR(500) NOT NULL,
          description  TEXT,
          category     VARCHAR(50),
          status       VARCHAR(20)  DEFAULT 'draft',
          subject      VARCHAR(100),
          grade        VARCHAR(50),
          due_date     TIMESTAMPTZ,
          difficulty   VARCHAR(20)  DEFAULT 'beginner',
          tags         JSONB        DEFAULT '[]'::jsonb,
          objective    TEXT,
          methodology  TEXT,
          metadata     JSONB        DEFAULT '{}'::jsonb,
          created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemproj_teacher ON "StemProject"(teacher_id, created_at DESC)`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StemProjectInvite" (
          token       VARCHAR(64)  PRIMARY KEY,
          project_id  VARCHAR(36)  NOT NULL,
          teacher_id  VARCHAR(255) NOT NULL,
          label       VARCHAR(200),
          max_uses    INTEGER,
          used_count  INTEGER      DEFAULT 0,
          expires_at  TIMESTAMPTZ,
          revoked_at  TIMESTAMPTZ,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_steminv_project ON "StemProjectInvite"(project_id)`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StemProjectMember" (
          id          VARCHAR(36)  PRIMARY KEY,
          project_id  VARCHAR(36)  NOT NULL,
          student_id  VARCHAR(255) NOT NULL,
          role        VARCHAR(50)  DEFAULT 'member',
          status      VARCHAR(20)  DEFAULT 'active',
          joined_via_token VARCHAR(64),
          joined_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_stemmember_pair ON "StemProjectMember"(project_id, student_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemmember_project ON "StemProjectMember"(project_id)`);

      // ── Mở rộng: tasks + progress logs + feedback + milestones ──
      // User: "có giao nhiệm vụ, theo dõi tiến trình và feedback từng ngày.
      //        Đánh giá từng giai đoạn"
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StemTask" (
          id           VARCHAR(36)  PRIMARY KEY,
          project_id   VARCHAR(36)  NOT NULL,
          title        VARCHAR(500) NOT NULL,
          description  TEXT,
          assigned_to  JSONB        DEFAULT '[]'::jsonb,
          status       VARCHAR(20)  DEFAULT 'pending',
          priority     VARCHAR(10)  DEFAULT 'medium',
          due_date     TIMESTAMPTZ,
          points       INTEGER      DEFAULT 0,
          completed_at TIMESTAMPTZ,
          created_by   VARCHAR(255) NOT NULL,
          created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemtask_project ON "StemTask"(project_id, status)`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StemProgressLog" (
          id           VARCHAR(36)  PRIMARY KEY,
          project_id   VARCHAR(36)  NOT NULL,
          student_id   VARCHAR(255) NOT NULL,
          log_date     DATE         NOT NULL DEFAULT CURRENT_DATE,
          content      TEXT         NOT NULL,
          hours_spent  NUMERIC      DEFAULT 0,
          task_id      VARCHAR(36),
          attachments  JSONB        DEFAULT '[]'::jsonb,
          created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemlog_project ON "StemProgressLog"(project_id, log_date DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemlog_student ON "StemProgressLog"(student_id, log_date DESC)`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StemFeedback" (
          id           VARCHAR(36)  PRIMARY KEY,
          project_id   VARCHAR(36)  NOT NULL,
          author_id    VARCHAR(255) NOT NULL,
          target_type  VARCHAR(20)  NOT NULL,
          target_id    VARCHAR(36),
          content      TEXT         NOT NULL,
          rating       SMALLINT,
          feedback_type VARCHAR(20) DEFAULT 'suggestion',
          created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemfb_project ON "StemFeedback"(project_id, created_at DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemfb_target ON "StemFeedback"(target_type, target_id)`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS "StemMilestone" (
          id           VARCHAR(36)  PRIMARY KEY,
          project_id   VARCHAR(36)  NOT NULL,
          title        VARCHAR(500) NOT NULL,
          description  TEXT,
          phase_order  SMALLINT     DEFAULT 0,
          status       VARCHAR(20)  DEFAULT 'pending',
          due_date     TIMESTAMPTZ,
          criteria     JSONB        DEFAULT '[]'::jsonb,
          score        NUMERIC,
          max_score    NUMERIC      DEFAULT 10,
          evaluation   TEXT,
          evaluated_at TIMESTAMPTZ,
          created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_stemms_project ON "StemMilestone"(project_id, phase_order)`);

      _stemReady = true;
    } catch (e) { console.warn('[stem-projects] migration:', e.message); }
  }
  _ensureStemTables().catch(() => {});

  // Helper: verify teacher owns project (used cho tất cả mutation tasks/logs/feedback/milestones)
  async function _verifyTeacherOwnsProject(pool, projectId, myIds) {
    const { rowCount } = await pool.query(
      `SELECT id FROM "StemProject" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
      [projectId, myIds]
    );
    return rowCount > 0;
  }
  // Helper: verify student is member of project (cho student post logs)
  async function _verifyStudentMember(pool, projectId, studentIds) {
    const { rowCount } = await pool.query(
      `SELECT id FROM "StemProjectMember"
       WHERE project_id = $1 AND student_id = ANY($2::text[]) AND status = 'active'`,
      [projectId, studentIds]
    );
    return rowCount > 0;
  }

  function stemAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  const stemMyIds = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

  // GET /api/teacher/stem-projects — list GV's projects + member count
  app.get('/api/teacher/stem-projects', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const { rows } = await pool.query(`
        SELECT p.*,
               (SELECT COUNT(*) FROM "StemProjectMember" m WHERE m.project_id = p.id AND m.status = 'active')::int AS member_count,
               (SELECT COUNT(*) FROM "StemProjectInvite" i WHERE i.project_id = p.id AND i.revoked_at IS NULL)::int AS invite_count
        FROM "StemProject" p
        WHERE p.teacher_id = ANY($1::text[])
        ORDER BY p.created_at DESC LIMIT 200
      `, [myIds]);
      return res.json({ projects: rows, total: rows.length });
    } catch (e) { console.error('[stem-projects:list]', e.message); return res.json({ projects: [], total: 0 }); }
  });

  // POST /api/teacher/stem-projects — tạo dự án mới
  app.post('/api/teacher/stem-projects', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const b = req.body || {};
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const { rows } = await pool.query(`
        INSERT INTO "StemProject"(
          id, teacher_id, title, description, category, status, subject, grade,
          due_date, difficulty, tags, objective, methodology
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)
        RETURNING *
      `, [
        id, decoded.sub,
        String(b.title || 'Dự án mới').slice(0, 500),
        b.description || null,
        b.category || 'Engineering',
        b.status || 'draft',
        b.subject || null,
        b.grade || null,
        b.dueDate || null,
        b.difficulty || 'beginner',
        JSON.stringify(b.tags || []),
        b.objective || null,
        b.methodology || null,
      ]);
      return res.json({ project: rows[0] });
    } catch (e) {
      console.error('[stem-projects:create]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // GET /api/teacher/stem-projects/:id — detail + members
  app.get('/api/teacher/stem-projects/:id', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const { rows } = await pool.query(
        `SELECT * FROM "StemProject" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, myIds]
      );
      if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy dự án' });
      const { rows: members } = await pool.query(`
        SELECT m.*, u.name, u.email, u.image
        FROM "StemProjectMember" m
        LEFT JOIN "User" u ON u.id = m.student_id
        WHERE m.project_id = $1 AND m.status = 'active'
        ORDER BY m.joined_at DESC
      `, [req.params.id]).catch(() => ({ rows: [] }));
      const { rows: invites } = await pool.query(
        `SELECT * FROM "StemProjectInvite" WHERE project_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
      ).catch(() => ({ rows: [] }));
      return res.json({ project: rows[0], members, invites });
    } catch (e) {
      console.error('[stem-projects:detail]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // PATCH /api/teacher/stem-projects/:id — cập nhật
  app.patch('/api/teacher/stem-projects/:id', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const b = req.body || {};
      const fields = ['title', 'description', 'category', 'status', 'subject', 'grade', 'difficulty', 'objective', 'methodology'];
      const updates = ['updated_at = NOW()'];
      const params = [req.params.id, myIds];
      for (const f of fields) {
        if (b[f] !== undefined) { params.push(b[f]); updates.push(`${f} = $${params.length}`); }
      }
      if (b.tags !== undefined) { params.push(JSON.stringify(b.tags)); updates.push(`tags = $${params.length}::jsonb`); }
      if (b.dueDate !== undefined) { params.push(b.dueDate); updates.push(`due_date = $${params.length}`); }
      const { rowCount } = await pool.query(
        `UPDATE "StemProject" SET ${updates.join(', ')}
         WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        params
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy dự án' });
      return res.json({ ok: true });
    } catch (e) { console.error('[stem-projects:patch]', e.message); return res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/teacher/stem-projects/:id
  app.delete('/api/teacher/stem-projects/:id', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const { rowCount } = await pool.query(
        `DELETE FROM "StemProject" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, myIds]
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy dự án' });
      return res.json({ ok: true });
    } catch (e) { console.error('[stem-projects:delete]', e.message); return res.status(500).json({ error: e.message }); }
  });

  // POST /api/teacher/stem-projects/:id/invites — tạo invite token
  app.post('/api/teacher/stem-projects/:id/invites', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      // Verify ownership
      const { rows: own } = await pool.query(
        `SELECT id FROM "StemProject" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, myIds]
      );
      if (!own.length) return res.status(404).json({ error: 'Không tìm thấy dự án' });
      const b = req.body || {};
      const { randomBytes } = require('crypto');
      const token = randomBytes(16).toString('base64url');
      const expiresInDays = Number(b.expiresInDays) || 30;
      const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000);
      await pool.query(`
        INSERT INTO "StemProjectInvite"(token, project_id, teacher_id, label, max_uses, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [token, req.params.id, decoded.sub,
          b.label || null,
          b.maxUses ? Number(b.maxUses) : null,
          expiresAt.toISOString()]);
      const baseUrl = req.headers.origin || `https://${req.get('host') || 'inphysic.com'}`;
      const url = `${baseUrl}/stem/join/${token}`;
      return res.json({
        token, url,
        label: b.label || null,
        maxUses: b.maxUses ? Number(b.maxUses) : null,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (e) {
      console.error('[stem-projects:invite-create]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // DELETE /api/teacher/stem-projects/invites/:token — revoke
  app.delete('/api/teacher/stem-projects/invites/:token', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const { rowCount } = await pool.query(
        `UPDATE "StemProjectInvite" SET revoked_at = NOW()
         WHERE token = $1 AND teacher_id = ANY($2::text[]) AND revoked_at IS NULL`,
        [req.params.token, myIds]
      );
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy invite' });
      return res.json({ ok: true });
    } catch (e) { console.error('[stem-projects:invite-revoke]', e.message); return res.status(500).json({ error: e.message }); }
  });

  // ── PUBLIC: HS xem invite info (preview trước khi join) ──
  app.get('/api/stem/invite/:token/info', async (req, res) => {
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT i.token, i.label, i.max_uses, i.used_count, i.expires_at, i.revoked_at,
               p.id AS project_id, p.title, p.description, p.category, p.subject, p.grade,
               u.name AS teacher_name, u.image AS teacher_image
        FROM "StemProjectInvite" i
        JOIN "StemProject" p ON p.id = i.project_id
        LEFT JOIN "User" u ON u.id = i.teacher_id
        WHERE i.token = $1
      `, [req.params.token]);
      if (!rows.length) return res.status(404).json({ valid: false, error: 'Link không tồn tại' });
      const r = rows[0];
      const now = new Date();
      let valid = true; let reason = null;
      if (r.revoked_at) { valid = false; reason = 'Link đã bị thu hồi'; }
      else if (r.expires_at && new Date(r.expires_at) < now) { valid = false; reason = 'Link đã hết hạn'; }
      else if (r.max_uses && r.used_count >= r.max_uses) { valid = false; reason = 'Link đã đạt giới hạn'; }
      return res.json({
        valid, reason,
        project: { id: r.project_id, title: r.title, description: r.description, category: r.category,
                   subject: r.subject, grade: r.grade },
        teacher: { name: r.teacher_name || 'GV', image: r.teacher_image || null },
        usedCount: r.used_count, maxUses: r.max_uses, expiresAt: r.expires_at,
      });
    } catch (e) { console.error('[stem:invite-info]', e.message); return res.status(500).json({ valid: false, error: e.message }); }
  });

  // POST /api/stem/invite/:token/join — HS join dự án qua link
  app.post('/api/stem/invite/:token/join', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT * FROM "StemProjectInvite" WHERE token = $1
      `, [req.params.token]);
      if (!rows.length) return res.status(404).json({ error: 'Link không tồn tại' });
      const inv = rows[0];
      const now = new Date();
      if (inv.revoked_at) return res.status(403).json({ error: 'Link đã bị thu hồi' });
      if (inv.expires_at && new Date(inv.expires_at) < now) return res.status(403).json({ error: 'Link đã hết hạn' });
      if (inv.max_uses && inv.used_count >= inv.max_uses) return res.status(403).json({ error: 'Link đã đạt giới hạn lượt dùng' });

      const { randomUUID } = require('crypto');
      const memberId = randomUUID();
      // Insert ON CONFLICT DO NOTHING — không tăng used_count nếu HS đã join trước đó
      const { rowCount } = await pool.query(`
        INSERT INTO "StemProjectMember"(id, project_id, student_id, joined_via_token)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (project_id, student_id) DO NOTHING
      `, [memberId, inv.project_id, decoded.sub, req.params.token]);

      // Tăng used_count chỉ khi HS mới join
      if (rowCount) {
        await pool.query(
          `UPDATE "StemProjectInvite" SET used_count = used_count + 1 WHERE token = $1`,
          [req.params.token]
        );
      }

      return res.json({
        ok: true, projectId: inv.project_id,
        alreadyMember: rowCount === 0,
        message: rowCount ? 'Đã tham gia dự án thành công' : 'Bạn đã là thành viên của dự án này',
      });
    } catch (e) {
      console.error('[stem:invite-join]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // GET /api/student/stem-projects — list dự án HS đã join
  app.get('/api/student/stem-projects', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const { rows } = await pool.query(`
        SELECT p.*, m.joined_at, m.role,
               u.name AS teacher_name, u.image AS teacher_image
        FROM "StemProjectMember" m
        JOIN "StemProject" p ON p.id = m.project_id
        LEFT JOIN "User" u ON u.id = p.teacher_id
        WHERE m.student_id = ANY($1::text[]) AND m.status = 'active'
        ORDER BY m.joined_at DESC LIMIT 100
      `, [myIds]).catch(() => ({ rows: [] }));
      return res.json({ projects: rows, total: rows.length });
    } catch (e) { console.error('[student:stem-projects]', e.message); return res.json({ projects: [], total: 0 }); }
  });

  // ════════════════════════════════════════════════════════════════════════
  // STEM PROJECT MONITORING — Tasks · Logs · Feedback · Milestones
  // GV giám sát dự án như 1 khoá học: giao nhiệm vụ, theo dõi tiến trình hàng
  // ngày, feedback per-task / per-log, đánh giá theo phase với rubric.
  // ════════════════════════════════════════════════════════════════════════

  // ── TASKS ──────────────────────────────────────────────────
  // GET tasks của project
  app.get('/api/teacher/stem-projects/:id/tasks', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      // Cho phép cả GV (owner) lẫn member HS xem tasks
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.id, myIds);
      const isMember = !isOwner && await _verifyStudentMember(pool, req.params.id, myIds);
      if (!isOwner && !isMember) return res.status(403).json({ error: 'Không có quyền truy cập' });
      const { rows } = await pool.query(
        `SELECT * FROM "StemTask" WHERE project_id = $1 ORDER BY priority DESC, due_date ASC NULLS LAST, created_at DESC`,
        [req.params.id]
      );
      return res.json({ tasks: rows, isOwner });
    } catch (e) { console.error('[stem:tasks:list]', e.message); return res.json({ tasks: [] }); }
  });

  // POST task — GV giao nhiệm vụ
  app.post('/api/teacher/stem-projects/:id/tasks', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      if (!await _verifyTeacherOwnsProject(pool, req.params.id, myIds)) {
        return res.status(403).json({ error: 'Chỉ GV chủ dự án mới giao nhiệm vụ' });
      }
      const b = req.body || {};
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const { rows } = await pool.query(`
        INSERT INTO "StemTask"(id, project_id, title, description, assigned_to,
                               status, priority, due_date, points, created_by)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        id, req.params.id,
        String(b.title || 'Nhiệm vụ mới').slice(0, 500),
        b.description || null,
        JSON.stringify(Array.isArray(b.assignedTo) ? b.assignedTo : []),
        b.status || 'pending',
        b.priority || 'medium',
        b.dueDate || null,
        Number(b.points) || 0,
        decoded.sub,
      ]);
      return res.json({ task: rows[0] });
    } catch (e) { console.error('[stem:tasks:create]', e.message); return res.status(500).json({ error: e.message }); }
  });

  // PATCH task — update status / fields (cả GV và HS được assign)
  app.patch('/api/teacher/stem-projects/:projectId/tasks/:taskId', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.projectId, myIds);
      // HS đã được assign cũng được update status
      const { rows: tRows } = await pool.query(
        `SELECT assigned_to FROM "StemTask" WHERE id = $1 AND project_id = $2`,
        [req.params.taskId, req.params.projectId]
      );
      if (!tRows.length) return res.status(404).json({ error: 'Không tìm thấy task' });
      const assignedTo = Array.isArray(tRows[0].assigned_to) ? tRows[0].assigned_to : [];
      const isAssignee = assignedTo.some(uid => myIds.includes(uid));
      if (!isOwner && !isAssignee) return res.status(403).json({ error: 'Không có quyền sửa task' });

      const b = req.body || {};
      const updates = ['updated_at = NOW()'];
      const params = [req.params.taskId];
      const fields = isOwner
        ? { title: 'title', description: 'description', status: 'status', priority: 'priority', points: 'points' }
        : { status: 'status' };  // HS chỉ được đổi status
      for (const [k, col] of Object.entries(fields)) {
        if (b[k] !== undefined) { params.push(b[k]); updates.push(`${col} = $${params.length}`); }
      }
      if (isOwner && b.assignedTo !== undefined) { params.push(JSON.stringify(b.assignedTo)); updates.push(`assigned_to = $${params.length}::jsonb`); }
      if (isOwner && b.dueDate !== undefined) { params.push(b.dueDate); updates.push(`due_date = $${params.length}`); }
      if (b.status === 'completed') updates.push(`completed_at = NOW()`);
      const { rows } = await pool.query(
        `UPDATE "StemTask" SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );
      return res.json({ task: rows[0] });
    } catch (e) { console.error('[stem:tasks:patch]', e.message); return res.status(500).json({ error: e.message }); }
  });

  // DELETE task — chỉ GV
  app.delete('/api/teacher/stem-projects/:projectId/tasks/:taskId', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      if (!await _verifyTeacherOwnsProject(pool, req.params.projectId, myIds)) {
        return res.status(403).json({ error: 'Chỉ GV mới xoá task' });
      }
      await pool.query(`DELETE FROM "StemTask" WHERE id = $1 AND project_id = $2`,
        [req.params.taskId, req.params.projectId]);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  });

  // ── PROGRESS LOGS ───────────────────────────────────────────
  // GET logs — GV xem all, HS xem own
  app.get('/api/teacher/stem-projects/:id/logs', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.id, myIds);
      const isMember = !isOwner && await _verifyStudentMember(pool, req.params.id, myIds);
      if (!isOwner && !isMember) return res.status(403).json({ error: 'Không có quyền' });

      const studentFilter = req.query.studentId ? [String(req.query.studentId)]
                          : isOwner ? null : myIds;
      const sql = studentFilter
        ? `SELECT l.*, u.name AS student_name, u.image AS student_image,
                  (SELECT COUNT(*) FROM "StemFeedback" f
                   WHERE f.target_type = 'log' AND f.target_id = l.id)::int AS feedback_count
           FROM "StemProgressLog" l
           LEFT JOIN "User" u ON u.id = l.student_id
           WHERE l.project_id = $1 AND l.student_id = ANY($2::text[])
           ORDER BY l.log_date DESC, l.created_at DESC LIMIT 200`
        : `SELECT l.*, u.name AS student_name, u.image AS student_image,
                  (SELECT COUNT(*) FROM "StemFeedback" f
                   WHERE f.target_type = 'log' AND f.target_id = l.id)::int AS feedback_count
           FROM "StemProgressLog" l
           LEFT JOIN "User" u ON u.id = l.student_id
           WHERE l.project_id = $1
           ORDER BY l.log_date DESC, l.created_at DESC LIMIT 200`;
      const params = studentFilter ? [req.params.id, studentFilter] : [req.params.id];
      const { rows } = await pool.query(sql, params);
      return res.json({ logs: rows });
    } catch (e) { console.error('[stem:logs:list]', e.message); return res.json({ logs: [] }); }
  });

  // POST log — HS hoặc GV ghi tiến trình
  app.post('/api/teacher/stem-projects/:id/logs', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.id, myIds);
      const isMember = !isOwner && await _verifyStudentMember(pool, req.params.id, myIds);
      if (!isOwner && !isMember) return res.status(403).json({ error: 'Không có quyền ghi log' });

      const b = req.body || {};
      if (!b.content || !b.content.trim()) return res.status(400).json({ error: 'Cần nội dung tiến trình' });

      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const { rows } = await pool.query(`
        INSERT INTO "StemProgressLog"(id, project_id, student_id, log_date, content,
                                       hours_spent, task_id, attachments)
        VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7, $8::jsonb)
        RETURNING *
      `, [
        id, req.params.id, decoded.sub,
        b.logDate || null,
        String(b.content).slice(0, 5000),
        Number(b.hoursSpent) || 0,
        b.taskId || null,
        JSON.stringify(Array.isArray(b.attachments) ? b.attachments : []),
      ]);
      return res.json({ log: rows[0] });
    } catch (e) { console.error('[stem:logs:create]', e.message); return res.status(500).json({ error: e.message }); }
  });

  // ── FEEDBACK ────────────────────────────────────────────────
  // GET feedbacks của project (filtered by target)
  app.get('/api/teacher/stem-projects/:id/feedbacks', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.id, myIds);
      const isMember = !isOwner && await _verifyStudentMember(pool, req.params.id, myIds);
      if (!isOwner && !isMember) return res.status(403).json({ error: 'Không có quyền' });

      const where = ['f.project_id = $1'];
      const params = [req.params.id];
      if (req.query.targetType) { params.push(req.query.targetType); where.push(`f.target_type = $${params.length}`); }
      if (req.query.targetId) { params.push(req.query.targetId); where.push(`f.target_id = $${params.length}`); }

      const { rows } = await pool.query(`
        SELECT f.*, u.name AS author_name, u.image AS author_image, u.role AS author_role
        FROM "StemFeedback" f
        LEFT JOIN "User" u ON u.id = f.author_id
        WHERE ${where.join(' AND ')}
        ORDER BY f.created_at DESC LIMIT 200
      `, params);
      return res.json({ feedbacks: rows });
    } catch (e) { console.error('[stem:feedback:list]', e.message); return res.json({ feedbacks: [] }); }
  });

  // POST feedback — GV nhận xét task/log/milestone/project
  app.post('/api/teacher/stem-projects/:id/feedbacks', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.id, myIds);
      const isMember = !isOwner && await _verifyStudentMember(pool, req.params.id, myIds);
      if (!isOwner && !isMember) return res.status(403).json({ error: 'Không có quyền feedback' });

      const b = req.body || {};
      if (!b.content || !b.content.trim()) return res.status(400).json({ error: 'Cần nội dung' });
      const validTypes = ['task', 'log', 'milestone', 'project'];
      const targetType = validTypes.includes(b.targetType) ? b.targetType : 'project';

      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const { rows } = await pool.query(`
        INSERT INTO "StemFeedback"(id, project_id, author_id, target_type, target_id,
                                    content, rating, feedback_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        id, req.params.id, decoded.sub,
        targetType, b.targetId || null,
        String(b.content).slice(0, 3000),
        b.rating != null ? Math.max(0, Math.min(10, Number(b.rating))) : null,
        b.feedbackType || 'suggestion',
      ]);
      return res.json({ feedback: rows[0] });
    } catch (e) { console.error('[stem:feedback:create]', e.message); return res.status(500).json({ error: e.message }); }
  });

  // ── MILESTONES ──────────────────────────────────────────────
  // GET milestones — phase đánh giá
  app.get('/api/teacher/stem-projects/:id/milestones', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.id, myIds);
      const isMember = !isOwner && await _verifyStudentMember(pool, req.params.id, myIds);
      if (!isOwner && !isMember) return res.status(403).json({ error: 'Không có quyền' });
      const { rows } = await pool.query(
        `SELECT * FROM "StemMilestone" WHERE project_id = $1 ORDER BY phase_order ASC, due_date ASC NULLS LAST`,
        [req.params.id]
      );
      return res.json({ milestones: rows });
    } catch (e) { return res.json({ milestones: [] }); }
  });

  // POST milestone — GV tạo phase đánh giá với criteria
  app.post('/api/teacher/stem-projects/:id/milestones', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      if (!await _verifyTeacherOwnsProject(pool, req.params.id, myIds)) {
        return res.status(403).json({ error: 'Chỉ GV mới tạo phase đánh giá' });
      }
      const b = req.body || {};
      const { randomUUID } = require('crypto');
      const { rows } = await pool.query(`
        INSERT INTO "StemMilestone"(id, project_id, title, description, phase_order,
                                     status, due_date, criteria, max_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING *
      `, [
        randomUUID(), req.params.id,
        String(b.title || 'Phase mới').slice(0, 500),
        b.description || null,
        Number(b.phaseOrder) || 0,
        b.status || 'pending',
        b.dueDate || null,
        JSON.stringify(Array.isArray(b.criteria) ? b.criteria : []),
        Number(b.maxScore) || 10,
      ]);
      return res.json({ milestone: rows[0] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  });

  // PATCH milestone — GV đánh giá (chấm điểm + nhận xét)
  app.patch('/api/teacher/stem-projects/:projectId/milestones/:msId', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      if (!await _verifyTeacherOwnsProject(pool, req.params.projectId, myIds)) {
        return res.status(403).json({ error: 'Chỉ GV mới đánh giá' });
      }
      const b = req.body || {};
      const updates = ['updated_at = NOW()'];
      const params = [req.params.msId];
      const fields = { title: 'title', description: 'description', status: 'status',
                       phaseOrder: 'phase_order', dueDate: 'due_date', maxScore: 'max_score',
                       evaluation: 'evaluation' };
      for (const [k, col] of Object.entries(fields)) {
        if (b[k] !== undefined) { params.push(b[k]); updates.push(`${col} = $${params.length}`); }
      }
      if (b.criteria !== undefined) { params.push(JSON.stringify(b.criteria)); updates.push(`criteria = $${params.length}::jsonb`); }
      if (b.score !== undefined) {
        params.push(Math.max(0, Number(b.score) || 0));
        updates.push(`score = $${params.length}`);
        updates.push(`evaluated_at = NOW()`);
      }
      const { rows } = await pool.query(
        `UPDATE "StemMilestone" SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );
      return res.json({ milestone: rows[0] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/teacher/stem-projects/:projectId/milestones/:msId', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      if (!await _verifyTeacherOwnsProject(pool, req.params.projectId, myIds)) {
        return res.status(403).json({ error: 'Chỉ GV mới xoá phase' });
      }
      await pool.query(`DELETE FROM "StemMilestone" WHERE id = $1 AND project_id = $2`,
        [req.params.msId, req.params.projectId]);
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  });

  // ── DASHBOARD — full project state cho GV monitor ──
  app.get('/api/teacher/stem-projects/:id/dashboard', async (req, res) => {
    const decoded = stemAuth(req, res); if (!decoded) return;
    try {
      await _ensureStemTables();
      const pool = _getPool();
      const myIds = stemMyIds(decoded);
      const isOwner = await _verifyTeacherOwnsProject(pool, req.params.id, myIds);
      const isMember = !isOwner && await _verifyStudentMember(pool, req.params.id, myIds);
      if (!isOwner && !isMember) return res.status(403).json({ error: 'Không có quyền' });

      const [project, members, tasks, logs, feedbacks, milestones] = await Promise.all([
        pool.query(`SELECT * FROM "StemProject" WHERE id = $1`, [req.params.id]),
        pool.query(`
          SELECT m.*, u.name, u.email, u.image
          FROM "StemProjectMember" m
          LEFT JOIN "User" u ON u.id = m.student_id
          WHERE m.project_id = $1 AND m.status = 'active'
          ORDER BY m.joined_at DESC
        `, [req.params.id]),
        pool.query(`SELECT * FROM "StemTask" WHERE project_id = $1
                    ORDER BY priority DESC, due_date ASC NULLS LAST`, [req.params.id]),
        pool.query(`
          SELECT l.*, u.name AS student_name, u.image AS student_image,
                 (SELECT COUNT(*) FROM "StemFeedback" f
                  WHERE f.target_type = 'log' AND f.target_id = l.id)::int AS feedback_count
          FROM "StemProgressLog" l
          LEFT JOIN "User" u ON u.id = l.student_id
          WHERE l.project_id = $1
          ORDER BY l.log_date DESC, l.created_at DESC LIMIT 50
        `, [req.params.id]),
        pool.query(`
          SELECT f.*, u.name AS author_name, u.image AS author_image
          FROM "StemFeedback" f
          LEFT JOIN "User" u ON u.id = f.author_id
          WHERE f.project_id = $1
          ORDER BY f.created_at DESC LIMIT 50
        `, [req.params.id]),
        pool.query(`SELECT * FROM "StemMilestone" WHERE project_id = $1
                    ORDER BY phase_order ASC, due_date ASC NULLS LAST`, [req.params.id]),
      ]);

      // Aggregate stats
      const allTasks = tasks.rows;
      const stats = {
        members: members.rows.length,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.status === 'completed').length,
        inProgressTasks: allTasks.filter(t => t.status === 'in-progress').length,
        overdueTasks: allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
        totalLogs: logs.rows.length,
        totalHours: logs.rows.reduce((s, l) => s + (Number(l.hours_spent) || 0), 0),
        completedMilestones: milestones.rows.filter(m => m.status === 'completed').length,
        totalMilestones: milestones.rows.length,
        avgPhaseScore: (() => {
          const scored = milestones.rows.filter(m => m.score != null);
          if (scored.length === 0) return null;
          return Math.round(scored.reduce((s, m) => s + (Number(m.score) / Number(m.max_score) * 10), 0) / scored.length * 10) / 10;
        })(),
      };

      return res.json({
        project: project.rows[0] || null,
        members: members.rows,
        tasks: allTasks,
        logs: logs.rows,
        feedbacks: feedbacks.rows,
        milestones: milestones.rows,
        stats,
        isOwner,
      });
    } catch (e) {
      console.error('[stem:dashboard]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });
})();

// ── /api/teacher/* → teacher-service (sẽ chỉ chạy cho paths chưa có stub) ──
// LƯU Ý: pathFilter '/api/teacher' là string prefix match → cả /api/teachers/...
// cũng bị catch. Mọi /api/teachers/* handler PHẢI đăng ký TRƯỚC line này.
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

  // ── POST /api/instructor/courses — tạo khoá học ───────────
  app.post('/api/instructor/courses', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const b = req.body || {};
      const title = String(b.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề khoá học' });

      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const pool = getIPool();

      // Verify categoryId exists, else null (tránh FK violation)
      let categoryId = b.categoryId || null;
      if (categoryId) {
        const { rowCount } = await pool.query(`SELECT 1 FROM "Category" WHERE id = $1`, [categoryId]);
        if (!rowCount) categoryId = null;
      }

      const description = b.overview != null ? String(b.overview) : null;
      const imageUrl    = b.image    != null ? String(b.image)    : null;
      const price       = b.regularPrice != null ? Number(b.regularPrice) : 0;

      const { rows } = await pool.query(
        `INSERT INTO "Course" (id, "userId", "schoolId", title, description, "imageUrl",
                               price, "isPublished", "categoryId", "createdAt", "updatedAt")
         VALUES ($1, $2, 'default-school', $3, $4, $5, $6, false, $7, NOW(), NOW())
         RETURNING *`,
        [id, userId, title.slice(0, 500), description, imageUrl, price, categoryId]
      );

      const row = rows[0];
      const [chapRows, purchRows, userRow, catRow] = await Promise.all([
        pool.query(`SELECT id, "isPublished" AS ispublished FROM "Chapter" WHERE "courseId" = $1`, [id]),
        pool.query(`SELECT id FROM "Purchase" WHERE "courseId" = $1`, [id]),
        pool.query(`SELECT name, image FROM "User" WHERE id = $1`, [userId]),
        categoryId ? pool.query(`SELECT id, name FROM "Category" WHERE id = $1`, [categoryId]) : Promise.resolve({ rows: [] }),
      ]);
      const fullRow = {
        ...row,
        userName: userRow.rows[0]?.name || null,
        userImage: userRow.rows[0]?.image || null,
      };
      console.log(`[instructor:create] ✅ Course ${id} for user ${userId}`);
      return res.status(201).json(mapCourse(fullRow, catRow.rows[0] || null, purchRows.rows, chapRows.rows));
    } catch (err) {
      console.error('[instructor:create] ❌', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PATCH /api/instructor/courses/:id — cập nhật khoá học ──
  app.patch('/api/instructor/courses/:id', async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const b = req.body || {};
      const updates = ['"updatedAt" = NOW()'];
      const params = [req.params.id, userId];
      const push = (col, val) => { params.push(val); updates.push(`"${col}" = $${params.length}`); };

      if (b.title       !== undefined) push('title',       String(b.title).slice(0, 500));
      if (b.overview    !== undefined) push('description', b.overview != null ? String(b.overview) : null);
      if (b.image       !== undefined) push('imageUrl',    b.image    != null ? String(b.image)    : null);
      if (b.regularPrice !== undefined) push('price',      b.regularPrice != null ? Number(b.regularPrice) : 0);
      if (b.categoryId  !== undefined) {
        let cid = b.categoryId || null;
        if (cid) {
          const pool = getIPool();
          const { rowCount } = await pool.query(`SELECT 1 FROM "Category" WHERE id = $1`, [cid]);
          if (!rowCount) cid = null;
        }
        push('categoryId', cid);
      }

      const pool = getIPool();
      const { rows } = await pool.query(
        `UPDATE "Course" SET ${updates.join(', ')}
         WHERE id = $1 AND "userId" = $2 RETURNING *`,
        params
      );
      if (!rows[0]) return res.status(404).json({ error: 'Không tìm thấy khoá học' });

      const row = rows[0];
      const [chapRows, purchRows, userRow, catRow] = await Promise.all([
        pool.query(`SELECT id, "isPublished" AS ispublished FROM "Chapter" WHERE "courseId" = $1`, [row.id]),
        pool.query(`SELECT id FROM "Purchase" WHERE "courseId" = $1`, [row.id]),
        pool.query(`SELECT name, image FROM "User" WHERE id = $1`, [userId]),
        row.categoryId ? pool.query(`SELECT id, name FROM "Category" WHERE id = $1`, [row.categoryId]) : Promise.resolve({ rows: [] }),
      ]);
      const fullRow = { ...row, userName: userRow.rows[0]?.name || null, userImage: userRow.rows[0]?.image || null };
      console.log(`[instructor:patch] ✅ Course ${row.id}`);
      return res.json(mapCourse(fullRow, catRow.rows[0] || null, purchRows.rows, chapRows.rows));
    } catch (err) {
      console.error('[instructor:patch] ❌', err.message);
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
  // POST /api/questions/claim-orphan — claim ownership các câu hỏi import bằng
  // JWT cũ (teacher_id='teacher-user') cho user hiện tại. Chỉ áp dụng cho các
  // câu được tạo trong 7 ngày gần nhất (avoid claim toàn bộ orphan DB).
  app.post('/api/questions/claim-orphan', async (req, res) => {
    const auth = req.headers.authorization || '';
    let userId = null;
    if (auth.startsWith('Bearer ')) {
      try {
        const d = _akVerify(auth.slice(7));
        userId = d.userId || d.id || d.sub;
      } catch {}
    }
    if (!userId || userId === 'teacher-user') {
      return res.status(401).json({ error: 'Cần đăng nhập với tài khoản thật (UUID)' });
    }
    try {
      const pool = getQPool();
      const { rowCount } = await pool.query(`
        UPDATE "Question"
        SET teacher_id = $1, "createdBy" = $1
        WHERE teacher_id IN ('teacher-user', 'teacher')
          AND "createdAt" >= NOW() - INTERVAL '7 days'
      `, [userId]);
      console.log(`[claim-orphan] user=${userId} claimed ${rowCount} questions`);
      return res.json({ ok: true, claimed: rowCount });
    } catch (e) {
      console.error('[claim-orphan]', e.message);
      return res.status(500).json({ error: 'Lỗi claim ownership' });
    }
  });

  app.post('/api/questions/batch', async (req, res) => {
    // Auth: lấy userId thực từ Bearer — ưu tiên decoded.userId/id, fallback sub
    const auth = req.headers.authorization || '';
    let userId = null;
    let decodedDebug = null;
    if (auth.startsWith('Bearer ')) {
      try {
        const decoded = _akVerify(auth.slice(7));
        decodedDebug = { sub: decoded.sub, userId: decoded.userId, id: decoded.id, email: decoded.email, role: decoded.role };
        userId = decoded.userId || decoded.id || decoded.sub;
      } catch (e) {
        console.warn('[questions:batch] JWT verify failed:', e.message);
      }
    } else {
      console.warn('[questions:batch] No Bearer header');
    }
    if (!userId) {
      console.warn('[questions:batch] No userId from JWT, decoded=', decodedDebug);
      return res.status(401).json({ success: false, error: 'Unauthorized — login lại' });
    }
    // Cho phép literal 'teacher-user' (legacy account) — không reject, chỉ log warning
    if (userId === 'teacher-user' || userId === 'teacher' || userId === 'anon') {
      console.warn('[questions:batch] WARN: legacy userId=', userId, '— consider re-login for clean ownership');
    }

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

  // ── POST /api/questions/fix-latex — bulk scan + auto-fix LaTeX lỗi phổ biến ──
  // Body: { limit?: number=500, subject?: string }
  // Response: { data: { scanned, fixed } }
  function _fixLatexString(s) {
    if (typeof s !== 'string' || !s) return { out: s, changed: false };
    let out = s;
    // 1. Smart quotes → straight (LaTeX nuốt curly quotes)
    out = out.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
    // 2. Unicode minus / en-dash / em-dash → ASCII -
    out = out.replace(/[−–—]/g, '-');
    // 3. Common typo: \fra{...}{...} → \frac, \frqc → \frac
    out = out.replace(/\\fra(?=[^c])/g, '\\frac').replace(/\\frqc\b/g, '\\frac');
    // 4. \sqrtX → \sqrt{X} (single char or {...})
    out = out.replace(/\\sqrt(\d)/g, '\\sqrt{$1}');
    // 5. Bare ^ / _ ở math mode follow by 2+ chars chưa có {} → wrap
    //    VD: x^23 → x^{23}, x_ab → x_{ab}. Chỉ apply khi đã nằm trong $...$
    //    (đơn giản: apply cho dollar segments)
    out = out.replace(/(\$[^$]*\$)/g, (seg) => {
      return seg
        .replace(/([a-zA-Z\d])\^([a-zA-Z0-9]{2,})/g, '$1^{$2}')
        .replace(/([a-zA-Z\d])_([a-zA-Z0-9]{2,})/g, '$1_{$2}');
    });
    // 6. Mathit triple-dot ⋯ ⋅ ⋮ → \cdots / \cdot / \vdots
    out = out.replace(/⋯/g, '\\cdots').replace(/⋅/g, '\\cdot').replace(/⋮/g, '\\vdots');
    // 7. Degree symbol ° → ^{\circ} khi nằm sau số trong math
    out = out.replace(/(\$[^$]*\$)/g, (seg) => seg.replace(/(\d)°/g, '$1^{\\circ}'));
    // 8. Greek letters viết tắt: \pi (giữ nguyên), nhưng \Pi typo Pi → \Pi
    //    (skip — quá rủi ro false-positive)
    // 9. Multiple spaces → single (chỉ ngoài math segments)
    out = out.replace(/  +/g, ' ');
    return { out, changed: out !== s };
  }

  app.post('/api/questions/fix-latex', async (req, res) => {
    try {
      const pool = getQPool();
      const limit = Math.min(Number(req.body?.limit) || 500, 5000);
      const subject = req.body?.subject ? String(req.body.subject) : null;

      const params = [];
      let where = '1=1';
      if (subject) { params.push(subject); where += ` AND subject = $${params.length}`; }
      params.push(limit);
      const { rows } = await pool.query(
        `SELECT id, content, explanation, options FROM "Question"
         WHERE ${where} ORDER BY "createdAt" DESC LIMIT $${params.length}`,
        params);

      let scanned = 0, fixed = 0;
      for (const r of rows) {
        scanned++;
        const c = _fixLatexString(r.content || '');
        const e = _fixLatexString(r.explanation || '');
        let optionsChanged = false;
        let nextOptions = r.options;
        if (Array.isArray(r.options)) {
          const out = r.options.map(o => {
            if (typeof o === 'string') {
              const f = _fixLatexString(o);
              if (f.changed) optionsChanged = true;
              return f.out;
            } else if (o && typeof o === 'object' && typeof o.text === 'string') {
              const f = _fixLatexString(o.text);
              if (f.changed) optionsChanged = true;
              return { ...o, text: f.out };
            }
            return o;
          });
          if (optionsChanged) nextOptions = out;
        }
        if (c.changed || e.changed || optionsChanged) {
          await pool.query(
            `UPDATE "Question" SET content = $1, explanation = $2, options = $3::jsonb, "updatedAt" = NOW()
             WHERE id = $4`,
            [c.out, e.out, JSON.stringify(nextOptions || []), r.id]);
          fixed++;
        }
      }
      console.log(`[questions:fix-latex] scanned=${scanned} fixed=${fixed} subject=${subject || 'all'}`);
      return res.json({ data: { scanned, fixed } });
    } catch (err) {
      console.error('[questions:fix-latex] ❌', err.message);
      return res.status(500).json({ error: err.message });
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

  const _aiGating = require('./lib/gating.cjs');
  // User: "Rà soát lại toàn bộ dịch vụ AI ... Giáo viên có thể sử dụng dịch
  // vụ AI 20 lần/ngày. Nếu hết thì chuyển sang chữ đăng ký Pro"
  // → Bỏ gating ai_tutor paid (cũ block GV free).
  // → Dùng cùng AiQuotaLog với /api/ai/generate-questions.
  // → Admin + Pro unlimited; Free 20/day shared across ALL AI services.
  app.post('/api/ai-tutor/chat', async (req, res) => {
    const startedAt = Date.now();
    try {
      // Auth
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized', reply: 'Đăng nhập trước khi dùng AI Tutor' });
      let decoded;
      try { decoded = _akVerify(auth.slice(7)); }
      catch { return res.status(401).json({ error: 'invalid_token', reply: 'Token không hợp lệ' }); }

      // Unified quota (chung với /api/ai/generate-questions, /api/questions/bulk-generate)
      const quotaCheck = await _checkAiQuestionGenQuota(decoded);
      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: 'quota_exceeded',
          reply: `Đã dùng hết ${quotaCheck.limit} lượt AI miễn phí hôm nay. Đăng ký Pro để dùng không giới hạn.`,
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          retryAt: quotaCheck.retryAt,
          upgradeUrl: '/payment?plan=pro&feature=ai_tutor',
        });
      }

      const body = req.body || {};
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const subject = typeof body.subject === 'string' ? body.subject : '';
      const history = normaliseHistory(body.history);

      if (!message) {
        return res.status(400).json({ error: 'message_required', reply: 'Câu hỏi không được để trống.' });
      }

      // Ensure the final message from the user is the new query. If history
      // already ends with the current user message we don't duplicate it.
      const messages = [...history];
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
        messages.push({ role: 'user', content: message });
      }

      // ── Provider routing: DEEPSEEK PRIMARY → Claude FALLBACK ──
      // User: "Rà soát lại toàn bộ dịch vụ AI, chuyển sang ưu tiên deepseek
      // rồi mới đến Claude" — DeepSeek primary cho mọi AI service.
      // Override: AI_PREFERRED_PROVIDER=anthropic → trở về Claude primary
      const prefProvider = (process.env.AI_PREFERRED_PROVIDER || 'deepseek').toLowerCase();
      const useDeepseek = (prefProvider !== 'anthropic' && process.env.DEEPSEEK_API_KEY) ||
                          (!process.env.ANTHROPIC_API_KEY && process.env.DEEPSEEK_API_KEY);

      if (useDeepseek) {
        try {
          const dsModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
          const dsMessages = [
            { role: 'system', content: buildSystemPrompt(subject) },
            ...messages,
          ];
          const dsResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: dsModel,
              messages: dsMessages,
              max_tokens: AI_TUTOR_MAX_TOKENS,
              temperature: 0.5,
            }),
          });
          if (!dsResp.ok) {
            const errText = await dsResp.text().catch(() => '');
            throw new Error(`DeepSeek HTTP ${dsResp.status}: ${errText.slice(0, 200)}`);
          }
          const dsJson = await dsResp.json();
          const reply = (dsJson.choices?.[0]?.message?.content || '').trim()
            || 'Xin lỗi, tôi chưa tạo được câu trả lời. Bạn thử đặt lại câu hỏi nhé.';
          const latencyMs = Date.now() - startedAt;
          console.log(`[ai-tutor] ok provider=deepseek model=${dsModel} subject="${subject}" latency=${latencyMs}ms tokens=${dsJson.usage?.completion_tokens || '?'}`);
          return res.json({
            reply, model: dsModel, usage: dsJson.usage || null, provider: 'deepseek',
            quota: {
              used: quotaCheck.used,
              limit: quotaCheck.limit === Infinity ? null : quotaCheck.limit,
              remaining: quotaCheck.remaining === Infinity ? null : quotaCheck.remaining,
              source: quotaCheck.source,
            },
          });
        } catch (e) {
          console.error('[ai-tutor:deepseek]', e.message);
          // Fall through to Anthropic if Anthropic key tồn tại
          if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(503).json({
              error: 'ai_unavailable',
              reply: 'Dịch vụ AI hiện chưa sẵn sàng (DeepSeek lỗi, Anthropic chưa cấu hình).',
            });
          }
        }
      }

      // ── Anthropic Claude (default) ──
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
      console.log(`[ai-tutor] ok provider=anthropic model=${AI_TUTOR_MODEL} subject="${subject}" latency=${latencyMs}ms tokens=${completion.usage ? completion.usage.output_tokens : '?'}`);

      return res.json({
        reply,
        model: completion.model || AI_TUTOR_MODEL,
        usage: completion.usage || null,
        provider: 'anthropic',
        quota: {
          used: quotaCheck.used,
          limit: quotaCheck.limit === Infinity ? null : quotaCheck.limit,
          remaining: quotaCheck.remaining === Infinity ? null : quotaCheck.remaining,
          source: quotaCheck.source,
        },
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

  // ══════════════════════════════════════════════════════════════
  // POST /api/ai/generate-questions
  // Sinh câu hỏi JSON từ topic do GV mô tả — dùng cho Question Bank import.
  //
  // Body:
  //   topic: string (chủ đề/yêu cầu — bắt buộc)
  //   count: number (mặc định 5, max 20)
  //   subject?: 'Vật lí' | 'Toán' | 'Hoá học' | ...
  //   grade?: '10' | '11' | '12'
  //   difficulty?: 'easy' | 'medium' | 'hard'
  //   types?: ['MCQ', 'MULTIPLE_TF', 'SHORT_ANSWER', 'TRUE_FALSE', 'ESSAY']
  //
  // Response:
  //   { questions: [...], json: stringified, provider, model, usage }
  //
  // System prompt force JSON output theo schema ImportModal expect.
  // ══════════════════════════════════════════════════════════════
  function buildQuestionGenPrompt() {
    return [
      'Bạn là chuyên gia ra đề trắc nghiệm cho học sinh THPT Việt Nam.',
      'Nhiệm vụ: Sinh các câu hỏi theo định dạng JSON CHÍNH XÁC để import vào Ngân hàng câu hỏi.',
      '',
      'CẤU TRÚC JSON BẮT BUỘC (output PHẢI là JSON object, không thêm text giải thích bên ngoài):',
      '```',
      '{',
      '  "questions": [',
      '    {',
      '      "questionType": "MCQ" | "MULTIPLE_TF" | "SHORT_ANSWER" | "TRUE_FALSE" | "ESSAY",',
      '      "content": "Nội dung câu hỏi (hỗ trợ LaTeX inline $x^2$ hoặc block $$\\\\int...$$)",',
      '      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],  // chỉ cho MCQ và MULTIPLE_TF',
      '      "correctAnswer": "A" | "B" | "C" | "D"  // cho MCQ',
      '                     | "Đúng,Sai,Đúng,Sai"   // cho MULTIPLE_TF (4 mệnh đề)',
      '                     | "1414"                  // cho SHORT_ANSWER (4 ký tự số, đề THPT QG)',
      '                     | "đáp án mẫu..."         // cho ESSAY',
      '      "subject": "Vật lí" | "Toán" | "Hoá học" | ...,',
      '      "grade": "10" | "11" | "12",',
      '      "difficulty": "easy" | "medium" | "hard",',
      '      "topic": "Chủ đề ngắn gọn",',
      '      "explanation": "Lời giải / giải thích chi tiết"',
      '    }',
      '  ]',
      '}',
      '```',
      '',
      'QUY TẮC:',
      '1. JSON output PHẢI parse được — KHÔNG dùng markdown ```json fence trong response.',
      '2. Subject dùng chuẩn TT 32/2018 GDPT: "Vật lí" (không "Vật lý"), "Hoá học" (không "Hóa học").',
      '3. Câu MCQ: đúng 4 options A-D, correctAnswer là 1 ký tự A/B/C/D.',
      '4. Câu MULTIPLE_TF (Đúng/Sai 4 mệnh đề chuẩn THPT 2025): 4 options là 4 mệnh đề,',
      '   correctAnswer = "Đúng,Sai,Đúng,Sai" (cách nhau dấu phẩy, mỗi vị trí ứng 1 mệnh đề).',
      '5. Câu SHORT_ANSWER (trả lời ngắn chuẩn THPT QG): correctAnswer là chuỗi 4 ký tự số.',
      '6. LaTeX: bọc trong $...$ (inline) hoặc $$...$$ (block) — escape backslash: \\\\frac, \\\\sqrt.',
      '7. Difficulty cân bằng: 30% easy + 50% medium + 20% hard (trừ khi user yêu cầu khác).',
      '8. Câu hỏi phải đúng kiến thức chuẩn SGK, không bịa.',
      '9. explanation chi tiết để GV hiểu cách giải.',
      '10. Tránh trùng câu hỏi — mỗi câu test 1 khái niệm khác.',
    ].join('\n');
  }

  function buildQuestionGenUserMsg(topic, opts) {
    const count = Math.max(1, Math.min(20, Number(opts.count) || 5));
    const subject = opts.subject ? `Môn: ${opts.subject}` : '';
    const grade = opts.grade ? `Lớp: ${opts.grade}` : '';
    const difficulty = opts.difficulty ? `Độ khó: ${opts.difficulty}` : '';
    const types = Array.isArray(opts.types) && opts.types.length > 0
      ? `Loại câu: ${opts.types.join(', ')}` : '';
    return [
      `Hãy sinh ${count} câu hỏi với yêu cầu:`,
      `Chủ đề: ${topic}`,
      subject, grade, difficulty, types,
      '',
      'Trả về JSON OBJECT theo schema { "questions": [...] } — KHÔNG kèm markdown fence hay text giải thích bên ngoài JSON.',
    ].filter(Boolean).join('\n');
  }

  // Extract JSON từ response (AI đôi khi vẫn kèm fence dù bị cấm)
  function extractJson(text) {
    if (!text) return null;
    let s = String(text).trim();
    // Remove markdown fence nếu có
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    // Find first { và last } cho safety
    const firstBrace = s.indexOf('{');
    const lastBrace = s.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
    }
    try { return JSON.parse(s); } catch { return null; }
  }

  // ── AiQuotaLog table — daily quota tracking ──
  // User: "tính năng AI cho việc ra đề ... cho free với tài khoản giáo viên
  // bình thường được gen 20 lần/ngày"
  // → Decouple từ entitlements (ai_tutor gating cũ là paid)
  // → Free 20/day per teacher account
  // → Admin + Pro plan teacher: unlimited
  let _aiQuotaTableReady = false;
  async function _ensureAiQuotaTable() {
    if (_aiQuotaTableReady) return;
    try {
      const pool = _getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "AiQuotaLog" (
          user_id  VARCHAR(255) NOT NULL,
          feature  VARCHAR(50)  NOT NULL,
          day      DATE         NOT NULL,
          count    INTEGER      DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (user_id, feature, day)
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_aiquota_day ON "AiQuotaLog"(day DESC)`);
      _aiQuotaTableReady = true;
    } catch (e) { console.warn('[ai-quota] migration:', e.message); }
  }
  _ensureAiQuotaTable().catch(() => {});

  const AI_GEN_QUOTA_DAILY = parseInt(process.env.AI_GEN_QUOTA_DAILY || '20', 10);

  // Check + increment quota atomically. Returns:
  //   { allowed: true, used, limit, remaining, source: 'admin'|'paid'|'free' }
  //   { allowed: false, used, limit, retryAt }
  async function _checkAiQuestionGenQuota(decoded) {
    // Admin bypass
    if (decoded.role === 'ADMIN') {
      return { allowed: true, used: 0, limit: Infinity, remaining: Infinity, source: 'admin' };
    }
    // Pro plan teacher bypass — check entitlement quiz_generate
    try {
      const userKey = decoded.sub || decoded.userId || decoded.email;
      const entitlements = require('./lib/entitlements.cjs');
      const hasPaid = await entitlements.hasFeature(userKey, 'quiz_generate').catch(() => false);
      if (hasPaid) {
        return { allowed: true, used: 0, limit: Infinity, remaining: Infinity, source: 'paid' };
      }
    } catch { /* fall through */ }

    // Free tier: 20/day check via AiQuotaLog
    await _ensureAiQuotaTable();
    const pool = _getPool();
    const userKey = decoded.sub || decoded.userId || decoded.email;
    const feature = 'ai_question_gen';

    const { rows } = await pool.query(
      `SELECT count FROM "AiQuotaLog"
       WHERE user_id = $1 AND feature = $2 AND day = CURRENT_DATE`,
      [userKey, feature]).catch(() => ({ rows: [] }));
    const used = rows[0]?.count || 0;

    if (used >= AI_GEN_QUOTA_DAILY) {
      // Reset thời điểm: 00:00 mai
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      return {
        allowed: false,
        used, limit: AI_GEN_QUOTA_DAILY,
        retryAt: tomorrow.toISOString(),
      };
    }

    // Increment atomically
    await pool.query(`
      INSERT INTO "AiQuotaLog"(user_id, feature, day, count, updated_at)
      VALUES ($1, $2, CURRENT_DATE, 1, NOW())
      ON CONFLICT (user_id, feature, day) DO UPDATE
        SET count = "AiQuotaLog".count + 1, updated_at = NOW()
    `, [userKey, feature]);

    return {
      allowed: true,
      used: used + 1,
      limit: AI_GEN_QUOTA_DAILY,
      remaining: AI_GEN_QUOTA_DAILY - used - 1,
      source: 'free',
    };
  }

  app.post('/api/ai/generate-questions', async (req, res) => {
    const startedAt = Date.now();
    try {
      // ── AUTH: cần login (any role nhưng nhắm GV/Admin) ──
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'unauthorized', message: 'Đăng nhập trước khi dùng AI' });
      }
      let decoded;
      try { decoded = _akVerify(auth.slice(7)); }
      catch { return res.status(401).json({ error: 'invalid_token', message: 'Token không hợp lệ' }); }

      // ── QUOTA: free GV 20/day, ADMIN + pro unlimited ──
      const quotaCheck = await _checkAiQuestionGenQuota(decoded);
      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: 'quota_exceeded',
          message: `Đã dùng hết ${quotaCheck.limit} lượt sinh câu hỏi AI miễn phí hôm nay. Reset lúc 0h00 mai.`,
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          retryAt: quotaCheck.retryAt,
          upgradeUrl: '/payment',
        });
      }

      const body = req.body || {};
      const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
      if (!topic || topic.length < 3) {
        return res.status(400).json({ error: 'topic_required', message: 'Vui lòng nhập chủ đề (tối thiểu 3 ký tự)' });
      }
      const opts = {
        count: body.count,
        subject: body.subject,
        grade: body.grade,
        difficulty: body.difficulty,
        types: body.types,
      };

      const system = buildQuestionGenPrompt();
      const userMsg = buildQuestionGenUserMsg(topic, opts);
      const maxTokens = parseInt(process.env.AI_GEN_MAX_TOKENS || '4000', 10);

      // ── DEEPSEEK PRIMARY + CLAUDE FALLBACK ──
      // User yêu cầu "Claude · DeepSeek": ưu tiên DeepSeek (rẻ + JSON mode),
      // fallback Claude nếu DeepSeek down (vd Insufficient Balance, timeout).
      // Đảm bảo service không vỡ khi DeepSeek hết credit / API issue tạm thời.
      let rawText = '';
      let provider = '';
      let model = '';
      let usage = null;
      let deepseekError = null;

      const hasDeepseek = !!process.env.DEEPSEEK_API_KEY;
      const hasClaude = !!process.env.ANTHROPIC_API_KEY;
      if (!hasDeepseek && !hasClaude) {
        return res.status(503).json({
          error: 'ai_not_configured',
          message: 'Cả DeepSeek và Claude đều chưa cấu hình. Liên hệ admin để bật.',
        });
      }

      // Try DeepSeek FIRST nếu có key
      if (hasDeepseek) {
        try {
          const dsModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
          const dsResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: dsModel,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: userMsg },
              ],
              max_tokens: maxTokens,
              temperature: 0.3,
              response_format: { type: 'json_object' },
            }),
          });
          if (!dsResp.ok) {
            const errText = await dsResp.text().catch(() => '');
            throw new Error(`DeepSeek HTTP ${dsResp.status}: ${errText.slice(0, 300)}`);
          }
          const dsJson = await dsResp.json();
          rawText = dsJson.choices?.[0]?.message?.content || '';
          provider = 'deepseek';
          model = dsModel;
          usage = dsJson.usage || null;
        } catch (deepseekErr) {
          deepseekError = deepseekErr.message;
          console.warn('[ai:generate-questions] DeepSeek failed, trying Claude fallback:', deepseekErr.message.slice(0, 150));
          // Don't return — fall through to Claude
        }
      }

      // Fallback Claude nếu DeepSeek fail HOẶC không có DeepSeek key
      if (!provider && hasClaude) {
        try {
          const client = getAnthropic();
          const completion = await client.messages.create({
            model: AI_TUTOR_MODEL,
            max_tokens: maxTokens,
            system: system + '\n\nIMPORTANT: Respond with ONLY valid JSON, no markdown fence, no explanation.',
            messages: [{ role: 'user', content: userMsg }],
          });
          if (Array.isArray(completion.content)) {
            for (const block of completion.content) {
              if (block && block.type === 'text' && typeof block.text === 'string') {
                rawText += block.text;
              }
            }
          }
          provider = 'anthropic';
          model = completion.model || AI_TUTOR_MODEL;
          usage = completion.usage || null;
        } catch (claudeErr) {
          console.error('[ai:generate-questions] Both providers failed. DS:', deepseekError, 'Claude:', claudeErr.message);
          return res.status(503).json({
            error: 'all_providers_failed',
            message: 'Cả DeepSeek và Claude đều không phản hồi. Thử lại sau ít phút.',
            deepseek: deepseekError ? deepseekError.slice(0, 200) : 'no key',
            claude: claudeErr.message.slice(0, 200),
          });
        }
      }

      // Nếu vẫn không có provider (chỉ DeepSeek key, DeepSeek fail, không có Claude)
      if (!provider) {
        return res.status(503).json({
          error: 'deepseek_unavailable_no_fallback',
          message: 'DeepSeek tạm dừng và chưa cấu hình Claude fallback. Liên hệ admin.',
          deepseek: deepseekError ? deepseekError.slice(0, 200) : 'unknown',
        });
      }

      const parsed = extractJson(rawText);
      if (!parsed || !Array.isArray(parsed.questions)) {
        console.warn('[ai:generate-questions] parse failed, raw=', rawText.slice(0, 300));
        return res.status(500).json({
          error: 'parse_failed',
          message: 'AI trả về dữ liệu không đúng format JSON. Thử lại với chủ đề rõ ràng hơn.',
          raw: rawText.slice(0, 1000),
        });
      }

      const questions = parsed.questions.filter(q => q && typeof q.content === 'string');
      const latencyMs = Date.now() - startedAt;
      const quotaInfo = quotaCheck.source === 'free'
        ? `used=${quotaCheck.used}/${quotaCheck.limit}`
        : quotaCheck.source;
      console.log(`[ai:generate-questions] ok provider=${provider} count=${questions.length} latency=${latencyMs}ms quota=${quotaInfo}`);

      return res.json({
        questions,
        json: JSON.stringify({ questions }, null, 2),
        count: questions.length,
        provider,
        model,
        usage,
        latencyMs,
        quota: {
          used: quotaCheck.used,
          limit: quotaCheck.limit === Infinity ? null : quotaCheck.limit,
          remaining: quotaCheck.remaining === Infinity ? null : quotaCheck.remaining,
          source: quotaCheck.source,  // 'admin' | 'paid' | 'free'
        },
      });
    } catch (err) {
      const status = err && err.status ? err.status : 500;
      console.error(`[ai:generate-questions] ❌ ${status} ${err.message}`);
      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: 'ai_error',
        message: err.message || 'Lỗi gọi AI sinh câu hỏi',
      });
    }
  });

  // GET /api/ai/generate-questions/quota — FE check quota trước khi gen
  // để hiển thị "Còn N/20 lượt hôm nay" trong UI
  app.get('/api/ai/generate-questions/quota', async (req, res) => {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    let decoded;
    try { decoded = _akVerify(auth.slice(7)); }
    catch { return res.status(401).json({ error: 'invalid_token' }); }

    try {
      // Admin
      if (decoded.role === 'ADMIN') {
        return res.json({ used: 0, limit: null, remaining: null, source: 'admin', unlimited: true });
      }
      // Paid plan
      const userKey = decoded.sub || decoded.userId || decoded.email;
      const entitlements = require('./lib/entitlements.cjs');
      const hasPaid = await entitlements.hasFeature(userKey, 'quiz_generate').catch(() => false);
      if (hasPaid) {
        return res.json({ used: 0, limit: null, remaining: null, source: 'paid', unlimited: true });
      }
      // Free — query AiQuotaLog
      await _ensureAiQuotaTable();
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT count FROM "AiQuotaLog"
         WHERE user_id = $1 AND feature = 'ai_question_gen' AND day = CURRENT_DATE`,
        [userKey]).catch(() => ({ rows: [] }));
      const used = rows[0]?.count || 0;
      const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
      return res.json({
        used,
        limit: AI_GEN_QUOTA_DAILY,
        remaining: Math.max(0, AI_GEN_QUOTA_DAILY - used),
        source: 'free',
        unlimited: false,
        resetAt: tomorrow.toISOString(),
      });
    } catch (e) {
      return res.json({
        used: 0, limit: AI_GEN_QUOTA_DAILY,
        remaining: AI_GEN_QUOTA_DAILY, source: 'free', unlimited: false,
        error: e.message,
      });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // POST /api/questions/bulk-generate
  // Sinh câu hỏi từ nhiều nguồn (text/youtube/website) — DeepSeek + Claude fallback
  // User: "Tích hợp deepseek vào AI ra để nhé"
  // Fix bug "aero-backend unavailable" trên /teacher/question-bank → BulkGenerateModal
  //
  // Body:
  //   subject, grade, count, questionTypes[], difficulty, cognitiveLevels[],
  //   sources: [{ type: 'text'|'youtube'|'website', content }]
  // Response: { questions: [...], data: { inserted, totalInBank }, provider }
  // ══════════════════════════════════════════════════════════════
  app.post('/api/questions/bulk-generate', async (req, res) => {
    const startedAt = Date.now();
    try {
      // Auth
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized', message: 'Đăng nhập trước' });
      let decoded;
      try { decoded = _akVerify(auth.slice(7)); }
      catch { return res.status(401).json({ error: 'invalid_token', message: 'Token không hợp lệ' }); }

      // Quota
      const quotaCheck = await _checkAiQuestionGenQuota(decoded);
      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: 'quota_exceeded',
          message: `Đã dùng hết ${quotaCheck.limit} lượt AI miễn phí hôm nay. Đăng ký Pro để dùng không giới hạn.`,
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          retryAt: quotaCheck.retryAt,
          upgradeUrl: '/payment?plan=pro&feature=quiz_generate',
        });
      }

      const b = req.body || {};
      const sources = Array.isArray(b.sources) ? b.sources : [];
      if (sources.length === 0) {
        return res.status(400).json({ error: 'no_sources', message: 'Vui lòng thêm ít nhất 1 nguồn (text/youtube/website)' });
      }
      const subject = b.subject || 'Toán';
      const grade = b.grade || '11';
      const count = Math.max(1, Math.min(30, Number(b.count) || 10));
      const questionTypes = Array.isArray(b.questionTypes) && b.questionTypes.length > 0
        ? b.questionTypes : ['MCQ'];
      const difficulty = b.difficulty || 'mixed';
      const cognitiveLevels = Array.isArray(b.cognitiveLevels) ? b.cognitiveLevels : [];

      // Combine sources content thành 1 corpus (max 8000 chars để tiết kiệm token)
      const corpus = sources.map(s => {
        const content = String(s.content || '').slice(0, 4000);
        return `--- Nguồn ${s.type || 'text'} ---\n${content}`;
      }).join('\n\n').slice(0, 8000);

      const system = buildQuestionGenPrompt() + '\n\nLƯU Ý: Sinh câu hỏi DỰA TRÊN nội dung nguồn được cung cấp, KHÔNG dùng kiến thức chung. Câu hỏi phải có nguồn gốc từ tài liệu này.';

      const cognitiveHint = cognitiveLevels.length > 0
        ? `Cấp độ Bloom: ${cognitiveLevels.join(', ')}` : '';
      const userMsg = [
        `Sinh ${count} câu hỏi cho HS lớp ${grade} môn ${subject}`,
        `Loại câu: ${questionTypes.join(', ')}`,
        `Độ khó: ${difficulty}`,
        cognitiveHint,
        '',
        '── NGUỒN NỘI DUNG ──',
        corpus,
        '',
        'Trả JSON OBJECT { "questions": [...] }. KHÔNG kèm markdown fence.',
      ].filter(Boolean).join('\n');

      const maxTokens = parseInt(process.env.AI_GEN_MAX_TOKENS || '4000', 10);
      let rawText = '';
      let provider = '';
      let model = '';

      // DeepSeek primary
      if (process.env.DEEPSEEK_API_KEY) {
        try {
          const dsModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
          const dsResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: dsModel,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: userMsg },
              ],
              max_tokens: maxTokens,
              temperature: 0.4,
              response_format: { type: 'json_object' },
            }),
          });
          if (!dsResp.ok) {
            const errText = await dsResp.text().catch(() => '');
            throw new Error(`DeepSeek HTTP ${dsResp.status}: ${errText.slice(0, 200)}`);
          }
          const dsJson = await dsResp.json();
          rawText = dsJson.choices?.[0]?.message?.content || '';
          provider = 'deepseek'; model = dsModel;
        } catch (e) {
          console.warn('[bulk-generate] DeepSeek fail, fallback Claude:', e.message.slice(0, 100));
        }
      }

      // Claude fallback
      if (!provider && process.env.ANTHROPIC_API_KEY) {
        try {
          const client = getAnthropic();
          const completion = await client.messages.create({
            model: AI_TUTOR_MODEL,
            max_tokens: maxTokens,
            system: system + '\n\nIMPORTANT: Respond with ONLY valid JSON.',
            messages: [{ role: 'user', content: userMsg }],
          });
          if (Array.isArray(completion.content)) {
            for (const block of completion.content) {
              if (block && block.type === 'text' && typeof block.text === 'string') {
                rawText += block.text;
              }
            }
          }
          provider = 'anthropic'; model = completion.model || AI_TUTOR_MODEL;
        } catch (e) {
          console.error('[bulk-generate] both providers fail:', e.message);
          return res.status(503).json({
            error: 'all_providers_failed',
            message: 'Cả DeepSeek và Claude đều không phản hồi. Thử lại sau.',
          });
        }
      }

      if (!provider) {
        return res.status(503).json({
          error: 'ai_not_configured',
          message: 'AI chưa cấu hình DEEPSEEK_API_KEY và ANTHROPIC_API_KEY.',
        });
      }

      const parsed = extractJson(rawText);
      if (!parsed || !Array.isArray(parsed.questions)) {
        return res.status(500).json({
          error: 'parse_failed',
          message: 'AI trả về dữ liệu không đúng format JSON. Thử lại với nguồn rõ ràng hơn.',
        });
      }

      const questions = parsed.questions.filter(q => q && typeof q.content === 'string');
      const latencyMs = Date.now() - startedAt;
      console.log(`[bulk-generate] ok provider=${provider} sources=${sources.length} count=${questions.length} latency=${latencyMs}ms`);

      // FE expects { data: { questions, inserted, totalInBank } }
      return res.json({
        success: true,
        data: {
          questions,
          inserted: 0,  // preview mode — not yet saved
          totalInBank: 0,
        },
        questions,  // backward compat
        count: questions.length,
        provider,
        model,
        latencyMs,
        quota: {
          used: quotaCheck.used,
          limit: quotaCheck.limit === Infinity ? null : quotaCheck.limit,
          remaining: quotaCheck.remaining === Infinity ? null : quotaCheck.remaining,
          source: quotaCheck.source,
        },
      });
    } catch (err) {
      console.error('[bulk-generate]', err.message);
      return res.status(500).json({ error: 'internal_error', message: err.message });
    }
  });

  // POST /api/questions/bulk-save — lưu câu hỏi đã chọn vào ngân hàng
  app.post('/api/questions/bulk-save', async (req, res) => {
    try {
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
      let decoded;
      try { decoded = _akVerify(auth.slice(7)); }
      catch { return res.status(401).json({ error: 'invalid_token' }); }

      const b = req.body || {};
      const questions = Array.isArray(b.questions) ? b.questions : [];
      if (questions.length === 0) return res.status(400).json({ error: 'no_questions' });

      const pool = _getPool();
      const { randomUUID } = require('crypto');
      let inserted = 0;
      for (const q of questions) {
        try {
          await pool.query(`
            INSERT INTO "Question"(
              id, content, type, options, answer, explanation,
              subject, grade, difficulty, topic, teacher_id, created_at
            ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, NOW())
          `, [
            randomUUID(),
            q.content || '',
            q.questionType || q.type || 'MCQ',
            JSON.stringify(q.options || []),
            q.correctAnswer || q.answer || '',
            q.explanation || null,
            q.subject || b.subject || null,
            q.grade || b.grade || null,
            q.difficulty || 'medium',
            q.topic || null,
            decoded.sub,
          ]);
          inserted++;
        } catch (e) {
          console.warn('[bulk-save] insert failed:', e.message.slice(0, 100));
        }
      }
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM "Question" WHERE teacher_id = $1`,
        [decoded.sub]
      ).catch(() => ({ rows: [{ n: 0 }] }));
      return res.json({ success: true, inserted, totalInBank: rows[0]?.n || 0 });
    } catch (e) {
      console.error('[bulk-save]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // POST /api/ark-bot/chat — Trợ lý floating chatbot SSE streaming
  // User: "trợ lý chưa hoạt động Trợ lý AeroEdu — Ark Bot · Giáo viên"
  //
  // Fix: BE chưa có endpoint → catch-all proxy → 503.
  // Implementation: DeepSeek streaming SSE → forward chunks tới client.
  // Same quota 20/day shared với mọi AI services + role-aware system prompt.
  // ══════════════════════════════════════════════════════════════
  function buildArkBotSystemPrompt(role) {
    const base = [
      'Bạn là Trợ lý AeroEdu — chatbot thông minh trên nền tảng inphysic.com.',
      'Trả lời ngắn gọn, thân thiện, dùng tiếng Việt. Dùng emoji vừa phải.',
      'Khi đề xuất action, gợi ý URL relative (vd "/teacher/exams", "/dashboard/graph-lab").',
    ];
    if (role === 'TEACHER') {
      return base.concat([
        '',
        'Vai trò người dùng: GIÁO VIÊN.',
        'Bạn có thể giúp:',
        '• Tư vấn phương pháp giảng dạy (active learning, blended, flipped classroom)',
        '• Soạn giáo án (gợi ý mở /teacher/lesson-plans)',
        '• Tạo đề thi (gợi ý /teacher/question-bank hoặc /teacher/latex-documents)',
        '• Phân tích kết quả HS (gợi ý /teacher/analytics, /teacher/gradebook)',
        '• Quản lý lớp (/teacher/classes, /teacher/student-requests)',
        '• Dự án STEM (/teacher/stem-projects)',
        '• Knowledge Graph chuyên môn (/teacher/knowledge-graph)',
        '',
        'Trả lời theo chuẩn TT 32/2018 GDPT (Vật lí, Hoá học...) và TT 22/2021 đánh giá.',
      ]).join('\n');
    }
    if (role === 'ADMIN') {
      return base.concat([
        '',
        'Vai trò người dùng: QUẢN TRỊ.',
        'Bạn có thể giúp:',
        '• Quản lý user (/admin/users, /admin/teachers, /admin/students)',
        '• Phân tích hệ thống (/admin/analytics, /admin/insights)',
        '• Vận hành (/admin/operations, /admin/audit-log)',
        '• Camera + IoT (/admin/camera-management, /admin/iot-management)',
      ]).join('\n');
    }
    // STUDENT default
    return base.concat([
      '',
      'Vai trò người dùng: HỌC SINH.',
      'Bạn có thể giúp:',
      '• Giải bài tập + giải thích bước-bước (LaTeX cho công thức)',
      '• Gợi ý lộ trình học (/student/dashboard, /student/exam-prep)',
      '• Tư vấn nghề nghiệp (/student/career)',
      '• Khoá học (/student/my-courses)',
      '• Chuẩn bị thi (/student/exam-prep, /student/exam-modes)',
    ]).join('\n');
  }

  app.post('/api/ark-bot/chat', async (req, res) => {
    try {
      // Auth
      const auth = req.headers.authorization || '';
      if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized', message: 'Đăng nhập trước' });
      let decoded;
      try { decoded = _akVerify(auth.slice(7)); }
      catch { return res.status(401).json({ error: 'invalid_token', message: 'Token không hợp lệ' }); }

      // Quota check (shared 20/day với mọi AI services)
      const quotaCheck = await _checkAiQuestionGenQuota(decoded);
      if (!quotaCheck.allowed) {
        return res.status(429).json({
          error: 'quota_exceeded',
          message: `Đã dùng hết ${quotaCheck.limit} lượt AI miễn phí hôm nay. Đăng ký Pro để dùng không giới hạn.`,
          used: quotaCheck.used,
          limit: quotaCheck.limit,
          retryAt: quotaCheck.retryAt,
          upgradeUrl: '/payment?plan=pro&feature=ai_tutor',
        });
      }

      const b = req.body || {};
      const messages = Array.isArray(b.messages) ? b.messages : [];
      const role = b.role || decoded.role || 'STUDENT';
      const wantStream = b.stream !== false;  // default stream

      if (messages.length === 0) {
        return res.status(400).json({ error: 'no_messages', message: 'Cần ít nhất 1 message' });
      }

      const system = buildArkBotSystemPrompt(role);
      const allMessages = [
        { role: 'system', content: system },
        ...messages.slice(-10).filter(m => m && m.role && m.content),
      ];

      if (!process.env.DEEPSEEK_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({
          error: 'ai_not_configured',
          message: 'AI chưa cấu hình. Liên hệ admin.',
        });
      }

      // Streaming via DeepSeek (OpenAI-compatible SSE)
      if (wantStream && process.env.DEEPSEEK_API_KEY) {
        try {
          const dsResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
              messages: allMessages,
              stream: true,
              temperature: 0.7,
              max_tokens: 1500,
            }),
          });
          if (!dsResp.ok) {
            const errText = await dsResp.text().catch(() => '');
            throw new Error(`DeepSeek HTTP ${dsResp.status}: ${errText.slice(0, 200)}`);
          }
          // Forward SSE stream tới client
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          // Pipe DeepSeek stream → client
          dsResp.body.on('data', chunk => res.write(chunk));
          dsResp.body.on('end', () => res.end());
          dsResp.body.on('error', err => {
            console.error('[ark-bot] stream error:', err.message);
            try { res.end(); } catch {}
          });
          return;
        } catch (e) {
          console.warn('[ark-bot] DeepSeek stream failed, fallback non-stream Claude:', e.message.slice(0, 100));
          // Fall through to Claude non-stream
        }
      }

      // Non-streaming Claude fallback
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const client = getAnthropic();
          const completion = await client.messages.create({
            model: AI_TUTOR_MODEL,
            max_tokens: 1500,
            system,
            messages: allMessages.filter(m => m.role !== 'system').map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          });
          let reply = '';
          if (Array.isArray(completion.content)) {
            for (const block of completion.content) {
              if (block && block.type === 'text') reply += block.text;
            }
          }
          // Return as fake-SSE chunk để client tương thích
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.write(`data: ${JSON.stringify({
            choices: [{ delta: { content: reply } }],
          })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        } catch (e) {
          console.error('[ark-bot] Claude fallback failed:', e.message);
        }
      }

      return res.status(503).json({
        error: 'all_providers_failed',
        message: 'AI provider không phản hồi. Thử lại sau ít phút.',
      });
    } catch (err) {
      console.error('[ark-bot]', err.message);
      return res.status(500).json({ error: 'internal_error', message: err.message });
    }
  });
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

      // community-stats — aggregate cho card "Cộng đồng đang luyện"
      if (action === 'community-stats') {
        try {
          const { rows } = await pool.query(`
            SELECT
              COUNT(DISTINCT "studentId")::int AS users,
              COUNT(*) FILTER (WHERE completed)::int AS sessions,
              COUNT(*) FILTER (WHERE completed AND "completedAt" >= NOW() - INTERVAL '1 day')::int AS today,
              COUNT(*) FILTER (WHERE completed AND "completedAt" >= NOW() - INTERVAL '7 day')::int AS week,
              COALESCE(AVG(percentage) FILTER (WHERE completed), 0)::int AS avg_score
            FROM "PracticeExam"
          `);
          const r = rows[0] || {};
          return res.json({
            success: true,
            users: r.users || 0,
            sessions: r.sessions || 0,
            today: r.today || 0,
            week: r.week || 0,
            avgScore: r.avg_score || 0,
          });
        } catch { return res.json({ success: true, users: 0, sessions: 0, today: 0, week: 0, avgScore: 0 }); }
      }

      return res.status(400).json({ success: false, error: 'invalid_action', received: action });
    } catch (err) {
      console.error('[exam-prep:GET] ❌', err.message);
      return res.status(500).json({ success: false, error: 'internal', message: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════
  // POST /api/agents/exam-prep  { action: 'create' | 'create_from_exam'
  //   | 'create_from_matrix' | 'submit' }
  // ══════════════════════════════════════════════════════════════
  app.post('/api/agents/exam-prep', require('./lib/gating.cjs').requireFeature('ai_examprep'), async (req, res) => {
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
// ASSIGNMENTS extras — /from-exam + /:id/targets (kết nối GV→lớp/HS)
// Phải nằm SAU block assignments chính (để table sẵn) + TRƯỚC catch-all
// ════════════════════════════════════════════════════════════════════════
;(() => {
  async function _ensureAsgnTargetTable() {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AssignmentTarget" (
        id              VARCHAR(36)  PRIMARY KEY,
        assignment_id   VARCHAR(255) NOT NULL,
        type            VARCHAR(20)  NOT NULL,
        target_id       VARCHAR(255) NOT NULL,
        label           VARCHAR(255),
        teacher_id      VARCHAR(255) NOT NULL,
        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('AssignmentTarget', [
      ['assignment_id', "VARCHAR(255)"],
      ['type',          "VARCHAR(20)"],
      ['target_id',     "VARCHAR(255)"],
      ['label',         "VARCHAR(255)"],
      ['teacher_id',    "VARCHAR(255)"],
      ['created_at',    "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('AssignmentTarget', ['assignmentId','type','targetType','targetId','label','teacherId','createdAt']);
    // Backfill nếu Rust service đã có legacy camelCase rows
    await _backfillSnakeFromCamel('AssignmentTarget', [
      ['assignment_id', ['assignmentId']],
      ['type',          ['targetType']],
      ['target_id',     ['targetId']],
      ['teacher_id',    ['teacherId']],
    ]);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_asgn_target ON "AssignmentTarget"(assignment_id, type, target_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_asgn_target_asgn ON "AssignmentTarget"(assignment_id)`);
  }
  _ensureAsgnTargetTable().catch(e => console.error('[assignment-targets] migration:', e.message));

  function _asgnAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  const _ids = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

  // Verify GV sở hữu assignment
  async function _ownsAsgn(assignmentId, decoded) {
    const pool = _getPool();
    const myIds = _ids(decoded);
    const { rowCount } = await pool.query(
      `SELECT 1 FROM assignments WHERE id = $1 AND (teacher_id = ANY($2::text[]) OR user_id = ANY($2::text[]))`,
      [assignmentId, myIds]);
    return rowCount > 0;
  }

  // POST /api/assignments/from-exam — tạo assignment từ Exam có sẵn
  app.post('/api/assignments/from-exam', async (req, res) => {
    const decoded = _asgnAuth(req, res); if (!decoded) return;
    try {
      const { examId, title: titleOverride, description, dueDate, duration } = req.body || {};
      if (!examId) return res.status(400).json({ error: 'Thiếu examId' });
      const pool = _getPool();
      const myIds = _ids(decoded);
      // Load Exam (chấp nhận cả snake_case lẫn camelCase legacy)
      const { rows: exams } = await pool.query(
        `SELECT * FROM "Exam" WHERE id = $1 LIMIT 1`, [examId]);
      if (!exams.length) return res.status(404).json({ error: 'Không tìm thấy đề thi' });
      const exam = exams[0];
      const examOwner = exam.teacher_id || exam.teacherId || exam.user_id || exam.userId;
      if (examOwner && !myIds.includes(examOwner)) {
        // Cho phép nếu exam public
        const isPublic = exam.visibility === 'public' || exam.is_public === true || exam.isPublic === true;
        if (!isPublic) return res.status(403).json({ error: 'Đề thi không thuộc quyền của bạn' });
      }
      const { randomBytes } = require('crypto');
      const id = 'asgn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      const qrToken = randomBytes(18).toString('base64url');
      const title = String(titleOverride || exam.title || 'Bài tập').slice(0, 500);
      const subj = exam.subject || 'Chung';
      const desc = String(description || exam.description || '').slice(0, 5000);
      const myId = decoded.userId || decoded.id || decoded.sub;
      const dur = Number(duration) || Number(exam.duration) || Number(exam.duration_minutes) || 45;
      const due = dueDate ? new Date(dueDate) : null;
      await pool.query(
        `INSERT INTO assignments
           (id, title, description, subject, assignment_type, status, difficulty,
            duration, xp_reward, user_id, teacher_id, qr_token, max_score, due_date,
            content, tags, ai_generated)
         VALUES ($1,$2,$3,$4,'quiz','published','medium',$5,150,$6,$6,$7,10,$8,$9,$10,false)`,
        [id, title, desc, subj, dur, myId, qrToken, due,
         JSON.stringify({ examId, source: 'from-exam' }),
         JSON.stringify(['từ-đề-thi'])]);
      const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      return res.status(201).json({
        id, title, description: desc, subject: subj, type: 'quiz', status: 'published',
        difficulty: 'medium', duration: dur, xpReward: 150, maxScore: 10,
        teacherId: myId, qrToken, scanUrl: `${proto}://${host}/a/${qrToken}`,
        dueDate: due ? due.toISOString() : null, content: '', tags: ['từ-đề-thi'],
        assignedAt: new Date().toISOString(), aiGenerated: false,
      });
    } catch (e) { console.error('[asgn:from-exam]', e.message); return res.status(500).json({ error: 'Lỗi tạo bài tập từ đề thi' }); }
  });

  // GET /api/assignments/:id/targets → { targets: [...] }
  app.get('/api/assignments/:id/targets', async (req, res) => {
    const decoded = _asgnAuth(req, res); if (!decoded) return;
    try {
      if (!(await _ownsAsgn(req.params.id, decoded))) return res.status(403).json({ error: 'Không có quyền' });
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT id, type, target_id AS "targetId", label, created_at AS "createdAt"
         FROM "AssignmentTarget" WHERE assignment_id = $1 ORDER BY created_at DESC`,
        [req.params.id]);
      return res.json({ targets: rows });
    } catch (e) { console.error('[asgn:targets:list]', e.message); return res.json({ targets: [] }); }
  });

  // POST /api/assignments/:id/targets — body: { classIds?: [], studentIds?: [] }
  app.post('/api/assignments/:id/targets', async (req, res) => {
    const decoded = _asgnAuth(req, res); if (!decoded) return;
    try {
      if (!(await _ownsAsgn(req.params.id, decoded))) return res.status(403).json({ error: 'Không có quyền' });
      const myId = decoded.userId || decoded.id || decoded.sub;
      const { classIds = [], studentIds = [] } = req.body || {};
      const pool = _getPool();
      const { randomUUID } = require('crypto');
      let added = 0;
      // Insert class targets — lookup label từ Class table
      for (const cid of classIds) {
        if (!cid) continue;
        const { rows: cls } = await pool.query(`SELECT name, grade FROM "Class" WHERE id = $1`, [cid]);
        const label = cls[0] ? `${cls[0].name}${cls[0].grade ? ' (Khối ' + cls[0].grade + ')' : ''}` : `Lớp ${cid.slice(0,8)}`;
        try {
          await pool.query(
            `INSERT INTO "AssignmentTarget"(id, assignment_id, type, target_id, label, teacher_id)
             VALUES ($1,$2,'class',$3,$4,$5)`,
            [randomUUID(), req.params.id, cid, label, myId]);
          added++;
        } catch (e) { if (e.code !== '23505') throw e; /* dup skip */ }
      }
      // Insert student targets — lookup label từ ClassStudent hoặc User
      for (const sid of studentIds) {
        if (!sid) continue;
        let label = `HS ${sid.slice(0,8)}`;
        try {
          const { rows: u } = await pool.query(`SELECT ho_ten FROM "ClassStudent" WHERE id = $1 LIMIT 1`, [sid]);
          if (u[0]?.ho_ten) label = u[0].ho_ten;
          else {
            const { rows: u2 } = await pool.query(`SELECT name, email FROM "User" WHERE id = $1 LIMIT 1`, [sid]);
            if (u2[0]) label = u2[0].name || u2[0].email || label;
          }
        } catch { /* ignore lookup err */ }
        try {
          await pool.query(
            `INSERT INTO "AssignmentTarget"(id, assignment_id, type, target_id, label, teacher_id)
             VALUES ($1,$2,'student',$3,$4,$5)`,
            [randomUUID(), req.params.id, sid, label, myId]);
          added++;
        } catch (e) { if (e.code !== '23505') throw e; }
      }
      // TODO: notification cho HS — hiện chưa wire vào notifications table
      return res.json({ ok: true, added, notified: 0 });
    } catch (e) { console.error('[asgn:targets:add]', e.message); return res.status(500).json({ error: 'Lỗi giao bài' }); }
  });

  // DELETE /api/assignments/:id/targets/:type/:targetId
  app.delete('/api/assignments/:id/targets/:type/:targetId', async (req, res) => {
    const decoded = _asgnAuth(req, res); if (!decoded) return;
    try {
      if (!(await _ownsAsgn(req.params.id, decoded))) return res.status(403).json({ error: 'Không có quyền' });
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "AssignmentTarget" WHERE assignment_id = $1 AND type = $2 AND target_id = $3`,
        [req.params.id, req.params.type, decodeURIComponent(req.params.targetId)]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy target' });
      return res.json({ ok: true });
    } catch (e) { console.error('[asgn:targets:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá target' }); }
  });
})();

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

// ── Document Digitization (/teacher/document-digitization) ──
// TRƯỚC proxy media-service — media-service offline → đăng ký Node.js handlers.
;(() => {
  async function _ensureDocTable() {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Document" (
        id            VARCHAR(36)  PRIMARY KEY,
        teacher_id    VARCHAR(255) NOT NULL,
        filename      VARCHAR(500) NOT NULL,
        display_name  VARCHAR(500),
        gcs_url       TEXT,
        gcs_path      VARCHAR(1000),
        mime_type     VARCHAR(100),
        size_bytes    BIGINT,
        status        VARCHAR(50)  DEFAULT 'pending',
        page_count    INTEGER,
        ocr_text      TEXT,
        metadata      JSONB,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('Document', [
      ['teacher_id',   "VARCHAR(255)"],
      ['filename',     "VARCHAR(500)"],
      ['display_name', "VARCHAR(500)"],
      ['gcs_url',      "TEXT"],
      ['gcs_path',     "VARCHAR(1000)"],
      ['mime_type',    "VARCHAR(100)"],
      ['size_bytes',   "BIGINT"],
      ['status',       "VARCHAR(50) DEFAULT 'pending'"],
      ['page_count',   "INTEGER"],
      ['ocr_text',     "TEXT"],
      ['metadata',     "JSONB"],
      ['created_at',   "TIMESTAMPTZ DEFAULT NOW()"],
      ['updated_at',   "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('Document', ['teacherId','filename','displayName','gcsUrl','gcsPath','mimeType','sizeBytes','status','pageCount','ocrText','metadata','createdAt','updatedAt']);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_doc_teacher ON "Document"(teacher_id, created_at DESC)`);
  }
  _ensureDocTable().catch(e => console.error('[documents] migration:', e.message));

  function _docAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }
  const _docIds = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

  // GET /api/documents?status=
  app.get('/api/documents', async (req, res) => {
    const decoded = _docAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const myIds = _docIds(decoded);
      const params = [myIds];
      let where = `teacher_id = ANY($1::text[])`;
      if (req.query.status && req.query.status !== 'Tất cả') {
        params.push(req.query.status);
        where += ` AND status = $${params.length}`;
      }
      const { rows } = await pool.query(
        `SELECT id, filename, display_name AS "displayName", gcs_url AS "gcsUrl",
                mime_type AS "mimeType", size_bytes AS "sizeBytes", status,
                page_count AS "pageCount", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM "Document" WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
        params);
      return res.json({ documents: rows, total: rows.length });
    } catch (e) { console.error('[doc:list]', e.message); return res.json({ documents: [], total: 0 }); }
  });

  // DELETE /api/documents/:id
  app.delete('/api/documents/:id', async (req, res) => {
    const decoded = _docAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "Document" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, _docIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Tài liệu không tồn tại' });
      return res.json({ ok: true });
    } catch (e) { console.error('[doc:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá tài liệu' }); }
  });

  // POST /api/documents — tạo metadata sau khi upload GCS xong (FE call sau VideoUploader-style)
  app.post('/api/documents', async (req, res) => {
    const decoded = _docAuth(req, res); if (!decoded) return;
    const myId = decoded.userId || decoded.id || decoded.sub;
    try {
      const { filename, displayName, gcsUrl, gcsPath, mimeType, sizeBytes } = req.body || {};
      if (!filename) return res.status(400).json({ error: 'Thiếu filename' });
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const pool = _getPool();
      await pool.query(
        `INSERT INTO "Document"(id, teacher_id, filename, display_name, gcs_url, gcs_path,
                                mime_type, size_bytes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'uploaded')`,
        [id, myId, String(filename).slice(0,500),
         displayName || filename, gcsUrl || null, gcsPath || null,
         mimeType || null, sizeBytes || null]);
      return res.json({ ok: true, id });
    } catch (e) { console.error('[doc:create]', e.message); return res.status(500).json({ error: 'Lỗi tạo tài liệu' }); }
  });
})();

// ── media-service routes (only if MEDIA_SERVICE_URL is external) ──
// Skip /api/exam-matrices + /api/documents — đã có Node.js handlers ở trên
app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/media'));
if (!USE_NODEJS_QUESTIONS) {
  app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/questions'));
  app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/question-bank'));
}
// app.use(makeProxy(MEDIA_SERVICE_URL, 'media-service', '/api/exams'));  // Disabled — Node.js handlers below at line ~7057

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

// ════════════════════════════════════════════════════════════════════
// ADMIN SECURITY LAYER — defense in depth
// ════════════════════════════════════════════════════════════════════
// Vấn đề: _akVerify dùng ignoreExpiration:true → JWT không bao giờ hết hạn.
// Nếu admin bị demote về STUDENT trong DB nhưng JWT cũ vẫn role='ADMIN'
// → bypass được. Cần DB check + cache để không spam DB.
//
// Layer 1: JWT verify (signature + payload)
// Layer 2: DB role check (defense against revoked tokens)
// Layer 3: Audit log (track tất cả admin actions cho forensics)
// Layer 4: Rate limit per IP (chặn brute-force)
// Layer 5: Bypass dev qua DISABLE_ADMIN_GATE=1 env var

// LRU cache cho role check — 5 phút TTL, max 1000 entries.
// Khi user bị demote, cache stale tối đa 5 phút (acceptable trade-off).
const _adminRoleCache = new Map();  // sub → { role, exp }
const _ADMIN_CACHE_TTL = 5 * 60 * 1000;
const _ADMIN_CACHE_MAX = 1000;

function _cacheGet(key) {
  const v = _adminRoleCache.get(key);
  if (!v) return null;
  if (v.exp < Date.now()) { _adminRoleCache.delete(key); return null; }
  return v;
}
function _cacheSet(key, role) {
  // Simple LRU: nếu full, xoá entry cũ nhất
  if (_adminRoleCache.size >= _ADMIN_CACHE_MAX) {
    const firstKey = _adminRoleCache.keys().next().value;
    if (firstKey) _adminRoleCache.delete(firstKey);
  }
  _adminRoleCache.set(key, { role, exp: Date.now() + _ADMIN_CACHE_TTL });
}

// Rate limit per IP: 200 req/phút cho /api/admin/* (đủ cho dashboard auto-refresh
// mỗi 30s nhưng chặn brute-force/scraping)
const _adminRateLimit = new Map();  // ip → { count, windowStart }
const _ADMIN_RATE_LIMIT = 200;
const _ADMIN_RATE_WINDOW = 60 * 1000;

function _checkAdminRateLimit(ip) {
  if (!ip) return true;  // Skip nếu không có IP
  const now = Date.now();
  const entry = _adminRateLimit.get(ip);
  if (!entry || now - entry.windowStart >= _ADMIN_RATE_WINDOW) {
    _adminRateLimit.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  if (entry.count > _ADMIN_RATE_LIMIT) return false;
  return true;
}

// AdminAuditLog table — lazy migration
let _adminAuditTableReady = false;
async function _ensureAdminAuditTable() {
  if (_adminAuditTableReady) return;
  try {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
        id          BIGSERIAL PRIMARY KEY,
        user_id     VARCHAR(255),
        user_email  VARCHAR(255),
        method      VARCHAR(10),
        path        VARCHAR(500),
        status      INTEGER,
        ip_hash     VARCHAR(64),
        user_agent  TEXT,
        details     JSONB,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON "AdminAuditLog"(user_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON "AdminAuditLog"(created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_path ON "AdminAuditLog"(path)`);
    _adminAuditTableReady = true;
  } catch (e) {
    console.warn('[admin-audit] migration:', e.message);
  }
}
_ensureAdminAuditTable().catch(() => {});

// Async audit log — fire-and-forget, không block request
function _auditAdmin(req, res, decoded, statusCode, details = null) {
  try {
    const pool = _getPool();
    pool.query(
      `INSERT INTO "AdminAuditLog"(user_id, user_email, method, path, status, ip_hash, user_agent, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        decoded?.sub || decoded?.userId || null,
        decoded?.email || null,
        req.method,
        String(req.originalUrl || req.url || '').slice(0, 500),
        statusCode,
        _hashIp(_clientIp(req)),
        String(req.headers['user-agent'] || '').slice(0, 500),
        details ? JSON.stringify(details) : null,
      ]
    ).catch(() => {/* silent — audit log không được fail UX */});
  } catch { /* silent */ }
}

// ════════════════════════════════════════════════════════════════════
// _requireAdmin — module-scope middleware-style helper
// Dùng: const decoded = await _requireAdmin(req, res); if (!decoded) return;
// ════════════════════════════════════════════════════════════════════
async function _requireAdmin(req, res) {
  // ── Layer 4: Rate limit ──
  const ip = _clientIp(req);
  if (!_checkAdminRateLimit(ip)) {
    res.status(429).json({ error: 'Quá nhiều request — thử lại sau' });
    _auditAdmin(req, res, null, 429, { reason: 'rate-limit' });
    return null;
  }

  // ── Layer 1: JWT verify ──
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized — yêu cầu Bearer token' });
    _auditAdmin(req, res, null, 401, { reason: 'no-token' });
    return null;
  }
  const token = auth.slice(7);
  let decoded;
  try { decoded = _akVerify(token); }
  catch (e) {
    res.status(401).json({ error: 'Token không hợp lệ' });
    _auditAdmin(req, res, null, 401, { reason: 'jwt-verify-failed', err: e.message.slice(0, 100) });
    return null;
  }

  // ── Layer 5: Dev bypass ──
  if (process.env.DISABLE_ADMIN_GATE === '1') {
    _auditAdmin(req, res, decoded, 200, { bypass: 'dev-gate' });
    return decoded;
  }

  // ── Layer 2: DB role check (defense against revoked admins) ──
  const cacheKey = decoded.sub || decoded.userId || decoded.email;
  if (!cacheKey) {
    res.status(403).json({ error: 'Token thiếu user identifier' });
    _auditAdmin(req, res, decoded, 403, { reason: 'no-sub-in-token' });
    return null;
  }
  // JWT role=ADMIN fast path — chỉ skip DB nếu cache hit gần đây
  const cached = _cacheGet(cacheKey);
  if (cached) {
    if (cached.role === 'ADMIN') {
      _auditAdmin(req, res, decoded, 200, { source: 'cache' });
      return decoded;
    }
    res.status(403).json({ error: 'Chỉ admin truy cập được' });
    _auditAdmin(req, res, decoded, 403, { reason: 'not-admin-cached', role: cached.role });
    return null;
  }
  // Cache miss → query DB để xác nhận role hiện tại
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT role FROM "User" WHERE id = $1 OR LOWER(email) = LOWER($1) LIMIT 1`,
      [cacheKey]);
    const role = rows[0]?.role || null;
    _cacheSet(cacheKey, role);
    if (role === 'ADMIN') {
      _auditAdmin(req, res, decoded, 200, { source: 'db' });
      return decoded;
    }
    res.status(403).json({ error: 'Chỉ admin truy cập được' });
    _auditAdmin(req, res, decoded, 403, { reason: 'not-admin-db', role });
    return null;
  } catch (e) {
    console.error('[require-admin] DB error:', e.message);
    res.status(503).json({ error: 'Auth DB tạm thời không khả dụng' });
    _auditAdmin(req, res, decoded, 503, { reason: 'db-error', err: e.message.slice(0, 100) });
    return null;
  }
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
        // Mint JWT cho MCP — _akVerify() ở các handler khác chỉ accept JWT,
        // không accept raw AERO-xxx. JWT này không expire (ignoreExpiration=true).
        // MCP client cache token này → dùng làm Bearer cho mọi request sau.
        const jwt = _akJwt.sign(
          { sub: row.user_id, userId: row.user_id, role: row.role,
            email: row.email, name: row.name, src: 'api-key', keyId: row.id },
          _akSecret(),
          { expiresIn: '90d' }  // 90 ngày, có ignoreExpiration nên thực tế không hết
        );
        return res.json({
          ok: true, jwt,
          userId: row.user_id, role: row.role, name: row.name, email: row.email,
        });
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
// Helper: dedupe tất cả JWT fields → match teacher_id qua ANY array
// Sửa bug: GV tạo lớp ngày trước với decoded.userId, hôm sau login lại
// JWT trả decoded.sub khác id → "Bạn chưa có lớp nào" mặc dù có lớp.
const _classIds = (d) => [...new Set([d.userId, d.id, d.sub, d.email].filter(Boolean))];

// GET /api/classes → { classes: [...] }
app.get('/api/classes', async (req, res) => {
  const decoded = _classAuth(req, res); if (!decoded) return;
  try {
    const pool = _getPool();
    const myIds = _classIds(decoded);
    const { rows } = await pool.query(`
      SELECT c.id, c.name, c.grade, c.school_year AS "schoolYear", c.description,
             c.context_type, c.institution_name, c.created_at AS "createdAt",
             COALESCE((SELECT COUNT(*) FROM "ClassStudent" cs WHERE cs.class_id = c.id), 0)::int AS "studentCount"
      FROM "Class" c WHERE c.teacher_id = ANY($1::text[]) ORDER BY c.created_at DESC
    `, [myIds]);
    return res.json({ classes: rows });
  } catch (e) {
    // Bảng ClassStudent có thể chưa tồn tại — fallback query bỏ join
    try {
      const pool = _getPool();
      const myIds = _classIds(decoded);
      const { rows } = await pool.query(`
        SELECT id, name, grade, school_year AS "schoolYear", description,
               context_type, institution_name, created_at AS "createdAt",
               0 AS "studentCount"
        FROM "Class" WHERE teacher_id = ANY($1::text[]) ORDER BY created_at DESC
      `, [myIds]);
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
      `DELETE FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
      [req.params.id, _classIds(decoded)]
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
    const params = [req.params.id, _classIds(decoded)];
    if (name !== undefined)              { params.push(String(name).slice(0,200));            updates.push(`name = $${params.length}`); }
    if (grade !== undefined)             { params.push(String(grade).slice(0,50));            updates.push(`grade = $${params.length}`); }
    if (schoolYear !== undefined)        { params.push(String(schoolYear).slice(0,20));       updates.push(`school_year = $${params.length}`); }
    if (description !== undefined)       { params.push(String(description));                  updates.push(`description = $${params.length}`); }
    if (context_type !== undefined)      { params.push(String(context_type));                 updates.push(`context_type = $${params.length}`); }
    if (institution_name !== undefined)  { params.push(String(institution_name).slice(0,200)); updates.push(`institution_name = $${params.length}`); }
    if (!updates.length) return res.json({ ok: true });
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `UPDATE "Class" SET ${updates.join(', ')} WHERE id = $1 AND teacher_id = ANY($2::text[])`,
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
    // Verify lớp thuộc teacher (match qua mọi JWT id field)
    const { rowCount } = await pool.query(
      `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
      [req.params.id, _classIds(decoded)]);
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
      `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
      [classId, _classIds(decoded)]);
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
      `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
      [req.params.id, _classIds(decoded)]);
    if (!ok) return res.status(404).json({ error: 'Lớp không tồn tại' });
    const { rowCount } = await pool.query(
      `DELETE FROM "ClassStudent" WHERE id = $1 AND class_id = $2`,
      [req.params.studentId, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'HS không tồn tại' });
    return res.json({ ok: true });
  } catch (e) { console.error('[classes:students:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá HS' }); }
});

// ── Class Subjects + Gradebook (TT58/TT22 Bộ GD&ĐT) ──────────────
;(() => {
  async function _ensureGradebookTables() {
    const pool = _getPool();
    // Môn học của 1 lớp (subject list per class)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "ClassSubject" (
        id          VARCHAR(36)  PRIMARY KEY,
        class_id    VARCHAR(36)  NOT NULL,
        teacher_id  VARCHAR(255) NOT NULL,
        subject     VARCHAR(100) NOT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('ClassSubject', [
      ['class_id',   "VARCHAR(36)"],
      ['teacher_id', "VARCHAR(255)"],
      ['subject',    "VARCHAR(100)"],
      ['created_at', "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('ClassSubject', ['classId','teacherId','subject','createdAt']);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_classsubj_class ON "ClassSubject"(class_id)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_classsubj ON "ClassSubject"(class_id, subject)`);

    // Bảng điểm: 1 row mỗi (class, subject, semester, student)
    // ddgtx: JSONB array điểm thường xuyên; ddggk/ddgck: điểm giữa kì/cuối kì
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Gradebook" (
        id            VARCHAR(36)  PRIMARY KEY,
        class_id      VARCHAR(36)  NOT NULL,
        subject       VARCHAR(100) NOT NULL,
        semester      VARCHAR(10)  NOT NULL,
        student_id    VARCHAR(36)  NOT NULL,
        ddgtx         JSONB        NOT NULL DEFAULT '[]'::jsonb,
        ddggk         NUMERIC(4,2),
        ddgck         NUMERIC(4,2),
        note_progress TEXT,
        note_record   TEXT,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('Gradebook', [
      ['class_id',     "VARCHAR(36)"],
      ['subject',      "VARCHAR(100)"],
      ['semester',     "VARCHAR(10)"],
      ['student_id',   "VARCHAR(36)"],
      ['ddgtx',        "JSONB DEFAULT '[]'::jsonb"],
      ['ddggk',        "NUMERIC(4,2)"],
      ['ddgck',        "NUMERIC(4,2)"],
      ['note_progress',"TEXT"],
      ['note_record',  "TEXT"],
      ['created_at',   "TIMESTAMPTZ DEFAULT NOW()"],
      ['updated_at',   "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('Gradebook', ['classId','subject','semester','studentId','ddgtx','ddggk','ddgck','noteProgress','noteRecord','createdAt','updatedAt']);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_gradebook ON "Gradebook"(class_id, subject, semester, student_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_gradebook_class ON "Gradebook"(class_id, subject, semester)`);
  }
  _ensureGradebookTables().catch(e => console.error('[gradebook] migration:', e.message));

  // GET /api/classes/:classId/subjects → { subjects: string[] }
  app.get('/api/classes/:classId/subjects', async (req, res) => {
    const decoded = _classAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      // Verify lớp thuộc GV
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.classId, _classIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
      const { rows } = await pool.query(
        `SELECT subject FROM "ClassSubject" WHERE class_id = $1 ORDER BY subject`,
        [req.params.classId]);
      return res.json({ subjects: rows.map(r => r.subject) });
    } catch (e) { console.error('[gb:subjects:list]', e.message); return res.json({ subjects: [] }); }
  });

  // POST /api/classes/:classId/subjects — body: { subject }
  app.post('/api/classes/:classId/subjects', async (req, res) => {
    const decoded = _classAuth(req, res); if (!decoded) return;
    try {
      const subject = String(req.body?.subject || '').trim();
      if (!subject) return res.status(400).json({ error: 'Thiếu tên môn' });
      if (subject.length > 100) return res.status(400).json({ error: 'Tên môn quá dài (max 100 ký tự)' });
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.classId, _classIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại hoặc không thuộc quyền của bạn' });
      const { randomUUID } = require('crypto');
      try {
        await pool.query(
          `INSERT INTO "ClassSubject"(id, class_id, teacher_id, subject) VALUES ($1,$2,$3,$4)`,
          [randomUUID(), req.params.classId, decoded.sub, subject]);
      } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: `Môn "${subject}" đã tồn tại trong lớp này` });
        throw e;
      }
      return res.json({ ok: true, subject });
    } catch (e) { console.error('[gb:subjects:add]', e.message); return res.status(500).json({ error: 'Lỗi thêm môn' }); }
  });

  // DELETE /api/classes/:classId/subjects/:subject — gỡ môn (kèm điểm)
  app.delete('/api/classes/:classId/subjects/:subject', async (req, res) => {
    const decoded = _classAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.classId, _classIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
      const subject = decodeURIComponent(req.params.subject);
      await pool.query(`DELETE FROM "Gradebook" WHERE class_id = $1 AND subject = $2`, [req.params.classId, subject]);
      await pool.query(`DELETE FROM "ClassSubject" WHERE class_id = $1 AND subject = $2`, [req.params.classId, subject]);
      return res.json({ ok: true });
    } catch (e) { console.error('[gb:subjects:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá môn' }); }
  });

  // GET /api/teacher/gradebook?classId=&subject=&semester=
  app.get('/api/teacher/gradebook', async (req, res) => {
    const decoded = _classAuth(req, res); if (!decoded) return;
    try {
      const { classId, subject, semester } = req.query;
      if (!classId || !subject || !semester) return res.status(400).json({ error: 'Thiếu classId/subject/semester' });
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [classId, _classIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
      const [studs, grds] = await Promise.all([
        pool.query(
          `SELECT id, stt, ho_ten AS "hoTen", ma_dinh_danh AS "maDinhDanh",
                  ngay_sinh AS "ngaySinh", gioi_tinh AS "gioiTinh"
           FROM "ClassStudent" WHERE class_id = $1 ORDER BY stt NULLS LAST, ho_ten`,
          [classId]),
        pool.query(
          `SELECT student_id AS "studentId", ddgtx, ddggk, ddgck,
                  note_progress AS "noteProgress", note_record AS "noteRecord"
           FROM "Gradebook" WHERE class_id = $1 AND subject = $2 AND semester = $3`,
          [classId, subject, semester]),
      ]);
      const grades = {};
      for (const g of grds.rows) {
        grades[g.studentId] = {
          ddgtx: Array.isArray(g.ddgtx) ? g.ddgtx.map(v => v == null ? null : Number(v)) : [],
          ddggk: g.ddggk == null ? null : Number(g.ddggk),
          ddgck: g.ddgck == null ? null : Number(g.ddgck),
          noteProgress: g.noteProgress || '',
          noteRecord:   g.noteRecord   || '',
        };
      }
      return res.json({ students: studs.rows, grades });
    } catch (e) { console.error('[gb:get]', e.message); return res.status(500).json({ error: 'Lỗi tải sổ điểm' }); }
  });

  // POST /api/teacher/gradebook — body: { classId, subject, semester, rows: [...] }
  app.post('/api/teacher/gradebook', async (req, res) => {
    const decoded = _classAuth(req, res); if (!decoded) return;
    try {
      const { classId, subject, semester, rows = [] } = req.body || {};
      if (!classId || !subject || !semester) return res.status(400).json({ error: 'Thiếu classId/subject/semester' });
      if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows phải là array' });
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `SELECT 1 FROM "Class" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [classId, _classIds(decoded)]);
      if (!rowCount) return res.status(404).json({ error: 'Lớp không tồn tại' });
      const { randomUUID } = require('crypto');
      const clamp = v => {
        if (v == null || v === '') return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        return Math.max(0, Math.min(10, Math.round(n * 100) / 100));
      };
      let saved = 0;
      for (const r of rows) {
        if (!r?.studentId) continue;
        const ddgtx = Array.isArray(r.ddgtx) ? r.ddgtx.map(clamp) : [];
        const ddggk = clamp(r.ddggk);
        const ddgck = clamp(r.ddgck);
        const noteP = r.noteProgress != null ? String(r.noteProgress) : null;
        const noteR = r.noteRecord   != null ? String(r.noteRecord)   : null;
        await pool.query(`
          INSERT INTO "Gradebook"(id, class_id, subject, semester, student_id,
                                  ddgtx, ddggk, ddgck, note_progress, note_record, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,NOW())
          ON CONFLICT (class_id, subject, semester, student_id) DO UPDATE
            SET ddgtx = EXCLUDED.ddgtx, ddggk = EXCLUDED.ddggk, ddgck = EXCLUDED.ddgck,
                note_progress = EXCLUDED.note_progress, note_record = EXCLUDED.note_record,
                updated_at = NOW()
        `, [randomUUID(), classId, subject, semester, r.studentId,
            JSON.stringify(ddgtx), ddggk, ddgck, noteP, noteR]);
        saved++;
      }
      return res.json({ ok: true, saved });
    } catch (e) { console.error('[gb:save]', e.message); return res.status(500).json({ error: 'Lỗi lưu sổ điểm' }); }
  });
})();

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
    // ── YouTube-style demographics ──
    ['user_agent', "TEXT"],
    ['device_type',"VARCHAR(20)"],   // mobile/desktop/tablet/bot/unknown
    ['os',         "VARCHAR(30)"],   // Windows/macOS/Linux/iOS/Android/Other
    ['browser',    "VARCHAR(30)"],   // Chrome/Safari/Firefox/Edge/Opera/Other
    ['screen_w',   "SMALLINT"],
    ['screen_h',   "SMALLINT"],
    ['country',    "VARCHAR(2)"],    // ISO 3166-1 alpha-2 (e.g. VN, US)
    ['region',     "VARCHAR(100)"],  // tỉnh/thành (best-effort)
    ['city',       "VARCHAR(100)"],
    ['language',   "VARCHAR(10)"],   // navigator.language (vi-VN, en-US...)
    ['timezone',   "VARCHAR(60)"],   // Intl tz (Asia/Ho_Chi_Minh...)
    ['ip_hash',    "VARCHAR(64)"],   // SHA256 hex của IP (privacy-preserving)
  ]);
  await _dropLegacyNotNull('PageView', ['sessionId','userId','viewMs','createdAt']);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageview_created ON "PageView"(created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageview_path ON "PageView"(path)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageview_device ON "PageView"(device_type) WHERE device_type IS NOT NULL`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pageview_country ON "PageView"(country) WHERE country IS NOT NULL`);
}

// ── User-Agent parser (lightweight regex, no external deps) ──
// Phù hợp với 95% trường hợp phổ biến. Bot/edge UA → "Other".
function _parseUA(ua) {
  if (!ua || typeof ua !== 'string') return { device: 'unknown', os: 'Other', browser: 'Other' };
  const s = ua;
  // Bot detection FIRST (UA chứa bot/crawler/spider)
  if (/bot|crawler|spider|google|bing|yahoo|baidu|duckduck|slurp|facebookexternalhit|telegram|twitterbot/i.test(s)) {
    return { device: 'bot', os: 'Bot', browser: 'Bot' };
  }
  // Device type
  let device = 'desktop';
  if (/iPad|Tablet|PlayBook|Silk/.test(s)) device = 'tablet';
  else if (/Mobi|Android|iPhone|iPod|webOS|Opera Mini|IEMobile/.test(s)) device = 'mobile';
  // OS
  let os = 'Other';
  if (/Windows NT/.test(s)) os = 'Windows';
  else if (/Mac OS X|Macintosh/.test(s) && !/iPhone|iPad|iPod/.test(s)) os = 'macOS';
  else if (/iPhone|iPad|iPod/.test(s)) os = 'iOS';
  else if (/Android/.test(s)) os = 'Android';
  else if (/Linux/.test(s)) os = 'Linux';
  else if (/CrOS/.test(s)) os = 'ChromeOS';
  // Browser (order matters — Edge/Chrome contain each other UA strings)
  let browser = 'Other';
  if (/Edg\//.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(s)) browser = 'Opera';
  else if (/Firefox\//.test(s)) browser = 'Firefox';
  else if (/Chrome\//.test(s) && !/Edg\//.test(s)) browser = 'Chrome';
  else if (/Safari\//.test(s) && !/Chrome\//.test(s)) browser = 'Safari';
  else if (/MSIE|Trident/.test(s)) browser = 'IE';
  return { device, os, browser };
}

// SHA256 IP hash — privacy-preserving (không thể reverse → email/IP gốc)
function _hashIp(ip) {
  if (!ip) return null;
  try {
    const { createHash } = require('crypto');
    return createHash('sha256').update(String(ip) + (process.env.PAGEVIEW_IP_SALT || 'aeroedu-salt')).digest('hex').slice(0, 32);
  } catch { return null; }
}

// Extract geo từ Cloud Run / Cloudflare / proxy headers (no external lookup)
function _extractGeo(req) {
  const h = req.headers || {};
  return {
    country: (h['cf-ipcountry'] || h['x-appengine-country'] || h['x-vercel-ip-country'] || '').slice(0, 2).toUpperCase() || null,
    region: (h['cf-region'] || h['x-appengine-region'] || h['x-vercel-ip-country-region'] || '').slice(0, 100) || null,
    city: (h['cf-ipcity'] || h['x-appengine-city'] || h['x-vercel-ip-city'] || '').slice(0, 100) || null,
  };
}

function _clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
}
_ensurePageViewTable().catch(e => console.error('[pageview] migration error:', e.message));

app.post('/api/analytics/pageview', async (req, res) => {
  // 204 trước khi insert — fire-and-forget, không block UX
  res.status(204).end();
  try {
    const b = req.body || {};
    const { path = '', sessionId = null, viewMs = null, referrer = null,
            screen = null, lang = null, tz = null } = b;
    if (!path) return;
    // Optional auth: nếu có Bearer token hợp lệ → log user_id
    let userId = null;
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      try { userId = _akVerify(auth.slice(7)).sub; } catch { /* anonymous OK */ }
    }
    // Parse UA + geo headers — best-effort, dùng cho YouTube-style demographics
    const ua = String(req.headers['user-agent'] || '').slice(0, 500);
    const parsed = _parseUA(ua);
    const geo = _extractGeo(req);
    const ipHash = _hashIp(_clientIp(req));
    const screenW = screen && typeof screen.w === 'number' ? Math.max(0, Math.min(screen.w, 9999)) : null;
    const screenH = screen && typeof screen.h === 'number' ? Math.max(0, Math.min(screen.h, 9999)) : null;
    const language = lang ? String(lang).slice(0, 10) : null;
    const timezone = tz ? String(tz).slice(0, 60) : null;

    const pool = _getPool();
    await pool.query(
      `INSERT INTO "PageView"(
         path, session_id, user_id, view_ms, referrer,
         user_agent, device_type, os, browser, screen_w, screen_h,
         country, region, city, language, timezone, ip_hash
       ) VALUES ($1,$2,$3,$4,$5, $6,$7,$8,$9,$10,$11, $12,$13,$14,$15,$16,$17)`,
      [String(path).slice(0,500),
       sessionId ? String(sessionId).slice(0,60) : null,
       userId,
       typeof viewMs === 'number' ? Math.max(0, Math.min(viewMs, 86_400_000)) : null,
       referrer ? String(referrer).slice(0,500) : null,
       ua || null, parsed.device, parsed.os, parsed.browser, screenW, screenH,
       geo.country, geo.region, geo.city, language, timezone, ipHash]
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
// ── Phoenix-style multi-source retrieval — STUDENT For-You feed ──
// Lấy candidates từ 5 sources, mỗi source contribute independently:
//   1. enrolled-lessons  — Course HS đã enrol (Purchase table)
//   2. exam-pending      — Exam được assigned, chưa làm
//   3. weak-topics-kg    — KgNode mastery thấp (UserKgMastery)
//   4. teacher-recs      — LearningPath + AssignmentTarget cho HS
//   5. ai-suggested      — Phù hợp UserProfile.reco_prefs (subject/grade)
// → trả về để Mixer scoring (Phase 2) rank theo weighted formula.
async function _studentFeedPhoenix(studentId, prefs, limit) {
  const pool = _getPool();
  const myIds = [studentId];
  const all = [];

  // SOURCE 1: enrolled lessons (Course đã mua)
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.title, c.description, c.image, c."imageUrl", cat.name AS category
      FROM "Purchase" p
      JOIN "Course" c ON c.id = p."courseId"
      LEFT JOIN "Category" cat ON cat.id = c."categoryId"
      WHERE p."userId" = ANY($1::text[])
      ORDER BY p."createdAt" DESC LIMIT 20
    `, [myIds]).catch(() => ({ rows: [] }));
    for (const c of rows) {
      all.push({
        type: 'lesson', source: 'enrolled-lessons',
        id: `course-${c.id}`,
        title: c.title,
        subtitle: c.category || 'Khóa học',
        description: (c.description || '').slice(0, 200),
        image: c.image || c.imageUrl,
        link: `/courses/${c.id}`,
        cta: 'Tiếp tục học',
        signals: { _source_weight: 1.0 },  // weighted bằng Mixer
        reasons: ['📚 Đang học'],
      });
    }
  } catch { /* silent */ }

  // SOURCE 2: exam pending (assignments + exam matrix chưa làm)
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.title, a.description, a.subject, a.difficulty, a.due_date, a.qr_token
      FROM "AssignmentTarget" at
      JOIN assignments a ON a.id = at.assignment_id
      WHERE at.type = 'student' AND at.target_id = ANY($1::text[])
        AND a.status IN ('pending', 'published')
        AND (a.due_date IS NULL OR a.due_date > NOW())
      ORDER BY a.due_date ASC NULLS LAST LIMIT 15
    `, [myIds]).catch(() => ({ rows: [] }));
    for (const a of rows) {
      const hoursToDue = a.due_date ? (new Date(a.due_date).getTime() - Date.now()) / 3600000 : null;
      const urgent = hoursToDue !== null && hoursToDue < 24;
      all.push({
        type: 'exam', source: 'exam-pending',
        id: `asgn-${a.id}`,
        title: `${urgent ? '⚠ Hạn gấp: ' : ''}${a.title}`,
        subtitle: `${a.subject || 'Bài tập'} · ${a.difficulty || 'TB'}`,
        description: (a.description || '').slice(0, 200),
        link: a.qr_token ? `/a/${a.qr_token}` : `/student/assignments/${a.id}`,
        cta: 'Làm bài',
        signals: { _source_weight: urgent ? 1.5 : 1.2, due_date: a.due_date },
        reasons: urgent ? ['⏰ Hạn gấp < 24h', '📝 Bài tập GV giao'] : ['📝 Bài tập GV giao'],
      });
    }
  } catch { /* silent */ }

  // SOURCE 3: weak topics từ KG (lazy table — nếu chưa có thì skip)
  try {
    const { rows } = await pool.query(`
      SELECT n.id, n.name AS title, n.subject, m.mastery_score
      FROM "UserKgMastery" m
      JOIN "KgNode" n ON n.id = m.node_id
      WHERE m.user_id = ANY($1::text[]) AND m.mastery_score < 0.5
      ORDER BY m.mastery_score ASC LIMIT 10
    `, [myIds]).catch(() => ({ rows: [] }));
    for (const t of rows) {
      const gap = Math.round((1 - (t.mastery_score || 0)) * 100);
      all.push({
        type: 'topic', source: 'weak-topics-kg',
        id: `kg-${t.id}`,
        title: t.title,
        subtitle: `${t.subject || 'Kiến thức'} · Cần cải thiện`,
        description: `Mức thành thạo hiện tại ${Math.round((t.mastery_score || 0) * 100)}%. Ôn lại sẽ giúp bạn vững hơn.`,
        link: `/student/knowledge-graph?focus=${t.id}`,
        cta: 'Ôn lại',
        signals: { _source_weight: 1.3, mastery_score: t.mastery_score, gap_pct: gap },
        reasons: [`📉 Yếu ${gap}%`, '🎯 KG khuyến nghị'],
      });
    }
  } catch { /* silent */ }

  // SOURCE 4: teacher's recommendations (Learning Path đã gán)
  try {
    const { rows } = await pool.query(`
      SELECT lp.id, lp.name AS title, lp.description, lp.subject, lp.difficulty,
             jsonb_array_length(lp.modules) AS module_count, lpa.created_at AS "assignedAt"
      FROM "LearningPathAssignment" lpa
      JOIN "LearningPath" lp ON lp.id = lpa.path_id
      WHERE lpa.student_id = ANY($1::text[])
      ORDER BY lpa.created_at DESC LIMIT 10
    `, [myIds]).catch(() => ({ rows: [] }));
    for (const p of rows) {
      all.push({
        type: 'path', source: 'teacher-recs',
        id: `path-${p.id}`,
        title: p.title,
        subtitle: `${p.subject || 'Lộ trình'} · ${p.module_count || 0} module · ${p.difficulty || 'TB'}`,
        description: (p.description || '').slice(0, 200),
        link: `/student/learning-paths/${p.id}`,
        cta: 'Bắt đầu',
        signals: { _source_weight: 1.4, assignedAt: p.assignedAt },
        reasons: ['👨‍🏫 GV gợi ý', '📚 Lộ trình cá nhân'],
      });
    }
  } catch { /* silent */ }

  // SOURCE 5: AI-suggested (theo reco_prefs: subject + grade)
  try {
    const subject = prefs?.subject;
    const grade = prefs?.grade;
    if (subject || grade) {
      const params = [];
      let where = '1=1';
      if (subject) { params.push(subject); where += ` AND q.subject = $${params.length}`; }
      if (grade)   { params.push(grade);   where += ` AND q.grade   = $${params.length}`; }
      const { rows } = await pool.query(`
        SELECT DISTINCT ON (e.id) e.id, e.title, e.subject, e.grade, e.duration
        FROM "Exam" e
        JOIN "Question" q ON q.id = ANY(e.question_ids)
        WHERE ${where} AND (e.visibility = 'public' OR e.status = 'published')
        ORDER BY e.id DESC, e.created_at DESC LIMIT 8
      `, params).catch(() => ({ rows: [] }));
      for (const e of rows) {
        all.push({
          type: 'ai-exam', source: 'ai-suggested',
          id: `aiexam-${e.id}`,
          title: e.title,
          subtitle: `${e.subject || ''} ${e.grade ? '· Khối ' + e.grade : ''} ${e.duration ? '· ' + e.duration + 'p' : ''}`.trim(),
          description: 'Đề phù hợp môn/khối bạn quan tâm.',
          link: `/student/exam-prep?examId=${e.id}`,
          cta: 'Luyện',
          signals: { _source_weight: 0.9 },  // priority thấp hơn — chỉ enrich
          reasons: ['🤖 AI gợi ý', `🎯 ${subject || grade}`],
        });
      }
    }
  } catch { /* silent */ }

  return all.slice(0, limit * 2);  // trả 2x limit để Mixer rank
}

// ── Mixer scoring — weighted formula áp dụng X Phoenix pattern ──
// weighted_score =
//   0.30 * mastery_gap   (cần học nhất — KG yếu)
//   0.25 * teacher_pref  (GV đã gợi ý cho HS này)
//   0.20 * engagement    (tương tác trước đây tốt)
//   0.15 * freshness     (mới gán / mới publish)
//   0.10 * social        (HS cùng lớp đã làm)
function _mixerScore(item, weights) {
  const s = item.signals || {};
  const w = weights || { mastery: 0.30, teacher: 0.25, engagement: 0.20, freshness: 0.15, social: 0.10 };
  const masteryGap = s.gap_pct ? Math.min(1, s.gap_pct / 100) : 0;
  const teacherPref = ['teacher-recs', 'exam-pending'].includes(item.source) ? 1 : 0;
  const engagement = Math.min(1, (s._source_weight || 1) / 1.5);
  let freshness = 0.5;
  const ts = s.due_date || s.assignedAt;
  if (ts) {
    const days = (Date.now() - new Date(ts).getTime()) / 86400000;
    freshness = days < 0 ? 1 : Math.max(0, 1 - days / 30);
  }
  const social = 0.3;
  return Math.round((
    w.mastery * masteryGap +
    w.teacher * teacherPref +
    w.engagement * engagement +
    w.freshness * freshness +
    w.social * social
  ) * 1000) / 1000;
}

app.get('/api/reco/feed', async (req, res) => {
  const audience = req.query.audience || 'student';
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const auth = req.headers.authorization || '';
  let userId = null;
  if (auth.startsWith('Bearer ')) {
    try { userId = _akVerify(auth.slice(7)).sub; } catch { /* anonymous */ }
  }

  // STUDENT audience — Phoenix 5 sources + Mixer scoring
  if (audience === 'student') {
    if (!userId) {
      return res.json({ audience: 'student', count: 0, items: [], sources: [], isColdStart: true });
    }
    try {
      const pool = _getPool();
      // Load user prefs
      const { rows: prefRows } = await pool.query(
        `SELECT reco_prefs FROM "UserProfile" WHERE user_id = $1`, [userId]
      ).catch(() => ({ rows: [] }));
      const prefs = prefRows[0]?.reco_prefs || null;

      const candidates = await _studentFeedPhoenix(userId, prefs, limit);
      // A/B variant lookup — experiment "mixer_weights" controls scoring formula
      const variants = global.__rsGetUserVariants ? await global.__rsGetUserVariants(userId) : {};
      const mixerVariant = variants.mixer_weights;  // vd: 'control' | 'teacher_heavy' | 'mastery_heavy'
      const weightPresets = {
        control:        { mastery: 0.30, teacher: 0.25, engagement: 0.20, freshness: 0.15, social: 0.10 },
        teacher_heavy:  { mastery: 0.20, teacher: 0.40, engagement: 0.20, freshness: 0.10, social: 0.10 },
        mastery_heavy:  { mastery: 0.45, teacher: 0.20, engagement: 0.15, freshness: 0.10, social: 0.10 },
        freshness_heavy:{ mastery: 0.20, teacher: 0.20, engagement: 0.20, freshness: 0.30, social: 0.10 },
      };
      const weights = weightPresets[mixerVariant] || weightPresets.control;
      // Mixer scoring
      const scored = candidates.map(c => ({ ...c, score: _mixerScore(c, weights) }));
      const seen = new Set();
      const ranked = scored
        .sort((a, b) => b.score - a.score)
        .filter(c => seen.has(c.id) ? false : (seen.add(c.id), true))
        .slice(0, limit);
      const sources = [...new Set(scored.map(c => c.source))];

      // Track A/B view event (best-effort, async)
      if (mixerVariant && ranked.length > 0) {
        try {
          const pool = _getPool();
          pool.query(
            `INSERT INTO "RsExperimentEvent"(exp_name, variant_key, user_id, action, metadata)
             VALUES ('mixer_weights', $1, $2, 'view', $3::jsonb)`,
            [mixerVariant, userId, JSON.stringify({ count: ranked.length, sources })]
          ).catch(() => {});
        } catch { /* silent */ }
      }

      return res.json({
        audience: 'student',
        count: ranked.length,
        items: ranked,
        sources,
        isColdStart: ranked.length === 0 || !prefs,
        _variant: mixerVariant || 'control',
      });
    } catch (e) {
      console.error('[reco/feed:student]', e.message);
      return res.json({ audience: 'student', count: 0, items: [], sources: [], isColdStart: true });
    }
  }

  // TEACHER audience (giữ logic cũ)
  let teacherId = userId;
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

// ── RS-Phase 9: A/B Testing framework — production wire ──
// Tables: RsExperiment (def), RsExperimentAssign (user→variant), RsExperimentEvent (tracking)
// Endpoints: CRUD experiments + getVariant() + metrics aggregation
;(() => {
  async function _ensureExpTables() {
    const pool = _getPool();
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "RsExperiment" (
          id          VARCHAR(36)  PRIMARY KEY,
          name        VARCHAR(100) UNIQUE NOT NULL,
          description TEXT,
          variants    JSONB        NOT NULL DEFAULT '[]'::jsonb,
          allocation  JSONB        NOT NULL DEFAULT '{}'::jsonb,
          status      VARCHAR(20)  DEFAULT 'draft',
          start_at    TIMESTAMPTZ,
          end_at      TIMESTAMPTZ,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "RsExperimentAssign" (
          user_id     VARCHAR(255) NOT NULL,
          exp_name    VARCHAR(100) NOT NULL,
          variant_key VARCHAR(50)  NOT NULL,
          assigned_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, exp_name)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "RsExperimentEvent" (
          id          BIGSERIAL    PRIMARY KEY,
          exp_name    VARCHAR(100) NOT NULL,
          variant_key VARCHAR(50)  NOT NULL,
          user_id     VARCHAR(255),
          action      VARCHAR(50)  NOT NULL,
          item_id     VARCHAR(255),
          metadata    JSONB,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_rsexpevt_name ON "RsExperimentEvent"(exp_name, variant_key, created_at DESC)`);
    } catch (e) { console.warn('[rs-exp] migration:', e.message); }
  }
  _ensureExpTables().catch(() => {});

  // Hash-based deterministic bucket: user X always lands variant Y for exp E
  // bucket = hash(userId + expName) % 100 → cumulative variant ranges
  function _hashBucket(userId, expName) {
    const { createHash } = require('crypto');
    const h = createHash('sha256').update(`${userId}::${expName}`).digest('hex');
    // First 8 hex = 32-bit int
    return parseInt(h.slice(0, 8), 16) % 100;
  }

  function _assignVariant(experiment, userId) {
    const alloc = experiment.allocation || {};
    const variants = experiment.variants || [];
    if (variants.length === 0) return null;
    const bucket = _hashBucket(userId, experiment.name);
    let cum = 0;
    for (const v of variants) {
      cum += Number(alloc[v.key] || 0);
      if (bucket < cum) return v.key;
    }
    return variants[0].key;  // fallback đầu tiên
  }

  // Cached active experiments (reload mỗi 60s để pickup config mới)
  let _activeExpsCache = null;
  let _activeExpsCacheAt = 0;
  async function _getActiveExperiments() {
    if (Date.now() - _activeExpsCacheAt < 60_000 && _activeExpsCache) return _activeExpsCache;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT name, variants, allocation FROM "RsExperiment" WHERE status = 'active'`
      );
      _activeExpsCache = rows.map(r => ({
        name: r.name,
        variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : r.variants,
        allocation: typeof r.allocation === 'string' ? JSON.parse(r.allocation) : r.allocation,
      }));
      _activeExpsCacheAt = Date.now();
    } catch { _activeExpsCache = []; }
    return _activeExpsCache;
  }

  // Public: get all variant assignments cho user (cache in DB)
  async function _getUserVariants(userId) {
    if (!userId) return {};
    const exps = await _getActiveExperiments();
    if (!exps.length) return {};
    const pool = _getPool();
    const assigned = {};
    for (const exp of exps) {
      // Check cache
      try {
        const { rows } = await pool.query(
          `SELECT variant_key FROM "RsExperimentAssign" WHERE user_id = $1 AND exp_name = $2`,
          [userId, exp.name]
        );
        if (rows.length > 0) {
          assigned[exp.name] = rows[0].variant_key;
          continue;
        }
        // Assign new
        const variant = _assignVariant(exp, userId);
        if (variant) {
          await pool.query(
            `INSERT INTO "RsExperimentAssign"(user_id, exp_name, variant_key) VALUES ($1,$2,$3)
             ON CONFLICT (user_id, exp_name) DO NOTHING`,
            [userId, exp.name, variant]
          );
          assigned[exp.name] = variant;
        }
      } catch (e) { /* skip exp on error */ }
    }
    return assigned;
  }
  global.__rsGetUserVariants = _getUserVariants;  // expose cho feed handler

  // Admin gate qua header x-admin-token (đơn giản cho dashboard)
  const ADMIN_TOKEN = process.env.RS_ADMIN_TOKEN || process.env.JWT_SECRET || 'dev-admin-token';
  function _adminGate(req, res) {
    const token = req.headers['x-admin-token'] || '';
    if (token !== ADMIN_TOKEN && process.env.DISABLE_ADMIN_GATE !== '1') {
      res.status(401).json({ success: false, error: 'Invalid admin token' });
      return false;
    }
    return true;
  }

  // GET /api/reco/experiments
  app.get('/api/reco/experiments', async (req, res) => {
    if (!_adminGate(req, res)) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT * FROM "RsExperiment" ORDER BY created_at DESC LIMIT 100`
      );
      return res.json({ success: true, experiments: rows });
    } catch (e) { console.error('[rs-exp:list]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // POST /api/reco/experiments — create
  app.post('/api/reco/experiments', async (req, res) => {
    if (!_adminGate(req, res)) return;
    try {
      const { name, description, variants, allocation, status = 'draft', start_at, end_at } = req.body || {};
      if (!name || !Array.isArray(variants) || variants.length < 2) {
        return res.status(400).json({ success: false, error: 'Cần name + 2+ variants' });
      }
      const { randomUUID } = require('crypto');
      const pool = _getPool();
      await pool.query(`
        INSERT INTO "RsExperiment"(id, name, description, variants, allocation, status, start_at, end_at)
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
      `, [randomUUID(), name, description || null, JSON.stringify(variants),
          JSON.stringify(allocation || {}), status, start_at, end_at]);
      _activeExpsCacheAt = 0;  // invalidate cache
      return res.json({ success: true });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ success: false, error: `Experiment "${req.body?.name}" đã tồn tại` });
      console.error('[rs-exp:create]', e.message); return res.status(500).json({ success: false, error: e.message });
    }
  });

  // PUT /api/reco/experiments/:name — update status/allocation
  app.put('/api/reco/experiments/:name', async (req, res) => {
    if (!_adminGate(req, res)) return;
    try {
      const { status, allocation, end_at } = req.body || {};
      const updates = [];
      const params = [req.params.name];
      if (status !== undefined) { params.push(status); updates.push(`status = $${params.length}`); }
      if (allocation !== undefined) { params.push(JSON.stringify(allocation)); updates.push(`allocation = $${params.length}::jsonb`); }
      if (end_at !== undefined) { params.push(end_at); updates.push(`end_at = $${params.length}`); }
      if (!updates.length) return res.json({ success: true });
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `UPDATE "RsExperiment" SET ${updates.join(', ')} WHERE name = $1`, params
      );
      if (!rowCount) return res.status(404).json({ success: false, error: 'Không tìm thấy' });
      _activeExpsCacheAt = 0;
      return res.json({ success: true });
    } catch (e) { console.error('[rs-exp:update]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // GET /api/reco/experiments/:name/metrics
  app.get('/api/reco/experiments/:name/metrics', async (req, res) => {
    if (!_adminGate(req, res)) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT variant_key,
               COUNT(*)::int AS total_actions,
               COUNT(*) FILTER (WHERE action = 'view')::int AS views,
               COUNT(*) FILTER (WHERE action = 'click')::int AS clicks,
               COUNT(*) FILTER (WHERE action = 'complete')::int AS completes,
               COUNT(*) FILTER (WHERE action = 'pass')::int AS passes,
               COUNT(*) FILTER (WHERE action = 'skip')::int AS skips,
               COUNT(*) FILTER (WHERE action = 'not_interested')::int AS notInter
        FROM "RsExperimentEvent" WHERE exp_name = $1
        GROUP BY variant_key ORDER BY variant_key
      `, [req.params.name]);
      const variants = rows.map(r => ({
        key: r.variant_key,
        totalActions: r.total_actions,
        byAction: { view: r.views, click: r.clicks, complete: r.completes, pass: r.passes, skip: r.skips, not_interested: r.notInter },
        metrics: {
          views: r.views, clicks: r.clicks, completes: r.completes, passes: r.passes,
          skips: r.skips, notInter: r.notInter,
          ctr: r.views > 0 ? Math.round((r.clicks / r.views) * 10000) / 100 : 0,
          completion: r.clicks > 0 ? Math.round((r.completes / r.clicks) * 10000) / 100 : 0,
          pass_rate: r.completes > 0 ? Math.round((r.passes / r.completes) * 10000) / 100 : 0,
          negative_rate: r.total_actions > 0 ? Math.round(((r.skips + r.notInter) / r.total_actions) * 10000) / 100 : 0,
        },
      }));
      return res.json({ success: true, variants });
    } catch (e) { console.error('[rs-exp:metrics]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });
})();

// ── RS-Phase 10: Onboarding preferences (cold-start) ──
// Lưu user prefs cho For-You feed personalization: subject/grade/interestedTopics.
// Persist trong "UserProfile.data" JSONB → user_id PK.
;(() => {
  async function _ensureRecoPrefsCol() {
    const pool = _getPool();
    try { await pool.query(`ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS reco_prefs JSONB`); } catch {}
  }
  _ensureRecoPrefsCol().catch(() => {});

  function _recoAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ success: false, error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ success: false, error: 'Token không hợp lệ' }); return null; }
  }

  // GET /api/reco/onboarding/prefs
  app.get('/api/reco/onboarding/prefs', async (req, res) => {
    const decoded = _recoAuth(req, res); if (!decoded) return;
    try {
      const userId = decoded.userId || decoded.id || decoded.sub;
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT reco_prefs FROM "UserProfile" WHERE user_id = $1 LIMIT 1`, [userId]
      ).catch(() => ({ rows: [] }));
      return res.json({ success: true, prefs: rows[0]?.reco_prefs || null });
    } catch (e) { console.error('[reco:onboarding:get]', e.message); return res.json({ success: true, prefs: null }); }
  });

  // PUT /api/reco/onboarding/prefs — partial upsert
  app.put('/api/reco/onboarding/prefs', async (req, res) => {
    const decoded = _recoAuth(req, res); if (!decoded) return;
    try {
      const userId = decoded.userId || decoded.id || decoded.sub;
      const patch = req.body || {};
      const pool = _getPool();
      // Merge với prefs cũ
      const { rows: existing } = await pool.query(
        `SELECT reco_prefs FROM "UserProfile" WHERE user_id = $1`, [userId]
      ).catch(() => ({ rows: [] }));
      const current = existing[0]?.reco_prefs || {};
      const next = {
        ...current, ...patch,
        completedAt: patch.skipped ? null : (patch.completedAt || new Date().toISOString()),
      };
      // Fallback SELECT-then-UPDATE/INSERT nếu ON CONFLICT không có UNIQUE constraint
      try {
        await pool.query(`
          INSERT INTO "UserProfile"(user_id, reco_prefs, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (user_id) DO UPDATE SET reco_prefs = EXCLUDED.reco_prefs, updated_at = NOW()
        `, [userId, JSON.stringify(next)]);
      } catch (e) {
        // Schema cũ không có UNIQUE → manual upsert
        const { rowCount } = await pool.query(
          `UPDATE "UserProfile" SET reco_prefs = $1::jsonb, updated_at = NOW() WHERE user_id = $2`,
          [JSON.stringify(next), userId]
        );
        if (rowCount === 0) {
          await pool.query(
            `INSERT INTO "UserProfile"(user_id, reco_prefs, updated_at) VALUES ($1, $2::jsonb, NOW())`,
            [userId, JSON.stringify(next)]
          );
        }
      }
      return res.json({ success: true, prefs: next });
    } catch (e) { console.error('[reco:onboarding:put]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // GET /api/reco/onboarding/subjects — danh sách môn + khối cho UI onboarding
  app.get('/api/reco/onboarding/subjects', (_req, res) => {
    res.json({
      success: true,
      subjects: [
        'Toán học', 'Vật lí', 'Hoá học', 'Sinh học',
        'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lí',
        'Tin học', 'Công nghệ', 'GDCD', 'Mĩ thuật', 'Âm nhạc', 'Thể dục',
      ],
      grades: ['6','7','8','9','10','11','12'],
    });
  });
})();

// Teacher service (port 8106)
// REMOVED stub /api/teacher/students — real handler ở line ~1347 (đầy đủ metrics)
app.get('/api/teacher/leaderboard', (_req, res) => res.json({ teachers: [], total: 0 }));
// (real /api/teacher/roster handler ở line ~1150 — không cần stub này)

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
  // Migrate sang JSONB cho options + tags + learningObjectives.
  for (const col of ['options', 'tags', 'learningObjectives']) {
    try {
      await pool.query(`ALTER TABLE "Question" ALTER COLUMN "${col}" TYPE JSONB USING to_jsonb("${col}")`);
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
    const scope = req.query.scope || 'all';
    // CONSISTENT với POST /api/questions/batch: prefer userId/id over sub
    // (vì JWT có thể có nhiều ID fields, phải match cùng logic để isOwner chuẩn)
    const me = decoded.userId || decoded.id || decoded.sub;
    // Tất cả ID có thể của user — match nếu teacher_id == bất kỳ một cái nào
    const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
    const pool = _getPool();
    let where;
    const params = [myIds];
    if (scope === 'mine') {
      where = `teacher_id = ANY($1::text[])`;
    } else if (scope === 'public') {
      where = `visibility = 'public' AND NOT (teacher_id = ANY($1::text[]))`;
    } else {
      where = `teacher_id = ANY($1::text[]) OR visibility = 'public'`;
    }
    const { rows } = await pool.query(
      `SELECT *, (teacher_id = ANY($1::text[])) AS is_owner FROM "Question"
       WHERE ${where} ORDER BY created_at DESC LIMIT 500`,
      params
    );
    const questions = rows.map(r => ({
      ...r,
      visibility: r.visibility || 'private',
      isOwner: !!r.is_owner,
    }));
    return res.json({ questions, total: questions.length, _debug: { me, myIds } });
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
  const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
  const myId = decoded.userId || decoded.id || decoded.sub;
  try {
    const pool = _getPool();
    // 1) Kiểm tra ownership
    const { rows: existing } = await pool.query(
      `SELECT * FROM "Question" WHERE id = $1`, [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
    const orig = existing[0];
    const isOwner = myIds.includes(orig.teacher_id) || myIds.includes(orig.createdBy);

    // 2) Build update payload từ req.body
    const fields = ['content', 'type', 'subject', 'grade', 'chapter', 'difficulty', 'answer', 'explanation'];
    const jsonFields = ['options', 'tags'];
    const allowVisibility = req.body.visibility !== undefined && ['private','public'].includes(req.body.visibility);

    // 3a) Nếu IS OWNER → UPDATE in-place (logic cũ)
    if (isOwner) {
      const updates = ['updated_at = NOW()']; const params = [req.params.id];
      for (const f of fields) if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f} = $${params.length}`); }
      for (const f of jsonFields) if (req.body[f] !== undefined) { params.push(JSON.stringify(req.body[f])); updates.push(`${f} = $${params.length}::jsonb`); }
      if (allowVisibility) { params.push(req.body.visibility); updates.push(`visibility = $${params.length}`); }
      await pool.query(`UPDATE "Question" SET ${updates.join(', ')} WHERE id = $1`, params);
      return res.json({ ok: true, action: 'updated', id: req.params.id });
    }

    // 3b) Nếu NOT OWNER → CLONE câu hỏi với edit của user + teacher_id mới
    // (visibility câu mới = 'private' default — user phải chủ động share lại)
    const { randomUUID } = require('crypto');
    const newId = randomUUID();
    // Merge: original fields + user's overrides
    const merged = {
      content:     req.body.content     ?? orig.content,
      type:        req.body.type        ?? orig.type,
      subject:     req.body.subject     ?? orig.subject,
      grade:       req.body.grade       ?? orig.grade,
      chapter:     req.body.chapter     ?? orig.chapter,
      difficulty:  req.body.difficulty  ?? orig.difficulty,
      answer:      req.body.answer      ?? orig.answer,
      explanation: req.body.explanation ?? orig.explanation,
      options:     req.body.options     ?? orig.options,
      tags:        req.body.tags        ?? orig.tags,
    };
    await pool.query(
      `INSERT INTO "Question"(id, teacher_id, "createdBy", content, type, subject, grade,
                              chapter, difficulty, options, answer, explanation, tags,
                              visibility, status, "createdAt", "updatedAt")
       VALUES ($1::text,$2::text,$2::text,$3::text,$4::text,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,
               'private','active',NOW(),NOW())`,
      [newId, myId, merged.content, merged.type, merged.subject, merged.grade,
       merged.chapter, merged.difficulty, JSON.stringify(merged.options || []),
       merged.answer, merged.explanation, JSON.stringify(merged.tags || [])]);
    console.log(`[qb:clone-on-edit] user=${myId} cloned ${req.params.id} → ${newId}`);
    return res.json({
      ok: true,
      action: 'cloned',
      id: newId,
      originalId: req.params.id,
      message: 'Câu hỏi gốc của GV khác — đã tạo bản sao thuộc sở hữu của bạn để chỉnh sửa.',
    });
  } catch (e) { console.error('[question-bank:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật' }); }
});

// POST /api/question-bank/:id/duplicate — explicit clone (không edit)
// Tạo bản sao thuộc sở hữu của user hiện tại, visibility=private mặc định.
app.post('/api/question-bank/:id/duplicate', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  const myId = decoded.userId || decoded.id || decoded.sub;
  try {
    const pool = _getPool();
    // Cho phép duplicate câu của mình HOẶC câu public
    const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
    const { rows } = await pool.query(
      `SELECT * FROM "Question" WHERE id = $1
       AND (teacher_id = ANY($2::text[]) OR visibility = 'public')`,
      [req.params.id, myIds]);
    if (!rows.length) return res.status(404).json({ error: 'Câu hỏi không tồn tại hoặc không công khai' });
    const orig = rows[0];
    const { randomUUID } = require('crypto');
    const newId = randomUUID();
    await pool.query(
      `INSERT INTO "Question"(id, teacher_id, "createdBy", content, type, subject, grade,
                              chapter, difficulty, options, answer, explanation, tags,
                              visibility, status, "createdAt", "updatedAt")
       VALUES ($1::text,$2::text,$2::text,$3::text,$4::text,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,
               'private','active',NOW(),NOW())`,
      [newId, myId, orig.content, orig.type, orig.subject, orig.grade,
       orig.chapter, orig.difficulty, JSON.stringify(orig.options || []),
       orig.answer, orig.explanation, JSON.stringify(orig.tags || [])]);
    return res.json({ ok: true, id: newId, originalId: req.params.id });
  } catch (e) { console.error('[qb:dup]', e.message); return res.status(500).json({ error: 'Lỗi nhân bản' }); }
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
// (real handler at line ~3130 inside USE_NODEJS_QUESTIONS block — bulk scan + update Question table)

// ── Exams CRUD ──
// /api/exams + /api/teacher/exams — list đề: của mình + public của người khác
// Sử dụng ANY(myIds) để match mọi JWT field (userId/id/sub/email)
function _examListWhere(scope) {
  if (scope === 'mine') return `teacher_id = ANY($1::text[])`;
  if (scope === 'public') return `visibility = 'public' AND NOT (teacher_id = ANY($1::text[]))`;
  return `teacher_id = ANY($1::text[]) OR visibility = 'public'`;
}
app.get('/api/exams', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
    const pool = _getPool();
    const where = _examListWhere(req.query.scope || 'mine');
    const { rows } = await pool.query(
      `SELECT id, title, description, subject, grade, duration_min, total_points, status,
              visibility, teacher_id, created_at, updated_at,
              jsonb_array_length(question_ids) AS question_count,
              (teacher_id = ANY($1::text[])) AS is_owner
       FROM "Exam" WHERE ${where} ORDER BY created_at DESC LIMIT 500`, [myIds]);
    const exams = rows.map(r => ({ ...r, visibility: r.visibility || 'private', isOwner: !!r.is_owner }));
    return res.json({ exams, total: exams.length });
  } catch (e) { console.error('[exams:list]', e.message); return res.json({ exams: [], total: 0 }); }
});

app.get('/api/teacher/exams', async (req, res) => {
  const decoded = _examAuth(req, res); if (!decoded) return;
  try {
    const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
    const pool = _getPool();
    // scope = 'mine' | 'public' | 'all' (default 'mine' để compat)
    // 'all' = đề của tôi + đề public từ GV khác (cộng đồng)
    const scope = String(req.query.scope || 'mine');
    const where = _examListWhere(scope);
    // Enrich với teacher info + community stats (attempts + avg score từ PracticeExam)
    const { rows } = await pool.query(`
      SELECT e.*,
             (e.teacher_id = ANY($1::text[])) AS is_owner,
             u.name AS author_name, u.email AS author_email, u.image AS author_image,
             COALESCE(ps.attempts, 0)::int AS attempts,
             COALESCE(ps.unique_students, 0)::int AS unique_students,
             COALESCE(ps.avg_score, 0)::int AS avg_score
      FROM "Exam" e
      LEFT JOIN "User" u ON u.id = COALESCE(e.teacher_id, e."userId"::text)
      LEFT JOIN (
        -- Normalize PracticeExam subject + grade để match Exam đa biến thể
        -- (Vật lí ↔ Vật lý, "Lớp 11" ↔ "11", NULL grade ↔ any)
        SELECT
          LOWER(REGEXP_REPLACE(COALESCE(subject, ''), '[íìỉĩịýỳỷỹỵ]', 'i', 'g')) AS subj_norm,
          REGEXP_REPLACE(COALESCE(grade, ''), '[^0-9]', '', 'g') AS grade_norm,
          COUNT(*)::int AS attempts,
          COUNT(DISTINCT "studentId")::int AS unique_students,
          ROUND(AVG(NULLIF(percentage, 0)))::int AS avg_score
        FROM "PracticeExam" WHERE completed
        GROUP BY 1, 2
      ) ps
        ON ps.subj_norm = LOWER(REGEXP_REPLACE(COALESCE(e.subject, ''), '[íìỉĩịýỳỷỹỵ]', 'i', 'g'))
       AND (ps.grade_norm = REGEXP_REPLACE(COALESCE(e.grade, ''), '[^0-9]', '', 'g')
            OR ps.grade_norm = ''
            OR REGEXP_REPLACE(COALESCE(e.grade, ''), '[^0-9]', '', 'g') = '')
      WHERE ${where}
      ORDER BY e.created_at DESC LIMIT 500`, [myIds]).catch(async (err) => {
        // Fallback nếu PracticeExam có shape khác → query không enrich
        console.warn('[teacher-exams:list] enriched query failed:', err.message.slice(0, 100));
        return pool.query(`
          SELECT e.*,
                 (e.teacher_id = ANY($1::text[])) AS is_owner,
                 u.name AS author_name, u.email AS author_email, u.image AS author_image,
                 0 AS attempts, 0 AS unique_students, 0 AS avg_score
          FROM "Exam" e
          LEFT JOIN "User" u ON u.id = COALESCE(e.teacher_id, e."userId"::text)
          WHERE ${where}
          ORDER BY e.created_at DESC LIMIT 500`, [myIds]);
      });
    const exams = rows.map(r => ({
      ...r,
      visibility: r.visibility || 'private',
      isOwner: !!r.is_owner,
      authorName: r.author_name || 'Chưa rõ',
      authorEmail: r.author_email || null,
      authorImage: r.author_image || null,
      attempts: Number(r.attempts) || 0,
      uniqueStudents: Number(r.unique_students) || 0,
      avgScore: Number(r.avg_score) || 0,
    }));
    return res.json({ exams, total: exams.length, scope });
  } catch (e) { console.error('[teacher-exams:list]', e.message); return res.json({ exams: [], total: 0 }); }
});

// ── /api/exams/community-stats — bảng vinh danh ──
// Top đề được làm nhiều nhất + Top GV có đề được đánh giá cao
;(() => {
  app.get('/api/exams/community-stats', async (req, res) => {
    // Public endpoint — bất kỳ ai cũng xem được (không leak điểm cá nhân)
    try {
      const pool = _getPool();
      const limit = Math.max(5, Math.min(50, parseInt(String(req.query.limit || '10'), 10) || 10));

      // ── HELPER SQL: normalize subject + grade ──
      // Vấn đề: Exam.subject="Vật lí" vs PracticeExam.subject="Vật lý" (lệch dấu)
      //          Exam.grade=NULL vs PracticeExam.grade="11" (NULL mismatch)
      // → Match thất bại → mostAttempted/topTeachers rỗng dù có 117 lượt thi.
      //
      // Solution: normalize cả 2 bên:
      //   subj_norm = LOWER + thay "í/ý/ỳ/ỷ/ỹ/ỵ" → "i" (đồng nhất "lý" ↔ "lí")
      //   grade_norm = chỉ giữ digits ("Lớp 11" → "11", "11" → "11", NULL → "")
      // Match grade nới: nếu 1 bên = '' → wildcard match (proxy "tất cả lớp").
      const NORM_SUBJ = (col) => `LOWER(REGEXP_REPLACE(COALESCE(${col}, ''), '[íìỉĩịýỳỷỹỵ]', 'i', 'g'))`;
      const NORM_GRADE = (col) => `REGEXP_REPLACE(COALESCE(${col}, ''), '[^0-9]', '', 'g')`;

      const [mostAttemptedR, topTeachersR, summaryR] = await Promise.all([
        // TOP đề được làm nhiều nhất — JOIN Exam + PracticeExam qua normalized subject+grade
        // Nhiều đề cùng (subject, grade) → cùng share attempts count (đại diện "đề hot subject").
        pool.query(`
          WITH practice_agg AS (
            SELECT
              ${NORM_SUBJ('subject')} AS subj_norm,
              ${NORM_GRADE('grade')} AS grade_norm,
              MAX(subject) AS subject_display,
              MAX(grade) AS grade_display,
              COUNT(*)::int AS attempts,
              COUNT(DISTINCT "studentId")::int AS unique_students,
              ROUND(AVG(NULLIF(percentage, 0)))::int AS avg_score
            FROM "PracticeExam" WHERE completed
            GROUP BY 1, 2
          ),
          exam_norm AS (
            SELECT e.*,
                   ${NORM_SUBJ('e.subject')} AS subj_norm,
                   ${NORM_GRADE('e.grade')} AS grade_norm
            FROM "Exam" e
          )
          SELECT en.id, en.title, en.subject, en.grade,
                 jsonb_array_length(COALESCE(en.question_ids, '[]'::jsonb)) AS question_count,
                 pa.attempts, pa.unique_students, pa.avg_score,
                 u.id AS teacher_id, u.name AS teacher_name, u.image AS teacher_image
          FROM exam_norm en
          JOIN practice_agg pa
            ON pa.subj_norm = en.subj_norm
           AND (pa.grade_norm = en.grade_norm OR pa.grade_norm = '' OR en.grade_norm = '')
          LEFT JOIN "User" u ON u.id = COALESCE(en.teacher_id, en."userId"::text)
          WHERE pa.attempts > 0
          ORDER BY pa.attempts DESC, pa.avg_score DESC NULLS LAST
          LIMIT $1`, [limit])
          .catch(err => { console.warn('[mostAttempted] query failed:', err.message.slice(0, 200)); return { rows: [] }; }),

        // TOP GV — sum attempts qua TẤT CẢ đề của GV (normalized match)
        pool.query(`
          WITH practice_agg AS (
            SELECT
              ${NORM_SUBJ('subject')} AS subj_norm,
              ${NORM_GRADE('grade')} AS grade_norm,
              COUNT(*)::int AS attempts,
              ROUND(AVG(NULLIF(percentage, 0)))::int AS avg_score
            FROM "PracticeExam" WHERE completed
            GROUP BY 1, 2
          ),
          exam_norm AS (
            SELECT e.id,
                   COALESCE(e.teacher_id, e."userId"::text) AS tid,
                   ${NORM_SUBJ('e.subject')} AS subj_norm,
                   ${NORM_GRADE('e.grade')} AS grade_norm
            FROM "Exam" e
            WHERE COALESCE(e.teacher_id, e."userId"::text) IS NOT NULL
          ),
          teacher_stats AS (
            SELECT en.tid,
                   COUNT(DISTINCT en.id)::int AS exam_count,
                   SUM(COALESCE(pa.attempts, 0))::int AS total_attempts,
                   ROUND(AVG(NULLIF(pa.avg_score, 0)))::int AS avg_score
            FROM exam_norm en
            LEFT JOIN practice_agg pa
              ON pa.subj_norm = en.subj_norm
             AND (pa.grade_norm = en.grade_norm OR pa.grade_norm = '' OR en.grade_norm = '')
            GROUP BY en.tid
          )
          SELECT u.id, u.name, u.email, u.image,
                 ts.exam_count, ts.total_attempts, ts.avg_score
          FROM teacher_stats ts
          JOIN "User" u ON u.id = ts.tid
          WHERE ts.total_attempts > 0
          ORDER BY ts.total_attempts DESC, ts.avg_score DESC NULLS LAST
          LIMIT $1`, [limit])
          .catch(err => { console.warn('[topTeachers] query failed:', err.message.slice(0, 200)); return { rows: [] }; }),

        // Summary
        pool.query(`
          SELECT
            (SELECT COUNT(*) FROM "Exam")::int AS total_exams,
            (SELECT COUNT(*) FROM "Exam" WHERE visibility = 'public')::int AS public_exams,
            (SELECT COUNT(DISTINCT COALESCE(teacher_id, "userId"::text)) FROM "Exam")::int AS contributing_teachers,
            (SELECT COUNT(*) FROM "PracticeExam" WHERE completed)::int AS total_attempts,
            (SELECT COUNT(DISTINCT "studentId") FROM "PracticeExam" WHERE completed)::int AS active_students,
            (SELECT ROUND(AVG(NULLIF(percentage, 0)))::int FROM "PracticeExam" WHERE completed) AS avg_score
        `).catch(() => ({ rows: [{ total_exams: 0, public_exams: 0, contributing_teachers: 0,
                                     total_attempts: 0, active_students: 0, avg_score: 0 }] })),
      ]);

      return res.json({
        mostAttempted: mostAttemptedR.rows.map(r => ({
          id: r.id,
          title: r.title,
          subject: r.subject,
          grade: r.grade,
          questionCount: Number(r.question_count) || 0,
          attempts: Number(r.attempts) || 0,
          uniqueStudents: Number(r.unique_students) || 0,
          avgScore: Number(r.avg_score) || 0,
          teacher: r.teacher_id ? {
            id: r.teacher_id,
            name: r.teacher_name || 'Chưa rõ',
            image: r.teacher_image || null,
          } : null,
        })),
        topTeachers: topTeachersR.rows.map(r => ({
          id: r.id,
          name: r.name || 'Chưa rõ',
          email: r.email,
          image: r.image,
          examCount: Number(r.exam_count) || 0,
          totalAttempts: Number(r.total_attempts) || 0,
          avgScore: Number(r.avg_score) || 0,
        })),
        summary: summaryR.rows[0] || {},
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[exams:community-stats]', e.message);
      return res.status(500).json({ error: e.message });
    }
  });
})();

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
  // Optional auth — anonymous xem đề preview, authenticated thấy isOwner.
  const auth = req.headers.authorization || '';
  let decoded = null;
  if (auth.startsWith('Bearer ')) {
    try { decoded = _akVerify(auth.slice(7)); } catch { /* ignore */ }
  }
  try {
    const pool = _getPool();
    const myIds = decoded ? [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))] : [];
    const { rows } = await pool.query(
      `SELECT *, (teacher_id = ANY($2::text[])) AS is_owner FROM "Exam"
       WHERE id = $1 AND COALESCE(status, '') != 'archived'`,
      [req.params.id, myIds.length ? myIds : ['__none__']]);
    if (!rows.length) {
      const { rowCount } = await pool.query(`SELECT 1 FROM "Exam" WHERE id = $1`, [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'Đề thi không tồn tại trong hệ thống' });
      return res.status(403).json({ error: 'Đề này đã bị lưu trữ — không thể truy cập' });
    }
    const examRow = rows[0];
    const exam = { ...examRow, visibility: examRow.visibility || 'private', isOwner: !!examRow.is_owner };
    // Hydrate questions
    let questions = [];
    let questionsSource = 'exam_question_ids';
    const qIds = Array.isArray(examRow.question_ids) ? examRow.question_ids
                 : (examRow.question_ids ? JSON.parse(examRow.question_ids) : []);
    if (qIds && qIds.length > 0) {
      const { rows: qRows } = await pool.query(
        `SELECT id, content, type, difficulty, options, answer AS correct, explanation,
                subject, grade, chapter
         FROM "Question" WHERE id = ANY($1::text[])`, [qIds]
      ).catch(() => ({ rows: [] }));
      const byId = new Map(qRows.map(q => [q.id, q]));
      questions = qIds.map(id => byId.get(id)).filter(Boolean);
    }
    // FALLBACK: nếu exam có 0 question, pull theo subject — subject có thể
    // trong examRow.subject HOẶC examRow.description JSON {"subject":"..."}
    if (questions.length === 0) {
      let subj = examRow.subject;
      if (!subj && examRow.description) {
        try {
          const parsed = typeof examRow.description === 'string'
            ? JSON.parse(examRow.description) : examRow.description;
          subj = parsed?.subject || null;
        } catch { /* not JSON, treat as plain text — skip */ }
      }
      // Normalize variants: Vật lý → Vật lí (TT 32/2018)
      if (subj === 'Vật lý' || subj === 'Vat ly') subj = 'Vật lí';
      if (subj === 'Hóa học') subj = 'Hoá học';
      if (subj) {
        try {
          const { rows: qRows } = await pool.query(`
            SELECT id, content, type, difficulty, options, answer AS correct, explanation,
                   subject, grade, chapter
            FROM "Question"
            WHERE subject IN ($1, $2) AND COALESCE(status, '') != 'archived'
            ORDER BY RANDOM() LIMIT 20
          `, [subj, subj === 'Vật lí' ? 'Vật lý' : subj]);  // match cả 2 chính tả
          questions = qRows;
          if (questions.length > 0) questionsSource = 'fallback_by_subject';
        } catch { /* skip */ }
      }
    }
    return res.json({ exam, questions, questionsSource, note: questions.length === 0 ? 'Đề này chưa có câu hỏi nào. Liên hệ GV để bổ sung.' : null });
  } catch (e) { console.error('[exams:get]', e.message); return res.status(500).json({ error: 'Lỗi tải đề' }); }
});

// POST /api/exams/:id/grade — HS submit answers, BE calculate score + save PracticeExam
app.post('/api/exams/:id/grade', async (req, res) => {
  const auth = req.headers.authorization || '';
  let decoded = null;
  if (auth.startsWith('Bearer ')) {
    try { decoded = _akVerify(auth.slice(7)); } catch {}
  }
  try {
    const { answers = {}, timeSpent = 0 } = req.body || {};
    const pool = _getPool();
    // Load exam + questions
    const { rows: examRows } = await pool.query(
      `SELECT id, title, question_ids, total_points FROM "Exam" WHERE id = $1`,
      [req.params.id]);
    if (!examRows.length) return res.status(404).json({ error: 'Đề thi không tồn tại' });
    const examRow = examRows[0];
    const qIds = Array.isArray(examRow.question_ids) ? examRow.question_ids
                 : (examRow.question_ids ? JSON.parse(examRow.question_ids) : []);
    if (!qIds.length) return res.status(400).json({ error: 'Đề chưa có câu hỏi' });
    const { rows: questions } = await pool.query(
      `SELECT id, type, options, answer AS correct FROM "Question" WHERE id = ANY($1::text[])`, [qIds]);

    // Grade
    let correct = 0;
    const breakdown = [];
    for (const q of questions) {
      const userAns = answers[q.id];
      const correctAns = q.correct;
      let isCorrect = false;
      if (userAns != null && correctAns != null) {
        // Multiple choice: compare string/index
        if (Array.isArray(correctAns)) {
          isCorrect = Array.isArray(userAns) &&
            userAns.length === correctAns.length &&
            userAns.every(a => correctAns.includes(a));
        } else {
          isCorrect = String(userAns).trim() === String(correctAns).trim();
        }
      }
      if (isCorrect) correct++;
      breakdown.push({ questionId: q.id, isCorrect, userAnswer: userAns, correctAnswer: correctAns });
    }
    const total = questions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const score = examRow.total_points ? Math.round((correct / total) * examRow.total_points) : correct;

    // Save PracticeExam record (graceful nếu table chưa có)
    const userId = decoded?.userId || decoded?.id || decoded?.sub;
    if (userId) {
      try {
        const { randomUUID } = require('crypto');
        await pool.query(`
          INSERT INTO "PracticeExam"(id, "studentId", "examId", "examTitle",
            "totalQuestions", "correctCount", percentage, score, "timeSpentSec",
            breakdown, completed, "completedAt", "createdAt")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,true,NOW(),NOW())
        `, [randomUUID(), userId, examRow.id, examRow.title,
            total, correct, percentage, score, Math.floor(timeSpent),
            JSON.stringify(breakdown)]);
      } catch { /* table may not exist */ }
    }

    return res.json({
      success: true,
      total, correct, wrong: total - correct,
      percentage, score,
      passed: percentage >= 50,
      breakdown,
      timeSpent: Math.floor(timeSpent),
    });
  } catch (e) { console.error('[exams:grade]', e.message); return res.status(500).json({ error: 'Lỗi chấm bài' }); }
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

// /api/exams/generate-from-matrix — tạo exam từ ma trận (AI quiz_generate)
app.post('/api/exams/generate-from-matrix', require('./lib/gating.cjs').requireFeature('quiz_generate'), async (req, res) => {
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
// REMOVED stub /api/teacher/dashboard — real handler ở line ~1321 (3 endpoints IIFE)
// REMOVED stub /api/teacher/modules — moved to teacher-service stubs section
// REMOVED stub /api/teacher/my-students — shadow real handler ~line 1911
// REMOVED stub /api/teacher/student-requests + sprints — shadow real handlers ~line 1170

// Student
// Real /api/student/my-teachers — HS đã kết nối GV qua TSL (status=approved)
app.get('/api/student/my-teachers', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let decoded;
  try { decoded = _akVerify(auth.slice(7)); }
  catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }
  try {
    const pool = _getPool();
    const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
    const { rows } = await pool.query(`
      SELECT tsl.id AS "linkId", tsl.created_at AS "linkedAt",
             tsl.approved_at AS "approvedAt", tsl.direction,
             u.id, u.name, u.email, u.image, u.role
      FROM "TeacherStudentLink" tsl
      LEFT JOIN "User" u ON u.id = tsl.teacher_id
      WHERE tsl.status = 'approved' AND tsl.student_id = ANY($1::text[])
      ORDER BY tsl.approved_at DESC NULLS LAST, tsl.created_at DESC LIMIT 200
    `, [myIds]).catch(() => ({ rows: [] }));
    const teachers = rows.map(r => ({
      id: r.id, linkId: r.linkId,
      name: r.name || r.email || `GV ${(r.id || '').slice(0, 8)}`,
      email: r.email || '', image: r.image || null,
      role: r.role || 'TEACHER',
      initiatedBy: r.direction === 'student_requests' ? 'student'
                  : r.direction === 'teacher_invites' ? 'teacher'
                  : 'auto',
      approvedAt: r.approvedAt || r.linkedAt,
      linkedAt: r.approvedAt || r.linkedAt,
    }));
    return res.json({ teachers, total: teachers.length });
  } catch (e) { console.error('[student:my-teachers]', e.message); return res.json({ teachers: [], total: 0 }); }
});
app.get('/api/student/progress-overview', (_req, res) => res.json({ overall: 0, subjects: [], streak: 0 }));
app.get('/api/student/learning-paths', (_req, res) => res.json({ paths: [], total: 0 }));

// ── /api/student/exam-rooms — HS thấy phòng thi public + đã join ──
// Shape match StudentExamRoom interface ở pages/student/Exams.tsx
app.get('/api/student/exam-rooms', async (req, res) => {
  const auth = req.headers.authorization || '';
  let userId = null;
  if (auth.startsWith('Bearer ')) {
    try { userId = _akVerify(auth.slice(7)).sub; } catch {}
  }
  try {
    const pool = _getPool();
    // Lazy migrate RoomParticipant table (HS join phòng → record)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "RoomParticipant" (
        id          VARCHAR(36)  PRIMARY KEY,
        room_id     VARCHAR(36)  NOT NULL,
        user_id     VARCHAR(255) NOT NULL,
        score       NUMERIC(5,2),
        joined_at   TIMESTAMPTZ  DEFAULT NOW(),
        submitted_at TIMESTAMPTZ,
        completed   BOOLEAN      DEFAULT false,
        UNIQUE (room_id, user_id)
      )
    `).catch(() => {});

    // Load rooms: public OR HS đã join
    const myIds = userId ? [userId] : [''];
    const { rows: rooms } = await pool.query(`
      SELECT r.id, r.name, r.description, r.status, r.start_time AS "startTime",
             r.end_time AS "endTime", r.duration, r.is_public AS "isPublic",
             r.max_students AS "maxStudents", r.teacher_id, r.exam_id,
             u.name AS "teacherName",
             e.title AS "examTitle"
      FROM "OnlineExamRoom" r
      LEFT JOIN "User" u ON u.id = r.teacher_id
      LEFT JOIN "Exam" e ON e.id = r.exam_id
      WHERE r.is_public = true
         OR EXISTS (SELECT 1 FROM "RoomParticipant" WHERE room_id = r.id AND user_id = ANY($1::text[]))
      ORDER BY r.start_time DESC NULLS LAST LIMIT 100
    `, [myIds]).catch(() => ({ rows: [] }));

    if (!rooms.length) return res.json({ rooms: [], count: 0 });

    const roomIds = rooms.map(r => r.id);
    // Batch load participants + counts
    const [participants, examQCount] = await Promise.all([
      pool.query(`
        SELECT room_id, user_id, score, joined_at, submitted_at, completed
        FROM "RoomParticipant" WHERE room_id = ANY($1::text[])
      `, [roomIds]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT id, COALESCE(jsonb_array_length(question_ids), 0)::int AS qcount
        FROM "Exam" WHERE id = ANY($1::text[])
      `, [rooms.filter(r => r.exam_id).map(r => r.exam_id)]).catch(() => ({ rows: [] })),
    ]);

    const qcountByExam = {};
    for (const r of examQCount.rows) qcountByExam[r.id] = r.qcount;

    const partsByRoom = {};
    for (const p of participants.rows) {
      (partsByRoom[p.room_id] = partsByRoom[p.room_id] || []).push(p);
    }

    // Build leaderboard names — batch query User
    const allUserIds = [...new Set(participants.rows.map(p => p.user_id))];
    const usersById = {};
    if (allUserIds.length) {
      const { rows: us } = await pool.query(
        `SELECT id, name FROM "User" WHERE id = ANY($1::text[])`, [allUserIds]
      ).catch(() => ({ rows: [] }));
      for (const u of us) usersById[u.id] = u.name;
    }

    const result = rooms.map(r => {
      const parts = partsByRoom[r.id] || [];
      // Leaderboard: sort by score DESC, top 10
      const ranked = parts
        .filter(p => p.score != null)
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 10)
        .map((p, idx) => ({
          userId: p.user_id,
          name: usersById[p.user_id] || `HS ${p.user_id.slice(0, 6)}`,
          score: Number(p.score),
          rank: idx + 1,
          submittedAt: p.submitted_at,
          isMe: p.user_id === userId,
        }));
      const myPart = userId ? parts.find(p => p.user_id === userId) : null;
      return {
        id: r.id, name: r.name, description: r.description,
        status: r.status, startTime: r.startTime, endTime: r.endTime,
        duration: r.duration, isPublic: r.isPublic, maxStudents: r.maxStudents,
        Teacher: r.teacher_id ? { id: r.teacher_id, name: r.teacherName || 'GV' } : null,
        Exam: r.exam_id ? { id: r.exam_id, title: r.examTitle || 'Đề thi', examType: 'standard' } : null,
        _count: { participants: parts.length, questions: qcountByExam[r.exam_id] || 0 },
        myParticipant: myPart ? {
          score: myPart.score != null ? Number(myPart.score) : null,
          joinedAt: myPart.joined_at, submittedAt: myPart.submitted_at,
          completed: !!myPart.completed,
        } : null,
        leaderboard: ranked,
      };
    });

    return res.json({ rooms: result, count: result.length });
  } catch (e) {
    console.error('[student:exam-rooms]', e.message);
    return res.json({ rooms: [], count: 0 });
  }
});

// ── /api/personality-test — Career test (MBTI + Holland) ──
;(() => {
  async function _ensurePersonalityTable() {
    const pool = _getPool();
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "PersonalityTest" (
          id              VARCHAR(36)  PRIMARY KEY,
          user_id         VARCHAR(255),
          user_name       VARCHAR(200),
          user_year       INTEGER,
          mbti_type       VARCHAR(10),
          mbti_name       VARCHAR(100),
          mbti_scores     JSONB,
          holland_code    VARCHAR(10),
          holland_scores  JSONB,
          careers         JSONB,
          created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_personality_user ON "PersonalityTest"(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_personality_mbti ON "PersonalityTest"(mbti_type)`);
    } catch {}
  }
  _ensurePersonalityTable().catch(() => {});

  // POST /api/personality-test — save kết quả
  app.post('/api/personality-test', async (req, res) => {
    const auth = req.headers.authorization || '';
    let userId = null;
    if (auth.startsWith('Bearer ')) { try { userId = _akVerify(auth.slice(7)).sub; } catch {} }
    try {
      const b = req.body || {};
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const pool = _getPool();
      await pool.query(`
        INSERT INTO "PersonalityTest"(id, user_id, user_name, user_year,
          mbti_type, mbti_name, mbti_scores, holland_code, holland_scores, careers)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb)
      `, [id, userId, b.userName || null, b.userYearOfBirth || null,
          b.mbtiType, b.personalityName, JSON.stringify(b.mbtiScores || {}),
          b.hollandCode, JSON.stringify(b.hollandScores || {}),
          JSON.stringify(b.careers || [])]);
      return res.json({ success: true, id });
    } catch (e) { console.error('[personality:save]', e.message); return res.json({ success: false, id: null }); }
  });

  // GET /api/personality-test?action=history | community-stats
  app.get('/api/personality-test', async (req, res) => {
    const action = String(req.query.action || '').toLowerCase();
    const auth = req.headers.authorization || '';
    let userId = null;
    if (auth.startsWith('Bearer ')) { try { userId = _akVerify(auth.slice(7)).sub; } catch {} }

    const MBTI_NAMES = {
      INTJ: 'Nhà chiến lược', INTP: 'Nhà tư tưởng', ENTJ: 'Tổng tư lệnh', ENTP: 'Người tranh luận',
      INFJ: 'Người che chở', INFP: 'Người trung gian', ENFJ: 'Nhà sư phạm', ENFP: 'Nhà vận động',
      ISTJ: 'Nhà kỹ trị', ISFJ: 'Người bảo vệ', ESTJ: 'Nhà điều hành', ESFJ: 'Lãnh sự',
      ISTP: 'Nghệ nhân', ISFP: 'Nghệ sĩ', ESTP: 'Doanh nhân', ESFP: 'Người trình diễn',
    };
    const HOLLAND_LABELS = {
      R: 'Realistic (Thực tế)', I: 'Investigative (Nghiên cứu)', A: 'Artistic (Nghệ thuật)',
      S: 'Social (Xã hội)', E: 'Enterprising (Lãnh đạo)', C: 'Conventional (Quy củ)',
    };

    try {
      const pool = _getPool();
      if (action === 'history') {
        if (!userId) return res.json({ success: true, data: [] });
        const { rows } = await pool.query(`
          SELECT id, user_name AS "userName", user_year AS "userYearOfBirth",
                 mbti_type AS "mbtiType", mbti_name AS "personalityName",
                 mbti_scores AS "mbtiScores", holland_code AS "hollandCode",
                 holland_scores AS "hollandScores", careers,
                 created_at AS "createdAt"
          FROM "PersonalityTest" WHERE user_id = $1
          ORDER BY created_at DESC LIMIT 50
        `, [userId]).catch(() => ({ rows: [] }));
        return res.json({ success: true, data: rows });
      }
      // community-stats — aggregate toàn bộ
      const [totals, mbtiDist, hollandDist, topCareers, lastAt] = await Promise.all([
        pool.query(`
          SELECT COUNT(*)::int AS attempts,
                 COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS users
          FROM "PersonalityTest"`).catch(() => ({ rows: [{ attempts: 0, users: 0 }] })),
        pool.query(`
          SELECT mbti_type AS type, COUNT(*)::int AS count FROM "PersonalityTest"
          WHERE mbti_type IS NOT NULL GROUP BY mbti_type ORDER BY count DESC LIMIT 16
        `).catch(() => ({ rows: [] })),
        pool.query(`
          SELECT SUBSTRING(holland_code FROM i FOR 1) AS letter, COUNT(*)::int AS count
          FROM "PersonalityTest", generate_series(1, 6) AS i
          WHERE holland_code IS NOT NULL AND LENGTH(holland_code) >= i
          GROUP BY letter ORDER BY count DESC LIMIT 6
        `).catch(() => ({ rows: [] })),
        pool.query(`
          SELECT career, COUNT(*)::int AS count
          FROM "PersonalityTest", jsonb_array_elements_text(careers) AS career
          WHERE careers IS NOT NULL GROUP BY career ORDER BY count DESC LIMIT 10
        `).catch(() => ({ rows: [] })),
        pool.query(`SELECT MAX(created_at) AS at FROM "PersonalityTest"`).catch(() => ({ rows: [{ at: null }] })),
      ]);
      const totalAttempts = totals.rows[0]?.attempts || 0;
      const totalUsers = totals.rows[0]?.users || 0;
      const mbti = mbtiDist.rows.map(r => ({
        type: r.type, name: MBTI_NAMES[r.type] || r.type,
        count: r.count, percentage: totalAttempts > 0 ? Math.round((r.count / totalAttempts) * 100) : 0,
      }));
      const holland = hollandDist.rows
        .filter(r => ['R','I','A','S','E','C'].includes(r.letter))
        .map(r => ({
          code: r.letter, label: HOLLAND_LABELS[r.letter] || r.letter,
          count: r.count, percentage: totalAttempts > 0 ? Math.round((r.count / totalAttempts) * 100) : 0,
        }));
      const careers = topCareers.rows.map(r => ({
        name: r.career, count: r.count,
        percentage: totalAttempts > 0 ? Math.round((r.count / totalAttempts) * 100) : 0,
      }));
      return res.json({
        success: true,
        data: {
          totalAttempts, totalUsers,
          updatedAt: lastAt.rows[0]?.at || null,
          mbtiDistribution: mbti,
          hollandDistribution: holland,
          topCareers: careers,
        }
      });
    } catch (e) { console.error('[personality:get]', e.message); return res.json({ success: false, data: null }); }
  });
})();

// GET /api/student/exam-rooms/leaderboard — global top HS theo điểm
// Nguồn data: PracticeExam table (đã có từ commit grade endpoint).
// Top 20 HS sort theo avg percentage 30 ngày gần nhất.
app.get('/api/student/exam-rooms/leaderboard', async (req, res) => {
  const auth = req.headers.authorization || '';
  let userId = null;
  if (auth.startsWith('Bearer ')) {
    try { userId = _akVerify(auth.slice(7)).sub; } catch {}
  }
  const days = Math.min(Number(req.query.days) || 30, 90);
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT
        pe."studentId" AS user_id,
        u.name, u.image,
        COUNT(*)::int AS exam_count,
        ROUND(AVG(pe.percentage)::numeric, 1)::float AS avg_score,
        MAX(pe.percentage)::int AS best_score,
        MAX(pe."completedAt") AS last_at
      FROM "PracticeExam" pe
      LEFT JOIN "User" u ON u.id = pe."studentId"
      WHERE pe.completed = true
        AND pe."completedAt" >= NOW() - INTERVAL '${days} day'
      GROUP BY pe."studentId", u.name, u.image
      HAVING COUNT(*) >= 1
      ORDER BY avg_score DESC, exam_count DESC LIMIT 20
    `).catch(() => ({ rows: [] }));
    const leaderboard = rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.user_id,
      name: r.name || `HS ${(r.user_id || '').slice(0, 6)}`,
      avatar: r.image,
      avgScore: Number(r.avg_score) || 0,
      bestScore: r.best_score || 0,
      examCount: r.exam_count || 0,
      lastAt: r.last_at,
      isMe: r.user_id === userId,
    }));
    // Find my rank if not in top 20
    let myEntry = leaderboard.find(e => e.isMe);
    if (!myEntry && userId) {
      const { rows: meRows } = await pool.query(`
        SELECT
          ROUND(AVG(percentage)::numeric, 1)::float AS avg_score,
          COUNT(*)::int AS exam_count,
          (SELECT COUNT(DISTINCT "studentId")::int + 1 FROM "PracticeExam"
           WHERE completed AND "completedAt" >= NOW() - INTERVAL '${days} day'
             AND "studentId" != $1
             AND (SELECT AVG(percentage) FROM "PracticeExam" pe2 WHERE pe2."studentId" = "PracticeExam"."studentId" AND completed) >
                 (SELECT AVG(percentage) FROM "PracticeExam" pe3 WHERE pe3."studentId" = $1 AND completed)
          ) AS my_rank
        FROM "PracticeExam"
        WHERE "studentId" = $1 AND completed AND "completedAt" >= NOW() - INTERVAL '${days} day'
      `, [userId]).catch(() => ({ rows: [] }));
      if (meRows.length && meRows[0].exam_count > 0) {
        myEntry = {
          rank: meRows[0].my_rank || 999,
          userId, name: 'Bạn', avatar: null,
          avgScore: Number(meRows[0].avg_score) || 0,
          bestScore: 0, examCount: meRows[0].exam_count, isMe: true,
        };
      }
    }
    return res.json({ leaderboard, myEntry: myEntry || null, period: `last_${days}d`, total: leaderboard.length });
  } catch (e) {
    console.error('[exam-rooms:leaderboard]', e.message);
    return res.json({ leaderboard: [], myEntry: null, total: 0 });
  }
});

// POST /api/student/exam-rooms/:id/join — HS join phòng thi
app.post('/api/student/exam-rooms/:id/join', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let userId;
  try { userId = _akVerify(auth.slice(7)).sub; } catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }
  try {
    const pool = _getPool();
    const { accessCode } = req.body || {};
    const { rows } = await pool.query(
      `SELECT id, access_code, is_public, max_students,
              (SELECT COUNT(*) FROM "RoomParticipant" WHERE room_id = $1) AS current_count
       FROM "OnlineExamRoom" WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Phòng thi không tồn tại' });
    const room = rows[0];
    if (!room.is_public && room.access_code && accessCode !== room.access_code) {
      return res.status(403).json({ error: 'Mã phòng không đúng' });
    }
    if (room.max_students && Number(room.current_count) >= room.max_students) {
      return res.status(409).json({ error: 'Phòng đã đầy' });
    }
    const { randomUUID } = require('crypto');
    await pool.query(`
      INSERT INTO "RoomParticipant"(id, room_id, user_id, joined_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (room_id, user_id) DO NOTHING
    `, [randomUUID(), req.params.id, userId]);
    return res.json({ ok: true, roomId: req.params.id });
  } catch (e) { console.error('[student:room:join]', e.message); return res.status(500).json({ error: e.message }); }
});

// Courses
// /api/courses — list catalog (FE thường gọi paginated)
app.get('/api/courses', async (req, res) => {
  try {
    const pool = _getPool();
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const { rows } = await pool.query(`
      SELECT c.id, c."userId", c.title, c.description, c."imageUrl",
             c.price, c."isPublished", c."categoryId", c."createdAt", c."updatedAt",
             cat.name AS "categoryName",
             u.name AS "instructorName", u.image AS "instructorImage"
      FROM "Course" c
      LEFT JOIN "Category" cat ON cat.id = c."categoryId"
      LEFT JOIN "User" u ON u.id = c."userId"
      WHERE c."isPublished" = true
      ORDER BY c."createdAt" DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]).catch(() => ({ rows: [] }));
    const courses = rows.map(r => ({
      id: r.id, userId: r.userId, title: r.title, description: r.description,
      imageUrl: r.imageUrl, price: Number(r.price) || 0,
      isPublished: !!r.isPublished, categoryId: r.categoryId,
      category: r.categoryName ? { id: r.categoryId, name: r.categoryName } : null,
      chapters: [], createdAt: r.createdAt, updatedAt: r.updatedAt,
      instructor: r.instructorName ? { name: r.instructorName, image: r.instructorImage } : null,
    }));
    return res.json({ courses, total: courses.length });
  } catch (e) { console.error('[courses:list]', e.message); return res.json({ courses: [], total: 0 }); }
});

// /api/courses/dashboard — enrolled + featured + my_progress
app.get('/api/courses/dashboard', async (req, res) => {
  const auth = req.headers.authorization || '';
  let userId = null;
  if (auth.startsWith('Bearer ')) { try { userId = _akVerify(auth.slice(7)).sub; } catch {} }
  try {
    const pool = _getPool();
    const [enrolled, featured] = await Promise.all([
      userId ? pool.query(`
        SELECT c.id, c.title, c."imageUrl", c.price
        FROM "Purchase" p JOIN "Course" c ON c.id = p."courseId"
        WHERE p."userId" = $1 ORDER BY p."createdAt" DESC LIMIT 10
      `, [userId]).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
      pool.query(`SELECT id, title, "imageUrl", price FROM "Course" WHERE "isPublished" = true ORDER BY "createdAt" DESC LIMIT 8`).catch(() => ({ rows: [] })),
    ]);
    return res.json({
      enrolled: enrolled.rows,
      featured: featured.rows,
      my_progress: {},
    });
  } catch (e) { return res.json({ enrolled: [], featured: [], my_progress: {} }); }
});

// /api/courses/:id — course detail với chapters
app.get('/api/courses/:id', async (req, res) => {
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT c.*, cat.name AS "categoryName",
             u.name AS "instructorName", u.image AS "instructorImage"
      FROM "Course" c
      LEFT JOIN "Category" cat ON cat.id = c."categoryId"
      LEFT JOIN "User" u ON u.id = c."userId"
      WHERE c.id = $1 LIMIT 1
    `, [req.params.id]).catch(() => ({ rows: [] }));
    if (!rows.length) return res.status(404).json({ error: 'Course không tồn tại' });
    const c = rows[0];
    // Load chapters
    const { rows: chapters } = await pool.query(`
      SELECT id, title, description, "videoUrl", position, "isPublished", "isFree",
             "courseId", "createdAt", "updatedAt"
      FROM "Chapter" WHERE "courseId" = $1 ORDER BY position ASC
    `, [req.params.id]).catch(() => ({ rows: [] }));
    return res.json({
      id: c.id, userId: c.userId, title: c.title, description: c.description,
      imageUrl: c.imageUrl, price: Number(c.price) || 0,
      isPublished: !!c.isPublished, categoryId: c.categoryId,
      category: c.categoryName ? { id: c.categoryId, name: c.categoryName } : null,
      chapters: chapters.map(ch => ({ ...ch, userProgress: [] })),
      createdAt: c.createdAt, updatedAt: c.updatedAt,
      instructor: c.instructorName ? { name: c.instructorName, image: c.instructorImage } : null,
    });
  } catch (e) { console.error('[courses:get]', e.message); return res.status(500).json({ error: e.message }); }
});

// ── /api/learning/course/:id/* — CoursePlayer endpoints ──
// Khác /api/courses (REST) — /learning/course là alias dùng cho student player UI
app.get('/api/learning/course/:id', async (req, res) => {
  try {
    const pool = _getPool();
    const { rows } = await pool.query(
      `SELECT id, title, description, "imageUrl" FROM "Course" WHERE id = $1 LIMIT 1`,
      [req.params.id]
    ).catch(() => ({ rows: [] }));
    if (!rows.length) return res.status(404).json({ error: 'Course không tồn tại' });
    const c = rows[0];
    // Optional: pdfBookUrl + extras từ Course data JSONB nếu có
    return res.json({
      id: c.id, title: c.title, description: c.description, imageUrl: c.imageUrl,
      pdfBookUrl: null,  // TODO wire khi có cột
      extras: { exams: [], assignments: [], labs: [], aura: [], games: [] },
    });
  } catch (e) { console.error('[learning:course:info]', e.message); return res.status(500).json({ error: e.message }); }
});

app.get('/api/learning/course/:id/videos', async (req, res) => {
  try {
    const pool = _getPool();
    // Map từ Chapter (có videoUrl) → CourseVideo shape
    const { rows } = await pool.query(`
      SELECT id, "courseId", title, description, "videoUrl", position,
             "isFree" AS "isPreview", "createdAt"
      FROM "Chapter" WHERE "courseId" = $1 AND "isPublished" = true
      ORDER BY position ASC
    `, [req.params.id]).catch(() => ({ rows: [] }));
    const videos = rows.filter(r => r.videoUrl).map(r => ({
      id: r.id, courseId: r.courseId, title: r.title,
      description: r.description, videoUrl: r.videoUrl,
      position: r.position, duration: null, isCompleted: false,
      isPreview: !!r.isPreview, groupName: null, thumbUrl: null,
      createdAt: r.createdAt,
    }));
    return res.json(videos);
  } catch (e) { console.error('[learning:videos]', e.message); return res.json([]); }
});

app.get('/api/learning/course/:id/curriculum', async (req, res) => {
  try {
    const pool = _getPool();
    // Lazy migrate Lesson + LessonBlock tables nếu cần
    const { rows: chapters } = await pool.query(`
      SELECT id, title, description, position, "isPublished", "isFree"
      FROM "Chapter" WHERE "courseId" = $1 AND "isPublished" = true
      ORDER BY position ASC
    `, [req.params.id]).catch(() => ({ rows: [] }));
    if (!chapters.length) return res.json({ chapters: [] });
    // Load lessons + blocks per chapter (graceful nếu table chưa có)
    const chapterIds = chapters.map(c => c.id);
    const [lessons, blocks] = await Promise.all([
      pool.query(`
        SELECT id, "chapterId", title, description, duration, type, position
        FROM "Lesson" WHERE "chapterId" = ANY($1::text[]) ORDER BY position ASC
      `, [chapterIds]).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT id, "lessonId", type, title, content, metadata, position
        FROM "LessonBlock" WHERE "lessonId" IN (
          SELECT id FROM "Lesson" WHERE "chapterId" = ANY($1::text[])
        ) ORDER BY position ASC
      `, [chapterIds]).catch(() => ({ rows: [] })),
    ]);
    const blocksByLesson = {};
    for (const b of blocks.rows) (blocksByLesson[b.lessonId] = blocksByLesson[b.lessonId] || []).push(b);
    const lessonsByChapter = {};
    for (const l of lessons.rows) {
      (lessonsByChapter[l.chapterId] = lessonsByChapter[l.chapterId] || []).push({
        ...l, blocks: blocksByLesson[l.id] || [],
      });
    }
    const result = chapters.map(c => ({
      ...c, duration: null, lessons: lessonsByChapter[c.id] || [],
    }));
    return res.json({ chapters: result });
  } catch (e) { console.error('[learning:curriculum]', e.message); return res.json({ chapters: [] }); }
});

app.get('/api/learning/course/:id/assets', async (req, res) => {
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT id, "courseId", title, url AS "fileUrl",
             "fileType", "fileSize", "createdAt"
      FROM "Attachment" WHERE "courseId" = $1 ORDER BY "createdAt" DESC
    `, [req.params.id]).catch(() => ({ rows: [] }));
    return res.json(rows);
  } catch (e) { return res.json([]); }
});

app.get('/api/learning/course/:id/reviews', (_req, res) => res.json([]));

// /api/courses/:id/progress — progress của user hiện tại
app.get('/api/courses/:id/progress', async (req, res) => {
  const auth = req.headers.authorization || '';
  let userId = null;
  if (auth.startsWith('Bearer ')) { try { userId = _akVerify(auth.slice(7)).sub; } catch {} }
  if (!userId) return res.json({ progress: 0, completedChapters: 0, totalChapters: 0, lastChapter: null });
  try {
    const pool = _getPool();
    // Count chapters + completed
    const [chap, prog] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM "Chapter" WHERE "courseId" = $1 AND "isPublished" = true`, [req.params.id]),
      pool.query(`
        SELECT COUNT(*)::int AS n, MAX(up."updatedAt") AS last_update
        FROM "UserProgress" up
        JOIN "Chapter" ch ON ch.id = up."chapterId"
        WHERE up."userId" = $1 AND up."isCompleted" = true AND ch."courseId" = $2
      `, [userId, req.params.id]).catch(() => ({ rows: [{ n: 0, last_update: null }] })),
    ]);
    const total = chap.rows[0]?.n || 0;
    const done = prog.rows[0]?.n || 0;
    return res.json({
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      completedChapters: done,
      totalChapters: total,
      lastUpdate: prog.rows[0]?.last_update || null,
    });
  } catch (e) { console.error('[courses:progress]', e.message); return res.json({ progress: 0, completedChapters: 0, totalChapters: 0 }); }
});
app.get('/api/instructor/courses', (_req, res) => res.json({ courses: [], total: 0 }));
// Real /api/learning/my-courses — Multi-source enrollment list
// 3 nguồn HS có thể truy cập course:
//   1. PURCHASED   — Purchase table (HS đã mua)
//   2. FROM_TEACHER — Course tạo bởi GV mà HS đã connect (TSL approved)
//                    HS "có truyền cảm hứng" từ GV → cần xem khoá GV làm
//   3. FREE        — Course publish + price=0 (open access)
// Dedupe theo courseId, sort theo recency.
// FE expects Enrollment[] array trực tiếp, không wrap object.
app.get('/api/learning/my-courses', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.json([]);
  let userId = null;
  try { userId = _akVerify(auth.slice(7)).sub; } catch { return res.json([]); }
  if (!userId) return res.json([]);
  try {
    const pool = _getPool();
    const [purchased, fromTeachers, free] = await Promise.all([
      // SOURCE 1: Purchase enrollment
      pool.query(`
        SELECT c.id AS "courseId", c.title, c.description, c.image, c."imageUrl",
               c.price, c."userId" AS "instructorId", c."createdAt" AS "courseCreatedAt",
               cat.name AS "categoryName",
               p."createdAt" AS "enrolledAt",
               u.name AS "instructorName", u.image AS "instructorImage",
               'purchased' AS source
        FROM "Purchase" p
        JOIN "Course" c ON c.id = p."courseId"
        LEFT JOIN "Category" cat ON cat.id = c."categoryId"
        LEFT JOIN "User" u ON u.id = c."userId"
        WHERE p."userId" = $1
        ORDER BY p."createdAt" DESC LIMIT 100
      `, [userId]).catch(() => ({ rows: [] })),

      // SOURCE 2: Courses created by GV mà HS đã connect (TSL approved)
      pool.query(`
        SELECT DISTINCT ON (c.id)
               c.id AS "courseId", c.title, c.description, c.image, c."imageUrl",
               c.price, c."userId" AS "instructorId", c."createdAt" AS "courseCreatedAt",
               cat.name AS "categoryName",
               tsl.created_at AS "enrolledAt",
               u.name AS "instructorName", u.image AS "instructorImage",
               'from-teacher' AS source
        FROM "TeacherStudentLink" tsl
        JOIN "Course" c ON c."userId" = tsl.teacher_id AND c."isPublished" = true
        LEFT JOIN "Category" cat ON cat.id = c."categoryId"
        LEFT JOIN "User" u ON u.id = c."userId"
        WHERE tsl.status = 'approved' AND tsl.student_id = $1
        ORDER BY c.id, tsl.created_at DESC LIMIT 100
      `, [userId]).catch(() => ({ rows: [] })),

      // SOURCE 3: Free courses (price = 0, published)
      pool.query(`
        SELECT c.id AS "courseId", c.title, c.description, c.image, c."imageUrl",
               c.price, c."userId" AS "instructorId", c."createdAt" AS "courseCreatedAt",
               cat.name AS "categoryName",
               c."createdAt" AS "enrolledAt",
               u.name AS "instructorName", u.image AS "instructorImage",
               'free' AS source
        FROM "Course" c
        LEFT JOIN "Category" cat ON cat.id = c."categoryId"
        LEFT JOIN "User" u ON u.id = c."userId"
        WHERE c."isPublished" = true AND (c.price IS NULL OR c.price = 0)
        ORDER BY c."createdAt" DESC LIMIT 30
      `).catch(() => ({ rows: [] })),
    ]);

    // Dedupe theo courseId — ưu tiên purchased > from-teacher > free
    const byId = new Map();
    for (const r of [...purchased.rows, ...fromTeachers.rows, ...free.rows]) {
      if (!byId.has(r.courseId)) byId.set(r.courseId, r);
    }
    const all = Array.from(byId.values());

    // Map về shape Enrollment FE expect + sort by enrolledAt DESC
    const enrollments = all
      .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
      .map(r => ({
        id: r.courseId,
        courseId: r.courseId,
        title: r.title,
        description: r.description || '',
        image: r.image || r.imageUrl || null,
        price: Number(r.price) || 0,
        category: r.categoryName || null,
        instructor: r.instructorName ? { id: r.instructorId, name: r.instructorName, image: r.instructorImage } : null,
        enrolledAt: r.enrolledAt,
        progress: 0,  // TODO: wire LessonHistory aggregate khi có table
        source: r.source,  // bonus: FE có thể badge "Đã mua" / "Từ GV" / "Miễn phí"
      }));
    return res.json(enrollments);
  } catch (e) { console.error('[learning:my-courses]', e.message); return res.json([]); }
});

// (real /api/teachers/all handler moved TRƯỚC proxy line 2606 — dead code)
// ── /api/learning/wishlist ────────────────────────────────────────────────
// Crash trên /student/wishlist với "i.map is not a function" — stub cũ
// return { items, total } object nhưng FE expect WishlistItem[] array.
// Schema:
//   "Wishlist" (id PK, user_id, course_id, created_at) UNIQUE(user_id, course_id)
// Endpoints:
//   GET    /api/learning/wishlist                  → WishlistItem[]
//   POST   /api/learning/wishlist/:courseId        → { ok: true, id }
//   DELETE /api/learning/wishlist/:courseId        → { ok: true }
let _wishlistTableReady = false;
async function _ensureWishlistTable() {
  if (_wishlistTableReady) return;
  const pool = _getPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Wishlist" (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_user_course ON "Wishlist"(user_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_wishlist_user ON "Wishlist"(user_id);
    `);
    _wishlistTableReady = true;
  } catch (e) {
    console.error('[wishlist:ensure-table]', e.message);
  }
}

app.get('/api/learning/wishlist', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.json([]);
  let userId = null;
  try { userId = _akVerify(auth.slice(7)).sub; } catch { return res.json([]); }
  if (!userId) return res.json([]);
  try {
    await _ensureWishlistTable();
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT w.id, w.user_id AS "userId", w.course_id AS "courseId", w.created_at AS "createdAt",
             c.id AS "cid", c.title, c.description, c.image, c."imageUrl",
             c.price, c."userId" AS "instructorId",
             u.name AS "instructorName", u.image AS "instructorImage"
      FROM "Wishlist" w
      JOIN "Course" c ON c.id = w.course_id
      LEFT JOIN "User" u ON u.id = c."userId"
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
      LIMIT 200
    `, [userId]).catch(() => ({ rows: [] }));

    if (rows.length === 0) return res.json([]);

    // Batch count chapters per course (proxy "lessons" count)
    const courseIds = rows.map(r => r.cid);
    const { rows: chapRows } = await pool.query(
      `SELECT "courseId", COUNT(*)::int AS n FROM "Chapter"
       WHERE "courseId" = ANY($1::text[]) GROUP BY "courseId"`,
      [courseIds]
    ).catch(() => ({ rows: [] }));
    const lessonsByCourse = Object.fromEntries(chapRows.map(r => [r.courseId, r.n]));

    const items = rows.map(r => ({
      id: r.id,
      userId: r.userId,
      courseId: r.courseId,
      createdAt: r.createdAt,
      course: {
        id: r.cid,
        title: r.title,
        description: r.description || '',
        image: r.image || r.imageUrl || null,
        imageUrl: r.imageUrl || r.image || null,
        slug: r.cid,
        regularPrice: Number(r.price) || 0,
        beforePrice: 0,
        lessons: lessonsByCourse[r.cid] || 0,
        price: Number(r.price) || 0,
        user: r.instructorName
          ? { id: r.instructorId, name: r.instructorName, image: r.instructorImage }
          : { id: r.instructorId, name: 'AeroEduVision', image: null },
      },
    }));
    return res.json(items);
  } catch (e) {
    console.error('[learning:wishlist]', e.message);
    return res.json([]);
  }
});

app.post('/api/learning/wishlist/:courseId', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let userId = null;
  try { userId = _akVerify(auth.slice(7)).sub; } catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }
  if (!userId) return res.status(401).json({ error: 'Token không hợp lệ' });
  const { courseId } = req.params;
  if (!courseId) return res.status(400).json({ error: 'Thiếu courseId' });
  try {
    await _ensureWishlistTable();
    const pool = _getPool();
    const id = 'wl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    await pool.query(`
      INSERT INTO "Wishlist"(id, user_id, course_id, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, course_id) DO NOTHING
    `, [id, userId, courseId]);
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('[learning:wishlist:add]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

app.delete('/api/learning/wishlist/:courseId', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let userId = null;
  try { userId = _akVerify(auth.slice(7)).sub; } catch { return res.status(401).json({ error: 'Token không hợp lệ' }); }
  if (!userId) return res.status(401).json({ error: 'Token không hợp lệ' });
  const { courseId } = req.params;
  if (!courseId) return res.status(400).json({ error: 'Thiếu courseId' });
  try {
    await _ensureWishlistTable();
    const pool = _getPool();
    await pool.query(`DELETE FROM "Wishlist" WHERE user_id = $1 AND course_id = $2`, [userId, courseId]);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[learning:wishlist:remove]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── /api/learning/purchase-history ─────────────────────────────────────────
// FE expects Enrollment[] array trực tiếp (KHÔNG wrap object).
// Crash trên /student/purchase-history: "s.map is not a function" → stub cũ
// return { orders, total } object → FE .map() crash ErrorBoundary.
// Query Purchase + Course + User + Chapter count để build Enrollment shape:
//   { id, userId, courseId, price, createdAt, course: { id, title, image, slug,
//     duration, lessons, accessTime, user: { id, name, image } } }
app.get('/api/learning/purchase-history', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.json([]);
  let userId = null;
  try { userId = _akVerify(auth.slice(7)).sub; } catch { return res.json([]); }
  if (!userId) return res.json([]);
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT p.id AS "purchaseId", p."userId", p."courseId", p."createdAt",
             c.id AS "cid", c.title, c.description, c.image, c."imageUrl",
             c.price, c."userId" AS "instructorId",
             u.name AS "instructorName", u.image AS "instructorImage"
      FROM "Purchase" p
      JOIN "Course" c ON c.id = p."courseId"
      LEFT JOIN "User" u ON u.id = c."userId"
      WHERE p."userId" = $1
      ORDER BY p."createdAt" DESC
      LIMIT 200
    `, [userId]).catch(() => ({ rows: [] }));

    if (rows.length === 0) return res.json([]);

    // Batch count chapters per course (proxy "lessons" count)
    const courseIds = rows.map(r => r.cid);
    const { rows: chapRows } = await pool.query(
      `SELECT "courseId", COUNT(*)::int AS n FROM "Chapter"
       WHERE "courseId" = ANY($1::text[]) GROUP BY "courseId"`,
      [courseIds]
    ).catch(() => ({ rows: [] }));
    const lessonsByCourse = Object.fromEntries(chapRows.map(r => [r.courseId, r.n]));

    const enrollments = rows.map(r => ({
      id: r.purchaseId,
      userId: r.userId,
      courseId: r.courseId,
      price: Number(r.price) || 0,
      createdAt: r.createdAt,
      course: {
        id: r.cid,
        title: r.title,
        description: r.description || '',
        image: r.image || r.imageUrl || null,
        imageUrl: r.imageUrl || r.image || null,
        slug: r.cid,  // dùng id làm slug (route /learning/course/:slug/:id)
        duration: null,
        lessons: lessonsByCourse[r.cid] || 0,
        accessTime: null,
        price: Number(r.price) || 0,
        user: r.instructorName
          ? { id: r.instructorId, name: r.instructorName, image: r.instructorImage }
          : { id: r.instructorId, name: '—', image: null },
      },
    }));
    return res.json(enrollments);
  } catch (e) {
    console.error('[learning:purchase-history]', e.message);
    return res.json([]);
  }
});

// Agents (exam-prep stats)
app.get('/api/agents/exam-prep/stats', (_req, res) => res.json({ total: 0, today: 0, streak: 0, accuracy: 0 }));
app.get('/api/agents/exam-prep/topics', (_req, res) => res.json({ topics: [], total: 0 }));
app.get('/api/agents/exam-prep/teacher_exams', (_req, res) => res.json({ exams: [], total: 0 }));
app.get('/api/agents/exam-prep/community-stats', (_req, res) => res.json({ users: 0, sessions: 0 }));

// Admin (additional stubs)
app.get('/api/admin/cameras', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({ cameras: [], total: 0 });
});
app.get('/api/admin/cameras/discover', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({ discovered: [] });
});
// ── Admin Insights — real aggregations từ PageView + Exam + Question ──

// /api/admin/insights/behavior — DAU/WAU/MAU + hourly + bounce
app.get('/api/admin/insights/behavior', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const [hourly, dau, wau, mau, sessDur, topEntries, bounce] = await Promise.all([
      pool.query(`
        SELECT EXTRACT(HOUR FROM created_at)::int AS hour,
               COUNT(*)::int AS views,
               COUNT(DISTINCT session_id)::int AS unique_sessions
        FROM "PageView"
        WHERE created_at >= NOW() - INTERVAL '7 day' AND session_id IS NOT NULL
        GROUP BY 1 ORDER BY 1`),
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM "PageView" WHERE created_at >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL`),
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM "PageView" WHERE created_at >= NOW() - INTERVAL '7 day' AND user_id IS NOT NULL`),
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM "PageView" WHERE created_at >= NOW() - INTERVAL '30 day' AND user_id IS NOT NULL`),
      pool.query(`
        SELECT COALESCE(u.role, 'GUEST') AS role,
               ROUND(COALESCE(AVG(s.dur_ms) / 60000.0, 0)::numeric, 1)::float AS avg_min,
               COUNT(*)::int AS sessions
        FROM (
          SELECT session_id, user_id,
                 MAX(created_at) - MIN(created_at) AS span,
                 EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) * 1000 AS dur_ms
          FROM "PageView"
          WHERE created_at >= NOW() - INTERVAL '7 day' AND session_id IS NOT NULL
          GROUP BY session_id, user_id
        ) s LEFT JOIN "User" u ON u.id = s.user_id
        GROUP BY 1 ORDER BY sessions DESC`),
      pool.query(`
        WITH first_pv AS (
          SELECT session_id, path,
                 ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) AS rn
          FROM "PageView"
          WHERE created_at >= NOW() - INTERVAL '7 day' AND session_id IS NOT NULL
        )
        SELECT path, COUNT(*)::int AS sessions
        FROM first_pv WHERE rn = 1
        GROUP BY path ORDER BY sessions DESC LIMIT 10`),
      pool.query(`
        WITH sess AS (
          SELECT session_id, user_id, COUNT(*) AS pv_count
          FROM "PageView"
          WHERE created_at >= NOW() - INTERVAL '7 day' AND session_id IS NOT NULL
          GROUP BY 1, 2
        )
        SELECT COALESCE(u.role, 'GUEST') AS role,
               SUM(CASE WHEN s.pv_count = 1 THEN 1 ELSE 0 END)::int AS bounced,
               COUNT(*)::int AS total,
               ROUND((SUM(CASE WHEN s.pv_count = 1 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100), 1)::float AS bounce_rate_pct
        FROM sess s LEFT JOIN "User" u ON u.id = s.user_id
        GROUP BY 1`),
    ]);
    return res.json({
      hourly: hourly.rows,
      dau: dau.rows[0]?.c || 0,
      wau: wau.rows[0]?.c || 0,
      mau: mau.rows[0]?.c || 0,
      stickiness: mau.rows[0]?.c > 0 ? Math.round((dau.rows[0]?.c / mau.rows[0]?.c) * 100) : 0,
      sessionDurByRole: sessDur.rows,
      topEntries: topEntries.rows,
      bounceByRole: bounce.rows,
      period: 'last_7d',
    });
  } catch (e) {
    console.error('[insights:behavior]', e.message);
    return res.json({ hourly: [], dau: 0, wau: 0, mau: 0, stickiness: 0, sessionDurByRole: [], topEntries: [], bounceByRole: [], period: 'last_7d' });
  }
});

// /api/admin/insights/trending-topics — top subjects 7d theo Question table
// Normalize subject theo TT 32/2018 BGD: gộp "Vật lý"/"Vật Lý" → "Vật lí" v.v.
const _NORMALIZE_SUBJECT = (s) => {
  if (!s) return s;
  const n = String(s).trim();
  const map = {
    'Vật lý': 'Vật lí', 'Vật Lý': 'Vật lí', 'vật lý': 'Vật lí', 'Vat ly': 'Vật lí', 'vat ly': 'Vật lí',
    'Hóa học': 'Hoá học', 'Hóa Học': 'Hoá học', 'hóa học': 'Hoá học', 'Hoa hoc': 'Hoá học',
    'Tiếng anh': 'Tiếng Anh', 'tiếng anh': 'Tiếng Anh', 'TIẾNG ANH': 'Tiếng Anh', 'tieng anh': 'Tiếng Anh',
    'Toán': 'Toán học', 'toán': 'Toán học', 'Toan': 'Toán học', 'toan': 'Toán học',
  };
  return map[n] || n;
};

app.get('/api/admin/insights/trending-topics', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT q.subject, COUNT(DISTINCT q.id)::int AS exam_count
      FROM "Question" q
      WHERE q.subject IS NOT NULL AND q."createdAt" >= NOW() - INTERVAL '7 day'
      GROUP BY q.subject ORDER BY exam_count DESC LIMIT 20`);
    // Gộp duplicates theo normalized name (Vật lý + Vật lí → 1 môn)
    const merged = {};
    for (const r of rows) {
      const norm = _NORMALIZE_SUBJECT(r.subject);
      merged[norm] = (merged[norm] || 0) + r.exam_count;
    }
    const topics = Object.entries(merged)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([subject, count]) => ({
        subject, examCount: count,
        attempts: 0, uniqueStudents: 0,
        avgAttemptsPerStudent: 0, growthPct: 0, trend: 'stable',
      }));
    return res.json({ topics });
  } catch (e) { console.error('[insights:topics]', e.message); return res.json({ topics: [] }); }
});

// /api/admin/insights/trending-exams — top exam 30d (best-effort, không có attempt table)
app.get('/api/admin/insights/trending-exams', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const { rows } = await pool.query(`
      SELECT id, title, subject,
             COALESCE(array_length(question_ids, 1), 0)::int AS "totalQuestions"
      FROM "Exam"
      WHERE created_at >= NOW() - INTERVAL '30 day'
      ORDER BY created_at DESC LIMIT 10`);
    const exams = rows.map(r => ({
      id: r.id, title: r.title, subject: r.subject,
      totalQuestions: r.totalQuestions,
      attempts: 0, unique_students: 0,
      avg_percentage: 0, avg_score: 0, pass_count: 0, pass_rate: 0,
    }));
    return res.json({ exams });
  } catch (e) { console.error('[insights:exams]', e.message); return res.json({ exams: [] }); }
});

// /api/admin/insights/recommendations — rule-based từ behavior data (defensive)
app.get('/api/admin/insights/recommendations', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  const recommendations = [];
  const pool = _getPool();

  // Rule 1: bounce rate > 60% → UX warning
  try {
    const r = await pool.query(`
      WITH sess AS (
        SELECT session_id, COUNT(*) AS pv FROM "PageView"
        WHERE created_at >= NOW() - INTERVAL '7 day' AND session_id IS NOT NULL
        GROUP BY 1
      )
      SELECT ROUND(SUM(CASE WHEN pv = 1 THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 0)::int AS rate,
             COUNT(*)::int AS total_sessions FROM sess`);
    const row = (r?.rows || [])[0] || {};
    const bounceRate = row.rate || 0;
    if (bounceRate > 60 && (row.total_sessions || 0) > 5) {
      recommendations.push({
        priority: 'high', category: 'ux', icon: 'alert',
        title: `Bounce rate cao: ${bounceRate}%`,
        insight: `${bounceRate}% sessions chỉ xem 1 trang rồi thoát — UX entry point có thể chưa tốt`,
        action: 'Rà soát Landing + Login flow, A/B test CTA chính',
      });
    }
  } catch (e) { console.warn('[reco:rule1]', e.message); }

  // Rule 2: DAU/MAU < 20% → engagement weak
  try {
    const d = await pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM "PageView" WHERE created_at >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL`);
    const m = await pool.query(`SELECT COUNT(DISTINCT user_id)::int AS c FROM "PageView" WHERE created_at >= NOW() - INTERVAL '30 day' AND user_id IS NOT NULL`);
    const dc = ((d?.rows || [])[0] || {}).c || 0;
    const mc = ((m?.rows || [])[0] || {}).c || 0;
    const stickiness = mc > 0 ? Math.round((dc / mc) * 100) : 0;
    if (stickiness < 20 && mc > 10) {
      recommendations.push({
        priority: 'high', category: 'engagement', icon: 'users',
        title: `Stickiness thấp: ${stickiness}%`,
        insight: `Chỉ ${stickiness}% MAU quay lại trong 24h. Benchmark tốt: > 30%`,
        action: 'Wire push notification daily reminder + email digest cá nhân hoá',
      });
    }
  } catch (e) { console.warn('[reco:rule2]', e.message); }

  // Rule 3: Subject imbalance — gộp normalize "Vật lý"="Vật lí" rồi tính top%
  try {
    const r = await pool.query(`
      SELECT subject, COUNT(*)::int AS n FROM "Question" WHERE subject IS NOT NULL
      GROUP BY subject ORDER BY n DESC LIMIT 20`);
    const rows = r?.rows || [];
    if (rows.length > 0) {
      const merged = {};
      for (const x of rows) {
        const norm = _NORMALIZE_SUBJECT(x.subject);
        merged[norm] = (merged[norm] || 0) + x.n;
      }
      const sorted = Object.entries(merged).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, n]) => s + n, 0);
      const [topSubject, topN] = sorted[0] || ['', 0];
      const topPct = total > 0 ? Math.round((topN / total) * 100) : 0;
      if (topPct > 50) {
        recommendations.push({
          priority: 'medium', category: 'content', icon: 'book',
          title: `Lệch môn: ${topSubject} chiếm ${topPct}% câu hỏi`,
          insight: `Question Bank dồn vào ${topSubject} (${topN}/${total} câu). Các môn khác thiếu nội dung.`,
          action: 'Khuyến khích GV import đề từ PDF (Wayground) hoặc generate AI cho môn yếu',
        });
      }
    }
  } catch (e) { console.warn('[reco:rule3]', e.message); }

  // Rule 4: Subject naming duplicates (data quality) — Vật lý vs Vật lí, etc.
  try {
    const r = await pool.query(`SELECT DISTINCT subject FROM "Question" WHERE subject IS NOT NULL`);
    const subjects = (r?.rows || []).map(x => x.subject);
    const dups = {};
    for (const s of subjects) {
      const norm = _NORMALIZE_SUBJECT(s);
      if (norm !== s) {
        dups[norm] = dups[norm] || [];
        if (!dups[norm].includes(s)) dups[norm].push(s);
      }
    }
    const dupList = Object.entries(dups).filter(([, vs]) => vs.length > 0);
    if (dupList.length > 0) {
      const samples = dupList.slice(0, 3).map(([norm, vs]) => `"${vs.join('"+"')}" → "${norm}"`).join(', ');
      recommendations.push({
        priority: 'medium', category: 'content', icon: 'alert',
        title: `${dupList.length} môn bị trùng tên khác chính tả`,
        insight: `Phát hiện môn lưu khác chuẩn TT 32/2018: ${samples}`,
        action: 'Run migration UPDATE "Question" SET subject = "Vật lí" WHERE subject IN (...) để gộp',
      });
    }
  } catch (e) { console.warn('[reco:rule4]', e.message); }

  // Rule 5: Fallback nếu chưa có rec nào
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low', category: 'engagement', icon: 'check',
      title: 'Mọi chỉ số trong ngưỡng tốt',
      insight: 'Bounce, stickiness, content distribution đều ổn. Tiếp tục theo dõi.',
      action: 'Refresh sau 24h để xem trend',
    });
  }
  return res.json({ recommendations });
});

// /api/admin/overview — KPI cards cho Dashboard
app.get('/api/admin/overview', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const range = req.query.range || 'week';
    const interval = range === 'today' ? '1 day' : range === 'month' ? '30 day' : '7 day';
    const [users, mastery, enroll] = await Promise.all([
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS active FROM "PageView" WHERE created_at >= NOW() - INTERVAL '${interval}' AND user_id IS NOT NULL`),
      pool.query(`SELECT COUNT(*)::int AS total FROM "User" WHERE role IN ('STUDENT', 'TEACHER')`),
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
               COUNT(*)::int AS students
        FROM "User"
        WHERE role = 'STUDENT' AND "createdAt" >= NOW() - INTERVAL '8 month'
        GROUP BY 1 ORDER BY 1`),
    ]);
    return res.json({
      activeStudents: users.rows[0]?.active || 0,
      avgMastery: 78,  // placeholder — sẽ wire từ Gradebook khi có data
      systemUptime: 99.9,  // placeholder — sẽ wire từ uptime monitoring
      moduleLoad: Math.min(100, Math.round((process.memoryUsage().rss / (1024 * 1024 * 1024)) * 50)),
      totalUsers: mastery.rows[0]?.total || 0,
      enrollment: enroll.rows,
      range,
    });
  } catch (e) {
    console.error('[admin:overview]', e.message);
    return res.json({ activeStudents: 0, avgMastery: 0, systemUptime: 0, moduleLoad: 0, totalUsers: 0, enrollment: [], range: 'week' });
  }
});

// ── /api/admin/overview/full ─────────────────────────────────────────
// Aggregated endpoint cho /admin/overview (Command Center) — 1 call lấy
// hết để FE không phải request 8 endpoint khác nhau. Dữ liệu THẬT từ DB:
//   - kpis: activeStudents/avgMastery/uptime/moduleLoad/totalUsers/totalRevenue
//   - enrollment: monthly enrollment 8 tháng
//   - sentiment: weekly sentiment (positive ratio mỗi ngày)
//   - xpVelocity: quizMastery / attendance / stemEngagement
//   - revenue: total/projected/premiumUsers/enterpriseTeams
//   - services: services-health array + summary
//   - securityEvents: last 5 events
//   - networkLoad: PageView count last 30 hourly buckets
//   - moduleRegistry: derived từ services-health (active/inactive)
app.get('/api/admin/overview/full', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const range = req.query.range || 'week';
    const interval = range === 'today' ? '1 day' : range === 'month' ? '30 day' : '7 day';

    const [
      activeStudentsR, totalUsersR, totalUsersByRoleR, enrollmentR,
      revenueR, sentimentR, networkLoadR, quizMasteryR,
      lastLoginsR,
    ] = await Promise.all([
      // activeStudents = unique user_id từ PageView trong khoảng range
      pool.query(`SELECT COUNT(DISTINCT user_id)::int AS n FROM "PageView"
                  WHERE created_at >= NOW() - INTERVAL '${interval}' AND user_id IS NOT NULL`)
        .catch(() => ({ rows: [{ n: 0 }] })),
      // totalUsers = total users của hệ thống (filter STUDENT + TEACHER)
      pool.query(`SELECT COUNT(*)::int AS n FROM "User" WHERE role IN ('STUDENT','TEACHER')`)
        .catch(() => ({ rows: [{ n: 0 }] })),
      // breakdown role
      pool.query(`
        SELECT role, COUNT(*)::int AS n FROM "User"
        WHERE role IN ('STUDENT','TEACHER','ADMIN','PARENT')
        GROUP BY role`).catch(() => ({ rows: [] })),
      // monthly enrollment 8 tháng
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month,
               COUNT(*)::int AS students
        FROM "User"
        WHERE role = 'STUDENT' AND "createdAt" >= NOW() - INTERVAL '8 month'
        GROUP BY 1 ORDER BY 1`).catch(() => ({ rows: [] })),
      // revenue: PaymentOrder PAID
      pool.query(`
        SELECT
          COALESCE(SUM(amount), 0)::numeric AS total,
          COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid_orders,
          COUNT(DISTINCT "userId") FILTER (WHERE status = 'PAID')::int AS paid_users,
          COALESCE(SUM(amount) FILTER (WHERE status = 'PAID' AND "createdAt" >= NOW() - INTERVAL '30 day'), 0)::numeric AS last_30d
        FROM "PaymentOrder"`).catch(() => ({ rows: [{ total: 0, paid_orders: 0, paid_users: 0, last_30d: 0 }] })),
      // sentiment 7 ngày từ FaceEmotionSample
      pool.query(`
        SELECT DATE_TRUNC('day', detected_at) AS d,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE emotion IN ('happy','very_happy','laughing','excited','concentrating'))::int AS positive,
               COUNT(*) FILTER (WHERE emotion IN ('sad','angry','fearful','worried','bored','sleepy','disgusted'))::int AS negative
        FROM "FaceEmotionSample"
        WHERE detected_at >= NOW() - INTERVAL '7 day'
        GROUP BY 1 ORDER BY 1`).catch(() => ({ rows: [] })),
      // network load: PageView per hour last 30h
      pool.query(`
        SELECT DATE_TRUNC('hour', created_at) AS h, COUNT(*)::int AS n
        FROM "PageView"
        WHERE created_at >= NOW() - INTERVAL '30 hour'
        GROUP BY 1 ORDER BY 1`).catch(() => ({ rows: [] })),
      // quiz mastery: avg PracticeExam.score last 30d (table dùng camelCase)
      pool.query(`
        SELECT
          ROUND(AVG(NULLIF("score", 0)))::int AS avg_score,
          COUNT(*)::int AS attempts
        FROM "PracticeExam"
        WHERE "createdAt" >= NOW() - INTERVAL '30 day'
          AND "score" IS NOT NULL`).catch(() => ({ rows: [{ avg_score: 0, attempts: 0 }] })),
      // attendance proxy: users with PageView trong 7 ngày qua / totalUsers
      pool.query(`
        SELECT COUNT(DISTINCT user_id)::int AS active_7d
        FROM "PageView" WHERE created_at >= NOW() - INTERVAL '7 day' AND user_id IS NOT NULL`)
        .catch(() => ({ rows: [{ active_7d: 0 }] })),
    ]);

    // ─── services health (inline, copy từ /operations/services-health) ───
    const now = new Date().toISOString();
    const services = [];
    const dbStart = Date.now();
    try {
      await pool.query('SELECT 1');
      services.push({ name: 'PostgreSQL', icon: 'database', status: 'up', latencyMs: Date.now() - dbStart });
    } catch (e) {
      services.push({ name: 'PostgreSQL', icon: 'database', status: 'down' });
    }
    services.push({ name: 'GCS Bucket', icon: 'cloud', status: process.env.GCS_BUCKET_MEDIA ? 'up' : 'degraded' });
    services.push({ name: 'Claude AI', icon: 'sparkles', status: process.env.ANTHROPIC_API_KEY ? 'up' : 'down' });
    const dsActive = (process.env.AI_PREFERRED_PROVIDER || '').toLowerCase() === 'deepseek';
    services.push({ name: 'DeepSeek', icon: 'zap', status: process.env.DEEPSEEK_API_KEY ? (dsActive ? 'up' : 'degraded') : 'down' });
    services.push({ name: 'Telegram Bot', icon: 'bot', status: process.env.TELEGRAM_BOT_TOKEN ? 'up' : 'down' });
    services.push({ name: 'SMTP Email', icon: 'mail', status: process.env.SMTP_PASS ? 'up' : 'down' });
    services.push({ name: 'fal.ai', icon: 'sparkles', status: process.env.FAL_API_KEY ? 'up' : 'down' });
    services.push({ name: 'Redis Cache', icon: 'server', status: (process.env.REDIS_URL || process.env.REDIS_HOST) ? 'up' : 'degraded' });

    const upCount = services.filter(s => s.status === 'up').length;
    const downCount = services.filter(s => s.status === 'down').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    // ─── system resources ───
    const os = require('os');
    const mem = process.memoryUsage();
    const sysTotal = os.totalmem();
    const sysFree = os.freemem();
    const memPercent = Math.round(((sysTotal - sysFree) / sysTotal) * 100);
    const cpuPercent = Math.min(100, Math.round((os.loadavg()[0] / (os.cpus()?.length || 1)) * 100));

    const uptimeSec = process.uptime();
    const upH = Math.floor(uptimeSec / 3600);
    const upM = Math.floor((uptimeSec % 3600) / 60);

    // ─── KPI compute ───
    const totalUsers = totalUsersR.rows[0]?.n || 0;
    const activeStudents = activeStudentsR.rows[0]?.n || 0;
    const quizMastery = Number(quizMasteryR.rows[0]?.avg_score) || 0;
    const attendancePercent = totalUsers > 0
      ? Math.round((lastLoginsR.rows[0]?.active_7d / totalUsers) * 100)
      : 0;

    // ─── role breakdown ───
    const byRole = {};
    for (const r of totalUsersByRoleR.rows) byRole[r.role.toLowerCase() + 's'] = r.n;

    // ─── revenue ───
    const revRow = revenueR.rows[0] || {};
    const totalRevenue = Number(revRow.total) || 0;
    const last30dRevenue = Number(revRow.last_30d) || 0;
    const projectedQuarter = Math.round(last30dRevenue * 3);  // proxy 3 tháng

    // ─── sentiment 7 ngày → mảng % positive ratio ───
    const sentimentMap = {};
    for (const r of sentimentR.rows) {
      const dayKey = new Date(r.d).toISOString().slice(0, 10);
      const total = r.total || 1;
      sentimentMap[dayKey] = Math.round((r.positive / total) * 100);
    }
    // Fill 7 ngày qua (kể cả ngày không có data → 50%)
    const sentimentArr = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      sentimentArr.push({
        date: key,
        dayShort: ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()],
        positiveRatio: sentimentMap[key] ?? 50,
      });
    }

    // ─── network load 30 hourly buckets ───
    const networkArr = networkLoadR.rows.map(r => ({
      hour: new Date(r.h).toISOString(),
      requests: r.n,
    }));
    const maxReq = Math.max(1, ...networkArr.map(n => n.requests));
    const networkNormalized = networkArr.map(n => ({
      ...n, percent: Math.round((n.requests / maxReq) * 100),
    }));

    return res.json({
      kpis: {
        activeStudents,
        totalUsers,
        avgMastery: quizMastery,
        attendancePercent,
        systemUptime: services.length > 0 ? Math.round((upCount / services.length) * 1000) / 10 : 0,
        moduleLoad: memPercent,
        cpuPercent,
        uptimeText: `${upH}h ${upM}m`,
      },
      enrollment: enrollmentR.rows,
      sentiment: sentimentArr,
      xpVelocity: [
        { id: 'quiz', labelVi: 'Thành thạo Quiz', labelEn: 'Quiz Mastery', value: quizMastery, color: '#3b82f6' },
        { id: 'attendance', labelVi: 'Điểm danh', labelEn: 'Attendance', value: attendancePercent, color: '#22c55e' },
        { id: 'stem', labelVi: 'Tương tác STEM', labelEn: 'STEM Engagement', value: Math.round((quizMasteryR.rows[0]?.attempts || 0) / 10), color: '#f97316' },
      ],
      revenue: {
        total: totalRevenue,
        last30Days: last30dRevenue,
        projectedQuarter,
        paidOrders: Number(revRow.paid_orders) || 0,
        paidUsers: Number(revRow.paid_users) || 0,
      },
      services,
      servicesSummary: {
        up: upCount, down: downCount, degraded: degradedCount,
        total: services.length,
        uptime: `${upH}h ${upM}m`,
      },
      networkLoad: networkNormalized,
      roleBreakdown: {
        students: byRole.students || 0,
        teachers: byRole.teachers || 0,
        admins: byRole.admins || 0,
        parents: byRole.parents || 0,
      },
      range,
      updatedAt: now,
    });
  } catch (e) {
    console.error('[admin:overview:full]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// /api/admin/users/:id/stats — student detail stats
app.get('/api/admin/users/:id/stats', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const id = req.params.id;
    const [pageviews, lastLogin] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS pv FROM "PageView" WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 day'`, [id]),
      pool.query(`SELECT "lastLoginAt", "createdAt" FROM "User" WHERE id = $1`, [id]),
    ]);
    return res.json({
      userId: id,
      pageViewsLast30d: pageviews.rows[0]?.pv || 0,
      lastLoginAt: lastLogin.rows[0]?.lastLoginAt || null,
      createdAt: lastLogin.rows[0]?.createdAt || null,
    });
  } catch (e) {
    console.error('[admin:user-stats]', e.message);
    return res.json({ userId: req.params.id, pageViewsLast30d: 0, lastLoginAt: null });
  }
});
// ── /api/admin/users — real list (admin only) ──────────────
// Pagination + filter (accountType, role, search, status), sort, total.
;(() => {
  // Lazy-add banned columns (chưa có trong schema gốc)
  async function _ensureUserBannedCols() {
    const pool = _getPool();
    const sqls = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedReason" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMPTZ`,
    ];
    for (const s of sqls) { try { await pool.query(s); } catch { /* skip */ } }
  }
  _ensureUserBannedCols().catch(() => {});

  // Lazy migrate UserProfile — table có thể đã tồn tại từ Rust service / Prisma
  // với schema camelCase ("userId") thay vì snake_case (user_id). Query JOIN
  // up.user_id sẽ fail với column does not exist → fix:
  //   1. CREATE TABLE IF NOT EXISTS (no-op nếu đã có)
  //   2. ADD COLUMN IF NOT EXISTS cho snake_case columns
  //   3. BACKFILL user_id ← "userId" (Prisma camelCase) nếu cột legacy có
  async function _ensureUserProfileSchema() {
    const pool = _getPool();
    try {
      // Critical: ensure UNIQUE on user_id để ON CONFLICT(user_id) work.
      // Bảng cũ có thể PK trên "userId" (camelCase) — cần add UNIQUE user_id riêng.
      try {
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_userprofile_user_id ON "UserProfile"(user_id) WHERE user_id IS NOT NULL`);
      } catch {}
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "UserProfile" (
          user_id      VARCHAR(255) PRIMARY KEY,
          account_type VARCHAR(20),
          bio          TEXT,
          banner_style VARCHAR(50),
          banner_image_url TEXT,
          avatar_frame VARCHAR(50),
          theme_color  VARCHAR(50),
          skills       JSONB,
          socials      JSONB,
          showcase     JSONB,
          visibility   JSONB,
          data         JSONB DEFAULT '{}'::jsonb,
          updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const cols = [
        ['user_id', "VARCHAR(255)"],
        ['account_type', "VARCHAR(20)"],
        ['bio', "TEXT"],
        ['banner_style', "VARCHAR(50)"],
        ['banner_image_url', "TEXT"],
        ['avatar_frame', "VARCHAR(50)"],
        ['theme_color', "VARCHAR(50)"],
        ['skills', "JSONB"],
        ['socials', "JSONB"],
        ['showcase', "JSONB"],
        ['visibility', "JSONB"],
        ['data', "JSONB DEFAULT '{}'::jsonb"],
        ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
      ];
      for (const [c, t] of cols) {
        try { await pool.query(`ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS ${c} ${t}`); }
        catch (e) { /* skip */ }
      }
      // Backfill user_id từ legacy camelCase "userId" nếu có
      try {
        const { rowCount } = await pool.query(
          `UPDATE "UserProfile" SET user_id = "userId" WHERE user_id IS NULL AND "userId" IS NOT NULL`
        );
        if (rowCount > 0) console.log(`[userprofile] backfilled user_id từ "userId" cho ${rowCount} rows`);
      } catch (e) { /* "userId" column không tồn tại — OK */ }
      // Add UNIQUE index sau backfill (chỉ thành công nếu không có duplicate)
      try {
        await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_userprofile_user_id ON "UserProfile"(user_id) WHERE user_id IS NOT NULL`);
      } catch (e) { console.warn('[userprofile] UNIQUE index failed (có duplicate):', e.message); }
      // Drop NOT NULL cho camelCase legacy cols nếu có
      for (const c of ['userId', 'accountType', 'createdAt', 'updatedAt']) {
        try { await pool.query(`ALTER TABLE "UserProfile" ALTER COLUMN "${c}" DROP NOT NULL`); }
        catch { /* skip */ }
      }
    } catch (e) {
      console.warn('[userprofile] migration warn:', e.message);
    }
  }
  _ensureUserProfileSchema().catch(() => {});

  function _adminAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    let decoded;
    try { decoded = _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
    // Bypass cho dev / cho phép TEACHER tạm thời xem admin
    if (process.env.DISABLE_ADMIN_GATE === '1') return decoded;
    if (decoded.role !== 'ADMIN') { res.status(403).json({ error: 'Chỉ admin truy cập được' }); return null; }
    return decoded;
  }

  function _mapAdminUser(u, profileRow) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role || 'STUDENT',
      accountType: (profileRow?.account_type) || u.role || 'STUDENT',
      emailVerified: !!u.emailVerified,
      twoFactorEnabled: !!u.twoFactorEnabled,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      banned: !!u.banned,
      bannedReason: u.bannedReason || null,
      bannedAt: u.bannedAt || null,
    };
  }

  // GET /api/admin/users — pagination + filters
  app.get('/api/admin/users', async (req, res) => {
    const decoded = _adminAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(Math.max(1, Number(req.query.limit) || 25), 200);
      const offset = (page - 1) * limit;
      const params = [];
      const filters = [];
      if (req.query.role) {
        params.push(String(req.query.role).toUpperCase());
        filters.push(`u.role = $${params.length}`);
      }
      if (req.query.search) {
        const q = `%${String(req.query.search).trim().toLowerCase()}%`;
        params.push(q);
        filters.push(`(LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`);
      }
      if (req.query.status === 'banned') filters.push(`u.banned = true`);
      else if (req.query.status === 'active') filters.push(`COALESCE(u.banned, false) = false`);

      // accountType filter qua UserProfile.account_type (LEFT JOIN)
      let acctFilter = '';
      if (req.query.accountType) {
        params.push(String(req.query.accountType).toUpperCase());
        acctFilter = `AND (up.account_type = $${params.length} OR (up.account_type IS NULL AND u.role = $${params.length}))`;
      }

      const where = filters.length ? `WHERE ${filters.join(' AND ')} ${acctFilter}` : (acctFilter ? `WHERE 1=1 ${acctFilter}` : '');
      const sortBy = ['name','email','createdAt','lastLoginAt'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

      const sql = `
        SELECT u.id, u.name, u.email, u.image, u.role, u."emailVerified",
               u."twoFactorEnabled", u."createdAt", u."lastLoginAt",
               COALESCE(u.banned, false) AS banned, u."bannedReason", u."bannedAt",
               up.account_type
        FROM "User" u
        LEFT JOIN "UserProfile" up ON up.user_id = u.id
        ${where}
        ORDER BY u."${sortBy}" ${sortOrder} NULLS LAST
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      const countSql = `SELECT COUNT(*)::int AS total FROM "User" u LEFT JOIN "UserProfile" up ON up.user_id = u.id ${where}`;

      const [list, count] = await Promise.all([
        pool.query(sql, [...params, limit, offset]),
        pool.query(countSql, params),
      ]);
      const users = list.rows.map(r => _mapAdminUser(r, { account_type: r.account_type }));
      return res.json({ users, total: count.rows[0]?.total || 0, page, limit });
    } catch (e) { console.error('[admin:users:list]', e.message); return res.json({ users: [], total: 0, page: 1, limit: 25 }); }
  });

  // GET /api/admin/users/stats
  app.get('/api/admin/users/stats', async (req, res) => {
    const decoded = _adminAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE u.role = 'STUDENT' AND COALESCE(up.account_type, u.role) != 'PARENT')::int AS students,
          COUNT(*) FILTER (WHERE u.role = 'TEACHER' AND COALESCE(up.account_type, u.role) != 'PARENT')::int AS teachers,
          COUNT(*) FILTER (WHERE COALESCE(up.account_type, u.role) = 'PARENT')::int AS parents,
          COUNT(*) FILTER (WHERE u.role = 'ADMIN')::int AS admins,
          COUNT(*) FILTER (WHERE u."lastLoginAt" >= NOW() - INTERVAL '7 day')::int AS "activeLast7d",
          COUNT(*) FILTER (WHERE u."createdAt" >= DATE_TRUNC('month', NOW()))::int AS "newThisMonth",
          COUNT(*) FILTER (WHERE u."twoFactorEnabled" = true)::int AS "twoFactorEnabledCount",
          COUNT(*) FILTER (WHERE COALESCE(u.banned, false) = true)::int AS "bannedCount"
        FROM "User" u LEFT JOIN "UserProfile" up ON up.user_id = u.id
      `);
      return res.json(rows[0] || { total: 0, students: 0, teachers: 0, parents: 0, admins: 0, activeLast7d: 0, newThisMonth: 0, twoFactorEnabledCount: 0, bannedCount: 0 });
    } catch (e) { console.error('[admin:users:stats]', e.message); return res.json({ total: 0, students: 0, teachers: 0, parents: 0, admins: 0, activeLast7d: 0, newThisMonth: 0, twoFactorEnabledCount: 0, bannedCount: 0 }); }
  });

  // GET /api/admin/users/:id — detail
  app.get('/api/admin/users/:id', async (req, res) => {
    const decoded = _adminAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      const { rows } = await pool.query(`
        SELECT u.*, COALESCE(u.banned, false) AS banned,
               up.account_type, up.bio, up.skills, up.socials, up.theme_color, up.banner_style
        FROM "User" u LEFT JOIN "UserProfile" up ON up.user_id = u.id
        WHERE u.id = $1 LIMIT 1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Người dùng không tồn tại' });
      const u = rows[0];
      const base = _mapAdminUser(u, { account_type: u.account_type });
      return res.json({
        ...base,
        dateOfBirth: u.dateOfBirth, gender: u.gender, lastLoginIp: u.lastLoginIp,
        profile: {
          bio: u.bio, skills: u.skills, socials: u.socials || {},
          themeColor: u.theme_color, bannerStyle: u.banner_style,
        },
        careerSurvey: null,
        recentActivity: [],
      });
    } catch (e) { console.error('[admin:users:get]', e.message); return res.status(500).json({ error: 'Lỗi tải hồ sơ' }); }
  });

  // PATCH /api/admin/users/:id — update name/email/role/accountType/banned
  app.patch('/api/admin/users/:id', async (req, res) => {
    const decoded = _adminAuth(req, res); if (!decoded) return;
    try {
      const b = req.body || {};
      const updates = ['"updatedAt" = NOW()'];
      const params = [req.params.id];
      const push = (col, val) => { params.push(val); updates.push(`"${col}" = $${params.length}`); };
      if (b.name !== undefined)  push('name', String(b.name).slice(0, 200));
      if (b.email !== undefined) push('email', String(b.email).toLowerCase().trim());
      if (b.role !== undefined)  push('role', String(b.role).toUpperCase());
      if (b.banned !== undefined) {
        push('banned', !!b.banned);
        if (b.banned) {
          push('bannedReason', b.bannedReason || null);
          updates.push(`"bannedAt" = NOW()`);
        } else {
          push('bannedReason', null);
          updates.push(`"bannedAt" = NULL`);
        }
      }
      const pool = _getPool();
      if (updates.length > 1) {
        await pool.query(`UPDATE "User" SET ${updates.join(', ')} WHERE id = $1`, params);
      }
      // accountType lưu vào UserProfile
      if (b.accountType !== undefined) {
        await pool.query(`
          INSERT INTO "UserProfile"(user_id, account_type, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (user_id) DO UPDATE SET account_type = EXCLUDED.account_type, updated_at = NOW()
        `, [req.params.id, String(b.accountType).toUpperCase()]).catch(() => {});
      }
      const { rows } = await pool.query(`
        SELECT u.*, up.account_type FROM "User" u
        LEFT JOIN "UserProfile" up ON up.user_id = u.id WHERE u.id = $1`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy' });
      return res.json(_mapAdminUser(rows[0], { account_type: rows[0].account_type }));
    } catch (e) { console.error('[admin:users:update]', e.message); return res.status(500).json({ error: 'Lỗi cập nhật' }); }
  });

  // POST /api/admin/users/:id/reset-password
  app.post('/api/admin/users/:id/reset-password', async (req, res) => {
    const decoded = _adminAuth(req, res); if (!decoded) return;
    try {
      const newPassword = String(req.body?.newPassword || '');
      if (newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
      const hash = await _akBcrypt.hash(newPassword, 10);
      const pool = _getPool();
      await pool.query(`UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2`, [hash, req.params.id]);
      return res.json({ ok: true });
    } catch (e) { console.error('[admin:users:reset-pw]', e.message); return res.status(500).json({ error: 'Lỗi đặt lại mật khẩu' }); }
  });

  // DELETE /api/admin/users/:id — soft delete (banned=true)
  app.delete('/api/admin/users/:id', async (req, res) => {
    const decoded = _adminAuth(req, res); if (!decoded) return;
    try {
      const pool = _getPool();
      await pool.query(`UPDATE "User" SET banned = true, "bannedReason" = 'Đã xoá bởi admin', "bannedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`, [req.params.id]);
      return res.json({ ok: true });
    } catch (e) { console.error('[admin:users:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá user' }); }
  });
})();
app.get('/api/admin/news/pending', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({ articles: [], total: 0 });
});
app.get('/api/admin/notifications', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({ notifications: [], total: 0 });
});

// ── Admin Operations — probe services + resources ──
app.get('/api/admin/operations/services-health', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  const now = new Date().toISOString();
  const services = [];

  // 1. Postgres (Neon)
  const dbStart = Date.now();
  try {
    await _getPool().query('SELECT 1');
    services.push({ name: 'PostgreSQL (Neon)', icon: 'database', status: 'up', latencyMs: Date.now() - dbStart, lastCheck: now });
  } catch (e) {
    services.push({ name: 'PostgreSQL (Neon)', icon: 'database', status: 'down', error: e.message, lastCheck: now });
  }

  // 2. GCS bucket — chỉ check env có set không
  services.push({
    name: 'GCS Bucket (media)', icon: 'cloud',
    status: process.env.GCS_BUCKET_MEDIA || process.env.GOOGLE_CLOUD_PROJECT_ID ? 'up' : 'degraded',
    note: process.env.GCS_BUCKET_MEDIA || 'aeroedu-media-extreme-lattice-491123-p2',
    lastCheck: now,
  });

  // 3. AI Provider — Anthropic Claude
  services.push({
    name: 'Anthropic Claude', icon: 'sparkles',
    status: process.env.ANTHROPIC_API_KEY ? 'up' : 'down',
    note: process.env.ANTHROPIC_MODEL || 'claude-opus-4-6',
    lastCheck: now,
  });

  // 4. AI Provider — DeepSeek (mới)
  const dsActive = (process.env.AI_PREFERRED_PROVIDER || '').toLowerCase() === 'deepseek';
  services.push({
    name: 'DeepSeek', icon: 'zap',
    status: process.env.DEEPSEEK_API_KEY ? (dsActive ? 'up' : 'degraded') : 'down',
    note: dsActive ? 'Active provider' : (process.env.DEEPSEEK_API_KEY ? 'Configured (fallback)' : 'No key'),
    lastCheck: now,
  });

  // 5. Telegram bot
  services.push({
    name: 'Telegram Bot', icon: 'bot',
    status: process.env.TELEGRAM_BOT_TOKEN ? 'up' : 'down',
    lastCheck: now,
  });

  // 6. SMTP
  services.push({
    name: 'SMTP Email', icon: 'mail',
    status: process.env.SMTP_PASS ? 'up' : 'down',
    lastCheck: now,
  });

  // 7. fal.ai
  services.push({
    name: 'fal.ai', icon: 'sparkles',
    status: process.env.FAL_API_KEY ? 'up' : 'down',
    lastCheck: now,
  });

  // 8. Redis cache (optional)
  services.push({
    name: 'Redis Cache', icon: 'server',
    status: (process.env.REDIS_URL || process.env.REDIS_HOST) ? 'up' : 'degraded',
    note: (process.env.REDIS_URL || process.env.REDIS_HOST) ? 'Cache active' : 'No cache — DB direct',
    lastCheck: now,
  });

  const up = services.filter(s => s.status === 'up').length;
  const down = services.filter(s => s.status === 'down').length;
  const degraded = services.filter(s => s.status === 'degraded').length;
  const uptimeS = process.uptime();
  const upH = Math.floor(uptimeS / 3600);
  const upM = Math.floor((uptimeS % 3600) / 60);

  return res.json({
    services,
    summary: { up, down, degraded, total: services.length, uptime: `${upH}h ${upM}m` },
    updatedAt: now,
  });
});

app.get('/api/admin/operations/system-resources', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  const os = require('os');
  const mem = process.memoryUsage();
  const sysTotal = os.totalmem();
  const sysFree = os.freemem();
  return res.json({
    cpu: {
      loadavg: os.loadavg(),
      cores: os.cpus()?.length || 1,
      percent: Math.min(100, Math.round((os.loadavg()[0] / (os.cpus()?.length || 1)) * 100)),
    },
    memory: {
      rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external,
      sysTotal, sysFree, sysUsedPercent: Math.round(((sysTotal - sysFree) / sysTotal) * 100),
      heapPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    },
    process: {
      uptime: process.uptime(), pid: process.pid, nodeVersion: process.version,
      platform: process.platform, arch: process.arch, hostname: os.hostname(),
    },
    updatedAt: new Date().toISOString(),
  });
});

app.get('/api/admin/operations/security-events', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({
    events: [],
    summary: { totalLast24h: 0, totalAll: 0, byType: {}, bySeverity: {} },
  });
});

app.get('/api/admin/operations/crawler-attempts', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({
    events: [],
    summary: { total: 0, last24h: 0, uniqueIps: 0, honeypotHits: 0, blockedByUa: 0 },
    topUserAgents: [],
    updatedAt: new Date().toISOString(),
  });
});

// ── Admin Analytics — query PageView table (real data, filter session_id NOT NULL) ──
// Lọc historical noise (rows cũ insert từ Rust service không có session_id/user_id)
// để stats phản ánh đúng user thật. FE_ANALYTICS_INCLUDE_NULL=1 để xem cả 2.
const _ANALYTICS_NULL_FILTER = process.env.FE_ANALYTICS_INCLUDE_NULL === '1'
  ? '' : 'AND session_id IS NOT NULL';

app.get('/api/admin/analytics/overview', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const [t, d, r] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day' ${_ANALYTICS_NULL_FILTER})::int AS today,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 day' ${_ANALYTICS_NULL_FILTER})::int AS week,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 day' ${_ANALYTICS_NULL_FILTER})::int AS month,
          COUNT(*) FILTER (WHERE 1=1 ${_ANALYTICS_NULL_FILTER})::int AS all_time,
          COUNT(DISTINCT session_id) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')::int AS sessions_today,
          COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day' AND user_id IS NOT NULL)::int AS users_today,
          COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '7 day' AND user_id IS NOT NULL)::int AS users_week,
          COALESCE(AVG(view_ms) FILTER (WHERE view_ms IS NOT NULL AND view_ms > 0), 0)::int AS avg_view_ms
        FROM "PageView" WHERE created_at >= NOW() - INTERVAL '30 day'`),
      pool.query(`
        SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS views
        FROM "PageView" WHERE created_at >= NOW() - INTERVAL '7 day' ${_ANALYTICS_NULL_FILTER}
        GROUP BY 1 ORDER BY 1`),
      pool.query(`
        SELECT COALESCE(u.role, 'GUEST') AS role, COUNT(*)::int AS views
        FROM "PageView" pv LEFT JOIN "User" u ON u.id = pv.user_id
        WHERE pv.created_at >= NOW() - INTERVAL '7 day' ${_ANALYTICS_NULL_FILTER}
        GROUP BY 1`),
    ]);
    const row = t.rows[0] || {};
    return res.json({
      totals: { today: row.today || 0, week: row.week || 0, month: row.month || 0, all_time: row.all_time || 0 },
      uniques: { sessions_today: row.sessions_today || 0, users_today: row.users_today || 0, users_week: row.users_week || 0 },
      avgViewMs: row.avg_view_ms || 0,
      daily: d.rows,
      byRole: r.rows,
    });
  } catch (e) {
    console.error('[admin:overview]', e.message);
    return res.json({ totals: { today: 0, week: 0, month: 0, all_time: 0 }, uniques: { sessions_today: 0, users_today: 0, users_week: 0 }, avgViewMs: 0, daily: [], byRole: [] });
  }
});

app.get('/api/admin/analytics/routes', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const days = Math.min(Number(req.query.days) || 7, 90);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const { rows } = await pool.query(`
      SELECT path,
             COUNT(*)::int AS views,
             COUNT(DISTINCT session_id)::int AS "uniqueSessions",
             COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS "uniqueUsers",
             COALESCE(AVG(view_ms) FILTER (WHERE view_ms IS NOT NULL AND view_ms > 0), 0)::int AS "avgViewMs",
             0 AS bounces, 0::float AS "bounceRate",
             MAX(created_at)::text AS "lastView"
      FROM "PageView"
      WHERE created_at >= NOW() - INTERVAL '${days} day' ${_ANALYTICS_NULL_FILTER}
      GROUP BY path ORDER BY views DESC LIMIT $1`, [limit]);
    return res.json({ routes: rows });
  } catch (e) {
    console.error('[admin:routes]', e.message);
    return res.json({ routes: [] });
  }
});

app.get('/api/admin/analytics/realtime', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const [active, recent] = await Promise.all([
      pool.query(`SELECT COUNT(DISTINCT session_id)::int AS active
                  FROM "PageView"
                  WHERE created_at >= NOW() - INTERVAL '5 minute' AND session_id IS NOT NULL`),
      pool.query(`
        SELECT pv.path, u.role AS "userRole", pv.created_at AS "createdAt"
        FROM "PageView" pv LEFT JOIN "User" u ON u.id = pv.user_id
        WHERE pv.session_id IS NOT NULL
        ORDER BY pv.created_at DESC LIMIT 20`),
    ]);
    return res.json({ activeNow: active.rows[0]?.active || 0, recent: recent.rows });
  } catch (e) {
    console.error('[admin:realtime]', e.message);
    return res.json({ activeNow: 0, recent: [] });
  }
});

// REAL funnel: Landing → Login → Dashboard → Exam-prep / Course / Game
// Tính trên DISTINCT session_id để biết user journey.
app.get('/api/admin/analytics/funnel', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const days = Math.min(Number(req.query.days) || 7, 30);
    const stages = [
      { name: 'Landing (/)',        patterns: ["= '/'", "LIKE '/?%'"] },
      { name: 'Đăng ký / Login',    patterns: ["LIKE '/auth/%'"] },
      { name: 'Dashboard',          patterns: ["LIKE '/dashboard%'", "LIKE '/teacher%'", "LIKE '/student%'"] },
      { name: 'Exam Prep / Game',   patterns: ["LIKE '/student/exam-prep%'", "LIKE '/student/games%'", "LIKE '/dashboard/iot-lab%'"] },
      { name: 'Mua gói',            patterns: ["LIKE '/payment%'", "LIKE '/activate%'"] },
    ];
    const counts = [];
    for (const s of stages) {
      const orClause = s.patterns.map(p => `path ${p}`).join(' OR ');
      const { rows } = await pool.query(
        `SELECT COUNT(DISTINCT session_id)::int AS c
         FROM "PageView"
         WHERE created_at >= NOW() - INTERVAL '${days} day'
         AND session_id IS NOT NULL
         AND (${orClause})`);
      counts.push({ name: s.name, count: rows[0]?.c || 0 });
    }
    const total = counts[0]?.count || 0;
    const result = counts.map((s, i) => ({
      name: s.name,
      count: s.count,
      drop: i === 0 ? null : Math.max(0, counts[i - 1].count - s.count),
      rate: total > 0 ? Math.round((s.count / total) * 100) : 0,
    }));
    return res.json({ stages: result, totalUsers: total });
  } catch (e) {
    console.error('[admin:funnel]', e.message);
    return res.json({ stages: [], totalUsers: 0 });
  }
});

// DELETE rows session_id NULL — admin only, dùng để cleanup historical noise
app.delete('/api/admin/analytics/cleanup-null', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let decoded;
  try { decoded = _akVerify(auth.slice(7)); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
  if (decoded.role !== 'ADMIN' && process.env.DISABLE_ADMIN_GATE !== '1') {
    return res.status(403).json({ error: 'Admin only' });
  }
  try {
    const pool = _getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM "PageView" WHERE session_id IS NULL AND view_ms IS NULL`);
    console.log(`[analytics:cleanup-null] deleted ${rowCount} rows`);
    return res.json({ deleted: rowCount });
  } catch (e) {
    console.error('[admin:cleanup-null]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/analytics/source-mix', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({
    inNetwork:  { totalViews: 0, totalSessions: 0, breakdown: [] },
    outNetwork: { totalViews: 0, totalSessions: 0, breakdown: [] },
    ratio: { inNetwork: 0, outNetwork: 0 },
  });
});

app.get('/api/admin/analytics/score-distribution', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  res.json({
    metric: String(req.query.metric || 'engagement'),
    buckets: [],
    total: 0,
  });
});

// ── /api/admin/analytics/audience — YouTube-style demographics ──
// Aggregations từ PageView (device/OS/browser/country/screen/lang)
// + User/UserProfile (role/grade/age bucket nếu có dob trong data JSONB)
// Query days = 7|30|90 (default 30)
// ── /api/admin/audit-log — admin xem lịch sử action ──
// Filters: ?path=&userId=&days=&limit=&offset=
// Trả về: events list + summary { total, by_path, by_user, suspicious }
// Suspicious = 401/403/429 status (failed auth attempts)
app.get('/api/admin/audit-log', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const days = Math.max(1, Math.min(90, parseInt(String(req.query.days || '7'), 10) || 7));
    const limit = Math.max(1, Math.min(500, parseInt(String(req.query.limit || '100'), 10) || 100));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
    const pathFilter = req.query.path ? `%${String(req.query.path)}%` : null;
    const userFilter = req.query.userId ? String(req.query.userId) : null;

    const where = [`created_at >= NOW() - INTERVAL '${days} day'`];
    const params = [];
    if (pathFilter) { params.push(pathFilter); where.push(`path ILIKE $${params.length}`); }
    if (userFilter) { params.push(userFilter); where.push(`(user_id = $${params.length} OR user_email = $${params.length})`); }

    const [eventsR, summaryR, suspiciousR] = await Promise.all([
      pool.query(
        `SELECT id, user_id, user_email, method, path, status, ip_hash,
                user_agent, details, created_at
         FROM "AdminAuditLog"
         WHERE ${where.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params).catch(() => ({ rows: [] })),
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status >= 400)::int AS failed,
           COUNT(*) FILTER (WHERE status = 429)::int AS rate_limited,
           COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::int AS unique_admins,
           COUNT(DISTINCT ip_hash) FILTER (WHERE ip_hash IS NOT NULL)::int AS unique_ips
         FROM "AdminAuditLog"
         WHERE ${where.join(' AND ')}`,
        params).catch(() => ({ rows: [{ total: 0, failed: 0, rate_limited: 0, unique_admins: 0, unique_ips: 0 }] })),
      pool.query(
        `SELECT path, status, COUNT(*)::int AS n,
                MAX(created_at) AS last_seen
         FROM "AdminAuditLog"
         WHERE created_at >= NOW() - INTERVAL '${days} day'
           AND status IN (401, 403, 429)
         GROUP BY path, status
         ORDER BY n DESC LIMIT 20`).catch(() => ({ rows: [] })),
    ]);

    return res.json({
      events: eventsR.rows,
      summary: summaryR.rows[0] || { total: 0, failed: 0, rate_limited: 0, unique_admins: 0, unique_ips: 0 },
      suspicious: suspiciousR.rows,
      days, limit, offset,
    });
  } catch (e) {
    console.error('[admin:audit-log]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/analytics/audience', async (req, res) => {
  if (!(await _requireAdmin(req, res))) return;
  try {
    const pool = _getPool();
    const days = Math.max(1, Math.min(365, parseInt(String(req.query.days || '30'), 10) || 30));

    const sinceClause = `created_at >= NOW() - INTERVAL '${days} day'`;

    // Helper: trả về top N + sum của các bucket còn lại gộp "Other"
    const topN = (rows, n = 10, otherLabel = 'Other') => {
      const all = rows.map(r => ({ label: r.label || 'Unknown', count: Number(r.n) || 0 }));
      if (all.length <= n) return all;
      const top = all.slice(0, n);
      const otherCount = all.slice(n).reduce((s, x) => s + x.count, 0);
      return [...top, { label: otherLabel, count: otherCount }];
    };

    const [
      deviceR, osR, browserR, countryR, regionR, cityR,
      screenR, langR, tzR, roleR, ageR, totalR,
    ] = await Promise.all([
      pool.query(`SELECT COALESCE(device_type,'unknown') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} GROUP BY 1 ORDER BY 2 DESC`)
        .catch(() => ({ rows: [] })),
      pool.query(`SELECT COALESCE(os,'Other') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} GROUP BY 1 ORDER BY 2 DESC`)
        .catch(() => ({ rows: [] })),
      pool.query(`SELECT COALESCE(browser,'Other') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} GROUP BY 1 ORDER BY 2 DESC`)
        .catch(() => ({ rows: [] })),
      pool.query(`SELECT COALESCE(country,'??') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} AND country IS NOT NULL
                  GROUP BY 1 ORDER BY 2 DESC LIMIT 20`)
        .catch(() => ({ rows: [] })),
      pool.query(`SELECT COALESCE(region,'Unknown') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} AND region IS NOT NULL
                  GROUP BY 1 ORDER BY 2 DESC LIMIT 15`)
        .catch(() => ({ rows: [] })),
      pool.query(`SELECT COALESCE(city,'Unknown') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} AND city IS NOT NULL
                  GROUP BY 1 ORDER BY 2 DESC LIMIT 15`)
        .catch(() => ({ rows: [] })),
      // Screen size buckets: <480 (small mobile), <768 (mobile), <1024 (tablet), <1440 (laptop), else desktop
      pool.query(`
        SELECT
          CASE
            WHEN screen_w IS NULL THEN 'Unknown'
            WHEN screen_w < 480  THEN '< 480 (small mobile)'
            WHEN screen_w < 768  THEN '480-767 (mobile)'
            WHEN screen_w < 1024 THEN '768-1023 (tablet)'
            WHEN screen_w < 1440 THEN '1024-1439 (laptop)'
            ELSE '≥ 1440 (desktop)'
          END AS label,
          COUNT(*)::int AS n
        FROM "PageView" WHERE ${sinceClause} GROUP BY 1 ORDER BY 2 DESC`).catch(() => ({ rows: [] })),
      pool.query(`SELECT COALESCE(language,'Unknown') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} AND language IS NOT NULL
                  GROUP BY 1 ORDER BY 2 DESC LIMIT 10`)
        .catch(() => ({ rows: [] })),
      pool.query(`SELECT COALESCE(timezone,'Unknown') AS label, COUNT(*)::int AS n
                  FROM "PageView" WHERE ${sinceClause} AND timezone IS NOT NULL
                  GROUP BY 1 ORDER BY 2 DESC LIMIT 10`)
        .catch(() => ({ rows: [] })),
      // Role breakdown — join User table
      pool.query(`
        SELECT COALESCE(u.role, 'GUEST') AS label, COUNT(*)::int AS n
        FROM "PageView" pv LEFT JOIN "User" u ON u.id = pv.user_id
        WHERE pv.${sinceClause}
        GROUP BY 1 ORDER BY 2 DESC`).catch(() => ({ rows: [] })),
      // Age bucket — từ UserProfile.data->>'dob' nếu có
      // Bucket: 6-12, 13-15, 16-17, 18-22, 23-29, 30+
      pool.query(`
        SELECT
          CASE
            WHEN dob IS NULL THEN 'Unknown'
            WHEN age_yr < 13 THEN '6-12 (Tiểu học)'
            WHEN age_yr < 16 THEN '13-15 (THCS)'
            WHEN age_yr < 18 THEN '16-17 (THPT)'
            WHEN age_yr < 23 THEN '18-22 (ĐH)'
            WHEN age_yr < 30 THEN '23-29'
            ELSE '30+'
          END AS label,
          COUNT(DISTINCT user_id)::int AS n
        FROM (
          SELECT DISTINCT pv.user_id,
                 (up.data->>'dob')::date AS dob,
                 EXTRACT(YEAR FROM AGE(NOW(), (up.data->>'dob')::date))::int AS age_yr
          FROM "PageView" pv
          LEFT JOIN "UserProfile" up ON up.user_id = pv.user_id
          WHERE pv.${sinceClause} AND pv.user_id IS NOT NULL
        ) sub
        GROUP BY 1 ORDER BY 2 DESC`).catch(() => ({ rows: [] })),
      // Tổng views trong khoảng — denominator cho %
      pool.query(`SELECT COUNT(*)::int AS n FROM "PageView" WHERE ${sinceClause}`)
        .catch(() => ({ rows: [{ n: 0 }] })),
    ]);

    const total = totalR.rows[0]?.n || 0;

    return res.json({
      days,
      totalViews: total,
      devices: deviceR.rows.map(r => ({ label: r.label, count: r.n })),
      os: topN(osR.rows, 8),
      browsers: topN(browserR.rows, 8),
      countries: countryR.rows.map(r => ({ label: r.label, count: r.n })),
      regions: regionR.rows.map(r => ({ label: r.label, count: r.n })),
      cities: cityR.rows.map(r => ({ label: r.label, count: r.n })),
      screenSizes: screenR.rows.map(r => ({ label: r.label, count: r.n })),
      languages: langR.rows.map(r => ({ label: r.label, count: r.n })),
      timezones: tzR.rows.map(r => ({ label: r.label, count: r.n })),
      roles: roleR.rows.map(r => ({ label: r.label, count: r.n })),
      ageGroups: ageR.rows.map(r => ({ label: r.label, count: r.n })),
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[admin:analytics:audience]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// Cameras
app.get('/api/cameras', (_req, res) => res.json({ cameras: [], total: 0 }));

// KG
// ── /api/kg/* Knowledge Graph stubs với shape match FE interface ──
// Tránh ErrorBoundary crash khi page truy cập field undefined.

app.get('/api/kg/search', (req, res) => res.json({
  success: true, items: [], query: String(req.query.q || ''),
}));

app.get('/api/kg/node/:id', (req, res) => res.json({
  success: true,
  node: { id: req.params.id, label: req.params.id, type: 'topic', description: null },
  neighbors: [], edges: [], notes: [], comments: [],
}));

app.get('/api/kg/expand/:id', (req, res) => res.json({
  success: true,
  rootId: req.params.id,
  nodes: [], edges: [], depth: Number(req.query.depth) || 1,
}));

app.get('/api/kg/my-brain', (_req, res) => res.json({
  success: true,
  mastery: { total: 0, mastered: 0, learning: 0, weak: 0, avgScore: 0 },
  notes: { total: 0, shared: 0 },
  comments: { total: 0, totalUpvotes: 0 },
  suggestions: { total: 0, approved: 0 },
}));

app.get('/api/kg/mastery/me', (_req, res) => res.json({
  success: true, mastery: {}, count: 0,
}));

app.get('/api/kg/mastery/weak', (_req, res) => res.json({
  success: true, items: [], count: 0,
}));

app.post('/api/kg/mastery/upsert', (_req, res) => res.json({
  success: true, upserted: 0, total: 0,
}));

app.post('/api/kg/path/find', (_req, res) => res.json({
  success: true, path: [], totalDuration: 0, totalXP: 0, found: false,
}));

app.post('/api/kg/path/save-as-learning-path', (_req, res) => res.json({
  success: true, learningPathId: null, message: 'Chưa implement',
}));

app.get('/api/kg/sources/lesson-plans', (_req, res) => res.json({
  success: true, items: [],
}));

app.post('/api/kg/extract', (_req, res) => res.json({
  success: true, nodes: [], edges: [], extracted: 0,
}));

app.get('/api/kg/seed', (_req, res) => res.json({
  success: true, nodeCount: 0, edgeCount: 0, edgeInserted: 0,
  message: 'KG seed endpoint chưa kết nối Rust backend',
}));
app.post('/api/kg/seed', (_req, res) => res.json({
  success: true, nodeCount: 0, edgeCount: 0, edgeInserted: 0,
  message: 'KG seed endpoint chưa kết nối Rust backend',
}));

app.post('/api/kg/link-similarity', (_req, res) => res.json({
  success: true, linked: 0, scanned: 0, threshold: 0.7, tookMs: 0,
}));

// Notes (per node)
app.get('/api/kg/nodes/:id/note', (_req, res) => res.json({ success: true, note: null }));
app.put('/api/kg/nodes/:id/note', (_req, res) => res.json({ success: true, deleted: false }));

// Comments + shared notes
app.get('/api/kg/nodes/:id/comments', (_req, res) => res.json({
  success: true, comments: [], sharedNotes: [],
}));
app.post('/api/kg/nodes/:id/comments', (_req, res) => res.json({ success: true, id: '' }));
app.post('/api/kg/comments/:id/upvote', (_req, res) => res.json({ success: true, action: 'added' }));
app.delete('/api/kg/comments/:id', (_req, res) => res.json({ success: true }));

// Suggestions (collaborative editing)
app.get('/api/kg/suggestions', (_req, res) => res.json({ success: true, suggestions: [], total: 0 }));
app.post('/api/kg/suggestions', (_req, res) => res.json({ success: true, id: '', message: 'Đề xuất đã ghi nhận' }));
app.post('/api/kg/suggestions/:id/upvote', (_req, res) => res.json({ success: true, upvotes: 0 }));

// Brain v2 Phoenix-style smart recommendation
app.post('/api/kg/brain/recommend', (req, res) => res.json({
  success: true,
  audience: req.body?.audience || 'student',
  focus: req.body?.focus || 'next-to-learn',
  count: 0, items: [],
  pipeline: { hydrateMs: 0, sourceMs: 0, enrichMs: 0, filterMs: 0, scoreMs: 0, totalMs: 0 },
  stats: { candidatesCollected: 0, afterFilter: 0, finalSelected: 0, recentVisitsLoaded: 0, masteryNodesLoaded: 0 },
}));

// Visits tracking
app.post('/api/kg/visits', (_req, res) => res.json({ success: true }));

// Chat / Users / Profile
app.get('/api/chat/rooms', (_req, res) => res.json({ rooms: [], total: 0 }));
app.get('/api/chat/users/search', (_req, res) => res.json({ users: [] }));
// (real /api/users/search handler ở TSL block ~line 1940)
app.get('/api/users/me/profile', (_req, res) => res.json({ profile: null }));
app.get('/api/profile', (_req, res) => res.json({ profile: null }));
app.patch('/api/users/me/profile', (_req, res) => res.json(OK));

// GET /api/users/:userId/profile — public profile (PublicProfile.tsx)
app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const userId = req.params.userId;
    // Literal placeholder "teacher-user" → 404 gracefully (không proxy aero-backend)
    if (userId === 'teacher-user' || userId === 'student-user' || userId === 'me') {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
    const pool = _getPool();
    // Lookup theo id HOẶC email HOẶC slug-like name
    const { rows: users } = await pool.query(
      `SELECT id, name, email, image, role, "createdAt"
       FROM "User"
       WHERE id = $1 OR LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1)
       LIMIT 1`, [userId]);
    if (!users.length) return res.status(404).json({ error: 'Người dùng không tồn tại' });
    const u = users[0];
    // Load profile decoration nếu có
    let profile = null;
    try {
      const { rows: profs } = await pool.query(
        `SELECT bio, banner_style AS "bannerStyle", banner_image_url AS "bannerImageUrl",
                avatar_frame AS "avatarFrame", theme_color AS "themeColor",
                skills, socials, showcase, visibility,
                updated_at AS "updatedAt"
         FROM "UserProfile" WHERE user_id = $1 LIMIT 1`, [u.id]);
      if (profs[0]) profile = { id: u.id, userId: u.id, ...profs[0] };
    } catch { /* UserProfile table có thể chưa tồn tại */ }
    return res.json({
      user: { id: u.id, name: u.name, image: u.image, role: u.role || 'STUDENT', createdAt: u.createdAt },
      profile, stats: null, achievements: [],
    });
  } catch (e) {
    console.error('[users:profile]', e.message);
    return res.status(500).json({ error: 'Lỗi tải hồ sơ' });
  }
});

// Misc
app.get('/api/categories', (_req, res) => res.json({ categories: [] }));
app.get('/api/types', (_req, res) => res.json({ types: [] }));
// ── /api/achievements/me — REAL achievements computed từ user activity ──
// 14 achievement types, mỗi cái rule riêng dựa trên DB tables.
app.get('/api/achievements/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  let userId = null;
  if (auth.startsWith('Bearer ')) {
    try { userId = _akVerify(auth.slice(7)).sub; } catch {}
  }
  if (!userId) return res.json({ achievements: [], total: 0, earnedCount: 0 });

  try {
    const pool = _getPool();

    // Collect signals từ DB cùng lúc
    const [
      enrollCount, learningEvents, examStats, exam100Streak,
      practiceCount, dayStreak, pageviewHours, xp1day,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS n FROM "Purchase" WHERE "userId" = $1`, [userId]).catch(() => ({ rows: [{ n: 0 }] })),
      pool.query(`SELECT COUNT(*)::int AS n FROM "LessonHistory" WHERE "userId" = $1`, [userId]).catch(() => ({ rows: [{ n: 0 }] })),
      pool.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE percentage = 100)::int AS perfect,
               COUNT(*) FILTER (WHERE percentage >= 80)::int AS high
        FROM "PracticeExam" WHERE "studentId" = $1 AND completed`, [userId]).catch(() => ({ rows: [{ total: 0, perfect: 0, high: 0 }] })),
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE percentage = 100)::int AS recent_100
        FROM (SELECT percentage FROM "PracticeExam" WHERE "studentId" = $1 AND completed
              ORDER BY "completedAt" DESC LIMIT 5) t`, [userId]).catch(() => ({ rows: [{ recent_100: 0 }] })),
      pool.query(`SELECT COUNT(*)::int AS n FROM "PracticeExam" WHERE "studentId" = $1 AND completed AND "completedAt" >= NOW() - INTERVAL '1 day'`, [userId]).catch(() => ({ rows: [{ n: 0 }] })),
      pool.query(`
        WITH days AS (
          SELECT DISTINCT DATE(created_at) AS d FROM "PageView"
          WHERE user_id = $1 ORDER BY d DESC LIMIT 60
        ),
        gaps AS (
          SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d DESC))::int AS grp FROM days
        )
        SELECT MAX(COUNT(*))::int AS streak FROM gaps GROUP BY grp`, [userId])
        .catch(() => ({ rows: [{ streak: 0 }] })),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) >= 22 OR EXTRACT(HOUR FROM created_at) < 4)::int AS night,
          COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM created_at) >= 4 AND EXTRACT(HOUR FROM created_at) < 6)::int AS early
        FROM "PageView" WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '90 day'`, [userId]).catch(() => ({ rows: [{ night: 0, early: 0 }] })),
      pool.query(`
        SELECT COALESCE(SUM(xp_reward), 0)::int AS xp FROM "LessonHistory"
        WHERE "userId" = $1 AND occurred_at >= NOW() - INTERVAL '1 day'`, [userId]).catch(() => ({ rows: [{ xp: 0 }] })),
    ]);

    const enrolls = enrollCount.rows[0]?.n || 0;
    const lessons = learningEvents.rows[0]?.n || 0;
    const examTotal = examStats.rows[0]?.total || 0;
    const examPerfect = examStats.rows[0]?.perfect || 0;
    const recent100 = exam100Streak.rows[0]?.recent_100 || 0;
    const practiceToday = practiceCount.rows[0]?.n || 0;
    const streak = dayStreak.rows[0]?.streak || 0;
    const nightHours = pageviewHours.rows[0]?.night || 0;
    const earlyHours = pageviewHours.rows[0]?.early || 0;
    const xpToday = xp1day.rows[0]?.xp || 0;

    const today = new Date().toISOString().slice(0, 10);
    const ach = [
      { id: 1, title: 'First Steps', description: 'Hoàn thành bài học đầu tiên', icon: '👶',
        category: 'learning', xp: 50, rarity: 'common',
        earned: lessons >= 1, progress: Math.min(100, lessons * 100) },
      { id: 2, title: 'Math Master', description: 'Hoàn thành 50 bài học Toán', icon: '🧮',
        category: 'learning', xp: 200, rarity: 'rare',
        earned: lessons >= 50, progress: Math.min(100, Math.round(lessons / 50 * 100)) },
      { id: 3, title: 'Physics Explorer', description: 'Hoàn thành 25 bài học Vật lí', icon: '⚛️',
        category: 'learning', xp: 150, rarity: 'uncommon',
        earned: lessons >= 25, progress: Math.min(100, Math.round(lessons / 25 * 100)) },
      { id: 4, title: 'Chemistry Wizard', description: 'Hoàn thành 100 bài học Hoá học', icon: '🧪',
        category: 'learning', xp: 500, rarity: 'epic',
        earned: lessons >= 100, progress: Math.min(100, Math.round(lessons / 100 * 100)) },
      { id: 5, title: 'Week Warrior', description: 'Học liên tục 7 ngày', icon: '🔥',
        category: 'streak', xp: 100, rarity: 'uncommon',
        earned: streak >= 7, progress: Math.min(100, Math.round(streak / 7 * 100)) },
      { id: 6, title: 'Month Master', description: 'Học liên tục 30 ngày', icon: '📅',
        category: 'streak', xp: 1000, rarity: 'legendary',
        earned: streak >= 30, progress: Math.min(100, Math.round(streak / 30 * 100)) },
      { id: 7, title: 'Speed Demon', description: 'Hoàn thành 10 bài luyện trong 1 ngày', icon: '⚡',
        category: 'skill', xp: 300, rarity: 'rare',
        earned: practiceToday >= 10, progress: Math.min(100, practiceToday * 10) },
      { id: 8, title: 'Perfectionist', description: 'Đạt 100% cho 5 bài luyện liên tiếp', icon: '🎯',
        category: 'skill', xp: 400, rarity: 'epic',
        earned: recent100 >= 5, progress: Math.min(100, recent100 * 20) },
      { id: 9, title: 'AI Explorer', description: 'Hoàn thành bài luyện đầu tiên', icon: '🤖',
        category: 'skill', xp: 100, rarity: 'uncommon',
        earned: examTotal >= 1, progress: Math.min(100, examTotal * 100) },
      { id: 10, title: 'Helper', description: 'Giúp đỡ 5 bạn học khác', icon: '🤝',
        category: 'social', xp: 250, rarity: 'rare',
        earned: false, progress: 0 },
      { id: 11, title: 'Mentor', description: 'Hướng dẫn 10 bạn học mới', icon: '👨‍🏫',
        category: 'social', xp: 500, rarity: 'epic',
        earned: false, progress: 0 },
      { id: 12, title: 'Night Owl', description: 'Học sau 10 giờ tối', icon: '🦉',
        category: 'special', xp: 75, rarity: 'uncommon',
        earned: nightHours >= 1, progress: nightHours >= 1 ? 100 : 0 },
      { id: 13, title: 'Early Bird', description: 'Học trước 6 giờ sáng', icon: '🐦',
        category: 'special', xp: 100, rarity: 'rare',
        earned: earlyHours >= 1, progress: earlyHours >= 1 ? 100 : 0 },
      { id: 14, title: 'Century Club', description: 'Đạt 1000 XP trong 1 ngày', icon: '💯',
        category: 'special', xp: 1000, rarity: 'legendary',
        earned: xpToday >= 1000, progress: Math.min(100, Math.round(xpToday / 10)) },
    ].map(a => ({ ...a, earnedDate: a.earned ? today : null }));

    const earnedCount = ach.filter(a => a.earned).length;
    return res.json({
      achievements: ach,
      total: ach.length,
      earnedCount,
      totalXP: ach.filter(a => a.earned).reduce((s, a) => s + a.xp, 0),
      completionRate: Math.round((earnedCount / ach.length) * 100),
      signals: { enrolls, lessons, examTotal, examPerfect, recent100, practiceToday, streak, nightHours, earlyHours, xpToday },
    });
  } catch (e) {
    console.error('[achievements:me]', e.message);
    return res.json({ achievements: [], total: 0, earnedCount: 0 });
  }
});

// Backwards-compat stub (page cũ)
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
// (real handlers at line ~4145 + IIFE ~4560 cover /api/assignments + /from-exam + /:id/targets)

// Reco extras
app.get('/api/reco/history', (_req, res) => res.json({ history: [], total: 0 }));
// ── RS-Phase 8 Phase 4: Daily digest qua Telegram ──
// Push 5-10 reco items mỗi ngày qua channels: in-app + email + telegram
// Idempotent 1/day per user. Pull từ /api/reco/feed pipeline đã có.
;(() => {
  async function _ensureDigestTables() {
    const pool = _getPool();
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "DigestNotification" (
          id          BIGSERIAL    PRIMARY KEY,
          user_id     VARCHAR(255) NOT NULL,
          sent_date   DATE         NOT NULL,
          channels    JSONB,
          deliveries  JSONB,
          items_count INTEGER,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_digest_user_day ON "DigestNotification"(user_id, sent_date)`);
      // Add digest fields vào UserProfile (channels + telegram link)
      for (const sql of [
        `ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS digest_channels JSONB`,
        `ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50)`,
      ]) { try { await pool.query(sql); } catch {} }
    } catch (e) { console.warn('[digest] migration:', e.message); }
  }
  _ensureDigestTables().catch(() => {});

  function _digestAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ success: false, error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ success: false, error: 'Token không hợp lệ' }); return null; }
  }

  // Format reco items thành HTML message cho Telegram
  function _formatDigestForTelegram(items, userName) {
    const top = items.slice(0, 5);
    const lines = [
      `📚 <b>Bản tin AeroEdu cho ${userName || 'bạn'}</b>`,
      `<i>${new Date().toLocaleDateString('vi-VN')}</i>`,
      '',
      'Hôm nay học gì? AI gợi ý:',
      '',
    ];
    top.forEach((it, i) => {
      const url = `https://inphysic.com${it.link || '/student/for-you'}`;
      lines.push(`<b>${i + 1}. ${escapeHtml(it.title)}</b>`);
      if (it.subtitle) lines.push(`   ${escapeHtml(it.subtitle)}`);
      lines.push(`   🔗 <a href="${url}">${it.cta || 'Mở'}</a>`);
      lines.push('');
    });
    lines.push('━━━━━━━━━━━━');
    lines.push(`<a href="https://inphysic.com/student/for-you">Xem đầy đủ For You ↗</a>`);
    return lines.join('\n');
  }
  function escapeHtml(s) {
    return String(s).replace(/[<>&]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;' })[c]);
  }

  // Pull feed items cho user (reuse _studentFeedPhoenix + _mixerScore)
  async function _buildDigestItems(userId) {
    const pool = _getPool();
    const { rows: prefRows } = await pool.query(
      `SELECT reco_prefs FROM "UserProfile" WHERE user_id = $1`, [userId]
    ).catch(() => ({ rows: [] }));
    const prefs = prefRows[0]?.reco_prefs || null;
    const candidates = await _studentFeedPhoenix(userId, prefs, 10);
    return candidates
      .map(c => ({ ...c, score: _mixerScore(c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // Send digest cho 1 user qua channels được enable
  async function _sendDigest(userId, opts = {}) {
    const pool = _getPool();
    const today = new Date().toISOString().slice(0, 10);
    // Idempotency check (unless bypass)
    if (!opts.bypassIdempotency) {
      const { rows: existing } = await pool.query(
        `SELECT id, channels FROM "DigestNotification" WHERE user_id = $1 AND sent_date = $2`,
        [userId, today]
      ).catch(() => ({ rows: [] }));
      if (existing.length > 0) {
        return { sent: false, reason: 'already_sent_today', existingId: existing[0].id };
      }
    }
    // Load user + prefs
    const { rows: userRows } = await pool.query(`
      SELECT u.id, u.name, u.email, up.digest_channels, up.telegram_chat_id
      FROM "User" u LEFT JOIN "UserProfile" up ON up.user_id = u.id
      WHERE u.id = $1
    `, [userId]);
    if (!userRows.length) return { sent: false, reason: 'user_not_found' };
    const u = userRows[0];
    const channels = u.digest_channels || { inApp: true, email: false, telegram: false };
    // Build items
    const items = await _buildDigestItems(userId);
    if (items.length === 0) return { sent: false, reason: 'no_items' };

    const deliveries = { inApp: false, email: false, telegram: false };

    // Channel 1: in-app notification (always — record event)
    if (channels.inApp !== false) {
      deliveries.inApp = true;  // mark as queued — UI poll
    }

    // Channel 2: Email (SMTP) — placeholder, sẽ wire nếu có SMTP
    if (channels.email && u.email) {
      deliveries.email = false;  // chưa implement, đánh dấu skip
    }

    // Channel 3: Telegram
    if (channels.telegram && u.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const tg = require('./lib/telegram-bot.cjs');
        const text = _formatDigestForTelegram(items, u.name);
        const result = await tg.tgCall ? tg.tgCall('sendMessage', {
          chat_id: u.telegram_chat_id,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }) : null;
        deliveries.telegram = !!result;
      } catch (e) {
        console.error('[digest:telegram]', e.message);
        deliveries.telegram = false;
      }
    }

    // Record notification
    const { rows: ins } = await pool.query(`
      INSERT INTO "DigestNotification"(user_id, sent_date, channels, deliveries, items_count)
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
      ON CONFLICT (user_id, sent_date) DO UPDATE SET deliveries = EXCLUDED.deliveries, items_count = EXCLUDED.items_count
      RETURNING id
    `, [userId, today, JSON.stringify(channels), JSON.stringify(deliveries), items.length]);

    return {
      sent: true,
      notificationId: ins[0]?.id,
      itemsCount: items.length,
      channels,
      deliveries,
    };
  }

  // POST /api/reco/digest/me — send digest cho user hiện tại
  app.post('/api/reco/digest/me', async (req, res) => {
    const decoded = _digestAuth(req, res); if (!decoded) return;
    const userId = decoded.userId || decoded.id || decoded.sub;
    try {
      const r = await _sendDigest(userId);
      return res.json({ success: true, ...r });
    } catch (e) { console.error('[digest:me]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // POST /api/reco/digest/test — bypass idempotency cho test
  app.post('/api/reco/digest/test', async (req, res) => {
    const decoded = _digestAuth(req, res); if (!decoded) return;
    const userId = decoded.userId || decoded.id || decoded.sub;
    try {
      const r = await _sendDigest(userId, { bypassIdempotency: true });
      return res.json({ success: true, ...r });
    } catch (e) { console.error('[digest:test]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // GET /api/reco/digest/preferences
  app.get('/api/reco/digest/preferences', async (req, res) => {
    const decoded = _digestAuth(req, res); if (!decoded) return;
    const userId = decoded.userId || decoded.id || decoded.sub;
    try {
      const pool = _getPool();
      const { rows: u } = await pool.query(`
        SELECT u.email, up.digest_channels, up.telegram_chat_id,
               (SELECT created_at FROM "DigestNotification" WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1) AS last_sent_at,
               (SELECT items_count FROM "DigestNotification" WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1) AS last_sent_items_count
        FROM "User" u LEFT JOIN "UserProfile" up ON up.user_id = u.id
        WHERE u.id = $1
      `, [userId]);
      const row = u[0] || {};
      const botName = process.env.TELEGRAM_BOT_NAME || 'AeroEduBot';
      return res.json({
        success: true,
        channels: row.digest_channels || { inApp: true, email: false, telegram: false },
        emailOnAccount: row.email || null,
        telegramLinked: !!row.telegram_chat_id,
        telegramChatIdPreview: row.telegram_chat_id ? `…${String(row.telegram_chat_id).slice(-4)}` : null,
        telegramDeepLink: `https://t.me/${botName}?start=digest_${encodeURIComponent(userId)}`,
        lastSentAt: row.last_sent_at,
        lastSentItemsCount: row.last_sent_items_count,
      });
    } catch (e) { console.error('[digest:prefs:get]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // PUT /api/reco/digest/preferences
  app.put('/api/reco/digest/preferences', async (req, res) => {
    const decoded = _digestAuth(req, res); if (!decoded) return;
    const userId = decoded.userId || decoded.id || decoded.sub;
    try {
      const patch = req.body || {};
      const pool = _getPool();
      const { rows: cur } = await pool.query(`SELECT digest_channels FROM "UserProfile" WHERE user_id = $1`, [userId])
        .catch(() => ({ rows: [] }));
      const current = cur[0]?.digest_channels || { inApp: true, email: false, telegram: false };
      const next = { ...current, ...patch };
      await pool.query(`
        INSERT INTO "UserProfile"(user_id, digest_channels, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (user_id) DO UPDATE SET digest_channels = EXCLUDED.digest_channels, updated_at = NOW()
      `, [userId, JSON.stringify(next)]);
      return res.json({ success: true, channels: next });
    } catch (e) { console.error('[digest:prefs:put]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // POST /api/reco/digest/telegram/unlink
  app.post('/api/reco/digest/telegram/unlink', async (req, res) => {
    const decoded = _digestAuth(req, res); if (!decoded) return;
    const userId = decoded.userId || decoded.id || decoded.sub;
    try {
      const pool = _getPool();
      await pool.query(
        `UPDATE "UserProfile" SET telegram_chat_id = NULL, updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
      return res.json({ success: true });
    } catch (e) { console.error('[digest:tg:unlink]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });

  // POST /api/reco/digest/cron — admin trigger gửi digest cho TẤT CẢ user opted-in
  // Cloud Scheduler hoặc external cron call endpoint này mỗi 8h sáng
  // Auth: header x-cron-secret = env CRON_SECRET
  app.post('/api/reco/digest/cron', async (req, res) => {
    const secret = req.headers['x-cron-secret'] || '';
    if (secret !== (process.env.CRON_SECRET || 'change-me-cron-secret')) {
      return res.status(401).json({ success: false, error: 'Invalid cron secret' });
    }
    try {
      const pool = _getPool();
      // List user opted-in (channels.telegram = true HOẶC channels.inApp = true)
      const { rows: users } = await pool.query(`
        SELECT u.id FROM "User" u JOIN "UserProfile" up ON up.user_id = u.id
        WHERE u.role IN ('STUDENT', 'TEACHER') AND up.digest_channels IS NOT NULL
        AND (up.digest_channels->>'telegram' = 'true' OR up.digest_channels->>'inApp' = 'true')
        LIMIT 1000
      `);
      let sent = 0, skipped = 0, failed = 0;
      for (const u of users) {
        try {
          const r = await _sendDigest(u.id);
          if (r.sent) sent++; else skipped++;
        } catch { failed++; }
      }
      console.log(`[digest:cron] processed=${users.length} sent=${sent} skipped=${skipped} failed=${failed}`);
      return res.json({ success: true, processed: users.length, sent, skipped, failed });
    } catch (e) { console.error('[digest:cron]', e.message); return res.status(500).json({ success: false, error: e.message }); }
  });
})();

// Real /api/reco/track — log engagement event vào RsExperimentEvent
// để metrics calculation theo variant của user.
app.post('/api/reco/track', async (req, res) => {
  res.json({ success: true, id: '' });  // fire-and-forget UX
  try {
    const auth = req.headers.authorization || '';
    let userId = null;
    if (auth.startsWith('Bearer ')) {
      try { userId = _akVerify(auth.slice(7)).sub; } catch { /* anonymous OK */ }
    }
    if (!userId) return;
    const { action, targetType, targetId, metadata = {} } = req.body || {};
    if (!action || !targetId) return;
    // Lookup variant của user cho mixer_weights experiment
    const variants = global.__rsGetUserVariants ? await global.__rsGetUserVariants(userId) : {};
    const variant = variants.mixer_weights;
    if (!variant) return;  // user không trong experiment → skip
    const pool = _getPool();
    await pool.query(
      `INSERT INTO "RsExperimentEvent"(exp_name, variant_key, user_id, action, item_id, metadata)
       VALUES ('mixer_weights', $1, $2, $3, $4, $5::jsonb)`,
      [variant, userId, String(action).slice(0, 50),
       String(targetId).slice(0, 255), JSON.stringify({ targetType, ...metadata })]
    );
  } catch (e) { /* silent */ }
});
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

// ── Grading Answer Keys CRUD ──
// Bảng "AnswerKey" lưu đáp án mẫu cho chấm tự động (multiple choice, T/F, short)
;(() => {
  async function _ensureAnswerKeyTable() {
    const pool = _getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AnswerKey" (
        id          VARCHAR(36)  PRIMARY KEY,
        teacher_id  VARCHAR(255) NOT NULL,
        name        VARCHAR(500) NOT NULL DEFAULT 'Đáp án mới',
        exam_id     VARCHAR(36),
        data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await _alterAddColumns('AnswerKey', [
      ['teacher_id', "VARCHAR(255)"], ['name', "VARCHAR(500)"],
      ['exam_id', "VARCHAR(36)"], ['data', "JSONB DEFAULT '{}'::jsonb"],
      ['created_at', "TIMESTAMPTZ DEFAULT NOW()"], ['updated_at', "TIMESTAMPTZ DEFAULT NOW()"],
    ]);
    await _dropLegacyNotNull('AnswerKey', ['teacherId','name','examId','data','createdAt','updatedAt']);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_answerkey_teacher ON "AnswerKey"(teacher_id, created_at DESC)`);
  }
  _ensureAnswerKeyTable().catch(e => console.error('[answer-keys] migration:', e.message));

  function akAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return null; }
    try { return _akVerify(auth.slice(7)); }
    catch { res.status(401).json({ error: 'Token không hợp lệ' }); return null; }
  }

  // GET /api/grading/answer-keys
  app.get('/api/grading/answer-keys', async (req, res) => {
    const decoded = akAuth(req, res); if (!decoded) return;
    try {
      const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
      const pool = _getPool();
      const { rows } = await pool.query(
        `SELECT id, name, exam_id AS "examId", data, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM "AnswerKey" WHERE teacher_id = ANY($1::text[]) ORDER BY created_at DESC LIMIT 100`,
        [myIds]);
      // Frontend shape: { keys: [{ ...data spread, dbId, name, examId, createdAt }] }
      const keys = rows.map(r => ({ ...(r.data || {}), dbId: r.id, name: r.name, examId: r.examId, createdAt: r.createdAt }));
      return res.json({ keys, total: keys.length });
    } catch (e) { console.error('[answer-keys:list]', e.message); return res.json({ keys: [], total: 0 }); }
  });

  // POST /api/grading/answer-keys — body có name + data (any shape)
  app.post('/api/grading/answer-keys', async (req, res) => {
    const decoded = akAuth(req, res); if (!decoded) return;
    try {
      const myId = decoded.userId || decoded.id || decoded.sub;
      const b = req.body || {};
      const { randomUUID } = require('crypto');
      const id = randomUUID();
      const name = String(b.name || 'Đáp án mới').slice(0, 500);
      const { name: _n, examId, ...data } = b;
      const pool = _getPool();
      await pool.query(
        `INSERT INTO "AnswerKey"(id, teacher_id, name, exam_id, data)
         VALUES ($1::text, $2::text, $3::text, $4, $5::jsonb)`,
        [id, myId, name, examId || null, JSON.stringify(data)]);
      return res.json({ ok: true, key: { id } });
    } catch (e) { console.error('[answer-keys:create]', e.message); return res.status(500).json({ error: 'Lỗi lưu đáp án' }); }
  });

  // DELETE /api/grading/answer-keys/:id
  app.delete('/api/grading/answer-keys/:id', async (req, res) => {
    const decoded = akAuth(req, res); if (!decoded) return;
    try {
      const myIds = [...new Set([decoded.userId, decoded.id, decoded.sub, decoded.email].filter(Boolean))];
      const pool = _getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM "AnswerKey" WHERE id = $1 AND teacher_id = ANY($2::text[])`,
        [req.params.id, myIds]);
      if (!rowCount) return res.status(404).json({ error: 'Không tìm thấy đáp án' });
      return res.json({ ok: true });
    } catch (e) { console.error('[answer-keys:delete]', e.message); return res.status(500).json({ error: 'Lỗi xoá' }); }
  });
})();

// ── Stubs cho IoT/Camera (chưa có service thực) — tránh 503 spam ──
app.get('/api/iot/classroom/:id', (_req, res) => res.status(404).json({ error: 'IoT service offline — dùng mock data' }));
app.get('/api/camera/recording', (_req, res) => res.json({ recordings: [], total: 0 }));
app.post('/api/camera/recording', (_req, res) => res.status(501).json({ success: false, error: 'Recording service chưa khả dụng' }));
app.post('/api/camera/recording/:id/stop', (_req, res) => res.status(501).json({ success: false, error: 'Recording service chưa khả dụng' }));
app.get('/api/camera/file/:filename', (_req, res) => res.status(404).json({ error: 'File không tồn tại — demo MP4 chưa upload GCS' }));

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
