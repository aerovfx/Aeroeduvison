/**
 * Question Bank Cache
 */

import { redisClient } from './client';

const KEYS = {
  question: (questionId: string) => `question:${questionId}`,
  questionsBySubject: (subject: string, grade: string) => `questions:${subject}:${grade}`,
  questionsByTopic: (topic: string) => `questions:topic:${topic}`,
  matrix: (matrixId: string) => `matrix:${matrixId}`,
  examRoom: (examRoomId: string) => `examroom:${examRoomId}`,
  stats: () => 'questions:stats',
};

const TTL = {
  question: 3600, // 1 hour
  questionsBySubject: 1800, // 30 minutes
  questionsByTopic: 1800, // 30 minutes
  matrix: 3600, // 1 hour
  examRoom: 3600, // 1 hour
  stats: 300, // 5 minutes
};

export const questionCache = {
  /**
   * Cache single question
   */
  async cacheQuestion(questionId: string, question: any): Promise<void> {
    await redisClient.setJson(KEYS.question(questionId), question, TTL.question);
  },

  /**
   * Get cached question
   */
  async getQuestion(questionId: string): Promise<any | null> {
    return redisClient.getJson(KEYS.question(questionId));
  },

  /**
   * Cache questions list by subject/grade
   */
  async cacheQuestionsBySubject(subject: string, grade: string, questions: any[]): Promise<void> {
    await redisClient.setJson(KEYS.questionsBySubject(subject, grade), questions, TTL.questionsBySubject);
  },

  /**
   * Get cached questions by subject/grade
   */
  async getQuestionsBySubject(subject: string, grade: string): Promise<any[] | null> {
    return redisClient.getJson(KEYS.questionsBySubject(subject, grade));
  },

  /**
   * Cache questions by topic
   */
  async cacheQuestionsByTopic(topic: string, questions: any[]): Promise<void> {
    await redisClient.setJson(KEYS.questionsByTopic(topic), questions, TTL.questionsByTopic);
  },

  /**
   * Get cached questions by topic
   */
  async getQuestionsByTopic(topic: string): Promise<any[] | null> {
    return redisClient.getJson(KEYS.questionsByTopic(topic));
  },

  /**
   * Cache exam matrix
   */
  async cacheMatrix(matrixId: string, matrix: any): Promise<void> {
    await redisClient.setJson(KEYS.matrix(matrixId), matrix, TTL.matrix);
  },

  /**
   * Get cached matrix
   */
  async getMatrix(matrixId: string): Promise<any | null> {
    return redisClient.getJson(KEYS.matrix(matrixId));
  },

  /**
   * Cache exam room
   */
  async cacheExamRoom(examRoomId: string, examRoom: any): Promise<void> {
    await redisClient.setJson(KEYS.examRoom(examRoomId), examRoom, TTL.examRoom);
  },

  /**
   * Get cached exam room
   */
  async getExamRoom(examRoomId: string): Promise<any | null> {
    return redisClient.getJson(KEYS.examRoom(examRoomId));
  },

  /**
   * Invalidate question cache
   */
  async invalidateQuestion(questionId: string): Promise<void> {
    await redisClient.del(KEYS.question(questionId));
    // Also invalidate lists
    await redisClient.delPattern('questions:*');
  },

  /**
   * Clear question cache
   */
  async clear(): Promise<void> {
    await redisClient.delPattern('question:*');
    await redisClient.delPattern('questions:*');
    await redisClient.delPattern('matrix:*');
    await redisClient.delPattern('examroom:*');
  },
};

export default questionCache;
