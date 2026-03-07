/**
 * XP Analytics Service
 * 
 * Transforms XP from simple points into intelligent signals for AI.
 * Analyzes: Capability, Learning Speed, Motivation
 */

import { XPVectors, PersonalLearningGraph, AttemptHistory } from '../plg/types';

// ============================================================================
// XP Signal Types
// ============================================================================

export interface XPSignal {
  // Core Metrics
  totalXP: number;
  level: number; // Calculated from total XP
  
  // Capability Signals (Năng lực)
  capability: CapabilitySignal;
  
  // Learning Speed Signals (Tốc độ học)
  learningSpeed: LearningSpeedSignal;
  
  // Motivation Signals (Động lực)
  motivation: MotivationSignal;
  
  // Engagement Quality
  engagement: EngagementSignal;
  
  // Trends
  trends: TrendSignal;
  
  // AI Recommendations
  aiInsights: AIInsight[];
}

export interface CapabilitySignal {
  // Overall ability score (0-100)
  overallScore: number;
  
  // Breakdown by dimension
  cognitive: number;      // logic + memory + creativity
  metacognitive: number;  // metacognition + critical thinking
  behavioral: number;     // persistence + independence + collaboration
  
  // Mastery distribution
  expertSkills: number;      // Skills at expert level
  advancedSkills: number;
  intermediateSkills: number;
  beginnerSkills: number;
  
  // Performance consistency
  consistency: number; // How stable is their performance
  
  // Peak performance
  peakScore: number; // Best score ever achieved
  
  // Current form
  recentPerformance: number; // Last 10 activities average
}

export interface LearningSpeedSignal {
  // XP velocity (XP per hour)
  xpPerHour: number;
  
  // Time to mastery (average)
  avgTimeToMastery: number; // hours to reach 80% mastery
  
  // Learning curve slope
  learningCurveSlope: number; // Positive = improving, negative = declining
  
  // Efficiency
  efficiency: number; // XP gained per time spent (high = fast learner)
  
  // Acceleration
  acceleration: number; // Is speed increasing or decreasing?
  
  // Comparison to peers
  percentile: number; // 0-100, where they rank among peers
  
  // Optimal pace
  optimalPace: 'slow' | 'normal' | 'fast' | 'very_fast';
}

export interface MotivationSignal {
  // Overall motivation score (0-100)
  score: number;
  
  // Indicators
  streakConsistency: number;   // How often they maintain streaks
  voluntaryPractice: number;   // Practice beyond requirements
  challengeSeeking: number;    // Do they seek harder problems?
  curiosityScore: number;      // Exploration behavior
  
  // Engagement patterns
  activeHours: number;         // Hours active per week
  sessionFrequency: number;    // Sessions per week
  avgSessionDuration: number;  // Minutes per session
  
  // Emotional indicators
  positiveEmotionRatio: number; // excited + focused / total
  frustrationTolerance: number; // Continue after failure?
  
  // Goals
  goalsSet: number;
  goalsCompleted: number;
  goalCompletionRate: number;
  
  // Trend
  motivationTrend: 'increasing' | 'stable' | 'decreasing' | 'volatile';
}

export interface EngagementSignal {
  // Quality metrics
  focusQuality: number;        // Time in focused state / total time
  deepWorkRatio: number;       // Long sessions / total sessions
  completionRate: number;      // Completed / started
  
  // Interaction quality
  thoughtfulnessScore: number; // Time spent thinking vs rushing
  independenceScore: number;   // Solving without hints
  creativityScore: number;     // Original solutions
  
  // Consistency
  regularityScore: number;     // How regular is their schedule
  commitmentScore: number;     // Follow-through on goals
}

export interface TrendSignal {
  // Direction
  overall: 'improving' | 'stable' | 'declining';
  
  // Specific trends
  xpTrend: TrendDirection;
  performanceTrend: TrendDirection;
  motivationTrend: TrendDirection;
  speedTrend: TrendDirection;
  
  // Predictions
  predictedNextWeekXP: number;
  predictedMasteryIn30Days: number;
  
  // Risk flags
  atRisk: boolean;
  riskFactors: string[];
  
