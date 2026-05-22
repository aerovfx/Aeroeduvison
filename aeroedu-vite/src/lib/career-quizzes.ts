/**
 * career-quizzes.ts — Bộ câu hỏi đa dạng cho 25 nghề trong career-detail-data.ts.
 *
 * Mỗi nghề có 5 câu hỏi bao quát 5 chủ đề:
 *   1. Kỹ năng cần có (skills)
 *   2. Công việc cụ thể (daily-life)
 *   3. Lộ trình / lương (career-path / salary)
 *   4. Tác động AI (AI exposure)
 *   5. Tính cách / môn học (personality / subjects)
 *
 * Phân bố độ khó: 2 Dễ · 2 Trung bình · 1 Khó / nghề.
 * Tổng: 25 × 5 = 125 câu hỏi.
 *
 * Dùng bởi CareerWorldOdyssey.tsx — game pixel mở rộng 25 nghề.
 */

export interface CareerQuizQuestion {
  /** Câu hỏi (tiếng Việt, 1 dòng) */
  q: string
  /** 4 lựa chọn A/B/C/D */
  choices: string[]
  /** Index đáp án đúng (0-3) */
  correctIdx: number
  /** Giải thích 1-2 câu sau khi chọn (educate, không chỉ "đúng/sai") */
  explain: string
  /** Mức độ khó */
  difficulty: 'Dễ' | 'Trung bình' | 'Khó'
  /** Chủ đề con — giúp game hiển thị badge */
  topic?: 'kỹ năng' | 'daily-life' | 'lương' | 'lộ trình' | 'AI exposure' | 'tính cách' | 'môn học' | 'học vấn'
}

/* ────────────────────────── Quiz pool ────────────────────────── */

