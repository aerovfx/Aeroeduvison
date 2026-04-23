/**
 * 34 đơn vị hành chính cấp tỉnh của Việt Nam sau đợt sáp nhập 2025.
 *
 * Cơ sở pháp lý:
 *   - Nghị quyết 60/NQ-TW (2025) của Trung ương về sắp xếp đơn vị hành chính
 *   - Nghị quyết của Quốc hội khoá XV (kỳ họp 9) thông qua phương án sáp nhập
 *     63 tỉnh/thành → 34 đơn vị, hiệu lực 01/07/2025.
 *
 * Mô hình:
 *   6 thành phố trực thuộc trung ương + 28 tỉnh.
 *   Mỗi đơn vị ghi rõ tên mới, toạ độ trung tâm hành chính, các tỉnh sáp nhập
 *   (mergedFrom) và một mô tả ngắn bằng tiếng Việt — dùng làm tooltip trên
 *   bản đồ WorldMonitor hero globe của trang chủ.
 */

export type ProvinceKind = 'central-city' | 'province'

export interface VNProvince2025 {
  /** Slug id — latin, không dấu, không space. */
  id: string
  /** Tên chính thức sau sáp nhập. */
  name: string
  kind: ProvinceKind
  /** Thủ phủ / trung tâm hành chính. */
  capital: string
  /** Toạ độ trung tâm. */
  lat: number
  lon: number
  /** Các tỉnh/thành cũ đã gộp vào (tên tiếng Việt, bao gồm cả tỉnh cốt lõi). */
  mergedFrom: string[]
  /** Mô tả ngắn (1–2 câu). */
  description: string
  /** Diện tích (km²) — xấp xỉ. */
  areaKm2?: number
  /** Dân số (triệu người) — xấp xỉ. */
  populationM?: number
}

