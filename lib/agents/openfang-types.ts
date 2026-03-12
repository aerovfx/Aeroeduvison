/**
 * OpenFang Types - Cloned from openfang-core/openfang-types
 * Core data structures for Aeroeduvison agent system
 */

export type AgentId = string;
export type SessionId = string;
export type MessageId = string;

export enum AgentState {
  Idle = 'idle',
  Running = 'running',
  Paused = 'paused',
  Stopped = 'stopped',
  Error = 'error',
}

export interface AgentCapability {
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentConfig {
  agentId: AgentId;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  llmProvider: string;
  llmModel: string;
  maxTokens: number;
  temperature: number;
}

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
  Tool = 'tool',
}

export interface Message {
  id: MessageId;
  sessionId: SessionId;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Session {
  id: SessionId;
  agentId: AgentId;
  userId: string;
  state: AgentState;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  toolName: string;
  arguments: Record<string, any>;
  result: any;
  success: boolean;
}

export enum LlmProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Gemini = 'gemini',
  Ollama = 'ollama',
  OpenRouter = 'openrouter',
  Groq = 'groq',
}

export interface LlmRequest {
  provider: LlmProvider;
  model: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  tools?: Tool[];
}

export interface LlmResponse {
  content: string;
  finishReason: string;
  usage: UsageInfo;
  toolCalls?: ToolCall[];
}

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export class OpenFangError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'OpenFangError';
  }
}

export const Errors = {
  agentNotFound: (id: string) => new OpenFangError('AGENT_NOT_FOUND', `Agent not found: ${id}`),
  sessionNotFound: (id: string) => new OpenFangError('SESSION_NOT_FOUND', `Session not found: ${id}`),
  llmError: (message: string) => new OpenFangError('LLM_ERROR', `LLM error: ${message}`),
  toolError: (message: string) => new OpenFangError('TOOL_ERROR', `Tool execution error: ${message}`),
};
