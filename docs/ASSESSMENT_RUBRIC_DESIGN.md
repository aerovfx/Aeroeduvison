# Tài Liệu Thiết Kế: Bảng Đánh Giá Lộ Trình Học Tập

## 1. Tổng quan

Hệ thống Bảng Đánh Giá Lộ Trình Học Tập (Learning Path Assessment Rubric) là một nền tảng toàn diện dùng để đánh giá học viên và tạo ra các lộ trình học tập được cá nhân hóa. Hệ thống hoạt động dựa trên bốn yếu tố chính, mỗi yếu tố được gán một trọng số nhất định để tạo ra một điểm số tổng hợp (Composite Assessment Score).

**Mục tiêu chính:**
- Đánh giá toàn diện khả năng và nhu cầu của học viên
- Xác thực chất lượng nội dung bài học từ các chuyên gia
- Đảm bảo tính liên kết giữa các ngành học (cross-disciplinary)
- Lựa chọn nền tảng AI tối ưu dựa trên hồ sơ người học

**Quy trình cơ bản:**
1. Học viên hoàn thành khảo sát đánh giá
2. Hệ thống tính điểm Student Profile (35%)
3. Các chuyên gia xác thực nội dung - Subject Mentor Validation (25%)
4. Hội đồng liên ngành đánh giá tính liên kết - Cross-Disciplinary Panel (20%)
5. AI Scoring Matrix tính toán hiệu quả nền tảng (20%)
6. Tạo Composite Assessment Score và lộ trình học tập
7. Tiến hành đánh giá lại định kỳ

---

## 2. Cơ sở lý luận

### 2.1 Knowledge Graph Theory
Knowledge Graph Theory cung cấp nền tảng cho việc biểu diễn các mối quan hệ giữa các khái niệm, kỹ năng, và lĩnh vực kiến thức. Bằng cách ánh xạ các tiên quyết (prerequisites) và kết nối chéo, chúng ta tạo ra một mạng lưới kiến thức liên thông giúp học viên hiểu rõ hơn về cách các khái niệm kết nối với nhau.

### 2.2 Constructivism + Multi-Disciplinary Integration
Phong trào Constructivism nhấn mạnh rằng học viên xây dựng hiểu biết của mình thông qua trải nghiệm tương tác. Hệ thống chúng tôi tích hợp các kiến thức từ nhiều ngành học để giúp học viên nhìn thấy những ứng dụng thực tiễn và mối liên hệ giữa các lĩnh vực.

### 2.3 Bloom's Taxonomy
Sử dụng các mức độ nhận thức của Bloom để phân loại các mục tiêu học tập:
- **Nhớ (Remember)**: Nhớ lại các sự kiện và định nghĩa cơ bản
- **Hiểu (Understand)**: Giải thích ý tưởng hoặc khái niệm
- **Áp dụng (Apply)**: Sử dụng thông tin trong tình huống mới
- **Phân tích (Analyze)**: Rút ra sự khác biệt giữa các thành phần
- **Đánh giá (Evaluate)**: Biện minh cho một giả định hoặc quyết định
- **Tạo (Create)**: Sản xuất công việc sáng tạo hoặc giải pháp mới

### 2.4 Spaced Repetition
Hệ thống áp dụng nguyên tắc Spaced Repetition để tối ưu hóa việc ghi nhớ dài hạn. Các bài học và bài kiểm tra được lên lịch lại trong những khoảng thời gian ngày càng dài dựa trên hiệu suất của học viên.

### 2.5 Personalized & Adaptive Learning
Mỗi lộ trình được cá nhân hóa dựa trên:
- Kiểu học tập ưa thích (visual, auditory, kinesthetic, reading/writing)
- Nồng độ kiến thức trước đó (prior knowledge)
- Tốc độ học và khả năng tiếp thu
- Động lực và mục tiêu cá nhân
- Khả năng thời gian có sẵn

---

## 3. Kiến trúc hệ thống

### 3.1 Quy trình chính (Main Flow)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Khảo sát (Survey) - Học viên điền thông tin cá nhân      │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Scoring Engine - Tính điểm Student Profile (35%)         │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Subject Mentor Validation (25%)                          │
│    - 12 domains, các chuyên gia đánh giá nội dung           │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Cross-Disciplinary Panel (20%)                           │
│    - Đánh giá tính liên kết giữa các ngành                  │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. AI Scoring Matrix (20%)                                  │
│    - Tính điểm 4 nền tảng AI                                │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Composite Assessment - Tính toán điểm tổng hợp           │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Path Generation - Tạo lộ trình học tập cá nhân hóa       │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Re-Assessment - Đánh giá lại định kỳ                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Thành phần chính

#### a) Survey Module
- Tiếp nhận thông tin từ học viên
- 6 phần, 23 câu hỏi
- Lưu trữ dữ liệu vào database

#### b) Scoring Engine
- Tính điểm Student Profile
- Xử lý dữ liệu từ Survey
- Chuẩn hóa điểm (0-100)

#### c) Validation Layers
- Subject Mentor Validation
- Cross-Disciplinary Panel
- AI Scoring Matrix

#### d) Composite Assessment Calculator
- Tổng hợp 4 yếu tố
- Tạo điểm tổng (0-100)
- Xác định mức độ (tiers)

