/**
 * Dữ liệu chi tiết nghề nghiệp - Thông tin toàn diện để học sinh phân tích
 * Cập nhật 2026 với dữ liệu lương thực tế Việt Nam và phân tích AI exposure
 */

export interface CareerDetail {
  id: string
  name: string
  icon: string // emoji
  category: string
  shortDescription: string
  fullDescription: string

  // Yêu cầu học vấn
  education: {
    minimumDegree: string // "Đại học", "Cao đẳng", "Thạc sĩ"
    recommendedMajors: string[]
    topUniversities: { name: string; location: string; ranking?: string }[]
    certifications?: string[]
  }

  // Kỹ năng cần có
  skills: {
    technical: { name: string; level: 'Cơ bản' | 'Trung bình' | 'Nâng cao' | 'Chuyên gia' }[]
    soft: string[]
    tools: string[]
  }

  // Thị trường lao động
  market: {
    demandLevel: 'Rất cao' | 'Cao' | 'Trung bình' | 'Thấp'
    salaryRange: { entry: string; mid: string; senior: string }
    growthRate: string // e.g. "+25% trong 5 năm"
    totalJobs: string // e.g. "~50,000 vị trí tại VN"
    topEmployers: string[]
    workEnvironment: string[]
  }

  // Lộ trình phát triển
  roadmap: {
    stage: string
    title: string
    duration: string
    description: string
    salary?: string
  }[]

  // Ưu & nhược điểm
  pros: string[]
  cons: string[]

  // Tính cách phù hợp
  suitablePersonalities: string[] // MBTI types
  suitableHolland: string[] // Holland codes

  // Ngành liên quan
  relatedCareers: string[]

  // Môn học quan trọng
  importantSubjects: { name: string; importance: 'Rất quan trọng' | 'Quan trọng' | 'Hữu ích' }[]

  // A Day in the Life
  dailyLife: string[]

  // AI Exposure Analysis (mới thêm 2026)
  aiExposure: {
    score: number // 0-10, dựa theo phân tích Karpathy
    trend: 'Tăng' | 'Giảm' | 'Ổn định'
    analysis: string // phân tích tác động AI ngắn gọn bằng tiếng Việt
  }

  // ── Trường đại học Việt Nam phù hợp (cập nhật hằng năm) ─────────
  /**
   * Danh sách trường ĐH Việt Nam phù hợp cho ngành nghề này,
   * kèm lực học (điểm chuẩn), học phí và tiêu chí xét tuyển.
   * Dữ liệu được cập nhật theo năm — năm hiện tại 2026.
   */
  universitiesVN?: {
    /** Năm cập nhật dữ liệu (ví dụ 2026) — hiển thị ngay trên UI */
    dataYear: number
    /** Ghi chú chung về ngành tại VN (ví dụ: "Học phí tăng 8-10%/năm") */
    note?: string
    schools: Array<{
      /** Tên đầy đủ của trường */
      name: string
      /** Viết tắt (NEU, HUST, FTU, v.v.) */
      shortName?: string
      /** Tỉnh/thành */
      location: string
      /** Lực học tương đối — giúp học sinh tự đánh giá khả năng */
      tier: 'Top đầu' | 'Top cao' | 'Khá tốt' | 'Trung bình'
      /** Chuyên ngành cụ thể tại trường (nếu khác tên ngành chung) */
      programName?: string
      /** Các khối xét tuyển phổ biến: A00, A01, D01, D07, B00... */
      admissionBlocks?: string[]
      /** Điểm chuẩn 2025 (tham khảo cho kỳ 2026) theo từng khối — 0..30 */
      minScore2026?: Array<{ block: string; score: number }>
      /** Học phí 1 năm (ví dụ: "25-35 triệu/năm") */
      tuitionPerYear: string
      /** Ghi chú học phí (chương trình CLC, tiên tiến, liên kết quốc tế...) */
      tuitionNote?: string
      /** Phương thức xét tuyển được chấp nhận */
      admissionMethods?: string[]
      /** Điểm mạnh nổi bật của trường trong ngành này */
      strengths?: string[]
    }>
  }

  // ── Công việc cụ thể — Làm gì? Ở đâu? ────────────────────────────
  /**
   * Mô tả rõ hơn công việc cụ thể của ngành nghề:
   * - responsibilities: Những đầu việc thực tế hằng ngày/hằng tháng
   * - workplaces: Các loại nơi làm việc + ví dụ đơn vị tuyển dụng
   * - specializations: Các hướng chuyên môn sâu trong ngành
   */
  jobTasks?: {
    /** Công việc cụ thể — làm gì? */
    responsibilities: string[]
    /** Nơi làm việc điển hình — ở đâu? */
    workplaces: Array<{
      /** Loại tổ chức, ví dụ: "Công ty kiểm toán Big 4" */
      type: string
      /** Ví dụ đơn vị/công ty cụ thể */
      examples: string[]
      /** Ghi chú thêm về vai trò tại nơi này */
      note?: string
    }>
    /** Các chuyên môn/hướng đi cụ thể trong ngành */
    specializations?: Array<{ name: string; description: string }>
  }
}

