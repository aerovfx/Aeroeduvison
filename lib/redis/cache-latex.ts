/**
 * LaTeX Compilation Cache
 */

import { redisClient } from './client';

const KEYS = {
  pdf: (hash: string) => `latex:pdf:${hash}`,
  log: (hash: string) => `latex:log:${hash}`,
  project: (projectId: string) => `latex:project:${projectId}`,
  stats: () => 'latex:stats',
};

const TTL = {
  pdf: 604800, // 7 days
  log: 604800, // 7 days
  project: 3600, // 1 hour
  stats: 300, // 5 minutes
};

export const latexCache = {
  /**
   * Cache compiled PDF
   */
  async cachePdf(hash: string, pdf: Buffer, log: string): Promise<void> {
    await redisClient.set(`${KEYS.pdf(hash)}:meta`, JSON.stringify({ size: pdf.length, log }));
    // Store PDF as base64
    await redisClient.set(KEYS.pdf(hash), pdf.toString('base64'), TTL.pdf);
  },

  /**
   * Get cached PDF
   */
  async getPdf(hash: string): Promise<{ pdf: Buffer; log: string } | null> {
    const metaStr = await redisClient.get(`${KEYS.pdf(hash)}:meta`);
    const pdfBase64 = await redisClient.get(KEYS.pdf(hash));
    
    if (!metaStr || !pdfBase64) return null;
    
    const meta = JSON.parse(metaStr);
    const pdf = Buffer.from(pdfBase64, 'base64');
    
    return { pdf, log: meta.log || '' };
  },

  /**
   * Check if PDF is cached
   */
  async hasPdf(hash: string): Promise<boolean> {
    return redisClient.exists(KEYS.pdf(hash));
  },

  /**
   * Cache project data
   */
  async cacheProject(projectId: string, project: any): Promise<void> {
    await redisClient.setJson(KEYS.project(projectId), project, TTL.project);
  },

  /**
   * Get cached project
   */
  async getProject(projectId: string): Promise<any | null> {
    return redisClient.getJson(KEYS.project(projectId));
  },

  /**
   * Increment compile counter
   */
  async incrementCompileCount(): Promise<number> {
    return redisClient.incr('latex:compile:count');
  },

  /**
   * Get compile stats
   */
  async getStats(): Promise<{ count: number; cacheHits: number }> {
    const [count, cacheHits] = await Promise.all([
      redisClient.getCounter('latex:compile:count'),
      redisClient.getCounter('latex:cache:hits'),
    ]);
    return { count, cacheHits };
  },

  /**
   * Record cache hit
   */
  async recordCacheHit(): Promise<void> {
    await redisClient.incr('latex:cache:hits');
  },

  /**
   * Clear LaTeX cache
   */
  async clear(): Promise<void> {
    await redisClient.delPattern('latex:*');
  },
};

export default latexCache;
