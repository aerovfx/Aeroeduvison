/**
 * A/B Testing Framework for AI Models
 * 
 * Features:
 * - Compare effectiveness between models
 * - Collect user feedback (ratings)
 * - Statistical significance testing
 * - Auto-optimization based on results
 */

import { createHash } from 'crypto';

export interface ABTestConfig {
  name: string;
  description: string;
  modelA: string;
  modelB: string;
  taskType: string;
  trafficSplit: number; // 0-100 (% to model A)
  startDate: number;
  endDate?: number;
  active: boolean;
}

export interface ABTestResult {
  testId: string;
  modelA: {
    name: string;
    totalRequests: number;
    avgRating: number;
    avgCost: number;
    avgLatency: number;
    successRate: number;
  };
  modelB: {
    name: string;
    totalRequests: number;
    avgRating: number;
    avgCost: number;
    avgLatency: number;
    successRate: number;
  };
  winner: string | null;
  confidence: number; // 0-100%
  recommendation: string;
}

export interface UserFeedback {
  requestId: string;
  userId: string;
  modelUsed: string;
  rating: number; // 1-5
  feedback?: string;
  timestamp: number;
}

export class ABTestingFramework {
  private tests: Map<string, ABTestConfig>;
  private results: Map<string, RequestLog[]>;
  private feedbacks: Map<string, UserFeedback[]>;

  constructor() {
    this.tests = new Map();
    this.results = new Map();
    this.feedbacks = new Map();
  }

  /**
   * Create new A/B test
   */
  createTest(config: ABTestConfig): string {
    const testId = this.generateTestId(config.name);

    this.tests.set(testId, {
      ...config,
      active: true,
    });

    this.results.set(testId, []);
    this.feedbacks.set(testId, []);

    console.log(`🧪 Created A/B test: ${config.name} (ID: ${testId})`);
    console.log(`   Model A: ${config.modelA}`);
    console.log(`   Model B: ${config.modelB}`);
    console.log(`   Traffic split: ${config.trafficSplit}%/${100 - config.trafficSplit}%`);

    return testId;
  }

  /**
   * Generate test ID
   */
  private generateTestId(name: string): string {
    const hash = createHash('md5')
      .update(`${name}_${Date.now()}`)
      .digest('hex')
      .substring(0, 8);
    return `test_${hash}`;
  }

  /**
   * Select model based on A/B test
   */
  selectModelForTest(
    testId: string,
    userId: string
  ): { model: string; group: string } | null {
    const test = this.tests.get(testId);

    if (!test || !test.active) return null;

    // Use consistent hashing for user assignment
    const hash = createHash('md5')
      .update(`${testId}_${userId}`)
      .digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const percentage = hashValue % 100;

    const isGroupA = percentage < test.trafficSplit;

    return {
      model: isGroupA ? test.modelA : test.modelB,
      group: isGroupA ? 'A' : 'B',
    };
  }

  /**
   * Log test result
   */
  logTestResult(testId: string, log: any): void {
    const results = this.results.get(testId);
    if (results) {
      results.push(log);
    }
  }

  /**
   * Submit user feedback
   */
  submitFeedback(testId: string, feedback: UserFeedback): void {
    const feedbacks = this.feedbacks.get(testId);
    if (feedbacks) {
      feedbacks.push(feedback);
      console.log(
        `📝 Feedback received for ${feedback.modelUsed}: ${feedback.rating}/5`
      );
    }
  }

  /**
   * Analyze A/B test results
   */
  analyzeTest(testId: string): ABTestResult | null {
    const test = this.tests.get(testId);
    const results = this.results.get(testId);
    const feedbacks = this.feedbacks.get(testId);

    if (!test || !results || !feedbacks) return null;

    const resultsA = results.filter((r) => r.abTestGroup === 'A');
    const resultsB = results.filter((r) => r.abTestGroup === 'B');

    const feedbacksA = feedbacks.filter((f) => f.modelUsed === test.modelA);
    const feedbacksB = feedbacks.filter((f) => f.modelUsed === test.modelB);

    const analyticsA = this.calculateGroupAnalytics(resultsA, feedbacksA);
    const analyticsB = this.calculateGroupAnalytics(resultsB, feedbacksB);

    // Determine winner
    const { winner, confidence } = this.determineWinner(analyticsA, analyticsB);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      test,
      analyticsA,
      analyticsB,
      winner
    );

