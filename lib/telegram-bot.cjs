/**
 * lib/telegram-bot.cjs — Client gọn nhẹ cho Telegram Bot API
 *
 * Phục vụ flow thanh toán bank transfer:
 *   1. Server gửi notification (sendOrderNotification) khi user click "Đã chuyển khoản"
 *   2. Admin click Approve/Reject inline button trong Telegram app
 *   3. Bot nhận callback_query → server gọi handleCallback() → update order status
 *
 * 2 chế độ nhận callback:
 *   - LONG POLLING (dev): startPolling() chạy nền, gọi getUpdates mỗi 2s
 *   - WEBHOOK (prod):     setWebhook(url) + handleWebhookUpdate(body)
 *
 * ENV:
 *   TELEGRAM_BOT_TOKEN          — bắt buộc, format "<bot_id>:<secret>"
 *   ADMIN_TELEGRAM_CHAT_ID      — optional; nếu trống, auto-bind chat đầu tiên
 *                                 gửi /start tới bot.
 *   TELEGRAM_BOT_USERNAME       — optional, dùng cho deep link (mặc định Aeroedu_bot)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'Aeroedu_bot';
const ADMIN_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..'), 'uploads', '.telegram-admin.json');

const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

// Persisted admin chat id (auto-bound when admin /starts the bot for the first time).
function loadAdminChatId() {
  if (process.env.ADMIN_TELEGRAM_CHAT_ID) return process.env.ADMIN_TELEGRAM_CHAT_ID;
  try {
    const data = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    return data.chatId || null;
  } catch { return null; }
}

function saveAdminChatId(chatId) {
  try {
    fs.mkdirSync(path.dirname(ADMIN_FILE), { recursive: true });
    fs.writeFileSync(ADMIN_FILE, JSON.stringify({ chatId, savedAt: new Date().toISOString() }));
  } catch (e) {
    console.error('[telegram] saveAdminChatId failed:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Low-level API call
// ─────────────────────────────────────────────────────────────
async function tgCall(method, params = {}) {
  if (!API) throw new Error('TELEGRAM_BOT_TOKEN not set');
  const url = `${API}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`telegram ${method} failed: ${data.description || JSON.stringify(data)}`);
  return data.result;
}

async function getMe() { return tgCall('getMe'); }

// ─────────────────────────────────────────────────────────────
// Order notification — send rich card with inline buttons
// ─────────────────────────────────────────────────────────────
function formatVnd(n) {
  return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + 'đ';
}

// Dùng HTML parse mode (Telegram hỗ trợ) — escape rules đơn giản hơn nhiều so
// với MarkdownV2. Chỉ cần escape 3 ký tự `<`, `>`, `&`. Không còn lỗi parse `.`.
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatOrderText(order) {
  return [
    '🔔 <b>ĐỀ NGHỊ XÁC NHẬN THANH TOÁN</b>',
    '',
    `📦 Gói: <b>${escapeHtml(order.planName)}</b>`,
    `💰 Số tiền: <b>${escapeHtml(formatVnd(order.amount))}</b>`,
    `🔖 Mã giao dịch: <code>${escapeHtml(order.transferCode)}</code>`,
    `👤 User: ${escapeHtml(order.userName || order.userEmail || order.userId || 'N/A')}`,
    `📧 Email: ${escapeHtml(order.userEmail || '—')}`,
    `🕐 Tạo lúc: ${escapeHtml(new Date(order.createdAt).toLocaleString('vi-VN'))}`,
    '',
    `🆔 Order: <code>${escapeHtml(order.id)}</code>`,
  ].join('\n');
}

/**
 * Gửi notification cho admin về order mới đang chờ duyệt.
 * Trả message_id để có thể edit/reply về sau.
 */
async function sendOrderNotification(order, opts = {}) {
  const chatId = opts.chatId || loadAdminChatId();
  if (!chatId) {
    throw new Error('No admin chat_id. Send /start to @' + BOT_USERNAME + ' first, or set ADMIN_TELEGRAM_CHAT_ID env.');
  }
  const msg = await tgCall('sendMessage', {
    chat_id: chatId,
    text: formatOrderText(order),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Đã nhận tiền', callback_data: `approve:${order.id}` },
        { text: '❌ Từ chối',     callback_data: `reject:${order.id}` },
      ]],
    },
  });
  return { messageId: msg.message_id, chatId };
}

/**
 * Sau khi admin click button → edit message để khoá button + ghi rõ kết quả.
 */