#### e) Path Generator
- Lựa chọn nội dung phù hợp
- Xếp lịch bài học
- Tính toán khoảng thời gian Spaced Repetition

#### f) Re-Assessment Module
- Đánh giá lại định kỳ
- Adaptive triggers
- Cập nhật lộ trình

---

## 4. Bốn yếu tố đánh giá

### 4.1 Student Profile (35%)

**Mô tả:** Đánh giá khả năng, kiểu học tập, kiến thức trước đó, động lực, và khả năng thời gian của học viên.

**Bảng Rubric Student Profile**

| Tiêu chí | Xuất sắc (76-100) | Tốt (51-75) | Trung bình (26-50) | Cần cải thiện (0-25) |
|----------|-------------------|-----------|--------------------|--------------------|
| **Readiness** (Sẵn sàng) | Học viên có nền tảng kiến thức vững chắc, có kinh nghiệm liên quan, hoàn toàn sẵn sàng cho chương trình | Học viên có một số kiến thức cơ bản, sẵn sàng với sự hỗ trợ nhỏ | Học viên có kiến thức hạn chế, cần hỗ trợ trước khóa học | Học viên thiếu kiến thức cơ bản, cần đào tạo bổ sung toàn diện |
| **Learning Style Match** (Phù hợp kiểu học) | Kiểu học được xác định rõ ràng, phù hợp hoàn toàn với định dạng khóa học | Kiểu học phù hợp khá tốt với hầu hết các tài nguyên | Kiểu học phù hợp trung bình, cần một số điều chỉnh | Kiểu học không phù hợp, cần điều chỉnh đáng kể hoặc định dạng thay thế |
| **Prior Knowledge** (Kiến thức trước) | Có kiến thức chuyên sâu trong các lĩnh vực liên quan, có thể vượt qua kiến thức cơ bản | Có kiến thức chắc chắn về các khái niệm liên quan | Có kiến thức hạn chế, một số khoảng trắng trong hiểu biết | Kiến thức trước không đủ, cần xây dựng lại từ đầu |
| **Motivation** (Động lực) | Có động lực cao, mục tiêu rõ ràng, cam kết lâu dài với việc học | Có động lực tốt, mục tiêu được xác định, sẵn sàng đầu tư thời gian | Có động lực trung bình, mục tiêu chưa rõ ràng, cần khuyến khích | Động lực thấp, thiếu mục tiêu cụ thể, cần hỗ trợ động lực |
| **Time Availability** (Khả năng thời gian) | Có 15+ giờ/tuần, lịch trình linh hoạt, có thể cam kết dài hạn | Có 10-15 giờ/tuần, lịch trình hợp lý | Có 5-10 giờ/tuần, lịch trình hạn chế | Dưới 5 giờ/tuần, lịch trình không linh hoạt, khó cam kết |

**Công thức tính Student Profile Score:**
```
Student Profile Score = (Readiness + Learning Style Match + Prior Knowledge + Motivation + Time Availability) / 5
Range: 0-100
```

---

### 4.2 Subject Mentor Validation (25%)

**Mô tả:** 12 chuyên gia ngành học đánh giá chất lượng, độ phù hợp, và tính đạo đức sư phạm của nội dung bài học.

**12 Domains (Lĩnh vực):**
1. Mathematics (Toán học)
2. Sciences (Khoa học tự nhiên)
3. Technology & Programming (Công nghệ & Lập trình)
4. Business & Economics (Kinh doanh & Kinh tế)
5. Languages & Communication (Ngôn ngữ & Giao tiếp)
6. Humanities & Social Sciences (Khoa học Nhân văn & Xã hội)
7. Arts & Design (Nghệ thuật & Thiết kế)
8. Health & Wellness (Sức khỏe & Phúc lợi)
9. Engineering & Manufacturing (Kỹ thuật & Sản xuất)
10. Environmental Sciences (Khoa học Môi trường)
11. Digital Skills & Data (Kỹ năng Số & Dữ liệu)
12. Professional Development (Phát triển Chuyên môn)

**Bảng Rubric cho từng Tiêu chí**

#### Tiêu chí 1: Content Accuracy (Độ chính xác nội dung)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Nội dung chính xác 100%, được xác minh bởi các nguồn tin cậy, không có lỗi hoặc sai lệch |
| Tốt | 51-75 | Nội dung hầu như chính xác, có thể có 1-2 lỗi nhỏ, không ảnh hưởng đến ý chính |
| Trung bình | 26-50 | Nội dung có một số lỗi, có thể gây nhầm lẫn nhưng có thể sửa chữa |
| Cần cải thiện | 0-25 | Nội dung có sai lệch đáng kể hoặc khái niệm sai, cần xem xét lại toàn bộ |

#### Tiêu chí 2: Difficulty Appropriateness (Độ phù hợp khó khăn)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Mức độ khó khăn hoàn toàn phù hợp với Student Profile, đủ thách thức nhưng không quá khó |
| Tốt | 51-75 | Mức độ khó khăn phù hợp khá tốt, có thể cần điều chỉnh nhỏ |
| Trung bình | 26-50 | Mức độ khó khăn có phần quá dễ hoặc quá khó, cần xem xét điều chỉnh |
| Cần cải thiện | 0-25 | Mức độ khó khăn không phù hợp, hoàn toàn không phù hợp với Student Profile |

