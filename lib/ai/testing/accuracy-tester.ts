/**
 * Accuracy Testing Framework
 * Tests AI grading accuracy against human gold standard
 */

import { EnhancedGradingResult } from '../services/enhanced-smart-grading';
import { createEnhancedGradingValidator, InterRaterReliability } from '../services/enhanced-grading-validator';

/**
 * Test Case
 */
export interface TestCase {
  id: string;
  subject: string;
  gradeLevel: string;
  question: string;
  submission: string;
  goldStandard: {
    score: number;
    criteriaScores?: Record<string, number>;
    feedback: string;
    gradedBy: string; // Expert grader name
  };
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
  };
}

/**
 * Test Result
 */
export interface TestResult {
  testCaseId: string;
  aiScore: number;
  humanScore: number;
  difference: number;
  percentageError: number;
  agreement: 'perfect' | 'high' | 'moderate' | 'low' | 'poor';
  passed: boolean;
  criteriaComparison?: Record<string, {
    ai: number;
    human: number;
    diff: number;
  }>;
}

/**
 * Accuracy Report
 */
export interface AccuracyReport {
  testSuite: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number; // %

  // Error Metrics
  meanAbsoluteError: number; // MAE
  rootMeanSquaredError: number; // RMSE
  meanAbsolutePercentageError: number; // MAPE

  // Correlation
  pearsonCorrelation: number;
  spearmanCorrelation: number;

  // Agreement
  cohensKappa: number;
  agreementRate: number; // % within tolerance

  // Distribution
  errorDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];

  // By Subject/Difficulty
  bySubject: Record<string, {
    count: number;
    mae: number;
    passRate: number;
  }>;

  byDifficulty?: Record<string, {
    count: number;
    mae: number;
    passRate: number;
  }>;

  // Detailed Results
  results: TestResult[];

  // Pass/Fail Criteria
  meetsProductionCriteria: boolean;
  recommendations: string[];
}

/**
 * Accuracy Tester
 */
export class AccuracyTester {
  private validator = createEnhancedGradingValidator();

  constructor(
    private tolerancePoints: number = 1.0, // ±1 point tolerance
    private minPassRate: number = 80 // 80% pass rate
  ) {}

  /**
   * Run accuracy test suite
   */
  async runTestSuite(
    testCases: TestCase[],
    gradingFunction: (submission: string, subject: string, grade: string) => Promise<EnhancedGradingResult>,
    suiteName: string = 'Accuracy Test'
  ): Promise<AccuracyReport> {
    console.log(`\n🧪 Running ${suiteName} with ${testCases.length} test cases...`);

    const results: TestResult[] = [];

    // Run all test cases
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`Testing ${i + 1}/${testCases.length}: ${testCase.subject} - ${testCase.id}...`);