export const careerDetails: Record<string, CareerDetail> = {
  'ky-su-phan-mem': {
    id: 'ky-su-phan-mem',
    name: 'Kỹ sư phần mềm',
    icon: '💻',
    category: 'Công nghệ thông tin',
    shortDescription: 'Thiết kế, phát triển và bảo trì các hệ thống phần mềm',
    fullDescription: 'Kỹ sư phần mềm là người chịu trách nhiệm thiết kế, phát triển, kiểm thử và bảo trì các ứng dụng và hệ thống phần mềm. Công việc đòi hỏi tư duy logic mạnh mẽ, khả năng giải quyết vấn đề và liên tục cập nhật công nghệ mới. Năm 2026, kỹ sư phần mềm không chỉ code mà còn phải biết làm việc cùng AI tools như GitHub Copilot, Claude, và các hệ thống tự động hóa.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Công nghệ thông tin', 'Khoa học máy tính', 'Kỹ thuật phần mềm', 'Toán tin'],
      topUniversities: [
        { name: 'ĐH Bách khoa Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Bách khoa TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Công nghệ - ĐHQGHN', location: 'Hà Nội', ranking: 'Top 3' },
        { name: 'ĐH CNTT - ĐHQG TP.HCM', location: 'TP.HCM', ranking: 'Top 4' },
        { name: 'ĐH FPT', location: 'Toàn quốc', ranking: 'Top 5' },
        { name: 'ĐH Khoa học Tự nhiên - ĐHQG', location: 'TP.HCM / HN' },
      ],
      certifications: ['AWS Certified Developer', 'Google Cloud Professional', 'Microsoft Azure', 'Scrum Master'],
    },
    skills: {
      technical: [
        { name: 'Lập trình (Python/Java/TypeScript/Go)', level: 'Chuyên gia' },
        { name: 'Cấu trúc dữ liệu & Giải thuật', level: 'Nâng cao' },
        { name: 'Cơ sở dữ liệu (SQL/NoSQL)', level: 'Nâng cao' },
        { name: 'Git & Version Control', level: 'Nâng cao' },
        { name: 'DevOps & CI/CD', level: 'Nâng cao' },
        { name: 'Cloud Computing (AWS/GCP/Azure)', level: 'Nâng cao' },
        { name: 'System Design', level: 'Nâng cao' },
        { name: 'AI/ML Integration', level: 'Trung bình' },
      ],
      soft: ['Tư duy logic', 'Giải quyết vấn đề', 'Làm việc nhóm', 'Giao tiếp kỹ thuật', 'Quản lý thời gian', 'Tự học liên tục'],
      tools: ['VS Code', 'Git/GitHub', 'Docker', 'Kubernetes', 'Jira', 'Figma', 'Postman', 'Terminal/CLI', 'GitHub Copilot'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '12-20 triệu', mid: '30-50 triệu', senior: '60-120 triệu' },
      growthRate: '+30% trong 5 năm tới',
      totalJobs: '~150,000 vị trí tại Việt Nam',
      topEmployers: ['FPT Software', 'VNG', 'Viettel', 'Samsung Vietnam', 'Grab', 'Shopee', 'Google', 'Microsoft', 'Tiktok Vietnam'],
      workEnvironment: ['Văn phòng công ty tech', 'Remote/Hybrid', 'Startup', 'Freelance'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên / Thực tập', duration: '4 năm', description: 'Học đại học CNTT, làm dự án cá nhân, thực tập tại công ty', salary: '0-5 triệu' },
      { stage: '2', title: 'Junior Developer', duration: '1-2 năm', description: 'Code theo hướng dẫn, fix bug, viết test, học từ senior', salary: '12-18 triệu' },
      { stage: '3', title: 'Mid-level Developer', duration: '2-3 năm', description: 'Tự thiết kế feature, review code, mentor junior', salary: '30-45 triệu' },
      { stage: '4', title: 'Senior Developer', duration: '3-5 năm', description: 'Thiết kế hệ thống, lead team nhỏ, quyết định công nghệ', salary: '50-80 triệu' },
      { stage: '5', title: 'Tech Lead / Architect', duration: '5+ năm', description: 'Kiến trúc hệ thống lớn, lead nhiều team, định hướng kỹ thuật', salary: '80-120 triệu+' },
    ],
    pros: [
      'Thu nhập cao và ổn định (trong top 3 ngành cao lương)',
      'Nhu cầu tuyển dụng lớn, dễ tìm việc',
      'Có thể làm việc remote từ bất cứ đâu',
      'Nhiều cơ hội làm việc tại nước ngoài',
      'Công việc sáng tạo, không nhàm chán',
      'Cộng đồng hỗ trợ lớn (open source, forum)',
    ],
    cons: [
      'Cần học hỏi liên tục, công nghệ thay đổi nhanh',
      'Ngồi nhiều, có thể ảnh hưởng sức khỏe',
      'Áp lực deadline, overtime khi gần release',
      'Cạnh tranh cao ở level cao',
      'Có thể bị stress khi debug phức tạp',
      'Dễ bị AI automation tác động đến tầm thấp',
    ],
    suitablePersonalities: ['INTJ', 'INTP', 'ISTJ', 'ISTP', 'ENTJ', 'ENTP'],
    suitableHolland: ['I', 'R', 'C'],
    relatedCareers: ['Nhà khoa học dữ liệu', 'Kỹ sư AI', 'DevOps Engineer', 'Product Manager', 'UX Designer'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Rất quan trọng' },
      { name: 'Vật lý', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
    ],
    dailyLife: [
      '9:00 - Stand-up meeting 15 phút với team',
      '9:30 - Code feature mới hoặc fix bug (sử dụng AI assist)',
      '11:30 - Code review cho đồng nghiệp',
      '13:30 - Họp thiết kế kỹ thuật cho sprint tiếp',
      '14:30 - Tiếp tục code, viết unit test',
      '16:00 - Pair programming với junior',
      '17:00 - Cập nhật tài liệu, push code',
    ],
    aiExposure: {
      score: 8,
      trend: 'Tăng',
      analysis: 'Kỹ sư phần mềm sử dụng AI tools như GitHub Copilot, Claude, ChatGPT để coding nhanh hơn. AI có thể code 40-60% tasks đơn giản, nhưng vẫn cần human để thiết kế, review, debug phức tạp. Công việc trở thành "AI-augmented", không bị thay thế hoàn toàn. Thu nhập cao giúp job này kháng cự AI tốt.',
    },
  },

  'nha-khoa-hoc-du-lieu': {
    id: 'nha-khoa-hoc-du-lieu',
    name: 'Nhà khoa học dữ liệu',
    icon: '📊',
    category: 'Công nghệ thông tin',
    shortDescription: 'Phân tích dữ liệu lớn để tìm insight và xây dựng mô hình dự đoán',
    fullDescription: 'Nhà khoa học dữ liệu kết hợp thống kê, lập trình và kiến thức chuyên ngành để phân tích dữ liệu phức tạp, xây dựng mô hình machine learning và đưa ra insight giúp doanh nghiệp ra quyết định. Năm 2026, công việc ngày càng tập trung vào việc sử dụng các mô hình AI sẵn có thay vì phát triển từ đầu.',
    education: {
      minimumDegree: 'Đại học (Thạc sĩ ưu tiên)',
      recommendedMajors: ['Khoa học dữ liệu', 'Toán ứng dụng', 'Thống kê', 'Khoa học máy tính', 'Kỹ thuật AI'],
      topUniversities: [
        { name: 'ĐH Bách khoa Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH Khoa học Tự nhiên - ĐHQG', location: 'HN / HCM' },
        { name: 'ĐH CNTT - ĐHQG TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH FPT', location: 'Toàn quốc' },
      ],
      certifications: ['Google Data Analytics', 'IBM Data Science', 'TensorFlow Developer', 'AWS ML Specialty'],
    },
    skills: {
      technical: [
        { name: 'Python (Pandas, NumPy, Scikit-learn)', level: 'Chuyên gia' },
        { name: 'SQL & Database', level: 'Nâng cao' },
        { name: 'Machine Learning / Deep Learning', level: 'Nâng cao' },
        { name: 'Thống kê & Xác suất', level: 'Nâng cao' },
        { name: 'Data Visualization', level: 'Nâng cao' },
        { name: 'Big Data (Spark, Hadoop)', level: 'Trung bình' },
        { name: 'LLM & AI Models', level: 'Trung bình' },
      ],
      soft: ['Tư duy phân tích', 'Kể chuyện bằng dữ liệu', 'Tò mò', 'Kiên nhẫn', 'Giao tiếp kết quả', 'Tính kỷ luật cao'],
      tools: ['Jupyter Notebook', 'Tableau/Power BI', 'TensorFlow/PyTorch', 'SQL', 'Git', 'Airflow', 'Claude/ChatGPT'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '12-20 triệu', mid: '30-45 triệu', senior: '50-100 triệu' },
      growthRate: '+35% trong 5 năm tới',
      totalJobs: '~35,000 vị trí tại Việt Nam',
      topEmployers: ['VNG', 'FPT', 'MoMo', 'VinAI', 'Techcombank', 'Viettel AI', 'Shopee', 'Sky Mavis'],
      workEnvironment: ['Văn phòng công ty', 'Remote/Hybrid', 'Nghiên cứu viện'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên / Thực tập', duration: '4 năm', description: 'Học nền tảng toán, thống kê, lập trình Python', salary: '0-5 triệu' },
      { stage: '2', title: 'Data Analyst', duration: '1-2 năm', description: 'Phân tích dữ liệu, tạo báo cáo, SQL, Excel', salary: '12-18 triệu' },
      { stage: '3', title: 'Junior Data Scientist', duration: '1-2 năm', description: 'Xây dựng mô hình ML đầu tiên, feature engineering', salary: '18-30 triệu' },
      { stage: '4', title: 'Senior Data Scientist', duration: '3-4 năm', description: 'Lead dự án ML, deploy model, mentor team', salary: '35-60 triệu' },
      { stage: '5', title: 'Principal / Head of DS', duration: '5+ năm', description: 'Chiến lược dữ liệu, quản lý team, R&D', salary: '60-100 triệu+' },
    ],
    pros: [
      'Thu nhập cao, trong top 3 ngành lương cao',
      'Được làm với công nghệ tiên tiến (AI/ML)',
      'Mỗi dự án là một bài toán mới',
      'Nhiều ngành cần (finance, health, tech, retail)',
      'Công việc ít quỹ tục, tập trung vào problem-solving',
    ],
    cons: [
      'Cần nền tảng toán/thống kê vững',
      'Dữ liệu thực tế thường "bẩn" và phức tạp',
      'Kết quả không phải lúc nào cũng rõ ràng',
      'Cần Thạc sĩ cho vị trí cao',
      'Nhiều công việc routine sẽ bị AI automation',
    ],
    suitablePersonalities: ['INTJ', 'INTP', 'ISTJ', 'ENTJ', 'ENTP'],
    suitableHolland: ['I', 'C', 'R'],
    relatedCareers: ['Kỹ sư AI', 'Kỹ sư phần mềm', 'Data Engineer', 'Business Analyst'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'Vật lý', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '9:00 - Review kết quả model chạy overnight',
      '9:30 - Standup meeting với team',
      '10:00 - Explore & clean data mới (75% thời gian)',
      '11:30 - Họp với business team để hiểu yêu cầu',
      '13:30 - Xây dựng và train model (hoặc sử dụng pre-trained model)',
      '15:00 - Phân tích kết quả, tạo visualization',
      '16:30 - Viết report, present findings',
    ],
    aiExposure: {
      score: 7,
      trend: 'Tăng',
      analysis: 'Nhà khoa học dữ liệu sử dụng AI models sẵn có (GPT, LLMs) thay vì phát triển từ đầu. AutoML tools giúp tự động hóa 30-40% workflow. Tuy nhiên, vẫn cần human để hiểu business problem, clean data, interpret results. Job này tiến hóa thành "AI-guided analytics" chứ không bị thay thế.',
    },
  },

  'kien-truc-su': {
    id: 'kien-truc-su',
    name: 'Kiến trúc sư',
    icon: '🏛️',
    category: 'Kiến trúc & Xây dựng',
    shortDescription: 'Thiết kế công trình kiến trúc sáng tạo và bền vững',
    fullDescription: 'Kiến trúc sư là người sáng tạo không gian sống và làm việc. Công việc kết hợp giữa nghệ thuật, kỹ thuật và hiểu biết về con người để tạo ra những công trình vừa đẹp, vừa thực dụng và bền vững. Công nghệ AI 2026 hỗ trợ design nhưng không thay thế khả năng sáng tạo con người.',
    education: {
      minimumDegree: 'Đại học (5 năm)',
      recommendedMajors: ['Kiến trúc', 'Kiến trúc cảnh quan', 'Quy hoạch đô thị', 'Thiết kế nội thất'],
      topUniversities: [
        { name: 'ĐH Kiến trúc Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Kiến trúc TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Xây dựng Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH Bách khoa TP.HCM', location: 'TP.HCM' },
      ],
      certifications: ['Chứng chỉ hành nghề kiến trúc sư', 'LEED Certification', 'AutoCAD Professional', 'BIM Specialist'],
    },
    skills: {
      technical: [
        { name: 'Thiết kế kiến trúc', level: 'Chuyên gia' },
        { name: 'AutoCAD / Revit / BIM', level: 'Chuyên gia' },
        { name: '3D Modeling (SketchUp, Unreal, AI design tools)', level: 'Nâng cao' },
        { name: 'Vẽ kỹ thuật & phối cảnh', level: 'Nâng cao' },
        { name: 'Kiến thức xây dựng & kết cấu', level: 'Trung bình' },
        { name: 'Sustainable design', level: 'Nâng cao' },
      ],
      soft: ['Sáng tạo', 'Tư duy không gian', 'Giao tiếp với khách hàng', 'Quản lý dự án', 'Thẩm mỹ', 'Khả năng lắng nghe'],
      tools: ['AutoCAD', 'Revit', 'SketchUp', 'Lumion', 'Photoshop', 'V-Ray', 'AI design assistants'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '8-15 triệu', mid: '20-35 triệu', senior: '40-80 triệu' },
      growthRate: '+18% trong 5 năm tới',
      totalJobs: '~45,000 vị trí tại Việt Nam',
      topEmployers: ['Vingroup', 'Novaland', 'CapitaLand', 'Các công ty thiết kế', 'Vinhomes', 'Masterise'],
      workEnvironment: ['Công ty thiết kế', 'Văn phòng kiến trúc', 'Freelance', 'Công trường'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên kiến trúc', duration: '5 năm', description: 'Học thiết kế, vẽ kỹ thuật, lịch sử kiến trúc', salary: '0' },
      { stage: '2', title: 'KTS tập sự', duration: '2-3 năm', description: 'Hỗ trợ thiết kế, vẽ bản vẽ chi tiết', salary: '8-12 triệu' },
      { stage: '3', title: 'KTS chính', duration: '3-5 năm', description: 'Chủ trì thiết kế dự án, giao tiếp khách hàng', salary: '18-32 triệu' },
      { stage: '4', title: 'KTS trưởng', duration: '5-8 năm', description: 'Quản lý nhiều dự án, define phong cách', salary: '35-65 triệu' },
      { stage: '5', title: 'Giám đốc / Mở văn phòng', duration: '10+ năm', description: 'Điều hành công ty, dự án lớn, thương hiệu cá nhân', salary: '70-200 triệu+' },
    ],
    pros: [
      'Công việc sáng tạo, để lại dấu ấn vật lý',
      'Kết hợp nghệ thuật và kỹ thuật',
      'Đa dạng dự án, không nhàm chán',
      'Thu nhập cao khi có kinh nghiệm',
      'Công nhận xã hội cao',
    ],
    cons: [
      'Thời gian học dài (5 năm)',
      'Giai đoạn đầu lương thấp',
      'Áp lực deadline, sửa đi sửa lại',
      'Cần chứng chỉ hành nghề',
      'Phụ thuộc vào tình hình xây dựng của đất nước',
    ],
    suitablePersonalities: ['INTJ', 'INFJ', 'ISFP', 'INTP', 'ENTP', 'ENFP'],
    suitableHolland: ['A', 'R', 'I'],
    relatedCareers: ['Kỹ sư xây dựng', 'Thiết kế nội thất', 'Quy hoạch đô thị', 'UI/UX Designer'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Quan trọng' },
      { name: 'Vật lý', importance: 'Quan trọng' },
      { name: 'Mỹ thuật', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '8:30 - Họp nhanh với team dự án',
      '9:00 - Phát triển concept thiết kế (sử dụng AI tools để generate ideas)',
      '10:30 - Họp với khách hàng trình bày phương án',
      '13:30 - Vẽ bản vẽ chi tiết trên Revit/CAD',
      '15:00 - Render phối cảnh 3D',
      '16:30 - Review bản vẽ kỹ thuật với kỹ sư',
    ],
    aiExposure: {
      score: 4,
      trend: 'Ổn định',
      analysis: 'AI tools giúp kiến trúc sư generate design concepts nhanh hơn và render 3D tự động. Tuy nhiên, sáng tạo, hiểu client, và quyết định cuối cùng vẫn cần human. Công việc này ít bị AI thay thế vì nó là nghệ thuật ứng dụng.',
    },
  },

  'nha-nghien-cuu-ai': {
    id: 'nha-nghien-cuu-ai',
    name: 'Nhà nghiên cứu AI',
    icon: '🤖',
    category: 'Công nghệ thông tin',
    shortDescription: 'Nghiên cứu và phát triển các thuật toán trí tuệ nhân tạo tiên tiến',
    fullDescription: 'Nhà nghiên cứu AI tạo ra các thuật toán và mô hình mới trong lĩnh vực trí tuệ nhân tạo. Từ xử lý ngôn ngữ tự nhiên đến thị giác máy tính, họ đẩy ranh giới của những gì máy móc có thể làm. Năm 2026, nhu cầu nhà nghiên cứu AI tăng đột biến vì cuộc đua AI giữa các công ty lớn.',
    education: {
      minimumDegree: 'Thạc sĩ (Tiến sĩ ưu tiên)',
      recommendedMajors: ['Trí tuệ nhân tạo', 'Khoa học máy tính', 'Toán ứng dụng', 'Kỹ thuật điện tử', 'Xử lý tín hiệu số'],
      topUniversities: [
        { name: 'VinAI Research', location: 'Hà Nội', ranking: 'Viện NC' },
        { name: 'ĐH Bách khoa Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH CNTT - ĐHQG', location: 'HN / HCM' },
        { name: 'Du học: Stanford, MIT, CMU, Berkeley', location: 'Mỹ' },
      ],
      certifications: ['Deep Learning Specialization (Coursera)', 'Research publications (ICML, NeurIPS, CVPR, ICLR)'],
    },
    skills: {
      technical: [
        { name: 'Machine Learning & Deep Learning', level: 'Chuyên gia' },
        { name: 'Python, C++, CUDA', level: 'Chuyên gia' },
        { name: 'Toán học cao cấp (Đại số tuyến tính, Xác suất)', level: 'Chuyên gia' },
        { name: 'Nghiên cứu khoa học (paper writing)', level: 'Nâng cao' },
        { name: 'GPU Computing & Optimization', level: 'Nâng cao' },
        { name: 'Transformer & LLM architectures', level: 'Nâng cao' },
      ],
      soft: ['Tư duy sáng tạo', 'Kiên trì', 'Kỹ năng trình bày', 'Hợp tác với team'],
      tools: ['PyTorch', 'TensorFlow', 'Jupyter', 'Git', 'LaTeX', 'CUDA', 'Weights & Biases'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '15-25 triệu', mid: '50-85 triệu', senior: '85-125 triệu' },
      growthRate: '+50% trong 5 năm tới',
      totalJobs: '~8,000 vị trí tại Việt Nam (tăng nhanh)',
      topEmployers: ['VinAI', 'FPT AI', 'Viettel AI', 'Google Vietnam', 'Microsoft Vietnam', 'ByteDance (Vietnam)', 'Samsung'],
      workEnvironment: ['Viện nghiên cứu', 'Công ty tech lớn', 'Remote', 'Du học nước ngoài'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên & Thạc sĩ', duration: '2 năm', description: 'Học lý thuyết sâu, viết paper đầu tiên', salary: '0-5 triệu' },
      { stage: '2', title: 'Junior Researcher', duration: '1-2 năm', description: 'Phát triển thuật toán, công bố paper tại hội nghị nhỏ', salary: '15-25 triệu' },
      { stage: '3', title: 'Senior Researcher', duration: '3-5 năm', description: 'Lead project, publish tại top conference (ICML, NeurIPS)', salary: '50-75 triệu' },
      { stage: '4', title: 'Principal Researcher', duration: '5-8 năm', description: 'Define research direction, mentor team, strategic impact', salary: '80-120 triệu' },
      { stage: '5', title: 'Head of AI Lab / Chief Scientist', duration: '10+ năm', description: 'Điều hành viện/lab AI, định hướng công ty', salary: '120-150 triệu+' },
    ],
    pros: [
      'Thu nhập cực cao, highest paid IT role',
      'Công việc sáng tạo, tại ranh giới khoa học',
      'Được làm việc với những người thông minh nhất',
      'Đóng góp vào sự phát triển của AI toàn cầu',
      'Tự do học hỏi liên tục',
    ],
    cons: [
      'Cần nền tảng toán học rất vững',
      'Áp lực công bố paper (publish or perish)',
      'Kết quả không phải lúc nào cũng thành công',
      'Cần Thạc sĩ/Tiến sĩ bắt buộc',
      'Chỉ có ~8,000 vị trí tại VN, rất cạnh tranh',
    ],
    suitablePersonalities: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
    suitableHolland: ['I', 'R'],
    relatedCareers: ['Kỹ sư phần mềm (AI team)', 'Nhà khoa học dữ liệu', 'Tiến sĩ Toán/Khoa học'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Rất quan trọng' },
      { name: 'Vật lý', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
    ],
    dailyLife: [
      '9:00 - Đọc papers mới về lĩnh vực',
      '10:00 - Brainstorm idea mới với team',
      '11:00 - Implement prototype thuật toán',
      '13:30 - Chạy thí nghiệm trên GPU cluster',
      '15:00 - Phân tích kết quả',
      '16:00 - Viết paper hoặc giảng dạy',
      '18:00 - Thảo luận với cộng sự quốc tế',
    ],
    aiExposure: {
      score: 6,
      trend: 'Ổn định',
      analysis: 'Nhà nghiên cứu AI sử dụng chính những tools AI mà họ phát triển. Công việc này không bị thay thế bởi AI, mà là người tạo ra AI. Tuy nhiên, AI copilots giúp viết code và paper nhanh hơn. Job này là "AI-enabled research" chứ không bị thay thế.',
    },
  },

  'bac-si': {
    id: 'bac-si',
    name: 'Bác sĩ',
    icon: '⚕️',
    category: 'Y tế',
    shortDescription: 'Chẩn đoán, điều trị và phòng ngừa bệnh tật cho bệnh nhân',
    fullDescription: 'Bác sĩ là chuyên gia y khoa chịu trách nhiệm chẩn đoán, điều trị và phòng ngừa bệnh tật. Công việc đòi hỏi kiến thức y khoa sâu, kỹ năng giao tiếp, sự đồng cảm và khả năng quyết định nhanh trong tình huống khẩn cấp. Năm 2026, AI giúp hỗ trợ chẩn đoán nhưng bác sĩ vẫn quyết định cuối cùng.',
    education: {
      minimumDegree: 'Đại học (6 năm)',
      recommendedMajors: ['Y khoa', 'Nha khoa', 'Dược học', 'Kỹ thuật y sinh'],
      topUniversities: [
        { name: 'ĐH Y Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Y TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Y Huế', location: 'Huế' },
        { name: 'ĐH Y Dược Hải Phòng', location: 'Hải Phòng' },
      ],
      certifications: ['Chứng chỉ hành nghề bác sĩ', 'Chứng chỉ chuyên khoa (Nội, Ngoại, v.v.)', 'Giấy phép hành nghề y khoa'],
    },
    skills: {
      technical: [
        { name: 'Kiến thức y khoa', level: 'Chuyên gia' },
        { name: 'Chẩn đoán lâm sàng', level: 'Chuyên gia' },
        { name: 'Kỹ thuật điều trị / Phẫu thuật', level: 'Nâng cao' },
        { name: 'Đọc hiểu hình ảnh y tế (X-ray, CT, MRI)', level: 'Nâng cao' },
        { name: 'Sử dụng AI diagnostic tools', level: 'Trung bình' },
      ],
      soft: ['Đồng cảm', 'Giao tiếp tốt', 'Quyết đoán', 'Kiên nhẫn', 'Chịu áp lực cao'],
      tools: ['EMR (Electronic Medical Record)', 'AI diagnostic software', 'Thiết bị y tế', 'Telemedicine platform'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '6-10 triệu (công)', mid: '15-30 triệu', senior: '40-100 triệu' },
      growthRate: '+15% trong 5 năm tới',
      totalJobs: '~180,000 bác sĩ tại Việt Nam',
      topEmployers: ['Bệnh viện công lập', 'Bệnh viện tư thục', 'Phòng khám riêng', 'Trung tâm y tế cơ sở'],
      workEnvironment: ['Bệnh viện', 'Phòng khám', 'Clinic', 'Telemedicine'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Y', duration: '6 năm', description: 'Học lý thuyết y khoa, thực hành lâm sàng', salary: '0' },
      { stage: '2', title: 'Bác sĩ thực tập', duration: '1 năm', description: 'Thực tập tại bệnh viện, làm dưới sự giám sát', salary: '6-8 triệu' },
      { stage: '3', title: 'Bác sĩ chính thức (Khám & Điều trị)', duration: '3-5 năm', description: 'Khám bệnh nhân độc lập, điều trị', salary: '10-20 triệu' },
      { stage: '4', title: 'Bác sĩ chuyên khoa / Trưởng khoa', duration: '5-10 năm', description: 'Chuyên môn sâu, quản lý khoa/phòng', salary: '25-50 triệu' },
      { stage: '5', title: 'Giáo sư / Phó giám đốc BV / Mở phòng khám', duration: '15+ năm', description: 'Giảng dạy, quản lý bệnh viện, hoặc kinh doanh tư nhân', salary: '60-200 triệu+' },
    ],
    pros: [
      'Công việc cao quý, giúp đỡ con người',
      'Thu nhập cao, nhất là khi có phòng khám tư',
      'Nhu cầu tuyển dụng lớn',
      'Công nhận xã hội cao',
      'Cơ hội làm việc nước ngoài',
    ],
    cons: [
      'Lương công lập thấp (~6 triệu khi vừa ra trường)',
      'Thời gian học dài (6 năm đại học + tập sự)',
      'Áp lực cao, trách nhiệm với tính mạng bệnh nhân',
      'Thời gian làm việc dài, ca trực nhiều',
      'Cần cập nhật kiến thức y khoa liên tục',
    ],
    suitablePersonalities: ['ISFJ', 'ENFJ', 'ESFJ', 'INFJ', 'ISTJ'],
    suitableHolland: ['S', 'I'],
    relatedCareers: ['Y tá', 'Dược sĩ', 'Nhân viên y tế', 'Nhà tâm lý lâm sàng'],
    importantSubjects: [
      { name: 'Sinh học', importance: 'Rất quan trọng' },
      { name: 'Hóa học', importance: 'Rất quan trọng' },
      { name: 'Vật lý', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '7:00 - Giao ban sáng, nhận ca bệnh',
      '7:30 - Đi khám bệnh nhân nội trú (support by AI triage)',
      '9:00 - Khám ngoại trú tại phòng khám',
      '11:30 - Hội chẩn ca bệnh phức tạp',
      '13:30 - Phẫu thuật (ngoại khoa) / Thủ thuật',
      '15:30 - Viết bệnh án, cập nhật điều trị',
      '17:00 - Giao ban chiều, bàn giao ca',
    ],
    aiExposure: {
      score: 3,
      trend: 'Tăng',
      analysis: 'AI hỗ trợ chẩn đoán bằng hình ảnh (CT, MRI), gợi ý điều trị dựa trên data bệnh nhân. Tuy nhiên, bác sĩ vẫn phải kiểm tra chéo, quyết định cuối cùng, và giao tiếp với bệnh nhân. AI là "second opinion", không thay thế bác sĩ. Job này an toàn vì tính nhân đạo cao.',
    },
  },

  'giao-vien': {
    id: 'giao-vien',
    name: 'Giáo viên',
    icon: '📚',
    category: 'Giáo dục',
    shortDescription: 'Giảng dạy, truyền đạt kiến thức và hình thành nhân cách cho học sinh',
    fullDescription: 'Giáo viên đóng vai trò quan trọng trong việc đào tạo thế hệ tương lai. Ngoài truyền đạt kiến thức, giáo viên còn là người hướng dẫn, truyền cảm hứng và hỗ trợ sự phát triển toàn diện của học sinh. Năm 2026, giáo viên sử dụng AI tools để cá nhân hóa học tập, nhưng vai trò mentoring vẫn là trung tâm.',
    education: {
      minimumDegree: 'Đại học Sư phạm',
      recommendedMajors: ['Sư phạm các ngành', 'Giáo dục học', 'Tâm lý giáo dục'],
      topUniversities: [
        { name: 'ĐH Sư phạm Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Sư phạm TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Sư phạm Huế', location: 'Huế' },
        { name: 'ĐH Giáo dục - ĐHQGHN', location: 'Hà Nội' },
      ],
      certifications: ['Chứng chỉ nghiệp vụ sư phạm', 'IELTS/TOEFL (dạy tiếng Anh)', 'Chứng chỉ ứng dụng CNTT'],
    },
    skills: {
      technical: [
        { name: 'Kiến thức chuyên môn', level: 'Chuyên gia' },
        { name: 'Phương pháp giảng dạy hiện đại', level: 'Nâng cao' },
        { name: 'Ứng dụng CNTT & AI trong dạy học', level: 'Trung bình' },
        { name: 'Đánh giá học sinh', level: 'Nâng cao' },
        { name: 'Tâm lý học giáo dục', level: 'Nâng cao' },
      ],
      soft: ['Kiên nhẫn', 'Đồng cảm', 'Truyền cảm hứng', 'Giao tiếp tốt', 'Sáng tạo', 'Công bằng'],
      tools: ['PowerPoint', 'Google Classroom', 'Zoom/Teams', 'Phần mềm soạn đề', 'Bảng tương tác', 'AI tutoring tools'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '5-8 triệu', mid: '10-18 triệu', senior: '20-35 triệu' },
      growthRate: '+12% trong 5 năm tới',
      totalJobs: '~1,200,000 giáo viên tại Việt Nam',
      topEmployers: ['Trường công lập', 'Trường quốc tế', 'Trung tâm luyện thi', 'Trường tư thục', 'EdTech platforms'],
      workEnvironment: ['Trường học', 'Trung tâm giáo dục', 'Online / Hybrid', 'Gia sư tại nhà'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Sư phạm', duration: '4 năm', description: 'Học kiến thức chuyên ngành + nghiệp vụ sư phạm', salary: '0' },
      { stage: '2', title: 'Giáo viên tập sự', duration: '1 năm', description: 'Dạy dưới hướng dẫn, làm quen môi trường', salary: '5-7 triệu' },
      { stage: '3', title: 'Giáo viên chính thức', duration: '3-5 năm', description: 'Dạy chính, chủ nhiệm lớp, tham gia chuyên đề', salary: '8-15 triệu' },
      { stage: '4', title: 'Giáo viên cốt cán', duration: '5-8 năm', description: 'Mentor giáo viên trẻ, nghiên cứu phương pháp', salary: '15-22 triệu' },
      { stage: '5', title: 'Chuyên gia / Quản lý', duration: '10+ năm', description: 'Phó hiệu trưởng, chuyên gia giáo dục, tác giả SGK', salary: '25-35 triệu+' },
    ],
    pros: [
      'Nghề cao quý, đóng góp cho xã hội',
      'Ổn định công việc (không dễ bị thôi việc)',
      'Nghỉ hè, nghỉ lễ nhiều',
      'Có thể dạy thêm tăng thu nhập',
      'Hưởng bảo hiểm xã hội tốt',
    ],
    cons: [
      'Lương cơ bản thấp (trường công)',
      'Áp lực từ phụ huynh và xã hội',
      'Nhiều hồ sơ, sổ sách hành chính',
      'Cần cập nhật chương trình liên tục',
      'Có thể bị AI tutoring systems tác động đến số lượng',
    ],
    suitablePersonalities: ['ENFJ', 'ESFJ', 'INFJ', 'ISFJ', 'ENFP', 'ESFP'],
    suitableHolland: ['S', 'A', 'I'],
    relatedCareers: ['Giảng viên đại học', 'Content Creator giáo dục', 'EdTech Specialist', 'Nhà tâm lý giáo dục'],
    importantSubjects: [
      { name: 'Chuyên ngành dạy', importance: 'Rất quan trọng' },
      { name: 'Tâm lý học', importance: 'Quan trọng' },
      { name: 'Tin học', importance: 'Hữu ích' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '7:00 - Đến trường, chuẩn bị bài giảng',
      '7:30 - Dạy tiết 1-3 (sử dụng AI để personalize)',
      '9:45 - Chấm bài, soạn giáo án',
      '10:30 - Dạy tiết 4-5',
      '13:30 - Sinh hoạt chuyên môn, training AI tools',
      '14:30 - Gặp phụ huynh / tư vấn học sinh',
      '16:00 - Dạy phụ đạo / bồi dưỡng',
    ],
    aiExposure: {
      score: 4,
      trend: 'Tăng',
      analysis: 'AI tutoring systems có thể tự động hóa 20-30% bài giảng lặp đi lặp lại. Tuy nhiên, giáo viên là mentors, người truyền cảm hứng, tạo môi trường học tập an toàn. Vai trò này khó thay thế vì nó là human-to-human connection. Job tương đối an toàn.',
    },
  },

  'doanh-nhan': {
    id: 'doanh-nhan',
    name: 'Doanh nhân / Khởi nghiệp',
    icon: '🚀',
    category: 'Kinh doanh',
    shortDescription: 'Xây dựng và điều hành doanh nghiệp, tạo ra giá trị cho xã hội',
    fullDescription: 'Doanh nhân là người biến ý tưởng thành sản phẩm, dịch vụ có giá trị. Họ chấp nhận rủi ro, lãnh đạo đội ngũ và tạo ra công ăn việc làm. Khởi nghiệp đòi hỏi sự sáng tạo, kiên trì, năng lực quản trị và khả năng thích ứng. Năm 2026, doanh nhân sử dụng AI để tự động hóa nhiều quy trình nhưng chiến lược vẫn cần con người.',
    education: {
      minimumDegree: 'Không bắt buộc (Đại học ưu tiên)',
      recommendedMajors: ['Quản trị kinh doanh', 'Marketing', 'Tài chính', 'Công nghệ', 'Bất kỳ ngành nào'],
      topUniversities: [
        { name: 'ĐH Kinh tế Quốc dân', location: 'Hà Nội' },
        { name: 'ĐH Ngoại thương', location: 'Hà Nội / HCM' },
        { name: 'ĐH Kinh tế TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH RMIT', location: 'HCM / HN' },
      ],
      certifications: ['MBA (nâng cao)', 'Google for Startups', 'Startup ecosystem certification'],
    },
    skills: {
      technical: [
        { name: 'Quản trị kinh doanh', level: 'Nâng cao' },
        { name: 'Tài chính & Kế toán cơ bản', level: 'Nâng cao' },
        { name: 'Marketing & Sales', level: 'Nâng cao' },
        { name: 'Hiểu biết sâu về ngành/sản phẩm', level: 'Chuyên gia' },
        { name: 'Data-driven decision making', level: 'Trung bình' },
      ],
      soft: ['Lãnh đạo', 'Chấp nhận rủi ro', 'Kiên trì', 'Sáng tạo', 'Networking', 'Quyết đoán', 'Thích ứng', 'Tối ưu hóa'],
      tools: ['Excel/Sheets', 'CRM (Salesforce, HubSpot)', 'Notion', 'Slack', 'AI business tools', 'Analytics platforms'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '0-10 triệu (tự trả)', mid: '30-100 triệu', senior: 'Không giới hạn' },
      growthRate: '+35% startup mới mỗi năm',
      totalJobs: 'Tự tạo việc làm',
      topEmployers: ['Tự làm chủ', 'Startup ecosystem', 'Incubator/Accelerator', 'Techstars Vietnam'],
      workEnvironment: ['Co-working space', 'Văn phòng riêng', 'Remote', 'Bất cứ đâu'],
    },
    roadmap: [
      { stage: '1', title: 'Học & Tích lũy kinh nghiệm', duration: '2-4 năm', description: 'Học kinh doanh, làm việc tại startup/công ty để có kinh nghiệm', salary: '10-25 triệu' },
      { stage: '2', title: 'Khởi nghiệp (Idea & MVP)', duration: '1-2 năm', description: 'Tìm ý tưởng, validate market, xây MVP', salary: '0-15 triệu (có thể lỗ)' },
      { stage: '3', title: 'Product-Market Fit', duration: '1-2 năm', description: 'Tìm được mô hình hoạt động, có doanh thu ổn định', salary: '10-40 triệu' },
      { stage: '4', title: 'Scale Up & Fundraising', duration: '2-3 năm', description: 'Mở rộng thị trường, gọi vốn Series A/B, tuyển team', salary: '40-150 triệu' },
      { stage: '5', title: 'CEO / Exit (IPO/M&A)', duration: '5+ năm', description: 'Điều hành quy mô lớn, IPO, M&A, hoặc khởi nghiệp thứ 2', salary: 'Hàng tỷ+' },
    ],
    pros: [
      'Tự do và làm chủ định mệnh',
      'Thu nhập không giới hạn',
      'Tạo tác động cho xã hội',
      'Học hỏi nhanh từ thị trường',
      'Công việc thú vị, đầy thách thức và variety',
      'Có thể tạo việc làm cho người khác',
    ],
    cons: [
      'Rủi ro tài chính rất cao (90% startup thất bại)',
      'Stress và áp lực liên tục',
      'Thu nhập không ổn định',
      'Phải hy sinh thời gian cá nhân',
      'Cần kinh phí khởi động (không phải ai cũng có)',
      'Thất bại là phần của quá trình',
    ],
    suitablePersonalities: ['ENTJ', 'ENTP', 'ESTP', 'INTJ', 'ENFP', 'ESFP'],
    suitableHolland: ['E', 'I', 'A'],
    relatedCareers: ['CEO', 'Product Manager', 'Marketing Director', 'Sales Manager', 'Venture Capitalist'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Quan trọng' },
      { name: 'Kinh tế', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'GDCD / Tư duy phản biện', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '7:00 - Đọc email, review metrics hôm qua',
      '8:30 - Họp standup với core team',
      '9:30 - Gặp đối tác, khách hàng, nhà đầu tư',
      '11:00 - Strategy session, quyết định product roadmap',
      '13:30 - Networking event hoặc investor pitch',
      '15:00 - Phỏng vấn & tuyển dụng',
      '17:00 - Lên kế hoạch tuần tới, review goals',
      '20:00 - Đọc sách / Nghiên cứu thị trường / học thêm',
    ],
    aiExposure: {
      score: 5,
      trend: 'Tăng',
      analysis: 'Doanh nhân sử dụng AI tools cho marketing automation, customer service, data analysis. Tuy nhiên, chiến lược, quyết định lớn, leadership vẫn cần con người. AI là tool để scale nhanh hơn, không thay thế lãnh đạo. Job này an toàn vì là người làm chủ.',
    },
  },

  'nha-tam-ly': {
    id: 'nha-tam-ly',
    name: 'Nhà tâm lý',
    icon: '🧠',
    category: 'Y tế / Tâm lý',
    shortDescription: 'Tư vấn, chẩn đoán và điều trị các vấn đề tâm lý và hành vi',
    fullDescription: 'Nhà tâm lý là chuyên gia nghiên cứu tâm lý con người và giúp đỡ người khác vượt qua những vấn đề tâm lý, cảm xúc và hành vi. Công việc đòi hỏi khả năng lắng nghe sâu, đồng cảm cao, và am hiểu về các phương pháp tâm lý liệu. Năm 2026, nhu cầu dịch vụ tâm lý tăng vì áp lực công việc, xã hội.',
    education: {
      minimumDegree: 'Đại học (Thạc sĩ ưu tiên)',
      recommendedMajors: ['Tâm lý học', 'Tâm lý lâm sàng', 'Tâm lý tư vấn', 'Tâm lý giáo dục'],
      topUniversities: [
        { name: 'ĐH Quốc gia Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Quốc gia TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Đà Nẵng', location: 'Đà Nẵng' },
      ],
      certifications: ['Chứng chỉ tâm lý lâm sàng', 'Chứng chỉ tâm lý tư vấn', 'Sertifikasi CBT/DBT'],
    },
    skills: {
      technical: [
        { name: 'Tâm lý học và tâm lý bệnh', level: 'Chuyên gia' },
        { name: 'Phương pháp tâm lý liệu (CBT, DBT, v.v.)', level: 'Nâng cao' },
        { name: 'Chẩn đoán tâm lý', level: 'Nâng cao' },
        { name: 'Kỹ thuật tư vấn', level: 'Nâng cao' },
        { name: 'Phân tích hành vi', level: 'Trung bình' },
      ],
      soft: ['Đồng cảm cao', 'Lắng nghe sâu', 'Tính kiên nhẫn', 'Không phán xét', 'Giao tiếp nhạy cảm', 'Tự chăm sóc'],
      tools: ['Assessment tools', 'Telemedicine platform', 'Case management software', 'Research databases'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '8-12 triệu', mid: '15-25 triệu', senior: '30-60 triệu' },
      growthRate: '+25% trong 5 năm tới',
      totalJobs: '~15,000 nhà tâm lý tại Việt Nam',
      topEmployers: ['Bệnh viện tâm thần', 'Trung tâm tư vấn tâm lý', 'Trường học', 'Công ty (HR/Wellness)', 'Diagnose clinic'],
      workEnvironment: ['Trung tâm tâm lý', 'Bệnh viện', 'Trường học', 'Văn phòng công ty', 'Online consulting'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Tâm lý', duration: '4 năm', description: 'Học lý thuyết tâm lý, thực tập tại trung tâm', salary: '0' },
      { stage: '2', title: 'Tâm lý sư tập sự', duration: '1-2 năm', description: 'Tư vấn dưới sự giám sát, xây dựng kỹ năng', salary: '8-12 triệu' },
      { stage: '3', title: 'Nhà tâm lý lâm sàng', duration: '3-5 năm', description: 'Chẩn đoán, tư vấn, điều trị độc lập', salary: '15-25 triệu' },
      { stage: '4', title: 'Nhà tâm lý lâu năm / Quản lý', duration: '5-8 năm', description: 'Lead team, develop program, research', salary: '25-50 triệu' },
      { stage: '5', title: 'Giáo sư / Chuyên gia / Cố vấn', duration: '10+ năm', description: 'Giảng dạy, nghiên cứu, tư vấn chính sách', salary: '50-100 triệu+' },
    ],
    pros: [
      'Công việc có ý nghĩa, giúp đỡ mọi người',
      'Nhu cầu tăng, cơ hội việc làm lớn',
      'Có thể làm tư vấn online từ nhà',
      'Thu nhập ổn định và tăng theo kinh nghiệm',
      'Cộng đồng chuyên gia hỗ trợ',
    ],
    cons: [
      'Cần kiên nhẫn, listening skills cao',
      'Có thể bị affect bởi vấn đề của khách hàng (compassion fatigue)',
      'Cần cập nhật tri thức tâm lý liên tục',
      'Không phải ai cũng có empathy cao',
      'Khách hàng không phải lúc nào cũng hợp tác',
    ],
    suitablePersonalities: ['INFJ', 'INFP', 'ISFJ', 'ESFJ', 'ENFJ', 'ENFP'],
    suitableHolland: ['S', 'I', 'A'],
    relatedCareers: ['Bác sĩ tâm thần', 'Nhân viên xã hội', 'Coaching specialist', 'Researcher (Psychology)'],
    importantSubjects: [
      { name: 'Tâm lý học', importance: 'Rất quan trọng' },
      { name: 'Sinh học', importance: 'Quan trọng' },
      { name: 'Hóa học', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '9:00 - Điền hồ sơ, chuẩn bị cho session',
      '9:30 - Tư vấn khách hàng 1 (60 phút)',
      '10:45 - Note-taking, case documentation',
      '11:15 - Tư vấn khách hàng 2 (60 phút)',
      '13:00 - Lunch & self-care',
      '14:00 - Họp supervisor / team',
      '15:00 - Tư vấn khách hàng 3',
      '16:30 - Paperwork, cập nhật case files',
    ],
    aiExposure: {
      score: 3,
      trend: 'Tăng',
      analysis: 'AI chatbots có thể cung cấp tư vấn ban đầu, symptom assessment. Tuy nhiên, chẩn đoán và điều trị phức tạp cần nhà tâm lý người thật vì cần empathy, điều chỉnh theo từng khách hàng, build relationship. Job này tương đối an toàn nhưng có thể bị supplementary AI tools tác động đến số lượng.',
    },
  },

  'luat-su': {
    id: 'luat-su',
    name: 'Luật sư',
    icon: '⚖️',
    category: 'Pháp lý',
    shortDescription: 'Cung cấp tư vấn pháp lý, bảo vệ quyền lợi và đại diện trước tòa',
    fullDescription: 'Luật sư là chuyên gia pháp lý cung cấp tư vấn, bảo vệ quyền lợi của khách hàng và đại diện trước tòa án. Công việc đòi hỏi kiến thức pháp lý sâu, kỹ năng lập luận, khả năng phân tích tình huống và giao tiếp thuyết phục. Năm 2026, AI giúp luật sư tìm kiếm các trường hợp tương tự và soạn thảo nhanh, nhưng chiến lược pháp lý vẫn cần con người.',
    education: {
      minimumDegree: 'Đại học Luật (6 năm)',
      recommendedMajors: ['Luật Dân sự', 'Luật Hành chính', 'Luật Thương mại', 'Luật Quốc tế'],
      topUniversities: [
        { name: 'ĐH Luật Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Luật TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Quốc gia Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH Quốc gia TP.HCM', location: 'TP.HCM' },
      ],
      certifications: ['Chứng chỉ hành nghề luật sư', 'Chứng chỉ chuyên khoa (Dân sự, Thương mại, v.v.)', 'International law certificates'],
    },
    skills: {
      technical: [
        { name: 'Kiến thức pháp luật', level: 'Chuyên gia' },
        { name: 'Soạn thảo tài liệu pháp lý', level: 'Chuyên gia' },
        { name: 'Lập luận & tranh tụng', level: 'Nâng cao' },
        { name: 'Nghiên cứu pháp lý', level: 'Nâng cao' },
        { name: 'Sử dụng legal AI tools', level: 'Trung bình' },
        { name: 'Tư vấn pháp lý', level: 'Nâng cao' },
      ],
      soft: ['Lập luận logic', 'Kỹ năng đàm phán', 'Viết lách tốt', 'Giao tiếp thuyết phục', 'Tư duy phản biện', 'Tinh tế về đạo đức'],
      tools: ['Legal research database', 'Contract management software', 'AI legal research tools', 'Case management system'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '10-15 triệu', mid: '25-50 triệu', senior: '50-150 triệu' },
      growthRate: '+20% trong 5 năm tới',
      totalJobs: '~25,000 luật sư tại Việt Nam',
      topEmployers: ['Văn phòng luật sư', 'Công ty (Legal department)', 'Bộ Tư pháp', 'Tòa án', 'Tổ chức quốc tế'],
      workEnvironment: ['Văn phòng luật sư', 'In-house counsel', 'Government', 'International law firm', 'Solo practice'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Luật', duration: '6 năm', description: 'Học luật dân sự, hành chính, hình sự, quốc tế', salary: '0' },
      { stage: '2', title: 'Luật sư tập sự', duration: '2 năm', description: 'Thực tập tại văn phòng, học từ senior lawyer', salary: '10-15 triệu' },
      { stage: '3', title: 'Luật sư chính thức', duration: '3-5 năm', description: 'Tư vấn độc lập, đại diện tại tòa, xử lý case', salary: '20-40 triệu' },
      { stage: '4', title: 'Senior Lawyer / Partner', duration: '5-10 năm', description: 'Quản lý case lớn, mentor junior, kinh doanh', salary: '50-100 triệu' },
      { stage: '5', title: 'Managing Partner / In-house General Counsel', duration: '10+ năm', description: 'Lãnh đạo văn phòng hoặc đứng đầu legal department', salary: '100-300 triệu+' },
    ],
    pros: [
      'Thu nhập cao, đặc biệt khi có kinh nghiệm',
      'Công việc có ý nghĩa, bảo vệ quyền lợi',
      'Nhu cầu tuyển dụng lớn',
      'Cơ hội làm việc quốc tế',
      'Tư duy lập luận được rèn luyện',
    ],
    cons: [
      'Phải học 6 năm đại học + 2 năm tập sự',
      'Thời gian làm việc dài, áp lực deadline',
      'Cần cập nhật pháp luật liên tục',
      'Giai đoạn đầu tiền không cao',
      'Công việc có thể căng thẳng, emotionally draining',
    ],
    suitablePersonalities: ['INTJ', 'ISTJ', 'ENTJ', 'ENTP', 'ESTJ'],
    suitableHolland: ['I', 'C', 'E'],
    relatedCareers: ['Công chức tư pháp', 'Biên soạn luật', 'Cố vấn chính sách', 'Arbitrator'],
    importantSubjects: [
      { name: 'Luật pháp', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'Lịch sử', importance: 'Quan trọng' },
      { name: 'Tiếng Pháp (nếu muốn quốc tế)', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '8:00 - Đọc email, review case files',
      '8:30 - Họp khách hàng tư vấn pháp lý',
      '10:00 - Soạn thảo tài liệu / contract (với hỗ trợ AI)',
      '12:00 - Nghiên cứu pháp luật, case law',
      '13:30 - Họp team, phân công case',
      '14:30 - Gặp đối tác, đàm phán',
      '16:00 - Chuẩn bị cho phiên tòa',
      '17:00 - Theo dõi deadline, cập nhật case status',
    ],
    aiExposure: {
      score: 6,
      trend: 'Tăng',
      analysis: 'AI legal research tools có thể tìm kiếm, phân tích hàng ngàn case, statute nhanh chóng. AI có thể soạn thảo contract template, contracts tương tự. Tuy nhiên, chiến lược pháp lý, đàm phán, tranh tụng cần luật sư. Job này evolve thành "AI-assisted legal work", không bị thay thế hoàn toàn.',
    },
  },

  'ke-toan': {
    id: 'ke-toan',
    name: 'Kế toán / Kiểm toán',
    icon: '📋',
    category: 'Tài chính & Kế toán',
    shortDescription: 'Ghi chép, phân tích tài chính và kiểm toán tính chính xác của dữ liệu kế toán',
    fullDescription: 'Kế toán là người chịu trách nhiệm ghi chép các giao dịch tài chính, duy trì sổ cái, chuẩn bị báo cáo tài chính. Kiểm toán viên kiểm tra tính chính xác và tuân thủ các tiêu chuẩn kế toán. Năm 2026, automation và AI làm cho nhiều công việc kế toán routine trở thành tự động, nhưng vẫn cần kế toán cho phân tích, tax planning, audit.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Kế toán', 'Kiểm toán', 'Tài chính - Kế toán', 'Kinh tế'],
      topUniversities: [
        { name: 'ĐH Kinh tế Quốc dân', location: 'Hà Nội' },
        { name: 'ĐH Kinh tế TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Ngoại thương', location: 'Hà Nội / HCM' },
        { name: 'ĐH Tài chính - Kế toán', location: 'Hà Nội' },
      ],
      certifications: ['Chứng chỉ Kế toán viên Việt Nam (CCVN)', 'ACCA (Association of Chartered Certified Accountants)', 'CPA (Certified Public Accountant)'],
    },
    skills: {
      technical: [
        { name: 'Kế toán tài chính', level: 'Chuyên gia' },
        { name: 'Excel & Spreadsheet', level: 'Chuyên gia' },
        { name: 'Kiếm toán', level: 'Nâng cao' },
        { name: 'Phần mềm kế toán (ERP)', level: 'Nâng cao' },
        { name: 'Thuế & Compliance', level: 'Nâng cao' },
        { name: 'Data analysis & Business intelligence', level: 'Trung bình' },
        { name: 'AI-powered accounting tools', level: 'Cơ bản' },
      ],
      soft: ['Tính cẩn thận', 'Chính xác', 'Tư duy phân tích', 'Giao tiếp kỹ thuật', 'Quản lý thời gian'],
      tools: ['Excel', 'Accounting software (SAP, Oracle, QuickBooks)', 'AI automation tools', 'Python/SQL (advanced)'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '8-12 triệu', mid: '15-25 triệu', senior: '30-60 triệu' },
      growthRate: '+18% trong 5 năm tới',
      totalJobs: '~200,000 kế toán tại Việt Nam',
      topEmployers: ['Kế toán công ty', 'Văn phòng kiểm toán', 'Công ty (Finance department)', 'Ngân hàng', 'Trường đại học'],
      workEnvironment: ['Văn phòng công ty', 'Công ty kế toán/kiểm toán', 'Remote/Hybrid', 'In-house'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Kế toán', duration: '4 năm', description: 'Học kế toán tài chính, kiểm toán, thuế', salary: '0' },
      { stage: '2', title: 'Kế toán viên tập sự', duration: '1-2 năm', description: 'Ghi sổ, nhập liệu, tính toán dưới giám sát', salary: '8-12 triệu' },
      { stage: '3', title: 'Kế toán viên chính', duration: '3-5 năm', description: 'Ghi sổ độc lập, chuẩn bị báo cáo, tính thuế', salary: '14-22 triệu' },
      { stage: '4', title: 'Trưởng phòng Kế toán', duration: '5-8 năm', description: 'Quản lý team kế toán, báo cáo tài chính, tax planning', salary: '25-50 triệu' },
      { stage: '5', title: 'Giám đốc Tài chính / CFO', duration: '10+ năm', description: 'Quản lý toàn bộ tài chính công ty, chiến lược tài chính', salary: '50-100 triệu+' },
    ],
    pros: [
      'Nhu cầu tuyển dụng lớn ở mọi công ty',
      'Thu nhập ổn định, tăng theo kinh nghiệm',
      'Công việc ổn định, không dễ mất việc',
      'Có cơ hội tiến lên CFO/Director',
      'Cơ hội làm việc quốc tế',
    ],
    cons: [
      'Công việc lặp đi lặp lại, có thể nhàm chán',
      'Cần chú ý chi tiết cao, áp lực chính xác',
      'Giai đoạn đầu lương không cao',
      'Thời gian bận rộn vào cuối năm tài chính',
      'Dễ bị AI automation thay thế (RPA, AutoML)',
    ],
    suitablePersonalities: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'INTP'],
    suitableHolland: ['C', 'I', 'S'],
    relatedCareers: ['Kiểm toán viên', 'Tư vấn thuế', 'Phân tích tài chính', 'Nhà hoạch định tài chính'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Rất quan trọng' },
      { name: 'Kinh tế', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
      { name: 'Tin học', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '8:00 - Kiểm tra invoice, ghi sổ',
      '10:00 - Nhập dữ liệu vào phần mềm kế toán',
      '12:00 - Cấu chứng, kiểm tra độ chính xác',
      '13:30 - Họp với phòng bán hàng / mua hàng',
      '14:30 - Phân tích chi phí, chuẩn bị báo cáo (hoặc sử dụng AI)',
      '16:00 - Tính thuế, compliance checks',
      '17:00 - Ghi chép tài liệu, backup dữ liệu',
    ],
    aiExposure: {
      score: 7,
      trend: 'Tăng',
      analysis: 'RPA (Robotic Process Automation) và AI có thể tự động hóa 50-70% công việc kế toán routine (ghi sổ, nhập dữ liệu, tính toán). Tuy nhiên, cần kế toán cho phân tích chi phí, tax planning, audit, lên kế hoạch tài chính. Job này evolve thành "higher-value accounting work", với số lượng có thể giảm 20-30%.',
    },
  },

  'ux-designer': {
    id: 'ux-designer',
    name: 'UX/UI Designer',
    icon: '🎨',
    category: 'Thiết kế & Sáng tạo',
    shortDescription: 'Thiết kế trải nghiệm người dùng và giao diện cho ứng dụng, website',
    fullDescription: 'UX/UI Designer tạo ra những trải nghiệm người dùng tuyệt vời thông qua thiết kế giao diện đẹp và thân thiện. Công việc kết hợp giữa tâm lý người dùng, thẩm mỹ và kỹ thuật để tạo ra sản phẩm kỹ thuật số mà mọi người yêu thích sử dụng. Năm 2026, AI design tools hỗ trợ nhưng sáng tạo và empathy vẫn cần con người.',
    education: {
      minimumDegree: 'Đại học hoặc Bootcamp',
      recommendedMajors: ['Thiết kế đồ họa', 'Thiết kế sản phẩm', 'Công nghệ thông tin', 'Mỹ thuật ứng dụng'],
      topUniversities: [
        { name: 'ĐH Công nghiệp TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Kiến trúc Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH Bách khoa Hà Nội', location: 'Hà Nội' },
        { name: 'Bootcamp: Ironhack, General Assembly', location: 'HN/HCM' },
      ],
      certifications: ['Google UX Design Certificate', 'Adobe Creative Suite certification', 'Interaction Design Foundation'],
    },
    skills: {
      technical: [
        { name: 'UI Design (Figma, Adobe XD)', level: 'Chuyên gia' },
        { name: 'UX Research & User Testing', level: 'Nâng cao' },
        { name: 'Wireframing & Prototyping', level: 'Nâng cao' },
        { name: 'User psychology & Behavior', level: 'Nâng cao' },
        { name: 'Accessibility & Responsive Design', level: 'Nâng cao' },
        { name: 'HTML/CSS cơ bản', level: 'Trung bình' },
        { name: 'AI design tools', level: 'Cơ bản' },
      ],
      soft: ['Sáng tạo', 'Empathy cao', 'Tư duy giải quyết vấn đề', 'Giao tiếp và presentation', 'Cộng tác đội ngũ'],
      tools: ['Figma', 'Adobe XD / Photoshop / Illustrator', 'Protopie', 'UserTesting', 'Miro', 'AI design assistants'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '10-15 triệu', mid: '20-35 triệu', senior: '40-70 triệu' },
      growthRate: '+30% trong 5 năm tới',
      totalJobs: '~30,000 UX/UI designer tại Việt Nam',
      topEmployers: ['Tech company (Grab, Shopee, Tiktok)', 'Startup', 'Agency', 'In-house design team'],
      workEnvironment: ['Văn phòng công ty', 'Remote/Hybrid', 'Freelance', 'Design studio'],
    },
    roadmap: [
      { stage: '1', title: 'Bootcamp / Self-taught', duration: '3-6 tháng', description: 'Học design fundamentals, case studies', salary: '0' },
      { stage: '2', title: 'Junior Designer', duration: '1-2 năm', description: 'Thiết kế UI, hỗ trợ project dưới giám sát', salary: '10-15 triệu' },
      { stage: '3', title: 'Mid-level Designer', duration: '2-3 năm', description: 'Lead design project, user research, mentoring junior', salary: '20-32 triệu' },
      { stage: '4', title: 'Senior Designer / Design Lead', duration: '3-5 năm', description: 'Quản lý design team, define design system, strategy', salary: '35-55 triệu' },
      { stage: '5', title: 'Design Director / Principal Designer', duration: '5+ năm', description: 'Điều hành design department, define product vision', salary: '60-120 triệu+' },
    ],
    pros: [
      'Công việc sáng tạo, để lại dấu ấn trực tiếp',
      'Nhu cầu tuyển dụng cao tại startup/tech',
      'Thu nhập tốt, tăng nhanh',
      'Có thể làm freelance, tự do',
      'Cộng đồng design lớn, hỗ trợ nhau',
    ],
    cons: [
      'Feedback từ stakeholder có thể sức khỏe tâm lý',
      'Giai đoạn đầu công việc có thể lặp đi lặp lại',
      'Cần cập nhật trend design liên tục',
      'Áp lực deadline khi close sprint',
      'Dễ bị bỏ qua khi công ty cắt giảm chi phí',
    ],
    suitablePersonalities: ['ISFP', 'INFP', 'ENFP', 'ESFP', 'ENTP', 'INTP'],
    suitableHolland: ['A', 'I', 'S'],
    relatedCareers: ['Graphic Designer', 'Product Manager', 'Frontend Developer', 'Design Researcher'],
    importantSubjects: [
      { name: 'Mỹ thuật', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Quan trọng' },
      { name: 'Tâm lý học', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '9:00 - Standup meeting với product & dev team',
      '9:30 - User research, analyze feedback',
      '10:30 - Wireframe & design new features (sử dụng AI tools)',
      '12:00 - Design review với team',
      '13:30 - Collaborate với developer',
      '14:30 - User testing / A/B testing review',
      '15:30 - Iterate design, prototyping',
      '16:30 - Update design system, documentation',
    ],
    aiExposure: {
      score: 5,
      trend: 'Tăng',
      analysis: 'AI design tools có thể generate layout suggestions, create mockups nhanh chóng. Tuy nhiên, empathy, sáng tạo, understand user psychology vẫn cần con người. AI là tool để work faster, không thay thế designer. Job này evolve thành "AI-augmented design", độ chuyên gia tăng.',
    },
  },

  'content-creator': {
    id: 'content-creator',
    name: 'Content Creator / Marketing Specialist',
    icon: '📱',
    category: 'Tiếp thị & Sáng tạo',
    shortDescription: 'Tạo nội dung sáng tạo cho các nền tảng digital, marketing campaigns',
    fullDescription: 'Content Creator là người tạo ra nội dung hấp dẫn (video, bài viết, hình ảnh, podcast) cho các nền tảng mạng xã hội, blog, YouTube. Marketing Specialist lên kế hoạch chiến lược content, quản lý campaign, phân tích metrics. Năm 2026, AI hỗ trợ tạo nội dung nhưng sáng tạo, storytelling, personal brand vẫn cần con người.',
    education: {
      minimumDegree: 'Đại học hoặc Self-taught',
      recommendedMajors: ['Marketing', 'Truyền thông', 'Quảng cáo', 'Báo chí', 'Công nghệ thông tin'],
      topUniversities: [
        { name: 'ĐH Kinh tế Quốc dân', location: 'Hà Nội' },
        { name: 'ĐH Ngoại thương', location: 'Hà Nội / HCM' },
        { name: 'ĐH Kinh tế TP.HCM', location: 'TP.HCM' },
        { name: 'Bootcamp: Digital Marketing, Content Creation', location: 'HN/HCM' },
      ],
      certifications: ['Google Analytics Certificate', 'HubSpot Inbound Marketing', 'Facebook Blueprint', 'Content Marketing certification'],
    },
    skills: {
      technical: [
        { name: 'Content creation (video, writing, design)', level: 'Chuyên gia' },
        { name: 'SEO & content optimization', level: 'Nâng cao' },
        { name: 'Social media strategy & management', level: 'Nâng cao' },
        { name: 'Google Analytics & tracking', level: 'Trung bình' },
        { name: 'Video editing & photography', level: 'Nâng cao' },
        { name: 'AI content tools', level: 'Trung bình' },
        { name: 'Copywriting', level: 'Nâng cao' },
      ],
      soft: ['Sáng tạo', 'Storytelling', 'Trend awareness', 'Giao tiếp hiệu quả', 'Tương tác với audience'],
      tools: ['Canva', 'Adobe Creative Suite', 'CapCut/Premiere Pro', 'Google Analytics', 'Meta Business Suite', 'AI writing tools'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '8-15 triệu', mid: '18-35 triệu', senior: '35-70 triệu' },
      growthRate: '+40% trong 5 năm tới',
      totalJobs: '~50,000 vị trí tại Việt Nam',
      topEmployers: ['Digital marketing agency', 'Tech company', 'E-commerce platform', 'Media company', 'Freelance'],
      workEnvironment: ['Agency', 'In-house marketing team', 'Freelance', 'Remote/Hybrid'],
    },
    roadmap: [
      { stage: '1', title: 'Bootcamp / Self-taught', duration: '3-6 tháng', description: 'Học content creation, social media basics', salary: '0' },
      { stage: '2', title: 'Junior Content Creator', duration: '1-2 năm', description: 'Tạo nội dung hàng ngày, quản lý social media', salary: '8-15 triệu' },
      { stage: '3', title: 'Mid-level Content Specialist', duration: '2-3 năm', description: 'Lên kế hoạch content strategy, lead content team', salary: '18-28 triệu' },
      { stage: '4', title: 'Senior Content Strategist', duration: '3-5 năm', description: 'Quản lý content team, define brand narrative', salary: '30-50 triệu' },
      { stage: '5', title: 'Content Director / Head of Marketing', duration: '5+ năm', description: 'Điều hành content strategy toàn bộ, independent creator (6-7 figures)', salary: '50-200 triệu+' },
    ],
    pros: [
      'Công việc sáng tạo, thú vị',
      'Nhu cầu tuyển dụng cao',
      'Có thể xây dựng personal brand và thu nhập cao',
      'Độc lập, linh hoạt, có thể freelance',
      'Cộng đồng creator lớn, networking tốt',
    ],
    cons: [
      'Công việc lặp đi lặp lại (content calendar)',
      'Cần tư duy trend liên tục',
      'Thu nhập không ổn định nếu freelance',
      'Algorithm thay đổi, khó predict viral',
      'Áp lực maintain consistency, engagement',
    ],
    suitablePersonalities: ['ENFP', 'ESFP', 'ESFJ', 'ENFJ', 'INFP', 'ISFP'],
    suitableHolland: ['A', 'E', 'S'],
    relatedCareers: ['Graphic Designer', 'Video Producer', 'Social Media Manager', 'Marketing Manager'],
    importantSubjects: [
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'Mỹ thuật / Thiết kế', importance: 'Quan trọng' },
      { name: 'Tâm lý học', importance: 'Hữu ích' },
      { name: 'Kinh tế', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '9:00 - Brainstorm content ideas (với AI)',
      '10:00 - Create content (shoot video, write blog post)',
      '12:00 - Edit & design (sử dụng Canva, Adobe)',
      '13:30 - Schedule post, manage social media',
      '15:00 - Analyze metrics, track engagement',
      '16:00 - Engage với audience, respond comments',
      '17:00 - Tìm trend mới, research competitor content',
    ],
    aiExposure: {
      score: 6,
      trend: 'Tăng',
      analysis: 'AI có thể generate content ideas, write drafts, edit video nhanh chóng. Tuy nhiên, storytelling, authentic voice, trend awareness vẫn cần creator. AI là tool để work faster, không thay thế sáng tạo. Job evolve thành "AI-assisted creation", giá trị tăng ở strategy & authenticity.',
    },
  },

  'nha-van': {
    id: 'nha-van',
    name: 'Nhà văn / Nhà báo',
    icon: '✍️',
    category: 'Tiếp thị & Sáng tạo',
    shortDescription: 'Viết truyện, bài báo, nội dung sáng tạo cho các nền tảng công bố',
    fullDescription: 'Nhà văn tạo ra các tác phẩm văn học (tiểu thuyết, truyện ngắn, thơ). Nhà báo điều tra, viết bài báo tin tức cho báo chí, magazine, website. Công việc đòi hỏi kỹ năng viết tốt, tâm lý con người, khả năng nghiên cứu sâu. Năm 2026, AI giúp viết nhanh nhưng content sáng tạo, investigative journalism vẫn cần con người.',
    education: {
      minimumDegree: 'Đại học hoặc Self-taught',
      recommendedMajors: ['Báo chí - Truyền thông', 'Ngôn ngữ - Văn học', 'Sáng tác văn học', 'Truyền thông đại chúng'],
      topUniversities: [
        { name: 'ĐH Báo chí - Tuyên truyền', location: 'Hà Nội' },
        { name: 'ĐH Tây Đô', location: 'Cần Thơ' },
        { name: 'ĐH Khoa học Xã hội - ĐHQG', location: 'HN / HCM' },
        { name: 'ĐH Ngoại ngữ - ĐHQG', location: 'HN / HCM' },
      ],
      certifications: ['Chứng chỉ nhà báo chuyên nghiệp', 'Sertifikasi fact-checking', 'SEO journalism'],
    },
    skills: {
      technical: [
        { name: 'Viết lách (creative writing, journalism)', level: 'Chuyên gia' },
        { name: 'Nghiên cứu & fact-checking', level: 'Chuyên gia' },
        { name: 'Phỏng vấn & storytelling', level: 'Nâng cao' },
        { name: 'SEO & content optimization', level: 'Trung bình' },
        { name: 'Multimedia journalism (photo, video)', level: 'Nâng cao' },
        { name: 'Data journalism & visualization', level: 'Trung bình' },
      ],
      soft: ['Tò mò', 'Chính xác', 'Empathy cao', 'Giao tiếp tốt', 'Khách quan', 'Persistent'],
      tools: ['Google Docs', 'CMS (WordPress, Medium)', 'Research tools', 'Canva', 'Adobe suite', 'Recording tools'],
    },
    market: {
      demandLevel: 'Trung bình',
      salaryRange: { entry: '6-10 triệu', mid: '12-25 triệu', senior: '25-50 triệu' },
      growthRate: '+5% trong 5 năm tới',
      totalJobs: '~20,000 nhà báo/nhà văn tại Việt Nam',
      topEmployers: ['Báo điện tử', 'Magazine', 'News agency', 'Publishing house', 'Corporate writing'],
      workEnvironment: ['Báo chí', 'Publishing', 'Online media', 'Freelance', 'Content agency'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên / Thực tập', duration: '4 năm', description: 'Học báo chí, viết cho student paper', salary: '0' },
      { stage: '2', title: 'Junior Reporter / Writer', duration: '1-2 năm', description: 'Viết bài đơn giản, phỏng vấn, fact-check', salary: '6-10 triệu' },
      { stage: '3', title: 'Reporter / Columnist', duration: '2-4 năm', description: 'Viết investigative piece, lead projects', salary: '12-20 triệu' },
      { stage: '4', title: 'Senior Reporter / Editor', duration: '4-7 năm', description: 'Quản lý team, define editorial direction', salary: '25-40 triệu' },
      { stage: '5', title: 'Editor-in-Chief / Published Author', duration: '10+ năm', description: 'Giám đốc báo/magazine hoặc tác giả nổi tiếng', salary: '40-100 triệu+' },
    ],
    pros: [
      'Công việc có ý nghĩa, ảnh hưởng xã hội',
      'Được học hỏi về mọi lĩnh vực',
      'Có thể xây dựng personal brand & credibility',
      'Tự do sáng tạo trong writing',
      'Cộng đồng journalistic support',
    ],
    cons: [
      'Thu nhập không cao ở giai đoạn đầu',
      'Công việc đôi khi nguy hiểm (investigative)',
      'Deadline áp lực cao',
      'Số báo in giảm, ngành khó khăn',
      'Phải cập nhật trend news liên tục',
    ],
    suitablePersonalities: ['INFP', 'INFJ', 'ENFP', 'ENFJ', 'INTP', 'ENTP'],
    suitableHolland: ['A', 'I', 'S'],
    relatedCareers: ['Content Creator', 'Copywriter', 'Communications Specialist', 'Documentary Filmmaker'],
    importantSubjects: [
      { name: 'Tiếng Anh/Tiếng Việt', importance: 'Rất quan trọng' },
      { name: 'Lịch sử', importance: 'Quan trọng' },
      { name: 'GDCD', importance: 'Quan trọng' },
      { name: 'Tâm lý học', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '9:00 - Pitch story ideas, attend editorial meeting',
      '10:00 - Conduct interviews (or research online)',
      '12:00 - Write draft article',
      '13:30 - Fact-check, verify sources',
      '15:00 - Revise based on editor feedback',
      '16:00 - Submit final version, optimize for SEO',
      '17:00 - Promote on social media, engage readers',
    ],
    aiExposure: {
      score: 7,
      trend: 'Tăng',
      analysis: 'AI có thể viết bài tin đơn giản, fact-checking nhanh, tóm tắt documents. Tuy nhiên, investigative journalism, in-depth reporting, human stories vẫn cần con người. Job evolve thành "AI-assisted journalism", focus vào depth, analysis, storytelling chứ không phải breaking news.',
    },
  },

  'y-ta': {
    id: 'y-ta',
    name: 'Y tá / Điều dưỡng',
    icon: '🩺',
    category: 'Y tế',
    shortDescription: 'Chăm sóc bệnh nhân, hỗ trợ bác sĩ, quản lý sức khỏe bệnh nhân',
    fullDescription: 'Y tá/Điều dưỡng là nhân viên y tế chăm sóc bệnh nhân trong bệnh viện, phòng khám hoặc tại nhà. Công việc bao gồm đo vital signs, cho thuốc, đổi băng, tư vấn sức khỏe và cung cấp sự hỗ trợ tâm lý cho bệnh nhân. Năm 2026, nhu cầu y tá tăng vì dân số già đi, nhưng công việc có thể vất vả.',
    education: {
      minimumDegree: 'Cao đẳng hoặc Đại học',
      recommendedMajors: ['Điều dưỡng', 'Y học lâm sàng', 'Chăm sóc sức khỏe cộng đồng'],
      topUniversities: [
        { name: 'ĐH Y Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH Y TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Y Dược Hải Phòng', location: 'Hải Phòng' },
        { name: 'Cao đẳng Điều dưỡng', location: 'Toàn quốc' },
      ],
      certifications: ['Chứng chỉ y tá hành nghề', 'ICU nursing certification', 'PALS/BLS certification'],
    },
    skills: {
      technical: [
        { name: 'Điều dưỡng cơ bản', level: 'Chuyên gia' },
        { name: 'Theo dõi vital signs', level: 'Chuyên gia' },
        { name: 'Kỹ thuật tiêm, truyền dịch', level: 'Chuyên gia' },
        { name: 'Vệ sinh cá nhân, thay băng', level: 'Chuyên gia' },
        { name: 'Cấp cứu sơ cấp', level: 'Nâng cao' },
        { name: 'EMR software', level: 'Cơ bản' },
      ],
      soft: ['Đồng cảm', 'Kiên nhẫn', 'Chịu áp lực cao', 'Giao tiếp tốt', 'Chăm sóc bản thân', 'Làm việc nhóm'],
      tools: ['Medical equipment', 'IV pumps', 'Vital sign monitor', 'Electronic health record', 'Telemedicine'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '5-8 triệu (công)', mid: '10-18 triệu', senior: '20-35 triệu' },
      growthRate: '+20% trong 5 năm tới',
      totalJobs: '~150,000 y tá tại Việt Nam',
      topEmployers: ['Bệnh viện công lập', 'Bệnh viện tư thục', 'Phòng khám', 'Home care service'],
      workEnvironment: ['Bệnh viện', 'Phòng khám', 'Nhà bệnh nhân', 'Nursing home'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Điều dưỡng', duration: '3-4 năm', description: 'Học lý thuyết, thực tập lâm sàng', salary: '0' },
      { stage: '2', title: 'Y tá tập sự', duration: '1 năm', description: 'Thực tập tại bệnh viện, làm quen công việc', salary: '5-8 triệu' },
      { stage: '3', title: 'Y tá chính thức', duration: '3-5 năm', description: 'Chăm sóc bệnh nhân độc lập, đảm nhiệm khối tư', salary: '8-15 triệu' },
      { stage: '4', title: 'Y tá trưởng ca / Trưởng khoa', duration: '5-8 năm', description: 'Quản lý team y tá, training junior', salary: '15-28 triệu' },
      { stage: '5', title: 'Head Nurse / Nursing Manager', duration: '10+ năm', description: 'Điều hành khoa/bệnh viện, chính sách chăm sóc', salary: '30-50 triệu+' },
    ],
    pros: [
      'Nhu cầu tuyển dụng rất cao, dễ tìm việc',
      'Công việc có ý nghĩa, giúp đỡ mọi người',
      'Thu nhập ổn định, có thêm lương trực',
      'Có bảo hiểm xã hội tốt',
      'Cơ hội làm việc nước ngoài',
    ],
    cons: [
      'Công việc vất vả, đứng nhiều',
      'Ca trực, shift đêm, ảnh hưởng sức khỏe',
      'Lương công lập thấp khi vừa tốt nghiệp',
      'Tiếp xúc bệnh tật, áp lực tâm lý',
      'Thiếu nhân công ở nhiều bệnh viện',
    ],
    suitablePersonalities: ['ISFJ', 'ESFJ', 'ISFP', 'ESFP', 'INFJ'],
    suitableHolland: ['S', 'I'],
    relatedCareers: ['Bác sĩ', 'Dược sĩ', 'Nhân viên y tế cộng đồng', 'Home care specialist'],
    importantSubjects: [
      { name: 'Sinh học', importance: 'Rất quan trọng' },
      { name: 'Hóa học', importance: 'Quan trọng' },
      { name: 'Vật lý', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '7:00 - Giao nhận ca từ ca trước',
      '7:30 - Theo dõi bệnh nhân, đo vital signs',
      '8:30 - Cho thuốc, tiêm chủng',
      '10:00 - Vệ sinh cá nhân, thay băng',
      '12:00 - Hỗ trợ bệnh nhân ăn uống',
      '14:00 - Điều trị theo hướng dẫn bác sĩ',
      '15:00 - Ghi chép, documentation',
      '17:00 - Giao nhận ca cho ca tối',
    ],
    aiExposure: {
      score: 2,
      trend: 'Ổn định',
      analysis: 'AI có thể hỗ trợ monitoring bệnh nhân qua wearables, nhắc nhở lịch thuốc. Tuy nhiên, phần lớn công việc y tá cần con người: chăm sóc trực tiếp, empathy, tương tác con người. Job này rất an toàn vì cần hands-on care và không thể tự động hóa hoàn toàn.',
    },
  },

  'quan-ly-du-an': {
    id: 'quan-ly-du-an',
    name: 'Quản lý dự án / Product Manager',
    icon: '📈',
    category: 'Quản lý',
    shortDescription: 'Quản lý dự án, định hướng sản phẩm, đảm bảo delivery đúng thời gian',
    fullDescription: 'Quản lý dự án (PM) chịu trách nhiệm lên kế hoạch, tổ chức tài nguyên, track progress và đảm bảo dự án hoàn thành đúng thời gian, ngân sách. Product Manager lên kế hoạch sản phẩm, hiểu user needs, define feature. Năm 2026, AI giúp track progress, tối ưu hóa, nhưng strategy vẫn cần con người.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Quản trị kinh doanh', 'Công nghệ thông tin', 'Kỹ sư', 'Bất kỳ ngành'],
      topUniversities: [
        { name: 'ĐH Kinh tế Quốc dân', location: 'Hà Nội' },
        { name: 'ĐH Bách khoa', location: 'Hà Nội / HCM' },
        { name: 'ĐH Ngoại thương', location: 'Hà Nội / HCM' },
        { name: 'ĐH RMIT', location: 'HCM / HN' },
      ],
      certifications: ['PMP (Project Management Professional)', 'Scrum Master / Scrum Product Owner', 'Product Management certificate'],
    },
    skills: {
      technical: [
        { name: 'Project management (Agile/Waterfall)', level: 'Chuyên gia' },
        { name: 'Roadmapping & prioritization', level: 'Nâng cao' },
        { name: 'Data analysis & metrics', level: 'Nâng cao' },
        { name: 'User research & empathy', level: 'Nâng cao' },
        { name: 'Stakeholder management', level: 'Nâng cao' },
        { name: 'Budget & resource planning', level: 'Trung bình' },
      ],
      soft: ['Lãnh đạo', 'Giao tiếp rõ ràng', 'Giải quyết conflict', 'Strategic thinking', 'Adaptability'],
      tools: ['Jira', 'Asana', 'Confluence', 'Figma', 'Excel/Sheets', 'Analytics tools', 'Slack'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '15-25 triệu', mid: '30-50 triệu', senior: '50-100 triệu' },
      growthRate: '+35% trong 5 năm tới',
      totalJobs: '~20,000 PM tại Việt Nam',
      topEmployers: ['Tech company (Grab, Shopee, Tiktok)', 'Startup', 'Fin-tech', 'E-commerce'],
      workEnvironment: ['Tech company', 'Startup', 'Corporate', 'Consulting firm'],
    },
    roadmap: [
      { stage: '1', title: 'Project Coordinator', duration: '1-2 năm', description: 'Hỗ trợ PM, track timeline, document', salary: '12-18 triệu' },
      { stage: '2', title: 'Junior Product Manager', duration: '1-2 năm', description: 'Own small project/feature, gather requirements', salary: '15-25 triệu' },
      { stage: '3', title: 'Mid-level Product Manager', duration: '2-3 năm', description: 'Lead product area, roadmap, strategy', salary: '30-45 triệu' },
      { stage: '4', title: 'Senior Product Manager / Head of Product', duration: '3-5 năm', description: 'Lead product team, company strategy', salary: '50-80 triệu' },
      { stage: '5', title: 'Director of Product / VP Product', duration: '5+ năm', description: 'Chiến lược toàn công ty, multi-team leadership', salary: '80-200 triệu+' },
    ],
    pros: [
      'Thu nhập cao, tăng nhanh',
      'Nhu cầu tuyển dụng rất cao',
      'Được làm việc với eng, design, business team',
      'Có impact trực tiếp đến product success',
      'Nhiều cơ hội ngành khác nhau',
    ],
    cons: [
      'Áp lực cao, deadline liên tục',
      'Phải quản lý nhiều stakeholder',
      'Thất bại của product là trách nhiệm PM',
      'Cạnh tranh cao ở vị trí senior',
      'Cần skill đa dạng (tech + business + ux)',
    ],
    suitablePersonalities: ['ENTJ', 'ENTP', 'INTJ', 'INTP', 'ESTJ'],
    suitableHolland: ['E', 'I', 'C'],
    relatedCareers: ['Business Analyst', 'Strategy Manager', 'CEO', 'Startup Founder'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Quan trọng' },
      { name: 'Kinh tế', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
    ],
    dailyLife: [
      '9:00 - Standup meeting với eng, design, data',
      '9:30 - Review product metrics, usage data',
      '10:30 - Brainstorm new features với team',
      '12:00 - One-on-one with team members',
      '13:30 - Analyze competitor, research market',
      '14:30 - Write spec / PRD cho feature mới',
      '15:30 - Prioritize roadmap, make trade-off',
      '17:00 - Planning next sprint / quarter',
    ],
    aiExposure: {
      score: 5,
      trend: 'Tăng',
      analysis: 'AI có thể analyze user data, suggest features, track metrics. Tuy nhiên, strategy, user empathy, leadership vẫn cần con người. Job evolve thành "AI-informed PM role", PM sẽ focus vào strategy & human insight chứ không phải execution details.',
    },
  },

  'ky-su-co-khi': {
    id: 'ky-su-co-khi',
    name: 'Kỹ sư cơ khí',
    icon: '⚙️',
    category: 'Kỹ thuật',
    shortDescription: 'Thiết kế, phát triển và sản xuất máy móc, thiết bị cơ khí',
    fullDescription: 'Kỹ sư cơ khí thiết kế và phát triển máy móc, thiết bị, hệ thống cơ khí. Công việc bao gồm thiết kế CAD, phân tích cơ học, xây dựng prototype, kiểm thử. Năm 2026, AI hỗ trợ thiết kế nhưng kỹ sư vẫn cần sáng tạo.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Kỹ thuật cơ khí', 'Kỹ thuật máy', 'Kỹ thuật ô tô', 'Kỹ thuật chế tạo'],
      topUniversities: [
        { name: 'ĐH Bách khoa Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Bách khoa TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Xây dựng Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH Kinh tế kỹ thuật', location: 'TP.HCM' },
      ],
      certifications: ['CATIA / SolidWorks certification', 'ISO/GD&T certification', 'Hydraulic/Pneumatic specialist'],
    },
    skills: {
      technical: [
        { name: 'CAD (SolidWorks, CATIA, Inventor)', level: 'Chuyên gia' },
        { name: 'Cơ học và tĩnh lực học', level: 'Nâng cao' },
        { name: 'Thiết kế máy', level: 'Nâng cao' },
        { name: 'FEA (Finite Element Analysis)', level: 'Trung bình' },
        { name: 'Manufacturing & CNC', level: 'Nâng cao' },
        { name: 'Thermodynamics (nếu máy chạy nhiên liệu)', level: 'Trung bình' },
      ],
      soft: ['Tư duy logic', 'Giải quyết vấn đề', 'Chính xác', 'Giao tiếp kỹ thuật', 'Làm việc nhóm'],
      tools: ['SolidWorks', 'CATIA', 'AutoCAD', 'ANSYS', 'MATLAB', 'ERP systems'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '10-15 triệu', mid: '20-35 triệu', senior: '40-70 triệu' },
      growthRate: '+12% trong 5 năm tới',
      totalJobs: '~80,000 kỹ sư cơ khí tại Việt Nam',
      topEmployers: ['Công ty cơ khí', 'Công ty ô tô', 'Samsung', 'Foxconn', 'Thaco', 'Artisan'],
      workEnvironment: ['Công ty sản xuất', 'Văn phòng thiết kế', 'Công trường', 'Hybrid'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Cơ khí', duration: '4 năm', description: 'Học CAD, cơ học, thiết kế', salary: '0' },
      { stage: '2', title: 'Junior Engineer', duration: '1-2 năm', description: 'Vẽ bản vẽ, hỗ trợ thiết kế, tính toán', salary: '10-15 triệu' },
      { stage: '3', title: 'Mid-level Engineer', duration: '2-3 năm', description: 'Thiết kế độc lập, lead project, optimization', salary: '20-32 triệu' },
      { stage: '4', title: 'Senior Engineer / Technical Lead', duration: '3-5 năm', description: 'Lead team, define standard, problem-solving', salary: '35-55 triệu' },
      { stage: '5', title: 'Engineering Manager / Director', duration: '5+ năm', description: 'Quản lý department, strategy, vendor management', salary: '60-120 triệu+' },
    ],
    pros: [
      'Nhu cầu tuyển dụng cao',
      'Thu nhập ổn định và tăng theo kinh nghiệm',
      'Công việc có ý nghĩa (tạo ra sản phẩm)',
      'Cơ hội làm việc nước ngoài',
      'Công bằng xã hội cao',
    ],
    cons: [
      'Lương giai đoạn đầu không cao',
      'Công việc tập trung vào toán/vật lý',
      'Phải update kỹ thuật mới liên tục',
      'Áp lực khi phải tối ưu chi phí/hiệu năng',
      'Ngành sản xuất có thể volatile',
    ],
    suitablePersonalities: ['INTJ', 'INTP', 'ISTJ', 'ESTJ', 'ENTJ'],
    suitableHolland: ['R', 'I', 'C'],
    relatedCareers: ['Kỹ sư xây dựng', 'Kỹ sư điện', 'Kỹ sư automotive', 'Industrial designer'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Rất quan trọng' },
      { name: 'Vật lý', importance: 'Rất quan trọng' },
      { name: 'Hóa học', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '8:00 - Standup meeting với team',
      '8:30 - Thiết kế bộ phận mới trên CAD',
      '10:30 - Phân tích kết quả FEA',
      '12:00 - Họp với team sản xuất, thảo luận feasibility',
      '13:30 - Tính toán chi phí, material selection',
      '15:00 - Prototype review, problem-solving',
      '16:00 - Viết tech spec, update documentation',
    ],
    aiExposure: {
      score: 4,
      trend: 'Ổn định',
      analysis: 'AI có thể suggest design variations, optimize geometry, tự động analysis. Tuy nhiên, creativity, sáng tạo, understand constraints vẫn cần engineer. Job evolve thành "AI-augmented design", engineer focus vào innovation & strategy.',
    },
  },

  'nha-thiet-ke': {
    id: 'nha-thiet-ke',
    name: 'Nhà thiết kế đồ họa / Thời trang',
    icon: '👗',
    category: 'Thiết kế & Sáng tạo',
    shortDescription: 'Thiết kế đồ họa, thời trang, sản phẩm với tính thẩm mỹ cao',
    fullDescription: 'Nhà thiết kế đồ họa tạo ra visual communication (logo, poster, packaging). Nhà thiết kế thời trang thiết kế quần áo, phụ kiện theo trend. Công việc kết hợp sáng tạo, hiểu biết trend, kỹ thuật thiết kế. Năm 2026, AI design tools hỗ trợ nhưng sáng tạo vẫn cần con người.',
    education: {
      minimumDegree: 'Đại học hoặc Bootcamp',
      recommendedMajors: ['Thiết kế đồ họa', 'Thiết kế thời trang', 'Mỹ thuật ứng dụng', 'Thiết kế sản phẩm'],
      topUniversities: [
        { name: 'ĐH Công nghiệp TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Kiến trúc Hà Nội', location: 'Hà Nội' },
        { name: 'Cao đẳng Mỹ thuật', location: 'Hà Nội / HCM' },
        { name: 'Bootcamp: Graphic/Fashion Design', location: 'HN/HCM' },
      ],
      certifications: ['Adobe Creative Suite Master', 'Fashion design certification', 'CAD (CLO 3D) certification'],
    },
    skills: {
      technical: [
        { name: 'Adobe Creative Suite (Photoshop, Illustrator, InDesign)', level: 'Chuyên gia' },
        { name: 'Layout & Typography', level: 'Chuyên gia' },
        { name: 'Color theory & Composition', level: 'Nâng cao' },
        { name: 'Fashion sketching / Technical drawing', level: 'Nâng cao' },
        { name: 'Prototyping & 3D tools', level: 'Trung bình' },
        { name: 'Figma (UI Design)', level: 'Trung bình' },
      ],
      soft: ['Sáng tạo cao', 'Trend awareness', 'Giao tiếp visual', 'Feedback acceptance', 'Attention to detail'],
      tools: ['Adobe Suite', 'Figma', 'Sketch', 'CLO 3D', 'CAD', 'Design tools (Canva, etc)'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '8-14 triệu', mid: '18-30 triệu', senior: '35-60 triệu' },
      growthRate: '+22% trong 5 năm tới',
      totalJobs: '~35,000 vị trí tại Việt Nam',
      topEmployers: ['Design agency', 'Fashion brand', 'Tech company', 'E-commerce', 'Advertising agency'],
      workEnvironment: ['Design studio', 'Corporate office', 'Freelance', 'Remote/Hybrid'],
    },
    roadmap: [
      { stage: '1', title: 'Bootcamp / Portfolio building', duration: '3-6 tháng', description: 'Học design fundamentals, xây portfolio', salary: '0' },
      { stage: '2', title: 'Junior Designer', duration: '1-2 năm', description: 'Thiết kế asset, hỗ trợ project', salary: '8-14 triệu' },
      { stage: '3', title: 'Mid-level Designer', duration: '2-3 năm', description: 'Lead design project, concept development', salary: '18-28 triệu' },
      { stage: '4', title: 'Senior Designer / Creative Director', duration: '3-5 năm', description: 'Lead team, define creative direction, brand identity', salary: '30-50 triệu' },
      { stage: '5', title: 'Design Director / Brand strategist / Entrepreneur', duration: '5+ năm', description: 'Creative leadership, brand strategy, own agency', salary: '50-150 triệu+' },
    ],
    pros: [
      'Công việc sáng tạo, không nhàm chán',
      'Nhu cầu tuyển dụng cao',
      'Có thể xây dựng personal brand & portfolio',
      'Linh hoạt: in-house hoặc freelance',
      'Cộng đồng designer hỗ trợ',
    ],
    cons: [
      'Giai đoạn đầu lương không cao',
      'Feedback từ client khó cảm nhận đôi khi',
      'Phải cập nhật trend liên tục',
      'Áp lực deadline',
      'Dễ bị AI design tools tác động đến entry-level',
    ],
    suitablePersonalities: ['ISFP', 'INFP', 'ENFP', 'ESFP', 'ESFJ'],
    suitableHolland: ['A', 'I', 'E'],
    relatedCareers: ['UX/UI Designer', 'Illustrator', 'Art Director', 'Fashion curator'],
    importantSubjects: [
      { name: 'Mỹ thuật', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
      { name: 'Lịch sử nghệ thuật / Thời trang', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '9:00 - Check brief từ client/PM',
      '9:30 - Brainstorm concept, mood board',
      '10:30 - Sketch / Ideate design variations',
      '12:00 - Create design mockup trên Adobe',
      '13:30 - Design review, iteration',
      '14:30 - Finalize design, prepare assets',
      '15:30 - File export, handoff tới dev/print',
      '16:30 - Update portfolio, personal projects',
    ],
    aiExposure: {
      score: 6,
      trend: 'Tăng',
      analysis: 'AI design tools có thể generate design suggestions, layout variations nhanh. Tuy nhiên, aesthetic judgment, storytelling, brand understanding vẫn cần human designer. Job evolve, entry-level có thể giảm 20% nhưng value của experienced designer tăng.',
    },
  },

  'phi-cong': {
    id: 'phi-cong',
    name: 'Phi công',
    icon: '✈️',
    category: 'Vận tải & Du lịch',
    shortDescription: 'Lái máy bay, đảm bảo an toàn hành khách, tuân thủ quy định bay',
    fullDescription: 'Phi công là người lái máy bay thương mại, chịu trách nhiệm về an toàn, điều hướng, giao tiếp với kiểm soát không lưu. Công việc đòi hỏi kỹ năng cao, chịu áp lực, tư duy nhanh, tính kỷ luật cao. Năm 2026, máy bay ngày càng tự động nhưng phi công vẫn cần để quản lý hệ thống và xử lý khẩn cấp.',
    education: {
      minimumDegree: 'Đại học hoặc Quân sự',
      recommendedMajors: ['Lái máy bay', 'Hàng không', 'Khoa học quân sự'],
      topUniversities: [
        { name: 'Trường Lái máy bay Cộng Hòa', location: 'Hà Nội' },
        { name: 'Học viện Hàng không Việt Nam', location: 'Hà Nội' },
        { name: 'Quân sự (Học viện Kỹ thuật Quân sự)', location: 'Hà Nội' },
        { name: 'International flight schools (nếu du học)', location: 'Nước ngoài' },
      ],
      certifications: ['Commercial Pilot License (CPL)', 'Airline Transport Pilot (ATPL)', 'Type-rating (Boeing/Airbus)', 'Flight Engineer'],
    },
    skills: {
      technical: [
        { name: 'Điều khiển máy bay', level: 'Chuyên gia' },
        { name: 'Navigation & Instrument flying', level: 'Chuyên gia' },
        { name: 'Aircraft systems & troubleshooting', level: 'Chuyên gia' },
        { name: 'Radio communication', level: 'Nâng cao' },
        { name: 'Weather interpretation', level: 'Nâng cao' },
        { name: 'Emergency procedures', level: 'Chuyên gia' },
      ],
      soft: ['Chịu áp lực cao', 'Tư duy nhanh', 'Tính kỷ luật', 'Teamwork', 'Giao tiếp rõ ràng', 'Responsible'],
      tools: ['Flight simulator', 'Aviation software', 'Weather radar', 'GPS/Navigation system'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '30-50 triệu', mid: '80-150 triệu', senior: '150-300 triệu' },
      growthRate: '+15% trong 5 năm tới',
      totalJobs: '~5,000 phi công tại Việt Nam',
      topEmployers: ['Vietnam Airlines', 'Vietjet', 'Bamboo Airways', 'International airlines'],
      workEnvironment: ['Cockpit', 'In-air', 'Anywhere globally'],
    },
    roadmap: [
      { stage: '1', title: 'Pilot Training', duration: '2-3 năm', description: 'Học bay, lấy commercial license, type-rating', salary: '0 (tốn tiền học)' },
      { stage: '2', title: 'First Officer / Co-pilot', duration: '3-5 năm', description: 'Bay thứ hai dưới captain, build experience', salary: '30-50 triệu' },
      { stage: '3', title: 'Captain (Command Pilot)', duration: '5-10 năm', description: 'Dẫn chuyến bay, trách nhiệm toàn bộ', salary: '80-130 triệu' },
      { stage: '4', title: 'Senior Captain / Check Pilot', duration: '10-15 năm', description: 'Train other pilots, special routes', salary: '130-180 triệu' },
      { stage: '5', title: 'Flight Operations Manager / Retire', duration: '15+ năm', description: 'Quản lý operations hoặc retire với pension', salary: '150-300 triệu+' },
    ],
    pros: [
      'Thu nhập cao, trong top 3 ngành cao lương VN',
      'Được du lịch khắp thế giới (theo quy định)',
      'Nhu cầu tuyển dụng tăng vì ngành bay phát triển',
      'Công nhận xã hội cao',
      'Cơ hội làm việc quốc tế',
    ],
    cons: [
      'Thời gian học và training dài (2-3 năm)',
      'Chi phí training rất cao (~$150-300k)',
      'Sức khỏe phải tốt, kiểm tra y tế khắt khe',
      'Thời gian làm việc bất thường (bay đêm, time zone)',
      'Áp lực cao, trách nhiệm tính mạng hành khách',
    ],
    suitablePersonalities: ['ISTJ', 'ESTJ', 'INTJ', 'ENTJ'],
    suitableHolland: ['R', 'I', 'E'],
    relatedCareers: ['Flight Engineer', 'Cabin Crew Manager', 'Air Traffic Controller', 'Aerospace Engineer'],
    importantSubjects: [
      { name: 'Vật lý', importance: 'Rất quan trọng' },
      { name: 'Toán học', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh chuyên ngành (aviation)', importance: 'Rất quan trọng' },
    ],
    dailyLife: [
      '4:00 - Đi sân bay sớm, check-in, pre-flight brief',
      '5:00 - Pre-flight inspection máy bay',
      '6:00 - Ngồi cockpit, communicate ATC',
      '6:30 - Cất cánh, quản lý chuyến bay',
      '12:00 - Hạ cánh, kiểm tra máy bay',
      '13:00 - Debrief, log book update',
      '14:00 - Rest (flight crew có duty time strict)',
      '20:00 - Next flight hoặc off-duty rest',
    ],
    aiExposure: {
      score: 3,
      trend: 'Ổn định',
      analysis: 'Máy bay ngày càng tự động, autopilot xử lý phần lớn flight. Tuy nhiên, phi công vẫn cần để monitor, xử lý emergency, giao tiếp ATC, quyết định. AI không thay thế phi công mà hỗ trợ. Job này an toàn vì regulatory yêu cầu human pilot.',
    },
  },

  'duoc-si': {
    id: 'duoc-si',
    name: 'Dược sĩ',
    icon: '💊',
    category: 'Y tế',
    shortDescription: 'Quản lý thuốc, tư vấn dùng thuốc, đảm bảo an toàn dược',
    fullDescription: 'Dược sĩ là chuyên gia về thuốc, giúp bệnh nhân sử dụng thuốc đúng cách, an toàn. Công việc bao gồm tư vấn thuốc, quản lý kho, chuẩn bị đơn thuốc, kiểm tra tương tác thuốc. Năm 2026, AI hỗ trợ quản lý kho, kiểm tra drug interactions nhưng tư vấn vẫn cần dược sĩ.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Dược học', 'Dược lâm sàng', 'Công nghệ dược'],
      topUniversities: [
        { name: 'ĐH Y Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH Y TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Y Dược Hải Phòng', location: 'Hải Phòng' },
        { name: 'ĐH Y Dược TP.HCM', location: 'TP.HCM' },
      ],
      certifications: ['Chứng chỉ hành nghề dược sĩ', 'Chứng chỉ dược lâm sàng', 'Hospital pharmacy specialist'],
    },
    skills: {
      technical: [
        { name: 'Kiến thức về thuốc (Pharmacology)', level: 'Chuyên gia' },
        { name: 'Tương tác thuốc & adverse effects', level: 'Chuyên gia' },
        { name: 'Pharmaceutical calculation', level: 'Nâng cao' },
        { name: 'Quản lý kho thuốc', level: 'Nâng cao' },
        { name: 'Pharmacy software', level: 'Cơ bản' },
        { name: 'Dược lâm sàng (clinical pharmacy)', level: 'Nâng cao' },
      ],
      soft: ['Chính xác cao', 'Giao tiếp tốt', 'Đồng cảm', 'Kiên nhẫn', 'Tư duy phản biện'],
      tools: ['Pharmacy software', 'Drug database', 'Electronic prescription', 'Inventory management'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '8-12 triệu', mid: '15-25 triệu', senior: '30-50 triệu' },
      growthRate: '+18% trong 5 năm tới',
      totalJobs: '~30,000 dược sĩ tại Việt Nam',
      topEmployers: ['Bệnh viện', 'Nhà thuốc', 'Công ty dược', 'Công ty bảo hiểm y tế'],
      workEnvironment: ['Nhà thuốc', 'Bệnh viện', 'Công ty dược', 'Pharma company'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên Dược', duration: '5-6 năm', description: 'Học dược lý, hoá dược, quản lý thuốc', salary: '0' },
      { stage: '2', title: 'Dược sĩ tập sự', duration: '1 năm', description: 'Thực tập tại nhà thuốc/BV, làm quen công việc', salary: '8-12 triệu' },
      { stage: '3', title: 'Dược sĩ chính thức', duration: '3-5 năm', description: 'Tư vấn độc lập, quản lý kho', salary: '12-20 triệu' },
      { stage: '4', title: 'Dược sĩ trưởng / Quản lý kho', duration: '5-8 năm', description: 'Quản lý team, định hướng dược', salary: '20-40 triệu' },
      { stage: '5', title: 'Giám đốc / Dược sĩ trưởng BV', duration: '10+ năm', description: 'Quản lý nhà thuốc/bệnh viện, chiến lược dược', salary: '40-100 triệu+' },
    ],
    pros: [
      'Nhu cầu tuyển dụng cao, ổn định',
      'Thu nhập ổn định, tăng theo kinh nghiệm',
      'Công việc có ý nghĩa, giúp bệnh nhân',
      'Ít bị tự động hóa so với nhiều ngành',
      'Cơ hội làm việc nước ngoài',
    ],
    cons: [
      'Phải học lâu (5-6 năm)',
      'Thu nhập giai đoạn đầu không cao',
      'Trách nhiệm cao (sai sót có thể nguy hiểm)',
      'Cần cập nhật kiến thức dược liên tục',
      'Công việc có thể lặp đi lặp lại',
    ],
    suitablePersonalities: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'INTP'],
    suitableHolland: ['I', 'C', 'S'],
    relatedCareers: ['Bác sĩ', 'Y tá', 'Nhân viên y tế', 'Pharmaceutical scientist'],
    importantSubjects: [
      { name: 'Hóa học', importance: 'Rất quan trọng' },
      { name: 'Sinh học', importance: 'Rất quan trọng' },
      { name: 'Toán học', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '8:00 - Kiểm tra hàng về, update inventory',
      '9:00 - Tư vấn khách hàng về thuốc',
      '11:00 - Chuẩn bị đơn thuốc cho khách',
      '12:00 - Kiểm tra tương tác thuốc (AI hỗ trợ)',
      '13:30 - Quản lý kho, nhập/xuất thuốc',
      '15:00 - Tư vấn bác sĩ (nếu ở bệnh viện)',
      '16:30 - Cập nhật records, quality check',
    ],
    aiExposure: {
      score: 5,
      trend: 'Tăng',
      analysis: 'AI có thể quản lý inventory, check drug interactions tự động, gợi ý theo symptoms. Tuy nhiên, tư vấn phức tạp, hiểu patient profile, quyết định clinical vẫn cần dược sĩ. Job evolve thành "clinical pharmacy role", focus vào patient care chứ không phải administrative.',
    },
  },

  'nhan-vien-ngan-hang': {
    id: 'nhan-vien-ngan-hang',
    name: 'Nhân viên Ngân hàng / Tài chính',
    icon: '🏦',
    category: 'Tài chính & Ngân hàng',
    shortDescription: 'Phục vụ khách hàng ngân hàng, xử lý giao dịch, bán sản phẩm tài chính',
    fullDescription: 'Nhân viên ngân hàng phục vụ khách hàng, xử lý giao dịch tiền tệ, mở tài khoản, bán sản phẩm tài chính (vay, tiết kiệm, đầu tư). Công việc bao gồm chăm sóc khách hàng, bán hàng, tuân thủ quy định. Năm 2026, automation và mobile banking giảm số lượng nhân viên nhưng vẫn cần người bán hàng, tư vấn.',
    education: {
      minimumDegree: 'Trung học phổ thông hoặc Cao đẳng',
      recommendedMajors: ['Tài chính - Kế toán', 'Ngân hàng', 'Kinh tế', 'Marketing'],
      topUniversities: [
        { name: 'ĐH Kinh tế Quốc dân', location: 'Hà Nội' },
        { name: 'ĐH Ngoại thương', location: 'Hà Nội / HCM' },
        { name: 'ĐH Kinh tế TP.HCM', location: 'TP.HCM' },
        { name: 'Trung cấp Tài chính - Kế toán', location: 'Toàn quốc' },
      ],
      certifications: ['Chứng chỉ nhân viên Ngân hàng', 'Chứng chỉ bán bảo hiểm', 'Financial advisor certification'],
    },
    skills: {
      technical: [
        { name: 'Banking & Financial products', level: 'Nâng cao' },
        { name: 'Customer service', level: 'Chuyên gia' },
        { name: 'Banking software & systems', level: 'Cơ bản' },
        { name: 'Sales & negotiation', level: 'Nâng cao' },
        { name: 'Compliance & regulations', level: 'Trung bình' },
        { name: 'Cash handling', level: 'Nâng cao' },
      ],
      soft: ['Giao tiếp tốt', 'Bán hàng tốt', 'Chính xác cao', 'Giải quyết conflict', 'Chuyên nghiệp'],
      tools: ['Banking software', 'CRM', 'Mobile banking app', 'Excel'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '10-15 triệu', mid: '20-35 triệu', senior: '35-100 triệu' },
      growthRate: '+8% trong 5 năm tới',
      totalJobs: '~100,000 nhân viên ngân hàng tại Việt Nam',
      topEmployers: ['Agribank', 'BIDV', 'Vietcombank', 'Techcombank', 'ACB', 'Shinhan Bank'],
      workEnvironment: ['Chi nhánh ngân hàng', 'Văn phòng trung tâm', 'Remote (nếu backoffice)'],
    },
    roadmap: [
      { stage: '1', title: 'Nhân viên phục vụ', duration: '1-2 năm', description: 'Tiếp đón, mở tài khoản, xử lý giao dịch', salary: '10-15 triệu' },
      { stage: '2', title: 'Nhân viên bán hàng (Relationship Officer)', duration: '2-3 năm', description: 'Tư vấn sản phẩm, bán vay, tiết kiệm', salary: '15-25 triệu' },
      { stage: '3', title: 'Lãnh đạo nhóm / Quản lý', duration: '3-5 năm', description: 'Quản lý team, định hướng sales', salary: '25-40 triệu' },
      { stage: '4', title: 'Trưởng chi nhánh / Giám đốc', duration: '5-10 năm', description: 'Quản lý chi nhánh, business development', salary: '40-80 triệu' },
      { stage: '5', title: 'Trưởng phòng / Phó tổng giám đốc', duration: '10+ năm', description: 'Quản lý phòng, chiến lược ngân hàng', salary: '80-200 triệu+' },
    ],
    pros: [
      'Nhu cầu tuyển dụng ổn định',
      'Thu nhập tốt, có thưởng từ sales',
      'Có bảo hiểm xã hội tốt',
      'Cơ hội tiến lên quản lý',
      'Ổn định công việc',
    ],
    cons: [
      'Giai đoạn đầu lương cơ bản không cao',
      'Áp lực sales cao',
      'Thời gian làm việc dài (ngân hàng mở đến 5-6 PM)',
      'Công việc bị digital transformation tác động lớn',
      'Phải tuân thủ quy định nghiêm ngặt',
    ],
    suitablePersonalities: ['ESFJ', 'ESFP', 'ENFJ', 'ESTJ', 'ESTP'],
    suitableHolland: ['E', 'C', 'S'],
    relatedCareers: ['Financial advisor', 'Insurance agent', 'Credit analyst', 'Treasury officer'],
    importantSubjects: [
      { name: 'Toán học', importance: 'Quan trọng' },
      { name: 'Kinh tế', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
      { name: 'Tin học', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '8:00 - Chuẩn bị bàn làm việc, check notifications',
      '8:30 - Tiếp đón khách hàng',
      '9:00 - Xử lý giao dịch (chuyển tiền, rút tiền)',
      '11:00 - Tư vấn sản phẩm (vay, tiết kiệm)',
      '12:00 - Nhập liệu, cập nhật khách hàng CRM',
      '13:30 - Tiếp tục phục vụ khách hàng',
      '15:00 - Kiểm tra giao dịch, đóng tiền mặt',
      '17:00 - Báo cáo daily, đóng ca',
    ],
    aiExposure: {
      score: 7,
      trend: 'Tăng',
      analysis: 'Automation & mobile banking có thể xử lý 60-80% giao dịch routine tự động. Chatbots tư vấn sản phẩm đơn giản. Tuy nhiên, complex transactions, relationship building, sales vẫn cần con người. Job này bị tác động lớn, số lượng giảm 30-40% trong 5 năm.',
    },
  },

  // ===== 5 NEW CAREERS (thêm để giảm toast "không có dữ liệu") =====

  'nghe-si-bieu-dien': {
    id: 'nghe-si-bieu-dien',
    name: 'Nghệ sĩ biểu diễn',
    icon: '🎭',
    category: 'Nghệ thuật & Giải trí',
    shortDescription: 'Biểu diễn, sáng tạo trên sân khấu, truyền hình và mạng xã hội',
    fullDescription: 'Nghệ sĩ biểu diễn bao gồm diễn viên, MC, ca sĩ, nhạc sĩ, và người dẫn chương trình. Năm 2026, ngành giải trí Việt Nam phát triển mạnh nhờ streaming platforms (Netflix, WeTV, VieON) và mạng xã hội (TikTok, YouTube). Nghệ sĩ cần đa năng: biểu diễn, sáng tạo nội dung, xây dựng thương hiệu cá nhân. AI đang tạo ra công cụ hỗ trợ (deepfake, voice synthesis) nhưng chưa thể thay thế cảm xúc và sự kết nối con người.',
    education: {
      minimumDegree: 'Cao đẳng',
      recommendedMajors: ['Sân khấu - Điện ảnh', 'Thanh nhạc', 'Biên kịch', 'Truyền thông đa phương tiện'],
      topUniversities: [
        { name: 'ĐH Sân khấu Điện ảnh Hà Nội', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Sân khấu Điện ảnh TP.HCM', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'Nhạc viện TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Văn hóa Nghệ thuật Quân đội', location: 'Hà Nội' },
      ],
      certifications: ['Chứng chỉ MC/Người dẫn chương trình', 'Bằng thanh nhạc', 'Chứng chỉ biên kịch'],
    },
    skills: {
      technical: [
        { name: 'Diễn xuất/Biểu diễn', level: 'Chuyên gia' },
        { name: 'Sáng tạo nội dung số', level: 'Nâng cao' },
        { name: 'Kỹ năng MC/Dẫn chương trình', level: 'Nâng cao' },
        { name: 'Chỉnh sửa video cơ bản', level: 'Trung bình' },
      ],
      soft: ['Sáng tạo', 'Giao tiếp xuất sắc', 'EQ cao', 'Chịu áp lực', 'Tự kỷ luật', 'Kết nối khán giả'],
      tools: ['TikTok/Instagram/YouTube Studio', 'Adobe Premiere', 'CapCut', 'Canva', 'OBS Studio'],
    },
    market: {
      demandLevel: 'Trung bình',
      salaryRange: { entry: '5-15 triệu', mid: '20-60 triệu', senior: '100-500+ triệu' },
      growthRate: '+15% trong 5 năm (nhờ digital platforms)',
      totalJobs: '~30,000 nghệ sĩ chuyên nghiệp tại VN',
      topEmployers: ['VTV/HTV', 'Galaxy Entertainment', 'BHD Star', 'Đông Tây Production', 'TikTok Vietnam'],
      workEnvironment: ['Sân khấu', 'Phim trường', 'Studio', 'Outdoor', 'Home studio'],
    },
    roadmap: [
      { stage: '1', title: 'Sinh viên / Thực tập', duration: '2-4 năm', description: 'Học trường nghệ thuật, tham gia CLB, vai phụ', salary: '0-5 triệu' },
      { stage: '2', title: 'Nghệ sĩ mới', duration: '2-3 năm', description: 'Vai nhỏ, MC sự kiện, xây kênh cá nhân', salary: '5-15 triệu' },
      { stage: '3', title: 'Nghệ sĩ có tên tuổi', duration: '3-5 năm', description: 'Vai chính, MC show lớn, hợp đồng quảng cáo', salary: '20-60 triệu' },
      { stage: '4', title: 'Ngôi sao', duration: '5+ năm', description: 'A-list celebrity, tự sản xuất, kinh doanh riêng', salary: '100-500+ triệu' },
    ],
    pros: ['Thu nhập cao khi nổi tiếng', 'Công việc đam mê sáng tạo', 'Ảnh hưởng xã hội lớn', 'Linh hoạt thời gian'],
    cons: ['Thu nhập bấp bênh khi mới vào nghề', 'Cạnh tranh rất cao', 'Áp lực dư luận', 'Tuổi nghề ngắn cho một số vai trò'],
    suitablePersonalities: ['ENFP', 'ESFP', 'ENFJ', 'ESFJ', 'INFP'],
    suitableHolland: ['A', 'S', 'E'],
    relatedCareers: ['Content Creator', 'Nhà thiết kế', 'Giáo viên nghệ thuật', 'Đạo diễn'],
    importantSubjects: [
      { name: 'Văn học', importance: 'Rất quan trọng' },
      { name: 'Nghệ thuật', importance: 'Rất quan trọng' },
      { name: 'Ngoại ngữ', importance: 'Quan trọng' },
      { name: 'Thể dục', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '7:00 - Tập thể dục, giữ dáng',
      '9:00 - Tập kịch bản, luyện thoại',
      '10:00 - Ghi hình/quay phim/biểu diễn',
      '13:00 - Họp với quản lý, review lịch trình',
      '14:00 - Sáng tạo nội dung cho social media',
      '16:00 - Tham gia sự kiện/show',
      '20:00 - Live show/biểu diễn tối',
    ],
    aiExposure: {
      score: 3,
      trend: 'Ổn định',
      analysis: 'AI có thể tạo deepfake, voice synthesis, và virtual influencer nhưng khán giả vẫn tìm kiếm kết nối cảm xúc thật với người thật. Nghệ sĩ biểu diễn trực tiếp rất khó bị thay thế. AI là công cụ hỗ trợ (chỉnh giọng, edit video) chứ không phải đối thủ.',
    },
  },

  'quan-ly-du-lich-khach-san': {
    id: 'quan-ly-du-lich-khach-san',
    name: 'Quản lý du lịch & khách sạn',
    icon: '🏨',
    category: 'Du lịch & Dịch vụ',
    shortDescription: 'Quản lý vận hành khách sạn, resort và dịch vụ du lịch',
    fullDescription: 'Ngành du lịch & khách sạn Việt Nam hồi phục mạnh sau COVID, đạt 18 triệu khách quốc tế năm 2025. Năm 2026, Việt Nam là điểm đến hot nhất Đông Nam Á. Quản lý du lịch & khách sạn chịu trách nhiệm vận hành, dịch vụ khách hàng, marketing điểm đến, và tối ưu trải nghiệm du khách. Đây là ngành đòi hỏi ngoại ngữ, kỹ năng giao tiếp đa văn hóa và sự linh hoạt.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Quản trị khách sạn', 'Du lịch & Lữ hành', 'Quản trị dịch vụ', 'Ngoại ngữ du lịch'],
      topUniversities: [
        { name: 'ĐH Kinh tế Quốc dân (Khoa Du lịch)', location: 'Hà Nội', ranking: 'Top 1' },
        { name: 'ĐH Tôn Đức Thắng', location: 'TP.HCM', ranking: 'Top 2' },
        { name: 'ĐH Hoa Sen', location: 'TP.HCM' },
        { name: 'ĐH Duy Tân (Khoa Hospitality)', location: 'Đà Nẵng' },
        { name: 'Học viện Du lịch Việt Nam', location: 'Toàn quốc' },
      ],
      certifications: ['AHLEI (Hospitality Certificate)', 'IATA', 'TOEIC 700+', 'Chứng chỉ hướng dẫn viên du lịch'],
    },
    skills: {
      technical: [
        { name: 'Quản trị vận hành khách sạn', level: 'Nâng cao' },
        { name: 'Revenue Management', level: 'Nâng cao' },
        { name: 'Tiếng Anh giao tiếp', level: 'Nâng cao' },
        { name: 'Digital Marketing du lịch', level: 'Trung bình' },
      ],
      soft: ['Giao tiếp đa văn hóa', 'Quản lý nhân sự', 'Giải quyết vấn đề nhanh', 'Tận tâm phục vụ', 'Chịu áp lực'],
      tools: ['Opera PMS', 'Booking.com Extranet', 'TripAdvisor', 'Salesforce Hospitality', 'Canva'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '8-12 triệu', mid: '15-30 triệu', senior: '35-80 triệu' },
      growthRate: '+20% trong 5 năm',
      totalJobs: '~200,000 vị trí ngành hospitality tại VN',
      topEmployers: ['Vinpearl', 'Marriott Vietnam', 'Accor Hotels', 'Mường Thanh', 'Sun Group', 'Vietravel'],
      workEnvironment: ['Khách sạn/Resort', 'Văn phòng du lịch', 'Sân bay', 'Outdoor'],
    },
    roadmap: [
      { stage: '1', title: 'Thực tập sinh', duration: '6-12 tháng', description: 'Thực tập tại bộ phận F&B, lễ tân, housekeeping', salary: '3-5 triệu' },
      { stage: '2', title: 'Nhân viên', duration: '1-2 năm', description: 'Lễ tân, điều phối tour, nhân viên F&B', salary: '8-12 triệu' },
      { stage: '3', title: 'Supervisor/Trưởng bộ phận', duration: '2-4 năm', description: 'Quản lý bộ phận, training nhân viên mới', salary: '15-30 triệu' },
      { stage: '4', title: 'Quản lý / GM', duration: '5+ năm', description: 'General Manager khách sạn, giám đốc chi nhánh lữ hành', salary: '35-80 triệu' },
    ],
    pros: ['Được đi du lịch nhiều nơi', 'Gặp gỡ người từ khắp thế giới', 'Cơ hội làm việc quốc tế', 'Ngành luôn phát triển'],
    cons: ['Làm việc cuối tuần & ngày lễ', 'Áp lực phục vụ khách hàng', 'Lương khởi điểm thấp', 'Công việc vất vả thể chất'],
    suitablePersonalities: ['ESFJ', 'ENFJ', 'ESFP', 'ESTJ', 'ENFP'],
    suitableHolland: ['E', 'S', 'C'],
    relatedCareers: ['Content Creator', 'Doanh nhân', 'Quản lý dự án', 'Nghệ sĩ biểu diễn'],
    importantSubjects: [
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'Địa lý', importance: 'Quan trọng' },
      { name: 'Lịch sử', importance: 'Quan trọng' },
      { name: 'GDCD', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '7:00 - Briefing sáng với đội ngũ',
      '8:00 - Kiểm tra vận hành, check guest feedback',
      '9:00 - Xử lý booking, điều phối',
      '11:00 - Giải quyết vấn đề khách hàng VIP',
      '13:00 - Họp với bộ phận F&B, housekeeping',
      '15:00 - Review revenue, cập nhật giá phòng',
      '17:00 - Kiểm tra tối, bàn giao ca',
    ],
    aiExposure: {
      score: 4,
      trend: 'Ổn định',
      analysis: 'AI chatbot xử lý booking online, check-in tự động, chatbot hỗ trợ khách 24/7. Tuy nhiên, hospitality vẫn cần con người cho dịch vụ cá nhân hóa, xử lý tình huống bất ngờ, và tạo trải nghiệm đáng nhớ. Quản lý cấp cao ít bị ảnh hưởng.',
    },
  },

  'dau-bep': {
    id: 'dau-bep',
    name: 'Đầu bếp',
    icon: '👨‍🍳',
    category: 'Ẩm thực & F&B',
    shortDescription: 'Sáng tạo ẩm thực, quản lý bếp và phát triển thực đơn',
    fullDescription: 'Đầu bếp chuyên nghiệp không chỉ nấu ăn mà còn sáng tạo thực đơn, quản lý nhà bếp, kiểm soát chất lượng và chi phí nguyên liệu. Năm 2026, ngành F&B Việt Nam bùng nổ với hàng ngàn nhà hàng mới, food delivery platform, và xu hướng ẩm thực fusion. Đầu bếp Việt ngày càng được quốc tế công nhận (Michelin Guide Hà Nội & TP.HCM).',
    education: {
      minimumDegree: 'Cao đẳng',
      recommendedMajors: ['Kỹ thuật chế biến món ăn', 'Quản trị bếp', 'Nghệ thuật ẩm thực', 'F&B Management'],
      topUniversities: [
        { name: 'Trường CĐ nghề Du lịch Sài Gòn', location: 'TP.HCM', ranking: 'Top 1' },
        { name: 'Le Cordon Bleu Saigon (Quốc tế)', location: 'TP.HCM' },
        { name: 'CĐ Kỹ thuật Hà Nội', location: 'Hà Nội' },
        { name: 'Trường dạy nấu ăn Hướng Nghiệp Á Âu', location: 'Toàn quốc' },
      ],
      certifications: ['Chứng chỉ bếp trưởng', 'Vệ sinh an toàn thực phẩm', 'HACCP', 'Sommelier (nếu chuyên rượu)'],
    },
    skills: {
      technical: [
        { name: 'Kỹ thuật nấu ăn chuyên sâu', level: 'Chuyên gia' },
        { name: 'Quản lý bếp & chuỗi cung ứng', level: 'Nâng cao' },
        { name: 'Sáng tạo thực đơn', level: 'Nâng cao' },
        { name: 'Vệ sinh an toàn thực phẩm', level: 'Nâng cao' },
      ],
      soft: ['Sáng tạo', 'Chịu áp lực cao', 'Quản lý thời gian', 'Teamwork', 'Tỉ mỉ chi tiết'],
      tools: ['Thiết bị bếp công nghiệp', 'POS system', 'Food cost calculator', 'Recipe management software'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '6-10 triệu', mid: '15-30 triệu', senior: '40-100+ triệu' },
      growthRate: '+18% trong 5 năm',
      totalJobs: '~150,000 đầu bếp chuyên nghiệp tại VN',
      topEmployers: ['Golden Gate Group', 'Lotte Hotel', 'InterContinental', 'Nhà hàng Michelin', 'Resort 5 sao'],
      workEnvironment: ['Nhà hàng', 'Khách sạn', 'Cruise', 'Bếp riêng', 'Studio ẩm thực'],
    },
    roadmap: [
      { stage: '1', title: 'Phụ bếp', duration: '1-2 năm', description: 'Chuẩn bị nguyên liệu, học cơ bản', salary: '5-8 triệu' },
      { stage: '2', title: 'Đầu bếp chính', duration: '2-3 năm', description: 'Phụ trách một station, nấu món chính', salary: '10-15 triệu' },
      { stage: '3', title: 'Bếp trưởng (Sous Chef)', duration: '3-5 năm', description: 'Quản lý bếp, phát triển thực đơn', salary: '20-40 triệu' },
      { stage: '4', title: 'Executive Chef / Chủ nhà hàng', duration: '5+ năm', description: 'Điều hành toàn bộ F&B, thương hiệu riêng', salary: '50-100+ triệu' },
    ],
    pros: ['Công việc sáng tạo mỗi ngày', 'Cơ hội du lịch & làm việc quốc tế', 'Được nhiều người biết đến', 'Tự mở nhà hàng riêng'],
    cons: ['Môi trường nóng, áp lực cao', 'Giờ làm việc dài và bất thường', 'Đứng nhiều, vất vả thể chất', 'Cạnh tranh gay gắt'],
    suitablePersonalities: ['ISTP', 'ISFP', 'ESTP', 'ESFP', 'ISTJ'],
    suitableHolland: ['R', 'A', 'E'],
    relatedCareers: ['Quản lý du lịch & khách sạn', 'Doanh nhân', 'Content Creator', 'Nhà thiết kế'],
    importantSubjects: [
      { name: 'Hóa học', importance: 'Quan trọng' },
      { name: 'Sinh học', importance: 'Quan trọng' },
      { name: 'Ngoại ngữ', importance: 'Quan trọng' },
      { name: 'Mỹ thuật', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '6:00 - Nhận nguyên liệu, kiểm tra chất lượng',
      '7:00 - Mise en place (chuẩn bị)',
      '10:00 - Service trưa (nấu, trình bày)',
      '14:00 - Nghỉ giữa ca, sáng tạo món mới',
      '16:00 - Chuẩn bị service tối',
      '18:00 - Service tối (peak hours)',
      '22:00 - Dọn dẹp, kiểm kê, lên kế hoạch ngày mai',
    ],
    aiExposure: {
      score: 2,
      trend: 'Ổn định',
      analysis: 'Nấu ăn là nghề thủ công đòi hỏi vị giác, xúc giác, sáng tạo — những thứ AI không thể làm. Robot bếp chỉ xử lý được đồ ăn nhanh đơn giản. Đầu bếp cao cấp hoàn toàn an toàn. AI chỉ hỗ trợ quản lý kho, tối ưu thực đơn, recipe suggestion.',
    },
  },

  'nhan-vien-xa-hoi': {
    id: 'nhan-vien-xa-hoi',
    name: 'Nhân viên xã hội',
    icon: '🤝',
    category: 'Y tế & Xã hội',
    shortDescription: 'Hỗ trợ, tư vấn và bảo vệ quyền lợi cho nhóm yếu thế',
    fullDescription: 'Nhân viên xã hội làm việc trực tiếp với cá nhân, gia đình và cộng đồng để giải quyết các vấn đề xã hội: bạo lực gia đình, nghèo đói, sức khỏe tâm thần, trẻ em bị bỏ rơi, người khuyết tật. Năm 2026, Việt Nam đang đẩy mạnh hệ thống an sinh xã hội với nhiều chương trình quốc gia, tạo nhu cầu lớn cho ngành này.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Công tác xã hội', 'Xã hội học', 'Tâm lý học', 'Phát triển cộng đồng'],
      topUniversities: [
        { name: 'ĐH Khoa học Xã hội & Nhân văn', location: 'HN/HCM', ranking: 'Top 1' },
        { name: 'ĐH Lao động - Xã hội', location: 'Hà Nội', ranking: 'Top 2' },
        { name: 'ĐH Sư phạm TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Đà Lạt', location: 'Đà Lạt' },
      ],
      certifications: ['Chứng chỉ hành nghề công tác xã hội', 'Tâm lý trị liệu cơ bản', 'Sơ cấp cứu'],
    },
    skills: {
      technical: [
        { name: 'Tư vấn tâm lý cơ bản', level: 'Nâng cao' },
        { name: 'Đánh giá nhu cầu xã hội', level: 'Nâng cao' },
        { name: 'Quản lý trường hợp (Case Management)', level: 'Nâng cao' },
        { name: 'Viết báo cáo, đề xuất dự án', level: 'Trung bình' },
      ],
      soft: ['Đồng cảm', 'Lắng nghe tích cực', 'Kiên nhẫn', 'Giao tiếp đa văn hóa', 'Kiểm soát cảm xúc'],
      tools: ['Hệ thống quản lý case', 'Microsoft Office', 'Phần mềm quản lý dữ liệu xã hội'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '6-9 triệu', mid: '10-18 triệu', senior: '20-35 triệu' },
      growthRate: '+22% trong 5 năm (nhờ chính sách an sinh)',
      totalJobs: '~50,000 vị trí tại VN',
      topEmployers: ['UNICEF Vietnam', 'World Vision', 'Sở LĐTBXH các tỉnh', 'Save the Children', 'Hội Chữ Thập Đỏ'],
      workEnvironment: ['Cộng đồng', 'Bệnh viện', 'Trường học', 'Tổ chức NGO', 'Cơ quan nhà nước'],
    },
    roadmap: [
      { stage: '1', title: 'Tình nguyện viên / Thực tập', duration: '1 năm', description: 'Tham gia dự án cộng đồng, học kỹ năng thực tế', salary: '0-5 triệu' },
      { stage: '2', title: 'Nhân viên xã hội', duration: '2-3 năm', description: 'Quản lý case, tư vấn cá nhân', salary: '8-12 triệu' },
      { stage: '3', title: 'Chuyên viên cao cấp', duration: '3-5 năm', description: 'Quản lý dự án, đào tạo nhân viên mới', salary: '15-25 triệu' },
      { stage: '4', title: 'Giám đốc chương trình', duration: '5+ năm', description: 'Thiết kế chính sách, điều hành tổ chức', salary: '25-35 triệu' },
    ],
    pros: ['Ý nghĩa xã hội cao', 'Giúp đỡ được nhiều người', 'Công việc đa dạng', 'Được tôn trọng trong cộng đồng'],
    cons: ['Lương thấp so với ngành khác', 'Áp lực cảm xúc lớn', 'Burnout cao', 'Thiếu nguồn lực thường xuyên'],
    suitablePersonalities: ['ENFJ', 'INFJ', 'ESFJ', 'ISFJ', 'ENFP'],
    suitableHolland: ['S', 'A', 'I'],
    relatedCareers: ['Nhà tâm lý', 'Giáo viên', 'Y tá', 'Luật sư'],
    importantSubjects: [
      { name: 'GDCD', importance: 'Rất quan trọng' },
      { name: 'Văn học', importance: 'Quan trọng' },
      { name: 'Sinh học', importance: 'Hữu ích' },
      { name: 'Ngoại ngữ', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '8:00 - Kiểm tra email, cập nhật case files',
      '9:00 - Thăm hộ gia đình / cá nhân cần hỗ trợ',
      '11:00 - Tư vấn tại văn phòng',
      '13:00 - Họp team, review case',
      '14:00 - Liên hệ cơ quan liên quan (y tế, giáo dục)',
      '16:00 - Viết báo cáo, cập nhật hồ sơ',
      '17:00 - Hỗ trợ khẩn cấp nếu có',
    ],
    aiExposure: {
      score: 2,
      trend: 'Ổn định',
      analysis: 'Công tác xã hội đòi hỏi đồng cảm, đánh giá tình huống phức tạp, và xây dựng niềm tin — những kỹ năng AI không thể thay thế. AI chỉ hỗ trợ quản lý data, tự động hóa báo cáo. Con người vẫn là trung tâm.',
    },
  },

  'quan-nhan-canh-sat': {
    id: 'quan-nhan-canh-sat',
    name: 'Quân nhân / Cảnh sát',
    icon: '🛡️',
    category: 'An ninh & Quốc phòng',
    shortDescription: 'Bảo vệ an ninh quốc gia, trật tự xã hội và phục vụ nhân dân',
    fullDescription: 'Quân nhân và cảnh sát giữ vai trò bảo vệ quốc phòng, an ninh trật tự. Năm 2026, lực lượng vũ trang Việt Nam hiện đại hóa mạnh mẽ với công nghệ mới (AI, drone, cyber defense). Cảnh sát cũng chuyên nghiệp hóa với nhiều lĩnh vực chuyên sâu: an ninh mạng, phòng chống tội phạm công nghệ cao, forensics.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Học viện Quân sự', 'Học viện Cảnh sát', 'An ninh mạng', 'Luật'],
      topUniversities: [
        { name: 'Học viện Quân sự', location: 'Hà Nội', ranking: 'Top 1 (Quân đội)' },
        { name: 'Học viện An ninh Nhân dân', location: 'Hà Nội', ranking: 'Top 1 (Công an)' },
        { name: 'Học viện Cảnh sát Nhân dân', location: 'Hà Nội', ranking: 'Top 2 (Công an)' },
        { name: 'ĐH Cảnh sát TP.HCM', location: 'TP.HCM' },
      ],
      certifications: ['Chứng chỉ quân sự/công an', 'Bằng lái xe đặc chủng', 'Chứng chỉ an ninh mạng (nếu cyber)'],
    },
    skills: {
      technical: [
        { name: 'Thể lực & võ thuật', level: 'Nâng cao' },
        { name: 'Sử dụng vũ khí & thiết bị', level: 'Nâng cao' },
        { name: 'Pháp luật & tố tụng', level: 'Nâng cao' },
        { name: 'An ninh mạng (nếu chuyên sâu)', level: 'Trung bình' },
      ],
      soft: ['Kỷ luật', 'Dũng cảm', 'Ra quyết định nhanh', 'Teamwork', 'Chịu áp lực cực cao'],
      tools: ['Thiết bị nghiệp vụ', 'Hệ thống thông tin an ninh', 'Drone', 'Camera giám sát AI'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '8-12 triệu', mid: '15-25 triệu', senior: '25-45 triệu' },
      growthRate: '+10% trong 5 năm',
      totalJobs: '~500,000 quân nhân & công an tại VN',
      topEmployers: ['Bộ Quốc phòng', 'Bộ Công an', 'Cơ quan An ninh', 'Lực lượng Biên phòng'],
      workEnvironment: ['Đồn/trại', 'Tuần tra thực địa', 'Văn phòng', 'Địa bàn biên giới'],
    },
    roadmap: [
      { stage: '1', title: 'Học viên', duration: '4 năm', description: 'Đào tạo tại Học viện, rèn luyện thể lực & nghiệp vụ', salary: 'Phụ cấp học viên' },
      { stage: '2', title: 'Sĩ quan / Chiến sĩ', duration: '3-5 năm', description: 'Công tác tại đơn vị, thực hiện nhiệm vụ', salary: '10-15 triệu' },
      { stage: '3', title: 'Cán bộ chỉ huy', duration: '5-10 năm', description: 'Quản lý đội/tổ, chỉ huy chiến thuật', salary: '18-30 triệu' },
      { stage: '4', title: 'Cán bộ cấp cao', duration: '10+ năm', description: 'Lãnh đạo đơn vị, hoạch định chiến lược', salary: '30-45+ triệu' },
    ],
    pros: ['Ổn định công việc suốt đời', 'Được xã hội tôn trọng', 'Phục vụ Tổ quốc', 'Phúc lợi tốt (nhà ở, y tế)'],
    cons: ['Rủi ro cao', 'Xa nhà thường xuyên', 'Kỷ luật nghiêm khắc', 'Lương cơ bản không cao'],
    suitablePersonalities: ['ISTJ', 'ESTJ', 'ISTP', 'ESTP', 'ENTJ'],
    suitableHolland: ['R', 'E', 'C'],
    relatedCareers: ['Luật sư', 'Kỹ sư phần mềm (an ninh mạng)', 'Quản lý dự án'],
    importantSubjects: [
      { name: 'Thể dục', importance: 'Rất quan trọng' },
      { name: 'GDCD', importance: 'Rất quan trọng' },
      { name: 'Lịch sử', importance: 'Quan trọng' },
      { name: 'Toán', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '5:30 - Thể dục sáng',
      '7:00 - Điểm danh, nhận nhiệm vụ',
      '8:00 - Tuần tra / làm việc tại đơn vị',
      '11:30 - Ăn trưa tập thể',
      '13:30 - Huấn luyện / xử lý vụ việc',
      '17:00 - Tổng kết ngày, báo cáo',
      '19:00 - Trực đêm (luân phiên)',
    ],
    aiExposure: {
      score: 2,
      trend: 'Ổn định',
      analysis: 'AI hỗ trợ surveillance (nhận diện khuôn mặt, phân tích dữ liệu tội phạm, drone tuần tra) nhưng không thể thay thế con người trong bắt giữ, tuần tra thực địa, quyết định chiến thuật. An ninh mạng là lĩnh vực mới cần nhiều nhân lực.',
    },
  },

  // ─────────────────────────────────────────────────────────────────
  // V3 (2026-05-22): Thêm 3 nghề hiện đại theo xu thế Industry 4.0
  // - Kỹ sư Robot / Tự động hoá (NL Robotics + IoT bùng nổ ở VN)
  // - Nhà Ngôn ngữ học (NLP, dịch máy, Computational Linguistics)
  // - Chuyên gia An ninh mạng (Cybersecurity — thiếu hụt nghiêm trọng)
  // ─────────────────────────────────────────────────────────────────

  'ky-su-robot': {
    id: 'ky-su-robot',
    name: 'Kỹ sư Robot & Tự động hoá',
    icon: '🤖',
    category: 'Công nghệ - Kỹ thuật',
    shortDescription: 'Thiết kế, lập trình, vận hành robot công nghiệp + hệ thống tự động hoá nhà máy thông minh',
    fullDescription: 'Kỹ sư robot xây dựng các hệ thống tự động hoá kết hợp cơ khí, điện tử và phần mềm — từ cánh tay robot lắp ráp ô tô, drone, robot phẫu thuật đến AGV tự hành kho thông minh. Đây là nghề mũi nhọn của Industry 4.0, đang được FPT, Vingroup, VinFast, Samsung Việt Nam tuyển dụng mạnh.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Cơ điện tử (Mechatronics)', 'Tự động hoá', 'Robotics', 'Kỹ thuật điều khiển'],
      topUniversities: [
        { name: 'ĐH Bách khoa Hà Nội', location: 'Hà Nội', ranking: 'Top 1 VN' },
        { name: 'ĐH Bách khoa TP.HCM', location: 'TP.HCM', ranking: 'Top 2 VN' },
        { name: 'ĐH Sư phạm Kỹ thuật TP.HCM', location: 'TP.HCM' },
      ],
      certifications: ['ROS Industrial', 'PLC Siemens S7', 'FANUC Robot Operator'],
    },
    skills: {
      technical: [
        { name: 'Lập trình C++/Python', level: 'Nâng cao' },
        { name: 'ROS (Robot Operating System)', level: 'Nâng cao' },
        { name: 'PLC + SCADA', level: 'Trung bình' },
        { name: 'Computer Vision (OpenCV)', level: 'Trung bình' },
        { name: 'Cơ học + Động lực học', level: 'Nâng cao' },
      ],
      soft: ['Tư duy hệ thống', 'Giải quyết vấn đề', 'Làm việc nhóm liên ngành', 'Cẩn thận'],
      tools: ['ROS', 'MATLAB/Simulink', 'SolidWorks', 'Arduino/Raspberry Pi', 'Gazebo (mô phỏng)'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '15-25 triệu/tháng', mid: '30-50 triệu/tháng', senior: '60-120 triệu/tháng' },
      growthRate: '+35% trong 5 năm (xu hướng nhà máy thông minh)',
      totalJobs: '~8,000 vị trí tại VN, sẽ tăng gấp 3 vào 2030',
      topEmployers: ['VinFast', 'Samsung Việt Nam', 'Bosch', 'FPT Software', 'Viettel'],
      workEnvironment: ['Nhà máy', 'Lab nghiên cứu', 'Văn phòng thiết kế', 'Hybrid'],
    },
    roadmap: [
      { stage: 'Năm 1-2', title: 'Kỹ sư Robot Junior', duration: '2 năm', description: 'Lập trình cánh tay robot, bảo trì hệ thống auto', salary: '15-20 triệu' },
      { stage: 'Năm 3-5', title: 'Kỹ sư Senior', duration: '3 năm', description: 'Thiết kế hệ thống tự động hoá toàn dây chuyền', salary: '30-45 triệu' },
      { stage: 'Năm 6-10', title: 'Lead Robotics Engineer', duration: '5 năm', description: 'Lãnh đạo team, kiến trúc giải pháp', salary: '60-100 triệu' },
    ],
    pros: ['Lương cao + thị trường thiếu hụt', 'Công việc thú vị (kết hợp HW+SW)', 'Cơ hội xuất khẩu lao động (Nhật, Đức)', 'Tương lai Industry 4.0'],
    cons: ['Học khó (cần cả cơ + điện + lập trình)', 'Phải vào nhà máy (môi trường công nghiệp)', 'Cập nhật công nghệ liên tục', 'Đầu tư thiết bị thí nghiệm tốn kém'],
    suitablePersonalities: ['INTJ', 'INTP', 'ISTJ', 'ENTJ'],
    suitableHolland: ['R', 'I'],
    relatedCareers: ['ky-su-co-khi', 'ky-su-phan-mem', 'nha-nghien-cuu-ai'],
    importantSubjects: [
      { name: 'Toán', importance: 'Rất quan trọng' },
      { name: 'Vật lý', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Rất quan trọng' },
      { name: 'Công nghệ', importance: 'Quan trọng' },
      { name: 'Tiếng Anh', importance: 'Quan trọng' },
    ],
    dailyLife: [
      '8:00 - Đọc log robot đêm qua, kiểm tra trạng thái',
      '9:00 - Debug code Python điều khiển cánh tay',
      '10:30 - Stand-up meeting với team production',
      '13:00 - Test giải pháp computer vision mới',
      '15:00 - Soạn tài liệu vận hành cho operator',
      '17:00 - Tổng hợp KPI hiệu suất robot',
    ],
    aiExposure: {
      score: 3,
      trend: 'Ổn định',
      analysis: 'AI/ML là CÔNG CỤ của kỹ sư robot (vision, motion planning), không thay thế. Robot vật lý vẫn cần con người thiết kế, lắp đặt, bảo trì. Ngành đang BÙNG NỔ nhờ AI giúp robot thông minh hơn → nhu cầu kỹ sư tăng mạnh.',
    },
  },

  'nha-ngon-ngu-hoc': {
    id: 'nha-ngon-ngu-hoc',
    name: 'Nhà Ngôn ngữ học & Chuyên gia NLP',
    icon: '📖',
    category: 'Khoa học - Nghiên cứu',
    shortDescription: 'Nghiên cứu cấu trúc ngôn ngữ, xây dựng hệ thống xử lý ngôn ngữ tự nhiên cho AI/dịch máy',
    fullDescription: 'Ngôn ngữ học hiện đại không chỉ nghiên cứu ngữ pháp/từ vựng mà còn kết hợp với AI để xây dựng chatbot, dịch máy, voice assistant. Việt Nam đang thiếu chuyên gia ngôn ngữ học có thể làm việc với LLM (Claude, GPT) — vai trò Prompt Engineer + Linguistic Data Annotator được trả lương rất cao.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['Ngôn ngữ học', 'Việt Nam học', 'Computational Linguistics', 'Tiếng Anh chuyên ngành'],
      topUniversities: [
        { name: 'ĐH KHXH&NV Hà Nội', location: 'Hà Nội', ranking: 'Top 1 ngành Ngôn ngữ' },
        { name: 'ĐH KHXH&NV TP.HCM', location: 'TP.HCM' },
        { name: 'ĐH Hà Nội (HANU)', location: 'Hà Nội' },
        { name: 'ĐH Ngoại ngữ — ĐHQG HN', location: 'Hà Nội' },
      ],
      certifications: ['DELE/TOEIC/IELTS 7.0+', 'HSK 5+', 'Google Cloud NLP'],
    },
    skills: {
      technical: [
        { name: 'Phân tích cú pháp + ngữ nghĩa', level: 'Chuyên gia' },
        { name: 'NLP (NLTK, spaCy)', level: 'Trung bình' },
        { name: 'Python cơ bản', level: 'Cơ bản' },
        { name: 'Prompt Engineering (LLM)', level: 'Nâng cao' },
        { name: 'Annotation + Corpus building', level: 'Nâng cao' },
      ],
      soft: ['Tư duy phân tích', 'Tỉ mỉ', 'Kiên nhẫn', 'Đa văn hoá'],
      tools: ['Praat (phân tích âm)', 'ELAN', 'Anthropic Claude / OpenAI Playground', 'Excel/Google Sheets', 'Anki'],
    },
    market: {
      demandLevel: 'Cao',
      salaryRange: { entry: '10-18 triệu/tháng', mid: '20-40 triệu/tháng', senior: '50-100 triệu/tháng (NLP)' },
      growthRate: '+40% nhờ AI/LLM boom — Prompt Engineer + Data Annotator',
      totalJobs: '~5,000 vị trí ngôn ngữ thuần + ~3,000 vị trí NLP',
      topEmployers: ['VinAI', 'Zalo AI', 'FPT.AI', 'Viện Ngôn ngữ học', 'Đại học (giảng dạy)', 'Anthropic/OpenAI (remote)'],
      workEnvironment: ['Văn phòng AI lab', 'Viện nghiên cứu', 'Đại học', 'Remote (annotation/dịch)'],
    },
    roadmap: [
      { stage: 'Năm 1-2', title: 'Data Annotator / Trợ giảng', duration: '2 năm', description: 'Gắn nhãn corpus, dịch, hỗ trợ nghiên cứu', salary: '10-15 triệu' },
      { stage: 'Năm 3-5', title: 'Linguistic Researcher / NLP Engineer Junior', duration: '3 năm', description: 'Xây pipeline NLP, fine-tune model, viết bài báo', salary: '20-35 triệu' },
      { stage: 'Năm 6+', title: 'Senior Computational Linguist', duration: '5+ năm', description: 'Lead NLP team hoặc giảng viên ĐH', salary: '50-100 triệu' },
    ],
    pros: ['Kết hợp humanities + tech (độc đáo)', 'Nhu cầu AI boom', 'Có thể remote (annotation/dịch)', 'Đóng góp cho tiếng Việt số hoá'],
    cons: ['Lương khởi điểm thấp nếu thuần ngôn ngữ', 'Cần học thêm CS để vào NLP', 'Việc làm thuần ngôn ngữ ít', 'Áp lực xuất bản (nếu academic)'],
    suitablePersonalities: ['INFJ', 'INTJ', 'INFP', 'ISFJ'],
    suitableHolland: ['I', 'A', 'S'],
    relatedCareers: ['nha-nghien-cuu-ai', 'content-creator', 'nha-van', 'giao-vien'],
    importantSubjects: [
      { name: 'Văn', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'Tin học', importance: 'Quan trọng' },
      { name: 'Toán', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '8:30 - Đọc paper NLP mới (ACL/EMNLP)',
      '9:30 - Phân tích cú pháp 200 câu tiếng Việt khó',
      '11:00 - Họp với engineer team về prompt template',
      '14:00 - Annotate dataset 500 câu cho fine-tuning',
      '15:30 - Viết báo cáo phương ngữ Nam Bộ',
      '17:00 - Review bài dịch máy + ghi note lỗi',
    ],
    aiExposure: {
      score: 6,
      trend: 'Tăng',
      analysis: 'AI thay được PHẦN dịch + tóm tắt cơ bản, NHƯNG cần ngôn ngữ học để: (1) thiết kế dataset training (2) đánh giá chất lượng LLM (3) xử lý phương ngữ + ngôn ngữ thiểu số (4) Prompt Engineering. Đây là nghề "cộng sinh với AI" — không bị thay thế mà được nâng tầm.',
    },
  },

  'chuyen-gia-an-ninh-mang': {
    id: 'chuyen-gia-an-ninh-mang',
    name: 'Chuyên gia An ninh mạng',
    icon: '🛡',
    category: 'Công nghệ - Kỹ thuật',
    shortDescription: 'Bảo vệ hệ thống IT khỏi tấn công mạng, phát hiện lỗ hổng, ứng cứu sự cố',
    fullDescription: 'Chuyên gia an ninh mạng (Cybersecurity) bảo vệ tài sản số của doanh nghiệp — từ pentest tìm lỗ hổng, threat hunting, ứng cứu sự cố ransomware, đến tuân thủ ISO 27001/PCI DSS. Việt Nam thiếu hụt ~50,000 nhân lực ngành này — lương cao nhất ngành IT.',
    education: {
      minimumDegree: 'Đại học',
      recommendedMajors: ['An toàn thông tin', 'Khoa học máy tính', 'Mạng máy tính', 'Hệ thống thông tin'],
      topUniversities: [
        { name: 'Học viện Kỹ thuật Mật mã', location: 'Hà Nội', ranking: 'Chuyên ngành An ninh #1' },
        { name: 'ĐH Bách khoa Hà Nội', location: 'Hà Nội' },
        { name: 'ĐH FPT', location: 'Toàn quốc' },
        { name: 'PTIT', location: 'Hà Nội + TP.HCM' },
      ],
      certifications: ['CEH (Certified Ethical Hacker)', 'OSCP', 'CISSP', 'CompTIA Security+', 'Google Cybersecurity Cert'],
    },
    skills: {
      technical: [
        { name: 'Network Security + TCP/IP', level: 'Chuyên gia' },
        { name: 'Penetration Testing', level: 'Nâng cao' },
        { name: 'Python + Bash scripting', level: 'Nâng cao' },
        { name: 'SIEM (Splunk/Elastic)', level: 'Trung bình' },
        { name: 'Cryptography', level: 'Trung bình' },
      ],
      soft: ['Tư duy "kẻ tấn công"', 'Tỉ mỉ', 'Đạo đức nghề nghiệp', 'Học liên tục'],
      tools: ['Burp Suite', 'Metasploit', 'Wireshark', 'Nmap', 'Kali Linux', 'Splunk'],
    },
    market: {
      demandLevel: 'Rất cao',
      salaryRange: { entry: '18-30 triệu/tháng', mid: '40-70 triệu/tháng', senior: '80-200 triệu/tháng' },
      growthRate: '+50% trong 5 năm — thiếu hụt nghiêm trọng',
      totalJobs: '~15,000 vị trí hiện tại, cần ~50,000 vào 2030',
      topEmployers: ['Viettel Cyber Security', 'VNPT-IT', 'CMC Cyber', 'BKAV', 'Ngân hàng (Vietcombank, MB)', 'NCS', 'VinCSS'],
      workEnvironment: ['Văn phòng SOC 24/7', 'Hybrid', 'Remote (bug bounty)'],
    },
    roadmap: [
      { stage: 'Năm 1-2', title: 'SOC Analyst / Junior Pentester', duration: '2 năm', description: 'Monitor SIEM, phản hồi alert, scan vuln', salary: '18-25 triệu' },
      { stage: 'Năm 3-5', title: 'Senior Pentester / Threat Hunter', duration: '3 năm', description: 'Red team, viết report cho CIO, lead pentest', salary: '40-60 triệu' },
      { stage: 'Năm 6-10', title: 'CISO / Security Architect', duration: '4-5 năm', description: 'Định hướng chiến lược security toàn DN', salary: '100-200 triệu' },
    ],
    pros: ['Lương CAO NHẤT ngành IT', 'Thị trường THIẾU HỤT (job dễ tìm)', 'Bug bounty kiếm thêm $$', 'Tự do (làm remote/freelance được)'],
    cons: ['Áp lực 24/7 (incident có thể đến giữa đêm)', 'Học không ngừng (lỗ hổng mới hằng tuần)', 'Trách nhiệm pháp lý cao', 'Burnout cao'],
    suitablePersonalities: ['INTJ', 'INTP', 'ISTJ', 'ENTP'],
    suitableHolland: ['I', 'R', 'C'],
    relatedCareers: ['ky-su-phan-mem', 'nha-khoa-hoc-du-lieu', 'nha-nghien-cuu-ai'],
    importantSubjects: [
      { name: 'Tin học', importance: 'Rất quan trọng' },
      { name: 'Toán', importance: 'Rất quan trọng' },
      { name: 'Tiếng Anh', importance: 'Rất quan trọng' },
      { name: 'Vật lý', importance: 'Hữu ích' },
    ],
    dailyLife: [
      '8:00 - Check SIEM dashboard, đọc threat intel',
      '9:30 - Triage 50+ security alerts',
      '11:00 - Pentest web app khách hàng',
      '14:00 - Viết PoC + báo cáo lỗ hổng',
      '16:00 - Họp với dev team về vá CVE',
      '18:00 - Theo dõi bug bounty platforms',
    ],
    aiExposure: {
      score: 4,
      trend: 'Tăng',
      analysis: 'AI là CON DAO HAI LƯỠI: hacker dùng AI tấn công nhanh hơn → cần thêm AI defender. AI Copilot (Microsoft Security Copilot, Anthropic) giúp analyst phân tích log nhanh, NHƯNG quyết định cuối + sáng tạo trong pentest vẫn cần con người. Nghề này CÀNG cần thiết khi AI bùng nổ.',
    },
  },
}

// Helper function để tìm kiếm career theo tên (fuzzy match)
export function findCareerByName(name: string): CareerDetail | null {
  const normalized = name.toLowerCase().trim()

  // Direct ID match
  for (const [id, career] of Object.entries(careerDetails)) {
    if (id === normalized) return career
  }

  // Name match
  for (const career of Object.values(careerDetails)) {
    if (career.name.toLowerCase() === normalized) return career
  }

  // Partial match
  for (const career of Object.values(careerDetails)) {
    if (
      career.name.toLowerCase().includes(normalized) ||
      normalized.includes(career.name.toLowerCase())
    )
      return career
  }

  // Keyword match - toàn bộ 25 careers
  const keywords: Record<string, string> = {
    // Công nghệ
    'phần mềm': 'ky-su-phan-mem',
    'lập trình': 'ky-su-phan-mem',
    'developer': 'ky-su-phan-mem',
    'software': 'ky-su-phan-mem',
    'game': 'ky-su-phan-mem',
    'devops': 'ky-su-phan-mem',
    'lập trình viên': 'ky-su-phan-mem',
    'thợ lập trình': 'ky-su-phan-mem',
    'kỹ thuật viên it': 'ky-su-phan-mem',
    'quản trị mạng': 'ky-su-phan-mem',
    'data': 'nha-khoa-hoc-du-lieu',
    'dữ liệu': 'nha-khoa-hoc-du-lieu',
    'khoa học dữ liệu': 'nha-khoa-hoc-du-lieu',
    'data scientist': 'nha-khoa-hoc-du-lieu',
    'thống kê': 'nha-khoa-hoc-du-lieu',
    'ai': 'nha-nghien-cuu-ai',
    'trí tuệ nhân tạo': 'nha-nghien-cuu-ai',
    'machine learning': 'nha-nghien-cuu-ai',
    'kỹ sư ai': 'nha-nghien-cuu-ai',
    'nghiên cứu': 'nha-nghien-cuu-ai',
    'nhà khoa học': 'nha-nghien-cuu-ai',
    'giáo sư': 'nha-nghien-cuu-ai',
    'nhà phát minh': 'nha-nghien-cuu-ai',
    'toán học': 'nha-nghien-cuu-ai',
    // Kiến trúc & Xây dựng
    'kiến trúc': 'kien-truc-su',
    'architect': 'kien-truc-su',
    'nội thất': 'kien-truc-su',
    // Y tế
    'bác sĩ': 'bac-si',
    'y khoa': 'bac-si',
    'doctor': 'bac-si',
    'nha sĩ': 'bac-si',
    'phẫu thuật': 'bac-si',
    'y tá': 'y-ta',
    'điều dưỡng': 'y-ta',
    'nurse': 'y-ta',
    'dược': 'duoc-si',
    'pharmacist': 'duoc-si',
    // Giáo dục
    'giáo viên': 'giao-vien',
    'sư phạm': 'giao-vien',
    'teacher': 'giao-vien',
    'hiệu trưởng': 'giao-vien',
    'training': 'giao-vien',
    'mầm non': 'giao-vien',
    'tiểu học': 'giao-vien',
    'giáo dục': 'giao-vien',
    // Kinh doanh
    'doanh nhân': 'doanh-nhan',
    'khởi nghiệp': 'doanh-nhan',
    'startup': 'doanh-nhan',
    'ceo': 'doanh-nhan',
    'giám đốc': 'doanh-nhan',
    'chiến lược': 'doanh-nhan',
    'sales': 'doanh-nhan',
    'kinh doanh': 'doanh-nhan',
    'vận động viên': 'doanh-nhan',
    'nhà môi giới': 'doanh-nhan',
    'chính trị': 'doanh-nhan',
    // Tâm lý
    'tâm lý': 'nha-tam-ly',
    'psychologist': 'nha-tam-ly',
    'trị liệu': 'nha-tam-ly',
    // Pháp luật
    'luật': 'luat-su',
    'lawyer': 'luat-su',
    'biện hộ': 'luat-su',
    // Tài chính
    'kế toán': 'ke-toan',
    'accountant': 'ke-toan',
    'kiểm toán': 'ke-toan',
    'ngân hàng': 'nhan-vien-ngan-hang',
    'tài chính': 'nhan-vien-ngan-hang',
    'banking': 'nhan-vien-ngan-hang',
    'finance': 'nhan-vien-ngan-hang',
    'logistics': 'nhan-vien-ngan-hang',
    // Thiết kế & UX
    'ux': 'ux-designer',
    'ui': 'ux-designer',
    // Content & Marketing
    'content': 'content-creator',
    'marketing': 'content-creator',
    'social media': 'content-creator',
    'pr': 'content-creator',
    // Viết & Báo chí
    'nhà văn': 'nha-van',
    'báo chí': 'nha-van',
    'journalist': 'nha-van',
    'writer': 'nha-van',
    'nhà báo': 'nha-van',
    // Quản lý
    'quản lý dự án': 'quan-ly-du-an',
    'product manager': 'quan-ly-du-an',
    'pm': 'quan-ly-du-an',
    'nhân sự': 'quan-ly-du-an',
    'hr': 'quan-ly-du-an',
    'tuyển dụng': 'quan-ly-du-an',
    // Kỹ thuật
    'cơ khí': 'ky-su-co-khi',
    'mechanical': 'ky-su-co-khi',
    'kỹ thuật viên': 'ky-su-co-khi',
    'xây dựng': 'ky-su-co-khi',
    // Thiết kế sáng tạo
    'thời trang': 'nha-thiet-ke',
    'fashion': 'nha-thiet-ke',
    'đồ họa': 'nha-thiet-ke',
    'graphic': 'nha-thiet-ke',
    'nhiếp ảnh': 'nha-thiet-ke',
    'designer': 'nha-thiet-ke',
    'design': 'nha-thiet-ke',
    // Hàng không
    'phi công': 'phi-cong',
    'pilot': 'phi-cong',
    // === 5 NEW CAREERS ===
    // Nghệ sĩ biểu diễn
    'diễn viên': 'nghe-si-bieu-dien',
    'mc': 'nghe-si-bieu-dien',
    'người dẫn chương trình': 'nghe-si-bieu-dien',
    'nghệ sĩ': 'nghe-si-bieu-dien',
    'ca sĩ': 'nghe-si-bieu-dien',
    'nhạc sĩ': 'nghe-si-bieu-dien',
    'đạo diễn': 'nghe-si-bieu-dien',
    'sân khấu': 'nghe-si-bieu-dien',
    'biểu diễn': 'nghe-si-bieu-dien',
    // Du lịch & Khách sạn
    'khách sạn': 'quan-ly-du-lich-khach-san',
    'du lịch': 'quan-ly-du-lich-khach-san',
    'hướng dẫn viên': 'quan-ly-du-lich-khach-san',
    'hospitality': 'quan-ly-du-lich-khach-san',
    'resort': 'quan-ly-du-lich-khach-san',
    'event planner': 'quan-ly-du-lich-khach-san',
    'sự kiện': 'quan-ly-du-lich-khach-san',
    // Đầu bếp
    'đầu bếp': 'dau-bep',
    'nấu ăn': 'dau-bep',
    'ẩm thực': 'dau-bep',
    'chef': 'dau-bep',
    'f&b': 'dau-bep',
    // Nhân viên xã hội
    'xã hội': 'nhan-vien-xa-hoi',
    'nhân viên xã hội': 'nhan-vien-xa-hoi',
    'social worker': 'nhan-vien-xa-hoi',
    'cộng đồng': 'nhan-vien-xa-hoi',
    'nông nghiệp': 'nhan-vien-xa-hoi',
    // Quân nhân / Cảnh sát
    'quân đội': 'quan-nhan-canh-sat',
    'quân nhân': 'quan-nhan-canh-sat',
    'sĩ quan': 'quan-nhan-canh-sat',
    'cảnh sát': 'quan-nhan-canh-sat',
    'công an': 'quan-nhan-canh-sat',
    'an ninh': 'quan-nhan-canh-sat',
    'cứu hỏa': 'quan-nhan-canh-sat',
    'lính cứu hỏa': 'quan-nhan-canh-sat',
    'huấn luyện viên': 'quan-nhan-canh-sat',
    'thể thao': 'quan-nhan-canh-sat',
    // Ngoại giao / Pháp lý → Luật sư
    'ngoại giao': 'luat-su',
    'đại sứ': 'luat-su',
    'chuyên viên pháp lý': 'luat-su',
    'pháp lý': 'luat-su',
    'thẩm phán': 'luat-su',
    // Truyền thông / Media → Nhà văn / Nhà báo
    'truyền thông': 'nha-van',
    'blogger': 'nha-van',
    'podcaster': 'nha-van',
    // Kỹ sư khác → Kỹ sư phần mềm (generic mapping)
    'kỹ sư điện': 'ky-su-phan-mem',
    'kỹ sư môi trường': 'ky-su-phan-mem',
    // Sinh học / Thú y → Bác sĩ
    'sinh học': 'bac-si',
    'nhà sinh học': 'bac-si',
    'thú y': 'bac-si',
    // Đầu tư / Trading → Tài chính
    'nhà đầu tư': 'nhan-vien-ngan-hang',
    'trader': 'nhan-vien-ngan-hang',
    'đầu tư': 'nhan-vien-ngan-hang',
    // Scrum → Quản lý dự án
    'scrum master': 'quan-ly-du-an',
    'scrum': 'quan-ly-du-an',
    'agile': 'quan-ly-du-an',
    // Generic catch-all (phải ở cuối)
    'quản lý': 'quan-ly-du-an',
    'dự án': 'quan-ly-du-an',
    'event': 'quan-ly-du-lich-khach-san',
    'thư ký': 'quan-ly-du-an',
  }

  for (const [keyword, id] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) return careerDetails[id] || null
  }

  return null
}

// Get all career names for listing
export function getAllCareerNames(): { id: string; name: string; icon: string; category: string }[] {
  return Object.values(careerDetails).map(c => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    category: c.category,
  }))
}

