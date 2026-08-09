/**
 * lib/entitlements.cjs — Quản lý activation code + feature entitlement
 *
 * Khái niệm:
 *   FEATURE   tên 1 chức năng AI có gating, vd 'quiz_extract', 'essay_grading'
 *   PLAN      gói trả phí, mỗi plan unlock 1 list FEATURE
 *   CODE      mã kích hoạt 1 lần, sinh khi order → PAID, gửi email cho user
 *   ENTITLEMENT  bản ghi user X được dùng feature Y tới ngày Z
 *
 * Storage:
 *   - Postgres khi DATABASE_URL có sẵn (bảng "ActivationCode" + "FeatureEntitlement")
 *   - Fallback file uploads/.entitlements.json (dev)
 *
 * Public API:
 *   FEATURES, PLAN_FEATURES        (constants)
 *   listFeaturesForPlan(planId)
 *   generateActivationCode(order)  — sinh code, lưu DB, return code string
 *   getCode(code)                  — tra cứu
 *   activateCode(code, userKey)    — áp code cho user, tạo entitlements
 *   listEntitlements(userKey)      — list active features cho user
 *   hasFeature(userKey, feature)   — boolean — dùng cho gate API
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

const STORE_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..'), 'uploads', '.entitlements.json');

// ─────────────────────────────────────────────────────────────
// Plan → features map
// Sửa ở đây để add feature mới hoặc đổi gói được nâng cấp tính năng nào.
// ─────────────────────────────────────────────────────────────
const FEATURES = {
  // ─ Teacher AI features ──────────────────
  quiz_extract:       'Tạo đề từ PDF (Wayground/AI extract)',
  quiz_generate:      'Sinh đề mới bằng AI',
  essay_grading:      'Chấm tự luận bằng AI',
  ocr_pdf:            'OCR tài liệu PDF / ảnh',
  content_gen:        'AI Content Generator',
  ai_dashboard:       'AI Dashboard (insight lớp)',
  meeting_notes:      'Ghi chú meeting AI',
  // ─ Student AI features ──────────────────
  ai_tutor:           'AI Tutor — Gia sư AI 24/7',
  ai_homework:        'AI giải bài tập + giải thích',
  ai_career:          'AI tư vấn hướng nghiệp chuyên sâu',
  ai_examprep:        'AI ôn thi cá nhân hoá',
  // ─ Parent features ──────────────────────
  parent_monitor:     'Theo dõi tiến độ học tập con',
  parent_reports:     'Báo cáo học tập tuần/tháng',
  parent_notify:      'Nhận thông báo từ giáo viên',
  parent_career:      'Báo cáo hướng nghiệp AI cho con',
  parent_compare:     'So sánh tiến độ cùng khối lớp',
};

const PLAN_FEATURES = {
  // ─ Teacher plans ────────────────────────
  'basic-1m':   ['quiz_extract', 'ocr_pdf'],
  'pro-1m':     ['quiz_extract', 'quiz_generate', 'essay_grading', 'ocr_pdf', 'content_gen'],
  'pro-1y':     ['quiz_extract', 'quiz_generate', 'essay_grading', 'ocr_pdf', 'content_gen', 'ai_dashboard', 'meeting_notes'],
  'school-1y':  Object.keys(FEATURES), // tất cả
  // ─ Student plans ────────────────────────
  'student-1m': ['ai_tutor', 'ai_homework', 'ai_examprep'],
  'student-1y': ['ai_tutor', 'ai_homework', 'ai_examprep', 'ai_career'],
  // ─ Parent plans ─────────────────────────
  'parent-1m':  ['parent_monitor', 'parent_reports', 'parent_notify'],
  'parent-1y':  ['parent_monitor', 'parent_reports', 'parent_notify', 'parent_career', 'parent_compare'],
};

function listFeaturesForPlan(planId) {
  return PLAN_FEATURES[planId] || [];
}

// ─────────────────────────────────────────────────────────────
// Trial config — MỌI tài khoản mới được dùng thử FULL 3 tháng
// kể từ ngày đăng ký. Trial cấp đúng bộ feature theo nhóm tài khoản.
// ─────────────────────────────────────────────────────────────
const TRIAL_DAYS = 90;
const TRIAL_PLAN_FOR = { student: 'student-1y', teacher: 'pro-1y', parent: 'parent-1y' };

function audienceOfPlan(planId) {
  const p = String(planId || '');
  if (p.startsWith('student')) return 'student';
  if (p.startsWith('parent'))  return 'parent';
  return 'teacher';
}

// ─────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────
let _pgPool = null;
let _useDb = false;
let _initPromise = null;

async function ensureStorage() {
  if (_useDb) return 'pg';
  if (!process.env.DATABASE_URL) return 'file';
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const { Pool } = require('./db-pool.cjs');
      _pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
      });
      await _pgPool.query(`
        CREATE TABLE IF NOT EXISTS "ActivationCode" (
          code         TEXT PRIMARY KEY,
          "orderId"    TEXT,
          "planId"     TEXT NOT NULL,
          features     JSONB NOT NULL,
          "durationDays" INTEGER NOT NULL,
          "userEmail"  TEXT,
          "usedByUser" TEXT,
          "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
          "usedAt"     TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS "FeatureEntitlement" (
          id            TEXT PRIMARY KEY,
          "userKey"     TEXT NOT NULL,
          feature       TEXT NOT NULL,
          "planId"      TEXT NOT NULL,
          "code"        TEXT,
          "activatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "expiresAt"   TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_feature_entitlement_user
          ON "FeatureEntitlement" ("userKey");
        CREATE TABLE IF NOT EXISTS "UserSubscription" (
          "userKey"    TEXT PRIMARY KEY,
          "userEmail"  TEXT,
          "userName"   TEXT,
          "planId"     TEXT NOT NULL,
          audience     TEXT,
          source       TEXT NOT NULL,
          "startedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
          "expiresAt"  TIMESTAMPTZ NOT NULL,
          "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      _useDb = true;
      return 'pg';
    } catch (e) {
      console.warn('[entitlements] pg unavailable, fallback to file:', e.message);
      _initPromise = null;
      return 'file';
    }
  })();
  return _initPromise;
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); }
  catch { return { codes: {}, entitlements: [] }; }
}
function writeStore(data) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────────────────────
// Code generation
// AERO-XXXX-XXXX  (8 hex uppercase, 2 nhóm 4 ký tự, dễ đọc/gõ)
// ─────────────────────────────────────────────────────────────
function generateCodeString() {
  const r = randomBytes(4).toString('hex').toUpperCase();
  return `AERO-${r.slice(0, 4)}-${r.slice(4, 8)}`;
}

async function generateActivationCode(order) {
  const features = listFeaturesForPlan(order.planId);
  const code = generateCodeString();
  const durationDays = order.durationDays || _planDuration(order.planId);
  const now = new Date().toISOString();
  const record = {
    code,
    orderId: order.id,
    planId: order.planId,
    features,
    durationDays,
    userEmail: order.userEmail || null,
    usedByUser: null,
    createdAt: now,
    usedAt: null,
  };

  const mode = await ensureStorage();
  if (mode === 'pg') {
    await _pgPool.query(
      `INSERT INTO "ActivationCode"
        (code, "orderId", "planId", features, "durationDays", "userEmail")
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [code, order.id, order.planId, JSON.stringify(features), durationDays, order.userEmail]
    );
  } else {
    const store = readStore();
    store.codes[code] = record;
    writeStore(store);
  }
  return record;
}

// Look up plan duration (1m=30, 1y=365, fallback 30)
function _planDuration(planId) {
  if (!planId) return 30;
  if (planId.endsWith('-1y')) return 365;
  if (planId.endsWith('-1m')) return 30;
  return 30;
}

async function getCode(code) {
  const mode = await ensureStorage();
  if (mode === 'pg') {
    const { rows } = await _pgPool.query(`SELECT * FROM "ActivationCode" WHERE code=$1`, [code]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      code: r.code, orderId: r.orderId, planId: r.planId,
      features: r.features, durationDays: r.durationDays,
      userEmail: r.userEmail, usedByUser: r.usedByUser,
      createdAt: r.createdAt, usedAt: r.usedAt,
    };
  }
  return readStore().codes[code] || null;
}

// ─────────────────────────────────────────────────────────────
// Activate code → grant entitlements
// userKey: thường là user.id JWT, fallback user.email
// ─────────────────────────────────────────────────────────────
async function activateCode(code, userKey) {
  if (!userKey) throw new Error('userKey required (đăng nhập trước khi kích hoạt)');
  const rec = await getCode(code);
  if (!rec) throw new Error('Mã kích hoạt không hợp lệ');
  if (rec.usedAt) throw new Error('Mã đã được sử dụng vào ' + rec.usedAt);

  const now = new Date();
  const expires = new Date(now.getTime() + rec.durationDays * 24 * 3600 * 1000);
  const entitlements = rec.features.map(f => ({
    id: `ent-${randomBytes(6).toString('hex')}`,
    userKey,
    feature: f,
    planId: rec.planId,
    code: rec.code,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  }));

  const mode = await ensureStorage();
  if (mode === 'pg') {
    await _pgPool.query('BEGIN');
    try {
      await _pgPool.query(
        `UPDATE "ActivationCode" SET "usedAt"=now(), "usedByUser"=$2 WHERE code=$1`,
        [code, userKey]
      );
      for (const e of entitlements) {
        await _pgPool.query(
          `INSERT INTO "FeatureEntitlement"
            (id, "userKey", feature, "planId", code, "activatedAt", "expiresAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [e.id, e.userKey, e.feature, e.planId, e.code, e.activatedAt, e.expiresAt]
        );
      }
      await _pgPool.query('COMMIT');
    } catch (e) {
      await _pgPool.query('ROLLBACK');
      throw e;
    }
  } else {
    const store = readStore();
    store.codes[code].usedAt = now.toISOString();
    store.codes[code].usedByUser = userKey;
    store.entitlements.push(...entitlements);
    writeStore(store);
  }

  return { code: rec.code, planId: rec.planId, features: rec.features, expiresAt: expires.toISOString(), entitlements };
}

// ─────────────────────────────────────────────────────────────
// Grant plan directly (KHÔNG qua activation code) — dùng cho IAP / admin
// Cấp toàn bộ feature của plan tới ngày expiresAt cho userKey.
//
// Idempotent theo nguồn: trước khi cấp, xoá các entitlement cũ CÙNG nguồn
// (code bắt đầu bằng "<source>:") cho user+plan → renewal chỉ gia hạn expiry,
// không pile-up. Apple IAP gọi với source='IAP', txnId=originalTransactionId.
//
// @param userKey   user.id (hoặc email)
// @param planId    plan trong PLAN_FEATURES
// @param opts.expiresAt  ISO string | Date — mặc định now + plan duration
// @param opts.source     nhãn nguồn (vd 'IAP', 'admin') — mặc định 'manual'
// @param opts.txnId      mã giao dịch (Apple originalTransactionId) — tuỳ chọn
// ─────────────────────────────────────────────────────────────
async function grantPlan(userKey, planId, opts = {}) {
  if (!userKey) throw new Error('userKey required');
  const features = listFeaturesForPlan(planId);
  if (!features.length) throw new Error('planId không hợp lệ: ' + planId);

  const source = opts.source || 'manual';
  const now = new Date();
  const expires = opts.expiresAt
    ? new Date(opts.expiresAt)
    : new Date(now.getTime() + _planDuration(planId) * 24 * 3600 * 1000);
  const codeTag = `${source}:${opts.txnId || 'na'}`;

  const entitlements = features.map(f => ({
    id: `ent-${randomBytes(6).toString('hex')}`,
    userKey,
    feature: f,
    planId,
    code: codeTag,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  }));

  const mode = await ensureStorage();
  if (mode === 'pg') {
    await _pgPool.query('BEGIN');
    try {
      // Dọn entitlement cũ cùng nguồn cho user+plan (tránh trùng khi gia hạn)
      await _pgPool.query(
        `DELETE FROM "FeatureEntitlement"
         WHERE "userKey"=$1 AND "planId"=$2 AND "code" LIKE $3`,
        [userKey, planId, `${source}:%`]
      );
      for (const e of entitlements) {
        await _pgPool.query(
          `INSERT INTO "FeatureEntitlement"
            (id, "userKey", feature, "planId", code, "activatedAt", "expiresAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [e.id, e.userKey, e.feature, e.planId, e.code, e.activatedAt, e.expiresAt]
        );
      }
      await _pgPool.query('COMMIT');
    } catch (e) {
      await _pgPool.query('ROLLBACK');
      throw e;
    }
  } else {
    const store = readStore();
    store.entitlements = (store.entitlements || []).filter(
      e => !(e.userKey === userKey && e.planId === planId && String(e.code || '').startsWith(`${source}:`))
    );
    store.entitlements.push(...entitlements);
    writeStore(store);
  }

  return { planId, features, expiresAt: expires.toISOString(), source, entitlements };
}

/**
 * Thu hồi entitlement theo nguồn — dùng khi Apple báo REFUND / REVOKE / EXPIRED.
 * Xoá mọi entitlement của user có code bắt đầu "<source>:<txnId>" (hoặc cả source nếu không có txnId).
 */
