/**
 * Dữ liệu bài kiểm tra tính cách - Phong cách 16Personalities
 * Kết hợp MBTI + Holland Career Interests + Strengths
 */

export interface TestQuestion {
  id: number
  text: string
  dimension: MBTIDimension | HollandDimension
  positive: boolean // true = agree maps to first letter of dimension
}

export type MBTIDimension = 'EI' | 'SN' | 'TF' | 'JP'
export type HollandDimension = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

export interface PersonalityResult {
  mbtiType: string
  mbtiScores: Record<string, number>
  hollandCode: string
  hollandScores: Record<string, number>
  personalityName: string
  personalityEmoji: string
  description: string
  strengths: string[]
  weaknesses: string[]
  careers: string[]
  learningStyle: string
  famousPeople: string[]
}

// ===== MBTI QUESTIONS (28 câu, 7 mỗi dimension) =====
export const mbtiQuestions: TestQuestion[] = [
  // E vs I (Hướng ngoại vs Hướng nội)
  { id: 1, text: "Bạn cảm thấy tràn đầy năng lượng sau khi tham gia một buổi tiệc đông người.", dimension: 'EI', positive: true },
  { id: 2, text: "Bạn thường chủ động bắt chuyện với người lạ.", dimension: 'EI', positive: true },
  { id: 3, text: "Bạn thích làm việc nhóm hơn làm việc một mình.", dimension: 'EI', positive: true },
  { id: 4, text: "Bạn cần thời gian ở một mình để \"sạc lại pin\" sau khi giao tiếp nhiều.", dimension: 'EI', positive: false },
  { id: 5, text: "Bạn thường suy nghĩ kỹ trước khi phát biểu trong lớp.", dimension: 'EI', positive: false },
  { id: 6, text: "Bạn có ít bạn thân nhưng mối quan hệ rất sâu sắc.", dimension: 'EI', positive: false },
  { id: 7, text: "Bạn thường là người hoạt ngôn trong nhóm bạn.", dimension: 'EI', positive: true },

  // S vs N (Thực tế vs Trực giác)
  { id: 8, text: "Bạn thích học những kiến thức có thể áp dụng ngay vào thực tế.", dimension: 'SN', positive: true },
  { id: 9, text: "Bạn chú ý đến chi tiết hơn là bức tranh tổng thể.", dimension: 'SN', positive: true },
  { id: 10, text: "Bạn tin vào kinh nghiệm thực tế hơn lý thuyết suông.", dimension: 'SN', positive: true },
  { id: 11, text: "Bạn thường mơ mộng về tương lai và các khả năng chưa xảy ra.", dimension: 'SN', positive: false },
  { id: 12, text: "Bạn thích các bài toán đòi hỏi tư duy sáng tạo hơn bài toán áp dụng công thức.", dimension: 'SN', positive: false },
  { id: 13, text: "Bạn hay nhìn thấy những mô hình và kết nối ẩn giữa các sự vật.", dimension: 'SN', positive: false },
  { id: 14, text: "Bạn thích làm theo hướng dẫn từng bước rõ ràng.", dimension: 'SN', positive: true },

  // T vs F (Lý trí vs Cảm xúc)
  { id: 15, text: "Khi tranh luận, bạn ưu tiên logic hơn cảm xúc.", dimension: 'TF', positive: true },
  { id: 16, text: "Bạn đánh giá cao sự công bằng hơn sự thông cảm.", dimension: 'TF', positive: true },
  { id: 17, text: "Bạn dễ dàng đưa ra quyết định khó mà không bị ảnh hưởng bởi cảm xúc.", dimension: 'TF', positive: true },
  { id: 18, text: "Bạn thường suy nghĩ về cảm xúc của người khác trước khi hành động.", dimension: 'TF', positive: false },
  { id: 19, text: "Bạn dễ bị ảnh hưởng bởi câu chuyện buồn của người khác.", dimension: 'TF', positive: false },
  { id: 20, text: "Trong nhóm, bạn quan tâm đến việc mọi người hòa thuận hơn hiệu quả công việc.", dimension: 'TF', positive: false },
  { id: 21, text: "Bạn thích phân tích dữ liệu và số liệu để ra quyết định.", dimension: 'TF', positive: true },

  // J vs P (Nguyên tắc vs Linh hoạt)
  { id: 22, text: "Bạn thích lập kế hoạch chi tiết trước khi bắt đầu một dự án.", dimension: 'JP', positive: true },
  { id: 23, text: "Bạn cảm thấy khó chịu khi mọi thứ không theo đúng kế hoạch.", dimension: 'JP', positive: true },
  { id: 24, text: "Bạn thường hoàn thành bài tập sớm thay vì để sát deadline.", dimension: 'JP', positive: true },
  { id: 25, text: "Bạn thích sự linh hoạt và tự do trong cách làm việc.", dimension: 'JP', positive: false },
  { id: 26, text: "Bạn dễ dàng thay đổi kế hoạch nếu có ý tưởng tốt hơn.", dimension: 'JP', positive: false },
  { id: 27, text: "Bạn thường làm tốt nhất khi có áp lực deadline.", dimension: 'JP', positive: false },
  { id: 28, text: "Bạn thích sắp xếp không gian học tập gọn gàng, ngăn nắp.", dimension: 'JP', positive: true },
]

