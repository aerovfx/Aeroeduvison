# ĐỀ CƯƠNG NGHIÊN CỨU KHOA HỌC

## Hệ thống học tập thích ứng đa kênh tích hợp nhận diện cảm xúc và khảo thí thông minh: Nghiên cứu trên nền tảng AeroEduVision

**Vai trò:** Nhà nghiên cứu khoa học cấp cao chuyên về trí tuệ nhân tạo  
**Định dạng:** Đề cương nghiên cứu học thuật  
**Nền tảng thực nghiệm:** AeroEduVision

---

## MỞ ĐẦU

### 1.1 Bối cảnh và vấn đề nghiên cứu

Giáo dục phổ thông và đại học đang đối mặt với áp lực cá nhân hóa học tập, đánh giá năng lực công bằng và tiết kiệm chi phí vận hành. Các hệ thống học tập thích ứng (Adaptive Learning Systems – ALS) và học tập thông minh (Smart Learning Environments – SLE) dựa trên trí tuệ nhân tạo (AI) đã xuất hiện trong hai thập kỷ qua, nhưng phần lớn tập trung vào một trong ba trụ cột: (i) thích ứng nội dung theo năng lực, (ii) nhận diện trạng thái cảm xúc/engagement (affective computing), hoặc (iii) khảo thí và đánh giá tự động. Việc tích hợp cả ba trụ cột trong một nền tảng thống nhất, với dữ liệu đa kênh (multimodal) và quy trình khảo thí từ số hóa tài liệu đến sinh đề thi tự động, vẫn còn là khoảng trống nghiên cứu và triển khai thực tế.

Nền tảng **AeroEduVision** là một ứng dụng học tập trực tuyến đa vai trò (học viên, giáo viên, quản trị), tích hợp: AI Tutor với lộ trình cá nhân hóa và Personal Learning Graph (PLG); Vision Tracker nhận diện biểu cảm khuôn mặt (22 loại) với lưu trữ gộp theo cửa sổ thời gian; số hóa tài liệu (OCR, cấu trúc hóa) và pipeline khảo thí (ma trận đề → ngân hàng câu hỏi → sinh đề thi tự động từ ngân hàng); thí nghiệm ảo (LabTwin) và dự án STEM. Đề tài nghiên cứu này đặt ra câu hỏi: *Làm thế nào có thể xây dựng một khung lý thuyết và phương pháp thực nghiệm để đánh giá và mở rộng hệ thống học tập thích ứng đa kênh tích hợp affective computing và khảo thí thông minh trên nền tảng AeroEduVision, so với các nghiên cứu tương tự đã có?*

### 1.2 Mục tiêu nghiên cứu

1. Phân tích điểm mới (novelty) của cách tiếp cận tích hợp so với ít nhất ba nghiên cứu tương tự, xác định khoảng trống nghiên cứu (research gap) và đóng góp lý thuyết.
2. Làm rõ tính sáng tạo về phương pháp/kỹ thuật, góc nhìn liên ngành và tiềm năng phá vỡ mô hình cũ.
3. Đề xuất hướng nghiên cứu tiếp theo, khả năng ứng dụng thực tiễn trong năm năm tới và tiềm năng thương mại hóa hoặc chính sách.

### 1.3 Phương pháp nghiên cứu

Đề tài sử dụng phương pháp nghiên cứu hỗn hợp (mixed methods): (i) **Phân tích tài liệu và so sánh hệ thống:** thu thập, phân tích các nghiên cứu và sản phẩm tiêu biểu trong ba lĩnh vực (adaptive learning, affective computing in education, intelligent assessment) để xác định vị trí của AeroEduVision và khoảng trống nghiên cứu. (ii) **Phân tích kiến trúc và thiết kế:** mô tả có hệ thống kiến trúc nền tảng (phân quyền student/teacher/admin), luồng dữ liệu (emotion capture → aggregation → stats API; document → OCR → matrix → question bank → exam generation) và các quyết định thiết kế (EDRP, TILIA). (iii) **Khung lý thuyết:** xây dựng khung MIF, mô hình TILIA và nguyên tắc EDRP dựa trên tổng hợp tài liệu và đặc tả kỹ thuật của nền tảng. (iv) **Đề xuất hướng nghiên cứu tiếp theo:** từ khoảng trống và đóng góp lý thuyết, đề xuất các thí nghiệm và triển khai cụ thể (A/B test AI Tutor + emotion, mở rộng đa trường, nghiên cứu đạo đức và chính sách). Phạm vi đề cương tập trung vào phân tích và đề xuất; việc triển khai thực nghiệm và thu thập dữ liệu định lượng sẽ là giai đoạn tiếp theo sau khi đề cương được phê duyệt.

---

## 2. PHÂN TÍCH KỸ THUẬT VÀ KIẾN TRÚC NỀN TẢNG AEROEDUVISION

Phần này bổ sung phân tích dựa trên khám phá sâu codebase và tài liệu kỹ thuật của nền tảng, nhằm làm rõ phạm vi chức năng và kiến trúc kỹ thuật làm cơ sở cho đề tài.

