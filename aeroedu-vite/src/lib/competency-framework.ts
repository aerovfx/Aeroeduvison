/**
 * competency-framework.ts — Khung năng lực dùng cho Learning Path Builder.
 *
 * Tổng hợp từ:
 *  - Chương trình Giáo dục Phổ thông 2018 (Bộ GD&ĐT) — 3 năng lực chung + 7 năng lực chuyên môn
 *  - Khung STEM/STEAM phổ biến (4Cs + Computational Thinking)
 *  - Bloom's Taxonomy revised — 4 cấp thang đo (Nhận biết → Vận dụng cao)
 *
 * Cấu trúc:
 *  - COMPETENCY_PILLARS: 8 trụ cột năng lực (mỗi trụ cột có id, name, code, color, icon, desc)
 *  - COMPETENCY_LEVELS: 4 mức (L1 Nhận biết → L4 Vận dụng sáng tạo)
 *  - PILLAR_LEVEL_DESCRIPTORS: rubric chi tiết "ở cấp L cho trụ cột P thì HS làm được gì"
 *
 * Module trong LearningPath gán { pillarId, targetLevel } cho competency mục tiêu,
 * Path có competency coverage là union của tất cả modules.
 */

export type CompetencyLevel = 1 | 2 | 3 | 4

export interface CompetencyPillar {
  id: string                  // 'self-direction', 'collaboration', ...
  code: string                // ngắn 2-3 ký tự: NL1, NL2, ST, CT...
  name: string                // tên tiếng Việt
  shortName: string           // ngắn cho badge
  color: string               // hex màu chủ đạo
  emoji: string               // emoji minh hoạ
  desc: string                // mô tả 1 câu
  source: 'GDPT2018' | 'STEM' | '21CS'  // nguồn khung
}

/** 4 mức năng lực — phân biệt cho rubric đánh giá */
export interface LevelDescriptor {
  level: CompetencyLevel
  label: string               // 'Nhận biết', 'Hiểu', ...
  shortLabel: string          // 'L1', 'L2'...
  bloom: string               // verb Bloom tương ứng
  color: string
  desc: string                // mô tả chung cấp này
}

export const COMPETENCY_LEVELS: LevelDescriptor[] = [
  {
    level: 1,
    label: 'Nhận biết',
    shortLabel: 'L1',
    bloom: 'Remember · Understand',
    color: '#94a3b8',
    desc: 'HS nhận biết, mô tả, nhắc lại khái niệm. Trả lời được "Là gì?", "Khi nào?".',
  },
  {
    level: 2,
    label: 'Vận dụng cơ bản',
    shortLabel: 'L2',
    bloom: 'Apply',
    color: '#38bdf8',
    desc: 'HS dùng kiến thức giải bài tập quen thuộc, làm theo mẫu, thực hành dưới hướng dẫn.',
  },
  {
    level: 3,
    label: 'Vận dụng thành thạo',
    shortLabel: 'L3',
    bloom: 'Analyze · Evaluate',
    color: '#a78bfa',
    desc: 'HS phân tích tình huống mới, lựa chọn phương pháp, giải quyết vấn đề chưa gặp.',
  },
  {
    level: 4,
    label: 'Vận dụng sáng tạo',
    shortLabel: 'L4',
    bloom: 'Create',
    color: '#fbbf24',
    desc: 'HS thiết kế giải pháp mới, tổng hợp liên môn, sáng tạo sản phẩm có giá trị.',
  },
]

