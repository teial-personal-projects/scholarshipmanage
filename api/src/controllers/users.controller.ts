import { Request, Response } from 'express';
import * as usersService from '../services/users.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';
import { updateUserProfileInputSchema } from '../schemas/users.schemas.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * GET /api/users/me
 * Get current user profile
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  const profile = await usersService.getUserProfile(req.user.userId);

  // Convert to camelCase for API response
  const response = toCamelCase(profile);

  res.json(response);
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate request body
  const validationResult = updateUserProfileInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const { firstName, lastName, phoneNumber, applicationRemindersEnabled, collaborationRemindersEnabled } = validationResult.data;
  // Preserve explicit "clear" requests. `phoneSchema` transforms null/empty → undefined,
  // but callers intentionally send null to clear an existing number.
  const hasPhoneNumberKey = Object.prototype.hasOwnProperty.call(req.body, 'phoneNumber');
  const rawPhoneNumber = (req.body as any).phoneNumber;
  const phoneNumberUpdate =
    hasPhoneNumberKey && (rawPhoneNumber === null || rawPhoneNumber === '')
      ? null
      : phoneNumber;

  const updated = await usersService.updateUserProfile(req.user.userId, {
    firstName,
    lastName,
    phoneNumber: phoneNumberUpdate,
    applicationRemindersEnabled,
    collaborationRemindersEnabled,
  });

  // Convert to camelCase
  const response = toCamelCase(updated);

  res.json(response);
});

/**
 * GET /api/users/me/roles
 * Get current user's roles
 */
export const getMyRoles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  const roles = await usersService.getUserRoles(req.user.userId);

  res.json({ roles });
});

/**
 * GET /api/users/me/reminders
 * Get dashboard reminders for current user
 */
export const getMyReminders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  const reminders = await usersService.getUserReminders(req.user.userId);

  // Convert to camelCase for API response
  const response = {
    applications: {
      dueSoon: reminders.applications.dueSoon.map(app => toCamelCase(app)),
      overdue: reminders.applications.overdue.map(app => toCamelCase(app)),
    },
    collaborations: {
      pendingResponse: reminders.collaborations.pendingResponse.map(collab => toCamelCase(collab)),
      dueSoon: reminders.collaborations.dueSoon.map(collab => toCamelCase(collab)),
      overdue: reminders.collaborations.overdue.map(collab => toCamelCase(collab)),
    },
    stats: reminders.stats,
  };

  res.json(response);
});