async function revokePlanBySource(userKey, source, txnId = null) {
  if (!userKey || !source) return { revoked: 0 };
  const like = txnId ? `${source}:${txnId}` : `${source}:%`;
  const mode = await ensureStorage();
  if (mode === 'pg') {
    const { rowCount } = await _pgPool.query(
      `DELETE FROM "FeatureEntitlement" WHERE "userKey"=$1 AND "code" LIKE $2`,
      [userKey, like]
    );
    return { revoked: rowCount };
  }
  const store = readStore();
  const before = (store.entitlements || []).length;
  const matches = txnId
    ? (e) => e.userKey === userKey && e.code === `${source}:${txnId}`
    : (e) => e.userKey === userKey && String(e.code || '').startsWith(`${source}:`);
  store.entitlements = (store.entitlements || []).filter(e => !matches(e));
  writeStore(store);
  return { revoked: before - store.entitlements.length };
}

// ─────────────────────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────────────────────
async function listEntitlements(userKey) {
  if (!userKey) return [];
  const mode = await ensureStorage();
  const now = new Date().toISOString();
  if (mode === 'pg') {
    const { rows } = await _pgPool.query(
      `SELECT * FROM "FeatureEntitlement"
       WHERE "userKey"=$1 AND "expiresAt" > $2 ORDER BY "expiresAt" DESC`,
      [userKey, now]
    );
    return rows.map(r => ({
      feature: r.feature, planId: r.planId, code: r.code,
      activatedAt: r.activatedAt, expiresAt: r.expiresAt,
    }));
  }
  const store = readStore();
  return store.entitlements.filter(e => e.userKey === userKey && e.expiresAt > now);
}

