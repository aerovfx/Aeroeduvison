/**
 * StemDIYLibrary — Thư viện DIY STEM cho học sinh tự làm
 *
 * Route: /dashboard/labtwin/stem-diy
 * User: "Tạo 1 thư viện các DIY về STEM để học sinh có thể tự làm theo
 *  các bước hướng dẫn chi tiết. Trình tự ghi các bước 1, 2, 3, ..."
 *
 * Features:
 *   - Grid view: 18 DIY projects với category filter + search
 *   - Detail view: materials list, safety, numbered steps, expected result,
 *     variations, print-friendly layout
 *   - Categories: Cơ học · Điện · Hoá · Sinh · Quang · Robotics
 *   - Favorite projects → localStorage
 *   - Difficulty + age range + duration badges
 */
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, Wrench, Clock, Award, AlertTriangle, Lightbulb,
  Heart, Search, Filter, Printer, ChevronRight, ListChecks, Beaker,
  Zap, Cog, Leaf, Eye, Cpu, Sparkles, Check, X,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

type Category = 'mechanics' | 'electricity' | 'chemistry' | 'biology' | 'optics' | 'robotics'
type Difficulty = 'easy' | 'medium' | 'hard'

interface DIYStep {
  text: string
  emoji?: string
  warning?: string
  tip?: string
}

interface DIYProject {
  id: string
  title: string
  category: Category
  difficulty: Difficulty
  duration: string
  ageRange: string
  description: string
  emoji: string
  materials: string[]
  safety: string[]
  steps: DIYStep[]
  expectedResult: string
  variations?: string[]
  principle?: string  // Nguyên lý khoa học
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Wrench; color: string; accent: string }> = {
  mechanics:   { label: 'Cơ học',     icon: Cog,    color: 'rose',    accent: '#f43f5e' },
  electricity: { label: 'Điện',        icon: Zap,    color: 'amber',   accent: '#f59e0b' },
  chemistry:   { label: 'Hoá học',    icon: Beaker, color: 'emerald', accent: '#10b981' },
  biology:     { label: 'Sinh học',   icon: Leaf,   color: 'green',   accent: '#22c55e' },
  optics:      { label: 'Quang học',  icon: Eye,    color: 'cyan',    accent: '#06b6d4' },
  robotics:    { label: 'Robotics',   icon: Cpu,    color: 'violet',  accent: '#8b5cf6' },
}

const DIFFICULTY_META: Record<Difficulty, { label: string; stars: string; color: string }> = {
  easy:   { label: 'Dễ',          stars: '★☆☆', color: 'text-emerald-300' },
  medium: { label: 'Trung bình',  stars: '★★☆', color: 'text-amber-300' },
  hard:   { label: 'Khó',         stars: '★★★', color: 'text-rose-300' },
}

// ─── DIY Project database ───────────────────────────────────────

