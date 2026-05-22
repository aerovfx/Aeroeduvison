/**
 * Pedagogy Methods Free Course — Khoá học miễn phí về phương pháp sư phạm
 *
 * 8 phương pháp dạy học hiện đại cốt lõi cho GV mọi cấp:
 * Active Learning · Flipped Classroom · Project-Based · Game-Based ·
 * Differentiated · Inquiry-Based · Collaborative · Bloom's Taxonomy
 *
 * Mỗi method có: lý thuyết · ví dụ cụ thể cho cấp lớp VN · checklist
 * áp dụng + 1 case study từ trường VN thực tế.
 */

export interface PedagogyLesson {
  id: string
  title: string
  duration: string
  summary: string
  /** Mô tả chi tiết, hỗ trợ markdown đơn giản (bold, list) */
  content: string
  keyPoints: string[]
  /** Liên kết tham khảo bên ngoài */
  externalUrl?: string
  /** Hoạt động GV có thể làm ngay sau khi học bài này */
  callToAction?: string
}

export interface PedagogyMethod {
  id: string
  index: number
  title: string
  shortName: string
  emoji: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  estimatedHours: number
  audience: 'all' | 'primary' | 'secondary' | 'high'
  lessons: PedagogyLesson[]
}

const METHODS: PedagogyMethod[] = [
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm1-active-learning',
    index: 1,
    title: 'Dạy học tích cực (Active Learning)',
    shortName: 'Active Learning',
    emoji: '⚡',
    description: 'HS chủ động xây dựng kiến thức thay vì thụ động nghe giảng. Nền tảng cho mọi phương pháp khác.',
    level: 'beginner',
    estimatedHours: 2,
    audience: 'all',
    lessons: [
      {
        id: 'al-l1-what-why',
        title: 'Active Learning là gì? Vì sao cần?',
        duration: '15 phút',
        summary: 'HS không phải bình chứa kiến thức để rót vào. Active Learning xoay quanh việc HS làm, nói, viết, dạy lại — qua đó kiến thức "đậu" lại 90%, không chỉ 10% như nghe giảng.',
        content: `**"Tôi nghe rồi quên, tôi thấy rồi nhớ, tôi làm rồi hiểu"** — Khổng Tử.

Active Learning (AL) là tập hợp các kỹ thuật **buộc HS chủ động xử lý thông tin** trong giờ học, thay vì ngồi nghe + ghi chép thuần tuý.

**Pyramid of Learning (Dale's Cone):**
- Nghe giảng: nhớ ~5%
- Đọc: ~10%
- Audio-visual: ~20%
- Demo: ~30%
- **Thảo luận nhóm: ~50%**
- **Thực hành: ~75%**
- **Dạy lại người khác: ~90%**

**Vì sao GV Việt Nam cần?** CT GDPT 2018 đã chuyển từ "truyền thụ kiến thức" sang "phát triển phẩm chất + năng lực". Active Learning là phương pháp CHÍNH thực hiện mục tiêu này.

**Lưu ý:** AL KHÔNG đồng nghĩa với "chơi game vui vẻ". HS có thể ngồi yên đọc + tóm tắt vẫn là AL nếu họ đang chủ động xử lý thông tin.`,
        keyPoints: [
          'AL = HS chủ động xử lý thông tin (đọc/viết/nói/làm)',
          'Tỉ lệ ghi nhớ tăng từ 5% → 75% khi chuyển từ nghe → thực hành',
          'CT GDPT 2018 yêu cầu AL như phương pháp chính',
          'Không phải lúc nào cũng "ồn ào vui vẻ" — đọc-tóm tắt vẫn là AL',
        ],
        callToAction: '🎯 Trong tiết tiếp theo, dành 5 phút cuối để HS viết "ngắn gọn 3 điều em học được hôm nay" vào nháp.',
      },
      {
        id: 'al-l2-techniques',
        title: '10 kỹ thuật AL áp dụng được ngay',
        duration: '30 phút',
        summary: 'Catalog 10 kỹ thuật từ siêu nhanh (1 phút) đến sâu (cả tiết) — chọn theo thời gian + mục tiêu của bạn.',
        content: `**Kỹ thuật 1-phút (warmup/end):**
1. **Think-Pair-Share** — Đặt câu hỏi, 1ph cá nhân suy nghĩ → 1ph nói với bạn bên cạnh → chia sẻ trước lớp.
2. **3-2-1 Exit Ticket** — Cuối tiết: viết 3 điều học, 2 câu hỏi, 1 ý áp dụng.
3. **One-Minute Paper** — 1 phút viết tự do về điểm khó nhất.

**Kỹ thuật 5-15 phút (giữa tiết):**
4. **Mind Map** — Vẽ sơ đồ tư duy chương vừa học, dán bảng.
5. **Carousel** — 4-5 trạm có câu hỏi khác nhau, nhóm xoay vòng trả lời 3 phút/trạm.
6. **Jigsaw** — Mỗi nhóm "chuyên gia" 1 phần, sau ghép lại dạy cho nhóm gốc.

**Kỹ thuật cả tiết:**
7. **Socratic Seminar** — Vòng tròn thảo luận dẫn dắt bằng câu hỏi mở.
8. **Gallery Walk** — HS đi xem bài làm các nhóm khác, viết feedback Post-it.
9. **Role-Play** — Đóng vai nhân vật lịch sử/khoa học gia giải thích khái niệm.
10. **Problem-Based Case** — Đưa tình huống thực, HS đề xuất giải pháp + bảo vệ.

**Cách chọn:** Mục tiêu kiến thức cơ bản → 1-2; kỹ năng phân tích → 4-6; thái độ + giá trị → 7-10.`,
        keyPoints: [
          '10 kỹ thuật chia theo thời gian: 1 phút / 5-15 phút / cả tiết',
          'Think-Pair-Share là kỹ thuật DỄ NHẤT để bắt đầu',
          'Exit Ticket = phản hồi tức thì giúp GV điều chỉnh tiết sau',
          'Carousel + Jigsaw rèn năng lực HỢP TÁC + GIAO TIẾP',
        ],
        callToAction: '🎯 Tuần này: chọn 2 trong 10 kỹ thuật, áp dụng vào 2 tiết khác nhau. Ghi nhật ký phản ứng HS.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm2-flipped-classroom',
    index: 2,
    title: 'Lớp học đảo ngược (Flipped Classroom)',
    shortName: 'Flipped Classroom',
    emoji: '🔄',
    description: 'HS xem video bài giảng ở NHÀ, dành thời gian TRÊN LỚP để thực hành + thảo luận. Tăng tương tác x3.',
    level: 'intermediate',
    estimatedHours: 2,
    audience: 'all',
    lessons: [
      {
        id: 'fc-l1-concept',
        title: 'Flipped Classroom: đảo những gì?',
        duration: '20 phút',
        summary: 'Truyền thống: giảng ở lớp + làm bài tập ở nhà. Flipped: học lý thuyết ở nhà qua video + giải bài tập + thảo luận ở lớp với GV bên cạnh.',
        content: `**Vấn đề của truyền thống:**
GV giảng 40 phút trên lớp → HS không hiểu chỗ nào thì cũng phải về nhà tự loay hoay làm bài tập. Khi gặp khó → KHÔNG CÓ AI HỖ TRỢ. Hôm sau quay lại đành bỏ qua.

**Cách lật:**
- **TRƯỚC tiết** (HS làm ở nhà): Xem video bài giảng 10-15 phút + làm 5 câu MCQ kiểm tra hiểu cơ bản.
- **TRÊN lớp** (GV + HS làm cùng): GV trả lời câu hỏi khó từ video → HS làm bài tập NÂNG CAO theo nhóm → GV đi quanh kèm 1-1 cho HS yếu.

**Lợi ích cho HS:**
- Học tốc độ riêng (tua lại video bao nhiêu lần cũng được)
- Hỏi GV chính lúc khó nhất (khi đang giải bài)
- Hợp tác với bạn → kỹ năng mềm

**Cho GV:**
- Phát hiện HS yếu sớm (qua quiz trước tiết)
- Không lặp lại giảng nhiều lần
- Có thời gian giao việc cá nhân hoá

**Khi nào dùng:** Nội dung có thể video hoá (lý thuyết, công thức, lịch sử). Không phù hợp: bài thí nghiệm cần GV demo trực tiếp.`,
        keyPoints: [
          'Đảo: lý thuyết về NHÀ, thực hành lên LỚP',
          'Video 10-15 phút + quiz 5 câu là tối ưu (HS tập trung được)',
          'GV chuyển từ "người giảng" → "người kèm cặp" trên lớp',
          'Cần platform LMS (vd inphysic) để track HS đã xem chưa',
        ],
        callToAction: '🎯 Chọn 1 bài lý thuyết tuần tới, quay video 10 phút + 5 quiz MCQ, upload lên inphysic.',
      },
      {
        id: 'fc-l2-implementation',
        title: 'Triển khai Flipped — checklist 5 bước',
        duration: '25 phút',
        summary: 'Lộ trình 4 tuần để chuyển 1 chương sang flipped + tránh 3 lỗi phổ biến.',
        content: `**Lộ trình 4 tuần:**

**Tuần 1 — Chọn bài + quay video:**
- Chọn 1 bài KHÁI NIỆM (không phải bài THỰC HÀNH) trong chương sắp dạy
- Viết kịch bản video 10-15 phút (đừng dài hơn — HS sẽ skip)
- Quay bằng phone, Zoom record, hoặc Loom
- Soạn 5 câu MCQ kiểm tra hiểu cơ bản

**Tuần 2 — Thông báo + giao:**
- Họp lớp: giải thích cách học mới + lý do
- Upload video + quiz lên inphysic, deadline trước tiết 1 ngày
- Gửi reminder tin nhắn cho phụ huynh (nếu HS dưới lớp 9)

**Tuần 3 — Tiết Flipped đầu tiên:**
- Bắt đầu: 5 phút hỏi 3 câu quiz khó nhất → identify HS chưa hiểu
- 15 phút: giải đáp + clarification
- 25 phút: HS làm bài tập nâng cao theo nhóm 4
- 5 phút cuối: Exit Ticket "Tôi vẫn chưa hiểu chỗ ___"

**Tuần 4 — Phản tư + cải tiến:**
- Phân tích Exit Ticket → bổ sung 2 mini-video cho phần khó
- Khảo sát HS: thích hơn so với truyền thống không?
- Quyết định: nhân rộng hay không

**3 LỖI PHỔ BIẾN:**
1. ❌ Video quá dài (>20p) → HS bỏ giữa
2. ❌ Không có quiz đi kèm → GV không biết ai đã xem
3. ❌ Trên lớp vẫn giảng lại từ đầu → HS không có động lực xem trước`,
        keyPoints: [
          'Bắt đầu nhỏ: 1 bài, 1 chương, không cả khoá',
          'Video 10-15 phút là sweet spot',
          'Quiz BẮT BUỘC để track + dạy ngay điểm yếu',
          'TUYỆT ĐỐI không giảng lại trên lớp (mất uy tín mô hình)',
        ],
        callToAction: '🎯 Đặt timer Tuần 1 ngay từ hôm nay — chọn bài đầu tiên + viết kịch bản video.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm3-project-based',
    index: 3,
    title: 'Dạy học dự án (Project-Based Learning)',
    shortName: 'PBL',
    emoji: '🎯',
    description: 'HS giải quyết 1 vấn đề thực tế kéo dài 2-8 tuần, tạo ra sản phẩm cuối có thể trưng bày. Phát triển 4Cs.',
    level: 'intermediate',
    estimatedHours: 2,
    audience: 'all',
    lessons: [
      {
        id: 'pbl-l1-anatomy',
        title: 'PBL chuẩn — 7 yếu tố không thiếu',
        duration: '20 phút',
        summary: 'PBL không phải là "làm dự án cho có". Theo Buck Institute, 1 PBL chất lượng phải có đủ 7 elements.',
        content: `**7 Elements (Buck Institute for Education):**

1. **Driving Question** — Câu hỏi định hướng mở, có ý nghĩa thực tế.
   VD tốt: "Làm sao thiết kế hệ thống tưới tự động cho vườn rau trường?"
   VD tồi: "Vẽ sơ đồ một hệ thống tưới."

2. **Sustained Inquiry** — Quá trình tìm hiểu kéo dài 2-8 tuần, HS phải đọc, hỏi, thử-sai.

3. **Authenticity** — Vấn đề THẬT của địa phương / cộng đồng / cá nhân HS. Không phải bài tập giả lập.

4. **Student Voice & Choice** — HS được chọn cách giải quyết, vai trò nhóm, sản phẩm cuối.

5. **Reflection** — HS phản tư cả về NỘI DUNG học được lẫn QUÁ TRÌNH làm.

6. **Critique & Revision** — Có ít nhất 1 vòng peer review trước khi nộp final.

7. **Public Product** — Sản phẩm trưng bày cho khán giả thật (PH, BGH, cộng đồng), không chỉ nộp cho GV.

**Lợi ích đo được:**
- Buck Institute studies (2019): HS PBL hiểu sâu hơn 21% so với truyền thống
- Phát triển 4Cs: Critical thinking, Creativity, Collaboration, Communication
- Tăng động lực học vì có sản phẩm hữu hình

**Khi nào KHÔNG dùng PBL:** Bài kiến thức nền tảng cần học nhanh trước kỳ thi cận kề.`,
        keyPoints: [
          '7 elements BẮT BUỘC, thiếu 1 thì không phải PBL chuẩn',
          'Driving question là TRÁI TIM của dự án',
          'Public product = động lực mạnh nhất cho HS',
          'PBL không thay thế hoàn toàn truyền thống — bổ trợ',
        ],
        callToAction: '🎯 Brainstorm 3 driving question phù hợp môn bạn dạy + bối cảnh trường. Chia sẻ với đồng nghiệp.',
      },
      {
        id: 'pbl-l2-toolkit',
        title: 'Toolkit GV: timeline + rubric + check-point',
        duration: '25 phút',
        summary: 'Template quản lý 6-tuần PBL với check-point hàng tuần + rubric đánh giá 4 năng lực.',
        content: `**Timeline 6 tuần (mẫu cho lớp 9-12):**

| Tuần | Hoạt động | Sản phẩm trung gian |
|------|-----------|---------------------|
| 1 | Launch + chia nhóm + nghiên cứu mở | Mind map vấn đề (Post-it) |
| 2 | Đào sâu lý thuyết + lập kế hoạch | Project plan (Google Doc) |
| 3 | Thiết kế prototype/giải pháp | Sketch + bill of materials |
| 4 | Xây dựng + test version 1 | Demo v1 + peer feedback |
| 5 | Cải tiến v2 + chuẩn bị trưng bày | Poster + slide thuyết trình |
| 6 | Public showcase + reflection | Video demo + báo cáo |

**Rubric 4 chiều (mỗi chiều 1-4 điểm):**

| Tiêu chí | 1 (Mới bắt đầu) | 4 (Xuất sắc) |
|----------|-----------------|--------------|
| **Kiến thức nội dung** | Áp dụng khái niệm sai/ thiếu | Tích hợp ≥3 khái niệm liên môn chính xác |
| **Tư duy phản biện** | Chỉ làm theo hướng dẫn | Đề xuất giải pháp mới + bảo vệ logic |
| **Hợp tác nhóm** | Có conflict không giải quyết | Phân vai rõ, hỗ trợ bạn yếu hơn |
| **Sản phẩm cuối** | Không hoạt động/ không trình bày được | Đẹp, chạy được, có hướng dẫn dùng |

**Check-point hàng tuần (15 phút mỗi nhóm):**
- "Tuần này nhóm đã làm gì?" → progress
- "Khó khăn lớn nhất?" → identify support cần
- "Tuần tới sẽ làm gì?" → commitment

**Tools hỗ trợ:**
- Trello / Notion cho task tracking
- Padlet / Mural cho brainstorm
- Loom / OBS cho demo video
- Canva / Google Slides cho final presentation`,
        keyPoints: [
          'Timeline 6 tuần chia thành 5 milestones rõ ràng',
          'Rubric 4 chiều = nội dung + tư duy + nhóm + sản phẩm',
          'Check-point 15p/tuần = phòng chống nhóm "tê liệt"',
          'Tools digital giúp GV theo dõi mà không xâm phạm tự chủ HS',
        ],
        callToAction: '🎯 Tải template Notion/Google Doc rubric mẫu, customize cho 1 dự án bạn đang ấp ủ.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm4-game-based',
    index: 4,
    title: 'Game-Based Learning (Học qua chơi)',
    shortName: 'Game-Based',
    emoji: '🎮',
    description: 'Dùng cơ chế game (điểm, level, badge, leaderboard) hoặc game đầy đủ để dạy kiến thức. Đặc biệt mạnh cho HS tiểu học/THCS.',
    level: 'beginner',
    estimatedHours: 2,
    audience: 'primary',
    lessons: [
      {
        id: 'gbl-l1-vs-gamification',
        title: 'Game-Based vs Gamification — khác nhau gì?',
        duration: '15 phút',
        summary: 'Đừng nhầm: Gamification thêm game ELEMENTS vào học (điểm, badge); Game-Based dùng GAME ĐẦY ĐỦ làm phương tiện học.',
        content: `**Phân biệt 2 khái niệm:**

**Gamification (Game hoá):**
- THÊM yếu tố game vào hoạt động học có sẵn
- Ví dụ: Cộng 10 điểm/câu đúng trên Kahoot, badge "Học tập 7 ngày liên tục"
- Dễ làm, nhanh thấy hiệu quả nhưng có thể chỉ tăng động lực ngoại tại (extrinsic)

**Game-Based Learning (GBL):**
- DÙNG game đầy đủ làm phương tiện học (HS chơi xong là đã học)
- Ví dụ: Minecraft Education để dạy hình học không gian, Civilization để dạy lịch sử
- Khó thiết kế hơn nhưng tạo động lực nội tại sâu (intrinsic)

**Đậu Lém model — mô hình HOÀN HẢO cho mầm non/tiểu học:**
- Nhân vật xuyên suốt (Đậu Lém) tạo emotional connection
- Mỗi tập 5-10 phút dạy 1 kỹ năng đời thường (đừng nói chuyện với người lạ, vệ sinh răng miệng,...)
- Câu chuyện tình huống thực tế HS gặp hàng ngày
- Animation 2D dễ làm, không cần engine 3D phức tạp

**Khi nào dùng GBL:**
- HS 4-12 tuổi: cực hiệu quả (não thích chơi)
- HS 13-18 tuổi: dùng GBL ngắn (15-30 phút), không thay thế hoàn toàn truyền thống
- Người lớn: prefer simulation hơn là game thuần tuý

**3 nguyên tắc thiết kế game giáo dục:**
1. **Mục tiêu học** rõ ràng và đo được — nếu chơi xong không học được gì cụ thể, dẹp
2. **Vui trước, học sau** — nếu không vui, HS sẽ bỏ ngay
3. **Feedback tức thì** — sai là biết ngay, đừng đợi cuối game`,
        keyPoints: [
          'Gamification = thêm game elements; GBL = dùng full game',
          'Đậu Lém model = mầm non + tiểu học VN cực mạnh',
          'GBL hợp nhất với tuổi 4-12, giảm dần khi lớn lên',
          '3 NT: mục tiêu rõ + vui trước + feedback tức thì',
        ],
        callToAction: '🎯 Xem 2 tập Đậu Lém trên YouTube — phân tích: mục tiêu học là gì? Mechanic nào tạo vui?',
      },
      {
        id: 'gbl-l2-design',
        title: 'Thiết kế trò chơi mầm non/tiểu học kiểu Đậu Lém',
        duration: '30 phút',
        summary: 'Framework 5 bước thiết kế game ngắn 5-10 phút cho HS 4-10 tuổi: từ ý tưởng đến storyboard.',
        content: `**Framework Đậu Lém-inspired:**

**Bước 1 — Chọn 1 KỸ NĂNG ĐỜI THƯỜNG cần dạy:**
- Vệ sinh: rửa tay đúng cách, đánh răng 2 lần/ngày
- An toàn: qua đường, không nhận đồ từ người lạ, gọi 113
- Đạo đức: cảm ơn-xin lỗi, chia sẻ, kiên nhẫn
- Học vấn: đếm số, chữ cái, hình dạng

**Bước 2 — Tạo CHARACTER chính + bối cảnh:**
- Tên + ngoại hình dễ nhớ (Đậu Lém: nâu, mắt to, miệng cười)
- Tuổi gần HS (4-8 tuổi)
- Tính cách: tò mò, hơi nghịch, biết hối lỗi
- Bối cảnh: trường mẫu giáo / nhà / công viên — HS gặp hàng ngày

**Bước 3 — Cấu trúc câu chuyện 3 PHẦN:**
- **Mở (1-2 phút):** Bối cảnh + vấn đề xuất hiện
  VD: Đậu Lém quên rửa tay trước khi ăn → bụng đau
- **Thân (3-5 phút):** Hậu quả + nhân vật phụ giúp đỡ
  VD: Mẹ dẫn đi khám → bác sĩ giải thích vi khuẩn
- **Kết (1-2 phút):** Đậu Lém rút bài học + HS được hỏi 1 câu để áp dụng
  VD: "Em phải rửa tay khi nào?" → A. Sau khi đi vệ sinh ✓ B. Trước khi ăn ✓ C. Sau khi chơi đất ✓

**Bước 4 — Mechanic tương tác (cho HS chơi):**
- **Tap-to-progress** — bấm/chạm để qua scene (đủ cho 4-6 tuổi)
- **Choose path** — quyết định Đậu Lém làm gì (6-8 tuổi)
- **Mini-game** — match cặp, kéo-thả, đếm (7-10 tuổi)
- **Quiz cuối** — 3 câu hỏi củng cố kiến thức

**Bước 5 — Phần thưởng + replay:**
- Sticker/badge "Đậu Lém vệ sinh giỏi"
- Bộ sưu tập: hoàn thành 10 tập → unlock skin Đậu Lém siêu nhân
- Khuyến khích chơi lại với câu chuyện ngẫu hoá nhẹ

**Tools làm game đơn giản:**
- **Scratch (MIT)** — kéo-thả, dễ học cho GV không lập trình
- **Construct 3** — 2D game không code, mạnh hơn Scratch
- **Roblox Studio** — nếu nhắm tuổi lớn hơn (8-12)
- **Procreate / Canva** — vẽ character + storyboard
- **TTS AI (ElevenLabs/Azure)** — lồng tiếng tự động`,
        keyPoints: [
          'Mỗi tập = 1 kỹ năng đời thường, 5-10 phút',
          'Character + bối cảnh quen thuộc tạo connection',
          '3 phần: bối cảnh-vấn đề / hậu quả-giải pháp / bài học-quiz',
          'Mechanic theo độ tuổi: tap → choose → mini-game → quiz',
          'Reward + bộ sưu tập tạo động lực chơi tiếp',
        ],
        callToAction: '🎯 Brainstorm 5 ý tưởng "Đậu Lém-style" cho môn bạn dạy. Vẽ storyboard 1 ý tưởng yêu thích.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm5-differentiated',
    index: 5,
    title: 'Dạy học phân hóa (Differentiated Instruction)',
    shortName: 'Differentiation',
    emoji: '🎚',
    description: 'Mỗi HS có nền tảng + tốc độ học khác nhau. Phân hóa = thiết kế bài học có 2-3 mức để mọi HS đều tiến bộ.',
    level: 'intermediate',
    estimatedHours: 1.5,
    audience: 'all',
    lessons: [
      {
        id: 'di-l1-concept',
        title: 'Phân hoá theo 4 chiều của Tomlinson',
        duration: '20 phút',
        summary: 'Carol Ann Tomlinson — "mẹ đẻ" của DI — định nghĩa 4 chiều phân hoá: nội dung, quy trình, sản phẩm, môi trường.',
        content: `**4 chiều phân hoá (Tomlinson, 2014):**

**1. NỘI DUNG (Content) — Cái HS học:**
- Cùng chủ đề nhưng độ sâu khác nhau
- VD: Bài "Định luật Ohm" — HS yếu học công thức cơ bản U=IR, HS giỏi học thêm điện trở song song-nối tiếp

**2. QUY TRÌNH (Process) — Cách HS học:**
- Cùng nội dung nhưng cách tiếp cận khác
- VD: HS visual xem video, HS auditory nghe podcast, HS kinesthetic làm thí nghiệm

**3. SẢN PHẨM (Product) — Cách HS thể hiện:**
- Cùng mục tiêu nhưng hình thức nộp khác
- VD: HS thích viết → bài luận; HS thích vẽ → infographic; HS thích nói → video thuyết trình

**4. MÔI TRƯỜNG (Learning Environment) — Nơi/cách HS học:**
- Bố trí lớp, nhóm linh hoạt, không gian yên tĩnh-ồn ào
- VD: Góc thư viện cho HS đọc, bàn nhóm cho HS thảo luận, headphone cho HS cần yên tĩnh

**Quy tắc vàng:** KHÔNG cần phân hoá CẢ 4 CHIỀU trong 1 tiết. Bắt đầu với 1 chiều, làm thuần thục rồi mở rộng.

**Ranh giới cần tránh:**
- ❌ Đối xử bất công: cho HS giỏi bài "khó hơn" mà HS yếu bài "dễ hơn" → label HS
- ✅ Cùng mục tiêu, đa con đường: mọi HS đều hướng tới hiểu khái niệm cốt lõi`,
        keyPoints: [
          '4 chiều: Nội dung · Quy trình · Sản phẩm · Môi trường',
          'Bắt đầu với 1 chiều, không tham lam',
          'Cùng MỤC TIÊU, đa CON ĐƯỜNG',
          'Tránh label HS qua việc giao bài "khác cấp"',
        ],
        callToAction: '🎯 Trong bài tiếp theo, thử phân hoá 1 chiều — VD cho 3 sản phẩm khác nhau cho cùng mục tiêu.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm6-bloom',
    index: 6,
    title: 'Bloom Taxonomy — Thang đo nhận thức',
    shortName: "Bloom's",
    emoji: '🪜',
    description: '6 cấp tư duy từ Nhớ → Hiểu → Áp dụng → Phân tích → Đánh giá → Sáng tạo. Soạn đề + dạy đúng cấp.',
    level: 'beginner',
    estimatedHours: 1,
    audience: 'all',
    lessons: [
      {
        id: 'bl-l1-6-levels',
        title: '6 cấp Bloom revised + verbs sử dụng',
        duration: '20 phút',
        summary: 'Phiên bản 2001 (Anderson) đảo "Đánh giá" và "Sáng tạo", thêm cấp Sáng tạo lên đỉnh. Mỗi cấp có verb đặc trưng để dùng khi viết mục tiêu bài học.',
        content: `**6 cấp (từ thấp đến cao):**

**L1 — REMEMBER (Nhớ):** Recall facts
- Verbs: Nêu, Liệt kê, Định nghĩa, Nhận biết, Kể lại
- VD: "Nêu công thức tính diện tích hình tròn"

**L2 — UNDERSTAND (Hiểu):** Explain ideas
- Verbs: Giải thích, Tóm tắt, Phân loại, So sánh, Mô tả
- VD: "Giải thích vì sao bóng đèn càng sáng càng nóng"

**L3 — APPLY (Vận dụng):** Use in new situation
- Verbs: Tính toán, Áp dụng, Sử dụng, Thực hiện, Minh hoạ
- VD: "Tính cường độ dòng điện qua mạch khi U=12V, R=4Ω"

**L4 — ANALYZE (Phân tích):** Break into parts
- Verbs: Phân tích, So sánh-đối chiếu, Phân biệt, Khảo sát
- VD: "Phân tích vì sao mạch song song và nối tiếp khác nhau về dòng điện"

**L5 — EVALUATE (Đánh giá):** Judge based on criteria
- Verbs: Đánh giá, Phê bình, Bảo vệ, Lập luận, Khuyến nghị
- VD: "Đánh giá ưu nhược điểm của 2 phương án mắc đèn LED — phương án nào nên dùng cho lớp học?"

**L6 — CREATE (Sáng tạo):** Produce new work
- Verbs: Thiết kế, Sáng tác, Xây dựng, Hình thành, Phát triển
- VD: "Thiết kế mạch điện cho hệ thống chiếu sáng tự động của thư viện"

**Phân bổ trong đề thi (theo TT22/2021):**
- L1-L2 (Nhận biết-Hiểu): 40%
- L3 (Vận dụng): 30%
- L4-L5 (Phân tích-Đánh giá): 20%
- L6 (Sáng tạo): 10%

**Lỗi GV hay mắc:** 80% câu hỏi chỉ ở L1-L2 → HS chỉ học thuộc, không phát triển tư duy.`,
        keyPoints: [
          '6 cấp từ Nhớ → Sáng tạo, không thể bỏ cấp nào',
          'Mỗi cấp có verb đặc trưng — dùng đúng khi viết mục tiêu',
          'TT22/2021 yêu cầu phân bổ 40-30-20-10 trong đề',
          'GV thường đề quá dễ (chỉ L1-L2) → cần tăng L3+',
        ],
        callToAction: '🎯 Lấy 1 đề thi gần nhất của bạn, gắn nhãn L1-L6 cho từng câu. Tính tỉ lệ. So với chuẩn 40-30-20-10.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm7-inquiry',
    index: 7,
    title: 'Dạy học khám phá (Inquiry-Based Learning)',
    shortName: 'Inquiry-Based',
    emoji: '🔍',
    description: 'GV đặt câu hỏi, HS tự đi tìm câu trả lời qua quan sát, thí nghiệm, thảo luận. Mạnh nhất cho môn KHTN.',
    level: 'intermediate',
    estimatedHours: 1.5,
    audience: 'all',
    lessons: [
      {
        id: 'iq-l1-5e',
        title: 'Mô hình 5E — chu trình khám phá hoàn chỉnh',
        duration: '20 phút',
        summary: 'BSCS 5E model: Engage → Explore → Explain → Elaborate → Evaluate. Khung chuẩn cho 1 tiết Inquiry hoàn chỉnh.',
        content: `**5E model — chu trình 1 chủ đề (1-3 tiết):**

**1. ENGAGE (Kích thích, 5-10 phút):**
- GV đặt câu hỏi gây tò mò, video ngắn, hiện tượng lạ
- Mục đích: kích hoạt prior knowledge + tạo "want to know"
- VD: Cho HS xem video bóng đèn sợi đốt vs LED. Hỏi: "Vì sao LED không nóng nhưng vẫn sáng?"

**2. EXPLORE (Khám phá, 20-30 phút):**
- HS làm thí nghiệm/quan sát/thảo luận TỰ DO
- GV chỉ làm facilitator, không giảng giải
- VD: Cho 4 mạch điện đơn giản với LED + bóng sợi đốt + điện trở + pin. HS tự nối + đo dòng-áp.

**3. EXPLAIN (Giải thích, 15-20 phút):**
- HS trình bày kết quả khám phá
- GV giới thiệu thuật ngữ KHOA HỌC chính xác (cho điều HS vừa khám phá)
- VD: HS đã thấy LED ít nóng → GV giới thiệu khái niệm "hiệu suất chuyển hoá điện-quang"

**4. ELABORATE (Mở rộng, 15-20 phút):**
- Áp dụng khái niệm mới vào tình huống KHÁC
- VD: "Vậy panel mặt trời chuyển hoá năng lượng gì sang gì? Hiệu suất bao nhiêu?"

**5. EVALUATE (Đánh giá, 10-15 phút):**
- Quiz / exit ticket / mini-project đo lường hiểu sâu
- VD: "Thiết kế đèn học cho bạn em — chọn LED hay sợi đốt? Vì sao?"

**Khi nào dùng:** Môn KHTN (Vật-Hoá-Sinh-Khoa học), STEM, bài có hiện tượng quan sát được. Không phù hợp với kiến thức trừu tượng thuần (lịch sử, ngữ pháp).`,
        keyPoints: [
          '5E: Engage → Explore → Explain → Elaborate → Evaluate',
          'EXPLORE TRƯỚC, EXPLAIN SAU — đảo ngược truyền thống',
          'GV chỉ giảng thuật ngữ SAU khi HS đã trải nghiệm',
          'Hoàn hảo cho KHTN; ít phù hợp môn xã hội/ngôn ngữ',
        ],
        callToAction: '🎯 Tuần này: thiết kế 1 tiết theo 5E. Quay video tiết dạy + tự phân tích thời lượng từng phase.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  {
    id: 'm8-collaborative',
    index: 8,
    title: 'Hợp tác nhóm (Collaborative Learning)',
    shortName: 'Collaborative',
    emoji: '🤝',
    description: '2-6 HS cùng giải bài toán/tạo sản phẩm. KHÁC với "làm việc nhóm" — phải có positive interdependence.',
    level: 'beginner',
    estimatedHours: 1.5,
    audience: 'all',
    lessons: [
      {
        id: 'cl-l1-5-elements',
        title: '5 yếu tố Johnson — phân biệt hợp tác THẬT với nhóm GIẢ',
        duration: '25 phút',
        summary: 'David & Roger Johnson định nghĩa 5 yếu tố cốt lõi của Cooperative Learning. Thiếu yếu tố nào = chỉ là "ngồi cạnh nhau".',
        content: `**5 yếu tố Johnson Brothers:**

**1. Positive Interdependence (Phụ thuộc tích cực):**
- Thành công cá nhân phụ thuộc vào thành công cả nhóm
- Cách tạo: Mỗi thành viên một mảnh ghép DUY NHẤT
- VD: Jigsaw — mỗi HS đọc 1 đoạn khác nhau, sau ghép lại dạy cho cả nhóm

**2. Individual Accountability (Trách nhiệm cá nhân):**
- Mỗi HS được đánh giá riêng, không "chia đều điểm nhóm"
- Cách: Random call để 1 HS trình bày → cả nhóm chịu chung
- VD: GV chọn ngẫu nhiên 1 HS trả lời câu hỏi, điểm tính cho cả nhóm

**3. Face-to-Face Interaction (Tương tác trực diện):**
- HS NGỒI CẠNH NHAU, làm cùng, không phân chia kiểu "mày làm phần này, tao phần kia"
- Cách: Bàn 4-6 người + 1 sản phẩm chung trên giấy

**4. Social Skills (Kỹ năng xã hội):**
- GV DẠY rõ kỹ năng: lắng nghe, hỏi mở, không cắt lời, đồng thuận-bất đồng
- KHÔNG ngầm giả định HS biết cách hợp tác
- VD: Trước hoạt động, GV diễn vai 30 giây "cách lắng nghe đúng"

**5. Group Processing (Tự đánh giá nhóm):**
- Cuối hoạt động: 5 phút thảo luận "nhóm làm gì tốt? cần cải thiện gì?"
- Quan trọng để rèn metacognition

**So sánh Group Work GIẢ vs Cooperative Learning THẬT:**

| Tiêu chí | Nhóm giả | CL thật |
|----------|---------|---------|
| Phụ thuộc | Mỗi người 1 góc, ghép cuối | Mỗi người 1 mảnh, không có nhau ko xong |
| Đánh giá | Chia đều điểm nhóm | Mỗi cá nhân riêng + nhóm |
| Vai trò | Không phân vai | 4 vai cố định: Leader / Recorder / Reporter / Timer |
| Phản tư | Không có | 5 phút cuối bắt buộc |

**Lỗi phổ biến:** GV chia nhóm rồi mặc kệ → HS giỏi gánh, HS yếu free-ride. Cần thiết kế ràng buộc.`,
        keyPoints: [
          '5 yếu tố: Phụ thuộc tích cực · Trách nhiệm cá nhân · Trực diện · Kỹ năng xã hội · Tự đánh giá',
          'KHÁC nhóm thường ở: phụ thuộc + đánh giá cá nhân',
          'GV phải DẠY kỹ năng hợp tác, không giả định HS biết',
          '4 vai cố định: Leader / Recorder / Reporter / Timer',
        ],
        callToAction: '🎯 Tuần này, áp dụng Jigsaw 1 tiết. Quan sát: nhóm nào có positive interdependence rõ nhất?',
      },
    ],
  },
]

export const PEDAGOGY_COURSE = {
  id: 'pedagogy-methods-vn',
  title: 'Phương pháp Sư phạm Hiện đại — Cẩm nang GV Việt Nam',
  subtitle: '8 phương pháp dạy học cốt lõi · Cập nhật CT GDPT 2018',
  description: 'Khoá học miễn phí trang bị 8 phương pháp sư phạm hiện đại cho GV mọi cấp. Từ Active Learning, Flipped Classroom, PBL, Game-Based đến Bloom Taxonomy — mỗi phương pháp có ví dụ cụ thể cho lớp học Việt Nam + call-to-action thực hành ngay.',
  totalHours: METHODS.reduce((s, m) => s + m.estimatedHours, 0),
  modules: METHODS,
  sourceRepo: 'https://inphysic.com/free-courses/pedagogy',
}
