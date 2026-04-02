# Phân tích giải pháp tối ưu Cloud Run — AeroEdu Demo

**Ngày:** 29/03/2026
**Vấn đề:** Cold start OOM (4.1GB / 63s) khi truy cập `https://demo-667564078289.asia-southeast1.run.app/`
**App:** Next.js 15.5.14, 242 pages, standalone output

---

## Hiện trạng từ phân tích code

| Metric | Giá trị | Ghi chú |
|--------|---------|---------|
| Tổng pages | 242 | Rất nhiều cho 1 standalone app |
| Labtwin pages | 68 (28%) | Tất cả `'use client'` |
| Pages dùng three.js | 3 | ~700KB mỗi page |
| Pages dùng mediapipe | 7 | ~500KB mỗi page |
| Pages dùng R3F | 1 | ~350KB |
| Pages dùng deck.gl | 0 | **Installed but unused** |
| `next/dynamic` đã có | 11/13 pages | 2 pages thiếu `ssr: false` |
| Webpack async chunks | ✓ | three-vendor, mediapipe-vendor riêng |
| `force-dynamic` scope | Root layout | Ảnh hưởng toàn bộ 242 pages |
| node_modules | 1.8GB | Standalone copy phần lớn |

---

## Giải pháp 1: Tách lab routes ra service riêng

### Ý tưởng
Tách 68 labtwin pages thành 1 Cloud Run service riêng (`demo-labs`), main app chỉ còn 174 pages nhẹ.

### Phân tích impact

**Điểm tốt:**
- Giảm 28% số pages từ main app → giảm route manifest
- Tách hoàn toàn three.js/mediapipe khỏi main bundle
- Có thể cấu hình memory riêng cho mỗi service (main: 2Gi, labs: 8Gi)
- Scaling độc lập: labs cần nhiều resource hơn, main app nhẹ

**Tuy nhiên — phát hiện quan trọng:**
Webpack **đã chunk heavy libs thành async** (three-vendor, mediapipe-vendor). Nghĩa là three.js/mediapipe **KHÔNG nằm trong main bundle** — chỉ load khi user navigate tới lab page. Tách service sẽ **không giảm cold start memory** của main app nhiều như kỳ vọng.

**Vấn đề kỹ thuật khi tách:**
- Cần shared authentication (NextAuth) giữa 2 services → JWT hoặc shared session
- Cần shared layout (Sidebar, Header) → duplicate code hoặc microfrontend
- Middleware phức tạp với canary proxy → cần maintain 2 middleware
- CI/CD pipeline phải build + deploy 2 services
- Cross-domain navigation giữa 2 services → mất client-side state

**Chi phí:**
- 2 Cloud Run services × infra cost
- 2 Docker images × build time
- Development overhead tăng đáng kể

### Verdict: ⚠️ HIGH EFFORT, MEDIUM IMPACT

Không phải giải pháp đầu tiên nên làm. Webpack async chunks đã giải quyết 80% vấn đề bundle separation. Chỉ nên tách khi scale lên production thực sự (>1000 users concurrent) hoặc khi main app vẫn OOM sau khi áp dụng giải pháp 2 + 3.

**Effort:** 3-5 ngày
**Memory savings ước tính:** 500MB-1GB cho main app cold start
**Khi nào nên làm:** Phase 3 (sau khi 2 giải pháp kia không đủ)

---

## Giải pháp 2: `next/dynamic` với `{ ssr: false }`

### Ý tưởng
Đảm bảo tất cả components import three.js/mediapipe đều dùng `next/dynamic` với `{ ssr: false }` để server KHÔNG cố render chúng.

### Phân tích impact

**Phát hiện quan trọng: Hầu hết đã làm rồi!**

11/13 dynamic imports đã có `{ ssr: false }`:
- ✅ hinh-hoc, newton2, spring-hand, piston-assembly, r3f-sandbox, pendulum-hand
- ✅ aura, test-r3f, analytics, emotion, teacher/emotion-map

**Chỉ 2 pages thiếu protection:**

1. `app/(dashboard)/(routes)/dashboard/labtwin/labs/motion-gen/page.tsx`
   - Dòng 8: `import * as THREE from 'three'` — import trực tiếp, không dynamic

