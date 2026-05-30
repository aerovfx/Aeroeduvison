# iOS In-App Purchase (StoreKit) — Tích hợp & Runbook

Mục tiêu: bán gói đăng ký **ngay trong app iOS** qua Apple IAP (tuân thủ guideline 3.1.1),
ánh xạ vào hệ thống `FeatureEntitlement` hiện có. **Web vẫn dùng VietQR như cũ** — chỉ
nhánh iOS chuyển sang StoreKit.

> Quy tắc vàng: trên iOS (`isNative()`) **ẩn hoàn toàn** VietQR + mọi link thanh toán web
> (anti-steering). Trên web giữ nguyên QR.

---

## 1. Kiến trúc

```
iOS app                         server.cjs                     Apple
───────                         ──────────                     ─────
[Paywall StoreKit]
  fetch products  ───────────────────────────────────────────▶ App Store (giá, mô tả)
  user mua  ──────────────────────────────────────────────────▶ StoreKit xử lý
  nhận transaction (JWS)
  POST /api/iap/apple/verify ──▶ verify chữ ký JWS / App Store
                                  Server API → map productId→planId
                                  → grantPlan() cấp FeatureEntitlement
                                  → trả subscription mới ◀────────
  (gia hạn/huỷ/refund)                                  Apple gửi
                                ◀── POST /api/iap/apple/notifications  (App Store Server Notifications V2)
                                  → cập nhật/expire entitlement
```

- **Nguồn chân lý** vẫn là bảng `FeatureEntitlement` (đã có). IAP chỉ là 1 *nguồn cấp* mới
  bên cạnh activation code.
- Không cần activation code cho nhánh IAP — cấp entitlement trực tiếp theo `planId`.

---

## 2. Bản đồ Product ID ↔ Plan (chốt trước khi tạo trong App Store Connect)

Auto-renewable subscriptions. Đề xuất **1 Subscription Group / mỗi đối tượng** (để nâng/hạ
cấp trong cùng đối tượng là upgrade hợp lệ).

| Apple Product ID | Subscription Group | planId (DB hiện có) | Chu kỳ |
|---|---|---|---|
| `com.aeroedu.inphysic.teacher.basic.monthly` | AeroEdu Teacher | `basic-1m` | 1 tháng |
| `com.aeroedu.inphysic.teacher.pro.monthly` | AeroEdu Teacher | `pro-1m` | 1 tháng |
| `com.aeroedu.inphysic.teacher.pro.yearly` | AeroEdu Teacher | `pro-1y` | 1 năm |
| `com.aeroedu.inphysic.student.monthly` | AeroEdu Student | `student-1m` | 1 tháng |
| `com.aeroedu.inphysic.student.yearly` | AeroEdu Student | `student-1y` | 1 năm |
| `com.aeroedu.inphysic.parent.monthly` | AeroEdu Parent | `parent-1m` | 1 tháng |
| `com.aeroedu.inphysic.parent.yearly` | AeroEdu Parent | `parent-1y` | 1 năm |

- **`school-1y`** (gói Trường) **KHÔNG** bán qua IAP → giữ "Liên hệ tư vấn" (B2B, ngoài app). OK với 3.1.1.
- Bản đồ này sẽ nằm trong code config (`IAP_PRODUCT_PLAN_MAP`) — backend dùng để map khi verify.
- ⚠️ Product ID **không thể tái dùng** sau khi xoá — đặt đúng ngay từ đầu.

### Giá
Apple dùng *price points* riêng (có VND). Vì Apple ăn 15–30%, bạn có thể đặt giá iOS cao hơn
web để bù phí, hoặc giữ ngang và chấp nhận biên thấp hơn. Đặt trong App Store Connect cho từng sản phẩm.

---

## 3. Việc trên App Store Connect / Apple (⚠️ BẠN tự làm — đường găng, làm trước)

1. **Agreements, Tax, and Banking** → ký **Paid Applications Agreement**, nhập **thông tin
   ngân hàng** + **thuế**. *App không thể bán nếu chưa "Active".* (Mất 1–2 ngày.)
2. **Subscriptions** → tạo 3 Subscription Group + 7 sản phẩm theo bảng mục 2:
   - Reference Name, Product ID (đúng bảng), Duration, Price.
   - Localized display name + description (VI + EN) cho từng gói.
   - 1 ảnh review screenshot cho subscription (Apple yêu cầu).
3. **App Store Server API key**: Users and Access → Integrations → **In-App Purchase** key →
   tạo key `.p8`, ghi lại **Key ID** + **Issuer ID**. (Dùng để verify + nhận notifications.)
4. **App Store Server Notifications V2**: trong App Information → đặt **Production URL** =
   `https://inphysic.com/api/iap/apple/notifications` (và Sandbox URL cùng endpoint).
