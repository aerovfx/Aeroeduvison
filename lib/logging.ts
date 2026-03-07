import winston from 'winston'
import { NextRequest, NextResponse } from 'next/server'

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

// Log categories
export enum LogCategory {
  AUTH = 'auth',
  API = 'api',
  DATABASE = 'database',
  UPLOAD = 'upload',
  PAYMENT = 'payment',
  EMAIL = 'email',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance'
}

// Log context interface
export interface LogContext {
  userId?: string
  schoolId?: string
  requestId?: string
  sessionId?: string
  userAgent?: string
  ip?: string
  method?: string
  url?: string
  statusCode?: number
  responseTime?: number
  error?: Error
  metadata?: Record<string, any>
}

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, category, context, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        category,
        context,
        ...meta
      })
    })
  ),
  defaultMeta: {
    service: 'lmsmath',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
})

// Add Cloud Logging transport for production
if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLOUD_PROJECT) {
  const { LoggingWinston } = require('@google-cloud/logging-winston')
  
  logger.add(new LoggingWinston({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    resource: {
      type: 'cloud_run_revision',
      labels: {
        service_name: 'lmsmath',
        revision_name: process.env.K_REVISION || 'unknown'
      }
    }
  }))
}

// Structured logging functions
export class Logger {
  private static generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  static error(message: string, category: LogCategory, context?: LogContext, error?: Error) {
    logger.error(message, {
      category,
      context: {
        ...context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      }
    })
  }

  static warn(message: string, category: LogCategory, context?: LogContext) {
    logger.warn(message, { category, context })
  }

  static info(message: string, category: LogCategory, context?: LogContext) {
    logger.info(message, { category, context })
  }

  static http(message: string, context?: LogContext) {
    logger.http(message, { category: LogCategory.API, context })
  }

  static debug(message: string, category: LogCategory, context?: LogContext) {
    logger.debug(message, { category, context })
  }

  // Request logging
  static logRequest(req: NextRequest, res: NextResponse, responseTime: number) {
    const context: LogContext = {
      requestId: this.generateRequestId(),
      method: req.method,
      url: req.url,
      statusCode: res.status,
      responseTime,
      userAgent: req.headers.get('user-agent') || undefined,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
    }

    const level = res.status >= 400 ? 'error' : 'info'
    const message = `${req.method} ${req.url} ${res.status} - ${responseTime}ms`

    logger.log(level, message, {
      category: LogCategory.API,
      context
    })
  }

  // Authentication logging
  static logAuth(action: string, userId?: string, schoolId?: string, success: boolean = true) {
    const context: LogContext = {
      userId,
      schoolId,
      requestId: this.generateRequestId()
    }

    const message = `Auth ${action} ${success ? 'successful' : 'failed'}`
    const level = success ? 'info' : 'warn'

    logger.log(level, message, {
      category: LogCategory.AUTH,
      context
    })
  }

  // Database logging
  static logDatabase(operation: string, table: string, context?: LogContext, error?: Error) {
    const message = `Database ${operation} on ${table}`
    
    if (error) {
      this.error(message, LogCategory.DATABASE, context, error)
    } else {
      this.info(message, LogCategory.DATABASE, context)
    }
  }

  // Security logging
  static logSecurity(event: string, context?: LogContext, severity: 'low' | 'medium' | 'high' = 'medium') {
    const message = `Security event: ${event}`
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info'
    
    logger.log(level, message, {
      category: LogCategory.SECURITY,
      context: {
        ...context,
        severity
      }
    })
  }

  // Performance logging
  static logPerformance(operation: string, duration: number, context?: LogContext) {
    const message = `Performance: ${operation} took ${duration}ms`
    
    logger.info(message, {
      category: LogCategory.PERFORMANCE,
      context: {
        ...context,
        duration
      }
    })
  }

  // Business event logging
  static logBusinessEvent(event: string, context?: LogContext, metadata?: Record<string, any>) {
    logger.info(`Business event: ${event}`, {
      category: LogCategory.SYSTEM,
      context,
      metadata
    })
  }
}

// Express-style middleware for Next.js API routes
export function withLogging(handler: Function) {
  return async (req: NextRequest, context: any) => {
    const startTime = Date.now()
    let response: NextResponse

    try {
      // Add request ID to headers
      const requestId = crypto.randomUUID()
      req.headers.set('x-request-id', requestId)

      // Log request start
      Logger.http(`Request started: ${req.method} ${req.url}`, {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent') || undefined,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      })

      // Execute handler
      response = await handler(req, context)
      
      // Calculate response time
      const responseTime = Date.now() - startTime
      
      // Log request completion
      Logger.logRequest(req, response, responseTime)
      
      return response
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      // Log error
      Logger.error(`Request failed: ${req.method} ${req.url}`, LogCategory.API, {
        requestId: req.headers.get('x-request-id') || undefined,
        method: req.method,
        url: req.url,
        responseTime
      }, error as Error)
      
      // Return error response
      return new NextResponse('Internal Server Error', { status: 500 })
    }
  }
}

// Error boundary for React components
export class LoggingErrorBoundary extends Error {
  constructor(error: Error, context?: LogContext) {
    super(error.message)
    this.name = 'LoggingErrorBoundary'
    this.stack = error.stack
    
    Logger.error('React Error Boundary caught error', LogCategory.SYSTEM, context, error)
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map()

  static start(label: string): void {
    this.timers.set(label, Date.now())
  }

  static end(label: string, context?: LogContext): number {
    const startTime = this.timers.get(label)
    if (!startTime) {
      Logger.warn(`Performance timer '${label}' not found`, LogCategory.PERFORMANCE, context)
      return 0
    }

    const duration = Date.now() - startTime
    this.timers.delete(label)
    
    Logger.logPerformance(label, duration, context)
    return duration
  }

  static measure<T>(label: string, fn: () => T, context?: LogContext): T {
    this.start(label)
    try {
      const result = fn()
      this.end(label, context)
      return result
    } catch (error) {
      this.end(label, context)
      throw error
    }
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    this.start(label)
    try {
      const result = await fn()
      this.end(label, context)
      return result
    } catch (error) {
      this.end(label, context)
      throw error
    }
  }
}

export default logger
