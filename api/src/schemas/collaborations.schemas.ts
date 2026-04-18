import { z } from 'zod';
import { urlSchema, htmlNoteSchema } from '@scholarship-hub/shared';

/**
 * Collaboration Validation Schemas
 */

// Collaboration type enum
const collaborationTypeSchema = z.enum(['recommendation', 'essayReview', 'guidance']);

// Collaboration status enum
const collaborationStatusSchema = z.enum([
  'pending',
  'invited',
  'in_progress',
  'submitted',
  'completed',
  'declined',
]).optional();

// Action owner enum
const actionOwnerSchema = z.enum(['student', 'collaborator']).optional();

// Session type enum
const sessionTypeSchema = z.enum(['initial', 'followup', 'final']).optional();

// Date schema - accepts ISO date strings (YYYY-MM-DD format)
// Transform null to undefined to match service expectations
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').nullable().transform(val => val ?? undefined).optional();

// Date-time schema for timestamps (ISO 8601 format)
// Transform null to undefined to match service expectations
const dateTimeSchema = z.string().datetime().nullable().transform(val => val ?? undefined).optional();

/**
 * Input Schema: Create Collaboration
 * Used for POST /api/collaborations
 */
export const createCollaborationInputSchema = z.object({
  collaboratorId: z.number().int().positive(),
  applicationId: z.number().int().positive(),
  collaborationType: collaborationTypeSchema,
  status: collaborationStatusSchema,
  awaitingActionFrom: actionOwnerSchema,
  awaitingActionType: z.string().max(255).trim().optional(),
  nextActionDescription: z.string().max(1000).trim().optional(),
  nextActionDueDate: dateSchema,
  notes: htmlNoteSchema,
  // Essay review specific fields
  currentDraftVersion: z.number().int().nonnegative().optional(),
  feedbackRounds: z.number().int().nonnegative().optional(),
  lastFeedbackAt: dateTimeSchema,
  // Recommendation specific fields
  portalUrl: urlSchema.optional(),
  // Guidance specific fields
  sessionType: sessionTypeSchema,
  meetingUrl: urlSchema.optional(),
  scheduledFor: dateTimeSchema,
}).strict().refine(
  (data) => {
    // Recommendation requires nextActionDueDate
    if (data.collaborationType === 'recommendation' && !data.nextActionDueDate) {
      return false;
    }
    return true;
  },
  {
    message: 'nextActionDueDate is required for recommendation collaborations',
    path: ['nextActionDueDate'],
  }
);

/**
 * Input Schema: Update Collaboration
 * Used for PATCH /api/collaborations/:id
 */
export const updateCollaborationInputSchema = z.object({
  status: collaborationStatusSchema,
  awaitingActionFrom: actionOwnerSchema,
  awaitingActionType: z.string().max(255).trim().optional(),
  nextActionDescription: z.string().max(1000).trim().optional(),
  nextActionDueDate: dateSchema,
  notes: htmlNoteSchema,
  // Essay review specific fields
  currentDraftVersion: z.number().int().nonnegative().optional(),
  feedbackRounds: z.number().int().nonnegative().optional(),
  lastFeedbackAt: dateTimeSchema,
  // Recommendation specific fields
  portalUrl: urlSchema.optional(),
  questionnaireCompleted: z.boolean().optional(),
  // Guidance specific fields
  sessionType: sessionTypeSchema,
  meetingUrl: urlSchema.optional(),
  scheduledFor: dateTimeSchema,
}).strict();

/**
 * Schema for collaborationId route parameter
 */
export const collaborationIdParamSchema = z.object({
  collaborationId: z.string().regex(/^\d+$/, 'Collaboration ID must be a number').transform(Number),
}).strict();

/**
 * Type exports
 */
export type CreateCollaborationInput = z.infer<typeof createCollaborationInputSchema>;
export type UpdateCollaborationInput = z.infer<typeof updateCollaborationInputSchema>;

