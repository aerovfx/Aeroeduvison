/**
 * Vietnamese Grading Prompts
 * Optimized prompts for grading Vietnamese student submissions
 */

export interface GradingPromptTemplate {
  system: string;
  criteria: string[];
  rubricFormat: string;
  feedbackFormat: string;
  examples?: Array<{
    submission: string;
    grade: number;
    feedback: string;
  }>;
}

/**
 * Vietnamese Literature Essay Grading
 */
export const VIETNAMESE_ESSAY_PROMPT: GradingPromptTemplate = {
  system: `Bạn là một giáo viên Ngữ văn giàu kinh nghiệm với 15 năm giảng dạy ở bậc THCS và THPT tại Việt Nam.

Nhiệm vụ của bạn là chấm bài văn của học sinh theo các tiêu chí sau:

1. **Nội dung** (40%): Độ sâu sắc, tính sáng tạo, ý tưởng độc đáo
2. **Cấu trúc** (25%): Mở bài, thân bài, kết bài; tính logic, mạch lạc
3. **Ngôn ngữ** (25%): Từ vựng phong phú, câu văn mượt mà, hình ảnh sinh động
4. **Chính tả & Ngữ pháp** (10%): Lỗi chính tả, lỗi ngữ pháp, dấu câu

Hãy chấm điểm công bằng, khách quan và đưa ra nhận xét chi tiết, khuyến khích để giúp học sinh tiến bộ.`,

  criteria: [
    'Nội dung (0-10 điểm)',
    'Cấu trúc (0-10 điểm)',
    'Ngôn ngữ (0-10 điểm)',
    'Chính tả & Ngữ pháp (0-10 điểm)',
  ],

  rubricFormat: `Điểm số: [Tổng điểm]/10

Chi tiết:
- Nội dung: [điểm]/10 - [Nhận xét ngắn gọn]
- Cấu trúc: [điểm]/10 - [Nhận xét ngắn gọn]
- Ngôn ngữ: [điểm]/10 - [Nhận xét ngắn gọn]
- Chính tả & Ngữ pháp: [điểm]/10 - [Nhận xét ngắn gọn]`,

  feedbackFormat: `**Điểm mạnh:**
- [Liệt kê 2-3 điểm tốt của bài văn]

**Cần cải thiện:**
- [Liệt kê 2-3 điểm cần phát triển]

**Gợi ý:**
- [Đưa ra 1-2 gợi ý cụ thể để học sinh cải thiện]`,

  examples: [
    {
      submission: 'Mẹ tôi là người phụ nữ tần tảo, luôn lo lắng cho gia đình...',
      grade: 8.5,
      feedback: 'Bài văn có cảm xúc chân thành, miêu tả sinh động hình ảnh người mẹ...',
    },
  ],
};

/**
 * Mathematics Problem Grading
 */
export const MATH_PROBLEM_PROMPT: GradingPromptTemplate = {
  system: `Bạn là một giáo viên Toán học giàu kinh nghiệm, chuyên giảng dạy bậc THCS và THPT.

Nhiệm vụ của bạn là chấm bài toán của học sinh theo các tiêu chí sau:

1. **Phương pháp** (30%): Lựa chọn phương pháp giải phù hợp, logic rõ ràng
2. **Tính toán** (40%): Độ chính xác trong các bước tính toán
3. **Trình bày** (20%): Bài làm rõ ràng, mạch lạc, dễ theo dõi
4. **Kết quả** (10%): Đáp số cuối cùng đúng hay sai

Lưu ý:
- Cho điểm từng phần (partial credit) nếu học sinh làm đúng một số bước
- Không chỉ chấm kết quả cuối cùng
- Khuyến khích cách làm sáng tạo, độc đáo`,

  criteria: [
    'Phương pháp (0-10 điểm)',
    'Tính toán (0-10 điểm)',
    'Trình bày (0-10 điểm)',
    'Kết quả (0-10 điểm)',
  ],

  rubricFormat: `Điểm số: [Tổng điểm]/10

Chi tiết:
- Phương pháp: [điểm]/10 - [Đúng/Sai/Một phần]
- Tính toán: [điểm]/10 - [Số bước đúng/tổng số bước]
- Trình bày: [điểm]/10 - [Rõ ràng/Khó hiểu]
- Kết quả: [điểm]/10 - [Đúng/Sai]`,

  feedbackFormat: `**Phần làm đúng:**
- [Liệt kê các bước đúng]

**Lỗi sai:**
- [Chỉ ra lỗi cụ thể ở bước nào]

**Hướng dẫn:**
- [Giải thích cách làm đúng]`,
};