// ===== HOLLAND CAREER INTEREST QUESTIONS (18 câu, 3 mỗi type) =====
export const hollandQuestions: TestQuestion[] = [
  // R - Realistic (Thực tế)
  { id: 29, text: "Bạn thích tháo lắp và sửa chữa đồ vật, máy móc.", dimension: 'R', positive: true },
  { id: 30, text: "Bạn thích các hoạt động ngoài trời, thể thao, hoặc làm việc tay chân.", dimension: 'R', positive: true },
  { id: 31, text: "Bạn thích làm việc với công cụ, dụng cụ hoặc phần cứng máy tính.", dimension: 'R', positive: true },

  // I - Investigative (Nghiên cứu)
  { id: 32, text: "Bạn thích tìm hiểu vì sao mọi thứ hoạt động.", dimension: 'I', positive: true },
  { id: 33, text: "Bạn say mê giải các bài toán phức tạp hoặc câu đố logic.", dimension: 'I', positive: true },
  { id: 34, text: "Bạn thích đọc sách khoa học và nghiên cứu chủ đề mới.", dimension: 'I', positive: true },

  // A - Artistic (Nghệ thuật)
  { id: 35, text: "Bạn thích vẽ, thiết kế, hoặc tạo ra tác phẩm sáng tạo.", dimension: 'A', positive: true },
  { id: 36, text: "Bạn có trí tưởng tượng phong phú và thích thể hiện ý tưởng.", dimension: 'A', positive: true },
  { id: 37, text: "Bạn thích nghe nhạc, xem phim, hoặc tham gia hoạt động nghệ thuật.", dimension: 'A', positive: true },

  // S - Social (Xã hội)
  { id: 38, text: "Bạn thích giúp đỡ, dạy kèm hoặc tư vấn cho bạn bè.", dimension: 'S', positive: true },
  { id: 39, text: "Bạn thấy hạnh phúc khi làm việc vì cộng đồng.", dimension: 'S', positive: true },
  { id: 40, text: "Bạn giỏi lắng nghe và thấu hiểu người khác.", dimension: 'S', positive: true },

  // E - Enterprising (Kinh doanh)
  { id: 41, text: "Bạn thích thuyết phục người khác theo ý kiến của mình.", dimension: 'E', positive: true },
  { id: 42, text: "Bạn mơ ước trở thành lãnh đạo hoặc khởi nghiệp.", dimension: 'E', positive: true },
  { id: 43, text: "Bạn thích cạnh tranh và đặt mục tiêu cao.", dimension: 'E', positive: true },

  // C - Conventional (Quy tắc)
  { id: 44, text: "Bạn thích công việc có quy trình rõ ràng, ổn định.", dimension: 'C', positive: true },
  { id: 45, text: "Bạn giỏi sắp xếp, phân loại và quản lý thông tin.", dimension: 'C', positive: true },
  { id: 46, text: "Bạn thích làm việc với số liệu, bảng tính và dữ liệu.", dimension: 'C', positive: true },
]

export const allQuestions = [...mbtiQuestions, ...hollandQuestions]

