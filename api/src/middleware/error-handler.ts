import { Request, Response, NextFunction } from 'express';
import { DB_ERROR_CODES } from '../constants/db-errors.js';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Catches all errors and sends consistent error responses
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = process.env.NODE_ENV !== 'production';
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  // Handle Supabase/PostgreSQL errors
  else if ('code' in err) {
    const pgError = err as { code: string; message: string; details?: string; hint?: string };
    
    // Log the error code for debugging (development only)
    if (isDev) {
      console.error('Database error code:', pgError.code);
      console.error('Database error message:', pgError.message);
    }
    
    switch (pgError.code) {
      case DB_ERROR_CODES.UNIQUE_VIOLATION:
        statusCode = 409;
        // Extract constraint name and details from PostgreSQL error message
        // Format: "duplicate key value violates unique constraint \"constraint_name\""
        const uniqueMatch = pgError.message?.match(/constraint "([^"]+)"/i);
        const constraintName = uniqueMatch ? uniqueMatch[1] : null;
        
        // Check for specific constraint violations
        if (constraintName?.includes('collaborations_collaborator_id_application_id')) {
          message = 'A collaboration of this type already exists for this collaborator and application';
        } else if (constraintName) {
          message = `Duplicate entry violates unique constraint: ${constraintName}`;
        } else {
          message = 'Resource already exists';
        }
        
        // Include original message in development
        if (isDev && pgError.message) {
          message += ` (${pgError.message})`;
        }
        isOperational = true;
        break;
      case DB_ERROR_CODES.FOREIGN_KEY_VIOLATION:
        statusCode = 400;
        // Extract table and constraint details
        const fkMatch = pgError.message?.match(/violates foreign key constraint "([^"]+)"/i) ||
                       pgError.message?.match(/Key \(([^)]+)\)=\([^)]+\) is not present in table "([^"]+)"/i);
        if (fkMatch) {
          message = `Invalid reference: ${pgError.message}`;
        } else {
          message = 'Invalid reference to related resource';
        }
        // Include original message in development
        if (isDev && pgError.message) {
          message += `\nDetails: ${pgError.message}`;
        }
        isOperational = true;
        break;
      case DB_ERROR_CODES.NOT_NULL_VIOLATION:
        statusCode = 400;
        // Extract column name from PostgreSQL error message if available
        // PostgreSQL format: "null value in column \"column_name\" violates not-null constraint"
        const columnMatch = pgError.message?.match(/column "([^"]+)"/i);
        const columnName = columnMatch ? columnMatch[1] : null;
        if (columnName) {
          // Convert snake_case to camelCase for better UX
          const camelCaseColumn = columnName
            .split('_')
            .map((word, index) => 
              index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');
          message = `Required field '${camelCaseColumn}' is missing`;
        } else {
          message = 'Required field is missing';
        }
        // Include original message and failing row details in development
        if (isDev) {
          if (pgError.message) {
            message += `: ${pgError.message}`;
          }
          // Extract failing row if present
          const rowMatch = pgError.message?.match(/Failing row contains \((.+)\)/i);
          if (rowMatch) {
            message += `\nFailing row: ${rowMatch[1]}`;
          }
        }
        isOperational = true;
        break;
      case DB_ERROR_CODES.CHECK_VIOLATION:
        statusCode = 400;
        // Extract constraint name from PostgreSQL error message
        const checkMatch = pgError.message?.match(/constraint "([^"]+)"/i);
        const checkConstraintName = checkMatch ? checkMatch[1] : null;
        if (checkConstraintName) {
          message = `Data validation failed: ${checkConstraintName}`;
        } else {
          message = 'Data validation failed';
        }
        // Extract failing row if present
        const checkRowMatch = pgError.message?.match(/Failing row contains \((.+)\)/i);
        if (checkRowMatch) {
          message += `\nFailing row: ${checkRowMatch[1]}`;
        }
        // Include original message in development
        if (isDev && pgError.message) {
          message += `\nFull error: ${pgError.message}`;
        }
        isOperational = true;
        break;
      case DB_ERROR_CODES.NO_ROWS_FOUND:
        statusCode = 404;
        message = 'Resource not found';
        isOperational = true;
        break;
      default:
        message = pgError.message || message;
        // For any database error, include the full message in development
        if (isDev) {
          message += `\nError code: ${pgError.code}`;
          // Extract failing row if present
          const rowMatch = pgError.message?.match(/Failing row contains \((.+)\)/i);
          if (rowMatch) {
            message += `\nFailing row: ${rowMatch[1]}`;
          }
          if (pgError.details) {
            message += `\nDetails: ${pgError.details}`;
          }
          if (pgError.hint) {
            message += `\nHint: ${pgError.hint}`;
          }
        }
    }
  }
  // Handle validation errors (will add Zod errors later)
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    isOperational = true;
  }

  // Log error for debugging
  // In production: only log unexpected (non-operational) errors with minimal info
  // In development: log all errors with full details
  if (!isOperational || isDev) {
    const logData: Record<string, unknown> = {
      message: err.message,
      statusCode,
      isOperational,
    };
    
    // Include stack trace and full details only in development
    if (isDev) {
      logData.stack = err.stack;
      
      // Include database error details if available (development only)
      if ('code' in err) {
        const dbError = err as { code: string; message: string; details?: string; hint?: string };
        logData.errorCode = dbError.code;
        if (dbError.details) logData.details = dbError.details;
        if (dbError.hint) logData.hint = dbError.hint;
      }
    } else {
      // Production: only log error code for database errors, no details/hints
      if ('code' in err) {
        const dbError = err as { code: string };
        logData.errorCode = dbError.code;
      }
    }
    
    console.error('❌ Error:', logData);
  }

  // Send error response
  const response: Record<string, unknown> = {
    error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isOperational ? message : 'Something went wrong',
  };

  // Include additional details in development
  if (isDev) {
    response.stack = err.stack;
    // Include original error details for database errors
    if ('code' in err && 'message' in err) {
      const dbError = err as { code: string; message: string; details?: string; hint?: string };
      response.originalError = {
        code: dbError.code,
        message: dbError.message,
        ...(dbError.details && { details: dbError.details }),
        ...(dbError.hint && { hint: dbError.hint }),
      };
    }
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
