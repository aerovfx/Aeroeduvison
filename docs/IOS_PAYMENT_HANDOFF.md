# 🍎 iOS Payment (Apple IAP) — HANDOFF cho session mới

> **Đọc file này trước.** Tóm tắt toàn bộ trạng thái thanh toán in-app iOS để
> một session mới (không có ngữ cảnh cũ) tiếp tục được ngay. Runbook chi tiết:
> `docs/IOS_IAP_INTEGRATION.md`.

---

## 0. Bối cảnh 1 dòng
App iOS (Capacitor, bundle `com.aeroedu.inphysic`) publish lên App Store →
bán gói đăng ký số → **bắt buộc** qua Apple In-App Purchase (StoreKit 2),
KHÔNG được dùng VietQR/thanh toán ngoài (Apple Guideline 3.1.1).

## 1. Đã làm xong (đã commit + push, branch `claude/elated-khayyam-41c9ed`)

### Backend (đã deploy `pixiai-00664-woj`)
- **`lib/apple-iap.cjs`** — verify giao dịch StoreKit 2:
  - `IAP_PRODUCT_PLAN_MAP`: 7 product → plan (xem mục 3).
  - `verifyTransaction({ signedTransaction | transactionId })` → có key thì gọi
    App Store Server API authoritative; không key (sandbox) thì decode JWS.
  - `decodeNotification()` cho App Store Server Notifications V2.
  - `isConfigured()` = đủ KEY_ID + ISSUER_ID + PRIVATE_KEY.
- **`server.cjs`** (khối payment ~dòng 1166):
  - `POST /api/iap/apple/verify` (cần đăng nhập) → verify → `entitlements.grantPlan(userKey, planId, {source:'apple-iap', txnId, expiresAt})`.
  - `GET /api/iap/apple/products` (public) → map product/plan/giá + `configured`.
  - `POST /api/iap/apple/notifications` → REFUND/REVOKE→revoke, DID_RENEW/SUBSCRIBED→grant.
  - Verify live đã chạy: `/products` 200 (7 gói, `configured:false`), `/verify` 401 khi chưa login.

### Frontend (commit `59fde1b` — **CHƯA deploy**, 1/5)
- **`aeroedu-vite/src/lib/capacitor/iap.ts`** (MỚI) — wrapper `cordova-plugin-purchase`
  v13 (CdvPurchase) **qua global `window.CdvPurchase`** (KHÔNG import npm → web
  không phình, no-op trên browser). API: `isIapAvailable()`, `initIap()`,
  `buyPlan(planId)`, `restorePurchases()`, `getProductInfo(planId)`,
  `planIsIapEligible()`, `PLAN_PRODUCT_MAP`.
- **`aeroedu-vite/src/pages/payment/Pricing.tsx`** — khi `isIapAvailable()`:
  giá thật StoreKit + nút "Mua qua App Store" gọi `buyPlan()` (thay `/payment/orders`),
  nút "Khôi phục giao dịch đã mua", gói B2B `school-1y` → "Liên hệ tư vấn".
- **`docs/IOS_IAP_INTEGRATION.md`** — runbook đầy đủ (mục 4.2 đánh dấu ✅ XONG).

## 2. CÒN LẠI (việc của session mới + việc của thầy)

### CODE (làm trên máy Mac có Xcode — chưa làm được trong worktree headless này)
1. `cd aeroedu-vite && npm i cordova-plugin-purchase --legacy-peer-deps && npx cap sync ios`
2. Mở Xcode → target App → Signing & Capabilities → **+ In-App Purchase**.
3. **Kiểm caveat JWS**: trong `iap.ts > verifyOnServer()` mình đoán field JWS ở
   `nativePurchase.{jwsRepresentation|signedTransaction|transactionReceipt}`. Khi
   test thật, `console.log(t.nativePurchase)` để xác nhận tên field StoreKit2 thực
   tế của plugin v13 → chỉnh lại nếu khác (BE vẫn chạy chỉ với `transactionId` nếu
   đã cấu hình key, nên không chặn).
4. Test sandbox trên **thiết bị thật** (KHÔNG simulator) — mục 5 runbook.
5. Khi OK → deploy (`./deploy-cloudbuild.sh && gcloud run services update-traffic pixiai --region=asia-southeast1 --to-latest`).

### THẦY (phía Apple — đường găng, làm trước, KHÔNG ai khác làm hộ được)
- Ký **Paid Apps agreement** + nhập banking + tax (App Store Connect → Agreements).
- Tạo **7 In-App Purchase products** đúng Product ID ở mục 3, loại Auto-Renewable
  Subscription, đặt giá, điền metadata + screenshot review → trạng thái "Ready to Submit".
- Tạo **App Store Server API key** (.p8) + lấy **Key ID** + **Issuer ID**.
- Tạo **Sandbox tester** (Users and Access → Sandbox).
- Nạp secrets vào Cloud Run service `pixiai` qua **Secret Manager** (⚠️ **KHÔNG bao giờ
  paste .p8 hay key qua chat** — dùng `gcloud secrets` / Console):
  `APPLE_IAP_ENV=production`, `APPLE_IAP_BUNDLE_ID=com.aeroedu.inphysic`,
  `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_PRIVATE_KEY` (nội dung .p8)
  hoặc `APPLE_IAP_PRIVATE_KEY_PATH` (mount file).
- Cấu hình **App Store Server Notifications V2** URL →
  `https://inphysic.com/api/iap/apple/notifications`.

## 3. Bản đồ Product ID ↔ Plan (CHỐT — tạo y hệt trên App Store Connect)
| Product ID | planId |
|---|---|
| `com.aeroedu.inphysic.teacher.basic.monthly` | `basic-1m` |
| `com.aeroedu.inphysic.teacher.pro.monthly` | `pro-1m` |
| `com.aeroedu.inphysic.teacher.pro.yearly` | `pro-1y` |
| `com.aeroedu.inphysic.student.monthly` | `student-1m` |
| `com.aeroedu.inphysic.student.yearly` | `student-1y` |
| `com.aeroedu.inphysic.parent.monthly` | `parent-1m` |
| `com.aeroedu.inphysic.parent.yearly` | `parent-1y` |

> `school-1y` (B2B): **KHÔNG** bán qua IAP → trên app hiện "Liên hệ tư vấn".

## 4. Cách verify nhanh (không cần Apple)
```bash
curl -s https://inphysic.com/api/iap/apple/products | head    # 200, 7 gói, configured:false
curl -s -X POST https://inphysic.com/api/iap/apple/verify     # 401 (chưa login)
```
Build FE: `cd aeroedu-vite && npm run build` (vite/esbuild — lỗi tsc ở file cũ KHÔNG chặn build).

## 5. Quy ước dự án (nhắc lại)
- Deploy cadence: **5 commit mới deploy** (trừ khi thầy nói "deploy", hoặc bug critical).
  Sau mỗi commit cập nhật dòng `Commits since last deploy: N/5` trong `CLAUDE.md`.
- Commit tiếng Việt, footer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- KHÔNG paste secret/khoá Apple qua chat. KHÔNG tạo tài khoản hộ. Mã định danh HS không hiển thị UI.
- Stack: FE `aeroedu-vite/` (Vite), BE `server.cjs` (Express ~16k dòng), Cloud Run `pixiai` @ asia-southeast1.
