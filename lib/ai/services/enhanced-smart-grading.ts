/**
 * Enhanced Smart Grading Service
 * Advanced AI grading with prompts, rubrics, and multi-criteria assessment
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { AIMessage } from '../providers/base-provider';
import { buildGradingPrompt, extractScore, validateGradingResponse } from '../prompts/grading-prompts';
import {
  GradingRubric,
  getRubric,
  calculateWeightedScore,
  getDescriptor,
  validateRubricScore
} from '../rubrics/grading-rubrics';

/**
 * Enhanced Grading Request
 */
export interface EnhancedGradingRequest {
  submission: string;
  subject: string; // vietnamese, math, english, physics, chemistry, biology
  grade?: string; // 6, 7, 8, 9, 10, 11, 12
  assignmentType?: 'essay' | 'problem' | 'short-answer';
  additionalContext?: string; // Đề bài, yêu cầu cụ thể
  rubricId?: string; // Custom rubric ID nếu có
}

/**
 * Enhanced Grading Result
 */
export interface EnhancedGradingResult {
  // Overall score
  totalScore: number; // 0-10
  percentage: number; // 0-100%
  grade: string; // A, B, C, D, F
  passed: boolean;

  // Detailed breakdown by criteria
  criteriaScores: Array<{
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    descriptor: string;
    comment: string;
  }>;

  // Feedback
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  overallFeedback: string;

  // Metadata
  confidence: number; // 0-1
  needsHumanReview: boolean;
  reviewReason?: string;
  gradingTime: number; // ms

  // Rubric used
  rubricUsed: {
    id: string;
    name: string;
    subject: string;
  };
}

/**
 * Batch Grading Request
 */
export interface BatchGradingRequest {
  submissions: Array<{
    id: string;
    studentId: string;
    studentName?: string;
    submission: string;
  }>;
  subject: string;
  grade?: string;
  assignmentType?: 'essay' | 'problem' | 'short-answer';
  additionalContext?: string;
}

/**
 * Batch Grading Result
 */
export interface BatchGradingResult {
  results: Map<string, EnhancedGradingResult>;
  summary: {
    totalSubmissions: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    needsReview: number;
    gradingTime: number; // Total time in ms
  };
}

/**
 * Enhanced Smart Grading Service
 */
export class EnhancedSmartGradingService {
  constructor(private aiService: AIServiceOrchestrator) {}

  /**
   * Grade a single submission with enhanced features
   */
  async gradeSingle(request: EnhancedGradingRequest): Promise<EnhancedGradingResult> {
    const startTime = Date.now();

    try {
      // Get appropriate rubric
      const rubric = getRubric(request.subject, request.grade);

      // Build grading prompt
      const { system, user } = buildGradingPrompt(
        request.subject,
        request.submission,
        request.additionalContext
      );

      // Call AI service
      const messages: AIMessage[] = [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ];

      const response = await this.aiService.complete({
        messages,
        options: {
          temperature: 0.2, // Very low for consistent grading
          maxTokens: 2000,
          model: 'gpt-4', // Use best model for grading
        },
      });

      // Parse and validate response
      const aiResponse = response.content;
      const validation = validateGradingResponse(aiResponse);

      if (!validation.isValid) {
        console.warn('Invalid grading response:', validation.errors);
        return this.createFallbackResult(rubric, startTime, validation.errors);
      }

      // Extract score and feedback
      const result = this.parseGradingResponse(aiResponse, rubric, startTime);

      // Determine if needs human review
      result.needsHumanReview = this.shouldRequestHumanReview(result);
      if (result.needsHumanReview) {
        result.reviewReason = this.getReviewReason(result);
      }

      return result;

    } catch (error) {
      console.error('Grading error:', error);
      throw new Error(`Failed to grade submission: ${error.message}`);
    }
  }