async function hasFeature(userKey, feature) {
  if (!userKey || !feature) return false;
  const list = await listEntitlements(userKey);
  return list.some(e => e.feature === feature);
}

/**
 * Tra userKey theo nguồn + mã giao dịch. grantPlan() lưu code = "<source>:<txnId>",
 * nên một entitlement bất kỳ mang code này thuộc về user đã mua — kể cả khi đã hết hạn
 * (chưa bị revoke). Dùng cho App Store Server Notifications (gia hạn/refund/expire) khi
 * KHÔNG có appAccountToken: truyền txnId = originalTransactionId (cố định suốt vòng đời
 * subscription). Trả null nếu chưa từng verify giao dịch này.
 */
async function findUserKeyBySourceTxn(source, txnId) {
  if (!source || !txnId) return null;
  const codeTag = `${source}:${txnId}`;
  const mode = await ensureStorage();
  if (mode === 'pg') {
    const { rows } = await _pgPool.query(
      `SELECT "userKey" FROM "FeatureEntitlement" WHERE "code"=$1 ORDER BY "activatedAt" DESC LIMIT 1`,
      [codeTag]
    );
    return rows[0]?.userKey || null;
  }
  const hit = (readStore().entitlements || []).find(e => e.code === codeTag);
  return hit?.userKey || null;
}

