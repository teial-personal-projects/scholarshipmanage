/**
 * PostgreSQL and Supabase error codes
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 * Supabase: https://supabase.com/docs/guides/api/rest-generating-types
 */

/**
 * PostgreSQL error codes
 */
export const PG_ERROR_CODES = {
  /** Unique violation - attempted to insert/update duplicate key */
  UNIQUE_VIOLATION: '23505',
  /** Foreign key violation - referenced row doesn't exist */
  FOREIGN_KEY_VIOLATION: '23503',
  /** Not null violation - required field is missing */
  NOT_NULL_VIOLATION: '23502',
  /** Check violation - constraint check failed */
  CHECK_VIOLATION: '23514',
} as const;

/**
 * Supabase/PostgREST error codes
 */
export const SUPABASE_ERROR_CODES = {
  /** No rows returned from query */
  NO_ROWS_FOUND: 'PGRST116',
} as const;

/**
 * All database error codes (PostgreSQL + Supabase)
 */
export const DB_ERROR_CODES = {
  ...PG_ERROR_CODES,
  ...SUPABASE_ERROR_CODES,
} as const;

/**
 * Type helper to check if an error has a code property
 */
export interface ErrorWithCode {
  code: string;
  message?: string;
}

/**
 * Helper function to check if an error is a specific database error code
 */
export const isDbErrorCode = (
  error: unknown,
  code: string
): error is ErrorWithCode => {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === code
  );
};

/**
 * Helper function to check if an error is any of the provided error codes
 */
export const isAnyDbErrorCode = (
  error: unknown,
  codes: readonly string[]
): error is ErrorWithCode => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  return codes.includes(error.code as string);
};

