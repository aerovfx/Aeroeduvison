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
cd desktop-current-app
bun install
```

2. Chay desktop mode (development):
```bash
bun run dev
```

Desktop app se mo ung dung tren port tu dong (mac dinh 3100).

3. Neu dung Rust auth-service cung desktop (chay `bun run rust:all` tu thu muc goc repo): auth-service dang dung **Option A** (local, khong TLS) qua `AUTH_DATABASE_INSECURE_LOCAL=1` trong script. Dam bao `DATABASE_URL` trong thu muc goc co the ket noi (Postgres local hoac URL co `sslmode=disable`).

## Ghi chu
- Wrapper nay chi boc app hien tai, khong them API moi, khong doi UI/feature.
- Neu can dung port khac, sua `webUrl` trong script hoac truyen `DESKTOP_WEB_URL` cho Electron.
