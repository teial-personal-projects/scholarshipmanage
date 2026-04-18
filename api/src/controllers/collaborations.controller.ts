/**
 * Collaborations Controller
 * HTTP handlers for collaboration endpoints
 */

import { Request, Response } from 'express';
import * as collaborationsService from '../services/collaborations.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';
import {
  createCollaborationInputSchema,
  updateCollaborationInputSchema,
} from '../schemas/collaborations.schemas.js';
import { idParamSchema, applicationIdParamSchema } from '../schemas/common.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * GET /api/applications/:applicationId/collaborations
 * Get all collaborations for an application
 */
export const getCollaborationsByApplication = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      httpResponse.unauthorized(res);
      return;
    }

    // Validate route parameter
    const paramResult = applicationIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      httpResponse.validationError(res, 'Invalid application ID');
      return;
    }

    const applicationId = paramResult.data.applicationId;

    const collaborations = await collaborationsService.getCollaborationsByApplicationId(
      applicationId,
      req.user.userId
    );

    // Convert to camelCase
    const response = collaborations.map((collab) => toCamelCase(collab));

    res.json(response);
  }
);

/**
 * GET /api/essays/:essayId/collaborations
 * Deprecated: essay review collaborations no longer link to a specific essay.
 */
export const getCollaborationsByEssay = asyncHandler(async (_req: Request, res: Response) => {
  httpResponse.gone(res, 'Essay-specific collaborations are no longer supported (essayReview no longer stores essayId).');
});

/**
 * POST /api/collaborations
 * Create new collaboration
 */
export const createCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate request body
  const validationResult = createCollaborationInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const collaboration = await collaborationsService.createCollaboration(req.user.userId, validationResult.data);

  // Convert to camelCase
  const response = toCamelCase(collaboration);

  httpResponse.created(res, response);
});

/**
 * GET /api/collaborations/:id
 * Get collaboration details
 */
export const getCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  const collaboration = await collaborationsService.getCollaborationById(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(collaboration);

  res.json(response);
});

/**
 * PATCH /api/collaborations/:id
 * Update collaboration
 */
export const updateCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  // Validate request body
  const validationResult = updateCollaborationInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const collaboration = await collaborationsService.updateCollaboration(
    collaborationId,
    req.user.userId,
    validationResult.data
  );

  // Convert to camelCase
  const response = toCamelCase(collaboration);

  res.json(response);
});

/**
 * DELETE /api/collaborations/:id
 * Delete collaboration
 */
export const deleteCollaboration = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  await collaborationsService.deleteCollaboration(collaborationId, req.user.userId);

  httpResponse.noContent(res);
});

/**
 * POST /api/collaborations/:id/history
 * Add history entry to collaboration
 */
export const addCollaborationHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  const { action, details } = req.body;

  if (!action) {
    httpResponse.validationError(res, 'action is required');
    return;
  }

  const historyEntry = await collaborationsService.addCollaborationHistory(
    collaborationId,
    req.user.userId,
    {
      action,
      details,
    }
  );

  // Convert to camelCase
  const response = toCamelCase(historyEntry);

  httpResponse.created(res, response);
});

/**
 * GET /api/collaborations/:id/history
 * Get collaboration history
 */
export const getCollaborationHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  const history = await collaborationsService.getCollaborationHistory(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = history.map((entry) => toCamelCase(entry));

  res.json(response);
});

/**
 * POST /api/collaborations/:id/invite
 * Send collaboration invitation now
 */
export const sendInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  const invite = await collaborationsService.sendCollaborationInvitation(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(invite);

  httpResponse.created(res, response);
});

/**
 * POST /api/collaborations/:id/invite/schedule
 * Schedule collaboration invitation for later
 */
export const scheduleInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  const { scheduledFor } = req.body;

  if (!scheduledFor) {
    httpResponse.badRequest(res, 'scheduledFor is required');
    return;
  }

  // Validate date
  const scheduledDate = new Date(scheduledFor);
  if (isNaN(scheduledDate.getTime())) {
    httpResponse.badRequest(res, 'Invalid scheduledFor date');
    return;
  }

  // Check if scheduled date is in the future
  if (scheduledDate < new Date()) {
    httpResponse.badRequest(res, 'scheduledFor must be in the future');
    return;
  }

  const invite = await collaborationsService.scheduleCollaborationInvitation(
    collaborationId,
    req.user.userId,
    scheduledFor
  );

  // Convert to camelCase
  const response = toCamelCase(invite);

  httpResponse.created(res, response);
});

/**
 * POST /api/collaborations/:id/invite/resend
 * Resend collaboration invitation
 */
export const resendInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid collaboration ID');
    return;
  }

  const collaborationId = paramResult.data.id;

  const invite = await collaborationsService.resendCollaborationInvitation(
    collaborationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(invite);

  res.json(response);
});

