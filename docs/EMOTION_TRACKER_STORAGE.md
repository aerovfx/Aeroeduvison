# Emotion Tracker – Lưu biểu cảm & giảm tải dữ liệu

## Tổng quan

- **Capture**: Vision Tracker (Face + Blendshapes) phát hiện biểu cảm (22 loại) và ghi vào DB.
- **Giảm tải**: Không lưu từng frame; gộp theo **cửa sổ 1 phút** và gửi **batch** từ client.

## Cách giảm tải

### 1. Client (Vision Tracker)

- **Buffer**: Mỗi lần detect được emotion → đẩy vào buffer (không gửi từng lần).
- **Flush**:
  - Khi buffer ≥ 30 mẫu → gửi 1 request `POST /api/vision-tracker/emotion` với `{ samples: [...] }`.
  - Mỗi **30 giây** → gửi toàn bộ buffer (nếu có), rồi xóa buffer.
- Kết quả: tối đa ~2 request/phút thay vì hàng chục request/giây nếu gửi mỗi frame.

### 2. Server (API)

- **Cửa sổ 1 phút**: Mọi sample trong cùng phút (theo `windowStart` làm tròn theo phút UTC) được **merge** vào **một bản ghi** `EmotionCapture`:
  - `emotionCounts`: JSON `{ "happy": 5, "neutral": 10 }` (số lần mỗi biểu cảm).
  - `avgConfidence`: trung bình confidence.
  - `sampleCount`: tổng số sample trong phút đó.
- **Upsert**: Nếu đã có bản ghi cho (userId, windowStart) → cộng dồn counts và cập nhật avgConfidence, sampleCount.

### 3. Lưu trữ

- **Bảng**: `EmotionCapture` (userId, windowStart, sampleCount, avgConfidence, emotionCounts, sessionId).
- **Unique**: (userId, windowStart) → 1 row/user/phút.
- **Truy vấn**: Lấy thống kê theo khoảng thời gian (from, to) và groupBy (minute | hour | day) mà không cần quét từng frame.

## API

### Ghi biểu cảm

- **POST** `/api/vision-tracker/emotion`
- Body (một mẫu): `{ "emotionType": "happy", "confidence": 85 }`
- Body (batch): `{ "samples": [ { "emotionType": "happy", "confidence": 85 }, ... ] }`
- Server merge theo phút (windowStart). Cần đăng nhập.

### Thống kê trung bình theo khoảng thời gian

- **GET** `/api/vision-tracker/emotion/stats?from=...&to=...&groupBy=minute|hour|day&limit=100`
- Query:
  - `from`, `to`: ISO date (mặc định: 24h gần nhất).
  - `groupBy`: `minute` | `hour` | `day` (mặc định: `hour`).
  - `limit`: số bucket tối đa (mặc định 100, tối đa 500).
- Response:
  - `buckets`: mỗi bucket có `periodStart`, `periodEnd`, `sampleCount`, `avgConfidence`, `dominantEmotion`, `distribution` (số lần từng emotion).
  - `summary`: tổng `totalSamples`, `avgConfidence`, `emotionDistribution`, `dominantEmotion` trong cả khoảng.

## Database

Chạy sau khi thêm model:

```bash
npx prisma generate
npx prisma db push   # hoặc migrate
```

## Ví dụ dùng stats (frontend)

```ts
// Thống kê 7 ngày qua, gộp theo ngày
const res = await fetch(
  '/api/vision-tracker/emotion/stats?' +
  new URLSearchParams({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    to: new Date().toISOString(),
    groupBy: 'day',
    limit: '31'
  })
);
const { buckets, summary } = (await res.json());
// summary.emotionDistribution = { happy: 120, neutral: 80, ... }
// summary.avgConfidence, summary.dominantEmotion
```
