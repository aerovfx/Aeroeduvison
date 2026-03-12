import { AgentManifest, AgentId, AgentRole } from './types';

// Registry tất cả Agents trong hệ thống
export const AGENT_REGISTRY: Record<AgentId, AgentManifest> = {
  // Student Agents
  'study-planner': {
    id: 'study-planner',
    name: 'Study Planner',
    displayName: 'Trợ Lý Học Tập',
    description: 'Lập kế hoạch học tập cá nhân hóa và nhắc nhở thông minh',
    role: 'student',
    mode: 'background',
    schedule: '0 8 * * *', // 8am daily
    capabilities: ['read:student_profile', 'write:study_plan', 'send:notifications'],
    tools: ['calendar_management', 'goal_tracking', 'reminder_system'],
    enabled: true,
  },
  'ai-tutor': {
    id: 'ai-tutor',
    name: 'AI Tutor',
    displayName: 'Gia Sư AI',
    description: 'Gia sư 1-1 cho từng môn học, giải thích khái niệm theo nhiều cách',
    role: 'student',
    mode: 'interactive',
    capabilities: ['read:knowledge_graph', 'explain:concepts', 'solve:problems'],
    tools: ['subject_knowledge', 'problem_solver', 'explanation_generator'],
    enabled: true,
  },
  'progress-tracker': {
    id: 'progress-tracker',
    name: 'Progress Tracker',
    displayName: 'Theo Dõi Tiến Độ',
    description: 'Theo dõi tiến độ học tập và phát hiện học sinh có nguy cơ',
    role: 'student',
    mode: 'background',
    schedule: '0 20 * * *', // 8pm daily
    capabilities: ['read:progress', 'analyze:trends', 'alert:risk'],
    tools: ['progress_analytics', 'risk_detector', 'intervention_recommender'],
    enabled: true,
  },
  'exam-prep': {
    id: 'exam-prep',
    name: 'Exam Prep',
    displayName: 'Ôn Thi',
    description: 'Tạo đề thi thử và phân tích điểm mạnh/yếu',
    role: 'student',
    mode: 'interactive',
    capabilities: ['generate:exams', 'grade:answers', 'analyze:results'],
    tools: ['exam_generator', 'auto_grader', 'analytics_engine'],
    enabled: true,
  },
  'career-advisor': {
    id: 'career-advisor',
    name: 'Career Advisor',
    displayName: 'Tư Vấn Hướng Nghiệp',
    description: 'Tư vấn hướng nghiệp dựa trên sở thích và năng lực',
    role: 'student',
    mode: 'interactive',
    capabilities: ['analyze:profile', 'recommend:careers', 'connect:alumni'],
    tools: ['career_database', 'match_algorithm', 'alumni_network'],
    enabled: true,
  },

  // Teacher Agents
  'content-generator': {
    id: 'content-generator',
    name: 'Content Generator',
    displayName: 'Soạn Giáo Án',
    description: 'Soạn giáo án, tạo slide và sinh câu hỏi kiểm tra',
    role: 'teacher',
    mode: 'interactive',
    capabilities: ['generate:lessons', 'create:slides', 'generate:questions'],
    tools: ['lesson_planner', 'slide_generator', 'question_generator'],
    enabled: true,
  },
  'auto-grading': {
    id: 'auto-grading',
    name: 'Auto Grading',
    displayName: 'Chấm Bài Tự Động',
    description: 'Chấm trắc nghiệm và tự luận với AI',
    role: 'teacher',
    mode: 'hybrid',
    capabilities: ['grade:mcq', 'grade:essay', 'generate:feedback'],
    tools: ['exact_match_grader', 'semantic_grader', 'rubric_grader'],
    enabled: true,
  },
  'exam-matrix': {
    id: 'exam-matrix',
    name: 'Exam Matrix',
    displayName: 'Ma Trận Đề Thi',
    description: 'Tạo ma trận đề thi tự động với tỉ lệ 40-30-30',
    role: 'teacher',
    mode: 'interactive',
    capabilities: ['generate:matrix', 'validate:ratios', 'create:variants'],
    tools: ['matrix_generator', 'question_selector', 'variant_creator'],
    enabled: true,
  },
  'student-insight': {
    id: 'student-insight',
    name: 'Student Insight',
    displayName: 'Phân Tích Học Sinh',
    description: 'Phân tích hành vi học tập và dự đoán kết quả',
    role: 'teacher',
    mode: 'background',
    schedule: '0 6 * * 1', // 6am Monday
    capabilities: ['analyze:behavior', 'predict:performance', 'recommend:interventions'],
    tools: ['behavior_analyzer', 'prediction_model', 'intervention_engine'],
    enabled: true,
  },
  'schedule-planner': {
    id: 'schedule-planner',
    name: 'Schedule Planner',
    displayName: 'Xếp Thời Khóa Biểu',
    description: 'Xếp thời khóa biểu tối ưu và quản lý lịch dạy',
    role: 'teacher',
    mode: 'interactive',
    capabilities: ['schedule:classes', 'resolve:conflicts', 'manage:calendar'],
    tools: ['scheduler_optimizer', 'conflict_resolver', 'calendar_manager'],
    enabled: true,
  },
  'feedback-generator': {
    id: 'feedback-generator',
    name: 'Feedback Generator',
    displayName: 'Nhận Xét Học Bá',
    description: 'Tạo nhận xét học bạ tự động cho từng học sinh',
    role: 'teacher',
    mode: 'background',
    schedule: '0 9 1 5 *', // 9am May 1st (end of school year)
    capabilities: ['generate:comments', 'personalize:feedback', 'balance:tone'],
    tools: ['comment_generator', 'student_analyzer', 'tone_balancer'],
    enabled: true,
  },
  'education-research': {
    id: 'education-research',
    name: 'Education Research',
    displayName: 'Nghiên Cứu Giáo Dục',
    description: 'Tổng hợp nghiên cứu giáo dục mới và best practices',
    role: 'teacher',
    mode: 'background',
    schedule: '0 7 * * 1', // 7am Monday
    capabilities: ['search:research', 'summarize:findings', 'recommend:applications'],
    tools: ['research_searcher', 'summarizer', 'application_recommender'],
    enabled: true,
  },

  // Admin Agents
  'system-monitor': {
    id: 'system-monitor',
    name: 'System Monitor',
    displayName: 'Giám Sát Hệ Thống',
    description: 'Giám sát hệ thống 24/7 và phát hiện sự cố',
    role: 'admin',
    mode: 'background',
    schedule: '*/5 * * * *', // Every 5 minutes
    capabilities: ['monitor:health', 'detect:anomalies', 'send:alerts'],
    tools: ['health_checker', 'anomaly_detector', 'alert_system'],
    enabled: true,
  },
  'analytics-report': {
    id: 'analytics-report',
    name: 'Analytics Report',
    displayName: 'Báo Cáo Thống Kê',
    description: 'Tạo báo cáo tự động daily/weekly/monthly',
    role: 'admin',
    mode: 'background',
    schedule: '0 7 * * *', // 7am daily
    capabilities: ['generate:reports', 'analyze:trends', 'export:data'],
    tools: ['report_generator', 'trend_analyzer', 'export_engine'],
    enabled: true,
  },
  'compliance-checker': {
    id: 'compliance-checker',
    name: 'Compliance Checker',
    displayName: 'Kiểm Tra Compliance',
    description: 'Kiểm tra compliance với quy định Bộ GD',
    role: 'admin',
    mode: 'background',
    schedule: '0 8 1 * *', // 8am first day of month
    capabilities: ['audit:curriculum', 'check:compliance', 'generate:reports'],
    tools: ['audit_engine', 'compliance_checker', 'report_generator'],
    enabled: true,
  },
  'resource-optimizer': {
    id: 'resource-optimizer',
    name: 'Resource Optimizer',
    displayName: 'Tối Ưu Tài Nguyên',
    description: 'Tối ưu sử dụng phòng học và thiết bị',
    role: 'admin',
    mode: 'background',
    schedule: '0 10 * * 1', // 10am Monday
    capabilities: ['optimize:rooms', 'manage:equipment', 'predict:needs'],
    tools: ['room_optimizer', 'equipment_tracker', 'need_predictor'],
    enabled: true,
  },
};

export function getAgentsByRole(role: AgentRole): AgentManifest[] {
  return Object.values(AGENT_REGISTRY).filter(agent => agent.role === role);
}

export function getAgentById(id: AgentId): AgentManifest | undefined {
  return AGENT_REGISTRY[id];
}

export function getEnabledAgents(): AgentManifest[] {
  return Object.values(AGENT_REGISTRY).filter(agent => agent.enabled);
}