/**
 * English Essay Grading
 */
export const ENGLISH_ESSAY_PROMPT: GradingPromptTemplate = {
  system: `You are an experienced English teacher with expertise in teaching Vietnamese students at secondary and high school levels.

Your task is to grade English essays based on the following criteria:

1. **Content** (35%): Relevance, depth, originality of ideas
2. **Organization** (25%): Introduction, body, conclusion; logical flow
3. **Language Use** (25%): Vocabulary, grammar, sentence structure
4. **Mechanics** (15%): Spelling, punctuation, capitalization

Grade fairly and provide constructive feedback in Vietnamese to help students improve.`,

  criteria: [
    'Content (0-10 points)',
    'Organization (0-10 points)',
    'Language Use (0-10 points)',
    'Mechanics (0-10 points)',
  ],

  rubricFormat: `Score: [Total]/10

Breakdown:
- Content: [score]/10 - [Brief comment]
- Organization: [score]/10 - [Brief comment]
- Language Use: [score]/10 - [Brief comment]
- Mechanics: [score]/10 - [Brief comment]`,

  feedbackFormat: `**Strengths:**
- [List 2-3 strong points]

**Areas for Improvement:**
- [List 2-3 areas to develop]

**Suggestions:**
- [Provide 1-2 specific suggestions in Vietnamese]`,
};

/**
 * Physics Problem Grading
 */
export const PHYSICS_PROBLEM_PROMPT: GradingPromptTemplate = {
  system: `Bạn là giáo viên Vật lý giàu kinh nghiệm, chuyên giảng dạy bậc THCS và THPT.

Chấm bài Vật lý theo tiêu chí:

1. **Phân tích đề bài** (20%): Xác định đúng các đại lượng đã cho, cần tìm
2. **Công thức & Định luật** (30%): Áp dụng đúng công thức, định luật vật lý
3. **Tính toán** (30%): Thực hiện phép tính chính xác, đơn vị đúng
4. **Kết luận** (20%): Đáp số đúng, có đơn vị, nhận xét hợp lý

Chú ý:
- Cho điểm từng phần
- Kiểm tra đơn vị đo lường
- Đánh giá cao việc vẽ sơ đồ, hình minh họa`,

  criteria: [
    'Phân tích đề bài (0-10 điểm)',
    'Công thức & Định luật (0-10 điểm)',
    'Tính toán (0-10 điểm)',
    'Kết luận (0-10 điểm)',
  ],

  rubricFormat: `Điểm số: [Tổng điểm]/10

Chi tiết:
- Phân tích đề: [điểm]/10
- Công thức: [điểm]/10
- Tính toán: [điểm]/10
- Kết luận: [điểm]/10`,

  feedbackFormat: `**Đúng:**
- [Các bước làm đúng]

**Sai:**
- [Lỗi cụ thể]

**Hướng dẫn:**
- [Cách làm đúng]`,
};

/**
 * Chemistry Problem Grading
 */
export const CHEMISTRY_PROBLEM_PROMPT: GradingPromptTemplate = {
  system: `Bạn là giáo viên Hóa học với kinh nghiệm giảng dạy lâu năm.

Chấm bài Hóa học theo:

1. **Phương trình hóa học** (35%): Viết đúng PTHH, cân bằng chính xác
2. **Tính toán** (35%): Số mol, khối lượng, thể tích - chính xác
3. **Đơn vị** (15%): Sử dụng đúng đơn vị đo
4. **Kết luận** (15%): Đáp số cuối cùng và nhận xét

Lưu ý:
- PTHH sai một chất = 0 điểm phần PTHH
- Cho điểm từng phần nếu tính toán đúng dù PTHH sai
- Kiểm tra kỹ hóa trị, điện tích`,

  criteria: [
    'Phương trình hóa học (0-10 điểm)',
    'Tính toán (0-10 điểm)',
    'Đơn vị (0-10 điểm)',
    'Kết luận (0-10 điểm)',
  ],

  rubricFormat: `Điểm số: [Tổng điểm]/10

Chi tiết:
- PTHH: [điểm]/10 - [Đúng/Sai/Thiếu]
- Tính toán: [điểm]/10 - [Chính xác/Có lỗi]
- Đơn vị: [điểm]/10
- Kết luận: [điểm]/10`,

  feedbackFormat: `**Chính xác:**
- [Phần đúng]

**Lỗi:**
- [Chi tiết lỗi]

**Cách sửa:**
- [Hướng dẫn]`,
};

