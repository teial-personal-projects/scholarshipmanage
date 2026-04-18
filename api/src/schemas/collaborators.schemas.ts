import { z } from 'zod';
import { emailSchema, nameSchema } from '@scholarship-hub/shared';

/**
 * Collaborator Validation Schemas
 * 
 */

/**
 * Collaborator phone number schema
 * NOTE: Collaborator phone numbers are optional and frequently entered as placeholders
 * (e.g. (555) 555-5555) during development. We accept any trimmed string here and let
 * the service normalize to E.164 when possible.
 */
const collaboratorPhoneSchema = z
  .union([z.string().trim().max(50), z.null()])
  .optional();

/**
 * Input Schema: Create Collaborator
 * Used for POST /api/collaborators
 */
export const createCollaboratorInputSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  emailAddress: emailSchema,
  relationship: z.string().max(100).trim().optional(),
  phoneNumber: collaboratorPhoneSchema,
}).strict();

/**
 * Input Schema: Update Collaborator
 * Used for PATCH /api/collaborators/:id
 * 
 * Note: phoneNumber can be null to explicitly clear it
 */
export const updateCollaboratorInputSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  emailAddress: emailSchema.optional(),
  relationship: z.string().max(100).trim().optional(),
  phoneNumber: collaboratorPhoneSchema,
}).strict();

/**
 * Output Schema: Collaborator Response
 * Used for GET /api/collaborators responses
 * 
 * Excludes sensitive/internal fields that shouldn't be exposed
 */
export const collaboratorResponseSchema = z.object({
  collaboratorId: z.number(),
  userId: z.number().optional(),
  firstName: z.string(),
  lastName: z.string(),
  emailAddress: z.string().email(),
  relationship: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

/**
 * Type exports for use in controllers/services
 */
export type CreateCollaboratorInput = z.infer<typeof createCollaboratorInputSchema>;
export type UpdateCollaboratorInput = z.infer<typeof updateCollaboratorInputSchema>;
export type CollaboratorResponse = z.infer<typeof collaboratorResponseSchema>;