### 2.1 Dashboard và tính năng theo vai trò

**Học viên (Student):** Dashboard chính (`/dashboard`), học tập (`/dashboard/learning`), quiz, thành tích (gamification, XP), khóa học đã đăng ký, hồ sơ, analytics cá nhân, LabTwin (lab tương tác), ghi chú, Scrum board, danh bạ, đổi mật khẩu, thông báo, tùy chọn giao diện. Các module chuyên biệt: lộ trình học do AI điều phối (`/learning-paths`, `/learning-paths-demo` theo môn Toán/Lý/Hóa/Sinh), AI Tutor (`/ai-tutor`), chat và tranh luận (`/chat`), thi đua (`/competition`).

**Giáo viên (Teacher):** Dashboard giảng dạy (`/teacher/dashboard`), quản lý lớp và học viên, bài tập và chấm điểm, ma trận đề (kèm OCR), chấm thi (tự động + con người), báo cáo đề thi, ngân hàng câu hỏi, vòng đời đề thi, AI Dashboard, lịch dạy, tạo nội dung, xây lộ trình đa môn, trung tâm tương tác, luồng hệ thống, số hóa tài liệu, analytics lớp.

**Quản trị (Admin):** Tổng quan hệ thống (`/admin/overview`, `/admin/dashboard`), quản lý học viên/giáo viên, quản lý nội dung, cấu hình model AI, vận hành, cảnh báo, học viên có nguy cơ (at-risk), analytics cảm xúc (`/admin/emotion`), cài đặt hệ thống.

Sự phân tách rõ theo vai trò (hơn 15 route cho mỗi vai trò chính) cho thấy nền tảng được thiết kế cho triển khai thực tế tại trường học, phù hợp nghiên cứu tích hợp đa kênh trong bối cảnh đa vai trò.

### 2.2 Các module AI/ML trọng tâm

**Vision Tracker (cảm xúc và chú ý):** MediaPipe FaceLandmarker (face detection), nhận diện 22 biểu cảm (happy, neutral, focused, stressed, motivated, tired, v.v.) với điểm tin cậy 0–100%; Hệ thống Mã hóa Hành động Khuôn mặt (FACS) với 7 Action Units (AU1, AU2, AU4, AU5, AU6, AU12, AU15) và ánh xạ blendshape; nhận diện cử chỉ tay (sign language, pinch strength, finger extension); heatmap chú ý lớp học. Dữ liệu cảm xúc được buffer phía client, gửi batch mỗi 30 giây và gộp theo cửa sổ 1 phút (emotionCounts, avgConfidence, sampleCount) để giảm tải server và lưu trữ — đây là triển khai cụ thể của EDRP đã nêu trong đóng góp lý thuyết.

**AI Tutor:** Thích ứng độ khó theo trạng thái cảm xúc; thiết lập mục tiêu nhiều bước (đánh giá cảm xúc → chọn môn/mục tiêu → tự đánh giá trình độ); kế hoạch học tập hàng ngày do AI tạo; theo dõi phiên học, XP, phản hồi thích ứng; gợi ý nghỉ giải lao và theo dõi năng lượng. Đây là ứng viên chính cho việc tích hợp tín hiệu từ EmotionCapture trong nghiên cứu tiếp theo.

**Sinh nội dung (Content Generation):** Nội dung đa định dạng (bài học, quiz, slide, kịch bản video); cache thông minh và tối ưu chi phí theo model; kiểm tra chất lượng tự động; xử lý batch (tới 20 mục song song); hỗ trợ nhiều nhà cung cấp (OpenAI, Gemini, Ollama).

**Chấm điểm thông minh:** Chấm bài tự luận theo rubric với AI; tích hợp OCR (số hóa bài viết tay); kiểm tra tính nhất quán giữa nhiều lần chấm; luồng chuyển sang người duyệt; phân tích chất lượng câu hỏi (discrimination index); chấm batch.

**RAG Agent (kiểu OpenFang):** Pipeline tài liệu (PDF/TXT/MD → trích văn bản → chunking → embedding); tìm kiếm ngữ nghĩa (vector); agent lập kế hoạch nhiều bước (search, index, summarize); tích hợp Ollama (LLM cục bộ, mặc định Qwen 2.5); công cụ tùy chỉnh (searchTool, indexTool, summarizeTool). Có thể mở rộng nghiên cứu cho việc hỗ trợ ôn tập và trả lời câu hỏi dựa trên tài liệu khóa học.

**Điều phối lộ trình học (Learning Path AI Coordinator):** Lộ trình đa môn (Toán, Lý, Hóa, Sinh, Tin, Âm nhạc, Nghệ thuật, Ngôn ngữ, Lịch sử, Địa lý); kết nối liên miền và chuyển tiếp tri thức; gán “người hướng dẫn” ảo với cân bằng tải; nút tri thức và theo dõi tiên quyết; bốn loại chuyển tiếp (prerequisite, application, enrichment, bridge).

