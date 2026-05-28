# Hướng dẫn build iOS app — AeroEduVision

## Tổng quan

Project dùng **Capacitor** wrap toàn bộ React/Vite app trong native iOS shell.
Code 100% reuse từ web — chỉ thêm native plugin (push, camera, deep-link) qua bridge.

**Roadmap đầy đủ:** `/Users/pixidev/.claude/plans/lazy-snuggling-gadget.md` (5 phase, ~14 tuần).

**Trạng thái hiện tại:**
- ✅ Phase 0 — PWA foundation (manifest, SW, icons)
- 🔄 Phase 1 — Capacitor setup (config + env detection + CORS done; `cap add ios` cần làm trên macOS có Xcode)
- ⏳ Phase 2 — Native plugins
- ⏳ Phase 3 — MediaPipe iOS tuning
- ⏳ Phase 4 — Offline mode
- ⏳ Phase 5 — App Store submission

---

## Yêu cầu môi trường dev iOS

- macOS 12+ với Xcode 15+
- Cocoapods (`sudo gem install cocoapods`)
- Apple Developer account ($99/năm cho App Store distribute)
- Bundle ID: **`com.aeroedu.inphysic`** (đã đăng ký ở `capacitor.config.ts`)

---

## Bước build lần đầu

```bash
# Tất cả Capacitor command chạy trong aeroedu-vite/ (nơi có package.json + config)
cd aeroedu-vite

# 1. Build Vite SPA
npm run build         # output → aeroedu-vite/dist/

# 2. Add iOS platform (chỉ làm 1 lần)
npx cap add ios       # tạo aeroedu-vite/ios/App/App.xcodeproj + Podfile

# 3. Install CocoaPods dependencies
cd ios/App && pod install && cd ../..

# 4. Sync web assets → native bundle
npx cap sync ios

# 5. Mở Xcode → chọn target device → Run
npx cap open ios
```

---

## Build cho subsequent rounds

```bash
# Mỗi lần edit code FE:
cd aeroedu-vite
npm run build
npx cap sync ios      # cập nhật dist + native plugins
npx cap open ios      # nếu muốn mở Xcode
```

---

## Test trên thiết bị thật

1. Cắm iPhone vào Mac qua USB-C
2. Trong Xcode → Window → Devices and Simulators → trust device
3. Bấm Run (▶) → Xcode build + install IPA → app khởi động trên iPhone
4. Lần đầu cần Settings → General → VPN & Device Management → trust developer cert

---

## Push to TestFlight (Phase 5)

```bash
# 1. Update version
# Xcode → App target → General → Identity → Version: 1.0.0, Build: 1

# 2. Product → Archive (Cmd-Shift-B + chọn Generic iOS Device)
# 3. Window → Organizer → Distribute App → App Store Connect → Upload
# 4. App Store Connect → TestFlight → add tester emails
```

---

## Phase tiếp theo — plugins cần install (Phase 2)

```bash
npm install --save \
  @capacitor/push-notifications \
  @capacitor/camera \
  @capacitor/filesystem \
  @capacitor/share \
  @capacitor/haptics \
  @capacitor-community/biometric-auth

npx cap sync ios
```

Sau mỗi `npm install` plugin → bắt buộc `npx cap sync` để link native code.

---

## Trouble-shooting

| Vấn đề | Giải pháp |
|---|---|
| `pod install` fail | `cd ios/App && pod repo update && pod install` |
| Xcode build "no provisioning profile" | Settings → Accounts → add Apple ID → Signing & Capabilities → "Automatically manage signing" |
| WKWebView không load `/api` | Kiểm `capacitor.config.ts` server.allowNavigation + server CORS đã accept `capacitor://localhost` |
| Cookie không persist | Verify `withCredentials: true` ở Axios + server CORS `Access-Control-Allow-Credentials: true` |
| MediaPipe wasm load fail | Verify `cdn.jsdelivr.net` trong allowNavigation list |
| Splash stuck | `npx cap sync ios` rồi rebuild — splash config trong `capacitor.config.ts` cần re-sync |

---

## File quan trọng

| Path | Mục đích |
|---|---|
| `capacitor.config.ts` | App ID, scheme, allowNavigation, plugin config |
| `aeroedu-vite/public/manifest.json` | PWA manifest cho Safari + Android |
| `aeroedu-vite/public/icons/` | 11 icons (favicon + apple-touch + maskable) |
| `aeroedu-vite/src/lib/pwa-register.ts` | Service Worker registration (skip Capacitor) |
| `aeroedu-vite/src/services/api.ts` | `resolveBaseUrl()` — switch giữa web `/api` và native `https://inphysic.com/api` |
| `server.cjs` (CORS block) | Allow `capacitor://localhost` origin với credentials |
| `ios/` | (sẽ tạo sau `cap add ios`) — Xcode project native |

---

## Liên hệ

- Plan gốc: `/Users/pixidev/.claude/plans/lazy-snuggling-gadget.md`
- Repo: github.com/aerovfx/Aeroeduvison
- Apple bundle ID: `com.aeroedu.inphysic`

---

## Push Notifications setup (Phase 2 — cần làm thủ công)

Pipeline đã code sẵn (FE register token + backend lưu DeviceToken + sendPush
helper). Để KÍCH HOẠT cần 3 bước thủ công:

### 1. Bật capability trong Xcode
- Mở `App.xcodeproj` → target App → **Signing & Capabilities**
- **+ Capability** → **Push Notifications**
- Xcode tự thêm entitlement `aps-environment` + bật Push trên App ID

### 2. Tạo APNs Auth Key (.p8) trên Apple portal
- https://developer.apple.com/account/resources/authkeys → **+**
- Tick **Apple Push Notifications service (APNs)** → Register
- **Download** file `AuthKey_XXXXXX.p8` (CHỈ tải được 1 lần!) → lưu an toàn
- Ghi lại **Key ID** (10 ký tự) + **Team ID** (CGT5VR25M3)

### 3. Cấu hình server (env vars)
Trên Cloud Run service `pixiai`, set:
```
APNS_KEY_PATH=/path/to/AuthKey_XXXXXX.p8   # hoặc mount qua Secret Manager
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=CGT5VR25M3
APNS_BUNDLE_ID=com.aeroedu.inphysic
APNS_PRODUCTION=true                        # false cho TestFlight/dev
```
Cài lib: `npm i @parse/node-apn` trong root server.

### Test
- App login trên device → tự xin quyền push → token gửi `/api/devices/register`
- Gọi `global.sendPush(userId, { title, body, route })` từ bất kỳ chỗ nào
  trong server.cjs (vd khi GV publish đề thi, assignment due) → push tới HS.

### Tích hợp gợi ý (chỗ gọi sendPush)
- GV publish đề thi → push HS trong lớp: "Đề thi mới: {tên}"
- Assignment sắp deadline (cron) → "Bài tập {tên} còn 1 ngày"
- Chat message mới → "{người gửi}: {preview}"
