'use strict';

const request = require('supertest');
const { app } = require('../server.cjs');

describe('lưới an toàn lỗi tầng Express (Phase B0)', () => {
  it('JSON body hỏng → trả lỗi gọn (400/500), không treo/crash process', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken json'); // thiếu dấu đóng — body-parser tự next(err)

    expect([400, 500]).toContain(res.status);
    expect(res.body).toBeTypeOf('object');
  });

  it('route không khớp API nào → rơi vào SPA fallback, không treo (dist/ chưa build trong môi trường test → lỗi sendFile được lưới an toàn bắt gọn)', async () => {
    const res = await request(app).get('/duong-dan-khong-ton-tai-vitest');
    // dist/index.html không tồn tại khi chưa `npm run build` (đúng thực tế môi
    // trường test) → res.sendFile lỗi ENOENT, module `send` tự gắn err.status=404
    // → error handler mới tôn trọng err.status (không ép cứng 500) → 404 JSON
    // gọn, KHÔNG phải treo/crash process. Khi có dist/ thật (CI/production) sẽ
    // là 200 phục vụ SPA — cả 2 đều hợp lệ, chỉ không được để request treo.
    expect([200, 404]).toContain(res.status);
  });
});
