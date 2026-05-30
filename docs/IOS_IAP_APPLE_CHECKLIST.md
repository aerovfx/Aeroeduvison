# ✅ Checklist Apple IAP — từng bước để test mua trên TestFlight

> Dành cho **thầy** thao tác trên App Store Connect (ASC) + Apple Developer.
> Code đã sẵn sàng (xem `IOS_PAYMENT_HANDOFF.md`). File này là phần **việc của Apple**
> + phối hợp deploy. Làm **theo thứ tự** — bước 1 là đường găng (chờ Apple 1–2 ngày).
>
> Bundle ID: `com.aeroedu.inphysic` · Domain: `inphysic.com` · Cloud Run: `pixiai`
> (project `extreme-lattice-491123-p2`, region `asia-southeast1`).

---

## ⏱️ Thứ tự ưu tiên (tóm tắt)
1. **Ký Paid Applications Agreement + banking + tax** ← LÀM NGAY (chờ Apple duyệt 1–2 ngày).
2. Tạo **3 Subscription Group + 7 product** (có thể làm song song khi chờ agreement).
3. Tạo **App Store Server API key** (.p8) + Key ID + Issuer ID.
4. **Nạp secret** vào Cloud Run → Claude wire deploy + merge PR #3 + deploy.
5. Tạo **Sandbox tester** + cấu hình **Notifications V2 URL**.
6. **Build lại TestFlight** từ code có plugin (bản đang test là bản CŨ, chưa có plugin).
7. **Test mua** bằng sandbox tester trên thiết bị thật.

---

## Bước 1 — Paid Applications Agreement (ĐƯỜNG GĂNG, làm trước)
ASC → **Business** (hoặc **Agreements, Tax, and Banking**):
- [ ] Ký **Paid Applications Agreement** (Master Agreement).
- [ ] Nhập **Bank Account** (tài khoản nhận tiền).
- [ ] Nhập **Tax forms** (thuế).
- [ ] Chờ trạng thái chuyển **"Active"** (thường 1–2 ngày). **App KHÔNG bán được IAP nếu chưa Active.**

## Bước 2 — Tạo 7 In-App Purchase products
ASC → app **AeroEdu (com.aeroedu.inphysic)** → **Subscriptions** (Monetization).

Tạo **3 Subscription Group** (để nâng/hạ cấp trong cùng nhóm là hợp lệ):
- [ ] Group **AeroEdu Teacher**
- [ ] Group **AeroEdu Student**
- [ ] Group **AeroEdu Parent**

Trong mỗi group, tạo product **Auto-Renewable Subscription** — **Product ID phải GÕ ĐÚNG TUYỆT ĐỐI** (không sửa lại được sau khi tạo):

| Product ID | Group | Chu kỳ | Gói (planId) | Giá web tham khảo |
|---|---|---|---|---|
| `com.aeroedu.inphysic.teacher.basic.monthly` | Teacher | 1 tháng | basic-1m | 99.000đ |
| `com.aeroedu.inphysic.teacher.pro.monthly` | Teacher | 1 tháng | pro-1m | 249.000đ |
| `com.aeroedu.inphysic.teacher.pro.yearly` | Teacher | 1 năm | pro-1y | 2.490.000đ |
| `com.aeroedu.inphysic.student.monthly` | Student | 1 tháng | student-1m | 49.000đ |
| `com.aeroedu.inphysic.student.yearly` | Student | 1 năm | student-1y | 490.000đ |
| `com.aeroedu.inphysic.parent.monthly` | Parent | 1 tháng | parent-1m | (theo bảng giá) |
| `com.aeroedu.inphysic.parent.yearly` | Parent | 1 năm | parent-1y | (theo bảng giá) |

> Gói **Trường `school-1y`**: KHÔNG bán qua IAP (B2B) → app hiện "Liên hệ tư vấn". Bỏ qua.

Mỗi product điền:
- [ ] **Reference Name** (nội bộ) + **Product ID** (đúng bảng) + **Duration**.
- [ ] **Subscription Price** (chọn price point có VND — Apple ăn 15–30%, có thể đặt cao hơn web để bù phí).
- [ ] **Localized display name + description** (tiếng Việt; thêm English nếu muốn).
- [ ] **1 ảnh review screenshot** (Apple bắt buộc cho mỗi subscription).
- [ ] Đưa trạng thái về **"Ready to Submit"**.

> ⚠️ Sandbox/StoreKit chỉ trả product khi product đã ở trạng thái hợp lệ + agreement Active.
> Nếu product chưa sẵn, paywall trong app sẽ trống giá / không mua được.

## Bước 3 — App Store Server API key (.p8)
ASC → **Users and Access** → **Integrations** → **In-App Purchase** (App Store Server API):
- [ ] **Generate** key mới → tải file **`AuthKey_XXXXXX.p8`** (chỉ tải được 1 lần — cất kỹ).
- [ ] Ghi lại **Key ID** (hiện cạnh key).
- [ ] Ghi lại **Issuer ID** (ở đầu trang Keys).

> Key này dùng để **verify giao dịch** (bắt buộc — StoreKit 1 không có JWS) **và** ký xác thực.
> **KHÔNG dán nội dung `.p8` qua chat.** Key ID + Issuer ID thì gửi Claude được.