  /**
   * Grade multiple submissions in batch
   */
  async gradeBatch(request: BatchGradingRequest): Promise<BatchGradingResult> {
    const startTime = Date.now();
    const results = new Map<string, EnhancedGradingResult>();

    // Process in parallel batches of 5
    const batchSize = 5;
    const batches: typeof request.submissions[] = [];

    for (let i = 0; i < request.submissions.length; i += batchSize) {
      batches.push(request.submissions.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(submission =>
          this.gradeSingle({
            submission: submission.submission,
            subject: request.subject,
            grade: request.grade,
            assignmentType: request.assignmentType,
            additionalContext: request.additionalContext,
          }).then(result => ({ id: submission.id, result }))
        )
      );

      for (const { id, result } of batchResults) {
        results.set(id, result);
      }
    }

    // Calculate summary statistics
    const scores = Array.from(results.values()).map(r => r.totalScore);
    const summary = {
      totalSubmissions: request.submissions.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      passRate: (scores.filter(s => s >= 5).length / scores.length) * 100,
      needsReview: Array.from(results.values()).filter(r => r.needsHumanReview).length,
      gradingTime: Date.now() - startTime,
    };

    return { results, summary };
  }

  /**
   * Grade with comparison to sample answers
   */
  async gradeWithSamples(
    submission: string,
    subject: string,
    sampleGrades: Array<{ submission: string; score: number; feedback: string }>
  ): Promise<EnhancedGradingResult> {
    // Build context with sample grades
    const samplesContext = sampleGrades
      .map((sample, i) =>
        `Mẫu ${i + 1} (Điểm ${sample.score}/10):\n${sample.submission}\nNhận xét: ${sample.feedback}`
      )
      .join('\n\n');

    const additionalContext = `Tham khảo các bài mẫu sau để chấm điểm nhất quán:\n\n${samplesContext}`;

    return this.gradeSingle({
      submission,
      subject,
      additionalContext,
    });
  }

  /**
   * Parse AI grading response
   */
  private parseGradingResponse(
    response: string,
    rubric: GradingRubric,
    startTime: number
  ): EnhancedGradingResult {
    // Extract overall score
    const totalScore = extractScore(response) || 0;

    // Extract criteria scores from response
    const criteriaScores = this.extractCriteriaScores(response, rubric);

    // Calculate weighted score if criteria scores available
    const calculatedScore = criteriaScores.length > 0
      ? calculateWeightedScore(rubric, this.criteriaScoresToObject(criteriaScores))
      : totalScore;

    // Extract feedback sections
    const strengths = this.extractSection(response, ['Điểm mạnh', 'Strengths']);
    const improvements = this.extractSection(response, ['Cần cải thiện', 'Areas for Improvement', 'Improvements']);
    const suggestions = this.extractSection(response, ['Gợi ý', 'Suggestions']);

    // Determine grade letter
    const grade = this.scoreToGrade(calculatedScore);

    // Calculate confidence based on response quality
    const confidence = this.calculateConfidence(response, criteriaScores);

    return {
      totalScore: calculatedScore,
      percentage: (calculatedScore / rubric.totalScore) * 100,
      grade,
      passed: calculatedScore >= rubric.passingScore,
      criteriaScores,
      strengths,
      improvements,
      suggestions,
      overallFeedback: this.extractOverallFeedback(response),
      confidence,
      needsHumanReview: false, // Will be set later
      gradingTime: Date.now() - startTime,
      rubricUsed: {
        id: rubric.id,
        name: rubric.name,
        subject: rubric.subject,
      },
    };
  }

  /**
   * Extract criteria scores from AI response
   */
  private extractCriteriaScores(response: string, rubric: GradingRubric) {
    const criteriaScores: EnhancedGradingResult['criteriaScores'] = [];

    for (const criterion of rubric.criteria) {
      // Try to find score for this criterion
      const patterns = [
        new RegExp(`${criterion.name}:\\s*(\\d+(?:\\.\\d+)?)\\/10`, 'i'),
        new RegExp(`${criterion.name}.*?(\\d+(?:\\.\\d+)?)\\/10`, 'i'),
      ];

      let score = 0;
      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
          score = parseFloat(match[1]);
          break;
        }
      }

      const descriptor = getDescriptor(criterion, score);

