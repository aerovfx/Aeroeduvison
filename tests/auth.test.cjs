'use strict';

// globals: true trong vitest.config.ts → describe/it/expect/beforeAll/afterAll có sẵn.
const request = require('supertest');
const { Pool } = require('pg');
const { app } = require('../server.cjs');

// Mỗi lần chạy dùng domain riêng theo timestamp — test tự dọn ở afterAll nên
// không bắt buộc, nhưng tránh đụng dữ liệu nếu 1 lần chạy trước crash giữa chừng.
const RUN_TAG = Date.now();
const testEmail = (label) => `vitest-${label}-${RUN_TAG}@example.test`;

let pool;
beforeAll(() => {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
});

afterAll(async () => {
  await pool.query(`DELETE FROM "User" WHERE email LIKE $1`, [`vitest-%-${RUN_TAG}@example.test`]);
  await pool.end();
});

describe('POST /api/auth/register', () => {
  it('tạo tài khoản STUDENT mới thành công, trả accessToken', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: testEmail('register-ok'),
      password: 'MatKhau123!',
      name: 'Vitest Student',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('STUDENT');
    expect(res.body.tokens.accessToken).toBeTruthy();
  });

  it('từ chối thiếu password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: testEmail('register-nopass'),
    });
    expect(res.status).toBe(400);
  });

  it('từ chối email đã tồn tại (409)', async () => {
    const email = testEmail('register-dup');
    const first = await request(app).post('/api/auth/register').send({ email, password: 'MatKhau123!' });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/auth/register').send({ email, password: 'MatKhauKhac456!' });
    expect(second.status).toBe(409);
  });

  it('ADMIN không tự đăng ký được — role bị hạ về STUDENT', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: testEmail('register-admin-attempt'),
      password: 'MatKhau123!',
      role: 'ADMIN',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('STUDENT');
  });
});

describe('POST /api/auth/login', () => {
  const email = testEmail('login-flow');
  const password = 'MatKhau123!';

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password, name: 'Vitest Login' });
    expect(res.status).toBe(201);
  });

  it('đăng nhập đúng email/password → 200 + accessToken', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe(email.toLowerCase());
  });

  it('sai password → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'SaiRoi!!' });
    expect(res.status).toBe(401);
  });

  it('email không tồn tại → 401 (không lộ email có tồn tại hay không)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testEmail('login-never-registered'),
      password: 'BatKyGi123!',
    });
    expect(res.status).toBe(401);
  });

  it('thiếu email/password → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('tài khoản banned=true bị chặn đăng nhập dù đúng mật khẩu', async () => {
    await pool.query('UPDATE "User" SET banned = true WHERE email = $1', [email.toLowerCase()]);
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(403);
    await pool.query('UPDATE "User" SET banned = false WHERE email = $1', [email.toLowerCase()]);
  });
});

describe('GET /api/auth/me', () => {
  it('không có Bearer token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('token hợp lệ → trả đúng user vừa đăng nhập', async () => {
    const email = testEmail('me-flow');
    const password = 'MatKhau123!';
    await request(app).post('/api/auth/register').send({ email, password });
    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    const token = loginRes.body.tokens.accessToken;

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email.toLowerCase());
  });
});
