# Desktop Wrapper cho Aeroeduvision (khong nang cap tinh nang)

Muc tieu: dong goi ung dung web hien tai thanh desktop app bang Electron, khong thay doi logic app.

## Cau truc
- `electron/main.ts`: cua so desktop, load web app hien tai
- `electron/preload.ts`: bridge toi renderer (toi thieu)
- `scripts/dev.ts`: chay Next dev + Electron
- `scripts/start.ts`: chay Next start + Electron

## Su dung
1. Cai dependencies cho wrapper:
```bash
cd /Users/pixibox/Aeroeduvison/desktop-current-app
bun install
```

2. Chay desktop mode (development):
```bash
bun run dev
```

Desktop app se mo ung dung hien tai tren `http://127.0.0.1:3000`.

## Ghi chu
- Wrapper nay chi boc app hien tai, khong them API moi, khong doi UI/feature.
- Neu can dung port khac, sua `webUrl` trong script hoac truyen `DESKTOP_WEB_URL` cho Electron.
