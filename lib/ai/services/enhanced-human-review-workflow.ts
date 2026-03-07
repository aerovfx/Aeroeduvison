/**
 * Enhanced Human-in-the-Loop Review Workflow
 * Advanced review system with auto-assignment, reliability tracking, and feedback loop
 */

import { EnhancedGradingResult } from './enhanced-smart-grading';
import { HumanAIComparison, InterRaterReliability } from './enhanced-grading-validator';

/**
 * Reviewer Profile
 */
export interface ReviewerProfile {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'lead_teacher' | 'admin';

  // Expertise
  subjects: string[]; // vietnamese, math, english, etc.
  gradelevels: string[]; // 6, 7, 8, 9, 10, 11, 12
  certifications?: string[];

  // Performance Metrics
  stats: {
    totalReviews: number;
    completedToday: number;
    averageReviewTime: number; // seconds
    accuracy: number; // 0-100, based on calibration
    agreementWithAI: number; // 0-100
    interRaterReliability: number; // 0-1
  };

  // Availability
  availability: {
    status: 'available' | 'busy' | 'offline';
    maxConcurrentTasks: number;
    currentTasks: number;
    workingHours?: { start: string; end: string }; // "08:00", "17:00"
  };

  // Preferences
  preferences: {
    preferredSubjects?: string[];
    preferredGradeLevels?: string[];
    notificationEnabled: boolean;
  };
}

/**
 * Enhanced Review Task
 */
export interface EnhancedReviewTask {
  // Basic Info
  id: string;
  submissionId: string;
  studentId: string;
  studentName?: string;
  assignmentId: string;
  assignmentName: string;

  // Content
  subject: string;
  gradeLevel: string;
  question: string;
  studentAnswer: string;
  attachments?: string[];

  // AI Grading
  aiGrading: EnhancedGradingResult;
  aiConfidence: number;

  // Review Status
  status: 'pending' | 'assigned' | 'in_review' | 'completed' | 'disputed' | 'escalated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignedTo?: string;
  assignedAt?: Date;

  // Review Result
  humanGrading?: {
    reviewerId: string;
    reviewerName: string;
    score: number;
    criteriaScores?: Record<string, number>;
    feedback: string;
    reviewedAt: Date;
    timeSpent: number; // seconds
    confidence: number; // 0-1
  };

  // Comparison & Agreement
  comparison?: HumanAIComparison;
  agreement?: 'agree' | 'minor_diff' | 'major_diff' | 'disagree';

  // Metadata
  createdAt: Date;
  dueBy?: Date;
  completedAt?: Date;
  reviewNotes?: string;
  tags?: string[];

  // Escalation
  escalationHistory?: Array<{
    from: string;
    to: string;
    reason: string;
    timestamp: Date;
  }>;
}

/**
 * Assignment Strategy
 */
export type AssignmentStrategy =
  | 'round_robin'        // Rotate through available reviewers
  | 'least_loaded'       // Assign to reviewer with fewest tasks
  | 'expertise_match'    // Match subject/grade expertise
  | 'performance_based'  // Assign to highest accuracy reviewers
  | 'intelligent';       // Combination of all factors

/**
 * Dashboard Metrics
 */
export interface DashboardMetrics {
  // Queue Overview
  queue: {
    total: number;
    pending: number;
    assigned: number;
    inReview: number;
    completed: number;
    disputed: number;
    byPriority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    bySubject: Record<string, number>;
    averageWaitTime: number; // seconds
    oldestPendingAge: number; // seconds
  };

  // Reviewer Performance
  reviewers: {
    total: number;
    available: number;
    busy: number;
    offline: number;
    topPerformers: Array<{
      id: string;
      name: string;
      accuracy: number;
      reviewsCompleted: number;
    }>;
    needsTraining: string[]; // Reviewers with low accuracy
  };

  // AI Performance
  aiPerformance: {
    averageConfidence: number;
    reviewRate: number; // % requiring human review
    agreementRate: number; // % agreement with humans
    accuracyTrend: 'improving' | 'stable' | 'declining';
    commonIssues: string[];
  };

  // System Health
  health: {
    reviewBacklog: number;
    slaCompliance: number; // % reviewed within SLA
    averageTurnaround: number; // seconds
    peakLoadTime?: string;
  };
}

/**
 * Calibration Data
 */