// ─────────────────────────────────────────────────────────────
// UserSubscription — 1 dòng / user = gói HIỆN TẠI của họ (mọi nguồn:
// trial | paid | admin | apple-iap). grantPlan() vẫn quản feature access;
// bảng này là "sổ theo dõi" để admin thấy ai đang dùng gói gì tới khi nào.
// Last-write-wins: mua đè trial, admin gia hạn đè mua, v.v.
// ─────────────────────────────────────────────────────────────
function _decorateSub(r) {
  const now = Date.now();
  const started = new Date(r.startedAt).getTime();
  const expires = new Date(r.expiresAt).getTime();
  const durationDays = Math.max(1, Math.round((expires - started) / 86400000));
  const daysUsed = Math.max(0, Math.floor((now - started) / 86400000));
  const daysRemaining = Math.max(0, Math.ceil((expires - now) / 86400000));
  const isExpired = expires < now;
  return {
    userKey: r.userKey,
    userEmail: r.userEmail || null,
    userName: r.userName || null,
    planId: r.planId,
    audience: r.audience || audienceOfPlan(r.planId),
    source: r.source,
    startedAt: new Date(r.startedAt).toISOString(),
    expiresAt: new Date(r.expiresAt).toISOString(),
    durationDays, daysUsed, daysRemaining,
    percentUsed: durationDays > 0 ? Math.min(100, Math.round((daysUsed / durationDays) * 100)) : 0,
    isExpiringSoon: !isExpired && daysRemaining <= 7,
    isExpired,
    status: isExpired ? 'expired' : (r.source === 'trial' ? 'trialing' : 'active'),
  };
}