      criteriaScores.push({
        name: criterion.name,
        score,
        maxScore: criterion.maxScore,
        weight: criterion.weight,
        descriptor,
        comment: this.extractCriterionComment(response, criterion.name),
      });
    }

    return criteriaScores;
  }

  /**
   * Extract feedback section
   */
  private extractSection(response: string, headers: string[]): string[] {
    for (const header of headers) {
      const regex = new RegExp(`\\*\\*${header}:?\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i');
      const match = response.match(regex);

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

  /**
   * Extract criterion-specific comment
   */
  private extractCriterionComment(response: string, criterionName: string): string {
    const regex = new RegExp(`${criterionName}.*?-\\s*([^\\n]+)`, 'i');
    const match = response.match(regex);
    return match && match[1] ? match[1].trim() : '';
  }

  /**
   * Extract overall feedback
   */
  private extractOverallFeedback(response: string): string {
    // Try to find a summary or overall comment
    const patterns = [
      /Tổng kết:?\s*([^\n]+)/i,
      /Nhận xét chung:?\s*([^\n]+)/i,
      /Overall:?\s*([^\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return response.substring(0, 200) + '...';
  }

  /**
   * Convert criteria scores array to object
   */
  private criteriaScoresToObject(criteriaScores: EnhancedGradingResult['criteriaScores']): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const cs of criteriaScores) {
      obj[cs.name] = cs.score;
    }
    return obj;
  }

  /**
   * Convert score to letter grade
   */
  private scoreToGrade(score: number): string {
    if (score >= 9) return 'A';
    if (score >= 7) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3) return 'D';
    return 'F';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(response: string, criteriaScores: any[]): number {
    let confidence = 1.0;

    // Reduce confidence if response is too short
    if (response.length < 200) {
      confidence -= 0.3;
    }

    // Reduce confidence if missing criteria scores
    if (criteriaScores.length === 0) {
      confidence -= 0.2;
    }

    // Reduce confidence if feedback sections missing
    if (!response.includes('Điểm mạnh') && !response.includes('Strengths')) {
      confidence -= 0.1;
    }

    if (!response.includes('Cần cải thiện') && !response.includes('Improvement')) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine if submission needs human review
   */
  private shouldRequestHumanReview(result: EnhancedGradingResult): boolean {
    // Low confidence
    if (result.confidence < 0.7) return true;

    // Edge scores (close to pass/fail boundary)
    if (Math.abs(result.totalScore - 5) < 0.5) return true;

    // Very high or very low scores
    if (result.totalScore >= 9.5 || result.totalScore <= 2) return true;

    return false;
  }

  /**
   * Get reason for human review
   */
  private getReviewReason(result: EnhancedGradingResult): string {
    if (result.confidence < 0.7) {
      return `Độ tin cậy thấp (${(result.confidence * 100).toFixed(0)}%)`;
    }

    if (Math.abs(result.totalScore - 5) < 0.5) {
      return 'Điểm gần ngưỡng đạt/không đạt';
    }

    if (result.totalScore >= 9.5) {
      return 'Điểm rất cao, cần xác nhận';
    }

    if (result.totalScore <= 2) {
      return 'Điểm rất thấp, cần xác nhận';
    }

    return 'Cần xem xét thêm';
  }

  /**
   * Create fallback result when AI response is invalid
   */
  private createFallbackResult(
    rubric: GradingRubric,
    startTime: number,
    errors: string[]
  ): EnhancedGradingResult {
    return {
      totalScore: 0,
      percentage: 0,
      grade: 'F',
      passed: false,
      criteriaScores: [],
      strengths: [],
      improvements: ['Không thể chấm tự động. Cần chấm thủ công.'],
      suggestions: [],
      overallFeedback: `Lỗi khi chấm tự động: ${errors.join(', ')}`,
      confidence: 0,
      needsHumanReview: true,
      reviewReason: 'Lỗi hệ thống chấm tự động',
      gradingTime: Date.now() - startTime,
      rubricUsed: {
        id: rubric.id,
        name: rubric.name,
        subject: rubric.subject,
      },
    };
  }
}

/**
 * Create enhanced grading service instance
 */
export function createEnhancedGradingService(
  aiService: AIServiceOrchestrator
): EnhancedSmartGradingService {
  return new EnhancedSmartGradingService(aiService);
}
