import { z } from 'zod';
import { urlSchema } from '@scholarship-hub/shared';

/**
 * Essay Validation Schemas
 */

// Units schema
const unitsSchema = z.enum(['words', 'characters']).optional();

/**
 * Input Schema: Create Essay
 * Used for POST /api/applications/:applicationId/essays
 */
export const createEssayInputSchema = z.object({
  theme: z.string().max(500).trim().optional(),
  units: unitsSchema,
  essayLink: urlSchema.optional(),
  wordCount: z.number().int().positive().optional(),
}).strict();

/**
 * Input Schema: Update Essay
 * Used for PATCH /api/essays/:id
 */
export const updateEssayInputSchema = z.object({
  theme: z.string().max(500).trim().optional(),
  units: unitsSchema,
  essayLink: urlSchema.optional(),
  wordCount: z.number().int().positive().optional(),
}).strict();

/**
 * Type exports
 */
export type CreateEssayInput = z.infer<typeof createEssayInputSchema>;
export type UpdateEssayInput = z.infer<typeof updateEssayInputSchema>;

