/**
 * Grading Rubrics System
 * Định nghĩa các rubric chi tiết cho từng môn học và cấp lớp
 */

export interface RubricLevel {
  score: number; // Điểm (0-10)
  descriptor: string; // Mô tả mức độ
  examples?: string[]; // Ví dụ minh họa
}

export interface RubricCriterion {
  name: string; // Tên tiêu chí
  description: string; // Mô tả tiêu chí
  weight: number; // Trọng số (tổng = 1.0)
  maxScore: number; // Điểm tối đa (thường là 10)
  levels: RubricLevel[]; // Các mức độ đánh giá
}

export interface GradingRubric {
  id: string;
  name: string;
  subject: string; // vietnamese, math, english, physics, chemistry, biology
  grade: string; // 6, 7, 8, 9, 10, 11, 12
  type: 'essay' | 'problem' | 'project' | 'presentation';
  description: string;
  criteria: RubricCriterion[];
  totalScore: number; // Tổng điểm tối đa (thường là 10)
  passingScore: number; // Điểm đạt (thường là 5)
}

/**
 * Vietnamese Literature Essay Rubric (Grades 6-12)
 */
export const VIETNAMESE_ESSAY_RUBRIC: GradingRubric = {
  id: 'vietnamese-essay-6-12',
  name: 'Chấm bài văn Tiếng Việt',
  subject: 'vietnamese',
  grade: '6-12',
  type: 'essay',
  description: 'Rubric chấm bài văn nghị luận, văn miêu tả, văn tự sự',
  totalScore: 10,
  passingScore: 5,
  criteria: [
    {
      name: 'Nội dung',
      description: 'Ý tưởng, tư tưởng, tính sáng tạo',
      weight: 0.4,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Xuất sắc: Ý tưởng sâu sắc, độc đáo, sáng tạo. Nội dung phong phú, đa chiều.',
          examples: ['Có quan điểm cá nhân rõ ràng', 'Phân tích sâu sắc vấn đề', 'Liên hệ thực tế sinh động'],
        },
        {
          score: 7-8,
          descriptor: 'Tốt: Nội dung rõ ràng, có chiều sâu. Ý tưởng khá hay.',
          examples: ['Nắm vững chủ đề', 'Có dẫn chứng thuyết phục', 'Liên hệ được thực tế'],
        },
        {
          score: 5-6,
          descriptor: 'Đạt: Nội dung cơ bản, đủ yêu cầu. Chưa thực sự sâu sắc.',
          examples: ['Hiểu được đề bài', 'Nội dung đúng trọng tâm', 'Dẫn chứng cơ bản'],
        },
        {
          score: 3-4,
          descriptor: 'Yếu: Nội dung nghèo nàn, thiếu chiều sâu.',
          examples: ['Ý tưởng đơn giản', 'Thiếu dẫn chứng', 'Liên hệ sơ sài'],
        },
        {
          score: 0-2,
          descriptor: 'Kém: Nội dung không phù hợp hoặc sai chủ đề.',
          examples: ['Lạc đề', 'Không có ý tưởng rõ ràng', 'Nội dung sai sự thật'],
        },
      ],
    },
    {
      name: 'Cấu trúc',
      description: 'Bố cục, mạch văn, tính logic',
      weight: 0.25,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Xuất sắc: Bố cục chặt chẽ, mạch lạc. Mở-thân-kết hài hòa.',
          examples: ['Mở bài hấp dẫn', 'Thân bài mạch lạc', 'Kết bài ấn tượng'],
        },
        {
          score: 7-8,
          descriptor: 'Tốt: Cấu trúc rõ ràng, logic. Các phần kết nối tốt.',
          examples: ['Có mở-thân-kết', 'Ý nối ý tự nhiên', 'Trình tự hợp lý'],
        },
        {
          score: 5-6,
          descriptor: 'Đạt: Cấu trúc cơ bản, đủ các phần.',
          examples: ['Có đầy đủ mở-thân-kết', 'Chưa mạch lạc lắm', 'Có thể cải thiện'],
        },
        {
          score: 3-4,
          descriptor: 'Yếu: Cấu trúc lỏng lẻo, thiếu logic.',
          examples: ['Thiếu một phần', 'Ý không liên kết', 'Nhảy cóc'],
        },
        {
          score: 0-2,
          descriptor: 'Kém: Không có cấu trúc rõ ràng.',
          examples: ['Không phân đoạn', 'Lộn xộn', 'Không logic'],
        },
      ],
    },
    {
      name: 'Ngôn ngữ',
      description: 'Từ vựng, câu văn, tu từ',
      weight: 0.25,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Xuất sắc: Ngôn ngữ phong phú, sinh động, có hình ảnh đẹp.',
          examples: ['Từ vựng đa dạng', 'Câu văn mượt mà', 'Nhiều tu từ hay'],
        },
        {
          score: 7-8,
          descriptor: 'Tốt: Ngôn ngữ tốt, rõ ràng, có phần sinh động.',
          examples: ['Từ vựng phù hợp', 'Câu văn trôi chảy', 'Có tu từ'],
        },
        {
          score: 5-6,
          descriptor: 'Đạt: Ngôn ngữ bình thường, đủ yêu cầu.',
          examples: ['Dùng từ cơ bản', 'Câu văn đơn giản', 'Ít tu từ'],
        },
        {
          score: 3-4,
          descriptor: 'Yếu: Ngôn ngữ nghèo nàn, đơn điệu.',
          examples: ['Từ vựng hạn chế', 'Câu ngắt quãng', 'Không có tu từ'],
        },
        {
          score: 0-2,
          descriptor: 'Kém: Ngôn ngữ rất kém, khó hiểu.',
          examples: ['Dùng từ sai', 'Câu không rõ nghĩa', 'Lủng củng'],
        },
      ],
    },
    {
      name: 'Chính tả & Ngữ pháp',
      description: 'Lỗi chính tả, ngữ pháp, dấu câu',
      weight: 0.1,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Xuất sắc: Không có lỗi hoặc rất ít lỗi.',
          examples: ['0-2 lỗi nhỏ'],
        },
        {
          score: 7-8,
          descriptor: 'Tốt: Một vài lỗi nhỏ, không ảnh hưởng nghĩa.',
          examples: ['3-5 lỗi nhỏ'],
        },
        {
          score: 5-6,
          descriptor: 'Đạt: Có lỗi nhưng còn chấp nhận được.',
          examples: ['6-10 lỗi'],
        },
        {
          score: 3-4,
          descriptor: 'Yếu: Nhiều lỗi, ảnh hưởng ý nghĩa.',
          examples: ['11-20 lỗi'],
        },
        {
          score: 0-2,
          descriptor: 'Kém: Rất nhiều lỗi, khó đọc.',
          examples: ['Trên 20 lỗi'],
        },
      ],
    },
  ],
};

