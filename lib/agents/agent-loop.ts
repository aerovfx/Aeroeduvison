import { AgentMessage, AgentLoopResult, ToolCall, TokenUsage, AgentConfig, DEFAULT_AGENT_CONFIG } from './types';

export class AgentLoop {
  private config: AgentConfig;
  private messages: AgentMessage[] = [];
  private toolRegistry: Map<string, Function> = new Map();

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
  }

  registerTool(name: string, handler: Function) {
    this.toolRegistry.set(name, handler);
  }

  async run(systemPrompt: string, userMessage: string, context?: Record<string, any>): Promise<AgentLoopResult> {
    try {
      this.messages.push({
        id: `msg-${Date.now()}`,
        agentId: 'ai-tutor',
        userId: context?.userId || 'anonymous',
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        metadata: context,
      });

      const promptMessages = [
        { role: 'system', content: systemPrompt },
        ...this.messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content })),
      ];

      const response = await fetch('/api/agents/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: promptMessages, config: this.config }),
      });

      if (!response.ok) throw new Error('LLM call failed');
      const data = await response.json();

      return {
        success: true,
        response: data.content,
        tokenUsage: data.usage,
      };
    } catch (error: any) {
      return {
        success: false,
        response: `Error: ${error.message}`,
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      };
    }
  }

  getHistory(): AgentMessage[] {
    return this.messages;
  }

  clearHistory() {
    this.messages = [];
  }
}
