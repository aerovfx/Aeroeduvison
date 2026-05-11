/**
 * lib/payment-orders.cjs — Quản lý đơn hàng thanh toán bank transfer
 *
 * Storage:
 *   - Postgres (bảng "PaymentOrder") khi DATABASE_URL có sẵn
 *   - Fallback file JSON tại uploads/.payment-orders.json (dev)
 *
 * Lifecycle order:
 *   PENDING → AWAITING_REVIEW → PAID | REJECTED
 *
 *   PENDING            User vừa tạo, chưa nhấn "đã chuyển khoản"
 *   AWAITING_REVIEW    User confirm đã CK → admin nhận Telegram notification
 *   PAID               Admin click "Đã nhận tiền"
 *   REJECTED           Admin click "Từ chối"
 *
 * Bank info đọc từ env:
 *   PAYMENT_BANK_NAME       — VD "VCB", "TCB", "MB", "ACB"  (ID bank cho VietQR)
 *   PAYMENT_BANK_NAME_FULL  — VD "Vietcombank"              (display)
 *   PAYMENT_ACCOUNT_NUMBER  — số tài khoản
 *   PAYMENT_ACCOUNT_HOLDER  — tên chủ tài khoản (không dấu)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { randomBytes, randomUUID } = require('crypto');

const STORE_FILE = path.join(__dirname, '..', 'uploads', '.payment-orders.json');

// ─────────────────────────────────────────────────────────────
// Bank info + VietQR
// ─────────────────────────────────────────────────────────────
function getBankInfo() {
  return {
    bankCode:    process.env.PAYMENT_BANK_NAME       || 'VCB',
    bankName:    process.env.PAYMENT_BANK_NAME_FULL  || 'Vietcombank',
    accountNo:   process.env.PAYMENT_ACCOUNT_NUMBER  || '0000000000',
    accountName: process.env.PAYMENT_ACCOUNT_HOLDER  || 'AEROEDUVISION',
  };
}

/**
 * Sinh URL ảnh QR code chuẩn VietQR (free, không cần API key).
 *   https://img.vietqr.io/image/<bank>-<account>-<template>.png?amount=<amount>&addInfo=<code>
 */
function buildQrUrl({ bankCode, accountNo, accountName, amount, code }) {
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: code,
    accountName: accountName,
  });
  return `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.png?${params}`;
}

// ─────────────────────────────────────────────────────────────
// Plans (hardcoded — sửa dễ ở 1 chỗ)
// ─────────────────────────────────────────────────────────────
const PLANS = [
  // ─ Teacher plans ─────────────────────────
  { id: 'basic-1m',   name: 'Basic — 1 tháng',     amount: 99_000,     durationDays: 30,  audience: 'teacher', features: ['20 đề/tháng','OCR PDF','Chấm tự động'] },
  { id: 'pro-1m',     name: 'Pro — 1 tháng',        amount: 249_000,   durationDays: 30,  audience: 'teacher', features: ['Không giới hạn đề','Tất cả tính năng AI','Hỗ trợ ưu tiên'] },
  { id: 'pro-1y',     name: 'Pro — 1 năm',          amount: 2_490_000, durationDays: 365, audience: 'teacher', features: ['Tiết kiệm 17%','Pro toàn năm','Cộng đồng riêng'] },
  { id: 'school-1y',  name: 'School — 100 GV/năm',  amount: 12_990_000,durationDays: 365, audience: 'teacher', features: ['100 tài khoản giáo viên','Báo cáo trường','SLA 24/7'] },
  // ─ Student plans ─────────────────────────
  { id: 'student-1m', name: 'Học sinh — 1 tháng',  amount: 49_000,     durationDays: 30,  audience: 'student', features: ['AI Tutor 24/7','Giải bài tập AI','Ôn thi cá nhân hoá'] },
  { id: 'student-1y', name: 'Học sinh — 1 năm',    amount: 490_000,    durationDays: 365, audience: 'student', features: ['Tiết kiệm 17%','Tất cả gói tháng','AI Hướng nghiệp chuyên sâu'] },
];

function getPlan(planId) {
  return PLANS.find(p => p.id === planId) || null;
}

// ─────────────────────────────────────────────────────────────
// Storage adapter (Postgres OR JSON file)
// ─────────────────────────────────────────────────────────────
let _pgPool = null;
let _useDb = false;
let _initPromise = null;