/**
 * Mathematics Problem Rubric (Grades 6-12)
 */
export const MATH_PROBLEM_RUBRIC: GradingRubric = {
  id: 'math-problem-6-12',
  name: 'Chấm bài toán',
  subject: 'math',
  grade: '6-12',
  type: 'problem',
  description: 'Rubric chấm bài toán đại số, hình học, giải tích',
  totalScore: 10,
  passingScore: 5,
  criteria: [
    {
      name: 'Phương pháp',
      description: 'Lựa chọn và áp dụng phương pháp giải',
      weight: 0.3,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Phương pháp chính xác, tối ưu, sáng tạo',
        },
        {
          score: 7-8,
          descriptor: 'Phương pháp đúng, hợp lý',
        },
        {
          score: 5-6,
          descriptor: 'Phương pháp cơ bản, đủ để giải',
        },
        {
          score: 3-4,
          descriptor: 'Phương pháp chưa phù hợp',
        },
        {
          score: 0-2,
          descriptor: 'Phương pháp sai hoàn toàn',
        },
      ],
    },
    {
      name: 'Tính toán',
      description: 'Độ chính xác trong các bước tính',
      weight: 0.4,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Tất cả các bước tính đúng',
        },
        {
          score: 7-8,
          descriptor: 'Hầu hết các bước đúng, 1-2 lỗi nhỏ',
        },
        {
          score: 5-6,
          descriptor: 'Một số bước đúng, có lỗi tính toán',
        },
        {
          score: 3-4,
          descriptor: 'Nhiều lỗi tính toán',
        },
        {
          score: 0-2,
          descriptor: 'Hầu hết các bước sai',
        },
      ],
    },
    {
      name: 'Trình bày',
      description: 'Bài làm rõ ràng, logic',
      weight: 0.2,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Trình bày rất rõ ràng, mạch lạc',
        },
        {
          score: 7-8,
          descriptor: 'Trình bày khá rõ',
        },
        {
          score: 5-6,
          descriptor: 'Trình bày cơ bản',
        },
        {
          score: 3-4,
          descriptor: 'Trình bày khó hiểu',
        },
        {
          score: 0-2,
          descriptor: 'Không trình bày hoặc rất lộn xộn',
        },
      ],
    },
    {
      name: 'Kết quả',
      description: 'Đáp số cuối cùng',
      weight: 0.1,
      maxScore: 10,
      levels: [
        {
          score: 10,
          descriptor: 'Đáp số đúng, có đơn vị',
        },
        {
          score: 7,
          descriptor: 'Đáp số đúng nhưng thiếu/sai đơn vị',
        },
        {
          score: 0,
          descriptor: 'Đáp số sai',
        },
      ],
    },
  ],
};

