import { z } from 'zod';
import { urlSchema } from '@scholarshipmanage/shared';

/**
 * Essay Validation Schemas
 */

// Units schema
const unitsSchema = z.enum(['words', 'characters']).optional();
const essayStatusSchema = z.enum(['not_started', 'in_progress', 'completed']).optional();
const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  urlSchema.nullable().optional(),
);

/**
 * Input Schema: Create Essay
 * Used for POST /api/applications/:applicationId/essays
 */
export const createEssayInputSchema = z.object({
  theme: z.string().max(500).trim().optional(),
  units: unitsSchema,
  essayLink: optionalUrlSchema,
  wordCount: z.number().int().positive().optional(),
  status: essayStatusSchema,
}).strict();

/**
 * Input Schema: Update Essay
 * Used for PATCH /api/essays/:id
 */
export const updateEssayInputSchema = z.object({
  theme: z.string().max(500).trim().optional(),
  units: unitsSchema,
  essayLink: optionalUrlSchema,
  wordCount: z.number().int().positive().optional(),
  status: essayStatusSchema,
}).strict();

/**
 * Type exports
 */
export type CreateEssayInput = z.infer<typeof createEssayInputSchema>;
export type UpdateEssayInput = z.infer<typeof updateEssayInputSchema>;
