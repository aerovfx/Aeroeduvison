// Ultra-simple logging implementation that works in both server and client
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}

export enum LogCategory {
  AUTH = 'auth',
  API = 'api',
  DATABASE = 'database',
  UPLOAD = 'upload',
  PAYMENT = 'payment',
  EMAIL = 'email',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  CHAT = 'chat'
}

export interface LogContext {
  userId?: string;
  schoolId?: string;
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: Error;
  metadata?: Record<string, any>;
  // Specific to chat
  roomId?: string;
  messageId?: string;
  messageType?: string;
  roomCount?: number;
  messageCount?: number;
  // Additional properties for errors
  errorType?: string;
  attempts?: number;
  lastError?: string;
  attempt?: number;
  primaryError?: string;
  fallbackError?: string;
  activity?: string;
  xpAmount?: number;
  memoryUsage?: any;
  errorMessage?: string;
}

// Ultra-simple logger that only uses console (no file system)
const createLogger = () => {
  const timestamp = () => new Date().toISOString();
  
  return {
    error: (message: string, meta?: any) => {
      console.error(`[${timestamp()}] [ERROR] ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[${timestamp()}] [WARN] ${message}`, meta || '');
    },
    info: (message: string, meta?: any) => {
      console.info(`[${timestamp()}] [INFO] ${message}`, meta || '');
    },
    debug: (message: string, meta?: any) => {
      console.debug(`[${timestamp()}] [DEBUG] ${message}`, meta || '');
    },
    http: (message: string, meta?: any) => {
      console.log(`[${timestamp()}] [HTTP] ${message}`, meta || '');
    },
  };
};

const logger = createLogger();

export class Logger {
  private category: LogCategory;

  constructor(category: LogCategory) {
    this.category = category;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const logMessage = `[${this.category.toUpperCase()}] ${message}`;
    const meta = { 
      category: this.category, 
      context: { ...context, error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined } 
    };
    
    if (level === LogLevel.ERROR) {
      logger.error(logMessage, meta);
    } else if (level === LogLevel.WARN) {
      logger.warn(logMessage, meta);
    } else if (level === LogLevel.INFO) {
      logger.info(logMessage, meta);
    } else if (level === LogLevel.DEBUG) {
      logger.debug(logMessage, meta);
    } else {
      logger.http(logMessage, meta);
    }
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  http(message: string, context?: LogContext) {
    this.log(LogLevel.HTTP, message, context);
  }
}

// Create category-specific loggers
export const authLogger = new Logger(LogCategory.AUTH);
export const dbLogger = new Logger(LogCategory.DATABASE);
export const wsLogger = new Logger(LogCategory.CHAT);
export const chatLogger = new Logger(LogCategory.CHAT);
export const competitionLogger = new Logger(LogCategory.API);
export const stemLogger = new Logger(LogCategory.API);
export const xpLogger = new Logger(LogCategory.API);
export const generalLogger = new Logger(LogCategory.API);

// API Logger object for backward compatibility
export const apiLogger = {
  error: (message: string, context?: LogContext, error?: Error) => {
    const logMessage = `[API] ${message}`;
    const meta = { category: LogCategory.API, context: { ...context, error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined } };
    logger.error(logMessage, meta);
  },
  warn: (message: string, context?: LogContext) => {
    const logMessage = `[API] ${message}`;
    const meta = { category: LogCategory.API, context };
    logger.warn(logMessage, meta);
  },
  info: (message: string, context?: LogContext) => {
    const logMessage = `[API] ${message}`;
    const meta = { category: LogCategory.API, context };
    logger.info(logMessage, meta);
  },
  debug: (message: string, context?: LogContext) => {
    const logMessage = `[API] ${message}`;
    const meta = { category: LogCategory.API, context };
    logger.debug(logMessage, meta);
  },
  http: (message: string, context?: LogContext) => {
    const logMessage = `[API] ${message}`;
    const meta = { category: LogCategory.API, context };
    logger.http(logMessage, meta);
  },
};

// Default logger
export default logger;
