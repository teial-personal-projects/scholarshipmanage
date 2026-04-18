import { z } from 'zod';
import { nameSchema, phoneSchema } from '@scholarship-hub/shared';

/**
 * User Profile Validation Schemas
 */

/**
 * Input Schema: Update User Profile
 * Used for PATCH /api/users/me
 * 
 * Note: phoneNumber can be null to explicitly clear it
 */
export const updateUserProfileInputSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  // Default to US so typical "555-123-4567" inputs validate/normalize
  phoneNumber: phoneSchema('US').optional(),
  applicationRemindersEnabled: z.boolean().optional(),
  collaborationRemindersEnabled: z.boolean().optional(),
}).strict();

/**
 * Output Schema: User Profile Response
 * Used for GET /api/users/me responses
 * 
 * Excludes sensitive/internal fields that shouldn't be exposed
 */
export const userProfileResponseSchema = z.object({
  userId: z.number(),
  authUserId: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  emailAddress: z.string().email(),
  phoneNumber: z.string().nullable(),
  applicationRemindersEnabled: z.boolean().nullable(),
  collaborationRemindersEnabled: z.boolean().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

/**
 * Type exports for use in controllers/services
 */
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

