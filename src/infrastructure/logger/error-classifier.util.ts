export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
}

export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  UNKNOWN = 'unknown',
}

export interface ClassifiedError {
  severity: ErrorSeverity;
  category: ErrorCategory;
  shouldAlert: boolean;
}

export function classifyError(error: Error): ClassifiedError {
  const statusCode = (error as any).statusCode;
  const code = (error as any).code;

  // Database errors
  if (code?.startsWith('ER_') || error.message.includes('database') || error.message.includes('query')) {
    return {
      severity: statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
      category: ErrorCategory.DATABASE,
      shouldAlert: statusCode >= 500,
    };
  }

  // Network errors
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || error.message.includes('network')) {
    return {
      severity: ErrorSeverity.ERROR,
      category: ErrorCategory.NETWORK,
      shouldAlert: true,
    };
  }

  // Validation errors
  if (statusCode === 400 || error.name === 'ValidationError') {
    return {
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.VALIDATION,
      shouldAlert: false,
    };
  }

  // Authentication errors
  if (statusCode === 401 || error.message.includes('unauthorized') || error.message.includes('authentication')) {
    return {
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.AUTHENTICATION,
      shouldAlert: false,
    };
  }

  // Authorization errors
  if (statusCode === 403 || error.message.includes('forbidden') || error.message.includes('authorization')) {
    return {
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.AUTHORIZATION,
      shouldAlert: false,
    };
  }

  // External service errors
  if (error.message.includes('external') || error.message.includes('api')) {
    return {
      severity: statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
      category: ErrorCategory.EXTERNAL_SERVICE,
      shouldAlert: statusCode >= 500,
    };
  }

  // Default
  return {
    severity: statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
    category: ErrorCategory.UNKNOWN,
    shouldAlert: statusCode >= 500,
  };
}