/** 8 trụ cột năng lực — combo GDPT 2018 + STEM */
export const COMPETENCY_PILLARS: CompetencyPillar[] = [
  // ── 3 Năng lực chung GDPT 2018 ─────────────────────
  {
    id: 'self-direction',
    code: 'NLC1',
    name: 'Tự chủ và tự học',
    shortName: 'Tự chủ',
    color: '#22d3ee',
    emoji: '🎯',
    desc: 'Tự lập kế hoạch học tập, quản lý thời gian, tự đánh giá tiến độ.',
    source: 'GDPT2018',
  },
  {
    id: 'collaboration',
    code: 'NLC2',
    name: 'Giao tiếp và hợp tác',
    shortName: 'Hợp tác',
    color: '#34d399',
    emoji: '🤝',
    desc: 'Lắng nghe, trình bày ý tưởng, làm việc nhóm hiệu quả, giải quyết xung đột.',
    source: 'GDPT2018',
  },
  {
    id: 'problem-solving',
    code: 'NLC3',
    name: 'Giải quyết vấn đề và sáng tạo',
    shortName: 'Sáng tạo',
    color: '#fbbf24',
    emoji: '💡',
    desc: 'Phát hiện vấn đề, đề xuất giải pháp, lựa chọn phương án tối ưu, tạo ra cái mới.',
    source: 'GDPT2018',
  },
  // ── Năng lực chuyên môn STEM (gộp các môn liên quan) ──
  {
    id: 'scientific-thinking',
    code: 'NLCM-KH',
    name: 'Tư duy khoa học',
    shortName: 'Khoa học',
    color: '#60a5fa',
    emoji: '🔬',
    desc: 'Quan sát, đặt giả thuyết, thiết kế thí nghiệm, phân tích dữ liệu, rút kết luận.',
    source: 'GDPT2018',
  },
  {
    id: 'mathematical-reasoning',
    code: 'NLCM-T',
    name: 'Năng lực tính toán',
    shortName: 'Toán học',
    color: '#a78bfa',
    emoji: '📐',
    desc: 'Mô hình hoá bằng toán, lập luận chặt chẽ, giải quyết bài toán thực tiễn.',
    source: 'GDPT2018',
  },
  {
    id: 'engineering-design',
    code: 'NLCM-KT',
    name: 'Thiết kế kỹ thuật',
    shortName: 'Kỹ thuật',
    color: '#f97316',
    emoji: '⚙️',
    desc: 'Xác định nhu cầu, lên ý tưởng, làm prototype, thử nghiệm và cải tiến.',
    source: 'STEM',
  },
  {
    id: 'computational-thinking',
    code: 'NLCM-TIN',
    name: 'Tư duy tính toán',
    shortName: 'Tin học',
    color: '#06b6d4',
    emoji: '💻',
    desc: 'Phân rã bài toán, nhận diện mẫu, trừu tượng hoá, thiết kế thuật toán.',
    source: 'STEM',
  },
  {
    id: 'digital-literacy',
    code: 'NLCM-DIG',
    name: 'Năng lực số',
    shortName: 'Năng lực số',
    color: '#ec4899',
    emoji: '🌐',
    desc: 'Sử dụng công cụ số, đánh giá thông tin, sáng tạo nội dung, an toàn mạng.',
    source: '21CS',
  },
]

/**
 * Rubric chi tiết: với mỗi (pillar, level) → HS làm được gì.
 * GV dùng để đánh giá HS đạt level nào.
 *
 * Key format: `${pillarId}:${level}` (VD 'collaboration:3')
 */
export const PILLAR_LEVEL_DESCRIPTORS: Record<string, string> = {
  // ── Tự chủ ──
  'self-direction:1':  'Nhớ và làm theo lịch học do GV đặt; báo cáo tiến độ khi được hỏi.',
  'self-direction:2':  'Tự lên lịch học theo deadline; chủ động hỏi khi gặp khó.',
  'self-direction:3':  'Tự đặt mục tiêu, đánh giá tiến độ, điều chỉnh kế hoạch khi cần.',
  'self-direction:4':  'Hướng dẫn bạn khác lập kế hoạch; tự nhìn lại và cải tiến cách học liên tục.',
  // ── Hợp tác ──
  'collaboration:1':   'Lắng nghe ý kiến nhóm; làm phần việc được giao.',
  'collaboration:2':   'Trình bày ý tưởng rõ ràng; phối hợp với 2-3 bạn hoàn thành nhiệm vụ.',
  'collaboration:3':   'Điều phối nhóm 4-6 bạn; giải quyết bất đồng; phân chia hợp lý.',
  'collaboration:4':   'Dẫn dắt dự án liên lớp/liên trường; xây văn hoá nhóm tích cực.',
  // ── Sáng tạo ──
  'problem-solving:1': 'Nhận diện vấn đề khi được chỉ ra; thử áp dụng cách giải đã học.',
  'problem-solving:2': 'Phát hiện vấn đề trong tình huống cho sẵn; thử 2-3 cách giải.',
  'problem-solving:3': 'Tìm nguyên nhân gốc; đề xuất nhiều giải pháp, chọn tối ưu.',
  'problem-solving:4': 'Tạo ra giải pháp mới chưa từng có; áp dụng vào bối cảnh khác.',
  // ── Khoa học ──
  'scientific-thinking:1': 'Mô tả hiện tượng; phân biệt sự kiện và quan điểm.',
  'scientific-thinking:2': 'Đặt câu hỏi nghiên cứu; thiết kế thí nghiệm đơn giản theo mẫu.',
  'scientific-thinking:3': 'Phân tích dữ liệu, kiểm chứng giả thuyết, đánh giá độ tin cậy.',
  'scientific-thinking:4': 'Thiết kế nghiên cứu độc lập; phản biện kết quả; công bố báo cáo.',
  // ── Toán học ──
  'mathematical-reasoning:1': 'Áp dụng công thức cho bài toán mẫu; tính toán đúng.',
  'mathematical-reasoning:2': 'Chuyển bài toán thực tế sang ngôn ngữ toán; giải qua nhiều bước.',
  'mathematical-reasoning:3': 'Lựa chọn mô hình phù hợp; chứng minh lập luận chặt chẽ.',
  'mathematical-reasoning:4': 'Xây mô hình mới cho bài toán mở; tổng quát hoá kết quả.',
  // ── Kỹ thuật ──
  'engineering-design:1':     'Hiểu quy trình thiết kế kỹ thuật; làm theo bản vẽ có sẵn.',
  'engineering-design:2':     'Phác thảo ý tưởng; làm prototype đơn giản; thử nghiệm.',
  'engineering-design:3':     'Lặp lại chu trình design → test → improve; tối ưu hoá thiết kế.',
  'engineering-design:4':     'Sáng tạo sản phẩm mới giải quyết nhu cầu thực; có sản phẩm hoàn thiện.',
  // ── Tin học ──
  'computational-thinking:1': 'Đọc và chạy đoạn code có sẵn; debug lỗi đơn giản.',
  'computational-thinking:2': 'Viết thuật toán cho bài toán quen; dùng vòng lặp + điều kiện.',
  'computational-thinking:3': 'Phân rã bài toán phức tạp; thiết kế cấu trúc dữ liệu phù hợp.',
  'computational-thinking:4': 'Tạo ứng dụng/game/web hoàn chỉnh; tối ưu hiệu suất.',
  // ── Năng lực số ──
  'digital-literacy:1':       'Sử dụng được trình duyệt, email, soạn thảo cơ bản.',
  'digital-literacy:2':       'Đánh giá độ tin cậy nguồn thông tin; bảo vệ tài khoản cá nhân.',
  'digital-literacy:3':       'Tạo nội dung số (video/infographic/web); cộng tác online.',
  'digital-literacy:4':       'Hướng dẫn cộng đồng dùng AI/tool; quản trị nội dung an toàn.',
}

