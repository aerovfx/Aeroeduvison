/**
 * PixelAgents — AI RPG (Học qua game) v2
 *
 * Mở rộng v2:
 *   ✓ Nhạc nền procedural (Web Audio API chiptune, không cần asset ngoài)
 *   ✓ Nhiều map: campus ngoài trời + 7 toà nhà bộ môn (Toán 10, Hoá 11,
 *     Vật lý 12, Mỹ thuật 4, Sinh 9, Văn 8, Tin 7)
 *   ✓ Mỗi toà nhà có biển hiệu lớn ghi rõ môn + lớp
 *   ✓ Cửa ra/vào (door tile) → chuyển map mượt
 *   ✓ Sprite nhân vật chi tiết hơn (6 kiểu: tóc xoăn afro, tóc dài đuôi
 *     ngựa, tóc gai vàng, tóc bob đen, tóc trắng dài, tóc nâu xoăn) —
 *     khớp ảnh tham khảo
 *   ✓ Visual nội thất: bàn máy tính, kệ sách màu, máy bán hàng tự động,
 *     tủ lạnh, cây cảnh, ghế lounge — khớp ảnh tham khảo phòng làm việc
 *
 * Mục tiêu giáo dục giữ nguyên:
 *   Câu hỏi đa môn, mỗi NPC mang một personality LLM khác nhau
 *   (socratic / fact / creative / strict / confused / hint).
 *   Confused-Bot vẫn rèn critical-thinking (25% trả lời sai cố ý).
 *
 * Kỹ thuật:
 *   - Canvas 2D 100% vanilla — sprite vẽ từ rectangle.
 *   - Web Audio API procedural music — không tải file.
 *   - sessionStorage cho tiến độ.
 *   - 1 file, không phụ thuộc thư viện ngoài react-router + lucide.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Pause, Play, Trophy, Zap, Coins, Brain, RotateCcw, X, HelpCircle,
  Volume2, VolumeX, MapPin,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════ */

type Dir = 'up' | 'down' | 'left' | 'right'

type Personality =
  | 'socratic'   // Chỉ hỏi ngược lại
  | 'fact'       // Câu trả lời thẳng, khô khan
  | 'creative'   // Dùng ẩn dụ & thơ
  | 'strict'     // Nghiêm khắc, không hint
  | 'confused'   // Đôi khi đưa đáp án SAI (rèn critical thinking)
  | 'hint'       // Cho gợi ý từng bậc

type Subject = 'Toán' | 'Vật lý' | 'Hoá' | 'Sinh' | 'AI' | 'Văn' | 'Mỹ thuật' | 'Tin học' | 'Khác'

interface Question {
  q: string
  choices: string[]
  correct: number
  explain?: string
  subject: Subject
}

/** 6 kiểu sprite tương ứng 6 nhân vật ảnh tham khảo */
type SpriteStyle =
  | 'curlyAfro'      // tóc xoăn afro nâu, áo sơ mi sọc
  | 'ponytailBlonde' // tóc đuôi ngựa vàng, áo len đỏ
  | 'spikyOrange'    // tóc gai cam, áo khoác denim
  | 'bobBlack'       // tóc bob đen, áo blazer xám
  | 'longWhite'      // tóc dài trắng, áo hoodie tím
  | 'curlyBrown'     // tóc xoăn nâu, áo sơ mi xanh
  | 'player'         // sprite người chơi mặc định

interface KeyItem {
  id: string          // unique key id ('key-math10', 'key-chem11', ...)
  name: string        // 'Chìa khoá Toán 10'
  emoji: string       // '🗝️'
  color: string       // màu chủ đạo (hex) — dùng cho HUD
  subject: Subject    // môn học tương ứng
}

interface NPCSpec {
  id: string
  name: string
  emoji: string
  spriteStyle: SpriteStyle
  personality: Personality
  x: number          // tile
  y: number          // tile
  questions: Question[]
  greeting: string
  farewell: string
  wanderRadius?: number
  /** Lời giao nhiệm vụ trước khi bắt đầu test */
  missionBrief?: string
  /** Chìa khoá được trao khi hoàn thành test (teacher-guide của mỗi phòng) */
  keyReward?: KeyItem
  /** Gợi ý phòng tiếp theo sau khi nhận key */
  nextRoomHint?: string
}

interface NPC extends NPCSpec {
  defeated: boolean
  anchorX: number
  anchorY: number
  moveTimer: number
}

interface DialogState {
  npc: NPC
  phase: 'intro' | 'mission' | 'question' | 'explain' | 'reward' | 'done'
  questionIdx: number
  selected: number | null
  typedChars: number
  lastTickAt: number
  /** Số câu trả lời đúng trong phiên hiện tại (để quyết định trao key) */
  correctCount: number
}

type MapId =
  | 'campus'  | 'math10' | 'chem11' | 'phys12'
  | 'art4'    | 'bio9'   | 'lit8'   | 'cs7'

interface Landmark {
  x: number; y: number; w: number; h: number
  kind: 'building' | 'sign' | 'fountain' | 'tree' | 'lamp'
  label?: string         // dòng tiêu đề trên biển
  sublabel?: string      // dòng phụ (lớp / mô tả)
  doorTo?: MapId         // nếu là building → map đích khi vào cửa
  color?: string
}

interface MapDef {
  id: MapId
  name: string
  bgmPattern: 'campus' | 'study' | 'lab' | 'art'
  w: number              // tiles
  h: number              // tiles
  layout: string[]       // ký tự tile, mỗi dòng = 1 hàng
  npcs: NPCSpec[]
  landmarks: Landmark[]
  spawn: { x: number; y: number }  // spawn point khi load map
  exit?: { x: number; y: number; toMap: MapId; toX: number; toY: number } // door của indoor map quay về campus
  wallColor?: string
  floorColor?: string
}