const PROJECTS: DIYProject[] = [
  // ═══ CƠ HỌC ═══════════════════════════════════════════════════
  {
    id: 'water-rocket',
    title: 'Tên lửa nước',
    category: 'mechanics',
    difficulty: 'medium',
    duration: '45 phút',
    ageRange: '10-15 tuổi',
    emoji: '🚀',
    description: 'Phóng tên lửa bay cao hàng chục mét chỉ bằng chai nước và áp suất khí. Áp dụng định luật Newton III.',
    materials: [
      'Chai nhựa 1.5L (đã rửa sạch, bỏ nhãn)',
      'Bơm xe đạp có van Schrader',
      'Nút bần (hoặc nắp có khoan lỗ)',
      'Băng keo và bìa cứng (làm cánh + đầu)',
      'Nước (~500ml)',
      '1-2 ống nhựa PVC làm bệ phóng',
    ],
    safety: [
      'CHỈ phóng ngoài trời, khoảng trống tối thiểu 20m',
      'KHÔNG đứng phía trên tên lửa — luôn đứng SAU/xa khi bơm',
      'Đeo kính bảo hộ khi phóng',
      'Có người lớn giám sát',
    ],
    steps: [
      { text: 'Rửa sạch chai nhựa, bỏ nhãn keo. Đảm bảo chai không có vết nứt.', tip: 'Chai Coca/Pepsi 1.5L vỏ dày phù hợp nhất.' },
      { text: 'Cắt 3 cánh tên lửa từ bìa cứng hình tam giác (mỗi cánh ~10cm cao).', emoji: '✂️' },
      { text: 'Dán đều 3 cánh quanh đáy chai (góc 120°) bằng băng keo.', tip: 'Cánh hơi cong/nghiêng → tên lửa xoay khi bay giúp ổn định.' },
      { text: 'Cuốn bìa thành hình nón cho đỉnh chai (đầu tên lửa). Dán cố định.', emoji: '🔺' },
      { text: 'Đổ ~500ml nước vào chai (khoảng 1/3 thể tích).', warning: 'Quá ít nước → áp suất phải cao mới phóng. Quá nhiều → bay không xa.' },
      { text: 'Đặt nút bần vào miệng chai. Khoan lỗ xuyên nút để cắm van bơm.', emoji: '🔩' },
      { text: 'Lắp tên lửa lên bệ phóng (chai chúc xuống đất).', tip: 'Bệ phóng nghiêng 80-85° gần thẳng đứng để bay cao tối đa.' },
      { text: 'Bơm khí vào chai (kéo van bơm). Đếm 10-15 lần bơm là đủ.', warning: '⚠️ NGUY HIỂM: KHÔNG bơm quá nhiều — chai có thể nổ!' },
      { text: 'Kéo dây để giải phóng nút bần → tên lửa phóng đi!', emoji: '💥' },
      { text: 'Đo độ cao + khoảng cách bay. Ghi lại số liệu để so sánh nước nhiều/ít.', tip: 'Dùng smartphone quay video để phân tích quỹ đạo.' },
    ],
    expectedResult: 'Tên lửa bay 10-30m cao tùy lượng nước và áp suất. Vết nước phun ra phía dưới rất rõ.',
    principle: 'Newton III: nước phun xuống → tên lửa phản lực lên. Áp suất khí nén = nguồn năng lượng.',
    variations: [
      'Thử lượng nước khác nhau: 200ml / 500ml / 800ml → so sánh tầm xa',
      'Gắn dù giấy trong khoang → tên lửa thả dù khi đến đỉnh',
      'Đo độ cao bằng góc + khoảng cách (lượng giác)',
    ],
  },
  {
    id: 'marble-run',
    title: 'Cầu trượt bi giấy bìa',
    category: 'mechanics',
    difficulty: 'easy',
    duration: '60 phút',
    ageRange: '7-12 tuổi',
    emoji: '🎢',
    description: 'Thiết kế đường trượt cho viên bi với các đoạn dốc, vòng xoáy. Áp dụng năng lượng tiềm năng + động năng.',
    materials: [
      'Bìa cứng (vỏ hộp giày, hộp ngũ cốc)',
      'Băng keo trong',
      'Kéo + thước',
      'Viên bi (đường kính ~1-2cm)',
      'Tường hoặc bảng để dán cố định',
    ],
    safety: ['Cẩn thận khi cắt bìa cứng — dùng kéo đầu tròn', 'Không nuốt viên bi (trẻ nhỏ)'],
    steps: [
      { text: 'Cắt bìa thành dải dài 60cm × rộng 4cm. Cần 5-8 dải.', emoji: '📏' },
      { text: 'Gấp đôi mỗi dải theo chiều dọc tạo máng chữ V (rãnh cho bi lăn).' },
      { text: 'Cố định dải đầu tiên ở độ cao ~1m, hơi nghiêng xuống.', tip: 'Độ nghiêng 10-15° là tối ưu — quá dốc bi bay ra, quá phẳng dừng.' },
      { text: 'Đặt thử bi → quan sát hướng lăn → điều chỉnh dốc.', emoji: '🔵' },
      { text: 'Nối thêm dải thứ 2 phía dưới, đảm bảo điểm thoát của dải 1 rơi đúng vào dải 2.' },
      { text: 'Tạo khúc cua bằng cách cắt bìa hình cung tròn, ghép vào.' },
      { text: 'Thêm "nhảy gián đoạn": để khoảng trống nhỏ giữa 2 đoạn → bi bay qua không trung.', tip: 'Khoảng cách 3-5cm tùy tốc độ.' },
      { text: 'Cuối cùng đặt cốc/chậu hứng bi ở đáy.' },
      { text: 'Thử nghiệm — đếm thời gian bi từ đỉnh đến đáy.' },
      { text: 'Cải tiến: thêm vòng xoáy (loop) bằng dải bìa uốn cong 360°.' },
    ],
    expectedResult: 'Bi lăn liên tục từ đỉnh xuống đáy qua các đoạn dốc/cua/nhảy.',
    principle: 'Cơ năng = thế năng (mgh) + động năng (½mv²). Bi rơi → thế năng giảm, động năng tăng.',
    variations: [
      'So sánh bi sắt vs bi gỗ (cùng kích thước) — cái nào nhanh hơn? (Cùng tốc độ — không phụ thuộc khối lượng nếu bỏ qua ma sát)',
      'Tạo "bẫy" giữa đường — bi phải nhảy qua',
      'Thêm chuông leng keng khi bi đi qua điểm nhất định',
    ],
  },

  // ═══ ĐIỆN ═══════════════════════════════════════════════════════
  {
    id: 'lemon-battery',
    title: 'Pin chanh thắp đèn LED',
    category: 'electricity',
    difficulty: 'easy',
    duration: '20 phút',
    ageRange: '8-14 tuổi',
    emoji: '🍋',
    description: 'Tạo pin tự nhiên từ chanh, đồng và kẽm. Đủ điện để thắp LED hoặc đồng hồ.',
    materials: [
      '3-4 quả chanh (chanh vàng hoặc chanh xanh đều được)',
      '3-4 đoạn dây đồng (kẹp giấy đồng cũng được)',
      '3-4 đoạn dây kẽm (đinh mạ kẽm)',
      'Dây điện nhỏ + kẹp cá sấu',
      '1 đèn LED nhỏ (2V) hoặc đồng hồ digital chạy pin nút',
    ],
    safety: ['Chanh tươi an toàn — không cần găng tay', 'Không cắn dây kim loại'],
    steps: [
      { text: 'Vò nhẹ chanh trong tay để chanh mềm + nước cốt nhiều hơn (axit citric).', tip: 'Chanh mềm → ion di chuyển dễ → điện áp lớn.' },
      { text: 'Cắm 1 cây đinh kẽm và 1 mảnh đồng vào MỖI quả chanh (cách nhau 3cm, không chạm).', emoji: '🔩' },
      { text: 'Đo điện áp 1 quả chanh bằng đồng hồ vạn năng (~0.9V).' },
      { text: 'Nối tiếp các chanh: đồng quả 1 → kẽm quả 2, đồng quả 2 → kẽm quả 3...', tip: 'Mắc nối tiếp → điện áp cộng dồn.' },
      { text: 'Đo tổng điện áp với 3-4 quả: ~2.5-3V → đủ thắp LED đỏ.' },
      { text: 'Nối đầu cuối (đồng cuối + kẽm đầu) với chân LED (chú ý cực + của LED nối đầu đồng).', warning: 'LED có cực — chân dài là +, chân ngắn là −.' },
      { text: 'Đèn LED sáng yếu (vì dòng rất nhỏ ~vài mA).', emoji: '💡' },
      { text: 'Thử thay chanh bằng cam, khoai tây, dưa chuột → so sánh điện áp.' },
    ],
    expectedResult: 'LED đỏ phát sáng yếu nhưng nhìn rõ trong phòng tối.',
    principle: 'Phản ứng oxi-hoá khử: Zn → Zn²⁺ + 2e⁻ (kẽm cho electron) · 2H⁺ + 2e⁻ → H₂ (đồng nhận). Axit citric trong chanh là chất điện ly.',
    variations: [
      'Thay đồng bằng nhôm → điện áp khác',
      'Mắc song song 4 quả thay vì nối tiếp → so sánh dòng',
      'Pin khoai tây — khoai tây vẫn có tính axit nhẹ',
    ],
  },
  {
    id: 'mini-motor',
    title: 'Động cơ điện đơn giản (Faraday motor)',
    category: 'electricity',
    difficulty: 'medium',
    duration: '30 phút',
    ageRange: '11-16 tuổi',
    emoji: '⚙️',
    description: 'Tự làm động cơ quay tròn từ pin AA + nam châm + dây đồng. Không có chổi than!',
    materials: [
      '1 pin AA (1.5V)',
      '1 nam châm tròn neodymium (đường kính ~1cm)',
      '20cm dây đồng tráng men',
      'Giấy nhám mịn',
    ],
    safety: ['Nam châm neodymium MẠNH — giữ xa thẻ tín dụng, thiết bị điện tử', 'KHÔNG nuốt nam châm'],
    steps: [
      { text: 'Đặt nam châm vào đầu (−) của pin → nam châm dính chặt.' },
      { text: 'Uốn dây đồng thành hình trái tim/hình thoi cao ~5cm, đối xứng.', emoji: '💗' },
      { text: 'Dùng giấy nhám CẠO HẾT lớp tráng men ở 2 đầu dây và đỉnh.', warning: 'Bước này QUAN TRỌNG — không cạo dây thì không dẫn điện.' },
      { text: 'Đặt 1 đầu dây tại đỉnh pin (+), đầu kia chạm vào nam châm.' },
      { text: 'Điều chỉnh để dây cân bằng, không lệch.', tip: 'Dây có thể quay tự do quanh trục pin.' },
      { text: 'Đẩy nhẹ dây → nó tự quay liên tục!', emoji: '🌀' },
      { text: 'Quan sát hướng quay. Đảo chiều pin → đảo chiều quay.' },
    ],
    expectedResult: 'Dây đồng quay liên tục 50-200 RPM quanh pin cho đến hết pin (~5 phút).',
    principle: 'Lực Lorentz F = qv×B. Dòng điện chạy trong từ trường → lực vuông góc → moment quay. Pin → dây đồng → nam châm → pin tạo mạch kín.',
    variations: [
      'Thay pin AAA → tốc độ khác',
      'Đặt nhiều nam châm chồng lên → momentum lớn hơn',
      'Đo RPM bằng cách quay video slow-motion',
    ],
  },

  // ═══ HOÁ HỌC ═══════════════════════════════════════════════════
  {
    id: 'baking-soda-volcano',
    title: 'Núi lửa baking soda',
    category: 'chemistry',
    difficulty: 'easy',
    duration: '15 phút',
    ageRange: '6-12 tuổi',
    emoji: '🌋',
    description: 'Phun trào dung nham đỏ giống núi lửa thật. Phản ứng acid + base sinh khí CO₂.',
    materials: [
      'Chai nhựa nhỏ 200ml hoặc cốc',
      '2-3 muỗng baking soda (NaHCO₃)',
      '½ cốc giấm (CH₃COOH)',
      'Màu thực phẩm đỏ',
      '1 muỗng nước rửa chén (để có bọt nhiều)',
      'Khay đựng (vì sẽ tràn ra)',
    ],
    safety: ['Phản ứng nhẹ — không độc', 'Đeo kính nếu dùng giấm đậm đặc'],
    steps: [
      { text: 'Đặt chai vào giữa khay (để hứng dung nham tràn ra).' },
      { text: 'Cho 2-3 muỗng baking soda vào chai.' },
      { text: 'Thêm 1 muỗng nước rửa chén → tạo bọt nhiều khi phản ứng.' },
      { text: 'Nhỏ 5-10 giọt màu thực phẩm đỏ.' },
      { text: 'Đổ nhanh ½ cốc giấm vào chai → phản ứng xảy ra ngay!', emoji: '💥' },
      { text: 'Quan sát: bọt đỏ trào ra khỏi miệng chai như dung nham núi lửa.' },
      { text: 'Phản ứng kết thúc sau ~30 giây khi hết một trong 2 chất.' },
    ],
    expectedResult: 'Bọt đỏ trào ra liên tục 20-30 giây. Khí CO₂ tạo bọt khí.',
    principle: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂↑. Acid + Base → muối + nước + khí CO₂ (gây sủi bọt).',
    variations: [
      'Dùng 2-3 màu khác nhau → tạo cầu vồng',
      'Thay giấm bằng nước cốt chanh',
      'Xây núi lửa giấy bồi quanh chai → trông giống thật hơn',
    ],
  },
  {
    id: 'sugar-crystal',
    title: 'Trồng tinh thể đường',
    category: 'chemistry',
    difficulty: 'easy',
    duration: '7-14 ngày',
    ageRange: '8-15 tuổi',
    emoji: '💎',
    description: 'Nuôi tinh thể đường lớn dần qua 1 tuần. Đẹp như ngọc — ăn được!',
    materials: [
      '2 cốc nước',
      '4-6 cốc đường trắng',
      '1 sợi dây hoặc que xiên gỗ',
      '1 lọ thuỷ tinh trong suốt',
      'Màu thực phẩm (tùy chọn)',
      '1 cái kẹp/kẹp gắp',
    ],
    safety: ['Người lớn nấu nước nóng. KHÔNG để trẻ tự nấu', 'Đợi nguội trước khi cho trẻ thao tác'],
    steps: [
      { text: 'Đun sôi 2 cốc nước trong nồi (người lớn làm).', warning: '⚠️ Nước sôi rất nóng.' },
      { text: 'Cho từ từ đường vào, khuấy đều. Tiếp tục cho đến khi đường KHÔNG tan nữa (~4-6 cốc).', tip: 'Đây gọi là dung dịch "siêu bão hoà" — chìa khoá để tinh thể mọc.' },
      { text: 'Nhỏ vài giọt màu thực phẩm nếu muốn tinh thể có màu.' },
      { text: 'Tắt bếp, đổ dung dịch vào lọ thuỷ tinh trong.' },
      { text: 'Buộc 1 sợi dây vào que xiên. Nhúng dây vào dung dịch (không chạm đáy).', emoji: '🪢' },
      { text: 'Đặt que ngang miệng lọ — dây dài ~3/4 chiều cao lọ.' },
      { text: 'Đậy nhẹ bằng khăn giấy (chống bụi nhưng thoáng).' },
      { text: 'Đặt nơi yên tĩnh, KHÔNG di chuyển, KHÔNG lắc.', warning: 'Lắc → tinh thể vỡ.' },
      { text: 'Sau 2-3 ngày: thấy tinh thể nhỏ bám trên dây.', emoji: '✨' },
      { text: 'Sau 7-14 ngày: tinh thể to bằng đầu ngón tay. Lấy ra ngắm + ăn thử!' },
    ],
    expectedResult: 'Tinh thể trong suốt to dần mỗi ngày. Sau 2 tuần có thể đạt 1-2cm.',
    principle: 'Dung dịch siêu bão hoà (lạnh) không thể giữ tất cả đường hoà tan → dư thừa kết tinh ra dây. Phân tử đường xếp đều theo cấu trúc tinh thể đối xứng.',
    variations: [
      'So sánh đường trắng vs đường nâu vs đường phèn',
      'Tinh thể muối (dùng muối thay đường) — màu trắng đục',
      'Treo 3 dây song song cùng lúc → so sánh tốc độ mọc',
    ],
  },
  {
    id: 'invisible-ink',
    title: 'Mực vô hình từ nước cốt chanh',
    category: 'chemistry',
    difficulty: 'easy',
    duration: '15 phút',
    ageRange: '7-12 tuổi',
    emoji: '🕵️',
    description: 'Viết chữ không nhìn thấy. Hơ nóng → chữ hiện lên màu nâu. Bí mật!',
    materials: [
      '½ quả chanh (vắt lấy nước)',
      '1 cọ vẽ hoặc tăm bông',
      'Giấy trắng (không bóng)',
      'Đèn / bóng đèn / nến (để hơ nóng)',
    ],
    safety: ['Người lớn giám sát khi hơ nóng', 'Không để giấy chạm trực tiếp ngọn lửa'],
    steps: [
      { text: 'Vắt nước cốt 1/2 quả chanh vào chén nhỏ.', emoji: '🍋' },
      { text: 'Nhúng cọ/tăm bông vào nước chanh.' },
      { text: 'Viết chữ hoặc vẽ hình trên giấy. Vẫn ướt nhưng nhìn vẫn rõ.' },
      { text: 'Đợi giấy KHÔ HOÀN TOÀN (5-10 phút) → chữ "biến mất" hoàn toàn.' },
      { text: 'Để giấy gần đèn/bóng đèn nóng (nhưng KHÔNG để giấy bốc cháy).', warning: '🔥 Giữ giấy cách nguồn nhiệt ít nhất 10cm. Không để khô quá lâu.' },
      { text: 'Sau 30-60 giây: chữ hiện ra màu nâu/vàng nhạt!', emoji: '✨' },
      { text: 'Đọc bí mật! Chữ giữ được mãi mãi vì axit đã oxi hoá giấy.' },
    ],
    expectedResult: 'Chữ "ẩn" hiện lên màu nâu khi hơ nóng, vĩnh viễn nhìn được.',
    principle: 'Axit citric trong chanh làm yếu cấu trúc cellulose của giấy. Khi đốt nóng, vùng có axit oxi hoá (caramen hoá) trước → đổi màu nâu.',
    variations: [
      'Thay chanh bằng giấm, sữa, nước cam',
      'Viết bằng 2 loại mực khác nhau → so sánh độ hiện',
      'Đố bạn giải mã thông điệp',
    ],
  },

  // ═══ SINH HỌC ═══════════════════════════════════════════════════
  {
    id: 'seed-growth',
    title: 'Quan sát hạt đậu nảy mầm',
    category: 'biology',
    difficulty: 'easy',
    duration: '7-14 ngày',
    ageRange: '6-14 tuổi',
    emoji: '🌱',
    description: 'Theo dõi hạt đậu từ khô đến mầm xanh. Học về thực vật + chu trình sự sống.',
    materials: [
      '10-15 hạt đậu xanh / đậu nành / đậu đen',
      '2-3 ly trong suốt',
      'Khăn giấy hoặc bông gòn',
      'Nước',
      'Nhật ký quan sát (sổ + bút)',
    ],
    safety: ['An toàn 100% — hạt đậu thực phẩm thông thường'],
    steps: [
      { text: 'Ngâm hạt đậu trong nước ấm 6-8 tiếng (qua đêm).', emoji: '💧' },
      { text: 'Vò 2-3 lớp khăn giấy thành cục, làm ẩm nhưng không nhỏ nước.' },
      { text: 'Đặt khăn giấy vào đáy ly trong.' },
      { text: 'Đặt 3-4 hạt đậu lên khăn giấy, ÉP sát vào thành ly để dễ quan sát rễ.' },
      { text: 'Thêm 1 lớp khăn nhẹ phủ lên hạt.', tip: 'Không phủ quá dày — hạt cần không khí.' },
      { text: 'Đặt ly nơi sáng nhưng không nắng gắt.' },
      { text: 'Mỗi ngày tưới vài giọt nước để giữ ẩm (không ngập).', warning: 'Ngập nước → hạt thối.' },
      { text: 'NGÀY 1-2: Hạt nở to ra do hút nước.' },
      { text: 'NGÀY 3-4: Rễ trắng xuyên xuống đáy ly. Ghi vào sổ!', emoji: '📔' },
      { text: 'NGÀY 5-7: Thân mầm xanh đẩy lên trên. 2 lá mầm nở ra.' },
      { text: 'NGÀY 8-14: Lá thật xuất hiện (lá to, có cuống). Cây cao 5-10cm.' },
      { text: 'Đo và vẽ cây mỗi ngày. So sánh hạt nào nhanh hơn?', tip: 'Có thể chuyển ra đất khi cây đủ lớn.' },
    ],
    expectedResult: 'Sau 2 tuần có cây non khoẻ mạnh ~10cm với 2 lá mầm + 2-4 lá thật.',
    principle: 'Hạt chứa phôi + chất dự trữ. Nước + nhiệt độ thích hợp → enzyme hoạt động → phôi phát triển. Sau khi hết chất dự trữ, cây cần ánh sáng để quang hợp (CO₂ + H₂O → glucose + O₂).',
    variations: [
      'So sánh: hạt trong tối vs hạt ngoài sáng — cái nào dài hơn? (Tối → dài hơn do vươn tìm sáng)',
      'Thử nước thường vs nước muối — phát triển khác nhau',
      'Trồng nhiều loại hạt cùng lúc: đậu, lúa, ngô, hướng dương',
    ],
  },
  {
    id: 'celery-color',
    title: 'Cần tây nhuộm màu (mạch dẫn nước)',
    category: 'biology',
    difficulty: 'easy',
    duration: '24 tiếng',
    ageRange: '6-12 tuổi',
    emoji: '🥬',
    description: 'Cần tây hút nước màu — thân chuyển xanh/đỏ. Quan sát mạch dẫn xylem trong cây.',
    materials: [
      '2-3 cọng cần tây (còn lá)',
      '2 ly nước',
      'Màu thực phẩm xanh + đỏ',
      'Dao cắt',
    ],
    safety: ['Người lớn cắt cần tây bằng dao'],
    steps: [
      { text: 'Cắt phần đáy cần tây (~1cm) bằng dao sắc → tạo vết cắt tươi.' },
      { text: 'Đổ nước vào 2 ly, nhỏ 10-15 giọt màu vào MỖI ly (1 ly xanh, 1 ly đỏ).' },
      { text: 'Cắm 1 cọng cần tây vào ly xanh, 1 cọng vào ly đỏ.', emoji: '🟢🔴' },
      { text: 'Đặt nơi sáng, không nắng gắt.' },
      { text: 'Sau 2 tiếng: thấy gân lá đổi màu nhạt nhẹ.' },
      { text: 'Sau 6 tiếng: thân + gân lá rõ màu.', emoji: '🌈' },
      { text: 'Sau 24 tiếng: lá có vân đỏ/xanh đẹp như tranh!' },
      { text: 'Cắt ngang cần tây → thấy CHẤM màu nhỏ rải rác (xylem).', tip: 'Đếm số chấm để biết số mạch dẫn.' },
      { text: 'Thử nâng cao: chẻ đôi cần tây, cắm 2 nửa vào 2 ly màu khác nhau → 1 cây 2 màu!' },
    ],
    expectedResult: 'Lá cần tây có gân màu rõ rệt. Cắt ngang thấy ~7-10 mạch xylem.',
    principle: 'Cây dẫn nước từ rễ → lá qua mạch xylem (gỗ). Cơ chế: bốc hơi qua lá → kéo nước lên (mao dẫn + sức căng nước). Màu đi cùng nước → hiển thị mạch.',
    variations: [
      'Thay cần tây bằng hoa cẩm chướng trắng → hoa đổi màu',
      'So sánh cần tây ngắn vs dài → cái nào nhanh hơn',
      'Đo lượng nước hút trong 24h',
    ],
  },

  // ═══ QUANG HỌC ═══════════════════════════════════════════════════
  {
    id: 'periscope',
    title: 'Kính tiềm vọng giấy',
    category: 'optics',
    difficulty: 'medium',
    duration: '45 phút',
    ageRange: '8-14 tuổi',
    emoji: '🔭',
    description: 'Nhìn qua tường! Kính tiềm vọng dùng 2 gương phản xạ — như tàu ngầm.',
    materials: [
      '1 hộp giấy cứng (hộp ngũ cốc) 30cm dài',
      '2 gương nhỏ vuông 5×5cm (gương tròn cũng được)',
      'Kéo + thước + bút',
      'Băng keo + keo dán',
      'Bìa cứng để tạo giá đỡ gương',
    ],
    safety: ['Cẩn thận với gương — không làm vỡ', 'Người lớn cắt giấy cứng'],
    steps: [
      { text: 'Lấy hộp giấy hình hộp chữ nhật dài 30cm. Đặt đứng (chiều dọc).' },
      { text: 'Tại đầu TRÊN, cắt 1 ô vuông 5×5cm ở 1 mặt (gọi là mặt A).', emoji: '✂️' },
      { text: 'Tại đầu DƯỚI, cắt 1 ô vuông 5×5cm ở MẶT ĐỐI DIỆN (mặt B).', tip: 'Mặt A và B nằm ở 2 đầu chéo nhau.' },
      { text: 'Bên trong hộp, gắn gương 1 nghiêng 45° tại đầu trên, đối diện ô A.', warning: 'Góc 45° QUAN TRỌNG — gương dán sai góc sẽ không nhìn thấy.' },
      { text: 'Mặt phản xạ của gương hướng XUỐNG, nghiêng sao cho ánh sáng từ ô A đập vào gương → phản xạ thẳng xuống.' },
      { text: 'Gắn gương 2 nghiêng 45° tại đầu dưới, đối diện ô B. Mặt phản xạ HƯỚNG LÊN.' },
      { text: 'Ánh sáng từ ô A → gương 1 (đi xuống) → gương 2 (đi ngang) → ra mắt người nhìn.' },
      { text: 'Đậy nắp hộp, ép chặt. Dán keo.' },
      { text: 'Nhìn vào ô B → bạn thấy cảnh phía trên (qua ô A)!', emoji: '👁️' },
      { text: 'Thử: giấu mình sau ghế, đẩy kính tiềm vọng lên — nhìn người khác mà họ không thấy.' },
    ],
    expectedResult: 'Nhìn qua kính tiềm vọng thấy được cảnh trên cao mà mình không thể nhìn trực tiếp.',
    principle: 'Định luật phản xạ: góc tới = góc phản xạ. 2 gương đặt 45° → tia sáng đổi hướng 2 lần, đi qua "ống" và ra mắt nhìn.',
    variations: [
      'Thay gương phẳng bằng gương cầu → ảnh phóng to',
      'Thay 2 gương bằng 4 gương (đường zigzag) — tiềm vọng dài hơn',
      'Thiết kế tiềm vọng quay vòng → nhìn 360°',
    ],
  },
  {
    id: 'sundial',
    title: 'Đồng hồ mặt trời',
    category: 'optics',
    difficulty: 'medium',
    duration: '60 phút',
    ageRange: '10-15 tuổi',
    emoji: '☀️',
    description: 'Đồng hồ chỉ giờ bằng bóng nắng — không cần pin, dùng 1000 năm trước.',
    materials: [
      '1 bìa cứng tròn đường kính 25cm',
      '1 que tre/đũa thẳng dài 15cm',
      'Thước đo độ + bút',
      'La bàn (hoặc smartphone)',
    ],
    safety: ['Không nhìn trực tiếp mặt trời', 'Đeo mũ khi đo ngoài trời'],
    steps: [
      { text: 'Cắt bìa thành hình tròn đường kính 25cm.' },
      { text: 'Đánh dấu tâm tròn. Vẽ đường thẳng từ tâm ra rìa (đường 12h).' },
      { text: 'Cắm que tre tại tâm, NGHIÊNG về hướng Bắc với GÓC bằng vĩ độ địa phương.', tip: 'Hà Nội ~21°, Sài Gòn ~10.7°, Đà Lạt ~11.9°. Tra Google "vĩ độ [thành phố]".' },
      { text: 'Đặt mặt đồng hồ HƯỚNG MẶT BẮC (dùng la bàn).' },
      { text: 'Ngày nắng đẹp, ra ngoài lúc 6h sáng. Đánh dấu vị trí bóng que tại 6h trên đĩa.', emoji: '🌅' },
      { text: 'Quay lại đúng 7h → đánh dấu. Tiếp tục mỗi giờ đến 18h.', tip: 'Nếu không có thời gian, chỉ cần đánh dấu 6-12-18h rồi nội suy.' },
      { text: 'Vẽ các vạch chỉ giờ từ tâm ra rìa, dán số đẹp.' },
      { text: 'Trang trí + sơn màu cho đẹp.' },
      { text: 'Ngày hôm sau dùng được! Xem bóng → biết giờ.', emoji: '⏰' },
    ],
    expectedResult: 'Đồng hồ mặt trời đọc được giờ với sai số ±15 phút (do mùa và vùng đất).',
    principle: 'Trái đất quay 360° trong 24 giờ → 15°/giờ. Que tre nghiêng theo trục Trái đất → bóng di chuyển đều theo các vạch giờ.',
    variations: [
      'Sundial hình ngang (que vuông góc) — chỉ chính xác 1 mùa',
      'Sundial Equatorial — đĩa tròn nghiêng theo xích đạo, các vạch giờ ĐỀU',
      'So sánh đồng hồ mặt trời với đồng hồ điện tử — sai bao nhiêu phút?',
    ],
  },
  {
    id: 'rainbow-prism',
    title: 'Cầu vồng nhân tạo bằng ly nước',
    category: 'optics',
    difficulty: 'easy',
    duration: '10 phút',
    ageRange: '6-12 tuổi',
    emoji: '🌈',
    description: 'Phân tích ánh sáng trắng thành 7 màu giống cầu vồng. Hiện tượng tán sắc.',
    materials: [
      '1 ly thuỷ tinh đầy nước',
      '1 gương nhỏ (hoặc CD đĩa)',
      'Giấy trắng',
      'Đèn pin sáng hoặc ánh nắng',
    ],
    safety: ['Cẩn thận với gương'],
    steps: [
      { text: 'Đặt ly nước ở cửa sổ có ánh nắng.' },
      { text: 'Đặt gương nhỏ NGHIÊNG (~45°) trong ly, một nửa chìm trong nước.' },
      { text: 'Đặt tờ giấy trắng trên bàn cách ly ~20cm.' },
      { text: 'Điều chỉnh gương sao cho ánh nắng → gương → giấy.', emoji: '☀️' },
      { text: 'Quan sát: cầu vồng đẹp xuất hiện trên giấy!', emoji: '🌈' },
      { text: 'Đếm các màu: Đỏ - Cam - Vàng - Lục - Lam - Chàm - Tím (7 màu)' },
      { text: 'Thay đổi góc gương → cầu vồng dịch chuyển + đổi cường độ.' },
      { text: 'Thử thay ánh nắng bằng đèn pin LED → ít cầu vồng hơn (LED không có đủ phổ).' },
    ],
    expectedResult: 'Cầu vồng 7 màu rõ trên giấy. Đỏ ở đầu, tím ở cuối.',
    principle: 'Ánh sáng trắng = tổng 7 màu. Khi đi qua môi trường khác (nước, kính), mỗi màu lệch khác nhau do bước sóng khác → tách thành phổ. Tím lệch nhiều nhất, đỏ lệch ít nhất.',
    variations: [
      'Thay nước bằng dầu, glycerin → cầu vồng khác',
      'Phun sương khi ngược nắng → cầu vồng thật',
      'Dùng prism kính (lăng kính) tam giác — sắc nét hơn',
    ],
  },

  // ═══ ROBOTICS ═══════════════════════════════════════════════════
  {
    id: 'vibrating-robot',
    title: 'Robot rung (Bristlebot)',
    category: 'robotics',
    difficulty: 'easy',
    duration: '30 phút',
    ageRange: '8-14 tuổi',
    emoji: '🤖',
    description: 'Robot tí hon chạy lúc lắc bằng động cơ rung và bàn chải đánh răng.',
    materials: [
      '1 bàn chải đánh răng (lông sạch, đầu rộng)',
      '1 motor rung (lấy từ điện thoại cũ hoặc mua online ~10k)',
      '1 pin nút (CR2032 hoặc 1.5V AAA)',
      'Băng keo 2 mặt',
      'Mắt giấy decor',
    ],
    safety: ['Pin nút NGUY HIỂM nếu nuốt — không cho trẻ <3 tuổi', 'Dây điện cẩn thận chạm vào nhau'],
    steps: [
      { text: 'Cắt phần cán bàn chải, chỉ giữ đầu (phần có lông).', warning: 'Người lớn cắt giúp — bàn chải cứng.' },
      { text: 'Dán motor rung lên LƯNG đầu bàn chải bằng băng keo 2 mặt.' },
      { text: 'Dán pin nút lên trên motor, dây + chạm cực + của pin.', tip: 'Pin CR2032 có 2 mặt: mặt phẳng to (−), mặt nhỏ có chữ (+).' },
      { text: 'Dây − của motor chạm cực − của pin → mạch kín → motor rung.' },
      { text: 'Đặt robot xuống bàn → robot chạy lúc lắc!', emoji: '🏃' },
      { text: 'Quan sát: lông bàn chải nghiêng → mỗi lần rung, đẩy robot tiến lên.' },
      { text: 'Trang trí: dán mắt + miệng → robot đáng yêu.' },
      { text: 'Đua robot với bạn — ai chạy nhanh hơn?' },
    ],
    expectedResult: 'Robot chạy lúc lắc tốc độ ~5-10 cm/s. Vui và sống động.',
    principle: 'Motor rung tạo lực không cân bằng → toàn bộ robot rung. Lông bàn chải nghiêng → mỗi lần rung, hệ thống tịnh tiến theo hướng lông cong.',
    variations: [
      'Đua đường thẳng / cua vòng',
      'Lông cắt ngắn → robot xoay vòng',
      'Thêm 2 chân giấy → robot 2 chân lúc lắc',
      'Sumo robot: 2 robot trong vòng tròn — ai bị đẩy ra trước thua',
    ],
  },
  {
    id: 'arduino-led-blink',
    title: 'Arduino LED nhấp nháy đầu tiên',
    category: 'robotics',
    difficulty: 'medium',
    duration: '40 phút',
    ageRange: '12-18 tuổi',
    emoji: '💡',
    description: 'Bài "Hello World" của Arduino — LED nháy 1 giây một lần.',
    materials: [
      '1 board Arduino Uno (hoặc tương thích)',
      '1 đèn LED (bất kỳ màu)',
      '1 điện trở 220Ω',
      '1 breadboard mini',
      '2 dây jumper',
      'Cáp USB type-B (đi kèm Arduino)',
      'Máy tính có Arduino IDE',
    ],
    safety: ['Tắt nguồn USB khi cắm dây để tránh chập', 'KHÔNG dùng điện trở < 220Ω → LED cháy'],
    steps: [
      { text: 'Tải Arduino IDE: https://arduino.cc/en/software (miễn phí).', emoji: '💻' },
      { text: 'Mở IDE → File → Examples → Basics → Blink.' },
      { text: 'Cắm chân dài của LED (+, anode) vào hàng 1 trên breadboard.' },
      { text: 'Cắm chân ngắn của LED (−, cathode) vào hàng 2.' },
      { text: 'Cắm điện trở 220Ω từ hàng 2 sang hàng 3.' },
      { text: 'Dây jumper từ hàng 1 → chân số 13 trên Arduino.' },
      { text: 'Dây jumper từ hàng 3 → chân GND trên Arduino.' },
      { text: 'Cắm cáp USB vào máy tính → Arduino sáng đèn nguồn.' },
      { text: 'Trong IDE: Tools → Board → "Arduino Uno". Tools → Port → chọn cổng (Mac: /dev/cu.usb..., Win: COM3 / COM4...)' },
      { text: 'Bấm nút Upload (mũi tên → bên trên).', emoji: '⬆️' },
      { text: 'LED bắt đầu nháy: ON 1 giây → OFF 1 giây → lặp lại mãi mãi!', emoji: '🌟' },
      { text: 'Nâng cao: sửa code `delay(1000)` thành `delay(100)` → nháy nhanh hơn. Upload lại.' },
    ],
    expectedResult: 'LED sáng/tắt mỗi 1 giây. Khi sửa code, tốc độ đổi.',
    principle: 'Arduino là vi điều khiển — chạy code lặp lại. `digitalWrite(13, HIGH)` → 5V ra chân 13 → LED sáng. `LOW` → 0V → tắt. `delay()` → đợi N ms.',
    variations: [
      'Thay 1 LED bằng 4 LED → nháy lần lượt (chạy đèn)',
      'Đọc nút bấm → khi bấm thì LED sáng',
      'Cảm biến ánh sáng LDR → tự bật LED khi tối',
      'IoT: gửi data qua WiFi (ESP8266/ESP32 thay Arduino)',
    ],
  },

  // ═══ THÊM ═══════════════════════════════════════════════════════
  {
    id: 'lava-lamp',
    title: 'Đèn lava DIY (không cần điện)',
    category: 'chemistry',
    difficulty: 'easy',
    duration: '20 phút',
    ageRange: '8-14 tuổi',
    emoji: '🪔',
    description: 'Bóng dầu màu nổi lên - chìm xuống liên tục giống đèn lava bán ngoài hàng.',
    materials: [
      '1 chai nhựa trong cao ~30cm',
      'Dầu thực vật (~2/3 chai)',
      'Nước (~1/3 chai)',
      'Màu thực phẩm bất kỳ',
      'Viên Alka-Seltzer hoặc viên C sủi (vitamin C)',
      'Đèn pin nhỏ (để chiếu từ dưới)',
    ],
    safety: ['Đậy nắp chai chặt khi lắc — dầu vương vãi'],
    steps: [
      { text: 'Đổ dầu thực vật vào chai đến 2/3.' },
      { text: 'Thêm nước cho đến gần đầy (chừa khoảng 2cm).', tip: 'Dầu nhẹ hơn → nước chìm xuống đáy. Tự tách thành 2 lớp.' },
      { text: 'Nhỏ 10-15 giọt màu thực phẩm.', emoji: '💧' },
      { text: 'Quan sát: giọt màu chìm qua dầu → tới lớp nước → tan ra.' },
      { text: 'Bẻ viên C sủi thành 4-6 mảnh.' },
      { text: 'Thả 1 mảnh vào chai → đợi vài giây.' },
      { text: 'BÙM! Bọt màu nổi lên từ đáy chai → đến trên thì chìm xuống. Liên tục!', emoji: '🌋' },
      { text: 'Chiếu đèn pin từ dưới đáy chai → giống đèn lava thật.' },
      { text: 'Khi hết sủi (5-10 phút), thả viên mới → "đèn lava" tiếp tục.' },
    ],
    expectedResult: 'Bọt màu chuyển động lên xuống liên tục 5-10 phút mỗi viên C.',
    principle: 'Dầu < nước (mật độ). Viên C trong nước → CO₂ thoát ra → khí dính vào giọt nước màu → tổng khối nhẹ → nổi lên. Đến mặt thoát khí → giọt nặng lại → chìm.',
    variations: [
      'Thay viên C bằng muối — chỉ chìm 1 lần (không liên tục)',
      'Thử nước + cồn pha 50/50 (cồn ít đặc hơn nước)',
      'Đèn lava dài 50cm bằng chai 1.5L',
    ],
  },
  {
    id: 'kazoo-instrument',
    title: 'Kèn Kazoo bằng giấy',
    category: 'optics',  // really sound/wave but put under optics→ change to mechanics for waves
    difficulty: 'easy',
    duration: '15 phút',
    ageRange: '7-12 tuổi',
    emoji: '🎺',
    description: 'Nhạc cụ tự chế tạo âm bằng cộng hưởng. Hú lên như sáo Pan!',
    materials: [
      '1 ống giấy (lõi giấy vệ sinh hoặc lõi giấy bạc)',
      '1 giấy gói thực phẩm (sáp paper)',
      'Băng keo',
      'Bút màu để vẽ',
    ],
    safety: ['An toàn 100%'],
    steps: [
      { text: 'Lấy ống lõi giấy vệ sinh dài 10-15cm.' },
      { text: 'Cắt 1 ô vuông 4×4cm khoảng giữa ống.', emoji: '✂️' },
      { text: 'Lấy giấy gói/giấy bạc, cắt hình vuông 5×5cm.' },
      { text: 'Đậy giấy gói lên 1 đầu ống, kéo chặt như cái trống.' },
      { text: 'Dán giấy gói bằng băng keo bao quanh đầu ống.', tip: 'Phải KÉO CĂNG giấy — nếu lỏng thì không có âm.' },
      { text: 'Trang trí ống bằng bút màu.' },
      { text: 'Hứm vào đầu KIA (đầu hở, không có giấy) → giấy rung → âm phát ra!', emoji: '🎵' },
      { text: 'Nâng cao: cắt thêm 3 lỗ trên ống → bịt/mở các lỗ để đổi nốt.' },
    ],
    expectedResult: 'Khi hứm vào, kèn phát ra âm như chú ong vo ve.',
    principle: 'Hứm vào → không khí làm giấy rung (dao động) → tạo sóng âm. Tần số phụ thuộc độ căng của giấy + chiều dài ống.',
    variations: [
      'Ống dài hơn → âm trầm hơn',
      'Giấy mỏng (cellophane) → âm chói. Giấy dày → âm trầm hơn',
      'Cắt nhiều lỗ → "sáo" — bịt/mở để chơi giai điệu',
    ],
  },
]

