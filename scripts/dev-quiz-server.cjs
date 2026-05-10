#!/usr/bin/env node
/**
 * dev-quiz-server.cjs
 *
 * Server tối thiểu (Node http built-in, KHÔNG cần express) phục vụ test UI:
 *   GET  /api/health
 *   GET  /api/auth/me              (mock teacher)
 *   GET  /api/teacher/exams        (mock empty)
 *   POST /api/teacher/quiz-extract  → fal.ai trích xuất PDF
 *   POST /api/teacher/quiz-publish  → mock examId
 *
 * Chạy:
 *   FAL_API_KEY=... PORT=8091 node scripts/dev-quiz-server.cjs
 */
'use strict';

const http = require('http');
const { randomUUID } = require('crypto');
const { extractQuestionsFromPdf, generateQuestionsFromPdf } = require('../lib/fal-quiz-extractor.cjs');
const tg = require('../lib/telegram-bot.cjs');
const orders = require('../lib/payment-orders.cjs');
const entitlements = require('../lib/entitlements.cjs');
const emailSender = require('../lib/email-sender.cjs');

const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173';

function getUserKey(req) {
  // Lấy user identifier từ JWT-like header. Khi không có Bearer, dùng query
  // ?userKey=… (dev). Production phải verify JWT thật.
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7);
    if (token && token !== 'dev-mock-token') return token;
  }
  // dev mode: cho phép gắn ?userKey= trong query
  const u = new URL(req.url, 'http://localhost');
  return u.searchParams.get('userKey') || 'dev-teacher-1';
}

