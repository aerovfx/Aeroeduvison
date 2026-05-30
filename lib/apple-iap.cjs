/**
 * apple-iap.cjs — xác thực giao dịch Apple In-App Purchase (StoreKit 2).
 *
 * Luồng: app gửi signedTransaction (JWS) → decode payload lấy productId +
 * transactionId → (nếu cấu hình key) gọi App Store Server API xác thực authoritative
 * → map productId → planId → caller gọi grantPlan().
 *
 * ENV (Secret Manager — KHÔNG hardcode):
 *   APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_BUNDLE_ID (com.aeroedu.inphysic),
 *   APPLE_IAP_PRIVATE_KEY (.p8 contents) hoặc APPLE_IAP_PRIVATE_KEY_PATH (file mount),
 *   APPLE_IAP_ENV = sandbox | production (mặc định sandbox).
 */
const jwt = require('jsonwebtoken');
const fs = require('fs');

// ── Bản đồ Product ID ↔ planId (khớp docs/IOS_IAP_INTEGRATION.md + PLANS) ──
const IAP_PRODUCT_PLAN_MAP = {
  'com.aeroedu.inphysic.teacher.basic.monthly': 'basic-1m',
  'com.aeroedu.inphysic.teacher.pro.monthly':   'pro-1m',
  'com.aeroedu.inphysic.teacher.pro.yearly':    'pro-1y',
  'com.aeroedu.inphysic.student.monthly':       'student-1m',
  'com.aeroedu.inphysic.student.yearly':        'student-1y',
  'com.aeroedu.inphysic.parent.monthly':        'parent-1m',
  'com.aeroedu.inphysic.parent.yearly':         'parent-1y',
};
// school-1y: B2B, KHÔNG bán qua IAP (giữ liên hệ tư vấn).

const ENV = (process.env.APPLE_IAP_ENV || 'sandbox').toLowerCase();
const BUNDLE_ID = process.env.APPLE_IAP_BUNDLE_ID || 'com.aeroedu.inphysic';
const KEY_ID = process.env.APPLE_IAP_KEY_ID || '';
const ISSUER_ID = process.env.APPLE_IAP_ISSUER_ID || '';
const API_HOST = ENV === 'production'
  ? 'https://api.storekit.itunes.apple.com'
  : 'https://api.storekit-sandbox.itunes.apple.com';

function privateKey() {
  if (process.env.APPLE_IAP_PRIVATE_KEY) return process.env.APPLE_IAP_PRIVATE_KEY.replace(/\\n/g, '\n');
  const p = process.env.APPLE_IAP_PRIVATE_KEY_PATH;
  if (p) { try { return fs.readFileSync(p, 'utf8'); } catch { /* ignore */ } }
  return null;
}
function isConfigured() { return !!(KEY_ID && ISSUER_ID && privateKey()); }

/** Decode 1 JWS (header.payload.signature) → payload JSON (KHÔNG verify chữ ký). */
function decodeJws(jws) {
  const parts = String(jws || '').split('.');
  if (parts.length < 2) throw new Error('JWS không hợp lệ');
  const json = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json);
}

/** JWT ES256 để gọi App Store Server API. */
function appStoreApiToken() {
  const key = privateKey();
  if (!key) throw new Error('APPLE_IAP_PRIVATE_KEY chưa cấu hình');
  return jwt.sign(
    { iss: ISSUER_ID, aud: 'appstoreconnect-v1', bid: BUNDLE_ID },
    key,
    { algorithm: 'ES256', keyid: KEY_ID, expiresIn: '15m', header: { alg: 'ES256', kid: KEY_ID, typ: 'JWT' } }
  );
}

