# Kế hoạch: Tính năng Thực tế ảo / Thực tế tăng cường (AR/VR) cho LabTwin & Aura

> Lấy cảm hứng từ nút **"AR"** trong GeoGebra 3D Calculator (ảnh tham chiếu).
> Mục tiêu: cho học sinh đặt mô hình 3D Toán/Lý/Hoá lên mặt bàn/sàn thật qua camera điện thoại,
> đi quanh xem, phóng to thu nhỏ theo tỉ lệ thật — **áp dụng cho cả `labtwin` lẫn `Aura`**.

---

## ✅ Trạng thái triển khai (đã code)

Đã hiện thực **MVP cross-platform** theo đường "snapshot model → AR" (đáng tin trên iOS — nhóm user chính):

- **Module dùng chung** `aeroedu-vite/src/lib/ar/` + `src/components/ar/`:
  - `arCapabilities.ts` — phát hiện WebXR/iOS/desktop.
  - `exportModel.ts` — xuất cảnh THREE hiện tại → **GLB** (GLTFExporter) + **USDZ** (USDZExporter), nạp động, không thêm phụ thuộc npm.
  - `ensureModelViewer.ts` — nạp `<model-viewer>` từ CDN một lần, lazy.
  - `ARModelOverlay.tsx` — lớp phủ AR: Android→WebXR/Scene Viewer, iOS→Quick Look, Desktop→QR mở trên điện thoại.
  - `ARLaunchButton.tsx` — nút "AR" nổi góc khung (như GeoGebra), xuất model + mở overlay, báo lỗi mềm nếu cảnh không xuất được.
  - **`XRCanvas.tsx`** — drop-in thay `<Canvas>`: bắt `scene`, phủ nút AR. Đổi `<Canvas>`→`<XRCanvas>` là có AR.
- **Đã wire AR vào**:
  - LabTwin (6 lab R3F): `CircularMotion3D`, `GeometryUnfold`, `PeriodicTable`, `Chemistry`, `Aerodynamics`, `AirflowCFD`.
  - Aura (toàn bộ sim R3F): `SimBasics`, `SimPhysics`, `SimShaders`, `SimEclipse` — **mọi `<Canvas>` đều thành `<XRCanvas>`**.
  - Badge **"AR"** trên thẻ lab trong `LabsIndex` (5 lab đặt-được-trên-bàn).
  - *Loại trừ*: `SimFpvDrone` (flight sim, đã có VR riêng, AR đặt-bàn không phù hợp).
- **Cách hoạt động**: bấm AR → đóng băng cảnh hiện tại → GLB/USDZ → đặt lên mặt thật, chụm ngón phóng to, đi quanh xem.
- **Pha 2 — WebXR AR realtime (ĐÃ code)**: trên thiết bị hỗ trợ `immersive-ar` (Android Chrome/Quest),
  nút AR vào thẳng **AR realtime giữ tương tác** — cảnh R3F sống, animation/slider vẫn chạy:
  - `ARRealtimeController.tsx` (đặt trong `<Canvas>`): nghe `sessionstart/sessionend`, đo bounding box
    cảnh, **ẩn nền** (`scene.background = null`) để thấy camera thật, **dò mặt phẳng** bằng hit-test →
    hiện reticle tím, **chạm để đặt** (thu nhỏ cảnh về ~0.4m, đáy chạm sàn). Tận dụng fiber v8 tự
    truyền `XRFrame` vào `useFrame` — không thêm `@react-three/xr`.
  - `XRCanvas` bắt thêm `gl`, có `enterRealtimeAR()` (requestSession hit-test + dom-overlay + setSession)
    và nút **"✕ Thoát AR"** khi đang trong phiên.
  - `ARLaunchButton` tự dò `immersive-ar`: hỗ trợ → realtime trước, **lỗi/không hỗ trợ → tự fallback**
    sang đường model (GLB/USDZ/Quick Look/QR). iOS vẫn đi Quick Look như cũ.
