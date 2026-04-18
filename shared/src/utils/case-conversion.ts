/**
 * Utility functions for converting between snake_case (database) and camelCase (TypeScript)
 */

/**
 * Convert a string from snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a string from camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from snake_case to camelCase
 * Handles nested objects and arrays
 */
export function toCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = snakeToCamel(key);
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any) as T;
  }

  return obj;
}

/**
 * Convert object keys from camelCase to snake_case
 * Handles nested objects and arrays
 */
export function toSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item)) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = camelToSnake(key);
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any) as T;
  }

  return obj;
}

/**
 * Type-safe wrapper for database query results
 * Converts snake_case database rows to camelCase TypeScript objects
 */
export function mapDbResults<T>(rows: any[]): T[] {
  return rows.map(row => toCamelCase<T>(row));
}

/**
 * Type-safe wrapper for single database row
 * Converts snake_case database row to camelCase TypeScript object
 */
export function mapDbResult<T>(row: any): T {
  return toCamelCase<T>(row);
}