export const careerQuizzes: Record<string, CareerQuizQuestion[]> = {
  /* ════════════════════════════ 1. Kỹ sư phần mềm ════════════════════════════ */
  'ky-su-phan-mem': [
    {
      q: 'Lương khởi điểm của một kỹ sư phần mềm tại Việt Nam (2026) khoảng?',
      choices: ['5-8 triệu', '12-20 triệu', '40-60 triệu', '80+ triệu'],
      correctIdx: 1,
      explain: 'Fresher dev tại các công ty công nghệ lớn (FPT, VNG, Viettel) dao động 12-20 triệu, cao hơn nếu giỏi tiếng Anh + algo.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'Trong kỷ nguyên AI Copilot, kỹ năng QUAN TRỌNG NHẤT của lập trình viên là?',
      choices: ['Gõ code thật nhanh', 'Hiểu vấn đề + thiết kế hệ thống', 'Biết hết mọi framework', 'Làm việc 1 mình'],
      correctIdx: 1,
      explain: 'AI viết code rất nhanh — giá trị của lập trình viên là HIỂU vấn đề + thiết kế giải pháp, không phải gõ code.',
      difficulty: 'Trung bình',
      topic: 'AI exposure',
    },
    {
      q: 'Một ngày làm việc điển hình của kỹ sư phần mềm thường bắt đầu với?',
      choices: ['Code ngay 8 tiếng', 'Daily stand-up meeting ~15 phút', 'Họp khách hàng cả sáng', 'Đào tạo intern'],
      correctIdx: 1,
      explain: 'Hầu hết team Agile/Scrum bắt đầu ngày bằng stand-up 15 phút để sync tiến độ + chặn block giữa các thành viên.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Trường nào dẫn đầu đào tạo CNTT phía Bắc với điểm chuẩn ~27/30 khối A00/A01?',
      choices: ['ĐH Y Hà Nội', 'ĐH Bách Khoa Hà Nội (HUST)', 'ĐH Luật Hà Nội', 'ĐH Văn hoá HN'],
      correctIdx: 1,
      explain: 'HUST có khoa CNTT mạnh nhất miền Bắc, điểm chuẩn ~27/30. UET-ĐHQGHN cũng rất mạnh.',
      difficulty: 'Trung bình',
      topic: 'học vấn',
    },
    {
      q: 'Theo phân tích AI exposure của Karpathy/OpenAI, lập trình viên có xu hướng?',
      choices: ['Bị thay thế hoàn toàn trong 5 năm', 'Tăng năng suất + làm việc cùng AI', 'Không bị ảnh hưởng gì', 'Lương giảm mạnh'],
      correctIdx: 1,
      explain: 'Lập trình viên là 1 trong nghề được AI augment mạnh nhất — năng suất tăng 30-50% nhờ Copilot/Cursor/Claude.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
  ],

  /* ════════════════════════════ 2. Nhà khoa học dữ liệu ════════════════════════════ */
  'nha-khoa-hoc-du-lieu': [
    {
      q: 'Data Scientist thực ra dành phần lớn thời gian để làm gì?',
      choices: ['Train model AI siêu phức tạp', 'Clean & explore data', 'Viết research paper', 'Họp với CEO'],
      correctIdx: 1,
      explain: 'Reality: 70-80% thời gian là data wrangling. "Garbage in, garbage out" — clean data quan trọng hơn thuật toán fancy.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Kỹ năng nào ÍT BỊ thay thế bởi AI trong Data Science?',
      choices: ['Viết SQL query', 'Tự động train model', 'Hiểu business + đặt câu hỏi đúng', 'Vẽ biểu đồ'],
      correctIdx: 2,
      explain: 'AutoML đã làm hầu hết kỹ thuật train model. Giá trị thật là HIỂU business để hỏi đúng câu hỏi — đó là phần con người giữ.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Ngôn ngữ + thư viện phổ biến nhất của Data Scientist là?',
      choices: ['Java + Spring', 'Python + Pandas/NumPy', 'C++ + STL', 'PHP + Laravel'],
      correctIdx: 1,
      explain: 'Python với Pandas, NumPy, Scikit-learn là chuẩn ngành. R cũng phổ biến trong academia.',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'Mức lương senior Data Scientist tại Việt Nam (2026) khoảng?',
      choices: ['10-15 triệu', '20-30 triệu', '50-100 triệu', '200+ triệu'],
      correctIdx: 2,
      explain: 'Senior DS tại VNG, MoMo, Tiki, FPT thường rơi vào 50-100 triệu. Lead/Principal có thể vượt 150 triệu.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Môn học QUAN TRỌNG NHẤT để vào ngành Data Science?',
      choices: ['Văn học', 'Toán + Thống kê + Tin học', 'Mỹ thuật', 'Lịch sử'],
      correctIdx: 1,
      explain: 'DS cần toán mạnh (đại số tuyến tính, thống kê, xác suất) + tin học (lập trình + database). Tiếng Anh để đọc paper là bonus.',
      difficulty: 'Trung bình',
      topic: 'môn học',
    },
  ],

  /* ════════════════════════════ 3. Kiến trúc sư ════════════════════════════ */
  'kien-truc-su': [
    {
      q: 'Trường ĐH nào hàng đầu về kiến trúc tại Việt Nam?',
      choices: ['ĐH Kiến trúc Hà Nội', 'ĐH Sư phạm', 'ĐH Y Hà Nội', 'ĐH Luật'],
      correctIdx: 0,
      explain: 'ĐH Kiến trúc Hà Nội và ĐH Kiến trúc TP.HCM là 2 trường dẫn đầu ngành kiến trúc tại VN.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Phần mềm BIM nào phổ biến nhất với kiến trúc sư hiện đại?',
      choices: ['Microsoft Word', 'Revit / ArchiCAD', 'Photoshop', 'Excel'],
      correctIdx: 1,
      explain: 'Revit (Autodesk) và ArchiCAD là 2 phần mềm BIM chuẩn ngành — quản lý mô hình 3D + thông tin xây dựng.',
      difficulty: 'Trung bình',
      topic: 'kỹ năng',
    },
    {
      q: 'AI ảnh hưởng đến kiến trúc sư như thế nào (2026)?',
      choices: ['Thay thế hoàn toàn KTS', 'Generate concept nhanh + tự động hóa kỹ thuật', 'Không ảnh hưởng', 'Chỉ dùng cho render'],
      correctIdx: 1,
      explain: 'Midjourney/Stable Diffusion generate concept 1000 lần nhanh hơn. AutoCAD AI Assistant tự vẽ technical drawing. KTS tập trung vào ý tưởng + sáng tạo.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Một ngày KTS điển hình KHÔNG bao gồm việc nào?',
      choices: ['Vẽ phác thảo concept', 'Họp với khách hàng', 'Thăm công trường', 'Khám bệnh nhân'],
      correctIdx: 3,
      explain: 'KTS làm việc với client + thi công + design. Khám bệnh nhân là việc của bác sĩ — không liên quan.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Lương kiến trúc sư mới ra trường tại VN (2026)?',
      choices: ['3-5 triệu', '8-15 triệu', '30-50 triệu', '80+ triệu'],
      correctIdx: 1,
      explain: 'KTS mới ra trường ~8-15 triệu, senior 20-35 triệu, principal hoặc tự mở studio có thể 40-80+ triệu.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
  ],

  /* ════════════════════════════ 4. Nhà nghiên cứu AI ════════════════════════════ */
  'nha-nghien-cuu-ai': [
    {
      q: 'Viện nghiên cứu AI hàng đầu Việt Nam?',
      choices: ['VinAI Research', 'Viện Năng lượng', 'Viện Toán cao cấp', 'Viện Khoa học Xã hội'],
      correctIdx: 0,
      explain: 'VinAI Research (thuộc Vingroup) tuyển PhD top thế giới, công bố tại NeurIPS/ICML. FPT.AI, Zalo AI cũng mạnh.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Lương AI researcher tại VN (senior, có paper top venue) khoảng?',
      choices: ['10-20 triệu', '30-50 triệu', '85-125 triệu', 'Không ai trả nhiều như vậy'],
      correctIdx: 2,
      explain: 'AI Researcher senior tại VinAI, FPT.AI, Zalo AI thường 85-125 triệu/tháng. Có paper top venue như NeurIPS/ICML có thể cao hơn.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Kiến thức TOÁN nào QUAN TRỌNG NHẤT cho AI Researcher?',
      choices: ['Hình học không gian', 'Đại số tuyến tính + Xác suất + Tối ưu', 'Lý thuyết số', 'Hình học fractal'],
      correctIdx: 1,
      explain: 'Deep learning xây trên đại số tuyến tính (matrix ops), xác suất (Bayes), và tối ưu (gradient descent). Đó là 3 trụ cột toán học của AI.',
      difficulty: 'Khó',
      topic: 'môn học',
    },
    {
      q: 'Một AI researcher senior thường KHÔNG làm việc nào?',
      choices: ['Đọc paper mới mỗi ngày', 'Train large model trên GPU cluster', 'Khám bệnh', 'Viết research paper'],
      correctIdx: 2,
      explain: 'AI researcher đọc paper, train model, viết paper, làm seminar. Khám bệnh là việc của bác sĩ.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'AI researcher có "tự thay thế" được bởi AI không?',
      choices: ['Có, AI tự nghiên cứu trong 2 năm', 'Khó — nghiên cứu cần creativity + intuition', 'Đã bị thay thế từ 2024', 'Không ai biết'],
      correctIdx: 1,
      explain: 'Nghiên cứu đột phá cần creativity, intuition về hướng đi mới — AI có thể hỗ trợ literature review, code experiment nhưng không thay thế insight con người.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
  ],

  /* ════════════════════════════ 5. Bác sĩ ════════════════════════════ */
  'bac-si': [
    {
      q: 'Lương bác sĩ Việt Nam mới tốt nghiệp tại bệnh viện công khoảng?',
      choices: ['3-5 triệu', '6-10 triệu', '15-25 triệu', '40+ triệu'],
      correctIdx: 1,
      explain: 'BS mới ra trường ở công lập chỉ 6-10 triệu, nhưng senior + chuyên khoa hiếm tại Vinmec/FV/private có thể 40-100+ triệu/tháng.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'Thời gian học để trở thành bác sĩ chuyên khoa tại VN?',
      choices: ['4 năm', '6 năm + 2-3 năm CK1', '10 năm', '15 năm'],
      correctIdx: 1,
      explain: 'Bác sĩ đa khoa: 6 năm ĐH Y. Sau đó học chuyên khoa cấp 1 (2-3 năm), chuyên khoa 2 hoặc Thạc sĩ/Tiến sĩ thêm vài năm nữa.',
      difficulty: 'Trung bình',
      topic: 'lộ trình',
    },
    {
      q: 'AI ảnh hưởng nhất tới khâu nào trong nghề bác sĩ?',
      choices: ['Đọc X-ray, CT, MRI', 'Bắt mạch & lắng nghe bệnh nhân', 'Phẫu thuật mở bụng', 'Tâm sự với gia đình bệnh nhân'],
      correctIdx: 0,
      explain: 'AI đọc hình ảnh y tế (X-ray, CT) đã đạt độ chính xác ngang/hơn bác sĩ ở 1 số bệnh — radiology là area bị disrupt mạnh nhất.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Bệnh viện hàng đầu tuyển dụng BS tại Hà Nội?',
      choices: ['Bệnh viện Bạch Mai', 'Trường mầm non', 'Sân vận động Mỹ Đình', 'Đại sứ quán'],
      correctIdx: 0,
      explain: 'Bạch Mai, Việt Đức, Chợ Rẫy, Vinmec, FV là những bệnh viện hàng đầu — vào được là vinh dự + đãi ngộ tốt.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Kỹ năng MỀM nào QUAN TRỌNG NHẤT của bác sĩ?',
      choices: ['Toán giỏi', 'Empathy + giao tiếp', 'Code Python', 'Photoshop'],
      correctIdx: 1,
      explain: 'BS gặp bệnh nhân trong khoảnh khắc dễ tổn thương — empathy + giao tiếp tốt giúp chẩn đoán đúng + bệnh nhân tuân thủ điều trị.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 6. Giáo viên ════════════════════════════ */
  'giao-vien': [
    {
      q: 'Giáo viên thường phải dậy sớm cỡ mấy giờ?',
      choices: ['4-5h sáng', '5:30-6h sáng', '8-9h sáng', 'Sau 11h trưa'],
      correctIdx: 1,
      explain: 'Tiết học VN thường bắt đầu 7:00-7:30 → GV phải có mặt 6:30 → dậy ~5:30-6h sáng.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Lương giáo viên công lập VN mới ra trường (2026)?',
      choices: ['3-4 triệu', '5-8 triệu', '15-20 triệu', '30+ triệu'],
      correctIdx: 1,
      explain: 'GV công lập mới ra trường ~5-8 triệu (bao gồm phụ cấp). Sau 10-15 năm + dạy thêm có thể 20-35 triệu.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'Trường hàng đầu đào tạo giáo viên tại miền Bắc?',
      choices: ['ĐH Sư phạm Hà Nội', 'ĐH Công nghệ', 'ĐH Mỏ - Địa chất', 'Học viện An ninh'],
      correctIdx: 0,
      explain: 'ĐH Sư phạm Hà Nội (HNUE) là trường sư phạm trọng điểm quốc gia. ĐH Giáo dục - ĐHQGHN cũng mạnh.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'AI ảnh hưởng tới giáo viên ra sao?',
      choices: ['Thay thế GV hoàn toàn', 'Trở thành đồng đội: AI dạy lý thuyết, GV dạy tư duy + nhân cách', 'GV phải bỏ nghề', 'Không ảnh hưởng'],
      correctIdx: 1,
      explain: 'AI giải bài tập + giảng video tốt hơn người. GV chuyển sang vai trò hướng dẫn tư duy, nuôi dưỡng cảm xúc, định hướng nhân cách — phần AI khó thay.',
      difficulty: 'Trung bình',
      topic: 'AI exposure',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của giáo viên giỏi là?',
      choices: ['Bằng tiến sĩ', 'Kiên nhẫn + truyền cảm hứng', 'Đẹp trai/xinh gái', 'Hát hay'],
      correctIdx: 1,
      explain: 'Học sinh khác nhau, tiếp thu khác nhau. GV cần kiên nhẫn để dạy từng em + truyền cảm hứng để các em muốn học.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 7. Doanh nhân ════════════════════════════ */
  'doanh-nhan': [
    {
      q: 'Thu nhập của doanh nhân/founder năm đầu khởi nghiệp thường?',
      choices: ['Cao gấp đôi nhân viên', '0 - vài triệu (tự trả lương)', 'Ổn định 30 triệu', 'Cố định theo lương cơ bản'],
      correctIdx: 1,
      explain: 'Year 1 startup: founder thường KHÔNG nhận lương hoặc nhận rất ít để giữ runway. Reward chỉ đến khi exit/profit.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Kỹ năng QUAN TRỌNG NHẤT cho founder startup là?',
      choices: ['Code giỏi', 'Resilience + thực thi + nhìn vấn đề', 'Tiếng Anh giỏi', 'Đẹp trai'],
      correctIdx: 1,
      explain: 'Founder gặp hàng trăm cú "no" mỗi tháng. Resilience + khả năng nhìn ra vấn đề chưa giải quyết + thực thi nhanh là all-in-one.',
      difficulty: 'Trung bình',
      topic: 'kỹ năng',
    },
    {
      q: 'Tỷ lệ thành công của startup giai đoạn early thường?',
      choices: ['90% sống sót sau 5 năm', '~10% sống sót sau 5 năm', '50/50', '100% — cứ làm là thành'],
      correctIdx: 1,
      explain: 'Theo thống kê CB Insights / VC Việt Nam: ~90% startup early-stage thất bại trong 5 năm đầu. Đầu tư mạo hiểm là vậy.',
      difficulty: 'Khó',
      topic: 'lộ trình',
    },
    {
      q: 'Doanh nhân nổi tiếng Việt Nam điều hành Vingroup?',
      choices: ['Bill Gates', 'Phạm Nhật Vượng', 'Mark Zuckerberg', 'Elon Musk'],
      correctIdx: 1,
      explain: 'Ông Phạm Nhật Vượng là tỷ phú USD đầu tiên của VN, sáng lập Vingroup (Vinhomes, VinFast, VinAI...).',
      difficulty: 'Dễ',
      topic: 'tính cách',
    },
    {
      q: 'AI tác động tới khởi nghiệp như thế nào?',
      choices: ['Khiến startup khó hơn', 'Hạ rào cản: 1 người có thể build sản phẩm với AI', 'Không ảnh hưởng', 'Chỉ tăng chi phí'],
      correctIdx: 1,
      explain: 'AI hạ rào cản kỹ thuật: 1 founder không-code có thể build MVP với Cursor + Claude. Startup solo trở nên khả thi hơn bao giờ hết.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
  ],

  /* ════════════════════════════ 8. Nhà tâm lý ════════════════════════════ */
  'nha-tam-ly': [
    {
      q: 'Thời lượng 1 buổi trị liệu tâm lý chuẩn thường là?',
      choices: ['10 phút', '50-60 phút', '4 tiếng', 'Cả ngày'],
      correctIdx: 1,
      explain: 'Chuẩn quốc tế: 1 buổi therapy = 50 phút (gọi là "50-minute hour"), để therapist có 10 phút note + nghỉ giữa buổi.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'AI chatbot tâm lý (ChatGPT, Wysa) sẽ?',
      choices: ['Thay thế hoàn toàn nhà tâm lý', 'Hỗ trợ first-line nhưng không thay therapy chính', 'Không có tác dụng', 'Cấm sử dụng'],
      correctIdx: 1,
      explain: 'AI tốt cho hỗ trợ ban đầu + tracking mood, nhưng trauma sâu, chấn thương cần therapist con người — empathy thật không thay được.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Lương nhà tâm lý mới ra trường tại VN (2026)?',
      choices: ['3-5 triệu', '8-12 triệu', '40-60 triệu', '100+ triệu'],
      correctIdx: 1,
      explain: 'Tại VN, lương starting 8-12 triệu (private clinic). Senior có 5-10 năm + tư vấn 1-1 ~30-60 triệu/tháng.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Kỹ năng SỐ MỘT của nhà tâm lý giỏi là?',
      choices: ['Nhớ DSM-5', 'Lắng nghe sâu (active listening)', 'Phân tích MRI não', 'Nói nhanh'],
      correctIdx: 1,
      explain: 'Active listening = nghe thật sự, không phán xét, không cắt lời. Đây là kỹ năng nền tảng — tất cả kỹ thuật therapy đều xây trên đó.',
      difficulty: 'Trung bình',
      topic: 'kỹ năng',
    },
    {
      q: 'Trường ĐH nào đào tạo Tâm lý học hàng đầu VN?',
      choices: ['ĐH Y Hà Nội', 'ĐH KHXH&NV - ĐHQGHN', 'ĐH Mỏ - Địa chất', 'ĐH Hàng hải'],
      correctIdx: 1,
      explain: 'KHXH&NV (Hà Nội + TP.HCM) có khoa Tâm lý lớn nhất. ĐH Sư phạm cũng có chuyên ngành Tâm lý giáo dục.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
  ],

  /* ════════════════════════════ 9. Luật sư ════════════════════════════ */
  'luat-su': [
    {
      q: 'Thời gian học để trở thành luật sư hành nghề tại VN?',
      choices: ['2 năm', '4 năm ĐH + tập sự + thi LS', '10 năm thẳng', '20 năm'],
      correctIdx: 1,
      explain: '4 năm ĐH Luật → 1 năm tập sự ở văn phòng LS → thi chứng chỉ hành nghề (Liên đoàn LS VN). Tổng ~5-6 năm.',
      difficulty: 'Trung bình',
      topic: 'lộ trình',
    },
    {
      q: 'Lương luật sư mới ra trường tại VN (2026)?',
      choices: ['3-5 triệu', '10-15 triệu', '50-80 triệu', '200+ triệu'],
      correctIdx: 1,
      explain: 'Junior LS ở Big Law VN (YKVN, LNT, Frasers) ~15-25 triệu. Tại công ty nhỏ 10-15 triệu. Partner ở firm lớn 100-300+ triệu.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'AI ảnh hưởng tới luật sư ra sao?',
      choices: ['Thay thế hoàn toàn', 'Tự động hóa contract review + research; LS tập trung tư vấn chiến lược', 'Không ảnh hưởng', 'Cấm dùng AI'],
      correctIdx: 1,
      explain: 'AI legal research (Harvey, CoCounsel) làm nhiều việc paralegal. LS chuyển sang client-facing + chiến lược + tranh tụng — phần AI khó thay.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của luật sư là?',
      choices: ['Đẹp trai/xinh gái', 'Đạo đức + lập luận sắc bén', 'Hát hay', 'Code Python'],
      correctIdx: 1,
      explain: 'Luật sư là người được khách hàng giao bí mật + tiền bạc. Đạo đức (integrity) là nền tảng. Lập luận sắc là vũ khí trước toà.',
      difficulty: 'Dễ',
      topic: 'tính cách',
    },
    {
      q: 'Trường ĐH nào đào tạo Luật hàng đầu Việt Nam?',
      choices: ['ĐH Luật Hà Nội + ĐH Luật TP.HCM', 'ĐH Công nghệ', 'ĐH Mỏ - Địa chất', 'Học viện Báo chí'],
      correctIdx: 0,
      explain: 'ĐH Luật Hà Nội (HLU) và ĐH Luật TP.HCM (HCMULAW) là 2 trường chuyên ngành Luật top. Khoa Luật ĐHQGHN cũng mạnh.',
      difficulty: 'Trung bình',
      topic: 'học vấn',
    },
  ],

  /* ════════════════════════════ 10. Kế toán / Kiểm toán ════════════════════════════ */
  'ke-toan': [
    {
      q: 'Phần mềm kế toán phổ biến nhất tại Việt Nam?',
      choices: ['Excel + Misa / Fast Accounting', 'Photoshop', 'Word', 'AutoCAD'],
      correctIdx: 0,
      explain: 'Misa và Fast Accounting là 2 phần mềm kế toán nội địa thống trị VN. Doanh nghiệp lớn dùng SAP, Oracle.',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'Lương kế toán mới ra trường tại VN (2026)?',
      choices: ['3-5 triệu', '8-12 triệu', '30-50 triệu', '80+ triệu'],
      correctIdx: 1,
      explain: 'Fresher kế toán SME ~8-12 triệu. Kiểm toán Big4 (Deloitte, PwC, EY, KPMG) khoảng 12-15 triệu starting.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'Chứng chỉ nghề nghiệp DANH GIÁ NHẤT cho kế toán quốc tế?',
      choices: ['IELTS', 'ACCA / CPA / CFA', 'TOEIC', 'Bằng lái xe'],
      correctIdx: 1,
      explain: 'ACCA (Anh) + CPA (Mỹ/VN) là chứng chỉ kế toán hàng đầu. CFA dành riêng cho tài chính/đầu tư.',
      difficulty: 'Trung bình',
      topic: 'lộ trình',
    },
    {
      q: 'AI thay đổi nghề kế toán như thế nào?',
      choices: ['Thay thế 100%', 'Tự động hoá data entry + invoice processing; KT làm phân tích + advisory', 'Không ảnh hưởng', 'KT phải học lập trình'],
      correctIdx: 1,
      explain: 'AI làm data entry, OCR hoá đơn, reconciliation. KT chuyển sang phân tích tài chính, tư vấn thuế, kiểm toán phán quyết — phần AI khó thay.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Tính cách phù hợp nhất với nghề kế toán?',
      choices: ['Bay bổng, sáng tạo', 'Cẩn thận + chi tiết + chính trực', 'Hướng ngoại, thích sân khấu', 'Mạo hiểm cao'],
      correctIdx: 1,
      explain: 'KT chạm số liệu mỗi ngày — 1 sai sót có thể tốn tiền lớn. Cẩn thận + chi tiết + chính trực là profile chuẩn ISTJ/ISFJ (MBTI).',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 11. UX/UI Designer ════════════════════════════ */
  'ux-designer': [
    {
      q: 'UX Designer phải hiểu nhất điều gì?',
      choices: ['CSS + code', 'Nhu cầu người dùng', 'Tiếng Anh', 'Photoshop'],
      correctIdx: 1,
      explain: 'UX = User Experience. Hiểu user trước, design sau. Công cụ chỉ là phương tiện — empathy với user là chìa khoá.',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'Phần mềm design chuẩn ngành UX/UI hiện nay (2026)?',
      choices: ['MS Paint', 'Figma', 'Notepad', 'Calculator'],
      correctIdx: 1,
      explain: 'Figma thống trị ngành từ 2022, đặc biệt sau khi Adobe XD bị Adobe ngưng phát triển. Sketch còn dùng trong team Mac.',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'Mỗi sáng UX Designer Mai làm gì điển hình?',
      choices: ['Brainstorm + sketch user flow', 'Sửa code Java', 'Khám bệnh nhân', 'Lái xe ô tô'],
      correctIdx: 0,
      explain: 'UX/UI Designer sáng thường brainstorm + sketch wireframe + research user. Chiều design UI Figma + present với team.',
      difficulty: 'Trung bình',
      topic: 'daily-life',
    },
    {
      q: 'AI tools (Midjourney, Galileo AI) ảnh hưởng tới UX/UI Designer ra sao?',
      choices: ['Thay thế hoàn toàn', 'Generate UI nhanh; designer tập trung research + system thinking', 'Không ảnh hưởng', 'Bị cấm dùng'],
      correctIdx: 1,
      explain: 'AI generate UI mockup trong giây. Designer chuyển sang UX research, design system, accessibility, business strategy — phần AI khó thay.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Công ty công nghệ VN tuyển nhiều UX/UI Designer nhất?',
      choices: ['VNG, Tiki, MoMo, FPT', 'Cảng Sài Gòn', 'Vinamilk (nhà máy)', 'Bệnh viện công'],
      correctIdx: 0,
      explain: 'VNG, MoMo, Tiki, FPT Software, Got It, Sky Mavis là những công ty tech tuyển UX/UI design nhiều nhất.',
      difficulty: 'Trung bình',
      topic: 'học vấn',
    },
  ],

  /* ════════════════════════════ 12. Content Creator ════════════════════════════ */
  'content-creator': [
    {
      q: 'Nền tảng nào KHÔNG phổ biến với content creator Việt Nam?',
      choices: ['TikTok', 'YouTube', 'Facebook Reels', 'MS Excel'],
      correctIdx: 3,
      explain: 'TikTok, YouTube, Facebook Reels, Instagram là sân chơi chính. Excel là phần mềm văn phòng — không phải nền tảng content.',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'Thu nhập của KOL/Content Creator Việt Nam top có thể đạt?',
      choices: ['Dưới 5 triệu', '8-15 triệu', '35-70 triệu', '500 triệu - vài tỷ/tháng'],
      correctIdx: 3,
      explain: 'Top KOL VN (Khoa Pug, Quỳnh Trần JP, Long Vinh) có thể 500 triệu - vài tỷ/tháng từ AdSense + brand deal. Mid-tier 35-70 triệu.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'AI tác động tới content creator như thế nào?',
      choices: ['Thay thế hoàn toàn', 'Tăng tốc edit + viết caption; creator giữ cá tính + ý tưởng', 'Không ảnh hưởng', 'Cấm dùng AI'],
      correctIdx: 1,
      explain: 'AI tools (Capcut AI, ElevenLabs voice clone, ChatGPT caption) tăng output 5-10 lần. Cá tính + brand personality vẫn là then chốt.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Một content creator chuyên nghiệp ngày làm việc thường?',
      choices: ['Quay 1 video xong là nghỉ', 'Plan content + quay + edit + engage comment', 'Chỉ post selfie', 'Ngủ cả ngày'],
      correctIdx: 1,
      explain: 'Creator pro: plan content week ahead, quay 2-3 video, edit 2-3 tiếng/clip, reply comment + DM thường xuyên. Hustle thực thụ.',
      difficulty: 'Trung bình',
      topic: 'daily-life',
    },
    {
      q: 'Kỹ năng SỐ MỘT của creator viral là?',
      choices: ['Quay 4K', 'Storytelling + nắm bắt trend', 'Đẹp trai/xinh gái', 'Đầu tư setup studio xịn'],
      correctIdx: 1,
      explain: 'Storytelling 7 giây đầu giữ chân viewer. Nắm trend nhanh + kể chuyện cuốn hút quan trọng hơn thiết bị xịn.',
      difficulty: 'Dễ',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 13. Nhà văn / Nhà báo ════════════════════════════ */
  'nha-van': [
    {
      q: 'Báo chí truyền thống Việt Nam đang đối mặt với?',
      choices: ['Bùng nổ độc giả', 'Suy giảm doanh thu in + cạnh tranh mạng xã hội', 'Không thay đổi gì', 'Tăng lương ồ ạt'],
      correctIdx: 1,
      explain: 'Báo in suy giảm 30-50%/năm. Tuổi Trẻ, VnExpress, Thanh Niên phải chuyển sang digital + monetize qua e-commerce + AI.',
      difficulty: 'Trung bình',
      topic: 'lộ trình',
    },
    {
      q: 'Lương nhà báo mới ra trường tại VN (2026)?',
      choices: ['3-4 triệu', '6-10 triệu', '20-30 triệu', '50+ triệu'],
      correctIdx: 1,
      explain: 'Phóng viên junior ~6-10 triệu (VnExpress, Tuổi Trẻ). Trưởng ban hoặc nhà báo có tiếng (Lê Thanh Phong, Mạnh Hùng) 25-50+ triệu.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'AI viết content có thay thế nhà văn không?',
      choices: ['100% thay thế', 'Thay thế bản tin ngắn + báo nhanh; văn học + investigative journalism vẫn cần người', 'Không ảnh hưởng', 'AI không biết viết'],
      correctIdx: 1,
      explain: 'AI viết tin tức ngắn + summary đã thay 30-40% việc copy editor. Văn học, đào sâu phóng sự, có-cảm-xúc vẫn cần con người.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Trường ĐH nào đào tạo Báo chí tại VN?',
      choices: ['Học viện Báo chí và Tuyên truyền', 'ĐH Y Hà Nội', 'ĐH Hàng hải', 'ĐH Mỏ - Địa chất'],
      correctIdx: 0,
      explain: 'Học viện Báo chí & Tuyên truyền (AJC) + KHXH&NV (ĐHQG) là 2 nơi đào tạo báo chí chính. ĐH Văn hoá HN cũng có khoa.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của nhà báo là?',
      choices: ['Hát hay', 'Đạo đức nghề + tò mò + tinh thần điều tra', 'Code Python', 'Toán giỏi'],
      correctIdx: 1,
      explain: 'Nhà báo đại diện sự thật trước công chúng. Đạo đức + tò mò (ask why) + dám đào sâu là DNA nghề báo.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 14. Y tá / Điều dưỡng ════════════════════════════ */
  'y-ta': [
    {
      q: 'Y tá tại bệnh viện công VN thường làm ca bao nhiêu tiếng?',
      choices: ['4 tiếng', '8-12 tiếng/ca, kể cả đêm', '20 phút', '24 tiếng liên tục'],
      correctIdx: 1,
      explain: 'Y tá BV công thường ca 8h ban ngày + ca 12h ban đêm (luân phiên). Cấp cứu, ICU có khi 24h trực.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Lương y tá VN mới ra trường ở bệnh viện công?',
      choices: ['2-3 triệu', '5-8 triệu', '20-30 triệu', '60+ triệu'],
      correctIdx: 1,
      explain: 'Y tá công lập starting ~5-8 triệu. Y tá BV quốc tế (Vinmec, FV, Hồng Ngọc) có thể 12-25 triệu. Du học → 80-150 triệu (Mỹ, Đức, Nhật).',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'AI/robot điều dưỡng sẽ?',
      choices: ['Thay thế y tá hoàn toàn 2030', 'Hỗ trợ vital signs monitoring, medication reminder; y tá làm phần "chăm sóc người"', 'Không có tác dụng', 'Cấm dùng tại bệnh viện'],
      correctIdx: 1,
      explain: 'Robot Moxi/Pepper hỗ trợ phát thuốc + monitoring. Phần "human touch" — chăm sóc, tâm sự bệnh nhân — y tá vẫn không thay được.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của y tá là?',
      choices: ['Đẹp trai/xinh gái', 'Tận tâm + sức bền thể chất + bình tĩnh trong khủng hoảng', 'Code Python', 'Hát hay'],
      correctIdx: 1,
      explain: 'Y tá chạy tới chạy lui cả ngày, đứng nhiều giờ, gặp cảnh hiểm. Tận tâm + bền bỉ + bình tĩnh là core skills.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
    {
      q: 'Cơ hội xuất khẩu lao động ngành y tá VN sang đâu nhiều nhất?',
      choices: ['Bắc Cực', 'Nhật Bản + Đức + Đài Loan', 'Châu Phi', 'Antarctica'],
      correctIdx: 1,
      explain: 'Nhật (EPA), Đức (chương trình điều dưỡng), Đài Loan, Hàn Quốc đang thiếu hụt y tá → tuyển y tá VN với lương 30-60 triệu/tháng.',
      difficulty: 'Trung bình',
      topic: 'lộ trình',
    },
  ],

  /* ════════════════════════════ 15. Quản lý dự án / PM ════════════════════════════ */
  'quan-ly-du-an': [
    {
      q: 'PM (Product Manager) trong công ty công nghệ thực ra làm gì?',
      choices: ['Viết code', 'Đứng giữa Engineering / Design / Business để xác định "làm gì + tại sao"', 'Sửa máy in', 'Bán hàng tận nhà'],
      correctIdx: 1,
      explain: 'PM = "mini-CEO" của product. Define WHY + WHAT, để engineering define HOW. Là cầu nối giữa tech, design, business.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Lương PM senior tại công ty tech lớn VN (VNG, MoMo, Tiki)?',
      choices: ['10-15 triệu', '30-50 triệu', '70-100 triệu', '500+ triệu'],
      correctIdx: 2,
      explain: 'Senior PM tại VNG, Tiki, MoMo ~30-50 triệu. Principal/Group PM ở big tech (Grab, Shopee) có thể 70-100 triệu + stock.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Framework quản lý phổ biến nhất với PM?',
      choices: ['Agile / Scrum + OKR', 'Khổng giáo', 'Vẽ tay', 'Bằng-cảm-xúc'],
      correctIdx: 0,
      explain: 'Agile/Scrum quản lý sprint 2-4 tuần. OKR (Objectives + Key Results) align team với mục tiêu chiến lược.',
      difficulty: 'Trung bình',
      topic: 'kỹ năng',
    },
    {
      q: 'AI tác động PM ra sao?',
      choices: ['Thay thế PM', 'Tự động hoá PRD + user research summary; PM tập trung strategy + stakeholder', 'Không ảnh hưởng', 'PM phải code'],
      correctIdx: 1,
      explain: 'AI viết PRD draft, tổng hợp user feedback, generate roadmap. PM giữ phần judgment, prioritization, communication — phần con người.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'PM giỏi cần kỹ năng SOFT nào nhất?',
      choices: ['Code C++', 'Giao tiếp + đồng cảm + ra quyết định trong thiếu thông tin', 'Phẫu thuật', 'Vẽ tranh'],
      correctIdx: 1,
      explain: 'PM họp 80% thời gian — giao tiếp + listen tốt là survival skill. Decide-under-uncertainty là khác biệt giữa PM trung bình và xuất sắc.',
      difficulty: 'Dễ',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 16. Kỹ sư cơ khí ════════════════════════════ */
  'ky-su-co-khi': [
    {
      q: 'Trường nào đào tạo Cơ khí hàng đầu Việt Nam?',
      choices: ['ĐH Bách Khoa Hà Nội', 'ĐH Sư phạm', 'ĐH Văn hoá', 'ĐH Hàng hải (chuyên hàng hải, không phải cơ khí thuần)'],
      correctIdx: 0,
      explain: 'ĐH Bách Khoa HN + ĐH Bách Khoa TP.HCM là 2 trường top về Cơ khí. ĐH Công nghiệp HN, ĐH Sư phạm Kỹ thuật cũng mạnh.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Phần mềm thiết kế phổ biến với KS cơ khí?',
      choices: ['Word', 'SolidWorks / CATIA / AutoCAD', 'Photoshop', 'Excel'],
      correctIdx: 1,
      explain: 'SolidWorks (thiết kế cơ khí), CATIA (ô tô + hàng không), AutoCAD (bản vẽ kỹ thuật) là 3 phần mềm chuẩn ngành.',
      difficulty: 'Trung bình',
      topic: 'kỹ năng',
    },
    {
      q: 'Công ty nào tuyển KS cơ khí nhiều nhất tại VN?',
      choices: ['VinFast, Thaco, Honda VN, Toyota VN', 'Vingroup giải trí', 'Trường mầm non', 'Bệnh viện'],
      correctIdx: 0,
      explain: 'Ngành ô tô (VinFast, Thaco, Honda), máy nông nghiệp, nhà máy FDI (Samsung, LG, Bosch) tuyển hàng nghìn KS cơ khí/năm.',
      difficulty: 'Dễ',
      topic: 'lộ trình',
    },
    {
      q: 'AI/robot tác động tới ngành cơ khí ra sao?',
      choices: ['Thay thế hoàn toàn KS', 'Generative design tự thiết kế chi tiết tối ưu; KS giám sát + tích hợp', 'Không ảnh hưởng', 'Bị cấm'],
      correctIdx: 1,
      explain: 'Generative design (Autodesk Fusion AI) tạo chi tiết nhẹ-bền-rẻ tự động. KS chuyển sang định nghĩa bài toán + tích hợp hệ thống.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Môn học QUAN TRỌNG NHẤT cho KS cơ khí?',
      choices: ['Văn học', 'Toán + Vật lý + Hoá', 'Lịch sử', 'Mỹ thuật'],
      correctIdx: 1,
      explain: 'Cơ khí = ứng dụng Vật lý (cơ học, nhiệt, vật liệu) + Toán (giải tích, đại số). Hoá hữu ích cho khoa học vật liệu.',
      difficulty: 'Trung bình',
      topic: 'môn học',
    },
  ],

  /* ════════════════════════════ 17. Nhà thiết kế đồ họa / Thời trang ════════════════════════════ */
  'nha-thiet-ke': [
    {
      q: 'Phần mềm chuẩn ngành thiết kế đồ hoạ?',
      choices: ['MS Paint', 'Adobe Creative Suite (Photoshop, Illustrator, InDesign)', 'Notepad', 'Calculator'],
      correctIdx: 1,
      explain: 'Adobe Photoshop + Illustrator + InDesign là bộ ba chuẩn ngành. Figma cho UI, Procreate cho illustration trên iPad.',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'Lương designer mới ra trường tại VN (2026)?',
      choices: ['2-4 triệu', '8-14 triệu', '40-60 triệu', '100+ triệu'],
      correctIdx: 1,
      explain: 'Designer junior agency ~8-14 triệu. Designer freelance có portfolio tốt 18-30 triệu. Senior fashion designer studio riêng có thể 35-60+ triệu.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'Trường đào tạo Thiết kế đồ hoạ hàng đầu VN?',
      choices: ['ĐH Mỹ thuật Công nghiệp HN', 'ĐH Y', 'ĐH Mỏ - Địa chất', 'Học viện An ninh'],
      correctIdx: 0,
      explain: 'ĐH Mỹ thuật CN HN, ĐH Mỹ thuật TP.HCM, RMIT (Bachelor of Design) là 3 trường chính. ĐH Kiến trúc cũng có khoa Đồ hoạ.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'AI (Midjourney, DALL·E) ảnh hưởng tới designer ra sao?',
      choices: ['Designer mất việc 100%', 'Generate concept nhanh; designer focus brand strategy + hand-tuning', 'Không thay đổi gì', 'Designer phải đi nghề khác'],
      correctIdx: 1,
      explain: 'AI tạo concept 100 lần nhanh hơn. Designer chuyển sang director vai trò: define brand vibe, refine AI output, integrate hệ thống thị giác.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Một designer mỗi sáng thường làm gì?',
      choices: ['Brief review + sketch concept + brainstorm', 'Sửa ô tô', 'Khám bệnh', 'Bán cà phê'],
      correctIdx: 0,
      explain: 'Sáng designer review brief từ client/PM, sketch concept tay, tham khảo moodboard (Pinterest, Behance), brainstorm hướng visual.',
      difficulty: 'Trung bình',
      topic: 'daily-life',
    },
  ],

  /* ════════════════════════════ 18. Phi công ════════════════════════════ */
  'phi-cong': [
    {
      q: 'Lương phi công thương mại Việt Nam (captain Vietnam Airlines/Vietjet)?',
      choices: ['10-15 triệu', '50 triệu', '150-300 triệu/tháng', '5 tỷ/tháng'],
      correctIdx: 2,
      explain: 'Captain (cơ trưởng) tại Vietnam Airlines/Vietjet thường 150-300 triệu/tháng. Co-pilot 80-150 triệu. Đây là 1 trong nghề lương cao nhất VN.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Để trở thành phi công thương mại VN cần?',
      choices: ['Đi học 2 năm là xong', 'Học bay + ATPL license + 1500h flight time', 'Học mầm non', 'Chỉ cần biết lái ô tô'],
      correctIdx: 1,
      explain: 'Cần ATPL (Air Transport Pilot License), 1500h bay tích luỹ, thi thể lực Class 1, English ICAO Level 4+. Học phí ~3-5 tỷ.',
      difficulty: 'Khó',
      topic: 'lộ trình',
    },
    {
      q: 'AI/autopilot có thay thế phi công không?',
      choices: ['Đã thay thế từ 2020', 'Tự động hoá cruise; còn cần phi công cho cất hạ cánh + xử lý emergency', 'Không ảnh hưởng', 'Phi công phải bay tay 100% thời gian'],
      correctIdx: 1,
      explain: 'Autopilot làm 90% giờ cruise. Cất hạ cánh + emergency + bad weather cần phi công. ICAO yêu cầu 2 phi công ít nhất tới 2050.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Hãng hàng không VN tuyển phi công Việt nhiều nhất?',
      choices: ['Vietnam Airlines + Vietjet + Bamboo Airways', 'Vinmec (bệnh viện)', 'Tiki (e-commerce)', 'VNG (game)'],
      correctIdx: 0,
      explain: 'Vietnam Airlines (full-service), Vietjet (LCC), Bamboo Airways là 3 hãng tuyển phi công VN. Mức lương + thưởng cạnh tranh quốc tế.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của phi công?',
      choices: ['Đẹp trai', 'Bình tĩnh + chính xác + sức khoẻ tốt', 'Hát hay', 'Toán giỏi tuyệt đối'],
      correctIdx: 1,
      explain: 'Phi công đối mặt với áp lực hàng trăm tính mạng. Bình tĩnh trong khủng hoảng + ra quyết định nhanh + sức khoẻ Class 1 là yêu cầu sống còn.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 19. Dược sĩ ════════════════════════════ */
  'duoc-si': [
    {
      q: 'Thời gian học để trở thành dược sĩ tại VN?',
      choices: ['2 năm', '5 năm ĐH Dược', '10 năm', '1 tháng'],
      correctIdx: 1,
      explain: 'ĐH Dược (ĐH Dược HN, ĐH Y Dược TP.HCM) học 5 năm. Sau đó có thể học chuyên khoa hoặc Thạc sĩ thêm 2 năm.',
      difficulty: 'Dễ',
      topic: 'lộ trình',
    },
    {
      q: 'Dược sĩ làm việc tại đâu nhiều nhất?',
      choices: ['Nhà thuốc tư nhân + chuỗi nhà thuốc + sản xuất dược', 'Sân bay', 'Trường mầm non', 'Sân vận động'],
      correctIdx: 0,
      explain: 'Nhà thuốc tư + chuỗi (Pharmacity, Long Châu, An Khang), nhà máy dược (Traphaco, DHG), bệnh viện là 4 môi trường chính.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Lương dược sĩ mới ra trường VN (2026)?',
      choices: ['3-5 triệu', '8-12 triệu', '40-60 triệu', '100+ triệu'],
      correctIdx: 1,
      explain: 'Dược sĩ nhà thuốc 8-12 triệu. Tại công ty dược lớn 12-18 triệu. Senior + quản lý chuỗi 25-50+ triệu.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'AI tác động tới ngành dược ra sao?',
      choices: ['Thay thế dược sĩ hoàn toàn', 'Tự động hoá đếm thuốc + drug interaction check; dược sĩ tập trung tư vấn', 'Không ảnh hưởng', 'Cấm dùng AI'],
      correctIdx: 1,
      explain: 'AI/robot tự đếm + đóng gói thuốc + phát hiện tương tác thuốc. Dược sĩ chuyển sang tư vấn sử dụng, dược lâm sàng, R&D thuốc mới.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Môn học QUAN TRỌNG NHẤT cho ngành Dược?',
      choices: ['Lịch sử', 'Hoá học + Sinh học', 'Mỹ thuật', 'Thể dục'],
      correctIdx: 1,
      explain: 'Dược = ứng dụng Hoá hữu cơ + Sinh học (sinh lý người + dược động học). Toán cũng cần cho tính toán liều lượng.',
      difficulty: 'Dễ',
      topic: 'môn học',
    },
  ],

  /* ════════════════════════════ 20. Nhân viên Ngân hàng ════════════════════════════ */
  'nhan-vien-ngan-hang': [
    {
      q: 'Kỹ năng QUAN TRỌNG NHẤT cho banker là?',
      choices: ['Toán cực giỏi như nhà nghiên cứu', 'Tin tưởng & cẩn thận (trust + careful)', 'Đẹp trai', 'Code Python'],
      correctIdx: 1,
      explain: 'Banker chạm tiền mỗi ngày — 1 sai sót có thể mất việc. Trust + careful > tất cả skills khác. Toán cần nhưng không cần "thần đồng".',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'Lương banker mới ra trường tại VN top bank (Vietcombank, BIDV, MB)?',
      choices: ['3-5 triệu', '10-15 triệu', '50-80 triệu', '200+ triệu'],
      correctIdx: 1,
      explain: 'Top banks (VCB, BIDV, Techcombank, MB) starting 10-15 triệu + thưởng. Sale/Relationship Manager senior có thể 35-100+ triệu (commission).',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Trường ĐH nào đào tạo Tài chính - Ngân hàng top VN?',
      choices: ['ĐH Kinh tế Quốc dân (NEU) + ĐH Ngoại thương (FTU)', 'ĐH Y Hà Nội', 'ĐH Mỏ - Địa chất', 'ĐH Sân khấu Điện ảnh'],
      correctIdx: 0,
      explain: 'NEU (Hà Nội), FTU (Hà Nội + TP.HCM), Học viện Ngân hàng, UEH (TP.HCM) là 4 trường mạnh nhất. Điểm chuẩn cao ~26-28/30.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'AI/Fintech thay đổi nghề banker ra sao?',
      choices: ['Banker mất việc hoàn toàn', 'Teller giảm; banker chuyển sang RM (relationship) + financial advisory', 'Không ảnh hưởng', 'Ngân hàng đóng cửa hết'],
      correctIdx: 1,
      explain: 'Mobile banking (MoMo, ZaloPay) giảm 70% giao dịch teller. Banker chuyển sang RM (relationship manager) tư vấn vay/đầu tư cho khách lớn.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Tính cách phù hợp nhất với nghề ngân hàng?',
      choices: ['Hoang dã, mạo hiểm', 'Cẩn thận + xã giao tốt + chính trực', 'Hướng nội tuyệt đối', 'Lập dị'],
      correctIdx: 1,
      explain: 'Banker gặp khách + xử lý tiền mỗi ngày. Cẩn thận (không sai số) + giao tiếp tốt + integrity (không tham ô) là profile chuẩn.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 21. Nghệ sĩ biểu diễn ════════════════════════════ */
  'nghe-si-bieu-dien': [
    {
      q: 'Thu nhập của nghệ sĩ biểu diễn VN có đặc điểm gì?',
      choices: ['Cố định cao', 'Cực kỳ phân hoá: 80% bấp bênh, 1% top siêu giàu (100-500+ triệu/show)', 'Ai cũng giàu', 'Tất cả đều nghèo'],
      correctIdx: 1,
      explain: 'Top 1% như Sơn Tùng, Đen Vâu, Mỹ Tâm 100-500+ triệu/show. Middle artist 20-60 triệu/tháng. Junior bấp bênh — phải đi nhiều show nhỏ.',
      difficulty: 'Khó',
      topic: 'lương',
    },
    {
      q: 'Trường đào tạo nghệ sĩ biểu diễn chuyên nghiệp VN?',
      choices: ['Học viện Âm nhạc Quốc gia + ĐH Sân khấu Điện ảnh', 'ĐH Bách Khoa', 'ĐH Y', 'ĐH Mỏ'],
      correctIdx: 0,
      explain: 'Nhạc viện Hà Nội + Nhạc viện TP.HCM (cổ điển), ĐH Sân khấu Điện ảnh HN + TP.HCM (kịch/điện ảnh), CĐ Văn hoá Nghệ thuật.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Một ngày của nghệ sĩ biểu diễn thường gồm?',
      choices: ['Ngủ cả ngày', 'Tập luyện + ghi âm + biểu diễn + interact fan', 'Đi câu cá', 'Khám bệnh'],
      correctIdx: 1,
      explain: 'Nghệ sĩ pro: sáng tập thanh nhạc, chiều thu phòng studio, tối show/sự kiện, đêm reply fan + edit content. Hustle thực sự.',
      difficulty: 'Trung bình',
      topic: 'daily-life',
    },
    {
      q: 'AI tác động tới nghệ sĩ ra sao?',
      choices: ['AI thay thế hoàn toàn ca sĩ', 'AI voice clone đe doạ; nhưng "trải nghiệm live" + cá tính riêng vẫn không thay được', 'Không ảnh hưởng', 'Nghệ sĩ phải bỏ nghề'],
      correctIdx: 1,
      explain: 'AI voice clone (Suno, ElevenLabs) tạo bài hát ảo. Nhưng concert live, fan engagement, brand cá nhân — AI khó thay. Nghệ sĩ tích hợp AI làm trợ lý.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của nghệ sĩ?',
      choices: ['Mạo hiểm + cá tính riêng + bền bỉ', 'Chỉ cần đẹp', 'Toán giỏi', 'Code Python'],
      correctIdx: 0,
      explain: 'Nghệ sĩ phải chịu hàng năm rejection trước khi nổi. Cá tính riêng giúp đứng vững giữa đám đông. Bền bỉ là phẩm chất số 1.',
      difficulty: 'Dễ',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 22. Quản lý du lịch & khách sạn ════════════════════════════ */
  'quan-ly-du-lich-khach-san': [
    {
      q: 'Khách sạn quốc tế 5 sao tại VN tuyển GM/Quản lý nhiều?',
      choices: ['Sheraton, Hilton, Marriott, InterContinental', 'Sân bay', 'Bệnh viện', 'Trường mầm non'],
      correctIdx: 0,
      explain: 'Các tập đoàn KS quốc tế (Marriott, Hilton, IHG, Accor) + chuỗi VN (Vinpearl, Mường Thanh, SunGroup) là nơi tuyển GM/Manager nhiều nhất.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Lương GM khách sạn 5 sao tại VN?',
      choices: ['10-15 triệu', '35-80 triệu/tháng', '500+ triệu', '5 tỷ'],
      correctIdx: 1,
      explain: 'GM khách sạn 5 sao (200+ phòng) ~35-80 triệu + benefit (chỗ ở, ô tô). Tại Vinpearl flag hoặc Hyatt/Sofitel có thể 100+ triệu.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Ngôn ngữ QUAN TRỌNG NHẤT cho ngành du lịch - khách sạn quốc tế?',
      choices: ['Tiếng Anh thông thạo', 'Tiếng Latin', 'Tiếng cổ Hy Lạp', 'Quốc ngữ Khmer'],
      correctIdx: 0,
      explain: 'Tiếng Anh + tiếng Trung/Nhật/Hàn là bộ ba quyền lực. Khách quốc tế chiếm 30-50% doanh thu khách sạn — không có English là loss.',
      difficulty: 'Dễ',
      topic: 'kỹ năng',
    },
    {
      q: 'AI tác động ngành du lịch - khách sạn ra sao?',
      choices: ['Mất việc tất cả', 'AI booking + chatbot 24/7; manager tập trung trải nghiệm guest + revenue management', 'Không ảnh hưởng', 'Booking thủ công như cũ'],
      correctIdx: 1,
      explain: 'AI chatbot xử lý 70% câu hỏi guest. Dynamic pricing AI tối ưu giá theo demand. Manager chuyển sang strategic + human touch (VIP, recovery).',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Một ngày của Front Office Manager khách sạn?',
      choices: ['Briefing ca + check VIP + xử lý complaint + report doanh thu', 'Khám bệnh', 'Code phần mềm', 'Vẽ tranh'],
      correctIdx: 0,
      explain: 'Sáng briefing ca lễ tân, check arrival VIP, xử lý complaint guest, report occupancy + revenue cho GM. 24/7 standby cho khủng hoảng.',
      difficulty: 'Trung bình',
      topic: 'daily-life',
    },
  ],

  /* ════════════════════════════ 23. Đầu bếp ════════════════════════════ */
  'dau-bep': [
    {
      q: 'Đầu bếp Việt Nam top (Michelin chef, executive chef) lương?',
      choices: ['5 triệu', '15 triệu', '40-100+ triệu/tháng', '5 tỷ'],
      correctIdx: 2,
      explain: 'Executive Chef khách sạn 5 sao 40-80 triệu. Michelin chef như Peter Cường Franklin, Nguyễn Mạnh Hùng có thể 100-200 triệu/tháng + đứng tên thương hiệu.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Trường đào tạo đầu bếp chuyên nghiệp tại VN?',
      choices: ['Hoa Sữa, Hướng Việt, NHC, Le Cordon Bleu Vietnam', 'ĐH Y', 'ĐH Mỏ', 'ĐH Sư phạm'],
      correctIdx: 0,
      explain: 'Hoa Sữa (nổi tiếng nhân văn), Hướng Việt, Netspace Culinary School, Le Cordon Bleu Saigon là những trường nấu ăn chính.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Đầu bếp Michelin star quốc tế gốc Việt là?',
      choices: ['Peter Cường Franklin (Anan Saigon)', 'Sơn Tùng MTP', 'Trấn Thành', 'Hoài Linh'],
      correctIdx: 0,
      explain: 'Anan Saigon (chef Peter Cường Franklin) là nhà hàng Việt Nam đầu tiên có Michelin Guide highlight. Sao Mai (Sài Gòn) cũng đạt 1 sao Michelin 2023.',
      difficulty: 'Khó',
      topic: 'lộ trình',
    },
    {
      q: 'AI/robot tác động bếp ăn ra sao?',
      choices: ['Thay thế chef hoàn toàn', 'Tự động hoá prep + plating đơn giản; chef giữ sáng tạo + tinh tế', 'Không ảnh hưởng', 'Cấm dùng máy móc'],
      correctIdx: 1,
      explain: 'Robot Moley/Picnic làm pizza, salad, sushi cơ bản. Fine dining + ngon-tinh-tế-sáng-tạo vẫn cần human chef — món ăn là nghệ thuật + cảm xúc.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của đầu bếp pro?',
      choices: ['Đẹp trai', 'Vị giác tinh + tốc độ + sức bền dưới áp lực', 'Toán giỏi', 'Code Python'],
      correctIdx: 1,
      explain: 'Đầu bếp đứng 10-14 tiếng/ngày, áp lực dinner service. Vị giác (palate) phân biệt được "ngon thật" - "ngon vừa", tốc độ, bền chịu nhiệt + stress.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 24. Nhân viên xã hội ════════════════════════════ */
  'nhan-vien-xa-hoi': [
    {
      q: 'Nhân viên xã hội (social worker) làm việc với?',
      choices: ['Trẻ em mồ côi, người khuyết tật, người cao tuổi, nạn nhân bạo lực', 'Lái máy bay', 'Sửa máy in', 'Bán nhà'],
      correctIdx: 0,
      explain: 'Social worker hỗ trợ những đối tượng dễ tổn thương: trẻ mồ côi, nạn nhân bạo lực, người vô gia cư, người khuyết tật, người già neo đơn.',
      difficulty: 'Dễ',
      topic: 'daily-life',
    },
    {
      q: 'Lương nhân viên xã hội VN (2026)?',
      choices: ['Cao như tỉ phú', '6-9 triệu/tháng (starting)', '500 triệu', '10 tỷ'],
      correctIdx: 1,
      explain: 'NVXH tại các tổ chức công 6-9 triệu starting. Tại NGO quốc tế (Save the Children, UNICEF VN, World Vision) 12-25 triệu.',
      difficulty: 'Trung bình',
      topic: 'lương',
    },
    {
      q: 'Trường nào đào tạo Công tác xã hội tại VN?',
      choices: ['ĐH KHXH&NV - ĐHQG + ĐH Lao động Xã hội', 'ĐH Y', 'ĐH Bách Khoa', 'ĐH Hàng hải'],
      correctIdx: 0,
      explain: 'ĐH KHXH&NV (Hà Nội + TP.HCM) + ĐH Lao động Xã hội + ĐH Sư phạm có khoa Công tác Xã hội (CTXH).',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'AI ảnh hưởng tới nhân viên xã hội ra sao?',
      choices: ['Thay thế hoàn toàn', 'Hỗ trợ case management + assessment; tương tác con người không thể thay', 'Không liên quan', 'NVXH phải code'],
      correctIdx: 1,
      explain: 'AI có thể tổng hợp case history, gợi ý dịch vụ phù hợp. Phần "human-to-human" — đồng cảm, xây dựng niềm tin với người dễ tổn thương — không thay được.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của nhân viên xã hội?',
      choices: ['Đẹp trai/xinh gái', 'Đồng cảm sâu + kiên nhẫn + tinh thần phục vụ', 'Toán giỏi', 'Code Python'],
      correctIdx: 1,
      explain: 'NVXH đối mặt cảnh khốn cùng mỗi ngày. Đồng cảm (empathy) sâu + kiên nhẫn + lòng phục vụ (Holland: Social-type) là DNA nghề.',
      difficulty: 'Dễ',
      topic: 'tính cách',
    },
  ],

  /* ════════════════════════════ 25. Quân nhân / Cảnh sát ════════════════════════════ */
  'quan-nhan-canh-sat': [
    {
      q: 'Trường đào tạo công an / quân đội hàng đầu Việt Nam?',
      choices: ['Học viện An ninh + Học viện Cảnh sát + Học viện Quân y', 'ĐH Y dân lập', 'ĐH Mỹ thuật', 'ĐH Sân khấu'],
      correctIdx: 0,
      explain: 'Học viện An ninh Nhân dân, Học viện Cảnh sát Nhân dân (Bộ Công an), Học viện Quân y, Học viện Kỹ thuật QS (Bộ Quốc phòng). Điểm chuẩn rất cao.',
      difficulty: 'Dễ',
      topic: 'học vấn',
    },
    {
      q: 'Đặc điểm BIG NHẤT của ngành công an/quân đội?',
      choices: ['Lương cao tự do', 'Bao cấp + ổn định + có hộ khẩu + biên chế suốt đời', 'Bay nhảy nhiều', 'Tự do giờ giấc'],
      correctIdx: 1,
      explain: 'Ngành lực lượng vũ trang: học miễn phí + được bao ăn ở, ra trường được phân công công tác, biên chế suốt đời, hộ khẩu thành phố lớn.',
      difficulty: 'Trung bình',
      topic: 'lộ trình',
    },
    {
      q: 'Lương sĩ quan công an mới ra trường (2026)?',
      choices: ['3 triệu', '8-12 triệu + phụ cấp + bao ăn ở', '50 triệu', '500 triệu'],
      correctIdx: 1,
      explain: 'Sĩ quan công an/quân đội cấp uý mới ra trường 8-12 triệu/tháng + phụ cấp + bao ăn ở + đồng phục. Đại tá lên có thể 25-45 triệu.',
      difficulty: 'Dễ',
      topic: 'lương',
    },
    {
      q: 'AI ảnh hưởng tới ngành an ninh ra sao?',
      choices: ['Thay thế công an hoàn toàn', 'AI camera + nhận dạng + phân tích tội phạm; sĩ quan tập trung tác nghiệp + điều tra', 'Không thay đổi', 'Cấm dùng AI'],
      correctIdx: 1,
      explain: 'AI camera nhận diện face/biển số đã triển khai HN, TP.HCM. AI phân tích pattern tội phạm. Sĩ quan tập trung tác nghiệp + tâm lý điều tra — phần con người giữ.',
      difficulty: 'Khó',
      topic: 'AI exposure',
    },
    {
      q: 'Phẩm chất QUAN TRỌNG NHẤT của quân nhân/cảnh sát?',
      choices: ['Toán cực giỏi', 'Kỷ luật + thể lực + trung thành tổ quốc', 'Hát hay', 'Code Python'],
      correctIdx: 1,
      explain: 'Ngành lực lượng vũ trang đòi hỏi kỷ luật tuyệt đối, thể lực tốt (vượt bài thi quân sự), và lòng trung thành với nhân dân, tổ quốc.',
      difficulty: 'Trung bình',
      topic: 'tính cách',
    },
  ],
}

/* ────────────────────────── Helpers ────────────────────────── */

/**
 * Lấy ngẫu nhiên N câu hỏi từ pool của 1 nghề.
 * Mỗi lần gọi tạo thứ tự random khác nhau — phù hợp để replay.
 */
export function getCareerQuestions(careerId: string, n = 3): CareerQuizQuestion[] {
  const pool = careerQuizzes[careerId] || []
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, pool.length))
}

/** Tổng số nghề có quiz */
export function getCareerQuizCount(): number {
  return Object.keys(careerQuizzes).length
}

/** Check 1 nghề có sẵn quiz chưa */
export function hasQuizForCareer(careerId: string): boolean {
  return Array.isArray(careerQuizzes[careerId]) && careerQuizzes[careerId].length > 0
}
