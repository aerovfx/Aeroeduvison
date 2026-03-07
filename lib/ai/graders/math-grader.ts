/**
 * Math Grader
 * Specialized grader for mathematics with step-by-step verification
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { AIMessage } from '../providers/base-provider';
import { GradingRubric, getRubric } from '../rubrics/grading-rubrics';

/**
 * Math Solution Step
 */
export interface MathStep {
  stepNumber: number;
  description: string;
  formula?: string;
  calculation?: string;
  result?: string;
  isCorrect: boolean;
  error?: string;
  comment: string;
}

/**
 * Math Problem Analysis
 */
export interface MathProblemAnalysis {
  // Problem Understanding
  problemType: string; // algebra, geometry, calculus, etc.
  difficulty: 'easy' | 'medium' | 'hard' | 'very-hard';
  requiredConcepts: string[];

  // Solution Analysis
  method: {
    chosen: string;
    appropriate: boolean;
    efficiency: number; // 0-10
    alternatives: string[];
    comment: string;
  };

  // Step-by-Step Verification
  steps: MathStep[];
  totalSteps: number;
  correctSteps: number;
  criticalErrors: string[];

  // Calculation Accuracy
  calculations: {
    total: number;
    correct: number;
    minorErrors: number;
    majorErrors: number;
    examples: Array<{
      step: number;
      expected: string;
      actual: string;
      impact: 'minor' | 'major';
    }>;
  };

  // Presentation
  presentation: {
    clarity: number; // 0-10
    organization: number; // 0-10
    notation: {
      correct: boolean;
      errors: string[];
    };
    diagrams: {
      present: boolean;
      helpful: boolean;
      quality: number; // 0-10
    };
  };

  // Final Answer
  finalAnswer: {
    present: boolean;
    correct: boolean;
    hasUnits: boolean;
    unitsCorrect: boolean;
    reasonableness: number; // 0-10
    value?: string;
  };

  // Overall Assessment
  strengths: string[];
  weaknesses: string[];
  misconceptions: string[];
  recommendations: string[];
}

/**
 * Math Grading Result
 */
export interface MathGradingResult {
  score: number; // 0-10
  percentage: number; // 0-100
  grade: string; // A, B, C, D, F

  criteriaScores: {
    method: number;
    calculation: number;
    presentation: number;
    result: number;
  };

  analysis: MathProblemAnalysis;

  feedback: {
    summary: string;
    correctParts: string[];
    errors: string[];
    hints: string[];
    solution?: string; // Full correct solution (optional)
  };

  partialCredit: {
    awarded: boolean;
    reason: string;
    points: number;
  };

  confidence: number; // 0-1
  needsHumanReview: boolean;
  reviewReason?: string;
}

/**
 * Math Grader
 */
export class MathGrader {
  constructor(private aiService: AIServiceOrchestrator) {}

  /**
   * Grade a math problem with step-by-step checking
   */
  async gradeMathProblem(
    problem: string,
    solution: string,
    correctAnswer?: string,
    grade?: string
  ): Promise<MathGradingResult> {
    // Get rubric
    const rubric = getRubric('math', grade);

    // Perform analysis
    const analysis = await this.analyzeSolution(problem, solution, correctAnswer);

    // Score the solution
    const scoring = this.scoreSolution(analysis, rubric);

    // Generate feedback
    const feedback = this.generateFeedback(analysis, scoring, problem);

    // Calculate partial credit
    const partialCredit = this.calculatePartialCredit(analysis);

    const result: MathGradingResult = {
      ...scoring,
      analysis,
      feedback,
      partialCredit,
    };

    // Determine if needs review
    result.needsHumanReview = this.shouldReview(result);
    if (result.needsHumanReview) {
      result.reviewReason = this.getReviewReason(result);
    }

    return result;
  }

