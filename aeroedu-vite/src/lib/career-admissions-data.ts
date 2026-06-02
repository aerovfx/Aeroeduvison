/**
 * career-admissions-data.ts — Điểm chuẩn ĐH VN 2024-2025 + xu hướng ngành.
 *
 * NGUỒN tham khảo: tổng hợp công khai từ websites trường + báo lớn.
 *   - Điểm 2025 (thang 30, điểm thi THPT): baochinhphu.vn, xaydungchinhsach.chinhphu.vn,
 *     vietnamnet.vn, vnexpress.net, tuoitre.vn, thanhnien.vn, nhandan.vn, laodong.vn,
 *     giaoduc.net.vn, daibieunhandan.vn + .edu.vn (uet/usth/huce/hust...). Tra cứu 2026-06.
 *   - Trường xét THANG KHÁC (BKHCM thang 100; AJC/HAU/HOU/CĐ thang 40 có môn ×2 / năng khiếu)
 *     → KHÔNG điền cutoff2025 thang-30 (để null, fallback 2024) + ghi rõ ở `notes`.
 *   - CĐ: quy đổi thang 40 → 30 (×0.75) để tính cùng hệ; đánh dấu level:'college'.
 * Đây là CON SỐ THAM KHẢO — mỗi mùa tuyển sinh trường công bố lại; trước khi nộp
 * hồ sơ nên verify trên website chính thức của trường.
 *
 * Cấu trúc:
 *   MAJORS[]: 20 ngành lớn × 3-5 trường top (~80 records)
 *   CAREER_MAJOR_MAP: careerId/career-name → majorIds liên quan
 *   Mỗi trường: cutoff2025 (gần nhất) / cutoff2024 / cutoff2023 + xu hướng
 *
 * Helper:
 *   latestCutoff(u)      — điểm chuẩn năm gần nhất có dữ liệu
 *   evaluateAdmissionFit — đánh giá khả năng đỗ theo điểm user
 *   analyzeGap(major,pts)— "cần thêm bao nhiêu điểm" tới mục tiêu gần/top
 *   cutoffTrend(u)       — xu hướng 2 năm gần nhất
 *
 * Khối thi quy ước (Bộ GD&ĐT):
 *   A00 = Toán+Lý+Hoá   A01 = Toán+Lý+Anh
 *   B00 = Toán+Hoá+Sinh  C00 = Văn+Sử+Địa
 *   D01 = Toán+Văn+Anh   D07 = Toán+Hoá+Anh
 *   V00 = Toán+Lý+Vẽ (kiến trúc)  H00 = Văn+Vẽ (thiết kế)
 */

export type SubjectGroup = 'A00' | 'A01' | 'B00' | 'C00' | 'D01' | 'D07' | 'V00' | 'H00' | 'C03' | 'D14'
export type TrendDirection = 'hot' | 'stable' | 'declining' | 'recovering'

export interface UniversityCutoff {
  /** Mã trường — viết tắt phổ biến */
  code: string
  /** Tên đầy đủ */
  name: string
  /** Vị trí (HN / TP.HCM / Đà Nẵng / ...) */
  location: string
  /** Khối thi áp dụng cho ngành này */
  groups: SubjectGroup[]
  /** Điểm chuẩn THPT 2025 (thang 30) — năm gần nhất, null nếu chưa cập nhật */
  cutoff2025?: number | null
  /** Điểm chuẩn THPT 2024 (thang 30) — null nếu chưa công bố / xét riêng */
  cutoff2024: number | null
  /** Điểm chuẩn THPT 2023 (để FE so sánh xu hướng) */
  cutoff2023: number | null
  /** Điểm xét học bạ 2024 (thang 30, nếu trường có phương thức này) */
  transcriptCutoff2024?: number | null
  /** Bậc đào tạo — mặc định 'university'. 'college' = Cao đẳng. */
  level?: 'university' | 'college'
  /** Lưu ý ngắn (xét tuyển kết hợp, IELTS, năng khiếu, ...) */
  notes?: string
}

export interface MajorAdmission {
  id: string
  /** Tên ngành đầy đủ */
  name: string
  /** Mã ngành cấp 4 phổ biến nhất (vd 7480201 = CNTT) — chỉ để tham khảo */
  code?: string
  /** Top trường ĐH có ngành này (sort theo cutoff giảm dần) */
  universities: UniversityCutoff[]
  /** Xu hướng 2025-2026 */
  trend: {
    direction: TrendDirection
    label: string
    /** 1 câu ngắn lý do (nguồn: tổng hợp tin tuyển sinh + thị trường lao động) */
    note: string
  }
  /** Mức lương khởi điểm tham khảo (triệu VND/tháng) */
  startingSalary?: { min: number; max: number }
}

/* ─────────────────── 20 ngành lớn (~80 records) ─────────────────── */