- **Cử chỉ + tỉ lệ thật (ĐÃ code)**: sau khi đặt, **chụm 2 ngón để phóng to/thu nhỏ** (clamp 0.2×–6×),
  cảnh neo đáy tại điểm đã chọn. Badge **"📐 1 đơn vị ≈ N cm"** hiển thị tỉ lệ thật realtime (giống
  badge "1 : 1.33 cm" của GeoGebra) — `ARRealtimeController` báo `cmPerUnit` lên `XRCanvas` qua
  `onPlacedScale`.
- **Badge "AR" trên catalog Aura (ĐÃ code)**: mọi sim trong lưới `/dashboard/aura` (trừ FPV) gắn nhãn AR.
- **Hạn chế còn lại**: iOS vẫn là snapshot (Apple chưa mở WebXR AR); cảnh ShaderMaterial tuỳ biến có
  thể không xuất USDZ → degrade về xem 3D. Realtime + pinch chưa kiểm thử trên thiết bị thật (cần điện
  thoại Android có ARCore để xác nhận hit-test/placement/cử chỉ).

---

## 1. Phân tích tính năng AR của GeoGebra (từ ảnh)

Ảnh là **GeoGebra 3D Calculator** trên iPhone, đang dựng cảnh: hệ trục `x/y/z`, 2 mặt phẳng
(một nghiêng màu xanh ngọc + một nằm ngang màu xám), hàm `f`, và **giao tuyến** (đường cong xanh lá).
Các điểm cần học lại:

| Thành phần trong ảnh | Ý nghĩa | Tương đương trong AeroEdu |
|---|---|---|
| Nút **AR** (góc phải) | Vào chế độ AR: chiếu cảnh 3D lên thế giới thật qua camera | **Chưa có** → cần xây |
| Badge **"1 : 1.33 cm"** | Tỉ lệ thật: 1 đơn vị toán = 1.33 cm ngoài đời | Cần "scale calibration" trong AR |
| Công cụ: Mặt cầu, Mặt phẳng, **Giao của 2 đối tượng**, **Net** (trải hình), Điểm mới, Giao điểm, Trung điểm, Điểm thuộc | Dựng/đo đối tượng hình học | Đã có rời rạc (GeometryUnfold = "Net", GraphLab = đồ thị) — gom lại |

**Bản chất AR ở đây** = lấy nguyên cảnh 3D đang xem trên màn hình rồi:
1. Bật camera, **dò mặt phẳng thật** (hit-test) để đặt cảnh xuống bàn/sàn.
2. **Neo (anchor)** cảnh tại điểm chạm; người dùng đi vòng quanh, cảnh đứng yên trong không gian.
3. **Pinch để scale, kéo để di chuyển, xoay**; hiển thị tỉ lệ thật.

Đây chính là **WebXR `immersive-ar`** (Android/Quest) hoặc **AR Quick Look / Scene Viewer** (iOS/Android qua model 3D).

---

## 2. Hiện trạng codebase (điểm tựa sẵn có)

Stack 3D đã rất chín — **không phải xây từ đầu**:

- `@react-three/fiber@^8.18`, `@react-three/drei@^9.122`, `@react-three/postprocessing`, `three@^0.182`.
- **LabTwin** (`aeroedu-vite/src/pages/labs/`): các lab R3F dùng `<Canvas>` trực tiếp —
  `CircularMotion3D.tsx`, `GeometryUnfold.tsx` (đã là "Net"!), `PeriodicTable.tsx`, `AirflowCFD.tsx` (đã load `.glb/.gltf`), `Chemistry.tsx`, `Aerodynamics.tsx`.
  Catalog: `LabsIndex.tsx`. Route: `/dashboard/labtwin/...` trong `src/router/index.tsx`.
- **Aura** (`aeroedu-vite/src/pages/dashboard/Aura.tsx` + `r3f/`): `ALL_SIMS` gom từ
  `SimBasics / SimPhysics / SimShaders / SimFpvDrone / SimEclipse` (file `r3f/index.ts`). Route `/dashboard/aura/:simId`.
- **WebXR đã có khung mẫu**: `SimFpvDrone.tsx` đã làm `immersive-vr` thật —
  `navigator.xr.isSessionSupported`, `requestSession`, `gl.xr.enabled = true`, `gl.xr.setSession(session)`,
  nút "🥽 Vào VR" (dòng ~1251–1278). **Tái dùng đúng mẫu này cho `immersive-ar`.**
