/**
 * soft-skills.ts — Danh sách kỹ năng MỀM chuẩn cho 3 vai trò:
 *   - STUDENT (8 kỹ năng) — HS THCS/THPT
 *   - TEACHER (6 kỹ năng) — đồng bộ với CareerSurvey + ProfessionalKG
 *   - PARENT (4 kỹ năng) — đồng bộ với CareerSurvey
 *
 * KG mỗi vai trò có thêm category "Kỹ năng mềm" với màu rose.
 * Các kỹ năng mềm được liên kết tới:
 *   - Hoạt động lab/dự án/game cần collaboration
 *   - Bài tập thuyết trình, video pitch
 *   - Workshop CPD cho GV
 *   - Buổi tư vấn tâm lý PH-HS
 *
 * Khi user tham gia các hoạt động → KG tự +mastery cho skill mềm liên quan.
 */

export interface SoftSkill {
  id: string
  label: string
  emoji: string
  shortDesc: string
  /** Hoạt động giúp rèn luyện kỹ năng này (HS tham gia → tự lên mastery) */
  activities: string[]
  /** Câu hỏi tự đánh giá cho HS (1 câu Likert 1-5) */
  selfAssessQuestion: string
}

export type Role = 'STUDENT' | 'TEACHER' | 'PARENT'

/** 8 kỹ năng mềm CỐT LÕI cho HS THCS/THPT — chuẩn 21st century skills + GDPT 2018 */
export const STUDENT_SOFT_SKILLS: SoftSkill[] = [
  {
    id: 'ss-comm',
    label: 'Giao tiếp & Thuyết trình',
    emoji: '🗣',
    shortDesc: 'Trình bày ý tưởng rõ ràng, lắng nghe người khác',
    activities: [
      'Thuyết trình dự án trước lớp',
      'Tạo video bài giảng ngắn',
      'Tham gia nhóm thảo luận online',
      'Viết bài blog học tập',
    ],
    selfAssessQuestion: 'Bạn cảm thấy thoải mái khi thuyết trình trước lớp?',
  },
  {
    id: 'ss-collab',
    label: 'Hợp tác nhóm',
    emoji: '🤝',
    shortDesc: 'Làm việc nhóm hiệu quả, chia sẻ trách nhiệm',
    activities: [
      'Dự án STEM nhóm 3-5 bạn',
      'Lab challenge nhóm trên LabTwin',
      'Tạo đề thi nhóm trong Question Bank',
      'Tham gia hackathon nội bộ',
    ],
    selfAssessQuestion: 'Bạn làm việc nhóm tốt và biết chia sẻ trách nhiệm?',
  },
  {
    id: 'ss-critical',
    label: 'Tư duy phản biện',
    emoji: '🧠',
    shortDesc: 'Phân tích, đánh giá thông tin trước khi tin',
    activities: [
      'Phản biện bài viết trên forum lớp',
      'So sánh nhiều nguồn về cùng chủ đề',
      'Làm bài luận có phản biện',
      'Tham gia thảo luận trên KG node',
    ],
    selfAssessQuestion: 'Bạn thường đặt câu hỏi "Vì sao?" khi đọc thông tin mới?',
  },
  {
    id: 'ss-create',
    label: 'Sáng tạo & Đổi mới',
    emoji: '💡',
    shortDesc: 'Tạo ra ý tưởng mới, giải pháp khác biệt',
    activities: [
      'Thiết kế poster vật lý sáng tạo',
      'Game-based learning trong Pixel Odyssey',
      'Lab challenge với cách giải riêng',
      'Đề xuất chủ đề dự án mới',
    ],
    selfAssessQuestion: 'Bạn thích nghĩ ra cách làm khác với hướng dẫn?',
  },
  {
    id: 'ss-problem',
    label: 'Giải quyết vấn đề',
    emoji: '🔧',
    shortDesc: 'Phát hiện vấn đề + tìm giải pháp tối ưu',
    activities: [
      'Lab challenge — debug mạch điện',
      'Bài tập tình huống thực tế',
      'Pentest game cybersecurity',
      'Tham gia STEM Olympiad',
    ],
    selfAssessQuestion: 'Bạn kiên trì thử nhiều cách khi gặp bài khó?',
  },
  {
    id: 'ss-selfmgmt',
    label: 'Tự quản lý & Kỷ luật',
    emoji: '⏰',
    shortDesc: 'Tự lập kế hoạch, quản lý thời gian, hoàn thành đúng hạn',
    activities: [
      'Hoàn thành learning path đúng hạn',
      'Daily streak ≥ 7 ngày liên tục',
      'Tự đặt mục tiêu tuần trong Settings',
      'Lập kế hoạch ôn thi 4 tuần',
    ],
    selfAssessQuestion: 'Bạn tự lập kế hoạch học mà không cần ai nhắc?',
  },
  {
    id: 'ss-emotion',
    label: 'Quản lý cảm xúc',
    emoji: '💝',
    shortDesc: 'Nhận biết + điều chỉnh cảm xúc khi stress / thất vọng',
    activities: [
      'Ghi nhật ký cảm xúc trong Aura',
      'Bài tập mindfulness 5 phút/ngày',
      'Bình tĩnh khi điểm thấp + phân tích nguyên nhân',
      'Hỗ trợ bạn bè khi gặp khó khăn',
    ],
    selfAssessQuestion: 'Bạn giữ được bình tĩnh khi điểm thấp hoặc gặp thất bại?',
  },
  {
    id: 'ss-digital',
    label: 'Năng lực số & An toàn mạng',
    emoji: '🛡',
    shortDesc: 'Dùng AI/tool số có trách nhiệm + bảo vệ thông tin',
    activities: [
      'Hoàn thành khoá LLM Mastery',
      'Dùng AI Tutor đúng mục đích (không gian lận)',
      'Kiểm tra fake news + nguồn tin',
      'Bảo vệ tài khoản (2FA, mật khẩu mạnh)',
    ],
    selfAssessQuestion: 'Bạn dùng AI/Internet có trách nhiệm + an toàn?',
  },
]

