import { z } from 'zod';
import { urlSchema } from '@scholarship-hub/shared';

/**
 * Application Validation Schemas
 */

// Application status enum
const applicationStatusSchema = z.enum([
  'Not Started',
  'In Progress',
  'Submitted',
  'Awarded',
  'Not Awarded',
]);

// Target type enum
const targetTypeSchema = z.enum(['Merit', 'Need', 'Both']).optional();

// Date schema - accepts ISO date strings (YYYY-MM-DD format)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Input Schema: Create Application
 * Used for POST /api/applications
 */
export const createApplicationInputSchema = z.object({
  scholarshipName: z.string().min(1, 'Scholarship name is required').max(255).trim(),
  targetType: targetTypeSchema,
  organization: z.string().max(255).trim().optional(),
  orgWebsite: urlSchema.optional(),
  platform: z.string().max(255).trim().optional(),
  applicationLink: urlSchema.optional(),
  theme: z.string().max(500).trim().optional(),
  minAward: z.number().positive().optional(),
  maxAward: z.number().positive().optional(),
  requirements: z.string().max(5000).trim().optional(),
  renewable: z.boolean().optional(),
  renewableTerms: z.string().max(1000).trim().optional(),
  documentInfoLink: urlSchema.optional(),
  currentAction: z.string().max(255).trim().optional(),
  status: applicationStatusSchema.optional(),
  submissionDate: dateSchema.optional(),
  openDate: dateSchema.optional(),
  dueDate: dateSchema,
}).strict();

/**
 * Input Schema: Update Application
 * Used for PATCH /api/applications/:id
 */
export const updateApplicationInputSchema = z.object({
  scholarshipName: z.string().min(1).max(255).trim().optional(),
  targetType: targetTypeSchema,
  organization: z.string().max(255).trim().optional(),
  orgWebsite: urlSchema.optional(),
  platform: z.string().max(255).trim().optional(),
  applicationLink: urlSchema.optional(),
  theme: z.string().max(500).trim().optional(),
  minAward: z.number().positive().optional(),
  maxAward: z.number().positive().optional(),
  requirements: z.string().max(5000).trim().optional(),
  renewable: z.boolean().optional(),
  renewableTerms: z.string().max(1000).trim().optional(),
  documentInfoLink: urlSchema.optional(),
  currentAction: z.string().max(255).trim().optional(),
  status: applicationStatusSchema.optional(),
  submissionDate: dateSchema.optional(),
  openDate: dateSchema.optional(),
  dueDate: dateSchema.optional(),
}).strict();

/**
 * Type exports
 */
export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationInputSchema>;

