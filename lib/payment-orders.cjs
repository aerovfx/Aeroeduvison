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
  { id: 'basic-1m',   name: 'Basic — 1 tháng',     amount: 99_000,     durationDays: 30,  audience: 'teacher', popular: false, features: ['20 đề thi/tháng','OCR tài liệu PDF','Chấm tự động cơ bản','Quản lý lớp học','Thống kê điểm số'] },
  { id: 'pro-1m',     name: 'Pro — 1 tháng',        amount: 249_000,    durationDays: 30,  audience: 'teacher', popular: true,  features: ['Không giới hạn đề thi','AI soạn đề + chấm tự luận','OCR + nhận dạng bài thi','AI Dashboard insight lớp','Xuất báo cáo Excel/PDF','Hỗ trợ ưu tiên'] },
  { id: 'pro-1y',     name: 'Pro — 1 năm',          amount: 2_490_000,  durationDays: 365, audience: 'teacher', popular: false, badge: 'Tiết kiệm 17%', features: ['Tất cả tính năng Pro','Cộng đồng giáo viên riêng','Webinar hàng tháng','Ưu tiên tính năng mới','Hỗ trợ ưu tiên 24/7'] },
  { id: 'school-1y',  name: 'School — 100 GV/năm',  amount: 12_990_000, durationDays: 365, audience: 'teacher', popular: false, badge: 'Doanh nghiệp', features: ['100 tài khoản giáo viên','Quản lý toàn trường','Báo cáo hiệu suất trường','Tích hợp hệ thống trường','SLA cam kết 99.9% uptime','Hỗ trợ onboarding tận nơi'] },
  // ─ Student plans ─────────────────────────
  { id: 'student-1m', name: 'Học sinh — 1 tháng',   amount: 49_000,     durationDays: 30,  audience: 'student', popular: true,  features: ['AI Gia sư 24/7','AI giải bài + giải thích từng bước','Ôn thi cá nhân hoá theo lực học','Luyện đề theo chủ đề','Theo dõi tiến độ cá nhân'] },
  { id: 'student-1y', name: 'Học sinh — 1 năm',     amount: 490_000,    durationDays: 365, audience: 'student', popular: false, badge: 'Tiết kiệm 17%', features: ['Tất cả tính năng gói tháng','AI Hướng nghiệp chuyên sâu','Phân tích điểm mạnh — điểm yếu','Gợi ý ngành nghề theo năng lực','Báo cáo học tập gửi phụ huynh'] },
  // ─ Parent plans ──────────────────────────
  { id: 'parent-1m',  name: 'Phụ huynh — 1 tháng',  amount: 19_000,     durationDays: 30,  audience: 'parent',  popular: false, features: ['Theo dõi tiến độ học tập của con','Xem kết quả bài thi & điểm số','Nhận thông báo từ giáo viên','Báo cáo học tập hàng tuần','Tư vấn AI chia sẻ với con'] },
  { id: 'parent-1y',  name: 'Phụ huynh — 1 năm',    amount: 190_000,    durationDays: 365, audience: 'parent',  popular: true,  badge: 'Tiết kiệm 17%', features: ['Tất cả tính năng gói tháng','Báo cáo hướng nghiệp AI cho con','Phân tích xu hướng học tập dài hạn','Cảnh báo sớm khi con sa sút','So sánh tiến độ với cùng khối lớp'] },
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

// ─────────────────────────────────────────────────────────────
// Admin queries: list orders with filter + pagination, count by status,
// revenue aggregates. Dùng cho /admin/payments dashboard.
// ─────────────────────────────────────────────────────────────

/**
 * List orders với filter + pagination.
 * @param {object} opts
 * @param {string|null} opts.status  — filter exact status hoặc null = all
 * @param {string|null} opts.search  — match userEmail/userName/transferCode/planName
 * @param {number}      opts.limit   — default 50, max 200
 * @param {number}      opts.offset  — default 0
 */
