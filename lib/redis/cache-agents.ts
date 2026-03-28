/**
 * Agent System Cache
 */

import { redisClient } from './client';

const KEYS = {
  agentUsage: (userId: string, agentId: string) => `agent:usage:${userId}:${agentId}`,
  agentSession: (sessionId: string) => `agent:session:${sessionId}`,
  agentStats: () => 'agent:stats',
  dailyReminder: (studentId: string, date: string) => `agent:reminder:${studentId}:${date}`,
};

const TTL = {
  agentUsage: 3600, // 1 hour
  agentSession: 86400, // 24 hours
  agentStats: 300, // 5 minutes
  dailyReminder: 86400, // 24 hours
};

export const agentCache = {
  /**
   * Generic getJson - delegates to redisClient
   */
  async getJson<T = any>(key: string): Promise<T | null> {
    return redisClient.getJson<T>(`agent:${key}`);
  },

  /**
   * Generic setJson - delegates to redisClient
   */
  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    await redisClient.setJson(`agent:${key}`, value, ttl);
  },

  /**
   * Cache agent usage
   */
  async cacheUsage(userId: string, agentId: string, usage: any): Promise<void> {
    await redisClient.setJson(KEYS.agentUsage(userId, agentId), usage, TTL.agentUsage);
  },

  /**
   * Get cached usage
   */
  async getUsage(userId: string, agentId: string): Promise<any | null> {
    return redisClient.getJson(KEYS.agentUsage(userId, agentId));
  },

  /**
   * Cache agent session
   */
  async cacheSession(sessionId: string, session: any): Promise<void> {
    await redisClient.setJson(KEYS.agentSession(sessionId), session, TTL.agentSession);
  },

  /**
   * Get cached session
   */
  async getSession(sessionId: string): Promise<any | null> {
    return redisClient.getJson(KEYS.agentSession(sessionId));
  },

  /**
   * Cache daily reminder
   */
  async cacheReminder(studentId: string, reminder: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    await redisClient.setJson(KEYS.dailyReminder(studentId, date), reminder, TTL.dailyReminder);
  },

  /**
   * Get cached reminder
   */
  async getReminder(studentId: string): Promise<any | null> {
    const date = new Date().toISOString().split('T')[0];
    return redisClient.getJson(KEYS.dailyReminder(studentId, date));
  },

  /**
   * Increment agent usage counter
   */
  async incrementUsage(agentId: string): Promise<number> {
    const key = `agent:count:${agentId}`;
    return redisClient.incr(key);
  },

  /**
   * Clear agent cache
   */
  async clear(): Promise<void> {
    await redisClient.delPattern('agent:*');
  },
};

export default agentCache;
