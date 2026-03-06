# 📚 FACS (Facial Action Coding System) Reference

Tài liệu tham khảo về FACS dựa trên [RealEye FACS Documentation](https://www.realeye.io/features/online-webcam-facial-coding/facial-action-coding-system-facs) và nghiên cứu của Paul Ekman.

## 🎯 Tổng quan

FACS (Facial Action Coding System) là hệ thống cho phép định lượng và đo lường các chuyển động trên khuôn mặt. Hệ thống này được phát triển bởi:
- **Carl-Herman Hjortsjö** (Swedish anatomist) - Người phát triển ban đầu
- **Paul Ekman và Wallace V. Friesen** (1978) - Áp dụng và phát triển
- **Cập nhật 2002** - Phiên bản cải tiến

## 😊 7 Cảm xúc phổ quát

Theo nghiên cứu của Ekman, có 7 cảm xúc phổ quát:
1. **Fear** (Sợ hãi)
2. **Anger** (Tức giận)
3. **Sadness** (Buồn bã)
4. **Disgust** (Ghét bỏ)
5. **Contempt** (Khinh thường)
6. **Surprise** (Ngạc nhiên)
7. **Enjoyment/Happiness** (Vui mừng)

> **Lưu ý**: Ngay cả người khiếm thị cũng thể hiện các biểu cảm này một cách tự nhiên, chứng tỏ đây là bản năng, không phải học được.

## 📊 Action Units (AUs) - 28 AUs chính

| AU | Tên FACS | Mô tả |
|----|----------|-------|
| 1 | Neutral face | Khuôn mặt trung tính |
| 2 | Inner brow raiser | Nhấc lông mày trong |
| 3 | Outer brow raiser | Nhấc lông mày ngoài |
| 4 | Brow lowerer | Cau mày |
| 5 | Upper lid raiser | Mở mắt rộng |
| 6 | Cheek raiser | Nâng má |
| 7 | Lid tightener | Nhắm mắt |
| 8 | Lips toward each other | Môi hướng vào nhau |
| 9 | Nose wrinkler | Nhăn mũi |
| 10 | Upper lip raiser | Nâng môi trên |
| 11 | Nasolabial deepener | Sâu rãnh mũi-môi |
| 12 | Lip corner puller | Kéo khóe miệng |
| 13 | Sharp lip puller | Kéo môi sắc |
| 14 | Dimpler | Tạo lúm đồng tiền |
| 15 | Lip corner depressor | Hạ khóe miệng |
| 16 | Lower lip depressor | Hạ môi dưới |
| 17 | Chin raiser | Nâng cằm |
| 18 | Lip pucker | Chu môi |
| 19 | Tongue show | Thè lưỡi |
| 20 | Lip stretcher | Kéo dài môi |
| 21 | Neck tightener | Căng cổ |
| 22 | Lip funneler | Môi hình phễu |
| 23 | Lip tightener | Siết môi |
| 24 | Lip pressor | Ép môi |
| 25 | Lips part | Mở môi |
| 26 | Jaw drop | Hạ hàm |
| 27 | Mouth stretch | Kéo dài miệng |
| 28 | Lip suck | Hút môi |

## 🎭 Cường độ Action Units

Mỗi AU có thể có các cường độ khác nhau:

| Cường độ | Mô tả |
|----------|-------|
| **A** | Trace - Tối thiểu có thể phát hiện |
| **B** | Slight - Nhẹ |
| **C** | Marked/Pronounced - Rõ ràng |
| **D** | Severe/Extreme - Nghiêm trọng |
| **E** | Maximum - Tối đa |

### Ký hiệu bổ sung:

- **R** - Chỉ xảy ra ở bên phải khuôn mặt
- **L** - Chỉ xảy ra ở bên trái khuôn mặt
- **U** - Xảy ra ở một bên nhưng không xác định bên nào
- **A** - Xảy ra cả hai bên nhưng mạnh hơn ở một bên

## 😊 Mapping Emotions → Action Units

Theo FACS manual và các nghiên cứu (như [ResearchGate FACS configurations](https://www.researchgate.net/figure/Facial-action-coding-system-FACS-codes-can-be-used-to-describe-the-facial-configuration_fig5_341478545)), các cảm xúc được mã hóa như sau:

| Emotion | Action Units | Mô tả | Facial Configuration |
|---------|--------------|-------|---------------------|
| **Surprise** | 1+2+5B+26 | Neutral + Inner brow + Slight upper lid + Jaw drop | Mắt mở rộng, lông mày nhấc, miệng mở |
| **Sadness** | 1+4+15 | Neutral + Brow lowerer + Lip corner depressor | Lông mày cau, khóe miệng hạ xuống |
| **Happiness** | 6+12 | Cheek raiser + Lip corner puller | Má nâng, khóe miệng kéo lên (cười) |
| **Fear** | 1+2+4+5+7+20+26 | Multiple AUs: brows, eyes, mouth | Lông mày nhấc và cau, mắt mở rộng, miệng kéo dài |
| **Disgust** | 9+15+17 | Nose wrinkler + Lip corner depressor + Chin raiser | Nhăn mũi, khóe miệng hạ, cằm nâng |
| **Contempt** | R12A+R14A | Right side lip corner puller + Dimpler | Khóe miệng phải kéo lên nhẹ, lúm đồng tiền |
| **Anger** | 4+5+7+23 | Brow lowerer + Upper lid + Lid tightener + Lip tightener | Lông mày cau, mắt mở rộng và siết, môi siết |

### Ví dụ: Surprise

Surprise bao gồm:
- **1** - Neutral face (baseline)
- **2** - Inner brow raiser (lông mày trong nhấc lên)
- **5B** - Slight upper lid raiser (mắt mở rộng nhẹ)
- **26** - Jaw drop (hàm hạ xuống)

**Cấu hình khuôn mặt**: Mắt mở rộng, lông mày cong lên, miệng mở hình chữ O.

## 🎨 Facial Configurations (Cấu hình khuôn mặt)

FACS codes mô tả **cấu hình khuôn mặt** (facial configuration) - cách các cơ mặt kết hợp để tạo ra biểu cảm. Mỗi cấu hình là một tổ hợp các Action Units.

### Cấu hình cơ bản:

#### 1. **Neutral Face (Khuôn mặt trung tính)**
- **AUs**: Không có AUs hoạt động
- **Mô tả**: Khuôn mặt ở trạng thái nghỉ, không có biểu cảm

#### 2. **Happy Face (Khuôn mặt vui)**
- **AUs**: AU6 + AU12
- **Cấu hình**: Má nâng lên (AU6) + Khóe miệng kéo lên (AU12)
- **Visual**: Nụ cười tự nhiên với mắt hẹp lại

#### 3. **Sad Face (Khuôn mặt buồn)**
- **AUs**: AU1 + AU4 + AU15
- **Cấu hình**: Lông mày trong nhấc (AU1) + Lông mày cau (AU4) + Khóe miệng hạ (AU15)
- **Visual**: Lông mày hình chữ V, miệng hơi hạ xuống

#### 4. **Surprised Face (Khuôn mặt ngạc nhiên)**
- **AUs**: AU1 + AU2 + AU5B + AU26
- **Cấu hình**: Lông mày nhấc (AU1+2) + Mắt mở rộng (AU5B) + Hàm hạ (AU26)
- **Visual**: Mắt tròn, lông mày cong, miệng mở

#### 5. **Angry Face (Khuôn mặt tức giận)**
- **AUs**: AU4 + AU5 + AU7 + AU23
- **Cấu hình**: Lông mày cau (AU4) + Mắt mở rộng (AU5) + Mắt siết (AU7) + Môi siết (AU23)
- **Visual**: Lông mày cau, mắt mở to, môi mím chặt

#### 6. **Fearful Face (Khuôn mặt sợ hãi)**
- **AUs**: AU1 + AU2 + AU4 + AU5 + AU7 + AU20 + AU26
- **Cấu hình**: Nhiều AUs kết hợp - lông mày nhấc và cau, mắt mở rộng, miệng kéo dài
- **Visual**: Lông mày nhấc và cau, mắt mở to, miệng kéo dài

#### 7. **Disgusted Face (Khuôn mặt ghét bỏ)**
- **AUs**: AU9 + AU15 + AU17
- **Cấu hình**: Nhăn mũi (AU9) + Khóe miệng hạ (AU15) + Cằm nâng (AU17)
- **Visual**: Mũi nhăn, miệng hạ, cằm nâng

### Cấu hình phức tạp:

Một số cảm xúc có **cấu hình phức tạp** với nhiều AUs:

- **Fear**: 7 AUs (AU1+2+4+5+7+20+26)
- **Anger**: 4 AUs (AU4+5+7+23)
- **Surprise**: 4 AUs (AU1+2+5B+26)

### Cấu hình đơn giản:

Một số cảm xúc có **cấu hình đơn giản** với ít AUs:

- **Happiness**: 2 AUs (AU6+12)
- **Sadness**: 3 AUs (AU1+4+15)
- **Disgust**: 3 AUs (AU9+15+17)

## 🎯 Implementation trong dự án

### AUs hiện đang được detect (13 AUs):

1. **AU1** - Inner brow raiser (Nhấc lông mày trong)
2. **AU2** - Outer brow raiser (Nhấc lông mày ngoài)
3. **AU4** - Brow lowerer (Cau mày)
4. **AU5** - Upper lid raiser (Mở mắt rộng)
5. **AU6** - Cheek raiser (Nâng má)
6. **AU7** - Lid tightener (Nhắm mắt)
7. **AU9** - Nose wrinkler (Nhăn mũi)
8. **AU12** - Lip corner puller (Kéo khóe miệng)
9. **AU15** - Lip corner depressor (Hạ khóe miệng)
10. **AU17** - Chin raiser (Nâng cằm) ✨ Mới
11. **AU20** - Lip stretcher (Kéo dài môi) ✨ Mới
12. **AU23** - Lip tightener (Siết môi) ✨ Mới
13. **AU26** - Jaw drop (Hạ hàm) ✨ Mới

### Emotions được detect (6 emotions - Đã cập nhật đầy đủ):

1. **VUI_MỪNG** 😊: AU6 + AU12 ✅
2. **BUỒN** 😢: AU1 + AU4 + AU15 ✅
3. **NGẠC_NHIÊN** 😲: AU1 + AU2 + AU5 + **AU26** ✨ (Đã bổ sung)
4. **TỨC_GIẬN** 😠: AU4 + AU5 + AU7 + **AU23** ✨ (Đã bổ sung)
5. **SỢ_HÃI** 😨: AU1 + AU2 + AU4 + AU5 + AU7 + **AU20** + **AU26** ✨ (Đã bổ sung)
6. **GHÉT_BỎ** 🤢: AU9 + AU15 + **AU17** ✨ (Đã bổ sung)

## 💡 Insights từ RealEye

Theo [RealEye research](https://www.realeye.io/features/online-webcam-facial-coding/facial-action-coding-system-facs):

### ⚠️ Hạn chế khi ngồi trước màn hình:

- Khi ngồi trước màn hình, người dùng **ít khi thể hiện** các cảm xúc như:
  - Anger (Tức giận)
  - Sadness (Buồn bã)
  - Disgust (Ghét bỏ)
  - Fear (Sợ hãi)

- Các cảm xúc **phổ biến nhất** khi ngồi trước màn hình:
  - **Happiness** (Vui mừng) - Rất phổ biến
  - **Surprise** (Ngạc nhiên) - Phổ biến
  - **Neutral** (Trung tính) - Phổ biến nhất

### 🎯 RealEye chỉ detect 3 emotions:

1. **Happy** - Khi má nâng và khóe miệng kéo lên (AU6 + AU12)
2. **Surprise** - Khi lông mày nhấc, mắt mở rộng, hàm hạ (AU1+2+5+26)
3. **Neutral** - Không có chuyển động khuôn mặt

> **Lý do**: Để đảm bảo độ chính xác cao và tránh false positives từ "resting face" (khuôn mặt nghỉ ngơi).

## 📈 Sampling Rate

- **RealEye**: 30 Hz (mỗi 30ms)
- **Dự án hiện tại**: Real-time với requestAnimationFrame (~60 FPS)

## 🔧 Technical Notes

### MediaPipe Face Landmarks

MediaPipe Face Mesh cung cấp 468 landmarks trên khuôn mặt. Các landmarks quan trọng cho FACS:

- **Eyebrows**: 70 (left), 300 (right)
- **Eyes**: 159 (left), 386 (right)
- **Nose**: 4 (tip)
- **Mouth**: 13 (top), 14 (bottom), 61 (left), 291 (right)
- **Chin**: 18 (chin bottom, for AU17)

### Tính toán AUs từ landmarks:

```typescript
// Ví dụ: AU1 (Inner brow raiser)
const browRaise = Math.abs(leftEyebrow.y - leftEye.y);

// Ví dụ: AU12 (Lip corner puller)
const mouthCornerPull = (mouthRight.y + mouthLeft.y) / 2 - noseTip.y;
```

## 📚 Tài liệu tham khảo

1. **FACS Manual** - Hơn 500 trang mô tả tất cả AUs
2. **Paul Ekman Group** - [https://www.paulekman.com/](https://www.paulekman.com/)
3. **RealEye FACS** - [https://www.realeye.io/features/online-webcam-facial-coding/facial-action-coding-system-facs](https://www.realeye.io/features/online-webcam-facial-coding/facial-action-coding-system-facs)

## 🚀 Cải thiện tương lai

### Có thể mở rộng:

1. **Thêm nhiều AUs hơn** (hiện tại 9, có thể lên 28)
2. **Cải thiện accuracy** với machine learning models
3. **Detect intensity levels** (A, B, C, D, E)
4. **Asymmetric detection** (R, L, U, A)
5. **Head movement codes** - Theo dõi chuyển động đầu
6. **Eye movement codes** - Theo dõi chuyển động mắt

### Best Practices:

1. **Calibration** - Calibrate cho từng người dùng (như RealEye)
2. **Filter resting face** - Tránh false positives
3. **Context awareness** - Xem xét ngữ cảnh (đang nói, đang ăn, etc.)
4. **Temporal smoothing** - Làm mượt dữ liệu theo thời gian

---

**Last updated**: 2025-01-27  
**Based on**: RealEye FACS Documentation, Paul Ekman's FACS Manual

