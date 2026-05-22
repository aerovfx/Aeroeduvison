# Kế hoạch sách AR (Augmented Reality) cho mobile — "AeroAR"

> Sách giấy tích hợp AR — HS quét trang sách bằng phone/tablet → nhân vật
> Aero, mô hình 3D khoa học, animation hiện ra tương tác trực tiếp.
>
> Inspiration: Quiver, AR Flashcards, 4DKids — nhưng tối ưu hoá cho thị
> trường VN với giá phải chăng + nội dung GDPT 2018.

---

## 1. CORE EXPERIENCE — User journey

```
1. PH mua sách AR (giấy in 4 màu)
2. Download app "AeroAR" (iOS/Android free)
3. Mở app → tap "Quét trang"
4. Hướng camera vào trang sách có icon AR
5. Mô hình 3D, animation, audio hiện ra trên màn hình
   • Quay xung quanh để xem 360°
   • Tap mô hình để nghe Aero giải thích
   • Chơi mini-game tương tác (drag-drop, tap)
6. Hoàn thành activity → unlock badge sticker
   (in lên thẻ sticker tặng kèm sách)
```

---

## 2. NỘI DUNG 6 BỘ SÁCH AR (mỗi bộ 30-40 marker)

### Bộ 1: **"AeroAR — Khám Phá Cơ Thể"** (6-10 tuổi)
- 40 trang × 35 marker AR
- Mô hình 3D: tim đập, phổi thở, dạ dày tiêu hoá, não suy nghĩ
- Animation: máu chảy qua mạch, thức ăn đi qua ruột
- Mini-game: ghép cơ quan vào đúng vị trí trên cơ thể
- Audio: Aero giải thích từng cơ quan bằng tiếng VN

### Bộ 2: **"AeroAR — Hệ Mặt Trời"** (8-12 tuổi)
- 32 trang × 25 marker
- 8 hành tinh 3D quay quanh Mặt trời, tỷ lệ thật
- Animation: nhật thực, nguyệt thực, sao chổi
- Mini-game: đặt hành tinh đúng thứ tự, lái tàu vũ trụ qua đường ray
- Audio: âm thanh thực của không gian (NASA recordings)

### Bộ 3: **"AeroAR — Động Vật Việt Nam"** (4-8 tuổi)
- 36 trang × 40 marker
- 40 con động vật VN (voọc, gấu trúc đỏ, sao la, rùa Hoàn Kiếm...)
- Animation: di chuyển + tiếng kêu thực
- Activity: chụp selfie với Aero + động vật (AR camera)
- Tích hợp WWF Vietnam: số liệu bảo tồn

### Bộ 4: **"AeroAR — Lịch Sử Việt Nam"** (9-12 tuổi)
- 48 trang × 30 marker
- Tái dựng 3D: Đông Sơn, thành Cổ Loa, trống đồng quay 360°
- Animation: chiến thắng Bạch Đằng, Aero kể chuyện
- Mini-game: thời trang triều đại (chọn áo đúng triều)
- Có chữ Hán Nôm + bản dịch khi tap

### Bộ 5: **"AeroAR — Thí Nghiệm Vật Lí"** (10-14 tuổi)
- 40 trang × 32 marker
- Mô phỏng thí nghiệm an toàn: mạch điện, con lắc, dao động
- Slider tương tác: đổi điện trở → xem dòng điện thay đổi
- Liên kết với LabTwin trên inphysic.com (full sim)

### Bộ 6: **"AeroAR — Anh Văn Vui"** (6-10 tuổi)
- 50 trang × 60 marker
- Vocab 200 từ với animation chuyên dùng
- Aero phát âm chuẩn American/British accent
- Mini-game: nghe từ → tap đúng object trên trang
- Speech recognition: HS đọc, app chấm điểm

---

## 3. STACK KỸ THUẬT

### App mobile (React Native + AR SDK)
- **React Native** 0.79+ với new architecture
- **AR**: ARKit (iOS) + ARCore (Android) qua bridge native
- **3D Engine**: Three.js + react-three-fiber + expo-three
- **Marker detection**: Vuforia hoặc 8thwall (free tier 100k views/tháng)
- **TTS**: ElevenLabs Vietnamese voice (offline cache)
- **Audio**: Howler.js
- **Analytics**: Mixpanel

