'use strict';

/**
 * lib/logger.cjs — logger tương thích Express, thay cho lib/logging.ts (import
 * next/server nên KHÔNG dùng được trong server.cjs — tàn dư Next.js đã chết
 * theo đợt dọn app/middleware.ts).
 *
 * Console luôn bật. Khi chạy trên GCP (Cloud Run tự cấp Application Default
 * Credentials — không cần config gì thêm), log thêm lên Google Cloud Logging
 * qua @google-cloud/logging-winston (đã là dependency có sẵn, trước đây không
 * dùng ở đâu). Log severity ERROR có stack trace đúng format sẽ tự được Cloud
 * Error Reporting nhận diện — không cần thêm dependency/service riêng.
 */

const winston = require('winston');

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
      const cat = category ? `[${category}] ` : '';
      const rest = { ...meta };
      delete rest[Symbol.for('level')];
      delete rest[Symbol.for('message')];
      const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
      return `${timestamp} ${level.toUpperCase()} ${cat}${message}${extra}`;
    }),
  ),
});

const transports = [consoleTransport];

// Chỉ thêm Cloud Logging transport khi có khả năng ADC (Cloud Run luôn set
// K_SERVICE; local dev/desktop/on-prem thì không → bỏ qua êm, không throw).
if (process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE) {
  try {
    const { LoggingWinston } = require('@google-cloud/logging-winston');
    transports.push(new LoggingWinston({ logName: 'aeroedu-server' }));
  } catch (e) {
    console.warn('[logger] Cloud Logging transport không khởi tạo được:', e.message);
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
});

/** Category cho log — dùng để lọc/tìm kiếm trong Cloud Logging. */
const LogCategory = Object.freeze({
  AUTH: 'auth',
  PAYMENT: 'payment',
  DATABASE: 'database',
  UPLOAD: 'upload',
  API: 'api',
  SYSTEM: 'system',
  SECURITY: 'security',
});

module.exports = { logger, LogCategory };