**Ngân hàng câu hỏi:** Hỗ trợ MCQ, TRUE_FALSE, SHORT_ANSWER, ESSAY, CODE; chỉ số chất lượng (discrimination index, quality score); theo dõi sử dụng và hiệu năng; tạo câu hỏi bằng LLM; luồng duyệt bởi giáo viên; lọc theo chủ đề, môn, khối, độ khó, loại; gán câu vào ma trận đề cụ thể.

### 2.3 Lớp API và cơ sở dữ liệu

Nền tảng có khoảng 172 endpoint API trong hơn 100 thư mục route, nhóm chính gồm: xác thực (NextAuth và tiện ích); quản lý nội dung và sinh nội dung AI; chấm bài và đánh giá (grading, OCR, LLM, Ollama); đề thi và ngân hàng câu hỏi (exam-matrices, question-bank, exams); học tập và bài tập (learning-paths, assignments, progress, daily plan); lớp học và chat (classes, chat/rooms, chat/messages); xử lý tài liệu (documents, OCR); 12 API mô phỏng STEM (aeroflow-3d, motion-sim, projectile, refraction, harmonic-motion, chemlab, chemistry-lab, biogrowth, weather-sim, v.v.); vision và tracking (vision-tracker/emotion, motion-tracking); RAG, vector, tìm kiếm; AI Tutor và chat; tiện ích (health, metrics, upload, sync) và các route admin. Số lượng và độ phân tách theo chức năng phản ánh kiến trúc microservice-style trên một codebase Next.js, tạo điều kiện mở rộng và đo lường từng module trong nghiên cứu.

Cơ sở dữ liệu (Prisma/PostgreSQL) gồm các nhóm model chính: người dùng và phiên (User, Session, Account, AuthLog); quản lý học tập (Course, Chapter, Purchase, UserProgress, Class, ClassStudent); đề thi và câu hỏi (Exam, ExamQuestion, ExamMatrix, MatrixTopic, MatrixSelectedQuestion, QuestionDistribution, Question, MatrixProcessingLog); STEM và lab (STEMProject, STEMMilestone, LabCompletion, …); nội dung AI (AIGeneratedContent, FineTuneLesson, FineTuneExample, FineTuneRun); **EmotionCapture** (cửa sổ 1 phút: userId, windowStart, emotionCounts, avgConfidence, sampleCount); tài liệu (Document, DocumentFolder, DocumentProcessingLog); giao tiếp (ChatRoom, ChatMessage, ChatParticipant, DebateTopic, …). Schema EmotionCapture và luồng exam-matrix → question-bank → exam generation là hiện thân trực tiếp của EDRP và TILIA trong đề tài.

### 2.4 Mô phỏng STEM và luồng khảo thí

**Mô-đun STEM/Lab:** Hơn 12 lab mô phỏng, gồm Vật lý (motion, projectile, refraction, harmonic motion, aerodynamic flow 3D), Hóa học (chemlab, chemistry-lab 3D), Sinh học (biogrowth), Kỹ thuật (mechaforce, aeroflow), Thời tiết (weather-sim), và các lab nâng cao (wave function collapse). Các service chạy bằng Python (FastAPI), có Docker, tham số điều khiển và hệ thống XP khi hoàn thành. Điều này bổ sung kênh “hành vi thực hành” (lab completion, tham số thí nghiệm) có thể kết hợp với tín hiệu cảm xúc và năng lực trong khung MIF.

**Luồng khảo thí:** (1) Tạo: giáo viên thiết kế ma trận đề (có thể từ tài liệu đã số hóa). (2) Chọn câu: tự động hoặc thủ công từ ngân hàng câu hỏi (lọc môn, khối, mức độ, gán vào ma trận). (3) Phát đề: phân phối đề cho học viên. (4) Nộp bài: câu trả lời dạng văn bản, chữ viết tay, hoặc code. (5) Số hóa: OCR cho bài viết tay. (6) Chấm: AI + tùy chọn duyệt bởi người. (7) Phân tích: hiệu năng, discrimination index, chất lượng câu hỏi. Ma trận đề hỗ trợ phân bố theo thang nhận thức Bloom (Remember, Understand, Apply, Analyze, Evaluate, Create) và theo chủ đề, phù hợp mô hình TILIA.

### 2.5 Công nghệ nền và kiến trúc tổng quan

**Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS, Radix UI, Recharts, Lucide, React Hook Form, Zod, React Hot Toast, Three.js, Mux (video). **AI/ML:** OpenAI, Google Generative AI (Gemini), Ollama (Qwen 2.5), MediaPipe (vision), TensorFlow. **Backend & lưu trữ:** Prisma, PostgreSQL, Redis, BullMQ, Qdrant (vector cho RAG). **Lưu file:** GCS, S3, UploadThing. **Xác thực:** NextAuth (JWT/session). **Real-time:** Socket.io (chat, thông báo). **Thanh toán:** Stripe. **Python microservice:** FastAPI cho các lab Vật lý/Hóa học.

