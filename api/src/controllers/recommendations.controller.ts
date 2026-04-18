/**
 * Recommendations Controller
 * HTTP handlers for recommendation endpoints
 */

import { Request, Response } from 'express';
import * as recommendationsService from '../services/recommendations.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';
import {
  createRecommendationInputSchema,
  updateRecommendationInputSchema,
} from '../schemas/recommendations.schemas.js';
import { idParamSchema, applicationIdParamSchema } from '../schemas/common.js';
import { httpResponse } from '../utils/http-response.js';

/**
 * GET /api/applications/:applicationId/recommendations
 * Get all recommendations for an application
 */
export const getRecommendationsByApplication = asyncHandler(
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

    const recommendations = await recommendationsService.getRecommendationsByApplicationId(
      applicationId,
      req.user.userId
    );

    // Convert to camelCase
    const response = recommendations.map((rec) => toCamelCase(rec));

    res.json(response);
  }
);

/**
 * POST /api/recommendations
 * Create new recommendation
 */
export const createRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate request body
  const validationResult = createRecommendationInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const recommendation = await recommendationsService.createRecommendation(req.user.userId, validationResult.data);

  // Convert to camelCase
  const response = toCamelCase(recommendation);

  httpResponse.created(res, response);
});

/**
 * GET /api/recommendations/:id
 * Get single recommendation by ID
 */
export const getRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid recommendation ID');
    return;
  }

  const recommendationId = paramResult.data.id;

  const recommendation = await recommendationsService.getRecommendationById(
    recommendationId,
    req.user.userId
  );

  // Convert to camelCase
  const response = toCamelCase(recommendation);

  res.json(response);
});

/**
 * PATCH /api/recommendations/:id
 * Update recommendation
 */
export const updateRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid recommendation ID');
    return;
  }

  const recommendationId = paramResult.data.id;

  // Validate request body
  const validationResult = updateRecommendationInputSchema.safeParse(req.body);
  
  if (!validationResult.success) {
    httpResponse.validationError(
      res,
      validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    );
    return;
  }

  const recommendation = await recommendationsService.updateRecommendation(
    recommendationId,
    req.user.userId,
    validationResult.data
  );

  // Convert to camelCase
  const response = toCamelCase(recommendation);

  res.json(response);
});

/**
 * DELETE /api/recommendations/:id
 * Delete recommendation
 */
export const deleteRecommendation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    httpResponse.unauthorized(res);
    return;
  }

  // Validate route parameter
  const paramResult = idParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    httpResponse.validationError(res, 'Invalid recommendation ID');
    return;
  }

  const recommendationId = paramResult.data.id;

  await recommendationsService.deleteRecommendation(recommendationId, req.user.userId);

  httpResponse.noContent(res);
});