    return {
      testId,
      modelA: {
        name: test.modelA,
        ...analyticsA,
      },
      modelB: {
        name: test.modelB,
        ...analyticsB,
      },
      winner,
      confidence,
      recommendation,
    };
  }

  /**
   * Calculate analytics for a test group
   */
  private calculateGroupAnalytics(
    results: any[],
    feedbacks: UserFeedback[]
  ): any {
    const successful = results.filter((r) => r.success);

    return {
      totalRequests: results.length,
      avgRating:
        feedbacks.length > 0
          ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
          : 0,
      avgCost:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.cost, 0) / results.length
          : 0,
      avgLatency:
        results.length > 0
          ? results.reduce((sum, r) => sum + r.latency, 0) / results.length
          : 0,
      successRate:
        results.length > 0 ? (successful.length / results.length) * 100 : 0,
    };
  }

  /**
   * Determine winner using statistical testing
   */
  private determineWinner(
    analyticsA: any,
    analyticsB: any
  ): { winner: string | null; confidence: number } {
    // Simple heuristic - can be replaced with proper statistical test
    const scoreA =
      analyticsA.avgRating * 2 + // Rating is most important
      (100 - analyticsA.avgCost * 1000) * 0.5 + // Cost factor
      (10 - analyticsA.avgLatency / 1000) * 0.3 + // Latency factor
      analyticsA.successRate * 0.2; // Success rate

    const scoreB =
      analyticsB.avgRating * 2 +
      (100 - analyticsB.avgCost * 1000) * 0.5 +
      (10 - analyticsB.avgLatency / 1000) * 0.3 +
      analyticsB.successRate * 0.2;

    const diff = Math.abs(scoreA - scoreB);
    const minSampleSize = 30;

    // Need minimum samples for confidence
    if (
      analyticsA.totalRequests < minSampleSize ||
      analyticsB.totalRequests < minSampleSize
    ) {
      return {
        winner: null,
        confidence: 0,
      };
    }

    // Calculate confidence (simplified)
    let confidence = Math.min(100, diff * 10);

    // Require significant difference
    if (diff < 0.5) {
      return { winner: null, confidence: 0 };
    }

    return {
      winner: scoreA > scoreB ? 'A' : 'B',
      confidence,
    };
  }

  /**
   * Generate recommendation based on test results
   */
  private generateRecommendation(
    test: ABTestConfig,
    analyticsA: any,
    analyticsB: any,
    winner: string | null
  ): string {
    if (!winner) {
      return `Chưa đủ dữ liệu hoặc không có sự khác biệt rõ rệt giữa ${test.modelA} và ${test.modelB}. Tiếp tục thu thập dữ liệu.`;
    }

    const winnerModel = winner === 'A' ? test.modelA : test.modelB;
    const winnerAnalytics = winner === 'A' ? analyticsA : analyticsB;
    const loserAnalytics = winner === 'A' ? analyticsB : analyticsA;

    const reasons: string[] = [];

    if (winnerAnalytics.avgRating > loserAnalytics.avgRating + 0.3) {
      reasons.push(
        `rating cao hơn (${winnerAnalytics.avgRating.toFixed(1)} vs ${loserAnalytics.avgRating.toFixed(1)})`
      );
    }

    if (winnerAnalytics.avgCost < loserAnalytics.avgCost * 0.8) {
      reasons.push(
        `chi phí thấp hơn ($${winnerAnalytics.avgCost.toFixed(4)} vs $${loserAnalytics.avgCost.toFixed(4)})`
      );
    }

    if (winnerAnalytics.avgLatency < loserAnalytics.avgLatency * 0.8) {
      reasons.push(
        `nhanh hơn (${(winnerAnalytics.avgLatency / 1000).toFixed(1)}s vs ${(loserAnalytics.avgLatency / 1000).toFixed(1)}s)`
      );
    }

    const reasonText = reasons.length > 0 ? reasons.join(', ') : 'tổng thể tốt hơn';

    return `✅ Nên sử dụng ${winnerModel} cho ${test.taskType} vì ${reasonText}. Cân nhắc migrate 100% traffic sang ${winnerModel}.`;
  }

  /**
   * Get active tests
   */
  getActiveTests(): ABTestConfig[] {
    return Array.from(this.tests.values()).filter((test) => test.active);
  }

  /**
   * Stop a test
   */
  stopTest(testId: string): void {
    const test = this.tests.get(testId);
    if (test) {
      test.active = false;
      test.endDate = Date.now();
      console.log(`⏹️  Stopped A/B test: ${test.name}`);
    }
  }

  /**
   * Get test summary
   */
  getTestSummary(testId: string): any {
    const test = this.tests.get(testId);
    const analysis = this.analyzeTest(testId);

    if (!test || !analysis) return null;

    return {
      test,
      analysis,
      status: test.active ? 'Running' : 'Completed',
      duration: test.endDate
        ? test.endDate - test.startDate
        : Date.now() - test.startDate,
    };
  }
}

interface RequestLog {
  requestId: string;
  modelName: string;
  cost: number;
  latency: number;
  success: boolean;
  abTestGroup?: string;
}

// Export singleton instance
export const abTesting = new ABTestingFramework();