#### Tiêu chí 3: Prerequisite Completeness (Tính đầy đủ tiên quyết)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Tất cả các tiên quyết được xác định rõ ràng, các bài học chuẩn bị đầy đủ |
| Tốt | 51-75 | Hầu hết các tiên quyết được xác định, một số có thể được suy luận |
| Trung bình | 26-50 | Một số tiên quyết bị thiếu hoặc không rõ ràng |
| Cần cải thiện | 0-25 | Thiếu nhiều tiên quyết, có khoảng trắng đáng kể trong chuỗi kiến thức |

#### Tiêu chí 4: Pedagogical Soundness (Tính âm thanh sư phạm)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Nội dung sử dụng các phương pháp giảng dạy tốt nhất, tương tác cao, khuyến khích suy nghĩ |
| Tốt | 51-75 | Nội dung sử dụng các phương pháp giảng dạy tốt, có độ tương tác hợp lý |
| Trung bình | 26-50 | Nội dung có một số vấn đề với phương pháp giảng dạy, có thể cải thiện độ tương tác |
| Cần cải thiện | 0-25 | Nội dung sử dụng phương pháp giảng dạy lỗi thời, ít tương tác, hiệu quả học tập thấp |

**Công thức tính Subject Mentor Validation Score:**
```
Subject Mentor Score = (Content Accuracy + Difficulty Appropriateness + Prerequisite Completeness + Pedagogical Soundness) / 4
Range: 0-100

Final Score = Trung bình điểm từ 12 domains
```

---

### 4.3 Cross-Disciplinary Panel (20%)

**Mô tả:** Một hội đồng gồm các chuyên gia từ các lĩnh vực khác nhau đánh giá cách nội dung kết nối với các ngành học khác, tính liên kết, và ứng dụng thực tiễn.

**Bảng Rubric - 4 Tiêu chí**

#### Tiêu chí 1: Transition Quality (Chất lượng chuyển tiếp)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Các chuyển tiếp giữa các lĩnh vực mượt mà, hợp lý, học viên có thể dễ dàng theo dõi |
| Tốt | 51-75 | Các chuyển tiếp tốt, có thể có một số chỗ cần làm rõ |
| Trung bình | 26-50 | Các chuyển tiếp có phần gấp gáp, cần giải thích thêm |
| Cần cải thiện | 0-25 | Các chuyển tiếp thiếu hoặc rất gây bối rối |

#### Tiêu chí 2: Knowledge Integration (Tích hợp kiến thức)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Kiến thức từ nhiều lĩnh vực được tích hợp hoàn hảo, tạo ra hiểu biết toàn diện |
| Tốt | 51-75 | Kiến thức được tích hợp tốt, hầu hết các lĩnh vực liên quan được kết nối |
| Trung bình | 26-50 | Kiến thức được tích hợp một phần, một số lĩnh vực bị bỏ sót |
| Cần cải thiện | 0-25 | Kiến thức không được tích hợp, mỗi phần tách biệt hoàn toàn |

#### Tiêu chí 3: Practical Relevance (Tính liên quan thực tiễn)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Nội dung có ứng dụng thực tiễn cao, học viên thấy được giá trị trong thế giới thực |
| Tốt | 51-75 | Nội dung có ứng dụng thực tiễn tốt, hầu hết bài học có ví dụ thực tế |
| Trung bình | 26-50 | Nội dung có một số ứng dụng thực tiễn, nhưng chủ yếu là lý thuyết |
| Cần cải thiện | 0-25 | Nội dung ít hoặc không có ứng dụng thực tiễn rõ ràng |

#### Tiêu chí 4: Coherence (Sự kết hợp logic)

| Mức | Điểm | Mô tả |
|-----|------|-------|
| Xuất sắc | 76-100 | Tất cả các phần tạo thành một tổng thể logic, không có mâu thuẫn |
| Tốt | 51-75 | Phần lớn các phần tạo thành một tổng thể logic |
| Trung bình | 26-50 | Một số phần logic, nhưng có những mâu thuẫn nhỏ |
| Cần cải thiện | 0-25 | Thiếu logic, nhiều mâu thuẫn |

**Cấp độ Consensus (Thỏa thuận)**

| Cấp độ | Mô tả | Trọng số |
|--------|-------|---------|
| Unanimous (Nhất trí) | Tất cả thành viên hội đồng đều đồng ý | 1.0 (100%) |
| Majority (Đa số) | 3/4 hoặc hơn đồng ý | 0.85 (85%) |
| Split (Chia rẽ) | 2/4 đồng ý, 2/4 không đồng ý | 0.60 (60%) |
| Disagreement (Không đồng ý) | Dưới 2/4 đồng ý | 0.40 (40%) |

**Công thức tính Cross-Disciplinary Panel Score:**
```
Panel Score = (Transition Quality + Knowledge Integration + Practical Relevance + Coherence) / 4
Consensus Adjusted Score = Panel Score × Consensus Weight
Final Score = Trung bình từ tất cả panel evaluations
Range: 0-100
```

---

### 4.4 AI Scoring Matrix (20%)

