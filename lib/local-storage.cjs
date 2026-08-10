'use strict';

/**
 * local-storage.cjs — thay thế GCS signed-URL khi chạy desktop/on-premise
 * (không có Application Default Credentials). Giữ đúng hình dạng phản hồi
 * { uploadUrl, publicUrl } như luồng GCS nên FE (uploadFileToGcs) không cần
 * sửa gì — chỉ PUT thẳng file lên uploadUrl rồi dùng publicUrl.
 *
 * File nằm dưới DATA_DIR/uploads/media (cùng gốc DATA_DIR đã dùng cho
 * license-state/entitlements/payment-orders) để một thư mục duy nhất là đủ
 * backup cho toàn bộ dữ liệu bền vững ngoài Postgres.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(process.env.DATA_DIR || path.join(__dirname, '..'), 'uploads', 'media');
const TICKET_TTL_MS = 60 * 60 * 1000; // khớp thời hạn signed URL GCS (1h)
const MAX_BYTES = Number(process.env.LOCAL_UPLOAD_MAX_BYTES) || 500 * 1024 * 1024; // 500MB

const tickets = new Map(); // token -> { absPath, contentType, expiresAt, used }

function ensureRoot() {
  fs.mkdirSync(ROOT, { recursive: true });
}

// Dọn vé quá hạn định kỳ nếu client bỏ dở upload — tránh rò rỉ bộ nhớ.
const _sweep = setInterval(() => {
  const now = Date.now();
  for (const [token, ticket] of tickets) if (ticket.expiresAt < now) tickets.delete(token);
}, 10 * 60 * 1000);
_sweep.unref?.();

function safeJoin(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  if (absPath !== ROOT && !absPath.startsWith(ROOT + path.sep)) {
    throw new Error('Đường dẫn lưu trữ không hợp lệ');
  }
  return absPath;
}

/**
 * Tạo vé upload 1 lần, hết hạn sau 1h. `prefix`/`safeName` phải đã được
 * sanitize ở tầng gọi (route hiện tại strip mọi ký tự ngoài [a-zA-Z0-9._-]).
 * Trả { uploadUrl, publicUrl } cùng hình dạng GCS signed URL.
 */
function createUploadTicket({ prefix, safeName, contentType }) {
  ensureRoot();
  const token = crypto.randomBytes(24).toString('hex');
  const relPath = path.join(prefix, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
  const absPath = safeJoin(relPath);
  tickets.set(token, { absPath, contentType, expiresAt: Date.now() + TICKET_TTL_MS, used: false });
  return {
    uploadUrl: `/api/upload/local/${token}`,
    publicUrl: `/uploads/media/${relPath.split(path.sep).join('/')}`,
  };
}

/** Lấy + tiêu thụ vé (dùng 1 lần). Trả null nếu không có/hết hạn/đã dùng. */
function consumeTicket(token) {
  const ticket = tickets.get(token);
  tickets.delete(token);
  if (!ticket || ticket.used || ticket.expiresAt < Date.now()) return null;
  ticket.used = true;
  return ticket;
}

/** Ghi buffer trực tiếp (share-snapshot, TTS pre-render...). Trả publicUrl. */
function writeBuffer(relPath, buffer) {
  const absPath = safeJoin(relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, buffer);
  return `/uploads/media/${relPath.split(path.sep).join('/')}`;
}

module.exports = { ROOT, MAX_BYTES, createUploadTicket, consumeTicket, writeBuffer };
