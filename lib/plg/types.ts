/**
 * Personal Learning Graph (PLG) - Type Definitions
 * 
 * Core data structures for representing a student's learning state,
 * skills, mastery, emotions, and preferences.
 */

// ============================================================================
// Core PLG Types
// ============================================================================

export interface PersonalLearningGraph {
  studentId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Skill Graph
  skills: SkillNode[];
  masteryLevels: Map<string, MasteryLevel>;
  
  // Learning Behavior
  learningStyle: LearningStyle;
  preferredPace: 'slow' | 'normal' | 'fast';
  attentionSpan: number; // minutes
  optimalLearningTimes: TimeSlot[]; // When student learns best
  
  // Emotional State
  currentEmotion: EmotionState;
  emotionHistory: EmotionTimeline[];
  
  // Performance Vectors (Multi-dimensional XP)
  xpVectors: XPVectors;
  
  // Temporal Data
  streaks: StreakData;
  lastActive: Date;
  timezonePreference: string;
  
  // Goals & Preferences
  goals: LearningGoal[];
  interests: string[];
  avoidTopics: string[];
  
  // Metadata
  version: string; // For schema evolution
  privacySettings: PrivacySettings;
}

// ============================================================================
// Skill Node
// ============================================================================

export interface SkillNode {
  id: string;
  name: string;
  domain: 'math' | 'physics' | 'chemistry' | 'biology' | 'cs' | 'language' | 'other';
  
  // Mastery
  mastery: number; // 0-100
  confidence: number; // 0-100, self-reported
  lastPracticed: Date;
  firstLearned?: Date;
  
  // Forgetting Curve
  decayRate: number; // 0-1, how fast they forget
  halfLife: number; // days until mastery drops to 50%
  
  // Dependencies
  prerequisites: string[]; // Skill IDs that must be learned first
  dependents: string[]; // Skills that depend on this
  
  // History
  attempts: AttemptHistory[];
  totalPracticeTime: number; // minutes
  
  // Assessment
  lastAssessment?: Assessment;
  nextReviewDate?: Date; // Spaced repetition
}

export interface AttemptHistory {
  timestamp: Date;
  type: 'quiz' | 'practice' | 'project' | 'oral' | 'simulation';
  score: number; // 0-100
  timeSpent: number; // seconds
  hintsUsed: number;
  attemptsNeeded: number;
  emotionDuring: EmotionState;
}

export interface Assessment {
  id: string;
  timestamp: Date;
  type: 'diagnostic' | 'formative' | 'summative';
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean; // >= 60%
  
  // IRT (Item Response Theory)
  estimatedAbility?: number; // theta
  standardError?: number;
  
  feedback: string;
  recommendations: string[];
}

// ============================================================================
// Mastery Level
// ============================================================================

export interface MasteryLevel {
  skillId: string;
  level: 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score: number; // 0-100
  lastAssessed: Date;
  needsRefresh: boolean;
  
  // Bloom's Taxonomy
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
}

// ============================================================================
// Learning Style
// ============================================================================

export type LearningStyle = 
  | 'visual'      // Prefer diagrams, videos, images
  | 'auditory'    // Prefer lectures, discussions, audio
  | 'kinesthetic' // Prefer hands-on, interactive
  | 'reading'     // Prefer text, articles, books
  | 'mixed';      // No clear preference

export interface TimeSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  hourStart: number; // 0-23
  hourEnd: number;
  effectiveness: number; // 0-1, how well they learn during this time
}

// ============================================================================
// Emotion
// ============================================================================

export interface EmotionState {
  primary: EmotionType;
  intensity: number; // 0-1
  timestamp: Date;
  inferredFrom: string[]; // ['typing_speed', 'hesitation', 'quiz_retry']
  confidence: number; // 0-1, how confident the inference is
}

export type EmotionType = 
  | 'excited'    // High energy, positive
  | 'focused'    // Concentrated, in flow
  | 'frustrated' // Struggling, negative
  | 'tired'      // Low energy, need break
  | 'bored'      // Disengaged, need challenge
  | 'confused'   // Don't understand
  | 'satisfied'  // Completed successfully
  | 'neutral';   // Default state

export interface EmotionTimeline {
  timestamp: Date;
  emotion: EmotionState;
  context: string; // What they were doing
  duration: number; // seconds in this state
}

// ============================================================================
// XP Vectors (Multi-dimensional Performance)
// ============================================================================

export interface XPVectors {
  // Cognitive
  logic: number;        // Problem-solving, reasoning
  memory: number;       // Recall, retention
  creativity: number;   // Original thinking, innovation
  
  // Meta-cognitive
  metacognition: number; // Awareness of own learning
  criticalThinking: number;
  