export const MAJORS: MajorAdmission[] = [
  // ── 1. CNTT ────────────────────────────────────────────
  {
    id: 'it', name: 'Công nghệ thông tin', code: '7480201',
    trend: { direction: 'hot', label: '🔥 Rất nóng',
      note: 'Cầu vượt cung suốt 5 năm — AI/ML, Data, Cybersecurity tăng mạnh. Lương cao top đầu.' },
    startingSalary: { min: 12, max: 25 },
    universities: [
      { code: 'BKHN', name: 'ĐH Bách Khoa Hà Nội (HUST)', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2025: 28.83, cutoff2024: 28.53, cutoff2023: 28.80,
        notes: 'IT2 (Kỹ thuật máy tính) 2025 = 28.83; KHDL&AI IT-E10 = 29.39' },
      { code: 'BKHCM', name: 'ĐH Bách Khoa TP.HCM', location: 'TP.HCM',
        groups: ['A00','A01'], cutoff2024: 27.50, cutoff2023: 27.30,
        notes: '2025 xét thang 100 (KHMT 85.41) — không quy về thang 30' },
      { code: 'UET', name: 'ĐH Công Nghệ — ĐHQG Hà Nội', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2025: 28.19, cutoff2024: 27.55, cutoff2023: 27.25 },
      { code: 'PTIT', name: 'Học viện Công nghệ BCVT (PTIT)', location: 'Hà Nội',
        groups: ['A00','A01','D01'], cutoff2025: 25.80, cutoff2024: 26.10, cutoff2023: 26.59 },
      { code: 'UIT', name: 'ĐH CNTT — ĐHQG TP.HCM', location: 'TP.HCM',
        groups: ['A00','A01'], cutoff2024: 27.30, cutoff2023: 27.10 },
      { code: 'CKC', name: 'CĐ Kỹ thuật Cao Thắng', location: 'TP.HCM', level: 'college',
        groups: ['A00','A01'], cutoff2025: 19.13, cutoff2024: null, cutoff2023: null,
        notes: 'Bậc CĐ — CNTT 2025 = 25.5/40 (Toán ×2) ≈ 19.13/30; xét học bạ 24' },
    ],
  },

  // ── 2. Y khoa ────────────────────────────────────────────
  {
    id: 'med', name: 'Y khoa (Bác sĩ đa khoa)', code: '7720101',
    trend: { direction: 'stable', label: 'Ổn định cao',
      note: 'Điểm chuẩn TOP — cạnh tranh nhất khối B00. Học 6 năm, thực hành dài; vẫn là lựa chọn an toàn lâu dài.' },
    startingSalary: { min: 8, max: 15 },
    universities: [
      { code: 'HMU', name: 'ĐH Y Hà Nội', location: 'Hà Nội',
        groups: ['B00'], cutoff2025: 28.13, cutoff2024: 28.27, cutoff2023: 27.73 },
      { code: 'PNU', name: 'ĐH Y Dược TP.HCM', location: 'TP.HCM',
        groups: ['B00'], cutoff2025: 27.34, cutoff2024: 27.80, cutoff2023: 27.34 },
      { code: 'VMU', name: 'ĐH Y Dược — ĐHQG Hà Nội', location: 'Hà Nội',
        groups: ['B00'], cutoff2025: 27.43, cutoff2024: 27.30, cutoff2023: 26.50 },
      { code: 'HUE-MED', name: 'ĐH Y Dược Huế', location: 'Huế',
        groups: ['B00'], cutoff2025: 25.17, cutoff2024: 26.55, cutoff2023: 26.00 },
    ],
  },

  // ── 3. Dược ────────────────────────────────────────────
  {
    id: 'pharm', name: 'Dược học', code: '7720201',
    trend: { direction: 'stable', label: 'Ổn định',
      note: 'Nhu cầu dược sĩ ổn định; thị trường ngày càng quản lý chặt → cử nhân chính quy có lợi thế.' },
    startingSalary: { min: 7, max: 12 },
    universities: [
      { code: 'HUP', name: 'ĐH Dược Hà Nội', location: 'Hà Nội',
        groups: ['A00'], cutoff2025: 24.50, cutoff2024: 26.18, cutoff2023: 25.05 },
      { code: 'HCMP', name: 'ĐH Y Dược TP.HCM (Dược)', location: 'TP.HCM',
        groups: ['A00','B00'], cutoff2025: 23.65, cutoff2024: 25.50, cutoff2023: 25.00 },
    ],
  },

  // ── 4. Kinh tế / Quản trị / Kế toán ─────────────────────
  {
    id: 'business', name: 'Kinh tế / Quản trị kinh doanh',
    trend: { direction: 'stable', label: 'Ổn định',
      note: 'Top trường (NEU/FTU/UEH) cạnh tranh cao; mức lương khởi điểm trung bình, tăng nhanh khi có kinh nghiệm.' },
    startingSalary: { min: 8, max: 14 },
    universities: [
      { code: 'NEU', name: 'ĐH Kinh tế Quốc dân (NEU)', location: 'Hà Nội',
        groups: ['A00','A01','D01','D07'], cutoff2025: 28.83, cutoff2024: 27.50, cutoff2023: 27.10,
        notes: 'Cao nhất trường 2025 (TMĐT) 28.83; QTKD/Logistics ~27–28.7' },
      { code: 'FTU', name: 'ĐH Ngoại Thương (FTU)', location: 'Hà Nội/TP.HCM',
        groups: ['A00','A01','D01','D07'], cutoff2025: 28.00, cutoff2024: 28.50, cutoff2023: 27.45,
        notes: 'Thuần THPT cao nhất 28.0 (KDQT); CT tiên tiến kết hợp CCNN tới 28.5' },
      { code: 'UEH', name: 'ĐH Kinh tế TP.HCM (UEH)', location: 'TP.HCM',
        groups: ['A00','A01','D01','D07'], cutoff2025: 27.70, cutoff2024: 27.00, cutoff2023: 26.80,
        notes: 'Cao nhất trường 2025 (Logistics) 27.70' },
      { code: 'UEB', name: 'ĐH Kinh tế — ĐHQG Hà Nội', location: 'Hà Nội',
        groups: ['A00','A01','D01'], cutoff2025: 25.72, cutoff2024: 25.50, cutoff2023: 25.00 },
    ],
  },

  // ── 5. Tài chính / Ngân hàng ──────────────────────────────
  {
    id: 'finance', name: 'Tài chính — Ngân hàng',
    trend: { direction: 'recovering', label: 'Phục hồi',
      note: 'Sau giai đoạn chững 2022-2023, ngân hàng và Fintech tuyển trở lại; cần kết hợp data/tech.' },
    startingSalary: { min: 9, max: 16 },
    universities: [
      { code: 'NEU', name: 'ĐH Kinh tế Quốc dân (NEU) — TC-NH', location: 'Hà Nội',
        groups: ['A00','A01','D01'], cutoff2024: 27.10, cutoff2023: 26.60 },
      { code: 'BANKING', name: 'Học viện Ngân hàng (HVNH)', location: 'Hà Nội',
        groups: ['A00','A01','D01'], cutoff2025: 26.50, cutoff2024: 25.93, cutoff2023: 25.80,
        notes: 'TC-NH 2025 = 26.5 (D01 gốc); C00/C03 +2.5; cao nhất trường Luật KT 26.97' },
      { code: 'UEH', name: 'ĐH Kinh tế TP.HCM — TC-NH', location: 'TP.HCM',
        groups: ['A00','A01','D01'], cutoff2024: 25.80, cutoff2023: 25.60 },
    ],
  },

  // ── 6. Marketing / Truyền thông ───────────────────────────
  {
    id: 'marketing', name: 'Marketing — Truyền thông',
    trend: { direction: 'hot', label: '🔥 Rất nóng',
      note: 'Digital Marketing + Content tăng mạnh; cạnh tranh đầu vào cao đặc biệt trường top.' },
    startingSalary: { min: 8, max: 15 },
    universities: [
      { code: 'NEU', name: 'NEU — Marketing', location: 'Hà Nội',
        groups: ['A00','A01','D01'], cutoff2024: 27.55, cutoff2023: 27.15 },
      { code: 'FTU', name: 'FTU — Truyền thông Marketing', location: 'HN/HCM',
        groups: ['A00','A01','D01'], cutoff2024: 28.10, cutoff2023: 27.50 },
      { code: 'UEH', name: 'UEH — Marketing', location: 'TP.HCM',
        groups: ['A00','A01','D01'], cutoff2024: 26.80, cutoff2023: 26.40 },
    ],
  },

  // ── 7. Báo chí / Truyền thông đại chúng ───────────────────
  {
    id: 'journalism', name: 'Báo chí — Truyền thông đại chúng', code: '7320101',
    trend: { direction: 'stable', label: 'Ổn định',
      note: 'Khối C cạnh tranh; cơ hội nghề mở rộng sang content, PR, social media.' },
    startingSalary: { min: 6, max: 12 },
    universities: [
      { code: 'AJC', name: 'Học viện Báo chí & Tuyên truyền', location: 'Hà Nội',
        groups: ['C00','D01','D14'], cutoff2024: 28.25, cutoff2023: 28.50,
        notes: '2025 ngành Báo nhiều CN xét thang 40 (Báo TH 35.96/40); ngành thang 30 ~23–25' },
      { code: 'USSH-HN', name: 'ĐH KHXH&NV — ĐHQG Hà Nội', location: 'Hà Nội',
        groups: ['C00','D01','D14'], cutoff2024: 28.83, cutoff2023: 28.78,
        notes: 'Báo chí 2025 ≥28 (C00); cao nhất trường QHCC 28.95' },
      { code: 'USSH-HCM', name: 'ĐH KHXH&NV — ĐHQG TP.HCM', location: 'TP.HCM',
        groups: ['C00','D01','D14'], cutoff2025: 28.55, cutoff2024: 28.00, cutoff2023: 27.50 },
    ],
  },

  // ── 8. Luật ───────────────────────────────────────────────
  {
    id: 'law', name: 'Luật học', code: '7380101',
    trend: { direction: 'stable', label: 'Ổn định',
      note: 'Vẫn là lựa chọn an toàn dài hạn; sau khi tốt nghiệp cần thi chứng chỉ hành nghề.' },
    startingSalary: { min: 7, max: 13 },
    universities: [
      { code: 'HLU', name: 'ĐH Luật Hà Nội', location: 'Hà Nội',
        groups: ['A00','A01','C00','D01'], cutoff2025: 25.55, cutoff2024: 27.36, cutoff2023: 26.50,
        notes: 'Luật KT 2025 = 25.55 (D01 gốc); C00 quy đổi 28.79' },
      { code: 'VNU-LAW', name: 'Khoa Luật — ĐHQG Hà Nội', location: 'Hà Nội',
        groups: ['A00','A01','C00','D01'], cutoff2025: 24.20, cutoff2024: 26.20, cutoff2023: 25.80 },
      { code: 'HCMU-LAW', name: 'ĐH Luật TP.HCM', location: 'TP.HCM',
        groups: ['A00','A01','C00','D01'], cutoff2025: 24.44, cutoff2024: 26.55, cutoff2023: 26.00 },
    ],
  },

  // ── 9. Sư phạm ────────────────────────────────────────────
  {
    id: 'edu', name: 'Sư phạm',
    trend: { direction: 'hot', label: '🔥 Nóng trở lại',
      note: 'Nghị định 71/2020 + 116/2020 hỗ trợ học phí; sư phạm Toán/Anh/Tin nhu cầu rất cao 2024-2030.' },
    startingSalary: { min: 6, max: 11 },
    universities: [
      { code: 'HNUE', name: 'ĐH Sư phạm Hà Nội (HNUE)', location: 'Hà Nội',
        groups: ['A00','A01','B00','C00','D01'], cutoff2025: 29.06, cutoff2024: 28.83, cutoff2023: 28.50,
        notes: 'Cao nhất 2025: SP Lịch sử 29.06' },
      { code: 'HCMUE', name: 'ĐH Sư phạm TP.HCM', location: 'TP.HCM',
        groups: ['A00','A01','B00','C00','D01'], cutoff2025: 29.38, cutoff2024: 28.60, cutoff2023: 28.15,
        notes: 'Cao nhất 2025: SP Hóa học 29.38; SP Ngữ văn 29.07' },
      { code: 'TNU', name: 'ĐH Thái Nguyên — SP', location: 'Thái Nguyên',
        groups: ['A00','C00','D01'], cutoff2024: 26.00, cutoff2023: 25.50 },
    ],
  },

  // ── 10. Kỹ thuật điện — điện tử ──────────────────────────
  {
    id: 'ee', name: 'Kỹ thuật điện — điện tử',
    trend: { direction: 'hot', label: '🔥 Nóng',
      note: 'Bán dẫn (semiconductor) + IoT đẩy nhu cầu lên cao; chính phủ ưu tiên đào tạo 50K kỹ sư đến 2030.' },
    startingSalary: { min: 10, max: 18 },
    universities: [
      { code: 'BKHN', name: 'BKHN — Kỹ thuật Điện-Điện tử', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2024: 27.10, cutoff2023: 26.62 },
      { code: 'BKHCM', name: 'BK TP.HCM — KT Điện', location: 'TP.HCM',
        groups: ['A00','A01'], cutoff2024: 26.50, cutoff2023: 26.20 },
      { code: 'UET', name: 'UET — ĐHQG HN — KT Điện', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2024: 26.20, cutoff2023: 25.80 },
    ],
  },

  // ── 11. Cơ khí / Tự động hoá ──────────────────────────────
  {
    id: 'mech', name: 'Cơ khí — Tự động hoá',
    trend: { direction: 'recovering', label: 'Phục hồi',
      note: 'Robotics + công nghiệp 4.0 đẩy ngành cơ khí trở lại; lương khởi điểm khá tốt.' },
    startingSalary: { min: 9, max: 15 },
    universities: [
      { code: 'BKHN', name: 'BKHN — Cơ khí / Tự động hoá', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2024: 26.42, cutoff2023: 25.80 },
      { code: 'BKHCM', name: 'BK TP.HCM — Cơ khí', location: 'TP.HCM',
        groups: ['A00','A01'], cutoff2024: 25.80, cutoff2023: 25.40 },
      { code: 'CKC', name: 'CĐ Kỹ thuật Cao Thắng — Công nghệ ô tô', location: 'TP.HCM', level: 'college',
        groups: ['A00','A01'], cutoff2025: 20.25, cutoff2024: null, cutoff2023: null,
        notes: 'Bậc CĐ — Công nghệ ô tô 2025 = 27/40 (Toán ×2) ≈ 20.25/30' },
    ],
  },

  // ── 12. Xây dựng / Kiến trúc ──────────────────────────────
  {
    id: 'civil', name: 'Xây dựng — Kiến trúc',
    trend: { direction: 'declining', label: '📉 Giảm nhẹ',
      note: 'Thị trường BĐS chậm 2023-2024 → tuyển dụng chùng; sẽ phục hồi cùng chu kỳ kinh tế.' },
    startingSalary: { min: 8, max: 13 },
    universities: [
      { code: 'HAU', name: 'ĐH Kiến Trúc Hà Nội', location: 'Hà Nội',
        groups: ['V00','V01','V02'] as SubjectGroup[], cutoff2024: 25.10, cutoff2023: 25.50,
        notes: 'Khối V có vẽ năng khiếu' },
      { code: 'XD-HN', name: 'ĐH Xây Dựng Hà Nội (HUCE)', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2024: 23.20, cutoff2023: 23.60 },
    ],
  },

  // ── 13. Ngôn ngữ Anh / Quốc tế học ────────────────────────
  {
    id: 'eng', name: 'Ngôn ngữ Anh — Quốc tế học',
    trend: { direction: 'stable', label: 'Ổn định',
      note: 'Cơ hội đa dạng (giáo dục, biên dịch, doanh nghiệp đa quốc gia); IELTS xét tuyển kết hợp.' },
    startingSalary: { min: 8, max: 14 },
    universities: [
      { code: 'ULIS', name: 'ĐH Ngoại Ngữ — ĐHQG HN (ULIS)', location: 'Hà Nội',
        groups: ['D01'], cutoff2024: 36.27, cutoff2023: 36.50,
        notes: 'Thang 40 (Anh ×2); chuyển về thang 30 ~27.2' },
      { code: 'HCMUH', name: 'ĐH KHXH&NV — ĐHQG HCM (Anh)', location: 'TP.HCM',
        groups: ['D01'], cutoff2024: 27.85, cutoff2023: 27.50 },
      { code: 'FTU-LANG', name: 'FTU — Tiếng Anh thương mại', location: 'HN/HCM',
        groups: ['D01'], cutoff2024: 36.90, cutoff2023: 36.40,
        notes: 'Thang 40' },
    ],
  },

  // ── 14. Thiết kế đồ hoạ / Mỹ thuật ứng dụng ───────────────
  {
    id: 'design', name: 'Thiết kế đồ hoạ — Mỹ thuật ứng dụng',
    trend: { direction: 'hot', label: '🔥 Nóng',
      note: 'UX/UI + game/film + AI tools (Midjourney/Stable Diffusion) tạo nhu cầu mới — cạnh tranh khoẻ.' },
    startingSalary: { min: 8, max: 16 },
    universities: [
      { code: 'HUFA', name: 'ĐH Mỹ thuật Công nghiệp Hà Nội', location: 'Hà Nội',
        groups: ['H00','H01','H02'] as SubjectGroup[], cutoff2024: 22.50, cutoff2023: 22.00,
        notes: 'Khối H có vẽ năng khiếu' },
      { code: 'HUFA-HCM', name: 'ĐH Kiến trúc TP.HCM — Đồ hoạ', location: 'TP.HCM',
        groups: ['H00','V00'], cutoff2024: 23.50, cutoff2023: 23.10 },
    ],
  },

  // ── 15. Tâm lý học ────────────────────────────────────────
  {
    id: 'psych', name: 'Tâm lý học',
    trend: { direction: 'hot', label: '🔥 Nóng',
      note: 'Nhu cầu tham vấn học đường + EAP doanh nghiệp tăng nhanh; cử nhân + chứng chỉ là tối thiểu.' },
    startingSalary: { min: 7, max: 14 },
    universities: [
      { code: 'USSH-HN', name: 'KHXH&NV — ĐHQG HN — Tâm lý', location: 'Hà Nội',
        groups: ['B00','C00','D01'], cutoff2024: 28.83, cutoff2023: 28.10,
        notes: 'C00 cao top toàn quốc' },
      { code: 'HNUE-PSY', name: 'HNUE — Tâm lý học giáo dục', location: 'Hà Nội',
        groups: ['B00','C00','D01'], cutoff2024: 27.20, cutoff2023: 26.50 },
      { code: 'USSH-HCM', name: 'KHXH&NV — ĐHQG HCM — Tâm lý', location: 'TP.HCM',
        groups: ['B00','C00','D01'], cutoff2024: 27.80, cutoff2023: 27.25 },
    ],
  },

  // ── 16. Logistics / Chuỗi cung ứng ───────────────────────
  {
    id: 'logistics', name: 'Logistics — Chuỗi cung ứng',
    trend: { direction: 'hot', label: '🔥 Nóng',
      note: 'Việt Nam là hub xuất khẩu; thiếu nhân lực có chuyên môn tiếng Anh + công nghệ.' },
    startingSalary: { min: 9, max: 15 },
    universities: [
      { code: 'FTU-LOG', name: 'FTU — Logistics & SCM', location: 'HN/HCM',
        groups: ['A00','A01','D01','D07'], cutoff2024: 28.10, cutoff2023: 27.80 },
      { code: 'NEU-LOG', name: 'NEU — Logistics & QLCCƯ', location: 'Hà Nội',
        groups: ['A00','A01','D01'], cutoff2024: 27.65, cutoff2023: 27.40 },
      { code: 'UEH-LOG', name: 'UEH — Kinh doanh quốc tế / Log', location: 'TP.HCM',
        groups: ['A00','A01','D01'], cutoff2025: 27.70, cutoff2024: 27.20, cutoff2023: 27.00,
        notes: 'Logistics & QLCCƯ 2025 = 27.70 (cao nhất trường)' },
    ],
  },

  // ── 17. Du lịch / Khách sạn ──────────────────────────────
  {
    id: 'tourism', name: 'Du lịch — Khách sạn — Sự kiện',
    trend: { direction: 'recovering', label: 'Phục hồi mạnh',
      note: 'Hậu COVID hồi phục nhanh; thiếu nhân lực quản lý cao cấp + đa ngôn ngữ.' },
    startingSalary: { min: 6, max: 12 },
    universities: [
      { code: 'HOU', name: 'ĐH Mở Hà Nội — Du lịch', location: 'Hà Nội',
        groups: ['C00','D01','D14'], cutoff2024: 25.20, cutoff2023: 24.80,
        notes: '2025 ngành Du lịch xét thang 40 (NN ×2): QTDVDL&LH 30.53/40' },
      { code: 'HCMUE-TOUR', name: 'ĐH Văn Hiến / Tôn Đức Thắng — DL', location: 'TP.HCM',
        groups: ['C00','D01'], cutoff2024: 23.00, cutoff2023: 22.50 },
    ],
  },

  // ── 18. Công nghệ thực phẩm / Hoá học ────────────────────
  {
    id: 'food', name: 'Công nghệ thực phẩm — Hoá học',
    trend: { direction: 'stable', label: 'Ổn định',
      note: 'Xuất khẩu nông sản + FMCG; cần kiến thức ATTP, R&D sản phẩm.' },
    startingSalary: { min: 8, max: 13 },
    universities: [
      { code: 'BKHN-FOOD', name: 'BKHN — Kỹ thuật thực phẩm', location: 'Hà Nội',
        groups: ['A00','B00'], cutoff2024: 25.30, cutoff2023: 24.70 },
      { code: 'HUS', name: 'ĐH KHTN — ĐHQG HN — Hoá', location: 'Hà Nội',
        groups: ['A00','B00'], cutoff2024: 25.00, cutoff2023: 24.50 },
    ],
  },

  // ── 19. Khoa học máy tính / Data Science / AI ───────────
  {
    id: 'cs', name: 'Khoa học máy tính / Data / AI',
    trend: { direction: 'hot', label: '🔥 Cực nóng',
      note: 'Ngành mới trỗi dậy (AI/ML/Data) — điểm chuẩn cao nhất khối kỹ thuật; lương vượt 25-40tr trong 3 năm.' },
    startingSalary: { min: 15, max: 30 },
    universities: [
      { code: 'BKHN-CS', name: 'BKHN — KHMT / Data Science (IT1)', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2025: 29.19, cutoff2024: 28.53, cutoff2023: 28.80,
        notes: 'KHMT IT1 2025 = 29.19; KHDL&AI IT-E10 = 29.39 (cao nhất trường)' },
      { code: 'BKHCM-CS', name: 'BK TP.HCM — KHMT', location: 'TP.HCM',
        groups: ['A00','A01'], cutoff2024: 27.85, cutoff2023: 27.50 },
      { code: 'UET-CS', name: 'UET — KHMT', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2024: 28.10, cutoff2023: 27.40 },
      { code: 'USTH', name: 'ĐH KH&CN Hà Nội (USTH) — Data', location: 'Hà Nội',
        groups: ['A00','A01','D07'], cutoff2025: 24.51, cutoff2024: 25.50, cutoff2023: 25.00,
        notes: 'Học bằng tiếng Anh; Khoa học dữ liệu 2025 = 24.51' },
    ],
  },

  // ── 20. An ninh mạng / Cybersecurity ────────────────────
  {
    id: 'cyber', name: 'An toàn thông tin (Cybersecurity)', code: '7480202',
    trend: { direction: 'hot', label: '🔥 Cực nóng',
      note: 'Thiếu nghiêm trọng — cả nước cần ~50K chuyên gia đến 2030; lương rất cao, ít cạnh tranh đầu ra.' },
    startingSalary: { min: 13, max: 25 },
    universities: [
      { code: 'PTIT-SEC', name: 'PTIT — ATTT', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2024: 26.45, cutoff2023: 26.62 },
      { code: 'BKHN-SEC', name: 'BKHN — ATTT (IT-E15)', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2024: 27.55, cutoff2023: 27.20 },
      { code: 'KMA', name: 'Học viện Kỹ thuật mật mã', location: 'Hà Nội',
        groups: ['A00','A01'], cutoff2025: 24.42, cutoff2024: 25.80, cutoff2023: 25.30,
        notes: 'Có hệ quân sự + dân sự; ATTT 2025 = 24.42 (HN), 23.2 (TP.HCM)' },
    ],
  },
]

