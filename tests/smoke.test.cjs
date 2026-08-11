'use strict';

// globals: true trong vitest.config.ts → describe/it/expect có sẵn, không cần import.
const request = require('supertest');
const { app } = require('../server.cjs');

describe('smoke', () => {
  it('GET /api/health/live trả 200', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
  });
});