  /**
   * Analyze math solution step by step
   */
  private async analyzeSolution(
    problem: string,
    solution: string,
    correctAnswer?: string
  ): Promise<MathProblemAnalysis> {
    const prompt = this.buildAnalysisPrompt(problem, solution, correctAnswer);

    const response = await this.aiService.complete({
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      options: {
        temperature: 0.1, // Very low for math accuracy
        maxTokens: 2500,
        model: 'gpt-4', // Use best model for math
      },
    });

    return this.parseAnalysisResponse(response.content, solution);
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(
    problem: string,
    solution: string,
    correctAnswer?: string
  ) {
    const systemPrompt = `Bạn là giáo viên Toán học chuyên nghiệp. Nhiệm vụ: phân tích từng bước giải toán của học sinh.

Phân tích theo:
1. **Phương pháp**: Học sinh chọn phương pháp gì? Có phù hợp không?
2. **Các bước giải**: Kiểm tra từng bước, tìm lỗi sai
3. **Tính toán**: Độ chính xác của các phép tính
4. **Trình bày**: Bài làm rõ ràng, có logic không?
5. **Kết quả**: Đáp số đúng hay sai? Có đơn vị không?

Hãy:
- Chỉ ra chính xác lỗi ở bước nào
- Phân biệt lỗi nhỏ (minor) vs lỗi nghiêm trọng (major)
- Đánh giá khách quan, cho điểm từng phần
- Đưa ra gợi ý cụ thể để sửa lỗi`;

    const userPrompt = `Đề bài: ${problem}

Bài làm của học sinh:
${solution}

${correctAnswer ? `Đáp án đúng: ${correctAnswer}` : ''}

Hãy phân tích chi tiết từng bước giải của học sinh.`;

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * Parse analysis response
   */
  private parseAnalysisResponse(
    response: string,
    solution: string
  ): MathProblemAnalysis {
    // Extract problem type and difficulty
    const problemType = this.extractProblemType(response);
    const difficulty = this.extractDifficulty(response);
    const requiredConcepts = this.extractConcepts(response);

    // Extract method analysis
    const method = {
      chosen: this.extractMethod(response),
      appropriate: !response.includes('inappropriate') && !response.includes('không phù hợp'),
      efficiency: this.extractScore(response, ['efficiency', 'hiệu quả']) || 7,
      alternatives: this.extractAlternatives(response),
      comment: this.extractComment(response, ['method', 'phương pháp']),
    };

    // Extract steps
    const steps = this.extractSteps(response, solution);
    const totalSteps = steps.length;
    const correctSteps = steps.filter(s => s.isCorrect).length;
    const criticalErrors = this.extractCriticalErrors(response);

    // Extract calculation accuracy
    const calculations = this.extractCalculationInfo(response, steps);

    // Extract presentation
    const presentation = {
      clarity: this.extractScore(response, ['clarity', 'rõ ràng']) || 7,
      organization: this.extractScore(response, ['organization', 'trình bày']) || 7,
      notation: {
        correct: !response.includes('notation error') && !response.includes('lỗi ký hiệu'),
        errors: this.extractNotationErrors(response),
      },
      diagrams: {
        present: response.includes('diagram') || response.includes('hình vẽ'),
        helpful: response.includes('helpful diagram') || response.includes('hình vẽ tốt'),
        quality: this.extractScore(response, ['diagram quality', 'chất lượng hình vẽ']) || 0,
      },
    };

    // Extract final answer
    const finalAnswer = {
      present: response.includes('final answer') || response.includes('đáp số'),
      correct: response.includes('correct answer') || response.includes('đáp số đúng'),
      hasUnits: response.includes('units') || response.includes('đơn vị'),
      unitsCorrect: !response.includes('wrong units') && !response.includes('sai đơn vị'),
      reasonableness: this.extractScore(response, ['reasonableness', 'hợp lý']) || 7,
      value: this.extractFinalAnswerValue(response),
    };

    return {
      problemType,
      difficulty,
      requiredConcepts,
      method,
      steps,
      totalSteps,
      correctSteps,
      criticalErrors,
      calculations,
      presentation,
      finalAnswer,
      strengths: this.extractList(response, ['strengths', 'điểm mạnh', 'đúng']),
      weaknesses: this.extractList(response, ['weaknesses', 'điểm yếu', 'sai']),
      misconceptions: this.extractList(response, ['misconceptions', 'hiểu lầm']),
      recommendations: this.extractList(response, ['recommendations', 'gợi ý']),
    };
  }

  /**
   * Score the solution based on analysis
   */
  private scoreSolution(
    analysis: MathProblemAnalysis,
    rubric: GradingRubric
  ): Omit<MathGradingResult, 'analysis' | 'feedback' | 'partialCredit'> {
    // Method score (30%)
    let methodScore = analysis.method.appropriate ? 8 : 4;
    methodScore = (methodScore + analysis.method.efficiency) / 2;

    // Calculation score (40%)
    const calcAccuracy = analysis.calculations.total > 0
      ? (analysis.calculations.correct / analysis.calculations.total) * 10
      : 7;
    let calculationScore = calcAccuracy;
    // Deduct for major errors
    calculationScore -= analysis.calculations.majorErrors * 1.5;
    // Deduct for minor errors
    calculationScore -= analysis.calculations.minorErrors * 0.5;
    calculationScore = Math.max(0, calculationScore);

    // Presentation score (20%)
    let presentationScore = (analysis.presentation.clarity + analysis.presentation.organization) / 2;
    if (analysis.presentation.diagrams.present && analysis.presentation.diagrams.helpful) {
      presentationScore += 1; // Bonus for good diagrams
    }
    presentationScore = Math.min(10, presentationScore);

    // Result score (10%)
    let resultScore = 0;
    if (analysis.finalAnswer.present) resultScore += 2;
    if (analysis.finalAnswer.correct) resultScore += 6;
    if (analysis.finalAnswer.hasUnits) resultScore += 1;
    if (analysis.finalAnswer.unitsCorrect) resultScore += 1;

    // Calculate weighted total
    const totalScore = (
      methodScore * 0.3 +
      calculationScore * 0.4 +
      presentationScore * 0.2 +
      resultScore * 0.1
    );

    const grade = this.scoreToGrade(totalScore);
    const percentage = (totalScore / 10) * 100;

    return {
      score: Math.round(totalScore * 10) / 10, // Round to 1 decimal
      percentage,
      grade,
      criteriaScores: {
        method: Math.round(methodScore * 10) / 10,
        calculation: Math.round(calculationScore * 10) / 10,
        presentation: Math.round(presentationScore * 10) / 10,
        result: Math.round(resultScore * 10) / 10,
      },
      confidence: this.calculateConfidence(analysis),
      needsHumanReview: false,
    };
  }

  /**
   * Generate detailed feedback
   */
  private generateFeedback(
    analysis: MathProblemAnalysis,
    scoring: Omit<MathGradingResult, 'analysis' | 'feedback' | 'partialCredit'>,
    problem: string
  ) {
    const correctParts: string[] = [];
    const errors: string[] = [];
    const hints: string[] = [];

    // Analyze method
    if (analysis.method.appropriate) {
      correctParts.push(`Chọn đúng phương pháp: ${analysis.method.chosen}`);
    } else {
      errors.push(`Phương pháp chưa phù hợp. Nên dùng: ${analysis.method.alternatives.join(' hoặc ')}`);
    }

    // Analyze steps
    const correctStepNumbers = analysis.steps
      .filter(s => s.isCorrect)
      .map(s => `Bước ${s.stepNumber}`)
      .join(', ');

    if (correctStepNumbers) {
      correctParts.push(`Làm đúng: ${correctStepNumbers}`);
    }

    // Collect errors from steps
    for (const step of analysis.steps) {
      if (!step.isCorrect && step.error) {
        errors.push(`Bước ${step.stepNumber}: ${step.error}`);
        if (step.comment) {
          hints.push(`Bước ${step.stepNumber} - ${step.comment}`);
        }
      }
    }

    // Add critical errors
    for (const criticalError of analysis.criticalErrors) {
      errors.push(`⚠️ Lỗi nghiêm trọng: ${criticalError}`);
    }

    // Add calculation errors
    for (const calcError of analysis.calculations.examples) {
      if (calcError.impact === 'major') {
        errors.push(
          `Bước ${calcError.step}: Tính sai ${calcError.actual}, đáng lẽ là ${calcError.expected}`
        );
      }
    }

    // Add final answer feedback
    if (!analysis.finalAnswer.present) {
      errors.push('Thiếu đáp số cuối cùng');
      hints.push('Luôn viết rõ đáp số khi hoàn thành bài toán');
    } else if (!analysis.finalAnswer.correct) {
      errors.push('Đáp số sai');
      hints.push('Kiểm tra lại các bước tính toán');
    } else {
      correctParts.push('Đáp số đúng');
    }

    if (analysis.finalAnswer.present && !analysis.finalAnswer.hasUnits) {
      errors.push('Thiếu đơn vị');
      hints.push('Luôn ghi rõ đơn vị cho đáp số');
    }

    // Add recommendations
    hints.push(...analysis.recommendations);

    const summary = this.generateSummary(scoring.score, analysis);

    return {
      summary,
      correctParts,
      errors,
      hints,
    };
  }

  /**
   * Generate summary
   */
  private generateSummary(score: number, analysis: MathProblemAnalysis): string {
    const accuracy = (analysis.correctSteps / analysis.totalSteps) * 100;

    if (score >= 9) {
      return `Xuất sắc! Làm đúng ${analysis.correctSteps}/${analysis.totalSteps} bước (${accuracy.toFixed(0)}%).`;
    } else if (score >= 7) {
      return `Tốt! Làm đúng ${analysis.correctSteps}/${analysis.totalSteps} bước. Sửa ${analysis.criticalErrors.length} lỗi để đạt điểm cao hơn.`;
    } else if (score >= 5) {
      return `Đạt yêu cầu. Làm đúng ${analysis.correctSteps}/${analysis.totalSteps} bước. Cần cải thiện ${analysis.totalSteps - analysis.correctSteps} bước.`;
    } else {
      return `Cần ôn lại. Có ${analysis.criticalErrors.length} lỗi nghiêm trọng và ${analysis.calculations.majorErrors} lỗi tính toán.`;
    }
  }

  /**
   * Calculate partial credit
   */
  private calculatePartialCredit(analysis: MathProblemAnalysis) {
    const awarded = analysis.correctSteps > 0 && !analysis.finalAnswer.correct;

    if (!awarded) {
      return {
        awarded: false,
        reason: analysis.finalAnswer.correct
          ? 'Đáp án đúng hoàn toàn'
          : 'Không có bước nào đúng',
        points: 0,
      };
    }

    const points = (analysis.correctSteps / analysis.totalSteps) * 7; // Max 7 points for partial

    return {
      awarded: true,
      reason: `Làm đúng ${analysis.correctSteps}/${analysis.totalSteps} bước`,
      points: Math.round(points * 10) / 10,
    };
  }

  /**
   * Helper methods
   */
  private extractSteps(response: string, solution: string): MathStep[] {
    const steps: MathStep[] = [];

    // Try to find step markers
    const stepRegex = /(?:step|bước)\s*(\d+)[:\s]*([^\n]+)/gi;
    let match;
    let stepNumber = 1;

    while ((match = stepRegex.exec(response)) !== null) {
      const description = match[2].trim();
      const isCorrect = !description.toLowerCase().includes('error') &&
                       !description.toLowerCase().includes('wrong') &&
                       !description.toLowerCase().includes('sai') &&
                       !description.toLowerCase().includes('lỗi');

      steps.push({
        stepNumber: parseInt(match[1]) || stepNumber,
        description,
        isCorrect,
        error: isCorrect ? undefined : this.extractStepError(description),
        comment: this.extractStepComment(description),
      });

      stepNumber++;
    }

    // If no steps found, estimate from solution
    if (steps.length === 0) {
      const lines = solution.split('\n').filter(line => line.trim().length > 0);
      const estimatedSteps = Math.max(3, Math.min(lines.length, 10));

      for (let i = 1; i <= estimatedSteps; i++) {
        steps.push({
          stepNumber: i,
          description: `Step ${i}`,
          isCorrect: true, // Assume correct if not analyzed
          comment: '',
        });
      }
    }

    return steps;
  }

  private extractStepError(description: string): string {
    const errorMatch = description.match(/(?:error|lỗi|wrong|sai)[:\s]*([^.!?]+)/i);
    return errorMatch ? errorMatch[1].trim() : 'Unknown error';
  }

  private extractStepComment(description: string): string {
    const commentMatch = description.match(/(?:note|hint|gợi ý)[:\s]*([^.!?]+)/i);
    return commentMatch ? commentMatch[1].trim() : '';
  }

  private extractCalculationInfo(response: string, steps: MathStep[]) {
    const total = steps.length;
    const correct = steps.filter(s => s.isCorrect).length;

    // Extract error counts
    const majorErrorMatch = response.match(/(\d+)\s*major\s*errors?/i) ||
                           response.match(/(\d+)\s*lỗi\s*nghiêm\s*trọng/i);
    const majorErrors = majorErrorMatch ? parseInt(majorErrorMatch[1]) : 0;

    const minorErrorMatch = response.match(/(\d+)\s*minor\s*errors?/i) ||
                           response.match(/(\d+)\s*lỗi\s*nhỏ/i);
    const minorErrors = minorErrorMatch ? parseInt(minorErrorMatch[1]) : 0;

    return {
      total,
      correct,
      minorErrors,
      majorErrors,
      examples: [], // Would need more sophisticated parsing
    };
  }

  private extractProblemType(text: string): string {
    const types = ['algebra', 'geometry', 'calculus', 'trigonometry', 'statistics'];
    for (const type of types) {
      if (text.toLowerCase().includes(type)) return type;
    }
    return 'general';
  }

  private extractDifficulty(text: string): 'easy' | 'medium' | 'hard' | 'very-hard' {
    if (text.includes('very hard') || text.includes('rất khó')) return 'very-hard';
    if (text.includes('hard') || text.includes('khó')) return 'hard';
    if (text.includes('medium') || text.includes('trung bình')) return 'medium';
    return 'easy';
  }

  private extractConcepts(text: string): string[] {
    const concepts: string[] = [];
    const conceptKeywords = ['equation', 'formula', 'theorem', 'định lý', 'công thức'];

    for (const keyword of conceptKeywords) {
      const regex = new RegExp(`${keyword}[:\\s]*([^,.]+)`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        concepts.push(match[1].trim());
      }
    }

    return concepts.slice(0, 5);
  }

  private extractMethod(text: string): string {
    const methodMatch = text.match(/(?:method|phương pháp)[:\\s]*([^,.]+)/i);
    return methodMatch ? methodMatch[1].trim() : 'Unknown method';
  }

  private extractAlternatives(text: string): string[] {
    const altMatch = text.match(/(?:alternative|thay thế)[:\\s]*([^.]+)/i);
    if (!altMatch) return [];

    return altMatch[1].split(/,|hoặc/).map(s => s.trim());
  }

  private extractCriticalErrors(text: string): string[] {
    const errors: string[] = [];
    const regex = /critical error[:\s]*([^.!?]+)/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      errors.push(match[1].trim());
    }

    return errors;
  }

  private extractNotationErrors(text: string): string[] {
    const errors: string[] = [];
    const regex = /notation error[:\s]*([^.!?]+)/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      errors.push(match[1].trim());
    }

    return errors;
  }