**Mô tả:** Đánh giá hiệu quả của 4 nền tảng AI (OpenAI, Gemini, Grok, Claude) dựa trên hồ sơ học viên và yêu cầu khóa học.

**4 Nền tảng AI:**
1. **OpenAI** (GPT-4, GPT-4o)
2. **Gemini** (Google)
3. **Grok** (xAI)
4. **Claude** (Anthropic)

**6 Chiều đánh giá (Dimensions)**

#### Chiều 1: Content Quality (Chất lượng nội dung)

| Mức | Điểm | Tiêu chí |
|-----|------|---------|
| Xuất sắc | 76-100 | Nội dung chính xác, chi tiết, có cấu trúc tốt, sâu sắc |
| Tốt | 51-75 | Nội dung hầu như chính xác, có cấu trúc tốt |
| Trung bình | 26-50 | Nội dung đúng nhưng thiếu chi tiết hoặc cấu trúc |
| Cần cải thiện | 0-25 | Nội dung cơ bản, thiếu sâu sắc |

#### Chiều 2: Personalization (Cá nhân hóa)

| Mức | Điểm | Tiêu chí |
|-----|------|---------|
| Xuất sắc | 76-100 | Nội dung được điều chỉnh hoàn toàn cho học viên, phù hợp kiểu học tập |
| Tốt | 51-75 | Nội dung được điều chỉnh tốt cho học viên |
| Trung bình | 26-50 | Nội dung có một số điều chỉnh cá nhân |
| Cần cải thiện | 0-25 | Nội dung chung chung, không cá nhân hóa |

#### Chiều 3: Interactivity (Tính tương tác)

| Mức | Điểm | Tiêu chí |
|-----|------|---------|
| Xuất sắc | 76-100 | Nội dung có độ tương tác cao, khuyến khích tham gia học viên |
| Tốt | 51-75 | Nội dung có độ tương tác tốt |
| Trung bình | 26-50 | Nội dung có một số yếu tố tương tác |
| Cần cải thiện | 0-25 | Nội dung tương tác thấp, chủ yếu là đơn chiều |

#### Chiều 4: Cost Efficiency (Hiệu quả chi phí)

| Mức | Điểm | Tiêu chí |
|-----|------|---------|
| Xuất sắc | 76-100 | Giá cả rất hợp lý, giá trị cao với chi phí thấp |
| Tốt | 51-75 | Giá cả hợp lý, giá trị tốt |
| Trung bình | 26-50 | Giá cả trung bình, giá trị trung bình |
| Cần cải thiện | 0-25 | Giá cả cao, giá trị thấp |

#### Chiều 5: Domain Expertise (Chuyên gia ngành)

| Mức | Điểm | Tiêu chí |
|-----|------|---------|
| Xuất sắc | 76-100 | Nền tảng có chuyên gia ngành tốt, cung cấp insights chuyên sâu |
| Tốt | 51-75 | Nền tảng có kiến thức ngành tốt |
| Trung bình | 26-50 | Nền tảng có kiến thức cơ bản về ngành |
| Cần cải thiện | 0-25 | Nền tảng thiếu kiến thức chuyên sâu |

#### Chiều 6: Language Support (Hỗ trợ ngôn ngữ)

| Mức | Điểm | Tiêu chí |
|-----|------|---------|
| Xuất sắc | 76-100 | Hỗ trợ toàn bộ ngôn ngữ, có khả năng dịch chính xác |
| Tốt | 51-75 | Hỗ trợ tốt các ngôn ngữ chính |
| Trung bình | 26-50 | Hỗ trợ một số ngôn ngữ |
| Cần cải thiện | 0-25 | Hỗ trợ ngôn ngữ hạn chế |

**Logic tính điểm AI Platform dựa trên Student Profile:**

```
Platform Score = (Content Quality + Personalization + Interactivity + Cost Efficiency + Domain Expertise + Language Support) / 6

Điều chỉnh dựa trên Student Profile:
- Nếu Learning Style = Visual: Tăng Interactivity weight
- Nếu Prior Knowledge = Low: Tăng Content Quality & Personalization weight
- Nếu Time Availability = Low: Tăng Cost Efficiency weight
- Nếu Language ≠ English: Tăng Language Support weight

Final Platform Score = Platform Score × Weighted Adjustments
Range: 0-100

AI Scoring Matrix Final = Trung bình từ 4 platforms, chọn platform tối ưu
```

---

## 5. Form khảo sát người học (Learning Survey)

### 5.1 Cấu trúc tổng quan

**Tổng cộng:** 6 phần, 23 câu hỏi
**Thời gian hoàn thành:** 10-15 phút
**Format:** Mix của multiple choice, rating scale, và text input

### 5.2 Chi tiết từng phần và câu hỏi

#### PHẦN 1: Thông tin cá nhân (3 câu)

| # | Câu hỏi | Loại Input | Options/Mô tả |
|---|---------|-----------|----------------|
| 1 | Bạn tên gì? | Text Input | Tên đầy đủ |
| 2 | Trình độ học vấn hiện tại của bạn? | Dropdown | Cấp trung học, Đại học, Thạc sĩ, Tiến sĩ, Khác |
| 3 | Số năm kinh nghiệm làm việc của bạn? | Dropdown | Không có, 0-2 năm, 2-5 năm, 5-10 năm, 10+ năm |

