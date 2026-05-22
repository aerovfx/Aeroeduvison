/**
 * Aero Episodes — Series game mầm non/tiểu học (4-10 tuổi)
 *
 * 50 tập × 5 seasons theo plan dau-lem-game-series-plan.md
 * Nhân vật chính: Aero (bé chinchilla 6 tuổi, áo vàng, balo thí nghiệm)
 *
 * MVP scope: metadata + 1 tập đầy đủ S1E1 "Rửa tay" làm pilot.
 * Tập khác có placeholder video → khi animation team xong sẽ update URL.
 */

export type AgeGroup = '4-5' | '5-6' | '6-7' | '7-9' | '9-10'

export interface AeroQuiz {
  question: string
  /** Loại tương tác phù hợp tuổi: tap = bấm trắc nghiệm, choice = chọn 1 trong N, match = kéo thả */
  type: 'tap' | 'choice' | 'match'
  options?: { text: string; emoji?: string; correct: boolean }[]
  matchPairs?: { left: string; right: string }[]
  feedback: { correct: string; wrong: string }
}

export interface AeroBadge {
  id: string
  name: string
  emoji: string
  description: string
}

export interface AeroEpisode {
  id: string                    // 's1e1-rua-tay'
  season: 1 | 2 | 3 | 4 | 5
  episode: number               // 1-10
  title: string
  skill: string                 // VD: "Rửa tay đúng cách"
  emoji: string                 // emoji thumbnail tạm thay video
  ageGroup: AgeGroup
  /** URL video MP4/HLS — null nếu chưa sản xuất */
  videoUrl: string | null
  thumbnailUrl: string | null
  durationSec: number
  /** Mô tả tóm tắt cho PH biết tập dạy gì */
  summary: string
  /** Story 3 phần: Mở-Khám phá-Bài học */
  story: { intro: string; explore: string; lesson: string }
  /** 3 câu quiz cuối tập để củng cố kiến thức */
  quiz: AeroQuiz[]
  badge: AeroBadge
  parentNote?: string
  /** Đã sản xuất xong chưa */
  status: 'released' | 'in_production' | 'planned'
}

export interface AeroSeason {
  number: 1 | 2 | 3 | 4 | 5
  title: string
  theme: string
  ageGroup: AgeGroup
  emoji: string
  color: string
  episodes: AeroEpisode[]
}

