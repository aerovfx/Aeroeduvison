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

const STORE_FILE = path.join(__dirname, '..', 'uploads', '.entitlements.json');

// ─────────────────────────────────────────────────────────────
// Plan → features map
// Sửa ở đây để add feature mới hoặc đổi gói được nâng cấp tính năng nào.
// ─────────────────────────────────────────────────────────────
const FEATURES = {
  // ─ Teacher AI features ──────────────────
  quiz_extract:   'Tạo đề từ PDF (Wayground/AI extract)',
  quiz_generate:  'Sinh đề mới bằng AI',
  essay_grading:  'Chấm tự luận bằng AI',
  ocr_pdf:        'OCR tài liệu PDF / ảnh',
  content_gen:    'AI Content Generator',
  ai_dashboard:   'AI Dashboard (insight lớp)',
  meeting_notes:  'Ghi chú meeting AI',
  // ─ Student AI features ──────────────────
  ai_tutor:       'AI Tutor — Gia sư AI 24/7',
  ai_homework:    'AI giải bài tập + giải thích',
  ai_career:      'AI tư vấn hướng nghiệp chuyên sâu',
  ai_examprep:   'AI ôn thi cá nhân hoá',
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
};

function listFeaturesForPlan(planId) {
  return PLAN_FEATURES[planId] || [];
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
      const { Pool } = require('pg');
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

module.exports = {
  FEATURES,
  PLAN_FEATURES,
  listFeaturesForPlan,
  generateActivationCode,
  getCode,
  activateCode,
  listEntitlements,
  hasFeature,
};
