/**
 * Frontend Error Handling Utilities
 *
 * Provides comprehensive error handling for API errors, rate limiting,
 * validation errors, and network errors.
 */

/**
 * API Error Types
 */
export enum ApiErrorType {
  // HTTP Status Codes
  BAD_REQUEST = 'BAD_REQUEST', // 400
  UNAUTHORIZED = 'UNAUTHORIZED', // 401
  FORBIDDEN = 'FORBIDDEN', // 403
  NOT_FOUND = 'NOT_FOUND', // 404
  CONFLICT = 'CONFLICT', // 409
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 422
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', // 429
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR', // 500
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE', // 503

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured API Error
 */
export interface ApiError {
  /** Error type for programmatic handling */
  type: ApiErrorType;

  /** User-friendly error message */
  message: string;

  /** HTTP status code (if applicable) */
  statusCode?: number;

  /** Field-specific validation errors */
  fieldErrors?: Record<string, string[]>;

  /** Rate limit information */
  rateLimitInfo?: {
    /** When the rate limit resets (seconds from now or timestamp) */
    retryAfter?: number | string;

    /** Maximum requests allowed in window */
    limit?: number;

    /** Requests remaining in current window */
    remaining?: number;

    /** When the current window resets */
    reset?: number;
  };

  /** Original error object for debugging */
  originalError?: unknown;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Custom Error class for API errors
 */
export class ApiException extends Error {
  public readonly error: ApiError;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.error = error;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiException);
    }
  }
}

/**
 * Parse HTTP Response into ApiError
 */
export async function parseResponseError(response: Response): Promise<ApiError> {
  const statusCode = response.status;

  // Try to parse JSON error response
  let errorData: any;
  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  // Extract rate limit headers
  let rateLimitInfo: ApiError['rateLimitInfo'];
  if (statusCode === 429) {
    rateLimitInfo = {
      retryAfter: response.headers.get('Retry-After') || undefined,
      limit: parseInt(response.headers.get('RateLimit-Limit') || '0', 10) || undefined,
      remaining: parseInt(response.headers.get('RateLimit-Remaining') || '0', 10) || undefined,
      reset: parseInt(response.headers.get('RateLimit-Reset') || '0', 10) || undefined,
    };
  }

  // Map status code to error type
  const type = mapStatusCodeToErrorType(statusCode);

  // Extract user-friendly message
  const message = extractErrorMessage(errorData, type);

  // Extract field errors (validation errors)
  const fieldErrors = extractFieldErrors(errorData);

  return {
    type,
    message,
    statusCode,
    fieldErrors,
    rateLimitInfo,
    originalError: errorData,
  };
}

/**
 * Map HTTP status code to ApiErrorType
 */
function mapStatusCodeToErrorType(statusCode: number): ApiErrorType {
  switch (statusCode) {
    case 400:
      return ApiErrorType.BAD_REQUEST;
    case 401:
      return ApiErrorType.UNAUTHORIZED;
    case 403:
      return ApiErrorType.FORBIDDEN;
    case 404:
      return ApiErrorType.NOT_FOUND;
    case 409:
      return ApiErrorType.CONFLICT;
    case 422:
      return ApiErrorType.VALIDATION_ERROR;
    case 429:
      return ApiErrorType.RATE_LIMIT_EXCEEDED;
    case 500:
      return ApiErrorType.INTERNAL_SERVER_ERROR;
    case 503:
      return ApiErrorType.SERVICE_UNAVAILABLE;
    default:
      return ApiErrorType.UNKNOWN_ERROR;
  }
}

/**
 * Extract user-friendly error message
 */
function extractErrorMessage(errorData: any, type: ApiErrorType): string {
  // Use explicit message if provided
  if (errorData?.message) {
    return errorData.message;
  }

  // Use error field if message not provided
  if (errorData?.error && typeof errorData.error === 'string') {
    return errorData.error;
  }

  // Fallback to default messages based on error type
  return getDefaultErrorMessage(type);
}

/**
 * Get default error message for error type
 */
