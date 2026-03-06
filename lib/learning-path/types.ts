/**
 * AI-Orchestrated Learning Path System
 * Multi-disciplinary learning path management with AI coordination
 */

// ===== CORE TYPES =====

export enum SubjectDomain {
  MATH = 'math',
  PHYSICS = 'physics',
  CHEMISTRY = 'chemistry',
  BIOLOGY = 'biology',
  COMPUTER_SCIENCE = 'computer_science',
  MUSIC = 'music',
  ART = 'art',
  LANGUAGE = 'language',
  HISTORY = 'history',
  GEOGRAPHY = 'geography',
  ECONOMICS = 'economics',
  PHILOSOPHY = 'philosophy',
}

export interface SubjectMentor {
  id: string;
  name: string;
  email: string;
  domain: SubjectDomain;
  expertise: string[]; // Specific topics within domain
  responseTime: number; // Average response time in hours
  effectiveness: number; // 0-100 score
  assignmentCount: number; // Number of active assignments
  availability: 'available' | 'busy' | 'offline';
}

export interface KnowledgeNode {
  id: string;
  title: string;
  domain: SubjectDomain;
  relatedDomains: SubjectDomain[]; // Cross-disciplinary connections
  prerequisites: string[]; // Node IDs
  difficulty: number; // 1-10
  estimatedTime: number; // minutes
  content: {
    type: 'video' | 'text' | 'interactive' | 'quiz' | 'project';
    url?: string;
    description: string;
  };
  mentorId: string; // Assigned mentor
  verificationStatus: 'pending' | 'approved' | 'rejected';
  lastUpdated: Date;
}

export interface LearningPathSegment {
  id: string;
  studentId: string;
  domain: SubjectDomain;
  nodes: string[]; // KnowledgeNode IDs
  mentorId: string;
  status: 'pending' | 'active' | 'completed' | 'paused';
  progress: number; // 0-100
  startDate: Date;
  estimatedEndDate: Date;
  actualEndDate?: Date;
  transitions: PathTransition[]; // Cross-domain connections
}

export interface PathTransition {
  fromNodeId: string;
  toNodeId: string;
  fromDomain: SubjectDomain;
  toDomain: SubjectDomain;
  transitionType: 'prerequisite' | 'application' | 'enrichment' | 'bridge';
  aiReasoning: string; // Why AI suggests this transition
  mentorApproval: {
    fromMentor: boolean;
    toMentor: boolean;
    notes?: string;
  };
}

export interface MultiDisciplinaryPath {
  id: string;
  studentId: string;
  title: string;
  description: string;
  primaryDomain: SubjectDomain;
  involvedDomains: SubjectDomain[];
  segments: LearningPathSegment[];
  coordinatorInsights: AICoordinatorInsight[];
  crossDisciplinaryPanel: string[]; // Mentor IDs
  overallProgress: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'active' | 'completed' | 'archived';
}

export interface AICoordinatorInsight {
  id: string;
  timestamp: Date;
  type: 'suggestion' | 'transition' | 'alert' | 'recommendation';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  reasoning: string;
  affectedSegments: string[]; // Segment IDs
  suggestedMentors: string[]; // Mentor IDs to ping
  actionRequired: boolean;
  actionTaken?: {
    by: string; // Mentor ID
    action: string;
    timestamp: Date;
    result: string;
  };
}

// ===== AI COORDINATOR =====

export interface AICoordinatorContext {
  studentId: string;
  currentNode: string;
  completedNodes: string[];
  studentProfile: {
    learningStyle: string;
    strengths: SubjectDomain[];
    weaknesses: SubjectDomain[];
    interests: string[];
    goals: string[];
  };
  availableMentors: SubjectMentor[];
  knowledgeGraph: KnowledgeNode[];
}

export interface MentorAssignment {
  mentorId: string;
  segmentId: string;
  assignedAt: Date;
  reason: string;
  workload: number; // Current workload score
  matchScore: number; // 0-100 how well matched
}

// ===== CROSS-DISCIPLINARY PANEL =====

export interface PanelReview {
  id: string;
  pathId: string;
  panelMembers: string[]; // Mentor IDs
  reviewDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed';
  decisions: PanelDecision[];
  notes: string;
  nextReviewDate?: Date;
}

export interface PanelDecision {
  mentorId: string;
  decision: 'approve' | 'reject' | 'modify';
  reasoning: string;
  suggestions?: string[];
  concernedNodes?: string[];
}

// ===== ANALYTICS & OPERATIONS =====

export interface MentorPerformance {
  mentorId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    assignmentCount: number;
    averageResponseTime: number; // hours
    effectivenessScore: number; // 0-100
    studentSatisfaction: number; // 0-100
    aiCollaborationScore: number; // How well they work with AI suggestions
    crossDomainCollaboration: number; // How often they collaborate across domains
  };
  aiSuggestionAcceptanceRate: number; // % of AI suggestions accepted
  interventionSuccess: {
    total: number;
    successful: number;
    rate: number;
  };
}

export interface AcademicOperationsDashboard {
  totalPaths: number;
  activePaths: number;
  completedPaths: number;
  totalMentors: number;
  mentorsByDomain: Record<SubjectDomain, number>;
  aiCoordinatorEfficiency: {
    avgSegmentationTime: number; // ms
    avgMentorMatchAccuracy: number; // %
    transitionSuccessRate: number; // %
  };
  pendingApprovals: {
    content: number;
    transitions: number;
    paths: number;
  };
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
  };
}

// ===== RUBRIC & ASSESSMENT =====

export interface CrossDisciplinaryRubric {
  id: string;
  title: string;
  domains: SubjectDomain[];
  criteria: RubricCriterion[];
  createdBy: string[]; // Panel member IDs
  approvedAt: Date;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  domains: SubjectDomain[]; // Which domains this applies to
  weight: number; // 0-1
  levels: {
    level: number;
    name: string;
    description: string;
    score: number;
  }[];
}

export interface CrossDisciplinaryAssessment {
  id: string;
  studentId: string;
  pathId: string;
  rubricId: string;
  assessedBy: string[]; // Mentor IDs
  scores: {
    criterionId: string;
    score: number;
    feedback: string;
    assessedBy: string; // Mentor ID
  }[];
  overallScore: number;
  overallFeedback: string;
  assessedAt: Date;
}

// ===== REAL-TIME COORDINATION =====

export interface MentorNotification {
  id: string;
  mentorId: string;
  type: 'assignment' | 'approval_needed' | 'student_question' | 'panel_meeting' | 'ai_alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  relatedPath?: string;
  relatedStudent?: string;
  actionUrl?: string;
  createdAt: Date;
  readAt?: Date;
  respondedAt?: Date;
}

export interface StudentPathView {
  student: {
    id: string;
    name: string;
    currentPath: MultiDisciplinaryPath;
  };
  currentSegment: LearningPathSegment;
  currentNode: KnowledgeNode;
  assignedMentors: SubjectMentor[];
  nextNodes: KnowledgeNode[];
  upcomingTransitions: PathTransition[];
  progressSummary: {
    overallProgress: number;
    byDomain: Record<SubjectDomain, number>;
    timeSpent: number; // minutes
    estimatedTimeRemaining: number; // minutes
  };
  aiRecommendations: string[];
}