Kiến trúc tổng quan: Frontend (dashboard đa vai trò, Vision Tracker, AI Tutor) gọi REST API (172 endpoint); lớp API xử lý sinh nội dung, chấm bài, lộ trình học, đề thi/ngân hàng câu hỏi, mô phỏng STEM, RAG agent, WebSocket; phía dưới là các dịch vụ AI (LLM, embedding, vision), cơ sở dữ liệu (PostgreSQL, Qdrant), và lưu trữ file; bên ngoài kết nối OpenAI, Gemini, Ollama, MediaPipe, Mux, Socket.io, Stripe và các microservice Python. Phân tích này cho thấy nền tảng đủ phức tạp và đa thành phần để nghiên cứu tích hợp đa kênh, teacher-in-the-loop và affective computing trong môi trường gần với triển khai thực tế.

### 2.6 Các tính năng khác biệt tóm tắt (đối chiếu với EdTech khác)

Từ khám phá codebase có thể tóm tắt mười nhóm tính năng khác biệt phục vụ đề tài: (1) Vision Tracker với FACS, sign language, heatmap lớp và aggregation theo cửa sổ (privacy-preserving). (2) AI Tutor có “emotional intelligence” (điều chỉnh theo cảm xúc, mục tiêu nhiều bước, kế hoạch ngày). (3) Exam Matrix Builder kết hợp OCR, phân bố theo Bloom, chọn câu thông minh từ ngân hàng. (4) RAG Agent kiểu OpenFang (document ingestion, semantic search, agent với tools, Ollama). (5) Lộ trình đa môn với AI coordinator và panel liên ngành. (6) Hệ thống lab mô phỏng STEM đa dạng (12+ lab). (7) Chấm điểm thông minh kèm duyệt bởi người và chất lượng câu hỏi. (8) Hệ thống song ngữ (Việt–Anh). (9) Cộng tác real-time (chat, tranh luận, tương tác giáo viên–học viên). (10) Analytics nâng cao (learning velocity, competency, at-risk, cảm xúc). Các điểm này củng cố luận điểm về khoảng trống nghiên cứu (tích hợp đa kênh, EDRP, TILIA) và tính khả thi triển khai của đề tài trên AeroEduVision.

---

## PHẦN A. PHÂN TÍCH ĐIỂM MỚI (NOVELTY ANALYSIS)

### A.1 So sánh với ba nghiên cứu tương tự

Để định vị đề tài, chúng tôi so sánh với ba hướng nghiên cứu tiêu biểu: (1) hệ thống học tập thích ứng dựa trên knowledge graph và spaced repetition; (2) affective computing trong giáo dục (cảm xúc, engagement); (3) khảo thí thông minh và sinh đề thi tự động.

**Nghiên cứu 1: Knewton (và các hệ thống adaptive dựa trên Knowledge Graph / Item Response Theory)**  
Các hệ thống như Knewton (sau này là Wiley’s Knewton Alta) tập trung vào thích ứng nội dung và độ khó dựa trên mô hình năng lực học viên (IRT, Bayesian Knowledge Tracing – BKT) và đồ thị tri thức (knowledge graph). Điểm mạnh là cá nhân hóa theo năng lực và lộ trình học rõ ràng, với bằng chứng cải thiện điểm số trong một số môn (toán, khoa học). Tuy nhiên, các hệ thống này hầu như không tích hợp tín hiệu cảm xúc theo thời gian thực (affective state), không có pipeline số hóa tài liệu → ma trận đề → sinh đề thi từ ngân hàng câu hỏi, và thường không đặt giáo viên vào vòng điều khiển (teacher-in-the-loop) trong việc chỉnh sửa ma trận và ngân hàng câu hỏi. AeroEduVision bổ sung: (i) kênh cảm xúc từ Vision Tracker (blendshapes, 22 biểu cảm) được lưu gộp theo cửa sổ thời gian và dùng cho thống kê/feedback; (ii) pipeline khảo thí đầy đủ từ tài liệu đến đề thi; (iii) vai trò rõ ràng của giáo viên (tạo/sửa ma trận, ngân hàng câu hỏi, tạo đề từ ma trận).

**Nghiên cứu 2: Affective computing trong giáo dục (Bosch et al., D’Mello, các hệ thống phát hiện engagement từ face/EEG)**  
Nhiều công trình nghiên cứu nhận diện engagement, confusion, boredom từ video khuôn mặt hoặc tín hiệu sinh lý (EEG, GSR). Các hệ thống này cung cấp cơ sở lý thuyết cho việc “đọc” trạng thái người học nhưng thường triển khai trong môi trường phòng lab hoặc mô-đun độc lập, ít được nối trực tiếp với engine thích ứng nội dung và với quy trình khảo thí. Dữ liệu cảm xúc thường được xử lý theo từng phiên ngắn hoặc không có chiến lược giảm tải (data reduction) cho triển khai quy mô lớn. AeroEduVision đưa ra cách tiếp cận triển khai thực tế: capture biểu cảm trên client, gửi batch và gộp theo cửa sổ 1 phút (EmotionCapture), cho phép thống kê theo khoảng thời gian (phút/giờ/ngày) mà không lưu từng frame, từ đó vừa tiết kiệm băng thông và lưu trữ vừa cho phép tích hợp sau này với AI Tutor và báo cáo giáo viên/quản trị.