5. **Sandbox tester**: Users and Access → Sandbox → tạo 1 tài khoản test (email chưa từng
   dùng Apple ID) để thử mua trên thiết bị thật.

### Secrets nạp vào Cloud Run (KHÔNG paste key qua chat — dùng Secret Manager)
```
APPLE_IAP_KEY        = (nội dung .p8, mount như secret)   # giống cách làm APNs
APPLE_IAP_KEY_ID     = <Key ID của IAP key>
APPLE_IAP_ISSUER_ID  = <Issuer ID>
APPLE_IAP_BUNDLE_ID  = com.aeroedu.inphysic
APPLE_IAP_ENV        = sandbox            # đổi 'production' khi live
```

---

## 4. Việc code (tôi làm)

### 4.1 Backend (`server.cjs` + `lib/entitlements.cjs`)
- `entitlements.cjs`: thêm `grantPlan(userKey, planId, { expiresAt, source, txnId })` — cấp
  thẳng entitlement theo plan, không cần code. (Tái dùng `listFeaturesForPlan`.)
- `POST /api/iap/apple/verify` — nhận `{ transactionId | signedTransaction }` từ app →
  verify JWS bằng App Store Server API → map productId→planId → `grantPlan` → trả subscription.
- `POST /api/iap/apple/notifications` — webhook V2: `DID_RENEW`/`EXPIRED`/`REFUND`/`REVOKE`
  → gia hạn / thu hồi entitlement.
- Lib verify: `lib/apple-iap.cjs` (verify signedPayload JWS chain x5c, gọi App Store Server API).

### 4.2 Frontend ✅ ĐÃ XONG (Phase B)
- `lib/capacitor/iap.ts` — wrapper plugin **`cordova-plugin-purchase`** v13 (CdvPurchase, StoreKit 2)
  qua **global `window.CdvPurchase`** (KHÔNG import npm → web bundle không phình, no-op trên browser):
  `initIap()` đăng ký 7 product + gắn `approved → POST /iap/apple/verify {transactionId} → finish`,
  `buyPlan(planId)` (Promise resolve khi server cấp quyền), `restorePurchases()`, `getProductInfo()`.
- `pages/payment/Pricing.tsx` — khi `isIapAvailable()`: hiện giá thật từ StoreKit + nút **"Mua qua App Store"**
  gọi `buyPlan()` (thay `POST /payment/orders`); gói B2B `school-1y` → "Liên hệ tư vấn" (KHÔNG mở
  thanh toán ngoài → tuân Apple 3.1.1). Thêm nút **"Khôi phục giao dịch đã mua"** (Apple bắt buộc).
- BE `POST /api/iap/apple/verify` nhận **`transactionId` HOẶC `signedTransaction`** (CdvPurchase cấp
  transactionId tin cậy; có key → hỏi App Store Server API authoritative).

> ⏳ Còn lại (khi build app iOS trên máy Mac): cài plugin native + `cap sync` (mục 4.3),
> rồi test sandbox trên thiết bị thật (mục 5). FE đã sẵn sàng — products tạo xong là chạy.

### 4.3 Plugin (làm khi build iOS — chưa chạy trong worktree này)
```bash
cd aeroedu-vite && npm i cordova-plugin-purchase --legacy-peer-deps
npx cap sync ios   # nạp plugin vào project Xcode → window.CdvPurchase khả dụng trong WKWebView
```
> Phải bật **In-App Purchase capability** trong Xcode (Signing & Capabilities) cho target App.

---

## 5. Test (sandbox, trên thiết bị thật — KHÔNG chạy trên simulator)
1. Đăng xuất Apple ID thật trên máy test (Settings → App Store), KHÔNG đăng nhập sandbox ở đây.
2. Cài app qua TestFlight/Xcode → mở paywall → mua → iOS hỏi đăng nhập → dùng **sandbox tester**.
3. Kiểm: entitlement được cấp (`/payment/my-subscription` trả gói mới), gia hạn nhanh
   (sandbox 1 tháng ≈ 5 phút), huỷ → expire.
4. Kiểm webhook nhận `DID_RENEW`/`EXPIRED` → DB cập nhật.

---

## 6. Thứ tự triển khai đề xuất
1. **(BẠN)** Bắt đầu mục 3.1 (Agreement + banking) NGAY — đây là đường găng nhiều ngày.
2. **(BẠN)** Tạo 7 sản phẩm mục 3.2.
3. **(TÔI)** Code backend grantPlan + verify + notifications + FE paywall/gating (làm song song, không chờ Apple).
4. **(BẠN)** Tạo App Store Server API key + sandbox tester → nạp secrets.
5. **(CẢ HAI)** Test sandbox trên thiết bị → sửa → bump build → submit kèm IAP.

> Lưu ý review: khi submit bản có IAP, Apple review CẢ sản phẩm IAP → cần screenshot paywall +
> sản phẩm ở trạng thái "Ready to Submit". Đính kèm vào cùng app version.
