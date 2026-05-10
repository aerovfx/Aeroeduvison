#!/usr/bin/env node
/**
 * Smoke test: gửi email mã kích hoạt qua Gmail SMTP.
 *
 * Chạy:
 *   SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_SECURE=true \
 *   SMTP_USER=vietchungvn@gmail.com \
 *   SMTP_PASS='xxxx xxxx xxxx xxxx' \
 *   PAYMENT_FROM_EMAIL="AeroEdu <vietchungvn@gmail.com>" \
 *   node scripts/test-gmail-smtp.cjs <email-nhận>
 *
 * VD:  node scripts/test-gmail-smtp.cjs friend@gmail.com
 */
'use strict';

const { sendActivationEmail } = require('../lib/email-sender.cjs');

(async () => {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/test-gmail-smtp.cjs <email-nhận>');
    process.exit(1);
  }
  if (!process.env.SMTP_PASS) {
    console.error('Thiếu SMTP_PASS — set App Password vào env trước khi chạy');
    process.exit(1);
  }

  console.log('Sending test activation email to:', to);
  const result = await sendActivationEmail({
    to,
    code: 'AERO-TEST-1234',
    planName: 'Pro — 1 tháng (TEST)',
    features: [
      'Tạo đề từ PDF (Wayground/AI extract)',
      'Sinh đề mới bằng AI',
      'Chấm tự luận bằng AI',
      'OCR tài liệu PDF / ảnh',
      'AI Content Generator',
    ],
    durationDays: 30,
    baseUrl: process.env.PUBLIC_URL || 'http://localhost:5173',
  });

  console.log('\n✅ Result:', JSON.stringify(result, null, 2));
  if (result.provider === 'fallback') {
    console.warn('\n⚠ Email KHÔNG được gửi — chạy ở chế độ fallback (no SMTP).');
    console.warn('  Xem nội dung tại:', result.file);
    process.exit(1);
  }
  console.log('\n→ Mở Gmail của', to, 'để check inbox (có thể vào Spam).');
})().catch(err => {
  console.error('CRASH:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
