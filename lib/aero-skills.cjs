/**
 * AeroEdu Skills — Knowledge base cho Trợ lý AeroEdu (ark-bot)
 *
 * Mỗi skill là 1 module kiến thức về platform: tổng quan, tính năng,
 * hướng dẫn dùng cho từng vai trò (HS/GV/Admin).
 *
 * Khi user hỏi → keyword matching → inject top-N skill content vào
 * system prompt → AI có ngữ cảnh chính xác để trả lời.
 *
 * Mục tiêu (user 2026-05-27):
 *   - Giới thiệu về AeroEdu Vision
 *   - Thay mục docs — tài liệu giới thiệu website
 *   - Hướng dẫn sử dụng các tính năng
 *
 * Token budget: mỗi skill < 500 tokens, top-4 inject = ~2000 tokens
 * (cộng base prompt ~500 = 2500 tổng — đủ chỗ cho conversation).
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// Skills database
// ─────────────────────────────────────────────────────────────────

const SKILLS = [
  // ═══ 1. PLATFORM OVERVIEW ═══════════════════════════════════════
  {
    id: 'aero-overview',
    name: 'Tổng quan AeroEdu Vision',
    keywords: [
      'aeroedu', 'aero-edu', 'aeroedu vision', 'inphysic', 'là gì', 'giới thiệu',
      'platform', 'nền tảng', 'about', 'tổng quan', 'sản phẩm', 'website',
      'mục tiêu', 'tầm nhìn', 'sứ mệnh',
    ],
    audience: ['STUDENT', 'TEACHER', 'ADMIN', 'PARENT'],
    content: `# AeroEdu Vision — Nền tảng giáo dục STEM Việt Nam

**AeroEdu** (inphysic.com) là nền tảng học tập trực tuyến hỗ trợ giáo viên + học sinh + phụ huynh THPT Việt Nam, tập trung vào **khoa học (Vật lí, Toán, Hoá, Sinh) và lập trình STEM**.

**Đặc trưng cốt lõi:**
- 🧪 **LabTwin**: 50+ mô phỏng vật lí/hoá học/sinh học/CFD 3D (React Three Fiber + WebGL)
- 🤖 **Trợ lý AI** đa lớp: AI Tutor (giải bài), AI Dashboard (phân tích lớp), Trợ lý chatbot hệ thống
- 📚 **LMS đầy đủ**: tạo khoá học, video upload GCS, PDF, exam, gradebook, learning path
- 🌐 **Knowledge Graph (Cây tri thức)**: đồ thị 3D liên kết kiến thức + soft skills
- ⚡ **STEM Agile Scrum**: dự án nhóm với task/log/milestone/feedback giống Jira
- 🎓 **Giáo dục theo CT GDPT 2018**: chuẩn năng lực Bộ GD&ĐT, ma trận đề TT22/2021
- 🎮 **Career Games**: 25+ pixel games khám phá nghề nghiệp

**Triết lý:** học bằng làm — mọi khái niệm có thí nghiệm ảo trực quan, AI hỗ trợ cá nhân hoá lộ trình, GV có công cụ giảm 70% thời gian soạn bài.

**Domain:** https://inphysic.com (deploy Cloud Run asia-southeast1)`,
  },

  // ═══ 2. NAVIGATION / SIDEBAR ════════════════════════════════════
  {
    id: 'navigation',
    name: 'Điều hướng & sidebar',
    keywords: [
      'sidebar', 'menu', 'điều hướng', 'navigation', 'tìm', 'ở đâu', 'route',
      'trang nào', 'access', 'truy cập', 'mở',
    ],
    audience: ['STUDENT', 'TEACHER', 'ADMIN'],
    content: `# Điều hướng AeroEdu

Sidebar bên trái chia theo nhóm chức năng, **tự động đổi nội dung theo vai trò**:

**Học sinh** thấy 5 nhóm:
1. 🎯 **Học tập** — Dành cho bạn (AI), AI Tutor, Khoá học, Học bài hôm nay, Phòng thi
2. 🧠 **Tiến độ** — Tiến bộ, Cảm xúc, Bài tập, Lịch
3. 🧪 **Labs & Tools** — LabTwin, Aura, Bảng tuần hoàn, IoT, Graph Lab, STEM, Games, KG
4. ⚙️ **Cài đặt** — Profile, Danh bạ, Mua hàng
5. 📖 **Trợ giúp** — Docs, Tin tức

**Giáo viên** thấy 7 nhóm:
1. 📊 **Tổng quan** — AI Dashboard, Sprint AI, Quản lý lớp, Analytics, Cảm xúc map, Cây tri thức GV
2. 📝 **Đề thi** — Tạo đề (AI), Ma trận đề, Ngân hàng câu hỏi, Phòng thi online
3. ✅ **Chấm thi** — Chấm AI, Báo cáo
4. 📚 **Soạn bài** — AI Content Gen, Số hoá tài liệu, LaTeX, Kế hoạch dạy học, Transcript, Learning Path
5. 🎓 **LMS** — Khoá học, Tạo khoá học
6. 👥 **Quản lý** — Lớp, Yêu cầu HS, Sổ điểm, Camera lớp, IoT, Bài tập, Lịch, Tương tác, Họp, Scrum, AI Agents, API Keys
7. 🧪 **Labs & Sim** — LabTwin, Aura, Bảng tuần hoàn, IoT, Graph, STEM Projects (Agile), Games, KG`,
  },

  // ═══ 3. STUDENT FEATURES ════════════════════════════════════════
  {
    id: 'student-features',
    name: 'Tính năng cho học sinh',
    keywords: [
      'học sinh', 'hs', 'student', 'làm bài', 'học', 'điểm', 'bài tập',
      'flashcard', 'quiz', 'tiến độ', 'progress', 'daily', 'phòng thi',
      'cho bạn', 'for you', 'gợi ý',
    ],
    audience: ['STUDENT'],
    content: `# Hướng dẫn HS dùng AeroEdu

**Trang chính cho HS:**
- 🏠 \`/dashboard\` — tổng quan + lộ trình hôm nay
- ✨ \`/student/for-you\` — AI gợi ý nội dung cá nhân hoá (thuật toán RS)
- 📅 \`/student/daily\` — Daily plan: 3-5 hoạt động AI sinh hôm nay
- 🤖 \`/ai-tutor\` — Gia sư AI giải bài Toán/Lí/Hoá/Sinh từng bước với LaTeX
- 📚 \`/student/my-courses\` — Khoá học đã enroll
- 📝 \`/student/exam-prep\` — Ôn thi: Flashcard SRS + Quiz + Mock test
- 🎓 \`/student/career\` — Survey nghề nghiệp + Pixel games khám phá
- 🌐 \`/dashboard/knowledge-graph\` — Cây tri thức cá nhân (mastery overlay)

**Học từ khoá học:**
- Mỗi bài học có blocks: video, PDF, audio, quiz, sim, lab, game
- Tự động lưu progress mỗi 10s
- HS click "Tham gia dự án STEM" qua QR/link từ GV → vào \`/dashboard/stem\`

**Phòng thi online (\`/student/exams\`):**
- Đang diễn ra / Sắp tới / Đã kết thúc
- Anti-screenshot v6 (chặn Print Screen + screen recording browser)
- Webcam giám sát qua \`/teacher/camera-management\``,
  },

  // ═══ 4. TEACHER FEATURES ═══════════════════════════════════════
  {
    id: 'teacher-features',
    name: 'Tính năng cho giáo viên',
    keywords: [
      'giáo viên', 'gv', 'teacher', 'tạo lớp', 'lớp học', 'điểm danh', 'classes',
      'sổ điểm', 'gradebook', 'phân tích', 'AI dashboard', 'lesson plan',
      'kế hoạch dạy', 'soạn bài', 'soạn giáo án', 'soạn', 'giáo án', 'sprint',
      'khba', 'khbd', 'chấm bài', 'tạo đề',
    ],
    audience: ['TEACHER'],
    content: `# Hướng dẫn GV dùng AeroEdu

**Workflow soạn bài → giảng dạy → chấm thi:**

1. **Soạn bài** \`/teacher/lesson-plans\` — AI sinh KHBD 8 phần (theo CT GDPT 2018), export Word/PDF
2. **Tạo đề thi** \`/teacher/taodethi\` — AI Composer kéo thả câu từ Ngân hàng + 5 mẫu import (Excel/CSV/JSON/MD/Word)
3. **Tạo khoá học** \`/teacher/course/create\` → 5 bước: thông tin → nội dung → mục lục → bài học → tài nguyên
4. **Quản lý lớp** \`/teacher/classes\` — danh sách HS, mời qua QR, gradebook, attendance
5. **Phân tích** \`/teacher/ai-dashboard\` — AI Phoenix chấm KQ lớp, đề xuất can thiệp HS yếu

**Công cụ STEM:**
- \`/teacher/stem-projects\` — Agile Scrum: tạo dự án → mời HS qua QR → quản lý task/sprint/milestone/log/feedback
- \`/teacher/learning-path-builder\` — Vẽ KG lộ trình kéo thả (Method 2)
- \`/teacher/knowledge-graph\` — Cây tri thức GV (CPD): 45 năng lực TT32/2018 + gợi ý phương pháp + bài tập

**Chấm thi:**
- \`/teacher/exam-grading\` — Chấm hàng loạt ≤100 phiếu (Vision AI), chấm PDF tham chiếu split-panel, IndexedDB lưu PDF qua F5
- \`/teacher/exam-reports\` — Phân tích từng câu, Cronbach α, biểu đồ phổ điểm

**API Keys** \`/teacher/api-keys\` — Tạo AERO-xxxx key cho MCP server (Claude Desktop integration với 24 tools)`,
  },

  // ═══ 5. LABS GUIDE ═════════════════════════════════════════════
  {
    id: 'labs-guide',
    name: 'Hướng dẫn LabTwin & mô phỏng',
    keywords: [
      'lab', 'labtwin', 'mô phỏng', 'sim', 'simulation', 'thí nghiệm', 'aura',
      'periodic table', 'bảng tuần hoàn', 'cfd', 'dòng chảy', 'circuit', 'iot',
      'graph', 'đồ thị', '3d', 'r3f', 'three.js',
    ],
    audience: ['STUDENT', 'TEACHER'],
    content: `# Labs & Simulators

**LabTwin** \`/dashboard/labtwin\` — Catalog 50+ mô phỏng:

**Cơ học (10):** CircularMotion · CircularMotion3D · CircularSHM (phasor) · MotionSim · ProjectileMotion · RotationalDynamics · MomentumCollision · HarmonicMotion · PhysicsEngine2D · DensityBuoyancy · MechaForce (4-graph)

**Sóng / Quang (5):** YoungDoubleSlit (wave-front animation hit screen) · StandingWaves · RefractionExplorer · FourierEpicycles · CFD Flow (LBM D2Q9 Karman vortex street + dye injection)

**Hoá / Sinh (3):** BioGrowth · ThermalGas · GeometryUnfold (R3F 3D unfold polyhedra với chiều dài cạnh)

**Lập trình (4):** ScratchKids · IoT Lab (11 sketches Arduino) · CircuitSimulator (Analog tự lắp ghép) · WfcBuilder (Wave Function Collapse)

**Khác:** Aura 3D (vũ trụ + 30+ sims R3F bay lượn) · Bảng tuần hoàn 3D Atom Viewer (118 NT) · Graph Lab · STEM·NEXUS sci-fi

**Truy cập nhanh:**
- \`/dashboard/labtwin/<slug>\` (HS+GV)
- \`/dashboard/aura/<simId>\` deep-link từng sim
- \`/dashboard/iot-lab/sketch/<id>\` deep-link Arduino sketch
- \`/dashboard/periodic-table\` shortcut

**Tự lắp mạch Analog:** \`/dashboard/labtwin/circuit-builder\` — kéo linh kiện (15 loại), click 2 terminal nối dây, bật giả lập → tính I/U/R chuẩn Ohm + LED forward Vf (diode chỉ dẫn 1 chiều, đảo cực sẽ cảnh báo).`,
  },

  // ═══ 6. STEM AGILE SCRUM ════════════════════════════════════════
  {
    id: 'stem-guide',
    name: 'Dự án STEM Agile Scrum',
    keywords: [
      'stem', 'dự án', 'project', 'agile', 'scrum', 'sprint', 'task', 'milestone',
      'mời học sinh', 'invite', 'qr', 'token', 'tham gia',
    ],
    audience: ['STUDENT', 'TEACHER'],
    content: `# Dự án STEM (Agile Scrum)

**Workflow đầy đủ (Backend 17 endpoints + 7 bảng):**

1. **GV tạo dự án** \`/teacher/stem-projects\`
   - Click "+ Tạo dự án" → modal: title, description, category (Science/Tech/Engineering/Math), subject, grade, difficulty, tags, due_date
   - Status: draft → in-progress → review → completed → published

2. **GV mời HS qua QR/link**
   - Trong project: tab "Mời HS" → tạo invite token (max_uses, expires_at tuỳ chọn)
   - QR code render từ token URL \`/stem/join/<token>\`
   - HS quét/click → API \`GET /info\` preview project → click "Tham gia" → vào StemMember

3. **HS xem dự án đã tham gia** \`/dashboard/stem\`
   - Tab "🎓 Đã tham gia" — dự án GV khởi xướng
   - Tab "✨ Tự khởi xướng" — HS tự tạo (teacher_id=HS userId, owner_role='student')

4. **Agile board** \`/teacher/stem-projects/:id\` — 6 tabs có thể kéo thả thứ tự:
   - **Overview**: dashboard tổng
   - **Scrum**: Sprint planning, velocity chart
   - **Tasks**: Kanban (todo / in-progress / done), assignee, priority, points, due_date
   - **Logs**: HS ghi nhật ký công việc (log_date, content, hours_spent, task_id)
   - **Feedback**: GV review log/task/milestone với rating + content
   - **Milestones**: Phase order, criteria JSON, score / max_score

**Stats tự tính:** member_count, completedTasks, overdueTasks, totalHours, avgPhaseScore.`,
  },

  // ═══ 7. EXAM SYSTEM ═════════════════════════════════════════════
  {
    id: 'exam-system',
    name: 'Hệ thống đề thi & chấm thi',
    keywords: [
      'đề thi', 'exam', 'thi', 'taodethi', 'ngân hàng câu hỏi', 'question bank',
      'ma trận', 'matrix', 'chấm thi', 'grading', 'cronbach', 'phổ điểm',
      'tt22', 'kiểm tra',
    ],
    audience: ['TEACHER'],
    content: `# Hệ thống đề thi AeroEdu

**1. Ngân hàng câu hỏi** \`/teacher/question-bank\`
- 4 loại câu chuẩn THPT: trắc nghiệm 4 chọn, đúng/sai 4 mệnh đề (TT22/2021), trả lời ngắn, tự luận
- LaTeX render KaTeX, ảnh inline
- Ownership: GV chỉ sửa/xoá câu của chính mình
- Import 5 mẫu: Excel / CSV / JSON / Markdown / Word
- Paste JSON trực tiếp khi import

**2. Tạo đề thi** \`/teacher/taodethi\` (Wand2 — AI Composer)
- AI sinh đề từ Ma trận TT22 (% theo độ khó/mức tư duy)
- Kéo thả câu từ ngân hàng → đề preview real-time
- Bộ lọc: môn / khối / chương / độ khó / nguồn

**3. Ma trận đề** \`/teacher/exam-matrix\`
- 4 cấp: nhận biết / thông hiểu / vận dụng / vận dụng cao
- Phân bố % theo chuẩn KT&KN (Bộ GD&ĐT TT22/2021)

**4. Phòng thi online** \`/teacher/online-exam-room\`
- Tạo phòng → mời HS qua link/QR
- Anti-screenshot v6 (chặn Print Screen + OBS recording)
- Webcam giám sát + chấm gian lận AI
- 3 sections: Đang / Sắp tới / Đã kết thúc

**5. Chấm thi** \`/teacher/exam-grading\`
- Chấm hàng loạt ≤100 phiếu (Vision AI nhận diện ô đáp án)
- PDF tham chiếu split-panel zoom max 10x
- IndexedDB lưu PDF qua F5
- Bulk grading report

**6. Báo cáo** \`/teacher/exam-reports\`
- Phân tích từng câu (% đúng, độ phân biệt, độ tin cậy)
- Cronbach α toàn đề
- Biểu đồ phổ điểm + distribution`,
  },

  // ═══ 8. KNOWLEDGE GRAPH ════════════════════════════════════════
  {
    id: 'kg-feature',
    name: 'Knowledge Graph (Cây tri thức)',
    keywords: [
      'knowledge graph', 'kg', 'cây tri thức', 'graph', 'mastery', 'năng lực',
      'lộ trình', 'path', 'liên môn', 'cross-subject', 'soft skill',
      'tt32', 'tt22', 'phẩm chất',
    ],
    audience: ['STUDENT', 'TEACHER', 'ADMIN'],
    content: `# Knowledge Graph — Cây tri thức 3D

**3 view riêng theo vai trò:**

**HS** \`/dashboard/knowledge-graph\` — Brain v2:
- Đồ thị 3D Three.js force-directed (Phase 8 deferred)
- Mastery overlay: node màu xanh (đã thuộc) / vàng (đang học) / đỏ (yếu)
- Stats: số node mastered, weak topics, learning path BFS
- 8 môn GDPT 2018: Toán/Lý/Hoá/Sinh/Sử/Địa/Công nghệ
- Cross-subject edges (Phase 5)
- AI Smart Search NL query (Phase 6): "Tìm liên hệ Vật lí lượng tử với Hoá học"
- Career KG: nghề nghiệp + soft skills (Phase 7)

**GV** \`/teacher/knowledge-graph\` — Professional KG (CPD):
- 45 năng lực giáo viên (24 TEACHER_TREE + 21 ADMIN_TREE) theo TT32/2018 + Cục NGCBQLGD
- Mỗi năng lực có: 4-5 phương pháp nâng cao (182 methods tổng, nguồn thực: taphuan.csdl.edu.vn, Coursera, NXB GD VN), 2-3 bài tập thực hành (91 exercises, có rubric)
- Đặc biệt chi tiết cho "Năng lực chuyển đổi số AI" (tds-ai-tools) với Claude/Canva/MagicSchool
- CPD Log tracking

**Admin** \`/admin/knowledge-graph\` — System-wide KG analytics

**Tính năng dùng chung:**
- Search NL: "kiến thức về dao động điều hoà"
- Add notes + discussion per node
- 3D zoom/orbit + neural network view
- Liên kết tài liệu học liệu (PDF, video, quiz, lab) ở từng node`,
  },

  // ═══ 9. AI FEATURES ════════════════════════════════════════════
  {
    id: 'ai-features',
    name: 'Tính năng AI',
    keywords: [
      'ai', 'gia sư', 'tutor', 'chatbot', 'gpt', 'claude', 'deepseek',
      'số hoá tài liệu', 'digitize', 'ocr', 'lesson plan', 'mcp',
      'phoenix', 'transcript', 'translate',
    ],
    audience: ['STUDENT', 'TEACHER', 'ADMIN'],
    content: `# Tính năng AI trong AeroEdu

**1. Gia Sư AI** \`/ai-tutor\` (HS dùng)
- Provider: DeepSeek primary (rẻ + nhanh), Claude fallback
- Subject-aware: chọn môn → system prompt tuned
- Format: LaTeX công thức, step-by-step, Socratic guidance
- Không làm bài thay khi thi cử

**2. Trợ lý AeroEdu** (chatbot hệ thống — đang dùng đây)
- API: \`POST /api/ark-bot/chat\` (SSE streaming)
- Role-aware: HS/GV/Admin
- Skills knowledge base (~12 modules)

**3. AI Dashboard GV** \`/teacher/ai-dashboard\`
- AI Phoenix phân tích KQ lớp tự động
- Đề xuất can thiệp cho HS yếu
- Filter theo lớp đang quản lí

**4. Số hoá tài liệu** \`/teacher/document-digitization\`
- OCR scan giấy → text (fal.ai)
- AI parse câu hỏi từ ảnh → import Question Bank
- Auto-grade OCR cho bài tập viết tay

**5. AI Content Gen** \`/teacher/create-module\`
- Sinh module bài học từ topic
- AI generate LaTeX template (đề thi 4 phần, sổ KH, TT22, SKKN...)

**6. Transcript đa ngôn ngữ** \`/teacher/transcript\`
- Whisper transcribe video bài giảng
- Auto-translate 6 ngôn ngữ (Claude API)

**7. MCP Server** (Claude Desktop integration)
- 24 tools: course/exam/student/KG/block ops
- Auth qua AERO-xxxx key (tạo ở /teacher/api-keys)
- Plugin Claude Desktop config JSON 1-click setup`,
  },

  // ═══ 10. STEM REALTIME CHAT ════════════════════════════════════
  {
    id: 'chat-broker',
    name: 'Chat realtime & broker',
    keywords: [
      'chat', 'tin nhắn', 'message', 'nhắn tin', 'realtime', 'broker',
      'liên hệ', 'contacts', 'kết bạn', 'nhóm học', 'group',
    ],
    audience: ['STUDENT', 'TEACHER'],
    content: `# Chat realtime trong AeroEdu

**Trang chính:** \`/dashboard/contacts\` — Danh bạ + chat 1-1 + nhóm học

**Tính năng:**
- 4 tabs: Bạn bè · Khám phá · Lời mời · Nhóm học
- Search theo tên/username/trường
- Filter theo môn học (Toán/Lý/Hoá/Sinh/Lập trình)
- Click "💬 Nhắn tin" trên friend card → mở chat drawer 1-1
- Click "💬 Chat" trên group card (đã tham gia) → group chat

**Realtime broker (WebSocket):**
- Endpoint: \`wss://inphysic.com/api/broker?token=<JWT>\`
- Topic convention:
  - DM 1-1: \`chat:dm:<lowId>:<highId>\` (canonical sort)
  - Group: \`chat:group:<groupId>\`
- Auto-reconnect exp backoff 1s → 30s
- Heartbeat 25s giữ kết nối qua Cloud Run idle 60s
- Persist 200 tin gần nhất vào sessionStorage (privacy: tự xoá khi đóng tab)
- Typing indicator 3-dot bounce
- Quick emoji panel 8 emoji`,
  },

  // ═══ 11. SETTINGS & PROFILE ════════════════════════════════════
  {
    id: 'settings',
    name: 'Cài đặt & hồ sơ',
    keywords: [
      'settings', 'cài đặt', 'profile', 'hồ sơ', 'mật khẩu', 'password',
      '2fa', 'two factor', 'login', 'đăng nhập', 'account', 'tài khoản',
      'language', 'ngôn ngữ', 'theme', 'dark mode', 'light mode',
    ],
    audience: ['STUDENT', 'TEACHER', 'ADMIN'],
    content: `# Cài đặt & Hồ sơ

**\`/dashboard/settings\` — Cài đặt cá nhân**

- **Profile**: ảnh đại diện, tên, email, vai trò
- **Bảo mật**:
  - Đổi mật khẩu
  - 2FA TOTP (Google Authenticator) — bật/tắt + QR setup
  - Forgot password qua email reset
- **Giao diện**:
  - Dark mode / Light mode (light mode có CSS variables --td-*)
  - Ngôn ngữ: VI / EN (30+ translation keys)
- **Thông báo**: Email digest, Telegram bot integration
- **Privacy**: Anti-screenshot v6 luôn bật khi làm bài thi

**Đăng nhập:**
- Google OAuth (verified qua tokeninfo)
- Email + password (bcrypt/argon2)
- 2FA flow: login → tempToken → verify TOTP → accessToken JWT
- Phụ huynh có option đăng ký (chia chung tài khoản TEACHER)

**API Keys (GV/Admin):** \`/teacher/api-keys\` hoặc \`/admin/api-keys\`
- Tạo AERO-xxxx 32-hex
- Plaintext hiện 1 lần duy nhất sau tạo
- Last used tracking
- Revoke any time

**Mã định danh HS:** không hiển thị UI bất cứ đâu, chỉ xuất khi GV bấm "Xuất Excel" trong ClassDetail/GradeBook (Luật ATTT 86/2015).`,
  },

  // ═══ 12. PRICING & PAYMENT ═════════════════════════════════════
  {
    id: 'pricing-payment',
    name: 'Giá cả & thanh toán',
    keywords: [
      // Tránh 'giá' đơn lẻ vì khớp nhầm với 'giáo' (giáo viên/giáo án)
      'giá tiền', 'giá cả', 'bao nhiêu tiền', 'price', 'pricing', 'mua',
      'thanh toán', 'payment', 'pro plan', 'gói pro', 'gói cước',
      'kích hoạt', 'activate', 'voucher', 'subscription', 'subscribe',
    ],
    audience: ['STUDENT', 'TEACHER', 'ADMIN', 'PARENT'],
    content: `# Pricing & Thanh toán

**3 đối tượng giá** \`/pricing\`:
- 🎓 **Học sinh**: gói lẻ theo môn / theo kỳ
- 👨‍🏫 **Giáo viên**: pro plan dùng tất cả tools (AI Composer, AI Dashboard, OCR, MCP)
- 🏫 **Trường học**: enterprise B2B, custom

**Quy trình mua:**
1. Chọn gói → \`/pricing\`
2. Xem chi tiết / liên hệ sales → \`/contact-sales\`
3. Thanh toán: chuyển khoản ngân hàng (info ở \`/payment/:orderId\`)
4. Admin xác minh → cấp mã activation
5. HS/GV nhập mã ở \`/activate\` → unlock tính năng

**Subscription tier:**
- GUEST: xem demo, AI Tutor 5 lượt/ngày
- STUDENT free: 1 khoá học miễn phí, AI Tutor 20 lượt/ngày
- STUDENT pro: unlimited
- TEACHER pro: tất cả AI tools + MCP + ngân hàng câu hỏi không giới hạn

**Quota check:** mọi AI endpoint qua \`lib/gating.cjs\` requireFeature(name)
→ trả 429 + message "Đã hết quota AI hôm nay — Đăng ký Pro để dùng không giới hạn"

**Lịch sử mua** \`/student/purchase-history\` — danh sách order + status.`,
  },

  // ═══ 13. LATEX & JSON TEMPLATES ════════════════════════════════
  {
    id: 'latex-json-templates',
    name: 'Sinh mẫu LaTeX & JSON cho đề thi/giáo án',
    keywords: [
      'latex', 'mẫu', 'template', 'json', 'sinh đề', 'tạo đề nhanh',
      'boilerplate', 'soạn nhanh', 'import question', 'tex', 'tikz',
      'amsmath', 'mhchem', 'siunitx', 'bgd', 'tt22', 'minh hoạ',
      'export', 'xuất file', 'pdflatex', 'xelatex', 'tectonic',
      'questionbank json', 'mcq json',
    ],
    audience: ['TEACHER', 'ADMIN'],
    content: `# Sinh mẫu LaTeX & JSON nhanh

Tôi có thể **sinh sẵn** boilerplate LaTeX/JSON cho các tình huống thường gặp:

## 📐 Mẫu LaTeX (33 templates có sẵn ở \`/teacher/latex-documents\`)

**Đề thi:**
- \`bgd-2025-vatly\` ⭐ — Đề chuẩn BGD&ĐT 2025 Vật lí (4 phần · header 2 cột · mã đề)
- \`de-toan-thpt\` 📐 — Đề Toán TT22/2021 (TN nhiều lựa chọn + Đ/S + Trả lời ngắn + Tự luận)
- \`de-hoa-thpt\` 🧪 — Đề Hoá có mhchem + bảng tuần hoàn
- \`de-thi-hoc-ky-4-phan-da-gach-chan\` — đề kỳ có đáp án \\underline{}
- \`exam-mcq\` / \`de-trac-nghiem-100-cau\` — TN 4 lựa chọn

**Giáo án (CV2345 / 5512):**
- \`lesson-plan-cv2345-4tiet\` / \`lesson-plan-cv2345-6tiet\`
- \`lesson-plan-5hoatdong\` — 5 hoạt động chuẩn CT GDPT 2018
- \`ke-hoach-bai-day\` — KHBD theo Mục tiêu/Năng lực/Phẩm chất

**Hành chính:**
- \`bao-cao-skkn\` 📋 — Sáng kiến kinh nghiệm
- \`bien-ban-hop\` — Biên bản họp tổ
- \`thu-moi-phu-huynh\`, \`thoi-khoa-bieu\`, \`don-xin-nghi-phep\`
- \`ke-hoach-chu-nhiem-thang\`, \`noi-quy-lop-hoc\`

**Mẫu tối thiểu (boilerplate Vật lí TT22):**
\`\`\`latex
\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb,siunitx,enumitem,geometry}
\\geometry{margin=2cm}
\\title{ĐỀ KIỂM TRA — VẬT LÍ 12}
\\begin{document}
\\maketitle
\\section*{Phần I. Trắc nghiệm nhiều lựa chọn (3 điểm)}
\\begin{enumerate}
  \\item Một vật dao động điều hoà với biên độ $A = 5\\,\\si{cm}$...
    \\begin{itemize}[label={}]
      \\item[A.] \\SI{0.5}{m/s}  \\item[B.] \\SI{1.0}{m/s}
      \\item[C.] \\SI{1.5}{m/s}  \\item[D.] \\SI{2.0}{m/s}
    \\end{itemize}
\\end{enumerate}
\\section*{Phần II. Đúng/Sai 4 mệnh đề (2 điểm)}
\\section*{Phần III. Trả lời ngắn (2 điểm)}
\\section*{Phần IV. Tự luận (3 điểm)}
\\end{document}
\`\`\`

Compile qua **Tectonic** ở \`/teacher/latex-documents/new\` — không cần cài LaTeX local.

## 📦 JSON Question Bank import format

Endpoint: \`POST /api/questions/batch\` hoặc dán JSON ở \`/teacher/question-bank/add\`

**Format mảng MCQ:**
\`\`\`json
[
  {
    "type": "mcq",
    "subject": "vatly",
    "grade": "12",
    "topic": "Dao động cơ học",
    "difficulty": "medium",
    "question": "Một vật dao động điều hoà với phương trình $x=5\\\\cos(2\\\\pi t)$ cm. Chu kì dao động là?",
    "options": ["0.5 s", "1 s", "2 s", "4 s"],
    "answer": "B",
    "explanation": "T = 2π/ω = 2π/(2π) = 1 s"
  }
]
\`\`\`

**Format câu Đúng/Sai 4 mệnh đề (TT22):**
\`\`\`json
{
  "type": "true_false",
  "subject": "hoa",
  "question": "Cho phản ứng $\\\\ce{Fe + HCl ->}$. Xét các mệnh đề:",
  "statements": [
    { "text": "Sản phẩm có khí $\\\\ce{H_2}$", "answer": true },
    { "text": "Fe đóng vai trò chất oxi hoá", "answer": false },
    { "text": "Phản ứng toả nhiệt", "answer": true },
    { "text": "Cần xúc tác", "answer": false }
  ]
}
\`\`\`

**Format trả lời ngắn:**
\`\`\`json
{
  "type": "short_answer",
  "question": "Tính vận tốc cực đại của vật khi $A=5\\\\,cm$, $\\\\omega=10\\\\,rad/s$ (đơn vị m/s).",
  "answer": "0.5",
  "tolerance": 0.01
}
\`\`\`

**Khi user yêu cầu "sinh mẫu":**
1. Hỏi lại: môn / khối / chủ đề / số câu / độ khó
2. Generate full code block (LaTeX hoặc JSON) ngay trong response
3. Suggest nút "Copy" hoặc import path
4. Khuyến nghị: dùng \`/teacher/taodethi\` AI Composer cho workflow tốt nhất`,
  },

  // ═══ 14. TROUBLESHOOTING ═══════════════════════════════════════
  {
    id: 'troubleshooting',
    name: 'Khắc phục sự cố thường gặp',
    keywords: [
      'lỗi', 'error', 'không hoạt động', 'không load', 'bị treo', 'crash',
      'troubleshoot', 'fix', 'sửa', 'help', 'cứu', 'sao lại', 'tại sao',
      '503', '404', '500', '401',
    ],
    audience: ['STUDENT', 'TEACHER', 'ADMIN'],
    content: `# Khắc phục sự cố thường gặp

**1. "Trợ lý không có dịch vụ" / 503 endpoint**
- Cloud Run đang cold-start (~5s đầu request) — đợi vài giây retry
- Nếu vẫn 503 → BE chưa cấu hình API key (DEEPSEEK_API_KEY / ANTHROPIC_API_KEY)

**2. Sidebar hiển thị tên route raw (vd "routeSprint")**
- Hard refresh: **Ctrl+Shift+R** (Win/Linux) hoặc **Cmd+Shift+R** (Mac)
- Browser cache file JS hash cũ, refresh fetch hash mới

**3. Không vào được /teacher/course/:id/edit?step=2**
- Đã fix 2026-05-27: thêm 14 endpoint Chapter/Lesson/Block CRUD
- Nếu vẫn lỗi → check JWT còn hạn (logout/login lại)

**4. Mạch điện LED không sáng (CircuitBuilder)**
- Đảo cực LED — anode (▷) phải nối phía + nguồn
- V nguồn < Vf LED (red=2V, blue=3V) → cần tăng pin lên 9V hoặc thêm pin nối tiếp
- R quá nhỏ → I quá lớn → LED CHÁY (cảnh báo): cần R ≥ (V-Vf)/0.02

**5. CFD Flow lag/giật**
- Đã optimize 2026-05-27: precompute streaming, inline feq, Uint32 ImageData
- Adaptive steps-per-frame tự xuống 1 khi FPS < 30
- Tắt "showDye" để bỏ ribbons → giảm vẽ ~30% lượng

**6. Phòng thi không vào được**
- Đã đăng ký tham gia chưa? Check \`/student/exams\` "Sắp tới"
- Webcam permission: Allow camera trong browser settings
- Anti-screenshot v6 yêu cầu fullscreen — F11

**7. STEM project /stem/join/:token "Link không tồn tại"**
- Token đã revoke / hết hạn / dùng hết max_uses
- Hỏi GV tạo invite mới

**8. Quên mật khẩu**
- \`/auth/forgot-password\` → nhập email → check inbox link reset (60 phút TTL)`,
  },
];

// ─────────────────────────────────────────────────────────────────
// Retrieval — keyword matching + role filter
// ─────────────────────────────────────────────────────────────────

/**
 * Tính score giữa query và skill dựa trên:
 *   - Số keyword match (case-insensitive substring)
 *   - Bonus role match (+5)
 *   - Bonus exact phrase match (+3)
 *
 * @param {string} query — câu hỏi user (lowercase)
 * @param {object} skill
 * @param {string} role — STUDENT / TEACHER / ADMIN
 */