// Async vì cần await CREATE TABLE — tránh race "relation does not exist"
// khi createOrder() insert ngay sau ensureStorage() lần đầu.
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
      // CREATE TABLE đồng bộ — bảo đảm sẵn sàng trước khi insert
      await _pgPool.query(`
        CREATE TABLE IF NOT EXISTS "PaymentOrder" (
          id            TEXT PRIMARY KEY,
          "userId"      TEXT,
          "userEmail"   TEXT,
          "userName"    TEXT,
          "planId"      TEXT NOT NULL,
          "planName"    TEXT NOT NULL,
          amount        NUMERIC NOT NULL,
          "transferCode" TEXT NOT NULL UNIQUE,
          status        TEXT NOT NULL DEFAULT 'PENDING',
          "tgChatId"    TEXT,
          "tgMessageId" TEXT,
          metadata      JSONB,
          "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
          "approvedAt"  TIMESTAMPTZ
        )
      `);
      _useDb = true;
      return 'pg';
    } catch (e) {
      console.warn('[payment] pg unavailable, fallback to file store:', e.message);
      _initPromise = null;  // cho phép retry
      return 'file';
    }
  })();
  return _initPromise;
}

function readFileStore() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); }
  catch { return { orders: {} }; }
}
function writeFileStore(data) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────────────────────
// Order operations
// ─────────────────────────────────────────────────────────────
function generateTransferCode() {
  // 6 chữ + số, format AERO-XXXXXX (dễ ngân hàng nhận)
  const r = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `AERO${r}`;
}

async function createOrder({ userId, userEmail, userName, planId, metadata }) {
  const plan = getPlan(planId);
  if (!plan) throw new Error('Plan not found: ' + planId);
  const id = `pay-${randomUUID()}`;
  const transferCode = generateTransferCode();
  const now = new Date().toISOString();
  const order = {
    id,
    userId: userId || null,
    userEmail: userEmail || null,
    userName: userName || null,
    planId,
    planName: plan.name,
    amount: plan.amount,
    transferCode,
    status: 'PENDING',
    tgChatId: null,
    tgMessageId: null,
    metadata: metadata || null,
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
  };

  const mode = await ensureStorage();
  if (mode === 'pg') {
    await _pgPool.query(
      `INSERT INTO "PaymentOrder"
        (id, "userId", "userEmail", "userName", "planId", "planName", amount,
         "transferCode", status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9)`,
      [id, order.userId, order.userEmail, order.userName, planId, plan.name,
       plan.amount, transferCode, order.metadata ? JSON.stringify(order.metadata) : null]
    );
  } else {
    const store = readFileStore();
    store.orders[id] = order;
    writeFileStore(store);
  }
  return order;
}

async function getOrder(id) {
  const mode = await ensureStorage();
  if (mode === 'pg') {
    const { rows } = await _pgPool.query(`SELECT * FROM "PaymentOrder" WHERE id=$1`, [id]);
    if (!rows[0]) return null;
    return mapPgRow(rows[0]);
  }
  return readFileStore().orders[id] || null;
}

async function setStatus(id, status, patch = {}) {
  const mode = await ensureStorage();
  const allowed = ['PENDING','AWAITING_REVIEW','PAID','REJECTED'];
  if (!allowed.includes(status)) throw new Error('Invalid status: ' + status);
  const now = new Date().toISOString();

  if (mode === 'pg') {
    const sets = [`status=$2`, `"updatedAt"=$3`];
    const vals = [id, status, now];
    let i = 4;
    if (patch.tgChatId    !== undefined) { sets.push(`"tgChatId"=$${i++}`);    vals.push(String(patch.tgChatId)); }
    if (patch.tgMessageId !== undefined) { sets.push(`"tgMessageId"=$${i++}`); vals.push(String(patch.tgMessageId)); }
    if (status === 'PAID')               { sets.push(`"approvedAt"=$${i++}`);  vals.push(now); }
    await _pgPool.query(`UPDATE "PaymentOrder" SET ${sets.join(', ')} WHERE id=$1`, vals);
    return getOrder(id);
  }

  const store = readFileStore();
  const o = store.orders[id];
  if (!o) return null;
  o.status = status;
  o.updatedAt = now;
  if (patch.tgChatId    !== undefined) o.tgChatId    = String(patch.tgChatId);
  if (patch.tgMessageId !== undefined) o.tgMessageId = String(patch.tgMessageId);
  if (status === 'PAID')               o.approvedAt  = now;
  writeFileStore(store);
  return o;
}

function mapPgRow(r) {
  return {
    id: r.id,
    userId: r.userId,
    userEmail: r.userEmail,
    userName: r.userName,
    planId: r.planId,
    planName: r.planName,
    amount: Number(r.amount),
    transferCode: r.transferCode,
    status: r.status,
    tgChatId: r.tgChatId,
    tgMessageId: r.tgMessageId,
    metadata: r.metadata,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    approvedAt: r.approvedAt,
  };
}

module.exports = {
  PLANS,
  getPlan,
  getBankInfo,
  buildQrUrl,
  createOrder,
  getOrder,
  setStatus,
};
