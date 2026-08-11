'use strict';

/**
 * tests/setup.cjs — vitest setupFiles, chạy TRƯỚC khi bất kỳ test file nào
 * require('../server.cjs'). server.cjs đọc process.env.* ở top-level lúc
 * module load nên các biến này PHẢI có mặt trước require(), không phải trong
 * beforeAll().
 *
 * Cần TEST_DATABASE_URL trỏ Postgres thật đã apply schema — chạy
 * `./scripts/setup-test-db.sh` một lần trước khi `npm test`.
 */

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'Thiếu TEST_DATABASE_URL. Chạy `./scripts/setup-test-db.sh` rồi export biến ' +
      'TEST_DATABASE_URL nó in ra, sau đó chạy lại `npm test`.',
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-32-characters-minimum-xx';
process.env.DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'cloud';
process.env.OFFLINE_MODE = 'false';
process.env.NODE_ENV = 'test';
// Không set PORT/HOST cố định — server.cjs chỉ listen() khi require.main===module
// (guard thêm ở Phase B0), test dùng supertest(app) trực tiếp, không bind port thật.
