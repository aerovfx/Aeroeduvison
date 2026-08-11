'use strict';

/**
 * env-validate.cjs — kiểm tra 2 env var rủi ro cao nhất lúc khởi động thay vì
 * để lỗi mơ hồ về sau (JWT verify sai lặng lẽ bằng giá trị fallback cứng, hay
 * DATABASE_URL sai format chỉ lộ ra khi connect lần đầu giữa lúc phục vụ request).
 *
 * JWT_SECRET bắt buộc mạnh khi có DATABASE_URL (tức auth thật đang bật) — kể cả
 * ngoài chế độ on-premise (vốn server.cjs đã tự check riêng, ngưỡng tương tự).
 * Không bắt DATABASE_URL phải luôn có — server.cjs có chế độ hoạt động degraded
 * khi thiếu DB, giữ nguyên hành vi đó.
 */

const { z } = require('zod');

const PLACEHOLDER_RE = /change_me|changeme|dev-secret-fallback|placeholder/i;

const schema = z
  .object({
    DATABASE_URL: z
      .string()
      .regex(/^postgres(ql)?:\/\//, 'phải là connection string Postgres (postgres://...)')
      .optional(),
    // Độ mạnh (>=32 ký tự) chỉ bắt buộc khi có DATABASE_URL — check riêng bên
    // dưới, vì lúc đó auth thật mới thực sự bật.
    JWT_SECRET: z
      .string()
      .refine((v) => !PLACEHOLDER_RE.test(v), 'đang dùng giá trị mặc định/placeholder — phải đổi')
      .optional(),
  })
  .passthrough();

function validateEnv(env = process.env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${issues}`);
  }

  const hasDb = !!env.DATABASE_URL;
  const jwtSecret = env.JWT_SECRET || env.NEXTAUTH_SECRET || '';
  if (hasDb && (jwtSecret.length < 32 || PLACEHOLDER_RE.test(jwtSecret))) {
    throw new Error(
      'Cấu hình môi trường không hợp lệ:\n' +
        '  - JWT_SECRET: bắt buộc >= 32 ký tự ngẫu nhiên, không phải giá trị mặc định, khi đã có DATABASE_URL.',
    );
  }
}

module.exports = { validateEnv };