  // Opportunities
  readyForAdvancement: boolean;
  recommendedChallenges: string[];
}

export interface TrendDirection {
  direction: 'up' | 'down' | 'stable' | 'volatile';
  strength: number; // 0-1, how strong is the trend
  confidence: number; // 0-1, how confident are we
  changeRate: number; // % change per week
}

export interface AIInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'risk' | 'recommendation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionable: boolean;
  suggestedAction?: string;
  evidence: string[]; // What data supports this insight
}

// ============================================================================
// XP Analytics Service
// ============================================================================

export class XPAnalytics {
  /**
   * Analyze student's XP and generate comprehensive signal
   */
  analyzeXP(plg: PersonalLearningGraph): XPSignal {
    const xp = plg.xpVectors;
    
    return {
      totalXP: xp.total,
      level: this.calculateLevel(xp.total),
      capability: this.analyzeCapability(plg),
      learningSpeed: this.analyzeLearningSpeed(plg),
      motivation: this.analyzeMotivation(plg),
      engagement: this.analyzeEngagement(plg),
      trends: this.analyzeTrends(plg),
      aiInsights: this.generateAIInsights(plg),
    };
  }

  /**
   * Calculate level from total XP (gamification)
   */
  private calculateLevel(totalXP: number): number {
    // Exponential curve: level = floor(sqrt(totalXP / 100))
    // Level 1: 100 XP
    // Level 2: 400 XP
    // Level 3: 900 XP
    // Level 10: 10,000 XP
    return Math.floor(Math.sqrt(totalXP / 100));
  }

  /**
   * Analyze capability (năng lực)
   */
  private analyzeCapability(plg: PersonalLearningGraph): CapabilitySignal {
    const xp = plg.xpVectors;
    const skills = plg.skills;
    
    // Calculate dimensional scores
    const cognitive = (xp.logic + xp.memory + xp.creativity) / 3;
    const metacognitive = (xp.metacognition + xp.criticalThinking) / 2;
    const behavioral = (xp.persistence + xp.independence + xp.collaboration) / 3;
    
    // Overall score (weighted average)
    const overallScore = (cognitive * 0.4 + metacognitive * 0.3 + behavioral * 0.3);
    
    // Mastery distribution
    const masteryDistribution = this.getMasteryDistribution(skills);
    
    // Consistency (std deviation of recent scores)
    const recentScores = skills.flatMap(s => 
      s.attempts.slice(-5).map(a => a.score)
    );
    const consistency = 100 - this.standardDeviation(recentScores);
    
    // Peak performance
    const allScores = skills.flatMap(s => s.attempts.map(a => a.score));
    const peakScore = allScores.length > 0 ? Math.max(...allScores) : 0;
    
    // Recent performance (last 10 attempts)
    const recentAttempts = skills.flatMap(s => s.attempts).slice(-10);
    const recentPerformance = recentAttempts.length > 0
      ? recentAttempts.reduce((sum, a) => sum + a.score, 0) / recentAttempts.length
      : 0;
    
    return {
      overallScore,
      cognitive: this.normalizeXP(cognitive),
      metacognitive: this.normalizeXP(metacognitive),
      behavioral: this.normalizeXP(behavioral),
      expertSkills: masteryDistribution.expert,
      advancedSkills: masteryDistribution.advanced,
      intermediateSkills: masteryDistribution.intermediate,
      beginnerSkills: masteryDistribution.beginner,
      consistency,
      peakScore,
      recentPerformance,
    };
  }

