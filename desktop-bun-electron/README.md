# Desktop Bun + Electron App

Skeleton desktop app theo kiến trúc:
- Main process: Electron + Bun tooling + SQLite + IPC
- Renderer: React + Zustand + Three.js
- Storage local: SQLite metadata + user cache/models directory

## 1) Cài dependencies

```bash
cd /Users/pixibox/Aeroeduvison/desktop-bun-electron
bun install
```

## 2) Chạy dev

```bash
bun run dev
```

Sẽ chạy đồng thời:
- Vite renderer tại `http://localhost:5173`
- Bun build watch cho `electron/main.ts` và `electron/preload.ts`
- Electron app desktop

## 3) Build production

```bash
bun run build
bun run start
```

## 4) Điểm tích hợp API thật

File: `electron/main.ts`
- IPC `generation:start` hiện đang mock progress (`setTimeout`).
- Thay bằng call thật tới fal.ai Trellis/Hunyuan:
  - đọc `settings.engine`
  - gọi API
  - cập nhật `progress/status/modelPath` vào SQLite và gửi event `generation:progress`

## 5) Thành phần chính

- `electron/main.ts`: app lifecycle, BrowserWindow, file dialog, SQLite, settings, IPC
- `electron/preload.ts`: expose API an toàn qua `contextBridge`
- `src/App.tsx`: UI upload/prompt/history/settings
- `src/components/ModelViewer.tsx`: 3D viewer placeholder với Three.js
- `src/store/useAppStore.ts`: state management bằng Zustand