async function listOrders(opts = {}) {
  const status = opts.status || null;
  const search = (opts.search || '').trim().toLowerCase();
  const limit = Math.min(200, Math.max(1, Number(opts.limit) || 50));
  const offset = Math.max(0, Number(opts.offset) || 0);

  const mode = await ensureStorage();
  if (mode === 'pg') {
    const where = [];
    const vals = [];
    let i = 1;
    if (status) { where.push(`status = $${i++}`); vals.push(status); }
    if (search) {
      where.push(`(
        LOWER("userEmail") LIKE $${i} OR
        LOWER("userName")  LIKE $${i} OR
        LOWER("transferCode") LIKE $${i} OR
        LOWER("planName") LIKE $${i}
      )`);
      vals.push(`%${search}%`);
      i++;
    }
    const sql = `
      SELECT * FROM "PaymentOrder"
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY "createdAt" DESC
      LIMIT $${i++} OFFSET $${i++}
    `;
    vals.push(limit, offset);
    const { rows } = await _pgPool.query(sql, vals);
    return rows.map(mapPgRow);
  }

  // file store fallback
  const all = Object.values(readFileStore().orders || {});
  let filtered = all;
  if (status) filtered = filtered.filter(o => o.status === status);
  if (search) {
    filtered = filtered.filter(o => {
      const blob = `${o.userEmail || ''} ${o.userName || ''} ${o.transferCode || ''} ${o.planName || ''}`.toLowerCase();
      return blob.includes(search);
    });
  }
  filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return filtered.slice(offset, offset + limit);
}

/** Count theo status. Trả object { PENDING, AWAITING_REVIEW, PAID, REJECTED } */
async function countByStatus() {
  const mode = await ensureStorage();
  const empty = { PENDING: 0, AWAITING_REVIEW: 0, PAID: 0, REJECTED: 0 };
  if (mode === 'pg') {
    try {
      const { rows } = await _pgPool.query(
        `SELECT status, COUNT(*)::int AS n FROM "PaymentOrder" GROUP BY status`
      );
      const out = { ...empty };
      for (const r of rows) {
        if (r.status in out) out[r.status] = Number(r.n) || 0;
      }
      return out;
    } catch {
      return empty;
    }
  }
  const all = Object.values(readFileStore().orders || {});
  const out = { ...empty };
  for (const o of all) {
    if (o.status in out) out[o.status]++;
  }
  return out;
}

/** Revenue stats: tổng tiền PAID + breakdown 30 ngày + by plan */
async function getStats() {
  const mode = await ensureStorage();
  if (mode === 'pg') {
    try {
      const [totalQ, monthlyQ, byPlanQ, recentQ] = await Promise.all([
        _pgPool.query(
          `SELECT COALESCE(SUM(amount), 0) AS total_revenue,
                  COUNT(*) FILTER (WHERE status='PAID') AS paid_count,
                  COUNT(*) AS total_orders
             FROM "PaymentOrder"`
        ),
        _pgPool.query(
          `SELECT DATE_TRUNC('day', "approvedAt") AS day,
                  COALESCE(SUM(amount), 0) AS revenue,
                  COUNT(*) AS count
             FROM "PaymentOrder"
            WHERE status = 'PAID'
              AND "approvedAt" > NOW() - INTERVAL '30 days'
            GROUP BY day
            ORDER BY day ASC`
        ),
        _pgPool.query(
          `SELECT "planId", "planName",
                  COUNT(*) FILTER (WHERE status='PAID') AS paid_count,
                  COALESCE(SUM(amount) FILTER (WHERE status='PAID'), 0) AS revenue
             FROM "PaymentOrder"
            GROUP BY "planId", "planName"
            ORDER BY revenue DESC`
        ),
        _pgPool.query(
          `SELECT * FROM "PaymentOrder"
            WHERE status = 'PAID' AND "approvedAt" IS NOT NULL
            ORDER BY "approvedAt" DESC
            LIMIT 10`
        ),
      ]);
      const t = totalQ.rows[0] || {};
      return {
        totalRevenue: Number(t.total_revenue) || 0,
        paidCount: Number(t.paid_count) || 0,
        totalOrders: Number(t.total_orders) || 0,
        last30Days: monthlyQ.rows.map(r => ({
          day: r.day,
          revenue: Number(r.revenue) || 0,
          count: Number(r.count) || 0,
        })),
        byPlan: byPlanQ.rows.map(r => ({
          planId: r.planId,
          planName: r.planName,
          paidCount: Number(r.paid_count) || 0,
          revenue: Number(r.revenue) || 0,
        })),
        recentPaid: recentQ.rows.map(mapPgRow),
      };
    } catch (e) {
      console.warn('[payment] getStats failed:', e.message);
    }
  }
  // file store fallback (simple aggregate)
  const all = Object.values(readFileStore().orders || {});
  const paid = all.filter(o => o.status === 'PAID');
  return {
    totalRevenue: paid.reduce((s, o) => s + Number(o.amount || 0), 0),
    paidCount: paid.length,
    totalOrders: all.length,
    last30Days: [],
    byPlan: [],
    recentPaid: paid.slice(-10).reverse(),
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
  listOrders,
  countByStatus,
  getStats,
};