/** Gọi App Store Server API lấy thông tin giao dịch (authoritative). */
async function fetchTransaction(transactionId) {
  const token = appStoreApiToken();
  const r = await fetch(`${API_HOST}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`App Store API ${r.status}`);
  const body = await r.json();
  return decodeJws(body.signedTransactionInfo); // payload chuẩn từ Apple
}

/**
 * Xác thực + trích xuất. Nhận { signedTransaction } (JWS, StoreKit 2) HOẶC
 * { transactionId } (StoreKit 1 — cordova-plugin-purchase v13).
 *
 * ⚠️ cordova-plugin-purchase v13 trên iOS dùng StoreKit 1 (SKPaymentQueue) nên chỉ
 * cung cấp `transactionId`, KHÔNG có JWS. Vì vậy đường xác thực duy nhất là gọi
 * App Store Server API bằng transactionId → BẮT BUỘC cấu hình khoá (KEY_ID/ISSUER_ID/
 * PRIVATE_KEY), kể cả khi test sandbox. Đường decode JWS chỉ dùng được nếu một ngày
 * nào đó client gửi JWS (StoreKit 2).
 *
 * Trả { productId, planId, transactionId, originalTransactionId, expiresAtMs, verified }.
 */
async function verifyTransaction(input) {
  const signedTransaction = typeof input === 'string' ? input : (input?.signedTransaction || null);
  const givenTxnId = (typeof input === 'object' && input) ? (input.transactionId || null) : null;

  // transactionId ưu tiên từ client; nếu không có thì thử rút từ JWS (StoreKit 2).
  let txnIdFromJws = null;
  if (!givenTxnId && signedTransaction) {
    try { txnIdFromJws = decodeJws(signedTransaction).transactionId || null; } catch { /* JWS hỏng — bỏ qua */ }
  }
  const txnId = givenTxnId || txnIdFromJws;

  let payload = null;
  let verified = false;
  let apiError = null;

  // (1) Authoritative: có khoá + transactionId → hỏi App Store Server API.
  //     Hoạt động cho cả StoreKit 1 (chỉ transactionId) lẫn StoreKit 2.
  if (isConfigured() && txnId) {
    try { payload = await fetchTransaction(txnId); verified = true; }
    catch (e) { apiError = e; }
  }

  // (2) Fallback decode JWS — CHỈ khi client thực sự gửi JWS (StoreKit 2).
  //     Production không bao giờ tin JWS client mà không qua App Store API.
  if (!payload && signedTransaction) {
    if (ENV === 'production') {
      throw new Error('Xác thực Apple thất bại: ' + (apiError ? apiError.message : 'thiếu khoá App Store Server API'));
    }
    try { payload = decodeJws(signedTransaction); } catch { /* không decode được */ }
  }

  // (3) Không còn cách xác thực nào → báo lỗi đúng nguyên nhân (không che lỗi).
  if (!payload) {
    if (apiError) throw new Error('Xác thực Apple thất bại: ' + apiError.message);
    if (!isConfigured()) throw new Error(
      'IAP chưa cấu hình khoá App Store Server API (APPLE_IAP_KEY_ID/ISSUER_ID/PRIVATE_KEY). '
      + 'StoreKit 1 (cordova-plugin-purchase) không gửi JWS nên bắt buộc có khoá — kể cả khi test sandbox.'
    );
    throw new Error('Thiếu transactionId hoặc signedTransaction để xác thực');
  }
  if (payload.bundleId && payload.bundleId !== BUNDLE_ID) throw new Error('Sai bundleId');
  const planId = IAP_PRODUCT_PLAN_MAP[payload.productId];
  if (!planId) throw new Error('Product ID không nằm trong bản đồ: ' + payload.productId);
  return {
    productId: payload.productId,
    planId,
    transactionId: payload.transactionId,
    originalTransactionId: payload.originalTransactionId,
    expiresAtMs: payload.expiresDate || null, // ms epoch (subscription)
    verified,
  };
}

/** Decode App Store Server Notification V2 signedPayload → { notificationType, data{...} }. */
function decodeNotification(signedPayload) {
  const p = decodeJws(signedPayload);
  let txn = null;
  try { if (p.data && p.data.signedTransactionInfo) txn = decodeJws(p.data.signedTransactionInfo); } catch { /* ignore */ }
  return { notificationType: p.notificationType, subtype: p.subtype, transaction: txn };
}

module.exports = {
  IAP_PRODUCT_PLAN_MAP, ENV, BUNDLE_ID, isConfigured,
  decodeJws, verifyTransaction, decodeNotification,
};