function getDefaultErrorMessage(type: ApiErrorType): string {
  switch (type) {
    case ApiErrorType.BAD_REQUEST:
      return 'The request was invalid. Please check your input and try again.';
    case ApiErrorType.UNAUTHORIZED:
      return 'You are not authorized. Please log in and try again.';
    case ApiErrorType.FORBIDDEN:
      return 'You do not have permission to perform this action.';
    case ApiErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
    case ApiErrorType.CONFLICT:
      return 'This action conflicts with existing data. Please try again.';
    case ApiErrorType.VALIDATION_ERROR:
      return 'Please check your input and fix the errors.';
    case ApiErrorType.RATE_LIMIT_EXCEEDED:
      return 'Too many requests. Please slow down and try again later.';
    case ApiErrorType.INTERNAL_SERVER_ERROR:
      return 'An unexpected error occurred. Please try again later.';
    case ApiErrorType.SERVICE_UNAVAILABLE:
      return 'The service is temporarily unavailable. Please try again later.';
    case ApiErrorType.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    case ApiErrorType.TIMEOUT_ERROR:
      return 'Request timed out. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Extract field-specific validation errors
 */
function extractFieldErrors(errorData: any): Record<string, string[]> | undefined {
  // Zod validation errors format
  if (errorData?.issues && Array.isArray(errorData.issues)) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of errorData.issues) {
      const field = issue.path?.join('.') || 'unknown';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(issue.message);
    }
    return fieldErrors;
  }

  // Generic field errors format
  if (errorData?.fieldErrors && typeof errorData.fieldErrors === 'object') {
    return errorData.fieldErrors;
  }

  // Express-validator errors format
  if (errorData?.errors && Array.isArray(errorData.errors)) {
    const fieldErrors: Record<string, string[]> = {};
    for (const error of errorData.errors) {
      const field = error.param || error.field || 'unknown';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(error.msg || error.message);
    }
    return fieldErrors;
  }

  return undefined;
}

/**
 * Format rate limit retry time
 * Converts retry-after header to human-readable format
 */
export function formatRetryAfter(retryAfter?: number | string): string | null {
  if (!retryAfter) return null;

  // If it's a number, it's seconds
  if (typeof retryAfter === 'number') {
    if (retryAfter < 60) {
      return `${retryAfter} second${retryAfter !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(retryAfter / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  // If it's a string, try to parse as date
  try {
    const retryDate = new Date(retryAfter);
    const now = new Date();
    const seconds = Math.ceil((retryDate.getTime() - now.getTime()) / 1000);

    if (seconds < 0) return 'now';
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } catch {
    return retryAfter;
  }
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is ApiException {
  return (
    error instanceof ApiException &&
    error.error.type === ApiErrorType.RATE_LIMIT_EXCEEDED
  );
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): error is ApiException {
  return (
    error instanceof ApiException &&
    (error.error.type === ApiErrorType.VALIDATION_ERROR ||
      error.error.type === ApiErrorType.BAD_REQUEST) &&
    !!error.error.fieldErrors
  );
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): error is ApiException {
  return (
    error instanceof ApiException &&
    (error.error.type === ApiErrorType.UNAUTHORIZED ||
      error.error.type === ApiErrorType.FORBIDDEN)
  );
}

/**
 * Handle network errors (fetch failures, timeouts, etc.)
 */
export function handleNetworkError(error: unknown): ApiError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ApiErrorType.NETWORK_ERROR,
      message: 'Network error. Please check your internet connection and try again.',
      originalError: error,
    };
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      type: ApiErrorType.TIMEOUT_ERROR,
      message: 'Request timed out. Please try again.',
      originalError: error,
    };
  }

  return {
    type: ApiErrorType.UNKNOWN_ERROR,
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
  };
}

/**
 * Log error for debugging (in development)
 */
export function logError(error: ApiError, context?: string): void {
  if (import.meta.env.DEV) {
    console.group(`🚨 API Error${context ? ` - ${context}` : ''}`);
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    if (error.statusCode) {
      console.error('Status Code:', error.statusCode);
    }
    if (error.fieldErrors) {
      console.error('Field Errors:', error.fieldErrors);
    }
    if (error.rateLimitInfo) {
      console.error('Rate Limit Info:', error.rateLimitInfo);
    }
    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }
    console.groupEnd();
  }
}
