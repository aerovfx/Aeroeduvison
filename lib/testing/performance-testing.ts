/**
 * Performance Testing Utilities for Phase 2
 * Measures response times, streaming, and user experience metrics
 */

export interface PerformanceMetrics {
  responseTime: number; // ms
  ttfb: number; // Time to first byte
  timeToComplete: number; // ms
  tokenThroughput: number; // tokens/sec
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

export interface UXMetrics {
  pageLoadTime: number; // ms
  firstPaint: number; // ms
  firstContentfulPaint: number; // ms
  timeToInteractive: number; // ms
  layoutShift: number; // CLS score
  userSatisfaction: number; // 1-5 scale
}

export interface TutorChatMetrics {
  questionResponseTime: number; // ms - how long tutor takes to reply
  socraticQualityScore: number; // 1-10 - does it follow Socratic method?
  userEngagementDuration: number; // seconds
  clarityScore: number; // 1-5 - how clear is the response?
  appropriateDifficulty: number; // 1-5 - is difficulty matching?
}

/**
 * Performance Monitor Hook
 */
export class PerformanceMonitor {
  private startTime: number = 0;
  private measurements: Map<string, number[]> = new Map();

  start() {
    this.startTime = performance.now();
  }

  mark(label: string) {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(performance.now() - this.startTime);
  }

  measure(name: string): number {
    return performance.now() - this.startTime;
  }

  getMetrics(): { [key: string]: { avg: number; min: number; max: number } } {
    const result: { [key: string]: { avg: number; min: number; max: number } } = {};

    this.measurements.forEach((times, label) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      result[label] = { avg, min, max };
    });

    return result;
  }

  clear() {
    this.measurements.clear();
    this.startTime = 0;
  }

  /**
   * Check if performance meets SLA
   */
  checkSLA(label: string, maxMs: number): boolean {
    const times = this.measurements.get(label) || [];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return avg <= maxMs;
  }

  /**
   * Get detailed report
   */
  getReport(): string {
    let report = '\n╔════════════════════════════════════════╗\n';
    report += '║        PERFORMANCE METRICS REPORT      ║\n';
    report += '╚════════════════════════════════════════╝\n\n';

    const metrics = this.getMetrics();
    Object.entries(metrics).forEach(([label, { avg, min, max }]) => {
      report += `${label}:\n`;
      report += `  Average: ${avg.toFixed(2)}ms\n`;
      report += `  Min: ${min.toFixed(2)}ms\n`;
      report += `  Max: ${max.toFixed(2)}ms\n\n`;
    });

    return report;
  }
}

/**
 * Response Time Benchmarks
 */
export const PERFORMANCE_SLA = {
  tutor_response: 2000, // ms - AI should respond within 2 seconds
  quiz_load: 1000, // ms
  quiz_navigation: 300, // ms - moving between questions
  page_load: 2000, // ms
  api_response: 1500, // ms
  ui_interaction: 100, // ms - button clicks, etc.
};

/**
 * Test Socratic Method Adherence
 */
export function assessSocraticAdherence(response: string): {
  score: number; // 1-10
  hasDirectAnswer: boolean;
  hasQuestions: boolean;
  hasExplanation: boolean;
  hasHints: boolean;
} {
  const lowerResponse = response.toLowerCase();
  
  const hasDirectAnswer = /^(đáp án |answer|kết quả|result)/i.test(response);
  const hasQuestions = /\?/.test(response);
  const hasExplanation = /(giải thích|vì sao|tại sao|why|because|explanation)/i.test(lowerResponse);
  const hasHints = /(gợi ý|hint|em hãy|you should|remember)/i.test(lowerResponse);

  let score = 0;

  // Direct answer = bad for Socratic
  if (!hasDirectAnswer) score += 3;
  // Questions = good
  if (hasQuestions) score += 3;
  // Explanation = good
  if (hasExplanation) score += 2;
  // Hints but not answers = good
  if (hasHints && !hasDirectAnswer) score += 2;

  return {
    score: Math.min(10, score),
    hasDirectAnswer,
    hasQuestions,
    hasExplanation,
    hasHints,
  };
}

/**
 * Mobile Responsiveness Tester
 */
