/**
 * Personal Learning Graph (PLG) Service
 * 
 * Core service for managing student learning graphs.
 * This is the "brain" of each student in the system.
 */

import {
  PersonalLearningGraph,
  SkillNode,
  MasteryLevel,
  EmotionState,
  EmotionTimeline,
  InteractionSignals,
  XPVectors,
  AttemptHistory,
  calculateRetention,
  calculateNextReviewDate,
} from './types';

// ============================================================================
// PLG Service Class
// ============================================================================

export class PLGService {
  /**
   * Get student's PLG
   */
  async getPLG(studentId: string): Promise<PersonalLearningGraph | null> {
    // TODO: Implement database fetch
    // For now, return mock data or from cache
    
    const plg = await this.loadFromDatabase(studentId);
    
    if (!plg) {
      return null;
    }
    
    // Update decay on all skills
    this.updateSkillDecay(plg);
    
    return plg;
  }

  /**
   * Create new PLG for student
   */
  async createPLG(studentId: string): Promise<PersonalLearningGraph> {
    const plg: PersonalLearningGraph = {
      studentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      
      skills: [],
      masteryLevels: new Map(),
      
      learningStyle: 'mixed', // Will be detected over time
      preferredPace: 'normal',
      attentionSpan: 30, // Default 30 minutes
      optimalLearningTimes: [],
      
      currentEmotion: {
        primary: 'neutral',
        intensity: 0.5,
        timestamp: new Date(),
        inferredFrom: [],
        confidence: 0.5,
      },
      emotionHistory: [],
      
      xpVectors: this.initializeXPVectors(),
      
      streaks: {
        current: 0,
        longest: 0,
        lastActiveDate: new Date(),
        streakHistory: [],
      },
      
      lastActive: new Date(),
      timezonePreference: 'Asia/Ho_Chi_Minh',
      
      goals: [],
      interests: [],
      avoidTopics: [],
      
      version: '1.0',
      privacySettings: {
        shareProgressWithTeachers: true,
        shareProgressWithParents: true,
        allowDataForResearch: false,
        allowEmotionTracking: true,
        allowExternalIntegrations: false,
      },
    };
    
    await this.saveToDatabase(plg);
    
    return plg;
  }

  /**
   * Update skill mastery
   */
  async updateSkill(
    studentId: string,
    skillId: string,
    update: {
      masteryDelta?: number;
      attempt?: AttemptHistory;
      practiced?: boolean;
    }
  ): Promise<SkillNode> {
    const plg = await this.getPLG(studentId);
    
    if (!plg) {
      throw new Error('PLG not found');
    }
    
    let skill = plg.skills.find(s => s.id === skillId);
    
    // Create skill if doesn't exist
    if (!skill) {
      skill = this.createSkillNode(skillId);
      plg.skills.push(skill);
    }
    
    // Update mastery
    if (update.masteryDelta) {
      skill.mastery = Math.max(0, Math.min(100, skill.mastery + update.masteryDelta));
    }
    
    // Record attempt
    if (update.attempt) {
      skill.attempts.push(update.attempt);
      skill.totalPracticeTime += update.attempt.timeSpent / 60; // Convert to minutes
      
      // Adjust decay rate based on performance
      // Better performance = slower decay
      if (update.attempt.score >= 80) {
        skill.decayRate *= 0.95; // Decay 5% slower
      } else if (update.attempt.score < 60) {
        skill.decayRate *= 1.05; // Decay 5% faster
      }
    }
    
    // Update last practiced
    if (update.practiced) {
      skill.lastPracticed = new Date();
      skill.nextReviewDate = calculateNextReviewDate(skill);
    }
    
    // Update XP vectors based on attempt
    if (update.attempt) {
      this.updateXPVectors(plg, skill, update.attempt);
    }
    
    plg.updatedAt = new Date();
    await this.saveToDatabase(plg);
    
    return skill;
  }

  /**
   * Record interaction and update emotion
   */
  async recordInteraction(
    studentId: string,
    signals: InteractionSignals
  ): Promise<EmotionState> {
    const plg = await this.getPLG(studentId);
    
    if (!plg) {
      throw new Error('PLG not found');
    }
    
    // Infer emotion from signals
    const newEmotion = this.inferEmotion(signals, plg.emotionHistory);
    
    // Update current emotion
    plg.currentEmotion = newEmotion;
    
    // Add to history
    plg.emotionHistory.push({
      timestamp: new Date(),
      emotion: newEmotion,
      context: signals.sessionId,
      duration: signals.sessionDuration,
    });
    
    // Keep only last 100 emotions
    if (plg.emotionHistory.length > 100) {
      plg.emotionHistory = plg.emotionHistory.slice(-100);
    }
    
    // Update last active
    plg.lastActive = new Date();
    
    await this.saveToDatabase(plg);
    
    return newEmotion;
  }