// ===== 16 PERSONALITY TYPE DESCRIPTIONS =====
export const personalityTypes: Record<string, Omit<PersonalityResult, 'mbtiType' | 'mbtiScores' | 'hollandCode' | 'hollandScores'>> = {
  'INTJ': {
    personalityName: 'Nhà Chiến Lược',
    personalityEmoji: '🏗️',
    description: 'Tư duy chiến lược, độc lập, tham vọng. Bạn luôn có kế hoạch dài hạn và biết cách biến tầm nhìn thành hiện thực. Bạn đánh giá cao kiến thức và năng lực.',
    strengths: ['Tư duy chiến lược', 'Độc lập', 'Kiên định', 'Tự tin'],
    weaknesses: ['Có thể quá khắt khe', 'Khó thể hiện cảm xúc', 'Thiếu kiên nhẫn với người chậm hiểu'],
    careers: ['Kỹ sư phần mềm', 'Nhà khoa học dữ liệu', 'Kiến trúc sư', 'Nhà nghiên cứu AI', 'Quản lý dự án CNTT', 'Giám đốc chiến lược'],
    learningStyle: 'Thích học một mình, nghiên cứu sâu, có hệ thống',
    famousPeople: ['Elon Musk', 'Mark Zuckerberg', 'Isaac Newton'],
  },
  'INTP': {
    personalityName: 'Nhà Logic Học',
    personalityEmoji: '🔬',
    description: 'Tò mò vô hạn, sáng tạo trong tư duy, yêu thích phân tích. Bạn có khả năng nhìn thấy các mô hình mà người khác bỏ qua.',
    strengths: ['Tư duy phân tích', 'Sáng tạo', 'Cởi mở', 'Khách quan'],
    weaknesses: ['Hay trì hoãn', 'Không giỏi giao tiếp xã hội', 'Có thể quá lý tưởng hóa'],
    careers: ['Nhà nghiên cứu', 'Lập trình viên', 'Nhà toán học', 'Kỹ sư AI', 'Giáo sư đại học', 'Game developer'],
    learningStyle: 'Thích khám phá, thử nghiệm, tự tìm tòi kiến thức',
    famousPeople: ['Albert Einstein', 'Bill Gates', 'Marie Curie'],
  },
  'ENTJ': {
    personalityName: 'Nhà Chỉ Huy',
    personalityEmoji: '👑',
    description: 'Người lãnh đạo bẩm sinh, quyết đoán, hiệu quả. Bạn có khả năng tổ chức và thúc đẩy người khác hướng đến mục tiêu chung.',
    strengths: ['Lãnh đạo', 'Quyết đoán', 'Tự tin', 'Hiệu quả'],
    weaknesses: ['Có thể áp đặt', 'Thiếu kiên nhẫn', 'Quá tập trung vào kết quả'],
    careers: ['CEO/Giám đốc', 'Luật sư', 'Quản lý doanh nghiệp', 'Nhà tư vấn chiến lược', 'Chính trị gia', 'Doanh nhân'],
    learningStyle: 'Thích thách thức, tranh luận, áp dụng kiến thức vào thực tế',
    famousPeople: ['Steve Jobs', 'Napoleon Bonaparte', 'Margaret Thatcher'],
  },
  'ENTP': {
    personalityName: 'Nhà Tranh Luận',
    personalityEmoji: '💡',
    description: 'Thông minh, sáng tạo, thích thách thức truyền thống. Bạn luôn tìm cách cải tiến mọi thứ và không ngại đặt câu hỏi.',
    strengths: ['Sáng tạo', 'Nhanh trí', 'Linh hoạt', 'Thuyết phục'],
    weaknesses: ['Dễ chán', 'Hay tranh cãi', 'Có thể thiếu kiên trì'],
    careers: ['Doanh nhân startup', 'Nhà phát minh', 'Marketing sáng tạo', 'Nhà báo', 'Luật sư biện hộ', 'Product Manager'],
    learningStyle: 'Thích thảo luận, brainstorm, học qua tranh luận',
    famousPeople: ['Leonardo da Vinci', 'Thomas Edison', 'Socrates'],
  },
  'INFJ': {
    personalityName: 'Người Che Chở',
    personalityEmoji: '🌟',
    description: 'Nhạy cảm, sâu sắc, luôn muốn giúp đỡ người khác. Bạn có trực giác mạnh mẽ và tầm nhìn lý tưởng về thế giới.',
    strengths: ['Trực giác sâu sắc', 'Kiên trì', 'Sáng tạo', 'Quyết tâm'],
    weaknesses: ['Quá lý tưởng hóa', 'Dễ kiệt sức', 'Cầu toàn'],
    careers: ['Nhà tâm lý', 'Giáo viên', 'Nhà văn', 'Bác sĩ', 'Nhân viên xã hội', 'UX Designer'],
    learningStyle: 'Thích tìm ý nghĩa sâu xa, học qua kết nối cảm xúc',
    famousPeople: ['Martin Luther King Jr.', 'Nelson Mandela', 'Mahatma Gandhi'],
  },
  'INFP': {
    personalityName: 'Người Trung Gian',
    personalityEmoji: '🦋',
    description: 'Lý tưởng, giàu trí tưởng tượng, luôn tìm kiếm cái đẹp và ý nghĩa. Bạn có tâm hồn nghệ sĩ và muốn sống đúng với giá trị của mình.',
    strengths: ['Sáng tạo', 'Đồng cảm', 'Lý tưởng', 'Trung thành'],
    weaknesses: ['Quá nhạy cảm', 'Khó thực tế', 'Hay trì hoãn'],
    careers: ['Nhà văn', 'Nhà thiết kế', 'Tâm lý trị liệu', 'Nghệ sĩ', 'Giáo viên nghệ thuật', 'Content Creator'],
    learningStyle: 'Thích học qua câu chuyện, tạo kết nối cá nhân với kiến thức',
    famousPeople: ['William Shakespeare', 'J.R.R. Tolkien', 'Princess Diana'],
  },
  'ENFJ': {
    personalityName: 'Người Cho Đi',
    personalityEmoji: '🌈',
    description: 'Nhiệt tình, truyền cảm hứng, quan tâm đến người khác. Bạn có khả năng kết nối và truyền động lực cho mọi người.',
    strengths: ['Lãnh đạo truyền cảm hứng', 'Đồng cảm', 'Tổ chức', 'Đáng tin'],
    weaknesses: ['Quá hy sinh bản thân', 'Nhạy cảm với chỉ trích', 'Lý tưởng hóa người khác'],
    careers: ['Giáo viên', 'Nhà quản lý nhân sự', 'MC/Người dẫn chương trình', 'Nhà tâm lý', 'Quản lý sự kiện', 'Training Manager'],
    learningStyle: 'Thích học nhóm, giúp đỡ bạn bè, thảo luận',
    famousPeople: ['Barack Obama', 'Oprah Winfrey', 'Martin Luther King Jr.'],
  },
  'ENFP': {
    personalityName: 'Người Truyền Cảm Hứng',
    personalityEmoji: '🎆',
    description: 'Nhiệt huyết, sáng tạo, yêu thích tự do. Bạn có khả năng nhìn thấy tiềm năng trong mọi thứ và truyền cảm hứng cho người khác.',
    strengths: ['Nhiệt tình', 'Sáng tạo', 'Giao tiếp tốt', 'Linh hoạt'],
    weaknesses: ['Dễ mất tập trung', 'Quá lạc quan', 'Khó cam kết lâu dài'],
    careers: ['Nhà báo', 'Content Creator', 'Marketing', 'Nhà tâm lý', 'Diễn viên', 'Khởi nghiệp sáng tạo'],
    learningStyle: 'Thích học qua trải nghiệm, dự án sáng tạo, brainstorm',
    famousPeople: ['Robin Williams', 'Walt Disney', 'Robert Downey Jr.'],
  },
  'ISTJ': {
    personalityName: 'Nhà Hậu Cần',
    personalityEmoji: '📋',
    description: 'Đáng tin cậy, có trách nhiệm, chi tiết. Bạn là người mà ai cũng muốn có trong đội vì sự tận tâm và chính xác.',
    strengths: ['Đáng tin cậy', 'Có tổ chức', 'Kiên nhẫn', 'Chính xác'],
    weaknesses: ['Cứng nhắc', 'Khó thay đổi', 'Quá tập trung vào quy tắc'],
    careers: ['Kế toán', 'Kiểm toán viên', 'Kỹ sư xây dựng', 'Quân đội', 'Luật sư công ty', 'Quản lý hệ thống'],
    learningStyle: 'Thích học có hệ thống, từng bước, ghi chép cẩn thận',
    famousPeople: ['George Washington', 'Angela Merkel', 'Warren Buffett'],
  },
  'ISFJ': {
    personalityName: 'Người Bảo Vệ',
    personalityEmoji: '🛡️',
    description: 'Tận tâm, ấm áp, bảo vệ những người thân yêu. Bạn luôn sẵn sàng giúp đỡ và ghi nhớ mọi chi tiết về người quan trọng.',
    strengths: ['Tận tâm', 'Đáng tin', 'Kiên nhẫn', 'Chu đáo'],
    weaknesses: ['Quá hy sinh', 'Ngại thay đổi', 'Hay lo lắng'],
    careers: ['Y tá', 'Bác sĩ', 'Giáo viên tiểu học', 'Nhân viên xã hội', 'Thư ký', 'Dược sĩ'],
    learningStyle: 'Thích học qua ví dụ thực tế, ghi chép, ôn tập đều đặn',
    famousPeople: ['Beyoncé', 'Kate Middleton', 'Halle Berry'],
  },
  'ESTJ': {
    personalityName: 'Nhà Điều Hành',
    personalityEmoji: '⚡',
    description: 'Tổ chức, quyết đoán, trung thành với truyền thống. Bạn biết cách điều hành mọi thứ hiệu quả và tạo trật tự.',
    strengths: ['Tổ chức', 'Quyết đoán', 'Trung thực', 'Có kỷ luật'],
    weaknesses: ['Cứng nhắc', 'Hay phán xét', 'Khó chấp nhận ý kiến khác'],
    careers: ['Quản lý', 'Sĩ quan quân đội', 'Luật sư', 'Giám đốc tài chính', 'Quản lý dự án', 'Hiệu trưởng'],
    learningStyle: 'Thích bài giảng có cấu trúc, deadline rõ ràng, thi đua',
    famousPeople: ['Henry Ford', 'Sonia Sotomayor', 'Frank Sinatra'],
  },
  'ESFJ': {
    personalityName: 'Nhà Ngoại Giao',
    personalityEmoji: '🤝',
    description: 'Hòa đồng, quan tâm, tận tâm với cộng đồng. Bạn tạo ra bầu không khí ấm áp và kết nối mọi người.',
    strengths: ['Hòa đồng', 'Quan tâm', 'Tổ chức', 'Trung thành'],
    weaknesses: ['Quá quan tâm người khác', 'Nhạy cảm với chỉ trích', 'Hay lo lắng'],
    careers: ['Y tá', 'Giáo viên', 'Nhân viên PR', 'Quản lý khách sạn', 'Event Planner', 'Nhân viên tuyển dụng'],
    learningStyle: 'Thích học nhóm, thảo luận, giúp đỡ bạn bè cùng tiến bộ',
    famousPeople: ['Taylor Swift', 'Jennifer Garner', 'Ed Sheeran'],
  },
  'ISTP': {
    personalityName: 'Nhà Thủ Công',
    personalityEmoji: '🔧',
    description: 'Khéo léo, thực tế, bình tĩnh trong mọi tình huống. Bạn thích tìm hiểu cách mọi thứ hoạt động và sửa chữa chúng.',
    strengths: ['Thực tế', 'Linh hoạt', 'Bình tĩnh', 'Khéo tay'],
    weaknesses: ['Khó cam kết', 'Lạnh lùng', 'Hay chấp nhận rủi ro'],
    careers: ['Kỹ sư cơ khí', 'Phi công', 'Bác sĩ phẫu thuật', 'Thợ lập trình', 'Kỹ thuật viên', 'DevOps Engineer'],
    learningStyle: 'Thích học qua thực hành, tháo lắp, thử nghiệm trực tiếp',
    famousPeople: ['Bear Grylls', 'Bruce Lee', 'Amelia Earhart'],
  },
  'ISFP': {
    personalityName: 'Nhà Phiêu Lưu',
    personalityEmoji: '🎨',
    description: 'Nhạy cảm, sáng tạo, yêu thích tự do và cái đẹp. Bạn sống đúng với cảm xúc và tạo ra vẻ đẹp trong cuộc sống.',
    strengths: ['Sáng tạo', 'Nhạy cảm', 'Linh hoạt', 'Lạc quan'],
    weaknesses: ['Dễ bị stress', 'Khó lập kế hoạch', 'Quá nhạy cảm'],
    careers: ['Nhà thiết kế thời trang', 'Nhiếp ảnh gia', 'Đầu bếp', 'Nhạc sĩ', 'Kiến trúc sư nội thất', 'UI Designer'],
    learningStyle: 'Thích học qua trải nghiệm thẩm mỹ, sáng tạo, thực hành',
    famousPeople: ['Bob Ross', 'Michael Jackson', 'Frida Kahlo'],
  },
  'ESTP': {
    personalityName: 'Nhà Kinh Doanh',
    personalityEmoji: '🚀',
    description: 'Năng động, thực tế, thích mạo hiểm. Bạn sống trong hiện tại và biết cách nắm bắt cơ hội.',
    strengths: ['Năng động', 'Thuyết phục', 'Nhanh nhẹn', 'Tự tin'],
    weaknesses: ['Thiếu kiên nhẫn', 'Bốc đồng', 'Hay chán'],
    careers: ['Doanh nhân', 'Sales Manager', 'Vận động viên', 'Cảnh sát', 'Nhà môi giới', 'Marketing Director'],
    learningStyle: 'Thích học qua hành động, cạnh tranh, trải nghiệm thực tế',
    famousPeople: ['Donald Trump', 'Ernest Hemingway', 'Madonna'],
  },
  'ESFP': {
    personalityName: 'Người Biểu Diễn',
    personalityEmoji: '🎭',
    description: 'Vui vẻ, tự phát, yêu thích sân khấu. Bạn lan tỏa năng lượng tích cực và biết cách khiến mọi người vui vẻ.',
    strengths: ['Vui vẻ', 'Hào phóng', 'Thực tế', 'Linh hoạt'],
    weaknesses: ['Dễ mất tập trung', 'Tránh xung đột', 'Quá lạc quan'],
    careers: ['Diễn viên', 'MC', 'Hướng dẫn viên du lịch', 'Giáo viên mầm non', 'Event Planner', 'Social Media Manager'],
    learningStyle: 'Thích học vui vẻ, tương tác, ít lý thuyết, nhiều thực hành',
    famousPeople: ['Marilyn Monroe', 'Jamie Oliver', 'Adele'],
  },
}