2. `app/(dashboard)/(routes)/dashboard/labtwin/labs/color-picker-3d/page.tsx`
   - Dòng 10: `import { HandLandmarker, ... } from '@mediapipe/tasks-vision'`
   - Dòng 11: `import * as THREE from 'three'` — cả 2 đều import trực tiếp

**Tuy nhiên,** cả 2 pages đều có `'use client'` + `export const dynamic = 'force-dynamic'`. Điều này nghĩa là:
- Server vẫn cần parse file để tạo client reference → vẫn load three.js server-side
- Nhưng chỉ khi user navigate tới page cụ thể đó, KHÔNG ảnh hưởng cold start trên "/"

**Fix cần làm:**
Refactor 2 pages này thành pattern: page.tsx (thin wrapper + dynamic import) → _LabComponent.tsx (actual code). Giống pattern đã dùng ở hinh-hoc, newton2, etc.

**Thêm vào đó — dead dependency:**
`deck.gl`, `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/react` đều installed nhưng **KHÔNG có page nào import**. Xóa khỏi package.json sẽ giảm ~2-3MB node_modules và giảm standalone build size.

### Verdict: ✅ LOW EFFORT, LOW-MEDIUM IMPACT

Nhanh, dễ làm, nhưng impact thấp vì chỉ 2 pages bị thiếu và chúng không ảnh hưởng cold start "/" request.

**Effort:** 30 phút
**Memory savings ước tính:** ~50-100MB (chỉ khi user navigate tới 2 pages đó)
**Khi nào nên làm:** Ngay lập tức (Phase 1) — rủi ro thấp, code quality tốt hơn

---

## Giải pháp 3: Giảm `force-dynamic` scope

### Ý tưởng
Hiện tại `export const dynamic = 'force-dynamic'` ở root layout (`app/layout.tsx:11`) → ép **toàn bộ 242 pages** phải SSR mỗi request. Giảm scope để chỉ pages thực sự cần dynamic mới bị force.

### Phân tích impact — ĐÂY LÀ GIẢI PHÁP QUAN TRỌNG NHẤT

**Tại sao `force-dynamic` ở root layout là vấn đề lớn:**

Khi `force-dynamic` áp dụng toàn app:
1. **Mỗi request** → Next.js phải render server-side, không dùng cache
2. **Cold start** → Next.js phải khởi tạo full SSR pipeline cho 242 routes
3. **Không có static pages** → không tận dụng được CDN/edge caching
4. Mỗi page load = full round-trip to server + SSR computation

**Nếu bỏ `force-dynamic` ở root layout:**
1. Next.js sẽ **statically generate** phần lớn pages tại build time
2. Cold start chỉ cần serve static HTML → gần như instant
3. Chỉ pages có data fetching mới cần SSR
4. Memory footprint giảm drastically

**Tại sao nó được thêm vào:**
```typescript
// Force all pages to be server-rendered at request time (no SSG)
// This prevents OOM during Docker build's "Collecting page data" phase
// where Next.js tries to pre-render 240+ pages in a memory-constrained container
```

Lý do: Docker build bị OOM khi Next.js cố pre-render 242 pages. Đây là fix tạm thời.

**Giải pháp thay thế tốt hơn:**

Thay vì `force-dynamic` toàn app, áp dụng selectively:

**Pages cần `force-dynamic` (có DB/auth data):** ~15 pages
- Auth pages: reset-password, login (cần session check)
- Admin: dashboard, competition
- Search: search route
- API routes: đã có `force-dynamic` riêng

**Pages KHÔNG cần dynamic (pure client hoặc static):** ~220+ pages
- Tất cả 68 labtwin labs (100% client component, no server data)
- Dashboard root, analytics, emotion, aura (client components)
- Profile, settings, notes, etc.
- Docs pages

**Cách triển khai:**

Bước 1: Xóa `export const dynamic = 'force-dynamic'` khỏi `app/layout.tsx`

