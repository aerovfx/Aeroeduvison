/**
 * SessionMemoryService
 * Manages AI session context, memory persistence, and auto-summarization
 * 
 * Phase 2 Component: Provides context retention for Socratic tutor interactions
 * Handles ChatSession, AISessionMessage, SessionMemory, and SessionSummary models
 */

import { prisma } from "@/lib/prisma";
import type {
  ChatSession,
  AISessionMessage,
  SessionMemory,
  SessionSummary,
} from "@prisma/client";

export type AgentType = "tutor" | "researcher" | "predictor" | "analyst";
export type MessageRole = "user" | "assistant" | "system";
export type MemoryType = "concept" | "skill" | "preference" | "mistake";
export type Sentiment = "positive" | "negative" | "neutral";

/**
 * Creates or retrieves a chat session
 */
export async function createSession(
  userId: string,
  agentType: AgentType,
  options?: {
    title?: string;
    subject?: string;
    topic?: string;
    grade?: string;
  }
): Promise<ChatSession> {
  return prisma.chatSession.create({
    data: {
      userId,
      agentType,
      title: options?.title || `${agentType} session`,
      subject: options?.subject,
      topic: options?.topic,
      grade: options?.grade,
      status: "active",
    },
  });
}

/**
 * Adds a message to a session (tutor, student, or system)
 */
export async function addSessionMessage(
  sessionId: string,
  role: MessageRole,
  content: string,
  metadata?: {
    sentiment?: Sentiment;
    confidence?: number;
    entities?: Record<string, any>;
    intent?: string;
  }
): Promise<AISessionMessage> {
  const message = await prisma.aISessionMessage.create({
    data: {
      sessionId,
      role,
      content,
      sentiment: metadata?.sentiment,
      confidence: metadata?.confidence,
      entities: metadata?.entities,
      intent: metadata?.intent,
    },
  });

  // Increment message count in session
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { messageCount: { increment: 1 } },
  });

  return message;
}

/**
 * Records a learning memory (concept, skill, misconception, etc.)
 */
export async function recordMemory(
  sessionId: string,
  key: string, // e.g., 'learned_pythagorean_theorem', 'struggles_with_algebra'
  value: Record<string, any>,
  options?: {
    type?: MemoryType;
    confidence?: number;
    importance?: number; // 1-10 scale
  }
): Promise<SessionMemory> {
  // Check if memory exists
  const existing = await prisma.sessionMemory.findUnique({
    where: {
      sessionId_key: {
        sessionId,
        key,
      },
    },
  });

  if (existing) {
    // Update existing memory - increase mention count and update confidence
    return prisma.sessionMemory.update({
      where: { id: existing.id },
      data: {
        value,
        confidence: Math.max(
          existing.confidence,
          options?.confidence ?? 0.8
        ),
        mentionCount: { increment: 1 },
        importance: options?.importance ?? existing.importance,
        lastMentionedAt: new Date(),
      },
    });
  }

  // Create new memory
  return prisma.sessionMemory.create({
    data: {
      sessionId,
      key,
      value,
      type: options?.type ?? "concept",
      confidence: options?.confidence ?? 0.8,
      importance: options?.importance ?? 5,
    },
  });
}

/**
 * Retrieves all memories for a session
 */
export async function getSessionMemories(
  sessionId: string,
  filters?: {
    type?: MemoryType;
    minImportance?: number;
  }
): Promise<SessionMemory[]> {
  return prisma.sessionMemory.findMany({
    where: {
      sessionId,
      type: filters?.type,
      importance: filters?.minImportance
        ? { gte: filters.minImportance }
        : undefined,
    },
    orderBy: [
      { importance: "desc" },
      { confidence: "desc" },
      { lastMentionedAt: "desc" },
    ],
  });
}

/**
 * Retrieves chat history for a session
 */
export async function getSessionHistory(
  sessionId: string,
  limit?: number
): Promise<AISessionMessage[]> {
  return prisma.aISessionMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit ?? 50,
  });
}

/**
 * Auto-generates a session summary from messages and memories
 */
export async function generateSessionSummary(
  sessionId: string
): Promise<SessionSummary> {
  const messages = await getSessionHistory(sessionId);
  const memories = await getSessionMemories(sessionId);

  // Extract topics and learnings from messages
  const mainTopics: Set<string> = new Set();
  const keyLearnings: Set<string> = new Set();
  const misconceptions: Set<string> = new Set();

  // Parse memories for topics and concepts
  memories.forEach((mem) => {
    if (mem.type === "concept" || mem.type === "skill") {
      keyLearnings.add(mem.key);
    }
    if (mem.type === "mistake") {
      misconceptions.add(mem.key);
    }
  });

  // Analyze progression in messages
  let correctAnswers = 0;
  let totalQuestions = 0;

  messages.forEach((msg) => {
    if (msg.role === "user") {
      totalQuestions++;
    }
  });

  // Create or update summary
  let summary = await prisma.sessionSummary.findUnique({
    where: { sessionId },
  });

  const duration = messages.length > 0
    ? Math.round(
        (new Date(messages[messages.length - 1].createdAt).getTime() -
          new Date(messages[0].createdAt).getTime()) /
          1000
      )
    : 0;

  if (summary) {
    summary = await prisma.sessionSummary.update({
      where: { id: summary.id },
      data: {
        mainTopics: Array.from(mainTopics),
        keyLearnings: Array.from(keyLearnings),
        misconceptions: Array.from(misconceptions),
        messageCount: messages.length,
        duration,
        questionsAsked: totalQuestions,
        updatedAt: new Date(),
      },
    });
  } else {
    summary = await prisma.sessionSummary.create({
      data: {
        sessionId,
        mainTopics: Array.from(mainTopics),
        keyLearnings: Array.from(keyLearnings),
        misconceptions: Array.from(misconceptions),
        strengths: [],
        improvements: [],
        messageCount: messages.length,
        duration,
        questionsAsked: totalQuestions,
      },
    });
  }

  return summary;
}