/* ───────── Career → Major mapping ──────────
 * Khớp với tên nghề trong career-personality-data + career-detail-data.
 * Mỗi nghề trỏ tới 1-3 majorIds gần nhất. Search trong UI: lower + includes. */

export const CAREER_MAJOR_MAP: Record<string, string[]> = {
  // CNTT cluster
  'kỹ sư phần mềm': ['it','cs'],
  'lập trình viên': ['it','cs'],
  'kỹ sư ai': ['cs','it'],
  'chuyên viên ai': ['cs','it'],
  'kỹ sư dữ liệu': ['cs','it'],
  'data scientist': ['cs','it'],
  'phân tích dữ liệu': ['cs','it'],
  'chuyên viên an ninh mạng': ['cyber'],
  'kỹ sư bảo mật': ['cyber'],
  // Y/Dược
  'bác sĩ': ['med'],
  'y tá': ['med'],
  'điều dưỡng': ['med'],
  'dược sĩ': ['pharm'],
  // Kinh tế
  'chuyên viên marketing': ['marketing','business'],
  'nhà quản trị': ['business'],
  'doanh nhân': ['business'],
  'chuyên viên kế toán': ['business','finance'],
  'kế toán': ['business','finance'],
  'chuyên viên tài chính': ['finance'],
  'phân tích tài chính': ['finance'],
  'chuyên viên ngân hàng': ['finance'],
  'chuyên viên logistics': ['logistics','business'],
  'kinh doanh quốc tế': ['business','logistics'],
  // Báo chí / truyền thông
  'nhà báo': ['journalism'],
  'phóng viên': ['journalism'],
  'biên tập viên': ['journalism'],
  'pr': ['journalism','marketing'],
  // Luật
  'luật sư': ['law'],
  'thẩm phán': ['law'],
  'chuyên viên pháp lý': ['law'],
  // Sư phạm
  'giáo viên': ['edu'],
  'giảng viên': ['edu'],
  // Kỹ thuật
  'kỹ sư điện': ['ee'],
  'kỹ sư điện tử': ['ee'],
  'kỹ sư cơ khí': ['mech'],
  'kỹ sư tự động hoá': ['mech','ee'],
  'kỹ sư bán dẫn': ['ee','cs'],
  'kỹ sư xây dựng': ['civil'],
  'kiến trúc sư': ['civil','design'],
  // Ngôn ngữ
  'biên dịch viên': ['eng'],
  'phiên dịch': ['eng'],
  'giáo viên tiếng anh': ['eng','edu'],
  // Thiết kế
  'thiết kế đồ hoạ': ['design'],
  'ux/ui designer': ['design','cs'],
  'graphic designer': ['design'],
  // Tâm lý
  'nhà tâm lý': ['psych'],
  'chuyên viên tâm lý học đường': ['psych','edu'],
  'tư vấn viên': ['psych','edu'],
  // Du lịch
  'hướng dẫn viên du lịch': ['tourism'],
  'quản lý khách sạn': ['tourism','business'],
  // Thực phẩm / hoá
  'kỹ sư thực phẩm': ['food'],
  'nhà nghiên cứu hoá học': ['food'],
}

