/**
 * error-handling.ts - Production-ready error handling system for LMS
 * 
 * Features:
 * - Custom error classes
 * - Error categorization
 * - Error recovery strategies
 * - Error reporting and monitoring
 * - User-friendly error messages
 */

import { apiLogger } from './logging-simple';
import { NextResponse } from 'next/server';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Base error class
export abstract class BaseError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code: string = 'UNKNOWN_ERROR',
    context: Record<string, any> = {},
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.timestamp = new Date();
    this.context = context;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      isOperational: this.isOperational,
      stack: this.stack
    };
  }
}

// Specific error classes
export class ValidationError extends BaseError {
  constructor(message: string, field?: string, value?: any) {
    super(
      message,
      ErrorType.VALIDATION,
      ErrorSeverity.LOW,
      'VALIDATION_ERROR',
      { field, value }
    );
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required', context: Record<string, any> = {}) {
    super(
      message,
      ErrorType.AUTHENTICATION,
      ErrorSeverity.HIGH,
      'AUTHENTICATION_ERROR',
      context
    );
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions', resource?: string, action?: string) {
    super(
      message,
      ErrorType.AUTHORIZATION,
      ErrorSeverity.HIGH,
      'AUTHORIZATION_ERROR',
      { resource, action }
    );
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string, id?: string) {
    super(
      `${resource} not found${id ? ` with ID: ${id}` : ''}`,
      ErrorType.NOT_FOUND,
      ErrorSeverity.MEDIUM,
      'NOT_FOUND_ERROR',
      { resource, id }
    );
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, resource?: string, conflictingField?: string) {
    super(
      message,
      ErrorType.CONFLICT,
      ErrorSeverity.MEDIUM,
      'CONFLICT_ERROR',
      { resource, conflictingField }
    );
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(
      message,
      ErrorType.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      'RATE_LIMIT_ERROR',
      { retryAfter }
    );
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, operation?: string, table?: string) {
    super(
      message,
      ErrorType.DATABASE,
      ErrorSeverity.HIGH,
      'DATABASE_ERROR',
      { operation, table }
    );
  }
}

export class ExternalAPIError extends BaseError {
  constructor(message: string, service?: string, statusCode?: number) {
    super(
      message,
      ErrorType.EXTERNAL_API,
      ErrorSeverity.MEDIUM,
      'EXTERNAL_API_ERROR',
      { service, statusCode }
    );
  }
}

export class FileSystemError extends BaseError {
  constructor(message: string, operation?: string, filePath?: string) {
    super(
      message,
      ErrorType.FILE_SYSTEM,
      ErrorSeverity.MEDIUM,
      'FILE_SYSTEM_ERROR',
      { operation, filePath }
    );
  }
}

export class NetworkError extends BaseError {
  constructor(message: string, url?: string, statusCode?: number) {
    super(
      message,
      ErrorType.NETWORK,
      ErrorSeverity.MEDIUM,
      'NETWORK_ERROR',
      { url, statusCode }
    );
  }
}

export class BusinessLogicError extends BaseError {
  constructor(message: string, rule?: string, context?: Record<string, any>) {
    super(
      message,
      ErrorType.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      'BUSINESS_LOGIC_ERROR',
      { rule, ...context }
    );
  }
}

