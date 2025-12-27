/**
 * Admin Dashboard Types
 * AI-Driven Education System
 */

// ========== SYSTEM OVERVIEW ==========

export interface SystemKPI {
  activeStudents: number;
  avgMastery: number;
  engagementTrend: number; // percentage
  alertsToday: number;
  totalTeachers: number;
  totalCourses: number;
}

export interface SystemInsight {
  id: string;
  type: 'alert' | 'opportunity' | 'warning' | 'info';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number; // 0-1
  affectedCount: number; // number of students/teachers affected
  suggestedAction: string;
  timestamp: Date;
}

export interface XPGrowthData {
  date: string;
  avgXP: number;
  studentCount: number;
}

export interface EmotionStabilityData {
  emotion: 'excited' | 'focused' | 'confused' | 'frustrated' | 'bored' | 'anxious';
  percentage: number;
}

export interface TeacherResponseData {
  teacherName: string;
  avgResponseTime: number; // hours
  interventionCount: number;
}

// ========== STUDENT INSIGHTS ==========

export interface StudentInsight {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  currentXP: number;
  masteryPercentage: number;
  emotionScore: number; // 0-10
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActive: Date;
  class: string;
  enrolledCourses: number;
}

export interface StudentTimeline {
  id: string;
  studentId: string;
  eventType: 'quiz' | 'login' | 'emotion_spike' | 'intervention' | 'achievement' | 'assignment';
  title: string;
  description: string;
  timestamp: Date;
  emotionBefore?: string;
  emotionAfter?: string;
  xpGained?: number;
}

export interface PLGNode {
  id: string;
  skillName: string;
  mastery: number; // 0-1
  status: 'mastered' | 'learning' | 'review' | 'struggling';
  lastPracticed: Date;
  nextReview?: Date;
  predictedGain?: number; // AI prediction
}

export interface StudentAISuggestion {
  id: string;
  type: 'alert' | 'suggestion' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  actionLabel: string;
  actionPayload: any;
  priority: number; // 1-5
  timestamp: Date;
}

// ========== AT-RISK & INTERVENTION ==========

export interface AtRiskStudent {
  id: string;
  studentId: string;
  studentName: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: RiskFactor[];
  aiRecommendations: InterventionRecommendation[];
  assignedTo?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'escalated';
  createdAt: Date;
  updatedAt: Date;
}

export interface RiskFactor {
  factor: string;
  weight: number; // 0-1
  description: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface InterventionRecommendation {
  id: string;
  type: 'content' | 'counseling' | 'parent_contact' | 'peer_support' | 'adjustment';
  title: string;
  description: string;
  expectedImpact: number; // 0-1
  timeEstimate: string; // e.g., "15 minutes"
  confidence: number; // 0-1
  priority: number; // 1-5
}

export interface InterventionCase {
  id: string;
  studentId: string;
  riskId: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  owner: string;
  interventionType: string;
  startDate: Date;
  endDate?: Date;
  outcome?: 'improved' | 'no_change' | 'declined';
  notes: string;
  progressTrend: number[]; // array of scores over time
}

// ========== ALERTS & WORKFLOW ==========

export interface Alert {
  id: string;
  type: 'emotion' | 'engagement' | 'risk' | 'teacher' | 'content' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  title: string;
  description: string;
  explainability: string; // 3-line AI explanation
  suggestedActions: AlertAction[];
  assignedTo?: string;
  status: 'new' | 'assigned' | 'in_progress' | 'resolved' | 'snoozed';
  slaDeadline: Date;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'assign' | 'snooze' | 'auto_resolve' | 'escalate' | 'dismiss';
  apiEndpoint?: string;
  payload?: any;
}

// ========== TEACHER PERFORMANCE ==========

export interface TeacherPerformance {
  id: string;
  teacherId: string;
  name: string;
  avatar?: string;
  avgStudentGain: number; // XP gain
  feedbackScore: number; // 0-10
  responseTime: number; // hours
  interventionSuccessRate: number; // 0-1
  studentsAssigned: number;
  coursesTeaching: number;
  aiRecommendations: string[];
}

export interface TeachingPattern {
  pattern: string;
  effectiveness: number; // 0-1
  description: string;
  teachers: string[]; // teacher IDs using this pattern
}

// ========== EMOTION & ENGAGEMENT ==========

export interface EngagementHeatmapData {
  time: string; // e.g., "09:00"
  class: string;
  engagementLevel: number; // 0-100
  studentCount: number;
}

export interface EmotionTrendData {
  timestamp: Date;
  emotion: string;
  intensity: number; // 0-1
  studentCount: number;
}

export interface SessionReplay {
  sessionId: string;
  studentId: string;
  startTime: Date;
  endTime: Date;
  sentimentChanges: SentimentChange[];
  fatigueMoments: FatigueMoment[];
}

export interface SentimentChange {
  timestamp: Date;
  from: string;
  to: string;
  trigger?: string;
}

export interface FatigueMoment {
  timestamp: Date;
  confidence: number;
  duration: number; // seconds
  aiSuggestion: string;
}

// ========== CONTENT & CURRICULUM ==========

export interface ContentMetrics {
  id: string;
  contentId: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'interactive' | 'assignment';
  completionRate: number; // 0-1
  avgMasteryGain: number; // -1 to 1
  dropOffRate: number; // 0-1
  avgTimeSpent: number; // minutes
  studentCount: number;
  skillLinks: string[]; // skill node IDs
  qualityScore: number; // 0-10 (AI-generated)
  needsReview: boolean;
  aiSuggestions: string[];
}

export interface SkillLinkage {
  contentId: string;
  skillId: string;
  strength: number; // 0-1
}

// ========== ADMIN OPERATIONS ==========

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'COUNSELOR' | 'CURRICULUM_LEAD' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'active' | 'inactive' | 'suspended';
  lastActive: Date;
  createdAt: Date;
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface RolePermissions {
  role: string;
  permissions: Permission[];
}

export interface APILog {
  id: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number; // ms
  timestamp: Date;
  anomaly: boolean;
}

// ========== MODEL & DATA MONITORING ==========

export interface ModelCard {
  id: string;
  name: string;
  type: 'recommendation' | 'emotion_inference' | 'risk_prediction' | 'content_quality';
  version: string;
  precision: number; // 0-1
  recall: number; // 0-1
  f1Score: number; // 0-1
  driftScore: number; // 0-1 (higher = more drift)
  lastTrainedAt: Date;
  trainingFrequency: string; // e.g., "weekly"
  confidenceDecay: number; // 0-1
  needsRetraining: boolean;
}

export interface DataSourceHealth {
  source: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number; // ms
  errorRate: number; // 0-1
  lastChecked: Date;
}

export interface ModelPredictionLog {
  id: string;
  modelId: string;
  prediction: any;
  actualOutcome?: any;
  correct: boolean | null;
  confidence: number;
  timestamp: Date;
  falsePositive: boolean;
  falseNegative: boolean;
}

// ========== AUDIT & COMPLIANCE ==========

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  reason?: string;
  timestamp: Date;
  ipAddress: string;
}

// ========== FILTERS & SEARCH ==========

export interface StudentFilter {
  class?: string;
  riskLevel?: string[];
  emotionState?: string[];
  xpRange?: [number, number];
  lastActiveWithin?: number; // days
  search?: string;
}

export interface AlertFilter {
  type?: string[];
  severity?: string[];
  status?: string[];
  assignedTo?: string;
  dateRange?: [Date, Date];
}