interface SaveState {
  xp: number
  coins: number
  defeatedNpcIds: string[]
  /** Danh sách id các chìa khoá đã nhận */
  keys: string[]
  pos: { x: number; y: number }
  currentMap: MapId
  musicOn: boolean
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════ */

const TILE = 32                   // px / tile
const VIEW_W_TILES = 22           // chiều ngang viewport (tiles)
const VIEW_H_TILES = 14           // chiều dọc viewport
const MOVE_SPEED = 5              // tile / s
const SAVE_KEY = '__aeroedu_pixelagents_v4__'

/* ═══════════════════════════════════════════════════════════════════════
   KEY ITEMS — 7 chìa khoá tương ứng 7 môn
═══════════════════════════════════════════════════════════════════════ */

const ALL_KEYS: Record<string, KeyItem> = {
  'key-math10': { id: 'key-math10', name: 'Chìa khoá Toán 10',   emoji: '🗝️', color: '#c98c4d', subject: 'Toán' },
  'key-chem11': { id: 'key-chem11', name: 'Chìa khoá Hoá 11',    emoji: '🗝️', color: '#7d8ec4', subject: 'Hoá' },
  'key-phys12': { id: 'key-phys12', name: 'Chìa khoá Vật lý 12', emoji: '🗝️', color: '#9c4444', subject: 'Vật lý' },
  'key-art4':   { id: 'key-art4',   name: 'Chìa khoá Mỹ thuật 4',emoji: '🗝️', color: '#c47cb0', subject: 'Mỹ thuật' },
  'key-bio9':   { id: 'key-bio9',   name: 'Chìa khoá Sinh 9',    emoji: '🗝️', color: '#5e9c5e', subject: 'Sinh' },
  'key-lit8':   { id: 'key-lit8',   name: 'Chìa khoá Văn 8',     emoji: '🗝️', color: '#c4a85e', subject: 'Văn' },
  'key-cs7':    { id: 'key-cs7',    name: 'Chìa khoá Tin 7',     emoji: '🗝️', color: '#5ec4c4', subject: 'Tin học' },
}
const TOTAL_KEYS = Object.keys(ALL_KEYS).length
const NPC_RESPAWN_MS = 0          // không respawn — defeated là vĩnh viễn

/* ═══════════════════════════════════════════════════════════════════════
   QUESTION BANK — chia theo subject
═══════════════════════════════════════════════════════════════════════ */

const Q_MATH: Question[] = [
  { subject: 'Toán', q: 'Đạo hàm của f(x) = x³ + 2x là?', choices: ['3x² + 2', '3x² + 2x', 'x² + 2', '3x³ + 2'], correct: 0, explain: 'Đạo hàm xⁿ = n·xⁿ⁻¹, cộng thêm đạo hàm 2x = 2.' },
  { subject: 'Toán', q: 'Nghiệm phương trình x² - 5x + 6 = 0 là?', choices: ['1 và 6', '2 và 3', '-2 và -3', '0 và 5'], correct: 1, explain: 'Δ = 25 - 24 = 1 → x = (5 ± 1)/2 = {2, 3}.' },
  { subject: 'Toán', q: 'sin²x + cos²x = ?', choices: ['0', '1', '2', 'tan x'], correct: 1, explain: 'Định lý Pythagore lượng giác cơ bản.' },
  { subject: 'Toán', q: 'Hàm y = log₂(x) đồng biến trên?', choices: ['(-∞,0)', '(0,+∞)', 'ℝ', '(0,1)'], correct: 1, explain: 'Log cơ số > 1 đồng biến trên (0, +∞).' },
]

const Q_PHYSICS: Question[] = [
  { subject: 'Vật lý', q: 'Đơn vị của lực trong hệ SI?', choices: ['Joule', 'Newton', 'Watt', 'Pascal'], correct: 1, explain: '1 N = 1 kg·m/s².' },
  { subject: 'Vật lý', q: 'Tốc độ ánh sáng trong chân không xấp xỉ?', choices: ['3×10⁵ m/s', '3×10⁶ m/s', '3×10⁸ m/s', '3×10¹⁰ m/s'], correct: 2, explain: 'c ≈ 299 792 458 m/s ≈ 3×10⁸ m/s.' },
  { subject: 'Vật lý', q: 'Định luật II Newton: F = ?', choices: ['m·a', 'm/a', 'm·v', 'm·g'], correct: 0, explain: 'Lực = khối lượng × gia tốc.' },
  { subject: 'Vật lý', q: 'Sóng âm là sóng?', choices: ['Ngang', 'Dọc', 'Điện từ', 'Đứng'], correct: 1, explain: 'Phần tử môi trường dao động theo phương truyền sóng.' },
]

const Q_CHEM: Question[] = [
  { subject: 'Hoá', q: 'Công thức axit sunfuric?', choices: ['HCl', 'H₂SO₄', 'HNO₃', 'H₂CO₃'], correct: 1, explain: 'H₂SO₄ — axit mạnh, hai nấc.' },
  { subject: 'Hoá', q: 'Số nguyên tử Carbon trong CH₄?', choices: ['1', '2', '4', '5'], correct: 0, explain: 'Methane — 1 C, 4 H.' },
  { subject: 'Hoá', q: 'pH của dung dịch trung tính ở 25°C?', choices: ['0', '7', '14', '10'], correct: 1, explain: 'Trung tính ↔ [H⁺] = [OH⁻] = 10⁻⁷ M → pH = 7.' },
  { subject: 'Hoá', q: 'Khí nào duy trì sự cháy?', choices: ['N₂', 'O₂', 'CO₂', 'H₂'], correct: 1, explain: 'Oxy là chất oxi hoá phổ biến nhất.' },
]

const Q_BIO: Question[] = [
  { subject: 'Sinh', q: 'Đơn vị cấu tạo của sinh vật là?', choices: ['Mô', 'Tế bào', 'Cơ quan', 'Hệ cơ quan'], correct: 1 },
  { subject: 'Sinh', q: 'Ti thể có chức năng?', choices: ['Tổng hợp protein', 'Hô hấp tế bào', 'Quang hợp', 'Lưu trữ ADN'], correct: 1, explain: 'Ti thể tạo ATP qua hô hấp tế bào.' },
  { subject: 'Sinh', q: 'ADN được cấu tạo từ mấy loại nucleotide?', choices: ['2', '3', '4', '5'], correct: 2, explain: 'A, T, G, C.' },
]

const Q_AI: Question[] = [
  { subject: 'AI', q: 'LLM viết tắt của?', choices: ['Linear Logic Module', 'Large Language Model', 'Long Latent Map', 'Layered Learning Method'], correct: 1 },
  { subject: 'AI', q: 'Loại học nào không cần nhãn dữ liệu?', choices: ['Supervised', 'Unsupervised', 'Reinforcement', 'Transfer'], correct: 1, explain: 'Học không giám sát tự tìm cấu trúc trong dữ liệu.' },
  { subject: 'AI', q: 'Kỹ thuật nào giúp LLM "nghĩ từng bước"?', choices: ['Chain of Thought', 'Dropout', 'Backprop', 'Pooling'], correct: 0 },
]

const Q_LIT: Question[] = [
  { subject: 'Văn', q: 'Tác giả "Truyện Kiều"?', choices: ['Hồ Xuân Hương', 'Nguyễn Du', 'Nguyễn Trãi', 'Tản Đà'], correct: 1 },
  { subject: 'Văn', q: 'Thể thơ "lục bát" có cấu trúc?', choices: ['6-8', '7-7', '5-5', '8-8'], correct: 0, explain: 'Câu 6 chữ rồi câu 8 chữ xen kẽ.' },
  { subject: 'Văn', q: 'Biện pháp tu từ "Mặt trời của bắp" là?', choices: ['So sánh', 'Ẩn dụ', 'Hoán dụ', 'Nhân hoá'], correct: 1, explain: 'Mặt trời ẩn dụ cho mẹ — nguồn sống.' },
]

const Q_ART: Question[] = [
  { subject: 'Mỹ thuật', q: 'Ba màu cơ bản trong hội hoạ?', choices: ['Đỏ-Xanh-Vàng', 'Đỏ-Xanh-Tím', 'Cam-Lục-Tím', 'Đen-Trắng-Xám'], correct: 0 },
  { subject: 'Mỹ thuật', q: 'Màu bổ túc của màu Đỏ là?', choices: ['Xanh lục', 'Vàng', 'Cam', 'Tím'], correct: 0, explain: 'Đối diện trên bánh xe màu.' },
  { subject: 'Mỹ thuật', q: 'Hoạ sĩ vẽ "Đêm đầy sao" là?', choices: ['Picasso', 'Monet', 'Van Gogh', 'Da Vinci'], correct: 2 },
]

const Q_CS: Question[] = [
  { subject: 'Tin học', q: 'CPU viết tắt của?', choices: ['Central Processing Unit', 'Computer Personal Unit', 'Control Power Unit', 'Code Process Unit'], correct: 0 },
  { subject: 'Tin học', q: 'Số nhị phân 1011 = ? (thập phân)', choices: ['9', '10', '11', '12'], correct: 2, explain: '1·8 + 0·4 + 1·2 + 1·1 = 11.' },
  { subject: 'Tin học', q: 'HTML dùng để?', choices: ['Lập trình logic', 'Mô tả cấu trúc trang web', 'Tạo cơ sở dữ liệu', 'Vẽ đồ hoạ 3D'], correct: 1 },
]

/* ── Outdoor campus teachers ──────────────────────────────────────── */
const Q_PRINCIPAL: Question[] = [
  { subject: 'Khác', q: 'Khi gặp thầy cô trong trường, cách chào phù hợp nhất?', choices: ['Phớt lờ đi qua', 'Cúi đầu chào lịch sự', 'Hét lớn "Hi!"', 'Giơ tay bắt tay trước'], correct: 1 },
  { subject: 'Khác', q: 'Lộ trình học tập khuyến nghị bắt đầu từ phòng nào?', choices: ['Tin học 7', 'Toán 10', 'Mỹ thuật 4', 'Tuỳ hứng'], correct: 1, explain: 'Đi theo thứ tự: Toán → Hoá → Lý → MT → Sinh → Văn → Tin.' },
  { subject: 'Khác', q: 'Phím nào để nói chuyện với thầy cô / NPC?', choices: ['Space', 'Enter', 'E', 'Q'], correct: 2, explain: 'Nhấn E khi đứng sát mặt NPC.' },
]

const Q_LIBRARIAN: Question[] = [
  { subject: 'Văn', q: '"Dế Mèn Phiêu Lưu Ký" là tác phẩm của?', choices: ['Nguyễn Nhật Ánh', 'Tô Hoài', 'Nam Cao', 'Vũ Trọng Phụng'], correct: 1 },
  { subject: 'Khác', q: 'Hệ thống phân loại sách phổ biến nhất ở thư viện?', choices: ['Dewey (DDC)', 'Morse', 'Gregorian', 'Kelvin'], correct: 0, explain: 'Hệ thập phân Dewey — DDC.' },
  { subject: 'Khác', q: 'Chuẩn ISBN hiện hành có bao nhiêu chữ số?', choices: ['10', '12', '13', '15'], correct: 2, explain: 'ISBN-13 từ 2007 thay thế ISBN-10.' },
]

const Q_AI_MENTOR: Question[] = [
  { subject: 'AI', q: '"Prompt" trong tương tác với LLM là?', choices: ['Dữ liệu huấn luyện', 'Câu lệnh/đề bài người dùng nhập', 'Tham số mô hình', 'Kết quả đầu ra'], correct: 1 },
  { subject: 'AI', q: 'Fine-tuning khác pre-training ở chỗ nào?', choices: ['Huấn luyện trên dữ liệu nhỏ chuyên biệt', 'Không cần GPU', 'Tạo mô hình từ số 0', 'Chỉ chạy trên CPU'], correct: 0 },
  { subject: 'AI', q: '"Hallucination" trong LLM nghĩa là?', choices: ['Lỗi phần cứng', 'Mô hình tự tin sinh ra thông tin sai sự thật', 'Chạy quá chậm', 'Thiếu RAM'], correct: 1, explain: 'LLM đôi khi tạo nội dung nghe hợp lý nhưng không có thật.' },
]

/* ── Trợ giảng (TA) bonus questions — câu ngắn, thưởng XP/coin, không khoá ── */
const Q_MATH_TA: Question[] = [
  { subject: 'Toán', q: 'Tích phân ∫2x dx = ?', choices: ['x² + C', '2 + C', 'x + C', '2x² + C'], correct: 0, explain: '∫xⁿ dx = xⁿ⁺¹/(n+1); với 2x được x² + C.' },
  { subject: 'Toán', q: 'Một tam giác vuông có 2 cạnh góc vuông 3 và 4, cạnh huyền?', choices: ['5', '6', '7', '√12'], correct: 0, explain: '√(9+16)=√25=5.' },
]

const Q_PHYS_TA: Question[] = [
  { subject: 'Vật lý', q: 'Công thức tính công (W) khi lực F đẩy vật đi quãng đường s cùng phương?', choices: ['W = F·s', 'W = F/s', 'W = F+s', 'W = s/F'], correct: 0 },
  { subject: 'Vật lý', q: 'Mạch R = 10Ω, U = 5V → dòng I bằng?', choices: ['0.5 A', '2 A', '50 A', '15 A'], correct: 0, explain: 'Ohm: I = U/R = 5/10 = 0,5 A.' },
]

const Q_CHEM_TA: Question[] = [
  { subject: 'Hoá', q: 'Khí CO₂ là sản phẩm của quá trình?', choices: ['Quang hợp', 'Hô hấp', 'Điện phân nước', 'Đông đặc'], correct: 1 },
  { subject: 'Hoá', q: 'Kim loại nào dẫn điện tốt nhất ở nhiệt độ thường?', choices: ['Đồng (Cu)', 'Bạc (Ag)', 'Vàng (Au)', 'Sắt (Fe)'], correct: 1, explain: 'Ag > Cu > Au > Al về độ dẫn điện.' },
]

const Q_BIO_TA: Question[] = [
  { subject: 'Sinh', q: 'Ribosome thực hiện chức năng gì?', choices: ['Quang hợp', 'Tổng hợp protein', 'Bài tiết chất thải', 'Phân chia tế bào'], correct: 1 },
  { subject: 'Sinh', q: 'Nhóm máu có thể nhận máu từ bất kỳ nhóm nào?', choices: ['A', 'B', 'O', 'AB'], correct: 3, explain: 'AB là nhóm "nhận phổ quát".' },
]

const Q_ART_TA: Question[] = [
  { subject: 'Mỹ thuật', q: 'Bức tranh "Mona Lisa" của ai?', choices: ['Michelangelo', 'Leonardo da Vinci', 'Rembrandt', 'Raphael'], correct: 1 },
  { subject: 'Mỹ thuật', q: 'Nguyên lý "tam giác vàng" trong bố cục nhắc đến?', choices: ['Chia ảnh thành 9 ô', 'Cân bằng đối xứng', 'Tỉ lệ vàng', 'Màu tương phản'], correct: 2, explain: 'Golden ratio ≈ 1.618 giúp bố cục hài hoà.' },
]

const Q_LIT_TA: Question[] = [
  { subject: 'Văn', q: '"Lão Hạc" của Nam Cao viết về?', choices: ['Người nông dân nghèo khổ', 'Chiến sĩ cách mạng', 'Học sinh miền núi', 'Quan lại phong kiến'], correct: 0 },
  { subject: 'Văn', q: 'Đoạn thơ 4 câu 7 chữ cuối bài gọi là thể?', choices: ['Lục bát', 'Song thất', 'Tứ tuyệt', 'Ngũ ngôn'], correct: 2, explain: 'Thất ngôn tứ tuyệt — 4 câu 7 chữ.' },
]

const Q_CS_TA: Question[] = [
  { subject: 'Tin học', q: 'Thuật toán nào có độ phức tạp O(log n) trên mảng đã sắp xếp?', choices: ['Tìm kiếm tuyến tính', 'Tìm kiếm nhị phân', 'Bubble sort', 'DFS'], correct: 1 },
  { subject: 'Tin học', q: 'Đâu là ngôn ngữ lập trình phổ biến cho học máy (ML)?', choices: ['COBOL', 'Python', 'Fortran', 'PHP'], correct: 1, explain: 'Python + NumPy/PyTorch/TensorFlow là hệ sinh thái ML hàng đầu.' },
]

const Q_GUARD: Question[] = [
  { subject: 'Khác', q: 'Giờ mở cổng trường buổi sáng (theo quy định phổ thông)?', choices: ['5:00', '6:30', '9:00', '12:00'], correct: 1, explain: 'Đa số trường phổ thông VN mở cổng ~6:30 – 7:00.' },
  { subject: 'Khác', q: 'Thấy rác trong sân trường, em nên?', choices: ['Đá sang chỗ khác', 'Nhặt bỏ thùng rác gần nhất', 'Chờ lao công', 'Chụp ảnh đăng TikTok'], correct: 1 },
]

/* ═══════════════════════════════════════════════════════════════════════
   MAP DEFINITIONS
   Tile chars:
     . = floor   # = wall      T = tree      W = water/fountain
     D = door (vào toà nhà / cửa)            S = sign post (biển nhỏ)
     B = bookshelf  C = chair  d = desk      K = kitchen counter
     V = vending    F = fridge L = lamp      P = plant  ~ = path/road
     g = grass tile (visual variant)         x = exit (về campus)
═══════════════════════════════════════════════════════════════════════ */

/* ── CAMPUS (outdoor hub — 44 × 38 tiles, có công viên phía nam) ── */
const CAMPUS_LAYOUT = (() => {
  // Pad existing interior rows to 44 wide. Border T rows become all T 44-wide.
  const OLD = [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TggggggggggggggggggggggggggggggT',
    'Tgggg########gggg########ggggggT',
    'Tgggg#......#gggg#......#gggggT',
    'Tgggg#math10#gggg#chem11#gggggT',
    'Tgggg#......#gggg#......#gggggT',
    'Tgggg###DD###gggg###DD###gggggT',
    'Tgggggg~~~~~~~~~~~~~~~~~ggggggT',
    'Tgggggg~~~~~~~~~~~~~~~~~ggggggT',
    'Tggggggg~~~~WW~~~~~~~~~~ggggggT',
    'Tgggg##DD###gggggg###DD##ggggT',
    'Tgggg#......#gggg#......#gggggT',
    'Tgggg#phys12#gggg#mythu4#gggggT',
    'Tgggg#......#gggg#......#gggggT',
    'Tgggg########gggg########ggggT',
    'Tgggggg~~~~~~~~~~~~~~~~~ggggggT',
    'Tgggggg~~~~~~~~~~~~~~~~~ggggggT',
    'Tgggg########gggg########ggggT',
    'Tgggg#......#gggg#......#gggggT',
    'Tgggg# bio9 #gggg# lit8 #gggggT',
    'Tgggg#......#gggg#......#gggggT',
    'Tgggg###DD###gggg###DD###gggggT',
    'Tgggggg~~~~~~~~~~~~~~~~~ggggggT',
    'Tgggg########ggggggggggggggggT',
    'Tgggg#......#gggggggggggggggT',
    'Tgggg# tin7 #gggggggggggggggT',
    'Tgggg#......#gggggggggggggggT',
    'Tgggg###DD###gggggggggggggggT',
    'TggggggggggggggggggggggggggggT',
  ]
  const W = 44
  const expand = (r: string): string => {
    if (/^T+$/.test(r)) return 'T'.repeat(W)
    const body = r.endsWith('T') ? r.slice(0, -1) : r
    return body.padEnd(W - 1, 'g') + 'T'
  }
  const rows = OLD.map(expand)
  // Add transition path to south park + fountain + open grass + bottom border
  const pathRow     = 'T' + 'g'.repeat(6)  + '~'.repeat(30) + 'g'.repeat(6)  + 'T' // 44
  const fountainTop = 'T' + 'g'.repeat(18) + 'WWWW' + 'g'.repeat(20)         + 'T' // 44
  const parkRow     = 'T' + 'g'.repeat(42) + 'T'                                   // 44
  const treeBorder  = 'T' + 'g'.repeat(8)  + 'T'    + 'g'.repeat(24) + 'T'    + 'g'.repeat(8) + 'T' // 44
  const bottomBord  = 'T'.repeat(W)
  rows.push(pathRow)      // y = 29 — east-west path entering park
  rows.push(fountainTop)  // y = 30 — fountain north edge
  rows.push(fountainTop)  // y = 31 — fountain south edge
  rows.push(parkRow)      // y = 32 — open grass (outdoor NPCs here)
  rows.push(parkRow)      // y = 33
  rows.push(treeBorder)   // y = 34 — decorative tree bumpers
  rows.push(parkRow)      // y = 35
  rows.push(parkRow)      // y = 36
  rows.push(bottomBord)   // y = 37 — final border
  return rows
})()

const CAMPUS_MAP: MapDef = {
  id: 'campus',
  name: 'Khu trường Aeroedu Academy',
  bgmPattern: 'campus',
  w: 44, h: 38,
  floorColor: '#7ec97e',
  wallColor: '#8b5a3c',
  layout: CAMPUS_LAYOUT,
  spawn: { x: 16, y: 8 },
  // Outdoor teachers — nói chuyện & trả lời câu hỏi bằng phím E
  npcs: [
    {
      id: 'principal', name: 'Thầy Phúc – Hiệu trưởng', emoji: '🎓',
      spriteStyle: 'longWhite', personality: 'hint',
      x: 10, y: 32, wanderRadius: 1,
      greeting: 'Chào em! Thầy là Phúc — Hiệu trưởng Aeroedu Academy.',
      missionBrief: 'Trả lời 3 câu về nề nếp & lộ trình học. Đúng từ 2/3 là đạt — không có chìa khoá nhưng được +60 XP.',
      farewell: 'Chúc em học vui vẻ. Nhớ vào từng phòng bộ môn để lấy chìa khoá.',
      nextRoomHint: 'Bắt đầu từ TOÁN 10 phía bắc khu trường.',
      questions: Q_PRINCIPAL,
    },
    {
      id: 'librarian', name: 'Cô Thư – Thủ thư', emoji: '📚',
      spriteStyle: 'bobBlack', personality: 'fact',
      x: 22, y: 33, wanderRadius: 1,
      greeting: 'Chào em! Cô Thư đây — phụ trách thư viện ngoài trời.',
      missionBrief: 'Thử 3 câu về sách & thư viện. Đúng 2/3 là tốt — +50 XP.',
      farewell: 'Hẹn gặp lại em ở thư viện nhé.',
      questions: Q_LIBRARIAN,
    },
    {
      id: 'ai-mentor', name: 'Anh Quang – Cố vấn AI', emoji: '🤖',
      spriteStyle: 'spikyOrange', personality: 'creative',
      x: 34, y: 32, wanderRadius: 1,
      greeting: 'Yo! Mình là Quang — AI mentor ngoài trời.',
      missionBrief: '3 câu về LLM & AI hiện đại. Đúng 2/3 là đạt — +70 XP.',
      farewell: 'Cùng khám phá thêm AI khi em sẵn sàng.',
      questions: Q_AI_MENTOR,
    },
    {
      id: 'guard', name: 'Bác Bảo – Bảo vệ', emoji: '👮',
      spriteStyle: 'bobBlack', personality: 'strict',
      x: 6, y: 35, wanderRadius: 1,
      greeting: 'Chào cháu! Bác Bảo đây — giữ trật tự sân trường.',
      missionBrief: '2 câu về nề nếp & vệ sinh. Đúng mỗi câu: +10 XP, +5 coin. Hỏi mấy lần cũng được.',
      farewell: 'Giữ gìn sân trường sạch sẽ nhé cháu.',
      questions: Q_GUARD,
    },
  ],
  landmarks: [
    // Buildings (signs ở tile y trên cửa)
    { x: 4,  y: 2,  w: 12, h: 5,  kind: 'building', color: '#c98c4d', label: 'TOÁN',     sublabel: 'Lớp 10', doorTo: 'math10' },
    { x: 18, y: 2,  w: 12, h: 5,  kind: 'building', color: '#7d8ec4', label: 'HOÁ',      sublabel: 'Lớp 11', doorTo: 'chem11' },
    { x: 4,  y: 10, w: 12, h: 5,  kind: 'building', color: '#9c4444', label: 'VẬT LÝ',   sublabel: 'Lớp 12', doorTo: 'phys12' },
    { x: 18, y: 10, w: 12, h: 5,  kind: 'building', color: '#c47cb0', label: 'MỸ THUẬT', sublabel: 'Lớp 4',  doorTo: 'art4' },
    { x: 4,  y: 18, w: 12, h: 5,  kind: 'building', color: '#5e9c5e', label: 'SINH HỌC', sublabel: 'Lớp 9',  doorTo: 'bio9' },
    { x: 18, y: 18, w: 12, h: 5,  kind: 'building', color: '#c4a85e', label: 'NGỮ VĂN',  sublabel: 'Lớp 8',  doorTo: 'lit8' },
    { x: 4,  y: 25, w: 12, h: 5,  kind: 'building', color: '#5ec4c4', label: 'TIN HỌC',  sublabel: 'Lớp 7',  doorTo: 'cs7' },
    // Biển lộ trình học tập đặt cạnh đài phun nước
    { x: 14, y: 7, w: 4, h: 1, kind: 'sign', label: 'LỘ TRÌNH', sublabel: 'Toán→Hoá→Lý→MT→Sinh→Văn→Tin' },
    // Đài phun nước trung tâm
    { x: 14, y: 9, w: 4, h: 2, kind: 'fountain' },
    // Biển "CÔNG VIÊN NGOÀI TRỜI" phía nam — nơi gặp các GV ngoài trời
    { x: 18, y: 29, w: 8, h: 1, kind: 'sign', label: 'CÔNG VIÊN', sublabel: 'Gặp GV ngoài trời — nhấn E để hỏi' },
    // Đài phun nước công viên
    { x: 20, y: 31, w: 4, h: 1, kind: 'fountain' },
    // Cây dọc hai bên đường
    { x: 2, y: 2, w: 1, h: 36, kind: 'tree' },
    { x: 42, y: 2, w: 1, h: 36, kind: 'tree' },
    // Đèn đường
    { x: 8, y: 16, w: 1, h: 1, kind: 'lamp' },
    { x: 24, y: 16, w: 1, h: 1, kind: 'lamp' },
    { x: 36, y: 30, w: 1, h: 1, kind: 'lamp' },
  ],
}

/* ── INDOOR MAP HELPER ─────────────────────────────────────────────
   Tất cả toà nhà bộ môn dùng chung khung 22×14 với cửa phía dưới.
═══════════════════════════════════════════════════════════════════ */

const indoorLayout = [
  '######################',
  '#....................#',
  '#.BBBBBB......BBBBBB.#',
  '#.BBBBBB......BBBBBB.#',
  '#....................#',
  '#..d=d..d=d..d=d..d=d#',
  '#..C....C....C....C..#',
  '#....................#',
  '#..PP....FF....VV..PP#',
  '#....................#',
  '#..C..C....C..C......#',
  '#..d==d....d==d......#',
  '#....................#',
  '##########DD##########',
]

function makeIndoor(
  id: MapId,
  name: string,
  bgmPattern: MapDef['bgmPattern'],
  signLabel: string,
  signSub: string,
  wallColor: string,
  floorColor: string,
  npcs: NPCSpec[],
  exitX: number,
  exitY: number,
): MapDef {
  return {
    id, name, bgmPattern,
    w: 22, h: 14,
    layout: indoorLayout,
    npcs,
    landmarks: [
      { x: 8, y: 0, w: 6, h: 1, kind: 'sign', label: signLabel, sublabel: signSub },
    ],
    spawn: { x: 11, y: 12 },
    exit: { x: 10, y: 13, toMap: 'campus', toX: exitX, toY: exitY },
    wallColor, floorColor,
  }
}

const MATH10_MAP = makeIndoor(
  'math10', 'Phòng Toán — Lớp 10', 'study',
  'TOÁN HỌC', 'Lớp 10 — Đại số & Lượng giác',
  '#c98c4d', '#f4e8d0',
  [
    { id: 'math-teacher', name: 'Thầy Khang – GV Toán 10', emoji: '📐', spriteStyle: 'spikyOrange', personality: 'hint',
      x: 11, y: 4, wanderRadius: 2,
      greeting: 'Chào em! Thầy là Khang, phụ trách Toán 10 hôm nay.',
      missionBrief: 'Nhiệm vụ: hoàn thành 4 câu hỏi về Đại số & Lượng giác. Trả lời đúng tối thiểu 3/4 để nhận CHÌA KHOÁ TOÁN. Sẵn sàng chưa?',
      farewell: 'Tốt. Tiếp tục rèn luyện.',
      nextRoomHint: 'Phòng tiếp theo: HOÁ 11 — phía đông bắc khu trường.',
      keyReward: ALL_KEYS['key-math10'],
      questions: Q_MATH },
    { id: 'math-ta', name: 'Chị Linh – Trợ giảng Toán', emoji: '✏️', spriteStyle: 'curlyAfro', personality: 'socratic',
      x: 17, y: 9, wanderRadius: 1,
      greeting: 'Ê, em luyện thêm 2 câu với chị không? Đúng là có thưởng XP + coin đó.',
      missionBrief: 'Luyện thêm 2 câu tích phân + hình học. Trả lời đúng mỗi câu: +10 XP, +5 coin. Không có chìa khoá, nhưng cần luyện cho chắc.',
      farewell: 'Chuẩn rồi! Quay lại bất cứ lúc nào muốn luyện thêm nhé.',
      questions: Q_MATH_TA },
  ],
  10, 7,
)

const CHEM11_MAP = makeIndoor(
  'chem11', 'Phòng Thí nghiệm Hoá — Lớp 11', 'lab',
  'HOÁ HỌC', 'Lớp 11 — Hoá hữu cơ',
  '#7d8ec4', '#e8eef6',
  [
    { id: 'chem-teacher', name: 'Thầy Bình – GV Hoá 11', emoji: '⚗️', spriteStyle: 'curlyBrown', personality: 'fact',
      x: 11, y: 4, wanderRadius: 2,
      greeting: 'Chào em. Ta là Bình, phụ trách Hoá hữu cơ lớp 11.',
      missionBrief: 'Nhiệm vụ: trả lời 4 câu Hoá cơ bản. Đúng tối thiểu 3/4 để nhận CHÌA KHOÁ HOÁ. Cẩn thận — Bot Lú đôi khi xuất hiện và trả lời sai cố ý để thử em.',
      farewell: 'Chính xác. Hoá học là khoa học thực nghiệm.',
      nextRoomHint: 'Phòng tiếp theo: VẬT LÝ 12 — phía tây nam.',
      keyReward: ALL_KEYS['key-chem11'],
      questions: Q_CHEM },
    { id: 'chem-ta', name: 'Chị Mai – Trợ giảng Hoá', emoji: '🧪', spriteStyle: 'ponytailBlonde', personality: 'creative',
      x: 4, y: 9, wanderRadius: 1,
      greeting: 'Hoá học như nấu ăn — quan trọng là hiểu tại sao công thức như thế. Thử 2 câu vui nhé?',
      missionBrief: 'Luyện 2 câu về quá trình hoá học quen thuộc. Đúng mỗi câu: +10 XP, +5 coin.',
      farewell: 'Tốt lắm! Giữ tinh thần tò mò nhé.',
      questions: Q_CHEM_TA },
  ],
  21, 7,
)

const PHYS12_MAP = makeIndoor(
  'phys12', 'Phòng Vật lý — Lớp 12', 'lab',
  'VẬT LÝ', 'Lớp 12 — Sóng & Điện từ',
  '#9c4444', '#f6e0e0',
  [
    { id: 'phys-teacher', name: 'Cô Hà – GV Vật lý 12', emoji: '🌊', spriteStyle: 'ponytailBlonde', personality: 'socratic',
      x: 11, y: 4, wanderRadius: 2,
      greeting: 'Chào em. Cô là Hà, dạy Vật lý 12.',
      missionBrief: 'Nhiệm vụ: làm 4 câu về Sóng & Điện từ. Em tự suy nghĩ trước, cô không trả lời thay đâu. Đúng 3/4 → nhận CHÌA KHOÁ VẬT LÝ.',
      farewell: 'Tự em đã tìm ra rồi đấy — như sao băng vậy!',
      nextRoomHint: 'Phòng tiếp theo: MỸ THUẬT 4 — phía đông nam.',
      keyReward: ALL_KEYS['key-phys12'],
      questions: Q_PHYSICS },
    { id: 'phys-ta', name: 'Anh Duy – Trợ giảng Vật lý', emoji: '⚡', spriteStyle: 'spikyOrange', personality: 'fact',
      x: 17, y: 9, wanderRadius: 1,
      greeting: 'Luyện 2 câu về Công và định luật Ohm không? Nhanh thôi.',
      missionBrief: 'Bonus 2 câu cơ học + điện. Đúng mỗi câu: +10 XP, +5 coin.',
      farewell: 'Đơn vị và công thức — nhớ kỹ là qua hết.',
      questions: Q_PHYS_TA },
  ],
  10, 15,
)

const ART4_MAP = makeIndoor(
  'art4', 'Xưởng Mỹ thuật — Lớp 4', 'art',
  'MỸ THUẬT', 'Lớp 4 — Màu sắc & Bố cục',
  '#c47cb0', '#fde8f4',
  [
    { id: 'art-teacher', name: 'Cô Hồng – GV Mỹ thuật 4', emoji: '🎨', spriteStyle: 'longWhite', personality: 'creative',
      x: 11, y: 4, wanderRadius: 2,
      greeting: 'Chào em! Cô Hồng đây — xưởng mỹ thuật mở rồi.',
      missionBrief: 'Nhiệm vụ: 3 câu về màu sắc và hoạ sĩ nổi tiếng. Mỗi câu trả lời đúng như một nét cọ. Đúng 2/3 → nhận CHÌA KHOÁ MỸ THUẬT.',
      farewell: 'Bức tranh đã hoàn thành — em tài lắm!',
      nextRoomHint: 'Phòng tiếp theo: SINH HỌC 9 — phía tây bên dưới.',
      keyReward: ALL_KEYS['key-art4'],
      questions: Q_ART },
    { id: 'art-ta', name: 'Anh Tú – Trợ giảng Mỹ thuật', emoji: '🖌️', spriteStyle: 'curlyAfro', personality: 'hint',
      x: 4, y: 9, wanderRadius: 1,
      greeting: 'Bức tường cần thêm 2 nét cọ kiến thức nữa — em giúp anh nhé?',
      missionBrief: 'Bonus 2 câu về hoạ sĩ kinh điển và bố cục. Đúng mỗi câu: +10 XP, +5 coin.',
      farewell: 'Nét cọ đẹp lắm! Quay lại luyện thêm khi rảnh.',
      questions: Q_ART_TA },
  ],
  21, 15,
)

const BIO9_MAP = makeIndoor(
  'bio9', 'Phòng Sinh học — Lớp 9', 'study',
  'SINH HỌC', 'Lớp 9 — Tế bào & Di truyền',
  '#5e9c5e', '#e6f4e6',
  [
    { id: 'bio-teacher', name: 'Cô Thảo – GV Sinh 9', emoji: '🧬', spriteStyle: 'bobBlack', personality: 'fact',
      x: 11, y: 4, wanderRadius: 2,
      greeting: 'Chào em. Cô Thảo — Sinh học lớp 9.',
      missionBrief: 'Nhiệm vụ: 3 câu về Tế bào & Di truyền. Sinh học cần ghi nhớ chính xác. Đúng 2/3 → nhận CHÌA KHOÁ SINH.',
      farewell: 'Em đã nắm vững rồi. Xuất sắc.',
      nextRoomHint: 'Phòng tiếp theo: NGỮ VĂN 8 — phía đông.',
      keyReward: ALL_KEYS['key-bio9'],
      questions: Q_BIO },
    { id: 'bio-ta', name: 'Chị Chi – Trợ giảng Sinh', emoji: '🌱', spriteStyle: 'longWhite', personality: 'socratic',
      x: 17, y: 9, wanderRadius: 1,
      greeting: 'Chị đố em 2 câu — em nghĩ ribosome ở đâu trong tế bào trước đã?',
      missionBrief: 'Bonus 2 câu về tế bào + nhóm máu. Đúng mỗi câu: +10 XP, +5 coin.',
      farewell: 'Ghi chú lại và lần sau làm tốt hơn nhé.',
      questions: Q_BIO_TA },
  ],
  10, 23,
)

const LIT8_MAP = makeIndoor(
  'lit8', 'Phòng Ngữ Văn — Lớp 8', 'study',
  'NGỮ VĂN', 'Lớp 8 — Văn học cổ điển',
  '#c4a85e', '#fbf1d8',
  [
    { id: 'lit-teacher', name: 'Cô Quỳnh – GV Văn 8', emoji: '📜', spriteStyle: 'curlyBrown', personality: 'creative',
      x: 11, y: 4, wanderRadius: 2,
      greeting: 'Chào em! Cô Quỳnh — yêu thơ và văn học cổ điển.',
      missionBrief: 'Nhiệm vụ: 3 câu về Văn học Việt Nam và tu từ. Câu chữ là cánh diều — cùng bay nào! Đúng 2/3 → nhận CHÌA KHOÁ VĂN.',
      farewell: 'Lời em hay như thơ vậy.',
      nextRoomHint: 'Phòng cuối: TIN HỌC 7 — phía nam khu trường.',
      keyReward: ALL_KEYS['key-lit8'],
      questions: Q_LIT },
    { id: 'lit-ta', name: 'Anh Minh – Trợ giảng Văn', emoji: '✒️', spriteStyle: 'bobBlack', personality: 'fact',
      x: 4, y: 9, wanderRadius: 1,
      greeting: 'Anh có 2 câu về Nam Cao và thể thơ — nhanh thôi.',
      missionBrief: 'Bonus 2 câu văn xuôi + thơ Đường luật. Đúng mỗi câu: +10 XP, +5 coin.',
      farewell: 'Hay lắm. Đọc thêm sách mỗi ngày em nhé.',
      questions: Q_LIT_TA },
  ],
  21, 23,
)

const CS7_MAP = makeIndoor(
  'cs7', 'Phòng Tin học — Lớp 7', 'lab',
  'TIN HỌC', 'Lớp 7 — Lập trình & AI cơ bản',
  '#5ec4c4', '#dff5f5',
  [
    { id: 'cs-teacher', name: 'Anh Khoa – GV Tin 7', emoji: '💻', spriteStyle: 'spikyOrange', personality: 'hint',
      x: 11, y: 4, wanderRadius: 2,
      greeting: 'Chào em! Anh Khoa đây — Tin học & AI cơ bản.',
      missionBrief: 'Nhiệm vụ cuối: 6 câu kết hợp Tin học và AI. Anh gợi ý từng bước. Đúng 4/6 → nhận CHÌA KHOÁ TIN — hoàn thành toàn bộ lộ trình!',
      farewell: 'Em sắp thành lập trình viên rồi!',
      nextRoomHint: 'Hoàn thành! Quay về cổng để nhận chứng chỉ.',
      keyReward: ALL_KEYS['key-cs7'],
      questions: [...Q_CS, ...Q_AI] },
    { id: 'cs-ta', name: 'Chị Hà – Trợ giảng Tin', emoji: '🧑‍💻', spriteStyle: 'curlyBrown', personality: 'creative',
      x: 17, y: 9, wanderRadius: 1,
      greeting: 'Chào em! Chị Hà — trợ giảng Tin, chuyên về thuật toán & Python.',
      missionBrief: 'Bonus 2 câu về Big-O và ML. Đúng mỗi câu: +10 XP, +5 coin. Hỏi bao nhiêu lần tuỳ em.',
      farewell: 'Code vui vẻ em nhé. Nhớ viết test!',
      questions: Q_CS_TA },
  ],
  10, 28,
)

const ALL_MAPS: Record<MapId, MapDef> = {
  campus: CAMPUS_MAP,
  math10: MATH10_MAP,
  chem11: CHEM11_MAP,
  phys12: PHYS12_MAP,
  art4: ART4_MAP,
  bio9: BIO9_MAP,
  lit8: LIT8_MAP,
  cs7: CS7_MAP,
}

/* ═══════════════════════════════════════════════════════════════════════
   AUDIO ENGINE — procedural chiptune (Web Audio API, không asset)
═══════════════════════════════════════════════════════════════════════ */

class ChiptuneEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: number | null = null
  private noteIdx = 0
  private current: MapDef['bgmPattern'] | null = null
  enabled = true