async function markOrderHandled(chatId, messageId, action, order) {
  const status = action === 'approve' ? '✅ ĐÃ XÁC NHẬN' : '❌ ĐÃ TỪ CHỐI';
  const text = formatOrderText(order) + `\n\n<b>${status}</b>`;
  try {
    await tgCall('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    });
  } catch {
    // Nếu không edit được (message quá cũ), gửi reply
    await tgCall('sendMessage', {
      chat_id: chatId,
      text: `Order <code>${escapeHtml(order.id)}</code> → ${status}`,
      parse_mode: 'HTML',
    });
  }
}

/**
 * Notify user (nếu có chat_id riêng) hoặc gửi vào admin chat khi user
 * không bind Telegram. Dùng khi user thanh toán xong.
 */
async function sendUserConfirmation(chatId, order, action) {
  try {
    const text = action === 'approve'
      ? `✅ Đơn hàng <code>${escapeHtml(order.id)}</code> đã được duyệt. Cảm ơn bạn đã thanh toán!`
      : `❌ Đơn hàng <code>${escapeHtml(order.id)}</code> bị từ chối. Vui lòng liên hệ hỗ trợ.`;
    await tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
  } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────
// Update handling (callback_query + /start)
// onCallback: ({ action, orderId, fromChatId, messageId, callbackQueryId }) => void
// onStart:    ({ chatId, fromUser }) => void
// ─────────────────────────────────────────────────────────────
async function handleUpdate(update, handlers = {}) {
  // /start command — handle 3 cases:
  //   1. /start digest_<userId>  → bind chat_id cho user (RS Phase 8)
  //   2. /start                  → auto-bind admin (first /start ever)
  //   3. /start (already admin)  → friendly ping
  if (update.message && update.message.text && update.message.text.startsWith('/start')) {
    const chatId = update.message.chat.id;
    const fromUser = update.message.from;
    const text = update.message.text.trim();
    const payload = text.length > 6 ? text.slice(7).trim() : ''; // sau "/start "

    // Case 1: digest binding (deep-link từ frontend Settings)
    if (payload.startsWith('digest_')) {
      const userId = payload.slice(7);
      if (handlers.onDigestBind) {
        try {
          const result = await handlers.onDigestBind({ chatId, userId, fromUser });
          await tgCall('sendMessage', {
            chat_id: chatId,
            text: result?.ok
              ? `✅ Đã liên kết Telegram cho tài khoản inphysic.\n\nBạn sẽ nhận tóm tắt gợi ý học hàng ngày tại đây.\n\n👤 ${result.userName || ''}\n📧 ${result.email || ''}`
              : `⚠️ Không thể liên kết: ${result?.error || 'lỗi không xác định'}.\n\nVui lòng quay lại Cài đặt trên inphysic.com và thử lại.`,
            parse_mode: 'HTML',
          });
        } catch (e) {
          await tgCall('sendMessage', {
            chat_id: chatId,
            text: `⚠️ Lỗi liên kết: ${e.message}`,
            parse_mode: 'HTML',
          });
        }
        return;
      }
    }

    // Case 2 + 3: admin binding (legacy)
    if (!loadAdminChatId()) {
      saveAdminChatId(chatId);
      await tgCall('sendMessage', {
        chat_id: chatId,
        text: '✅ Bạn đã được đăng ký là <b>Admin</b> nhận thông báo thanh toán.\n\nBot sẽ gửi notification mỗi khi có đơn hàng cần duyệt.',
        parse_mode: 'HTML',
      });
    } else {
      await tgCall('sendMessage', {
        chat_id: chatId,
        text: '👋 Aeroedu Bot đang hoạt động.\n\nĐể nhận gợi ý học hàng ngày, hãy quay lại inphysic.com → Cài đặt → Gợi ý AI → Liên kết Telegram.',
        parse_mode: 'HTML',
      });
    }
    if (handlers.onStart) handlers.onStart({ chatId, fromUser });
    return;
  }

  // Inline button click
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    const [action, orderId] = data.split(':');
    const fromChatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    // Quick ack — Telegram requires answerCallbackQuery within 30s
    try { await tgCall('answerCallbackQuery', { callback_query_id: cb.id }); } catch {}
    if (handlers.onCallback) {
      await handlers.onCallback({ action, orderId, fromChatId, messageId, callbackQueryId: cb.id });
    }
    return;
  }
}

// ─────────────────────────────────────────────────────────────
// Long polling worker (dev)
// ─────────────────────────────────────────────────────────────
let _polling = false;
let _lastUpdateId = 0;

async function startPolling(handlers = {}) {
  if (!TOKEN) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN not set — polling disabled');
    return;
  }
  if (_polling) return;
  _polling = true;
  console.log('[telegram] long-polling started for @' + BOT_USERNAME);

  // Drain stale updates first (avoid replaying)
  try {
    const initial = await tgCall('getUpdates', { offset: -1, timeout: 0 });
    if (initial.length) _lastUpdateId = initial[initial.length - 1].update_id;
  } catch {}

  (async function loop() {
    while (_polling) {
      try {
        const updates = await tgCall('getUpdates', {
          offset: _lastUpdateId + 1,
          timeout: 25, // long-poll
          allowed_updates: ['message', 'callback_query'],
        });
        for (const u of updates) {
          _lastUpdateId = u.update_id;
          try { await handleUpdate(u, handlers); }
          catch (e) { console.error('[telegram] handleUpdate error:', e.message); }
        }
      } catch (e) {
        console.error('[telegram] poll error:', e.message);
        await new Promise(r => setTimeout(r, 5_000));
      }
    }
  })();
}

function stopPolling() { _polling = false; }

// ─────────────────────────────────────────────────────────────
// Webhook helpers (prod)
// ─────────────────────────────────────────────────────────────
async function setWebhook(url, secretToken) {
  return tgCall('setWebhook', {
    url,
    allowed_updates: ['message', 'callback_query'],
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
}

async function deleteWebhook() {
  return tgCall('deleteWebhook', { drop_pending_updates: true });
}

module.exports = {
  // metadata
  BOT_USERNAME,
  loadAdminChatId,
  saveAdminChatId,
  // basic API
  tgCall,
  getMe,
  // notifications
  sendOrderNotification,
  markOrderHandled,
  sendUserConfirmation,
  // update handling
  handleUpdate,
  startPolling,
  stopPolling,
  setWebhook,
  deleteWebhook,
};