export interface CalibrationData {
  taskId: string;
  subject: string;
  aiScore: number;
  humanScore: number;
  difference: number;
  aiCriteria: Record<string, number>;
  humanCriteria?: Record<string, number>;
  timestamp: Date;
  reviewerId: string;
}

/**
 * Enhanced Human Review Workflow
 */
export class EnhancedHumanReviewWorkflow {
  private reviewers: Map<string, ReviewerProfile> = new Map();
  private tasks: Map<string, EnhancedReviewTask> = new Map();
  private calibrationLog: CalibrationData[] = [];
  private assignmentStrategy: AssignmentStrategy = 'intelligent';

  constructor(
    private redis?: any,
    strategy?: AssignmentStrategy
  ) {
    if (strategy) {
      this.assignmentStrategy = strategy;
    }
  }

  /**
   * Register a reviewer
   */
  async registerReviewer(profile: ReviewerProfile): Promise<void> {
    this.reviewers.set(profile.id, profile);

    if (this.redis) {
      const key = `review:reviewer:${profile.id}`;
      await this.redis.set(key, JSON.stringify(profile));
    }

    console.log(`👤 Registered reviewer: ${profile.name} (${profile.subjects.join(', ')})`);
  }

  /**
   * Add task to review queue with auto-assignment
   */
  async addTaskForReview(
    task: Omit<EnhancedReviewTask, 'id' | 'status' | 'createdAt'>
  ): Promise<EnhancedReviewTask> {
    const reviewTask: EnhancedReviewTask = {
      ...task,
      id: this.generateTaskId(),
      status: 'pending',
      createdAt: new Date(),
      dueBy: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    // Determine priority
    reviewTask.priority = this.calculatePriority(reviewTask);

    // Store task
    this.tasks.set(reviewTask.id, reviewTask);

    if (this.redis) {
      const taskKey = `review:task:${reviewTask.id}`;
      await this.redis.set(taskKey, JSON.stringify(reviewTask));

      // Add to priority queue
      const queueKey = `review:queue:${reviewTask.priority}`;
      await this.redis.zadd(queueKey, reviewTask.createdAt.getTime(), reviewTask.id);
    }

    // Try auto-assignment
    await this.autoAssignTask(reviewTask.id);

    return reviewTask;
  }

  /**
   * Auto-assign task to best available reviewer
   */
  async autoAssignTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return false;
    }

    const bestReviewer = await this.findBestReviewer(task);

    if (!bestReviewer) {
      console.log(`⏳ No available reviewer for task ${taskId}`);
      return false;
    }