- **Camera/getUserMedia** đã dùng ở `usePostureMonitor`, `GestureSwarm`, `AssemblySim` → quyền camera + UX xin quyền đã quen.
- **App iOS native** (Capacitor) đang publish App Store → có đường bridge sang ARKit/Quick Look nếu cần.

**Thiếu**: chưa có `immersive-ar`, hit-test, chưa có `@react-three/xr`, chưa export GLB→USDZ, chưa có `<model-viewer>`.

---

## 3. Ma trận khả năng theo nền tảng (quyết định kiến trúc)

| Nền tảng | WebXR `immersive-ar` | Đường AR khả thi | Giữ tương tác realtime? |
|---|---|---|---|
| **Android Chrome** | ✅ Có | WebXR AR (hit-test + anchor) — **tái dùng nguyên cảnh R3F** | ✅ Đầy đủ |
| **Meta Quest / Vision Pro** | ✅ (passthrough AR) | WebXR AR/VR — như FpvDrone | ✅ |
| **iOS Safari (web)** | ❌ **Không hỗ trợ** | **AR Quick Look** (file `.usdz`) hoặc `<model-viewer>` | ❌ Chỉ xem mô hình tĩnh/animation |
| **iOS app AeroEdu (Capacitor)** | ❌ web, nhưng | Bridge **ARKit/Quick Look** native qua plugin, mở `.usdz` | ❌ Tĩnh (trừ khi viết RealityKit) |
| **Desktop** | ❌ | Fallback: nút AR ẩn, hiện QR "mở trên điện thoại" | — |

→ **Kết luận**: phải có **2 đường**:
- **Đường A — WebXR AR realtime** (Android/Quest): chiếu thẳng scene R3F sống → giữ trọn tương tác (slider, animation, giao tuyến động).
- **Đường B — Model AR (USDZ/GLB)** (iOS chủ yếu): export snapshot cảnh hiện tại ra GLB, convert USDZ, mở Quick Look. Mất tương tác nhưng chạy trên iPhone — đối tượng người dùng chính.

Một **nút "AR" duy nhất** tự phát hiện nền tảng và chọn đường phù hợp.

---

## 4. Kiến trúc đề xuất

### 4.1 Module dùng chung (mới)
Thư mục `aeroedu-vite/src/lib/ar/`:

```
src/lib/ar/
  capabilities.ts      // detect: hasWebXRAR, isIOS, isCapacitor, isMobile, isDesktop
  useWebXRAR.ts        // hook: enter/exit immersive-ar, hit-test reticle, anchor, scale
  exportSceneToGLB.ts  // GLTFExporter từ THREE.Scene hiện hành → Blob GLB
  usdzGateway.ts       // gọi BE convert GLB→USDZ, trả URL .usdz
```

Thư mục `aeroedu-vite/src/components/ar/`:

```
src/components/ar/
  ARLaunchButton.tsx   // 1 nút "AR" thông minh — chọn đường A/B/QR theo capability
  ARReticle.tsx        // vòng dò mặt phẳng (ring) khi hit-test
  ARHud.tsx            // overlay DOM trong AR: scale slider, recenter, thoát, badge "1 : x cm"
  ModelViewerAR.tsx    // wrapper <model-viewer> cho iOS/Android (usdz + glb)
  ARQrFallback.tsx     // desktop: QR + link mở trang trên điện thoại
```

### 4.2 Wrapper Canvas dùng chung — chìa khoá tích hợp cả LabTwin lẫn Aura
Tạo `aeroedu-vite/src/components/ar/XRCanvas.tsx` bọc `<Canvas>` của R3F:

```tsx
// Thay <Canvas> bằng <XRCanvas> ở mọi lab/sim muốn có AR.
// - Lưu ref tới gl (WebGLRenderer) + scene để export GLB.
// - Render <ARLaunchButton> overlay góc phải (giống vị trí GeoGebra).
// - Bật gl.xr khi vào WebXR; vẽ ARReticle + xử lý select đặt anchor.
<XRCanvas arEnabled glProps={{ antialias: true }}>
  {/* nội dung scene y như cũ: OrbitControls, lights, mesh... */}
</XRCanvas>
```

