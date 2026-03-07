import { NextResponse } from 'next/server'
import { Logger, LogCategory } from './logging'

// Base error class
export abstract class BaseError extends Error {
  abstract statusCode: number
  abstract isOperational: boolean
  abstract category: LogCategory
  
  constructor(
    message: string,
    public context?: Record<string, any>,
    public originalError?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack
    }
  }
}

// Authentication errors
export class AuthenticationError extends BaseError {
  statusCode = 401
  isOperational = true
  category = LogCategory.AUTH

  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, context)
  }
}

export class AuthorizationError extends BaseError {
  statusCode = 403
  isOperational = true
  category = LogCategory.AUTH

  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, context)
  }
}

// Validation errors
export class ValidationError extends BaseError {
  statusCode = 400
  isOperational = true
  category = LogCategory.API

  constructor(message: string = 'Validation failed', context?: Record<string, any>) {
    super(message, context)
  }
}

// Not found errors
export class NotFoundError extends BaseError {
  statusCode = 404
  isOperational = true
  category = LogCategory.API

  constructor(resource: string = 'Resource', context?: Record<string, any>) {
    super(`${resource} not found`, context)
  }
}

// Conflict errors
export class ConflictError extends BaseError {
  statusCode = 409
  isOperational = true
  category = LogCategory.API

  constructor(message: string = 'Resource conflict', context?: Record<string, any>) {
    super(message, context)
  }
}

// Rate limiting errors
export class RateLimitError extends BaseError {
  statusCode = 429
  isOperational = true
  category = LogCategory.SECURITY

  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, context)
  }
}

// Database errors
export class DatabaseError extends BaseError {
  statusCode = 500
  isOperational = false
  category = LogCategory.DATABASE

  constructor(message: string = 'Database operation failed', context?: Record<string, any>, originalError?: Error) {
    super(message, context, originalError)
  }
}

// External service errors
export class ExternalServiceError extends BaseError {
  statusCode = 502
  isOperational = false
  category = LogCategory.SYSTEM

  constructor(service: string, message?: string, context?: Record<string, any>, originalError?: Error) {
    super(message || `External service ${service} failed`, context, originalError)
  }
}

// Internal server errors
export class InternalServerError extends BaseError {
  statusCode = 500
  isOperational = false
  category = LogCategory.SYSTEM

  constructor(message: string = 'Internal server error', context?: Record<string, any>, originalError?: Error) {
    super(message, context, originalError)
  }
}

// Business logic errors
export class BusinessLogicError extends BaseError {
  statusCode = 422
  isOperational = true
  category = LogCategory.SYSTEM

  constructor(message: string, context?: Record<string, any>) {
    super(message, context)
  }
}

// Error handler for API routes
export function handleApiError(error: unknown, context?: Record<string, any>): NextResponse {
  // Log the error
  if (error instanceof BaseError) {
    Logger.error(error.message, error.category, {
      ...context,
      metadata: {
        errorType: error.name,
        statusCode: error.statusCode,
        isOperational: error.isOperational
      }
    }, error.originalError)
  } else {
    Logger.error('Unhandled error', LogCategory.SYSTEM, context, error as Error)
  }

  // Return appropriate response
  if (error instanceof BaseError) {
    return NextResponse.json(
      {
        error: {
          name: error.name,
          message: error.message,
          statusCode: error.statusCode,
          ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            context: error.context
          })
        }
      },
      { status: error.statusCode }
    )
  }

  // Handle unknown errors
  const internalError = new InternalServerError(
    'An unexpected error occurred',
    context,
    error as Error
  )

  return NextResponse.json(
    {
      error: {
        name: internalError.name,
        message: internalError.message,
        statusCode: internalError.statusCode,
        ...(process.env.NODE_ENV === 'development' && {
          stack: internalError.stack,
          context: internalError.context
        })
      }
    },
    { status: internalError.statusCode }
  )
}

// Error handler for React components
export function handleClientError(error: unknown, context?: Record<string, any>): void {
  if (error instanceof BaseError) {
    Logger.error(error.message, error.category, {
      ...context,
      metadata: {
        errorType: error.name,
        isOperational: error.isOperational
      }
    }, error.originalError)
  } else {
    Logger.error('Client error', LogCategory.SYSTEM, context, error as Error)
  }
}

// Error boundary for React components
export class ErrorBoundary extends Error {
  constructor(error: Error, context?: Record<string, any>) {
    super(error.message)
    this.name = 'ErrorBoundary'
    this.stack = error.stack
    
    Logger.error('React Error Boundary caught error', LogCategory.SYSTEM, context, error)
  }
}

// Validation helpers
export class ValidationHelpers {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  static validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`)
    }
  }

  static validateStringLength(value: string, min: number, max: number, fieldName: string): void {
    if (value.length < min) {
      throw new ValidationError(`${fieldName} must be at least ${min} characters long`)
    }
    if (value.length > max) {
      throw new ValidationError(`${fieldName} must be no more than ${max} characters long`)
    }
  }

  static validateNumberRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`)
    }
    if (value > max) {
      throw new ValidationError(`${fieldName} must be no more than ${max}`)
    }
  }
}

// Error recovery strategies
export class ErrorRecovery {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          Logger.error(`Operation failed after ${maxRetries} attempts`, LogCategory.SYSTEM, {
            ...context,
            metadata: {
              attempts: maxRetries,
              lastError: lastError.message
            }
          }, lastError)
          throw lastError
        }

        Logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, LogCategory.SYSTEM, {
          ...context,
          metadata: {
            attempt,
            error: lastError.message
          }
        })

        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff
      }
    }

    throw lastError!
  }

  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await primaryOperation()
    } catch (error) {
      Logger.warn('Primary operation failed, using fallback', LogCategory.SYSTEM, {
        ...context,
        metadata: {
          error: (error as Error).message
        }
      })
      
      try {
        return await fallbackOperation()
      } catch (fallbackError) {
        Logger.error('Both primary and fallback operations failed', LogCategory.SYSTEM, {
          ...context,
          metadata: {
            primaryError: (error as Error).message,
            fallbackError: (fallbackError as Error).message
          }
        })
        throw fallbackError
      }
    }
  }
}

// Error monitoring and alerting
export class ErrorMonitor {
  private static errorCounts: Map<string, number> = new Map()
  private static readonly ALERT_THRESHOLD = 10
  private static readonly ALERT_WINDOW = 60000 // 1 minute

  static trackError(error: BaseError): void {
    const errorKey = `${error.name}:${error.message}`
    const count = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, count + 1)

    // Check if we should alert
    if (count + 1 >= this.ALERT_THRESHOLD) {
      this.sendAlert(error, count + 1)
    }

    // Reset counts after window
    setTimeout(() => {
      this.errorCounts.delete(errorKey)
    }, this.ALERT_WINDOW)
  }

  private static sendAlert(error: BaseError, count: number): void {
    Logger.error(`Error alert: ${error.name} occurred ${count} times`, LogCategory.SYSTEM, {
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
        count,
        threshold: this.ALERT_THRESHOLD
      }
    })

    // In production, this would send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to PagerDuty, Slack, etc.
      console.log(`ALERT: ${error.name} occurred ${count} times`)
    }
  }
}

export default {
  BaseError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  InternalServerError,
  BusinessLogicError,
  handleApiError,
  handleClientError,
  ErrorBoundary,
  ValidationHelpers,
  ErrorRecovery,
  ErrorMonitor
}