      try {
        const aiResult = await gradingFunction(
          testCase.submission,
          testCase.subject,
          testCase.gradeLevel
        );

        const result = this.compareResults(testCase, aiResult);
        results.push(result);

        console.log(
          `  AI: ${aiResult.totalScore.toFixed(1)}, Human: ${testCase.goldStandard.score.toFixed(1)}, ` +
          `Diff: ${result.difference.toFixed(1)} - ${result.passed ? '✅' : '❌'}`
        );
      } catch (error: any) {
        console.error(`  ❌ Error: ${error.message}`);
        results.push({
          testCaseId: testCase.id,
          aiScore: 0,
          humanScore: testCase.goldStandard.score,
          difference: testCase.goldStandard.score,
          percentageError: 100,
          agreement: 'poor',
          passed: false,
        });
      }
    }

    // Generate report
    const report = this.generateReport(suiteName, testCases, results);

    console.log(`\n📊 Test Suite Complete: ${report.passRate.toFixed(1)}% pass rate`);

    return report;
  }

  /**
   * Compare AI result with gold standard
   */
  private compareResults(testCase: TestCase, aiResult: EnhancedGradingResult): TestResult {
    const difference = Math.abs(aiResult.totalScore - testCase.goldStandard.score);
    const percentageError = (difference / testCase.goldStandard.score) * 100;
    const passed = difference <= this.tolerancePoints;

    let agreement: TestResult['agreement'];
    if (difference === 0) agreement = 'perfect';
    else if (difference <= 0.5) agreement = 'high';
    else if (difference <= 1.0) agreement = 'moderate';
    else if (difference <= 2.0) agreement = 'low';
    else agreement = 'poor';

    // Compare criteria if available
    let criteriaComparison: TestResult['criteriaComparison'];
    if (testCase.goldStandard.criteriaScores) {
      criteriaComparison = {};

      for (const [name, humanScore] of Object.entries(testCase.goldStandard.criteriaScores)) {
        const aiCriterion = aiResult.criteriaScores.find(
          c => c.name.toLowerCase() === name.toLowerCase()
        );

        if (aiCriterion) {
          criteriaComparison[name] = {
            ai: aiCriterion.score,
            human: humanScore,
            diff: Math.abs(aiCriterion.score - humanScore),
          };
        }
      }
    }

    return {
      testCaseId: testCase.id,
      aiScore: aiResult.totalScore,
      humanScore: testCase.goldStandard.score,
      difference,
      percentageError,
      agreement,
      passed,
      criteriaComparison,
    };
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(
    suiteName: string,
    testCases: TestCase[],
    results: TestResult[]
  ): AccuracyReport {
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;
    const passRate = (passedTests / results.length) * 100;

    // Error metrics
    const mae = results.reduce((sum, r) => sum + r.difference, 0) / results.length;
    const rmse = Math.sqrt(
      results.reduce((sum, r) => sum + r.difference ** 2, 0) / results.length
    );
    const mape = results.reduce((sum, r) => sum + r.percentageError, 0) / results.length;

    // Correlation
    const aiScores = results.map(r => r.aiScore);
    const humanScores = results.map(r => r.humanScore);
    const pearsonCorrelation = this.calculatePearsonCorrelation(aiScores, humanScores);
    const spearmanCorrelation = this.calculateSpearmanCorrelation(aiScores, humanScores);

    // Agreement
    const cohensKappa = this.calculateCohensKappa(
      aiScores.map(this.scoreToGrade),
      humanScores.map(this.scoreToGrade)
    );
    const agreementRate = (results.filter(r => r.difference <= this.tolerancePoints).length / results.length) * 100;

    // Error distribution
    const errorDistribution = this.calculateErrorDistribution(results);

    // By subject
    const bySubject = this.groupBySubject(testCases, results);

    // By difficulty
    const byDifficulty = this.groupByDifficulty(testCases, results);

    // Production criteria
    const meetsProductionCriteria =
      passRate >= this.minPassRate &&
      pearsonCorrelation >= 0.8 &&
      mae <= 1.0 &&
      cohensKappa >= 0.6;

    const recommendations = this.generateRecommendations({
      passRate,
      mae,
      pearsonCorrelation,
      cohensKappa,
      bySubject,
    });

    return {
      testSuite: suiteName,
      totalTests: results.length,
      passedTests,
      failedTests,
      passRate,
      meanAbsoluteError: mae,
      rootMeanSquaredError: rmse,
      meanAbsolutePercentageError: mape,
      pearsonCorrelation,
      spearmanCorrelation,
      cohensKappa,
      agreementRate,
      errorDistribution,
      bySubject,
      byDifficulty,
      results,
      meetsProductionCriteria,
      recommendations,
    };
  }

  /**
   * Calculate error distribution
   */
  private calculateErrorDistribution(results: TestResult[]) {
    const ranges = [
      { range: '0-0.5', min: 0, max: 0.5 },
      { range: '0.5-1.0', min: 0.5, max: 1.0 },
      { range: '1.0-1.5', min: 1.0, max: 1.5 },
      { range: '1.5-2.0', min: 1.5, max: 2.0 },
      { range: '2.0+', min: 2.0, max: Infinity },
    ];

    return ranges.map(({ range, min, max }) => {
      const count = results.filter(r => r.difference >= min && r.difference < max).length;
      return {
        range,
        count,
        percentage: (count / results.length) * 100,
      };
    });
  }

  /**
   * Group by subject
   */
  private groupBySubject(testCases: TestCase[], results: TestResult[]) {
    const grouped: Record<string, { count: number; mae: number; passRate: number }> = {};

    for (const testCase of testCases) {
      const result = results.find(r => r.testCaseId === testCase.id);
      if (!result) continue;

      if (!grouped[testCase.subject]) {
        grouped[testCase.subject] = { count: 0, mae: 0, passRate: 0 };
      }

      grouped[testCase.subject].count++;
      grouped[testCase.subject].mae += result.difference;
      if (result.passed) grouped[testCase.subject].passRate++;
    }

    // Calculate averages
    for (const subject in grouped) {
      grouped[subject].mae /= grouped[subject].count;
      grouped[subject].passRate = (grouped[subject].passRate / grouped[subject].count) * 100;
    }

    return grouped;
  }

  /**
   * Group by difficulty
   */
  private groupByDifficulty(testCases: TestCase[], results: TestResult[]) {
    const grouped: Record<string, { count: number; mae: number; passRate: number }> = {};

    for (const testCase of testCases) {
      const difficulty = testCase.metadata?.difficulty || 'medium';
      const result = results.find(r => r.testCaseId === testCase.id);
      if (!result) continue;

      if (!grouped[difficulty]) {
        grouped[difficulty] = { count: 0, mae: 0, passRate: 0 };
      }

      grouped[difficulty].count++;
      grouped[difficulty].mae += result.difference;
      if (result.passed) grouped[difficulty].passRate++;
    }

    // Calculate averages
    for (const difficulty in grouped) {
      grouped[difficulty].mae /= grouped[difficulty].count;
      grouped[difficulty].passRate = (grouped[difficulty].passRate / grouped[difficulty].count) * 100;
    }

    return grouped;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(stats: {
    passRate: number;
    mae: number;
    pearsonCorrelation: number;
    cohensKappa: number;
    bySubject: Record<string, { mae: number; passRate: number }>;
  }): string[] {
    const recommendations: string[] = [];

    // Overall performance
    if (stats.passRate >= 90) {
      recommendations.push(`✅ Excellent pass rate (${stats.passRate.toFixed(1)}%)`);
    } else if (stats.passRate >= 80) {
      recommendations.push(`✅ Good pass rate (${stats.passRate.toFixed(1)}%)`);
    } else {
      recommendations.push(`⚠️ Pass rate below target (${stats.passRate.toFixed(1)}% < 80%)`);
      recommendations.push('Action: Review failed test cases, adjust prompts/rubrics');
    }

    // Accuracy
    if (stats.mae <= 0.5) {
      recommendations.push(`✅ Excellent accuracy (MAE: ${stats.mae.toFixed(2)})`);
    } else if (stats.mae <= 1.0) {
      recommendations.push(`✅ Good accuracy (MAE: ${stats.mae.toFixed(2)})`);
    } else {
      recommendations.push(`⚠️ Accuracy needs improvement (MAE: ${stats.mae.toFixed(2)} > 1.0)`);
      recommendations.push('Action: Fine-tune model, improve prompts');
    }

    // Correlation
    if (stats.pearsonCorrelation >= 0.9) {
      recommendations.push(`✅ Excellent correlation (r: ${stats.pearsonCorrelation.toFixed(2)})`);
    } else if (stats.pearsonCorrelation >= 0.8) {
      recommendations.push(`✅ Good correlation (r: ${stats.pearsonCorrelation.toFixed(2)})`);
    } else {
      recommendations.push(`⚠️ Low correlation (r: ${stats.pearsonCorrelation.toFixed(2)} < 0.8)`);
      recommendations.push('Action: Review grading consistency, retrain model');
    }

    // Agreement
    if (stats.cohensKappa >= 0.8) {
      recommendations.push(`✅ Excellent agreement (κ: ${stats.cohensKappa.toFixed(2)})`);
    } else if (stats.cohensKappa >= 0.6) {
      recommendations.push(`✅ Good agreement (κ: ${stats.cohensKappa.toFixed(2)})`);
    } else {
      recommendations.push(`⚠️ Low agreement (κ: ${stats.cohensKappa.toFixed(2)} < 0.6)`);
    }

    // Subject-specific
    for (const [subject, data] of Object.entries(stats.bySubject)) {
      if (data.passRate < 70) {
        recommendations.push(`⚠️ ${subject}: Low pass rate (${data.passRate.toFixed(1)}%)`);
        recommendations.push(`   → Review ${subject} rubric and prompts`);
      }
      if (data.mae > 1.5) {
        recommendations.push(`⚠️ ${subject}: High error (MAE: ${data.mae.toFixed(2)})`);
      }
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
   * Helper: Spearman correlation
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
   * Export report to JSON
   */
  exportReport(report: AccuracyReport, filename: string = 'accuracy-report.json'): void {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Report exported to ${filename}`);
  }

  /**
   * Print report summary
   */
  printSummary(report: AccuracyReport): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${report.testSuite} - Summary`);
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests} (${report.passRate.toFixed(1)}%)`);
    console.log(`Failed: ${report.failedTests}`);
    console.log('');
    console.log(`MAE: ${report.meanAbsoluteError.toFixed(2)}`);
    console.log(`RMSE: ${report.rootMeanSquaredError.toFixed(2)}`);
    console.log(`MAPE: ${report.meanAbsolutePercentageError.toFixed(1)}%`);
    console.log('');
    console.log(`Pearson Correlation: ${report.pearsonCorrelation.toFixed(3)}`);
    console.log(`Cohen's Kappa: ${report.cohensKappa.toFixed(3)}`);
    console.log(`Agreement Rate: ${report.agreementRate.toFixed(1)}%`);
    console.log('');
    console.log(`Production Ready: ${report.meetsProductionCriteria ? '✅ YES' : '❌ NO'}`);
    console.log('');
    console.log('Recommendations:');
    report.recommendations.forEach(r => console.log(`  ${r}`));
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Create accuracy tester
 */
export function createAccuracyTester(
  tolerancePoints: number = 1.0,
  minPassRate: number = 80
): AccuracyTester {
  return new AccuracyTester(tolerancePoints, minPassRate);
}