Nhờ đó **một thay đổi (Canvas → XRCanvas) là lab/sim đó có AR** — không sửa logic mô phỏng.

### 4.3 Backend GLB→USDZ (cho iOS)
- Endpoint `POST /api/ar/usdz` trong `server.cjs`: nhận GLB (multipart/base64) → trả `.usdz`.
- Convert bằng `usd_from_gltf` (Google, Docker) hoặc Apple `usdzconvert`, hoặc thư viện JS `three-usdz-exporter` chạy **client-side** (ưu tiên: không cần BE, không tốn Cloud Run).
  → **Ưu tiên client-side `three-usdz-exporter`** để né phụ thuộc hạ tầng; BE chỉ là phương án dự phòng.
- Lưu cache `.usdz` lên GCS bucket `aeroedu-media-...` (public read) để Quick Look fetch.

---

## 5. Tích hợp theo từng bề mặt

### 5.1 LabTwin (`/dashboard/labtwin/*`)
- **Ưu tiên các lab 3D có giá trị AR cao nhất**:
  1. `GeometryUnfold` — chính là "Net" trong ảnh GeoGebra; đặt khối đa diện lên bàn, trải hình trong AR → cực trực quan cho hình học không gian lớp 11–12.
  2. `CircularMotion3D` — quỹ đạo + hình chiếu lên 3 mặt phẳng, đứng giữa quan sát.
  3. `PeriodicTable` — mô hình nguyên tử/hạt nhân-electron đặt trên bàn.
  4. `Chemistry` (phân tử), `AirflowCFD` (dòng chảy quanh model — đã có GLB sẵn).
- Mỗi lab: đổi `<Canvas>` → `<XRCanvas arEnabled>`. Thêm cờ `ar: true` vào metadata lab trong `LabsIndex.tsx` để hiện badge **"AR"** trên thẻ catalog (+ QR sẵn có).