// ===== HOLLAND CODE TO CAREER MAPPING =====
export const hollandCareers: Record<string, { name: string, careers: string[], description: string }> = {
  'R': {
    name: 'Thực tế (Realistic)',
    description: 'Thích làm việc với đồ vật, máy móc, dụng cụ, động thực vật',
    careers: ['Kỹ sư cơ khí', 'Kiến trúc sư', 'Nha sĩ', 'Kỹ thuật viên IT', 'Phi công', 'Nông nghiệp công nghệ cao'],
  },
  'I': {
    name: 'Nghiên cứu (Investigative)',
    description: 'Thích quan sát, nghiên cứu, phân tích, đánh giá',
    careers: ['Nhà khoa học', 'Bác sĩ', 'Kỹ sư phần mềm', 'Data Scientist', 'Dược sĩ', 'Nhà nghiên cứu AI'],
  },
  'A': {
    name: 'Nghệ thuật (Artistic)',
    description: 'Thích sáng tạo, biểu diễn, thiết kế, viết lách',
    careers: ['Nhà thiết kế', 'Nhà văn', 'Kiến trúc sư', 'Đạo diễn', 'Nhiếp ảnh gia', 'UI/UX Designer'],
  },
  'S': {
    name: 'Xã hội (Social)',
    description: 'Thích giúp đỡ, dạy học, tư vấn, chữa bệnh',
    careers: ['Giáo viên', 'Bác sĩ', 'Nhà tâm lý', 'Nhân viên xã hội', 'Y tá', 'HR Manager'],
  },
  'E': {
    name: 'Kinh doanh (Enterprising)',
    description: 'Thích lãnh đạo, thuyết phục, quản lý, bán hàng',
    careers: ['CEO', 'Luật sư', 'Doanh nhân', 'Quản lý', 'Marketing Director', 'Sales Manager'],
  },
  'C': {
    name: 'Quy tắc (Conventional)',
    description: 'Thích tổ chức, quản lý dữ liệu, vận hành hệ thống',
    careers: ['Kế toán', 'Kiểm toán', 'Quản trị mạng', 'Thống kê', 'Ngân hàng', 'Logistics'],
  },
}

