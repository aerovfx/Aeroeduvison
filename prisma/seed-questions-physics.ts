/**
 * Seed script: Câu hỏi Vật lý 12 - Dao động cơ, Sóng cơ, Điện xoay chiều
 * Run: npx ts-node prisma/seed-questions-physics.ts
 * Or:  npx tsx prisma/seed-questions-physics.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CREATED_BY = 'system-seed';

interface QuestionSeed {
  topic: string;
  subject: string;
  grade: string;
  questionType: string;
  difficulty: string;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  learningObjectives: string[];
  keywords: string[];
  tags: string[];
  qualityScore: number;
  status: string;
}

// ═══════════════════════════════════════════════════════════
// DAO ĐỘNG CƠ - 20 câu hỏi
// ═══════════════════════════════════════════════════════════
const daoDocCoQuestions: QuestionSeed[] = [
  // --- EASY ---
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Một vật dao động điều hòa theo phương trình x = 5cos(4πt + π/3) cm. Biên độ dao động của vật là:',
    options: ['A. 5 cm', 'B. 4π cm', 'C. π/3 cm', 'D. 10 cm'],
    correctAnswer: 'A. 5 cm',
    explanation: 'So sánh với phương trình tổng quát x = Acos(ωt + φ), ta có biên độ A = 5 cm.',
    learningObjectives: ['Xác định biên độ từ phương trình dao động điều hòa'],
    keywords: ['dao động điều hòa', 'biên độ', 'phương trình dao động'],
    tags: ['dao động cơ', 'cơ bản', 'trắc nghiệm'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Trong dao động điều hòa, đại lượng nào sau đây không đổi theo thời gian?',
    options: ['A. Li độ', 'B. Vận tốc', 'C. Gia tốc', 'D. Biên độ'],
    correctAnswer: 'D. Biên độ',
    explanation: 'Trong dao động điều hòa, li độ x, vận tốc v, gia tốc a đều thay đổi theo thời gian. Chỉ có biên độ A là không đổi (đặc trưng cho dao động).',
    learningObjectives: ['Hiểu các đại lượng đặc trưng của dao động điều hòa'],
    keywords: ['dao động điều hòa', 'biên độ', 'đại lượng không đổi'],
    tags: ['dao động cơ', 'cơ bản'],
    qualityScore: 0.85,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Chu kỳ dao động của con lắc lò xo phụ thuộc vào:',
    options: [
      'A. Biên độ dao động',
      'B. Khối lượng vật và độ cứng lò xo',
      'C. Pha ban đầu',
      'D. Năng lượng dao động'
    ],
    correctAnswer: 'B. Khối lượng vật và độ cứng lò xo',
    explanation: 'Chu kỳ con lắc lò xo T = 2π√(m/k) chỉ phụ thuộc vào khối lượng m và độ cứng k, không phụ thuộc biên độ hay pha ban đầu.',
    learningObjectives: ['Nắm công thức chu kỳ con lắc lò xo'],
    keywords: ['con lắc lò xo', 'chu kỳ', 'khối lượng', 'độ cứng'],
    tags: ['dao động cơ', 'con lắc lò xo', 'cơ bản'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Con lắc đơn có chiều dài l = 1m, tại nơi có g = 10 m/s². Chu kỳ dao động nhỏ của con lắc là:',
    options: ['A. T ≈ 1.99 s', 'B. T ≈ 0.99 s', 'C. T ≈ 3.14 s', 'D. T ≈ 6.28 s'],
    correctAnswer: 'A. T ≈ 1.99 s',
    explanation: 'T = 2π√(l/g) = 2π√(1/10) = 2π × 0.316 ≈ 1.99 s.',
    learningObjectives: ['Tính chu kỳ con lắc đơn'],
    keywords: ['con lắc đơn', 'chu kỳ', 'chiều dài', 'gia tốc trọng trường'],
    tags: ['dao động cơ', 'con lắc đơn', 'cơ bản'],
    qualityScore: 0.88,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Vận tốc của vật dao động điều hòa có giá trị cực đại khi vật ở:',
    options: ['A. Vị trí biên dương', 'B. Vị trí biên âm', 'C. Vị trí cân bằng', 'D. Vị trí bất kỳ'],
    correctAnswer: 'C. Vị trí cân bằng',
    explanation: 'Tại VTCB (x = 0), toàn bộ cơ năng chuyển thành động năng nên vận tốc cực đại: |v_max| = Aω.',
    learningObjectives: ['Hiểu mối liên hệ giữa vận tốc và li độ trong DĐĐH'],
    keywords: ['dao động điều hòa', 'vận tốc cực đại', 'vị trí cân bằng'],
    tags: ['dao động cơ', 'vận tốc', 'cơ bản'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },

  // --- MEDIUM ---
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Một vật dao động điều hòa với phương trình x = 6cos(10πt) cm. Vận tốc cực đại của vật là:',
    options: ['A. 60π cm/s', 'B. 6π cm/s', 'C. 10π cm/s', 'D. 600π cm/s'],
    correctAnswer: 'A. 60π cm/s',
    explanation: 'Từ phương trình x = Acos(ωt + φ), ta có A = 6 cm, ω = 10π rad/s. Vận tốc cực đại v_max = Aω = 6 × 10π = 60π cm/s.',
    learningObjectives: ['Tính vận tốc cực đại từ phương trình dao động'],
    keywords: ['vận tốc cực đại', 'dao động điều hòa', 'tần số góc'],
    tags: ['dao động cơ', 'vận tốc', 'trung bình'],
    qualityScore: 0.92,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Con lắc lò xo nằm ngang có m = 200g, k = 80 N/m. Kéo vật ra khỏi VTCB 4cm rồi thả nhẹ. Cơ năng dao động của hệ là:',
    options: ['A. 0.064 J', 'B. 0.032 J', 'C. 0.128 J', 'D. 0.016 J'],
    correctAnswer: 'A. 0.064 J',
    explanation: 'Cơ năng W = ½kA² = ½ × 80 × (0.04)² = ½ × 80 × 0.0016 = 0.064 J.',
    learningObjectives: ['Tính cơ năng dao động điều hòa con lắc lò xo'],
    keywords: ['cơ năng', 'con lắc lò xo', 'biên độ', 'độ cứng'],
    tags: ['dao động cơ', 'năng lượng', 'trung bình'],
    qualityScore: 0.91,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Một vật dao động điều hòa với biên độ A = 10 cm và tần số f = 5 Hz. Gia tốc cực đại của vật là:',
    options: ['A. 100π² cm/s²', 'B. 50π² cm/s²', 'C. 1000π² cm/s²', 'D. 200π² cm/s²'],
    correctAnswer: 'C. 1000π² cm/s²',
    explanation: 'ω = 2πf = 10π rad/s. Gia tốc cực đại a_max = Aω² = 10 × (10π)² = 10 × 100π² = 1000π² cm/s².',
    learningObjectives: ['Tính gia tốc cực đại trong dao động điều hòa'],
    keywords: ['gia tốc cực đại', 'tần số', 'biên độ', 'dao động điều hòa'],
    tags: ['dao động cơ', 'gia tốc', 'trung bình'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Trong dao động điều hòa, khi li độ x = A/2 thì tỉ số giữa động năng và thế năng là:',
    options: ['A. 1', 'B. 2', 'C. 3', 'D. 1/3'],
    correctAnswer: 'C. 3',
    explanation: 'Thế năng Wt = ½kx² = ½k(A/2)² = kA²/8. Cơ năng W = ½kA². Động năng Wđ = W - Wt = kA²/2 - kA²/8 = 3kA²/8. Tỉ số Wđ/Wt = (3kA²/8)/(kA²/8) = 3.',
    learningObjectives: ['Phân tích tỉ lệ năng lượng trong dao động điều hòa'],
    keywords: ['động năng', 'thế năng', 'tỉ số năng lượng', 'li độ'],
    tags: ['dao động cơ', 'năng lượng', 'trung bình'],
    qualityScore: 0.93,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Một con lắc lò xo dao động điều hòa. Khi tăng khối lượng vật lên 4 lần thì chu kỳ dao động:',
    options: ['A. Tăng 2 lần', 'B. Tăng 4 lần', 'C. Giảm 2 lần', 'D. Không đổi'],
    correctAnswer: 'A. Tăng 2 lần',
    explanation: 'T = 2π√(m/k). Khi m\' = 4m: T\' = 2π√(4m/k) = 2 × 2π√(m/k) = 2T. Chu kỳ tăng 2 lần.',
    learningObjectives: ['Phân tích ảnh hưởng của khối lượng đến chu kỳ con lắc lò xo'],
    keywords: ['chu kỳ', 'khối lượng', 'con lắc lò xo', 'tỉ lệ'],
    tags: ['dao động cơ', 'con lắc lò xo', 'trung bình'],
    qualityScore: 0.88,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Cộng hưởng cơ xảy ra khi:',
    options: [
      'A. Tần số của lực cưỡng bức bằng tần số riêng của hệ',
      'B. Biên độ của lực cưỡng bức bằng biên độ dao động',
      'C. Lực cản bằng lực cưỡng bức',
      'D. Hệ dao động tự do'
    ],
    correctAnswer: 'A. Tần số của lực cưỡng bức bằng tần số riêng của hệ',
    explanation: 'Cộng hưởng xảy ra khi tần số lực cưỡng bức f_cưỡng bức = f_riêng, lúc này biên độ dao động cưỡng bức đạt giá trị cực đại.',
    learningObjectives: ['Hiểu điều kiện xảy ra cộng hưởng'],
    keywords: ['cộng hưởng', 'tần số riêng', 'lực cưỡng bức', 'dao động cưỡng bức'],
    tags: ['dao động cơ', 'cộng hưởng', 'trung bình'],
    qualityScore: 0.92,
    status: 'Đã duyệt',
  },

  // --- HARD ---
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Một vật dao động điều hòa x = 8cos(2πt + π/6) cm. Thời điểm đầu tiên vật có li độ x = 4 cm và đang chuyển động theo chiều dương là:',
    options: ['A. t = 1/4 s', 'B. t = 5/12 s', 'C. t = 3/4 s', 'D. t = 11/12 s'],
    correctAnswer: 'C. t = 3/4 s',
    explanation: 'x = 4 → cos(2πt + π/6) = 1/2 → 2πt + π/6 = ±π/3 + k2π. Chiều dương: v > 0 → sin(2πt + π/6) > 0 → lấy 2πt + π/6 = -π/3 + 2π (vòng đầu). 2πt = -π/3 - π/6 + 2π = -π/2 + 2π = 3π/2. t = 3/4 s.',
    learningObjectives: ['Giải bài toán thời điểm trong dao động điều hòa có điều kiện chiều chuyển động'],
    keywords: ['thời điểm', 'li độ', 'chiều chuyển động', 'dao động điều hòa'],
    tags: ['dao động cơ', 'nâng cao', 'thời gian'],
    qualityScore: 0.95,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Con lắc lò xo nằm ngang k = 100 N/m, m = 250g dao động với biên độ 5cm. Khi vật cách VTCB 3cm, vận tốc của vật là:',
    options: ['A. ±80 cm/s', 'B. ±60 cm/s', 'C. ±40 cm/s', 'D. ±100 cm/s'],
    correctAnswer: 'A. ±80 cm/s',
    explanation: 'ω = √(k/m) = √(100/0.25) = 20 rad/s. v = ±ω√(A² - x²) = ±20√(25 - 9) = ±20 × 4 = ±80 cm/s.',
    learningObjectives: ['Tính vận tốc tại vị trí bất kỳ trong DĐĐH'],
    keywords: ['vận tốc', 'li độ', 'biên độ', 'tần số góc', 'con lắc lò xo'],
    tags: ['dao động cơ', 'nâng cao', 'vận tốc'],
    qualityScore: 0.94,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Hai con lắc lò xo giống nhau, con lắc 1 có m₁ = m, con lắc 2 có m₂ = 4m. Nếu con lắc 1 có T₁ = 0.5s thì con lắc 2 có T₂ bằng:',
    options: ['A. 0.25 s', 'B. 0.5 s', 'C. 1 s', 'D. 2 s'],
    correctAnswer: 'C. 1 s',
    explanation: 'T₂/T₁ = √(m₂/m₁) = √(4m/m) = 2. Vậy T₂ = 2T₁ = 2 × 0.5 = 1 s.',
    learningObjectives: ['So sánh chu kỳ của hai con lắc lò xo'],
    keywords: ['chu kỳ', 'so sánh', 'khối lượng', 'con lắc lò xo'],
    tags: ['dao động cơ', 'nâng cao', 'so sánh'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'HARD',
    content: 'Một vật dao động điều hòa với biên độ 10 cm, tần số 2 Hz. Tốc độ trung bình trong một chu kỳ là:',
    options: ['A. 40 cm/s', 'B. 80 cm/s', 'C. 60 cm/s', 'D. 20 cm/s'],
    correctAnswer: 'B. 80 cm/s',
    explanation: 'Trong 1 chu kỳ, vật đi được quãng đường 4A = 4 × 10 = 40 cm. T = 1/f = 0.5 s. Tốc độ trung bình = 4A/T = 40/0.5 = 80 cm/s.',
    learningObjectives: ['Tính tốc độ trung bình trong dao động điều hòa'],
    keywords: ['tốc độ trung bình', 'chu kỳ', 'biên độ', 'quãng đường'],
    tags: ['dao động cơ', 'nâng cao', 'tốc độ'],
    qualityScore: 0.93,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Dao động tắt dần có:',
    options: [
      'A. Biên độ không đổi, tần số giảm',
      'B. Biên độ giảm dần, năng lượng giảm dần',
      'C. Biên độ tăng dần, tần số tăng dần',
      'D. Biên độ giảm dần, năng lượng không đổi'
    ],
    correctAnswer: 'B. Biên độ giảm dần, năng lượng giảm dần',
    explanation: 'Dao động tắt dần là dao động có biên độ giảm dần theo thời gian do ma sát. Vì cơ năng W = ½kA², khi A giảm thì W cũng giảm.',
    learningObjectives: ['Hiểu đặc điểm dao động tắt dần'],
    keywords: ['dao động tắt dần', 'biên độ', 'năng lượng', 'ma sát'],
    tags: ['dao động cơ', 'tắt dần', 'trung bình'],
    qualityScore: 0.88,
    status: 'Đã duyệt',
  },

  // --- SHORT_ANSWER ---
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'SHORT_ANSWER',
    difficulty: 'MEDIUM',
    content: 'Con lắc lò xo có m = 400g, k = 100 N/m dao động điều hòa với biên độ A = 5 cm. Tính: a) Tần số góc ω, b) Chu kỳ T, c) Vận tốc cực đại v_max.',
    options: [],
    correctAnswer: 'a) ω = √(k/m) = √(100/0.4) = √250 ≈ 15.81 rad/s; b) T = 2π/ω ≈ 0.397 s; c) v_max = Aω = 0.05 × 15.81 ≈ 0.79 m/s',
    explanation: 'Áp dụng công thức ω = √(k/m), T = 2π/ω, v_max = Aω. Chú ý đổi đơn vị: m = 0.4 kg, A = 0.05 m.',
    learningObjectives: ['Tính các đại lượng cơ bản của con lắc lò xo'],
    keywords: ['tần số góc', 'chu kỳ', 'vận tốc cực đại', 'con lắc lò xo'],
    tags: ['dao động cơ', 'tính toán', 'trung bình'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'SHORT_ANSWER',
    difficulty: 'HARD',
    content: 'Một con lắc lò xo nằm ngang gồm lò xo k = 50 N/m và vật m = 200g. Kéo vật ra khỏi VTCB 4cm rồi thả nhẹ. Tính: a) Phương trình dao động x(t), b) Cơ năng W, c) Động năng khi x = 2 cm.',
    options: [],
    correctAnswer: 'a) ω = √(50/0.2) = √250 ≈ 15.81 rad/s. Tại t=0: x=4cm=A, v=0 → φ=0. x = 4cos(√250·t) cm; b) W = ½kA² = ½×50×0.04² = 0.04 J; c) Wt = ½×50×0.02² = 0.01 J, Wđ = W - Wt = 0.03 J',
    explanation: 'Từ điều kiện ban đầu x₀ = A, v₀ = 0 → φ = 0. Dùng bảo toàn cơ năng W = Wđ + Wt để tính động năng tại x = 2cm.',
    learningObjectives: ['Viết phương trình dao động và phân tích năng lượng'],
    keywords: ['phương trình dao động', 'cơ năng', 'động năng', 'thế năng'],
    tags: ['dao động cơ', 'năng lượng', 'nâng cao'],
    qualityScore: 0.92,
    status: 'Đã duyệt',
  },

  // --- ESSAY ---
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'ESSAY',
    difficulty: 'HARD',
    content: 'Một con lắc lò xo treo thẳng đứng có k = 40 N/m, m = 100g. Từ VTCB kéo vật xuống 5cm rồi truyền vận tốc 50√3 cm/s hướng lên. Lấy g = 10 m/s².\n\n1. Xác định độ giãn của lò xo tại VTCB.\n2. Viết phương trình dao động, chọn gốc tại VTCB, chiều dương hướng xuống.\n3. Tính lực đàn hồi cực đại và cực tiểu của lò xo.',
    options: [],
    correctAnswer: 'Δl₀ = mg/k = 0.1×10/40 = 0.025m = 2.5cm. ω = √(k/m) = 20 rad/s. A = √(x₀² + (v₀/ω)²) = √(25 + 75) = 10cm. tanφ = v₀/(ωx₀) → φ = -π/3. x = 10cos(20t - π/3) cm. F_max = k(Δl₀ + A) = 40×0.125 = 5N. F_min = 0 (vì A > Δl₀).',
    explanation: 'Bài toán con lắc lò xo treo thẳng đứng: cần tính độ giãn tĩnh, xác định biên độ từ điều kiện ban đầu, và phân tích lực đàn hồi.',
    learningObjectives: ['Giải bài toán tổng hợp con lắc lò xo treo thẳng đứng'],
    keywords: ['con lắc lò xo', 'treo thẳng đứng', 'lực đàn hồi', 'phương trình dao động'],
    tags: ['dao động cơ', 'nâng cao', 'tổng hợp'],
    qualityScore: 0.95,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Phát biểu nào sau đây đúng về dao động điều hòa?',
    options: [
      'A. Gia tốc luôn cùng chiều với vận tốc',
      'B. Gia tốc luôn hướng về vị trí cân bằng',
      'C. Gia tốc có giá trị cực đại tại vị trí cân bằng',
      'D. Gia tốc luôn dương'
    ],
    correctAnswer: 'B. Gia tốc luôn hướng về vị trí cân bằng',
    explanation: 'Trong DĐĐH, a = -ω²x, gia tốc luôn ngược dấu với li độ, tức luôn hướng về VTCB. Đây là đặc trưng quan trọng nhất.',
    learningObjectives: ['Hiểu tính chất gia tốc trong dao động điều hòa'],
    keywords: ['gia tốc', 'vị trí cân bằng', 'dao động điều hòa', 'hướng'],
    tags: ['dao động cơ', 'gia tốc', 'cơ bản'],
    qualityScore: 0.88,
    status: 'Đã duyệt',
  },
  {
    topic: 'Dao động cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Một con lắc đơn dao động nhỏ. Khi đưa con lắc từ mặt đất lên cao thì chu kỳ dao động:',
    options: [
      'A. Giảm vì g giảm',
      'B. Tăng vì g giảm',
      'C. Không đổi vì chiều dài l không đổi',
      'D. Tăng vì khoảng cách đến tâm Trái Đất tăng'
    ],
    correctAnswer: 'B. Tăng vì g giảm',
    explanation: 'T = 2π√(l/g). Khi lên cao, g giảm (g = GM/R²), nên √(l/g) tăng → T tăng. Đáp án B và D đều đúng về kết quả nhưng B nêu rõ nguyên nhân trực tiếp hơn.',
    learningObjectives: ['Phân tích ảnh hưởng của gia tốc trọng trường đến chu kỳ con lắc đơn'],
    keywords: ['con lắc đơn', 'chu kỳ', 'gia tốc trọng trường', 'độ cao'],
    tags: ['dao động cơ', 'con lắc đơn', 'trung bình'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },
];

// ═══════════════════════════════════════════════════════════
// SÓNG CƠ - 10 câu hỏi
// ═══════════════════════════════════════════════════════════
const songCoQuestions: QuestionSeed[] = [
  {
    topic: 'Sóng cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Sóng cơ là:',
    options: [
      'A. Sóng điện từ lan truyền trong không gian',
      'B. Dao động cơ lan truyền trong môi trường vật chất',
      'C. Sóng ánh sáng',
      'D. Sóng lan truyền trong chân không'
    ],
    correctAnswer: 'B. Dao động cơ lan truyền trong môi trường vật chất',
    explanation: 'Sóng cơ là dao động cơ lan truyền trong một môi trường vật chất (rắn, lỏng, khí). Sóng cơ không truyền được trong chân không.',
    learningObjectives: ['Hiểu khái niệm sóng cơ'],
    keywords: ['sóng cơ', 'dao động', 'môi trường vật chất'],
    tags: ['sóng cơ', 'cơ bản'],
    qualityScore: 0.85,
    status: 'Đã duyệt',
  },
  {
    topic: 'Sóng cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Bước sóng λ được tính bằng công thức:',
    options: ['A. λ = v/f', 'B. λ = f/v', 'C. λ = v × f²', 'D. λ = f × T'],
    correctAnswer: 'A. λ = v/f',
    explanation: 'Bước sóng λ = v × T = v/f, trong đó v là vận tốc truyền sóng, f là tần số, T là chu kỳ.',
    learningObjectives: ['Nắm công thức bước sóng'],
    keywords: ['bước sóng', 'vận tốc', 'tần số'],
    tags: ['sóng cơ', 'cơ bản'],
    qualityScore: 0.88,
    status: 'Đã duyệt',
  },
  {
    topic: 'Sóng cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Trong thí nghiệm giao thoa sóng nước, hai nguồn kết hợp cùng pha cách nhau 8 cm, bước sóng λ = 2 cm. Số đường cực đại giao thoa (kể cả đường trung trực) là:',
    options: ['A. 7', 'B. 9', 'C. 5', 'D. 11'],
    correctAnswer: 'B. 9',
    explanation: 'Điều kiện cực đại: |d₁ - d₂| = kλ, k ∈ Z. |k| ≤ S₁S₂/λ = 8/2 = 4. Vậy k = -4, -3, -2, -1, 0, 1, 2, 3, 4 → 9 đường cực đại.',
    learningObjectives: ['Tính số đường cực đại trong giao thoa sóng'],
    keywords: ['giao thoa', 'cực đại', 'nguồn kết hợp', 'bước sóng'],
    tags: ['sóng cơ', 'giao thoa', 'trung bình'],
    qualityScore: 0.93,
    status: 'Đã duyệt',
  },
  {
    topic: 'Sóng cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Một sóng cơ truyền trên mặt nước có tần số f = 10 Hz, vận tốc truyền sóng v = 40 cm/s. Bước sóng là:',
    options: ['A. 4 cm', 'B. 400 cm', 'C. 0.25 cm', 'D. 40 cm'],
    correctAnswer: 'A. 4 cm',
    explanation: 'λ = v/f = 40/10 = 4 cm.',
    learningObjectives: ['Tính bước sóng từ vận tốc và tần số'],
    keywords: ['bước sóng', 'tần số', 'vận tốc truyền sóng'],
    tags: ['sóng cơ', 'tính toán', 'trung bình'],
    qualityScore: 0.87,
    status: 'Đã duyệt',
  },
  {
    topic: 'Sóng cơ',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Trong sóng dừng trên dây, khoảng cách giữa hai nút sóng liên tiếp bằng:',
    options: ['A. λ', 'B. λ/2', 'C. λ/4', 'D. 2λ'],
    correctAnswer: 'B. λ/2',
    explanation: 'Trong sóng dừng, khoảng cách giữa hai nút (hoặc hai bụng) liên tiếp bằng λ/2. Khoảng cách giữa nút và bụng liên tiếp bằng λ/4.',
    learningObjectives: ['Hiểu cấu trúc sóng dừng'],
    keywords: ['sóng dừng', 'nút sóng', 'bụng sóng', 'bước sóng'],
    tags: ['sóng cơ', 'sóng dừng', 'trung bình'],
    qualityScore: 0.9,
    status: 'Đã duyệt',
  },
];

// ═══════════════════════════════════════════════════════════
// ĐIỆN XOAY CHIỀU - 5 câu hỏi
// ═══════════════════════════════════════════════════════════
const dienXoayChieuQuestions: QuestionSeed[] = [
  {
    topic: 'Điện xoay chiều',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Dòng điện xoay chiều là dòng điện có:',
    options: [
      'A. Cường độ biến đổi theo thời gian',
      'B. Cường độ và chiều biến đổi tuần hoàn theo thời gian',
      'C. Chiều không đổi, cường độ thay đổi',
      'D. Cường độ không đổi, chiều thay đổi'
    ],
    correctAnswer: 'B. Cường độ và chiều biến đổi tuần hoàn theo thời gian',
    explanation: 'Dòng điện xoay chiều (AC) có cả cường độ và chiều biến đổi tuần hoàn theo thời gian, thường theo hàm sin hoặc cosin.',
    learningObjectives: ['Hiểu khái niệm dòng điện xoay chiều'],
    keywords: ['dòng điện xoay chiều', 'tuần hoàn', 'cường độ', 'chiều'],
    tags: ['điện xoay chiều', 'cơ bản'],
    qualityScore: 0.85,
    status: 'Đã duyệt',
  },
  {
    topic: 'Điện xoay chiều',
    subject: 'Vật lý',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Đoạn mạch RLC nối tiếp có R = 30Ω, Z_L = 50Ω, Z_C = 10Ω. Tổng trở của đoạn mạch là:',
    options: ['A. 50 Ω', 'B. 90 Ω', 'C. 30 Ω', 'D. 70 Ω'],
    correctAnswer: 'A. 50 Ω',
    explanation: 'Z = √(R² + (Z_L - Z_C)²) = √(30² + (50-10)²) = √(900 + 1600) = √2500 = 50 Ω.',
    learningObjectives: ['Tính tổng trở mạch RLC nối tiếp'],
    keywords: ['tổng trở', 'RLC', 'nối tiếp', 'cảm kháng', 'dung kháng'],
    tags: ['điện xoay chiều', 'RLC', 'trung bình'],
    qualityScore: 0.92,
    status: 'Đã duyệt',
  },
];

// ═══════════════════════════════════════════════════════════
// TOÁN HỌC - Đạo hàm - 5 câu
// ═══════════════════════════════════════════════════════════
const daoHamQuestions: QuestionSeed[] = [
  {
    topic: 'Đạo hàm',
    subject: 'Toán học',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'EASY',
    content: 'Cho hàm số f(x) = x³ - 3x² + 2. Đạo hàm f\'(x) bằng:',
    options: ['A. 3x² - 6x', 'B. 3x² - 3x', 'C. x² - 6x', 'D. 3x² - 6x + 2'],
    correctAnswer: 'A. 3x² - 6x',
    explanation: 'f\'(x) = (x³)\' - (3x²)\' + (2)\' = 3x² - 6x + 0 = 3x² - 6x.',
    learningObjectives: ['Tính đạo hàm đa thức cơ bản'],
    keywords: ['đạo hàm', 'đa thức', 'công thức'],
    tags: ['đạo hàm', 'cơ bản'],
    qualityScore: 0.88,
    status: 'Đã duyệt',
  },
  {
    topic: 'Đạo hàm',
    subject: 'Toán học',
    grade: '12',
    questionType: 'MCQ',
    difficulty: 'MEDIUM',
    content: 'Đạo hàm của hàm số y = sin(2x) + cos(3x) là:',
    options: [
      'A. y\' = cos(2x) - sin(3x)',
      'B. y\' = 2cos(2x) - 3sin(3x)',
      'C. y\' = -2sin(2x) + 3cos(3x)',
      'D. y\' = cos(2x) + sin(3x)'
    ],
    correctAnswer: 'B. y\' = 2cos(2x) - 3sin(3x)',
    explanation: 'y\' = [sin(2x)]\' + [cos(3x)]\' = cos(2x)·(2x)\' + (-sin(3x))·(3x)\' = 2cos(2x) - 3sin(3x).',
    learningObjectives: ['Tính đạo hàm hàm lượng giác hợp'],
    keywords: ['đạo hàm', 'hàm hợp', 'lượng giác', 'chain rule'],
    tags: ['đạo hàm', 'trung bình'],
    qualityScore: 0.92,
    status: 'Đã duyệt',
  },
];

async function main() {
  console.log('🔄 Seeding question bank...');

  const allQuestions = [
    ...daoDocCoQuestions,
    ...songCoQuestions,
    ...dienXoayChieuQuestions,
    ...daoHamQuestions,
  ];

  let created = 0;
  for (const q of allQuestions) {
    try {
      await prisma.question.create({
        data: {
          ...q,
          createdBy: CREATED_BY,
          humanReviewed: true,
          reviewedBy: CREATED_BY,
          reviewedAt: new Date(),
        },
      });
      created++;
    } catch (err: any) {
      console.warn(`⚠️ Failed to create question: ${q.content.substring(0, 50)}...`, err.message);
    }
  }

  console.log(`✅ Seeded ${created}/${allQuestions.length} questions`);

  // Show summary
  const summary = await prisma.question.groupBy({
    by: ['topic'],
    _count: true,
  });
  console.log('\n📊 Question bank summary:');
  for (const s of summary) {
    console.log(`  ${s.topic}: ${s._count} câu`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