const PORT = parseInt(process.env.PORT || '8091', 10);
const MAX_BODY = 50 * 1024 * 1024;

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', c => {
      total += c.length;
      if (total > MAX_BODY) { req.destroy(); reject(new Error('Body too large')); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      if (!buf.length) return resolve({});
      try { resolve(JSON.parse(buf.toString('utf8'))); }
      catch (e) { reject(new Error('Invalid JSON: ' + e.message)); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  try {
    const pathname = req.url.split('?')[0];

    if (pathname === '/api/health') {
      return sendJSON(res, 200, { ok: true, ts: Date.now(), fal: !!process.env.FAL_API_KEY });
    }

    if (pathname === '/api/dev/sample-pdf' && req.method === 'GET') {
      // Dev-only: expose 1 PDF mẫu để UI test (path cố định /tmp/sample-test.pdf)
      try {
        const buf = require('fs').readFileSync('/tmp/sample-test.pdf');
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Length': buf.length,
          'Access-Control-Allow-Origin': '*',
        });
        return res.end(buf);
      } catch (e) {
        return sendJSON(res, 404, { error: 'sample-test.pdf not found in /tmp' });
      }
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      return sendJSON(res, 200, {
        id: 'dev-teacher-1',
        email: 'teacher@dev.local',
        name: 'Dev Teacher',
        role: 'TEACHER',
        username: 'devteacher',
        firstName: 'Dev',
        lastName: 'Teacher',
        emailVerified: true,
      });
    }

    if (pathname === '/api/auth/refresh' && req.method === 'POST') {
      return sendJSON(res, 200, { accessToken: 'dev-token' });
    }

    if (pathname === '/api/teacher/exams' && req.method === 'GET') {
      return sendJSON(res, 200, { exams: [] });
    }

    if (pathname === '/api/teacher/quiz-extract' && req.method === 'POST') {
      const t0 = Date.now();
      const userKey = getUserKey(req);
      const body = await readJSON(req);
      const { fileBase64, filename, mode, subject, grade, language, model, count } = body;

      // Gate by entitlement (bỏ qua nếu set ALLOW_ANON_AI=1 cho dev)
      if (process.env.ALLOW_ANON_AI !== '1') {
        const targetFeature = mode === 'generate' ? 'quiz_generate' : 'quiz_extract';
        const ok = await entitlements.hasFeature(userKey, targetFeature);
        if (!ok) {
          return sendJSON(res, 403, {
            success: false, error: 'PAYMENT_REQUIRED',
            message: `Bạn chưa có quyền dùng "${entitlements.FEATURES[targetFeature]}". Vui lòng nâng cấp gói.`,
            requiredFeature: targetFeature,
            upgradeUrl: '/pricing',
          });
        }
      }

      if (!fileBase64) return sendJSON(res, 400, { success: false, error: 'fileBase64 is required' });

      const pdfBuffer = Buffer.from(fileBase64, 'base64');
      try { require('fs').writeFileSync('/tmp/last-received.pdf', pdfBuffer); } catch {}
      console.log(`[debug] received b64 len=${fileBase64.length} → buf len=${pdfBuffer.length} hex(0..16)=${pdfBuffer.slice(0, 16).toString('hex')}`);
      if (pdfBuffer.length < 100) return sendJSON(res, 400, { success: false, error: 'PDF buffer quá nhỏ' });
      if (pdfBuffer.length > 30 * 1024 * 1024) return sendJSON(res, 413, { success: false, error: 'PDF tối đa 30MB' });

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
      console.log(`[quiz-extract] ✅ mode=${mode || 'extract'} file=${filename} questions=${result.questions.length} took=${Date.now() - t0}ms`);
      return sendJSON(res, 200, { success: true, ...result, receivedFilename: filename || null });
    }

    if (pathname === '/api/teacher/quiz-publish' && req.method === 'POST') {
      const body = await readJSON(req);
      const { title, questions } = body;
      if (!title || !Array.isArray(questions)) {
        return sendJSON(res, 400, { success: false, error: 'title + questions[] required' });
      }
      const examId = `dev-${randomUUID()}`;
      console.log(`[quiz-publish] (mock) ✅ exam=${examId} questions=${questions.length}`);
      return sendJSON(res, 201, { success: true, examId, mock: true });
    }

    // ── Payment routes ───────────────────────────────────────
    if (pathname === '/api/payment/plans' && req.method === 'GET') {
      return sendJSON(res, 200, { plans: orders.PLANS });
    }
    if (pathname === '/api/payment/bank' && req.method === 'GET') {
      return sendJSON(res, 200, orders.getBankInfo());
    }
    if (pathname === '/api/payment/orders' && req.method === 'POST') {
      const { planId, userId, userEmail, userName, metadata } = await readJSON(req);
      if (!planId) return sendJSON(res, 400, { error: 'planId required' });
      try {
        const order = await orders.createOrder({ planId, userId, userEmail, userName, metadata });
        const bank = orders.getBankInfo();
        const qrUrl = orders.buildQrUrl({
          bankCode: bank.bankCode, accountNo: bank.accountNo, accountName: bank.accountName,
          amount: order.amount, code: order.transferCode,
        });
        console.log(`[payment] created order=${order.id} plan=${planId} amount=${order.amount}`);
        return sendJSON(res, 201, { order, bank, qrUrl });
      } catch (e) { return sendJSON(res, 500, { error: e.message }); }
    }
    {
      const m = req.url.match(/^\/api\/payment\/orders\/([^/?]+)(?:\?.*)?$/);
      if (m && req.method === 'GET') {
        const o = await orders.getOrder(m[1]);
        if (!o) return sendJSON(res, 404, { error: 'Order not found' });
        return sendJSON(res, 200, { order: o });
      }
      const m2 = req.url.match(/^\/api\/payment\/orders\/([^/]+)\/notify$/);
      if (m2 && req.method === 'POST') {
        try {
          const order = await orders.getOrder(m2[1]);
          if (!order) return sendJSON(res, 404, { error: 'Order not found' });
          if (order.status !== 'PENDING') {
            return sendJSON(res, 409, { error: 'Order already in status: ' + order.status });
          }
          // Send Telegram FIRST — chỉ đổi status nếu thành công.
          // Tránh case: notify lỗi nhưng status đã chuyển AWAITING_REVIEW
          // → user nghĩ đã xong nhưng admin không nhận được gì.
          const tgRes = await tg.sendOrderNotification(order);
          const updated = await orders.setStatus(order.id, 'AWAITING_REVIEW', {
            tgChatId: tgRes.chatId, tgMessageId: tgRes.messageId,
          });
          console.log(`[payment] order=${order.id} → AWAITING_REVIEW (tg msg ${tgRes.messageId})`);
          return sendJSON(res, 200, { ok: true, status: 'AWAITING_REVIEW', order: updated });
        } catch (e) {
          console.error('[payment:notify]', e.message);
          return sendJSON(res, 500, { error: e.message });
        }
      }
    }
    if (pathname === '/api/telegram/webhook' && req.method === 'POST') {
      try {
        const update = await readJSON(req);
        await tg.handleUpdate(update, { onCallback: onAdminCallback });
        return sendJSON(res, 200, { ok: true });
      } catch (e) { return sendJSON(res, 500, { error: e.message }); }
    }

    // ── Entitlements ─────────────────────────────────────────
    if (pathname === '/api/entitlements/plan-features' && req.method === 'GET') {
      return sendJSON(res, 200, {
        features: entitlements.FEATURES,
        planFeatures: entitlements.PLAN_FEATURES,
      });
    }
    if (req.url.startsWith('/api/entitlements/me') && req.method === 'GET') {
      const userKey = getUserKey(req);
      const list = await entitlements.listEntitlements(userKey);
      return sendJSON(res, 200, { userKey, entitlements: list });
    }
    if (pathname === '/api/entitlements/activate' && req.method === 'POST') {
      try {
        const { code } = await readJSON(req);
        if (!code) return sendJSON(res, 400, { error: 'code required' });
        const userKey = getUserKey(req);
        const result = await entitlements.activateCode(code.trim().toUpperCase(), userKey);
        console.log(`[entitlements] user=${userKey} activated ${result.code} → features=${result.features.join(',')}`);
        return sendJSON(res, 200, { ok: true, ...result });
      } catch (e) { return sendJSON(res, 400, { error: e.message }); }
    }

    return sendJSON(res, 404, { error: 'Not found', path: req.url });
  } catch (err) {
    console.error('[server] ❌', err.message);
    return sendJSON(res, 500, { success: false, error: err.message });
  }
});

