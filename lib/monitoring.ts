/**
 * monitoring.ts - Production-ready monitoring system for LMS
 * 
 * Features:
 * - Performance monitoring
 * - Health checks
 * - Metrics collection
 * - Alerting system
 * - Dashboard integration
 */

import { apiLogger } from './logging-simple';
import { ErrorHandler } from './error-handling';

// Monitoring configuration
const MONITORING_CONFIG = {
  METRICS_INTERVAL: 30000, // 30 seconds
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  ALERT_THRESHOLDS: {
    CPU_USAGE: 80,
    MEMORY_USAGE: 85,
    RESPONSE_TIME: 5000,
    ERROR_RATE: 5,
    DISK_USAGE: 90
  },
  RETENTION_DAYS: 30
};

// Metric types
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

// Metric interface
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

// Health check result
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// System metrics
export interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  uptime: number;
}

// Application metrics
export interface ApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  database: {
    connections: number;
    queries: number;
    averageQueryTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

// Monitoring class
export class MonitoringSystem {
  private static instance: MonitoringSystem;
  private metrics: Metric[] = [];
  private healthChecks: HealthCheck[] = [];
  private systemMetrics: SystemMetrics | null = null;
  private applicationMetrics: ApplicationMetrics | null = null;
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  private constructor() {}

  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    apiLogger.info('Starting monitoring system');

    // Start metrics collection
    this.startMetricsCollection();
    
    // Start health checks
    this.startHealthChecks();
    
    // Start system monitoring
    this.startSystemMonitoring();
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    apiLogger.info('Stopping monitoring system');

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  private startMetricsCollection(): void {
    const interval = setInterval(() => {
      this.collectApplicationMetrics();
    }, MONITORING_CONFIG.METRICS_INTERVAL);
    
    this.intervals.push(interval);
  }

  private startHealthChecks(): void {
    const interval = setInterval(() => {
      this.runHealthChecks();
    }, MONITORING_CONFIG.HEALTH_CHECK_INTERVAL);
    
    this.intervals.push(interval);
  }

  private startSystemMonitoring(): void {
    const interval = setInterval(() => {
      this.collectSystemMetrics();
    }, MONITORING_CONFIG.METRICS_INTERVAL);
    
    this.intervals.push(interval);
  }

  // Metrics collection
  recordMetric(name: string, value: number, type: MetricType = MetricType.GAUGE, tags: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      type,
      value,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    this.cleanupOldMetrics();
    
    // Check for alerts
    this.checkAlerts(metric);
  }

  recordCounter(name: string, increment: number = 1, tags: Record<string, string> = {}): void {
    this.recordMetric(name, increment, MetricType.COUNTER, tags);
  }

  recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric(name, value, MetricType.GAUGE, tags);
  }

  recordTimer(name: string, duration: number, tags: Record<string, string> = {}): void {
    this.recordMetric(name, duration, MetricType.TIMER, tags);
  }

