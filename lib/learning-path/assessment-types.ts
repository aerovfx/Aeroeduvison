/**
 * Assessment Rubric Types for Learning Path System
 *
 * Bảng đánh giá dựa trên 4 yếu tố:
 * 1. Student Profile - Hồ sơ người học
 * 2. Subject Mentor Validation - Xác nhận chuyên gia
 * 3. Cross-Disciplinary Panel - Đánh giá liên môn
 * 4. AI Scoring Matrix - Ma trận chấm điểm AI
 */

import { SubjectDomain } from './types';

// ===== STUDENT PROFILE ASSESSMENT =====

export type LearningStyle = 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
export type AcademicLevel = 'thpt_10' | 'thpt_11' | 'thpt_12' | 'university_1' | 'university_2' | 'university_3' | 'university_4' | 'postgrad';
export type GoalType = 'exam_prep' | 'skill_building' | 'career_oriented' | 'passion_project' | 'research' | 'certification';
export type TimeCommitment = 'light' | 'moderate' | 'intensive' | 'fulltime';

export interface StudentProfileSurvey {
  // Phần 1: Thông tin cơ bản (4 câu)
  fullName: string;
  academicLevel: AcademicLevel;
  currentGPA: number; // 0-10
  schoolOrUniversity: string;

  // Phần 2: Phong cách học tập (4 câu)
  learningStyle: LearningStyle;
  preferredContentType: ('video' | 'text' | 'interactive' | 'quiz' | 'project')[];
  studySessionDuration: '15min' | '30min' | '45min' | '60min' | '90min';
  bestStudyTime: 'morning' | 'afternoon' | 'evening' | 'night';

  // Phần 3: Điểm mạnh và điểm yếu (4 câu)
  strongSubjects: SubjectDomain[];
  weakSubjects: SubjectDomain[];
  selfRatedConfidence: Record<SubjectDomain, number>; // 1-5 mỗi môn
  previousAchievements: string[];

  // Phần 4: Mục tiêu (4 câu)
  primaryGoal: GoalType;
  specificGoalDescription: string;
  targetTimeline: '1month' | '3months' | '6months' | '1year';
  desiredOutcome: string;

  // Phần 5: Khả năng cam kết (4 câu)
  weeklyHours: TimeCommitment;
  availableDays: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  hasInternetAccess: 'always' | 'mostly' | 'limited';
  preferredLanguage: 'vi' | 'en' | 'both';

  // Phần 6: Sở thích & động lực (3 câu)
  interestedDomains: SubjectDomain[];
  motivationDrivers: ('grades' | 'curiosity' | 'career' | 'competition' | 'social' | 'self_improvement')[];
  preferredDifficulty: 'easy_start' | 'balanced' | 'challenging';
}

// ===== SCORING DIMENSIONS =====

export interface DimensionScore {
  dimension: string;
  score: number;       // 0-100
  weight: number;      // 0-1 (tổng = 1)
  reasoning: string;
  subScores: {
    factor: string;
    value: number;     // 0-100
    evidence: string;
  }[];
}

// ===== STUDENT PROFILE SCORE (Yếu tố 1) =====

export interface StudentProfileScore {
  overallReadiness: number;           // 0-100
  learningStyleMatch: number;         // 0-100
  priorKnowledgeLevel: number;        // 0-100
  motivationIndex: number;            // 0-100
  timeAvailabilityScore: number;      // 0-100
  recommendedStartingDifficulty: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  strengthDomains: SubjectDomain[];
  gapDomains: SubjectDomain[];
}

// ===== MENTOR VALIDATION SCORE (Yếu tố 2) =====

export interface MentorValidationScore {
  mentorId: string;
  domain: SubjectDomain;
  contentAccuracy: number;            // 0-100
  difficultyAppropriateness: number;  // 0-100
  prerequisiteCompleteness: number;   // 0-100
  pedagogicalSoundness: number;       // 0-100
  overallValidation: 'approved' | 'needs_revision' | 'rejected';
  feedback: string;
  suggestedModifications: string[];
}

