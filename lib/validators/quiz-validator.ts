/**
 * Quiz Validator with Strict Schema
 * Validates and sanitizes AI-generated quiz output
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const QuestionSchema = z.object({
  question: z.string()
    .min(10, 'Câu hỏi phải có ít nhất 10 ký tự')
    .max(500, 'Câu hỏi không được vượt quá 500 ký tự'),
  
  type: z.enum(['MCQ', 'true_false', 'fill_blank', 'essay']).default('MCQ'),
  
  options: z.array(z.string())
    .min(2, 'Phải có ít nhất 2 lựa chọn')
    .max(4, 'Không được vượt quá 4 lựa chọn'),
  
  correctAnswer: z.number()
    .int('Đáp án đúng phải là số nguyên')
    .min(0, 'Chỉ số đáp án không thể âm')
    .refine(
      (val, ctx) => {
        const options = (ctx.parent as any)?.options;
        return !options || val < options.length;
      },
      'Chỉ số đáp án vượt quá số lượng lựa chọn'
    ),
  
  explanation: z.string()
    .min(20, 'Giải thích phải có ít nhất 20 ký tự')
    .max(1000, 'Giải thích không được vượt quá 1000 ký tự'),
  
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  
  tags: z.array(z.string()).default([]),
  
  learningObjective: z.string().optional(),
});

const QuizMetadataSchema = z.object({
  subject: z.string().min(1),
  grade: z.string().min(1),
  topic: z.string().min(1),
  totalQuestions: z.number().int().positive(),
  estimatedTime: z.number().int().positive().optional(),
});

export const QuizSchema = z.object({
  title: z.string()
    .min(5, 'Tiêu đề phải có ít nhất 5 ký tự')
    .max(200, 'Tiêu đề không được vượt quá 200 ký tự'),
  
  questions: z.array(QuestionSchema)
    .min(1, 'Phải có ít nhất 1 câu hỏi')
    .refine(
      (questions, ctx) => {
        const metadata = (ctx.parent as any)?.metadata;
        return !metadata || questions.length === metadata.totalQuestions;
      },
      'Số lượng câu hỏi không khớp với metadata'
    ),
  
  metadata: QuizMetadataSchema,
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Question = z.infer<typeof QuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
export type QuizMetadata = z.infer<typeof QuizMetadataSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate and parse quiz JSON
 * Returns validated quiz or throws with detailed errors
 */
export function validateQuiz(data: unknown): Quiz {
  try {
    return QuizSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      throw new Error(`Quiz validation failed: ${errorMessages}`);
    }
    throw error;
  }
}

/**
 * Safely parse JSON string and validate
 */
export function parseAndValidateQuiz(jsonString: string): Quiz {
  try {
    // Extract JSON from markdown code blocks if present
    let cleanJson = jsonString;
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1];
    }
    
    const data = JSON.parse(cleanJson);
    return validateQuiz(data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate with correction attempt
 * Tries to fix common formatting issues
 */
export function validateAndCorectQuiz(data: unknown): Quiz {
  try {
    return validateQuiz(data);
  } catch (error) {
    // Attempt auto-correction
    if (typeof data === 'object' && data !== null) {
      const corrected = { ...data } as any;
      
      // Fix common issues
      if (corrected.questions && Array.isArray(corrected.questions)) {
        corrected.questions = corrected.questions.map((q: any) => ({
          ...q,
          correctAnswer: typeof q.correctAnswer === 'string' 
            ? parseInt(q.correctAnswer) 
            : q.correctAnswer,
          difficulty: q.difficulty || 'medium',
          type: q.type || 'MCQ',
          tags: q.tags || [],
        }));
      }
      
      if (corrected.metadata) {
        corrected.metadata.totalQuestions = corrected.questions?.length || corrected.metadata.totalQuestions;
      }
      
      return validateQuiz(corrected);
    }
    throw error;
  }
}

/**
 * Check quiz quality metrics
 */
export function assessQuizQuality(quiz: Quiz): {
  isValid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check question quality
  quiz.questions.forEach((q, idx) => {
    // Check for duplicate options
    const uniqueOptions = new Set(q.options.map(o => o.toLowerCase().trim()));
    if (uniqueOptions.size < q.options.length) {
      issues.push(`Question ${idx + 1}: Contains duplicate options`);
      score -= 10;
    }

    // Check if correct answer is reasonable
    const correctOption = q.options[q.correctAnswer];
    if (!correctOption) {
      issues.push(`Question ${idx + 1}: Invalid correct answer index`);
      score -= 15;
    }

    // Check explanation length
    if (q.explanation.split(' ').length < 5) {
      issues.push(`Question ${idx + 1}: Explanation too short`);
      score -= 5;
    }
  });

  // Check difficulty distribution
  const difficulties = quiz.questions.map(q => q.difficulty);
  const easyCount = difficulties.filter(d => d === 'easy').length;
  const mediumCount = difficulties.filter(d => d === 'medium').length;
  const hardCount = difficulties.filter(d => d === 'hard').length;

  const easyPercent = (easyCount / difficulties.length) * 100;
  const mediumPercent = (mediumCount / difficulties.length) * 100;
  const hardPercent = (hardCount / difficulties.length) * 100;

  // Validate distribution (should not be all same difficulty)
  if (easyPercent === 100 || mediumPercent === 100 || hardPercent === 100) {
    issues.push('All questions have the same difficulty level');
    score -= 20;
  }

  return {
    isValid: score >= 60,
    score,
    issues,
  };
}

/**
 * Generate sample quiz for testing
 */
export function generateSampleQuiz(): Quiz {
  return {
    title: 'Bài Kiểm Tra Mẫu: Toán Học',
    questions: [
      {
        question: 'Đạo hàm của hàm số f(x) = x² + 3x là gì?',
        type: 'MCQ',
        options: [
          'A. 2x + 3',
          'B. 2x² + 3',
          'C. x + 3',
          'D. 2x + 3x'
        ],
        correctAnswer: 0,
        explanation: 'Sử dụng quy tắc đạo hàm: đạo hàm của x^n = n*x^(n-1). Vậy đạo hàm của x² = 2x, đạo hàm của 3x = 3. Đáp án là 2x + 3.',
        difficulty: 'easy',
        tags: ['calculus', 'derivatives'],
        learningObjective: 'Học sinh có thể tính đạo hàm của đa thức bậc 2'
      }
    ],
    metadata: {
      subject: 'Toán Học',
      grade: '12',
      topic: 'Đạo Hàm',
      totalQuestions: 1,
      estimatedTime: 2
    }
  };
}
