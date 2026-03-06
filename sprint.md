# Kế hoạch áp dụng Open Fang Agent cho Aeroeduvison

Bản kế hoạch này đề xuất cách thức tích hợp Open Fang Agent OS vào hệ sinh thái Aeroeduvison để nâng cao trải nghiệm học tập và hiệu quả quản trị.

## Chiến lược Tích hợp

Aeroeduvison là một nền tảng giáo dục dựa trên Next.js và Rust. Open Fang sẽ đóng vai trò là "bộ não" điều hành các tác vụ AI phức tạp, vượt xa các chatbot thông thường.

### Phase 1: Foundation & Setup
- [x] **Open Fang Daemon Setup**
  - [x] Build Open Fang CLI
  - [x] Initialize configuration (`~/.openfang/config.toml`)
  - [x] Configure LLM providers (Groq/Ollama)
  - [x] Start daemon on port 8080
- [x] **Next.js API Client Implementation**
  - [x] Create `lib/openfang.ts` wrapper
  - [x] Create `app/api/openfang/route.ts` proxy
  - [x] Configure environment variables
- [x] **Agent Spawning**
  - [x] Spawn `tutor` agent via API
  - [x] Verify agent registration
- [ ] **Frontend Integration**
  - [x] Create `ChatbotOpenFang.tsx` component
  - [ ] Replace existing chatbot with Open Fang version in Dashboard
  - [ ] Test real-time communication

### 1. Hệ thống Gia sư Thông minh (AI Tutor)
Sử dụng agent `tutor` mặc định của Open Fang để hỗ trợ học sinh ngay trên giao diện Aeroeduvison.

*   **Tính năng:** Giải thích khái niệm theo phương pháp Socratic, hướng dẫn giải bài tập từng bước thay vì cho đáp án ngay.
*   **Tích hợp:** Kết nối qua `openfang-api` (tương thích OpenAI) vào module Dashboard của học sinh.
*   **Lợi ích:** Cá nhân hóa lộ trình học tập dựa trên lịch sử trao đổi được lưu trong `openfang-memory`.

### 2. Tự động hóa Nghiên cứu & Nội dung (Autonomous Hands)
Tận dụng các "Hands" của Open Fang để giảm tải cho giáo viên và quản trị viên.

*   **Researcher Hand:** Tự động tổng hợp tài liệu từ nhiều nguồn đáng tin cậy để tạo nội dung học liệu mới cho Aeroeduvison.
*   **Collector Hand:** Theo dõi các xu hướng giáo dục mới nhất và cập nhật vào kho kiến thức của hệ thống.
*   **Clip Hand:** Chuyển đổi các bài giảng video dài thành các "clip" ngắn, súc tích để học sinh dễ tiếp cận.

### 3. Nâng cấp Chấm điểm & Phản hồi (Advanced Feedback)
Aeroeduvison hiện có module chấm điểm OCR/LLM. Open Fang sẽ nâng cấp module này.

*   **Tích hợp:** Thay thế các gọi API LLM trực tiếp bằng các Open Fang Agents chuyên biệt (ví dụ: `analyst` hoặc `architect`).
*   **Ưu điểm:** Khả năng sử dụng các "guardrails" (rào chắn bảo mật) của Open Fang để đảm bảo tính khách quan và bảo mật dữ liệu học sinh.

### 4. Quản trị & Tìm kiếm Sâu (Deep Semantic Search)
Xây dựng đồ thị kiến thức (Knowledge Graph) cho toàn bộ hệ thống Aeroeduvison.

*   **Tích hợp:** Dùng `openfang-memory` (kết hợp vector database) để lưu trữ và liên kết các chủ đề bài học.
*   **Tính năng:** Học sinh có thể tìm kiếm không chỉ theo từ khóa mà theo logic kiến thức (ví dụ: "Những kiến thức nào là tiền đề cho bài học Logarit?").

## Lộ trình Thực hiện (Roadmap)

1.  **Giai đoạn 1 (Tuần 1-2):** Triển khai Open Fang daemon và cấu hình các provider LLM (Gemini/OpenAI). Thiết lập kết nối API giữa Next.js (Aeroeduvison) và Open Fang.
2.  **Giai đoạn 2 (Tuần 3-4):** Tích hợp AI Tutor vào giao diện web. Thử nghiệm Researcher Hand để tạo bộ câu hỏi trắc nghiệm tự động.
3.  **Giai đoạn 3 (Tuần 5-8):** Triển khai Knowledge Graph và hệ thống chấm điểm nâng cao. Tối ưu hóa hiệu năng và bảo mật theo 16 lớp của Open Fang.

## Kế hoạch Xác minh (Verification Plan)

### Automated Tests
- Chạy `cargo test --workspace` trong thư mục `openfang` để đảm bảo kernel ổn định.
- Sử dụng `curl` để kiểm tra các endpoint của `openfang-api`.

### Manual Verification
1.  **Kiểm tra Tutor:** Đặt câu hỏi khó về Toán/Lý trong giao diện Aeroeduvison và xác nhận xem AI có hướng dẫn theo phương pháp Socratic không.
2.  **Kiểm tra Researcher:** Yêu cầu hệ thống tạo một đề cương bài học mới từ một URL tài liệu bên ngoài.
3.  **Kiểm tra Guardrails:** Thử nghiệm đưa thông tin nhạy cảm vào và xác nhận xem hệ thống bảo mật của Open Fang có chặn lại không.
