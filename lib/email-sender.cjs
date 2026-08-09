/**
 * lib/email-sender.cjs — Gửi email transaction
 *
 * Provider order (chọn cái đầu tiên có cấu hình):
 *   1. SMTP_HOST + SMTP_USER + SMTP_PASS  → nodemailer (Gmail / Mailgun / ...)
 *   2. RESEND_API_KEY                     → Resend REST (free 100 email/ngày)
 *   3. Fallback: ghi file uploads/.last-email.html + console.log
 *
 * ── Setup Gmail (vd vietchungvn@gmail.com) ───────────────────
 *   1. Bật 2FA cho Google account
 *   2. Tạo App Password: https://myaccount.google.com/apppasswords
 *      → chọn "Mail" + đặt tên "AeroEdu"
 *      → copy 16-char password (xoá khoảng trắng)
 *   3. Set env vars:
 *      SMTP_HOST=smtp.gmail.com
 *      SMTP_PORT=465
 *      SMTP_SECURE=true
 *      SMTP_USER=vietchungvn@gmail.com
 *      SMTP_PASS=xxxxxxxxxxxxxxxx       (App password, không phải mật khẩu Gmail)
 *      PAYMENT_FROM_EMAIL="AeroEdu <vietchungvn@gmail.com>"
 *
 * Gmail giới hạn ~500 email/ngày. Nếu cần nhiều hơn, dùng Google Workspace
 * (2.000 email/ngày) hoặc switch sang Resend/Postmark/Mailgun.
 *
 * ENV (chung):
 *   PAYMENT_FROM_EMAIL  mặc định "AeroEdu <onboarding@resend.dev>" (dev sandbox)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FALLBACK_FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..'), 'uploads', '.last-email.html');
const DEFAULT_FROM = process.env.PAYMENT_FROM_EMAIL
  || (process.env.SMTP_USER && `AeroEdu <${process.env.SMTP_USER}>`)
  || 'AeroEdu <onboarding@resend.dev>';

// Lazy SMTP transporter — tạo 1 lần ở lần gửi đầu tiên.
let _smtpTransporter = null;
function getSmtpTransporter() {
  if (_smtpTransporter) return _smtpTransporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch { console.warn('[email] nodemailer chưa cài — chạy: npm install nodemailer'); return null; }
  _smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',  // mặc định true (port 465)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _smtpTransporter;
}

/**
 * Gửi 1 email. Trả về { provider, id, to, subject } khi thành công, hoặc
 * { provider: 'fallback', warning } khi không có API key (vẫn return success
 * để main flow không break — admin tự gửi thủ công).
 */
async function sendEmail({ to, subject, html, text, from }) {
  if (!to) throw new Error('email "to" required');
  if (!subject) throw new Error('email "subject" required');

  const sender = from || DEFAULT_FROM;

  // ─── Provider 1: SMTP (Gmail / Mailgun / ...) ──────────────
  const smtp = getSmtpTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from: sender,
        to,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
      });
      return { provider: 'smtp', id: info.messageId, accepted: info.accepted, to, subject };
    } catch (e) {
      console.error('[email] SMTP failed:', e.message);
      // rơi xuống Resend fallback hoặc fallback file
    }
  }

  // ─── Provider 2: Resend ──────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender, to, subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend failed (${res.status}): ${errText.slice(0, 300)}`);
    }
    const data = await res.json();
    return { provider: 'resend', id: data.id, to, subject };
  }

  // ─── Fallback: ghi file + log ────────────────────────────
  const dump = [
    `<!-- AeroEdu fallback email log -->`,
    `<!-- ${new Date().toISOString()} -->`,
    `<!-- From: ${sender} -->`,
    `<!-- To: ${to} -->`,
    `<!-- Subject: ${subject} -->`,
    '',
    html || `<pre>${(text || '').replace(/[<&]/g, c => c === '<' ? '&lt;' : '&amp;')}</pre>`,
  ].join('\n');
  try {
    fs.mkdirSync(path.dirname(FALLBACK_FILE), { recursive: true });
    fs.writeFileSync(FALLBACK_FILE, dump);
  } catch (e) {
    console.error('[email] fallback write failed:', e.message);
  }
  console.log(`[email] (no provider) to=${to} subject="${subject}"`);
  console.log(`[email] full html → ${FALLBACK_FILE}`);
  return {
    provider: 'fallback',
    to, subject,
    warning: 'RESEND_API_KEY chưa cấu hình. Email được lưu vào file thay vì gửi.',
    file: FALLBACK_FILE,
  };
}

// ─────────────────────────────────────────────────────────────
// Activation code email template
// ─────────────────────────────────────────────────────────────
function buildActivationEmail({ to, code, planName, features, durationDays, activateUrl }) {
  const featuresHtml = features.map(f => `<li>${f}</li>`).join('');
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #0f172a;">
  <div style="background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px; color: #ec4899;">🎉 Thanh toán thành công!</h1>
      <p style="margin: 0; color: #64748b;">Cảm ơn bạn đã đăng ký gói <strong>${planName}</strong>.</p>
    </div>

    <div style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #fff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; letter-spacing: 1px; opacity: .85; margin-bottom: 8px;">MÃ KÍCH HOẠT</div>
      <div style="font-family: ui-monospace, monospace; font-size: 28px; font-weight: 800; letter-spacing: 2px;">${code}</div>
      <div style="font-size: 12px; opacity: .85; margin-top: 8px;">Hiệu lực ${durationDays} ngày sau khi kích hoạt</div>
    </div>

    <h3 style="margin: 24px 0 8px;">Tính năng được mở khoá:</h3>
    <ul style="padding-left: 20px; line-height: 1.7; color: #334155;">${featuresHtml}</ul>

    <div style="text-align: center; margin: 32px 0 16px;">
      <a href="${activateUrl}"
         style="display: inline-block; background: #ec4899; color: #fff; text-decoration: none;
                padding: 12px 28px; border-radius: 10px; font-weight: 700;">
        Kích hoạt ngay →
      </a>
    </div>

    <p style="font-size: 13px; color: #64748b; text-align: center; margin: 16px 0 0;">
      Hoặc đăng nhập vào tài khoản, vào trang <strong>Kích hoạt</strong> và nhập mã ở trên.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px;">
    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
      Email này được gửi tự động từ AeroEduVision sau khi đơn hàng của bạn được xác nhận.
      Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ hỗ trợ.
    </p>
  </div>
</body>
</html>`;

  const text = `🎉 Thanh toán thành công!\n\n` +
    `Gói: ${planName}\n` +
    `Mã kích hoạt: ${code}\n` +
    `Hiệu lực: ${durationDays} ngày\n\n` +
    `Tính năng được mở: ${features.join(', ')}\n\n` +
    `Kích hoạt tại: ${activateUrl}`;

  return { html, text };
}

async function sendActivationEmail({ to, code, planName, features, durationDays, baseUrl }) {
  const activateUrl = `${baseUrl || ''}/activate?code=${encodeURIComponent(code)}`;
  const { html, text } = buildActivationEmail({ to, code, planName, features, durationDays, activateUrl });
  return sendEmail({
    to, subject: `[AeroEdu] Mã kích hoạt gói ${planName} của bạn`,
    html, text,
  });
}

module.exports = {
  sendEmail,
  sendActivationEmail,
  buildActivationEmail,
};
