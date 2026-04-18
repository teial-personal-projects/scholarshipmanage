import { z } from 'zod';

/**
 * Recommendation Validation Schemas
 */

// Recommendation status enum
const recommendationStatusSchema = z.enum(['Pending', 'Submitted']).optional();

// Date schema - accepts ISO date strings (YYYY-MM-DD format)
// Transform null to undefined to match service expectations
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').nullable().transform(val => val ?? undefined).optional();

// Date-time schema for timestamps (ISO 8601 format)
// Transform null to undefined to match service expectations
const dateTimeSchema = z.string().datetime().nullable().transform(val => val ?? undefined).optional();

/**
 * Input Schema: Create Recommendation
 * Used for POST /api/recommendations
 */
export const createRecommendationInputSchema = z.object({
  applicationId: z.number().int().positive(),
  recommenderId: z.number().int().positive(),
  status: recommendationStatusSchema,
  submittedAt: dateTimeSchema,
  dueDate: dateSchema,
}).strict();

/**
 * Input Schema: Update Recommendation
 * Used for PATCH /api/recommendations/:id
 */
export const updateRecommendationInputSchema = z.object({
  status: recommendationStatusSchema,
  submittedAt: dateTimeSchema,
  dueDate: dateSchema,
}).strict();

/**
 * Type exports
 */
export type CreateRecommendationInput = z.infer<typeof createRecommendationInputSchema>;
export type UpdateRecommendationInput = z.infer<typeof updateRecommendationInputSchema>;

