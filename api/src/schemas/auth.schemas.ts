import { z } from 'zod';
import { nameSchema, emailSchema } from '@scholarship-hub/shared';

/**
 * Authentication Validation Schemas
 */

/**
 * Input Schema: Register User
 * Used for POST /api/auth/register
 */
export const registerInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
}).strict();

/**
 * Input Schema: Login
 * Used for POST /api/auth/login
 */
export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
}).strict();

/**
 * Input Schema: Refresh Token
 * Used for POST /api/auth/refresh
 */
export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
}).strict();

/**
 * Type exports
 */
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;