// ─── S1 EPISODES — Vệ Sinh (mầm non 4-5t) ─────────────────────────────
const S1_EPISODES: AeroEpisode[] = [
  {
    id: 's1e1-rua-tay',
    season: 1,
    episode: 1,
    title: 'Aero quên rửa tay',
    skill: 'Rửa tay đúng cách 6 bước WHO',
    emoji: '🧼',
    ageGroup: '4-5',
    videoUrl: null,  // PLACEHOLDER — sẽ update khi animation team xong S1E1
    thumbnailUrl: null,
    durationSec: 360, // 6 phút
    summary: 'Aero quên rửa tay trước khi ăn → bị đau bụng. Mẹ dẫn đi khám, bác sĩ giải thích về vi khuẩn. Aero học 6 bước rửa tay WHO.',
    story: {
      intro: 'Hôm nay Aero đi học về, thấy mâm cơm có món Aero thích nhất — cá kho! Aero chạy ngay vào ăn mà quên rửa tay.',
      explore: 'Buổi tối, Aero bụng đau quặn. Mẹ lo lắng dẫn Aero đến bác sĩ. Bác sĩ Bố Aero cho xem hình vi khuẩn dưới kính hiển vi — chúng đang nhảy nhót trong tay Aero! "Vi khuẩn đi vào miệng → vào bụng → làm Aero đau", bác sĩ giải thích. Cô y tá chỉ cho Aero 6 bước rửa tay đúng cách của Tổ chức Y tế Thế giới (WHO).',
      lesson: 'Hôm sau, Aero rửa tay đầy đủ 6 bước trước khi ăn. Cá kho ngon hơn nữa, bụng không đau! Aero kể với các bạn: "Rửa tay sạch là bí mật để khoẻ mạnh đó!"',
    },
    quiz: [
      {
        question: 'Aero phải rửa tay khi nào? (Chọn TẤT CẢ đáp án đúng)',
        type: 'tap',
        options: [
          { text: 'Sau khi đi vệ sinh',     emoji: '🚻', correct: true  },
          { text: 'Trước khi ăn cơm',        emoji: '🍚', correct: true  },
          { text: 'Sau khi chơi đất',        emoji: '🏖', correct: true  },
          { text: 'Khi đang xem TV',          emoji: '📺', correct: false },
        ],
        feedback: {
          correct: '🎉 Đúng rồi! Aero rất giỏi! Phải rửa tay sau khi tiếp xúc với thứ bẩn và trước khi ăn nha.',
          wrong: '🤔 Chưa đúng. Khi đang xem TV thì không cần rửa tay đâu Aero ơi! Thử lại nhé.',
        },
      },
      {
        question: 'Rửa tay bao nhiêu bước theo WHO?',
        type: 'choice',
        options: [
          { text: '3 bước', correct: false },
          { text: '6 bước', correct: true  },
          { text: '10 bước', correct: false },
        ],
        feedback: {
          correct: '🏆 Xuất sắc! WHO khuyên 6 bước: làm ướt → xà phòng → chà lòng bàn tay → chà mu tay → kẽ ngón → đầu ngón và móng tay!',
          wrong: '🌟 Aero nhớ nhé: 6 bước. Hãy đếm lại trong đầu nhé!',
        },
      },
      {
        question: 'Rửa tay bằng gì để sạch nhất?',
        type: 'choice',
        options: [
          { text: 'Chỉ nước thôi',                          correct: false },
          { text: 'Nước + xà phòng (xát đủ 20 giây)',         correct: true  },
          { text: 'Khăn ướt thay nước',                       correct: false },
        ],
        feedback: {
          correct: '✨ Đúng rồi! Xà phòng giúp diệt vi khuẩn, xát đủ 20 giây mới sạch nha!',
          wrong: '💡 Aero ơi, chỉ nước thì không đủ. Phải có xà phòng + xát đủ 20 giây mới sạch vi khuẩn!',
        },
      },
    ],
    badge: {
      id: 'badge-handwash-master',
      name: 'Bậc Thầy Rửa Tay',
      emoji: '🧼',
      description: 'Aero đã biết rửa tay 6 bước WHO đúng cách!',
    },
    parentNote: 'Cha mẹ hãy cùng con thực hành 6 bước rửa tay trong 3 ngày liên tiếp để hình thành thói quen.',
    status: 'in_production',
  },
  // ──────────────────────────────────────────────────────────
  ...createPlaceholderEpisodes(1, [
    { ep: 2,  title: 'Đánh răng buổi sáng',        skill: 'Bàn chải đúng góc 45°',         emoji: '🪥', badgeName: 'Răng Trắng Sáng' },
    { ep: 3,  title: 'Tắm gội ngoan ngoãn',         skill: 'Tự tắm + lau khô',              emoji: '🛁', badgeName: 'Sạch Sẽ Như Tuyết' },
    { ep: 4,  title: 'Cắt móng tay',                skill: 'An toàn + sạch sẽ',             emoji: '✂', badgeName: 'Móng Tay Gọn Gàng' },
    { ep: 5,  title: 'Đi vệ sinh đúng cách',        skill: 'Tự giật nước + rửa tay',        emoji: '🚽', badgeName: 'Vệ Sinh Văn Minh' },
    { ep: 6,  title: 'Ăn uống sạch sẽ',             skill: 'Không ngậm + không ăn rớt',     emoji: '🍽', badgeName: 'Bàn Ăn Lịch Sự' },
    { ep: 7,  title: 'Ngủ đúng giờ',                skill: '9h tối là giờ ngủ',             emoji: '😴', badgeName: 'Giấc Mơ Đẹp' },
    { ep: 8,  title: 'Mặc quần áo',                 skill: 'Phải-trái, trước-sau',          emoji: '👕', badgeName: 'Stylist Aero' },
    { ep: 9,  title: 'Buộc dây giày',                skill: 'Kỹ thuật "tai thỏ"',            emoji: '👟', badgeName: 'Đôi Tai Thỏ' },
    { ep: 10, title: 'Aero tự lập rồi!',             skill: 'Tổng kết 9 thói quen',          emoji: '⭐', badgeName: 'Aero Tự Lập' },
  ], '4-5'),
]