export const MOBILE_VIEWPORTS = {
  iphone12: { width: 390, height: 844 },
  iphone12Pro: { width: 390, height: 844 },
  samsung: { width: 360, height: 800 },
  iPad: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

export function testResponsiveness(viewport: { width: number; height: number }) {
  // Mock implementation - in real tests would use Playwright/Cypress
  const isMobile = viewport.width <= 480;
  const isTablet = viewport.width > 480 && viewport.width <= 768;
  const isDesktop = viewport.width > 768;

  return {
    isMobile,
    isTablet,
    isDesktop,
    viewport,
  };
}

/**
 * Generate Test Report
 */
export function generatePerformanceReport(metrics: {
  responseTimes: number[];
  errorRate: number;
  userSatisfaction: number;
  socraticAdherence: number;
  mobileScore: number;
}): string {
  const avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
  const p95ResponseTime = metrics.responseTimes.sort((a, b) => a - b)[
    Math.floor(metrics.responseTimes.length * 0.95)
  ];

  const report = `
╔════════════════════════════════════════════════════════════╗
║              PHASE 2 UX TESTING REPORT                     ║
╚════════════════════════════════════════════════════════════╝

📊 RESPONSE TIME METRICS
  Average Response Time: ${avgResponseTime.toFixed(2)}ms
  P95 Response Time: ${p95ResponseTime?.toFixed(2) || 'N/A'}ms
  SLA Status: ${avgResponseTime <= PERFORMANCE_SLA.tutor_response ? '✅ PASS' : '❌ FAIL'}

❌ ERROR METRICS
  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%
  Threshold: 1%
  Status: ${metrics.errorRate <= 0.01 ? '✅ PASS' : '❌ FAIL'}

😊 USER SATISFACTION
  Score: ${metrics.userSatisfaction.toFixed(2)}/5
  Target: 4.0+
  Status: ${metrics.userSatisfaction >= 4 ? '✅ PASS' : '⚠️  BELOW TARGET'}

🎓 SOCRATIC METHOD ADHERENCE
  Score: ${metrics.socraticAdherence.toFixed(2)}/10
  Target: 7+
  Status: ${metrics.socraticAdherence >= 7 ? '✅ PASS' : '⚠️  NEEDS IMPROVEMENT'}

📱 MOBILE RESPONSIVENESS
  Score: ${metrics.mobileScore.toFixed(2)}/10
  Target: 8+
  Status: ${metrics.mobileScore >= 8 ? '✅ PASS' : '⚠️  NEEDS WORK'}

════════════════════════════════════════════════════════════
OVERALL STATUS: ${
    avgResponseTime <= PERFORMANCE_SLA.tutor_response &&
    metrics.errorRate <= 0.01 &&
    metrics.userSatisfaction >= 4
      ? '✅ READY FOR PRODUCTION'
      : '⚠️  NEEDS FIXES'
  }
════════════════════════════════════════════════════════════
  `;

  return report;
}

/**
 * Quiz Performance Analyzer
 */
export class QuizPerformanceAnalyzer {
  private quizzes: Array<{
    quizId: string;
    loadTime: number;
    navigationTime: number;
    answerTime: number;
    userScore: number;
  }> = [];

  recordQuizSession(
    quizId: string,
    loadTime: number,
    navigationTime: number,
    answerTime: number,
    userScore: number
  ) {
    this.quizzes.push({
      quizId,
      loadTime,
      navigationTime,
      answerTime,
      userScore,
    });
  }

  getAverageLoadTime(): number {
    if (this.quizzes.length === 0) return 0;
    return this.quizzes.reduce((sum, q) => sum + q.loadTime, 0) / this.quizzes.length;
  }

  getAverageNavigationTime(): number {
    if (this.quizzes.length === 0) return 0;
    return this.quizzes.reduce((sum, q) => sum + q.navigationTime, 0) / this.quizzes.length;
  }

  getAverageAnswerTime(): number {
    if (this.quizzes.length === 0) return 0;
    return this.quizzes.reduce((sum, q) => sum + q.answerTime, 0) / this.quizzes.length;
  }

  getAverageUserScore(): number {
    if (this.quizzes.length === 0) return 0;
    return this.quizzes.reduce((sum, q) => sum + q.userScore, 0) / this.quizzes.length;
  }

  getPerformanceAnalysis() {
    return {
      totalSessions: this.quizzes.length,
      avgLoadTime: this.getAverageLoadTime(),
      avgNavigationTime: this.getAverageNavigationTime(),
      avgAnswerTime: this.getAverageAnswerTime(),
      avgUserScore: this.getAverageUserScore(),
      loadTimeSLA: this.getAverageLoadTime() <= PERFORMANCE_SLA.quiz_load,
      navigationSLA: this.getAverageNavigationTime() <= PERFORMANCE_SLA.quiz_navigation,
    };
  }
}