/** Tìm majorIds gần nhất cho 1 tên nghề (case-insensitive, fuzzy contains). */
export function findMajorsForCareer(careerName: string): MajorAdmission[] {
  const key = careerName.toLowerCase().trim()
  // direct exact
  if (CAREER_MAJOR_MAP[key]) return CAREER_MAJOR_MAP[key].map(id => MAJORS.find(m => m.id === id)!).filter(Boolean)
  // contains match
  for (const [mapKey, majorIds] of Object.entries(CAREER_MAJOR_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return majorIds.map(id => MAJORS.find(m => m.id === id)!).filter(Boolean)
    }
  }
  return []
}

/**
 * Đánh giá khả năng đỗ dựa trên điểm THPT + học bạ.
 * trả: { fit:'easy'|'safe'|'reach'|'unrealistic', deltaPoints, recommendation }
 *   easy        — vượt cutoff ≥ 1 điểm
 *   safe        — vượt 0-1 điểm (sát)
 *   reach       — thiếu 0-2 điểm (vẫn có cơ hội bằng XT kết hợp / nguyện vọng cao)
 *   unrealistic — thiếu > 2 điểm
 */
export type FitLevel = 'easy' | 'safe' | 'reach' | 'unrealistic'

export function evaluateAdmissionFit(
  userPoints: number,
  cutoff: number | null,
): { fit: FitLevel; delta: number; label: string; color: string } | null {
  if (cutoff == null) return null
  const delta = +(userPoints - cutoff).toFixed(2)
  if (delta >= 1)   return { fit: 'easy',        delta, label: `Vượt ${delta.toFixed(2)} điểm — chắc đỗ`,          color: '#10b981' }
  if (delta >= 0)   return { fit: 'safe',        delta, label: `Sát chuẩn (+${delta.toFixed(2)}) — có khả năng đỗ`, color: '#22d3ee' }
  if (delta >= -2)  return { fit: 'reach',       delta, label: `Thiếu ${(-delta).toFixed(2)} điểm — cần cố gắng`,    color: '#f59e0b' }
  return                  { fit: 'unrealistic', delta, label: `Thiếu ${(-delta).toFixed(2)} điểm — cân nhắc PA khác`, color: '#ef4444' }
}