  /** Nhạc theo từng loại map (note frequencies in Hz) */
  private patterns: Record<MapDef['bgmPattern'], { melody: number[]; bass: number[]; bpm: number }> = {
    campus: {
      melody: [523, 587, 659, 784, 659, 587, 523, 0, 440, 494, 523, 659, 587, 523, 494, 0],
      bass:   [131, 0, 196, 0, 165, 0, 196, 0, 147, 0, 220, 0, 165, 0, 196, 0],
      bpm: 100,
    },
    study: {
      melody: [392, 440, 494, 523, 494, 440, 392, 0, 330, 392, 440, 523, 440, 392, 330, 0],
      bass:   [98, 0, 147, 0, 123, 0, 147, 0, 110, 0, 165, 0, 123, 0, 147, 0],
      bpm: 80,
    },
    lab: {
      melody: [659, 622, 659, 784, 0, 622, 587, 523, 587, 622, 659, 784, 880, 784, 659, 0],
      bass:   [131, 0, 0, 165, 131, 0, 0, 196, 110, 0, 0, 147, 131, 0, 0, 165],
      bpm: 110,
    },
    art: {
      melody: [523, 587, 659, 740, 880, 740, 659, 587, 523, 494, 523, 587, 659, 587, 523, 0],
      bass:   [175, 0, 220, 0, 175, 0, 220, 0, 165, 0, 196, 0, 175, 0, 220, 0],
      bpm: 90,
    },
  }

