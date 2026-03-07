/**
 * AI Smart Grading Service
 * Automatically grades student submissions using AI
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { AIMessage } from '../providers/base-provider';

export interface GradingRequest {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  rubric?: GradingRubric;
  maxScore?: number;
  subject?: string;
  partialCreditEnabled?: boolean;
}

export interface GradingRubric {
  criteria: Array<{
    name: string;
    description: string;
    maxPoints: number;
  }>;
}

export interface GradingResult {
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  detailedBreakdown?: Array<{
    criterion: string;
    score: number;
    maxScore: number;
    comment: string;
  }>;
  confidence: number; // 0-1, how confident the AI is
}

export interface BulkGradingRequest {
  submissions: Array<{
    studentId: string;
    question: string;
    answer: string;
  }>;
  rubric: GradingRubric;
  maxScore: number;
}

export class SmartGradingService {
  constructor(private aiService: AIServiceOrchestrator) {}

  /**
   * Grade a single student submission
   */
  async gradeSingle(request: GradingRequest): Promise<GradingResult> {
    const prompt = this.buildGradingPrompt(request);
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: this.getGradingSystemPrompt(),
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.aiService.complete({
      messages,
      options: {
        temperature: 0.3, // Lower temperature for more consistent grading
        maxTokens: 1500,
      },
    });

    return this.parseGradingResult(response.content, request.maxScore || 10);
  }

  /**
   * Grade multiple submissions in bulk
   */
  async gradeBulk(request: BulkGradingRequest): Promise<Map<string, GradingResult>> {
    const results = new Map<string, GradingResult>();

    // Process in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < request.submissions.length; i += batchSize) {
      const batch = request.submissions.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(submission =>
          this.gradeSingle({
            question: submission.question,
            correctAnswer: '',
            studentAnswer: submission.answer,
            rubric: request.rubric,
            maxScore: request.maxScore,
          }).then(result => ({
            studentId: submission.studentId,
            result,
          }))
        )
      );

      batchResults.forEach(({ studentId, result }) => {
        results.set(studentId, result);
      });
    }

    return results;
  }

  /**
   * Compare student answer with correct answer
   */
  async compareAnswers(
    correctAnswer: string,
    studentAnswer: string,
    strictness: 'strict' | 'moderate' | 'lenient' = 'moderate'
  ): Promise<{
    isCorrect: boolean;
    similarity: number;
    explanation: string;
  }> {
    const prompt = `So sánh câu trả lời của học sinh với đáp án đúng.

Đáp án đúng: ${correctAnswer}

Câu trả lời của học sinh: ${studentAnswer}

Mức độ chấm: ${strictness === 'strict' ? 'Nghiêm ngặt' : strictness === 'moderate' ? 'Trung bình' : 'Dễ dãi'}

Phân tích:
1. Câu trả lời có đúng không?
2. Độ tương đồng (0-100%)
3. Giải thích chi tiết

Trả về JSON:
{
  "isCorrect": true/false,
  "similarity": 0-100,
  "explanation": "Giải thích"
}`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Bạn là một hệ thống chấm bài tự động chính xác và công bằng.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.aiService.complete({
      messages,
      options: { temperature: 0.2 },
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isCorrect: parsed.isCorrect || false,
          similarity: parsed.similarity || 0,
          explanation: parsed.explanation || '',
        };
      }
    } catch (e) {
      console.error('Failed to parse comparison result:', e);
    }

    return {
      isCorrect: false,
      similarity: 0,
      explanation: 'Unable to compare answers',
    };
  }

  /**
   * Build grading system prompt
   */
  private getGradingSystemPrompt(): string {
    return `Bạn là một giáo viên chuyên nghiệp với 20 năm kinh nghiệm chấm bài.

NGUYÊN TẮC CHẤM:
1. Công bằng và nhất quán
2. Xem xét cả nội dung và cách trình bày
3. Cho điểm từng phần nếu có thể
4. Phản hồi mang tính xây dựng
5. Khuyến khích học sinh phát triển

TIÊU CHÍ:
- Chính xác về mặt khoa học
- Đầy đủ các ý chính
- Logic và mạch lạc
- Sử dụng thuật ngữ đúng
- Ví dụ minh họa (nếu có)

Hãy chấm bài công bằng và đưa ra phản hồi chi tiết.`;
  }

  /**
   * Build grading prompt
   */
  private buildGradingPrompt(request: GradingRequest): string {
    let prompt = `CHẤM BÀI TỰ LUẬN

Câu hỏi: ${request.question}
${request.correctAnswer ? `Đáp án mẫu: ${request.correctAnswer}` : ''}
Câu trả lời của học sinh: ${request.studentAnswer}
Điểm tối đa: ${request.maxScore || 10}
${request.subject ? `Môn học: ${request.subject}` : ''}

`;

    if (request.rubric) {
      prompt += `RUBRIC CHẤM ĐIỂM:\n`;
      request.rubric.criteria.forEach((criterion, index) => {
        prompt += `${index + 1}. ${criterion.name} (${criterion.maxPoints} điểm): ${criterion.description}\n`;
      });
      prompt += '\n';
    }

    prompt += `NHIỆM VỤ:
1. Đánh giá câu trả lời dựa trên tiêu chí
2. Cho điểm cụ thể
3. Chỉ ra điểm mạnh
4. Đưa ra gợi ý cải thiện
5. Tính độ tin cậy của đánh giá (0-1)

Trả về JSON format:
{
  "score": 0-${request.maxScore || 10},
  "feedback": "Nhận xét tổng quan",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "improvements": ["Cần cải thiện 1", "Cần cải thiện 2"],
  "detailedBreakdown": [
    {
      "criterion": "Tên tiêu chí",
      "score": 0,
      "maxScore": 0,
      "comment": "Nhận xét"
    }
  ],
  "confidence": 0.0-1.0
}`;

    return prompt;
  }

  /**
   * Parse grading result
   */
  private parseGradingResult(content: string, maxScore: number): GradingResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const score = Math.min(Math.max(parsed.score || 0, 0), maxScore);
        const percentage = (score / maxScore) * 100;

        return {
          score,
          maxScore,
          percentage,
          feedback: parsed.feedback || '',
          strengths: parsed.strengths || [],
          improvements: parsed.improvements || [],
          detailedBreakdown: parsed.detailedBreakdown || [],
          confidence: parsed.confidence || 0.8,
        };
      }
    } catch (e) {
      console.error('Failed to parse grading result:', e);
    }

    // Fallback
    return {
      score: 0,
      maxScore,
      percentage: 0,
      feedback: 'Unable to grade automatically. Manual review required.',
      strengths: [],
      improvements: [],
      confidence: 0,
    };
  }

  /**
   * Generate feedback for common mistakes
   */
  async generateHints(
    question: string,
    incorrectAnswer: string
  ): Promise<string[]> {
    const prompt = `Học sinh đã trả lời sai câu hỏi sau:

Câu hỏi: ${question}
Câu trả lời sai: ${incorrectAnswer}

Hãy đưa ra 3-5 gợi ý giúp học sinh tìm ra đáp án đúng, KHÔNG tiết lộ đáp án trực tiếp:

1. Gợi ý về hướng tiếp cận
2. Khái niệm cần xem lại
3. Lỗi sai phổ biến cần tránh
4. Các bước giải quyết

Trả về JSON:
{
  "hints": ["Gợi ý 1", "Gợi ý 2", ...]
}`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: 'Bạn là trợ giảng thông minh, giúp học sinh tự khám phá kiến thức.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await this.aiService.complete({
      messages,
      options: { temperature: 0.7 },
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.hints || [];
      }
    } catch (e) {
      console.error('Failed to parse hints:', e);
    }

    return [];
  }
}
