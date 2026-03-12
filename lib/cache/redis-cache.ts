/**
 * Redis Cache Service
 * 
 * Caching layer for exam generation and PDF exports
 */

import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface CacheConfig {
  ttl: number;
  prefix: string;
}

const configs: Record<string, CacheConfig> = {
  exam: { ttl: 3600, prefix: 'exam:' },        // 1 hour
  matrix: { ttl: 7200, prefix: 'matrix:' },    // 2 hours
  pdf: { ttl: 1800, prefix: 'pdf:' },          // 30 minutes
  question: { ttl: 86400, prefix: 'question:' }, // 24 hours
  teacher: { ttl: 43200, prefix: 'teacher:' },   // 12 hours
};

export async function getCachedExam(examId: string) {
  const key = `${configs.exam.prefix}${examId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheExam(examId: string, exam: any, ttl = configs.exam.ttl) {
  const key = `${configs.exam.prefix}${examId}`;
  await redis.setex(key, ttl, JSON.stringify(exam));
}

export async function getCachedMatrix(matrixId: string) {
  const key = `${configs.matrix.prefix}${matrixId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheMatrix(matrixId: string, matrix: any, ttl = configs.matrix.ttl) {
  const key = `${configs.matrix.prefix}${matrixId}`;
  await redis.setex(key, ttl, JSON.stringify(matrix));
}

export async function getCachedPDF(pdfId: string) {
  const key = `${configs.pdf.prefix}${pdfId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cachePDF(pdfId: string, pdfData: any, ttl = configs.pdf.ttl) {
  const key = `${configs.pdf.prefix}${pdfId}`;
  await redis.setex(key, ttl, JSON.stringify(pdfData));
}

export async function getCachedQuestion(questionId: string) {
  const key = `${configs.question.prefix}${questionId}`;
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheQuestion(questionId: string, question: any, ttl = configs.question.ttl) {
  const key = `${configs.question.prefix}${questionId}`;
  await redis.setex(key, ttl, JSON.stringify(question));
}

export async function invalidateExam(examId: string) {
  const key = `${configs.exam.prefix}${examId}`;
  await redis.del(key);
}

export async function invalidatePDF(pdfId: string) {
  const key = `${configs.pdf.prefix}${pdfId}`;
  await redis.del(key);
}

export async function getCacheStats() {
  const info = await redis.info('stats');
  const keys = await redis.keys('*');
  
  return {
    connected_clients: info.split('\n').find(line => line.includes('connected_clients'))?.split(':')[1],
    used_memory: info.split('\n').find(line => line.includes('used_memory_human'))?.split(':')[1],
    total_keys: keys.length,
    exam_keys: keys.filter(k => k.startsWith(configs.exam.prefix)).length,
    matrix_keys: keys.filter(k => k.startsWith(configs.matrix.prefix)).length,
    pdf_keys: keys.filter(k => k.startsWith(configs.pdf.prefix)).length,
  };
}

export async function clearCache(pattern = '*') {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  return keys.length;
}

export default redis;
