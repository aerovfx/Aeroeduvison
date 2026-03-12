# 🎭 FACS Quick Reference

Tài liệu tham khảo nhanh về FACS (Facial Action Coding System) cho developers.

## 📊 13 Action Units đang được detect

| AU | Tên | Mô tả |
|----|-----|-------|
| AU1 | Inner brow raiser | Nhấc lông mày trong |
| AU2 | Outer brow raiser | Nhấc lông mày ngoài |
| AU4 | Brow lowerer | Cau mày |
| AU5 | Upper lid raiser | Mở mắt rộng |
| AU6 | Cheek raiser | Nâng má |
| AU7 | Lid tightener | Nhắm mắt |
| AU9 | Nose wrinkler | Nhăn mũi |
| AU12 | Lip corner puller | Kéo khóe miệng |
| AU15 | Lip corner depressor | Hạ khóe miệng |
| **AU17** | **Chin raiser** | **Nâng cằm** ✨ Mới |
| **AU20** | **Lip stretcher** | **Kéo dài môi** ✨ Mới |
| **AU23** | **Lip tightener** | **Siết môi** ✨ Mới |
| **AU26** | **Jaw drop** | **Hạ hàm** ✨ Mới |

## 😊 6 Emotions được detect

| Emotion | AUs | Threshold | Status |
|---------|-----|-----------|--------|
| **VUI_MỪNG** 😊 | AU6 + AU12 | > 30 | ✅ Đúng FACS |
| **BUỒN** 😢 | AU1 + AU4 + AU15 | > 20 | ✅ Đúng FACS |
| **NGẠC_NHIÊN** 😲 | AU1 + AU2 + AU5 + **AU26** | > 20-30 | ✅ Đã bổ sung AU26 |
| **TỨC_GIẬN** 😠 | AU4 + AU5 + AU7 + **AU23** | > 15-30 | ✅ Đã bổ sung AU23 |
| **SỢ_HÃI** 😨 | AU1 + AU2 + AU4 + AU5 + AU7 + **AU20** + **AU26** | > 15-25 | ✅ Đã bổ sung AU20, AU26 |
| **GHÉT_BỎ** 🤢 | AU9 + AU15 + **AU17** | > 15-20 | ✅ Đã bổ sung AU17 |

## 📍 MediaPipe Landmarks

| Landmark Index | Vị trí |
|----------------|--------|
| 70 | Left eyebrow |
| 300 | Right eyebrow |
| 159 | Left eye |
| 386 | Right eye |
| 4 | Nose tip |
| 13 | Mouth top |
| 14 | Mouth bottom |
| 61 | Mouth left |
| 291 | Mouth right |
| 18 | Chin (for AU17) |

## 💡 Insights từ RealEye

- **3 emotions phổ biến nhất** khi ngồi trước màn hình:
  1. Happy (Vui mừng) - Rất phổ biến
  2. Surprise (Ngạc nhiên) - Phổ biến
  3. Neutral (Trung tính) - Phổ biến nhất

- **Các emotions ít xuất hiện**: Anger, Sadness, Disgust, Fear

## 🔗 Links

- **Full Documentation**: `/docs/FACS_REFERENCE.md`
- **RealEye FACS**: https://www.realeye.io/features/online-webcam-facial-coding/facial-action-coding-system-facs