  /**
   * Analyze learning speed (tốc độ học)
   */
  private analyzeLearningSpeed(plg: PersonalLearningGraph): LearningSpeedSignal {
    const skills = plg.skills;
    const xp = plg.xpVectors;
    
    // Calculate XP per hour
    const totalPracticeTime = skills.reduce((sum, s) => sum + s.totalPracticeTime, 0);
    const xpPerHour = totalPracticeTime > 0 ? xp.total / totalPracticeTime * 60 : 0;
    
    // Average time to mastery
    const masteredSkills = skills.filter(s => s.mastery >= 80);
    const avgTimeToMastery = masteredSkills.length > 0
      ? masteredSkills.reduce((sum, s) => sum + s.totalPracticeTime, 0) / masteredSkills.length
      : 0;
    
    // Learning curve slope (XP growth rate)
    const xpHistory = this.getXPHistory(plg);
    const learningCurveSlope = this.calculateSlope(xpHistory);
    
    // Efficiency (XP per minute)
    const efficiency = totalPracticeTime > 0 ? xp.total / totalPracticeTime : 0;
    
    // Acceleration (is slope increasing?)
    const recentSlope = this.calculateSlope(xpHistory.slice(-7)); // Last week
    const earlierSlope = this.calculateSlope(xpHistory.slice(-14, -7)); // Week before
    const acceleration = recentSlope - earlierSlope;
    
    // Determine optimal pace
    let optimalPace: 'slow' | 'normal' | 'fast' | 'very_fast';
    if (xpPerHour > 100) optimalPace = 'very_fast';
    else if (xpPerHour > 50) optimalPace = 'fast';
    else if (xpPerHour > 20) optimalPace = 'normal';
    else optimalPace = 'slow';
    
    return {
      xpPerHour,
      avgTimeToMastery,
      learningCurveSlope,
      efficiency,
      acceleration,
      percentile: 50, // TODO: Compare with peers
      optimalPace,
    };
  }

  /**
   * Analyze motivation (động lực)
   */
  private analyzeMotivation(plg: PersonalLearningGraph): MotivationSignal {
    const streaks = plg.streaks;
    const emotions = plg.emotionHistory;
    const goals = plg.goals;
    const xp = plg.xpVectors;
    
    // Streak consistency
    const avgStreak = streaks.streakHistory.length > 0
      ? streaks.streakHistory.reduce((sum, s) => sum + s.xpEarned, 0) / streaks.streakHistory.length
      : 0;
    const streakConsistency = Math.min(100, (streaks.current / streaks.longest) * 100);
    
    // Voluntary practice (curiosity XP)
    const voluntaryPractice = this.normalizeXP(xp.curiosity);
    
    // Challenge seeking (attempting hard problems)
    const challengeSeeking = this.normalizeXP(xp.confidence);
    
    // Curiosity score
    const curiosityScore = this.normalizeXP(xp.curiosity);
    
    // Active hours per week
    const activeHours = streaks.streakHistory.slice(-7).reduce((sum, s) => 
      sum + s.lessonsCompleted * 0.75, 0 // Assume 45 min per lesson
    );
    
    // Session frequency
    const sessionFrequency = streaks.streakHistory.slice(-7).length;
    
    // Average session duration
    const avgSessionDuration = activeHours > 0 ? (activeHours * 60) / sessionFrequency : 0;
    
    // Positive emotion ratio
    const positiveEmotions = emotions.filter(e => 
      e.emotion.primary === 'excited' || e.emotion.primary === 'focused' || e.emotion.primary === 'satisfied'
    ).length;
    const positiveEmotionRatio = emotions.length > 0 ? positiveEmotions / emotions.length : 0.5;
    
    // Frustration tolerance (persistence)
    const frustrationTolerance = this.normalizeXP(xp.persistence);
    
    // Goals
    const goalsSet = goals.length;
    const goalsCompleted = goals.filter(g => g.status === 'completed').length;
    const goalCompletionRate = goalsSet > 0 ? goalsCompleted / goalsSet : 0;
    
    // Overall motivation score
    const score = (
      streakConsistency * 0.2 +
      voluntaryPractice * 0.15 +
      challengeSeeking * 0.15 +
      curiosityScore * 0.1 +
      positiveEmotionRatio * 100 * 0.2 +
      frustrationTolerance * 0.1 +
      goalCompletionRate * 100 * 0.1
    );
    
    // Motivation trend
    const recentScore = this.calculateRecentMotivation(plg, 7);
    const earlierScore = this.calculateRecentMotivation(plg, 14);
    let motivationTrend: 'increasing' | 'stable' | 'decreasing' | 'volatile';
    const diff = recentScore - earlierScore;
    if (Math.abs(diff) < 5) motivationTrend = 'stable';
    else if (diff > 10) motivationTrend = 'increasing';
    else if (diff < -10) motivationTrend = 'decreasing';
    else motivationTrend = 'volatile';
    
    return {
      score,
      streakConsistency,
      voluntaryPractice,
      challengeSeeking,
      curiosityScore,
      activeHours,
      sessionFrequency,
      avgSessionDuration,
      positiveEmotionRatio,
      frustrationTolerance,
      goalsSet,
      goalsCompleted,
      goalCompletionRate,
      motivationTrend,
    };
  }