## Bước 4 — Nạp secret vào Cloud Run
Sau khi có file `.p8`, chạy (ở thư mục chứa file):
```bash
# 1) Tạo secret từ file .p8
gcloud secrets create apple-iap-private-key \
  --project=extreme-lattice-491123-p2 \
  --replication-policy=automatic \
  --data-file=AuthKey_XXXXXX.p8

# 2) Cấp quyền đọc cho service account runtime của pixiai
SA=$(gcloud run services describe pixiai --region=asia-southeast1 \
  --project=extreme-lattice-491123-p2 \
  --format='value(spec.template.spec.serviceAccountName)')
gcloud secrets add-iam-policy-binding apple-iap-private-key \
  --project=extreme-lattice-491123-p2 \
  --member="serviceAccount:${SA}" \
  --role=roles/secretmanager.secretAccessor
```
- [ ] Secret `apple-iap-private-key` tồn tại + đã grant accessor.
- [ ] Gửi Claude **Key ID** + **Issuer ID** → Claude sửa `deploy-cloudbuild.sh`:
  - `--update-secrets` thêm `APPLE_IAP_PRIVATE_KEY=apple-iap-private-key:latest`
  - `--update-env-vars` thêm `APPLE_IAP_KEY_ID=<…>,APPLE_IAP_ISSUER_ID=<…>,APPLE_IAP_BUNDLE_ID=com.aeroedu.inphysic,APPLE_IAP_ENV=sandbox`
- [ ] Claude **merge PR #3** + **deploy** → kiểm `GET /api/iap/apple/products` trả **`configured: true`**.

> Khi lên production thật (App Store công khai): đổi `APPLE_IAP_ENV=production` và deploy lại.
> TestFlight = môi trường **sandbox** nên giữ `sandbox` trong giai đoạn test.

## Bước 5 — App Store Server Notifications V2
ASC → app → **App Information** (hoặc General → App Store Server Notifications):
- [ ] **Production Server URL** = `https://inphysic.com/api/iap/apple/notifications`
- [ ] **Sandbox Server URL** = `https://inphysic.com/api/iap/apple/notifications` (cùng endpoint)
- [ ] Version = **Version 2**.

> Dùng để gia hạn/refund/hết hạn tự động cập nhật quyền (đã xử lý trong code, map user qua
> originalTransactionId).

## Bước 6 — Sandbox tester
ASC → **Users and Access** → **Sandbox** → **Testers**:
- [ ] Tạo 1 tài khoản test với **email CHƯA TỪNG dùng cho Apple ID** (có thể dùng alias `+sandbox`).
- [ ] Nhớ mật khẩu — sẽ đăng nhập khi mua thử.

## Bước 7 — Build lại TestFlight (bản hiện tại CHƯA có plugin)
Bản TestFlight đang test build **trước** khi cài plugin → `window.CdvPurchase` không tồn tại
→ paywall không hiện nút "Mua qua App Store". Cần build lại từ code hiện tại (đã `cap sync`):
```bash
cd aeroedu-vite
npm run build        # web assets mới (đã có paywall + plugin wrapper)
npx cap sync ios     # nạp dist + plugin vào project iOS
```
Rồi tăng build number → **Archive** (Xcode hoặc xcodebuild) → upload TestFlight.
> Claude có thể chạy `xcodebuild archive` + export trên máy này nếu cần (cần signing cert/profile
> Distribution đã có trong Xcode). Hoặc thầy archive trong Xcode Organizer như các build trước.

## Bước 8 — Test mua (sandbox, thiết bị THẬT — không simulator)
1. Trên iPhone test: **Settings → App Store → đăng xuất** Apple ID thật (KHÔNG đăng nhập sandbox ở đây).
2. Cài app qua **TestFlight** (bản mới ở bước 7) → mở trang **Nâng cấp/Pricing**.
3. Bấm **"Mua qua App Store"** → iOS hỏi đăng nhập → dùng **sandbox tester** (bước 6).
4. Kiểm:
   - [ ] Paywall hiện **giá thật từ StoreKit** (không phải giá web) → chứng tỏ product load OK.
   - [ ] Sau khi mua, gọi `/api/iap/apple/verify` **thành công** → entitlement được cấp
     (kiểm `GET /api/payment/my-subscription` trả gói mới).
   - [ ] (Tuỳ) Safari **Web Inspector** xem log `[iap] nativePurchase keys:` để xác nhận field.
5. **Gia hạn nhanh** (sandbox 1 tháng ≈ 5 phút): chờ → kiểm Notifications V2 `DID_RENEW` → quyền kéo dài.
6. **Huỷ/refund** trong ASC → kiểm `EXPIRED`/`REFUND` → quyền bị thu hồi.

> Nếu mua xong báo lỗi xác thực: kiểm `configured:true` (bước 4) + product đã Ready + agreement Active.

## Bước 9 — Submit review (khi test xong)
- [ ] Đính kèm **7 product IDs** (Ready to Submit) vào **cùng app version** khi submit.
- [ ] Thêm **screenshot paywall** + ghi chú reviewer cách thấy paywall.
- [ ] Apple review **cả app lẫn product IAP** trong cùng lượt.

---

## Việc của Claude (đã/đang/ sẽ)
- ✅ Plugin native + `cap sync` (SPM) + build simulator BUILD SUCCEEDED — trên `main`.
- ✅ Verify StoreKit 1 robust + log field + map gia hạn/refund qua originalTransactionId — **PR #3**.
- ⏳ Khi có secret + Key ID/Issuer ID: wire `deploy-cloudbuild.sh` + merge PR #3 + deploy → `configured:true`.
- ⏳ (Tuỳ chọn) chạy `xcodebuild archive` build TestFlight mới.
