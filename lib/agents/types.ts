// Agent Types cho Aeroeduvison

export type AgentRole = 'student' | 'teacher' | 'admin';

export type AgentId = 
  // Student Agents
  | 'study-planner'
  | 'ai-tutor'
  | 'progress-tracker'
  | 'exam-prep'
  | 'career-advisor'
  // Teacher Agents
  | 'content-generator'
  | 'auto-grading'
  | 'exam-matrix'
  | 'student-insight'
  | 'schedule-planner'
  | 'feedback-generator'
  | 'education-research'
  // Admin Agents
  | 'system-monitor'
  | 'analytics-report'
  | 'compliance-checker'
  | 'resource-optimizer';

export interface AgentManifest {
  id: AgentId;
  name: string;
  displayName: string;
  description: string;
  role: AgentRole;
  mode: 'interactive' | 'background' | 'hybrid';
  schedule?: string; // Cron expression
  capabilities: string[];
  tools: string[];
  enabled: boolean;
}

export interface AgentMessage {
  id: string;
  agentId: AgentId;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface AgentLoopResult {
  success: boolean;
  response: string;
  toolCalls?: ToolCall[];
  tokenUsage: TokenUsage;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface StudentProgress {
  studentId: string;
  completionRate: number;
  accuracyTrend: number[];
  timeSpent: number; // seconds per week
  engagementScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  predictedScore?: number;
  struggleTopics: string[];
}

export interface LearningSession {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  duration: number; // seconds
  score?: number;
  engagement: number;
  timestamp: Date;
}

// Agent Config
export interface AgentConfig {
  llmProvider: 'openai' | 'anthropic' | 'google' | 'ollama';
  model: string;
  maxTokens: number;
  temperature: number;
  maxIterations: number;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  llmProvider: 'openai',
  model: 'gpt-4o-mini',
  maxTokens: 2048,
  temperature: 0.7,
  maxIterations: 10,
};