**Nghiên cứu 3: Khảo thí thông minh và Automated Item Generation (AIG) / Exam generation**  
Các nghiên cứu về AIG và sinh đề thi tự động thường dựa trên ngân hàng câu hỏi có sẵn với metadata (chủ đề, mức độ, loại câu). Một số hệ thống có ma trận đề (blueprint) nhưng ít kết nối đầu vào từ số hóa tài liệu (OCR → cấu trúc → trích xuất/ghi nhận câu hỏi). Pipeline “tài liệu PDF/ảnh → OCR → ma trận đề (do giáo viên chỉnh sửa) → ngân hàng câu hỏi (lọc môn, khối, mức độ) → sinh đề thi theo ma trận” trong AeroEduVision tạo ra một luồng end-to-end từ tài liệu in sang đề thi số, có sự tham gia của giáo viên ở các bước then chốt (review tài liệu số hóa, chỉnh ma trận, bổ sung câu hỏi, chọn ma trận để sinh đề). Đây là điểm khác biệt so với các nghiên cứu chỉ tập trung vào thuật toán chọn câu hoặc AIG từ template mà không gắn với nguồn tài liệu thực tế của nhà trường.

Bảng tóm tắt so sánh (định tính):

| Tiêu chí | Nghiên cứu 1 (Adaptive KG/IRT) | Nghiên cứu 2 (Affective Ed) | Nghiên cứu 3 (AIG/Exam) | Đề tài (AeroEduVision) |
|----------|---------------------------------|-----------------------------|--------------------------|-------------------------|
| Thích ứng nội dung theo năng lực | Có | Thường không chính | Một phần (đề thi) | Có (AI Tutor, PLG, Learning Path) |
| Tín hiệu cảm xúc/engagement | Không hoặc rất hạn chế | Có (trọng tâm) | Không | Có (Vision Tracker, lưu gộp, thống kê) |
| Số hóa tài liệu → ma trận → đề thi | Không | Không | Hiếm khi end-to-end | Có (pipeline đầy đủ) |
| Teacher-in-the-loop | Hạn chế | Hạn chế | Một phần | Rõ (GV chỉnh ma trận, ngân hàng, tạo đề) |
| Giảm tải dữ liệu cảm xúc | N/A | Thường không đề cập | N/A | Có (cửa sổ 1 phút, batch) |
| Đa vai trò (SV/GV/Admin) | Thường chỉ SV hoặc GV | Thường SV hoặc lab | GV/Admin | Đầy đủ SV/GV/Admin |

### A.2 Khoảng trống nghiên cứu (Research Gap)

Từ so sánh trên, có thể chỉ ra các khoảng trống sau:

**Gap 1: Tích hợp đa kênh trong một nền tảng thống nhất.**  
Phần lớn nghiên cứu chỉ giải quyết một hoặc hai trong ba khối: thích ứng nội dung, affective computing, khảo thí thông minh. Thiếu các công trình vừa dùng tín hiệu cảm xúc (từ vision) vừa kết nối với engine thích ứng (AI Tutor, lộ trình) và vừa có pipeline khảo thí từ tài liệu đến đề thi trong cùng một hệ thống triển khai thực tế.

**Gap 2: Chiến lược giảm tải và lưu trữ dữ liệu cảm xúc ở quy mô lớn.**  
Nghiên cứu affective computing trong giáo dục thường dùng dữ liệu theo frame hoặc theo phiên ngắn trong lab. Cách lưu trữ và truy vấn (aggregation theo cửa sổ thời gian, thống kê theo khoảng) để vừa bảo vệ quyền riêng tư vừa cho phép phân tích dài hạn và tích hợp với module khác chưa được chuẩn hóa trong các đề tài tương tự.

**Gap 3: Vai trò của giáo viên trong pipeline khảo thí AI.**  
Nhiều hệ thống AIG hoặc sinh đề thi tự động giả định ngân hàng câu hỏi và ma trận đã sẵn. Pipeline bắt đầu từ tài liệu số hóa (OCR, cấu trúc) và cho phép giáo viên review, chỉnh ma trận, bổ sung câu hỏi, rồi mới sinh đề thi là một mô hình nghiên cứu ứng dụng còn ít được mô tả có hệ thống trong tài liệu học thuật.

### A.3 Đóng góp lý thuyết mới

1. **Khung tích hợp đa kênh (Multimodal Integration Framework – MIF) cho SLE:** Đề tài đề xuất một khung mô tả cách kết hợp ba luồng dữ liệu/hành vi: (i) hành vi học tập và năng lực (progress, PLG, lộ trình); (ii) tín hiệu cảm xúc từ vision (đã gộp theo thời gian); (iii) đầu ra khảo thí (ma trận, ngân hàng câu hỏi, đề thi sinh từ ma trận). Khung này cho phép đặt giả thuyết và thiết kế thực nghiệm về tương tác giữa affective state và hiệu quả học tập/đánh giá trong cùng một nền tảng.

