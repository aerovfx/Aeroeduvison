/**
 * Enhanced Grading Validation System
 * Advanced validation with human comparison, consistency checking, and outlier detection
 */

import { EnhancedGradingResult } from './enhanced-smart-grading';

/**
 * Human Grade for Comparison
 */
export interface HumanGrade {
  submissionId: string;
  teacherId: string;
  teacherName: string;
  score: number;
  criteriaScores?: Record<string, number>;
  feedback: string;
  gradedAt: Date;
  timeSpent?: number; // seconds
}

/**
 * AI vs Human Comparison Result
 */
export interface HumanAIComparison {
  submissionId: string;

  // Score Comparison
  aiScore: number;
  humanScore: number;
  scoreDifference: number;
  percentageDifference: number;

  // Agreement Level
  agreement: {
    overall: 'perfect' | 'high' | 'moderate' | 'low' | 'poor';
    score: number; // 0-1
    criteriaAgreement?: Record<string, number>; // per criterion
  };

  // Statistical Measures
  absoluteError: number;
  squaredError: number;
  withinTolerance: boolean; // Within acceptable range

  // Feedback Comparison
  feedback: {
    aiLength: number;
    humanLength: number;
    similarity: number; // 0-1, Jaccard or cosine
    keyPointsMatch: number; // 0-1
    toneMatch: 'similar' | 'different';
  };

  // Grade Level Match
  gradeLevelMatch: boolean; // Both A, both B, etc.

  // Review Status
  needsReview: boolean;
  reviewReason?: string;
}

/**
 * Consistency Analysis Result
 */
export interface ConsistencyReport {
  // Basic Statistics
  statistics: {
    totalSubmissions: number;
    averageScore: number;
    median: number;
    mode: number;
    standardDeviation: number;
    variance: number;
    range: { min: number; max: number };
  };

  // Distribution
  distribution: {
    aGrades: number;
    bGrades: number;
    cGrades: number;
    dGrades: number;
    fGrades: number;
    histogram: Array<{ range: string; count: number }>;
  };

  // Consistency Metrics
  consistency: {
    score: number; // 0-1, higher is more consistent
    coefficientOfVariation: number; // CV = std/mean
    interQuartileRange: number;
    isConsistent: boolean; // CV < 0.3
  };

  // Similar Submissions
  similarityGroups: Array<{
    submissions: string[];
    averageScore: number;
    scoreVariance: number;
    isConsistent: boolean;
  }>;

  // Outliers
  outliers: string[];
  outlierDetails: Array<{
    submissionId: string;
    score: number;
    zScore: number;
    reason: string;
  }>;

  // Recommendations
  recommendations: string[];
}

/**
 * Outlier Detection Result
 */
export interface OutlierAnalysis {
  isOutlier: boolean;
  outlierType?: 'high' | 'low' | 'inconsistent';
  severity: 'minor' | 'moderate' | 'severe';

  // Statistical Measures
  zScore: number; // Standardized score
  modifiedZScore: number; // More robust to outliers
  iqrPosition: 'within' | 'mild' | 'extreme'; // Interquartile range

  // Comparison to Historical Data
  percentile: number; // 0-100
  deviationFromMean: number;
  deviationFromMedian: number;

  // Context
  possibleReasons: string[];
  recommendations: string[];

  // Confidence
  detectionConfidence: number; // 0-1
}

/**
 * Inter-Rater Reliability
 */
export interface InterRaterReliability {
  // Correlation
  pearsonCorrelation: number; // -1 to 1
  spearmanCorrelation: number; // Rank correlation

  // Agreement
  cohensKappa: number; // Agreement for categorical (A,B,C,D,F)
  intraclassCorrelation: number; // ICC for continuous scores

  // Error Metrics
  meanAbsoluteError: number;
  rootMeanSquaredError: number;
  meanAbsolutePercentageError: number;

  // Classification
  agreementLevel: 'excellent' | 'good' | 'moderate' | 'fair' | 'poor';
  passFailAgreement: number; // % agreement on pass/fail