function scoreSkill(queryLower, skill, role) {
  let score = 0;
  for (const kw of skill.keywords) {
    if (queryLower.includes(kw.toLowerCase())) {
      score += 1;
      // Bonus nếu keyword là multi-word (specific hơn)
      if (kw.includes(' ')) score += 1;
    }
  }
  // Role match bonus
  if (skill.audience.includes((role || 'STUDENT').toUpperCase())) {
    score += score > 0 ? 2 : 0; // chỉ bonus nếu đã có ít nhất 1 keyword match
  }
  return score;
}

/**
 * Trả về top-N skills phù hợp với query + role.
 *
 * Logic:
 *   1. Score mọi skill
 *   2. Filter score > 0
 *   3. Sort giảm dần
 *   4. Lấy top N (default 4)
 *   5. LUÔN include skill 'aero-overview' nếu chưa có (đảm bảo AI luôn biết
 *      về platform)
 *
 * @param {string} query — user message latest
 * @param {string} role — 'STUDENT' | 'TEACHER' | 'ADMIN'
 * @param {number} max — max skills to return
 * @returns {Array<{id, name, content}>}
 */
function getRelevantSkills(query, role = 'STUDENT', max = 4) {
  const queryLower = (query || '').toLowerCase();

  const scored = SKILLS
    .map((s) => ({ skill: s, score: scoreSkill(queryLower, s, role) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.skill);

  // Always include overview if not present (baseline platform knowledge)
  const hasOverview = scored.some((s) => s.id === 'aero-overview');
  if (!hasOverview) {
    const overview = SKILLS.find((s) => s.id === 'aero-overview');
    if (overview) scored.unshift(overview);
  }

  return scored.slice(0, max);
}

/**
 * Build skill context string để inject vào system prompt.
 * Format markdown headers + content rút gọn.
 */
function buildSkillContext(skills) {
  if (!skills || skills.length === 0) return '';
  const parts = ['\n\n## 📚 Kiến thức nền tảng (relevant skills):\n'];
  for (const s of skills) {
    parts.push(`\n### ${s.name}\n${s.content}\n`);
  }
  parts.push('\n---\nDùng kiến thức trên trả lời chính xác. Không bịa thông tin ngoài.');
  return parts.join('');
}

module.exports = {
  SKILLS,
  getRelevantSkills,
  buildSkillContext,
  scoreSkill,
};