// ===== CROSS-DISCIPLINARY PANEL SCORE (Yếu tố 3) =====

export interface CrossDisciplinaryPanelScore {
  panelId: string;
  reviewers: {
    mentorId: string;
    domain: SubjectDomain;
    score: number;        // 0-100
    feedback: string;
  }[];
  transitionQuality: number;          // 0-100 - chất lượng chuyển đổi liên môn
  knowledgeIntegration: number;       // 0-100 - tích hợp kiến thức
  practicalRelevance: number;         // 0-100 - liên quan thực tế
  coherenceScore: number;             // 0-100 - tính liền mạch
  consensusLevel: 'unanimous' | 'majority' | 'split' | 'disagreement';
  overallRecommendation: 'proceed' | 'modify' | 'restructure' | 'reject';
}

// ===== AI SCORING MATRIX (Yếu tố 4) =====

export interface AIScoringMatrix {
  studentId: string;
  evaluatedAt: Date;

  // Ma trận điểm cho từng nền tảng AI
  platformScores: {
    platform: 'openai' | 'gemini' | 'grok' | 'claude';
    totalScore: number;       // 0-100
    dimensions: {
      contentQuality: number;       // Chất lượng nội dung phù hợp
      personalization: number;      // Khả năng cá nhân hóa
      interactivity: number;        // Tính tương tác
      costEfficiency: number;       // Hiệu quả chi phí
      domainExpertise: number;      // Chuyên môn lĩnh vực
      languageSupport: number;      // Hỗ trợ ngôn ngữ Việt
    };
  }[];

  // Đề xuất kết hợp nền tảng theo từng giai đoạn
  hybridRecommendation: {
    phase: string;
    primaryPlatform: string;
    reason: string;
  }[];
}

// ===== COMPOSITE ASSESSMENT (Tổng hợp 4 yếu tố) =====

export interface CompositeAssessment {
  id: string;
  studentId: string;
  createdAt: Date;
  assessmentType: 'initial' | 'periodic' | 'adaptive' | 'post_module';

  // 4 yếu tố đánh giá
  studentProfile: StudentProfileScore;
  mentorValidation: MentorValidationScore[];
  crossDisciplinaryPanel: CrossDisciplinaryPanelScore;
  aiScoringMatrix: AIScoringMatrix;

  // Kết quả tổng hợp
  compositeScore: number;  // 0-100
  dimensionBreakdown: DimensionScore[];

  // Lộ trình đề xuất
  recommendedPath: {
    domains: SubjectDomain[];
    estimatedDuration: string;
    startingDifficulty: number;
    weeklyPlan: {
      week: number;
      focus: string;
      domains: SubjectDomain[];
      hours: number;
      milestones: string[];
    }[];
  };

  // Metadata đánh giá lại
  nextReassessmentDate: Date;
  reassessmentTriggers: ReassessmentTrigger[];
}

// ===== RE-ASSESSMENT SYSTEM =====

export type ReassessmentTriggerType =
  | 'scheduled_periodic'      // Định kỳ (2-4 tuần)
  | 'post_module'             // Sau khi hoàn thành module
  | 'performance_drop'        // AI phát hiện điểm giảm
  | 'performance_surge'       // AI phát hiện tiến bộ vượt bậc
  | 'goal_change'             // Người học thay đổi mục tiêu
  | 'streak_break'            // Mất streak > 7 ngày
  | 'difficulty_mismatch'     // Quá khó hoặc quá dễ
  | 'time_availability_change'; // Thay đổi thời gian có sẵn

export interface ReassessmentTrigger {
  type: ReassessmentTriggerType;
  triggeredAt: Date;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  autoTriggered: boolean; // AI tự trigger hay người dùng yêu cầu
  metrics: {
    metric: string;
    previousValue: number;
    currentValue: number;
    threshold: number;
  }[];
}

