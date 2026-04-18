/**
 * Essays Controller
 * HTTP handlers for essay endpoints
 */

import { Request, Response } from 'express';
import * as essaysService from '../services/essays.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';
import {
  createEssayInputSchema,
  updateEssayInputSchema,
} from '../schemas/essays.schemas.js';
import { idParamSchema, applicationIdParamSchema } from '../schemas/common.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * GET /api/applications/:applicationId/essays
 * Get all essays for an application
 */
export const getEssaysByApplication = asyncHandler(async (req: Request, res: Response) => {
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

  const essays = await essaysService.getEssaysByApplicationId(applicationId, req.user.userId);
  const response = essays.map(essay => toCamelCase(essay));

  res.json(response);
});

/**
 * POST /api/applications/:applicationId/essays
 * Create a new essay for an application
 */
export const createEssay = asyncHandler(async (req: Request, res: Response) => {
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

  // Validate request body
  const validationResult = createEssayInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const essay = await essaysService.createEssay(applicationId, req.user.userId, validationResult.data);

  const response = toCamelCase(essay);

  httpResponse.created(res, response);
});

/**
 * GET /api/essays/:id
 * Get a single essay
 */
export const getEssay = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid essay ID');
    return;
  }

  const essayId = paramResult.data.id;

  const essay = await essaysService.getEssayById(essayId, req.user.userId);
  const response = toCamelCase(essay);

  res.json(response);
});

/**
 * PATCH /api/essays/:id
 * Update an essay
 */
export const updateEssay = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid essay ID');
    return;
  }

  const essayId = paramResult.data.id;

  // Validate request body
  const validationResult = updateEssayInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const essay = await essaysService.updateEssay(essayId, req.user.userId, validationResult.data);

  const response = toCamelCase(essay);

  res.json(response);
});

/**
 * DELETE /api/essays/:id
 * Delete an essay
 */
export const deleteEssay = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid essay ID');
    return;
  }

  const essayId = paramResult.data.id;

  await essaysService.deleteEssay(essayId, req.user.userId);

  httpResponse.noContent(res);
});