2. **Mô hình “Teacher-in-the-Loop Intelligent Assessment” (TILIA):** Đề tài đặt tên và mô hình hóa quy trình khảo thí thông minh có sự tham gia của giáo viên ở các điểm quyết định: sau số hóa tài liệu (review, chỉnh sửa cấu trúc); sau khi có ma trận (chỉnh tỷ lệ chủ đề/mức độ); trong ngân hàng câu hỏi (thêm/sửa câu, gán câu vào ma trận); khi tạo đề (chọn ma trận, xác nhận đề sinh ra). TILIA bổ sung cho lý thuyết về AI-in-education bằng cách nhấn mạnh vai trò con người trong vòng điều khiển của hệ thống khảo thí.

3. **Nguyên tắc giảm tải dữ liệu cảm xúc (Emotion Data Reduction Principle – EDRP):** Đề tài phát biểu nguyên tắc thiết kế: (a) không lưu từng frame; (b) gộp theo cửa sổ thời gian cố định (ví dụ 1 phút) với thống kê tóm tắt (phân bố biểu cảm, độ tin cậy trung bình); (c) truy vấn thống kê theo khoảng (phút/giờ/ngày) để phân tích và báo cáo. EDRP có thể được áp dụng và so sánh với các phương pháp khác (sampling ngẫu nhiên, event-triggered) trong các nghiên cứu tiếp theo.

---

## PHẦN B. TÍNH SÁNG TẠO (CREATIVITY)

### B.1 Phương pháp/kỹ thuật chưa được áp dụng trước đó (hoặc áp dụng rất ít)

- **Pipeline số hóa tài liệu – ma trận đề – ngân hàng câu hỏi – sinh đề thi trong một nền tảng đa vai trò:** Trong cùng ứng dụng, giáo viên upload tài liệu → OCR và cấu trúc hóa → xem/chỉnh bản số hóa → tạo/chỉnh ma trận đề → quản lý ngân hàng câu hỏi (lọc môn, khối, mức độ) và gán câu vào ma trận → bấm “Tạo đề thi từ ma trận” để hệ thống tự chọn câu từ ngân hàng theo ma trận và tạo bản ghi đề thi. Chuỗi này, với giao diện và phân quyền rõ ràng (chỉ giáo viên/quản trị), chưa được mô tả và đánh giá một cách có hệ thống trong các nghiên cứu so sánh được trích dẫn ở phần A.

- **Lưu trữ cảm xúc theo cửa sổ thời gian với schema cố định (userId, windowStart, emotionCounts, avgConfidence, sampleCount) và API thống kê theo groupBy (minute/hour/day):** Kỹ thuật này tách biệt lớp “capture và gộp” với lớp “truy vấn thống kê”, cho phép mở rộng sang nhiều trường học mà không phình dữ liệu theo từng frame. Việc áp dụng cụ thể (1 phút, batch 30 mẫu, flush 30 giây) và đánh giá trade-off giữa độ chi tiết và tải hệ thống có thể được xem là đóng góp kỹ thuật có thể lặp lại (replicable).

- **Kết hợp AI Tutor (chat, lộ trình cá nhân, PLG) với kênh cảm xúc từ Vision Tracker trong cùng nền tảng:** Mặc dù AI Tutor và emotion detection đều đã có trong nhiều nghiên cứu, việc triển khai chúng trong cùng một sản phẩm với cùng người dùng (học viên), với dữ liệu cảm xúc được lưu và có thể truy vấn theo thời gian, tạo điều kiện cho các thí nghiệm tương lai về “điều chỉnh phản hồi AI Tutor theo affective state” mà không cần xây từ đầu hai hệ thống tách rời.

### B.2 Góc nhìn liên ngành (Interdisciplinary Approach)

Đề tài kết nối các lĩnh vực:

- **Khoa học máy tính / AI:** Học tập thích ứng, xử lý ngôn ngữ tự nhiên (AI Tutor), thị giác máy tính (nhận diện biểu cảm), quản lý dữ liệu và API (emotion aggregation, exam generation).
- **Giáo dục học / Tâm lý giáo dục:** Affective computing trong học tập, vai trò của cảm xúc và engagement đối với kết quả học tập; thiết kế đánh giá (ma trận đề, alignment với chuẩn đầu ra).
- **Công nghệ giáo dục (EdTech):** Số hóa tài liệu, khảo thí trực tuyến, teacher-in-the-loop, triển khai theo vai trò (student/teacher/admin).
- **Chính sách và đạo đức:** Quyền riêng tư (thu thập biểu cảm), minh bạch của thuật toán sinh đề, quyền kiểm soát của giáo viên.

Góc nhìn liên ngành thể hiện ở chỗ: đề tài không chỉ tối ưu thuật toán mà còn đặt câu hỏi về thiết kế hệ thống sao cho giáo viên và nhà trường chấp nhận được (trust), và học viên được bảo vệ quyền riêng tư trong khi vẫn có thể hưởng lợi từ thích ứng và phản hồi.