// ===== RESULT CALCULATION =====
export function calculateResults(answers: Record<number, number>): PersonalityResult {
  // Calculate MBTI scores
  const mbtiDimensions: Record<MBTIDimension, { first: number, second: number }> = {
    'EI': { first: 0, second: 0 }, // E vs I
    'SN': { first: 0, second: 0 }, // S vs N
    'TF': { first: 0, second: 0 }, // T vs F
    'JP': { first: 0, second: 0 }, // J vs P
  }

  mbtiQuestions.forEach(q => {
    const answer = answers[q.id] ?? 4 // default neutral
    const dim = q.dimension as MBTIDimension
    if (q.positive) {
      // High answer (6-7) = supports first letter, Low (1-2) = supports second letter
      mbtiDimensions[dim].first += answer
      mbtiDimensions[dim].second += (8 - answer)
    } else {
      mbtiDimensions[dim].second += answer
      mbtiDimensions[dim].first += (8 - answer)
    }
  })

  // Determine MBTI type
  const mbtiType = [
    mbtiDimensions['EI'].first >= mbtiDimensions['EI'].second ? 'E' : 'I',
    mbtiDimensions['SN'].first >= mbtiDimensions['SN'].second ? 'S' : 'N',
    mbtiDimensions['TF'].first >= mbtiDimensions['TF'].second ? 'T' : 'F',
    mbtiDimensions['JP'].first >= mbtiDimensions['JP'].second ? 'J' : 'P',
  ].join('')

  const mbtiScores: Record<string, number> = {
    'E': Math.round(mbtiDimensions['EI'].first / (mbtiDimensions['EI'].first + mbtiDimensions['EI'].second) * 100),
    'I': Math.round(mbtiDimensions['EI'].second / (mbtiDimensions['EI'].first + mbtiDimensions['EI'].second) * 100),
    'S': Math.round(mbtiDimensions['SN'].first / (mbtiDimensions['SN'].first + mbtiDimensions['SN'].second) * 100),
    'N': Math.round(mbtiDimensions['SN'].second / (mbtiDimensions['SN'].first + mbtiDimensions['SN'].second) * 100),
    'T': Math.round(mbtiDimensions['TF'].first / (mbtiDimensions['TF'].first + mbtiDimensions['TF'].second) * 100),
    'F': Math.round(mbtiDimensions['TF'].second / (mbtiDimensions['TF'].first + mbtiDimensions['TF'].second) * 100),
    'J': Math.round(mbtiDimensions['JP'].first / (mbtiDimensions['JP'].first + mbtiDimensions['JP'].second) * 100),
    'P': Math.round(mbtiDimensions['JP'].second / (mbtiDimensions['JP'].first + mbtiDimensions['JP'].second) * 100),
  }

  // Calculate Holland scores
  const hollandScoresRaw: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 }

  hollandQuestions.forEach(q => {
    const answer = answers[q.id] ?? 4
    hollandScoresRaw[q.dimension as string] += answer
  })

  // Normalize to 100
  const maxHolland = 21 // 3 questions × 7 max
  const hollandScores: Record<string, number> = {}
  Object.entries(hollandScoresRaw).forEach(([k, v]) => {
    hollandScores[k] = Math.round((v / maxHolland) * 100)
  })

  // Get top 3 Holland codes
  const sortedHolland = Object.entries(hollandScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const hollandCode = sortedHolland.map(([k]) => k).join('')

  // Get personality type info
  const typeInfo = personalityTypes[mbtiType] || personalityTypes['INTJ']

  return {
    mbtiType,
    mbtiScores,
    hollandCode,
    hollandScores,
    ...typeInfo,
  }
}