Bước 2: Thêm `export const dynamic = 'force-dynamic'` vào từng page/layout cần:
```
app/(auth)/layout.tsx
app/admin/layout.tsx
app/(dashboard)/(routes)/search-disabled/page.tsx
```

Bước 3: Để tránh build OOM khi pre-render, có 2 cách:

**Cách A — Giữ `force-dynamic` ở dashboard layout thay vì root:**
```typescript
// app/(dashboard)/layout.tsx
export const dynamic = 'force-dynamic'
```
Scope thu hẹp: chỉ dashboard pages (93 pages) thay vì toàn bộ 242. Marketing pages, docs, auth pages sẽ static.

**Cách B — Dùng `generateStaticParams` trống + `dynamicParams`:**
Cho phép build không pre-render, nhưng cache sau first request:
```typescript
// Trong page files cần
export const dynamicParams = true
export async function generateStaticParams() {
  return [] // Don't pre-render, but allow ISR caching
}
```

**Cách C (Recommended) — Hybrid: static marketing + dynamic dashboard:**
```
app/layout.tsx             → BỎ force-dynamic (cho phép static)
app/(dashboard)/layout.tsx → THÊM force-dynamic (dashboard luôn SSR vì cần auth)
app/(auth)/layout.tsx      → THÊM force-dynamic (auth pages cần session)
app/(marketing)/layout.tsx → Để static (trang chủ, pricing, landing)
```

Kết quả: Trang chủ "/" load instant từ static HTML, dashboard pages vẫn SSR.

### Rủi ro và cách mitigate

**Rủi ro 1: Build OOM quay lại**
- Mitigate: Với `force-dynamic` ở dashboard layout, chỉ marketing/docs/auth pages bị pre-render (~30 pages thay vì 242)
- 30 pages pre-render dễ dàng trong 4GB Docker build memory

**Rủi ro 2: Một số pages thiếu data khi static**
- Mitigate: Tất cả 68 labtwin + 25 dashboard pages đều là `'use client'` → static render chỉ tạo empty shell + JS bundle reference
- Client-side sẽ fetch data bằng useSession, useEffect, etc.

### Verdict: 🔥 MEDIUM EFFORT, HIGHEST IMPACT

Đây là giải pháp nên ưu tiên số 1. Giảm cold start từ 4GB+ xuống ~500MB-1GB cho marketing pages (static), và dashboard pages vẫn hoạt động bình thường.

**Effort:** 2-4 giờ (refactor layout structure + test)
**Memory savings ước tính:** 2-3GB cho cold start trên "/" (vì static → không cần SSR)
**Khi nào nên làm:** Phase 1 — sau fix 2 pages thiếu dynamic import

---

## Tổng hợp: Thứ tự ưu tiên

| # | Giải pháp | Effort | Impact | Memory Saving | Ưu tiên |
|---|-----------|--------|--------|---------------|---------|
| 1 | Fix 2 pages thiếu `ssr: false` + xóa deck.gl | 30 phút | Low | ~50-100MB + build nhẹ hơn | **Làm ngay** |
| 2 | Giảm `force-dynamic` scope (hybrid approach) | 2-4 giờ | **Cao nhất** | 2-3GB cold start | **Ưu tiên #1** |
| 3 | Tách lab routes ra service riêng | 3-5 ngày | Medium | 500MB-1GB | Sau khi cần scale |

**Kết hợp 1+2 sẽ:**
- Giảm cold start memory từ 4.1GB → ~1-2GB
- Có thể hạ Cloud Run về 2-4Gi thay vì 8Gi
- Trang chủ "/" load gần như instant (static HTML)
- Dashboard pages vẫn cần warm-up nhưng chỉ ~93 routes thay vì 242

---

## Bonus: Quick wins bổ sung

1. **Xóa dead dependencies:** `deck.gl`, `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/react` → không page nào dùng
2. **`min-instances: 1`** nếu budget cho phép (~$5-10/ngày) → loại bỏ hoàn toàn cold start
3. **Prisma client eager init:** Khởi tạo PrismaClient ngay khi import module, không lazy → tránh spike memory khi first DB query
4. **Route group restructure:** Tách `(marketing)` route group cho "/", "/pricing", "/contact-sales" → static generate riêng