// ─── S2 EPISODES — An Toàn (mầm non 5-6t) ─────────────────────────────
const S2_EPISODES: AeroEpisode[] = createPlaceholderEpisodes(2, [
  { ep: 1,  title: 'Đèn xanh đèn đỏ',                skill: 'Tín hiệu giao thông',           emoji: '🚦', badgeName: 'Bộ Trưởng Giao Thông' },
  { ep: 2,  title: 'Không nói chuyện với người lạ',  skill: 'Stranger danger',               emoji: '🚫', badgeName: 'Aero Cảnh Giác' },
  { ep: 3,  title: 'Bị lạc — phải làm gì?',          skill: 'Đứng yên + nhờ NV',             emoji: '🆘', badgeName: 'Bình Tĩnh Tìm Người' },
  { ep: 4,  title: 'Điện rất nguy hiểm',              skill: 'Không sờ ổ điện',               emoji: '⚡', badgeName: 'An Toàn Điện' },
  { ep: 5,  title: 'Lửa rất nóng',                    skill: 'Không nghịch bếp gas',           emoji: '🔥', badgeName: 'Tránh Xa Lửa' },
  { ep: 6,  title: 'Số 113 và 114',                   skill: 'Cảnh sát + cứu hoả',             emoji: '📞', badgeName: 'Anh Hùng Tí Hon' },
  { ep: 7,  title: 'Nước sâu phải cẩn thận',          skill: 'Bơi có người lớn',               emoji: '🏊', badgeName: 'Bơi An Toàn' },
  { ep: 8,  title: 'Chó lạ có thể cắn',               skill: 'Nhận biết chó dữ',               emoji: '🐕', badgeName: 'Hiểu Loài Vật' },
  { ep: 9,  title: 'Khi bị thương',                   skill: 'Tìm người lớn ngay',             emoji: '🩹', badgeName: 'Sơ Cứu Nhanh' },
  { ep: 10, title: 'Quy tắc "không, đi, kể"',         skill: 'Phòng xâm hại',                  emoji: '🛡', badgeName: 'Bảo Vệ Chính Mình' },
], '5-6')

// ─── S3 EPISODES — Tử Tế (tiểu học 6-7t) ─────────────────────────────
const S3_EPISODES: AeroEpisode[] = createPlaceholderEpisodes(3, [
  { ep: 1,  title: 'Cảm ơn và xin lỗi',              skill: 'Khi nào dùng',                   emoji: '🙏', badgeName: 'Lịch Sự Quá' },
  { ep: 2,  title: 'Chia sẻ đồ chơi',                 skill: 'Bí dạy Aero không tham',         emoji: '🧸', badgeName: 'Trái Tim Rộng' },
  { ep: 3,  title: 'Lắng nghe bạn nói',               skill: 'Không cắt lời',                  emoji: '👂', badgeName: 'Người Bạn Tốt' },
  { ep: 4,  title: 'Giúp đỡ người khác',              skill: 'Bà cụ qua đường',                emoji: '🦯', badgeName: 'Aero Tốt Bụng' },
  { ep: 5,  title: 'Trung thực — vỡ bình',            skill: 'Thú nhận thay vì giấu',          emoji: '🏺', badgeName: 'Trái Tim Trung Thực' },
  { ep: 6,  title: 'Kiên nhẫn xếp hàng',              skill: 'Không chen lấn',                 emoji: '🧍', badgeName: 'Người Lịch Sự' },
  { ep: 7,  title: 'Bảo vệ bạn yếu',                  skill: 'Chống bullying',                 emoji: '💪', badgeName: 'Anh Hùng Của Lớp' },
  { ep: 8,  title: 'Tôn trọng người khuyết tật',      skill: 'Không trêu chọc',                emoji: '♿', badgeName: 'Trái Tim Đồng Cảm' },
  { ep: 9,  title: 'Yêu thiên nhiên',                 skill: 'Không xả rác',                   emoji: '🌿', badgeName: 'Bạn Của Trái Đất' },
  { ep: 10, title: 'Biết ơn cha mẹ',                  skill: 'Việc nhỏ Aero làm được',         emoji: '❤', badgeName: 'Con Yêu Nhất' },
], '6-7')