/** 6 kỹ năng mềm cho GV — đồng bộ với CareerSurvey + ProfessionalKG */
export const TEACHER_SOFT_SKILLS: SoftSkill[] = [
  {
    id: 'tss-active-listen', label: 'Lắng nghe chủ động', emoji: '👂',
    shortDesc: 'Không cắt lời HS, tóm tắt lại ý, hỏi đào sâu',
    activities: ['Buổi tâm sự 1-1 với HS', 'Workshop coaching giáo viên', 'Dự giờ + ghi nhận từ HS'],
    selfAssessQuestion: 'Bạn thường lặp lại ý HS để chắc đã hiểu đúng?',
  },
  {
    id: 'tss-empathy', label: 'Đồng cảm với học sinh', emoji: '❤',
    shortDesc: 'Hiểu hoàn cảnh, cảm xúc, không phán xét',
    activities: ['Đọc hồ sơ HS trước khi gặp PH', 'Khoá tâm lý học giáo viên', 'Workshop SEL (Social Emotional Learning)'],
    selfAssessQuestion: 'Bạn cố hiểu hoàn cảnh HS trước khi đánh giá thái độ?',
  },
  {
    id: 'tss-public-speak', label: 'Thuyết trình & truyền cảm hứng', emoji: '🎙',
    shortDesc: 'Giọng nói, body language, storytelling',
    activities: ['Workshop public speaking', 'Tự quay video bài giảng + xem lại', 'Tham gia Hội giảng GV trẻ'],
    selfAssessQuestion: 'HS thường chăm chú nghe đến cuối bài giảng của bạn?',
  },
  {
    id: 'tss-conflict', label: 'Giải quyết xung đột', emoji: '⚖',
    shortDesc: 'Xung đột HS-HS, HS-GV, GV-PH theo hướng win-win',
    activities: ['Khoá Conflict Resolution Mediation', 'Quan sát đồng nghiệp xử lý vụ việc', 'Đọc sách "Crucial Conversations"'],
    selfAssessQuestion: 'Bạn xử lý mâu thuẫn trong lớp mà các bên đều hài lòng?',
  },
  {
    id: 'tss-emotion-mgmt', label: 'Quản lý cảm xúc cá nhân', emoji: '🧘',
    shortDesc: 'Giữ bình tĩnh khi áp lực, không trút lên HS',
    activities: ['Mindfulness 10 phút/ngày', 'Yoga / thiền', 'Therapy / counseling khi burnout', 'Tham gia GV Wellbeing group'],
    selfAssessQuestion: 'Bạn không bao giờ trút cảm xúc tiêu cực lên HS?',
  },
  {
    id: 'tss-creative', label: 'Tư duy sáng tạo & linh hoạt', emoji: '🎨',
    shortDesc: 'Đổi cách dạy khi HS không hiểu, thử nghiệm mới',
    activities: ['Thử Active Learning techniques', 'Game-based learning trong lớp', 'Cross-subject project với GV khác môn'],
    selfAssessQuestion: 'Bạn thường thử cách dạy mới khi cách cũ không hiệu quả?',
  },
]

