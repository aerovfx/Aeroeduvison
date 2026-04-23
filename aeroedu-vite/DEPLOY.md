# AeroEduVision Vite — Deployment Guide

## Kiến trúc hiện tại (Phase 9)

```
Browser
  └─► CDN / Cloud Run (aeroedu-vite :8080)   ← SPA Vite (React)
        └─► Next.js BFF (pixiai :3000)        ← API, Auth, Prisma/DB
              └─► Neon PostgreSQL             ← Database
              └─► Anthropic / Gemini API      ← AI models
              └─► Rust aero-backend :8090     ← (khi ready)
```

**Note:** Next.js được giữ làm BFF (Backend For Frontend) vì đang chứa:
244 API routes, NextAuth/OAuth, Prisma + Neon PostgreSQL.

## Env Vars

| Biến                       | Dev                          | Production                                 |
|----------------------------|------------------------------|--------------------------------------------|
| `VITE_API_URL`             | `http://localhost:3000`      | `https://pixiai-s7mvhtkngq-as.a.run.app`  |
| `VITE_WS_URL`              | `ws://localhost:3000`        | `wss://pixiai-s7mvhtkngq-as.a.run.app`    |
| `VITE_RUST_BACKEND_URL`    | `http://localhost:8090`      | *(khi Rust backend deploy)*               |
| `VITE_TRACKING_SERVER_URL` | `ws://localhost:8080/ws`     | `wss://pixiai-s7mvhtkngq-as.a.run.app/ws` |
| `VITE_PYTHON_API_URL`      | `http://localhost:8000`      | *(khi Python server deploy)*              |

VITE_ vars được bake vào bundle lúc build — phải truyền đúng giá trị production.

## Build & Scripts

```bash
npm run dev          # Dev server port 3001, proxy /api → Next.js :3000
npm run build        # Production build (nhanh, không check TS)
npm run build:check  # Build + TypeScript check (dùng trong CI)
npm run type-check   # Chỉ check TypeScript
npm run build && open stats.html  # Bundle analysis
```

## Option 1: Firebase Hosting (Khuyến nghị cho SPA)

```bash
cp .env.production .env.local && npm run build
firebase deploy --only hosting
```

## Option 2: Docker + Cloud Run

```bash
docker build \
  --build-arg VITE_API_URL=https://pixiai-s7mvhtkngq-as.a.run.app \
  --build-arg VITE_WS_URL=wss://pixiai-s7mvhtkngq-as.a.run.app \
  -t asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aeroedu/aeroedu-vite:latest .

docker push asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aeroedu/aeroedu-vite:latest

gcloud run deploy aeroedu-vite \
  --image asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aeroedu/aeroedu-vite:latest \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 256Mi --cpu 1
```

## Option 3: Cloudflare Pages (CDN tốt nhất cho VN)

```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name aeroedu-vite
```

## Lighthouse Checklist (trước release)

- [ ] Performance >= 90 (LCP < 2.5s)
- [ ] Accessibility >= 95
- [ ] `npm run build` → kiểm tra stats.html, chunk > 500KB cần lazy thêm
- [ ] Camera/microphone hoạt động trên hand tracking, emotion labs
- [ ] WebSocket kết nối được Next.js BFF

## Labs Migration Status

4/57 labs đã port sang Vite native:
✅ aerodynamics, chemistry-lab, circuit-simulator, fluid-dynamics-2d

53 labs còn lại → fallback qua NextJsFallback.tsx (iframe Next.js).
Ưu tiên port: labs không MediaPipe → Three.js thuần → MediaPipe/camera.
