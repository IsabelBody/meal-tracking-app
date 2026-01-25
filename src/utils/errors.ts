/**
 * Error Handling Utilities
 * 
 * Provides standardized error types, codes, and helper functions for
 * consistent error handling across the application.
 */

/**
 * Error codes organized by category for easy identification
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  
  // API errors
  API_ERROR: 'API_ERROR',
  API_NOT_FOUND: 'API_NOT_FOUND',
  API_UNAUTHORIZED: 'API_UNAUTHORIZED',
  API_FORBIDDEN: 'API_FORBIDDEN',
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_SERVER_ERROR: 'API_SERVER_ERROR',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  
  // Auth errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_NOT_AUTHENTICATED: 'AUTH_NOT_AUTHENTICATED',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_USER_EXISTS: 'AUTH_USER_EXISTS',
  AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  
  // Data errors
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DATA_PARSE_ERROR: 'DATA_PARSE_ERROR',
  DATA_SYNC_FAILED: 'DATA_SYNC_FAILED',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * User-friendly messages for each error code
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // Network
  [ErrorCodes.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
  [ErrorCodes.NETWORK_TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCodes.NETWORK_OFFLINE]: 'You appear to be offline. Changes will sync when you reconnect.',
  
  // API
  [ErrorCodes.API_ERROR]: 'Something went wrong. Please try again.',
  [ErrorCodes.API_NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCodes.API_UNAUTHORIZED]: 'Please log in to continue.',
  [ErrorCodes.API_FORBIDDEN]: 'You do not have permission to perform this action.',
  [ErrorCodes.API_RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
  [ErrorCodes.API_SERVER_ERROR]: 'Server error. Please try again later.',
  [ErrorCodes.API_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
  
  // Auth
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password.',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCodes.AUTH_NOT_AUTHENTICATED]: 'Please log in to continue.',
  [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: 'Please verify your email address.',
  [ErrorCodes.AUTH_USER_EXISTS]: 'An account with this email already exists.',
  [ErrorCodes.AUTH_WEAK_PASSWORD]: 'Password must be at least 8 characters with a mix of letters and numbers.',
  
  // Validation
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCodes.VALIDATION_REQUIRED]: 'This field is required.',
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 'Invalid format. Please check your input.',
  
  // Data
  [ErrorCodes.DATA_NOT_FOUND]: 'The requested data could not be found.',
  [ErrorCodes.DATA_PARSE_ERROR]: 'Failed to process data. Please try again.',
  [ErrorCodes.DATA_SYNC_FAILED]: 'Failed to sync data. Your changes are saved locally.',
  
  // Generic
  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

/**
 * Custom error class with structured error information
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly userMessage: string;
  readonly originalError?: Error;
  readonly context?: Record<string, unknown>;
  readonly isRetryable: boolean;
  readonly timestamp: string;

  constructor(
    code: ErrorCode,
    options?: {
      message?: string;
      userMessage?: string;
      originalError?: Error;
      context?: Record<string, unknown>;
      isRetryable?: boolean;
    }
  ) {
    const userMessage = options?.userMessage || ErrorMessages[code];
    super(options?.message || userMessage);
    
    this.name = 'AppError';
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = options?.originalError;
    this.context = options?.context;
    this.isRetryable = options?.isRetryable ?? isRetryableError(code);
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert to a plain object for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Determine if an error code represents a retryable error
 */
function isRetryableError(code: ErrorCode): boolean {
  const retryableCodes: ErrorCode[] = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.NETWORK_TIMEOUT,
    ErrorCodes.NETWORK_OFFLINE,
    ErrorCodes.API_SERVER_ERROR,
    ErrorCodes.API_UNAVAILABLE,
    ErrorCodes.API_RATE_LIMITED,
    ErrorCodes.DATA_SYNC_FAILED,
  ];
  return retryableCodes.includes(code);
}

/**
 * Parse an unknown error into an AppError
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    const code = inferErrorCode(error);
    return new AppError(code, {
      message: error.message,
      originalError: error,
    });
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(ErrorCodes.UNKNOWN_ERROR, {
      message: error,
    });
  }

  // Unknown
  return new AppError(ErrorCodes.UNKNOWN_ERROR, {
    message: 'An unknown error occurred',
    context: { rawError: String(error) },
  });
}

/**
 * Infer error code from error message/type
 */