  /**
   * Get skills that need review (Spaced Repetition)
   */
  async getSkillsNeedingReview(studentId: string): Promise<SkillNode[]> {
    const plg = await this.getPLG(studentId);
    
    if (!plg) {
      return [];
    }
    
    const now = new Date();
    
    return plg.skills.filter(skill => {
      // Has next review date and it's passed
      if (skill.nextReviewDate && skill.nextReviewDate <= now) {
        return true;
      }
      
      // Or mastery has decayed below threshold
      const daysSince = this.daysSince(skill.lastPracticed);
      const currentMastery = calculateRetention(skill, daysSince);
      
      return currentMastery < 70; // Below 70% needs review
    });
  }

  /**
   * Recommend next skills to learn
   */
  async recommendNextSkills(
    studentId: string,
    maxSkills: number = 5
  ): Promise<SkillNode[]> {
    const plg = await this.getPLG(studentId);
    
    if (!plg) {
      return [];
    }
    
    // Get all available skills from content graph
    // TODO: Integrate with Content Graph service
    const allSkills = await this.getAllSkills();
    
    // Filter: prerequisites met, not yet mastered
    const candidates = allSkills.filter(skill => {
      // Not in PLG or mastery < 80
      const existing = plg.skills.find(s => s.id === skill.id);
      if (existing && existing.mastery >= 80) {
        return false;
      }
      
      // All prerequisites met
      if (skill.prerequisites.length > 0) {
        return skill.prerequisites.every(prereqId => {
          const prereq = plg.skills.find(s => s.id === prereqId);
          return prereq && prereq.mastery >= 60; // Need 60% to proceed
        });
      }
      
      return true;
    });
    
    // Score candidates based on PLG
    const scored = candidates.map(skill => ({
      skill,
      score: this.scoreSkillForRecommendation(skill, plg),
    }));
    
    // Sort by score and return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSkills)
      .map(s => s.skill);
  }

