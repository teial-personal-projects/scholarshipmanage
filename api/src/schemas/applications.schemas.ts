import { z } from 'zod';
import { urlSchema } from '@scholarshipmanage/shared';

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

// Date schema - accepts ISO date strings (YYYY-MM-DD format)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
const nullableDateSchema = dateSchema.nullable().optional();
const nullableUrlSchema = urlSchema.nullable().optional();
const nullableStringSchema = (maxLength: number) => z.string().max(maxLength).trim().nullable().optional();
const nullablePositiveNumberSchema = z.number().positive().nullable().optional();
const nullableTargetTypeSchema = z.enum(['Merit', 'Need', 'Both']).nullable().optional();

/**
 * Input Schema: Create Application
 * Used for POST /api/applications
 */
export const createApplicationInputSchema = z.object({
  scholarshipName: z.string().min(1, 'Scholarship name is required').max(255).trim(),
  targetType: nullableTargetTypeSchema,
  organization: nullableStringSchema(255),
  orgWebsite: nullableUrlSchema,
  platform: nullableStringSchema(255),
  applicationLink: nullableUrlSchema,
  theme: nullableStringSchema(500),
  minAward: nullablePositiveNumberSchema,
  maxAward: nullablePositiveNumberSchema,
  requirements: nullableStringSchema(5000),
  renewable: z.boolean().optional(),
  renewableTerms: nullableStringSchema(1000),
  documentInfoLink: nullableUrlSchema,
  currentAction: nullableStringSchema(255),
  status: applicationStatusSchema.optional(),
  submissionDate: nullableDateSchema,
  openDate: nullableDateSchema,
  dueDate: dateSchema,
}).strict();

/**
 * Input Schema: Update Application
 * Used for PATCH /api/applications/:id
 */
export const updateApplicationInputSchema = z.object({
  scholarshipName: z.string().min(1).max(255).trim().optional(),
  targetType: nullableTargetTypeSchema,
  organization: nullableStringSchema(255),
  orgWebsite: nullableUrlSchema,
  platform: nullableStringSchema(255),
  applicationLink: nullableUrlSchema,
  theme: nullableStringSchema(500),
  minAward: nullablePositiveNumberSchema,
  maxAward: nullablePositiveNumberSchema,
  requirements: nullableStringSchema(5000),
  renewable: z.boolean().optional(),
  renewableTerms: nullableStringSchema(1000),
  documentInfoLink: nullableUrlSchema,
  currentAction: nullableStringSchema(255),
  status: applicationStatusSchema.optional(),
  submissionDate: nullableDateSchema,
  openDate: nullableDateSchema,
  dueDate: dateSchema.optional(),
}).strict();

/**
 * Type exports
 */
export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationInputSchema>;