/**
 * Điểm chuẩn năm GẦN NHẤT có dữ liệu (ưu tiên 2025 → 2024 → 2023).
 * Đây là mốc dùng để đánh giá khả năng đỗ & tính điểm còn thiếu.
 */
export function latestCutoff(u: UniversityCutoff): { year: 2025 | 2024 | 2023; value: number } | null {
  if (u.cutoff2025 != null) return { year: 2025, value: u.cutoff2025 }
  if (u.cutoff2024 != null) return { year: 2024, value: u.cutoff2024 }
  if (u.cutoff2023 != null) return { year: 2023, value: u.cutoff2023 }
  return null
}

/**
 * Đánh dấu xu hướng giữa 2 năm GẦN NHẤT có dữ liệu (∆ điểm).
 * Ưu tiên 2024→2025; nếu thiếu 2025 thì 2023→2024.
 */
export function cutoffTrend(
  u: UniversityCutoff,
): { direction: 'up' | 'down' | 'flat'; delta: number; from: number; to: number } | null {
  let from: number | null = null
  let to: number | null = null
  let fromYear = 0
  let toYear = 0
  if (u.cutoff2025 != null && u.cutoff2024 != null) {
    from = u.cutoff2024; to = u.cutoff2025; fromYear = 2024; toYear = 2025
  } else if (u.cutoff2024 != null && u.cutoff2023 != null) {
    from = u.cutoff2023; to = u.cutoff2024; fromYear = 2023; toYear = 2024
  }
  if (from == null || to == null) return null
  const delta = +(to - from).toFixed(2)
  const direction = Math.abs(delta) < 0.3 ? 'flat' : delta > 0 ? 'up' : 'down'
  return { direction, delta, from: fromYear, to: toYear }
}