/**
 * Updates session progress metrics (XP, questions answered, etc.)
 */
export async function updateSessionProgress(
  sessionId: string,
  updates: {
    xpEarned?: number;
    lessonsCompleted?: number;
    correctAnswers?: number;
    totalQuestions?: number;
  }
): Promise<ChatSession> {
  const data: Record<string, any> = {};

  if (updates.xpEarned) data.totalXPEarned = { increment: updates.xpEarned };
  if (updates.lessonsCompleted !== undefined)
    data.lessonsCompleted = { increment: updates.lessonsCompleted };
  if (updates.correctAnswers !== undefined)
    data.correctAnswers = { increment: updates.correctAnswers };
  if (updates.totalQuestions !== undefined)
    data.totalQuestions = { increment: updates.totalQuestions };

  return prisma.chatSession.update({
    where: { id: sessionId },
    data,
  });
}

/**
 * Closes a session (archives it)
 */
export async function closeSession(sessionId: string): Promise<ChatSession> {
  // Generate final summary
  await generateSessionSummary(sessionId);

  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: "archived" },
  });
}

/**
 * Retrieves user's learning profile
 */
export async function getUserLearningProfile(userId: string) {
  const profile = await prisma.userLearningProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    // Create default profile
    return prisma.userLearningProfile.create({
      data: {
        userId,
        preferredStyle: "mixed",
        learningPace: "normal",
        difficultyLevel: "medium",
      },
    });
  }

  return profile;
}

/**
 * Updates user learning profile based on session performance
 */
export async function updateLearningProfile(
  userId: string,
  updates: {
    preferredStyle?: string;
    learningPace?: string;
    difficultyLevel?: string;
    coreStrengths?: string[];
    areasForGrowth?: string[];
    knownMisconceptions?: string[];
    totalHours?: number;
    preferredSubjects?: string[];
  }
): Promise<typeof prisma.userLearningProfile> {
  const profile = await getUserLearningProfile(userId);

  const data: Record<string, any> = {};

  if (updates.preferredStyle) data.preferredStyle = updates.preferredStyle;
  if (updates.learningPace) data.learningPace = updates.learningPace;
  if (updates.difficultyLevel) data.difficultyLevel = updates.difficultyLevel;
  if (updates.coreStrengths) data.coreStrengths = updates.coreStrengths;
  if (updates.areasForGrowth) data.areasForGrowth = updates.areasForGrowth;
  if (updates.knownMisconceptions)
    data.knownMisconceptions = updates.knownMisconceptions;
  if (updates.totalHours) data.totalHours = updates.totalHours;
  if (updates.preferredSubjects) data.preferredSubjects = updates.preferredSubjects;

  data.updatedAt = new Date();

  return prisma.userLearningProfile.update({
    where: { userId },
    data,
  });
}

/**
 * Gets session context for AI tutor (recent messages + key memories)
 */
export async function getSessionContext(
  sessionId: string,
  relevantMemoriesCount: number = 10
): Promise<{
  recentMessages: AISessionMessage[];
  memories: SessionMemory[];
  summary?: SessionSummary | null;
  totalMessageCount: number;
}> {
  const [recentMessages, memories, summary, session] = await Promise.all([
    getSessionHistory(sessionId, 20),
    getSessionMemories(sessionId, { minImportance: 4 }),
    prisma.sessionSummary.findUnique({ where: { sessionId } }),
    prisma.chatSession.findUnique({ where: { id: sessionId } }),
  ]);

  return {
    recentMessages,
    memories: memories.slice(0, relevantMemoriesCount),
    summary,
    totalMessageCount: session?.messageCount ?? 0,
  };
}

/**
 * Formats session context for AI prompt injection
 */
export function formatContextForPrompt(context: Awaited<ReturnType<typeof getSessionContext>>): string {
  const sections: string[] = [];

  // Add session summary if available
  if (context.summary) {
    sections.push(`## Tóm Tắt Buổi Học`);
    if (context.summary.mainTopics.length > 0) {
      sections.push(`Chủ đề chính: ${context.summary.mainTopics.join(", ")}`);
    }
    if (context.summary.keyLearnings.length > 0) {
      sections.push(`Kiến thức đã học: ${context.summary.keyLearnings.join(", ")}`);
    }
    if (context.summary.misconceptions.length > 0) {
      sections.push(
        `Những khái niệm sai: ${context.summary.misconceptions.join(", ")}`
      );
    }
  }

  // Add important memories
  if (context.memories.length > 0) {
    sections.push(`## Thông Tin Học Sinh`);
    context.memories.forEach((mem) => {
      sections.push(`- **${mem.key}** (${mem.type}): ${JSON.stringify(mem.value)}`);
    });
  }

  // Add recent message summary
  if (context.recentMessages.length > 0) {
    sections.push(`## Lịch Sử Gần Đây`);
    const recentContext = context.recentMessages
      .slice(-5)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 100)}...`)
      .join("\n");
    sections.push(recentContext);
  }

  return sections.join("\n\n");
}

/**
 * Cleans up old sessions (archive sessions older than 30 days)
 */
export async function cleanupOldSessions(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.chatSession.updateMany({
    where: {
      status: "active",
      createdAt: { lt: cutoffDate },
    },
    data: { status: "archived" },
  });

  return result.count;
}