#### PHẦN 2: Mục tiêu và động lực học tập (3 câu)

| # | Câu hỏi | Loại Input | Options/Mô tả |
|---|---------|-----------|----------------|
| 4 | Mục tiêu chính của bạn với khóa học này là gì? | Text Area | Mô tả chi tiết |
| 5 | Mức độ động lực của bạn hiện tại là bao nhiêu? | Rating Scale 1-5 | 1=Rất thấp, 5=Rất cao |
| 6 | Khóa học này sẽ giúp bạn đạt được mục tiêu nào? | Checkboxes | Phát triển kỹ năng, Thay đổi sự nghiệp, Đáp ứng yêu cầu công việc, Sáng tạo, Khác |

#### PHẦN 3: Kiến thức trước và nền tảng (4 câu)

| # | Câu hỏi | Loại Input | Options/Mô tả |
|---|---------|-----------|----------------|
| 7 | Bạn có kiến thức trước về chủ đề này không? | Radio | Không có kiến thức, Kiến thức cơ bản, Kiến thức trung bình, Kiến thức chuyên sâu |
| 8 | Danh sách các kỹ năng liên quan mà bạn đã có? | Checkboxes | [Liệt kê các kỹ năng cụ thể cho khóa học] |
| 9 | Bạn đã từng học tập online trước đây không? | Radio | Không bao giờ, Hiếm khi, Thỉnh thoảng, Thường xuyên |
| 10 | Nếu có, bạn cảm thấy thoải mái với việc học online đến mức nào? | Rating Scale 1-5 | 1=Rất không thoải mái, 5=Rất thoải mái |

#### PHẦN 4: Kiểu học tập và khả năng (4 câu)

| # | Câu hỏi | Loại Input | Options/Mô tả |
|---|---------|-----------|----------------|
| 11 | Kiểu học tập nào phù hợp nhất với bạn? | Radio | Visual (hình ảnh), Auditory (nghe), Kinesthetic (thực hành), Reading/Writing (đọc/viết) |
| 12 | Bạn cảm thấy như thế nào với các định dạng sau? | Checkboxes | Video tutorials, Interactive exercises, Text-based content, Live sessions, Asynchronous content |
| 13 | Tốc độ học tập ưa thích của bạn? | Radio | Rất nhanh, Nhanh, Bình thường, Chậm, Rất chậm |
| 14 | Bạn có khó khăn trong việc tập trung lâu dài không? | Radio | Có, rất khó, Có, nhưng đỡ, Không, tập trung tốt, Không vấn đề |

#### PHẦN 5: Khả năng thời gian (3 câu)

| # | Câu hỏi | Loại Input | Options/Mô tả |
|---|---------|-----------|----------------|
| 15 | Bạn có thể dành bao nhiêu thời gian/tuần cho khóa học? | Radio | 0-5 giờ, 5-10 giờ, 10-15 giờ, 15-20 giờ, 20+ giờ |
| 16 | Lịch trình học tập ưa thích của bạn? | Checkboxes | Buổi sáng, Buổi chiều, Buổi tối, Cuối tuần, Bất kỳ lúc nào |
| 17 | Bạn có thể cam kết trong bao lâu? | Radio | Ngắn hạn (1 tháng), Trung hạn (2-3 tháng), Dài hạn (6+ tháng) |

#### PHẦN 6: Nhu cầu hỗ trợ và công nghệ (6 câu)

| # | Câu hỏi | Loại Input | Options/Mô tả |
|---|---------|-----------|----------------|
| 18 | Mức độ hỗ trợ mà bạn cần? | Radio | Độc lập hoàn toàn, Hỗ trợ tối thiểu, Hỗ trợ vừa phải, Hỗ trợ nhiều |
| 19 | Bạn sử dụng công nghệ nào thường xuyên? | Checkboxes | Desktop, Laptop, Tablet, Smartphone, Khác |
| 20 | Kết nối internet của bạn ổn định không? | Radio | Rất không ổn định, Chủ yếu không ổn định, Khá ổn định, Rất ổn định |
| 21 | Bạn có trải nghiệm sử dụng các nền tảng AI không? | Radio | Không bao giờ, Hiếm khi, Thỉnh thoảng, Thường xuyên |
| 22 | Ngôn ngữ ưa thích của bạn? | Dropdown | Tiếng Việt, Tiếng Anh, Tiếng Trung, Khác |
| 23 | Có yêu cầu đặc biệt nào bạn muốn chúng tôi biết? | Text Area | Mô tả chi tiết (tuỳ chọn) |

---

## 6. Hệ thống đánh giá lại (Re-Assessment System)

### 6.1 Chu kỳ đánh giá lại (Reassessment Cycles)

**Lịch trình cơ bản:**
- **Sau mỗi module hoàn thành:** Đánh giá kiến thức ngay sau hoàn thành
- **Định kỳ theo Spaced Repetition:** 2-4 tuần sau lần trước
- **Adaptive triggers:** Khi đạt các ngưỡng nhất định

### 6.2 Tám loại Trigger Adaptive (8 Trigger Types)