export interface ReassessmentResult {
  id: string;
  studentId: string;
  previousAssessmentId: string;
  trigger: ReassessmentTrigger;
  performedAt: Date;

  // So sánh trước/sau
  comparison: {
    dimension: string;
    previousScore: number;
    currentScore: number;
    change: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];

  // Điều chỉnh lộ trình
  pathAdjustments: {
    type: 'difficulty_change' | 'domain_add' | 'domain_remove' | 'pace_change' | 'content_swap' | 'milestone_shift';
    description: string;
    oldValue: string;
    newValue: string;
    reasoning: string;
  }[];

  // Lịch đánh giá lại tiếp theo
  nextScheduledReassessment: Date;
  adaptiveCheckpoints: Date[];
}

// ===== SURVEY QUESTIONS DEFINITION =====

export interface SurveyQuestion {
  id: string;
  section: number;
  sectionTitle: string;
  question: string;
  type: 'single_select' | 'multi_select' | 'slider' | 'text' | 'rating_grid';
  required: boolean;
  options?: {
    value: string;
    label: string;
    icon?: string;
    description?: string;
  }[];
  validation?: {
    min?: number;
    max?: number;
    minSelect?: number;
    maxSelect?: number;
  };
  fieldKey: keyof StudentProfileSurvey;
  dependsOn?: {
    questionId: string;
    values: string[];
  };
}

// ===== SURVEY SECTIONS =====

export const SURVEY_SECTIONS = [
  { id: 1, title: 'Thông tin cơ bản', icon: '👤', description: 'Giúp chúng tôi hiểu bạn hơn' },
  { id: 2, title: 'Phong cách học tập', icon: '🧠', description: 'Cách bạn tiếp thu kiến thức tốt nhất' },
  { id: 3, title: 'Điểm mạnh & Điểm yếu', icon: '📊', description: 'Đánh giá năng lực hiện tại' },
  { id: 4, title: 'Mục tiêu học tập', icon: '🎯', description: 'Bạn muốn đạt được gì?' },
  { id: 5, title: 'Khả năng cam kết', icon: '⏰', description: 'Thời gian và nguồn lực' },
  { id: 6, title: 'Sở thích & Động lực', icon: '💡', description: 'Điều gì thúc đẩy bạn?' },
] as const;

// ===== DOMAIN DISPLAY MAP =====

export const DOMAIN_DISPLAY: Record<SubjectDomain, { name: string; icon: string; color: string }> = {
  [SubjectDomain.MATH]: { name: 'Toán học', icon: '🧮', color: 'text-blue-400' },
  [SubjectDomain.PHYSICS]: { name: 'Vật lý', icon: '⚛️', color: 'text-cyan-400' },
  [SubjectDomain.CHEMISTRY]: { name: 'Hóa học', icon: '🧪', color: 'text-green-400' },
  [SubjectDomain.BIOLOGY]: { name: 'Sinh học', icon: '🧬', color: 'text-emerald-400' },
  [SubjectDomain.COMPUTER_SCIENCE]: { name: 'Tin học', icon: '💻', color: 'text-violet-400' },
  [SubjectDomain.MUSIC]: { name: 'Âm nhạc', icon: '🎵', color: 'text-pink-400' },
  [SubjectDomain.ART]: { name: 'Nghệ thuật', icon: '🎨', color: 'text-rose-400' },
  [SubjectDomain.LANGUAGE]: { name: 'Ngôn ngữ', icon: '📝', color: 'text-amber-400' },
  [SubjectDomain.HISTORY]: { name: 'Lịch sử', icon: '📜', color: 'text-orange-400' },
  [SubjectDomain.GEOGRAPHY]: { name: 'Địa lý', icon: '🌍', color: 'text-teal-400' },
  [SubjectDomain.ECONOMICS]: { name: 'Kinh tế', icon: '📈', color: 'text-yellow-400' },
  [SubjectDomain.PHILOSOPHY]: { name: 'Triết học', icon: '💭', color: 'text-indigo-400' },
};
