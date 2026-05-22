/**
 * lib/gating.cjs — Express middleware gating cho AI endpoints.
 *
 * Mỗi AI endpoint trả 402 Payment Required khi:
 *   - User chưa đăng nhập (401 thay vì 402)
 *   - User đã đăng nhập nhưng chưa có entitlement cho feature đó
 *
 * Bypass:
 *   - role = ADMIN  → tự do test
 *   - DISABLE_GATING=1 (env) → tắt gating toàn site (dev/staging)
 *   - DB error (Neon quota) → fail-open để không khoá user khi infra lỗi
 *
 * Usage:
 *   const gating = require('./lib/gating.cjs')
 *   app.post('/api/ai-tutor/chat', gating.requireFeature('ai_tutor'), async (req, res) => { ... })
 *
 * Hoặc dùng inline cho check ad-hoc:
 *   const ok = await gating.checkEntitlement(req, 'ai_tutor')
 *   if (!ok.ok) return res.status(ok.status).json(ok.body)
 */
'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET
  || process.env.NEXTAUTH_SECRET
  || 'dev-secret-fallback-change-in-production!!';

function getJwtPayload(req) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    return jwt.verify(auth.slice(7), JWT_SECRET, { ignoreExpiration: true });
  } catch { return null; }
}

/**
 * Kiểm tra user có entitlement cho feature không.
 * @returns {{ ok: true, bypass?: string } | { ok: false, status: number, body: object }}
 */
async function checkEntitlement(req, feature) {
  const p = getJwtPayload(req);
  if (!p) {
    return {
      ok: false,
      status: 401,
      body: {
        error: 'unauthorized',
        message: 'Đăng nhập trước khi dùng tính năng AI',
      },
    };
  }

  // Admin bypass — quản trị viên test mọi feature
  if (p.role === 'ADMIN') return { ok: true, bypass: 'admin' };

  // Dev/staging bypass — tắt gating toàn site
  if (process.env.DISABLE_GATING === '1') return { ok: true, bypass: 'dev' };

  const userKey = p.sub || p.userId || p.email;
  if (!userKey) {
    return { ok: false, status: 401, body: { error: 'unauthorized', message: 'JWT missing user id' } };
  }

  try {
    const entitlements = require('./entitlements.cjs');
    const ok = await entitlements.hasFeature(userKey, feature);
    if (ok) return { ok: true };
    return {
      ok: false,
      status: 402,   // Payment Required
      body: {
        error: 'subscription_required',
        message: `Tính năng "${entitlements.FEATURES[feature] || feature}" yêu cầu gói trả phí.`,
        feature,
        upgradeUrl: '/payment',
      },
    };
  } catch (e) {
    // Fail-open khi DB lỗi (Neon quota / connection refused) → không khoá user.
    // Log warn để admin biết check không hoạt động.
    const msg = (e.message || '').toLowerCase();
    if (msg.includes('quota') || msg.includes('connection') || msg.includes('econnrefused')) {
      console.warn(`[gating] DB unavailable for feature=${feature}, bypassing (fail-open):`, e.message);
      return { ok: true, bypass: 'db-degraded' };
    }
    console.error(`[gating] unexpected error for feature=${feature}:`, e.message);
    return { ok: false, status: 500, body: { error: 'check_failed', message: e.message } };
  }
}

/**
 * Express middleware factory.
 *   app.post('/api/foo', requireFeature('ai_tutor'), handler)
 */
function requireFeature(feature) {
  return async (req, res, next) => {
    const r = await checkEntitlement(req, feature);
    if (!r.ok) return res.status(r.status).json(r.body);
    if (r.bypass) req._gatingBypass = r.bypass;
    next();
  };
}

module.exports = {
  getJwtPayload,
  checkEntitlement,
  requireFeature,
};
