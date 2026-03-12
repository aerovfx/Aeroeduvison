/**
 * Audit Logging Service
 * Tracks sensitive operations for security auditing
 * Logs: Data access, modifications, deletions, authentication events
 */

import { prisma } from '@/lib/prisma';

export type AuditEventType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ESSAY_SUBMITTED'
  | 'ESSAY_GRADED'
  | 'GRADE_MODIFIED'
  | 'RUBRIC_CREATED'
  | 'DATA_EXPORT'
  | 'DATA_ACCESS'
  | 'FAILED_AUTH'
  | 'PERMISSION_DENIED'
  | 'SECURITY_ALERT'
  | 'PII_DETECTED'
  | 'CONTENT_BLOCKED';

export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  userId?: string;
  email?: string;
  ipAddress?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  additionalData?: Record<string, any>;
  timestamp?: Date;
  successful: boolean;
}

/**
 * In-memory audit log (can be extended to use Prisma model)
 * In production, use a dedicated audit log table/service
 */
class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 10000;

  /**
   * Log an event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry
    };

    this.logs.push(logEntry);

    // Keep logs bounded
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[AUDIT] ${logEntry.eventType}: ${logEntry.action} by ${logEntry.userId || logEntry.ipAddress}`
      );
    }

    // TODO: In production, send to:
    // - External audit service (e.g., AWS CloudTrail)
    // - Elasticsearch for analysis
    // - SIEM system
  }

  /**
   * Get logs with filtering
   */
  getLogs(options?: {
    eventType?: AuditEventType;
    userId?: string;
    securityLevel?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let filtered = [...this.logs];

    if (options?.eventType) {
      filtered = filtered.filter(log => log.eventType === options.eventType);
    }

    if (options?.userId) {
      filtered = filtered.filter(log => log.userId === options.userId);
    }

    if (options?.securityLevel) {
      filtered = filtered.filter(log => log.securityLevel === options.securityLevel);
    }

    if (options?.startDate) {
      filtered = filtered.filter(log => log.timestamp && log.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(log => log.timestamp && log.timestamp <= options.endDate!);
    }

    // Return most recent first
    filtered.reverse();

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get audit statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    criticalEvents: number;
    eventsBySecurityLevel: Record<string, number>;
    usersAffected: Set<string>;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySecurityLevel: Record<string, number> = {};
    const usersAffected = new Set<string>();
    let criticalEvents = 0;

    for (const log of this.logs) {
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
      eventsBySecurityLevel[log.securityLevel] =
        (eventsBySecurityLevel[log.securityLevel] || 0) + 1;

      if (log.securityLevel === 'critical') {
        criticalEvents++;
      }

      if (log.userId) {
        usersAffected.add(log.userId);
      }
    }

    return {
      totalEvents: this.logs.length,
      eventsByType: eventsByType as Record<AuditEventType, number>,
      criticalEvents,
      eventsBySecurityLevel,
      usersAffected
    };
  }

  /**
   * Generate audit report
   */
  generateReport(timeRangeHours: number = 24): {
    reportDate: Date;
    timeRange: string;
    totalEvents: number;
    suspiciousActivity: AuditLogEntry[];
    failedAuthAttempts: number;
    securityAlerts: number;
    recommendations: string[];
  } {
    const now = new Date();
    const startDate = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);

    const relevantLogs = this.getLogs({
      startDate,
      endDate: now
    });

    const suspiciousActivity = relevantLogs.filter(
      log => log.securityLevel === 'critical' || log.securityLevel === 'high'
    );

    const failedAuthAttempts = relevantLogs.filter(
      log => log.eventType === 'FAILED_AUTH'
    ).length;

    const securityAlerts = relevantLogs.filter(
      log => log.eventType === 'SECURITY_ALERT' || log.eventType === 'PII_DETECTED'
    ).length;

    const recommendations: string[] = [];

    if (failedAuthAttempts > 10) {
      recommendations.push(
        `⚠️ ${failedAuthAttempts} failed auth attempts detected - consider increasing security measures`
      );
    }

    if (securityAlerts > 5) {
      recommendations.push(
        `🔒 ${securityAlerts} security alerts - review content filtering and PII detection`
      );
    }

    if (suspiciousActivity.length > 20) {
      recommendations.push('⚠️ High number of suspicious activities - review logs manually');
    }

    return {
      reportDate: now,
      timeRange: `Last ${timeRangeHours} hours`,
      totalEvents: relevantLogs.length,
      suspiciousActivity,
      failedAuthAttempts,
      securityAlerts,
      recommendations
    };
  }

  /**
   * Export logs
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    // CSV export
    const headers = [
      'timestamp',
      'eventType',
      'userId',
      'action',
      'resource',
      'securityLevel',
      'successful'
    ];
    const rows = this.logs.map(log => [
      log.timestamp?.toISOString() || '',
      log.eventType,
      log.userId || '',
      log.action,
      log.resource,
      log.securityLevel,
      log.successful ? 'Yes' : 'No'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  /**
   * Clear logs (use with caution!)
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger();

/**
 * Convenience logging functions
 */

export async function logUserLogin(userId: string, ipAddress: string): Promise<void> {
  await auditLogger.log({
    eventType: 'USER_LOGIN',
    userId,
    ipAddress,
    action: 'User logged in',
    resource: 'user_auth',
    securityLevel: 'low',
    successful: true
  });
}

export async function logFailedAuth(email: string, ipAddress: string, reason?: string): Promise<void> {
  await auditLogger.log({
    eventType: 'FAILED_AUTH',
    email,
    ipAddress,
    action: `Failed authentication: ${reason || 'invalid credentials'}`,
    resource: 'user_auth',
    securityLevel: 'medium',
    successful: false,
    additionalData: { reason }
  });
}

export async function logEssaySubmission(
  userId: string,
  submissionId: string,
  rubricId: string
): Promise<void> {
  await auditLogger.log({
    eventType: 'ESSAY_SUBMITTED',
    userId,
    action: 'Essay submitted for grading',
    resource: 'submission',
    resourceId: submissionId,
    securityLevel: 'low',
    successful: true,
    additionalData: { rubricId }
  });
}

export async function logEssayGraded(
  userId: string,
  submissionId: string,
  grade: number
): Promise<void> {
  await auditLogger.log({
    eventType: 'ESSAY_GRADED',
    userId: 'analyst-agent',
    action: 'Essay graded by AI',
    resource: 'submission',
    resourceId: submissionId,
    securityLevel: 'low',
    successful: true,
    additionalData: { studentId: userId, grade }
  });
}

export async function logPIIDetected(
  userId: string,
  ipAddress: string,
  content: string,
  piiType: string
): Promise<void> {
  await auditLogger.log({
    eventType: 'PII_DETECTED',
    userId,
    ipAddress,
    action: `PII detected in content: ${piiType}`,
    resource: 'content_submission',
    securityLevel: 'high',
    successful: false,
    additionalData: {
      piiType,
      contentLength: content.length
    }
  });
}

export async function logContentBlocked(
  userId: string,
  ipAddress: string,
  blockedCategory: string
): Promise<void> {
  await auditLogger.log({
    eventType: 'CONTENT_BLOCKED',
    userId,
    ipAddress,
    action: `Content blocked: ${blockedCategory}`,
    resource: 'content_submission',
    securityLevel: 'critical',
    successful: false,
    additionalData: { blockedCategory }
  });
}

export async function logDataAccess(
  userId: string,
  resource: string,
  resourceId: string
): Promise<void> {
  await auditLogger.log({
    eventType: 'DATA_ACCESS',
    userId,
    action: `Accessed ${resource}`,
    resource,
    resourceId,
    securityLevel: 'low',
    successful: true
  });
}

export async function logGradeModified(
  userId: string,
  gradeId: string,
  changes: Record<string, any>
): Promise<void> {
  await auditLogger.log({
    eventType: 'GRADE_MODIFIED',
    userId,
    action: 'Grade modified by teacher',
    resource: 'grade',
    resourceId: gradeId,
    changes,
    securityLevel: 'high',
    successful: true
  });
}

export async function logSecurityAlert(
  userId: string,
  ipAddress: string,
  alertType: string,
  details: any
): Promise<void> {
  await auditLogger.log({
    eventType: 'SECURITY_ALERT',
    userId,
    ipAddress,
    action: `Security alert: ${alertType}`,
    resource: 'security',
    securityLevel: 'critical',
    successful: false,
    additionalData: details
  });
}

/**
 * Get audit logs with filtering
 */
export function getAuditLogs(options?: {
  eventType?: AuditEventType;
  userId?: string;
  securityLevel?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): AuditLogEntry[] {
  return auditLogger.getLogs(options);
}

/**
 * Get audit statistics
 */
export function getAuditStats() {
  return auditLogger.getStats();
}

/**
 * Generate audit report
 */
export function generateAuditReport(timeRangeHours?: number) {
  return auditLogger.generateReport(timeRangeHours);
}