  // Interpretation
  interpretation: string;
  readyForProduction: boolean;
}

/**
 * Validation Configuration
 */
export interface ValidationConfig {
  confidenceThreshold: number; // Default 0.7
  scoreTolerancePoints: number; // Default 1.0
  consistencyThreshold: number; // CV threshold, default 0.3
  outlierZScoreThreshold: number; // Default 2.5
  minimumSampleSize: number; // Default 30
}

/**
 * Enhanced Grading Validator
 */
export class EnhancedGradingValidator {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      confidenceThreshold: config?.confidenceThreshold ?? 0.7,
      scoreTolerancePoints: config?.scoreTolerancePoints ?? 1.0,
      consistencyThreshold: config?.consistencyThreshold ?? 0.3,
      outlierZScoreThreshold: config?.outlierZScoreThreshold ?? 2.5,
      minimumSampleSize: config?.minimumSampleSize ?? 30,
    };
  }

  /**
   * Validate AI grade against human grade
   */
  validateAgainstHuman(
    submissionId: string,
    aiGrade: EnhancedGradingResult,
    humanGrade: HumanGrade
  ): HumanAIComparison {
    const scoreDifference = Math.abs(aiGrade.totalScore - humanGrade.score);
    const percentageDifference = (scoreDifference / humanGrade.score) * 100;

    // Agreement level
    const agreement = this.calculateAgreement(aiGrade, humanGrade);

    // Statistical measures
    const absoluteError = scoreDifference;
    const squaredError = Math.pow(scoreDifference, 2);
    const withinTolerance = scoreDifference <= this.config.scoreTolerancePoints;

    // Feedback comparison
    const feedback = this.compareFeedback(
      aiGrade.overallFeedback,
      humanGrade.feedback
    );

    // Grade level match
    const gradeLevelMatch = aiGrade.grade === this.scoreToGrade(humanGrade.score);

    // Needs review
    const needsReview = !withinTolerance || agreement.score < 0.7;
    const reviewReason = needsReview
      ? `Score difference: ${scoreDifference.toFixed(1)} points (${percentageDifference.toFixed(0)}%)`
      : undefined;

    return {
      submissionId,
      aiScore: aiGrade.totalScore,
      humanScore: humanGrade.score,
      scoreDifference,
      percentageDifference,
      agreement,
      absoluteError,
      squaredError,
      withinTolerance,
      feedback,
      gradeLevelMatch,
      needsReview,
      reviewReason,
    };
  }

  /**
   * Check consistency across multiple AI gradings
   */
  async checkConsistency(
    results: Array<{ submissionId: string; result: EnhancedGradingResult; submission: string }>
  ): Promise<ConsistencyReport> {
    if (results.length === 0) {
      throw new Error('No results to check consistency');
    }

    const scores = results.map(r => r.result.totalScore);

    // Basic statistics
    const statistics = this.calculateStatistics(scores);

    // Distribution
    const distribution = this.calculateDistribution(results);

    // Consistency metrics
    const consistency = this.calculateConsistency(statistics);

    // Find similar submissions
    const similarityGroups = await this.findSimilarSubmissions(results);

    // Outlier detection
    const outlierResults = this.detectOutliers(results, statistics);

    // Recommendations
    const recommendations = this.generateConsistencyRecommendations(
      consistency,
      outlierResults.outliers.length,
      results.length
    );

    return {
      statistics,
      distribution,
      consistency,
      similarityGroups,
      outliers: outlierResults.outliers,
      outlierDetails: outlierResults.details,
      recommendations,
    };
  }

  /**
   * Detect if a result is an outlier
   */
  detectOutlier(
    result: EnhancedGradingResult,
    historicalData: EnhancedGradingResult[]
  ): OutlierAnalysis {
    const scores = historicalData.map(r => r.totalScore);
    const stats = this.calculateStatistics(scores);

    // Z-score
    const zScore = (result.totalScore - stats.averageScore) / stats.standardDeviation;

    // Modified Z-score (more robust)
    const median = stats.median;
    const mad = this.calculateMAD(scores, median);
    const modifiedZScore = 0.6745 * (result.totalScore - median) / mad;

    // IQR position
    const iqrPosition = this.calculateIQRPosition(result.totalScore, scores);

    // Determine outlier status
    const isOutlier =
      Math.abs(zScore) > this.config.outlierZScoreThreshold ||
      Math.abs(modifiedZScore) > 3.5 ||
      iqrPosition === 'extreme';

    const outlierType = zScore > 0 ? 'high' : 'low';

    const severity =
      Math.abs(zScore) > 3 ? 'severe' :
      Math.abs(zScore) > 2.5 ? 'moderate' : 'minor';

    // Percentile
    const percentile = this.calculatePercentile(result.totalScore, scores);

    // Deviations
    const deviationFromMean = result.totalScore - stats.averageScore;
    const deviationFromMedian = result.totalScore - median;

    // Possible reasons
    const possibleReasons = this.identifyOutlierReasons(result, zScore, historicalData);

    // Recommendations
    const recommendations = this.generateOutlierRecommendations(
      isOutlier,
      outlierType,
      severity,
      result
    );

    const detectionConfidence = this.calculateDetectionConfidence(
      zScore,
      modifiedZScore,
      historicalData.length
    );

    return {
      isOutlier,
      outlierType: isOutlier ? outlierType : undefined,
      severity,
      zScore,
      modifiedZScore,
      iqrPosition,
      percentile,
      deviationFromMean,
      deviationFromMedian,
      possibleReasons,
      recommendations,
      detectionConfidence,
    };
  }

  /**
   * Calculate inter-rater reliability between AI and human graders
   */
  calculateInterRaterReliability(
    comparisons: HumanAIComparison[]
  ): InterRaterReliability {
    if (comparisons.length < this.config.minimumSampleSize) {
      console.warn(
        `Sample size (${comparisons.length}) is below recommended minimum (${this.config.minimumSampleSize})`
      );
    }

    const aiScores = comparisons.map(c => c.aiScore);
    const humanScores = comparisons.map(c => c.humanScore);

    // Correlation
    const pearsonCorrelation = this.calculatePearsonCorrelation(aiScores, humanScores);
    const spearmanCorrelation = this.calculateSpearmanCorrelation(aiScores, humanScores);

    // Cohen's Kappa (for grade categories)
    const aiGrades = aiScores.map(s => this.scoreToGrade(s));
    const humanGrades = humanScores.map(s => this.scoreToGrade(s));
    const cohensKappa = this.calculateCohensKappa(aiGrades, humanGrades);

    // ICC (Intraclass Correlation Coefficient)
    const intraclassCorrelation = this.calculateICC(aiScores, humanScores);

    // Error metrics
    const meanAbsoluteError = comparisons.reduce((sum, c) => sum + c.absoluteError, 0) / comparisons.length;
    const rootMeanSquaredError = Math.sqrt(
      comparisons.reduce((sum, c) => sum + c.squaredError, 0) / comparisons.length
    );
    const meanAbsolutePercentageError =
      comparisons.reduce((sum, c) => sum + c.percentageDifference, 0) / comparisons.length;

    // Pass/Fail agreement
    const passFailAgreement = this.calculatePassFailAgreement(aiScores, humanScores);

    // Classification
    const agreementLevel = this.classifyAgreementLevel(pearsonCorrelation, cohensKappa);

    const interpretation = this.interpretReliability(agreementLevel, pearsonCorrelation, meanAbsoluteError);

    const readyForProduction =
      pearsonCorrelation >= 0.8 &&
      cohensKappa >= 0.6 &&
      meanAbsoluteError <= 1.0;

    return {
      pearsonCorrelation,
      spearmanCorrelation,
      cohensKappa,
      intraclassCorrelation,
      meanAbsoluteError,
      rootMeanSquaredError,
      meanAbsolutePercentageError,
      agreementLevel,
      passFailAgreement,
      interpretation,
      readyForProduction,
    };
  }

  /**
   * Calculate basic statistics
   */
  private calculateStatistics(scores: number[]) {
    const sorted = [...scores].sort((a, b) => a - b);
    const sum = scores.reduce((a, b) => a + b, 0);
    const averageScore = sum / scores.length;

    const median = sorted[Math.floor(sorted.length / 2)];
    const mode = this.calculateMode(scores);

    const variance = scores.reduce((sum, score) => {
      return sum + Math.pow(score - averageScore, 2);
    }, 0) / scores.length;

    const standardDeviation = Math.sqrt(variance);

    return {
      totalSubmissions: scores.length,
      averageScore,
      median,
      mode,
      standardDeviation,
      variance,
      range: {
        min: Math.min(...scores),
        max: Math.max(...scores),
      },
    };
  }

  /**
   * Calculate grade distribution
   */
  private calculateDistribution(
    results: Array<{ result: EnhancedGradingResult }>
  ) {
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    for (const { result } of results) {
      gradeCounts[result.grade as keyof typeof gradeCounts]++;
    }

    // Histogram (0-2, 2-4, 4-6, 6-8, 8-10)
    const histogram = [
      { range: '0-2', count: 0 },
      { range: '2-4', count: 0 },
      { range: '4-6', count: 0 },
      { range: '6-8', count: 0 },
      { range: '8-10', count: 0 },
    ];

    for (const { result } of results) {
      const score = result.totalScore;
      if (score < 2) histogram[0].count++;
      else if (score < 4) histogram[1].count++;
      else if (score < 6) histogram[2].count++;
      else if (score < 8) histogram[3].count++;
      else histogram[4].count++;
    }

    return {
      aGrades: gradeCounts.A,
      bGrades: gradeCounts.B,
      cGrades: gradeCounts.C,
      dGrades: gradeCounts.D,
      fGrades: gradeCounts.F,
      histogram,
    };
  }

  /**
   * Calculate consistency metrics
   */
  private calculateConsistency(statistics: ConsistencyReport['statistics']) {
    const coefficientOfVariation = statistics.standardDeviation / statistics.averageScore;
    const isConsistent = coefficientOfVariation < this.config.consistencyThreshold;

    // IQR (would need sorted scores, simplified here)
    const interQuartileRange = statistics.standardDeviation * 1.35; // Approximation

    const score = Math.max(0, 1 - coefficientOfVariation / this.config.consistencyThreshold);

    return {
      score,
      coefficientOfVariation,
      interQuartileRange,
      isConsistent,
    };
  }

  /**
   * Find similar submissions (simplified - would use embeddings in production)
   */
  private async findSimilarSubmissions(
    results: Array<{ submissionId: string; result: EnhancedGradingResult; submission: string }>
  ): Promise<Array<{ submissions: string[]; averageScore: number; scoreVariance: number; isConsistent: boolean }>> {
    // Simplified: group by score ranges
    const groups: Map<string, typeof results> = new Map();

    for (const result of results) {
      const scoreRange = Math.floor(result.result.totalScore / 2) * 2; // Group by 2-point ranges
      const key = `${scoreRange}-${scoreRange + 2}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(result);
    }

    const similarityGroups = [];

    for (const [_range, group] of groups) {
      if (group.length < 2) continue; // Need at least 2 for similarity

      const scores = group.map(r => r.result.totalScore);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const scoreVariance = scores.reduce((sum, s) => sum + Math.pow(s - averageScore, 2), 0) / scores.length;

      similarityGroups.push({
        submissions: group.map(r => r.submissionId),
        averageScore,
        scoreVariance,
        isConsistent: scoreVariance < 1.0,
      });
    }

    return similarityGroups;
  }

  /**
   * Detect outliers in batch
   */
  private detectOutliers(
    results: Array<{ submissionId: string; result: EnhancedGradingResult }>,
    statistics: ConsistencyReport['statistics']
  ) {
    const outliers: string[] = [];
    const details: OutlierAnalysis[] = [];

    for (const { submissionId, result } of results) {
      const zScore = (result.totalScore - statistics.averageScore) / statistics.standardDeviation;

      if (Math.abs(zScore) > this.config.outlierZScoreThreshold) {
        outliers.push(submissionId);
        details.push({
          submissionId,
          score: result.totalScore,
          zScore,
          reason: zScore > 0
            ? `Unusually high score (${zScore.toFixed(2)} std deviations above mean)`
            : `Unusually low score (${Math.abs(zScore).toFixed(2)} std deviations below mean)`,
        });
      }
    }

    return { outliers, details };
  }

  /**
   * Helper: Calculate agreement
   */
  private calculateAgreement(
    aiGrade: EnhancedGradingResult,
    humanGrade: HumanGrade
  ) {
    const scoreDiff = Math.abs(aiGrade.totalScore - humanGrade.score);

    let overall: HumanAIComparison['agreement']['overall'];
    let score: number;

    if (scoreDiff === 0) {
      overall = 'perfect';
      score = 1.0;
    } else if (scoreDiff <= 0.5) {
      overall = 'high';
      score = 0.9;
    } else if (scoreDiff <= 1.0) {
      overall = 'moderate';
      score = 0.7;
    } else if (scoreDiff <= 2.0) {
      overall = 'low';
      score = 0.5;
    } else {
      overall = 'poor';
      score = 0.3;
    }

    // Criteria agreement (if both have criteria scores)
    const criteriaAgreement: Record<string, number> = {};
    if (humanGrade.criteriaScores) {
      for (const [criterion, humanScore] of Object.entries(humanGrade.criteriaScores)) {
        const aiScore = aiGrade.criteriaScores.find(c => c.name.toLowerCase() === criterion.toLowerCase())?.score || 0;
        const diff = Math.abs(aiScore - humanScore);
        criteriaAgreement[criterion] = Math.max(0, 1 - diff / 10);
      }
    }

    return { overall, score, criteriaAgreement };
  }

  /**
   * Helper: Compare feedback
   */
  private compareFeedback(aiFeedback: string, humanFeedback: string) {
    const aiLength = aiFeedback.length;
    const humanLength = humanFeedback.length;

    // Jaccard similarity
    const similarity = this.calculateJaccardSimilarity(aiFeedback, humanFeedback);

    // Key points match (simplified)
    const keyPointsMatch = similarity; // Would use NLP in production

    const toneMatch = Math.abs(aiLength - humanLength) < humanLength * 0.5 ? 'similar' : 'different';

    return {
      aiLength,
      humanLength,
      similarity,
      keyPointsMatch,
      toneMatch,
    };
  }

  /**
   * Helper: Jaccard similarity
   */
  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Helper: Score to grade
   */
  private scoreToGrade(score: number): string {
    if (score >= 9) return 'A';
    if (score >= 7) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3) return 'D';
    return 'F';
  }

  /**
   * Helper: Calculate mode
   */
  private calculateMode(scores: number[]): number {
    const frequency: Map<number, number> = new Map();
    let maxFreq = 0;
    let mode = scores[0];

    for (const score of scores) {
      const freq = (frequency.get(score) || 0) + 1;
      frequency.set(score, freq);

      if (freq > maxFreq) {
        maxFreq = freq;
        mode = score;
      }
    }

    return mode;
  }

  /**
   * Helper: Calculate MAD (Median Absolute Deviation)
   */
  private calculateMAD(scores: number[], median: number): number {
    const deviations = scores.map(s => Math.abs(s - median));
    const sortedDeviations = deviations.sort((a, b) => a - b);
    return sortedDeviations[Math.floor(sortedDeviations.length / 2)];
  }

  /**
   * Helper: Calculate IQR position
   */
  private calculateIQRPosition(score: number, scores: number[]): 'within' | 'mild' | 'extreme' {
    const sorted = [...scores].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    if (score < q1 - 1.5 * iqr || score > q3 + 1.5 * iqr) {
      if (score < q1 - 3 * iqr || score > q3 + 3 * iqr) {
        return 'extreme';
      }
      return 'mild';
    }

    return 'within';
  }

  /**
   * Helper: Calculate percentile
   */
  private calculatePercentile(score: number, scores: number[]): number {
    const sorted = [...scores].sort((a, b) => a - b);
    const belowCount = sorted.filter(s => s < score).length;
    return (belowCount / scores.length) * 100;
  }

  /**
   * Helper: Identify outlier reasons
   */
  private identifyOutlierReasons(
    result: EnhancedGradingResult,
    zScore: number,
    historicalData: EnhancedGradingResult[]
  ): string[] {
    const reasons: string[] = [];

    if (Math.abs(zScore) > 3) {
      reasons.push('Score is extremely far from average (>3 standard deviations)');
    }

    if (result.confidence < 0.5) {
      reasons.push('Very low AI confidence in grading');
    }

    if (result.criteriaScores.some(c => c.score === 0 || c.score === 10)) {
      reasons.push('Contains extreme criteria scores (0 or 10)');
    }

    if (result.totalScore < 2) {
      reasons.push('Very low score - may indicate empty or off-topic submission');
    }

    if (result.totalScore > 9.5) {
      reasons.push('Near-perfect score - may need verification');
    }

    return reasons.length > 0 ? reasons : ['Statistical outlier detected'];
  }

  /**
   * Helper: Generate outlier recommendations
   */
  private generateOutlierRecommendations(
    isOutlier: boolean,
    outlierType: 'high' | 'low' | undefined,
    severity: 'minor' | 'moderate' | 'severe',
    result: EnhancedGradingResult
  ): string[] {
    if (!isOutlier) {
      return ['Grade appears normal, no action needed'];
    }

    const recommendations: string[] = [];

    recommendations.push('Request human review to verify grading accuracy');

    if (severity === 'severe') {
      recommendations.push('High priority review - significant deviation detected');
    }

    if (outlierType === 'high') {
      recommendations.push('Verify if high score is justified or if AI overrated');
    } else if (outlierType === 'low') {
      recommendations.push('Check if low score is accurate or if submission was misunderstood');
    }

    if (result.confidence < 0.6) {
      recommendations.push('Low AI confidence - consider regrading with different model');
    }

    return recommendations;
  }

  /**
   * Helper: Calculate detection confidence
   */
  private calculateDetectionConfidence(
    zScore: number,
    modifiedZScore: number,
    sampleSize: number
  ): number {
    let confidence = 0.5;

    // Higher z-score = higher confidence
    if (Math.abs(zScore) > 3) confidence += 0.3;
    else if (Math.abs(zScore) > 2) confidence += 0.2;

    // Modified z-score agreement
    if (Math.sign(zScore) === Math.sign(modifiedZScore)) confidence += 0.1;

    // Larger sample size = higher confidence
    if (sampleSize >= 100) confidence += 0.1;
    else if (sampleSize >= 30) confidence += 0.05;

    return Math.min(1, confidence);
  }

  /**
   * Helper: Generate consistency recommendations
   */
  private generateConsistencyRecommendations(
    consistency: ConsistencyReport['consistency'],
    outlierCount: number,
    totalCount: number
  ): string[] {
    const recommendations: string[] = [];

    if (consistency.isConsistent) {
      recommendations.push('✅ Grading consistency is good');
    } else {
      recommendations.push('⚠️ High score variance detected - review grading criteria');
      recommendations.push('Consider calibrating AI model with more training data');
    }

    const outlierRate = outlierCount / totalCount;
    if (outlierRate > 0.1) {
      recommendations.push(`⚠️ High outlier rate (${(outlierRate * 100).toFixed(1)}%) - investigate edge cases`);
    }

    if (consistency.coefficientOfVariation > 0.5) {
      recommendations.push('Extremely high variation - may need to adjust rubric or retrain model');
    }

    return recommendations;
  }

  /**
   * Helper: Pearson correlation
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Helper: Spearman correlation (rank-based)
   */
  private calculateSpearmanCorrelation(x: number[], y: number[]): number {
    const rankX = this.rankArray(x);
    const rankY = this.rankArray(y);
    return this.calculatePearsonCorrelation(rankX, rankY);
  }

  /**
   * Helper: Rank array
   */
  private rankArray(arr: number[]): number[] {
    const sorted = arr.map((val, idx) => ({ val, idx })).sort((a, b) => a.val - b.val);
    const ranks = new Array(arr.length);
    sorted.forEach((item, rank) => {
      ranks[item.idx] = rank + 1;
    });
    return ranks;
  }

  /**
   * Helper: Cohen's Kappa
   */
  private calculateCohensKappa(arr1: string[], arr2: string[]): number {
    const categories = ['A', 'B', 'C', 'D', 'F'];
    const n = arr1.length;

    // Observed agreement
    const agree = arr1.filter((val, i) => val === arr2[i]).length;
    const po = agree / n;

    // Expected agreement
    let pe = 0;
    for (const cat of categories) {
      const p1 = arr1.filter(v => v === cat).length / n;
      const p2 = arr2.filter(v => v === cat).length / n;
      pe += p1 * p2;
    }

    return (po - pe) / (1 - pe);
  }

  /**
   * Helper: Intraclass Correlation Coefficient (ICC)
   */
  private calculateICC(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    const grandMean = (meanX + meanY) / 2;

    const msb = x.reduce((sum, xi, i) => {
      const rowMean = (xi + y[i]) / 2;
      return sum + Math.pow(rowMean - grandMean, 2);
    }, 0) / n;

    const msw = x.reduce((sum, xi, i) => {
      const rowMean = (xi + y[i]) / 2;
      return sum + Math.pow(xi - rowMean, 2) + Math.pow(y[i] - rowMean, 2);
    }, 0) / (n * 2);

    return (msb - msw) / (msb + msw);
  }

  /**
   * Helper: Pass/Fail agreement
   */
  private calculatePassFailAgreement(aiScores: number[], humanScores: number[]): number {
    const passThreshold = 5;
    let agreements = 0;

    for (let i = 0; i < aiScores.length; i++) {
      const aiPass = aiScores[i] >= passThreshold;
      const humanPass = humanScores[i] >= passThreshold;
      if (aiPass === humanPass) agreements++;
    }

    return (agreements / aiScores.length) * 100;
  }

  /**
   * Helper: Classify agreement level
   */
  private classifyAgreementLevel(
    pearson: number,
    kappa: number
  ): InterRaterReliability['agreementLevel'] {
    const avg = (pearson + kappa) / 2;

    if (avg >= 0.9) return 'excellent';
    if (avg >= 0.75) return 'good';
    if (avg >= 0.6) return 'moderate';
    if (avg >= 0.4) return 'fair';
    return 'poor';
  }

  /**
   * Helper: Interpret reliability
   */
  private interpretReliability(
    level: InterRaterReliability['agreementLevel'],
    pearson: number,
    mae: number
  ): string {
    const interpretations = {
      excellent: `Excellent agreement (r=${pearson.toFixed(2)}, MAE=${mae.toFixed(2)}). AI grading is highly reliable and ready for production use.`,
      good: `Good agreement (r=${pearson.toFixed(2)}, MAE=${mae.toFixed(2)}). AI grading is reliable with minor discrepancies.`,
      moderate: `Moderate agreement (r=${pearson.toFixed(2)}, MAE=${mae.toFixed(2)}). AI grading needs improvement before full deployment.`,
      fair: `Fair agreement (r=${pearson.toFixed(2)}, MAE=${mae.toFixed(2)}). Significant differences exist. Use with caution and human oversight.`,
      poor: `Poor agreement (r=${pearson.toFixed(2)}, MAE=${mae.toFixed(2)}). AI grading is not yet reliable. Requires substantial improvement.`,
    };

    return interpretations[level];
  }
}

/**
 * Create enhanced validator instance
 */
export function createEnhancedGradingValidator(
  config?: Partial<ValidationConfig>
): EnhancedGradingValidator {
  return new EnhancedGradingValidator(config);
}