  /**
   * Analyze engagement quality
   */
  private analyzeEngagement(plg: PersonalLearningGraph): EngagementSignal {
    const emotions = plg.emotionHistory;
    const xp = plg.xpVectors;
    const skills = plg.skills;
    
    // Focus quality
    const focusedTime = emotions.filter(e => e.emotion.primary === 'focused')
      .reduce((sum, e) => sum + e.duration, 0);
    const totalTime = emotions.reduce((sum, e) => sum + e.duration, 0);
    const focusQuality = totalTime > 0 ? focusedTime / totalTime : 0;
    
    // Deep work ratio (sessions > 30 minutes)
    const longSessions = emotions.filter(e => e.duration > 1800); // 30 min
    const deepWorkRatio = emotions.length > 0 ? longSessions.length / emotions.length : 0;
    
    // Completion rate
    const completedSkills = skills.filter(s => s.mastery >= 80).length;
    const completionRate = skills.length > 0 ? completedSkills / skills.length : 0;
    
    // Thoughtfulness (not rushing)
    const avgTimePerAttempt = skills.flatMap(s => s.attempts)
      .reduce((sum, a, _, arr) => sum + a.timeSpent / arr.length, 0);
    const thoughtfulnessScore = Math.min(100, avgTimePerAttempt / 120 * 100); // 2 min = 100%
    
    // Independence
    const independenceScore = this.normalizeXP(xp.independence);
    
    // Creativity
    const creativityScore = this.normalizeXP(xp.creativity);
    
    // Regularity
    const regularityScore = this.normalizeXP(xp.consistency);
    
    // Commitment
    const commitmentScore = this.normalizeXP(xp.persistence);
    
    return {
      focusQuality,
      deepWorkRatio,
      completionRate,
      thoughtfulnessScore,
      independenceScore,
      creativityScore,
      regularityScore,
      commitmentScore,
    };
  }

  /**
   * Analyze trends and predictions
   */
  private analyzeTrends(plg: PersonalLearningGraph): TrendSignal {
    const xpHistory = this.getXPHistory(plg);
    const performanceHistory = this.getPerformanceHistory(plg);
    
    // XP trend
    const xpTrend = this.calculateTrend(xpHistory);
    
    // Performance trend
    const performanceTrend = this.calculateTrend(performanceHistory);
    
    // Motivation trend (already calculated)
    const motivationSignal = this.analyzeMotivation(plg);
    const motivationTrend = this.calculateTrendFromMotivation(motivationSignal.motivationTrend);
    
    // Speed trend
    const speedHistory = this.getSpeedHistory(plg);
    const speedTrend = this.calculateTrend(speedHistory);
    
    // Overall trend
    const overall = this.determineOverallTrend(xpTrend, performanceTrend, motivationTrend);
    
    // Predictions
    const predictedNextWeekXP = this.predictXP(xpHistory, 7);
    const predictedMasteryIn30Days = this.predictMastery(plg, 30);
    
    // Risk assessment
    const { atRisk, riskFactors } = this.assessRisk(plg, performanceTrend, motivationTrend);
    
    // Opportunities
    const { readyForAdvancement, recommendedChallenges } = this.identifyOpportunities(plg);
    
    return {
      overall,
      xpTrend,
      performanceTrend,
      motivationTrend,
      speedTrend,
      predictedNextWeekXP,
      predictedMasteryIn30Days,
      atRisk,
      riskFactors,
      readyForAdvancement,
      recommendedChallenges,
    };
  }

