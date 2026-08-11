/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

/**
 * Vitest config cho backend (server.cjs) — Phase B0 "lưới an toàn".
 * Cần TEST_DATABASE_URL trỏ tới Postgres thật (xem scripts/setup-test-db.sh)
 * — không mock DB, test chạy nhắm vào schema thật sinh từ prisma/schema.prisma.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.{js,ts,cjs}'],
    setupFiles: ['tests/setup.cjs'],
    // Route đăng ký JWT/bcrypt + connect pool có thể chậm lúc cold-start đầu tiên.
    testTimeout: 15000,
    hookTimeout: 20000,
    // Chạy tuần tự trong 1 file test — nhiều file có thể đụng cùng bảng User.
    fileParallelism: false,
  },
})