| Trigger # | Tên | Điều kiện kích hoạt | Hành động | Ngưỡng |
|-----------|-----|---------------------|----------|---------|
| 1 | Low Performance | Điểm bài kiểm tra < 50% | Cung cấp tài nguyên bổ sung, giảm tốc độ | <50% |
| 2 | High Performance | Điểm bài kiểm tra > 85% | Tăng độ khó, thêm nội dung nâng cao | >85% |
| 3 | Struggle Detection | Câu hỏi sai lặp lại > 2 lần | Cung cấp hint, giải thích chi tiết | >2 lần |
| 4 | Motivation Drop | Hoàn thành bài học < 70% | Gửi thông báo khuyến khích, điều chỉnh nội dung | <70% |
| 5 | Schedule Deviation | Học viên thiếu bài học > 2 tuần | Gửi nhắc nhở, xem xét điều chỉnh lịch | >2 tuần |
| 6 | Learning Pace Mismatch | Thời gian hoàn thành chệch hơn 50% dự kiến | Điều chỉnh tốc độ, thêm/bớt nội dung | ±50% |
| 7 | Prerequisite Gap | Điểm tiên quyết < 60% | Yêu cầu xem lại tiên quyết trước khi tiếp tục | <60% |
| 8 | Learning Style Ineffectiveness | Hiệu quả học tập < 40% trong định dạng hiện tại | Đề xuất chuyển đổi định dạng | <40% |

### 6.3 Quy trình đánh giá lại (Re-Assessment Flow)

```
┌─────────────────────────────────────────────────┐
│ 1. Kiểm tra Trigger Điều kiện kích hoạt        │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 2. Gửi Thông báo đánh giá lại cho học viên      │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 3. Học viên hoàn thành khảo sát đánh giá lại    │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 4. Hệ thống tính toán điểm Student Profile mới  │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 5. So sánh với Composite Assessment cũ          │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 6. Xác định thay đổi lộ trình                   │
│    - Giữ nguyên lộ trình                        │
│    - Điều chỉnh nhẹ                             │
│    - Thay đổi đáng kể                           │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 7. Cập nhật lộ trình học tập                    │
└──────────────┬──────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────────┐
│ 8. Gửi thông báo cập nhật cho học viên          │
└─────────────────────────────────────────────────┘
```

### 6.4 Tiêu chí điều chỉnh lộ trình

**Giữ nguyên lộ trình:**
- Thay đổi Composite Assessment < 10 điểm
- Không có trigger adaptive kích hoạt

**Điều chỉnh nhẹ:**
- Thay đổi Composite Assessment 10-25 điểm
- 1-2 trigger kích hoạt
- Tăng/giảm tốc độ, thêm bổ sung nhỏ

**Thay đổi đáng kể:**
- Thay đổi Composite Assessment > 25 điểm
- 3+ trigger kích hoạt
- Xây dựng lại lộ trình, thay đổi nền tảng AI

---

## 7. Cấu trúc Files (File Structure)

### 7.1 Tổ chức thư mục

```
/learning-paths/
├── /assessment-rubric/
│   ├── student-profile.json          # Mẫu dữ liệu Student Profile
│   ├── subject-mentor-validation.json # Mẫu dữ liệu Subject Mentor
│   ├── cross-disciplinary-panel.json  # Mẫu dữ liệu Panel
│   ├── ai-scoring-matrix.json         # Mẫu dữ liệu AI Scoring
│   └── composite-assessment.json      # Mẫu tính toán tổng hợp
│
├── /survey/
│   ├── learning-survey.json           # Cấu trúc khảo sát
│   ├── survey-responses.json          # Phản hồi khảo sát
│   └── survey-schema.json             # JSON Schema cho validation
│
├── /scoring-engine/
│   ├── student-profile-calculator.js  # Tính điểm Student Profile
│   ├── mentor-validator.js            # Xác thực từ mentors
│   ├── panel-aggregator.js            # Tổng hợp hội đồng
│   ├── ai-scorer.js                   # Tính điểm AI platforms
│   └── composite-calculator.js        # Tính Composite Score
│
├── /path-generation/
│   ├── path-generator.js              # Tạo lộ trình
│   ├── content-matcher.js             # Khớp nội dung
│   ├── prerequisite-mapper.js         # Ánh xạ tiên quyết
│   └── spaced-repetition.js           # Lập lịch Spaced Repetition
│
├── /reassessment/
│   ├── trigger-detector.js            # Phát hiện Triggers
│   ├── reassessment-scheduler.js      # Lên lịch đánh giá lại
│   ├── adaptive-adjustor.js           # Điều chỉnh Adaptive
│   └── reassessment-flow.js           # Quy trình đánh giá lại
│
├── /database/
│   ├── students.db                    # Dữ liệu học viên
│   ├── assessments.db                 # Dữ liệu đánh giá
│   ├── learning-paths.db              # Lộ trình học tập
│   └── reassessments.db               # Dữ liệu đánh giá lại
│
└── /ui/
    ├── survey-form.vue                # Component biểu mẫu khảo sát
    ├── assessment-dashboard.vue       # Dashboard kết quả
    ├── path-viewer.vue                # Xem lộ trình
    └── reassessment-modal.vue         # Modal đánh giá lại
```