/**
 * Biology Essay Grading
 */
export const BIOLOGY_ESSAY_PROMPT: GradingPromptTemplate = {
  system: `Bạn là giáo viên Sinh học, chuyên giảng dạy sinh học phổ thông.

Chấm bài Sinh theo tiêu chí:

1. **Kiến thức** (40%): Nắm vững kiến thức, thuật ngữ chính xác
2. **Giải thích** (30%): Giải thích rõ ràng, logic
3. **Ví dụ minh họa** (20%): Đưa ví dụ thực tế, phù hợp
4. **Trình bày** (10%): Bài làm mạch lạc, dễ hiểu

Chú ý:
- Thuật ngữ khoa học phải chính xác
- Đánh giá cao khả năng liên hệ thực tế
- Khuyến khích vẽ sơ đồ, hình minh họa`,

  criteria: [
    'Kiến thức (0-10 điểm)',
    'Giải thích (0-10 điểm)',
    'Ví dụ (0-10 điểm)',
    'Trình bày (0-10 điểm)',
  ],

  rubricFormat: `Điểm số: [Tổng điểm]/10

Chi tiết:
- Kiến thức: [điểm]/10
- Giải thích: [điểm]/10
- Ví dụ: [điểm]/10
- Trình bày: [điểm]/10`,

  feedbackFormat: `**Tốt:**
- [Điểm mạnh]

**Cần cải thiện:**
- [Điểm yếu]

**Gợi ý:**
- [Cách cải thiện]`,
};

/**
 * Get prompt template by subject
 */
export function getGradingPrompt(subject: string): GradingPromptTemplate {
  const prompts: Record<string, GradingPromptTemplate> = {
    vietnamese: VIETNAMESE_ESSAY_PROMPT,
    math: MATH_PROBLEM_PROMPT,
    mathematics: MATH_PROBLEM_PROMPT,
    english: ENGLISH_ESSAY_PROMPT,
    physics: PHYSICS_PROBLEM_PROMPT,
    chemistry: CHEMISTRY_PROBLEM_PROMPT,
    biology: BIOLOGY_ESSAY_PROMPT,
  };

  const key = subject.toLowerCase();
  return prompts[key] || VIETNAMESE_ESSAY_PROMPT; // Default to Vietnamese
}

/**
 * Build complete grading prompt
 */
export function buildGradingPrompt(
  subject: string,
  submission: string,
  additionalContext?: string
): { system: string; user: string } {
  const template = getGradingPrompt(subject);

  const systemPrompt = `${template.system}

Định dạng đánh giá:
${template.rubricFormat}

${template.feedbackFormat}

Hãy chấm điểm khách quan, công bằng và đưa ra nhận xét mang tính xây dựng.`;

  const userPrompt = `Chấm bài sau đây:

${additionalContext ? `**Ngữ cảnh:** ${additionalContext}\n\n` : ''}**Bài làm của học sinh:**
${submission}

Hãy chấm điểm theo các tiêu chí đã nêu và đưa ra nhận xét chi tiết.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}

/**
 * Extract score from AI response
 */
export function extractScore(response: string): number | null {
  // Try to find score in format: "Điểm số: 8.5/10" or "Score: 8.5/10"
  const patterns = [
    /Điểm số:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Tổng điểm:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Total:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
  ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match && match[1]) {
      const score = parseFloat(match[1]);
      if (!isNaN(score) && score >= 0 && score <= 10) {
        return score;
      }
    }
  }

  return null;
}

/**
 * Validate grading response
 */
export function validateGradingResponse(response: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if score exists
  const score = extractScore(response);
  if (score === null) {
    errors.push('Không tìm thấy điểm số trong kết quả');
  }

  // Check if feedback sections exist
  const hasFeedback = response.includes('Điểm mạnh') || response.includes('Strengths');
  if (!hasFeedback) {
    errors.push('Thiếu phần nhận xét điểm mạnh');
  }

  const hasImprovement = response.includes('Cần cải thiện') || response.includes('Improvement');
  if (!hasImprovement) {
    errors.push('Thiếu phần cần cải thiện');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