### 5.2 Aura (`/dashboard/aura/:simId`)
- Aura render sim qua `ALL_SIMS[id]`. Vì mỗi sim tự dựng `<Canvas>`, có 2 cách:
  - **(a) Per-sim**: đổi `<Canvas>`→`<XRCanvas>` trong từng `Sim*.tsx` (chuẩn, kiểm soát tốt). FpvDrone đã có VR sẵn → nâng cấp thêm `immersive-ar`.
  - **(b) Khung Aura chung**: thêm field `arEnabled?: boolean` vào `SimEntry` (`Aura.tsx` dòng ~24–33) và một nút AR ở khung viewer của Aura, áp cho các sim "đặt được trên bàn" (solar-system, water-molecule, pendulum, Newton's cradle, periodic...).
  → Khuyến nghị **(a)** cho sim phức tạp + **(b)** cho danh mục/UX nhất quán.
- Thêm danh mục **"AR-ready"** + badge trong lưới `SIMULATIONS` của Aura.

### 5.3 Một nút "AR" — UX thống nhất kiểu GeoGebra
- Vị trí: nổi góc phải vùng canvas (giống ảnh).
- Bấm → `capabilities.ts` quyết định:
  - WebXR AR → vào AR realtime + `ARReticle` + chạm để đặt + `ARHud` (slider scale, badge "1 : N cm", nút recenter & thoát).
  - iOS/không WebXR → export GLB → USDZ → mở `<model-viewer ar>` / Quick Look.
  - Desktop → `ARQrFallback` (QR mở chính URL này trên điện thoại).

---

## 6. Lộ trình triển khai (phân pha, đo được)

| Pha | Nội dung | Sản phẩm kiểm chứng | Ước lượng |
|---|---|---|---|
| **0. Spike** | Thử `immersive-ar` + hit-test trên 1 lab (GeometryUnfold) Android thật | Đặt khối lên bàn, đi quanh | 0.5–1 ngày |
| **1. Hạ tầng dùng chung** | `lib/ar/*` + `components/ar/*` + `XRCanvas` + `ARLaunchButton` capability detection | Nút AR hiện đúng theo thiết bị, desktop ra QR | 2–3 ngày |
| **2. WebXR AR realtime** | `useWebXRAR` (reticle, anchor, scale, recenter, DOM overlay) áp cho 3–4 lab labtwin | Android: đặt + scale + thoát mượt | 3–4 ngày |
| **3. Đường iOS (USDZ)** | `exportSceneToGLB` + `three-usdz-exporter` client-side + Quick Look + `<model-viewer>` | iPhone Safari mở mô hình AR từ lab | 2–3 ngày |
| **4. Phủ Aura** | `arEnabled` trong `SimEntry`, badge danh mục AR, nâng FpvDrone thêm AR, áp 5–6 sim | Aura có lưới "AR-ready", mở AR được | 2 ngày |
| **5. Tỉ lệ & đo đạc** | Badge "1 : N cm", pinch-scale chuẩn hoá, (tuỳ chọn) thước/annotation trong AR | Hiển thị tỉ lệ thật như GeoGebra | 2 ngày |
| **6. Native iOS (tuỳ chọn)** | Capacitor bridge Quick Look cho app App Store | App mở .usdz native | 1–2 ngày |

**MVP có thể ship** = Pha 1 + 2 + 3 (Android realtime + iOS USDZ) cho ~4 lab labtwin tiêu biểu, ~3–4 sim Aura.

---

## 7. Phụ thuộc cần thêm (`aeroedu-vite/package.json`)

- `@react-three/xr` (khớp R3F v8) — **hoặc** dùng trực tiếp `gl.xr` + `three/examples/jsm/webxr/*` (đỡ rủi ro version, theo đúng mẫu FpvDrone). → **Ưu tiên dùng `gl.xr` trực tiếp** để khỏi vướng peer-deps R3F v8/v9.
- `three-usdz-exporter` (client GLB/scene → USDZ) cho iOS.
- `@google/model-viewer` (web component `<model-viewer>` cho fallback iOS/Android).
- `GLTFExporter` lấy từ `three/examples/jsm/exporters/GLTFExporter.js` (đã có sẵn trong `three`).

---

## 8. Rủi ro & lưu ý

- **iOS không có WebXR AR** → bắt buộc đường USDZ; mô hình AR iOS **tĩnh** (chỉ animation pack sẵn, không slider realtime). Cần truyền thông UX rõ: "iPhone xem mô hình AR, Android tương tác trực tiếp".
- **HTTPS bắt buộc** cho WebXR + camera → production `inphysic.com` đã HTTPS, OK; dev cần `https`/ngrok.
- **Hiệu năng**: scene nặng (KG3D, CFD) khi vào AR phải hạ poly/tắt postprocessing (bloom) → thêm chế độ "AR-lite" trong `XRCanvas`.
- **Quyền camera**: tái dùng pattern xin quyền đã có; chặn double-prompt.
- **Tỉ lệ thật**: WebXR đặt theo mét; cần map "1 đơn vị toán = N cm" → tính `scale` và hiển thị badge.
- **Version R3F**: vite app v8, root v9 — chỉ đụng `gl.xr` (API Three thuần) để tránh xung đột `@react-three/xr`.
- **Không tăng bundle desktop**: lazy-load toàn bộ `lib/ar` + `model-viewer` chỉ khi bấm nút AR.

---

## 9. Định nghĩa "hoàn thành" (DoD)

- [ ] Nút "AR" xuất hiện trên lab/sim đã bật, đúng theo thiết bị (Android/iOS/desktop).
- [ ] Android: đặt được mô hình lên bàn, đi quanh, pinch scale, recenter, thoát.
- [ ] iOS Safari: mở mô hình trong AR Quick Look từ ≥1 lab và ≥1 sim Aura.
- [ ] Desktop: hiện QR mở trên điện thoại.
- [ ] Áp dụng tối thiểu 4 lab LabTwin + 4 sim Aura.
- [ ] Badge "AR" trong `LabsIndex` và lưới Aura.
- [ ] Lazy-load, không tăng bundle trang không dùng AR.

---

*Tài liệu kế hoạch — chưa chạm code mô phỏng. Bước tiếp theo: chốt phạm vi MVP (lab/sim nào trước) rồi vào Pha 0 spike.*