### Backend (mở rộng inphysic.com hiện tại)
- API `/api/ar/books` — metadata books + downloadable assets
- CDN GCS bucket: `aeroedu-ar-assets` lưu .glb 3D + .mp3 audio
- User progress sync qua existing `UserProfile.kidProgress` JSONB
- Subscription tier "AeroAR Family" 99k/tháng

### Authoring tool cho team:
- **Spark AR Studio** (Meta) — free tool tạo AR effects
- **Adobe Aero** (Adobe) — drag-drop AR design
- **Custom React tool** cho marker → asset mapping

---

## 4. ROADMAP 12 THÁNG

### Q1: MVP + Bộ 3 (Động vật VN)
- Build React Native app shell với 1 demo marker
- Hoàn thành Bộ 3 — 36 trang × 40 marker
- Test với 30 trẻ + phụ huynh
- Pilot in 500 bản

### Q2: Bộ 1 + 2 (Cơ thể + Hệ Mặt trời)
- Hoàn thành 2 bộ ưu tiên giáo dục
- Beta release app trên TestFlight + Internal Testing
- Marketing TikTok video demo AR

### Q3: Bộ 4 + 5 (Lịch sử + Vật lí)
- Tích hợp với LabTwin trên web (deep link app → web sim)
- Subscription "AeroAR Family"
- Partnership 50 trường tiểu học HCM-HN

### Q4: Bộ 6 + Mobile launch
- Bộ Anh Văn với speech recognition
- Public launch App Store + Google Play
- Booth Hội sách Quốc tế

---

## 5. NGÂN SÁCH

### Cost per book (avg 35 marker):
- 3D modeling 35 assets × 3tr = 105tr
- Animation 20 cái × 2tr = 40tr
- Audio TTS + mixing = 20tr
- Mini-game programming = 30tr
- Marker tracking config = 15tr
- In sách 1000 bản = 25tr
- **Tổng: 235tr/quyển**

### Tổng 6 bộ: 6 × 235tr = **1.41 tỷ**

### App development:
- 2 RN senior dev × 6 tháng × 60tr = 720tr
- 1 native iOS + 1 Android dev × 3 tháng = 360tr
- 1 designer mobile 12 tháng = 360tr
- **Subtotal: 1.44 tỷ**

### Infrastructure + others:
- Backend infrastructure 12 tháng = 60tr
- Vuforia/8thwall license = 100tr
- Marketing + launch event = 150tr
- **Subtotal: 310tr**

### **TỔNG: ~3.16 tỷ trong 12 tháng**

### Doanh thu dự kiến:
- Bán sách: 6 bộ × 2000 bản × 250k = **3 tỷ**
- Subscription AR Family: 2000 user × 99k × 12 = **2.4 tỷ**
- B2B trường: 100 trường × 10tr = **1 tỷ**
- Sponsor (Samsung VN, NXB) = **500 triệu**
- **Tổng: ~6.9 tỷ — ROI 2.2x năm đầu**

---

## 6. RỦI RO

| Rủi ro | Mức | Giảm thiểu |
|--------|-----|-----------|
| 8thwall pricing tăng | Trung | Build inhouse marker tracking |
| AR không ổn định trên Android cũ | Cao | Min spec Android 9+ + fallback 2D |
| Phụ huynh không tải app | Trung | Sticker reward + onboarding video |
| Sách + app desync | Cao | OTA update content qua CDN |
| Bản quyền 3D animals | Cao | Tự sản xuất + WWF partnership |

---

## 7. KPI

- 100% sách AR có app rating ≥ 4.5⭐
- ≥ 70% trẻ scan marker ít nhất 5 lần/quyển
- ≥ 40% phụ huynh resubscribe AeroAR Family tháng 2
- 50 trường partner cuối năm
- Top 5 Education category App Store VN

---

## 8. BƯỚC TIẾP THEO

1. Tuần 1: Spike technical — test ARKit/ARCore với 3D Aero model
2. Tuần 2-3: Decide Vuforia vs 8thwall vs Custom
3. Tuần 4: Hire 2 RN dev + 1 3D artist
4. Tháng 2-3: Pilot 5 marker đầu tiên + bản in test
5. Quyết định scale sau pilot user testing

*Cập nhật: 2026-05-22*