  // Behavioral
  persistence: number;  // Grit, not giving up
  independence: number; // Self-directed learning
  collaboration: number; // Working with others
  
  // Temporal
  consistency: number;  // Regular practice
  speed: number;        // How fast they learn
  
  // Affective
  curiosity: number;    // Desire to explore
  confidence: number;   // Self-efficacy
  
  // Total XP
  total: number;
}

// ============================================================================
// Streaks & Gamification
// ============================================================================

export interface StreakData {
  current: number;      // days
  longest: number;
  lastActiveDate: Date;
  streakHistory: StreakEvent[];
}

export interface StreakEvent {
  date: Date;
  xpEarned: number;
  lessonsCompleted: number;
}

// ============================================================================
// Goals
// ============================================================================

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate?: Date;
  
  // Measurable
  type: 'skill_mastery' | 'xp_target' | 'completion' | 'custom';
  target: number; // e.g., 80% mastery, 1000 XP
  current: number;
  
  // Progress
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  progress: number; // 0-100
  
  // Motivation
  importance: 'low' | 'medium' | 'high';
  intrinsic: boolean; // Self-motivated vs external pressure
}

// ============================================================================
// Privacy
// ============================================================================

export interface PrivacySettings {
  shareProgressWithTeachers: boolean;
  shareProgressWithParents: boolean;
  allowDataForResearch: boolean;
  allowEmotionTracking: boolean;
  allowExternalIntegrations: boolean;
}

// ============================================================================
// Interaction Signals (for Emotion Inference)
// ============================================================================

export interface InteractionSignals {
  sessionId: string;
  timestamp: Date;
  
  // Typing behavior
  typingSpeed?: number; // chars/second
  typingPauses?: number[]; // pause durations in ms
  deletions?: number; // backspace count
  
  // Mouse/Touch
  mousePath?: Point[];
  clickHesitation?: number; // ms before click
  scrollSpeed?: number;
  
  // Quiz behavior
  timePerQuestion?: number[];
  retryCount?: number;
  skipCount?: number;
  hintRequests?: number;
  
  // Video engagement
  playbackSpeed?: number;
  rewindCount?: number;
  pauseCount?: number;
  dropoffTime?: number; // seconds before quitting
  
  // Session
  sessionDuration: number; // seconds
  tabSwitches?: number; // Distraction indicator
  idleTime?: number; // seconds
  
  // Context
  deviceType: 'mobile' | 'desktop' | 'tablet';
  location: 'home' | 'school' | 'public' | 'unknown';
}

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

// ============================================================================
// Content Context (for Recommendations)
// ============================================================================

export interface RecommendationContext {
  studentId: string;
  currentTime: Date;
  sessionDuration: number; // minutes available
  deviceType: 'mobile' | 'desktop' | 'tablet';
  location: 'home' | 'school' | 'public';
  
  // Current state
  currentEmotion?: EmotionState;
  recentPerformance?: number; // avg score in last 5 activities
  
  // Constraints
  preferredFormats?: ('video' | 'text' | 'interactive' | 'quiz')[];
  excludeTopics?: string[];
  mustIncludeTopics?: string[];
}

// ============================================================================
// Skill Decay (Forgetting Curve)
// ============================================================================

export interface DecayParameters {
  // Ebbinghaus Forgetting Curve: R(t) = e^(-t/S)
  // R = retention, t = time, S = strength (half-life)
  
  initialStrength: number; // S0
  decayRate: number; // lambda
  
  // Factors that affect decay
  difficultyFactor: number; // Harder = faster decay
  practiceFactor: number; // More practice = slower decay
  emotionFactor: number; // Positive emotion = slower decay
}

export function calculateRetention(
  skill: SkillNode,
  daysSinceLastPractice: number
): number {
  // Exponential decay: R(t) = mastery * e^(-t * decayRate)
  const retention = skill.mastery * Math.exp(-daysSinceLastPractice * skill.decayRate);
  return Math.max(0, Math.min(100, retention));
}

export function calculateNextReviewDate(
  skill: SkillNode,
  targetRetention: number = 80
): Date {
  // When will mastery drop to targetRetention?
  // t = -ln(targetRetention / mastery) / decayRate
  const t = -Math.log(targetRetention / skill.mastery) / skill.decayRate;
  const nextReview = new Date(skill.lastPracticed);
  nextReview.setDate(nextReview.getDate() + Math.floor(t));
  return nextReview;
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  PersonalLearningGraph as PLG,
  SkillNode as Skill,
  MasteryLevel as Mastery,
  EmotionState as Emotion,
  XPVectors as XP,
};