// Telegram callback handler — admin click ✅/❌ trong app Telegram.
// Nếu approve: sinh activation code + gửi email + ack qua Telegram.
async function onAdminCallback({ action, orderId, fromChatId, messageId }) {
  if (!orderId || !['approve','reject'].includes(action)) return;
  const order = await orders.getOrder(orderId);
  if (!order) { console.warn('[payment] callback: order not found', orderId); return; }
  const newStatus = action === 'approve' ? 'PAID' : 'REJECTED';
  const updated = await orders.setStatus(orderId, newStatus);
  await tg.markOrderHandled(fromChatId, messageId, action, updated);
  console.log(`[payment] order=${orderId} → ${newStatus} via Telegram`);

  if (newStatus !== 'PAID') return;

  // ── Sinh code + gửi email ──────────────────────────────────
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
    } else {
      console.warn(`[payment] order ${orderId} không có userEmail, skip gửi email`);
    }

    // Cũng forward code qua Telegram để admin có sẵn (phòng email lỗi)
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

server.listen(PORT, () => {
  console.log(`[dev-quiz-server] listening on :${PORT}`);
  console.log(`[dev-quiz-server] FAL_API_KEY=${process.env.FAL_API_KEY ? 'SET' : 'MISSING'}`);
  console.log(`[dev-quiz-server] TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'MISSING'}`);
  console.log(`[dev-quiz-server] BANK=${process.env.PAYMENT_BANK_NAME || 'VCB'} ${process.env.PAYMENT_ACCOUNT_NUMBER || '(default)'}`);

  if (process.env.TELEGRAM_BOT_TOKEN) {
    tg.startPolling({ onCallback: onAdminCallback });
  }
});
