/**
 * Grading Validation System
 * Validates AI grading results for accuracy and consistency
 */

import { GradingResult } from './smart-grading';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  recommendations: string[];
  needsHumanReview: boolean;
}

export interface ValidationIssue {
  type: 'score_mismatch' | 'missing_feedback' | 'low_confidence' | 'inconsistent_scoring';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedCriterion?: string;
}

export interface GradingConsistencyCheck {
  averageScore: number;
  standardDeviation: number;
  outliers: string[];
  consistencyScore: number; // 0-1
}

export class GradingValidator {
  private confidenceThreshold = 0.8;
  private maxScoreVariance = 2.0; // Max acceptable deviation from expected

  /**
   * Validate a single grading result
   */
  validate(
    result: GradingResult,
    question: string,
    studentAnswer: string
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    let isValid = true;

    // 1. Check confidence level
    if (result.confidence < this.confidenceThreshold) {
      issues.push({
        type: 'low_confidence',
        severity: 'high',
        message: `Low confidence score: ${result.confidence.toFixed(2)} (threshold: ${this.confidenceThreshold})`,
      });
      isValid = false;
    }

    // 2. Validate score is within bounds
    if (result.score < 0 || result.score > result.maxScore) {
      issues.push({
        type: 'score_mismatch',
        severity: 'high',
        message: `Score ${result.score} is out of bounds [0, ${result.maxScore}]`,
      });
      isValid = false;
    }

    // 3. Check for empty feedback
    if (!result.feedback || result.feedback.trim().length < 10) {
      issues.push({
        type: 'missing_feedback',
        severity: 'medium',
        message: 'Feedback is missing or too short',
      });
    }

    // 4. Validate detailed breakdown consistency
    if (result.detailedBreakdown && result.detailedBreakdown.length > 0) {
      const breakdownTotal = result.detailedBreakdown.reduce(
        (sum, item) => sum + item.score,
        0
      );

      if (Math.abs(breakdownTotal - result.score) > 0.5) {
        issues.push({
          type: 'inconsistent_scoring',
          severity: 'high',
          message: `Breakdown total (${breakdownTotal}) doesn't match final score (${result.score})`,
        });
        isValid = false;
      }
    }

    // 5. Check for empty student answer edge case
    if (studentAnswer.trim().length === 0 && result.score > 0) {
      issues.push({
        type: 'score_mismatch',
        severity: 'high',
        message: 'Empty answer received non-zero score',
      });
      isValid = false;
    }

    // 6. Validate strengths and improvements
    if (result.score > result.maxScore * 0.5 && result.strengths.length === 0) {
      issues.push({
        type: 'missing_feedback',
        severity: 'low',
        message: 'Good score but no strengths identified',
      });
    }

    if (result.score < result.maxScore * 0.8 && result.improvements.length === 0) {
      issues.push({
        type: 'missing_feedback',
        severity: 'low',
        message: 'Low score but no improvements suggested',
      });
    }

    const needsHumanReview =
      result.confidence < 0.7 ||
      issues.some(i => i.severity === 'high') ||
      result.score === 0;

    return {
      isValid,
      confidence: result.confidence,
      issues,
      recommendations: this.generateRecommendations(issues, result),
      needsHumanReview,
    };
  }

  /**
   * Check grading consistency across multiple results
   */
  checkConsistency(
    results: Array<{ studentId: string; result: GradingResult }>
  ): GradingConsistencyCheck {
    const scores = results.map(r => r.result.percentage);

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score - averageScore, 2);
    }, 0) / scores.length;

    const standardDeviation = Math.sqrt(variance);

    // Identify outliers (> 2 standard deviations from mean)
    const outliers = results
      .filter(r => Math.abs(r.result.percentage - averageScore) > 2 * standardDeviation)
      .map(r => r.studentId);

    // Consistency score: higher is better (lower std dev = more consistent)
    // Normalize to 0-1 scale (assuming max std dev of 30)
    const consistencyScore = Math.max(0, 1 - standardDeviation / 30);

    return {
      averageScore,
      standardDeviation,
      outliers,
      consistencyScore,
    };
  }

  /**
   * Compare two grading attempts (e.g., AI vs human)
   */
  compareGradings(
    aiGrading: GradingResult,
    humanGrading: GradingResult
  ): {
    scoreDifference: number;
    agreementLevel: 'high' | 'medium' | 'low';
    feedbackSimilarity: number;
  } {
    const scoreDifference = Math.abs(aiGrading.score - humanGrading.score);

    let agreementLevel: 'high' | 'medium' | 'low';
    if (scoreDifference <= 1) {
      agreementLevel = 'high';
    } else if (scoreDifference <= 2) {
      agreementLevel = 'medium';
    } else {
      agreementLevel = 'low';
    }

    // Simple feedback similarity (could be enhanced with NLP)
    const feedbackSimilarity = this.calculateTextSimilarity(
      aiGrading.feedback,
      humanGrading.feedback
    );

    return {
      scoreDifference,
      agreementLevel,
      feedbackSimilarity,
    };
  }

  /**
   * Generate recommendations based on validation issues
   */
  private generateRecommendations(
    issues: ValidationIssue[],
    result: GradingResult
  ): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.type === 'low_confidence')) {
      recommendations.push('Request human review for verification');
      recommendations.push('Consider using a more specific rubric');
    }

    if (issues.some(i => i.type === 'missing_feedback')) {
      recommendations.push('Regenerate grading with more detailed prompts');
      recommendations.push('Add specific examples to the rubric');
    }

    if (issues.some(i => i.type === 'inconsistent_scoring')) {
      recommendations.push('Review rubric criteria weights');
      recommendations.push('Ensure breakdown totals match final score');
    }

    if (result.score === result.maxScore && result.improvements.length === 0) {
      recommendations.push('Perfect scores should still include growth suggestions');
    }

    return recommendations;
  }

  /**
   * Calculate simple text similarity (Jaccard similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calibrate grading based on historical data
   */
  calibrate(
    historicalComparisons: Array<{
      aiScore: number;
      humanScore: number;
    }>
  ): {
    bias: number;
    adjustmentFactor: number;
    recommendation: string;
  } {
    const differences = historicalComparisons.map(
      c => c.aiScore - c.humanScore
    );

    const bias = differences.reduce((a, b) => a + b, 0) / differences.length;

    // If AI consistently scores higher/lower, suggest adjustment
    const adjustmentFactor = -bias / 10; // Normalize to small adjustment

    let recommendation = 'AI grading is well-calibrated';
    if (Math.abs(bias) > 1) {
      recommendation = `AI tends to score ${bias > 0 ? 'higher' : 'lower'} by ${Math.abs(bias).toFixed(1)} points on average. Consider applying adjustment factor.`;
    }

    return {
      bias,
      adjustmentFactor,
      recommendation,
    };
  }
}

/**
 * Create default validator
 */
export function createGradingValidator(config?: {
  confidenceThreshold?: number;
  maxScoreVariance?: number;
}): GradingValidator {
  const validator = new GradingValidator();
  if (config?.confidenceThreshold) {
    validator['confidenceThreshold'] = config.confidenceThreshold;
  }
  if (config?.maxScoreVariance) {
    validator['maxScoreVariance'] = config.maxScoreVariance;
  }
  return validator;
}