### B.3 Khả năng phá vỡ mô hình cũ (Disruptive Potential)

- **Mô hình “chỉ nội dung thích ứng” hoặc “chỉ affective lab”:** Nếu có bằng chứng thực nghiệm (trong giai đoạn nghiên cứu tiếp theo) rằng việc tích hợp cảm xúc (đã gộp) với AI Tutor hoặc với báo cáo giáo viên cải thiện kết quả học tập hoặc giảm bỏ học, thì mô hình “chỉ thích ứng nội dung” có thể bị đặt lại vấn đề trong bối cảnh giáo dục phổ thông/đại học có hỗ trợ công nghệ.

- **Mô hình “khảo thí hoàn toàn thủ công” hoặc “AIG không có nguồn tài liệu số hóa”:** Pipeline từ tài liệu in (PDF/ảnh) đến đề thi số, với giáo viên vẫn giữ quyền kiểm soát ở từng bước, có thể thay đổi cách nhà trường xây dựng ngân hàng câu hỏi và ra đề: giảm thời gian soạn đề từ tài liệu giấy, tăng tính nhất quán với ma trận và chuẩn đầu ra.

- **Mô hình “affective computing chỉ trong phòng lab”:** Chiến lược giảm tải (EDRP) và triển khai trên nền tảng web (Vision Tracker trên trình duyệt, API lưu và thống kê) cho thấy khả năng đưa affective computing ra khỏi lab và vào môi trường học tập thực tế (lớp học ảo, học tại nhà), với điều kiện tuân thủ quy định về thu thập dữ liệu nhạy cảm.

- **Mô hình “đánh giá tách rời học tập”:** Trong nhiều LMS truyền thống, đánh giá (đề thi, chấm điểm) và học tập (nội dung, lộ trình) là hai luồng tách biệt. AeroEduVision kết nối chúng: ngân hàng câu hỏi và ma trận đề do giáo viên quản lý có thể phản ánh chuẩn đầu ra của khóa học; đề thi sinh từ ma trận đảm bảo alignment với mục tiêu học tập; dữ liệu cảm xúc và tiến độ học có thể (trong tương lai) cung cấp thông tin bổ sung cho việc giải thích kết quả thi và can thiệp sớm. Điều này gợi ý một mô hình “learning–assessment loop” gắn kết hơn, có thể ảnh hưởng đến cách nhà trường thiết kế chương trình và đánh giá.

---

## PHẦN C. KHẢ NĂNG MỞ RỘNG (SCALABILITY & FUTURE WORK)

### C.1 Hướng nghiên cứu tiếp theo (Future Work)

1. **Tích hợp tín hiệu cảm xúc vào AI Tutor:** Sử dụng dữ liệu EmotionCapture (theo phiên hoặc theo ngày) làm đầu vào bổ sung cho AI Tutor: điều chỉnh giọng điệu, độ khó gợi ý, hoặc thời lượng phiên. Cần thử nghiệm A/B và đo lường tác động lên engagement và kết quả học tập.

2. **Mô hình dự đoán trạng thái và can thiệp:** Xây mô hình dự đoán “học viên sắp chán nản hoặc bỏ phiên” từ chuỗi emotion counts và hành vi (thời gian trên trang, số tương tác). Thử nghiệm can thiệp tự động (nhắc nhở, thay đổi nội dung) hoặc báo cho giáo viên.

3. **Mở rộng pipeline số hóa:** Tự động trích xuất câu hỏi từ tài liệu số hóa (NLP) để đưa vào ngân hàng câu hỏi, với review của giáo viên. Nghiên cứu độ chính xác và thời gian tiết kiệm so với nhập tay.

4. **Đa trường học và đa ngôn ngữ:** Triển khai AeroEduVision ở nhiều trường, nhiều môn và ngôn ngữ; so sánh hiệu quả và chấp nhận của giáo viên theo ngữ cảnh. Nghiên cứu chuyển giao (transfer) mô hình cảm xúc và thích ứng giữa các nền văn hóa.

5. **Đạo đức và quyền riêng tư:** Nghiên cứu chính sách thu thập và lưu trữ dữ liệu cảm xúc (consent, thời gian lưu, quyền xóa); đánh giá nhận thức của phụ huynh và giáo viên về camera/emotion tracking trong giáo dục.

### C.2 Khả năng ứng dụng thực tiễn trong 5 năm tới

- **Năm 1–2:** Hoàn thiện tích hợp EmotionCapture với báo cáo giáo viên/admin (dashboard biểu đồ cảm xúc theo lớp/theo thời gian); chạy thí điểm tại 2–5 trường (lớp ảo hoặc hybrid). Đánh giá độ chấp nhận và độ tin cậy kỹ thuật.

- **Năm 2–3:** Thí nghiệm điều chỉnh AI Tutor theo affective state (dùng dữ liệu đã gộp); công bố kết quả thử nghiệm so sánh (có/không dùng cảm xúc). Mở rộng pipeline số hóa (trích xuất câu hỏi tự động) và đánh giá chất lượng đề sinh từ ma trận.