export const VN_PROVINCES_2025: VNProvince2025[] = [
  /* ══ 6 THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG ══ */
  {
    id: 'hanoi', name: 'Hà Nội', kind: 'central-city', capital: 'Hà Nội',
    lat: 21.0285, lon: 105.8542,
    mergedFrom: ['Hà Nội'],
    description: 'Thủ đô nước Cộng hoà Xã hội Chủ nghĩa Việt Nam. Giữ nguyên địa giới sau đợt sáp nhập 2025.',
    areaKm2: 3359, populationM: 8.6,
  },
  {
    id: 'haiphong', name: 'Hải Phòng', kind: 'central-city', capital: 'Hải Phòng',
    lat: 20.8449, lon: 106.6881,
    mergedFrom: ['Hải Phòng', 'Hải Dương'],
    description: 'Thành phố cảng lớn nhất miền Bắc, sáp nhập thêm Hải Dương năm 2025 — trung tâm công nghiệp & logistics.',
    areaKm2: 3232, populationM: 4.2,
  },
  {
    id: 'hue', name: 'Huế', kind: 'central-city', capital: 'Huế',
    lat: 16.4637, lon: 107.5909,
    mergedFrom: ['Thừa Thiên Huế'],
    description: 'Cố đô triều Nguyễn, được nâng cấp lên thành phố trực thuộc trung ương năm 2025. Di sản văn hoá UNESCO.',
    areaKm2: 4947, populationM: 1.2,
  },
  {
    id: 'danang', name: 'Đà Nẵng', kind: 'central-city', capital: 'Đà Nẵng',
    lat: 16.0544, lon: 108.2022,
    mergedFrom: ['Đà Nẵng', 'Quảng Nam'],
    description: 'Sáp nhập với Quảng Nam 2025 — bao gồm phố cổ Hội An, thánh địa Mỹ Sơn, trung tâm du lịch & công nghệ miền Trung.',
    areaKm2: 11867, populationM: 3.0,
  },
  {
    id: 'hcmc', name: 'Thành phố Hồ Chí Minh', kind: 'central-city', capital: 'TP. Hồ Chí Minh',
    lat: 10.8231, lon: 106.6297,
    mergedFrom: ['TP. Hồ Chí Minh', 'Bình Dương', 'Bà Rịa – Vũng Tàu'],
    description: 'Siêu đô thị lớn nhất Việt Nam sau sáp nhập 2025. Bao gồm toàn bộ vùng công nghiệp Bình Dương và bờ biển Vũng Tàu.',
    areaKm2: 6772, populationM: 13.7,
  },
  {
    id: 'cantho', name: 'Cần Thơ', kind: 'central-city', capital: 'Cần Thơ',
    lat: 10.0452, lon: 105.7469,
    mergedFrom: ['Cần Thơ', 'Sóc Trăng', 'Hậu Giang'],
    description: 'Trung tâm Đồng bằng sông Cửu Long. Sáp nhập với Sóc Trăng và Hậu Giang, mở rộng tới biển Đông.',
    areaKm2: 6360, populationM: 3.2,
  },

  /* ══ 28 TỈNH ══ */
  {
    id: 'laichau', name: 'Lai Châu', kind: 'province', capital: 'Lai Châu',
    lat: 22.3967, lon: 103.4577, mergedFrom: ['Lai Châu'],
    description: 'Giáp biên giới Trung Quốc, giữ nguyên địa giới. Nhiều bản làng H\'Mông, Thái.',
    areaKm2: 9069, populationM: 0.48,
  },
  {
    id: 'dienbien', name: 'Điện Biên', kind: 'province', capital: 'Điện Biên Phủ',
    lat: 21.3856, lon: 103.0169, mergedFrom: ['Điện Biên'],
    description: 'Giữ nguyên. Di tích chiến thắng Điện Biên Phủ lịch sử.',
    areaKm2: 9541, populationM: 0.62,
  },
  {
    id: 'sonla', name: 'Sơn La', kind: 'province', capital: 'Sơn La',
    lat: 21.3268, lon: 103.9188, mergedFrom: ['Sơn La'],
    description: 'Giữ nguyên. Cao nguyên Mộc Châu, hồ thuỷ điện Sơn La.',
    areaKm2: 14123, populationM: 1.3,
  },
  {
    id: 'langson', name: 'Lạng Sơn', kind: 'province', capital: 'Lạng Sơn',
    lat: 21.8537, lon: 106.7615, mergedFrom: ['Lạng Sơn'],
    description: 'Giữ nguyên. Cửa khẩu Hữu Nghị – cửa ngõ giao thương với Trung Quốc.',
    areaKm2: 8310, populationM: 0.82,
  },
  {
    id: 'caobang', name: 'Cao Bằng', kind: 'province', capital: 'Cao Bằng',
    lat: 22.6666, lon: 106.2583, mergedFrom: ['Cao Bằng'],
    description: 'Giữ nguyên. Thác Bản Giốc, công viên địa chất toàn cầu UNESCO.',
    areaKm2: 6701, populationM: 0.54,
  },
  {
    id: 'tuyenquang', name: 'Tuyên Quang', kind: 'province', capital: 'Tuyên Quang',
    lat: 21.8237, lon: 105.2181,
    mergedFrom: ['Tuyên Quang', 'Hà Giang'],
    description: 'Sáp nhập với Hà Giang 2025. Cao nguyên đá Đồng Văn, cột cờ Lũng Cú – điểm cực Bắc Tổ quốc.',
    areaKm2: 13595, populationM: 1.8,
  },
  {
    id: 'laocai', name: 'Lào Cai', kind: 'province', capital: 'Lào Cai',
    lat: 22.4856, lon: 103.9723,
    mergedFrom: ['Lào Cai', 'Yên Bái'],
    description: 'Sáp nhập với Yên Bái 2025. Fansipan – "nóc nhà Đông Dương", ruộng bậc thang Mù Cang Chải.',
    areaKm2: 13257, populationM: 1.6,
  },
  {
    id: 'thainguyen', name: 'Thái Nguyên', kind: 'province', capital: 'Thái Nguyên',
    lat: 21.5942, lon: 105.8482,
    mergedFrom: ['Thái Nguyên', 'Bắc Kạn'],
    description: 'Sáp nhập với Bắc Kạn 2025. Thủ phủ "thép" miền Bắc + hồ Ba Bể.',
    areaKm2: 8376, populationM: 1.7,
  },
  {
    id: 'phutho', name: 'Phú Thọ', kind: 'province', capital: 'Việt Trì',
    lat: 21.3023, lon: 105.4024,
    mergedFrom: ['Phú Thọ', 'Vĩnh Phúc', 'Hoà Bình'],
    description: 'Tam hợp Phú Thọ – Vĩnh Phúc – Hoà Bình năm 2025. Đền Hùng, thuỷ điện Hoà Bình.',
    areaKm2: 10926, populationM: 3.8,
  },
  {
    id: 'bacninh', name: 'Bắc Ninh', kind: 'province', capital: 'Bắc Ninh',
    lat: 21.1861, lon: 106.0763,
    mergedFrom: ['Bắc Ninh', 'Bắc Giang'],
    description: 'Sáp nhập với Bắc Giang 2025. Trung tâm công nghiệp điện tử (Samsung, Foxconn), làng quan họ.',
    areaKm2: 4618, populationM: 3.6,
  },
  {
    id: 'hungyen', name: 'Hưng Yên', kind: 'province', capital: 'Hưng Yên',
    lat: 20.6464, lon: 106.0511,
    mergedFrom: ['Hưng Yên', 'Thái Bình'],
    description: 'Sáp nhập với Thái Bình 2025. Vựa lúa đồng bằng sông Hồng, phố Hiến cổ.',
    areaKm2: 2515, populationM: 3.1,
  },
  {
    id: 'ninhbinh', name: 'Ninh Bình', kind: 'province', capital: 'Ninh Bình',
    lat: 20.2506, lon: 105.9745,
    mergedFrom: ['Ninh Bình', 'Hà Nam', 'Nam Định'],
    description: 'Tam hợp Ninh Bình – Hà Nam – Nam Định 2025. Tràng An, Tam Cốc, Bái Đính – di sản kép UNESCO.',
    areaKm2: 3942, populationM: 3.9,
  },
  {
    id: 'quangninh', name: 'Quảng Ninh', kind: 'province', capital: 'Hạ Long',
    lat: 20.9595, lon: 107.0443, mergedFrom: ['Quảng Ninh'],
    description: 'Giữ nguyên. Vịnh Hạ Long – di sản thiên nhiên thế giới.',
    areaKm2: 6178, populationM: 1.4,
  },
  {
    id: 'thanhhoa', name: 'Thanh Hoá', kind: 'province', capital: 'Thanh Hoá',
    lat: 19.8067, lon: 105.7852, mergedFrom: ['Thanh Hoá'],
    description: 'Giữ nguyên. Thành nhà Hồ di sản UNESCO, bãi biển Sầm Sơn.',
    areaKm2: 11115, populationM: 3.7,
  },
  {
    id: 'nghean', name: 'Nghệ An', kind: 'province', capital: 'Vinh',
    lat: 18.6734, lon: 105.6923, mergedFrom: ['Nghệ An'],
    description: 'Giữ nguyên. Quê hương Chủ tịch Hồ Chí Minh (làng Sen, Kim Liên).',
    areaKm2: 16493, populationM: 3.4,
  },
  {
    id: 'hatinh', name: 'Hà Tĩnh', kind: 'province', capital: 'Hà Tĩnh',
    lat: 18.3559, lon: 105.8877, mergedFrom: ['Hà Tĩnh'],
    description: 'Giữ nguyên. Khu kinh tế Vũng Áng, ngã ba Đồng Lộc lịch sử.',
    areaKm2: 5990, populationM: 1.3,
  },
  {
    id: 'quangtri', name: 'Quảng Trị', kind: 'province', capital: 'Đông Hà',
    lat: 16.7943, lon: 106.9631,
    mergedFrom: ['Quảng Trị', 'Quảng Bình'],
    description: 'Sáp nhập với Quảng Bình 2025. Hang Sơn Đoòng – hang động lớn nhất thế giới, địa đạo Vịnh Mốc.',
    areaKm2: 12748, populationM: 1.5,
  },
  {
    id: 'quangngai', name: 'Quảng Ngãi', kind: 'province', capital: 'Quảng Ngãi',
    lat: 15.1214, lon: 108.8045,
    mergedFrom: ['Quảng Ngãi', 'Kon Tum'],
    description: 'Sáp nhập với Kon Tum 2025. Đảo Lý Sơn + ngã ba Đông Dương.',
    areaKm2: 14969, populationM: 1.9,
  },
  {
    id: 'gialai', name: 'Gia Lai', kind: 'province', capital: 'Pleiku',
    lat: 13.9833, lon: 108.0,
    mergedFrom: ['Gia Lai', 'Bình Định'],
    description: 'Sáp nhập với Bình Định 2025. Từ cao nguyên Pleiku tới bãi biển Quy Nhơn – tỉnh có cả rừng lẫn biển.',
    areaKm2: 21576, populationM: 3.2,
  },
  {
    id: 'khanhhoa', name: 'Khánh Hoà', kind: 'province', capital: 'Nha Trang',
    lat: 12.2388, lon: 109.1967,
    mergedFrom: ['Khánh Hoà', 'Ninh Thuận'],
    description: 'Sáp nhập với Ninh Thuận 2025. Vịnh Nha Trang, vịnh Vân Phong, tháp Chăm Po Klong Garai.',
    areaKm2: 8555, populationM: 2.1,
  },
  {
    id: 'lamdong', name: 'Lâm Đồng', kind: 'province', capital: 'Đà Lạt',
    lat: 11.9404, lon: 108.4583,
    mergedFrom: ['Lâm Đồng', 'Đắk Nông', 'Bình Thuận'],
    description: 'Tam hợp Lâm Đồng – Đắk Nông – Bình Thuận 2025. Cao nguyên Đà Lạt mộng mơ tới biển Mũi Né.',
    areaKm2: 24233, populationM: 3.4,
  },
  {
    id: 'daklak', name: 'Đắk Lắk', kind: 'province', capital: 'Buôn Ma Thuột',
    lat: 12.7100, lon: 108.2378,
    mergedFrom: ['Đắk Lắk', 'Phú Yên'],
    description: 'Sáp nhập với Phú Yên 2025. Thủ phủ cà phê Robusta + gành đá Đĩa.',
    areaKm2: 18478, populationM: 3.2,
  },
  {
    id: 'dongnai', name: 'Đồng Nai', kind: 'province', capital: 'Biên Hoà',
    lat: 10.9453, lon: 106.8247,
    mergedFrom: ['Đồng Nai', 'Bình Phước'],
    description: 'Sáp nhập với Bình Phước 2025. Trung tâm công nghiệp phía Nam, vườn quốc gia Nam Cát Tiên.',
    areaKm2: 12695, populationM: 4.4,
  },
  {
    id: 'tayninh', name: 'Tây Ninh', kind: 'province', capital: 'Tây Ninh',
    lat: 11.3352, lon: 106.1099,
    mergedFrom: ['Tây Ninh', 'Long An'],
    description: 'Sáp nhập với Long An 2025. Núi Bà Đen – đỉnh cao nhất Nam Bộ, đạo Cao Đài Toà Thánh.',
    areaKm2: 8532, populationM: 3.0,
  },
  {
    id: 'vinhlong', name: 'Vĩnh Long', kind: 'province', capital: 'Vĩnh Long',
    lat: 10.2537, lon: 105.9722,
    mergedFrom: ['Vĩnh Long', 'Bến Tre', 'Trà Vinh'],
    description: 'Tam hợp Vĩnh Long – Bến Tre – Trà Vinh 2025. Cù lao An Bình, quê hương Thanh Long & dừa.',
    areaKm2: 5042, populationM: 3.1,
  },
  {
    id: 'dongthap', name: 'Đồng Tháp', kind: 'province', capital: 'Cao Lãnh',
    lat: 10.4937, lon: 105.6882,
    mergedFrom: ['Đồng Tháp', 'Tiền Giang'],
    description: 'Sáp nhập với Tiền Giang 2025. Sen hồng Đồng Tháp Mười + chợ nổi Cái Bè.',
    areaKm2: 5938, populationM: 3.0,
  },
  {
    id: 'camau', name: 'Cà Mau', kind: 'province', capital: 'Cà Mau',
    lat: 9.1527, lon: 105.1967,
    mergedFrom: ['Cà Mau', 'Bạc Liêu'],
    description: 'Sáp nhập với Bạc Liêu 2025. Điểm cực Nam Tổ quốc + vườn quốc gia Mũi Cà Mau.',
    areaKm2: 7942, populationM: 2.1,
  },
  {
    id: 'angiang', name: 'An Giang', kind: 'province', capital: 'Long Xuyên',
    lat: 10.5216, lon: 105.1259,
    mergedFrom: ['An Giang', 'Kiên Giang'],
    description: 'Sáp nhập với Kiên Giang 2025. Bao gồm đảo Phú Quốc – đặc khu kinh tế du lịch hàng đầu.',
    areaKm2: 10914, populationM: 3.9,
  },
]

