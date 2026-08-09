# Chạy local hoàn toàn offline

Backend local dùng SQLite nhúng, lưu tại `data/aeroedu-offline.db`. Không cần
cài hoặc khởi động PostgreSQL, Docker hay kết nối Internet.

```bash
# Chỉ cần chạy một lần khi mới clone (cần mạng để cài package)
npm install
npm install --prefix aeroedu-vite

# Khởi động backend SQLite và frontend Vite
npm run dev:offline
```

Frontend chạy ở URL do Vite in ra (thường là `http://localhost:5173`), backend
ở `http://localhost:8090`. Database và hai file WAL phụ trợ đều đã được ignore
khỏi Git.

Các lệnh hữu ích:

```bash
# Chỉ tạo/kiểm tra database, không chạy ứng dụng
npm run db:offline:init

# Chọn file database khác
LOCAL_DATABASE_PATH=/duong/dan/aeroedu.db npm run dev:offline
```

Production vẫn dùng `DATABASE_URL=postgresql://...` như trước. SQLite chỉ được
bật khi có `LOCAL_DATABASE_PATH` hoặc `DATABASE_URL` bắt đầu bằng `sqlite:`.

> Chế độ SQLite này dành cho phát triển/demo tối giản. Bản phân phối on-premise
> production dùng PostgreSQL theo `ON_PREMISE_RUNBOOK.md`, vì backend có nhiều
> truy vấn PostgreSQL-specific không thể ánh xạ an toàn sang SQLite.
