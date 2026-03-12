# 🎨 FACS Facial Configurations

Tài liệu về **cấu hình khuôn mặt** (facial configurations) sử dụng FACS codes, dựa trên nghiên cứu từ [ResearchGate](https://www.researchgate.net/figure/Facial-action-coding-system-FACS-codes-can-be-used-to-describe-the-facial-configuration_fig5_341478545) và FACS manual.

## 📋 Tổng quan

**Facial Configuration** là cách mô tả biểu cảm khuôn mặt bằng cách kết hợp các Action Units (AUs). Mỗi cấu hình đại diện cho một trạng thái cảm xúc hoặc biểu cảm cụ thể.

## 🎭 7 Cấu hình cảm xúc cơ bản

### 1. 😊 Happiness (Vui mừng)

**FACS Code**: `6+12`

**Action Units**:
- **AU6**: Cheek raiser (Nâng má)
- **AU12**: Lip corner puller (Kéo khóe miệng)

**Cấu hình**:
```
Má nâng lên → Tạo nếp nhăn quanh mắt
Khóe miệng kéo lên → Tạo nụ cười
```

**Visual Description**: Nụ cười tự nhiên với mắt hẹp lại, má phồng lên

---

### 2. 😢 Sadness (Buồn bã)

**FACS Code**: `1+4+15`

**Action Units**:
- **AU1**: Inner brow raiser (Nhấc lông mày trong)
- **AU4**: Brow lowerer (Cau mày)
- **AU15**: Lip corner depressor (Hạ khóe miệng)

**Cấu hình**:
```
Lông mày trong nhấc lên → Tạo hình chữ V
Lông mày cau lại → Tạo nếp nhăn giữa lông mày
Khóe miệng hạ xuống → Miệng hơi hạ
```

**Visual Description**: Lông mày hình chữ V, miệng hơi hạ xuống

---

### 3. 😲 Surprise (Ngạc nhiên)

**FACS Code**: `1+2+5B+26`

**Action Units**:
- **AU1**: Neutral face (baseline)
- **AU2**: Inner brow raiser (Nhấc lông mày trong)
- **AU5B**: Slight upper lid raiser (Mở mắt rộng nhẹ)
- **AU26**: Jaw drop (Hạ hàm)

**Cấu hình**:
```
Lông mày nhấc lên → Cong lên
Mắt mở rộng → Tròn hơn bình thường
Hàm hạ xuống → Miệng mở hình chữ O
```

**Visual Description**: Mắt tròn, lông mày cong, miệng mở hình chữ O

---

### 4. 😠 Anger (Tức giận)

**FACS Code**: `4+5+7+23`

**Action Units**:
- **AU4**: Brow lowerer (Cau mày)
- **AU5**: Upper lid raiser (Mở mắt rộng)
- **AU7**: Lid tightener (Siết mắt)
- **AU23**: Lip tightener (Siết môi)

**Cấu hình**:
```
Lông mày cau lại → Tạo nếp nhăn giữa lông mày
Mắt mở rộng và siết → Mắt trợn
Môi siết lại → Môi mím chặt
```

**Visual Description**: Lông mày cau, mắt mở to và siết, môi mím chặt

---

### 5. 😨 Fear (Sợ hãi)

**FACS Code**: `1+2+4+5+7+20+26`

**Action Units**:
- **AU1**: Neutral face
- **AU2**: Inner brow raiser
- **AU4**: Brow lowerer
- **AU5**: Upper lid raiser
- **AU7**: Lid tightener
- **AU20**: Lip stretcher (Kéo dài môi)
- **AU26**: Jaw drop

**Cấu hình**:
```
Lông mày nhấc và cau → Hình chữ V ngược
Mắt mở rộng và siết → Mắt trợn
Môi kéo dài → Miệng kéo dài ngang
Hàm hạ → Miệng mở
```

**Visual Description**: Lông mày nhấc và cau, mắt trợn, miệng kéo dài và mở

---

### 6. 🤢 Disgust (Ghét bỏ)

**FACS Code**: `9+15+17`

**Action Units**:
- **AU9**: Nose wrinkler (Nhăn mũi)
- **AU15**: Lip corner depressor (Hạ khóe miệng)
- **AU17**: Chin raiser (Nâng cằm)

**Cấu hình**:
```
Mũi nhăn lại → Tạo nếp nhăn trên mũi
Khóe miệng hạ → Miệng hơi hạ
Cằm nâng lên → Cằm nhô ra
```

**Visual Description**: Mũi nhăn, miệng hạ, cằm nâng

---

### 7. 😏 Contempt (Khinh thường)

**FACS Code**: `R12A+R14A`

**Action Units**:
- **R12A**: Right side lip corner puller (Kéo khóe miệng phải nhẹ)
- **R14A**: Right side dimpler (Lúm đồng tiền phải nhẹ)

**Cấu hình**:
```
Khóe miệng phải kéo lên nhẹ → Nửa cười
Lúm đồng tiền phải → Tạo lúm đồng tiền
```

**Visual Description**: Nửa cười, khóe miệng phải kéo lên

## 📊 So sánh cấu hình

| Emotion | Số AUs | Độ phức tạp | Đặc điểm |
|---------|--------|-------------|----------|
| **Happiness** | 2 | Đơn giản | Má + Miệng |
| **Sadness** | 3 | Đơn giản | Lông mày + Miệng |
| **Surprise** | 4 | Trung bình | Lông mày + Mắt + Miệng |
| **Anger** | 4 | Trung bình | Lông mày + Mắt + Môi |
| **Disgust** | 3 | Đơn giản | Mũi + Miệng + Cằm |
| **Fear** | 7 | Phức tạp | Nhiều AUs kết hợp |
| **Contempt** | 2 | Đơn giản | Asymmetric (một bên) |

## 🎯 Cấu hình trong dự án

### Implementation hiện tại (Đã cập nhật):

Dự án đang detect **6 emotions** với các cấu hình sau (đã bổ sung đầy đủ AUs):

1. **VUI_MỪNG** 😊: AU6 + AU12
2. **BUỒN** 😢: AU1 + AU4 + AU15
3. **NGẠC_NHIÊN** 😲: AU1 + AU2 + AU5 + **AU26** ✨
4. **TỨC_GIẬN** 😠: AU4 + AU5 + AU7 + **AU23** ✨
5. **SỢ_HÃI** 😨: AU1 + AU2 + AU4 + AU5 + AU7 + **AU20** + **AU26** ✨
6. **GHÉT_BỎ** 🤢: AU9 + AU15 + **AU17** ✨

### So sánh với FACS chuẩn:

| Emotion | FACS Chuẩn | Implementation | Ghi chú |
|---------|------------|----------------|---------|
| Happiness | 6+12 | 6+12 | ✅ Đúng |
| Sadness | 1+4+15 | 1+4+15 | ✅ Đúng |
| Surprise | 1+2+5B+26 | 1+2+5+26 | ✅ Đã bổ sung AU26 (jaw drop) |
| Anger | 4+5+7+23 | 4+5+7+23 | ✅ Đã bổ sung AU23 (lip tightener) |
| Fear | 1+2+4+5+7+20+26 | 1+2+4+5+7+20+26 | ✅ Đã bổ sung AU20, AU26 |
| Disgust | 9+15+17 | 9+15+17 | ✅ Đã bổ sung AU17 (chin raiser) |

## 💡 Cải thiện có thể thực hiện

### 1. Thêm AUs còn thiếu:

```typescript
// Surprise: Thêm AU26 (jaw drop)
const jawDrop = Math.abs(mouthBottom.y - mouthTop.y) > threshold;

// Anger: Thêm AU23 (lip tightener)
const lipTightener = calculateLipTightness(mouthLandmarks);

// Fear: Thêm AU20 (lip stretcher) và AU26 (jaw drop)
const lipStretch = calculateLipStretch(mouthLandmarks);

// Disgust: Thêm AU17 (chin raiser)
const chinRaise = calculateChinRaise(faceLandmarks);
```

### 2. Cải thiện accuracy:

- **Calibration**: Calibrate cho từng người dùng
- **Temporal smoothing**: Làm mượt dữ liệu theo thời gian
- **Context awareness**: Xem xét ngữ cảnh (đang nói, đang ăn)

### 3. Thêm cấu hình mới:

- **Contempt**: R12A + R14A (asymmetric)
- **Mixed emotions**: Kết hợp nhiều emotions

## 📚 Tài liệu tham khảo

1. **ResearchGate FACS Configurations**: [https://www.researchgate.net/figure/Facial-action-coding-system-FACS-codes-can-be-used-to-describe-the-facial-configuration_fig5_341478545](https://www.researchgate.net/figure/Facial-action-coding-system-FACS-codes-can-be-used-to-describe-the-facial-configuration_fig5_341478545)

2. **FACS Manual** - Paul Ekman Group

3. **RealEye FACS**: [https://www.realeye.io/features/online-webcam-facial-coding/facial-action-coding-system-facs](https://www.realeye.io/features/online-webcam-facial-coding/facial-action-coding-system-facs)

---

**Last updated**: 2025-01-27  
**Based on**: ResearchGate FACS configurations, FACS Manual