- **Năm 3–5:** Triển khai ở quy mô tỉnh/thành hoặc mạng lưới trường tư; tích hợp với hệ thống quản lý giáo dục (LMS/SIS) hiện có. Hướng tới chuẩn hóa giao diện API (emotion, exam generation) để bên thứ ba có thể tích hợp.

Ứng dụng thực tiễn phụ thuộc vào: nguồn lực triển khai, chính sách bảo vệ dữ liệu cá nhân (GDPR, PDPA, quy định Bộ Giáo dục), và sự chấp nhận của giáo viên và phụ huynh đối với việc thu thập biểu cảm trong môi trường học tập.

### C.3 Tiềm năng thương mại hóa và chính sách

**Thương mại hóa:**  
Nền tảng AeroEduVision có thể được cung cấp dưới dạng SaaS cho trường phổ thông và đại học: gói cơ bản (LMS, khóa học, bài tập); gói nâng cao (AI Tutor, Learning Path, ngân hàng câu hỏi, ma trận đề, sinh đề thi); gói premium (số hóa tài liệu, Vision Tracker, emotion analytics cho giáo viên/admin). Mô hình doanh thu: subscription theo trường hoặc theo học viên; hoặc bán theo module (chỉ khảo thí, chỉ AI Tutor). Tiềm năng thương mại tăng nếu có bằng chứng nghiên cứu cho thấy cải thiện kết quả học tập hoặc tiết kiệm thời gian giáo viên.

**Chính sách:**  
Đề tài liên quan trực tiếp đến chính sách giáo dục số: (i) Chuẩn hóa dữ liệu đánh giá (ma trận đề, ngân hàng câu hỏi) để trao đổi giữa trường và cơ quan quản lý. (ii) Hướng dẫn về sử dụng AI trong đánh giá (minh bạch, công bằng, không thay thế hoàn toàn con người) – mô hình TILIA có thể được tham chiếu. (iii) Quy định về thu thập dữ liệu nhạy cảm (khuôn mặt, biểu cảm) trong môi trường giáo dục: consent, mục đích, thời gian lưu trữ, quyền truy cập. Nghiên cứu có thể đóng góp vào việc soạn thảo hướng dẫn hoặc khuyến nghị cho Bộ Giáo dục và cơ quan bảo vệ dữ liệu.

---

## KẾT LUẬN

Đề tài nghiên cứu dựa trên nền tảng AeroEduVision đề xuất một hướng tích hợp ba trụ cột: học tập thích ứng (AI Tutor, PLG, lộ trình), nhận diện cảm xúc từ vision (với chiến lược giảm tải và lưu trữ theo cửa sổ thời gian), và khảo thí thông minh (số hóa tài liệu → ma trận đề → ngân hàng câu hỏi → sinh đề thi), trong một hệ thống đa vai trò với giáo viên ở vòng điều khiển. Phân tích kỹ thuật và kiến trúc (Mục 2) dựa trên khám phá codebase đã mô tả phạm vi thực tế của nền tảng — hơn 172 API endpoint, 12+ lab mô phỏng STEM, Vision Tracker với FACS và EDRP, RAG agent (OpenFang-style), và luồng khảo thí đầy đủ — tạo cơ sở vững chắc cho việc đánh giá và mở rộng nghiên cứu. So sánh với ba nhóm nghiên cứu tương tự cho thấy khoảng trống về tích hợp đa kênh, giảm tải dữ liệu cảm xúc và pipeline khảo thí từ tài liệu. Đóng góp lý thuyết gồm khung MIF, mô hình TILIA và nguyên tắc EDRP. Tính sáng tạo thể hiện ở phương pháp triển khai (pipeline end-to-end, schema emotion aggregation), góc nhìn liên ngành (AI, giáo dục, EdTech, chính sách) và tiềm năng thay đổi cách làm khảo thí và affective computing trong giáo dục. Hướng nghiên cứu tiếp theo và kế hoạch 5 năm được nêu rõ, cùng với tiềm năng thương mại hóa và đóng góp cho chính sách giáo dục số và bảo vệ dữ liệu.

---

## TÀI LIỆU THAM KHẢO (Gợi ý – không đầy đủ)

1. Knewton / Wiley. Adaptive learning platforms and knowledge graphs in higher education; IRT and knowledge graphs.  
2. Bosch, N., D’Mello, S. K. – Affective computing in education; engagement and confusion detection from facial and physiological signals.  
3. Research on Automated Item Generation (AIG), computer-based testing (CBT), and exam blueprint/table of specifications.  
4. AeroEduVision – System Architecture by Role; Document Digitization Module; Emotion Tracker Storage; AI Tutor System; Comprehensive Platform Analysis (khám phá codebase, tài liệu nội bộ dự án).  
5. Tài liệu về Personal Learning Graph (PLG), spaced repetition, và learning analytics trong giáo dục.

---

**Độ dài:** Đề cương (kèm Mục 2 – Phân tích kỹ thuật và kiến trúc) 