### 7.2 Mô tả File chính

#### a) assessment-rubric/student-profile.json
Mẫu lưu trữ thông tin Profile của học viên sau khi hoàn thành khảo sát

```json
{
  "studentId": "STU-001",
  "surveyDate": "2026-03-24",
  "criteria": {
    "readiness": {
      "score": 75,
      "level": "Tốt",
      "notes": "Có nền tảng kiến thức tốt"
    },
    "learningStyleMatch": {
      "score": 82,
      "level": "Xuất sắc",
      "preference": "Visual"
    },
    "priorKnowledge": {
      "score": 65,
      "level": "Tốt"
    },
    "motivation": {
      "score": 88,
      "level": "Xuất sắc"
    },
    "timeAvailability": {
      "score": 60,
      "level": "Tốt",
      "hoursPerWeek": 12
    }
  },
  "studentProfileScore": 74,
  "weightage": 0.35
}
```

#### b) scoring-engine/composite-calculator.js
Hàm tính Composite Assessment Score từ 4 yếu tố

```javascript
function calculateCompositeScore(
  studentProfile,      // 35%
  subjectMentor,       // 25%
  crossDisciplinary,   // 20%
  aiScoringMatrix      // 20%
) {
  const composite = (
    studentProfile * 0.35 +
    subjectMentor * 0.25 +
    crossDisciplinary * 0.20 +
    aiScoringMatrix * 0.20
  );

  return Math.round(composite);
}
```

#### c) reassessment/trigger-detector.js
Phát hiện các trigger kích hoạt đánh giá lại

```javascript
function detectTriggers(learningData) {
  const triggers = [];

  if (learningData.quizScore < 50) {
    triggers.push({
      type: 'Low Performance',
      priority: 'High'
    });
  }

  // ... các trigger khác

  return triggers;
}
```

---

## 8. Tích hợp vào /learning-paths UI

### 8.1 User Journey (Hành trình người dùng)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Học viên truy cập trang /learning-paths                   │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. Hệ thống kiểm tra - Đã hoàn thành khảo sát?               │
│    - Nếu không → Bắt buộc điền khảo sát                      │
│    - Nếu có → Hiển thị lộ trình hiện tại                     │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. Hiển thị SURVEY FORM nếu là lần đầu                       │
│    - 6 phần, 23 câu hỏi                                      │
│    - Tiến trình: 0%, 20%, 40%, 60%, 80%, 100%                │
│    - Nút: Previous, Next, Submit                             │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. Sau khi Submit → Hiển thị LOADING SCREEN                  │
│    "Đang tính toán Composite Assessment Score..."            │
│    - Background: Tính điểm Student Profile (tức thì)        │
│    - Gọi API: Subject Mentor Validation (5-10 phút)          │
│    - Gọi API: Cross-Disciplinary Panel (10-15 phút)          │
│    - Gọi API: AI Scoring Matrix (5 phút)                     │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. Hiển thị ASSESSMENT DASHBOARD                             │
│    ┌────────────────────────────────────────────────────────┐│
│    │ Student Profile Score: 74/100 (Tốt)                   ││
│    │ Subject Mentor Validation: 78/100 (Xuất sắc)           ││
│    │ Cross-Disciplinary Panel: 72/100 (Tốt)                ││
│    │ AI Scoring Matrix: 76/100 (Xuất sắc)                  ││
│    │ ───────────────────────────────────────────────────── ││
│    │ COMPOSITE ASSESSMENT SCORE: 75/100 (Tốt)              ││
│    └────────────────────────────────────────────────────────┘│
│    ┌────────────────────────────────────────────────────────┐│
│    │ Recommended AI Platform: Claude (78/100)                ││
│    │ Learning Style: Visual                                 ││
│    │ Estimated Duration: 4-6 tuần                           ││
│    │ Difficulty Level: Trung bình                           ││
│    └────────────────────────────────────────────────────────┘│
│    Nút: "View My Learning Path", "Retake Assessment"         │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. Click "View My Learning Path" → Hiển thị LEARNING PATH    │
│    ┌────────────────────────────────────────────────────────┐│
│    │ Module 1: Giới thiệu cơ bản                            ││
│    │  ├─ Bài 1.1 (Video)          [Hoàn thành ✓]          ││
│    │  ├─ Bài 1.2 (Interactive)    [Đang học...]           ││
│    │  └─ Bài 1.3 (Quiz)           [Chưa bắt đầu]          ││
│    │ Module 2: Khái niệm nâng cao                          ││
│    │  ├─ Bài 2.1 (Reading)        [Chưa bắt đầu]          ││
│    │  └─ Bài 2.2 (Practical)      [Chưa bắt đầu]          ││
│    │ Module 3: Ứng dụng thực tiễn                          ││
│    │  └─ Bài 3.1 (Project)        [Chưa bắt đầu]          ││
│    └────────────────────────────────────────────────────────┘│
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 7. Sau khoảng thời gian → Trigger Re-Assessment              │
│    Hiển thị MODAL: "Giờ là lúc đánh giá lại tiến độ"        │
│    Nút: "Take Reassessment Now", "Remind Later"              │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 8. Quay lại bước 3 (Điền khảo sát đánh giá lại)              │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 UI Components