  ensureCtx() {
    if (this.ctx) return
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.10  // nhạc nền êm
      this.master.connect(this.ctx.destination)
    } catch {
      this.ctx = null
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!on) this.stop()
  }

  setVolume(v: number) {
    if (this.master) this.master.gain.value = Math.max(0, Math.min(1, v))
  }

  start(pattern: MapDef['bgmPattern']) {
    if (!this.enabled) return
    this.ensureCtx()
    if (!this.ctx || !this.master) return
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    if (this.current === pattern && this.timer !== null) return
    this.stop()
    this.current = pattern
    this.noteIdx = 0
    const p = this.patterns[pattern]
    const stepMs = (60_000 / p.bpm) / 2  // mỗi nốt = 1/8

    const tick = () => {
      if (!this.ctx || !this.master) return
      const len = p.melody.length
      const i = this.noteIdx % len
      this.playNote(p.melody[i], stepMs / 1000 * 0.9, 'square', 0.6)
      if (i % 2 === 0) this.playNote(p.bass[i], stepMs / 1000 * 1.8, 'triangle', 0.7)
      this.noteIdx++
      this.timer = window.setTimeout(tick, stepMs)
    }
    tick()
  }

  /** Phát SFX khi đáp đúng / sai */
  sfx(kind: 'correct' | 'wrong' | 'door' | 'pickup') {
    if (!this.enabled) return
    this.ensureCtx()
    if (!this.ctx || !this.master) return
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    if (kind === 'correct') {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => this.playNote(f, 0.08, 'square', 1.0), i * 60))
    } else if (kind === 'wrong') {
      [330, 277, 220].forEach((f, i) =>
        setTimeout(() => this.playNote(f, 0.12, 'sawtooth', 0.8), i * 80))
    } else if (kind === 'door') {
      [220, 330].forEach((f, i) =>
        setTimeout(() => this.playNote(f, 0.10, 'sine', 0.6), i * 100))
    } else if (kind === 'pickup') {
      this.playNote(880, 0.06, 'square', 1.0)
      setTimeout(() => this.playNote(1175, 0.10, 'square', 1.0), 60)
    }
  }

  private playNote(freq: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.master || freq <= 0) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    const now = this.ctx.currentTime
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(gain * 0.4, now + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(now)
    osc.stop(now + dur + 0.02)
  }

  stop() {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.current = null
  }

  destroy() {
    this.stop()
    if (this.ctx) {
      this.ctx.close().catch(() => {})
      this.ctx = null
      this.master = null
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   SPRITE RENDERER — chi tiết hơn, dựa trên 6-character reference
═══════════════════════════════════════════════════════════════════════ */

interface CharColors {
  hair: string
  hairAccent?: string
  skin: string
  shirt: string
  shirtAccent?: string
  pants: string
  shoes: string
}

const STYLE_COLORS: Record<SpriteStyle, CharColors> = {
  curlyAfro:      { hair: '#3a1f0b', hairAccent: '#5a3018', skin: '#c4926a', shirt: '#e8d4a8', shirtAccent: '#a07840', pants: '#3a4a6a', shoes: '#1a1a1a' },
  ponytailBlonde: { hair: '#f4d76a', hairAccent: '#c9a850', skin: '#f0d2b0', shirt: '#c44848', shirtAccent: '#8a2828', pants: '#2a2a4a', shoes: '#3a2a1a' },
  spikyOrange:    { hair: '#d96a1a', hairAccent: '#a04810', skin: '#e8c098', shirt: '#3a6a8a', shirtAccent: '#1a4a6a', pants: '#1a2a4a', shoes: '#0a0a0a' },
  bobBlack:       { hair: '#1a1a1a', hairAccent: '#3a3a3a', skin: '#e0c098', shirt: '#5a5a6a', shirtAccent: '#3a3a4a', pants: '#1a1a2a', shoes: '#1a1a1a' },
  longWhite:      { hair: '#e8e8e8', hairAccent: '#b8b8c8', skin: '#f4d8b8', shirt: '#7a4ac4', shirtAccent: '#5a2aa0', pants: '#2a2a3a', shoes: '#2a2a2a' },
  curlyBrown:     { hair: '#6a3a1a', hairAccent: '#4a2410', skin: '#d8a878', shirt: '#3a8a6a', shirtAccent: '#1a6a4a', pants: '#2a3a4a', shoes: '#1a1a1a' },
  player:         { hair: '#3a2418', skin: '#e8c098', shirt: '#4a8ac4', shirtAccent: '#2a5a8a', pants: '#1a2a3a', shoes: '#0a0a0a' },
}

/**
 * Vẽ sprite nhân vật chi tiết (16×24 px scale tự động theo TILE).
 * Mỗi style có hairstyle/outfit khác nhau khớp ảnh tham khảo.
 */
function drawCharacter(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  style: SpriteStyle,
  dir: Dir,
  walkPhase: number,
) {
  const c = STYLE_COLORS[style]
  const s = TILE / 16    // pixel size scale (mỗi "pixel" = s screen px)
  const x0 = px - 8 * s
  const y0 = py - 20 * s

  // Bóng dưới chân
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(px, py + 2, 7 * s, 2.5 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  // Pixel helper
  const px_ = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x0 + x * s, y0 + y * s, w * s, h * s)
  }

  // Chân (animate walk)
  const legOffset = walkPhase < 0.5 ? 0 : 1
  px_(5, 19, 3, 3, c.pants)                                  // chân trái
  px_(8, 19, 3, 3, c.pants)                                  // chân phải
  px_(5, 21 + legOffset, 3, 1, c.shoes)
  px_(8, 21 - legOffset, 3, 1, c.shoes)

  // Quần
  px_(5, 14, 6, 6, c.pants)

  // Áo
  px_(4, 9, 8, 6, c.shirt)
  if (c.shirtAccent) {
    if (style === 'curlyAfro') {
      // Áo sọc
      px_(4, 10, 8, 1, c.shirtAccent)
      px_(4, 12, 8, 1, c.shirtAccent)
      px_(4, 14, 8, 1, c.shirtAccent)
    } else if (style === 'spikyOrange') {
      // Khoác denim — collar
      px_(4, 9, 1, 6, c.shirtAccent)
      px_(11, 9, 1, 6, c.shirtAccent)
      px_(4, 9, 8, 1, c.shirtAccent)
    } else if (style === 'bobBlack') {
      // Blazer
      px_(4, 9, 1, 6, c.shirtAccent)
      px_(11, 9, 1, 6, c.shirtAccent)
      px_(7, 9, 2, 4, c.shirtAccent)
    } else if (style === 'longWhite') {
      // Hoodie với mũ
      px_(4, 9, 1, 5, c.shirtAccent)
      px_(11, 9, 1, 5, c.shirtAccent)
      px_(7, 13, 2, 2, c.shirtAccent)  // dây kéo
    } else if (style === 'ponytailBlonde') {
      // Áo len cổ tròn
      px_(5, 9, 6, 1, c.shirtAccent)
    } else if (style === 'curlyBrown') {
      // Áo sơ mi cổ V
      px_(7, 9, 2, 2, c.shirtAccent)
    } else if (style === 'player') {
      px_(7, 9, 2, 2, c.shirtAccent)
    }
  }

  // Tay (đung đưa nhẹ khi đi)
  const armSwing = walkPhase < 0.5 ? -1 : 1
  px_(3, 10 + (style === 'curlyAfro' ? armSwing : 0), 1, 5, c.shirt)
  px_(12, 10 - (style === 'curlyAfro' ? armSwing : 0), 1, 5, c.shirt)
  px_(3, 14, 1, 1, c.skin)
  px_(12, 14, 1, 1, c.skin)

  // Cổ
  px_(7, 8, 2, 1, c.skin)

  // Đầu (mặt)
  px_(5, 3, 6, 6, c.skin)

  // Mắt + miệng (đổi theo hướng)
  if (dir === 'right') {
    px_(8, 5, 1, 1, '#1a1a1a')
    px_(10, 5, 1, 1, '#1a1a1a')
    px_(8, 7, 2, 1, '#5a3a2a')
  } else if (dir === 'left') {
    px_(6, 5, 1, 1, '#1a1a1a')
    px_(8, 5, 1, 1, '#1a1a1a')
    px_(6, 7, 2, 1, '#5a3a2a')
  } else if (dir === 'up') {
    // quay lưng — hiện tóc gáy
    // không vẽ mắt
  } else {
    px_(6, 5, 1, 1, '#1a1a1a')
    px_(9, 5, 1, 1, '#1a1a1a')
    px_(7, 7, 2, 1, '#5a3a2a')
  }

  // Tóc — phong cách riêng từng style
  switch (style) {
    case 'curlyAfro': {
      // Afro lớn
      const acc = c.hairAccent || c.hair
      px_(3, 1, 10, 3, c.hair)
      px_(2, 2, 1, 4, c.hair)
      px_(13, 2, 1, 4, c.hair)
      px_(4, 0, 8, 2, acc)
      px_(3, 4, 2, 2, c.hair)
      px_(11, 4, 2, 2, c.hair)
      break
    }
    case 'ponytailBlonde': {
      const acc = c.hairAccent || c.hair
      px_(4, 2, 8, 3, c.hair)
      px_(4, 5, 1, 1, c.hair)
      px_(11, 5, 1, 1, c.hair)
      px_(4, 1, 8, 1, acc)
      // Ponytail phía sau
      if (dir !== 'down') {
        px_(11, 4, 3, 6, c.hair)
        px_(13, 7, 1, 4, acc)
      } else {
        px_(2, 4, 3, 6, c.hair)
        px_(2, 7, 1, 4, acc)
      }
      break
    }
    case 'spikyOrange': {
      const acc = c.hairAccent || c.hair
      px_(4, 3, 8, 2, c.hair)
      // Gai tóc
      px_(4, 1, 1, 2, c.hair)
      px_(6, 0, 1, 3, c.hair)
      px_(8, 1, 1, 2, c.hair)
      px_(10, 0, 1, 3, c.hair)
      px_(11, 2, 1, 2, c.hair)
      px_(5, 2, 1, 1, acc)
      px_(7, 1, 1, 1, acc)
      px_(9, 2, 1, 1, acc)
      break
    }
    case 'bobBlack': {
      px_(4, 2, 8, 4, c.hair)
      px_(4, 4, 1, 2, c.hair)
      px_(11, 4, 1, 2, c.hair)
      px_(3, 3, 1, 3, c.hair)
      px_(12, 3, 1, 3, c.hair)
      // Mái
      px_(5, 5, 6, 1, c.hair)
      break
    }
    case 'longWhite': {
      const acc = c.hairAccent || c.hair
      px_(3, 2, 10, 4, c.hair)
      // Tóc dài hai bên
      px_(3, 6, 2, 8, c.hair)
      px_(11, 6, 2, 8, c.hair)
      px_(2, 8, 1, 5, acc)
      px_(13, 8, 1, 5, acc)
      // Mái
      px_(5, 5, 6, 1, acc)
      break
    }
    case 'curlyBrown': {
      const acc = c.hairAccent || c.hair
      px_(4, 1, 8, 4, c.hair)
      px_(3, 3, 1, 3, c.hair)
      px_(12, 3, 1, 3, c.hair)
      // Lọn xoăn
      px_(4, 0, 2, 1, acc)
      px_(7, 0, 2, 1, acc)
      px_(10, 0, 2, 1, acc)
      px_(5, 5, 1, 1, c.hair)
      px_(10, 5, 1, 1, c.hair)
      break
    }
    case 'player':
    default:
      px_(4, 2, 8, 3, c.hair)
      px_(4, 5, 1, 1, c.hair)
      px_(11, 5, 1, 1, c.hair)
      break
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   TILE RENDERERS — vẽ tile + landmark chi tiết
═══════════════════════════════════════════════════════════════════════ */

function drawTile(
  ctx: CanvasRenderingContext2D,
  ch: string, x: number, y: number,
  map: MapDef,
) {
  const px = x * TILE
  const py = y * TILE
  const wallCol = map.wallColor || '#7a5a3a'
  const floorCol = map.floorColor || '#d8c8a8'

  switch (ch) {
    case 'g': {
      // Cỏ với chấm sáng
      ctx.fillStyle = '#7ec97e'
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#a8d98a'
      ctx.fillRect(px + 4, py + 6, 2, 2)
      ctx.fillRect(px + 18, py + 14, 2, 2)
      ctx.fillRect(px + 24, py + 22, 2, 2)
      ctx.fillRect(px + 10, py + 26, 2, 2)
      break
    }
    case 'T': {
      // Cây — thân + tán
      ctx.fillStyle = '#5e9c5e'
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#3a6a3a'
      ctx.beginPath()
      ctx.arc(px + TILE / 2, py + TILE / 2 - 4, TILE / 2 - 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4a8a4a'
      ctx.beginPath()
      ctx.arc(px + TILE / 2 - 4, py + TILE / 2 - 6, TILE / 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6a3a1a'
      ctx.fillRect(px + TILE / 2 - 2, py + TILE - 8, 4, 8)
      break
    }
    case '~': {
      // Đường lát đá
      ctx.fillStyle = '#b8a888'
      ctx.fillRect(px, py, TILE, TILE)
      ctx.strokeStyle = '#9a8868'
      ctx.lineWidth = 1
      ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4)
      ctx.fillStyle = '#9a8868'
      ctx.fillRect(px + 14, py + 6, 2, 1)
      ctx.fillRect(px + 6, py + 18, 2, 1)
      break
    }
    case 'W': {
      // Đài phun nước / hồ
      ctx.fillStyle = '#5ab0e0'
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#90d0f0'
      ctx.fillRect(px + 4, py + 6, TILE - 8, 4)
      ctx.fillRect(px + 8, py + 16, TILE - 16, 3)
      ctx.fillStyle = '#3a8ab8'
      ctx.fillRect(px, py + TILE - 4, TILE, 4)
      break
    }
    case '#': {
      // Tường — gạch
      ctx.fillStyle = wallCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, py + TILE / 2)
      ctx.lineTo(px + TILE, py + TILE / 2)
      ctx.moveTo(px + TILE / 2, py)
      ctx.lineTo(px + TILE / 2, py + TILE / 2)
      ctx.moveTo(px, py + TILE / 2)
      ctx.lineTo(px, py + TILE)
      ctx.moveTo(px + TILE, py + TILE / 2)
      ctx.lineTo(px + TILE, py + TILE)
      ctx.stroke()
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(px, py, TILE, 2)
      break
    }
    case 'D': {
      // Cửa
      ctx.fillStyle = wallCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#3a2418'
      ctx.fillRect(px + 4, py + 6, TILE - 8, TILE - 6)
      ctx.fillStyle = '#5a3a24'
      ctx.fillRect(px + 6, py + 8, TILE - 12, TILE - 10)
      ctx.fillStyle = '#f4c84a'
      ctx.fillRect(px + TILE - 10, py + TILE / 2, 3, 3)  // tay nắm
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1
      ctx.strokeRect(px + 4, py + 6, TILE - 8, TILE - 6)
      break
    }
    case '.': {
      // Sàn nội thất — gỗ hoặc gạch
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      // Vân gỗ / khe gạch
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1)
      break
    }
    case 'B': {
      // Kệ sách
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#5a3a1a'
      ctx.fillRect(px, py + 2, TILE, TILE - 8)
      // Sách màu
      const bookColors = ['#c44848', '#4a8ac4', '#8ac44a', '#c4a84a', '#a44ac4', '#4ac4a4']
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = bookColors[(i + x + y) % bookColors.length]
        ctx.fillRect(px + 2 + i * 5, py + 4, 4, TILE - 12)
      }
      // Ván trên cùng
      ctx.fillStyle = '#3a2410'
      ctx.fillRect(px, py, TILE, 2)
      ctx.fillRect(px, py + TILE - 6, TILE, 2)
      break
    }
    case 'd': case '=': {
      // Bàn làm việc / desk
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#7a5a3a'
      ctx.fillRect(px, py + 8, TILE, 14)
      ctx.fillStyle = '#5a3a1a'
      ctx.fillRect(px, py + 20, TILE, 4)
      // Monitor (chỉ khi 'd', không khi '=')
      if (ch === 'd') {
        ctx.fillStyle = '#1a1a1a'
        ctx.fillRect(px + 8, py, 16, 12)
        ctx.fillStyle = '#5ab0e0'
        ctx.fillRect(px + 10, py + 2, 12, 8)
        ctx.fillStyle = '#3a3a3a'
        ctx.fillRect(px + 14, py + 12, 4, 2)
      }
      break
    }
    case 'C': {
      // Ghế
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#3a3a4a'
      ctx.fillRect(px + 8, py + 8, TILE - 16, 4)   // tựa
      ctx.fillRect(px + 8, py + 14, TILE - 16, 8)  // mặt
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(px + 8, py + 22, 2, 6)          // chân
      ctx.fillRect(px + TILE - 10, py + 22, 2, 6)
      break
    }
    case 'P': {
      // Cây trong chậu
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#8a4a2a'
      ctx.fillRect(px + 8, py + 18, TILE - 16, 10)
      ctx.fillStyle = '#3a8a3a'
      ctx.beginPath()
      ctx.arc(px + TILE / 2, py + 12, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#5ac45a'
      ctx.beginPath()
      ctx.arc(px + TILE / 2 - 3, py + 9, 5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'V': {
      // Máy bán hàng tự động
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#c44848'
      ctx.fillRect(px + 4, py, TILE - 8, TILE - 2)
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(px + 6, py + 4, TILE - 12, 12)
      ctx.fillStyle = '#5ab0e0'
      ctx.fillRect(px + 7, py + 5, 4, 4)
      ctx.fillRect(px + 12, py + 5, 4, 4)
      ctx.fillRect(px + 17, py + 5, 4, 4)
      ctx.fillRect(px + 7, py + 10, 4, 4)
      ctx.fillRect(px + 12, py + 10, 4, 4)
      ctx.fillRect(px + 17, py + 10, 4, 4)
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(px + 8, py + 18, TILE - 16, 6)
      break
    }
    case 'F': {
      // Tủ lạnh
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#e0e0e8'
      ctx.fillRect(px + 4, py, TILE - 8, TILE - 2)
      ctx.fillStyle = '#a8a8b0'
      ctx.fillRect(px + 4, py + 12, TILE - 8, 1)
      ctx.fillStyle = '#3a3a4a'
      ctx.fillRect(px + TILE - 8, py + 4, 2, 6)
      ctx.fillRect(px + TILE - 8, py + 16, 2, 6)
      break
    }
    case 'K': {
      // Quầy bếp
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#5a4a3a'
      ctx.fillRect(px, py + 8, TILE, TILE - 8)
      ctx.fillStyle = '#a8a8a8'
      ctx.fillRect(px, py + 8, TILE, 4)
      break
    }
    case 'L': {
      // Đèn đường
      ctx.fillStyle = '#7ec97e'
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#3a3a3a'
      ctx.fillRect(px + TILE / 2 - 1, py + 8, 2, TILE - 8)
      ctx.fillStyle = '#fff4a8'
      ctx.beginPath()
      ctx.arc(px + TILE / 2, py + 8, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,244,168,0.3)'
      ctx.beginPath()
      ctx.arc(px + TILE / 2, py + 8, 10, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'x': {
      // exit (cửa ra)
      ctx.fillStyle = wallCol
      ctx.fillRect(px, py, TILE, TILE)
      ctx.fillStyle = '#3a2418'
      ctx.fillRect(px + 4, py + 6, TILE - 8, TILE - 6)
      break
    }
    default: {
      ctx.fillStyle = floorCol
      ctx.fillRect(px, py, TILE, TILE)
    }
  }
}

/** Tile có cản trở đi qua không */
function isSolid(ch: string | undefined): boolean {
  if (!ch) return true   // out-of-bounds coi như cản trở
  return ['#', 'T', 'W', 'B', 'd', '=', 'C', 'P', 'V', 'F', 'K', 'L'].includes(ch)
}

/** Tile chuyển map (cửa) */
function isDoor(ch: string | undefined): boolean {
  return ch === 'D' || ch === 'x'
}

/* ═══════════════════════════════════════════════════════════════════════
   LANDMARK RENDERER — vẽ biển hiệu cho toà nhà
═══════════════════════════════════════════════════════════════════════ */

function drawLandmark(ctx: CanvasRenderingContext2D, lm: Landmark) {
  if (lm.kind === 'building' && lm.label) {
    // Biển treo trên nóc toà nhà — chỉ vẽ phần biển (toà nhà đã được render bằng tile #)
    const cx = (lm.x + lm.w / 2) * TILE
    const top = lm.y * TILE - 4
    const w = lm.label.length * 11 + 28
    const h = lm.sublabel ? 38 : 24
    // Khung biển
    ctx.fillStyle = lm.color || '#c98c4d'
    ctx.fillRect(cx - w / 2, top - h, w, h)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(cx - w / 2, top - h, w, h)
    // Label
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (lm.sublabel) {
      ctx.fillText(lm.label, cx, top - h + 12)
      ctx.font = '10px monospace'
      ctx.fillText(lm.sublabel, cx, top - h + 28)
    } else {
      ctx.fillText(lm.label, cx, top - h / 2)
    }
    // Cột treo
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(cx - 1, top - h, 2, 4)
  } else if (lm.kind === 'sign' && lm.label) {
    const cx = (lm.x + lm.w / 2) * TILE
    const cy = (lm.y + lm.h / 2) * TILE
    const w = Math.max(lm.label.length * 9 + 16, (lm.sublabel?.length || 0) * 7 + 16)
    const h = lm.sublabel ? 32 : 20
    ctx.fillStyle = '#f4e8c8'
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h)
    ctx.strokeStyle = '#5a3a1a'
    ctx.lineWidth = 2
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h)
    ctx.fillStyle = '#3a2418'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (lm.sublabel) {
      ctx.fillText(lm.label, cx, cy - 6)
      ctx.font = '9px monospace'
      ctx.fillText(lm.sublabel, cx, cy + 8)
    } else {
      ctx.fillText(lm.label, cx, cy)
    }
  } else if (lm.kind === 'fountain') {
    // Đã vẽ qua tile W, thêm tia nước
    const cx = (lm.x + lm.w / 2) * TILE
    const cy = lm.y * TILE
    ctx.fillStyle = 'rgba(180,220,255,0.7)'
    ctx.beginPath()
    ctx.arc(cx, cy - 6, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(180,220,255,0.4)'
    ctx.beginPath()
    ctx.arc(cx, cy - 14, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════════ */

function loadSave(): SaveState {
  try {
    const raw = sessionStorage.getItem(SAVE_KEY)
    if (!raw) throw 0
    const s = JSON.parse(raw) as SaveState
    if (!ALL_MAPS[s.currentMap]) s.currentMap = 'campus'
    if (!Array.isArray(s.keys)) s.keys = []
    return s
  } catch {
    return {
      xp: 0, coins: 0, defeatedNpcIds: [], keys: [],
      pos: ALL_MAPS.campus.spawn, currentMap: 'campus', musicOn: true,
    }
  }
}

function persist(s: SaveState) {
  try { sessionStorage.setItem(SAVE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export default function PixelAgents() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<ChiptuneEngine | null>(null)

  // Save state ở React để re-render HUD
  const initialSave = useRef(loadSave())
  const [xp, setXp] = useState(initialSave.current.xp)
  const [coins, setCoins] = useState(initialSave.current.coins)
  const [defeated, setDefeated] = useState<string[]>(initialSave.current.defeatedNpcIds)
  const [keys, setKeys] = useState<string[]>(initialSave.current.keys)
  const [currentMapId, setCurrentMapId] = useState<MapId>(initialSave.current.currentMap)
  const [musicOn, setMusicOn] = useState(initialSave.current.musicOn)

  // Game state ở refs để không re-render mỗi frame
  const stateRef = useRef({
    pos: { x: initialSave.current.pos.x, y: initialSave.current.pos.y },
    dir: 'down' as Dir,
    walkPhase: 0,
    moving: false,
    keys: new Set<string>(),
    npcs: [] as NPC[],
    map: ALL_MAPS[initialSave.current.currentMap],
    pendingMapTransition: null as null | { to: MapId; spawnX: number; spawnY: number },
  })

  const [paused, setPaused] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [toast, setToast] = useState<{ text: string; kind: 'good' | 'bad' | 'info' } | null>(null)

  /* ── Khởi tạo NPCs cho map hiện tại ──────────────────────────── */
  const loadMap = useCallback((id: MapId, spawnX?: number, spawnY?: number) => {
    const map = ALL_MAPS[id]
    stateRef.current.map = map
    stateRef.current.npcs = map.npcs.map(spec => ({
      ...spec,
      defeated: initialSave.current.defeatedNpcIds.includes(spec.id) ||
                stateRef.current.npcs.find(n => n.id === spec.id)?.defeated ||
                false,
      anchorX: spec.x, anchorY: spec.y, moveTimer: 0,
    }))
    if (spawnX !== undefined && spawnY !== undefined) {
      stateRef.current.pos = { x: spawnX, y: spawnY }
    }
    setCurrentMapId(id)
    if (audioRef.current && musicOn) audioRef.current.start(map.bgmPattern)
  }, [musicOn])

  /* ── Mount: tạo audio engine + load map ban đầu ─────────────── */
  useEffect(() => {
    audioRef.current = new ChiptuneEngine()
    audioRef.current.setEnabled(initialSave.current.musicOn)
    loadMap(initialSave.current.currentMap)
    return () => {
      audioRef.current?.destroy()
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Sync defeated state vào NPCs (cả khi map đổi) ─────────── */
  useEffect(() => {
    stateRef.current.npcs.forEach(n => {
      if (defeated.includes(n.id)) n.defeated = true
    })
  }, [defeated, currentMapId])

  /* ── Persist save state ─────────────────────────────────────── */
  useEffect(() => {
    persist({
      xp, coins, defeatedNpcIds: defeated, keys,
      pos: stateRef.current.pos, currentMap: currentMapId, musicOn,
    })
    // Hoàn thành khi đủ 7 chìa khoá
    if (keys.length >= TOTAL_KEYS && !completed) {
      setCompleted(true)
    }
  }, [xp, coins, defeated, keys, currentMapId, musicOn, completed])

  /* ── Keyboard input ─────────────────────────────────────────── */
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      stateRef.current.keys.add(k)
      if (k === 'escape') {
        if (dialog) setDialog(null)
        else if (helpOpen) setHelpOpen(false)
        else setPaused(p => !p)
      } else if (k === 'h') {
        setHelpOpen(o => !o)
      } else if (k === 'e') {
        // E = phím tương tác chính (nói chuyện NPC / mở cửa / next dialog)
        e.preventDefault()
        if (dialog) {
          // Trong dialog: bấm E để next phase (trừ 'question' — cần chọn đáp án bằng 1-4)
          if (dialog.phase !== 'question' || dialog.typedChars < currentDialogText(dialog).length) {
            nextDialog()
          }
        } else {
          tryInteract()
        }
      } else if (k === '1' || k === '2' || k === '3' || k === '4') {
        // Phím số để chọn đáp án trong phase question
        if (dialog && dialog.phase === 'question' && dialog.selected === null &&
            dialog.typedChars >= currentDialogText(dialog).length) {
          const idx = Number(k) - 1
          if (idx < dialog.npc.questions[dialog.questionIdx].choices.length) {
            answerQuestion(idx)
          }
        }
      }
    }
    const onUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog, helpOpen])

  /* ── Toggle music ───────────────────────────────────────────── */
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.setEnabled(musicOn)
    if (musicOn) audioRef.current.start(stateRef.current.map.bgmPattern)
  }, [musicOn])

  /* ── Interact ───────────────────────────────────────────────── */
  function tryInteract() {
    const s = stateRef.current
    const dxMap: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
    const [dx, dy] = dxMap[s.dir]
    const tx = Math.round(s.pos.x) + dx
    const ty = Math.round(s.pos.y) + dy
    // Check NPC tại tile trước mặt
    const npc = s.npcs.find(n => Math.round(n.x) === tx && Math.round(n.y) === ty && !n.defeated)
    if (npc) {
      setDialog({ npc, phase: 'intro', questionIdx: 0, selected: null, typedChars: 0, lastTickAt: performance.now(), correctCount: 0 })
      return
    }
    // Check door
    const ch = s.map.layout[ty]?.[tx]
    if (isDoor(ch)) {
      const lm = s.map.landmarks.find(l =>
        l.kind === 'building' && l.doorTo &&
        tx >= l.x && tx < l.x + l.w &&
        ty >= l.y && ty < l.y + l.h
      )
      if (lm?.doorTo) {
        const target = ALL_MAPS[lm.doorTo]
        s.pendingMapTransition = { to: lm.doorTo, spawnX: target.spawn.x, spawnY: target.spawn.y }
        audioRef.current?.sfx('door')
        return
      }
      if (s.map.exit && tx === s.map.exit.x && ty === s.map.exit.y) {
        s.pendingMapTransition = { to: s.map.exit.toMap, spawnX: s.map.exit.toX, spawnY: s.map.exit.toY }
        audioRef.current?.sfx('door')
        return
      }
    }
  }

  /* ── Game loop ──────────────────────────────────────────────── */
  useEffect(() => {
    let raf = 0
    let lastT = performance.now()
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - lastT) / 1000)
      lastT = now
      const s = stateRef.current

      // Apply pending map transition
      if (s.pendingMapTransition) {
        const t = s.pendingMapTransition
        s.pendingMapTransition = null
        loadMap(t.to, t.spawnX, t.spawnY)
        return
      }

      if (!paused && !dialog && !completed) {
        // ── Movement ──
        let mvX = 0, mvY = 0
        if (s.keys.has('arrowup') || s.keys.has('w'))    { mvY = -1; s.dir = 'up' }
        if (s.keys.has('arrowdown') || s.keys.has('s'))  { mvY = 1; s.dir = 'down' }
        if (s.keys.has('arrowleft') || s.keys.has('a'))  { mvX = -1; s.dir = 'left' }
        if (s.keys.has('arrowright') || s.keys.has('d')) { mvX = 1; s.dir = 'right' }
        s.moving = mvX !== 0 || mvY !== 0
        if (s.moving) {
          // Normalize diagonal
          if (mvX && mvY) { mvX *= 0.707; mvY *= 0.707 }
          const nxX = s.pos.x + mvX * MOVE_SPEED * dt
          const nxY = s.pos.y + mvY * MOVE_SPEED * dt
          // Collision check (4 corners)
          const checkX = mvX > 0 ? Math.floor(nxX + 0.3) : Math.floor(nxX - 0.3)
          const checkY = Math.floor(s.pos.y)
          const chX = s.map.layout[checkY]?.[checkX]
          if (!isSolid(chX)) s.pos.x = nxX
          const checkY2 = mvY > 0 ? Math.floor(nxY + 0.3) : Math.floor(nxY - 0.3)
          const checkX2 = Math.floor(s.pos.x)
          const chY = s.map.layout[checkY2]?.[checkX2]
          if (!isSolid(chY)) s.pos.y = nxY
          // Clamp
          s.pos.x = Math.max(0.5, Math.min(s.map.w - 1.5, s.pos.x))
          s.pos.y = Math.max(0.5, Math.min(s.map.h - 1.5, s.pos.y))
          s.walkPhase = (s.walkPhase + dt * 6) % 1
        }

        // ── NPC wander ──
        s.npcs.forEach(n => {
          if (n.defeated || !n.wanderRadius) return
          n.moveTimer -= dt
          if (n.moveTimer <= 0) {
            n.moveTimer = 1.5 + Math.random() * 2
            const dx = Math.floor(Math.random() * 3) - 1
            const dy = Math.floor(Math.random() * 3) - 1
            const nx = n.x + dx
            const ny = n.y + dy
            if (
              Math.abs(nx - n.anchorX) <= n.wanderRadius &&
              Math.abs(ny - n.anchorY) <= n.wanderRadius &&
              !isSolid(s.map.layout[ny]?.[nx])
            ) {
              n.x = nx; n.y = ny
            }
          }
        })

        // Auto-trigger dialog khi đứng cạnh NPC
      }

      // Dialog typewriter
      if (dialog) {
        const text = currentDialogText(dialog)
        if (dialog.typedChars < text.length) {
          if (now - dialog.lastTickAt > 25) {
            setDialog(d => d ? { ...d, typedChars: Math.min(d.typedChars + 2, text.length), lastTickAt: now } : d)
          }
        }
      }

      /* ─── RENDER ─────────────────────────────────────────────── */
      const map = s.map
      const W = cv.width
      const H = cv.height
      // Background fill
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)

      // Camera follows player
      const camX = Math.max(0, Math.min(map.w - VIEW_W_TILES, s.pos.x - VIEW_W_TILES / 2))
      const camY = Math.max(0, Math.min(map.h - VIEW_H_TILES, s.pos.y - VIEW_H_TILES / 2))
      ctx.save()
      ctx.translate(-camX * TILE, -camY * TILE)

      // Tiles
      const sx = Math.floor(camX), sy = Math.floor(camY)
      const ex = Math.min(map.w, sx + VIEW_W_TILES + 2)
      const ey = Math.min(map.h, sy + VIEW_H_TILES + 2)
      for (let y = sy; y < ey; y++) {
        for (let x = sx; x < ex; x++) {
          drawTile(ctx, map.layout[y]?.[x] || '.', x, y, map)
        }
      }

      // Landmarks (signs/decor)
      map.landmarks.forEach(lm => drawLandmark(ctx, lm))

      // NPCs
      const pulse = 0.5 + 0.5 * Math.sin(now / 350)   // 0..1 animation
      s.npcs.forEach(n => {
        const px = n.x * TILE + TILE / 2
        const py = n.y * TILE + TILE

        // 1) Halo phát sáng dưới chân — giúp teacher nổi bật trên sàn/đồ đạc
        const haloColor = n.defeated ? 'rgba(255, 215, 100, ' : 'rgba(110, 220, 255, '
        // Vòng ngoài (lớn, mờ, pulse)
        ctx.fillStyle = haloColor + (0.10 + 0.08 * pulse) + ')'
        ctx.beginPath()
        ctx.ellipse(px, py + 2, 18 + pulse * 4, 7 + pulse * 2, 0, 0, Math.PI * 2)
        ctx.fill()
        // Vòng trong (đậm hơn)
        ctx.fillStyle = haloColor + (0.25 + 0.10 * pulse) + ')'
        ctx.beginPath()
        ctx.ellipse(px, py + 2, 12, 5, 0, 0, Math.PI * 2)
        ctx.fill()

        // 2) Sprite nhân vật
        drawCharacter(ctx, px, py, n.spriteStyle, 'down', 0)

        // 3) Huy hiệu "GIÁO VIÊN" hoặc "ĐÃ XONG" phía trên sprite
        const badgeText = n.defeated ? 'ĐÃ XONG' : 'GIÁO VIÊN'
        const badgeBg = n.defeated ? '#d4a017' : '#0ea5e9'
        const badgeW = badgeText.length * 7 + 12
        const badgeY = py - TILE - 36
        ctx.fillStyle = badgeBg
        ctx.fillRect(px - badgeW / 2, badgeY, badgeW, 14)
        ctx.fillStyle = '#000'
        ctx.lineWidth = 1.5
        ctx.strokeRect(px - badgeW / 2, badgeY, badgeW, 14)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(badgeText, px, badgeY + 7)

        // 4) Biểu tượng mũ/chìa khoá
        ctx.font = '18px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(n.defeated ? '🗝️' : '🎓', px, badgeY - 4)

        // 5) Mũi tên nhấp nháy chỉ xuống NPC — đảm bảo người chơi để ý
        if (!n.defeated) {
          const arrowY = py - TILE - 56 - pulse * 5
          ctx.fillStyle = '#facc15'
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(px, arrowY + 10)
          ctx.lineTo(px - 7, arrowY)
          ctx.lineTo(px + 7, arrowY)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }

        // 6) Tên giáo viên (plate lớn, đọc rõ)
        ctx.textBaseline = 'alphabetic'
        const nameW = Math.max(n.name.length * 6 + 10, 80)
        const nameY = py - TILE - 18
        ctx.fillStyle = 'rgba(0,0,0,0.85)'
        ctx.fillRect(px - nameW / 2, nameY, nameW, 14)
        ctx.strokeStyle = '#fde68a'
        ctx.lineWidth = 1
        ctx.strokeRect(px - nameW / 2, nameY, nameW, 14)
        ctx.fillStyle = '#fef3c7'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(n.name, px, nameY + 7)
      })

      // Player
      const ppx = s.pos.x * TILE + TILE / 2
      const ppy = s.pos.y * TILE + TILE
      drawCharacter(ctx, ppx, ppy, 'player', s.dir, s.moving ? s.walkPhase : 0)

      ctx.restore()

      // ─── HUD overlay (map name + minimap) ───
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, 0, W, 28)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`📍 ${map.name}`, 12, 18)

      // Hint khi đứng cạnh NPC / cửa
      const fx = Math.round(s.pos.x), fy = Math.round(s.pos.y)
      const dxMap = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
      const [dx, dy] = dxMap[s.dir]
      const ahead = map.layout[fy + dy]?.[fx + dx]
      const aheadNpc = s.npcs.find(n => Math.round(n.x) === fx + dx && Math.round(n.y) === fy + dy && !n.defeated)
      if (aheadNpc || isDoor(ahead)) {
        ctx.fillStyle = 'rgba(255, 225, 74, 0.95)'
        ctx.fillRect(W / 2 - 110, H - 36, 220, 24)
        ctx.fillStyle = '#1a1a1a'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        const msg = aheadNpc
          ? `Nhấn E để nói chuyện với ${aheadNpc.name}`
          : 'Nhấn E để vào cửa'
        ctx.fillText(msg, W / 2, H - 20)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [paused, dialog, completed, loadMap])

  /* ── Resize canvas ──────────────────────────────────────────── */
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const resize = () => {
      const parent = cv.parentElement
      if (!parent) return
      const w = Math.min(parent.clientWidth, VIEW_W_TILES * TILE)
      const h = Math.round((w / VIEW_W_TILES) * VIEW_H_TILES)
      const ratio = window.devicePixelRatio || 1
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      cv.width = VIEW_W_TILES * TILE * ratio
      cv.height = VIEW_H_TILES * TILE * ratio
      const ctx = cv.getContext('2d')
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (ctx) ctx.imageSmoothingEnabled = false
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  /* ── Dialog actions ─────────────────────────────────────────── */
  function currentDialogText(d: DialogState): string {
    if (d.phase === 'intro') return d.npc.greeting
    if (d.phase === 'mission') {
      return d.npc.missionBrief ?? 'Sẵn sàng bắt đầu bài kiểm tra? Bấm E để tiếp tục.'
    }
    if (d.phase === 'question') {
      const q = d.npc.questions[d.questionIdx]
      const styled = applyPersonality(d.npc.personality, q.q)
      return styled
    }
    if (d.phase === 'explain') {
      const q = d.npc.questions[d.questionIdx]
      const ok = d.selected === q.correct
      return (ok ? '✓ Chính xác! ' : '✗ Chưa đúng. ') + (q.explain || `Đáp án đúng: ${q.choices[q.correct]}`)
    }
    if (d.phase === 'reward') {
      const total = d.npc.questions.length
      const pass = d.correctCount >= Math.ceil(total * 0.6)   // đỗ nếu đúng ≥ 60%
      if (!pass) {
        return `Em trả lời đúng ${d.correctCount}/${total}. Chưa đạt ngưỡng nhận chìa khoá — hãy quay lại luyện thêm rồi gặp thầy/cô lần nữa nhé.`
      }
      const keyName = d.npc.keyReward?.name ?? 'Chìa khoá'
      const hint = d.npc.nextRoomHint ?? ''
      return `🎉 Xuất sắc! Em đúng ${d.correctCount}/${total}. Thầy/Cô trao em 🗝️ ${keyName}. ${hint}`
    }
    return d.npc.farewell
  }

  function applyPersonality(p: Personality, q: string): string {
    switch (p) {
      case 'socratic': return `Em nghĩ sao về câu này: ${q}`
      case 'fact': return q
      case 'creative': return `Như ánh đèn nháy lên một câu hỏi: ${q}`
      case 'strict': return `Trả lời ngay: ${q}`
      case 'confused': return `Hmm... có lẽ là: ${q} (tôi không chắc)`
      case 'hint': return `Thử nhé — gợi ý: đọc kỹ từng từ. ${q}`
    }
  }

  function nextDialog() {
    if (!dialog) return
    if (dialog.phase === 'intro') {
      // intro → mission (giao nhiệm vụ nếu NPC có missionBrief, ngược lại nhảy thẳng vào câu hỏi)
      if (dialog.npc.missionBrief) {
        setDialog({ ...dialog, phase: 'mission', typedChars: 0, lastTickAt: performance.now() })
      } else {
        setDialog({ ...dialog, phase: 'question', selected: null, typedChars: 0, lastTickAt: performance.now() })
      }
    } else if (dialog.phase === 'mission') {
      // mission → câu hỏi đầu tiên
      setDialog({ ...dialog, phase: 'question', questionIdx: 0, selected: null, typedChars: 0, lastTickAt: performance.now() })
    } else if (dialog.phase === 'explain') {
      const next = dialog.questionIdx + 1
      if (next >= dialog.npc.questions.length) {
        // Hết câu hỏi → vào phase reward (nếu có keyReward) hoặc done
        if (dialog.npc.keyReward) {
          setDialog({ ...dialog, phase: 'reward', typedChars: 0, lastTickAt: performance.now() })
        } else {
          setDialog({ ...dialog, phase: 'done', typedChars: 0, lastTickAt: performance.now() })
        }
      } else {
        setDialog({ ...dialog, phase: 'question', questionIdx: next, selected: null, typedChars: 0, lastTickAt: performance.now() })
      }
    } else if (dialog.phase === 'reward') {
      // Trao key (nếu đạt ngưỡng) rồi sang done
      const total = dialog.npc.questions.length
      const pass = dialog.correctCount >= Math.ceil(total * 0.6)
      if (pass && dialog.npc.keyReward) {
        const keyId = dialog.npc.keyReward.id
        setKeys(prev => prev.includes(keyId) ? prev : [...prev, keyId])
        setToast({ text: `🗝️ Nhận ${dialog.npc.keyReward.name}!`, kind: 'good' })
        setTimeout(() => setToast(null), 2000)
        audioRef.current?.sfx('pickup')
      }
      setDialog({ ...dialog, phase: 'done', typedChars: 0, lastTickAt: performance.now() })
    } else if (dialog.phase === 'done') {
      // NPC defeated (nếu đạt ngưỡng) hoặc vẫn có thể gặp lại (nếu fail)
      const total = dialog.npc.questions.length
      const pass = dialog.correctCount >= Math.ceil(total * 0.6)
      if (pass) {
        stateRef.current.npcs.forEach(n => { if (n.id === dialog.npc.id) n.defeated = true })
        setDefeated(prev => prev.includes(dialog.npc.id) ? prev : [...prev, dialog.npc.id])
      }
      setDialog(null)
    }
  }

  function answerQuestion(idx: number) {
    if (!dialog || dialog.phase !== 'question' || dialog.selected !== null) return
    const q = dialog.npc.questions[dialog.questionIdx]
    const ok = idx === q.correct
    // Confused-Bot: 25% chance nói ngược lại (student phải tự kiểm chứng)
    const botDeceives = dialog.npc.personality === 'confused' && Math.random() < 0.25
    if (ok) {
      setXp(x => x + 10)
      setCoins(c => c + 5)
      setToast({ text: botDeceives ? '🤖 Bot nói em sai... nhưng +10 XP!' : '+10 XP, +5 ◊', kind: 'good' })
      audioRef.current?.sfx('correct')
    } else {
      setXp(x => Math.max(0, x - 2))
      setToast({ text: botDeceives ? '🤖 Bot nói đúng... nhưng -2 XP (bot lú!)' : 'Sai rồi! -2 XP', kind: 'bad' })
      audioRef.current?.sfx('wrong')
    }
    setTimeout(() => setToast(null), 1500)
    setDialog({
      ...dialog,
      selected: idx,
      phase: 'explain',
      typedChars: 0,
      lastTickAt: performance.now(),
      correctCount: dialog.correctCount + (ok ? 1 : 0),
    })
  }

  function resetGame() {
    sessionStorage.removeItem(SAVE_KEY)
    setXp(0); setCoins(0); setDefeated([]); setKeys([])
    stateRef.current.pos = { ...ALL_MAPS.campus.spawn }
    initialSave.current = loadSave()
    loadMap('campus')
    setCompleted(false)
    setPaused(false)
  }

  const totalNpcs = Object.values(ALL_MAPS).reduce((acc, m) => acc + m.npcs.length, 0)
  const progress = TOTAL_KEYS > 0 ? Math.round(keys.length / TOTAL_KEYS * 100) : 0

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin/labs" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Quay lại Labs
            </Link>
            <div className="hidden md:flex items-center gap-2 text-purple-300">
              <Brain className="w-5 h-5" />
              <span className="font-bold">PixelAgents — AI RPG</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-yellow-300"><Zap className="w-4 h-4" />{xp} XP</div>
            <div className="flex items-center gap-1 text-amber-300"><Coins className="w-4 h-4" />{coins}</div>
            <div className="flex items-center gap-1 text-emerald-300" title="Chìa khoá đã nhận">
              <span className="text-base">🗝️</span>{keys.length}/{TOTAL_KEYS}
            </div>
            <div className="flex items-center gap-1 text-slate-300"><Trophy className="w-4 h-4" />{defeated.length}/{totalNpcs}</div>
            <button onClick={() => setMusicOn(m => !m)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" title={musicOn ? 'Tắt nhạc' : 'Bật nhạc'}>
              {musicOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setHelpOpen(true)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" title="Hướng dẫn">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={() => setPaused(p => !p)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20" title="Tạm dừng">
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Game canvas + side panel */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="relative rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-slate-900">
          <canvas ref={canvasRef} className="block w-full" />

          {/* Toast */}
          {toast && (
            <div className={[
              'absolute top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg font-bold shadow-lg',
              toast.kind === 'good' ? 'bg-emerald-500 text-white' :
              toast.kind === 'bad'  ? 'bg-rose-500 text-white' :
                                       'bg-blue-500 text-white',
            ].join(' ')}>
              {toast.text}
            </div>
          )}

          {/* Pause overlay */}
          {paused && !dialog && !completed && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">⏸ Tạm dừng</div>
                <p className="text-slate-300 mb-4">Nhấn ESC hoặc nút Play để tiếp tục</p>
                <button onClick={() => setPaused(false)}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold">
                  Tiếp tục
                </button>
              </div>
            </div>
          )}

          {/* Dialog overlay */}
          {dialog && (
            <div className="absolute left-0 right-0 bottom-0 bg-gradient-to-t from-black/95 to-black/70 p-6 border-t-4 border-yellow-400">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{dialog.npc.emoji}</div>
                <div>
                  <div className="font-bold text-yellow-300">{dialog.npc.name}</div>
                  <div className="text-xs text-slate-400">Personality: {dialog.npc.personality}</div>
                </div>
                <button onClick={() => setDialog(null)} className="ml-auto p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-base text-white mb-4 min-h-[3rem]">
                {currentDialogText(dialog).slice(0, dialog.typedChars)}
                {dialog.typedChars < currentDialogText(dialog).length && <span className="animate-pulse">▍</span>}
              </p>

              {dialog.phase === 'question' && dialog.typedChars >= currentDialogText(dialog).length && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {dialog.npc.questions[dialog.questionIdx].choices.map((c, i) => (
                    <button key={i} onClick={() => answerQuestion(i)}
                      className={[
                        'text-left px-3 py-2 rounded border transition-all',
                        dialog.selected === null ? 'bg-white/5 hover:bg-white/15 border-white/20' :
                        i === dialog.npc.questions[dialog.questionIdx].correct ? 'bg-emerald-500/30 border-emerald-400' :
                        i === dialog.selected ? 'bg-rose-500/30 border-rose-400' :
                                                'bg-white/5 border-white/10',
                      ].join(' ')}
                      disabled={dialog.selected !== null}>
                      <span className="font-bold mr-2">{['A', 'B', 'C', 'D'][i]}.</span>{c}
                    </button>
                  ))}
                </div>
              )}

              {/* Phase reward: hiển thị chìa khoá nhận được */}
              {dialog.phase === 'reward' && dialog.typedChars >= currentDialogText(dialog).length && (
                <div className="mb-3">
                  {(() => {
                    const total = dialog.npc.questions.length
                    const pass = dialog.correctCount >= Math.ceil(total * 0.6)
                    if (!pass) return null
                    const k = dialog.npc.keyReward
                    if (!k) return null
                    return (
                      <div className="flex items-center gap-3 bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3 animate-pulse">
                        <div className="text-4xl">🗝️</div>
                        <div>
                          <div className="font-bold text-yellow-200">{k.name}</div>
                          <div className="text-xs text-yellow-300/80">Đã thêm vào kho đồ</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {(dialog.phase === 'intro' || dialog.phase === 'mission' || dialog.phase === 'explain' || dialog.phase === 'reward' || dialog.phase === 'done') && (
                <button onClick={nextDialog}
                  className="mt-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded inline-flex items-center gap-2">
                  {dialog.phase === 'done' ? 'Kết thúc' :
                   dialog.phase === 'mission' ? 'Bắt đầu (E)' :
                   dialog.phase === 'reward' ? 'Nhận (E)' :
                   'Tiếp (E) ▶'}
                </button>
              )}
            </div>
          )}

          {/* Help overlay */}
          {helpOpen && (
            <div className="absolute inset-0 bg-black/85 p-6 overflow-y-auto">
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">📖 Hướng dẫn</h3>
                  <button onClick={() => setHelpOpen(false)} className="p-1 hover:bg-white/10 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 text-sm text-slate-200">
                  <p><kbd className="bg-white/10 px-2 py-0.5 rounded">WASD</kbd> hoặc <kbd className="bg-white/10 px-2 py-0.5 rounded">↑↓←→</kbd>: di chuyển</p>
                  <p><kbd className="bg-white/10 px-2 py-0.5 rounded">E</kbd>: tương tác / nói chuyện / tiếp tục hội thoại</p>
                  <p><kbd className="bg-white/10 px-2 py-0.5 rounded">1</kbd>–<kbd className="bg-white/10 px-2 py-0.5 rounded">4</kbd>: chọn đáp án A/B/C/D trong bài test</p>
                  <p><kbd className="bg-white/10 px-2 py-0.5 rounded">ESC</kbd>: tạm dừng / đóng dialog</p>
                  <p><kbd className="bg-white/10 px-2 py-0.5 rounded">H</kbd>: bật/tắt hướng dẫn</p>
                  <hr className="border-white/20" />
                  <p>🏛️ <b>7 phòng học</b>: mỗi phòng có <b>1 giáo viên-hướng dẫn viên</b>. Vào phòng → bấm <kbd>E</kbd> → nghe giao nhiệm vụ → hoàn thành test.</p>
                  <p>🗝️ <b>Chìa khoá</b>: hoàn thành test của mỗi phòng sẽ nhận 1 chìa khoá (hiển thị ở HUD).</p>
                  <p>🏆 Sưu tập đủ <b>7 chìa khoá</b> để nhận chứng chỉ Aeroedu Academy.</p>
                  <p>🎵 Nhạc nền có thể bật/tắt ở góc phải trên.</p>
                </div>
              </div>
            </div>
          )}

          {/* Completion */}
          {completed && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 to-pink-900/95 flex items-center justify-center p-6 overflow-y-auto">
              <div className="text-center max-w-lg">
                <div className="text-6xl mb-3">🎓</div>
                <h2 className="text-3xl font-bold mb-2">Chúc mừng!</h2>
                <p className="text-slate-200 mb-4">
                  Em đã hoàn thành toàn bộ <b>{TOTAL_KEYS} phòng học</b> và sưu tập đủ chìa khoá Aeroedu Academy.
                </p>
                <div className="grid grid-cols-7 gap-2 mb-4 max-w-sm mx-auto">
                  {Object.values(ALL_KEYS).map(k => (
                    <div key={k.id}
                      className="aspect-square rounded-lg flex items-center justify-center text-2xl border-2 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.7)]"
                      style={{ backgroundColor: `${k.color}44` }}
                      title={k.name}>
                      🗝️
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  Tổng XP: <b className="text-yellow-300">{xp}</b> · Coins: <b className="text-amber-300">{coins}</b>
                </p>
                <button onClick={resetGame}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold inline-flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Chơi lại
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <aside className="space-y-4">
          {/* Inventory — chìa khoá */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <span className="text-lg">🗝️</span> Kho chìa khoá ({keys.length}/{TOTAL_KEYS})
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(ALL_KEYS).map(k => {
                const owned = keys.includes(k.id)
                return (
                  <div key={k.id}
                    title={owned ? k.name : `Chưa có: ${k.name}`}
                    className={[
                      'aspect-square rounded-lg flex items-center justify-center text-2xl border-2 transition-all',
                      owned ? 'border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'border-white/10 opacity-30 grayscale',
                    ].join(' ')}
                    style={owned ? { backgroundColor: `${k.color}33` } : { backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    {owned ? '🗝️' : '🔒'}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-purple-300" /> Lộ trình học</h3>
            <div className="text-xs text-slate-300 mb-2">Đang ở: <b className="text-white">{ALL_MAPS[currentMapId].name}</b></div>
            <div className="space-y-1.5 text-xs">
              {Object.values(ALL_MAPS).map(m => {
                const mapNpcs = m.npcs
                const mapDef = mapNpcs.filter(n => defeated.includes(n.id)).length
                const hasKey = mapNpcs.some(n => n.keyReward && keys.includes(n.keyReward.id))
                return (
                  <div key={m.id} className={[
                    'px-2 py-1.5 rounded flex items-center justify-between gap-2',
                    m.id === currentMapId ? 'bg-purple-500/20 text-purple-200' : 'text-slate-300',
                  ].join(' ')}>
                    <span className="truncate">{m.id === 'campus' ? '🏞️' : '🏛️'} {m.name}</span>
                    <span className="text-[10px] tabular-nums opacity-70 flex items-center gap-1">
                      {hasKey && <span className="text-yellow-300">🗝️</span>}
                      {mapNpcs.length > 0 ? `${mapDef}/${mapNpcs.length}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="font-bold mb-2">Tiến độ học tập</h3>
            <div className="bg-white/10 h-3 rounded overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-slate-300">{keys.length}/{TOTAL_KEYS} chìa khoá ({progress}%)</div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-slate-300">
            <h3 className="font-bold text-white mb-2">💡 Mẹo</h3>
            <ul className="space-y-1.5">
              <li>• Vào toà nhà qua <b>cửa nâu</b> ở giữa</li>
              <li>• Đứng cạnh giáo viên → nhấn <kbd>E</kbd> để nói chuyện</li>
              <li>• Chọn đáp án bằng phím <kbd>1</kbd>–<kbd>4</kbd></li>
              <li>• Hoàn thành test → nhận 🗝️ chìa khoá môn</li>
              <li>• Đủ 7 chìa khoá → mở chứng chỉ Aeroedu</li>
            </ul>
          </div>

          <button onClick={resetGame}
            className="w-full px-3 py-2 text-xs bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded text-rose-300 inline-flex items-center justify-center gap-2">
            <RotateCcw className="w-3 h-3" /> Reset tiến độ
          </button>
        </aside>
      </div>
    </div>
  )
}
