# Hướng Dẫn Hệ Thống Nhận Diện Cảm Xúc Nâng Cao (Advanced Emotion Recognition)

Chào mừng bạn đến với hệ thống nhận diện cảm xúc thế hệ mới của AeroEduVision! Hệ thống này sử dụng công nghệ MediaPipe Face Blendshapes tiên tiến để phân tích 52 điểm cơ mặt và phát hiện 22 trạng thái cảm xúc khác nhau.

## 🚀 Tính Năng Chính
- **22 Biểu Cảm**: Từ cơ bản (Vui, Buồn) đến phức tạp (Nhếch mép, Nháy mắt, Lè lưỡi).
- **Floating Emojis**: Hiệu ứng emoji bay lên theo thời gian thực tương ứng với cảm xúc.
- **Thống Kê Chi Tiết**: Theo dõi tần suất, biểu đồ Top 5, và xuất dữ liệu JSON.
- **Độ Chính Xác Cao**: Sử dụng GPU acceleration thông qua WebAssembly (WASM).

---

## 🎭 Danh Sách 22 Biểu Cảm

### 7 Cảm Xúc Cơ Bản (Basic Emotions)
| Emoji | Tên (EN) | Tên (VN) | Mô tả |
|-------|----------|----------|-------|
| 😊 | Happy | Vui vẻ | Mỉm cười, mắt híp nhẹ. |
| 😢 | Sad | Buồn | Môi trễ xuống, lông mày nhíu lại. |
| 😠 | Angry | Tức giận | Lông mày cau có, môi mím chặt. |
| 😲 | Surprised | Ngạc nhiên | Mắt mở to, miệng há hốc. |
| 😨 | Fearful | Sợ hãi | Mắt mở to, lông mày nhướn lên, căng thẳng. |
| 🤢 | Disgusted | Ghê tởm | Mũi nhăn lại, môi trên nhếch lên. |
| 😐 | Neutral | Bình thường | Không có biểu cảm cụ thể. |

### 15 Cảm Xúc Mở Rộng (Extended Emotions)
| Emoji | Tên (EN) | Tên (VN) | Mô tả |
|-------|----------|----------|-------|
| 😄 | Very Happy | Rất vui | Cưới tươi, lộ răng, mắt híp. |
| 😆 | Laughing | Cười | Cười lớn, há miệng. |
| 😏 | Smirking | Nhếch mép | Cười lệch một bên mép. |
| 😕 | Confused | Bối rối | Lông mày lệch, môi lệch. |
| 😟 | Worried | Lo lắng | Lông mày nhíu nhẹ, vẻ mặt bất an. |
| 🤔 | Thinking | Suy nghĩ | Chu môi nhẹ, mắt nhìn đi chỗ khác/cau mày. |
| 😪 | Sleepy | Buồn ngủ | Mắt lờ đờ, chớp mắt chậm, miệng thả lỏng. |
| 😘 | Kiss | Hôn | Chu môi như đang hôn. |
| 😛 | Tongue Out | Lè lưỡi | Lè lưỡi ra ngoài. |
| 😉 | Wink | Nháy mắt | Một mắt nhắm, một mắt mở. |
| 😭 | Crying | Khóc | Mặt mếu máo cao độ. |
| 😱 | Screaming | La hét | Há miệng cực đại, mắt mở to. |
| 😒 | Annoyed | Bực mình | Mắt lườm, môi trễ/mím. |
| 🧐 | Concentrating | Tập trung | Mắt nheo lại, nhìn chằm chằm. |
| 😶 | Poker Face | Mặt đơ | Cơ mặt hoàn toàn bất động. |

---

## 🛠 Cách Sử Dụng

1. **Khởi động**:
    - Truy cập Dashboard > Vision Tracker.
    - Nhấn nút **"▶️ Bắt đầu"**.
    - Cấp quyền truy cập Camera nếu được hỏi.

2. **Thao tác**:
    - Ngồi đối diện camera, đảm bảo đủ ánh sáng.
    - Thử thực hiện các biểu cảm trong danh sách trên.
    - Nhìn các **Floating Emoji** bay lên từ khuôn mặt bạn!

3. **Xem Thống Kê**:
    - **Top 5 Cảm Xúc**: Biểu đồ thanh ngang hiển thị 5 cảm xúc phổ biến nhất trong phiên.
    - **Tất Cả**: Lưới hiển thị count cho toàn bộ 22 cảm xúc.
    - **Camera/Face Status**: Kiểm tra trạng thái kết nối.

4. **Xuất Dữ Liệu**:
    - Nhấn **"💾 Xuất dữ liệu"** để tải về file `.json`.
    - Dữ liệu bao gồm: Tổng hợp số lượng (stats) và lịch sử chi tiết theo thời gian (history).

5. **Cấu Hình**:
    - Kéo thanh trượt **"Độ tin cậy tối thiểu"** để lọc bớt nhiễu. Giá trị khuyến nghị: **40-50%**.

---

## ⚙️ Chi Tiết Kỹ Thuật (Cho Developer)

Hệ thống sử dụng **MediaPipe Tasks Vision API** (`@mediapipe/tasks-vision`) với mô hình `face_landmarker` (float16).

### 52 Blendshapes Chính
Điểm mấu chốt là cờ `outputFaceBlendshapes: true` trong cấu hình FaceLandmarker. Các blendshape quan trọng được sử dụng bao gồm:
- `mouthSmileLeft`, `mouthSmileRight`: Phát hiện cười.
- `browDownLeft`, `browDownRight`: Phát hiện tức giận/suy nghĩ.
- `eyeBlinkLeft`, `eyeBlinkRight`: Phát hiện nháy mắt/buồn ngủ.
- `jawOpen`: Phát hiện ngạc nhiên/la hét/cười lớn.
- `tongueOut`: Phát hiện lè lưỡi.
- ... và nhiều blendshape khác kết hợp lại trong class `AdvancedEmotionDetector`.

### Cấu Trúc File
- `page.tsx`: Entry point.
- `EmotionTracker.tsx`: Main UI component.
- `advanced-emotion-recognition.ts`: Chứa thuật toán phát hiện (Detector), quản lý thống kê (StatsTracker), và hiệu ứng (EmojiManager).
- `emotion-tracker.css`: Stylesheet.

---

**Chúc bạn có những trải nghiệm thú vị với AeroEduVision Emotion Tracker!** 😊
