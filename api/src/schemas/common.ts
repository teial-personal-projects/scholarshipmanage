import { z } from 'zod';

/**
 * Common validation schemas used across multiple entities
 */

/**
 * ID parameter schema for route params
 * Validates numeric IDs from URL parameters
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
}).strict();

/**
 * UUID parameter schema for route params
 * Validates UUID format
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
}).strict();

/**
 * Application ID parameter schema for route params
 * Used in routes like /api/applications/:applicationId/essays
 */
export const applicationIdParamSchema = z.object({
  applicationId: z.string().regex(/^\d+$/, 'Application ID must be a number').transform(Number),
}).strict();