async function recordSubscription({ userKey, userEmail, userName, planId, audience, source, expiresAt, startedAt }) {
  if (!userKey || !planId) return null;
  const aud = audience || audienceOfPlan(planId);
  const now = new Date();
  const exp = expiresAt ? new Date(expiresAt) : new Date(now.getTime() + _planDuration(planId) * 86400000);
  const start = startedAt ? new Date(startedAt) : now;
  const mode = await ensureStorage();
  if (mode === 'pg') {
    await _pgPool.query(
      `INSERT INTO "UserSubscription"
         ("userKey","userEmail","userName","planId",audience,source,"startedAt","expiresAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
       ON CONFLICT ("userKey") DO UPDATE SET
         "userEmail"=COALESCE(EXCLUDED."userEmail","UserSubscription"."userEmail"),
         "userName" =COALESCE(EXCLUDED."userName","UserSubscription"."userName"),
         "planId"   =EXCLUDED."planId",
         audience   =EXCLUDED.audience,
         source     =EXCLUDED.source,
         "startedAt"=EXCLUDED."startedAt",
         "expiresAt"=EXCLUDED."expiresAt",
         "updatedAt"=now()`,
      [userKey, userEmail || null, userName || null, planId, aud, source, start.toISOString(), exp.toISOString()]
    );
  } else {
    const store = readStore();
    store.subscriptions = store.subscriptions || {};
    store.subscriptions[userKey] = {
      userKey, userEmail: userEmail || null, userName: userName || null,
      planId, audience: aud, source,
      startedAt: start.toISOString(), expiresAt: exp.toISOString(), updatedAt: now.toISOString(),
    };
    writeStore(store);
  }
  return _decorateSub({ userKey, userEmail, userName, planId, audience: aud, source, startedAt: start.toISOString(), expiresAt: exp.toISOString() });
}

async function getSubscription(userKey) {
  if (!userKey) return null;
  const mode = await ensureStorage();
  let row = null;
  if (mode === 'pg') {
    const { rows } = await _pgPool.query(`SELECT * FROM "UserSubscription" WHERE "userKey"=$1`, [userKey]);
    row = rows[0] || null;
  } else {
    row = (readStore().subscriptions || {})[userKey] || null;
  }
  return row ? _decorateSub(row) : null;
}

async function listSubscriptions() {
  const mode = await ensureStorage();
  let rows = [];
  if (mode === 'pg') {
    const r = await _pgPool.query(`SELECT * FROM "UserSubscription" ORDER BY "expiresAt" DESC`);
    rows = r.rows;
  } else {
    rows = Object.values(readStore().subscriptions || {});
  }
  return rows.map(_decorateSub);
}

/**
 * Cấp 3 tháng dùng thử cho tài khoản mới. Idempotent: nếu user đã có
 * subscription (trial/đã mua) thì KHÔNG cấp lại. Cấp feature theo nhóm
 * (student/teacher/parent) + ghi sổ UserSubscription source='trial'.
 */
async function startTrial(userKey, opts = {}) {
  if (!userKey) return null;
  const existing = await getSubscription(userKey);
  if (existing) return existing; // đã có gói/trial → bỏ qua, không reset
  const audience = TRIAL_PLAN_FOR[opts.audience] ? opts.audience : 'student';
  const planId = TRIAL_PLAN_FOR[audience];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 86400000).toISOString();
  await grantPlan(userKey, planId, { source: 'trial', expiresAt }).catch(() => {});
  return recordSubscription({
    userKey, userEmail: opts.userEmail, userName: opts.userName,
    planId, audience, source: 'trial', expiresAt, startedAt: now.toISOString(),
  });
}

module.exports = {
  FEATURES,
  PLAN_FEATURES,
  TRIAL_DAYS,
  TRIAL_PLAN_FOR,
  audienceOfPlan,
  listFeaturesForPlan,
  generateActivationCode,
  getCode,
  activateCode,
  grantPlan,
  revokePlanBySource,
  findUserKeyBySourceTxn,
  listEntitlements,
  hasFeature,
  recordSubscription,
  getSubscription,
  listSubscriptions,
  startTrial,
};