/** 4 kỹ năng mềm cho PH — đồng bộ với CareerSurvey */
export const PARENT_SOFT_SKILLS: SoftSkill[] = [
  {
    id: 'parent-soft-listen', label: 'Lắng nghe con không phán xét', emoji: '👂',
    shortDesc: 'Để con kể về ngày học không bị quát/sửa ngay',
    activities: ['Dành 15p mỗi tối hỏi con về ngày học', 'Đọc "How to Talk So Kids Will Listen"', 'Workshop nuôi dạy con tích cực'],
    selfAssessQuestion: 'Bạn cho con kể hết câu chuyện trước khi đưa ra lời khuyên?',
  },
  {
    id: 'parent-soft-encourage', label: 'Khích lệ & động viên', emoji: '🌟',
    shortDesc: 'Khen NỖ LỰC thay vì kết quả, công nhận tiến bộ',
    activities: ['Học growth mindset', 'Ghi nhật ký tiến bộ của con', 'Thay "thông minh quá" bằng "con cố gắng quá"'],
    selfAssessQuestion: 'Bạn khen sự cố gắng nhiều hơn khen điểm số?',
  },
  {
    id: 'parent-soft-patience', label: 'Kiên nhẫn khi con sai', emoji: '🌱',
    shortDesc: 'Coi lỗi là cơ hội học, không nổi nóng',
    activities: ['Hít sâu 10s trước khi phản ứng', 'Khoá "Positive Discipline"', 'Workshop quản lý cảm xúc phụ huynh'],
    selfAssessQuestion: 'Bạn giữ bình tĩnh khi con mắc lỗi tương tự nhiều lần?',
  },
  {
    id: 'parent-soft-rolemodel', label: 'Làm tấm gương cho con', emoji: '🪞',
    shortDesc: 'Đọc sách trước mặt con, kiểm soát điện thoại',
    activities: ['Family reading time 30p/tối', 'No-phone-at-dinner rule', 'Học khoá online cùng con'],
    selfAssessQuestion: 'Hành vi của bạn nhất quán với điều bạn dạy con?',
  },
]

export function getSoftSkillsForRole(role: Role): SoftSkill[] {
  switch (role) {
    case 'STUDENT': return STUDENT_SOFT_SKILLS
    case 'TEACHER': return TEACHER_SOFT_SKILLS
    case 'PARENT':  return PARENT_SOFT_SKILLS
  }
}

export function getSoftSkillById(id: string): SoftSkill | undefined {
  return [
    ...STUDENT_SOFT_SKILLS,
    ...TEACHER_SOFT_SKILLS,
    ...PARENT_SOFT_SKILLS,
  ].find(s => s.id === id)
}