  /**
   * Update streak
   */
  async updateStreak(studentId: string): Promise<void> {
    const plg = await this.getPLG(studentId);
    
    if (!plg) {
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActive = new Date(plg.streaks.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);
    
    const daysDiff = this.daysBetween(lastActive, today);
    
    if (daysDiff === 0) {
      // Same day, do nothing
      return;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      plg.streaks.current += 1;
      plg.streaks.longest = Math.max(plg.streaks.longest, plg.streaks.current);
    } else {
      // Streak broken, reset
      plg.streaks.current = 1;
    }
    
    plg.streaks.lastActiveDate = today;
    
    await this.saveToDatabase(plg);
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private initializeXPVectors(): XPVectors {
    return {
      logic: 0,
      memory: 0,
      creativity: 0,
      metacognition: 0,
      criticalThinking: 0,
      persistence: 0,
      independence: 0,
      collaboration: 0,
      consistency: 0,
      speed: 0,
      curiosity: 0,
      confidence: 0,
      total: 0,
    };
  }

  private createSkillNode(skillId: string): SkillNode {
    return {
      id: skillId,
      name: skillId, // TODO: Get from Content Graph
      domain: 'math', // TODO: Get from Content Graph
      mastery: 0,
      confidence: 50,
      lastPracticed: new Date(),
      firstLearned: new Date(),
      decayRate: 0.05, // Default 5% per day
      halfLife: 14, // 14 days default
      prerequisites: [],
      dependents: [],
      attempts: [],
      totalPracticeTime: 0,
    };
  }

  private updateSkillDecay(plg: PersonalLearningGraph): void {
    const now = new Date();
    
    for (const skill of plg.skills) {
      const daysSince = this.daysSince(skill.lastPracticed);
      
      if (daysSince > 0) {
        const currentMastery = calculateRetention(skill, daysSince);
        skill.mastery = currentMastery;
      }
    }
  }

  private updateXPVectors(
    plg: PersonalLearningGraph,
    skill: SkillNode,
    attempt: AttemptHistory
  ): void {
    const xp = plg.xpVectors;
    
    // Base XP from score
    const baseXP = Math.floor(attempt.score);
    
    // Logic XP (problem-solving)
    if (skill.domain === 'math' || skill.domain === 'cs') {
      xp.logic += baseXP * 0.5;
    }
    
    // Memory XP (recall-based)
    xp.memory += baseXP * 0.2;
    
    // Persistence (attempts needed)
    if (attempt.attemptsNeeded > 1) {
      xp.persistence += 10; // Bonus for trying again
    }
    
    // Speed (time-based bonus)
    const avgTime = 120; // 2 minutes average
    if (attempt.timeSpent < avgTime) {
      xp.speed += 5;
    }
    
    // Independence (hints used)
    if (attempt.hintsUsed === 0) {
      xp.independence += 10;
    }
    
    // Update total
    xp.total = Object.values(xp).reduce((sum, val) => sum + val, 0);
  }

  private inferEmotion(
    signals: InteractionSignals,
    history: EmotionTimeline[]
  ): EmotionState {
    const scores: Record<string, number> = {
      excited: 0,
      focused: 0,
      frustrated: 0,
      tired: 0,
      bored: 0,
      confused: 0,
      satisfied: 0,
      neutral: 10,
    };
    
    const inferredFrom: string[] = [];
    
    // Fast typing + low deletion = focused
    if (signals.typingSpeed && signals.typingSpeed > 3 && (signals.deletions || 0) < 5) {
      scores.focused += 30;
      inferredFrom.push('typing_speed');
    }
    
    // Slow typing + many deletions = frustrated/confused
    if (signals.typingSpeed && signals.typingSpeed < 1 && (signals.deletions || 0) > 10) {
      scores.frustrated += 25;
      scores.confused += 15;
      inferredFrom.push('typing_behavior');
    }
    
    // Many retries = frustrated
    if (signals.retryCount && signals.retryCount > 3) {
      scores.frustrated += 20;
      inferredFrom.push('retry_count');
    }
    
    // Long idle = tired/bored
    if (signals.idleTime && signals.idleTime > 120) {
      scores.tired += 15;
      scores.bored += 15;
      inferredFrom.push('idle_time');
    }
    
    // Many tab switches = distracted/bored
    if (signals.tabSwitches && signals.tabSwitches > 5) {
      scores.bored += 20;
      inferredFrom.push('tab_switches');
    }
    
    // Video rewinds = confused
    if (signals.rewindCount && signals.rewindCount > 3) {
      scores.confused += 25;
      inferredFrom.push('video_rewind');
    }
    
    // Fast playback = bored (too easy)
    if (signals.playbackSpeed && signals.playbackSpeed > 1.5) {
      scores.bored += 20;
      inferredFrom.push('playback_speed');
    }
    
    // Quick completion = satisfied
    if (signals.sessionDuration < 300 && (signals.skipCount || 0) === 0) {
      scores.satisfied += 15;
      inferredFrom.push('quick_completion');
    }
    
    // Find dominant emotion
    const entries = Object.entries(scores);
    const dominant = entries.sort(([, a], [, b]) => b - a)[0];
    
    const confidence = dominant[1] / 100;
    
    return {
      primary: dominant[0] as any,
      intensity: Math.min(1, confidence),
      timestamp: new Date(),
      inferredFrom,
      confidence,
    };
  }

  private scoreSkillForRecommendation(skill: SkillNode, plg: PersonalLearningGraph): number {
    let score = 0;
    
    // Zone of Proximal Development (ZPD)
    // Prefer skills that are not too easy, not too hard
    const existing = plg.skills.find(s => s.id === skill.id);
    if (existing) {
      if (existing.mastery >= 40 && existing.mastery <= 70) {
        score += 30; // Sweet spot
      } else if (existing.mastery < 40) {
        score += 20; // Need improvement
      }
    } else {
      score += 25; // New skill
    }
    
    // Interest alignment
    if (plg.interests.some(interest => skill.name.toLowerCase().includes(interest.toLowerCase()))) {
      score += 20;
    }
    
    // Avoid topics
    if (plg.avoidTopics.some(avoid => skill.name.toLowerCase().includes(avoid.toLowerCase()))) {
      score -= 30;
    }
    
    // Goal alignment
    for (const goal of plg.goals) {
      if (goal.status === 'in_progress' && goal.description.includes(skill.name)) {
        score += 40; // High priority for active goals
      }
    }
    
    return score;
  }

  private daysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private daysBetween(date1: Date, date2: Date): number {
    const diff = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  // ==========================================================================
  // Database Methods (to be implemented)
  // ==========================================================================

  private async loadFromDatabase(studentId: string): Promise<PersonalLearningGraph | null> {
    // TODO: Implement with Prisma
    // For now, check localStorage or return null
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`plg_${studentId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    }
    
    return null;
  }

  private async saveToDatabase(plg: PersonalLearningGraph): Promise<void> {
    // TODO: Implement with Prisma
    // For now, save to localStorage
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`plg_${plg.studentId}`, JSON.stringify(plg));
    }
  }

  private async getAllSkills(): Promise<SkillNode[]> {
    // TODO: Get from Content Graph
    // For now, return empty
    return [];
  }
}

// Singleton instance
export const plgService = new PLGService();

