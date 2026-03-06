/**
 * Authentication Audit Logger
 * 
 * Logs all authentication-related events for security and compliance
 */

import { db } from '@/lib/db';
import crypto from 'crypto';

export type AuthAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'password_reset'
  | 'password_change'
  | 'failed_login'
  | 'account_locked'
  | 'account_unlocked'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | '2fa_failed'
  | 'email_verified'
  | 'session_expired';

export type AuthStatus = 'success' | 'failed' | 'blocked' | 'pending';

export interface AuthLogData {
  userId?: string;
  email: string;
  action: AuthAction;
  status: AuthStatus;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(data: AuthLogData): Promise<void> {
  try {
    const logId = `authlog_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    await db.authLog.create({
      data: {
        id: logId,
        userId: data.userId,
        email: data.email,
        action: data.action,
        status: data.status,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata || {},
        createdAt: new Date()
      }
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUTH_LOG] ${data.action} - ${data.status} - ${data.email} - IP: ${data.ipAddress || 'unknown'}`);
    }
  } catch (error) {
    // Don't throw errors from logging - just log to console
    console.error('[AUTH_LOG] Failed to write audit log:', error);
  }
}

/**
 * Get recent auth logs for a user
 */
export async function getUserAuthLogs(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    return await db.authLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  } catch (error) {
    console.error('[AUTH_LOG] Failed to fetch user logs:', error);
    return [];
  }
}

/**
 * Get failed login attempts for an email
 */
export async function getFailedLoginAttempts(
  email: string,
  sinceMinutes: number = 30
): Promise<number> {
  try {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    
    const count = await db.authLog.count({
      where: {
        email,
        action: 'failed_login',
        createdAt: { gte: since }
      }
    });
    
    return count;
  } catch (error) {
    console.error('[AUTH_LOG] Failed to count failed attempts:', error);
    return 0;
  }
}

/**
 * Get all auth logs (admin only)
 */
export async function getAllAuthLogs(
  filters?: {
    action?: AuthAction;
    status?: AuthStatus;
    email?: string;
    startDate?: Date;
    endDate?: Date;
  },
  page: number = 1,
  pageSize: number = 100
): Promise<{ logs: any[]; total: number }> {
  try {
    const where: any = {};
    
    if (filters?.action) where.action = filters.action;
    if (filters?.status) where.status = filters.status;
    if (filters?.email) where.email = { contains: filters.email, mode: 'insensitive' };
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    
    const [logs, total] = await Promise.all([
      db.authLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }),
      db.authLog.count({ where })
    ]);
    
    return { logs, total };
  } catch (error) {
    console.error('[AUTH_LOG] Failed to fetch all logs:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * Clean up old auth logs (retention policy)
 */
export async function cleanupOldAuthLogs(retentionDays: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await db.authLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    
    console.log(`[AUTH_LOG] Cleaned up ${result.count} old logs older than ${retentionDays} days`);
    return result.count;
  } catch (error) {
    console.error('[AUTH_LOG] Failed to cleanup old logs:', error);
    return 0;
  }
}

/**
 * Get auth statistics
 */
export async function getAuthStats(startDate?: Date, endDate?: Date): Promise<{
  totalLogins: number;
  totalFailedLogins: number;
  totalRegistrations: number;
  totalAccountLockouts: number;
  total2FAEnabled: number;
  uniqueUsers: number;
}> {
  try {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    const [
      totalLogins,
      totalFailedLogins,
      totalRegistrations,
      totalAccountLockouts,
      total2FAEnabled,
      uniqueUserLogs
    ] = await Promise.all([
      db.authLog.count({ where: { ...where, action: 'login', status: 'success' } }),
      db.authLog.count({ where: { ...where, action: 'failed_login' } }),
      db.authLog.count({ where: { ...where, action: 'register', status: 'success' } }),
      db.authLog.count({ where: { ...where, action: 'account_locked' } }),
      db.authLog.count({ where: { ...where, action: '2fa_enabled', status: 'success' } }),
      db.authLog.findMany({
        where,
        select: { userId: true },
        distinct: ['userId']
      })
    ]);
    
    return {
      totalLogins,
      totalFailedLogins,
      totalRegistrations,
      totalAccountLockouts,
      total2FAEnabled,
      uniqueUsers: uniqueUserLogs.filter(log => log.userId).length
    };
  } catch (error) {
    console.error('[AUTH_LOG] Failed to fetch stats:', error);
    return {
      totalLogins: 0,
      totalFailedLogins: 0,
      totalRegistrations: 0,
      totalAccountLockouts: 0,
      total2FAEnabled: 0,
      uniqueUsers: 0
    };
  }
}