    return await this.assignTaskToReviewer(taskId, bestReviewer.id);
  }

  /**
   * Assign task to specific reviewer
   */
  async assignTaskToReviewer(
    taskId: string,
    reviewerId: string
  ): Promise<boolean> {
    const task = this.tasks.get(taskId);
    const reviewer = this.reviewers.get(reviewerId);

    if (!task || !reviewer) {
      return false;
    }

    if (reviewer.availability.currentTasks >= reviewer.availability.maxConcurrentTasks) {
      console.log(`❌ Reviewer ${reviewer.name} at max capacity`);
      return false;
    }

    // Update task
    task.status = 'assigned';
    task.assignedTo = reviewerId;
    task.assignedAt = new Date();

    // Update reviewer
    reviewer.availability.currentTasks++;

    this.tasks.set(taskId, task);
    this.reviewers.set(reviewerId, reviewer);

    if (this.redis) {
      await this.redis.set(`review:task:${taskId}`, JSON.stringify(task));
      await this.redis.set(`review:reviewer:${reviewerId}`, JSON.stringify(reviewer));

      // Remove from queue
      const queueKey = `review:queue:${task.priority}`;
      await this.redis.zrem(queueKey, taskId);
    }

    console.log(`✅ Assigned task ${taskId} to ${reviewer.name}`);

    // Send notification (if enabled)
    if (reviewer.preferences.notificationEnabled) {
      await this.notifyReviewer(reviewer, task);
    }

    return true;
  }

  /**
   * Submit human review
   */
  async submitReview(
    taskId: string,
    reviewerId: string,
    review: {
      score: number;
      criteriaScores?: Record<string, number>;
      feedback: string;
      confidence: number;
      notes?: string;
      timeSpent: number;
    }
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    const reviewer = this.reviewers.get(reviewerId);

    if (!task || !reviewer || task.assignedTo !== reviewerId) {
      throw new Error('Invalid task or reviewer');
    }

    // Update task with human grading
    task.humanGrading = {
      reviewerId,
      reviewerName: reviewer.name,
      score: review.score,
      criteriaScores: review.criteriaScores,
      feedback: review.feedback,
      reviewedAt: new Date(),
      timeSpent: review.timeSpent,
      confidence: review.confidence,
    };

    task.status = 'completed';
    task.completedAt = new Date();
    task.reviewNotes = review.notes;

    // Calculate agreement
    const scoreDiff = Math.abs(task.aiGrading.totalScore - review.score);
    task.agreement = this.classifyAgreement(scoreDiff);

    // Update reviewer stats
    reviewer.stats.totalReviews++;
    reviewer.stats.completedToday++;
    reviewer.availability.currentTasks--;

    const totalTime = reviewer.stats.averageReviewTime * (reviewer.stats.totalReviews - 1) + review.timeSpent;
    reviewer.stats.averageReviewTime = totalTime / reviewer.stats.totalReviews;

    // Update agreement with AI
    const agreementPoints = task.agreement === 'agree' ? 100 : task.agreement === 'minor_diff' ? 75 : 0;
    reviewer.stats.agreementWithAI =
      (reviewer.stats.agreementWithAI * (reviewer.stats.totalReviews - 1) + agreementPoints) /
      reviewer.stats.totalReviews;

    // Save updates
    this.tasks.set(taskId, task);
    this.reviewers.set(reviewerId, reviewer);

    if (this.redis) {
      await this.redis.set(`review:task:${taskId}`, JSON.stringify(task));
      await this.redis.set(`review:reviewer:${reviewerId}`, JSON.stringify(reviewer));
    }

    // Log for calibration
    await this.logCalibration({
      taskId,
      subject: task.subject,
      aiScore: task.aiGrading.totalScore,
      humanScore: review.score,
      difference: task.aiGrading.totalScore - review.score,
      aiCriteria: this.criteriaArrayToObject(task.aiGrading.criteriaScores),
      humanCriteria: review.criteriaScores,
      timestamp: new Date(),
      reviewerId,
    });

    console.log(`✅ Review completed for task ${taskId} by ${reviewer.name}`);
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const allTasks = Array.from(this.tasks.values());
    const allReviewers = Array.from(this.reviewers.values());

    // Queue metrics
    const queue = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'pending').length,
      assigned: allTasks.filter(t => t.status === 'assigned').length,
      inReview: allTasks.filter(t => t.status === 'in_review').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      disputed: allTasks.filter(t => t.status === 'disputed').length,
      byPriority: {
        critical: allTasks.filter(t => t.priority === 'critical').length,
        high: allTasks.filter(t => t.priority === 'high').length,
        medium: allTasks.filter(t => t.priority === 'medium').length,
        low: allTasks.filter(t => t.priority === 'low').length,
      },
      bySubject: this.groupBySubject(allTasks),
      averageWaitTime: this.calculateAverageWaitTime(allTasks),
      oldestPendingAge: this.getOldestPendingAge(allTasks),
    };

    // Reviewer metrics
    const topPerformers = allReviewers
      .sort((a, b) => b.stats.accuracy - a.stats.accuracy)
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        name: r.name,
        accuracy: r.stats.accuracy,
        reviewsCompleted: r.stats.totalReviews,
      }));

    const needsTraining = allReviewers
      .filter(r => r.stats.accuracy < 70 && r.stats.totalReviews >= 10)
      .map(r => r.id);

    const reviewers = {
      total: allReviewers.length,
      available: allReviewers.filter(r => r.availability.status === 'available').length,
      busy: allReviewers.filter(r => r.availability.status === 'busy').length,
      offline: allReviewers.filter(r => r.availability.status === 'offline').length,
      topPerformers,
      needsTraining,
    };

    // AI performance
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const aiPerformance = {
      averageConfidence: this.calculateAverageConfidence(allTasks),
      reviewRate: (allTasks.length / (allTasks.length + 1000)) * 100, // Assuming 1000 auto-graded
      agreementRate: this.calculateAgreementRate(completedTasks),
      accuracyTrend: this.analyzeAccuracyTrend(),
      commonIssues: this.identifyCommonIssues(completedTasks),
    };

    // System health
    const health = {
      reviewBacklog: queue.pending + queue.assigned,
      slaCompliance: this.calculateSLACompliance(completedTasks),
      averageTurnaround: this.calculateAverageTurnaround(completedTasks),
      peakLoadTime: this.identifyPeakLoadTime(allTasks),
    };

    return {
      queue,
      reviewers,
      aiPerformance,
      health,
    };
  }

  /**
   * Calculate inter-rater reliability
   */
  async calculateInterRaterReliability(): Promise<InterRaterReliability> {
    // This would use EnhancedGradingValidator
    // For now, return a simplified version

    const completedTasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'completed' && t.humanGrading
    );

    if (completedTasks.length < 30) {
      throw new Error('Insufficient data for reliability calculation (need at least 30 reviews)');
    }

    const aiScores = completedTasks.map(t => t.aiGrading.totalScore);
    const humanScores = completedTasks.map(t => t.humanGrading!.score);

    const pearsonCorrelation = this.calculatePearsonCorrelation(aiScores, humanScores);
    const mae = aiScores.reduce((sum, ai, i) => sum + Math.abs(ai - humanScores[i]), 0) / aiScores.length;

    return {
      pearsonCorrelation,
      spearmanCorrelation: pearsonCorrelation, // Simplified
      cohensKappa: 0.7, // Simplified
      intraclassCorrelation: pearsonCorrelation,
      meanAbsoluteError: mae,
      rootMeanSquaredError: Math.sqrt(
        aiScores.reduce((sum, ai, i) => sum + Math.pow(ai - humanScores[i], 2), 0) / aiScores.length
      ),
      meanAbsolutePercentageError: (mae / 10) * 100,
      agreementLevel: pearsonCorrelation >= 0.9 ? 'excellent' : pearsonCorrelation >= 0.75 ? 'good' : 'moderate',
      passFailAgreement: this.calculatePassFailAgreement(aiScores, humanScores),
      interpretation: `Correlation: ${pearsonCorrelation.toFixed(2)}, MAE: ${mae.toFixed(2)}`,
      readyForProduction: pearsonCorrelation >= 0.8 && mae <= 1.0,
    };
  }

  /**
   * Get calibration insights
   */
  async getCalibrationInsights(): Promise<{
    totalComparisons: number;
    aiTendency: 'higher' | 'lower' | 'neutral';
    averageDifference: number;
    bySubject: Record<string, { difference: number; count: number }>;
    recommendations: string[];
  }> {
    if (this.calibrationLog.length === 0) {
      return {
        totalComparisons: 0,
        aiTendency: 'neutral',
        averageDifference: 0,
        bySubject: {},
        recommendations: ['Need more calibration data'],
      };
    }

    const totalComparisons = this.calibrationLog.length;
    const averageDifference =
      this.calibrationLog.reduce((sum, c) => sum + c.difference, 0) / totalComparisons;

    const aiTendency =
      Math.abs(averageDifference) < 0.5 ? 'neutral' :
      averageDifference > 0 ? 'higher' : 'lower';

    // Group by subject
    const bySubject: Record<string, { difference: number; count: number }> = {};
    for (const cal of this.calibrationLog) {
      if (!bySubject[cal.subject]) {
        bySubject[cal.subject] = { difference: 0, count: 0 };
      }
      bySubject[cal.subject].difference += cal.difference;
      bySubject[cal.subject].count++;
    }

    for (const subject in bySubject) {
      bySubject[subject].difference /= bySubject[subject].count;
    }

    // Recommendations
    const recommendations: string[] = [];

    if (Math.abs(averageDifference) > 1) {
      recommendations.push(
        `AI tends to score ${aiTendency === 'higher' ? 'higher' : 'lower'} by ${Math.abs(averageDifference).toFixed(1)} points on average`
      );
      recommendations.push('Consider adjusting AI prompts or temperature');
    }

    for (const [subject, data] of Object.entries(bySubject)) {
      if (Math.abs(data.difference) > 1.5) {
        recommendations.push(`${subject}: High discrepancy (${data.difference.toFixed(1)} points) - review rubric`);
      }
    }

    if (totalComparisons < 50) {
      recommendations.push('Collect more calibration data for better insights');
    }

    return {
      totalComparisons,
      aiTendency,
      averageDifference,
      bySubject,
      recommendations,
    };
  }

  /**
   * Find best reviewer using intelligent strategy
   */
  private async findBestReviewer(task: EnhancedReviewTask): Promise<ReviewerProfile | null> {
    const availableReviewers = Array.from(this.reviewers.values()).filter(
      r => r.availability.status === 'available' &&
           r.availability.currentTasks < r.availability.maxConcurrentTasks
    );

    if (availableReviewers.length === 0) {
      return null;
    }

    switch (this.assignmentStrategy) {
      case 'round_robin':
        return availableReviewers[0];

      case 'least_loaded':
        return availableReviewers.sort(
          (a, b) => a.availability.currentTasks - b.availability.currentTasks
        )[0];

      case 'expertise_match':
        return this.findExpertiseMatch(task, availableReviewers);

      case 'performance_based':
        return availableReviewers.sort(
          (a, b) => b.stats.accuracy - a.stats.accuracy
        )[0];

      case 'intelligent':
        return this.intelligentMatch(task, availableReviewers);

      default:
        return availableReviewers[0];
    }
  }

  /**
   * Find reviewer with matching expertise
   */
  private findExpertiseMatch(
    task: EnhancedReviewTask,
    reviewers: ReviewerProfile[]
  ): ReviewerProfile | null {
    const matched = reviewers.filter(
      r => r.subjects.includes(task.subject) &&
           r.gradelevels.includes(task.gradeLevel)
    );

    if (matched.length === 0) {
      return reviewers[0]; // Fallback to any available
    }

    return matched[0];
  }

  /**
   * Intelligent matching combining multiple factors
   */
  private intelligentMatch(
    task: EnhancedReviewTask,
    reviewers: ReviewerProfile[]
  ): ReviewerProfile {
    const scores = reviewers.map(reviewer => {
      let score = 0;

      // Expertise match (40%)
      if (reviewer.subjects.includes(task.subject)) score += 40;
      if (reviewer.gradelevels.includes(task.gradeLevel)) score += 20;

      // Workload (30%)
      const loadFactor = 1 - (reviewer.availability.currentTasks / reviewer.availability.maxConcurrentTasks);
      score += loadFactor * 30;

      // Performance (30%)
      score += (reviewer.stats.accuracy / 100) * 30;

      return { reviewer, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].reviewer;
  }

  /**
   * Calculate task priority
   */
  private calculatePriority(task: EnhancedReviewTask): EnhancedReviewTask['priority'] {
    // Critical: very low confidence or extreme scores
    if (task.aiConfidence < 0.5 || task.aiGrading.totalScore >= 9.5 || task.aiGrading.totalScore <= 1) {
      return 'critical';
    }

    // High: low confidence or near pass/fail
    if (task.aiConfidence < 0.7 || Math.abs(task.aiGrading.totalScore - 5) < 1) {
      return 'high';
    }

    // Medium: moderate confidence
    if (task.aiConfidence < 0.85) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Classify agreement level
   */
  private classifyAgreement(scoreDiff: number): EnhancedReviewTask['agreement'] {
    if (scoreDiff <= 0.5) return 'agree';
    if (scoreDiff <= 1.5) return 'minor_diff';
    if (scoreDiff <= 2.5) return 'major_diff';
    return 'disagree';
  }

  /**
   * Log calibration data
   */
  private async logCalibration(data: CalibrationData): Promise<void> {
    this.calibrationLog.push(data);

    if (this.redis) {
      const key = `review:calibration:${data.taskId}`;
      await this.redis.set(key, JSON.stringify(data));
      await this.redis.expire(key, 90 * 24 * 60 * 60); // 90 days
    }
  }

  /**
   * Helper: Notify reviewer
   */
  private async notifyReviewer(
    reviewer: ReviewerProfile,
    task: EnhancedReviewTask
  ): Promise<void> {
    // In production, would send email/push notification
    console.log(`📧 Notification sent to ${reviewer.email}: New ${task.priority} priority review task`);
  }

  /**
   * Helper: Group tasks by subject
   */
  private groupBySubject(tasks: EnhancedReviewTask[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const task of tasks) {
      groups[task.subject] = (groups[task.subject] || 0) + 1;
    }
    return groups;
  }

  /**
   * Helper: Calculate average wait time
   */
  private calculateAverageWaitTime(tasks: EnhancedReviewTask[]): number {
    const pending = tasks.filter(t => t.status === 'pending');
    if (pending.length === 0) return 0;

    const totalWait = pending.reduce(
      (sum, t) => sum + (Date.now() - t.createdAt.getTime()),
      0
    );

    return totalWait / pending.length / 1000; // seconds
  }

  /**
   * Helper: Get oldest pending age
   */
  private getOldestPendingAge(tasks: EnhancedReviewTask[]): number {
    const pending = tasks.filter(t => t.status === 'pending');
    if (pending.length === 0) return 0;

    const oldest = Math.min(...pending.map(t => t.createdAt.getTime()));
    return (Date.now() - oldest) / 1000; // seconds
  }

  /**
   * Helper: Calculate average confidence
   */
  private calculateAverageConfidence(tasks: EnhancedReviewTask[]): number {
    if (tasks.length === 0) return 0;
    return tasks.reduce((sum, t) => sum + t.aiConfidence, 0) / tasks.length;
  }

  /**
   * Helper: Calculate agreement rate
   */
  private calculateAgreementRate(tasks: EnhancedReviewTask[]): number {
    const withAgreement = tasks.filter(t => t.agreement);
    if (withAgreement.length === 0) return 0;

    const agreed = withAgreement.filter(
      t => t.agreement === 'agree' || t.agreement === 'minor_diff'
    ).length;

    return (agreed / withAgreement.length) * 100;
  }

  /**
   * Helper: Analyze accuracy trend
   */
  private analyzeAccuracyTrend(): 'improving' | 'stable' | 'declining' {
    // Simplified - would compare recent vs older data
    return 'stable';
  }

  /**
   * Helper: Identify common issues
   */
  private identifyCommonIssues(tasks: EnhancedReviewTask[]): string[] {
    const disagreements = tasks.filter(t => t.agreement === 'major_diff' || t.agreement === 'disagree');

    const issues: string[] = [];

    if (disagreements.length > tasks.length * 0.2) {
      issues.push('High disagreement rate with humans');
    }

    return issues.length > 0 ? issues : ['No major issues detected'];
  }

  /**
   * Helper: Calculate SLA compliance
   */
  private calculateSLACompliance(tasks: EnhancedReviewTask[]): number {
    const withDueDate = tasks.filter(t => t.dueBy && t.completedAt);
    if (withDueDate.length === 0) return 100;

    const onTime = withDueDate.filter(t => t.completedAt! <= t.dueBy!).length;
    return (onTime / withDueDate.length) * 100;
  }

  /**
   * Helper: Calculate average turnaround
   */
  private calculateAverageTurnaround(tasks: EnhancedReviewTask[]): number {
    const completed = tasks.filter(t => t.completedAt);
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce(
      (sum, t) => sum + (t.completedAt!.getTime() - t.createdAt.getTime()),
      0
    );

    return totalTime / completed.length / 1000; // seconds
  }

  /**
   * Helper: Identify peak load time
   */
  private identifyPeakLoadTime(tasks: EnhancedReviewTask[]): string | undefined {
    // Simplified - would analyze creation times
    return undefined;
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
   * Helper: Pass/Fail agreement
   */
  private calculatePassFailAgreement(aiScores: number[], humanScores: number[]): number {
    let agree = 0;
    for (let i = 0; i < aiScores.length; i++) {
      const aiPass = aiScores[i] >= 5;
      const humanPass = humanScores[i] >= 5;
      if (aiPass === humanPass) agree++;
    }
    return (agree / aiScores.length) * 100;
  }

  /**
   * Helper: Criteria array to object
   */
  private criteriaArrayToObject(criteria: Array<{ name: string; score: number }>): Record<string, number> {
    const obj: Record<string, number> = {};
    for (const c of criteria) {
      obj[c.name] = c.score;
    }
    return obj;
  }

  /**
   * Helper: Generate task ID
   */
  private generateTaskId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create enhanced workflow instance
 */
export function createEnhancedHumanReviewWorkflow(
  redis?: any,
  strategy?: AssignmentStrategy
): EnhancedHumanReviewWorkflow {
  return new EnhancedHumanReviewWorkflow(redis, strategy);
}