/* ══════════════════════════════════════════════════════════════════════
   VIETNAMESE LANDMARKS — điểm tham quan / di sản nổi bật
   (Được bổ sung dưới dạng lớp phủ bổ sung, độc lập với ranh giới tỉnh.)
══════════════════════════════════════════════════════════════════════ */

export type LandmarkKind = 'heritage' | 'nature' | 'historic' | 'beach' | 'mountain' | 'city'

export interface VNLandmark {
  id: string
  name: string
  province: string
  lat: number
  lon: number
  kind: LandmarkKind
  description: string
  unesco?: boolean
}

export const VN_LANDMARKS: VNLandmark[] = [
  { id: 'halong',    name: 'Vịnh Hạ Long',            province: 'Quảng Ninh', lat: 20.9101, lon: 107.1839, kind: 'nature',   unesco: true,  description: 'Di sản thiên nhiên thế giới UNESCO với hơn 1.600 đảo đá vôi.' },
  { id: 'phongnha',  name: 'Phong Nha – Kẻ Bàng',     province: 'Quảng Trị',  lat: 17.5500, lon: 106.1800, kind: 'nature',   unesco: true,  description: 'Công viên quốc gia với hang Sơn Đoòng – hang động lớn nhất thế giới.' },
  { id: 'trangan',   name: 'Quần thể Tràng An',       province: 'Ninh Bình',  lat: 20.2500, lon: 105.9000, kind: 'heritage', unesco: true,  description: 'Di sản kép văn hoá + thiên nhiên UNESCO 2014.' },
  { id: 'hue-citadel', name: 'Kinh thành Huế',        province: 'Huế',        lat: 16.4697, lon: 107.5790, kind: 'heritage', unesco: true,  description: 'Kinh đô triều Nguyễn, di sản văn hoá UNESCO 1993.' },
  { id: 'hoian',     name: 'Phố cổ Hội An',           province: 'Đà Nẵng',    lat: 15.8801, lon: 108.3383, kind: 'heritage', unesco: true,  description: 'Đô thị cổ bảo tồn nguyên vẹn, di sản văn hoá UNESCO 1999.' },
  { id: 'myson',     name: 'Thánh địa Mỹ Sơn',        province: 'Đà Nẵng',    lat: 15.7639, lon: 108.1242, kind: 'heritage', unesco: true,  description: 'Di tích Chăm Pa, di sản văn hoá UNESCO.' },
  { id: 'phuquoc',   name: 'Đảo Phú Quốc',            province: 'An Giang',   lat: 10.2270, lon: 103.9585, kind: 'beach',    description: 'Đảo ngọc lớn nhất Việt Nam, đặc khu kinh tế.' },
  { id: 'dalat',     name: 'Cao nguyên Đà Lạt',       province: 'Lâm Đồng',   lat: 11.9404, lon: 108.4583, kind: 'city',     description: 'Thành phố ngàn hoa, khí hậu mát mẻ quanh năm.' },
  { id: 'fansipan',  name: 'Đỉnh Fansipan',           province: 'Lào Cai',    lat: 22.3032, lon: 103.7756, kind: 'mountain', description: 'Nóc nhà Đông Dương 3.147m.' },
  { id: 'mucangchai',name: 'Ruộng bậc thang Mù Cang Chải', province: 'Lào Cai', lat: 21.7870, lon: 104.0872, kind: 'nature', description: 'Ruộng bậc thang danh thắng quốc gia đặc biệt.' },
  { id: 'muine',     name: 'Mũi Né',                  province: 'Lâm Đồng',   lat: 10.9336, lon: 108.2870, kind: 'beach',    description: 'Đồi cát Bàu Trắng, thủ phủ thể thao biển.' },
  { id: 'cuchi',     name: 'Địa đạo Củ Chi',          province: 'TP. Hồ Chí Minh', lat: 11.1444, lon: 106.4644, kind: 'historic', description: 'Hệ thống đường hầm 250km thời kháng chiến.' },
  { id: 'dienbien',  name: 'Di tích Điện Biên Phủ',   province: 'Điện Biên',  lat: 21.3833, lon: 103.0170, kind: 'historic', description: 'Chiến trường lịch sử 1954.' },
  { id: 'banhgioc',  name: 'Thác Bản Giốc',           province: 'Cao Bằng',   lat: 22.8534, lon: 106.7231, kind: 'nature',   description: 'Thác nước biên giới đẹp nhất Việt Nam.' },
  { id: 'lungcu',    name: 'Cột cờ Lũng Cú',          province: 'Tuyên Quang',lat: 23.3767, lon: 105.3239, kind: 'historic', description: 'Điểm cực Bắc Tổ quốc.' },
  { id: 'camau-tip', name: 'Mũi Cà Mau',              province: 'Cà Mau',     lat: 8.5667,  lon: 104.8333, kind: 'nature',   description: 'Điểm cực Nam Tổ quốc, vườn quốc gia ngập mặn.' },
  { id: 'sonla-hydro', name: 'Thuỷ điện Sơn La',      province: 'Sơn La',     lat: 21.5172, lon: 103.8442, kind: 'historic', description: 'Nhà máy thuỷ điện lớn nhất Đông Nam Á.' },
  { id: 'temple-of-literature', name: 'Văn Miếu – Quốc Tử Giám', province: 'Hà Nội', lat: 21.0283, lon: 105.8358, kind: 'heritage', description: 'Trường đại học đầu tiên của Việt Nam (1076).' },
  { id: 'thang-long', name: 'Hoàng thành Thăng Long', province: 'Hà Nội',     lat: 21.0367, lon: 105.8406, kind: 'heritage', unesco: true, description: 'Di sản văn hoá UNESCO 2010.' },
  { id: 'nhatrang',  name: 'Vịnh Nha Trang',          province: 'Khánh Hoà',  lat: 12.2388, lon: 109.1967, kind: 'beach',    description: 'Một trong 29 vịnh đẹp nhất thế giới.' },
]

/** Màu marker theo loại đơn vị hành chính. */
export const PROVINCE_KIND_COLORS: Record<ProvinceKind, string> = {
  'central-city': '#22d3ee', // cyan — TP trực thuộc trung ương
  'province':     '#a78bfa', // purple-light — tỉnh
}

/** Màu marker theo loại landmark. */
export const LANDMARK_KIND_COLORS: Record<LandmarkKind, string> = {
  heritage: '#e879f9', // pink — di sản văn hoá
  nature:   '#10b981', // green — thiên nhiên
  historic: '#f59e0b', // amber — lịch sử
  beach:    '#3b82f6', // blue — biển
  mountain: '#94a3b8', // slate — núi
  city:     '#22d3ee', // cyan — thành phố
}

/** Vietnam bounding box + center — cho camera khởi tạo của globe. */
export const VIETNAM_BOUNDS = {
  center: { lat: 16.0, lon: 107.5 },
  north: 23.5, south: 8.5, west: 102.0, east: 110.0,
}