// ─── S4 EPISODES — Khoa Học Vui (tiểu học 7-9t) ──────────────────────
const S4_EPISODES: AeroEpisode[] = createPlaceholderEpisodes(4, [
  { ep: 1,  title: 'Vì sao trời mưa?',               skill: 'Vòng tuần hoàn nước',            emoji: '🌧', badgeName: 'Thám Tử Thời Tiết' },
  { ep: 2,  title: 'Nam châm hút gì?',                skill: 'Sắt, niken, coban',              emoji: '🧲', badgeName: 'Nhà Vật Lý' },
  { ep: 3,  title: 'Nước nóng bay hơi',               skill: 'Trạng thái vật chất',            emoji: '💧', badgeName: 'Hơi Nước Bí Ẩn' },
  { ep: 4,  title: 'Cầu vồng 7 màu',                  skill: 'Tán sắc ánh sáng',               emoji: '🌈', badgeName: 'Cầu Vồng Trong Tay' },
  { ep: 5,  title: 'Cây cần gì để sống?',             skill: 'Quang hợp đơn giản',             emoji: '🌳', badgeName: 'Người Bạn Cây' },
  { ep: 6,  title: 'Trái Đất quay quanh Mặt Trời',    skill: 'Mùa trong năm',                  emoji: '🌍', badgeName: 'Phi Hành Gia Aero' },
  { ep: 7,  title: 'Hệ tiêu hoá',                     skill: 'Đường đi thức ăn',                emoji: '🫁', badgeName: 'Bác Sĩ Tí Hon' },
  { ep: 8,  title: 'Khủng long biến mất',             skill: 'Tuyệt chủng',                    emoji: '🦕', badgeName: 'Nhà Cổ Sinh Học' },
  { ep: 9,  title: 'Núi lửa phun trào',               skill: 'Tầng địa chất',                  emoji: '🌋', badgeName: 'Thám Hiểm Địa Cầu' },
  { ep: 10, title: 'Aero làm nhà khoa học',           skill: 'Phương pháp khoa học',           emoji: '🔬', badgeName: 'Nhà Khoa Học Nhí' },
], '7-9')

// ─── S5 EPISODES — Số Hoá (tiểu học 9-10t) ───────────────────────────
const S5_EPISODES: AeroEpisode[] = createPlaceholderEpisodes(5, [
  { ep: 1,  title: 'Internet là gì?',                skill: 'Mạng máy tính cơ bản',           emoji: '🌐', badgeName: 'Cư Dân Mạng Mới' },
  { ep: 2,  title: 'Mật khẩu giữ bí mật',             skill: 'Không chia sẻ mật khẩu',         emoji: '🔐', badgeName: 'Vệ Sĩ Mật Khẩu' },
  { ep: 3,  title: 'Người lạ trên mạng',              skill: 'Cảnh giác chat lạ',              emoji: '👤', badgeName: 'Internet An Toàn' },
  { ep: 4,  title: 'Tin tức giả (Fake news)',         skill: 'Kiểm tra 3 nguồn',               emoji: '📰', badgeName: 'Thám Tử Sự Thật' },
  { ep: 5,  title: 'YouTube tốt và xấu',               skill: 'PH duyệt nội dung',              emoji: '📺', badgeName: 'Người Xem Thông Minh' },
  { ep: 6,  title: 'Game online — chơi vừa phải',     skill: '1 giờ/ngày',                     emoji: '🎮', badgeName: 'Game Master Cân Bằng' },
  { ep: 7,  title: 'Cyberbullying',                   skill: 'Báo người lớn',                  emoji: '🛡', badgeName: 'Trái Tim Mạnh Mẽ' },
  { ep: 8,  title: 'AI — người bạn (không phải Chúa)', skill: 'Verify info AI',                 emoji: '🤖', badgeName: 'Hiểu AI' },
  { ep: 9,  title: 'Tự bảo vệ ảnh cá nhân',           skill: 'Không chia sẻ địa chỉ',          emoji: '📸', badgeName: 'Bảo Vệ Riêng Tư' },
  { ep: 10, title: 'Công dân số tử tế',                skill: 'Tổng kết 9 quy tắc',             emoji: '👑', badgeName: 'Công Dân Số Aero' },
], '9-10')

