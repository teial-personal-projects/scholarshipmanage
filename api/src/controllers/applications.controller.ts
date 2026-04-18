import { Request, Response } from 'express';
import * as applicationsService from '../services/applications.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';
import {
  createApplicationInputSchema,
  updateApplicationInputSchema,
} from '../schemas/applications.schemas.js';
import { idParamSchema } from '../schemas/common.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * GET /api/applications
 * Get all applications for current user
 */
export const getApplications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  const applications = await applicationsService.getUserApplications(req.user.userId);

  // Convert to camelCase
  const response = applications.map((app) => toCamelCase(app));

  res.json(response);
});

/**
 * GET /api/applications/:id
 * Get single application by ID
 */
export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid application ID');
    return;
  }

  const applicationId = paramResult.data.id;

  const application = await applicationsService.getApplicationById(
    applicationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(application);

  res.json(response);
});

/**
 * POST /api/applications
 * Create new application
 */
export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate request body
  const validationResult = createApplicationInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const application = await applicationsService.createApplication(req.user.userId, validationResult.data);

  // Convert to camelCase
  const response = toCamelCase(application);

  httpResponse.created(res, response);
});

/**
 * PATCH /api/applications/:id
 * Update application
 */
export const updateApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid application ID');
    return;
  }

  const applicationId = paramResult.data.id;

  // Validate request body
  const validationResult = updateApplicationInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const application = await applicationsService.updateApplication(
    applicationId,
    req.user.userId,
    validationResult.data
  );

  // Convert to camelCase
  const response = toCamelCase(application);

  res.json(response);
});

/**
 * DELETE /api/applications/:id
 * Delete application
 */
export const deleteApplication = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid application ID');
    return;
  }

  const applicationId = paramResult.data.id;

  await applicationsService.deleteApplication(applicationId, req.user.userId);

  httpResponse.noContent(res);
});
