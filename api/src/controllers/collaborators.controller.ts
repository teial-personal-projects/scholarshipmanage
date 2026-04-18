/**
 * Collaborators Controller
 * HTTP handlers for collaborator endpoints
 */

import { Request, Response } from 'express';
import * as collaboratorsService from '../services/collaborators.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';
import {
  createCollaboratorInputSchema,
  updateCollaboratorInputSchema,
} from '../schemas/collaborators.schemas.js';
import { idParamSchema } from '../schemas/common.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * GET /api/collaborators
 * Get all collaborators for current user
 */
export const getCollaborators = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  const collaborators = await collaboratorsService.getUserCollaborators(req.user.userId);

  // Convert to camelCase
  const response = collaborators.map((collab) => toCamelCase(collab));

  res.json(response);
});

/**
 * GET /api/collaborators/:id
 * Get single collaborator by ID
 */
export const getCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaborator ID');
    return;
  }

  const collaboratorId = paramResult.data.id;

  const collaborator = await collaboratorsService.getCollaboratorById(
    collaboratorId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(collaborator);

  res.json(response);
});

/**
 * POST /api/collaborators
 * Create new collaborator
 */
export const createCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate request body
  const validationResult = createCollaboratorInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ createCollaborator validation failed', {
        body: req.body,
        issues: validationResult.error.issues,
      });
    }
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const { firstName, lastName, emailAddress, relationship, phoneNumber } = validationResult.data;

  const collaborator = await collaboratorsService.createCollaborator(req.user.userId, {
    firstName,
    lastName,
    emailAddress,
    relationship,
    phoneNumber,
  });

  // Convert to camelCase
  const response = toCamelCase(collaborator);

  httpResponse.created(res, response);
});

/**
 * PATCH /api/collaborators/:id
 * Update collaborator
 */
export const updateCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaborator ID');
    return;
  }

  const collaboratorId = paramResult.data.id;

  // Validate request body
  const validationResult = updateCollaboratorInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ updateCollaborator validation failed', {
        body: req.body,
        issues: validationResult.error.issues,
      });
    }
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const { firstName, lastName, emailAddress, relationship, phoneNumber } = validationResult.data;
  // Preserve explicit "clear" requests. `phoneSchema` transforms null/empty → undefined,
  // but callers intentionally send null to clear an existing number.
  const hasPhoneNumberKey = Object.prototype.hasOwnProperty.call(req.body, 'phoneNumber');
  const rawPhoneNumber = (req.body as any).phoneNumber;
  const phoneNumberUpdate =
    hasPhoneNumberKey && (rawPhoneNumber === null || rawPhoneNumber === '')
      ? null
      : phoneNumber;

  const collaborator = await collaboratorsService.updateCollaborator(
    collaboratorId,
    req.user.userId,
    {
      firstName,
      lastName,
      emailAddress,
      relationship,
      phoneNumber: phoneNumberUpdate,
    }
  );

  // Convert to camelCase
  const response = toCamelCase(collaborator);

  res.json(response);
});

/**
 * DELETE /api/collaborators/:id
 * Delete collaborator
 */
export const deleteCollaborator = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaborator ID');
    return;
  }

  const collaboratorId = paramResult.data.id;

  await collaboratorsService.deleteCollaborator(collaboratorId, req.user.userId);

  httpResponse.noContent(res);
});