// ─── Helper functions ──────────────────────────────────────────────

export function getPillar(id: string): CompetencyPillar | undefined {
  return COMPETENCY_PILLARS.find(p => p.id === id)
}

export function getLevelDescriptor(level: CompetencyLevel): LevelDescriptor {
  return COMPETENCY_LEVELS.find(l => l.level === level) || COMPETENCY_LEVELS[0]
}

export function getRubricDescriptor(pillarId: string, level: CompetencyLevel): string {
  return PILLAR_LEVEL_DESCRIPTORS[`${pillarId}:${level}`] || '—'
}

/** Module type → suggested default competencies */
export const MODULE_TYPE_TO_PILLARS: Record<string, string[]> = {
  lesson:       ['scientific-thinking', 'mathematical-reasoning'],
  quiz:         ['mathematical-reasoning', 'self-direction'],
  project:      ['engineering-design', 'collaboration', 'problem-solving'],
  assignment:   ['mathematical-reasoning', 'self-direction'],
  video:        ['scientific-thinking', 'digital-literacy'],
  survey:       ['self-direction'],
  'final-exam': ['mathematical-reasoning', 'scientific-thinking'],
  'stem-skill': ['engineering-design', 'computational-thinking', 'problem-solving'],
  challenge:    ['problem-solving', 'self-direction'],
}

/** Aggregate path-level competency coverage từ modules array */
export interface PathCompetencyCoverage {
  pillarId: string
  pillar: CompetencyPillar
  targetLevels: CompetencyLevel[]          // unique levels được nhắm
  maxLevel: CompetencyLevel                // level cao nhất targeting
  moduleCount: number                      // số module touch trụ cột này
}

export function computePathCoverage(modules: Array<{ competencies?: Array<{ pillarId: string; targetLevel: CompetencyLevel }> }>): PathCompetencyCoverage[] {
  const byPillar = new Map<string, { levels: Set<CompetencyLevel>; count: number }>()
  for (const m of modules) {
    if (!Array.isArray(m.competencies)) continue
    for (const c of m.competencies) {
      if (!c.pillarId) continue
      if (!byPillar.has(c.pillarId)) byPillar.set(c.pillarId, { levels: new Set(), count: 0 })
      const rec = byPillar.get(c.pillarId)!
      rec.levels.add(c.targetLevel)
      rec.count++
    }
  }
  const out: PathCompetencyCoverage[] = []
  for (const [pillarId, rec] of byPillar.entries()) {
    const pillar = getPillar(pillarId)
    if (!pillar) continue
    const levels = Array.from(rec.levels).sort((a, b) => a - b)
    out.push({
      pillarId,
      pillar,
      targetLevels: levels,
      maxLevel: levels[levels.length - 1],
      moduleCount: rec.count,
    })
  }
  return out.sort((a, b) => b.maxLevel - a.maxLevel)
}