/**
 * English Essay Rubric (Grades 6-12)
 */
export const ENGLISH_ESSAY_RUBRIC: GradingRubric = {
  id: 'english-essay-6-12',
  name: 'English Essay Grading',
  subject: 'english',
  grade: '6-12',
  type: 'essay',
  description: 'Rubric for grading English essays',
  totalScore: 10,
  passingScore: 5,
  criteria: [
    {
      name: 'Content',
      description: 'Ideas, relevance, depth',
      weight: 0.35,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Excellent: Original, insightful, well-developed ideas',
        },
        {
          score: 7-8,
          descriptor: 'Good: Clear, relevant ideas with some depth',
        },
        {
          score: 5-6,
          descriptor: 'Satisfactory: Basic ideas, meets requirements',
        },
        {
          score: 3-4,
          descriptor: 'Weak: Limited ideas, superficial',
        },
        {
          score: 0-2,
          descriptor: 'Poor: Irrelevant or off-topic',
        },
      ],
    },
    {
      name: 'Organization',
      description: 'Structure and coherence',
      weight: 0.25,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Excellent: Clear structure, smooth transitions',
        },
        {
          score: 7-8,
          descriptor: 'Good: Organized, mostly coherent',
        },
        {
          score: 5-6,
          descriptor: 'Satisfactory: Basic organization',
        },
        {
          score: 3-4,
          descriptor: 'Weak: Poor organization',
        },
        {
          score: 0-2,
          descriptor: 'Poor: No clear organization',
        },
      ],
    },
    {
      name: 'Language Use',
      description: 'Vocabulary, grammar, sentence structure',
      weight: 0.25,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Excellent: Varied vocabulary, complex structures, few errors',
        },
        {
          score: 7-8,
          descriptor: 'Good: Good vocabulary, some variety, minor errors',
        },
        {
          score: 5-6,
          descriptor: 'Satisfactory: Basic vocabulary, simple structures, some errors',
        },
        {
          score: 3-4,
          descriptor: 'Weak: Limited vocabulary, many errors',
        },
        {
          score: 0-2,
          descriptor: 'Poor: Very limited language, hard to understand',
        },
      ],
    },
    {
      name: 'Mechanics',
      description: 'Spelling, punctuation, capitalization',
      weight: 0.15,
      maxScore: 10,
      levels: [
        {
          score: 9-10,
          descriptor: 'Excellent: No or very few errors',
        },
        {
          score: 7-8,
          descriptor: 'Good: Few errors',
        },
        {
          score: 5-6,
          descriptor: 'Satisfactory: Some errors',
        },
        {
          score: 3-4,
          descriptor: 'Weak: Many errors',
        },
        {
          score: 0-2,
          descriptor: 'Poor: Numerous errors',
        },
      ],
    },
  ],
};

/**
 * Get rubric by subject and grade
 */
export function getRubric(subject: string, grade?: string): GradingRubric {
  const rubrics: Record<string, GradingRubric> = {
    vietnamese: VIETNAMESE_ESSAY_RUBRIC,
    math: MATH_PROBLEM_RUBRIC,
    mathematics: MATH_PROBLEM_RUBRIC,
    english: ENGLISH_ESSAY_RUBRIC,
  };

  const key = subject.toLowerCase();
  return rubrics[key] || VIETNAMESE_ESSAY_RUBRIC;
}

/**
 * Calculate weighted score from criterion scores
 */
export function calculateWeightedScore(
  rubric: GradingRubric,
  scores: Record<string, number>
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const criterion of rubric.criteria) {
    const score = scores[criterion.name];
    if (score !== undefined && !isNaN(score)) {
      totalScore += score * criterion.weight;
      totalWeight += criterion.weight;
    }
  }

  // Normalize to 0-10 scale
  return totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
}

/**
 * Get descriptor for a score
 */
export function getDescriptor(
  criterion: RubricCriterion,
  score: number
): string {
  for (const level of criterion.levels) {
    const scoreRange = level.score.toString();
    if (scoreRange.includes('-')) {
      const [min, max] = scoreRange.split('-').map(Number);
      if (score >= min && score <= max) {
        return level.descriptor;
      }
    } else {
      if (score === level.score) {
        return level.descriptor;
      }
    }
  }
  return 'Không xác định';
}

/**
 * Validate rubric score
 */
export function validateRubricScore(
  rubric: GradingRubric,
  scores: Record<string, number>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all criteria have scores
  for (const criterion of rubric.criteria) {
    if (scores[criterion.name] === undefined) {
      errors.push(`Thiếu điểm cho tiêu chí: ${criterion.name}`);
    } else {
      const score = scores[criterion.name];
      if (score < 0 || score > criterion.maxScore) {
        errors.push(`Điểm ${criterion.name} không hợp lệ: ${score} (phải từ 0-${criterion.maxScore})`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