function inferErrorCode(error: Error): ErrorCode {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    name === 'typeerror' && message.includes('failed to fetch')
  ) {
    return ErrorCodes.NETWORK_ERROR;
  }

  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorCodes.NETWORK_TIMEOUT;
  }

  if (message.includes('offline')) {
    return ErrorCodes.NETWORK_OFFLINE;
  }

  // Auth errors (AWS Amplify specific patterns)
  if (
    message.includes('user does not exist') ||
    message.includes('incorrect username or password') ||
    message.includes('notauthorizedexception')
  ) {
    return ErrorCodes.AUTH_INVALID_CREDENTIALS;
  }

  if (message.includes('user already exists') || message.includes('usernameexistsexception')) {
    return ErrorCodes.AUTH_USER_EXISTS;
  }

  if (message.includes('user is not confirmed') || message.includes('usernotconfirmedexception')) {
    return ErrorCodes.AUTH_EMAIL_NOT_VERIFIED;
  }

  if (message.includes('password') && (message.includes('policy') || message.includes('weak'))) {
    return ErrorCodes.AUTH_WEAK_PASSWORD;
  }

  if (message.includes('expired') || message.includes('session')) {
    return ErrorCodes.AUTH_SESSION_EXPIRED;
  }

  // HTTP status code patterns
  if (message.includes('401') || message.includes('unauthorized')) {
    return ErrorCodes.API_UNAUTHORIZED;
  }

  if (message.includes('403') || message.includes('forbidden')) {
    return ErrorCodes.API_FORBIDDEN;
  }

  if (message.includes('404') || message.includes('not found')) {
    return ErrorCodes.API_NOT_FOUND;
  }

  if (message.includes('429') || message.includes('rate limit') || message.includes('too many')) {
    return ErrorCodes.API_RATE_LIMITED;
  }

  if (message.includes('500') || message.includes('server error')) {
    return ErrorCodes.API_SERVER_ERROR;
  }

  if (message.includes('503') || message.includes('unavailable')) {
    return ErrorCodes.API_UNAVAILABLE;
  }

  return ErrorCodes.UNKNOWN_ERROR;
}

/**
 * Create error from HTTP response status
 */
export function createHttpError(status: number, message?: string): AppError {
  const codeMap: Record<number, ErrorCode> = {
    400: ErrorCodes.VALIDATION_ERROR,
    401: ErrorCodes.API_UNAUTHORIZED,
    403: ErrorCodes.API_FORBIDDEN,
    404: ErrorCodes.API_NOT_FOUND,
    429: ErrorCodes.API_RATE_LIMITED,
    500: ErrorCodes.API_SERVER_ERROR,
    502: ErrorCodes.API_UNAVAILABLE,
    503: ErrorCodes.API_UNAVAILABLE,
    504: ErrorCodes.NETWORK_TIMEOUT,
  };

  const code = codeMap[status] || ErrorCodes.API_ERROR;
  return new AppError(code, {
    message: message || `HTTP ${status}`,
    context: { statusCode: status },
  });
}

/**
 * Log error with context (can be extended to send to error tracking service)
 */
export function logError(error: AppError | Error, context?: Record<string, unknown>): void {
  const appError = error instanceof AppError ? error : parseError(error);
  
  // In development, log to console
  if (__DEV__) {
    console.error('[AppError]', appError.toJSON(), context);
  }
  
  // TODO: In production, send to error tracking service (Sentry, Bugsnag, etc.)
  // Example: Sentry.captureException(appError, { extra: context });
}

/**
 * Type guard to check if value is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get user-friendly message from any error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return parseError(error).userMessage;
  }
  return ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
}

/**
 * Check if error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    const networkCodes: ErrorCode[] = [
      ErrorCodes.NETWORK_ERROR,
      ErrorCodes.NETWORK_TIMEOUT,
      ErrorCodes.NETWORK_OFFLINE,
    ];
    return networkCodes.includes(error.code);
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code.startsWith('AUTH_');
  }
  return false;
}