  /**
   * Generate AI insights
   */
  private generateAIInsights(plg: PersonalLearningGraph): AIInsight[] {
    const insights: AIInsight[] = [];
    const capability = this.analyzeCapability(plg);
    const speed = this.analyzeLearningSpeed(plg);
    const motivation = this.analyzeMotivation(plg);
    const trends = this.analyzeTrends(plg);
    
    // Strength: High performance
    if (capability.recentPerformance >= 85) {
      insights.push({
        type: 'strength',
        priority: 'medium',
        title: 'Excellent Performance',
        description: `Recent performance is ${capability.recentPerformance.toFixed(1)}% - well above average!`,
        actionable: true,
        suggestedAction: 'Consider advancing to more challenging content',
        evidence: [`Recent performance: ${capability.recentPerformance}%`, `Peak score: ${capability.peakScore}%`],
      });
    }
    
    // Weakness: Declining performance
    if (trends.performanceTrend.direction === 'down' && trends.performanceTrend.strength > 0.5) {
      insights.push({
        type: 'weakness',
        priority: 'high',
        title: 'Performance Declining',
        description: `Performance has dropped ${Math.abs(trends.performanceTrend.changeRate).toFixed(1)}% recently`,
        actionable: true,
        suggestedAction: 'Review fundamentals and reduce difficulty temporarily',
        evidence: [`Trend: ${trends.performanceTrend.direction}`, `Change rate: ${trends.performanceTrend.changeRate}%`],
      });
    }
    
    // Opportunity: Ready for advancement
    if (trends.readyForAdvancement) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        title: 'Ready for Next Level',
        description: 'Student shows strong mastery and high motivation - ready for more advanced content',
        actionable: true,
        suggestedAction: `Try: ${trends.recommendedChallenges.join(', ')}`,
        evidence: [`Mastery: ${capability.overallScore.toFixed(1)}%`, `Motivation: ${motivation.score.toFixed(1)}%`],
      });
    }
    
    // Risk: Low motivation
    if (motivation.score < 40) {
      insights.push({
        type: 'risk',
        priority: 'urgent',
        title: 'Low Motivation Detected',
        description: 'Student engagement is declining - intervention needed',
        actionable: true,
        suggestedAction: 'Try gamification, rewards, or personalized challenges',
        evidence: [`Motivation score: ${motivation.score.toFixed(1)}%`, `Trend: ${motivation.motivationTrend}`],
      });
    }
    
    // Risk: At risk of dropping out
    if (trends.atRisk) {
      insights.push({
        type: 'risk',
        priority: 'urgent',
        title: 'At Risk',
        description: `Multiple risk factors detected: ${trends.riskFactors.join(', ')}`,
        actionable: true,
        suggestedAction: 'Schedule 1-on-1 with teacher for support',
        evidence: trends.riskFactors,
      });
    }
    
    // Recommendation: Optimize learning time
    if (speed.optimalPace === 'slow' && motivation.score > 60) {
      insights.push({
        type: 'recommendation',
        priority: 'medium',
        title: 'Optimize Learning Pace',
        description: 'Student is motivated but learning slowly - consider different teaching methods',
        actionable: true,
        suggestedAction: 'Try visual aids, interactive content, or shorter sessions',
        evidence: [`Learning speed: ${speed.xpPerHour.toFixed(1)} XP/hour`, `Optimal pace: ${speed.optimalPace}`],
      });
    }
    
    return insights;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private normalizeXP(xp: number): number {
    // Normalize to 0-100 scale (assuming max ~1000 per vector)
    return Math.min(100, (xp / 1000) * 100);
  }

  private getMasteryDistribution(skills: any[]) {
    return {
      expert: skills.filter(s => s.mastery >= 90).length,
      advanced: skills.filter(s => s.mastery >= 70 && s.mastery < 90).length,
      intermediate: skills.filter(s => s.mastery >= 50 && s.mastery < 70).length,
      beginner: skills.filter(s => s.mastery < 50).length,
    };
  }

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  private getXPHistory(plg: PersonalLearningGraph): number[] {
    // Reconstruct XP history from streaks
    return plg.streaks.streakHistory.map(s => s.xpEarned);
  }

  private getPerformanceHistory(plg: PersonalLearningGraph): number[] {
    // Get recent attempt scores
    return plg.skills.flatMap(s => 
      s.attempts.slice(-10).map(a => a.score)
    );
  }

  private getSpeedHistory(plg: PersonalLearningGraph): number[] {
    // Calculate XP per hour over time
    const history = plg.streaks.streakHistory;
    return history.map(s => s.xpEarned / 1); // Assuming 1 hour per day
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private calculateTrend(values: number[]): TrendDirection {
    const slope = this.calculateSlope(values);
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    const changeRate = avgValue > 0 ? (slope / avgValue) * 100 : 0;
    
    let direction: 'up' | 'down' | 'stable' | 'volatile';
    if (Math.abs(slope) < 0.1) direction = 'stable';
    else if (slope > 0) direction = 'up';
    else direction = 'down';
    
    const strength = Math.min(1, Math.abs(slope) / 10);
    const stdDev = this.standardDeviation(values);
    const confidence = Math.max(0, 1 - (stdDev / avgValue));
    
    return { direction, strength, confidence, changeRate };
  }

  private calculateTrendFromMotivation(trend: string): TrendDirection {
    const directionMap: any = {
      'increasing': 'up',
      'stable': 'stable',
      'decreasing': 'down',
      'volatile': 'volatile'
    };
    return {
      direction: directionMap[trend] || 'stable',
      strength: 0.5,
      confidence: 0.7,
      changeRate: 0
    };
  }

  private determineOverallTrend(...trends: TrendDirection[]): 'improving' | 'stable' | 'declining' {
    const upCount = trends.filter(t => t.direction === 'up').length;
    const downCount = trends.filter(t => t.direction === 'down').length;
    
    if (upCount > downCount) return 'improving';
    if (downCount > upCount) return 'declining';
    return 'stable';
  }

  private predictXP(history: number[], daysAhead: number): number {
    const slope = this.calculateSlope(history);
    const lastValue = history[history.length - 1] || 0;
    return Math.max(0, lastValue + slope * daysAhead);
  }

  private predictMastery(plg: PersonalLearningGraph, daysAhead: number): number {
    const currentMastery = plg.skills.reduce((sum, s) => sum + s.mastery, 0) / plg.skills.length;
    const slope = 0.5; // Assume 0.5% improvement per day
    return Math.min(100, currentMastery + slope * daysAhead);
  }

  private calculateRecentMotivation(plg: PersonalLearningGraph, days: number): number {
    // Simplified - just use current motivation
    return this.analyzeMotivation(plg).score;
  }

  private assessRisk(
    plg: PersonalLearningGraph,
    performanceTrend: TrendDirection,
    motivationTrend: TrendDirection
  ): { atRisk: boolean; riskFactors: string[] } {
    const riskFactors: string[] = [];
    
    if (performanceTrend.direction === 'down') {
      riskFactors.push('Declining performance');
    }
    
    if (motivationTrend.direction === 'down') {
      riskFactors.push('Decreasing motivation');
    }
    
    if (plg.streaks.current < 3) {
      riskFactors.push('Low streak');
    }
    
    if (plg.currentEmotion.primary === 'frustrated' || plg.currentEmotion.primary === 'bored') {
      riskFactors.push(`Negative emotion: ${plg.currentEmotion.primary}`);
    }
    
    const atRisk = riskFactors.length >= 2;
    
    return { atRisk, riskFactors };
  }

  private identifyOpportunities(plg: PersonalLearningGraph): {
    readyForAdvancement: boolean;
    recommendedChallenges: string[];
  } {
    const capability = this.analyzeCapability(plg);
    const motivation = this.analyzeMotivation(plg);
    
    const readyForAdvancement = 
      capability.recentPerformance >= 80 &&
      motivation.score >= 60 &&
      capability.expertSkills >= 3;
    
    const recommendedChallenges: string[] = [];
    
    if (readyForAdvancement) {
      if (capability.cognitive > 80) {
        recommendedChallenges.push('Advanced problem-solving');
      }
      if (capability.metacognitive > 80) {
        recommendedChallenges.push('Self-directed projects');
      }
      if (capability.behavioral > 80) {
        recommendedChallenges.push('Collaborative challenges');
      }
    }
    
    return { readyForAdvancement, recommendedChallenges };
  }
}

// Singleton instance
export const xpAnalytics = new XPAnalytics();