#### Component 1: Survey Form
```vue
<template>
  <div class="survey-container">
    <div class="progress-bar">
      <div :style="{ width: progress + '%' }"></div>
    </div>

    <div class="section">
      <h2>{{ currentSection.title }}</h2>
      <div class="questions">
        <div v-for="question in currentSection.questions" :key="question.id">
          <!-- Input types: text, textarea, radio, checkbox, dropdown, rating -->
        </div>
      </div>
    </div>

    <div class="navigation">
      <button @click="previousSection" :disabled="isFirstSection">
        Quay lại
      </button>
      <button v-if="!isLastSection" @click="nextSection">
        Tiếp theo
      </button>
      <button v-else @click="submitSurvey">
        Gửi khảo sát
      </button>
    </div>
  </div>
</template>
```

#### Component 2: Assessment Dashboard
```vue
<template>
  <div class="assessment-dashboard">
    <h1>Kết quả đánh giá của bạn</h1>

    <div class="score-cards">
      <div class="score-card">
        <h3>Student Profile</h3>
        <div class="score">{{ studentProfileScore }}</div>
        <div class="level">{{ getLevel(studentProfileScore) }}</div>
      </div>
      <!-- Các card khác -->
    </div>

    <div class="composite-section">
      <h2>Composite Assessment Score</h2>
      <div class="composite-score">{{ compositeScore }}</div>
      <div class="recommendations">
        <p>Nền tảng AI được đề xuất: {{ recommendedPlatform }}</p>
        <p>Kiểu học tập: {{ learningStyle }}</p>
        <p>Thời gian dự kiến: {{ estimatedDuration }}</p>
      </div>
    </div>

    <div class="actions">
      <button @click="viewPath">Xem lộ trình của tôi</button>
      <button @click="retakeAssessment">Làm lại bài đánh giá</button>
    </div>
  </div>
</template>
```

#### Component 3: Learning Path Viewer
```vue
<template>
  <div class="learning-path-viewer">
    <h1>Lộ trình học tập của bạn</h1>

    <div class="path-overview">
      <div class="stats">
        <div>Tổng modules: {{ modules.length }}</div>
        <div>Hoàn thành: {{ completedCount }}/{{ modules.length }}</div>
        <div>Tiến độ: {{ progressPercentage }}%</div>
      </div>
    </div>

    <div class="modules">
      <div v-for="module in modules" :key="module.id" class="module">
        <h3>{{ module.title }}</h3>
        <div class="lessons">
          <div v-for="lesson in module.lessons" :key="lesson.id" class="lesson">
            <div class="lesson-title">{{ lesson.title }}</div>
            <div class="lesson-status">{{ lesson.status }}</div>
            <div class="lesson-type">{{ lesson.type }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### Component 4: Reassessment Modal
```vue
<template>
  <div class="reassessment-modal" v-if="showModal">
    <div class="modal-content">
      <h2>Đánh giá lại tiến độ</h2>
      <p>Dựa trên hoạt động gần đây, giờ là lúc đánh giá lại.</p>
      <p class="reason">{{ triggerReason }}</p>

      <div class="actions">
        <button @click="startReassessment" class="primary">
          Bắt đầu đánh giá lại
        </button>
        <button @click="remindLater" class="secondary">
          Nhắc tôi lúc khác
        </button>
      </div>
    </div>
  </div>
</template>
```

### 8.3 Data Flow Integration

```
Learning Paths UI
     ↓
Survey Module
     ↓
Scoring Engine
  ├─ Student Profile Calculator
  ├─ Subject Mentor Validator
  ├─ Cross-Disciplinary Aggregator
  └─ AI Scoring Calculator
     ↓
Composite Assessment Calculator
     ↓
Path Generator
     ↓
Learning Path Display
     ↓
(Học viên học tập)
     ↓
Trigger Detector
     ↓
Re-Assessment Scheduler
     ↓
(Lặp lại)
```

### 8.4 API Endpoints

```
POST   /api/assessment/survey          # Gửi khảo sát
GET    /api/assessment/scores/{id}     # Lấy điểm
POST   /api/assessment/composite       # Tính Composite Score
GET    /api/learning-path/{id}         # Lấy lộ trình
POST   /api/reassessment/trigger       # Kiểm tra trigger
POST   /api/reassessment/start         # Bắt đầu đánh giá lại
PUT    /api/learning-path/{id}/update  # Cập nhật lộ trình
```

---

## Kết luận

Hệ thống Bảng Đánh Giá Lộ Trình Học Tập (Learning Path Assessment Rubric) tạo ra một quy trình toàn diện để:

1. **Đánh giá toàn diện** học viên dựa trên 5 tiêu chí chính
2. **Xác thực chất lượng** nội dung qua 12 chuyên gia ngành
3. **Đảm bảo tính liên kết** giữa các lĩnh vực kiến thức
4. **Lựa chọn công nghệ tối ưu** dựa trên hồ sơ học viên
5. **Điều chỉnh động** lộ trình dựa trên hiệu suất thực tế

Phương pháp này kết hợp lý thuyết học tập hiện đại với công nghệ AI, tạo ra các lộ trình học tập thực sự cá nhân hóa và hiệu quả cho từng học viên.