/**
 * Phân tích điểm còn thiếu cho 1 ngành: với điểm hiện tại của user,
 * đỗ được mấy trường, trường dễ nhất chưa với tới cần thêm bao nhiêu,
 * và trường top cần thêm bao nhiêu — quy ra cả điểm/môn (chia 3 môn).
 */
export interface GapAnalysis {
  totalSchools: number
  /** Số trường user đã đủ điểm (>= cutoff năm gần nhất) */
  reachableCount: number
  /** Trường thấp điểm nhất mà user CHƯA với tới (mục tiêu gần nhất) */
  nextTarget?: { u: UniversityCutoff; cutoff: number; year: number; gapTotal: number; gapPerSubject: number }
  /** Trường cao điểm nhất trong ngành (mục tiêu top) */
  topTarget?: { u: UniversityCutoff; cutoff: number; year: number; gapTotal: number; gapPerSubject: number }
  /** Trường cao nhất user đã đủ điểm (để khích lệ) */
  bestReachable?: { u: UniversityCutoff; cutoff: number; year: number }
}

export function analyzeGap(major: MajorAdmission, userPoints: number): GapAnalysis {
  const rows = major.universities
    .map((u) => ({ u, lc: latestCutoff(u) }))
    .filter((r): r is { u: UniversityCutoff; lc: { year: 2025 | 2024 | 2023; value: number } } => r.lc != null)
    .sort((a, b) => a.lc.value - b.lc.value) // tăng dần theo điểm chuẩn

  const reachable = rows.filter((r) => userPoints >= r.lc.value)
  const notReached = rows.filter((r) => userPoints < r.lc.value)

  const mkGap = (r: { u: UniversityCutoff; lc: { year: number; value: number } }) => {
    const gapTotal = +(r.lc.value - userPoints).toFixed(2)
    return {
      u: r.u, cutoff: r.lc.value, year: r.lc.year,
      gapTotal, gapPerSubject: +(gapTotal / 3).toFixed(2),
    }
  }

  const result: GapAnalysis = {
    totalSchools: rows.length,
    reachableCount: reachable.length,
  }
  if (notReached.length) result.nextTarget = mkGap(notReached[0])           // thấp điểm nhất chưa với tới
  if (rows.length) {
    const top = rows[rows.length - 1]
    if (userPoints < top.lc.value) result.topTarget = mkGap(top)            // top, nếu chưa đủ
  }
  if (reachable.length) {
    const best = reachable[reachable.length - 1]
    result.bestReachable = { u: best.u, cutoff: best.lc.value, year: best.lc.year }
  }
  return result
}
