import { Request, Response } from 'express';
import * as resourcesService from '../services/resources.service.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { toCamelCase } from '@scholarship-hub/shared';

/**
 * GET /api/resources
 * Get all enabled scholarship resources
 */
export const getResources = asyncHandler(async (_req: Request, res: Response) => {
  const resources = await resourcesService.getScholarshipResources();

  // Convert to camelCase
  const response = resources.map((resource) => toCamelCase(resource));

  res.json(response);
});