  // Health checks
  async runHealthChecks(): Promise<void> {
    const checks = [
      this.checkDatabase(),
      this.checkCache(),
      this.checkExternalAPIs(),
      this.checkFileSystem(),
      this.checkMemory()
    ];

    const results = await Promise.allSettled(checks);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const healthCheck: HealthCheck = {
          name: `health_check_${index}`,
          status: 'unhealthy',
          message: result.reason?.message || 'Unknown error',
          timestamp: new Date()
        };
        this.healthChecks.push(healthCheck);
      }
    });

    // Keep only recent health checks
    this.cleanupOldHealthChecks();
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple database ping
      const { db } = await import('./db');
      await db.$queryRaw`SELECT 1`;
      
      return {
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  private async checkCache(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const { CacheManager } = await import('./cache');
      await CacheManager.set('health_check', 'ok', 10);
      const result = await CacheManager.get('health_check');
      
      return {
        name: 'cache',
        status: result === 'ok' ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'cache',
        status: 'unhealthy',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  private async checkExternalAPIs(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check external API endpoints
      const response = await fetch('https://httpbin.org/status/200', { 
        method: 'GET',
        timeout: 5000 
      });
      
      return {
        name: 'external_apis',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'external_apis',
        status: 'unhealthy',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  private async checkFileSystem(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const fs = await import('fs/promises');
      await fs.access('.', fs.constants.R_OK | fs.constants.W_OK);
      
      return {
        name: 'file_system',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'file_system',
        status: 'unhealthy',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      return {
        name: 'memory',
        status: usagePercent > 90 ? 'unhealthy' : usagePercent > 80 ? 'degraded' : 'healthy',
        responseTime: Date.now() - startTime,
        metadata: { usagePercent },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        message: (error as Error).message,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  // System metrics collection
  private async collectSystemMetrics(): Promise<void> {
    try {
      const os = await import('os');
      const memUsage = process.memoryUsage();
      
      this.systemMetrics = {
        cpu: {
          usage: 0, // Would need external library for real CPU usage
          load: os.loadavg()
        },
        memory: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          usage: (memUsage.heapUsed / memUsage.heapTotal) * 100
        },
        disk: {
          used: 0, // Would need external library for disk usage
          total: 0,
          usage: 0
        },
        network: {
          bytesIn: 0, // Would need external library for network stats
          bytesOut: 0
        },
        uptime: process.uptime()
      };

      // Record system metrics
      this.recordGauge('system.memory.usage', this.systemMetrics.memory.usage);
      this.recordGauge('system.uptime', this.systemMetrics.uptime);
      
    } catch (error) {
      apiLogger.error('Failed to collect system metrics', {
        metadata: { error: (error as Error).message }
      });
    }
  }

  // Application metrics collection
  private collectApplicationMetrics(): void {
    try {
      const errorStats = ErrorHandler.getInstance().getErrorStats();
      
      this.applicationMetrics = {
        requests: {
          total: this.getMetricSum('requests.total'),
          successful: this.getMetricSum('requests.successful'),
          failed: this.getMetricSum('requests.failed'),
          averageResponseTime: this.getMetricAverage('requests.response_time')
        },
        database: {
          connections: 0, // Would need database connection monitoring
          queries: this.getMetricSum('database.queries'),
          averageQueryTime: this.getMetricAverage('database.query_time')
        },
        cache: {
          hits: this.getMetricSum('cache.hits'),
          misses: this.getMetricSum('cache.misses'),
          hitRate: this.calculateCacheHitRate()
        },
        errors: {
          total: Object.values(errorStats.errorCounts).reduce((sum, count) => sum + count, 0),
          byType: errorStats.errorCounts
        }
      };

      // Record application metrics
      this.recordGauge('app.requests.total', this.applicationMetrics.requests.total);
      this.recordGauge('app.requests.success_rate', 
        (this.applicationMetrics.requests.successful / this.applicationMetrics.requests.total) * 100);
      this.recordGauge('app.cache.hit_rate', this.applicationMetrics.cache.hitRate);
      
    } catch (error) {
      apiLogger.error('Failed to collect application metrics', {
        metadata: { error: (error as Error).message }
      });
    }
  }

  // Alert system
  private checkAlerts(metric: Metric): void {
    const thresholds = MONITORING_CONFIG.ALERT_THRESHOLDS;
    
    switch (metric.name) {
      case 'system.memory.usage':
        if (metric.value > thresholds.MEMORY_USAGE) {
          this.sendAlert('High memory usage', {
            metric: metric.name,
            value: metric.value,
            threshold: thresholds.MEMORY_USAGE
          });
        }
        break;
        
      case 'requests.response_time':
        if (metric.value > thresholds.RESPONSE_TIME) {
          this.sendAlert('High response time', {
            metric: metric.name,
            value: metric.value,
            threshold: thresholds.RESPONSE_TIME
          });
        }
        break;
        
      case 'app.requests.success_rate':
        if (metric.value < (100 - thresholds.ERROR_RATE)) {
          this.sendAlert('High error rate', {
            metric: metric.name,
            value: metric.value,
            threshold: 100 - thresholds.ERROR_RATE
          });
        }
        break;
    }
  }

  private sendAlert(message: string, context: Record<string, any>): void {
    apiLogger.error(`ALERT: ${message}`, { metadata: context });
    
    // Could send to Slack, email, etc.
    console.error('ALERT:', message, context);
  }

  // Utility methods
  private getMetricSum(name: string): number {
    return this.metrics
      .filter(m => m.name === name)
      .reduce((sum, m) => sum + m.value, 0);
  }

  private getMetricAverage(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((sum, m) => sum + m.value, 0);
    return sum / metrics.length;
  }

  private calculateCacheHitRate(): number {
    const hits = this.getMetricSum('cache.hits');
    const misses = this.getMetricSum('cache.misses');
    const total = hits + misses;
    
    return total > 0 ? (hits / total) * 100 : 0;
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - MONITORING_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  private cleanupOldHealthChecks(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.healthChecks = this.healthChecks.filter(h => h.timestamp > cutoff);
  }

  // Public getters
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  getHealthChecks(): HealthCheck[] {
    return [...this.healthChecks];
  }

  getSystemMetrics(): SystemMetrics | null {
    return this.systemMetrics;
  }

  getApplicationMetrics(): ApplicationMetrics | null {
    return this.applicationMetrics;
  }

  getStatus(): {
    isRunning: boolean;
    metricsCount: number;
    healthChecksCount: number;
    lastUpdate: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      metricsCount: this.metrics.length,
      healthChecksCount: this.healthChecks.length,
      lastUpdate: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].timestamp : null
    };
  }
}

// Performance monitoring decorator
export function monitorPerformance(name: string, tags: Record<string, string> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const monitoring = MonitoringSystem.getInstance();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        monitoring.recordTimer(`${name}.${propertyName}`, duration, tags);
        monitoring.recordCounter(`${name}.${propertyName}.success`, 1, tags);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        monitoring.recordTimer(`${name}.${propertyName}`, duration, tags);
        monitoring.recordCounter(`${name}.${propertyName}.error`, 1, tags);
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Request monitoring middleware
export function monitorRequest(req: any, res: any, next: any) {
  const startTime = Date.now();
  const monitoring = MonitoringSystem.getInstance();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const tags = {
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode.toString()
    };
    
    monitoring.recordTimer('requests.response_time', duration, tags);
    monitoring.recordCounter('requests.total', 1, tags);
    
    if (res.statusCode >= 200 && res.statusCode < 400) {
      monitoring.recordCounter('requests.successful', 1, tags);
    } else {
      monitoring.recordCounter('requests.failed', 1, tags);
    }
  });
  
  next();
}

// Initialize monitoring
export function initializeMonitoring(): MonitoringSystem {
  const monitoring = MonitoringSystem.getInstance();
  monitoring.start();
  return monitoring;
}

export default MonitoringSystem;