// ─── Component ───────────────────────────────────────────────────

export default function StemDIYLibrary() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<Category | null>(null)
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | null>(null)
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('stem-diy-favorites')
      if (raw) setFavorites(new Set(JSON.parse(raw)))
    } catch { /* ignore */ }
  }, [])

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem('stem-diy-favorites', JSON.stringify([...next])) } catch { /* quota */ }
      return next
    })
  }

  const filtered = useMemo(() => {
    let list = PROJECTS
    if (filterCategory) list = list.filter((p) => p.category === filterCategory)
    if (filterDifficulty) list = list.filter((p) => p.difficulty === filterDifficulty)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.materials.some((m) => m.toLowerCase().includes(q))
      )
    }
    return list
  }, [filterCategory, filterDifficulty, search])

  const selected = selectedId ? PROJECTS.find((p) => p.id === selectedId) : null

  if (selected) {
    return <DIYDetail project={selected} onBack={() => setSelectedId(null)}
      isFavorite={favorites.has(selected.id)} onToggleFav={() => toggleFav(selected.id)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/15 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                Thư viện DIY STEM
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                {PROJECTS.length} dự án tự làm theo bước · Hướng dẫn chi tiết · An toàn cho HS
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 mb-5 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm dự án theo tên, mô tả, vật liệu..."
              className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm outline-none focus:border-emerald-500/40 text-white placeholder:text-white/30"
            />
          </div>
          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-white/55" />
            <span className="text-xs text-white/55 font-bold uppercase">Chủ đề:</span>
            <button onClick={() => setFilterCategory(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                !filterCategory ? 'bg-white/[0.15] text-white' : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08]'
              }`}>
              Tất cả
            </button>
            {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
              const meta = CATEGORY_META[c]
              const Icon = meta.icon
              const active = filterCategory === c
              return (
                <button key={c} onClick={() => setFilterCategory(active ? null : c)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition border"
                  style={{
                    background: active ? `${meta.accent}25` : 'rgba(255,255,255,0.04)',
                    borderColor: active ? meta.accent : 'rgba(255,255,255,0.08)',
                    color: active ? meta.accent : 'rgba(255,255,255,0.55)',
                  }}>
                  <Icon className="w-3 h-3" /> {meta.label}
                </button>
              )
            })}
          </div>
          {/* Difficulty filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Award className="w-3.5 h-3.5 text-white/55" />
            <span className="text-xs text-white/55 font-bold uppercase">Độ khó:</span>
            <button onClick={() => setFilterDifficulty(null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                !filterDifficulty ? 'bg-white/[0.15] text-white' : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08]'
              }`}>
              Tất cả
            </button>
            {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => {
              const meta = DIFFICULTY_META[d]
              const active = filterDifficulty === d
              return (
                <button key={d} onClick={() => setFilterDifficulty(active ? null : d)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition border ${
                    active ? 'bg-white/[0.15] border-white/[0.3]' : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                  } ${meta.color}`}>
                  {meta.stars} {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Results count */}
        <div className="text-xs text-white/50 mb-3">
          Hiển thị <strong className="text-white">{filtered.length}</strong> dự án
          {favorites.size > 0 && <> · Đã lưu yêu thích: <strong className="text-rose-300">{favorites.size}</strong></>}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-white/[0.08] py-16 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-white/20 mb-3" />
            <p className="text-white/45 text-sm">Không tìm thấy dự án nào khớp bộ lọc.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p}
                isFavorite={favorites.has(p.id)}
                onToggleFav={() => toggleFav(p.id)}
                onClick={() => setSelectedId(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function ProjectCard({ project, isFavorite, onToggleFav, onClick }: {
  project: DIYProject
  isFavorite: boolean
  onToggleFav: () => void
  onClick: () => void
}) {
  const catMeta = CATEGORY_META[project.category]
  const diffMeta = DIFFICULTY_META[project.difficulty]
  const Icon = catMeta.icon
  return (
    <div onClick={onClick}
      className="group cursor-pointer rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all overflow-hidden">
      <div className="p-4 relative">
        <button onClick={(e) => { e.stopPropagation(); onToggleFav() }}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-white/[0.08] transition">
          <Heart className={`w-4 h-4 transition ${isFavorite ? 'fill-rose-400 text-rose-400' : 'text-white/30'}`} />
        </button>
        <div className="flex items-start gap-3 mb-2">
          <div className="text-4xl">{project.emoji}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-white pr-6 line-clamp-2 group-hover:text-emerald-200 transition">
              {project.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
                style={{ background: `${catMeta.accent}20`, color: catMeta.accent, border: `1px solid ${catMeta.accent}40` }}>
                <Icon className="w-2.5 h-2.5" /> {catMeta.label}
              </span>
              <span className={`text-[10px] font-bold ${diffMeta.color}`}>
                {diffMeta.stars} {diffMeta.label}
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-white/55 line-clamp-2 mb-3 leading-relaxed">
          {project.description}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-white/45">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {project.duration}</span>
          <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {project.ageRange}</span>
          <span className="ml-auto flex items-center gap-1 text-emerald-300 font-bold">
            <ListChecks className="w-3 h-3" /> {project.steps.length} bước
          </span>
        </div>
      </div>
    </div>
  )
}

function DIYDetail({ project, onBack, isFavorite, onToggleFav }: {
  project: DIYProject
  onBack: () => void
  isFavorite: boolean
  onToggleFav: () => void
}) {
  const catMeta = CATEGORY_META[project.category]
  const diffMeta = DIFFICULTY_META[project.difficulty]
  const Icon = catMeta.icon
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  const toggleStep = (idx: number) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/15 to-slate-950 text-white/90">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <button onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-sm font-bold transition">
            <ArrowLeft className="w-4 h-4" /> Trở lại thư viện
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onToggleFav}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-sm font-bold flex items-center gap-1.5 transition">
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
              {isFavorite ? 'Đã lưu' : 'Lưu'}
            </button>
            <button onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 text-sm font-bold flex items-center gap-1.5 transition">
              <Printer className="w-3.5 h-3.5" /> In PDF
            </button>
          </div>
        </div>

        {/* Title + meta */}
        <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="text-6xl">{project.emoji}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              <p className="text-sm text-white/65 mt-1 leading-relaxed">{project.description}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                  style={{ background: `${catMeta.accent}20`, color: catMeta.accent, border: `1px solid ${catMeta.accent}40` }}>
                  <Icon className="w-3 h-3" /> {catMeta.label}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${diffMeta.color} bg-white/[0.05] border border-white/[0.08]`}>
                  {diffMeta.stars} {diffMeta.label}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-white/[0.05] border border-white/[0.08] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {project.duration}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-white/[0.05] border border-white/[0.08] flex items-center gap-1">
                  <Award className="w-3 h-3" /> {project.ageRange}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Materials */}
        <div className="rounded-2xl bg-amber-500/[0.06] border border-amber-500/25 p-5 mb-4">
          <h2 className="font-bold text-amber-300 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Vật liệu cần chuẩn bị
          </h2>
          <ul className="space-y-1.5">
            {project.materials.map((m, i) => (
              <li key={i} className="text-sm text-white/75 flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">▸</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Safety */}
        <div className="rounded-2xl bg-rose-500/[0.06] border border-rose-500/25 p-5 mb-4">
          <h2 className="font-bold text-rose-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> An toàn — ĐỌC KỸ TRƯỚC KHI LÀM
          </h2>
          <ul className="space-y-1.5">
            {project.safety.map((s, i) => (
              <li key={i} className="text-sm text-white/75 flex items-start gap-2">
                <span className="text-rose-400 font-bold shrink-0">⚠</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="rounded-2xl bg-slate-900/60 border border-emerald-500/25 p-5 mb-4">
          <h2 className="font-bold text-emerald-300 mb-4 flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Các bước thực hiện ({project.steps.length} bước)
          </h2>
          <div className="space-y-3">
            {project.steps.map((step, i) => {
              const isDone = completed.has(i)
              return (
                <div key={i} className={`rounded-xl border p-3 transition ${
                  isDone
                    ? 'bg-emerald-500/[0.08] border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/[0.08]'
                }`}>
                  <div className="flex items-start gap-3">
                    {/* Step number — clickable to mark done */}
                    <button onClick={() => toggleStep(i)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 transition border-2 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'bg-slate-900 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                      }`}>
                      {isDone ? <Check className="w-4 h-4" /> : i + 1}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${isDone ? 'text-white/55 line-through' : 'text-white/90'}`}>
                        {step.emoji && <span className="text-base mr-1">{step.emoji}</span>}
                        {step.text}
                      </p>
                      {step.warning && (
                        <div className="mt-2 p-2 rounded bg-rose-500/[0.08] border border-rose-500/25 text-[12px] text-rose-200 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{step.warning}</span>
                        </div>
                      )}
                      {step.tip && (
                        <div className="mt-2 p-2 rounded bg-cyan-500/[0.08] border border-cyan-500/25 text-[12px] text-cyan-200 flex items-start gap-1.5">
                          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{step.tip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Progress */}
          <div className="mt-4 pt-3 border-t border-emerald-500/15">
            <div className="flex items-center justify-between text-xs text-white/55 mb-2">
              <span>Tiến độ</span>
              <span className="font-mono font-bold text-emerald-300">
                {completed.size}/{project.steps.length} bước
              </span>
            </div>
            <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${(completed.size / project.steps.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Expected result */}
        <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/25 p-5 mb-4">
          <h2 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Kết quả mong đợi
          </h2>
          <p className="text-sm text-white/75 leading-relaxed">{project.expectedResult}</p>
        </div>

        {/* Principle */}
        {project.principle && (
          <div className="rounded-2xl bg-violet-500/[0.06] border border-violet-500/25 p-5 mb-4">
            <h2 className="font-bold text-violet-300 mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Nguyên lý khoa học
            </h2>
            <p className="text-sm text-white/75 leading-relaxed">{project.principle}</p>
          </div>
        )}

        {/* Variations */}
        {project.variations && project.variations.length > 0 && (
          <div className="rounded-2xl bg-cyan-500/[0.06] border border-cyan-500/25 p-5 mb-4">
            <h2 className="font-bold text-cyan-300 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Biến thể nâng cao — Thử thách thêm
            </h2>
            <ul className="space-y-1.5">
              {project.variations.map((v, i) => (
                <li key={i} className="text-sm text-white/75 flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom action */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/15 via-amber-500/15 to-rose-500/15 border border-amber-500/25 p-5 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-amber-300 mb-2" />
          <h3 className="font-bold text-white mb-1">Chúc bạn làm dự án thành công!</h3>
          <p className="text-xs text-white/55 mb-3">Chụp ảnh kết quả + chia sẻ với bạn bè và thầy cô</p>
          <button onClick={onBack}
            className="px-4 py-2 rounded-lg bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.15] text-sm font-bold inline-flex items-center gap-2 transition">
            <X className="w-4 h-4" /> Trở lại thư viện
          </button>
        </div>
      </div>
    </div>
  )
}