// ─── Helper: tạo placeholder episodes nhanh ───────────────────────────
function createPlaceholderEpisodes(
  season: 1 | 2 | 3 | 4 | 5,
  list: { ep: number; title: string; skill: string; emoji: string; badgeName: string }[],
  ageGroup: AgeGroup,
): AeroEpisode[] {
  return list.map(it => ({
    id: `s${season}e${it.ep}-${it.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}`,
    season,
    episode: it.ep,
    title: `Aero và ${it.title}`,
    skill: it.skill,
    emoji: it.emoji,
    ageGroup,
    videoUrl: null,
    thumbnailUrl: null,
    durationSec: 360 + Math.floor(Math.random() * 120), // 6-8 phút
    summary: `Aero học về ${it.skill.toLowerCase()} qua tình huống đời thường.`,
    story: {
      intro: `[Coming soon] Aero gặp tình huống liên quan đến "${it.skill}".`,
      explore: '[Coming soon] Aero thử-sai và được nhân vật phụ giúp đỡ tìm ra giải pháp đúng.',
      lesson: `[Coming soon] Aero kể lại bài học về ${it.skill.toLowerCase()} và áp dụng vào ngày hôm sau.`,
    },
    quiz: [
      {
        question: `[Coming soon] Câu hỏi củng cố về ${it.skill}`,
        type: 'choice',
        options: [
          { text: 'Đáp án mẫu A', correct: true  },
          { text: 'Đáp án mẫu B', correct: false },
          { text: 'Đáp án mẫu C', correct: false },
        ],
        feedback: { correct: '🎉 Tuyệt vời!', wrong: '💡 Thử lại nhé Aero!' },
      },
    ],
    badge: {
      id: `badge-s${season}e${it.ep}`,
      name: it.badgeName,
      emoji: it.emoji,
      description: `Aero đã hoàn thành tập "${it.title}"`,
    },
    status: 'planned',
  }))
}

// ─── Export 5 SEASONS ────────────────────────────────────────────────
export const AERO_SEASONS: AeroSeason[] = [
  { number: 1, title: 'Aero Vệ Sinh',    theme: 'Tự chăm sóc bản thân',        ageGroup: '4-5', emoji: '🧼', color: '#fbbf24', episodes: S1_EPISODES },
  { number: 2, title: 'Aero An Toàn',    theme: 'Sinh tồn cơ bản',             ageGroup: '5-6', emoji: '🛡', color: '#ef4444', episodes: S2_EPISODES },
  { number: 3, title: 'Aero Tử Tế',      theme: 'Đạo đức + kỹ năng xã hội',    ageGroup: '6-7', emoji: '❤', color: '#ec4899', episodes: S3_EPISODES },
  { number: 4, title: 'Aero Khoa Học',   theme: 'Tò mò khoa học',              ageGroup: '7-9', emoji: '🔬', color: '#3b82f6', episodes: S4_EPISODES },
  { number: 5, title: 'Aero Số Hoá',     theme: 'Năng lực số + an toàn mạng',  ageGroup: '9-10', emoji: '🌐', color: '#a78bfa', episodes: S5_EPISODES },
]

export const ALL_EPISODES: AeroEpisode[] = AERO_SEASONS.flatMap(s => s.episodes)

export function getEpisodeById(id: string): AeroEpisode | undefined {
  return ALL_EPISODES.find(e => e.id === id)
}

export function getSeason(num: 1 | 2 | 3 | 4 | 5): AeroSeason | undefined {
  return AERO_SEASONS.find(s => s.number === num)
}

/** Stats tổng quan */
export const AERO_STATS = {
  totalEpisodes: ALL_EPISODES.length,           // 50
  totalSeasons: AERO_SEASONS.length,             // 5
  released: ALL_EPISODES.filter(e => e.status === 'released').length,
  inProduction: ALL_EPISODES.filter(e => e.status === 'in_production').length,
  planned: ALL_EPISODES.filter(e => e.status === 'planned').length,
}