  private extractFinalAnswerValue(text: string): string | undefined {
    const answerMatch = text.match(/final answer[:\s]*([^.\n]+)/i) ||
                       text.match(/đáp số[:\s]*([^.\n]+)/i);
    return answerMatch ? answerMatch[1].trim() : undefined;
  }

  private extractScore(text: string, keywords: string[]): number | null {
    for (const keyword of keywords) {
      const patterns = [
        new RegExp(`${keyword}[:\\s]*(\\d+(?:\\.\\d+)?)[/\\s]?10`, 'i'),
        new RegExp(`${keyword}[^0-9]*(\\d+(?:\\.\\d+)?)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const score = parseFloat(match[1]);
          if (score >= 0 && score <= 10) {
            return score;
          }
        }
      }
    }
    return null;
  }

  private extractComment(text: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]*([^\\n]+)`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }

  private extractList(text: string, headers: string[]): string[] {
    for (const header of headers) {
      const regex = new RegExp(`${header}[:\\s]*\\n([\\s\\S]*?)(?=\\n[A-Z]|$)`, 'i');
      const match = text.match(regex);

      if (match && match[1]) {
        return match[1]
          .split(/\n/)
          .map(line => line.trim())
          .filter(line => line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line))
          .map(line => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
          .filter(line => line.length > 0);
      }
    }
    return [];
  }

  private scoreToGrade(score: number): string {
    if (score >= 9) return 'A';
    if (score >= 7) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3) return 'D';
    return 'F';
  }

  private calculateConfidence(analysis: MathProblemAnalysis): number {
    let confidence = 1.0;

    // Reduce if too few steps analyzed
    if (analysis.totalSteps < 3) confidence -= 0.2;

    // Reduce if no final answer
    if (!analysis.finalAnswer.present) confidence -= 0.2;

    // Reduce if critical errors
    if (analysis.criticalErrors.length > 0) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private shouldReview(result: MathGradingResult): boolean {
    if (result.confidence < 0.7) return true;
    if (result.score >= 9.5 || result.score <= 2) return true;
    if (result.analysis.criticalErrors.length > 2) return true;
    if (result.analysis.calculations.majorErrors > 3) return true;
    return false;
  }

  private getReviewReason(result: MathGradingResult): string {
    if (result.confidence < 0.7) {
      return `Độ tin cậy thấp (${(result.confidence * 100).toFixed(0)}%)`;
    }
    if (result.score >= 9.5) return 'Điểm rất cao, cần xác nhận';
    if (result.score <= 2) return 'Điểm rất thấp, cần xác nhận';
    if (result.analysis.criticalErrors.length > 2) {
      return `Quá nhiều lỗi nghiêm trọng (${result.analysis.criticalErrors.length})`;
    }
    return 'Cần xem xét thêm';
  }
}

/**
 * Create math grader instance
 */
export function createMathGrader(aiService: AIServiceOrchestrator): MathGrader {
  return new MathGrader(aiService);
}