export class InternalError extends BaseError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(
      message,
      ErrorType.INTERNAL,
      ErrorSeverity.CRITICAL,
      'INTERNAL_ERROR',
      context,
      false // Not operational
    );
  }
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, Date> = new Map();

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: Error, context: Record<string, any> = {}): void {
    const errorInfo = this.analyzeError(error);
    
    // Log error
    this.logError(error, errorInfo, context);
    
    // Track error metrics
    this.trackError(errorInfo);
    
    // Report to monitoring service
    this.reportError(error, errorInfo, context);
    
    // Handle critical errors
    if (errorInfo.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(error, errorInfo, context);
    }
  }

  private analyzeError(error: Error): {
    type: ErrorType;
    severity: ErrorSeverity;
    code: string;
    isOperational: boolean;
  } {
    if (error instanceof BaseError) {
      return {
        type: error.type,
        severity: error.severity,
        code: error.code,
        isOperational: error.isOperational
      };
    }

    // Analyze standard errors
    if (error.name === 'ValidationError') {
      return {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: 'VALIDATION_ERROR',
        isOperational: true
      };
    }

    if (error.message.includes('not found')) {
      return {
        type: ErrorType.NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        code: 'NOT_FOUND_ERROR',
        isOperational: true
      };
    }

    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return {
        type: ErrorType.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        code: 'AUTHORIZATION_ERROR',
        isOperational: true
      };
    }

    if (error.message.includes('database') || error.message.includes('prisma')) {
      return {
        type: ErrorType.DATABASE,
        severity: ErrorSeverity.HIGH,
        code: 'DATABASE_ERROR',
        isOperational: true
      };
    }

    // Default to internal error
    return {
      type: ErrorType.INTERNAL,
      severity: ErrorSeverity.CRITICAL,
      code: 'INTERNAL_ERROR',
      isOperational: false
    };
  }

  private logError(error: Error, errorInfo: any, context: Record<string, any>): void {
    const logData = {
      error: error.message,
      type: errorInfo.type,
      severity: errorInfo.severity,
      code: errorInfo.code,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    switch (errorInfo.severity) {
      case ErrorSeverity.CRITICAL:
        apiLogger.error('Critical error occurred', { metadata: logData }, error);
        break;
      case ErrorSeverity.HIGH:
        apiLogger.error('High severity error', { metadata: logData }, error);
        break;
      case ErrorSeverity.MEDIUM:
        apiLogger.warn('Medium severity error', { metadata: logData });
        break;
      case ErrorSeverity.LOW:
        apiLogger.info('Low severity error', { metadata: logData });
        break;
    }
  }

  private trackError(errorInfo: any): void {
    const key = `${errorInfo.type}:${errorInfo.code}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
    this.lastErrorTime.set(key, new Date());
  }

  private reportError(error: Error, errorInfo: any, context: Record<string, any>): void {
    // Report to external monitoring service (e.g., Sentry, DataDog)
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: context });
      console.log('Reporting error to monitoring service:', {
        error: error.message,
        type: errorInfo.type,
        severity: errorInfo.severity,
        context
      });
    }
  }

  private handleCriticalError(error: Error, errorInfo: any, context: Record<string, any>): void {
    // Send alerts for critical errors
    console.error('CRITICAL ERROR ALERT:', {
      error: error.message,
      type: errorInfo.type,
      context,
      timestamp: new Date().toISOString()
    });

    // Could send to Slack, email, etc.
  }

  getErrorStats(): Record<string, any> {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      lastErrorTimes: Object.fromEntries(this.lastErrorTime)
    };
  }
}

// Error recovery strategies
export class ErrorRecovery {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError!;
  }

  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      apiLogger.warn('Primary operation failed, using fallback', {
        metadata: { error: (error as Error).message }
      });
      return await fallbackOperation();
    }
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold: number = 5,
    timeout: number = 60000
  ): Promise<T> {
    // Simple circuit breaker implementation
    const key = 'circuit_breaker';
    const failures = this.getFailureCount(key);
    
    if (failures >= failureThreshold) {
      const lastFailure = this.getLastFailureTime(key);
      if (lastFailure && Date.now() - lastFailure < timeout) {
        throw new Error('Circuit breaker is open');
      }
      this.resetFailureCount(key);
    }
    
    try {
      const result = await operation();
      this.resetFailureCount(key);
      return result;
    } catch (error) {
      this.incrementFailureCount(key);
      throw error;
    }
  }

  private static failureCounts: Map<string, number> = new Map();
  private static lastFailureTimes: Map<string, number> = new Map();

  private static getFailureCount(key: string): number {
    return this.failureCounts.get(key) || 0;
  }

  private static incrementFailureCount(key: string): void {
    const count = this.getFailureCount(key);
    this.failureCounts.set(key, count + 1);
    this.lastFailureTimes.set(key, Date.now());
  }

  private static resetFailureCount(key: string): void {
    this.failureCounts.delete(key);
    this.lastFailureTimes.delete(key);
  }

  private static getLastFailureTime(key: string): number | null {
    return this.lastFailureTimes.get(key) || null;
  }
}

// API error response helpers
export class APIErrorResponse {
  static create(error: Error, statusCode: number = 500): NextResponse {
    const errorInfo = ErrorHandler.getInstance()['analyzeError'](error);
    
    const response = {
      success: false,
      error: {
        message: this.getUserFriendlyMessage(error, errorInfo),
        code: errorInfo.code,
        type: errorInfo.type,
        timestamp: new Date().toISOString()
      }
    };

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && !errorInfo.isOperational) {
      response.error.message = 'An internal error occurred';
    }

    return NextResponse.json(response, { status: statusCode });
  }

  private static getUserFriendlyMessage(error: Error, errorInfo: any): string {
    if (error instanceof BaseError) {
      return error.message;
    }

    switch (errorInfo.type) {
      case ErrorType.VALIDATION:
        return 'Invalid input data provided';
      case ErrorType.AUTHENTICATION:
        return 'Authentication required';
      case ErrorType.AUTHORIZATION:
        return 'Insufficient permissions';
      case ErrorType.NOT_FOUND:
        return 'Resource not found';
      case ErrorType.CONFLICT:
        return 'Resource conflict';
      case ErrorType.RATE_LIMIT:
        return 'Rate limit exceeded';
      case ErrorType.DATABASE:
        return 'Database operation failed';
      case ErrorType.EXTERNAL_API:
        return 'External service unavailable';
      case ErrorType.FILE_SYSTEM:
        return 'File operation failed';
      case ErrorType.NETWORK:
        return 'Network error occurred';
      case ErrorType.BUSINESS_LOGIC:
        return 'Business rule violation';
      default:
        return 'An error occurred';
    }
  }
}

// Global error handler
export function setupGlobalErrorHandling(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    ErrorHandler.getInstance().handle(error, { type: 'uncaughtException' });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    ErrorHandler.getInstance().handle(error, { 
      type: 'unhandledRejection',
      promise: promise.toString()
    });
  });
}

// Error boundary for React components
export class ErrorBoundary extends Error {
  constructor(message: string, componentStack?: string) {
    super(message);
    this.name = 'ErrorBoundary';
    this.context = { componentStack };
  }
}

export default ErrorHandler;
