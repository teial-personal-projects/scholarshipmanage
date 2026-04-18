import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import * as applicationsController from '../controllers/applications.controller.js';
import * as essaysController from '../controllers/essays.controller.js';
import * as collaborationsController from '../controllers/collaborations.controller.js';
import * as recommendationsController from '../controllers/recommendations.controller.js';
import { readRateLimiters, writeRateLimiters } from '../config/rate-limit.js';

const router = Router();

// All routes require authentication and student role
router.use(auth);
router.use(requireRole(['student']));

// GET /api/applications - List user's applications
// Rate limit: 50 requests per 15 minutes
router.get('/', readRateLimiters.list, applicationsController.getApplications);

// POST /api/applications - Create new application
// Rate limit: 30 requests per 15 minutes
router.post('/', writeRateLimiters.createUpdate, applicationsController.createApplication);

// Nested essays routes - must come before /:id route
// GET /api/applications/:applicationId/essays - List essays for an application
// Rate limit: 50 requests per 15 minutes
router.get('/:applicationId/essays', readRateLimiters.list, essaysController.getEssaysByApplication);

// POST /api/applications/:applicationId/essays - Create new essay
// Rate limit: 30 requests per 15 minutes
router.post('/:applicationId/essays', writeRateLimiters.createUpdate, essaysController.createEssay);

// Nested collaborations routes - must come before /:id route
// GET /api/applications/:applicationId/collaborations - List collaborations for an application
// Rate limit: 50 requests per 15 minutes
router.get(
  '/:applicationId/collaborations',
  readRateLimiters.list,
  collaborationsController.getCollaborationsByApplication
);

// Nested recommendations routes - must come before /:id route
// GET /api/applications/:applicationId/recommendations - List recommendations for an application
// Rate limit: 50 requests per 15 minutes
router.get(
  '/:applicationId/recommendations',
  readRateLimiters.list,
  recommendationsController.getRecommendationsByApplication
);

// GET /api/applications/:id - Get application details
// Rate limit: 100 requests per 15 minutes
router.get('/:id', readRateLimiters.read, applicationsController.getApplication);

// PATCH /api/applications/:id - Update application
// Rate limit: 30 requests per 15 minutes
router.patch('/:id', writeRateLimiters.createUpdate, applicationsController.updateApplication);

// DELETE /api/applications/:id - Delete application
// Rate limit: 10 requests per 15 minutes
router.delete('/:id', writeRateLimiters.delete, applicationsController.deleteApplication);

export default router;
